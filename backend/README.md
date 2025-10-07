I'll generate your backend living documentation now! Let me load the complete back_export.txt and follow the Strategic Extraction Protocol.Perfect! I now have comprehensive understanding of your ToteTaxi backend. Let me generate your living documentation following the Strategic Extraction Protocol. This will be approximately 8,000-10,000 tokens of strategic navigation.

---

# TOTETAXI BACKEND - LIVING DOCUMENTATION v2.0

**Generated:** October 7, 2025  
**Source:** back_export.txt (134 files, ~70,000 tokens)  
**Purpose:** AI Executive Function Navigation System

---

## SECTION 1: SYSTEM ARCHITECTURE MENTAL MODEL

### High-Level Overview

ToteTaxi is a **luxury delivery and moving service platform** built on Django 5.2.5 + DRF 3.16.1. The architecture implements a **dual-user system** (Staff + Customers) with **service catalog management**, **payment processing**, and **logistics tracking** as core pillars.

### Django Project Structure

```
totetaxi-backend/
├── config/              # Django project settings & Celery config
├── apps/                # 9 business domain applications
│   ├── accounts/        # Staff authentication & management
│   ├── bookings/        # Core booking engine (guest + authenticated)
│   ├── customers/       # Customer authentication & profiles
│   ├── payments/        # Stripe payment processing & refunds
│   ├── services/        # Service catalog (mini-moves, organizing, specialty)
│   ├── logistics/       # Onfleet integration for delivery tracking
│   ├── notifications/   # Email/SMS notification system (placeholder)
│   ├── documents/       # Document management (placeholder)
│   └── crm/             # Customer relationship management (placeholder)
├── scripts/             # Utility scripts (back_export.py, entrypoint.sh)
└── manage.py            # Django CLI entry point
```

### Architectural Patterns & Design Decisions

**1. Dual-User Profile System**
- **StaffProfile** (accounts app) - Internal staff with role-based permissions (admin, operations, support)
- **CustomerProfile** (customers app) - External customers with booking history and saved preferences
- **Hybrid Authentication** - Custom authentication class supports both JWT (customers) and session (staff) in same system
- **Constraint Enforcement** - Users cannot have both staff and customer profiles simultaneously

**2. Layer Separation Strategy**
```
┌─────────────────────────────────────────────────┐
│  Views Layer - Request handling, permissions    │
├─────────────────────────────────────────────────┤
│  Serializers - Validation, I/O transformation   │
├─────────────────────────────────────────────────┤
│  Services - Complex business logic, external    │
│             API integration (Stripe, Onfleet)   │
├─────────────────────────────────────────────────┤
│  Models - Data structure, simple data methods   │
├─────────────────────────────────────────────────┤
│  Tasks - Async operations via Celery            │
└─────────────────────────────────────────────────┘
```

**3. Service Catalog Architecture**
- **Mini Move Packages** - Tiered service offerings (Petite, Standard, Full Move)
- **Organizing Services** - Optional packing/unpacking tied to move tiers
- **Standard Delivery** - Per-item delivery with configurable pricing
- **Specialty Items** - Special handling items (pianos, bikes, golf clubs, etc.)
- **Surcharge Rules** - Dynamic weekend, holiday, geographic, and time-window surcharges
- **BLADE Integration** - Airport luggage delivery with flight tracking

**4. Booking Flow Design**
- Supports **guest checkout** (no authentication) AND **authenticated customer** bookings
- **Address Management** - Separate Address model allows one-time or saved addresses
- **Pricing Calculation** - Dynamic pricing in model methods based on service selections
- **State Transitions** - Booking status flow: pending → confirmed → paid → completed/cancelled

**5. Payment Processing Pattern**
- **Stripe Payment Intent** flow for secure card processing
- **Payment** model tracks all payment attempts with status and Stripe IDs
- **Refund** model with approval workflow (requested → approved → completed)
- **PaymentAudit** comprehensive financial audit logging
- **Mock endpoints** available for testing without Stripe API calls

**6. External Service Integration Approach**
- **Service Layer Pattern** - Dedicated service classes handle external APIs
  - `StripePaymentService` - Encapsulates all Stripe operations
  - `ToteTaxiOnfleetIntegration` - Handles Onfleet task management
- **Mocked Implementations** - Development mode uses simulated responses
- **Webhook Handling** - CSRF-exempt endpoints for external service callbacks

**7. Asynchronous Task Management**
- **Celery** with Redis broker for background jobs
- **Celery Beat** with Django database scheduler for periodic tasks
- Task modules in each app's `tasks.py` (pattern established, not yet heavily utilized)

### Key Architectural Decisions

✅ **Django Auth User Model** - Standard Django User, extended with profile models  
✅ **UUID Primary Keys** - Most models use UUID for security and distributed systems  
✅ **Soft Deletes** - Bookings have `deleted_at` field for data retention  
✅ **Explicit Constraints** - Database-level constraints ensure data integrity  
✅ **Cents-Based Pricing** - All monetary values stored as integer cents to avoid float precision issues  
✅ **AllowAny Public Endpoints** - Guest booking and service catalog accessible without authentication  
✅ **CORS + CSRF Strategy** - Configured for cross-domain frontend with session/JWT hybrid auth  

### Business Domain Separation

| App | Primary Responsibility | Key Models |
|-----|------------------------|------------|
| **accounts** | Staff operations & internal tools | StaffProfile, StaffAction |
| **bookings** | Core booking engine | Booking, Address, GuestCheckout |
| **customers** | Customer auth & profiles | CustomerProfile, SavedAddress, CustomerPaymentMethod |
| **payments** | Payment processing | Payment, Refund, PaymentAudit |
| **services** | Service catalog | MiniMovePackage, OrganizingService, SpecialtyItem, SurchargeRule |
| **logistics** | Delivery tracking | OnfleetTask |
| **notifications** | Messaging (future) | TBD |
| **documents** | COI/invoices (future) | TBD |
| **crm** | Customer insights (future) | TBD |

---

## SECTION 2: COMPLETE API ENDPOINT MAP

### Public Endpoints (No Authentication Required)

#### **Bookings Service Catalog**
```
GET  /api/bookings/services/
     View: ServiceCatalogView.get
     Auth: AllowAny
     Response: {mini_move_packages, organizing_services, specialty_items, standard_delivery}
     Files: bookings/views.py, services/serializers.py

GET  /api/bookings/services/mini-moves-with-organizing/
     View: ServiceCatalogWithOrganizingView.get
     Auth: AllowAny
     Response: {mini_moves_with_organizing: [packages with organizing options]}
     Files: bookings/views.py, services/serializers.py

GET  /api/bookings/services/organizing-by-tier/
     View: OrganizingServicesByTierView.get
     Auth: AllowAny
     Response: {petite: {packing, unpacking}, standard: {...}, full: {...}}
     Files: bookings/views.py, services/serializers.py

GET  /api/bookings/services/organizing/<uuid:service_id>/
     View: OrganizingServiceDetailView.get
     Auth: AllowAny
     Response: {id, name, description, price_dollars, duration_hours, ...}
     Files: bookings/views.py, services/serializers.py

POST /api/bookings/pricing-preview/
     View: PricingPreviewView.post
     Auth: AllowAny
     Request: {service_type, package_id?, items?, pickup_date, is_same_day?, coi_required?, ...}
     Response: {total_price_dollars, breakdown, surcharges_applied}
     Files: bookings/views.py, bookings/serializers.py

GET  /api/bookings/availability/
     View: CalendarAvailabilityView.get
     Auth: AllowAny
     Query: ?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
     Response: {available_dates: [...], blocked_dates: [...]}
     Files: bookings/views.py

POST /api/bookings/guest-booking/
     View: GuestBookingCreateView.post
     Auth: AllowAny
     Request: {guest_info, service_type, pickup_date, addresses, items, ...}
     Response: {booking_number, total_price_dollars, payment_required}
     Files: bookings/views.py, bookings/serializers.py

GET  /api/bookings/booking-status/<booking_number>/
     View: BookingStatusView.get
     Auth: AllowAny
     Response: {booking_number, status, pickup_date, delivery_address, ...}
     Files: bookings/views.py, bookings/serializers.py
```

#### **Payment Processing**
```
POST /api/payments/create-intent/
     View: PaymentIntentCreateView.post
     Auth: AllowAny
     Request: {booking_id, customer_email?}
     Response: {client_secret, payment_intent_id, amount_cents}
     Files: payments/views.py, payments/services.py

GET  /api/payments/status/<booking_number>/
     View: PaymentStatusView.get
     Auth: AllowAny
     Response: {booking_number, payment_status, amount_dollars}
     Files: payments/views.py

POST /api/payments/confirm/
     View: PaymentConfirmView.post
     Auth: AllowAny
     Request: {payment_intent_id, status, failure_reason?}
     Response: {success, payment_id, booking_status}
     Files: payments/views.py, payments/services.py

POST /api/payments/webhook/
     View: StripeWebhookView.post
     Auth: CSRF Exempt (Stripe signature verification)
     Request: Stripe webhook payload
     Response: 200 OK
     Files: payments/views.py

POST /api/payments/mock-confirm/
     View: MockPaymentConfirmView.post
     Auth: AllowAny (development only)
     Request: {booking_id}
     Response: {success, payment_id}
     Files: payments/views.py
```

### Customer Authenticated Endpoints

