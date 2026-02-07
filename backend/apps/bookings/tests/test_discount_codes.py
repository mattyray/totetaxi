# backend/apps/bookings/tests/test_discount_codes.py
import pytest
from django.utils import timezone
from datetime import timedelta, time
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from apps.bookings.models import DiscountCode, DiscountCodeUsage, Booking, Address
from apps.customers.models import CustomerProfile


@pytest.fixture
def percentage_discount(db):
    return DiscountCode.objects.create(
        code='SAVE20',
        discount_type='percentage',
        discount_value=20,
        max_uses=100,
        max_uses_per_customer=1,
        is_active=True,
    )


@pytest.fixture
def fixed_discount(db):
    return DiscountCode.objects.create(
        code='FIFTY_OFF',
        discount_type='fixed',
        discount_value=5000,  # $50
        max_uses=50,
        max_uses_per_customer=2,
        is_active=True,
    )


@pytest.fixture
def expired_discount(db):
    return DiscountCode.objects.create(
        code='EXPIRED',
        discount_type='percentage',
        discount_value=10,
        valid_until=timezone.now() - timedelta(days=1),
        is_active=True,
    )


@pytest.fixture
def service_restricted_discount(db):
    return DiscountCode.objects.create(
        code='MINIMOVE10',
        discount_type='percentage',
        discount_value=10,
        allowed_service_types=['mini_move'],
        is_active=True,
    )


@pytest.fixture
def capped_percentage_discount(db):
    return DiscountCode.objects.create(
        code='BIG50',
        discount_type='percentage',
        discount_value=50,
        maximum_discount_cents=10000,  # $100 cap
        is_active=True,
    )


@pytest.fixture
def min_order_discount(db):
    return DiscountCode.objects.create(
        code='MIN500',
        discount_type='percentage',
        discount_value=10,
        minimum_order_cents=50000,  # $500 minimum
        is_active=True,
    )


@pytest.fixture
def api_client():
    return APIClient()


# === Model Tests ===


@pytest.mark.django_db
class TestDiscountCodeModel:

    def test_percentage_discount_calculation(self, percentage_discount):
        assert percentage_discount.calculate_discount(10000) == 2000  # 20% of $100

    def test_fixed_discount_calculation(self, fixed_discount):
        assert fixed_discount.calculate_discount(10000) == 5000  # $50 off $100

    def test_discount_cannot_exceed_total(self, fixed_discount):
        assert fixed_discount.calculate_discount(3000) == 3000  # $50 off $30 = $30 max

    def test_percentage_with_maximum_cap(self, capped_percentage_discount):
        # 50% of $1000 = $500, but capped at $100
        assert capped_percentage_discount.calculate_discount(100000) == 10000

    def test_percentage_under_cap(self, capped_percentage_discount):
        # 50% of $100 = $50, under $100 cap
        assert capped_percentage_discount.calculate_discount(10000) == 5000

    def test_is_valid_active_code(self, percentage_discount):
        is_valid, error = percentage_discount.is_valid()
        assert is_valid is True
        assert error is None

    def test_is_valid_inactive_code(self, db):
        code = DiscountCode.objects.create(
            code='INACTIVE', discount_type='percentage',
            discount_value=10, is_active=False,
        )
        is_valid, error = code.is_valid()
        assert is_valid is False
        assert 'no longer active' in error

    def test_is_valid_expired_code(self, expired_discount):
        is_valid, error = expired_discount.is_valid()
        assert is_valid is False
        assert 'expired' in error

    def test_is_valid_not_yet_active(self, db):
        code = DiscountCode.objects.create(
            code='FUTURE', discount_type='percentage',
            discount_value=10,
            valid_from=timezone.now() + timedelta(days=7),
        )
        is_valid, error = code.is_valid()
        assert is_valid is False
        assert 'not yet active' in error

    def test_is_valid_max_uses_reached(self, db):
        code = DiscountCode.objects.create(
            code='MAXED', discount_type='percentage',
            discount_value=10, max_uses=5, times_used=5,
        )
        is_valid, error = code.is_valid()
        assert is_valid is False
        assert 'usage limit' in error

    def test_is_valid_for_customer_first_use(self, percentage_discount):
        is_valid, error = percentage_discount.is_valid_for_customer('new@example.com')
        assert is_valid is True

    def test_is_valid_for_customer_already_used(self, percentage_discount):
        DiscountCodeUsage.objects.create(
            discount_code=percentage_discount,
            customer_email='used@example.com',
        )
        is_valid, error = percentage_discount.is_valid_for_customer('used@example.com')
        assert is_valid is False
        assert 'already used' in error

    def test_is_valid_for_customer_case_insensitive(self, percentage_discount):
        DiscountCodeUsage.objects.create(
            discount_code=percentage_discount,
            customer_email='User@Example.com',
        )
        is_valid, _ = percentage_discount.is_valid_for_customer('user@example.com')
        assert is_valid is False

    def test_is_valid_for_service_allowed(self, service_restricted_discount):
        assert service_restricted_discount.is_valid_for_service('mini_move') is True

    def test_is_valid_for_service_not_allowed(self, service_restricted_discount):
        assert service_restricted_discount.is_valid_for_service('standard_delivery') is False

    def test_is_valid_for_service_empty_list(self, percentage_discount):
        assert percentage_discount.is_valid_for_service('standard_delivery') is True
        assert percentage_discount.is_valid_for_service('mini_move') is True

    def test_record_usage_increments_counter(self, percentage_discount):
        assert percentage_discount.times_used == 0
        percentage_discount.record_usage(email='test@example.com')
        assert percentage_discount.times_used == 1

    def test_record_usage_creates_usage_record(self, percentage_discount):
        percentage_discount.record_usage(email='test@example.com')
        assert DiscountCodeUsage.objects.filter(
            discount_code=percentage_discount,
            customer_email='test@example.com'
        ).exists()

    def test_str_percentage(self, percentage_discount):
        assert 'SAVE20' in str(percentage_discount)
        assert '20%' in str(percentage_discount)

    def test_str_fixed(self, fixed_discount):
        assert 'FIFTY_OFF' in str(fixed_discount)
        assert '$50.00' in str(fixed_discount)

    def test_discount_value_display_percentage(self, percentage_discount):
        assert percentage_discount.discount_value_display == '20%'

    def test_discount_value_display_fixed(self, fixed_discount):
        assert fixed_discount.discount_value_display == '$50.00'


