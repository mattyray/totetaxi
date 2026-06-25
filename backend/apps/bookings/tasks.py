# apps/bookings/tasks.py
from celery import shared_task
from django.db import OperationalError
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


@shared_task(autoretry_for=(OperationalError,), retry_backoff=True, retry_backoff_max=60, max_retries=3)
def send_booking_reminders():
    """
    Send 24-hour reminder emails for upcoming bookings.
    Runs every hour via Celery Beat.

    Transient DB connection drops (pgbouncer restarts) are retried with
    backoff. Any other exception propagates so Sentry sees it — a swallowed
    error here would silently skip reminders.
    """
    from django.conf import settings
    from apps.bookings.models import Booking
    from apps.customers.emails import send_booking_reminder_email

    # Kill-switch (see BOOKING_REMINDERS_ENABLED in settings) — lets us pause
    # reminders without removing the Beat schedule or redeploying.
    if not settings.BOOKING_REMINDERS_ENABLED:
        logger.warning('Booking reminders are paused (BOOKING_REMINDERS_ENABLED=False) — skipping run')
        return {'sent': 0, 'failed': 0, 'skipped': True, 'reason': 'paused'}

    # pickup_date is a date-only field holding the customer's LOCAL (NY) pickup
    # day. Compare against the local "tomorrow", not a UTC datetime window —
    # using timezone.now() directly does date math in UTC, which after ~8 PM ET
    # rolls to the next day and fires "Pickup is Tomorrow!" reminders a day
    # early (same timezone.now()-vs-localtime bug fixed previously in models.py).
    today = timezone.localdate()
    tomorrow = today + timedelta(days=1)

    logger.info(f'Checking for bookings with pickup_date == {tomorrow} (local)')

    # Find confirmed bookings whose pickup is tomorrow and haven't been reminded.
    bookings = Booking.objects.filter(
        status__in=['pending', 'paid', 'confirmed'],
        pickup_date=tomorrow,
        reminder_sent_at__isnull=True,
        deleted_at__isnull=True
    )

    sent_count = 0
    failed_count = 0

    for booking in bookings:
        logger.info(f'Sending reminder for booking {booking.booking_number}')

        if send_booking_reminder_email(booking):
            sent_count += 1
        else:
            failed_count += 1

    logger.info(f'✓ Reminder task complete: {sent_count} sent, {failed_count} failed')
    return {
        'sent': sent_count,
        'failed': failed_count,
        'pickup_date': str(tomorrow)
    }
