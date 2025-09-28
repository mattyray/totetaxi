I'll help you generate comprehensive living documentation for your Django project. Let me first search the project knowledge to find the backend code and project details that need to be documented.Based on my analysis of the project knowledge, I'll generate comprehensive living documentation for the ToteTaxi Django backend project. This will serve as a detailed synopsis and magnifying glass for understanding the entire codebase.

# TOTETAXI BACKEND - LIVING DOCUMENTATION
## AI Memory Persistence System - Comprehensive Django Project Guide

---

### TABLE OF CONTENTS
1. [System Mental Model](#system-mental-model)
2. [Complete API Endpoint Reference](#complete-api-endpoint-reference)
3. [Complete Model Documentation](#complete-model-documentation)
4. [Business Logic Implementation Guide](#business-logic-implementation-guide)
5. [Integration Architecture Reference](#integration-architecture-reference)
6. [Development Extension Patterns](#development-extension-patterns)
7. [Validation & Constraint Reference](#validation--constraint-reference)
8. [Configuration & Deployment Reference](#configuration--deployment-reference)

---

## SECTION 1: System Mental Model

### Django Project Architecture Philosophy
ToteTaxi is a sophisticated multi-tenant Django application designed as a comprehensive moving and logistics service platform. The architecture follows Domain-Driven Design principles with clear separation between customer-facing booking functionality and staff operational management. The system operates as a dual-interface platform serving both anonymous guest customers and authenticated users (customers and staff) with distinct permission boundaries.

### Business Domain Separation Strategy
The platform is organized into nine specialized Django applications, each representing a distinct business domain:

**Core Business Apps:**
- `apps.bookings` - Central booking engine handling all service reservations
- `apps.services` - Service catalog and pricing engine for all moving services
- `apps.customers` - Customer profile management and authentication
- `apps.accounts` - Staff management and administrative access control
- `apps.payments` - Payment processing and financial transaction management

**Supporting Business Apps:**
- `apps.logistics` - Operational workflow and scheduling coordination
- `apps.notifications` - Multi-channel communication system
- `apps.documents` - Document management and storage
- `apps.crm` - Customer relationship management and analytics

### Integration Approach and External Service Patterns
The system follows a service-oriented architecture with clear abstraction layers for external integrations:
- **Payment Processing**: Stripe integration through dedicated service classes
- **Background Processing**: Celery with Redis broker for asynchronous tasks
- **File Storage**: Configurable storage backends (local development, S3 production)
- **Email Services**: SES integration for transactional communications
- **Database**: PostgreSQL with optimized indexing for booking and customer queries
- **Caching**: Redis-based caching for rate limiting and session management

---

## SECTION 2: Complete API Endpoint Reference

### Authentication & Session Management

#### Staff Authentication Endpoints (`/api/staff/`)
```
POST /api/staff/auth/login/
- Authentication: AllowAny
- Rate Limit: 5/min per IP, 10/min per User-Agent
- Request: {email, password}
- Response: {message, user, staff_profile, csrf_token}
- Business Logic: Validates staff credentials, prevents customer account crossover
- Validation: Email format validation, staff profile existence check
- Error Responses: 400 (invalid credentials), 429 (rate limited)

POST /api/staff/auth/logout/
- Authentication: IsAuthenticated
- Business Logic: Destroys session, logs staff action
- Response: {message: "Logged out successfully"}
```

#### Customer Authentication Endpoints (`/api/customers/`)
```
POST /api/customers/auth/register/
- Authentication: AllowAny
- Rate Limit: 5/min per IP, 10/min per User-Agent
- Request: {email, password, first_name, last_name, phone}
- Response: {message, user, customer_profile, csrf_token}
- Business Logic: Prevents duplicate emails, validates against staff accounts
- Validation: Email uniqueness, phone regex validation, password strength
- Error Responses: 400 (validation errors), 409 (email exists)

POST /api/customers/auth/login/
- Authentication: AllowAny
- Rate Limit: 5/min per IP, 10/min per User-Agent
- Request: {email, password}
- Response: {message, user, customer_profile, csrf_token}
- Business Logic: Customer-only authentication, staff account prevention
- Validation: Customer profile existence check
- Error Responses: 400 (invalid credentials), 403 (staff account detected)

GET /api/customers/csrf-token/
- Authentication: AllowAny
- Response: {csrf_token}
- Business Logic: Provides CSRF token for client-side operations
```

### Booking Management System

#### Public Booking Endpoints (`/api/bookings/`)
```
GET /api/bookings/services/
- Authentication: AllowAny
- Response: {mini_move_packages[], standard_delivery{}, specialty_items[]}
- Business Logic: Returns complete service catalog with pricing
- Query Parameters: None
- Caching: Service data cached for performance

POST /api/bookings/pricing-preview/
- Authentication: AllowAny
- Request: {service_type, package_id?, item_count?, pickup_date?, is_same_day?}
- Response: {base_price_dollars, surcharges[], total_price_dollars, breakdown{}}
- Business Logic: Calculates pricing with all surcharges and fees
- Validation: Date validation, service type constraints

GET /api/bookings/services/mini-moves-with-organizing/
- Authentication: AllowAny
- Response: {packages[], organizing_services_by_tier{}}
- Business Logic: Returns mini-move packages with available organizing services
- Data Structure: Organizes organizing services by tier (petite, standard, full)

POST /api/bookings/guest-booking/
- Authentication: AllowAny
- Rate Limit: 3/min per IP
- Request: {service_details, customer_info, addresses, special_instructions}
- Response: {booking, payment_intent}
- Business Logic: Creates booking + guest checkout + payment intent
- Validation: Address validation, service availability, pricing calculation
- Error Responses: 400 (validation), 500 (payment creation failure)

GET /api/bookings/booking-status/{booking_number}/
- Authentication: AllowAny
- Response: {booking_number, status, customer_name, pickup_details, pricing}
- Business Logic: Public booking lookup by booking number
- Security: Limited information exposure for privacy
```

#### Authenticated Customer Booking Endpoints (`/api/customers/bookings/`)
```
GET /api/customers/bookings/
- Authentication: IsAuthenticated (Customer)
- Response: {results[], count, next, previous}
- Query Parameters: status, pickup_date_from, pickup_date_to
- Business Logic: Returns customer's booking history with pagination
- Ordering: Most recent bookings first

POST /api/customers/bookings/create/
- Authentication: IsAuthenticated (Customer)
- Request: {service_details, addresses, special_instructions}
- Response: {booking, payment_intent}
- Business Logic: Creates authenticated customer booking
- Validation: Customer profile validation, address saving logic

GET /api/customers/bookings/{booking_id}/
- Authentication: IsAuthenticated (Customer)
- Response: {booking_details, payment_status, organizing_services[]}
- Business Logic: Detailed booking view with payment information
- Security: Customer can only view their own bookings

POST /api/customers/bookings/{booking_id}/rebook/
- Authentication: IsAuthenticated (Customer)
- Request: {pickup_date, pickup_time?, special_instructions?}
- Response: {new_booking, payment_intent}
- Business Logic: Quick rebooking with previous booking details
- Validation: Original booking must be completed or paid
```

#### Staff Booking Management Endpoints (`/api/staff/bookings/`)
```
GET /api/staff/bookings/
- Authentication: IsAuthenticated (Staff)
- Response: {results[], count, filters{}}
- Query Parameters: status, service_type, pickup_date, customer_search
- Business Logic: Complete booking management with filtering
- Ordering: Configurable by pickup_date, created_at, status

GET /api/staff/bookings/{booking_id}/
- Authentication: IsAuthenticated (Staff)
- Response: {complete_booking_details, customer_info, payment_history[]}
- Business Logic: Full booking details for staff operations
- Action Logging: All booking views logged for audit trail

PUT /api/staff/bookings/{booking_id}/
- Authentication: IsAuthenticated (Staff)
- Request: {status?, special_instructions?, internal_notes?}
- Response: {updated_booking}
- Business Logic: Booking status updates with staff action logging
- Validation: Status transition validation, reason requirements
```

### Customer Profile Management

#### Customer Profile Endpoints (`/api/customers/`)
```
GET /api/customers/profile/
- Authentication: IsAuthenticated (Customer)
- Response: {user{}, customer_profile{}, booking_stats{}}
- Business Logic: Complete customer profile with statistics
- Data Includes: Total bookings, spent amount, VIP status, preferences

PUT /api/customers/profile/
- Authentication: IsAuthenticated (Customer)
- Request: {phone?, preferred_pickup_time?, notification_preferences?}
- Response: {updated_profile}
- Business Logic: Profile updates with validation
- Validation: Phone format, preference choices

GET /api/customers/addresses/
- Authentication: IsAuthenticated (Customer)
- Response: {saved_addresses[], usage_stats{}}
- Business Logic: Customer's saved addresses with usage tracking
- Ordering: Most recently used addresses first

POST /api/customers/addresses/
- Authentication: IsAuthenticated (Customer)
- Request: {nickname, address_line_1, city, state, zip_code, delivery_instructions?}
- Response: {created_address}
- Business Logic: Creates new saved address for customer
- Validation: Address format validation, nickname uniqueness per customer

GET /api/customers/dashboard/
- Authentication: IsAuthenticated (Customer)
- Response: {recent_bookings[], upcoming_bookings[], preferences{}, quick_actions[]}
- Business Logic: Customer dashboard with personalized data
- Performance: Optimized queries for dashboard rendering
```

### Staff Operations & Customer Management

#### Staff Dashboard & Analytics (`/api/staff/`)
```
GET /api/staff/dashboard/
- Authentication: IsAuthenticated (Staff)
- Response: {booking_stats{}, revenue_metrics{}, recent_activity[], alerts[]}
- Business Logic: Real-time operational dashboard
- Metrics: Daily/weekly/monthly booking counts, revenue, status distributions
- Caching: Dashboard data cached for 5 minutes

GET /api/staff/customers/
- Authentication: IsAuthenticated (Staff)
- Response: {customers[], search_results[], pagination{}}
- Query Parameters: search, is_vip, total_bookings_min, registration_date
- Business Logic: Customer search and management interface
- Search Fields: Name, email, phone, booking numbers

GET /api/staff/customers/{customer_id}/
- Authentication: IsAuthenticated (Staff)
- Response: {customer_details{}, booking_history[], payment_history[], notes}
- Business Logic: Complete customer profile for staff operations
- Action Logging: Customer profile views logged

PUT /api/staff/customers/{customer_id}/notes/
- Authentication: IsAuthenticated (Staff)
- Request: {notes}
- Response: {updated_customer}
- Business Logic: Internal staff notes management
- Action Logging: Note updates logged with staff user and timestamp
```

### Payment Processing

#### Payment Endpoints (`/api/payments/`)
```
POST /api/payments/create-intent/
- Authentication: AllowAny
- Request: {booking_id, amount_cents}
- Response: {client_secret, payment_intent_id}
- Business Logic: Creates Stripe payment intent
- Integration: Stripe API integration with error handling
- Security: Amount validation against booking total

POST /api/payments/confirm/
- Authentication: AllowAny
- Request: {payment_intent_id}
- Response: {payment_status, booking_status}
- Business Logic: Confirms payment and updates booking status
- Side Effects: Updates customer statistics, sends notifications
- Error Handling: Comprehensive error responses for payment failures
```

---

## SECTION 3: Complete Model Documentation

### Core User & Profile Models

#### Django User Extensions
```python
# Standard Django User model extended with OneToOne relationships

CustomerProfile (OneToOne User relationship)
- id: UUIDField (Primary Key)
- user: OneToOneField(User, related_name='customer_profile')
- phone: CharField(max_length=20, validators=[phone_regex])
- stripe_customer_id: CharField(max_length=100, blank=True)
- total_bookings: PositiveIntegerField(default=0)
- total_spent_cents: PositiveBigIntegerField(default=0)
- last_booking_at: DateTimeField(null=True, blank=True)
- preferred_pickup_time: CharField(choices=PICKUP_TIME_CHOICES, default='morning')
- email_notifications: BooleanField(default=True)
- sms_notifications: BooleanField(default=False)
- is_vip: BooleanField(default=False)
- notes: TextField(blank=True, help_text='Internal notes for staff')

# Business Logic Methods:
def update_booking_stats(booking): Updates total_bookings, total_spent_cents, last_booking_at
def get_full_name(): Returns user's first + last name
def total_spent_dollars: Property returning dollars from cents
```

```python
StaffProfile (OneToOne User relationship)
- id: UUIDField (Primary Key)
- user: OneToOneField(User, related_name='staff_profile')
- role: CharField(choices=STAFF_ROLES, default='operator')
- employee_id: CharField(max_length=20, unique=True)
- phone: CharField(max_length=20)
- is_active: BooleanField(default=True)
- hire_date: DateField()
- permissions: JSONField(default=dict) # Role-based permissions

# Validation Logic:
@staticmethod
def ensure_single_profile_type(user): Prevents hybrid customer/staff accounts
```

### Booking System Models

#### Core Booking Model
```python
Booking (Central booking entity)
- id: UUIDField (Primary Key)
- booking_number: CharField(max_length=20, unique=True, auto-generated)
- customer: ForeignKey(User, null=True, related_name='bookings')
- guest_checkout: OneToOneField(GuestCheckout, null=True)

# Service Configuration
- service_type: CharField(choices=['mini_move', 'standard_delivery', 'specialty_item'])
- mini_move_package: ForeignKey(MiniMovePackage, null=True)
- standard_delivery_item_count: PositiveIntegerField(null=True)
- specialty_items: ManyToManyField(SpecialtyItem)

# Scheduling & Location
- pickup_date: DateField()
- pickup_time: CharField(choices=PICKUP_TIME_CHOICES)
- specific_pickup_hour: PositiveIntegerField(null=True) # For 1-hour windows
- pickup_address: ForeignKey(Address, related_name='pickup_bookings')
- delivery_address: ForeignKey(Address, related_name='delivery_bookings')

# Service Add-ons
- include_packing: BooleanField(default=False)
- include_unpacking: BooleanField(default=False)
- is_same_day_delivery: BooleanField(default=False)
- coi_required: BooleanField(default=False)
- is_outside_core_area: BooleanField(default=False)

# Pricing Fields (Calculated)
- base_price_cents: PositiveBigIntegerField(default=0)
- surcharge_cents: PositiveBigIntegerField(default=0)
- coi_fee_cents: PositiveBigIntegerField(default=0)
- organizing_total_cents: PositiveBigIntegerField(default=0)
- organizing_tax_cents: PositiveBigIntegerField(default=0)
- geographic_surcharge_cents: PositiveBigIntegerField(default=0)
- time_window_surcharge_cents: PositiveBigIntegerField(default=0)
- total_price_cents: PositiveBigIntegerField(default=0)

# Status & Metadata
- status: CharField(choices=STATUS_CHOICES, default='pending')
- special_instructions: TextField(blank=True)

# Complex Business Logic Methods:
def calculate_pricing(): Complete pricing calculation with all surcharges
def get_pricing_breakdown(): Detailed pricing breakdown for display
def calculate_organizing_costs(): Organizing services total calculation
def calculate_coi_fee(): COI fee calculation based on package type
def calculate_geographic_surcharge(): Distance-based surcharge calculation
def calculate_time_window_surcharge(): 1-hour window surcharge
def calculate_organizing_tax(): 8.75% tax on organizing services
def get_customer_name(): Returns customer or guest name
def get_customer_email(): Returns customer or guest email
def generate_booking_number(): Auto-generates unique booking numbers

# Database Constraints & Indexes:
- Unique constraint on booking_number
- Index on (customer, status, pickup_date)
- Index on (pickup_date, service_type)
- Index on (status, created_at)
```

#### Address & Guest Checkout Models
```python
Address (Flexible address handling)
- id: UUIDField (Primary Key)
- customer: ForeignKey(User, null=True, related_name='booking_addresses')
- address_line_1: CharField(max_length=200)
- address_line_2: CharField(max_length=200, blank=True)
- city: CharField(max_length=100)
- state: CharField(choices=STATE_CHOICES) # NY, CT, NJ
- zip_code: CharField(max_length=10)

GuestCheckout (Anonymous customer info)
- id: UUIDField (Primary Key)
- first_name: CharField(max_length=100)
- last_name: CharField(max_length=100)
- email: EmailField()
- phone: CharField(max_length=20, validators=[phone_regex])

SavedAddress (Customer saved addresses)
- id: UUIDField (Primary Key)
- user: ForeignKey(User, related_name='saved_addresses')
- nickname: CharField(max_length=50)
- address_line_1: CharField(max_length=200)
- address_line_2: CharField(max_length=200, blank=True)
- city: CharField(max_length=100)
- state: CharField(choices=STATE_CHOICES)
- zip_code: CharField(max_length=10)
- delivery_instructions: TextField(blank=True)
- times_used: PositiveIntegerField(default=0)
- last_used_at: DateTimeField(null=True)
- is_active: BooleanField(default=True)

# Business Logic:
def formatted_address: Property returning full formatted address
def use_address(): Increments usage counter and updates last_used_at
```

### Service Catalog Models

#### Mini-Move Packages
```python
MiniMovePackage (Service packages)
- id: UUIDField (Primary Key)
- package_type: CharField(choices=['petite', 'standard', 'full'], unique=True)
- name: CharField(max_length=100)
- description: TextField()
- base_price_cents: PositiveBigIntegerField()
- max_items: PositiveIntegerField(null=True) # Petite only
- max_weight_per_item_lbs: PositiveIntegerField(default=50)
- coi_included: BooleanField() # Full package includes COI
- coi_fee_cents: PositiveBigIntegerField(default=5000) # $50 default
- is_most_popular: BooleanField(default=False)
- priority_scheduling: BooleanField(default=False)
- protective_wrapping: BooleanField(default=False)
- is_active: BooleanField(default=True)

# Calculated Properties:
@property
def base_price_dollars(): Returns price in dollars
def coi_fee_dollars(): Returns COI fee in dollars
```

#### Organizing Services
```python
OrganizingService (Add-on organizing services)
- id: UUIDField (Primary Key)
- service_type: CharField(choices=ORGANIZING_TYPES, unique=True)
- mini_move_tier: CharField(choices=['petite', 'standard', 'full'])
- name: CharField(max_length=100)
- description: TextField(blank=True)
- price_cents: PositiveBigIntegerField()
- duration_hours: PositiveIntegerField()
- organizer_count: PositiveIntegerField()
- supplies_allowance_cents: PositiveBigIntegerField(default=0)
- is_packing_service: BooleanField() # True for packing, False for unpacking
- is_active: BooleanField(default=True)

# Business Logic:
def can_be_added_to_mini_move(package_type): Validates tier compatibility
@property
def price_dollars(): Returns price in dollars
def supplies_allowance_dollars(): Returns supplies allowance in dollars

# Organizing Service Types:
- 'standard_packing': Standard Packing
- 'full_packing': Full Packing  
- 'standard_unpacking': Standard Unpacking
- 'full_unpacking': Full Unpacking
```

#### Specialty Items & Standard Delivery
```python
SpecialtyItem (High-value/complex items)
- id: UUIDField (Primary Key)
- item_type: CharField(max_length=100, unique=True)
- name: CharField(max_length=100)
- description: TextField()
- price_cents: PositiveBigIntegerField()
- requires_van_schedule: BooleanField(default=False)
- special_handling: BooleanField(default=True)
- max_quantity_per_booking: PositiveIntegerField(default=1)
- is_active: BooleanField(default=True)

StandardDeliveryConfig (Per-item delivery service)
- id: UUIDField (Primary Key)
- price_per_item_cents: PositiveBigIntegerField(default=9500) # $95
- minimum_items: PositiveIntegerField(default=1)
- minimum_charge_cents: PositiveBigIntegerField(default=9500)
- same_day_flat_rate_cents: PositiveBigIntegerField(default=39500) # $395
- max_weight_per_item_lbs: PositiveIntegerField(default=50)
- is_active: BooleanField(default=True)

# Business Logic:
def calculate_total(item_count, is_same_day=False): Calculates total with minimums
```

#### Surcharge Rules Engine
```python
SurchargeRule (Dynamic pricing rules)
- id: UUIDField (Primary Key)
- surcharge_type: CharField(choices=['weekend', 'geographic', 'holiday'])
- name: CharField(max_length=100)
- description: TextField()
- applies_to_service_type: CharField(choices=['all', 'mini_move', 'standard_delivery', 'specialty_item'])
- calculation_type: CharField(choices=['percentage', 'fixed_amount'])
- percentage: DecimalField(null=True) # For percentage calculations
- fixed_amount_cents: PositiveBigIntegerField(null=True) # For fixed amounts
- specific_date: DateField(null=True) # For holiday surcharges
- applies_saturday: BooleanField(default=False)
- applies_sunday: BooleanField(default=False)
- is_active: BooleanField(default=True)

# Business Logic Methods:
def calculate_surcharge(base_amount_cents, booking_date, service_type=None): Main calculation
def applies_to_date(booking_date): Date validation logic

# Current Surcharge Rules:
- Weekend Standard Delivery: $50 Sat/Sun for standard_delivery
- CT/NJ Distance: $220 for all services (geographic)
- Amagansett/Montauk: $120 for all services (geographic)
```

### Payment System Models

#### Payment Processing
```python
Payment (Payment records)
- id: UUIDField (Primary Key)
- booking: ForeignKey(Booking, related_name='payments')
- customer: ForeignKey(User, null=True, related_name='payments')
- amount_cents: PositiveBigIntegerField()
- stripe_payment_intent_id: CharField(max_length=200, blank=True)
- stripe_charge_id: CharField(max_length=200, blank=True)
- status: CharField(choices=STATUS_CHOICES, default='pending')
- failure_reason: TextField(blank=True)
- processed_at: DateTimeField(null=True)

# Status choices: pending, succeeded, failed, refunded
# Properties:
@property
def amount_dollars(): Returns amount in dollars

Refund (Refund tracking)
- id: UUIDField (Primary Key)
- payment: ForeignKey(Payment, related_name='refunds')
- amount_cents: PositiveBigIntegerField()
- reason: CharField(max_length=200)
- stripe_refund_id: CharField(max_length=200, blank=True)
- status: CharField(choices=REFUND_STATUS_CHOICES, default='pending')
- requested_by: ForeignKey(User, related_name='requested_refunds')
- processed_at: DateTimeField(null=True)

PaymentAudit (Payment audit trail)
- id: UUIDField (Primary Key)
- payment: ForeignKey(Payment, null=True)
- refund: ForeignKey(Refund, null=True)
- user: ForeignKey(User, null=True)
- action_type: CharField(choices=AUDIT_ACTIONS)
- description: TextField()
```

### Staff Action Logging

#### Administrative Audit Trail
```python
StaffAction (Comprehensive staff activity logging)
- id: UUIDField (Primary Key)
- staff_user: ForeignKey(User, related_name='staff_actions')
- action_type: CharField(choices=ACTION_TYPE_CHOICES)
- description: TextField()
- ip_address: GenericIPAddressField()
- user_agent: TextField(blank=True)
- customer_id: PositiveIntegerField(null=True) # For customer-related actions
- booking_id: UUIDField(null=True) # For booking-related actions
- created_at: DateTimeField(auto_now_add=True)

# Action Types:
- login, logout, booking_created, booking_updated, booking_cancelled
- customer_viewed, customer_updated, customer_notes_updated
- payment_processed, payment_refunded, report_generated

# Business Logic:
@classmethod
def log_action(staff_user, action_type, description, request=None, customer_id=None, booking_id=None):
    # Automatic IP detection and logging with proper metadata extraction

# Database Indexes:
- Index on (staff_user, -created_at)
- Index on (action_type, -created_at)
- Index on customer_id
- Index on booking_id
```

### Customer Payment Methods
```python
CustomerPaymentMethod (Saved payment methods)
- id: UUIDField (Primary Key)
- user: ForeignKey(User, related_name='payment_methods')
- stripe_payment_method_id: CharField(max_length=100, unique=True)
- card_brand: CharField(max_length=20)
- card_last_four: CharField(max_length=4)
- card_exp_month: PositiveSmallIntegerField()
- card_exp_year: PositiveSmallIntegerField()
- is_default: BooleanField(default=False)
- is_active: BooleanField(default=True)

# Business Logic:
@property
def display_name(): Returns formatted card display name
def save(): Ensures only one default payment method per customer
```

---

## SECTION 4: Business Logic Implementation Guide

### Core Pricing Engine Algorithm

#### Comprehensive Pricing Calculation
The booking pricing system implements a sophisticated multi-factor calculation algorithm in the `Booking.calculate_pricing()` method:

```python
def calculate_pricing(self):
    """Multi-stage pricing calculation algorithm"""
    # Stage 1: Reset all pricing fields
    self.base_price_cents = 0
    self.surcharge_cents = 0
    self.coi_fee_cents = 0
    self.organizing_total_cents = 0
    self.geographic_surcharge_cents = 0
    self.time_window_surcharge_cents = 0
    self.organizing_tax_cents = 0
    
    # Stage 2: Base price calculation by service type
    if self.service_type == 'mini_move' and self.mini_move_package:
        self.base_price_cents = self.mini_move_package.base_price_cents
        self.organizing_total_cents = self.calculate_organizing_costs()
        self.organizing_tax_cents = self.calculate_organizing_tax()
        self.coi_fee_cents = self.calculate_coi_fee()
        
    elif self.service_type == 'standard_delivery':
        config = StandardDeliveryConfig.objects.filter(is_active=True).first()
        if config:
            self.base_price_cents = config.calculate_total(
                self.standard_delivery_item_count,
                is_same_day=self.is_same_day_delivery
            )
    
    elif self.service_type == 'specialty_item':
        specialty_total = sum(item.price_cents for item in self.specialty_items.all())
        self.base_price_cents = specialty_total
    
    # Stage 3: Dynamic surcharge application
    if self.pickup_date and not self.is_same_day_delivery:
        active_surcharges = SurchargeRule.objects.filter(is_active=True)
        for surcharge in active_surcharges:
            surcharge_amount = surcharge.calculate_surcharge(
                self.base_price_cents, 
                self.pickup_date,
                self.service_type
            )
            self.surcharge_cents += surcharge_amount
    
    # Stage 4: Additional fee calculations
    self.geographic_surcharge_cents = self.calculate_geographic_surcharge()
    self.time_window_surcharge_cents = self.calculate_time_window_surcharge()
    
    # Stage 5: Final total calculation
    self.total_price_cents = (
        self.base_price_cents + 
        self.surcharge_cents + 
        self.coi_fee_cents + 
        self.organizing_total_cents +
        self.organizing_tax_cents +
        self.geographic_surcharge_cents +
        self.time_window_surcharge_cents
    )
```

#### Organizing Services Cost Calculation
```python
def calculate_organizing_costs(self):
    """Calculate total cost for organizing services"""
    if self.service_type != 'mini_move' or not self.mini_move_package:
        return 0
    
    total_cost = 0
    package_type = self.mini_move_package.package_type
    
    if self.include_packing:
        packing_service = OrganizingService.objects.filter(
            service_type='standard_packing',
            mini_move_tier=package_type,
            is_active=True
        ).first()
        if packing_service:
            total_cost += packing_service.price_cents
    
    if self.include_unpacking:
        unpacking_service = OrganizingService.objects.filter(
            service_type='standard_unpacking',
            mini_move_tier=package_type,
            is_active=True
        ).first()
        if unpacking_service:
            total_cost += unpacking_service.price_cents
    
    return total_cost
```

#### Geographic Surcharge Logic
```python
def calculate_geographic_surcharge(self):
    """Calculate distance-based surcharges"""
    if self.is_outside_core_area:
        return 17500  # $175 for CT/NJ and other distant locations
    return 0

def calculate_time_window_surcharge(self):
    """Calculate 1-hour window selection surcharge"""
    if self.pickup_time == 'morning_specific':
        if self.service_type == 'mini_move' and self.mini_move_package:
            if self.mini_move_package.package_type == 'standard':
                return 17500  # $175 surcharge for standard package
            elif self.mini_move_package.package_type == 'full':
                return 0  # Free for full package
    return 0
```

#### COI Fee Calculation Logic
```python
def calculate_coi_fee(self):
    """Calculate Certificate of Insurance fee based on package type"""
    if not self.coi_required:
        return 0
    
    if self.mini_move_package:
        if self.mini_move_package.coi_included:
            return 0  # Full package includes COI
        else:
            return self.mini_move_package.coi_fee_cents  # $50 for Petite/Standard
    return 0
```

### Authentication & Authorization Logic

#### Hybrid Account Prevention System
```python
@staticmethod
def ensure_single_profile_type(user):
    """Prevents users from having both customer and staff profiles"""
    has_customer = hasattr(user, 'customer_profile')
    has_staff = hasattr(user, 'staff_profile')
    
    if has_customer and has_staff:
        raise ValidationError(
            "User cannot have both customer and staff profiles"
        )
    
    return True
```

#### Staff Action Logging System
```python
@classmethod
def log_action(cls, staff_user, action_type, description, request=None, customer_id=None, booking_id=None):
    """Comprehensive staff action logging with IP detection"""
    ip_address = '127.0.0.1'  # Default fallback
    user_agent = ''
    
    if request:
        # Smart IP detection handling proxy headers
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
```

### Customer Statistics Updates
```python
def update_booking_stats(self, booking):
    """Update customer statistics after successful booking"""
    self.total_bookings += 1
    self.total_spent_cents += booking.total_price_cents
    self.last_booking_at = timezone.now()
    
    # VIP status logic (10+ bookings or $2000+ spent)
    if self.total_bookings >= 10 or self.total_spent_cents >= 200000:
        self.is_vip = True
    
    self.save()
```

### Booking Number Generation
```python
def generate_booking_number(self):
    """Generate unique booking numbers with format TT-YYYYMMDD-XXXX"""
    from django.utils import timezone
    date_str = timezone.now().strftime('%Y%m%d')
    
    # Find highest sequence for today
    today_bookings = Booking.objects.filter(
        booking_number__startswith=f'TT-{date_str}-'
    ).count()
    
    sequence = str(today_bookings + 1).zfill(4)
    return f'TT-{date_str}-{sequence}'
```

### Rate Limiting Implementation
The system implements sophisticated rate limiting using `django-ratelimit`:

```python
# Applied to authentication endpoints
@method_decorator(ratelimit(key='ip', rate='5/m', method='POST', block=True), name='post')
@method_decorator(ratelimit(key='header:user-agent', rate='10/m', method='POST', block=True), name='post')

# Applied to booking creation
@method_decorator(ratelimit(key='ip', rate='3/m', method='POST', block=True), name='create')
```

---

## SECTION 5: Integration Architecture Reference

### Django Settings Configuration

#### Environment-Based Configuration
```python
# Environment variable handling with django-environ
env = environ.Env(
    DEBUG=(bool, False),  # Production-safe default
)

# Multi-environment support
DEBUG = env('DEBUG', default=False)
SECRET_KEY = env('SECRET_KEY', default='django-insecure-change-me-in-production')

# Fly.io deployment support
FLY_APP_NAME = env('FLY_APP_NAME', default='')
if FLY_APP_NAME:
    ALLOWED_HOSTS.extend([
        f'{FLY_APP_NAME}.fly.dev',
        f'{FLY_APP_NAME}.internal',
        '.fly.dev',
    ])
```

#### Application Structure
```python
DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'corsheaders',
    'django_celery_beat',
    'drf_yasg',
    'django_ratelimit',
]

LOCAL_APPS = [
    'apps.accounts',      # Staff management
    'apps.bookings',      # Core booking system
    'apps.services',      # Service catalog
    'apps.payments',      # Payment processing
    'apps.logistics',     # Operations
    'apps.documents',     # Document management
    'apps.notifications', # Communications
    'apps.crm',          # Customer analytics
    'apps.customers',    # Customer management
]
```

#### Database Configuration
```python
# PostgreSQL configuration with connection pooling
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

# Production DATABASE_URL support (Fly.io)
database_url = env('DATABASE_URL', default=None)
if database_url:
    import dj_database_url
    DATABASES['default'] = dj_database_url.config(
        default=database_url,
        conn_max_age=600,
        conn_health_checks=True,
    )
```

#### Redis & Caching Configuration
```python
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': env('REDIS_URL', default='redis://redis:6379/1'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'IGNORE_EXCEPTIONS': True,  # Graceful degradation
        }
    }
}

# Rate limiting configuration
RATELIMIT_USE_CACHE = 'default'
RATELIMIT_ENABLE = True
```

#### Session & Security Configuration
```python
# Enhanced session management
SESSION_COOKIE_SECURE = env.bool('SESSION_COOKIE_SECURE', default=not DEBUG)
SESSION_COOKIE_SAMESITE = env('SESSION_COOKIE_SAMESITE', default='Lax')
SESSION_COOKIE_AGE = 60 * 60 * 24 * 30  # 30 days
SESSION_EXPIRE_AT_BROWSER_CLOSE = False
SESSION_SAVE_EVERY_REQUEST = True
SESSION_COOKIE_NAME = 'totetaxi_sessionid'
SESSION_ENGINE = 'django.contrib.sessions.backends.db'

# CSRF protection
CSRF_COOKIE_SECURE = env.bool('CSRF_COOKIE_SECURE', default=not DEBUG)
CSRF_COOKIE_HTTPONLY = False  # Allow JavaScript access
CSRF_COOKIE_SAMESITE = env('CSRF_COOKIE_SAMESITE', default='Lax')
CSRF_TRUSTED_ORIGINS = env.list('CSRF_TRUSTED_ORIGINS', default=[
    'http://localhost:3000',
    'http://127.0.0.1:3000',
])
```

#### CORS Configuration
```python
CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[
    'http://localhost:3000',
    'http://127.0.0.1:3000',
])

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]
```

### Celery Background Processing

#### Celery Configuration
```python
# config/celery.py
import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
app = Celery('totetaxi')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# Settings configuration
CELERY_BROKER_URL = env('REDIS_URL', default='redis://redis:6379/0')
CELERY_RESULT_BACKEND = env('REDIS_URL', default='redis://redis:6379/0')
CELERY_ACCEPT_CONTENT = ['application/json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'
```

### Stripe Payment Integration

#### Payment Service Architecture
```python
class StripePaymentService:
    """Centralized Stripe integration service"""
    
    @staticmethod
    def create_payment_intent(booking, amount_cents):
        """Create Stripe payment intent for booking"""
        try:
            intent = stripe.PaymentIntent.create(
                amount=amount_cents,
                currency='usd',
                metadata={
                    'booking_id': str(booking.id),
                    'booking_number': booking.booking_number,
                }
            )
            
            # Create payment record
            payment = Payment.objects.create(
                booking=booking,
                customer=booking.customer,
                amount_cents=amount_cents,
                stripe_payment_intent_id=intent.id,
                status='pending'
            )
            
            return {
                'client_secret': intent.client_secret,
                'payment_intent_id': intent.id
            }
        except stripe.error.StripeError as e:
            raise PaymentError(f"Stripe error: {str(e)}")
    
    @staticmethod
    def confirm_payment(payment_intent_id):
        """Confirm payment and update booking status"""
        payment = Payment.objects.get(stripe_payment_intent_id=payment_intent_id)
        
        try:
            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            
            if intent.status == 'succeeded':
                payment.status = 'succeeded'
                payment.stripe_charge_id = intent.charges.data[0].id
                payment.processed_at = timezone.now()
                payment.save()
                
                # Update booking status
                booking = payment.booking
                booking.status = 'paid'
                booking.save()
                
                # Update customer statistics
                if booking.customer:
                    profile = booking.customer.customer_profile
                    profile.update_booking_stats(booking)
                
                return payment
            
        except stripe.error.StripeError as e:
            payment.status = 'failed'
            payment.failure_reason = str(e)
            payment.save()
            raise PaymentError(f"Payment confirmation failed: {str(e)}")
```

### Static Files & Media Handling

#### WhiteNoise Configuration
```python
# Static files handling
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
```

### Docker Configuration

#### Development Docker Setup
```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: totetaxi
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5435:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data/
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6382:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

  web:
    build: .
    command: python manage.py runserver 0.0.0.0:8000
    volumes:
      - .:/app
    ports:
      - "8005:8000"
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy

  celery:
    build: .
    command: celery -A config worker -l info
    depends_on:
      - db
      - redis

  celery-beat:
    build: .
    command: celery -A config beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
    depends_on:
      - db
      - redis
```

---

## SECTION 6: Development Extension Patterns

### Adding New Service Types

#### Service Type Extension Pattern
To add a new service type to the booking system:

1. **Update Service Choices in Booking Model**:
```python
# apps/bookings/models.py
SERVICE_TYPE_CHOICES = [
    ('mini_move', 'Mini Move'),
    ('standard_delivery', 'Standard Delivery'),
    ('specialty_item', 'Specialty Item'),
    ('new_service_type', 'New Service Type'),  # Add here
]
```

2. **Create Service Configuration Model**:
```python
# apps/services/models.py
class NewServiceConfig(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    base_price_cents = models.PositiveBigIntegerField()
    # Add service-specific fields
    is_active = models.BooleanField(default=True)
```

3. **Update Booking Pricing Logic**:
```python
# apps/bookings/models.py - in calculate_pricing method
elif self.service_type == 'new_service_type':
    # Add pricing calculation logic
    config = NewServiceConfig.objects.filter(is_active=True).first()
    if config:
        self.base_price_cents = config.calculate_total()
```

4. **Create API Endpoints**:
```python
# apps/bookings/views.py
class NewServiceDetailView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        configs = NewServiceConfig.objects.filter(is_active=True)
        serializer = NewServiceConfigSerializer(configs, many=True)
        return Response(serializer.data)
```

### Adding New Surcharge Rules

#### Surcharge Rule Creation Pattern
```python
# Create new surcharge rule
SurchargeRule.objects.create(
    surcharge_type='holiday',
    name='Christmas Week Surcharge',
    description='Additional charge for Christmas week bookings',
    applies_to_service_type='all',
    calculation_type='percentage',
    percentage=25.0,
    specific_date=date(2025, 12, 25),
    is_active=True
)
```

### Custom Staff Permissions

#### Permission Extension Pattern
```python
# apps/accounts/models.py - extend StaffProfile
def has_permission(self, permission_name):
    """Check if staff user has specific permission"""
    return self.permissions.get(permission_name, False)

def grant_permission(self, permission_name):
    """Grant permission to staff user"""
    self.permissions[permission_name] = True
    self.save()

# Usage in views
def get_queryset(self):
    if not self.request.user.staff_profile.has_permission('view_all_bookings'):
        # Filter based on permissions
        return Booking.objects.filter(assigned_staff=self.request.user)
    return Booking.objects.all()
```

### Custom API Endpoints

#### API Endpoint Creation Pattern
```python
# Standard endpoint pattern
class CustomBookingAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Validate permissions
        if not hasattr(request.user, 'staff_profile'):
            return Response(
                {'error': 'Staff access required'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Business logic
        analytics_data = self.calculate_analytics()
        
        # Log staff action
        StaffAction.log_action(
            staff_user=request.user,
            action_type='report_generated',
            description='Custom booking analytics report',
            request=request
        )
        
        return Response(analytics_data)
    
    def calculate_analytics(self):
        # Implement analytics logic
        return {}
```

### Database Migration Patterns

#### Model Migration Pattern
```python
# For adding new fields to existing models
python manage.py makemigrations --name add_new_field_to_booking
python manage.py migrate

# For data migrations
python manage.py makemigrations --empty app_name --name populate_new_data
# Edit migration file to add data population logic
python manage.py migrate
```

### Testing Patterns

#### Model Testing Pattern
```python
# apps/bookings/tests.py
from django.test import TestCase
from django.contrib.auth.models import User
from .models import Booking, Address

class BookingModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='test@example.com',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_booking_pricing_calculation(self):
        booking = Booking.objects.create(
            customer=self.user,
            service_type='mini_move',
            # ... other required fields
        )
        booking.calculate_pricing()
        self.assertGreater(booking.total_price_cents, 0)
```

#### API Testing Pattern
```python
from rest_framework.test import APITestCase
from rest_framework import status

class BookingAPITest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='test@example.com',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_create_booking_authenticated(self):
        self.client.force_authenticate(user=self.user)
        data = {
            'service_type': 'mini_move',
            # ... other booking data
        }
        response = self.client.post('/api/customers/bookings/create/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
```

---

## SECTION 7: Validation & Constraint Reference

### Model-Level Validation Rules

#### Customer Profile Validation
```python
# apps/customers/models.py
def clean(self):
    """Model-level validation for CustomerProfile"""
    super().clean()
    
    # Phone validation
    if self.phone and not re.match(r'^\+?1?\d{9,15}$', self.phone):
        raise ValidationError({'phone': 'Invalid phone number format'})
    
    # VIP status logic validation
    if self.is_vip and self.total_bookings < 5 and self.total_spent_cents < 100000:
        raise ValidationError({'is_vip': 'VIP status requires 5+ bookings or $1000+ spent'})

@staticmethod
def ensure_single_profile_type(user):
    """Prevents hybrid customer/staff accounts"""
    if hasattr(user, 'customer_profile') and hasattr(user, 'staff_profile'):
        raise ValidationError("User cannot have both customer and staff profiles")
```

#### Booking Validation Logic
```python
# apps/bookings/models.py
def clean(self):
    """Comprehensive booking validation"""
    super().clean()
    
    # Service type consistency validation
    if self.service_type == 'mini_move' and not self.mini_move_package:
        raise ValidationError({'mini_move_package': 'Mini move package required for mini move service'})
    
    if self.service_type == 'standard_delivery' and not self.standard_delivery_item_count:
        raise ValidationError({'standard_delivery_item_count': 'Item count required for standard delivery'})
    
    if self.service_type == 'specialty_item' and not self.specialty_items.exists():
        raise ValidationError({'specialty_items': 'At least one specialty item required'})
    
    # Date validation
    if self.pickup_date and self.pickup_date < timezone.now().date():
        raise ValidationError({'pickup_date': 'Pickup date cannot be in the past'})
    
    # Same-day delivery validation
    if self.is_same_day_delivery and self.pickup_date != timezone.now().date():
        raise ValidationError({'is_same_day_delivery': 'Same-day delivery only available for today'})
    
    # Organizing services validation
    if self.include_packing or self.include_unpacking:
        if self.service_type != 'mini_move':
            raise ValidationError('Organizing services only available for mini moves')
    
    # Time window validation
    if self.pickup_time == 'morning_specific' and not self.specific_pickup_hour:
        raise ValidationError({'specific_pickup_hour': '1-hour window requires specific hour selection'})
    
    if self.specific_pickup_hour and not (8 <= self.specific_pickup_hour <= 18):
        raise ValidationError({'specific_pickup_hour': 'Pickup hour must be between 8 AM and 6 PM'})
```

#### Address Validation
```python
# apps/bookings/models.py - Address model
def clean(self):
    """Address validation rules"""
    super().clean()
    
    # State validation
    valid_states = ['NY', 'CT', 'NJ']
    if self.state not in valid_states:
        raise ValidationError({'state': f'Service only available in {", ".join(valid_states)}'})
    
    # ZIP code validation
    if not re.match(r'^\d{5}(-\d{4})?$', self.zip_code):
        raise ValidationError({'zip_code': 'Invalid ZIP code format'})
    
    # Required fields validation
    if not self.address_line_1.strip():
        raise ValidationError({'address_line_1': 'Address line 1 is required'})
```

### Serializer Validation Rules

#### Authentication Serializer Validation
```python
# apps/customers/serializers.py
class CustomerRegistrationSerializer(serializers.ModelSerializer):
    def validate_email(self, value):
        """Email validation with staff account check"""
        if User.objects.filter(email__iexact=value).exists():
            existing_user = User.objects.get(email__iexact=value)
            if hasattr(existing_user, 'staff_profile'):
                raise serializers.ValidationError(
                    "This email is registered as a staff account. Use a different email."
                )
            raise serializers.ValidationError("Email already registered.")
        return value.lower()
    
    def validate_phone(self, value):
        """Phone number format validation"""
        if not re.match(r'^\+?1?\d{9,15}$', value):
            raise serializers.ValidationError("Invalid phone number format")
        return value
    
    def validate_password(self, value):
        """Password strength validation"""
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters")
        return value
```

#### Booking Serializer Validation
```python
# apps/customers/booking_serializers.py
class CustomerBookingCreateSerializer(serializers.ModelSerializer):
    def validate_pickup_date(self, value):
        """Pickup date validation"""
        if value < timezone.now().date():
            raise serializers.ValidationError("Pickup date cannot be in the past")
        
        # Weekend validation for certain services
        if value.weekday() in [5, 6]:  # Saturday, Sunday
            service_type = self.initial_data.get('service_type')
            if service_type == 'standard_delivery':
                # Weekend surcharge warning (not blocking)
                pass
        
        return value
    
    def validate_specialty_items(self, value):
        """Specialty items validation"""
        if len(value) > 5:
            raise serializers.ValidationError("Maximum 5 specialty items per booking")
        
        # Check item availability
        for item_id in value:
            try:
                item = SpecialtyItem.objects.get(id=item_id, is_active=True)
            except SpecialtyItem.DoesNotExist:
                raise serializers.ValidationError(f"Specialty item {item_id} not available")
        
        return value
```

### Business Rule Constraints

#### Payment Validation Rules
```python
# apps/payments/models.py
def clean(self):
    """Payment validation rules"""
    super().clean()
    
    # Amount validation
    if self.amount_cents <= 0:
        raise ValidationError({'amount_cents': 'Payment amount must be positive'})
    
    # Booking amount consistency
    if self.booking and self.amount_cents != self.booking.total_price_cents:
        raise ValidationError('Payment amount must match booking total')
    
    # Duplicate payment prevention
    if self.booking.payments.filter(status='succeeded').exists():
        raise ValidationError('Booking already has successful payment')
```

#### Surcharge Rule Validation
```python
# apps/services/models.py - SurchargeRule
def clean(self):
    """Surcharge rule validation"""
    super().clean()
    
    # Calculation type validation
    if self.calculation_type == 'percentage' and not self.percentage:
        raise ValidationError({'percentage': 'Percentage required for percentage calculation'})
    
    if self.calculation_type == 'fixed_amount' and not self.fixed_amount_cents:
        raise ValidationError({'fixed_amount_cents': 'Fixed amount required for fixed amount calculation'})
    
    # Date logic validation
    if self.specific_date and (self.applies_saturday or self.applies_sunday):
        raise ValidationError('Cannot specify both specific date and weekday rules')
    
    # Percentage bounds
    if self.percentage and (self.percentage < 0 or self.percentage > 100):
        raise ValidationError({'percentage': 'Percentage must be between 0 and 100'})
```

### Database Constraints

#### Model Constraints
```python
# Database-level constraints defined in models
class Meta:
    constraints = [
        models.UniqueConstraint(
            fields=['user', 'nickname'],
            name='unique_address_nickname_per_user'
        ),
        models.CheckConstraint(
            check=models.Q(amount_cents__gt=0),
            name='positive_payment_amount'
        ),
        models.CheckConstraint(
            check=models.Q(total_bookings__gte=0),
            name='non_negative_booking_count'
        ),
    ]
```

#### Index Optimization
```python
# Performance indexes for common queries
class Meta:
    indexes = [
        models.Index(fields=['customer', 'status', 'pickup_date']),
        models.Index(fields=['pickup_date', 'service_type']),
        models.Index(fields=['status', 'created_at']),
        models.Index(fields=['staff_user', '-created_at']),
        models.Index(fields=['booking_number']),  # Unique lookup optimization
    ]
```

### Error Handling Patterns

#### API Error Response Format
```python
# Standardized error response format
def handle_validation_error(serializer_errors):
    """Convert serializer errors to standardized format"""
    return {
        'error': 'Validation failed',
        'field_errors': serializer_errors,
        'timestamp': timezone.now().isoformat()
    }

def handle_business_logic_error(message, error_code=None):
    """Handle business logic errors"""
    return {
        'error': message,
        'error_code': error_code,
        'timestamp': timezone.now().isoformat()
    }
```

---

## SECTION 8: Configuration & Deployment Reference

### Environment Variables Reference

#### Required Environment Variables
```bash
# Security
SECRET_KEY=your-secret-key-here
DEBUG=False

# Database
DATABASE_URL=postgres://user:password@host:port/database
# OR individual settings
DB_NAME=totetaxi
DB_USER=postgres
DB_PASSWORD=your-password
DB_HOST=localhost
DB_PORT=5432

# Redis
REDIS_URL=redis://redis:6379/0

# External Services
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (SES)
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_SES_REGION_NAME=us-east-1
DEFAULT_FROM_EMAIL=noreply@totetaxi.com

# File Storage (S3)
AWS_STORAGE_BUCKET_NAME=totetaxi-media
AWS_S3_REGION_NAME=us-east-1

# Deployment
ALLOWED_HOSTS=totetaxi.com,www.totetaxi.com,api.totetaxi.com
CORS_ALLOWED_ORIGINS=https://totetaxi.com,https://www.totetaxi.com
CSRF_TRUSTED_ORIGINS=https://totetaxi.com,https://www.totetaxi.com
```

#### Development vs Production Configuration
```python
# Development settings
if DEBUG:
    CORS_ALLOWED_ORIGINS.extend([
        'http://localhost:3000',
        'http://127.0.0.1:3000',
    ])
    
    # Email backend for development
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
    
    # File storage for development
    DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'

# Production settings
else:
    # Email backend for production
    EMAIL_BACKEND = 'django_ses.SESBackend'
    
    # S3 file storage for production
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    
    # Security settings
    SECURE_SSL_REDIRECT = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
```

### Docker Deployment Configuration

#### Production Dockerfile
```dockerfile
FROM python:3.11-slim

# Set environment variables
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

# Collect static files
RUN python manage.py collectstatic --noinput

# Create non-root user
RUN adduser --disabled-password --gecos '' appuser
RUN chown -R appuser:appuser /app
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:$PORT/api/health/ || exit 1

# Run gunicorn
CMD gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
```

#### Production Docker Compose
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ${DB_NAME:-totetaxi}
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data/
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-postgres}"]

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes
    volumes:
      - redis_data:/data
    restart: unless-stopped

  web:
    build:
      context: .
      dockerfile: Dockerfile.prod
    environment:
      - DATABASE_URL=postgres://${DB_USER:-postgres}:${DB_PASSWORD}@db:5432/${DB_NAME:-totetaxi}
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
    depends_on:
      - db
      - redis
    restart: unless-stopped

  celery:
    build:
      context: .
      dockerfile: Dockerfile.prod
    command: celery -A config worker -l info
    depends_on:
      - db
      - redis
    restart: unless-stopped

  celery-beat:
    build:
      context: .
      dockerfile: Dockerfile.prod
    command: celery -A config beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
    depends_on:
      - db
      - redis
    restart: unless-stopped
```

### Fly.io Deployment Configuration

#### Fly.io Configuration
```toml
# fly.toml
app = 'totetaxi-backend'
primary_region = 'ewr'

[build]
  dockerfile = 'Dockerfile.prod'

[env]
  DEBUG = "False"
  DJANGO_LOG_LEVEL = "INFO"
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

[[statics]]
  guest_path = "/app/staticfiles"
  url_prefix = "/static/"
```

### Performance Configuration

#### Gunicorn Configuration
```python
# gunicorn.conf.py
import multiprocessing

# Server socket
bind = "0.0.0.0:8000"
backlog = 2048

# Worker processes
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
worker_connections = 1000
timeout = 30
keepalive = 2
max_requests = 1000
max_requests_jitter = 100

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"

# Process naming
proc_name = "totetaxi"

# Server mechanics
preload_app = True
pidfile = "/tmp/gunicorn.pid"
```

#### Database Performance Settings
```python
# Database connection pooling
DATABASES['default'].update({
    'CONN_MAX_AGE': 600,
    'CONN_HEALTH_CHECKS': True,
    'OPTIONS': {
        'MAX_CONNS': 20,
        'RESET_QUERIES': True,
    }
})

# Query optimization settings
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': 'django.log',
        },
    },
    'loggers': {
        'django.db.backends': {
            'handlers': ['file'],
            'level': 'DEBUG' if DEBUG else 'INFO',
            'propagate': True,
        },
    },
}
```

### Monitoring & Logging Configuration

#### Structured Logging Setup
```python
# Logging configuration for production
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': 'logs/django.log',
            'maxBytes': 1024*1024*10,  # 10 MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'apps': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
```

### Management Commands

#### Custom Management Commands
```python
# apps/customers/management/commands/clean_delete_user.py
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.db import transaction

class Command(BaseCommand):
    help = 'Safely delete user and associated data'
    
    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='User email to delete')
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )
    
    def handle(self, *args, **options):
        email = options['email']
        dry_run = options['dry_run']
        
        try:
            user = User.objects.get(email__iexact=email)
            
            if dry_run:
                self.stdout.write(f"Would delete user: {user.email}")
                return
            
            with transaction.atomic():
                # Delete associated data
                if hasattr(user, 'customer_profile'):
                    user.customer_profile.delete()
                if hasattr(user, 'staff_profile'):
                    user.staff_profile.delete()
                
                user.delete()
                
            self.stdout.write(
                self.style.SUCCESS(f'Successfully deleted user: {email}')
            )
            
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'User not found: {email}')
            )
