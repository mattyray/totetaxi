Perfect! Let me generate the comprehensive but condensed living documentation. I'll search for a few more specific areas first to ensure completeness.Perfect! Now I'll generate the comprehensive but condensed living documentation. This will be all 10 sections with full component interfaces but minimal prose, targeting 16K tokens.Now generating the comprehensive living documentation with 16K token target...

# TOTETAXI FRONTEND - LIVING DOCUMENTATION v2.0

**Purpose:** Strategic navigation system for frontend_snapshot.txt - enables AI to understand architecture, locate files, and intelligently request specific implementations.

**Last Updated:** 2025-10-11  
**Frontend Size:** ~83 files  
**Documentation Size Target:** ~16,000 tokens (10-15% of snapshot)

---

## SECTION 1: SYSTEM ARCHITECTURE MENTAL MODEL

### Technology Stack

**Framework & Runtime:**
- Next.js 15.5.0 (App Router) - File-based routing, React Server Components
- React 19.1.0 - Latest React with enhanced concurrent features
- TypeScript 5.x - Strict type safety enabled

**State Management:**
- Zustand 4.5.7 with persist middleware - Lightweight state management
- TanStack Query v5.87.1 - Server state caching and synchronization
- Local state via React hooks

**Data Fetching & API:**
- Axios 1.11.0 - HTTP client with interceptors
- TanStack Query - Query/mutation management, cache invalidation
- Backend: Django REST Framework API

**Styling & UI:**
- Tailwind CSS 3.4.17 - Utility-first styling
- Custom design system (navy/gold/cream palette)
- Headless UI 2.2.7 - Accessible primitives
- Heroicons 2.2.0 - Icon library

**Forms & Validation:**
- React Hook Form 7.62.0 - Performant form management
- Zod 3.25.76 - Runtime schema validation
- @hookform/resolvers - RHF + Zod integration

**Payment Processing:**
- Stripe Elements (@stripe/react-stripe-js 4.0.2)
- Stripe.js 7.9.0 - Payment intents, embedded checkout

**Location Services:**
- Google Places API (@types/google.maps)
- react-google-autocomplete 2.7.5 - Address autocomplete

**Build & Development:**
- PostCSS + Autoprefixer - CSS processing
- ESLint (disabled in builds for rapid iteration)
- Netlify deployment configuration

### Application Architecture

**Core Business Logic:**
- Transportation/moving service booking platform
- Multi-service types: Mini Move, Standard Delivery, Specialty Item, BLADE Transfer
- Dual auth systems: Customer portal + Staff admin panel
- Stripe payment processing with refund management
- Geographic service area validation (NY/CT/NJ + Hamptons)

**Component Organization Strategy:**
```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth route group
│   ├── (dashboard)/       # Protected dashboard routes
│   ├── staff/             # Staff admin routes
│   └── layout.tsx         # Root layout with providers
├── components/
│   ├── auth/              # Authentication flows
│   ├── booking/           # Multi-step booking wizard
│   ├── dashboard/         # Customer dashboard views
│   ├── staff/             # Staff admin components
│   ├── marketing/         # Public marketing sections
│   ├── layout/            # Layout shells
│   ├── providers/         # Context providers
│   └── ui/                # Reusable UI primitives
├── stores/                # Zustand state stores
├── lib/                   # Configuration & utilities
├── types/                 # TypeScript definitions
└── utils/                 # Helper functions
```

**State Management Philosophy:**
- **Zustand stores** - Client-side application state (auth, booking wizard, UI)
- **TanStack Query** - Server state caching (bookings, payments, customers)
- **Local state** - Component-specific UI state (form inputs, modals, dropdowns)
- **Persistence** - LocalStorage for auth and booking wizard (24hr expiry)

**Data Flow Pattern:**
1. User interaction triggers component action
2. Component dispatches Zustand store action or TanStack mutation
3. Store/mutation calls API client (axios with interceptors)
4. Response updates store or invalidates queries
5. Components re-render via subscriptions

### Backend Integration Philosophy

**API Architecture:**
- Base URL: Process.env.NEXT_PUBLIC_API_URL
- Django REST Framework backend
- Session + CSRF token authentication
- Mobile-compatible (session ID fallback)

**Authentication Flow:**
- Customer: Email/password → `/api/customer/auth/login/` → Session cookie + localStorage
- Staff: Username/password → `/api/staff/auth/login/` → Separate session
- 401 responses trigger global auth cleanup (query cache clear, store reset, redirect)

**Error Handling:**
- Global 401 interceptor in apiClient
- TanStack Query error boundaries
- Toast notifications via ui-store
- Form validation errors displayed inline

**Real-time Updates:**
- Optimistic updates for mutations (instant UI feedback)
- Background refetching on window focus (disabled)
- 5min stale time, 30min garbage collection
- Query invalidation on related mutations

---

## SECTION 2: BACKEND INTEGRATION MAP

**Reference:** See backend README.md for complete API specifications. Frontend mapping below shows consumption patterns.

### Customer Authentication & Profile APIs

| Backend Endpoint | Frontend Hook/Component | State Updates | Files |
|---|---|---|---|
| POST `/api/customer/auth/register/` | `useAuthStore.register()` | Sets `user`, `customerProfile`, `isAuthenticated` | stores/auth-store.ts, components/auth/register-form.tsx |
| POST `/api/customer/auth/login/` | `useAuthStore.login()` | Sets auth state, clears booking wizard | stores/auth-store.ts, components/auth/login-form.tsx |
| POST `/api/customer/auth/logout/` | `useAuthStore.logout()` | Clears all client state | stores/auth-store.ts |
| GET `/api/customer/auth/user/` | `useAuthStore.validateSession()` | Validates/refreshes session | stores/auth-store.ts |
| GET `/api/customer/profile/` | TanStack Query `['customer', 'profile']` | Cached profile data | app/dashboard/page.tsx |
| PATCH `/api/customer/profile/` | Mutation `useUpdateProfile` | Updates profile, invalidates cache | components/dashboard/dashboard-overview.tsx |
| GET `/api/customer/dashboard/` | Query `['customer', 'dashboard']` | Dashboard metrics | components/dashboard/dashboard-overview.tsx |

