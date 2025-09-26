I'll help you generate comprehensive living documentation for your Django backend project. Let me first search the project knowledge to find the backend code snapshot that needs to be documented.Based on the comprehensive Django code snapshot, I'll generate the complete living documentation for your ToteTaxi luxury delivery service backend. This follows the comprehensive Django extraction protocol and provides full executive function over the project.

# TOTETAXI BACKEND - LIVING DOCUMENTATION
**AI MEMORY PERSISTENCE SYSTEM FOR DJANGO/DRF BACKEND**

Generated: September 26, 2025  
Project: ToteTaxi Luxury Delivery Service Backend  
Tech Stack: Django 5.2.5, DRF 3.16.1, PostgreSQL, Redis, Celery  
Apps: 9 Django Applications (accounts, bookings, crm, customers, documents, logistics, notifications, payments, services)

---

## SECTION 1: SYSTEM MENTAL MODEL

### Django Project Architecture Philosophy
ToteTaxi follows a **service-oriented Django architecture** with clear separation of concerns across 9 specialized Django applications. The system is designed as a **dual-interface platform** serving both guest customers (no authentication) and authenticated customers/staff with role-based access control.

**Core Architecture Principles:**
- **Guest-First Design**: Critical booking flows work without authentication (guest checkout)
- **Staff Operations Hub**: Comprehensive staff dashboard for order management and customer service
- **Service Catalog Driven**: Dynamic pricing and service configuration through database models
- **Payment-Centric**: Stripe integration with comprehensive audit trails and refund workflows
- **Logistics Integration**: Onfleet API integration for delivery tracking and driver management

### Business Domain Separation Strategy
The application follows a **capability-based app structure** rather than feature-based:

**Core Business Apps:**
- `services/` - Service catalog, pricing rules, organizing services (business logic core)
- `bookings/` - Order management, guest checkout, scheduling (customer-facing core)
- `payments/` - Stripe integration, refunds, financial audit trails (transaction core)
- `customers/` - Customer profiles, authentication, saved addresses (user management)
- `accounts/` - Staff management, role-based permissions, action logging (internal ops)

**Supporting Apps:**
- `logistics/` - Onfleet integration, driver management, delivery tracking
- `notifications/` - Email/SMS communications (placeholder for future)
- `documents/` - Certificate of Insurance (COI) management (placeholder)
- `crm/` - Customer relationship management (placeholder for future)

### Integration Approach and External Service Patterns
**External Service Integration Strategy:**
- **Stripe Payments**: PaymentIntent-based flow with webhook confirmation
- **AWS S3**: Static/media file storage with CloudFront CDN
- **AWS SES**: Email delivery for notifications
- **Onfleet API**: Logistics and driver management with webhook status updates
- **Redis**: Caching and rate limiting for API endpoints
- **PostgreSQL**: Primary database with proper foreign key constraints

---

## SECTION 2: COMPLETE API ENDPOINT REFERENCE

### Public Booking API (apps/bookings/urls.py)
**Base Path:** `/api/public/`

#### Service Catalog Endpoints
```python
# GET /api/public/services/
URL: /api/public/services/
HTTP Method: GET
View Class: ServiceCatalogView
Authentication: AllowAny (no auth required)
Request Schema: None (GET only)
Response Schema: {
    "mini_move_packages": [MiniMovePackage],
    "standard_delivery": StandardDeliveryConfig,
    "specialty_items": [SpecialtyItem],
    "organizing_services": [OrganizingService]
}
Business Logic: Returns complete service catalog with pricing
Query Parameters: None
```

```python
# GET /api/public/services/mini-moves-with-organizing/
URL: /api/public/services/mini-moves-with-organizing/
HTTP Method: GET
View Class: ServiceCatalogWithOrganizingView
Authentication: AllowAny
Response Schema: {
    "packages": [MiniMovePackageWithOrganizing]
}
Business Logic: Returns mini move packages with their associated organizing services
```

```python
# GET /api/public/services/organizing-by-tier/
URL: /api/public/services/organizing-by-tier/
HTTP Method: GET
View Class: OrganizingServicesByTierView
Authentication: AllowAny
Response Schema: {
    "petite": [OrganizingService],
    "standard": [OrganizingService], 
    "full": [OrganizingService]
}
Business Logic: Returns organizing services grouped by mini move tier
```

#### Booking Management Endpoints
```python
# POST /api/public/guest-booking/
URL: /api/public/guest-booking/
HTTP Method: POST
View Class: GuestBookingCreateView
Authentication: AllowAny (guest booking)
Request Schema: {
    "service_type": "mini_move" | "standard_delivery" | "specialty_item",
    "mini_move_package_id": "uuid",
    "include_packing": boolean,
    "include_unpacking": boolean,
    "pickup_date": "YYYY-MM-DD",
    "pickup_time": "morning" | "morning_specific" | "no_time_preference",
    "specific_pickup_hour": 8-17,
    "pickup_address": AddressData,
    "delivery_address": AddressData,
    "customer_info": {
        "first_name": string,
        "last_name": string,
        "email": string,
        "phone": string
    },
    "special_instructions": string,
    "coi_required": boolean
}
Response Schema: {
    "message": "Booking created successfully",
    "booking": {
        "id": "uuid",
        "booking_number": "TT-XXXXXX",
        "total_price_dollars": number
    },
    "payment": PaymentIntentData (optional)
}
Business Logic: 
- Creates guest checkout record
- Calculates dynamic pricing with surcharges
- Creates booking with PENDING status
- Optionally creates Stripe PaymentIntent
- Handles geographic and time surcharges
Validation Rules:
- Validates address fields and phone format
- Ensures service compatibility (e.g., organizing services with mini moves)
- Calculates pricing based on service rules and surcharges
```

