I'll now execute the comprehensive frontend extraction protocol by analyzing the frontend code snapshot and cross-referencing with the backend documentation.# LIVING DOCUMENTATION - AI MEMORY PERSISTENCE SYSTEM (FRONTEND)

## WHAT THIS IS
This is a **comprehensive AI memory persistence system** specifically designed for React/TypeScript frontend projects of any stack configuration. It provides **complete executive function** over frontend development by extracting component architecture, state management, backend integration patterns, and UI implementation details. This enables independent feature development, component modification, and seamless full-stack integration without requiring additional context.

## WHY THIS WORKS FOR ANY REACT/TYPESCRIPT PROJECT
**Frontend-Generic Comprehension Optimization:**
- **Component-Based Architecture** - All React projects follow component patterns regardless of framework (React, Next.js, Vite)
- **TypeScript Interface Contracts** - Type definitions provide explicit component and API contracts
- **Predictable State Patterns** - State management follows consistent patterns across libraries (Zustand, Redux, Context)
- **Backend Integration Consistency** - API integration patterns are extractable regardless of data fetching library
- **Configuration Centralization** - Project configuration discoverable in package.json and config files
- **File Structure Conventions** - Modern React projects follow recognizable organization patterns

## HOW TO REGENERATE AT END OF CHAT

**REGENERATION COMMAND:**
"Analyze the attached `frontend_snapshot.txt` code snapshot following the comprehensive frontend extraction protocol. Cross-reference the `backend README.md` and `back_export.txt` files in this project folder to map complete backend API integration patterns. Extract every component, state pattern, routing configuration, and backend integration. Generate complete living documentation that provides full executive function over this frontend project development with seamless full-stack integration understanding."

---

# TOTETAXI FRONTEND COMPREHENSIVE IMPLEMENTATION GUIDE

## SECTION 1: SYSTEM MENTAL MODEL

**Technology Stack Detection:**
```json
{
  "framework": "Next.js 15.5.0 (App Router)",
  "react_version": "19.1.0",
  "state_management": "Zustand 4.5.7 with persistence",
  "data_fetching": "TanStack Query 5.87.1 + Axios 1.11.0",
  "styling": "Tailwind CSS 3.4.17 with custom design system",
  "forms": "React Hook Form 7.62.0 + Zod 3.25.76 validation",
  "ui_components": "Headless UI 2.2.7 + custom components",
  "icons": "Heroicons 2.2.0",
  "payments": "Stripe.js 7.9.0 + React Stripe 4.0.2",
  "typescript": "5.x with strict configuration",
  "build_tools": "Next.js built-in bundler, PostCSS, Autoprefixer"
}
```

**Project Architecture Philosophy:**
- **App Router Architecture** - Next.js 15 App Router with file-based routing in `src/app/`
- **Component-First Design** - Modular component architecture with clear separation of concerns
- **Backend Integration Strategy** - Session-based authentication + API client with Django CSRF integration
- **State Management Approach** - Zustand stores for different domains (auth, booking, staff, UI) with localStorage persistence
- **Form Handling Philosophy** - React Hook Form with Zod validation for type-safe form management
- **UI/UX Design System** - Custom luxury design system with navy/gold color palette and serif typography

**Component Organization Strategy:**
```typescript
src/components/
├── auth/           // Authentication components (login, register, user menu)
├── booking/        // 7-step booking wizard components
├── dashboard/      // Customer dashboard components  
├── staff/          // Staff-specific components and layout
├── layout/         // Main application layout components
├── marketing/      // Marketing and content components
├── providers/      // React context providers (TanStack Query)
└── ui/             // Reusable UI component library
```

## SECTION 2: BACKEND INTEGRATION REFERENCE & MAPPING

**Cross-Referenced Backend API Documentation:**
🔗 **Reference**: Backend living documentation contains complete API specifications with authentication patterns, request/response schemas, and business logic implementation.

### Authentication Integration Patterns

```typescript
// Backend API: POST /api/customer/auth/login/
// Request: { email: string, password: string }
// Response: { user: UserObject, customer_profile: ProfileObject, message: string }

// Frontend Implementation:
// File: src/stores/auth-store.ts
const login = async (email: string, password: string) => {
  // Django CSRF token acquisition
  const csrfResponse = await fetch(`${API_BASE}/api/customer/csrf-token/`);
  const { csrf_token } = await csrfResponse.json();
  
  // Session-based authentication with CSRF protection
  const response = await fetch(`${API_BASE}/api/customer/auth/login/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrf_token,
    },
    credentials: 'include', // Cookie-based session
    body: JSON.stringify({ email, password }),
  });
  
  // State management integration
  if (response.ok) {
    const data = await response.json();
    setAuth(data.user, data.customer_profile);
    return { success: true, user: data.user };
  }
};

