# ToteTaxi Backend - Living Documentation v2.0

**Purpose**: Strategic navigation system for ToteTaxi Django/DRF backend enabling AI executive function through architectural mapping and comprehensive file indexing.

**Source of Truth**: `back_export.txt` (122 files, complete codebase)  
**This Document**: Navigation map + critical structures (strategic overview)

---

## SECTION 1: System Architecture Mental Model

### Project Overview

ToteTaxi is a luxury door-to-door delivery, storage, courier, and mini moving service platform serving the Hamptons, NYC, major NY airports, Connecticut, and South Florida. The platform provides white-glove service for high-net-worth individuals.

**Tech Stack**:
- Django 5.2.5 + Django REST Framework 3.16.1
- PostgreSQL (primary database)
- Redis (caching + Celery broker)
- Celery (async tasks)
- AWS S3 (file storage)
- AWS SES (email)
- Stripe (payments, mocked)
- Onfleet (logistics, mocked)

**Deployment**:
- Backend: Fly.io (Docker)
- Frontend: Netlify
- Docker Compose for local development

### Django Project Structure

```
backend/
├── config/                    # Django project settings
│   ├── settings.py           # Main configuration
│   ├── urls.py               # Root URL routing
│   ├── celery.py             # Celery configuration
│   ├── wsgi.py               # WSGI entry point
│   └── asgi.py               # ASGI entry point
├── apps/                      # Business domain applications
│   ├── accounts/             # Staff authentication & management
│   ├── bookings/             # Booking system (core domain)
│   ├── customers/            # Customer authentication & profiles
│   ├── services/             # Service catalog & pricing engine
│   ├── payments/             # Payment processing & Stripe
│   ├── logistics/            # Operations & Onfleet integration
│   ├── notifications/        # Email/SMS notifications
│   ├── documents/            # Document management (placeholder)
│   └── crm/                  # CRM features (placeholder)
├── scripts/                   # Utility scripts
├── static/                    # Static files
└── manage.py                  # Django management CLI
```

### App Organization Philosophy

**Domain-Driven Design**: Each app represents a bounded context in the business domain.

**accounts** (Staff Domain):
- Staff user authentication and authorization
- Staff profiles and permissions
- Staff action logging/audit trail
- Staff dashboard and analytics

**customers** (Customer Domain):
- Customer authentication (separate from staff)
- Customer profiles and preferences
- Saved addresses and payment methods
- Customer dashboard and booking history
- Customer-initiated bookings

**bookings** (Core Domain):
- Booking lifecycle management
- Guest checkout flow (no auth required)
- Service selection and configuration
- Address management
- Booking status transitions
- Integration point for services, payments, logistics

**services** (Pricing Domain):
- Service catalog (Mini Moves, Standard Delivery, Specialty Items, BLADE)
- Organizing services (packing/unpacking)
- Pricing engine and calculation logic
- Surcharge rules (weekend, holiday, geographic, time window)
- Service configuration management

**payments** (Financial Domain):
- Stripe payment processing
- Payment intent creation and confirmation
- Refund management
- Transaction history
- Webhook handling (mocked)

**logistics** (Operations Domain):
- Onfleet task creation and management
- Driver assignment (mocked)
- Delivery tracking
- Logistics dashboard

**notifications** (Communications):
- Email service via AWS SES
- SMS service (placeholder)
- Notification templates

**documents** & **crm**: Placeholder apps for future features

### Layer Separation Strategy

**Models Layer** (`models.py`):
- Data structure definitions
- Field constraints and validators
- Business logic methods (calculations, state transitions)
- Custom managers and querysets
- Relationship definitions with cascade behaviors

**Serializers Layer** (`serializers.py`):
- Request/response data transformation
- Input validation (field-level, object-level)
- Nested serialization for related objects
- Read-only computed fields

**Views Layer** (`views.py`, `booking_views.py`):
- HTTP request handling
- Permission enforcement
- Response formatting
- Error handling
- Rate limiting decorators

**Services Layer** (`services.py`):
- Complex multi-step business operations
- External API integrations (Stripe, Onfleet, AWS)
- Cross-app coordination
- Stateless service classes

**Tasks Layer** (`tasks.py`):
- Asynchronous background operations (Celery)
- Scheduled jobs
- Webhook processing
- Email sending

**URL Layer** (`urls.py`):
- API endpoint routing
- RESTful URL patterns
- Namespace organization

### Key Architectural Patterns

**Service Class Pattern**:
- Complex logic extracted to dedicated service classes
- Example: `StripePaymentService`, `OnfleetService`, `ToteTaxiOnfleetIntegration`
- Benefits: Testability, reusability, separation of concerns

**Pricing Engine Pattern**:
- Centralized pricing calculation in `Booking.calculate_pricing()`
- Pluggable surcharge system via `SurchargeRule` model
- Pricing preview API for real-time quotes

**Dual Authentication Pattern**:
- Separate auth systems for customers (`customers/`) and staff (`accounts/`)
- Different permission requirements
- Distinct user experiences and dashboards

**Guest Checkout Pattern**:
- Bookings without authentication via `GuestCheckout` model
- One-to-one relationship with `Booking`
- Email-based booking lookup

**Mocked Integration Pattern**:
- Stripe and Onfleet integrations are mocked for development
- Real API structure maintained for easy production swap
- Mock responses return realistic data

**Audit Trail Pattern**:
- `StaffAction` model logs all staff operations
- Automatic tracking via view decorators
- Critical for compliance and debugging

### Integration Strategy

**Stripe Integration**:
- Payment Intent flow for 3D Secure compliance
- Service class: `StripePaymentService` in `apps/payments/services.py`
- Webhook endpoint (mocked): `/api/payments/webhook/`
- Client-side: Stripe Elements in frontend

**Onfleet Integration**:
- Task creation from confirmed bookings
- Service classes: `OnfleetService`, `ToteTaxiOnfleetIntegration` in `apps/logistics/services.py`
- Status sync via webhooks (mocked)
- Tracking URLs for customers

**AWS S3 Integration**:
- Media file storage (production)
- Django-storages library
- Configuration in `settings.py`

**AWS SES Integration**:
- Email delivery service
- Configuration in `settings.py`
- Mocked for development

**Redis Integration**:
- Session storage
- Celery message broker
- Caching layer (configured but minimal usage)

### Security & Authentication

**CSRF Protection**:
- Django CSRF middleware enabled
- CSRF token endpoints: `/api/customers/csrf-token/`, `/api/staff/csrf-token/`
- Cookie-based CSRF tokens

**CORS Configuration**:
- `django-cors-headers` middleware
- Configured for frontend domains in `settings.py`
- Credentials allowed for cookie-based auth

**Rate Limiting**:
- `django-ratelimit` decorator on critical endpoints
- Login endpoints: 5 requests/min per IP
- Staff actions: User-based rate limits
- Customer operations: 15 requests/min per user

**Permission Classes**:
- `IsAuthenticated` for customer endpoints
- `IsStaffUser` for staff endpoints (custom permission in `accounts/`)
- `AllowAny` for public endpoints (guest booking, service catalog)

**Password Security**:
- Django's PBKDF2 password hasher
- Password validation rules in settings
- Secure password reset flow (to be implemented)

### Data Flow Patterns

**Booking Creation Flow**:
1. Frontend → Service catalog API → Get available services
2. Frontend → Pricing preview API → Calculate quote
3. Customer fills wizard → Create booking + payment intent
4. Stripe confirms payment → Webhook updates booking status
5. Booking confirmed → Onfleet task created
6. Email notification sent → Customer receives confirmation

**Staff Operation Flow**:
1. Staff authenticates → Receives session + CSRF token
2. Staff views dashboard → Aggregated stats from multiple models
3. Staff manages booking → Actions logged to `StaffAction`
4. Updates trigger → Recalculation of customer stats
5. Changes saved → Audit trail maintained

**Guest Booking Flow**:
1. Guest completes wizard (no auth)
2. Guest info stored in `GuestCheckout`
3. Booking created with `customer=None`
4. Payment processed → Email sent to guest
5. Guest looks up booking by booking number + email

---

## SECTION 2: Complete API Endpoint Inventory

### Public Booking APIs (No Authentication)

**URL**: `/api/bookings/services/`  
**Method**: GET  
**View**: `bookings.views.ServiceCatalogView`  
**Authentication**: AllowAny  
**Response**: `{mini_move_packages: [...], standard_delivery: {...}, specialty_items: [...]}`  
**Implementation**: `apps/bookings/views.py`, `apps/services/serializers.py`  
**Purpose**: Get complete service catalog for booking wizard

**URL**: `/api/bookings/pricing-preview/`  
**Method**: POST  
**View**: `bookings.views.PricingPreviewView`  
**Authentication**: AllowAny  
**Request**: `{service_type, mini_move_package_id?, standard_delivery_item_count?, specialty_item_ids?, pickup_date?, include_packing?, include_unpacking?, is_outside_core_area?, coi_required?, pickup_time?}`  
**Response**: `{service_type, pricing: {base_price_dollars, surcharge_dollars, coi_fee_dollars, organizing_total_dollars, organizing_tax_dollars, geographic_surcharge_dollars, time_window_surcharge_dollars, total_price_dollars}, details: {...}}`  
**Implementation**: `apps/bookings/views.py`, `apps/services/models.py`  
**Purpose**: Real-time pricing calculation before booking

**URL**: `/api/bookings/availability/`  
**Method**: GET  
**View**: `bookings.views.CalendarAvailabilityView`  
**Authentication**: AllowAny  
**Query**: `?month=YYYY-MM`  
**Response**: `{available_dates: ['YYYY-MM-DD', ...], unavailable_dates: [...]}`  
**Implementation**: `apps/bookings/views.py`  
**Purpose**: Calendar availability for date picker

**URL**: `/api/bookings/guest-booking/`  
**Method**: POST  
**View**: `bookings.views.GuestBookingCreateView`  
**Authentication**: AllowAny  
**Request**: `{service_type, mini_move_package_id?, specialty_item_ids?, pickup_date, pickup_time, specific_pickup_hour?, pickup_address: {...}, delivery_address: {...}, guest_checkout: {first_name, last_name, email, phone}, special_instructions?, coi_required?, include_packing?, include_unpacking?, blade_airport?, blade_flight_date?, blade_flight_time?, blade_bag_count?}`  
**Response**: `{message, booking: {id, booking_number, total_price_dollars}, payment: {client_secret, publishable_key}}`  
**Implementation**: `apps/bookings/views.py`, `apps/bookings/serializers.py`, `apps/payments/services.py`  
**Purpose**: Create booking without authentication + payment intent

**URL**: `/api/bookings/booking-status/<booking_number>/`  
**Method**: GET  
**View**: `bookings.views.BookingStatusView`  
**Authentication**: AllowAny  
**Query**: `?email=user@example.com`  
**Response**: `{booking: {id, booking_number, status, pickup_date, pickup_address, delivery_address, total_price_dollars, ...}}`  
**Implementation**: `apps/bookings/views.py`, `apps/bookings/serializers.py`  
**Purpose**: Guest booking lookup by booking number + email

**URL**: `/api/bookings/services/mini-moves-with-organizing/`  
**Method**: GET  
**View**: `bookings.views.ServiceCatalogWithOrganizingView`  
**Authentication**: AllowAny  
**Response**: `{mini_moves_with_organizing: [{mini_move: {...}, available_organizing_services: [{packing: {...}, unpacking: {...}}]}]}`  
**Implementation**: `apps/bookings/views.py`, `apps/services/serializers.py`  
**Purpose**: Get mini moves with their organizing service options

**URL**: `/api/bookings/services/organizing-by-tier/`  
**Method**: GET  
**View**: `bookings.views.OrganizingServicesByTierView`  
**Authentication**: AllowAny  
**Response**: `{petite: {packing: {...}, unpacking: {...}}, standard: {...}, full: {...}}`  
**Implementation**: `apps/bookings/views.py`, `apps/services/serializers.py`  
**Purpose**: Get organizing services grouped by mini move tier

**URL**: `/api/bookings/services/organizing/<service_id>/`  
**Method**: GET  
**View**: `bookings.views.OrganizingServiceDetailView`  
**Authentication**: AllowAny  
**Response**: `{id, service_type, name, description, price_dollars, duration_hours, organizer_count, supplies_allowance_dollars, is_packing_service}`  
**Implementation**: `apps/bookings/views.py`, `apps/services/serializers.py`  
**Purpose**: Get detailed info for specific organizing service

### Customer Authentication APIs

**URL**: `/api/customers/csrf-token/`  
**Method**: GET  
**View**: `customers.views.CSRFTokenView`  
**Authentication**: AllowAny  
**Response**: `{csrf_token}`  
**Implementation**: `apps/customers/views.py`  
**Purpose**: Get CSRF token for authenticated requests

**URL**: `/api/customers/auth/register/`  
**Method**: POST  
**View**: `customers.views.CustomerRegistrationView`  
**Authentication**: AllowAny  
**Rate Limit**: 5/min per IP  
**Request**: `{email, password, first_name, last_name, phone?}`  
**Response**: `{message, user: {id, email, first_name, last_name}, customer_profile: {...}, csrf_token}`  
**Implementation**: `apps/customers/views.py`, `apps/customers/serializers.py`  
**Purpose**: Register new customer account

**URL**: `/api/customers/auth/login/`  
**Method**: POST  
**View**: `customers.views.CustomerLoginView`  
**Authentication**: AllowAny  
**Rate Limit**: 5/min per IP  
**Request**: `{email, password}`  
**Response**: `{message, user: {id, email, first_name, last_name}, customer_profile: {...}, csrf_token}`  
**Implementation**: `apps/customers/views.py`, `apps/customers/serializers.py`  
**Purpose**: Customer login with session creation

**URL**: `/api/customers/auth/logout/`  
**Method**: POST  
**View**: `customers.views.CustomerLogoutView`  
**Authentication**: IsAuthenticated  
**Response**: `{message}`  
**Implementation**: `apps/customers/views.py`  
**Purpose**: Customer logout and session destruction

**URL**: `/api/customers/auth/user/`  
**Method**: GET  
**View**: `customers.views.CurrentUserView`  
**Authentication**: IsAuthenticated  
**Rate Limit**: 30/min per user  
**Response**: `{user: {id, email, first_name, last_name, date_joined}, customer_profile: {phone, is_vip, total_bookings, total_spent_dollars, last_booking_at}}`  
**Implementation**: `apps/customers/views.py`, `apps/customers/serializers.py`  
**Purpose**: Get current authenticated customer info

### Customer Profile & Preferences APIs

**URL**: `/api/customers/profile/`  
**Method**: GET, PATCH  
**View**: `customers.views.CustomerProfileView`  
**Authentication**: IsAuthenticated  
**Rate Limit**: 15/min per user (GET), 10/min per user (PATCH)  
**Request (PATCH)**: `{phone?, preferred_pickup_time?, email_notifications?, sms_notifications?}`  
**Response**: `{id, phone, preferred_pickup_time, email_notifications, sms_notifications, is_vip, total_bookings, total_spent_dollars, last_booking_at}`  
**Implementation**: `apps/customers/views.py`, `apps/customers/serializers.py`  
**Purpose**: View/update customer profile

