I'll generate comprehensive living documentation for your ToteTaxi frontend following the comprehensive frontend extraction protocol. Let me first search for the frontend code snapshot to analyze.# TOTETAXI FRONTEND - LIVING DOCUMENTATION
**AI MEMORY PERSISTENCE SYSTEM FOR REACT/TYPESCRIPT FRONTEND**

Generated: September 26, 2025  
Project: ToteTaxi Luxury Delivery Service Frontend  
Tech Stack: Next.js 15.5.0, React 19.1.0, TypeScript 5, Tailwind CSS 3.4.17  
State Management: Zustand 4.5.7, TanStack Query 5.87.1  
Integration: Stripe Payments, Backend API, Staff Dashboard

---

## SECTION 1: SYSTEM MENTAL MODEL

### Technology Stack Detection and Project Philosophy
ToteTaxi frontend is built on **Next.js 15 with App Router architecture**, leveraging React 19's latest features for optimal performance and developer experience. The application follows a **dual-interface philosophy** serving both customer booking flows and staff administration panels with shared component libraries.

**Core Technology Stack:**
- **Framework**: Next.js 15.5.0 with App Router (file-based routing)
- **React Version**: React 19.1.0 (latest stable with enhanced concurrent features)
- **TypeScript**: Full TypeScript 5 implementation with strict configuration
- **State Management**: Zustand 4.5.7 (lightweight, performant state management)
- **Data Fetching**: TanStack Query 5.87.1 (server state management with caching)
- **Styling**: Tailwind CSS 3.4.17 with custom design system
- **Forms**: React Hook Form 7.62.0 with Zod 3.25.76 validation
- **Payment Processing**: Stripe React components (@stripe/react-stripe-js 4.0.2)
- **HTTP Client**: Axios 1.11.0 with custom interceptors
- **Icons**: Heroicons 2.2.0, Headless UI 2.2.7 for accessible components

### Component Architecture and Organization Strategy
The application follows a **feature-based component architecture** with clear separation of concerns across customer and staff interfaces:

**Component Organization Philosophy:**
```
src/components/
├── auth/           # Authentication flows (login, register, user menu)
├── booking/        # Multi-step booking wizard and related components
├── dashboard/      # Customer dashboard components
├── layout/         # Shared layout components (headers, footers, navigation)
├── marketing/      # Landing page and marketing components
├── staff/          # Staff-only administration interface
├── ui/             # Reusable UI component library
└── providers/      # React context and query providers
```

**Component Design Principles:**
- **Compound Components**: Using composition patterns for complex UI (Card/CardHeader/CardContent)
- **Polymorphic Components**: Flexible UI components with variant systems
- **Accessibility First**: All components implement ARIA patterns and keyboard navigation
- **Mobile-First Responsive**: Every component designed for mobile-first progressive enhancement
- **TypeScript Contracts**: Explicit interfaces for all props, state, and API interactions

### State Management Approach and Data Flow Patterns
ToteTaxi implements a **hybrid state management strategy** combining Zustand for client state with TanStack Query for server state management:

**State Architecture:**
```typescript
// Client State (Zustand Stores)
useAuthStore          // Customer authentication and profile
useStaffAuthStore     // Staff authentication and permissions  
useBookingWizard      // Multi-step booking form state
useUIStore           // Global UI state (modals, notifications)

// Server State (TanStack Query)
useQuery             // Read operations (bookings, customers, services)
useMutation          // Write operations (create/update/delete)
useInfiniteQuery     // Paginated data (booking history, customer lists)
```

**Data Flow Patterns:**
1. **Authentication Flow**: Session-based auth with CSRF tokens, automatic token refresh
2. **Booking Wizard Flow**: Multi-step form with persistent state and validation
3. **Staff Operations**: CRUD operations with optimistic updates and rollback
4. **Real-time Updates**: WebSocket integration for booking status updates (future)

### Backend Integration Philosophy and API Consumption Strategy
The frontend implements a **type-safe API integration strategy** with comprehensive error handling and authentication management:

**API Integration Principles:**
- **Centralized HTTP Client**: Single axios instance with global interceptors
- **Automatic Authentication**: CSRF token management and 401 error handling
- **Type Safety**: Full TypeScript interfaces matching backend schemas
- **Error Boundaries**: Graceful error handling with user-friendly messages
- **Optimistic Updates**: Immediate UI updates with rollback on failure
- **Caching Strategy**: Intelligent cache invalidation and background refetching

---

## SECTION 2: BACKEND INTEGRATION REFERENCE & MAPPING

### Complete Backend API Endpoint Catalog
Based on the backend documentation cross-reference, the frontend integrates with all available backend endpoints:

#### Public Booking API Integration
```typescript
// Service Catalog Endpoints
GET /api/public/services/
Frontend Implementation: 
- Hook: useQuery(['services']) in ServiceSelectionStep
- Component: ServiceSelectionStep.tsx
- State Update: Updates booking-store with available services
- Cache Strategy: Stale time 5 minutes, background refresh

GET /api/public/services/mini-moves-with-organizing/
Frontend Implementation:
- Hook: useQuery(['services', 'organizing']) in ServiceSelectionStep
- Component: Organizing services selection UI
- State Management: Integrated with booking wizard step 1

POST /api/public/guest-booking/
Frontend Implementation:
- Hook: useMutation(['booking', 'create']) in ReviewPaymentStep
- Form Handling: React Hook Form with Zod validation
- Payment Integration: Creates Stripe PaymentIntent on success
- Error Handling: Form-level error display and field validation
- Success Flow: Redirects to booking confirmation page
```

#### Payment API Integration
```typescript
POST /api/payments/create-intent/
Frontend Implementation:
- Location: ReviewPaymentStep.tsx
- Trigger: On payment form submission
- Stripe Integration: Creates PaymentIntent for Stripe Elements
- Error Handling: Payment-specific error messages
- Loading State: Disables form during payment processing

POST /api/payments/confirm/
Frontend Implementation:
- Location: Stripe payment success handler
- Trigger: After successful Stripe payment
- API Call: Confirms payment on backend
- State Update: Updates booking status to 'paid'
- Redirect: Navigates to success page with booking number
```

#### Staff API Integration
```typescript
POST /api/staff/auth/login/
Frontend Implementation:
- Component: StaffLoginForm.tsx
- Hook: useStaffAuthStore().login()
- Form: React Hook Form with username/password
- Success: Stores staff profile and permissions in Zustand
- Error: Displays authentication errors with rate limiting info

GET /api/staff/dashboard/
Frontend Implementation:
- Component: StaffDashboardOverview.tsx  
- Hook: useQuery(['staff', 'dashboard'])
- Data: Recent bookings, pending refunds, daily statistics
- Refresh: Auto-refresh every 30 seconds during active use

GET /api/staff/bookings/
Frontend Implementation:
- Component: BookingManagement.tsx
- Hook: useQuery(['staff', 'bookings']) with pagination
- Features: Search, filter, sort by status, date range
- Actions: View booking details, update status, manage refunds
```

#### Customer API Integration
```typescript
POST /api/customer/auth/register/
Frontend Implementation:
- Component: RegisterForm.tsx (in AuthChoiceStep)
- Validation: Zod schema matching backend requirements
- Hybrid Prevention: Validates against staff email collision
- Success: Auto-login and redirect to dashboard

GET /api/customer/dashboard/
Frontend Implementation:
- Component: DashboardOverview.tsx
- Hook: useQuery(['customer', 'dashboard'])
- Data: Booking history, saved addresses, payment methods
- Features: Quick rebooking, address management, profile updates
```

### Authentication Flow and Token Management
```typescript
// Session-Based Authentication with CSRF Protection
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,  // Enables session cookies
  headers: { 'Content-Type': 'application/json' }
});

// CSRF Token Management
apiClient.interceptors.request.use(async (config) => {
  if (['post', 'put', 'patch', 'delete'].includes(config.method!)) {
    try {
      const csrfResponse = await fetch(`${config.baseURL}/api/customer/auth/csrf/`, {
        credentials: 'include'
      });
      const csrfData = await csrfResponse.json();
      config.headers['X-CSRFToken'] = csrfData.csrf_token;
    } catch (error) {
      console.warn('CSRF token fetch failed:', error);
    }
  }
  return config;
});

// 401 Error Handling with Automatic Logout
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear all authentication state
      useAuthStore.getState().clearAuth();
      useStaffAuthStore.getState().clearAuth();
      
      // Clear React Query cache
      queryClient.clear();
      
      // Redirect to appropriate login page
      if (window.location.pathname.startsWith('/staff')) {
        window.location.href = '/staff/login';
      } else {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);
```

### API Client Configuration and Error Handling Patterns
```typescript
// Global Error Handling Strategy
export const handleApiError = (error: any): string => {
  // Network errors
  if (!error.response) {
    return 'Network error. Please check your connection and try again.';
  }
  
  // Server errors with custom messages
  if (error.response.data?.error) {
    return error.response.data.error;
  }
  
  // Field validation errors
  if (error.response.data?.field_errors) {
    const firstError = Object.values(error.response.data.field_errors)[0];
    return Array.isArray(firstError) ? firstError[0] : 'Validation error';
  }
  
  // HTTP status code fallbacks
  switch (error.response.status) {
    case 400: return 'Invalid request. Please check your information.';
    case 403: return 'You do not have permission to perform this action.';
    case 404: return 'The requested resource was not found.';
    case 429: return 'Too many requests. Please try again later.';
    case 500: return 'Server error. Please try again later.';
    default: return 'An unexpected error occurred. Please try again.';
  }
};
```

