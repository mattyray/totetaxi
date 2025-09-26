I'll help you generate the backend living documentation. First, let me search the project knowledge to find the Django code snapshot or backend information that I can analyze.Based on the comprehensive Django code snapshot I found, I'll generate the backend living documentation for the ToteTaxi luxury delivery service following the extraction protocol.

# TOTETAXI BACKEND - LIVING DOCUMENTATION
**AI Memory Persistence System - Complete Django Project Reference**

Generated: 2025-09-26 | Files Analyzed: 116 | Apps: 9

---

## SECTION 1: SYSTEM MENTAL MODEL

### Django Project Architecture Philosophy
ToteTaxi implements a luxury delivery service platform using Django 5.2.5 + DRF 3.16.1, designed around three core business domains:
- **Service Management**: Mini-moves, standard delivery, specialty items, organizing services
- **Customer Experience**: Guest booking, authenticated customers, saved addresses, payment methods
- **Operations Management**: Staff dashboard, booking management, logistics coordination

### Business Domain Separation Strategy
**Core Apps Architecture:**
```
apps/accounts/     → Staff authentication & management (StaffProfile, StaffAction)
apps/customers/    → Customer profiles, authentication, addresses, payment methods
apps/bookings/     → Booking lifecycle, guest checkout, pricing calculations
apps/services/     → Service catalog, packages, organizing services, surcharge rules
apps/payments/     → Stripe integration, payment processing, refunds
apps/logistics/    → Delivery coordination, route optimization (placeholder)
apps/documents/    → Invoice generation, COI, contracts (placeholder)
apps/notifications/ → Email/SMS communications (placeholder)
apps/crm/          → Customer relationship management (placeholder)
```

### Integration Approach & External Services
- **Payment Processing**: Stripe API for payment methods, charges, refunds
- **Email**: Django SES backend for transactional emails
- **Storage**: S3 for document/media storage
- **Background Tasks**: Celery + Redis for async processing
- **Database**: PostgreSQL with optimized indexes
- **Caching**: Redis for session storage and caching

---

## SECTION 2: COMPLETE API ENDPOINT REFERENCE

### Authentication Endpoints

#### Staff Authentication
**POST** `/api/staff/auth/login/`
- **View**: `StaffLoginView`
- **Auth**: None required
- **Request**: `{"username": "string", "password": "string"}`
- **Response**: `{"user": StaffUserSerializer, "profile": StaffProfileSerializer}`
- **Business Logic**: Validates staff credentials, checks account lock status, logs login action
- **Validation**: Staff profile required, account not locked

**POST** `/api/staff/auth/logout/`
- **View**: `StaffLogoutView` 
- **Auth**: Staff authentication required
- **Response**: `{"message": "Logged out successfully"}`

#### Customer Authentication  
**POST** `/api/customers/auth/register/`
- **View**: `CustomerRegistrationView`
- **Auth**: None required
- **Request**: `{"email": "string", "password": "string", "first_name": "string", "last_name": "string"}`
- **Response**: `{"user": CustomerUserSerializer, "profile": CustomerProfileSerializer}`
- **Business Logic**: Creates User + CustomerProfile, prevents duplicate accounts
- **Validation**: Unique email, password strength, prevents staff/customer account collision

**POST** `/api/customers/auth/login/`
- **View**: `CustomerLoginView`
- **Auth**: None required  
- **Request**: `{"email": "string", "password": "string"}`
- **Response**: `{"user": CustomerUserSerializer, "profile": CustomerProfileSerializer}`
- **Business Logic**: Validates customer credentials, ensures single profile type
- **Validation**: Customer account only, not staff account

### Service Catalog Endpoints

**GET** `/api/bookings/services/`
- **View**: `ServiceCatalogView`
- **Auth**: None required
- **Response**: `{"mini_move_packages": [...], "standard_delivery": {...}, "specialty_items": [...], "organizing_services": [...]}`
- **Business Logic**: Returns active service catalog with pricing
- **Query Params**: None

**POST** `/api/bookings/pricing-preview/`
- **View**: `PricingPreviewView` 
- **Auth**: None required
- **Request**: Service selection + booking details
- **Response**: `{"subtotal_cents": int, "surcharges": [...], "total_cents": int}`
- **Business Logic**: Calculates pricing with surcharges, validates service combinations

### Booking Management Endpoints

