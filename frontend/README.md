# ToteTaxi Frontend Living Documentation & AI Memory Persistence System

## About This Documentation

This living documentation serves as **AI memory persistence** for ToteTaxi frontend development, enabling immediate technical context without rebuilding project understanding. It captures both operational reality and development roadmap to maintain continuity across AI development sessions.

**Current Status:** Production-ready booking system with complete Django integration
**Development Phase:** Phase 1 Complete, Phase 2+ Backend-Ready

---

## Current Implementation Status (Completed This Session)

**Phase 1 - COMPLETE: Guest Booking System & Marketing Site**
- Complete 5-step booking wizard with Django integration
- Marketing website with real ToteTaxi content and testimonials
- Working backend API integration for services, pricing, and booking creation
- Production-ready state management and form handling
- Mobile-responsive luxury design system

**Technology Stack (Implemented & Working):**
```json
{
  "core": {
    "next": "15.5.0",
    "react": "19.1.0", 
    "@tanstack/react-query": "^5.87.1",
    "axios": "^1.11.0",
    "zustand": "^4.5.7"
  },
  "ui": {
    "@headlessui/react": "^2.2.7",
    "@heroicons/react": "^2.2.0",
    "tailwindcss": "^3.4.17",
    "tailwind-merge": "^2.6.0"
  },
  "forms": {
    "react-hook-form": "^7.62.0",
    "@hookform/resolvers": "^3.10.0", 
    "zod": "^3.25.76"
  }
}
```

## Complete File Structure (Current Implementation)

```
frontend/src/
├── app/                                    Next.js 15 App Router Pages
│   ├── layout.tsx                         Root layout with TanStack Query provider
│   ├── page.tsx                           Homepage - real ToteTaxi content, testimonials, booking CTA
│   ├── globals.css                        Tailwind + luxury design tokens (navy/gold/cream)
│   ├── book/
│   │   └── page.tsx                       Dedicated booking page (full-screen wizard)
│   ├── services/ 
│   │   └── page.tsx                       Services page - live Django pricing, real descriptions
│   ├── about/
│   │   └── page.tsx                       About page - Danielle Candela founder story
│   ├── faq/
│   │   └── page.tsx                       FAQ - real ToteTaxi policies, prohibited items
│   └── contact/
│       └── page.tsx                       Contact - real info (631-595-5100, info@totetaxi.com)
├── components/
│   ├── layout/
│   │   └── main-layout.tsx                Site header/footer, navigation with booking CTA
│   ├── ui/                                Design System Components
│   │   ├── button.tsx                     Variant-based (primary/secondary/outline/ghost)
│   │   ├── input.tsx                      Form inputs with validation, dark text styling
│   │   ├── card.tsx                       Content containers (default/elevated/luxury)
│   │   ├── modal.tsx                      Headless UI modal for booking wizard
│   │   ├── select.tsx                     Dropdown selects with proper styling
│   │   └── index.ts                       Component exports
│   ├── booking/                           Complete Booking Wizard System
│   │   ├── booking-wizard.tsx             Main container - 5-step progress, navigation
│   │   ├── service-selection-step.tsx     Step 1: Service types, Mini Move packages, organizing services
│   │   ├── date-time-step.tsx             Step 2: Calendar, real-time pricing, COI options
│   │   ├── address-step.tsx               Step 3: Pickup/delivery forms, special instructions
│   │   ├── customer-info-step.tsx         Step 4: Contact info, VIP signup option
│   │   ├── review-payment-step.tsx        Step 5: Summary, booking creation, confirmation
│   │   └── index.ts                       Booking exports
│   ├── marketing/
│   │   └── service-showcase.tsx           Homepage component - fetches live Django service data
│   ├── providers/
│   │   └── query-provider.tsx             TanStack Query setup with React Query Devtools
│   └── test-api-connection.tsx            Dev tool - tests all API endpoints (remove in production)
├── stores/                                Zustand State Management
│   ├── auth-store.ts                      Customer authentication with persistence
│   ├── ui-store.ts                        UI state (modals, notifications, sidebar)
│   └── booking-store.ts                   Booking wizard state - multi-step, persistent
├── lib/                                   Core Utilities  
│   ├── api-client.ts                      Axios + Django CSRF integration
│   └── query-client.ts                    TanStack Query v5 configuration
├── types/
│   └── index.ts                           Django model interfaces, booking types
├── utils/
│   └── cn.ts                              Tailwind class merging utility
└── hooks/ (future)                        Custom React Query hooks

Configuration Files:
├── tailwind.config.js                     Custom luxury colors (navy/gold/cream)
├── postcss.config.js                      Tailwind PostCSS setup
├── next.config.ts                         Next.js 15 configuration  
├── tsconfig.json                          TypeScript with @ path alias
└── package.json                           Exact dependency versions
```

