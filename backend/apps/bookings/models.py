# backend/apps/bookings/models.py
import uuid
from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User
from django.core.validators import RegexValidator
from datetime import timedelta


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
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.email})"


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
    
    SERVICE_TYPE_CHOICES = [
        ('mini_move', 'Mini Move'),
        ('standard_delivery', 'Standard Delivery'),
        ('specialty_item', 'Specialty Item'),
        ('blade_transfer', 'BLADE Airport Transfer'),
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
    
    def save(self, *args, **kwargs):
        # Generate booking number if new
        if not self.booking_number:
            last_booking = Booking.objects.order_by('created_at').last()
            if last_booking and last_booking.booking_number:
                last_num = int(last_booking.booking_number.split('-')[1])
                next_num = last_num + 1
            else:
                next_num = 1
            self.booking_number = f"TT-{next_num:06d}"
        
        # ========== AUTO-SET GEOGRAPHIC SURCHARGE (NEW) ==========
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
        """Calculate BLADE ready time based on flight time"""
        if self.service_type == 'blade_transfer' and self.blade_flight_time:
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
        
        # ✅ FIX: $50 COI fee for Standard Delivery and Specialty Items
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
        """Calculate $175 surcharge for 30+ miles from Manhattan"""
        if self.is_outside_core_area:
            return 17500
        return 0
    
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
        from apps.services.models import StandardDeliveryConfig, SurchargeRule
        
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
                active_surcharges = SurchargeRule.objects.filter(is_active=True)
                for surcharge in active_surcharges:
                    surcharge_amount = surcharge.calculate_surcharge(
                        self.base_price_cents, 
                        self.pickup_date,
                        self.service_type
                    )
                    self.surcharge_cents += surcharge_amount
            
            self.geographic_surcharge_cents = self.calculate_geographic_surcharge()
            self.time_window_surcharge_cents = self.calculate_time_window_surcharge()
        
        # Standard Delivery pricing
        elif self.service_type == 'standard_delivery':
            try:
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
                    
            except StandardDeliveryConfig.DoesNotExist:
                pass
            
            # Weekend surcharges
            if self.pickup_date:
                active_surcharges = SurchargeRule.objects.filter(is_active=True)
                for surcharge in active_surcharges:
                    surcharge_amount = surcharge.calculate_surcharge(
                        self.base_price_cents, 
                        self.pickup_date,
                        self.service_type
                    )
                    self.surcharge_cents += surcharge_amount
            
            # ✅ FIX: Apply geographic surcharge and COI fee
            self.geographic_surcharge_cents = self.calculate_geographic_surcharge()
            self.coi_fee_cents = self.calculate_coi_fee()
        
        # Specialty Item pricing
        elif self.service_type == 'specialty_item':
            specialty_total = 0
            for booking_item in self.bookingspecialtyitem_set.all():
                specialty_total += booking_item.subtotal_cents
            self.base_price_cents = specialty_total
            
            # ✅ FIX: Apply same-day delivery surcharge for specialty items
            if self.is_same_day_delivery:
                try:
                    config = StandardDeliveryConfig.objects.filter(is_active=True).first()
                    if config:
                        self.same_day_surcharge_cents = config.same_day_flat_rate_cents
                except StandardDeliveryConfig.DoesNotExist:
                    pass
            
            # ✅ FIX: Apply weekend surcharges
            if self.pickup_date:
                active_surcharges = SurchargeRule.objects.filter(is_active=True)
                for surcharge in active_surcharges:
                    surcharge_amount = surcharge.calculate_surcharge(
                        self.base_price_cents, 
                        self.pickup_date,
                        self.service_type
                    )
                    self.surcharge_cents += surcharge_amount
            
            # ✅ FIX: Apply geographic surcharge and COI fee
            self.geographic_surcharge_cents = self.calculate_geographic_surcharge()
            self.coi_fee_cents = self.calculate_coi_fee()
        
        # Calculate total
        self.total_price_cents = (
            self.base_price_cents + 
            self.surcharge_cents + 
            self.same_day_surcharge_cents +
            self.coi_fee_cents + 
            self.organizing_total_cents +
            self.organizing_tax_cents +
            self.geographic_surcharge_cents +
            self.time_window_surcharge_cents
        )
    
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
        
        if self.organizing_total_cents > 0:
            breakdown['organizing_services'] = self.get_organizing_services_breakdown()
        
        if self.service_type == 'blade_transfer':
            breakdown['blade_details'] = {
                'airport': self.blade_airport,
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