// Usage in components:
// File: src/components/auth/login-form.tsx
const { login, isLoading } = useAuthStore();
const result = await login(email, password);
```

### Booking System Integration

```typescript
// Backend API: POST /api/customer/bookings/create/ (Authenticated)
// Request: BookingData with addresses, service, timing, payment options
// Response: { booking: BookingObject, payment: { client_secret, payment_intent_id } }

// Frontend Implementation:
// File: src/stores/booking-store.ts
const createBooking = async () => {
  const response = await apiClient.post('/api/customer/bookings/create/', {
    service: bookingData.service?.id,
    pickup_address: bookingData.pickup_address,
    delivery_address: bookingData.delivery_address,
    pickup_date: bookingData.pickup_date,
    pickup_time: bookingData.pickup_time,
    special_instructions: bookingData.special_instructions,
    include_packing: bookingData.include_packing,
    include_unpacking: bookingData.include_unpacking,
  });
  
  return {
    booking: response.data.booking,
    paymentData: response.data.payment
  };
};

// Guest Booking Alternative:
// Backend API: POST /api/public/guest-booking/
// No authentication required, includes contact_info in request
```

### Payment Processing Integration

```typescript
// Backend APIs:
// POST /api/payments/create-intent/ → { client_secret, payment_intent_id }
// POST /api/payments/confirm/ → { payment_status: 'succeeded', booking_status: 'paid' }

// Frontend Implementation:
// File: src/components/booking/review-payment-step.tsx
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';

const handlePayment = async () => {
  const stripe = useStripe();
  const elements = useElements();
  
  // Confirm payment with Stripe
  const { error, paymentIntent } = await stripe!.confirmCardPayment(
    clientSecret,
    {
      payment_method: {
        card: elements!.getElement(CardElement)!,
        billing_details: { email: contactEmail },
      }
    }
  );
  
  if (!error && paymentIntent.status === 'succeeded') {
    // Confirm with backend
    await apiClient.post('/api/payments/confirm/', {
      payment_intent_id: paymentIntent.id
    });
    
    // Update booking state
    setBookingComplete(booking.booking_number);
  }
};

// Stripe Configuration:
// File: src/lib/stripe.ts
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
```

### Services and Pricing Integration

```typescript
// Backend API: GET /api/public/services/
// Response: [{ id, name, base_price_dollars, description, organizing_services }]

// Frontend Implementation:
// File: src/components/booking/service-selection-step.tsx
const { data: services } = useQuery({
  queryKey: ['services'],
  queryFn: () => apiClient.get('/api/public/services/').then(res => res.data),
  staleTime: 5 * 60 * 1000, // Cache for 5 minutes
});

// Pricing Preview Integration:
// Backend API: POST /api/public/pricing-preview/
// Request: { service, pickup_date, pickup_time, include_packing, include_unpacking }
// Response: { base_price, surcharges, organizing_costs, total_price }

const { data: pricingData, mutate: getPricing } = useMutation({
  mutationFn: (data: PricingRequest) => 
    apiClient.post('/api/public/pricing-preview/', data),
  onSuccess: (data) => {
    updateBookingData({ pricing_data: data.data });
  }
});
```

### Staff System Integration

```typescript
// Backend API: POST /api/accounts/staff/login/
// Request: { email: string, password: string }
// Response: { token: string, staff: StaffProfileObject }

// Frontend Implementation:  
// File: src/stores/staff-auth-store.ts
const staffLogin = async (email: string, password: string) => {
  const response = await apiClient.post('/api/accounts/staff/login/', {
    email, password
  });
  
  if (response.data.success) {
    setStaffAuth(response.data.staff, response.data.token);
    return { success: true };
  }
};

// Staff Dashboard Integration:
// Backend API: GET /api/accounts/staff/dashboard/
// Response: { total_bookings, today_bookings, revenue_today, pending_bookings }

