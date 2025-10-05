Perfect! I'll now generate the living documentation based on our discussion. Let me create a comprehensive backend README that follows the tiered approach we discussed.Now I'll generate the comprehensive living documentation for your ToteTaxi backend:

```markdown
# TOTETAXI BACKEND - LIVING DOCUMENTATION v2.0
**AI Navigation System for Django/DRF Backend**

**Generated:** 2025-10-04  
**Source:** back_export.txt (10,000 lines, 133 files)  
**Purpose:** Strategic navigation map enabling intelligent file requesting and architectural understanding

---

## SECTION 1: SYSTEM ARCHITECTURE MENTAL MODEL

### Project Philosophy
ToteTaxi is a **luxury delivery service platform** with dual user interfaces:
- **Customer Portal** - Booking wizard for authenticated/guest users (mini moves, deliveries, BLADE transfers)
- **Staff Dashboard** - Internal operations, booking management, customer CRM

### Architecture Strategy
**Hybrid Authentication System** - Strict profile segregation preventing account type conflicts:
- Customer accounts → `CustomerProfile` (one-to-one with User)
- Staff accounts → `StaffProfile` (one-to-one with User)
- Validation layer prevents hybrid accounts at model and serializer levels

**Service-Oriented Design**:
- **Service Catalog** (`apps.services`) - Centralized pricing engine for all service types
- **Booking Core** (`apps.bookings`) - Polymorphic booking model supporting 4 service types
- **Payment Integration** (`apps.payments`) - Stripe PaymentIntent flow with audit logging
- **Logistics Sync** (`apps.logistics`) - Onfleet task automation via webhooks

### Layer Separation Philosophy

**Models** - Data architecture + simple business methods:
- Field definitions with validators
- Relationships with cascade behaviors
- Property methods for dollar conversions
- Business logic methods (e.g., `calculate_pricing()`)

**Serializers** - Validation + transformation:
- Field-level validation (`validate_<field>()`)
- Object-level validation (`validate()`)
- Nested serializers for complex structures
- Custom read-only computed fields

**Views** - Request handling + response formatting:
- Permission classes for authentication
- Rate limiting via django-ratelimit
- Delegates complex logic to services
- Minimal business logic in views

**Services** - Complex multi-step operations:
- Stripe payment processing (`payments/services.py`)
- Onfleet integration (`logistics/services.py`)
- Email notifications (`customers/emails.py`)

**Tasks** - Asynchronous background operations (Celery ready, not yet implemented)

### Key Architectural Patterns

**1. Polymorphic Booking System**  
Single `Booking` model supports 4 service types via discriminator field:
- `mini_move` → Links to `MiniMovePackage`, optional `OrganizingService`
- `standard_delivery` → Uses `StandardDeliveryConfig` pricing
- `specialty_item` → Many-to-many with `SpecialtyItem`
- `blade_transfer` → BLADE airport transfer (Phase 3 addition)

**2. Soft Delete Pattern**  
`deleted_at` field enables data recovery:
- `Booking.objects.filter(deleted_at__isnull=True)` for active records
- Admin can restore via setting `deleted_at=None`

**3. Cents-Based Pricing**  
All monetary values stored as cents (PositiveBigIntegerField):
- Prevents floating-point precision errors
- `@property` methods provide dollar accessors
- Calculations always in cents, conversion only for display

**4. Audit Trail**  
Financial compliance via audit models:
- `PaymentAudit` tracks all payment state changes
- `StaffAction` logs all staff operations with IP/user-agent
- Immutable records (no updates/deletes)

**5. Dynamic Pricing Engine**  
`Booking.calculate_pricing()` orchestrates:
- Base service pricing
- Surcharges (weekend, geographic, time-window)
- Add-ons (COI, organizing services)
- Tax calculations (8.25% on organizing services only)

### Django App Organization

**Core Business Apps:**
- `bookings` - Booking model, guest checkout, public booking API
- `services` - Service catalog models (packages, items, surcharges)
- `payments` - Stripe integration, refunds, payment audit
- `customers` - Customer profiles, saved addresses, auth endpoints
- `accounts` - Staff profiles, staff auth, audit logging

**Supporting Apps:**
- `logistics` - Onfleet task synchronization
- `notifications` - Email service layer (SES integration)
- `documents` - Placeholder for COI uploads (future)
- `crm` - Placeholder for customer analytics (future)

### Integration Strategy

**External Services:**
- **Stripe** - Payment processing via PaymentIntent API (mocked for dev)
- **Onfleet** - Delivery logistics & driver tracking (mocked for dev)
- **AWS SES** - Email notifications (configured, not fully active)
- **AWS S3** - Media storage (configured for production)

**API Design:**
- Public endpoints (`/api/public/`) - No auth, guest bookings
- Customer endpoints (`/api/customer/`) - Session auth
- Staff endpoints (`/api/staff/`) - Session auth + staff profile check
- Payment webhooks - CSRF exempt, signature verification

---

## SECTION 2: COMPLETE API ENDPOINT INVENTORY

### PUBLIC BOOKING API (`/api/public/`)

**Service Catalog Endpoints**

```
URL: /api/public/services/
Method: GET
View: ServiceCatalogView
Auth: AllowAny
Response: {mini_move_packages[], organizing_services[], specialty_items[], standard_delivery{}}
Files: bookings/views.py
```

```
URL: /api/public/services/mini-moves-with-organizing/
Method: GET
View: ServiceCatalogWithOrganizingView
Auth: AllowAny
Response: {mini_moves_with_organizing[{package, organizing_options{packing, unpacking}}]}
Files: bookings/views.py, services/serializers.py
```

```
URL: /api/public/services/organizing-by-tier/
Method: GET
View: OrganizingServicesByTierView
Auth: AllowAny
Response: {petite{packing, unpacking}, standard{}, full{}}
Files: bookings/views.py
```

```
URL: /api/public/services/organizing/<uuid:service_id>/
Method: GET
View: OrganizingServiceDetailView
Auth: AllowAny
Response: {service details}
Files: bookings/views.py
```

**Booking Endpoints**

```
URL: /api/public/guest-booking/
Method: POST
View: GuestBookingCreateView
Auth: AllowAny
Request: {service_type, guest_checkout{first_name, last_name, email, phone}, addresses, service_details}
Response: {booking{id, booking_number, total_price_dollars, payment_intent}}
Files: bookings/views.py, bookings/serializers.py
```

```
URL: /api/public/booking-status/<booking_number>/
Method: GET
View: BookingStatusView
Auth: AllowAny
Response: {booking{status, service_type, pickup_date, total_price_dollars}}
Files: bookings/views.py
```

```
URL: /api/public/pricing-preview/
Method: POST
View: PricingPreviewView
Auth: AllowAny
Request: {service_type, pickup_date, service_details}
Response: {pricing_breakdown, total_price_dollars}
Files: bookings/views.py
```

```
URL: /api/public/calendar/availability/
Method: GET
View: CalendarAvailabilityView
Auth: AllowAny
Query: ?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
Response: {availability[{date, bookings[], surcharges[]}]}
Files: bookings/views.py
```

### CUSTOMER API (`/api/customer/`)

**Authentication**

```
URL: /api/customer/auth/register/
Method: POST
View: CustomerRegistrationView
Auth: AllowAny
Request: {email, password, password_confirm, first_name, last_name, phone}
Response: {user, customer_profile, email_verification_sent}
Files: customers/views.py, customers/serializers.py
```

```
URL: /api/customer/auth/verify-email/
Method: POST
View: EmailVerificationView
Auth: AllowAny
Request: {token}
Response: {message, user}
Files: customers/views.py
```

```
URL: /api/customer/auth/login/
Method: POST
View: CustomerLoginView
Auth: AllowAny
Request: {email, password}
Response: {user, customer_profile, csrf_token}
Files: customers/views.py
```

```
URL: /api/customer/auth/logout/
Method: POST
View: CustomerLogoutView
Auth: AllowAny
Response: {message}
Files: customers/views.py
```

```
URL: /api/customer/auth/user/
Method: GET
View: CurrentUserView
Auth: IsAuthenticated
Response: {user, customer_profile, csrf_token}
Files: customers/views.py
```

```
URL: /api/customer/auth/password-reset/
Method: POST
View: PasswordResetRequestView
Auth: AllowAny
Request: {email}
Response: {message}
Files: customers/views.py
```

```
URL: /api/customer/auth/password-reset/confirm/
Method: POST
View: PasswordResetConfirmView
Auth: AllowAny
Request: {token, new_password}
Response: {message}
Files: customers/views.py
```

**Profile & Addresses**

```
URL: /api/customer/profile/
Method: GET, PATCH
View: CustomerProfileView
Auth: IsAuthenticated
Request: {phone, preferred_pickup_time, email_notifications, sms_notifications}
Response: {customer_profile}
Files: customers/views.py
```

```
URL: /api/customer/addresses/
Method: GET, POST
View: SavedAddressListCreateView
Auth: IsAuthenticated
Request: {nickname, address_line_1, city, state, zip_code, delivery_instructions}
Response: {saved_addresses[]}
Files: customers/views.py
```

```
URL: /api/customer/addresses/<uuid:pk>/
Method: GET, PATCH, DELETE
View: SavedAddressDetailView
Auth: IsAuthenticated
Request: {address fields}
Response: {saved_address}
Files: customers/views.py
```

**Bookings**

```
URL: /api/customer/bookings/
Method: GET
View: CustomerBookingListView
Auth: IsAuthenticated
Response: {bookings[]}
Files: customers/views.py
```

```
URL: /api/customer/bookings/create/
Method: POST
View: CustomerBookingCreateView
Auth: IsAuthenticated
Request: {service_type, pickup_date, saved_address_ids or new_addresses, service_details}
Response: {booking, payment_intent}
Files: customers/booking_views.py, customers/booking_serializers.py
```

```
URL: /api/customer/bookings/<uuid:booking_id>/
Method: GET
View: CustomerBookingDetailView
Auth: IsAuthenticated
Response: {booking{detailed_info, pricing_breakdown, payment_status}}
Files: customers/booking_views.py
```

```
URL: /api/customer/bookings/<uuid:booking_id>/rebook/
Method: POST
View: QuickRebookView
Auth: IsAuthenticated
Request: {pickup_date, pickup_time, special_instructions}
Response: {new_booking}
Files: customers/booking_views.py
```

**Dashboard**

```
URL: /api/customer/dashboard/
Method: GET
View: CustomerDashboardView
Auth: IsAuthenticated
Response: {customer_profile, booking_summary, recent_bookings[], popular_addresses[]}
Files: customers/views.py
```

```
URL: /api/customer/preferences/
Method: GET
View: BookingPreferencesView
Auth: IsAuthenticated
Response: {preferred_pickup_time, notifications, default_addresses}
Files: customers/views.py
```

```
URL: /api/customer/csrf-token/
Method: GET
View: CSRFTokenView
Auth: AllowAny
Response: {csrf_token}
Files: customers/views.py
```

### PAYMENT API (`/api/payments/`)

```
URL: /api/payments/create-intent/
Method: POST
View: PaymentIntentCreateView
Auth: AllowAny
Request: {booking_id, customer_email}
Response: {client_secret, payment_intent_id, amount_cents}
Files: payments/views.py, payments/services.py
```

```
URL: /api/payments/confirm/
Method: POST
View: PaymentConfirmView
Auth: AllowAny
Request: {payment_intent_id}
Response: {message, booking_status, payment_status}
Files: payments/views.py
```

```
URL: /api/payments/status/<booking_number>/
Method: GET
View: PaymentStatusView
Auth: AllowAny
Response: {payment{status, amount_dollars}, booking{status}}
Files: payments/views.py
```

```
URL: /api/payments/webhook/
Method: POST
View: StripeWebhookView
Auth: CSRF Exempt
Request: Stripe webhook payload
Response: 200 OK
Files: payments/views.py
```

```
URL: /api/payments/mock-confirm/
Method: POST
View: MockPaymentConfirmView
Auth: AllowAny (DEV ONLY)
Request: {booking_id}
Response: {message}
Files: payments/views.py
```

### STAFF API (`/api/staff/`)

**Authentication**

```
URL: /api/staff/auth/login/
Method: POST
View: StaffLoginView
Auth: AllowAny
Request: {username, password}
Response: {staff_profile, csrf_token}
Files: accounts/views.py
```

```
URL: /api/staff/auth/logout/
Method: POST
View: StaffLogoutView
Auth: IsAuthenticated
Response: {message}
Files: accounts/views.py
```

```
URL: /api/staff/csrf-token/
Method: GET
View: StaffCSRFTokenView
Auth: AllowAny
Response: {csrf_token}
Files: accounts/views.py
```

**Dashboard & Operations**

```
URL: /api/staff/dashboard/
Method: GET
View: StaffDashboardView
Auth: IsAuthenticated + StaffProfile
Response: {stats{bookings, revenue, customers}, recent_activity[]}
Files: accounts/views.py
```

```
URL: /api/staff/bookings/
Method: GET
View: BookingManagementView
Auth: IsAuthenticated + StaffProfile
Query: ?status=pending&date_from=YYYY-MM-DD
Response: {bookings[], pagination}
Files: accounts/views.py
```

```
URL: /api/staff/bookings/<uuid:booking_id>/
Method: GET, PATCH
View: BookingDetailView
Auth: IsAuthenticated + StaffProfile
Request: {status, special_instructions}
Response: {booking{full_details}}
Files: accounts/views.py
```

**Customer Management**

```
URL: /api/staff/customers/
Method: GET
View: CustomerManagementView
Auth: IsAuthenticated + StaffProfile
Query: ?search=email&is_vip=true
Response: {customers[], pagination}
Files: accounts/views.py
```

```
URL: /api/staff/customers/<int:customer_id>/
Method: GET
View: CustomerDetailView
Auth: IsAuthenticated + StaffProfile
Response: {customer{profile, bookings[], lifetime_value}}
Files: accounts/views.py
```

```
URL: /api/staff/customers/<int:customer_id>/notes/
Method: PATCH
View: CustomerNotesUpdateView
Auth: IsAuthenticated + StaffProfile
Request: {notes}
Response: {customer_profile}
Files: accounts/views.py
```

**Refunds (Staff Only)**

```
URL: /api/payments/refunds/
Method: GET
View: RefundListView
Auth: IsAuthenticated + StaffProfile
Response: {refunds[]}
Files: payments/views.py
```

```
URL: /api/payments/refunds/create/
Method: POST
View: RefundCreateView
Auth: IsAuthenticated + StaffProfile
Request: {payment_id, amount_cents, reason}
Response: {refund}
Files: payments/views.py
```

### LOGISTICS API (`/api/staff/logistics/`)

```
URL: /api/staff/logistics/summary/
Method: GET
View: LogisticsSummaryView
Auth: IsAuthenticated + StaffProfile
Response: {totetaxi_stats, onfleet_stats, integration_stats}
Files: logistics/views.py, logistics/services.py
```

```
URL: /api/staff/logistics/sync/
Method: POST
View: sync_onfleet_status
Auth: IsAuthenticated + StaffProfile
Response: {synced_count, timestamp}
Files: logistics/views.py
```

```
URL: /api/staff/logistics/tasks/
Method: GET
View: TaskStatusView
Auth: IsAuthenticated + StaffProfile
Response: {tasks[]}
Files: logistics/views.py
```

```
URL: /api/staff/logistics/create-task/
Method: POST
View: create_task_manually
Auth: IsAuthenticated + StaffProfile
Request: {booking_id}
Response: {task{onfleet_task_id, tracking_url}}
Files: logistics/views.py
```

```
URL: /api/staff/logistics/webhook/
Method: POST
View: OnfleetWebhookView
Auth: CSRF Exempt
Request: Onfleet webhook payload
Response: {success, timestamp}
Files: logistics/views.py
```

---

## SECTION 3: COMPLETE MODEL DOCUMENTATION

### CORE MODELS (Full Specifications)

#### Booking (apps/bookings/models.py)
**Purpose:** Central booking entity supporting 4 service types with polymorphic design

```python
class Booking(models.Model):
    # Identity
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking_number = models.CharField(max_length=20, unique=True)  # Auto: TT-000001
    
    # Customer relationship (exactly one)
    customer = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='bookings'
    )  # For authenticated users
    
    guest_checkout = models.OneToOneField(
        'GuestCheckout',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='booking'
    )  # For guest users
    
    # Service type discriminator
    service_type = models.CharField(max_length=30, choices=[
        ('mini_move', 'Mini Move'),
        ('standard_delivery', 'Standard Delivery'),
        ('specialty_item', 'Specialty Item'),
        ('blade_transfer', 'BLADE Airport Transfer'),
    ])
    
    # Service-specific relationships
    mini_move_package = models.ForeignKey(
        'services.MiniMovePackage',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='bookings'
    )  # Required if service_type='mini_move'
    
    specialty_items = models.ManyToManyField(
        'services.SpecialtyItem',
        blank=True,
        related_name='bookings'
    )  # Used by 'specialty_item' and 'standard_delivery'
    
    # Addresses
    pickup_address = models.ForeignKey(
        'Address',
        on_delete=models.CASCADE,
        related_name='pickup_bookings'
    )
    
    delivery_address = models.ForeignKey(
        'Address',
        on_delete=models.CASCADE,
        related_name='delivery_bookings'
    )
    
    # Scheduling
    pickup_date = models.DateField()
    pickup_time = models.CharField(max_length=30, choices=[
        ('morning', '8 AM - 11 AM'),
        ('morning_specific', 'Specific 1-hour window'),
        ('no_time_preference', 'No time preference'),
    ], default='morning')
    specific_pickup_hour = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(8), MaxValueValidator(19)]
    )  # 8-19 for 8 AM to 7 PM
    
    # Standard delivery specific
    standard_delivery_item_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of items for standard delivery"
    )
    is_same_day_delivery = models.BooleanField(default=False)
    
    # Add-ons & Options
    coi_required = models.BooleanField(default=False)
    is_outside_core_area = models.BooleanField(
        default=False,
        help_text="CT/NJ or Amagansett/Montauk"
    )
    special_instructions = models.TextField(blank=True)
    
    # Organizing services (Mini Move only)
    include_packing = models.BooleanField(
        default=False,
        help_text="Include professional packing service for this Mini Move tier"
    )
    include_unpacking = models.BooleanField(
        default=False,
        help_text="Include professional unpacking service for this Mini Move tier"
    )
    
    # BLADE specific (Phase 3)
    blade_airport = models.CharField(
        max_length=10,
        blank=True,
        choices=[
            ('JFK', 'JFK Airport'),
            ('EWR', 'Newark Airport'),
            ('LGA', 'LaGuardia Airport'),
        ]
    )
    blade_flight_date = models.DateField(null=True, blank=True)
    blade_flight_time = models.TimeField(null=True, blank=True)
    blade_bag_count = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(10)]
    )
    blade_ready_time = models.TimeField(
        null=True,
        blank=True,
        help_text="Auto-calculated: flight_time - 1.5 hours"
    )
    
    # Pricing (all in cents)
    base_price_cents = models.PositiveBigIntegerField(default=0)
    surcharge_cents = models.PositiveBigIntegerField(
        default=0,
        help_text="Weekend, peak dates, etc."
    )
    coi_fee_cents = models.PositiveBigIntegerField(default=0)
    organizing_total_cents = models.PositiveBigIntegerField(
        default=0,
        help_text="Total cost for packing and unpacking services"
    )
    geographic_surcharge_cents = models.PositiveBigIntegerField(
        default=0,
        help_text="CT/NJ or Hamptons surcharge"
    )
    time_window_surcharge_cents = models.PositiveBigIntegerField(
        default=0,
        help_text="1-hour specific window surcharge for Standard tier"
    )
    organizing_tax_cents = models.PositiveBigIntegerField(
        default=0,
        help_text="Tax on organizing services"
    )
    total_price_cents = models.PositiveBigIntegerField(default=0)
    
    # Status
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('paid', 'Paid'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ], default='pending')
    
    # Soft delete
    deleted_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'bookings_booking'
        constraints = [
            models.CheckConstraint(
                check=(
                    Q(customer__isnull=False, guest_checkout__isnull=True) |
                    Q(customer__isnull=True, guest_checkout__isnull=False)
                ),
                name='booking_exactly_one_customer_type'
            )
        ]
    
    # Key Methods
    def save(self, *args, **kwargs):
        if not self.booking_number:
            # Auto-generate: TT-000001, TT-000002, etc.
            last_booking = Booking.objects.order_by('created_at').last()
            if last_booking and last_booking.booking_number:
                last_num = int(last_booking.booking_number.split('-')[1])
                next_num = last_num + 1
            else:
                next_num = 1
            self.booking_number = f"TT-{next_num:06d}"
        
        self.calculate_pricing()  # Always recalculate before save
        super().save(*args, **kwargs)
    
    def calculate_pricing(self):
        """Dynamic pricing engine - calculates all pricing fields"""
        # Delegates to service models for base pricing
        # Applies surcharge rules
        # Adds organizing service costs
        # Calculates taxes
        # See implementation in models.py
    
    def get_customer_name(self):
        """Returns customer name regardless of auth status"""
        if self.customer:
            return self.customer.get_full_name()
        elif self.guest_checkout:
            return f"{self.guest_checkout.first_name} {self.guest_checkout.last_name}"
        return "Unknown"
    
    def get_pricing_breakdown(self):
        """Returns detailed pricing breakdown for invoices"""
        # Returns dict with all pricing components
        # See implementation in models.py
    
    @property
    def total_price_dollars(self):
        return self.total_price_cents / 100
