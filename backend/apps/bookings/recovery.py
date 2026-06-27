# backend/apps/bookings/recovery.py
"""Orphaned-payment auto-recovery (INC-004).

The booking is charged at PI-creation time but historically only *saved* by a
second frontend POST that can fail (tab close, crash, redirect, deploy). When
that POST never lands the customer is charged with no booking — and often
re-checks-out and double-charges.

The cure: capture the full booking payload server-side at PI-creation
(`PendingBooking`), then let the webhook / a reconciliation task replay that exact
payload through the SAME serializer + amount check the happy path uses. No
fabrication from thin Stripe metadata, no reliance on the browser.

`materialize_pending_booking` is the single, idempotent, row-locked entry point
used by BOTH recovery triggers. Duplicate checkout attempts (the two-PI
double-charge case) are detected via cart_key/fingerprint and REFUSED — the
sibling charge is left for staff to refund (alert-only), never turned into a
second booking + dispatch + email.
"""
import hashlib
import logging
from datetime import timedelta

from django.conf import settings
from django.db import connection, transaction
from django.utils import timezone

logger = logging.getLogger(__name__)


def autorecovery_enabled():
    """Kill-switch. Disable in prod via `fly secrets set ORPHAN_AUTORECOVERY_ENABLED=false`."""
    return getattr(settings, 'ORPHAN_AUTORECOVERY_ENABLED', True)


def _advisory_key(s):
    """Stable signed 63-bit int for a Postgres advisory lock."""
    return int.from_bytes(hashlib.blake2b(s.encode('utf-8'), digest_size=8).digest(),
                          'big', signed=True)


def take_dedup_advisory_locks(*, cart_key='', fingerprint=''):
    """Serialize duplicate detection across SIBLING PaymentIntents.

    Two checkout attempts for one cart are different Payment + PendingBooking rows,
    so `select_for_update` on those rows never makes the two transactions contend —
    the cart_key/fingerprint dedup (`_find_sibling_booking`) is a plain SELECT that
    under READ COMMITTED can't see a concurrent sibling's uncommitted
    materialization, letting both create a booking (INC-004 double-booking).

    A transaction-scoped advisory lock on the shared cart_key/fingerprint forces the
    second materialization (and the happy-path create, which takes the same cart_key
    lock) to block until the first commits, after which the dedup correctly sees the
    sibling and refuses. Must be called inside `transaction.atomic()`. No-op on
    SQLite (tests are single-threaded; advisory locks are Postgres-only).
    """
    if connection.vendor != 'postgresql':
        return
    keys = []
    if cart_key:
        keys.append(_advisory_key(f'cart:{cart_key}'))
    if fingerprint:
        keys.append(_advisory_key(f'fp:{fingerprint}'))
    if not keys:
        return
    with connection.cursor() as c:
        for k in sorted(set(keys)):  # deterministic order → no lock-ordering deadlock
            c.execute('SELECT pg_advisory_xact_lock(%s)', [k])


def compute_fingerprint(payload, amount_cents, customer=None):
    """Stable signature of a checkout attempt, used to catch re-checkouts that
    produce a *new* cart_key (e.g. a fresh tab). Intentionally coarse —
    a collision only matters in the recovery path, where the action is an
    alert-for-manual-refund, not an automated charge.
    """
    email = ''
    if customer is not None and getattr(customer, 'email', ''):
        email = customer.email
    else:
        email = (payload or {}).get('email', '') or ''
    email = email.strip().lower()
    pickup_date = str((payload or {}).get('pickup_date', '') or '')
    service_type = (payload or {}).get('service_type', '') or ''
    return f"{email}|{pickup_date}|{service_type}|{amount_cents}"


def capture_pending_booking(*, payment_intent_id, booking_token, booking_payload,
                            amount_cents, is_authenticated, customer=None, cart_key=''):
    """Persist the booking payload at PI-creation time. Best-effort: callers must
    wrap this so a capture failure never blocks PaymentIntent creation.

    Returns the PendingBooking, or None if capture was skipped (flag off / no payload).
    """
    from .models import PendingBooking

    if not autorecovery_enabled():
        return None
    if not booking_payload or not isinstance(booking_payload, dict):
        logger.warning(
            "capture_pending_booking: no booking_payload for PI %s — "
            "auto-recovery will be unavailable for this payment",
            payment_intent_id,
        )
        return None

    fingerprint = compute_fingerprint(booking_payload, amount_cents, customer)
    return PendingBooking.objects.create(
        stripe_payment_intent_id=payment_intent_id,
        booking_token=booking_token or '',
        cart_key=cart_key or '',
        fingerprint=fingerprint,
        is_authenticated=bool(is_authenticated),
        customer=customer if is_authenticated else None,
        payload=booking_payload,
        amount_cents=amount_cents,
        status='pending',
    )


