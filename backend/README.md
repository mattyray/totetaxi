I'll generate the living documentation for your Django/DRF backend project. Let me first search the project knowledge for the backend export file.Let me search for more content to get a complete picture of the backend structure.Perfect! I now have a comprehensive understanding of your ToteTaxi backend. Let me generate the living documentation following the strategic extraction protocol.

# **TOTETAXI BACKEND - LIVING DOCUMENTATION v2.0**

*Strategic Navigation System for Django/DRF Backend Architecture*  
*Generated: September 29, 2025*  
*Source: back_export.txt (119 files)*

---

## **SECTION 1: SYSTEM ARCHITECTURE MENTAL MODEL**

### **Project Identity & Purpose**
ToteTaxi is a luxury delivery service platform connecting customers with premium courier services for mini moves, standard deliveries, and specialty items. The backend provides dual interfaces: public-facing customer APIs for bookings/payments and authenticated staff portals for operations management.

### **Django Project Structure**

**Core Philosophy**: Service-based business domain separation with clear boundaries between customer operations, staff management, and business logic layers.

```
config/ (Django project root)
├── settings.py - Unified configuration with environment-based overrides
├── urls.py - API routing orchestration
├── celery.py - Async task configuration
└── wsgi.py/asgi.py - WSGI/ASGI server interfaces

apps/ (Business domain modules)
├── accounts/ - Staff authentication & authorization with audit logging
├── customers/ - Customer profiles, addresses, payment methods, booking management
├── bookings/ - Core booking lifecycle, address management, guest checkout
├── services/ - Service catalog (mini moves, organizing, specialty items, surcharges)
├── payments/ - Stripe integration, payment intents, refunds
├── logistics/ - Onfleet integration for delivery tracking
├── notifications/ - Email/SMS notification system (stub)
├── documents/ - Document management (stub)
└── crm/ - Customer relationship management (stub)
```

### **Architectural Layers & Separation of Concerns**

**1. API Layer (Views)**: Request handling, permission checks, response formatting
- Pattern: ViewSets for CRUD, APIView for custom logic
- Authentication: Session-based with CSRF protection
- Rate limiting: django-ratelimit on critical endpoints
- Permission: IsAuthenticated, custom staff checks

**2. Business Logic Layer (Models + Services)**
- **Models**: Data structure, simple validations, domain methods
- **Services**: Complex operations (e.g., `StripePaymentService`, `ToteTaxiOnfleetIntegration`)
- Pattern: Keep views thin, move multi-step operations to service classes

**3. Data Layer (Django ORM)**
- PostgreSQL 16 primary database
- Redis for caching and Celery broker
- Database-backed sessions for cross-domain support

**4. Integration Layer (External Services)**
- **Stripe** (payments): `apps/payments/services.py`
- **Onfleet** (logistics): `apps/logistics/services.py`
- **AWS S3** (storage): Via django-storages
- **SendGrid** (email): Stub implementation
- Mock mode enabled for both Stripe and Onfleet in development

### **Key Architectural Patterns**

**Profile Duality System**: Enforces single profile type per user
- Users have either `StaffProfile` OR `CustomerProfile`, never both
- Validation in `CustomerProfile.ensure_single_profile_type()`
- Prevents privilege escalation and maintains clean authorization

**Soft Delete Pattern**: Records marked inactive rather than destroyed
- `Booking.deleted_at` field for reversible deletions
- Preserves audit trail and payment history

**Audit Logging**: All staff actions tracked
- `StaffAction` model captures IP, user agent, timestamps
- Automatic logging via view decorators and manual logging

**Mock Integration Mode**: Development-friendly external service stubs
- `ONFLEET_MOCK_MODE` and `STRIPE_TEST_MODE` settings
- Realistic responses without external API calls

**Session Management for Cross-Domain**:
- `SameSite=None` cookies for mobile/web compatibility
- Database-backed sessions for reliability
- CSRF token endpoint for SPA authentication

### **Data Flow Patterns**

**Guest Booking Flow**:
```
POST /api/bookings/guest-booking/
  → GuestBookingCreateSerializer validates
  → Creates Address records (pickup/delivery)
  → Creates GuestCheckout record
  → Creates Booking (status: pending)
  → Returns booking_id + pricing
```

**Authenticated Customer Booking Flow**:
```
POST /api/customer/bookings/create/
  → AuthenticatedBookingCreateSerializer validates
  → Links customer profile
  → Reuses saved addresses OR creates new
  → Creates Booking (status: pending)
  → Updates customer preferences (frequency tracking)
  → Returns booking_id + pricing
```

**Payment Confirmation Flow**:
```
POST /api/payments/create-intent/
  → StripePaymentService creates PaymentIntent
  → Creates Payment record (status: pending)
  → Returns client_secret

[Customer completes payment on frontend]

POST /api/payments/confirm/
  → StripePaymentService confirms payment
  → Updates Payment (status: succeeded)
  → Updates Booking (status: confirmed)
  → Updates CustomerProfile stats (total_spent, VIP check)
  → Triggers Onfleet task creation via signal
```

**Logistics Integration Flow**:
```
Booking status → confirmed
  → post_save signal triggers
  → ToteTaxiOnfleetIntegration.create_delivery_task()
  → OnfleetService.create_task_from_booking()
  → Creates OnfleetTask record
  → Returns tracking_url to customer

[Onfleet webhook updates]

POST /api/logistics/webhook/
  → OnfleetTask.sync_status_from_onfleet()
  → Updates booking status when completed
  → Updates customer stats on completion
```

### **Technology Stack Summary**

**Core Framework**:
- Django 5.2.5 (LTS)
- Django REST Framework 3.16.1
- Python 3.11

**Data Storage**:
- PostgreSQL 16 (primary database)
- Redis 7 (cache + Celery broker)

**Background Processing**:
- Celery 5.5.3 (async tasks)
- django-celery-beat 2.8.1 (scheduled tasks)

**External Integrations**:
- Stripe 12.4.0 (payments - mocked in dev)
- Onfleet API (logistics - mocked in dev)
- AWS S3 + django-storages (file storage)
- SendGrid (email - stub)

**Security & Infrastructure**:
- django-cors-headers 4.6.0 (cross-domain)
- django-ratelimit 4.1.0 (DDoS protection)
- django-redis 5.4.0 (caching backend)
- Sentry 2.13.0 (error tracking)
- Gunicorn 23.0.0 (production server)
- WhiteNoise 6.7.0 (static file serving)

**Deployment**:
- Docker + docker-compose (containerization)
- Fly.io (production hosting)
- GitHub Actions (CI/CD - directory present)

---

## **SECTION 2: COMPLETE API ENDPOINT INVENTORY**

### **Public Booking APIs** *(No Authentication Required)*

| Endpoint | Method | View | Request | Response | Files |
|----------|--------|------|---------|----------|-------|
| `/api/bookings/services/` | GET | `ServiceCatalogView` | None | `{mini_moves: [], specialty_items: [], organizing: []}` | views.py |
| `/api/bookings/pricing-preview/` | POST | `PricingPreviewView` | `{service_type, pickup_date, ...}` | `{base_price, surcharges[], total}` | views.py, serializers.py |
| `/api/bookings/availability/` | GET | `CalendarAvailabilityView` | `?month=YYYY-MM` | `{available_dates: []}` | views.py |
| `/api/bookings/guest-booking/` | POST | `GuestBookingCreateView` | `{service details, addresses, guest_info}` | `{booking_id, booking_number, total}` | views.py, serializers.py, models.py |
| `/api/bookings/booking-status/<booking_number>/` | GET | `BookingStatusView` | None | `{status, tracking_url, payment_status}` | views.py, serializers.py |
| `/api/bookings/services/mini-moves-with-organizing/` | GET | `ServiceCatalogWithOrganizingView` | None | Mini moves with organizing options | views.py |
| `/api/bookings/services/organizing-by-tier/` | GET | `OrganizingServicesByTierView` | None | Organizing services grouped by tier | views.py |
| `/api/bookings/services/organizing/<uuid:service_id>/` | GET | `OrganizingServiceDetailView` | None | Single organizing service detail | views.py |

**Implementation Files**: `apps/bookings/views.py`, `apps/bookings/serializers.py`, `apps/bookings/models.py`

### **Customer Authentication APIs** *(Rate Limited)*

| Endpoint | Method | View | Auth | Request | Response | Files |
|----------|--------|------|------|---------|----------|-------|
| `/api/customer/csrf-token/` | GET | `CSRFTokenView` | AllowAny | None | `{csrfToken}` | views.py |
| `/api/customer/debug/` | GET | `MobileDebugView` | AllowAny | None | Debug info for mobile troubleshooting | views.py |
| `/api/customer/auth/register/` | POST | `CustomerRegistrationView` | AllowAny | `{email, password, first_name, last_name, phone}` | `{user, customer_profile, csrf_token}` | views.py, serializers.py |
| `/api/customer/auth/login/` | POST | `CustomerLoginView` | AllowAny | `{email, password}` | `{user, customer_profile, csrf_token}` | views.py, serializers.py |
| `/api/customer/auth/logout/` | POST | `CustomerLogoutView` | AllowAny | None | `{message}` | views.py |
| `/api/customer/auth/user/` | GET | `CurrentUserView` | IsAuthenticated | None | `{user, customer_profile}` | views.py |

**Rate Limits**: Login 5/min per IP, Registration 3/min per IP, Debug 10/min per IP

**Implementation Files**: `apps/customers/views.py`, `apps/customers/serializers.py`, `apps/customers/models.py`

### **Customer Profile & Preferences APIs** *(Authenticated)*

| Endpoint | Method | View | Request | Response | Files |
|----------|--------|------|---------|----------|-------|
| `/api/customer/profile/` | GET/PATCH | `CustomerProfileView` | None / `{phone, preferred_pickup_time, ...}` | `{profile_data}` | views.py |
| `/api/customer/dashboard/` | GET | `CustomerDashboardView` | None | `{bookings_summary, saved_addresses, preferences}` | views.py |
| `/api/customer/preferences/` | GET/PATCH | `BookingPreferencesView` | `{email_notifications, sms_notifications, ...}` | `{preferences}` | views.py |
| `/api/customer/addresses/` | GET/POST | `SavedAddressListCreateView` | `{nickname, address_line_1, city, state, zip_code}` | `[{address}]` | views.py, serializers.py |
| `/api/customer/addresses/<uuid>/` | GET/PATCH/DELETE | `SavedAddressDetailView` | `{nickname, address_line_1, ...}` | `{address}` | views.py |

