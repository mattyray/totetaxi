Absolutely! That makes perfect sense. You want **living technical documentation** that serves as both a roadmap and reference guide. When the codebase hits 20-30k lines, you can reference these docs to understand exactly what each piece does and how they interact.

Let me create two comprehensive, modular plans:

---

# **ToteTaxi Backend Technical Documentation & Roadmap**

*Living Document - Django 5.2.5 + DRF 3.16.1 + PostgreSQL*

## **System Architecture Overview**

```
Backend (Django on Fly.io:8005)
├── Core Business Logic
│   ├── bookings/ (Heart of the system - all booking operations)
│   ├── services/ (Pricing engine & availability logic)
│   └── accounts/ (Customer profiles & staff users)
├── Financial Operations  
│   └── payments/ (Stripe integration & financial tracking)
├── Logistics & Operations
│   ├── logistics/ (Onfleet tracking & delivery management)
│   ├── documents/ (COI uploads & file management)
│   └── notifications/ (Email/SMS communications)
├── Administrative
│   └── crm/ (Staff dashboard & reporting)
└── Infrastructure
    ├── config/ (Settings, URLs, Celery)
    └── Background Jobs (Celery + Redis)
```

## **Django Apps Deep Dive**

### **📋 apps/bookings/ - The Heart of ToteTaxi**

**Purpose:** Core business entity handling all booking lifecycle operations  
**Why Critical:** Every other app either feeds into or depends on booking data  
**Database Tables:** `bookings_booking`, `bookings_address`, `bookings_customerprofile`

**Responsibilities:**
- **Booking Model** - Central entity tracking all booking states
- **Address Management** - Pickup/dropoff location handling  
- **Customer Profiles** - Automatic profile creation from bookings
- **Status Management** - Booking lifecycle (pending → paid → scheduled → completed)
- **Business Rules Validation** - Enforce minimum items, date constraints, etc.
- **Booking Numbers** - Human-readable ID generation (TT-2025-001234)

**Key Models:**
```python
class Booking:
    # Identity & Type
    id = UUID (primary key)
    booking_number = CharField (TT-2025-001234)
    booking_type = CharField (mini_move|standard|specialty)
    status = CharField (pending|paid|scheduled|in_progress|completed)
    
    # Business Logic
    customer = ForeignKey(CustomerProfile)
    pickup_address = ForeignKey(Address) 
    dropoff_address = ForeignKey(Address)
    package_type = CharField (petite|standard|full - for mini_moves)
    item_count = PositiveIntegerField (for standard deliveries)
    
    # Pricing Data
    base_price = DecimalField
    surcharges = JSONField ({weekend: 100, holiday: 200})
    coi_fee = DecimalField
    total_price = DecimalField
    
    # External System IDs
    stripe_payment_intent_id = CharField
    onfleet_task_id = CharField
    tracking_url = URLField
    
    # Operations
    notes = TextField (staff notes)
    created_at/updated_at = DateTimeField

class CustomerProfile:
    name/email/phone = CharField
    total_bookings_count = PositiveIntegerField
    preferred_addresses = ManyToManyField(Address)
    created_from_booking = ForeignKey(Booking)
    staff_notes = TextField

class Address:
    line1/line2/city/state/zip_code = CharField
    # Future: lat/lng for route optimization
```

**API Endpoints:**
```python
POST /api/v1/bookings/preview/  # Pricing calculation
POST /api/v1/bookings/         # Create new booking
GET /api/v1/bookings/{id}/     # Booking details
PATCH /api/v1/bookings/{id}/   # Update booking
GET /api/v1/bookings/{id}/confirm/  # Confirmation page data
```

