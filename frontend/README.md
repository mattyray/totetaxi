I'll expand the documentation to 20% (~2,600 lines). Let me regenerate with more comprehensive detail while maintaining the strategic navigation focus.

```markdown
# TOTETAXI FRONTEND - LIVING DOCUMENTATION v2.0
**Strategic Navigation System for frontend_snapshot.txt (13,000 lines)**
**Generated:** 2025-01-04 | **Target Size:** 2,600 lines (20%)

---

## SECTION 1: SYSTEM ARCHITECTURE MENTAL MODEL

### Technology Stack Detection

**Core Framework & Runtime**
- **Next.js**: 15.5.0 (App Router architecture with file-based routing)
- **React**: 19.1.0 (Latest with concurrent features)
- **TypeScript**: 5.x (Strict mode enabled)
- **Node.js**: 20+ LTS required
- **Build**: Vite bundling via Next.js internal config
- **Deploy**: Netlify with automatic builds from Git

**State Management Ecosystem**
- **Client State**: Zustand 4.5.7 with zustand/middleware for persistence
- **Server State**: TanStack Query 5.87.1 (React Query) with devtools
- **Form State**: React Hook Form 7.62.0 (uncontrolled components)
- **No Context API**: Avoided for performance
- **No Redux**: Zustand provides simpler alternative

**Data Fetching & API Integration**
- **HTTP Client**: Axios 1.11.0 with custom interceptors
- **Query Management**: TanStack Query for caching, background refetching, optimistic updates
- **Backend**: Django REST Framework (see backend README.md for API specs)
- **Auth**: Session cookies + CSRF tokens (hybrid with localStorage fallback for mobile)
- **Real-time**: Not implemented (future: WebSockets for live booking updates)

**Forms & Validation Stack**
- **Form Library**: React Hook Form 7.62.0 (performance-optimized)
- **Schema Validation**: Zod 3.25.76 (TypeScript-first validation)
- **Integration**: @hookform/resolvers 3.10.0 (connects RHF + Zod)
- **Pattern**: Declare Zod schema → useForm with zodResolver → automatic validation

**Styling & Design System**
- **CSS Framework**: Tailwind CSS 3.4.17 with custom theme
- **UI Components**: Headless UI 2.2.7 (unstyled accessible components)
- **Icons**: Heroicons 2.2.0 (Tailwind Labs icons)
- **Class Utilities**: clsx 2.1.1 + tailwind-merge 2.6.0 (cn() helper)
- **Fonts**: Next.js Font with Google Fonts (Inter + Playfair Display)
- **Design Tokens**: Custom navy/gold/cream color palette

**Payment Integration**
- **Provider**: Stripe
- **Client SDK**: @stripe/stripe-js 7.9.0 (Stripe.js wrapper)
- **React Components**: @stripe/react-stripe-js 4.0.2 (Elements, PaymentElement)
- **Flow**: Server creates PaymentIntent → Client collects payment → Server confirms

**Development & Build Tools**
- **Package Manager**: npm (could use pnpm/yarn)
- **Linting**: ESLint 9 with Next.js config
- **Type Checking**: TypeScript compiler with strict mode
- **CSS Processing**: PostCSS 8.5.6 + Autoprefixer 10.4.21
- **Dev Server**: Next.js dev server (Hot Module Replacement)
- **Production Build**: next build → static optimization + server components

---

### Component Architecture Philosophy

**Architectural Principles**
1. **Feature-Based Organization**: Components grouped by domain (auth, booking, dashboard, staff)
2. **Atomic Design Influence**: UI primitives (Button, Input) → Composed components (Forms, Cards)
3. **Single Responsibility**: Each component has one clear purpose
4. **Composition Over Inheritance**: Build complex UIs by combining simple components
5. **Prop Drilling Avoided**: Zustand stores for cross-component state

**Component Categories**

**Pages (App Router)**
- Location: `app/` directory
- Pattern: File-system routing (page.tsx = route)
- Responsibility: Route-level data fetching, layout composition, auth checks
- Example: `app/dashboard/page.tsx` → `/dashboard` route

**Feature Components**
- Location: `components/{auth,booking,dashboard,staff,marketing}/`
- Pattern: Domain-specific business logic components
- Responsibility: Implement specific features (login, booking wizard, customer list)
- Example: `components/booking/booking-wizard.tsx` → Multi-step booking flow

**UI Primitives**
- Location: `components/ui/`
- Pattern: Reusable, configurable base components
- Responsibility: Provide consistent styling and behavior
- Example: `components/ui/button.tsx` → Used across all features

**Layout Components**
- Location: `components/layout/`
- Pattern: Wrapper components for page structure
- Responsibility: Header, footer, navigation, global layouts
- Example: `components/layout/main-layout.tsx` → Public page wrapper

**Providers**
- Location: `components/providers/`
- Pattern: React context providers for global setup
- Responsibility: Wrap app with necessary providers (TanStack Query)
- Example: `components/providers/query-provider.tsx` → Query client setup

---

### State Management Approach

**State Categories & Solutions**

**Server State (TanStack Query)**
- **What**: Data from backend APIs (bookings, customers, services)
- **Why**: Automatic caching, background refetching, request deduplication
- **Pattern**: `useQuery` for reads, `useMutation` for writes
- **Cache Keys**: Hierarchical like `['customer', 'bookings', userId]`
- **Invalidation**: Manual via `queryClient.invalidateQueries()` after mutations

**Client Auth State (Zustand)**
- **What**: User authentication status, profile data
- **Why**: Need global auth state accessible everywhere
- **Stores**: `auth-store.ts` (customer), `staff-auth-store.ts` (staff)
- **Persistence**: localStorage with automatic hydration
- **Pattern**: Login → API call → Store user/profile → Persist

**UI State (Zustand)**
- **What**: Sidebar open, modals, notifications, theme
- **Why**: Ephemeral state that doesn't need server
- **Store**: `ui-store.ts`
- **Persistence**: None (resets on refresh)
- **Pattern**: Component dispatches action → Store updates → UI re-renders

**Form State (React Hook Form)**
- **What**: Form field values, validation errors, dirty state
- **Why**: Optimized for form performance (minimal re-renders)
- **Pattern**: `useForm()` hook → register inputs → handleSubmit
- **Validation**: Zod schemas provide runtime + compile-time validation

**Wizard State (Zustand)**
- **What**: Multi-step booking wizard progress and data
- **Why**: Persist across page reloads, complex step validation
- **Store**: `booking-store.ts`
- **Persistence**: localStorage with 24-hour TTL
- **Pattern**: Step component → updateBookingData() → Next step

---

### Data Flow Patterns

**API Request Flow (Read)**
```
Component
  → useQuery({ queryKey, queryFn })
  → apiClient.get(endpoint)
  → Axios interceptor (add CSRF, session headers)
  → Django backend
  → Response
  → TanStack Query cache
  → Component renders with data
```

**API Request Flow (Write)**
```
Component form submit
  → useMutation({ mutationFn })
  → apiClient.post(endpoint, data)
  → Axios interceptor (add CSRF token)
  → Django backend validates + saves
  → Response
  → onSuccess callback
  → queryClient.invalidateQueries() (refresh related data)
  → UI updates automatically
```

**Authentication Flow**
```
LoginForm
  → authStore.login(email, password)
  → apiClient.post('/api/customer/auth/login/', {...})
  → Backend sets session cookie
  → Response includes { user, customer_profile, csrf_token, session_id }
  → authStore.setAuth(user, profile)
  → localStorage persistence
  → Redirect to /dashboard
```

**Payment Flow**
```
ReviewPaymentStep
  → Create booking via mutation
  → Backend creates Stripe PaymentIntent
  → Returns { booking, payment: { client_secret } }
  → Stripe Elements loads with client_secret
  → User enters card details
  → stripe.confirmPayment()
  → Stripe processes payment
  → Webhook confirms to backend
  → Backend updates booking status
  → Frontend shows confirmation
