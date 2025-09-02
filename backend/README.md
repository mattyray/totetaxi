
---

# ToteTaxi Living Documentation

## About This Documentation

This living documentation serves as a **context-preservation system** for AI-assisted development, designed to maintain project continuity across conversations and development sessions. Unlike traditional project documentation that captures specifications and requirements, this documentation functions as **shared project memory** - preserving architectural decisions, business logic reasoning, and integration patterns that enable immediate technical discussions without context rebuilding.

## Documentation Philosophy

**Why Living Documentation for AI Development:**
Complex software projects require maintaining intricate relationships between business requirements, technical architecture, and implementation details. In AI-assisted development, this context must be explicitly captured because AI cannot retain project understanding across sessions. This documentation eliminates the need to re-explain ToteTaxi's business complexity, technical decisions, and architectural patterns every time development work resumes.

**Evolution Pattern:**
- **Phase 1 (Current):** Strategic architecture and business requirements focused
- **Phase 2 (Development):** Comprehensive file-by-file documentation with component interactions
- **Phase 3 (Maintenance):** Complete system mapping with frontend-backend integration patterns

**Project Context:**
ToteTaxi is a luxury delivery service replacement system with significant business and technical complexity: multiple service types (Mini Moves, Standard Delivery, Specialty Items), sophisticated pricing engines with surcharges, Django User model with profile-based customer/staff separation, payment processing integration, and operational management workflows. This complexity requires detailed documentation to maintain development consistency and architectural integrity.

**Usage Guidelines:**
This documentation enables immediate technical conversations by providing complete project context. It captures not just what to build, but why architectural decisions were made, how business logic should function, and how components integrate. As the codebase grows, this documentation evolves from strategic overview to comprehensive implementation guide, always serving as the definitive source for project understanding and development coordination.

---

# ToteTaxi Backend Living Documentation & Roadmap

**Strategic Technical Architecture - Django 5.2.5 + DRF 3.16.1 + PostgreSQL + Docker**

## System Architecture Overview

**ToteTaxi Backend Ecosystem**
```
├── Core Business Logic
│   ├── bookings/ → Heart of system, manages all booking lifecycle (guest + authenticated)
│   ├── services/ → Pricing engine, availability logic, business rules
│   └── customers/ → Customer profiles, addresses, payment methods (User model extensions)
├── Staff Operations
│   └── accounts/ → Staff profiles, audit logging (User model extensions)
├── Financial Operations
│   └── payments/ → Payment processing, refunds, financial audit trails
├── Operational Management  
│   ├── logistics/ → Delivery coordination, tracking, driver management
│   ├── documents/ → File storage, COI management, document lifecycle
│   └── notifications/ → Email communications, template management
├── Administrative Interface
│   └── crm/ → Staff dashboard, reporting, administrative actions
└── Infrastructure Layer
    ├── PostgreSQL Database (Port 5435)
    ├── Redis Cache & Queue (Port 6382)
    ├── Celery Background Jobs
    └── AWS Services (S3 Storage, SES Email)
```

**Frontend Integration Points:**
- Customer Booking Flow: React app → customers + bookings + services + payments APIs  
- Customer Dashboard: React customer portal → customers + bookings APIs
- Admin Dashboard: React admin → accounts + crm + all app APIs for management
- Public APIs: Pricing and guest checkout → services + bookings APIs
- Real-time Updates: WebSocket connections for live booking status

## Authentication Architecture

**Django User Model + Profile Extension Strategy (Simplified & Secure):**

**Unified Authentication Foundation:**
```
Django User Model (Base Authentication)
├── Standard Django authentication (username/password, email, permissions)
├── Built-in security, password handling, session management
├── Used by both customers and staff for login/logout
└── Extended through separate profile models
```

**Customer Extensions (customers/ app):**
```
CustomerProfile (OneToOneField with User)
├── Customer-specific fields (phone, stripe_customer_id)
├── Booking statistics (total_bookings, total_spent_cents)
├── Customer preferences (pickup_time, notifications, VIP status)
└── Staff notes for customer service

SavedAddress (ForeignKey to User)
├── Customer's frequently used addresses (home, Hamptons, etc.)
├── Usage tracking and smart suggestions
└── Delivery instructions and preferences

CustomerPaymentMethod (ForeignKey to User)
├── Stripe integration for saved payment methods
├── Card display information and default selection
└── PCI-compliant payment method management
```

**Staff Extensions (accounts/ app):**
```
StaffProfile (OneToOneField with User)  
├── Staff role differentiation (staff vs admin)
├── Department, hire date, contact information
├── Account security (login attempts, account locking)
└── Permission methods for role-based access

StaffAction (ForeignKey to User)
├── Complete audit logging for compliance
├── Action tracking with IP address and context
├── Customer and booking relationship tracking
└── Financial operation audit trails
```

