# ToteTaxi Backend Living Documentation

## About Living Documentation for AI-Assisted Development

This living documentation serves as a **context-preservation system** for AI-assisted development, designed to maintain project continuity across conversations and development sessions. Unlike traditional project documentation that captures specifications and requirements, this documentation functions as **shared project memory** - preserving both operational reality and strategic vision to enable immediate technical discussions without context rebuilding.

### What Living Documentation Is

Living documentation is a comprehensive project map that bridges the gap between what exists and what needs building. It captures not just requirements or code comments, but the complete understanding of a system's architecture, business logic, implementation patterns, and development trajectory. For AI-assisted development, it serves as artificial project memory - allowing any AI to immediately understand a project as if it had been working on it from the beginning.

### Why It Exists

Complex software projects like ToteTaxi require maintaining intricate relationships between business requirements, technical architecture, and implementation details. In AI-assisted development, this context must be explicitly captured because AI cannot retain project understanding across sessions. This documentation eliminates the need to re-explain ToteTaxi's business complexity, technical decisions, and architectural patterns every time development work resumes.

### How It Functions (Dual Purpose)

**Current State Documentation (Operational Reality):**
- File-by-file breakdown of what actually exists and works
- Complete API endpoint mapping with authentication patterns
- Actual model relationships and business logic as implemented
- Working authentication flows and data patterns
- Clear distinction between functional, mocked, and stub code

**Future Development Roadmap (Strategic Vision):**
- Planned features and architectural integration points
- Implementation priorities and technical requirements
- Established patterns that new features should follow
- Business requirements not yet implemented
- Integration strategies for planned functionality

**Development Bridge (Continuity Patterns):**
- How to extend existing patterns consistently
- Where new functionality should be added
- Integration points between current and planned features
- Architectural decisions that affect future development
- Technical debt and enhancement opportunities

### How To Use This Documentation

Read this documentation to immediately understand the ToteTaxi backend as if you built it yourself. Use it to:
- Reference operational functionality and integration patterns
- Add features following established architectural patterns
- Understand where specific functionality should be implemented
- Grasp the context behind architectural and business logic decisions
- Bridge between what exists and what needs building next

### Evolution Pattern

This documentation evolves with the codebase, maintaining both operational accuracy and strategic vision. As features move from planned to implemented, the documentation shifts focus while preserving the reasoning and patterns that guide continued development.

---

# Backend File Directory Guide

**Purpose:** Smart file mapping for efficient development - tells you exactly which files to request for any development task.

## Core Development Tasks → Required Files

### **Adding New Service Types**
```
Need files:
├── apps/services/models.py → Service definitions, pricing models
├── apps/services/serializers.py → API response formatting
├── apps/bookings/models.py → Booking.calculate_pricing() method
├── apps/bookings/serializers.py → Booking creation/validation
└── apps/bookings/views.py → API endpoints for booking creation
```

### **Modifying Pricing Logic**
```
Need files:
├── apps/services/models.py → SurchargeRule, pricing calculation methods
├── apps/bookings/models.py → Booking.calculate_pricing(), organizing costs
├── apps/bookings/views.py → PricingPreviewView for real-time pricing
└── apps/services/admin.py → Admin interface for pricing management
```

### **Authentication & Customer Features**
```
Need files:
├── apps/customers/models.py → CustomerProfile, SavedAddress, PaymentMethod
├── apps/customers/views.py → Registration, login, profile management
├── apps/customers/serializers.py → User creation, profile updates
├── apps/customers/urls.py → Customer API routing
└── apps/customers/booking_views.py → Authenticated booking workflows
```

### **Staff Operations & Admin**
```
Need files:
├── apps/accounts/models.py → StaffProfile, StaffAction audit logging
├── apps/accounts/views.py → Staff authentication, dashboard KPIs
├── apps/accounts/serializers.py → Staff data formatting
└── apps/accounts/urls.py → Staff API routing
```

### **Payment Processing**
```
Need files:
├── apps/payments/models.py → Payment, Refund, PaymentAudit
├── apps/payments/views.py → Payment intent creation, webhooks
├── apps/payments/services.py → StripePaymentService (mock/real)
├── apps/payments/serializers.py → Payment data formatting
└── apps/payments/urls.py → Payment API routing
```

### **Booking Workflow & Status Management**
```
Need files:
├── apps/bookings/models.py → Booking lifecycle, status management
├── apps/bookings/views.py → Guest booking, status lookup
├── apps/bookings/serializers.py → Booking creation, validation
├── apps/bookings/urls.py → Public booking API routing
└── apps/bookings/admin.py → Staff booking management interface
```

### **Database & Configuration Changes**
```
Need files:
├── config/settings.py → Django configuration, database, CORS
├── config/urls.py → Main URL routing
├── requirements.txt → Dependencies
├── docker-compose.yml → Development environment
└── manage.py → Django management commands
```