**Implementation Files**: `apps/customers/views.py`, `apps/customers/serializers.py`

### **Customer Booking Management APIs** *(Authenticated)*

| Endpoint | Method | View | Request | Response | Files |
|----------|--------|------|---------|----------|-------|
| `/api/customer/bookings/` | GET | `CustomerBookingListView` | `?status=pending&ordering=-created_at` | `[{booking}]` (paginated) | views.py |
| `/api/customer/bookings/create/` | POST | `CustomerBookingCreateView` | `{service_type, pickup_date, addresses, ...}` | `{booking_id, booking_number, total}` | booking_views.py, booking_serializers.py |
| `/api/customer/bookings/<uuid>/` | GET | `CustomerBookingDetailView` | None | `{booking_details, payment_status, can_rebook}` | booking_views.py |
| `/api/customer/bookings/<uuid>/rebook/` | POST | `QuickRebookView` | `{pickup_date, pickup_time?, special_instructions?}` | `{new_booking}` | booking_views.py |

**Implementation Files**: `apps/customers/booking_views.py`, `apps/customers/booking_serializers.py`

### **Payment APIs** *(Public + Authenticated)*

| Endpoint | Method | View | Auth | Request | Response | Files |
|----------|--------|------|------|---------|----------|-------|
| `/api/payments/create-intent/` | POST | `PaymentIntentCreateView` | AllowAny | `{booking_id, customer_email?}` | `{client_secret, payment_id}` | views.py, services.py |
| `/api/payments/confirm/` | POST | `PaymentConfirmView` | AllowAny | `{payment_intent_id}` | `{booking_status, payment_status}` | views.py, services.py |
| `/api/payments/status/<booking_number>/` | GET | `PaymentStatusView` | AllowAny | None | `{payment_status, amount}` | views.py |
| `/api/payments/webhook/` | POST | `StripeWebhookView` | None (webhook signature) | Stripe webhook payload | `{received: true}` | views.py |
| `/api/payments/mock-confirm/` | POST | `MockPaymentConfirmView` | AllowAny | `{payment_intent_id}` | `{booking_status, payment_status}` | views.py |

**Staff-Only Payment APIs**:

| Endpoint | Method | View | Auth | Request | Response | Files |
|----------|--------|------|------|---------|----------|-------|
| `/api/payments/payments/` | GET | `PaymentListView` | IsAuthenticated (Staff) | `?status=succeeded` | `[{payment}]` | views.py |
| `/api/payments/refunds/` | GET | `RefundListView` | IsAuthenticated (Staff) | None | `[{refund}]` | views.py |
| `/api/payments/refunds/create/` | POST | `RefundCreateView` | IsAuthenticated (Staff) | `{payment_id, amount_cents?, reason}` | `{refund}` | views.py, serializers.py |

**Implementation Files**: `apps/payments/views.py`, `apps/payments/services.py`, `apps/payments/serializers.py`

### **Staff Authentication & Dashboard APIs** *(Staff Only)*

| Endpoint | Method | View | Auth | Request | Response | Files |
|----------|--------|------|------|---------|----------|-------|
| `/api/staff/auth/login/` | POST | `StaffLoginView` | AllowAny | `{username, password}` | `{user, staff_profile, csrf_token}` | views.py |
| `/api/staff/auth/logout/` | POST | `StaffLogoutView` | IsAuthenticated | None | `{message}` | views.py |
| `/api/staff/dashboard/` | GET | `StaffDashboardView` | IsAuthenticated (Staff) | None | `{today_stats, recent_bookings, revenue}` | views.py |

**Rate Limits**: Login 5/min per IP, Dashboard 30/min per user

**Implementation Files**: `apps/accounts/views.py`, `apps/accounts/serializers.py`, `apps/accounts/models.py`

### **Staff Booking Management APIs** *(Staff Only)*

| Endpoint | Method | View | Auth | Request | Response | Files |
|----------|--------|------|------|---------|----------|-------|
| `/api/staff/bookings/` | GET | `BookingManagementView` | IsAuthenticated (Staff) | `?status=confirmed&search=B-` | `[{booking}]` (paginated) | views.py |
| `/api/staff/bookings/<uuid>/` | GET/PATCH | `BookingDetailView` | IsAuthenticated (Staff) | `{status?, notes?}` | `{booking_details}` | views.py |

**Implementation Files**: `apps/accounts/views.py`

### **Staff Customer Management APIs** *(Staff Only)*

| Endpoint | Method | View | Auth | Request | Response | Files |
|----------|--------|------|------|---------|----------|-------|
| `/api/staff/customers/` | GET | `CustomerManagementView` | IsAuthenticated (Staff) | `?search=email&is_vip=true` | `[{customer}]` (paginated) | views.py |
| `/api/staff/customers/<int:id>/` | GET | `CustomerDetailView` | IsAuthenticated (Staff) | None | `{customer, bookings, stats}` | views.py |
| `/api/staff/customers/<int:id>/notes/` | PATCH | `CustomerNotesUpdateView` | IsAuthenticated (Staff) | `{notes}` | `{customer}` | views.py |

**Implementation Files**: `apps/accounts/views.py`

### **Logistics APIs** *(Staff Only + Webhook)*

| Endpoint | Method | View | Auth | Request | Response | Files |
|----------|--------|------|------|---------|----------|-------|
| `/api/logistics/summary/` | GET | `LogisticsSummaryView` | IsAuthenticated (Staff) | None | `{totetaxi_stats, onfleet_stats, integration_stats}` | views.py, services.py |
| `/api/logistics/sync/` | POST | `sync_onfleet_status` | IsAuthenticated (Staff) | None | `{synced_count}` | views.py |
| `/api/logistics/tasks/` | GET | `TaskStatusView` | IsAuthenticated (Staff) | `?booking_id=&date=` | `[{task}]` | views.py |
| `/api/logistics/create-task/` | POST | `create_task_manually` | IsAuthenticated (Staff) | `{booking_id}` | `{task}` | views.py, services.py |
| `/api/logistics/webhook/` | POST | `OnfleetWebhookView` | None (signature verification TODO) | Onfleet webhook payload | `{success: true}` | views.py, services.py |

**Implementation Files**: `apps/logistics/views.py`, `apps/logistics/services.py`, `apps/logistics/models.py`

---

## **SECTION 3: COMPLETE MODEL DOCUMENTATION**

### **accounts app - Staff Management**

#### **StaffProfile Model**
```python
class StaffProfile(models.Model):
    """Staff user profile with access control and audit features"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # One-to-one with User
    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        related_name='staff_profile'
    )
    
    # Role & Permissions
    role = models.CharField(
        max_length=50,
        choices=[
            ('admin', 'Administrator'),
            ('operations', 'Operations Manager'),
            ('customer_service', 'Customer Service'),
        ],
        default='customer_service'
    )
    
    # Security fields
    login_attempts = models.PositiveIntegerField(default=0)
    last_failed_login = models.DateTimeField(null=True, blank=True)
    account_locked_until = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_login_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'accounts_staff_profile'
    
    # METHODS
    def is_account_locked(self):
        """Check if account is currently locked due to failed attempts"""
        # Implementation in models.py
    
    def lock_account(self, minutes=30):
        """Lock account for specified minutes after excessive failures"""
        # Implementation in models.py
    
    def save(self, *args, **kwargs):
        """Override save to enforce single profile type"""
        # Validates user doesn't have CustomerProfile
```

**Relationships**:
- `user`: OneToOne with Django User (CASCADE delete)
- `staff_actions`: Reverse relation from StaffAction (audit trail)

**Constraints**: User can only have StaffProfile OR CustomerProfile, enforced in save()

---

#### **StaffAction Model**
```python
class StaffAction(models.Model):
    """Audit log for all staff actions in the system"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    staff_user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='staff_actions'
    )
    
    action_type = models.CharField(
        max_length=50,
        choices=[
            ('login', 'Login'),
            ('logout', 'Logout'),
            ('view_customer', 'Viewed Customer'),
            ('update_booking', 'Updated Booking'),
            ('create_refund', 'Created Refund'),
            ('update_customer_notes', 'Updated Customer Notes'),
        ]
    )
    
    description = models.TextField()  # Human-readable action description
    
    # Request context
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    # Related records (nullable for deleted references)
    customer_id = models.IntegerField(null=True, blank=True)
    booking_id = models.UUIDField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'accounts_staff_action'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['staff_user', '-created_at']),
            models.Index(fields=['action_type', '-created_at']),
        ]
    
    # STATIC METHOD
    @staticmethod
    def log_action(staff_user, action_type, description, request=None, **kwargs):
        """Create audit log entry from request context"""
        # Implementation in models.py
```

**Relationships**:
- `staff_user`: ForeignKey to User (SET_NULL on delete for audit preservation)
- No direct relationships to bookings/customers (uses integer IDs to survive deletions)

---

### **customers app - Customer Management**

