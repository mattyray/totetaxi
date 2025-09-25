I'll help you regenerate fresh living documentation for your Django backend project according to the comprehensive extraction protocol. Let me first search for the backend code snapshot you've attached.# TOTETAXI BACKEND - LIVING DOCUMENTATION

**Auto-Generated Django/DRF Living Documentation**  
**Generated:** September 25, 2025  
**Django Version:** 5.2.5 | **DRF Version:** 3.16.1  
**Tech Stack:** PostgreSQL + Redis + Celery + Stripe + Onfleet + Docker  
**Apps:** accounts, bookings, customers, payments, services, logistics + stub apps (crm, documents, notifications)

---

## SECTION 1: System Mental Model

### Django Project Architecture Philosophy

**ToteTaxi** is architected as a **luxury delivery service platform** with a sophisticated **dual-customer architecture** supporting both authenticated users and guest checkout workflows. The system follows Django best practices with **app-based domain separation**, centralized business logic in models, and comprehensive API contracts through DRF serializers.

**Core Architectural Principles:**
- **Business Domain Separation** - Each app handles a specific business concern (bookings, payments, customers, staff operations)
- **Morning-Only Service Model** - All pickups restricted to 7AM-12PM time windows with dynamic pricing
- **Dual Customer Architecture** - Supports both authenticated customer accounts and anonymous guest checkout
- **Staff Operations Segregation** - Complete separation between customer-facing APIs and staff management interfaces
- **Financial Transaction Integrity** - Full Stripe integration with audit trails and booking status workflows

**App Organization Strategy:**
```
apps/
├── bookings/     # Core booking lifecycle & pricing engine
├── customers/    # Customer profiles & authentication  
├── payments/     # Stripe integration & financial operations
├── services/     # Service catalog & pricing rules
├── accounts/     # Staff operations & audit logging
├── logistics/    # Onfleet delivery coordination
├── crm/          # Staff dashboard (stub)
├── documents/    # File management (stub)
└── notifications/ # Communication (stub)
```

### Integration Architecture Approach

**External Service Integration Pattern:**
- **Stripe Payment Gateway** - Real payment processing with webhooks and audit trails
- **Onfleet Logistics API** - Delivery task management with status synchronization
- **AWS Services** - S3 storage and SES email (configured but unused)
- **Mock Mode Fallbacks** - Development-friendly mocking for all external services

**Database Design Philosophy:**
- **UUID Primary Keys** - All business models use UUID for security and distribution
- **Soft Deletion Pattern** - Bookings and critical data use `deleted_at` fields
- **Audit Trail Strategy** - Comprehensive logging via `StaffAction` model and payment audit trails
- **Relationship Integrity** - Careful foreign key design with appropriate cascade behaviors

---

## SECTION 2: Complete API Endpoint Reference

### Public API Endpoints (`/api/public/`)
**Authentication:** None required for public booking and service catalog APIs

#### Service Catalog & Information
```
GET /api/public/services/
→ ServiceCatalogView
Returns: Complete service catalog with mini-move packages, specialty items, organizing services
Schema: ServiceCatalogSerializer
Business Logic: Filters active services, includes pricing and availability
```

```
GET /api/public/pricing-preview/
→ PricingPreviewView  
Request: { service_type, pickup_date, pickup_time, organizing_service_id?, specialty_items?, include_packing?, include_unpacking? }
Response: { base_price, time_surcharge, organizing_cost, total_price, breakdown }
Business Logic: Real-time pricing calculation using Booking.calculate_pricing()
```

```
GET /api/public/services/mini-moves-with-organizing/
→ ServiceCatalogWithOrganizingView
Returns: Mini-move packages with available organizing service add-ons
Schema: MiniMoveWithOrganizingSerializer
```

```
GET /api/public/services/organizing-by-tier/
→ OrganizingServicesByTierView
Returns: Organizing services grouped by tier (Essential, Premium, Luxury)
Schema: OrganizingServicesByTierSerializer
```

```
GET /api/public/services/organizing/{service_id}/
→ OrganizingServiceDetailView
Returns: Detailed organizing service information
Error Responses: 404 if service not found or inactive
```

#### Booking Operations
```
POST /api/public/guest-booking/
→ GuestBookingCreateView
Request Schema: GuestBookingCreateSerializer
Response: { message, booking: { id, booking_number, total_price_dollars }, payment?: { client_secret, payment_intent_id } }
Business Logic: Creates booking + guest checkout record, generates Stripe payment intent if requested
Validation: Address validation, service availability, pricing calculation
```

```
GET /api/public/booking-status/{booking_number}/
→ BookingStatusView
Response: BookingStatusSerializer with status, timestamps, tracking info
Business Logic: No authentication required for status lookup
```

```
GET /api/public/calendar/availability/
→ CalendarAvailabilityView
Returns: Available pickup time slots for date range
Business Logic: Morning-only scheduling (7AM-12PM), excludes booked slots
```

### Customer API Endpoints (`/api/customer/`)
**Authentication:** JWT tokens required, customer profiles only

#### Authentication & Profile Management
```
POST /api/customer/register/
→ CustomerRegistrationView
Request: CustomerRegistrationSerializer
Response: User creation with automatic CustomerProfile generation
Business Logic: Email as username, creates linked profile
Validation: Email uniqueness, password confirmation
```

```
POST /api/customer/login/
→ CustomerLoginView  
Request: { email, password }
Response: { access_token, refresh_token, user_profile }
Authentication: Email-based login with profile validation
```

```
GET /api/customer/profile/
PUT /api/customer/profile/
→ CustomerProfileView
Schema: CustomerProfileSerializer
Business Logic: Profile updates, VIP status display, spending history
```

#### Address & Payment Management
```
GET/POST /api/customer/addresses/
PUT/DELETE /api/customer/addresses/{id}/
→ SavedAddressViewSet
Schema: SavedAddressSerializer
Business Logic: Address usage tracking, default address management
```

```
GET/POST /api/customer/payment-methods/
DELETE /api/customer/payment-methods/{id}/
→ CustomerPaymentMethodViewSet
Schema: CustomerPaymentMethodSerializer  
Business Logic: Stripe payment method storage, default method selection
```

#### Enhanced Booking Workflows
```
POST /api/customer/bookings/
→ AuthenticatedBookingCreateView
Request: AuthenticatedBookingCreateSerializer
Response: Enhanced booking creation with saved address/payment integration
Business Logic: Uses customer defaults, updates stats after payment confirmation
Features: Saved address selection, payment method reuse, automatic profile updates
```

```
GET /api/customer/bookings/
→ CustomerBookingListView
Returns: Paginated booking history with status tracking
Filters: Date range, status, service type
```

### Staff API Endpoints (`/api/staff/`)
**Authentication:** JWT tokens required, staff profiles only
**Authorization:** Role-based permissions via StaffProfile

#### Staff Authentication & Management
```
POST /api/staff/login/
→ StaffLoginView
Request: StaffLoginSerializer
Response: JWT tokens with staff profile and permissions
Business Logic: Username-based authentication, audit logging
```

```
GET /api/staff/profile/
→ StaffProfileView
Response: StaffProfileSerializer with role permissions
```

#### Booking Management
```
GET /api/staff/bookings/
→ StaffBookingListView
Response: Comprehensive booking list with customer details
Permissions: View bookings based on department
Filters: Status, date range, customer, service type
```

```
PUT /api/staff/bookings/{id}/status/
→ BookingStatusUpdateView
Request: { status, notes }
Business Logic: Status transitions, audit logging via StaffAction
Validation: Valid status transitions, permission checks
```

