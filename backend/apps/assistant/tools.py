"""
LangGraph tools for the ToteTaxi assistant.
Each tool wraps existing business logic — no DB writes.
"""
import logging
from collections import Counter
from datetime import date, timedelta
from typing import Optional

from langchain_core.tools import tool

logger = logging.getLogger(__name__)


@tool
def check_zip_coverage(zip_code: str) -> dict:
    """Check if a ZIP code is within Tote Taxi's service area.
    Returns whether the area is serviceable and if a geographic surcharge applies.

    Args:
        zip_code: The ZIP code to check (e.g., "10001")
    """
    from apps.bookings.zip_codes import validate_service_area

    is_serviceable, requires_surcharge, zone, error = validate_service_area(zip_code)

    if not is_serviceable:
        return {
            "serviceable": False,
            "message": error or f"ZIP code {zip_code} is not in our service area.",
            "suggestion": "Call (631) 595-5100 or email info@totetaxi.com for a custom quote.",
        }

    result = {
        "serviceable": True,
        "zone": zone,
        "surcharge": requires_surcharge,
    }
    if requires_surcharge:
        result["message"] = (
            f"ZIP code {zip_code} is in our service area but has a "
            f"$175 geographic surcharge per address."
        )
    else:
        result["message"] = (
            f"ZIP code {zip_code} is in our core service area with no surcharge."
        )

    return result


@tool
def get_pricing_estimate(
    service_type: str,
    pickup_zip: Optional[str] = None,
    delivery_zip: Optional[str] = None,
    mini_move_tier: Optional[str] = None,
    item_count: Optional[int] = None,
    bag_count: Optional[int] = None,
    include_packing: bool = False,
    include_unpacking: bool = False,
    coi_required: bool = False,
    is_same_day: bool = False,
) -> dict:
    """Get a pricing estimate for a Tote Taxi service.

    Args:
        service_type: One of 'mini_move', 'standard_delivery', 'specialty_item', 'blade_transfer'. For specialty items, use 'standard_delivery'.
        pickup_zip: Pickup ZIP code (for geographic surcharge calculation)
        delivery_zip: Delivery ZIP code (for geographic surcharge calculation)
        mini_move_tier: For mini moves: 'petite', 'standard', or 'full'
        item_count: Number of items (for standard_delivery)
        bag_count: Number of bags (for blade_transfer, minimum 2)
        include_packing: Whether to include packing service (mini_move only)
        include_unpacking: Whether to include unpacking service (mini_move only)
        coi_required: Whether a Certificate of Insurance is needed
        is_same_day: Whether same-day delivery is requested
    """
    from apps.bookings.zip_codes import validate_service_area
    from apps.services.models import (
        MiniMovePackage,
        OrganizingService,
        StandardDeliveryConfig,
    )

    estimate = {"service_type": service_type, "line_items": []}
    total_cents = 0

    # Geographic surcharge calculation
    geo_surcharge_cents = 0
    if pickup_zip:
        _, pickup_surcharge, _, _ = validate_service_area(pickup_zip)
        if pickup_surcharge:
            geo_surcharge_cents += 17500
    if delivery_zip:
        _, delivery_surcharge, _, _ = validate_service_area(delivery_zip)
        if delivery_surcharge:
            geo_surcharge_cents += 17500

    if service_type == "mini_move":
        if not mini_move_tier:
            return {"error": "Please specify a mini move tier: petite, standard, or full."}
        try:
            package = MiniMovePackage.objects.get(
                package_type=mini_move_tier, is_active=True
            )
        except MiniMovePackage.DoesNotExist:
            return {"error": f'Mini move tier "{mini_move_tier}" not found.'}

        estimate["line_items"].append(
            {"label": f"{package.name}", "amount": package.base_price_cents / 100}
        )
        total_cents += package.base_price_cents

        organizing_cents = 0
        if include_packing:
            svc = OrganizingService.objects.filter(
                mini_move_tier=mini_move_tier, is_packing_service=True, is_active=True
            ).first()
            if svc:
                estimate["line_items"].append(
                    {"label": "Professional Packing", "amount": svc.price_cents / 100}
                )
                organizing_cents += svc.price_cents
        if include_unpacking:
            svc = OrganizingService.objects.filter(
                mini_move_tier=mini_move_tier, is_packing_service=False, is_active=True
            ).first()
            if svc:
                estimate["line_items"].append(
                    {"label": "Professional Unpacking", "amount": svc.price_cents / 100}
                )
                organizing_cents += svc.price_cents

        total_cents += organizing_cents
        if organizing_cents > 0:
            tax = int(organizing_cents * 0.0825)
            estimate["line_items"].append(
                {"label": "Organizing Tax (8.25%)", "amount": tax / 100}
            )
            total_cents += tax

        if coi_required and not package.coi_included:
            coi_fee = package.coi_fee_cents
            estimate["line_items"].append({"label": "COI Fee", "amount": coi_fee / 100})
            total_cents += coi_fee

    elif service_type == "standard_delivery":
        if not item_count or item_count < 1:
            return {
                "error": "Please specify the number of items for standard delivery."
            }
        config = StandardDeliveryConfig.objects.filter(is_active=True).first()
        if not config:
            return {"error": "Standard delivery configuration not available."}

        item_total = config.price_per_item_cents * item_count
        base = max(item_total, config.minimum_charge_cents)
        estimate["line_items"].append(
            {
                "label": f"{item_count} item{'s' if item_count != 1 else ''} @ ${config.price_per_item_cents / 100:.0f}/item",
                "amount": base / 100,
            }
        )
        total_cents += base

        if is_same_day:
            estimate["line_items"].append(
                {
                    "label": "Same-Day Surcharge",
                    "amount": config.same_day_flat_rate_cents / 100,
                }
            )
            total_cents += config.same_day_flat_rate_cents

        if coi_required:
            estimate["line_items"].append({"label": "COI Fee", "amount": 50.00})
            total_cents += 5000

    elif service_type == "blade_transfer":
        if not bag_count or bag_count < 2:
            return {"error": "Airport Transfer requires a minimum of 2 bags."}
        base = max(bag_count * 7500, 15000)
        estimate["line_items"].append(
            {
                "label": f"{bag_count} bags @ $75/bag",
                "amount": base / 100,
            }
        )
        total_cents += base

    elif service_type == "specialty_item":
        estimate["note"] = (
            "Specialty item pricing depends on the specific items. "
            "Please use the booking wizard for an exact quote, or call (631) 595-5100."
        )
        return estimate

    else:
        return {"error": f"Unknown service type: {service_type}"}

    if geo_surcharge_cents > 0:
        estimate["line_items"].append(
            {"label": "Geographic Surcharge", "amount": geo_surcharge_cents / 100}
        )
        total_cents += geo_surcharge_cents

    estimate["estimated_total"] = total_cents / 100
    estimate["disclaimer"] = (
        "Final pricing is confirmed at checkout. "
        "Weekend/peak surcharges may apply based on pickup date."
    )

    return estimate