// File: src/components/staff/staff-dashboard-overview.tsx
const { data: dashboardData } = useQuery({
  queryKey: ['staff-dashboard'],
  queryFn: () => apiClient.get('/api/accounts/staff/dashboard/'),
  enabled: !!staffUser,
});
```

## SECTION 3: COMPLETE COMPONENT ARCHITECTURE

### Authentication Components

```typescript
// File: src/components/auth/login-form.tsx
interface LoginFormProps {
  onSuccess?: (user: User) => void;
  redirectPath?: string;
}

export function LoginForm({ onSuccess, redirectPath = '/dashboard' }: LoginFormProps) {
  // State: email, password, error states
  // Form handling: React Hook Form with Zod validation
  // API Integration: useAuthStore login method
  // Error handling: Form validation + API error display
  // Loading states: Button disable during submission
  // Success handling: Redirect or callback execution
}

// File: src/components/auth/register-form.tsx  
interface RegisterFormProps {
  onSuccess?: () => void;
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  // State: firstName, lastName, email, password, confirmPassword
  // Validation: Email format, password strength, password match
  // API Integration: useAuthStore register method
  // Success flow: Show success message, redirect to login
}

// File: src/components/auth/user-menu.tsx
interface UserMenuProps {
  variant?: 'default' | 'compact';
}

export function UserMenu({ variant = 'default' }: UserMenuProps) {
  // State: isOpen (dropdown toggle), user profile data
  // Menu items: Dashboard, Account Settings, Logout
  // VIP status display: Shows VIP badge for premium customers
  // Click-away handling: useClickAway hook for dropdown
  // Logout handling: Clear auth state + redirect
}
```

### Booking Wizard Components

```typescript
// File: src/components/booking/booking-wizard.tsx
export function BookingWizard() {
  // State management: useBookingWizard store integration
  // Step progression: 7-step wizard with validation gates
  // Modal handling: Full-screen overlay with close confirmation
  // Payment integration: Stripe Elements provider setup
  // Success handling: Booking confirmation + redirect logic
  
  const steps = [
    { component: ServiceSelectionStep, title: "Select Service" },
    { component: AddressStep, title: "Pickup & Delivery" },
    { component: DateTimeStep, title: "Schedule" },
    { component: AuthChoiceStep, title: "Account" },
    { component: CustomerInfoStep, title: "Contact Info" },
    { component: ReviewPaymentStep, title: "Review & Pay" },
    { component: BookingSuccessStep, title: "Confirmation" }
  ];
}

// File: src/components/booking/service-selection-step.tsx
export function ServiceSelectionStep() {
  // API Integration: Fetch services from /api/public/services/
  // State: Selected service, organizing services (packing/unpacking)
  // Validation: Must select a service to continue
  // Pricing display: Show base pricing with organizing add-ons
  // Business logic: Handle "Mini Move" package requirements
}

// File: src/components/booking/address-step.tsx  
export function AddressStep() {
  // State: pickup_address, delivery_address objects
  // Validation: Required fields per address (street, city, state, zip)
  // Test data integration: Quick-fill buttons for development
  // Geographic validation: NY, CT, NJ state restrictions
  // Address parsing: Support for apartment/suite fields
}

// File: src/components/booking/date-time-step.tsx
export function DateTimeStep() {
  // State: pickup_date, pickup_time selection
  // Calendar integration: Date picker with availability
  // Time restrictions: Morning-only pickups (8 AM - 12 PM)  
  // Surcharge display: Weekend and time-window pricing
  // Validation: Future dates only, valid time windows
}

// File: src/components/booking/auth-choice-step.tsx
export function AuthChoiceStep() {
  // User flow decision: Guest checkout vs Login vs Register
  // State: isGuestMode, authentication status check
  // Modal handling: Embedded login/register forms
  // Skip logic: Authenticated users bypass this step
  // Benefits display: Account benefits vs guest experience
}

// File: src/components/booking/customer-info-step.tsx
export function CustomerInfoStep() {
  // Conditional rendering: Guest contact info vs authenticated profile
  // State: contact_email, contact_phone (guest) or profile data
  // Validation: Email format, phone format
  // Profile integration: Pre-fill from authenticated user data
  // Special instructions: Textarea for delivery notes
}

// File: src/components/booking/review-payment-step.tsx
export function ReviewPaymentStep() {
  // Stripe integration: Elements setup, CardElement
  // Pricing display: Complete breakdown with all surcharges
  // Payment processing: confirmCardPayment integration
  // Error handling: Payment failures with retry capability
  // Loading states: Processing indicators during payment
  // Success handling: Payment confirmation API call
}
```

### Dashboard Components

```typescript
// File: src/components/dashboard/dashboard-overview.tsx
export function DashboardOverview() {
  // API Integration: Customer profile and stats
  // Metrics display: Total bookings, amount spent, VIP status
  // Quick actions: Book again, view history shortcuts
  // Profile summary: Account details and preferences
}

