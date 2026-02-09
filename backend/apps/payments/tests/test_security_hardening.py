# backend/apps/payments/tests/test_security_hardening.py
"""
Tests for security hardening PR #10:
- R2: Free order unique IDs + C2 reuse prevention
- R4: Partial refund → partially_refunded status, subsequent refunds allowed
- R7: Legacy PaymentConfirmView removed
- R8: Authenticated CreatePaymentIntentView requires auth
- R10: Payment/Refund list views require IsStaffMember
- R11: Discount code enumeration (uniform 400 responses)
"""
import pytest
from unittest.mock import patch, MagicMock, Mock
from datetime import date, timedelta
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from django.utils import timezone

from apps.payments.models import Payment, Refund
from apps.payments.services import StripePaymentService
from apps.bookings.models import Booking, Address, GuestCheckout, DiscountCode
from apps.customers.models import CustomerProfile
from apps.services.models import MiniMovePackage
from apps.accounts.models import StaffProfile


def _next_weekday():
    today = date.today()
    days_ahead = (0 - today.weekday()) % 7
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
def staff_user(db):
    user = User.objects.create_user(
        username='stafftest', email='staff@test.com', password='staffpass123',
    )
    StaffProfile.objects.create(user=user, role='staff', phone='5550001111')
    return user


@pytest.fixture
def customer_user(db):
    user = User.objects.create_user(
        username='custtest', email='cust@test.com', password='custpass123',
        first_name='Test', last_name='Customer',
    )
    CustomerProfile.objects.create(
        user=user, phone='+12125550100',
        total_bookings=0, total_spent_cents=0,
    )
    return user


@pytest.fixture
def paid_booking_with_payment(mini_move_package, db):
    """Create a paid booking with a $150 payment for refund tests."""
    guest = GuestCheckout.objects.create(
        first_name='Refund', last_name='Test',
        email='refund@test.com', phone='5559999999',
    )
    pickup = Address.objects.create(
        address_line_1='100 Main St', city='New York', state='NY', zip_code='10001',
    )
    delivery = Address.objects.create(
        address_line_1='200 Park Ave', city='New York', state='NY', zip_code='10002',
    )
    booking = Booking.objects.create(
        service_type='mini_move',
        mini_move_package=mini_move_package,
        guest_checkout=guest,
        pickup_address=pickup,
        delivery_address=delivery,
        pickup_date=_next_weekday(),
        pickup_time='morning',
        status='paid',
    )
    payment = Payment.objects.create(
        booking=booking,
        amount_cents=15000,
        stripe_payment_intent_id='pi_refund_test',
        stripe_charge_id='ch_refund_test',
        status='succeeded',
    )
    return booking, payment


# ============================================================
# R2: Free order unique IDs — C2 reuse prevention applies
# ============================================================

@pytest.mark.django_db
class TestFreeOrderReusePrevention:
    """R2: Free orders get unique IDs and cannot be reused."""

    @patch('apps.logistics.models.create_onfleet_tasks_on_payment')
    @patch('stripe.PaymentIntent.retrieve')
    def test_free_order_reuse_blocked(
        self, mock_retrieve, mock_signal, mini_move_package
    ):
        """A free_order_* PI that's already used must be rejected."""
        mock_signal.return_value = None

        free_pi_id = 'free_order_aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'

        # Create an existing booking with this free order PI
        guest = GuestCheckout.objects.create(
            first_name='First', last_name='Free',
            email='free@test.com', phone='5551111111',
        )
        pickup = Address.objects.create(
            address_line_1='10 St', city='New York', state='NY', zip_code='10001',
        )
        delivery = Address.objects.create(
            address_line_1='20 Ave', city='New York', state='NY', zip_code='10002',
        )
        existing_booking = Booking.objects.create(
            service_type='mini_move',
            mini_move_package=mini_move_package,
            guest_checkout=guest,
            pickup_address=pickup,
            delivery_address=delivery,
            pickup_date=_next_weekday(),
            status='paid',
        )
        Payment.objects.create(
            booking=existing_booking,
            amount_cents=0,
            stripe_payment_intent_id=free_pi_id,
            status='succeeded',
        )

        # Try to reuse the same free_order PI
        client = APIClient()
        response = client.post('/api/public/guest-booking/', {
            'payment_intent_id': free_pi_id,
            'service_type': 'mini_move',
            'mini_move_package_id': str(mini_move_package.id),
            'first_name': 'Second', 'last_name': 'Free',
            'email': 'free2@test.com', 'phone': '5552222222',
            'pickup_date': _next_weekday().isoformat(),
            'pickup_time': 'morning',
            'pickup_address': {
                'address_line_1': '30 St', 'city': 'New York',
                'state': 'NY', 'zip_code': '10001',
            },
            'delivery_address': {
                'address_line_1': '40 Ave', 'city': 'New York',
                'state': 'NY', 'zip_code': '10002',
            },
        }, format='json')

        assert response.status_code == 400
        assert 'already' in str(response.data).lower()

    def test_old_free_order_string_rejected(self, mini_move_package):
        """The literal string 'free_order' (without UUID) must not be treated as free."""
        client = APIClient()
        response = client.post('/api/public/guest-booking/', {
            'payment_intent_id': 'free_order',
            'service_type': 'mini_move',
            'mini_move_package_id': str(mini_move_package.id),
            'first_name': 'Old', 'last_name': 'Free',
            'email': 'old@test.com', 'phone': '5553333333',
            'pickup_date': _next_weekday().isoformat(),
            'pickup_time': 'morning',
            'pickup_address': {
                'address_line_1': '50 St', 'city': 'New York',
                'state': 'NY', 'zip_code': '10001',
            },
            'delivery_address': {
                'address_line_1': '60 Ave', 'city': 'New York',
                'state': 'NY', 'zip_code': '10002',
            },
        }, format='json')

        # Without the UUID suffix it's not recognized as a free order,
        # so it tries Stripe verification and fails
        assert response.status_code == 400


