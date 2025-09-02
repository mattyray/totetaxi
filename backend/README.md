Here's the complete updated living documentation with critical security requirements integrated:

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
ToteTaxi is a luxury delivery service replacement system with significant business and technical complexity: multiple service types (Mini Moves, Standard Delivery, Specialty Items), sophisticated pricing engines with surcharges, separate authentication systems (customers vs staff), payment processing integration, and operational management workflows. This complexity requires detailed documentation to maintain development consistency and architectural integrity.

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
│   └── customers/ → CUSTOMER authentication, profiles, dashboard (Separate Auth)
├── Staff Operations
│   └── accounts/ → STAFF authentication, user management (Django User + Profile)
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

**Separate Authentication Strategy (Security-First Approach):**

**Customer Authentication (customers/ app):**
```
Customer Model (AbstractUser with email login)
├── Email-based authentication (no username field)
├── Customer-specific fields (stripe_customer_id, phone)
├── CustomerProfile (extended information, booking statistics)
├── SavedAddress (customer's frequently used addresses)  
└── CustomerPaymentMethod (Stripe integration for saved cards)
```

**Staff Authentication (accounts/ app):**
```
Django User Model + StaffProfile
├── Username/password authentication (traditional)
├── Role-based permissions (staff vs admin)
├── Admin role: refund approvals, user management
├── Staff role: booking management, customer service
└── StaffProfile (department, hire date, permissions level)
```

**Security Benefits:**
- Complete isolation between customer and staff authentication
- No possible role escalation vulnerabilities
- Separate session management and API endpoints
- Different authentication flows eliminate cross-access bugs

## Security Implementation

**Critical Security Requirements (MVP):**

**HTTPS & Transport Security:**
```python
# settings.py - Production requirements
SECURE_SSL_REDIRECT = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_HSTS_SECONDS = 31536000
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
```

**API Security:**
- **Rate Limiting:** django-ratelimit on booking, payment, and authentication endpoints
- **CORS Configuration:** Strict origin controls for frontend API access
- **Request Throttling:** Per-IP and per-user limits to prevent abuse
- **API Endpoint Separation:** Complete isolation between /api/customer/, /api/staff/, /api/public/

**Authentication Security:**
- **Password Requirements:** Minimum 8 characters, complexity validation
- **Session Security:** Secure cookies, 2-hour timeout for customers, 8-hour for staff
- **Brute Force Protection:** Account lockout after 5 failed attempts
- **Environment Variables:** All secrets in .env files, never in code

**Payment Security:**
- **Stripe Integration:** Webhook signature verification required
- **Payment Validation:** Server-side amount verification before processing  
- **Card Data:** Never stored locally, Stripe handles all PCI compliance
- **Refund Authorization:** Admin-only approval with audit logging

**Data Protection:**
- **Input Validation:** Django forms/serializers for all user input
- **SQL Injection Prevention:** Django ORM only, no raw queries
- **File Upload Security:** S3 presigned URLs, file type validation for COI uploads
- **Error Handling:** Generic error messages, sensitive info in logs only

**Security Monitoring:**
- **Failed Login Tracking:** Log all authentication failures
- **Admin Action Logging:** Complete audit trail for refunds, customer changes
- **Suspicious Activity:** Rate limit violations, multiple failed payments

## Core Business Applications

**📋 apps/bookings/ - System Heart & Data Hub**

**Primary Responsibility:** Central booking entity that every other system component revolves around

**Business Logic Ownership:**
- Complete booking lifecycle from inquiry to completion
- Dual-mode operation: Works with guest checkout AND authenticated customers
- Address standardization and reuse for logged-in customers
- Booking status orchestration across all systems
- Business rule enforcement and validation
- Guest-to-customer account linking workflow

**Core Data Entities:**
- **Booking:** UUID primary key, TT-001234 numbering, soft deletes, status tracking
- **Address:** Reusable addresses with pickup/delivery associations (linked to customers)
- **GuestCheckout:** Temporary customer data for non-authenticated bookings with automatic linking capability

