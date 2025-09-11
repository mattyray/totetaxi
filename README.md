Perfect - here are the specific integrations to focus on. Let me create the focused living documentation:

# ToteTaxi Living Documentation

## AI Context Preservation System

This documentation serves as shared project memory for AI-assisted development, preserving architectural decisions, business logic, and integration patterns for immediate technical discussions without context rebuilding.

---

## Project Overview & Business Context

**ToteTaxi:** Luxury delivery service platform replacing existing Typeform-based system. Founded 2016, launched 2018 by Danielle Candela. Handles Manhattan/Brooklyn to Hamptons logistics with significant business complexity.

**Current System Replacement:** Moving from Typeform → Google Doc → OnFleet workflow to integrated Django + React platform

**Target Customers:**
- **Primary:** Women 28-45, weekending families with bulky gear (NYC → Hamptons, Brooklyn → Hamptons)
- **Secondary:** Blade travelers, HNW individuals, brands (NYC/CT/NJ ↔ Hamptons, local Hamptons deliveries)

---

## Current System State & Implementation Status

**Backend:** Production-ready Django with 9 apps, all APIs functional
**Frontend:** Foundation complete, booking wizard 60% implemented (3/5 steps working)

**Working Components:**
- Service selection with real-time pricing
- Date/time selection with calendar availability and surcharge display
- Address forms with validation (text visibility issues resolved)

**In Progress:**
- Customer info step (guest vs. authenticated user handling)
- Payment step (Stripe integration skeleton)

---

## Strategic Frontend Architecture

### **Core Platform Components**
```
ToteTaxi Frontend Platform
├── Marketing Site (Mobile-Responsive)
│   ├── SEO optimization & luxury positioning
│   ├── Service education & trust building
│   └── Clear conversion paths to booking
├── Booking Wizard (Dual-Mode)
│   ├── Guest checkout flow (no account required)
│   ├── Authenticated user flow (enhanced experience)
│   ├── Real-time pricing & availability
│   └── Mobile-friendly multi-step process
├── Customer Dashboard
│   ├── Booking history & tracking
│   ├── Saved addresses & payment methods
│   ├── Profile management & preferences
│   └── Support & communication
├── Staff Dashboard
│   ├── Booking management & customer support
│   ├── Driver assignment & OnFleet integration
│   ├── CRM and customer communication
│   └── Operational oversight
└── Design System
    ├── Mobile-responsive components
    └── Easy client customization patterns
```

---

## Required Integration Architecture

### **AWS S3 Cloud Storage**
**Purpose:** File storage for customer documents, COI certificates, receipts
**Integration Points:**
- Document upload in booking wizard
- COI certificate storage and retrieval
- Receipt and invoice storage
- Staff document management

### **AWS SES Email Notifications**
**Purpose:** Automated email communication system
**Integration Points:**
- Booking confirmations and receipts
- Status updates and delivery notifications
- Customer support communications
- Staff notifications and alerts

### **CRM Integration**
**Purpose:** Customer relationship management and communication tracking
**Integration Points:**
- Customer profile enhancement
- Communication history logging
- Support ticket management
- Customer lifecycle tracking

### **OnFleet Integration**
**Purpose:** Driver management and delivery tracking
**Integration Points:**
- Automatic task creation from bookings
- Driver assignment and routing
- Real-time delivery tracking
- Status synchronization with customer dashboard

### **Stripe Payment Processing**
**Purpose:** Secure payment processing and subscription management
**Integration Points:**
- Guest checkout payment processing
- Saved payment methods for authenticated users
- Subscription billing for storage services
- Refund processing for staff

### **Google Services**
**Purpose:** Authentication and address services
**Integration Points:**
- Google SSO for easy customer login
- Google Places API for address autocomplete
- Address validation and standardization

---

## Complete File Structure & Responsibilities

### **Configuration & Setup**
```
├── package.json                     Project dependencies and build scripts
├── next.config.js                   Next.js configuration
├── tailwind.config.js               Custom luxury color scheme
├── tsconfig.json                    TypeScript configuration with @ path alias
└── .env.local                       Environment variables for integrations
```

### **Core Infrastructure**
```
src/lib/
├── api-client.ts                    Axios + Django CSRF integration (IMPLEMENTED)
├── query-client.ts                  TanStack Query v5 configuration (IMPLEMENTED)
├── aws-s3.ts                        S3 file upload utilities (PLANNED)
├── stripe-client.ts                 Stripe payment integration (PLANNED)
├── google-auth.ts                   Google SSO integration (PLANNED)
└── onfleet-client.ts                OnFleet API integration (PLANNED)

src/utils/
├── cn.ts                           Tailwind class merging utility (IMPLEMENTED)
├── validation.ts                   Zod schemas for form validation (PLANNED)
├── formatting.ts                   Price and date formatting utilities (PLANNED)
└── file-upload.ts                  S3 upload handling utilities (PLANNED)

src/types/
└── index.ts                        Django model TypeScript interfaces (IMPLEMENTED)
                                     - Extended for integration data types
```