```

#### Payment (apps/payments/models.py)
**Purpose:** Payment records with Stripe integration

```python
class Payment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Relationships
    booking = models.ForeignKey(
        'bookings.Booking',
        on_delete=models.PROTECT,
        related_name='payments'
    )
    customer = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payments'
    )
    
    # Payment details
    amount_cents = models.PositiveBigIntegerField()
    
    # Stripe integration
    stripe_payment_intent_id = models.CharField(max_length=200, blank=True)
    stripe_charge_id = models.CharField(max_length=200, blank=True)
    
    # Status
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('succeeded', 'Succeeded'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ], default='pending')
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

#### CustomerProfile (apps/customers/models.py)
**Purpose:** Customer-specific data and preferences

```python
class CustomerProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='customer_profile'
    )
    
    # Contact
    phone = models.CharField(
        max_length=20,
        blank=True,
        validators=[RegexValidator(regex=r'^\+?1?\d{9,15}$')]
    )
    
    # Statistics
    total_bookings = models.PositiveIntegerField(default=0)
    total_spent_cents = models.PositiveBigIntegerField(default=0)
    last_booking_at = models.DateTimeField(null=True, blank=True)
    
    # Preferences
    preferred_pickup_time = models.CharField(
        max_length=30,
        choices=[
            ('morning', '8 AM - 11 AM'),
            ('morning_specific', 'Specific 1-hour window'),
            ('no_time_preference', 'No time preference'),
        ],
        default='morning'
    )
    email_notifications = models.BooleanField(default=True)
    sms_notifications = models.BooleanField(default=False)
    
    # VIP status
    is_vip = models.BooleanField(
        default=False,
        help_text="Auto-upgraded at $2,000+ lifetime spend"
    )
    
    # Staff notes
    notes = models.TextField(
        blank=True,
        help_text="Internal notes for staff"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'customers_profile'
    
    def clean(self):
        """Prevent hybrid accounts"""
        if hasattr(self.user, 'staff_profile'):
            raise ValidationError("Users cannot have both staff and customer profiles.")
    
    def add_booking_stats(self, booking_total_cents):
        """Update customer statistics after booking completion"""
        self.total_bookings += 1
        self.total_spent_cents += booking_total_cents
        self.last_booking_at = timezone.now()
        
        # Auto VIP upgrade
        if not self.is_vip and self.total_spent_dollars >= 2000:
            self.is_vip = True
        
        self.save()
    
    @property
    def total_spent_dollars(self):
        return self.total_spent_cents / 100
```

