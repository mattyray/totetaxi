# backend/apps/accounts/tests/test_staff_booking_create.py
"""
Tests for staff-created bookings:
- Staff can create bookings on behalf of customers
- Payment link (Stripe Checkout Session) is generated and emailed
- Resend payment link works for pending bookings
- Non-staff users cannot access these endpoints
- Custom price override works correctly
"""
import pytest
from unittest.mock import patch, Mock, MagicMock
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from datetime import date, timedelta

from apps.accounts.models import StaffProfile
from apps.bookings.models import Booking, Address, GuestCheckout
from apps.payments.models import Payment
from apps.services.models import MiniMovePackage


@pytest.fixture
def staff_user(db):
    user = User.objects.create_user(
        username='staffuser', email='staff@totetaxi.com', password='testpass',
        first_name='Staff', last_name='Member',
    )
    StaffProfile.objects.create(user=user, role='staff', phone='5550000001')
    return user


@pytest.fixture
def staff_client(staff_user):
    client = APIClient()
    client.force_authenticate(user=staff_user)
    return client


@pytest.fixture
def customer_user(db):
    user = User.objects.create_user(
        username='custuser', email='cust@example.com', password='testpass',
    )
    return user


@pytest.fixture
def mini_move_package(db):
    return MiniMovePackage.objects.create(
        package_type='petite',
        name='Petite Move',
        description='Test package',
        base_price_cents=99500,
        max_items=15,
        max_weight_per_item_lbs=50,
        is_active=True,
    )


def _booking_payload(mini_move_package, **overrides):
    """Build a valid staff booking creation payload."""
    pickup_date = (date.today() + timedelta(days=7)).isoformat()
    data = {
        'first_name': 'Jane',
        'last_name': 'Doe',
        'email': 'jane@example.com',
        'phone': '5551234567',
        'service_type': 'mini_move',
        'mini_move_package_id': str(mini_move_package.id),
        'pickup_date': pickup_date,
        'pickup_time': 'morning',
        'pickup_address': {
            'address_line_1': '123 Main St',
            'city': 'New York',
            'state': 'NY',
            'zip_code': '10001',
        },
        'delivery_address': {
            'address_line_1': '456 Park Ave',
            'city': 'New York',
            'state': 'NY',
            'zip_code': '10002',
        },
    }
    data.update(overrides)
    return data


# ============================================================
# Staff Booking Create Endpoint
# ============================================================