## Booking Wizard Implementation Details

### Complete 5-Step Booking Process

**Step 1 - Service Selection:**
```typescript
// src/components/booking/service-selection-step.tsx
// BACKEND INTEGRATION: GET /api/public/services/
// FUNCTIONALITY:
//   - Service type selection (mini_move, standard_delivery, specialty_item)
//   - Mini Move package selection with popularity indicators
//   - Organizing service add-ons (packing/unpacking)
//   - Dynamic form based on service type selected
// STATE UPDATES: service_type, mini_move_package_id, include_packing/unpacking
```

**Step 2 - Date & Time Selection:**
```typescript
// src/components/booking/date-time-step.tsx  
// BACKEND INTEGRATION: 
//   - GET /api/public/availability/ (30-day calendar with surcharges)
//   - POST /api/public/pricing-preview/ (real-time pricing calculation)
// FUNCTIONALITY:
//   - Calendar interface with availability indicators
//   - Real-time pricing updates based on selections
//   - Surcharge notices (weekend, holiday, location)
//   - COI requirement toggle with fee calculation
//   - Time slot selection (morning/afternoon/evening)
// STATE UPDATES: pickup_date, pickup_time, coi_required, pricing_data
```

**Step 3 - Address Collection:**  
```typescript
// src/components/booking/address-step.tsx
// BACKEND INTEGRATION: None (form validation only)
// FUNCTIONALITY:
//   - Dual address forms (pickup/delivery)
//   - State validation (NY/CT/NJ service areas)
//   - ZIP code validation for service coverage
//   - Special instructions textarea
//   - Form validation with error display
// STATE UPDATES: pickup_address, delivery_address, special_instructions
```

**Step 4 - Customer Information:**
```typescript
// src/components/booking/customer-info-step.tsx
// BACKEND INTEGRATION: None (guest checkout focused)
// FUNCTIONALITY: 
//   - Contact form (name, email, phone)
//   - Email and phone validation
//   - VIP program signup option
//   - Privacy notice display
//   - Authentication state detection (ready for logged-in users)
// STATE UPDATES: customer_info, VIP signup preference
```

**Step 5 - Review & Confirmation:**
```typescript
// src/components/booking/review-payment-step.tsx
// BACKEND INTEGRATION: POST /api/public/guest-booking/
// FUNCTIONALITY:
//   - Complete booking summary display
//   - Pricing breakdown with all fees
//   - Booking submission to Django
//   - Confirmation screen with booking number
//   - Payment processing placeholder (Stripe ready)
// STATE UPDATES: Booking completion, wizard reset
```

### Booking State Management