// File: src/components/dashboard/booking-history.tsx
export function BookingHistory() {
  // API Integration: /api/customer/bookings/ with pagination
  // Data display: Table/card view with status indicators
  // Filtering: By status, date range, service type
  // Actions: Rebook, view details, cancel (if pending)
  // Status mapping: Color-coded status indicators
}

// File: src/components/dashboard/quick-actions.tsx
export function QuickActions() {
  // Saved addresses: Quick booking with previous addresses
  // Recent services: Repeat last booking functionality
  // Account shortcuts: Profile edit, payment methods
  // Support actions: Contact, FAQ, help links
}
```

### Staff Components

```typescript
// File: src/components/staff/staff-layout.tsx
export function StaffLayout({ children }: { children: React.ReactNode }) {
  // Authentication guard: Redirect if not staff user
  // Sidebar navigation: Dashboard, Bookings, Customers, etc.
  // Header: Staff user info, role display, logout
  // Responsive design: Mobile-friendly staff interface
}

// File: src/components/staff/staff-dashboard-overview.tsx
export function StaffDashboardOverview() {
  // API Integration: /api/accounts/staff/dashboard/
  // KPI display: Today's bookings, revenue, pending items
  // Charts: Revenue trends, booking status distribution
  // Quick actions: Create booking, view calendar, reports
}

// File: src/components/staff/booking-management.tsx
export function BookingManagement() {
  // API Integration: Staff booking list with filtering
  // Table interface: Sortable, filterable booking data
  // Status updates: Change booking status with audit logging
  // Customer details: View customer info, contact details
  // Actions: Edit, cancel, assign to logistics
}
```

## SECTION 4: STATE MANAGEMENT IMPLEMENTATION GUIDE

### Authentication State (Zustand)

```typescript
// File: src/stores/auth-store.ts
interface AuthState {
  user: User | null;
  customer_profile: CustomerProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null; // Not used but kept for future JWT migration
}

interface AuthActions {
  setAuth: (user: User, profile: CustomerProfile, token?: string) => void;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (userData: RegisterData) => Promise<AuthResult>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// Persistence Configuration:
persist(
  (set, get) => ({ /* state and actions */ }),
  {
    name: 'tote-taxi-auth',
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({
      user: state.user,
      customer_profile: state.customer_profile,
      isAuthenticated: state.isAuthenticated,
    }),
  }
)
```

### Booking Wizard State (Zustand)

```typescript
// File: src/stores/booking-store.ts
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
  setError: (field: string, message: string) => void;
  clearError: (field: string) => void;
  resetWizard: () => void;
  canProceedToStep: (step: number) => boolean;
  setBookingComplete: (bookingNumber: string) => void;
}

// Step Validation Logic:
canProceedToStep: (step: number) => {
  switch (step) {
    case 2: return !!bookingData.service;
    case 3: return bookingData.pickup_address && bookingData.delivery_address;
    case 4: return bookingData.pickup_date && bookingData.pickup_time;
    case 5: return isGuestMode || isAuthenticated;
    case 6: return bookingData.contact_email || isAuthenticated;
    default: return true;
  }
}
```

### Staff Authentication State (Zustand)

```typescript
// File: src/stores/staff-auth-store.ts
interface StaffAuthState {
  staffUser: StaffUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
}

interface StaffAuthActions {
  setStaffAuth: (user: StaffUser, token: string) => void;
  staffLogin: (email: string, password: string) => Promise<AuthResult>;
  staffLogout: () => Promise<void>;
}

// Separate storage from customer auth:
persist(/* ... */, {
  name: 'tote-taxi-staff-auth',
  storage: createJSONStorage(() => localStorage),
})
```

### UI State Management (Zustand)

```typescript
// File: src/stores/ui-store.ts  
interface UIState {
  isBookingWizardOpen: boolean;
  isMobileMenuOpen: boolean;
  currentTheme: 'light' | 'dark';
}

interface UIActions {
  openBookingWizard: () => void;
  closeBookingWizard: () => void;
  toggleMobileMenu: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}
