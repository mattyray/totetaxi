Perfect! I'll generate the living documentation targeting ~12,000 tokens. Let me systematically extract information from back_export.txt following the Strategic Extraction Protocol.Perfect! I now have enough information. Let me generate the complete living documentation targeting ~12,000 tokens:

---

# TOTETAXI BACKEND - LIVING DOCUMENTATION v2.0
**Auto-Generated Strategic Navigation System**  
**Source:** back_export.txt (135 files, Django 5.2.5 + DRF 3.16.1)  
**Created:** 2025-10-11  
**Apps:** accounts, bookings, crm, customers, documents, logistics, notifications, payments, services

---

## SECTION 1: SYSTEM ARCHITECTURE MENTAL MODEL

### Django Project Structure
ToteTaxi follows a modular Django app architecture with **9 specialized apps** organized by business domain:

**Core Business Logic Apps:**
- **bookings** - Central booking management (guest + authenticated)
- **customers** - Customer authentication, profiles, saved addresses
- **services** - Service catalog (Mini Moves, Organizing, Specialty Items, Surcharges)
- **payments** - Payment processing with Stripe integration
- **logistics** - Onfleet task management and driver coordination

**Support Apps:**
- **accounts** - Staff authentication and admin operations
- **notifications** - Email notifications via SES
- **documents** - Document storage (future COI uploads)
- **crm** - Customer relationship management (future)

### Layer Separation Strategy

**1. Models Layer** (`models.py`)
- Data structure definitions
- Simple data methods and properties
- Business validation rules
- Database relationship management

**2. Serializers Layer** (`serializers.py`)
- Request/response transformation
- Input validation
- Field-level data cleaning
- Nested relationship handling

**3. Views Layer** (`views.py`, `booking_views.py`)
- Request handling and routing
- Permission enforcement
- Response formatting
- Rate limiting decoration

**4. Services Layer** (`services.py`)
- Complex business logic
- External API integrations (Stripe, Onfleet)
- Multi-model operations
- Payment orchestration

**5. Admin Layer** (`admin.py`)
- Django admin customization
- Staff management interfaces
- Data inspection and bulk operations

### Key Architectural Patterns

**Dual Customer Model:**
- **Authenticated Customers:** `User` + `CustomerProfile` (full features)
- **Guest Checkouts:** `GuestCheckout` (one-time bookings)
- Bookings support EITHER customer type via CheckConstraint

**Service Pricing Architecture:**
- Base pricing from `MiniMovePackage` / `SpecialtyItem` models
- Dynamic surcharges from `SurchargeRule` (weekends, geography, time windows)
- Organizing services (packing/unpacking) calculated separately with 8.875% NYC tax
- All pricing stored in cents (`PositiveBigIntegerField`)

**Authentication Strategy:**
- **Customer Auth:** Hybrid session + X-Session-Id header (mobile compatibility)
- **Staff Auth:** Django session authentication with rate limiting
- CSRF protection with SameSite cookies
- Profile type enforcement (staff OR customer, never both)

**Integration Patterns:**
- Stripe: Service class pattern (`StripePaymentService`)
- Onfleet: Service class pattern (`ToteTaxiOnfleetIntegration`)
- SES: Direct Django email backend
- S3: Django-storages with boto3

---

## SECTION 2: COMPLETE API ENDPOINT MAP

### Public Booking Endpoints (`/api/public/`)
**Service Catalog**
- `GET /services/` → `ServiceCatalogView` | Auth: AllowAny | Response: Mini Move packages, specialty items, organizing services
- `GET /services/mini-moves-with-organizing/` → `ServiceCatalogWithOrganizingView` | Auth: AllowAny | Response: Mini Move packages with associated organizing services
- `GET /services/organizing-by-tier/` → `OrganizingServicesByTierView` | Auth: AllowAny | Response: Organizing services grouped by tier
- `GET /services/organizing/<uuid:service_id>/` → `OrganizingServiceDetailView` | Auth: AllowAny | Response: Detailed organizing service info

**Booking Operations**
- `POST /guest-booking/` → `GuestBookingCreateView` | Auth: AllowAny | Request: {service_type, pickup/delivery addresses, customer_info, service selections} | Response: Booking object + payment client_secret
- `GET /booking-status/<str:booking_number>/` → `BookingStatusView` | Auth: AllowAny | Response: Booking details for status lookup
- `POST /pricing-preview/` → `PricingPreviewView` | Auth: AllowAny | Request: {service_type, pickup_date, service selections} | Response: Detailed pricing breakdown
- `GET /calendar/availability/` → `CalendarAvailabilityView` | Auth: AllowAny | Params: start_date, end_date | Response: Calendar with bookings and surcharges
- `POST /validate-zip/` → `ValidateZipCodeView` | Auth: AllowAny | Request: {zip_code} | Response: Service area validation

**Implementation Files:** bookings/views.py, bookings/serializers.py, services/models.py

### Customer Endpoints (`/api/customer/`)
**Authentication**
- `POST /auth/register/` → `CustomerRegistrationView` | Auth: AllowAny | Request: {email, password, first_name, last_name, phone} | Response: User + CustomerProfile
- `POST /auth/login/` → `CustomerLoginView` | Auth: AllowAny | Request: {email, password} | Response: User data + session_id + csrf_token
- `POST /auth/logout/` → `CustomerLogoutView` | Auth: IsAuthenticated | Response: Success message
- `GET /auth/user/` → `CurrentUserView` | Auth: IsAuthenticated | Response: Current user + profile data
- `POST /auth/password-reset/` → `PasswordResetRequestView` | Auth: AllowAny | Request: {email} | Response: Reset token sent
- `POST /auth/password-reset/confirm/` → `PasswordResetConfirmView` | Auth: AllowAny | Request: {token, new_password} | Response: Success/failure
- `POST /auth/verify-email/` → `EmailVerificationView` | Auth: AllowAny | Request: {token} | Response: Email verified
- `POST /auth/resend-verification/` → `ResendVerificationView` | Auth: IsAuthenticated | Response: New token sent
- `GET /csrf-token/` → `CSRFTokenView` | Auth: AllowAny | Response: CSRF token for mobile

**Profile Management**
- `GET/PATCH /profile/` → `CustomerProfileView` | Auth: IsAuthenticated | Request: {phone, preferred_pickup_time, notifications} | Response: CustomerProfile
- `GET/POST /addresses/` → `SavedAddressListCreateView` | Auth: IsAuthenticated | Request: {nickname, address fields} | Response: SavedAddress list/created
- `GET/PUT/DELETE /addresses/<uuid:pk>/` → `SavedAddressDetailView` | Auth: IsAuthenticated | Response: SavedAddress detail

**Booking Management**
- `POST /bookings/create/` → `CustomerBookingCreateView` | Auth: IsAuthenticated | Request: {service selections, addresses (ID or new), special_instructions} | Response: Booking + payment client_secret
- `GET /bookings/` → `CustomerBookingListView` | Auth: IsAuthenticated | Response: User's bookings with pagination
- `GET /bookings/<uuid:booking_id>/` → `CustomerBookingDetailView` | Auth: IsAuthenticated | Response: Detailed booking with pricing breakdown
- `POST /bookings/<uuid:booking_id>/rebook/` → `QuickRebookView` | Auth: IsAuthenticated | Request: {pickup_date, pickup_time} | Response: New booking created
- `GET /dashboard/` → `CustomerDashboardView` | Auth: IsAuthenticated | Response: Profile stats, recent bookings, saved addresses
- `GET /preferences/` → `BookingPreferencesView` | Auth: IsAuthenticated | Response: Booking preferences and most-used addresses

