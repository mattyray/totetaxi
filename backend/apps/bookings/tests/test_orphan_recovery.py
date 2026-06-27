# backend/apps/bookings/tests/test_orphan_recovery.py
"""Orphaned-payment auto-recovery (INC-004).

Covers the cure: capture the booking at PI-creation, then auto-recover an
orphaned charge server-side via the reconciliation task — including the
two-PI double-charge case (Lauren Sachs), which must NOT become two bookings.
"""
import pytest
from datetime import timedelta
from unittest.mock import patch, Mock

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APIClient

from apps.bookings.models import Booking, Address, PendingBooking
from apps.bookings.recovery import materialize_pending_booking
from apps.payments.models import Payment, PaymentAudit
from apps.payments.tasks import reconcile_pending_payments, alert_succeeded_orphans
from apps.services.models import MiniMovePackage


@pytest.fixture
def package(db):
    pkg, _ = MiniMovePackage.objects.get_or_create(
        package_type='petite',
        defaults={
            'name': 'Petite',
            'description': 'Test package',
            'base_price_cents': 99500,
            'max_items': 15,
            'max_weight_per_item_lbs': 50,
            'coi_fee_cents': 5000,
            'is_active': True,
        },
    )
    return pkg


def guest_booking_payload(package, email='lauren@example.com'):
    """A complete, valid guest booking body (the step-2 shape)."""
    return {
        'service_type': 'mini_move',
        'mini_move_package_id': str(package.id),
        'first_name': 'Lauren',
        'last_name': 'Sachs',
        'email': email,
        'phone': '2019194770',
        'pickup_date': (timezone.now().date() + timedelta(days=3)).isoformat(),
        'pickup_time': 'morning',
        'pickup_address': {
            'address_line_1': '123 Pickup St', 'city': 'New York',
            'state': 'NY', 'zip_code': '10001',
        },
        'delivery_address': {
            'address_line_1': '456 Delivery Ave', 'city': 'New York',
            'state': 'NY', 'zip_code': '10002',
        },
    }


def create_pi(client, package, *, cart_key='', email='lauren@example.com',
              pi_id='pi_test_1', amount=99500):
    """Drive the real create-payment-intent endpoint so a Payment + PendingBooking
    are captured exactly as in production."""
    payload = guest_booking_payload(package, email=email)
    with patch('stripe.PaymentIntent.create') as mock_create:
        mock_create.return_value = Mock(
            id=pi_id, client_secret=f'{pi_id}_secret', amount=amount,
            status='requires_payment_method',
        )
        resp = client.post('/api/public/create-payment-intent/', {
            # top-level pricing fields the PI serializer reads
            'service_type': 'mini_move',
            'mini_move_package_id': str(package.id),
            'pickup_date': payload['pickup_date'],
            'first_name': 'Lauren', 'last_name': 'Sachs',
            'email': email, 'phone': '2019194770',
            'pickup_zip_code': '10001', 'delivery_zip_code': '10002',
            # stashed for recovery
            'booking_payload': payload,
            'cart_key': cart_key,
        }, format='json')
    assert resp.status_code == 200, resp.data
    return resp.data


def _age_pending(pi_id, minutes=10):
    """PendingBooking.created_at is auto_now_add; backdate it past the grace window."""
    PendingBooking.objects.filter(stripe_payment_intent_id=pi_id).update(
        created_at=timezone.now() - timedelta(minutes=minutes)
    )


@pytest.mark.django_db
class TestCapture:
    def test_pending_booking_captured_at_pi_creation(self, package):
        create_pi(APIClient(), package, cart_key='cart-A', pi_id='pi_cap_1')

        pending = PendingBooking.objects.get(stripe_payment_intent_id='pi_cap_1')
        assert pending.status == 'pending'
        assert pending.amount_cents == 99500
        assert pending.cart_key == 'cart-A'
        assert pending.is_authenticated is False
        assert pending.payload['service_type'] == 'mini_move'
        assert pending.fingerprint  # email|date|service|amount
        # a pending Payment is created alongside it
        assert Payment.objects.filter(
            stripe_payment_intent_id='pi_cap_1', status='pending'
        ).exists()

    @patch('stripe.PaymentIntent.cancel')
    def test_capture_skipped_when_flag_disabled(self, _cancel, package, settings):
        settings.ORPHAN_AUTORECOVERY_ENABLED = False
        create_pi(APIClient(), package, pi_id='pi_off_1')
        assert not PendingBooking.objects.filter(
            stripe_payment_intent_id='pi_off_1'
        ).exists()