#### StaffProfile (apps/accounts/models.py)
**Purpose:** Staff accounts with role-based permissions

```python
class StaffProfile(models.Model):
    ROLE_CHOICES = [
        ('admin', 'Administrator'),
        ('operations', 'Operations Manager'),
        ('customer_service', 'Customer Service'),
        ('finance', 'Finance'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='staff_profile'
    )
    
    # Role & Department
    role = models.CharField(max_length=30, choices=ROLE_CHOICES, default='customer_service')
    department = models.CharField(max_length=50, blank=True)
    hire_date = models.DateField(default=date.today)
    
    # Contact
    phone = models.CharField(max_length=20, blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'accounts_staff_profile'
    
    def clean(self):
        """Prevent hybrid accounts"""
        if hasattr(self.user, 'customer_profile'):
            raise ValidationError("Users cannot have both staff and customer profiles.")
    
    @property
    def can_approve_refunds(self):
        return self.role in ['admin', 'finance']
    
    @property
    def can_manage_staff(self):
        return self.role == 'admin'
```

### SERVICE MODELS (Relationships + Key Fields)

#### MiniMovePackage (apps/services/models.py)
**Purpose:** Mini Move service tiers (Petite, Standard, Full)

```python
class MiniMovePackage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    package_type = models.CharField(max_length=20, choices=[
        ('petite', 'Petite'),
        ('standard', 'Standard'),
        ('full', 'Full Move'),
    ], unique=True)
    name = models.CharField(max_length=50)
    description = models.TextField()
    
    # Pricing
    base_price_cents = models.PositiveBigIntegerField()
    coi_included = models.BooleanField(default=False)
    coi_fee_cents = models.PositiveBigIntegerField(default=5000)  # $50
    
    # Limits
    max_items = models.PositiveIntegerField(null=True, blank=True)  # null = unlimited
    max_weight_per_item_lbs = models.PositiveIntegerField(default=50)
    
    # Features
    priority_scheduling = models.BooleanField(default=False)
    protective_wrapping = models.BooleanField(default=False)
    is_most_popular = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'services_mini_move_package'
        ordering = ['base_price_cents']
```

