Here's the updated frontend living documentation reflecting the Django User + Profile architecture:

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

# ToteTaxi Frontend Living Documentation & Roadmap

**Strategic Technical Architecture - Next.js 14 + TypeScript + Tailwind CSS**

## System Architecture Overview

**ToteTaxi Frontend Ecosystem**
```
├── Marketing Site (SSR for SEO)
│   ├── Brand positioning & service education
│   ├── SEO optimization & lead capture
│   └── Trust building & conversion focus
├── Booking Wizard (Client-Side SPA)
│   ├── Dual-mode: Guest checkout + Django User authenticated booking
│   ├── Real-time pricing & availability
│   ├── Form management & validation
│   └── Stripe payment integration
├── Customer Dashboard (Customer Portal)
│   ├── Django User authentication (standard login/logout)
│   ├── CustomerProfile data management
│   ├── SavedAddress and PaymentMethod management
│   └── User booking history and account settings
├── Admin Dashboard (Staff Interface)
│   ├── Django User + StaffProfile authentication
│   ├── User + CustomerProfile management for support
│   ├── Booking management & operations
│   └── StaffAction audit logging integration
├── Design System (BLADE-Inspired)
│   ├── Luxury brand aesthetics
│   ├── Mobile-first responsive design
│   └── Accessibility compliance
└── Infrastructure Layer
    ├── Next.js 14 App Router
    ├── TypeScript & Zod validation
    ├── Zustand state management
    └── API integration with Django User + Profile backend
```

**Backend Integration Points:**
- Customer Flow: React → /api/customer/ (Django User + CustomerProfile endpoints)
- Customer Dashboard: React → /api/customer/ for User profile and booking data
- Admin Operations: React → /api/staff/ (Django User + StaffProfile endpoints)
- Public Operations: React → /api/public/ for guest checkout and pricing
- Real-time Updates: WebSocket connections for live booking status
- File Management: S3 direct uploads with presigned URLs

## Authentication Architecture

**Django User Model Integration (Simplified Frontend Auth):**

**Customer Authentication:**
```
Frontend Customer Auth
├── Standard email/password login to Django User endpoints
├── Session-based authentication with /api/customer/ access
├── CustomerProfile data loaded after User authentication
├── User.bookings, User.saved_addresses, User.payment_methods access
└── No custom user model complexity in frontend state
```

**Staff Authentication:**
```
Frontend Staff Auth
├── Username/password login to Django User staff endpoints
├── Session-based authentication with /api/staff/ access
├── StaffProfile role-based UI rendering (admin vs staff)
├── StaffAction audit logging for all admin actions
└── Completely separate authentication flow from customers
```

**Frontend Authentication Benefits:**
- **Standard Django patterns** - no custom authentication state complexity
- **Simplified type definitions** - User + Profile interfaces instead of complex unified models
- **Clear separation** - customer vs staff auth handled through different endpoints
- **Session reliability** - Django's battle-tested session management

## Core Frontend Applications

**🏠 Marketing Site - Luxury Positioning & SEO**

**Primary Responsibility:** Convert high-value visitors into booking conversions through premium positioning

**Updated Integration Patterns:**
- Service Data: Real-time pricing displays from /api/public/services/
- User Journey: Clear paths to Django User registration/login
- Trust Signals: Dynamic testimonial rotation, real booking count displays
- Authentication CTAs: Separate customer registration (creates Django User + CustomerProfile)

**User Journey Optimization:**
- **Guest users:** Direct path to booking wizard via /api/public/ endpoints
- **Returning customers:** Django User login with CustomerProfile benefits (saved addresses, payment methods)
- **New customers:** User registration creates Django User + auto-generated CustomerProfile
- **Mobile experience:** 70% of luxury customers browse on mobile

**Key External Relationships:**
- → Booking Wizard: Primary conversion path from all CTAs
- → Customer Dashboard: Django User login/signup flows
- ← Backend /api/public/: Current pricing, availability windows
- SEO Tools: Google Analytics, Search Console, structured data
- Performance: Next.js optimization, CDN

---

**📝 Booking Wizard - Dual-Mode Conversion Optimization**

**Primary Responsibility:** Guide customers through complex service selection with minimal friction while supporting both guest and Django User authenticated booking flows