## File Purpose Reference

### **apps/bookings/ - Central Booking Logic**
- `models.py` → Booking, Address, GuestCheckout models + pricing calculation
- `views.py` → Guest booking creation, status lookup, pricing preview
- `serializers.py` → Guest booking validation, pricing requests
- `urls.py` → Public API endpoints (/api/public/)
- `admin.py` → Staff booking management interface

### **apps/customers/ - Customer Management**
- `models.py` → CustomerProfile, SavedAddress, CustomerPaymentMethod
- `views.py` → Authentication, profile management, basic booking list
- `booking_views.py` → Enhanced authenticated booking workflows
- `booking_serializers.py` → Authenticated booking creation with saved data
- `serializers.py` → Customer registration, profile updates
- `urls.py` → Customer API endpoints (/api/customer/)

### **apps/services/ - Pricing Engine**
- `models.py` → All service definitions, pricing rules, organizing services
- `serializers.py` → Service catalog API responses
- `admin.py` → Service management interface with rich admin features
- `migrations/` → Service data and schema changes

### **apps/accounts/ - Staff Operations**
- `models.py` → StaffProfile, StaffAction audit logging
- `views.py` → Staff authentication, dashboard, booking management
- `serializers.py` → Staff data formatting
- `urls.py` → Staff API endpoints (/api/staff/)

### **apps/payments/ - Financial Operations**
- `models.py` → Payment, Refund, PaymentAudit models
- `views.py` → Payment intent creation, webhooks, mock confirmation
- `services.py` → StripePaymentService (mock implementation)
- `serializers.py` → Payment and refund data formatting
- `urls.py` → Payment API endpoints (/api/payments/)

### **config/ - Django Project Configuration**
- `settings.py` → Database, CORS, authentication, app configuration
- `urls.py` → Main URL routing to all apps
- `celery.py` → Background job configuration
- `wsgi.py` / `asgi.py` → Web server interfaces

### **Infrastructure Files**
- `requirements.txt` → Python dependencies
- `docker-compose.yml` → Development environment (PostgreSQL, Redis)
- `Dockerfile` → Container configuration
- `manage.py` → Django management commands

## Quick Task Reference

**"I want to..."** → **"Send me these files:"**

- **Add BLADE luggage service** → `apps/services/models.py`, `apps/bookings/models.py`
- **Build booking wizard frontend** → `apps/bookings/serializers.py`, `apps/bookings/views.py`
- **Add staff permissions** → `apps/accounts/models.py`, `apps/accounts/views.py`
- **Modify organizing services** → `apps/services/models.py`, `apps/services/admin.py`
- **Add geographic pricing** → `apps/services/models.py` (SurchargeRule)
- **Customer dashboard features** → `apps/customers/booking_views.py`, `apps/customers/models.py`
- **Payment integration** → `apps/payments/services.py`, `apps/payments/views.py`
- **Add API endpoints** → Relevant app's `views.py`, `urls.py`, `serializers.py`
- **Database changes** → Relevant app's `models.py`
- **Admin interface** → Relevant app's `admin.py`

This guide ensures efficient file requests - you tell me what you want to build, I know exactly which files contain the relevant logic and patterns.

---

# ToteTaxi Backend: Current State & Development Roadmap

**Strategic Technical Architecture - Django 5.2.5 + DRF 3.16.1 + PostgreSQL + Docker**

## System Architecture Overview

ToteTaxi is a luxury delivery service system built on Django with a sophisticated dual-customer architecture supporting both authenticated users and guest checkout. The system handles complex pricing calculations, staff operations, and financial workflows while maintaining clean separation between customer and staff concerns.

**Current Implementation Status:**
- **Fully Implemented:** Customer authentication, guest booking, pricing engine with organizing services, staff operations, payment processing (mocked)
- **Partially Implemented:** Admin dashboard views, basic audit logging
- **Stub Applications:** Logistics, documents, notifications, CRM (empty but structured)

**ToteTaxi Backend Ecosystem**
```
├── Core Business Logic (IMPLEMENTED)
│   ├── bookings/ → Complete booking lifecycle (guest + authenticated)
│   ├── services/ → Pricing engine with organizing services integration
│   └── customers/ → Customer profiles, addresses, payment methods
├── Staff Operations (IMPLEMENTED)
│   └── accounts/ → Staff profiles with comprehensive audit logging
├── Financial Operations (IMPLEMENTED - MOCKED)
│   └── payments/ → Payment processing, refunds, audit trails
├── Operational Management (STUB APPLICATIONS)
│   ├── logistics/ → Delivery coordination (empty)
│   ├── documents/ → File storage, COI management (empty)
│   └── notifications/ → Email communications (empty)
├── Administrative Interface (PARTIAL)
│   └── crm/ → Staff dashboard, reporting (views only)
└── Infrastructure Layer (CONFIGURED)
    ├── PostgreSQL Database (Port 5435)
    ├── Redis Cache & Queue (Port 6382)
    ├── Celery Background Jobs (configured)
    └── AWS Services (S3 storage, SES email - configured but unused)
```

