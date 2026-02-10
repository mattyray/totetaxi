"""Tests for bi-directional airport transfer feature."""
import pytest
from datetime import date, time as dt_time, timedelta
from django.utils import timezone

from apps.bookings.models import Booking, Address, GuestCheckout
from apps.bookings.serializers import validate_blade_terminal


@pytest.fixture
def addresses(db):
    customer = Address.objects.create(
        address_line_1='123 Main St', city='New York', state='NY', zip_code='10001'
    )
    jfk = Address.objects.create(
        address_line_1='JFK International Airport', city='Jamaica', state='NY', zip_code='11430'
    )
    ewr = Address.objects.create(
        address_line_1='Newark Liberty International Airport', city='Newark', state='NJ', zip_code='07114'
    )
    return customer, jfk, ewr


@pytest.fixture
def guest(db):
    return GuestCheckout.objects.create(
        first_name='Test', last_name='User',
        email='test@example.com', phone='+11234567890'
    )


@pytest.fixture
def to_airport_booking(db, guest, addresses):
    customer_addr, jfk_addr, _ = addresses
    return Booking.objects.create(
        guest_checkout=guest,
        service_type='blade_transfer',
        transfer_direction='to_airport',
        blade_airport='JFK',
        blade_terminal='4',
        blade_flight_date=date.today() + timedelta(days=2),
        blade_flight_time=dt_time(14, 0),
        blade_bag_count=3,
        pickup_date=date.today() + timedelta(days=2),
        pickup_address=customer_addr,
        delivery_address=jfk_addr,
    )


@pytest.fixture
def from_airport_booking(db, guest, addresses):
    customer_addr, _, ewr_addr = addresses
    return Booking.objects.create(
        guest_checkout=guest,
        service_type='blade_transfer',
        transfer_direction='from_airport',
        blade_airport='EWR',
        blade_terminal='C',
        blade_flight_date=date.today() + timedelta(days=2),
        blade_flight_time=dt_time(18, 30),
        blade_bag_count=2,
        pickup_date=date.today() + timedelta(days=2),
        pickup_address=ewr_addr,
        delivery_address=customer_addr,
    )


@pytest.mark.django_db
class TestReadyTimeCalculation:
    def test_to_airport_morning_flight(self):
        b = Booking(service_type='blade_transfer', transfer_direction='to_airport',
                    blade_flight_time=dt_time(10, 0))
        b.calculate_blade_ready_time()
        assert b.blade_ready_time == dt_time(5, 0)

    def test_to_airport_afternoon_flight(self):
        b = Booking(service_type='blade_transfer', transfer_direction='to_airport',
                    blade_flight_time=dt_time(15, 0))
        b.calculate_blade_ready_time()
        assert b.blade_ready_time == dt_time(10, 0)

    def test_from_airport_no_ready_time(self):
        b = Booking(service_type='blade_transfer', transfer_direction='from_airport',
                    blade_flight_time=dt_time(10, 0))
        b.calculate_blade_ready_time()
        assert b.blade_ready_time is None


@pytest.mark.django_db
class TestTerminalValidation:
    def test_jfk_valid_terminals(self):
        for t in ['1', '4', '5', '7', '8']:
            assert validate_blade_terminal('JFK', t) is True

    def test_jfk_invalid_terminals(self):
        for t in ['2', '3', '6', '9', 'A', 'B']:
            assert validate_blade_terminal('JFK', t) is False

    def test_ewr_valid_terminals(self):
        for t in ['A', 'B', 'C']:
            assert validate_blade_terminal('EWR', t) is True

    def test_ewr_invalid_terminals(self):
        for t in ['D', 'E', '1', '2']:
            assert validate_blade_terminal('EWR', t) is False


@pytest.mark.django_db
class TestPricingBreakdown:
    def test_includes_direction_and_terminal(self, from_airport_booking):
        breakdown = from_airport_booking.get_pricing_breakdown()
        assert 'blade_details' in breakdown
        assert breakdown['blade_details']['transfer_direction'] == 'from_airport'
        assert breakdown['blade_details']['terminal'] == 'C'

    def test_from_airport_no_ready_time_in_breakdown(self, from_airport_booking):
        breakdown = from_airport_booking.get_pricing_breakdown()
        assert breakdown['blade_details']['ready_time'] is None

    def test_to_airport_has_ready_time(self, to_airport_booking):
        breakdown = to_airport_booking.get_pricing_breakdown()
        assert breakdown['blade_details']['ready_time'] is not None
        assert breakdown['blade_details']['transfer_direction'] == 'to_airport'


@pytest.mark.django_db
class TestBackwardsCompatibility:
    def test_default_direction_is_to_airport(self, guest, addresses):
        customer_addr, jfk_addr, _ = addresses
        booking = Booking.objects.create(
            guest_checkout=guest,
            service_type='blade_transfer',
            blade_airport='JFK',
            blade_flight_date=date.today() + timedelta(days=2),
            blade_flight_time=dt_time(12, 0),
            blade_bag_count=2,
            pickup_date=date.today() + timedelta(days=2),
            pickup_address=customer_addr,
            delivery_address=jfk_addr,
        )
        assert booking.transfer_direction == 'to_airport'
        assert booking.blade_ready_time is not None

    def test_blade_terminal_nullable(self, guest, addresses):
        customer_addr, jfk_addr, _ = addresses
        booking = Booking.objects.create(
            guest_checkout=guest,
            service_type='blade_transfer',
            blade_airport='JFK',
            blade_flight_date=date.today() + timedelta(days=2),
            blade_flight_time=dt_time(12, 0),
            blade_bag_count=2,
            pickup_date=date.today() + timedelta(days=2),
            pickup_address=customer_addr,
            delivery_address=jfk_addr,
        )
        assert booking.blade_terminal is None