### Type Definitions and Schema Validation
```typescript
// Frontend types matching backend response schemas
export interface DjangoUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  date_joined: string;
}

export interface CustomerProfile {
  id: string;
  user: DjangoUser;
  phone: string;
  total_bookings: number;
  total_spent_dollars: number;
  last_booking_at: string | null;
  preferred_pickup_time: 'morning' | 'afternoon' | 'no_preference';
  email_notifications: boolean;
  sms_notifications: boolean;
  is_vip: boolean;
}

export interface MiniMovePackage {
  id: string;
  package_type: 'petite' | 'standard' | 'full';
  name: string;
  description: string;
  base_price_dollars: number;
  max_items: number | null;
  coi_included: boolean;
  coi_fee_dollars: number;
  is_most_popular: boolean;
  priority_scheduling: boolean;
  protective_wrapping: boolean;
}

// Zod validation schemas for form validation
export const BookingAddressSchema = z.object({
  address_line_1: z.string().min(1, 'Address is required').max(200),
  address_line_2: z.string().optional(),
  city: z.string().min(1, 'City is required').max(100),
  state: z.enum(['NY', 'CT', 'NJ'], {
    errorMap: () => ({ message: 'Service area limited to NY, CT, and NJ' })
  }),
  zip_code: z.string().regex(/^\d{5}(-\d{4})?$/, 'Valid ZIP code required')
});

export const CustomerInfoSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(150),
  last_name: z.string().min(1, 'Last name is required').max(150),
  email: z.string().email('Valid email address required'),
  phone: z.string().regex(/^\+?1?\d{9,15}$/, 'Valid phone number required')
});
```

---

## SECTION 3: COMPLETE COMPONENT ARCHITECTURE

### Authentication Components (src/components/auth/)

#### LoginForm Component
```typescript
// src/components/auth/login-form.tsx
interface LoginFormProps {
  onSuccess?: (user: DjangoUser) => void;
  onSwitchToRegister?: () => void;
  redirectTo?: string;
}

Component: LoginForm
Props Interface: LoginFormProps
State: useForm<LoginData> from React Hook Form
Effects: Auto-redirect on authentication state change
Custom Hooks: useAuthStore().login(), useRouter()
API Integration: POST /api/customer/auth/login/
Form Handling: React Hook Form with Zod validation
Validation Rules: Email format, required fields
Error Handling: Form-level and field-level error display
Loading State: Button disabled during submission
Success Flow: Updates auth store, redirects to dashboard or provided URL
```

#### RegisterForm Component
```typescript
// src/components/auth/register-form.tsx
interface RegisterFormProps {
  onSuccess?: (user: DjangoUser) => void;
  onSwitchToLogin?: () => void;
}

Component: RegisterForm
Props Interface: RegisterFormProps
State: useForm<RegisterData>, password confirmation validation
Effects: useEffect for form validation state sync
Custom Hooks: useAuthStore().register()
Child Components: Input, Button components with error states
API Integration: POST /api/customer/auth/register/
Form Handling: Multi-step validation with password confirmation
Validation Rules: Email uniqueness, password strength, phone format
Business Logic: Prevents hybrid staff/customer account creation
Error Handling: Account collision detection and user-friendly messages
```

#### UserMenu Component
```typescript
// src/components/auth/user-menu.tsx
Component: UserMenu
Props Interface: None (uses auth store directly)
State: useState<boolean> for dropdown open state
Effects: useClickAway hook for closing dropdown
Custom Hooks: useAuthStore(), useRouter()
Parent Components: MainLayout header
API Integration: POST /api/customer/auth/logout/ on logout
Styling: Headless UI Menu with Tailwind animations
Features: Profile dropdown, logout, dashboard navigation
Accessibility: Full keyboard navigation and ARIA attributes
```

### Booking Wizard Components (src/components/booking/)

#### BookingWizard Component (Multi-Step Form Architecture)
```typescript
// src/components/booking/booking-wizard.tsx
interface BookingWizardProps {
  onComplete?: () => void;
}

Component: BookingWizard
Props Interface: BookingWizardProps
State: useBookingWizard() Zustand store
Effects: Step validation, user authentication detection
Child Components: 6 step components (AuthChoice, ServiceSelection, DateTime, Address, CustomerInfo, ReviewPayment)
Custom Hooks: useAuthStore(), useBookingWizard()
Business Logic: Progressive step validation, guest vs authenticated flow
Form State: Persistent across browser sessions (with security limitations)
Navigation: Previous/Next with validation gates
Progress Indicator: Visual step progress with completion status
```

#### ServiceSelectionStep Component
```typescript
// src/components/booking/service-selection-step.tsx
Component: ServiceSelectionStep
Props Interface: None (uses booking store)
State: useQuery for service catalog, local selection state
Effects: Auto-load service catalog, pricing calculation
API Integration: GET /api/public/services/, GET /api/public/services/mini-moves-with-organizing/
Custom Hooks: useBookingWizard().updateBookingData()
Business Logic: Service type selection, organizing services add-ons, package comparison
UI Features: Service cards with pricing, popular badges, feature comparisons
Validation: Ensures service selection before proceeding
```

#### AddressStep Component
```typescript
// src/components/booking/address-step.tsx
Component: AddressStep
Props Interface: None (uses booking store)
State: useForm<AddressData> dual forms (pickup/delivery)
Effects: Auto-populate from saved addresses for authenticated users
API Integration: GET /api/customer/saved-addresses/ (if authenticated)
Form Handling: Dual address forms with validation
Validation Rules: Tri-state area restriction (NY, CT, NJ), ZIP code format
Business Logic: Geographic surcharge detection, same-address prevention
UI Features: Address autocomplete, saved address selection, manual entry
Error Handling: Address validation with helpful error messages
```

#### ReviewPaymentStep Component
```typescript
// src/components/booking/review-payment-step.tsx
Component: ReviewPaymentStep
Props Interface: None (uses booking store)
State: useState for payment processing, Stripe elements state
Effects: Load Stripe, create payment intent
API Integration: 
  - POST /api/payments/create-intent/
  - POST /api/public/guest-booking/
  - POST /api/payments/confirm/
Custom Hooks: useStripe(), useElements() from Stripe
Business Logic: 
  - Final booking creation
  - Payment processing
  - Guest vs authenticated booking flows
Payment Integration: Stripe Elements with card validation
Success Flow: Booking confirmation, payment confirmation, redirect to success page
Error Handling: Payment-specific errors, booking creation errors
```

### Staff Administration Components (src/components/staff/)

#### StaffLayout Component
```typescript
// src/components/staff/staff-layout.tsx
interface StaffLayoutProps {
  children: React.ReactNode;
}

Component: StaffLayout
Props Interface: StaffLayoutProps
State: useState for sidebar open/close, useStaffAuthStore() 
Effects: Authentication check, responsive sidebar management
Child Components: Sidebar navigation, header with user menu, main content area
Custom Hooks: useStaffAuthStore(), useRouter(), usePathname()
Navigation: Role-based menu items, active page highlighting
Authentication: Auto-redirect to login if not authenticated
Responsive Design: Mobile hamburger menu, desktop persistent sidebar
Logout Handling: Enhanced logout with cache clearing
```

#### BookingManagement Component
```typescript
// src/components/staff/booking-management.tsx
Component: BookingManagement
Props Interface: None
State: useQuery for bookings list, useState for filters and pagination
Effects: Auto-refresh booking data, filter state management
API Integration: GET /api/staff/bookings/ with pagination and filters
Custom Hooks: useInfiniteQuery for pagination
Child Components: BookingDetailModal for detailed editing
Business Logic: Booking search, status filtering, bulk operations
UI Features: Data table with sorting, filtering, infinite scroll
Actions: View booking details, update status, export data
Real-time Updates: Optimistic updates with TanStack Query
```

#### CustomerManagement Component
```typescript
// src/components/staff/customer-management.tsx
Component: CustomerManagement
Props Interface: None
State: useQuery for customer list, search and filter state
Effects: Customer data loading, search debouncing
API Integration: GET /api/staff/customers/ with search and pagination
Features: Customer search, VIP status display, booking history access
Business Logic: Customer statistics calculation, relationship tracking
Navigation: Links to individual customer detail pages
```

#### StaffDashboardOverview Component
```typescript
// src/components/staff/staff-dashboard-overview.tsx
Component: StaffDashboardOverview
Props Interface: None
State: useQuery for dashboard statistics
Effects: Auto-refresh dashboard data every 30 seconds
API Integration: GET /api/staff/dashboard/
Data Display: 
  - Today's booking summary
  - Revenue statistics
  - Pending refunds and tasks
  - Recent booking activity
Real-time Features: Live updating statistics
Navigation: Quick links to detailed management pages
```

### UI Component Library (src/components/ui/)

#### Button Component (Polymorphic Design)
```typescript
// src/components/ui/button.tsx
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

Component: Button
Props Interface: ButtonProps with HTML button attributes
Styling: Tailwind CSS with variant system and size modifiers
Features: Loading states, icon support, disabled states
Accessibility: Full ARIA support, keyboard navigation
Usage: Throughout application for consistent button styling
Variants: Brand colors (navy/gold), semantic colors (destructive)
```

#### Input Component (Enhanced Form Controls)
```typescript
// src/components/ui/input.tsx
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'error' | 'success';
  inputSize?: 'sm' | 'md' | 'lg';
  label?: string;
  error?: string;
  helper?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

Component: Input
Props Interface: InputProps with full HTML input attributes
Features: Label support, error states, helper text, icon slots
Validation: Visual error states with error message display
Accessibility: Proper label association, ARIA error descriptions
Integration: Works with React Hook Form and Zod validation
Styling: Consistent with design system, focus states
```

#### Modal Component (Accessible Dialog Implementation)
```typescript
// src/components/ui/modal.tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  className?: string;
}

Component: Modal
Props Interface: ModalProps
Implementation: Headless UI Dialog with custom styling
Features: Multiple sizes, overlay click handling, escape key support
Accessibility: Focus trapping, ARIA attributes, keyboard navigation
Animations: Smooth open/close transitions with Tailwind
Usage: Booking wizard, staff detail views, confirmation dialogs
Portal Rendering: Renders outside normal DOM tree for proper layering
```

---

