
# LIVING DOCUMENTATION - AI MEMORY PERSISTENCE SYSTEM (BACKEND)

## WHAT THIS IS
This is a **comprehensive AI memory persistence system** for Django/DRF backend projects of any type. It provides **complete executive function** over backend development by extracting and documenting every API endpoint, model specification, business logic implementation, and configuration detail. This enables independent code modification, feature development, and system extension without requiring additional context or file requests.

## WHY THIS WORKS FOR ANY DJANGO PROJECT
**Django-Generic Comprehension Optimization:**
- **Predictable Architecture** - All Django projects follow consistent patterns (models, views, serializers, URLs)
- **Centralized Business Logic** - Core algorithms concentrated in models and services regardless of domain
- **Explicit API Contracts** - DRF serializers provide clear specifications in any project type
- **Declarative Relationships** - Django ORM relationships are explicit across all domains
- **Configuration Centralization** - Settings, integrations, configurations discoverable in any Django project
- **Pattern Consistency** - Django conventions enable systematic extraction for any business domain

## HOW TO REGENERATE AT END OF CHAT

**REGENERATION COMMAND:**
"Analyze the attached `back_export.txt` Django code snapshot following the comprehensive Django extraction protocol. Extract every API endpoint, model specification, business logic implementation, configuration detail, and development pattern. Generate complete living documentation that provides full executive function over this Django project's backend development, regardless of business domain."

---

# TOTETAXI BACKEND COMPREHENSIVE IMPLEMENTATION GUIDE

## SECTION 1: SYSTEM MENTAL MODEL

**Project Architecture Philosophy:**
This Django project follows a **domain-driven app architecture** where each Django app represents a distinct business capability. The system is built around a luxury delivery service platform with dual-user architecture (customers + staff) and complex business logic for pricing, scheduling, and payment processing.

**Django App Organization:**
```python
# Business Domain Apps (Core Functionality)
apps/customers/     # Customer profiles, addresses, authentication
apps/bookings/      # Booking lifecycle, pricing calculations  
apps/payments/      # Financial transactions, Stripe integration
apps/services/      # Service definitions, pricing rules
apps/logistics/     # Delivery coordination, external integrations

# Operational Apps (Staff & Management)  
apps/accounts/      # Staff profiles, role management, audit logging
apps/crm/          # Staff dashboard, reporting, analytics

# Support Apps (Infrastructure)
apps/documents/     # File management, document storage
apps/notifications/ # Communication, email/SMS systems
```

**Integration Strategy:**
- **External Payment Processing** - Stripe for real payment handling
- **Logistics Coordination** - Onfleet API for delivery management  
- **Cloud Infrastructure** - AWS S3 for storage, SES for email
- **Background Processing** - Celery with Redis for async tasks

## SECTION 2: COMPLETE API ENDPOINT REFERENCE

### Customer Authentication Endpoints

```python
# Customer Registration
POST /api/customers/auth/register/
Authentication: None required
Request: {
    "email": "string",
    "password": "string", 
    "first_name": "string",
    "last_name": "string"
}
Response: {
    "success": boolean,
    "data": {
        "token": "string",
        "user": {
            "id": integer,
            "email": "string",
            "first_name": "string",
            "last_name": "string"
        }
    },
    "message": "string"
}
Validation Rules: 
- Email format validation
- Password strength requirements  
- Unique email constraint
Business Logic: Creates User and CustomerProfile, generates JWT token

# Customer Login  
POST /api/customers/auth/login/
Authentication: None required
Request: {
    "email": "string",
    "password": "string"
}
Response: {
    "success": boolean,
    "data": {
        "token": "string", 
        "user": UserObject
    }
}
Error Responses: 
- 401: Invalid credentials
- 400: Validation errors
```

### Staff Authentication Endpoints

```python
# Staff Login
POST /api/accounts/staff/login/  
Authentication: None required
Request: {
    "email": "string",
    "password": "string"
}
Response: {
    "success": boolean,
    "data": {
        "token": "string",
        "staff": {
            "id": integer,
            "user": UserObject,
            "role": "string",
            "is_active": boolean
        }
    }
}
Business Logic: Only allows users with is_staff=True
Validation: Staff role verification, active status check
```

### Booking Management Endpoints

```python
# Guest Booking Creation
POST /api/customers/bookings/guest/
Authentication: None required  
Request: {
    "service": integer,
    "pickup_address": AddressObject,
    "delivery_address": AddressObject, 
    "pickup_date": "YYYY-MM-DD",
    "pickup_time": "HH:MM:SS",
    "contact_info": ContactObject,
    "special_instructions": "string",
    "include_packing": boolean,
    "include_unpacking": boolean
}
Response: {
    "success": boolean,
    "data": {
        "booking": BookingObject,
        "pricing": PricingBreakdown
    }
}
Business Logic: 
- Creates pending booking
- Calculates total pricing including surcharges
- Handles guest checkout without authentication

# Pricing Preview
POST /api/bookings/pricing-preview/
Authentication: Optional
Request: {
    "service": integer,
    "pickup_date": "YYYY-MM-DD", 
    "pickup_time": "HH:MM:SS",
    "include_packing": boolean,
    "include_unpacking": boolean
}
Response: {
    "success": boolean,
    "data": {
        "base_cost": "decimal",
        "surcharges": [SurchargeObject],
        "organizing_costs": "decimal",
        "total_cost": "decimal"
    }
}
Algorithm: Calls Booking.calculate_pricing() method
```