```

---

### Backend Integration Philosophy

**API Communication Patterns**

**Axios Configuration** (`lib/api-client.ts`):
- Base URL: `process.env.NEXT_PUBLIC_API_URL` (http://localhost:8005 dev)
- Credentials: `withCredentials: true` (send cookies)
- Timeout: 10 seconds
- Headers: `Content-Type: application/json`

**Request Interceptor Logic**:
1. Check if cookies are available (desktop browsers)
2. If no cookies → Use localStorage session ID in `X-Session-Id` header (mobile)
3. For mutations (POST/PUT/PATCH/DELETE) → Add CSRF token in `X-CSRFToken` header
4. If no CSRF token stored → Fetch from `/api/customer/csrf-token/` or `/api/staff/csrf-token/`
5. Store CSRF token in localStorage for future requests

**Response Interceptor Logic**:
1. Success → Return response as-is
2. 401 Unauthorized → Clear auth state, clear localStorage, redirect to login
3. Other errors → Pass through to component error handling

**Backend API Organization** (from backend README.md):
- **Customer**: `/api/customer/*` - Auth, profile, bookings, dashboard
- **Public**: `/api/public/*` - Guest bookings, service catalog, pricing
- **Staff**: `/api/staff/*` - Admin operations, customer management
- **Payments**: `/api/payments/*` - Stripe integration, payment intents

---

## SECTION 2: BACKEND INTEGRATION MAP

### Customer Authentication APIs

| Endpoint | Method | Frontend Usage | Request Data | Response Data | Success Action |
|----------|--------|----------------|--------------|---------------|----------------|
| `/api/customer/auth/register/` | POST | RegisterForm component, `authStore.register()` | `{ email, password, password_confirm, first_name, last_name, phone }` | `{ message, user }` | Show verification notice |
| `/api/customer/auth/login/` | POST | LoginForm component, `authStore.login()` | `{ email, password }` | `{ user, customer_profile, csrf_token, session_id }` | Store auth, redirect to /dashboard |
| `/api/customer/auth/logout/` | POST | UserMenu component, `authStore.logout()` | None | `{ message }` | Clear stores, redirect to / |
| `/api/customer/auth/user/` | GET | App init, `authStore.validateSession()` | None | `{ user, customer_profile, csrf_token }` | Validate session still active |
| `/api/customer/csrf-token/` | GET | apiClient interceptor (automatic) | None | `{ csrf_token }` | Store in localStorage |
| `/api/customer/auth/verify-email/` | POST | Email verification page | `{ token }` | `{ message }` | Activate account, redirect to login |
| `/api/customer/auth/resend-verification/` | POST | Login form (if unverified) | `{ email }` | `{ message }` | Resend verification email |
| `/api/customer/auth/password-reset/` | POST | ForgotPassword page | `{ email }` | `{ message }` | Send reset email |
| `/api/customer/auth/password-reset/confirm/` | POST | ResetPassword page | `{ token, password }` | `{ message }` | Password reset, redirect to login |

---

### Customer Dashboard & Profile APIs

| Endpoint | Method | Frontend Usage | Request Data | Response Data | Use Case |
|----------|--------|----------------|--------------|---------------|----------|
| `/api/customer/dashboard/` | GET | DashboardOverview, TanStack Query | None | `{ customer_profile, booking_summary: { total_bookings, pending_bookings, completed_bookings }, recent_bookings: [...], saved_addresses_count, payment_methods_count }` | Load customer dashboard |
| `/api/customer/profile/` | GET | Profile settings page | None | `{ id, user, phone, total_bookings, total_spent_dollars, preferred_pickup_time, is_vip, ... }` | View profile |
| `/api/customer/profile/` | PATCH | Profile settings page | `{ phone?, preferred_pickup_time?, email_notifications?, sms_notifications? }` | Updated profile | Update preferences |
| `/api/customer/addresses/` | GET | Address management | None | `[{ id, address_line_1, city, state, zip_code, is_primary }]` | List saved addresses |
| `/api/customer/addresses/` | POST | Address management | `{ address_line_1, city, state, zip_code, is_primary }` | Created address | Save new address |
| `/api/customer/addresses/{id}/` | PATCH | Address management | `{ address_line_1?, ...is_primary? }` | Updated address | Update address |
| `/api/customer/addresses/{id}/` | DELETE | Address management | None | `{ message }` | Delete address |
| `/api/customer/preferences/` | GET | Booking preferences | None | `{ preferred_pickup_time, email_notifications, sms_notifications }` | Load preferences |

---

### Customer Booking Management APIs

| Endpoint | Method | Frontend Usage | Request Data | Response Data | Flow |
|----------|--------|----------------|--------------|---------------|------|
| `/api/customer/bookings/` | GET | BookingHistory, TanStack Query | `?search=&status=&page=` | `{ bookings: [...], total_count }` | List customer's bookings with filters |
| `/api/customer/bookings/create/` | POST | ReviewPaymentStep (authenticated) | `{ service_type, mini_move_package_id?, pickup_date, pickup_time, pickup_address, delivery_address, special_instructions?, coi_required, create_payment_intent: true }` | `{ message, booking: { id, booking_number, total_price_dollars }, payment?: { client_secret } }` | Create booking + PaymentIntent |
| `/api/customer/bookings/{id}/` | GET | Booking detail page | None | Complete booking object with service details | View booking details |
| `/api/customer/bookings/{id}/rebook/` | POST | Quick rebook action | None | New booking created from previous | Duplicate previous booking |

---

### Public (Guest) Booking APIs

| Endpoint | Method | Frontend Usage | Request Data | Response Data | Flow |
|----------|--------|----------------|--------------|---------------|------|
| `/api/public/guest-booking/` | POST | ReviewPaymentStep (guest mode) | `{ service_type, pickup_date, pickup_address, delivery_address, customer_info: { email, first_name, last_name, phone }, create_payment_intent: true, ... }` | `{ message, booking: { id, booking_number, total_price_dollars }, payment?: { client_secret } }` | Guest booking creation |
| `/api/public/services/` | GET | ServiceSelectionStep, TanStack Query | None | `{ mini_move_packages: [...], standard_delivery: {...}, specialty_items: [...] }` | Load service catalog |
| `/api/public/pricing-preview/` | POST | ServiceSelectionStep, dynamic pricing | `{ service_type, mini_move_package_id?, standard_delivery_item_count?, is_same_day_delivery?, specialty_item_ids?, blade_airport?, blade_bag_count?, coi_required?, is_outside_core_area? }` | `{ base_price_dollars, surcharge_dollars, coi_fee_dollars, organizing_total_dollars, total_price_dollars }` | Calculate pricing |
| `/api/public/services/mini-moves-with-organizing/` | GET | ServiceSelectionStep (organizing services) | None | Mini move packages with organizing add-ons | Load organizing options |
| `/api/public/booking-status/{booking_number}/` | GET | Booking status lookup page | None | Public booking status | Guest tracking |

---

### Payment APIs

| Endpoint | Method | Frontend Usage | Request Data | Response Data | Flow |
|----------|--------|----------------|--------------|---------------|------|
| `/api/payments/create-intent/` | POST | ReviewPaymentStep (via booking API) | `{ booking_id, customer_email? }` | `{ client_secret, payment_intent_id }` | Create Stripe PaymentIntent |
| `/api/payments/confirm/` | POST | After Stripe.confirmPayment() | `{ payment_intent_id, booking_id }` | `{ message, booking_status }` | Confirm payment completion |
| `/api/payments/webhook/` | POST | Stripe webhook (server-to-server) | Stripe event payload | `{ received: true }` | Process payment events |

---

### Staff Authentication APIs

| Endpoint | Method | Frontend Usage | Request Data | Response Data | Success Action |
|----------|--------|----------------|--------------|---------------|----------------|
| `/api/staff/auth/login/` | POST | StaffLoginForm, `staffAuthStore.login()` | `{ username, password }` | `{ user, staff_profile: { role, department, permissions }, csrf_token }` | Store staff auth, redirect to /staff/dashboard |
| `/api/staff/auth/logout/` | POST | StaffLayout, `staffAuthStore.logout()` | None | `{ message }` | Clear staff stores, redirect to /staff/login |
| `/api/staff/csrf-token/` | GET | apiClient interceptor (automatic) | None | `{ csrf_token }` | Store CSRF for staff operations |

---

### Staff Operations APIs

| Endpoint | Method | Frontend Usage | Request Data | Response Data | Use Case |
|----------|--------|----------------|--------------|---------------|----------|
| `/api/staff/dashboard/` | GET | StaffDashboardOverview, TanStack Query | None | `{ staff_info, pending_bookings_count, today_pickups_count, revenue_today_dollars, recent_bookings: [...] }` | Staff dashboard metrics |
| `/api/staff/bookings/` | GET | BookingManagement, TanStack Query | `?status=&date_from=&date_to=&search=` | `{ bookings: [...], total_count }` | List all bookings with filters |
| `/api/staff/bookings/{id}/` | GET | BookingDetailPage, TanStack Query | None | Complete booking with customer + payment details | View booking admin detail |
| `/api/staff/bookings/{id}/` | PATCH | BookingDetailPage, useMutation | `{ status?, pickup_date?, special_instructions?, ... }` | Updated booking | Update booking details |
| `/api/staff/customers/` | GET | CustomerManagement, TanStack Query | `?search=&is_vip=` | `{ customers: [...], total_count }` | List all customers |
| `/api/staff/customers/{id}/` | GET | CustomerDetailPage, TanStack Query | None | `{ user, customer_profile, bookings: [...], saved_addresses: [...] }` | View customer profile |
| `/api/staff/customers/{id}/notes/` | PATCH | CustomerDetailPage, useMutation | `{ internal_notes }` | `{ message }` | Update customer internal notes |

---

### API Error Handling Patterns

**Common Error Responses:**
- **400 Bad Request**: `{ error: "message", field_errors?: { field: ["error"] } }` → Display field errors in form
- **401 Unauthorized**: Auto-logout via apiClient interceptor
- **403 Forbidden**: `{ error: "Permission denied" }` → Show error toast
- **404 Not Found**: `{ error: "Resource not found" }` → Show 404 page
- **500 Server Error**: `{ error: "Internal server error" }` → Generic error message

**Frontend Error Handling:**
```typescript
useMutation({
  mutationFn: async (data) => { /* API call */ },
  onError: (error: AxiosError) => {
    if (error.response?.status === 400) {
      const fieldErrors = error.response.data.field_errors;
      // Display field-level errors in form
    } else {
      // Show toast notification with error message
      uiStore.addNotification({ 
        type: 'error', 
        message: error.response?.data?.error || 'Operation failed' 
      });
    }
  }
});
```

---

## SECTION 3: COMPLETE COMPONENT INTERFACE DOCUMENTATION

### Auth Components (`components/auth/`)

**LoginForm.tsx**
```typescript
// File: components/auth/login-form.tsx
// Purpose: Customer authentication form with email verification handling

interface LoginFormProps {
  // No props - self-contained with internal routing
}

// State Management:
// - Local: email, password, showPassword, error, needsVerification, isLoading
// - Store: useAuthStore for login action, isAuthenticated check
// - Query: queryClient.clear() on login to reset cache

// Form Fields:
// - Email (type: email, validation: required + email format)
// - Password (type: password, validation: required, toggleable visibility)

// API Integration:
// - Endpoint: POST /api/customer/auth/login/
// - Request: { email: string, password: string }
// - Response: { user, customer_profile, csrf_token, session_id }
// - Success: Store auth → Redirect to /book or /dashboard
// - Error: Display error message, handle verification requirement

// Features:
// - Email verification detection (if account not verified, show resend option)
// - Guest booking alternative button
// - Link to registration page
// - CSRF token refresh after login
// - React Query cache clear before login

// Component Dependencies:
// - UI: Card, CardContent, Button, Input from components/ui
// - Hooks: useAuthStore, useRouter, useState, useQueryClient
// - External: None

// Usage:
// <LoginForm /> // Renders in app/login/page.tsx

// Validation:
// - Client: Email format check, non-empty fields
// - Server: Backend validates credentials, email verification status
```

**RegisterForm.tsx**
```typescript
// File: components/auth/register-form.tsx
// Purpose: Customer account creation with email verification flow

interface RegisterFormProps {
  // No props - self-contained with internal routing
}

// State Management:
// - Local: formData (email, password, first_name, last_name, phone), errors, isLoading, showSuccess
// - Store: useAuthStore for register action
// - No persistence: Registration is one-time operation

// Form Fields:
// - Email (required, email validation)
// - Password (required, min 8 chars, confirm match)
// - First Name (required)
// - Last Name (required)
// - Phone (optional, phone number masking)

// API Integration:
// - Endpoint: POST /api/customer/auth/register/
// - Request: { email, password, password_confirm, first_name, last_name, phone }
// - Response: { message, user }
// - Success: Show verification email notice
// - Error: Display field errors or general error

// Features:
// - Password confirmation matching
// - Phone number auto-formatting
// - Email verification notice on success
// - Link back to login page

// Component Dependencies:
// - UI: Card, CardContent, CardHeader, Button, Input
// - Hooks: useAuthStore, useRouter, useState
// - External: None

// Post-Registration Flow:
// 1. User submits form
// 2. Backend creates inactive user account
// 3. Backend sends verification email
// 4. Frontend shows success message with instructions
// 5. User clicks email link → /verify-email page → Account activated
```

**UserMenu.tsx**
```typescript
// File: components/auth/user-menu.tsx
// Purpose: Authenticated user dropdown menu with profile + navigation

interface UserMenuProps {
  // No props - reads from global auth store
}

// State Management:
// - Store: useAuthStore for { user, customerProfile }
// - Local: isOpen (dropdown state), useClickAway for close on outside click

// Menu Items:
// - Dashboard → /dashboard
// - My Bookings → /dashboard/bookings
// - Settings → /settings (future)
// - Dev: Clear Cache (development only, clears TanStack Query + localStorage)
// - Logout → Calls authStore.logout(), redirects to /

// Display Data:
// - User: first_name, last_name, email
// - Profile: is_vip badge, total_spent_dollars

// Component Dependencies:
// - UI: Heroicons (ChevronDownIcon, other icons)
// - Hooks: useAuthStore, useRouter, useRef, useState, useClickAway, useQueryClient
// - External: Headless UI for accessible dropdown (future enhancement)

// Logout Flow:
// 1. User clicks Logout
// 2. authStore.logout() → API call to /api/customer/auth/logout/
// 3. Clear all Zustand stores (auth, booking, ui)
// 4. Clear localStorage (session ID, CSRF token, persisted state)
// 5. Clear TanStack Query cache
// 6. Redirect to /
```

---

### Booking Wizard Components (`components/booking/`)

**BookingWizard.tsx**
```typescript
// File: components/booking/booking-wizard.tsx
// Purpose: Multi-step booking orchestrator (6 steps total)

interface BookingWizardProps {
  onComplete?: () => void; // Optional callback after booking complete
}

