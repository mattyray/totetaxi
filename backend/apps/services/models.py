# backend/apps/services/models.py
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


class OrganizingService(models.Model):
    """Professional packing/unpacking services tied to Mini Move tiers"""
    
    ORGANIZING_TYPES = [
        ('petite_packing', 'Petite Packing'),
        ('standard_packing', 'Standard Packing'),
        ('full_packing', 'Full Packing'),
        ('petite_unpacking', 'Petite Unpacking'),
        ('standard_unpacking', 'Standard Unpacking'),
        ('full_unpacking', 'Full Unpacking'),
    ]
    
    MINI_MOVE_TIERS = [
        ('petite', 'Petite'),
        ('standard', 'Standard'),
        ('full', 'Full'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Service details
    service_type = models.CharField(max_length=30, choices=ORGANIZING_TYPES, unique=True)
    mini_move_tier = models.CharField(max_length=20, choices=MINI_MOVE_TIERS)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    
    # Pricing
    price_cents = models.PositiveBigIntegerField()
    
    # Service specs
    duration_hours = models.PositiveIntegerField()
    organizer_count = models.PositiveIntegerField()
    supplies_allowance_cents = models.PositiveBigIntegerField(
        default=0,
        help_text="Supplies allowance in cents (packing services only)"
    )
    
    # Service type classification
    is_packing_service = models.BooleanField(
        help_text="True for packing services (with supplies), False for unpacking (organizing only)"
    )
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'services_organizing_service'
        ordering = ['mini_move_tier', 'is_packing_service', 'price_cents']
    
    def __str__(self):
        return f"{self.name} - ${self.price_dollars}"
    
    @property
    def price_dollars(self):
        return self.price_cents / 100
    
    @property
    def supplies_allowance_dollars(self):
        return self.supplies_allowance_cents / 100
    
    def can_be_added_to_mini_move(self, mini_move_package_type):
        """Check if this organizing service can be added to a specific mini move tier"""
        return self.mini_move_tier == mini_move_package_type


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
    
    SERVICE_TYPE_CHOICES = [
        ('all', 'All Services'),
        ('mini_move', 'Mini Moves Only'),
        ('standard_delivery', 'Standard Delivery Only'),
        ('specialty_item', 'Specialty Items Only'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Surcharge details
    surcharge_type = models.CharField(max_length=20, choices=SURCHARGE_TYPES)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    
    # Service type filter
    applies_to_service_type = models.CharField(
        max_length=20,
        choices=SERVICE_TYPE_CHOICES,
        default='all',
        help_text='Which service types this surcharge applies to'
    )
    
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
    
    def calculate_surcharge(self, base_amount_cents, booking_date, service_type=None):
        """Calculate surcharge for given base amount, date, and service type"""
        if not self.is_active:
            return 0
        
        if not self.applies_to_date(booking_date):
            return 0
        
        if self.applies_to_service_type != 'all':
            if service_type != self.applies_to_service_type:
                return 0
        
        if self.calculation_type == 'percentage' and self.percentage:
            return int(base_amount_cents * (self.percentage / 100))
        elif self.calculation_type == 'fixed_amount' and self.fixed_amount_cents:
            return self.fixed_amount_cents
        
        return 0
    
    def applies_to_date(self, booking_date):
        """Check if surcharge rule applies to given date"""
        if self.specific_date and self.specific_date == booking_date:
            return True
        
        weekday = booking_date.weekday()
        if weekday == 5 and self.applies_saturday:
            return True
        if weekday == 6 and self.applies_sunday:
            return True
        
        return False