@pytest.mark.django_db
class TestRecovery:
    def test_orphan_recovered_by_reconcile(self, package):
        """Browser dies after charge: Payment succeeded, no booking → reconcile creates it."""
        create_pi(APIClient(), package, pi_id='pi_orphan_1')
        # Webhook marked the payment succeeded but the booking POST never landed.
        Payment.objects.filter(stripe_payment_intent_id='pi_orphan_1').update(
            status='succeeded'
        )
        _age_pending('pi_orphan_1')

        result = reconcile_pending_payments()
        assert result['recovered'] == 1

        pending = PendingBooking.objects.get(stripe_payment_intent_id='pi_orphan_1')
        assert pending.status == 'materialized'
        assert pending.booking is not None
        booking = pending.booking
        assert booking.status == 'paid'
        assert booking.total_price_cents == 99500
        payment = Payment.objects.get(stripe_payment_intent_id='pi_orphan_1')
        assert payment.booking_id == booking.id
        assert payment.status == 'succeeded'
        assert PaymentAudit.objects.filter(action='booking_auto_recovered').exists()

    @patch('stripe.PaymentIntent.retrieve')
    def test_reconcile_promotes_webhook_miss_then_recovers(self, mock_retrieve, package):
        """Stripe charged but DB Payment stuck 'pending' (lost webhook): reconcile
        confirms via Stripe, promotes, and recovers."""
        create_pi(APIClient(), package, pi_id='pi_miss_1')
        # Payment left 'pending' (webhook never processed). Stripe says succeeded.
        mock_retrieve.return_value = Mock(id='pi_miss_1', status='succeeded',
                                          latest_charge='ch_1')
        _age_pending('pi_miss_1')

        result = reconcile_pending_payments()
        assert result['recovered'] == 1
        payment = Payment.objects.get(stripe_payment_intent_id='pi_miss_1')
        assert payment.status == 'succeeded'
        assert payment.booking_id is not None

    def test_reconcile_skips_within_grace_window(self, package):
        create_pi(APIClient(), package, pi_id='pi_fresh_1')
        Payment.objects.filter(stripe_payment_intent_id='pi_fresh_1').update(
            status='succeeded'
        )
        # do NOT age it — within the grace window
        result = reconcile_pending_payments()
        assert result['recovered'] == 0
        assert PendingBooking.objects.get(
            stripe_payment_intent_id='pi_fresh_1'
        ).status == 'pending'

    def test_materialize_is_idempotent(self, package):
        create_pi(APIClient(), package, pi_id='pi_idem_1')
        Payment.objects.filter(stripe_payment_intent_id='pi_idem_1').update(
            status='succeeded'
        )
        _age_pending('pi_idem_1')
        pending = PendingBooking.objects.get(stripe_payment_intent_id='pi_idem_1')

        b1, o1 = materialize_pending_booking(pending.id, source='test')
        b2, o2 = materialize_pending_booking(pending.id, source='test')
        assert o1 == 'recovered'
        assert o2 == 'already_materialized'
        assert b1.id == b2.id
        assert Booking.objects.filter(id=b1.id).count() == 1

    def test_flag_off_disables_materialize(self, package, settings):
        create_pi(APIClient(), package, pi_id='pi_flagoff_1')
        Payment.objects.filter(stripe_payment_intent_id='pi_flagoff_1').update(
            status='succeeded'
        )
        _age_pending('pi_flagoff_1')
        pending = PendingBooking.objects.get(stripe_payment_intent_id='pi_flagoff_1')

        settings.ORPHAN_AUTORECOVERY_ENABLED = False
        booking, outcome = materialize_pending_booking(pending.id, source='test')
        assert booking is None
        assert outcome == 'disabled'