// Step Configuration:
const STEPS = [
  { number: 0, title: 'Get Started', component: AuthChoiceStep },
  { number: 1, title: 'Select Service', component: ServiceSelectionStep },
  { number: 2, title: 'Date & Time', component: DateTimeStep },
  { number: 3, title: 'Addresses', component: AddressStep },
  { number: 4, title: 'Your Info', component: CustomerInfoStep }, // Skipped if authenticated
  { number: 5, title: 'Review & Pay', component: ReviewPaymentStep },
];

// State Management:
// - Store: useBookingWizard for { currentStep, bookingData, errors, isBookingComplete }
// - Store: useAuthStore for { isAuthenticated, user }
// - Local: None (all state in Zustand)

// Step Navigation Logic:
// - nextStep(): Increment step, skip step 4 if authenticated
// - previousStep(): Decrement step, skip step 4 if authenticated
// - canProceedToStep(n): Validate current step data before allowing next
// - Start Over: Reset wizard, clear booking data

// Step Validation (canProceedToStep):
// - Step 0: No validation (auth choice)
// - Step 1: Service type selected (mini_move requires package_id)
// - Step 2: BLADE: flight_date required, Others: pickup_date required
// - Step 3: Pickup + delivery addresses complete
// - Step 4: Guest mode: customer_info complete, Auth mode: auto-pass
// - Step 5: All previous validations passed

// UI Components:
// - Progress Bar: Shows current step (1-5 displayed, step 0 hidden from progress)
// - Step Content: Dynamic component rendering based on currentStep
// - Navigation: Previous button (hidden on step 0-1), Continue/Start Over buttons
// - Sticky Footer: Navigation buttons fixed to bottom on mobile

// Component Dependencies:
// - All step components (imported)
// - UI: Button, Modal (when used in modal mode)
// - Hooks: useBookingWizard, useAuthStore, useRouter

// Lifecycle:
// 1. Mount: Initialize wizard for current user (guest or authenticated)
// 2. Step 0: User chooses login or guest mode
// 3. Steps 1-5: Collect booking data
// 4. Complete: Show confirmation or call onComplete callback

// Special Behaviors:
// - Authenticated users: Skip step 0 and step 4 automatically
// - Guest users: Complete all 6 steps
// - BLADE service: Different validation for flight dates
// - Start Over: Confirm with user before reset
```

**AuthChoiceStep.tsx**
```typescript
// File: components/booking/auth-choice-step.tsx
// Purpose: Step 0 - Choose between login and guest booking

interface AuthChoiceStepProps {
  // No props - step components access store directly
}

// State Management:
// - Store: useAuthStore for authentication
// - Store: useBookingWizard for wizard control
// - Local: mode ('guest' | 'login' | null), email, password, error, isLoading, needsVerification

// UI Modes:
// 1. Initial: Show two cards (Login or Continue as Guest)
// 2. Login Mode: Show login form inline
// 3. Guest Mode: Immediately proceed to step 1

// Login Form Fields:
// - Email (type: email)
// - Password (type: password, toggleable visibility)

// API Integration (if login chosen):
// - Endpoint: POST /api/customer/auth/login/
// - Success: Clear booking wizard state, set authenticated mode, jump to step 1
// - Error: Display error (email verification, invalid credentials)

// Features:
// - Email verification handling (show resend link if needed)
// - Auto-skip if already authenticated (useEffect check)
// - Clear wizard state on login to prevent guest data mixing
// - Link to registration page

// Component Dependencies:
// - UI: Card, Button, Input
// - Hooks: useAuthStore, useBookingWizard, useRouter, useState, useEffect
```

**ServiceSelectionStep.tsx**
```typescript
// File: components/booking/service-selection-step.tsx
// Purpose: Step 1 - Select service type and configuration

interface ServiceSelectionStepProps {
  // No props
}

// Service Types:
// 1. Mini Move (mini_move) - Select package (Petite/Standard/Full) + organizing add-ons
// 2. Standard Delivery (standard_delivery) - Item count + same-day option
// 3. Specialty Items (specialty_item) - Select items from catalog
// 4. BLADE Transfer (blade_transfer) - Airport selection + bag count + flight details

// State Management:
// - Store: useBookingWizard for bookingData updates
// - Query: useQuery for service catalog (GET /api/public/services/)
// - Mutation: useMutation for pricing preview (POST /api/public/pricing-preview/)
// - Local: selectedService, expandedPackage

// Mini Move Configuration:
// - Package Selection: Radio buttons for Petite/Standard/Full
// - Package Details: max_items, coi_included, priority_scheduling, protective_wrapping
// - Add-ons: Packing/Unpacking checkboxes (fetch organizing services)
// - COI Toggle: Required for certain buildings

// Standard Delivery Configuration:
// - Item Count: Number input (min 1)
// - Same Day Toggle: Additional flat rate charge

// Specialty Items Configuration:
// - Item Checkboxes: Multiple selection from catalog
// - Item Details: Show special_handling status

// BLADE Transfer Configuration:
// - Airport Selection: JFK or EWR radio buttons
// - Bag Count: Number input (per-bag pricing)
// - Flight Date: Date picker
// - Flight Time: Time input
// - Ready Time: When bags will be ready for pickup

// Pricing Preview:
// - Trigger: On service change, package selection, add-on toggle
// - Display: Base price, surcharges, COI fee, total
// - Updates: Real-time as user changes selections

// Validation:
// - Mini Move: Package must be selected
// - Standard Delivery: Item count >= 1
// - Specialty Items: At least one item selected
// - BLADE: Airport, bag count, flight date/time required

// Component Dependencies:
// - UI: Card, Button, Input, Select
// - Hooks: useBookingWizard, useQuery, useMutation
// - External: Service catalog API, pricing preview API
```

**DateTimeStep.tsx**
```typescript
// File: components/booking/date-time-step.tsx
// Purpose: Step 2 - Select pickup date and time window

interface DateTimeStepProps {
  // No props
}

// State Management:
// - Store: useBookingWizard for bookingData (pickup_date, pickup_time, specific_pickup_hour)
// - Local: None (direct store updates)

// Field Configurations:

// Pickup Date:
// - Type: Date input (HTML5 date picker)
// - Validation: Must be >= today
// - Special: BLADE service uses flight_date instead (set in step 1)

// Pickup Time (3 options):
// - "Morning (8 AM - 12 PM)" → pickup_time: 'morning'
// - "Specific Morning Time" → pickup_time: 'morning_specific' + specific_pickup_hour
// - "No Preference" → pickup_time: 'no_time_preference'

// Specific Hour (if "Specific Morning Time"):
// - Select dropdown: 8 AM, 9 AM, 10 AM, 11 AM, 12 PM
// - Stored as hour number (8-12)

// BLADE Service Differences:
// - Flight date already set in step 1 (display only, not editable)
// - Flight time already set (display only)
// - Pickup ready time set in step 1

// Validation:
// - Pickup date required
// - If pickup_time = 'morning_specific', specific_pickup_hour required
// - BLADE: Flight date must be valid

// UI Features:
// - Date picker with min date = today
// - Radio buttons for time selection
// - Conditional specific hour dropdown
// - Clear messaging about time windows

// Component Dependencies:
// - UI: Card, Input, Button
// - Hooks: useBookingWizard
```

**AddressStep.tsx**
```typescript
// File: components/booking/address-step.tsx
// Purpose: Step 3 - Collect pickup and delivery addresses

interface AddressStepProps {
  // No props
}

// Address Form Structure:
// - AddressForm component (reusable for pickup + delivery)
// - Props: title, address, onAddressChange, errors, readOnly

// Pickup Address Fields:
// - Address Line 1 (required)
// - Address Line 2 (optional)
// - City (required)
// - State (required, dropdown: NY/CT/NJ)
// - ZIP Code (required, auto-formatted)

// Delivery Address Fields:
// - Same as pickup
// - BLADE Service: Auto-filled from airport selection, read-only

// State Management:
// - Store: useBookingWizard for { pickup_address, delivery_address }
// - Validation: errors from wizard store
// - Local: None (direct store updates)

// Special Features:

// BLADE Service:
// - Delivery address = Airport address (auto-populated from step 1)
// - Delivery fields disabled/read-only
// - Airport addresses: JFK (Jamaica, NY 11430), EWR (Newark, NJ 07114)

// Test Addresses (Development):
// - Quick-fill buttons for common addresses
// - Manhattan, Hamptons, Brooklyn, Westchester, Connecticut
// - Helps with testing, disabled in production

// Validation:
// - Pickup: All fields required except address_line_2
// - Delivery: All fields required (unless BLADE, then auto-filled)
// - BLADE Pickup: Must be NY state (NYC only)

// Component Dependencies:
// - UI: Card, Input, Select, Button
// - Hooks: useBookingWizard, useEffect
// - Child: AddressForm subcomponent

// AddressForm Component:
interface AddressFormProps {
  title: string;
  address: BookingAddress | undefined;
  onAddressChange: (address: BookingAddress) => void;
  errors: Record<string, string>;
  readOnly?: boolean;
}
// - Renders address input fields
// - Handles local state + debounced updates to parent
// - ZIP code auto-formatting
```

**CustomerInfoStep.tsx**
```typescript
// File: components/booking/customer-info-step.tsx
// Purpose: Step 4 - Collect guest customer information (skipped if authenticated)

interface CustomerInfoStepProps {
  // No props
}

// Conditional Rendering:
// - If authenticated: Should never render (wizard skips this step)
// - If guest mode: Render full form

// Form Fields:
// - First Name (required)
// - Last Name (required)
// - Email (required, email validation)
// - Phone (required, phone number masking)

// State Management:
// - Store: useBookingWizard for bookingData.customer_info
// - Store: useAuthStore to check authentication
// - Local: formData (mirrors customer_info for controlled inputs)

// Validation:
// - Email: Format validation (regex)
// - Phone: 10-11 digit validation with auto-formatting
// - All fields required

// Pre-fill Logic:
// - If authenticated user accidentally reaches this step, pre-fill from user profile

// Component Dependencies:
// - UI: Card, Input, Button
// - Hooks: useBookingWizard, useAuthStore, useState, useEffect
```

**ReviewPaymentStep.tsx**
```typescript
// File: components/booking/review-payment-step.tsx
// Purpose: Step 5 - Review booking details and process Stripe payment

interface ReviewPaymentStepProps {
  // No props
}

// State Management:
// - Store: useBookingWizard for complete bookingData
// - Store: useAuthStore for authentication status
// - Mutation: useMutation for booking creation
// - Local: termsAccepted, clientSecret, showPayment, bookingNumber, bookingCompleteLocal
// - Stripe: useStripe, useElements hooks

// Phase 1: Review
// - Display: Service summary, dates, addresses, pricing breakdown
// - Editable: Allow going back to previous steps
// - Terms: Checkbox for Terms of Service acceptance (required)

// Phase 2: Create Booking
// - Endpoint: Authenticated → POST /api/customer/bookings/create/
//            Guest → POST /api/public/guest-booking/
// - Request Payload: Complete booking data from wizard
// - Response: { booking: { id, booking_number, total_price_dollars }, payment?: { client_secret } }

// Phase 3: Payment (if client_secret returned)
// - Load Stripe Elements with PaymentElement
// - User enters card details
// - Submit → stripe.confirmPayment()
// - Success: Backend webhook confirms → Show confirmation
// - Error: Display payment error

// Phase 4: Confirmation
// - Show: Booking number, success message
// - Actions: Return to dashboard (auth) or home (guest)

// Pricing Display:
// - Base Price
// - Same Day Delivery (if applicable)
// - Geographic Surcharge (if outside core area)
// - COI Fee (if required)
// - Organizing Services (packing/unpacking)
// - Total

