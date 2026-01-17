"""
Pricing utility functions for bookings.
Separated from views.py to avoid circular imports.
"""


def calculate_geographic_surcharge_from_zips(pickup_zip, delivery_zip, fallback_is_outside=False):
    """
    Calculate $175 surcharge for EACH address outside core service area.
    Returns surcharge in cents: 0, 17500, or 35000.

    If ZIP codes not provided, falls back to is_outside_core_area boolean (legacy).
    """
    from .zip_codes import validate_service_area

    surcharge_count = 0

    if pickup_zip or delivery_zip:
        # New behavior: check each ZIP independently
        if pickup_zip:
            _, pickup_surcharge, _, _ = validate_service_area(pickup_zip)
            if pickup_surcharge:
                surcharge_count += 1

        if delivery_zip:
            _, delivery_surcharge, _, _ = validate_service_area(delivery_zip)
            if delivery_surcharge:
                surcharge_count += 1
    elif fallback_is_outside:
        # Legacy fallback: boolean flag (charges only once)
        surcharge_count = 1

    return 17500 * surcharge_count