@pytest.mark.django_db
class TestDoubleCharge:
    def test_two_pis_same_cart_become_one_booking_plus_alert(self, package):
        """The Lauren Sachs case: two PaymentIntents from one checkout, both
        orphaned. Recovery must create ONE booking and flag the second charge as a
        duplicate for manual refund — never two bookings/dispatches/emails."""
        client = APIClient()
        create_pi(client, package, cart_key='cart-DUP', pi_id='pi_dup_1')
        create_pi(client, package, cart_key='cart-DUP', pi_id='pi_dup_2')
        for pi in ('pi_dup_1', 'pi_dup_2'):
            Payment.objects.filter(stripe_payment_intent_id=pi).update(status='succeeded')
            _age_pending(pi)

        result = reconcile_pending_payments()

        assert Booking.objects.count() == 1
        assert result['recovered'] == 1
        assert result['duplicates'] == 1

        statuses = set(
            PendingBooking.objects.values_list('status', flat=True)
        )
        assert statuses == {'materialized', 'duplicate'}

        # The duplicate charge stays unlinked for manual refund (alert-only).
        dup_pending = PendingBooking.objects.get(status='duplicate')
        dup_payment = Payment.objects.get(
            stripe_payment_intent_id=dup_pending.stripe_payment_intent_id
        )
        assert dup_payment.booking_id is None
        assert PaymentAudit.objects.filter(action='duplicate_charge_detected').exists()

    def test_dedup_by_fingerprint_without_cart_key(self, package):
        """Fresh re-checkout (new cart_key) is still caught by the fingerprint."""
        client = APIClient()
        create_pi(client, package, cart_key='', pi_id='pi_fp_1')
        create_pi(client, package, cart_key='', pi_id='pi_fp_2')
        for pi in ('pi_fp_1', 'pi_fp_2'):
            Payment.objects.filter(stripe_payment_intent_id=pi).update(status='succeeded')
            _age_pending(pi)

        reconcile_pending_payments()
        assert Booking.objects.count() == 1
        assert PendingBooking.objects.filter(status='duplicate').count() == 1


@pytest.mark.django_db
class TestAmountIntegrity:
    def test_amount_mismatch_is_not_materialized(self, package):
        """If the booking total wouldn't equal what was charged, refuse to create
        a mispriced booking — alert instead."""
        create_pi(APIClient(), package, pi_id='pi_mm_1')
        # Corrupt the captured amount so it won't match the booking total (99500).
        Payment.objects.filter(stripe_payment_intent_id='pi_mm_1').update(status='succeeded')
        PendingBooking.objects.filter(stripe_payment_intent_id='pi_mm_1').update(
            amount_cents=12345, created_at=timezone.now() - timedelta(minutes=10),
        )
        pending = PendingBooking.objects.get(stripe_payment_intent_id='pi_mm_1')

        booking, outcome = materialize_pending_booking(pending.id, source='test')
        assert outcome == 'amount_mismatch'
        assert booking is None
        pending.refresh_from_db()
        assert pending.status == 'failed'
        # no paid booking left behind
        assert not Booking.objects.filter(status='paid').exists()
        assert PaymentAudit.objects.filter(action='auto_recovery_failed').exists()