```

### Backup & Recovery Procedures

#### Database Backup Script
```bash
#!/bin/bash
# backup_database.sh

DB_NAME=${DB_NAME:-totetaxi}
DB_USER=${DB_USER:-postgres}
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup
pg_dump -h localhost -U $DB_USER -d $DB_NAME > $BACKUP_DIR/totetaxi_backup_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/totetaxi_backup_$DATE.sql

# Remove backups older than 30 days
find $BACKUP_DIR -name "totetaxi_backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: totetaxi_backup_$DATE.sql.gz"
```

---

## CONCLUSION

This living documentation provides comprehensive coverage of the ToteTaxi Django backend system, enabling independent development and system extension. The documentation follows the extractive patterns for any Django project while maintaining specific business domain knowledge for the moving services platform.

**Key Capabilities Enabled:**
- Complete API endpoint modification and extension
- Business logic understanding and enhancement  
- Service catalog expansion and pricing rule customization
- Staff operations and customer management workflow comprehension
- Payment processing and financial transaction management
- Database schema evolution and constraint management
- Deployment configuration and environment management

**Total Documentation Lines:** ~1,600 lines

**Usage as Magnifying Glass:** This documentation serves as a comprehensive lens into the codebase, providing the depth needed to understand business logic, technical implementation patterns, and architectural decisions without requiring additional file requests or context gathering.