**Guest-to-Customer Account Linking:**
When customer creates account with email matching existing guest bookings, automatically link booking history to new customer account with confirmation message.

**Security Integration:**
- Rate limiting on booking creation endpoints
- Input validation for all address and customer data
- CSRF protection on booking modification endpoints

**Frontend Integration Needs:**
- Guest Booking APIs: Create booking with customer info provided
- Authenticated Booking APIs: Create booking using customer profile data
- Booking History APIs: Customer dashboard booking list and details
- Status Tracking APIs: Live booking status for customer tracking page
- Pricing Preview APIs: Real-time pricing as customer makes selections

**Key External Relationships:**
- → services/: Gets pricing calculations and availability data
- → payments/: Triggers payment processing workflows
- → logistics/: Initiates delivery task creation
- → documents/: Associates COI files with bookings (workflow TBD - client discussion)
- → notifications/: Triggers confirmation and status emails
- ← crm/: Receives admin status updates and modifications
- ↔ customers/: Links to customer profiles for authenticated bookings

---

**👤 apps/customers/ - Customer Authentication & Profile Management**

**Primary Responsibility:** Customer-facing authentication, profiles, and self-service capabilities

**Authentication Architecture:**
- **Customer Model:** AbstractUser extended with email as username field
- **Email-based login:** No username field, customers login with email/password
- **Session-based authentication:** Standard Django authentication for customer dashboard

**Security Features:**
- Password strength validation (minimum 8 characters, complexity)
- Account lockout after 5 failed login attempts
- Secure session management with 2-hour timeout
- Rate limiting on registration and login endpoints

**Business Logic Ownership:**
- Customer registration and login (separate from staff auth)
- Customer profile management and preferences
- Saved addresses and payment methods integration
- Booking history and status tracking for customers
- Guest checkout to customer account conversion

**Core Data Entities:**
- **Customer:** AbstractUser-based model with customer-specific fields (phone, stripe_customer_id)
- **CustomerProfile:** Extended profile information, preferences, booking statistics
- **SavedAddress:** Customer's frequently used addresses (home, Hamptons, etc.)
- **CustomerPaymentMethod:** Stripe customer and saved payment methods

**Frontend Integration Needs:**
- Authentication APIs: Registration, login, logout, password reset
- Profile Management APIs: Update customer info, preferences
- Address Book APIs: CRUD operations for saved addresses
- Payment Methods APIs: Add, list, delete saved payment methods
- Dashboard APIs: Booking history, account overview, notifications

**Key External Relationships:**
- ↔ bookings/: Customer bookings linked to authenticated users
- → payments/: Stripe customer management for saved payment methods
- ← notifications/: Customer communication preferences and history
- ← accounts/: Staff can view customer profiles for support (via CRM)

---

**🔐 apps/accounts/ - Staff Authentication & User Management**

**Primary Responsibility:** Staff-only authentication and role-based access control for admin dashboard

**Authentication Architecture:**
- **Django User Model:** Standard Django User with username/password authentication
- **StaffProfile Extension:** Additional staff-specific fields and permissions
- **Role-based Access:** Admin vs Staff permission differentiation

**Security Features:**
- Extended session timeout (8 hours) for operational efficiency
- Enhanced audit logging for all staff actions
- Admin role verification for sensitive operations (refunds)
- IP-based access restrictions (production consideration)

**Business Logic Ownership:**
- Staff user authentication and session management
- Role-based permissions (Admin vs Staff capabilities)
- Staff profile management and preferences
- Authentication token generation and validation

**Core Data Entities:**
- **User:** Django's built-in User model (username/password authentication)
- **StaffProfile:** Employee details, department, permissions level, hire date

**Permission Levels:**
- **Admin:** Full system access, refund processing, user management, customer account management
- **Staff:** Booking management, customer service, operational tasks