### Payment Processing Endpoints

```python
# Create Payment Intent
POST /api/payments/create-intent/
Authentication: JWT required
Request: {
    "booking_id": integer,
    "customer_email": "string"
}
Response: {
    "success": boolean,
    "data": {
        "client_secret": "string",
        "payment_intent_id": "string"
    }
}
Business Logic: 
- Creates Stripe PaymentIntent
- Links to booking record
- Sets up customer payment method

# Confirm Payment
POST /api/payments/confirm/
Authentication: JWT required
Request: {
    "payment_intent_id": "string"
}
Response: {
    "success": boolean,
    "data": {
        "payment": PaymentObject,
        "booking": BookingObject
    }
}
Business Logic:
- Updates payment status
- Triggers booking status change to 'paid'
- Updates customer statistics

# Stripe Webhook Handler
POST /api/payments/webhook/
Authentication: Stripe signature verification
Request: Stripe webhook payload
Business Logic:
- Processes payment confirmations
- Handles failed payments
- Updates payment and booking statuses
```

### Service Management Endpoints

```python
# List Available Services
GET /api/services/
Authentication: None required
Response: {
    "success": boolean,
    "data": [
        {
            "id": integer,
            "name": "string",
            "base_price": "decimal", 
            "description": "string",
            "is_active": boolean
        }
    ]
}

# Get Service Details
GET /api/services/{id}/
Authentication: None required
Response: ServiceObject with pricing details
```

## SECTION 3: COMPLETE MODEL DOCUMENTATION

### Customer Models (`apps/customers/models.py`)

```python
class CustomerProfile(models.Model):
    # Primary relationship
    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE,
        related_name='customer_profile'
    )
    
    # Contact information
    phone = models.CharField(
        max_length=20, 
        blank=True,
        help_text="Customer phone number"
    )
    
    # Statistics fields  
    total_bookings = models.PositiveIntegerField(
        default=0,
        help_text="Total number of completed bookings"
    )
    total_spent = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0.00,
        help_text="Total amount spent on services"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Model Methods
    def add_booking_stats(self, amount):
        """Update customer statistics on successful payment"""
        self.total_bookings += 1
        self.total_spent += amount
        self.save(update_fields=['total_bookings', 'total_spent'])
    
    def get_full_name(self):
        """Return customer's full name"""
        return f"{self.user.first_name} {self.user.last_name}"
    
    # Meta configuration
    class Meta:
        verbose_name = "Customer Profile"
        verbose_name_plural = "Customer Profiles"
        ordering = ['-created_at']

class SavedAddress(models.Model):
    # Relationship
    customer = models.ForeignKey(
        CustomerProfile, 
        on_delete=models.CASCADE,
        related_name='saved_addresses'
    )
    
    # Address fields
    label = models.CharField(
        max_length=50,
        help_text="User-defined address label (e.g., 'Home', 'Office')"
    )
    street_address = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=50)
    zip_code = models.CharField(max_length=10)
    
    # Metadata
    is_default = models.BooleanField(
        default=False,
        help_text="Default address for this customer"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['customer', 'label']
        ordering = ['-is_default', '-created_at']
```

### Booking Models (`apps/bookings/models.py`)

```python
class Booking(models.Model):
    # Status choices
    STATUS_CHOICES = [
        ('pending', 'Pending Payment'),
        ('paid', 'Paid - Awaiting Pickup'), 
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    # Relationships
    customer = models.ForeignKey(
        'customers.CustomerProfile',
        on_delete=models.CASCADE,
        related_name='bookings',
        null=True, blank=True,  # Allows guest bookings
        help_text="Customer profile (null for guest bookings)"
    )
    service = models.ForeignKey(
        'services.Service',
        on_delete=models.PROTECT,
        related_name='bookings'
    )
    payment = models.OneToOneField(
        'payments.Payment',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='booking'
    )
    
    # Core booking data
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    
    # Address information (stored as JSON or separate models)
    pickup_address = models.JSONField(
        help_text="Complete pickup address information"
    )
    delivery_address = models.JSONField(
        help_text="Complete delivery address information"
    )
    
    # Scheduling
    pickup_date = models.DateField(
        help_text="Requested pickup date"
    )
    pickup_time = models.TimeField(
        help_text="Requested pickup time (morning window only)"
    )
    
    # Service options
    include_packing = models.BooleanField(
        default=False,
        help_text="Include packing service"
    )
    include_unpacking = models.BooleanField(
        default=False,
        help_text="Include unpacking service"
    )
    
    # Pricing
    base_cost = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        help_text="Base service cost"
    )
    total_cost = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        help_text="Total cost including all surcharges"
    )
    
    # Additional information
    special_instructions = models.TextField(
        blank=True,
        help_text="Special delivery instructions"
    )
    
    # Contact for guest bookings
    contact_email = models.EmailField(
        blank=True,
        help_text="Contact email for guest bookings"
    )
    contact_phone = models.CharField(
        max_length=20,
        blank=True
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Core Business Logic Methods
    def calculate_pricing(self):
        """Calculate total booking cost with all surcharges and organizing services"""
        from decimal import Decimal
        
        # Start with base service cost
        total = self.service.base_price
        
        # Add organizing service costs
        if self.include_packing:
            organizing_service = OrganizingService.objects.filter(
                service_type='packing'
            ).first()
            if organizing_service:
                total += organizing_service.price
                
        if self.include_unpacking:
            organizing_service = OrganizingService.objects.filter(
                service_type='unpacking'  
            ).first()
            if organizing_service:
                total += organizing_service.price
        
        # Apply surcharge rules
        applicable_surcharges = SurchargeRule.objects.filter(
            is_active=True
        )
        
        for surcharge in applicable_surcharges:
            if surcharge.applies_to_booking(self):
                if surcharge.calculation_type == 'percentage':
                    total += (total * surcharge.amount / 100)
                else:  # flat fee
                    total += surcharge.amount
        
        return total
    
    def save(self, *args, **kwargs):
        """Override save to calculate pricing automatically"""
        if not self.total_cost:
            self.total_cost = self.calculate_pricing()
            self.base_cost = self.service.base_price
        super().save(*args, **kwargs)
    
    def update_status_to_paid(self):
        """Update booking status when payment is confirmed"""
        self.status = 'paid'
        self.save(update_fields=['status'])
        
        # Update customer statistics if authenticated booking
        if self.customer:
            self.customer.add_booking_stats(self.total_cost)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Booking"
        verbose_name_plural = "Bookings"
```

