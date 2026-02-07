import uuid
from django.contrib.auth.models import User
from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone


class StaffProfile(models.Model):
    """Extended profile for staff users (Django User model + additional fields)"""
    
    ROLE_CHOICES = [
        ('staff', 'Staff'),
        ('admin', 'Admin'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='staff_profile')
    
    # Staff role within the staff system
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='staff')
    
    # Staff-specific information
    department = models.CharField(max_length=50, blank=True)
    hire_date = models.DateField(null=True, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    
    # Permissions tracking
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    login_attempts = models.PositiveIntegerField(default=0)
    account_locked_until = models.DateTimeField(null=True, blank=True)
    
    # Management
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'accounts_staff_profile'
        verbose_name = 'Staff Profile'
        verbose_name_plural = 'Staff Profiles'
    
    def clean(self):
        """Prevent hybrid accounts - users cannot have both staff and customer profiles"""
        if self.user and hasattr(self.user, 'customer_profile'):
            raise ValidationError(
                f"User {self.user.email} already has a customer profile. "
                "Users cannot have both staff and customer profiles."
            )
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.user.get_full_name()} ({self.role})"
    
    @property
    def can_approve_refunds(self):
        """Only admin role can approve refunds"""
        return self.role == 'admin'
    
    @property
    def can_manage_staff(self):
        """Only admin role can manage other staff accounts"""
        return self.role == 'admin'
    
    @property
    def can_view_financial_reports(self):
        """Both staff and admin can view financial reports"""
        return self.role in ['staff', 'admin']
    
    @property
    def full_name(self):
        """Get full name from associated User model"""
        return self.user.get_full_name()
    
    @property
    def email(self):
        """Get email from associated User model"""
        return self.user.email
    
    def lock_account(self, minutes=30):
        """Lock account for specified minutes after failed login attempts"""
        self.account_locked_until = timezone.now() + timezone.timedelta(minutes=minutes)
        self.save()
    
    def unlock_account(self):
        """Unlock account and reset login attempts"""
        self.account_locked_until = None
        self.login_attempts = 0
        self.save()
    
    @property
    def is_account_locked(self):
        """Check if account is currently locked"""
        if self.account_locked_until:
            return timezone.now() < self.account_locked_until
        return False

    @classmethod
    def ensure_single_profile_type(cls, user):
        """Ensure user only has one type of profile"""
        if hasattr(user, 'staff_profile') and hasattr(user, 'customer_profile'):
            raise ValidationError(
                f"User {user.email} cannot have both staff and customer profiles. "
                "Please remove one profile type."
            )


class StaffAction(models.Model):
    """Audit log for staff actions - required for compliance"""
    
    ACTION_TYPES = [
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('view_customer', 'View Customer'),
        ('modify_booking', 'Modify Booking'),
        ('process_refund', 'Process Refund'),
        ('approve_refund', 'Approve Refund'),
        ('upload_document', 'Upload Document'),
        ('send_notification', 'Send Notification'),
        ('export_data', 'Export Data'),
        ('view_dashboard', 'View Dashboard'),
        ('view_booking', 'View Booking'),
        ('modify_customer', 'Modify Customer'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Who performed the action
    staff_user = models.ForeignKey(User, on_delete=models.PROTECT, related_name='staff_actions')
    
    # What action was performed
    action_type = models.CharField(max_length=30, choices=ACTION_TYPES)
    description = models.TextField()
    
    # Context information
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    
    # Related objects (for tracking what was accessed/modified)
    customer_id = models.UUIDField(null=True, blank=True, help_text="Customer affected by action")
    booking_id = models.UUIDField(null=True, blank=True, help_text="Booking affected by action")
    
    # Timing
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'accounts_staff_action'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['staff_user', '-created_at']),
            models.Index(fields=['action_type', '-created_at']),
            models.Index(fields=['customer_id']),
            models.Index(fields=['booking_id']),
        ]
    
    def __str__(self):
        return f"{self.staff_user.username} - {self.action_type} - {self.created_at}"
    
    @classmethod
    def log_action(cls, staff_user, action_type, description, request=None, customer_id=None, booking_id=None):
        """Helper method to log staff actions with proper IP detection"""
        ip_address = '127.0.0.1'  # default fallback
        user_agent = ''
        
        if request:
            # Get client IP from request
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                ip_address = x_forwarded_for.split(',')[0].strip()
            else:
                ip_address = request.META.get('REMOTE_ADDR', '127.0.0.1')
            
            user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        return cls.objects.create(
            staff_user=staff_user,
            action_type=action_type,
            description=description,
            ip_address=ip_address,
            user_agent=user_agent,
            customer_id=customer_id,
            booking_id=booking_id
        )