**Implementation Files:** customers/views.py, customers/booking_views.py, customers/serializers.py, customers/booking_serializers.py

### Payment Endpoints (`/api/payments/`)
- `POST /create-intent/` → `PaymentIntentCreateView` | Auth: AllowAny | Request: {booking_number} | Response: {client_secret, payment_intent_id}
- `GET /status/<str:booking_number>/` → `PaymentStatusView` | Auth: AllowAny | Response: Payment status for booking
- `POST /confirm/` → `PaymentConfirmView` | Auth: AllowAny | Request: {payment_intent_id, booking_number} | Response: Booking + payment confirmation
- `POST /webhook/` → `StripeWebhookView` | Auth: AllowAny (Stripe signature) | Webhook: Stripe payment events
- `POST /mock-confirm/` → `MockPaymentConfirmView` | Auth: AllowAny (dev only) | Test payment without Stripe
- `GET /payments/` → `PaymentListView` | Auth: Staff | Response: All payments (staff only)
- `GET /refunds/` → `RefundListView` | Auth: Staff | Response: All refunds (staff only)
- `POST /refunds/create/` → `RefundCreateView` | Auth: Staff | Request: {payment_id, amount_cents, reason} | Response: Refund created
- `POST /refunds/process/` → `RefundProcessView` | Auth: Staff | Request: {refund_id, action: approve/deny} | Response: Refund processed

**Implementation Files:** payments/views.py, payments/serializers.py, payments/services.py

### Staff Endpoints (`/api/staff/`)
**Authentication & Dashboard**
- `POST /auth/login/` → `StaffLoginView` | Rate: 5/min | Auth: AllowAny | Request: {email, password} | Response: Staff user + profile
- `POST /auth/logout/` → `StaffLogoutView` | Auth: IsAuthenticated (Staff) | Response: Success
- `GET /csrf-token/` → `StaffCSRFTokenView` | Auth: AllowAny | Response: CSRF token
- `GET /dashboard/` → `StaffDashboardView` | Rate: 10/min | Auth: Staff | Response: Revenue, bookings, urgent bookings, customer stats

**Booking Management**
- `GET /bookings/` → `BookingManagementView` | Rate: 20/min | Auth: Staff | Params: status, date, search | Response: Filtered bookings list
- `GET/PATCH /bookings/<uuid:booking_id>/` → `BookingDetailView` | Rate: 20/min GET, 10/min PATCH | Auth: Staff | Request: {status, notes} | Response: Detailed booking + customer + payment

**Customer Management**
- `GET /customers/` → `CustomerManagementView` | Rate: 20/min | Auth: Staff | Params: search, vip | Response: Customers list with stats
- `GET /customers/<int:customer_id>/` → `CustomerDetailView` | Rate: 15/min | Auth: Staff | Response: Full customer profile + bookings + addresses
- `PATCH /customers/<int:customer_id>/notes/` → `CustomerNotesUpdateView` | Rate: 10/min | Auth: Staff | Request: {notes, is_vip} | Response: Updated profile

**Implementation Files:** accounts/views.py, accounts/serializers.py, accounts/models.py

### Logistics Endpoints (`/api/staff/logistics/`)
- `GET /summary/` → `LogisticsSummaryView` | Auth: Staff | Response: Onfleet task summary
- `POST /sync/` → `sync_onfleet_status` | Auth: Staff | Response: Manual sync of Onfleet tasks
- `GET /tasks/` → `TaskStatusView` | Auth: Staff | Response: All OnfleetTask records
- `POST /create-task/` → `create_task_manually` | Auth: Staff | Request: {booking_id} | Response: Created Onfleet task
- `POST /webhook/` → `OnfleetWebhookView` | Auth: AllowAny (Onfleet signature) | Webhook: Onfleet task updates

**Implementation Files:** logistics/views.py, logistics/services.py, logistics/models.py

---

## SECTION 3: COMPLETE MODEL DOCUMENTATION

### bookings/models.py

```python
class Address(models.Model):
    """Address for pickup/delivery - can be saved by customer or one-time"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='booking_addresses')
    address_line_1 = models.CharField(max_length=200)
    address_line_2 = models.CharField(max_length=200, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=2, choices=[('NY', 'New York'), ('CT', 'Connecticut'), ('NJ', 'New Jersey')])
    zip_code = models.CharField(max_length=10)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Meta
    class Meta:
        db_table = 'bookings_address'
```

```python
class GuestCheckout(models.Model):
    """Guest customer info for non-authenticated bookings"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=20, validators=[RegexValidator(regex=r'^\+?1?\d{9,15}$')])
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Meta
    class Meta:
        db_table = 'bookings_guest_checkout'
```

```python
class Booking(models.Model):
    """Core booking - works with customer OR guest checkout - WITH SERVICES INTEGRATION + BLADE"""
    
    # Choices
    STATUS_CHOICES = [('pending', 'Pending'), ('confirmed', 'Confirmed'), ('paid', 'Paid'), ('completed', 'Completed'), ('cancelled', 'Cancelled')]
    SERVICE_TYPE_CHOICES = [('mini_move', 'Mini Move'), ('standard_delivery', 'Standard Delivery'), ('specialty_item', 'Specialty Item'), ('blade_transfer', 'BLADE Airport Transfer')]
    PICKUP_TIME_CHOICES = [('morning', '8 AM - 11 AM'), ('morning_specific', 'Specific 1-hour window'), ('no_time_preference', 'No time preference')]
    BLADE_AIRPORT_CHOICES = [('JFK', 'JFK International'), ('EWR', 'Newark Liberty')]
    
    # Primary Keys & Relationships
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking_number = models.CharField(max_length=20, unique=True, blank=True)
    customer = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='bookings')
    guest_checkout = models.OneToOneField(GuestCheckout, on_delete=models.CASCADE, null=True, blank=True, related_name='booking')
    
    # Service Configuration
    service_type = models.CharField(max_length=20, choices=SERVICE_TYPE_CHOICES)
    mini_move_package = models.ForeignKey('services.MiniMovePackage', on_delete=models.PROTECT, null=True, blank=True)
    include_packing = models.BooleanField(default=False)
    include_unpacking = models.BooleanField(default=False)
    standard_delivery_item_count = models.PositiveIntegerField(null=True, blank=True)
    is_same_day_delivery = models.BooleanField(default=False)
    specialty_items = models.ManyToManyField('services.SpecialtyItem', blank=True)
    
    # BLADE Transfer Fields
    blade_airport = models.CharField(max_length=3, choices=BLADE_AIRPORT_CHOICES, null=True, blank=True)
    blade_flight_date = models.DateField(null=True, blank=True)
    blade_flight_time = models.TimeField(null=True, blank=True)
    blade_bag_count = models.PositiveIntegerField(null=True, blank=True)
    blade_ready_time = models.TimeField(null=True, blank=True)
    
    # Addresses & Schedule
    pickup_address = models.ForeignKey(Address, on_delete=models.PROTECT, related_name='pickup_bookings')
    delivery_address = models.ForeignKey(Address, on_delete=models.PROTECT, related_name='delivery_bookings')
    pickup_date = models.DateField()
    pickup_time = models.CharField(max_length=20, choices=PICKUP_TIME_CHOICES, default='morning')
    specific_pickup_hour = models.PositiveIntegerField(null=True, blank=True)
    special_instructions = models.TextField(blank=True)
    coi_required = models.BooleanField(default=False)
    is_outside_core_area = models.BooleanField(default=False)
    
    # Pricing (all in cents)
    base_price_cents = models.PositiveBigIntegerField(default=0)
    surcharge_cents = models.PositiveBigIntegerField(default=0)
    same_day_surcharge_cents = models.PositiveBigIntegerField(default=0)
    coi_fee_cents = models.PositiveBigIntegerField(default=0)
    organizing_total_cents = models.PositiveBigIntegerField(default=0)
    organizing_tax_cents = models.PositiveBigIntegerField(default=0)
    geographic_surcharge_cents = models.PositiveBigIntegerField(default=0)
    time_window_surcharge_cents = models.PositiveBigIntegerField(default=0)
    total_price_cents = models.PositiveBigIntegerField(default=0)
    
    # Status & Timestamps
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Meta
    class Meta:
        db_table = 'bookings_booking'
        constraints = [models.CheckConstraint(condition=Q(Q(customer__isnull=False, guest_checkout__isnull=True) | Q(customer__isnull=True, guest_checkout__isnull=False)), name='booking_exactly_one_customer_type')]
    
    # Key Methods
    def get_customer_name(self): """Returns name from customer or guest_checkout"""
    def get_customer_email(self): """Returns email from customer or guest_checkout"""
    def get_pricing_breakdown(self): """Returns dict with all pricing components"""
    def get_organizing_services_breakdown(self): """Returns list of organizing services applied"""
    @property def total_price_dollars(self): return self.total_price_cents / 100
    @property def organizing_total_dollars(self): return self.organizing_total_cents / 100
```