# === API Tests: validate-discount endpoint ===


@pytest.mark.django_db
class TestValidateDiscountEndpoint:

    def test_validate_valid_code(self, api_client, percentage_discount):
        response = api_client.post('/api/public/validate-discount/', {
            'code': 'SAVE20',
            'email': 'test@example.com',
            'service_type': 'mini_move',
            'subtotal_cents': 50000,
        })
        assert response.status_code == 200
        assert response.data['valid'] is True
        assert response.data['discount_type'] == 'percentage'
        assert response.data['discount_amount_cents'] == 10000  # 20% of $500

    def test_validate_invalid_code(self, api_client):
        response = api_client.post('/api/public/validate-discount/', {
            'code': 'DOESNOTEXIST',
            'email': 'test@example.com',
        })
        assert response.status_code == 404

    def test_validate_expired_code(self, api_client, expired_discount):
        response = api_client.post('/api/public/validate-discount/', {
            'code': 'EXPIRED',
            'email': 'test@example.com',
        })
        assert response.status_code == 400
        assert 'expired' in response.data['error']

    def test_validate_already_used(self, api_client, percentage_discount):
        DiscountCodeUsage.objects.create(
            discount_code=percentage_discount,
            customer_email='used@example.com',
        )
        response = api_client.post('/api/public/validate-discount/', {
            'code': 'SAVE20',
            'email': 'used@example.com',
        })
        assert response.status_code == 400
        assert 'already used' in response.data['error']

    def test_validate_wrong_service_type(self, api_client, service_restricted_discount):
        response = api_client.post('/api/public/validate-discount/', {
            'code': 'MINIMOVE10',
            'email': 'test@example.com',
            'service_type': 'standard_delivery',
        })
        assert response.status_code == 400
        assert 'does not apply' in response.data['error']

    def test_validate_below_minimum_order(self, api_client, min_order_discount):
        response = api_client.post('/api/public/validate-discount/', {
            'code': 'MIN500',
            'email': 'test@example.com',
            'subtotal_cents': 10000,  # $100, below $500 min
        })
        assert response.status_code == 400
        assert 'Minimum order' in response.data['error']

    def test_validate_missing_email(self, api_client, percentage_discount):
        response = api_client.post('/api/public/validate-discount/', {
            'code': 'SAVE20',
        })
        assert response.status_code == 400
        assert 'Email' in response.data['error']

    def test_validate_missing_code(self, api_client):
        response = api_client.post('/api/public/validate-discount/', {
            'email': 'test@example.com',
        })
        assert response.status_code == 400

    def test_validate_case_insensitive(self, api_client, percentage_discount):
        response = api_client.post('/api/public/validate-discount/', {
            'code': 'save20',
            'email': 'test@example.com',
        })
        assert response.status_code == 200
        assert response.data['valid'] is True


