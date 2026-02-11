# backend/apps/bookings/models.py
import uuid
from django.db import models, transaction
from django.utils import timezone
from django.contrib.auth.models import User
from django.core.validators import RegexValidator
from datetime import timedelta, time


def check_same_day_restriction(pickup_date):
    """
    Check if booking falls into restricted same-day window
    
    Rules:
    1. If pickup_date is today → BLOCKED
    2. If booking time is after 6 PM and pickup_date is tomorrow → BLOCKED
    
    Returns: (is_blocked: bool, error_message: str or None)
    """
    if not pickup_date:
        return False, None
    
    now = timezone.localtime(timezone.now())  # ✅ This gets EST time (13:54 = 1:54 PM)
    booking_date = now.date()
    booking_time = now.time()
    cutoff_time = time(18, 0)  # 6:00 PM
    next_day = booking_date + timedelta(days=1)
    
    # Rule 1: Same day pickup
    if pickup_date == booking_date:
        return True, "Same-day bookings must be arranged through Tote Taxi Customer Service. Please call (631) 595-5100."
    
    # Rule 2: After 6 PM for next day
    if booking_time >= cutoff_time and pickup_date == next_day:
        return True, "Bookings made after 6 PM for next-day service must be arranged through Tote Taxi Customer Service. Please call (631) 595-5100."
    
    return False, None


class Address(models.Model):
    """Address for pickup/delivery - can be saved by customer or one-time"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    customer = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='booking_addresses'
    )
    
    address_line_1 = models.CharField(max_length=200)
    address_line_2 = models.CharField(max_length=200, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=2, choices=[
        ('NY', 'New York'),
        ('CT', 'Connecticut'), 
        ('NJ', 'New Jersey'),
    ])
    zip_code = models.CharField(max_length=10)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'bookings_address'
        indexes = [
            models.Index(fields=['customer']),
            models.Index(fields=['zip_code']),
        ]
    
    def __str__(self):
        return f"{self.address_line_1}, {self.city}, {self.state} {self.zip_code}"


class GuestCheckout(models.Model):
    """Guest customer info for non-authenticated bookings"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(
        max_length=20, 
        validators=[RegexValidator(regex=r'^\+?1?\d{9,15}$')]
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'bookings_guest_checkout'
        indexes = [
            models.Index(fields=['email']),
        ]
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.email})"


