import logging
from datetime import timedelta

import stripe
from celery import shared_task
from django.conf import settings
from django.db import OperationalError, transaction
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
        metadata = payment_intent.get('metadata', {})
        # Only payments originating from the booking wizard create a Payment
        # record. PIs without app metadata (Stripe Invoices, manual dashboard
        # charges, other products on the account) never will — don't retry or
        # raise the "ORPHANED PAYMENT" alert for them, or every invoice payment
        # floods Sentry with false MANUAL REFUND REQUIRED alerts (INC-003).
        is_app_payment = bool(metadata.get('booking_token') or metadata.get('service_type'))
        if not is_app_payment:
            logger.info(
                f"Webhook task: PI {payment_intent_id} has no booking-app metadata "
                f"(likely a Stripe Invoice or manual charge) and no Payment record. "
                f"Not an orphan — ignoring."
            )
            return {'status': 'ignored_non_app', 'payment_intent_id': payment_intent_id}

        if self.request.retries >= self.max_retries:
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
        payment = Payment.objects.select_for_update().get(id=payment.id)

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


@shared_task(autoretry_for=(OperationalError,), retry_backoff=True, retry_backoff_max=60, max_retries=3)
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
        # Before expiring, verify the PI hasn't actually been captured by Stripe.
        # If the webhook task failed to update our DB but Stripe charged the card,
        # we must NOT mark this as failed — it needs the orphan alert path instead.
        if payment.stripe_payment_intent_id:
            try:
                pi = stripe.PaymentIntent.retrieve(payment.stripe_payment_intent_id)
                if pi.status == 'succeeded':
                    # Stripe captured funds but our DB still says 'pending' —
                    # fix the DB status and let alert_succeeded_orphans handle it
                    payment.status = 'succeeded'
                    payment.stripe_charge_id = getattr(pi, 'latest_charge', '') or ''
                    payment.processed_at = timezone.now()
                    payment.save(update_fields=['status', 'stripe_charge_id', 'processed_at', 'updated_at'])
                    logger.critical(
                        f"ORPHAN CLEANUP: PI {payment.stripe_payment_intent_id} is succeeded in "
                        f"Stripe but was pending in DB. Updated to succeeded — "
                        f"alert_succeeded_orphans will notify staff."
                    )
                    failed_count += 1
                    continue
            except stripe.error.StripeError as e:
                logger.warning(
                    f"Failed to verify orphaned PI {payment.stripe_payment_intent_id}: {e}"
                )
                failed_count += 1
                continue

        # Try to cancel the Stripe PI so the hold is released
        if payment.stripe_payment_intent_id:
            try:
                stripe.PaymentIntent.cancel(payment.stripe_payment_intent_id)
            except stripe.error.InvalidRequestError:
                # PI already cancelled or otherwise not cancellable
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