### **State Management**
```
src/stores/
├── auth-store.ts                   Customer authentication (IMPLEMENTED)
├── booking-store.ts                Booking wizard state (IMPLEMENTED)
├── ui-store.ts                     Global UI state (IMPLEMENTED)
├── staff-store.ts                  Staff authentication and permissions (PLANNED)
└── crm-store.ts                    CRM data management (PLANNED)
```

### **Application Pages**
```
src/app/
├── layout.tsx                      Root layout with providers (IMPLEMENTED)
├── page.tsx                        Homepage (IMPLEMENTED)
├── login/page.tsx                  Customer authentication (PLANNED)
├── dashboard/                      Customer dashboard (PLANNED)
│   ├── page.tsx                    - Dashboard overview
│   ├── bookings/page.tsx           - Booking history
│   ├── profile/page.tsx            - Profile management
│   └── addresses/page.tsx          - Address book
├── staff/                          Staff dashboard (PLANNED)
│   ├── page.tsx                    - Operations overview
│   ├── bookings/page.tsx           - Booking management
│   ├── customers/page.tsx          - CRM and customer support
│   └── drivers/page.tsx            - OnFleet driver management
└── globals.css                     Global styles (IMPLEMENTED)
```

### **Design System Components**
```
src/components/ui/
├── button.tsx                      Multi-variant button (IMPLEMENTED)
├── input.tsx                       Form input with validation (IMPLEMENTED)
├── card.tsx                        Content containers (IMPLEMENTED)
├── modal.tsx                       Modal dialogs (IMPLEMENTED)
├── select.tsx                      Dropdown component (IMPLEMENTED)
├── file-upload.tsx                 S3 file upload component (PLANNED)
├── address-input.tsx               Google Places integration (PLANNED)
└── index.ts                        Component exports (IMPLEMENTED)
```

### **Booking Wizard (60% → 100%)**
```
src/components/booking/
├── booking-wizard.tsx              Main wizard container (IMPLEMENTED)
├── service-selection-step.tsx     Service catalog integration (COMPLETE)
├── date-time-step.tsx              Calendar and pricing (COMPLETE)
├── address-step.tsx                Address collection (COMPLETE)
├── customer-info-step.tsx          Customer info handling (PARTIAL → COMPLETE)
├── review-payment-step.tsx         Stripe payment integration (SKELETON → COMPLETE)
└── index.ts                        Booking exports (IMPLEMENTED)
```

### **Customer Dashboard (PLANNED)**
```
src/components/dashboard/
├── dashboard-overview.tsx          Booking summary and quick actions
├── booking-history.tsx             Past and current bookings
├── booking-detail.tsx              Individual booking management
├── address-book.tsx                Saved addresses with Google Places
├── payment-methods.tsx             Stripe payment method management
├── profile-settings.tsx            User preferences and profile
└── support-center.tsx              CRM-integrated support
```

### **Staff Dashboard (PLANNED)**
```
src/components/staff/
├── operations-overview.tsx         Real-time operations dashboard
├── booking-management.tsx          Staff booking operations
├── customer-support.tsx            CRM-powered customer service
├── driver-dashboard.tsx            OnFleet integration interface
├── crm-interface.tsx               Customer relationship management
├── document-manager.tsx            S3 document management
└── email-center.tsx                SES email management
```

### **Integration Components (PLANNED)**
```
src/components/integrations/
├── stripe/
│   ├── payment-form.tsx            Stripe payment processing
│   ├── payment-methods.tsx         Saved payment methods
│   └── subscription-manager.tsx     VIP/storage billing
├── onfleet/
│   ├── driver-assignment.tsx       Driver task assignment
│   ├── tracking-display.tsx        Real-time delivery tracking
│   └── route-optimizer.tsx         Route planning interface
├── crm/
│   ├── customer-profile.tsx        Enhanced customer profiles
│   ├── communication-log.tsx       Communication tracking
│   └── support-tickets.tsx         Ticket management
├── aws/
│   ├── s3-uploader.tsx             File upload component
│   ├── document-viewer.tsx         Document display and management
│   └── ses-email.tsx               Email composition and sending
└── google/
    ├── sso-login.tsx               Google authentication
    └── places-autocomplete.tsx      Address autocomplete
```

---

## Backend API Integration Mapping

