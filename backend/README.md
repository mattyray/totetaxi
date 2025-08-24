UPDATED - ToteTaxi Backend Living Documentation & RoadmapStrategic Technical Architecture - Django 5.2.5 + DRF 3.16.1 + PostgreSQL + DockerSystem Architecture OverviewToteTaxi Backend Ecosystem
├── Core Business Logic
│   ├── bookings/ → Heart of system, manages all booking lifecycle (guest + authenticated)
│   ├── services/ → Pricing engine, availability logic, business rules
│   ├── accounts/ → STAFF authentication, user management (admin dashboard only)
│   └── customers/ → CUSTOMER authentication, profiles, dashboard (NEW)
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
    └── AWS Services (S3 Storage, SES Email)Frontend Integration Points:

Customer Booking Flow: React app → bookings + services + payments + customers APIs
Customer Dashboard: React customer portal → customers + bookings APIs
Admin Dashboard: React admin → crm + all app APIs for management
Real-time Updates: WebSocket connections for live booking status
Core Business Applications📋 apps/bookings/ - System Heart & Data HubPrimary Responsibility: Central booking entity that every other system component revolves aroundBusiness Logic Ownership:

Complete booking lifecycle from inquiry to completion
Dual-mode operation: Works with guest checkout AND authenticated customers
Address standardization and reuse for logged-in customers
Booking status orchestration across all systems
Business rule enforcement and validation
Core Data Entities:

Booking: UUID primary key, TT-001234 numbering, soft deletes, status tracking
Address: Reusable addresses with pickup/delivery associations (linked to customers)
GuestCheckout: Temporary customer data for non-authenticated bookings
Frontend Integration Needs:

Guest Booking APIs: Create booking with customer info provided
Authenticated Booking APIs: Create booking using customer profile data
Booking History APIs: Customer dashboard booking list and details
Status Tracking APIs: Live booking status for customer tracking page
Pricing Preview: Real-time pricing as customer makes selections
Key External Relationships:

→ services/: Gets pricing calculations and availability data
→ payments/: Triggers payment processing workflows
→ logistics/: Initiates delivery task creation
→ documents/: Associates COI files with bookings
→ notifications/: Triggers confirmation and status emails
← crm/: Receives admin status updates and modifications
↔ customers/: Links to customer profiles for authenticated bookings
Business Rules Enforced:

Minimum item counts for different service types
Required COI for high-value bookings
Date availability constraints based on van scheduling
Customer information validation and standardization
NEW: Guest vs authenticated customer workflow routing
MVP Simplifications:

Basic guest checkout capture (name, email, phone)
Simple customer linking for authenticated bookings
Address reuse for logged-in customers
👤 apps/customers/ - Customer Authentication & Profile Management (NEW)Primary Responsibility: Customer-facing authentication, profiles, and self-service capabilitiesBusiness Logic Ownership:

Customer registration and login (separate from staff auth)
Customer profile management and preferences
Saved addresses and payment methods integration
Booking history and status tracking for customers
Account settings and notification preferences (future)
Core Data Entities:

Customer: Django User-based model with customer-specific fields
CustomerProfile: Extended profile information, preferences, booking statistics
SavedAddress: Customer's frequently used addresses (home, Hamptons, etc.)
CustomerPaymentMethod: Stripe customer and saved payment methods
Frontend Integration Needs:

Authentication APIs: Registration, login, logout, password reset
Profile Management APIs: Update customer info, preferences
Address Book APIs: CRUD operations for saved addresses
Payment Methods APIs: Add, list, delete saved payment methods
Dashboard APIs: Booking history, account overview, notifications
Customer Dashboard Features:

Booking History: List of all bookings with status tracking
Active Bookings: Live tracking of in-progress deliveries
Address Book: Manage saved pickup/delivery locations
Payment Methods: Manage saved cards via Stripe
Profile Settings: Update contact info, preferences
Key External Relationships:

↔ bookings/: Customer bookings linked to authenticated users
→ payments/: Stripe customer management for saved payment methods
← notifications/: Customer communication preferences and history
← crm/: Staff can view customer profiles and booking patterns
Authentication Strategy:

Optional accounts: Guest checkout remains available
Email/password authentication: Simple registration flow
Session-based auth: Standard Django authentication for customer dashboard
Stripe customer creation: Automatic when saving payment methods
MVP Simplifications:

