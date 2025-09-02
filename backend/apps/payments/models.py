import uuid
from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User


class Payment(models.Model):
    """Payment records for bookings - simple Stripe integration"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('succeeded', 'Succeeded'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Link to booking
    booking = models.ForeignKey(
        'bookings.Booking',
        on_delete=models.PROTECT,
        related_name='payments'
    )
    
    # Customer (if authenticated)
    customer = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payments'
    )
    
    # Payment amount
    amount_cents = models.PositiveBigIntegerField()
    
    # Stripe integration
    stripe_payment_intent_id = models.CharField(max_length=200, blank=True)
    stripe_charge_id = models.CharField(max_length=200, blank=True)
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    failure_reason = models.TextField(blank=True)
    
    # Timestamps
    processed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'payments_payment'
    
    def __str__(self):
        return f"{self.booking.booking_number} - ${self.amount_dollars} ({self.status})"
    
    @property
    def amount_dollars(self):
        return self.amount_cents / 100


class Refund(models.Model):
    """Refund requests with simple approval workflow"""
    
    STATUS_CHOICES = [
        ('requested', 'Requested'),
        ('approved', 'Approved'),
        ('denied', 'Denied'),
        ('completed', 'Completed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Original payment
    payment = models.ForeignKey(
        Payment,
        on_delete=models.PROTECT,
        related_name='refunds'
    )
    
    # Refund details
    amount_cents = models.PositiveBigIntegerField()
    reason = models.TextField()
    
    # Approval workflow
    requested_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='requested_refunds'
    )
    approved_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='approved_refunds'
    )
    
    # Status and Stripe
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='requested')
    stripe_refund_id = models.CharField(max_length=200, blank=True)
    
    # Timestamps
    approved_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'payments_refund'
    
    def __str__(self):
        return f"Refund ${self.amount_dollars} for {self.payment.booking.booking_number}"
    
    @property
    def amount_dollars(self):
        return self.amount_cents / 100
    
    def approve(self, admin_user):
        """Admin approves refund"""
        self.status = 'approved'
        self.approved_by = admin_user
        self.approved_at = timezone.now()
        self.save()


class PaymentAudit(models.Model):
    """Basic audit log for financial compliance"""
    
    ACTION_CHOICES = [
        ('payment_created', 'Payment Created'),
        ('payment_succeeded', 'Payment Succeeded'),
        ('payment_failed', 'Payment Failed'),
        ('refund_requested', 'Refund Requested'),
        ('refund_approved', 'Refund Approved'),
        ('refund_completed', 'Refund Completed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # What happened
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    description = models.TextField()
    
    # Related records
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, null=True, blank=True)
    refund = models.ForeignKey(Refund, on_delete=models.CASCADE, null=True, blank=True)
    
    # Who did it (staff user)
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'payments_audit'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.action} - {self.created_at}"
    
    @classmethod
    def log(cls, action, description, payment=None, refund=None, user=None):
        """Simple audit logging"""
        return cls.objects.create(
            action=action,
            description=description,
            payment=payment,
            refund=refund,
            user=user
        )