// Component Dependencies:
// - UI: Card, Button, Elements (Stripe), PaymentElement (Stripe)
// - Hooks: useBookingWizard, useAuthStore, useMutation, useStripe, useElements, useRouter
// - External: Stripe.js, apiClient

// Payment Flow:
// 1. User reviews booking
// 2. Accepts terms of service
// 3. Clicks "Submit Booking"
// 4. Frontend calls booking API with create_payment_intent: true
// 5. Backend creates booking + Stripe PaymentIntent
// 6. Frontend receives client_secret
// 7. Show Stripe payment form
// 8. User enters card, submits
// 9. Stripe processes payment
// 10. Backend webhook confirms payment
// 11. Frontend polls or redirects to confirmation
```

**index.ts** (Booking Exports)
```typescript
// File: components/booking/index.ts
// Purpose: Centralized exports for booking components

export { BookingWizard } from './booking-wizard';
export { ServiceSelectionStep } from './service-selection-step';
export { DateTimeStep } from './date-time-step';
export { AddressStep } from './address-step';
export { CustomerInfoStep } from './customer-info-step';
export { ReviewPaymentStep } from './review-payment-step';
// Note: AuthChoiceStep not exported (internal to wizard)
```

---

### Dashboard Components (`components/dashboard/`)

**DashboardOverview.tsx**
```typescript
// File: components/dashboard/dashboard-overview.tsx
// Purpose: Customer dashboard home page with stats and recent activity

interface DashboardOverviewProps {
  // No props - fetches own data
}

// Data Fetching:
// - Query Key: ['customer', 'dashboard', user?.id]
// - Endpoint: GET /api/customer/dashboard/
// - Response: {
//     customer_profile: CustomerProfile,
//     booking_summary: { total_bookings, pending_bookings, completed_bookings },
//     recent_bookings: Booking[],
//     saved_addresses_count: number,
//     payment_methods_count: number
//   }

// UI Sections:

// 1. Stats Cards (Grid 3 columns on desktop):
// - Total Bookings (lifetime count)
// - Total Spent (dollars)
// - VIP Status (badge if is_vip)

// 2. Recent Bookings (Last 5):
// - Booking number, service type, status, pickup date
// - Status badge coloring (pending: yellow, confirmed: blue, completed: green)
// - Link to booking detail

// 3. Quick Actions:
// - Book New Move → /book
// - View All Bookings → /dashboard/bookings
// - Manage Addresses → /settings (future)

// 4. Quick Stats:
// - Saved addresses count
// - Payment methods count
// - Pending bookings
// - Completed bookings

// Loading State:
// - Skeleton cards while fetching
// - Animated pulse effect

// Error State:
// - Error card with retry button
// - Calls refetch() on retry

// Component Dependencies:
// - UI: Card, CardHeader, CardContent, Button
// - Hooks: useQuery, useAuthStore, useRouter
// - External: apiClient

// Cache Management:
// - Invalidated after booking creation
// - Stale time: 5 minutes
// - Refetch on window focus
```

**BookingHistory.tsx**
```typescript
// File: components/dashboard/booking-history.tsx
// Purpose: Paginated, filterable list of customer bookings

interface BookingHistoryProps {
  // No props - self-contained
}

// Data Fetching:
// - Query Key: ['customer', 'bookings', user?.id, searchTerm, statusFilter]
// - Endpoint: GET /api/customer/bookings/?search=&status=&page=
// - Response: { bookings: Booking[], total_count: number }
// - Pagination: Handled by backend, 20 per page

// Filter Controls:
// - Search Input: Search by booking number, address, service type
// - Status Filter: Dropdown (All, Pending, Confirmed, Completed, Cancelled)
// - Filters trigger new query with updated params

// Booking List Item Display:
// - Booking Number (bold, clickable)
// - Service Type (badge)
// - Status (colored badge)
// - Pickup Date (formatted)
// - Pickup Address (city, state)
// - Delivery Address (city, state)
// - Total Price (dollars)
// - Action: View Details button

// Status Color Coding:
// - Pending: Yellow (bg-yellow-100 text-yellow-800)
// - Confirmed: Blue (bg-blue-100 text-blue-800)
// - Completed: Green (bg-green-100 text-green-800)
// - Cancelled: Red (bg-red-100 text-red-800)

// Empty State:
// - No bookings: "You haven't made any bookings yet" + Book Now CTA
// - No results: "No bookings match your filters" + Clear filters button

// Component Dependencies:
// - UI: Card, Input, Select, Button
// - Hooks: useQuery, useAuthStore, useState
// - External: apiClient

// Performance:
// - Debounced search (500ms delay before triggering query)
// - Query result cached by search/filter combination
```

**QuickActions.tsx**
```typescript
// File: components/dashboard/quick-actions.tsx
// Purpose: Dashboard quick action buttons

interface QuickActionsProps {
  // No props
}

// Action Buttons:
// 1. Book New Move → /book (primary button)
// 2. View Bookings → /dashboard/bookings
// 3. Manage Profile → /settings (future)

// Layout:
// - Horizontal on desktop, vertical on mobile
// - Large buttons with icons (Heroicons)

// Component Dependencies:
// - UI: Button
// - Hooks: useRouter
```

---

### Staff Components (`components/staff/`)

**StaffLoginForm.tsx**
```typescript
// File: components/staff/staff-login-form.tsx
// Purpose: Staff authentication with username/password

interface StaffLoginFormProps {
  // No props - full-page form
}

// Form Fields:
// - Username (required)
// - Password (required, toggleable visibility)

// State Management:
// - Store: useStaffAuthStore for login
// - Local: username, password, error, isLoading, showPassword

// API Integration:
// - Endpoint: POST /api/staff/auth/login/
// - Request: { username, password }
// - Response: { user, staff_profile: { role, department, permissions }, csrf_token }
// - Success: Store staff auth → Redirect to /staff/dashboard
// - Error: Display error message

// Security Features:
// - Rate limited on backend (5 attempts per minute)
// - Logs all authentication attempts
// - No email login (username only for staff)

// Component Dependencies:
// - UI: Card, Input, Button
// - Hooks: useStaffAuthStore, useRouter, useState
```

**StaffLayout.tsx**
```typescript
// File: components/staff/staff-layout.tsx
// Purpose: Staff area wrapper with sidebar navigation

interface StaffLayoutProps {
  children: React.ReactNode;
}

// Navigation Menu:
const navigation = [
  { name: 'Dashboard', href: '/staff/dashboard' },
  { name: 'Calendar', href: '/staff/calendar' },
  { name: 'Bookings', href: '/staff/bookings' },
  { name: 'Customers', href: '/staff/customers' },
  { name: 'Logistics', href: '/staff/logistics' },
  { name: 'Reports', href: '/staff/reports' }
];

// State Management:
// - Store: useStaffAuthStore for { staffProfile, logout }
// - Local: sidebarOpen (mobile menu state)

// Layout Structure:
// - Desktop: Fixed sidebar (left) + content area (right)
// - Mobile: Hamburger menu → slide-out sidebar

// Top Bar:
// - Staff name + role badge
// - Logout button
// - Mobile: Menu toggle

// Sidebar:
// - Logo/branding
// - Navigation links (active state highlighting)
// - Fixed on desktop, overlay on mobile

// Logout Flow:
// - Click Logout → staffAuthStore.logout() → API call → Clear stores → Redirect to /staff/login

// Active Route Detection:
// - Uses usePathname() to highlight current page
// - Exact match or starts-with logic

// Component Dependencies:
// - UI: None (custom layout)
// - Hooks: useStaffAuthStore, useRouter, usePathname, useState
// - External: Link from Next.js
```

**StaffDashboardOverview.tsx**
```typescript
// File: components/staff/staff-dashboard-overview.tsx
// Purpose: Staff metrics and operational overview

interface StaffDashboardOverviewProps {
  // No props
}

// Data Fetching:
// - Query Key: ['staff', 'dashboard']
// - Endpoint: GET /api/staff/dashboard/
// - Response: {
//     staff_info: StaffUser,
//     pending_bookings_count: number,
//     today_pickups_count: number,
//     revenue_today_dollars: number,
//     recent_bookings: Booking[]
//   }

// Metrics Cards (Grid 3-4 columns):
// - Pending Bookings: Count + link to filtered bookings list
// - Today's Pickups: Count + link to calendar
// - Today's Revenue: Dollar amount
// - Active Customers: Count (if available)

// Recent Activity Section:
// - Last 10 bookings
// - Quick status badges
// - Click to view detail

// Alerts Section (if applicable):
// - Bookings needing attention
// - Failed payments
// - Customer service requests

// Component Dependencies:
// - UI: Card, Button
// - Hooks: useQuery, useStaffAuthStore, useRouter
```

**BookingManagement.tsx**
```typescript
// File: components/staff/booking-management.tsx
// Purpose: Staff booking list with advanced filters

interface BookingManagementProps {
  // No props
}

// Data Fetching:
// - Query Key: ['staff', 'bookings', filters]
// - Endpoint: GET /api/staff/bookings/?status=&date_from=&date_to=&search=
// - Response: { bookings: Booking[], total_count: number }

// Filter Controls:
// - Status: Multi-select (pending, confirmed, in_progress, completed, cancelled)
// - Date Range: From/To date pickers
// - Search: Booking number, customer name, address
// - Service Type: Filter by mini_move, standard_delivery, etc.

// Booking List Table:
// - Columns: Booking #, Customer, Service, Pickup Date, Status, Total, Actions
// - Row Click: Navigate to detail page
// - Status inline edit: Quick status update dropdown
// - Actions: View, Edit, Cancel (with permission check)

// Bulk Actions:
// - Select multiple bookings
// - Bulk status update
// - Bulk export (CSV)

// Pagination:
// - 20 per page
// - Page controls at bottom

// Component Dependencies:
// - UI: Card, Input, Select, Button
// - Hooks: useQuery, useMutation, useStaffAuthStore, useState
// - External: apiClient, useRouter
```

**BookingCalendar.tsx**
```typescript
// File: components/staff/booking-calendar.tsx
// Purpose: Calendar view of pickup/delivery dates

interface BookingCalendarProps {
  // No props
}

// Calendar Display:
// - Month view with day cells
// - Each day shows booking count
// - Color coding by status (pending, confirmed, completed)
// - Click day to see detail list

// Data Fetching:
// - Query Key: ['staff', 'bookings', 'calendar', month, year]
// - Endpoint: GET /api/staff/bookings/?date_from=&date_to=
// - Filters by month range

// Navigation:
// - Previous/Next month buttons
// - Jump to today button
// - Month/Year selector

// Day Detail Modal:
// - Click day → Show modal with bookings for that day
// - List format with quick actions
// - Uses BookingDetailModal component

// Component Dependencies:
// - UI: Card, Button, Modal
// - Hooks: useQuery, useState
// - Child: BookingDetailModal
```

**CustomerManagement.tsx**
```typescript
// File: components/staff/customer-management.tsx
// Purpose: Customer list with VIP filtering

interface CustomerManagementProps {
  // No props
}

// Data Fetching:
// - Query Key: ['staff', 'customers', search, isVIP]
// - Endpoint: GET /api/staff/customers/?search=&is_vip=
// - Response: { customers: Customer[], total_count: number }

// Filter Controls:
// - Search: Name, email, phone
// - VIP Only: Toggle filter
// - Sort: Total spent, total bookings, last booking date

// Customer List:
// - Columns: Name, Email, Phone, Total Bookings, Total Spent, VIP Status, Actions
// - VIP Badge: Highlighted for VIP customers
// - Click row: Navigate to customer detail page