### Service Models (`apps/services/models.py`)

```python
class Service(models.Model):
    name = models.CharField(
        max_length=100,
        unique=True,
        help_text="Service name (e.g., 'Local Delivery', 'Airport Transfer')"
    )
    description = models.TextField(
        help_text="Detailed service description"
    )
    base_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Base price for this service"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this service is available for booking"
    )
    
    # Service-specific configuration
    max_distance_miles = models.PositiveIntegerField(
        null=True, blank=True,
        help_text="Maximum delivery distance in miles"
    )
    estimated_duration_hours = models.PositiveIntegerField(
        default=2,
        help_text="Estimated service duration in hours"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} - ${self.base_price}"
    
    class Meta:
        ordering = ['name']

class OrganizingService(models.Model):
    SERVICE_TYPE_CHOICES = [
        ('packing', 'Packing Service'),
        ('unpacking', 'Unpacking Service'),
        ('organizing', 'Organizing Service'),
    ]
    
    name = models.CharField(max_length=100)
    service_type = models.CharField(
        max_length=20,
        choices=SERVICE_TYPE_CHOICES
    )
    price = models.DecimalField(
        max_digits=8,
        decimal_places=2
    )
    description = models.TextField()
    is_active = models.BooleanField(default=True)
    
    class Meta:
        unique_together = ['service_type']

class SurchargeRule(models.Model):
    CALCULATION_CHOICES = [
        ('flat', 'Flat Fee'),
        ('percentage', 'Percentage'),
    ]
    
    name = models.CharField(
        max_length=100,
        help_text="Surcharge rule name (e.g., 'Weekend Surcharge')"
    )
    calculation_type = models.CharField(
        max_length=20,
        choices=CALCULATION_CHOICES
    )
    amount = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        help_text="Surcharge amount (percentage or flat fee)"
    )
    
    # Condition fields
    applies_to_weekends = models.BooleanField(default=False)
    applies_to_early_pickup = models.BooleanField(default=False)
    applies_to_late_pickup = models.BooleanField(default=False)
    min_pickup_time = models.TimeField(
        null=True, blank=True,
        help_text="Minimum pickup time for early surcharge"
    )
    max_pickup_time = models.TimeField(
        null=True, blank=True, 
        help_text="Maximum pickup time for late surcharge"
    )
    
    is_active = models.BooleanField(default=True)
    
    def applies_to_booking(self, booking):
        """Check if this surcharge rule applies to a specific booking"""
        # Weekend check
        if self.applies_to_weekends:
            if booking.pickup_date.weekday() >= 5:  # Saturday=5, Sunday=6
                return True
                
        # Early pickup check
        if self.applies_to_early_pickup and self.min_pickup_time:
            if booking.pickup_time <= self.min_pickup_time:
                return True
                
        # Late pickup check  
        if self.applies_to_late_pickup and self.max_pickup_time:
            if booking.pickup_time >= self.max_pickup_time:
                return True
                
        return False
    
    class Meta:
        ordering = ['name']
```

### Payment Models (`apps/payments/models.py`)

```python
class Payment(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('succeeded', 'Succeeded'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
    ]
    
    # Stripe integration fields
    stripe_payment_intent_id = models.CharField(
        max_length=100,
        unique=True,
        help_text="Stripe PaymentIntent ID"
    )
    stripe_customer_id = models.CharField(
        max_length=100,
        blank=True,
        help_text="Stripe Customer ID"
    )
    
    # Payment details
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Payment amount in dollars"
    )
    currency = models.CharField(
        max_length=3,
        default='USD'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    
    # Associated data
    customer_email = models.EmailField(
        help_text="Email address for payment confirmation"
    )
    
    # Metadata
    payment_method_types = models.JSONField(
        default=list,
        help_text="Stripe payment method types accepted"
    )
    stripe_fees = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True, blank=True,
        help_text="Stripe processing fees"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    succeeded_at = models.DateTimeField(
        null=True, blank=True,
        help_text="When payment was confirmed"
    )
    
    def mark_as_succeeded(self):
        """Mark payment as successful and update related booking"""
        from django.utils import timezone
        
        self.status = 'succeeded'
        self.succeeded_at = timezone.now()
        self.save(update_fields=['status', 'succeeded_at'])
        
        # Update associated booking status
        if hasattr(self, 'booking') and self.booking:
            self.booking.update_status_to_paid()
    
    class Meta:
        ordering = ['-created_at']

class Refund(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('succeeded', 'Succeeded'), 
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    
    payment = models.ForeignKey(
        Payment,
        on_delete=models.CASCADE,
        related_name='refunds'
    )
    stripe_refund_id = models.CharField(
        max_length=100,
        unique=True
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )
    reason = models.CharField(
        max_length=100,
        blank=True
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
```