### services/models.py

```python
class MiniMovePackage(models.Model):
    """Mini Move service packages: Petite, Standard, Full"""
    
    PACKAGE_TYPES = [('petite', 'Petite'), ('standard', 'Standard'), ('full', 'Full Move')]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    package_type = models.CharField(max_length=20, choices=PACKAGE_TYPES, unique=True)
    name = models.CharField(max_length=50)
    description = models.TextField()
    base_price_cents = models.PositiveBigIntegerField()
    max_items = models.PositiveIntegerField(null=True, blank=True)
    max_weight_per_item_lbs = models.PositiveIntegerField(default=50)
    coi_included = models.BooleanField(default=False)
    coi_fee_cents = models.PositiveBigIntegerField(default=5000)
    priority_scheduling = models.BooleanField(default=False)
    protective_wrapping = models.BooleanField(default=False)
    is_most_popular = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Meta
    class Meta:
        db_table = 'services_mini_move_package'
        ordering = ['base_price_cents']
    
    # Properties
    @property def base_price_dollars(self): return self.base_price_cents / 100
    @property def coi_fee_dollars(self): return self.coi_fee_cents / 100
```

```python
class OrganizingService(models.Model):
    """Professional packing/unpacking services tied to Mini Move tiers"""
    
    ORGANIZING_TYPES = [('petite_packing', 'Petite Packing'), ('standard_packing', 'Standard Packing'), ('full_packing', 'Full Packing'), ('petite_unpacking', 'Petite Unpacking'), ('standard_unpacking', 'Standard Unpacking'), ('full_unpacking', 'Full Unpacking')]
    MINI_MOVE_TIERS = [('petite', 'Petite'), ('standard', 'Standard'), ('full', 'Full')]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    service_type = models.CharField(max_length=30, choices=ORGANIZING_TYPES, unique=True)
    mini_move_tier = models.CharField(max_length=20, choices=MINI_MOVE_TIERS)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    price_cents = models.PositiveBigIntegerField()
    duration_hours = models.PositiveIntegerField()
    organizer_count = models.PositiveIntegerField()
    supplies_allowance_cents = models.PositiveBigIntegerField(default=0)
    is_packing_service = models.BooleanField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Meta
    class Meta:
        db_table = 'services_organizing_service'
        ordering = ['mini_move_tier', 'is_packing_service', 'price_cents']
    
    # Properties & Methods
    @property def price_dollars(self): return self.price_cents / 100
    @property def supplies_allowance_dollars(self): return self.supplies_allowance_cents / 100
    def can_be_added_to_mini_move(self, mini_move_package_type): return self.mini_move_tier == mini_move_package_type
```

```python
class SpecialtyItem(models.Model):
    """Specialty item catalog (Peloton, surfboard, art, piano, etc.)"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    description = models.TextField()
    base_price_cents = models.PositiveBigIntegerField()
    requires_disassembly = models.BooleanField(default=False)
    max_weight_lbs = models.PositiveIntegerField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Meta
    class Meta:
        db_table = 'services_specialty_item'
        ordering = ['name']
    
    # Properties
    @property def base_price_dollars(self): return self.base_price_cents / 100
```

```python
class SurchargeRule(models.Model):
    """Dynamic surcharge rules (weekend, geographic, peak dates)"""
    
    SURCHARGE_TYPES = [('weekend', 'Weekend Surcharge'), ('peak_date', 'Peak Date Surcharge'), ('geographic', 'Geographic Surcharge'), ('time_window', 'Specific Time Window Surcharge')]
    CALCULATION_TYPES = [('percentage', 'Percentage'), ('fixed_amount', 'Fixed Amount')]
    SERVICE_TYPE_CHOICES = [('all', 'All Services'), ('mini_move', 'Mini Move Only'), ('standard_delivery', 'Standard Delivery Only'), ('specialty_item', 'Specialty Item Only'), ('blade_transfer', 'BLADE Transfer Only')]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    surcharge_type = models.CharField(max_length=20, choices=SURCHARGE_TYPES)
    name = models.CharField(max_length=100)
    description = models.TextField()
    applies_to_service_type = models.CharField(max_length=30, choices=SERVICE_TYPE_CHOICES, default='all')
    calculation_type = models.CharField(max_length=20, choices=CALCULATION_TYPES)
    percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    fixed_amount_cents = models.PositiveBigIntegerField(null=True, blank=True)
    specific_date = models.DateField(null=True, blank=True)
    applies_saturday = models.BooleanField(default=False)
    applies_sunday = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Meta
    class Meta:
        db_table = 'services_surcharge_rule'
    
    # Methods
    def calculate_surcharge(self, base_amount_cents, booking_date, service_type=None): """Calculate surcharge for given base amount, date, and service type"""
    def applies_to_date(self, booking_date): """Check if surcharge rule applies to given date"""
```

### customers/models.py

```python
class CustomerProfile(models.Model):
    """Customer profile with booking history and preferences"""
    
    PICKUP_TIME_CHOICES = [('morning', '8 AM - 11 AM'), ('morning_specific', 'Specific 1-hour window'), ('no_time_preference', 'No time preference')]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='customer_profile')
    phone = models.CharField(max_length=20, validators=[RegexValidator(regex=r'^\+?1?\d{9,15}$')])
    preferred_pickup_time = models.CharField(max_length=30, choices=PICKUP_TIME_CHOICES, default='morning')
    total_bookings = models.PositiveIntegerField(default=0)
    total_spent_cents = models.PositiveBigIntegerField(default=0)
    last_booking_at = models.DateTimeField(null=True, blank=True)
    is_vip = models.BooleanField(default=False)
    email_notifications = models.BooleanField(default=True)
    sms_notifications = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Meta
    class Meta:
        db_table = 'customers_customer_profile'
    
    # Validation
    def clean(self): """Ensure user only has customer profile OR staff profile, not both"""
    
    # Methods
    @property def total_spent_dollars(self): return self.total_spent_cents / 100
    def add_booking_stats(self, booking_total_cents): """Update stats after booking completion"""
```