**Simplified Authentication Integration:**
- **Django User detection:** Simple check for user authentication state
- **Guest checkout flow:** via /api/public/guest-booking/ endpoints
- **Authenticated flow:** via /api/customer/bookings/ with User + CustomerProfile data
- **No role complexity:** single authentication type to handle

**Updated State Management:**
```typescript
// Simplified user state - no custom user model complexity
interface UserState {
  user: DjangoUser | null;
  customerProfile: CustomerProfile | null;
  isAuthenticated: boolean;
  savedAddresses: SavedAddress[];
  paymentMethods: CustomerPaymentMethod[];
}

// Booking wizard state integrates with User model
interface BookingState {
  // Pre-fill from authenticated user
  customerEmail: string; // user.email
  customerName: string;  // user.first_name + user.last_name
  selectedAddress?: SavedAddress; // from user.saved_addresses
  selectedPaymentMethod?: CustomerPaymentMethod; // from user.payment_methods
}
```

**Core Wizard Flow:**
1. **Django User Check:** Detect if user is logged in, show CustomerProfile benefits
2. **Service Selection:** Guide between Mini Move packages, Standard Delivery, Specialty Items
3. **Calendar & Availability:** Date selection with surcharge indicators
4. **Details Collection:** Address input (pre-filled from SavedAddress for authenticated users)
5. **Customer Information:** Auto-filled from Django User fields for authenticated users
6. **Review & Pricing:** Final price breakdown with transparent surcharge explanation
7. **Payment:** Stripe checkout with saved CustomerPaymentMethod options
8. **Confirmation:** Booking details, tracking information, next steps

**Dual-Mode Experience Design:**

**Guest Checkout Flow:**
- Clean, simple form experience via /api/public/ endpoints
- Option to "create Django User account to save time next time"
- All information collected step-by-step
- Option to save payment method (creates Django User + CustomerProfile + CustomerPaymentMethod)

**Authenticated User Flow:**
- Welcome message with user.first_name
- Pre-filled addresses from user.saved_addresses.all()
- Saved payment methods available from user.payment_methods.filter(is_active=True)
- Streamlined checkout experience via /api/customer/bookings/
- One-click address and payment selection

**Frontend Integration Needs:**
- **Django User Authentication State:** Simple user.is_authenticated boolean
- **CustomerProfile Data:** user.customer_profile for preferences and statistics
- **Real-time Pricing:** Dynamic price updates via /api/public/pricing-preview/
- **Availability Checking:** Calendar integration via /api/public/services/
- **Booking Creation:** Submit to /api/public/guest-booking/ or /api/customer/bookings/
- **Payment Processing:** Stripe PaymentIntent with user.payment_methods integration

**Updated TypeScript Interfaces:**
```typescript
// Django User model interface
interface DjangoUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  date_joined: string;
}

// CustomerProfile interface (extends User)
interface CustomerProfile {
  id: string;
  user: DjangoUser;
  phone: string;
  stripe_customer_id: string;
  total_bookings: number;
  total_spent_cents: number;
  preferred_pickup_time: 'morning' | 'afternoon' | 'evening';
  is_vip: boolean;
}

// SavedAddress interface
interface SavedAddress {
  id: string;
  user: DjangoUser['id'];
  nickname: string;
  address_line_1: string;
  city: string;
  state: string;
  zip_code: string;
  delivery_instructions?: string;
  times_used: number;
}
```

**Key External Relationships:**
- ← Marketing Site: Entry point with service pre-selection
- ← Customer Dashboard: Authenticated entry point for existing Django Users
- → Backend /api/public/: Pricing calculations, availability data
- → Backend /api/customer/: Django User profile data, SavedAddress, CustomerPaymentMethod
- → Stripe API: Payment processing and webhook handling
- State Persistence: Local storage, session recovery

---

**👤 Customer Dashboard - Self-Service Portal**

**Primary Responsibility:** Comprehensive customer self-service interface for Django User + CustomerProfile management

**Django User Integration Architecture:**
- **Standard Django authentication** - user login/logout via /api/customer/auth/
- **Profile data management** - CustomerProfile CRUD via /api/customer/profile/
- **Related data access** - SavedAddress, CustomerPaymentMethod via User relationships
- **Booking history** - user.bookings.all() via /api/customer/bookings/