#### **CustomerProfile Model**
```python
class CustomerProfile(models.Model):
    """Customer user profile with booking history and preferences"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='customer_profile'
    )
    
    # Contact information
    phone = models.CharField(max_length=20, blank=True)
    
    # Booking statistics (auto-updated)
    total_bookings = models.PositiveIntegerField(default=0)
    total_spent_cents = models.PositiveBigIntegerField(default=0)
    last_booking_at = models.DateTimeField(null=True, blank=True)
    
    # Customer tier
    is_vip = models.BooleanField(default=False)  # Auto-set when total_spent >= $2000
    
    # Preferences
    preferred_pickup_time = models.CharField(
        max_length=30,
        choices=[
            ('morning', '8 AM - 11 AM'),
            ('morning_specific', 'Specific 1-hour window'),
            ('no_time_preference', 'No time preference'),
        ],
        default='no_time_preference'
    )
    email_notifications = models.BooleanField(default=True)
    sms_notifications = models.BooleanField(default=False)
    
    # Staff notes
    notes = models.TextField(blank=True)  # Staff-only field
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'customers_customer_profile'
    
    # COMPUTED PROPERTY
    @property
    def total_spent_dollars(self):
        """Convert cents to dollars for display"""
        return self.total_spent_cents / 100
    
    # STATIC METHOD
    @staticmethod
    def ensure_single_profile_type(user):
        """Validation: User cannot have both Customer and Staff profiles"""
        # Raises ValidationError if user has both profiles
        # Implementation in models.py
    
    def save(self, *args, **kwargs):
        """Override save to enforce single profile type"""
        CustomerProfile.ensure_single_profile_type(self.user)
        super().save(*args, **kwargs)
```

**Relationships**:
- `user`: OneToOne with Django User (CASCADE delete)
- `saved_addresses`: Reverse relation from SavedAddress
- `payment_methods`: Reverse relation from CustomerPaymentMethod
- `bookings`: Reverse relation from Booking

**Business Rules**:
- VIP status automatically granted when `total_spent_cents >= 200000` ($2000)
- User cannot have both `CustomerProfile` and `StaffProfile`

---

#### **SavedAddress Model**
```python
class SavedAddress(models.Model):
    """Customer's saved addresses for quick rebooking"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='saved_addresses'
    )
    
    # Address identification
    nickname = models.CharField(max_length=50)  # e.g., "Home", "Office"
    
    # Address fields
    address_line_1 = models.CharField(max_length=200)
    address_line_2 = models.CharField(max_length=200, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(
        max_length=2,
        choices=[
            ('NY', 'New York'),
            ('CT', 'Connecticut'),
            ('NJ', 'New Jersey'),
        ]
    )
    zip_code = models.CharField(max_length=10)
    delivery_instructions = models.TextField(blank=True)
    
    # Usage tracking
    times_used = models.PositiveIntegerField(default=0)
    last_used_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    # Timestamps
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
    
    # COMPUTED PROPERTY
    @property
    def formatted_address(self):
        """Single-line address string"""
        # Implementation in models.py
    
    # METHOD
    def mark_used(self):
        """Increment usage counter and update last_used timestamp"""
        self.times_used += 1
        self.last_used_at = timezone.now()
        self.save()
```

**Relationships**:
- `user`: ForeignKey to User (CASCADE delete)

**Constraints**:
- Unique constraint on `(user, nickname)` - no duplicate nicknames per user

---

#### **CustomerPaymentMethod Model**
```python
class CustomerPaymentMethod(models.Model):
    """Customer's saved Stripe payment methods"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='payment_methods'
    )
    
    # Stripe details
    stripe_payment_method_id = models.CharField(max_length=100, unique=True)
    card_brand = models.CharField(max_length=20)  # 'visa', 'mastercard', etc.
    card_last_four = models.CharField(max_length=4)
    card_exp_month = models.PositiveSmallIntegerField()
    card_exp_year = models.PositiveSmallIntegerField()
    
    # Status
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'customers_payment_method'
    
    # COMPUTED PROPERTY
    @property
    def display_name(self):
        """Human-readable card display string"""
        return f"{self.card_brand.title()} ending in {self.card_last_four}"
    
    def save(self, *args, **kwargs):
        """Ensure only one default payment method per user"""
        if self.is_default:
            CustomerPaymentMethod.objects.filter(
                user=self.user,
                is_default=True
            ).exclude(id=self.id).update(is_default=False)
        super().save(*args, **kwargs)
```

**Relationships**:
- `user`: ForeignKey to User (CASCADE delete)

**Business Rules**:
- Only one `is_default=True` payment method per user (enforced in save())

---

### **bookings app - Core Booking System**

#### **Booking Model**
```python
class Booking(models.Model):
    """Core booking record for all ToteTaxi services"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Unique booking identifier
    booking_number = models.CharField(max_length=20, unique=True)  # Auto-generated: "B-YYYYMMDD-XXXX"
    
    # Customer relationship (nullable for guest bookings)
    customer = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bookings'
    )
    
    # Service type
    service_type = models.CharField(
        max_length=30,
        choices=[
            ('mini_move', 'Mini Move'),
            ('standard_delivery', 'Standard Delivery'),
            ('specialty_item', 'Specialty Item'),
        ]
    )
    
    # Mini Move specific (nullable if not mini_move)
    mini_move_package_type = models.CharField(
        max_length=20,
        choices=[('petite', 'Petite'), ('standard', 'Standard'), ('full', 'Full')],
        null=True,
        blank=True
    )
    item_count = models.PositiveIntegerField(null=True, blank=True)
    
    # Organizing services (optional add-ons for mini moves)
    include_packing = models.BooleanField(default=False)
    packing_service_id = models.UUIDField(null=True, blank=True)  # References OrganizingService
    include_unpacking = models.BooleanField(default=False)
    unpacking_service_id = models.UUIDField(null=True, blank=True)
    
    # Standard Delivery specific
    item_description = models.TextField(blank=True)
    
    # Specialty Item specific
    specialty_item_type = models.CharField(max_length=50, blank=True)
    
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
    
    # Scheduling
    pickup_date = models.DateField()
    pickup_time = models.CharField(
        max_length=30,
        choices=[
            ('morning', '8 AM - 11 AM'),
            ('morning_specific', 'Specific 1-hour window'),
            ('no_time_preference', 'No time preference'),
        ]
    )
    is_same_day_delivery = models.BooleanField(default=False)
    
    # Special requirements
    coi_required = models.BooleanField(default=False)
    special_instructions = models.TextField(blank=True)
    
    # Pricing (in cents)
    base_price_cents = models.PositiveBigIntegerField()
    surcharge_saturday_sunday_cents = models.PositiveBigIntegerField(default=0)
    geographic_surcharge_cents = models.PositiveBigIntegerField(default=0)
    organizing_packing_price_cents = models.PositiveBigIntegerField(default=0)
    organizing_unpacking_price_cents = models.PositiveBigIntegerField(default=0)
    coi_fee_cents = models.PositiveBigIntegerField(default=0)
    total_price_cents = models.PositiveBigIntegerField()
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending Payment'),
            ('confirmed', 'Confirmed'),
            ('in_progress', 'In Progress'),
            ('completed', 'Completed'),
            ('cancelled', 'Cancelled'),
        ],
        default='pending'
    )
    
    # Soft delete
    deleted_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'bookings_booking'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['booking_number']),
            models.Index(fields=['customer', '-created_at']),
            models.Index(fields=['status', 'pickup_date']),
            models.Index(fields=['deleted_at']),
        ]
    
    # COMPUTED PROPERTIES
    @property
    def total_price_dollars(self):
        return self.total_price_cents / 100
    
    # METHODS
    def get_customer_name(self):
        """Get customer name from user or guest checkout"""
        # Implementation handles both authenticated and guest bookings
    
    def get_pricing_breakdown(self):
        """Return detailed pricing dictionary"""
        # Returns dict with all price components in dollars
    
    def generate_booking_number(self):
        """Auto-generate unique booking number: B-YYYYMMDD-XXXX"""
        # Implementation in models.py
    
    def save(self, *args, **kwargs):
        """Override save to generate booking number"""
        if not self.booking_number:
            self.booking_number = self.generate_booking_number()
        super().save(*args, **kwargs)
```

**Relationships**:
- `customer`: ForeignKey to User (SET_NULL on delete for record preservation)
- `pickup_address`: ForeignKey to Address (PROTECT)
- `delivery_address`: ForeignKey to Address (PROTECT)
- `guest_checkout`: OneToOne reverse relation from GuestCheckout
- `payments`: Reverse relation from Payment
- `onfleet_task`: OneToOne reverse relation from OnfleetTask

**Business Rules**:
- `booking_number` auto-generated on first save: "B-20250929-0001"
- Organizing services only applicable when `service_type='mini_move'`
- COI (Certificate of Insurance) adds fee if not included in package

---

#### **Address Model**
```python
class Address(models.Model):
    """Reusable address records for bookings"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    address_line_1 = models.CharField(max_length=200)
    address_line_2 = models.CharField(max_length=200, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(
        max_length=2,
        choices=[
            ('NY', 'New York'),
            ('CT', 'Connecticut'),
            ('NJ', 'New Jersey'),
        ]
    )
    zip_code = models.CharField(max_length=10)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'bookings_address'
        verbose_name_plural = 'Addresses'
```

**Relationships**:
- `pickup_bookings`: Reverse relation from Booking (as pickup_address)
- `delivery_bookings`: Reverse relation from Booking (as delivery_address)

**Note**: Addresses are shared records, not deleted when bookings are deleted (PROTECT)

---

#### **GuestCheckout Model**
```python
class GuestCheckout(models.Model):
    """Guest customer information for non-authenticated bookings"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    booking = models.OneToOneField(
        Booking,
        on_delete=models.CASCADE,
        related_name='guest_checkout'
    )
    
    # Guest contact info
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'bookings_guest_checkout'
```

**Relationships**:
- `booking`: OneToOne with Booking (CASCADE delete)

**Business Rule**: Only exists when `booking.customer` is NULL (guest booking)

---

### **services app - Service Catalog**

#### **MiniMovePackage Model**
```python
class MiniMovePackage(models.Model):
    """Mini move service tiers with pricing and limits"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    package_type = models.CharField(
        max_length=20,
        unique=True,
        choices=[
            ('petite', 'Petite'),
            ('standard', 'Standard'),
            ('full', 'Full'),
        ]
    )
    
    name = models.CharField(max_length=100)
    description = models.TextField()
    base_price_cents = models.PositiveBigIntegerField()
    
    # Capacity limits
    max_items = models.PositiveIntegerField()
    max_weight_per_item_lbs = models.PositiveIntegerField()
    
    # Features
    coi_included = models.BooleanField(default=False)
    coi_fee_cents = models.PositiveBigIntegerField(default=0)
    priority_scheduling = models.BooleanField(default=False)
    protective_wrapping = models.BooleanField(default=False)
    
    # Marketing
    is_most_popular = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'services_mini_move_package'
        ordering = ['base_price_cents']
    
    @property
    def base_price_dollars(self):
        return self.base_price_cents / 100
```