def mark_pending_materialized(payment_intent_id, booking):
    """Called by the happy-path booking-create views once they link a booking, so
    the recovery path won't also try to materialize the same PendingBooking."""
    from .models import PendingBooking

    if not payment_intent_id or booking is None:
        return
    try:
        PendingBooking.objects.filter(
            stripe_payment_intent_id=payment_intent_id,
        ).exclude(status='materialized').update(
            status='materialized', booking=booking, updated_at=timezone.now(),
        )
    except Exception:
        logger.exception("mark_pending_materialized failed for PI %s", payment_intent_id)


def _find_sibling_booking(pending):
    """Return a Booking from a sibling checkout attempt that already materialized,
    or None. Matches by cart_key (same session) then fingerprint (re-checkout)."""
    from .models import PendingBooking

    qs = (
        PendingBooking.objects
        .filter(status='materialized', booking__isnull=False)
        .exclude(id=pending.id)
        .exclude(stripe_payment_intent_id=pending.stripe_payment_intent_id)
    )

    if pending.cart_key:
        sib = qs.filter(cart_key=pending.cart_key).select_related('booking').first()
        if sib:
            return sib.booking

    if pending.fingerprint:
        window_start = pending.created_at - timedelta(hours=48)
        sib = (
            qs.filter(fingerprint=pending.fingerprint, created_at__gte=window_start)
            .select_related('booking')
            .first()
        )
        if sib:
            return sib.booking

    return None


def _build_booking(pending, payload):
    """Replay the captured payload through the SAME serializer the happy path uses."""
    payload = dict(payload or {})
    payload.setdefault('payment_intent_id', pending.stripe_payment_intent_id)

    if pending.is_authenticated:
        from apps.customers.booking_serializers import AuthenticatedBookingCreateSerializer
        serializer = AuthenticatedBookingCreateSerializer(
            data=payload, context={'user': pending.customer}
        )
    else:
        from .serializers import GuestBookingCreateSerializer
        serializer = GuestBookingCreateSerializer(data=payload)

    serializer.is_valid(raise_exception=True)
    return serializer.save()