@tool
def check_availability(start_date: str, num_days: int = 14) -> dict:
    """Check booking availability for a date range.

    Args:
        start_date: Start date in YYYY-MM-DD format
        num_days: Number of days to check (max 30, default 14)
    """
    from apps.bookings.models import Booking, check_same_day_restriction
    from apps.services.models import SurchargeRule

    try:
        start = date.fromisoformat(start_date)
    except ValueError:
        return {"error": "Invalid date format. Use YYYY-MM-DD."}

    if start < date.today():
        return {"error": "Cannot check availability for past dates."}

    num_days = min(num_days, 30)
    end = start + timedelta(days=num_days)

    bookings = Booking.objects.filter(
        pickup_date__gte=start,
        pickup_date__lte=end,
        deleted_at__isnull=True,
    ).values_list("pickup_date", flat=True)

    counts = Counter(bookings)
    surcharge_rules = list(SurchargeRule.objects.filter(is_active=True))

    dates = []
    current = start
    while current <= end:
        day_blocked, day_msg = check_same_day_restriction(current)
        surcharges = [r.name for r in surcharge_rules if r.applies_to_date(current)]

        booking_count = counts.get(current, 0)
        dates.append(
            {
                "date": current.isoformat(),
                "availability": "busy" if booking_count >= 8 else "available",
                "is_weekend": current.weekday() >= 5,
                "surcharges": surcharges if surcharges else None,
                "blocked": day_blocked,
                "blocked_reason": day_msg,
            }
        )
        current += timedelta(days=1)

    return {
        "dates": dates,
        "summary": (
            f"Showing availability from {start.isoformat()} to {end.isoformat()}."
        ),
    }


@tool
def lookup_booking_status(user_id: int) -> dict:
    """Look up the most recent bookings for the currently logged-in customer.
    Only call this for authenticated users.

    Args:
        user_id: The authenticated user's ID (provided by the system)
    """
    from apps.bookings.models import Booking

    bookings = (
        Booking.objects.filter(
            customer_id=user_id,
            deleted_at__isnull=True,
        )
        .order_by("-created_at")[:5]
    )

    if not bookings:
        return {"bookings": [], "message": "No bookings found for your account."}

    result = []
    for b in bookings:
        entry = {
            "booking_number": b.booking_number,
            "service": b.get_service_type_display(),
            "status": b.get_status_display(),
            "pickup_date": b.pickup_date.isoformat() if b.pickup_date else None,
            "total": f"${b.total_price_dollars:.2f}",
        }
        result.append(entry)

    return {"bookings": result}


@tool
def lookup_booking_history(user_id: int) -> dict:
    """Look up the full booking history and stats for the currently logged-in customer.
    Only call this for authenticated users.

    Args:
        user_id: The authenticated user's ID (provided by the system)
    """
    from django.db.models import Sum

    from apps.bookings.models import Booking

    all_bookings = Booking.objects.filter(
        customer_id=user_id,
        deleted_at__isnull=True,
    )

    total_count = all_bookings.count()
    completed = all_bookings.filter(status="completed").count()
    upcoming = all_bookings.filter(
        status="paid",
        pickup_date__gte=date.today(),
    ).count()
    total_spent = (
        all_bookings.filter(
            status__in=["paid", "completed"],
        ).aggregate(total=Sum("total_price_cents"))["total"]
        or 0
    )

    return {
        "total_bookings": total_count,
        "completed": completed,
        "upcoming": upcoming,
        "total_spent": f"${total_spent / 100:,.2f}",
    }