```python
class SavedAddress(models.Model):
    """Customer's saved addresses for quick booking"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='saved_addresses')
    nickname = models.CharField(max_length=50)
    address_line_1 = models.CharField(max_length=200)
    address_line_2 = models.CharField(max_length=200, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=2, choices=[('NY', 'New York'), ('CT', 'Connecticut'), ('NJ', 'New Jersey')])
    zip_code = models.CharField(max_length=10)
    delivery_instructions = models.TextField(blank=True)
    times_used = models.PositiveIntegerField(default=0)
    last_used_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Meta
    class Meta:
        db_table = 'customers_saved_address'
        constraints = [models.UniqueConstraint(fields=['user', 'nickname'], name='unique_customer_address_nickname')]
    
    # Properties & Methods
    @property def formatted_address(self): """Returns comma-separated formatted address"""
    def mark_used(self): """Increment times_used and update last_used_at"""
```

### payments/models.py

```python
class Payment(models.Model):
    """Payment records for bookings - Stripe integration"""
    
    STATUS_CHOICES = [('pending', 'Pending'), ('succeeded', 'Succeeded'), ('failed', 'Failed'), ('refunded', 'Refunded')]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.ForeignKey('bookings.Booking', on_delete=models.PROTECT, related_name='payments')
    customer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='payments')
    amount_cents = models.PositiveBigIntegerField()
    stripe_payment_intent_id = models.CharField(max_length=200, blank=True)
    stripe_charge_id = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    failure_reason = models.TextField(blank=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Meta
    class Meta:
        db_table = 'payments_payment'
    
    # Properties
    @property def amount_dollars(self): return self.amount_cents / 100
```

```python
class Refund(models.Model):
    """Refund requests with approval workflow"""
    
    STATUS_CHOICES = [('requested', 'Requested'), ('approved', 'Approved'), ('denied', 'Denied'), ('completed', 'Completed')]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    payment = models.ForeignKey(Payment, on_delete=models.PROTECT, related_name='refunds')
    amount_cents = models.PositiveBigIntegerField()
    reason = models.TextField()
    requested_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='requested_refunds')
    approved_by = models.ForeignKey(User, on_delete=models.PROTECT, null=True, blank=True, related_name='approved_refunds')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='requested')
    stripe_refund_id = models.CharField(max_length=200, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Meta
    class Meta:
        db_table = 'payments_refund'
    
    # Properties & Methods
    @property def amount_dollars(self): return self.amount_cents / 100
    def approve(self, admin_user): """Admin approves refund"""
```

### accounts/models.py

```python
class StaffProfile(models.Model):
    """Staff member profile with role and permissions"""
    
    ROLE_CHOICES = [('admin', 'Administrator'), ('manager', 'Manager'), ('operator', 'Operator')]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='staff_profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='operator')
    phone = models.CharField(max_length=20, blank=True)
    can_approve_refunds = models.BooleanField(default=False)
    can_modify_bookings = models.BooleanField(default=True)
    can_view_financials = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Meta
    class Meta:
        db_table = 'accounts_staff_profile'
```

```python
class StaffAction(models.Model):
    """Audit log for staff actions"""
    
    ACTION_TYPES = [('login', 'Login'), ('logout', 'Logout'), ('view_customer', 'View Customer'), ('modify_booking', 'Modify Booking'), ('process_refund', 'Process Refund'), ('approve_refund', 'Approve Refund'), ('upload_document', 'Upload Document'), ('send_notification', 'Send Notification'), ('export_data', 'Export Data'), ('view_dashboard', 'View Dashboard'), ('manage_logistics', 'Manage Logistics')]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    staff_user = models.ForeignKey(User, on_delete=models.PROTECT, related_name='staff_actions')
    action_type = models.CharField(max_length=30, choices=ACTION_TYPES)
    description = models.TextField()
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    customer_id = models.UUIDField(null=True, blank=True)
    booking_id = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Meta
    class Meta:
        db_table = 'accounts_staff_action'
        ordering = ['-created_at']
        indexes = [models.Index(fields=['staff_user', '-created_at']), models.Index(fields=['action_type', '-created_at']), models.Index(fields=['customer_id']), models.Index(fields=['booking_id'])]
    
    # Class Methods
    @classmethod
    def log_action(cls, staff_user, action_type, description, request, **kwargs): """Create audit log entry"""
```

### logistics/models.py

```python
class OnfleetTask(models.Model):
    """Onfleet task tracking for delivery logistics"""
    
    STATUS_CHOICES = [('created', 'Created'), ('assigned', 'Assigned'), ('active', 'Active'), ('completed', 'Completed'), ('failed', 'Failed')]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.OneToOneField('bookings.Booking', on_delete=models.CASCADE, related_name='onfleet_task')
    onfleet_task_id = models.CharField(max_length=100, unique=True)
    onfleet_short_id = models.CharField(max_length=20, blank=True)
    tracking_url = models.URLField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='created')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_synced = models.DateTimeField(null=True, blank=True)
    
    # Meta
    class Meta:
        db_table = 'logistics_onfleet_task'
        indexes = [models.Index(fields=['onfleet_task_id']), models.Index(fields=['status'])]
```

---

## SECTION 4: FILE DIRECTORY + PURPOSE INDEX

