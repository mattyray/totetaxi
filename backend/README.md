# **ToteTaxi Backend Living Documentation & Roadmap**

*Strategic Technical Architecture - Django 5.2.5 + DRF 3.16.1 + PostgreSQL + Docker*

---

## **System Architecture Overview**

```
ToteTaxi Backend Ecosystem
├── Core Business Logic
│   ├── bookings/ → Heart of system, manages all booking lifecycle
│   ├── services/ → Pricing engine, availability logic, business rules
│   └── accounts/ → Staff authentication, user management
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
- **Customer Booking Flow**: React app → bookings + services + payments APIs
- **Admin Dashboard**: React admin → crm + all app APIs for management
- **Real-time Updates**: WebSocket connections for live booking status

---

## **Core Business Applications**

### **📋 apps/bookings/ - System Heart & Data Hub**

**Primary Responsibility**: Central booking entity that every other system component revolves around

**Business Logic Ownership**:
- Complete booking lifecycle from inquiry to completion
- Customer profile management and history tracking  
- Address standardization and reuse
- Booking status orchestration across all systems
- Business rule enforcement and validation

**Core Data Entities**:
- **Booking**: UUID primary key, TT-001234 numbering, soft deletes, status tracking
- **CustomerProfile**: Auto-created from bookings, preference storage, booking history
- **Address**: Reusable addresses with pickup/delivery associations

**Frontend Integration Needs**:
- **Booking Wizard APIs**: Create, update, validate booking data
- **Pricing Preview**: Real-time pricing as customer makes selections
- **Booking Confirmation**: Customer-facing booking details and tracking
- **Status Updates**: Live booking status for customer tracking page

**Key External Relationships**:
- **→ services/**: Gets pricing calculations and availability data
- **→ payments/**: Triggers payment processing workflows
- **→ logistics/**: Initiates delivery task creation
- **→ documents/**: Associates COI files with bookings
- **→ notifications/**: Triggers confirmation and status emails
- **← crm/**: Receives admin status updates and modifications

**Business Rules Enforced**:
- Minimum item counts for different service types
- Required COI for high-value bookings
- Date availability constraints based on van scheduling
- Customer information validation and standardization

---

### **💰 apps/services/ - Pricing & Availability Engine**

**Primary Responsibility**: All pricing logic, service definitions, and availability management

**Business Logic Ownership**:
- Complex multi-factor pricing calculations
- Service catalog management (Mini Moves, Standard Delivery, Specialty Items)
- Dynamic surcharge application (weekend, holiday, peak season)
- Van availability scheduling and capacity management
- Business constraint validation before booking creation

**Core Data Entities**:
- **MiniMovePackage**: Petite ($995), Standard ($1725), Full ($2490) with item limits
- **SpecialtyItem**: Peloton ($500), Surfboard ($350), Crib ($350), Wardrobe Box ($275)
- **SurchargeRule**: Weekend, holiday, peak date pricing modifications
- **VanSchedule**: Daily availability, capacity overrides, specialty item constraints

**Frontend Integration Needs**:
- **Service Selection**: Available packages and specialty items with descriptions
- **Calendar Availability**: Which dates available for different service types
- **Real-time Pricing**: Dynamic price updates as customer modifies booking
- **Surcharge Display**: Clear breakdown of additional fees and reasons

**Pricing Calculation Complexity**:
- Base service pricing by type and package level
- Item-count validation and pricing for standard deliveries
- Date-based surcharge application with business rules
- COI fee calculation and inclusion logic
- Minimum charge enforcement across all service types

**Key External Relationships**:
- **← bookings/**: Receives pricing calculation requests
- **→ bookings/**: Validates booking data against business constraints
- **← crm/**: Admin updates to pricing rules and availability

**MVP Simplifications**:
- Basic weekend surcharge logic (15% premium)
- Manual van scheduling (no automatic optimization)
- Simple specialty item availability (same van required)

---

### **👤 apps/accounts/ - Authentication & User Management**

**Primary Responsibility**: Staff authentication and role-based access control

**Business Logic Ownership**:
- Staff user authentication and session management
- Role-based permissions (Admin vs Staff capabilities)
- User profile management and preferences
- Authentication token generation and validation

**Core Data Entities**:
- **User**: Extended Django user with role field and phone
- **StaffProfile**: Employee details, department, permissions level, hire date

**Frontend Integration Needs**:
- **Admin Authentication**: Login/logout endpoints for staff dashboard
- **User Context**: Current user info, permissions, role-based UI
- **Session Management**: Token refresh, password change capabilities

**Permission Levels**:
- **Admin**: Full system access, refund processing, user management
- **Staff**: Booking management, customer service, operational tasks
- **View-Only**: Dashboard access, reporting, no modifications

**Key External Relationships**:
- **→ crm/**: Provides user context for all administrative actions
- **→ ALL APPS**: Authentication middleware protects all admin endpoints
- **← bookings/**: Links to CustomerProfile for booking association

**MVP Simplifications**:
- Simple role-based permissions (no granular permissions)
- Session-based authentication (JWT tokens for API access)
- Manual staff user creation through Django admin

---

### **💳 apps/payments/ - Financial Operations Hub**

**Primary Responsibility**: All money-related operations, audit trails, and financial integrity

**Business Logic Ownership**:
- Payment processing lifecycle management
- Refund processing with approval workflows
- Financial audit trails for all money movements
- Integration with payment processors (Stripe initially mocked)
- Payment failure handling and retry logic

**Core Data Entities**:
- **Payment**: Links to booking, tracks amount, status, external payment IDs
- **Refund**: Refund records with reasons, approval trails, processing status
- **PaymentAudit**: Comprehensive audit log for all financial actions

**Frontend Integration Needs**:
- **Payment Processing**: Payment intent creation, confirmation handling
- **Payment Status**: Real-time payment status for booking confirmation
- **Admin Refunds**: Staff interface for processing refunds with approval workflows
- **Financial Reporting**: Payment analytics and reconciliation data

**Payment Flow Architecture**:
- Booking creation triggers payment intent generation
- Frontend handles payment collection via mocked Stripe
- Successful payment triggers logistics and notification workflows
- Failed payments trigger retry logic and customer communication

**Key External Relationships**:
- **← bookings/**: Receives payment requests from completed bookings
- **→ bookings/**: Updates booking status based on payment success/failure
- **→ logistics/**: Triggers delivery task creation after successful payment  
- **→ notifications/**: Sends payment confirmations and failure notifications
- **← crm/**: Processes refund requests from staff with audit trails

**MVP Simplifications**:
- Mocked Stripe integration for development
- Simple refund workflow (admin approval required)
- Basic payment retry logic (3 attempts)

---

### **🚚 apps/logistics/ - Delivery Coordination**

**Primary Responsibility**: Physical delivery management and real-time tracking

**Business Logic Ownership**:
- Delivery task creation and driver assignment
- Real-time tracking and status updates
- Customer communication for delivery updates
- Integration with logistics providers (Onfleet initially mocked)
- Failed delivery handling and rescheduling

**Core Data Entities**:
- **DeliveryTask**: Links to booking, tracks pickup/delivery status, driver assignment
- **TrackingUpdate**: Real-time events from logistics provider, customer notifications

**Frontend Integration Needs**:
- **Customer Tracking**: Live delivery status and driver location
- **Admin Task Management**: Staff interface for managing delivery tasks
- **Delivery Analytics**: Success rates, timing metrics, driver performance

**Delivery Workflow**:
- Successful payment triggers delivery task creation
- Tasks assigned to drivers via external logistics platform
- Real-time updates flow from logistics provider to customers
- Delivery completion triggers final notifications and booking closure

**Key External Relationships**:
- **← payments/**: Creates delivery tasks after successful payment confirmation
- **← bookings/**: Uses booking data for pickup/delivery addresses and instructions
- **→ bookings/**: Updates booking status based on delivery progress
- **→ notifications/**: Sends tracking updates and delivery confirmations
- **← crm/**: Staff can monitor and modify delivery tasks

**MVP Simplifications**:
- Mocked Onfleet integration for development
- Basic tracking status updates (created, assigned, in progress, completed)
- Simple delivery failure handling

---

### **📄 apps/documents/ - File Storage & Management**

**Primary Responsibility**: Secure file handling, COI management, and document lifecycle

**Business Logic Ownership**:
- File upload, storage, and secure access via S3
- Certificate of Insurance (COI) processing and validation
- Document categorization and searchability  
- File lifecycle management and cleanup
- Access control and secure URL generation

**Core Data Entities**:
- **Document**: S3-stored files with metadata, associations to bookings/customers
- **COI**: Extended document model with insurance-specific fields and validation

**Frontend Integration Needs**:
- **File Upload**: Secure upload endpoints with progress tracking
- **Document Viewer**: Secure document access and display
- **COI Management**: Staff interface for COI validation and status tracking
- **Document Search**: Find documents by booking, customer, or date range

**File Storage Architecture**:
- Direct uploads to S3 with secure presigned URLs
- Database tracking of all file metadata and associations
- Automatic file categorization and tagging
- Scheduled cleanup of expired or unused files

**Key External Relationships**:
- **← bookings/**: Associates documents with specific bookings
- **← crm/**: Staff upload and manage documents through admin interface
- **→ notifications/**: Alerts for missing/expired COIs
- **S3 Integration**: Direct file storage and retrieval

**MVP Simplifications**:
- Basic COI upload and storage (no OCR or automatic validation)
- Simple file categorization (COI, invoice, receipt)
- Manual document validation by staff

---

### **📧 apps/notifications/ - Communication Hub**

**Primary Responsibility**: All customer and staff communication management

**Business Logic Ownership**:
- Email template management with dynamic variables
- Multi-channel notification delivery (email via SES, future SMS)
- Delivery tracking and failure handling
- Notification scheduling and retry logic
- Communication preference management

**Core Data Entities**:
- **EmailTemplate**: Reusable templates with variable substitution
- **Notification**: Individual communication records with delivery tracking
- **DeliveryLog**: Comprehensive tracking of communication delivery and engagement

**Frontend Integration Needs**:
- **Template Management**: Staff interface for creating and editing email templates
- **Notification History**: Customer and staff views of communication history
- **Delivery Analytics**: Email open rates, delivery success, bounce tracking

**Communication Workflows**:
- Booking events automatically trigger notification creation
- Templates populated with booking/customer data variables
- SES handles email delivery with tracking and bounce management
- Failed communications trigger retry logic and staff alerts

**Key External Relationships**:
- **← bookings/**: Triggered by booking status changes and lifecycle events
- **← payments/**: Sends payment confirmations and failure notifications
- **← logistics/**: Sends delivery tracking updates and completion confirmations
- **← crm/**: Staff can send custom notifications and manage templates
- **SES Integration**: Email delivery and tracking via AWS Simple Email Service

**MVP Simplifications**:
- Email-only communications (no SMS initially)
- Basic template system with simple variable substitution
- Standard notification types (booking confirmation, payment confirmation, delivery updates)

---

### **📊 apps/crm/ - Administrative Command Center**

**Primary Responsibility**: Staff operations interface and business intelligence

**Business Logic Ownership**:
- Real-time dashboard with key performance indicators
- Comprehensive booking management and modification capabilities
- Financial operations including refund processing
- Business reporting and data export functionality
- Audit logging for all administrative actions

**Core Data Entities**:
- **Dashboard**: Daily KPI aggregation and business metrics
- **Report**: Configurable business reports with export capabilities
- **AuditLog**: Complete action tracking for compliance and accountability

**Frontend Integration Needs**:
- **Operations Dashboard**: Real-time KPIs, upcoming bookings, pending actions
- **Booking Management**: Full CRUD interface for all booking operations
- **Financial Interface**: Refund processing, payment tracking, revenue reporting
- **Analytics Views**: Business intelligence dashboards and trend analysis

**Dashboard Metrics**:
- Daily/weekly/monthly booking volumes and revenue
- Service type breakdown and popularity trends
- Payment success rates and processing metrics
- Delivery completion rates and timing analytics
- Customer satisfaction and repeat booking rates

**Administrative Workflows**:
- Staff can view, modify, and cancel any booking
- Refund processing with approval workflows and audit trails
- Customer service actions with complete interaction history
- Business reporting with scheduled generation and delivery

**Key External Relationships**:
- **→ ALL APPS**: CRM interfaces with every system component for management
- **← accounts/**: Authentication and role-based access control
- **← bookings/**: Primary data source for operations and customer service
- **← payments/**: Financial data management and refund processing
- **← logistics/**: Delivery task monitoring and management
- **← documents/**: Document management and COI processing
- **← notifications/**: Communication management and template control

**MVP Simplifications**:
- Basic dashboard with essential KPIs
- Simple booking search and filter capabilities
- Manual report generation (no scheduled reports initially)
- Basic audit logging for critical actions

---

## **System Integration Architecture**

### **Data Flow Patterns**

**Customer Booking Journey**:
```
Frontend Booking Wizard
├─→ services/ (pricing + availability)
├─→ bookings/ (booking creation)  
├─→ payments/ (payment processing)
└─→ logistics/ (delivery coordination)
    └─→ notifications/ (confirmations)
