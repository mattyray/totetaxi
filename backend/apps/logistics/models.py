# apps/logistics/models.py
import uuid
from django.db import models
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


class OnfleetTask(models.Model):
    """
    Onfleet task tracking - 2 tasks per booking (pickup + dropoff)
    Each task triggers separate SMS to recipient
    """
    
    TASK_TYPE_CHOICES = [
        ('pickup', 'Pickup'),
        ('dropoff', 'Dropoff'),
    ]
    
    STATUS_CHOICES = [
        ('created', 'Created'),
        ('assigned', 'Assigned to Driver'),
        ('active', 'Driver En Route'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('deleted', 'Deleted'),
    ]
    
    ENVIRONMENT_CHOICES = [
        ('sandbox', 'Sandbox'),
        ('production', 'Production'),
    ]
    
    # Primary identifiers
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Core relationship - NOW supports multiple tasks per booking
    booking = models.ForeignKey(
        'bookings.Booking',
        on_delete=models.CASCADE,
        related_name='onfleet_tasks'  # Changed from onfleet_task (singular)
    )
    
    # NEW: Task type and linking
    task_type = models.CharField(
        max_length=10,
        choices=TASK_TYPE_CHOICES,
        help_text="Pickup or Dropoff task"
    )
    
    linked_task = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='dependent_tasks',
        help_text="For dropoff tasks, links to the pickup task"
    )
    
    # Onfleet identifiers
    onfleet_task_id = models.CharField(max_length=100, unique=True)
    onfleet_short_id = models.CharField(max_length=20, blank=True)
    tracking_url = models.URLField(max_length=500, blank=True)
    
    # NEW: Environment tracking
    environment = models.CharField(
        max_length=20,
        choices=ENVIRONMENT_CHOICES,
        default='sandbox'
    )
    
    # NEW: Recipient (who receives SMS for THIS task)
    recipient_name = models.CharField(max_length=255, blank=True)
    recipient_phone = models.CharField(max_length=20, blank=True)
    
    # Status tracking
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='created'
    )
    
    # NEW: Worker/driver info
    worker_id = models.CharField(max_length=255, blank=True)
    worker_name = models.CharField(max_length=255, blank=True)
    
    # NEW: Timing
    estimated_arrival = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # NEW: Proof of delivery
    signature_url = models.URLField(blank=True)
    photo_urls = models.JSONField(default=list, blank=True)
    delivery_notes = models.TextField(blank=True)
    
    # NEW: Failure tracking
    failure_reason = models.CharField(max_length=100, blank=True)
    failure_notes = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_synced = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'logistics_onfleet_task'
        verbose_name = 'Onfleet Task'
        verbose_name_plural = 'Onfleet Tasks'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['booking', 'task_type']),
            models.Index(fields=['onfleet_task_id']),
            models.Index(fields=['status', 'environment']),
            models.Index(fields=['created_at']),
        ]
        # NEW: Ensure one pickup and one dropoff per booking
        constraints = [
            models.UniqueConstraint(
                fields=['booking', 'task_type'],
                name='unique_task_type_per_booking'
            )
        ]
    
    def __str__(self):
        return f"{self.task_type.upper()} - {self.booking.booking_number} ({self.status})"
    
    def is_pickup(self):
        return self.task_type == 'pickup'
    
    def is_dropoff(self):
        return self.task_type == 'dropoff'
    
    def sync_status_from_onfleet(self, onfleet_state):
        """Convert Onfleet state (0-3) to our status"""
        state_mapping = {
            0: 'created',    # unassigned
            1: 'assigned',   # assigned to driver
            2: 'active',     # driver started
            3: 'completed'   # delivery done
        }
        
        old_status = self.status
        self.status = state_mapping.get(onfleet_state, 'failed')
        self.last_synced = timezone.now()
        self.save()
        
        # ONLY mark booking complete when DROPOFF task completes
        if old_status != 'completed' and self.status == 'completed' and self.is_dropoff():
            self._mark_booking_completed()
    
    def _mark_booking_completed(self):
        """Update ToteTaxi booking when DROPOFF delivery completes.

        NOTE: Customer stats (total_bookings, total_spent_cents) are
        incremented in payments/services.py when payment succeeds.
        Do NOT increment them here — that causes double-counting (C5 fix).
        """
        try:
            if self.booking.status in ['confirmed', 'paid', 'in_progress']:
                self.booking.status = 'completed'
                self.booking.save(_skip_pricing=True)
                logger.info(f"✓ Booking {self.booking.booking_number} marked completed")

        except Exception as e:
            logger.error(f"Error updating booking completion: {e}")


# UPDATED Signal - now creates 2 tasks instead of 1
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender='bookings.Booking')
def create_onfleet_tasks_on_payment(sender, instance, created, **kwargs):
    """
    Auto-create Onfleet tasks when booking status transitions to paid/confirmed.
    Only fires on actual status changes, not every save. Creates 2 tasks: pickup + dropoff.
    """
    if instance.status not in ['paid', 'confirmed']:
        return

    # Only act on real transitions (new booking or status actually changed)
    original = getattr(instance, '_original_status', None)
    if not created and original == instance.status:
        return

    # Check if tasks already exist
    if instance.onfleet_tasks.exists():
        logger.debug(f"Tasks already exist for booking {instance.booking_number}")
        return

    try:
        from .services import ToteTaxiOnfleetIntegration
        integration = ToteTaxiOnfleetIntegration()
        pickup, dropoff = integration.create_tasks_for_booking(instance)

        if pickup and dropoff:
            logger.info(f"✓ Created 2 Onfleet tasks for booking {instance.booking_number}")
        else:
            logger.error(f"✗ Failed to create tasks for booking {instance.booking_number}")

    except Exception as e:
        logger.error(f"Error in Onfleet signal: {e}", exc_info=True)