**URL**: `/api/customers/addresses/`  
**Method**: GET, POST  
**View**: `customers.views.SavedAddressListCreateView`  
**Authentication**: IsAuthenticated  
**Rate Limit**: 20/min per user  
**Request (POST)**: `{address_line_1, address_line_2?, city, state, zip_code, label?, is_primary?}`  
**Response**: `[{id, address_line_1, address_line_2, city, state, zip_code, label, is_primary, times_used, is_active}]`  
**Implementation**: `apps/customers/views.py`, `apps/customers/serializers.py`  
**Purpose**: Manage saved addresses

**URL**: `/api/customers/addresses/<address_id>/`  
**Method**: GET, PATCH, DELETE  
**View**: `customers.views.SavedAddressDetailView`  
**Authentication**: IsAuthenticated (must own address)  
**Rate Limit**: 20/min per user  
**Request (PATCH)**: `{address_line_1?, city?, state?, zip_code?, label?, is_primary?}`  
**Response**: `{id, address_line_1, address_line_2, city, state, zip_code, label, is_primary, times_used}`  
**Implementation**: `apps/customers/views.py`, `apps/customers/serializers.py`  
**Purpose**: Update/delete specific saved address

**URL**: `/api/customers/dashboard/`  
**Method**: GET  
**View**: `customers.views.CustomerDashboardView`  
**Authentication**: IsAuthenticated  
**Rate Limit**: 15/min per user  
**Response**: `{customer: {email, phone, is_vip, total_bookings, total_spent_dollars, last_booking_at}, booking_summary: {pending_bookings, completed_bookings, total_bookings}, recent_bookings: [...], saved_addresses_count, payment_methods_count, popular_addresses: [...]}`  
**Implementation**: `apps/customers/views.py`, `apps/customers/serializers.py`  
**Purpose**: Customer dashboard with stats and recent activity

**URL**: `/api/customers/preferences/`  
**Method**: GET  
**View**: `customers.views.BookingPreferencesView`  
**Authentication**: IsAuthenticated  
**Rate Limit**: 15/min per user  
**Response**: `{preferred_pickup_time, email_notifications, sms_notifications, default_addresses: {most_used_pickup, most_used_delivery}}`  
**Implementation**: `apps/customers/views.py`  
**Purpose**: Get customer booking preferences and defaults

### Customer Booking Management APIs

**URL**: `/api/customers/bookings/`  
**Method**: GET  
**View**: `customers.views.CustomerBookingListView`  
**Authentication**: IsAuthenticated  
**Rate Limit**: 20/min per user  
**Query**: `?status=pending&ordering=-created_at`  
**Response**: `[{id, booking_number, service_type, status, pickup_date, total_price_dollars, pickup_address, delivery_address, created_at}]`  
**Implementation**: `apps/customers/views.py`, `apps/bookings/serializers.py`  
**Purpose**: List customer's bookings with filtering/ordering

**URL**: `/api/customers/bookings/create/`  
**Method**: POST  
**View**: `customers.booking_views.CustomerBookingCreateView`  
**Authentication**: IsAuthenticated  
**Request**: `{service_type, mini_move_package_id?, specialty_item_ids?, pickup_date, pickup_time, specific_pickup_hour?, pickup_address: {...}, delivery_address: {...}, special_instructions?, coi_required?, include_packing?, include_unpacking?}`  
**Response**: `{message, booking: {id, booking_number, total_price_dollars}, payment: {client_secret, publishable_key}}`  
**Implementation**: `apps/customers/booking_views.py`, `apps/bookings/serializers.py`, `apps/payments/services.py`  
**Purpose**: Create booking for authenticated customer + payment intent

**URL**: `/api/customers/bookings/<booking_id>/`  
**Method**: GET  
**View**: `customers.booking_views.CustomerBookingDetailView`  
**Authentication**: IsAuthenticated (must own booking)  
**Response**: `{id, booking_number, service_type, status, pickup_date, pickup_time, pickup_address, delivery_address, special_instructions, total_price_dollars, pricing_breakdown, organizing_services_breakdown, created_at}`  
**Implementation**: `apps/customers/booking_views.py`, `apps/bookings/serializers.py`  
**Purpose**: View detailed booking information

**URL**: `/api/customers/bookings/<booking_id>/rebook/`  
**Method**: POST  
**View**: `customers.booking_views.QuickRebookView`  
**Authentication**: IsAuthenticated (must own booking)  
**Request**: `{pickup_date?, pickup_time?, special_instructions?}`  
**Response**: `{message, booking: {id, booking_number, total_price_dollars}, payment: {client_secret, publishable_key}}`  
**Implementation**: `apps/customers/booking_views.py`  
**Purpose**: Quick rebook with same service details but new date

### Staff Authentication APIs

**URL**: `/api/staff/csrf-token/`  
**Method**: GET  
**View**: `accounts.views.StaffCSRFTokenView`  
**Authentication**: AllowAny  
**Response**: `{csrf_token}`  
**Implementation**: `apps/accounts/views.py`  
**Purpose**: Get CSRF token for staff requests

**URL**: `/api/staff/auth/login/`  
**Method**: POST  
**View**: `accounts.views.StaffLoginView`  
**Authentication**: AllowAny  
**Rate Limit**: 5/min per IP, 10/min per user-agent  
**Request**: `{username, password}`  
**Response**: `{message, user: {id, username, email, first_name, last_name, is_staff}, staff_profile: {role, department, phone}, csrf_token}`  
**Implementation**: `apps/accounts/views.py`, `apps/accounts/serializers.py`  
**Purpose**: Staff login with session creation

**URL**: `/api/staff/auth/logout/`  
**Method**: POST  
**View**: `accounts.views.StaffLogoutView`  
**Authentication**: IsStaffUser  
**Response**: `{message}`  
**Implementation**: `apps/accounts/views.py`  
**Purpose**: Staff logout and session destruction

### Staff Dashboard & Analytics APIs

**URL**: `/api/staff/dashboard/`  
**Method**: GET  
**View**: `accounts.views.StaffDashboardView`  
**Authentication**: IsStaffUser  
**Rate Limit**: 20/min per user  
**Response**: `{staff_info: {username, role, department}, today_stats: {bookings_today, pending_bookings, revenue_today_dollars}, recent_bookings: [...], booking_trends: {last_7_days: [...], last_30_days: [...]}, top_customers: [...], pending_refunds: [...]}`  
**Implementation**: `apps/accounts/views.py`  
**Purpose**: Staff dashboard with real-time metrics

### Staff Booking Management APIs

**URL**: `/api/staff/bookings/`  
**Method**: GET  
**View**: `accounts.views.BookingManagementView`  
**Authentication**: IsStaffUser  
**Rate Limit**: 30/min per user  
**Query**: `?status=pending&search=booking123&ordering=-created_at&service_type=mini_move`  
**Response**: `[{id, booking_number, customer_name, customer_email, service_type, status, pickup_date, total_price_dollars, created_at}]`  
**Implementation**: `apps/accounts/views.py`, `apps/bookings/serializers.py`  
**Purpose**: List all bookings with advanced filtering

**URL**: `/api/staff/bookings/<booking_id>/`  
**Method**: GET, PATCH  
**View**: `accounts.views.BookingDetailView`  
**Authentication**: IsStaffUser  
**Request (PATCH)**: `{status?, pickup_date?, pickup_time?, special_instructions?, pickup_address?: {...}, delivery_address?: {...}}`  
**Response**: `{id, booking_number, customer_name, customer_email, service_type, status, pickup_date, pickup_time, pickup_address, delivery_address, special_instructions, total_price_dollars, pricing_breakdown, organizing_services_breakdown, created_at, updated_at}`  
**Implementation**: `apps/accounts/views.py`, `apps/bookings/serializers.py`  
**Purpose**: View/update booking details (logs staff action)

### Staff Customer Management APIs

**URL**: `/api/staff/customers/`  
**Method**: GET  
**View**: `accounts.views.CustomerManagementView`  
**Authentication**: IsStaffUser  
**Rate Limit**: 30/min per user  
**Query**: `?search=email@example.com&is_vip=true&ordering=-total_spent_cents`  
**Response**: `[{id, email, first_name, last_name, phone, is_vip, total_bookings, total_spent_dollars, last_booking_at, date_joined}]`  
**Implementation**: `apps/accounts/views.py`, `apps/customers/serializers.py`  
**Purpose**: List all customers with search and filtering

**URL**: `/api/staff/customers/<customer_id>/`  
**Method**: GET  
**View**: `accounts.views.CustomerDetailView`  
**Authentication**: IsStaffUser  
**Response**: `{id, email, first_name, last_name, phone, is_vip, total_bookings, total_spent_dollars, last_booking_at, date_joined, bookings: [...], saved_addresses: [...], staff_notes}`  
**Implementation**: `apps/accounts/views.py`, `apps/customers/serializers.py`  
**Purpose**: View detailed customer information

**URL**: `/api/staff/customers/<customer_id>/notes/`  
**Method**: PATCH  
**View**: `accounts.views.CustomerNotesUpdateView`  
**Authentication**: IsStaffUser  
**Request**: `{staff_notes}`  
**Response**: `{message, staff_notes}`  
**Implementation**: `apps/accounts/views.py`  
**Purpose**: Update staff notes for customer (logs action)

### Payment Processing APIs

**URL**: `/api/payments/create-intent/`  
**Method**: POST  
**View**: `payments.views.CreatePaymentIntentView`  
**Authentication**: AllowAny  
**Request**: `{amount_cents, booking_id, customer_email?}`  
**Response**: `{client_secret, publishable_key, payment_intent_id}`  
**Implementation**: `apps/payments/views.py`, `apps/payments/services.py`  
**Purpose**: Create Stripe payment intent for booking

**URL**: `/api/payments/confirm/`  
**Method**: POST  
**View**: `payments.views.ConfirmPaymentView`  
**Authentication**: AllowAny  
**Request**: `{payment_intent_id}`  
**Response**: `{message, booking_status, payment_status}`  
**Implementation**: `apps/payments/views.py`, `apps/payments/services.py`  
**Purpose**: Confirm payment and update booking status

**URL**: `/api/payments/webhook/`  
**Method**: POST  
**View**: `payments.views.StripeWebhookView`  
**Authentication**: Stripe signature validation (mocked)  
**Request**: Stripe webhook payload  
**Response**: `{status: 'success'}`  
**Implementation**: `apps/payments/views.py`, `apps/payments/services.py`  
**Purpose**: Handle Stripe webhooks (payment status updates)

---

## SECTION 3: Complete Model Documentation

### accounts.models

```python
class StaffProfile(models.Model):
    """Extended staff user profile with role-based permissions"""
    
    ROLE_CHOICES = [
        ('admin', 'Administrator'),
        ('manager', 'Manager'),
        ('operator', 'Operator'),
        ('support', 'Support'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='staff_profile',
        help_text='Link to Django User model'
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='operator')
    department = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    can_manage_bookings = models.BooleanField(default=True)
    can_manage_customers = models.BooleanField(default=True)
    can_process_refunds = models.BooleanField(default=False)
    can_view_analytics = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'accounts_staff_profile'
    
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.get_role_display()}"
    
    # Properties
    @property
    def full_name(self):
        """Return staff member's full name"""
        return self.user.get_full_name()
```

```python
class StaffAction(models.Model):
    """Audit log for staff actions on bookings and customers"""
    
    ACTION_TYPES = [
        ('booking_created', 'Booking Created'),
        ('booking_updated', 'Booking Updated'),
        ('booking_cancelled', 'Booking Cancelled'),
        ('customer_viewed', 'Customer Viewed'),
        ('customer_updated', 'Customer Updated'),
        ('customer_notes_updated', 'Customer Notes Updated'),
        ('refund_processed', 'Refund Processed'),
        ('payment_adjusted', 'Payment Adjusted'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    staff = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='staff_actions',
        help_text='Staff member who performed the action'
    )
    action_type = models.CharField(max_length=30, choices=ACTION_TYPES)
    target_model = models.CharField(
        max_length=50,
        help_text='Model affected (Booking, Customer, etc.)'
    )
    target_id = models.CharField(
        max_length=100,
        help_text='ID of the affected object'
    )
    description = models.TextField(blank=True)
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text='Additional context data'
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        db_table = 'accounts_staff_action'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['staff', 'created_at']),
            models.Index(fields=['target_model', 'target_id']),
        ]
    
    def __str__(self):
        return f"{self.get_action_type_display()} by {self.staff} at {self.created_at}"
```

### customers.models

```python
class CustomerProfile(models.Model):
    """Extended customer profile with booking preferences and stats"""
    
    PICKUP_TIME_CHOICES = [
        ('morning', 'Morning (8AM-12PM)'),
        ('afternoon', 'Afternoon (12PM-5PM)'),
        ('morning_specific', 'Specific Morning Time'),
        ('no_time_preference', 'No Time Preference'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='customer_profile',
        help_text='Link to Django User model'
    )
    phone = models.CharField(max_length=20, blank=True)
    
    # Preferences
    preferred_pickup_time = models.CharField(
        max_length=30,
        choices=PICKUP_TIME_CHOICES,
        default='no_time_preference'
    )
    email_notifications = models.BooleanField(default=True)
    sms_notifications = models.BooleanField(default=False)
    
    # Customer stats (updated by booking lifecycle)
    is_vip = models.BooleanField(default=False)
    total_bookings = models.PositiveIntegerField(default=0)
    total_spent_cents = models.PositiveBigIntegerField(default=0)
    last_booking_at = models.DateTimeField(null=True, blank=True)
    
    # Staff notes (only visible to staff)
    staff_notes = models.TextField(blank=True, help_text='Internal notes for staff')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'customers_customer_profile'
    
    def __str__(self):
        return f"{self.user.email} - {self.total_bookings} bookings"
    
    # Computed properties
    @property
    def total_spent_dollars(self):
        """Convert cents to dollars"""
        return self.total_spent_cents / 100
    
    # Methods
    def update_booking_stats(self):
        """Recalculate customer stats from bookings - called after booking changes"""
        from apps.bookings.models import Booking
        
        bookings = Booking.objects.filter(
            customer=self.user,
            status__in=['confirmed', 'completed']
        )
        
        self.total_bookings = bookings.count()
        self.total_spent_cents = sum(b.total_price_cents for b in bookings)
        
        latest_booking = bookings.order_by('-created_at').first()
        if latest_booking:
            self.last_booking_at = latest_booking.created_at
        
        self.save()
```

