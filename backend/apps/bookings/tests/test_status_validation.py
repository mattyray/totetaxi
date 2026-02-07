# backend/apps/bookings/tests/test_status_validation.py
"""
Tests for security findings H5 and C4:
- H5: Booking status transitions must be validated (no arbitrary strings)
- C4: Booking number generation must not produce duplicates

These tests should FAIL before the fix and PASS after.
"""
import pytest
from unittest.mock import patch
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from django.db import IntegrityError
from datetime import date, timedelta

from apps.bookings.models import Booking, Address, GuestCheckout
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
        username='statusstaff', email='statusstaff@example.com', password='testpass',
    )
    StaffProfile.objects.create(user=user, role='admin', phone='5550000010')
    return user


@pytest.fixture
def test_booking(db):
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
    return booking


# ============================================================
# H5: Booking status transition validation
# ============================================================

@pytest.mark.django_db
class TestBookingStatusValidation:
    """H5: Staff must not be able to set arbitrary booking status strings."""

    def test_invalid_status_string_rejected(self, staff_user, test_booking):
        """Setting status to a garbage string must be rejected."""
        client = APIClient()
        client.force_authenticate(user=staff_user)
        response = client.patch(
            f'/api/staff/bookings/{test_booking.id}/',
            {'status': 'hacked'},
            format='json',
        )
        assert response.status_code == 400, (
            f"Invalid status 'hacked' should be rejected but got {response.status_code}"
        )

    def test_completed_to_pending_rejected(self, staff_user, test_booking):
        """Completed booking must not be allowed to go back to pending."""
        test_booking.status = 'completed'
        test_booking.save()

        client = APIClient()
        client.force_authenticate(user=staff_user)
        response = client.patch(
            f'/api/staff/bookings/{test_booking.id}/',
            {'status': 'pending'},
            format='json',
        )
        assert response.status_code == 400, (
            f"Transition completed→pending should be rejected but got {response.status_code}"
        )

    def test_cancelled_to_paid_rejected(self, staff_user, test_booking):
        """Cancelled booking must not be allowed to change status."""
        test_booking.status = 'cancelled'
        test_booking.save()

        client = APIClient()
        client.force_authenticate(user=staff_user)
        response = client.patch(
            f'/api/staff/bookings/{test_booking.id}/',
            {'status': 'paid'},
            format='json',
        )
        assert response.status_code == 400

    def test_valid_transition_pending_to_confirmed(self, staff_user, test_booking):
        """Valid transition pending → confirmed must be accepted."""
        client = APIClient()
        client.force_authenticate(user=staff_user)
        response = client.patch(
            f'/api/staff/bookings/{test_booking.id}/',
            {'status': 'confirmed'},
            format='json',
        )
        assert response.status_code == 200
        test_booking.refresh_from_db()
        assert test_booking.status == 'confirmed'

    def test_valid_transition_paid_to_completed(self, staff_user, test_booking):
        """Valid transition paid → completed must be accepted."""
        test_booking.status = 'paid'
        test_booking.save()

        client = APIClient()
        client.force_authenticate(user=staff_user)
        response = client.patch(
            f'/api/staff/bookings/{test_booking.id}/',
            {'status': 'completed'},
            format='json',
        )
        assert response.status_code == 200
        test_booking.refresh_from_db()
        assert test_booking.status == 'completed'

    def test_valid_transition_pending_to_cancelled(self, staff_user, test_booking):
        """Any non-terminal status can be cancelled."""
        client = APIClient()
        client.force_authenticate(user=staff_user)
        response = client.patch(
            f'/api/staff/bookings/{test_booking.id}/',
            {'status': 'cancelled'},
            format='json',
        )
        assert response.status_code == 200
        test_booking.refresh_from_db()
        assert test_booking.status == 'cancelled'


# ============================================================
# C4: Booking number uniqueness
# ============================================================

@pytest.mark.django_db
class TestBookingNumberUniqueness:
    """C4: Booking numbers must be unique and atomically generated."""

    def test_booking_number_generated_on_create(self, test_booking):
        """New bookings must get a booking number."""
        assert test_booking.booking_number is not None
        assert test_booking.booking_number.startswith('TT-')

    def test_sequential_bookings_get_different_numbers(self, db):
        """Two bookings created sequentially must have different numbers."""
        package, _ = MiniMovePackage.objects.get_or_create(
            package_type='petite',
            defaults={
                'name': 'Petite', 'base_price_cents': 99500,
                'max_items': 15, 'is_active': True,
            },
        )
        pickup = Address.objects.create(
            address_line_1='100 St', city='New York', state='NY', zip_code='10001',
        )
        delivery = Address.objects.create(
            address_line_1='200 Ave', city='New York', state='NY', zip_code='10002',
        )

        guest1 = GuestCheckout.objects.create(
            first_name='A', last_name='B', email='a@b.com', phone='5550000001',
        )
        guest2 = GuestCheckout.objects.create(
            first_name='C', last_name='D', email='c@d.com', phone='5550000002',
        )

        b1 = Booking.objects.create(
            guest_checkout=guest1,
            service_type='mini_move', mini_move_package=package,
            pickup_address=pickup, delivery_address=delivery,
            pickup_date=_next_weekday(), status='pending',
        )
        b2 = Booking.objects.create(
            guest_checkout=guest2,
            service_type='mini_move', mini_move_package=package,
            pickup_address=pickup, delivery_address=delivery,
            pickup_date=_next_weekday(), status='pending',
        )

        assert b1.booking_number != b2.booking_number, (
            f"Two bookings got same number: {b1.booking_number}"
        )

    def test_booking_number_field_is_unique(self, test_booking):
        """The booking_number field should have a unique constraint."""
        field = Booking._meta.get_field('booking_number')
        assert field.unique, "booking_number field must have unique=True"