**Relationships**: None (catalog reference table)

**Seeded Data**: Created via `recreate_services.py` script
- Petite: $995, 15 items, COI +$50
- Standard: $1,725, 30 items, COI included (most popular)
- Full: $3,450, unlimited items, exclusive van

---

#### **OrganizingService Model**
```python
class OrganizingService(models.Model):
    """Packing/unpacking organizing services for mini moves"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    service_type = models.CharField(
        max_length=30,
        unique=True,
        choices=[
            ('petite_packing', 'Petite Packing'),
            ('standard_packing', 'Standard Packing'),
            ('full_packing', 'Full Packing'),
            ('petite_unpacking', 'Petite Unpacking'),
            ('standard_unpacking', 'Standard Unpacking'),
            ('full_unpacking', 'Full Unpacking'),
        ]
    )
    
    mini_move_tier = models.CharField(
        max_length=20,
        choices=[('petite', 'Petite'), ('standard', 'Standard'), ('full', 'Full')]
    )
    
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    price_cents = models.PositiveBigIntegerField()
    
    # Service specifications
    duration_hours = models.PositiveIntegerField()
    organizer_count = models.PositiveIntegerField()
    supplies_allowance_cents = models.PositiveBigIntegerField(
        default=0,
        help_text='Supplies allowance in cents (packing services only)'
    )
    is_packing_service = models.BooleanField(
        help_text='True for packing services (with supplies), False for unpacking'
    )
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'services_organizing_service'
        ordering = ['mini_move_tier', 'is_packing_service', 'price_cents']
    
    @property
    def price_dollars(self):
        return self.price_cents / 100
```

**Relationships**: Linked to mini moves via `mini_move_tier` field (not FK)

**Seeded Data**: Created via migration `0003_populate_organizing_services.py`

---

#### **StandardDeliveryConfig Model**
```python
class StandardDeliveryConfig(models.Model):
    """Configuration for standard delivery service pricing"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    config_name = models.CharField(max_length=100, unique=True)
    base_price_cents = models.PositiveBigIntegerField()
    description = models.TextField(blank=True)
    
    # Pricing rules
    price_per_additional_mile_cents = models.PositiveIntegerField(default=0)
    max_distance_miles = models.PositiveIntegerField(null=True, blank=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'services_standard_delivery_config'
```

**Relationships**: None (catalog reference)

**Seeded Data**: Created via `recreate_services.py`
- Standard Delivery: $250 base price

---

#### **SpecialtyItem Model**
```python
class SpecialtyItem(models.Model):
    """Catalog of specialty items with custom pricing"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    item_category = models.CharField(
        max_length=50,
        choices=[
            ('bike', 'Bicycle'),
            ('luggage', 'Luggage Set'),
            ('exercise', 'Exercise Equipment'),
            ('surf', 'Surfboard'),
            ('furniture', 'Small Furniture'),
            ('other', 'Other'),
        ]
    )
    
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    base_price_cents = models.PositiveBigIntegerField()
    
    # Specifications
    max_dimensions_inches = models.CharField(max_length=50, blank=True)
    max_weight_lbs = models.PositiveIntegerField(null=True, blank=True)
    requires_special_handling = models.BooleanField(default=False)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'services_specialty_item'
        ordering = ['item_category', 'base_price_cents']
```

**Relationships**: None (catalog reference)

**Seeded Data**: Created via `recreate_services.py`
- Bikes, Luggage Sets, Exercise Equipment, Surfboards

---

#### **SurchargeRule Model**
```python
class SurchargeRule(models.Model):
    """Dynamic surcharge rules applied to bookings"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    surcharge_type = models.CharField(
        max_length=30,
        choices=[
            ('holiday', 'Holiday Surcharge'),
            ('weekend', 'Weekend Surcharge'),
            ('geographic', 'Geographic Surcharge'),
            ('peak_season', 'Peak Season Surcharge'),
        ]
    )
    
    name = models.CharField(max_length=100)
    description = models.TextField()
    
    applies_to_service_type = models.CharField(
        max_length=20,
        choices=[
            ('all', 'All Services'),
            ('mini_move', 'Mini Moves Only'),
            ('standard_delivery', 'Standard Delivery Only'),
            ('specialty_item', 'Specialty Items Only'),
        ],
        default='all',
        help_text='Which service types this surcharge applies to'
    )
    
    # Calculation method (mutually exclusive)
    calculation_type = models.CharField(
        max_length=20,
        choices=[
            ('percentage', 'Percentage of Base Price'),
            ('fixed_amount', 'Fixed Dollar Amount'),
        ]
    )
    percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Percentage to add (e.g., 10.00 for 10%)'
    )
    fixed_amount_cents = models.PositiveBigIntegerField(null=True, blank=True)
    
    # Date-based application
    specific_date = models.DateField(null=True, blank=True)
    applies_saturday = models.BooleanField(default=False)
    applies_sunday = models.BooleanField(default=False)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'services_surcharge_rule'
```

**Relationships**: None (rules engine)

**Seeded Data**: Created via `recreate_services.py`
- Weekend surcharge: +$50 for Sat/Sun standard deliveries
- Geographic surcharges: CT/NJ (+$220), Amagansett/Montauk (+$120)

---

### **payments app - Payment Processing**

#### **Payment Model**
```python
class Payment(models.Model):
    """Payment records linked to bookings with Stripe integration"""
    
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
    
    @property
    def amount_dollars(self):
        return self.amount_cents / 100
```

**Relationships**:
- `booking`: ForeignKey to Booking (PROTECT - cannot delete bookings with payments)
- `customer`: ForeignKey to User (SET_NULL on delete)
- `refunds`: Reverse relation from Refund

---

#### **Refund Model**
```python
class Refund(models.Model):
    """Refund records for payments"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('succeeded', 'Succeeded'),
        ('failed', 'Failed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    payment = models.ForeignKey(
        Payment,
        on_delete=models.CASCADE,
        related_name='refunds'
    )
    
    # Refund details
    amount_cents = models.PositiveBigIntegerField()
    reason = models.TextField()
    
    # Stripe integration
    stripe_refund_id = models.CharField(max_length=200, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    failure_reason = models.TextField(blank=True)
    
    # Staff authorization
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_refunds'
    )
    
    processed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'payments_refund'
    
    @property
    def amount_dollars(self):
        return self.amount_cents / 100
```

**Relationships**:
- `payment`: ForeignKey to Payment (CASCADE delete)
- `created_by`: ForeignKey to User (SET_NULL on delete)
- `audit_logs`: Reverse relation from PaymentAudit

---

#### **PaymentAudit Model**
```python
class PaymentAudit(models.Model):
    """Audit trail for all payment/refund actions"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    payment = models.ForeignKey(
        Payment,
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    refund = models.ForeignKey(
        Refund,
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    event_type = models.CharField(
        max_length=30,
        choices=[
            ('payment_created', 'Payment Created'),
            ('payment_succeeded', 'Payment Succeeded'),
            ('payment_failed', 'Payment Failed'),
            ('refund_created', 'Refund Created'),
            ('refund_processed', 'Refund Processed'),
            ('refund_failed', 'Refund Failed'),
            ('refund_approved', 'Refund Approved'),
            ('refund_completed', 'Refund Completed'),
        ]
    )
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'payments_audit'
        ordering = ['-created_at']
```

**Relationships**:
- `payment`: ForeignKey to Payment (CASCADE delete)
- `refund`: ForeignKey to Refund (CASCADE delete)
- `user`: ForeignKey to User (SET_NULL on delete)

---

### **logistics app - Delivery Tracking**

#### **OnfleetTask Model**
```python
class OnfleetTask(models.Model):
    """Bridge between ToteTaxi bookings and Onfleet delivery tasks"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Core relationship
    booking = models.OneToOneField(
        'bookings.Booking',
        on_delete=models.CASCADE,
        related_name='onfleet_task'
    )
    
    # Onfleet identifiers
    onfleet_task_id = models.CharField(max_length=100, unique=True)
    onfleet_short_id = models.CharField(max_length=20, blank=True)
    tracking_url = models.URLField(blank=True)
    
    # Status mapping
    status = models.CharField(
        max_length=20,
        choices=[
            ('created', 'Created'),
            ('assigned', 'Assigned'),
            ('active', 'Active'),
            ('completed', 'Completed'),
            ('failed', 'Failed'),
        ],
        default='created'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_synced = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'logistics_onfleet_task'
        verbose_name = 'Onfleet Task'
        verbose_name_plural = 'Onfleet Tasks'
        indexes = [
            models.Index(fields=['onfleet_task_id']),
            models.Index(fields=['status']),
        ]
    
    # METHODS
    def sync_status_from_onfleet(self, onfleet_state):
        """Convert Onfleet state (0-3) to internal status"""
        # State mapping: 0=created, 1=assigned, 2=active, 3=completed
        # Updates booking status when delivery completes
    
    def _mark_booking_completed(self):
        """Update booking and customer stats when delivery completes"""
        # Sets booking.status = 'completed'
        # Updates CustomerProfile.total_bookings, total_spent, VIP check
```

**Relationships**:
- `booking`: OneToOne with Booking (CASCADE delete)

**Signal**: Auto-created via `post_save` signal when `booking.status='confirmed'`

---

## **SECTION 4: FILE DIRECTORY + PURPOSE INDEX**