def materialize_pending_booking(pending_id, *, source='recovery'):
    """Idempotently create the booking captured by a PendingBooking.

    Safe to call concurrently and repeatedly (webhook + reconciliation + happy
    path may all race): the PendingBooking row and the PI's Payment row are
    locked, and every terminal state short-circuits.

    Returns (booking_or_None, outcome_str). Outcomes:
      already_materialized / already_linked / recovered — booking returned
      duplicate / failed / amount_mismatch / not_found / disabled — booking is None
    """
    from apps.payments.models import Payment, PaymentAudit
    from .models import PendingBooking

    if not autorecovery_enabled():
        return None, 'disabled'

    alert = {}  # populated for transaction.on_commit side effects

    with transaction.atomic():
        # Read keys without a row lock so we can take the cross-sibling advisory
        # lock and lock the Payment row BEFORE the PendingBooking row.
        try:
            meta = PendingBooking.objects.values(
                'stripe_payment_intent_id', 'cart_key', 'fingerprint',
            ).get(id=pending_id)
        except PendingBooking.DoesNotExist:
            return None, 'not_found'
        pi = meta['stripe_payment_intent_id']

        # Serialize duplicate detection across sibling PIs (see helper docstring).
        take_dedup_advisory_locks(cart_key=meta['cart_key'], fingerprint=meta['fingerprint'])

        # Lock the Payment row FIRST, then the PendingBooking row — same order the
        # happy-path views use (Payment → PendingBooking) so the two paths can't
        # deadlock (ABBA) when a late booking POST races reconcile for one PI.
        payment = (
            Payment.objects.select_for_update()
            .filter(stripe_payment_intent_id=pi)
            .order_by('created_at')
            .first()
        )
        pending = PendingBooking.objects.select_for_update().get(id=pending_id)

        # --- terminal states (idempotency) ---
        if pending.status == 'materialized' and pending.booking_id:
            return pending.booking, 'already_materialized'
        if pending.status == 'duplicate':
            return None, 'duplicate'

        # The happy path (or a prior recovery) already produced the booking → adopt it.
        if payment and payment.booking_id:
            pending.status = 'materialized'
            pending.booking_id = payment.booking_id
            pending.save(update_fields=['status', 'booking', 'updated_at'])
            return payment.booking, 'already_linked'

        # If the charge was refunded out-of-band (e.g. a Stripe-dashboard refund),
        # never materialize a fulfilled booking on refunded money — retire + alert
        # so staff handle it manually instead of dispatching a free delivery (INC-004).
        if payment and payment.status in ('refunded', 'partially_refunded'):
            pending.status = 'failed'
            pending.failure_reason = f'Payment {payment.status}; not materializing.'
            pending.save(update_fields=['status', 'failure_reason', 'updated_at'])
            PaymentAudit.log(
                action='auto_recovery_failed',
                description=(
                    f"Auto-recovery refused: PI {pi} payment is {payment.status}; "
                    f"not creating a booking on refunded money. Source: {source}."
                ),
                payment=payment,
            )
            alert.update(kind='failed', pi=pi, amount_cents=pending.amount_cents,
                         error=f'payment {payment.status}')
            transaction.on_commit(lambda: _send_recovery_alert(alert))
            return None, 'failed'

        # --- duplicate-charge detection (the two-PI double-charge case) ---
        sibling = _find_sibling_booking(pending)
        if sibling is not None:
            pending.status = 'duplicate'
            pending.failure_reason = (
                f"Duplicate of booking {sibling.booking_number}; charge {pi} "
                f"needs a manual refund."
            )
            pending.save(update_fields=['status', 'failure_reason', 'updated_at'])
            PaymentAudit.log(
                action='duplicate_charge_detected',
                description=(
                    f"Auto-recovery refused: PI {pi} (${pending.amount_cents / 100:.2f}) "
                    f"is a duplicate of booking {sibling.booking_number}. "
                    f"Manual refund required. Source: {source}."
                ),
                payment=payment,
            )
            alert.update(
                kind='duplicate', pi=pi, amount_cents=pending.amount_cents,
                booking_number=sibling.booking_number,
            )
            logger.critical(
                "DUPLICATE CHARGE: PI %s is a duplicate of booking %s — manual refund required",
                pi, sibling.booking_number,
            )
            transaction.on_commit(lambda: _send_recovery_alert(alert))
            return None, 'duplicate'

        # --- materialize: replay the payload through the real serializer ---
        try:
            booking = _build_booking(pending, pending.payload)
        except Exception as exc:
            pending.status = 'failed'
            pending.failure_reason = f"Materialization failed: {exc}"[:500]
            pending.save(update_fields=['status', 'failure_reason', 'updated_at'])
            PaymentAudit.log(
                action='auto_recovery_failed',
                description=(
                    f"Auto-recovery FAILED for PI {pi}: {exc}. "
                    f"Customer charged ${pending.amount_cents / 100:.2f} with no booking. "
                    f"Manual action required. Source: {source}."
                ),
                payment=payment,
            )
            alert.update(kind='failed', pi=pi, amount_cents=pending.amount_cents, error=str(exc)[:200])
            logger.critical("AUTO-RECOVERY FAILED for PI %s: %s", pi, exc, exc_info=True)
            transaction.on_commit(lambda: _send_recovery_alert(alert))
            return None, 'failed'

        # --- C1: the booking total must equal what we actually charged ---
        if booking.total_price_cents != pending.amount_cents:
            booking.status = 'cancelled'
            booking.save()
            pending.status = 'failed'
            pending.failure_reason = (
                f"Amount mismatch: booking={booking.total_price_cents} "
                f"charged={pending.amount_cents}"
            )
            pending.save(update_fields=['status', 'failure_reason', 'updated_at'])
            PaymentAudit.log(
                action='auto_recovery_failed',
                description=(
                    f"Auto-recovery amount mismatch for PI {pi}: "
                    f"booking total {booking.total_price_cents} != charged "
                    f"{pending.amount_cents}. Manual review required. Source: {source}."
                ),
                payment=payment,
            )
            alert.update(
                kind='failed', pi=pi, amount_cents=pending.amount_cents,
                error='booking total does not match charged amount',
            )
            logger.critical(
                "AUTO-RECOVERY amount mismatch for PI %s: booking=%s charged=%s",
                pi, booking.total_price_cents, pending.amount_cents,
            )
            transaction.on_commit(lambda: _send_recovery_alert(alert))
            return None, 'amount_mismatch'

        # --- link the Payment to the new booking ---
        if payment is None:
            payment = Payment.objects.create(
                booking=booking,
                customer=pending.customer if pending.is_authenticated else None,
                amount_cents=pending.amount_cents,
                stripe_payment_intent_id=pi,
                status='succeeded',
                processed_at=timezone.now(),
            )
        else:
            payment.booking = booking
            payment.status = 'succeeded'
            if pending.is_authenticated and pending.customer_id and not payment.customer_id:
                payment.customer = pending.customer
            if not payment.processed_at:
                payment.processed_at = timezone.now()
            payment.save()

        pending.status = 'materialized'
        pending.booking = booking
        pending.save(update_fields=['status', 'booking', 'updated_at'])

        # Transition to paid — fires the confirmation email + Onfleet dispatch
        # signals, exactly as the happy path does.
        booking.status = 'paid'
        booking.save(_skip_pricing=True)

        PaymentAudit.log(
            action='booking_auto_recovered',
            description=(
                f"Orphaned payment auto-recovered: booking {booking.booking_number} "
                f"created from PI {pi} (${pending.amount_cents / 100:.2f}). Source: {source}."
            ),
            payment=payment,
        )
        logger.warning(
            "AUTO-RECOVERED orphaned payment: booking %s from PI %s (source=%s)",
            booking.booking_number, pi, source,
        )
        return booking, 'recovered'