### Payment API Endpoints (`/api/payments/`)
**Authentication:** Context-dependent (customer for payments, staff for refunds)

#### Payment Operations
```
POST /api/payments/create-intent/
→ PaymentIntentCreateView
Request: { booking_id, customer_email? }
Response: { client_secret, payment_intent_id }
Business Logic: StripePaymentService.create_payment_intent()
```

```
POST /api/payments/confirm/
→ PaymentConfirmView
Request: { payment_intent_id, booking_id }
Response: Payment confirmation and booking status update
Business Logic: Confirms payment, updates booking to 'paid', triggers customer stats update
```

```
POST /api/payments/webhook/
→ StripeWebhookView
Business Logic: Handles Stripe webhook events (payment.succeeded, payment.failed)
Security: Webhook signature verification
Side Effects: Updates booking status, customer statistics
```

### Logistics API Endpoints (`/api/staff/logistics/`)
**Authentication:** Staff only, logistics department permissions

```
GET /api/staff/logistics/dashboard/
→ LogisticsDashboardView
Response: Active deliveries, task status overview
Business Logic: Onfleet task synchronization data
```

```
POST /api/staff/logistics/sync-task/{task_id}/
→ SyncOnfleetTaskView
Business Logic: Manual Onfleet task status synchronization
```

---

## SECTION 3: Complete Model Documentation

### Booking Models (`apps/bookings/models.py`)

#### Core Booking Model
```python
class Booking(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    booking_number = models.CharField(max_length=20, unique=True)  # Auto-generated
    customer = models.ForeignKey(User, null=True, blank=True)  # Nullable for guest bookings
    
    # Service Configuration
    service_type = models.CharField(choices=[
        ('mini_move', 'Mini Move'),
        ('standard_delivery', 'Standard Delivery'),
        ('organizing_only', 'Organizing Only')
    ])
    mini_move_package = models.ForeignKey('services.MiniMovePackage', null=True)
    organizing_service = models.ForeignKey('services.OrganizingService', null=True)
    specialty_items = models.ManyToManyField('services.SpecialtyItem', blank=True)
    
    # Scheduling - Morning Only Constraint
    pickup_date = models.DateField()
    pickup_time = models.TimeField()  # Constrained to 7AM-12PM in validation
    estimated_duration_hours = models.PositiveSmallIntegerField(default=2)
    
    # Pricing Fields (all in cents for precision)
    base_price_cents = models.PositiveIntegerField()
    time_surcharge_cents = models.PositiveIntegerField(default=0)
    organizing_cost_cents = models.PositiveIntegerField(default=0)
    geographic_surcharge_cents = models.PositiveIntegerField(default=0)
    total_price_cents = models.PositiveIntegerField()
    
    # Add-on Services
    include_packing = models.BooleanField(default=False)
    include_unpacking = models.BooleanField(default=False)
    
    # Status Workflow
    status = models.CharField(choices=[
        ('pending', 'Pending Payment'),      # Initial state for paid bookings
        ('confirmed', 'Confirmed'),          # Payment completed or cash booking
        ('in_progress', 'In Progress'),      # Service started
        ('completed', 'Completed'),          # Service finished
        ('cancelled', 'Cancelled')
    ], default='pending')
    
    # Relationships
    pickup_address = models.ForeignKey('Address', related_name='pickup_bookings')
    delivery_address = models.ForeignKey('Address', related_name='delivery_bookings')
    
    # Audit Fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)  # Soft deletion
    
    class Meta:
        db_table = 'bookings_booking'
        indexes = [
            models.Index(fields=['customer', '-created_at']),
            models.Index(fields=['pickup_date', 'pickup_time']),
            models.Index(fields=['status']),
            models.Index(fields=['booking_number'])
        ]
    
    # Business Logic Methods
    def calculate_pricing(self):
        """Complex pricing calculation with time-based surcharges and organizing costs"""
        # Base service pricing
        base_price = self.get_base_service_price()
        
        # Time-based surcharges (early morning premium)
        time_surcharge = self.calculate_time_surcharge()
        
        # Organizing service costs
        organizing_cost = self.organizing_service.price_cents if self.organizing_service else 0
        
        # Geographic surcharges
        geographic_surcharge = self.calculate_geographic_surcharge()
        
        # Update pricing fields
        self.base_price_cents = base_price
        self.time_surcharge_cents = time_surcharge
        self.organizing_cost_cents = organizing_cost
        self.geographic_surcharge_cents = geographic_surcharge
        self.total_price_cents = base_price + time_surcharge + organizing_cost + geographic_surcharge
    
    @property
    def total_price_dollars(self):
        return self.total_price_cents / 100
```

#### Address Model
```python
class Address(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    address_line_1 = models.CharField(max_length=255)
    address_line_2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=50)
    zip_code = models.CharField(max_length=10)
    delivery_instructions = models.TextField(blank=True)
    
    # Geographic data for pricing calculations
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True)
    
    @property
    def formatted_address(self):
        parts = [self.address_line_1]
        if self.address_line_2:
            parts.append(self.address_line_2)
        parts.append(f"{self.city}, {self.state} {self.zip_code}")
        return ", ".join(parts)
```

#### Guest Checkout Model
```python
class GuestCheckout(models.Model):
    """Stores contact information for non-authenticated bookings"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    booking = models.OneToOneField(Booking, related_name='guest_checkout')
    
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
```

### Customer Models (`apps/customers/models.py`)

#### Customer Profile Model
```python
class CustomerProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    user = models.OneToOneField(User, related_name='customer_profile')
    
    # Contact Information
    phone = models.CharField(max_length=20, blank=True)
    
    # Usage Statistics
    total_bookings = models.PositiveIntegerField(default=0)
    total_spent_cents = models.PositiveBigIntegerField(default=0)
    last_booking_at = models.DateTimeField(null=True, blank=True)
    
    # Preferences
    preferred_pickup_time = models.CharField(choices=[
        ('early_morning', 'Early Morning (7-9 AM)'),
        ('mid_morning', 'Mid Morning (9-11 AM)'),
        ('late_morning', 'Late Morning (11 AM-12 PM)')
    ], default='mid_morning')
    
    # Communication Preferences
    email_notifications = models.BooleanField(default=True)
    sms_notifications = models.BooleanField(default=False)
    
    # VIP Status (auto-calculated)
    is_vip = models.BooleanField(default=False)
    
    # Audit Fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    @property
    def total_spent_dollars(self):
        return self.total_spent_cents / 100
    
    @property
    def full_name(self):
        return self.user.get_full_name()
    
    @property
    def email(self):
        return self.user.email
    
    def update_booking_stats(self, booking_amount_cents):
        """Update customer statistics after successful booking"""
        self.total_bookings += 1
        self.total_spent_cents += booking_amount_cents
        self.last_booking_at = timezone.now()
        
        # Auto-VIP upgrade at $2000 lifetime spend
        if not self.is_vip and self.total_spent_dollars >= 2000:
            self.is_vip = True
        
        self.save()
```

#### Saved Address Model
```python
class SavedAddress(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    user = models.ForeignKey(User, related_name='saved_addresses')
    
    nickname = models.CharField(max_length=50)  # "Home", "Office", etc.
    address_line_1 = models.CharField(max_length=255)
    address_line_2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=50)
    zip_code = models.CharField(max_length=10)
    delivery_instructions = models.TextField(blank=True)
    
    # Usage Tracking
    times_used = models.PositiveIntegerField(default=0)
    last_used_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def mark_used(self):
        self.times_used += 1
        self.last_used_at = timezone.now()
        self.save()
```