#### **Customer Auth & Profile**
```
GET  /api/customers/csrf-token/
     View: CSRFTokenView.get
     Auth: AllowAny
     Response: {csrfToken}
     Files: customers/views.py

POST /api/customers/auth/register/
     View: CustomerRegistrationView.post
     Auth: AllowAny
     Request: {email, password, password_confirm, first_name, last_name, phone?}
     Response: {user, profile, message}
     Files: customers/views.py, customers/serializers.py

POST /api/customers/auth/login/
     View: CustomerLoginView.post
     Auth: AllowAny
     Request: {email, password}
     Response: {user, profile, message}
     Files: customers/views.py, customers/serializers.py

POST /api/customers/auth/logout/
     View: CustomerLogoutView.post
     Auth: IsAuthenticated
     Response: {message}
     Files: customers/views.py

GET  /api/customers/auth/user/
     View: CurrentUserView.get
     Auth: IsAuthenticated
     Response: {user, profile}
     Files: customers/views.py

POST /api/customers/auth/password-reset/
     View: PasswordResetRequestView.post
     Auth: AllowAny
     Request: {email}
     Response: {message}
     Files: customers/views.py, customers/models.py

POST /api/customers/auth/password-reset/confirm/
     View: PasswordResetConfirmView.post
     Auth: AllowAny
     Request: {token, new_password}
     Response: {message}
     Files: customers/views.py, customers/models.py

POST /api/customers/auth/verify-email/
     View: EmailVerificationView.post
     Auth: AllowAny
     Request: {token}
     Response: {message}
     Files: customers/views.py, customers/models.py

POST /api/customers/auth/resend-verification/
     View: ResendVerificationView.post
     Auth: IsAuthenticated
     Response: {message}
     Files: customers/views.py, customers/models.py

GET  /api/customers/profile/
PUT  /api/customers/profile/
PATCH /api/customers/profile/
     View: CustomerProfileView
     Auth: IsAuthenticated
     Request (PUT/PATCH): {phone?, preferred_pickup_time?, email_notifications?, sms_notifications?}
     Response: {profile data}
     Files: customers/views.py, customers/serializers.py

GET  /api/customers/dashboard/
     View: CustomerDashboardView.get
     Auth: IsAuthenticated
     Response: {profile, booking_stats, recent_bookings, saved_addresses}
     Files: customers/views.py
```

#### **Customer Bookings**
```
GET  /api/customers/bookings/
     View: CustomerBookingListView.get
     Auth: IsAuthenticated
     Query: ?status=pending&limit=10
     Response: {results: [bookings], count, next, previous}
     Files: customers/views.py, customers/booking_serializers.py

POST /api/customers/bookings/create/
     View: CustomerBookingCreateView.post
     Auth: IsAuthenticated
     Request: {service_type, pickup_date, addresses (saved or new), items, ...}
     Response: {booking details, payment_required}
     Files: customers/booking_views.py, customers/booking_serializers.py

GET  /api/customers/bookings/<uuid:booking_id>/
     View: CustomerBookingDetailView.get
     Auth: IsAuthenticated
     Response: {booking details, pricing_breakdown, can_rebook}
     Files: customers/booking_views.py, customers/booking_serializers.py

POST /api/customers/bookings/<uuid:booking_id>/rebook/
     View: QuickRebookView.post
     Auth: IsAuthenticated
     Request: {pickup_date, pickup_time?, is_same_day_delivery?, special_instructions?}
     Response: {new_booking details}
     Files: customers/booking_views.py, customers/booking_serializers.py
```

#### **Saved Addresses & Payment Methods**
```
GET  /api/customers/addresses/
POST /api/customers/addresses/
     View: SavedAddressListCreateView
     Auth: IsAuthenticated
     Request (POST): {nickname, address_line_1, city, state, zip_code, delivery_instructions?}
     Response: {saved address details}
     Files: customers/views.py, customers/serializers.py

GET    /api/customers/addresses/<uuid:pk>/
PUT    /api/customers/addresses/<uuid:pk>/
PATCH  /api/customers/addresses/<uuid:pk>/
DELETE /api/customers/addresses/<uuid:pk>/
       View: SavedAddressDetailView
       Auth: IsAuthenticated
       Files: customers/views.py, customers/serializers.py
```

### Staff Authenticated Endpoints

#### **Staff Auth & Dashboard**
```
GET  /api/staff/csrf-token/
     View: StaffCSRFTokenView.get
     Auth: AllowAny
     Response: {csrfToken}
     Files: accounts/views.py

POST /api/staff/auth/login/
     View: StaffLoginView.post
     Auth: AllowAny (Rate limited: 5/min)
     Request: {username, password}
     Response: {user, staff_profile, permissions}
     Files: accounts/views.py, accounts/serializers.py

POST /api/staff/auth/logout/
     View: StaffLogoutView.post
     Auth: IsAuthenticated + IsStaff
     Response: {message}
     Files: accounts/views.py

GET  /api/staff/dashboard/
     View: StaffDashboardView.get
     Auth: IsAuthenticated + IsStaff
     Response: {overview_stats, recent_bookings, pending_payments, pending_refunds}
     Files: accounts/views.py
```

#### **Staff Booking Management**
```
GET  /api/staff/bookings/
     View: BookingManagementView.get
     Auth: IsAuthenticated + IsStaff
     Query: ?status=pending&search=BOOK123
     Response: {results: [bookings], count}
     Files: accounts/views.py

GET  /api/staff/bookings/<uuid:booking_id>/
PUT  /api/staff/bookings/<uuid:booking_id>/
     View: BookingDetailView
     Auth: IsAuthenticated + IsStaff
     Request (PUT): {status?, special_instructions?, ...}
     Response: {booking details, audit_log}
     Files: accounts/views.py, bookings/serializers.py
```

#### **Staff Customer Management**
```
GET  /api/staff/customers/
     View: CustomerManagementView.get
     Auth: IsAuthenticated + IsStaff
     Query: ?search=john@example.com
     Response: {results: [customers], count}
     Files: accounts/views.py

GET  /api/staff/customers/<int:customer_id>/
     View: CustomerDetailView.get
     Auth: IsAuthenticated + IsStaff
     Response: {customer details, booking_history, total_spent}
     Files: accounts/views.py

PUT  /api/staff/customers/<int:customer_id>/notes/
PATCH /api/staff/customers/<int:customer_id>/notes/
      View: CustomerNotesUpdateView
      Auth: IsAuthenticated + IsStaff
      Request: {internal_notes}
      Response: {updated notes}
      Files: accounts/views.py, customers/models.py
```

#### **Staff Payment & Refund Management**
```
GET  /api/payments/payments/
     View: PaymentListView.get
     Auth: IsAuthenticated + IsStaff
     Query: ?status=succeeded&booking_number=BOOK123
     Response: {results: [payments], count}
     Files: payments/views.py

GET  /api/payments/refunds/
     View: RefundListView.get
     Auth: IsAuthenticated + IsStaff
     Query: ?status=requested
     Response: {results: [refunds], count}
     Files: payments/views.py

POST /api/payments/refunds/create/
     View: RefundCreateView.post
     Auth: IsAuthenticated + IsStaff
     Request: {payment_id, amount_cents, reason}
     Response: {refund details}
     Files: payments/views.py, payments/serializers.py

POST /api/payments/refunds/process/
     View: RefundProcessView.post
     Auth: IsAuthenticated + IsStaff (admin/manager only)
     Request: {refund_id, action: "approve" or "deny"}
     Response: {refund details, stripe_refund_id}
     Files: payments/views.py, payments/services.py
```

#### **Staff Logistics Management**
```
GET  /api/logistics/summary/
     View: LogisticsSummaryView.get
     Auth: IsAuthenticated + IsStaff
     Response: {active_tasks, completed_today, pending_assignments}
     Files: logistics/views.py, logistics/services.py

POST /api/logistics/sync/
     View: sync_onfleet_status
     Auth: IsAuthenticated + IsStaff
     Response: {synced_tasks, errors}
     Files: logistics/views.py, logistics/services.py

GET  /api/logistics/tasks/
     View: TaskStatusView.get
     Auth: IsAuthenticated + IsStaff
     Response: {tasks: [...], tracking_urls: {...}}
     Files: logistics/views.py

POST /api/logistics/create-task/
     View: create_task_manually
     Auth: IsAuthenticated + IsStaff
     Request: {booking_id}
     Response: {onfleet_task details, tracking_url}
     Files: logistics/views.py, logistics/services.py

POST /api/logistics/webhook/
     View: OnfleetWebhookView.post
     Auth: CSRF Exempt (Onfleet signature verification)
     Request: Onfleet webhook payload
     Response: 200 OK
     Files: logistics/views.py
```

---

## SECTION 3: COMPLETE MODEL DOCUMENTATION

### accounts.StaffProfile
```python
class StaffProfile(models.Model):
    """Staff member profiles with role-based permissions"""
    
    # Fields
    id = UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = OneToOneField(User, on_delete=CASCADE, related_name='staff_profile')
    role = CharField(max_length=20, choices=ROLE_CHOICES)
        # Choices: 'admin', 'manager', 'operations', 'support'
    department = CharField(max_length=50, blank=True)
    hire_date = DateField(null=True, blank=True)
    phone = CharField(max_length=20, blank=True)
    is_active = BooleanField(default=True)
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
    
    # Methods
    def full_name(self) -> str
        """Returns user's full name"""
    
    def email(self) -> str
        """Returns user's email"""
    
    def can_approve_refunds(self) -> bool
        """Admins and managers can approve refunds"""
    
    def can_manage_staff(self) -> bool
        """Only admins can manage staff"""
    
    def can_view_financial_reports(self) -> bool
        """Admins and managers can view financial reports"""
    
    # Meta
    db_table = 'accounts_staff_profile'
    ordering = ['user__first_name', 'user__last_name']
```

### accounts.StaffAction
```python
class StaffAction(models.Model):
    """Audit log for staff actions"""
    
    # Fields
    id = UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    staff = ForeignKey(User, on_delete=SET_NULL, null=True, related_name='staff_actions')
    action_type = CharField(max_length=50, choices=ACTION_TYPES)
        # Choices: 'booking_created', 'booking_updated', 'booking_cancelled',
        #          'refund_approved', 'refund_denied', 'customer_note_added', etc.
    description = TextField()
    booking = ForeignKey('bookings.Booking', on_delete=SET_NULL, null=True, blank=True)
    customer = ForeignKey(User, on_delete=SET_NULL, null=True, blank=True, related_name='actions_on_customer')
    metadata = JSONField(default=dict, blank=True)
    created_at = DateTimeField(auto_now_add=True)
    
    # Meta
    db_table = 'accounts_staff_action'
    ordering = ['-created_at']
```