## SECTION 4: STATE MANAGEMENT IMPLEMENTATION GUIDE

### Complete State Structure and Organization

#### Customer Authentication Store (useAuthStore)
```typescript
// src/stores/auth-store.ts
interface AuthState {
  user: DjangoUser | null;
  customerProfile: CustomerProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthActions {
  setAuth: (user: DjangoUser, profile: CustomerProfile) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  updateProfile: (updates: Partial<CustomerProfile>) => void;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (data: RegisterData) => Promise<AuthResult>;
  logout: () => Promise<void>;
  validateSession: () => Promise<boolean>;
  clearSessionIfIncognito: () => void;
  secureReset: () => void;
}

Store Features:
- Persistent auth state with localStorage
- Session validation on app load
- Coordinated logout (clears staff auth to prevent hybrid states)
- Incognito mode detection and session clearing
- Security-focused state sanitization
- Optimistic auth updates with rollback on failure
```

#### Staff Authentication Store (useStaffAuthStore)
```typescript
// src/stores/staff-auth-store.ts
interface StaffAuthState {
  user: StaffUser | null;
  staffProfile: StaffProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface StaffAuthActions {
  setAuth: (user: StaffUser, profile: StaffProfile) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  login: (username: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  validateStaffSession: () => Promise<boolean>;
}

Store Features:
- Role-based permission checking
- Staff-specific authentication flow
- Permission-based UI rendering
- Enhanced logout with cache clearing
- Cross-store coordination (prevents customer/staff hybrid states)
```

#### Booking Wizard Store (useBookingWizard)
```typescript
// src/stores/booking-store.ts
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
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  updateBookingData: (data: Partial<BookingData>) => void;
  setLoading: (loading: boolean) => void;
  setError: (field: string, message: string) => void;
  clearError: (field: string) => void;
  clearErrors: () => void;
  resetWizard: () => void;
  secureReset: () => void;
  canProceedToStep: (step: number) => boolean;
  setBookingComplete: (bookingNumber: string) => void;
  initializeForUser: (userId?: string, isGuest?: boolean) => void;
}

Advanced Features:
- Multi-step form state persistence
- Progressive validation with step gating
- Guest vs authenticated user modes
- Security-focused data sanitization
- Automatic session expiration (24 hours)
- PII exclusion from localStorage persistence
- Store version migration for security updates
```

### Actions, Mutations, and State Update Patterns

#### Authentication Actions
```typescript
// Customer Login Action
const login = async (email: string, password: string) => {
  set({ isLoading: true });
  
  try {
    const response = await apiClient.post('/api/customer/auth/login/', {
      email,
      password
    });

    if (response.status === 200) {
      const { user, customer_profile } = response.data;
      
      // Update auth state
      set({
        user,
        customerProfile: customer_profile,
        isAuthenticated: true,
        isLoading: false
      });
      
      // Clear any staff auth (prevent hybrid states)
      useStaffAuthStore.getState().clearAuth();
      
      return { success: true, user };
    }
  } catch (error: any) {
    set({ isLoading: false });
    const errorMessage = handleApiError(error);
    return { success: false, error: errorMessage };
  }
};

// Enhanced Logout with Cross-Store Coordination
const logout = async () => {
  try {
    await apiClient.post('/api/customer/auth/logout/');
  } catch (error) {
    console.warn('Customer logout API failed:', error);
  }
  
  // Always clear state, even if API call fails
  get().clearAuth();
  
  // Clear staff auth too (prevent hybrid states)
  useStaffAuthStore.getState().clearAuth();
  
  // Clear booking wizard
  useBookingWizard.getState().resetWizard();
  
  // Clear React Query cache
  queryClient.clear();
};
```

#### Booking Wizard State Updates
```typescript
// Progressive Step Validation
const canProceedToStep = (step: number): boolean => {
  const { bookingData, isGuestMode } = get();
  
  switch (step) {
    case 1: // Service Selection
      return true; // Always can proceed to first step
    case 2: // Date & Time
      return (
        (bookingData.service_type === 'mini_move' && !!bookingData.mini_move_package_id) ||
        (bookingData.service_type === 'standard_delivery' && !!bookingData.standard_delivery_item_count) ||
        (bookingData.service_type === 'specialty_item' && !!bookingData.specialty_item_ids?.length)
      );
    case 3: // Addresses
      return !!bookingData.pickup_date;
    case 4: // Customer Info
      return !!bookingData.pickup_address && !!bookingData.delivery_address;
    case 5: // Review & Payment
      if (isGuestMode) {
        return !!bookingData.customer_info?.email;
      } else {
        return !!bookingData.pickup_address && !!bookingData.delivery_address;
      }
    default:
      return false;
  }
};

// Secure Data Sanitization
const sanitizeBookingData = (data: Partial<BookingData>): Partial<BookingData> => {
  const sanitized: Partial<BookingData> = {};
  
  // Validate service types
  if (data.service_type && ['mini_move', 'standard_delivery', 'specialty_item'].includes(data.service_type)) {
    sanitized.service_type = data.service_type;
  }
  
  // Sanitize string fields with length limits
  if (data.special_instructions) {
    sanitized.special_instructions = data.special_instructions.substring(0, 500).trim();
  }
  
  // Validate numeric fields with bounds
  if (typeof data.specific_pickup_hour === 'number' && 
      data.specific_pickup_hour >= 8 && 
      data.specific_pickup_hour <= 17) {
    sanitized.specific_pickup_hour = Math.floor(data.specific_pickup_hour);
  }
  
  return sanitized;
};
```

### Data Persistence and Synchronization with Backend

#### Persistent State Configuration
```typescript
// Auth Store Persistence
export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      // ... store implementation
    }),
    {
      name: 'totetaxi-auth',
      version: 2, // Increment for breaking changes
      migrate: (persistedState: any, version: number) => {
        if (version !== 2) {
          // Reset store for security updates
          return {
            user: null,
            customerProfile: null,
            isAuthenticated: false,
            isLoading: false
          };
        }
        return persistedState;
      },
      // Security: Exclude sensitive data from persistence
      partialize: (state) => ({
        user: state.user,
        customerProfile: {
          ...state.customerProfile,
          // Exclude PII from localStorage
          phone: undefined
        },
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);

// Booking Wizard Security-Focused Persistence
export const useBookingWizard = create<BookingWizardState & BookingWizardActions>()(
  persist(
    (set, get) => ({
      // ... store implementation
    }),
    {
      name: 'totetaxi-booking-wizard',
      version: 3,
      // Security: Exclude PII from localStorage persistence
      partialize: (state) => ({
        bookingData: {
          ...state.bookingData,
          customer_info: undefined // Don't persist customer PII
        },
        currentStep: state.currentStep,
        isBookingComplete: state.isBookingComplete,
        completedBookingNumber: state.completedBookingNumber,
        userId: state.userId,
        isGuestMode: state.isGuestMode,
        lastResetTimestamp: state.lastResetTimestamp
      })
    }
  )
);
```

#### TanStack Query Integration
```typescript
// Query Client Configuration with Global Error Handling
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on authentication errors
        if (error?.response?.status === 401) return false;
        // Don't retry on validation errors
        if (error?.response?.status === 400) return false;
        // Retry network errors up to 3 times
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
      refetchOnMount: 'always'
    },
    mutations: {
      retry: false,
      onError: (error: any) => {
        const errorMessage = handleApiError(error);
        // Global error notification (could integrate with toast system)
        console.error('Mutation error:', errorMessage);
      }
    }
  }
});

// Global 401 Error Handler
queryClient.getQueryCache().subscribe((event) => {
  if (event?.type === 'updated') {
    const result = event.query.state;
    if (result.error?.response?.status === 401) {
      handle401Error();
    }
  }
});

// Centralized 401 Error Handler
async function handle401Error() {
  console.log('🚨 React Query detected 401 - clearing cache');
  
  try {
    // Clear the query cache
    queryClient.clear();
    
    // Clear auth stores
    useAuthStore.getState().clearAuth();
    useStaffAuthStore.getState().clearAuth();
    
    // Redirect based on current path
    if (window.location.pathname.startsWith('/staff')) {
      window.location.href = '/staff/login';
    } else {
      window.location.href = '/';
    }
  } catch (e) {
    console.warn('Error handling React Query 401:', e);
  }
}
```

---

## SECTION 5: ROUTING & NAVIGATION ARCHITECTURE

### Complete Route Structure and Navigation Patterns

#### App Router File-Based Routing Structure
```typescript
// Next.js 15 App Router Structure
src/app/
├── page.tsx                    # Home page (landing/marketing)
├── about/page.tsx              # About ToteTaxi page
├── book/page.tsx               # Booking wizard modal
├── contact/page.tsx            # Contact information page
├── dashboard/
│   ├── page.tsx                # Customer dashboard
│   ├── bookings/
│   │   └── [id]/page.tsx       # Individual booking details
│   └── profile/page.tsx        # Customer profile management
├── staff/
│   ├── login/page.tsx          # Staff authentication
│   ├── dashboard/page.tsx      # Staff overview dashboard
│   ├── bookings/
│   │   ├── page.tsx            # Booking management
│   │   └── [id]/page.tsx       # Booking detail editing
│   ├── calendar/page.tsx       # Booking calendar view
│   ├── customers/
│   │   ├── page.tsx            # Customer management
│   │   └── [id]/page.tsx       # Customer detail view
│   ├── logistics/page.tsx      # Logistics coordination
│   └── reports/page.tsx        # Business reports
├── booking-status/
│   └── [booking_number]/page.tsx  # Guest booking lookup
└── layout.tsx                  # Root layout with providers
```

#### Route Guards and Authentication
```typescript
// Customer Route Protection Pattern
export default function CustomerDashboardPage() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return <LoadingSpinner />;
  }

  return <DashboardContent />;
}

// Staff Route Protection Pattern
export default function StaffOnlyPage() {
  const { isAuthenticated, isLoading, staffProfile } = useStaffAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/staff/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Role-based access control
  const hasRequiredPermission = staffProfile?.permissions?.can_view_reports;
  
  if (!hasRequiredPermission) {
    return <UnauthorizedAccess />;
  }

  return <ReportsContent />;
}
```