```

**Administrative Operations**:
```
Frontend Admin Dashboard
├─→ crm/ (dashboard data)
├─→ ALL APPS (management operations)
└─→ accounts/ (authentication)
```

**Background Job Workflows**:
```
Celery + Redis Queue
├─→ notifications/ (email sending)
├─→ documents/ (file processing)
├─→ crm/ (report generation)
└─→ logistics/ (delivery updates)
```

### **External Service Integration**

**AWS Services**:
- **S3**: Document storage with presigned URL access
- **SES**: Email delivery with tracking and bounce management
- **IAM**: Service authentication and access control

**Mocked Services (MVP)**:
- **Stripe**: Payment processing with realistic simulation
- **Onfleet**: Delivery coordination with status updates

**Future Integrations**:
- **Blade API**: Customer referrals and partnership integration
- **Google Maps**: Address validation and route optimization

---

## **Development Roadmap**

### **Phase 1: Foundation (Week 1) - "Core Data & Basic APIs"**
**Objective**: Establish core system with basic booking functionality

**Backend Deliverables**:
- All Django apps created with core models
- Basic CRUD APIs for bookings and services
- UUID primary keys and soft delete implementation
- Docker environment fully operational
- Django admin interfaces for all models

**Frontend Dependencies Created**:
- Booking creation and pricing APIs ready
- Service catalog endpoints available
- Basic booking management APIs functional

**Success Criteria**:
- Can create booking through API with pricing calculation
- All models properly related with foreign keys
- Docker setup allows immediate development start

### **Phase 2: Business Logic (Week 2) - "Pricing & Payment Flow"**
**Objective**: Implement complex business rules and mocked payment processing

**Backend Deliverables**:
- Advanced pricing engine with surcharge calculations
- Mocked payment processing with realistic behaviors
- Notification system with SES email integration
- Background job processing with Celery
- Booking workflow from creation through payment

**Frontend Dependencies Created**:
- Real-time pricing APIs with surcharge breakdowns
- Payment processing endpoints (mocked but realistic)
- Email confirmation system operational
- Booking status updates available

**Success Criteria**:
- Complete customer booking flow functional
- Emails sent via SES with proper templates
- Background jobs processing payments and notifications

### **Phase 3: Operations (Week 3) - "File Storage & Admin Interface"**
**Objective**: Document management and staff operational capabilities

**Backend Deliverables**:
- S3 document storage with secure access
- COI upload and basic validation
- CRM dashboard APIs with business metrics
- Staff authentication and role-based permissions
- Administrative booking management capabilities

**Frontend Dependencies Created**:
- File upload endpoints with progress tracking
- Admin dashboard data APIs
- Staff authentication and authorization
- Booking management APIs for admin interface

**Success Criteria**:
- Documents upload to S3 and associate with bookings
- Staff can log in and manage bookings
- Admin dashboard shows real business metrics

### **Phase 4: Production Readiness (Week 4) - "Real Integrations & Polish"**
**Objective**: Replace mocks with production services and optimize performance

**Backend Deliverables**:
- Real Stripe integration replacing mocked payments
- Production-ready configuration and security
- Comprehensive API documentation
- Performance optimization and caching
- Complete test coverage for critical paths

**Frontend Dependencies Completed**:
- All APIs finalized with real payment processing
- Error handling patterns established
- Production-ready authentication flows
- Complete feature parity for MVP launch

**Success Criteria**:
- Real payments processing through Stripe
- System ready for production deployment
- All MVP features tested and documented

---

## **Technical Architecture Decisions**

### **Database Design Principles**
- **UUID Primary Keys**: Enhanced security, distributed system compatibility
- **Soft Deletes**: Data preservation for analytics, audit requirements
- **Optimized Indexes**: Query performance on frequently accessed fields
- **JSON Fields**: Flexible data storage for configurations and metadata

### **API Design Standards**
- **RESTful Conventions**: Predictable endpoint patterns
- **Consistent Response Formats**: Standardized success/error responses
- **Pagination Strategy**: Efficient large dataset handling
- **Version Management**: Future-proof API evolution

### **Security Implementation**
- **Role-Based Access Control**: Admin/Staff permission separation
- **Input Validation**: Comprehensive data sanitization
- **Secure File Storage**: S3 with presigned URL access patterns
- **Audit Logging**: Complete action tracking for compliance

### **Performance Optimization**
- **Database Query Optimization**: Efficient joins and indexes
- **Background Job Processing**: Async operations for user experience
- **Caching Strategy**: Redis for frequently accessed data
- **File Storage Optimization**: Direct S3 upload patterns

---

## **Success Metrics & Monitoring**

### **System Health Indicators**
- **API Response Times**: <200ms for booking operations
- **Background Job Processing**: <30s for email delivery
- **Database Performance**: Query optimization monitoring
- **File Upload Success**: S3 integration reliability

### **Business Metrics Tracking**
- **Booking Conversion Rates**: Wizard completion analytics
- **Payment Success Rates**: Transaction processing monitoring  
- **Customer Service Efficiency**: Admin action tracking
- **Operational Performance**: Delivery completion rates

### **Technical Debt Management**
- **Code Quality Metrics**: Test coverage and maintainability
- **Documentation Currency**: Living document update frequency
- **Integration Health**: External service reliability monitoring
- **Scalability Preparation**: Performance bottleneck identification

---

*This living document evolves with system development and serves as the single source of truth for ToteTaxi's backend architecture, business logic, and integration patterns.*