**POST** `/api/bookings/guest-booking/`
- **View**: `GuestBookingCreateView`
- **Auth**: None required
- **Request**: Complete booking + customer info + payment
- **Response**: `{"booking": BookingSerializer, "guest_checkout": GuestCheckoutSerializer}`
- **Business Logic**: Creates guest user, processes payment, sends confirmation

**GET** `/api/bookings/booking-status/{booking_number}/`
- **View**: `BookingStatusView`
- **Auth**: None required
- **Response**: `{"status": "string", "pickup_date": "date", "estimated_delivery": "datetime"}`
- **Business Logic**: Public booking lookup by booking number

### Staff Management Endpoints

**GET** `/api/staff/dashboard/`
- **View**: `StaffDashboardView`
- **Auth**: Staff authentication required
- **Response**: Dashboard metrics and recent activity
- **Business Logic**: Aggregates booking stats, recent actions, alerts

**GET** `/api/staff/bookings/`
- **View**: `BookingManagementView`
- **Auth**: Staff authentication required
- **Response**: Paginated booking list with filters
- **Query Params**: `status`, `date_range`, `customer_id`, `service_type`

**GET** `/api/staff/customers/`
- **View**: `CustomerManagementView`
- **Auth**: Staff authentication required
- **Response**: Customer profiles with booking history
- **Query Params**: `search`, `registration_date`, `total_bookings`

### Customer Dashboard Endpoints

**GET** `/api/customers/dashboard/`
- **View**: `CustomerDashboardView`
- **Auth**: Customer authentication required
- **Response**: `{"recent_bookings": [...], "saved_addresses": [...], "payment_methods": [...]}`
- **Business Logic**: Customer's booking history and saved preferences

**GET/POST** `/api/customers/addresses/`
- **View**: `SavedAddressListCreateView`
- **Auth**: Customer authentication required
- **Response**: Customer's saved addresses
- **Business Logic**: Address validation, geolocation, delivery feasibility

---

## SECTION 3: COMPLETE MODEL DOCUMENTATION

### Core Authentication Models

```python
class StaffProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='staff_profile')
    role = models.CharField(max_length=50, choices=STAFF_ROLES, default='dispatcher')
    employee_id = models.CharField(max_length=20, unique=True)
    phone = models.CharField(max_length=15)
    is_account_locked = models.BooleanField(default=False)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    failed_login_attempts = models.PositiveIntegerField(default=0)
    password_changed_at = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Business Logic Methods:
    def reset_failed_attempts(self): # Reset login failures
    def increment_failed_attempts(self): # Track login failures
    def lock_account(self): # Security lockout
```

```python
class CustomerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='customer_profile')
    phone = models.CharField(max_length=15, blank=True)
    preferred_pickup_time = models.CharField(max_length=20, choices=TIME_PREFERENCES)
    marketing_consent = models.BooleanField(default=False)
    sms_notifications = models.BooleanField(default=True)
    staff_notes = models.TextField(blank=True)  # Internal staff notes
    total_bookings = models.PositiveIntegerField(default=0)
    total_spent_cents = models.PositiveIntegerField(default=0)
    loyalty_tier = models.CharField(max_length=20, choices=LOYALTY_TIERS, default='bronze')
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Business Logic Methods:
    @staticmethod
    def ensure_single_profile_type(user): # Prevents staff/customer collision
    def update_booking_stats(self, booking): # Updates metrics
    def calculate_loyalty_tier(self): # Tier progression logic
```

### Service Catalog Models

```python
class MiniMovePackage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    package_type = models.CharField(max_length=20, choices=PACKAGE_TYPES, unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField()
    base_price_cents = models.PositiveIntegerField()
    max_items = models.PositiveIntegerField()
    max_weight_per_item_lbs = models.PositiveIntegerField()
    coi_included = models.BooleanField(default=False)
    coi_fee_cents = models.PositiveIntegerField(default=0)
    priority_scheduling = models.BooleanField(default=False)
    protective_wrapping = models.BooleanField(default=False)
    is_most_popular = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    
    # Business Logic Methods:
    def get_total_price_cents(self, include_coi=False): # Price calculation
    def validate_item_constraints(self, items): # Item validation
```

```python
class OrganizingService(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=100)
    description = models.TextField()
    service_tier = models.CharField(max_length=20, choices=ORGANIZING_TIERS)
    base_price_cents = models.PositiveIntegerField()
    hourly_rate_cents = models.PositiveIntegerField()
    min_hours = models.PositiveIntegerField(default=2)
    max_hours = models.PositiveIntegerField(default=8)
    includes_supplies = models.BooleanField(default=False)
    is_most_popular = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    
    # Business Logic Methods:
    def calculate_total_cost(self, hours): # Total cost calculation
    def validate_hour_constraints(self, hours): # Hour validation
```