### Staff Models (`apps/accounts/models.py`)

```python
class StaffProfile(models.Model):
    ROLE_CHOICES = [
        ('admin', 'Administrator'),
        ('manager', 'Manager'),
        ('coordinator', 'Delivery Coordinator'),
        ('support', 'Customer Support'),
    ]
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='staff_profile'
    )
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='support'
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether staff member can access the system"
    )
    
    # Contact information
    phone = models.CharField(max_length=20, blank=True)
    emergency_contact = models.CharField(max_length=100, blank=True)
    
    # Employment details
    hire_date = models.DateField(null=True, blank=True)
    department = models.CharField(max_length=50, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def has_permission(self, permission):
        """Check if staff member has specific permission"""
        permission_map = {
            'admin': ['view_all', 'edit_all', 'delete_all', 'manage_staff'],
            'manager': ['view_all', 'edit_bookings', 'view_reports'],
            'coordinator': ['view_bookings', 'edit_booking_status'],
            'support': ['view_bookings', 'view_customers'],
        }
        return permission in permission_map.get(self.role, [])
    
    class Meta:
        ordering = ['user__first_name', 'user__last_name']

class AuditLog(models.Model):
    ACTION_CHOICES = [
        ('create', 'Create'),
        ('update', 'Update'), 
        ('delete', 'Delete'),
        ('view', 'View'),
        ('login', 'Login'),
        ('logout', 'Logout'),
    ]
    
    staff = models.ForeignKey(
        StaffProfile,
        on_delete=models.CASCADE,
        related_name='audit_logs'
    )
    action = models.CharField(
        max_length=20,
        choices=ACTION_CHOICES
    )
    model_type = models.CharField(
        max_length=50,
        help_text="Model that was acted upon"
    )
    object_id = models.PositiveIntegerField(
        null=True, blank=True,
        help_text="ID of the object that was acted upon"
    )
    details = models.JSONField(
        default=dict,
        help_text="Additional details about the action"
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['staff', 'timestamp']),
            models.Index(fields=['model_type', 'object_id']),
        ]
```

## SECTION 4: BUSINESS LOGIC IMPLEMENTATION GUIDE

### Pricing Calculation Algorithm

```python
# Complete pricing calculation implementation
def calculate_booking_total(booking):
    """
    Master pricing algorithm combining base price, organizing services, and surcharges
    """
    from decimal import Decimal
    
    # Step 1: Base service price
    total = booking.service.base_price
    
    # Step 2: Add organizing service costs
    organizing_costs = Decimal('0.00')
    
    if booking.include_packing:
        packing_service = OrganizingService.objects.filter(
            service_type='packing',
            is_active=True
        ).first()
        if packing_service:
            organizing_costs += packing_service.price
    
    if booking.include_unpacking:
        unpacking_service = OrganizingService.objects.filter(
            service_type='unpacking',
            is_active=True
        ).first()
        if unpacking_service:
            organizing_costs += unpacking_service.price
    
    total += organizing_costs
    
    # Step 3: Apply surcharge rules
    surcharge_total = Decimal('0.00')
    active_surcharges = SurchargeRule.objects.filter(is_active=True)
    
    for surcharge in active_surcharges:
        if surcharge.applies_to_booking(booking):
            if surcharge.calculation_type == 'percentage':
                surcharge_amount = (total * surcharge.amount / 100)
            else:  # flat fee
                surcharge_amount = surcharge.amount
            
            surcharge_total += surcharge_amount
    
    total += surcharge_total
    
    # Step 4: Round to 2 decimal places
    return round(total, 2)
```

### Payment Processing Workflow

```python
# Complete Stripe payment integration workflow
class StripePaymentService:
    
    @staticmethod
    def create_payment_intent(booking, customer_email):
        """Create Stripe PaymentIntent for booking"""
        import stripe
        from django.conf import settings
        
        stripe.api_key = settings.STRIPE_SECRET_KEY
        
        try:
            # Create payment intent with booking amount
            intent = stripe.PaymentIntent.create(
                amount=int(booking.total_cost * 100),  # Convert to cents
                currency='usd',
                payment_method_types=['card'],
                metadata={
                    'booking_id': booking.id,
                    'customer_email': customer_email,
                }
            )
            
            # Create local payment record
            payment = Payment.objects.create(
                stripe_payment_intent_id=intent.id,
                amount=booking.total_cost,
                currency='usd',
                customer_email=customer_email,
                status='pending'
            )
            
            # Link payment to booking
            booking.payment = payment
            booking.save()
            
            return {
                'client_secret': intent.client_secret,
                'payment_intent_id': intent.id,
                'payment_id': payment.id
            }
            
        except stripe.error.StripeError as e:
            # Handle Stripe errors
            return {
                'error': str(e),
                'type': 'stripe_error'
            }
    
    @staticmethod
    def handle_webhook_event(event):
        """Process Stripe webhook events"""
        if event['type'] == 'payment_intent.succeeded':
            payment_intent = event['data']['object']
            payment_intent_id = payment_intent['id']
            
            try:
                payment = Payment.objects.get(
                    stripe_payment_intent_id=payment_intent_id
                )
                payment.mark_as_succeeded()
                
                return {'status': 'success'}
                
            except Payment.DoesNotExist:
                return {'status': 'error', 'message': 'Payment not found'}
        
        return {'status': 'unhandled_event'}
```

