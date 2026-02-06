# backend/apps/payments/tests/test_error_responses.py
"""
Tests for HIGH finding H8:
- Error responses must NOT leak internal details (Stripe API info, DB schema, file paths)
- Detailed errors should only appear in server logs

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
from apps.services.models import MiniMovePackage
from apps.accounts.models import StaffProfile


def _next_weekday():
    today = date.today()
    days_ahead = (0 - today.weekday()) % 7
    if days_ahead == 0:
        days_ahead = 7
    return today + timedelta(days=days_ahead)


@pytest.fixture
def staff_user(db):
    user = User.objects.create_user(
        username='teststaff', email='staff@example.com', password='testpass',
    )
    StaffProfile.objects.create(user=user, role='admin', phone='5550000000')
    return user


@pytest.fixture
def test_booking_with_payment(db):
    package, _ = MiniMovePackage.objects.get_or_create(
        package_type='petite',
        defaults={
            'name': 'Petite Move',
            'base_price_cents': 99500,
            'max_items': 15,
            'is_active': True,
        },
    )
    pickup = Address.objects.create(
        address_line_1='123 St', city='New York', state='NY', zip_code='10001',
    )
    delivery = Address.objects.create(
        address_line_1='456 Ave', city='New York', state='NY', zip_code='10002',
    )
    guest = GuestCheckout.objects.create(
        first_name='Test', last_name='User',
        email='test@example.com', phone='5551234567',
    )
    booking = Booking.objects.create(
        guest_checkout=guest,
        service_type='mini_move',
        mini_move_package=package,
        pickup_address=pickup,
        delivery_address=delivery,
        pickup_date=_next_weekday(),
        status='pending',
    )
    payment = Payment.objects.create(
        booking=booking,
        stripe_payment_intent_id='pi_test_err',
        amount_cents=booking.total_price_cents,
        status='succeeded',
    )
    return booking, payment


# Strings that should NEVER appear in error responses to clients
SENSITIVE_PATTERNS = [
    'stripe.error',
    'StripeError',
    'PaymentIntent',
    'pi_',
    'sk_live',
    'sk_test',
    'Traceback',
    'File "/',
    'line ',
    'psycopg',
    'django.db',
    'IntegrityError',
    'OperationalError',
    'relation "',
    'column "',
]


def _response_leaks_details(response):
    """Check if a response contains any sensitive internal details."""
    text = str(response.data) if hasattr(response, 'data') else response.content.decode()
    for pattern in SENSITIVE_PATTERNS:
        if pattern.lower() in text.lower():
            return True, pattern
    return False, None


@pytest.mark.django_db
class TestPaymentErrorSanitization:
    """H8: Payment error responses must not leak Stripe/DB details."""

    @patch('stripe.PaymentIntent.create')
    def test_guest_payment_intent_error_sanitized(self, mock_create):
        """Guest PI creation Stripe error must not leak API details."""
        import stripe
        mock_create.side_effect = stripe.error.StripeError(
            'Request req_abc123: Invalid API Key provided: sk_test_****1234'
        )

        package, _ = MiniMovePackage.objects.get_or_create(
            package_type='petite',
            defaults={
                'name': 'Petite', 'base_price_cents': 99500,
                'max_items': 15, 'is_active': True,
            },
        )

        client = APIClient()
        response = client.post('/api/public/create-payment-intent/', {
            'service_type': 'mini_move',
            'mini_move_package_id': str(package.id),
            'pickup_date': _next_weekday().isoformat(),
            'first_name': 'Test', 'last_name': 'User',
            'email': 'test@example.com', 'phone': '5551234567',
        }, format='json')

        leaks, pattern = _response_leaks_details(response)
        assert not leaks, f"Response leaks internal detail: '{pattern}'"

    @patch('stripe.PaymentIntent.retrieve')
    def test_guest_booking_stripe_error_sanitized(self, mock_retrieve):
        """Guest booking Stripe verification error must not leak details."""
        import stripe
        mock_retrieve.side_effect = stripe.error.StripeError(
            'No such payment_intent: pi_fake_12345; API key: sk_test_xxx'
        )

        package, _ = MiniMovePackage.objects.get_or_create(
            package_type='petite',
            defaults={
                'name': 'Petite', 'base_price_cents': 99500,
                'max_items': 15, 'is_active': True,
            },
        )

        client = APIClient()
        response = client.post('/api/public/guest-booking/', {
            'payment_intent_id': 'pi_fake_12345',
            'service_type': 'mini_move',
            'mini_move_package_id': str(package.id),
            'first_name': 'Test', 'last_name': 'User',
            'email': 'test@example.com', 'phone': '5551234567',
            'pickup_date': _next_weekday().isoformat(),
            'pickup_time': 'morning',
            'pickup_address': {
                'address_line_1': '123 St', 'city': 'New York',
                'state': 'NY', 'zip_code': '10001',
            },
            'delivery_address': {
                'address_line_1': '456 Ave', 'city': 'New York',
                'state': 'NY', 'zip_code': '10002',
            },
        }, format='json')

        leaks, pattern = _response_leaks_details(response)
        assert not leaks, f"Response leaks internal detail: '{pattern}'"

    @patch('apps.payments.services.StripePaymentService.create_refund')
    def test_refund_error_sanitized(
        self, mock_refund, staff_user, test_booking_with_payment
    ):
        """Refund processing error must not leak Stripe details."""
        booking, payment = test_booking_with_payment
        mock_refund.side_effect = Exception(
            'Stripe refund error: No such charge: ch_xxx; sk_test_key'
        )

        client = APIClient()
        client.force_authenticate(user=staff_user)
        response = client.post('/api/payments/refunds/process/', {
            'payment_id': str(payment.id),
            'amount_cents': 5000,
            'reason': 'Test refund',
        }, format='json')

        leaks, pattern = _response_leaks_details(response)
        assert not leaks, f"Response leaks internal detail: '{pattern}'"

    @patch('stripe.PaymentIntent.retrieve')
    def test_payment_confirm_error_sanitized(self, mock_retrieve):
        """Payment confirmation error must not leak details."""
        mock_retrieve.side_effect = Exception(
            'Connection error to api.stripe.com/v1/payment_intents/pi_xyz'
        )

        client = APIClient()
        response = client.post('/api/payments/confirm/', {
            'payment_intent_id': 'pi_xyz',
        }, format='json')

        leaks, pattern = _response_leaks_details(response)
        assert not leaks, f"Response leaks internal detail: '{pattern}'"

    @patch('stripe.PaymentIntent.create')
    def test_customer_payment_intent_error_sanitized(self, mock_create):
        """Authenticated PI creation error must not leak details."""
        import stripe
        mock_create.side_effect = stripe.error.StripeError(
            'Rate limit exceeded; retries on sk_test_key exhausted'
        )

        user = User.objects.create_user(
            username='custtest', email='c@example.com', password='pass123',
        )
        from apps.customers.models import CustomerProfile
        CustomerProfile.objects.create(
            user=user, phone='+12125550100',
            total_bookings=0, total_spent_cents=0,
        )

        package, _ = MiniMovePackage.objects.get_or_create(
            package_type='petite',
            defaults={
                'name': 'Petite', 'base_price_cents': 99500,
                'max_items': 15, 'is_active': True,
            },
        )

        client = APIClient()
        client.force_authenticate(user=user)
        response = client.post('/api/customer/bookings/create-payment-intent/', {
            'service_type': 'mini_move',
            'mini_move_package_id': str(package.id),
            'pickup_date': _next_weekday().isoformat(),
        }, format='json')

        leaks, pattern = _response_leaks_details(response)
        assert not leaks, f"Response leaks internal detail: '{pattern}'"