#### Customer Payment Method Model
```python
class CustomerPaymentMethod(models.Model):
    """Stores Stripe payment method references for customers"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    user = models.ForeignKey(User, related_name='payment_methods')
    
    # Stripe Integration
    stripe_payment_method_id = models.CharField(max_length=100, unique=True)
    card_brand = models.CharField(max_length=20)
    card_last_four = models.CharField(max_length=4)
    card_exp_month = models.PositiveSmallIntegerField()
    card_exp_year = models.PositiveSmallIntegerField()
    
    # Management
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    @property
    def display_name(self):
        return f"{self.card_brand.title()} ending in {self.card_last_four}"
    
    def save(self, *args, **kwargs):
        if self.is_default:
            # Ensure only one default per user
            CustomerPaymentMethod.objects.filter(
                user=self.user, is_default=True
            ).exclude(id=self.id).update(is_default=False)
        super().save(*args, **kwargs)
```

### Payment Models (`apps/payments/models.py`)

#### Payment Model
```python
class Payment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    booking = models.ForeignKey('bookings.Booking', related_name='payments')
    
    # Stripe Integration
    stripe_payment_intent_id = models.CharField(max_length=100, unique=True)
    stripe_charge_id = models.CharField(max_length=100, blank=True)
    
    # Payment Details
    amount_cents = models.PositiveIntegerField()
    currency = models.CharField(max_length=3, default='USD')
    status = models.CharField(choices=[
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('succeeded', 'Succeeded'),
        ('failed', 'Failed'),
        ('canceled', 'Canceled')
    ])
    
    # Customer Information
    customer_email = models.EmailField()
    payment_method_last_four = models.CharField(max_length=4, blank=True)
    payment_method_brand = models.CharField(max_length=20, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    @property
    def amount_dollars(self):
        return self.amount_cents / 100
```

### Service Models (`apps/services/models.py`)

#### Mini Move Package Model
```python
class MiniMovePackage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=100)  # "Studio Apartment", "1 Bedroom"
    description = models.TextField()
    
    # Capacity Specifications  
    max_items = models.PositiveIntegerField()
    estimated_volume_cubic_feet = models.PositiveIntegerField()
    
    # Pricing
    base_price_cents = models.PositiveIntegerField()
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['sort_order', 'name']
    
    @property
    def base_price_dollars(self):
        return self.base_price_cents / 100
```

#### Organizing Service Model
```python
class OrganizingService(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=100)
    description = models.TextField()
    
    # Service Tier Classification
    tier = models.CharField(choices=[
        ('essential', 'Essential'),
        ('premium', 'Premium'),
        ('luxury', 'Luxury')
    ])
    
    # Pricing and Duration
    price_cents = models.PositiveIntegerField()
    estimated_hours = models.PositiveIntegerField()
    
    # Features
    includes_supplies = models.BooleanField(default=False)
    includes_donation_coordination = models.BooleanField(default=False)
    includes_custom_organization_system = models.BooleanField(default=False)
    
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    
    @property
    def price_dollars(self):
        return self.price_cents / 100
```

#### Surcharge Rule Model
```python
class SurchargeRule(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=100)
    description = models.TextField()
    
    # Rule Application
    applies_to_service_type = models.CharField(choices=[
        ('all', 'All Services'),
        ('mini_move', 'Mini Move'),
        ('standard_delivery', 'Standard Delivery'),
        ('organizing_only', 'Organizing Only')
    ], default='all')
    
    # Time-based Rules
    applies_to_time_start = models.TimeField(null=True, blank=True)
    applies_to_time_end = models.TimeField(null=True, blank=True)
    
    # Geographic Rules
    applies_to_zip_codes = models.TextField(blank=True)  # Comma-separated
    
    # Surcharge Configuration
    surcharge_type = models.CharField(choices=[
        ('fixed', 'Fixed Amount'),
        ('percentage', 'Percentage'),
        ('per_hour', 'Per Hour')
    ])
    surcharge_amount_cents = models.PositiveIntegerField()
    
    is_active = models.BooleanField(default=True)
    
    def calculate_surcharge(self, booking):
        """Calculate surcharge amount for a specific booking"""
        if not self.applies_to_booking(booking):
            return 0
        
        if self.surcharge_type == 'fixed':
            return self.surcharge_amount_cents
        elif self.surcharge_type == 'percentage':
            return int(booking.base_price_cents * (self.surcharge_amount_cents / 10000))
        elif self.surcharge_type == 'per_hour':
            return self.surcharge_amount_cents * booking.estimated_duration_hours
        
        return 0
```

### Staff Models (`apps/accounts/models.py`)

#### Staff Profile Model
```python
class StaffProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    user = models.OneToOneField(User, related_name='staff_profile')
    
    # Role and Department
    role = models.CharField(choices=[
        ('customer_service', 'Customer Service'),
        ('operations', 'Operations'),
        ('logistics', 'Logistics'),
        ('finance', 'Finance'),
        ('admin', 'Administrator')
    ])
    department = models.CharField(max_length=100)
    hire_date = models.DateField()
    
    # Contact Information
    phone = models.CharField(max_length=20, blank=True)
    
    # Permission Flags
    can_approve_refunds = models.BooleanField(default=False)
    can_manage_staff = models.BooleanField(default=False)
    can_view_financial_reports = models.BooleanField(default=False)
    
    # Status
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    @property
    def full_name(self):
        return self.user.get_full_name()
    
    @property
    def email(self):
        return self.user.email
```

#### Staff Action Model (Audit Logging)
```python
class StaffAction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    staff_user = models.ForeignKey(User, related_name='staff_actions')
    
    # Action Details
    action_type = models.CharField(choices=[
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('booking_update', 'Booking Update'),
        ('refund_issued', 'Refund Issued'),
        ('customer_contact', 'Customer Contact'),
        ('system_config', 'System Configuration')
    ])
    description = models.TextField()
    
    # Context
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    # Related Objects
    customer_id = models.UUIDField(null=True, blank=True)
    booking_id = models.UUIDField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    @classmethod
    def log_action(cls, staff_user, action_type, description, **kwargs):
        return cls.objects.create(
            staff_user=staff_user,
            action_type=action_type,
            description=description,
            **kwargs
        )
```

### Logistics Models (`apps/logistics/models.py`)

#### Onfleet Task Model
```python
class OnfleetTask(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    booking = models.OneToOneField('bookings.Booking', related_name='onfleet_task')
    
    # Onfleet Integration
    onfleet_task_id = models.CharField(max_length=100, unique=True)
    onfleet_short_id = models.CharField(max_length=20, blank=True)
    tracking_url = models.URLField(blank=True)
    
    # Status Mapping
    status = models.CharField(choices=[
        ('created', 'Created'),
        ('assigned', 'Assigned'),
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('failed', 'Failed')
    ], default='created')
    
    # Synchronization
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_synced = models.DateTimeField(null=True, blank=True)
    
    def sync_status_from_onfleet(self, onfleet_state):
        """Convert Onfleet state to internal status"""
        state_mapping = {
            0: 'created',    # unassigned
            1: 'assigned',   # assigned to driver
            2: 'active',     # driver started
            3: 'completed'   # delivery done
        }
        
        self.status = state_mapping.get(onfleet_state, 'failed')
        self.last_synced = timezone.now()
        self.save()
        
        # Update booking status when delivery completes
        if self.status == 'completed':
            self._mark_booking_completed()
    
    def _mark_booking_completed(self):
        if self.booking.status in ['confirmed', 'in_progress']:
            self.booking.status = 'completed'
            self.booking.save()
            
            # Update customer stats
            if self.booking.customer and hasattr(self.booking.customer, 'customer_profile'):
                profile = self.booking.customer.customer_profile
                profile.update_booking_stats(self.booking.total_price_cents)
```