### Staff Authentication & Management APIs

| Backend Endpoint | Frontend Hook/Component | State Updates | Files |
|---|---|---|---|
| POST `/api/staff/auth/login/` | `useStaffAuthStore.login()` | Sets `user`, `staffProfile` | stores/staff-auth-store.ts, components/staff/staff-login-form.tsx |
| POST `/api/staff/auth/logout/` | `useStaffAuthStore.logout()` | Clears staff + customer auth | stores/staff-auth-store.ts |
| GET `/api/staff/dashboard/` | Query `['staff', 'dashboard']` | Staff metrics | components/staff/staff-dashboard-overview.tsx |
| GET `/api/staff/bookings/` | Query `['staff', 'bookings']` | Booking list with filters | components/staff/booking-management.tsx |
| GET `/api/staff/bookings/{id}/` | Query `['staff', 'booking', id]` | Detailed booking | components/staff/booking-detail-modal.tsx |
| PATCH `/api/staff/bookings/{id}/` | Mutation | Updates booking, invalidates cache | components/staff/booking-detail-modal.tsx |

### Public Booking APIs (No Auth Required)

| Backend Endpoint | Frontend Hook/Component | State Updates | Files |
|---|---|---|---|
| GET `/api/bookings/services/` | Query `['services']` | Service catalog | components/booking/service-selection-step.tsx |
| POST `/api/bookings/pricing-preview/` | Mutation | Updates `bookingData.pricing_data` | components/booking/address-step.tsx |
| POST `/api/bookings/guest-booking/` | Mutation | Creates booking, returns booking_number | components/booking/review-payment-step.tsx |
| GET `/api/bookings/booking-status/{number}/` | Query `['booking-status', number]` | Public booking lookup | (potential future use) |
| POST `/api/bookings/validate-zip/` | Mutation | Validates service area | components/booking/address-step.tsx |

### Customer Booking Management APIs (Auth Required)

| Backend Endpoint | Frontend Hook/Component | State Updates | Files |
|---|---|---|---|
| GET `/api/customer/bookings/` | Query `['customer', 'bookings']` | User's booking list | components/dashboard/booking-history.tsx |
| POST `/api/customer/bookings/create/` | Mutation `useCreateBooking` | Creates authenticated booking | components/booking/review-payment-step.tsx |
| GET `/api/customer/bookings/{id}/` | Query `['customer', 'booking', id]` | Detailed booking view | components/dashboard/booking-history.tsx |

### Payment APIs

| Backend Endpoint | Frontend Hook/Component | State Updates | Files |
|---|---|---|---|
| POST `/api/payments/create-intent/` | `createPaymentIntent` | Returns `clientSecret` for Stripe | components/booking/review-payment-step.tsx |
| POST `/api/payments/confirm/` | `confirmPayment` | Confirms payment, finalizes booking | components/booking/review-payment-step.tsx |
| GET `/api/payments/status/{booking_number}/` | Query | Payment status lookup | components/dashboard/booking-history.tsx |

### Staff Payment & Refund APIs

| Backend Endpoint | Frontend Hook/Component | State Updates | Files |
|---|---|---|---|
| GET `/api/payments/payments/` | Query `['staff', 'payments']` | Payment list | components/staff/booking-detail-modal.tsx |
| GET `/api/payments/refunds/` | Query `['staff', 'refunds']` | Refund list with filters | components/staff/booking-detail-modal.tsx, components/staff/refund-modal.tsx |
| POST `/api/payments/refunds/create/` | Mutation | Creates refund request | components/staff/refund-modal.tsx |
| POST `/api/payments/refunds/process/` | Mutation | Processes refund via Stripe | components/staff/refund-modal.tsx |

**Key Integration Patterns:**
- All API calls go through `lib/api-client.ts` (axios instance)
- CSRF tokens fetched on mount, stored in localStorage
- Session IDs stored for mobile compatibility
- 401 errors trigger global auth cleanup via interceptors
- TanStack Query handles caching, refetching, and optimistic updates

---

## SECTION 3: COMPLETE COMPONENT INTERFACE DOCUMENTATION

### Booking Wizard Components

#### `BookingWizard`
**File:** `components/booking/booking-wizard.tsx`
```typescript
interface BookingWizardProps {
  onComplete?: (bookingNumber: string) => void; // Called after successful booking
  initialStep?: number;                         // Optional starting step (default: 0)
}
```
**Purpose:** Multi-step booking flow orchestrator  
**Steps:** 0=Auth Choice, 1=Service, 2=DateTime, 3=Addresses, 4=CustomerInfo, 5=ReviewPayment  
**State:** Uses `useBookingWizard` store for wizard state persistence  
**Child Components:** AuthChoiceStep, ServiceSelectionStep, DateTimeStep, AddressStep, CustomerInfoStep, ReviewPaymentStep

#### `AuthChoiceStep`
**File:** `components/booking/auth-choice-step.tsx`
```typescript
interface AuthChoiceStepProps {} // No props - reads from stores
```
**Purpose:** Initial step - login or continue as guest  
**State:** `useAuthStore`, `useBookingWizard`  
**Actions:** Guest mode → next step, Login → skip to step 1 (service selection)

#### `ServiceSelectionStep`
**File:** `components/booking/service-selection-step.tsx`
```typescript
interface ServiceSelectionStepProps {} // No props
```
**Purpose:** Select service type and options  
**Services:** mini_move, standard_delivery, specialty_item, blade_transfer  
**API:** GET `/api/bookings/services/` via TanStack Query  
**Validation:** Requires package selection for mini_move before proceeding

#### `DateTimeStep`
**File:** `components/booking/date-time-step.tsx`
```typescript
interface DateTimeStepProps {} // No props
```
**Purpose:** Select pickup date and time window  
**Options:** morning, morning_specific (with hour picker), no_time_preference  
**Validation:** Requires pickup_date, conditionally requires specific_pickup_hour