#### OrganizingService (apps/services/models.py)
**Purpose:** Professional packing/unpacking add-ons tied to Mini Move tiers

```python
class OrganizingService(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    service_type = models.CharField(max_length=30, choices=[
        ('petite_packing', 'Petite Packing'),
        ('standard_packing', 'Standard Packing'),
        ('full_packing', 'Full Packing'),
        ('petite_unpacking', 'Petite Unpacking'),
        ('standard_unpacking', 'Standard Unpacking'),
        ('full_unpacking', 'Full Unpacking'),
    ], unique=True)
    mini_move_tier = models.CharField(max_length=20, choices=[
        ('petite', 'Petite'),
        ('standard', 'Standard'),
        ('full', 'Full'),
    ])
    name = models.CharField(max_length=100)
    description = models.TextField()
    price_cents = models.PositiveBigIntegerField()
    duration_hours = models.PositiveIntegerField()
    organizer_count = models.PositiveIntegerField()
    supplies_allowance_cents = models.PositiveBigIntegerField(default=0)
    is_packing_service = models.BooleanField()  # True=packing, False=unpacking
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'services_organizing_service'
        ordering = ['mini_move_tier', 'is_packing_service', 'price_cents']
```

#### SpecialtyItem (apps/services/models.py)

```python
class SpecialtyItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    item_type = models.CharField(max_length=30, choices=[
        ('peloton', 'Peloton'),
        ('surfboard', 'Surfboard'),
        ('crib', 'Crib'),
        ('wardrobe_box', 'Wardrobe Box'),
    ], unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField()
    price_cents = models.PositiveBigIntegerField()
    special_handling = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'services_specialty_item'
```

#### SurchargeRule (apps/services/models.py)
**Purpose:** Dynamic surcharges (weekend, geographic, time-window, peak dates)

```python
class SurchargeRule(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    surcharge_type = models.CharField(max_length=20, choices=[
        ('weekend', 'Weekend'),
        ('peak_date', 'Peak Date'),
        ('geographic', 'Geographic'),
        ('time_window', 'Time Window'),
    ])
    name = models.CharField(max_length=100)
    description = models.TextField()
    
    # Service targeting
    applies_to_service_type = models.CharField(max_length=20, choices=[
        ('all', 'All Services'),
        ('mini_move', 'Mini Moves Only'),
        ('standard_delivery', 'Standard Delivery Only'),
        ('specialty_item', 'Specialty Items Only'),
    ], default='all')
    
    # Calculation
    calculation_type = models.CharField(max_length=20, choices=[
        ('percentage', 'Percentage'),
        ('fixed_amount', 'Fixed Amount'),
    ])
    percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    fixed_amount_cents = models.PositiveBigIntegerField(null=True, blank=True)
    
    # Date rules
    specific_date = models.DateField(null=True, blank=True)  # For peak dates
    applies_saturday = models.BooleanField(default=False)
    applies_sunday = models.BooleanField(default=False)
    
    is_active = models.BooleanField(default=True)
    
    # Key Method
    def calculate_surcharge(self, base_amount_cents, booking_date, service_type=None):
        """Calculate surcharge for given parameters"""
        # Returns surcharge amount in cents
```

### SUPPORTING MODELS (Summaries)

**Address** (bookings/models.py) - Pickup/delivery addresses
- Fields: address_line_1, address_line_2, city, state, zip_code
- Related to: Booking (pickup/delivery), SavedAddress

**GuestCheckout** (bookings/models.py) - Guest user info
- Fields: first_name, last_name, email, phone
- OneToOne: Booking

**SavedAddress** (customers/models.py) - Customer's saved addresses
- Fields: nickname, address fields, delivery_instructions, times_used
- ForeignKey: User
- Constraint: unique(user, nickname)

**CustomerPaymentMethod** (customers/models.py) - Saved payment methods
- Fields: stripe_payment_method_id, card_brand, card_last_four, is_default
- ForeignKey: User

**Refund** (payments/models.py) - Refund requests
- Fields: amount_cents, reason, status, stripe_refund_id
- ForeignKeys: Payment, requested_by (User), approved_by (User)

**PaymentAudit** (payments/models.py) - Financial audit trail
- Fields: action, description, created_at
- ForeignKeys: Payment, Refund, User (staff)

**StaffAction** (accounts/models.py) - Staff activity audit
- Fields: action_type, description, ip_address, user_agent
- ForeignKeys: staff_user (User), customer_id, booking_id

**OnfleetTask** (logistics/models.py) - Onfleet integration
- Fields: onfleet_task_id, tracking_url, status
- OneToOne: Booking

**EmailVerificationToken** (customers/models.py) - Email verification
- Fields: token, expires_at, verified
- OneToOne: User

**PasswordResetToken** (customers/models.py) - Password reset
- Fields: token, expires_at, used
- ForeignKey: User