## Complete ToteTaxi Service Catalog (IMPLEMENTED)

### 1. Mini Moves with Professional Organizing Integration

**Base Mini Move Packages:**
```python
# Implemented in MiniMovePackage model
- Petite: $995 (15 items <50 lbs, shared van)
- Standard: $1,725 (30 items <50 lbs, COI included, priority scheduling, shared van)  
- Full Move: $2,490 (Van exclusive, unlimited items)
```

**Professional Organizing Services (FULLY IMPLEMENTED):**
```python
# OrganizingService model with complete pricing structure
Packing Services (with supplies):
- Petite Packing: $1,400 (4 hours, 2 organizers, supplies up to $250)
- Standard Packing: $2,535 (8 hours, 2 organizers, supplies up to $250)
- Full Packing: $5,070 (8 hours, 4 organizers, supplies up to $500)

Unpacking Services (organizing only):
- Petite Unpacking: $1,130 (4 hours, 2 organizers, organizing only)
- Standard Unpacking: $2,265 (8 hours, 2 organizers, organizing only)
- Full Unpacking: $4,525 (8 hours, 4 organizers, organizing only)
```

**Geographic Pricing Rules (IMPLEMENTED in SurchargeRule):**
```python
# Base service area: Manhattan, Brooklyn → Hamptons
Geographic Surcharges:
- CT/NJ (up to 30 min outside Manhattan): +$220
- Amagansett/Montauk: +$120 extra
- Hamptons → Hamptons: $700 minimum (2 hours), then $350/hour
```

### 2. Standard Delivery Service (IMPLEMENTED)

**Standard Delivery Configuration:**
```python
# StandardDeliveryConfig model
- Price per item: $95 (confirmed final pricing)
- Minimum delivery: $285 (3 items minimum)
- Same-day delivery: $360 flat rate
- Item weight limit: 50 lbs per item
- COI: +$50 if requested
```

**Specialty Items (IMPLEMENTED):**
```python
# SpecialtyItem model
- Crib: $350
- Surfboard: $350  
- Peloton: $500
- Wardrobe Box: $275
# All require van scheduling and special handling
```

### 3. BLADE Luggage Delivery (BUSINESS REQUIREMENTS - NOT YET IMPLEMENTED)

**Service Definition:**
```python
# Planned service - requires new model implementation
- Manhattan ↔ JFK: $150 (2 bags), $75 each additional
- Manhattan ↔ Newark: $150 (2 bags), $75 each additional
- Expedited pickup: +$350
- COI: +$50 if requested
```

### 4. Mini Storage (BUSINESS REQUIREMENTS - NOT YET IMPLEMENTED)

**Service Definition:**
```python
# Planned service - requires new model implementation  
- Base rate: $150/month
- Pickup/delivery: Quote-based
- Integration with booking system needed
```

### 5. B2B/Pop-Up & Last-Mile Deliveries (BUSINESS REQUIREMENTS - NOT YET IMPLEMENTED)

**Service Definition:**
```python
# Planned service - requires custom quote system
- Custom quotes for brand activations
- Manual scheduling/admin approval required
- Integration with CRM for business customers
```

## Authentication Architecture (IMPLEMENTED)

**Django User Model + Profile Extension Strategy:**

The system uses Django's built-in User model extended through separate profile models, eliminating custom authentication complexity while maintaining sophisticated business logic separation.

**Authentication Foundation:**
```python
# All authentication builds on Django's User model
User (Django Built-in)
├── Standard authentication (username/password, email, permissions)
├── Built-in security, password handling, session management
├── Used by both customers and staff for login/logout
└── Extended through OneToOne profile relationships
```

**Customer Extensions (customers/ app):**
```python
# CustomerProfile extends User with business data
CustomerProfile (OneToOneField with User)
├── Customer-specific fields (phone, stripe_customer_id)
├── Booking statistics (total_bookings, total_spent_cents)
├── Customer preferences (pickup_time, notifications, VIP status)
└── Staff notes for customer service

# SavedAddress provides reusable addresses
SavedAddress (ForeignKey to User)
├── Customer's frequently used addresses
├── Usage tracking and smart suggestions
└── Delivery instructions and preferences

# CustomerPaymentMethod handles Stripe integration
CustomerPaymentMethod (ForeignKey to User)
├── Stripe payment method references
├── Card display information and default selection
└── PCI-compliant payment method management
```