```python
class SavedAddress(models.Model):
    """Customer's saved addresses for quick booking"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='saved_addresses'
    )
    
    # Address fields
    address_line_1 = models.CharField(max_length=255)
    address_line_2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=2, choices=[
        ('NY', 'New York'),
        ('CT', 'Connecticut'),
        ('NJ', 'New Jersey'),
        ('FL', 'Florida'),
    ])
    zip_code = models.CharField(max_length=10)
    
    # Metadata
    label = models.CharField(
        max_length=50,
        blank=True,
        help_text='User-friendly label like "Home" or "Office"'
    )
    is_primary = models.BooleanField(default=False)
    times_used = models.PositiveIntegerField(default=0, help_text='Usage counter')
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'customers_saved_address'
        ordering = ['-is_primary', '-times_used', '-created_at']
        indexes = [
            models.Index(fields=['customer', 'is_active']),
        ]
    
    def __str__(self):
        label_str = f" ({self.label})" if self.label else ""
        return f"{self.address_line_1}, {self.city}{label_str}"
    
    # Methods
    def save(self, *args, **kwargs):
        """Ensure only one primary address per customer"""
        if self.is_primary:
            SavedAddress.objects.filter(
                customer=self.customer,
                is_primary=True
            ).exclude(id=self.id).update(is_primary=False)
        super().save(*args, **kwargs)
    
    def increment_usage(self):
        """Increment times_used counter"""
        self.times_used += 1
        self.save()
```

```python
class CustomerPaymentMethod(models.Model):
    """Stored payment methods (Stripe) - placeholder for future"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='payment_methods'
    )
    stripe_payment_method_id = models.CharField(max_length=255, unique=True)
    card_brand = models.CharField(max_length=20, blank=True)
    card_last4 = models.CharField(max_length=4, blank=True)
    card_exp_month = models.PositiveSmallIntegerField(null=True, blank=True)
    card_exp_year = models.PositiveSmallIntegerField(null=True, blank=True)
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'customers_payment_method'
        ordering = ['-is_default', '-created_at']
    
    def __str__(self):
        return f"{self.card_brand} ending in {self.card_last4}"
```

### bookings.models

```python
class Address(models.Model):
    """Reusable address model for pickup and delivery"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    address_line_1 = models.CharField(max_length=255)
    address_line_2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=2, choices=[
        ('NY', 'New York'),
        ('CT', 'Connecticut'),
        ('NJ', 'New Jersey'),
        ('FL', 'Florida'),
    ])
    zip_code = models.CharField(max_length=10)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'bookings_address'
        verbose_name_plural = 'Addresses'
    
    def __str__(self):
        return f"{self.address_line_1}, {self.city}, {self.state} {self.zip_code}"
```

```python
class GuestCheckout(models.Model):
    """Guest information for bookings without authentication"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'bookings_guest_checkout'
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.email})"
```

```python
class Booking(models.Model):
    """Core booking model with pricing engine and status management"""
    
    SERVICE_TYPES = [
        ('mini_move', 'Mini Move'),
        ('standard_delivery', 'Standard Delivery'),
        ('specialty_item', 'Specialty Item'),
        ('blade_transfer', 'BLADE Transfer'),
    ]
    
    BOOKING_STATUS = [
        ('pending_payment', 'Pending Payment'),
        ('confirmed', 'Confirmed'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    PICKUP_TIME_CHOICES = [
        ('morning', 'Morning (8AM-12PM)'),
        ('morning_specific', 'Specific Morning Time'),
        ('no_time_preference', 'No Time Preference'),
    ]
    
    BLADE_AIRPORTS = [
        ('JFK', 'JFK International'),
        ('EWR', 'Newark Liberty'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking_number = models.CharField(max_length=12, unique=True, editable=False, db_index=True)
    
    # Customer relationship (null for guest bookings)
    customer = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bookings',
        help_text='Null for guest bookings'
    )
    guest_checkout = models.OneToOneField(
        GuestCheckout,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='booking'
    )
    
    # Service configuration
    service_type = models.CharField(max_length=30, choices=SERVICE_TYPES, db_index=True)
    mini_move_package = models.ForeignKey(
        'services.MiniMovePackage',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='bookings'
    )
    standard_delivery_item_count = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Number of standard items (bags, boxes)'
    )
    is_same_day_delivery = models.BooleanField(default=False)
    specialty_items = models.ManyToManyField(
        'services.SpecialtyItem',
        blank=True,
        related_name='bookings'
    )
    
    # NEW: Organizing services (Mini Move only)
    include_packing = models.BooleanField(
        default=False,
        help_text='Professional packing service'
    )
    include_unpacking = models.BooleanField(
        default=False,
        help_text='Professional unpacking service'
    )
    
    # NEW: BLADE transfer fields (Phase 3)
    blade_airport = models.CharField(
        max_length=3,
        choices=BLADE_AIRPORTS,
        null=True,
        blank=True
    )
    blade_flight_date = models.DateField(null=True, blank=True)
    blade_flight_time = models.TimeField(null=True, blank=True)
    blade_bag_count = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Number of bags for BLADE transfer'
    )
    blade_ready_time = models.TimeField(
        null=True,
        blank=True,
        help_text='Calculated ready time (flight time - 2 hours)'
    )
    
    # Schedule
    pickup_date = models.DateField(db_index=True)
    pickup_time = models.CharField(max_length=30, choices=PICKUP_TIME_CHOICES)
    specific_pickup_hour = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(8), MaxValueValidator(17)],
        help_text='Specific hour (8-17) for morning_specific'
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
    
    # Requirements
    special_instructions = models.TextField(blank=True)
    coi_required = models.BooleanField(
        default=False,
        help_text='Certificate of Insurance required'
    )
    is_outside_core_area = models.BooleanField(
        default=False,
        help_text='Triggers geographic surcharge'
    )
    
    # Pricing (calculated fields in cents)
    base_price_cents = models.PositiveBigIntegerField(default=0)
    surcharge_cents = models.PositiveBigIntegerField(default=0)
    coi_fee_cents = models.PositiveBigIntegerField(default=0)
    organizing_total_cents = models.PositiveBigIntegerField(default=0)
    organizing_tax_cents = models.PositiveBigIntegerField(default=0)
    geographic_surcharge_cents = models.PositiveBigIntegerField(default=0)
    time_window_surcharge_cents = models.PositiveBigIntegerField(default=0)
    total_price_cents = models.PositiveBigIntegerField(default=0)
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=BOOKING_STATUS,
        default='pending_payment',
        db_index=True
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'bookings_booking'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['customer', 'status']),
            models.Index(fields=['pickup_date', 'status']),
            models.Index(fields=['service_type', 'status']),
        ]
    
    def __str__(self):
        return f"Booking {self.booking_number} - {self.get_service_type_display()}"
    
    # Computed properties
    @property
    def base_price_dollars(self):
        return self.base_price_cents / 100
    
    @property
    def surcharge_dollars(self):
        return self.surcharge_cents / 100
    
    @property
    def coi_fee_dollars(self):
        return self.coi_fee_cents / 100
    
    @property
    def organizing_total_dollars(self):
        return self.organizing_total_cents / 100
    
    @property
    def organizing_tax_dollars(self):
        return self.organizing_tax_cents / 100
    
    @property
    def geographic_surcharge_dollars(self):
        return self.geographic_surcharge_cents / 100
    
    @property
    def time_window_surcharge_dollars(self):
        return self.time_window_surcharge_cents / 100
    
    @property
    def total_price_dollars(self):
        return self.total_price_cents / 100
    
    @property
    def customer_email(self):
        """Get email from customer or guest checkout"""
        if self.customer:
            return self.customer.email
        elif self.guest_checkout:
            return self.guest_checkout.email
        return None
    
    @property
    def customer_name(self):
        """Get name from customer or guest checkout"""
        if self.customer:
            return f"{self.customer.first_name} {self.customer.last_name}"
        elif self.guest_checkout:
            return f"{self.guest_checkout.first_name} {self.guest_checkout.last_name}"
        return "Unknown"
    
    # Lifecycle methods
    def save(self, *args, **kwargs):
        """Generate booking number and calculate pricing on save"""
        if not self.booking_number:
            self.booking_number = self.generate_booking_number()
        
        self.calculate_pricing()
        super().save(*args, **kwargs)
    
    def generate_booking_number(self):
        """Generate unique 12-character booking number: TT-YYYYMMDD-XXX"""
        from django.utils import timezone
        import random
        
        date_str = timezone.now().strftime('%Y%m%d')
        random_suffix = ''.join(random.choices('0123456789', k=3))
        booking_number = f"TT-{date_str}-{random_suffix}"
        
        # Ensure uniqueness
        while Booking.objects.filter(booking_number=booking_number).exists():
            random_suffix = ''.join(random.choices('0123456789', k=3))
            booking_number = f"TT-{date_str}-{random_suffix}"
        
        return booking_number
    
    # Pricing calculation methods
    def calculate_blade_ready_time(self):
        """Calculate BLADE ready time (flight time - 2 hours)"""
        if self.blade_flight_time:
            from datetime import datetime, timedelta
            flight_dt = datetime.combine(datetime.today(), self.blade_flight_time)
            ready_dt = flight_dt - timedelta(hours=2)
            self.blade_ready_time = ready_dt.time()
    
    def calculate_organizing_costs(self):
        """Calculate organizing service costs based on package tier"""
        from apps.services.models import OrganizingService
        
        if not self.mini_move_package:
            return 0
        
        total_cents = 0
        package_tier = self.mini_move_package.package_type
        
        if self.include_packing:
            packing_service = OrganizingService.objects.filter(
                mini_move_tier=package_tier,
                is_packing_service=True,
                is_active=True
            ).first()
            if packing_service:
                total_cents += packing_service.price_cents
        
        if self.include_unpacking:
            unpacking_service = OrganizingService.objects.filter(
                mini_move_tier=package_tier,
                is_packing_service=False,
                is_active=True
            ).first()
            if unpacking_service:
                total_cents += unpacking_service.price_cents
        
        return total_cents
    
    def calculate_geographic_surcharge(self):
        """Calculate geographic surcharge for outside core area"""
        if self.is_outside_core_area and self.service_type in ['mini_move', 'standard_delivery']:
            return 10000  # $100 in cents
        return 0
    
    def calculate_time_window_surcharge(self):
        """Calculate surcharge for specific time window (morning_specific)"""
        if self.pickup_time == 'morning_specific' and self.service_type == 'mini_move':
            if self.mini_move_package:
                if self.mini_move_package.package_type == 'petite':
                    return 7500  # $75
                elif self.mini_move_package.package_type == 'standard':
                    return 17500  # $175
                elif self.mini_move_package.package_type == 'full':
                    return 0
        return 0
    
    def calculate_coi_fee(self):
        """Calculate COI fee if required"""
        if self.coi_required and self.service_type == 'mini_move':
            if self.mini_move_package and not self.mini_move_package.coi_included:
                return self.mini_move_package.coi_fee_cents
        return 0
    
    def calculate_organizing_tax(self):
        """Calculate tax on organizing services - 8.25%"""
        if self.organizing_total_cents > 0:
            return int(self.organizing_total_cents * 0.0825)
        return 0
    
    def calculate_pricing(self):
        """Main pricing engine - calculates all price components"""
        from apps.services.models import StandardDeliveryConfig, SurchargeRule
        
        self.base_price_cents = 0
        self.surcharge_cents = 0
        self.coi_fee_cents = 0
        self.organizing_total_cents = 0
        self.geographic_surcharge_cents = 0
        self.time_window_surcharge_cents = 0
        self.organizing_tax_cents = 0
        
        # BLADE pricing (Phase 3)
        if self.service_type == 'blade_transfer':
            if self.blade_bag_count:
                per_bag_price = 7500  # $75 per bag
                self.base_price_cents = self.blade_bag_count * per_bag_price
                self.base_price_cents = max(self.base_price_cents, 15000)  # $150 min
            
            self.calculate_blade_ready_time()
            # BLADE has NO surcharges
        
        # Mini Move pricing
        elif self.service_type == 'mini_move' and self.mini_move_package:
            self.base_price_cents = self.mini_move_package.base_price_cents
            self.organizing_total_cents = self.calculate_organizing_costs()
            self.organizing_tax_cents = self.calculate_organizing_tax()
            self.coi_fee_cents = self.calculate_coi_fee()
            
            if self.pickup_date:
                active_surcharges = SurchargeRule.objects.filter(is_active=True)
                for surcharge in active_surcharges:
                    surcharge_amount = surcharge.calculate_surcharge(
                        self.base_price_cents, 
                        self.pickup_date,
                        self.service_type
                    )
                    self.surcharge_cents += surcharge_amount
            
            self.geographic_surcharge_cents = self.calculate_geographic_surcharge()
            self.time_window_surcharge_cents = self.calculate_time_window_surcharge()
        
        # Standard Delivery pricing
        elif self.service_type == 'standard_delivery':
            try:
                config = StandardDeliveryConfig.objects.filter(is_active=True).first()
                if config:
                    if self.standard_delivery_item_count and self.standard_delivery_item_count > 0:
                        item_total = config.price_per_item_cents * self.standard_delivery_item_count
                        self.base_price_cents = max(item_total, config.minimum_charge_cents)
                    else:
                        self.base_price_cents = 0
                    
                    if self.specialty_items.exists():
                        specialty_total = sum(item.price_cents for item in self.specialty_items.all())
                        self.base_price_cents += specialty_total
            except StandardDeliveryConfig.DoesNotExist:
                pass
            
            if self.pickup_date:
                active_surcharges = SurchargeRule.objects.filter(is_active=True)
                for surcharge in active_surcharges:
                    surcharge_amount = surcharge.calculate_surcharge(
                        self.base_price_cents, 
                        self.pickup_date,
                        self.service_type
                    )
                    self.surcharge_cents += surcharge_amount
            
            self.geographic_surcharge_cents = self.calculate_geographic_surcharge()
        
        # Specialty Item pricing
        elif self.service_type == 'specialty_item':
            specialty_total = sum(item.price_cents for item in self.specialty_items.all())
            self.base_price_cents = specialty_total
        
        # Calculate total
        self.total_price_cents = (
            self.base_price_cents + 
            self.surcharge_cents + 
            self.coi_fee_cents + 
            self.organizing_total_cents +
            self.organizing_tax_cents +
            self.geographic_surcharge_cents +
            self.time_window_surcharge_cents
        )
    
    def get_pricing_breakdown(self):
        """Return detailed pricing breakdown dict"""
        return {
            'base_price': self.base_price_dollars,
            'surcharges': self.surcharge_dollars,
            'coi_fee': self.coi_fee_dollars,
            'organizing_total': self.organizing_total_dollars,
            'organizing_tax': self.organizing_tax_dollars,
            'geographic_surcharge': self.geographic_surcharge_dollars,
            'time_window_surcharge': self.time_window_surcharge_dollars,
            'total': self.total_price_dollars
        }
    
    # Status transition methods
    def confirm_booking(self):
        """Transition to confirmed status after payment"""
        if self.status == 'pending_payment':
            self.status = 'confirmed'
            self.save()
            
            # Update customer stats if applicable
            if self.customer:
                self.customer.customer_profile.update_booking_stats()
    
    def start_delivery(self):
        """Transition to in_progress status"""
        if self.status == 'confirmed':
            self.status = 'in_progress'
            self.save()
    
    def complete_booking(self):
        """Transition to completed status"""
        if self.status == 'in_progress':
            self.status = 'completed'
            self.save()
            
            # Update customer stats
            if self.customer:
                self.customer.customer_profile.update_booking_stats()
    
    def cancel_booking(self):
        """Cancel booking"""
        if self.status not in ['completed', 'cancelled']:
            self.status = 'cancelled'
            self.save()
```