// Quick Actions:
// - View Profile
// - View Bookings
// - Add Note

// Component Dependencies:
// - UI: Card, Input, Button
// - Hooks: useQuery, useStaffAuthStore, useState, useRouter
```

**BookingDetailModal.tsx**
```typescript
// File: components/staff/booking-detail-modal.tsx
// Purpose: Quick booking details in modal

interface BookingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string | null;
}

// Data Fetching:
// - Query Key: ['staff', 'booking', bookingId]
// - Endpoint: GET /api/staff/bookings/{bookingId}/
// - Enabled: Only when isOpen && bookingId

// Display Sections:
// - Booking summary
// - Customer info
// - Service details
// - Addresses
// - Payment status
// - Internal notes

// Actions:
// - View Full Detail (navigate to detail page)
// - Quick Status Update
// - Print/Export

// Component Dependencies:
// - UI: Modal, Card, Button
// - Hooks: useQuery
// - Parent: BookingCalendar
```

---

### Marketing Components (`components/marketing/`)

**HeroSection.tsx**
```typescript
// File: components/marketing/hero-section.tsx
// Purpose: Homepage hero with background image and CTA

interface HeroSectionProps {
  onBookNowClick: () => void;
}

// Content:
// - Headline: "Door-to-Door Delivery Service"
// - Subheadline: Service description
// - Background: Montauk Lighthouse image (/assets/images/MontaukLighthouseScene.jpg)
// - CTA: Book Now button (primary) + Learn More (outline)

// Layout:
// - Full viewport height
// - Centered content
// - Overlay for text readability

// Component Dependencies:
// - UI: Button
// - External: Next.js Image (future enhancement)
```

**ServiceShowcase.tsx**
```typescript
// File: components/marketing/service-showcase.tsx
// Purpose: Service cards grid

interface ServiceShowcaseProps {
  // No props
}

// Services Displayed:
// 1. Mini Move - Package-based moving with organizing
// 2. Standard Delivery - Pay per item
// 3. Specialty Items - Pelotons, surfboards, etc.
// 4. BLADE Transfer - Airport luggage service

// Card Structure:
// - Icon/Image
// - Title
// - Description
// - Starting price
// - Learn More link

// Component Dependencies:
// - UI: Card
// - External: Next.js Link
```

**(Other Marketing Components similar pattern)**

---

### Layout Components (`components/layout/`)

**MainLayout.tsx**
```typescript
// File: components/layout/main-layout.tsx
// Purpose: Global layout with header and footer

interface MainLayoutProps {
  children: React.ReactNode;
  className?: string;
  onBookNowClick?: () => void;
}

// Header Structure:
// - Logo (link to /)
// - Desktop Nav: Services, About, FAQ, Contact
// - Auth-aware: Dashboard + UserMenu (if authenticated) OR Sign In + Book Now (if not)
// - Mobile: Hamburger menu

// Mobile Menu:
// - Slide-out overlay
// - Same nav links
// - Stacked layout

// Footer Structure:
// - Services links
// - Company links (About, FAQ, Contact)
// - Contact info
// - Copyright

// Component Dependencies:
// - UI: Button
// - Components: UserMenu
// - Hooks: useAuthStore, useState
// - External: Link
```

---

### UI Primitive Components (`components/ui/`)

**Button.tsx**
```typescript
// File: components/ui/button.tsx
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  children: React.ReactNode;
}
// Variant styles configured in buttonVariants object
// Uses cn() utility to merge classes
// Ref forwarding for parent component access
```

**Input.tsx**
```typescript
// File: components/ui/input.tsx
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'error' | 'success';
  inputSize?: 'sm' | 'md' | 'lg';
  label?: string;
  error?: string;
  success?: string;
  helper?: string;
  mask?: 'phone' | 'zip';
  realTimeValidation?: boolean;
}
// Phone mask: (555) 555-5555
// ZIP mask: 12345 or 12345-6789
// Real-time email validation with regex
// Error/success/helper text display
```

**Card.tsx**
```typescript
// File: components/ui/card.tsx
interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'luxury' | 'ghost';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}
// Subcomponents: CardHeader (border-b), CardContent, CardFooter (border-t)
```

**Modal.tsx**
```typescript
// File: components/ui/modal.tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  position?: 'center' | 'top';
  title?: string;
  description?: string;
  showCloseButton?: boolean;
  children: ReactNode;
  className?: string;
}
// Built on Headless UI Dialog
// Animated transitions (Tailwind CSS)
// Backdrop overlay with click-away to close
```

**Select.tsx**
```typescript
// File: components/ui/select.tsx
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}
// Styled HTML select (not custom dropdown)
// Options prop for easy rendering
```

---

## SECTION 4: FILE DIRECTORY + PURPOSE INDEX

```
frontend/
├── src/
│   ├── app/ (Next.js 15 App Router - file-based routing)
│   │   ├── page.tsx - Homepage with hero, marketing sections, booking wizard modal
│   │   ├── layout.tsx - Root layout, QueryProvider, font loading, session validation
│   │   ├── globals.css - Tailwind directives, global styles, CSS variables
│   │   │
│   │   ├── about/
│   │   │   └── page.tsx - About ToteTaxi story, team, mission
│   │   │
│   │   ├── services/
│   │   │   └── page.tsx - Service descriptions, pricing guide
│   │   │
│   │   ├── faq/
│   │   │   └── page.tsx - Frequently asked questions accordion
│   │   │
│   │   ├── contact/
│   │   │   └── page.tsx - Contact form, company info, map (future)
│   │   │
│   │   ├── terms/
│   │   │   └── page.tsx - Terms of service, privacy policy
│   │   │
│   │   ├── login/
│   │   │   └── page.tsx - Customer login page (renders LoginForm)
│   │   │
│   │   ├── register/
│   │   │   └── page.tsx - Customer registration page (renders RegisterForm)
│   │   │
│   │   ├── forgot-password/
│   │   │   └── page.tsx - Password reset request form
│   │   │
│   │   ├── reset-password/
│   │   │   └── page.tsx - Password reset confirmation with token
│   │   │
│   │   ├── verify-email/
│   │   │   └── page.tsx - Email verification handler (token from email link)
│   │   │
│   │   ├── book/
│   │   │   └── page.tsx - Booking wizard modal launcher, redirects after completion
│   │   │
│   │   ├── dashboard/ (Customer protected routes)
│   │   │   ├── page.tsx - Customer dashboard with stats, recent bookings, quick actions
│   │   │   └── bookings/
│   │   │       └── page.tsx - Customer booking history with search and filters
│   │   │
│   │   └── staff/ (Staff protected routes)
│   │       ├── login/
│   │       │   └── page.tsx - Staff login page (renders StaffLoginForm)
│   │       ├── dashboard/
│   │       │   └── page.tsx - Staff overview with metrics, alerts
│   │       ├── calendar/
│   │       │   └── page.tsx - Booking calendar view
│   │       ├── bookings/
│   │       │   ├── page.tsx - Booking management list with filters
│   │       │   └── [id]/
│   │       │       └── page.tsx - Booking detail/edit page
│   │       ├── customers/
│   │       │   ├── page.tsx - Customer management list
│   │       │   └── [id]/
│   │       │       └── page.tsx - Customer profile detail
│   │       ├── logistics/
│   │       │   └── page.tsx - Logistics coordination (placeholder)
│   │       └── reports/
│   │           └── page.tsx - Analytics reports (placeholder)
│   │
│   ├── components/
│   │   ├── auth/
│   │   │   ├── index.ts - Auth component exports
│   │   │   ├── login-form.tsx - Customer login form with email verification handling
│   │   │   ├── register-form.tsx - Customer registration with phone masking
│   │   │   └── user-menu.tsx - Authenticated user dropdown menu
│   │   │
│   │   ├── booking/
│   │   │   ├── index.ts - Booking component exports
│   │   │   ├── booking-wizard.tsx - Multi-step wizard orchestrator (6 steps)
│   │   │   ├── auth-choice-step.tsx - Step 0: Login vs guest decision
│   │   │   ├── service-selection-step.tsx - Step 1: Service type and configuration
│   │   │   ├── date-time-step.tsx - Step 2: Pickup date and time window
│   │   │   ├── address-step.tsx - Step 3: Pickup and delivery addresses
│   │   │   ├── customer-info-step.tsx - Step 4: Guest info (skipped if authenticated)
│   │   │   └── review-payment-step.tsx - Step 5: Review + Stripe payment processing
│   │   │
│   │   ├── dashboard/
│   │   │   ├── dashboard-overview.tsx - Customer stats, recent bookings, quick stats
│   │   │   ├── booking-history.tsx - Paginated booking list with search/filter
│   │   │   └── quick-actions.tsx - CTA buttons (Book Move, View Bookings, Settings)
│   │   │
│   │   ├── staff/
│   │   │   ├── index.ts - Staff component exports
│   │   │   ├── staff-login-form.tsx - Staff authentication form
│   │   │   ├── staff-layout.tsx - Staff area sidebar layout with navigation
│   │   │   ├── staff-dashboard-overview.tsx - Staff metrics and pending actions
│   │   │   ├── booking-management.tsx - Booking list with advanced filters
│   │   │   ├── booking-calendar.tsx - Calendar view with day detail modal
│   │   │   ├── booking-detail-modal.tsx - Quick booking view modal
│   │   │   └── customer-management.tsx - Customer list with VIP filtering
│   │   │
│   │   ├── marketing/
│   │   │   ├── index.ts - Marketing component exports
│   │   │   ├── hero-section.tsx - Homepage hero with background and CTA
│   │   │   ├── service-showcase.tsx - Service type cards grid
│   │   │   ├── how-it-works-section.tsx - 3-step process explanation
│   │   │   ├── what-we-transport-section.tsx - Transport items showcase
│   │   │   ├── service-areas-section.tsx - Geographic coverage description
│   │   │   └── testimonials-section.tsx - Customer testimonials
│   │   │
│   │   ├── layout/
│   │   │   └── main-layout.tsx - Global header/footer wrapper, auth-aware navigation
│   │   │
│   │   ├── providers/
│   │   │   └── query-provider.tsx - TanStack Query client provider wrapper
│   │   │
│   │   └── ui/
│   │       ├── index.ts - UI component exports
│   │       ├── button.tsx - Variant-based button (primary/secondary/outline/ghost)
│   │       ├── input.tsx - Form input with label, error, masking, validation
│   │       ├── card.tsx - Card container with Header/Content/Footer subcomponents
│   │       ├── modal.tsx - Headless UI modal with sizes and transitions
│   │       └── select.tsx - Styled select dropdown with options array
│   │
│   ├── hooks/
│   │   └── use-click-away.ts - Click outside detector for dropdowns/modals
│   │
│   ├── lib/
│   │   ├── api-client.ts - Axios instance with CSRF/session interceptors
│   │   ├── query-client.ts - TanStack Query configuration (staleTime, retry, etc.)
│   │   └── stripe.ts - Stripe.js singleton loader
│   │
│   ├── stores/
│   │   ├── auth-store.ts - Customer auth Zustand store (user, profile, login, logout)
│   │   ├── staff-auth-store.ts - Staff auth Zustand store (staff user, permissions)
│   │   ├── booking-store.ts - Booking wizard Zustand store (steps, data, validation)
│   │   └── ui-store.ts - UI state Zustand store (sidebar, modals, notifications, theme)
│   │
│   ├── types/
│   │   └── index.ts - Shared TypeScript interfaces (User, Booking, Service types)
│   │
│   └── utils/
│       └── cn.ts - Class name merger utility (clsx + tailwind-merge)
│
├── public/
│   └── assets/
│       └── images/ - Marketing images (hero backgrounds, transport items)
│
├── Configuration Files:
├── next.config.ts - Next.js configuration (env vars, image domains, security headers)
├── tailwind.config.js - Tailwind theme (colors: navy/gold/cream, fonts, container)
├── tsconfig.json - TypeScript compiler options (strict mode, path aliases)
├── package.json - Dependencies and build scripts
├── postcss.config.js - PostCSS plugins (Tailwind + Autoprefixer)
├── eslint.config.mjs - ESLint configuration
└── .env.local - Environment variables (API URL, Stripe key) [NOT IN REPO]
```

---

## SECTION 5: FEATURE-TO-FILE DEPENDENCY MAPS

### Feature: Customer Registration & Email Verification

**User Flow:**
1. User visits `/register` → Fills form → Submits
2. Backend creates inactive account → Sends verification email
3. User clicks email link → Redirects to `/verify-email?token=...`
4. Token validated → Account activated → Redirect to `/login`

**Files Involved:**
```
Pages:
  - app/register/page.tsx (registration form container)
  - app/verify-email/page.tsx (email verification handler)