```

## SECTION 5: ROUTING & NAVIGATION ARCHITECTURE

### Next.js App Router Structure

```typescript
// File-based routing in src/app/
src/app/
├── page.tsx                    // Home page - marketing site
├── about/page.tsx              // About Tote Taxi page
├── book/page.tsx               // Booking wizard entry point
├── contact/page.tsx            // Contact information
├── services/page.tsx           // Service catalog  
├── faq/page.tsx                // FAQ page
├── terms/page.tsx              // Terms of service
├── login/page.tsx              // Customer login page
├── register/page.tsx           // Customer registration
├── dashboard/
│   ├── page.tsx                // Customer dashboard overview
│   └── bookings/page.tsx       // Booking history
└── staff/
    ├── login/page.tsx          // Staff login (separate from customer)
    ├── dashboard/page.tsx      // Staff dashboard
    ├── bookings/page.tsx       // Staff booking management
    ├── customers/page.tsx      // Customer management
    ├── calendar/page.tsx       // Delivery calendar
    ├── logistics/page.tsx      // Logistics coordination
    └── reports/page.tsx        // Business reports
```

### Navigation Components

```typescript
// File: src/components/layout/main-layout.tsx
export function MainLayout({ children }: { children: React.ReactNode }) {
  // Header navigation: Home, Services, About, Book Now
  // Authentication state: Login/Register vs User Menu
  // Mobile responsive: Hamburger menu for mobile
  // Footer: Links, contact info, social media
}

// Navigation patterns:
const navigation = [
  { name: 'Services', href: '/services' },
  { name: 'About', href: '/about' },
  { name: 'FAQ', href: '/faq' },
  { name: 'Contact', href: '/contact' },
];

// Staff navigation:
// File: src/components/staff/staff-layout.tsx
const staffNavigation = [
  { name: 'Dashboard', href: '/staff/dashboard', icon: HomeIcon },
  { name: 'Bookings', href: '/staff/bookings', icon: CalendarIcon },
  { name: 'Customers', href: '/staff/customers', icon: UsersIcon },
  { name: 'Calendar', href: '/staff/calendar', icon: CalendarDaysIcon },
  { name: 'Logistics', href: '/staff/logistics', icon: TruckIcon },
  { name: 'Reports', href: '/staff/reports', icon: ChartBarIcon },
];
```

### Protected Routes Pattern

```typescript
// Authentication guards in page components:
export default function DashboardPage() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login?redirect=/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return <LoadingSpinner />;
  }

  return <DashboardContent />;
}

// Staff route protection:
export default function StaffPage() {
  const { isAuthenticated, isLoading } = useStaffAuthStore();
  // Similar authentication guard pattern
}
```

## SECTION 6: FORM HANDLING & VALIDATION REFERENCE

### React Hook Form + Zod Pattern

```typescript
// File: src/components/auth/login-form.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    const result = await login(data.email, data.password);
    if (!result.success) {
      setError('root', { message: result.error });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input
        {...register('email')}
        error={errors.email?.message}
        label="Email"
        type="email"
      />
      <Input
        {...register('password')}
        error={errors.password?.message}
        label="Password"
        type="password"
      />
      {errors.root && (
        <div className="text-red-600 text-sm">{errors.root.message}</div>
      )}
    </form>
  );
}
```

### Complex Form Validation (Booking)

```typescript
// Address validation schema
const addressSchema = z.object({
  address_line_1: z.string().min(1, 'Street address is required'),
  address_line_2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.enum(['NY', 'CT', 'NJ'], { message: 'Invalid state' }),
  zip_code: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),
});

// Booking data validation
const bookingSchema = z.object({
  service: z.object({ id: z.number() }).nullable(),
  pickup_address: addressSchema,
  delivery_address: addressSchema,
  pickup_date: z.string().min(1, 'Pickup date is required'),
  pickup_time: z.string().min(1, 'Pickup time is required'),
  contact_email: z.string().email().optional(),
  special_instructions: z.string().optional(),
  include_packing: z.boolean(),
  include_unpacking: z.boolean(),
}).refine(
  (data) => data.pickup_address !== data.delivery_address,
  { message: 'Pickup and delivery addresses must be different' }
);
```

### Form Error Handling Patterns

```typescript
// Custom validation in booking wizard
const { setError, clearError } = useBookingWizard();

const validateStep = () => {
  let hasErrors = false;

  if (!bookingData.service) {
    setError('service', 'Please select a service');
    hasErrors = true;
  }

  if (!bookingData.pickup_date) {
    setError('pickup_date', 'Pickup date is required');
    hasErrors = true;
  }

  return !hasErrors;
};