#### `AddressStep`
**File:** `components/booking/address-step.tsx`
```typescript
interface AddressStepProps {} // No props
```
**Purpose:** Enter pickup and delivery addresses with Google Places autocomplete  
**Features:** ZIP validation, pricing recalculation, airport shortcuts  
**Child Components:** GoogleAddressInput, AddressForm  
**API:** POST `/api/bookings/pricing-preview/`, POST `/api/bookings/validate-zip/`

#### `GoogleAddressInput`
**File:** `components/booking/google-address-input.tsx`
```typescript
interface GoogleAddressInputProps {
  value: string;
  onChange: (value: string, place?: google.maps.places.PlaceResult) => void;
  onPlaceSelected: (address: Partial<BookingAddress>) => void;
  label: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}
```
**Purpose:** Google Places autocomplete input with validation  
**Integration:** Uses `react-google-autocomplete` library  
**Parsing:** `parseGooglePlace` util extracts structured address

#### `CustomerInfoStep`
**File:** `components/booking/customer-info-step.tsx`
```typescript
interface CustomerInfoStepProps {} // No props
```
**Purpose:** Collect guest customer information (skipped for authenticated users)  
**Fields:** first_name, last_name, email, phone  
**Conditional:** Only shown if `isGuestMode === true`

#### `ReviewPaymentStep`
**File:** `components/booking/review-payment-step.tsx`
```typescript
interface ReviewPaymentStepProps {} // No props
```
**Purpose:** Review booking details and process payment  
**Payment Flow:** Creates intent → Stripe Elements → Confirms payment → Creates booking  
**Child Component:** PaymentForm (internal)  
**Success:** Shows confirmation screen with booking number

### Authentication Components

#### `LoginForm`
**File:** `components/auth/login-form.tsx`
```typescript
interface LoginFormProps {
  onSuccess?: () => void;           // Optional callback after login
  redirectTo?: string;              // Optional redirect path
  showGuestOption?: boolean;        // Show "Continue as Guest" button
}
```
**Purpose:** Customer authentication form  
**Features:** Email verification check, staff account detection  
**API:** POST `/api/customer/auth/login/`  
**State:** Updates `useAuthStore`

#### `RegisterForm`
**File:** `components/auth/register-form.tsx`
```typescript
interface RegisterFormProps {
  onSuccess?: (user: DjangoUser) => void;
  redirectTo?: string;
}
```
**Purpose:** Customer registration with email verification  
**Fields:** email, password, confirm_password, first_name, last_name, phone  
**Validation:** Zod schema with password strength rules  
**API:** POST `/api/customer/auth/register/`

### Dashboard Components

#### `DashboardOverview`
**File:** `components/dashboard/dashboard-overview.tsx`
```typescript
interface DashboardOverviewProps {} // No props
```
**Purpose:** Customer dashboard landing page  
**Data Sources:** Query `['customer', 'dashboard']`  
**Displays:** Metrics, recent bookings, quick actions  
**Child Components:** BookingHistory, QuickActions (potential), metric cards

#### `BookingHistory`
**File:** `components/dashboard/booking-history.tsx`
```typescript
interface BookingHistoryProps {
  limit?: number;                   // Max bookings to display
  showFilters?: boolean;            // Show status filters
}
```
**Purpose:** Display user's past and upcoming bookings  
**API:** GET `/api/customer/bookings/`  
**Features:** Status filtering, expandable details, action buttons

### Staff Components

#### `StaffLoginForm`
**File:** `components/staff/staff-login-form.tsx`
```typescript
interface StaffLoginFormProps {
  onSuccess?: () => void;
}
```
**Purpose:** Staff authentication (username/password)  
**API:** POST `/api/staff/auth/login/`  
**State:** Updates `useStaffAuthStore`  
**Redirect:** → `/staff/dashboard`

#### `StaffDashboardOverview`
**File:** `components/staff/staff-dashboard-overview.tsx`
```typescript
interface StaffDashboardOverviewProps {} // No props
```
**Purpose:** Staff admin dashboard with metrics  
**API:** GET `/api/staff/dashboard/`  
**Displays:** Booking counts, revenue, pending actions

#### `BookingManagement`
**File:** `components/staff/booking-management.tsx`
```typescript
interface BookingManagementProps {} // No props
```
**Purpose:** Staff booking list with search and filters  
**API:** GET `/api/staff/bookings/` with query params  
**Features:** Status filters, search, detail modal  
**Child Components:** BookingDetailModal

#### `BookingDetailModal`
**File:** `components/staff/booking-detail-modal.tsx`
```typescript
interface BookingDetailModalProps {
  bookingId: string;
  isOpen: boolean;
  onClose: () => void;
}
```
**Purpose:** View and edit booking details (staff only)  
**API:** GET `/api/staff/bookings/{id}/`, PATCH `/api/staff/bookings/{id}/`  
**Features:** Inline editing, payment info, refund actions  
**Child Components:** RefundModal (conditional)

#### `RefundModal`
**File:** `components/staff/refund-modal.tsx`
```typescript
interface RefundModalProps {
  bookingId: string;
  paymentId: string;
  maxRefundAmount: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}
```
**Purpose:** Create and process refunds  
**API:** POST `/api/payments/refunds/create/`, POST `/api/payments/refunds/process/`  
**Features:** Partial refunds, reason textarea, approval workflow

#### `CustomerManagement`
**File:** `components/staff/customer-management.tsx`
```typescript
interface CustomerManagementProps {} // No props
```
**Purpose:** Staff customer list and detail view  
**API:** (Inferred - likely `/api/staff/customers/`)  
**Features:** Search, VIP indicators, booking history per customer

#### `StaffLayout`
**File:** `components/staff/staff-layout.tsx`
```typescript
interface StaffLayoutProps {
  children: React.ReactNode;
}
```
**Purpose:** Layout wrapper for staff pages  
**Features:** Staff navigation, auth check, logout