**Staff Extensions (accounts/ app):**
```python
# StaffProfile extends User for staff operations
StaffProfile (OneToOneField with User)
├── Role differentiation (staff vs admin)
├── Department, hire date, contact information
├── Account security (login attempts, account locking)
└── Permission methods for role-based access

# StaffAction provides complete audit logging
StaffAction (ForeignKey to User)
├── Complete audit logging for compliance
├── Action tracking with IP address and context
├── Customer and booking relationship tracking
└── Financial operation audit trails
```

**Authentication Flow Patterns:**
- **Customer Registration:** Creates User + CustomerProfile automatically
- **Staff Authentication:** Uses username/password with StaffProfile role checking
- **Session Management:** Standard Django session handling with CSRF protection
- **Permission Checking:** Profile-based permissions (staff.can_approve_refunds)

## Core Application Analysis

### apps/bookings/ - System Heart (FULLY IMPLEMENTED)

**Purpose:** Central booking entity managing complete lifecycle from inquiry to completion, including organizing services integration.

**Key Models:**
- **Booking:** UUID primary key, TT-XXXXXX numbering, supports both customer and guest_checkout, includes organizing services fields
- **Address:** Reusable addresses with customer linking
- **GuestCheckout:** Temporary customer data for non-authenticated bookings

**Business Logic Implementation:**
```python
# Dual-mode customer handling
booking.customer  # ForeignKey to User (authenticated)
booking.guest_checkout  # OneToOne to GuestCheckout (guest)
# Constraint ensures exactly one customer type

# Organizing services integration (NEW)
booking.include_packing  # BooleanField for packing service
booking.include_unpacking  # BooleanField for unpacking service
booking.organizing_total_cents  # Calculated organizing service costs

# Automatic pricing calculation with organizing services
def save(self):
    self.calculate_pricing()  # Uses services app pricing engine + organizing
    super().save()

def calculate_organizing_costs(self):
    # Calculates packing/unpacking costs based on Mini Move tier
    total_organizing_cents = 0
    tier = self.mini_move_package.package_type
    
    if self.include_packing:
        packing_service = OrganizingService.objects.get(
            mini_move_tier=tier,
            is_packing_service=True,
            is_active=True
        )
        total_organizing_cents += packing_service.price_cents
    
    if self.include_unpacking:
        unpacking_service = OrganizingService.objects.get(
            mini_move_tier=tier,
            is_packing_service=False,
            is_active=True
        )
        total_organizing_cents += unpacking_service.price_cents
    
    return total_organizing_cents

# Service integration
booking.mini_move_package  # ForeignKey to MiniMovePackage
booking.specialty_items  # ManyToMany to SpecialtyItem
```

**API Endpoints (Implemented):**
- `GET /api/public/services/` - Service catalog with organizing services (no auth)
- `POST /api/public/pricing-preview/` - Real-time pricing including organizing (no auth)
- `GET /api/public/availability/` - Calendar availability with surcharges (no auth)
- `POST /api/public/guest-booking/` - Guest booking creation with organizing services (no auth)
- `GET /api/public/booking-status/<booking_number>/` - Status lookup (no auth)
- `GET /api/public/services/mini-moves-with-organizing/` - Mini Move packages with organizing options (no auth)
- `GET /api/public/services/organizing-by-tier/` - Organizing services grouped by tier (no auth)
- `GET /api/public/services/organizing/<uuid:service_id>/` - Organizing service details (no auth)

**Integration Points:**
- → services/: Pricing calculation integration including organizing services
- → payments/: Payment intent creation trigger
- ← accounts/: Staff booking management
- ↔ customers/: Authenticated booking creation

**Current Limitations:**
- No automatic guest-to-customer account linking implemented
- COI file association not connected to documents app
- BLADE, Mini Storage, B2B services not yet implemented

### apps/customers/ - Customer Data Management (FULLY IMPLEMENTED)

**Purpose:** Customer-specific data extensions and business logic for Django User model.

**Key Models:**
```python
# Profile extending Django User
CustomerProfile(models.Model):
    user = OneToOneField(User, related_name='customer_profile')
    phone, stripe_customer_id, total_bookings, total_spent_cents
    preferred_pickup_time, email_notifications, is_vip
    
# Reusable addresses with usage tracking
SavedAddress(models.Model):
    user = ForeignKey(User, related_name='saved_addresses')
    nickname, address_line_1, city, state, zip_code
    times_used, last_used_at, is_active
    
# Payment method references (Stripe integration ready)
CustomerPaymentMethod(models.Model):
    user = ForeignKey(User, related_name='payment_methods')
    stripe_payment_method_id, card_brand, card_last_four
    is_default, is_active
```

