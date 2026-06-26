# backend/apps/bookings/tests/test_orphan_recovery_paths.py
"""Exhaustive orphaned-payment auto-recovery coverage across EVERY booking path:
guest x {mini_move, standard_delivery, specialty_item, blade_transfer},
authenticated customer, free orders (no capture), and discounted orders
(amount integrity). Each path: capture at PI-creation -> orphan -> reconcile.
"""
import pytest
from datetime import timedelta
from unittest.mock import patch, Mock

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APIClient

from apps.bookings.models import Booking, PendingBooking, DiscountCode
from apps.payments.models import Payment, PaymentAudit
from apps.payments.tasks import reconcile_pending_payments
from apps.services.models import (
    MiniMovePackage, StandardDeliveryConfig, SpecialtyItem,
)
from apps.customers.models import CustomerProfile

PICKUP = (timezone.now().date() + timedelta(days=7)).isoformat()
ADDR_P = {'address_line_1': '1 A St', 'city': 'New York', 'state': 'NY', 'zip_code': '10001'}
ADDR_D = {'address_line_1': '2 B Ave', 'city': 'New York', 'state': 'NY', 'zip_code': '10002'}


@pytest.fixture
def services(db):
    pkg, _ = MiniMovePackage.objects.get_or_create(
        package_type='petite',
        defaults={'name': 'Petite', 'description': 'x', 'base_price_cents': 99500,
                  'max_items': 15, 'max_weight_per_item_lbs': 50, 'coi_fee_cents': 5000,
                  'is_active': True})
    peloton, _ = SpecialtyItem.objects.get_or_create(
        item_type='peloton',
        defaults={'name': 'Peloton', 'price_cents': 50000, 'is_active': True})
    StandardDeliveryConfig.objects.get_or_create(
        is_active=True,
        defaults={'price_per_item_cents': 9500, 'minimum_charge_cents': 28500,
                  'same_day_flat_rate_cents': 36000})
    return {'package': pkg, 'peloton': peloton}


def _contact():
    return {'first_name': 'Path', 'last_name': 'Tester',
            'email': 'path@example.com', 'phone': '5551112222'}


def guest_service_fields(service, services):
    """(top-level pricing fields, booking_payload extras) for a guest service."""
    if service == 'mini_move':
        spec = {'mini_move_package_id': str(services['package'].id)}
    elif service == 'standard_delivery':
        spec = {'standard_delivery_item_count': 2, 'item_description': 'Two boxes'}
    elif service == 'specialty_item':
        spec = {'specialty_items': [{'item_id': str(services['peloton'].id), 'quantity': 1}]}
    elif service == 'blade_transfer':
        spec = {'blade_airport': 'JFK', 'blade_flight_date': PICKUP,
                'blade_flight_time': '14:00', 'blade_bag_count': 3,
                'transfer_direction': 'to_airport'}
    else:
        raise ValueError(service)
    return spec


def make_guest_pi(client, service, services, *, cart_key='', pi_id='pi_x',
                  email='path@example.com'):
    spec = guest_service_fields(service, services)
    contact = {**_contact(), 'email': email}
    top = {
        'service_type': service, 'pickup_date': PICKUP,
        'pickup_zip_code': '10001', 'delivery_zip_code': '10002',
        **contact, **spec,
    }
    booking_payload = {
        'service_type': service, 'pickup_date': PICKUP, 'pickup_time': 'morning',
        'pickup_address': ADDR_P, 'delivery_address': ADDR_D,
        **contact, **spec,
    }
    with patch('stripe.PaymentIntent.create') as mock_create:
        mock_create.return_value = Mock(id=pi_id, client_secret=f'{pi_id}_s',
                                        status='requires_payment_method')
        resp = client.post('/api/public/create-payment-intent/',
                           {**top, 'cart_key': cart_key, 'booking_payload': booking_payload},
                           format='json')
    return resp


def orphan(pi_id, minutes=10):
    """Simulate: charge succeeded (webhook ran) but booking POST never landed."""
    Payment.objects.filter(stripe_payment_intent_id=pi_id).update(status='succeeded')
    PendingBooking.objects.filter(stripe_payment_intent_id=pi_id).update(
        created_at=timezone.now() - timedelta(minutes=minutes))


@pytest.mark.django_db
@pytest.mark.parametrize('service', [
    'mini_move', 'standard_delivery', 'specialty_item', 'blade_transfer',
])
class TestGuestRecoveryAllServices:
    def test_capture_and_recovery(self, service, services):
        resp = make_guest_pi(APIClient(), service, services, pi_id=f'pi_{service}',
                             cart_key=f'cart-{service}')
        assert resp.status_code == 200, resp.data

        pending = PendingBooking.objects.get(stripe_payment_intent_id=f'pi_{service}')
        assert pending.status == 'pending'
        assert pending.payload['service_type'] == service
        charged_amount = pending.amount_cents
        assert charged_amount > 0

        orphan(f'pi_{service}')
        result = reconcile_pending_payments()
        assert result['recovered'] == 1, result

        pending.refresh_from_db()
        assert pending.status == 'materialized'
        booking = pending.booking
        assert booking is not None
        assert booking.service_type == service
        assert booking.status == 'paid'
        # C1: the recovered booking's total equals exactly what was charged
        assert booking.total_price_cents == charged_amount
        payment = Payment.objects.get(stripe_payment_intent_id=f'pi_{service}')
        assert payment.booking_id == booking.id