### Layout Components

#### `MainLayout`
**File:** `components/layout/main-layout.tsx`
```typescript
interface MainLayoutProps {
  children: React.ReactNode;
  onBookNowClick?: () => void;      // Optional callback for "Book Now" button
  hideBookingButton?: boolean;      // Hide booking CTA
}
```
**Purpose:** Main site layout with header and footer  
**Features:** Customer menu dropdown, navigation, responsive design  
**Auth:** Shows different menu items based on `isAuthenticated`

### Marketing Components

#### `HeroSection`
**File:** `components/marketing/hero-section.tsx`
```typescript
interface HeroSectionProps {
  onBookNowClick: () => void;       // Required - opens booking wizard
}
```
**Purpose:** Homepage hero with CTA

#### `ServiceShowcase`
**File:** `components/marketing/service-showcase.tsx`
```typescript
interface ServiceShowcaseProps {} // No props
```
**Purpose:** Display service types with imagery

#### `HowItWorksSection`, `WhatWeTransportSection`, `ServiceAreasSection`, `TestimonialsSection`
**Files:** `components/marketing/*.tsx`
```typescript
interface SectionProps {} // No props - static content
```
**Purpose:** Marketing content sections for homepage

### UI Primitive Components

#### `Button`
**File:** `components/ui/button.tsx`
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;              // Shows loading spinner
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}
```
**Purpose:** Reusable button with variants and loading states

#### `Card`
**File:** `components/ui/card.tsx`
```typescript
interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  className?: string;
  onClick?: () => void;             // Makes card clickable
  hoverable?: boolean;              // Adds hover effects
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}
```
**Purpose:** Card layout primitive with header/content sections

#### `Input`
**File:** `components/ui/input.tsx`
```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;                   // Error message
  helperText?: string;              // Helper text below input
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}
```
**Purpose:** Form input with label and error display

#### `Select`
**File:** `components/ui/select.tsx`
```typescript
interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  fullWidth?: boolean;
}
```
**Purpose:** Dropdown select component

#### `Modal`
**File:** `components/ui/modal.tsx`
```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnOverlayClick?: boolean;    // Default: true
  showCloseButton?: boolean;        // Default: true
}
```
**Purpose:** Accessible modal dialog using Headless UI  
**Features:** Focus trap, ESC to close, overlay click to close

---

## SECTION 4: FILE DIRECTORY + PURPOSE INDEX

```
frontend/
├── src/
│   ├── app/                                    # Next.js App Router pages
│   │   ├── (auth)/                             # Auth route group (layout isolation)
│   │   │   ├── login/page.tsx                  # Customer login page
│   │   │   ├── register/page.tsx               # Customer registration page
│   │   │   └── forgot-password/page.tsx        # Password reset request
│   │   ├── about/page.tsx                      # About/story page
│   │   ├── dashboard/page.tsx                  # Customer dashboard (protected)
│   │   ├── staff/                              # Staff admin routes
│   │   │   ├── dashboard/page.tsx              # Staff dashboard (protected)
│   │   │   ├── bookings/page.tsx               # Staff booking management
│   │   │   ├── customers/page.tsx              # Staff customer management
│   │   │   └── login/page.tsx                  # Staff login page
│   │   ├── page.tsx                            # Homepage with booking wizard
│   │   ├── layout.tsx                          # Root layout with providers
│   │   └── globals.css                         # Global Tailwind styles
│   ├── components/
│   │   ├── auth/
│   │   │   ├── login-form.tsx                  # Customer login form with validation
│   │   │   ├── register-form.tsx               # Customer registration form
│   │   │   └── session-validator.tsx           # Background session validation
│   │   ├── booking/
│   │   │   ├── booking-wizard.tsx              # Main wizard orchestrator (6 steps)
│   │   │   ├── auth-choice-step.tsx            # Step 0: Login or guest choice
│   │   │   ├── service-selection-step.tsx      # Step 1: Service type and options
│   │   │   ├── date-time-step.tsx              # Step 2: Date and time selection
│   │   │   ├── address-step.tsx                # Step 3: Addresses with validation
│   │   │   ├── google-address-input.tsx        # Google Places autocomplete input
│   │   │   ├── customer-info-step.tsx          # Step 4: Guest info (conditional)
│   │   │   ├── review-payment-step.tsx         # Step 5: Review and Stripe payment
│   │   │   └── index.ts                        # Component exports
│   │   ├── dashboard/
│   │   │   ├── dashboard-overview.tsx          # Customer dashboard main view
│   │   │   ├── booking-history.tsx             # User's booking list
│   │   │   └── quick-actions.tsx               # Dashboard action buttons
│   │   ├── staff/
│   │   │   ├── staff-login-form.tsx            # Staff authentication form
│   │   │   ├── staff-dashboard-overview.tsx    # Staff dashboard with metrics
│   │   │   ├── staff-layout.tsx                # Staff navigation layout
│   │   │   ├── booking-management.tsx          # Staff booking list with filters
│   │   │   ├── booking-detail-modal.tsx        # Booking detail with edit capability
│   │   │   ├── booking-calendar.tsx            # Calendar view of bookings
│   │   │   ├── customer-management.tsx         # Customer list and detail
│   │   │   ├── refund-modal.tsx                # Refund creation and processing
│   │   │   └── index.ts                        # Component exports
│   │   ├── marketing/
│   │   │   ├── hero-section.tsx                # Homepage hero
│   │   │   ├── service-showcase.tsx            # Service type cards
│   │   │   ├── how-it-works-section.tsx        # Process explanation
│   │   │   ├── what-we-transport-section.tsx   # Item categories
│   │   │   ├── service-areas-section.tsx       # Geographic coverage
│   │   │   ├── testimonials-section.tsx        # Customer reviews
│   │   │   └── index.ts                        # Component exports
│   │   ├── layout/
│   │   │   └── main-layout.tsx                 # Main site header/footer layout
│   │   ├── providers/
│   │   │   └── query-provider.tsx              # TanStack Query provider wrapper
│   │   └── ui/                                 # Reusable UI primitives
│   │       ├── button.tsx                      # Button with variants and loading
│   │       ├── card.tsx                        # Card layout primitive
│   │       ├── input.tsx                       # Form input with error display
│   │       ├── select.tsx                      # Dropdown select
│   │       ├── modal.tsx                       # Accessible modal dialog
│   │       └── index.ts                        # Component exports
│   ├── stores/                                 # Zustand state management
│   │   ├── auth-store.ts                       # Customer auth state (user, login, logout)
│   │   ├── staff-auth-store.ts                 # Staff auth state (separate session)
│   │   ├── booking-store.ts                    # Booking wizard state (multi-step)
│   │   └── ui-store.ts                         # UI state (notifications, modals)
│   ├── lib/                                    # Configuration and clients
│   │   ├── api-client.ts                       # Axios instance with interceptors
│   │   ├── query-client.ts                     # TanStack Query client config
│   │   ├── stripe.ts                           # Stripe.js initialization
│   │   └── google-places-utils.ts              # Address parsing utilities
│   ├── hooks/
│   │   └── use-click-away.ts                   # Click outside detection hook
│   ├── types/
│   │   └── index.ts                            # TypeScript type definitions
│   └── utils/
│       └── cn.ts                               # Tailwind class merger (clsx + twMerge)
├── next.config.ts                              # Next.js configuration with security headers
├── tailwind.config.js                          # Tailwind config (navy/gold/cream palette)
├── tsconfig.json                               # TypeScript compiler options
├── package.json                                # Dependencies and scripts
├── netlify.toml                                # Netlify deployment config
└── postcss.config.js                           # PostCSS with Tailwind and Autoprefixer
```

---

## SECTION 5: FEATURE-TO-FILE DEPENDENCY MAPS

### Customer Authentication Flow
**Entry:** `app/login/page.tsx`, `app/register/page.tsx`
```
Customer Login:
├── Pages: app/login/page.tsx
├── Components: components/auth/login-form.tsx
├── Stores: stores/auth-store.ts (login action)
├── API: POST /api/customer/auth/login/
├── Success Flow: Set auth state → Clear wizard → Redirect to /dashboard
└── Files to Request: [auth-store.ts, login-form.tsx]