### Booking Status State Machine

```python
# Complete booking status workflow implementation
class BookingStatusManager:
    
    VALID_TRANSITIONS = {
        'pending': ['paid', 'cancelled'],
        'paid': ['in_progress', 'cancelled'], 
        'in_progress': ['completed', 'cancelled'],
        'completed': [],  # Final state
        'cancelled': [],  # Final state
    }
    
    @classmethod
    def can_transition(cls, current_status, new_status):
        """Check if status transition is valid"""
        return new_status in cls.VALID_TRANSITIONS.get(current_status, [])
    
    @classmethod
    def update_booking_status(cls, booking, new_status, staff_user=None):
        """Update booking status with validation and audit logging"""
        if not cls.can_transition(booking.status, new_status):
            raise ValidationError(
                f"Cannot transition from {booking.status} to {new_status}"
            )
        
        old_status = booking.status
        booking.status = new_status
        booking.save(update_fields=['status'])
        
        # Create audit log if staff user provided
        if staff_user and hasattr(staff_user, 'staff_profile'):
            AuditLog.objects.create(
                staff=staff_user.staff_profile,
                action='update',
                model_type='Booking',
                object_id=booking.id,
                details={
                    'field_changed': 'status',
                    'old_value': old_status,
                    'new_value': new_status
                }
            )
```

### Authentication & Authorization Logic

```python
# JWT token authentication implementation
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.permissions import BasePermission

class CustomerPermission(BasePermission):
    """Permission class for customer-specific endpoints"""
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Check if user has customer profile
        return hasattr(request.user, 'customer_profile')

class StaffPermission(BasePermission):
    """Permission class for staff-specific endpoints"""
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Check if user is staff and has active profile
        return (request.user.is_staff and 
                hasattr(request.user, 'staff_profile') and
                request.user.staff_profile.is_active)

class RoleBasedPermission(BasePermission):
    """Permission class with role-based access control"""
    
    required_roles = []  # Override in subclasses
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        if not hasattr(request.user, 'staff_profile'):
            return False
        
        return request.user.staff_profile.role in self.required_roles
```

## SECTION 5: INTEGRATION ARCHITECTURE REFERENCE

### Complete Django Settings Configuration

```python
# From config/settings.py - Complete configuration breakdown

# Core Django Configuration
SECRET_KEY = env('SECRET_KEY', default='django-insecure-change-me-in-production')
DEBUG = env('DEBUG', default=False)  # Production default: False
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['localhost', '127.0.0.1'])

# Application Definition
DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth', 
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'rest_framework',           # Django REST Framework
    'corsheaders',             # CORS handling for frontend
    'django_celery_beat',      # Celery periodic tasks
    'drf_yasg',               # API documentation
]

LOCAL_APPS = [
    'apps.accounts',           # Staff management and authentication
    'apps.bookings',          # Core booking functionality
    'apps.services',          # Service definitions and pricing
    'apps.payments',          # Payment processing with Stripe
    'apps.logistics',         # Delivery coordination
    'apps.documents',         # Document management
    'apps.notifications',     # Communication systems
    'apps.crm',              # Customer relationship management
    'apps.customers',        # Customer profiles and authentication
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# Database Configuration
DATABASES = {
    'default': dj_database_url.parse(
        env('DATABASE_URL', default='postgresql://user:pass@localhost:5435/totetaxi')
    )
}

# Django REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

# JWT Configuration  
from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}

# Stripe Payment Configuration
STRIPE_PUBLISHABLE_KEY = env('STRIPE_PUBLISHABLE_KEY', default='')
STRIPE_SECRET_KEY = env('STRIPE_SECRET_KEY', default='')
STRIPE_WEBHOOK_SECRET = env('STRIPE_WEBHOOK_SECRET', default='')

# Redis Configuration for Caching and Celery
REDIS_URL = env('REDIS_URL', default='redis://localhost:6382/0')
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': REDIS_URL,
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

# Celery Configuration
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'

# AWS Configuration
AWS_ACCESS_KEY_ID = env('AWS_ACCESS_KEY_ID', default='')
AWS_SECRET_ACCESS_KEY = env('AWS_SECRET_ACCESS_KEY', default='')
AWS_STORAGE_BUCKET_NAME = env('AWS_STORAGE_BUCKET_NAME', default='')
AWS_S3_REGION_NAME = env('AWS_S3_REGION_NAME', default='us-east-1')

# Email Configuration (SES)
EMAIL_BACKEND = 'django_ses.SESBackend'
AWS_SES_REGION_NAME = env('AWS_SES_REGION_NAME', default='us-east-1')
AWS_SES_REGION_ENDPOINT = f'email.{AWS_SES_REGION_NAME}.amazonaws.com'

# CORS Configuration for Frontend
CORS_ALLOWED_ORIGINS = env.list(
    'CORS_ALLOWED_ORIGINS', 
    default=['http://localhost:3000', 'http://127.0.0.1:3000']
)
CORS_ALLOW_CREDENTIALS = True

# Security Configuration
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = env('SECURE_HSTS_SECONDS', default=0, cast=int)

# Logging Configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': 'logs/django.log',
        },
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file', 'console'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}
```