**Security Benefits:**
- Leverages Django's battle-tested authentication system
- No custom authentication vulnerabilities or edge cases
- Standard Django admin integration for staff management
- Profile-based separation maintains clean boundaries
- Audit logging ensures compliance and accountability

## Core Business Applications

**📋 apps/bookings/ - System Heart & Data Hub**

**Primary Responsibility:** Central booking entity that every other system component revolves around

**Business Logic Ownership:**
- Complete booking lifecycle from inquiry to completion
- Dual-mode operation: Works with guest checkout AND authenticated customers (Django Users)
- Address standardization and reuse for logged-in customers
- Booking status orchestration across all systems
- Business rule enforcement and validation
- Guest-to-customer account linking workflow

**Core Data Entities:**
- **Booking:** UUID primary key, TT-001234 numbering, soft deletes, status tracking
- **Address:** Reusable addresses with pickup/delivery associations (linked to Django Users)
- **GuestCheckout:** Temporary customer data for non-authenticated bookings with automatic linking capability

**Updated Model Relationships:**
```python
# Booking model links to Django User for authenticated customers
customer = models.ForeignKey(
    User,  # Django's built-in User model
    on_delete=models.CASCADE,
    null=True, blank=True,
    related_name='bookings'
)

# Address model can be associated with Django User
customer = models.ForeignKey(
    User,
    on_delete=models.CASCADE, 
    null=True, blank=True,
    related_name='booking_addresses'
)
```

**Guest-to-Customer Account Linking:**
When customer creates Django User account with email matching existing guest bookings, automatically link booking history to new user account with confirmation message.

**Frontend Integration Needs:**
- Guest Booking APIs: Create booking with customer info provided
- Authenticated Booking APIs: Create booking using Django User + CustomerProfile data
- Booking History APIs: Customer dashboard booking list via user.bookings relationship
- Status Tracking APIs: Live booking status for customer tracking page
- Pricing Preview APIs: Real-time pricing as customer makes selections

**Key External Relationships:**
- → services/: Gets pricing calculations and availability data
- → payments/: Triggers payment processing workflows
- → logistics/: Initiates delivery task creation
- → documents/: Associates COI files with bookings (workflow TBD - client discussion)
- → notifications/: Triggers confirmation and status emails
- ← crm/: Receives admin status updates and modifications
- ↔ customers/: Links to Django User with CustomerProfile for authenticated bookings

---

**👤 apps/customers/ - Customer Profile & Data Management**

**Primary Responsibility:** Customer-specific data extensions and business logic for Django User model

**Simplified Authentication Integration:**
- **No custom authentication** - uses Django's User model directly
- **Profile extension pattern** - CustomerProfile extends User with business data
- **Email-based customer experience** - customers use email as username
- **Session-based authentication** - standard Django authentication patterns

**Business Logic Ownership:**
- Customer profile management and preferences
- Saved addresses and payment methods integration
- Booking history and status tracking for customers
- Guest checkout to customer account conversion
- Customer business metrics and VIP management

**Core Data Entities:**
- **CustomerProfile:** OneToOneField with User, customer-specific business data
- **SavedAddress:** ForeignKey to User, customer's frequently used addresses
- **CustomerPaymentMethod:** ForeignKey to User, Stripe integration for saved cards

**Model Integration Patterns:**
```python
# Access customer data through User model
user = User.objects.get(email="customer@example.com")
customer_profile = user.customer_profile
saved_addresses = user.saved_addresses.all()
payment_methods = user.payment_methods.filter(is_active=True)
bookings = user.bookings.all()
```

**Frontend Integration Needs:**
- Authentication APIs: Django User registration, login, logout, password reset
- Profile Management APIs: CustomerProfile CRUD operations
- Address Book APIs: SavedAddress CRUD operations
- Payment Methods APIs: CustomerPaymentMethod + Stripe integration
- Dashboard APIs: User booking history, account overview, notifications

**Key External Relationships:**
- ↔ Django User: Core authentication and identity
- ↔ bookings/: Customer bookings linked via User foreign key
- → payments/: Stripe customer management for saved payment methods
- ← notifications/: Customer communication preferences and history
- ← accounts/: Staff can view customer profiles via User relationships

---

**🔐 apps/accounts/ - Staff Profile & Operations Management**

**Primary Responsibility:** Staff-specific data extensions and audit logging for Django User model

**Staff Authentication Architecture:**
- **Django User model foundation** - standard username/password authentication
- **StaffProfile extension** - additional staff-specific fields and permissions
- **Role-based permissions** - admin vs staff differentiation within staff system
- **Comprehensive audit logging** - complete action tracking for compliance

**Business Logic Ownership:**
- Staff user profile management and role-based permissions
- Comprehensive audit logging for all administrative actions
- Account security features (login attempts, account locking)
- Staff action tracking with complete context information

