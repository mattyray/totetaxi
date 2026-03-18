import logging
from datetime import timedelta

import stripe
from celery import shared_task
from django.conf import settings
from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)

stripe.api_key = settings.STRIPE_SECRET_KEY


@shared_task(bind=True, max_retries=10, default_retry_delay=1)
def process_payment_succeeded(self, event_data):
    """Process payment_intent.succeeded webhook event asynchronously.

    Replaces the synchronous time.sleep() retry loop that blocked gunicorn workers.
    Uses Celery's built-in retry with exponential backoff (up to 60s per retry).
    Total retry window ~5 minutes to allow frontend booking creation to complete.
    """
    from apps.payments.models import Payment, PaymentAudit
    from apps.accounts.models import StaffProfile, StaffAction
    from apps.payments.views import _get_system_staff_user

    payment_intent = event_data['data']['object']
    payment_intent_id = payment_intent['id']
    event_id = event_data['id']

    payment = None
    try:
        payment = Payment.objects.select_related('booking').get(
            stripe_payment_intent_id=payment_intent_id
        )
    except Payment.DoesNotExist:
        # Checkout Sessions create PI lazily — Payment may have empty PI.
        # Fall back to finding the pending Payment via booking_id metadata.
        metadata = payment_intent.get('metadata', {})
        booking_id = metadata.get('booking_id')
        if booking_id:
            try:
                payment = Payment.objects.select_related('booking').get(
                    booking_id=booking_id,
                    status='pending',
                    stripe_payment_intent_id='',
                )
                payment.stripe_payment_intent_id = payment_intent_id
                payment.save(update_fields=['stripe_payment_intent_id'])
                logger.info(
                    f"Backfilled PI {payment_intent_id} on Payment for booking {booking_id}"
                )
            except Payment.DoesNotExist:
                pass

    if payment is None:
        if self.request.retries >= self.max_retries:
            metadata = payment_intent.get('metadata', {})
            amount_dollars = payment_intent.get('amount', 0) / 100
            logger.critical(
                f"ORPHANED PAYMENT: Stripe PI {payment_intent_id} succeeded "
                f"(${amount_dollars:.2f}) but no Payment record found after "
                f"{self.max_retries} retries. "
                f"Customer: {metadata.get('customer_email', 'unknown')}. "
                f"Service: {metadata.get('service_type', 'unknown')}. "
                f"Event: {event_id}. "
                f"MANUAL REFUND REQUIRED via Stripe dashboard."
            )
            return {
                'status': 'orphaned',
                'payment_intent_id': payment_intent_id,
                'amount': payment_intent.get('amount', 0),
                'event_id': event_id,
            }

        logger.info(
            f"Webhook task: Payment not found for {payment_intent_id}, "
            f"retry {self.request.retries}/{self.max_retries}"
        )
        raise self.retry(countdown=min(2 ** self.request.retries, 60))

    # Skip if already processed
    if payment.status == 'succeeded':
        logger.info(f"Webhook task: Payment {payment.id} already succeeded")
        return {'status': 'already_succeeded'}

    # Lock the row and re-read to avoid race with booking creation view
    with transaction.atomic():
        payment = Payment.objects.select_for_update().select_related('booking').get(
            id=payment.id
        )

        # Re-check after lock — booking view may have already updated it
        if payment.status == 'succeeded':
            logger.info(f"Webhook task: Payment {payment.id} already succeeded (after lock)")
            return {'status': 'already_succeeded'}

        # Update payment status
        payment.status = 'succeeded'
        payment.stripe_charge_id = payment_intent.get('latest_charge', '')
        payment.processed_at = timezone.now()
        payment.save()

    # Re-read booking outside the lock (it's now committed)
    payment.refresh_from_db()
    booking = payment.booking
    if booking is None:
        logger.info(
            f"Webhook task: Payment {payment.id} succeeded but has no booking yet "
            f"(PI: {payment_intent_id}). Booking creation will link it later."
        )
        PaymentAudit.log(
            action='payment_succeeded',
            description=(
                f"Payment succeeded (PI: {payment_intent_id}) but no booking linked yet. "
                f"Event: {event_id}"
            ),
            payment=payment,
            user=None,
        )
        return {'status': 'success_no_booking', 'payment_intent_id': payment_intent_id}

    if booking.status == 'pending':
        old_status = booking.status
        booking.status = 'paid'
        booking.save(_skip_pricing=True)

        logger.info(
            f"Webhook task: Booking {booking.booking_number} "
            f"status updated: {old_status} -> {booking.status}"
        )

        StaffAction.objects.create(
            staff_user=_get_system_staff_user(),
            action_type='modify_booking',
            description=(
                f"Booking {booking.booking_number} automatically confirmed via Stripe webhook. "
                f"Payment: ${payment.amount_dollars:.2f}"
            ),
            ip_address='127.0.0.1',
            user_agent='Stripe Webhook',
            booking_id=booking.id,
        )

    PaymentAudit.log(
        action='payment_succeeded',
        description=(
            f"Payment succeeded for booking {booking.booking_number} "
            f"via Stripe webhook (Event: {event_id})"
        ),
        payment=payment,
        user=None,
    )

    logger.info(
        f"Webhook task: Successfully processed payment for "
        f"booking {booking.booking_number}"
    )

    return {'status': 'success', 'booking_number': booking.booking_number}


