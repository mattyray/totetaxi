import logging
from django.db.models.signals import pre_save
from django.dispatch import receiver
from apps.bookings.models import Booking
from apps.customers.emails import (
    send_booking_status_update_email,
    send_booking_confirmation_email,
    send_review_request_email,
)

logger = logging.getLogger(__name__)


@receiver(pre_save, sender=Booking)
def booking_status_changed(sender, instance, **kwargs):
    """
    Send emails when a booking's status changes.
    - Always send status-update email on change.
    - Additionally send confirmation when becoming 'paid' or 'confirmed'.
    """
    if not instance.pk:
        # New booking being created; no "old" status to compare here.
        return

    try:
        old = Booking.objects.get(pk=instance.pk)
    except Booking.DoesNotExist:
        # Shouldn't happen for existing pk, but guard anyway.
        return

    old_status = old.status
    new_status = instance.status

    if old_status == new_status:
        return

    logger.info(f"📧 Booking {old.booking_number} status changed: {old_status} → {new_status}")
    # Status update notification to customer
    try:
        send_booking_status_update_email(instance, old_status, new_status)
    except Exception as e:
        logger.error(f"Failed to send status update email for {instance.booking_number}: {e}", exc_info=True)

    # Confirmation on transition to paid/confirmed
    if new_status in ('paid', 'confirmed'):
        try:
            send_booking_confirmation_email(instance)
        except Exception as e:
            logger.error(f"Failed to send confirmation for {instance.booking_number}: {e}", exc_info=True)

    # Review request on completion
    if new_status == 'completed':
        try:
            send_review_request_email(instance)
        except Exception as e:
            logger.error(f"Failed to send review request for {instance.booking_number}: {e}", exc_info=True)