### bookings.Address
```python
class Address(models.Model):
    """Address for pickup/delivery - can be saved by customer or one-time"""
    
    # Fields
    id = UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = ForeignKey(User, on_delete=CASCADE, null=True, blank=True, related_name='booking_addresses')
    address_line_1 = CharField(max_length=200)
    address_line_2 = CharField(max_length=200, blank=True)
    city = CharField(max_length=100)
    state = CharField(max_length=2, choices=[('NY', 'New York'), ('CT', 'Connecticut'), ('NJ', 'New Jersey')])
    zip_code = CharField(max_length=10)
    created_at = DateTimeField(auto_now_add=True)
    
    # Meta
    db_table = 'bookings_address'
```

### bookings.GuestCheckout
```python
class GuestCheckout(models.Model):
    """Guest customer info for non-authenticated bookings"""
    
    # Fields
    id = UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    first_name = CharField(max_length=100)
    last_name = CharField(max_length=100)
    email = EmailField()
    phone = CharField(max_length=20, validators=[RegexValidator(r'^\+?1?\d{9,15}$')])
    created_at = DateTimeField(auto_now_add=True)
    
    # Meta
    db_table = 'bookings_guest_checkout'
```

### bookings.Booking
```python
class Booking(models.Model):
    """Core booking - works with customer OR guest checkout"""
    
    # Fields
    id = UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking_number = CharField(max_length=20, unique=True, blank=True)
        # Auto-generated: BOOK000001, BOOK000002, etc.
    
    # Customer (one of these required)
    customer = ForeignKey(User, on_delete=SET_NULL, null=True, blank=True, related_name='bookings')
    guest_checkout = ForeignKey(GuestCheckout, on_delete=SET_NULL, null=True, blank=True, related_name='bookings')
    
    # Service selection
    service_type = CharField(max_length=30, choices=SERVICE_TYPE_CHOICES)
        # Choices: 'mini_move', 'standard_delivery', 'specialty_item', 'blade_luggage'
    mini_move_package = ForeignKey('services.MiniMovePackage', on_delete=PROTECT, null=True, blank=True)
    specialty_items = ManyToManyField('services.SpecialtyItem', blank=True, related_name='bookings')
    
    # Organizing services (packing/unpacking)
    include_packing = BooleanField(default=False)
    include_unpacking = BooleanField(default=False)
    packing_service = ForeignKey('services.OrganizingService', on_delete=SET_NULL, null=True, blank=True, related_name='packing_bookings')
    unpacking_service = ForeignKey('services.OrganizingService', on_delete=SET_NULL, null=True, blank=True, related_name='unpacking_bookings')
    
    # Scheduling
    pickup_date = DateField()
    pickup_time = CharField(max_length=30, choices=PICKUP_TIME_CHOICES)
        # Choices: 'morning' (8-11 AM), 'morning_specific' (1-hour window), 'no_time_preference'
    specific_pickup_hour = PositiveSmallIntegerField(null=True, blank=True, validators=[MinValueValidator(8), MaxValueValidator(17)])
    is_same_day_delivery = BooleanField(default=False)
    
    # Addresses
    pickup_address = ForeignKey(Address, on_delete=PROTECT, related_name='pickup_bookings')
    delivery_address = ForeignKey(Address, on_delete=PROTECT, related_name='delivery_bookings')
    
    # Additional details
    special_instructions = TextField(blank=True)
    coi_required = BooleanField(default=False)
    is_outside_core_area = BooleanField(default=False)
    
    # BLADE luggage service fields
    blade_airport = CharField(max_length=50, blank=True, choices=[('jfk', 'JFK'), ('ewr', 'Newark'), ('lga', 'LaGuardia')])
    blade_flight_date = DateField(null=True, blank=True)
    blade_flight_time = TimeField(null=True, blank=True)
    blade_bag_count = PositiveSmallIntegerField(null=True, blank=True)
    blade_ready_time = TimeField(null=True, blank=True)
    
    # Pricing (all in cents)
    base_price_cents = PositiveBigIntegerField(default=0)
    surcharge_cents = PositiveBigIntegerField(default=0)
    same_day_surcharge_cents = PositiveBigIntegerField(default=0)
    coi_fee_cents = PositiveBigIntegerField(default=0)
    organizing_total_cents = PositiveBigIntegerField(default=0)
    geographic_surcharge_cents = PositiveBigIntegerField(default=0)
    time_window_surcharge_cents = PositiveBigIntegerField(default=0)
    organizing_tax_cents = PositiveBigIntegerField(default=0)
    total_price_cents = PositiveBigIntegerField(default=0)
    
    # Status
    status = CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
        # Choices: 'pending', 'confirmed', 'paid', 'completed', 'cancelled'
    
    # Soft delete
    deleted_at = DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
    
    # Methods
    def save(self, *args, **kwargs)
        """Auto-generates booking_number on creation"""
    
    def get_customer_name(self) -> str
        """Returns customer or guest name"""
    
    def get_customer_email(self) -> str
        """Returns customer or guest email"""
    
    @property
    def total_price_dollars(self) -> Decimal
        """Returns total price in dollars"""
    
    @property
    def organizing_total_dollars(self) -> Decimal
        """Returns organizing services total in dollars"""
    
    def get_pricing_breakdown(self) -> dict
        """Returns detailed pricing breakdown"""
    
    def get_organizing_services_breakdown(self) -> dict
        """Returns organizing services pricing details"""
    
    # Meta
    db_table = 'bookings_booking'
    
    # Constraints
    constraints = [
        CheckConstraint(
            check=(Q(customer__isnull=False, guest_checkout__isnull=True) |
                   Q(customer__isnull=True, guest_checkout__isnull=False)),
            name='booking_exactly_one_customer_type'
        )
    ]
```

### customers.CustomerProfile
```python
class CustomerProfile(models.Model):
    """Customer profile with booking statistics and preferences"""
    
    # Fields
    id = UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = OneToOneField(User, on_delete=CASCADE, related_name='customer_profile')
    phone = CharField(max_length=20, blank=True, validators=[RegexValidator(r'^\+?1?\d{9,15}$')])
    
    # Booking statistics
    total_bookings = PositiveIntegerField(default=0)
    total_spent_cents = PositiveBigIntegerField(default=0)
    last_booking_at = DateTimeField(null=True, blank=True)
    
    # Preferences
    preferred_pickup_time = CharField(max_length=30, blank=True, choices=PICKUP_TIME_CHOICES)
    email_notifications = BooleanField(default=True)
    sms_notifications = BooleanField(default=False)
    
    # Internal notes (staff only)
    internal_notes = TextField(blank=True)
    
    # VIP status
    is_vip = BooleanField(default=False)
    
    # Timestamps
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
    
    # Methods
    @property
    def total_spent_dollars(self) -> Decimal
        """Returns total spent in dollars"""
    
    def add_booking_stats(self, booking_total_cents: int)
        """Update customer statistics after booking completion"""
    
    @classmethod
    def ensure_single_profile_type(cls, user)
        """Ensure user only has one type of profile (raises ValidationError)"""
    
    def full_clean(self)
        """Validates no hybrid staff/customer profiles"""
    
    # Meta
    db_table = 'customers_customer_profile'
```

### customers.SavedAddress
```python
class SavedAddress(models.Model):
    """Customer's saved addresses"""
    
    # Fields
    id = UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = ForeignKey(User, on_delete=CASCADE, related_name='saved_addresses')
    nickname = CharField(max_length=50)
    address_line_1 = CharField(max_length=200)
    address_line_2 = CharField(max_length=200, blank=True)
    city = CharField(max_length=100)
    state = CharField(max_length=2, choices=[('NY', 'New York'), ('CT', 'Connecticut'), ('NJ', 'New Jersey')])
    zip_code = CharField(max_length=10)
    delivery_instructions = TextField(blank=True)
    times_used = PositiveIntegerField(default=0)
    last_used_at = DateTimeField(null=True, blank=True)
    is_active = BooleanField(default=True)
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
    
    # Methods
    @property
    def formatted_address(self) -> str
        """Returns full formatted address string"""
    
    def mark_used(self)
        """Increments usage counter and updates last_used_at"""
    
    # Meta
    db_table = 'customers_saved_address'
    
    # Constraints
    constraints = [
        UniqueConstraint(fields=['user', 'nickname'], name='unique_customer_address_nickname')
    ]
```

### customers.CustomerPaymentMethod
```python
class CustomerPaymentMethod(models.Model):
    """Customer's saved payment methods (Stripe)"""
    
    # Fields
    id = UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = ForeignKey(User, on_delete=CASCADE, related_name='payment_methods')
    stripe_payment_method_id = CharField(max_length=100, unique=True)
    card_brand = CharField(max_length=20)
    card_last_four = CharField(max_length=4)
    card_exp_month = PositiveSmallIntegerField()
    card_exp_year = PositiveSmallIntegerField()
    is_default = BooleanField(default=False)
    is_active = BooleanField(default=True)
    created_at = DateTimeField(auto_now_add=True)
    
    # Methods
    @property
    def display_name(self) -> str
        """Returns formatted display name (e.g., 'Visa ending in 4242')"""
    
    def save(self, *args, **kwargs)
        """Ensures only one default payment method per user"""
    
    # Meta
    db_table = 'customers_payment_method'
```

### customers.PasswordResetToken
```python
class PasswordResetToken(models.Model):
    """Password reset tokens with expiry"""
    
    # Fields
    user = ForeignKey(User, on_delete=CASCADE, related_name='password_reset_tokens')
    token = CharField(max_length=100, unique=True)
    created_at = DateTimeField(auto_now_add=True)
    expires_at = DateTimeField()
    used = BooleanField(default=False)
    
    # Methods
    @classmethod
    def create_token(cls, user)
        """Create new reset token with 1-hour expiry"""
    
    def is_valid(self) -> bool
        """Check if token is still valid and unused"""
    
    # Meta
    ordering = ['-created_at']
```

