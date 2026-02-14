"""
Tests for assistant tools — these test real business logic wrappers.
No LLM mocking needed — tools are pure business logic.
"""
import pytest
from datetime import date, timedelta
from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.assistant.tools import (
    build_booking_handoff,
    check_availability,
    check_zip_coverage,
    get_pricing_estimate,
    lookup_booking_history,
    lookup_booking_status,
)

User = get_user_model()


@pytest.mark.django_db
class TestCheckZipCoverage(TestCase):
    def test_core_area_zip_manhattan(self):
        result = check_zip_coverage.invoke({"zip_code": "10001"})
        assert result["serviceable"] is True
        assert result["surcharge"] is False
        assert result["zone"] == "core"

    def test_core_area_zip_brooklyn(self):
        result = check_zip_coverage.invoke({"zip_code": "11201"})
        assert result["serviceable"] is True
        assert result["surcharge"] is False

    def test_surcharge_area_zip_nj(self):
        result = check_zip_coverage.invoke({"zip_code": "07101"})
        assert result["serviceable"] is True
        assert result["surcharge"] is True
        assert "$175" in result["message"]

    def test_outside_service_area(self):
        result = check_zip_coverage.invoke({"zip_code": "90210"})
        assert result["serviceable"] is False
        assert "suggestion" in result

    def test_empty_zip(self):
        result = check_zip_coverage.invoke({"zip_code": ""})
        assert result["serviceable"] is False


@pytest.mark.django_db
class TestGetPricingEstimate(TestCase):
    @classmethod
    def setUpTestData(cls):
        from apps.services.models import MiniMovePackage, StandardDeliveryConfig

        cls.petite = MiniMovePackage.objects.create(
            package_type="petite",
            name="Petite Move",
            description="For small families",
            base_price_cents=99500,
            max_items=15,
            coi_included=False,
            coi_fee_cents=5000,
            is_active=True,
        )
        cls.standard_config = StandardDeliveryConfig.objects.create(
            price_per_item_cents=9500,
            minimum_items=3,
            minimum_charge_cents=28500,
            same_day_flat_rate_cents=36000,
            is_active=True,
        )

    def test_mini_move_petite_pricing(self):
        result = get_pricing_estimate.invoke(
            {"service_type": "mini_move", "mini_move_tier": "petite"}
        )
        assert "error" not in result
        assert result["estimated_total"] == 995.00
        assert len(result["line_items"]) == 1
        assert "disclaimer" in result

    def test_mini_move_with_coi(self):
        result = get_pricing_estimate.invoke(
            {
                "service_type": "mini_move",
                "mini_move_tier": "petite",
                "coi_required": True,
            }
        )
        assert result["estimated_total"] == 1045.00  # 995 + 50

    def test_mini_move_missing_tier(self):
        result = get_pricing_estimate.invoke({"service_type": "mini_move"})
        assert "error" in result

    def test_standard_delivery_3_items(self):
        result = get_pricing_estimate.invoke(
            {"service_type": "standard_delivery", "item_count": 3}
        )
        assert result["estimated_total"] == 285.00  # minimum charge

    def test_standard_delivery_5_items(self):
        result = get_pricing_estimate.invoke(
            {"service_type": "standard_delivery", "item_count": 5}
        )
        assert result["estimated_total"] == 475.00  # 5 * 95

    def test_standard_delivery_same_day(self):
        result = get_pricing_estimate.invoke(
            {
                "service_type": "standard_delivery",
                "item_count": 3,
                "is_same_day": True,
            }
        )
        assert result["estimated_total"] == 645.00  # 285 + 360

    def test_standard_delivery_missing_count(self):
        result = get_pricing_estimate.invoke({"service_type": "standard_delivery"})
        assert "error" in result

    def test_blade_transfer_2_bags(self):
        result = get_pricing_estimate.invoke(
            {"service_type": "blade_transfer", "bag_count": 2}
        )
        assert result["estimated_total"] == 150.00  # minimum

    def test_blade_transfer_4_bags(self):
        result = get_pricing_estimate.invoke(
            {"service_type": "blade_transfer", "bag_count": 4}
        )
        assert result["estimated_total"] == 300.00  # 4 * 75

    def test_blade_transfer_minimum_bags(self):
        result = get_pricing_estimate.invoke(
            {"service_type": "blade_transfer", "bag_count": 1}
        )
        assert "error" in result

    def test_specialty_item_returns_note(self):
        result = get_pricing_estimate.invoke({"service_type": "specialty_item"})
        assert "note" in result
        assert "booking wizard" in result["note"]

    def test_geographic_surcharge_both_addresses(self):
        result = get_pricing_estimate.invoke(
            {
                "service_type": "blade_transfer",
                "bag_count": 2,
                "pickup_zip": "07101",  # NJ surcharge
                "delivery_zip": "07101",  # NJ surcharge
            }
        )
        # 150 (bags) + 350 (2 * 175 geo surcharge)
        assert result["estimated_total"] == 500.00

    def test_geographic_surcharge_one_address(self):
        result = get_pricing_estimate.invoke(
            {
                "service_type": "blade_transfer",
                "bag_count": 2,
                "pickup_zip": "10001",  # core, no surcharge
                "delivery_zip": "07101",  # NJ surcharge
            }
        )
        assert result["estimated_total"] == 325.00  # 150 + 175

    def test_unknown_service_type(self):
        result = get_pricing_estimate.invoke({"service_type": "helicopter"})
        assert "error" in result