```
backend/
├── apps/
│   ├── accounts/                      - Staff authentication, roles, audit logging
│   │   ├── migrations/
│   │   │   ├── 0001_initial.py        - Initial staff profile and action models
│   │   │   └── 0002_alter_staffaction_action_type.py - Added action types
│   │   ├── admin.py                   - Admin interface for staff profiles/actions
│   │   ├── models.py                  - StaffProfile, StaffAction models
│   │   ├── serializers.py             - Staff login, profile, action serializers
│   │   ├── views.py                   - Staff auth, dashboard, booking/customer management
│   │   └── urls.py                    - Staff API routes
│   │
│   ├── bookings/                      - Core booking lifecycle and address management
│   │   ├── migrations/
│   │   │   ├── 0001_initial.py        - Booking, Address, GuestCheckout models
│   │   │   ├── 0002_booking_include_packing_*.py - Added organizing service fields
│   │   │   └── 0003_booking_geographic_surcharge_*.py - Added surcharge tracking
│   │   ├── admin.py                   - Booking admin with filters and actions
│   │   ├── models.py                  - Booking, Address, GuestCheckout models
│   │   ├── serializers.py             - Guest booking, pricing, status serializers
│   │   ├── views.py                   - Public booking APIs (guest checkout, catalog, pricing)
│   │   └── urls.py                    - Public booking routes
│   │
│   ├── customers/                     - Customer profiles, addresses, authenticated bookings
│   │   ├── management/commands/
│   │   │   └── clean_delete_user.py   - Admin command to safely delete users
│   │   ├── migrations/
│   │   │   ├── 0001_initial.py        - Customer profile, saved address, payment method models
│   │   │   └── 0002_alter_customerprofile_preferred_pickup_time.py - Pickup time choices fix
│   │   ├── admin.py                   - Customer profile, address, payment method admin
│   │   ├── models.py                  - CustomerProfile, SavedAddress, CustomerPaymentMethod models
│   │   ├── serializers.py             - Customer registration, login, profile serializers
│   │   ├── views.py                   - Customer auth, profile, dashboard, preferences APIs
│   │   ├── booking_serializers.py     - Authenticated booking creation and detail serializers
│   │   ├── booking_views.py           - Authenticated booking CRUD and rebook APIs
│   │   └── urls.py                    - Customer API routes
│   │
│   ├── services/                      - Service catalog (mini moves, organizing, specialty items)
│   │   ├── migrations/
│   │   │   ├── 0001_initial.py        - Mini move, standard delivery, specialty, surcharge models
│   │   │   ├── 0002_organizingservice.py - Organizing service model
│   │   │   ├── 0003_populate_organizing_services.py - Seed organizing services data
│   │   │   ├── 0004_surchargerule_applies_to_service_type.py - Surcharge scope field
│   │   │   └── 0005_remove_van_schedule.py - Removed unused van schedule model
│   │   ├── admin.py                   - Service catalog admin with pricing displays
│   │   ├── models.py                  - MiniMovePackage, OrganizingService, StandardDeliveryConfig, SpecialtyItem, SurchargeRule
│   │   ├── serializers.py             - Service catalog serializers with computed fields
│   │   └── urls.py                    - Service catalog routes (currently empty)
│   │
│   ├── payments/                      - Stripe payment processing and refunds
│   │   ├── migrations/
│   │   │   └── 0001_initial.py        - Payment, Refund, PaymentAudit models
│   │   ├── admin.py                   - Payment and refund admin with filters
│   │   ├── models.py                  - Payment, Refund, PaymentAudit models
│   │   ├── serializers.py             - Payment intent, confirm, refund serializers
│   │   ├── services.py                - StripePaymentService class (core payment logic)
│   │   ├── views.py                   - Payment APIs (create intent, confirm, webhook, refunds)
│   │   └── urls.py                    - Payment API routes
│   │
│   ├── logistics/                     - Onfleet delivery tracking integration
│   │   ├── migrations/
│   │   │   └── 0001_initial.py        - OnfleetTask model
│   │   ├── models.py                  - OnfleetTask model with status sync
│   │   ├── services.py                - OnfleetService, ToteTaxiOnfleetIntegration classes
│   │   ├── views.py                   - Logistics dashboard, task management, webhook handler
│   │   └── urls.py                    - Logistics API routes
│   │
│   ├── crm/                           - Customer relationship management (stub)
│   │   └── [empty stub files]
│   │
│   ├── documents/                     - Document management (stub)
│   │   └── [empty stub files]
│   │
│   └── notifications/                 - Email/SMS notification system (stub)
│       └── [empty stub files]
│
├── config/                            - Django project configuration
│   ├── __init__.py                    - Celery app import
│   ├── settings.py                    - Unified Django settings with environment variables
│   ├── urls.py                        - Root URL routing (admin, staff, customer, bookings, payments, logistics)
│   ├── celery.py                      - Celery configuration for async tasks
│   ├── wsgi.py                        - WSGI application for production
│   └── asgi.py                        - ASGI application for async support
│
├── scripts/                           - Utility scripts
│   ├── back_export.py                 - Auto-generates back_export.txt code snapshot
│   ├── back_export.txt                - Complete backend code snapshot (this file's source)
│   └── entrypoint.sh                  - Docker container initialization script
│
├── static/                            - Static file collection directory
├── staticfiles/                       - Collected static files for production
├── media/                             - User-uploaded files
├── logs/                              - Application logs
│
├── manage.py                          - Django management script
├── requirements.txt                   - Python dependencies (Django 5.2.5, DRF 3.16.1, etc.)
├── pytest.ini                         - Pytest configuration
├── pyproject.toml                     - Black/isort configuration
├── gunicorn.conf.py                   - Gunicorn production server config
├── recreate_services.py               - Service catalog seeding script
│
├── Dockerfile                         - Development Docker image
├── Dockerfile.prod                    - Production Docker image
├── docker-compose.yml                 - Development container orchestration
├── docker-compose.prod.yml            - Production container orchestration
├── .dockerignore                      - Docker build exclusions
├── fly.toml                           - Fly.io deployment configuration
│
├── .gitignore                         - Git exclusions
├── .env.example                       - Environment variable template
└── README.md                          - Project documentation
```

---

## **SECTION 5: FEATURE-TO-FILE DEPENDENCY MAPS**

### **Guest Booking Flow**

**Entry Point**: `POST /api/bookings/guest-booking/`

**Execution Chain**:
1. `apps/bookings/views.py → GuestBookingCreateView.post()`
   - Validates request via `GuestBookingCreateSerializer`
2. `apps/bookings/serializers.py → GuestBookingCreateSerializer.create()`
   - Creates `Address` records for pickup/delivery
   - Creates `GuestCheckout` record with contact info
   - Creates `Booking` record (status: pending)
   - Calculates total pricing including surcharges
3. `apps/bookings/models.py → Booking.generate_booking_number()`
   - Auto-generates unique booking number: "B-YYYYMMDD-XXXX"
4. Response: `{booking_id, booking_number, total_price_dollars}`

**Dependencies**: None (fully self-contained)

**Files to Request**: `bookings/views.py`, `bookings/serializers.py`, `bookings/models.py`

---

### **Authenticated Customer Booking Flow**

**Entry Point**: `POST /api/customer/bookings/create/`

**Execution Chain**:
1. `apps/customers/booking_views.py → CustomerBookingCreateView.post()`
   - Validates user has CustomerProfile
   - Passes request to `AuthenticatedBookingCreateSerializer`
2. `apps/customers/booking_serializers.py → AuthenticatedBookingCreateSerializer.create()`
   - Links booking to `request.user`
   - Reuses `SavedAddress` if provided, else creates new `Address`
   - Creates `Booking` record (status: pending)
   - Updates `CustomerProfile` preferences (e.g., preferred_pickup_time usage tracking)
3. `apps/bookings/models.py → Booking.save()`
   - Generates booking number if not present
4. Response: `{booking_id, booking_number, total_price_dollars, saved_addresses_used}`

**Dependencies**: 
- `CustomerProfile` must exist for user
- `SavedAddress` optional (can reference existing or create new)

**Side Effects**: Updates `CustomerProfile.preferred_pickup_time` usage frequency

**Files to Request**: `customers/booking_views.py`, `customers/booking_serializers.py`, `bookings/models.py`, `customers/models.py`

---

### **Payment Processing Flow**

**Entry Point**: `POST /api/payments/create-intent/`

**Execution Chain**:
1. `apps/payments/views.py → PaymentIntentCreateView.post()`
   - Validates `booking_id` via `PaymentIntentCreateSerializer`
   - Checks booking not already paid
2. `apps/payments/services.py → StripePaymentService.create_payment_intent()`
   - Calls Stripe API (or mock in dev) to create PaymentIntent
   - Creates `Payment` record (status: pending)
   - Stores `stripe_payment_intent_id`
3. Response: `{client_secret, payment_id}`

**[Customer completes payment on frontend with Stripe Elements]**

**Entry Point**: `POST /api/payments/confirm/`

**Execution Chain**:
1. `apps/payments/views.py → PaymentConfirmView.post()`
   - Receives `payment_intent_id` from Stripe
2. `apps/payments/services.py → StripePaymentService.confirm_payment()`
   - Retrieves Stripe PaymentIntent status
   - Updates `Payment` record (status: succeeded)
   - Updates `Booking` record (status: confirmed)
   - Updates `CustomerProfile` stats:
     - `total_bookings += 1`
     - `total_spent_cents += booking.total_price_cents`
     - `last_booking_at = now()`
     - Checks if VIP upgrade threshold reached (`total_spent >= $2000`)
   - Creates `PaymentAudit` log entry
3. Response: `{booking_status: 'confirmed', payment_status: 'succeeded'}`

**Dependencies**: `Booking`, `Payment`, `CustomerProfile` (if authenticated)

**Side Effects**:
- Booking status changes trigger Onfleet task creation via signal
- Customer stats updated
- VIP status may be auto-granted

**Files to Request**: `payments/views.py`, `payments/services.py`, `payments/models.py`, `bookings/models.py`, `customers/models.py`

---

### **Logistics Integration (Onfleet)**

**Trigger**: Booking status changes to 'confirmed'

**Execution Chain**:
1. `apps/bookings/models.py → post_save signal receiver`
   - Detects `booking.status == 'confirmed'` and no existing `onfleet_task`
2. `apps/logistics/services.py → ToteTaxiOnfleetIntegration.create_delivery_task()`
   - Calls `OnfleetService.create_task_from_booking()`
3. `apps/logistics/services.py → OnfleetService.create_task_from_booking()`
   - Builds Onfleet task payload from booking data
   - Calls Onfleet API (or mock) to create task
   - Returns `{id, shortId, trackingURL}`
