# backend/apps/payments/tests/test_payment_security.py
"""
Tests for CRITICAL security findings C1 + C2:
- C1: Payment amount must be verified (PI amount == booking total)
- C2: PaymentIntent reuse must be prevented (one PI = one booking)
- C2b: Guest flow must create Payment record

These tests should FAIL before the fix and PASS after.
"""
import pytest
from unittest.mock import patch, Mock
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import date, timedelta

from apps.bookings.models import Booking, Address, GuestCheckout
from apps.payments.models import Payment
from apps.customers.models import CustomerProfile
from apps.services.models import MiniMovePackage


def _next_weekday():
    """Return a future weekday (Mon-Fri) to avoid surcharge interference."""
    today = date.today()
    days_ahead = (0 - today.weekday()) % 7  # next Monday
    if days_ahead == 0:
        days_ahead = 7
    return today + timedelta(days=days_ahead)


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
        address_line_1='123 Test St',
        city='New York',
        state='NY',
        zip_code='10001',
    )
    delivery = Address.objects.create(
        address_line_1='456 Test Ave',
        city='New York',
        state='NY',
        zip_code='10002',
    )
    return pickup, delivery


@pytest.fixture
def guest_booking(mini_move_package, addresses):
    """Create a guest booking with known price."""
    pickup, delivery = addresses
    guest = GuestCheckout.objects.create(
        first_name='Test', last_name='Guest',
        email='guest@example.com', phone='5551234567',
    )
    booking = Booking.objects.create(
        guest_checkout=guest,
        service_type='mini_move',
        mini_move_package=mini_move_package,
        pickup_address=pickup,
        delivery_address=delivery,
        pickup_date=_next_weekday(),
        status='pending',
    )
    return booking


@pytest.fixture
def customer_user(db):
    user = User.objects.create_user(
        username='testcust', email='cust@example.com', password='testpass123',
        first_name='Test', last_name='Customer',
    )
    CustomerProfile.objects.create(
        user=user, phone='+12125550100',
        total_bookings=0, total_spent_cents=0,
    )
    return user


def _guest_booking_payload(package, pickup_date=None):
    """Standard guest booking POST payload."""
    return {
        'payment_intent_id': 'pi_test_security',
        'service_type': 'mini_move',
        'mini_move_package_id': str(package.id),
        'first_name': 'Test',
        'last_name': 'Guest',
        'email': 'guest@example.com',
        'phone': '5551234567',
        'pickup_date': (pickup_date or _next_weekday()).isoformat(),
        'pickup_time': 'morning',
        'pickup_address': {
            'address_line_1': '123 Test St',
            'city': 'New York',
            'state': 'NY',
            'zip_code': '10001',
        },
        'delivery_address': {
            'address_line_1': '456 Test Ave',
            'city': 'New York',
            'state': 'NY',
            'zip_code': '10002',
        },
    }


# ============================================================
# C1: Payment amount verification
# ============================================================

@pytest.mark.django_db
class TestPaymentAmountVerification:
    """C1: Booking must be rejected if PI amount doesn't match booking total."""

    @patch('apps.logistics.models.create_onfleet_tasks_on_payment')
    @patch('stripe.PaymentIntent.retrieve')
    def test_guest_booking_rejected_when_pi_amount_too_low(
        self, mock_retrieve, mock_signal, mini_move_package
    ):
        """An attacker paying $1 for a $995 move must be blocked."""
        mock_signal.return_value = None
        mock_retrieve.return_value = Mock(
            id='pi_test_cheap',
            status='succeeded',
            amount=100,  # $1 — way less than $995 booking
            get=lambda k, d=None: d,
        )

        client = APIClient()
        payload = _guest_booking_payload(mini_move_package)
        payload['payment_intent_id'] = 'pi_test_cheap'
        response = client.post(
            '/api/public/guest-booking/', payload, format='json'
        )

        assert response.status_code == 400
        assert 'amount' in str(response.data).lower() or 'mismatch' in str(response.data).lower()

    @patch('apps.logistics.models.create_onfleet_tasks_on_payment')
    @patch('stripe.PaymentIntent.retrieve')
    def test_customer_booking_rejected_when_pi_amount_too_low(
        self, mock_retrieve, mock_signal, mini_move_package, addresses, customer_user
    ):
        """Authenticated customer paying wrong amount must also be blocked."""
        mock_signal.return_value = None
        mock_retrieve.return_value = Mock(
            id='pi_test_cheap_auth',
            status='succeeded',
            amount=100,
            get=lambda k, d=None: d,
        )

        client = APIClient()
        client.force_authenticate(user=customer_user)

        pickup, delivery = addresses
        response = client.post('/api/customer/bookings/create/', {
            'payment_intent_id': 'pi_test_cheap_auth',
            'service_type': 'mini_move',
            'mini_move_package_id': str(mini_move_package.id),
            'pickup_date': _next_weekday().isoformat(),
            'pickup_time': 'morning',
            'pickup_address': {
                'address_line_1': pickup.address_line_1,
                'city': pickup.city,
                'state': pickup.state,
                'zip_code': pickup.zip_code,
            },
            'delivery_address': {
                'address_line_1': delivery.address_line_1,
                'city': delivery.city,
                'state': delivery.state,
                'zip_code': delivery.zip_code,
            },
        }, format='json')

        assert response.status_code == 400
        assert 'amount' in str(response.data).lower() or 'mismatch' in str(response.data).lower()

    @patch('apps.logistics.models.create_onfleet_tasks_on_payment')
    @patch('stripe.PaymentIntent.retrieve')
    def test_guest_booking_accepted_when_pi_amount_matches(
        self, mock_retrieve, mock_signal, mini_move_package
    ):
        """Correct payment amount should still allow booking creation."""
        mock_signal.return_value = None

        # Package is 99500 cents — create PI with matching amount
        mock_retrieve.return_value = Mock(
            id='pi_test_correct',
            status='succeeded',
            amount=99500,
            get=lambda k, d=None: d,
        )

        client = APIClient()
        payload = _guest_booking_payload(mini_move_package)
        payload['payment_intent_id'] = 'pi_test_correct'
        response = client.post(
            '/api/public/guest-booking/', payload, format='json'
        )

        assert response.status_code == 201