**Inter-App Dependencies:**
- **→ services/**: Gets pricing and availability data
- **→ payments/**: Triggers payment processing
- **→ logistics/**: Creates delivery tasks
- **→ documents/**: Associates COI files
- **→ notifications/**: Sends confirmation emails
- **← crm/**: Staff actions update booking status

---

### **💰 apps/services/ - Pricing Engine & Business Logic**

**Purpose:** All service definitions, pricing rules, and availability logic  
**Why Separate:** Complex pricing changes frequently; needs isolation for testing  
**Database Tables:** `services_miniovepackage`, `services_specialtyitem`, `services_surchargerule`, `services_vanschedule`

**Responsibilities:**
- **Service Catalog** - Mini Move packages, specialty items, standard delivery rules
- **Pricing Calculator** - Complex multi-factor pricing engine
- **Availability Engine** - Van scheduling, specialty item constraints
- **Surcharge Management** - Weekend, holiday, peak date pricing
- **Business Rules** - Minimum items, package constraints, date restrictions

**Key Models:**
```python
class MiniMovePackage:
    name = CharField (Petite|Standard|Full)
    max_items = PositiveIntegerField (15|30|unlimited)
    base_price = DecimalField (995|1725|2490)
    coi_included = BooleanField
    description = TextField
    is_active = BooleanField

class SpecialtyItem:
    item_type = CharField (peloton|surfboard|crib|wardrobe_box)
    name = CharField (display name)
    base_price = DecimalField (500|350|350|275)
    requires_van_availability = BooleanField (True)
    weight_limit = PositiveIntegerField
    special_handling_notes = TextField

class SurchargeRule:
    name = CharField (Weekend|Holiday|Peak Season)
    rule_type = CharField (date_based|day_of_week|custom)
    amount = DecimalField
    is_percentage = BooleanField
    start_date/end_date = DateField
    applies_to_services = ManyToManyField

class VanSchedule:
    date = DateField (unique)
    specialty_items_available = BooleanField
    capacity_override = PositiveIntegerField (null=True)
    surcharge_override = DecimalField (null=True) 
    notes = TextField (Holiday pricing, maintenance day, etc.)
    is_active = BooleanField
```

**Service Classes:**
```python
class PricingCalculator:
    def calculate_mini_move_price(booking_data) -> PriceBreakdown
    def calculate_standard_delivery_price(items, date) -> PriceBreakdown  
    def calculate_specialty_items_price(items, date) -> PriceBreakdown
    def apply_surcharges(base_price, date, service_type) -> DecimalField
    def validate_booking_constraints(booking_data) -> ValidationResult

class AvailabilityChecker:
    def get_available_dates(service_type, days_ahead=30) -> List[Date]
    def check_specialty_item_availability(date) -> Boolean
    def get_van_capacity(date) -> Integer
    def suggest_alternative_dates(requested_date) -> List[Date]
```

**API Endpoints:**
```python
GET /api/v1/services/packages/        # Mini Move packages
GET /api/v1/services/specialty-items/ # Specialty item catalog
GET /api/v1/services/availability/{date}/ # Check availability
POST /api/v1/services/calculate-price/   # Pricing calculator
GET /api/v1/services/surcharges/{date}/  # Get applicable surcharges
```

**Inter-App Dependencies:**
- **← bookings/**: Receives pricing calculation requests
- **→ bookings/**: Validates booking data against business rules

---

### **👤 apps/accounts/ - User Management & Authentication**

**Purpose:** Handle all user types and authentication  
**Why Separate:** Clean separation of user logic from business logic  
**Database Tables:** `auth_user`, `accounts_staffprofile`

**Responsibilities:**
- **Staff User Management** - Admin and Staff roles for CRM
- **Authentication** - Session-based for staff, token-based for API access
- **Customer Profile Integration** - Bridge to bookings' CustomerProfile
- **Permissions** - Role-based access control
- **User Sessions** - Login/logout, password management

**Key Models:**
```python
# Extends Django's built-in User model
class User(AbstractUser):
    # Uses Django's built-in fields: username, email, password, etc.
    role = CharField(choices=[('admin', 'Admin'), ('staff', 'Staff')])
    phone = CharField(blank=True)
    is_active = BooleanField(default=True)
    date_joined = DateTimeField(auto_now_add=True)
    
class StaffProfile:
    user = OneToOneField(User)
    employee_id = CharField(unique=True)
    department = CharField(choices=[('operations', 'Operations'), ('customer_service', 'Customer Service')])
    hire_date = DateField()
    permissions_level = CharField(choices=[('view_only', 'View Only'), ('full_access', 'Full Access')])
    notes = TextField(blank=True)
    
# Note: CustomerProfile lives in bookings/ app since it's booking-centric
```

**Permission Classes:**
```python
class IsAdminUser(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'

class IsStaffUser(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['admin', 'staff']

class CanRefundBookings(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'
```

**API Endpoints:**
```python
POST /api/v1/auth/login/     # Staff login
POST /api/v1/auth/logout/    # Staff logout  
GET /api/v1/auth/user/       # Current user info
POST /api/v1/auth/change-password/  # Password change
GET /api/v1/users/staff/     # Staff list (admin only)
```

**Inter-App Dependencies:**
- **→ crm/**: Provides user context for CRM actions
- **→ bookings/**: Links to CustomerProfile for booking history
- **Authentication Middleware**: Used across all protected endpoints

---

### **💳 apps/payments/ - Financial Operations & Stripe Integration**

**Purpose:** All payment processing, financial tracking, and Stripe integration  
**Why Separate:** Financial operations need isolation, security, and audit trails  
**Database Tables:** `payments_payment`, `payments_refund`, `payments_paymentaudit`

**Responsibilities:**
- **Stripe Integration** - Payment Intents, webhooks, customer management
- **Payment Processing** - Handle payment lifecycle
- **Refund Management** - Process refunds with audit trails  
- **Financial Audit** - Track all money movements
- **Webhook Security** - Validate and process Stripe webhooks
- **Idempotency** - Ensure payment operations are idempotent

**Key Models:**
```python
class Payment:
    booking = OneToOneField('bookings.Booking')
    stripe_payment_intent_id = CharField(unique=True)
    stripe_customer_id = CharField(null=True)
    
    # Payment Details
    amount_cents = PositiveIntegerField  # Always store in cents
    currency = CharField(default='usd')
    status = CharField(choices=[
        ('pending', 'Pending'),
        ('processing', 'Processing'), 
        ('succeeded', 'Succeeded'),
        ('failed', 'Failed'),
        ('canceled', 'Canceled')
    ])
    
    # Stripe Data
    payment_method_id = CharField(null=True)
    stripe_fee_cents = PositiveIntegerField(default=0)
    stripe_webhook_received = BooleanField(default=False)
    
    # Audit Trail
    created_at = DateTimeField(auto_now_add=True)
    succeeded_at = DateTimeField(null=True)
    failed_at = DateTimeField(null=True)
    failure_reason = TextField(blank=True)

class Refund:
    payment = ForeignKey(Payment)
    stripe_refund_id = CharField(unique=True)
    amount_cents = PositiveIntegerField
    reason = CharField(choices=[
        ('requested_by_customer', 'Customer Request'),
        ('fraudulent', 'Fraudulent'),
        ('service_issue', 'Service Issue')
    ])
    status = CharField(choices=[('pending', 'Pending'), ('succeeded', 'Succeeded'), ('failed', 'Failed')])
    processed_by = ForeignKey('accounts.User')
    notes = TextField
    created_at = DateTimeField(auto_now_add=True)
    processed_at = DateTimeField(null=True)

class PaymentAudit:
    payment = ForeignKey(Payment)
    action = CharField(choices=[('created', 'Created'), ('succeeded', 'Succeeded'), ('refunded', 'Refunded')])
    user = ForeignKey('accounts.User', null=True)  # null for webhook actions
    details = JSONField  # Store relevant data for audit
    ip_address = GenericIPAddressField(null=True)
    timestamp = DateTimeField(auto_now_add=True)
```

**Service Classes:**
```python
class StripeService:
    def create_payment_intent(booking, customer_email) -> stripe.PaymentIntent
    def confirm_payment(payment_intent_id) -> Payment
    def process_webhook(webhook_data, signature) -> WebhookResult
    def create_refund(payment, amount, reason) -> Refund
    def get_payment_methods(customer_id) -> List[PaymentMethod]

class PaymentProcessor:
    def process_successful_payment(payment) -> ProcessingResult
    def handle_failed_payment(payment, error) -> ProcessingResult  
    def validate_webhook_signature(payload, signature) -> Boolean
    def create_audit_entry(payment, action, user=None) -> PaymentAudit
```

**API Endpoints:**
```python
POST /api/v1/payments/create-intent/      # Create Stripe PaymentIntent
POST /api/v1/payments/confirm/            # Confirm payment
POST /api/v1/webhooks/stripe/             # Stripe webhook handler
POST /api/v1/payments/{id}/refund/        # Process refund (admin only)
GET /api/v1/payments/{id}/audit/          # Payment audit trail
```

**Webhook Handling:**
```python
@csrf_exempt
def stripe_webhook_view(request):
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    
    # Validate webhook signature
    if not StripeService.validate_webhook_signature(payload, sig_header):
        return HttpResponse(status=400)
    
    # Process webhook
    webhook_data = json.loads(payload)
    if webhook_data['type'] == 'payment_intent.succeeded':
        PaymentProcessor.process_successful_payment(webhook_data)
    elif webhook_data['type'] == 'payment_intent.payment_failed':
        PaymentProcessor.handle_failed_payment(webhook_data)
        
    return HttpResponse(status=200)
```

**Inter-App Dependencies:**
- **← bookings/**: Receives payment requests
- **→ bookings/**: Updates booking status after payment
- **→ logistics/**: Triggers Onfleet task creation after successful payment
- **→ notifications/**: Sends payment confirmation emails
- **← crm/**: Processes refund requests from staff

---

### **🚚 apps/logistics/ - Delivery Management & Onfleet Integration**

**Purpose:** Handle all delivery logistics, tracking, and driver coordination  
**Why Separate:** Complex external API integration with its own data lifecycle  
**Database Tables:** `logistics_deliverytask`, `logistics_trackingupdate`

**Responsibilities:**
- **Onfleet Integration** - Create tasks, manage drivers, track deliveries
- **Task Management** - Convert bookings into delivery tasks
- **Real-time Tracking** - Process webhook updates from Onfleet
- **Route Optimization** - Coordinate pickup/delivery scheduling
- **Driver Communication** - Handle delivery instructions and special requirements
- **Status Synchronization** - Keep ToteTaxi and Onfleet data in sync

**Key Models:**
```python
class DeliveryTask:
    booking = OneToOneField('bookings.Booking')
    onfleet_task_id = CharField(unique=True)
    
    # Task Details  
    task_type = CharField(choices=[('pickup', 'Pickup'), ('delivery', 'Delivery')])
    scheduled_date = DateField
    scheduled_time_window_start = TimeField
    scheduled_time_window_end = TimeField
    
    # Addresses & Instructions
    pickup_address_formatted = TextField
    delivery_address_formatted = TextField
    special_instructions = TextField
    access_code = CharField(blank=True)
    contact_person = CharField
    contact_phone = CharField
    
    # Status & Tracking
    status = CharField(choices=[
        ('created', 'Created'),
        ('assigned', 'Assigned to Driver'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('failed', 'Failed')
    ])
    onfleet_tracking_url = URLField
    driver_name = CharField(blank=True)
    driver_phone = CharField(blank=True)
    
    # Timing
    created_at = DateTimeField(auto_now_add=True)
    assigned_at = DateTimeField(null=True)
    started_at = DateTimeField(null=True) 
    completed_at = DateTimeField(null=True)
    
class TrackingUpdate:
    delivery_task = ForeignKey(DeliveryTask)
    onfleet_event_id = CharField(unique=True)  # Prevent duplicate processing
    
    # Event Details
    event_type = CharField(choices=[
        ('task_assigned', 'Task Assigned'),
        ('task_started', 'Task Started'),
        ('task_completed', 'Task Completed'),
        ('task_failed', 'Task Failed'),
        ('eta_updated', 'ETA Updated')
    ])
    event_data = JSONField  # Store full Onfleet webhook data
    driver_location_lat = DecimalField(null=True)
    driver_location_lng = DecimalField(null=True)
    estimated_arrival = DateTimeField(null=True)
    
    # Processing
    timestamp = DateTimeField(auto_now_add=True)
    processed = BooleanField(default=False)
    processing_error = TextField(blank=True)
```

**Service Classes:**
```python
class OnfleetService:
    def create_pickup_task(booking) -> OnfleetTask
    def create_delivery_task(booking) -> OnfleetTask  
    def update_task_details(task_id, details) -> OnfleetTask
    def get_task_tracking_url(task_id) -> str
    def get_driver_location(task_id) -> Location
    def cancel_task(task_id) -> CancelResult

class DeliveryManager:
    def create_delivery_tasks_for_booking(booking) -> List[DeliveryTask]
    def process_onfleet_webhook(webhook_data) -> ProcessingResult
    def update_delivery_status(task, status) -> DeliveryTask
    def send_tracking_notifications(task, event_type) -> NotificationResult
    def handle_failed_delivery(task, reason) -> FailureResult

class TrackingService:
    def get_live_tracking_data(booking) -> TrackingData
    def calculate_eta(task) -> datetime
    def get_delivery_history(booking) -> List[TrackingUpdate]
    def notify_customer_of_status_change(task, event_type) -> NotificationResult
```

**API Endpoints:**
```python
POST /api/v1/logistics/create-task/           # Create Onfleet task (internal)
GET /api/v1/logistics/tracking/{booking_id}/  # Get live tracking data
POST /api/v1/webhooks/onfleet/               # Onfleet webhook handler  
GET /api/v1/logistics/tasks/{id}/            # Task details (staff)
PATCH /api/v1/logistics/tasks/{id}/          # Update task (staff)
```

**Webhook Processing:**
```python
class OnfleetWebhookProcessor:
    def process_webhook(self, webhook_data):
        event_type = webhook_data.get('actionContext', {}).get('type')
        task_id = webhook_data.get('taskId')
        
        # Find our DeliveryTask
        task = DeliveryTask.objects.get(onfleet_task_id=task_id)
        
        # Create tracking update record
        TrackingUpdate.objects.create(
            delivery_task=task,
            onfleet_event_id=webhook_data.get('triggerId'),
            event_type=self.map_onfleet_event(event_type),
            event_data=webhook_data,
            timestamp=timezone.now()
        )
        
        # Update task status
        if event_type == 'TASK_COMPLETED':
            task.status = 'completed'
            task.completed_at = timezone.now()
            task.save()
            
            # Trigger notifications
            NotificationService.send_delivery_confirmation(task.booking)
            
        # Update booking status
        BookingService.sync_status_from_delivery(task.booking, task.status)
```

**Inter-App Dependencies:**
- **← payments/**: Creates tasks after successful payment
- **← bookings/**: Receives booking data for task creation
- **→ bookings/**: Updates booking status based on delivery progress
- **→ notifications/**: Sends tracking updates to customers
- **← crm/**: Staff can view/modify delivery tasks

---

### **📄 apps/documents/ - File Management & COI Handling**

**Purpose:** Handle all file uploads, storage, and document management  
**Why Separate:** File operations have different security, storage, and lifecycle needs  
**Database Tables:** `documents_document`, `documents_coi`

**Responsibilities:**
- **COI Management** - Certificate of Insurance uploads and tracking
- **File Storage** - S3/Cloudinary integration for file handling
- **Document Validation** - Ensure file types, sizes, and content are valid
- **Access Control** - Secure file access with proper permissions
- **File Lifecycle** - Archive, delete, and manage file retention
- **Document Search** - Find documents by booking, customer, or date

**Key Models:**
```python
class Document:
    # File Identity
    file_uuid = UUIDField(primary_key=True)
    original_filename = CharField
    stored_filename = CharField  # S3 key or file path
    file_size = PositiveIntegerField  # In bytes
    mime_type = CharField
    file_hash = CharField  # For duplicate detection
    
    # Classification
    document_type = CharField(choices=[
        ('coi', 'Certificate of Insurance'),
        ('permit', 'Building Permit'),
        ('invoice', 'Invoice'),
        ('receipt', 'Receipt'),
        ('damage_report', 'Damage Report')
    ])
    category = CharField(choices=[
        ('booking_related', 'Booking Related'),
        ('customer_related', 'Customer Related'),
        ('operational', 'Operational')
    ])
    
    # Associations
    booking = ForeignKey('bookings.Booking', null=True)
    customer = ForeignKey('bookings.CustomerProfile', null=True)
    
    # Storage & Access
    storage_provider = CharField(choices=[('s3', 'AWS S3'), ('cloudinary', 'Cloudinary')])
    public_url = URLField(blank=True)
    access_level = CharField(choices=[('public', 'Public'), ('private', 'Private'), ('restricted', 'Restricted')])
    
    # Metadata
    uploaded_by = ForeignKey('accounts.User')
    upload_source = CharField(choices=[('web_upload', 'Web Upload'), ('api_upload', 'API Upload'), ('email', 'Email')])
    tags = JSONField(default=list)  # ['urgent', 'reviewed', 'archived']
    description = TextField(blank=True)
    
    # Lifecycle
    created_at = DateTimeField(auto_now_add=True)
    last_accessed = DateTimeField(null=True)
    expires_at = DateTimeField(null=True)
    is_active = BooleanField(default=True)
    deleted_at = DateTimeField(null=True)

class COI(Document):
    # COI-specific fields
    insurance_company = CharField
    policy_number = CharField
    coverage_amount = DecimalField
    effective_date = DateField
    expiration_date = DateField
    certificate_holder = CharField  # Usually "ToteTaxi"
    
    # Validation Status
    validation_status = CharField(choices=[
        ('pending', 'Pending Review'),
        ('valid', 'Valid'),
        ('invalid', 'Invalid'),
        ('expired', 'Expired')
    ])
    validated_by = ForeignKey('accounts.User', null=True)
    validated_at = DateTimeField(null=True)
    validation_notes = TextField(blank=True)
    
    # Automatic Checks
    auto_validation_passed = BooleanField(default=False)
    auto_validation_errors = JSONField(default=list)
```

**Service Classes:**
```python
class DocumentStorageService:
    def upload_file(file, document_type, booking=None) -> Document
    def generate_secure_url(document, expires_in_hours=24) -> str
    def delete_file(document) -> DeletionResult
    def get_file_content(document) -> bytes
    def validate_file_type(file, allowed_types) -> ValidationResult

class COIProcessor:
    def process_coi_upload(file, booking) -> COI
    def extract_coi_data(file) -> COIData  # OCR/parsing
    def validate_coi_requirements(coi_data) -> ValidationResult
    def check_expiration_dates() -> List[COI]  # Scheduled task
    def auto_validate_coi(coi) -> ValidationResult

class DocumentManager:
    def create_document_from_upload(file, metadata) -> Document
    def search_documents(filters) -> QuerySet[Document]
    def archive_old_documents(days_old=365) -> ArchiveResult
    def get_booking_documents(booking) -> List[Document]
    def generate_document_report(date_range) -> DocumentReport
```

**API Endpoints:**
```python
POST /api/v1/documents/upload/               # Upload document
POST /api/v1/documents/coi/upload/           # COI-specific upload
GET /api/v1/documents/{id}/                  # Get document details
GET /api/v1/documents/{id}/download/         # Download file
DELETE /api/v1/documents/{id}/               # Delete document
GET /api/v1/bookings/{id}/documents/         # Get booking documents
POST /api/v1/documents/{id}/validate/        # Validate COI (staff)
GET /api/v1/documents/search/                # Search documents
```

**File Upload Flow:**
```python
class DocumentUploadView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        file = request.FILES.get('file')
        booking_id = request.data.get('booking_id')
        document_type = request.data.get('document_type')
        
        # Validate file
        if not DocumentStorageService.validate_file_type(file, ['pdf', 'jpg', 'png']):
            return Response({'error': 'Invalid file type'}, status=400)
            
        # Upload to S3/Cloudinary
        document = DocumentStorageService.upload_file(
            file=file,
            document_type=document_type,
            booking_id=booking_id,
            uploaded_by=request.user
        )
        
        # Special processing for COIs
        if document_type == 'coi':
            COIProcessor.process_coi_upload(document)
            
        return Response(DocumentSerializer(document).data, status=201)
```

**Inter-App Dependencies:**
- **← bookings/**: Associates documents with bookings
- **← crm/**: Staff upload and manage documents
- **→ notifications/**: Send alerts for missing/expired COIs
- **Storage Integration**: S3 or Cloudinary for file storage

---

### **📧 apps/notifications/ - Communication Management**

**Purpose:** Handle all customer and staff communications  
**Why Separate:** Email/SMS logic is complex with templates, delivery tracking, and external APIs  
**Database Tables:** `notifications_emailtemplate`, `notifications_notification`, `notifications_deliverylog`

**Responsibilities:**
- **Email Templates** - Dynamic template management with variables
- **Postmark Integration** - Reliable email delivery with tracking
- **SMS Integration** - Optional SMS notifications via Twilio
- **Notification Scheduling** - Send notifications at optimal times  
- **Delivery Tracking** - Track email opens, clicks, bounces
- **Multi-channel Communication** - Email, SMS, and future channels

**Key Models:**
```python
class EmailTemplate:
    name = CharField(unique=True)  # 'booking_confirmation', 'tracking_update'
    subject_template = CharField
    html_template = TextField
    text_template = TextField  # Fallback for non-HTML clients
    
    # Template Variables
    available_variables = JSONField(default=list)  # ['booking_number', 'customer_name', 'total_price']
    variable_descriptions = JSONField(default=dict)  # For staff reference
    
    # Settings
    from_email = EmailField
    from_name = CharField
    reply_to = EmailField(blank=True)
    is_active = BooleanField(default=True)
    
    # Versioning & Testing
    version = PositiveIntegerField(default=1)
    test_data = JSONField(default=dict)  # For template preview
    
    # Audit
    created_by = ForeignKey('accounts.User')
    updated_by = ForeignKey('accounts.User')
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)

class Notification:
    # Identity & Routing
    notification_uuid = UUIDField(primary_key=True)
    notification_type = CharField(choices=[
        ('booking_confirmation', 'Booking Confirmation'),
        ('payment_confirmation', 'Payment Confirmation'),
        ('tracking_update', 'Tracking Update'),
        ('delivery_confirmation', 'Delivery Confirmation'),
        ('coi_reminder', 'COI Reminder'),
        ('booking_reminder', 'Booking Reminder')
    ])
    
    # Recipients
    recipient_email = EmailField
    recipient_phone = CharField(blank=True)  # For SMS
    recipient_name = CharField
    
    # Content
    email_template = ForeignKey(EmailTemplate, null=True)
    subject = CharField
    html_content = TextField
    text_content = TextField
    template_variables = JSONField(default=dict)
    
    # Associations
    booking = ForeignKey('bookings.Booking', null=True)
    customer = ForeignKey('bookings.CustomerProfile', null=True)
    
    # Scheduling & Delivery
    scheduled_for = DateTimeField
    sent_at = DateTimeField(null=True)
    delivery_status = CharField(choices=[
        ('pending', 'Pending'),
        ('scheduled', 'Scheduled'),
        ('sent', 'Sent'),
        ('delivered', 'Delivered'),
        ('opened', 'Opened'),
        ('clicked', 'Clicked'),
        ('bounced', 'Bounced'),
        ('failed', 'Failed')
    ])
    
    # External System IDs
    postmark_message_id = CharField(blank=True)
    twilio_message_id = CharField(blank=True)
    
    # Retry Logic
    retry_count = PositiveIntegerField(default=0)
    max_retries = PositiveIntegerField(default=3)
    next_retry_at = DateTimeField(null=True)
    
    # Metadata
    created_at = DateTimeField(auto_now_add=True)
    created_by = ForeignKey('accounts.User', null=True)  # null for automated

class DeliveryLog:
    notification = ForeignKey(Notification)
    event_type = CharField(choices=[
        ('sent', 'Sent'),
        ('delivered', 'Delivered'),
        ('opened', 'Opened'),
        ('clicked', 'Clicked'),
        ('bounced', 'Bounced'),
        ('complained', 'Spam Complaint')
    ])
    
    # Event Data
    timestamp = DateTimeField
    event_data = JSONField  # Raw webhook data
    user_agent = TextField(blank=True)
    ip_address = GenericIPAddressField(null=True)
    link_clicked = URLField(blank=True)
    
    # Processing
    processed_at = DateTimeField(auto_now_add=True)
```

**Service Classes:**
```python
class NotificationService:
    def send_booking_confirmation(booking) -> Notification
    def send_payment_confirmation(booking) -> Notification
    def send_tracking_update(booking, tracking_info) -> Notification
    def send_coi_reminder(booking) -> Notification
    def schedule_booking_reminder(booking, send_at) -> Notification
    def send_custom_notification(template, recipient, variables) -> Notification

class EmailTemplateEngine:
    def render_template(template, variables) -> RenderedEmail
    def validate_template_syntax(template) -> ValidationResult
    def preview_template(template, test_data) -> PreviewResult
    def get_available_variables(notification_type) -> List[str]

class PostmarkService:
    def send_email(notification) -> SendResult
    def process_webhook(webhook_data) -> WebhookResult
    def get_delivery_stats(message_id) -> DeliveryStats
    def handle_bounce(webhook_data) -> BounceResult
    def handle_complaint(webhook_data) -> ComplaintResult

class SMSService:
    def send_sms(notification) -> SendResult
    def process_delivery_receipt(receipt_data) -> ReceiptResult
    def handle_opt_out(phone_number) -> OptOutResult
```

**Template Variables System:**
```python
class TemplateVariableProvider:
    @staticmethod
    def get_booking_variables(booking):
        return {
            'booking_number': booking.booking_number,
            'customer_name': booking.customer.name,
            'pickup_address': booking.pickup_address.formatted,
            'delivery_address': booking.dropoff_address.formatted,
            'total_price': f"${booking.total_price}",
            'service_type': booking.get_booking_type_display(),
            'tracking_url': booking.tracking_url or '',
            'pickup_window': booking.pickup_window,
            'created_date': booking.created_at.strftime('%B %d, %Y'),
        }
    
    @staticmethod 
    def get_payment_variables(payment):
        return {
            'amount_paid': f"${payment.amount_cents / 100}",
            'payment_method': payment.get_payment_method_display(),
            'transaction_id': payment.stripe_payment_intent_id,
            'payment_date': payment.succeeded_at.strftime('%B %d, %Y %I:%M %p'),
        }
```

**API Endpoints:**
```python
POST /api/v1/notifications/send/              # Send notification (staff)
GET /api/v1/notifications/templates/          # List email templates
POST /api/v1/notifications/templates/         # Create template (admin)
POST /api/v1/notifications/templates/{id}/preview/  # Preview template
GET /api/v1/notifications/{id}/delivery-log/  # Delivery tracking
POST /api/v1/webhooks/postmark/              # Postmark webhook
POST /api/v1/webhooks/twilio/                # Twilio webhook (future)
```

**Inter-App Dependencies:**
- **← bookings/**: Triggered by booking status changes
- **← payments/**: Sends payment confirmations
- **← logistics/**: Sends tracking updates
- **← crm/**: Staff can send custom notifications
- **→ External APIs**: Postmark, Twilio

---

### **📊 apps/crm/ - Staff Dashboard & Administrative Operations**

**Purpose:** Staff-facing interface for managing all ToteTaxi operations  
**Why Separate:** Complex admin logic, reporting, and UI that's distinct from customer-facing APIs  
**Database Tables:** `crm_dashboard`, `crm_report`, `crm_auditlog`

**Responsibilities:**
- **Operations Dashboard** - Real-time KPIs, upcoming bookings, alerts
- **Booking Management** - Staff can view, modify, and manage all bookings
- **Reporting System** - Revenue reports, operational metrics, data exports
- **Staff Actions** - Refunds, COI uploads, Onfleet task management
- **Audit Logging** - Track all staff actions for accountability
- **Data Export** - CSV exports for accounting and analysis

**Key Models:**
```python
class Dashboard:
    # KPI Tracking
    date = DateField(unique=True)
    total_bookings = PositiveIntegerField
    total_revenue_cents = PositiveBigIntegerField
    pending_bookings = PositiveIntegerField
    completed_bookings = PositiveIntegerField
    
    # Service Breakdown
    mini_move_bookings = PositiveIntegerField
    standard_delivery_bookings = PositiveIntegerField
    specialty_item_bookings = PositiveIntegerField
    
    # Financial Metrics
    average_booking_value_cents = PositiveIntegerField
    refunded_amount_cents = PositiveIntegerField
    outstanding_coi_count = PositiveIntegerField
    
    # Operational Metrics
    onfleet_tasks_created = PositiveIntegerField
    delivery_success_rate = DecimalField(max_digits=5, decimal_places=2)
    average_delivery_time_hours = DecimalField(max_digits=4, decimal_places=1)
    
    # Auto-generated daily
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)

class Report:
    name = CharField
    report_type = CharField(choices=[
        ('revenue', 'Revenue Report'),
        ('operational', 'Operational Report'),
        ('customer', 'Customer Report'),
        ('custom', 'Custom Report')
    ])
    
    # Report Configuration
    date_range_start = DateField
    date_range_end = DateField
    filters = JSONField(default=dict)  # Service types, status, etc.
    grouping = CharField(choices=[('daily', 'Daily'), ('weekly', 'Weekly'), ('monthly', 'Monthly')])
    
    # Content
    data = JSONField  # Generated report data
    summary_stats = JSONField  # Key metrics summary
    file_path = CharField(blank=True)  # For CSV exports
    
    # Generation Info
    generated_by = ForeignKey('accounts.User')
    generated_at = DateTimeField(auto_now_add=True)
    is_scheduled = BooleanField(default=False)
    next_generation = DateTimeField(null=True)

class AuditLog:
    # Action Details
    action_id = UUIDField(primary_key=True)
    action_type = CharField(choices=[
        ('booking_created', 'Booking Created'),
        ('booking_updated', 'Booking Updated'),
        ('payment_refunded', 'Payment Refunded'),
        ('coi_uploaded', 'COI Uploaded'),
        ('onfleet_task_created', 'Onfleet Task Created'),
        ('notification_sent', 'Notification Sent'),
        ('report_generated', 'Report Generated')
    ])
    
    # Context
    user = ForeignKey('accounts.User')
    booking = ForeignKey('bookings.Booking', null=True)
    target_model = CharField(blank=True)  # Model name
    target_id = CharField(blank=True)     # Object ID
    
    # Data
    old_values = JSONField(default=dict)
    new_values = JSONField(default=dict)
    action_details = TextField
    
    # Request Info
    ip_address = GenericIPAddressField()
    user_agent = TextField
    session_id = CharField(blank=True)
    
    # Timing
    timestamp = DateTimeField(auto_now_add=True)
```

**Service Classes:**
```python
class DashboardService:
    def get_dashboard_data(date_range) -> DashboardData
    def calculate_daily_metrics(date) -> Dashboard
    def get_upcoming_bookings(days_ahead=7) -> List[Booking]
    def get_pending_actions() -> PendingActions  # Missing COIs, etc.
    def refresh_dashboard_cache() -> CacheRefreshResult

class ReportGenerator:
    def generate_revenue_report(date_range, filters) -> Report
    def generate_operational_report(date_range) -> Report
    def generate_customer_report(date_range) -> Report
    def export_bookings_csv(filters) -> CSVFile
    def schedule_recurring_report(report_config) -> ScheduledReport

class StaffActionService:
    def create_onfleet_task(booking, user) -> OnfleetResult
    def upload_coi(booking, file, user) -> COIResult
    def process_refund(booking, amount, reason, user) -> RefundResult
    def update_booking_notes(booking, notes, user) -> UpdateResult
    def mark_booking_complete(booking, user) -> CompletionResult
    def resend_notification(booking, notification_type, user) -> NotificationResult

class AuditLogger:
    def log_action(user, action_type, details, **kwargs) -> AuditLog
    def log_booking_change(user, booking, old_values, new_values) -> AuditLog
    def log_refund(user, payment, refund) -> AuditLog
    def get_user_activity(user, date_range) -> List[AuditLog]
    def get_booking_history(booking) -> List[AuditLog]
```

**API Endpoints:**
```python
# Dashboard
GET /api/v1/crm/dashboard/                    # Main dashboard data
GET /api/v1/crm/kpis/                         # Key performance indicators
GET /api/v1/crm/upcoming-bookings/           # Next 7 days
GET /api/v1/crm/pending-actions/             # Items needing attention

# Booking Management
GET /api/v1/crm/bookings/                    # Paginated booking list
GET /api/v1/crm/bookings/{id}/               # Booking details
PATCH /api/v1/crm/bookings/{id}/             # Update booking
POST /api/v1/crm/bookings/{id}/actions/      # Staff actions

# Reporting
POST /api/v1/crm/reports/generate/           # Generate report
GET /api/v1/crm/reports/                     # List reports
GET /api/v1/crm/reports/{id}/download/       # Download CSV
POST /api/v1/crm/export/bookings/            # Export bookings

# Audit
GET /api/v1/crm/audit/user/{user_id}/        # User activity
GET /api/v1/crm/audit/booking/{booking_id}/  # Booking history
```

**Staff Action Examples:**
```python
class BookingActionsView(APIView):
    permission_classes = [IsStaffUser]
    
    def post(self, request, booking_id):
        booking = get_object_or_404(Booking, id=booking_id)
        action_type = request.data.get('action_type')
        
        if action_type == 'create_onfleet_task':
            result = StaffActionService.create_onfleet_task(
                booking=booking,
                user=request.user
            )
            AuditLogger.log_action(
                user=request.user,
                action_type='onfleet_task_created',
                details=f'Created Onfleet task for {booking.booking_number}',
                booking=booking
            )
            
        elif action_type == 'process_refund':
            amount = Decimal(request.data.get('amount'))
            reason = request.data.get('reason')
            
            result = StaffActionService.process_refund(
                booking=booking,
                amount=amount,
                reason=reason,
                user=request.user
            )
            
        return Response(result.to_dict())
```

**Inter-App Dependencies:**
- **→ ALL APPS**: CRM interfaces with every other app for management
- **← accounts/**: User authentication and permissions
- **← bookings/**: Primary data source for operations
- **← payments/**: Financial data and refund processing
- **← logistics/**: Delivery task management
- **← documents/**: File upload and COI management
- **← notifications/**: Communication management

---

## **🔧 config/ - Infrastructure & Settings**

**Purpose:** Project configuration, URL routing, and infrastructure setup  

**Key Files:**
```python
# config/settings.py - Environment-based configuration
# config/urls.py - Main URL routing  
# config/celery.py - Background job configuration
# config/wsgi.py - Production WSGI application
# config/asgi.py - Async application (future WebSocket support)
```

**Background Jobs (Celery + Redis):**
```python
# Common Celery tasks across apps
@shared_task
def create_onfleet_task_async(booking_id):
    booking = Booking.objects.get(id=booking_id)
    OnfleetService.create_pickup_task(booking)

@shared_task  
def send_booking_confirmation_async(booking_id):
    booking = Booking.objects.get(id=booking_id)
    NotificationService.send_booking_confirmation(booking)

@shared_task
def generate_daily_dashboard_metrics():
    DashboardService.calculate_daily_metrics(timezone.now().date())

@shared_task
def check_expired_cois():
    expired_cois = COIProcessor.check_expiration_dates()
    for coi in expired_cois:
        NotificationService.send_coi_expiration_alert(coi.booking)
```

---

## **📊 Development Phases & Priorities**

### **Phase 1: Core Foundation (Weeks 1-2)**
1. **Bookings Models** - `Booking`, `CustomerProfile`, `Address`
2. **Services Models** - `MiniMovePackage`, `SpecialtyItem`, `SurchargeRule`
3. **Basic APIs** - Booking creation, pricing preview
4. **Admin Integration** - Django admin for all models

### **Phase 2: Payment Integration (Weeks 3-4)**  
1. **Payments Models** - `Payment`, `Refund`, `PaymentAudit`
2. **Stripe Integration** - Payment Intents, webhooks
3. **Background Jobs** - Celery task processing
4. **Notification System** - Email confirmations

### **Phase 3: Operations & CRM (Weeks 5-6)**
1. **Logistics Models** - `DeliveryTask`, `TrackingUpdate`
2. **Documents System** - `Document`, `COI`
3. **CRM Interface** - Staff dashboard, reporting
4. **Full Workflow** - End-to-end booking process

### **Phase 4: Polish & Production (Week 7)**
1. **Testing** - Unit tests, integration tests
2. **Performance** - Query optimization, caching
3. **Deployment** - Fly.io production setup
4. **Monitoring** - Logging, error tracking

This living document will evolve as we build each component. Each app is designed to be modular and testable, with clear boundaries and well-defined interactions.

---

*Next: Frontend Technical Documentation & Roadmap*