**Frontend Integration Needs:**
- Admin Authentication: Login/logout endpoints for staff dashboard
- User Context: Current staff user info, permissions, role-based UI
- Session Management: Token refresh, password change capabilities

**Key External Relationships:**
- → crm/: Provides user context for all administrative actions
- → ALL APPS: Authentication middleware protects all admin endpoints
- ← customers/: Staff can view customer profiles for support

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
- **MiniMovePackage:** Petite ($995), Standard ($1725), Full ($2490) with item limits
- **StandardDeliveryConfig:** $95 per item, $285 minimum, $360 same-day pricing
- **SpecialtyItem:** Peloton ($500), Surfboard ($350), Crib ($350), Wardrobe Box ($275)
- **SurchargeRule:** Weekend, holiday, peak date pricing modifications
- **VanSchedule:** Daily availability, capacity overrides, specialty item constraints

**Security Integration:**
- Rate limiting on pricing calculation endpoints
- Input validation for all pricing parameters
- Business rule enforcement to prevent pricing manipulation

**Frontend Integration Needs:**
- Service Selection: Available packages and specialty items with descriptions
- Calendar Availability: Which dates available for different service types
- Real-time Pricing: Dynamic price updates as customer modifies booking
- Surcharge Display: Clear breakdown of additional fees and reasons

**Pricing Calculation Complexity:**
- Base service pricing by type and package level
- Item-count validation and pricing for standard deliveries
- Date-based surcharge application with business rules
- COI fee calculation and inclusion logic
- Minimum charge enforcement across all service types

**Key External Relationships:**
- ← bookings/: Receives pricing calculation requests
- → bookings/: Validates booking data against business constraints
- ← crm/: Admin updates to pricing rules and availability

---

**💳 apps/payments/ - Financial Operations Hub**

**Primary Responsibility:** All money-related operations, audit trails, and financial integrity

**Security Features:**
- Stripe webhook signature verification (critical)
- Payment amount validation before processing
- Complete audit trails for all financial operations
- Admin-only refund approval with logging

**Business Logic Ownership:**
- Payment processing lifecycle management
- Customer payment methods: Stripe customer management for saved cards
- Refund processing with approval workflows
- Financial audit trails for all money movements
- Integration with payment processors (Stripe)
- Payment failure handling and retry logic

**Core Data Entities:**
- **Payment:** Links to booking, tracks amount, status, external payment IDs
- **CustomerStripeData:** Links customers to Stripe customer IDs and saved payment methods
- **Refund:** Refund records with reasons, approval trails, processing status
- **PaymentAudit:** Comprehensive audit log for all financial actions

**Frontend Integration Needs:**
- Payment Processing: Payment intent creation, confirmation handling
- Saved Payment Methods: Customer dashboard payment method management
- Payment Status: Real-time payment status for booking confirmation
- Admin Refunds: Staff interface for processing refunds with approval workflows
- Financial Reporting: Payment analytics and reconciliation data

**Payment Flow Architecture:**
- Guest checkout: One-time payment processing
- Customer checkout: Option to save payment method or use saved method
- Booking creation triggers payment intent generation
- Frontend handles payment collection via Stripe
- Successful payment triggers logistics and notification workflows
- Failed payments trigger retry logic and customer communication

**Key External Relationships:**
- ← bookings/: Receives payment requests from completed bookings
- → bookings/: Updates booking status based on payment success/failure
- ← customers/: Customer payment method management
- → logistics/: Triggers delivery task creation after successful payment
- → notifications/: Sends payment confirmations and failure notifications
- ← crm/: Processes refund requests from staff with audit trails

---

**🚚 apps/logistics/ - Delivery Coordination**

**Primary Responsibility:** Physical delivery management and real-time tracking

**Business Logic Ownership:**
- Delivery task creation and driver assignment
- Real-time tracking and status updates
- Customer communication: Tracking updates for both guest and authenticated customers
- Integration with logistics providers (Onfleet initially mocked)
- Failed delivery handling and rescheduling