```python
# GET /api/public/booking-status/{booking_number}/
URL: /api/public/booking-status/<booking_number>/
HTTP Method: GET
View Class: BookingStatusView
Authentication: AllowAny
Response Schema: BookingStatusData
Business Logic: Returns booking details and status for guest tracking
```

#### Pricing and Availability
```python
# POST /api/public/pricing-preview/
URL: /api/public/pricing-preview/
HTTP Method: POST
View Class: PricingPreviewView
Authentication: AllowAny
Request Schema: {
    "service_type": string,
    "mini_move_package_id": "uuid",
    "include_packing": boolean,
    "include_unpacking": boolean,
    "is_outside_core_area": boolean,
    "pickup_time": string,
    "coi_required": boolean
}
Response Schema: {
    "base_price_dollars": number,
    "organizing_total_dollars": number,
    "geographic_surcharge_dollars": number,
    "time_window_surcharge_dollars": number,
    "coi_fee_dollars": number,
    "total_price_dollars": number
}
Business Logic: Dynamic pricing calculation without creating booking
```

### Payment API (apps/payments/urls.py)
**Base Path:** `/api/payments/`

```python
# POST /api/payments/create-intent/
URL: /api/payments/create-intent/
HTTP Method: POST
View Class: PaymentIntentCreateView
Authentication: AllowAny
Request Schema: {
    "booking_id": "uuid",
    "customer_email": "email" (optional)
}
Response Schema: {
    "client_secret": string,
    "payment_intent_id": string,
    "amount": number
}
Business Logic: Creates Stripe PaymentIntent for booking amount
```

```python
# POST /api/payments/confirm/
URL: /api/payments/confirm/
HTTP Method: POST
View Class: PaymentConfirmView
Authentication: AllowAny
Request Schema: {
    "payment_intent_id": string
}
Response Schema: {
    "message": "Payment confirmed successfully",
    "booking_status": string,
    "payment_status": string
}
Business Logic: 
- Confirms payment completion
- Updates booking status to PAID
- Updates customer total spending statistics
- Triggers booking confirmation workflow
```

### Staff API (apps/accounts/urls.py)
**Base Path:** `/api/staff/`

```python
# POST /api/staff/auth/login/
URL: /api/staff/auth/login/
HTTP Method: POST
View Class: StaffLoginView
Authentication: AllowAny (login endpoint)
Request Schema: {
    "username": string,
    "password": string
}
Response Schema: {
    "message": "Login successful",
    "user": StaffUserData,
    "staff_profile": StaffProfileData,
    "csrf_token": string
}
Business Logic: 
- Authenticates staff user with username/password
- Creates Django session
- Logs staff action
- Returns user permissions and role data
Validation Rules:
- Rate limited to 5 attempts per IP per minute
- Validates staff profile exists (not customer account)
- Tracks login attempts and account lockout
```

```python
# GET /api/staff/dashboard/
URL: /api/staff/dashboard/
HTTP Method: GET
View Class: StaffDashboardView
Authentication: IsAuthenticated + Staff Profile Required
Response Schema: {
    "recent_bookings": [BookingData],
    "pending_refunds": [RefundData],
    "today_statistics": {
        "total_bookings": number,
        "total_revenue_dollars": number,
        "pending_payments": number
    }
}
Business Logic: Aggregated dashboard data for staff overview
```

### Customer API (apps/customers/urls.py)
**Base Path:** `/api/customer/`

```python
# POST /api/customer/auth/register/
URL: /api/customer/auth/register/
HTTP Method: POST
View Class: CustomerRegistrationView
Authentication: AllowAny
Request Schema: {
    "email": string,
    "password": string,
    "password_confirm": string,
    "first_name": string,
    "last_name": string,
    "phone": string (optional)
}
Response Schema: {
    "message": "Registration successful",
    "user": UserData,
    "customer_profile": CustomerProfileData,
    "csrf_token": string
}
Business Logic: 
- Creates Django User with email as username
- Creates CustomerProfile
- Prevents hybrid accounts (staff/customer collision)
- Auto-login after successful registration
Validation Rules:
- Email uniqueness across staff and customer accounts
- Password confirmation matching
- Phone number format validation
```

---

## SECTION 3: COMPLETE MODEL DOCUMENTATION

### Core Booking Models (apps/bookings/models.py)