@pytest.mark.django_db
class TestHappyPathUnaffected:
    @patch('stripe.PaymentIntent.retrieve')
    def test_happy_path_marks_pending_materialized(self, mock_retrieve, package):
        """Normal completion still works and leaves nothing for recovery to do."""
        client = APIClient()
        create_pi(client, package, pi_id='pi_happy_1', cart_key='cart-H')

        mock_retrieve.return_value = Mock(id='pi_happy_1', status='succeeded',
                                          amount=99500, latest_charge='ch_h')
        payload = guest_booking_payload(package)
        payload.update({'payment_intent_id': 'pi_happy_1'})
        resp = client.post('/api/public/guest-booking/', payload, format='json')
        assert resp.status_code == 201, resp.data

        pending = PendingBooking.objects.get(stripe_payment_intent_id='pi_happy_1')
        assert pending.status == 'materialized'
        assert pending.booking is not None

        # Recovery is now a no-op.
        _age_pending('pi_happy_1')
        result = reconcile_pending_payments()
        assert result['recovered'] == 0
        assert Booking.objects.count() == 1

    @patch('apps.bookings.recovery.take_dedup_advisory_locks')
    def test_materialize_takes_advisory_lock(self, mock_lock, package):
        """Recovery serializes sibling dedup on cart_key + fingerprint (concurrency
        safety — see threaded Postgres verification). Here we assert the wiring."""
        create_pi(APIClient(), package, pi_id='pi_lock_1', cart_key='cartL')
        Payment.objects.filter(stripe_payment_intent_id='pi_lock_1').update(status='succeeded')
        _age_pending('pi_lock_1')
        pending = PendingBooking.objects.get(stripe_payment_intent_id='pi_lock_1')
        materialize_pending_booking(pending.id, source='test')
        assert mock_lock.called
        kwargs = mock_lock.call_args.kwargs
        assert kwargs.get('cart_key') == 'cartL'
        assert kwargs.get('fingerprint')

    @patch('apps.bookings.recovery.take_dedup_advisory_locks')
    @patch('stripe.PaymentIntent.retrieve')
    def test_happy_path_takes_lock_from_pending_booking(self, mock_retrieve, mock_lock, package):
        """Happy-path create takes the SAME cart_key + fingerprint lock the recovery
        path uses — read from the server-captured PendingBooking, NOT the request body
        (the real client never echoes cart_key on the booking-create POST). INC-004."""
        client = APIClient()
        create_pi(client, package, pi_id='pi_lock_2', cart_key='cartG')
        captured = PendingBooking.objects.get(stripe_payment_intent_id='pi_lock_2')
        mock_retrieve.return_value = Mock(id='pi_lock_2', status='succeeded',
                                          amount=99500, latest_charge='ch')
        # Deliberately do NOT put cart_key in the payload — mirrors the real client.
        payload = guest_booking_payload(package)
        payload['payment_intent_id'] = 'pi_lock_2'
        resp = client.post('/api/public/guest-booking/', payload, format='json')
        assert resp.status_code == 201, resp.data
        # The lock must still be taken with the captured cart_key + fingerprint.
        assert any(
            c.kwargs.get('cart_key') == 'cartG'
            and c.kwargs.get('fingerprint') == captured.fingerprint
            for c in mock_lock.call_args_list
        ), mock_lock.call_args_list

    @patch('stripe.PaymentIntent.retrieve')
    def test_same_pi_cannot_create_two_bookings(self, mock_retrieve, package):
        """C2: reusing a PI that already has a booking is rejected, not double-booked."""
        client = APIClient()
        create_pi(client, package, pi_id='pi_reuse_1')
        mock_retrieve.return_value = Mock(id='pi_reuse_1', status='succeeded',
                                          amount=99500, latest_charge='ch_r')
        payload = guest_booking_payload(package)
        payload['payment_intent_id'] = 'pi_reuse_1'

        first = client.post('/api/public/guest-booking/', payload, format='json')
        assert first.status_code == 201
        second = client.post('/api/public/guest-booking/', payload, format='json')
        assert second.status_code == 400
        assert 'already been used' in str(second.data)
        assert Booking.objects.count() == 1


