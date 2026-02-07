# backend/apps/bookings/tests/test_public_endpoints.py
"""
Tests for HIGH findings H1 + H2:
- H1: Calendar availability must NOT expose customer names, prices, or booking IDs
- H2: Booking status lookup must NOT be enumerable via sequential TT-XXXXXX numbers
- H2b: Payment status must follow the same pattern

These tests should FAIL before the fix and PASS after.
"""
import pytest
from rest_framework.test import APIClient
from django.utils import timezone
from datetime import timedelta, date

from apps.bookings.models import Booking, Address, GuestCheckout
from apps.services.models import MiniMovePackage
from apps.payments.models import Payment


def _next_weekday():
    today = date.today()
    days_ahead = (0 - today.weekday()) % 7
    if days_ahead == 0:
        days_ahead = 7
    return today + timedelta(days=days_ahead)


@pytest.fixture
def booking_with_data(db):
    """Create a booking with identifiable PII for testing exposure."""
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
        address_line_1='742 Evergreen Terrace',
        city='New York',
        state='NY',
        zip_code='10001',
    )
    delivery = Address.objects.create(
        address_line_1='123 Fake Street',
        city='New York',
        state='NY',
        zip_code='10002',
    )
    guest = GuestCheckout.objects.create(
        first_name='Homer',
        last_name='Simpson',
        email='homer@springfield.com',
        phone='5551234567',
    )
    pickup_date = _next_weekday()
    booking = Booking.objects.create(
        guest_checkout=guest,
        service_type='mini_move',
        mini_move_package=package,
        pickup_address=pickup,
        delivery_address=delivery,
        pickup_date=pickup_date,
        status='paid',
    )
    return booking


# ============================================================
# H1: Calendar availability must not expose PII
# ============================================================

@pytest.mark.django_db
class TestCalendarAvailabilityPII:
    """H1: Public calendar must not leak customer names, prices, or booking IDs."""

    def test_calendar_does_not_expose_customer_names(self, booking_with_data):
        client = APIClient()
        pickup_date = booking_with_data.pickup_date
        response = client.get('/api/public/availability/', {
            'start_date': pickup_date.isoformat(),
            'end_date': pickup_date.isoformat(),
        })

        assert response.status_code == 200
        response_text = str(response.data)

        # Customer name must NOT appear anywhere in the response
        assert 'Homer' not in response_text
        assert 'Simpson' not in response_text

    def test_calendar_does_not_expose_booking_ids(self, booking_with_data):
        client = APIClient()
        pickup_date = booking_with_data.pickup_date
        response = client.get('/api/public/availability/', {
            'start_date': pickup_date.isoformat(),
            'end_date': pickup_date.isoformat(),
        })

        assert response.status_code == 200
        response_text = str(response.data)

        # Internal UUID and booking number must NOT appear
        assert str(booking_with_data.id) not in response_text
        assert booking_with_data.booking_number not in response_text

    def test_calendar_does_not_expose_prices(self, booking_with_data):
        client = APIClient()
        pickup_date = booking_with_data.pickup_date
        response = client.get('/api/public/availability/', {
            'start_date': pickup_date.isoformat(),
            'end_date': pickup_date.isoformat(),
        })

        assert response.status_code == 200

        # Check individual day entries
        for day in response.data.get('availability', []):
            if day['date'] == pickup_date.isoformat():
                # If bookings are included, they must not have price fields
                for b in day.get('bookings', []):
                    assert 'total_price_dollars' not in b
                    assert 'customer_name' not in b
                    assert 'id' not in b
                    assert 'booking_number' not in b

    def test_calendar_returns_only_counts(self, booking_with_data):
        """Calendar should return slot counts, not booking details."""
        client = APIClient()
        pickup_date = booking_with_data.pickup_date
        response = client.get('/api/public/availability/', {
            'start_date': pickup_date.isoformat(),
            'end_date': pickup_date.isoformat(),
        })

        assert response.status_code == 200
        for day in response.data.get('availability', []):
            if day['date'] == pickup_date.isoformat():
                # Should have a count, not a list of booking details
                assert 'booking_count' in day or 'bookings' not in day or len(day.get('bookings', [])) == 0 or all(
                    'customer_name' not in b for b in day.get('bookings', [])
                )