# ============================================================
# R4: Partial refund → partially_refunded, allows subsequent refunds
# ============================================================

@pytest.mark.django_db
class TestPartialRefundStatus:
    """R4: Partial refund sets partially_refunded, subsequent refunds allowed."""

    @patch('stripe.Refund.create')
    def test_partial_refund_sets_partially_refunded(
        self, mock_stripe, paid_booking_with_payment, staff_user
    ):
        """A partial refund should set status to 'partially_refunded'."""
        booking, payment = paid_booking_with_payment
        mock_stripe.return_value = MagicMock(id='re_partial1', amount=5000)

        refund = StripePaymentService.create_refund(
            payment=payment,
            amount_cents=5000,
            reason='Partial refund test',
            requested_by_user=staff_user,
        )

        payment.refresh_from_db()
        assert payment.status == 'partially_refunded'
        assert refund.amount_cents == 5000

    @patch('stripe.Refund.create')
    def test_second_partial_refund_allowed(
        self, mock_stripe, paid_booking_with_payment, staff_user
    ):
        """A second partial refund on a partially_refunded payment should work."""
        booking, payment = paid_booking_with_payment
        mock_stripe.return_value = MagicMock(id='re_partial2a', amount=5000)

        # First partial refund
        StripePaymentService.create_refund(
            payment=payment, amount_cents=5000,
            reason='First partial', requested_by_user=staff_user,
        )
        payment.refresh_from_db()
        assert payment.status == 'partially_refunded'

        # Second partial refund via the API
        mock_stripe.return_value = MagicMock(id='re_partial2b', amount=5000)
        client = APIClient()
        client.force_authenticate(user=staff_user)
        response = client.post('/api/payments/refunds/process/', {
            'payment_id': str(payment.id),
            'amount_cents': 5000,
            'reason': 'Second partial',
        }, format='json')

        assert response.status_code == 201
        payment.refresh_from_db()
        assert payment.status == 'partially_refunded'  # 10000/15000 still partial

    @patch('stripe.Refund.create')
    def test_full_refund_sets_refunded(
        self, mock_stripe, paid_booking_with_payment, staff_user
    ):
        """Refunding the full amount should set status to 'refunded'."""
        booking, payment = paid_booking_with_payment
        mock_stripe.return_value = MagicMock(id='re_full', amount=15000)

        StripePaymentService.create_refund(
            payment=payment, amount_cents=15000,
            reason='Full refund', requested_by_user=staff_user,
        )

        payment.refresh_from_db()
        assert payment.status == 'refunded'


# ============================================================
# R7: Legacy PaymentConfirmView removed
# ============================================================

@pytest.mark.django_db
class TestLegacyPaymentConfirmRemoved:
    """R7: /api/payments/confirm/ endpoint should no longer exist."""

    def test_confirm_endpoint_returns_404(self):
        client = APIClient()
        response = client.post('/api/payments/confirm/', {
            'payment_intent_id': 'pi_test',
        }, format='json')
        assert response.status_code == 404


# ============================================================
# R8: Authenticated CreatePaymentIntentView requires auth
# ============================================================