```
backend/
├── apps/
│   ├── __init__.py
│   ├── accounts/
│   │   ├── migrations/
│   │   │   ├── 0001_initial.py - Initial StaffProfile and StaffAction models
│   │   │   └── 0002_alter_staffaction_action_type.py - Add new staff action types
│   │   ├── __init__.py
│   │   ├── admin.py - Staff and StaffAction admin interfaces
│   │   ├── apps.py - App configuration
│   │   ├── models.py - StaffProfile and StaffAction models
│   │   ├── serializers.py - Staff authentication serializers
│   │   ├── tests.py - Test suite placeholder
│   │   ├── urls.py - Staff authentication and management endpoints
│   │   └── views.py - Staff login, dashboard, booking/customer management with rate limiting
│   ├── bookings/
│   │   ├── management/commands/
│   │   │   └── wipe_all_bookings.py - Production data wipe command with safety checks
│   │   ├── migrations/
│   │   │   ├── 0001_initial.py - Initial Booking, Address, GuestCheckout models
│   │   │   ├── 0002_booking_include_packing_booking_include_unpacking_and_more.py - Add organizing service fields
│   │   │   ├── 0003_booking_geographic_surcharge_cents_and_more.py - Add surcharge fields
│   │   │   ├── 0004_booking_blade_airport_booking_blade_bag_count_and_more.py - Add BLADE transfer fields
│   │   │   └── 0005_booking_same_day_surcharge_cents.py - Add same-day surcharge field
│   │   ├── __init__.py
│   │   ├── admin.py - Booking and Address admin with organizing service display
│   │   ├── apps.py - App configuration
│   │   ├── models.py - Booking, Address, GuestCheckout models with pricing logic
│   │   ├── serializers.py - Booking serializers with pricing breakdown
│   │   ├── tests.py - Test suite placeholder
│   │   ├── urls.py - Public booking endpoints (catalog, guest booking, status lookup)
│   │   └── views.py - Service catalog, guest booking, pricing preview, calendar availability
│   ├── crm/
│   │   ├── migrations/ __init__.py
│   │   ├── __init__.py
│   │   ├── admin.py - Empty (future CRM features)
│   │   ├── apps.py - App configuration
│   │   ├── models.py - Empty (future)
│   │   ├── tests.py - Empty
│   │   └── views.py - Empty
│   ├── customers/
│   │   ├── management/commands/
│   │   │   └── clean_delete_user.py - Safe user deletion with cascade handling
│   │   ├── migrations/
│   │   │   ├── 0001_initial.py - Initial CustomerProfile, SavedAddress, CustomerPaymentMethod models
│   │   │   ├── 0002_alter_customerprofile_preferred_pickup_time.py - Update pickup time choices
│   │   │   ├── 0003_passwordresettoken.py - Add password reset token model
│   │   │   └── 0004_emailverificationtoken.py - Add email verification model
│   │   ├── __init__.py
│   │   ├── admin.py - Customer and SavedAddress admin interfaces
│   │   ├── apps.py - App configuration
│   │   ├── authentication.py - Hybrid authentication (session + X-Session-Id header)
│   │   ├── booking_serializers.py - Authenticated booking creation serializers
│   │   ├── booking_views.py - Customer booking creation, detail, quick rebook
│   │   ├── emails.py - Welcome email sender
│   │   ├── models.py - CustomerProfile, SavedAddress, CustomerPaymentMethod, PasswordResetToken, EmailVerificationToken
│   │   ├── serializers.py - Customer registration, profile, address serializers
│   │   ├── tests.py - Test suite placeholder
│   │   ├── urls.py - Customer auth, profile, booking management endpoints
│   │   └── views.py - Registration, login, profile, dashboard, preferences, address management
│   ├── documents/
│   │   ├── migrations/ __init__.py
│   │   ├── __init__.py
│   │   ├── admin.py - Empty (future COI document uploads)
│   │   ├── apps.py - App configuration
│   │   ├── models.py - Empty (future)
│   │   ├── tests.py - Empty
│   │   └── views.py - Empty
│   ├── logistics/
│   │   ├── migrations/
│   │   │   └── 0001_initial.py - Initial OnfleetTask model
│   │   ├── __init__.py
│   │   ├── admin.py - Empty
│   │   ├── apps.py - App configuration
│   │   ├── models.py - OnfleetTask model for delivery tracking
│   │   ├── services.py - ToteTaxiOnfleetIntegration service class
│   │   ├── tests.py - Empty
│   │   ├── urls.py - Logistics summary, sync, webhook endpoints
│   │   └── views.py - Logistics dashboard, manual sync, Onfleet webhook handler
│   ├── notifications/
│   │   ├── migrations/ __init__.py
│   │   ├── __init__.py
│   │   ├── admin.py - Empty (future notification system)
│   │   ├── apps.py - App configuration
│   │   ├── models.py - Empty (future)
│   │   ├── tests.py - Empty
│   │   └── views.py - Empty
│   ├── payments/
│   │   ├── migrations/
│   │   │   └── 0001_initial.py - Initial Payment, Refund, PaymentAudit models
│   │   ├── __init__.py
│   │   ├── admin.py - Payment, Refund, PaymentAudit admin interfaces
│   │   ├── apps.py - App configuration
│   │   ├── models.py - Payment, Refund, PaymentAudit models
│   │   ├── serializers.py - Payment intent, confirmation, refund serializers
│   │   ├── services.py - StripePaymentService with create_payment_intent, confirm_payment, process_refund
│   │   ├── tests.py - Test suite placeholder
│   │   ├── urls.py - Payment intent, webhook, refund endpoints
│   │   └── views.py - Payment intent creation, Stripe webhook, refund management
│   └── services/
│       ├── management/commands/ __init__.py
│       ├── migrations/
│       │   ├── 0001_initial.py - Initial MiniMovePackage, StandardDeliveryConfig, SpecialtyItem models
│       │   ├── 0002_organizingservice.py - Add OrganizingService model
│       │   ├── 0003_populate_organizing_services.py - Populate organizing services data
│       │   ├── 0004_surchargerule_applies_to_service_type.py - Add service type filter to surcharges
│       │   ├── 0005_remove_van_schedule.py - Remove deprecated van schedule
│       │   └── 0006_remove_specialtyitem_requires_van_schedule.py - Remove deprecated field
│       ├── __init__.py
│       ├── admin.py - Service catalog admin with organizing service display
│       ├── apps.py - App configuration
│       ├── models.py - MiniMovePackage, OrganizingService, StandardDeliveryConfig, SpecialtyItem, SurchargeRule
│       ├── serializers.py - Service catalog serializers
│       ├── tests.py - Empty
│       └── views.py - Empty (services accessed via bookings/views.py)
├── config/
│   ├── __init__.py - Celery app initialization
│   ├── asgi.py - ASGI configuration
│   ├── celery.py - Celery configuration with autodiscover_tasks
│   ├── settings.py - Django settings (apps, middleware, database, Redis, Stripe, CORS, security)
│   ├── urls.py - Root URL routing (admin, customer, public, payments, staff, logistics)
│   └── wsgi.py - WSGI configuration
├── templates/emails/
│   ├── booking_confirmation.txt - Booking confirmation email template
│   ├── booking_status_update.txt - Status update email template
│   ├── email_verification.txt - Email verification template
│   ├── password_reset.txt - Password reset email template
│   └── welcome.txt - Welcome email template
├── scripts/
│   ├── back_export.py - Auto-generate back_export.txt snapshot
│   └── entrypoint.sh - Docker entrypoint with migrations and superuser creation
├── manage.py - Django management command
├── requirements.txt - Python dependencies (Django, DRF, Stripe, Celery, etc.)
├── Dockerfile - Development Docker image
├── Dockerfile.prod - Production Docker image with gunicorn
├── docker-compose.yml - Development docker-compose (ports 5435, 6382, 8005)
├── docker-compose.prod.yml - Production docker-compose with security
├── gunicorn.conf.py - Gunicorn production server configuration
├── pytest.ini - Pytest configuration
├── pyproject.toml - Project metadata and tool configuration
├── recreate_services.py - Service catalog recreation script
└── fly.toml - Fly.io deployment configuration
```

---

## SECTION 5: FEATURE-TO-FILE DEPENDENCY MAPS

### Guest Booking Flow
├── Entry Point: `POST /api/public/guest-booking/`
├── Execution Flow:
│   1. bookings/views.py (`GuestBookingCreateView.post`) - Validates request, creates guest + addresses
│   2. bookings/serializers.py (`GuestBookingCreateSerializer.create`) - Creates Booking object
│   3. bookings/models.py (`Booking.save`) - Calculates pricing with surcharges
│   4. services/models.py (`SurchargeRule.calculate_surcharge`) - Applies weekend/geographic surcharges
│   5. services/models.py (`OrganizingService`) - Fetches packing/unpacking services if selected
│   6. payments/services.py (`StripePaymentService.create_payment_intent`) - Creates Stripe PaymentIntent
│   7. payments/models.py (`Payment.objects.create`) - Records payment in database
├── Dependencies: User (optional), Address, GuestCheckout, MiniMovePackage, SpecialtyItem, OrganizingService, Payment
├── Side Effects: Creates Booking, GuestCheckout, 2x Address, Payment; sends booking confirmation email
└── Files to Request: bookings/views.py, bookings/serializers.py, bookings/models.py, services/models.py, payments/services.py, payments/models.py

