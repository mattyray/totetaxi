# backend/apps/bookings/tests/test_booking_flow.py
import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from apps.customers.models import CustomerProfile
from apps.bookings.models import Booking, Address, GuestCheckout
from apps.services.models import MiniMovePackage, StandardDeliveryConfig, SpecialtyItem, OrganizingService
from django.utils import timezone
from datetime import timedelta
from unittest.mock import patch, Mock


@pytest.fixture
def test_services(db):
    """Create or get test services"""
    # Mini Move Package
    package, _ = MiniMovePackage.objects.get_or_create(
        package_type='petite',
        defaults={
            'name': 'Petite',
            'description': 'Test package',
            'base_price_cents': 99500,
            'max_items': 15,
            'max_weight_per_item_lbs': 50,
            'coi_fee_cents': 5000,
            'is_active': True
        }
    )
    
    # Organizing Services
    packing, _ = OrganizingService.objects.get_or_create(
        service_type='petite_packing',
        defaults={
            'mini_move_tier': 'petite',
            'name': 'Petite Packing',
            'price_cents': 140000,
            'duration_hours': 4,
            'organizer_count': 2,
            'supplies_allowance_cents': 25000,
            'is_packing_service': True,
            'is_active': True
        }
    )
    
    # Specialty Item
    peloton, _ = SpecialtyItem.objects.get_or_create(
        item_type='peloton',
        defaults={
            'name': 'Peloton',
            'price_cents': 50000,
            'is_active': True
        }
    )
    
    # Standard Delivery Config
    config, _ = StandardDeliveryConfig.objects.get_or_create(
        is_active=True,
        defaults={
            'price_per_item_cents': 9500,
            'minimum_charge_cents': 28500,
            'same_day_flat_rate_cents': 36000
        }
    )
    
    return {
        'package': package,
        'packing': packing,
        'peloton': peloton,
        'config': config
    }


@pytest.fixture
def test_addresses(db):
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
def authenticated_customer(db):
    """Create authenticated customer"""
    user = User.objects.create_user(
        username='customer@example.com',
        email='customer@example.com',
        password='testpass123',
        first_name='Test',
        last_name='Customer',
        is_active=True
    )
    CustomerProfile.objects.create(user=user, phone='5551234567')
    
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user


@pytest.mark.django_db
class TestGuestBookingFlow:
    """Test complete guest booking flow with payment"""
    
    @patch('stripe.PaymentIntent.create')
    @patch('stripe.PaymentIntent.retrieve')
    def test_guest_booking_complete_flow(self, mock_retrieve, mock_create, test_services, test_addresses):
        """Test full guest booking: create payment intent → pay → create booking"""
        client = APIClient()
        pickup, delivery = test_addresses
        package = test_services['package']
        
        # Step 1: Create payment intent
        mock_create.return_value = Mock(
            id='pi_test_123',
            client_secret='pi_test_123_secret_456',
            amount=99500,
            status='requires_payment_method'
        )
        
        payment_response = client.post('/api/public/create-payment-intent/', {
            'service_type': 'mini_move',
            'mini_move_package_id': str(package.id),
            'pickup_date': (timezone.now().date() + timedelta(days=2)).isoformat(),
            'first_name': 'Guest',
            'last_name': 'User',
            'email': 'guest@example.com',
            'phone': '5559876543'
        }, format='json')
        
        assert payment_response.status_code == 200
        assert 'client_secret' in payment_response.data
        assert 'payment_intent_id' in payment_response.data
        
        # Step 2: Simulate payment success
        mock_retrieve.return_value = Mock(
            id='pi_test_123',
            status='succeeded',
            amount=99500
        )
        
        # Step 3: Create booking with payment_intent_id
        booking_response = client.post('/api/public/guest-booking/', {
            'payment_intent_id': 'pi_test_123',
            'service_type': 'mini_move',
            'mini_move_package_id': str(package.id),
            'first_name': 'Guest',
            'last_name': 'User',
            'email': 'guest@example.com',
            'phone': '5559876543',
            'pickup_date': (timezone.now().date() + timedelta(days=2)).isoformat(),
            'pickup_time': 'morning',
            'pickup_address': {
                'address_line_1': '123 Pickup St',
                'city': 'New York',
                'state': 'NY',
                'zip_code': '10001'
            },
            'delivery_address': {
                'address_line_1': '456 Delivery Ave',
                'city': 'New York',
                'state': 'NY',
                'zip_code': '10002'
            }
        }, format='json')
        
        assert booking_response.status_code == 201
        assert 'booking_number' in booking_response.data['booking']
        
        # Verify booking was created
        booking = Booking.objects.get(booking_number=booking_response.data['booking']['booking_number'])
        assert booking.guest_checkout is not None
        assert booking.guest_checkout.email == 'guest@example.com'
        assert booking.status == 'paid'
        assert booking.total_price_cents == 99500
    
    def test_guest_booking_without_payment_intent_fails(self, test_services, test_addresses):
        """Test booking creation fails without payment_intent_id"""
        client = APIClient()
        package = test_services['package']
        
        response = client.post('/api/public/guest-booking/', {
            # Missing payment_intent_id
            'service_type': 'mini_move',
            'mini_move_package_id': str(package.id),
            'first_name': 'Guest',
            'last_name': 'User',
            'email': 'guest@example.com',
            'phone': '5559876543',
            'pickup_date': (timezone.now().date() + timedelta(days=2)).isoformat(),
            'pickup_address': {
                'address_line_1': '123 Test St',
                'city': 'New York',
                'state': 'NY',
                'zip_code': '10001'
            },
            'delivery_address': {
                'address_line_1': '456 Test Ave',
                'city': 'New York',
                'state': 'NY',
                'zip_code': '10002'
            }
        }, format='json')
        
        assert response.status_code == 400
        assert 'payment_intent_id' in str(response.data)