@pytest.mark.django_db
class TestCustomerPIRequiresAuth:
    """R8: /api/customer/bookings/create-payment-intent/ requires authentication."""

    def test_anonymous_request_rejected(self, mini_move_package):
        """Anonymous user should get 401/403."""
        client = APIClient()
        response = client.post('/api/customer/bookings/create-payment-intent/', {
            'service_type': 'mini_move',
            'mini_move_package_id': str(mini_move_package.id),
            'pickup_date': _next_weekday().isoformat(),
            'pickup_time': 'morning',
        }, format='json')
        assert response.status_code in (401, 403)

    @patch('stripe.PaymentIntent.create')
    def test_authenticated_request_allowed(
        self, mock_stripe, mini_move_package, customer_user
    ):
        """Authenticated customer should be allowed."""
        mock_stripe.return_value = MagicMock(
            id='pi_auth_test', client_secret='cs_test',
        )
        client = APIClient()
        client.force_authenticate(user=customer_user)
        response = client.post('/api/customer/bookings/create-payment-intent/', {
            'service_type': 'mini_move',
            'mini_move_package_id': str(mini_move_package.id),
            'pickup_date': _next_weekday().isoformat(),
            'pickup_time': 'morning',
        }, format='json')
        # May succeed or fail on serializer validation, but NOT 401/403
        assert response.status_code not in (401, 403)


# ============================================================
# R10: Payment/Refund views require IsStaffMember
# ============================================================

@pytest.mark.django_db
class TestStaffOnlyPaymentViews:
    """R10: Payment/Refund list/create views require staff permission."""

    def test_customer_cannot_list_payments(self, customer_user):
        client = APIClient()
        client.force_authenticate(user=customer_user)
        response = client.get('/api/payments/payments/')
        assert response.status_code == 403

    def test_customer_cannot_list_refunds(self, customer_user):
        client = APIClient()
        client.force_authenticate(user=customer_user)
        response = client.get('/api/payments/refunds/')
        assert response.status_code == 403

    def test_customer_cannot_create_refund(self, customer_user):
        client = APIClient()
        client.force_authenticate(user=customer_user)
        response = client.post('/api/payments/refunds/create/', {
            'payment_id': '00000000-0000-0000-0000-000000000000',
            'amount_cents': 100,
            'reason': 'test',
        }, format='json')
        assert response.status_code == 403

    def test_anonymous_cannot_list_payments(self):
        client = APIClient()
        response = client.get('/api/payments/payments/')
        assert response.status_code in (401, 403)

    def test_staff_can_list_payments(self, staff_user):
        client = APIClient()
        client.force_authenticate(user=staff_user)
        response = client.get('/api/payments/payments/')
        assert response.status_code == 200

    def test_staff_can_list_refunds(self, staff_user):
        client = APIClient()
        client.force_authenticate(user=staff_user)
        response = client.get('/api/payments/refunds/')
        assert response.status_code == 200


# ============================================================
# R11: Discount code enumeration — uniform 400 responses
# ============================================================

@pytest.mark.django_db
class TestDiscountCodeEnumeration:
    """R11: Non-existent and invalid codes must return the same HTTP status."""

    def test_nonexistent_code_returns_400(self):
        """Non-existent code should return 400, not 404."""
        client = APIClient()
        response = client.post('/api/public/validate-discount/', {
            'code': 'DOESNOTEXIST',
            'email': 'test@test.com',
        }, format='json')
        assert response.status_code == 400

    def test_expired_code_returns_400(self):
        """Expired code should also return 400."""
        DiscountCode.objects.create(
            code='EXPIRED_TEST',
            discount_type='percentage',
            discount_value=10,
            valid_until=timezone.now() - timedelta(days=1),
            is_active=True,
        )
        client = APIClient()
        response = client.post('/api/public/validate-discount/', {
            'code': 'EXPIRED_TEST',
            'email': 'test@test.com',
        }, format='json')
        assert response.status_code == 400

    def test_same_status_for_nonexistent_and_expired(self):
        """Both should return the exact same status code (400)."""
        DiscountCode.objects.create(
            code='REALCODE',
            discount_type='percentage',
            discount_value=10,
            valid_until=timezone.now() - timedelta(days=1),
            is_active=True,
        )
        client = APIClient()

        resp_fake = client.post('/api/public/validate-discount/', {
            'code': 'FAKECODE', 'email': 'test@test.com',
        }, format='json')
        resp_expired = client.post('/api/public/validate-discount/', {
            'code': 'REALCODE', 'email': 'test@test.com',
        }, format='json')

        assert resp_fake.status_code == resp_expired.status_code == 400