Basic email/password authentication (no social login)
Simple address book (no advanced features like address validation)
Basic saved payment methods via Stripe
No notification preferences (use defaults)
No loyalty/rewards features
🔐 apps/accounts/ - Staff Authentication & User ManagementPrimary Responsibility: STAFF-ONLY authentication and role-based access control for admin dashboardBusiness Logic Ownership:

CLARIFICATION: This app is for STAFF users only (not customers)
Staff user authentication and session management
Role-based permissions (Admin vs Staff capabilities)
User profile management and preferences
Authentication token generation and validation
Core Data Entities:

User: Extended Django user with role field and phone (STAFF ONLY)
StaffProfile: Employee details, department, permissions level, hire date
Frontend Integration Needs:

Admin Authentication: Login/logout endpoints for staff dashboard
User Context: Current staff user info, permissions, role-based UI
Session Management: Token refresh, password change capabilities
Permission Levels:

Admin: Full system access, refund processing, user management
Staff: Booking management, customer service, operational tasks
View-Only: Dashboard access, reporting, no modifications
Key External Relationships:

→ crm/: Provides user context for all administrative actions
→ ALL APPS: Authentication middleware protects all admin endpoints
← customers/: Staff can view customer profiles for support
MVP Simplifications:

Simple role-based permissions (no granular permissions)
Session-based authentication (JWT tokens for API access)
Manual staff user creation through Django admin
💰 apps/services/ - Pricing & Availability EnginePrimary Responsibility: All pricing logic, service definitions, and availability managementBusiness Logic Ownership:

Complex multi-factor pricing calculations
Service catalog management (Mini Moves, Standard Delivery, Specialty Items)
Dynamic surcharge application (weekend, holiday, peak season)
Van availability scheduling and capacity management
Business constraint validation before booking creation
Core Data Entities:

MiniMovePackage: Petite ($995), Standard ($1725), Full ($2490) with item limits
StandardDeliveryRate: $95 per item, $285 minimum, $360 same-day pricing
SpecialtyItem: Peloton ($500), Surfboard ($350), Crib ($350), Wardrobe Box ($275)
SurchargeRule: Weekend, holiday, peak date pricing modifications
VanSchedule: Daily availability, capacity overrides, specialty item constraints
Frontend Integration Needs:

Service Selection: Available packages and specialty items with descriptions
Calendar Availability: Which dates available for different service types
Real-time Pricing: Dynamic price updates as customer modifies booking
Surcharge Display: Clear breakdown of additional fees and reasons
Pricing Calculation Complexity:

Base service pricing by type and package level
Item-count validation and pricing for standard deliveries
Date-based surcharge application with business rules
COI fee calculation and inclusion logic
Minimum charge enforcement across all service types
NEW: Customer-specific pricing (future: loyalty discounts)
Key External Relationships:

← bookings/: Receives pricing calculation requests
→ bookings/: Validates booking data against business constraints
← crm/: Admin updates to pricing rules and availability
← customers/: Future integration for customer-specific pricing
MVP Simplifications:

Basic weekend surcharge logic (15% premium)
Manual van scheduling (no automatic optimization)
Simple specialty item availability (same van required)
Standard delivery flat rates (no dynamic pricing)
💳 apps/payments/ - Financial Operations HubPrimary Responsibility: All money-related operations, audit trails, and financial integrityBusiness Logic Ownership:

Payment processing lifecycle management
Customer payment methods: Stripe customer management for saved cards
Refund processing with approval workflows
Financial audit trails for all money movements
Integration with payment processors (Stripe initially mocked)
Payment failure handling and retry logic
Core Data Entities:

Payment: Links to booking, tracks amount, status, external payment IDs
CustomerStripeData: Links customers to Stripe customer IDs and saved payment methods
Refund: Refund records with reasons, approval trails, processing status
PaymentAudit: Comprehensive audit log for all financial actions
Frontend Integration Needs:

Payment Processing: Payment intent creation, confirmation handling
Saved Payment Methods: Customer dashboard payment method management
Payment Status: Real-time payment status for booking confirmation
Admin Refunds: Staff interface for processing refunds with approval workflows
Financial Reporting: Payment analytics and reconciliation data
Payment Flow Architecture:

Guest checkout: One-time payment processing
Customer checkout: Option to save payment method or use saved method
Booking creation triggers payment intent generation
Frontend handles payment collection via Stripe
Successful payment triggers logistics and notification workflows
Failed payments trigger retry logic and customer communication
Key External Relationships:

← bookings/: Receives payment requests from completed bookings
→ bookings/: Updates booking status based on payment success/failure
← customers/: Customer payment method management
→ logistics/: Triggers delivery task creation after successful payment
→ notifications/: Sends payment confirmations and failure notifications
← crm/: Processes refund requests from staff with audit trails
MVP Simplifications:

Mocked Stripe integration for development
Simple refund workflow (admin approval required)
Basic payment retry logic (3 attempts)
Basic saved payment method functionality
🚚 apps/logistics/ - Delivery CoordinationPrimary Responsibility: Physical delivery management and real-time trackingBusiness Logic Ownership:

Delivery task creation and driver assignment
Real-time tracking and status updates
Customer communication: Tracking updates for both guest and authenticated customers
Integration with logistics providers (Onfleet initially mocked)
Failed delivery handling and rescheduling
Core Data Entities:

DeliveryTask: Links to booking, tracks pickup/delivery status, driver assignment
TrackingUpdate: Real-time events from logistics provider, customer notifications
Frontend Integration Needs:

Customer Tracking: Live delivery status and driver location (guest + authenticated)
Customer Dashboard: Booking tracking integration
Admin Task Management: Staff interface for managing delivery tasks
Delivery Analytics: Success rates, timing metrics, driver performance
Delivery Workflow:

Successful payment triggers delivery task creation
Tasks assigned to drivers via external logistics platform
Real-time updates flow from logistics provider to customers
Customer notifications: Email/SMS to both guest checkout email and customer accounts
Delivery completion triggers final notifications and booking closure
Key External Relationships:

← payments/: Creates delivery tasks after successful payment confirmation
← bookings/: Uses booking data for pickup/delivery addresses and instructions
→ bookings/: Updates booking status based on delivery progress
→ notifications/: Sends tracking updates and delivery confirmations
← customers/: Provides tracking data for customer dashboard
← crm/: Staff can monitor and modify delivery tasks
MVP Simplifications:

Mocked Onfleet integration for development
Basic tracking status updates (created, assigned, in progress, completed)
Simple delivery failure handling
Email notifications only (no SMS initially)
📄 apps/documents/ - File Storage & ManagementPrimary Responsibility: Secure file handling, COI management, and document lifecycleBusiness Logic Ownership:

File upload, storage, and secure access via S3
Certificate of Insurance (COI) processing and validation
Document categorization and searchability
File lifecycle management and cleanup
Access control and secure URL generation
Customer document access: Allow customers to view their booking documents
Core Data Entities:

Document: S3-stored files with metadata, associations to bookings/customers
COI: Extended document model with insurance-specific fields and validation
Frontend Integration Needs:

File Upload: Secure upload endpoints with progress tracking
Customer Document Access: Secure document viewing in customer dashboard
Document Viewer: Secure document access and display
COI Management: Staff interface for COI validation and status tracking
Document Search: Find documents by booking, customer, or date range
File Storage Architecture:

Direct uploads to S3 with secure presigned URLs
Database tracking of all file metadata and associations
Automatic file categorization and tagging
Customer access control: Customers can only view their own booking documents
Scheduled cleanup of expired or unused files
Key External Relationships:

← bookings/: Associates documents with specific bookings
← customers/: Customer access to their booking documents
← crm/: Staff upload and manage documents through admin interface
→ notifications/: Alerts for missing/expired COIs
S3 Integration: Direct file storage and retrieval
MVP Simplifications:

Basic COI upload and storage (no OCR or automatic validation)
Simple file categorization (COI, invoice, receipt)
Manual document validation by staff
Basic customer document viewing (no advanced features)
📧 apps/notifications/ - Communication HubPrimary Responsibility: All customer and staff communication managementBusiness Logic Ownership:

Email template management with dynamic variables
Multi-channel notification delivery (email via SES, future SMS)
Dual recipient handling: Guest checkout emails and customer account notifications
Delivery tracking and failure handling
Notification scheduling and retry logic
Communication preference management (future)
Core Data Entities:

EmailTemplate: Reusable templates with variable substitution
Notification: Individual communication records with delivery tracking
DeliveryLog: Comprehensive tracking of communication delivery and engagement
CustomerNotificationPreference: Customer communication settings (future)
Frontend Integration Needs:

Template Management: Staff interface for creating and editing email templates
Customer Notification History: Customer dashboard view of communications
Notification History: Customer and staff views of communication history
Delivery Analytics: Email open rates, delivery success, bounce tracking
Communication Workflows:

Booking events automatically trigger notification creation
Smart recipient detection: Use customer email if authenticated, booking email if guest
Templates populated with booking/customer data variables
SES handles email delivery with tracking and bounce management
Customer dashboard integration: Show notification history to logged-in customers
Failed communications trigger retry logic and staff alerts
Key External Relationships:

← bookings/: Triggered by booking status changes and lifecycle events
← payments/: Sends payment confirmations and failure notifications
← logistics/: Sends delivery tracking updates and completion confirmations
← customers/: Customer notification preferences and dashboard history
← crm/: Staff can send custom notifications and manage templates
SES Integration: Email delivery and tracking via AWS Simple Email Service
MVP Simplifications:

Email-only communications (no SMS initially)
Basic template system with simple variable substitution
Standard notification types (booking confirmation, payment confirmation, delivery updates)
No advanced customer preference management
📊 apps/crm/ - Administrative Command CenterPrimary Responsibility: Staff operations interface and business intelligenceBusiness Logic Ownership:

Real-time dashboard with key performance indicators
Comprehensive booking management and modification capabilities
Customer support: Access to customer profiles, booking history, account management
Financial operations including refund processing
Business reporting and data export functionality
Audit logging for all administrative actions
Core Data Entities:

Dashboard: Daily KPI aggregation and business metrics
Report: Configurable business reports with export capabilities
AuditLog: Complete action tracking for compliance and accountability
Frontend Integration Needs:

Operations Dashboard: Real-time KPIs, upcoming bookings, pending actions
Booking Management: Full CRUD interface for all booking operations
Customer Management: Staff interface for viewing/managing customer accounts
Financial Interface: Refund processing, payment tracking, revenue reporting
Analytics Views: Business intelligence dashboards and trend analysis
Dashboard Metrics:

Daily/weekly/monthly booking volumes and revenue
Customer metrics: Registration rates, repeat booking patterns
Service type breakdown and popularity trends
Payment success rates and processing metrics
Delivery completion rates and timing analytics
Customer satisfaction and repeat booking rates
Administrative Workflows:

Staff can view, modify, and cancel any booking
Customer account management: Staff can view customer profiles, reset passwords, manage accounts
Refund processing with approval workflows and audit trails
Customer service actions with complete interaction history
Business reporting with scheduled generation and delivery
Key External Relationships:

→ ALL APPS: CRM interfaces with every system component for management
← accounts/: Authentication and role-based access control
← bookings/: Primary data source for operations and customer service
← customers/: Customer account management and support
← payments/: Financial data management and refund processing
← logistics/: Delivery task monitoring and management
← documents/: Document management and COI processing
← notifications/: Communication management and template control
MVP Simplifications:

Basic dashboard with essential KPIs
Simple booking search and filter capabilities
Basic customer account viewing (no advanced management)
Manual report generation (no scheduled reports initially)
Basic audit logging for critical actions
System Integration ArchitectureData Flow PatternsCustomer Booking Journey (Guest):
Marketing Site (SEO/Conversion)
    ↓
Booking Wizard (Guest Checkout)
    ↓ Real-time pricing
Services API ← → Frontend State Management
    ↓ Booking creation with guest info
Bookings API → Payment Processing
    ↓ Payment confirmation
Logistics API → Email Notifications (to booking email)
    ↓
Confirmation & Tracking (guest access)Customer Booking Journey (Authenticated):
Marketing Site → Customer Login/Signup
    ↓
Customer Dashboard OR Booking Wizard (Authenticated)
    ↓ Pre-filled data from profile
Services API ← → Frontend State Management
    ↓ Booking creation linked to customer
Bookings API → Payment Processing (saved methods available)
    ↓ Payment confirmation
Logistics API → Email Notifications + Dashboard Updates
    ↓
Customer Dashboard Tracking + Email confirmationsStaff Operations Flow:
Admin Authentication (Staff Only)
    ↓
Dashboard Overview (Real-time KPIs)
    ↓
Booking Management + Customer Management
    ↓ Staff actions
CRM API → All Backend Apps
    ↓ Real-time updates
WebSocket → Live Dashboard UpdatesExternal Service Integration:
Frontend → S3 Direct Upload (COI files)
Frontend → Stripe Elements (Payment processing + saved methods)
Backend → SES (Email notifications)
Backend → Onfleet (Delivery coordination)Authentication ArchitectureDual Authentication Strategy:
Staff Authentication (accounts/)
├── Django Admin access
├── Staff dashboard access
├── Role-based permissions
└── Session-based auth