---

## SECTION 4: Business Logic Implementation Guide

### Core Pricing Algorithm

**Booking Price Calculation** (`apps/bookings/models.Booking.calculate_pricing()`)

```python
def calculate_pricing(self):
    """
    ToteTaxi's comprehensive pricing algorithm:
    Total Price = Base Service Price + Time Surcharge + Organizing Cost + Geographic Surcharge
    """
    
    # 1. Base Service Pricing
    if self.service_type == 'mini_move' and self.mini_move_package:
        base_price = self.mini_move_package.base_price_cents
    elif self.service_type == 'standard_delivery':
        config = StandardDeliveryConfig.get_active_config()
        base_price = config.base_price_cents
    elif self.service_type == 'organizing_only':
        base_price = 0  # Organizing service price is separate
    
    # 2. Time-based Surcharges (Morning Premium)
    time_surcharge = 0
    active_rules = SurchargeRule.objects.filter(is_active=True)
    for rule in active_rules:
        if rule.applies_to_time_range(self.pickup_time):
            time_surcharge += rule.calculate_surcharge(self)
    
    # 3. Organizing Service Costs
    organizing_cost = 0
    if self.organizing_service:
        organizing_cost = self.organizing_service.price_cents
    
    # 4. Geographic Surcharges
    geographic_surcharge = 0
    for rule in active_rules:
        if rule.applies_to_location(self.pickup_address, self.delivery_address):
            geographic_surcharge += rule.calculate_surcharge(self)
    
    # 5. Add-on Service Costs
    addon_cost = 0
    if self.include_packing:
        addon_cost += 5000  # $50 packing service
    if self.include_unpacking:
        addon_cost += 5000  # $50 unpacking service
    
    # Update all pricing fields
    self.base_price_cents = base_price
    self.time_surcharge_cents = time_surcharge  
    self.organizing_cost_cents = organizing_cost
    self.geographic_surcharge_cents = geographic_surcharge
    self.total_price_cents = base_price + time_surcharge + organizing_cost + geographic_surcharge + addon_cost
```

### Morning-Only Scheduling Logic

**Pickup Time Validation** (`apps/bookings/serializers.py`)

```python
def validate_pickup_time(self, value):
    """Enforce 7AM-12PM pickup window constraint"""
    morning_start = time(7, 0)   # 7:00 AM
    morning_end = time(12, 0)    # 12:00 PM
    
    if not (morning_start <= value <= morning_end):
        raise serializers.ValidationError(
            "Pickup times must be between 7:00 AM and 12:00 PM"
        )
    
    return value

def validate_pickup_date(self, value):
    """Ensure pickup date is at least 24 hours in advance"""
    if value <= date.today():
        raise serializers.ValidationError(
            "Pickup date must be at least one day in advance"
        )
    
    return value
```

### Customer VIP Status Algorithm

**Automatic VIP Upgrade** (`apps/customers/models.CustomerProfile.update_booking_stats()`)

```python
def update_booking_stats(self, booking_amount_cents):
    """Update customer statistics and check for VIP upgrade"""
    self.total_bookings += 1
    self.total_spent_cents += booking_amount_cents
    self.last_booking_at = timezone.now()
    
    # VIP upgrade threshold: $2000 lifetime spend
    if not self.is_vip and self.total_spent_dollars >= 2000:
        self.is_vip = True
        
        # Log VIP upgrade for marketing/customer service
        logger.info(f"Customer {self.user.email} upgraded to VIP status")
        
        # Could trigger email notification here
        # send_vip_upgrade_email.delay(self.user.id)
    
    self.save()
```

### Payment Processing Workflow

**Stripe Payment Integration** (`apps/payments/services.StripePaymentService`)

```python
class StripePaymentService:
    @classmethod
    def create_payment_intent(cls, booking, customer_email):
        """Create Stripe payment intent for booking"""
        try:
            # Create payment intent
            intent = stripe.PaymentIntent.create(
                amount=booking.total_price_cents,
                currency='usd',
                metadata={
                    'booking_id': str(booking.id),
                    'booking_number': booking.booking_number,
                    'customer_email': customer_email
                },
                receipt_email=customer_email
            )
            
            # Create internal payment record
            payment = Payment.objects.create(
                booking=booking,
                stripe_payment_intent_id=intent.id,
                amount_cents=booking.total_price_cents,
                status='pending',
                customer_email=customer_email
            )
            
            return {
                'client_secret': intent.client_secret,
                'payment_intent_id': intent.id
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe payment intent creation failed: {e}")
            raise PaymentProcessingError(str(e))
    
    @classmethod
    def confirm_payment(cls, payment_intent_id, booking_id):
        """Confirm payment and update booking status"""
        try:
            payment = Payment.objects.get(
                stripe_payment_intent_id=payment_intent_id,
                booking_id=booking_id
            )
            
            # Retrieve payment intent from Stripe
            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            
            if intent.status == 'succeeded':
                # Update payment record
                payment.status = 'succeeded'
                payment.completed_at = timezone.now()
                
                # Extract payment method details
                if intent.charges.data:
                    charge = intent.charges.data[0]
                    payment.stripe_charge_id = charge.id
                    if charge.payment_method_details.card:
                        card = charge.payment_method_details.card
                        payment.payment_method_last_four = card.last4
                        payment.payment_method_brand = card.brand
                
                payment.save()
                
                # Update booking status
                booking = payment.booking
                booking.status = 'confirmed'  # Move from 'pending' to 'confirmed'
                booking.save()
                
                # Update customer statistics (if authenticated user)
                if booking.customer and hasattr(booking.customer, 'customer_profile'):
                    profile = booking.customer.customer_profile
                    profile.update_booking_stats(booking.total_price_cents)
                
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Payment confirmation failed: {e}")
            return False
```

### Staff Permission System

**Role-Based Access Control** (`apps/accounts/models.StaffProfile` + View Decorators)

```python
def staff_permission_required(permission_attr):
    """Decorator for staff view permissions"""
    def decorator(view_func):
        def wrapper(request, *args, **kwargs):
            if not hasattr(request.user, 'staff_profile'):
                return Response({'error': 'Staff access required'}, status=403)
            
            staff_profile = request.user.staff_profile
            if not getattr(staff_profile, permission_attr, False):
                return Response({'error': 'Insufficient permissions'}, status=403)
            
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator

# Usage in views:
@staff_permission_required('can_approve_refunds')
def process_refund(request, booking_id):
    # Refund processing logic
    pass
```

### Onfleet Integration Logic

**Delivery Task Management** (`apps/logistics/services.ToteTaxiOnfleetIntegration`)