def authed_client():
    import uuid as _u
    uname = f'authpath_{_u.uuid4().hex[:8]}@example.com'
    user = User.objects.create_user(
        username=uname, email=uname, password='x',
        first_name='Auth', last_name='Path', is_active=True)
    CustomerProfile.objects.create(user=user, phone='5559998888')
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user


def make_auth_pi(client, user, service, services, *, cart_key='', pi_id='pi_a'):
    spec = guest_service_fields(service, services)
    top = {
        'service_type': service, 'pickup_date': PICKUP,
        'customer_email': user.email,
        'pickup_zip_code': '10001', 'delivery_zip_code': '10002',
        **spec,
    }
    booking_payload = {
        'service_type': service, 'pickup_date': PICKUP, 'pickup_time': 'morning',
        'new_pickup_address': ADDR_P, 'new_delivery_address': ADDR_D,
        'save_pickup_address': True, 'save_delivery_address': True,
        'pickup_address_nickname': 'P', 'delivery_address_nickname': 'D',
        **spec,
    }
    with patch('stripe.PaymentIntent.create') as mock_create:
        mock_create.return_value = Mock(id=pi_id, client_secret='s',
                                        status='requires_payment_method')
        resp = client.post('/api/customer/bookings/create-payment-intent/',
                           {**top, 'cart_key': cart_key, 'booking_payload': booking_payload},
                           format='json')
    return resp


@pytest.mark.django_db
@pytest.mark.parametrize('service', [
    'mini_move', 'standard_delivery', 'specialty_item', 'blade_transfer',
])
class TestAuthenticatedRecoveryAllServices:
    def test_capture_and_recovery(self, service, services):
        client, user = authed_client()
        resp = make_auth_pi(client, user, service, services,
                            pi_id=f'pi_auth_{service}', cart_key=f'cart-auth-{service}')
        assert resp.status_code == 200, resp.data

        pending = PendingBooking.objects.get(stripe_payment_intent_id=f'pi_auth_{service}')
        assert pending.is_authenticated is True
        assert pending.customer_id == user.id
        charged = pending.amount_cents

        orphan(f'pi_auth_{service}')
        result = reconcile_pending_payments()
        assert result['recovered'] == 1, result

        booking = PendingBooking.objects.get(stripe_payment_intent_id=f'pi_auth_{service}').booking
        assert booking is not None
        assert booking.customer_id == user.id
        assert booking.service_type == service
        assert booking.status == 'paid'
        assert booking.total_price_cents == charged


@pytest.mark.django_db
class TestAuthenticatedHappyPath:
    @patch('stripe.PaymentIntent.retrieve')
    def test_happy_path_marks_materialized(self, mock_retrieve, services):
        client, user = authed_client()
        make_auth_pi(client, user, 'mini_move', services, pi_id='pi_auth_hp')
        charged = PendingBooking.objects.get(stripe_payment_intent_id='pi_auth_hp').amount_cents
        mock_retrieve.return_value = Mock(id='pi_auth_hp', status='succeeded',
                                          amount=charged, latest_charge='ch')
        resp = client.post('/api/customer/bookings/create/', {
            'payment_intent_id': 'pi_auth_hp', 'service_type': 'mini_move',
            'mini_move_package_id': str(services['package'].id),
            'pickup_date': PICKUP, 'pickup_time': 'morning',
            'new_pickup_address': ADDR_P, 'new_delivery_address': ADDR_D,
        }, format='json')
        assert resp.status_code == 201, resp.data
        pending = PendingBooking.objects.get(stripe_payment_intent_id='pi_auth_hp')
        assert pending.status == 'materialized'
        orphan('pi_auth_hp')
        assert reconcile_pending_payments()['recovered'] == 0


