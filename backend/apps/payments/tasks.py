import logging
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


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

    try:
        payment = Payment.objects.select_related('booking').get(
            stripe_payment_intent_id=payment_intent_id
        )
    except Payment.DoesNotExist:
        if self.request.retries >= self.max_retries:
            # Exhausted all retries — customer was charged but no booking was created.
            # Log critical details for manual follow-up (refund via Stripe dashboard).
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

    # Update payment status
    payment.status = 'succeeded'
    payment.stripe_charge_id = payment_intent.get('latest_charge', '')
    payment.processed_at = timezone.now()
    payment.save()

    # Update booking status
    booking = payment.booking
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

    # Keep booking as pending so customer can retry
    booking = payment.booking
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
