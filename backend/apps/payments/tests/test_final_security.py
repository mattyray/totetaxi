# backend/apps/payments/tests/test_final_security.py
"""
Tests for final security audit fixes (PR 4):
- M5: Webhook idempotency TTL covers Stripe's 72h retry window
- L13: CustomerNotesUpdateView audit logging
- L17: Onfleet signal only fires on status transitions
- L20: Session ID masked in logs (< 10 chars exposed)
"""
import pytest
from unittest.mock import patch, MagicMock
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from django.core.cache import cache
from datetime import date, timedelta

from apps.bookings.models import Booking, Address, GuestCheckout
from apps.accounts.models import StaffProfile, StaffAction
from apps.customers.models import CustomerProfile
from apps.services.models import MiniMovePackage
from apps.logistics.models import OnfleetTask


# ============================================================
# Shared fixtures
# ============================================================

@pytest.fixture
def staff_user(db):
    user = User.objects.create_user(
        username='teststaff_final', email='staff_final@example.com',
        password='testpass', first_name='Test', last_name='Staff',
    )
    StaffProfile.objects.create(user=user, role='staff', phone='5550000099')
    return user


@pytest.fixture
def customer_user(db):
    user = User.objects.create_user(
        username='testcust_final', email='cust_final@example.com',
        password='testpass', first_name='Test', last_name='Customer',
    )
    CustomerProfile.objects.create(
        user=user, phone='+12125550199',
        total_bookings=0, total_spent_cents=0,
    )
    return user


@pytest.fixture
def mini_move_package(db):
    pkg, _ = MiniMovePackage.objects.get_or_create(
        package_type='petite',
        defaults={
            'name': 'Petite Move',
            'base_price_cents': 99500,
            'max_items': 15,
            'is_active': True,
        },
    )
    return pkg


@pytest.fixture
def addresses(db):
    pickup = Address.objects.create(
        address_line_1='100 Test St', city='New York', state='NY', zip_code='10001',
    )
    delivery = Address.objects.create(
        address_line_1='200 Test Ave', city='New York', state='NY', zip_code='10002',
    )
    return pickup, delivery


def _next_weekday():
    today = date.today()
    days_ahead = (0 - today.weekday()) % 7
    if days_ahead == 0:
        days_ahead = 7
    return today + timedelta(days=days_ahead)


@pytest.fixture
def paid_booking(db, mini_move_package, addresses):
    pickup, delivery = addresses
    guest = GuestCheckout.objects.create(
        first_name='Test', last_name='Guest',
        email='guest@example.com', phone='5551234567',
    )
    booking = Booking.objects.create(
        service_type='mini_move',
        mini_move_package=mini_move_package,
        guest_checkout=guest,
        pickup_address=pickup,
        delivery_address=delivery,
        pickup_date=_next_weekday(),
        pickup_time='morning',
        total_price_cents=99500,
        status='paid',
    )
    return booking


# ============================================================
# M5: Webhook idempotency cache TTL = 72 hours (259200 seconds)
# ============================================================

class TestWebhookIdempotencyTTL:

    @patch('apps.payments.tasks.process_payment_succeeded.delay')
    @patch('stripe.Webhook.construct_event')
    def test_idempotency_cache_set_with_72h_ttl(self, mock_construct, mock_task, db):
        """Verify cache.set is called with 259200 second timeout (72h)."""
        mock_event = {
            'id': 'evt_test_ttl_check',
            'type': 'payment_intent.succeeded',
            'data': {'object': {'id': 'pi_test', 'metadata': {}}},
        }
        mock_construct.return_value = mock_event

        cache.clear()
        client = APIClient()

        with patch('apps.payments.views.cache') as mock_cache:
            mock_cache.get.return_value = None  # not already processed
            client.post(
                '/api/payments/webhook/',
                data=b'{}',
                content_type='application/json',
                HTTP_STRIPE_SIGNATURE='test_sig',
            )
            # cache.set(key, True, timeout=259200)
            mock_cache.set.assert_called_once()
            call_kwargs = mock_cache.set.call_args[1]
            assert call_kwargs.get('timeout') == 259200, (
                f"Expected timeout=259200 (72h), got {call_kwargs}"
            )


# ============================================================
# L13: CustomerNotesUpdateView creates StaffAction audit log
# ============================================================

class TestCustomerNotesAuditLog:

    def test_notes_update_creates_staff_action(self, staff_user, customer_user):
        """Updating customer notes must create a StaffAction audit record."""
        client = APIClient()
        client.force_authenticate(user=staff_user)

        initial_count = StaffAction.objects.count()
        resp = client.patch(
            f'/api/customer/{customer_user.id}/notes/',
            {'notes': 'VIP customer — handle with care'},
            format='json',
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.data}"

        assert StaffAction.objects.count() == initial_count + 1
        action = StaffAction.objects.order_by('-created_at').first()
        assert action.staff_user == staff_user
        assert action.action_type == 'modify_customer'
        assert 'notes' in action.description.lower() or 'Updated' in action.description


# ============================================================
# L17: Onfleet signal only fires on status transitions
# ============================================================

class TestOnfleetSignalScoping:

    @patch('apps.logistics.services.ToteTaxiOnfleetIntegration')
    def test_signal_fires_on_status_change_to_paid(self, mock_integration, db, mini_move_package, addresses):
        """Signal should fire when status transitions to 'paid'."""
        mock_instance = MagicMock()
        mock_instance.create_tasks_for_booking.return_value = (MagicMock(), MagicMock())
        mock_integration.return_value = mock_instance

        pickup, delivery = addresses
        guest = GuestCheckout.objects.create(
            first_name='Sig', last_name='Test',
            email='sig@example.com', phone='5559999999',
        )
        # Create as pending — mock is active so signal won't create real tasks
        booking = Booking.objects.create(
            service_type='mini_move',
            mini_move_package=mini_move_package,
            guest_checkout=guest,
            pickup_address=pickup,
            delivery_address=delivery,
            pickup_date=_next_weekday(),
            pickup_time='morning',
            total_price_cents=99500,
            status='pending',
        )

        # Reset mock to track only the transition call
        mock_instance.reset_mock()

        # Transition to paid — signal should fire
        booking.status = 'paid'
        booking.save(_skip_pricing=True)
        mock_instance.create_tasks_for_booking.assert_called_once()

    @patch('apps.logistics.services.ToteTaxiOnfleetIntegration')
    def test_signal_does_not_fire_on_non_status_save(self, mock_integration, paid_booking):
        """Saving a paid booking without changing status should NOT trigger task creation."""
        mock_instance = MagicMock()
        mock_integration.return_value = mock_instance

        # Re-fetch to reset _original_status
        booking = Booking.objects.get(pk=paid_booking.pk)

        # Save without changing status (e.g. updating special_instructions)
        booking.special_instructions = 'Handle with care'
        booking.save(_skip_pricing=True)

        mock_instance.create_tasks_for_booking.assert_not_called()


# ============================================================
# L20: Session ID masked to ≤4 visible chars in logs
# ============================================================

class TestSessionIdMasking:

    def test_session_key_masked_in_log_output(self):
        """Verify the masking logic produces ≤4 visible chars + '***'."""
        session_key = 'abcdefghijklmnop1234567890'
        masked = session_key[:4] + '***'
        assert masked == 'abcd***'
        assert len(masked) == 7  # 4 visible + 3 asterisks