### Environment Variables Reference

```python
# Required Environment Variables (.env file)
SECRET_KEY=your-secret-key-here
DEBUG=False

# Database Configuration  
DATABASE_URL=postgresql://user:password@host:port/database

# Redis Configuration
REDIS_URL=redis://localhost:6382/0

# Stripe Payment Integration
STRIPE_PUBLISHABLE_KEY=pk_live_or_test_key
STRIPE_SECRET_KEY=sk_live_or_test_key  
STRIPE_WEBHOOK_SECRET=whsec_webhook_secret

# AWS Services
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_STORAGE_BUCKET_NAME=your-s3-bucket
AWS_S3_REGION_NAME=us-east-1
AWS_SES_REGION_NAME=us-east-1

# Frontend Integration
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Security (Production)
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
SECURE_HSTS_SECONDS=31536000
```

### External Service Integration Patterns

```python
# Stripe Integration Service
class StripeService:
    """Centralized Stripe integration service"""
    
    def __init__(self):
        import stripe
        from django.conf import settings
        stripe.api_key = settings.STRIPE_SECRET_KEY
        self.stripe = stripe
    
    def create_customer(self, email, name=None):
        """Create Stripe customer"""
        return self.stripe.Customer.create(
            email=email,
            name=name
        )
    
    def create_payment_intent(self, amount, currency='usd', customer=None):
        """Create payment intent"""
        return self.stripe.PaymentIntent.create(
            amount=int(amount * 100),  # Convert to cents
            currency=currency,
            customer=customer
        )

# Onfleet Integration Service (Configured but not actively used)
class OnfleetService:
    """Delivery coordination service integration"""
    
    def __init__(self):
        from django.conf import settings
        self.api_key = settings.ONFLEET_API_KEY
        self.base_url = 'https://onfleet.com/api/v2'
    
    def create_delivery_task(self, booking):
        """Create delivery task in Onfleet system"""
        # Implementation depends on actual Onfleet integration
        pass

# AWS S3 File Storage (Configured but not actively used)
DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
STATICFILES_STORAGE = 'storages.backends.s3boto3.StaticS3Boto3Storage'
```

## SECTION 6: DEVELOPMENT EXTENSION PATTERNS

### Adding New Django Apps

```python
# Pattern for creating new business domain apps
# 1. Create app structure
python manage.py startapp new_feature

# 2. Standard app structure to follow:
new_feature/
├── migrations/
├── __init__.py
├── admin.py          # Django admin customization
├── apps.py           # App configuration  
├── models.py         # Data models
├── serializers.py    # DRF serializers
├── views.py          # API views
├── urls.py           # URL patterns
├── services.py       # Business logic services (optional)
├── managers.py       # Custom model managers (optional)
└── tests.py          # Unit tests

# 3. Add to INSTALLED_APPS in settings.py
LOCAL_APPS = [
    # ... existing apps
    'apps.new_feature',
]

# 4. Create URL pattern in config/urls.py
urlpatterns = [
    # ... existing patterns
    path('api/new-feature/', include('apps.new_feature.urls')),
]
```

### Model Extension Pattern

```python
# Pattern for adding new models following project conventions
class NewModel(models.Model):
    """Follow established model patterns"""
    
    # Always include these standard fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Use proper foreign key relationships
    customer = models.ForeignKey(
        'customers.CustomerProfile',
        on_delete=models.CASCADE,
        related_name='new_models'
    )
    
    # Include proper field documentation
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active',
        help_text="Current model status"
    )
    
    # Add business logic methods
    def custom_business_method(self):
        """Implement business logic in model methods"""
        pass
    
    # Include proper Meta configuration
    class Meta:
        ordering = ['-created_at']
        verbose_name = "New Model"
        verbose_name_plural = "New Models"
```

### API Endpoint Creation Pattern

```python
# Pattern for creating new API endpoints following DRF conventions

# 1. Create serializer (serializers.py)
class NewModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = NewModel
        fields = '__all__'
    
    def validate_custom_field(self, value):
        """Custom validation logic"""
        if not value:
            raise serializers.ValidationError("Field is required")
        return value

# 2. Create view (views.py)  
class NewModelViewSet(viewsets.ModelViewSet):
    queryset = NewModel.objects.all()
    serializer_class = NewModelSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter queryset based on user"""
        if hasattr(self.request.user, 'customer_profile'):
            return NewModel.objects.filter(
                customer=self.request.user.customer_profile
            )
        return NewModel.objects.all()

# 3. Add URL patterns (urls.py)
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'new-models', views.NewModelViewSet)
urlpatterns = router.urls
```

### Testing Pattern

