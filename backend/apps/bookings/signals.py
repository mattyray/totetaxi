# backend/apps/bookings/signals.py
from django.db.models.signals import pre_save
from django.dispatch import receiver
from apps.bookings.models import Booking
from apps.customers.emails import send_booking_status_update_email
import logging

logger = logging.getLogger(__name__)

@receiver(pre_save, sender=Booking)
def booking_status_changed(sender, instance, **kwargs):
    """
    Automatically send email when booking status changes
    
    This runs BEFORE booking is saved to database
    """
    if instance.pk:  # Only for existing bookings (not new ones)
        try:
            # Get the old booking from database
            old_booking = Booking.objects.get(pk=instance.pk)
            old_status = old_booking.status
            new_status = instance.status
            
            # Only send email if status actually changed
            if old_status != new_status:
                logger.info(f"📧 Booking {instance.booking_number} status changed: {old_status} → {new_status}")
                send_booking_status_update_email(instance, old_status, new_status)
                
        except Booking.DoesNotExist:
            # Booking doesn't exist yet (shouldn't happen, but safety check)
            pass