@pytest.mark.django_db
class TestHardeningRegression:
    """Regression tests for the round-2 red-team fixes (concurrency/robustness)."""

    def _succeeded_orphan(self, package, pi_id, pending_status='pending', age_min=20):
        create_pi(APIClient(), package, pi_id=pi_id, cart_key=f'c-{pi_id}')
        Payment.objects.filter(stripe_payment_intent_id=pi_id).update(
            status='succeeded', created_at=timezone.now() - timedelta(minutes=age_min))
        PendingBooking.objects.filter(stripe_payment_intent_id=pi_id).update(
            status=pending_status, created_at=timezone.now() - timedelta(minutes=age_min))
        return Payment.objects.get(stripe_payment_intent_id=pi_id)

    def test_alert_skips_inflight_capture(self, package, settings):
        """alert_succeeded_orphans must NOT tell staff to create a booking manually
        while reconcile is still about to auto-create it (would double-book)."""
        settings.BOOKING_EMAIL_BCC = ['ops@test.com']
        p = self._succeeded_orphan(package, 'pi_alert_inflight', pending_status='pending')
        result = alert_succeeded_orphans()
        assert result['alerted'] == 0
        assert not PaymentAudit.objects.filter(action='orphan_alert_sent', payment=p).exists()

    def test_alert_fires_when_capture_terminal(self, package, settings):
        """When auto-recovery is NOT in flight (capture failed / none), staff ARE
        alerted for manual handling."""
        settings.BOOKING_EMAIL_BCC = ['ops@test.com']
        p = self._succeeded_orphan(package, 'pi_alert_fire', pending_status='failed')
        result = alert_succeeded_orphans()
        assert result['alerted'] >= 1
        assert PaymentAudit.objects.filter(action='orphan_alert_sent', payment=p).exists()

    @patch('apps.bookings.recovery.materialize_pending_booking')
    def test_poison_row_does_not_abort_batch(self, mock_mat, package):
        """One capture that raises an unexpected error must not starve the rest of
        the batch (per-row isolation)."""
        for pi in ('pi_poison_1', 'pi_poison_2'):
            create_pi(APIClient(), package, pi_id=pi, cart_key=f'c-{pi}')
            Payment.objects.filter(stripe_payment_intent_id=pi).update(status='succeeded')
            _age_pending(pi)
        calls = {'n': 0}
        def side_effect(pending_id, source='reconcile'):
            calls['n'] += 1
            if calls['n'] == 1:
                raise RuntimeError('poison row')
            return (Mock(), 'recovered')
        mock_mat.side_effect = side_effect

        result = reconcile_pending_payments()  # must not raise
        assert calls['n'] == 2, 'both rows attempted despite the first poisoning'
        assert result['failed'] >= 1
        assert result['recovered'] >= 1

    def test_reconcile_singleton_lock(self, package):
        """Only one reconcile runs at a time; a second concurrent run no-ops."""
        from django.core.cache import cache
        create_pi(APIClient(), package, pi_id='pi_singleton')
        Payment.objects.filter(stripe_payment_intent_id='pi_singleton').update(status='succeeded')
        _age_pending('pi_singleton')
        cache.add('reconcile_pending_payments_lock', '1', 540)  # pretend a run holds it
        try:
            result = reconcile_pending_payments()
        finally:
            cache.delete('reconcile_pending_payments_lock')
        assert result.get('skipped') == 'locked'
        assert PendingBooking.objects.get(
            stripe_payment_intent_id='pi_singleton').status == 'pending'

    @patch('stripe.PaymentIntent.retrieve')
    def test_capture_retired_when_payment_failed(self, mock_retrieve, package):
        """A capture whose charge never succeeded (abandoned/declined checkout) is
        retired — but only AFTER Stripe confirms it did not succeed (INC-004 B2: a
        DB 'failed' that since succeeded on a same-PI retry must NOT be dropped)."""
        create_pi(APIClient(), package, pi_id='pi_retired')
        Payment.objects.filter(stripe_payment_intent_id='pi_retired').update(status='failed')
        mock_retrieve.return_value = Mock(
            id='pi_retired', status='requires_payment_method', latest_charge=None,
        )
        _age_pending('pi_retired')

        result = reconcile_pending_payments()
        pending = PendingBooking.objects.get(stripe_payment_intent_id='pi_retired')
        assert pending.status == 'failed'  # retired
        assert result['recovered'] == 0
        # No longer 'pending', so a second run does not touch it.
        assert reconcile_pending_payments()['recovered'] == 0

    def test_alert_fires_when_autorecovery_disabled(self, package, settings):
        """Kill-switch ON (autorecovery disabled): a succeeded orphan whose capture is
        still 'pending' must be ALERTED, not silently suppressed — the documented
        alert-only fallback (INC-004)."""
        settings.BOOKING_EMAIL_BCC = ['ops@test.com']
        settings.ORPHAN_AUTORECOVERY_ENABLED = False
        p = self._succeeded_orphan(package, 'pi_killswitch', pending_status='pending')
        result = alert_succeeded_orphans()
        assert result['alerted'] >= 1
        assert PaymentAudit.objects.filter(action='orphan_alert_sent', payment=p).exists()

    def test_alert_fires_for_stale_pending_capture(self, package, settings):
        """Even with autorecovery ON, a capture stuck 'pending' beyond the in-flight
        window stops suppressing the alert (poison-row / saturated-batch escape)."""
        settings.BOOKING_EMAIL_BCC = ['ops@test.com']
        # 'pending' but very old → past the inflight window → should alert
        p = self._succeeded_orphan(package, 'pi_stale', pending_status='pending', age_min=180)
        result = alert_succeeded_orphans()
        assert result['alerted'] >= 1
        assert PaymentAudit.objects.filter(action='orphan_alert_sent', payment=p).exists()

    def test_materialize_refuses_refunded_payment(self, package):
        """A charge refunded out-of-band must NOT be turned into a fulfilled booking."""
        create_pi(APIClient(), package, pi_id='pi_refunded')
        Payment.objects.filter(stripe_payment_intent_id='pi_refunded').update(status='refunded')
        _age_pending('pi_refunded')
        pending = PendingBooking.objects.get(stripe_payment_intent_id='pi_refunded')
        booking, outcome = materialize_pending_booking(pending.id, source='test')
        assert booking is None
        assert outcome == 'failed'
        assert not Booking.objects.filter(status='paid').exists()

    def test_reconcile_retires_partially_refunded(self, package):
        """A partially-refunded orphan is retired, not materialized at full price."""
        create_pi(APIClient(), package, pi_id='pi_partial')
        Payment.objects.filter(stripe_payment_intent_id='pi_partial').update(status='partially_refunded')
        _age_pending('pi_partial')
        result = reconcile_pending_payments()
        assert result['recovered'] == 0
        assert PendingBooking.objects.get(stripe_payment_intent_id='pi_partial').status == 'failed'