Customer Registration:
├── Pages: app/register/page.tsx
├── Components: components/auth/register-form.tsx
├── Stores: stores/auth-store.ts (register action)
├── API: POST /api/customer/auth/register/
├── Validation: Zod schema in register-form.tsx
├── Success Flow: Email verification required → Redirect to /login
└── Files to Request: [auth-store.ts, register-form.tsx]

Session Validation (Background):
├── Component: components/auth/session-validator.tsx
├── Stores: useAuthStore, useStaffAuthStore
├── API: GET /api/customer/auth/user/, GET /api/staff/dashboard/
├── Trigger: Root layout mount + 401 responses
└── Files to Request: [auth-store.ts, staff-auth-store.ts, session-validator.tsx]
```

### Booking Wizard Flow (Multi-Step)
**Entry:** `app/page.tsx` → BookingWizard modal
```
Full Booking Flow:
├── Orchestrator: components/booking/booking-wizard.tsx
├── Store: stores/booking-store.ts (wizard state + persistence)
├── Steps:
│   ├── 0: components/booking/auth-choice-step.tsx (login/guest decision)
│   ├── 1: components/booking/service-selection-step.tsx (service + options)
│   ├── 2: components/booking/date-time-step.tsx (pickup date/time)
│   ├── 3: components/booking/address-step.tsx (addresses + pricing)
│   ├── 4: components/booking/customer-info-step.tsx (guest info - conditional)
│   └── 5: components/booking/review-payment-step.tsx (Stripe payment)
├── APIs:
│   ├── GET /api/bookings/services/ (step 1)
│   ├── POST /api/bookings/validate-zip/ (step 3)
│   ├── POST /api/bookings/pricing-preview/ (step 3)
│   ├── POST /api/payments/create-intent/ (step 5)
│   ├── POST /api/customer/bookings/create/ OR /api/bookings/guest-booking/ (step 5)
│   └── POST /api/payments/confirm/ (step 5)
├── Conditional Logic:
│   ├── Skip step 4 if authenticated (isGuestMode === false)
│   ├── BLADE service → auto-fills delivery address from airport
│   └── Mini Move → requires package selection before step 2
└── Files to Request: [booking-store.ts, booking-wizard.tsx, all step components, review-payment-step.tsx]
```

### Google Places Address Integration
**Entry:** `components/booking/address-step.tsx`
```
Address Autocomplete:
├── Component: components/booking/google-address-input.tsx
├── Library: react-google-autocomplete
├── Parser: lib/google-places-utils.ts (parseGooglePlace function)
├── Validation: 
│   ├── POST /api/bookings/validate-zip/ (service area check)
│   └── Client-side state validation (NY/CT/NJ only)
├── Output: Structured BookingAddress object
└── Files to Request: [google-address-input.tsx, google-places-utils.ts, address-step.tsx]
```

### Stripe Payment Processing
**Entry:** `components/booking/review-payment-step.tsx`
```
Payment Flow:
├── Initialization: lib/stripe.ts (loadStripe)
├── Intent Creation: POST /api/payments/create-intent/
│   └── Returns clientSecret
├── Stripe Elements: @stripe/react-stripe-js
│   ├── <Elements> wrapper with clientSecret
│   └── <PaymentElement> embedded form
├── Payment Confirmation:
│   ├── stripe.confirmPayment() (Stripe.js)
│   └── POST /api/payments/confirm/ (backend verification)
├── Success: Booking created, booking_number returned
└── Files to Request: [review-payment-step.tsx, stripe.ts, api-client.ts]
```

### Customer Dashboard
**Entry:** `app/dashboard/page.tsx`
```
Dashboard Overview:
├── Page: app/dashboard/page.tsx
├── Component: components/dashboard/dashboard-overview.tsx
├── APIs:
│   ├── GET /api/customer/dashboard/ (metrics)
│   ├── GET /api/customer/profile/ (user info)
│   └── GET /api/customer/bookings/ (recent bookings)
├── Child Components:
│   └── components/dashboard/booking-history.tsx
├── State: TanStack Query caching
└── Files to Request: [dashboard-overview.tsx, booking-history.tsx, auth-store.ts]
```

### Staff Booking Management
**Entry:** `app/staff/bookings/page.tsx`
```
Staff Booking List:
├── Component: components/staff/booking-management.tsx
├── API: GET /api/staff/bookings/ (with filters: status, date range, search)
├── Features:
│   ├── Status filters (pending, confirmed, completed, cancelled)
│   ├── Search by booking number or customer name
│   └── Click to open detail modal
├── Child: components/staff/booking-detail-modal.tsx
└── Files to Request: [booking-management.tsx, staff-auth-store.ts]