### Booking System Models

```python
class Booking(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    booking_number = models.CharField(max_length=20, unique=True)
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bookings')
    
    # Service Configuration
    service_type = models.CharField(max_length=20, choices=SERVICE_TYPES)
    mini_move_package = models.ForeignKey(MiniMovePackage, null=True, on_delete=models.SET_NULL)
    include_packing = models.BooleanField(default=False)
    include_unpacking = models.BooleanField(default=False)
    
    # Scheduling
    pickup_date = models.DateField()
    pickup_time = models.CharField(max_length=20, choices=TIME_PREFERENCES)
    estimated_pickup_time = models.TimeField(null=True)
    estimated_delivery_time = models.DateTimeField(null=True)
    
    # Pricing (all in cents)
    subtotal_cents = models.PositiveIntegerField()
    geographic_surcharge_cents = models.PositiveIntegerField(default=0)
    rush_surcharge_cents = models.PositiveIntegerField(default=0)
    total_cents = models.PositiveIntegerField()
    
    # Status Management
    status = models.CharField(max_length=20, choices=BOOKING_STATUSES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Business Logic Methods:
    def save(self, *args, **kwargs): # Auto-generate booking number
    def calculate_total_price(self): # Price calculation with surcharges
    def can_be_cancelled(self): # Cancellation business rules
    def update_status(self, new_status, staff_user=None): # Status transitions
```

```python
class Address(models.Model):
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='addresses')
    address_type = models.CharField(max_length=10, choices=ADDRESS_TYPES)
    address_line_1 = models.CharField(max_length=255)
    address_line_2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=2)
    zip_code = models.CharField(max_length=10)
    delivery_instructions = models.TextField(blank=True)
    
    # Business Logic Methods:
    @property
    def formatted_address(self): # Formatted address string
    def is_within_service_area(self): # Service area validation
```

### Payment System Models

```python  
class Payment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='payments')
    stripe_payment_intent_id = models.CharField(max_length=255, unique=True)
    amount_cents = models.PositiveIntegerField()
    status = models.CharField(max_length=20, choices=PAYMENT_STATUSES, default='pending')
    payment_method_type = models.CharField(max_length=20, default='card')
    failure_reason = models.TextField(blank=True)
    processed_at = models.DateTimeField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Business Logic Methods:
    def mark_as_paid(self): # Payment success handling
    def mark_as_failed(self, reason): # Payment failure handling
    def process_refund(self, amount_cents=None): # Refund processing
```

---

## SECTION 4: BUSINESS LOGIC IMPLEMENTATION GUIDE

### Authentication & Authorization Logic

**Staff Account Security:**
```python
def increment_failed_attempts(self):
    """Security: Track failed login attempts and lock account after 5 failures"""
    self.failed_login_attempts += 1
    if self.failed_login_attempts >= 5:
        self.lock_account()
    self.save(update_fields=['failed_login_attempts', 'is_account_locked'])

def reset_failed_attempts(self):
    """Reset failed attempts on successful login"""
    self.failed_login_attempts = 0
    self.save(update_fields=['failed_login_attempts'])
```

**Customer Profile Validation:**
```python
@staticmethod
def ensure_single_profile_type(user):
    """Prevents users from having both staff and customer profiles"""
    if hasattr(user, 'staff_profile') and hasattr(user, 'customer_profile'):
        raise ValidationError("User cannot have both staff and customer profiles")
```

### Pricing Calculation Algorithm

**Base Pricing Logic:**
```python
def calculate_total_price(self):
    """Complete pricing calculation with surcharges"""
    base_price = 0
    
    # Service-specific pricing
    if self.service_type == 'mini_move' and self.mini_move_package:
        base_price = self.mini_move_package.base_price_cents
        
        # Add packing/unpacking fees
        if self.include_packing:
            base_price += PACKING_FEE_CENTS
        if self.include_unpacking:
            base_price += UNPACKING_FEE_CENTS
    
    # Apply surcharges
    total_surcharge = self.geographic_surcharge_cents + self.rush_surcharge_cents
    
    return base_price + total_surcharge
```

