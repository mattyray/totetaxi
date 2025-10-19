# backend/apps/bookings/tests/test_booking_api.py
import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from apps.customers.models import CustomerProfile
from apps.bookings.models import Booking, Address, GuestCheckout
from apps.services.models import MiniMovePackage
from django.utils import timezone
from datetime import timedelta
from unittest.mock import patch, Mock


@pytest.fixture
def authenticated_client(db):
    """Create authenticated API client"""
    user = User.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123',
        is_active=True
    )
    CustomerProfile.objects.create(user=user, phone='5551234567')
    
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user


@pytest.fixture
def addresses(db):
    """Create test addresses"""
    pickup = Address.objects.create(
        address_line_1='123 Pickup St',
        city='New York',
        state='NY',
        zip_code='10001'
    )
    delivery = Address.objects.create(
        address_line_1='456 Delivery Ave',
        city='New York',
        state='NY',
        zip_code='10002'
    )
    return pickup, delivery


@pytest.fixture
def mini_move_package(db):
    """Create test mini move package"""
    return MiniMovePackage.objects.create(
        package_type='petite',
        name='Petite',
        description='Test package',
        base_price_cents=99500,
        max_items=15,
        max_weight_per_item_lbs=50,
        is_active=True
    )


# backend/apps/bookings/tests/test_booking_api.py

@pytest.mark.django_db
class TestBookingCreation:
    """Test booking creation"""
    
    @patch('stripe.PaymentIntent.retrieve')
    def test_create_booking_authenticated(self, mock_retrieve, authenticated_client, addresses, mini_move_package):
        """Test creating booking as authenticated user"""
        client, user = authenticated_client
        pickup, delivery = addresses
        
        # ✅ Mock Stripe payment verification
        mock_retrieve.return_value = Mock(
            id='pi_test_123',
            status='succeeded',
            amount=99500,
            get=lambda x, default='': 'ch_test_789' if x == 'latest_charge' else default
        )
        
        response = client.post('/api/customer/bookings/create/', {
            'payment_intent_id': 'pi_test_123',
            'service_type': 'mini_move',
            'mini_move_package_id': str(mini_move_package.id),
            'new_pickup_address': {  # ✅ Changed from pickup_address
                'address_line_1': pickup.address_line_1,
                'city': pickup.city,
                'state': pickup.state,
                'zip_code': pickup.zip_code
            },
            'new_delivery_address': {  # ✅ Changed from delivery_address
                'address_line_1': delivery.address_line_1,
                'city': delivery.city,
                'state': delivery.state,
                'zip_code': delivery.zip_code
            },
            'pickup_date': (timezone.now().date() + timedelta(days=2)).isoformat(),
            'pickup_time': 'morning'
        }, format='json')  # ✅ Added format='json'
        
        assert response.status_code == 201
        assert 'booking' in response.data
        
        # Verify booking was created
        booking = Booking.objects.get(customer=user)
        assert booking.status == 'paid'
    
    @patch('stripe.PaymentIntent.retrieve')
    def test_create_booking_guest(self, mock_retrieve, addresses, mini_move_package):
        """Test creating booking as guest"""
        client = APIClient()
        pickup, delivery = addresses
        
        # ✅ Mock Stripe payment verification
        mock_retrieve.return_value = Mock(
            id='pi_test_456',
            status='succeeded',
            amount=99500,
            get=lambda x, default='': 'ch_test_123' if x == 'latest_charge' else default
        )
        
        response = client.post('/api/public/guest-booking/', {  # ✅ Fixed endpoint
            'payment_intent_id': 'pi_test_456',
            'first_name': 'Guest',
            'last_name': 'User',
            'email': 'guest@example.com',
            'phone': '5559876543',
            'service_type': 'mini_move',
            'mini_move_package_id': str(mini_move_package.id),
            'pickup_address': {  # ✅ Already correct for guest
                'address_line_1': pickup.address_line_1,
                'city': pickup.city,
                'state': pickup.state,
                'zip_code': pickup.zip_code
            },
            'delivery_address': {  # ✅ Already correct for guest
                'address_line_1': delivery.address_line_1,
                'city': delivery.city,
                'state': delivery.state,
                'zip_code': delivery.zip_code
            },
            'pickup_date': (timezone.now().date() + timedelta(days=2)).isoformat(),
            'pickup_time': 'morning'
        }, format='json')  # ✅ Added format='json'
        
        assert response.status_code == 201
        
        # Verify guest checkout was created
        booking = Booking.objects.get(booking_number=response.data['booking']['booking_number'])
        assert booking.guest_checkout is not None
        assert booking.guest_checkout.email == 'guest@example.com'
    
@pytest.mark.django_db
class TestBookingRetrieval:
    """Test booking retrieval"""
    
    def test_get_customer_bookings(self, authenticated_client, addresses, mini_move_package):
        """Test getting customer's bookings"""
        client, user = authenticated_client
        pickup, delivery = addresses
        
        # Create a booking
        Booking.objects.create(
            customer=user,
            service_type='mini_move',
            mini_move_package=mini_move_package,
            pickup_address=pickup,
            delivery_address=delivery,
            pickup_date=timezone.now().date() + timedelta(days=1),
            status='confirmed'
        )
        
        response = client.get('/api/customer/bookings/')
        
        assert response.status_code == 200
        assert len(response.data['bookings']) == 1
    
    def test_cannot_see_other_customer_bookings(self, authenticated_client, addresses):
        """Test customer cannot see another customer's bookings"""
        client, user = authenticated_client
        pickup, delivery = addresses
        
        # Create another user with booking
        other_user = User.objects.create_user(
            username='other',
            email='other@example.com',
            password='testpass123'
        )
        CustomerProfile.objects.create(user=other_user, phone='5559999999')
        
        Booking.objects.create(
            customer=other_user,
            service_type='mini_move',
            pickup_address=pickup,
            delivery_address=delivery,
            pickup_date=timezone.now().date() + timedelta(days=1),
            status='confirmed'
        )
        
        response = client.get('/api/customer/bookings/')
        
        assert response.status_code == 200
        assert len(response.data['bookings']) == 0