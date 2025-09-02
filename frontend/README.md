Here's the complete updated frontend living documentation with our architectural changes integrated:

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
│   ├── Dual-mode: Guest checkout + authenticated booking
│   ├── Real-time pricing & availability
│   ├── Form management & validation
│   └── Stripe payment integration
├── Customer Dashboard (Customer Portal)
│   ├── Customer authentication (separate system)
│   ├── Booking history & live tracking
│   ├── Profile management & saved addresses
│   └── Payment methods & account settings
├── Admin Dashboard (Staff Interface)
│   ├── Staff authentication (separate system)
│   ├── Booking management & operations
│   ├── Customer service & support
│   └── Financial operations & reporting
├── Design System (BLADE-Inspired)
│   ├── Luxury brand aesthetics
│   ├── Mobile-first responsive design
│   └── Accessibility compliance
└── Infrastructure Layer
    ├── Next.js 14 App Router
    ├── TypeScript & Zod validation
    ├── Zustand state management
    └── API integration with Django backend
```

**Backend Integration Points:**
- Customer Flow: React → /api/customer/ + /api/public/ endpoints
- Customer Dashboard: React → /api/customer/ for self-service
- Admin Operations: React → /api/staff/ + all backend management APIs
- Public Operations: React → /api/public/ for guest checkout and pricing
- Real-time Updates: WebSocket connections for live status
- File Management: S3 direct uploads with presigned URLs

## Authentication Architecture

**Separate Authentication Systems (Security-First Frontend Design):**

**Customer Authentication:**
```
Customer Frontend Auth
├── Email/password login (no username)
├── Session-based authentication with customer endpoints
├── Separate login/logout flows from staff
├── Customer-specific state management
└── /api/customer/ endpoint access only
```

**Staff Authentication:**
```
Staff Frontend Auth
├── Username/password login (traditional)
├── Session-based authentication with staff endpoints
├── Completely separate authentication flow
├── Role-based UI (admin vs staff permissions)
└── /api/staff/ endpoint access only
```

**Security Benefits:**
- No cross-authentication vulnerabilities in frontend
- Simplified authentication state (no role switching)
- Clear separation of concerns in UI components
- Impossible for customers to access staff interfaces accidentally

## Core Frontend Applications

**🏠 Marketing Site - Luxury Positioning & SEO**

**Primary Responsibility:** Convert high-value visitors into booking conversions through premium positioning

**Business Logic Ownership:**
- Brand positioning that conveys luxury and reliability
- Service education for complex offerings (Mini Moves, Specialty Items)
- Trust building through testimonials and partnership displays
- SEO optimization for organic traffic acquisition
- Lead capture and conversion funnel management
- Clear pathways to both guest checkout and customer account creation

**Core Page Architecture:**
- **Homepage:** Hero positioning, service overview, trust indicators, conversion CTAs
- **Services:** Deep-dive into Mini Moves, Standard Delivery, Specialty Items with pricing transparency
- **How It Works:** Process explanation to build confidence in service reliability
- **About/Partners:** Brand credibility through Blade partnership, press coverage
- **FAQ/Legal:** Address common concerns, terms, privacy policy
- **Login/Signup:** Separate customer authentication entry points

**Frontend Integration Needs:**
- Service Data: Real-time pricing displays from /api/public/services/
- Booking CTAs: Seamless handoff to booking wizard with service pre-selection
- Authentication CTAs: Clear paths to customer login/signup (separate from staff)
- Trust Signals: Dynamic testimonial rotation, real booking count displays
- Performance: SSR for SEO, fast loading for luxury customer expectations

**User Journey Optimization:**
- Guest users: Direct path to booking wizard via /api/public/ endpoints
- Returning customers: Clear login prompts with benefits (saved addresses, payment methods)
- New customers: Gentle signup encouragement with value proposition
- Mobile experience: 70% of luxury customers browse on mobile

**Key External Relationships:**
- → Booking Wizard: Primary conversion path from all CTAs
- → Customer Dashboard: Login/signup flows (customer-specific)
- ← Backend /api/public/: Displays current pricing, availability windows
- SEO Tools: Google Analytics, Search Console, structured data
- Performance: Next.js optimization, CDN

---

**📝 Booking Wizard - Dual-Mode Conversion Optimization**

**Primary Responsibility:** Guide customers through complex service selection with minimal friction while supporting both guest and authenticated booking flows

**Simplified Authentication Integration:**
- Detection of customer login state (single auth system to check)
- Guest checkout flow via /api/public/ endpoints
- Authenticated flow via /api/customer/ endpoints
- No role detection or switching complexity

**Business Logic Ownership:**
- Dual-mode operation: Seamless experience for guest checkout AND logged-in customers
- Service selection flow optimized for customer understanding
- Dynamic pricing calculation with real-time backend integration
- Multi-step form management with progress persistence
- Smart pre-filling: Use customer profile data for authenticated users
- Address validation and reuse for returning customers
- Payment processing with Stripe Elements integration (including saved payment methods)
- Booking confirmation and tracking handoff

**Core Wizard Flow:**
1. **Authentication Check:** Simple customer login detection, offer login benefits
2. **Service Selection:** Guide between Mini Move packages, Standard Delivery, Specialty Items
3. **Calendar & Availability:** Date selection with surcharge indicators, van availability constraints
4. **Details Collection:** Address input (pre-filled for customers), customer information, special requirements, COI toggle
5. **Review & Pricing:** Final price breakdown with transparent surcharge explanation
6. **Payment:** Stripe checkout with saved payment methods for customers, option to save for guests
7. **Confirmation:** Booking details, tracking information, next steps

**Dual-Mode Experience Design:**

**Guest Checkout Flow:**
- Clean, simple form experience via /api/public/ endpoints
- Option to "create account to save time next time"
- All information collected step-by-step
- Option to save payment method (creates customer account via /api/customer/auth/)

**Authenticated Customer Flow:**
- Welcome message with customer name
- Pre-filled addresses from customer profile via /api/customer/addresses/
- Saved payment methods available via /api/customer/payment-methods/
- Streamlined checkout experience
- One-click address and payment selection

**Frontend Integration Needs:**
- Customer Authentication State: Simple boolean check for customer login
- Customer Profile Data: Pre-fill forms with saved addresses and preferences
- Real-time Pricing: Dynamic price updates via /api/public/pricing-preview/
- Availability Checking: Calendar integration via /api/public/services/
- Booking Creation: Submit complete booking data (/api/public/guest-booking/ or /api/customer/bookings/)
- Payment Processing: Stripe PaymentIntent creation with saved payment method options
- Status Updates: Real-time booking status via WebSocket or polling

**State Management Strategy:**
- Zustand store for wizard state persistence (simplified - no role management)
- Customer authentication state (single auth system)
- Form validation with Zod schemas
- Local storage backup for browser refresh recovery (respects authentication state)
- Progress tracking and step validation
- Error state management and recovery flows

**Key External Relationships:**
- ← Marketing Site: Entry point with service pre-selection
- ← Customer Dashboard: Authenticated entry point for existing customers
- → Backend /api/public/: Pricing calculations, availability data
- → Backend /api/customer/: Customer profile data, saved addresses
- → Stripe API: Payment processing and webhook handling
- State Persistence: Local storage, session recovery

---

**👤 Customer Dashboard - Self-Service Portal**

**Primary Responsibility:** Comprehensive customer self-service interface for booking management, profile control, and account settings

**Simplified Authentication Architecture:**
- Customer-only authentication (no staff role checking)
- Session-based authentication with /api/customer/ endpoints exclusively
- Automatic redirect to customer login if unauthenticated
- No role detection or staff interface access

**Business Logic Ownership:**
- Customer authentication and session management
- Complete booking history and status tracking
- Profile management and preferences
- Saved addresses and payment methods management
- Account settings and notification preferences (future)
- Self-service capabilities to reduce support burden

**Dashboard Architecture:**
- **Account Overview:** Welcome dashboard with key stats and recent activity
- **Booking History:** Comprehensive list with search, filter, and tracking capabilities
- **Active Bookings:** Live tracking of current deliveries with real-time updates
- **Address Book:** Manage saved pickup/delivery locations with easy editing
- **Payment Methods:** Stripe-powered payment method management
- **Profile Settings:** Update contact information, preferences, password
- **Support Center:** Help articles, contact options, booking-specific support

**Customer Experience Features:**

**Dashboard Homepage:**
- Welcome message with customer name
- Overview of recent bookings and account activity
- Quick actions (book again, track delivery, update profile)
- Booking statistics (total bookings, frequent routes)

**Booking Management:**
- Booking History: Searchable list with status, dates, and amounts
- Booking Details: Deep-dive view with all booking information
- Live Tracking: Real-time delivery status for active bookings
- Booking Actions: Reschedule (if applicable), contact support, download receipts

**Profile Management:**
- Personal Information: Name, email, phone with validation
- Address Book: Add, edit, delete frequently used addresses
- Payment Methods: Add, remove, set default payment methods via Stripe
- Account Security: Change password, session management

**Frontend Integration Needs:**
- Authentication: Customer login state management and session handling (/api/customer/auth/)
- Booking APIs: Fetch customer booking history and details (/api/customer/bookings/)
- Profile APIs: Customer information management and updates (/api/customer/profile/)
- Address APIs: CRUD operations for customer saved addresses (/api/customer/addresses/)
- Payment APIs: Stripe customer and payment method management (/api/customer/payment-methods/)
- Real-time Updates: Live booking status via WebSocket integration

**Security & Privacy:**
- Customer data isolation (only their bookings and data)
- Session security with proper timeout
- Payment security through Stripe integration
- Privacy controls and clear data usage policies

**Key External Relationships:**
- ← Customer Authentication: Secure login required for all dashboard features
- → Backend /api/customer/: All customer-specific data and operations
- ← Booking Wizard: Authenticated booking entry point from dashboard
- → Stripe API: Payment method management and billing
- Real-time: WebSocket updates for live booking tracking

---

**🎨 Design System - BLADE-Inspired Luxury Interface**

**Primary Responsibility:** Consistent premium UI that reinforces luxury positioning across all customer touchpoints

**Simplified Authentication UI Patterns:**
- Clear visual distinction between guest and customer-authenticated states
- No role-based UI complexity (customer vs staff completely separate)
- Streamlined authentication components (customer-only focus)

**Business Logic Ownership:**
- Visual identity that conveys trust and premium service quality
- Component library ensuring consistent user experience
- Mobile-first responsive design for luxury mobile users
- Accessibility compliance for inclusive experience
- Performance optimization with minimal bundle impact
- Developer experience with well-typed, documented components

**Core Design Principles:**
- **Luxury Aesthetics:** BLADE-inspired sophistication with warm grays, premium blues
- **Trust Indicators:** Subtle shadows, smooth transitions, polished interactions
- **Mobile Excellence:** Touch-friendly sizing, thumb-zone optimization
- **Information Hierarchy:** Clear pricing displays, status indicators, progress feedback
- **Accessibility:** WCAG 2.1 AA compliance, keyboard navigation, screen reader support
- **Authentication States:** Clear visual distinction between guest and authenticated experiences

**Component Architecture:**
- **Base Components:** Button variants, Input fields, Cards, Modal overlays
- **Booking Components:** Service cards, Calendar picker, Price displays, Progress indicators
- **Customer Components:** Dashboard widgets, Profile forms, Booking history cards, Address forms
- **Authentication Components:** Customer login forms, Signup flows, Password reset, Session management
- **Layout Components:** Responsive containers, Navigation, Headers, Footers

**Authentication UI Patterns:**
- **Guest State:** Clean, minimal UI focused on conversion
- **Authenticated State:** Personalized UI with customer name, saved data, quick actions
- **Login Prompts:** Strategic, non-intrusive authentication encouragement
- **Account Management:** Professional, trustworthy UI for sensitive operations

**Customer Dashboard Patterns:**
- **Information Density:** Balanced information display without overwhelming
- **Action Hierarchy:** Primary actions prominent, secondary actions accessible
- **Status Communication:** Clear booking status with appropriate visual indicators
- **Data Entry:** Streamlined forms with validation and helpful feedback

---

**🔗 API Integration Layer - Backend Communication**

**Primary Responsibility:** Type-safe, reliable communication with Django backend across all frontend operations

**Simplified Authentication Integration:**
- Customer authentication: Session-based with /api/customer/ endpoints
- Staff authentication: Completely separate system (admin dashboard only)
- Guest operations: Unauthenticated /api/public/ access
- No role switching or unified authentication complexity

**Business Logic Ownership:**
- HTTP client configuration with authentication and error handling
- Separate authentication handling for customer and staff systems
- TypeScript type safety for all API communications
- Request/response transformation between frontend and backend formats
- Caching strategy for pricing, availability, and customer data
- Error handling with user-friendly messaging and retry logic

**Integration Architecture:**
- **Customer Booking Flow:** /api/customer/ for auth, /api/public/ for pricing, /api/customer/bookings/ for creation
- **Customer Dashboard:** /api/customer/ for all profile management and booking history
- **Admin Dashboard:** /api/staff/ for all operations and management functions (separate app)
- **Real-time Updates:** WebSocket integration for live booking status
- **File Operations:** S3 direct upload with presigned URL patterns
- **Error Recovery:** Automatic retries, graceful degradation, offline resilience

**Authentication Strategy:**
- **Customer Authentication:** Session-based authentication for customer dashboard
- **Staff Authentication:** Separate session-based authentication for admin (completely isolated)
- **Guest Operations:** Unauthenticated API access for guest checkout via /api/public/
- **Token Management:** Automatic session refresh and handling (per auth system)
- **Security:** Complete isolation between customer and staff authentication

**API Endpoint Architecture:**
```
/api/public/
├── pricing-preview/ → Real-time pricing calculations
├── services/ → Service catalog and availability
├── guest-booking/ → Guest checkout booking creation
└── booking-status/ → Status lookup by booking number