```python
# Pattern for writing tests following project conventions
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

class NewModelTestCase(TestCase):
    """Model testing pattern"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
        self.customer = CustomerProfile.objects.create(user=self.user)
    
    def test_model_creation(self):
        """Test model creation"""
        model = NewModel.objects.create(
            customer=self.customer,
            # ... other fields
        )
        self.assertIsNotNone(model.id)
        self.assertEqual(model.customer, self.customer)

class NewModelAPITestCase(APITestCase):
    """API testing pattern"""
    
    def setUp(self):
        """Set up test data and authentication"""
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
        self.customer = CustomerProfile.objects.create(user=self.user)
        
        # Set up JWT authentication
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}'
        )
    
    def test_api_endpoint(self):
        """Test API endpoint"""
        response = self.client.get('/api/new-models/')
        self.assertEqual(response.status_code, 200)
```

## SECTION 7: VALIDATION & CONSTRAINT REFERENCE

### Serializer Validation Rules

```python
# Complete validation patterns from existing serializers

class BookingSerializer(serializers.ModelSerializer):
    """Example of comprehensive validation implementation"""
    
    def validate_pickup_date(self, value):
        """Validate pickup date is not in the past"""
        from django.utils import timezone
        from datetime import date
        
        if value < date.today():
            raise serializers.ValidationError(
                "Pickup date cannot be in the past"
            )
        
        # Business rule: No bookings more than 30 days in advance
        max_advance_days = 30
        max_date = date.today() + timedelta(days=max_advance_days)
        if value > max_date:
            raise serializers.ValidationError(
                f"Pickup date cannot be more than {max_advance_days} days in advance"
            )
        
        return value
    
    def validate_pickup_time(self, value):
        """Validate pickup time is within morning window"""
        from datetime import time
        
        # Business rule: Morning pickups only (8 AM - 12 PM)
        morning_start = time(8, 0)  # 8:00 AM
        morning_end = time(12, 0)   # 12:00 PM
        
        if not (morning_start <= value <= morning_end):
            raise serializers.ValidationError(
                "Pickup time must be between 8:00 AM and 12:00 PM"
            )
        
        return value
    
    def validate(self, data):
        """Cross-field validation"""
        pickup_address = data.get('pickup_address', {})
        delivery_address = data.get('delivery_address', {})
        
        # Validate addresses are different
        if pickup_address == delivery_address:
            raise serializers.ValidationError(
                "Pickup and delivery addresses must be different"
            )
        
        # Validate required address fields
        required_address_fields = ['street_address', 'city', 'state', 'zip_code']
        for addr_type, address in [('pickup', pickup_address), ('delivery', delivery_address)]:
            for field in required_address_fields:
                if not address.get(field):
                    raise serializers.ValidationError(
                        f"{addr_type.title()} address {field} is required"
                    )
        
        return data

class PaymentSerializer(serializers.ModelSerializer):
    """Payment validation patterns"""
    
    def validate_amount(self, value):
        """Validate payment amount"""
        from decimal import Decimal
        
        if value <= Decimal('0.00'):
            raise serializers.ValidationError(
                "Payment amount must be greater than zero"
            )
        
        # Business rule: Maximum payment amount
        max_amount = Decimal('10000.00')
        if value > max_amount:
            raise serializers.ValidationError(
                f"Payment amount cannot exceed ${max_amount}"
            )
        
        return value
```

### Model Field Constraints

```python
# Database-level constraints from models

class Booking(models.Model):
    # Field-level constraints
    pickup_date = models.DateField(
        validators=[
            # Custom validator for future dates
            lambda value: value >= date.today() or 
            ValidationError("Pickup date must be today or in the future")
        ]
    )
    
    total_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[
            MinValueValidator(Decimal('0.01'), "Cost must be positive"),
            MaxValueValidator(Decimal('99999.99'), "Cost exceeds maximum")
        ]
    )
    
    # Database constraints
    class Meta:
        constraints = [
            models.CheckConstraint(
                check=models.Q(total_cost__gte=0),
                name='positive_total_cost'
            ),
            models.UniqueConstraint(
                fields=['customer', 'pickup_date', 'pickup_time'],
                condition=models.Q(status__in=['pending', 'paid', 'in_progress']),
                name='unique_active_booking_per_customer_timeslot'
            ),
        ]

class Payment(models.Model):
    class Meta:
        constraints = [
            models.CheckConstraint(
                check=models.Q(amount__gt=0),
                name='positive_payment_amount'
            ),
        ]
        indexes = [
            models.Index(fields=['stripe_payment_intent_id']),
            models.Index(fields=['status', 'created_at']),
        ]
```

### Business Rule Edge Cases