def recover_orphan_for_payment_intent(payment_intent_id, *, source='recovery'):
    """Find the PendingBooking for a PI and materialize it. Returns (booking, outcome)."""
    from .models import PendingBooking

    if not autorecovery_enabled():
        return None, 'disabled'

    pending = (
        PendingBooking.objects
        .filter(stripe_payment_intent_id=payment_intent_id)
        .order_by('created_at')
        .first()
    )
    if pending is None:
        return None, 'no_pending'
    return materialize_pending_booking(pending.id, source=source)


def _send_recovery_alert(info):
    """Best-effort staff alert for a duplicate/failed recovery. Runs post-commit."""
    if not info:
        return
    from django.core.mail import send_mail

    bcc_list = getattr(settings, 'BOOKING_EMAIL_BCC', []) or []
    if isinstance(bcc_list, str):
        bcc_list = bcc_list.split(',')
    recipients = [a.strip() for a in bcc_list if a and a.strip()]
    if not recipients:
        logger.warning("_send_recovery_alert: no BOOKING_EMAIL_BCC configured")
        return

    kind = info.get('kind')
    pi = info.get('pi', 'unknown')
    amount = info.get('amount_cents', 0) / 100
    if kind == 'duplicate':
        subject = "DUPLICATE CHARGE — refund needed (ToteTaxi)"
        body = (
            f"A duplicate payment was detected during auto-recovery.\n\n"
            f"Stripe PI: {pi}\n"
            f"Amount: ${amount:.2f}\n"
            f"This charge duplicates booking {info.get('booking_number')}.\n\n"
            f"ACTION: refund this charge in Stripe — no second booking was created.\n"
            f"https://dashboard.stripe.com/payments/{pi}\n"
        )
    else:
        subject = "URGENT: payment could not be auto-recovered (ToteTaxi)"
        body = (
            f"A succeeded payment could not be turned into a booking automatically.\n\n"
            f"Stripe PI: {pi}\n"
            f"Amount: ${amount:.2f}\n"
            f"Error: {info.get('error', 'unknown')}\n\n"
            f"ACTION: create the booking manually or refund.\n"
            f"https://dashboard.stripe.com/payments/{pi}\n"
        )
    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=recipients,
            fail_silently=True,
        )
    except Exception:
        logger.exception("_send_recovery_alert: failed to send for PI %s", pi)