/api/customer/
├── auth/ → Registration, login, logout, password reset
├── profile/ → Customer profile management
├── addresses/ → Saved address CRUD operations
├── payment-methods/ → Stripe payment method management
├── bookings/ → Customer booking history and creation
└── dashboard/ → Account overview and statistics

/api/staff/
├── auth/ → Staff login, logout, session management
├── dashboard/ → KPIs, business metrics, operational overview
├── bookings/ → All booking management and modification
├── customers/ → Customer account management for support
└── refunds/ → Refund processing and approval workflows
```

**Type Safety Strategy:**
- Comprehensive TypeScript interfaces for all API responses
- Customer-specific types: CustomerProfile, SavedAddress, CustomerBooking
- Staff-specific types: StaffUser, AdminAction, RefundRequest
- Zod schemas for runtime validation and transformation
- Consistent error type definitions across application
- Type-safe state management integration

**Performance Optimization:**
- Request deduplication for frequent operations
- Intelligent caching for pricing, availability, and customer profile data
- Background prefetching for likely user actions
- Customer data caching strategy (addresses, payment methods)
- Request/response compression
- Connection pooling and keep-alive

---

**⚙️ Admin Dashboard - Staff Operations Interface**

**Primary Responsibility:** Comprehensive staff interface for all ToteTaxi operational management and customer service

**Separate Authentication Architecture:**
- Staff-only authentication system (completely isolated from customer auth)
- Role-based permissions within staff system (admin vs staff)
- Username/password authentication (traditional)
- /api/staff/ endpoints exclusively

**Business Logic Ownership:**
- Complete booking lifecycle management for staff operations
- Customer account management: View customer profiles, booking patterns, account support
- Customer service interface with full booking history access
- Financial operations including refund processing and revenue tracking
- Operational task management (COI uploads, coordination)
- Reporting and analytics for business intelligence
- Role-based access control for different staff permission levels

**Dashboard Architecture:**
- **Operations Overview:** Real-time KPIs, upcoming bookings, pending actions dashboard
- **Booking Management:** Comprehensive table with search, filter, and bulk action capabilities
- **Customer Management:** Customer account overview, support tools, account management
- **Customer Profiles:** Complete customer view with booking history and service patterns
- **Financial Interface:** Payment tracking, refund processing, revenue analytics
- **Task Management:** COI validation, delivery coordination
- **Reporting:** Business intelligence dashboards with data export capabilities

**Staff Workflow Optimization:**
- Single-click common actions (create delivery task, upload COI, send notifications)
- Customer support shortcuts: Quick access to customer accounts from bookings
- Bulk operations for efficiency (batch refunds, mass communications)
- Smart filtering and search across all booking and customer data
- Quick customer lookup and service history
- Audit logging for all administrative actions

**Frontend Integration Needs:**
- Staff Authentication: /api/staff/auth/ for login/logout/session management
- Real-time Updates: Live booking status changes via WebSocket
- Customer Account Management: Staff interfaces for customer account support via /api/staff/customers/
- File Operations: Direct COI upload to S3 with progress indicators
- External Integration: Delivery task creation, Stripe refund processing
- Data Export: CSV generation for accounting and analysis
- Mobile Access: Responsive design for mobile staff operations

**Permission Architecture:**
- **Admin Role:** Full system access, refund processing, customer account management, user management
- **Staff Role:** Booking management, customer service, operational tasks, basic customer support
- **Audit Trail:** Complete logging of all staff actions with user attribution

**Key External Relationships:**
- ← API Integration Layer: Primary consumer of /api/staff/ endpoints
- → Backend /api/staff/: All administrative operations
- Authentication: Role-based access control and session management (staff only)
- Real-time: WebSocket updates for live operational awareness

## Security Implementation

**Frontend Security Requirements:**

**Transport & Headers Security:**
```javascript
// next.config.js security headers
const securityHeaders = [
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
  }
]
```

**Authentication Security:**
- **Session Management:** Secure cookies with httpOnly, secure, sameSite attributes
- **Customer Auth:** Session timeout (2 hours), automatic logout on inactivity
- **Staff Auth:** Extended session (8 hours), secure admin access
- **CSRF Protection:** Next.js built-in CSRF protection on all forms

**Input Validation & XSS Prevention:**
- **Zod Schemas:** All user input validated with TypeScript schemas
- **Sanitization:** User-generated content sanitized before display
- **File Uploads:** Type and size validation for S3 uploads
- **URL Validation:** Prevent open redirect attacks

**API Security:**
- **Rate Limiting:** Frontend respects backend rate limits, shows user-friendly messages
- **Error Handling:** Generic error messages to users, detailed logging for developers
- **Request Validation:** Client-side validation mirrors backend validation

**Payment Security:**
- **Stripe Integration:** PCI-compliant card handling, no sensitive data storage
- **Payment Validation:** Amount verification before payment submission
- **Secure Redirects:** Payment confirmation handling with webhook verification

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

**Customer Booking Journey (Authenticated):**
```
Marketing Site → Customer Login/Dashboard
    ↓