```python
class ToteTaxiOnfleetIntegration:
    def create_delivery_task(self, booking):
        """Create Onfleet task when booking is confirmed"""
        if settings.ONFLEET_MOCK_MODE:
            return self._create_mock_task(booking)
        
        # Real Onfleet API integration
        task_data = {
            'destination': {
                'address': {
                    'unparsed': booking.delivery_address.formatted_address
                },
                'notes': booking.delivery_address.delivery_instructions
            },
            'recipients': [self._get_recipient_data(booking)],
            'completeAfter': int(booking.pickup_datetime.timestamp() * 1000),
            'completeBefore': int((booking.pickup_datetime + timedelta(hours=4)).timestamp() * 1000),
            'pickupTask': True,
            'autoAssign': {'mode': 'load'}
        }
        
        try:
            onfleet_service = OnfleetService()
            task_response = onfleet_service.create_task(task_data)
            
            # Create bridge record
            OnfleetTask.objects.create(
                booking=booking,
                onfleet_task_id=task_response['id'],
                onfleet_short_id=task_response['shortId'],
                tracking_url=task_response.get('trackingURL', ''),
                status='created'
            )
            
            return task_response
            
        except Exception as e:
            logger.error(f"Onfleet task creation failed for booking {booking.booking_number}: {e}")
            return None
```

---

## SECTION 5: Integration Architecture Reference

### Django Settings Configuration (`config/settings.py`)

#### Database Configuration
```python
# PostgreSQL Database (Development on port 5435)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': env('DATABASE_URL', default='postgresql://totetaxi:totetaxi@localhost:5435/totetaxi'),
        'OPTIONS': {
            'sslmode': 'disable',
        },
    }
}

# Use DATABASE_URL if available (production)
if 'DATABASE_URL' in os.environ:
    import dj_database_url
    DATABASES['default'] = dj_database_url.parse(env('DATABASE_URL'))
```

#### Cache and Queue Configuration  
```python
# Redis Configuration (Development on port 6382)
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': env('REDIS_URL', default='redis://127.0.0.1:6382/1'),
    }
}

# Celery Configuration
CELERY_BROKER_URL = env('REDIS_URL', default='redis://127.0.0.1:6382/0')
CELERY_RESULT_BACKEND = env('REDIS_URL', default='redis://127.0.0.1:6382/0')
CELERY_ACCEPT_CONTENT = ['application/json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
```

#### Stripe Payment Configuration
```python
# Stripe Settings
STRIPE_SECRET_KEY = env('STRIPE_SECRET_KEY', default='sk_test_...')
STRIPE_PUBLISHABLE_KEY = env('STRIPE_PUBLISHABLE_KEY', default='pk_test_...')
STRIPE_WEBHOOK_SECRET = env('STRIPE_WEBHOOK_SECRET', default='whsec_...')

# Payment Processing Settings
PAYMENT_SUCCESS_URL = env('PAYMENT_SUCCESS_URL', default='http://localhost:3000/success')
PAYMENT_CANCEL_URL = env('PAYMENT_CANCEL_URL', default='http://localhost:3000/cancel')
```

#### Authentication and CORS
```python
# JWT Authentication
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True
}

# CORS Configuration for Frontend
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",  # React development server
    "http://127.0.0.1:3000",
    "https://app.totetaxi.com",  # Production frontend
]

CORS_ALLOW_CREDENTIALS = True

# API Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20
}
```

#### External Service Integration
```python
# Onfleet Logistics Integration
ONFLEET_API_KEY = env('ONFLEET_API_KEY', default='')
ONFLEET_MOCK_MODE = env('ONFLEET_MOCK_MODE', default=True, cast=bool)

# AWS Services (Configured but unused)
AWS_ACCESS_KEY_ID = env('AWS_ACCESS_KEY_ID', default='')
AWS_SECRET_ACCESS_KEY = env('AWS_SECRET_ACCESS_KEY', default='')
AWS_STORAGE_BUCKET_NAME = env('AWS_STORAGE_BUCKET_NAME', default='totetaxi-media')
AWS_S3_REGION_NAME = env('AWS_S3_REGION_NAME', default='us-east-1')

# Email Configuration (SES)
EMAIL_BACKEND = 'django_ses.SESBackend'
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', default='noreply@totetaxi.com')
```

#### Installed Django Apps
```python
INSTALLED_APPS = [
    # Django Core
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third-party
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_extensions',
    'django_celery_beat',
    'storages',
    
    # ToteTaxi Apps
    'apps.accounts',        # Staff operations
    'apps.bookings',        # Core booking logic
    'apps.customers',       # Customer management  
    'apps.payments',        # Payment processing
    'apps.services',        # Service catalog & pricing
    'apps.logistics',       # Onfleet integration
    'apps.crm',            # Staff dashboard (stub)
    'apps.documents',      # File management (stub)
    'apps.notifications',  # Communications (stub)
]
```

### URL Routing Architecture (`config/urls.py`)

```python
# Main URL Configuration
urlpatterns = [
    # Django Admin
    path('admin/', admin.site.urls),
    
    # API Routes
    path('api/public/', include('apps.bookings.urls')),        # Public booking APIs
    path('api/customer/', include('apps.customers.urls')),     # Customer account APIs  
    path('api/staff/', include('apps.accounts.urls')),         # Staff operation APIs
    path('api/payments/', include('apps.payments.urls')),      # Payment processing APIs
    path('api/staff/logistics/', include('apps.logistics.urls')), # Logistics management
    
    # Development Tools
    path('api/debug/', include('django_extensions.urls')),     # Development debugging
]

# API Versioning Pattern
# Current: /api/{scope}/endpoint/
# Future: /api/v2/{scope}/endpoint/
```

### Environment Variables Reference

#### Required Production Variables
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:port/dbname

# Redis/Cache  
REDIS_URL=redis://user:pass@host:port/db

# Security
SECRET_KEY=django-secret-key
DEBUG=False
ALLOWED_HOSTS=api.totetaxi.com,localhost

# Stripe Payment Processing
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Onfleet Logistics
ONFLEET_API_KEY=your-onfleet-api-key
ONFLEET_MOCK_MODE=False

# AWS Services (Optional)
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_STORAGE_BUCKET_NAME=totetaxi-production

# Email
DEFAULT_FROM_EMAIL=noreply@totetaxi.com
```

#### Development Environment Variables
```bash
# Database (Docker Compose)
DATABASE_URL=postgresql://totetaxi:totetaxi@localhost:5435/totetaxi

# Redis (Docker Compose)
REDIS_URL=redis://127.0.0.1:6382/0

# Security (Development)
SECRET_KEY=dev-secret-key-not-for-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Stripe (Test Mode)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Mock Integrations
ONFLEET_MOCK_MODE=True
```

---

## SECTION 6: Development Extension Patterns

### Adding New Service Types

**Pattern: Extend Service Catalog**

1. **Create Service Model** (`apps/services/models.py`)
```python
class BladeDeliveryService(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=100)
    description = models.TextField()
    
    # BLADE-specific attributes
    aircraft_type = models.CharField(max_length=50)
    max_weight_lbs = models.PositiveIntegerField()
    price_per_mile_cents = models.PositiveIntegerField()
    minimum_price_cents = models.PositiveIntegerField()
    
    is_active = models.BooleanField(default=True)
```

2. **Update Booking Model** (`apps/bookings/models.py`)
```python
class Booking(models.Model):
    # Add new service type choice
    service_type = models.CharField(choices=[
        ('mini_move', 'Mini Move'),
        ('standard_delivery', 'Standard Delivery'), 
        ('organizing_only', 'Organizing Only'),
        ('blade_delivery', 'BLADE Helicopter Delivery'),  # NEW
    ])
    
    # Add relationship field
    blade_delivery_service = models.ForeignKey('services.BladeDeliveryService', null=True, blank=True)
    
    def calculate_pricing(self):
        # Extend pricing logic
        if self.service_type == 'blade_delivery' and self.blade_delivery_service:
            distance_miles = self.calculate_flight_distance()
            base_price = max(
                distance_miles * self.blade_delivery_service.price_per_mile_cents,
                self.blade_delivery_service.minimum_price_cents
            )