# ============================================================
# C2: PaymentIntent reuse prevention
# ============================================================

@pytest.mark.django_db
class TestPaymentIntentReuse:
    """C2: One PaymentIntent must only create one booking."""

    @patch('apps.logistics.models.create_onfleet_tasks_on_payment')
    @patch('stripe.PaymentIntent.retrieve')
    def test_guest_booking_rejected_when_pi_already_used(
        self, mock_retrieve, mock_signal, mini_move_package, guest_booking
    ):
        """Reusing a PI that already has a booking must be rejected."""
        mock_signal.return_value = None
        mock_retrieve.return_value = Mock(
            id='pi_already_used',
            status='succeeded',
            amount=guest_booking.total_price_cents,
            get=lambda k, d=None: d,
        )

        # Create a Payment record linking the PI to the existing booking
        Payment.objects.create(
            booking=guest_booking,
            stripe_payment_intent_id='pi_already_used',
            amount_cents=guest_booking.total_price_cents,
            status='succeeded',
        )

        client = APIClient()
        payload = _guest_booking_payload(mini_move_package)
        payload['payment_intent_id'] = 'pi_already_used'
        response = client.post(
            '/api/public/guest-booking/', payload, format='json'
        )

        assert response.status_code == 400
        assert 'already' in str(response.data).lower() or 'reuse' in str(response.data).lower()

    @patch('apps.logistics.models.create_onfleet_tasks_on_payment')
    @patch('stripe.PaymentIntent.retrieve')
    def test_customer_booking_rejected_when_pi_already_used(
        self, mock_retrieve, mock_signal, mini_move_package, addresses,
        customer_user, guest_booking
    ):
        """Authenticated user reusing a PI must be rejected."""
        mock_signal.return_value = None
        mock_retrieve.return_value = Mock(
            id='pi_already_used_auth',
            status='succeeded',
            amount=guest_booking.total_price_cents,
            get=lambda k, d=None: d,
        )

        Payment.objects.create(
            booking=guest_booking,
            stripe_payment_intent_id='pi_already_used_auth',
            amount_cents=guest_booking.total_price_cents,
            status='succeeded',
        )

        client = APIClient()
        client.force_authenticate(user=customer_user)
        pickup, delivery = addresses

        response = client.post('/api/customer/bookings/create/', {
            'payment_intent_id': 'pi_already_used_auth',
            'service_type': 'mini_move',
            'mini_move_package_id': str(mini_move_package.id),
            'pickup_date': _next_weekday().isoformat(),
            'pickup_time': 'morning',
            'pickup_address': {
                'address_line_1': pickup.address_line_1,
                'city': pickup.city,
                'state': pickup.state,
                'zip_code': pickup.zip_code,
            },
            'delivery_address': {
                'address_line_1': delivery.address_line_1,
                'city': delivery.city,
                'state': delivery.state,
                'zip_code': delivery.zip_code,
            },
        }, format='json')

        assert response.status_code == 400
        assert 'already' in str(response.data).lower() or 'reuse' in str(response.data).lower()


# ============================================================
# C2b: Guest flow must create Payment record
# ============================================================

@pytest.mark.django_db
class TestGuestPaymentRecordCreation:
    """C2b: Guest booking flow must create a Payment record."""

    @patch('apps.logistics.models.create_onfleet_tasks_on_payment')
    @patch('stripe.PaymentIntent.retrieve')
    def test_guest_booking_creates_payment_record(
        self, mock_retrieve, mock_signal, mini_move_package
    ):
        """Guest booking must create a Payment record linking PI to booking."""
        mock_signal.return_value = None
        mock_retrieve.return_value = Mock(
            id='pi_guest_payment_record',
            status='succeeded',
            amount=99500,
            get=lambda k, d=None: '',
        )

        client = APIClient()
        payload = _guest_booking_payload(mini_move_package)
        payload['payment_intent_id'] = 'pi_guest_payment_record'
        response = client.post(
            '/api/public/guest-booking/', payload, format='json'
        )

        assert response.status_code == 201

        # Verify Payment record was created
        booking_id = response.data['booking']['id']
        payment = Payment.objects.filter(
            booking_id=booking_id,
            stripe_payment_intent_id='pi_guest_payment_record',
        ).first()

        assert payment is not None, "Guest booking must create a Payment record"
        assert payment.status == 'succeeded'
        assert payment.amount_cents == 99500
