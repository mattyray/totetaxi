# apps/bookings/tests/test_pricing.py
"""
Test pricing calculations for ToteTaxi bookings
CRITICAL: These tests protect revenue - pricing bugs = money lost
"""
import pytest
from datetime import date, timedelta
from decimal import Decimal
from django.test import TestCase

from apps.bookings.models import Booking, Address, GuestCheckout
from apps.services.models import MiniMovePackage, SurchargeRule


@pytest.mark.django_db
class TestMiniMovePricing(TestCase):
    """Test Mini Move pricing calculations"""
    
    def setUp(self):
        """Create test data matching production"""
        # Create Mini Move package
        self.petite_package = MiniMovePackage.objects.create(
            package_type='petite',
            name='Petite Move',
            description='Up to 10 items',
            base_price_cents=15000,  # $150
            max_items=10,
            max_weight_per_item_lbs=50,
            coi_included=False,
            coi_fee_cents=5000,  # $50
            is_active=True
        )
        
        # Create weekend surcharge (15%)
        self.weekend_surcharge = SurchargeRule.objects.create(
            surcharge_type='weekend',
            name='Weekend Delivery Surcharge',
            description='15% surcharge for weekend deliveries',
            applies_to_service_type='all',
            calculation_type='percentage',
            percentage=Decimal('15.00'),
            applies_saturday=True,
            applies_sunday=True,
            is_active=True
        )
        
        # Create guest checkout
        self.guest = GuestCheckout.objects.create(
            first_name="Test",
            last_name="Customer",
            email="test@totetaxi.com",
            phone="212-555-0100"
        )
        
        # Create addresses (Manhattan to Manhattan - no geographic surcharge)
        self.pickup_address = Address.objects.create(
            address_line_1="123 West 57th St",
            city="New York",
            state="NY",
            zip_code="10019"
        )
        
        self.delivery_address = Address.objects.create(
            address_line_1="456 Park Ave",
            city="New York",
            state="NY",
            zip_code="10022"
        )
    
    def test_weekday_base_price_no_extras(self):
        """Test simple weekday booking - should be base price only"""
        # Get next Monday
        today = date.today()
        days_until_monday = (0 - today.weekday()) % 7
        if days_until_monday == 0:
            days_until_monday = 7
        next_monday = today + timedelta(days=days_until_monday)
        
        booking = Booking.objects.create(
            service_type='mini_move',
            mini_move_package=self.petite_package,
            guest_checkout=self.guest,
            pickup_address=self.pickup_address,
            delivery_address=self.delivery_address,
            pickup_date=next_monday,
            pickup_time='morning',
            status='pending_payment'
        )
        
        # Assertions
        assert booking.base_price_cents == 15000, \
            f"Expected $150 base, got ${booking.base_price_cents/100}"
        assert booking.surcharge_cents == 0, \
            "Weekday should have no surcharge"
        assert booking.total_price_cents == 15000, \
            f"Expected $150 total, got ${booking.total_price_cents/100}"
        
        print(f"✅ Weekday base price: ${booking.total_price_cents / 100:.2f}")
    
    def test_weekend_surcharge_saturday(self):
        """Test that Saturday bookings get 15% surcharge"""
        # Get next Saturday
        today = date.today()
        days_until_saturday = (5 - today.weekday()) % 7
        if days_until_saturday == 0:
            days_until_saturday = 7
        next_saturday = today + timedelta(days=days_until_saturday)
        
        booking = Booking.objects.create(
            service_type='mini_move',
            mini_move_package=self.petite_package,
            guest_checkout=self.guest,
            pickup_address=self.pickup_address,
            delivery_address=self.delivery_address,
            pickup_date=next_saturday,
            pickup_time='morning',
            status='pending_payment'
        )
        
        # Calculate expected values
        expected_surcharge = int(15000 * 0.15)  # $22.50 in cents
        expected_total = 15000 + expected_surcharge
        
        # Assertions
        assert booking.base_price_cents == 15000
        assert booking.surcharge_cents == expected_surcharge, \
            f"Expected ${expected_surcharge/100} surcharge, got ${booking.surcharge_cents/100}"
        assert booking.total_price_cents == expected_total, \
            f"Expected ${expected_total/100} total, got ${booking.total_price_cents/100}"
        
        print(f"✅ Weekend surcharge: Base ${booking.base_price_cents/100} + " \
              f"Surcharge ${booking.surcharge_cents/100} = ${booking.total_price_cents/100}")
    
    def test_coi_fee_applied(self):
        """Test COI fee for Petite package"""
        # Get next Monday to avoid weekend surcharge
        today = date.today()
        days_until_monday = (0 - today.weekday()) % 7
        if days_until_monday == 0:
            days_until_monday = 7
        next_monday = today + timedelta(days=days_until_monday)
        
        booking = Booking.objects.create(
            service_type='mini_move',
            mini_move_package=self.petite_package,
            guest_checkout=self.guest,
            pickup_address=self.pickup_address,
            delivery_address=self.delivery_address,
            pickup_date=next_monday,  # ✅ FIXED: Use weekday instead of +7 days
            pickup_time='morning',
            coi_required=True,  # Request COI
            status='pending_payment'
        )
        
        # Assertions
        assert booking.coi_fee_cents == 5000, \
            f"Expected $50 COI fee, got ${booking.coi_fee_cents/100}"
        assert booking.total_price_cents == 20000, \
            f"Expected $200 total ($150 + $50 COI), got ${booking.total_price_cents/100}"
        
        print(f"✅ COI fee applied: ${booking.coi_fee_cents/100}")
    
    def test_pricing_breakdown_structure(self):
        """Test that pricing breakdown returns correct structure"""
        booking = Booking.objects.create(
            service_type='mini_move',
            mini_move_package=self.petite_package,
            guest_checkout=self.guest,
            pickup_address=self.pickup_address,
            delivery_address=self.delivery_address,
            pickup_date=date.today() + timedelta(days=7),
            pickup_time='morning',
            status='pending_payment'
        )
        
        breakdown = booking.get_pricing_breakdown()
        
        # Check structure
        assert 'base_price_dollars' in breakdown
        assert 'surcharge_dollars' in breakdown
        assert 'total_price_dollars' in breakdown
        assert isinstance(breakdown['base_price_dollars'], float)
        
        print(f"✅ Pricing breakdown: {breakdown}")