### services.models

```python
class MiniMovePackage(models.Model):
    """Mini Move service tiers with pricing"""
    
    PACKAGE_TYPES = [
        ('petite', 'Petite'),
        ('standard', 'Standard'),
        ('full', 'Full'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    package_type = models.CharField(max_length=20, choices=PACKAGE_TYPES, unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField()
    
    # Pricing
    base_price_cents = models.PositiveBigIntegerField()
    coi_included = models.BooleanField(default=False)
    coi_fee_cents = models.PositiveBigIntegerField(default=0)
    
    # Limits
    max_items = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Null for unlimited'
    )
    max_weight_per_item_lbs = models.PositiveIntegerField(default=50)
    
    # Features
    priority_scheduling = models.BooleanField(default=False)
    protective_wrapping = models.BooleanField(default=False)
    is_most_popular = models.BooleanField(default=False)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'services_mini_move_package'
        ordering = ['base_price_cents']
    
    def __str__(self):
        return f"{self.name} - ${self.base_price_dollars}"
    
    @property
    def base_price_dollars(self):
        return self.base_price_cents / 100
    
    @property
    def coi_fee_dollars(self):
        return self.coi_fee_cents / 100
```

```python
class OrganizingService(models.Model):
    """Professional packing/unpacking services tied to Mini Move tiers"""
    
    ORGANIZING_TYPES = [
        ('petite_packing', 'Petite Packing'),
        ('standard_packing', 'Standard Packing'),
        ('full_packing', 'Full Packing'),
        ('petite_unpacking', 'Petite Unpacking'),
        ('standard_unpacking', 'Standard Unpacking'),
        ('full_unpacking', 'Full Unpacking'),
    ]
    
    MINI_MOVE_TIERS = [
        ('petite', 'Petite'),
        ('standard', 'Standard'),
        ('full', 'Full'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    service_type = models.CharField(max_length=30, choices=ORGANIZING_TYPES, unique=True)
    mini_move_tier = models.CharField(max_length=20, choices=MINI_MOVE_TIERS)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    
    # Pricing
    price_cents = models.PositiveBigIntegerField()
    
    # Service specs
    duration_hours = models.PositiveIntegerField()
    organizer_count = models.PositiveIntegerField()
    supplies_allowance_cents = models.PositiveBigIntegerField(
        default=0,
        help_text='Supplies allowance in cents (packing services only)'
    )
    
    # Service type classification
    is_packing_service = models.BooleanField(
        help_text='True for packing (with supplies), False for unpacking (organizing only)'
    )
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'services_organizing_service'
        ordering = ['mini_move_tier', 'is_packing_service', 'price_cents']
    
    def __str__(self):
        return f"{self.name} - ${self.price_dollars}"
    
    @property
    def price_dollars(self):
        return self.price_cents / 100
    
    @property
    def supplies_allowance_dollars(self):
        return self.supplies_allowance_cents / 100
    
    def can_be_added_to_mini_move(self, mini_move_package_type):
        """Check if service can be added to specific mini move tier"""
        return self.mini_move_tier == mini_move_package_type
```

```python
class StandardDeliveryConfig(models.Model):
    """Configuration for Standard Delivery pricing"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    price_per_item_cents = models.PositiveBigIntegerField()
    minimum_items = models.PositiveIntegerField(default=1)
    minimum_charge_cents = models.PositiveBigIntegerField()
    same_day_flat_rate_cents = models.PositiveBigIntegerField()
    max_weight_per_item_lbs = models.PositiveIntegerField(default=50)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'services_standard_delivery_config'
    
    def __str__(self):
        return f"Standard Delivery: ${self.price_per_item_dollars}/item (min ${self.minimum_charge_dollars})"
    
    @property
    def price_per_item_dollars(self):
        return self.price_per_item_cents / 100
    
    @property
    def minimum_charge_dollars(self):
        return self.minimum_charge_cents / 100
    
    @property
    def same_day_flat_rate_dollars(self):
        return self.same_day_flat_rate_cents / 100
```

```python
class SpecialtyItem(models.Model):
    """Special items requiring dedicated handling"""
    
    ITEM_TYPES = [
        ('peloton', 'Peloton / Large Equipment'),
        ('surfboard', 'Surfboard'),
        ('crib', 'Crib'),
        ('wardrobe_box', 'Wardrobe Box'),
        ('bike', 'Bike'),
        ('golf_clubs', 'Golf Clubs'),
        ('skis', 'Skis'),
        ('stroller', 'Stroller'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    item_type = models.CharField(max_length=30, choices=ITEM_TYPES, unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    
    # Pricing
    price_cents = models.PositiveBigIntegerField()
    
    # Requirements
    special_handling = models.BooleanField(default=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'services_specialty_item'
    
    def __str__(self):
        return f"{self.name} - ${self.price_dollars}"
    
    @property
    def price_dollars(self):
        return self.price_cents / 100
```

```python
class SurchargeRule(models.Model):
    """Dynamic surcharge rules for weekends, holidays, peak dates"""
    
    SURCHARGE_TYPES = [
        ('weekend', 'Weekend Surcharge'),
        ('holiday', 'Holiday Surcharge'),
        ('peak_date', 'Peak Date Surcharge'),
    ]
    
    CALCULATION_TYPES = [
        ('percentage', 'Percentage'),
        ('fixed_amount', 'Fixed Amount'),
    ]
    
    SERVICE_TYPE_CHOICES = [
        ('all', 'All Services'),
        ('mini_move', 'Mini Moves Only'),
        ('standard_delivery', 'Standard Delivery Only'),
        ('specialty_item', 'Specialty Items Only'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    surcharge_type = models.CharField(max_length=20, choices=SURCHARGE_TYPES)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    
    # Service type filter
    applies_to_service_type = models.CharField(
        max_length=20,
        choices=SERVICE_TYPE_CHOICES,
        default='all'
    )
    
    # Calculation
    calculation_type = models.CharField(max_length=20, choices=CALCULATION_TYPES)
    percentage = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text='Percentage surcharge (e.g., 15.00 for 15%)'
    )
    fixed_amount_cents = models.PositiveBigIntegerField(null=True, blank=True)
    
    # Date rules
    specific_date = models.DateField(
        null=True,
        blank=True,
        help_text='Specific date for surcharge (e.g., Sept 1)'
    )
    applies_saturday = models.BooleanField(default=False)
    applies_sunday = models.BooleanField(default=False)
    applies_holidays = models.BooleanField(default=False)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'services_surcharge_rule'
    
    def __str__(self):
        return f"{self.name} - {self.get_calculation_type_display()}"
    
    # Calculation method
    def calculate_surcharge(self, base_price_cents, date, service_type):
        """Calculate surcharge amount for given date and service type"""
        # Check service type filter
        if self.applies_to_service_type not in ['all', service_type]:
            return 0
        
        # Check if rule applies to date
        applies = False
        
        if self.specific_date and self.specific_date == date:
            applies = True
        elif self.applies_saturday and date.weekday() == 5:
            applies = True
        elif self.applies_sunday and date.weekday() == 6:
            applies = True
        
        if not applies:
            return 0
        
        # Calculate amount
        if self.calculation_type == 'percentage':
            return int(base_price_cents * (self.percentage / 100))
        elif self.calculation_type == 'fixed_amount':
            return self.fixed_amount_cents
        
        return 0
```

### payments.models

```python
class Payment(models.Model):
    """Payment records linked to Stripe"""
    
    PAYMENT_STATUS = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('succeeded', 'Succeeded'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.ForeignKey(
        'bookings.Booking',
        on_delete=models.PROTECT,
        related_name='payments'
    )
    
    # Stripe references
    stripe_payment_intent_id = models.CharField(max_length=255, unique=True, db_index=True)
    stripe_charge_id = models.CharField(max_length=255, blank=True)
    
    # Amount
    amount_cents = models.PositiveBigIntegerField()
    
    # Status
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default='pending')
    
    # Metadata
    payment_method_type = models.CharField(max_length=50, blank=True)
    customer_email = models.EmailField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'payments_payment'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Payment {self.stripe_payment_intent_id} - ${self.amount_dollars}"
    
    @property
    def amount_dollars(self):
        return self.amount_cents / 100
    
    # Status transition methods
    def mark_succeeded(self):
        """Mark payment as succeeded and confirm booking"""
        if self.status == 'processing':
            self.status = 'succeeded'
            self.save()
            self.booking.confirm_booking()
    
    def mark_failed(self):
        """Mark payment as failed"""
        self.status = 'failed'
        self.save()
```

```python
class Refund(models.Model):
    """Refund records for cancelled bookings"""
    
    REFUND_STATUS = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('succeeded', 'Succeeded'),
        ('failed', 'Failed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    payment = models.ForeignKey(
        Payment,
        on_delete=models.PROTECT,
        related_name='refunds'
    )
    
    # Stripe reference
    stripe_refund_id = models.CharField(max_length=255, unique=True)
    
    # Amount
    amount_cents = models.PositiveBigIntegerField()
    reason = models.TextField(blank=True)
    
    # Status
    status = models.CharField(max_length=20, choices=REFUND_STATUS, default='pending')
    
    # Staff who processed
    processed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='processed_refunds'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'payments_refund'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Refund {self.stripe_refund_id} - ${self.amount_dollars}"
    
    @property
    def amount_dollars(self):
        return self.amount_cents / 100
```

### logistics.models

```python
class OnfleetTask(models.Model):
    """Onfleet task tracking for bookings"""
    
    ONFLEET_STATUS = [
        ('created', 'Created'),
        ('assigned', 'Assigned'),
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.OneToOneField(
        'bookings.Booking',
        on_delete=models.CASCADE,
        related_name='onfleet_task'
    )
    
    # Onfleet references
    onfleet_task_id = models.CharField(max_length=255, unique=True, db_index=True)
    onfleet_short_id = models.CharField(max_length=50, blank=True)
    tracking_url = models.URLField(blank=True)
    
    # Status
    status = models.CharField(max_length=20, choices=ONFLEET_STATUS, default='created')
    
    # Driver assignment (when assigned)
    driver_name = models.CharField(max_length=255, blank=True)
    driver_phone = models.CharField(max_length=20, blank=True)
    
    # Timestamps
    assigned_at = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'logistics_onfleet_task'
    
    def __str__(self):
        return f"Onfleet Task {self.onfleet_short_id} for {self.booking.booking_number}"
    
    # Status sync method
    def sync_status_from_onfleet(self, onfleet_state):
        """Sync status from Onfleet webhook data"""
        status_mapping = {
            0: 'created',
            1: 'assigned',
            2: 'active',
            3: 'completed',
            -1: 'failed',
        }
        
        new_status = status_mapping.get(onfleet_state, self.status)
        
        if new_status != self.status:
            self.status = new_status
            
            # Update booking status accordingly
            if new_status == 'active':
                self.booking.start_delivery()
            elif new_status == 'completed':
                self.booking.complete_booking()
            
            self.save()
```

---

## SECTION 4: File Directory + Purpose Index

### Root Configuration Files
```
backend/
├── manage.py - Django management CLI entry point
├── requirements.txt - Python dependencies (Django 5.2.5, DRF, Celery, Stripe, etc.)
├── Dockerfile - Production Docker image definition
├── docker-compose.yml - Local development environment
├── docker-compose.prod.yml - Production deployment configuration
├── gunicorn.conf.py - Gunicorn WSGI server configuration
├── pytest.ini - Pytest testing configuration
├── .dockerignore - Docker build exclusions
├── .gitignore - Git version control exclusions
└── fly.toml - Fly.io deployment configuration
```

### Django Project (config/)
```
config/
├── __init__.py - Package initializer
├── settings.py - Core Django settings (database, middleware, apps, integrations)
├── urls.py - Root URL routing (includes all app URLs)
├── celery.py - Celery configuration and task discovery
├── wsgi.py - WSGI application entry point
└── asgi.py - ASGI application entry point (async support)
```

### Staff Management App (apps/accounts/)
```
apps/accounts/
├── __init__.py - Package initializer
├── models.py - StaffProfile, StaffAction (audit logging)
├── serializers.py - StaffLoginSerializer, StaffProfileSerializer, StaffUserSerializer, StaffActionSerializer
├── views.py - Staff auth, dashboard, booking management, customer management
├── urls.py - Staff API routing (/api/staff/*)
├── admin.py - Django admin customization for staff models
├── apps.py - App configuration
├── tests.py - Test suite for staff functionality
└── migrations/
    ├── __init__.py
    ├── 0001_initial.py - Initial staff models
    └── 0002_alter_staffaction_action_type.py - Updated action type choices
```

### Booking System App (apps/bookings/)
```
apps/bookings/
├── __init__.py - Package initializer
├── models.py - Booking, Address, GuestCheckout (core booking models with pricing engine)
├── serializers.py - BookingSerializer, GuestBookingCreateSerializer, PricingPreviewSerializer, AddressSerializer
├── views.py - Service catalog, pricing preview, guest booking, booking status lookup, organizing services
├── urls.py - Public booking API routing (/api/bookings/*)
├── admin.py - Django admin for booking management
├── apps.py - App configuration
├── tests.py - Test suite for booking functionality
└── migrations/
    ├── __init__.py
    ├── 0001_initial.py - Initial booking models
    ├── 0002_booking_include_packing_booking_include_unpacking_and_more.py - Added organizing services
    └── 0003_booking_geographic_surcharge_cents_and_more.py - Added surcharge fields
```

### Customer Management App (apps/customers/)
```
apps/customers/
├── __init__.py - Package initializer
├── models.py - CustomerProfile, SavedAddress, CustomerPaymentMethod
├── serializers.py - CustomerRegistrationSerializer, CustomerProfileSerializer, SavedAddressSerializer
├── views.py - Customer auth, profile management, dashboard, preferences
├── booking_views.py - Customer booking creation, detail view, quick rebook
├── urls.py - Customer API routing (/api/customers/*)
├── admin.py - Django admin with inline customer profile
├── apps.py - App configuration
├── tests.py - Test suite for customer functionality
├── management/
│   └── commands/
│       ├── __init__.py
│       └── clean_delete_user.py - Custom management command for user cleanup
└── migrations/
    ├── __init__.py
    ├── 0001_initial.py - Initial customer models
    └── 0002_alter_customerprofile_preferred_pickup_time.py - Updated pickup time choices
```