**Core Data Entities:**
- **StaffProfile:** OneToOneField with User, staff-specific fields and permissions
- **StaffAction:** ForeignKey to User, comprehensive audit logging with context

**Model Integration Patterns:**
```python
# Access staff data through User model
user = User.objects.get(username="staff_member")
staff_profile = user.staff_profile
can_approve_refunds = staff_profile.can_approve_refunds
recent_actions = user.staff_actions.recent()
```

**Permission Architecture:**
- **Admin Role:** Full system access, refund processing, user management, customer account management
- **Staff Role:** Booking management, customer service, operational tasks
- **Audit Trail:** Complete logging of all staff actions with user attribution

**Frontend Integration Needs:**
- Staff Authentication: Django User login/logout for staff dashboard
- User Context: Staff user info, permissions, role-based UI components
- Session Management: Standard Django session handling
- Audit Interface: Staff action logging and review capabilities

**Key External Relationships:**
- ↔ Django User: Core staff authentication and identity
- → crm/: Provides user context for all administrative actions
- → ALL APPS: Staff can access all system components via proper permissions
- ← customers/: Staff can view customer profiles for support via User relationships

---

**💰 apps/services/ - Pricing & Availability Engine**

**Primary Responsibility:** All pricing logic, service definitions, and availability management

**Business Logic Ownership:**
- Complex multi-factor pricing calculations
- Service catalog management (Mini Moves, Standard Delivery, Specialty Items)
- Dynamic surcharge application (weekend, holiday, peak season)
- Van availability scheduling and capacity management
- Business constraint validation before booking creation

**Core Data Entities:**
- **MiniMovePackage:** Petite ($995), Standard ($1725), Full ($2490) with item limits and COI handling
- **StandardDeliveryConfig:** $95 per item, $285 minimum, $360 same-day pricing configuration
- **SpecialtyItem:** Peloton ($500), Surfboard ($350), Crib ($350), Wardrobe Box ($275)
- **SurchargeRule:** Weekend, holiday, peak date pricing modifications with date-based logic
- **VanSchedule:** Daily availability, capacity overrides, specialty item constraints

**Integration with Booking System:**
```python
# Services models integrate seamlessly with User-based booking system
booking.calculate_pricing()  # Uses services pricing engine
booking.mini_move_package    # References MiniMovePackage
booking.specialty_items      # ManyToMany with SpecialtyItem
```

**Frontend Integration Needs:**
- Service Selection: Available packages and specialty items with descriptions
- Calendar Availability: Which dates available for different service types
- Real-time Pricing: Dynamic price updates as customer modifies booking
- Surcharge Display: Clear breakdown of additional fees and reasons

---

**💳 apps/payments/ - Financial Operations Hub**

**Primary Responsibility:** All money-related operations, audit trails, and financial integrity

**Updated Model Relationships:**
```python
# Payment model links to Django User for customer payments
customer = models.ForeignKey(
    User,  # Django User instead of settings.AUTH_USER_MODEL
    on_delete=models.SET_NULL,
    null=True, blank=True,
    related_name='payments'
)

# Refund model uses Django User for staff approval workflow
requested_by = models.ForeignKey(User, ...)  # Staff user requesting refund
approved_by = models.ForeignKey(User, ...)   # Admin user approving refund
```

**Business Logic Ownership:**
- Payment processing lifecycle management
- Customer payment methods: Stripe customer management via User.payment_methods
- Refund processing with approval workflows using User-based staff permissions
- Financial audit trails for all money movements with User attribution
- Integration with payment processors (Stripe)
- Payment failure handling and retry logic

**Core Data Entities:**
- **Payment:** Links to booking, tracks amount, status, external payment IDs
- **Refund:** Refund records with reasons, User-based approval trails, processing status
- **PaymentAudit:** Comprehensive audit log for all financial actions

**Staff Permission Integration:**
```python
# Refund approval respects staff profile permissions
def approve(self, admin_user):
    if admin_user.staff_profile.can_approve_refunds:
        self.status = 'approved'
        self.approved_by = admin_user
        self.save()
```

---

**🚚 apps/logistics/ - Delivery Coordination**

**Updated Integration:** Links to Django User for customer tracking and staff task management

**📄 apps/documents/ - File Storage & Management**

**Updated Integration:** Associates files with Django Users for customer document access

**📧 apps/notifications/ - Communication Hub**

**Updated Integration:** Uses Django User email and CustomerProfile preferences for notification targeting

**📊 apps/crm/ - Administrative Command Center**

**Updated Integration:** Staff dashboard shows Django User + CustomerProfile data for comprehensive customer management

## API Architecture Design

**Endpoint Architecture with Django User Integration:**