Components:
  - components/auth/register-form.tsx (registration form logic)

Stores:
  - stores/auth-store.ts (register action)

Types:
  - types/index.ts (RegisterData interface)

API Client:
  - lib/api-client.ts (HTTP client)

Backend APIs:
  - POST /api/customer/auth/register/
  - POST /api/customer/auth/verify-email/
  - POST /api/customer/auth/resend-verification/
```

**To Modify:**
- Add field: Update RegisterForm component + backend serializer
- Change validation: Update RegisterForm validation + backend
- Customize email: Backend template only

---

### Feature: Guest Booking Flow (Complete)

**User Flow:**
1. User visits `/book` or clicks "Book Now"
2. BookingWizard opens in modal
3. User chooses "Continue as Guest"
4. Steps: Service → Date/Time → Addresses → Customer Info → Review/Payment
5. Booking created → Stripe payment → Confirmation

**Files Involved:**
```
Pages:
  - app/book/page.tsx (modal launcher)
  - app/page.tsx (homepage with Book Now button)

Components (Booking Wizard):
  - components/booking/booking-wizard.tsx (orchestrator)
  - components/booking/auth-choice-step.tsx (guest choice)
  - components/booking/service-selection-step.tsx (service selection)
  - components/booking/date-time-step.tsx (date/time selection)
  - components/booking/address-step.tsx (addresses)
  - components/booking/customer-info-step.tsx (guest info)
  - components/booking/review-payment-step.tsx (payment)

Stores:
  - stores/booking-store.ts (wizard state persistence)

Libraries:
  - lib/stripe.ts (Stripe.js loader)
  - lib/api-client.ts (HTTP client)

Types:
  - types/index.ts (BookingData, BookingAddress)

Backend APIs:
  - GET /api/public/services/ (service catalog)
  - POST /api/public/pricing-preview/ (dynamic pricing)
  - POST /api/public/guest-booking/ (create booking)
  - POST /api/payments/create-intent/ (Stripe PaymentIntent)
  - POST /api/payments/confirm/ (confirm payment)
```

**To Modify:**
- Add service type: Update ServiceSelectionStep + backend models
- Change wizard steps: Modify STEPS array in BookingWizard + add/remove step components
- Customize payment: Update ReviewPaymentStep Stripe integration
- Add field to booking: Update booking-store BookingData type + step components

---

### Feature: Authenticated Customer Booking Flow

**User Flow:**
1. Authenticated user clicks "Book Now"
2. BookingWizard opens, auto-skips to Step 1 (service selection)
3. Steps: Service → Date/Time → Addresses → Review/Payment (skip customer info)
4. Booking created with linked customer ID
5. Redirects to dashboard after confirmation

**Files Involved:**
```
All booking wizard files from Guest Booking PLUS:

Stores:
  - stores/auth-store.ts (user authentication state)

Components:
  - components/auth/user-menu.tsx (Book Now from menu)

Pages:
  - app/dashboard/page.tsx (dashboard with Book Now button)

Backend APIs:
  - POST /api/customer/bookings/create/ (authenticated booking endpoint)
  - GET /api/customer/dashboard/ (dashboard refresh after booking)
  - GET /api/customer/bookings/ (booking history refresh)
```

**Difference from Guest:**
- Uses `auth-store` to pre-fill customer data
- Calls authenticated booking endpoint
- Auto-skips Step 0 (auth choice) and Step 4 (customer info)
- Invalidates customer dashboard/bookings cache on success

---

### Feature: Customer Dashboard

**User Flow:**
1. User logs in → Redirects to `/dashboard`
2. Dashboard loads customer profile + booking summary
3. Displays stats, recent bookings, quick actions

**Files Involved:**
```
Pages:
  - app/dashboard/page.tsx (dashboard container)
  - app/dashboard/bookings/page.tsx (booking history page)

Components:
  - components/dashboard/dashboard-overview.tsx (main dashboard)
  - components/dashboard/booking-history.tsx (booking list)
  - components/dashboard/quick-actions.tsx (CTA buttons)
  - components/auth/user-menu.tsx (navigation)

Stores:
  - stores/auth-store.ts (user state)

Libraries:
  - lib/query-client.ts (TanStack Query config)
  - lib/api-client.ts (HTTP client)

Types:
  - types/index.ts (CustomerProfile, Booking)

Backend APIs:
  - GET /api/customer/dashboard/ (dashboard data)
  - GET /api/customer/bookings/ (booking list)
```

**To Modify:**
- Add metric: Update backend dashboard endpoint + DashboardOverview component
- Add quick action: Update QuickActions component
- Change booking display: Update BookingHistory component

---

### Feature: Staff Booking Management

**User Flow:**
1. Staff logs in → `/staff/dashboard`
2. Clicks "Bookings" → `/staff/bookings`
3. Filters bookings by status, date, search
4. Clicks booking → `/staff/bookings/{id}` for detail
5. Updates booking status or details

**Files Involved:**
```
Pages:
  - app/staff/login/page.tsx (staff login)
  - app/staff/dashboard/page.tsx (staff dashboard)
  - app/staff/bookings/page.tsx (booking list)
  - app/staff/bookings/[id]/page.tsx (booking detail/edit)

Components:
  - components/staff/staff-login-form.tsx (login form)
  - components/staff/staff-layout.tsx (sidebar navigation)
  - components/staff/staff-dashboard-overview.tsx (metrics)
  - components/staff/booking-management.tsx (booking list)

Stores:
  - stores/staff-auth-store.ts (staff authentication)

Libraries:
  - lib/api-client.ts (HTTP client)

Types:
  - types/index.ts (StaffProfile, Booking)

Backend APIs:
  - POST /api/staff/auth/login/ (staff login)
  - GET /api/staff/dashboard/ (staff metrics)
  - GET /api/staff/bookings/ (booking list with filters)
  - GET /api/staff/bookings/{id}/ (booking detail)
  - PATCH /api/staff/bookings/{id}/ (update booking)
```

**To Modify:**
- Add filter: Update BookingManagement component + backend query params
- Add bulk action: Update BookingManagement with selection logic
- Modify booking fields: Update booking detail page + backend serializer

---

### Feature: Stripe Payment Integration

**User Flow:**
1. User completes booking wizard → ReviewPaymentStep
2. Frontend creates booking with `create_payment_intent: true`
3. Backend creates booking + Stripe PaymentIntent
4. Frontend receives `client_secret`
5. Stripe Elements loads → User enters card → Submits
6. Stripe processes payment → Webhook confirms to backend
7. Frontend shows confirmation

**Files Involved:**
```
Components:
  - components/booking/review-payment-step.tsx (payment UI)

Libraries:
  - lib/stripe.ts (Stripe.js loader)
  - lib/api-client.ts (HTTP client)

External:
  - @stripe/stripe-js (Stripe SDK)
  - @stripe/react-stripe-js (React components)

Types:
  - types/index.ts (BookingResponse with payment)

Backend APIs:
  - POST /api/customer/bookings/create/ OR /api/public/guest-booking/
  - POST /api/payments/create-intent/ (called by backend)
  - POST /api/payments/confirm/ (after Stripe confirmation)
  - POST /api/payments/webhook/ (Stripe → backend webhook)

Environment:
  - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (Stripe public key)
```

**Payment Flow Sequence:**
1. ReviewPaymentStep → `useMutation` booking creation
2. Backend → Creates booking + `stripe.PaymentIntent.create()`
3. Backend → Returns `{ booking, payment: { client_secret } }`
4. Frontend → `setClientSecret(data.payment.client_secret)`
5. Frontend → Show Stripe Elements with PaymentElement
6. User → Enters card details
7. Frontend → `stripe.confirmPayment({ elements, confirmParams })`
8. Stripe → Processes payment
9. Stripe → Calls webhook `/api/payments/webhook/`
10. Backend → Updates booking status to 'paid'
11. Frontend → Redirects to confirmation

**To Modify:**
- Change payment provider: Replace Stripe integration in ReviewPaymentStep + backend
- Add payment method: Update Stripe Elements configuration
- Custom confirmation page: Update ReviewPaymentStep success state

---

### Feature: Staff Customer Management

**User Flow:**
1. Staff navigates to `/staff/customers`
2. Views customer list with search/filter
3. Clicks customer → `/staff/customers/{id}`
4. Views customer profile + booking history
5. Updates internal notes

**Files Involved:**
```
Pages:
  - app/staff/customers/page.tsx (customer list)
  - app/staff/customers/[id]/page.tsx (customer detail)

Components:
  - components/staff/customer-management.tsx (list with filters)
  - components/staff/staff-layout.tsx (navigation)

Stores:
  - stores/staff-auth-store.ts (staff permissions)

Libraries:
  - lib/api-client.ts (HTTP client)

Types:
  - types/index.ts (CustomerProfile, Booking)

Backend APIs:
  - GET /api/staff/customers/ (customer list)
  - GET /api/staff/customers/{id}/ (customer detail)
  - PATCH /api/staff/customers/{id}/notes/ (update notes)
```

---

## SECTION 6: STATE MANAGEMENT ARCHITECTURE

### Zustand Store Patterns

**Store Creation Pattern:**
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface State {
  // State properties
}

interface Actions {
  // Action methods
}

export const useStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      // Initial state
      
      // Actions
      actionName: () => set((state) => ({ ... })),
    }),
    {
      name: 'storage-key',
      partialize: (state) => ({ /* what to persist */ }),
    }
  )
);
```

---

### auth-store.ts (Customer Authentication)

**Full State Structure:**
```typescript
interface AuthState {
  user: DjangoUser | null;
  customerProfile: CustomerProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthActions {
  setAuth: (user, profile) => void;
  clearAuth: () => void;
  setLoading: (loading) => void;
  updateProfile: (updates) => void;
  login: (email, password) => Promise<Result>;
  register: (data) => Promise<Result>;
  logout: () => Promise<void>;
  validateSession: () => Promise<boolean>;
  clearSessionIfIncognito: () => void;
  secureReset: () => void;
}
```

**Persistence Configuration:**
```typescript
{
  name: 'totetaxi-auth',
  version: 2,
  partialize: (state) => ({
    user: state.user,
    customerProfile: state.customerProfile,
    isAuthenticated: state.isAuthenticated
    // isLoading NOT persisted
  })
}
```

**Key Actions:**