### Service Catalog & Pricing App (apps/services/)
```
apps/services/
├── __init__.py - Package initializer
├── models.py - MiniMovePackage, OrganizingService, StandardDeliveryConfig, SpecialtyItem, SurchargeRule
├── serializers.py - ServiceCatalogSerializer, MiniMovePackageSerializer, OrganizingServiceSerializer, StandardDeliveryConfigSerializer, SpecialtyItemSerializer
├── views.py - Empty (services accessed via bookings app)
├── admin.py - Django admin for service configuration
├── apps.py - App configuration
├── tests.py - Test suite for service models
├── management/
│   └── commands/
│       └── __init__.py - Management command package
└── migrations/
    ├── __init__.py
    ├── 0001_initial.py - Initial service models
    ├── 0002_organizingservice.py - Added OrganizingService model
    ├── 0003_populate_organizing_services.py - Data migration for organizing services
    ├── 0004_surchargerule_applies_to_service_type.py - Added service type filter to surcharges
    └── 0005_remove_van_schedule.py - Removed deprecated VanSchedule model
```

### Payment Processing App (apps/payments/)
```
apps/payments/
├── __init__.py - Package initializer
├── models.py - Payment, Refund
├── serializers.py - PaymentSerializer, RefundSerializer
├── services.py - StripePaymentService (Stripe integration logic, MOCKED)
├── views.py - Payment intent creation, payment confirmation, Stripe webhooks
├── urls.py - Payment API routing (/api/payments/*)
├── admin.py - Django admin for payment/refund management
├── apps.py - App configuration
├── tests.py - Test suite for payment functionality
└── migrations/
    ├── __init__.py
    └── 0001_initial.py - Initial payment models
```

### Logistics & Delivery App (apps/logistics/)
```
apps/logistics/
├── __init__.py - Package initializer
├── models.py - OnfleetTask
├── services.py - OnfleetService, ToteTaxiOnfleetIntegration (MOCKED)
├── views.py - Logistics dashboard, task management
├── urls.py - Logistics API routing
├── admin.py - Django admin for Onfleet task management
├── apps.py - App configuration
├── tests.py - Test suite for logistics functionality
└── migrations/
    ├── __init__.py
    └── 0001_initial.py - Initial logistics models
```

### Notifications App (apps/notifications/)
```
apps/notifications/
├── __init__.py - Package initializer
├── models.py - Empty (placeholder for future notification models)
├── views.py - Empty (placeholder)
├── admin.py - Empty (placeholder)
├── apps.py - App configuration
├── tests.py - Empty (placeholder)
└── migrations/
    └── __init__.py
```

### Documents App (apps/documents/)
```
apps/documents/
├── __init__.py - Package initializer
├── models.py - Empty (placeholder for COI, invoices, receipts)
├── views.py - Empty (placeholder)
├── admin.py - Empty (placeholder)
├── apps.py - App configuration
├── tests.py - Empty (placeholder)
└── migrations/
    └── __init__.py
```

### CRM App (apps/crm/)
```
apps/crm/
├── __init__.py - Package initializer
├── models.py - Empty (placeholder for leads, campaigns, analytics)
├── views.py - Empty (placeholder)
├── admin.py - Empty (placeholder)
├── apps.py - App configuration
├── tests.py - Empty (placeholder)
└── migrations/
    └── __init__.py
```

### Scripts (backend/scripts/)
```
scripts/
├── back_export.py - Script to generate backend code snapshot (back_export.txt)
├── back_export.txt - Complete backend code snapshot (source of truth)
└── entrypoint.sh - Docker container startup script
```

---

## SECTION 5: Feature-to-File Dependency Maps

### Guest Booking Flow (No Authentication)

**Feature**: Guest completes booking wizard, pays, receives confirmation

**Entry Point**: `POST /api/bookings/guest-booking/`

**Execution Chain**:
1. `apps/bookings/views.py` → `GuestBookingCreateView.post()` - Handles request
2. `apps/bookings/serializers.py` → `GuestBookingCreateSerializer.validate()` - Validates input
3. `apps/bookings/models.py` → `Booking.save()` - Calculates pricing, generates booking number
4. `apps/services/models.py` → `SurchargeRule.calculate_surcharge()` - Applies surcharges
5. `apps/bookings/models.py` → `GuestCheckout.objects.create()` - Creates guest info
6. `apps/payments/services.py` → `StripePaymentService.create_payment_intent()` - Creates Stripe intent
7. `apps/payments/models.py` → `Payment.objects.create()` - Records payment
8. Frontend completes Stripe Elements flow
9. `POST /api/payments/confirm/` → `StripePaymentService.confirm_payment()`
10. `apps/bookings/models.py` → `Booking.confirm_booking()` - Updates status to confirmed
11. `apps/logistics/services.py` → `ToteTaxiOnfleetIntegration.create_delivery_task()` - Creates Onfleet task
12. Email notification sent (to be implemented)

**Dependencies**: 
- `Booking`, `Address`, `GuestCheckout` models
- `MiniMovePackage`, `SpecialtyItem`, `SurchargeRule` models
- `Payment` model
- `OnfleetTask` model
- Stripe API (mocked)
- Onfleet API (mocked)

**Side Effects**: 
- Booking created with `status='pending_payment'`
- Payment intent created in Stripe
- Payment record created
- After confirmation: status → `confirmed`, Onfleet task created

**Files to Request**: 
- `apps/bookings/views.py` (GuestBookingCreateView)
- `apps/bookings/serializers.py` (GuestBookingCreateSerializer)
- `apps/bookings/models.py` (Booking, pricing methods)
- `apps/payments/services.py` (StripePaymentService)
- `apps/logistics/services.py` (ToteTaxiOnfleetIntegration)

---

### Customer Registration & Login

**Feature**: Customer creates account, logs in, accesses dashboard

**Entry Point**: `POST /api/customers/auth/register/`

**Execution Chain**:
1. `apps/customers/views.py` → `CustomerRegistrationView.post()` - Handles registration
2. `apps/customers/serializers.py` → `CustomerRegistrationSerializer.validate()` - Validates input
3. Django `User.objects.create_user()` - Creates user with hashed password
4. `apps/customers/models.py` → `CustomerProfile.objects.create()` - Creates profile (via signal or explicit creation)
5. Django `login()` - Creates session
6. Returns CSRF token + user data

**Login Flow**:
1. `POST /api/customers/auth/login/` → `CustomerLoginView.post()`
2. `apps/customers/serializers.py` → `CustomerLoginSerializer.validate()`
3. Django `authenticate()` - Verifies credentials
4. Django `login()` - Creates session
5. Returns CSRF token + user data

**Dashboard Access**:
1. `GET /api/customers/dashboard/` → `CustomerDashboardView.get()`
2. Queries bookings, addresses, payment methods for stats
3. `apps/customers/models.py` → `CustomerProfile` - Gets customer stats
4. Returns aggregated dashboard data

**Dependencies**: 
- Django `User` model
- `CustomerProfile`, `SavedAddress` models
- `Booking` model for stats
- Django session middleware
- CSRF middleware

**Files to Request**: 
- `apps/customers/views.py` (auth and dashboard views)
- `apps/customers/serializers.py` (registration, login serializers)
- `apps/customers/models.py` (CustomerProfile)

---

### Pricing Engine & Surcharge System

**Feature**: Calculate booking price with all surcharges and add-ons

**Entry Point**: `POST /api/bookings/pricing-preview/` or `Booking.save()`

**Execution Chain**:
1. `apps/bookings/views.py` → `PricingPreviewView.post()` - Public pricing endpoint
2. `apps/bookings/serializers.py` → `PricingPreviewSerializer.validate()` - Validates inputs
3. Core pricing calculation logic (also used in `Booking.save()`):
   - `apps/bookings/models.py` → `Booking.calculate_pricing()` - Main pricing engine
   - Determines service type (mini_move, standard_delivery, specialty_item, blade_transfer)
   - For Mini Moves:
     - Gets base price from `MiniMovePackage.base_price_cents`
     - Calls `Booking.calculate_organizing_costs()` - Queries `OrganizingService` table
     - Calls `Booking.calculate_organizing_tax()` - Applies 8.25% tax
     - Calls `Booking.calculate_coi_fee()` - Adds COI if required and not included
     - Calls `Booking.calculate_geographic_surcharge()` - Adds $100 if outside core area
     - Calls `Booking.calculate_time_window_surcharge()` - Adds fee for specific time
     - Queries `SurchargeRule.objects.filter(is_active=True)`
     - For each rule: calls `SurchargeRule.calculate_surcharge(base_price, date, service_type)`
   - For Standard Delivery:
     - Gets `StandardDeliveryConfig.price_per_item_cents`
     - Multiplies by item count, enforces minimum
     - Adds specialty item prices
     - Applies surcharges and geographic surcharge
   - For Specialty Items:
     - Sums `SpecialtyItem.price_cents` for selected items
   - For BLADE:
     - $75 per bag, $150 minimum
     - NO surcharges (weekend, geographic, time window)
4. Returns pricing breakdown

**Business Logic Locations**:
- **Main Engine**: `apps/bookings/models.py` → `Booking.calculate_pricing()`
- **Organizing Costs**: `apps/bookings/models.py` → `Booking.calculate_organizing_costs()`
- **Surcharge Calculation**: `apps/services/models.py` → `SurchargeRule.calculate_surcharge()`
- **Geographic Surcharge**: `apps/bookings/models.py` → `Booking.calculate_geographic_surcharge()`
- **Time Window Surcharge**: `apps/bookings/models.py` → `Booking.calculate_time_window_surcharge()`
- **Tax Calculation**: `apps/bookings/models.py` → `Booking.calculate_organizing_tax()`

**Dependencies**: 
- All service models (`MiniMovePackage`, `OrganizingService`, `StandardDeliveryConfig`, `SpecialtyItem`, `SurchargeRule`)
- Python `datetime` for date-based surcharge logic

**Files to Request**: 
- `apps/bookings/models.py` (Booking with all pricing methods)
- `apps/services/models.py` (all service models with pricing)
- `apps/bookings/views.py` (PricingPreviewView)

---

### Staff Dashboard & Analytics

**Feature**: Staff views real-time metrics, recent bookings, customer stats

**Entry Point**: `GET /api/staff/dashboard/`

**Execution Chain**:
1. `apps/accounts/views.py` → `StaffDashboardView.get()` - Handles request
2. Permission check: `IsStaffUser` - Verifies `request.user.is_staff` and has `staff_profile`
3. Query today's bookings: `Booking.objects.filter(created_at__date=today)`
4. Calculate today's revenue: `sum(booking.total_price_cents for booking in today_bookings)`
5. Get pending bookings count: `Booking.objects.filter(status='confirmed').count()`
6. Query recent bookings: `Booking.objects.order_by('-created_at')[:10]`
7. Get booking trends: aggregate bookings by date for last 7 and 30 days
8. Query top customers: `CustomerProfile.objects.order_by('-total_spent_cents')[:5]`
9. Get pending refunds: `Refund.objects.filter(status='pending')`
10. Return aggregated dashboard data

**Dependencies**: 
- `Booking` model for metrics
- `CustomerProfile` model for top customers
- `Payment`, `Refund` models for financial data
- Django ORM aggregation functions

**Files to Request**: 
- `apps/accounts/views.py` (StaffDashboardView)
- `apps/bookings/models.py` (for booking queries)
- `apps/customers/models.py` (for customer stats)

---

### Staff Booking Management

**Feature**: Staff searches/filters bookings, views details, updates status

**Entry Point**: `GET /api/staff/bookings/` and `PATCH /api/staff/bookings/<id>/`

**Execution Chain (List)**:
1. `GET /api/staff/bookings/` → `BookingManagementView.get()`
2. Permission check: `IsStaffUser`
3. Parse query params: `status`, `search`, `ordering`, `service_type`
4. Build query: `Booking.objects.filter(...)` with Q objects for search
5. Search across: booking_number, customer__email, guest_checkout__email
6. Order by specified field (default: `-created_at`)
7. Serialize and return bookings

**Execution Chain (Update)**:
1. `PATCH /api/staff/bookings/<id>/` → `BookingDetailView.patch()`
2. Permission check: `IsStaffUser`
3. Validate update data via serializer
4. Update booking fields (status, pickup_date, addresses, etc.)
5. Create `StaffAction` audit log entry
6. Save booking (triggers pricing recalculation if relevant fields changed)
7. Return updated booking data

**Audit Logging**:
- Location: `apps/accounts/models.py` → `StaffAction.objects.create()`
- Triggered after: booking updates, customer note updates, refund processing
- Captures: staff user, action type, target model/ID, description, metadata, IP address

**Dependencies**: 
- `Booking` model
- `StaffAction` model for audit trail
- Q objects for complex filtering

**Files to Request**: 
- `apps/accounts/views.py` (BookingManagementView, BookingDetailView)
- `apps/accounts/models.py` (StaffAction)
- `apps/bookings/models.py` (Booking)
- `apps/bookings/serializers.py` (BookingSerializer)

---

### Payment Processing (Stripe Integration)

**Feature**: Create payment intent, confirm payment, handle webhooks

**Entry Point**: `POST /api/payments/create-intent/` → `POST /api/payments/confirm/` → `POST /api/payments/webhook/`

**Execution Chain (Create Intent)**:
1. `apps/payments/views.py` → `CreatePaymentIntentView.post()`
2. `apps/payments/services.py` → `StripePaymentService.create_payment_intent()`
3. **MOCKED**: Returns fake `client_secret` and `payment_intent_id` (no real Stripe call)
4. Creates `Payment` record with `status='pending'`
5. Returns `{client_secret, publishable_key, payment_intent_id}` to frontend

**Execution Chain (Confirm Payment)**:
1. Frontend completes Stripe Elements flow
2. `POST /api/payments/confirm/` → `ConfirmPaymentView.post()`
3. `apps/payments/services.py` → `StripePaymentService.confirm_payment(payment_intent_id)`
4. **MOCKED**: Simulates successful confirmation (no real Stripe API call)
5. Updates `Payment.status = 'succeeded'`
6. Calls `Payment.booking.confirm_booking()` - Updates booking status to `confirmed`
7. Updates `CustomerProfile` stats if authenticated customer
8. Triggers Onfleet task creation via `ToteTaxiOnfleetIntegration`

**Execution Chain (Webhook)**:
1. Stripe sends webhook (in production)
2. `POST /api/payments/webhook/` → `StripeWebhookView.post()`
3. **MOCKED**: Validates signature (simulated), processes event
4. `StripePaymentService.handle_webhook_event(event_data)`
5. Handles events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
6. Updates `Payment` status accordingly
7. Updates `Booking` status if payment succeeded/failed