**StandardDeliveryConfig** (services/models.py) - Standard delivery pricing config
- Fields: price_per_item_cents, minimum_charge_cents, same_day_flat_rate_cents
- Singleton pattern (one active config)

---

## SECTION 4: FILE DIRECTORY + PURPOSE INDEX

```
apps/
├── accounts/                         - Staff authentication and management
│   ├── models.py                     - StaffProfile, StaffAction (audit log)
│   ├── serializers.py                - Staff authentication, profile serialization
│   ├── views.py                      - Staff login/logout, dashboard, customer management
│   ├── urls.py                       - /api/staff/ routing
│   └── migrations/                   - Staff profile schema migrations
│
├── bookings/                         - Core booking system
│   ├── models.py                     - Booking (4 service types), Address, GuestCheckout
│   ├── serializers.py                - Guest booking creation, pricing preview, status
│   ├── views.py                      - Public API (guest bookings, service catalog, availability)
│   ├── urls.py                       - /api/public/ routing
│   └── migrations/                   - Booking schema, service type additions
│
├── customers/                        - Customer authentication and bookings
│   ├── models.py                     - CustomerProfile, SavedAddress, CustomerPaymentMethod, tokens
│   ├── serializers.py                - Customer registration/login, profile, addresses
│   ├── views.py                      - Customer auth, profile management, dashboard
│   ├── booking_views.py              - Authenticated booking creation, rebooking, detail view
│   ├── booking_serializers.py        - Authenticated booking serialization with saved addresses
│   ├── authentication.py             - HybridAuthentication (session + mobile support)
│   ├── emails.py                     - Email service layer (verification, password reset)
│   └── urls.py                       - /api/customer/ routing
│
├── payments/                         - Payment processing and refunds
│   ├── models.py                     - Payment, Refund, PaymentAudit
│   ├── serializers.py                - Payment intent creation, payment confirmation
│   ├── services.py                   - StripePaymentService (PaymentIntent, webhooks)
│   ├── views.py                      - Payment endpoints, Stripe webhook, refunds (staff)
│   └── urls.py                       - /api/payments/ routing
│
├── services/                         - Service catalog and pricing engine
│   ├── models.py                     - MiniMovePackage, OrganizingService, SpecialtyItem, 
│   │                                   StandardDeliveryConfig, SurchargeRule
│   ├── serializers.py                - Service catalog serialization, organizing options
│   ├── admin.py                      - Admin interface for service management
│   └── migrations/                   - Service catalog schema, organizing services data population
│
├── logistics/                        - Onfleet delivery tracking integration
│   ├── models.py                     - OnfleetTask (booking ↔ Onfleet sync)
│   ├── services.py                   - OnfleetService, ToteTaxiOnfleetIntegration
│   ├── views.py                      - Logistics dashboard, sync, webhooks
│   └── urls.py                       - /api/staff/logistics/ routing
│
├── notifications/                    - Email/SMS notifications (placeholder)
│   └── [Future: Email templates, notification queue]
│
├── documents/                        - Document management (placeholder)
│   └── [Future: COI uploads, invoices, receipts]
│
└── crm/                              - Customer analytics (placeholder)
    └── [Future: Customer insights, marketing automation]

config/                               - Django project configuration
├── settings.py                       - Environment configuration, installed apps, middleware
├── urls.py                           - Root URL routing
├── wsgi.py                           - Production WSGI application
└── asgi.py                           - ASGI application (future WebSocket support)

scripts/                              - Utility scripts
├── back_export.py                    - Backend code snapshot generator
├── entrypoint.sh                     - Docker container initialization
└── recreate_services.py              - Service catalog data seeding script

Root Configuration Files:
├── requirements.txt                  - Python dependencies
├── Dockerfile                        - Production container image
├── docker-compose.yml                - Local development environment
├── manage.py                         - Django management CLI
└── pytest.ini                        - Test runner configuration
```

---

## SECTION 5: FEATURE-TO-FILE DEPENDENCY MAPS

### Feature 1: Guest Booking Creation Flow

**Entry Point:** `POST /api/public/guest-booking/`

**Execution Flow:**
1. `bookings/views.py` → `GuestBookingCreateView.post()`
   - Validates request data
   - Creates GuestCheckout record
   - Creates Address records
   - Creates Booking with pricing calculation

2. `bookings/serializers.py` → `GuestBookingCreateSerializer.create()`
   - Extracts guest checkout data
   - Creates pickup/delivery Address instances
   - Determines service type and links appropriate service models
   - Calls Booking.save() which triggers calculate_pricing()

3. `bookings/models.py` → `Booking.calculate_pricing()`
   - Loads service pricing (MiniMovePackage, StandardDeliveryConfig, etc.)
   - Applies SurchargeRule calculations
   - Adds organizing service costs
   - Calculates taxes
   - Sets all pricing fields

4. `payments/services.py` → `StripePaymentService.create_payment_intent()`
   - Creates Stripe PaymentIntent
   - Creates Payment record with status='pending'
   - Returns client_secret for frontend

**Dependencies:**
- Models: Booking, GuestCheckout, Address, Payment, MiniMovePackage, SpecialtyItem
- Services: StripePaymentService
- Serializers: GuestBookingCreateSerializer

**Files to Request:**
- bookings/views.py
- bookings/serializers.py
- bookings/models.py
- payments/services.py
- services/models.py (for pricing)

---

### Feature 2: Payment Processing (Stripe Integration)

**Entry Point:** `POST /api/payments/create-intent/`

**Execution Flow:**
1. `payments/views.py` → `PaymentIntentCreateView.post()`
   - Validates booking_id exists
   - Checks if booking already paid
   - Delegates to StripePaymentService

2. `payments/services.py` → `StripePaymentService.create_payment_intent()`
   - Calls Stripe API: `stripe.PaymentIntent.create()`
   - Creates Payment record with status='pending'
   - Returns client_secret for Stripe.js

3. **Frontend completes payment via Stripe.js**

4. `POST /api/payments/confirm/` → `PaymentConfirmView.post()`
   - Receives payment_intent_id
   - Delegates to StripePaymentService.confirm_payment()

5. `payments/services.py` → `StripePaymentService.confirm_payment()`
   - Retrieves Stripe PaymentIntent
   - Updates Payment status to 'succeeded'
   - Updates Booking status to 'paid'
   - Updates customer statistics via CustomerProfile.add_booking_stats()
   - Creates PaymentAudit entry

**Webhook Support:**
`POST /api/payments/webhook/` (Stripe webhook)
- Verifies signature
- Processes payment.succeeded, payment.failed events
- Updates Payment and Booking status

**Dependencies:**
- Models: Payment, Booking, CustomerProfile, PaymentAudit
- External: Stripe API
- Services: StripePaymentService

**Files to Request:**
- payments/views.py
- payments/services.py
- payments/models.py
- bookings/models.py
- customers/models.py

---

### Feature 3: Customer Registration & Email Verification

**Entry Point:** `POST /api/customer/auth/register/`

**Execution Flow:**
1. `customers/views.py` → `CustomerRegistrationView.post()`
   - Validates input data
   - Checks email uniqueness
   - Delegates to CustomerRegistrationSerializer

2. `customers/serializers.py` → `CustomerRegistrationSerializer.create()`
   - Creates User (email as username)
   - Creates CustomerProfile
   - Prevents hybrid accounts via model validation
   - Returns user instance

3. `customers/views.py` → Creates EmailVerificationToken
   - Generates secure token
   - Sets 48-hour expiry
   - Builds verification URL

4. `customers/emails.py` → `send_verification_email()`
   - Sends email via SES
   - Includes verification link

**Email Verification:**
`POST /api/customer/auth/verify-email/`
- Validates token
- Checks expiry
- Marks user as verified
- Logs user in