@pytest.mark.django_db
class TestStaffBookingCreate:

    @patch('apps.customers.emails.send_payment_link_email', return_value=True)
    @patch('apps.payments.services.StripePaymentService.create_checkout_session')
    def test_create_booking_success(self, mock_checkout, mock_email, staff_client, mini_move_package):
        """Staff can create a booking and get a checkout URL back."""
        mock_checkout.return_value = {
            'checkout_url': 'https://checkout.stripe.com/test',
            'checkout_session_id': 'cs_test_123',
            'payment_intent_id': 'pi_test_123',
            'payment': Mock(id='pay-uuid'),
        }

        response = staff_client.post(
            '/api/staff/bookings/create/',
            _booking_payload(mini_move_package),
            format='json',
        )

        assert response.status_code == 201, response.data
        assert 'booking' in response.data
        assert response.data['booking']['checkout_url'] == 'https://checkout.stripe.com/test'
        assert response.data['booking']['customer_email'] == 'jane@example.com'

        # Verify booking was created
        booking = Booking.objects.get(booking_number=response.data['booking']['booking_number'])
        assert booking.status == 'pending'
        assert booking.created_by_staff is not None

        # Verify guest checkout was created
        assert GuestCheckout.objects.filter(booking=booking).exists()

        # Verify email was sent
        mock_email.assert_called_once()

    @patch('apps.customers.emails.send_payment_link_email', return_value=True)
    @patch('apps.payments.services.StripePaymentService.create_checkout_session')
    def test_create_booking_with_custom_price(self, mock_checkout, mock_email, staff_client, mini_move_package):
        """Staff can override the auto-calculated price."""
        mock_checkout.return_value = {
            'checkout_url': 'https://checkout.stripe.com/test',
            'checkout_session_id': 'cs_test_456',
            'payment_intent_id': 'pi_test_456',
            'payment': Mock(id='pay-uuid-2'),
        }

        payload = _booking_payload(
            mini_move_package,
            custom_total_override_cents=50000,  # $500 override
        )
        response = staff_client.post(
            '/api/staff/bookings/create/',
            payload,
            format='json',
        )

        assert response.status_code == 201, response.data
        booking = Booking.objects.get(booking_number=response.data['booking']['booking_number'])
        assert booking.custom_total_override_cents == 50000
        assert booking.total_price_cents == 50000

    def test_create_booking_unauthenticated(self, db, mini_move_package):
        """Unauthenticated users cannot create staff bookings."""
        client = APIClient()
        response = client.post(
            '/api/staff/bookings/create/',
            _booking_payload(mini_move_package),
            format='json',
        )
        assert response.status_code in (401, 403)

    def test_create_booking_non_staff(self, customer_user, mini_move_package):
        """Non-staff authenticated users cannot create staff bookings."""
        client = APIClient()
        client.force_authenticate(user=customer_user)
        response = client.post(
            '/api/staff/bookings/create/',
            _booking_payload(mini_move_package),
            format='json',
        )
        assert response.status_code == 403

    @patch('apps.customers.emails.send_payment_link_email', return_value=True)
    @patch('apps.payments.services.StripePaymentService.create_checkout_session')
    def test_create_booking_missing_required_fields(self, mock_checkout, mock_email, staff_client, mini_move_package):
        """Missing required fields should return 400."""
        response = staff_client.post(
            '/api/staff/bookings/create/',
            {'service_type': 'mini_move'},  # missing everything else
            format='json',
        )
        assert response.status_code == 400

    @patch('apps.customers.emails.send_payment_link_email', return_value=True)
    @patch('apps.payments.services.StripePaymentService.create_checkout_session')
    def test_create_booking_invalid_service_type(self, mock_checkout, mock_email, staff_client, mini_move_package):
        """Invalid service type should return 400."""
        payload = _booking_payload(mini_move_package, service_type='invalid_service')
        response = staff_client.post(
            '/api/staff/bookings/create/',
            payload,
            format='json',
        )
        assert response.status_code == 400


# ============================================================
# Resend Payment Link Endpoint
# ============================================================