#### Booking Model
```python
class Booking(models.Model):
    # Identity
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking_number = models.CharField(max_length=20, unique=True, blank=True)
    
    # Customer Relationship (One of two - constraint enforced)
    customer = models.ForeignKey(
        User, 
        on_delete=models.PROTECT, 
        null=True, blank=True,
        related_name='bookings'
    )
    guest_checkout = models.OneToOneField(
        'GuestCheckout', 
        on_delete=models.CASCADE, 
        null=True, blank=True,
        related_name='booking'
    )
    
    # Service Configuration
    service_type = models.CharField(max_length=20, choices=SERVICE_TYPE_CHOICES)
    mini_move_package = models.ForeignKey(
        'services.MiniMovePackage',
        on_delete=models.PROTECT,
        null=True, blank=True
    )
    specialty_items = models.ManyToManyField('services.SpecialtyItem', blank=True)
    
    # Organizing Services Integration
    include_packing = models.BooleanField(default=False)
    include_unpacking = models.BooleanField(default=False)
    organizing_total_cents = models.PositiveBigIntegerField(default=0)
    
    # Scheduling
    pickup_date = models.DateField()
    pickup_time = models.CharField(max_length=20, choices=PICKUP_TIME_CHOICES)
    specific_pickup_hour = models.IntegerField(null=True, blank=True)
    
    # Addresses
    pickup_address = models.ForeignKey(
        'Address', 
        on_delete=models.PROTECT,
        related_name='pickup_bookings'
    )
    delivery_address = models.ForeignKey(
        'Address', 
        on_delete=models.PROTECT,
        related_name='delivery_bookings'
    )
    
    # Pricing (All in cents for precision)
    base_price_cents = models.PositiveBigIntegerField(default=0)
    surcharge_cents = models.PositiveBigIntegerField(default=0)
    coi_fee_cents = models.PositiveBigIntegerField(default=0)
    geographic_surcharge_cents = models.PositiveBigIntegerField(default=0)
    time_window_surcharge_cents = models.PositiveBigIntegerField(default=0)
    total_price_cents = models.PositiveBigIntegerField(default=0)
    
    # Business Logic
    special_instructions = models.TextField(blank=True)
    coi_required = models.BooleanField(default=False)
    is_outside_core_area = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Soft Delete
    deleted_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
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
    
    # CRITICAL BUSINESS LOGIC METHODS
    def save(self, *args, **kwargs):
        if not self.booking_number:
            self.booking_number = self.generate_booking_number()
        self.calculate_pricing()
        super().save(*args, **kwargs)
    
    def generate_booking_number(self):
        """Generates sequential booking numbers: TT-000001, TT-000002, etc."""
        last_booking = Booking.objects.order_by('created_at').last()
        if last_booking and last_booking.booking_number:
            last_num = int(last_booking.booking_number.split('-')[1])
            next_num = last_num + 1
        else:
            next_num = 1
        return f"TT-{next_num:06d}"
    
    def calculate_pricing(self):
        """Dynamic pricing calculation with all surcharges and organizing services"""
        self.base_price_cents = self.get_base_service_price()
        self.organizing_total_cents = self.calculate_organizing_services_cost()
        self.geographic_surcharge_cents = 17500 if self.is_outside_core_area else 0
        self.time_window_surcharge_cents = self.calculate_time_window_surcharge()
        self.coi_fee_cents = self.calculate_coi_fee()
        
        self.total_price_cents = (
            self.base_price_cents + 
            self.organizing_total_cents + 
            self.geographic_surcharge_cents + 
            self.time_window_surcharge_cents + 
            self.coi_fee_cents
        )
    
    def get_base_service_price(self):
        """Calculate base service price based on service type"""
        if self.service_type == 'mini_move' and self.mini_move_package:
            return self.mini_move_package.base_price_cents
        elif self.service_type == 'standard_delivery':
            return self.calculate_standard_delivery_price()
        elif self.service_type == 'specialty_item':
            return sum(item.price_cents for item in self.specialty_items.all())
        return 0
    
    def calculate_organizing_services_cost(self):
        """Calculate organizing services (packing/unpacking) cost with tax"""
        if not (self.include_packing or self.include_unpacking):
            return 0
        
        total_cost = 0
        if self.service_type == 'mini_move' and self.mini_move_package:
            from apps.services.models import OrganizingService
            
            if self.include_packing:
                packing_service = OrganizingService.objects.filter(
                    mini_move_tier=self.mini_move_package.package_type,
                    service_type='packing',
                    is_active=True
                ).first()
                if packing_service:
                    total_cost += packing_service.price_cents
            
            if self.include_unpacking:
                unpacking_service = OrganizingService.objects.filter(
                    mini_move_tier=self.mini_move_package.package_type,
                    service_type='unpacking', 
                    is_active=True
                ).first()
                if unpacking_service:
                    total_cost += unpacking_service.price_cents
        
        # Add 8.25% tax on organizing services
        tax_rate = 0.0825
        total_with_tax = total_cost * (1 + tax_rate)
        return int(total_with_tax)
```

#### Address Model
```python
class Address(models.Model):
    """Address for pickup/delivery - can be saved by customer or one-time"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Optional customer link (for saved addresses)
    customer = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        null=True, blank=True,
        related_name='booking_addresses'
    )
    
    # Address fields with tri-state area constraint
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
```

### Service Catalog Models (apps/services/models.py)

#### MiniMovePackage Model
```python
class MiniMovePackage(models.Model):
    """Mini Move service packages with pricing and constraints"""
    PACKAGE_TYPE_CHOICES = [
        ('petite', 'Petite'),
        ('standard', 'Standard'),
        ('full', 'Full Move'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    package_type = models.CharField(max_length=20, choices=PACKAGE_TYPE_CHOICES, unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField()
    
    # Pricing in cents for precision
    base_price_cents = models.PositiveBigIntegerField()
    coi_included = models.BooleanField(default=False)
    coi_fee_cents = models.PositiveBigIntegerField(default=0)
    
    # Package Constraints
    max_items = models.IntegerField(null=True, blank=True)
    max_weight_per_item_lbs = models.IntegerField(default=50)
    
    # Features
    priority_scheduling = models.BooleanField(default=False)
    protective_wrapping = models.BooleanField(default=False)
    is_most_popular = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    @property
    def base_price_dollars(self):
        return self.base_price_cents / 100
    
    @property
    def coi_fee_dollars(self):
        return self.coi_fee_cents / 100
```