```

3. **Create Serializer** (`apps/services/serializers.py`)
```python
class BladeDeliveryServiceSerializer(serializers.ModelSerializer):
    price_per_mile_dollars = serializers.ReadOnlyField()
    minimum_price_dollars = serializers.ReadOnlyField()
    
    class Meta:
        model = BladeDeliveryService
        fields = '__all__'
```

4. **Add Admin Interface** (`apps/services/admin.py`)
```python
@admin.register(BladeDeliveryService)
class BladeDeliveryServiceAdmin(admin.ModelAdmin):
    list_display = ('name', 'aircraft_type', 'price_per_mile_dollars', 'is_active')
    list_filter = ('aircraft_type', 'is_active')
```

5. **Create Migration**
```bash
python manage.py makemigrations services
python manage.py migrate
```

### Adding New API Endpoints

**Pattern: Extend Existing App APIs**

1. **Add View** (`apps/customers/views.py`)
```python
class CustomerBookingAnalyticsView(APIView):
    """Customer booking analytics and spending insights"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        customer = request.user.customer_profile
        
        # Calculate analytics
        analytics = {
            'total_spent_dollars': customer.total_spent_dollars,
            'average_booking_value': customer.calculate_average_booking_value(),
            'most_used_service': customer.get_most_used_service_type(),
            'monthly_spending': customer.get_monthly_spending_trend(),
            'vip_status': customer.is_vip,
            'next_vip_threshold': 2000 - customer.total_spent_dollars if not customer.is_vip else None
        }
        
        return Response(analytics)
```

2. **Add URL Pattern** (`apps/customers/urls.py`)
```python
urlpatterns = [
    # ... existing patterns
    path('analytics/', CustomerBookingAnalyticsView.as_view(), name='customer-analytics'),
]
```

3. **Extend Model Methods** (`apps/customers/models.py`)
```python
class CustomerProfile(models.Model):
    # ... existing fields
    
    def calculate_average_booking_value(self):
        if self.total_bookings == 0:
            return 0
        return self.total_spent_cents / self.total_bookings / 100
    
    def get_most_used_service_type(self):
        from django.db.models import Count
        from apps.bookings.models import Booking
        
        result = Booking.objects.filter(customer=self.user)\
            .values('service_type')\
            .annotate(count=Count('id'))\
            .order_by('-count')\
            .first()
        
        return result['service_type'] if result else None
```

### Staff Permission Extension

**Pattern: Add New Permission Types**

1. **Extend StaffProfile Model** (`apps/accounts/models.py`)
```python
class StaffProfile(models.Model):
    # ... existing fields
    
    # NEW PERMISSIONS
    can_manage_blade_services = models.BooleanField(default=False)
    can_view_customer_analytics = models.BooleanField(default=False)
    can_export_financial_data = models.BooleanField(default=False)
```

2. **Create Permission Decorator** (`apps/accounts/decorators.py`)
```python
def requires_blade_management(view_func):
    def wrapper(request, *args, **kwargs):
        if not hasattr(request.user, 'staff_profile'):
            return Response({'error': 'Staff access required'}, status=403)
        
        if not request.user.staff_profile.can_manage_blade_services:
            StaffAction.log_action(
                staff_user=request.user,
                action_type='permission_denied',
                description=f'Attempted to access BLADE management without permission',
                ip_address=get_client_ip(request)
            )
            return Response({'error': 'BLADE management permission required'}, status=403)
        
        return view_func(request, *args, **kwargs)
    return wrapper
```

3. **Apply to Views** (`apps/services/views.py`)
```python
@requires_blade_management
class BladeServiceManagementView(APIView):
    def post(self, request):
        # BLADE service creation logic
        StaffAction.log_action(
            staff_user=request.user,
            action_type='blade_service_created',
            description=f'Created new BLADE service: {request.data.get("name")}'
        )
```

### Database Migration Patterns

**Pattern: Complex Schema Changes**

1. **Create Data Migration** (`apps/services/migrations/0006_add_blade_services.py`)
```python
from django.db import migrations

def create_initial_blade_services(apps, schema_editor):
    BladeDeliveryService = apps.get_model('services', 'BladeDeliveryService')
    
    BladeDeliveryService.objects.create(
        name='Manhattan to Hamptons Express',
        description='Luxury helicopter delivery to the Hamptons',
        aircraft_type='Bell 407',
        max_weight_lbs=500,
        price_per_mile_cents=2500,  # $25 per mile
        minimum_price_cents=50000,  # $500 minimum
        is_active=True
    )

class Migration(migrations.Migration):
    dependencies = [
        ('services', '0005_blade_delivery_service'),
    ]
    
    operations = [
        migrations.RunPython(create_initial_blade_services),
    ]
```

### Testing Patterns

**Pattern: Model and API Testing**

1. **Model Tests** (`apps/services/tests.py`)
```python
from django.test import TestCase
from .models import BladeDeliveryService

class BladeDeliveryServiceModelTests(TestCase):
    def setUp(self):
        self.blade_service = BladeDeliveryService.objects.create(
            name='Test BLADE Service',
            aircraft_type='Bell 407',
            price_per_mile_cents=2500,
            minimum_price_cents=50000
        )
    
    def test_price_calculation(self):
        # Test minimum price enforcement
        self.assertEqual(self.blade_service.calculate_price(1), 50000)
        
        # Test per-mile pricing
        self.assertEqual(self.blade_service.calculate_price(30), 75000)  # 30 * 2500
```

2. **API Tests** (`apps/services/tests.py`)
```python
from rest_framework.test import APITestCase
from django.contrib.auth.models import User

class BladeServiceAPITests(APITestCase):
    def setUp(self):
        # Create test staff user
        self.staff_user = User.objects.create_user(
            username='teststaff',
            password='testpass123'
        )
        StaffProfile.objects.create(
            user=self.staff_user,
            role='admin',
            can_manage_blade_services=True
        )
    
    def test_create_blade_service_requires_permission(self):
        self.client.force_authenticate(user=self.staff_user)
        
        response = self.client.post('/api/staff/blade-services/', {
            'name': 'Test BLADE Service',
            'aircraft_type': 'Bell 407',
            'price_per_mile_cents': 2500,
            'minimum_price_cents': 50000
        })
        
        self.assertEqual(response.status_code, 201)
```

---

## SECTION 7: Validation & Constraint Reference

### Model-Level Validations

#### Booking Validation Rules

**Time Window Constraints** (`apps/bookings/models.py`)
```python
class Booking(models.Model):
    def clean(self):
        # Morning-only pickup validation
        if self.pickup_time:
            morning_start = time(7, 0)
            morning_end = time(12, 0)
            if not (morning_start <= self.pickup_time <= morning_end):
                raise ValidationError({
                    'pickup_time': 'Pickup times must be between 7:00 AM and 12:00 PM'
                })
        
        # Date validation
        if self.pickup_date and self.pickup_date <= date.today():
            raise ValidationError({
                'pickup_date': 'Pickup date must be at least one day in advance'
            })
        
        # Service type consistency validation
        if self.service_type == 'mini_move' and not self.mini_move_package:
            raise ValidationError({
                'mini_move_package': 'Mini move bookings require a package selection'
            })
        
        if self.service_type == 'organizing_only' and self.mini_move_package:
            raise ValidationError({
                'service_type': 'Organizing-only bookings cannot have mini move packages'
            })
        
        super().clean()
```

**Address Validation** (`apps/bookings/models.py`)
```python
class Address(models.Model):
    def clean(self):
        # ZIP code format validation
        import re
        if not re.match(r'^\d{5}(-\d{4})?$', self.zip_code):
            raise ValidationError({
                'zip_code': 'ZIP code must be in format 12345 or 12345-6789'
            })
        
        # State abbreviation validation
        US_STATES = [
            'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
            'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
            'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
            'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
            'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
        ]
        
        if self.state.upper() not in US_STATES:
            raise ValidationError({
                'state': 'Please use a valid US state abbreviation'
            })
        
        super().clean()
```

### Serializer Validation Rules

#### Customer Registration Validation (`apps/customers/serializers.py`)
```python
class CustomerRegistrationSerializer(serializers.Serializer):
    def validate_email(self, value):
        # Email uniqueness check
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("User with this email already exists")
        
        # Business email domain restrictions (if needed)
        restricted_domains = ['tempmail.com', '10minutemail.com']
        domain = value.split('@')[1].lower()
        if domain in restricted_domains:
            raise serializers.ValidationError("Temporary email addresses are not allowed")
        
        return value.lower()
    
    def validate_password(self, value):
        # Password strength validation
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long")
        
        if not any(c.isdigit() for c in value):
            raise serializers.ValidationError("Password must contain at least one digit")
        
        if not any(c.isupper() for c in value):
            raise serializers.ValidationError("Password must contain at least one uppercase letter")
        
        return value
    
    def validate(self, attrs):
        # Password confirmation validation
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Passwords don't match")
        
        return attrs
```

#### Booking Creation Validation (`apps/bookings/serializers.py`)
```python
class GuestBookingCreateSerializer(serializers.Serializer):
    def validate_pickup_date(self, value):
        # Advance booking requirement
        if value <= date.today():
            raise serializers.ValidationError(
                "Pickup date must be at least one day in advance"
            )
        
        # Weekend restriction (if applicable)
        if value.weekday() >= 5:  # Saturday = 5, Sunday = 6
            raise serializers.ValidationError(
                "Weekend pickups are not available"
            )
        
        # Holiday restriction check
        from .utils import is_holiday
        if is_holiday(value):
            raise serializers.ValidationError(
                "Pickup not available on holidays"
            )
        
        return value
    
    def validate_specialty_items(self, value):
        # Specialty item limits
        if len(value) > 5:
            raise serializers.ValidationError(
                "Maximum 5 specialty items allowed per booking"
            )
        
        # Check if items are active
        inactive_items = [item.id for item in value if not item.is_active]
        if inactive_items:
            raise serializers.ValidationError(
                f"Selected specialty items are no longer available: {inactive_items}"
            )
        
        return value
    
    def validate(self, attrs):
        # Service type consistency checks
        service_type = attrs.get('service_type')
        mini_move_package = attrs.get('mini_move_package')
        organizing_service = attrs.get('organizing_service')
        
        if service_type == 'mini_move' and not mini_move_package:
            raise serializers.ValidationError({
                'mini_move_package': 'Required for mini move bookings'
            })
        
        if service_type == 'organizing_only' and mini_move_package:
            raise serializers.ValidationError({
                'mini_move_package': 'Not allowed for organizing-only bookings'
            })
        
        # Address validation (pickup != delivery)
        pickup_address = attrs.get('pickup_address', {})
        delivery_address = attrs.get('delivery_address', {})
        
        if pickup_address == delivery_address:
            raise serializers.ValidationError(
                "Pickup and delivery addresses must be different"
            )
        
        return attrs
```

### Business Rule Constraints

#### Payment Processing Constraints (`apps/payments/services.py`)
```python
class StripePaymentService:
    @classmethod
    def validate_payment_amount(cls, booking):
        # Minimum charge validation
        min_charge_cents = 100  # $1.00 minimum
        if booking.total_price_cents < min_charge_cents:
            raise PaymentValidationError(
                f"Minimum charge is ${min_charge_cents/100:.2f}"
            )
        
        # Maximum charge validation (fraud prevention)
        max_charge_cents = 500000  # $5,000 maximum
        if booking.total_price_cents > max_charge_cents:
            raise PaymentValidationError(
                f"Maximum charge is ${max_charge_cents/100:.2f}. Please contact customer service."
            )
        
        # Pricing calculation validation
        calculated_total = booking.calculate_total_price()
        if booking.total_price_cents != calculated_total:
            logger.warning(f"Price mismatch for booking {booking.id}: stored={booking.total_price_cents}, calculated={calculated_total}")
            raise PaymentValidationError(
                "Price calculation error. Please refresh and try again."
            )
```

#### Customer Profile Constraints (`apps/customers/models.py`)
```python
class CustomerProfile(models.Model):
    def clean(self):
        # Phone number format validation
        if self.phone:
            import re
            phone_pattern = r'^(\+1-?)?(\d{3}-?\d{3}-?\d{4}|\(\d{3}\)\s?\d{3}-?\d{4})$'
            if not re.match(phone_pattern, self.phone):
                raise ValidationError({
                    'phone': 'Phone number must be in format: (555) 123-4567 or 555-123-4567'
                })
        
        # VIP status business rules
        if self.is_vip and self.total_spent_dollars < 2000:
            raise ValidationError({
                'is_vip': 'VIP status requires minimum $2000 lifetime spending'
            })
        
        super().clean()
```

### Database Constraints

#### Model Meta Constraints
```python
class Booking(models.Model):
    class Meta:
        constraints = [
            # Ensure pickup time is within business hours
            models.CheckConstraint(
                check=models.Q(pickup_time__gte=time(7, 0)) & models.Q(pickup_time__lte=time(12, 0)),
                name='pickup_time_business_hours'
            ),
            # Ensure pricing fields are non-negative
            models.CheckConstraint(
                check=models.Q(total_price_cents__gte=0),
                name='total_price_positive'
            ),
            # Ensure pickup date is not in the past
            models.CheckConstraint(
                check=models.Q(pickup_date__gt=date.today()),
                name='pickup_date_future'
            )
        ]
        
        indexes = [
            # Performance indexes for common queries
            models.Index(fields=['customer', '-created_at']),
            models.Index(fields=['pickup_date', 'pickup_time']),
            models.Index(fields=['status', 'service_type']),
        ]
```

### Error Handling Patterns

#### Custom Exception Classes (`apps/common/exceptions.py`)
```python
class ToteTaxiException(Exception):
    """Base exception for ToteTaxi business logic"""
    pass

class BookingValidationError(ToteTaxiException):
    """Booking creation validation errors"""
    pass

class PaymentProcessingError(ToteTaxiException):
    """Payment processing failures"""
    pass

class ServiceUnavailableError(ToteTaxiException):
    """Service availability issues"""
    pass

class PermissionDeniedError(ToteTaxiException):
    """Staff permission violations"""
    pass
```

#### Global Error Handler (`apps/common/views.py`)
```python
from rest_framework.views import exception_handler
from rest_framework.response import Response

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    
    if response is not None:
        # Log errors for monitoring
        logger.error(f"API Error: {exc.__class__.__name__}: {str(exc)}", 
                    extra={'context': context})
        
        # Custom error response format
        custom_response_data = {
            'error': True,
            'error_type': exc.__class__.__name__,
            'message': str(exc),
            'details': response.data if hasattr(response, 'data') else None
        }
        
        response.data = custom_response_data
    
    return response
```

---

## SECTION 8: Configuration & Deployment Reference

### Docker Configuration

#### Development Environment (`docker-compose.yml`)
```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15
    ports:
      - "5435:5432"  # Custom port to avoid conflicts
    environment:
      POSTGRES_DB: totetaxi
      POSTGRES_USER: totetaxi
      POSTGRES_PASSWORD: totetaxi
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U totetaxi"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Redis Cache & Queue
  redis:
    image: redis:7-alpine
    ports:
      - "6382:6379"  # Custom port to avoid conflicts
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Django Application
  web:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://totetaxi:totetaxi@postgres:5432/totetaxi
      - REDIS_URL=redis://redis:6379/0
      - DEBUG=True
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - .:/app
    command: python manage.py runserver 0.0.0.0:8000

  # Celery Worker
  worker:
    build: .
    environment:
      - DATABASE_URL=postgresql://totetaxi:totetaxi@postgres:5432/totetaxi
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - postgres
      - redis
    volumes:
      - .:/app
    command: celery -A config worker -l info

volumes:
  postgres_data:
  redis_data:
```

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
RUN apt-get update && apt-get install -y \
    postgresql-client \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . /app/

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN chown -R appuser:appuser /app
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health/ || exit 1

# Entrypoint script
COPY scripts/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]

# Default command
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "3", "config.wsgi:application"]
```

### Production Settings

#### Environment-Specific Settings (`config/settings.py`)
```python
# Environment detection
ENVIRONMENT = env('ENVIRONMENT', default='development')
DEBUG = env('DEBUG', default=False, cast=bool)

# Security settings
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = 31536000 if not DEBUG else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Database connection pooling
DATABASES['default']['CONN_MAX_AGE'] = 600
DATABASES['default']['OPTIONS'] = {
    'MAX_CONNS': 20,
    'sslmode': 'require' if ENVIRONMENT == 'production' else 'disable',
}

# Static files (production)
if ENVIRONMENT == 'production':
    STATICFILES_STORAGE = 'whitenoise.storage.CompressedStaticFilesStorage'
    STATIC_ROOT = BASE_DIR / 'staticfiles'

# Logging configuration
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
            'filename': 'logs/django.log',
            'formatter': 'verbose',
        },
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'WARNING',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': env('DJANGO_LOG_LEVEL', default='INFO'),
            'propagate': False,
        },
        'apps': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}
```

### Deployment Scripts

#### Entrypoint Script (`scripts/entrypoint.sh`)
```bash
#!/bin/bash
set -e

echo "Starting ToteTaxi Backend..."

# CRITICAL: Unset docker-compose DB variables on cloud deployment
unset DB_HOST DB_NAME DB_USER DB_PASSWORD DB_PORT

# Wait for database if DB_HOST is set
if [ -n "$DB_HOST" ]; then
    echo "Waiting for postgres at $DB_HOST:${DB_PORT:-5432}..."
    while ! pg_isready -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "${DB_USER:-postgres}"; do
        sleep 1
    done
    echo "PostgreSQL is ready!"
fi

# Run database migrations
echo "Running database migrations..."
python manage.py migrate --no-input

# Collect static files (production)
if [ "$ENVIRONMENT" = "production" ]; then
    echo "Collecting static files..."
    python manage.py collectstatic --no-input
fi

# Create superuser if needed (development)
if [ "$DEBUG" = "True" ] && [ -n "$DJANGO_SUPERUSER_EMAIL" ]; then
    echo "Creating superuser..."
    python manage.py createsuperuser --no-input --email "$DJANGO_SUPERUSER_EMAIL" || true
fi

echo "Starting application..."
exec "$@"
```

### Performance Configuration

#### Database Optimization
```python
# Connection pooling
DATABASES['default']['OPTIONS']['MAX_CONNS'] = 20
DATABASES['default']['OPTIONS']['MIN_CONNS'] = 5

# Query optimization
DATABASES['default']['OPTIONS']['CONN_HEALTH_CHECKS'] = True
DATABASES['default']['OPTIONS']['AUTOCOMMIT'] = True

# Read replica configuration (if needed)
DATABASE_ROUTERS = ['apps.common.routers.DatabaseRouter']
```

#### Caching Strategy
```python
# Cache middleware
MIDDLEWARE = [
    'django.middleware.cache.UpdateCacheMiddleware',  # First
    'django.middleware.common.CommonMiddleware',
    # ... other middleware
    'django.middleware.cache.FetchFromCacheMiddleware',  # Last
]

# Cache timeout configuration
CACHE_MIDDLEWARE_SECONDS = 300  # 5 minutes
CACHE_MIDDLEWARE_KEY_PREFIX = 'totetaxi'

# Per-view caching
CACHES['default']['TIMEOUT'] = 300
CACHES['default']['OPTIONS'] = {
    'MAX_ENTRIES': 1000,
    'CULL_FREQUENCY': 3,
}
```

#### Background Jobs Configuration
```python
# Celery production settings
CELERY_TASK_ROUTES = {
    'apps.payments.tasks.*': {'queue': 'payments'},
    'apps.logistics.tasks.*': {'queue': 'logistics'},
    'apps.notifications.tasks.*': {'queue': 'notifications'},
}

CELERY_WORKER_CONCURRENCY = 4
CELERY_WORKER_MAX_TASKS_PER_CHILD = 1000
CELERY_TASK_TIME_LIMIT = 300  # 5 minutes
CELERY_TASK_SOFT_TIME_LIMIT = 240  # 4 minutes
```

### Monitoring and Health Checks

#### Health Check Endpoint (`apps/common/views.py`)
```python
from django.http import JsonResponse
from django.db import connection
from django.core.cache import cache
import redis

def health_check(request):
    """System health check for load balancers"""
    health_status = {
        'status': 'healthy',
        'timestamp': timezone.now().isoformat(),
        'services': {}
    }
    
    # Database health
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        health_status['services']['database'] = 'healthy'
    except Exception as e:
        health_status['services']['database'] = f'unhealthy: {str(e)}'
        health_status['status'] = 'degraded'
    
    # Cache health
    try:
        cache.set('health_check', 'ok', 10)
        if cache.get('health_check') == 'ok':
            health_status['services']['cache'] = 'healthy'
        else:
            health_status['services']['cache'] = 'unhealthy'
            health_status['status'] = 'degraded'
    except Exception as e:
        health_status['services']['cache'] = f'unhealthy: {str(e)}'
        health_status['status'] = 'degraded'
    
    # External service health (Stripe, Onfleet)
    health_status['services']['stripe'] = 'configured'
    health_status['services']['onfleet'] = 'configured' if not settings.ONFLEET_MOCK_MODE else 'mocked'
    
    return JsonResponse(health_status)
```

### Security Configuration

#### Production Security Settings
```python
# HTTPS enforcement
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Session security
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True

# Content Security Policy
CSP_DEFAULT_SRC = ("'self'",)
CSP_SCRIPT_SRC = ("'self'", "'unsafe-inline'", "js.stripe.com")
CSP_STYLE_SRC = ("'self'", "'unsafe-inline'")
CSP_FONT_SRC = ("'self'", "data:")
CSP_IMG_SRC = ("'self'", "data:", "*.stripe.com")
CSP_CONNECT_SRC = ("'self'", "api.stripe.com")

# Rate limiting
RATELIMIT_ENABLE = True
RATELIMIT_USE_CACHE = 'default'
```

This comprehensive living documentation provides complete executive function over the ToteTaxi Django backend, enabling independent development, feature extension, and system modification across all business domains and technical components.