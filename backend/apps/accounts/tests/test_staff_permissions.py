# backend/apps/accounts/tests/test_staff_permissions.py
"""
Tests for security findings H3, H4, L1:
- H3: Staff endpoints must use proper DRF permission classes (not inline hasattr)
- H4: lock_account must not crash (timezone.timedelta bug)
- L1: StaffAction must accept 'view_booking' action type

These tests should FAIL before the fix and PASS after.
"""
import pytest
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from datetime import date, timedelta

from apps.accounts.models import StaffProfile, StaffAction
from apps.customers.models import CustomerProfile


@pytest.fixture
def staff_user(db):
    user = User.objects.create_user(
        username='teststaff', email='staff@example.com', password='testpass',
        first_name='Test', last_name='Staff',
    )
    StaffProfile.objects.create(user=user, role='staff', phone='5550000001')
    return user


@pytest.fixture
def admin_user(db):
    user = User.objects.create_user(
        username='testadmin', email='admin@example.com', password='testpass',
        first_name='Test', last_name='Admin',
    )
    StaffProfile.objects.create(user=user, role='admin', phone='5550000002')
    return user


@pytest.fixture
def customer_user(db):
    user = User.objects.create_user(
        username='testcustomer', email='customer@example.com', password='testpass',
        first_name='Test', last_name='Customer',
    )
    CustomerProfile.objects.create(
        user=user, phone='+12125550100',
        total_bookings=0, total_spent_cents=0,
    )
    return user


# ============================================================
# H3: Staff endpoints must reject non-staff users at permission level
# ============================================================

STAFF_GET_ENDPOINTS = [
    '/api/staff/dashboard/',
    '/api/staff/customers/',
    '/api/staff/bookings/',
    '/api/staff/reports/',
    '/api/staff/logistics/summary/',
    '/api/staff/logistics/tasks/',
]


@pytest.mark.django_db
class TestStaffEndpointPermissions:
    """H3: Staff endpoints must reject unauthenticated and non-staff users."""

    def test_unauthenticated_rejected_on_staff_endpoints(self):
        """Unauthenticated requests to staff endpoints must return 401 or 403."""
        client = APIClient()
        for url in STAFF_GET_ENDPOINTS:
            response = client.get(url)
            assert response.status_code in (401, 403), (
                f"{url} returned {response.status_code} for unauthenticated user"
            )

    def test_customer_rejected_on_staff_endpoints(self, customer_user):
        """Authenticated customer must get 403 on staff endpoints."""
        client = APIClient()
        client.force_authenticate(user=customer_user)
        for url in STAFF_GET_ENDPOINTS:
            response = client.get(url)
            assert response.status_code == 403, (
                f"{url} returned {response.status_code} for customer user"
            )

    def test_staff_user_accepted_on_staff_endpoints(self, staff_user):
        """Staff user must get 200 on staff dashboard."""
        client = APIClient()
        client.force_authenticate(user=staff_user)
        response = client.get('/api/staff/dashboard/')
        assert response.status_code == 200

    def test_customer_rejected_on_refund_process(self, customer_user):
        """Customer must not be able to process refunds."""
        client = APIClient()
        client.force_authenticate(user=customer_user)
        response = client.post('/api/payments/refunds/process/', {
            'payment_id': '00000000-0000-0000-0000-000000000000',
            'amount_cents': 100,
            'reason': 'test',
        }, format='json')
        assert response.status_code == 403

    def test_customer_rejected_on_logistics_sync(self, customer_user):
        """Customer must not be able to trigger logistics sync."""
        client = APIClient()
        client.force_authenticate(user=customer_user)
        response = client.post('/api/staff/logistics/sync/')
        assert response.status_code == 403

    def test_customer_rejected_on_create_task(self, customer_user):
        """Customer must not be able to create Onfleet tasks."""
        client = APIClient()
        client.force_authenticate(user=customer_user)
        response = client.post('/api/staff/logistics/create-task/', {
            'booking_id': '00000000-0000-0000-0000-000000000000',
        }, format='json')
        assert response.status_code == 403


# ============================================================
# H4: lock_account must not crash
# ============================================================

@pytest.mark.django_db
class TestLockAccount:
    """H4: lock_account must work without crashing."""

    def test_lock_account_does_not_crash(self, staff_user):
        """lock_account() must not raise AttributeError from timezone.timedelta."""
        profile = staff_user.staff_profile
        # This should not raise AttributeError
        profile.lock_account(minutes=30)
        assert profile.account_locked_until is not None
        assert profile.is_account_locked is True

    def test_unlock_account_works(self, staff_user):
        """unlock_account should clear the lock."""
        profile = staff_user.staff_profile
        profile.lock_account(minutes=30)
        profile.unlock_account()
        assert profile.is_account_locked is False
        assert profile.login_attempts == 0


# ============================================================
# L1: StaffAction must accept 'view_booking' type
# ============================================================

@pytest.mark.django_db
class TestStaffActionTypes:
    """L1: StaffAction must accept view_booking as a valid action_type."""

    def test_view_booking_is_valid_action_type(self, staff_user):
        """Creating a StaffAction with 'view_booking' must pass full_clean validation."""
        action = StaffAction.log_action(
            staff_user=staff_user,
            action_type='view_booking',
            description='Viewed booking TT-000001',
        )
        assert action is not None
        assert action.action_type == 'view_booking'
        # Must also pass Django's choices validation
        action.full_clean()  # Raises ValidationError if not in ACTION_TYPES

    def test_invalid_action_type_is_caught(self, staff_user):
        """StaffAction.full_clean() should reject truly invalid types."""
        action = StaffAction(
            staff_user=staff_user,
            action_type='hack_the_planet',
            description='Invalid action',
        )
        from django.core.exceptions import ValidationError
        with pytest.raises(ValidationError):
            action.full_clean()