### customers.EmailVerificationToken
```python
class EmailVerificationToken(models.Model):
    """Email verification tokens for new registrations"""
    
    # Fields
    user = OneToOneField(User, on_delete=CASCADE, related_name='email_verification')
    token = CharField(max_length=100, unique=True)
    created_at = DateTimeField(auto_now_add=True)
    expires_at = DateTimeField()
    verified = BooleanField(default=False)
    
    # Methods
    @classmethod
    def create_token(cls, user)
        """Create verification token with 48-hour expiry"""
    
    def is_valid(self) -> bool
        """Check if token is still valid and unverified"""
```

### logistics.OnfleetTask
```python
class OnfleetTask(models.Model):
    """Onfleet delivery task tracking"""
    
    # Fields
    id = UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = OneToOneField('bookings.Booking', on_delete=CASCADE, related_name='onfleet_task')
    onfleet_task_id = CharField(max_length=100, unique=True)
    onfleet_short_id = CharField(max_length=20, blank=True)
    tracking_url = URLField(blank=True)
    status = CharField(max_length=20, choices=STATUS_CHOICES, default='created')
        # Choices: 'created', 'assigned', 'active', 'completed', 'failed'
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
    last_synced = DateTimeField(null=True, blank=True)
    
    # Meta
    db_table = 'logistics_onfleet_task'
    
    # Indexes
    indexes = [
        Index(fields=['onfleet_task_id']),
        Index(fields=['status'])
    ]
```

### payments.Payment
```python
class Payment(models.Model):
    """Payment records for bookings - Stripe integration"""
    
    # Fields
    id = UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = ForeignKey('bookings.Booking', on_delete=PROTECT, related_name='payments')
    customer = ForeignKey(User, on_delete=SET_NULL, null=True, blank=True, related_name='payments')
    amount_cents = PositiveBigIntegerField()
    stripe_payment_intent_id = CharField(max_length=200, blank=True)
    stripe_charge_id = CharField(max_length=200, blank=True)
    status = CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
        # Choices: 'pending', 'succeeded', 'failed', 'refunded'
    failure_reason = TextField(blank=True)
    processed_at = DateTimeField(null=True, blank=True)
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
    
    # Methods
    @property
    def amount_dollars(self) -> Decimal
        """Returns amount in dollars"""
    
    # Meta
    db_table = 'payments_payment'
```

### payments.Refund
```python
class Refund(models.Model):
    """Refund requests with approval workflow"""
    
    # Fields
    id = UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    payment = ForeignKey(Payment, on_delete=PROTECT, related_name='refunds')
    amount_cents = PositiveBigIntegerField()
    reason = TextField()
    requested_by = ForeignKey(User, on_delete=PROTECT, related_name='requested_refunds')
    approved_by = ForeignKey(User, on_delete=PROTECT, null=True, blank=True, related_name='approved_refunds')
    status = CharField(max_length=20, choices=STATUS_CHOICES, default='requested')
        # Choices: 'requested', 'approved', 'denied', 'completed'
    stripe_refund_id = CharField(max_length=200, blank=True)
    approved_at = DateTimeField(null=True, blank=True)
    completed_at = DateTimeField(null=True, blank=True)
    created_at = DateTimeField(auto_now_add=True)
    
    # Methods
    @property
    def amount_dollars(self) -> Decimal
        """Returns amount in dollars"""
    
    def approve(self, admin_user)
        """Admin approves refund"""
    
    # Meta
    db_table = 'payments_refund'
```

### payments.PaymentAudit
```python
class PaymentAudit(models.Model):
    """Audit log for financial compliance"""
    
    # Fields
    id = UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    action = CharField(max_length=30, choices=ACTION_CHOICES)
        # Choices: 'payment_created', 'payment_succeeded', 'payment_failed',
        #          'refund_requested', 'refund_approved', 'refund_completed'
    description = TextField()
    payment = ForeignKey(Payment, on_delete=CASCADE, null=True, blank=True)
    refund = ForeignKey(Refund, on_delete=CASCADE, null=True, blank=True)
    user = ForeignKey(User, on_delete=SET_NULL, null=True, blank=True)
    created_at = DateTimeField(auto_now_add=True)
    
    # Methods
    @classmethod
    def log(cls, action, description, payment=None, refund=None, user=None)
        """Simple audit logging"""
    
    # Meta
    db_table = 'payments_audit'
    ordering = ['-created_at']
```

### services.MiniMovePackage
```python
class MiniMovePackage(models.Model):
    """Mini Move service packages (Petite, Standard, Full Move)"""
    
    # Fields
    id = UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    package_type = CharField(max_length=20, choices=PACKAGE_TYPES, unique=True)
        # Choices: 'petite', 'standard', 'full'
    name = CharField(max_length=50)
    description = TextField()
    base_price_cents = PositiveBigIntegerField()
    max_items = PositiveIntegerField(null=True, blank=True)  # null = unlimited (Full Move)
    max_weight_per_item_lbs = PositiveIntegerField(default=50)
    coi_included = BooleanField(default=False)
    coi_fee_cents = PositiveBigIntegerField(default=5000)
    priority_scheduling = BooleanField(default=False)
    protective_wrapping = BooleanField(default=False)
    is_most_popular = BooleanField(default=False)
    is_active = BooleanField(default=True)
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
    
    # Methods
    @property
    def base_price_dollars(self) -> Decimal
        """Returns base price in dollars"""
    
    @property
    def coi_fee_dollars(self) -> Decimal
        """Returns COI fee in dollars"""
    
    # Meta
    db_table = 'services_mini_move_package'
    ordering = ['base_price_cents']
```

### services.OrganizingService
```python
class OrganizingService(models.Model):
    """Professional packing/unpacking services tied to Mini Move tiers"""
    
    # Fields
    id = UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    service_type = CharField(max_length=30, choices=ORGANIZING_TYPES, unique=True)
        # Choices: 'petite_packing', 'standard_packing', 'full_packing',
        #          'petite_unpacking', 'standard_unpacking', 'full_unpacking'
    mini_move_tier = CharField(max_length=20, choices=MINI_MOVE_TIERS)
        # Choices: 'petite', 'standard', 'full'
    name = CharField(max_length=100)
    description = TextField(blank=True)
    price_cents = PositiveBigIntegerField()
    duration_hours = PositiveIntegerField()
    organizer_count = PositiveIntegerField()
    supplies_allowance_cents = PositiveBigIntegerField(default=0)
    is_packing_service = BooleanField()  # True = packing, False = unpacking
    is_active = BooleanField(default=True)
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
    
    # Methods
    @property
    def price_dollars(self) -> Decimal
        """Returns price in dollars"""
    
    @property
    def supplies_allowance_dollars(self) -> Decimal
        """Returns supplies allowance in dollars"""
    
    def can_be_added_to_mini_move(self, mini_move_package_type: str) -> bool
        """Check if this organizing service can be added to a specific mini move tier"""
    
    # Meta
    db_table = 'services_organizing_service'
    ordering = ['mini_move_tier', 'is_packing_service', 'price_cents']
```

### services.StandardDeliveryConfig
```python
class StandardDeliveryConfig(models.Model):
    """Configuration for Standard Delivery per-item pricing"""
    
    # Fields
    id = UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    price_per_item_cents = PositiveBigIntegerField(default=7500)  # $75 per item
    minimum_items = PositiveIntegerField(default=3)
    minimum_charge_cents = PositiveBigIntegerField(default=24000)  # $240 minimum
    same_day_flat_rate_cents = PositiveBigIntegerField(default=36000)  # $360 same-day
    max_weight_per_item_lbs = PositiveIntegerField(default=50)
    is_active = BooleanField(default=True)
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
    
    # Methods
    @property
    def price_per_item_dollars(self) -> Decimal
    @property
    def minimum_charge_dollars(self) -> Decimal
    @property
    def same_day_flat_rate_dollars(self) -> Decimal
    
    def calculate_price(self, item_count: int, is_same_day: bool) -> int
        """Calculate total price in cents for given items"""
    
    # Meta
    db_table = 'services_standard_delivery_config'
```

### services.SpecialtyItem
```python
class SpecialtyItem(models.Model):
    """Special handling items with premium pricing"""
    
    # Fields
    id = UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    item_type = CharField(max_length=30, choices=ITEM_TYPES, unique=True)
        # Choices: 'bike', 'piano', 'golf_clubs', 'skis', 'surfboard', 'art', 'antiques'
    name = CharField(max_length=100)
    description = TextField(blank=True)
    price_cents = PositiveBigIntegerField()
    special_handling = BooleanField(default=True)
    is_active = BooleanField(default=True)
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
    
    # Methods
    @property
    def price_dollars(self) -> Decimal
        """Returns price in dollars"""
    
    # Meta
    db_table = 'services_specialty_item'
```

### services.SurchargeRule
```python
class SurchargeRule(models.Model):
    """Weekend, holiday, geographic, and time-window surcharges"""
    
    # Fields
    id = UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    surcharge_type = CharField(max_length=20, choices=SURCHARGE_TYPES)
        # Choices: 'weekend', 'holiday', 'peak_date', 'geographic', 'time_window'
    name = CharField(max_length=100)
    description = TextField(blank=True)
    applies_to_service_type = CharField(max_length=20, choices=SERVICE_TYPE_CHOICES, default='all')
        # Choices: 'all', 'mini_move', 'standard_delivery', 'specialty_item'
    calculation_type = CharField(max_length=20, choices=CALCULATION_TYPES)
        # Choices: 'percentage', 'fixed_amount'
    percentage = DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    fixed_amount_cents = PositiveBigIntegerField(null=True, blank=True)
    specific_date = DateField(null=True, blank=True)
    applies_saturday = BooleanField(default=False)
    applies_sunday = BooleanField(default=False)
    is_active = BooleanField(default=True)
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
    
    # Methods
    @property
    def fixed_amount_dollars(self) -> Decimal
        """Returns fixed amount in dollars if applicable"""
    
    def applies_to_date(self, date: date) -> bool
        """Check if surcharge applies to given date"""
    
    def calculate_surcharge(self, base_amount_cents: int) -> int
        """Calculate surcharge amount in cents"""
    
    # Meta
    db_table = 'services_surcharge_rule'
```