**Public APIs (No Authentication Required):**
```
/api/public/
├── pricing-preview/ → Real-time pricing calculations (rate limited)
├── services/ → Service catalog and availability
├── guest-booking/ → Guest checkout booking creation (rate limited)
└── booking-status/ → Status lookup by booking number
```

**Customer APIs (Django User Authentication Required):**
```
/api/customer/
├── auth/ → Django User registration, login, logout, password reset (rate limited)
├── profile/ → CustomerProfile management via authenticated User
├── addresses/ → SavedAddress CRUD via User.saved_addresses
├── payment-methods/ → CustomerPaymentMethod + Stripe via User.payment_methods
├── bookings/ → User.bookings for history and creation
└── dashboard/ → Account overview via User + CustomerProfile data
```

**Staff APIs (Django User + StaffProfile Authentication Required):**
```
/api/staff/
├── auth/ → Django User staff login, logout, session management (rate limited)
├── dashboard/ → KPIs, business metrics, operational overview
├── bookings/ → All booking management and modification
├── customers/ → Django User + CustomerProfile management for support (admin audit logged)
├── refunds/ → Refund processing via StaffProfile.can_approve_refunds (admin only)
└── reports/ → Business intelligence and data export
```

**Authentication Security Implementation:**
- **Django Session Authentication** for both customer and staff workflows
- **Profile-based permissions** within staff APIs (StaffProfile.role-based access)
- **User data isolation** - customers only see their own User-related data
- **Staff audit logging** - all actions tracked via StaffAction model
- **Rate limiting** on all authentication and creation endpoints

## Data Migration Strategy

**Django User Model Benefits:**
- **No complex authentication migrations** - uses Django's stable User model
- **Standard user management** - leverage Django admin for user creation
- **Profile data separation** - business logic in profiles, authentication in User
- **Email-based customer experience** - customers use email as username

**CSV Import Approach:**
- Create Django User accounts from customer data
- Auto-create CustomerProfile for each customer User
- Link existing guest bookings via email matching
- Import saved addresses and associate with Users
- Flexible import mapping via Django management commands

**COI File Management:** TBD - Pending client discussion on workflow requirements

## Security Implementation

**Critical Security Requirements (MVP):**

**Authentication Security Advantages:**
```python
# settings.py - Leverages Django's built-in security
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]
```

**Profile-Based Security Separation:**
- **Customer isolation** - customers access only their User.bookings, User.saved_addresses, etc.
- **Staff permissions** - StaffProfile.can_approve_refunds, StaffProfile.role-based access
- **Audit logging** - StaffAction tracks all administrative User actions
- **Session management** - Django's built-in secure session handling

**API Security with Django User:**
- **User-based rate limiting** - track attempts per User instance
- **Profile-based authorization** - CustomerProfile vs StaffProfile access patterns
- **Standard Django middleware** - CSRF, XSS, security headers
- **User permission integration** - leverage Django's permission system

## Technical Architecture Decisions

**Authentication Architecture Choice:**
- **Django User Model Foundation:** Proven, secure, well-maintained authentication system
- **Profile Extension Pattern:** Industry-standard approach for extending User with business data
- **Single Authentication Source:** Eliminates custom authentication complexity and edge cases
- **Role Separation via Profiles:** CustomerProfile vs StaffProfile for clean business logic separation

**Database Design Principles:**
- **UUID Primary Keys:** Enhanced security, distributed system compatibility (profiles and business models)
- **Django User Integration:** Leverage foreign key relationships to User model throughout system
- **Profile Pattern:** Separate authentication concerns from business logic concerns
- **Optimized Indexes:** Query performance on User relationships and profile lookups
- **JSON Fields:** Flexible data storage for configurations and metadata (in profile models)

**API Design Standards:**
- **User-Centric Endpoints:** All customer APIs work with authenticated User + CustomerProfile
- **Profile-Based Permissions:** Staff APIs use StaffProfile role checking
- **Django Authentication Integration:** Leverage rest_framework authentication classes
- **Consistent User Patterns:** user.bookings.all(), user.customer_profile, user.staff_profile
- **Standard Django Patterns:** Follow Django REST Framework conventions throughout

**Security Implementation:**
- **Django Security Foundation:** Built-in password hashing, session security, CSRF protection
- **Profile-Based Authorization:** Customer vs staff access through profile model permissions
- **User Data Protection:** Customers access only their own User-related data
- **Comprehensive Audit Logging:** StaffAction model tracks all administrative User actions
- **Standard Middleware Stack:** Django security middleware for headers, XSS, CSRF protection

**Performance Optimization:**
- **User Model Efficiency:** Django's optimized User model for authentication queries
- **Profile Prefetching:** select_related and prefetch_related for User + profile queries
- **Caching Strategy:** Cache User authentication state and profile data
- **Database Query Optimization:** Efficient joins on User foreign key relationships
- **Background Job Processing:** Async operations for user experience