Staff Booking Detail & Edit:
├── Modal: components/staff/booking-detail-modal.tsx
├── APIs:
│   ├── GET /api/staff/bookings/{id}/ (detailed view)
│   ├── PATCH /api/staff/bookings/{id}/ (edit)
│   ├── GET /api/payments/payments/ (payment info)
│   └── GET /api/payments/refunds/ (refund history)
├── Features:
│   ├── Inline editing (status, dates, addresses)
│   ├── Payment details display
│   └── Refund action button
├── Child: components/staff/refund-modal.tsx
└── Files to Request: [booking-detail-modal.tsx, refund-modal.tsx, staff-auth-store.ts]
```

### Staff Refund Processing
**Entry:** `components/staff/booking-detail-modal.tsx` → RefundModal
```
Refund Creation & Processing:
├── Modal: components/staff/refund-modal.tsx
├── APIs:
│   ├── POST /api/payments/refunds/create/ (create refund request)
│   └── POST /api/payments/refunds/process/ (process via Stripe)
├── Features:
│   ├── Partial or full refund selection
│   ├── Reason textarea (required)
│   └── Approval workflow (staff permissions)
├── State: TanStack Query mutations with optimistic updates
└── Files to Request: [refund-modal.tsx, booking-detail-modal.tsx, staff-auth-store.ts]
```

---

## SECTION 6: STATE MANAGEMENT ARCHITECTURE

### Zustand Stores (Client State)

#### Auth Store (`stores/auth-store.ts`)
**Purpose:** Customer authentication and profile state
```typescript
// State
interface AuthState {
  user: DjangoUser | null;
  customerProfile: CustomerProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Actions
- login(email, password) → API call → Set auth state
- register(data) → API call → Success/error
- logout() → Clear auth + wizard + localStorage → API call
- validateSession() → Background session check
- setAuth(user, profile) → Update state
- clearAuth() → Reset to initial state
- updateProfile(updates) → Optimistic profile update
- secureReset() → Clear all data (security feature)
```
**Persistence:** LocalStorage via Zustand persist middleware  
**Version:** 2 (auto-migrates on version mismatch)  
**Expiry:** Validated on mount via `validateSession()`

#### Staff Auth Store (`stores/staff-auth-store.ts`)
**Purpose:** Staff authentication and permissions (separate from customer auth)
```typescript
// State
interface StaffAuthState {
  user: StaffUser | null;
  staffProfile: StaffProfile | null;  // includes role and permissions
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Actions
- login(username, password) → API call → Set staff state
- logout() → Clear staff + customer auth → API call
- validateSession() → Background session check (staff dashboard)
- setAuth(user, profile) → Update state
- clearAuth() → Reset to initial state
- secureReset() → Clear all data
```
**Persistence:** LocalStorage (separate key: `totetaxi-staff-auth`)  
**Permissions:** `staffProfile.permissions` object with feature flags

#### Booking Store (`stores/booking-store.ts`)
**Purpose:** Multi-step booking wizard state with persistence
```typescript
// State
interface BookingWizardState {
  currentStep: number;              // 0-5
  isLoading: boolean;
  bookingData: BookingData;         // All form data
  errors: Record<string, string>;   // Field-level errors
  isBookingComplete: boolean;
  completedBookingNumber?: string;
  userId?: string;
  isGuestMode: boolean;
  lastResetTimestamp?: number;
}

// Actions
- setCurrentStep(step) → Navigate to step
- nextStep() → Advance with validation
- previousStep() → Go back (skip customer info if authenticated)
- updateBookingData(data) → Partial update of booking fields
- setError/clearError → Manage validation errors
- resetWizard() → Clear all data
- initializeForUser(userId, isGuest) → Setup for user/guest
- canProceedToStep(step) → Validation check
- setBookingComplete(number) → Mark wizard complete
```
**Persistence:** LocalStorage (24hr expiry via `lastResetTimestamp`)  
**Version:** 4 (auto-resets on version mismatch)  
**Partial Persistence:** Excludes `customer_info` (PII protection)

#### UI Store (`stores/ui-store.ts`)
**Purpose:** Global UI state (notifications, modals)
```typescript
// State
interface UIState {
  notifications: Notification[];    // Toast queue
  activeModal: string | null;       // Current open modal
  sidebarOpen: boolean;             // Mobile sidebar state
}

// Actions
- showNotification(type, message, duration?) → Add toast
- removeNotification(id) → Dismiss toast
- openModal(modalId) → Set active modal
- closeModal() → Clear active modal
- toggleSidebar() → Mobile nav toggle
```
**No Persistence:** Ephemeral UI state only

### TanStack Query (Server State)

**Configuration:** `lib/query-client.ts`
```typescript
queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,         // 5 minutes
      gcTime: 1000 * 60 * 30,           // 30 minutes
      retry: (failureCount, error) => {
        if (error?.response?.status === 401) return false;
        return failureCount < 3;
      },
      refetchOnWindowFocus: false
    },
    mutations: { retry: 1 }
  }
})
```

**Global Error Handling:**
- Query/Mutation cache subscribers listen for 401 errors
- Triggers `handle401Error()` → Clears all caches and auth stores

**Query Keys Convention:**
```typescript
// Customer queries
['customer', 'profile']
['customer', 'dashboard']
['customer', 'bookings']
['customer', 'booking', bookingId]