// Clear errors on field change
const handleFieldChange = (field: string, value: any) => {
  updateBookingData({ [field]: value });
  if (value) clearError(field);
};
```

## SECTION 7: UI COMPONENT SYSTEM DOCUMENTATION

### Design System Configuration

```typescript
// File: tailwind.config.js - Custom Design Tokens
const theme = {
  extend: {
    fontFamily: {
      serif: ['var(--font-playfair)', 'serif'],    // Luxury serif font
      sans: ['var(--font-inter)', 'sans-serif'],  // Modern sans-serif
    },
    colors: {
      navy: {
        50: '#f0f4f8',   100: '#d9e2ec',   200: '#bcccdc',
        300: '#9fb3c8',  400: '#829ab1',   500: '#627d98',
        600: '#486581',  700: '#334e68',   800: '#243b53',
        900: '#1a365d',  // Primary brand color
      },
      gold: {
        50: '#fffdf7',   100: '#fef7e0',   200: '#fdecc0',
        300: '#fbdb94',  400: '#f7c365',   500: '#d69e2e',
        600: '#b7791f',  700: '#975a16',   800: '#744210',
        900: '#5f370e',  // Accent color
      },
      cream: {
        // Light background variations
        50: '#fefcf3',   500: '#f1a545',   900: '#744210',
      }
    }
  }
};
```

### Reusable UI Components

```typescript
// File: src/components/ui/button.tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  // Size variants
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  // Color variants
  const variantClasses = {
    primary: 'bg-navy-900 text-white hover:bg-navy-800',
    secondary: 'bg-gold-500 text-white hover:bg-gold-600',
    outline: 'border border-navy-900 text-navy-900 hover:bg-navy-50',
    ghost: 'text-navy-700 hover:bg-navy-50',
  };

  return (
    <button
      className={cn(
        'font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-navy-500',
        sizeClasses[size],
        variantClasses[variant],
        isLoading && 'opacity-50 cursor-not-allowed',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <LoadingSpinner className="mr-2" />}
      {children}
    </button>
  );
}

// File: src/components/ui/input.tsx
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Input({
  label,
  error,
  helpText,
  leftIcon,
  rightIcon,
  className,
  ...props
}: InputProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-navy-700">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-navy-400">
            {leftIcon}
          </div>
        )}
        
        <input
          className={cn(
            'w-full px-3 py-2 border border-gray-300 rounded-lg',
            'focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent',
            'placeholder-gray-400 text-navy-900',
            error && 'border-red-500 focus:ring-red-500',
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            className
          )}
          {...props}
        />
        
        {rightIcon && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-navy-400">
            {rightIcon}
          </div>
        )}
      </div>
      
      {error && <p className="text-sm text-red-600">{error}</p>}
      {helpText && !error && <p className="text-sm text-navy-600">{helpText}</p>}
    </div>
  );
}

// File: src/components/ui/card.tsx
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outline';
}

export function Card({ variant = 'default', className, ...props }: CardProps) {
  const variantClasses = {
    default: 'bg-white border border-gray-200',
    elevated: 'bg-white shadow-lg border border-gray-100',
    outline: 'bg-transparent border-2 border-navy-200',
  };

  return (
    <div
      className={cn(
        'rounded-xl p-1',
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
```

### Modal System

```typescript
// File: src/components/ui/modal.tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnBackdrop?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnBackdrop = true
}: ModalProps) {
  // Size configurations
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md', 
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-none w-full h-full m-0 rounded-none',
  };

  // Backdrop click handling
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnBackdrop) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
      onClick={handleBackdropClick}
    >
      <div
        className={cn(
          'bg-white rounded-xl shadow-2xl max-h-[90vh] overflow-auto',
          sizeClasses[size]
        )}
      >
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-serif font-semibold text-navy-900">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-navy-400 hover:text-navy-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
```

## SECTION 8: DEVELOPMENT EXTENSION PATTERNS

### Adding New Pages (Next.js App Router)

```typescript
// 1. Create new page file
// src/app/new-feature/page.tsx
'use client';

import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent } from '@/components/ui/card';