```typescript
// src/stores/booking-store.ts
// FUNCTIONALITY: Complete booking wizard state coordination
// KEY FEATURES:
//   - Persistent storage (survives page refresh)
//   - Multi-step navigation with validation
//   - Error handling and field validation
//   - Step completion checking
//   - Data coordination between steps

interface BookingData {
  // Service Selection
  service_type: 'mini_move' | 'standard_delivery' | 'specialty_item';
  mini_move_package_id?: string;
  include_packing?: boolean;
  include_unpacking?: boolean;
  standard_delivery_item_count?: number;
  specialty_item_ids?: string[];
  
  // Date/Time
  pickup_date?: string;
  pickup_time?: 'morning' | 'afternoon' | 'evening';
  coi_required?: boolean;
  
  // Addresses  
  pickup_address?: BookingAddress;
  delivery_address?: BookingAddress;
  special_instructions?: string;
  
  // Customer Info
  customer_info?: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  
  // Calculated Pricing
  pricing_data?: {
    base_price_dollars: number;
    surcharge_dollars: number;
    coi_fee_dollars: number;
    organizing_total_dollars: number;
    total_price_dollars: number;
  };
}
```

## Backend Integration Architecture (Working)

### Current API Integrations

**Public APIs (No Authentication):**
```
GET /api/public/services/
- Fetches complete service catalog
- Returns: MiniMovePackage[], StandardDelivery config, SpecialtyItem[]
- Used by: service-selection-step.tsx, service-showcase.tsx

GET /api/public/availability/  
- Returns 30-day calendar with availability and surcharges
- Used by: date-time-step.tsx

POST /api/public/pricing-preview/
- Real-time pricing calculation including organizing services
- Accepts: service config + pickup date
- Returns: complete pricing breakdown
- Used by: date-time-step.tsx

POST /api/public/guest-booking/
- Creates complete booking record in Django
- Accepts: complete BookingData object
- Returns: booking confirmation with booking_number
- Used by: review-payment-step.tsx
```

**API Client Configuration:**
```typescript
// src/lib/api-client.ts - Production-ready Django integration
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8005',
  withCredentials: true, // Essential for Django sessions
  headers: { 'Content-Type': 'application/json' }
});

// Automatic CSRF token handling
apiClient.interceptors.request.use(async (config) => {
  if (['post', 'put', 'patch', 'delete'].includes(config.method!)) {
    const csrfResponse = await axios.get(`${config.baseURL}/api/customer/csrf-token/`);
    config.headers['X-CSRFToken'] = csrfResponse.data.csrf_token;
  }
  return config;
});
```

## Marketing Website Implementation

**Homepage with Real Content:**
```typescript
// src/app/page.tsx  
// CONTENT: Real ToteTaxi messaging, customer testimonials
// FEATURES:
//   - Hero section with authentic value proposition
//   - Customer testimonials (Natalie M., Kimberly R., etc.)
//   - Service overview with live pricing data
//   - Trust signals (BLADE partnership, 500+ moves, zero damage)
//   - Booking wizard modal trigger
// BACKEND: ServiceShowcase component fetches live data
```

**Services Page:**
```typescript
// src/app/services/page.tsx
// CONTENT: Detailed service descriptions with real ToteTaxi pricing
// BACKEND INTEGRATION: GET /api/public/services/ for live pricing
// FEATURES:
//   - Mini Move packages with real descriptions and pricing
//   - Standard Delivery rates and policies  
//   - Specialty Items catalog with current prices
//   - Service areas and restrictions
//   - Simple 3-step process overview
```

**About Page:**  
```typescript
// src/app/about/page.tsx
// CONTENT: Real founder story (Danielle Candela)
// FEATURES:
//   - Authentic company story ("too many shoes" origin)
//   - Company timeline (Founded 2016, Launched 2018)
//   - Partnership information (BLADE, Cultured Magazine, Luggage Free)
//   - Business metrics and trust indicators
```

**FAQ Page:**
```typescript
// src/app/faq/page.tsx  
// CONTENT: Real ToteTaxi policies and procedures
// FEATURES:
//   - Expandable question categories
//   - Real liability terms and insurance information
//   - Prohibited items list (from shipping restrictions)
//   - Actual pickup times, wait policies, cancellation terms
//   - Office location (395 County Road 39A, Southampton)
```

