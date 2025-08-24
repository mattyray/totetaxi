import uuid
from django.db import models
from django.utils import timezone
from django.conf import settings
from django.core.validators import RegexValidator


class Address(models.Model):
    """Address for pickup/delivery - can be saved by customer or one-time"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Optional customer link (for saved addresses)
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
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
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking_number = models.CharField(max_length=20, unique=True, blank=True)
    
    # Customer - EITHER customer OR guest_checkout
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
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
    
    # Date and preferences
    pickup_date = models.DateField()
    pickup_time = models.CharField(
        max_length=20,
        choices=[
            ('morning', '8 AM - 11 AM'),
            ('afternoon', '12 PM - 3 PM'),
            ('evening', '4 PM - 7 PM'),
        ],
        default='morning'
    )
    
    # Special requirements
    special_instructions = models.TextField(blank=True)
    coi_required = models.BooleanField(default=False)
    
    # CALCULATED PRICING
    base_price_cents = models.PositiveBigIntegerField(default=0)
    surcharge_cents = models.PositiveBigIntegerField(default=0)
    coi_fee_cents = models.PositiveBigIntegerField(default=0)
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
            return self.customer.full_name
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
    
    def calculate_pricing(self):
        """Calculate total pricing using services pricing engine"""
        from apps.services.models import StandardDeliveryConfig, SurchargeRule
        
        # Reset pricing
        self.base_price_cents = 0
        self.surcharge_cents = 0
        self.coi_fee_cents = 0
        
        # Calculate base price by service type
        if self.service_type == 'mini_move' and self.mini_move_package:
            self.base_price_cents = self.mini_move_package.base_price_cents
            
            # COI handling for Mini Moves
            if self.coi_required and not self.mini_move_package.coi_included:
                self.coi_fee_cents = self.mini_move_package.coi_fee_cents
            
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
        
        # Calculate total
        self.total_price_cents = self.base_price_cents + self.surcharge_cents + self.coi_fee_cents
    
    def get_pricing_breakdown(self):
        """Return detailed pricing breakdown for display"""
        return {
            'base_price': self.base_price_dollars,
            'surcharges': self.surcharge_dollars,
            'coi_fee': self.coi_fee_dollars,
            'total': self.total_price_dollars,
            'service_type': self.get_service_type_display(),
        }