**API Endpoints (Implemented):**
- `POST /api/customer/auth/register/` - Customer registration
- `POST /api/customer/auth/login/` - Customer authentication  
- `POST /api/customer/auth/logout/` - Customer logout
- `GET /api/customer/auth/user/` - Current user info
- `GET,PUT /api/customer/profile/` - Profile management
- `GET,POST /api/customer/addresses/` - Address book management
- `GET,PUT,DELETE /api/customer/addresses/<id>/` - Address CRUD
- `GET /api/customer/bookings/` - Booking history
- `POST /api/customer/bookings/create/` - Authenticated booking creation with organizing services
- `GET /api/customer/dashboard/` - Account overview

**Authentication Patterns:**
```python
# Email-based customer login (email stored as username)
user = authenticate(username=email, password=password)

# Profile access patterns
user.customer_profile  # OneToOne relationship
user.saved_addresses.all()  # ForeignKey reverse lookup
user.bookings.all()  # Booking ForeignKey reverse lookup
```

**Enhanced Booking Features:**
- Pre-filled addresses from saved addresses
- Payment method selection from saved cards
- Quick rebooking from previous orders
- Booking preferences (pickup time, notifications)
- Organizing services selection for authenticated users

### apps/accounts/ - Staff Operations (FULLY IMPLEMENTED)

**Purpose:** Staff authentication, role-based permissions, and comprehensive audit logging.

**Key Models:**
```python
# Staff profile with role-based permissions
StaffProfile(models.Model):
    user = OneToOneField(User, related_name='staff_profile')
    role = CharField(choices=[('staff', 'Staff'), ('admin', 'Admin')])
    department, hire_date, phone
    login_attempts, account_locked_until
    
    @property
    def can_approve_refunds(self):
        return self.role == 'admin'

# Comprehensive audit logging
StaffAction(models.Model):
    staff_user = ForeignKey(User, related_name='staff_actions')
    action_type = CharField(choices=[...])  # login, view_customer, etc.
    description, ip_address, user_agent
    customer_id, booking_id  # Related object tracking
```

**API Endpoints (Implemented):**
- `POST /api/staff/auth/login/` - Staff authentication with profile checking
- `POST /api/staff/auth/logout/` - Staff logout with action logging
- `GET /api/staff/dashboard/` - KPI dashboard with booking statistics
- `GET /api/staff/bookings/` - Booking management with filters
- `GET,PATCH /api/staff/bookings/<id>/` - Booking detail and status updates

**Security Features:**
- Account locking after 5 failed login attempts
- IP address and user agent tracking
- Comprehensive action logging for compliance
- Role-based permission checking

**Staff Dashboard Implementation:**
```python
# Real-time business metrics
booking_stats = {
    'total_bookings': Booking.objects.filter(deleted_at__isnull=True).count(),
    'pending_bookings': Booking.objects.filter(status='pending').count(),
    # ... additional KPIs
}

# Permission-based UI data
permissions = {
    'can_approve_refunds': staff_profile.can_approve_refunds,
    'can_manage_staff': staff_profile.can_manage_staff,
    'can_view_financial_reports': staff_profile.can_view_financial_reports
}
```

### apps/services/ - Pricing Engine with Organizing Services (FULLY IMPLEMENTED)

**Purpose:** Complex multi-factor pricing calculations, service definitions, and organizing services integration.

**Key Models:**
```python
# Mini Move packages from business requirements
MiniMovePackage(models.Model):
    package_type = CharField(choices=[('petite', 'Petite'), ('standard', 'Standard'), ('full', 'Full')])
    base_price_cents, max_items, coi_included, coi_fee_cents
    priority_scheduling, protective_wrapping, is_most_popular

# NEW: Professional Organizing Services (FULLY IMPLEMENTED)
OrganizingService(models.Model):
    service_type = CharField(choices=[
        ('petite_packing', 'Petite Packing'),
        ('standard_packing', 'Standard Packing'),
        ('full_packing', 'Full Packing'),
        ('petite_unpacking', 'Petite Unpacking'),
        ('standard_unpacking', 'Standard Unpacking'),
        ('full_unpacking', 'Full Unpacking'),
    ])
    mini_move_tier = CharField(choices=[('petite', 'Petite'), ('standard', 'Standard'), ('full', 'Full')])
    price_cents, duration_hours, organizer_count
    supplies_allowance_cents  # For packing services only
    is_packing_service  # True for packing, False for unpacking

# Standard delivery configuration  
StandardDeliveryConfig(models.Model):
    price_per_item_cents = 9500  # $95 (confirmed)
    minimum_charge_cents = 28500  # $285
    same_day_flat_rate_cents = 36000  # $360

# Specialty items with van scheduling requirements
SpecialtyItem(models.Model):
    item_type = CharField(choices=[('peloton', 'Peloton'), ('surfboard', 'Surfboard'), ('crib', 'Crib'), ('wardrobe_box', 'Wardrobe Box')])
    price_cents, requires_van_schedule, special_handling

# Dynamic surcharge rules including geographic pricing
SurchargeRule(models.Model):
    surcharge_type = CharField(choices=[('weekend', 'Weekend'), ('holiday', 'Holiday'), ('geographic', 'Geographic'), ('peak_date', 'Peak Date')])
    calculation_type = CharField(choices=[('percentage', 'Percentage'), ('fixed_amount', 'Fixed')])
    percentage, fixed_amount_cents, specific_date
    applies_saturday, applies_sunday
```