Customer Dashboard → Booking Wizard (Pre-filled)
    ↓ Customer profile integration via /api/customer/
Customers API ← → Services API ← → Frontend State
    ↓ Booking creation via /api/customer/bookings/
Bookings API → Payment Processing (saved methods)
    ↓ Payment confirmation
Dashboard Updates + Email ← Logistics API
    ↓
Customer Dashboard Tracking + Email confirmations
```

**Staff Operations Flow:**
```
Staff Authentication (Separate System)
    ↓ /api/staff/auth/
Dashboard Overview (Real-time KPIs)
    ↓ /api/staff/dashboard/
Booking Management + Customer Management
    ↓ Staff actions via /api/staff/
All Backend Apps ← CRM API
    ↓ Real-time updates
WebSocket → Live Dashboard Updates
```

**External Service Integration:**
```
Frontend → S3 Direct Upload (COI files)
Frontend → Stripe Elements (Payment + Customer management)
Backend → SES (Email notifications)
Backend → Onfleet (Delivery coordination)
```

## State Management Strategy

**Simplified Authentication State (No Role Complexity):**
- Customer login/logout state management (single auth system)
- Customer profile data synchronization
- Saved addresses and payment methods state
- Session timeout and security handling
- Authentication persistence across page refreshes

**Booking Flow State:**
- Zustand store with persistence for wizard progress
- Customer authentication integration (simple boolean check)
- Local storage backup for browser refresh recovery
- Real-time pricing updates from /api/public/pricing-preview/
- Form validation state with Zod schemas
- Error state management and recovery flows

**Customer Dashboard State:**
- Customer profile and preferences
- Booking history with pagination
- Address book management
- Payment methods via Stripe
- Real-time booking status updates

**Admin Dashboard State (Separate App):**
- Staff authentication and permissions
- Real-time operational data via WebSocket
- Booking management with filtering
- Customer service workflows
- Audit logging integration

## Performance Optimization Patterns

**Code Splitting Strategy:**
- Marketing site separate from booking wizard
- Customer dashboard as separate bundle
- Admin dashboard as completely separate application
- Component-level lazy loading
- Dynamic imports for heavy features
- Vendor bundle optimization

**Data Loading Patterns:**
- SSR for marketing pages (SEO)
- Client-side rendering for interactive flows
- Customer data prefetching after authentication
- Prefetching for likely user actions
- Background data refresh
- Optimistic UI updates

**Caching Architecture:**
- Browser cache for static assets
- API response caching for pricing/availability via /api/public/
- Customer profile data caching via /api/customer/
- LocalStorage for user preferences and authentication state
- Service Worker for offline functionality (future)
- CDN optimization for global performance

## Development Roadmap

**Phase 1: Foundation & Customer Auth (Week 1)**
*Objective: Establish project foundation with SEO-optimized marketing site and customer authentication*

**Frontend Deliverables:**
- Next.js 14 project setup with TypeScript and Tailwind
- Core design system components and luxury styling
- Marketing site with SSR (Home, Services, How It Works)
- Customer authentication pages (login, signup, dashboard shell)
- Basic customer dashboard with booking history
- SEO optimization with structured data
- Performance baseline with Core Web Vitals

**Backend Dependencies:**
- Customer authentication API (/api/customer/auth/)
- Service catalog API for pricing displays (/api/public/services/)
- Basic customer profile management (/api/customer/profile/)

**Success Criteria:**
- Marketing site live with >90 Lighthouse score
- Customers can register, login, and view basic dashboard
- Design system components documented and reusable
- SEO foundation complete with structured data
- Mobile-responsive luxury experience

**Phase 2: Booking Wizard Integration (Week 2)**
*Objective: Complete dual-mode booking flow (guest + authenticated)*

**Frontend Deliverables:**
- Dual-mode booking wizard (guest checkout + authenticated flow)
- Multi-step wizard with state management
- Service selection with Mini Move packages
- Calendar integration with availability display
- Address input and customer information forms (with pre-filling)
- Real-time pricing updates via /api/public/pricing-preview/

**Backend Dependencies:**
- Booking creation APIs (/api/public/guest-booking/ and /api/customer/bookings/)
- Services API for pricing calculation (/api/public/pricing-preview/)
- Customer profile integration for pre-filled data (/api/customer/addresses/)
- Availability API for calendar integration

**Success Criteria:**
- Complete booking wizard flow functional for both guest and authenticated users
- Customer dashboard shows booking history from wizard bookings
- Real-time pricing working across all service types
- Form validation and error handling robust
- Mobile-optimized booking experience

**Phase 3: Payment & Customer Features (Week 3)**
*Objective: Complete end-to-end booking with payment processing and full customer dashboard*

**Frontend Deliverables:**
- Stripe Elements integration with saved payment methods
- Payment processing with error handling
- Complete customer dashboard with all MVP features
- Address book management for customers
- Payment method management via Stripe
- Booking confirmation page with tracking
- Error recovery and retry flows

**Backend Dependencies:**
- Stripe payment processing API
- Customer payment method management (/api/customer/payment-methods/)
- Booking confirmation endpoints
- Email notification system
- Payment webhook handling

**Success Criteria:**
- Full booking-to-payment flow operational for both user types
- Customer dashboard fully functional with address and payment management
- Stripe integration secure and tested
- Confirmation page with tracking information
- Error handling with clear user feedback

**Phase 4: Admin Dashboard (Week 4)**
*Objective: Staff operations interface as separate application*

**Frontend Deliverables:**
- Separate Next.js application for admin dashboard
- Staff authentication and role-based access
- Dashboard with real-time KPIs
- Booking management table with actions
- Customer management interface for staff
- Staff action interfaces (refunds, file upload)
- Mobile-responsive admin interface

**Backend Dependencies:**
- Staff authentication API (/api/staff/auth/)
- CRM API with dashboard data (/api/staff/dashboard/)
- Staff authentication and permissions
- Customer account management APIs for staff (/api/staff/customers/)
- Admin action endpoints (refunds, etc.)

**Success Criteria:**
- Complete staff dashboard operational
- Staff can view and manage customer accounts
- Booking management with key staff actions
- Role-based access control working
- Mobile admin functionality

**Phase 5: Production & Optimization (Week 5)**
*Objective: Production-ready application with performance optimization*

**Frontend Deliverables:**
- Bundle optimization and code splitting
- Accessibility audit and compliance
- Cross-browser testing and fixes
- Analytics integration and conversion tracking
- Customer dashboard performance optimization
- Production deployment with monitoring

**Backend Dependencies:**
- All APIs production-ready with security hardening
- Real integrations (Stripe, S3, SES)
- Performance optimization and caching
- Production security configuration

**Success Criteria:**
- Application deployed and performant
- Customer dashboard analytics tracking usage patterns
- Analytics tracking booking funnel conversion
- Accessibility compliant (WCAG 2.1 AA)
- Production monitoring active and functional

## Technical Architecture Decisions

**Frontend Framework Choices:**
- **Next.js 14:** App Router for advanced routing, SSR for SEO, performance optimization
- **TypeScript:** Full type safety across application, better developer experience  
- **Tailwind CSS:** Utility-first styling aligned with design system, excellent performance
- **Zustand:** Lightweight state management without Redux complexity (simplified with separate auth)
- **Zod:** Runtime validation with TypeScript integration

**Authentication Strategy:**
- **Separate Systems:** Customer and staff authentication completely isolated
- **Session-Based:** Standard session management (no JWT complexity)
- **Security-First:** No role switching or cross-authentication vulnerabilities
- **Simplified State:** No complex role management in frontend state

**Performance Strategy:**
- **SSR for Marketing:** Search engine optimization and fast initial loads
- **CSR for Dashboards:** Rich interactions and real-time updates
- **Code Splitting:** Separate bundles for customer and staff applications
- **Image Optimization:** WebP/AVIF formats, responsive sizing
- **Bundle Analysis:** Tree shaking and dependency optimization

**User Experience Principles:**
- **Mobile-First:** 70% of luxury customers browse on mobile
- **Progressive Enhancement:** Core functionality works without JavaScript
- **Accessibility:** WCAG 2.1 AA compliance throughout
- **Authentication UX:** Seamless guest-to-customer conversion
- **Error Recovery:** Clear paths forward when things go wrong
- **Performance:** Luxury customers expect instant responsiveness

This updated documentation reflects our architectural decision to prioritize security and simplicity through separate authentication systems while maintaining sophisticated business logic and premium user experience design patterns.