### Authenticated Customer Booking Flow
├── Entry Point: `POST /api/customer/bookings/create/`
├── Execution Flow:
│   1. customers/booking_views.py (`CustomerBookingCreateView.post`) - Validates authenticated user
│   2. customers/booking_serializers.py (`AuthenticatedBookingCreateSerializer.create`) - Creates booking with saved/new addresses
│   3. customers/models.py (`SavedAddress.mark_used`) - Increments times_used if using saved address
│   4. bookings/models.py (`Booking.save`) - Calculates pricing
│   5. customers/models.py (`CustomerProfile.add_booking_stats`) - Updates customer stats after completion
│   6. payments/services.py (`StripePaymentService.create_payment_intent`) - Creates payment
├── Dependencies: User, CustomerProfile, SavedAddress (optional), Address, MiniMovePackage, Payment
├── Side Effects: Creates Booking, Address, Payment; updates SavedAddress usage; sends email
└── Files to Request: customers/booking_views.py, customers/booking_serializers.py, customers/models.py, bookings/models.py, payments/services.py

### Payment Processing Feature
├── Entry Point: `POST /api/payments/confirm/`
├── Execution Flow:
│   1. payments/views.py (`PaymentConfirmView.post`) - Receives payment_intent_id from frontend
│   2. payments/services.py (`StripePaymentService.confirm_payment`) - Retrieves PaymentIntent from Stripe
│   3. payments/models.py (`Payment.objects.filter.update`) - Updates payment status to succeeded
│   4. bookings/models.py (`Booking.objects.filter.update`) - Updates booking status to paid
│   5. payments/models.py (`PaymentAudit.objects.create`) - Creates audit log
│   6. customers/models.py (`CustomerProfile.add_booking_stats`) - Updates customer stats
├── Dependencies: Booking, Payment, CustomerProfile (optional), PaymentAudit
├── Side Effects: Updates Payment status, updates Booking status, creates audit log, updates customer stats
└── Files to Request: payments/views.py, payments/services.py, payments/models.py, bookings/models.py, customers/models.py

### Stripe Webhook Processing
├── Entry Point: `POST /api/payments/webhook/` (Stripe calls this)
├── Execution Flow:
│   1. payments/views.py (`StripeWebhookView.post`) - Validates Stripe signature
│   2. payments/services.py (event handling logic) - Processes payment.succeeded / payment.failed events
│   3. payments/models.py (`Payment.objects.filter.update`) - Updates payment status
│   4. bookings/models.py (`Booking.objects.filter.update`) - Updates booking status
│   5. payments/models.py (`PaymentAudit.objects.create`) - Logs webhook event
├── Dependencies: Payment, Booking, PaymentAudit
├── Side Effects: Updates Payment + Booking statuses asynchronously, creates audit log
└── Files to Request: payments/views.py, payments/services.py, payments/models.py, bookings/models.py

### Staff Dashboard Feature
├── Entry Point: `GET /api/staff/dashboard/`
├── Execution Flow:
│   1. accounts/views.py (`StaffDashboardView.get`) - Checks staff authentication
│   2. accounts/models.py (`StaffProfile`) - Validates staff role
│   3. bookings/models.py (Aggregation queries) - Revenue, booking counts, status breakdown
│   4. customers/models.py (Aggregation queries) - Customer counts, VIP stats
│   5. accounts/models.py (`StaffAction.log_action`) - Logs dashboard view
├── Dependencies: StaffProfile, Booking, CustomerProfile, Payment, StaffAction
├── Side Effects: Creates StaffAction audit log
└── Files to Request: accounts/views.py, accounts/models.py, bookings/models.py, customers/models.py

### Refund Processing Feature
├── Entry Point: `POST /api/payments/refunds/process/`
├── Execution Flow:
│   1. payments/views.py (`RefundProcessView.post`) - Validates staff permissions
│   2. payments/models.py (`Refund.approve`) - Updates refund status
│   3. payments/services.py (`StripePaymentService.process_refund`) - Calls Stripe Refund API
│   4. payments/models.py (`Payment.objects.filter.update`) - Updates payment status to refunded
│   5. payments/models.py (`PaymentAudit.objects.create`) - Creates audit log
│   6. accounts/models.py (`StaffAction.log_action`) - Logs staff action
├── Dependencies: Refund, Payment, Booking, StaffProfile, StaffAction, PaymentAudit
├── Side Effects: Updates Refund, processes Stripe refund, updates Payment, creates audit logs
└── Files to Request: payments/views.py, payments/models.py, payments/services.py, accounts/models.py

### Customer Registration & Email Verification
├── Entry Point: `POST /api/customer/auth/register/`
├── Execution Flow:
│   1. customers/views.py (`CustomerRegistrationView.post`) - Creates User + CustomerProfile
│   2. customers/models.py (`EmailVerificationToken.objects.create`) - Generates verification token
│   3. customers/emails.py (`send_welcome_email`) - Sends welcome + verification email via SES
├── Entry Point 2: `POST /api/customer/auth/verify-email/`
├── Execution Flow:
│   4. customers/views.py (`EmailVerificationView.post`) - Validates token
│   5. customers/models.py (`EmailVerificationToken.objects.filter.update`) - Marks token used
│   6. Django User model (`user.save`) - Sets is_active=True
├── Dependencies: User, CustomerProfile, EmailVerificationToken, SES
├── Side Effects: Creates User + CustomerProfile + EmailVerificationToken, sends email, activates account
└── Files to Request: customers/views.py, customers/models.py, customers/emails.py, customers/serializers.py

### Onfleet Logistics Integration
├── Entry Point: `POST /api/staff/logistics/create-task/`
├── Execution Flow:
│   1. logistics/views.py (`create_task_manually`) - Validates staff auth + booking_id
│   2. logistics/services.py (`ToteTaxiOnfleetIntegration.create_task`) - Calls Onfleet API
│   3. logistics/models.py (`OnfleetTask.objects.create`) - Stores task with onfleet_task_id
│   4. bookings/models.py (no changes) - Booking links to OnfleetTask via reverse FK
├── Webhook Entry: `POST /api/staff/logistics/webhook/`
├── Execution Flow:
│   5. logistics/views.py (`OnfleetWebhookView.post`) - Receives Onfleet status updates
│   6. logistics/models.py (`OnfleetTask.objects.filter.update`) - Updates task status
│   7. logistics/services.py - Syncs status changes
├── Dependencies: OnfleetTask, Booking, Onfleet API
├── Side Effects: Creates OnfleetTask, updates task status on webhook, enables driver tracking
└── Files to Request: logistics/views.py, logistics/services.py, logistics/models.py, bookings/models.py

---

## SECTION 6: BUSINESS LOGIC LOCATION INDEX

### Revenue Calculations
├── Location: bookings/models.py → `Booking.get_pricing_breakdown()`
├── Location: bookings/models.py → `Booking.total_price_cents` (base + surcharges + organizing + tax + COI)
├── Location: services/models.py → `SurchargeRule.calculate_surcharge()`
├── Location: services/models.py → `OrganizingService.price_cents`
└── Used By: Dashboard revenue stats, booking creation, pricing preview API