**Pricing Integration with Organizing Services:**
```python
# Enhanced pricing calculation in Booking.save()
def calculate_pricing(self):
    # Service-specific base pricing
    if self.service_type == 'mini_move':
        self.base_price_cents = self.mini_move_package.base_price_cents
        
        # Calculate organizing services
        self.organizing_total_cents = self.calculate_organizing_costs()
        
    elif self.service_type == 'standard_delivery':
        config = StandardDeliveryConfig.objects.filter(is_active=True).first()
        self.base_price_cents = config.calculate_total(
            self.standard_delivery_item_count,
            is_same_day=self.is_same_day_delivery
        )
    
    # Dynamic surcharge calculation (including geographic)
    for surcharge in SurchargeRule.objects.filter(is_active=True):
        self.surcharge_cents += surcharge.calculate_surcharge(
            self.base_price_cents, 
            self.pickup_date
        )
    
    # Total includes organizing services
    self.total_price_cents = (
        self.base_price_cents + 
        self.surcharge_cents + 
        self.coi_fee_cents + 
        self.organizing_total_cents
    )
```

**API Integration:** 
- Pricing accessed through booking endpoints with organizing services
- Dedicated organizing service endpoints for frontend consumption
- Service catalog includes organizing options

### apps/payments/ - Financial Operations (IMPLEMENTED - MOCKED)

**Purpose:** Payment processing, refund workflows, and financial audit trails.

**Key Models:**
```python
# Payment records linked to bookings and customers
Payment(models.Model):
    booking = ForeignKey(Booking, related_name='payments')
    customer = ForeignKey(User, related_name='payments', null=True)
    amount_cents, stripe_payment_intent_id, stripe_charge_id
    status = CharField(choices=[('pending', 'Pending'), ('succeeded', 'Succeeded'), ...])

# Refund workflow with approval process
Refund(models.Model):
    payment = ForeignKey(Payment, related_name='refunds')
    amount_cents, reason
    requested_by = ForeignKey(User, related_name='requested_refunds')
    approved_by = ForeignKey(User, related_name='approved_refunds', null=True)
    status = CharField(choices=[('requested', 'Requested'), ('approved', 'Approved'), ...])

# Financial audit logging
PaymentAudit(models.Model):
    action = CharField(choices=[('payment_created', 'Payment Created'), ...])
    payment, refund, user, description
```

**API Endpoints (Implemented):**
- `POST /api/payments/create-intent/` - Create Stripe PaymentIntent (no auth)
- `GET /api/payments/status/<booking_number>/` - Payment status lookup (no auth)
- `POST /api/payments/webhook/` - Stripe webhook handler (no auth)
- `POST /api/payments/mock-confirm/` - Mock payment confirmation for testing (no auth)

**Mock Implementation Details:**
```python
# Mock Stripe service for development
class StripePaymentService:
    @staticmethod
    def create_payment_intent(booking, customer_email=None):
        mock_intent = {
            'id': f'pi_mock_{booking.id.hex[:16]}',
            'client_secret': f'pi_mock_{booking.id.hex[:16]}_secret_mock',
            'amount': int(booking.total_price_cents),  # Includes organizing services
            'status': 'requires_payment_method'
        }
        # Creates Payment record with mock data
```

**Refund Workflow:**
- Staff can request refunds
- Admin role required for approval
- Complete audit trail maintained
- Integration ready for real Stripe implementation

### Stub Applications (STRUCTURE ONLY)

**apps/logistics/ - Delivery Coordination (EMPTY)**
- Models: Empty models.py
- Purpose: Driver management, delivery tracking, route optimization
- Integration Points: Links to bookings for delivery tasks

**apps/documents/ - File Management (EMPTY)**
- Models: Empty models.py  
- Purpose: COI file storage, document lifecycle management
- Integration Points: COI files associated with bookings

**apps/notifications/ - Communication Hub (EMPTY)**
- Models: Empty models.py
- Purpose: Email templates, SMS notifications, customer communications
- Integration Points: Booking status updates, customer notifications

**apps/crm/ - Administrative Interface (EMPTY)**
- Models: Empty models.py
- Purpose: Advanced staff dashboard, reporting, business intelligence
- Integration Points: Aggregated data from all applications

## API Architecture (COMPREHENSIVE MAPPING)