#### Dynamic Routes and Parameter Handling
```typescript
// Dynamic Booking Detail Route
// src/app/staff/bookings/[id]/page.tsx
export default function BookingDetailPage() {
  const params = useParams();
  const bookingId = params.id as string;
  
  const { data: booking, isLoading } = useQuery({
    queryKey: ['staff', 'booking', bookingId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/staff/bookings/${bookingId}/`);
      return response.data;
    },
    enabled: !!bookingId
  });

  return <BookingDetailView booking={booking} />;
}

// Guest Booking Status Lookup
// src/app/booking-status/[booking_number]/page.tsx
export default function BookingStatusPage() {
  const params = useParams();
  const bookingNumber = params.booking_number as string;
  
  const { data: booking } = useQuery({
    queryKey: ['booking', 'status', bookingNumber],
    queryFn: async () => {
      const response = await apiClient.get(`/api/public/booking-status/${bookingNumber}/`);
      return response.data;
    },
    enabled: !!bookingNumber
  });

  return <BookingStatusDisplay booking={booking} />;
}
```

### Navigation Components and Menu Systems

#### MainLayout Navigation
```typescript
// src/components/layout/main-layout.tsx
const navigation = [
  { name: 'Home', href: '/' },
  { name: 'About', href: '/about' },
  { name: 'Contact', href: '/contact' },
];

const authenticatedNavigation = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Book Now', href: '/book' },
];

export function MainLayout({ children }: MainLayoutProps) {
  const { isAuthenticated, user } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Header Navigation */}
      <header className="bg-white shadow-sm border-b border-cream-100">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-serif font-bold text-navy-900">
                ToteTaxi
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-navy-700 hover:text-navy-900 transition-colors"
                >
                  {item.name}
                </Link>
              ))}
              
              {isAuthenticated ? (
                <>
                  {authenticatedNavigation.map((item) => (
                    <Link key={item.name} href={item.href}>
                      {item.name}
                    </Link>
                  ))}
                  <UserMenu />
                </>
              ) : (
                <Button variant="primary" onClick={() => setShowAuthModal(true)}>
                  Sign In / Book Now
                </Button>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Bars3Icon 
                className="h-6 w-6 text-navy-900 cursor-pointer"
                onClick={() => setMobileMenuOpen(true)}
              />
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  );
}
```

#### Staff Layout Navigation
```typescript
// src/components/staff/staff-layout.tsx
const navigation = [
  { name: 'Dashboard', href: '/staff/dashboard', icon: HomeIcon },
  { name: 'Calendar', href: '/staff/calendar', icon: CalendarIcon },
  { name: 'Bookings', href: '/staff/bookings', icon: ClipboardDocumentListIcon },
  { name: 'Customers', href: '/staff/customers', icon: UsersIcon },
  { name: 'Logistics', href: '/staff/logistics', icon: TruckIcon },
  { name: 'Reports', href: '/staff/reports', icon: ChartBarIcon }
];