### Organizing Service Pricing & Tax
├── Location: bookings/models.py → `Booking.get_organizing_services_breakdown()`
├── Location: services/models.py → `OrganizingService` (packing/unpacking pricing)
├── Tax Calculation: bookings/views.py → GuestBookingCreateView (8.875% NYC tax on organizing services)
└── Used By: Booking creation, pricing preview, invoice generation

### Payment Validation & Processing
├── Stripe Integration: payments/services.py → `StripePaymentService.create_payment_intent()`
├── Payment Confirmation: payments/services.py → `StripePaymentService.confirm_payment()`
├── Webhook Handling: payments/views.py → `StripeWebhookView.post()`
├── Refund Processing: payments/services.py → `StripePaymentService.process_refund()`
└── Rules: Payment amount matches booking total, idempotency keys, retry logic

### Authentication & Authorization
├── Customer Auth: customers/authentication.py → `HybridAuthentication` (session + X-Session-Id)
├── Staff Auth: accounts/views.py → Staff-specific permission checks
├── JWT Alternative: djangorestframework-simplejwt (installed but hybrid auth preferred)
├── Password Reset: customers/models.py → `PasswordResetToken` (24-hour expiry)
├── Email Verification: customers/models.py → `EmailVerificationToken` (48-hour expiry)
└── Permission Classes: DRF IsAuthenticated, custom staff checks

### Booking Status Transitions
├── Location: bookings/models.py → `Booking.status` field
├── Valid Transitions: pending → confirmed → paid → completed (or cancelled at any point)
├── Payment Triggers: payments/views.py (`PaymentConfirmView`) updates booking to 'paid'
├── Staff Updates: accounts/views.py (`BookingDetailView.patch`) allows status changes
└── Side Effects: Status changes trigger email notifications

### Customer Statistics & VIP Logic
├── Location: customers/models.py → `CustomerProfile.add_booking_stats()`
├── VIP Designation: Manual via staff (customers/models.py → `CustomerProfile.is_vip`)
├── Stat Tracking: total_bookings, total_spent_cents, last_booking_at
└── Used By: Customer dashboard, staff customer management, VIP filtering

### Service Availability & Calendar
├── Location: bookings/views.py → `CalendarAvailabilityView`
├── Surcharge Detection: services/models.py → `SurchargeRule.applies_to_date()`
├── Weekend Detection: Python datetime weekday() >= 5
├── Capacity Limits: None currently (future feature)
└── Used By: Frontend booking calendar, pricing preview

### Address Validation & Service Area
├── Location: bookings/views.py → `ValidateZipCodeView`
├── Service Areas: NY, CT, NJ (hardcoded in Address.state choices)
├── Geographic Surcharge: Manual flag `Booking.is_outside_core_area` (30+ miles from Manhattan = $175)
└── Used By: Frontend ZIP validation, booking creation

---

## SECTION 7: INTEGRATION & TECH STACK SUMMARY

### Infrastructure
├── **Database:** PostgreSQL 16 (primary data store)
│   └── Config: config/settings.py DATABASES, supports DATABASE_URL env var
├── **Cache:** Redis 7 (Django cache backend + Celery broker)
│   └── Config: config/settings.py CACHES, REDIS_URL env var
├── **Task Queue:** Celery 5.5.3 + django-celery-beat 2.8.1
│   └── Config: config/celery.py, Celery worker + beat scheduler in docker-compose
├── **File Storage:** AWS S3 for production media, local for development
│   └── Config: django-storages + boto3 (settings in config/settings.py)
├── **Search:** PostgreSQL full-text search (no Elasticsearch)
└── **Monitoring:** Sentry SDK 2.13.0 for error tracking

### External Service Integrations

**Stripe API - Payment Processing**
└── Implementation: payments/services.py (`StripePaymentService`)
├── Methods:
│   ├── `create_payment_intent()` - Create PaymentIntent for booking
│   ├── `confirm_payment()` - Retrieve PaymentIntent status from Stripe
│   ├── `process_refund()` - Process refund via Stripe API
│   └── Webhook signature validation in payments/views.py
├── Environment Variables:
│   ├── STRIPE_SECRET_KEY
│   ├── STRIPE_PUBLISHABLE_KEY
│   └── STRIPE_WEBHOOK_SECRET
└── Models: payments/models.py (Payment, Refund, PaymentAudit)

**AWS SES - Email Delivery**
└── Implementation: Django email backend (config/settings.py)
├── Email Templates: templates/emails/ (booking_confirmation.txt, welcome.txt, password_reset.txt, etc.)
├── Sender: customers/emails.py (`send_welcome_email()`), future notification system
├── Environment Variables:
│   ├── AWS_SES_REGION
│   ├── AWS_ACCESS_KEY_ID
│   └── AWS_SECRET_ACCESS_KEY
└── Email Types: Welcome, booking confirmation, status updates, password reset, email verification

**Onfleet API - Delivery Logistics** (Mocked in development)
└── Implementation: logistics/services.py (`ToteTaxiOnfleetIntegration`)
├── Methods:
│   ├── `create_task()` - Create delivery task in Onfleet
│   ├── `get_task_status()` - Fetch task status
│   ├── `get_dashboard_summary()` - Aggregate logistics metrics
│   └── Webhook handler in logistics/views.py
├── Environment Variables:
│   └── ONFLEET_API_KEY (currently mocked)
├── Models: logistics/models.py (OnfleetTask)
└── Webhook: POST /api/staff/logistics/webhook/

**Google Analytics - Event Tracking** (Future)
└── Implementation: Future in notifications/ or services/

### Key Configuration Values
├── JWT_EXPIRY = N/A (using session auth, not JWT)
├── SESSION_COOKIE_AGE = Default Django (2 weeks)
├── STRIPE_WEBHOOK_SECRET = [env variable]
├── PAYMENT_RETRY_LIMIT = 3 (Stripe handles retries)
├── CACHE_TTL = 300 seconds (5 minutes) for Redis
├── RATE_LIMIT = django-ratelimit decorators (5/min login, 20/min dashboard, 10/min modifications)
├── ORGANIZING_TAX_RATE = 8.875% (NYC tax on organizing services, hardcoded in bookings/views.py)
├── SAME_DAY_SURCHARGE = $360 (hardcoded in services/models.py SurchargeRule)
└── GEOGRAPHIC_SURCHARGE = $175 for 30+ miles (hardcoded in SurchargeRule)

### Environment Variables Required
**Required for all environments:**
- SECRET_KEY (Django secret)
- DATABASE_URL or (DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT)
- REDIS_URL
- DEBUG (bool)
- ALLOWED_HOSTS (list)

**Required for production:**
- STRIPE_SECRET_KEY
- STRIPE_PUBLISHABLE_KEY
- STRIPE_WEBHOOK_SECRET
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- AWS_STORAGE_BUCKET_NAME
- AWS_SES_REGION
- CORS_ALLOWED_ORIGINS (list)
- FLY_APP_NAME (if deploying to Fly.io)

**Optional:**
- ONFLEET_API_KEY (currently mocked)
- SENTRY_DSN (error monitoring)
- DJANGO_LOG_LEVEL (INFO/DEBUG/ERROR)

---

## SECTION 8: DEVELOPMENT PATTERNS & CONVENTIONS

### Adding New API Endpoint
1. Define serializer in `app/serializers.py` with validation
2. Create view class in `app/views.py` (APIView or ViewSet)
   - Add permission classes (IsAuthenticated, Staff check, AllowAny)
   - Add rate limiting decorator if needed (`@method_decorator(ratelimit(...))`)
   - Implement business logic or delegate to services