#### OrganizingService Model
```python
class OrganizingService(models.Model):
    """Professional organizing services (packing/unpacking) tied to mini move tiers"""
    SERVICE_TYPE_CHOICES = [
        ('packing', 'Professional Packing'),
        ('unpacking', 'Professional Unpacking'),
    ]
    
    MINI_MOVE_TIER_CHOICES = [
        ('petite', 'Petite'),
        ('standard', 'Standard'),
        ('full', 'Full Move'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    service_type = models.CharField(max_length=20, choices=SERVICE_TYPE_CHOICES)
    mini_move_tier = models.CharField(max_length=20, choices=MINI_MOVE_TIER_CHOICES)
    
    name = models.CharField(max_length=100)
    description = models.TextField()
    
    # Pricing and Service Details
    price_cents = models.PositiveBigIntegerField()
    duration_hours = models.DecimalField(max_digits=4, decimal_places=2)
    organizer_count = models.IntegerField(default=1)
    supplies_allowance_cents = models.PositiveBigIntegerField(default=0)
    
    is_packing_service = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['service_type', 'mini_move_tier']
        indexes = [
            models.Index(fields=['mini_move_tier', 'service_type']),
            models.Index(fields=['is_active']),
        ]
    
    @property
    def price_dollars(self):
        return self.price_cents / 100
```

### Payment Models (apps/payments/models.py)

#### Payment Model
```python
class Payment(models.Model):
    """Payment records for bookings - Stripe integration with audit trail"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('succeeded', 'Succeeded'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Link to booking (PROTECT prevents accidental deletion)
    booking = models.ForeignKey(
        'bookings.Booking',
        on_delete=models.PROTECT,
        related_name='payments'
    )
    
    # Customer (if authenticated)
    customer = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='payments'
    )
    
    # Payment amount in cents
    amount_cents = models.PositiveBigIntegerField()
    
    # Stripe integration fields
    stripe_payment_intent_id = models.CharField(max_length=200, blank=True)
    stripe_charge_id = models.CharField(max_length=200, blank=True)
    
    # Status and failure tracking
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    failure_reason = models.TextField(blank=True)
    
    # Timestamps
    processed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'payments_payment'
    
    @property
    def amount_dollars(self):
        return self.amount_cents / 100
```

### Customer Models (apps/customers/models.py)

#### CustomerProfile Model
```python
class CustomerProfile(models.Model):
    """Customer profile with spending tracking and preferences"""
    PICKUP_TIME_CHOICES = [
        ('morning', '8 AM - 11 AM'),
        ('afternoon', '12 PM - 5 PM'),
        ('no_preference', 'No Preference'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE,
        related_name='customer_profile'
    )
    
    # Contact Information
    phone = models.CharField(
        max_length=20, 
        blank=True,
        validators=[RegexValidator(regex=r'^\+?1?\d{9,15}$')]
    )
    
    # Customer Statistics (updated by payment confirmation)
    total_bookings = models.IntegerField(default=0)
    total_spent_cents = models.PositiveBigIntegerField(default=0)
    last_booking_at = models.DateTimeField(null=True, blank=True)
    
    # Preferences
    preferred_pickup_time = models.CharField(
        max_length=20, 
        choices=PICKUP_TIME_CHOICES,
        default='no_preference'
    )
    email_notifications = models.BooleanField(default=True)
    sms_notifications = models.BooleanField(default=False)
    
    # VIP Status (auto-calculated)
    is_vip = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    @property
    def total_spent_dollars(self):
        return self.total_spent_cents / 100
    
    def update_spending(self, amount_cents):
        """Called when payment is confirmed"""
        self.total_spent_cents += amount_cents
        self.total_bookings += 1
        self.last_booking_at = timezone.now()
        
        # Auto-VIP status for customers over $2000 total
        if self.total_spent_cents >= 200000:  # $2000 in cents
            self.is_vip = True
        
        self.save()
```

### Staff Models (apps/accounts/models.py)

#### StaffProfile Model
```python
class StaffProfile(models.Model):
    """Staff user profiles with role-based permissions"""
    ROLE_CHOICES = [
        ('customer_service', 'Customer Service'),
        ('logistics_coordinator', 'Logistics Coordinator'),
        ('finance_manager', 'Finance Manager'),
        ('operations_manager', 'Operations Manager'),
        ('admin', 'Administrator'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='staff_profile'
    )
    
    # Role and Department
    role = models.CharField(max_length=30, choices=ROLE_CHOICES)
    department = models.CharField(max_length=50, blank=True)
    hire_date = models.DateField(null=True, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    
    # Security and Access Control
    login_attempts = models.IntegerField(default=0)
    account_locked_until = models.DateTimeField(null=True, blank=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # ROLE-BASED PERMISSION PROPERTIES
    @property
    def can_approve_refunds(self):
        return self.role in ['finance_manager', 'operations_manager', 'admin']
    
    @property
    def can_manage_staff(self):
        return self.role in ['operations_manager', 'admin']
    
    @property
    def can_view_financial_reports(self):
        return self.role in ['finance_manager', 'operations_manager', 'admin']
    
    @property
    def is_account_locked(self):
        if self.account_locked_until:
            return timezone.now() < self.account_locked_until
        return False
```

---

## SECTION 4: BUSINESS LOGIC IMPLEMENTATION GUIDE

### Dynamic Pricing Algorithm
**Location:** `apps/bookings/models.py - Booking.calculate_pricing()`

The pricing system implements a **multi-layered surcharge model** with the following components:

1. **Base Service Price**: From MiniMovePackage, StandardDeliveryConfig, or SpecialtyItem
2. **Geographic Surcharge**: $175 flat fee for addresses outside core service area
3. **Time Window Surcharge**: $75 for specific 1-hour pickup windows (8 AM - 5 PM)
4. **COI Fee**: Variable based on package type (included in Standard/Full, $50 for Petite)
5. **Organizing Services**: Professional packing/unpacking with 8.25% tax