export function StaffLayout({ children }: StaffLayoutProps) {
  const { staffProfile, logout } = useStaffAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  // Role-based navigation filtering
  const filteredNavigation = navigation.filter(item => {
    if (item.href === '/staff/reports') {
      return staffProfile?.permissions?.can_view_financial_reports;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-cream-50 flex">
      {/* Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:bg-navy-900">
        <div className="flex-1 flex flex-col min-h-0">
          {/* Logo */}
          <div className="flex items-center h-16 flex-shrink-0 px-4 bg-navy-800">
            <span className="text-xl font-serif font-bold text-white">
              ToteTaxi Staff
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
                    isActive
                      ? 'bg-navy-700 text-white'
                      : 'text-navy-300 hover:bg-navy-800 hover:text-white'
                  )}
                >
                  <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User Info & Logout */}
          <div className="flex-shrink-0 border-t border-navy-700 p-4">
            <div className="flex items-center">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {staffProfile?.full_name}
                </p>
                <p className="text-xs text-navy-300 truncate">
                  {staffProfile?.role}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-navy-300 hover:text-white"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

#### Programmatic Navigation Patterns
```typescript
// Navigation with State Management
const navigateWithBookingState = () => {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { setCurrentStep } = useBookingWizard();

  const startBooking = () => {
    setCurrentStep(0);
    router.push('/book');
  };

  const returnToDashboard = () => {
    if (isAuthenticated) {
      router.push('/dashboard');
    } else {
      router.push('/');
    }
  };
};

// Staff Navigation with Permission Checks
const staffNavigation = () => {
  const router = useRouter();
  const { staffProfile } = useStaffAuthStore();

  const navigateToReports = () => {
    if (staffProfile?.permissions?.can_view_financial_reports) {
      router.push('/staff/reports');
    } else {
      // Show permission error or redirect
      router.push('/staff/dashboard');
    }
  };
};
```

---

## SECTION 6: FORM HANDLING & VALIDATION REFERENCE

### Form Implementation Patterns and Validation Schemas

#### React Hook Form Integration with Zod Validation
```typescript
// Comprehensive Form Setup Pattern
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Zod Schema Definition
const LoginFormSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters')
});

type LoginFormData = z.infer<typeof LoginFormSchema>;

// Form Component Implementation
export function LoginForm({ onSuccess }: LoginFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    clearErrors
  } = useForm<LoginFormData>({
    resolver: zodResolver(LoginFormSchema),
    mode: 'onBlur', // Validate on blur for better UX
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const { login } = useAuthStore();

  const onSubmit = async (data: LoginFormData) => {
    clearErrors();
    
    const result = await login(data.email, data.password);
    
    if (result.success) {
      onSuccess?.(result.user);
    } else {
      // Set form-level error
      setError('root', {
        type: 'manual',
        message: result.error || 'Login failed'
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Email Field */}
      <Input
        {...register('email')}
        type="email"
        label="Email Address"
        error={errors.email?.message}
        placeholder="your@email.com"
        autoComplete="email"
      />

      {/* Password Field */}
      <Input
        {...register('password')}
        type="password"
        label="Password"
        error={errors.password?.message}
        placeholder="••••••••"
        autoComplete="current-password"
      />

      {/* Form-level error */}
      {errors.root && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
          {errors.root.message}
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={isSubmitting}
        className="w-full"
      >
        {isSubmitting ? 'Signing In...' : 'Sign In'}
      </Button>
    </form>
  );
}
```

#### Advanced Multi-Step Form Validation (Booking Wizard)
```typescript
// Address Step Schema with Business Logic
const AddressStepSchema = z.object({
  pickup_address: z.object({
    address_line_1: z
      .string()
      .min(1, 'Pickup address is required')
      .max(200, 'Address too long'),
    address_line_2: z.string().optional(),
    city: z
      .string()
      .min(1, 'City is required')
      .max(100, 'City name too long'),
    state: z.enum(['NY', 'CT', 'NJ'], {
      errorMap: () => ({ 
        message: 'Service is only available in NY, CT, and NJ' 
      })
    }),
    zip_code: z
      .string()
      .regex(/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code')
  }),
  delivery_address: z.object({
    address_line_1: z
      .string()
      .min(1, 'Delivery address is required')
      .max(200, 'Address too long'),
    address_line_2: z.string().optional(),
    city: z
      .string()
      .min(1, 'City is required')
      .max(100, 'City name too long'),
    state: z.enum(['NY', 'CT', 'NJ'], {
      errorMap: () => ({ 
        message: 'Service is only available in NY, CT, and NJ' 
      })
    }),
    zip_code: z
      .string()
      .regex(/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code')
  })
}).refine((data) => {
  // Business Rule: Pickup and delivery can't be the same
  const pickup = data.pickup_address;
  const delivery = data.delivery_address;
  
  return !(
    pickup.address_line_1 === delivery.address_line_1 &&
    pickup.city === delivery.city &&
    pickup.state === delivery.state &&
    pickup.zip_code === delivery.zip_code
  );
}, {
  message: 'Pickup and delivery addresses must be different',
  path: ['delivery_address', 'address_line_1']
});

// Address Step Component
export function AddressStep() {
  const { bookingData, updateBookingData, setError, clearError } = useBookingWizard();
  const { isAuthenticated } = useAuthStore();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    trigger
  } = useForm<AddressStepData>({
    resolver: zodResolver(AddressStepSchema),
    defaultValues: {
      pickup_address: bookingData.pickup_address || {},
      delivery_address: bookingData.delivery_address || {}
    }
  });

  // Watch for changes to auto-save to booking store
  const watchedData = watch();
  
  useEffect(() => {
    const subscription = watch((value) => {
      if (value.pickup_address && value.delivery_address) {
        updateBookingData({
          pickup_address: value.pickup_address,
          delivery_address: value.delivery_address
        });
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, updateBookingData]);

  // Load saved addresses for authenticated users
  const { data: savedAddresses } = useQuery({
    queryKey: ['customer', 'saved-addresses'],
    queryFn: async () => {
      const response = await apiClient.get('/api/customer/saved-addresses/');
      return response.data;
    },
    enabled: isAuthenticated
  });

  const handleSavedAddressSelect = (address: SavedAddress, type: 'pickup' | 'delivery') => {
    const formattedAddress = {
      address_line_1: address.address_line_1,
      address_line_2: address.address_line_2 || '',
      city: address.city,
      state: address.state,
      zip_code: address.zip_code
    };

    setValue(`${type}_address`, formattedAddress);
    trigger(`${type}_address`); // Trigger validation
  };

  return (
    <div className="space-y-8">
      {/* Saved Addresses (if authenticated) */}
      {isAuthenticated && savedAddresses?.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-navy-900 mb-4">
            Your Saved Addresses
          </h3>
          <div className="grid gap-3">
            {savedAddresses.map((address: SavedAddress) => (
              <div
                key={address.id}
                className="p-3 border border-gray-200 rounded-lg hover:border-navy-300 cursor-pointer"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{address.address_line_1}</div>
                    <div className="text-sm text-gray-600">
                      {address.city}, {address.state} {address.zip_code}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSavedAddressSelect(address, 'pickup')}
                    >
                      Use for Pickup
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSavedAddressSelect(address, 'delivery')}
                    >
                      Use for Delivery
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Address Forms */}
      <form className="space-y-8">
        {/* Pickup Address */}
        <div>
          <h3 className="text-lg font-medium text-navy-900 mb-4">
            Pickup Address
          </h3>
          <div className="grid gap-4">
            <Input
              {...register('pickup_address.address_line_1')}
              label="Street Address"
              placeholder="123 Main Street"
              error={errors.pickup_address?.address_line_1?.message}
            />
            <Input
              {...register('pickup_address.address_line_2')}
              label="Apartment, Suite, etc. (Optional)"
              placeholder="Apt 4B, Suite 200"
              error={errors.pickup_address?.address_line_2?.message}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                {...register('pickup_address.city')}
                label="City"
                placeholder="New York"
                error={errors.pickup_address?.city?.message}
              />
              <Select
                {...register('pickup_address.state')}
                label="State"
                options={[
                  { value: 'NY', label: 'New York' },
                  { value: 'CT', label: 'Connecticut' },
                  { value: 'NJ', label: 'New Jersey' }
                ]}
                error={errors.pickup_address?.state?.message}
              />
            </div>
            <Input
              {...register('pickup_address.zip_code')}
              label="ZIP Code"
              placeholder="10001"
              error={errors.pickup_address?.zip_code?.message}
            />
          </div>
        </div>

        {/* Delivery Address */}
        <div>
          <h3 className="text-lg font-medium text-navy-900 mb-4">
            Delivery Address
          </h3>
          <div className="grid gap-4">
            <Input
              {...register('delivery_address.address_line_1')}
              label="Street Address"
              placeholder="456 Oak Avenue"
              error={errors.delivery_address?.address_line_1?.message}
            />
            <Input
              {...register('delivery_address.address_line_2')}
              label="Apartment, Suite, etc. (Optional)"
              placeholder="Apt 4B, Suite 200"
              error={errors.delivery_address?.address_line_2?.message}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                {...register('delivery_address.city')}
                label="City"
                placeholder="Southampton"
                error={errors.delivery_address?.city?.message}
              />
              <Select
                {...register('delivery_address.state')}
                label="State"
                options={[
                  { value: 'NY', label: 'New York' },
                  { value: 'CT', label: 'Connecticut' },
                  { value: 'NJ', label: 'New Jersey' }
                ]}
                error={errors.delivery_address?.state?.message}
              />
            </div>
            <Input
              {...register('delivery_address.zip_code')}
              label="ZIP Code"
              placeholder="11968"
              error={errors.delivery_address?.zip_code?.message}
            />
          </div>
        </div>
      </form>
    </div>
  );
}
```

### Form Submission and API Integration Patterns

#### Optimistic Updates with Error Handling
```typescript
// Staff Booking Update Form
export function BookingUpdateForm({ booking }: BookingUpdateFormProps) {
  const queryClient = useQueryClient();
  
  const updateBookingMutation = useMutation({
    mutationFn: async (data: BookingUpdateData) => {
      const response = await apiClient.put(`/api/staff/bookings/${booking.id}/`, data);
      return response.data;
    },
    onMutate: async (newData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['staff', 'booking', booking.id] });
      
      // Snapshot the previous value
      const previousBooking = queryClient.getQueryData(['staff', 'booking', booking.id]);
      
      // Optimistically update the cache
      queryClient.setQueryData(['staff', 'booking', booking.id], (old: any) => ({
        ...old,
        ...newData
      }));
      
      // Return context object with snapshot
      return { previousBooking };
    },
    onError: (err, newData, context) => {
      // Rollback on error
      queryClient.setQueryData(
        ['staff', 'booking', booking.id],
        context?.previousBooking
      );
      
      // Show error notification
      setError('root', {
        type: 'manual',
        message: handleApiError(err)
      });
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['staff', 'booking', booking.id] });
    }
  });

  const onSubmit = async (data: BookingUpdateData) => {
    updateBookingMutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
}
```

#### File Upload with Progress Tracking
```typescript
// Document Upload Form (Future COI Upload Feature)
export function DocumentUploadForm({ bookingId }: DocumentUploadFormProps) {
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const uploadDocumentMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiClient.post(
        `/api/bookings/${bookingId}/documents/`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round(
              (progressEvent.loaded * 100) / (progressEvent.total || 1)
            );
            setUploadProgress(progress);
          }
        }
      );
      return response.data;
    },
    onSuccess: () => {
      setUploadProgress(0);
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
    },
    onError: (error) => {
      setUploadProgress(0);
      console.error('Upload failed:', error);
    }
  });

  const handleFileUpload = (files: FileList) => {
    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('documents', file);
    });
    
    uploadDocumentMutation.mutate(formData);
  };

  return (
    <div>
      <input
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
      />
      
      {uploadProgress > 0 && (
        <div className="mt-4">
          <div className="bg-gray-200 rounded-full h-2">
            <div
              className="bg-navy-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-1">{uploadProgress}% uploaded</p>
        </div>
      )}
    </div>
  );
}
```

### Reusable Form Components and Utilities

#### Form Field Components
```typescript
// Enhanced Input Component with Full Integration
interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
  required?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(({
  label,
  error,
  helper,
  required,
  leftIcon,
  rightIcon,
  className,
  ...props
}, ref) => {
  const inputId = useId();
  
  return (
    <div className="space-y-1">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-navy-900"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <div className="h-5 w-5 text-gray-400">
              {leftIcon}
            </div>
          </div>
        )}
        
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'block w-full rounded-md border-gray-300 shadow-sm',
            'focus:border-navy-500 focus:ring-navy-500',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            error && 'border-red-300 focus:border-red-500 focus:ring-red-500',
            className
          )}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error ? `${inputId}-error` : helper ? `${inputId}-helper` : undefined
          }
          {...props}
        />
        
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <div className="h-5 w-5 text-gray-400">
              {rightIcon}
            </div>
          </div>
        )}
      </div>
      
      {helper && !error && (
        <p id={`${inputId}-helper`} className="text-sm text-gray-600">
          {helper}
        </p>
      )}
      
      {error && (
        <p id={`${inputId}-error`} className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
});
```

---

## SECTION 7: UI COMPONENT SYSTEM DOCUMENTATION

### Design System and Component Library Reference

#### Design Token System (Tailwind Configuration)
```javascript
// tailwind.config.js - Complete Design System
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['var(--font-playfair)', 'serif'],    // Luxury serif for headings
        sans: ['var(--font-inter)', 'sans-serif'],   // Modern sans for body text
      },
      colors: {
        // Primary Brand Colors
        navy: {
          50: '#f0f4f8',   // Lightest navy for backgrounds
          100: '#d9e2ec',  // Light navy for subtle elements
          200: '#bcccdc',  // Medium light navy
          300: '#9fb3c8',  // Medium navy for secondary text
          400: '#829ab1',  // Medium navy for borders
          500: '#627d98',  // Base navy for secondary actions
          600: '#486581',  // Darker navy for hover states
          700: '#334e68',  // Dark navy for primary text
          800: '#243b53',  // Darker navy for emphasis
          900: '#1a365d',  // Darkest navy for headings and primary actions
        },
        // Accent Gold Colors
        gold: {
          50: '#fffdf7',   // Lightest gold for backgrounds
          100: '#fef7e0',  // Light gold for highlights
          200: '#fdecc0',  // Medium light gold
          300: '#fbdb94',  // Medium gold for accents
          400: '#f7c365',  // Medium gold for buttons
          500: '#d69e2e',  // Base gold for primary actions
          600: '#b7791f',  // Darker gold for hover
          700: '#975a16',  // Dark gold for emphasis
          800: '#744210',  // Darker gold
          900: '#5f370e',  // Darkest gold
        },
        // Warm Cream Colors
        cream: {
          50: '#fefcf3',   // Lightest cream for page backgrounds
          100: '#fef7e0',  // Light cream for card backgrounds
          200: '#fdecc0',  // Medium light cream
          300: '#fbdb94',  // Medium cream for subtle highlights
          400: '#f7c365',  // Medium cream for accents
          500: '#f1a545',  // Base cream
          600: '#d69e2e',  // Darker cream
          700: '#b7791f',  // Dark cream
          800: '#975a16',  // Darker cream
          900: '#744210',  // Darkest cream
        }
      },
      container: {
        center: true,
        padding: "2rem",
        screens: {
          "2xl": "1400px",
        },
      },
      spacing: {
        '18': '4.5rem',   // Custom spacing for luxury layouts
        '22': '5.5rem',   // Extended spacing options
      },
      borderRadius: {
        'xl': '0.875rem', // Slightly larger radius for cards
        '2xl': '1.125rem', // Even larger for modals
      },
      boxShadow: {
        'luxury': '0 4px 20px rgba(0, 0, 0, 0.08)', // Custom shadow for premium feel
        'card': '0 2px 8px rgba(0, 0, 0, 0.04)',     // Subtle card shadow
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
```

#### Button Component System
```typescript
// src/components/ui/button.tsx - Comprehensive Button System
import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/utils/cn';

const buttonVariants = {
  variant: {
    primary: 'bg-navy-900 text-white hover:bg-navy-800 focus:ring-navy-500 shadow-lg',
    secondary: 'bg-gold-500 text-white hover:bg-gold-600 focus:ring-gold-500 shadow-lg',
    outline: 'border-2 border-navy-900 text-navy-900 hover:bg-navy-900 hover:text-white focus:ring-navy-500',
    ghost: 'text-navy-700 hover:bg-navy-100 hover:text-navy-900 focus:ring-navy-500',
    destructive: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-lg',
    link: 'text-navy-700 underline-offset-4 hover:underline focus:ring-navy-500',
  },
  size: {
    sm: 'h-9 px-3 text-sm font-medium',
    md: 'h-11 px-4 py-2 text-base font-medium',
    lg: 'h-12 px-6 py-3 text-lg font-medium',
    xl: 'h-14 px-8 py-4 text-xl font-medium',
    icon: 'h-10 w-10 p-0',
  },
  state: {
    default: '',
    loading: 'cursor-wait opacity-80',
    disabled: 'opacity-50 cursor-not-allowed pointer-events-none',
  }
};

const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants.variant;
  size?: keyof typeof buttonVariants.size;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className,
  disabled,
  children,
  ...props
}, ref) => {
  const state = isLoading ? 'loading' : disabled ? 'disabled' : 'default';

  return (
    <button
      ref={ref}
      className={cn(
        baseStyles,
        buttonVariants.variant[variant],
        buttonVariants.size[size],
        buttonVariants.state[state],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      
      {!isLoading && leftIcon && (
        <span className="mr-2">{leftIcon}</span>
      )}
      
      {children}
      
      {!isLoading && rightIcon && (
        <span className="ml-2">{rightIcon}</span>
      )}
    </button>
  );
});

Button.displayName = 'Button';

// Usage Examples:
// <Button variant="primary" size="lg">Book Now</Button>
// <Button variant="outline" leftIcon={<PlusIcon />}>Add Item</Button>
// <Button variant="destructive" isLoading={isDeleting}>Delete</Button>
```

#### Card Component Architecture
```typescript
// src/components/ui/card.tsx - Flexible Card System
import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/utils/cn';

const cardVariants = {
  variant: {
    default: 'bg-white border border-gray-200 shadow-card',
    elevated: 'bg-white border border-gray-200 shadow-luxury',
    outlined: 'bg-white border-2 border-navy-200',
    filled: 'bg-cream-50 border border-cream-200',
    premium: 'bg-gradient-to-br from-white to-cream-50 border border-gold-200 shadow-luxury',
  },
  padding: {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10',
  },
  rounded: {
    none: '',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
  }
};

const baseStyles = 'overflow-hidden transition-shadow duration-200';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof cardVariants.variant;
  padding?: keyof typeof cardVariants.padding;
  rounded?: keyof typeof cardVariants.rounded;
  hover?: boolean;
  children: React.ReactNode;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(({
  variant = 'default',
  padding = 'md',
  rounded = 'lg',
  hover = false,
  className,
  children,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        baseStyles,
        cardVariants.variant[variant],
        cardVariants.padding[padding],
        cardVariants.rounded[rounded],
        hover && 'hover:shadow-luxury transition-shadow duration-200',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';

// Subcomponents for structured content
export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({
  className,
  children,
  ...props
}, ref) => (
  <div ref={ref} className={cn('border-b border-gray-100 pb-4 mb-4', className)} {...props}>
    {children}
  </div>
));

CardHeader.displayName = 'CardHeader';

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({
  className,
  children,
  ...props
}, ref) => (
  <div ref={ref} className={cn('', className)} {...props}>
    {children}
  </div>
));

CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({
  className,
  children,
  ...props
}, ref) => (
  <div ref={ref} className={cn('border-t border-gray-100 pt-4 mt-4', className)} {...props}>
    {children}
  </div>
));

CardFooter.displayName = 'CardFooter';
```

### Styling Patterns and Responsive Design Approach

#### Mobile-First Responsive Design Patterns
```typescript
// Responsive Layout Utilities
export const responsiveContainerStyles = {
  // Page-level containers
  page: 'container mx-auto px-4 sm:px-6 lg:px-8',
  section: 'py-12 md:py-16 lg:py-20',
  
  // Content width constraints
  prose: 'max-w-3xl mx-auto',
  narrow: 'max-w-2xl mx-auto',
  wide: 'max-w-6xl mx-auto',
  
  // Grid systems
  grid: {
    responsive: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
    cards: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4',
    dashboard: 'grid grid-cols-1 lg:grid-cols-3 gap-6',
  },
  
  // Flex layouts
  flex: {
    center: 'flex items-center justify-center',
    between: 'flex items-center justify-between',
    stack: 'flex flex-col space-y-4',
    row: 'flex flex-col sm:flex-row sm:space-x-4 sm:space-y-0 space-y-4',
  }
};

// Typography Scale
export const typographyStyles = {
  // Headings
  h1: 'text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-navy-900',
  h2: 'text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-navy-900',
  h3: 'text-2xl md:text-3xl font-serif font-bold text-navy-900',
  h4: 'text-xl md:text-2xl font-serif font-semibold text-navy-900',
  h5: 'text-lg md:text-xl font-sans font-semibold text-navy-900',
  h6: 'text-base md:text-lg font-sans font-semibold text-navy-900',
  
  // Body text
  body: 'text-base text-navy-700 leading-relaxed',
  bodyLarge: 'text-lg text-navy-700 leading-relaxed',
  bodySmall: 'text-sm text-navy-600',
  
  // UI text
  caption: 'text-xs text-navy-500 uppercase tracking-wide',
  label: 'text-sm font-medium text-navy-900',
  
  // Special text
  accent: 'text-gold-600 font-medium',
  muted: 'text-navy-500',
  error: 'text-red-600',
  success: 'text-green-600',
};

// Component Usage Example
export function ResponsiveServiceCard({ service }: ServiceCardProps) {
  return (
    <Card
      variant="premium"
      padding="lg"
      hover
      className="h-full flex flex-col"
    >
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <h3 className={typographyStyles.h4}>
            {service.name}
          </h3>
          {service.is_most_popular && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gold-100 text-gold-800">
              Most Popular
            </span>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1">
        <p className={typographyStyles.body}>
          {service.description}
        </p>
        
        <div className="mt-6 space-y-3">
          {service.features.map((feature, index) => (
            <div key={index} className="flex items-center">
              <CheckIcon className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
              <span className={typographyStyles.bodySmall}>
                {feature}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
      
      <CardFooter>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-2xl font-bold text-navy-900">
              ${service.base_price_dollars}
            </span>
            <span className={typographyStyles.muted}>
              starting
            </span>
          </div>
          <Button variant="primary" size="sm">
            Select Package
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
```

#### Animation and Interaction Patterns
```typescript
// Animation Utilities
export const animationStyles = {
  // Entrance animations
  fadeIn: 'animate-fade-in',
  slideUp: 'animate-slide-up',
  
  // Hover effects
  hover: {
    lift: 'hover:-translate-y-1 hover:shadow-lg transition-all duration-200',
    glow: 'hover:shadow-luxury transition-shadow duration-200',
    scale: 'hover:scale-105 transition-transform duration-200',
  },
  
  // Loading states
  pulse: 'animate-pulse',
  spin: 'animate-spin',
  
  // Interactive feedback
  pressed: 'active:scale-95 transition-transform duration-100',
  focus: 'focus:ring-2 focus:ring-navy-500 focus:ring-offset-2',
};

// Interactive Component Example
export function InteractiveBookingCard({ 
  package: pkg, 
  isSelected, 
  onSelect 
}: InteractiveBookingCardProps) {
  return (
    <div
      className={cn(
        'cursor-pointer rounded-lg border-2 p-6 transition-all duration-200',
        isSelected
          ? 'border-navy-500 bg-navy-50 shadow-lg'
          : 'border-gray-200 hover:border-navy-300 hover:bg-cream-50',
        animationStyles.hover.lift,
        animationStyles.pressed
      )}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className={typographyStyles.h5}>
          {pkg.name}
        </h3>
        <div className={cn(
          'h-4 w-4 rounded-full border-2 transition-colors duration-200',
          isSelected
            ? 'border-navy-500 bg-navy-500'
            : 'border-gray-300'
        )}>
          {isSelected && (
            <CheckIcon className="h-3 w-3 text-white" />
          )}
        </div>
      </div>
      
      <p className={cn(typographyStyles.body, 'mb-4')}>
        {pkg.description}
      </p>
      
      <div className="text-right">
        <span className="text-2xl font-bold text-navy-900">
          ${pkg.base_price_dollars}
        </span>
      </div>
    </div>
  );
}
```

---

## SECTION 8: DEVELOPMENT EXTENSION PATTERNS

### Adding New Pages Following Established Patterns

#### Creating New Customer Pages
```typescript
// Pattern: Customer Dashboard Subpage
// File: src/app/dashboard/settings/page.tsx

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function CustomerSettingsPage() {
  // 1. REQUIRED: Authentication guard
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  // 2. REQUIRED: Loading state during auth check
  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-900"></div>
      </div>
    );
  }

  // 3. PATTERN: Use MainLayout wrapper
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* 4. PATTERN: Page header with breadcrumb */}
        <div className="mb-8">
          <nav className="text-sm text-navy-600 mb-2">
            <Link href="/dashboard">Dashboard</Link>
            <span className="mx-2">/</span>
            <span>Settings</span>
          </nav>
          <h1 className="text-3xl font-serif font-bold text-navy-900">
            Account Settings
          </h1>
        </div>

        {/* 5. PATTERN: Content in Cards */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Profile Information</h2>
            </CardHeader>
            <CardContent>
              {/* Form content */}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Notification Preferences</h2>
            </CardHeader>
            <CardContent>
              {/* Settings content */}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
```

#### Creating New Staff Pages
```typescript
// Pattern: Staff Management Subpage
// File: src/app/staff/inventory/page.tsx

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStaffAuthStore } from '@/stores/staff-auth-store';
import { StaffLayout } from '@/components/staff/staff-layout';

export default function StaffInventoryPage() {
  // 1. REQUIRED: Staff authentication guard
  const { isAuthenticated, isLoading, staffProfile } = useStaffAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/staff/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // 2. OPTIONAL: Role-based access control
  const canAccessInventory = staffProfile?.role === 'admin' || 
                            staffProfile?.role === 'logistics_coordinator';

  if (!canAccessInventory) {
    return (
      <StaffLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-navy-900 mb-4">
            Access Denied
          </h1>
          <p className="text-navy-600">
            You don't have permission to access inventory management.
          </p>
        </div>
      </StaffLayout>
    );
  }

  // 3. PATTERN: Loading state
  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-900"></div>
      </div>
    );
  }

  // 4. PATTERN: Use StaffLayout wrapper
  return (
    <StaffLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-serif font-bold text-navy-900">
          Inventory Management
        </h1>
        {/* Page content */}
      </div>
    </StaffLayout>
  );
}
```

### Component Creation and Integration Guidelines

#### Creating Reusable Components
```typescript
// Pattern: Feature Component with Hooks Integration
// File: src/components/dashboard/notification-settings.tsx

'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

// 1. PATTERN: Define TypeScript interfaces
interface NotificationSettingsProps {
  currentSettings: {
    email_notifications: boolean;
    sms_notifications: boolean;
    marketing_emails: boolean;
  };
  customerId: string;
}

// 2. PATTERN: Zod validation schema
const NotificationSettingsSchema = z.object({
  email_notifications: z.boolean(),
  sms_notifications: z.boolean(),
  marketing_emails: z.boolean(),
});

type NotificationSettingsData = z.infer<typeof NotificationSettingsSchema>;

// 3. PATTERN: Component with full integration
export function NotificationSettings({ 
  currentSettings, 
  customerId 
}: NotificationSettingsProps) {
  const queryClient = useQueryClient();
  
  // 4. PATTERN: Form setup with React Hook Form + Zod
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<NotificationSettingsData>({
    resolver: zodResolver(NotificationSettingsSchema),
    defaultValues: currentSettings
  });

  // 5. PATTERN: TanStack Query mutation with optimistic updates
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: NotificationSettingsData) => {
      const response = await apiClient.put(
        `/api/customer/profile/notifications/`,
        data
      );
      return response.data;
    },
    onMutate: async (newSettings) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['customer', 'profile'] });
      
      // Optimistically update
      queryClient.setQueryData(['customer', 'profile'], (old: any) => ({
        ...old,
        ...newSettings
      }));
      
      return { previousSettings: currentSettings };
    },
    onError: (err, newSettings, context) => {
      // Rollback on error
      queryClient.setQueryData(['customer', 'profile'], context?.previousSettings);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', 'profile'] });
    }
  });

  // 6. PATTERN: Form submission handler
  const onSubmit = async (data: NotificationSettingsData) => {
    updateSettingsMutation.mutate(data);
  };

  // 7. PATTERN: Component JSX with consistent styling
  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-medium text-navy-900">
          Notification Preferences
        </h3>
        <p className="text-sm text-navy-600">
          Choose how you'd like to receive updates about your bookings.
        </p>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* 8. PATTERN: Form fields with proper labeling */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-navy-900">
                Email Notifications
              </label>
              <p className="text-xs text-navy-600">
                Booking confirmations and updates
              </p>
            </div>
            <Switch
              {...register('email_notifications')}
              defaultChecked={currentSettings.email_notifications}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-navy-900">
                SMS Notifications
              </label>
              <p className="text-xs text-navy-600">
                Real-time delivery updates
              </p>
            </div>
            <Switch
              {...register('sms_notifications')}
              defaultChecked={currentSettings.sms_notifications}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-navy-900">
                Marketing Emails
              </label>
              <p className="text-xs text-navy-600">
                Special offers and service updates
              </p>
            </div>
            <Switch
              {...register('marketing_emails')}
              defaultChecked={currentSettings.marketing_emails}
            />
          </div>

          {/* 9. PATTERN: Form actions */}
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => reset()}
              disabled={isSubmitting}
            >
              Reset
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting || updateSettingsMutation.isLoading}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
```

### API Integration Patterns for New Backend Endpoints

#### Standard CRUD Operations Pattern
```typescript
// Pattern: Complete CRUD API Integration
// File: src/hooks/use-customer-addresses.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { handleApiError } from '@/utils/api-errors';

// 1. PATTERN: TypeScript interfaces matching backend
interface CustomerAddress {
  id: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: 'NY' | 'CT' | 'NJ';
  zip_code: string;
  is_primary: boolean;
  nickname?: string;
  created_at: string;
}

interface CreateAddressData {
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: 'NY' | 'CT' | 'NJ';
  zip_code: string;
  nickname?: string;
  is_primary?: boolean;
}

// 2. PATTERN: Custom hook for data fetching
export function useCustomerAddresses() {
  return useQuery({
    queryKey: ['customer', 'addresses'],
    queryFn: async (): Promise<CustomerAddress[]> => {
      const response = await apiClient.get('/api/customer/addresses/');
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false;
      return failureCount < 3;
    }
  });
}

// 3. PATTERN: Create mutation with optimistic updates
export function useCreateAddress() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateAddressData): Promise<CustomerAddress> => {
      const response = await apiClient.post('/api/customer/addresses/', data);
      return response.data;
    },
    onMutate: async (newAddress) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['customer', 'addresses'] });
      
      // Snapshot previous value
      const previousAddresses = queryClient.getQueryData<CustomerAddress[]>(['customer', 'addresses']);
      
      // Optimistically update cache
      const optimisticAddress: CustomerAddress = {
        id: `temp-${Date.now()}`,
        ...newAddress,
        created_at: new Date().toISOString(),
      };
      
      queryClient.setQueryData(['customer', 'addresses'], (old: CustomerAddress[] = []) => [
        ...old,
        optimisticAddress
      ]);
      
      return { previousAddresses };
    },
    onError: (err, newAddress, context) => {
      // Rollback on error
      queryClient.setQueryData(['customer', 'addresses'], context?.previousAddresses);
      
      // Handle and display error
      const errorMessage = handleApiError(err);
      console.error('Failed to create address:', errorMessage);
    },
    onSettled: () => {
      // Always refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['customer', 'addresses'] });
    }
  });
}

// 4. PATTERN: Update mutation
export function useUpdateAddress() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      data 
    }: { 
      id: string; 
      data: Partial<CreateAddressData> 
    }): Promise<CustomerAddress> => {
      const response = await apiClient.put(`/api/customer/addresses/${id}/`, data);
      return response.data;
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['customer', 'addresses'] });
      
      const previousAddresses = queryClient.getQueryData<CustomerAddress[]>(['customer', 'addresses']);
      
      queryClient.setQueryData(['customer', 'addresses'], (old: CustomerAddress[] = []) =>
        old.map(address => 
          address.id === id 
            ? { ...address, ...data } 
            : address
        )
      );
      
      return { previousAddresses };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['customer', 'addresses'], context?.previousAddresses);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', 'addresses'] });
    }
  });
}

// 5. PATTERN: Delete mutation
export function useDeleteAddress() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/api/customer/addresses/${id}/`);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['customer', 'addresses'] });
      
      const previousAddresses = queryClient.getQueryData<CustomerAddress[]>(['customer', 'addresses']);
      
      queryClient.setQueryData(['customer', 'addresses'], (old: CustomerAddress[] = []) =>
        old.filter(address => address.id !== id)
      );
      
      return { previousAddresses };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(['customer', 'addresses'], context?.previousAddresses);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', 'addresses'] });
    }
  });
}