3. Add URL pattern in `app/urls.py`
4. Add to root config/urls.py if new URL namespace
5. Test endpoint with curl/Postman
6. Update this documentation

**Example - Adding customer preference endpoint:**
```python
# customers/serializers.py
class PreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerProfile
        fields = ('preferred_pickup_time', 'email_notifications')

# customers/views.py
class UpdatePreferencesView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def patch(self, request):
        profile = request.user.customer_profile
        serializer = PreferenceSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

# customers/urls.py
path('preferences/', views.UpdatePreferencesView.as_view(), name='update-preferences'),
```

### Modifying Existing Model
1. Update model definition in `app/models.py`
2. Create migration: `python manage.py makemigrations app_name`
3. Review generated migration file for correctness (check defaults, null handling)
4. Apply migration: `python manage.py migrate`
5. Update affected serializers in `app/serializers.py`
6. Update affected views if field logic changes
7. Update admin.py if field should display in admin
8. Run tests: `python manage.py test app_name`
9. Update this documentation (Section 3: Models)

**Example - Adding booking notes field:**
```python
# 1. bookings/models.py
class Booking(models.Model):
    # ... existing fields ...
    internal_notes = models.TextField(blank=True, help_text="Staff-only notes")

# 2. python manage.py makemigrations bookings
# 3. Review migration, ensure default=''
# 4. python manage.py migrate
# 5. bookings/serializers.py - add to fields if needed
# 6. accounts/views.py - add to BookingDetailView if staff should see/edit
# 7. bookings/admin.py - add to list_display or fieldsets
```

### Adding Business Logic
**Decision Tree:**
- Simple CRUD operation → ViewSet methods in views.py
- Complex multi-step operation → Create service class in services.py
- Data calculation/transformation → Model methods or properties
- External API call → Service class in services.py
- Async/background operation → Celery task in tasks.py
- Reusable utility → Helper function in utils.py

**Example - Complex multi-step booking cancellation:**
```python
# bookings/services.py
class BookingCancellationService:
    @staticmethod
    def cancel_booking(booking, cancelled_by_user, reason):
        """Handle all cancellation side effects"""
        with transaction.atomic():
            # Update booking status
            booking.status = 'cancelled'
            booking.save()
            
            # Process refund if payment exists
            payment = booking.payments.first()
            if payment and payment.status == 'succeeded':
                refund = Refund.objects.create(...)
                StripePaymentService.process_refund(refund)
            
            # Cancel Onfleet task if exists
            if hasattr(booking, 'onfleet_task'):
                ToteTaxiOnfleetIntegration.cancel_task(booking.onfleet_task)
            
            # Send notification
            send_cancellation_email(booking)
            
            return booking

# bookings/views.py
class BookingCancelView(APIView):
    def post(self, request, booking_id):
        booking = get_object_or_404(Booking, id=booking_id)
        cancelled_booking = BookingCancellationService.cancel_booking(
            booking, request.user, request.data.get('reason')
        )
        return Response(BookingSerializer(cancelled_booking).data)
```

### Code Organization Rules
**Models (`models.py`):**
- Data structure definition
- Field constraints and validators
- Simple property methods (e.g., `@property def dollars()`)
- Model-level validations (`def clean()`)
- Manager methods for queryset logic
- Keep business logic OUT of models

**Serializers (`serializers.py`):**
- Request/response transformation
- Field-level validation (`def validate_field()`)
- Cross-field validation (`def validate()`)
- Read-only computed fields (`SerializerMethodField`)
- Nested serialization
- Do NOT put business logic here

**Views (`views.py`):**
- Request handling and routing
- Permission enforcement
- Basic request validation
- Response formatting
- Call services for complex logic
- Log staff actions via StaffAction.log_action()

**Services (`services.py`):**
- Multi-model operations
- External API integrations
- Complex business rules
- Transaction management
- Payment/refund orchestration
- Should be stateless and testable

**Admin (`admin.py`):**
- List display configuration
- Filters and search
- Custom admin actions
- Readonly fields
- Inline relationships

### Testing Patterns
Test files mirror source structure:
- `tests/test_views.py` - API endpoint tests
- `tests/test_models.py` - Model validation and method tests  
- `tests/test_serializers.py` - Serialization logic tests
- `tests/test_services.py` - Business logic tests

**Testing framework:**
- Django TestCase for database tests
- APIClient for endpoint testing
- Mock external services (Stripe, Onfleet, SES)
- Factory Boy for test data generation

**Example test structure:**
```python
# tests/test_bookings.py
from django.test import TestCase
from rest_framework.test import APIClient
from apps.bookings.models import Booking

class BookingCreationTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        # Create test data
    
    def test_guest_booking_creation(self):
        response = self.client.post('/api/public/guest-booking/', data={...})
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Booking.objects.count(), 1)
```

### Rate Limiting Pattern
Use django-ratelimit decorators on view methods:
```python
from django_ratelimit.decorators import ratelimit

@method_decorator(ratelimit(key='user', rate='10/m', method='POST', block=True), name='post')
@method_decorator(ratelimit(key='ip', rate='20/m', method='GET', block=True), name='get')
class MyView(APIView):
    def get(self, request): ...
    def post(self, request): ...
```

**Rate limit guidelines:**
- Authentication endpoints: 5/min per IP
- Read operations (GET): 20/min per user
- Write operations (POST/PATCH): 10/min per user
- Staff dashboard: 10/min per staff user
- Payment operations: Use Stripe's built-in rate limiting

### Security Best Practices
1. **Never commit secrets** - use environment variables
2. **CSRF protection** - ensure CSRF tokens for state-changing operations
3. **Rate limiting** - apply to all authentication and sensitive endpoints
4. **Permission checks** - always verify user permissions in views
5. **SQL injection** - use Django ORM, never raw SQL
6. **XSS prevention** - DRF auto-escapes responses
7. **Audit logging** - use StaffAction for all staff operations
8. **Password handling** - use Django's built-in password hashers
9. **Session security** - SameSite cookies, HTTPOnly flags
10. **Input validation** - serializer validation before business logic

---

## AI EXECUTIVE FUNCTION CHECKLIST

This documentation enables Claude to:
- ✅ **Understand Architecture** - Reason about dual customer model, service pricing, authentication strategy
- ✅ **Navigate Files** - 135 files mapped with purposes, know where every model/view/serializer lives
- ✅ **Identify Dependencies** - Understand booking → payment → customer profile chains
- ✅ **Request Context** - Ask for specific files from back_export.txt when implementing features
- ✅ **Extend Features** - Follow established patterns for adding endpoints, models, services
- ✅ **Predict Impact** - Understand cascade effects (e.g., changing Booking status triggers emails, customer stats)
- ✅ **Locate Logic** - Know that pricing lives in Booking model, Stripe in payments/services.py, etc.
- ✅ **Use Integrations** - Understand Stripe/Onfleet/SES integration patterns

**Next Steps for AI:**
1. Review specific features in back_export.txt by requesting: `bookings/models.py`, `payments/services.py`, etc.
2. Understand implementation details by reading complete file contents
3. Make intelligent modifications following established patterns
4. Update this living documentation after significant changes

---

**END OF LIVING DOCUMENTATION**
**Total: ~12,000 tokens | Source: back_export.txt (135 files) | ToteTaxi Backend v2.0**