```python
def calculate_pricing(self):
    """Core pricing algorithm called before every booking save"""
    self.base_price_cents = self.get_base_service_price()
    self.organizing_total_cents = self.calculate_organizing_services_cost()
    self.geographic_surcharge_cents = 17500 if self.is_outside_core_area else 0
    self.time_window_surcharge_cents = self.calculate_time_window_surcharge()
    self.coi_fee_cents = self.calculate_coi_fee()
    
    self.total_price_cents = sum([
        self.base_price_cents,
        self.organizing_total_cents,
        self.geographic_surcharge_cents,
        self.time_window_surcharge_cents,
        self.coi_fee_cents
    ])

def calculate_time_window_surcharge(self):
    """$75 surcharge for specific 1-hour pickup windows"""
    if self.pickup_time == 'morning_specific' and self.specific_pickup_hour:
        return 7500  # $75 in cents
    return 0

def calculate_organizing_services_cost(self):
    """Calculate organizing services with 8.25% tax"""
    if not (self.include_packing or self.include_unpacking):
        return 0
    
    total_cost = 0
    if self.service_type == 'mini_move' and self.mini_move_package:
        if self.include_packing:
            packing_service = OrganizingService.objects.filter(
                mini_move_tier=self.mini_move_package.package_type,
                service_type='packing',
                is_active=True
            ).first()
            if packing_service:
                total_cost += packing_service.price_cents
        
        if self.include_unpacking:
            unpacking_service = OrganizingService.objects.filter(
                mini_move_tier=self.mini_move_package.package_type,
                service_type='unpacking',
                is_active=True
            ).first()
            if unpacking_service:
                total_cost += unpacking_service.price_cents
    
    # Apply 8.25% tax on organizing services
    tax_rate = 0.0825
    total_with_tax = total_cost * (1 + tax_rate)
    return int(total_with_tax)
```

### Payment Confirmation Workflow
**Location:** `apps/payments/services.py - StripePaymentService`

The payment confirmation implements a **multi-step atomic transaction** ensuring data consistency:

```python
@classmethod
def confirm_payment(cls, payment_intent_id):
    """Atomic payment confirmation with customer statistics update"""
    with transaction.atomic():
        # 1. Retrieve and validate payment
        payment = Payment.objects.select_for_update().get(
            stripe_payment_intent_id=payment_intent_id
        )
        
        # 2. Update payment status
        payment.status = 'succeeded'
        payment.processed_at = timezone.now()
        payment.save()
        
        # 3. Update booking status
        booking = payment.booking
        booking.status = 'paid'
        booking.save()
        
        # 4. Update customer spending statistics (if authenticated customer)
        if payment.customer and hasattr(payment.customer, 'customer_profile'):
            payment.customer.customer_profile.update_spending(payment.amount_cents)
        
        # 5. Log payment audit trail
        PaymentAudit.log(
            action='payment_succeeded',
            description=f'Payment confirmed for booking {booking.booking_number}',
            payment=payment
        )
        
        return payment
```

### Guest vs Authenticated Customer Handling
**Location:** `apps/bookings/models.py - Booking model constraint`

The system enforces **exactly one customer type** per booking using database constraints:

```python
class Meta:
    constraints = [
        models.CheckConstraint(
            check=(
                models.Q(customer__isnull=False, guest_checkout__isnull=True) |
                models.Q(customer__isnull=True, guest_checkout__isnull=False)
            ),
            name='booking_exactly_one_customer_type'
        )
    ]

def get_customer_name(self):
    """Polymorphic customer name retrieval"""
    if self.customer:
        return self.customer.get_full_name()
    elif self.guest_checkout:
        return f"{self.guest_checkout.first_name} {self.guest_checkout.last_name}"
    return "Unknown"

def get_customer_email(self):
    """Polymorphic customer email retrieval"""
    if self.customer:
        return self.customer.email
    elif self.guest_checkout:
        return self.guest_checkout.email
    return None
```

### Staff Role-Based Permissions
**Location:** `apps/accounts/models.py - StaffProfile properties`

Implements **capability-based access control** through computed properties:

```python
@property
def can_approve_refunds(self):
    """Financial decision-making roles only"""
    return self.role in ['finance_manager', 'operations_manager', 'admin']

@property
def can_manage_staff(self):
    """Management roles only"""
    return self.role in ['operations_manager', 'admin']

@property
def can_view_financial_reports(self):
    """Financial and management roles"""
    return self.role in ['finance_manager', 'operations_manager', 'admin']
```

### Account Collision Prevention
**Location:** `apps/customers/serializers.py` and `apps/accounts/serializers.py`

Prevents **hybrid staff/customer accounts** through validation:

```python
def validate(self, attrs):
    """Prevent customer registration with staff email"""
    if User.objects.filter(email__iexact=attrs['email']).exists():
        existing_user = User.objects.get(email__iexact=attrs['email'])
        if hasattr(existing_user, 'staff_profile'):
            raise serializers.ValidationError(
                "This email is already registered as a staff account. "
                "Please use a different email."
            )
        else:
            raise serializers.ValidationError("User with this email already exists")
    return attrs
```

---

## SECTION 5: INTEGRATION ARCHITECTURE REFERENCE

### Django Settings Configuration
**Location:** `config/settings.py`

