# backend/apps/bookings/tests/test_models.py
import pytest
from django.core.exceptions import ValidationError
from django.contrib.auth.models import User
from apps.bookings.models import Booking, Address
from apps.customers.models import CustomerProfile
from apps.services.models import MiniMovePackage
from django.utils import timezone
from datetime import timedelta


@pytest.fixture
def addresses(db):
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
    return pickup, delivery


@pytest.fixture
def customer_user(db):
    user = User.objects.create_user(
        username='customer',
        email='customer@example.com',
        password='testpass123'
    )
    CustomerProfile.objects.create(user=user, phone='5551234567')
    return user


@pytest.mark.django_db
class TestBookingModel:
    """Test Booking model business logic"""
    
    def test_booking_number_generation(self, customer_user, addresses):
        """Test booking numbers are generated sequentially"""
        pickup, delivery = addresses
        
        booking1 = Booking.objects.create(
            customer=customer_user,
            service_type='mini_move',
            pickup_address=pickup,
            delivery_address=delivery,
            pickup_date=timezone.now().date() + timedelta(days=1)
        )
        
        booking2 = Booking.objects.create(
            customer=customer_user,
            service_type='mini_move',
            pickup_address=pickup,
            delivery_address=delivery,
            pickup_date=timezone.now().date() + timedelta(days=1)
        )
        
        assert booking1.booking_number.startswith('TT-')
        assert booking2.booking_number.startswith('TT-')
        assert booking1.booking_number != booking2.booking_number
    
    def test_pricing_calculation(self, customer_user, addresses, db):
        """Test booking pricing is calculated correctly"""
        pickup, delivery = addresses
        
        package = MiniMovePackage.objects.create(
            package_type='petite',
            name='Petite',
            base_price_cents=99500,
            max_items=15,
            is_active=True
        )
        
        booking = Booking.objects.create(
            customer=customer_user,
            service_type='mini_move',
            mini_move_package=package,
            pickup_address=pickup,
            delivery_address=delivery,
            pickup_date=timezone.now().date() + timedelta(days=1)
        )
        
        assert booking.base_price_cents == 99500
        assert booking.total_price_cents >= 99500
    
    def test_get_customer_name_authenticated(self, customer_user, addresses):
        """Test getting customer name from authenticated user"""
        pickup, delivery = addresses
        
        booking = Booking.objects.create(
            customer=customer_user,
            service_type='mini_move',
            pickup_address=pickup,
            delivery_address=delivery,
            pickup_date=timezone.now().date() + timedelta(days=1)
        )
        
        name = booking.get_customer_name()
        assert 'customer' in name.lower() or customer_user.get_full_name() in name
    
    def test_reminder_timestamp(self, customer_user, addresses):
        """Test reminder sent timestamp"""
        pickup, delivery = addresses
        
        booking = Booking.objects.create(
            customer=customer_user,
            service_type='mini_move',
            pickup_address=pickup,
            delivery_address=delivery,
            pickup_date=timezone.now().date() + timedelta(days=1),
            status='confirmed'
        )
        
        assert booking.reminder_sent_at is None
        
        from apps.customers.emails import send_booking_reminder_email
        send_booking_reminder_email(booking)
        
        booking.refresh_from_db()
        assert booking.reminder_sent_at is not None


# ============================================================
# M4: _skip_pricing flag on Booking.save()
# ============================================================

@pytest.mark.django_db
class TestSkipPricing:
    """M4: Booking.save(_skip_pricing=True) must not recalculate pricing."""

    def test_skip_pricing_does_not_recalculate(self, customer_user, addresses):
        pickup, delivery = addresses
        package = MiniMovePackage.objects.create(
            package_type='petite',
            name='Petite Skip',
            base_price_cents=99500,
            max_items=15,
            is_active=True,
        )
        booking = Booking.objects.create(
            customer=customer_user,
            service_type='mini_move',
            mini_move_package=package,
            pickup_address=pickup,
            delivery_address=delivery,
            pickup_date=timezone.now().date() + timedelta(days=2),
            status='pending',
        )
        original_total = booking.total_price_cents

        # Status-only save with skip_pricing — total must not change
        booking.status = 'paid'
        booking.save(_skip_pricing=True)
        booking.refresh_from_db()
        assert booking.total_price_cents == original_total
        assert booking.status == 'paid'

    def test_normal_save_recalculates(self, customer_user, addresses):
        pickup, delivery = addresses
        package = MiniMovePackage.objects.create(
            package_type='standard',
            name='Standard Recalc',
            base_price_cents=149500,
            max_items=30,
            is_active=True,
        )
        booking = Booking.objects.create(
            customer=customer_user,
            service_type='mini_move',
            mini_move_package=package,
            pickup_address=pickup,
            delivery_address=delivery,
            pickup_date=timezone.now().date() + timedelta(days=2),
        )
        # Normal save should always recalculate
        assert booking.base_price_cents == 149500

    def test_new_booking_always_calculates_pricing(self, customer_user, addresses):
        pickup, delivery = addresses
        package = MiniMovePackage.objects.create(
            package_type='full',
            name='Full New',
            base_price_cents=249500,
            max_items=60,
            is_active=True,
        )
        booking = Booking.objects.create(
            customer=customer_user,
            service_type='mini_move',
            mini_move_package=package,
            pickup_address=pickup,
            delivery_address=delivery,
            pickup_date=timezone.now().date() + timedelta(days=3),
        )
        # Even first save must have pricing
        assert booking.base_price_cents > 0
        assert booking.total_price_cents > 0