---

## SECTION 4: FILE DIRECTORY + PURPOSE INDEX

### Configuration & Root Files
```
.dockerignore                  - Docker build exclusions
.gitignore                     - Git version control exclusions
Dockerfile                     - Production Docker image definition
Dockerfile.prod                - Production-optimized Docker build
docker-compose.yml             - Development multi-container setup
docker-compose.prod.yml        - Production multi-container setup
fly.toml                       - Fly.io deployment configuration
gunicorn.conf.py               - Gunicorn WSGI server settings
manage.py                      - Django management CLI entry point
pyproject.toml                 - Python project metadata and tooling
pytest.ini                     - Pytest testing configuration
requirements.txt               - Python dependencies list
recreate_services.py           - Service catalog seeding script
cookies.txt                    - Staff session cookies (dev testing)
staff_cookies.txt              - Staff cookies backup (dev testing)
```

### Django Project Settings (config/)
```
config/
├── __init__.py                - Celery app initialization
├── asgi.py                    - ASGI application entry point
├── celery.py                  - Celery configuration and task discovery
├── settings.py                - Django settings (DB, middleware, apps, CORS, REST_FRAMEWORK)
├── urls.py                    - Root URL routing configuration
└── wsgi.py                    - WSGI application entry point
```

### Apps - accounts (Staff Management)
```
apps/accounts/
├── migrations/
│   ├── 0001_initial.py                        - Initial StaffProfile and StaffAction models
│   └── 0002_alter_staffaction_action_type.py  - Updated action type choices
├── __init__.py                                - App initialization
├── admin.py                                   - Django admin for StaffProfile, StaffAction
├── apps.py                                    - App configuration
├── models.py                                  - StaffProfile (with permissions), StaffAction (audit log)
├── serializers.py                             - StaffLoginSerializer, StaffProfileSerializer, StaffActionSerializer
├── tests.py                                   - Test suite (placeholder)
├── urls.py                                    - Staff API endpoints (auth, dashboard, bookings, customers)
└── views.py                                   - Staff views (login, dashboard, booking management, customer management)
```

### Apps - bookings (Core Booking Engine)
```
apps/bookings/
├── management/commands/
│   └── wipe_all_bookings.py                   - Management command to delete all bookings (dev tool)
├── migrations/
│   ├── 0001_initial.py                        - Initial Booking, Address, GuestCheckout models
│   ├── 0002_booking_include_packing.py        - Added organizing service fields
│   ├── 0003_booking_geographic_surcharge.py   - Added surcharge tracking fields
│   └── 0004_booking_blade_airport.py          - Added BLADE luggage service fields
├── __init__.py                                - App initialization
├── admin.py                                   - Django admin for Booking, Address, GuestCheckout
├── apps.py                                    - App configuration
├── models.py                                  - Booking (core booking model), Address, GuestCheckout
├── serializers.py                             - BookingSerializer, GuestBookingCreateSerializer, PricingPreviewSerializer
├── tests.py                                   - Test suite (placeholder)
├── urls.py                                    - Public booking endpoints (service catalog, guest booking, status lookup)
└── views.py                                   - Booking views (service catalog, pricing, guest booking, availability)
```

### Apps - crm (Customer Relationship Management - Placeholder)
```
apps/crm/
├── migrations/                                - Empty migrations directory
├── __init__.py                                - App initialization
├── admin.py                                   - Admin configuration (empty)
├── apps.py                                    - App configuration
├── models.py                                  - Models (placeholder)
├── tests.py                                   - Tests (placeholder)
└── views.py                                   - Views (placeholder)
```

### Apps - customers (Customer Authentication & Profiles)
```
apps/customers/
├── management/commands/
│   └── clean_delete_user.py                   - Management command to safely delete users
├── migrations/
│   ├── 0001_initial.py                        - Initial CustomerProfile, SavedAddress, CustomerPaymentMethod
│   ├── 0002_alter_customerprofile.py          - Updated profile fields
│   ├── 0003_passwordresettoken.py             - Added password reset functionality
│   └── 0004_emailverificationtoken.py         - Added email verification
├── __init__.py                                - App initialization
├── admin.py                                   - Custom UserAdmin with CustomerProfile inline
├── apps.py                                    - App configuration
├── authentication.py                          - HybridAuthentication (JWT + Session) class
├── booking_serializers.py                     - CustomerBookingSerializer, QuickBookingSerializer
├── booking_views.py                           - Customer booking views (create, detail, rebook)
├── emails.py                                  - Email sending utilities (password reset, verification)
├── models.py                                  - CustomerProfile, SavedAddress, CustomerPaymentMethod, PasswordResetToken, EmailVerificationToken
├── serializers.py                             - Customer serializers (registration, login, profile, addresses)
├── tests.py                                   - Test suite (placeholder)
├── urls.py                                    - Customer API endpoints (auth, profile, bookings, addresses)
└── views.py                                   - Customer views (auth, profile, dashboard, addresses)
```

### Apps - documents (Document Management - Placeholder)
```
apps/documents/
├── migrations/                                - Empty migrations directory
├── __init__.py                                - App initialization
├── admin.py                                   - Admin configuration (empty)
├── apps.py                                    - App configuration
├── models.py                                  - Models (placeholder)
├── tests.py                                   - Tests (placeholder)
└── views.py                                   - Views (placeholder)
```

### Apps - logistics (Onfleet Delivery Tracking)
```
apps/logistics/
├── migrations/
│   └── 0001_initial.py                        - Initial OnfleetTask model
├── __init__.py                                - App initialization
├── admin.py                                   - Admin configuration (empty)
├── apps.py                                    - App configuration
├── models.py                                  - OnfleetTask (delivery tracking)
├── services.py                                - ToteTaxiOnfleetIntegration service class
├── tests.py                                   - Test suite (placeholder)
├── urls.py                                    - Logistics API endpoints (summary, sync, tasks, webhook)
└── views.py                                   - Logistics views (dashboard summary, task management, webhook handler)
```

### Apps - notifications (Email/SMS - Placeholder)
```
apps/notifications/
├── migrations/                                - Empty migrations directory
├── __init__.py                                - App initialization
├── admin.py                                   - Admin configuration (empty)
├── apps.py                                    - App configuration
├── models.py                                  - Models (placeholder)
├── tests.py                                   - Tests (placeholder)
└── views.py                                   - Views (placeholder)
```

### Apps - payments (Payment Processing & Refunds)
```
apps/payments/
├── migrations/
│   └── 0001_initial.py                        - Initial Payment, Refund, PaymentAudit models
├── __init__.py                                - App initialization
├── admin.py                                   - Django admin for Payment, Refund, PaymentAudit
├── apps.py                                    - App configuration
├── models.py                                  - Payment, Refund, PaymentAudit
├── serializers.py                             - Payment serializers (intent, confirm, refund)
├── services.py                                - StripePaymentService (Stripe API integration)
├── tests.py                                   - Test suite (placeholder)
├── urls.py                                    - Payment API endpoints (intent, status, confirm, webhook, refunds)
└── views.py                                   - Payment views (intent creation, webhook, refund management)
```

### Apps - services (Service Catalog Management)
```
apps/services/
├── management/commands/                       - Empty commands directory
├── migrations/
│   ├── 0001_initial.py                        - Initial service models
│   ├── 0002_organizingservice.py              - Added organizing services
│   ├── 0003_populate_organizing_services.py   - Data migration to populate organizing services
│   ├── 0004_surchargerule_applies_to.py       - Added service type filter to surcharges
│   ├── 0005_remove_van_schedule.py            - Removed deprecated van scheduling
│   └── 0006_remove_specialtyitem_van.py       - Removed van requirement from specialty items
├── __init__.py                                - App initialization
├── admin.py                                   - Django admin for all service models
├── apps.py                                    - App configuration
├── models.py                                  - MiniMovePackage, OrganizingService, StandardDeliveryConfig, SpecialtyItem, SurchargeRule
├── serializers.py                             - Service serializers (catalog, packages, organizing, specialty, surcharges)
├── tests.py                                   - Test suite (placeholder)
└── views.py                                   - Views (placeholder - services accessed via bookings app)
```

### Scripts & Utilities
```
scripts/
├── back_export.py             - Auto-generates backend code snapshot (back_export.txt)
├── back_export.txt            - Complete backend codebase snapshot (THIS IS SOURCE OF TRUTH)
└── entrypoint.sh              - Docker entrypoint script (DB wait, migrations, collectstatic, server start)
```

---

## SECTION 5: FEATURE-TO-FILE DEPENDENCY MAPS

### Guest Booking Flow (No Authentication)
```
Entry Point: POST /api/bookings/guest-booking/

Execution Chain:
1. bookings/views.py (GuestBookingCreateView.post)
   └─ Request validation and booking creation
2. bookings/serializers.py (GuestBookingCreateSerializer.validate)
   └─ Validates service selections, dates, addresses
3. bookings/models.py (Booking.save)
   └─ Auto-generates booking_number, calculates pricing
4. services/models.py (MiniMovePackage, OrganizingService, SurchargeRule)
   └─ Retrieves pricing configuration
5. payments/services.py (StripePaymentService.create_payment_intent)
   └─ Creates Stripe payment intent if payment required

Dependencies:
- Service catalog (services app)
- Address validation (bookings app)
- Stripe API (external)

Side Effects:
- Creates Booking record
- Creates GuestCheckout record
- Creates Address records
- Creates Payment record (if immediate payment)
- Sends booking confirmation email (notifications app - future)

Files to Request:
- bookings/views.py
- bookings/serializers.py
- bookings/models.py
- services/models.py
- payments/services.py
```