// 6. PATTERN: Component integration example
export function AddressList() {
  const { data: addresses, isLoading, error } = useCustomerAddresses();
  const deleteAddressMutation = useDeleteAddress();
  
  if (isLoading) return <div>Loading addresses...</div>;
  if (error) return <div>Error loading addresses</div>;
  
  return (
    <div className="space-y-4">
      {addresses?.map(address => (
        <Card key={address.id}>
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium">{address.nickname || 'Address'}</h4>
                <p className="text-sm text-gray-600">
                  {address.address_line_1}
                  {address.address_line_2 && `, ${address.address_line_2}`}
                </p>
                <p className="text-sm text-gray-600">
                  {address.city}, {address.state} {address.zip_code}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => deleteAddressMutation.mutate(address.id)}
                isLoading={deleteAddressMutation.isLoading}
              >
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

### Testing Patterns and Development Procedures

#### Component Testing Pattern
```typescript
// Pattern: Component Testing with React Testing Library
// File: src/components/ui/__tests__/button.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../button';

describe('Button Component', () => {
  // 1. PATTERN: Basic rendering tests
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  // 2. PATTERN: Variant testing
  it('applies correct variant styles', () => {
    render(<Button variant="primary">Primary Button</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-navy-900');
  });

  // 3. PATTERN: Interactive behavior testing
  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  // 4. PATTERN: Loading state testing
  it('shows loading state correctly', () => {
    render(<Button isLoading>Loading Button</Button>);
    const button = screen.getByRole('button');
    
    expect(button).toBeDisabled();
    expect(screen.getByRole('button')).toHaveClass('cursor-wait');
  });

  // 5. PATTERN: Accessibility testing
  it('supports keyboard navigation', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Keyboard Button</Button>);
    
    const button = screen.getByRole('button');
    button.focus();
    fireEvent.keyDown(button, { key: 'Enter' });
    
    expect(handleClick).toHaveBeenCalled();
  });
});
```

#### API Hook Testing Pattern
```typescript
// Pattern: Custom Hook Testing
// File: src/hooks/__tests__/use-customer-addresses.test.tsx

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCustomerAddresses } from '../use-customer-addresses';
import { apiClient } from '@/lib/api-client';

// Mock API client
jest.mock('@/lib/api-client');
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

// Test wrapper for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useCustomerAddresses', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. PATTERN: Successful data fetching
  it('fetches addresses successfully', async () => {
    const mockAddresses = [
      {
        id: '1',
        address_line_1: '123 Main St',
        city: 'New York',
        state: 'NY',
        zip_code: '10001',
        is_primary: true,
        created_at: '2024-01-01T00:00:00Z'
      }
    ];

    mockedApiClient.get.mockResolvedValueOnce({
      data: mockAddresses
    });

    const { result } = renderHook(() => useCustomerAddresses(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockAddresses);
    expect(mockedApiClient.get).toHaveBeenCalledWith('/api/customer/addresses/');
  });

  // 2. PATTERN: Error handling
  it('handles API errors gracefully', async () => {
    mockedApiClient.get.mockRejectedValueOnce(
      new Error('Network error')
    );

    const { result } = renderHook(() => useCustomerAddresses(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });
});
```

---

## SECTION 9: CONFIGURATION & BUILD REFERENCE

### Package.json Dependencies and Scripts

#### Complete Dependencies Analysis
```json
{
  "name": "frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",                    // Development server with hot reload
    "build": "next build",                // Production build with optimization
    "start": "next start",                // Production server
    "lint": "eslint",                     // ESLint code quality checks
    "type-check": "tsc --noEmit",         // TypeScript type checking
    "test": "jest",                       // Unit testing with Jest
    "test:watch": "jest --watch",         // Watch mode testing
    "test:coverage": "jest --coverage",   // Coverage reports
    "analyze": "ANALYZE=true npm run build" // Bundle analysis
  },
  "dependencies": {
    // Core Framework
    "next": "15.5.0",                     // Next.js App Router framework
    "react": "19.1.0",                    // React 19 with concurrent features
    "react-dom": "19.1.0",               // React DOM renderer
    
    // State Management
    "zustand": "^4.5.7",                 // Lightweight state management
    "@tanstack/react-query": "^5.87.1",  // Server state management & caching
    "@tanstack/react-query-devtools": "^5.87.1", // Query debugging tools
    
    // Forms & Validation
    "react-hook-form": "^7.62.0",        // Performant form library
    "@hookform/resolvers": "^3.10.0",    // Form validation resolvers
    "zod": "^3.25.76",                   // TypeScript schema validation
    
    // HTTP & API
    "axios": "^1.11.0",                  // HTTP client with interceptors
    
    // Payment Processing
    "@stripe/stripe-js": "^7.9.0",       // Stripe JavaScript SDK
    "@stripe/react-stripe-js": "^4.0.2", // Stripe React components
    
    // UI & Styling
    "tailwindcss": "^3.4.17",           // Utility-first CSS framework
    "@headlessui/react": "^2.2.7",      // Accessible UI components
    "@heroicons/react": "^2.2.0",       // Icon library
    "clsx": "^2.1.1",                   // Conditional className utility
    "tailwind-merge": "^2.6.0",         // Tailwind class merging utility
    
    // Build & Development Tools
    "typescript": "^5",                  // TypeScript support
    "autoprefixer": "^10.4.21",         // CSS autoprefixer
    "postcss": "^8.5.6",               // CSS processing
    "eslint": "^9",                      // Code linting
    "eslint-config-next": "15.5.0"      // Next.js ESLint configuration
  },
  "devDependencies": {
    // Type Definitions
    "@types/node": "^20",               // Node.js type definitions
    "@types/react": "^19",              // React type definitions
    "@types/react-dom": "^19",          // React DOM type definitions
    
    // Development Tools
    "@eslint/eslintrc": "^3",           // ESLint configuration system
    
    // Testing (Optional - not currently implemented)
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "jest": "^29.0.0",
    "jest-environment-jsdom": "^29.0.0"
  }
}
```

### Build Configuration and Environment Variables

#### Next.js Configuration (next.config.ts)
```typescript
// next.config.ts - Production-Ready Configuration
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build optimizations
  eslint: {
    ignoreDuringBuilds: true,           // Skip ESLint during builds for speed
  },
  typescript: {
    ignoreBuildErrors: true,            // Allow builds with TypeScript errors (dev only)
  },

  // Security headers for production
  async headers() {
    return [
      {
        source: '/(.*)',                 // Apply to all routes
        headers: [
          {
            key: 'X-Frame-Options',       // Prevent clickjacking
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options', // Prevent MIME sniffing
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',       // Control referrer leakage
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'X-XSS-Protection',      // XSS protection for older browsers
            value: '1; mode=block'
          },
          {
            key: 'Permissions-Policy',    // Restrict browser features
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Strict-Transport-Security', // Force HTTPS in production
            value: process.env.NODE_ENV === 'production' 
              ? 'max-age=31536000; includeSubDomains; preload' 
              : ''
          }
        ]
      }
    ]
  },

  // Production optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']         // Keep error/warn logs in production
    } : false
  },

  // Security: Remove source maps in production
  productionBrowserSourceMaps: false,

  // Image optimization
  images: {
    domains: ['totetaxi.com', 'api.totetaxi.com'],
    formats: ['image/webp', 'image/avif'] // Modern image formats
  },

  // React optimizations
  reactStrictMode: true,                // Enable React strict mode

  // Experimental features
  experimental: {
    esmExternals: true,                 // Enable ES modules for better bundling
  },

  // Custom webpack configuration
  webpack: (config, { dev, isServer }) => {
    // Disable ESLint plugin in production builds for performance
    if (!dev) {
      config.plugins = config.plugins.filter(
        (plugin: any) => plugin.constructor.name !== 'ESLintWebpackPlugin'
      );
    }

    // Bundle analyzer (optional)
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: true,
          reportFilename: isServer ? '../analyze/server.html' : './analyze/client.html'
        })
      );
    }

    return config;
  }
};

export default nextConfig;
```

#### TypeScript Configuration (tsconfig.json)
```json
{
  "compilerOptions": {
    // Language and compilation
    "target": "ES2017",                  // Target modern browsers
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,                     // Allow JavaScript files
    "skipLibCheck": true,                // Skip type checking of declaration files
    "strict": true,                      // Enable strict type checking
    "noEmit": true,                      // Don't emit files (Next.js handles this)
    "esModuleInterop": true,             // Enable ES module interop
    
    // Module resolution
    "module": "esnext",
    "moduleResolution": "bundler",       // Use bundler resolution
    "resolveJsonModule": true,           // Allow importing JSON files
    "isolatedModules": true,             // Ensure each file can be transpiled independently
    
    // JSX configuration
    "jsx": "preserve",                   // Preserve JSX for Next.js
    
    // Performance
    "incremental": true,                 // Enable incremental compilation
    
    // Next.js integration
    "plugins": [
      {
        "name": "next"                   // Next.js TypeScript plugin
      }
    ],
    
    // Path mapping for clean imports
    "paths": {
      "@/*": ["./src/*"]                 // Enable @/ imports from src directory
    }
  },
  "include": [
    "next-env.d.ts",                     // Next.js type definitions
    "**/*.ts",                           // All TypeScript files
    "**/*.tsx",                          // All TypeScript React files
    ".next/types/**/*.ts"                // Generated Next.js types
  ],
  "exclude": [
    "node_modules"                       // Exclude dependencies
  ]
}
```

#### Environment Variables Configuration
```bash
# .env.local - Local Development Environment
NEXT_PUBLIC_API_URL=http://localhost:8005
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# .env.production - Production Environment
NEXT_PUBLIC_API_URL=https://api.totetaxi.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# .env.staging - Staging Environment
NEXT_PUBLIC_API_URL=https://staging-api.totetaxi.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

```typescript
// Environment variable validation and usage
// src/lib/env.ts
const requiredEnvVars = {
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
} as const;

// Validate environment variables at build time
Object.entries(requiredEnvVars).forEach(([key, value]) => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

export const env = requiredEnvVars;
```

### Deployment Patterns and Optimization Settings

#### Netlify Deployment Configuration
```toml
# netlify.toml - Production Deployment
[build]
  publish = "out"                       # Output directory for static export
  command = "npm run build"             # Build command

[build.environment]
  NODE_VERSION = "18"                   # Node.js version
  NPM_VERSION = "9"                     # npm version

# Redirect rules for client-side routing
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# Headers for security and performance
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"

[[headers]]
  for = "/static/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"  # 1 year cache for static assets

# Form handling for contact forms
[forms]
  contact = "/contact"
```

#### Docker Configuration (Optional)
```dockerfile
# Dockerfile - Multi-stage build for production
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

#### Performance Optimization Settings
```typescript
// Performance monitoring and optimization
// src/lib/performance.ts

// Web Vitals monitoring
export function reportWebVitals(metric: any) {
  if (process.env.NODE_ENV === 'production') {
    // Send to analytics service
    console.log(metric);
  }
}

// Bundle size analysis command
// Add to package.json scripts:
{
  "analyze": "ANALYZE=true npm run build",
  "lighthouse": "lhci autorun"
}

// Lighthouse CI configuration
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000'],
      startServerCommand: 'npm start',
    },
    assert: {
      assertions: {
        'categories:performance': ['error', {minScore: 0.9}],
        'categories:accessibility': ['error', {minScore: 0.9}],
        'categories:best-practices': ['error', {minScore: 0.9}],
        'categories:seo': ['error', {minScore: 0.9}],
      },
    },
  },
};
```

#### Development Tools and Debugging Configuration
```typescript
// Development debugging setup
// src/lib/debug.ts

// React Query Devtools (development only)
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export function DevTools() {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <>
      <ReactQueryDevtools 
        initialIsOpen={false}
        position="bottom-right"
      />
      {/* Add other dev tools here */}
    </>
  );
}

// Error boundary for development
export class ErrorBoundary extends React.Component {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error, errorInfo);
    }
  }

  render() {
    if ((this.state as any).hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-800 mb-4">
              Something went wrong
            </h2>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return (this.props as any).children;
  }
}
```

This comprehensive living documentation provides complete executive function over the ToteTaxi frontend project development, enabling independent feature development, component modification, and seamless full-stack integration with the Django backend. The documentation covers every component architecture pattern, state management strategy, API integration method, and deployment configuration necessary for comprehensive frontend development at scale.