**Public APIs (No Authentication Required):**
```
/api/public/
├── services/ [GET] → Complete service catalog with organizing services
├── pricing-preview/ [POST] → Real-time pricing calculations including organizing
├── availability/ [GET] → Calendar availability with surcharges
├── guest-booking/ [POST] → Guest checkout booking creation with organizing
├── booking-status/<booking_number>/ [GET] → Status lookup
├── services/mini-moves-with-organizing/ [GET] → Mini Move packages with organizing options
├── services/organizing-by-tier/ [GET] → Organizing services grouped by tier
└── services/organizing/<uuid:service_id>/ [GET] → Organizing service details

/api/payments/
├── create-intent/ [POST] → Stripe PaymentIntent creation
├── status/<booking_number>/ [GET] → Payment status lookup
├── webhook/ [POST] → Stripe webhook handler
└── mock-confirm/ [POST] → Mock payment confirmation (testing)
```

**Customer APIs (Django User Session Authentication):**
```
/api/customer/
├── csrf-token/ [GET] → CSRF token for authenticated requests
├── auth/
│   ├── register/ [POST] → Customer account creation
│   ├── login/ [POST] → Email/password authentication
│   ├── logout/ [POST] → Session termination
│   └── user/ [GET] → Current user information
├── profile/ [GET, PUT] → CustomerProfile management
├── addresses/
│   ├── [GET, POST] → SavedAddress list and creation
│   └── <uuid:pk>/ [GET, PUT, DELETE] → SavedAddress CRUD
├── dashboard/ [GET] → Account overview with statistics
├── preferences/ [GET] → Booking preferences and defaults
└── bookings/
    ├── [GET] → Booking history with filtering
    ├── create/ [POST] → Authenticated booking creation with organizing services
    ├── <uuid:booking_id>/ [GET] → Booking detail view
    └── <uuid:booking_id>/rebook/ [POST] → Quick rebooking
```

**Staff APIs (Django User + StaffProfile Authentication):**
```
/api/staff/
├── auth/
│   ├── login/ [POST] → Username/password staff authentication
│   └── logout/ [POST] → Staff logout with action logging
├── dashboard/ [GET] → Business KPIs and urgent bookings
├── bookings/
│   ├── [GET] → All bookings with search and filters
│   └── <uuid:booking_id>/ [GET, PATCH] → Booking management
└── (Additional staff endpoints planned)
```

**Authentication Patterns:**
- **Session-based authentication** for all authenticated endpoints
- **CSRF protection** enabled for all state-changing operations
- **Rate limiting** configured on authentication and creation endpoints
- **Permission checking** via profile models (CustomerProfile, StaffProfile)

## Data Flow Patterns

**Guest Booking Flow with Organizing Services:**
```
1. Service Selection → /api/public/services/                
2. Organizing Options → /api/public/services/mini-moves-with-organizing/
3. Pricing Preview → /api/public/pricing-preview/ (includes organizing costs)
4. Booking Creation → /api/public/guest-booking/
   ├── Creates GuestCheckout record
   ├── Creates Address records
   ├── Creates Booking with organizing service flags and pricing calculation
5. Payment Processing → /api/payments/create-intent/ (total includes organizing)
6. Status Tracking → /api/public/booking-status/
```

**Authenticated Customer Booking Flow:**
```
1. Authentication → /api/customer/auth/login/
2. Dashboard Access → /api/customer/dashboard/
3. Enhanced Booking → /api/customer/bookings/create/
   ├── Uses SavedAddress records
   ├── Links to User via customer ForeignKey
   ├── Pre-fills from CustomerProfile preferences
   ├── Includes organizing service selection
4. Payment Processing → Enhanced with saved payment methods
5. Booking History → /api/customer/bookings/
```

**Staff Operations Flow:**
```
1. Staff Authentication → /api/staff/auth/login/
   ├── Validates StaffProfile exists
   ├── Checks account lock status
   ├── Logs login action
2. Dashboard Access → /api/staff/dashboard/
   ├── Real-time business metrics
   ├── Permission-based data
3. Booking Management → /api/staff/bookings/
   ├── Search and filter capabilities
   ├── Status update functionality
   ├── Complete audit logging
   ├── View organizing service details
```

## Development Roadmap & Integration Points

### Immediate Development Priorities

**1. Frontend Booking Wizard Integration**
- Build guest booking wizard with organizing service selection
- Implement real-time pricing preview with organizing costs
- Integrate Mini Move tier selection with organizing options
- Develop step-by-step wizard with organizing service explanations

**2. Additional Service Types Implementation**
- Implement BLADE Luggage Delivery service model and pricing
- Build Mini Storage service with monthly billing
- Create B2B/Pop-Up service with custom quote system
- Add geographic pricing integration for all service types

**3. COI File Management Integration**
- Implement document models in apps/documents/
- Connect COI requirements to booking workflow
- S3 storage integration for file uploads
- Staff interface for COI validation