// Staff queries
['staff', 'dashboard']
['staff', 'bookings', filters?]
['staff', 'booking', bookingId]
['staff', 'customers']
['staff', 'payments']
['staff', 'refunds', filters?]

// Public queries
['services']
['booking-status', bookingNumber]
```

**Invalidation Patterns:**
- After mutations: `queryClient.invalidateQueries({ queryKey: [...] })`
- On 401: `queryClient.clear()` (global cache wipe)

---

## SECTION 7: ROUTING & NAVIGATION ARCHITECTURE

### Next.js App Router Structure

**Public Routes (No Auth Required):**
```
/                           - Homepage (app/page.tsx) - Marketing + BookingWizard
/about                      - About page (app/about/page.tsx)
/login                      - Customer login (app/(auth)/login/page.tsx)
/register                   - Customer registration (app/(auth)/register/page.tsx)
/forgot-password            - Password reset (app/(auth)/forgot-password/page.tsx)
```

**Protected Customer Routes (Auth Required):**
```
/dashboard                  - Customer dashboard (app/dashboard/page.tsx)
```
**Protection:** `SessionValidator` component in root layout checks auth on mount

**Staff Routes (Staff Auth Required):**
```
/staff/login                - Staff login (app/staff/login/page.tsx)
/staff/dashboard            - Staff dashboard (app/staff/dashboard/page.tsx)
/staff/bookings             - Booking management (app/staff/bookings/page.tsx)
/staff/customers            - Customer management (app/staff/customers/page.tsx)
```
**Protection:** `useStaffAuthStore` checks in each staff page, redirects to `/staff/login`

### Route Groups & Layout Isolation

**Auth Route Group:** `app/(auth)/`
- Shared layout for login/register/forgot-password
- Could add auth-specific styling or layout

**No Dynamic Routes:** All booking/detail views use modals instead of dynamic routes

### Navigation Components

**Customer Navigation:**
- `MainLayout` component (components/layout/main-layout.tsx)
- Desktop: Horizontal nav with "Book Now", "Dashboard", "Account" menu
- Mobile: Hamburger menu with same links
- Conditional rendering based on `isAuthenticated`

**Staff Navigation:**
- `StaffLayout` component (components/staff/staff-layout.tsx)
- Sidebar navigation: Dashboard, Bookings, Customers, Logout
- Top bar with staff name and role

**Programmatic Navigation:**
```typescript
import { useRouter } from 'next/navigation';
const router = useRouter();
router.push('/dashboard');
router.replace('/login'); // No history entry
```

### Modal-Based Navigation

**Why Modals Over Routes:**
- Booking wizard preserves state across steps
- Staff booking detail doesn't require URL change
- Faster perceived performance (no page reload)

**Modal Components:**
- BookingWizard (homepage)
- BookingDetailModal (staff)
- RefundModal (staff)
- Generic Modal primitive (components/ui/modal.tsx)

---

## SECTION 8: FORM HANDLING & VALIDATION REFERENCE

### Form Library Integration

**Stack:** React Hook Form 7.62.0 + Zod 3.25.76

**Pattern:**
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters')
});

type FormData = z.infer<typeof schema>;

const {
  register,
  handleSubmit,
  formState: { errors }
} = useForm<FormData>({ resolver: zodResolver(schema) });
```

### Validation Patterns

**Login Form:**
- File: `components/auth/login-form.tsx`
- Fields: email (email format), password (min 8 chars)
- Server-side errors: Displayed via `error` state variable

**Registration Form:**
- File: `components/auth/register-form.tsx`
- Fields: email, password, confirm_password, first_name, last_name, phone
- Password validation: Min 8 chars, 1 uppercase, 1 number
- Confirm password: Must match password

**Booking Wizard:**
- File: `stores/booking-store.ts` (validation logic)
- No React Hook Form - uses Zustand store validation
- Step-by-step validation via `canProceedToStep()` function
- Field-level errors stored in `errors` object

**Address Validation:**
- File: `components/booking/address-step.tsx`
- Google Places parsing via `parseGooglePlace()`
- ZIP code validation: POST `/api/bookings/validate-zip/`
- State validation: Must be NY, CT, or NJ

**Staff Forms:**
- Booking detail inline editing: Controlled inputs with local state
- Refund modal: Zod schema for amount and reason validation

### Error Handling

**Display Patterns:**
1. **Inline errors:** Below input field, red text, conditional render on `error` prop
2. **Toast notifications:** Global errors via `ui-store.showNotification()`
3. **API errors:** Caught in try/catch, displayed as inline or toast depending on context

**Example Error Display:**
```typescript
{error && (
  <p className="text-sm text-red-600 mt-1">{error}</p>
)}
```

---

## SECTION 9: UI COMPONENT SYSTEM DOCUMENTATION

### Design System Foundation

**Color Palette:**
```typescript
colors: {
  navy: { 50-900 },    // Primary brand color
  gold: { 50-900 },    // Accent color
  cream: { 50-900 }    // Background/highlights
}
```
**Usage:**
- navy: Text, buttons, backgrounds
- gold: Accents, CTAs, highlights
- cream: Soft backgrounds, cards

**Typography:**
- Font family: Inter (sans) + Playfair Display (serif)
- Sizes: Tailwind default scale
- Font weights: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

### Component Library

**Primitives (`components/ui/`):**

1. **Button** - `button.tsx`
   - Variants: primary, secondary, outline, ghost, danger
   - Sizes: sm, md, lg
   - States: default, hover, active, disabled, loading
   - Icons: leftIcon, rightIcon props