**Mock Implementation Details**:
- Location: `apps/payments/services.py` → `StripePaymentService` class
- All Stripe API calls return hardcoded mock data
- Comments indicate: `# MOCK: In production, call stripe.PaymentIntent.create()`
- Mock responses match real Stripe API structure for easy production swap

**Dependencies**: 
- `Payment`, `Refund` models
- `Booking` model (for status updates)
- `CustomerProfile` model (for stats updates)
- Stripe library (installed but mocked in code)

**Files to Request**: 
- `apps/payments/services.py` (StripePaymentService - complete mock implementation)
- `apps/payments/views.py` (payment intent, confirm, webhook views)
- `apps/payments/models.py` (Payment, Refund)

---

### Onfleet Logistics Integration

**Feature**: Create Onfleet task when booking confirmed, sync status via webhooks

**Entry Point**: Called from `Booking.confirm_booking()` → Onfleet webhook updates

**Execution Chain (Task Creation)**:
1. `apps/payments/services.py` → `StripePaymentService.confirm_payment()` calls:
2. `apps/logistics/services.py` → `ToteTaxiOnfleetIntegration.create_delivery_task(booking)`
3. `apps/logistics/services.py` → `OnfleetService.create_task_from_booking(booking)`
4. **MOCKED**: Generates fake Onfleet task data (no real API call)
5. Creates `OnfleetTask` record with `onfleet_task_id`, `tracking_url`, `status='created'`
6. Returns `OnfleetTask` object

**Execution Chain (Webhook Sync)**:
1. Onfleet sends webhook when task status changes (in production)
2. `apps/logistics/services.py` → `ToteTaxiOnfleetIntegration.handle_webhook(webhook_data)`
3. Extracts `task_id` and `state` from webhook payload
4. Finds `OnfleetTask` by `onfleet_task_id`
5. `apps/logistics/models.py` → `OnfleetTask.sync_status_from_onfleet(state)`
6. Maps Onfleet state codes to internal statuses:
   - `0` → `created`
   - `1` → `assigned`
   - `2` → `active` (triggers `Booking.start_delivery()`)
   - `3` → `completed` (triggers `Booking.complete_booking()`)
   - `-1` → `failed`
7. Updates `Booking` status based on Onfleet task status

**Mock Implementation Details**:
- Location: `apps/logistics/services.py` → `OnfleetService` class
- All Onfleet API calls return hardcoded mock data
- Mock task IDs follow pattern: `mock_onfleet_task_<uuid>`
- Mock tracking URLs: `https://onfleet.com/track/mock_<short_id>`

**Dependencies**: 
- `OnfleetTask` model
- `Booking` model (for status updates)
- Onfleet library (not installed, fully mocked)

**Files to Request**: 
- `apps/logistics/services.py` (OnfleetService, ToteTaxiOnfleetIntegration - complete mock)
- `apps/logistics/models.py` (OnfleetTask)
- `apps/bookings/models.py` (Booking status transition methods)

---

## SECTION 6: Business Logic Location Index

### Revenue & Financial Calculations

**Total Booking Revenue**:
- Location: `apps/bookings/models.py` → `Booking.total_price_cents` (property)
- Calculation: Sum of base_price + surcharges + fees + taxes
- Used By: Dashboard analytics, reports, customer stats

**Customer Lifetime Value**:
- Location: `apps/customers/models.py` → `CustomerProfile.total_spent_cents`
- Calculation: `CustomerProfile.update_booking_stats()` - Sums confirmed/completed booking totals
- Triggered By: `Booking.confirm_booking()`, `Booking.complete_booking()`
- Used By: VIP status determination, customer ranking, staff dashboard

**Daily Revenue**:
- Location: `apps/accounts/views.py` → `StaffDashboardView.get()` (inline query)
- Calculation: `sum(b.total_price_cents for b in today_bookings)`
- Used By: Staff dashboard today stats

**Pricing Breakdown**:
- Location: `apps/bookings/models.py` → `Booking.get_pricing_breakdown()`
- Returns: Dict with all price components in dollars
- Used By: Booking detail views, invoices, receipts

---

### Pricing & Surcharge Logic

**Main Pricing Engine**:
- Location: `apps/bookings/models.py` → `Booking.calculate_pricing()`
- Called: Automatically on `Booking.save()`
- Logic: Service-type routing, base price lookup, surcharge application, tax calculation
- Affects: All price fields on Booking model

**Organizing Service Pricing**:
- Location: `apps/bookings/models.py` → `Booking.calculate_organizing_costs()`
- Logic: Queries `OrganizingService` by mini_move_tier and packing/unpacking flags
- Returns: Total cents for organizing services
- Tax: Calculated separately via `calculate_organizing_tax()` at 8.25%

**Surcharge Application**:
- Location: `apps/services/models.py` → `SurchargeRule.calculate_surcharge(base_price, date, service_type)`
- Logic: Checks service type filter, evaluates date rules (weekend, holiday, specific), applies percentage or fixed amount
- Used By: `Booking.calculate_pricing()` for each active surcharge rule

**Geographic Surcharge**:
- Location: `apps/bookings/models.py` → `Booking.calculate_geographic_surcharge()`
- Logic: $100 if `is_outside_core_area=True` for mini_move or standard_delivery
- Trigger: Set by user during booking or calculated from zip codes

**Time Window Surcharge**:
- Location: `apps/bookings/models.py` → `Booking.calculate_time_window_surcharge()`
- Logic: Applies fee for `pickup_time='morning_specific'` based on package tier
  - Petite: $75
  - Standard: $175
  - Full: $0 (included)

**BLADE Pricing**:
- Location: `apps/bookings/models.py` → `Booking.calculate_pricing()` (blade_transfer branch)
- Logic: $75 per bag, $150 minimum, NO surcharges
- Special: Calculates `blade_ready_time` as flight time - 2 hours

**Standard Delivery Minimum**:
- Location: `apps/services/models.py` → `StandardDeliveryConfig.minimum_charge_cents`
- Applied In: `Booking.calculate_pricing()` via `max(item_total, minimum_charge)`

---

### Booking Lifecycle & State Transitions

**Status Flow**:
```
pending_payment → confirmed → in_progress → completed
                      ↓
                  cancelled
```

**Status Transitions**:
- **confirm_booking()**: `apps/bookings/models.py` → Changes `pending_payment` to `confirmed`
  - Triggered by: Successful payment confirmation
  - Side Effects: Updates customer stats, triggers Onfleet task creation
  
- **start_delivery()**: `apps/bookings/models.py` → Changes `confirmed` to `in_progress`
  - Triggered by: Onfleet task status becomes `active`
  
- **complete_booking()**: `apps/bookings/models.py` → Changes `in_progress` to `completed`
  - Triggered by: Onfleet task status becomes `completed`
  - Side Effects: Updates customer stats
  
- **cancel_booking()**: `apps/bookings/models.py` → Changes any non-terminal status to `cancelled`
  - Triggered by: Staff action, customer request (future), payment failure

**Booking Number Generation**:
- Location: `apps/bookings/models.py` → `Booking.generate_booking_number()`
- Format: `TT-YYYYMMDD-XXX` (TT prefix, date, 3-digit random suffix)
- Ensures uniqueness via while loop check

---

### Authentication & Authorization

**Customer Authentication**:
- Login: `apps/customers/views.py` → `CustomerLoginView.post()`
- Logic: Django `authenticate()` + `login()` → Creates session
- Token: CSRF token returned on login
- Session: Stored in database (default Django session)

**Staff Authentication**:
- Login: `apps/accounts/views.py` → `StaffLoginView.post()`
- Logic: Django `authenticate()` + check `is_staff=True` + has `staff_profile`
- Rate Limited: 5/min per IP, 10/min per user-agent

**Permission System**:
- **IsAuthenticated**: Standard DRF permission for customer endpoints
- **IsStaffUser**: Custom permission in `apps/accounts/` - checks `is_staff` and `staff_profile` exists
- **Ownership**: Views check `booking.customer == request.user` for customer booking access

**Rate Limiting**:
- Implementation: `django-ratelimit` decorators on views
- Examples:
  - Login endpoints: `@ratelimit(key='ip', rate='5/m')`
  - Staff actions: `@ratelimit(key='user', rate='15/m')`
  - Customer operations: `@ratelimit(key='user', rate='20/m')`

---

### Customer Stats & VIP Logic

**Stats Update Logic**:
- Location: `apps/customers/models.py` → `CustomerProfile.update_booking_stats()`
- Calculates: `total_bookings`, `total_spent_cents`, `last_booking_at`
- Filters: Only `confirmed` and `completed` bookings
- Triggered By: `Booking.confirm_booking()`, `Booking.complete_booking()`

**VIP Determination**:
- Field: `CustomerProfile.is_vip` (Boolean)
- Logic: Manual flag set by staff (no automatic criteria currently)
- Future: Could be automated based on `total_spent_cents` threshold

**Popular Addresses**:
- Location: Queried in `apps/customers/views.py` → `CustomerDashboardView`
- Logic: `SavedAddress.objects.order_by('-times_used')`
- Usage Counter: Incremented via `SavedAddress.increment_usage()` when used in booking

---

### Audit Trail & Logging

**Staff Action Logging**:
- Location: `apps/accounts/models.py` → `StaffAction`
- Created: After booking updates, customer note updates, refund processing
- Captured: Staff user, action type, target model/ID, description, metadata (dict), IP address, timestamp
- Querying: Indexed on `[staff, created_at]` and `[target_model, target_id]`

**Action Types**:
- `booking_created`, `booking_updated`, `booking_cancelled`
- `customer_viewed`, `customer_updated`, `customer_notes_updated`
- `refund_processed`, `payment_adjusted`

**Usage Pattern**:
```python
StaffAction.objects.create(
    staff=request.user,
    action_type='booking_updated',
    target_model='Booking',
    target_id=str(booking.id),
    description=f"Updated booking {booking.booking_number}",
    metadata={'changes': {...}},
    ip_address=request.META.get('REMOTE_ADDR')
)
```

---

### Validation & Constraints

**Booking Validation**:
- Location: `apps/bookings/serializers.py` → `GuestBookingCreateSerializer.validate()`
- Rules:
  - Organizing services only for mini_move bookings
  - BLADE bookings must have airport, flight date/time, bag count
  - Pickup date cannot be in past
  - Standard delivery requires either item_count > 0 or specialty_items
  - Service-specific required fields enforcement

**Address Validation**:
- Location: Model field constraints on `Address`, `SavedAddress`
- State choices: NY, CT, NJ, FL only
- Zip code format: Max 10 chars (handles 5-digit and ZIP+4)

**Primary Address Enforcement**:
- Location: `apps/customers/models.py` → `SavedAddress.save()`
- Logic: When `is_primary=True`, unsets primary flag on all other addresses for customer

**Payment Amount Validation**:
- Location: `apps/payments/services.py` → `StripePaymentService.create_payment_intent()`
- Rule: Amount must match `booking.total_price_cents`

---

## SECTION 7: Integration & Tech Stack Summary

### Database & Caching

**PostgreSQL**:
- Version: 14+ (production), 13+ compatible
- Primary database for all models
- Connection: Via `DATABASE_URL` environment variable
- Migrations: Django ORM migrations in each app's `migrations/` folder

**Redis**:
- Usage: Celery message broker, Django session storage
- Connection: Via `REDIS_URL` environment variable
- Session backend: `django.contrib.sessions.backends.cache`
- Cache TTL: Configurable per cache operation (default: 300 seconds)

### Task Queue & Background Jobs

**Celery**:
- Version: 5.x
- Broker: Redis
- Configuration: `config/celery.py`
- Task Discovery: Automatic from `tasks.py` in each app
- Current Tasks: Email sending (future), webhook processing (future)
- Beat Scheduler: Not currently used (no scheduled tasks yet)

### File Storage

**Development**:
- Local file storage: `MEDIA_ROOT = os.path.join(BASE_DIR, 'media')`
- Media URL: `/media/`

**Production**:
- AWS S3 via `django-storages`
- Configuration in `settings.py`:
  - `AWS_ACCESS_KEY_ID` (env variable)
  - `AWS_SECRET_ACCESS_KEY` (env variable)
  - `AWS_STORAGE_BUCKET_NAME` (env variable)
  - `AWS_S3_REGION_NAME` (env variable, default: us-east-1)

### Email Service

**AWS SES**:
- Email backend: `django_ses.SESBackend`
- Configuration: Uses AWS credentials from environment
- Development: Console backend (`django.core.mail.backends.console.EmailBackend`)
- Usage: Booking confirmations, receipts (to be implemented in notifications app)

### External Service Integrations

**Stripe (Payment Processing)** - MOCKED:
- Library: `stripe` Python package
- Implementation: `apps/payments/services.py` → `StripePaymentService`
- Mock Status: All API calls return fake data with TODO comments
- API Key: `STRIPE_API_KEY` (env variable, unused in mocks)
- Webhook Secret: `STRIPE_WEBHOOK_SECRET` (env variable, unused in mocks)
- Mock Pattern: Methods return realistic dict structures matching Stripe API
- Production Swap: Remove mock return statements, uncomment real API calls

**Onfleet (Logistics)** - MOCKED:
- Implementation: `apps/logistics/services.py` → `OnfleetService`, `ToteTaxiOnfleetIntegration`
- Mock Status: All API calls return fake data with TODO comments
- API Key: `ONFLEET_API_KEY` (env variable, not used in mocks)
- Mock Pattern: Returns dict structures matching Onfleet API
- Production Swap: Install `pyonfleet`, uncomment real API calls, remove mocks

### Security & Middleware

**Security Middleware Stack** (order matters):
1. `django.middleware.security.SecurityMiddleware`
2. `whitenoise.middleware.WhiteNoiseMiddleware` (static files)
3. `corsheaders.middleware.CorsMiddleware`
4. `django.contrib.sessions.middleware.SessionMiddleware`
5. `django.middleware.csrf.CsrfViewMiddleware`
6. `django.contrib.auth.middleware.AuthenticationMiddleware`
7. `django.contrib.messages.middleware.MessageMiddleware`
8. `django.middleware.clickjacking.XFrameOptionsMiddleware`

**CORS Configuration**:
- Library: `django-cors-headers`
- Allowed Origins: Configured in `settings.py` via `CORS_ALLOWED_ORIGINS`
- Credentials: `CORS_ALLOW_CREDENTIALS = True` (for cookie-based auth)
- Development: Allows `http://localhost:3000`, `http://127.0.0.1:3000`

**CSRF Protection**:
- Token delivery: Via GET endpoints `/api/customers/csrf-token/`, `/api/staff/csrf-token/`
- Token storage: Cookie (`csrftoken`)
- Exemptions: None (all POST/PUT/PATCH/DELETE require CSRF)

**Session Configuration**:
- Backend: Redis (production), database (fallback)
- Cookie name: `sessionid`
- Cookie age: 2 weeks (default Django)
- HttpOnly: True
- Secure: True (production only via `SESSION_COOKIE_SECURE`)

### Configuration Values