**Core Data Entities:**
- **DeliveryTask:** Links to booking, tracks pickup/delivery status, driver assignment
- **TrackingUpdate:** Real-time events from logistics provider, customer notifications

**Frontend Integration Needs:**
- Customer Tracking: Live delivery status and driver location (guest + authenticated)
- Customer Dashboard: Booking tracking integration
- Admin Task Management: Staff interface for managing delivery tasks
- Delivery Analytics: Success rates, timing metrics, driver performance

**Key External Relationships:**
- ← payments/: Creates delivery tasks after successful payment confirmation
- ← bookings/: Uses booking data for pickup/delivery addresses and instructions
- → bookings/: Updates booking status based on delivery progress
- → notifications/: Sends tracking updates and delivery confirmations
- ← customers/: Provides tracking data for customer dashboard
- ← crm/: Staff can monitor and modify delivery tasks

---

**📄 apps/documents/ - File Storage & Management**

**Primary Responsibility:** Secure file handling, COI management, and document lifecycle

**Security Features:**
- S3 presigned URLs for secure file access
- File type validation for uploads
- Customer access control (only their booking documents)
- Secure document viewer with access logging

**Business Logic Ownership:**
- File upload, storage, and secure access via S3
- Certificate of Insurance (COI) processing and validation (workflow TBD - client discussion)
- Document categorization and searchability
- File lifecycle management and cleanup
- Access control and secure URL generation
- Customer document access: Allow customers to view their booking documents

**Core Data Entities:**
- **Document:** S3-stored files with metadata, associations to bookings/customers
- **COI:** Extended document model with insurance-specific fields and validation

**Key External Relationships:**
- ← bookings/: Associates documents with specific bookings
- ← customers/: Customer access to their booking documents
- ← crm/: Staff upload and manage documents through admin interface
- → notifications/: Alerts for missing/expired COIs
- AWS S3: Direct file storage and retrieval

---

**📧 apps/notifications/ - Communication Hub**

**Primary Responsibility:** All customer and staff communication management

**Business Logic Ownership:**
- Email template management with dynamic variables
- Multi-channel notification delivery (email via SES)
- Dual recipient handling: Guest checkout emails and customer account notifications
- Delivery tracking and failure handling
- Notification scheduling and retry logic

**Core Data Entities:**
- **EmailTemplate:** Reusable templates with variable substitution
- **Notification:** Individual communication records with delivery tracking
- **DeliveryLog:** Comprehensive tracking of communication delivery and engagement

**Communication Workflows:**
- Booking events automatically trigger notification creation
- Smart recipient detection: Use customer email if authenticated, booking email if guest
- Templates populated with booking/customer data variables
- SES handles email delivery with tracking and bounce management
- Customer dashboard integration: Show notification history to logged-in customers
- Failed communications trigger retry logic and staff alerts

**Key External Relationships:**
- ← bookings/: Triggered by booking status changes and lifecycle events
- ← payments/: Sends payment confirmations and failure notifications
- ← logistics/: Sends delivery tracking updates and completion confirmations
- ← customers/: Customer notification preferences and dashboard history
- ← crm/: Staff can send custom notifications and manage templates
- AWS SES: Email delivery and tracking

---

**📊 apps/crm/ - Administrative Command Center**

**Primary Responsibility:** Staff operations interface and business intelligence

**Security Features:**
- Role-based access control for all administrative functions
- Complete audit logging for compliance
- Secure customer data access with proper authorization
- Admin verification for sensitive operations

**Business Logic Ownership:**
- Real-time dashboard with key performance indicators
- Comprehensive booking management and modification capabilities
- Customer support: Access to customer profiles, booking history, account management
- Financial operations including refund processing
- Business reporting and data export functionality
- Audit logging for all administrative actions

**Core Data Entities:**
- **Dashboard:** Daily KPI aggregation and business metrics
- **Report:** Configurable business reports with export capabilities
- **AuditLog:** Complete action tracking for compliance and accountability

