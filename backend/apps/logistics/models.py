# apps/logistics/models.py
import uuid
from django.db import models
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


class OnfleetTask(models.Model):
    """Minimal bridge between ToteTaxi bookings and Onfleet tasks"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Core relationship - the only thing we really need to store
    booking = models.OneToOneField(
        'bookings.Booking', 
        on_delete=models.CASCADE, 
        related_name='onfleet_task'
    )
    
    # Onfleet identifiers - essential for API calls
    onfleet_task_id = models.CharField(max_length=100, unique=True)
    onfleet_short_id = models.CharField(max_length=20, blank=True)
    
    
    # Customer-facing tracking URL - this is what customers need
    tracking_url = models.URLField(blank=True)
    
    # Simple status for our internal use - maps from Onfleet state
    status = models.CharField(max_length=20, choices=[
        ('created', 'Created'),
        ('assigned', 'Assigned'), 
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('failed', 'Failed')
    ], default='created')
    
    # Basic timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_synced = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'logistics_onfleet_task'
        verbose_name = 'Onfleet Task'
        verbose_name_plural = 'Onfleet Tasks'
        indexes = [
            models.Index(fields=['onfleet_task_id']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"Onfleet Task for {self.booking.booking_number}"
    
    def sync_status_from_onfleet(self, onfleet_state):
        """Convert Onfleet state (0-3) to our status and update booking"""
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
        
        # Update ToteTaxi booking status when delivery completes
        if old_status != 'completed' and self.status == 'completed':
            self._mark_booking_completed()
    
    def _mark_booking_completed(self):
        """Update ToteTaxi booking when Onfleet delivery completes"""
        try:
            # Update booking status
            if self.booking.status in ['confirmed', 'in_progress']:
                self.booking.status = 'completed'
                self.booking.save()
            
            # Update customer stats if authenticated user
            if self.booking.customer and hasattr(self.booking.customer, 'customer_profile'):
                profile = self.booking.customer.customer_profile
                profile.total_bookings += 1
                profile.total_spent_cents += self.booking.total_price_cents
                profile.last_booking_at = timezone.now()
                
                # Check for VIP upgrade
                if not profile.is_vip and profile.total_spent_dollars >= 2000:
                    profile.is_vip = True
                    
                profile.save()
                
        except Exception as e:
            logger.error(f"Error updating booking completion for {self.booking.booking_number}: {e}")


# Signal to auto-create Onfleet tasks when bookings are confirmed
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender='bookings.Booking')
def create_onfleet_task(sender, instance, created, **kwargs):
    """Auto-create Onfleet task when booking is confirmed"""
    if instance.status == 'confirmed' and not hasattr(instance, 'onfleet_task'):
        try:
            from .services import ToteTaxiOnfleetIntegration
            integration = ToteTaxiOnfleetIntegration()
            integration.create_delivery_task(instance)
        except Exception as e:
            logger.error(f"Failed to create Onfleet task for booking {instance.booking_number}: {e}")