Customer Authentication (customers/)
├── Optional customer accounts
├── Guest checkout available
├── Customer dashboard access
└── Session-based auth with different middlewareDevelopment RoadmapPhase 1: Foundation (Week 1) - "Core Data & Customer Auth"
Objective: Establish core system with basic booking functionality and customer authenticationBackend Deliverables:

All Django apps created with core models (including customers/)
Customer authentication system (registration, login, dashboard)
Basic CRUD APIs for bookings, services, and customers
UUID primary keys and soft delete implementation
Docker environment fully operational
Django admin interfaces for all models
Frontend Dependencies Created:

Customer authentication APIs (signup, login, profile)
Booking creation APIs (guest + authenticated)
Customer dashboard APIs (booking history, profile management)
Service catalog endpoints available
Basic booking management APIs functional
Success Criteria:

Customers can register, login, and view booking history
Can create booking through API with pricing calculation (guest + authenticated)
All models properly related with foreign keys
Docker setup allows immediate development start
Phase 2: Business Logic (Week 2) - "Pricing & Payment Flow"
Objective: Implement complex business rules and mocked payment processingBackend Deliverables:

Advanced pricing engine with surcharge calculations
Mocked payment processing with realistic behaviors
Stripe customer integration for saved payment methods
Notification system with SES email integration
Background job processing with Celery
Complete booking workflow from creation through payment
Frontend Dependencies Created:

Real-time pricing APIs with surcharge breakdowns
Payment processing endpoints (mocked but realistic)
Saved payment method management
Email confirmation system operational
Booking status updates available
Success Criteria:

Complete customer booking flow functional (guest + authenticated)
Customer dashboard shows booking history and saved addresses
Emails sent via SES with proper templates
Background jobs processing payments and notifications
Phase 3: Operations (Week 3) - "File Storage & Admin Interface"
Objective: Document management and staff operational capabilitiesBackend Deliverables:

S3 document storage with secure access
COI upload and basic validation
CRM dashboard APIs with business metrics
Staff authentication and role-based permissions
Administrative booking and customer management capabilities
Frontend Dependencies Created:

File upload endpoints with progress tracking
Admin dashboard data APIs
Staff authentication and authorization
Customer account management APIs for staff
Booking management APIs for admin interface
Success Criteria:

Documents upload to S3 and associate with bookings
Staff can log in and manage bookings and customer accounts
Admin dashboard shows real business metrics
Customer dashboard fully functional
Phase 4: Production Readiness (Week 4) - "Real Integrations & Polish"
Objective: Replace mocks with production services and optimize performanceBackend Deliverables:

Real Stripe integration replacing mocked payments
Production-ready configuration and security
Customer authentication security hardening
Comprehensive API documentation
Performance optimization and caching
Complete test coverage for critical paths
Frontend Dependencies Completed:

All APIs finalized with real payment processing
Customer dashboard with all MVP features
Error handling patterns established
Production-ready authentication flows
Complete feature parity for MVP launch
Success Criteria:

Real payments processing through Stripe
Customer accounts fully functional in production
System ready for production deployment
All MVP features tested and documented
Technical Architecture DecisionsDatabase Design Principles

UUID Primary Keys: Enhanced security, distributed system compatibility
Soft Deletes: Data preservation for analytics, audit requirements
Dual Customer Strategy: Guest checkout data + customer accounts
Optimized Indexes: Query performance on frequently accessed fields
JSON Fields: Flexible data storage for configurations and metadata
API Design Standards

RESTful Conventions: Predictable endpoint patterns
Consistent Response Formats: Standardized success/error responses
Dual Authentication: Separate auth patterns for staff vs customers
Pagination Strategy: Efficient large dataset handling
Version Management: Future-proof API evolution
Security Implementation

Dual Authentication: Staff vs customer authentication separation
Role-Based Access Control: Admin/Staff permission separation
Customer Data Protection: Customers can only access their own data
Input Validation: Comprehensive data sanitization
Secure File Storage: S3 with presigned URL access patterns
Audit Logging: Complete action tracking for compliance
Performance Optimization

Database Query Optimization: Efficient joins and indexes
Background Job Processing: Async operations for user experience
Caching Strategy: Redis for frequently accessed data
Customer Dashboard Performance: Efficient booking history queries
File Storage Optimization: Direct S3 upload patterns
This living document evolves with system development and serves as the single source of truth for ToteTaxi's backend architecture, business logic, and integration patterns.