2. **Card** - `card.tsx`
   - Variants: default, elevated (shadow), outlined
   - Subcomponents: CardHeader, CardContent
   - Hoverable prop for interactive cards

3. **Input** - `input.tsx`
   - Label, error, helper text built-in
   - Icon support (left/right)
   - Controlled or uncontrolled

4. **Select** - `select.tsx`
   - Dropdown with options array
   - Label and error display
   - Disabled state

5. **Modal** - `modal.tsx`
   - Headless UI Dialog primitive
   - Sizes: sm, md, lg, xl
   - Close on overlay click, ESC key
   - Focus trap

### Styling Approach

**Tailwind Utilities:**
- All components use Tailwind classes
- No CSS modules or styled-components
- `cn()` util for conditional classes (clsx + tailwind-merge)

**Responsive Design:**
- Mobile-first approach
- Breakpoints: sm, md, lg, xl, 2xl (Tailwind defaults)
- Example: `className="flex flex-col md:flex-row"`

**Accessibility:**
- Headless UI for modals (ARIA-compliant)
- Semantic HTML (button, input, label)
- Focus management in modals
- Keyboard navigation support

### Icon Library

**Heroicons:**
- @heroicons/react/24/outline (thin icons)
- @heroicons/react/24/solid (filled icons)
- Usage: `import { CheckIcon } from '@heroicons/react/24/outline';`

---

## SECTION 10: DEVELOPMENT PATTERNS & CONVENTIONS

### Adding a New Page

1. **Create page file:**
   ```bash
   touch src/app/new-page/page.tsx
   ```

2. **Page component structure:**
   ```typescript
   'use client';  // If using hooks/state
   import { MainLayout } from '@/components/layout/main-layout';
   
   export default function NewPage() {
     return (
       <MainLayout>
         {/* Content */}
       </MainLayout>
     );
   }
   ```

3. **Add navigation link:**
   - Update `components/layout/main-layout.tsx` navigation array

### Creating a New Component

1. **File location:** `src/components/[category]/component-name.tsx`
2. **Naming convention:** PascalCase for component, kebab-case for file
3. **Props interface pattern:**
   ```typescript
   interface ComponentNameProps {
     requiredProp: string;
     optionalProp?: number;
     onAction?: () => void;
   }
   
   export function ComponentName({ requiredProp, optionalProp }: ComponentNameProps) {
     // Implementation
   }
   ```
4. **Export from index:** If creating component library in folder, add to `index.ts`

### Adding Backend Integration

1. **Define TypeScript types:**
   ```typescript
   // In src/types/index.ts
   export interface NewResource {
     id: string;
     name: string;
     // ...fields
   }
   ```

2. **Create TanStack Query hook (if read operation):**
   ```typescript
   import { useQuery } from '@tanstack/react-query';
   import { apiClient } from '@/lib/api-client';
   
   export function useNewResource(id: string) {
     return useQuery({
       queryKey: ['new-resource', id],
       queryFn: async () => {
         const { data } = await apiClient.get(`/api/new-resource/${id}/`);
         return data;
       }
     });
   }
   ```

3. **Create mutation (if write operation):**
   ```typescript
   import { useMutation, useQueryClient } from '@tanstack/react-query';
   
   export function useCreateResource() {
     const queryClient = useQueryClient();
     return useMutation({
       mutationFn: async (resourceData: NewResource) => {
         const { data } = await apiClient.post('/api/new-resource/', resourceData);
         return data;
       },
       onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ['new-resource'] });
       }
     });
   }
   ```

### Code Organization Rules

**Imports order:**
1. React and Next.js imports
2. Third-party libraries
3. Local components
4. Local utilities/hooks
5. Types
6. Styles (if any)

**Component structure:**
```typescript
// 1. Imports
// 2. Type definitions
// 3. Constants/configs
// 4. Main component
// 5. Sub-components (if small)
// 6. Exports
```

### Environment Variables

**Required:**
```bash
NEXT_PUBLIC_API_URL=https://api.totetaxi.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
```

**Access:**
```typescript
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
```

**Security:** Never expose private keys with NEXT_PUBLIC_ prefix

### Testing Patterns

**Not currently implemented**, but recommended structure:
```
src/
├── components/
│   └── __tests__/
│       └── component-name.test.tsx
```

**Recommended stack:**
- Vitest for unit tests
- React Testing Library for component tests
- Playwright for E2E tests

### Deployment

**Platform:** Netlify (configured in `netlify.toml`)
**Build command:** `npm run build`
**Output directory:** `.next`
**Environment variables:** Set in Netlify dashboard

---

## AI EXECUTIVE FUNCTION CHECKLIST

This documentation enables AI to:

- [x] **Understand Architecture** - Complete tech stack and design philosophy documented
- [x] **Navigate Files** - Every file indexed with purpose in Section 4
- [x] **Identify Dependencies** - Feature-to-file maps in Section 5 show complete chains
- [x] **Request Context** - Know exactly which files to request from frontend_snapshot.txt
- [x] **Integrate Backend** - Section 2 maps all frontend→backend API connections
- [x] **Extend Features** - Section 10 provides patterns for adding pages, components, APIs
- [x] **Predict Impact** - Dependency maps show which files are affected by changes

---

## USAGE NOTES FOR AI

**To modify a feature:**
1. Consult Section 5 (Feature-to-File Dependency Maps) to identify affected files
2. Request specific files from frontend_snapshot.txt
3. Review Section 3 (Component Interfaces) for prop contracts
4. Check Section 2 (Backend Integration) for API dependencies
5. Follow Section 10 (Development Patterns) for consistent implementation

**To add a new feature:**
1. Review Section 1 (Architecture) to understand design philosophy
2. Use Section 10 (Development Patterns) for scaffolding
3. Check Section 6 (State Management) for data flow patterns
4. Reference Section 9 (UI Components) for design system compliance
5. Add entries to this documentation after implementation

**This documentation is a magnifying glass, not a replacement for frontend_snapshot.txt.**