**Key External Relationships:**
- → ALL APPS: CRM interfaces with every system component for management
- ← accounts/: Authentication and role-based access control
- ← bookings/: Primary data source for operations and customer service
- ← customers/: Customer account management and support
- ← payments/: Financial data management and refund processing
- ← logistics/: Delivery task monitoring and management
- ← documents/: Document management and COI processing
- ← notifications/: Communication management and template control

## API Architecture Design

**Endpoint Separation for Security:**

**Public APIs (No Authentication Required):**
```
/api/public/
├── pricing-preview/ → Real-time pricing calculations (rate limited)
├── services/ → Service catalog and availability
├── guest-booking/ → Guest checkout booking creation (rate limited)
└── booking-status/ → Status lookup by booking number
```

**Customer APIs (Customer Authentication Required):**
```
/api/customer/
├── auth/ → Registration, login, logout, password reset (rate limited)
├── profile/ → Customer profile management
├── addresses/ → Saved address CRUD operations
├── payment-methods/ → Stripe payment method management
├── bookings/ → Customer booking history and creation
└── dashboard/ → Account overview and statistics
```

**Staff APIs (Staff Authentication Required):**
```
/api/staff/
├── auth/ → Staff login, logout, session management (rate limited)
├── dashboard/ → KPIs, business metrics, operational overview
├── bookings/ → All booking management and modification
├── customers/ → Customer account management for support (admin audit logged)
├── refunds/ → Refund processing and approval workflows (admin only)
└── reports/ → Business intelligence and data export
```

**Security Implementation:**
- Completely separate URL patterns prevent cross-access
- Different authentication classes for each API group
- Rate limiting on all authentication and creation endpoints
- Role-based permissions within staff APIs (admin vs staff)
- Customer data isolation (customers only see their own data)
- CSRF protection on all state-changing operations

## Data Migration Strategy

**CSV Import Approach:**
- Manual data import from WordPress/Shopify via CSV files
- Django admin actions for importing customer and booking data  
- Flexible import mapping to handle inconsistent data formats
- Guest booking email matching for customer account linking
- Secure import validation to prevent data corruption

**COI File Management:** TBD - Pending client discussion on workflow requirements

## Technical Architecture Decisions

**Database Design Principles:**
- UUID Primary Keys: Enhanced security, distributed system compatibility
- Soft Deletes: Data preservation for analytics, audit requirements
- Separate Customer Strategy: Complete authentication isolation for security
- Optimized Indexes: Query performance on frequently accessed fields
- JSON Fields: Flexible data storage for configurations and metadata

**API Design Standards:**
- RESTful Conventions: Predictable endpoint patterns
- Consistent Response Formats: Standardized success/error responses
- Separate Authentication: Complete isolation between customer and staff APIs
- Rate Limiting: Protection against abuse and DoS attacks
- Pagination Strategy: Efficient large dataset handling
- Version Management: Future-proof API evolution

**Security Implementation:**
- Authentication Isolation: Complete separation between customer and staff systems
- Role-Based Access Control: Admin/Staff permission separation within staff system
- Customer Data Protection: Customers can only access their own data
- Input Validation: Comprehensive data sanitization and business rule enforcement
- Secure File Storage: S3 with presigned URL access patterns and file validation
- Audit Logging: Complete action tracking for compliance and security monitoring
- Payment Security: Stripe integration with webhook verification and PCI compliance

**Performance Optimization:**
- Database Query Optimization: Efficient joins and indexes
- Background Job Processing: Async operations for user experience
- Caching Strategy: Redis for frequently accessed data
- Customer Dashboard Performance: Efficient booking history queries
- File Storage Optimization: Direct S3 upload patterns
- Rate Limiting: Prevents abuse while maintaining performance

This documentation serves as the foundation for secure, scalable development of ToteTaxi's luxury delivery service platform, prioritizing customer data protection and operational security while maintaining sophisticated business functionality.