**Contact Page:**
```typescript
// src/app/contact/page.tsx
// CONTENT: Real ToteTaxi contact information
// FEATURES:
//   - Actual phone: 631-595-5100
//   - Real email: info@totetaxi.com  
//   - Service area details
//   - Contact form with service type selection
//   - Marketing inquiry differentiation
```

## Phase 2: Customer Portal (Backend APIs Complete - Frontend Ready)

### Authentication System (Backend Implemented)

**Available Backend APIs:**
```
POST /api/customer/auth/register/ - Customer account creation
POST /api/customer/auth/login/ - Email/password authentication  
POST /api/customer/auth/logout/ - Session termination
GET /api/customer/auth/user/ - Current user information
GET /api/customer/csrf-token/ - CSRF token for authenticated requests
```

**Frontend Implementation Needed:**
```typescript
// Phase 2 Components to Build:
├── components/auth/
│   ├── login-form.tsx          - Email/password login with session handling
│   ├── register-form.tsx       - Account creation form
│   ├── protected-route.tsx     - Authentication guard component
│   └── user-menu.tsx           - Authenticated user navigation
├── app/login/page.tsx          - Login page
├── app/register/page.tsx       - Registration page  
└── app/dashboard/page.tsx      - Customer dashboard entry point
```

### Customer Dashboard Features (Backend Complete)

**Available Backend APIs:**
```
GET /api/customer/dashboard/ - Account overview with statistics
GET /api/customer/profile/ - CustomerProfile management
PUT /api/customer/profile/ - Profile updates
GET /api/customer/addresses/ - SavedAddress list
POST /api/customer/addresses/ - Create new address
GET,PUT,DELETE /api/customer/addresses/<uuid>/ - Address CRUD
GET /api/customer/bookings/ - Booking history with filtering
POST /api/customer/bookings/create/ - Authenticated booking creation
POST /api/customer/bookings/<uuid>/rebook/ - Quick rebooking
```

**Frontend Implementation Needed:**
```typescript
// Customer Dashboard Components:
├── components/dashboard/
│   ├── dashboard-overview.tsx   - Account stats, recent bookings, VIP status
│   ├── booking-history.tsx      - Filterable booking list with details
│   ├── address-book.tsx         - SavedAddress CRUD interface
│   ├── profile-settings.tsx     - CustomerProfile management
│   └── quick-actions.tsx        - Rebook, modify, support shortcuts
```

**Enhanced Booking Experience:**
- Pre-filled forms using SavedAddress data
- Quick rebooking from history
- Booking modification capabilities
- VIP member benefits display

## Phase 3: Staff Dashboard/CRM (Backend Complete - Frontend Needed)

### Staff Operations System (Backend Implemented)

**Available Backend APIs:**
```
POST /api/staff/auth/login/ - Staff authentication with role checking
POST /api/staff/auth/logout/ - Staff logout with audit logging
GET /api/staff/dashboard/ - Business KPIs and urgent bookings
GET /api/staff/bookings/ - All bookings with search/filters
GET,PATCH /api/staff/bookings/<uuid>/ - Booking detail and management
```

**Backend Models Available:**
- StaffProfile with role-based permissions
- StaffAction comprehensive audit logging  
- Booking management with status tracking
- Customer data access with privacy controls

**Frontend Implementation Needed:**
```typescript
// Staff Interface Components:
├── components/staff/
│   ├── staff-login.tsx          - Role-based authentication
│   ├── dashboard-kpis.tsx       - Real-time business metrics
│   ├── booking-management.tsx   - Search, filter, update bookings
│   ├── customer-support.tsx     - Customer profile and history access
│   └── audit-log.tsx            - Staff action history viewing
├── app/staff/
│   ├── login/page.tsx           - Staff authentication page
│   ├── dashboard/page.tsx       - Operations dashboard
│   └── bookings/page.tsx        - Booking management interface
```