@pytest.mark.django_db
class TestFreeOrder:
    def test_free_order_is_not_captured_and_happy_path_works(self, services):
        """100% discount → free_order_* PI, no charge, no Payment, no PendingBooking.
        Nothing to recover; the normal create still produces a $0 booking."""
        DiscountCode.objects.create(
            code='FREE100', discount_type='percentage', discount_value=100,
            max_uses=100, max_uses_per_customer=10)
        client = APIClient()
        pkg_id = str(services['package'].id)
        contact = _contact()
        resp = client.post('/api/public/create-payment-intent/', {
            'service_type': 'mini_move', 'mini_move_package_id': pkg_id,
            'pickup_date': PICKUP, 'discount_code': 'FREE100',
            'pickup_zip_code': '10001', 'delivery_zip_code': '10002', **contact,
        }, format='json')
        assert resp.status_code == 200, resp.data
        free_id = resp.data['payment_intent_id']
        assert free_id.startswith('free_order_')
        # No charge → nothing captured for recovery.
        assert not PendingBooking.objects.filter(stripe_payment_intent_id=free_id).exists()
        assert not Payment.objects.filter(stripe_payment_intent_id=free_id).exists()

        # Happy path: the $0 booking still completes normally.
        booking_resp = client.post('/api/public/guest-booking/', {
            'payment_intent_id': free_id, 'service_type': 'mini_move',
            'mini_move_package_id': pkg_id, 'pickup_date': PICKUP,
            'pickup_time': 'morning', 'discount_code': 'FREE100',
            'pickup_address': ADDR_P, 'delivery_address': ADDR_D, **contact,
        }, format='json')
        assert booking_resp.status_code == 201, booking_resp.data
        booking = Booking.objects.get(
            booking_number=booking_resp.data['booking']['booking_number'])
        assert booking.total_price_cents == 0
        # Reconcile has nothing to do.
        assert reconcile_pending_payments()['recovered'] == 0


@pytest.mark.django_db
class TestDiscountAmountIntegrity:
    def test_partial_discount_recovers_with_matching_amount(self, services):
        """A discounted order: the captured amount is the discounted total, and the
        recovered booking's total matches it (no double discount, C1 holds)."""
        DiscountCode.objects.create(
            code='HALF', discount_type='percentage', discount_value=50,
            max_uses=100, max_uses_per_customer=10)
        client = APIClient()
        pkg_id = str(services['package'].id)
        contact = _contact()
        top = {
            'service_type': 'mini_move', 'mini_move_package_id': pkg_id,
            'pickup_date': PICKUP, 'discount_code': 'HALF',
            'pickup_zip_code': '10001', 'delivery_zip_code': '10002', **contact,
        }
        booking_payload = {
            'service_type': 'mini_move', 'mini_move_package_id': pkg_id,
            'pickup_date': PICKUP, 'pickup_time': 'morning', 'discount_code': 'HALF',
            'pickup_address': ADDR_P, 'delivery_address': ADDR_D, **contact,
        }
        with patch('stripe.PaymentIntent.create') as mock_create:
            mock_create.return_value = Mock(id='pi_disc_1', client_secret='s',
                                            status='requires_payment_method')
            resp = client.post('/api/public/create-payment-intent/',
                               {**top, 'cart_key': 'cart-disc', 'booking_payload': booking_payload},
                               format='json')
        assert resp.status_code == 200, resp.data
        pending = PendingBooking.objects.get(stripe_payment_intent_id='pi_disc_1')
        # discounted total should be roughly half of base (99500) — definitely < base
        assert pending.amount_cents < 99500

        orphan('pi_disc_1')
        result = reconcile_pending_payments()
        assert result['recovered'] == 1, result
        booking = PendingBooking.objects.get(stripe_payment_intent_id='pi_disc_1').booking
        assert booking.total_price_cents == pending.amount_cents
        assert booking.discount_code is not None


@pytest.mark.django_db
class TestHappyPathMaterializesAllServices:
    @pytest.mark.parametrize('service', [
        'standard_delivery', 'specialty_item', 'blade_transfer',
    ])
    @patch('stripe.PaymentIntent.retrieve')
    def test_happy_path_marks_materialized(self, mock_retrieve, service, services):
        client = APIClient()
        resp = make_guest_pi(client, service, services, pi_id=f'pi_hp_{service}')
        assert resp.status_code == 200, resp.data
        charged = PendingBooking.objects.get(
            stripe_payment_intent_id=f'pi_hp_{service}').amount_cents
        mock_retrieve.return_value = Mock(id=f'pi_hp_{service}', status='succeeded',
                                          amount=charged, latest_charge='ch')

        spec = guest_service_fields(service, services)
        booking_body = {
            'payment_intent_id': f'pi_hp_{service}', 'service_type': service,
            'pickup_date': PICKUP, 'pickup_time': 'morning',
            'pickup_address': ADDR_P, 'delivery_address': ADDR_D,
            **_contact(), **spec,
        }
        booking_resp = client.post('/api/public/guest-booking/', booking_body, format='json')
        assert booking_resp.status_code == 201, booking_resp.data

        pending = PendingBooking.objects.get(stripe_payment_intent_id=f'pi_hp_{service}')
        assert pending.status == 'materialized'
        # Recovery is a no-op now.
        orphan(f'pi_hp_{service}')
        assert reconcile_pending_payments()['recovered'] == 0
        assert Booking.objects.filter(service_type=service).count() == 1