@shared_task(autoretry_for=(OperationalError,), retry_backoff=True, retry_backoff_max=60, max_retries=3)
def alert_succeeded_orphans():
    """Email staff when a payment succeeded but no booking was linked.

    Runs every 15 minutes via Celery Beat. Targets payments that:
    - status = 'succeeded'
    - booking is null (never linked)
    - created more than 10 minutes ago (gives frontend time to complete)

    Skips payments that already have an 'orphan_alert_sent' audit entry, so there
    is no need for an upper time bound — the per-payment de-dup guarantees each
    orphan is alerted at most once, and removing the old 48h ceiling closes the
    window where an orphan promoted near that edge became permanently un-alertable
    (INC-004).
    """
    from apps.payments.models import Payment, PaymentAudit
    from django.core.mail import send_mail

    now = timezone.now()
    orphans = Payment.objects.filter(
        status='succeeded',
        booking__isnull=True,
        created_at__lt=now - timedelta(minutes=10),
    )

    # Skip payments we've already alerted on
    alerted_payment_ids = set(
        PaymentAudit.objects.filter(
            action='orphan_alert_sent',
            payment__in=orphans,
        ).values_list('payment_id', flat=True)
    )

    # Skip orphans whose auto-recovery is still in flight: a PendingBooking in
    # 'pending' state means reconcile will create the booking shortly, so telling
    # staff to "create the booking manually" now would race reconcile into a DOUBLE
    # booking on one charge (INC-004). BUT only suppress while recovery can actually
    # act:
    #   - If the kill-switch is OFF, no reconcile will run — fall back to alert-only
    #     (never suppress) so charged orphans are never silent.
    #   - Even when ON, a capture stuck 'pending' beyond a bounded window (poison row
    #     / saturated batch) must stop suppressing so staff eventually get emailed.
    from apps.bookings.models import PendingBooking
    from apps.bookings.recovery import autorecovery_enabled
    if not autorecovery_enabled():
        inflight_pis = set()
    else:
        grace = getattr(settings, 'ORPHAN_RECOVERY_GRACE_MINUTES', 3)
        inflight_cutoff = now - timedelta(minutes=max(grace * 10, 30))
        inflight_pis = set(
            PendingBooking.objects.filter(
                status='pending',
                created_at__gte=inflight_cutoff,
                stripe_payment_intent_id__in=[
                    p.stripe_payment_intent_id for p in orphans if p.stripe_payment_intent_id
                ],
            ).values_list('stripe_payment_intent_id', flat=True)
        )
    orphans_to_alert = [
        p for p in orphans
        if p.id not in alerted_payment_ids
        and p.stripe_payment_intent_id not in inflight_pis
    ]

    if not orphans_to_alert:
        return {'alerted': 0}

    # Build email body with details for each orphan
    lines = [
        f"{'=' * 60}",
        f"URGENT: {len(orphans_to_alert)} payment(s) succeeded but have no booking.",
        f"These customers were charged but did not receive a booking confirmation.",
        f"{'=' * 60}",
        "",
    ]

    # Collect per-payment details for the email body
    payment_details = []
    for payment in orphans_to_alert:
        # Fetch customer email from Stripe PI metadata
        customer_email = "unknown"
        service_type = "unknown"
        try:
            pi = stripe.PaymentIntent.retrieve(payment.stripe_payment_intent_id)
            metadata = pi.get('metadata', {}) if hasattr(pi, 'get') else getattr(pi, 'metadata', {})
            customer_email = metadata.get('customer_email', 'unknown')
            service_type = metadata.get('service_type', 'unknown')
        except Exception:
            pass

        lines.extend([
            f"Payment ID: {payment.id}",
            f"Amount: ${payment.amount_dollars:.2f}",
            f"Customer: {customer_email}",
            f"Service: {service_type}",
            f"Stripe PI: {payment.stripe_payment_intent_id}",
            f"Created: {payment.created_at.strftime('%Y-%m-%d %I:%M %p ET')}",
            f"Stripe Dashboard: https://dashboard.stripe.com/payments/{payment.stripe_payment_intent_id}",
            "",
        ])
        payment_details.append((payment, customer_email))

    lines.append("Please create the booking manually or issue a refund.")

    # BOOKING_EMAIL_BCC is configured as a list (env.list), but tolerate a
    # comma-separated string too. Treating the list as a string here previously
    # crashed the task with AttributeError the moment a real orphan appeared,
    # silently defeating the alert (INC-003).
    bcc_list = getattr(settings, 'BOOKING_EMAIL_BCC', []) or []
    if isinstance(bcc_list, str):
        bcc_list = bcc_list.split(',')
    recipients = [addr.strip() for addr in bcc_list if addr and addr.strip()]

    if not recipients:
        logger.warning("alert_succeeded_orphans: No BOOKING_EMAIL_BCC configured, cannot send alert")
        return {'alerted': len(orphans_to_alert), 'email_sent': False}

    try:
        send_mail(
            subject=f"URGENT: {len(orphans_to_alert)} paid booking(s) need attention — ToteTaxi",
            message="\n".join(lines),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=recipients,
            fail_silently=False,
        )
    except Exception as e:
        logger.error(f"Failed to send orphan alert email: {e}")
        return {'alerted': len(orphans_to_alert), 'email_sent': False}

    # Write audit records AFTER email succeeds — if email fails, we'll
    # retry these orphans on the next run instead of silently losing them
    for payment, customer_email in payment_details:
        PaymentAudit.log(
            action='orphan_alert_sent',
            description=f"Staff alerted about orphaned payment (${payment.amount_dollars:.2f}, {customer_email})",
            payment=payment,
            user=None,
        )

    logger.info(f"Orphan alert: emailed staff about {len(orphans_to_alert)} succeeded orphan(s)")
    return {'alerted': len(orphans_to_alert), 'email_sent': True}