**Surcharge Rules Engine:**
```python  
def apply_geographic_surcharge(booking):
    """Apply surcharges based on delivery location"""
    surcharge_rules = SurchargeRule.objects.filter(
        rule_type='geographic',
        is_active=True
    )
    
    for rule in surcharge_rules:
        if rule.condition_matches(booking):
            return rule.surcharge_amount_cents
    return 0
```

### Booking Lifecycle State Machine

**Status Transitions:**
```python
BOOKING_STATUS_TRANSITIONS = {
    'pending': ['confirmed', 'cancelled'],
    'confirmed': ['in_progress', 'cancelled'],
    'in_progress': ['completed', 'delayed'],
    'delayed': ['completed', 'cancelled'],
    'completed': ['refunded'],
    'cancelled': [],
    'refunded': []
}

def update_status(self, new_status, staff_user=None):
    """Enforce valid status transitions"""
    if new_status not in BOOKING_STATUS_TRANSITIONS.get(self.status, []):
        raise ValidationError(f"Cannot change status from {self.status} to {new_status}")
    
    self.status = new_status
    self.save()
    
    # Log status change
    if staff_user:
        StaffAction.log_action(
            staff_user=staff_user,
            action_type='booking_status_update',
            description=f"Updated booking {self.booking_number} status to {new_status}",
            booking_id=str(self.id)
        )
```

### Payment Processing Workflow

**Stripe Integration Logic:**
```python
class StripePaymentService:
    @staticmethod
    def process_booking_payment(booking, payment_method_id):
        """Process payment for booking using Stripe"""
        stripe.api_key = settings.STRIPE_SECRET_KEY
        
        try:
            # Create payment intent
            intent = stripe.PaymentIntent.create(
                amount=booking.total_cents,
                currency='usd',
                payment_method=payment_method_id,
                confirm=True,
                metadata={'booking_id': str(booking.id)}
            )
            
            # Create payment record
            payment = Payment.objects.create(
                booking=booking,
                stripe_payment_intent_id=intent.id,
                amount_cents=booking.total_cents,
                status='processing'
            )
            
            if intent.status == 'succeeded':
                payment.mark_as_paid()
                booking.update_status('confirmed')
            
            return payment, intent
            
        except stripe.error.CardError as e:
            return None, e.user_message
```

### Address Validation & Service Area Logic

**Geographic Validation:**
```python
def is_within_service_area(self):
    """Check if address is within ToteTaxi service area"""
    # NYC Metro Area ZIP codes
    NYC_SERVICE_ZIPS = [
        '10001', '10002', '10003', # Manhattan
        '11201', '11215', '11217', # Brooklyn  
        '10451', '10452', '10453', # Bronx
        '11101', '11102', '11103', # Queens
    ]
    
    return self.zip_code in NYC_SERVICE_ZIPS

def calculate_delivery_distance(self):
    """Calculate distance between pickup and delivery addresses"""
    # Integration point for Google Maps Distance Matrix API
    pass
```

---

## SECTION 5: INTEGRATION ARCHITECTURE REFERENCE

### Django Settings Configuration

**Core Settings:**
```python
# Database Configuration
DATABASES = {
    'default': dj_database_url.parse(
        env('DATABASE_URL', default='postgres://postgres:postgres@localhost:5435/totetaxi'),
        conn_max_age=600
    )
}

# Redis Configuration  
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

# Celery Background Tasks
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'
```

**External Service Integration:**
```python
# Stripe Payment Processing
STRIPE_PUBLISHABLE_KEY = env('STRIPE_PUBLISHABLE_KEY')
STRIPE_SECRET_KEY = env('STRIPE_SECRET_KEY')
STRIPE_WEBHOOK_SECRET = env('STRIPE_WEBHOOK_SECRET')

# AWS S3 Storage
AWS_ACCESS_KEY_ID = env('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = env('AWS_SECRET_ACCESS_KEY')
AWS_STORAGE_BUCKET_NAME = env('AWS_STORAGE_BUCKET_NAME')
AWS_S3_REGION_NAME = env('AWS_S3_REGION_NAME', default='us-east-1')

# Email Configuration (SES)
EMAIL_BACKEND = 'django_ses.SESBackend'
AWS_SES_REGION_NAME = env('AWS_SES_REGION_NAME', default='us-east-1')
```

### API Authentication Configuration

**DRF Settings:**
```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ]
}
```

### CORS and Security Configuration

```python
# CORS Headers
CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[
    'http://localhost:3000',  # React frontend
    'http://127.0.0.1:3000',
])

CORS_ALLOW_CREDENTIALS = True

# Security Settings
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = 31536000 if not DEBUG else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
```

