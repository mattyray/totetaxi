I'll generate the frontend living documentation for your ToteTaxi project. Let me first search for the frontend snapshot.Now I'll generate the comprehensive frontend living documentation for your ToteTaxi project.

# **TOTETAXI FRONTEND - LIVING DOCUMENTATION v2.0**

*Strategic Navigation System for Next.js/React/TypeScript Frontend Architecture*  
*Generated: September 29, 2025*  
*Source: frontend_snapshot.txt (76 files)*

---

## **SECTION 1: SYSTEM ARCHITECTURE MENTAL MODEL**

### **Technology Stack Detection**

**Framework & Core**:
- **Next.js 15.5.0** (App Router with file-based routing)
- **React 19.1.0** (Latest with Server Components support)
- **TypeScript 5** (Strict mode enabled, path aliases configured)
- **Node Environment**: ES2017 target with ESNext modules

**State Management**:
- **Zustand 4.5.7** with persistence middleware
- **TanStack Query 5.87.1** for server state and caching
- Separate stores: `auth-store`, `staff-auth-store`, `booking-store`, `ui-store`

**Styling & UI**:
- **Tailwind CSS 3.4.17** (utility-first styling)
- **Custom Design System**: Navy/Gold/Cream color palette
- **Component Variants**: Class Variance Authority (CVA) pattern
- **Fonts**: Playfair Display (serif) + Inter (sans-serif)

**Forms & Validation**:
- **React Hook Form 7.62.0** for form state management
- **Zod 3.25.76** for runtime schema validation
- **@hookform/resolvers 3.10.0** for Zod integration

**Data Fetching & API**:
- **Axios 1.11.0** with custom interceptors
- **TanStack Query** for caching, optimistic updates
- Session-based authentication with CSRF tokens

**Payments**:
- **Stripe Elements** via `@stripe/react-stripe-js 4.0.2`
- **Stripe.js** via `@stripe/stripe-js 7.9.0`
- Publishable key from environment variables

**UI Components**:
- **Headless UI 2.2.7** for accessible primitives (Dialog, Menu)
- **Heroicons 2.2.0** for iconography
- **Custom component library** in `components/ui/`

**Build & Development**:
- **PostCSS** + Autoprefixer for CSS processing
- **ESLint** (disabled during builds for deployment speed)
- **Strict TypeScript** configuration with path aliases (`@/*`)

---

### **Project Structure Philosophy**

**Component Organization Strategy**:
```
src/
├── app/                    # Next.js App Router pages (file-based routing)
├── components/            # Reusable components grouped by domain
│   ├── auth/              # Authentication components
│   ├── booking/           # Booking wizard steps
│   ├── dashboard/         # Customer dashboard widgets
│   ├── staff/             # Staff-only components
│   ├── marketing/         # Public marketing sections
│   ├── layout/            # Layout wrappers
│   ├── ui/                # Design system primitives
│   └── providers/         # Context providers
├── stores/                # Zustand state management
├── lib/                   # Core utilities (API client, query client)
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript type definitions
└── utils/                 # Helper functions
```

**Separation of Concerns**:
- **Pages** (`app/`): Route definitions, minimal logic, delegate to components
- **Components**: UI rendering, receive data via props, emit events via callbacks
- **Stores**: Global state for auth, UI, multi-step workflows
- **API Client**: Centralized axios instance with interceptors
- **React Query**: Server state caching, automatic refetching, optimistic updates
- **Types**: Shared TypeScript interfaces matching backend contracts

---

### **State Architecture**

**Client State (Zustand)**:

1. **`auth-store`**: Customer authentication
   - Persistent: `user`, `customerProfile`, `isAuthenticated`
   - Actions: `login()`, `register()`, `logout()`, `validateSession()`
   - Version 2 with migration support

2. **`staff-auth-store`**: Staff authentication
   - Persistent: `user`, `staffProfile`, `isAuthenticated`
   - Actions: `login()`, `logout()`, `clearAuth()`
   - Isolated from customer auth (prevents hybrid accounts)

3. **`booking-store`**: Multi-step booking wizard
   - Persistent (with 24h expiration): `currentStep`, `bookingData`
   - Actions: `nextStep()`, `prevStep()`, `updateBookingData()`, `resetWizard()`
   - Guest vs authenticated mode tracking

4. **`ui-store`**: UI interactions (non-persistent)
   - State: `sidebarOpen`, `theme`, `notifications`, `modals`
   - Actions: `toggleSidebar()`, `addNotification()`, `openModal()`

**Server State (TanStack Query)**:
- **Query Keys Pattern**: `['customer', 'bookings', userId]`, `['staff', 'dashboard']`
- **Caching**: 5min stale time, 30min garbage collection
- **Optimistic Updates**: Immediate UI feedback on mutations
- **Global Error Handling**: 401 errors auto-clear auth and cache

---

### **Backend Integration Philosophy**