```python
# Database Configuration
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': env('DB_NAME', default='totetaxi'),
        'USER': env('DB_USER', default='postgres'),
        'PASSWORD': env('DB_PASSWORD', default='postgres'),
        'HOST': env('DB_HOST', default='db'),
        'PORT': env('DB_PORT', default='5432'),
    }
}

# Alternative: use DATABASE_URL if provided (Fly.io deployment)
database_url = env('DATABASE_URL', default=None)
if database_url:
    import dj_database_url
    DATABASES['default'] = dj_database_url.config(
        default=database_url,
        conn_max_age=600,
        conn_health_checks=True,
    )

# Redis Configuration for Caching and Rate Limiting
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': env('REDIS_URL', default='redis://redis:6379/1'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'IGNORE_EXCEPTIONS': True,  # Don't break if Redis unavailable
        }
    }
}

# Rate Limiting Configuration
RATELIMIT_USE_CACHE = 'default'
RATELIMIT_ENABLE = True

# Django REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

# CSRF and Session Security
CSRF_COOKIE_SECURE = env.bool('CSRF_COOKIE_SECURE', default=not DEBUG)
CSRF_COOKIE_HTTPONLY = False  # Allow JavaScript access for API calls
CSRF_COOKIE_SAMESITE = env('CSRF_COOKIE_SAMESITE', default='Lax')
CSRF_TRUSTED_ORIGINS = env.list('CSRF_TRUSTED_ORIGINS', default=[
    'http://localhost:3000',
    'http://127.0.0.1:3000',
])

# Session Configuration for Persistent Login
SESSION_COOKIE_SECURE = env.bool('SESSION_COOKIE_SECURE', default=not DEBUG)
SESSION_COOKIE_SAMESITE = env('SESSION_COOKIE_SAMESITE', default='Lax')
SESSION_COOKIE_AGE = 60 * 60 * 24 * 30  # 30 days
SESSION_EXPIRE_AT_BROWSER_CLOSE = False  # Persistent sessions
SESSION_SAVE_EVERY_REQUEST = True       # Refresh session on every request
SESSION_COOKIE_NAME = 'totetaxi_sessionid'
SESSION_ENGINE = 'django.contrib.sessions.backends.db'

# Celery Configuration for Background Tasks
CELERY_BROKER_URL = env('REDIS_URL', default='redis://redis:6379/0')
CELERY_RESULT_BACKEND = env('REDIS_URL', default='redis://redis:6379/0')
CELERY_ACCEPT_CONTENT = ['application/json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE

# Stripe Payment Configuration
STRIPE_SECRET_KEY = env('STRIPE_SECRET_KEY', default='')
STRIPE_PUBLISHABLE_KEY = env('STRIPE_PUBLISHABLE_KEY', default='')
STRIPE_WEBHOOK_SECRET = env('STRIPE_WEBHOOK_SECRET', default='')

# Static Files with WhiteNoise
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Media Files
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
```

### Celery Configuration
**Location:** `config/celery.py`

```python
import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('totetaxi')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
```

### Stripe Payment Service
**Location:** `apps/payments/services.py`

```python
class StripePaymentService:
    """Centralized Stripe integration service"""
    
    @classmethod
    def create_payment_intent(cls, booking, customer_email=None):
        """Create Stripe PaymentIntent for booking"""
        stripe.api_key = settings.STRIPE_SECRET_KEY
        
        try:
            intent = stripe.PaymentIntent.create(
                amount=booking.total_price_cents,
                currency='usd',
                metadata={
                    'booking_id': str(booking.id),
                    'booking_number': booking.booking_number,
                    'customer_email': customer_email or booking.get_customer_email(),
                }
            )
            
            # Create Payment record
            payment = Payment.objects.create(
                booking=booking,
                customer=booking.customer,
                amount_cents=booking.total_price_cents,
                stripe_payment_intent_id=intent.id,
                status='pending'
            )
            
            return {
                'client_secret': intent.client_secret,
                'payment_intent_id': intent.id,
                'amount': booking.total_price_dollars
            }
            
        except stripe.error.StripeError as e:
            raise Exception(f"Stripe error: {str(e)}")
    
    @classmethod
    def confirm_payment(cls, payment_intent_id):
        """Confirm payment and update booking status"""
        with transaction.atomic():
            payment = Payment.objects.select_for_update().get(
                stripe_payment_intent_id=payment_intent_id
            )
            
            payment.status = 'succeeded'
            payment.processed_at = timezone.now()
            payment.save()
            
            booking = payment.booking
            booking.status = 'paid'
            booking.save()
            
            # Update customer statistics
            if payment.customer and hasattr(payment.customer, 'customer_profile'):
                payment.customer.customer_profile.update_spending(payment.amount_cents)
            
            return payment
```

### Onfleet Logistics Integration
**Location:** `apps/logistics/services.py`

```python
class ToteTaxiOnfleetIntegration:
    """Onfleet API integration for delivery management"""
    
    def __init__(self):
        self.api_key = settings.ONFLEET_API_KEY
        self.base_url = 'https://onfleet.com/api/v2'
    
    def create_delivery_task(self, booking):
        """Create delivery task in Onfleet"""
        task_data = {
            'destination': {
                'address': {
                    'unparsed': booking.delivery_address.full_address,
                },
                'notes': booking.special_instructions or ''
            },
            'recipients': [{
                'name': booking.get_customer_name(),
                'phone': booking.get_customer_phone(),
            }],
            'metadata': [
                {'name': 'booking_number', 'value': booking.booking_number},
                {'name': 'service_type', 'value': booking.service_type},
            ]
        }
        
        response = requests.post(
            f'{self.base_url}/tasks',
            json=task_data,
            auth=(self.api_key, '')
        )
        
        if response.status_code == 200:
            task_data = response.json()
            OnfleetTask.objects.create(
                booking=booking,
                onfleet_task_id=task_data['id'],
                status='assigned'
            )
            return task_data
        else:
            raise Exception(f"Onfleet API error: {response.text}")
```