# === Booking Model with Discount ===


@pytest.mark.django_db
class TestBookingWithDiscount:

    def test_booking_stores_discount_fields(self, percentage_discount):
        pickup = Address.objects.create(
            address_line_1='123 Test St', city='New York', state='NY', zip_code='10001'
        )
        delivery = Address.objects.create(
            address_line_1='456 Test Ave', city='New York', state='NY', zip_code='10002'
        )
        user = User.objects.create_user(
            username='disctest', email='disc@example.com', password='testpass123'
        )
        CustomerProfile.objects.create(user=user, phone='5551234567')

        booking = Booking(
            customer=user,
            service_type='blade_transfer',
            pickup_date=timezone.now().date() + timedelta(days=7),
            pickup_address=pickup,
            delivery_address=delivery,
            blade_airport='JFK',
            blade_flight_date=timezone.now().date() + timedelta(days=7),
            blade_flight_time=time(14, 0),
            blade_bag_count=3,
            discount_code=percentage_discount,
            discount_amount_cents=4500,  # 20% of $225
        )
        booking.save()

        booking.refresh_from_db()
        assert booking.discount_code == percentage_discount
        assert booking.discount_amount_cents == 4500
        assert booking.pre_discount_total_cents == 22500  # 3 bags * $75
        assert booking.total_price_cents == 18000  # $225 - $45

    def test_pricing_breakdown_includes_discount(self, percentage_discount):
        pickup = Address.objects.create(
            address_line_1='123 Test St', city='New York', state='NY', zip_code='10001'
        )
        delivery = Address.objects.create(
            address_line_1='456 Test Ave', city='New York', state='NY', zip_code='10002'
        )
        user = User.objects.create_user(
            username='breaktest', email='break@example.com', password='testpass123'
        )
        CustomerProfile.objects.create(user=user, phone='5551234567')

        booking = Booking.objects.create(
            customer=user,
            service_type='blade_transfer',
            pickup_date=timezone.now().date() + timedelta(days=7),
            pickup_address=pickup,
            delivery_address=delivery,
            blade_airport='JFK',
            blade_flight_date=timezone.now().date() + timedelta(days=7),
            blade_flight_time=time(14, 0),
            blade_bag_count=3,
            discount_code=percentage_discount,
            discount_amount_cents=4500,
        )

        breakdown = booking.get_pricing_breakdown()
        assert 'discount_amount_dollars' in breakdown
        assert breakdown['discount_amount_dollars'] == 45.0
        assert breakdown['discount_code'] == 'SAVE20'

    def test_booking_without_discount_unchanged(self):
        pickup = Address.objects.create(
            address_line_1='123 Test St', city='New York', state='NY', zip_code='10001'
        )
        delivery = Address.objects.create(
            address_line_1='456 Test Ave', city='New York', state='NY', zip_code='10002'
        )
        user = User.objects.create_user(
            username='nodisc', email='nodisc@example.com', password='testpass123'
        )
        CustomerProfile.objects.create(user=user, phone='5551234567')

        booking = Booking.objects.create(
            customer=user,
            service_type='blade_transfer',
            pickup_date=timezone.now().date() + timedelta(days=7),
            pickup_address=pickup,
            delivery_address=delivery,
            blade_airport='JFK',
            blade_flight_date=timezone.now().date() + timedelta(days=7),
            blade_flight_time=time(14, 0),
            blade_bag_count=3,
        )

        assert booking.discount_amount_cents == 0
        assert booking.total_price_cents == booking.pre_discount_total_cents
        breakdown = booking.get_pricing_breakdown()
        assert 'discount_amount_dollars' not in breakdown