**Updated Dashboard Architecture:**
- **Account Overview:** Django User info + CustomerProfile statistics and recent activity
- **Booking History:** user.bookings with search, filter, and tracking capabilities
- **Active Bookings:** Live tracking of current deliveries with real-time updates
- **Address Book:** user.saved_addresses management with CRUD operations
- **Payment Methods:** user.payment_methods via Stripe integration
- **Profile Settings:** Django User fields + CustomerProfile preferences
- **Support Center:** Help articles, contact options, booking-specific support

**Customer Experience Features:**

**Dashboard Homepage:**
- Welcome message with user.first_name
- Overview of user.bookings recent activity
- Quick actions (book again, track delivery, update CustomerProfile)
- CustomerProfile.total_bookings and spending statistics

**Booking Management:**
- **Booking History:** user.bookings.all() with status, dates, and amounts
- **Booking Details:** Deep-dive view with all booking information
- **Live Tracking:** Real-time delivery status for active bookings
- **Booking Actions:** Reschedule (if applicable), contact support, download receipts

**Profile Management:**
- **Personal Information:** Django User fields (first_name, last_name, email) + CustomerProfile.phone
- **Address Book:** user.saved_addresses CRUD with nickname management
- **Payment Methods:** user.payment_methods via Stripe with default selection
- **Account Security:** Django User password change, session management

**Frontend Integration Needs:**
- **Authentication:** Django User session management via /api/customer/auth/
- **Profile APIs:** CustomerProfile management via /api/customer/profile/
- **Address APIs:** SavedAddress CRUD via /api/customer/addresses/
- **Payment APIs:** CustomerPaymentMethod + Stripe integration via /api/customer/payment-methods/
- **Booking APIs:** user.bookings access via /api/customer/bookings/
- **Real-time Updates:** Live booking status via WebSocket integration

**Updated Data Access Patterns:**
```typescript
// Customer dashboard data loading
const loadCustomerData = async () => {
  const user = await api.get('/api/customer/auth/user/');
  const profile = await api.get('/api/customer/profile/');
  const addresses = await api.get('/api/customer/addresses/');
  const paymentMethods = await api.get('/api/customer/payment-methods/');
  const bookings = await api.get('/api/customer/bookings/');
  
  return {
    user: user.data,
    customerProfile: profile.data,
    savedAddresses: addresses.data,
    paymentMethods: paymentMethods.data,
    bookings: bookings.data
  };
};
```

**Security & Privacy:**
- **User data isolation:** customers only access their own Django User-related data
- **Session security:** Django's built-in session timeout and security
- **Payment security:** PCI compliance through Stripe integration
- **Privacy controls:** Clear data usage and CustomerProfile settings

**Key External Relationships:**
- ← Django User Authentication: Required for all dashboard features
- → Backend /api/customer/: All customer-specific data and operations
- ← Booking Wizard: Authenticated booking entry point from dashboard
- → Stripe API: Payment method management and billing
- Real-time: WebSocket updates for live booking tracking

---

**🎨 Design System - BLADE-Inspired Luxury Interface**

**Updated Authentication UI Patterns:**
- **Django User state:** Clear visual distinction between unauthenticated and authenticated states
- **CustomerProfile integration:** Personalized UI with user.first_name, CustomerProfile.is_vip status
- **No role complexity:** Customer authentication UI patterns only (staff separate)
- **Standard login flows:** Django User email/password authentication

**Component Architecture Updates:**
- **Base Components:** Button variants, Input fields, Cards, Modal overlays
- **Booking Components:** Service cards, Calendar picker, Price displays, Progress indicators
- **Customer Components:** UserProfile forms, SavedAddress cards, CustomerPaymentMethod management
- **Authentication Components:** Django User login forms, registration, password reset
- **Layout Components:** Responsive containers, Navigation, Headers, Footers

**Authentication UI Patterns:**
- **Guest State:** Clean, minimal UI focused on conversion
- **Authenticated State:** Personalized UI with user.first_name, CustomerProfile benefits display
- **Login Prompts:** Strategic authentication encouragement with clear value proposition
- **Account Management:** Professional, trustworthy UI for Django User + CustomerProfile operations

---

**🔗 API Integration Layer - Backend Communication**

**Primary Responsibility:** Type-safe, reliable communication with Django User + Profile backend