**Dependencies:**
- Models: User (Django), CustomerProfile, EmailVerificationToken
- Services: Email service (SES)
- Serializers: CustomerRegistrationSerializer

**Files to Request:**
- customers/views.py
- customers/serializers.py
- customers/models.py
- customers/emails.py

---

### Feature 4: Staff Dashboard & Authentication

**Entry Point:** `POST /api/staff/auth/login/`

**Execution Flow:**
1. `accounts/views.py` → `StaffLoginView.post()`
   - Validates credentials via Django authenticate()
   - Checks for staff_profile existence
   - Prevents customer accounts from logging in as staff
   - Creates session

2. `accounts/models.py` → `StaffAction.log_action()`
   - Logs 'login' event
   - Captures IP address and user agent
   - Creates audit trail

**Dashboard Data:**
`GET /api/staff/dashboard/`
- Aggregates booking statistics (pending, completed, revenue)
- Retrieves recent bookings
- Customer count and VIP statistics
- Recent staff actions

**Dependencies:**
- Models: StaffProfile, StaffAction, Booking, CustomerProfile, Payment
- Serializers: StaffLoginSerializer, StaffProfileSerializer

**Files to Request:**
- accounts/views.py
- accounts/serializers.py
- accounts/models.py
- bookings/models.py

---

### Feature 5: Onfleet Logistics Integration

**Entry Point:** Signal on Booking save (status='confirmed')

**Execution Flow:**
1. `logistics/models.py` → `@receiver(post_save, sender=Booking)`
   - Triggered when booking status changes to 'confirmed'
   - Calls ToteTaxiOnfleetIntegration.create_delivery_task()

2. `logistics/services.py` → `ToteTaxiOnfleetIntegration.create_delivery_task()`
   - Builds task data from booking
   - Calls OnfleetService.create_task_from_booking()

3. `logistics/services.py` → `OnfleetService.create_task_from_booking()`
   - Makes POST request to Onfleet API
   - Returns task_id, tracking_url

4. `logistics/models.py` → Creates `OnfleetTask` record
   - Links to booking
   - Stores onfleet_task_id, tracking_url
   - Sets status='created'

**Webhook Updates:**
`POST /api/staff/logistics/webhook/` (Onfleet webhook)
- Receives task state changes from Onfleet
- Updates OnfleetTask status
- When status='completed', marks Booking as 'completed'
- Updates customer statistics

**Manual Sync:**
`POST /api/staff/logistics/sync/`
- Staff can manually sync task statuses
- Updates last_synced timestamp

**Dependencies:**
- Models: OnfleetTask, Booking, CustomerProfile
- External: Onfleet API
- Services: OnfleetService, ToteTaxiOnfleetIntegration

**Files to Request:**
- logistics/models.py
- logistics/services.py
- logistics/views.py
- bookings/models.py

---

### Feature 6: Password Reset Flow

**Entry Point:** `POST /api/customer/auth/password-reset/`

**Execution Flow:**
1. `customers/views.py` → `PasswordResetRequestView.post()`
   - Validates email exists
   - Checks account is customer (not staff)
   - Creates PasswordResetToken

2. `customers/models.py` → `PasswordResetToken.create_token()`
   - Generates secure token
   - Sets 24-hour expiry

3. `customers/emails.py` → `send_password_reset_email()`
   - Sends email with reset link
   - Link includes token

**Password Reset Confirmation:**
`POST /api/customer/auth/password-reset/confirm/`
- Validates token
- Checks expiry and used status
- Updates user password via set_password()
- Marks token as used
- Logs user in

**Dependencies:**
- Models: User, PasswordResetToken
- Services: Email service (SES)

**Files to Request:**
- customers/views.py
- customers/models.py
- customers/emails.py

---

### Feature 7: Authenticated Customer Booking with Saved Addresses

**Entry Point:** `POST /api/customer/bookings/create/`

**Execution Flow:**
1. `customers/booking_views.py` → `CustomerBookingCreateView.post()`
   - Validates authenticated user
   - Delegates to AuthenticatedBookingCreateSerializer

2. `customers/booking_serializers.py` → `AuthenticatedBookingCreateSerializer.create()`
   - Processes saved_address_ids or new address data
   - Retrieves SavedAddress instances
   - Creates booking linked to authenticated user
   - Updates SavedAddress.mark_used() statistics

3. `customers/models.py` → `SavedAddress.mark_used()`
   - Increments times_used
   - Updates last_used_at

4. `bookings/models.py` → `Booking.save()` & `calculate_pricing()`
   - Calculates pricing
   - Creates payment intent

**Quick Rebooking:**
`POST /api/customer/bookings/<booking_id>/rebook/`
- Copies original booking data
- Updates pickup_date and instructions
- Reuses addresses
- Creates new booking

**Dependencies:**
- Models: Booking, Address, SavedAddress, CustomerProfile
- Serializers: AuthenticatedBookingCreateSerializer

**Files to Request:**
- customers/booking_views.py
- customers/booking_serializers.py
- customers/models.py
- bookings/models.py

---

### Feature 8: Organizing Services Add-On System

**Entry Point:** Service catalog retrieval or booking creation

**Execution Flow:**
1. `bookings/views.py` → `ServiceCatalogView.get()`
   - Returns all active OrganizingService instances
   - Groups by mini_move_tier

2. **Booking Creation with Organizing Services:**
   - User selects include_packing=True and/or include_unpacking=True
   - Booking serializer validates tier compatibility

3. `bookings/models.py` → `Booking.calculate_organizing_costs()`
   - Queries OrganizingService by mini_move_tier and is_packing_service
   - Adds price_cents to organizing_total_cents
   - Calculates 8.25% tax on organizing total

4. `bookings/models.py` → `Booking.get_pricing_breakdown()`
   - Returns breakdown including organizing services
   - Shows packing/unpacking details separately

**Service Management:**
- Services populated via migration (`0003_populate_organizing_services.py`)
- Admin can activate/deactivate services
- Pricing updates apply to future bookings only

**Dependencies:**
- Models: OrganizingService, MiniMovePackage, Booking
- Migrations: Service data population

**Files to Request:**
- services/models.py
- services/serializers.py
- bookings/models.py
- services/migrations/0003_populate_organizing_services.py

---

### Feature 9: Refund Approval Workflow

**Entry Point:** `POST /api/payments/refunds/create/` (Staff only)

**Execution Flow:**
1. `payments/views.py` → `RefundCreateView.post()`
   - Validates staff has permission
   - Validates payment exists and amount
   - Creates Refund with status='requested'

2. `payments/models.py` → `Refund.approve()`
   - Staff approves refund
   - Status changes to 'approved'
   - Records approved_by and approved_at

3. `payments/services.py` → `StripePaymentService.process_refund()`
   - Creates Stripe Refund via API
   - Updates Refund with stripe_refund_id
   - Changes status to 'completed'
   - Updates Payment status to 'refunded'

4. `payments/models.py` → `PaymentAudit.log()`
   - Logs refund_requested, refund_approved, refund_completed events

**Dependencies:**
- Models: Refund, Payment, PaymentAudit, StaffProfile
- External: Stripe API
- Services: StripePaymentService

**Files to Request:**
- payments/views.py
- payments/models.py
- payments/services.py
- accounts/models.py

---

### Feature 10: Dynamic Surcharge Calculation

**Entry Point:** `Booking.calculate_pricing()` during booking creation

**Execution Flow:**
1. `bookings/models.py` → `Booking.calculate_pricing()`
   - After determining base_price_cents
   - Queries active SurchargeRule instances

2. `services/models.py` → `SurchargeRule.calculate_surcharge()`
   - For each active rule:
     - Checks if applies_to_date(pickup_date)
     - Checks if applies_to_service_type
     - Calculates amount (percentage or fixed)
   - Returns surcharge_cents

3. `services/models.py` → `SurchargeRule.applies_to_date()`
   - Checks specific_date match
   - Checks day_of_week (Saturday/Sunday)
   - Returns boolean

