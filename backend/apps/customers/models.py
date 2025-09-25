import uuid
from django.contrib.auth.models import User
from django.db import models
from django.core.validators import RegexValidator
from django.core.exceptions import ValidationError
from django.utils import timezone


class CustomerProfile(models.Model):
    """Customer profile linked to Django's User model"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='customer_profile')
    
    # Customer-specific fields
    phone = models.CharField(
        max_length=20, 
        validators=[RegexValidator(regex=r'^\+?1?\d{9,15}$')],
        blank=True
    )
    stripe_customer_id = models.CharField(max_length=100, blank=True)
    
    # Booking statistics
    total_bookings = models.PositiveIntegerField(default=0)
    total_spent_cents = models.PositiveBigIntegerField(default=0)
    last_booking_at = models.DateTimeField(null=True, blank=True)
    
    # Customer preferences - UPDATED: Only morning pickup time
    preferred_pickup_time = models.CharField(
        max_length=30,
        choices=[
            ('morning', '8 AM - 11 AM'),
            ('morning_specific', 'Specific 1-hour window'),
            ('no_time_preference', 'No time preference'),
        ],
        default='morning'
    )
    
    email_notifications = models.BooleanField(default=True)
    sms_notifications = models.BooleanField(default=False)
    is_vip = models.BooleanField(default=False)
    notes = models.TextField(blank=True, help_text="Internal notes for staff")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'customers_profile'
    
    def clean(self):
        """Prevent hybrid accounts - users cannot have both staff and customer profiles"""
        if self.user and hasattr(self.user, 'staff_profile'):
            raise ValidationError(
                f"User {self.user.email} already has a staff profile. "
                "Users cannot have both staff and customer profiles."
            )
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Profile: {self.user.get_full_name()}"
    
    @property
    def total_spent_dollars(self):
        return self.total_spent_cents / 100
    
    def add_booking_stats(self, booking_total_cents):
        """Update customer statistics after booking completion"""
        self.total_bookings += 1
        self.total_spent_cents += booking_total_cents
        self.last_booking_at = timezone.now()
        self.save()

    @classmethod
    def ensure_single_profile_type(cls, user):
        """Ensure user only has one type of profile"""
        if hasattr(user, 'staff_profile') and hasattr(user, 'customer_profile'):
            raise ValidationError(
                f"User {user.email} cannot have both staff and customer profiles. "
                "Please remove one profile type."
            )


class SavedAddress(models.Model):
    """Customer's saved addresses"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='saved_addresses')
    
    nickname = models.CharField(max_length=50)
    address_line_1 = models.CharField(max_length=200)
    address_line_2 = models.CharField(max_length=200, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=2, choices=[
        ('NY', 'New York'),
        ('CT', 'Connecticut'), 
        ('NJ', 'New Jersey'),
    ])
    zip_code = models.CharField(max_length=10)
    delivery_instructions = models.TextField(blank=True)
    
    times_used = models.PositiveIntegerField(default=0)
    last_used_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'customers_saved_address'
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'nickname'], 
                name='unique_customer_address_nickname'
            )
        ]
    
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.nickname}"
    
    @property
    def formatted_address(self):
        parts = [
            self.address_line_1,
            self.address_line_2,
            f"{self.city}, {self.state} {self.zip_code}"
        ]
        return ', '.join(filter(None, parts))
    
    def mark_used(self):
        self.times_used += 1
        self.last_used_at = timezone.now()
        self.save()


class CustomerPaymentMethod(models.Model):
    """Customer's saved payment methods"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payment_methods')
    
    stripe_payment_method_id = models.CharField(max_length=100, unique=True)
    card_brand = models.CharField(max_length=20)
    card_last_four = models.CharField(max_length=4)
    card_exp_month = models.PositiveSmallIntegerField()
    card_exp_year = models.PositiveSmallIntegerField()
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'customers_payment_method'
    
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.card_brand} ****{self.card_last_four}"
    
    @property
    def display_name(self):
        return f"{self.card_brand.title()} ending in {self.card_last_four}"
    
    def save(self, *args, **kwargs):
        if self.is_default:
            CustomerPaymentMethod.objects.filter(
                user=self.user, 
                is_default=True
            ).exclude(id=self.id).update(is_default=False)
        super().save(*args, **kwargs)