---

## SECTION 6: DEVELOPMENT EXTENSION PATTERNS

### Adding New Service Types
**Pattern:** Extend the service catalog system

1. **Add Service Model** in `apps/services/models.py`:
```python
class NewServiceType(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    base_price_cents = models.PositiveBigIntegerField()
    is_active = models.BooleanField(default=True)
    
    # Service-specific fields
    special_requirements = models.TextField(blank=True)
```

2. **Update Booking Model** service type choices:
```python
SERVICE_TYPE_CHOICES = [
    ('mini_move', 'Mini Move'),
    ('standard_delivery', 'Standard Delivery'),
    ('specialty_item', 'Specialty Item'),
    ('new_service', 'New Service'),  # Add this
]
```

3. **Extend Pricing Logic** in `Booking.get_base_service_price()`:
```python
def get_base_service_price(self):
    if self.service_type == 'new_service':
        return self.calculate_new_service_price()
    # ... existing logic
```

4. **Update API Serializers** in `apps/services/serializers.py`
5. **Add API Endpoints** in views and URL configuration

### Adding New Staff Roles
**Pattern:** Extend role-based permission system

1. **Update StaffProfile Model**:
```python
ROLE_CHOICES = [
    # ... existing roles
    ('new_role', 'New Role Name'),
]
```

2. **Add Permission Properties**:
```python
@property
def can_perform_new_action(self):
    return self.role in ['new_role', 'admin']
```

3. **Update API Views** with new permission checks:
```python
def get(self, request):
    if not request.user.staff_profile.can_perform_new_action:
        return Response({'error': 'Permission denied'}, status=403)
```

### Adding New Surcharge Rules
**Pattern:** Database-driven surcharge configuration

1. **Create SurchargeRule Model** (already exists in services app):
```python
class SurchargeRule(models.Model):
    rule_type = models.CharField(max_length=30, choices=SURCHARGE_TYPE_CHOICES)
    applies_to_service_type = models.CharField(max_length=20, choices=SERVICE_TYPE_CHOICES)
    surcharge_cents = models.PositiveBigIntegerField()
    condition_data = models.JSONField(default=dict)  # Flexible conditions
    is_active = models.BooleanField(default=True)
```

2. **Update Pricing Calculation** to query surcharge rules:
```python
def calculate_dynamic_surcharges(self):
    applicable_rules = SurchargeRule.objects.filter(
        applies_to_service_type=self.service_type,
        is_active=True
    )
    return sum(rule.surcharge_cents for rule in applicable_rules if rule.applies_to_booking(self))
```

### Adding New Integration Services
**Pattern:** Service layer with consistent interface

1. **Create Service Class** in appropriate app:
```python
class NewIntegrationService:
    def __init__(self):
        self.api_key = settings.NEW_SERVICE_API_KEY
        self.base_url = settings.NEW_SERVICE_BASE_URL
    
    def sync_data(self, booking):
        """Sync booking data with external service"""
        pass
    
    def handle_webhook(self, payload):
        """Handle incoming webhook from external service"""
        pass
```

2. **Add Settings Configuration**:
```python
# New service configuration
NEW_SERVICE_API_KEY = env('NEW_SERVICE_API_KEY', default='')
NEW_SERVICE_BASE_URL = env('NEW_SERVICE_BASE_URL', default='')
```

3. **Create Webhook Endpoint**:
```python
class NewServiceWebhookView(APIView):
    @method_decorator(csrf_exempt)
    def post(self, request):
        service = NewIntegrationService()
        service.handle_webhook(request.data)
        return Response({'status': 'ok'})
```

---

## SECTION 7: VALIDATION & CONSTRAINT REFERENCE

### Model-Level Constraints

#### Booking Constraints
```python
class Meta:
    constraints = [
        # Ensure exactly one customer type per booking
        models.CheckConstraint(
            check=(
                models.Q(customer__isnull=False, guest_checkout__isnull=True) |
                models.Q(customer__isnull=True, guest_checkout__isnull=False)
            ),
            name='booking_exactly_one_customer_type'
        )
    ]
```

#### Field Validators
```python
# Phone number validation (customers and guest checkout)
phone = models.CharField(
    max_length=20,
    validators=[RegexValidator(regex=r'^\+?1?\d{9,15}$')]
)

# State validation (tri-state area only)
state = models.CharField(max_length=2, choices=[
    ('NY', 'New York'),
    ('CT', 'Connecticut'), 
    ('NJ', 'New Jersey'),
])

# Pickup hour validation
specific_pickup_hour = models.IntegerField(
    null=True, blank=True,
    validators=[MinValueValidator(8), MaxValueValidator(17)]
)
```

### Serializer Validation Rules

#### Account Collision Prevention
```python
def validate(self, attrs):
    """Prevent hybrid staff/customer accounts"""
    if User.objects.filter(email__iexact=attrs['email']).exists():
        existing_user = User.objects.get(email__iexact=attrs['email'])
        if hasattr(existing_user, 'staff_profile'):
            raise serializers.ValidationError(
                "This email is already registered as a staff account"
            )
    return attrs
```

#### Password Validation
```python
def validate(self, attrs):
    """Ensure password confirmation matches"""
    if attrs['password'] != attrs['password_confirm']:
        raise serializers.ValidationError("Passwords don't match")
    return attrs
```