@pytest.mark.django_db
class TestCheckAvailability(TestCase):
    def test_future_dates(self):
        start = (date.today() + timedelta(days=7)).isoformat()
        result = check_availability.invoke({"start_date": start, "num_days": 7})
        assert "dates" in result
        assert len(result["dates"]) == 8  # inclusive

    def test_invalid_date_format(self):
        result = check_availability.invoke({"start_date": "not-a-date"})
        assert "error" in result

    def test_past_date(self):
        result = check_availability.invoke({"start_date": "2020-01-01"})
        assert "error" in result

    def test_max_days_capped(self):
        start = (date.today() + timedelta(days=1)).isoformat()
        result = check_availability.invoke({"start_date": start, "num_days": 100})
        # Should cap at 30
        assert len(result["dates"]) == 31  # inclusive


@pytest.mark.django_db
class TestLookupBookingStatus(TestCase):
    @classmethod
    def setUpTestData(cls):
        from apps.bookings.models import Address, Booking
        from apps.services.models import MiniMovePackage

        cls.user = User.objects.create_user(
            username="testcustomer", email="test@example.com", password="testpass123"
        )
        cls.package = MiniMovePackage.objects.create(
            package_type="petite",
            name="Petite Move",
            description="Test",
            base_price_cents=99500,
            is_active=True,
        )
        pickup = Address.objects.create(
            address_line_1="123 Main St", city="New York", state="NY", zip_code="10001"
        )
        delivery = Address.objects.create(
            address_line_1="456 Broadway", city="New York", state="NY", zip_code="10002"
        )
        cls.booking = Booking(
            customer=cls.user,
            service_type="mini_move",
            mini_move_package=cls.package,
            status="paid",
            pickup_date=date.today() + timedelta(days=7),
            total_price_cents=99500,
            pickup_address=pickup,
            delivery_address=delivery,
        )
        cls.booking.save(_skip_pricing=True)

    def test_returns_customer_bookings(self):
        result = lookup_booking_status.invoke({"user_id": self.user.id})
        assert len(result["bookings"]) == 1
        assert result["bookings"][0]["booking_number"] == self.booking.booking_number
        assert result["bookings"][0]["status"] == "Paid"

    def test_no_bookings(self):
        other_user = User.objects.create_user(
            username="other", email="other@example.com", password="testpass123"
        )
        result = lookup_booking_status.invoke({"user_id": other_user.id})
        assert result["bookings"] == []
        assert "No bookings" in result["message"]


@pytest.mark.django_db
class TestLookupBookingHistory(TestCase):
    @classmethod
    def setUpTestData(cls):
        from apps.bookings.models import Address, Booking
        from apps.services.models import MiniMovePackage

        cls.user = User.objects.create_user(
            username="historyuser", email="history@example.com", password="testpass123"
        )
        cls.package = MiniMovePackage.objects.create(
            package_type="standard",
            name="Standard Move",
            description="Test",
            base_price_cents=195000,
            is_active=True,
        )
        pickup = Address.objects.create(
            address_line_1="123 Main St", city="New York", state="NY", zip_code="10001"
        )
        delivery = Address.objects.create(
            address_line_1="456 Broadway", city="New York", state="NY", zip_code="10002"
        )
        # Create completed and upcoming bookings
        b1 = Booking(
            customer=cls.user,
            service_type="mini_move",
            mini_move_package=cls.package,
            status="completed",
            pickup_date=date.today() - timedelta(days=30),
            total_price_cents=195000,
            pickup_address=pickup,
            delivery_address=delivery,
        )
        b1.save(_skip_pricing=True)
        pickup2 = Address.objects.create(
            address_line_1="789 Park Ave", city="New York", state="NY", zip_code="10003"
        )
        delivery2 = Address.objects.create(
            address_line_1="321 5th Ave", city="New York", state="NY", zip_code="10004"
        )
        b2 = Booking(
            customer=cls.user,
            service_type="mini_move",
            mini_move_package=cls.package,
            status="paid",
            pickup_date=date.today() + timedelta(days=14),
            total_price_cents=195000,
            pickup_address=pickup2,
            delivery_address=delivery2,
        )
        b2.save(_skip_pricing=True)

    def test_returns_stats(self):
        result = lookup_booking_history.invoke({"user_id": self.user.id})
        assert result["total_bookings"] == 2
        assert result["completed"] == 1
        assert result["upcoming"] == 1
        assert result["total_spent"] == "$3,900.00"


class TestBuildBookingHandoff(TestCase):
    def test_mini_move_handoff(self):
        result = build_booking_handoff.invoke(
            {"service_type": "mini_move", "mini_move_tier": "standard"}
        )
        assert result["action"] == "open_booking_wizard"
        assert result["prefill_data"]["service_type"] == "mini_move"
        assert result["prefill_data"]["package_type"] == "standard"

    def test_blade_transfer_handoff(self):
        result = build_booking_handoff.invoke(
            {
                "service_type": "blade_transfer",
                "bag_count": 3,
                "airport": "JFK",
                "transfer_direction": "to_airport",
            }
        )
        assert result["prefill_data"]["blade_airport"] == "JFK"
        assert result["prefill_data"]["blade_bag_count"] == 3
        assert result["prefill_data"]["transfer_direction"] == "to_airport"

    def test_empty_handoff(self):
        result = build_booking_handoff.invoke({})
        assert result["action"] == "open_booking_wizard"
        assert result["prefill_data"] == {}