**login(email, password):**
1. Set isLoading: true
2. Call `apiClient.post('/api/customer/auth/login/', { email, password })`
3. If success:
   - Store session_id + csrf_token in localStorage (mobile fallback)
   - Call `setAuth(user, customer_profile)`
   - Return { success: true, user }
4. If error:
   - Handle email verification requirement
   - Return { success: false, error: message }

**logout():**
1. Call `apiClient.post('/api/customer/auth/logout/')`
2. Call `clearAuth()`
3. Clear all localStorage keys (totetaxi-*)
4. Clear TanStack Query cache

**validateSession():**
1. If not authenticated, return false
2. Call `apiClient.get('/api/customer/auth/user/')`
3. If 200, return true
4. If 401, call `clearAuth()`, return false

---

### staff-auth-store.ts (Staff Authentication)

**Full State Structure:**
```typescript
interface StaffAuthState {
  user: StaffUser | null;
  staffProfile: StaffProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface StaffAuthActions {
  setAuth: (user, profile) => void;
  clearAuth: () => void;
  setLoading: (loading) => void;
  login: (username, password) => Promise<Result>;
  logout: () => Promise<void>;
  validateSession: () => Promise<boolean>;
  secureReset: () => void;
}
```

**StaffProfile Type:**
```typescript
interface StaffProfile {
  id: string;
  role: 'staff' | 'admin';
  department: string;
  full_name: string;
  permissions: {
    can_approve_refunds: boolean;
    can_manage_staff: boolean;
    can_view_financial_reports: boolean;
  };
}
```

**Persistence:**
```typescript
{
  name: 'totetaxi-staff-auth',
  version: 2,
  partialize: (state) => ({
    user: state.user,
    staffProfile: state.staffProfile,
    isAuthenticated: state.isAuthenticated
  })
}
```

**Security Feature:**
- `logout()` also calls customer auth store's `clearAuth()` to prevent cross-contamination
- Separate CSRF token management for staff endpoints

---

### booking-store.ts (Wizard State)

**Full State Structure:**
```typescript
interface BookingWizardState {
  currentStep: number;
  isLoading: boolean;
  bookingData: BookingData;
  errors: Record<string, string>;
  isBookingComplete: boolean;
  completedBookingNumber?: string;
  userId?: string;
  isGuestMode: boolean;
  lastResetTimestamp?: number;
}

interface BookingWizardActions {
  setCurrentStep: (step) => void;
  nextStep: () => void;
  previousStep: () => void;
  updateBookingData: (data) => void;
  setLoading: (loading) => void;
  setError: (field, message) => void;
  clearError: (field) => void;
  clearErrors: () => void;
  resetWizard: () => void;
  secureReset: () => void;
  canProceedToStep: (step) => boolean;
  setBookingComplete: (bookingNumber) => void;
  initializeForUser: (userId?, isGuest?) => void;
}
```

**BookingData Type:**
```typescript
interface BookingData {
  service_type?: 'mini_move' | 'standard_delivery' | 'specialty_item' | 'blade_transfer';
  mini_move_package_id?: string;
  package_type?: 'petite' | 'standard' | 'full';
  include_packing?: boolean;
  include_unpacking?: boolean;
  standard_delivery_item_count?: number;
  is_same_day_delivery?: boolean;
  specialty_item_ids?: string[];
  blade_airport?: 'JFK' | 'EWR';
  blade_flight_date?: string;
  blade_flight_time?: string;
  blade_bag_count?: number;
  blade_ready_time?: string;
  pickup_date?: string;
  pickup_time?: 'morning' | 'morning_specific' | 'no_time_preference';
  specific_pickup_hour?: number;
  pickup_address?: BookingAddress;
  delivery_address?: BookingAddress;
  customer_info?: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  special_instructions?: string;
  coi_required?: boolean;
  is_outside_core_area?: boolean;
  pricing_data?: PricingData;
}
```

**Persistence Configuration:**
```typescript
{
  name: 'totetaxi-booking-wizard',
  version: 4,
  migrate: (persistedState, version) => {
    // Reset if version mismatch or state too old (>24h)
  },
  partialize: (state) => ({
    bookingData: {
      ...state.bookingData,
      customer_info: undefined // SECURITY: Don't persist sensitive guest data
    },
    currentStep: state.currentStep,
    isBookingComplete: state.isBookingComplete,
    completedBookingNumber: state.completedBookingNumber,
    userId: state.userId,
    isGuestMode: state.isGuestMode,
    lastResetTimestamp: state.lastResetTimestamp
  })
}
```

**Step Validation Logic (canProceedToStep):**
```typescript
canProceedToStep: (step) => {
  switch (step) {
    case 1: // Service Selection
      return true;
    case 2: // Date/Time
      if (service === 'mini_move') return !!package_id;
      return !!service_type;
    case 3: // Addresses
      if (isBlade) return !!blade_flight_date;
      return !!pickup_date;
    case 4: // Customer Info
      return !!pickup_address && !!delivery_address;
    case 5: // Review
      if (isGuestMode) return !!customer_info?.email;
      return !!pickup_address && !!delivery_address;
    default:
      return false;
  }
}
```

**Auto-Reset Conditions:**
- User ID changes (prevent guest/auth data mixing)
- State age > 24 hours (TTL expired)
- Booking completed (start fresh)

---

### ui-store.ts (UI State)

**Full State Structure:**
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

interface UIActions {
  toggleSidebar: () => void;
  setSidebar: (open) => void;
  setTheme: (theme) => void;
  openModal: (modal) => void;
  closeModal: (modal) => void;
  addNotification: (notification) => void;
  removeNotification: (id) => void;
  clearNotifications: () => void;
  secureReset: () => void;
}
```

**Notification Type:**
```typescript
interface Notification {
  id: string; // Auto-generated
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number; // Auto-dismiss ms (default: 5000)
}
```

**Security Features:**
- Input sanitization on `addNotification` (message truncated to 500 chars)
- Max 10 notifications stored (prevent memory issues)
- Theme validation (only 'light' | 'dark' allowed)
- Modal key validation (only known modals allowed)

**No Persistence** - All UI state resets on page reload

---

### TanStack Query Configuration

**Query Client Setup** (`lib/query-client.ts`):
```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10,   // 10 minutes (was cacheTime)
      retry: 1,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
    },
    mutations: {
      retry: 0, // Don't retry mutations
    },
  },
});
```

**Query Key Hierarchies:**
```typescript
// Customer queries
['customer', 'dashboard', userId]
['customer', 'bookings', userId, filters]
['customer', 'bookings', userId, bookingId]
['customer', 'profile', userId]

// Staff queries
['staff', 'dashboard']
['staff', 'bookings', filters]
['staff', 'bookings', bookingId]
['staff', 'customers', filters]
['staff', 'customers', customerId]

// Public queries
['public', 'services']
['public', 'pricing-preview']
```

**Invalidation Patterns:**
```typescript
// After customer booking creation
queryClient.invalidateQueries({ queryKey: ['customer', 'dashboard'] });
queryClient.invalidateQueries({ queryKey: ['customer', 'bookings'] });

// After staff booking update
queryClient.invalidateQueries({ queryKey: ['staff', 'bookings'] });
queryClient.invalidateQueries({ queryKey: ['staff', 'dashboard'] });

// After profile update
queryClient.invalidateQueries({ queryKey: ['customer', 'profile'] });
```

---

## SECTION 7: ROUTING & NAVIGATION ARCHITECTURE

### Route Protection Implementation

**Customer Route Protection Pattern:**
```typescript
// Example: app/dashboard/page.tsx
export default function DashboardPage() {
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

  return <DashboardContent />;
}
```

**Staff Route Protection Pattern:**
```typescript
// Example: app/staff/dashboard/page.tsx
export default function StaffDashboardPage() {
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

  return (
    <StaffLayout>
      <StaffDashboardContent />
    </StaffLayout>
  );
}
```

---

### Navigation State Management

**MainLayout Navigation (Customer):**
```typescript
// Public (unauthenticated):
- Services, About, FAQ, Contact
- Sign In button → /login
- Book Now button → /book

// Authenticated:
- Services, About, FAQ, Contact
- Dashboard link → /dashboard
- UserMenu dropdown:
  - Dashboard → /dashboard
  - My Bookings → /dashboard/bookings
  - Settings → /settings
  - Logout → Clear auth, redirect /
```

**StaffLayout Navigation:**
```typescript
// Sidebar Menu:
- Dashboard → /staff/dashboard
- Calendar → /staff/calendar
- Bookings → /staff/bookings
- Customers → /staff/customers
- Logistics → /staff/logistics
- Reports → /staff/reports

// Active state: usePathname() for highlighting current route
```

---

### Dynamic Routes

**Booking Detail (Staff):**
```
Route: /staff/bookings/[id]/page.tsx
Params: const params = useParams(); const bookingId = params.id;
Query: useQuery({ queryKey: ['staff', 'booking', bookingId] })
```

**Customer Detail (Staff):**
```
Route: /staff/customers/[id]/page.tsx
Params: const customerId = params.id;
Query: useQuery({ queryKey: ['staff', 'customer', customerId] })
```

---

## SECTION 8: FORM HANDLING & VALIDATION REFERENCE

### React Hook Form + Zod Integration Pattern

**Step 1: Define Zod Schema**
```typescript
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;
```

**Step 2: Setup React Hook Form**
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const { 
  register, 
  handleSubmit, 
  formState: { errors, isSubmitting } 
} = useForm<LoginFormData>({
  resolver: zodResolver(loginSchema),
  defaultValues: { email: '', password: '' }
});
```

**Step 3: Register Inputs**
```typescript
<Input
  {...register('email')}
  label="Email"
  type="email"
  error={errors.email?.message}
/>

<Input
  {...register('password')}
  label="Password"
  type="password"
  error={errors.password?.message}
/>
```

**Step 4: Handle Submission**
```typescript
const onSubmit = handleSubmit(async (data) => {
  try {
    const result = await authStore.login(data.email, data.password);
    if (result.success) {
      router.push('/dashboard');
    } else {
      setError(result.error);
    }
  } catch (err) {
    setError('An unexpected error occurred');
  }
});

<form onSubmit={onSubmit}>...</form>
```

---

### Input Masking Implementation

**Phone Number Masking:**
```typescript
// Input.tsx
const formatPhoneNumber = (value: string) => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length >= 10) {
    return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6,10)}`;
  }
  if (cleaned.length >= 6) {
    return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length >= 3) {
    return `(${cleaned.slice(0,3)}) ${cleaned.slice(3)}`;
  }
  return cleaned;
};

// Usage in Input component:
if (mask === 'phone') {
  newValue = formatPhoneNumber(newValue);
}
```

**ZIP Code Masking:**
```typescript
const formatZipCode = (value: string) => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length > 5) {
    return `${cleaned.slice(0,5)}-${cleaned.slice(5,9)}`;
  }
  return cleaned;
};
```

---

### Real-Time Validation

**Email Validation:**
```typescript
const validateEmail = (email: string) => {
  if (!email) return '';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }
  if (email.includes('..')) {
    return 'Email cannot contain consecutive dots';
  }
  if (email.length > 254) {
    return 'Email address is too long';
  }
  return '';
};

// Usage in Input:
if (realTimeValidation && type === 'email') {
  const validationErr = validateEmail(newValue);
  setValidationError(validationErr);
}
```

---

### Form Error Handling

**Client-Side Errors:**
```typescript
// Zod validation errors (automatic)
<Input 
  {...register('email')} 
  error={errors.email?.message}
/>
```

**Server-Side Errors:**
```typescript
// API returns: { error: "message", field_errors: { email: ["Invalid"] } }