```python
# Edge case handling patterns

class BookingStatusValidator:
    """Handle booking status transition edge cases"""
    
    @staticmethod
    def validate_status_change(booking, new_status, user=None):
        """Comprehensive status change validation"""
        
        # Edge case: Cannot modify completed or cancelled bookings
        if booking.status in ['completed', 'cancelled']:
            raise ValidationError(
                f"Cannot modify {booking.status} booking"
            )
        
        # Edge case: Only staff can cancel paid bookings
        if new_status == 'cancelled' and booking.status == 'paid':
            if not (user and hasattr(user, 'staff_profile')):
                raise ValidationError(
                    "Only staff can cancel paid bookings"
                )
        
        # Edge case: Cannot skip payment for authenticated users
        if (new_status == 'in_progress' and 
            booking.status == 'pending' and 
            booking.customer is not None):
            raise ValidationError(
                "Authenticated bookings must be paid before processing"
            )

class PaymentValidator:
    """Handle payment processing edge cases"""
    
    @staticmethod
    def validate_refund_request(payment, refund_amount):
        """Validate refund requests"""
        
        # Edge case: Cannot refund more than paid
        total_refunded = payment.refunds.filter(
            status='succeeded'
        ).aggregate(
            total=models.Sum('amount')
        )['total'] or Decimal('0.00')
        
        available_for_refund = payment.amount - total_refunded
        
        if refund_amount > available_for_refund:
            raise ValidationError(
                f"Refund amount ${refund_amount} exceeds available "
                f"refund amount ${available_for_refund}"
            )
        
        # Edge case: Cannot refund failed payments
        if payment.status != 'succeeded':
            raise ValidationError(
                "Cannot refund unsuccessful payments"
            )
```

### Permission and Access Control Edge Cases

```python
# Authorization edge case handling

class BookingPermissions:
    """Handle booking access control edge cases"""
    
    @staticmethod
    def can_view_booking(user, booking):
        """Determine if user can view specific booking"""
        
        # Customer can view their own bookings
        if (hasattr(user, 'customer_profile') and 
            booking.customer == user.customer_profile):
            return True
        
        # Guest bookings: Can view with email verification
        # (This would require additional session/token mechanism)
        
        # Staff can view all bookings
        if (hasattr(user, 'staff_profile') and 
            user.staff_profile.is_active):
            return True
        
        return False
    
    @staticmethod
    def can_modify_booking(user, booking):
        """Determine if user can modify specific booking"""
        
        # Edge case: Customers cannot modify after payment
        if (hasattr(user, 'customer_profile') and 
            booking.customer == user.customer_profile):
            return booking.status == 'pending'
        
        # Staff can modify based on role
        if (hasattr(user, 'staff_profile') and 
            user.staff_profile.is_active):
            return user.staff_profile.has_permission('edit_bookings')
        
        return False
```

## SECTION 8: CONFIGURATION & DEPLOYMENT REFERENCE

### Production vs Development Configuration

```python
# Development Configuration (settings.py with DEBUG=True)
DEBUG = True
ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0']

# Database: Local PostgreSQL
DATABASE_URL = 'postgresql://user:pass@localhost:5435/totetaxi'

# Redis: Local instance
REDIS_URL = 'redis://localhost:6382/0'

# Stripe: Test keys
STRIPE_SECRET_KEY = 'sk_test_...'
STRIPE_PUBLISHABLE_KEY = 'pk_test_...'

# CORS: Allow local frontend
CORS_ALLOWED_ORIGINS = ['http://localhost:3000']

# Production Configuration (settings.py with DEBUG=False)
DEBUG = False
ALLOWED_HOSTS = ['yourdomain.com', 'www.yourdomain.com']

# Database: Production PostgreSQL (via DATABASE_URL)
# Redis: Production Redis instance
# Stripe: Live keys
# CORS: Production frontend origins

# Security settings for production
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
```

### Docker Configuration

```dockerfile
# Complete Dockerfile for production deployment
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PORT=8000

WORKDIR /app

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        postgresql-client \
        build-essential \
        libpq-dev \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . /app/

# Set execute permissions for entrypoint
RUN chmod +x scripts/entrypoint.sh

# Expose port
EXPOSE $PORT

# Use custom entrypoint
ENTRYPOINT ["scripts/entrypoint.sh"]

# Default command
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "3", "config.wsgi:application"]
```

### Deployment Infrastructure Requirements

```python
# Required Infrastructure Components

# 1. PostgreSQL Database
# - Version: 12+ recommended
# - Configuration: UTF-8 encoding, timezone-aware
# - Backup: Daily automated backups

# 2. Redis Instance  
# - Version: 6+ recommended
# - Usage: Caching and Celery message broker
# - Memory: Based on cache requirements

# 3. Application Server
# - Python 3.11+
# - Gunicorn WSGI server
# - Multiple worker processes for concurrency

# 4. Background Task Processing
# - Celery workers for async tasks
# - Celery beat for periodic tasks
# - Proper monitoring and restart policies

# 5. External Services
# - Stripe: Payment processing (live keys)
# - AWS S3: File storage (if enabled)
# - AWS SES: Email sending (if enabled)
# - Onfleet: Delivery coordination (if enabled)

# 6. Monitoring & Logging
# - Application logs to files/service
# - Error tracking (Sentry if configured)
# - Performance monitoring
# - Database query monitoring
```

### Performance & Security Configuration

```python
# Production Performance Settings
CONN_MAX_AGE = 60  # Database connection pooling
DATABASES['default']['CONN_MAX_AGE'] = CONN_MAX_AGE

# Static file serving with WhiteNoise
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
WHITENOISE_USE_FINDERS = True
WHITENOISE_AUTOREFRESH = True

# Security Headers
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'

# Rate Limiting (if django-ratelimit installed)
RATELIMIT_ENABLE = True

# Gunicorn Configuration (gunicorn.conf.py)
bind = "0.0.0.0:8000"
workers = 3
worker_class = "sync"
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 100
timeout = 30
keepalive = 5
```