4. `bookings/models.py` → Accumulates surcharge_cents
   - Adds weekend surcharges
   - Adds geographic surcharges
   - Adds time-window surcharges
   - Stores in surcharge_cents field

**Rule Examples:**
- Weekend surcharge: $175 for Mini Move on Sat/Sun
- Geographic surcharge: $220 for CT/NJ pickups
- Time-window surcharge: $175 for specific 1-hour window (Standard tier only)

**Dependencies:**
- Models: Booking, SurchargeRule

**Files to Request:**
- bookings/models.py
- services/models.py

---

## SECTION 6: BUSINESS LOGIC LOCATION INDEX

**Pricing Calculations:**
- Location: `bookings/models.py` → `Booking.calculate_pricing()`
- Location: `bookings/models.py` → `Booking.calculate_organizing_costs()`
- Location: `bookings/models.py` → `Booking.calculate_coi_fee()`
- Location: `bookings/models.py` → `Booking.calculate_geographic_surcharge()`
- Location: `services/models.py` → `SurchargeRule.calculate_surcharge()`

**Payment Processing:**
- Location: `payments/services.py` → `StripePaymentService.create_payment_intent()`
- Location: `payments/services.py` → `StripePaymentService.confirm_payment()`
- Location: `payments/services.py` → `StripePaymentService.handle_webhook()`
- Location: `payments/services.py` → `StripePaymentService.process_refund()`

**Customer Statistics Updates:**
- Location: `customers/models.py` → `CustomerProfile.add_booking_stats()`
- Location: `payments/services.py` → Called after payment confirmation
- Location: `logistics/models.py` → Called after delivery completion

**Authentication & Permissions:**
- Location: `customers/authentication.py` → `HybridAuthentication.authenticate()`
- Location: `accounts/models.py` → `StaffProfile.can_approve_refunds`
- Location: `accounts/models.py` → `StaffProfile.can_manage_staff`
- Location: `customers/models.py` → `CustomerProfile.clean()` (hybrid prevention)

**Audit Logging:**
- Location: `accounts/models.py` → `StaffAction.log_action()`
- Location: `payments/models.py` → `PaymentAudit.log()`
- Used By: All staff endpoints, all payment state changes

**State Transitions:**
- Booking Status: `bookings/models.py` (pending → confirmed → paid → completed)
- Payment Status: `payments/services.py` (pending → succeeded/failed → refunded)
- Onfleet Task Status: `logistics/models.py` → `OnfleetTask.sync_status_from_onfleet()`

**Email Notifications:**
- Location: `customers/emails.py` → `send_verification_email()`
- Location: `customers/emails.py` → `send_password_reset_email()`
- Location: `customers/emails.py` → `send_booking_confirmation()`

**Logistics Automation:**
- Location: `logistics/services.py` → `ToteTaxiOnfleetIntegration.create_delivery_task()`
- Location: `logistics/services.py` → `OnfleetService.create_task_from_booking()`
- Location: `logistics/models.py` → Signal handler for auto-task creation

**Data Validation:**
- Location: `customers/serializers.py` → `CustomerRegistrationSerializer.validate()`
- Location: `customers/serializers.py` → `CustomerLoginSerializer.validate()`
- Location: `bookings/serializers.py` → `GuestBookingCreateSerializer.validate()`
- Location: `customers/models.py` → `CustomerProfile.ensure_single_profile_type()`

---

## SECTION 7: INTEGRATION & TECH STACK SUMMARY

### Infrastructure

**Database:**
- Primary: PostgreSQL 14
- Connection: `psycopg2-binary==2.9.9`
- Environment: `DATABASE_URL` (Fly.io) or separate DB_* variables
- Features: Full-text search, JSONB support

**Caching & Sessions:**
- Cache: Redis
- Backend: `django-redis==5.4.0`
- Location: `REDIS_URL` environment variable
- Usage: Rate limiting, session storage, cache backend

**Task Queue:**
- Broker: Celery + Redis
- Packages: `celery==5.5.3`, `redis==5.1.1`, `django-celery-beat==2.8.1`
- Status: Infrastructure ready, tasks not yet implemented

**File Storage:**
- Development: Local filesystem
- Production: AWS S3
- Package: `boto3==1.35.19`, `django-storages==1.14.4`
- Media: `MEDIA_ROOT` / `MEDIA_URL`
- Static: WhiteNoise compression

**Monitoring:**
- Error Tracking: Sentry (`sentry-sdk==2.13.0`)
- Logging: CloudWatch (production), console (development)

### External Service Integrations

**Stripe API - Payment Processing**
- Package: `stripe==12.4.0`
- Implementation: `payments/services.py` → `StripePaymentService`
- Features: PaymentIntent, Refunds, Webhooks
- Environment: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- Mode: Mock mode enabled for development (`STRIPE_MOCK_MODE=True`)

**Onfleet API - Delivery Logistics**
- Package: `requests==2.32.3`
- Implementation: `logistics/services.py` → `OnfleetService`
- Features: Task creation, status sync, webhooks, driver tracking
- Environment: `ONFLEET_API_KEY`
- Mode: Mock mode enabled for development (`ONFLEET_MOCK_MODE=True`)

**AWS SES - Email Delivery**
- Package: `boto3==1.35.19`
- Implementation: `customers/emails.py`
- Email Types: Verification, password reset, booking confirmations
- Environment: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SES_REGION`
- Status: Configured but not fully active in development

**AWS S3 - Media Storage**
- Package: `django-storages==1.14.4`
- Usage: User uploads, COI documents (future)
- Environment: `AWS_STORAGE_BUCKET_NAME`, `AWS_S3_REGION_NAME`
- Development: Uses local media/ directory

### Key Configuration Values

**Authentication:**
- JWT_EXPIRY: Not used (session-based auth)
- SESSION_COOKIE_AGE: Django default (2 weeks)
- SESSION_COOKIE_SECURE: True in production

**Payment:**
- STRIPE_WEBHOOK_SECRET: Webhook signature verification
- Payment retry logic: Handled by Stripe

**Rate Limiting:**
- Backend: `django-ratelimit==4.1.0`
- Storage: Redis cache
- Limits applied per-view (see view decorators)
- Example: Login - 5/min, Dashboard - 60/min

**CORS:**
- Package: `django-cors-headers==4.6.0`
- Allowed Origins: Netlify frontend, localhost
- Credentials: True (for session cookies)

**File Upload:**
- MAX_UPLOAD_SIZE: 10MB (Django default)
- Allowed file types: images, PDFs (for COI)

### Environment Variables Required

**Core:**
```
SECRET_KEY=<django-secret>
DEBUG=False
ALLOWED_HOSTS=.fly.dev,localhost
```

**Database:**
```
DATABASE_URL=postgresql://user:pass@host:5432/dbname
# OR
DB_NAME=totetaxi
DB_USER=postgres
DB_PASSWORD=<password>
DB_HOST=db
DB_PORT=5432
```

**Redis:**
```
REDIS_URL=redis://redis:6379/1
```

**Stripe:**
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_MOCK_MODE=True  # Development only
```

**Onfleet:**
```
ONFLEET_API_KEY=<api-key>
ONFLEET_MOCK_MODE=True  # Development only
```

**AWS (Production):**
```
AWS_ACCESS_KEY_ID=<access-key>
AWS_SECRET_ACCESS_KEY=<secret-key>
AWS_STORAGE_BUCKET_NAME=totetaxi-media
AWS_SES_REGION=us-east-1
```

**Frontend:**
```
FRONTEND_URL=https://totetaxi.netlify.app
CORS_ALLOWED_ORIGINS=https://totetaxi.netlify.app,http://localhost:3000
```

**Deployment (Fly.io):**
```
FLY_APP_NAME=totetaxi-backend
PORT=8000
```