@pytest.mark.django_db
class TestReviewFixesRound4:
    """Regression coverage for the two-pass review fixes (INC-004 #1-#6 + B2/B3)."""

    @patch('stripe.PaymentIntent.retrieve')
    def test_failed_payment_promoted_when_stripe_succeeded(self, mock_retrieve, package):
        """B2: DB Payment='failed' (lost success webhook after a same-PI retry) but
        Stripe says succeeded → promote + recover; never silently drop a paid customer."""
        create_pi(APIClient(), package, pi_id='pi_retry')
        Payment.objects.filter(stripe_payment_intent_id='pi_retry').update(status='failed')
        mock_retrieve.return_value = Mock(id='pi_retry', status='succeeded', latest_charge='ch_retry')
        _age_pending('pi_retry')

        result = reconcile_pending_payments()
        assert result['recovered'] == 1
        payment = Payment.objects.get(stripe_payment_intent_id='pi_retry')
        assert payment.status == 'succeeded'
        assert payment.booking_id is not None

    @patch('stripe.PaymentIntent.retrieve')
    def test_reconcile_skips_out_of_band_refund(self, mock_retrieve, package):
        """B3: a dashboard refund leaves PI.status=succeeded but the charge refunded.
        reconcile must detect it (DB not yet synced) and NOT materialize a booking."""
        create_pi(APIClient(), package, pi_id='pi_oob')  # Payment left 'pending'
        mock_retrieve.return_value = Mock(
            id='pi_oob', status='succeeded',
            latest_charge=Mock(id='ch_oob', refunded=True, amount=99500, amount_refunded=99500),
        )
        _age_pending('pi_oob')

        result = reconcile_pending_payments()
        assert result['recovered'] == 0
        assert PendingBooking.objects.get(stripe_payment_intent_id='pi_oob').status == 'failed'
        assert Payment.objects.get(stripe_payment_intent_id='pi_oob').status == 'refunded'
        assert not Booking.objects.filter(status='paid').exists()

    @patch('stripe.PaymentIntent.retrieve')
    def test_happy_path_refuses_when_sibling_already_materialized(self, mock_retrieve, package):
        """#2/B4: reconcile recovers the first of a double-charge into a booking, THEN
        the second PI's booking-create POST lands. It must be refused (no 2nd booking)."""
        client = APIClient()
        create_pi(client, package, cart_key='cart-RF', pi_id='pi_rf_1')
        create_pi(client, package, cart_key='cart-RF', pi_id='pi_rf_2')
        # First charge orphaned, then recovered by reconcile.
        Payment.objects.filter(stripe_payment_intent_id='pi_rf_1').update(status='succeeded')
        _age_pending('pi_rf_1')
        assert reconcile_pending_payments()['recovered'] == 1
        assert Booking.objects.count() == 1

        # Now the SECOND PI's happy-path POST lands — must be refused.
        mock_retrieve.return_value = Mock(id='pi_rf_2', status='succeeded',
                                          amount=99500, latest_charge='ch_rf2')
        payload = guest_booking_payload(package)
        payload.update({'payment_intent_id': 'pi_rf_2'})
        resp = client.post('/api/public/guest-booking/', payload, format='json')

        assert resp.status_code == 400
        assert 'already been used' in str(resp.data).lower()
        assert Booking.objects.count() == 1  # still exactly one
        assert PendingBooking.objects.get(stripe_payment_intent_id='pi_rf_2').status == 'duplicate'
        assert PaymentAudit.objects.filter(action='duplicate_charge_detected').exists()

    def test_mark_materialized_does_not_revive_duplicate(self, package):
        """#3: a capture flagged 'duplicate' (charge awaiting manual refund) must NOT
        be flipped to 'materialized' by a late happy-path mark."""
        from apps.bookings.recovery import mark_pending_materialized
        # Make a real, saved booking via recovery on a separate PI.
        create_pi(APIClient(), package, pi_id='pi_real', cart_key='cx-real')
        Payment.objects.filter(stripe_payment_intent_id='pi_real').update(status='succeeded')
        _age_pending('pi_real')
        reconcile_pending_payments()
        real_booking = Booking.objects.get(status='paid')

        # A separate capture that's already terminal-'duplicate'.
        create_pi(APIClient(), package, pi_id='pi_dupe3', cart_key='cx-dupe')
        PendingBooking.objects.filter(stripe_payment_intent_id='pi_dupe3').update(status='duplicate')

        mark_pending_materialized('pi_dupe3', real_booking)

        dupe = PendingBooking.objects.get(stripe_payment_intent_id='pi_dupe3')
        assert dupe.status == 'duplicate'  # unchanged — not resurrected
        assert dupe.booking_id is None

    def test_amount_mismatch_sends_no_customer_email(self, package, mailoutbox):
        """#4: the throwaway cancelled booking must NOT email the customer."""
        create_pi(APIClient(), package, pi_id='pi_mm_email')
        Payment.objects.filter(stripe_payment_intent_id='pi_mm_email').update(status='succeeded')
        PendingBooking.objects.filter(stripe_payment_intent_id='pi_mm_email').update(
            amount_cents=12345, created_at=timezone.now() - timedelta(minutes=10),
        )
        pending = PendingBooking.objects.get(stripe_payment_intent_id='pi_mm_email')
        materialize_pending_booking(pending.id, source='test')

        customer_mails = [m for m in mailoutbox if 'lauren@example.com' in m.to]
        assert customer_mails == []

    def test_organizing_breakdown_returns_list_not_none(self, package):
        """#1/B1: get_organizing_services_breakdown must return a list — the `return
        services` was displaced into PendingBooking, making it return None for every
        mini-move with packing/unpacking."""
        b = Booking(
            service_type='mini_move', mini_move_package=package,
            include_packing=False, include_unpacking=False,
        )
        assert b.get_organizing_services_breakdown() == []