4. `apps/logistics/models.py → OnfleetTask.objects.create()`
   - Creates `OnfleetTask` record linking booking to Onfleet task
   - Stores tracking URL for customer access

**Webhook Handling**: `POST /api/logistics/webhook/`

**Execution Chain**:
1. `apps/logistics/views.py → OnfleetWebhookView.post()`
   - Receives webhook payload from Onfleet
2. `apps/logistics/services.py → ToteTaxiOnfleetIntegration.handle_webhook()`
   - Extracts task status from payload
3. `apps/logistics/models.py → OnfleetTask.sync_status_from_onfleet()`
   - Maps Onfleet state (0-3) to internal status
   - When status becomes 'completed', calls `_mark_booking_completed()`
4. `apps/logistics/models.py → OnfleetTask._mark_booking_completed()`
   - Updates `Booking.status = 'completed'`
   - Updates `CustomerProfile` stats (if authenticated booking)

**Dependencies**: `Booking`, `CustomerProfile` (optional)

**Side Effects**: 
- Booking completion updates customer stats
- VIP status may be granted on completion

**Files to Request**: `logistics/services.py`, `logistics/models.py`, `logistics/views.py`, `bookings/models.py`

---

### **Staff Dashboard & Operations**

**Entry Point**: `GET /api/staff/dashboard/`

**Execution Chain**:
1. `apps/accounts/views.py → StaffDashboardView.get()`
   - Checks user has `staff_profile`
   - Aggregates today's bookings by status
   - Calculates today's revenue from successful payments
   - Retrieves recent bookings (last 10)
2. Response: `{today_stats, recent_bookings, revenue_stats}`

**Entry Point**: `GET /api/staff/bookings/`

**Execution Chain**:
1. `apps/accounts/views.py → BookingManagementView.get()`
   - Filters bookings by status, date range, search term
   - Paginates results (20 per page)
   - Includes customer name, payment status
2. Response: `{results: [{booking}], count, next, previous}`

**Entry Point**: `PATCH /api/staff/bookings/<uuid>/`

**Execution Chain**:
1. `apps/accounts/views.py → BookingDetailView.patch()`
   - Allows status updates, internal notes
   - Logs action via `StaffAction.log_action()`
2. `apps/accounts/models.py → StaffAction.log_action()`
   - Creates audit entry with IP, user agent, description
3. Response: `{booking_details}`

**Dependencies**: `StaffProfile`, `Booking`, `Payment`, `StaffAction`

**Files to Request**: `accounts/views.py`, `accounts/models.py`, `bookings/models.py`, `payments/models.py`

---

### **Customer Dashboard & Preferences**

**Entry Point**: `GET /api/customer/dashboard/`

**Execution Chain**:
1. `apps/customers/views.py → CustomerDashboardView.get()`
   - Aggregates user's bookings by status
   - Retrieves saved addresses (sorted by usage frequency)
   - Fetches customer preferences
   - Calculates most-used pickup/delivery addresses
2. Response: `{bookings_summary, saved_addresses, preferences, default_addresses}`

**Entry Point**: `PATCH /api/customer/preferences/`

**Execution Chain**:
1. `apps/customers/views.py → BookingPreferencesView.patch()`
   - Updates `CustomerProfile` fields:
     - `preferred_pickup_time`
     - `email_notifications`
     - `sms_notifications`
2. `apps/customers/models.py → CustomerProfile.save()`
3. Response: `{updated_preferences}`

**Entry Point**: `POST /api/customer/bookings/<uuid>/rebook/`

**Execution Chain**:
1. `apps/customers/booking_views.py → QuickRebookView.post()`
   - Retrieves original booking
   - Validates `can_rebook` (status must be 'completed' or 'paid')
   - Creates new booking with same addresses, service type, items
   - Only changes: `pickup_date`, `pickup_time`, `special_instructions`
2. `apps/bookings/models.py → Booking.create()`
   - Reuses existing `Address` records (no duplication)
3. Response: `{new_booking_id, booking_number}`

**Dependencies**: `CustomerProfile`, `Booking`, `SavedAddress`

**Files to Request**: `customers/views.py`, `customers/booking_views.py`, `customers/models.py`, `bookings/models.py`

---

### **Service Catalog & Pricing Preview**

**Entry Point**: `GET /api/bookings/services/`

**Execution Chain**:
1. `apps/bookings/views.py → ServiceCatalogView.get()`
   - Queries active `MiniMovePackage` records
   - Queries active `SpecialtyItem` records
   - Queries active `StandardDeliveryConfig` records
   - Queries active `OrganizingService` records
2. `apps/services/serializers.py → ServiceCatalogSerializer`
   - Converts cents to dollars
   - Groups organizing services by tier
3. Response: `{mini_moves: [], specialty_items: [], standard_delivery: {}, organizing_services: {}}`

**Entry Point**: `POST /api/bookings/pricing-preview/`

**Execution Chain**:
1. `apps/bookings/views.py → PricingPreviewView.post()`
   - Validates request via `PricingPreviewSerializer`
2. `apps/bookings/serializers.py → PricingPreviewSerializer.validate()`
   - Fetches base price from service catalog
   - Applies active `SurchargeRule` records:
     - Weekend surcharge (+$50 if Sat/Sun)
     - Geographic surcharge (+$220 if CT/NJ, +$120 if Amagansett/Montauk)
   - Adds organizing service prices (if selected)
   - Adds COI fee (if required and not included)
   - Calculates total
3. Response: `{base_price, surcharges: [{name, amount}], organizing_fees, coi_fee, total}`

**Dependencies**: Service catalog models (`MiniMovePackage`, `SpecialtyItem`, `OrganizingService`, `SurchargeRule`)

**Files to Request**: `bookings/views.py`, `bookings/serializers.py`, `services/models.py`, `services/serializers.py`

---

## **SECTION 6: BUSINESS LOGIC LOCATION INDEX**

### **Revenue & Pricing Calculations**

**Booking Total Price Calculation**:
- **Location**: `apps/bookings/serializers.py → PricingPreviewSerializer.validate()`
- **Location**: `apps/bookings/serializers.py → GuestBookingCreateSerializer.create()`
- **Logic**: Base price + weekend surcharge + geographic surcharge + organizing fees + COI fee
- **Used By**: Guest booking API, authenticated booking API, pricing preview API

**Customer Lifetime Value**:
- **Location**: `apps/customers/models.py → CustomerProfile.total_spent_cents`
- **Logic**: Auto-incremented on booking completion via payment confirmation
- **Used By**: Customer dashboard, VIP qualification, staff customer detail

**VIP Status Determination**:
- **Location**: `apps/payments/services.py → StripePaymentService.confirm_payment()`
- **Logic**: Auto-granted when `CustomerProfile.total_spent_cents >= 200000` ($2000)
- **Trigger**: Payment confirmation updates customer stats
- **Side Effect**: Sets `CustomerProfile.is_vip = True`

---

### **Payment & Refund Processing**

**Payment Intent Creation**:
- **Location**: `apps/payments/services.py → StripePaymentService.create_payment_intent()`
- **Logic**: Creates Stripe PaymentIntent with booking amount, metadata
- **Mock Mode**: Returns simulated response when `STRIPE_TEST_MODE=True`

**Payment Confirmation**:
- **Location**: `apps/payments/services.py → StripePaymentService.confirm_payment()`
- **Logic**: 
  1. Verifies Stripe PaymentIntent status
  2. Updates `Payment.status = 'succeeded'`
  3. Updates `Booking.status = 'confirmed'`
  4. Updates `CustomerProfile` stats (if authenticated)
  5. Triggers Onfleet task creation
- **Used By**: Payment confirm API, webhook handler

**Refund Processing**:
- **Location**: `apps/payments/services.py → StripePaymentService.create_refund()`
- **Logic**: Creates Stripe Refund, updates Payment status
- **Authorization**: Staff-only action with audit logging
- **Used By**: Staff refund creation API

---

### **Authentication & Authorization**

**Customer Authentication**:
- **Location**: `apps/customers/views.py → CustomerLoginView.post()`
- **Validation**: `apps/customers/serializers.py → CustomerLoginSerializer.validate()`
- **Logic**: 
  - Authenticates via Django's `authenticate(email, password)`
  - Enforces single profile type (no hybrid accounts)
  - Creates session with CSRF token
