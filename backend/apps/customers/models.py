import uuid
from django.contrib.auth.models import User
from django.db import models
from django.db.models import F
from django.core.validators import RegexValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
import secrets
from datetime import timedelta

class EmailVerificationToken(models.Model):
    """Email verification tokens for new registrations"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='email_verification')
    token = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    verified = models.BooleanField(default=False)
    
    class Meta:
        # ✅ OPTIMIZED: Added indexes for token lookups
        indexes = [
            models.Index(fields=['token'], name='email_verify_token_idx'),
            models.Index(fields=['verified', 'expires_at'], name='email_verify_status_idx'),
        ]
    
    @classmethod
    def create_token(cls, user):
        """Create verification token"""
        token = secrets.token_urlsafe(32)
        expires_at = timezone.now() + timedelta(hours=48)
        return cls.objects.create(
            user=user,
            token=token,
            expires_at=expires_at
        )
    
    def is_valid(self):
        """Check if token is still valid"""
        from django.utils import timezone
        return not self.verified and timezone.now() < self.expires_at

class PasswordResetToken(models.Model):
    """Password reset tokens with expiry"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_tokens')
    token = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-created_at']
        # ✅ OPTIMIZED: Added indexes for password reset
        indexes = [
            models.Index(fields=['token'], name='password_reset_token_idx'),
            models.Index(fields=['user', 'used'], name='password_reset_user_idx'),
        ]
    
    def __str__(self):
        return f'Reset token for {self.user.email}'
    
    @classmethod
    def create_token(cls, user):
        """Create a new password reset token"""
        token = secrets.token_urlsafe(32)
        expires_at = timezone.now() + timedelta(hours=24)
        return cls.objects.create(
            user=user,
            token=token,
            expires_at=expires_at
        )
    
    def is_valid(self):
        """Check if token is still valid"""
        return not self.used and timezone.now() < self.expires_at

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
        # ✅ OPTIMIZED: Added indexes for customer queries
        indexes = [
            models.Index(fields=['user'], name='customer_profile_user_idx'),
            models.Index(fields=['stripe_customer_id'], name='customer_stripe_idx'),
            models.Index(fields=['is_vip'], name='customer_vip_idx'),
        ]
    
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
        """Update customer statistics after booking completion.

        Uses F() expressions for atomic updates to prevent race conditions.
        """
        CustomerProfile.objects.filter(pk=self.pk).update(
            total_bookings=F('total_bookings') + 1,
            total_spent_cents=F('total_spent_cents') + booking_total_cents,
            last_booking_at=timezone.now(),
        )
        self.refresh_from_db()

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
        # ✅ OPTIMIZED: Added indexes for address queries
        indexes = [
            models.Index(fields=['user', 'is_active'], name='saved_addr_user_active_idx'),  # Booking flow
            models.Index(fields=['times_used'], name='saved_addr_usage_idx'),  # Popular addresses
            models.Index(fields=['user', 'last_used_at'], name='saved_addr_recent_idx'),  # Recent addresses
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
        # ✅ OPTIMIZED: Added indexes for payment method queries
        indexes = [
            models.Index(fields=['user', 'is_active'], name='payment_method_user_idx'),
            models.Index(fields=['stripe_payment_method_id'], name='payment_method_stripe_idx'),
        ]
    
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