**API Client Configuration**:
- Base URL: `process.env.NEXT_PUBLIC_API_URL` (http://localhost:8005 dev)
- Credentials: `withCredentials: true` for session cookies
- CSRF Protection: Automatic token fetching and header injection
- Request Interceptor: Adds session cookies for mobile compatibility
- Response Interceptor: Handles 401 errors globally

**Authentication Flow**:
1. Frontend: `POST /api/customer/auth/login/` with `{email, password}`
2. Backend: Sets `sessionid` + `csrftoken` cookies (SameSite=None)
3. Frontend: Stores user + profile in `auth-store` (Zustand persist)
4. Subsequent requests: Axios auto-includes cookies + CSRF token
5. 401 response: Auto-logout, clear all caches, redirect to `/login`

**Cross-Domain Session Management**:
- Mobile-friendly: `SameSite=None; Secure` cookies
- Debug endpoint: `/api/customer/debug/` for troubleshooting
- Manual cookie headers: Request interceptor adds `Cookie: sessionid=...`

---

## **SECTION 2: BACKEND INTEGRATION MAP**

*Cross-references: See backend README.md Sections 2 & 6 for complete API specifications*

### **Customer Authentication APIs**

| Backend Endpoint | Frontend Hook/Component | Query Key | Files |
|---|---|---|---|
| `POST /api/customer/auth/register/` | `useAuthStore().register()` | N/A (mutation) | stores/auth-store.ts, components/auth/register-form.tsx |
| `POST /api/customer/auth/login/` | `useAuthStore().login()` | N/A (mutation) | stores/auth-store.ts, components/auth/login-form.tsx |
| `POST /api/customer/auth/logout/` | `useAuthStore().logout()` | N/A (mutation) | stores/auth-store.ts, components/auth/user-menu.tsx |
| `GET /api/customer/auth/user/` | `useAuthStore().validateSession()` | N/A (validation) | stores/auth-store.ts |

**State Updates**: All auth mutations update `auth-store` (user, customerProfile, isAuthenticated)

**Error Handling**: Form-level errors displayed, global 401 handled by interceptor

---

### **Customer Profile & Preferences**

| Backend Endpoint | Frontend Hook/Component | Query Key | Files |
|---|---|---|---|
| `GET /api/customer/profile/` | `useQuery` in profile page | `['customer', 'profile', userId]` | app/dashboard/page.tsx |
| `PATCH /api/customer/profile/` | `useMutation` in profile form | Invalidates profile | components/dashboard/dashboard-overview.tsx |
| `GET /api/customer/dashboard/` | `useQuery` in dashboard | `['customer', 'dashboard', userId]` | components/dashboard/dashboard-overview.tsx |

**Optimistic Updates**: Profile changes immediately reflected in UI before server confirmation

---

### **Customer Booking Management**

| Backend Endpoint | Frontend Hook/Component | Query Key | Files |
|---|---|---|---|
| `GET /api/customer/bookings/` | `useQuery` in booking history | `['customer', 'bookings', userId, filters]` | components/dashboard/booking-history.tsx |
| `POST /api/customer/bookings/create/` | `useMutation` in wizard | Invalidates bookings list | components/booking/review-payment-step.tsx |
| `GET /api/customer/bookings/<id>/` | `useQuery` in detail modal | `['customer', 'booking', bookingId]` | components/dashboard/booking-history.tsx |
| `POST /api/customer/bookings/<id>/rebook/` | `useMutation` | Invalidates bookings list | (Not yet implemented in frontend) |

**Cache Strategy**: Booking list cached 5min, detail views cached 30min, invalidated on create/update

---

### **Public Booking APIs** *(Guest checkout)*

| Backend Endpoint | Frontend Hook/Component | Query Key | Files |
|---|---|---|---|
| `GET /api/bookings/services/` | `useQuery` in wizard | `['services']` | components/booking/service-selection-step.tsx |
| `POST /api/bookings/pricing-preview/` | `useMutation` in wizard | N/A (mutation) | components/booking/service-selection-step.tsx |
| `POST /api/bookings/guest-booking/` | `useMutation` in wizard | N/A (mutation) | components/booking/review-payment-step.tsx |

**Booking Wizard State**: Managed by `booking-store` (Zustand) with localStorage persistence

---

### **Payment APIs** *(Stripe integration)*

| Backend Endpoint | Frontend Hook/Component | Query Key | Files |
|---|---|---|---|
| `POST /api/payments/create-intent/` | `useMutation` in payment step | N/A (mutation) | components/booking/review-payment-step.tsx |
| `POST /api/payments/confirm/` | `useMutation` in payment step | N/A (mutation) | components/booking/review-payment-step.tsx |
| `GET /api/payments/status/<booking_number>/` | `useQuery` (polled) | `['payment', 'status', bookingNumber]` | (Not yet implemented) |

**Stripe Flow**:
1. Frontend creates booking → Backend returns `client_secret`
2. Stripe Elements collects payment → Frontend confirms PaymentIntent
3. Frontend calls `/api/payments/confirm/` → Backend updates booking status
4. Wizard resets, success message shown

---

### **Staff APIs**

| Backend Endpoint | Frontend Hook/Component | Query Key | Files |
|---|---|---|---|
| `POST /api/staff/auth/login/` | `useStaffAuthStore().login()` | N/A (mutation) | stores/staff-auth-store.ts, components/staff/staff-login-form.tsx |
| `GET /api/staff/dashboard/` | `useQuery` in staff dashboard | `['staff', 'dashboard']` | components/staff/staff-dashboard-overview.tsx |
| `GET /api/staff/bookings/` | `useQuery` with filters | `['staff', 'bookings', filters]` | components/staff/booking-management.tsx |
| `PATCH /api/staff/bookings/<id>/` | `useMutation` | Invalidates bookings | components/staff/booking-management.tsx |
| `GET /api/staff/customers/` | `useQuery` with search | `['staff', 'customers', search]` | components/staff/customer-management.tsx |

**Isolation**: Staff auth completely separate from customer auth (different stores, different routes)

---

## **SECTION 3: COMPLETE COMPONENT INTERFACE DOCUMENTATION**

### **Authentication Components**

#### **LoginForm**
```typescript
// File: components/auth/login-form.tsx
interface LoginFormProps {
  // No props - self-contained component
}

// Purpose: Customer login with email/password
// Parent: app/login/page.tsx
// State: Local form state (React Hook Form), auth-store (Zustand)
// API: POST /api/customer/auth/login/ via useAuthStore().login()
// Success Action: Redirects to /dashboard
// Form Fields: email (string, required), password (string, required)
// Validation: Zod schema with email format validation
```

---

#### **RegisterForm**
```typescript
// File: components/auth/register-form.tsx
interface RegisterFormProps {
  // No props - self-contained component
}

// Purpose: Customer registration with profile creation
// Parent: app/register/page.tsx
// State: Local form state, auth-store
// API: POST /api/customer/auth/register/ via useAuthStore().register()
// Form Fields: email, password, first_name, last_name, phone (optional)
// Validation: Zod schema with password strength checks
// Success Action: Auto-login and redirect to /dashboard
```

---

#### **UserMenu**
```typescript
// File: components/auth/user-menu.tsx
interface UserMenuProps {
  variant?: 'default' | 'staff'; // Staff portal has different styling
}

// Purpose: Dropdown menu for authenticated users (profile, logout)
// Parent: components/layout/main-layout.tsx
// State: auth-store (user, customerProfile)
// Actions: Logout (useAuthStore().logout()), navigate to /dashboard, /dashboard/settings
// Child Components: Headless UI Menu, Heroicons
// Hooks: useClickAway (close on outside click)
```

---

### **Booking Wizard Components**

#### **BookingWizard**
```typescript
// File: components/booking/booking-wizard.tsx
interface BookingWizardProps {
  // No props - manages its own state
}

// Purpose: Multi-step booking flow coordinator
// Pages: app/book/page.tsx
// State: booking-store (currentStep, bookingData)
// Child Components: ServiceSelectionStep, DateTimeStep, AddressStep, CustomerInfoStep, ReviewPaymentStep
// Steps: [0] Service, [1] Date/Time, [2] Addresses, [3] Customer Info (guest only), [4] Review/Payment
// Navigation: nextStep(), prevStep() from booking-store
```

---

#### **ServiceSelectionStep**
```typescript
// File: components/booking/service-selection-step.tsx
interface ServiceSelectionStepProps {
  // No props - reads from booking-store
}

// Purpose: Step 1 - Service type and package selection
// Parent: BookingWizard
// State: booking-store (bookingData.service_type, bookingData.mini_move_package_id, etc.)
// API: GET /api/bookings/services/ (service catalog)
// API: POST /api/bookings/pricing-preview/ (real-time pricing)
// Form Elements: Radio buttons (service type), Package cards (mini moves), Checkboxes (specialty items)
// Validation: Ensure service type selected before continuing
```

---

#### **DateTimeStep**
```typescript
// File: components/booking/date-time-step.tsx
interface DateTimeStepProps {
  // No props - reads from booking-store
}

// Purpose: Step 2 - Pickup date and time selection
// Parent: BookingWizard
// State: booking-store (bookingData.pickup_date, bookingData.pickup_time, bookingData.specific_pickup_hour)
// Form Elements: Date picker, Radio buttons (time options), Hour selector (1-hour window)
// Validation: Date must be future, time option required
// Business Logic: Disabled dates based on availability
```

---

#### **AddressStep**
```typescript
// File: components/booking/address-step.tsx
interface AddressStepProps {
  // No props - reads from booking-store and auth-store
}

// Purpose: Step 3 - Pickup and delivery addresses
// Parent: BookingWizard
// State: booking-store (bookingData.pickup_address, bookingData.delivery_address)
// API: GET /api/customer/addresses/ (authenticated users - saved addresses)
// Form Elements: Address form (street, city, state, zip), Special instructions textarea
// Validation: Zod schema for address format, state must be NY/CT/NJ
// Features: Saved address selection (authenticated), Address saving option
```

---

#### **CustomerInfoStep**
```typescript
// File: components/booking/customer-info-step.tsx
interface CustomerInfoStepProps {
  // No props - reads from booking-store
}

// Purpose: Step 4 (Guest only) - Contact information
// Parent: BookingWizard
// State: booking-store (bookingData.customer_info)
// Conditional Rendering: Only shown if user not authenticated (isGuestMode === true)
// Form Fields: first_name, last_name, email, phone
// Validation: Zod schema with email/phone format validation
```

---

#### **ReviewPaymentStep**
```typescript
// File: components/booking/review-payment-step.tsx
interface ReviewPaymentStepProps {
  // No props - reads from booking-store and auth-store
}

// Purpose: Step 5 - Review details and process payment
// Parent: BookingWizard
// State: booking-store (all bookingData), auth-store (user)
// API: POST /api/customer/bookings/create/ OR /api/bookings/guest-booking/
// API: POST /api/payments/create-intent/ (gets Stripe client_secret)
// API: POST /api/payments/confirm/ (after Stripe confirmation)
// Child Components: Stripe Elements (PaymentElement)
// Success Action: Reset booking-store, show success message, redirect to confirmation page
```

---

### **Dashboard Components**

#### **DashboardOverview**
```typescript
// File: components/dashboard/dashboard-overview.tsx
interface DashboardOverviewProps {
  // No props - fetches own data
}

// Purpose: Customer dashboard summary
// Page: app/dashboard/page.tsx
// State: auth-store (user, customerProfile)
// API: GET /api/customer/dashboard/ (summary stats)
// Query Key: ['customer', 'dashboard', userId]
// Display: Total bookings, total spent, VIP status, upcoming bookings
// Child Components: Card, Button
```

---

#### **BookingHistory**
```typescript
// File: components/dashboard/booking-history.tsx
interface BookingHistoryProps {
  // No props - fetches own data
}

// Purpose: Customer booking list with filters
// Page: app/dashboard/page.tsx (section)
// State: Local filter state (searchTerm, statusFilter)
// API: GET /api/customer/bookings/?search=&status=
// Query Key: ['customer', 'bookings', userId, searchTerm, statusFilter]
// Features: Search, status filter, pagination, booking detail modal
// Child Components: Card, Input, Select, Button
```

---

#### **QuickActions**
```typescript
// File: components/dashboard/quick-actions.tsx
interface QuickActionsProps {
  // No props
}

// Purpose: Quick access buttons for common actions
// Page: app/dashboard/page.tsx
// Actions: Book new delivery, View past bookings, Manage addresses
// Child Components: Button, Card
// Navigation: Uses Next.js useRouter
```

---

### **Staff Components**

#### **StaffLoginForm**
```typescript
// File: components/staff/staff-login-form.tsx
interface StaffLoginFormProps {
  // No props - self-contained
}

// Purpose: Staff authentication (username/password)
// Page: app/staff/login/page.tsx
// State: staff-auth-store
// API: POST /api/staff/auth/login/ via useStaffAuthStore().login()
// Form Fields: username, password
// Success Action: Redirect to /staff/dashboard
// Isolation: Completely separate from customer auth
```

---

#### **StaffDashboardOverview**
```typescript
// File: components/staff/staff-dashboard-overview.tsx
interface StaffDashboardOverviewProps {
  // No props - fetches own data
}

// Purpose: Staff operations dashboard
// Page: app/staff/dashboard/page.tsx
// State: staff-auth-store (user, staffProfile)
// API: GET /api/staff/dashboard/ (today's stats, revenue, recent bookings)
// Query Key: ['staff', 'dashboard']
// Display: Today's bookings, revenue, pending actions, quick stats
```

---

#### **BookingManagement**
```typescript
// File: components/staff/booking-management.tsx
interface BookingManagementProps {
  // No props - manages own state
}

// Purpose: Staff booking list with filters and actions
// Page: app/staff/bookings/page.tsx
// State: Local filter state (status, date, search)
// API: GET /api/staff/bookings/?status=&date=&search=
// API: PATCH /api/staff/bookings/<id>/ (status updates)
// Query Key: ['staff', 'bookings', filters]
// Features: Multi-filter, status update dropdown, booking detail view
// Child Components: Card, Input, Select, Button, BookingDetailModal
```

---

#### **BookingCalendar**
```typescript
// File: components/staff/booking-calendar.tsx
interface BookingCalendarProps {
  // No props - fetches bookings for calendar view
}

// Purpose: Calendar view of all bookings
// Page: app/staff/calendar/page.tsx
// API: GET /api/staff/bookings/ with date range filters
// Display: Monthly calendar with booking dots/counts per day
// Interaction: Click date → filter to that day's bookings
```

---

#### **BookingDetailModal**
```typescript
// File: components/staff/booking-detail-modal.tsx
interface BookingDetailModalProps {
  bookingId: string | null;           // UUID or null when closed
  isOpen: boolean;                    // Modal visibility state
  onClose: () => void;                // Close callback
}

// Purpose: Full booking details modal for staff
// Parent: BookingManagement, BookingCalendar
// State: None (receives bookingId as prop)
// API: GET /api/staff/bookings/<bookingId>/
// Query Key: ['staff', 'booking', bookingId]
// Display: Customer info, addresses, service details, payment info, status
// Actions: Status update, add notes
// Child Components: Modal, Card, Button
```

---

#### **CustomerManagement**
```typescript
// File: components/staff/customer-management.tsx
interface CustomerManagementProps {
  // No props - manages own state
}

// Purpose: Staff customer list with search
// Page: app/staff/customers/page.tsx
// State: Local search state
// API: GET /api/staff/customers/?search=
// Query Key: ['staff', 'customers', search]
// Display: Customer list with email, total bookings, total spent, VIP badge
// Actions: View customer detail (navigate to /staff/customers/[id])
```

---

### **UI Primitive Components**

#### **Button**
```typescript
// File: components/ui/button.tsx
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  className?: string;
  children: React.ReactNode;
}

// Purpose: Reusable button with design system variants
// Pattern: CVA (class-variance-authority) for variant management
// Used By: All components requiring button actions
```

---

#### **Card**
```typescript
// File: components/ui/card.tsx
interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'luxury' | 'ghost';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  children: React.ReactNode;
}

// Sub-components: CardHeader, CardContent, CardFooter
// Purpose: Reusable card layout with variants
// Used By: All dashboard sections, forms, content blocks
```

---

#### **Input**
```typescript
// File: components/ui/input.tsx
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'error' | 'success';
  inputSize?: 'sm' | 'md' | 'lg';
  label?: string;
  error?: string;
  success?: string;
  helper?: string;
  mask?: 'phone' | 'zip';               // Auto-formatting
  realTimeValidation?: 'email' | 'phone'; // Validation on blur
}

// Purpose: Form input with built-in validation and masking
// Features: Phone formatting (xxx) xxx-xxxx, Zip formatting xxxxx-xxxx
// Real-time validation: Email format, phone length
// Used By: All forms (login, register, booking addresses)
```

---

#### **Select**
```typescript
// File: components/ui/select.tsx
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}

// Purpose: Dropdown select with label and error handling
// Used By: Filters, form dropdowns (state selection, status filters)
```

---

#### **Modal**
```typescript
// File: components/ui/modal.tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
}

// Purpose: Reusable modal overlay using Headless UI Dialog
// Features: Backdrop click to close, ESC key handling, focus trap
// Used By: BookingDetailModal, address modals, confirmation dialogs
```

---

### **Layout Components**

#### **MainLayout**
```typescript
// File: components/layout/main-layout.tsx
interface MainLayoutProps {
  children: React.ReactNode;
  className?: string;
  onBookNowClick?: () => void;  // Optional custom book button handler
}

// Purpose: Site-wide layout wrapper with header and footer
// Features: Responsive header with auth state detection, sticky nav
// Header Elements: Logo, nav links, Book Now CTA, UserMenu (if authenticated)
// Used By: All pages (wrap children in layout)
// State: auth-store (isAuthenticated, user)
```

---

#### **StaffLayout**
```typescript
// File: components/staff/staff-layout.tsx
interface StaffLayoutProps {
  children: React.ReactNode;
}

// Purpose: Staff portal layout with sidebar navigation
// Features: Staff-only sidebar, logout in header, role display
// Sidebar Links: Dashboard, Bookings, Calendar, Customers, Reports, Logistics
// Protected: Checks staff-auth-store.isAuthenticated, redirects if not
// Used By: All /staff/* pages
```

---

### **Provider Components**

#### **QueryProvider**
```typescript
// File: components/providers/query-provider.tsx
interface QueryProviderProps {
  children: React.ReactNode;
}

// Purpose: Wraps app with TanStack Query context
// Configuration: queryClient from lib/query-client.ts
// Features: React Query DevTools in development
// Used By: app/layout.tsx (wraps entire app)
```

---

## **SECTION 4: FILE DIRECTORY + PURPOSE INDEX**

```
frontend/
├── src/
│   ├── app/                                # Next.js App Router pages
│   │   ├── layout.tsx                      # Root layout with fonts and QueryProvider
│   │   ├── page.tsx                        # Landing page with marketing sections
│   │   ├── about/
│   │   │   └── page.tsx                    # About ToteTaxi story page
│   │   ├── book/
│   │   │   └── page.tsx                    # Booking wizard page
│   │   ├── contact/
│   │   │   └── page.tsx                    # Contact form page
│   │   ├── dashboard/
│   │   │   └── page.tsx                    # Customer dashboard (protected route)
│   │   ├── login/
│   │   │   └── page.tsx                    # Customer login page
│   │   ├── register/
│   │   │   └── page.tsx                    # Customer registration page
│   │   └── staff/                          # Staff portal routes
│   │       ├── login/
│   │       │   └── page.tsx                # Staff login page
│   │       ├── dashboard/
│   │       │   └── page.tsx                # Staff operations dashboard
│   │       ├── bookings/
│   │       │   └── page.tsx                # Staff booking management page
│   │       ├── calendar/
│   │       │   └── page.tsx                # Staff calendar view
│   │       ├── customers/
│   │       │   ├── page.tsx                # Staff customer list
│   │       │   └── [id]/
│   │       │       └── page.tsx            # Staff customer detail page
│   │       ├── reports/
│   │       │   └── page.tsx                # Staff reports page (stub)
│   │       └── logistics/
│   │           └── page.tsx                # Staff logistics page (stub)
│   │
│   ├── components/
│   │   ├── auth/
│   │   │   ├── login-form.tsx              # Customer login form with validation
│   │   │   ├── register-form.tsx           # Customer registration form
│   │   │   └── user-menu.tsx               # User dropdown menu (profile, logout)
│   │   ├── booking/
│   │   │   ├── booking-wizard.tsx          # Multi-step booking coordinator
│   │   │   ├── service-selection-step.tsx  # Step 1: Service type and package selection
│   │   │   ├── date-time-step.tsx          # Step 2: Pickup date and time
│   │   │   ├── address-step.tsx            # Step 3: Pickup and delivery addresses
│   │   │   ├── customer-info-step.tsx      # Step 4: Guest contact info (guest only)
│   │   │   ├── review-payment-step.tsx     # Step 5: Review and Stripe payment
│   │   │   └── index.ts                    # Barrel export for booking components
│   │   ├── dashboard/
│   │   │   ├── dashboard-overview.tsx      # Customer dashboard summary widget
│   │   │   ├── booking-history.tsx         # Customer booking list with filters
│   │   │   └── quick-actions.tsx           # Dashboard quick action buttons
│   │   ├── staff/
│   │   │   ├── staff-login-form.tsx        # Staff authentication form
│   │   │   ├── staff-layout.tsx            # Staff portal layout with sidebar
│   │   │   ├── staff-dashboard-overview.tsx # Staff operations dashboard
│   │   │   ├── booking-management.tsx      # Staff booking list with filters
│   │   │   ├── booking-calendar.tsx        # Staff calendar view
│   │   │   ├── booking-detail-modal.tsx    # Booking detail modal for staff
│   │   │   ├── customer-management.tsx     # Staff customer list with search
│   │   │   └── index.ts                    # Barrel export for staff components
│   │   ├── marketing/
│   │   │   ├── hero-section.tsx            # Landing page hero
│   │   │   ├── service-showcase.tsx        # Service cards section
│   │   │   ├── how-it-works-section.tsx    # Process explanation section
│   │   │   ├── testimonials-section.tsx    # Customer reviews section
│   │   │   ├── service-areas-section.tsx   # Map of service areas
│   │   │   ├── what-we-transport-section.tsx # Examples of items transported
│   │   │   └── index.ts                    # Barrel export
│   │   ├── layout/
│   │   │   └── main-layout.tsx             # Site layout with header/footer
│   │   ├── ui/
│   │   │   ├── button.tsx                  # Button component with variants
│   │   │   ├── card.tsx                    # Card component with sub-components
│   │   │   ├── input.tsx                   # Input with validation and masking
│   │   │   ├── select.tsx                  # Select dropdown component
│   │   │   ├── modal.tsx                   # Modal overlay component
│   │   │   └── index.ts                    # Barrel export for UI primitives
│   │   ├── providers/
│   │   │   └── query-provider.tsx          # TanStack Query provider wrapper
│   │   └── debug/
│   │       └── mobile-debug.tsx            # Mobile debugging tool for auth issues
│   │
│   ├── stores/                             # Zustand state management
│   │   ├── auth-store.ts                   # Customer authentication state + actions
│   │   ├── staff-auth-store.ts             # Staff authentication state + actions
│   │   ├── booking-store.ts                # Multi-step booking wizard state
│   │   └── ui-store.ts                     # UI state (sidebar, theme, notifications)
│   │
│   ├── lib/                                # Core utilities
│   │   ├── api-client.ts                   # Axios instance with interceptors
│   │   ├── query-client.ts                 # TanStack Query client config
│   │   └── stripe.ts                       # Stripe.js initialization
│   │
│   ├── hooks/                              # Custom React hooks
│   │   └── use-click-away.ts               # Click outside detection hook
│   │
│   ├── types/                              # TypeScript definitions
│   │   └── index.ts                        # All shared types (DjangoUser, CustomerProfile, BookingData, etc.)
│   │
│   └── utils/                              # Helper functions
│       └── cn.ts                           # Tailwind class merge utility (clsx + tailwind-merge)
│
├── public/                                 # Static assets
│   ├── assets/
│   │   ├── images/                         # Marketing images (Hamptons, luggage, transport items)
│   │   └── videos/                         # Marketing videos
│   └── [icons]                             # Favicon, manifest icons
│
├── next.config.ts                          # Next.js configuration (security headers, image domains)
├── tailwind.config.js                      # Tailwind theme (navy/gold/cream colors, fonts)
├── tsconfig.json                           # TypeScript config (strict mode, path aliases)
├── package.json                            # Dependencies and scripts
├── postcss.config.js                       # PostCSS config (Tailwind + Autoprefixer)
└── README.md                               # Project documentation
```

---

## **SECTION 5: FEATURE-TO-FILE DEPENDENCY MAPS**

### **Customer Registration Flow**

**Entry Point**: `/register` → `app/register/page.tsx`

**Execution Chain**:
1. `app/register/page.tsx` renders `<RegisterForm />`
2. `components/auth/register-form.tsx`
   - Form state: React Hook Form
   - Validation: Zod schema (email, password strength, required fields)
   - Submit handler calls `useAuthStore().register()`
3. `stores/auth-store.ts → register()`
   - API call: `POST /api/customer/auth/register/`
   - Success: Calls `setAuth(user, profile)`, redirects to `/dashboard`
   - Error: Returns error message for form display
4. `lib/api-client.ts`
   - Axios interceptor adds CSRF token
   - Sets session cookies from response

**Dependencies**: auth-store, API client, React Hook Form, Zod

**Files to Request**: `components/auth/register-form.tsx`, `stores/auth-store.ts`, `lib/api-client.ts`, `types/index.ts`

---

### **Guest Booking Flow**

**Entry Point**: `/book` → `app/book/page.tsx`

**Execution Chain**:
1. `app/book/page.tsx` renders `<BookingWizard />`
2. `components/booking/booking-wizard.tsx`
   - Reads `currentStep` from `booking-store`
   - Conditionally renders step components
3. **Step 1**: `components/booking/service-selection-step.tsx`
   - Fetches service catalog: `GET /api/bookings/services/`
   - Updates `booking-store`: `service_type`, `mini_move_package_id`, `specialty_item_ids`
   - Triggers pricing preview: `POST /api/bookings/pricing-preview/`
4. **Step 2**: `components/booking/date-time-step.tsx`
   - Updates `booking-store`: `pickup_date`, `pickup_time`, `specific_pickup_hour`
5. **Step 3**: `components/booking/address-step.tsx`
   - Updates `booking-store`: `pickup_address`, `delivery_address`
   - For authenticated users: Option to select saved addresses
6. **Step 4**: `components/booking/customer-info-step.tsx` (guest only)
   - Updates `booking-store`: `customer_info` (first_name, last_name, email, phone)
7. **Step 5**: `components/booking/review-payment-step.tsx`
   - Submits booking: `POST /api/bookings/guest-booking/`
   - Creates PaymentIntent: Backend returns `client_secret`
   - Renders Stripe Elements `<PaymentElement />`
   - User completes payment → Stripe confirms PaymentIntent
   - Confirms payment: `POST /api/payments/confirm/`
   - Success: Resets `booking-store`, shows success message
8. `stores/booking-store.ts`
   - Persists to localStorage (24h expiration)
   - Provides `nextStep()`, `prevStep()`, `updateBookingData()`, `resetWizard()`

**Dependencies**: booking-store, auth-store, API client, Stripe Elements, React Hook Form (review step)

**Files to Request**: 
- `components/booking/*.tsx` (all wizard steps)
- `stores/booking-store.ts`
- `lib/api-client.ts`
- `lib/stripe.ts`
- `types/index.ts`

---

### **Authenticated Customer Dashboard**

**Entry Point**: `/dashboard` → `app/dashboard/page.tsx`

**Execution Chain**:
1. `app/dashboard/page.tsx`
   - Route Protection: Checks `auth-store.isAuthenticated`
   - If not authenticated: Redirect to `/login`
   - Renders dashboard components
2. `components/dashboard/dashboard-overview.tsx`
   - Fetches summary: `GET /api/customer/dashboard/`
   - Query key: `['customer', 'dashboard', userId]`
   - Displays: Total bookings, total spent, VIP badge, upcoming bookings
3. `components/dashboard/booking-history.tsx`
   - Fetches bookings: `GET /api/customer/bookings/?search=&status=`
   - Query key: `['customer', 'bookings', userId, searchTerm, statusFilter]`
   - Features: Search filter, status filter, pagination
   - Click booking → Modal with details
4. `components/dashboard/quick-actions.tsx`
   - Button actions: Book delivery, Manage addresses, View settings
   - Navigation: `useRouter()` from Next.js

**Dependencies**: auth-store, API client, TanStack Query, UI components

**Files to Request**:
- `app/dashboard/page.tsx`
- `components/dashboard/*.tsx`
- `stores/auth-store.ts`
- `lib/api-client.ts`
- `lib/query-client.ts`

---

### **Staff Booking Management**

**Entry Point**: `/staff/bookings` → `app/staff/bookings/page.tsx`

**Execution Chain**:
1. `app/staff/bookings/page.tsx`
   - Route Protection: Checks `staff-auth-store.isAuthenticated`
   - If not authenticated: Redirect to `/staff/login`
   - Renders `<BookingManagement />` within `<StaffLayout>`
2. `components/staff/booking-management.tsx`
   - Local state: `filters` (status, date, search)
   - Fetches bookings: `GET /api/staff/bookings/?status=&date=&search=`
   - Query key: `['staff', 'bookings', filters]`
   - Actions: Status update dropdown, view detail button
3. **Status Update**:
   - Mutation: `PATCH /api/staff/bookings/<id>/` with `{status, staff_notes}`
   - Invalidates queries: `['staff', 'bookings']`, `['staff', 'dashboard']`
   - Optimistic update: Immediately reflects in UI
4. **View Detail**:
   - Opens `<BookingDetailModal bookingId={id} />`
5. `components/staff/booking-detail-modal.tsx`
   - Fetches full booking: `GET /api/staff/bookings/<id>/`
   - Query key: `['staff', 'booking', bookingId]`
   - Displays: Customer info, addresses, service details, payment info
   - Actions: Update status, add notes

**Dependencies**: staff-auth-store, API client, TanStack Query, UI components

**Files to Request**:
- `app/staff/bookings/page.tsx`
- `components/staff/booking-management.tsx`
- `components/staff/booking-detail-modal.tsx`
- `components/staff/staff-layout.tsx`
- `stores/staff-auth-store.ts`
- `lib/api-client.ts`

---

### **Payment Processing** *(Stripe Integration)*

**Entry Point**: Booking Wizard Step 5 → `components/booking/review-payment-step.tsx`

**Execution Chain**:
1. User completes booking wizard steps 1-4
2. `review-payment-step.tsx` displays booking summary
3. **Create Booking**:
   - Authenticated: `POST /api/customer/bookings/create/` with `{service details, addresses}`
   - Guest: `POST /api/bookings/guest-booking/` with `{service details, addresses, customer_info}`
   - Backend response: `{booking_id, booking_number, payment: {client_secret}}`
4. **Initialize Stripe**:
   - `lib/stripe.ts → getStripe()` loads Stripe.js
   - Wraps payment form in `<Elements stripe={stripe} options={{clientSecret}}>`
5. **Stripe Payment Element**:
   - `@stripe/react-stripe-js → <PaymentElement />`
   - Collects card details, validates input
   - User clicks "Pay Now" button
6. **Confirm Payment**:
   - `useStripe().confirmPayment()` submits to Stripe
   - Stripe processes payment and updates PaymentIntent status
   - Frontend calls: `POST /api/payments/confirm/` with `{payment_intent_id}`
7. **Backend Processing**:
   - Backend verifies PaymentIntent with Stripe
   - Updates `Payment.status = 'succeeded'`
   - Updates `Booking.status = 'confirmed'`
   - Updates `CustomerProfile` stats (if authenticated)
8. **Success Action**:
   - `booking-store.resetWizard()` clears wizard state
   - Invalidates queries: `['customer', 'bookings']`, `['customer', 'dashboard']`
   - Redirects to confirmation page or dashboard

**Dependencies**: booking-store, auth-store, Stripe.js, API client

**Files to Request**:
- `components/booking/review-payment-step.tsx`
- `stores/booking-store.ts`
- `lib/stripe.ts`
- `lib/api-client.ts`

---

## **SECTION 6: STATE MANAGEMENT ARCHITECTURE**

### **Auth Store** *(Customer Authentication)*

**File**: `stores/auth-store.ts`

**State Interface**:
```typescript
interface AuthState {
  user: DjangoUser | null;
  customerProfile: CustomerProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
```

**Persistence**: 
- Storage: `localStorage` key `totetaxi-auth`
- Version: 2 (with migration function to reset on major changes)
- Partialize: Only persists `user`, `customerProfile`, `isAuthenticated` (excludes `isLoading`)

**Actions**:
- `setAuth(user, profile)` - Sets authenticated state, updates last activity timestamp
- `clearAuth()` - Clears auth state, removes localStorage keys, clears React Query cache
- `login(email, password)` - Calls backend API, sets auth on success, returns error on failure
- `register(data)` - Calls backend API, auto-logs in on success
- `logout()` - Calls backend logout API, clears all state, clears booking wizard
- `validateSession()` - Checks if session still valid with backend
- `updateProfile(updates)` - Merges profile updates
- `secureReset()` - Security method to clear all traces (localStorage, cache)

**Cross-Store Coordination**:
- Logout clears `staff-auth-store` (prevents hybrid accounts)
- Logout resets `booking-store` wizard
- 401 errors auto-trigger `clearAuth()` via API interceptor

---

### **Staff Auth Store** *(Staff Authentication)*

**File**: `stores/staff-auth-store.ts`

**State Interface**:
```typescript
interface StaffAuthState {
  user: StaffUser | null;
  staffProfile: StaffProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
```

**Persistence**: 
- Storage: `localStorage` key `totetaxi-staff-auth`
- Version: 2
- Isolated from customer auth

**Actions**:
- `setAuth(user, profile)` - Sets staff authenticated state
- `clearAuth()` - Clears staff state, removes localStorage keys
- `login(username, password)` - Staff login (username instead of email)
- `logout()` - Staff logout, clears state
- `secureReset()` - Security clear

**Isolation**: 
- Completely separate from `auth-store`
- Different routes (`/staff/*` vs `/dashboard`)
- Prevents privilege escalation

---

### **Booking Store** *(Wizard State)*

**File**: `stores/booking-store.ts`

**State Interface**:
```typescript
interface BookingWizardState {
  currentStep: number;                // 0-5 (service, date, addresses, customer info, review)
  isLoading: boolean;
  bookingData: BookingData;           // All form data
  errors: Record<string, string>;     // Validation errors
  isBookingComplete: boolean;
  completedBookingNumber?: string;
  userId?: string;                    // For cache invalidation
  isGuestMode: boolean;               // Guest vs authenticated
  lastResetTimestamp?: number;        // For expiration check
}
```

**Persistence**:
- Storage: `localStorage` key `totetaxi-booking-wizard`
- Version: 1 (incremented on schema changes)
- Expiration: 24 hours (stale data cleared via `migrate()`)
- Partialize: Excludes `customer_info` (PII not persisted)

**Actions**:
- `nextStep()` - Advances wizard, validates current step
- `prevStep()` - Goes back one step
- `updateBookingData(updates)` - Merges partial booking data
- `setError(field, message)` - Sets validation error
- `clearErrors()` - Clears all errors
- `resetWizard()` - Clears all state, resets to step 0
- `setGuestMode(isGuest)` - Toggles guest vs authenticated mode
- `canProceed()` - Validates if current step complete

**Validation Logic**:
- Step 0: Service type selected, package/items chosen
- Step 1: Pickup date selected, time option chosen
- Step 2: Both addresses provided
- Step 3 (guest only): Customer info complete
- Step 4: Always can proceed (review step)

---

### **UI Store** *(Non-Persistent UI State)*

**File**: `stores/ui-store.ts`

**State Interface**:
```typescript
interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  notifications: Notification[];
  modals: {
    login: boolean;
    register: boolean;
    addressForm: boolean;
    paymentMethod: boolean;
  };
}
```

**Persistence**: None (in-memory only)

**Actions**:
- `toggleSidebar()`, `setSidebar(open)` - Sidebar control
- `setTheme(theme)` - Theme switching (with validation)
- `addNotification(notification)` - Adds toast notification (sanitized, max 10)
- `removeNotification(id)` - Dismisses notification
- `openModal(modal)`, `closeModal(modal)` - Modal state management
- `secureReset()` - Resets to defaults

**Security Features**:
- Input sanitization on notifications (max 500 chars, type validation)
- Max notification limit (10) to prevent memory issues
- Modal key validation before opening

---

### **TanStack Query Cache**

**File**: `lib/query-client.ts`

**Configuration**:
```typescript
{
  staleTime: 5 minutes,    // Data fresh for 5min
  gcTime: 30 minutes,      // Garbage collection after 30min
  retry: 3 attempts,       // Retry failed requests
  refetchOnWindowFocus: false,  // Don't refetch on tab switch
}
```

**Query Key Patterns**:
- Customer bookings: `['customer', 'bookings', userId, filters]`
- Customer dashboard: `['customer', 'dashboard', userId]`
- Staff bookings: `['staff', 'bookings', filters]`
- Staff dashboard: `['staff', 'dashboard']`
- Service catalog: `['services']`

**Global Error Handling**:
- 401 errors: Auto-clear query cache, clear auth stores, redirect
- Event subscription: `queryClient.getQueryCache().subscribe()` monitors errors
- Centralized handler: `handle401Error()` function

**Invalidation Strategy**:
- Booking created: Invalidate `['customer', 'bookings']`, `['customer', 'dashboard']`
- Status updated: Invalidate `['staff', 'bookings']`, `['staff', 'dashboard']`
- Profile updated: Invalidate `['customer', 'profile']`

---

## **SECTION 7: ROUTING & NAVIGATION ARCHITECTURE**

### **Routing System**: Next.js 15 App Router (File-Based)

**Public Routes** *(No Authentication)*:
```
/                           # Landing page (hero, services, testimonials)
/about                      # About ToteTaxi story
/contact                    # Contact form
/book                       # Booking wizard (guest or authenticated)
/login                      # Customer login
/register                   # Customer registration
```

**Protected Customer Routes** *(Requires Customer Auth)*:
```
/dashboard                  # Customer dashboard (overview, bookings, quick actions)
/dashboard/settings         # Customer settings (not yet implemented)
```

**Protected Staff Routes** *(Requires Staff Auth)*:
```
/staff/login                # Staff login (separate from customer)
/staff/dashboard            # Staff operations dashboard
/staff/bookings             # Booking management with filters
/staff/calendar             # Calendar view of bookings
/staff/customers            # Customer list with search
/staff/customers/[id]       # Customer detail page
/staff/reports              # Reports page (stub)
/staff/logistics            # Logistics page (stub)
```

---

### **Route Protection Patterns**

**Customer Route Protection**:
```typescript
// Pattern in dashboard pages
const { isAuthenticated, isLoading } = useAuthStore();
const router = useRouter();

useEffect(() => {
  if (!isLoading && !isAuthenticated) {
    router.push('/login');
  }
}, [isAuthenticated, isLoading, router]);

if (isLoading || !isAuthenticated) {
  return <LoadingSpinner />;
}
```

**Staff Route Protection**:
```typescript
// Pattern in staff pages
const { isAuthenticated, isLoading } = useStaffAuthStore();
const router = useRouter();

useEffect(() => {
  if (!isLoading && !isAuthenticated) {
    router.push('/staff/login');
  }
}, [isAuthenticated, isLoading, router]);

if (isLoading || !isAuthenticated) {
  return <LoadingSpinner />;
}
```

**Middleware** (Future Enhancement):
- Could add `middleware.ts` for server-side route protection
- Currently using client-side checks in page components

---

### **Navigation Components**

**Customer Navigation**:
- **MainLayout**: `components/layout/main-layout.tsx`
  - Header: Logo, nav links (About, Contact, Book), UserMenu (if auth)
  - Footer: Links, social, copyright
  - Mobile: Responsive hamburger menu

**Staff Navigation**:
- **StaffLayout**: `components/staff/staff-layout.tsx`
  - Sidebar: Dashboard, Bookings, Calendar, Customers, Reports, Logistics
  - Header: Staff role display, logout button
  - Mobile: Collapsible sidebar

**Navigation Helpers**:
- `useRouter()` from Next.js for programmatic navigation
- `<Link href="...">` for client-side navigation
- `router.push()`, `router.replace()` for redirects

---

## **SECTION 8: FORM HANDLING & VALIDATION REFERENCE**

### **Form Stack**: React Hook Form + Zod

**Form Pattern**:
```typescript
// 1. Define Zod schema
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

// 2. Initialize React Hook Form
const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
  resolver: zodResolver(loginSchema),
});

// 3. Submit handler
const onSubmit = async (data: LoginFormData) => {
  const result = await useAuthStore.getState().login(data.email, data.password);
  if (result.success) {
    router.push('/dashboard');
  } else {
    // Display error
  }
};

// 4. Render form
<form onSubmit={handleSubmit(onSubmit)}>
  <Input {...register('email')} error={errors.email?.message} />
  <Input {...register('password')} type="password" error={errors.password?.message} />
  <Button type="submit">Login</Button>
</form>
```

---

### **Validation Schemas**

**Defined In**: Component files (inline) or `schemas/` directory (not yet created)

**Example Schemas**:
- **Login**: Email format + password min length
- **Register**: Email, password (8+ chars, uppercase, number), first/last name, phone
- **Address**: Street required, city required, state (NY/CT/NJ), zip format (5 or 9 digits)
- **Booking**: Service type, date (future), addresses

**Real-Time Validation**:
- `Input` component: `realTimeValidation` prop for email/phone on blur
- React Hook Form: Validates on submit, displays errors per field
- Zod: Runtime type safety + error messages

---

### **Form Submission Flow**

1. **Client Validation**: Zod schema validates on submit attempt
2. **Display Errors**: React Hook Form maps errors to fields
3. **API Call**: If valid, submit to backend via API client
4. **Server Validation**: Backend returns field-level errors if validation fails
5. **Display Server Errors**: Map backend errors to form fields
6. **Success Action**: Clear form, show success message, redirect or update state

**Example Server Error Handling**:
```typescript
try {
  const response = await apiClient.post('/api/customer/auth/register/', data);
  // Success
} catch (error: any) {
  if (error.response?.data?.field_errors) {
    // Map backend field errors to React Hook Form
    Object.keys(error.response.data.field_errors).forEach(field => {
      setError(field, { message: error.response.data.field_errors[field][0] });
    });
  } else {
    // Show general error toast
    addNotification({ type: 'error', message: error.response?.data?.message });
  }
}
```

---

### **Reusable Form Components**

**Input Component**: `components/ui/input.tsx`
- Props: `label`, `error`, `mask` (phone/zip), `realTimeValidation` (email/phone)
- Features: Auto-formatting, real-time validation on blur, error display
- Integration: Works with React Hook Form `{...register('field')}`

**Select Component**: `components/ui/select.tsx`
- Props: `label`, `error`, `options` (array of {value, label})
- Usage: Dropdowns in filters, form selects (state selection)

**Button Component**: `components/ui/button.tsx`
- Props: `variant`, `size`, `disabled`
- Usage: Form submit buttons, action buttons
- Loading state: `disabled={isLoading}` during submission

---

## **SECTION 9: UI COMPONENT SYSTEM DOCUMENTATION**

### **Design System**: Tailwind CSS + Custom Components

**Color Palette** *(tailwind.config.js)*:
```javascript
colors: {
  navy: {
    50-900   // Brand primary (headers, text)
  },
  gold: {
    50-900   // Brand accent (CTAs, highlights)
  },
  cream: {
    50-900   // Backgrounds, soft accents
  }
}
```

**Typography**:
- **Serif**: Playfair Display (headings, elegant display text)
- **Sans**: Inter (body text, UI elements)
- Loaded in `app/layout.tsx` via `next/font/google`

**Component Variants**: CVA (Class Variance Authority)
- Pattern used in `Button`, `Card`, `Input` components
- Example: `variant`, `size`, `rounded` props map to Tailwind classes
- Allows: `<Button variant="primary" size="lg">Text</Button>`

---

### **UI Primitives** *(components/ui/)*

**Button**:
- Variants: `primary`, `secondary`, `outline`, `ghost`, `danger`
- Sizes: `sm`, `md`, `lg`
- Rounded: `none`, `sm`, `md`, `lg`, `full`
- Base styles: Transitions, focus rings, disabled states

**Card**:
- Variants: `default`, `elevated`, `luxury`, `ghost`
- Padding: `none`, `sm`, `md`, `lg`
- Sub-components: `CardHeader`, `CardContent`, `CardFooter`
- Usage: Dashboard widgets, forms, content blocks

**Input**:
- Variants: `default`, `error`, `success`
- Sizes: `sm`, `md`, `lg`
- Features: Masking (phone, zip), real-time validation, error display
- Integration: React Hook Form compatible

**Select**:
- Props: `options` (array), `label`, `error`, `placeholder`
- Usage: Form dropdowns, filters

**Modal**:
- Built on Headless UI `Dialog`
- Sizes: `sm`, `md`, `lg`, `xl`, `full`
- Features: Backdrop click, ESC key, focus trap, close button

---

### **Responsive Design**

**Breakpoints** *(Tailwind defaults)*:
```
sm:  640px   # Mobile landscape
md:  768px   # Tablet portrait
lg:  1024px  # Tablet landscape / Small desktop
xl:  1280px  # Desktop
2xl: 1536px  # Large desktop
```

**Mobile-First Strategy**:
- Base styles: Mobile
- Responsive modifiers: `md:`, `lg:`, `xl:`
- Example: `<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">`

**Mobile Navigation**:
- Hamburger menu in `MainLayout` for mobile
- Collapsible sidebar in `StaffLayout`

---

### **Styling Patterns**

**Utility Classes**:
- Layout: `flex`, `grid`, `container`
- Spacing: `p-4`, `m-2`, `space-x-4`
- Typography: `text-lg`, `font-bold`, `text-navy-900`
- Colors: `bg-white`, `text-gray-700`, `border-gray-200`

**Component Composition**:
```typescript
// Bad: Hardcoded styles in every component
<div className="px-4 py-3 bg-white border rounded-lg">

// Good: Use reusable Card component
<Card padding="md" variant="default">
```

**Utility Function**: `cn()` (`utils/cn.ts`)
- Merges Tailwind classes intelligently
- Handles conflicts (last class wins)
- Usage: `className={cn('base-class', props.className)}`

---

## **SECTION 10: DEVELOPMENT PATTERNS & CONVENTIONS**

### **Adding a New Page**

1. **Create Page File**:
```typescript
// src/app/my-new-page/page.tsx
'use client';  // If using hooks/state

import { MainLayout } from '@/components/layout/main-layout';

export default function MyNewPage() {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-3xl font-serif font-bold">My New Page</h1>
        {/* Content */}
      </div>
    </MainLayout>
  );
}
```

2. **Add Navigation Link** (if needed):
- Customer: Add to `MainLayout` header nav
- Staff: Add to `StaffLayout` sidebar

3. **Add Route Protection** (if protected):
```typescript
const { isAuthenticated, isLoading } = useAuthStore();
useEffect(() => {
  if (!isLoading && !isAuthenticated) router.push('/login');
}, [isAuthenticated, isLoading, router]);
```

---

### **Creating a New Component**

1. **Define Props Interface**:
```typescript
interface MyComponentProps {
  title: string;
  onAction?: () => void;
  variant?: 'default' | 'compact';
  className?: string;
}
```

2. **Create Component**:
```typescript
'use client';  // If using state/effects

export function MyComponent({ title, onAction, variant = 'default', className }: MyComponentProps) {
  return (
    <Card variant="default" className={cn('my-component', className)}>
      <CardHeader>
        <h3>{title}</h3>
      </CardHeader>
      <CardContent>
        {/* Content */}
        {onAction && <Button onClick={onAction}>Action</Button>}
      </CardContent>
    </Card>
  );
}
```

3. **Export** (if creating component library):
```typescript
// components/my-feature/index.ts
export { MyComponent } from './my-component';
```

---

### **Adding Backend Integration**

1. **Check Backend README** for API specification
2. **Define Types** (if not exists):
```typescript
// types/index.ts
export interface MyResource {
  id: string;
  name: string;
  created_at: string;
}
```

3. **Create Query Hook** (if fetching data):
```typescript
// In component or custom hook
const { data, isLoading, error } = useQuery({
  queryKey: ['my-resource', filters],
  queryFn: async () => {
    const response = await apiClient.get('/api/my-resource/', { params: filters });
    return response.data;
  },
  enabled: isAuthenticated,  // Only fetch if auth
});
```

4. **Create Mutation Hook** (if modifying data):
```typescript
const mutation = useMutation({
  mutationFn: async (data) => {
    return await apiClient.post('/api/my-resource/', data);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['my-resource'] });
    addNotification({ type: 'success', message: 'Created successfully' });
  },
  onError: (error: any) => {
    addNotification({ type: 'error', message: error.response?.data?.message });
  }
});
```

---

### **Code Organization Rules**

**Pages** (`app/`):
- Minimal logic, mostly layout and component composition
- Route protection checks
- Pass data to child components via props
- Naming: `page.tsx` (Next.js convention)

**Components** (`components/`):
- Group by feature (auth, booking, dashboard, staff)
- UI primitives in `components/ui/`
- Export from `index.ts` for clean imports
- Naming: `my-component.tsx` (kebab-case), export as `MyComponent` (PascalCase)

**Stores** (`stores/`):
- One store per domain (auth, booking, ui)
- Export hook: `export const useMyStore = create<MyState & MyActions>()(...)`
- Naming: `my-store.ts` (kebab-case), hook: `useMyStore` (camelCase)

**Lib** (`lib/`):
- Core utilities: API client, query client, external service configs
- Export instances: `export const apiClient = axios.create(...)`
- Naming: `my-utility.ts` (kebab-case)

**Types** (`types/`):
- Shared TypeScript interfaces
- Match backend response structures
- Export: `export interface MyType { ... }`

**Hooks** (`hooks/`):
- Custom React hooks
- Prefix with `use`: `useClickAway`, `useDebounce`
- Naming: `use-my-hook.ts` (kebab-case), export: `useMyHook`

---

### **File Naming Conventions**

- **Pages**: `page.tsx` (Next.js requirement)
- **Components**: `my-component.tsx` (kebab-case file), `MyComponent` export (PascalCase)
- **Stores**: `my-store.ts` (kebab-case)
- **Hooks**: `use-my-hook.ts` (kebab-case)
- **Types**: `index.ts` (barrel file in types/)
- **Utils**: `cn.ts`, `formatters.ts` (camelCase or kebab-case)

---

### **Import Patterns**

**Path Aliases** (configured in `tsconfig.json`):
```typescript
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { DjangoUser } from '@/types';
import { apiClient } from '@/lib/api-client';
```

**Barrel Exports**:
```typescript
// components/ui/index.ts
export { Button } from './button';
export { Card, CardHeader, CardContent } from './card';

// Usage
import { Button, Card } from '@/components/ui';
```

---

### **Testing Patterns** *(Not Yet Implemented)*

**Planned Setup**:
- **Unit Tests**: Vitest + React Testing Library
- **Hook Tests**: `@testing-library/react-hooks`
- **E2E Tests**: Playwright

**Test Structure** (future):
```
src/
├── __tests__/
│   ├── components/
│   │   ├── auth/
│   │   │   └── login-form.test.tsx
│   │   └── ui/
│   │       └── button.test.tsx
│   ├── stores/
│   │   └── auth-store.test.ts
│   └── hooks/
│       └── use-click-away.test.ts
```

---

## **AI EXECUTIVE FUNCTION CHECKLIST**

✅ **Understand Architecture** - Next.js App Router, Zustand stores, TanStack Query caching mapped  
✅ **Navigate Files** - Complete file tree with purpose descriptions for 76 frontend files  
✅ **Identify Dependencies** - Feature-to-file maps show complete UI flow chains  
✅ **Request Context** - Component interfaces documented with Props and API integrations  
✅ **Integrate Backend** - Backend APIs mapped to frontend hooks/components without duplication  
✅ **Extend Features** - Development patterns documented with code examples  
✅ **Predict Impact** - State management and query invalidation patterns show cascade effects

---

## **REGENERATION WORKFLOW**

When significant changes occur to the frontend codebase:

1. Update `scripts/front_export.py` if needed (add new directories/patterns)
2. Run: `python scripts/front_export.py` to regenerate `frontend_snapshot.txt`
3. Provide this README template + new `frontend_snapshot.txt` to AI
4. Request: *"Generate updated frontend living documentation following the Strategic Extraction Protocol"*
5. Cross-reference with backend README.md for API integration updates
6. Review generated documentation for accuracy
7. Commit both `frontend_snapshot.txt` and updated frontend `README.md`

**Critical for Regeneration**: Always use `frontend_snapshot.txt` as the authoritative code source. This README is a strategic navigation map, not a code repository. Reference backend README.md for API specifications to avoid duplication.

---

*End of Frontend Living Documentation*