@tool
def build_booking_handoff(
    service_type: Optional[str] = None,
    mini_move_tier: Optional[str] = None,
    item_count: Optional[int] = None,
    item_description: Optional[str] = None,
    bag_count: Optional[int] = None,
    transfer_direction: Optional[str] = None,
    airport: Optional[str] = None,
    terminal: Optional[str] = None,
    flight_date: Optional[str] = None,
    flight_time: Optional[str] = None,
    pickup_address_line_1: Optional[str] = None,
    pickup_city: Optional[str] = None,
    pickup_state: Optional[str] = None,
    pickup_zip: Optional[str] = None,
    delivery_address_line_1: Optional[str] = None,
    delivery_city: Optional[str] = None,
    delivery_state: Optional[str] = None,
    delivery_zip: Optional[str] = None,
    pickup_date: Optional[str] = None,
    include_packing: Optional[bool] = None,
    include_unpacking: Optional[bool] = None,
    coi_required: Optional[bool] = None,
    special_instructions: Optional[str] = None,
) -> dict:
    """Build a pre-filled booking when the customer is ready to book.
    Returns data that the frontend uses to pre-populate the booking wizard.
    Fill in ALL fields the customer has mentioned during the conversation.

    Args:
        service_type: One of 'mini_move', 'standard_delivery', 'blade_transfer'. For specialty items, use 'standard_delivery' with item_count=0.
        mini_move_tier: For mini moves: 'petite', 'standard', or 'full'
        item_count: Number of items (for standard delivery)
        item_description: Description of items being delivered
        bag_count: Number of bags (for airport transfer)
        transfer_direction: 'to_airport' or 'from_airport'
        airport: 'JFK' or 'EWR'
        terminal: Airport terminal (JFK: '1','4','5','7','8'; EWR: 'A','B','C')
        flight_date: Flight date in YYYY-MM-DD format (for airport transfers)
        flight_time: Flight departure/arrival time in HH:MM format, 24-hour (e.g. '14:00' for 2 PM)
        pickup_address_line_1: Pickup street address (e.g. '12 Main St')
        pickup_city: Pickup city (e.g. 'New York')
        pickup_state: Pickup state - must be 'NY', 'CT', or 'NJ'
        pickup_zip: Pickup ZIP code (e.g. '10011')
        delivery_address_line_1: Delivery street address
        delivery_city: Delivery city (e.g. 'Southampton')
        delivery_state: Delivery state - must be 'NY', 'CT', or 'NJ'
        delivery_zip: Delivery ZIP code (e.g. '11968')
        pickup_date: Preferred pickup date in YYYY-MM-DD format
        include_packing: Whether customer wants packing services
        include_unpacking: Whether customer wants unpacking services
        coi_required: Whether customer needs Certificate of Insurance
        special_instructions: Any special instructions from the customer
    """
    prefill = {}
    if service_type:
        prefill["service_type"] = service_type
    if mini_move_tier:
        prefill["package_type"] = mini_move_tier
    if item_count is not None:
        prefill["standard_delivery_item_count"] = item_count
    if item_description:
        prefill["item_description"] = item_description
    if bag_count:
        prefill["blade_bag_count"] = bag_count
    if transfer_direction:
        prefill["transfer_direction"] = transfer_direction
    if airport:
        prefill["blade_airport"] = airport
    if terminal:
        prefill["blade_terminal"] = terminal
    if flight_date:
        prefill["blade_flight_date"] = flight_date
    if flight_time:
        prefill["blade_flight_time"] = flight_time
    if pickup_date:
        prefill["pickup_date"] = pickup_date
    if include_packing is not None:
        prefill["include_packing"] = include_packing
    if include_unpacking is not None:
        prefill["include_unpacking"] = include_unpacking
    if coi_required is not None:
        prefill["coi_required"] = coi_required
    if special_instructions:
        prefill["special_instructions"] = special_instructions[:500]

    # Build pickup address if any fields provided
    if any([pickup_address_line_1, pickup_city, pickup_state, pickup_zip]):
        prefill["pickup_address"] = {
            "address_line_1": pickup_address_line_1 or "",
            "city": pickup_city or "",
            "state": pickup_state or "NY",
            "zip_code": pickup_zip or "",
        }

    # Build delivery address if any fields provided
    if any([delivery_address_line_1, delivery_city, delivery_state, delivery_zip]):
        prefill["delivery_address"] = {
            "address_line_1": delivery_address_line_1 or "",
            "city": delivery_city or "",
            "state": delivery_state or "NY",
            "zip_code": delivery_zip or "",
        }

    return {
        "action": "open_booking_wizard",
        "prefill_data": prefill,
        "message": (
            "I've prepared the booking wizard with your details. "
            "Click the button below to continue booking!"
        ),
    }