@pytest.mark.django_db
class TestStaffResendPaymentLink:

    @pytest.fixture
    def pending_staff_booking(self, staff_user, mini_move_package):
        """Create a pending booking that was staff-created."""
        pickup = Address.objects.create(
            address_line_1='123 Main St', city='New York', state='NY', zip_code='10001',
        )
        delivery = Address.objects.create(
            address_line_1='456 Park Ave', city='New York', state='NY', zip_code='10002',
        )
        gc = GuestCheckout.objects.create(
            first_name='Jane',
            last_name='Doe',
            email='jane@example.com',
            phone='5551234567',
        )
        booking = Booking.objects.create(
            service_type='mini_move',
            mini_move_package=mini_move_package,
            pickup_date=date.today() + timedelta(days=7),
            pickup_time='morning',
            pickup_address=pickup,
            delivery_address=delivery,
            guest_checkout=gc,
            status='pending',
            created_by_staff=staff_user,
        )
        return booking

    @patch('apps.accounts.views.send_payment_link_email', return_value=True)
    @patch('apps.payments.services.StripePaymentService.create_checkout_session')
    def test_resend_payment_link_success(self, mock_checkout, mock_email, staff_client, pending_staff_booking):
        """Staff can resend payment link for pending bookings."""
        mock_checkout.return_value = {
            'checkout_url': 'https://checkout.stripe.com/new',
            'checkout_session_id': 'cs_test_new',
            'payment_intent_id': 'pi_test_new',
            'payment': Mock(id='pay-uuid-new'),
        }

        response = staff_client.post(
            f'/api/staff/bookings/{pending_staff_booking.id}/resend-payment-link/',
            format='json',
        )

        assert response.status_code == 200, response.data
        assert response.data['checkout_url'] == 'https://checkout.stripe.com/new'
        mock_email.assert_called_once()

    def test_resend_payment_link_non_pending_booking(self, staff_client, pending_staff_booking):
        """Cannot resend payment link for non-pending bookings."""
        pending_staff_booking.status = 'paid'
        pending_staff_booking.save(_skip_pricing=True)

        response = staff_client.post(
            f'/api/staff/bookings/{pending_staff_booking.id}/resend-payment-link/',
            format='json',
        )

        assert response.status_code == 400

    def test_resend_payment_link_unauthenticated(self, db, pending_staff_booking):
        """Unauthenticated users cannot resend payment links."""
        client = APIClient()
        response = client.post(
            f'/api/staff/bookings/{pending_staff_booking.id}/resend-payment-link/',
            format='json',
        )
        assert response.status_code in (401, 403)

    @patch('apps.customers.emails.send_payment_link_email', return_value=True)
    @patch('apps.payments.services.StripePaymentService.create_checkout_session')
    def test_resend_invalidates_old_payments(self, mock_checkout, mock_email, staff_client, pending_staff_booking):
        """Resending should mark old Payment records as failed."""
        # Create an existing pending payment
        old_payment = Payment.objects.create(
            booking=pending_staff_booking,
            stripe_payment_intent_id='pi_old',
            amount_cents=pending_staff_booking.total_price_cents,
            status='pending',
        )

        mock_checkout.return_value = {
            'checkout_url': 'https://checkout.stripe.com/new',
            'checkout_session_id': 'cs_test_new',
            'payment_intent_id': 'pi_test_new',
            'payment': Mock(id='pay-uuid-new'),
        }

        response = staff_client.post(
            f'/api/staff/bookings/{pending_staff_booking.id}/resend-payment-link/',
            format='json',
        )

        assert response.status_code == 200
        old_payment.refresh_from_db()
        assert old_payment.status == 'failed'
        assert old_payment.failure_reason == 'Superseded by new payment link'


# ============================================================
# Booking Detail: Staff-created fields
# ============================================================

@pytest.mark.django_db
class TestBookingDetailStaffFields:

    @pytest.fixture
    def staff_booking_with_detail(self, staff_user, mini_move_package):
        pickup = Address.objects.create(
            address_line_1='123 Main St', city='New York', state='NY', zip_code='10001',
        )
        delivery = Address.objects.create(
            address_line_1='456 Park Ave', city='New York', state='NY', zip_code='10002',
        )
        gc = GuestCheckout.objects.create(
            first_name='Jane', last_name='Doe',
            email='jane@example.com', phone='5551234567',
        )
        booking = Booking.objects.create(
            service_type='mini_move',
            mini_move_package=mini_move_package,
            pickup_date=date.today() + timedelta(days=7),
            pickup_time='morning',
            pickup_address=pickup,
            delivery_address=delivery,
            guest_checkout=gc,
            status='pending',
            created_by_staff=staff_user,
        )
        return booking

    def test_detail_includes_staff_created_fields(self, staff_client, staff_booking_with_detail):
        """Booking detail response should include is_staff_created and created_by_staff_name."""
        response = staff_client.get(
            f'/api/staff/bookings/{staff_booking_with_detail.id}/',
        )

        assert response.status_code == 200
        booking_data = response.data.get('booking', response.data)
        assert booking_data.get('is_staff_created') is True
        assert booking_data.get('created_by_staff_name') == 'Staff Member'