# backend/apps/bookings/tests/test_booking_flow.py
# Replace the TestAuthenticatedBookingFlow class:

@pytest.mark.django_db
class TestAuthenticatedBookingFlow:
    """Test authenticated customer booking flow"""
    
    @patch('stripe.PaymentIntent.create')
    @patch('stripe.PaymentIntent.retrieve')
    def test_authenticated_booking_complete_flow(self, mock_retrieve, mock_create, authenticated_customer, test_services, test_addresses):
        """Test full authenticated booking flow"""
        client, user = authenticated_customer
        package = test_services['package']
        pickup, delivery = test_addresses
        
        # Step 1: Create payment intent
        mock_create.return_value = Mock(
            id='pi_test_456',
            client_secret='pi_test_456_secret',
            amount=99500
        )
        
        payment_response = client.post('/api/customer/bookings/create-payment-intent/', {
            'service_type': 'mini_move',
            'mini_move_package_id': str(package.id),
            'pickup_date': (timezone.now().date() + timedelta(days=2)).isoformat(),
            'customer_email': user.email
        }, format='json')
        
        assert payment_response.status_code == 200
        
        # Step 2: Simulate payment success
        mock_retrieve.return_value = Mock(
            id='pi_test_456',
            status='succeeded',
            amount=99500,
            get=lambda x, default='': 'ch_test_789' if x == 'latest_charge' else default
        )
        
        # Step 3: Create booking - USE new_pickup_address and new_delivery_address
        booking_response = client.post('/api/customer/bookings/create/', {
            'payment_intent_id': 'pi_test_456',
            'service_type': 'mini_move',
            'mini_move_package_id': str(package.id),
            'new_pickup_address': {  # ← CHANGED to new_pickup_address
                'address_line_1': pickup.address_line_1,
                'city': pickup.city,
                'state': pickup.state,
                'zip_code': pickup.zip_code
            },
            'new_delivery_address': {  # ← CHANGED to new_delivery_address
                'address_line_1': delivery.address_line_1,
                'city': delivery.city,
                'state': delivery.state,
                'zip_code': delivery.zip_code
            },
            'pickup_date': (timezone.now().date() + timedelta(days=2)).isoformat(),
            'pickup_time': 'morning'
        }, format='json')
        
        assert booking_response.status_code == 201
        assert 'booking' in booking_response.data
        
        # Verify booking
        booking = Booking.objects.get(customer=user)
        assert booking.status == 'paid'
        assert booking.customer == user