### Customer Authenticated Booking Flow
```
Entry Point: POST /api/customers/bookings/create/

Execution Chain:
1. customers/booking_views.py (CustomerBookingCreateView.post)
   └─ Authentication check, customer-specific booking
2. customers/booking_serializers.py (CustomerBookingSerializer.validate)
   └─ Validates service selections, handles saved addresses
3. customers/models.py (SavedAddress.mark_used)
   └─ Updates address usage statistics if saved address used
4. bookings/models.py (Booking.save)
   └─ Links to customer, calculates pricing
5. customers/models.py (CustomerProfile.add_booking_stats)
   └─ Updates customer statistics after completion

Dependencies:
- Customer authentication (JWT or session)
- Saved addresses (customers app)
- Service catalog (services app)

Side Effects:
- Creates Booking record linked to customer
- Updates SavedAddress usage stats
- Creates Payment record
- Updates CustomerProfile stats after payment

Files to Request:
- customers/booking_views.py
- customers/booking_serializers.py
- customers/models.py
- bookings/models.py
- payments/services.py
```

### Payment Processing (Stripe Integration)
```
Entry Point: POST /api/payments/create-intent/

Execution Chain:
1. payments/views.py (PaymentIntentCreateView.post)
   └─ Validates booking exists and unpaid
2. payments/serializers.py (PaymentIntentCreateSerializer.validate_booking_id)
   └─ Checks booking status
3. payments/services.py (StripePaymentService.create_payment_intent)
   └─ Calls Stripe API to create payment intent
4. payments/models.py (Payment.objects.create)
   └─ Records payment attempt
5. payments/models.py (PaymentAudit.log)
   └─ Logs payment creation for audit trail

Payment Confirmation:
1. Frontend collects payment → Stripe processes
2. Stripe webhook → POST /api/payments/webhook/
3. payments/views.py (StripeWebhookView.post)
   └─ Verifies Stripe signature, processes event
4. payments/services.py (StripePaymentService.handle_payment_intent_succeeded)
   └─ Updates Payment and Booking status
5. bookings/models.py (Booking.status = 'paid')
   └─ Marks booking as paid

Dependencies:
- Stripe API (external)
- Booking model (bookings app)
- Webhook signature verification

Side Effects:
- Creates Payment record
- Updates Payment status on confirmation
- Updates Booking status to 'paid'
- Creates PaymentAudit entries
- Triggers Onfleet task creation (logistics app)

Files to Request:
- payments/views.py
- payments/services.py
- payments/models.py
- bookings/models.py
```

### Refund Workflow
```
Entry Point: POST /api/payments/refunds/create/

Request Refund:
1. payments/views.py (RefundCreateView.post)
   └─ Staff creates refund request
2. payments/serializers.py (RefundCreateSerializer.validate)
   └─ Validates payment exists and succeeded
3. payments/models.py (Refund.objects.create)
   └─ Creates refund in 'requested' status
4. payments/models.py (PaymentAudit.log)
   └─ Logs refund request

Approve & Process:
1. POST /api/payments/refunds/process/
2. payments/views.py (RefundProcessView.post)
   └─ Admin/manager approves or denies
3. payments/services.py (StripePaymentService.process_refund)
   └─ If approved, calls Stripe API
4. payments/models.py (Refund.approve)
   └─ Updates status to 'approved' then 'completed'
5. payments/models.py (Payment.status = 'refunded')
   └─ Updates original payment status

Dependencies:
- Stripe API (external)
- Staff permissions (accounts app)
- Payment audit logging

Side Effects:
- Creates Refund record
- Updates Payment status
- Creates multiple PaymentAudit entries
- May update Booking status

Files to Request:
- payments/views.py
- payments/services.py
- payments/models.py
- accounts/models.py (for permission checks)
```

### Staff Dashboard & Management
```
Entry Point: GET /api/staff/dashboard/

Execution Chain:
1. accounts/views.py (StaffDashboardView.get)
   └─ Checks staff authentication
2. accounts/models.py (StaffProfile - permission checks)
   └─ Verifies staff role and permissions
3. bookings/models.py (Booking.objects.filter)
   └─ Aggregates booking statistics
4. payments/models.py (Payment.objects.filter)
   └─ Aggregates payment statistics
5. payments/models.py (Refund.objects.filter)
   └─ Lists pending refunds

Booking Management:
1. GET /api/staff/bookings/
2. accounts/views.py (BookingManagementView.get)
   └─ Lists all bookings with search/filter
3. GET /api/staff/bookings/<booking_id>/
4. accounts/views.py (BookingDetailView.get)
   └─ Detailed booking view with edit capability

Dependencies:
- Staff session authentication
- Role-based permissions
- All data models

Side Effects:
- Creates StaffAction audit logs on edits
- Updates booking status
- May trigger notifications

Files to Request:
- accounts/views.py
- accounts/models.py
- bookings/models.py
- payments/models.py
```

### Service Catalog & Pricing
```
Entry Point: GET /api/bookings/services/

Execution Chain:
1. bookings/views.py (ServiceCatalogView.get)
   └─ No authentication required
2. services/models.py (MiniMovePackage.objects.filter)
   └─ Retrieves active mini move packages
3. services/models.py (OrganizingService.objects.filter)
   └─ Retrieves active organizing services
4. services/models.py (SpecialtyItem.objects.filter)
   └─ Retrieves active specialty items
5. services/models.py (StandardDeliveryConfig.objects.first)
   └─ Retrieves standard delivery configuration
6. services/serializers.py (ServiceCatalogSerializer)
   └─ Formats response with all service options

Pricing Preview:
1. POST /api/bookings/pricing-preview/
2. bookings/views.py (PricingPreviewView.post)
3. bookings/serializers.py (PricingPreviewSerializer.validate)
4. services/models.py (SurchargeRule.calculate_surcharge)
   └─ Applies applicable surcharges
5. Response: {total_price_dollars, breakdown, surcharges_applied}

Dependencies:
- Service catalog configuration (Django admin)
- Surcharge rules

Side Effects:
- None (read-only operations)

Files to Request:
- bookings/views.py
- services/models.py
- services/serializers.py
```

### Onfleet Task Management (Logistics)
```
Entry Point: POST /api/logistics/create-task/

Execution Chain:
1. logistics/views.py (create_task_manually)
   └─ Staff creates Onfleet task for booking
2. logistics/services.py (ToteTaxiOnfleetIntegration.create_task)
   └─ Calls Onfleet API
3. logistics/models.py (OnfleetTask.objects.create)
   └─ Stores task details and tracking URL
4. bookings/models.py (Booking.onfleet_task)
   └─ Links task to booking

Webhook Updates:
1. POST /api/logistics/webhook/ (from Onfleet)
2. logistics/views.py (OnfleetWebhookView.post)
   └─ Receives task status updates
3. logistics/models.py (OnfleetTask.update)
   └─ Updates task status

Dependencies:
- Onfleet API (external)
- Booking completion (bookings app)
- Staff permissions

Side Effects:
- Creates OnfleetTask record
- Updates booking status
- Sends tracking URL to customer

Files to Request:
- logistics/views.py
- logistics/services.py
- logistics/models.py
```

---

## SECTION 6: BUSINESS LOGIC LOCATION INDEX

### Pricing & Revenue Calculations

**Dynamic Booking Pricing:**
```
Location: bookings/models.py → Booking.save()
Logic: Calculates total_price_cents based on service type, surcharges, organizing services
Used By: All booking creation endpoints

Location: bookings/models.py → Booking.get_pricing_breakdown()
Logic: Returns detailed pricing breakdown dictionary
Used By: Booking serializers, frontend display

Location: services/models.py → SurchargeRule.calculate_surcharge()
Logic: Applies percentage or fixed amount surcharges
Used By: Booking pricing calculations

Location: services/models.py → StandardDeliveryConfig.calculate_price()
Logic: Per-item delivery pricing with minimum charge
Used By: Standard delivery bookings
```

**Service Pricing Configuration:**
```
Location: services/models.py → MiniMovePackage (model properties)
Logic: base_price_dollars, coi_fee_dollars property conversions
Used By: Service catalog, booking serializers

Location: services/models.py → OrganizingService (model properties)
Logic: price_dollars, supplies_allowance_dollars conversions
Used By: Organizing service add-ons
```

### Authentication & Permissions

**Hybrid Authentication (JWT + Session):**
```
Location: customers/authentication.py → HybridAuthentication
Logic: Supports both JWT tokens (customers) and session cookies (staff)
Used By: REST_FRAMEWORK authentication in settings.py
Pattern: Tries JWT first, falls back to session authentication

Location: customers/models.py → CustomerProfile.ensure_single_profile_type()
Logic: Prevents users from having both staff and customer profiles
Used By: Customer registration, staff creation
```

**Staff Permission Checks:**
```
Location: accounts/models.py → StaffProfile.can_approve_refunds()
Logic: Role-based permission (admin, manager)
Used By: Refund processing endpoints

Location: accounts/models.py → StaffProfile.can_manage_staff()
Logic: Only admins can manage staff
Used By: Staff management endpoints

Location: accounts/models.py → StaffProfile.can_view_financial_reports()
Logic: Admins and managers only
Used By: Financial dashboard endpoints
```

**Token-Based Flows:**
```
Location: customers/models.py → PasswordResetToken.create_token()
Logic: Generates secure token with 1-hour expiry
Used By: Password reset flow

Location: customers/models.py → EmailVerificationToken.create_token()
Logic: Generates verification token with 48-hour expiry
Used By: Email verification flow
```

### Booking State Management

**Booking Status Transitions:**
```
Location: bookings/models.py → Booking.status field
States: pending → confirmed → paid → completed/cancelled
Logic: Status updated by different events:
  - confirmed: Staff manual confirmation
  - paid: Payment success webhook
  - completed: Onfleet task completion or staff action
  - cancelled: Customer/staff cancellation
Used By: All booking management endpoints
```

**Booking Number Generation:**
```
Location: bookings/models.py → Booking.save()
Logic: Auto-increments BOOK000001, BOOK000002, etc.
Pattern: Fetches last booking, increments number, zero-pads to 6 digits
Used By: All booking creation
```

### Payment Processing Logic