**Simplified Authentication Integration:**
- **Django User session management** for customer authentication
- **Staff User session management** for admin authentication (separate)
- **No custom user model complexity** in API layer
- **Standard Django REST patterns** throughout

**Updated Integration Architecture:**
- **Customer Booking Flow:** /api/customer/ for Django User auth, /api/public/ for pricing, /api/customer/bookings/ for creation
- **Customer Dashboard:** /api/customer/ for all User + CustomerProfile data management
- **Admin Dashboard:** /api/staff/ for Django User + StaffProfile operations (separate app)
- **Real-time Updates:** WebSocket integration for live booking status
- **File Operations:** S3 direct upload with presigned URL patterns

**Authentication Strategy:**
- **Customer Authentication:** Django session-based auth with /api/customer/ endpoints
- **Staff Authentication:** Separate Django session-based auth with /api/staff/ endpoints
- **Guest Operations:** Unauthenticated /api/public/ access for guest checkout
- **Token Management:** Django's built-in session management (no JWT complexity)

**Updated API Client Patterns:**
```typescript
// Django User + Profile API patterns
class CustomerAPI {
  async login(email: string, password: string): Promise<DjangoUser> {
    return this.post('/api/customer/auth/login/', { email, password });
  }
  
  async getProfile(): Promise<CustomerProfile> {
    return this.get('/api/customer/profile/');
  }
  
  async getSavedAddresses(): Promise<SavedAddress[]> {
    return this.get('/api/customer/addresses/');
  }
  
  async getBookings(): Promise<UserBooking[]> {
    return this.get('/api/customer/bookings/');
  }
}

// Staff API (separate)
class StaffAPI {
  async login(username: string, password: string): Promise<DjangoUser> {
    return this.post('/api/staff/auth/login/', { username, password });
  }
  
  async getCustomers(): Promise<CustomerProfile[]> {
    return this.get('/api/staff/customers/');
  }
}
```

**Type Safety Strategy:**
- **Django User interfaces:** Standard Django User model fields
- **Profile interfaces:** CustomerProfile, StaffProfile separate type definitions
- **Booking interfaces:** Updated to reference User ID instead of custom customer fields
- **Zod schemas:** Runtime validation for Django model data structures
- **Consistent error handling:** Standard Django REST error response patterns

**Performance Optimization:**
- **Django User caching:** Cache authenticated user state and profile data
- **Profile prefetching:** Load related SavedAddress, CustomerPaymentMethod data efficiently
- **Request deduplication:** For frequent user profile and booking data operations
- **Background prefetching:** CustomerProfile and related data after authentication

---

**⚙️ Admin Dashboard - Staff Operations Interface**

**Primary Responsibility:** Comprehensive staff interface using Django User + StaffProfile architecture

**Django User + StaffProfile Integration:**
- **Staff authentication:** Django User login with StaffProfile role checking
- **Customer management:** Access to Django User + CustomerProfile data for support
- **Booking management:** Full CRUD with Django User relationship tracking
- **Audit logging:** StaffAction tracking for all administrative User actions

**Updated Dashboard Architecture:**
- **Operations Overview:** Real-time KPIs, upcoming bookings, pending actions dashboard
- **Booking Management:** Comprehensive table with Django User customer relationships
- **Customer Management:** Django User + CustomerProfile management interface for staff
- **Customer Profiles:** Complete customer view with User.bookings history and CustomerProfile data
- **Financial Interface:** Payment tracking, refund processing with StaffProfile.can_approve_refunds
- **Task Management:** COI validation, delivery coordination
- **Reporting:** Business intelligence with Django User analytics

**Staff Workflow Optimization:**
- **Single-click actions:** Create delivery task, upload COI, send notifications (with StaffAction logging)
- **Customer support:** Quick access to Django User + CustomerProfile data from bookings
- **Bulk operations:** Batch refunds, mass communications with audit trails
- **Smart filtering:** Search across User.email, CustomerProfile fields
- **Audit integration:** StaffAction logging for compliance

**Frontend Integration Needs:**
- **Staff Authentication:** Django User + StaffProfile login via /api/staff/auth/
- **Real-time Updates:** Live booking status changes via WebSocket
- **Customer Management:** Django User + CustomerProfile management via /api/staff/customers/
- **Booking Management:** Full booking CRUD via /api/staff/bookings/
- **Audit Interface:** StaffAction logging and review via /api/staff/actions/
- **Permission-based UI:** StaffProfile.role determines available actions

