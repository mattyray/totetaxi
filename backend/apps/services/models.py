import uuid
from django.db import models
from django.utils import timezone
from decimal import Decimal


class MiniMovePackage(models.Model):
    """Mini Move service packages from homework: Petite, Standard, Full"""
    
    PACKAGE_TYPES = [
        ('petite', 'Petite'),
        ('standard', 'Standard'), 
        ('full', 'Full Move'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Package details
    package_type = models.CharField(max_length=20, choices=PACKAGE_TYPES, unique=True)
    name = models.CharField(max_length=50)
    description = models.TextField()
    
    # Pricing
    base_price_cents = models.PositiveBigIntegerField()
    
    # Item limits
    max_items = models.PositiveIntegerField(
        null=True, 
        blank=True,
        help_text="Maximum items allowed (null = unlimited for Full Move)"
    )
    max_weight_per_item_lbs = models.PositiveIntegerField(default=50)
    
    # COI handling
    coi_included = models.BooleanField(default=False)
    coi_fee_cents = models.PositiveBigIntegerField(
        default=5000,  # $50
        help_text="COI fee in cents if not included"
    )
    
    # Features
    priority_scheduling = models.BooleanField(default=False)
    protective_wrapping = models.BooleanField(default=False)
    
    # Marketing
    is_most_popular = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'services_mini_move_package'
        ordering = ['base_price_cents']
    
    def __str__(self):
        return f"{self.name} - ${self.base_price_dollars}"
    
    @property
    def base_price_dollars(self):
        return self.base_price_cents / 100
    
    @property
    def coi_fee_dollars(self):
        return self.coi_fee_cents / 100


class StandardDeliveryConfig(models.Model):
    """Configuration for Standard Delivery pricing from homework"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Per-item pricing
    price_per_item_cents = models.PositiveBigIntegerField(
        default=9500,  # $95
        help_text="Price per item in cents"
    )
    
    # Minimums
    minimum_items = models.PositiveIntegerField(
        default=3,
        help_text="Minimum number of items for delivery"
    )
    minimum_charge_cents = models.PositiveBigIntegerField(
        default=28500,  # $285
        help_text="Minimum delivery charge in cents"
    )
    
    # Same-day delivery
    same_day_flat_rate_cents = models.PositiveBigIntegerField(
        default=36000,  # $360
        help_text="Flat rate for same-day delivery"
    )
    
    # Item constraints
    max_weight_per_item_lbs = models.PositiveIntegerField(
        default=50,
        help_text="Maximum weight per item in pounds"
    )
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'services_standard_delivery_config'
    
    def __str__(self):
        return f"Standard Delivery - ${self.price_per_item_dollars}/item"
    
    @property
    def price_per_item_dollars(self):
        return self.price_per_item_cents / 100
    
    @property
    def minimum_charge_dollars(self):
        return self.minimum_charge_cents / 100
    
    def calculate_total(self, item_count, is_same_day=False):
        """Calculate total for standard delivery"""
        if is_same_day:
            return self.same_day_flat_rate_cents
        
        item_total = self.price_per_item_cents * item_count
        return max(item_total, self.minimum_charge_cents)


class SpecialtyItem(models.Model):
    """Specialty items from homework: Peloton, Surfboard, Crib, Wardrobe Box"""
    
    ITEM_TYPES = [
        ('peloton', 'Peloton'),
        ('surfboard', 'Surfboard'),
        ('crib', 'Crib'),
        ('wardrobe_box', 'Wardrobe Box'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Item details
    item_type = models.CharField(max_length=30, choices=ITEM_TYPES, unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    
    # Pricing
    price_cents = models.PositiveBigIntegerField()
    
    # Requirements
    requires_van_schedule = models.BooleanField(
        default=True,
        help_text="Can only be booked when van is already scheduled"
    )
    special_handling = models.BooleanField(default=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'services_specialty_item'
    
    def __str__(self):
        return f"{self.name} - ${self.price_dollars}"
    
    @property
    def price_dollars(self):
        return self.price_cents / 100


class SurchargeRule(models.Model):
    """Weekend, holiday, and peak date surcharges from homework"""
    
    SURCHARGE_TYPES = [
        ('weekend', 'Weekend Surcharge'),
        ('holiday', 'Holiday Surcharge'),
        ('peak_date', 'Peak Date Surcharge'),
    ]
    
    CALCULATION_TYPES = [
        ('percentage', 'Percentage'),
        ('fixed_amount', 'Fixed Amount'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Surcharge details
    surcharge_type = models.CharField(max_length=20, choices=SURCHARGE_TYPES)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    
    # Calculation
    calculation_type = models.CharField(max_length=20, choices=CALCULATION_TYPES)
    percentage = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="Percentage surcharge (e.g., 15.00 for 15%)"
    )
    fixed_amount_cents = models.PositiveBigIntegerField(
        null=True,
        blank=True,
        help_text="Fixed surcharge amount in cents"
    )
    
    # Date rules (for specific dates like Sept 1)
    specific_date = models.DateField(
        null=True,
        blank=True,
        help_text="Specific date for peak date surcharges"
    )
    
    # Day of week rules (for weekend surcharges)
    applies_saturday = models.BooleanField(default=False)
    applies_sunday = models.BooleanField(default=False)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'services_surcharge_rule'
    
    def __str__(self):
        return self.name
    
    def calculate_surcharge(self, base_amount_cents, booking_date):
        """Calculate surcharge for given base amount and date"""
        if not self.is_active:
            return 0
        
        # Check if rule applies to this date
        if not self.applies_to_date(booking_date):
            return 0
        
        if self.calculation_type == 'percentage' and self.percentage:
            return int(base_amount_cents * (self.percentage / 100))
        elif self.calculation_type == 'fixed_amount' and self.fixed_amount_cents:
            return self.fixed_amount_cents
        
        return 0
    
    def applies_to_date(self, booking_date):
        """Check if surcharge rule applies to given date"""
        # Specific date check
        if self.specific_date and self.specific_date == booking_date:
            return True
        
        # Weekend check
        weekday = booking_date.weekday()
        if weekday == 5 and self.applies_saturday:  # Saturday
            return True
        if weekday == 6 and self.applies_sunday:    # Sunday
            return True
        
        return False


class VanSchedule(models.Model):
    """Basic van availability for specialty item scheduling"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Schedule details
    date = models.DateField(unique=True)
    is_available = models.BooleanField(
        default=True,
        help_text="Van is available for pickups on this date"
    )
    
    # Capacity tracking
    mini_moves_booked = models.PositiveIntegerField(default=0)
    specialty_items_booked = models.PositiveIntegerField(default=0)
    max_capacity = models.PositiveIntegerField(
        default=10,
        help_text="Maximum bookings for this date"
    )
    
    # Notes
    notes = models.TextField(
        blank=True,
        help_text="Internal notes about availability or restrictions"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'services_van_schedule'
        ordering = ['date']
    
    def __str__(self):
        status = "Available" if self.is_available else "Unavailable"
        return f"{self.date} - {status} ({self.total_bookings}/{self.max_capacity})"
    
    @property
    def total_bookings(self):
        return self.mini_moves_booked + self.specialty_items_booked
    
    @property
    def has_capacity(self):
        return self.is_available and self.total_bookings < self.max_capacity
    
    @property
    def allows_specialty_items(self):
        """Specialty items only available when van is scheduled (has any bookings)"""
        return self.has_capacity and self.total_bookings > 0