**Key Constants**:
```python
# Pricing
COI_FEE_CENTS = 17500  # $175 (when not included)
GEOGRAPHIC_SURCHARGE_CENTS = 10000  # $100
ORGANIZING_TAX_RATE = 0.0825  # 8.25%
BLADE_PER_BAG_PRICE_CENTS = 7500  # $75
BLADE_MINIMUM_CHARGE_CENTS = 15000  # $150

# Business Rules
MAX_WEIGHT_PER_ITEM_LBS = 50
STRIPE_MINIMUM_CHARGE_CENTS = 50  # $0.50 (Stripe limit)

# Rate Limits
LOGIN_RATE_LIMIT = '5/m'  # per IP
STAFF_ACTION_RATE_LIMIT = '15/m'  # per user
CUSTOMER_OPERATION_RATE_LIMIT = '20/m'  # per user
```

**Environment Variables Required**:
```
# Django Core
SECRET_KEY=<django-secret-key>
DEBUG=False  # True for development
ALLOWED_HOSTS=totetaxi.com,api.totetaxi.com

# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Redis
REDIS_URL=redis://localhost:6379/0

# AWS (Production)
AWS_ACCESS_KEY_ID=<aws-key>
AWS_SECRET_ACCESS_KEY=<aws-secret>
AWS_STORAGE_BUCKET_NAME=<s3-bucket>
AWS_S3_REGION_NAME=us-east-1

# Stripe (Currently Mocked)
STRIPE_API_KEY=sk_test_xxx  # Unused in mocks
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx  # Unused in mocks

# Onfleet (Currently Mocked)
ONFLEET_API_KEY=xxx  # Unused in mocks

# Frontend URLs (CORS)
FRONTEND_URL=https://totetaxi.com
FRONTEND_DOMAIN=totetaxi.com
```

### Deployment Configuration

**Docker Setup**:
- Dockerfile: `backend/Dockerfile` (production)
- Base image: `python:3.11-slim`
- Exposed port: 8000
- WSGI server: Gunicorn (configured in `gunicorn.conf.py`)

**Docker Compose** (Development):
- Services: `web` (Django), `db` (PostgreSQL), `redis`
- Volumes: Code mounted for hot-reload
- Ports: 8000 (Django), 5432 (PostgreSQL), 6379 (Redis)

**Fly.io Deployment**:
- Configuration: `fly.toml`
- Region: Primary + replicas
- Health checks: HTTP on `/health/` (to be implemented)
- Secrets: Environment variables via Fly.io secrets

**Static Files** (Production):
- Handler: WhiteNoise
- Compression: Enabled
- Storage: `staticfiles/` directory
- Collection: `python manage.py collectstatic`

---

## SECTION 8: Development Patterns & Conventions

### Adding New API Endpoint

**Standard Flow**:
1. **Create/Update Serializer** (`serializers.py`):
   - Define request validation
   - Define response structure
   - Add custom validation methods if needed
   
2. **Create/Update View** (`views.py`):
   - Choose view type: `APIView`, `generics.GenericAPIView`, `ViewSet`
   - Add permission classes: `IsAuthenticated`, `IsStaffUser`, `AllowAny`
   - Add rate limiting decorators: `@ratelimit(...)`
   - Implement HTTP methods: `get()`, `post()`, `patch()`, `delete()`
   - Handle errors and return appropriate status codes
   
3. **Register URL** (`urls.py`):
   - Add path to `urlpatterns`
   - Follow RESTful conventions
   - Use descriptive names for URL patterns
   
4. **Write Tests** (`tests.py`):
   - Test authentication/permissions
   - Test validation errors
   - Test success cases
   - Use `APIClient` for endpoint testing
   
5. **Update Documentation** (this file):
   - Add to Section 2 (API Endpoint Inventory)
   - Update relevant feature maps in Section 5

**Example**:
```python
# serializers.py
class MyNewSerializer(serializers.Serializer):
    field1 = serializers.CharField(max_length=100)
    field2 = serializers.IntegerField()
    
    def validate(self, data):
        # Custom validation
        return data

# views.py
from rest_framework.views import APIView
from django_ratelimit.decorators import ratelimit

@method_decorator(ratelimit(key='user', rate='10/m'), name='post')
class MyNewView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = MyNewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # ... process data
        return Response({...}, status=status.HTTP_201_CREATED)

# urls.py
urlpatterns = [
    path('my-endpoint/', MyNewView.as_view(), name='my-endpoint'),
]
```

### Modifying Existing Model

**Standard Flow**:
1. **Update Model Definition** (`models.py`):
   - Add/modify fields with proper constraints
   - Update relationships
   - Add/update model methods
   - Update `__str__()` if needed
   
2. **Create Migration**:
   ```bash
   python manage.py makemigrations
   ```
   
3. **Review Migration File**:
   - Check for data migrations needed
   - Ensure foreign key cascades are correct
   - Verify default values for new fields
   
4. **Update Serializers** (`serializers.py`):
   - Add new fields to `Meta.fields`
   - Update validation if needed
   - Add computed fields if needed
   
5. **Update Views** (if logic changes):
   - Adjust queries for new fields
   - Update filtering/ordering options
   - Modify business logic if needed
   
6. **Run Migration**:
   ```bash
   python manage.py migrate
   ```
   
7. **Run Tests**:
   ```bash
   python manage.py test
   ```
   
8. **Update Documentation** (this file):
   - Update model in Section 3
   - Update affected feature maps in Section 5

**Important**: If modifying a model with complex relationships or pricing logic (like `Booking`), test thoroughly and consider impact on existing records.

### Adding Business Logic

**Decision Tree**:

**Simple CRUD operations** → ViewSet methods or `APIView` methods
- Example: Basic create, list, retrieve, update, delete
- Keep logic in view, use serializer for validation

**Complex multi-step operations** → Service class in `services.py`
- Example: Payment processing, Onfleet integration, multi-model updates
- Create dedicated service class with static/class methods
- Benefits: Testability, reusability, separation of concerns

**Data calculations** → Model methods
- Example: Pricing calculations, stat updates, status checks
- Add method to relevant model
- Use `@property` for computed read-only values

**Async/background operations** → Celery tasks in `tasks.py`
- Example: Email sending, webhook processing, scheduled jobs
- Create task with `@shared_task` decorator
- Call with `.delay()` or `.apply_async()`

**Reusable utilities** → Helper functions in `utils/` or `helpers.py`
- Example: Date formatting, string manipulation, validators
- Keep stateless and pure functions

**Example Service Class Pattern**:
```python
# services.py
class MyBusinessService:
    """Handles complex multi-step business operation"""
    
    @staticmethod
    def perform_operation(data):
        """
        Main operation that coordinates multiple steps
        """
        # Step 1: Validate
        if not MyBusinessService._validate(data):
            raise ValidationError("Invalid data")
        
        # Step 2: Process
        result = MyBusinessService._process(data)
        
        # Step 3: Notify
        MyBusinessService._send_notification(result)
        
        return result
    
    @staticmethod
    def _validate(data):
        # Private validation logic
        pass
    
    @staticmethod
    def _process(data):
        # Private processing logic
        pass
    
    @staticmethod
    def _send_notification(result):
        # Private notification logic
        pass
```

### Code Organization Rules

**Layer Responsibilities**:
- **Models**: Data structure, field constraints, simple data methods, relationships
- **Serializers**: Validation, data transformation, nested serialization
- **Views**: Request handling, permission enforcement, response formatting
- **Services**: Complex business logic, external API integration, cross-app coordination
- **Tasks**: Asynchronous operations, scheduled jobs, background processing
- **Utils**: Reusable stateless helper functions

**File Organization**:
- Keep related code together in same file
- Split large files by logical grouping (e.g., `booking_views.py` for customer booking views)
- Use `__init__.py` for package exports
- Avoid circular imports (use lazy imports if needed)

**Naming Conventions**:
- Models: Singular nouns (`Booking`, `Payment`)
- Serializers: `<Model>Serializer` (`BookingSerializer`)
- Views: `<Action><Resource>View` (`CreatePaymentIntentView`)
- URLs: Kebab-case (`/api/bookings/guest-booking/`)
- Variables: Snake_case (`total_price_cents`)
- Constants: UPPER_SNAKE_CASE (`COI_FEE_CENTS`)

### Testing Patterns

**Test File Structure**: Mirror source structure
```
apps/bookings/
├── tests/
│   ├── __init__.py
│   ├── test_models.py
│   ├── test_views.py
│   ├── test_serializers.py
│   └── test_pricing.py
```

**Test Classes**: Group by model or feature
```python
from django.test import TestCase
from rest_framework.test import APIClient

class BookingModelTests(TestCase):
    def setUp(self):
        # Create test data
        pass
    
    def test_pricing_calculation(self):
        # Test pricing engine
        pass
    
    def test_status_transitions(self):
        # Test state changes
        pass

class BookingAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        # Create test data
    
    def test_create_booking(self):
        response = self.client.post('/api/bookings/guest-booking/', {...})
        self.assertEqual(response.status_code, 201)
```

**Mock External Services**:
```python
from unittest.mock import patch

class PaymentTests(TestCase):
    @patch('apps.payments.services.stripe.PaymentIntent.create')
    def test_create_payment_intent(self, mock_stripe):
        mock_stripe.return_value = {...}  # Mock response
        # Test code
```

**Run Tests**:
```bash
# All tests
python manage.py test

# Specific app
python manage.py test apps.bookings

# Specific test class
python manage.py test apps.bookings.tests.test_models.BookingModelTests

# With coverage
coverage run --source='.' manage.py test
coverage report
```

### Common Development Tasks

**Create New App**:
```bash
cd backend/apps
django-admin startapp myapp
# Add 'apps.myapp' to INSTALLED_APPS in settings.py
# Create models, views, serializers, urls
# Register URLs in config/urls.py
```

**Reset Database**
```bash
# Drop and recreate database (WARNING: deletes all data)
python manage.py flush
# Or completely reset:
dropdb totetaxi_db
createdb totetaxi_db
python manage.py migrate
python manage.py recreate_services  # Populate service catalog
```

**Populate Test Data**:
```bash
# Create superuser for Django admin
python manage.py createsuperuser

# Run custom management command to create services
python manage.py recreate_services

# Create test bookings (manual via Django shell)
python manage.py shell
>>> from apps.bookings.models import Booking, Address
>>> # Create test data...
```

**Django Shell Quick Reference**:
```bash
python manage.py shell

# Common imports
from apps.bookings.models import Booking, Address
from apps.customers.models import CustomerProfile
from apps.services.models import MiniMovePackage, SurchargeRule
from django.contrib.auth.models import User

# Query examples
Booking.objects.all()
Booking.objects.filter(status='confirmed')
User.objects.get(email='test@example.com')

# Create objects
booking = Booking.objects.create(...)
booking.save()  # Triggers pricing calculation
```

**Check Migration Status**:
```bash
python manage.py showmigrations
python manage.py migrate --plan  # Preview migrations
```

**Create Data Migration**:
```bash
python manage.py makemigrations --empty myapp
# Edit migration file to add RunPython operations
# See apps/services/migrations/0003_populate_organizing_services.py for example
```

**Debugging Tips**:
- Use Django shell to test queries: `python manage.py shell`
- Print SQL queries: `from django.db import connection; print(connection.queries)`
- Use `print()` statements in views (visible in console)
- Django Debug Toolbar (install for development): detailed request/query info
- Check logs in `backend/logs/` directory
- Use `import pdb; pdb.set_trace()` for breakpoints

---

## SECTION 9: Critical File Reference Guide

This section provides a quick lookup for the most important files when working on specific features.

### Pricing & Revenue
**Primary Files**:
- `apps/bookings/models.py` - `Booking.calculate_pricing()` (main engine)
- `apps/services/models.py` - All service models with pricing data
- `apps/bookings/views.py` - `PricingPreviewView` (public pricing API)

**Supporting Files**:
- `apps/services/admin.py` - Service configuration management
- `apps/bookings/serializers.py` - `PricingPreviewSerializer`

### Booking Lifecycle
**Primary Files**:
- `apps/bookings/models.py` - `Booking` model with status transitions
- `apps/bookings/views.py` - Guest booking creation
- `apps/customers/booking_views.py` - Customer booking creation

**Supporting Files**:
- `apps/bookings/serializers.py` - Booking serializers
- `apps/payments/services.py` - Payment integration
- `apps/logistics/services.py` - Onfleet task creation

### Authentication & Security
**Primary Files**:
- `apps/customers/views.py` - Customer auth endpoints
- `apps/accounts/views.py` - Staff auth endpoints
- `config/settings.py` - Security configuration

**Supporting Files**:
- `apps/customers/serializers.py` - Customer auth serializers
- `apps/accounts/serializers.py` - Staff auth serializers
- `apps/accounts/models.py` - `StaffProfile`, permission logic

### Payment Processing
**Primary Files**:
- `apps/payments/services.py` - `StripePaymentService` (MOCKED)
- `apps/payments/views.py` - Payment endpoints
- `apps/payments/models.py` - `Payment`, `Refund` models

**Supporting Files**:
- `apps/bookings/models.py` - `Booking.confirm_booking()`
- `apps/customers/models.py` - `CustomerProfile.update_booking_stats()`

### Logistics & Delivery
**Primary Files**:
- `apps/logistics/services.py` - `OnfleetService`, `ToteTaxiOnfleetIntegration` (MOCKED)
- `apps/logistics/models.py` - `OnfleetTask` model
- `apps/bookings/models.py` - Booking status transitions

### Staff Operations
**Primary Files**:
- `apps/accounts/views.py` - Staff dashboard, booking/customer management
- `apps/accounts/models.py` - `StaffProfile`, `StaffAction` (audit trail)

**Supporting Files**:
- `apps/bookings/models.py` - Booking queries and updates
- `apps/customers/models.py` - Customer queries and stats

### Service Configuration
**Primary Files**:
- `apps/services/models.py` - All service models
- `apps/services/admin.py` - Admin interface for service management
- `apps/services/migrations/0003_populate_organizing_services.py` - Service data

**Supporting Files**:
- `apps/services/serializers.py` - Service serializers
- `backend/recreate_services.py` - Service population script

---

## SECTION 10: Database Schema Overview

### Table Relationships Diagram