**Permission Architecture:**
- **Admin Role:** Full system access, refund processing, Django User management
- **Staff Role:** Booking management, customer service, CustomerProfile access
- **Audit Trail:** Complete StaffAction logging with Django User attribution

**Updated Data Access Patterns:**
```typescript
// Staff dashboard customer management
const getCustomerDetails = async (userId: number) => {
  const user = await api.get(`/api/staff/customers/${userId}/`);
  const profile = user.data.customer_profile;
  const bookings = user.data.bookings;
  const addresses = user.data.saved_addresses;
  
  return {
    user: user.data,
    profile: profile,
    bookings: bookings,
    addresses: addresses
  };
};

// Staff action logging
const logStaffAction = async (action: string, customerId?: number) => {
  await api.post('/api/staff/actions/', {
    action_type: action,
    customer_id: customerId,
    description: `Staff action: ${action}`
  });
};
```

**Key External Relationships:**
- ← Django User Authentication: Staff login required for all admin features
- → Backend /api/staff/: All administrative operations
- → Django User + CustomerProfile: Customer account management for support
- Authentication: Role-based access control via StaffProfile
- Real-time: WebSocket updates for live operational awareness

## Data Flow Architecture

**Customer Booking Journey (Guest):**
```
Marketing Site (SEO/Conversion)
    ↓
Booking Wizard (Guest Checkout)
    ↓ Real-time pricing via /api/public/
Services API ← → Frontend State Management
    ↓ Booking creation via /api/public/guest-booking/
Bookings API → Payment Processing (Stripe)
    ↓ Payment confirmation
Email Notifications ← Logistics API
    ↓
Confirmation & Tracking (email-based)
```

**Customer Booking Journey (Django User Authenticated):**
```
Marketing Site → Django User Login/Dashboard
    ↓
Customer Dashboard → Booking Wizard (Pre-filled)
    ↓ Django User + CustomerProfile integration via /api/customer/
User + Profile APIs ← → Services API ← → Frontend State
    ↓ Booking creation via /api/customer/bookings/
Bookings API → Payment Processing (saved CustomerPaymentMethod)
    ↓ Payment confirmation
Dashboard Updates + Email ← Logistics API
    ↓
Customer Dashboard Tracking + Email confirmations
```

**Staff Operations Flow:**
```
Staff Authentication (Django User + StaffProfile)
    ↓ /api/staff/auth/
Dashboard Overview (Real-time KPIs)
    ↓ /api/staff/dashboard/
Booking + Customer Management (Django User + CustomerProfile access)
    ↓ Staff actions via /api/staff/ with StaffAction logging
All Backend Apps ← CRM API
    ↓ Real-time updates
WebSocket → Live Dashboard Updates
```

## State Management Strategy

**Simplified Authentication State (Django User Model):**
```typescript
// Customer authentication state
interface CustomerAuthState {
  user: DjangoUser | null;
  customerProfile: CustomerProfile | null;
  isAuthenticated: boolean;
  savedAddresses: SavedAddress[];
  paymentMethods: CustomerPaymentMethod[];
  bookings: UserBooking[];
}

// Staff authentication state (separate)
interface StaffAuthState {
  user: DjangoUser | null;
  staffProfile: StaffProfile | null;
  isAuthenticated: boolean;
  permissions: StaffPermission[];
}
```

**Booking Flow State:**
- **Zustand store** with persistence for wizard progress
- **Django User integration** - simple user.is_authenticated check
- **CustomerProfile pre-fill** - use saved addresses and preferences
- **Real-time pricing** updates from /api/public/pricing-preview/
- **Form validation** state with Zod schemas matching Django models

**Customer Dashboard State:**
- **Django User profile** and authentication status
- **CustomerProfile data** - booking statistics, preferences, VIP status
- **SavedAddress management** - CRUD operations with optimistic updates
- **CustomerPaymentMethod** - Stripe integration with default selection
- **Real-time booking** status updates via WebSocket

This updated frontend documentation reflects the simplified yet secure architecture using Django's User model with profile extensions, eliminating custom authentication complexity while maintaining all sophisticated customer experience and staff operational functionality.