class DiscountCode(models.Model):
    """Discount/promo codes for bookings"""

    DISCOUNT_TYPE_CHOICES = [
        ('percentage', 'Percentage'),
        ('fixed', 'Fixed Amount'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=50, unique=True, db_index=True)
    description = models.CharField(max_length=200, blank=True)

    discount_type = models.CharField(max_length=10, choices=DISCOUNT_TYPE_CHOICES)
    discount_value = models.PositiveIntegerField(
        help_text="Percentage (e.g. 20 for 20%) or fixed amount in cents (e.g. 5000 for $50)"
    )

    max_uses = models.PositiveIntegerField(
        null=True, blank=True,
        help_text="Maximum total uses. Null = unlimited."
    )
    max_uses_per_customer = models.PositiveIntegerField(
        default=1,
        help_text="Maximum uses per customer/email address"
    )
    valid_from = models.DateTimeField(default=timezone.now)
    valid_until = models.DateTimeField(
        null=True, blank=True,
        help_text="Expiration date. Null = never expires."
    )
    minimum_order_cents = models.PositiveIntegerField(
        default=0,
        help_text="Minimum order total (pre-discount) in cents"
    )
    maximum_discount_cents = models.PositiveIntegerField(
        null=True, blank=True,
        help_text="Cap the discount amount (for percentage codes). Null = no cap."
    )

    allowed_service_types = models.JSONField(
        default=list, blank=True,
        help_text="Service types this code applies to. Empty = all services."
    )

    is_active = models.BooleanField(default=True)
    times_used = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'bookings_discount_code'

    def __str__(self):
        if self.discount_type == 'percentage':
            return f"{self.code} - {self.discount_value}% off"
        return f"{self.code} - ${self.discount_value / 100:.2f} off"

    @property
    def discount_value_display(self):
        if self.discount_type == 'percentage':
            return f"{self.discount_value}%"
        return f"${self.discount_value / 100:.2f}"

    def is_valid(self):
        """Check if discount code is currently valid (ignoring per-customer limits)"""
        if not self.is_active:
            return False, "This discount code is no longer active."

        now = timezone.now()
        if self.valid_from and now < self.valid_from:
            return False, "This discount code is not yet active."
        if self.valid_until and now > self.valid_until:
            return False, "This discount code has expired."
        if self.max_uses is not None and self.times_used >= self.max_uses:
            return False, "This discount code has reached its usage limit."

        return True, None

    def is_valid_for_customer(self, email):
        """Check if a specific customer/email can use this code"""
        is_valid, error = self.is_valid()
        if not is_valid:
            return False, error

        usage_count = self.usages.filter(customer_email__iexact=email).count()
        if usage_count >= self.max_uses_per_customer:
            return False, "You have already used this discount code."

        return True, None

    def is_valid_for_service(self, service_type):
        """Check if code applies to a specific service type"""
        if not self.allowed_service_types:
            return True
        return service_type in self.allowed_service_types

    def calculate_discount(self, subtotal_cents):
        """Calculate discount amount in cents for a given subtotal"""
        if self.discount_type == 'percentage':
            discount = int(subtotal_cents * self.discount_value / 100)
            if self.maximum_discount_cents is not None:
                discount = min(discount, self.maximum_discount_cents)
        else:
            discount = self.discount_value

        return min(discount, subtotal_cents)

    def record_usage(self, email, booking=None):
        """Record that this code was used"""
        DiscountCodeUsage.objects.create(
            discount_code=self,
            customer_email=email,
            booking=booking,
        )
        self.times_used = models.F('times_used') + 1
        self.save(update_fields=['times_used'])
        self.refresh_from_db(fields=['times_used'])


class DiscountCodeUsage(models.Model):
    """Track per-customer discount code usage"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    discount_code = models.ForeignKey(
        DiscountCode, on_delete=models.CASCADE, related_name='usages'
    )
    customer_email = models.EmailField()
    booking = models.ForeignKey(
        'Booking', on_delete=models.SET_NULL, null=True, blank=True
    )
    used_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'bookings_discount_code_usage'
        indexes = [
            models.Index(fields=['discount_code', 'customer_email'], name='discount_usage_customer_idx'),
        ]

    def __str__(self):
        return f"{self.discount_code.code} used by {self.customer_email}"


class BookingSpecialtyItem(models.Model):
    """Through model to track quantity of each specialty item per booking"""
    booking = models.ForeignKey('Booking', on_delete=models.CASCADE)
    specialty_item = models.ForeignKey('services.SpecialtyItem', on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField(default=1)
    
    class Meta:
        db_table = 'bookings_booking_specialty_item'
        unique_together = ('booking', 'specialty_item')
        ordering = ['specialty_item__name']
    
    def __str__(self):
        return f"{self.booking.booking_number} - {self.quantity}x {self.specialty_item.name}"
    
    @property
    def subtotal_cents(self):
        return self.specialty_item.price_cents * self.quantity
    
    @property
    def subtotal_dollars(self):
        return self.subtotal_cents / 100


class Booking(models.Model):
    """Core booking - works with customer OR guest checkout - WITH SERVICES INTEGRATION + BLADE"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('paid', 'Paid'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    VALID_TRANSITIONS = {
        'pending': ['confirmed', 'paid', 'cancelled'],
        'confirmed': ['paid', 'cancelled'],
        'paid': ['completed', 'cancelled'],
        'completed': [],  # terminal
        'cancelled': [],  # terminal
    }

    SERVICE_TYPE_CHOICES = [
        ('mini_move', 'Mini Move'),
        ('standard_delivery', 'Standard Delivery'),
        ('specialty_item', 'Specialty Item'),
        ('blade_transfer', 'Airport Transfer'),
    ]
    
    PICKUP_TIME_CHOICES = [
        ('morning', '8 AM - 11 AM'),
        ('morning_specific', 'Specific 1-hour window (surcharge applies)'),
        ('no_time_preference', 'No time preference (available for certain packages)'),
    ]
    
    BLADE_AIRPORT_CHOICES = [
        ('JFK', 'JFK International Airport'),
        ('EWR', 'Newark Liberty International Airport'),
    ]

    TRANSFER_DIRECTION_CHOICES = [
        ('to_airport', 'To Airport'),
        ('from_airport', 'From Airport'),
    ]

    VALID_TERMINALS = {
        'JFK': ['1', '4', '5', '7', '8'],
        'EWR': ['A', 'B', 'C'],
    }
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking_number = models.CharField(max_length=20, unique=True, blank=True)
    
    customer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='bookings'
    )
    guest_checkout = models.OneToOneField(
        GuestCheckout,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='booking'
    )
    
    service_type = models.CharField(max_length=20, choices=SERVICE_TYPE_CHOICES)
    
    # Mini Move fields
    mini_move_package = models.ForeignKey(
        'services.MiniMovePackage',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        help_text="Selected mini move package (Petite/Standard/Full)"
    )
    include_packing = models.BooleanField(
        default=False,
        help_text="Include professional packing service for this Mini Move tier"
    )
    include_unpacking = models.BooleanField(
        default=False,
        help_text="Include professional unpacking service for this Mini Move tier"
    )
    
    # Standard Delivery fields
    standard_delivery_item_count = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Number of items for standard delivery"
    )
    item_description = models.TextField(
        null=True,
        blank=True,
        help_text="Customer description of items for standard delivery"
    )
    is_same_day_delivery = models.BooleanField(
        default=False,
        help_text="Same-day delivery (flat $360 rate)"
    )
    specialty_items = models.ManyToManyField(
        'services.SpecialtyItem',
        through='BookingSpecialtyItem',
        blank=True,
        help_text="Selected specialty items with quantities"
    )
    
    # BLADE Airport Transfer fields
    blade_airport = models.CharField(
        max_length=3,
        choices=BLADE_AIRPORT_CHOICES,
        null=True,
        blank=True,
        help_text="Destination airport for BLADE transfer"
    )
    blade_flight_date = models.DateField(
        null=True, 
        blank=True,
        help_text="Date of BLADE flight"
    )
    blade_flight_time = models.TimeField(
        null=True, 
        blank=True,
        help_text="Time of BLADE flight departure"
    )
    blade_bag_count = models.PositiveIntegerField(
        null=True, 
        blank=True,
        help_text="Number of bags for BLADE transfer (minimum 2)"
    )
    blade_ready_time = models.TimeField(
        null=True,
        blank=True,
        help_text="Auto-calculated: when bags must be ready for pickup"
    )
    transfer_direction = models.CharField(
        max_length=15,
        choices=TRANSFER_DIRECTION_CHOICES,
        default='to_airport',
        help_text="Transfer direction: to airport or from airport"
    )
    blade_terminal = models.CharField(
        max_length=2,
        null=True,
        blank=True,
        help_text="Airport terminal (JFK: 1/4/5/7/8, EWR: A/B/C)"
    )

    # Address and scheduling
    pickup_address = models.ForeignKey(
        Address, 
        on_delete=models.PROTECT, 
        related_name='pickup_bookings'
    )
    delivery_address = models.ForeignKey(
        Address, 
        on_delete=models.PROTECT, 
        related_name='delivery_bookings'
    )
    
    pickup_date = models.DateField()
    pickup_time = models.CharField(
        max_length=30,
        choices=PICKUP_TIME_CHOICES,
        default='morning'
    )
    
    specific_pickup_hour = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        choices=[
            (8, '8:00 AM - 9:00 AM'),
            (9, '9:00 AM - 10:00 AM'),
            (10, '10:00 AM - 11:00 AM'),
        ],
        help_text="Specific hour for 1-hour window pickup"
    )
    
    special_instructions = models.TextField(blank=True)
    coi_required = models.BooleanField(default=False)
    
    is_outside_core_area = models.BooleanField(
        default=False,
        help_text="True if pickup/delivery is 30+ miles from Manhattan"
    )
    
    # Pricing fields
    base_price_cents = models.PositiveBigIntegerField(default=0)
    surcharge_cents = models.PositiveBigIntegerField(default=0)
    same_day_surcharge_cents = models.PositiveBigIntegerField(
        default=0,
        help_text="Same-day delivery surcharge ($360)"
    )
    coi_fee_cents = models.PositiveBigIntegerField(default=0)
    organizing_total_cents = models.PositiveBigIntegerField(
        default=0,
        help_text="Total cost for packing and unpacking services"
    )
    geographic_surcharge_cents = models.PositiveBigIntegerField(
        default=0,
        help_text="$175 surcharge for 30+ miles from Manhattan"
    )
    time_window_surcharge_cents = models.PositiveBigIntegerField(
        default=0,
        help_text="Surcharge for specific 1-hour window"
    )
    organizing_tax_cents = models.PositiveBigIntegerField(
        default=0,
        help_text="Tax on organizing services"
    )
    total_price_cents = models.PositiveBigIntegerField(default=0)

    # Discount fields
    discount_code = models.ForeignKey(
        'DiscountCode',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='bookings',
    )
    discount_amount_cents = models.PositiveBigIntegerField(default=0)
    pre_discount_total_cents = models.PositiveBigIntegerField(default=0)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    deleted_at = models.DateTimeField(null=True, blank=True)
    reminder_sent_at = models.DateTimeField(null=True, blank=True, help_text='When 24hr reminder email was sent')

    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'bookings_booking'
        constraints = [
            models.CheckConstraint(
                check=(
                    models.Q(customer__isnull=False, guest_checkout__isnull=True) |
                    models.Q(customer__isnull=True, guest_checkout__isnull=False)
                ),
                name='booking_exactly_one_customer_type'
            )
        ]
        indexes = [
            models.Index(fields=['booking_number'], name='bookings_booking_number_idx'),
            models.Index(fields=['pickup_date', 'status'], name='bookings_pickup_status_idx'),
            models.Index(fields=['customer', 'created_at'], name='bookings_customer_created_idx'),
            models.Index(fields=['status', 'pickup_date'], name='bookings_status_pickup_idx'),
            models.Index(fields=['created_at'], name='bookings_created_idx'),
            models.Index(fields=['service_type'], name='bookings_service_type_idx'),
        ]
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Track original status so signals can detect real transitions (L17)
        self._original_status = self.status

    def save(self, *args, **kwargs):
        skip_pricing = kwargs.pop('_skip_pricing', False)

        # Generate booking number if new
        if not self.booking_number:
            with transaction.atomic():
                last_booking = (
                    Booking.objects
                    .filter(booking_number__isnull=False)
                    .select_for_update()
                    .order_by('-booking_number')
                    .first()
                )
                if last_booking and last_booking.booking_number:
                    last_num = int(last_booking.booking_number.split('-')[1])
                    next_num = last_num + 1
                else:
                    next_num = 1
                self.booking_number = f"TT-{next_num:06d}"

        if not skip_pricing:
            # ========== AUTO-SET GEOGRAPHIC SURCHARGE ==========
            if self.pickup_address and self.delivery_address:
                from .zip_codes import validate_service_area

                # Validate pickup ZIP
                pickup_valid, pickup_surcharge, _, _ = validate_service_area(
                    self.pickup_address.zip_code
                )

                # Validate delivery ZIP
                delivery_valid, delivery_surcharge, _, _ = validate_service_area(
                    self.delivery_address.zip_code
                )

                # Apply surcharge if EITHER address is in surcharge zone
                self.is_outside_core_area = pickup_surcharge or delivery_surcharge
            # ========== END AUTO-SET GEOGRAPHIC SURCHARGE ==========

            self.calculate_pricing()

        super().save(*args, **kwargs)
        # Keep _original_status in sync so the signal detects the next transition
        self._original_status = self.status

    def __str__(self):
        customer_name = self.get_customer_name()
        return f"{self.booking_number} - {customer_name} - ${self.total_price_dollars}"
    
    def get_customer_name(self):
        if self.customer:
            return self.customer.get_full_name()
        elif self.guest_checkout:
            return f"{self.guest_checkout.first_name} {self.guest_checkout.last_name}"
        return "Unknown"
    
    def get_customer_email(self):
        if self.customer:
            return self.customer.email
        elif self.guest_checkout:
            return self.guest_checkout.email
        return None
    
    @property
    def total_price_dollars(self):
        return self.total_price_cents / 100
    
    @property
    def base_price_dollars(self):
        return self.base_price_cents / 100
    
    @property
    def surcharge_dollars(self):
        return self.surcharge_cents / 100
    
    @property
    def same_day_surcharge_dollars(self):
        return self.same_day_surcharge_cents / 100
    
    @property
    def coi_fee_dollars(self):
        return self.coi_fee_cents / 100
    
    @property
    def organizing_total_dollars(self):
        return self.organizing_total_cents / 100
    
    @property
    def geographic_surcharge_dollars(self):
        return self.geographic_surcharge_cents / 100
    
    @property
    def time_window_surcharge_dollars(self):
        return self.time_window_surcharge_cents / 100
    
    @property
    def organizing_tax_dollars(self):
        return self.organizing_tax_cents / 100

    @property
    def discount_amount_dollars(self):
        return self.discount_amount_cents / 100

    @property
    def pre_discount_total_dollars(self):
        return self.pre_discount_total_cents / 100
            
    def get_pickup_time_display(self):
        """
        Override Django's auto-generated method to include specific hour.
        Returns formatted pickup time with actual hour window when applicable.
        """
        if self.pickup_time == 'morning_specific' and self.specific_pickup_hour is not None:
            start = self.specific_pickup_hour
            end = start + 1
            
            # Format hours (handle 12 PM properly)
            def format_hour(h):
                if h == 12:
                    return "12:00 PM"
                elif h > 12:
                    return f"{h - 12}:00 PM"
                else:
                    return f"{h}:00 AM"
            
            return f"{format_hour(start)} - {format_hour(end)} (1-hour window)"
        
        # Use Django's default display for other choices
        return dict(self.PICKUP_TIME_CHOICES).get(self.pickup_time, self.pickup_time)
    
    
    def calculate_blade_ready_time(self):
        """Calculate BLADE ready time based on flight time (to_airport only)"""
        if self.service_type == 'blade_transfer' and self.blade_flight_time:
            if self.transfer_direction == 'from_airport':
                self.blade_ready_time = None
                return
            from datetime import time
            if self.blade_flight_time < time(13, 0):
                self.blade_ready_time = time(5, 0)
            else:
                self.blade_ready_time = time(10, 0)
    
    def calculate_organizing_costs(self):
        """Calculate organizing service costs based on Mini Move tier"""
        if self.service_type != 'mini_move' or not self.mini_move_package:
            return 0
        
        from apps.services.models import OrganizingService
        
        total_organizing_cents = 0
        tier = self.mini_move_package.package_type
        
        if self.include_packing:
            try:
                packing_service = OrganizingService.objects.get(
                    mini_move_tier=tier,
                    is_packing_service=True,
                    is_active=True
                )
                total_organizing_cents += packing_service.price_cents
            except OrganizingService.DoesNotExist:
                pass
        
        if self.include_unpacking:
            try:
                unpacking_service = OrganizingService.objects.get(
                    mini_move_tier=tier,
                    is_packing_service=False,
                    is_active=True
                )
                total_organizing_cents += unpacking_service.price_cents
            except OrganizingService.DoesNotExist:
                pass
        
        return total_organizing_cents
    
    def calculate_coi_fee(self):
        """Calculate COI fee - $50 for Standard Delivery, Specialty Items, and Petite Mini Moves"""
        if not self.coi_required:
            return 0
        
        # $50 COI fee for Standard Delivery and Specialty Items
        if self.service_type in ['standard_delivery', 'specialty_item']:
            return 5000
        
        # Mini Move COI logic
        if self.service_type == 'mini_move' and self.mini_move_package:
            if self.mini_move_package.package_type == 'petite':
                return 5000
            elif not self.mini_move_package.coi_included:
                return self.mini_move_package.coi_fee_cents
        
        return 0
    
    def calculate_geographic_surcharge(self):
        """
        Calculate $175 surcharge for EACH address 30+ miles from Manhattan.
        If both pickup AND delivery are outside core area, charges $350 total.
        """
        if not self.pickup_address or not self.delivery_address:
            return 0

        from .zip_codes import validate_service_area

        surcharge_count = 0

        # Check pickup address
        _, pickup_surcharge, _, _ = validate_service_area(
            self.pickup_address.zip_code
        )
        if pickup_surcharge:
            surcharge_count += 1

        # Check delivery address
        _, delivery_surcharge, _, _ = validate_service_area(
            self.delivery_address.zip_code
        )
        if delivery_surcharge:
            surcharge_count += 1

        # $175 per out-of-zone address
        return 17500 * surcharge_count
    
    def calculate_time_window_surcharge(self):
        """Calculate $175 surcharge for 1-hour window selection"""
        if self.pickup_time == 'morning_specific':
            if self.service_type == 'mini_move' and self.mini_move_package:
                if self.mini_move_package.package_type == 'standard':
                    return 17500
                elif self.mini_move_package.package_type == 'full':
                    return 0
        return 0
    
    def calculate_organizing_tax(self):
        """Calculate tax on organizing services - 8.25%"""
        if self.organizing_total_cents > 0:
            return int(self.organizing_total_cents * 0.0825)
        return 0
    
    def calculate_pricing(self):
        """Calculate total pricing using services pricing engine + BLADE support"""
        from apps.services.models import StandardDeliveryConfig, calculate_surcharges_for_date
        
        self.base_price_cents = 0
        self.surcharge_cents = 0
        self.same_day_surcharge_cents = 0
        self.coi_fee_cents = 0
        self.organizing_total_cents = 0
        self.geographic_surcharge_cents = 0
        self.time_window_surcharge_cents = 0
        self.organizing_tax_cents = 0
        
        # BLADE pricing
        if self.service_type == 'blade_transfer':
            if self.blade_bag_count:
                per_bag_price = 7500  # $75 per bag in cents
                self.base_price_cents = self.blade_bag_count * per_bag_price
                self.base_price_cents = max(self.base_price_cents, 15000)
            
            self.calculate_blade_ready_time()
        
        # Mini Move pricing
        elif self.service_type == 'mini_move' and self.mini_move_package:
            self.base_price_cents = self.mini_move_package.base_price_cents
            
            self.organizing_total_cents = self.calculate_organizing_costs()
            self.organizing_tax_cents = self.calculate_organizing_tax()
            self.coi_fee_cents = self.calculate_coi_fee()
            
            if self.pickup_date:
                self.surcharge_cents = calculate_surcharges_for_date(
                    self.base_price_cents,
                    self.pickup_date,
                    self.service_type
                )

            self.geographic_surcharge_cents = self.calculate_geographic_surcharge()
            self.time_window_surcharge_cents = self.calculate_time_window_surcharge()

        # Standard Delivery pricing
        elif self.service_type == 'standard_delivery':
            config = StandardDeliveryConfig.objects.filter(is_active=True).first()
            if config:
                if self.standard_delivery_item_count and self.standard_delivery_item_count > 0:
                    item_total = config.price_per_item_cents * self.standard_delivery_item_count
                    self.base_price_cents = max(item_total, config.minimum_charge_cents)
                else:
                    self.base_price_cents = 0

                if self.specialty_items.exists():
                    specialty_total = 0
                    for booking_item in self.bookingspecialtyitem_set.all():
                        specialty_total += booking_item.subtotal_cents
                    self.base_price_cents += specialty_total

                # Apply same-day delivery surcharge
                if self.is_same_day_delivery:
                    self.same_day_surcharge_cents = config.same_day_flat_rate_cents
            
            # Weekend/peak date surcharges
            if self.pickup_date:
                self.surcharge_cents = calculate_surcharges_for_date(
                    self.base_price_cents,
                    self.pickup_date,
                    self.service_type
                )

            self.geographic_surcharge_cents = self.calculate_geographic_surcharge()
            self.coi_fee_cents = self.calculate_coi_fee()

        # Specialty Item pricing
        elif self.service_type == 'specialty_item':
            specialty_total = 0
            for booking_item in self.bookingspecialtyitem_set.all():
                specialty_total += booking_item.subtotal_cents
            self.base_price_cents = specialty_total
            
            # Apply same-day delivery surcharge for specialty items
            if self.is_same_day_delivery:
                config = StandardDeliveryConfig.objects.filter(is_active=True).first()
                if config:
                    self.same_day_surcharge_cents = config.same_day_flat_rate_cents
            
            # Apply weekend/peak date surcharges
            if self.pickup_date:
                self.surcharge_cents = calculate_surcharges_for_date(
                    self.base_price_cents,
                    self.pickup_date,
                    self.service_type
                )

            self.geographic_surcharge_cents = self.calculate_geographic_surcharge()
            self.coi_fee_cents = self.calculate_coi_fee()
        
        # Calculate total
        pre_discount = (
            self.base_price_cents +
            self.surcharge_cents +
            self.same_day_surcharge_cents +
            self.coi_fee_cents +
            self.organizing_total_cents +
            self.organizing_tax_cents +
            self.geographic_surcharge_cents +
            self.time_window_surcharge_cents
        )
        self.pre_discount_total_cents = pre_discount

        if self.discount_code_id and self.discount_amount_cents > 0:
            self.total_price_cents = max(0, pre_discount - self.discount_amount_cents)
        else:
            self.total_price_cents = pre_discount
    
    def get_pricing_breakdown(self):
        """Return detailed pricing breakdown for display"""
        breakdown = {
            'base_price_dollars': self.base_price_dollars,
            'surcharge_dollars': self.surcharge_dollars,
            'same_day_surcharge_dollars': self.same_day_surcharge_dollars,
            'coi_fee_dollars': self.coi_fee_dollars,
            'organizing_total_dollars': self.organizing_total_dollars,
            'organizing_tax_dollars': self.organizing_tax_dollars,
            'geographic_surcharge_dollars': self.geographic_surcharge_dollars,
            'time_window_surcharge_dollars': self.time_window_surcharge_dollars,
            'total_price_dollars': self.total_price_dollars,
            'service_type': self.get_service_type_display(),
        }
        
        if self.discount_amount_cents > 0:
            breakdown['discount_amount_dollars'] = self.discount_amount_dollars
            breakdown['pre_discount_total_dollars'] = self.pre_discount_total_dollars
            if self.discount_code:
                breakdown['discount_code'] = self.discount_code.code
                breakdown['discount_description'] = self.discount_code.discount_value_display

        if self.organizing_total_cents > 0:
            breakdown['organizing_services'] = self.get_organizing_services_breakdown()

        if self.service_type == 'blade_transfer':
            breakdown['blade_details'] = {
                'airport': self.blade_airport,
                'transfer_direction': self.transfer_direction,
                'terminal': self.blade_terminal,
                'bag_count': self.blade_bag_count,
                'per_bag_price': 75,
                'flight_date': self.blade_flight_date.isoformat() if self.blade_flight_date else None,
                'flight_time': self.blade_flight_time.isoformat() if self.blade_flight_time else None,
                'ready_time': self.blade_ready_time.isoformat() if self.blade_ready_time else None,
            }
        
        return breakdown
    
    def get_organizing_services_breakdown(self):
        """Get detailed breakdown of organizing services"""
        if self.service_type != 'mini_move' or not self.mini_move_package:
            return {}
        
        from apps.services.models import OrganizingService
        
        services = []
        tier = self.mini_move_package.package_type
        
        if self.include_packing:
            try:
                packing_service = OrganizingService.objects.get(
                    mini_move_tier=tier,
                    is_packing_service=True,
                    is_active=True
                )
                services.append({
                    'name': packing_service.name,
                    'price_dollars': packing_service.price_dollars,
                    'duration_hours': packing_service.duration_hours,
                    'organizer_count': packing_service.organizer_count,
                    'supplies_allowance': packing_service.supplies_allowance_dollars
                })
            except OrganizingService.DoesNotExist:
                pass
        
        if self.include_unpacking:
            try:
                unpacking_service = OrganizingService.objects.get(
                    mini_move_tier=tier,
                    is_packing_service=False,
                    is_active=True
                )
                services.append({
                    'name': unpacking_service.name,
                    'price_dollars': unpacking_service.price_dollars,
                    'duration_hours': unpacking_service.duration_hours,
                    'organizer_count': unpacking_service.organizer_count,
                    'supplies_allowance': 0
                })
            except OrganizingService.DoesNotExist:
                pass
        
        return services