# ============================================================
# H2: Booking/payment status must not be enumerable
# ============================================================

@pytest.mark.django_db
class TestBookingStatusEnumeration:
    """H2: Sequential booking numbers must not be publicly queryable."""

    def test_booking_status_rejects_sequential_number_lookup(self, booking_with_data):
        """Public lookup by sequential TT-XXXXXX must be blocked."""
        client = APIClient()
        booking_number = booking_with_data.booking_number  # e.g. TT-000001

        response = client.get(f'/api/public/booking-status/{booking_number}/')

        # Must return 404 (endpoint removed/changed) or require auth
        assert response.status_code in (401, 403, 404)

    def test_booking_status_accessible_by_uuid(self, booking_with_data):
        """Booking status should be accessible via non-guessable UUID."""
        client = APIClient()
        booking_uuid = str(booking_with_data.id)

        response = client.get(f'/api/public/booking-status/{booking_uuid}/')

        # UUID lookup should work (200) — this is the safe path
        assert response.status_code == 200

    def test_booking_status_strips_sensitive_fields(self, booking_with_data):
        """Even with valid UUID, response must not include full addresses or prices."""
        client = APIClient()
        booking_uuid = str(booking_with_data.id)

        response = client.get(f'/api/public/booking-status/{booking_uuid}/')

        if response.status_code == 200:
            data = response.data
            # Must not include full address details
            assert 'pickup_address' not in data or data.get('pickup_address') is None
            assert 'delivery_address' not in data or data.get('delivery_address') is None
            # Must not include price
            assert 'total_price_dollars' not in data


@pytest.mark.django_db
class TestPaymentStatusEnumeration:
    """H2: Payment status must also not be enumerable."""

    def test_payment_status_rejects_sequential_number_lookup(self, booking_with_data):
        """Payment status by sequential booking number must be blocked."""
        Payment.objects.create(
            booking=booking_with_data,
            stripe_payment_intent_id='pi_test_enum',
            amount_cents=booking_with_data.total_price_cents,
            status='succeeded',
        )

        client = APIClient()
        booking_number = booking_with_data.booking_number

        response = client.get(f'/api/payments/status/{booking_number}/')

        # Must return 404 (endpoint changed) or require auth
        assert response.status_code in (401, 403, 404)

    def test_payment_status_accessible_by_uuid(self, booking_with_data):
        """Payment status should be accessible via UUID."""
        Payment.objects.create(
            booking=booking_with_data,
            stripe_payment_intent_id='pi_test_uuid',
            amount_cents=booking_with_data.total_price_cents,
            status='succeeded',
        )

        client = APIClient()
        booking_uuid = str(booking_with_data.id)

        response = client.get(f'/api/payments/status/{booking_uuid}/')

        assert response.status_code == 200


# ============================================================
# M9: date.fromisoformat error handling
# ============================================================

@pytest.mark.django_db
class TestCalendarDateValidation:
    """M9: Invalid date parameters should return 400, not 500."""

    def test_calendar_invalid_start_date_returns_400(self):
        client = APIClient()
        response = client.get('/api/public/availability/', {
            'start_date': 'not-a-date',
        })
        assert response.status_code == 400
        assert 'start_date' in response.data.get('error', '').lower()

    def test_calendar_invalid_end_date_returns_400(self):
        client = APIClient()
        response = client.get('/api/public/availability/', {
            'start_date': date.today().isoformat(),
            'end_date': '2026-13-99',
        })
        assert response.status_code == 400
        assert 'end_date' in response.data.get('error', '').lower()