---

## SECTION 8: DEVELOPMENT PATTERNS & CONVENTIONS

### Adding New API Endpoint

**Standard Process:**
1. Define serializer in `app/serializers.py` with validation
2. Create view in `app/views.py` (APIView or ViewSet)
3. Add URL pattern in `app/urls.py`
4. Add permission classes to view
5. Add rate limiting decorator if needed (@ratelimit)
6. Write tests in `app/tests.py`
7. Update this documentation

**Example - Adding a new customer endpoint:**
```python
# 1. Serializer (customers/serializers.py)
class UpdatePreferencesSerializer(serializers.Serializer):
    email_notifications = serializers.BooleanField()
    sms_notifications = serializers.BooleanField()

# 2. View (customers/views.py)
@method_decorator(ratelimit(key='user', rate='10/m'), name='patch')
class UpdatePreferencesView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def patch(self, request):
        serializer = UpdatePreferencesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # Implementation...
        return Response({...})

# 3. URL (customers/urls.py)
path('preferences/update/', UpdatePreferencesView.as_view(), name='update-preferences')
```

### Modifying Existing Model

**Standard Process:**
1. Update model definition in `app/models.py`
2. Create migration: `python manage.py makemigrations`
3. Review migration file for correctness
4. Update affected serializers in `app/serializers.py`
5. Update affected views if field logic changes
6. Run tests: `python manage.py test`
7. Update this documentation

**Important - Cents-Based Pricing:**
- Always use `PositiveBigIntegerField` for monetary values
- Store as cents (multiply dollars by 100)
- Provide `@property` method for dollar conversion
- Example: `base_price_cents` + `@property base_price_dollars`

**Migration Safety:**
- Always review auto-generated migrations
- Add data migrations for complex changes
- Use `RunPython` for data transformations
- Test on development database first

### Adding Business Logic

**Decision Framework:**

**Simple CRUD operations** → ViewSet methods
```python
class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.all()
    serializer_class = BookingSerializer
```

**Complex multi-step operations** → Create service class in `services/`
```python
# payments/services.py
class StripePaymentService:
    @staticmethod
    def create_payment_intent(booking):
        # Complex Stripe integration logic
        pass
```

**Data calculations** → Model methods
```python
# bookings/models.py
class Booking(models.Model):
    def calculate_pricing(self):
        # Pricing calculation logic
        pass
```

**Async/background operations** → Celery tasks in `tasks/`
```python
# customers/tasks.py
@shared_task
def send_booking_confirmation_email(booking_id):
    # Async email sending
    pass
```

**Reusable utilities** → Helper functions in `utils/`
```python
# utils/validators.py
def validate_phone_number(phone):
    # Phone validation logic
    pass
```

### Code Organization Rules

**Models:**
- Data structure definitions
- Simple property methods (@property)
- Data-centric business methods (e.g., calculate_pricing)
- No external API calls

**Serializers:**
- Field-level validation (validate_<field>)
- Object-level validation (validate)
- Data transformation (to_representation, to_internal_value)
- Nested serialization
- No database queries in validation

**Views:**
- Request handling
- Permission checking
- Rate limiting
- Response formatting
- Delegate complex logic to services
- Keep business logic minimal

**Services:**
- Complex multi-step operations
- External API integration
- Business orchestration
- Coordinate multiple models
- Transaction management

### Testing Patterns

**Test Structure:**
```
tests/
├── test_models.py      - Model methods, validators, properties
├── test_views.py       - API endpoints, permissions, responses
├── test_serializers.py - Validation logic, data transformation
└── test_services.py    - Business logic, external integrations
```

**Test Guidelines:**
- Use `Django TestCase` for database tests
- Use `APIClient` for endpoint testing
- Mock external services (Stripe, Onfleet) with `@patch`
- Factory pattern for test data: `factory-boy==3.3.0`
- Aim for 80%+ coverage

**Example:**
```python
from rest_framework.test import APIClient, APITestCase
from django.contrib.auth.models import User

class BookingAPITests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(...)
        
    def test_create_guest_booking(self):
        response = self.client.post('/api/public/guest-booking/', {...})
        self.assertEqual(response.status_code, 201)
```

### Hybrid Account Prevention Pattern

**Critical Validation:**
Every profile model must prevent hybrid accounts:

```python
# Model level validation
def clean(self):
    if hasattr(self.user, 'staff_profile'):
        raise ValidationError("Users cannot have both profiles.")

# Serializer level validation
def validate(self, attrs):
    if User.objects.filter(email=email).exists():
        existing_user = User.objects.get(email=email)
        if hasattr(existing_user, 'customer_profile'):
            raise serializers.ValidationError("Already a customer account")
    return attrs

# Class method for checking
@classmethod
def ensure_single_profile_type(cls, user):
    if hasattr(user, 'staff_profile') and hasattr(user, 'customer_profile'):
        raise ValidationError("Hybrid accounts not allowed")
```

### Audit Trail Pattern

**Financial Operations:**
Every payment state change must be audited:
```python
PaymentAudit.log(
    action='payment_succeeded',
    description=f'Payment confirmed for booking {booking.booking_number}',
    payment=payment,
    user=None  # System action
)
```

**Staff Operations:**
Every staff action must be logged:
```python
StaffAction.log_action(
    staff_user=request.user,
    action_type='modify_booking',
    description=f'Updated booking {booking.booking_number} status to {new_status}',
    request=request,
    booking_id=booking.id
)
```

### Rate Limiting Pattern

Apply to all user-facing endpoints:
```python
@method_decorator(ratelimit(key='ip', rate='5/m', method='POST', block=True), name='post')
class LoginView(APIView):
    pass

@method_decorator(ratelimit(key='user', rate='60/m', method='GET', block=True), name='get')
class DashboardView(APIView):
    pass
```

**Guidelines:**
- Anonymous endpoints: Use `key='ip'`
- Authenticated endpoints: Use `key='user'` or `key='user_or_ip'`
- Always include `block=True` to return 429 errors
- Adjust rates based on endpoint sensitivity

### Soft Delete Pattern

For recoverable data:
```python
# Model
deleted_at = models.DateTimeField(null=True, blank=True)

# Querying
Booking.objects.filter(deleted_at__isnull=True)  # Active only

# Soft delete
booking.deleted_at = timezone.now()
booking.save()

# Restore
booking.deleted_at = None
booking.save()
```

### Session-Based Authentication Pattern

**Customer & Staff Auth:**
```python
# Login - creates session
user = authenticate(username=username, password=password)
if user:
    login(request, user)
    return Response({...})

# Logout - destroys session
logout(request)
request.session.flush()
return Response({'message': 'Logout successful'})

# Protected endpoint
permission_classes = [permissions.IsAuthenticated]
```

**CSRF Protection:**
- GET `/api/customer/csrf-token/` before POST requests
- Include `X-CSRFToken` header in requests
- Webhooks use `@csrf_exempt`

### Dynamic Pricing Pattern

**Always recalculate on save:**
```python
def save(self, *args, **kwargs):
    self.calculate_pricing()
    super().save(*args, **kwargs)

def calculate_pricing(self):
    # Load service pricing
    # Apply surcharges
    # Add taxes
    # Set all pricing fields
```

**Pricing is never cached:**
- Recalculated on every booking update
- Ensures current surcharge rules apply
- Prevents stale pricing data

---

## END OF LIVING DOCUMENTATION

**Total Lines:** ~1,450 (within 10-15% target)

**Usage Instructions:**
1. Reference this document to understand system architecture
2. Identify files needed for a feature using dependency maps
3. Request specific files from back_export.txt
4. Use business logic index to locate implementations
5. Follow established patterns when extending functionality

**Regeneration:**
Run this command at end of chat to update:
```
Analyze the attached back_export.txt following the Strategic Extraction Protocol and regenerate this living documentation.
```