**Staff Dashboard Features:**
- Real-time booking pipeline
- Customer search and profile access
- Booking status updates and tracking  
- Refund and modification processing
- Financial reporting access
- Audit trail viewing

## Phase 4: AWS & File Integration (Backend Configured)

### AWS Services (Backend Ready)

**S3 File Storage:**
- Configured for COI document uploads
- Ready for customer file attachments
- Image upload for specialty items

**SES Email System:**  
- Configured for transactional emails
- Ready for booking confirmations
- Status update notifications

**Frontend Integration Needed:**
```typescript
// File Upload Components:
├── components/uploads/
│   ├── coi-upload.tsx          - COI document upload interface
│   ├── file-preview.tsx        - File viewing and download
│   └── image-upload.tsx        - Image upload for items
├── components/email/
│   ├── email-preferences.tsx   - Customer notification settings
│   └── template-preview.tsx    - Email template display
```

## Google API Integration (Planned)

### Available Integrations

**Google Places API:**
- Address autocomplete in booking forms
- Address validation and standardization
- Service area verification

**Google SSO (Backend Infrastructure Ready):**
- OAuth integration for customer authentication
- Streamlined registration process

## Development Patterns & Standards

### Component Architecture

**Variant-Based Design System:**
```typescript
// Easy client modification pattern used throughout
const buttonVariants = {
  variant: {
    primary: 'bg-navy-900 text-white hover:bg-navy-800',
    secondary: 'bg-gold-500 text-navy-900 hover:bg-gold-600',
    outline: 'border-2 border-navy-900 text-navy-900 hover:bg-navy-50'
  }
};
```

**API Integration Pattern:**
```typescript
// Standard TanStack Query pattern used throughout
export const useServiceCatalog = () => {
  return useQuery({
    queryKey: ['services', 'catalog'],
    queryFn: async () => {
      const response = await apiClient.get('/api/public/services/');
      return response.data;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30     // 30 minutes
  });
};
```

### Error Handling Standards

**Centralized Error Processing:**
```typescript
// src/lib/api-client.ts - Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth and redirect to login
    }
    return Promise.reject(error);
  }
);
```

### TypeScript Integration

**Complete Django Model Interfaces:**
```typescript
// src/types/index.ts - Full backend model mapping
export interface CustomerProfile {
  id: string;
  user: DjangoUser;
  phone: string;
  total_bookings: number;
  total_spent_dollars: number;
  preferred_pickup_time: 'morning' | 'afternoon' | 'evening';
  is_vip: boolean;
  // ... complete interface matching Django model
}
```

## Production Deployment Readiness

**Current Status:**
- Complete booking system working locally
- All API integrations functional
- Mobile-responsive design implemented
- Error handling and loading states complete

**Production Requirements:**
- Remove TestAPIConnection component
- Configure production environment variables
- Set up Stripe payment processing
- Deploy to hosting platform

## Development Continuation Guide

### For Authentication Development:
**Required Files:**
- `apps/customers/views.py` - Backend auth endpoints
- `src/stores/auth-store.ts` - Current auth state management
- `src/lib/api-client.ts` - CSRF and session handling

### For Customer Dashboard Development:  
**Required Files:**
- `apps/customers/models.py` - CustomerProfile, SavedAddress models
- `apps/customers/booking_views.py` - Authenticated booking endpoints
- `src/components/booking/` - Existing booking wizard to enhance

### For Staff Dashboard Development:
**Required Files:**
- `apps/accounts/models.py` - StaffProfile, StaffAction models
- `apps/accounts/views.py` - Staff endpoints and KPIs
- `src/stores/auth-store.ts` - Adapt for staff authentication

### For AWS Integration:
**Required Files:**
- Backend S3/SES configuration files
- `apps/documents/` - File handling models
- `apps/notifications/` - Email system integration

This documentation serves as complete AI memory for ToteTaxi frontend development, covering operational reality, established patterns, and clear development pathways for all planned features.