@shared_task(
    autoretry_for=(OperationalError,),
    retry_backoff=True,
    retry_backoff_max=60,
    max_retries=3,
    time_limit=600,
    soft_time_limit=540,
)
def reconcile_pending_payments():
    """Auto-recover orphaned payments from captured PendingBooking rows (INC-004).

    Runs every ~5 minutes. For each PendingBooking still awaiting materialization
    and older than the grace window (lets the normal frontend flow win first):
      1. Confirm the charge actually succeeded — promote a Payment stuck at
         'pending' to 'succeeded' if Stripe says so (closes the webhook-miss gap
         where reconciliation previously only ran once a day).
      2. Materialize the booking from the captured payload via the shared,
         idempotent, dedup-aware path.

    Leaves genuinely-unpaid captures alone (cleanup_orphaned_payments cancels those
    PIs); marks captures whose payment failed/refunded as abandoned so they stop
    being re-scanned.
    """
    from apps.bookings.models import PendingBooking
    from apps.bookings.recovery import (
        autorecovery_enabled,
        materialize_pending_booking,
    )
    from apps.payments.models import Payment
    from django.core.cache import cache

    if not autorecovery_enabled():
        return {'recovered': 0, 'skipped': 'disabled'}

    # Singleton guard: the per-run time budget (soft 540s) can exceed the 5-min
    # beat interval, so two runs could otherwise overlap and double-process
    # tie-ordered siblings. Only one reconcile runs at a time.
    lock_id = 'reconcile_pending_payments_lock'
    # TTL must exceed the hard time_limit (600s) so the guard cannot expire while a
    # slow run is still alive (which would let a second run start concurrently).
    if not cache.add(lock_id, '1', timeout=660):
        logger.info("reconcile_pending_payments: another run holds the lock, skipping")
        return {'recovered': 0, 'skipped': 'locked'}

    try:
        grace_minutes = getattr(settings, 'ORPHAN_RECOVERY_GRACE_MINUTES', 3)
        cutoff = timezone.now() - timedelta(minutes=grace_minutes)

        BATCH = 200
        pendings = list(PendingBooking.objects.filter(
            status='pending',
            created_at__lt=cutoff,
        ).order_by('created_at', 'id')[:BATCH])  # deterministic order → concurrent
        #                                          passes serialize on the same row

        if len(pendings) >= BATCH:
            logger.critical(
                "reconcile_pending_payments: batch saturated at %d pending captures — "
                "newer orphans may be delayed; investigate backlog.", BATCH
            )

        recovered = 0
        duplicates = 0
        failed = 0
        not_yet_paid = 0

        for pending in pendings:
            try:
                outcome = _reconcile_one(pending, Payment, materialize_pending_booking)
            except Exception:
                # Per-row isolation: one poison capture must not abort the whole
                # batch (which, with oldest-first ordering, would starve every newer
                # orphan permanently). Log and move on.
                logger.exception(
                    "reconcile_pending_payments: unexpected error processing "
                    "PendingBooking %s (PI %s)", pending.id, pending.stripe_payment_intent_id
                )
                failed += 1
                continue
            if outcome == 'recovered':
                recovered += 1
            elif outcome == 'duplicate':
                duplicates += 1
            elif outcome == 'failed':
                failed += 1
            elif outcome == 'not_yet_paid':
                not_yet_paid += 1
            # 'retired' (abandoned capture) counts toward none

        if recovered or duplicates or failed:
            logger.info(
                f"reconcile_pending_payments: recovered={recovered} "
                f"duplicates={duplicates} failed={failed} not_yet_paid={not_yet_paid}"
            )

        return {
            'recovered': recovered,
            'duplicates': duplicates,
            'failed': failed,
            'not_yet_paid': not_yet_paid,
        }
    finally:
        cache.delete(lock_id)


def _charge_id(charge):
    """Best-effort Stripe charge id from an expanded charge, a bare id string, or None."""
    if not charge:
        return ''
    if isinstance(charge, str):
        return charge
    return str(getattr(charge, 'id', '') or '')