useMutation({
  mutationFn: submitForm,
  onError: (error: AxiosError) => {
    const data = error.response?.data as any;
    if (data.field_errors) {
      Object.entries(data.field_errors).forEach(([field, errors]) => {
        setError(field, { message: (errors as string[]).join(', ') });
      });
    } else {
      // General error toast
      uiStore.addNotification({ type: 'error', message: data.error });
    }
  }
});
```

---

## SECTION 9: UI COMPONENT SYSTEM DOCUMENTATION

### Tailwind Configuration Deep Dive

**Color System:**
```javascript
// tailwind.config.js
colors: {
  navy: {
    // Light to dark scale
    50: '#f0f4f8',  // Backgrounds
    100: '#d9e2ec', // Light borders
    600: '#486581', // Interactive elements
    700: '#334e68', // Primary text
    900: '#1a365d', // Headers, emphasis
  },
  gold: {
    500: '#d69e2e', // Accent color
    600: '#b7791f', // Hover states
  },
  cream: {
    50: '#fefcf3',  // Page backgrounds
    100: '#fef7e0', // Card backgrounds
  }
}
```

**Typography:**
```javascript
fontFamily: {
  serif: ['var(--font-playfair)', 'serif'],  // Headings
  sans: ['var(--font-inter)', 'sans-serif'], // Body text
}

// Font loading (app/layout.tsx):
import { Inter, Playfair_Display } from 'next/font/google';

const inter = Inter({ 
  subsets: ["latin"], 
  variable: '--font-inter' 
});

const playfair = Playfair_Display({ 
  subsets: ["latin"], 
  variable: '--font-playfair' 
});

// Applied via className variables
```

---

### Component Variant System (CVA Pattern)

**Example: Button Component**
```typescript
// Define variant config object
const buttonVariants = {
  variant: {
    primary: 'bg-navy-900 text-white hover:bg-navy-800 focus:ring-navy-500',
    secondary: 'bg-gold-500 text-navy-900 hover:bg-gold-600 focus:ring-gold-400',
    outline: 'border-2 border-navy-900 text-navy-900 hover:bg-navy-50',
    ghost: 'text-navy-900 hover:bg-navy-100',
  },
  size: {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  },
  rounded: {
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  }
};

// Merge with cn() utility
return (
  <button
    className={cn(
      baseStyles,
      buttonVariants.variant[variant],
      buttonVariants.size[size],
      buttonVariants.rounded[rounded],
      className // Allow overrides
    )}
  >
    {children}
  </button>
);
```

**Benefits:**
- Easy to modify: Change variant object, not JSX
- Type-safe: TypeScript infers allowed values
- Composable: Combine multiple variant dimensions
- Extensible: Accept className prop for one-offs

---

### Responsive Design Patterns

**Breakpoint Usage:**
```typescript
// Mobile-first approach
<div className="
  text-sm       // Base (mobile)
  md:text-base  // Tablet+
  lg:text-lg    // Desktop+
">
```

**Layout Shifts:**
```typescript
// Booking wizard
<div className="
  grid
  grid-cols-1     // Mobile: Single column
  md:grid-cols-2  // Tablet: Two columns
  lg:grid-cols-3  // Desktop: Three columns
  gap-4
">
```

**Sidebar Toggle:**
```typescript
// StaffLayout
<div className="
  hidden          // Hidden on mobile
  lg:flex         // Show on desktop
  lg:w-64         // Fixed width on desktop
">
  <Sidebar />
</div>
```

---

### Accessibility Features

**Focus States:**
```typescript
// All interactive elements
focus:outline-none 
focus:ring-2 
focus:ring-navy-500 
focus:ring-offset-2
```

**ARIA Labels:**
```typescript
// Modal (Headless UI automatically adds)
<Dialog.Title>Modal Title</Dialog.Title>
<Dialog.Description>Modal description</Dialog.Description>

// Buttons
<button aria-label="Close menu">×</button>
```

**Keyboard Navigation:**
- Tab order follows visual layout
- Esc closes modals
- Enter submits forms

---

## SECTION 10: DEVELOPMENT PATTERNS & CONVENTIONS

### Code Organization Best Practices

**Import Grouping:**
```typescript
// 1. React/Next.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 2. External libraries
import { useQuery, useMutation } from '@tanstack/react-query';

// 3. Internal components
import { Button, Card } from '@/components/ui';
import { BookingWizard } from '@/components/booking';

// 4. Stores/libs
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api-client';

// 5. Types
import type { Booking, CustomerProfile } from '@/types';
```

**Component File Structure:**
```typescript
// 1. Imports
import { ... } from '...';

// 2. Types/Interfaces
interface ComponentProps {
  // ...
}

// 3. Constants (if needed)
const CONSTANTS = { ... };

// 4. Component
export function Component({ props }: ComponentProps) {
  // Hooks
  const store = useStore();
  const [state, setState] = useState();
  
  // Effects
  useEffect(() => { ... }, []);
  
  // Handlers
  const handleAction = () => { ... };
  
  // Render
  return <div>...</div>;
}

// 5. Subcomponents (if small and internal)
function SubComponent() { ... }
```

---

### Common Patterns Library

**Protected Route:**
```typescript
export default function ProtectedPage() {
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

  return <PageContent />;
}
```

**Data Fetching with Query:**
```typescript
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['resource', id],
  queryFn: async () => {
    const response = await apiClient.get(`/api/resource/${id}/`);
    return response.data;
  },
  enabled: !!id, // Only fetch if id exists
  staleTime: 1000 * 60 * 5, // 5 minutes
});

if (isLoading) return <Skeleton />;
if (error) return <ErrorCard onRetry={refetch} />;
return <Content data={data} />;
```

**Data Mutation with Optimistic Updates:**
```typescript
const mutation = useMutation({
  mutationFn: async (data) => {
    return await apiClient.post('/api/resource/', data);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['resources'] });
    uiStore.addNotification({ type: 'success', message: 'Created successfully' });
  },
  onError: (error: AxiosError) => {
    const message = error.response?.data?.error || 'Failed to create';
    uiStore.addNotification({ type: 'error', message });
  }
});
```

---

### Adding Features Checklist

**New API Endpoint Integration:**
1. ✅ Check backend README.md for API specification
2. ✅ Add TypeScript interface to `types/index.ts`
3. ✅ Create query/mutation in component or custom hook
4. ✅ Handle loading, error, success states
5. ✅ Invalidate related queries after mutations
6. ✅ Test with various data scenarios

**New UI Component:**
1. ✅ Determine if primitive (ui/) or feature-specific
2. ✅ Define Props interface with TypeScript
3. ✅ Use existing UI primitives for consistency
4. ✅ Follow variant pattern if multiple styles needed
5. ✅ Add to index.ts exports
6. ✅ Document usage in Storybook (if implemented)

**New Page Route:**
1. ✅ Create page.tsx in appropriate app/ directory
2. ✅ Add route protection if needed (useEffect pattern)
3. ✅ Wrap with appropriate layout (MainLayout or StaffLayout)
4. ✅ Add navigation link in header/sidebar
5. ✅ Add to route list in this documentation

---

### Environment Variable Management

**Required Variables:**
```bash
# .env.local (NOT committed to Git)
NEXT_PUBLIC_API_URL=http://localhost:8005
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Production Variables:**
```bash
NEXT_PUBLIC_API_URL=https://api.totetaxi.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

**Usage in Code:**
```typescript
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

// Validation
if (!stripeKey) {
  throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set');
}
```

**Important:** All client-accessible env vars MUST start with `NEXT_PUBLIC_`

---

### Performance Optimization Patterns

**TanStack Query Optimization:**
```typescript
// Prefetch data on hover
const prefetchBooking = (bookingId: string) => {
  queryClient.prefetchQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => apiClient.get(`/api/bookings/${bookingId}/`),
  });
};

<Link 
  href={`/bookings/${id}`}
  onMouseEnter={() => prefetchBooking(id)}
>
```

**Lazy Loading Components:**
```typescript
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(
  () => import('@/components/heavy-component'),
  { loading: () => <Skeleton /> }
);
```

**Debounced Search:**
```typescript
import { useMemo } from 'react';
import debounce from 'lodash/debounce';

const debouncedSearch = useMemo(
  () => debounce((query: string) => {
    // Trigger search
  }, 500),
  []
);

<Input onChange={(e) => debouncedSearch(e.target.value)} />
```

---

### Error Boundary Pattern (Future)

```typescript
// components/error-boundary.tsx
import React from 'react';

class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

---

## AI EXECUTIVE FUNCTION VALIDATION

This documentation enables the AI to:

✅ **Understand Architecture** - Complete tech stack + design philosophy
✅ **Navigate Files** - Full file tree with detailed purposes
✅ **Identify Dependencies** - Comprehensive feature-to-file maps with flow descriptions
✅ **Request Context** - Know exactly which files to request from frontend_snapshot.txt
✅ **Integrate Backend** - Detailed API mapping with request/response specs
✅ **Extend Features** - Step-by-step patterns for adding features
✅ **Predict Impact** - Component interface documentation shows all dependencies
✅ **Reason About State** - Detailed store architecture with action flows

**Strategic Questions Now Answerable:**
- "How do I add AMEX support to payments?" → ReviewPaymentStep + Stripe config
- "What files implement customer authentication?" → Complete auth flow with all files listed
- "How do I add a new step to the booking wizard?" → Modify STEPS array + create new step component
- "Where is pricing calculated?" → ServiceSelectionStep + pricing-preview API
- "How do I modify the staff sidebar?" → StaffLayout navigation array
- "What happens when a booking is created?" → Complete flow from wizard to confirmation

---

## TROUBLESHOOTING GUIDE

### Common Issues

**Auth not persisting on mobile:**
- Check: localStorage 'totetaxi-auth' and 'totetaxi-session-id'
- Solution: api-client.ts uses X-Session-Id header fallback

**Booking wizard loses data:**
- Check: localStorage 'totetaxi-booking-wizard'
- Check: lastResetTimestamp (24h TTL)
- Solution: Wizard auto-resets if stale or user changes

**CSRF errors on mutations:**
- Check: localStorage 'totetaxi-csrf-token'
- Check: apiClient interceptor fetching token
- Solution: Clear localStorage, re-login to get fresh token

**TanStack Query stale data:**
- Check: Query keys include user-specific data
- Solution: Invalidate queries after mutations

---

## REGENERATION PROTOCOL

To regenerate this documentation from updated frontend_snapshot.txt:

1. Analyze frontend_snapshot.txt (13,000 lines - source of truth)
2. Extract following Strategic Extraction Protocol in formula document
3. Target 20% of snapshot size (~2,600 lines)
4. Focus on interfaces, dependencies, flows - NOT implementations
5. Cross-reference backend README.md for API specs
6. Output strategic navigation enabling intelligent file requests

**This is a magnifying glass into frontend_snapshot.txt** - providing complete architectural understanding without reproducing code.

---

**END LIVING DOCUMENTATION v2.0**
**Lines: ~2,600 | Ratio: 20% of 13,000-line frontend_snapshot.txt ✅**
```

**Final Documentation Stats:**
- **Target**: 2,600 lines (20% of 13,000)
- **Achieved**: ~2,600 lines
- **Expansion areas**:
  - More detailed component interface docs
  - Complete state management flows
  - Comprehensive API integration tables
  - Detailed code patterns and examples
  - Troubleshooting guide
  - Step-by-step feature addition guides

This expanded version provides 20% coverage while maintaining the strategic navigation focus!