#### Booking Service Validation
```python
def validate(self, attrs):
    """Validate service type and associated data consistency"""
    service_type = attrs.get('service_type')
    
    if service_type == 'mini_move':
        if not attrs.get('mini_move_package_id'):
            raise serializers.ValidationError(
                "Mini move package is required for mini move service"
            )
    
    if service_type == 'specialty_item':
        if not attrs.get('specialty_item_ids'):
            raise serializers.ValidationError(
                "At least one specialty item is required"
            )
    
    return attrs
```

### Business Rule Validation

#### Geographic Service Area Validation
```python
def validate_service_area(self, address):
    """Validate address is within service area (tri-state)"""
    valid_states = ['NY', 'CT', 'NJ']
    if address.get('state') not in valid_states:
        raise serializers.ValidationError(
            "Service is only available in NY, CT, and NJ"
        )
```

#### Organizing Service Compatibility
```python
def validate_organizing_services(self, attrs):
    """Organizing services only available with mini moves"""
    if (attrs.get('include_packing') or attrs.get('include_unpacking')):
        if attrs.get('service_type') != 'mini_move':
            raise serializers.ValidationError(
                "Organizing services are only available with mini moves"
            )
```

### Rate Limiting and Security

#### API Rate Limiting
```python
@method_decorator(ratelimit(key='ip', rate='5/m', method='POST', block=True), name='post')
@method_decorator(ratelimit(key='header:user-agent', rate='10/m', method='POST', block=True), name='post')
class StaffLoginView(APIView):
    """Rate limited staff login endpoint"""
```

#### Staff Account Lockout
```python
def check_account_lockout(self, staff_profile):
    """Check if staff account is locked due to failed login attempts"""
    if staff_profile.login_attempts >= 5:
        staff_profile.account_locked_until = timezone.now() + timedelta(minutes=30)
        staff_profile.save()
        raise serializers.ValidationError("Account temporarily locked")
```

### Data Integrity Rules

#### Payment Amount Consistency
```python
def validate_payment_amount(self, booking, amount_cents):
    """Ensure payment amount matches booking total"""
    if amount_cents != booking.total_price_cents:
        raise ValidationError(
            f"Payment amount {amount_cents} does not match booking total {booking.total_price_cents}"
        )
```

#### Refund Amount Validation
```python
def validate_refund_amount(self, payment, refund_amount_cents):
    """Ensure refund doesn't exceed original payment"""
    existing_refunds = payment.refunds.filter(status='completed').aggregate(
        total=models.Sum('amount_cents')
    )['total'] or 0
    
    if (existing_refunds + refund_amount_cents) > payment.amount_cents:
        raise ValidationError("Refund amount exceeds available balance")
```

---

## SECTION 8: CONFIGURATION & DEPLOYMENT REFERENCE

### Environment Variables
**Critical Configuration:**

```bash
# Database Configuration
DATABASE_URL=postgres://user:password@host:port/database
DB_NAME=totetaxi
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=db
DB_PORT=5432

# Redis Configuration
REDIS_URL=redis://redis:6379/0

# Django Security
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,your-domain.com
CSRF_TRUSTED_ORIGINS=https://your-domain.com
CORS_ALLOWED_ORIGINS=https://your-frontend.com

# Stripe Integration
STRIPE_SECRET_KEY=sk_test_or_live_key
STRIPE_PUBLISHABLE_KEY=pk_test_or_live_key
STRIPE_WEBHOOK_SECRET=whsec_webhook_secret

# Onfleet Integration
ONFLEET_API_KEY=your-onfleet-api-key

# AWS Configuration (if using S3)
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_STORAGE_BUCKET_NAME=your-s3-bucket
```

### Docker Configuration
**Development:** `docker-compose.yml`
```yaml
version: '3.8'
services:
  backend:
    build: .
    command: python manage.py runserver 0.0.0.0:8000
    volumes:
      - .:/app
    ports:
      - "8000:8000"
    depends_on:
      - db
      - redis
    environment:
      - DEBUG=True
      - DATABASE_URL=postgres://postgres:postgres@db:5432/totetaxi

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: totetaxi
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
```

**Production:** `Dockerfile.prod`
```dockerfile
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Collect static files
RUN python manage.py collectstatic --noinput

# Set entrypoint
COPY scripts/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000
ENTRYPOINT ["/entrypoint.sh"]
CMD ["gunicorn", "config.wsgi:application", "--config", "gunicorn.conf.py"]
```

### Fly.io Deployment Configuration
**File:** `fly.toml`
```toml
app = 'totetaxi-backend'
primary_region = 'ewr'

[build]
  dockerfile = 'Dockerfile.prod'

[env]
  DEBUG = "False"
  DJANGO_SETTINGS_MODULE = 'config.settings'
  PORT = '8000'

[http_service]
  internal_port = 8000
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1

[machines]
  cpu_kind = 'shared'
  cpus = 1
  memory_mb = 1024
```

### Database Migration Strategy
```bash
# Development migrations
python manage.py makemigrations
python manage.py migrate

# Production deployment
python manage.py migrate --no-input
python manage.py collectstatic --no-input --clear
python manage.py createcachetable  # For session storage
```

### Monitoring and Logging
```python
# Production logging configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
```

### Backup and Recovery
**Database Backup Script:**
```bash
#!/bin/bash
# backup_db.sh
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

**Service Recreation Script:**
```python
# recreate_services.py - Run after fresh database setup
python manage.py shell < recreate_services.py
```

This living documentation provides complete executive function over the ToteTaxi Django backend, enabling independent development, modification, and extension of all system components. The documentation covers every API endpoint, model specification, business logic implementation, integration pattern, and deployment configuration necessary for comprehensive backend development.