def _charge_refunded(charge):
    """True if a Stripe charge shows any refund. Defensive against test Mocks
    (a bare Mock's attributes are truthy / non-numeric): only an explicit
    refunded is True, or a positive integer amount_refunded, counts."""
    if not charge or isinstance(charge, str):
        return False
    if getattr(charge, 'refunded', False) is True:
        return True
    try:
        return int(getattr(charge, 'amount_refunded', 0) or 0) > 0
    except (TypeError, ValueError):
        return False


def _reconcile_one(pending, Payment, materialize_pending_booking):
    """Process a single PendingBooking. Returns an outcome category:
    'retired' | 'not_yet_paid' | 'recovered' | 'duplicate' | 'failed'."""
    pi_id = pending.stripe_payment_intent_id
    payment = (
        Payment.objects.filter(stripe_payment_intent_id=pi_id)
        .order_by('created_at')
        .first()
    )

    def _retire(reason):
        pending.status = 'failed'
        pending.failure_reason = reason
        pending.save(update_fields=['status', 'failure_reason', 'updated_at'])

    # Refunded money is terminal — never materialize a fulfilled booking on a
    # refunded charge. DB status is authoritative when set (kept in sync by the
    # charge.refunded webhook); a dashboard refund not yet synced to the DB is
    # caught by the live charge check below.
    if payment and payment.status in ('refunded', 'partially_refunded'):
        _retire(f'Payment {payment.status}; not recoverable.')
        return 'retired'

    # Confirm the charge actually went through. A DB 'failed' is NOT treated as
    # terminal without asking Stripe: a same-PI retry (decline -> fix card ->
    # succeed) whose success webhook was lost leaves DB=failed/Stripe=succeeded, and
    # blindly retiring it would lose a charged customer with no booking AND no alert
    # (INC-004 B2). So we re-check Stripe for both 'pending' and 'failed'.
    charged = bool(payment and payment.status == 'succeeded')
    if not charged:
        try:
            pi = stripe.PaymentIntent.retrieve(pi_id, expand=['latest_charge'])
        except stripe.error.StripeError as e:
            logger.warning(f"reconcile: could not retrieve PI {pi_id}: {e}")
            return 'not_yet_paid'

        if getattr(pi, 'status', None) != 'succeeded':
            # Stripe confirms no successful charge — safe to retire an
            # abandoned/declined checkout so it stops being re-scanned.
            _retire(f"Payment not completed (Stripe PI status: {getattr(pi, 'status', 'unknown')}).")
            return 'retired'

        charge = getattr(pi, 'latest_charge', None)

        # Out-of-band refund on the freshly-retrieved charge (a Stripe-dashboard
        # refund leaves PI.status=succeeded). Never fulfill refunded money — retire
        # and sync DB status so it stays retired (INC-004 B3).
        if _charge_refunded(charge):
            _retire('Charge refunded out-of-band; not materializing.')
            if payment and payment.status not in ('refunded', 'partially_refunded'):
                amt = int(getattr(charge, 'amount', 0) or 0)
                ref = int(getattr(charge, 'amount_refunded', 0) or 0)
                payment.status = 'partially_refunded' if (amt and 0 < ref < amt) else 'refunded'
                payment.save(update_fields=['status', 'updated_at'])
            logger.warning(
                f"reconcile: PI {pi_id} refunded out-of-band — retiring, not materializing"
            )
            return 'retired'

        charged = True
        # Promote a DB row stuck at 'pending'/'failed' (success webhook never landed).
        if payment and payment.status in ('pending', 'failed'):
            prev = payment.status
            payment.status = 'succeeded'
            payment.stripe_charge_id = _charge_id(charge)
            payment.processed_at = timezone.now()
            payment.save(update_fields=[
                'status', 'stripe_charge_id', 'processed_at', 'updated_at',
            ])
            logger.warning(
                f"reconcile: promoted Payment for PI {pi_id} {prev}->succeeded (webhook miss)"
            )

    if not charged:
        return 'not_yet_paid'

    _, outcome = materialize_pending_booking(pending.id, source='reconcile')
    if outcome in ('recovered', 'already_materialized', 'already_linked'):
        return 'recovered'
    if outcome == 'duplicate':
        return 'duplicate'
    if outcome in ('failed', 'amount_mismatch'):
        return 'failed'
    return 'not_yet_paid'