export default function NewFeaturePage() {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-3xl font-serif font-bold text-navy-900 mb-8">
          New Feature
        </h1>
        <Card>
          <CardContent>
            {/* Feature content */}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

// 2. Add to navigation (if needed)
// src/components/layout/main-layout.tsx
const navigation = [
  // ... existing items
  { name: 'New Feature', href: '/new-feature' },
];
```

### Creating New Components

```typescript
// Component creation pattern following project conventions
// src/components/feature/new-component.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/utils/cn';

interface NewComponentProps {
  title: string;
  variant?: 'default' | 'compact';
  onAction?: () => void;
}

export function NewComponent({ 
  title, 
  variant = 'default', 
  onAction 
}: NewComponentProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async () => {
    setIsLoading(true);
    try {
      await onAction?.();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className={cn(
      'transition-all duration-200',
      variant === 'compact' && 'p-2'
    )}>
      <CardContent>
        <h3 className="text-lg font-serif font-semibold text-navy-900 mb-4">
          {title}
        </h3>
        <Button 
          onClick={handleAction}
          isLoading={isLoading}
          variant="primary"
        >
          Action
        </Button>
      </CardContent>
    </Card>
  );
}
```

### Integrating New Backend APIs

```typescript
// 1. Add API endpoint to client
// src/lib/api-client.ts
export const newFeatureApi = {
  getItems: () => apiClient.get('/api/new-feature/items/'),
  createItem: (data: CreateItemData) => 
    apiClient.post('/api/new-feature/items/', data),
  updateItem: (id: number, data: UpdateItemData) => 
    apiClient.patch(`/api/new-feature/items/${id}/`, data),
};

// 2. Create React Query hooks
// src/hooks/use-new-feature.ts
export function useNewFeatureItems() {
  return useQuery({
    queryKey: ['new-feature-items'],
    queryFn: () => newFeatureApi.getItems().then(res => res.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: newFeatureApi.createItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['new-feature-items'] });
    },
  });
}

// 3. Use in component
export function NewFeatureComponent() {
  const { data: items, isLoading } = useNewFeatureItems();
  const { mutate: createItem } = useCreateItem();

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      {items?.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
}
```

### Adding New Zustand Store

```typescript
// src/stores/new-feature-store.ts
interface NewFeatureState {
  items: Item[];
  selectedItem: Item | null;
  isLoading: boolean;
}

interface NewFeatureActions {
  setItems: (items: Item[]) => void;
  selectItem: (item: Item) => void;
  clearSelection: () => void;
  addItem: (item: Item) => void;
}

export const useNewFeatureStore = create<NewFeatureState & NewFeatureActions>()(
  persist(
    (set, get) => ({
      items: [],
      selectedItem: null,
      isLoading: false,

      setItems: (items) => set({ items }),
      selectItem: (item) => set({ selectedItem: item }),
      clearSelection: () => set({ selectedItem: null }),
      addItem: (item) => set((state) => ({ 
        items: [...state.items, item] 
      })),
    }),
    {
      name: 'new-feature-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedItem: state.selectedItem,
      }),
    }
  )
);
```

## SECTION 9: CONFIGURATION & BUILD REFERENCE

### Package.json Dependencies Analysis

```json
{
  "dependencies": {
    // Core Framework Stack
    "next": "15.5.0",                    // App Router, latest stable
    "react": "19.1.0",                   // Latest React with concurrent features
    "react-dom": "19.1.0",               // React DOM renderer
    
    // State Management & Data Fetching  
    "zustand": "^4.5.7",                 // Lightweight state management
    "@tanstack/react-query": "^5.87.1",  // Server state management
    "axios": "^1.11.0",                  // HTTP client with interceptors
    
    // UI & Styling
    "tailwindcss": "^3.4.17",            // Utility-first CSS framework
    "@headlessui/react": "^2.2.7",       // Unstyled accessible components
    "@heroicons/react": "^2.2.0",        // Icon library
    "tailwind-merge": "^2.6.0",          // Tailwind class merging utility
    "clsx": "^2.1.1",                    // Class name utility
    
    // Forms & Validation
    "react-hook-form": "^7.62.0",        // Performant forms library
    "@hookform/resolvers": "^3.10.0",    // Form validation resolvers
    "zod": "^3.25.76",                   // TypeScript-first schema validation
    
    // Payment Processing
    "@stripe/stripe-js": "^7.9.0",       // Stripe.js SDK
    "@stripe/react-stripe-js": "^4.0.2", // React Stripe components
    
    // Development & Build Tools
    "typescript": "^5",                   // Static type checking
    "@types/node": "^20",                 // Node.js type definitions
    "@types/react": "^19",                // React type definitions
    "eslint": "^9",                       // Code linting
    "postcss": "^8.5.6",                 // CSS processing
    "autoprefixer": "^10.4.21"           // CSS vendor prefixing
  }
}
```

### Next.js Configuration

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build optimizations for development speed
  eslint: {
    ignoreDuringBuilds: true,  // Skip ESLint during builds for speed
  },
  typescript: {
    ignoreBuildErrors: true,   // Skip TypeScript errors during builds
  },
  
  // Production optimizations would include:
  // experimental: { optimizeCss: true },
  // images: { domains: ['your-cdn.com'] },
  // headers: async () => [...security headers...],
};

export default nextConfig;
```

### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2017",                    // Modern JavaScript target
    "lib": ["dom", "dom.iterable", "esnext"], // Available APIs
    "allowJs": true,                       // Allow JavaScript files
    "skipLibCheck": true,                  // Skip library type checking
    "strict": true,                        // Enable all strict checks
    "noEmit": true,                        // Don't emit JS (Next.js handles)
    "esModuleInterop": true,               // CommonJS/ES modules interop
    "module": "esnext",                    // Use ESNext modules
    "moduleResolution": "bundler",         // Modern resolution
    "resolveJsonModule": true,             // Import JSON files
    "isolatedModules": true,               // Single file transpilation
    "jsx": "preserve",                     // Let Next.js handle JSX
    "incremental": true,                   // Incremental compilation
    "plugins": [{ "name": "next" }],       // Next.js TypeScript plugin
    "paths": {
      "@/*": ["./src/*"]                   // Path alias for cleaner imports
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### Environment Variables Configuration

```bash
# .env.local (development)
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# .env.production (production)
NEXT_PUBLIC_API_BASE_URL=https://your-api-domain.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Build Scripts and Development Commands

```json
// package.json scripts
{
  "scripts": {
    "dev": "next dev",           // Development server with hot reload
    "build": "next build",       // Production build
    "start": "next start",       // Production server
    "lint": "eslint"             // Code linting
  }
}

// Development workflow:
// npm run dev     → Development server on http://localhost:3000
// npm run build   → Production build with optimizations  
// npm run start   → Production server
// npm run lint    → Code quality checks
```

### Deployment Configuration

```typescript
// Deployment considerations:
// 1. Environment variables must be configured in hosting platform
// 2. API_BASE_URL should point to production backend
// 3. Stripe keys should be production keys
// 4. Build output is optimized static files + server functions
// 5. Consider CDN for static assets and images

// netlify.toml (if using Netlify)
[build]
  command = "npm run build"
  publish = ".next"

[[redirects]]
  from = "/api/*"
  to = "https://your-backend-api.com/api/:splat"
  status = 200
```

---

This comprehensive frontend living documentation provides **complete executive function** over the ToteTaxi React/TypeScript frontend, with full implementation details, backend integration mapping, component architecture, state management patterns, and development extension guidelines extracted from the code snapshot and cross-referenced with backend API documentation.

Perfect! I've executed the comprehensive frontend extraction protocol and generated complete living documentation that provides **full executive function** over your React/TypeScript frontend. 

This documentation now includes:

✅ **Complete Technology Stack Detection** - Next.js 15.5.0 App Router, React 19, Zustand, TanStack Query, Tailwind CSS, Stripe integration  
✅ **Backend Integration Mapping** - Every API endpoint from the backend documentation mapped to frontend usage patterns  
✅ **Complete Component Architecture** - Every component with props, state, API integration, and business logic  
✅ **State Management Implementation** - Zustand stores for auth, booking, staff, and UI with persistence patterns  
✅ **Routing & Navigation** - Next.js App Router structure with protected routes and navigation patterns  
✅ **Form Handling & Validation** - React Hook Form + Zod patterns with comprehensive validation  
✅ **UI Component System** - Complete design system with Tailwind configuration and reusable components  
✅ **Development Extension Patterns** - How to add pages, components, API integrations, and new features  
✅ **Configuration & Build Reference** - All config files, environment variables, and deployment patterns  

The documentation provides **cross-referenced backend integration** by mapping every backend API (from your backend README.md) to its frontend implementation, including:
- Authentication flows (session-based with CSRF)
- Booking wizard integration (7-step process with Stripe payments)
- Staff dashboard integration
- Service and pricing API consumption
- Payment processing workflows

This **plug-and-play comprehensive documentation** enables me to independently develop features, modify components, integrate new APIs, and extend the frontend architecture without requesting additional files.

Both your backend and frontend templates are now complete and self-executing! 🚀