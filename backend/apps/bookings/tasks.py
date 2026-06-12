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
    from apps.bookings.models import Booking
    from apps.customers.emails import send_booking_reminder_email

    # Calculate target time: 24 hours from now (with 1-hour window)
    now = timezone.now()
    target_start = now + timedelta(hours=23)
    target_end = now + timedelta(hours=25)

    logger.info(f'Checking for bookings between {target_start} and {target_end}')

    # Find confirmed bookings that:
    # 1. Pickup is in 23-25 hours
    # 2. Haven't received reminder yet
    # 3. Not cancelled/completed
    bookings = Booking.objects.filter(
        status__in=['pending', 'paid', 'confirmed'],
        pickup_date__gte=target_start.date(),
        pickup_date__lte=target_end.date(),
        reminder_sent_at__isnull=True,
        deleted_at__isnull=True
    )

    sent_count = 0
    failed_count = 0

    for booking in bookings:
        # Double-check the booking is really in the 24hr window
        # (pickup_date is date-only, so we check against date)
        if booking.pickup_date == target_start.date() or booking.pickup_date == target_end.date():
            logger.info(f'Sending reminder for booking {booking.booking_number}')

            if send_booking_reminder_email(booking):
                sent_count += 1
            else:
                failed_count += 1

    logger.info(f'✓ Reminder task complete: {sent_count} sent, {failed_count} failed')
    return {
        'sent': sent_count,
        'failed': failed_count,
        'checked_range': f'{target_start} to {target_end}'
    }
