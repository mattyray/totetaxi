# backend/apps/payments/tests/test_stripe.py
import pytest
from unittest.mock import patch, Mock
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from apps.customers.models import CustomerProfile
from apps.payments.models import Payment
from apps.bookings.models import Booking, Address, GuestCheckout
from apps.services.models import MiniMovePackage
from django.utils import timezone
from datetime import timedelta


@pytest.fixture
def test_booking(db):
    """Create test booking"""
    pickup = Address.objects.create(
        address_line_1='123 Test St',
        city='New York',
        state='NY',
        zip_code='10001'
    )
    delivery = Address.objects.create(
        address_line_1='456 Test Ave',
        city='New York',
        state='NY',
        zip_code='10002'
    )
    
    package, _ = MiniMovePackage.objects.get_or_create(
        package_type='petite',
        defaults={
            'name': 'Petite',
            'base_price_cents': 99500,
            'max_items': 15,
            'is_active': True
        }
    )
    
    guest = GuestCheckout.objects.create(
        first_name='Test',
        last_name='User',
        email='test@example.com',
        phone='5551234567'
    )
    
    booking = Booking.objects.create(
        guest_checkout=guest,
        service_type='mini_move',
        mini_move_package=package,
        pickup_address=pickup,
        delivery_address=delivery,
        pickup_date=timezone.now().date() + timedelta(days=2),
        status='pending'
    )
    
    return booking


@pytest.mark.django_db
class TestPaymentIntents:
    """Test payment intent creation"""
    
    @patch('stripe.PaymentIntent.create')
    def test_create_payment_intent_guest(self, mock_stripe):
        """Test creating payment intent for guest booking"""
        client = APIClient()
        
        # Get or create package
        package, _ = MiniMovePackage.objects.get_or_create(
            package_type='petite',
            defaults={
                'name': 'Petite',
                'base_price_cents': 99500,
                'max_items': 15,
                'is_active': True
            }
        )
        
        mock_stripe.return_value = Mock(
            id='pi_test_123',
            client_secret='pi_test_123_secret',
            amount=99500
        )
        
        response = client.post('/api/public/create-payment-intent/', {
            'service_type': 'mini_move',
            'mini_move_package_id': str(package.id),
            'pickup_date': (timezone.now().date() + timedelta(days=2)).isoformat(),
            'first_name': 'Guest',
            'last_name': 'User',
            'email': 'guest@example.com',
            'phone': '5559876543'
        })
        
        assert response.status_code == 200
        assert 'client_secret' in response.data
        assert 'payment_intent_id' in response.data
        
        mock_stripe.assert_called_once()


# backend/apps/payments/tests/test_stripe.py

@pytest.mark.django_db
class TestStripeWebhooks:
    """Test Stripe webhook handling"""
    
    @patch('stripe.Webhook.construct_event')
    @patch('apps.bookings.signals.booking_status_changed.send')  # ← CHANGED: Mock the signal instead
    def test_payment_succeeded_webhook(self, mock_signal, mock_construct, test_booking):
        """Test handling payment_intent.succeeded webhook"""
        client = APIClient()
        
        # Create payment record
        payment = Payment.objects.create(
            booking=test_booking,
            stripe_payment_intent_id='pi_test_123',
            amount_cents=99500,
            status='processing'
        )
        
        # Mock webhook event
        mock_construct.return_value = {
            'id': 'evt_test_123',
            'type': 'payment_intent.succeeded',
            'data': {
                'object': {
                    'id': 'pi_test_123',
                    'latest_charge': 'ch_test_456',
                    'amount': 99500
                }
            }
        }
        
        response = client.post('/api/payments/webhook/', 
            data={},
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='test_signature'
        )
        
        assert response.status_code == 200
        
        # Verify payment updated
        payment.refresh_from_db()
        assert payment.status == 'succeeded'
        
        # Verify booking updated
        test_booking.refresh_from_db()
        assert test_booking.status == 'paid'