---

## SECTION 6: DEVELOPMENT EXTENSION PATTERNS

### Adding New Service Types

**1. Model Extension:**
```python
# In apps/services/models.py
class NewServiceType(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=100)
    base_price_cents = models.PositiveIntegerField()
    is_active = models.BooleanField(default=True)
    
    def calculate_price(self, **kwargs):
        # Service-specific pricing logic
        pass
```

**2. Serializer Addition:**
```python
# In apps/services/serializers.py
class NewServiceTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = NewServiceType
        fields = '__all__'
```

**3. Update Service Catalog View:**
```python
# In apps/bookings/views.py - ServiceCatalogView
def get(self, request):
    data = {
        'mini_move_packages': [...],
        'new_service_types': NewServiceTypeSerializer(
            NewServiceType.objects.filter(is_active=True), many=True
        ).data
    }
```

### Adding New Booking Fields

**1. Model Migration:**
```python
# Migration file
class Migration(migrations.Migration):
    operations = [
        migrations.AddField(
            model_name='booking',
            name='new_field',
            field=models.CharField(max_length=100, blank=True),
        ),
    ]
```

**2. Serializer Update:**
```python
# In apps/bookings/serializers.py
class BookingSerializer(serializers.ModelSerializer):
    class Meta:
        fields = (..., 'new_field')  # Add to existing fields
```

**3. Business Logic Integration:**
```python
# Update pricing calculation if needed
def calculate_total_price(self):
    base_price = super().calculate_total_price()
    if self.new_field:
        base_price += NEW_FIELD_SURCHARGE
    return base_price
```

### Adding Staff Permission Levels

**1. Extend StaffProfile:**
```python
# In apps/accounts/models.py
STAFF_ROLES = [
    ('dispatcher', 'Dispatcher'),
    ('manager', 'Manager'),
    ('admin', 'Administrator'),
    ('new_role', 'New Role'),  # Add new role
]
```

**2. Permission Decorator:**
```python
# In apps/accounts/permissions.py
def require_staff_role(required_role):
    def decorator(view_func):
        def wrapped_view(self, request, *args, **kwargs):
            if not hasattr(request.user, 'staff_profile'):
                return Response({'error': 'Staff access required'}, 
                              status=status.HTTP_403_FORBIDDEN)
            
            if request.user.staff_profile.role != required_role:
                return Response({'error': 'Insufficient permissions'}, 
                              status=status.HTTP_403_FORBIDDEN)
            
            return view_func(self, request, *args, **kwargs)
        return wrapped_view
    return decorator
```

### Testing Pattern Examples

**1. Model Tests:**
```python
# In apps/bookings/tests.py
class BookingModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('test@example.com', 'password')
        self.package = MiniMovePackage.objects.create(...)
    
    def test_booking_number_generation(self):
        booking = Booking.objects.create(customer=self.user, ...)
        self.assertIsNotNone(booking.booking_number)
        self.assertTrue(booking.booking_number.startswith('TT'))
```

**2. API Integration Tests:**
```python
class BookingAPITests(APITestCase):
    def test_guest_booking_creation(self):
        data = {
            'service_type': 'mini_move',
            'customer_info': {...},
            'pickup_address': {...},
            'payment_method_id': 'pm_test_123'
        }
        response = self.client.post('/api/bookings/guest-booking/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
```

---

## SECTION 7: VALIDATION & CONSTRAINT REFERENCE

### Model-Level Constraints

**Booking Validation Rules:**
```python
class Booking(models.Model):
    # ... fields ...
    
    class Meta:
        constraints = [
            models.CheckConstraint(
                check=models.Q(pickup_date__gte=timezone.now().date()),
                name='pickup_date_not_in_past'
            ),
            models.CheckConstraint(
                check=models.Q(total_cents__gte=0),
                name='total_cents_non_negative'
            )
        ]
        indexes = [
            models.Index(fields=['customer', '-created_at']),
            models.Index(fields=['status', 'pickup_date']),
            models.Index(fields=['booking_number']),
        ]
```

**Address Validation:**
```python
def clean(self):
    """Model-level validation for addresses"""
    if not self.is_within_service_area():
        raise ValidationError('Address is outside service area')
    
    if self.address_type == 'pickup' and not self.delivery_instructions:
        if self.zip_code in RESTRICTED_PICKUP_AREAS:
            raise ValidationError('Pickup instructions required for this area')
```