```
User (Django auth_user)
  ├─── OneToOne ─── CustomerProfile (customers_customer_profile)
  │                      ├─── OneToMany ─── SavedAddress (customers_saved_address)
  │                      ├─── OneToMany ─── CustomerPaymentMethod (customers_payment_method)
  │                      └─── OneToMany ─── Booking (bookings_booking) [nullable]
  │
  └─── OneToOne ─── StaffProfile (accounts_staff_profile)
                         └─── OneToMany ─── StaffAction (accounts_staff_action) [SET_NULL]

Booking (bookings_booking)
  ├─── ManyToOne ─── MiniMovePackage (services_mini_move_package) [PROTECT]
  ├─── ManyToMany ─── SpecialtyItem (services_specialty_item)
  ├─── ManyToOne ─── Address (pickup_address) [PROTECT]
  ├─── ManyToOne ─── Address (delivery_address) [PROTECT]
  ├─── OneToOne ─── GuestCheckout (bookings_guest_checkout) [CASCADE, nullable]
  ├─── OneToMany ─── Payment (payments_payment) [PROTECT]
  └─── OneToOne ─── OnfleetTask (logistics_onfleet_task) [CASCADE]

Payment (payments_payment)
  └─── OneToMany ─── Refund (payments_refund) [PROTECT]

OrganizingService (services_organizing_service)
  └─── Linked via mini_move_tier to MiniMovePackage.package_type

SurchargeRule (services_surcharge_rule)
  └─── Applied dynamically during pricing calculation

StandardDeliveryConfig (services_standard_delivery_config)
  └─── Singleton config (one active record)
```

### Key Indexes

**Performance-Critical Indexes**:
- `bookings_booking.booking_number` - Unique index for lookup
- `bookings_booking.customer_id + status` - Customer booking queries
- `bookings_booking.pickup_date + status` - Date-based queries
- `bookings_booking.service_type + status` - Service filtering
- `accounts_staff_action.staff_id + created_at` - Audit queries
- `accounts_staff_action.target_model + target_id` - Reverse audit lookup
- `payments_payment.stripe_payment_intent_id` - Payment lookups
- `logistics_onfleet_task.onfleet_task_id` - Onfleet sync
- `customers_saved_address.customer_id + is_active` - Address queries

### Cascade Behaviors

**Critical CASCADE Relationships** (deleting parent deletes child):
- `User` → `CustomerProfile` - Deleting user deletes profile
- `User` → `StaffProfile` - Deleting user deletes profile
- `Booking` → `OnfleetTask` - Deleting booking deletes task
- `Booking` → `GuestCheckout` - Deleting booking deletes guest info
- `User` → `SavedAddress` - Deleting user deletes addresses
- `User` → `CustomerPaymentMethod` - Deleting user deletes payment methods

**Critical PROTECT Relationships** (cannot delete parent if child exists):
- `Booking` → `MiniMovePackage` - Cannot delete package with bookings
- `Booking` → `Address` - Cannot delete address used in bookings
- `Payment` → `Booking` - Cannot delete booking with payments
- `Refund` → `Payment` - Cannot delete payment with refunds

**SET_NULL Relationships** (sets child foreign key to null on parent delete):
- `StaffAction` → `User` (staff) - Preserves audit trail if staff deleted
- `Refund` → `User` (processed_by) - Preserves refund record if staff deleted
- `Booking` → `User` (customer) - Allows keeping booking if customer deleted

---

## SECTION 11: Migration Strategy & Data Integrity

### Migration Best Practices

**Before Creating Migrations**:
1. Review model changes carefully
2. Consider impact on existing data
3. Plan data migrations if needed
4. Backup production database

**Safe Migration Patterns**:
- Adding nullable fields: Safe
- Adding fields with defaults: Safe
- Adding indexes: Safe (may be slow)
- Renaming fields: Requires data migration
- Removing fields: Requires cleanup first
- Changing field types: Dangerous, test thoroughly

**Risky Operations**:
- Removing ForeignKey fields with data
- Changing CASCADE to PROTECT on existing data
- Altering unique constraints with duplicates
- Renaming models (breaks relationships)

**Data Migration Example**:
```python
# Migration file example
from django.db import migrations

def populate_data(apps, schema_editor):
    MyModel = apps.get_model('myapp', 'MyModel')
    # Create/update data
    MyModel.objects.create(...)

def reverse_populate_data(apps, schema_editor):
    MyModel = apps.get_model('myapp', 'MyModel')
    # Remove data
    MyModel.objects.filter(...).delete()

class Migration(migrations.Migration):
    dependencies = [
        ('myapp', '0001_initial'),
    ]
    
    operations = [
        migrations.RunPython(
            populate_data,
            reverse_populate_data
        ),
    ]
```

### Data Integrity Checks

**Critical Invariants**:
- Every `Booking` must have either `customer` OR `guest_checkout` (not both)
- `Booking.total_price_cents` must equal sum of all price components
- `CustomerProfile.total_spent_cents` must equal sum of confirmed/completed booking totals
- Only one `SavedAddress` per customer can have `is_primary=True`
- Only one `StandardDeliveryConfig` can have `is_active=True`
- `Payment.amount_cents` must match `Booking.total_price_cents`

**Validation Locations**:
- Model `save()` methods enforce constraints
- Serializer `validate()` methods check business rules
- Database constraints enforce data integrity

**Integrity Check Script** (example):
```python
# backend/scripts/check_integrity.py
from apps.bookings.models import Booking
from apps.customers.models import CustomerProfile

def check_booking_totals():
    """Verify booking price calculations"""
    for booking in Booking.objects.all():
        calculated = booking.calculate_pricing()
        if calculated != booking.total_price_cents:
            print(f"❌ Booking {booking.booking_number} price mismatch")

def check_customer_stats():
    """Verify customer stats accuracy"""
    for profile in CustomerProfile.objects.all():
        profile.update_booking_stats()
        # Check if stats changed
```

---

## SECTION 12: Monitoring & Observability

### Logging Strategy

**Current Implementation**:
- Django default logging to console
- Log directory: `backend/logs/` (created but not actively used)
- Production: stdout/stderr captured by Docker/Fly.io

**Recommended Logging Levels**:
- **DEBUG**: Development only, detailed trace
- **INFO**: General information, normal operations
- **WARNING**: Unexpected but handled situations
- **ERROR**: Errors that need attention
- **CRITICAL**: System failures

**Key Areas to Log**:
- Authentication attempts (success/failure)
- Payment processing events
- Booking creation/updates
- External API calls (Stripe, Onfleet)
- Pricing calculations (for debugging)
- Staff actions (already logged via `StaffAction`)

### Error Tracking

**Current Setup**:
- Django debug mode shows detailed errors (development only)
- Production: Generic error pages

**Recommended Integration**:
- Sentry for error tracking and alerting
- Configuration location: `config/settings.py`
- Capture: Exceptions, performance issues, user feedback

### Performance Monitoring

**Database Query Optimization**:
- Use `select_related()` for ForeignKey relationships
- Use `prefetch_related()` for ManyToMany relationships
- Add indexes on frequently queried fields (already done for critical fields)
- Monitor slow queries in production

**Example Optimized Queries**:
```python
# Bad: N+1 queries
bookings = Booking.objects.all()
for booking in bookings:
    print(booking.customer.email)  # Separate query each time

# Good: Single query with join
bookings = Booking.objects.select_related('customer').all()
for booking in bookings:
    print(booking.customer.email)  # Already loaded

# Bad: N+1 for ManyToMany
bookings = Booking.objects.all()
for booking in bookings:
    print(booking.specialty_items.count())  # Separate query

# Good: Prefetch
bookings = Booking.objects.prefetch_related('specialty_items').all()
for booking in bookings:
    print(booking.specialty_items.count())  # Already loaded
```

### Health Check Endpoints

**Recommended Implementation**:
```python
# apps/core/views.py (create new app)
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import connection

class HealthCheckView(APIView):
    permission_classes = []  # Public
    
    def get(self, request):
        # Check database
        try:
            connection.ensure_connection()
            db_status = "ok"
        except:
            db_status = "error"
        
        # Check Redis (if using)
        # redis_status = check_redis()
        
        return Response({
            "status": "healthy" if db_status == "ok" else "unhealthy",
            "database": db_status,
            # "redis": redis_status,
            "version": "1.0.0"
        })

# Add to config/urls.py:
# path('health/', HealthCheckView.as_view())
```

---

## SECTION 13: Future Enhancements & TODOs

### Phase 1: Production Readiness

**Stripe Integration** (HIGH PRIORITY):
- Location: `apps/payments/services.py`
- Remove mock returns, uncomment real Stripe API calls
- Test with Stripe test mode extensively
- Implement webhook signature verification
- Add retry logic for failed payments
- Test 3D Secure flows

**Onfleet Integration** (HIGH PRIORITY):
- Location: `apps/logistics/services.py`
- Install `pyonfleet` library
- Remove mock returns, implement real API calls
- Set up webhook endpoint on public URL
- Test driver assignment and tracking
- Implement error handling for API failures

**Email Notifications** (HIGH PRIORITY):
- Location: `apps/notifications/` (expand)
- Create email templates (booking confirmation, receipt, status updates)
- Implement email service using AWS SES
- Trigger emails on booking lifecycle events
- Add email preferences to customer profile

**Error Handling & Logging** (MEDIUM PRIORITY):
- Integrate Sentry for production error tracking
- Implement structured logging with log levels
- Add request ID tracking for debugging
- Create admin dashboard for error monitoring

### Phase 2: Feature Enhancements

**Customer Features**:
- Password reset flow via email
- Booking cancellation (with refund policy)
- Booking modification (change date/time)
- Real-time booking tracking via Onfleet
- Receipt/invoice download (PDF generation)
- Booking history export
- Referral program

**Staff Features**:
- Advanced analytics dashboard (charts, graphs)
- Customer segmentation and targeting
- Route optimization for delivery planning
- Automated assignment of drivers
- SMS notifications to customers
- Bulk operations (cancel multiple bookings)
- Revenue reports and forecasting

**Payment Features**:
- Save payment methods (Stripe Customer API)
- Automatic payment for repeat customers
- Split payments / deposits
- Refund processing UI for staff
- Payment reconciliation reports

**Service Features**:
- Dynamic pricing based on demand
- Promotional codes / discounts
- Seasonal pricing adjustments
- Service area expansion (geographic validation)
- Multi-day bookings
- Recurring bookings (subscription model)

### Phase 3: Technical Improvements

**Performance Optimizations**:
- Implement Redis caching for service catalog
- Cache customer stats with invalidation
- Add database query optimization analysis
- Implement pagination for large result sets
- Add rate limiting at API gateway level

**Testing & Quality**:
- Increase test coverage to 80%+
- Add integration tests for complete flows
- Add load testing for concurrent bookings
- Implement CI/CD pipeline (GitHub Actions)
- Add pre-commit hooks for linting/formatting

**Security Enhancements**:
- Implement rate limiting per user (not just IP)
- Add API key authentication for mobile apps
- Implement OAuth2 for third-party integrations
- Add content security policy headers
- Regular security audits and dependency updates

**DevOps & Infrastructure**:
- Set up staging environment
- Implement blue-green deployments
- Add database backup automation
- Set up monitoring and alerting (Datadog, New Relic)
- Implement log aggregation (ELK stack)
- Add database read replicas for scaling

### Phase 4: Advanced Features

**CRM & Marketing**:
- Customer lifecycle campaigns
- Automated follow-ups
- NPS surveys
- Customer win-back campaigns
- Lead management system

**Analytics & Reporting**:
- Custom report builder for staff
- Customer lifetime value analysis
- Booking conversion funnel
- Service performance metrics
- Driver performance tracking

**Integrations**:
- Calendar sync (Google Calendar, iCal)
- Accounting system integration (QuickBooks)
- CRM integration (Salesforce, HubSpot)
- Marketing automation (Mailchimp)
- SMS provider (Twilio)

---

## SECTION 14: Quick Command Reference

### Django Management

```bash
# Run development server
python manage.py runserver

# Create superuser
python manage.py createsuperuser

# Database operations
python manage.py makemigrations
python manage.py migrate
python manage.py showmigrations
python manage.py sqlmigrate app_name migration_name

# Shell
python manage.py shell
python manage.py shell_plus  # If django-extensions installed

# Testing
python manage.py test
python manage.py test apps.bookings
python manage.py test apps.bookings.tests.test_models.BookingModelTests

# Static files
python manage.py collectstatic
```

### Docker

```bash
# Development
docker-compose up -d
docker-compose down
docker-compose logs -f web
docker-compose exec web python manage.py migrate
docker-compose exec web python manage.py shell

# Production
docker build -t totetaxi-backend .
docker run -p 8000:8000 totetaxi-backend
```

### Database

```bash
# PostgreSQL
psql -U postgres
\c totetaxi_db
\dt  # List tables
\d+ bookings_booking  # Describe table

# Backup
pg_dump totetaxi_db > backup.sql

# Restore
psql totetaxi_db < backup.sql
```

### Git Workflow

```bash
# Feature branch
git checkout -b feature/new-feature
git add .
git commit -m "feat: Add new feature"
git push origin feature/new-feature

# Merge to main
git checkout main
git merge feature/new-feature
git push origin main
```

---

## SECTION 15: Conclusion & Usage Guide

### How to Use This Documentation

**For New Features**:
1. Start with Section 1 (Architecture) - Understand the system design
2. Review Section 2 (API Endpoints) - Check existing endpoints
3. Check Section 5 (Feature Maps) - See similar feature implementations
4. Review Section 8 (Development Patterns) - Follow established conventions
5. Request specific files from `back_export.txt` as needed
6. Update this documentation when feature is complete

**For Bug Fixes**:
1. Review Section 3 (Models) - Understand data structures
2. Check Section 6 (Business Logic Locations) - Find relevant code
3. Review Section 5 (Feature Maps) - Understand execution flow
4. Request specific files from `back_export.txt` to examine code
5. Fix bug following existing patterns
6. Add regression tests

**For Understanding System**:
1. Read Section 1 (Architecture Mental Model) - High-level overview
2. Review Section 3 (Models) - Data structure foundation
3. Check Section 5 (Feature Maps) - See how features work end-to-end
4. Reference Section 7 (Tech Stack) - Understand infrastructure

**For Modifications**:
1. Identify feature area in Section 4 (File Index)
2. Review affected models in Section 3
3. Check business logic locations in Section 6
4. Request relevant files from `back_export.txt`
5. Follow patterns in Section 8 (Development Patterns)
6. Update this documentation

### Requesting Files from back_export.txt

**Efficient Request Pattern**:
```
"Show me the following files from back_export.txt:
- apps/bookings/models.py (Booking model with pricing methods)
- apps/services/models.py (SurchargeRule and OrganizingService)
- apps/bookings/views.py (PricingPreviewView)"
```

**What to Request**:
- Request 2-5 related files at once for context
- Specify exactly what you need from each file
- Reference section numbers from this doc
- Use feature maps to identify file chains

### Documentation Maintenance

**When to Update**:
- After adding new models (update Section 3)
- After adding new endpoints (update Section 2)
- After creating new features (update Section 5)
- After modifying business logic (update Section 6)
- After changing architecture (update Section 1)

**How to Update**:
- Keep concise - this is a navigation tool, not code repository
- Use same format and structure as existing sections
- Add to appropriate section, maintain organization
- Update table of contents if adding new sections

### Key Takeaways

**ToteTaxi Backend Summary**:
- **9 Django apps** organized by business domain
- **Dual authentication** - separate customer and staff systems
- **Plug