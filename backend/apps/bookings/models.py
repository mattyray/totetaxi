import uuid
from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User
from django.core.validators import RegexValidator


class Address(models.Model):
    """Address for pickup/delivery - can be saved by customer or one-time"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Optional customer link (for saved addresses)
    customer = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='booking_addresses'
    )
    
    # Address fields
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


class Booking(models.Model):
    """Core booking - works with customer OR guest checkout - WITH SERVICES INTEGRATION"""
    
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
    ]
    
    # UPDATED: Only morning pickup time available
    PICKUP_TIME_CHOICES = [
        ('morning', '8 AM - 11 AM'),
        ('morning_specific', 'Specific 1-hour window (surcharge applies)'),
        ('no_time_preference', 'No time preference (available for certain packages)'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking_number = models.CharField(max_length=20, unique=True, blank=True)
    
    # Customer - EITHER customer OR guest_checkout
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
    
    # Service details
    service_type = models.CharField(max_length=20, choices=SERVICE_TYPE_CHOICES)
    
    # SERVICE CONNECTIONS
    # For Mini Move bookings
    mini_move_package = models.ForeignKey(
        'services.MiniMovePackage',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        help_text="Selected mini move package (Petite/Standard/Full)"
    )
    
    # For Standard Delivery bookings  
    standard_delivery_item_count = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Number of items for standard delivery"
    )
    is_same_day_delivery = models.BooleanField(
        default=False,
        help_text="Same-day delivery (flat $360 rate)"
    )
    
    # For Specialty Item bookings
    specialty_items = models.ManyToManyField(
        'services.SpecialtyItem',
        blank=True,
        help_text="Selected specialty items (Peloton, Surfboard, etc.)"
    )
    
    # NEW: ORGANIZING SERVICES (tied to Mini Move packages)
    include_packing = models.BooleanField(
        default=False,
        help_text="Include professional packing service for this Mini Move tier"
    )
    include_unpacking = models.BooleanField(
        default=False,
        help_text="Include professional unpacking service for this Mini Move tier"
    )
    
    # Addresses
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
    
    # Date and preferences - UPDATED: Only morning times
    pickup_date = models.DateField()
    pickup_time = models.CharField(
        max_length=30,
        choices=PICKUP_TIME_CHOICES,
        default='morning'
    )
    
    # NEW: Specific time window for morning_specific option
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
    
    # Special requirements
    special_instructions = models.TextField(blank=True)
    coi_required = models.BooleanField(default=False)
    
    # NEW: Geographic surcharge tracking
    is_outside_core_area = models.BooleanField(
        default=False,
        help_text="True if pickup/delivery is 30+ miles from Manhattan"
    )
    
    # CALCULATED PRICING - Updated to include new fees
    base_price_cents = models.PositiveBigIntegerField(default=0)
    surcharge_cents = models.PositiveBigIntegerField(default=0)
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
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Soft delete
    deleted_at = models.DateTimeField(null=True, blank=True)
    
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
        if not self.booking_number:
            # Simple booking number generation
            last_booking = Booking.objects.order_by('created_at').last()
            if last_booking and last_booking.booking_number:
                last_num = int(last_booking.booking_number.split('-')[1])
                next_num = last_num + 1
            else:
                next_num = 1
            self.booking_number = f"TT-{next_num:06d}"
        
        # Calculate pricing before saving
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
    
    def calculate_organizing_costs(self):
        """Calculate organizing service costs based on Mini Move tier"""
        if self.service_type != 'mini_move' or not self.mini_move_package:
            return 0
        
        from apps.services.models import OrganizingService
        
        total_organizing_cents = 0
        tier = self.mini_move_package.package_type
        
        # Add packing service cost
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
        
        # Add unpacking service cost
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
        """Calculate COI fee - $50 for Petite moves if required"""
        if not self.coi_required:
            return 0
        
        if self.service_type == 'mini_move' and self.mini_move_package:
            # Petite moves require $50 COI charge
            if self.mini_move_package.package_type == 'petite':
                return 5000  # $50 in cents
            # Other packages may have different COI handling
            elif not self.mini_move_package.coi_included:
                return self.mini_move_package.coi_fee_cents
        
        return 0
    
    def calculate_geographic_surcharge(self):
        """Calculate $175 surcharge for 30+ miles from Manhattan"""
        if self.is_outside_core_area:
            return 17500  # $175 in cents
        return 0
    
    def calculate_time_window_surcharge(self):
        """Calculate surcharge for 1-hour window selection"""
        if self.pickup_time == 'morning_specific':
            if self.service_type == 'mini_move' and self.mini_move_package:
                # Standard package: surcharge applies
                if self.mini_move_package.package_type == 'standard':
                    return 2500  # $25 surcharge for example
                # Full package: free
                elif self.mini_move_package.package_type == 'full':
                    return 0
        return 0
    
    def calculate_organizing_tax(self):
        """Calculate tax on organizing services (NYC rate: 8.25%)"""
        if self.organizing_total_cents > 0:
            return int(self.organizing_total_cents * 0.0825)
        return 0
    
    def calculate_pricing(self):
        """Calculate total pricing using services pricing engine + all new features"""
        from apps.services.models import StandardDeliveryConfig, SurchargeRule
        
        # Reset pricing
        self.base_price_cents = 0
        self.surcharge_cents = 0
        self.coi_fee_cents = 0
        self.organizing_total_cents = 0
        self.geographic_surcharge_cents = 0
        self.time_window_surcharge_cents = 0
        self.organizing_tax_cents = 0
        
        # Calculate base price by service type
        if self.service_type == 'mini_move' and self.mini_move_package:
            self.base_price_cents = self.mini_move_package.base_price_cents
            
            # Calculate organizing services first
            self.organizing_total_cents = self.calculate_organizing_costs()
            
            # Calculate organizing tax
            self.organizing_tax_cents = self.calculate_organizing_tax()
            
            # NEW: COI handling with $50 for Petite
            self.coi_fee_cents = self.calculate_coi_fee()
            
        elif self.service_type == 'standard_delivery' and self.standard_delivery_item_count:
            try:
                config = StandardDeliveryConfig.objects.filter(is_active=True).first()
                if config:
                    self.base_price_cents = config.calculate_total(
                        self.standard_delivery_item_count,
                        is_same_day=self.is_same_day_delivery
                    )
            except StandardDeliveryConfig.DoesNotExist:
                pass
        
        elif self.service_type == 'specialty_item':
            # Calculate total for all selected specialty items
            specialty_total = 0
            for item in self.specialty_items.all():
                specialty_total += item.price_cents
            self.base_price_cents = specialty_total
        
        # Calculate surcharges (but not for same-day delivery which has flat rate)
        if self.pickup_date and not self.is_same_day_delivery:
            active_surcharges = SurchargeRule.objects.filter(is_active=True)
            for surcharge in active_surcharges:
                surcharge_amount = surcharge.calculate_surcharge(
                    self.base_price_cents, 
                    self.pickup_date
                )
                self.surcharge_cents += surcharge_amount
        
        # NEW: Calculate additional fees
        self.geographic_surcharge_cents = self.calculate_geographic_surcharge()
        self.time_window_surcharge_cents = self.calculate_time_window_surcharge()
        
        # Calculate total (base + all surcharges + organizing + tax)
        self.total_price_cents = (
            self.base_price_cents + 
            self.surcharge_cents + 
            self.coi_fee_cents + 
            self.organizing_total_cents +
            self.organizing_tax_cents +
            self.geographic_surcharge_cents +
            self.time_window_surcharge_cents
        )
    
    def get_pricing_breakdown(self):
        """Return detailed pricing breakdown for display"""
        breakdown = {
            'base_price': self.base_price_dollars,
            'surcharges': self.surcharge_dollars,
            'coi_fee': self.coi_fee_dollars,
            'organizing_total': self.organizing_total_dollars,
            'organizing_tax': self.organizing_tax_dollars,
            'geographic_surcharge': self.geographic_surcharge_dollars,
            'time_window_surcharge': self.time_window_surcharge_dollars,
            'total': self.total_price_dollars,
            'service_type': self.get_service_type_display(),
        }
        
        # Add organizing service details if applicable
        if self.organizing_total_cents > 0:
            breakdown['organizing_services'] = self.get_organizing_services_breakdown()
        
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
                    'supplies_allowance': 0  # Unpacking doesn't include supplies
                })
            except OrganizingService.DoesNotExist:
                pass
        
        return services