### Serializer Validation Rules

**Payment Method Validation:**
```python
class CustomerPaymentMethodSerializer(serializers.ModelSerializer):
    def validate_stripe_payment_method_id(self, value):
        """Validate Stripe payment method exists and is valid"""
        try:
            stripe.PaymentMethod.retrieve(value)
            return value
        except stripe.error.InvalidRequestError:
            raise serializers.ValidationError("Invalid payment method")
    
    def validate(self, attrs):
        """Cross-field validation"""
        if attrs.get('is_default'):
            # Ensure only one default payment method per customer
            user = self.context['request'].user
            existing_default = CustomerPaymentMethod.objects.filter(
                user=user, is_default=True
            ).exclude(pk=getattr(self.instance, 'pk', None))
            
            if existing_default.exists():
                existing_default.update(is_default=False)
        
        return attrs
```

**Booking Time Validation:**
```python
class BookingSerializer(serializers.ModelSerializer):
    def validate_pickup_date(self, value):
        """Ensure pickup date is not in the past and within booking window"""
        today = timezone.now().date()
        max_advance_days = 90
        
        if value < today:
            raise serializers.ValidationError("Pickup date cannot be in the past")
        
        if value > today + timedelta(days=max_advance_days):
            raise serializers.ValidationError(f"Cannot book more than {max_advance_days} days in advance")
        
        return value
    
    def validate_pickup_time(self, value):
        """Validate pickup time slots"""
        if value == 'morning_specific':
            # Additional validation for specific time slots
            pass
        return value
```

### Business Rule Exceptions

**Service Availability Rules:**
```python
def validate_service_availability(pickup_date, service_type):
    """Check service availability for given date"""
    # Check if date is a blackout date
    if pickup_date in BLACKOUT_DATES:
        raise ValidationError("Service not available on selected date")
    
    # Check capacity limits
    existing_bookings = Booking.objects.filter(
        pickup_date=pickup_date,
        service_type=service_type,
        status__in=['confirmed', 'in_progress']
    ).count()
    
    if existing_bookings >= DAILY_CAPACITY_LIMITS.get(service_type, 10):
        raise ValidationError("No availability on selected date")
```

**Geographic Service Constraints:**
```python
def validate_delivery_feasibility(pickup_address, delivery_address):
    """Validate delivery route feasibility"""
    if not pickup_address.is_within_service_area():
        raise ValidationError("Pickup location outside service area")
    
    if not delivery_address.is_within_service_area():
        raise ValidationError("Delivery location outside service area")
    
    # Check for restricted routes
    distance = calculate_delivery_distance(pickup_address, delivery_address)
    if distance > MAX_DELIVERY_DISTANCE:
        raise ValidationError("Delivery distance exceeds maximum allowed")
```

---

## SECTION 8: CONFIGURATION & DEPLOYMENT REFERENCE

### Environment Variables

**Required Production Variables:**
```bash
# Database
DATABASE_URL=postgres://user:pass@host:port/dbname

# Redis
REDIS_URL=redis://host:port/0

# Django
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# AWS Services
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_STORAGE_BUCKET_NAME=totetaxi-storage
AWS_S3_REGION_NAME=us-east-1
AWS_SES_REGION_NAME=us-east-1

# Stripe
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# CORS
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

**Docker Configuration:**
```dockerfile
# Production Dockerfile optimizations
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . /app/

# Collect static files
RUN python manage.py collectstatic --no-input

EXPOSE 8000

ENTRYPOINT ["/app/scripts/entrypoint.sh"]
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000"]
```

### Performance Configuration

**Database Optimization:**
```python
# Connection pooling
DATABASES['default']['OPTIONS'] = {
    'MAX_CONNS': 20,
    'conn_max_age': 600,
}

# Query optimization
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Index optimization - already implemented in models
```

**Caching Strategy:**
```python
# Redis caching
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': REDIS_URL,
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'CONNECTION_POOL_KWARGS': {'max_connections': 50}
        }
    }
}

# Session storage
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'
```

### Security Configuration

**Production Security Headers:**
```python
# HTTPS enforcement
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Security headers
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# CSRF protection
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
```

### Monitoring and Logging

**Logging Configuration:**
```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': '/app/logs/django.log',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['file'],
        'level': 'INFO',
    },
}
```

This living documentation provides complete executive function over the ToteTaxi Django backend, enabling independent development, feature extension, and system maintenance across all business domains.