@shared_task(bind=True, max_retries=10, default_retry_delay=1)
def process_payment_failed(self, event_data):
    """Process payment_intent.payment_failed webhook event asynchronously."""
    from apps.payments.models import Payment, PaymentAudit

    payment_intent = event_data['data']['object']
    payment_intent_id = payment_intent['id']

    try:
        payment = Payment.objects.select_related('booking').get(
            stripe_payment_intent_id=payment_intent_id
        )
    except Payment.DoesNotExist:
        if self.request.retries >= self.max_retries:
            metadata = payment_intent.get('metadata', {})
            logger.warning(
                f"Webhook task: Payment not found for failed PI {payment_intent_id} "
                f"after {self.max_retries} retries. "
                f"Customer: {metadata.get('customer_email', 'unknown')}. "
                f"No action needed — payment was not captured."
            )
            return {'status': 'orphaned_failed', 'payment_intent_id': payment_intent_id}

        logger.info(
            f"Webhook task: Payment not found for failed {payment_intent_id}, "
            f"retry {self.request.retries}/{self.max_retries}"
        )
        raise self.retry(countdown=min(2 ** self.request.retries, 60))

    # Update payment to failed
    payment.status = 'failed'
    payment.failure_reason = payment_intent.get(
        'last_payment_error', {}
    ).get('message', 'Payment failed')
    payment.save()

    # Keep booking as pending so customer can retry (booking may be None)
    booking = payment.booking
    if booking is None:
        logger.info(
            f"Webhook task: Payment failed for PI {payment_intent_id} with no booking linked."
        )
        PaymentAudit.log(
            action='payment_failed',
            description=(
                f"Payment failed (PI: {payment_intent_id}). No booking linked. "
                f"Reason: {payment.failure_reason}"
            ),
            payment=payment,
            user=None,
        )
        return {'status': 'payment_failed_no_booking', 'payment_intent_id': payment_intent_id}

    if booking.status != 'pending':
        booking.status = 'pending'
        booking.save(_skip_pricing=True)

    PaymentAudit.log(
        action='payment_failed',
        description=(
            f"Payment failed for booking {booking.booking_number}. "
            f"Reason: {payment.failure_reason}"
        ),
        payment=payment,
        user=None,
    )

    logger.warning(
        f"Webhook task: Payment failed for booking {booking.booking_number}. "
        f"Reason: {payment.failure_reason}"
    )

    return {'status': 'payment_failed', 'booking_number': booking.booking_number}


@shared_task
def cleanup_orphaned_payments():
    """Cancel Stripe PIs and expire Payment records that were never linked to a booking.

    Runs daily via Celery Beat. Targets payments older than 24 hours with no
    booking attached — these are abandoned checkout flows where the customer
    created a PaymentIntent but never completed the booking.
    """
    from apps.payments.models import Payment, PaymentAudit

    cutoff = timezone.now() - timedelta(hours=24)
    orphans = Payment.objects.filter(
        booking__isnull=True,
        status='pending',
        created_at__lt=cutoff,
    )

    cancelled_count = 0
    failed_count = 0

    for payment in orphans:
        # Try to cancel the Stripe PI so the hold is released
        if payment.stripe_payment_intent_id:
            try:
                stripe.PaymentIntent.cancel(payment.stripe_payment_intent_id)
            except stripe.error.InvalidRequestError:
                # PI already cancelled, succeeded, or otherwise not cancellable
                pass
            except stripe.error.StripeError as e:
                logger.warning(
                    f"Failed to cancel orphaned PI {payment.stripe_payment_intent_id}: {e}"
                )
                failed_count += 1
                continue

        payment.status = 'failed'
        payment.failure_reason = 'Expired — booking never completed'
        payment.save(update_fields=['status', 'failure_reason', 'updated_at'])

        PaymentAudit.log(
            action='payment_failed',
            description=(
                f"Orphaned payment expired (PI: {payment.stripe_payment_intent_id}). "
                f"No booking created within 24 hours."
            ),
            payment=payment,
            user=None,
        )
        cancelled_count += 1

    if cancelled_count or failed_count:
        logger.info(
            f"Orphaned payment cleanup: {cancelled_count} expired, {failed_count} failed to cancel"
        )

    return {'expired': cancelled_count, 'failed': failed_count}