**Stripe Payment Intent Flow:**
```
Location: payments/services.py → StripePaymentService.create_payment_intent()
Logic: Creates Stripe payment intent with booking total
Used By: Payment intent creation endpoint

Location: payments/services.py → StripePaymentService.handle_payment_intent_succeeded()
Logic: Updates Payment and Booking status on success
Used By: Stripe webhook handler

Location: payments/services.py → StripePaymentService.process_refund()
Logic: Processes Stripe refund after admin approval
Used By: Refund processing endpoint
```

**Payment Audit Logging:**
```
Location: payments/models.py → PaymentAudit.log()
Logic: Simple audit log creation for all payment events
Used By: All payment and refund operations
Pattern: PaymentAudit.log('payment_created', description, payment, user)
```

### Address Management

**Saved Address Tracking:**
```
Location: customers/models.py → SavedAddress.mark_used()
Logic: Increments times_used, updates last_used_at
Used By: Customer booking creation when using saved address

Location: customers/models.py → SavedAddress.formatted_address property
Logic: Formats address into single string
Used By: Address display in serializers
```

**Address Creation from Booking:**
```
Location: customers/booking_serializers.py → _get_or_create_address()
Logic: Reuses saved address or creates new one, optionally saves for future
Used By: Customer booking creation
```

### Service Catalog Logic

**Organizing Service Tier Matching:**
```
Location: services/models.py → OrganizingService.can_be_added_to_mini_move()
Logic: Checks if organizing service tier matches mini move tier
Used By: Booking validation
Pattern: petite_packing can only be added to petite mini move

Location: services/serializers.py → MiniMoveWithOrganizingSerializer
Logic: Joins mini move packages with their valid organizing options
Used By: Service catalog endpoint
```

**Surcharge Application:**
```
Location: services/models.py → SurchargeRule.applies_to_date()
Logic: Checks if surcharge applies to given pickup date
Rules: Weekend surcharges (Saturday/Sunday), specific dates, holidays
Used By: Booking pricing calculations

Location: services/models.py → SurchargeRule.applies_to_service_type
Logic: Filters surcharges by service type (mini_move, standard_delivery, etc.)
Used By: Pricing preview and booking creation
```

### Statistics & Aggregations

**Customer Booking Statistics:**
```
Location: customers/models.py → CustomerProfile.add_booking_stats()
Logic: Increments total_bookings, adds to total_spent_cents, updates last_booking_at
Used By: Booking completion (after payment success)

Location: customers/models.py → CustomerProfile.total_spent_dollars property
Logic: Converts cents to dollars
Used By: Customer profile displays
```

**Staff Dashboard Aggregations:**
```
Location: accounts/views.py → StaffDashboardView.get()
Logic: Aggregates booking counts by status, pending payments, pending refunds
Query: Uses Django ORM Count() and filter() aggregations
Used By: Staff dashboard endpoint
```

### Logistics Integration

**Onfleet Task Creation:**
```
Location: logistics/services.py → ToteTaxiOnfleetIntegration.create_task()
Logic: Formats booking data for Onfleet API, creates delivery task
Used By: Automatic task creation after payment or manual staff creation
Mock: Development mode uses simulated Onfleet responses

Location: logistics/services.py → ToteTaxiOnfleetIntegration.sync_task_status()
Logic: Fetches task status from Onfleet API
Used By: Manual sync and scheduled Celery task (future)
```

---

## SECTION 7: INTEGRATION & TECH STACK SUMMARY

### Infrastructure

**Database:**
```
PostgreSQL 16 (production) / PostgreSQL Alpine (development)
Configuration: config/settings.py → DATABASES
Connection: Via DATABASE_URL environment variable (Fly.io) or individual params (local)
Connection Pooling: conn_max_age=600, conn_health_checks=True
Default Port: 5435 (local), 5432 (production)
```

**Cache & Sessions:**
```
Redis 7 (for rate limiting and Celery)
Configuration: config/settings.py → CACHES
Backend: django_redis.cache.RedisCache
Connection: Via REDIS_URL environment variable
Default Port: 6382 (local), 6379 (production)
Session Storage: Database-backed sessions (SESSION_ENGINE = 'django.contrib.sessions.backends.db')
```

**Task Queue:**
```
Celery 5.5.3 with Redis broker
Configuration: config/celery.py, config/settings.py → CELERY_*
Beat Scheduler: Django Celery Beat (database-backed periodic tasks)
Task Discovery: Auto-discovers tasks from all installed apps
```

**File Storage:**
```
Development: Local filesystem (MEDIA_ROOT = BASE_DIR / 'media')
Production: AWS S3 with boto3 + django-storages
Static Files: WhiteNoise for compressed static serving
```

**Web Server:**
```
Development: Django runserver (0.0.0.0:8000)
Production: Gunicorn with sync workers
Workers: (CPU count * 2) + 1
Timeout: 30 seconds
Max Requests: 1000 (with 100 jitter)
```

### External Service Integrations

**Stripe API (Payment Processing):**
```
Implementation: payments/services.py → StripePaymentService
API Key: STRIPE_SECRET_KEY (environment variable)
Webhook Secret: STRIPE_WEBHOOK_SECRET (environment variable)
Operations:
  - Create payment intent: stripe.PaymentIntent.create()
  - Process refund: stripe.Refund.create()
  - Webhook verification: stripe.Webhook.construct_event()
Mock Mode: payments/views.py → MockPaymentConfirmView (development only)
```

**Onfleet API (Delivery Tracking):**
```
Implementation: logistics/services.py → ToteTaxiOnfleetIntegration
API Key: ONFLEET_API_KEY (environment variable)
Webhook Secret: ONFLEET_WEBHOOK_SECRET (environment variable)
Operations:
  - Create task: POST /tasks
  - Get task status: GET /tasks/{task_id}
  - Webhook handler: logistics/views.py → OnfleetWebhookView
Mock Mode: Development uses simulated responses
```

**AWS S3 (File Storage - Production):**
```
Implementation: django-storages with boto3
Configuration: config/settings.py → AWS_* settings
Environment Variables:
  - AWS_ACCESS_KEY_ID
  - AWS_SECRET_ACCESS_KEY
  - AWS_STORAGE_BUCKET_NAME
Usage: Media files (COI documents, invoices - future)
```

**AWS SES (Email - Production):**
```
Implementation: Django email backend
Configuration: config/settings.py → EMAIL_* settings
Development: Console email backend (prints to terminal)
Production: django-ses or SMTP backend
Operations:
  - Password reset emails: customers/emails.py
  - Email verification: customers/emails.py
  - Booking confirmations: (future implementation)
```

**SendGrid (Alternative Email - Optional):**
```
Configuration: Can replace SES via EMAIL_HOST settings
API Key: SENDGRID_API_KEY (environment variable)
Not currently implemented but compatible
```

### Key Configuration Values

**Authentication & Sessions:**
```
JWT_EXPIRY: Not explicitly configured (using default REST framework JWT)
SESSION_COOKIE_AGE: 2592000 seconds (30 days)
SESSION_COOKIE_NAME: 'totetaxi_sessionid'
CSRF_COOKIE_NAME: 'csrftoken'
```

**CORS & Security:**
```
CORS_ALLOWED_ORIGINS: 
  - http://localhost:3000 (development)
  - https://totetaxi.netlify.app (production frontend)
  - Fly.io URLs (if FLY_APP_NAME set)

CORS_ALLOW_CREDENTIALS: True

CSRF_TRUSTED_ORIGINS: Same as CORS origins

SECURE_SSL_REDIRECT: True (production only)
SECURE_HSTS_SECONDS: 31536000 (1 year, production only)
```

**Rate Limiting:**
```
RATELIMIT_USE_CACHE: 'default' (Redis)
RATELIMIT_ENABLE: True
Staff Login: 5 requests per minute per IP
Customer Login: 5 requests per minute per IP
```

**Pagination:**
```
REST_FRAMEWORK PAGE_SIZE: 20 items per page
Pagination Class: PageNumberPagination
```

**Payment Configuration:**
```
STRIPE_SECRET_KEY: sk_test_* (test) / sk_live_* (production)
STRIPE_WEBHOOK_SECRET: whsec_* (environment variable)
Payment amounts: Always stored in cents (integer)
```

**Frontend Integration:**
```
FRONTEND_URL: https://totetaxi.netlify.app (for email links)
Development: http://localhost:3000
```

### Environment Variables Required

**Required for All Environments:**
```
SECRET_KEY                 - Django secret key
DATABASE_URL               - PostgreSQL connection string
REDIS_URL                  - Redis connection string
DEBUG                      - Boolean (True/False)
ALLOWED_HOSTS              - Comma-separated list
```

**Required for Production:**
```
STRIPE_SECRET_KEY          - Stripe API key
STRIPE_WEBHOOK_SECRET      - Stripe webhook signing secret
ONFLEET_API_KEY            - Onfleet API key
ONFLEET_WEBHOOK_SECRET     - Onfleet webhook secret
AWS_ACCESS_KEY_ID          - AWS S3 access key
AWS_SECRET_ACCESS_KEY      - AWS S3 secret key
AWS_STORAGE_BUCKET_NAME    - S3 bucket name
EMAIL_HOST_USER            - Email service username
EMAIL_HOST_PASSWORD        - Email service password
FLY_APP_NAME               - Fly.io app name (if deploying to Fly.io)
```

**Optional:**
```
CORS_ALLOWED_ORIGINS       - Override default CORS origins
FRONTEND_URL               - Override frontend URL for emails
CELERY_BROKER_URL          - Override Redis URL for Celery
```

### Deployment Configuration

**Fly.io (Production):**
```
Configuration: fly.toml
Region: ewr (Newark)
Machine: shared-cpu-1x, 1GB RAM
Release Command: python manage.py migrate --noinput
Port: 8000 (internal)
Auto-scaling: min 1 machine
```

**Docker (Development & Production):**
```
Development: docker-compose.yml
  - PostgreSQL: Port 5435
  - Redis: Port 6382
  - Django: Port 8005
  - Celery worker
  - Celery beat

Production: docker-compose.prod.yml
  - PostgreSQL with persistent volume
  - Redis with persistent volume
  - Gunicorn server
  - Nginx reverse proxy (optional)
  - Celery workers
  - Celery beat
  - Volume mounts for logs, media, static
```

