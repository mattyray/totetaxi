import uuid
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.core.validators import RegexValidator
from django.utils import timezone


class CustomerManager(BaseUserManager):
    """Custom manager for Customer model that works with email instead of username"""
    
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')  # Superusers are admin role

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)


class Customer(AbstractUser):
    """
    Unified User model - handles both customers and staff
    Customers: role='customer', use customer dashboard
    Staff: role='staff' or 'admin', use Django admin
    """
    
    ROLE_CHOICES = [
        ('customer', 'Customer'),
        ('staff', 'Staff'),
        ('admin', 'Admin'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Override username to use email
    username = None
    email = models.EmailField(unique=True)
    
    # User role (customers vs staff)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='customer')
    
    # Contact info
    phone = models.CharField(
        max_length=20, 
        validators=[RegexValidator(regex=r'^\+?1?\d{9,15}$')],
        help_text="Phone number for notifications"
    )
    
    # Customer-specific fields (only for role='customer')
    stripe_customer_id = models.CharField(max_length=100, blank=True)
    
    # Staff-specific fields (only for role='staff' or 'admin') 
    department = models.CharField(max_length=50, blank=True)
    
    # Account management
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Use custom manager
    objects = CustomerManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']
    
    class Meta:
        db_table = 'customers_customer'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.email}) - {self.role}"
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()
    
    @property
    def is_customer_role(self):
        return self.role == 'customer'
    
    @property
    def is_staff_role(self):
        return self.role in ['staff', 'admin']
    
    @property
    def is_admin_role(self):
        return self.role == 'admin'
    
    @property
    def can_approve_refunds(self):
        """Only admin role can approve refunds"""
        return self.role == 'admin'
    
    @property
    def can_manage_bookings(self):
        """Staff and admin can manage bookings"""
        return self.role in ['staff', 'admin']


class CustomerProfile(models.Model):
    """
    Extended customer profile information and statistics
    Only for users with role='customer'
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.OneToOneField('Customer', on_delete=models.CASCADE, related_name='profile')
    
    # Booking statistics (updated by booking app)
    total_bookings = models.PositiveIntegerField(default=0)
    total_spent_cents = models.PositiveBigIntegerField(default=0)
    last_booking_at = models.DateTimeField(null=True, blank=True)
    
    # Customer preferences
    preferred_pickup_time = models.CharField(
        max_length=20,
        choices=[
            ('morning', '8 AM - 11 AM'),
            ('afternoon', '12 PM - 3 PM'),
            ('evening', '4 PM - 7 PM'),
        ],
        default='morning'
    )
    
    # Communication preferences (for future phases)
    email_notifications = models.BooleanField(default=True)
    sms_notifications = models.BooleanField(default=False)
    
    # VIP status for premium customers
    is_vip = models.BooleanField(default=False)
    
    # Staff notes for customer service
    notes = models.TextField(blank=True, help_text="Internal notes for staff")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'customers_profile'
    
    def __str__(self):
        return f"Profile: {self.customer.full_name}"
    
    @property
    def total_spent_dollars(self):
        """Return total spent in dollars for display"""
        return self.total_spent_cents / 100
    
    def add_booking_stats(self, booking_total_cents):
        """Update customer statistics after booking completion"""
        self.total_bookings += 1
        self.total_spent_cents += booking_total_cents
        self.last_booking_at = timezone.now()
        self.save()


class SavedAddress(models.Model):
    """
    Customer's saved addresses for quick booking
    Only for users with role='customer'
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey('Customer', on_delete=models.CASCADE, related_name='saved_addresses')
    
    # Customer-friendly naming
    nickname = models.CharField(
        max_length=50, 
        help_text="Customer's name for this address (e.g., 'Home', 'Hamptons House')"
    )
    
    # Address components
    address_line_1 = models.CharField(max_length=200)
    address_line_2 = models.CharField(max_length=200, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=2, choices=[
        ('NY', 'New York'),
        ('CT', 'Connecticut'), 
        ('NJ', 'New Jersey'),
    ])
    zip_code = models.CharField(max_length=10)
    
    # Special instructions for drivers
    delivery_instructions = models.TextField(
        blank=True, 
        help_text="Special instructions for pickup/delivery (e.g., 'Ring apartment 4B')"
    )
    
    # Usage tracking for address suggestions
    times_used = models.PositiveIntegerField(default=0)
    last_used_at = models.DateTimeField(null=True, blank=True)
    
    # Management
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'customers_saved_address'
        constraints = [
            models.UniqueConstraint(
                fields=['customer', 'nickname'], 
                name='unique_customer_address_nickname'
            )
        ]
    
    def __str__(self):
        return f"{self.customer.full_name} - {self.nickname}"
    
    @property
    def formatted_address(self):
        """Return formatted address for display"""
        parts = [
            self.address_line_1,
            self.address_line_2,
            f"{self.city}, {self.state} {self.zip_code}"
        ]
        return ', '.join(filter(None, parts))
    
    def mark_used(self):
        """Track usage when address is selected for booking"""
        self.times_used += 1
        self.last_used_at = timezone.now()
        self.save()


class CustomerPaymentMethod(models.Model):
    """
    Customer's saved payment methods via Stripe
    Only for users with role='customer'
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey('Customer', on_delete=models.CASCADE, related_name='payment_methods')
    
    # Stripe integration
    stripe_payment_method_id = models.CharField(max_length=100, unique=True)
    
    # Card information (stored by Stripe, we just keep display info)
    card_brand = models.CharField(max_length=20)  # visa, mastercard, amex
    card_last_four = models.CharField(max_length=4)
    card_exp_month = models.PositiveSmallIntegerField()
    card_exp_year = models.PositiveSmallIntegerField()
    
    # Customer preferences
    is_default = models.BooleanField(default=False)
    
    # Management
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'customers_payment_method'
    
    def __str__(self):
        return f"{self.customer.full_name} - {self.card_brand} ****{self.card_last_four}"
    
    @property
    def display_name(self):
        """Human-readable payment method name"""
        return f"{self.card_brand.title()} ending in {self.card_last_four}"
    
    def save(self, *args, **kwargs):
        # Ensure only one default payment method per customer
        if self.is_default:
            CustomerPaymentMethod.objects.filter(
                customer=self.customer, 
                is_default=True
            ).exclude(id=self.id).update(is_default=False)
        super().save(*args, **kwargs)