**4. Real Payment Processing**
- Replace mock Stripe service with real integration
- Implement webhook signature verification
- Enhanced error handling and retry logic
- Customer payment method management

**5. Logistics Workflow**
- Driver assignment and tracking models
- Delivery status updates
- Integration with booking lifecycle
- Customer tracking interface

### Architectural Extension Patterns

**Adding New Service Types:**
```python
# 1. Add to services/models.py
class BladeLuggageService(models.Model):
    # BLADE-specific fields
    
class MiniStorageService(models.Model):
    # Storage-specific fields
    
# 2. Update Booking model choices
SERVICE_TYPE_CHOICES = [
    ('mini_move', 'Mini Move'),
    ('standard_delivery', 'Standard Delivery'), 
    ('specialty_item', 'Specialty Item'),
    ('blade_luggage', 'BLADE Luggage'),  # Add new services
    ('mini_storage', 'Mini Storage'),
    ('b2b_popup', 'B2B Pop-Up'),
]

# 3. Update calculate_pricing() method
def calculate_pricing(self):
    if self.service_type == 'blade_luggage':
        # BLADE luggage pricing logic
    elif self.service_type == 'mini_storage':
        # Storage pricing logic
```

**Organizing Services Extensions:**
```python
# Add additional organizing service tiers or types
class OrganizingServiceAddon(models.Model):
    organizing_service = ForeignKey(OrganizingService)
    addon_type = CharField(choices=[('extra_supplies', 'Extra Supplies'), ...])
    additional_cost_cents = PositiveBigIntegerField()
    
# Booking model integration
booking.organizing_addons = ManyToManyField(OrganizingServiceAddon)
```

**Geographic Pricing Extensions:**
```python
# Enhanced geographic rules
class GeographicZone(models.Model):
    zone_name = CharField(max_length=100)
    zip_codes = ArrayField(CharField(max_length=10))
    surcharge_cents = PositiveBigIntegerField()
    
class DistanceBasedPricing(models.Model):
    max_distance_miles = PositiveIntegerField()
    price_per_mile_cents = PositiveBigIntegerField()
```

**Adding Staff Permissions:**
```python
# 1. Update StaffProfile model
@property
def can_approve_organizing_addons(self):
    return self.role in ['admin', 'supervisor']

# 2. Use in views
if request.user.staff_profile.can_approve_organizing_addons:
    # Allow organizing service modifications
    
# 3. Log action
StaffAction.log_action(
    staff_user=request.user,
    action_type='modify_organizing_services',
    description='Modified organizing services for booking',
    request=request
)
```

**Customer Profile Extensions:**
```python
# Enhanced customer preferences
class CustomerPreferences(models.Model):
    user = models.OneToOneField(User, related_name='preferences')
    preferred_organizing_services = models.BooleanField(default=False)
    organizing_service_notes = models.TextField(blank=True)
    # Additional preference fields
    
# Access pattern
user.customer_profile  # Existing profile
user.preferences  # New extension
```

### Integration Points Ready for Development

**Frontend Booking Wizard:**
- Service selection step with organizing options
- Real-time pricing display including organizing costs
- Organizing service explanation and upselling
- Integration with existing API endpoints

**Notification System:**
- Booking status change triggers ready in booking model
- Customer communication preferences in CustomerProfile
- Staff action logging ready for notification triggers
- Email template system architecture planned
- Organizing service booking confirmations

**Advanced CRM Features:**
- Customer analytics data available via CustomerProfile
- Booking trend analysis via services integration
- Financial reporting via payments integration including organizing revenue
- Staff productivity metrics via StaffAction logging
- Organizing service performance metrics

**Mobile API Extensions:**
- Existing API endpoints mobile-ready
- Authentication patterns support mobile sessions
- Real-time booking status ready for push notifications
- Offline-first booking creation patterns planned
- Organizing service mobile interface

### Technical Debt & Enhancement Opportunities

**Performance Optimizations:**
- Database query optimization for large datasets
- Caching strategy for pricing calculations including organizing services
- Background job processing for heavy operations
- API response pagination and filtering

**Security Enhancements:**
- Rate limiting on all endpoints
- Enhanced audit logging for sensitive operations
- API key authentication for mobile applications
- Advanced permission granularity

**Business Logic Extensions:**
- Dynamic pricing based on demand for organizing services
- Advanced surcharge rules (time-based, route-based)
- Customer loyalty program integration
- Multi-language support preparation
- Organizing service capacity management

**Frontend Development Requirements:**
- Guest booking wizard with organizing service integration
- Real-time pricing preview component
- Service explanation and upselling interface
- Authentication flows for customer accounts
- Staff dashboard for organizing service management

This living documentation provides both complete operational understanding and clear development direction, enabling immediate productive development while maintaining architectural consistency and business logic integrity. The organizing services integration is fully implemented and ready for frontend integration.