- **Rate Limit**: 5 attempts/min per IP
- **Lock Mechanism**: None (customer accounts don't lock)

**Staff Authentication**:
- **Location**: `apps/accounts/views.py → StaffLoginView.post()`
- **Validation**: `apps/accounts/serializers.py → StaffLoginSerializer.validate()`
- **Logic**:
  - Authenticates via Django's `authenticate(username, password)`
  - Checks `StaffProfile` exists
  - Checks account not locked
  - Logs successful login via `StaffAction.log_action()`
  - Resets `login_attempts` counter on success
- **Rate Limit**: 5 attempts/min per IP
- **Lock Mechanism**: 5 failed attempts = 30-minute lock

**Permission Checks**:
- **Staff-Only Endpoints**: Check `hasattr(request.user, 'staff_profile')`
- **Customer-Only Endpoints**: Check `hasattr(request.user, 'customer_profile')`
- **Pattern**: Manual checks in view methods (no custom permission classes)

---

### **Booking State Transitions**

**Status Lifecycle**:
```
pending → confirmed → in_progress → completed
                    ↘ cancelled
```

**Transition Rules**:
- **pending → confirmed**: Payment succeeds (automatic via payment service)
  - **Location**: `apps/payments/services.py → StripePaymentService.confirm_payment()`
  
- **confirmed → in_progress**: Onfleet driver starts delivery (webhook)
  - **Location**: `apps/logistics/models.py → OnfleetTask.sync_status_from_onfleet()`
  
- **in_progress → completed**: Onfleet delivery completes (webhook)
  - **Location**: `apps/logistics/models.py → OnfleetTask._mark_booking_completed()`
  - **Side Effect**: Updates customer stats, checks VIP qualification
  
- **any → cancelled**: Staff manual action (not implemented yet)

---

### **Address & Geographic Logic**

**Address Reuse Logic**:
- **Location**: `apps/customers/booking_serializers.py → AuthenticatedBookingCreateSerializer.create()`
- **Logic**: If `saved_address_id` provided, fetch existing; else create new `Address`
- **Side Effect**: Increments `SavedAddress.times_used` when reused

**Geographic Surcharge Application**:
- **Location**: `apps/bookings/serializers.py → PricingPreviewSerializer.validate()`
- **Logic**: 
  - CT/NJ surcharge: +$220 if pickup state is CT or NJ
  - Amagansett/Montauk surcharge: +$120 if delivery city contains "Amagansett" or "Montauk"
- **Rules**: Fetched from active `SurchargeRule` records with `surcharge_type='geographic'`

**Address Validation**:
- **Location**: `apps/bookings/models.py → Address` model
- **Logic**: State must be NY, CT, or NJ (choices constraint)

---

### **Organizing Service Add-Ons**

**Organizing Service Selection**:
- **Location**: `apps/bookings/serializers.py → GuestBookingCreateSerializer.validate()`
- **Logic**:
  - Only applicable when `service_type='mini_move'`
  - Validates organizing service IDs exist and match mini move tier
  - Adds prices to total if selected

**Organizing Service Pricing**:
- **Location**: `apps/services/models.py → OrganizingService`
- **Seeded Data**: Created via migration `0003_populate_organizing_services.py`
- **Price Range**: $247-$507 (packing), $220-$452 (unpacking) depending on tier

---

### **Audit Logging**

**Staff Action Logging**:
- **Location**: `apps/accounts/models.py → StaffAction.log_action()`
- **Captured Data**: User, action type, description, IP, user agent, related IDs
- **Trigger Points**:
  - Login/logout
  - Booking status changes
  - Customer note updates
  - Refund creation
- **Retention**: Permanent (no automatic cleanup)

**Payment Audit Trail**:
- **Location**: `apps/payments/models.py → PaymentAudit`
- **Captured Events**: All payment/refund state changes
- **Used By**: Compliance, dispute resolution

---

## **SECTION 7: INTEGRATION & TECH STACK SUMMARY**

### **Infrastructure**

**Database**: PostgreSQL 16
- **Connection**: Via `DATABASE_URL` environment variable or individual DB settings
- **ORM**: Django ORM with migrations
- **Sessions**: Database-backed (`django.contrib.sessions.backends.db`)
- **Connection Pooling**: Via `dj-database-url` with `conn_max_age=600`

**Cache & Sessions**: Redis 7
- **Connection**: Via `REDIS_URL` environment variable
- **Backend**: `django_redis.cache.RedisCache`
- **Usage**: Rate limiting cache, session storage (optional), Celery broker
- **Fallback**: `IGNORE_EXCEPTIONS=True` for graceful degradation

**Task Queue**: Celery 5.5.3
- **Broker**: Redis
- **Result Backend**: Redis
- **Scheduler**: django-celery-beat for periodic tasks
- **Serialization**: JSON
- **Timezone**: America/New_York

**File Storage**:
- **Development**: Local filesystem (`MEDIA_ROOT = BASE_DIR / 'media'`)
- **Production**: AWS S3 via django-storages (configured but not actively used)
- **Static Files**: WhiteNoise for compressed static file serving

---

### **External Service Integrations**

#### **Stripe (Payment Processing)**

**Implementation**: `apps/payments/services.py → StripePaymentService`

**API Version**: 12.4.0 Python library

**Operations**:
- `create_payment_intent(booking, customer_email)` - Creates PaymentIntent
- `confirm_payment(payment_intent_id)` - Confirms payment and triggers booking update
- `create_refund(payment, amount_cents, reason)` - Processes refund

**Mock Mode**: `STRIPE_TEST_MODE=True` (default in development)
- Returns simulated responses without calling Stripe API
- Mock PaymentIntent IDs: `pi_mock_XXXXXXXXXX`

**Webhook Support**: `POST /api/payments/webhook/`
- Signature verification: TODO (currently accepts all webhooks)
- Events handled: `payment_intent.succeeded`, `payment_intent.payment_failed`

**Environment Variables**:
- `STRIPE_API_KEY` - Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Webhook signature verification

**Error Handling**: 
- Captures `stripe.error.StripeError` exceptions
- Stores `failure_reason` in Payment model
- Creates PaymentAudit log entry

---

#### **Onfleet (Logistics & Delivery Tracking)**

**Implementation**: 
- `apps/logistics/services.py → OnfleetService` (API wrapper)
- `apps/logistics/services.py → ToteTaxiOnfleetIntegration` (business logic)

**Operations**:
- `create_task_from_booking(booking)` - Creates delivery task
- `get_task_status(onfleet_task_id)` - Fetches current task status
- `get_organization_info()` - Retrieves org stats for dashboard

**Mock Mode**: `ONFLEET_MOCK_MODE=True` (default)
- Returns simulated responses with fake task IDs
- Mock Task IDs: `onfleet_mock_XXXXX`
- Mock Tracking URLs: `https://onf.lt/XXXXX`

**Webhook Support**: `POST /api/logistics/webhook/`
- Signature verification: TODO
- Events handled: `task:started`, `task:completed`, `task:failed`
- Updates `OnfleetTask` status and cascades to `Booking`

**Environment Variables**:
- `ONFLEET_API_KEY` - Onfleet API key
- `ONFLEET_MOCK_MODE` - Enable/disable mock mode

**Status Mapping**:
```python
Onfleet State → ToteTaxi Status
0 (unassigned) → created
1 (assigned) → assigned
2 (active) → active
3 (completed) → completed
```

**Auto-Creation**: Triggered by Django signal when `booking.status='confirmed'`

---

#### **SendGrid (Email Notifications)**

**Status**: Stub implementation (not active)

**Planned Usage**:
- Booking confirmations
- Payment receipts
- Delivery status updates

**Implementation Path**: `apps/notifications/` (currently empty)

---

#### **AWS S3 (File Storage)**

**Configuration**: Via django-storages and boto3

**Usage**: Configured but not actively used (no file upload features yet)

**Environment Variables**:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_STORAGE_BUCKET_NAME`
- `AWS_S3_REGION_NAME`

**Future Use Cases**: 
- Customer uploaded documents (COI, proof of delivery)
- Staff uploaded photos

---

### **Key Configuration Values**

**Security**:
- `SECRET_KEY` - Django secret (env variable required)
- `DEBUG` - False by default (True only in .env for dev)
- `ALLOWED_HOSTS` - Localhost + Fly.io domains
- `CSRF_TRUSTED_ORIGINS` - Frontend domains for cross-domain

**CORS Settings** (Cross-Domain Support):
```python
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'https://totetaxi.netlify.app',
]
CORS_ALLOW_CREDENTIALS = True  # Enables session cookies
```

**Session Settings** (Mobile-Friendly):
```python
SESSION_COOKIE_SAMESITE = 'None'  # Cross-domain sessions
SESSION_COOKIE_SECURE = True      # HTTPS only (prod)
SESSION_COOKIE_AGE = 60 * 60 * 24 * 30  # 30 days
SESSION_SAVE_EVERY_REQUEST = True  # Refresh session
```

**CSRF Settings**:
```python
CSRF_COOKIE_SAMESITE = 'None'
CSRF_COOKIE_HTTPONLY = False  # Allow JS access
CSRF_COOKIE_SECURE = True     # HTTPS only (prod)
```

**Rate Limiting**:
```python
RATELIMIT_USE_CACHE = 'default'  # Uses Redis
RATELIMIT_ENABLE = True
# Per-endpoint rates defined in view decorators
```

**Timezone**: `America/New_York`

**Pagination**: 20 items per page (REST Framework default)

---

### **Environment Variables Required**

**Essential**:
- `SECRET_KEY` - Django secret key
- `DATABASE_URL` - PostgreSQL connection string (Fly.io provides)
- `REDIS_URL` - Redis connection string (Fly.io provides)

**Optional (with defaults)**:
- `DEBUG` - Default: False
- `ALLOWED_HOSTS` - Default: localhost, 127.0.0.1
- `CORS_ALLOWED_ORIGINS` - Default: localhost:3000
- `CSRF_TRUSTED_ORIGINS` - Default: localhost:3000

**External Services** (optional in dev with mocks):
- `STRIPE_API_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `ONFLEET_API_KEY`
- `ONFLEET_MOCK_MODE` - Default: True
- `SENDGRID_API_KEY` (not used yet)

**AWS S3** (not required):
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_STORAGE_BUCKET_NAME`

---

## **SECTION 8: DEVELOPMENT PATTERNS & CONVENTIONS**

### **Adding a New API Endpoint**

1. **Create/Update Serializer** (if needed):
```python
# apps/myapp/serializers.py
class MyResourceSerializer(serializers.ModelSerializer):
    computed_field = serializers.SerializerMethodField()
    
    class Meta:
        model = MyModel
        fields = ('id', 'name', 'computed_field')
    
    def get_computed_field(self, obj):
        return obj.calculate_something()
```

2. **Create View**:
```python
# apps/myapp/views.py
from rest_framework import generics, permissions
from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator

@method_decorator(ratelimit(key='user', rate='30/m', method='GET'), name='get')
class MyResourceView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = MyResourceSerializer
    
    def get_queryset(self):
        return MyModel.objects.filter(user=self.request.user)
```

3. **Add URL Pattern**:
```python
# apps/myapp/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('my-resource/', views.MyResourceView.as_view(), name='my-resource'),
]
```

4. **Include in Root URLs** (if new app):
```python
# config/urls.py
urlpatterns = [
    path('api/myapp/', include('apps.myapp.urls')),
]
```

5. **Write Tests**:
```python
# apps/myapp/tests.py
from django.test import TestCase
from rest_framework.test import APIClient

class MyResourceTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        # Setup test data
    
    def test_list_resources(self):
        response = self.client.get('/api/myapp/my-resource/')
        self.assertEqual(response.status_code, 200)
```

6. **Update Documentation**: Add to this README

---

### **Modifying an Existing Model**

1. **Update Model Definition**:
```python
# apps/myapp/models.py
class MyModel(models.Model):
    new_field = models.CharField(max_length=100, blank=True)  # Add field
    
    def new_method(self):
        return "something"