### **Core Booking APIs (IMPLEMENTED)**
- `GET /api/public/services/` - Service catalog
- `POST /api/public/pricing-preview/` - Real-time pricing
- `GET /api/public/availability/` - Calendar availability
- `POST /api/public/guest-booking/` - Guest checkout
- `POST /api/customer/bookings/` - Authenticated user booking

### **Authentication APIs (PLANNED)**
- `POST /api/customer/auth/login/` - Standard login
- `POST /api/customer/auth/google/` - Google SSO
- `GET /api/customer/auth/user/` - Current user data

### **Customer Dashboard APIs (PLANNED)**
- `GET /api/customer/profile/` - User profile
- `GET /api/customer/addresses/` - Saved addresses
- `GET /api/customer/payment-methods/` - Stripe payment methods
- `GET /api/customer/bookings/` - Booking history

### **Staff Dashboard APIs (PLANNED)**
- `GET /api/staff/dashboard/` - Operations overview
- `GET /api/staff/bookings/` - Booking management
- `GET /api/staff/customers/` - CRM customer data
- `POST /api/staff/onfleet/` - Driver assignment

### **Integration APIs (PLANNED)**
- `POST /api/integrations/s3/upload/` - File upload to S3
- `POST /api/integrations/ses/send/` - Send email via SES
- `GET /api/integrations/onfleet/drivers/` - Driver status
- `POST /api/integrations/stripe/payment/` - Process payment

---

## Development Roadmap

### **Phase 1: Complete Core Booking (4-6 weeks)**
1. **Customer Info Step Completion**
   - Dual-mode form handling (guest vs. authenticated)
   - Form validation with proper error handling
   - Account creation incentives

2. **Stripe Payment Integration**
   - Payment processing for guest checkout
   - Saved payment methods for authenticated users
   - Mobile-optimized payment flow

3. **Google Places API**
   - Address autocomplete in booking wizard
   - Address validation and standardization

4. **Van-Day Constraint Enforcement**
   - Frontend specialty item restriction logic
   - User-friendly constraint messaging

### **Phase 2: Customer Experience (6-8 weeks)**
5. **Customer Authentication**
   - Login/registration system
   - Google SSO integration
   - Session management

6. **Customer Dashboard**
   - Dashboard overview with booking summary
   - Booking history and tracking
   - Profile and address management
   - Stripe payment method management

7. **AWS S3 Integration**
   - File upload for documents
   - Document storage and retrieval
   - Receipt and invoice handling

8. **AWS SES Email System**
   - Booking confirmation emails
   - Status update notifications
   - Customer communication

### **Phase 3: Staff Operations (8-10 weeks)**
9. **Staff Authentication & Dashboard**
   - Staff login with role-based access
   - Operations overview dashboard
   - Booking management interface

10. **CRM Integration**
    - Customer profile enhancement
    - Communication history tracking
    - Support ticket system

11. **OnFleet Integration**
    - Driver assignment automation
    - Real-time tracking integration
    - Delivery status synchronization

12. **Advanced Staff Features**
    - Document management via S3
    - Email management via SES
    - Customer support tools

### **Phase 4: Polish & Optimization (4-6 weeks)**
13. **Performance Optimization**
    - Caching strategies
    - Mobile optimization
    - SEO improvements

14. **Integration Refinement**
    - Error handling and fallbacks
    - Monitoring and logging
    - Security enhancements

15. **Testing & Quality Assurance**
    - Integration testing
    - User acceptance testing
    - Performance testing

---

## Integration Implementation Details

### **AWS S3 File Storage**
```typescript
// S3 integration utility
export const uploadToS3 = async (file: File, key: string) => {
  const presignedUrl = await api.get(`/api/integrations/s3/presigned-url/`, {
    params: { filename: key, content_type: file.type }
  });
  
  const formData = new FormData();
  formData.append('file', file);
  
  return await fetch(presignedUrl.data.url, {
    method: 'POST',
    body: formData
  });
};
```

### **AWS SES Email Integration**
```typescript
// Email sending utility
export const sendEmail = async (to: string, template: string, data: object) => {
  return await api.post('/api/integrations/ses/send/', {
    to,
    template,
    data
  });
};
```

### **Stripe Payment Integration**
```typescript
// Stripe payment processing
export const processPayment = async (paymentData: PaymentData) => {
  return await api.post('/api/integrations/stripe/payment/', paymentData);
};
```

### **OnFleet Driver Integration**
```typescript
// OnFleet task creation
export const assignDriver = async (bookingId: string, driverId: string) => {
  return await api.post('/api/integrations/onfleet/assign/', {
    booking_id: bookingId,
    driver_id: driverId
  });
};
```

This documentation focuses specifically on the essential integrations and features you need without feature bloat, providing a clear roadmap for building the complete ToteTaxi platform.