---

## SECTION 8: DEVELOPMENT PATTERNS & CONVENTIONS

### Adding a New API Endpoint

**Standard Pattern:**
```
1. Define view in appropriate app's views.py
   - Inherit from APIView or generics view
   - Set permission_classes
   - Implement HTTP methods (get, post, put, delete)

2. Create/update serializer in serializers.py
   - Define fields and validation rules
   - Add custom validation in validate() or validate_<field>()

3. Add URL pattern in app's urls.py
   - Use descriptive names for url patterns
   - Use UUID for primary keys in URLs

4. Update this living documentation
   - Add endpoint to SECTION 2
   - Document feature flow in SECTION 5 if complex

5. Test endpoint
   - Manual testing via Postman/curl
   - Write automated tests in tests.py (future)
```

**Example - Adding a new customer endpoint:**
```python
# customers/views.py
class CustomerBookingHistoryView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BookingSerializer
    
    def get_queryset(self):
        return Booking.objects.filter(
            customer=self.request.user,
            deleted_at__isnull=True
        ).order_by('-created_at')

# customers/urls.py
path('booking-history/', CustomerBookingHistoryView.as_view(), name='booking-history'),
```

### Modifying an Existing Model

**Django Migration Workflow:**
```
1. Update model definition in models.py
   - Add/modify fields with appropriate field types
   - Add validation at model level when possible
   - Update Meta options if needed

2. Create migration
   Command: python manage.py makemigrations
   Review: Check generated migration file for correctness

3. Test migration
   Command: python manage.py migrate
   Verify: Check database schema and data integrity

4. Update affected serializers
   - Add new fields to serializer Meta.fields
   - Update validation logic if needed

5. Update affected views
   - Handle new fields in view logic
   - Update permissions if field access is restricted

6. Update this documentation
   - Update model specification in SECTION 3
   - Update affected endpoints in SECTION 2

7. Data migration (if needed)
   - Create empty migration: python manage.py makemigrations --empty <app>
   - Write data transformation in RunPython operation
```

**Example - Adding a field:**
```python
# services/models.py
class MiniMovePackage(models.Model):
    # ... existing fields ...
    estimated_duration_hours = models.PositiveIntegerField(default=4)

# Run migration
python manage.py makemigrations services
python manage.py migrate services

# services/serializers.py
class MiniMovePackageSerializer(serializers.ModelSerializer):
    class Meta:
        model = MiniMovePackage
        fields = (
            # ... existing fields ...
            'estimated_duration_hours',
        )
```

### Adding Business Logic

**Layer Decision Matrix:**

| Complexity | Location | Example |
|------------|----------|---------|
| Simple CRUD | ViewSet methods | List, create, update bookings |
| Simple computed properties | Model @property | total_price_dollars, formatted_address |
| Complex multi-step operations | Service class in services.py | Stripe payment processing, Onfleet integration |
| Data transformations | Model methods | Pricing calculations, status transitions |
| Async/background operations | Celery task in tasks.py | Email sending, report generation |
| Reusable utilities | Helper functions in utils.py | Date formatters, validators |

**Service Class Pattern:**
```python
# Example: payments/services.py
class StripePaymentService:
    """Encapsulates all Stripe API interactions"""
    
    @staticmethod
    def create_payment_intent(booking, customer_email=None):
        # Complex business logic isolated from views
        pass
    
    @staticmethod
    def process_refund(refund):
        # Multi-step refund processing
        pass
```

**Model Method Pattern:**
```python
# Example: bookings/models.py
class Booking(models.Model):
    # ... fields ...
    
    def get_pricing_breakdown(self):
        """Calculate and return detailed pricing breakdown"""
        # Business logic that operates on model data
        return {
            'base_price': self.base_price_cents,
            'surcharges': self.surcharge_cents,
            # ... more details
        }
```

### Code Organization Rules

**Model Responsibilities:**
```
✅ Data structure and constraints
✅ Simple data methods and properties
✅ Validation logic (clean methods)
✅ Database-level relationships
✅ Auto-generated fields (save overrides)

❌ Complex business workflows
❌ External API calls
❌ Multi-model orchestration
❌ Email/notification sending
```

**Serializer Responsibilities:**
```
✅ Input validation and transformation
✅ Output formatting and field selection
✅ Nested serialization
✅ Custom field validation (validate_<field>)
✅ Overall validation (validate method)

❌ Business logic execution
❌ Database queries (minimal, only for validation)
❌ External API calls
```

**View Responsibilities:**
```
✅ Request handling and response formatting
✅ Permission checks
✅ Queryset filtering
✅ Calling serializers and services
✅ HTTP status code selection

❌ Complex business logic
❌ Direct database manipulation
❌ Complex calculations
```

**Service Class Responsibilities:**
```
✅ Complex multi-step business workflows
✅ External API integration
✅ Multi-model operations
✅ Transaction management
✅ Error handling and retry logic

❌ HTTP request/response handling
❌ Serialization (use serializers)
```

### Testing Patterns

**Test Structure:**
```
tests/
├── test_models.py        - Model validation and methods
├── test_views.py         - Endpoint testing with APIClient
├── test_serializers.py   - Validation logic
└── test_services.py      - Business logic and external APIs

Test Conventions:
- Use Django TestCase for database tests
- Use APIClient for endpoint testing
- Mock external services (Stripe, Onfleet)
- Use factory_boy for test data generation (installed but not yet used)
```

**Example Test Pattern:**
```python
# tests/test_views.py
from rest_framework.test import APITestCase
from django.contrib.auth.models import User

class BookingViewTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        
    def test_create_booking_authenticated(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/customers/bookings/create/', {
            # ... booking data
        })
        self.assertEqual(response.status_code, 201)
        self.assertIn('booking_number', response.data)
```

### Error Handling Conventions

**Consistent Error Responses:**
```python
# Standard error response format
{
    "error": "Brief error message",
    "details": "More detailed explanation (optional)",
    "field_errors": {  # For validation errors
        "field_name": ["Error message 1", "Error message 2"]
    }
}

# HTTP Status Code Usage:
# 200 - Success (GET)
# 201 - Created (POST)
# 204 - No Content (DELETE)
# 400 - Bad Request (validation errors)
# 401 - Unauthorized (not authenticated)
# 403 - Forbidden (authenticated but not authorized)
# 404 - Not Found
# 500 - Internal Server Error
```

**View Error Handling Pattern:**
```python
try:
    # Business logic
    result = SomeService.do_something()
    return Response(result, status=status.HTTP_200_OK)
except ValidationError as e:
    return Response(
        {'error': str(e)}, 
        status=status.HTTP_400_BAD_REQUEST
    )
except ObjectDoesNotExist:
    return Response(
        {'error': 'Resource not found'}, 
        status=status.HTTP_404_NOT_FOUND
    )
except Exception as e:
    logger.error(f"Unexpected error: {str(e)}", exc_info=True)
    return Response(
        {'error': 'Internal server error'}, 
        status=status.HTTP_500_INTERNAL_SERVER_ERROR
    )
```

### Logging Conventions

**Logger Setup:**
```python
import logging
logger = logging.getLogger(__name__)

# Log Levels:
logger.debug("Detailed diagnostic info")
logger.info("General informational messages")
logger.warning("Warning messages")
logger.error("Error messages")
logger.critical("Critical errors")

# Best Practices:
- Log external API calls and responses
- Log payment transactions
- Log authentication failures
- Do NOT log sensitive data (passwords, full card numbers)
```

### Database Query Optimization

**Performance Patterns:**
```python
# Use select_related for ForeignKey
bookings = Booking.objects.select_related(
    'customer', 
    'pickup_address', 
    'delivery_address'
).all()

# Use prefetch_related for ManyToMany
bookings = Booking.objects.prefetch_related(
    'specialty_items',
    'payments'
).all()

# Use only() to limit fields
bookings = Booking.objects.only(
    'booking_number', 
    'status', 
    'total_price_cents'
).all()

# Use values() for aggregations
stats = Booking.objects.values('status').annotate(
    count=Count('id')
)
```

### API Documentation

**DRF Swagger/OpenAPI:**
```
Installed: drf_yasg
Access: /swagger/ or /redoc/
Configuration: config/urls.py
Auto-generates from view docstrings and serializers
```

### Security Best Practices

**Authentication:**
```
- Always use HTTPS in production
- Rotate SECRET_KEY regularly
- Use environment variables for secrets
- Implement rate limiting on auth endpoints
- Use strong password validators
```

**Data Protection:**
```
- Store monetary values as integer cents
- Validate all user input in serializers
- Use Django ORM parameterized queries (prevents SQL injection)
- Sanitize file uploads (future)
- Implement proper CORS configuration
```

**Permission Checks:**
```
- Always set permission_classes on views
- Use IsAuthenticated for customer endpoints
- Create custom permissions for staff role checks
- Verify object ownership in detail views
```

### Performance Optimization

**Caching Strategy:**
```
- Use Redis cache for rate limiting
- Cache service catalog queries (future)
- Cache customer statistics (future)
- Invalidate cache on model updates
```

**Database Indexes:**
```
Current indexes:
- booking_number (unique)
- stripe_payment_intent_id (unique)
- onfleet_task_id (unique)
- Customer foreign keys auto-indexed
- Status fields indexed for filtering
```

---

## REGENERATION NOTES

**When to Regenerate This Documentation:**
- After adding new Django apps
- After significant model schema changes
- After adding major features
- After API endpoint additions/changes
- Quarterly for maintenance

**How to Regenerate:**
1. Ensure back_export.txt is up to date (run scripts/back_export.py)
2. Use regeneration command with formula document
3. Review and validate generated documentation
4. Commit updated README.md to repository

**Version Control:**
- This documentation version: v2.0
- Backend snapshot: 2025-10-07
- Total files documented: 134

---

**END OF LIVING DOCUMENTATION**

This documentation provides complete architectural understanding and file mapping for AI executive function. Use back_export.txt as the source of truth for actual code implementations. Request specific files from back_export.txt when modifications are needed.