```

2. **Create Migration**:
```bash
python manage.py makemigrations myapp
```

3. **Review Migration File**:
```python
# Check generated migration for correctness
# apps/myapp/migrations/0002_mymodel_new_field.py
```

4. **Run Migration**:
```bash
python manage.py migrate
```

5. **Update Serializers** (if field should be exposed):
```python
# apps/myapp/serializers.py
class MyModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = MyModel
        fields = ('id', 'name', 'new_field')  # Add new_field
```

6. **Update Views** (if query logic changes):
```python
# apps/myapp/views.py
def get_queryset(self):
    return MyModel.objects.filter(new_field__isnull=False)
```

7. **Run Tests**:
```bash
python manage.py test apps.myapp
```

8. **Update Documentation**: Modify model documentation above

---

### **Adding Business Logic**

**Decision Tree**:
- **Simple CRUD operations** → ViewSet methods
- **Complex multi-step operations** → Service class in `services.py`
- **Data calculations** → Model methods
- **Async/background operations** → Celery tasks in `tasks.py`
- **Reusable utilities** → Helper functions in `utils.py`

**Example: Adding a Service Class**:
```python
# apps/myapp/services.py
import logging

logger = logging.getLogger(__name__)

class MyBusinessService:
    """Handles complex business logic for MyApp"""
    
    @staticmethod
    def perform_complex_operation(instance, data):
        """
        Multi-step business operation:
        1. Validate data
        2. Update related records
        3. Send notifications
        4. Log action
        """
        try:
            # Step 1: Validate
            if not MyBusinessService._validate(data):
                raise ValidationError("Invalid data")
            
            # Step 2: Update records
            instance.update_something(data)
            related = instance.related_set.all()
            for item in related:
                item.sync()
            
            # Step 3: Send notifications
            # NotificationService.send(...)
            
            # Step 4: Log
            logger.info(f"Complex operation completed for {instance.id}")
            
            return instance
            
        except Exception as e:
            logger.error(f"Complex operation failed: {e}")
            raise
    
    @staticmethod
    def _validate(data):
        # Private validation logic
        return True
```

**Usage in View**:
```python
# apps/myapp/views.py
from .services import MyBusinessService

class MyView(APIView):
    def post(self, request):
        instance = MyModel.objects.get(id=request.data['id'])
        result = MyBusinessService.perform_complex_operation(instance, request.data)
        return Response({'success': True})
```

---

### **Code Organization Rules**

**Models** (`models.py`):
- Data structure definitions
- Field constraints and validators
- Simple computed properties (`@property`)
- Simple data methods (formatting, lookup)
- **NO** complex business logic, API calls, or multi-record operations

**Serializers** (`serializers.py`):
- Request/response data transformation
- Field-level validation (`validate_<field>()`)
- Object-level validation (`validate()`)
- Simple computed fields (`SerializerMethodField`)
- **NO** database writes in validation (use `create()` or `update()`)

**Views** (`views.py`):
- Request handling (authentication, permissions)
- Response formatting
- Simple query filtering
- Delegation to serializers/services for complex logic
- **Thin views**: Minimal business logic

**Services** (`services.py`):
- Complex business operations
- Multi-step workflows
- External API integrations
- Cross-model operations
- **Heavy lifting**: All complex logic

**Tasks** (`tasks.py`):
- Celery async tasks
- Background jobs (email sending, batch processing)
- Scheduled periodic tasks
- **Non-blocking**: Must not block request/response

**Utils** (`utils.py`):
- Reusable helper functions
- Data transformation utilities
- Common validators
- **Stateless**: Pure functions when possible

---

### **Testing Patterns**

**Test Structure**:
```
apps/myapp/
├── tests/
│   ├── __init__.py
│   ├── test_models.py
│   ├── test_views.py
│   ├── test_serializers.py
│   └── test_services.py
```

**Model Tests**:
```python
# apps/myapp/tests/test_models.py
from django.test import TestCase
from apps.myapp.models import MyModel

class MyModelTestCase(TestCase):
    def setUp(self):
        self.instance = MyModel.objects.create(name="Test")
    
    def test_str_representation(self):
        self.assertEqual(str(self.instance), "Test")
    
    def test_computed_property(self):
        self.assertEqual(self.instance.computed_field, "expected value")
```

**API Endpoint Tests**:
```python
# apps/myapp/tests/test_views.py
from rest_framework.test import APITestCase, APIClient
from django.contrib.auth.models import User

class MyAPITestCase(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user('test@example.com', 'password')
        self.client.force_authenticate(user=self.user)
    
    def test_list_endpoint(self):
        response = self.client.get('/api/myapp/resources/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('results', response.data)
```

**Mock External Services**:
```python
# apps/myapp/tests/test_services.py
from unittest.mock import patch, MagicMock
from django.test import TestCase
from apps.myapp.services import MyExternalService

class MyServiceTestCase(TestCase):
    @patch('apps.myapp.services.external_api_call')
    def test_external_integration(self, mock_api):
        mock_api.return_value = {'status': 'success'}
        result = MyExternalService.call_external_api()
        self.assertEqual(result['status'], 'success')
        mock_api.assert_called_once()
```

**Running Tests**:
```bash
# All tests
python manage.py test

# Specific app
python manage.py test apps.myapp

# Specific test case
python manage.py test apps.myapp.tests.test_models.MyModelTestCase

# With coverage
pytest --cov=apps --cov-report=html
```

---

### **Migration Best Practices**

**Creating Migrations**:
```bash
# After model changes
python manage.py makemigrations

# With custom name
python manage.py makemigrations --name add_customer_vip_field

# Dry run (show SQL)
python manage.py sqlmigrate myapp 0001
```

**Data Migrations**:
```python
# apps/myapp/migrations/0003_populate_initial_data.py
from django.db import migrations

def populate_data(apps, schema_editor):
    MyModel = apps.get_model('myapp', 'MyModel')
    MyModel.objects.create(name="Initial", value=100)

def reverse_populate(apps, schema_editor):
    MyModel = apps.get_model('myapp', 'MyModel')
    MyModel.objects.filter(name="Initial").delete()

class Migration(migrations.Migration):
    dependencies = [
        ('myapp', '0002_previous_migration'),
    ]
    
    operations = [
        migrations.RunPython(populate_data, reverse_populate),
    ]
```

**Squashing Migrations** (when too many):
```bash
python manage.py squashmigrations myapp 0001 0010
```

---

### **Deployment Workflow**

**Development** (Docker Compose):
```bash
# Start all services
docker-compose up

# Rebuild after dependency changes
docker-compose up --build

# Run migrations
docker-compose exec web python manage.py migrate

# Create superuser
docker-compose exec web python manage.py createsuperuser

# View logs
docker-compose logs -f web
```

**Production** (Fly.io):
```bash
# Deploy
fly deploy

# View logs
fly logs

# SSH into container
fly ssh console

# Run commands
fly ssh console -C "python manage.py migrate"

# Scale resources
fly scale vm shared-cpu-1x --memory 512
```

**Database Migrations on Production**:
- Automatic via `scripts/entrypoint.sh`
- Runs `python manage.py migrate --no-input` on container startup

**Static Files**:
- Collected automatically in Dockerfile: `RUN python manage.py collectstatic --no-input`
- Served by WhiteNoise in production

---

### **Logging & Debugging**

**Log Levels**:
```python
import logging
logger = logging.getLogger(__name__)

logger.debug("Detailed diagnostic info")
logger.info("General informational messages")
logger.warning("Warning messages")
logger.error("Error messages")
logger.critical("Critical failures")
```

**Django Debug Toolbar** (Development):
- Enabled when `DEBUG=True`
- Shows SQL queries, template context, headers
- Access at `/__debug__/` in browser

**Print Debugging in Views**:
```python
print("=" * 80)
print("DEBUG: Request received")
print(f"User: {request.user}")
print(f"Data: {request.data}")
print("=" * 80)
```

**Sentry Error Tracking** (Production):
- Configured via `SENTRY_DSN` environment variable
- Captures exceptions automatically
- Provides context: user, request data, stack trace

---

### **Common Development Commands**

```bash
# Django management
python manage.py runserver              # Start dev server
python manage.py shell                  # Django shell
python manage.py dbshell                # Database shell
python manage.py makemigrations         # Create migrations
python manage.py migrate                # Run migrations
python manage.py createsuperuser        # Create admin user
python manage.py collectstatic          # Collect static files

# Testing
python manage.py test                   # Run all tests
pytest                                  # Run pytest suite
pytest --cov                            # With coverage

# Code quality
black .                                 # Format code
isort .                                 # Sort imports
flake8                                  # Linting

# Database
python manage.py dumpdata > backup.json # Export data
python manage.py loaddata backup.json   # Import data
python manage.py flush                  # Clear database

# Custom commands
python manage.py shell < recreate_services.py  # Seed service catalog
```

---

## **AI EXECUTIVE FUNCTION CHECKLIST**

✅ **Understand Architecture** - System design mapped with layer separation and integration patterns  
✅ **Navigate Files** - Complete file tree with purpose descriptions for 119 backend files  
✅ **Identify Dependencies** - Feature-to-file maps show execution chains and side effects  
✅ **Request Context** - File locations documented for all major features and business logic  
✅ **Extend Features** - Development patterns documented with code examples  
✅ **Predict Impact** - Relationship documentation shows cascade effects of model changes

---

## **REGENERATION WORKFLOW**

When significant changes occur to the codebase:

1. Update `scripts/back_export.py` if needed (add new apps/patterns)
2. Run: `python scripts/back_export.py` to regenerate `back_export.txt`
3. Provide this README template + new `back_export.txt` to AI
4. Request: *"Generate updated living documentation following the Strategic Extraction Protocol"*
5. Review generated documentation for accuracy
6. Commit both `back_export.txt` and updated `README.md`

**Critical for Regeneration**: Always use `back_export.txt` as the authoritative code source. This README is a navigation map, not a code repository.

---

*End of Living Documentation*