@pytest.mark.django_db
class TestBookingPricing:
    """Test booking pricing calculations"""
    
    def test_mini_move_pricing_calculation(self, test_services, test_addresses):
        """Test mini move pricing"""
        pickup, delivery = test_addresses
        package = test_services['package']
        
        booking = Booking.objects.create(
            guest_checkout=GuestCheckout.objects.create(
                first_name='Test',
                last_name='User',
                email='test@example.com',
                phone='5551234567'
            ),
            service_type='mini_move',
            mini_move_package=package,
            pickup_address=pickup,
            delivery_address=delivery,
            pickup_date=timezone.now().date() + timedelta(days=2),
            status='pending'
        )
        
        assert booking.base_price_cents == 99500
        assert booking.total_price_cents >= 99500
        assert booking.booking_number.startswith('TT-')
    
    def test_mini_move_with_organizing_services(self, test_services, test_addresses):
        """Test mini move with packing service"""
        pickup, delivery = test_addresses
        package = test_services['package']
        
        booking = Booking.objects.create(
            guest_checkout=GuestCheckout.objects.create(
                first_name='Test',
                last_name='User',
                email='test@example.com',
                phone='5551234567'
            ),
            service_type='mini_move',
            mini_move_package=package,
            pickup_address=pickup,
            delivery_address=delivery,
            pickup_date=timezone.now().date() + timedelta(days=2),
            include_packing=True,
            status='pending'
        )
        
        assert booking.organizing_total_cents > 0
        assert booking.organizing_tax_cents > 0
        assert booking.total_price_cents > booking.base_price_cents
    
    def test_specialty_item_pricing(self, test_services, test_addresses):
        """Test specialty item pricing"""
        pickup, delivery = test_addresses
        peloton = test_services['peloton']
        
        booking = Booking.objects.create(
            guest_checkout=GuestCheckout.objects.create(
                first_name='Test',
                last_name='User',
                email='test@example.com',
                phone='5551234567'
            ),
            service_type='specialty_item',
            pickup_address=pickup,
            delivery_address=delivery,
            pickup_date=timezone.now().date() + timedelta(days=2),
            status='pending'
        )
        
        booking.specialty_items.add(peloton)
        booking.save()
        
        assert booking.base_price_cents == 50000


@pytest.mark.django_db
class TestBookingValidation:
    """Test booking validation rules"""
    
    def test_booking_requires_customer_or_guest(self, test_services, test_addresses):
        """Test booking must have either customer or guest"""
        pickup, delivery = test_addresses
        package = test_services['package']
        
        # This should fail due to CheckConstraint
        with pytest.raises(Exception):
            Booking.objects.create(
                service_type='mini_move',
                mini_move_package=package,
                pickup_address=pickup,
                delivery_address=delivery,
                pickup_date=timezone.now().date() + timedelta(days=1),
                # No customer or guest_checkout
                status='pending'
            )
    
    def test_get_customer_name_and_email(self, test_addresses):
        """Test booking customer name/email methods"""
        pickup, delivery = test_addresses
        
        guest = GuestCheckout.objects.create(
            first_name='Guest',
            last_name='User',
            email='guest@example.com',
            phone='5551234567'
        )
        
        booking = Booking.objects.create(
            guest_checkout=guest,
            service_type='mini_move',
            pickup_address=pickup,
            delivery_address=delivery,
            pickup_date=timezone.now().date() + timedelta(days=1),
            status='pending'
        )
        
        assert booking.get_customer_name() == 'Guest User'
        assert booking.get_customer_email() == 'guest@example.com'


@pytest.mark.django_db
class TestBladeTransfer:
    """Test BLADE airport transfer bookings"""
    
    def test_blade_transfer_pricing(self, test_addresses):
        """Test BLADE pricing calculation"""
        pickup, delivery = test_addresses
        
        booking = Booking.objects.create(
            guest_checkout=GuestCheckout.objects.create(
                first_name='BLADE',
                last_name='User',
                email='blade@example.com',
                phone='5551234567'
            ),
            service_type='blade_transfer',
            pickup_address=pickup,
            delivery_address=delivery,
            pickup_date=timezone.now().date() + timedelta(days=2),
            blade_airport='JFK',
            blade_bag_count=3,
            blade_flight_date=timezone.now().date() + timedelta(days=2),
            blade_flight_time=timezone.now().time(),
            status='pending'
        )
        
        # $75 per bag, 3 bags = $225
        assert booking.base_price_cents == 22500
        assert booking.blade_ready_time is not None
    
    def test_blade_minimum_bags(self, test_addresses):
        """Test BLADE minimum price enforcement"""
        pickup, delivery = test_addresses
        
        booking = Booking.objects.create(
            guest_checkout=GuestCheckout.objects.create(
                first_name='BLADE',
                last_name='User',
                email='blade@example.com',
                phone='5551234567'
            ),
            service_type='blade_transfer',
            pickup_address=pickup,
            delivery_address=delivery,
            pickup_date=timezone.now().date() + timedelta(days=2),
            blade_airport='JFK',
            blade_bag_count=1,
            blade_flight_date=timezone.now().date() + timedelta(days=2),
            blade_flight_time=timezone.now().time(),
            status='pending'
        )
        
        # Minimum price is $150
        assert booking.base_price_cents == 15000