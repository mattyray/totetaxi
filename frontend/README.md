I'll generate the frontend living documentation for you. First, let me search for the frontend code snapshot and related files.# TOTETAXI FRONTEND - LIVING DOCUMENTATION
**AI Memory Persistence System - Complete React/TypeScript Project Reference**

Generated: 2025-09-26 | Files Analyzed: 69 | Framework: Next.js 15.5.0 + TypeScript

---

## SECTION 1: SYSTEM MENTAL MODEL

### Technology Stack Detection & Project Philosophy
ToteTaxi implements a luxury delivery service frontend using **Next.js 15.5.0 App Router** with **TypeScript**, designed around seamless full-stack integration and premium user experience:

**Core Technology Stack:**
```typescript
Framework: Next.js 15.5.0 (App Router)
Language: TypeScript 5.x with strict mode
Runtime: React 19.1.0 with React DOM 19.1.0
Styling: Tailwind CSS 3.4.17 + Custom design system
State Management: Zustand 4.5.7 with persistence middleware
Data Fetching: TanStack Query 5.87.1 with Axios 1.11.0
Form Management: React Hook Form 7.62.0 + Zod 3.25.76 validation
Payment Processing: Stripe.js 7.9.0 with React Stripe.js 4.0.2
UI Components: HeadlessUI 2.2.7 + Heroicons 2.2.0
Utilities: clsx 2.1.1 + tailwind-merge 2.6.0
```

### Component Architecture & Organization Strategy
**File Structure Philosophy:**
```
src/app/                 → Next.js 15 App Router pages (file-based routing)
src/components/          → Feature-grouped component organization
  ├── auth/              → Authentication flows (login, register, user menu)
  ├── booking/           → Multi-step booking wizard system
  ├── dashboard/         → Customer dashboard and booking history
  ├── staff/             → Staff management interface components
  ├── ui/                → Reusable design system components
  ├── layout/            → Layout and navigation components
  └── providers/         → Context providers and app-level utilities

src/stores/              → Zustand state management stores
src/lib/                 → Configuration and utility libraries
src/hooks/               → Custom React hooks
src/types/               → TypeScript interface definitions
src/utils/               → Utility functions and helpers
```

### State Management Approach & Data Flow Patterns
**Zustand-Centered Architecture:**
- **Customer Authentication**: `auth-store.ts` - User sessions, profiles, login/logout
- **Staff Authentication**: `staff-auth-store.ts` - Staff user management and permissions
- **Booking Wizard**: `booking-store.ts` - Multi-step form state with persistence
- **UI State**: `ui-store.ts` - Notifications, modals, loading states

**Data Flow Philosophy:**
```
API Client (Axios) → TanStack Query → Zustand Stores → React Components
└── CSRF Token Handling → Error Interceptors → Cache Management → UI Updates
```

### Backend Integration Philosophy & API Consumption Strategy
**Seamless Full-Stack Integration:**
- **Base URL**: `http://localhost:8005` (development) → Django backend
- **Authentication**: Session-based with CSRF protection
- **Error Handling**: Axios interceptors with automatic token refresh
- **Cache Strategy**: TanStack Query with 5-minute stale time, 30-minute garbage collection
- **Request Interceptors**: Automatic CSRF token injection for mutations

---

## SECTION 2: BACKEND INTEGRATION REFERENCE & MAPPING

### Complete Backend API Endpoint Catalog & Frontend Usage

#### Customer Authentication Flow
**Backend API**: `POST /api/customers/auth/login/`
- **Request Schema**: `{ email: string, password: string }`
- **Response Schema**: `{ user: DjangoUser, profile: CustomerProfile }`
- **Frontend Implementation**:
  ```typescript
  // Auth Store Action
  login: async (email: string, password: string) => {
    const response = await apiClient.post('/api/customers/auth/login/', { email, password });
    setAuth(response.data.user, response.data.profile);
  }
  
  // Component Usage
  const { login } = useAuthStore();
  const loginMutation = useMutation({
    mutationFn: ({ email, password }) => login(email, password),
    onSuccess: () => router.push('/dashboard')
  });
  ```

**Backend API**: `POST /api/customers/auth/register/`
- **Frontend Integration**: `auth-store.ts` register action + `register-form.tsx` component
- **Validation**: Zod schema validation before backend submission
- **Error Handling**: Form-level error display + global error notification

#### Service Catalog Integration
**Backend API**: `GET /api/bookings/services/`
- **Response**: Mini-move packages, standard delivery, specialty items, organizing services
- **Frontend Usage**: 
  ```typescript
  // Service Selection Step
  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: () => apiClient.get('/api/bookings/services/').then(res => res.data)
  });
  ```

**Backend API**: `POST /api/bookings/pricing-preview/`
- **Frontend Integration**: Real-time price calculation in booking wizard
- **State Management**: Pricing data stored in `booking-store.ts`

#### Booking Management Flow
**Backend API**: `POST /api/bookings/guest-booking/`
- **Frontend Implementation**: Guest checkout flow in `review-payment-step.tsx`
- **Stripe Integration**: PaymentElement with backend payment intent creation

**Backend API**: `GET /api/customers/dashboard/`
- **Frontend Usage**: Customer dashboard overview with booking history
- **Cache Strategy**: User-specific query keys to prevent cross-contamination

#### Staff Management Integration
**Backend API**: `POST /api/staff/auth/login/`
- **Frontend Store**: Separate `staff-auth-store.ts` with role-based permissions
- **Route Protection**: Staff-only pages with authentication guards

### Authentication Flow & Token Management
**CSRF Token Handling:**
```typescript
// API Client Configuration
apiClient.interceptors.request.use(async (config) => {
  if (['post', 'put', 'patch', 'delete'].includes(config.method!)) {
    const csrfResponse = await axios.get(`${config.baseURL}/api/customers/csrf-token/`);
    config.headers['X-CSRFToken'] = csrfResponse.data.csrf_token;
  }
  return config;
});
```

**Session Management:**
- **Storage**: Zustand persistence middleware with localStorage
- **Automatic Logout**: 401 response interceptor triggers auth store clearance
- **Session Cleanup**: Booking wizard reset on logout

### Type Definitions & Schema Validation
**Frontend Types Matching Backend Schemas:**
```typescript
// src/types/index.ts - Mirrors backend models
interface DjangoUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
}

interface CustomerProfile {
  phone: string;
  preferred_pickup_time: string;
  marketing_consent: boolean;
  total_bookings: number;
  loyalty_tier: string;
}

interface BookingData {
  service_type: 'mini_move' | 'standard_delivery' | 'specialty_item';
  mini_move_package_id?: string;
  pickup_date?: string;
  pickup_address?: BookingAddress;
  pricing_data?: PricingData;
}
```

---

## SECTION 3: COMPLETE COMPONENT ARCHITECTURE

### Authentication Components

#### LoginForm Component
**File**: `src/components/auth/login-form.tsx`
**Props Interface**: None (self-contained)
**State Management**: 
- React Hook Form with Zod validation
- Auth store integration for login mutation
- Error state management

**Business Logic:**
```typescript
const loginMutation = useMutation({
  mutationFn: async (data: LoginForm) => {
    const result = await login(data.email, data.password);
    if (!result.success) throw new Error(result.error);
    return result.user;
  },
  onSuccess: () => router.push('/dashboard'),
  onError: (error) => setApiError(error.message)
});
```

**Form Validation Schema:**
```typescript
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required')
});
```

#### RegisterForm Component
**File**: `src/components/auth/register-form.tsx`
**State**: Registration form state + confirmation modal
**API Integration**: Customer registration endpoint
**Validation**: Email uniqueness, password confirmation

#### UserMenu Component
**File**: `src/components/auth/user-menu.tsx`
**Props Interface**: `{ variant?: 'header' | 'mobile' }`
**State**: Dropdown visibility with useClickAway hook
**Features**: Profile management, logout functionality

### Booking System Components

#### BookingWizard Component
**File**: `src/components/booking/booking-wizard.tsx`
**State Management**: Central wizard orchestration
**Steps Configuration:**
```typescript
const STEPS = [
  { number: 0, title: 'Get Started', component: AuthChoiceStep },
  { number: 1, title: 'Select Service', component: ServiceSelectionStep },
  { number: 2, title: 'Date & Time', component: DateTimeStep },
  { number: 3, title: 'Addresses', component: AddressStep },
  { number: 4, title: 'Your Info', component: CustomerInfoStep },
  { number: 5, title: 'Review & Pay', component: ReviewPaymentStep }
];
```

**Navigation Logic:**
- Step validation before progression
- Persistent state across page refreshes
- Guest vs authenticated user flow differentiation

#### ServiceSelectionStep Component
**File**: `src/components/booking/service-selection-step.tsx`
**API Integration**: Service catalog fetching with TanStack Query
**State Updates**: Booking store mutations for service selection
**Validation**: Service-specific constraints (item limits, weight restrictions)

**Business Logic:**
```typescript
const pricingMutation = useMutation({
  mutationFn: async () => {
    const response = await apiClient.post('/api/bookings/pricing-preview/', bookingData);
    return response.data;
  },
  onSuccess: (pricingData) => {
    updateBookingData({ pricing_data: pricingData });
  }
});
```

#### ReviewPaymentStep Component
**File**: `src/components/booking/review-payment-step.tsx`
**Stripe Integration**: PaymentElement with payment intent handling
**Dual Flow Support**: Guest booking vs authenticated user booking
**State Management**: Payment processing states and error handling

### Dashboard Components

#### DashboardOverview Component
**File**: `src/components/dashboard/dashboard-overview.tsx`
**API Integration**: Customer dashboard data fetching
**Features**: Recent bookings, quick actions, profile summary
**Navigation**: Integrated routing to booking creation and history

#### BookingHistory Component
**File**: `src/components/dashboard/booking-history.tsx`
**Query Implementation:**
```typescript
const { data, isLoading } = useQuery({
  queryKey: ['customer', 'bookings', user?.id, searchTerm, statusFilter],
  queryFn: async () => {
    const params = new URLSearchParams();
    if (searchTerm) params.append('search', searchTerm);
    const response = await apiClient.get(`/api/customers/bookings/?${params}`);
    return response.data;
  }
});
```

### Staff Management Components

#### StaffLoginForm Component
**File**: `src/components/staff/staff-login-form.tsx`
**Authentication**: Staff-specific authentication flow
**Store Integration**: `useStaffAuthStore` for staff session management
**Route Protection**: Automatic redirect to staff dashboard

#### BookingManagement Component
**File**: `src/components/staff/booking-management.tsx`
**Features**: Booking filtering, status updates, customer management
**API Integration**: Staff booking endpoints with advanced filtering

### UI System Components

#### Button Component
**File**: `src/components/ui/button.tsx`
**Variant System:**
```typescript
const buttonVariants = {
  variant: {
    default: 'bg-navy-900 text-white hover:bg-navy-800',
    primary: 'bg-gold-600 text-white hover:bg-gold-700',
    outline: 'border-2 border-navy-900 text-navy-900 hover:bg-navy-900 hover:text-white',
    ghost: 'text-navy-900 hover:bg-navy-100',
    luxury: 'bg-gradient-to-r from-gold-500 to-gold-600 text-white hover:from-gold-600'
  }
};
```

#### Card Component
**File**: `src/components/ui/card.tsx`
**Subcomponents**: CardHeader, CardContent, CardFooter
**Variant System**: Default, luxury, elevated with customizable padding and styling

#### Input Component
**File**: `src/components/ui/input.tsx`
**Features**: Error states, label integration, validation styling
**Accessibility**: Proper ARIA labels and focus management

### Layout Components

#### MainLayout Component
**File**: `src/components/layout/main-layout.tsx`
**Features**: 
- Responsive navigation with mobile menu
- User authentication integration
- Booking wizard trigger functionality
- Footer with contact information

---

## SECTION 4: STATE MANAGEMENT IMPLEMENTATION GUIDE

### Complete State Architecture & Organization

#### Customer Authentication Store
**File**: `src/stores/auth-store.ts`
**State Structure:**
```typescript
interface AuthState {
  user: DjangoUser | null;
  customerProfile: CustomerProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
```

**Actions Implementation:**
```typescript
interface AuthActions {
  setAuth: (user: DjangoUser, profile: CustomerProfile) => void;
  clearAuth: () => void;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (data: RegisterData) => Promise<AuthResult>;
  logout: () => Promise<void>;
}
```

**Persistence Strategy:**
- localStorage persistence with Zustand middleware
- Partial state serialization (excludes isLoading)
- Cross-tab synchronization support

#### Booking Wizard Store
**File**: `src/stores/booking-store.ts`
**Complex State Management:**
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
}
```

**Advanced Actions:**
```typescript
// Step navigation with validation
nextStep: () => {
  if (get().canProceedToNextStep()) {
    set(state => ({ currentStep: state.currentStep + 1 }));
  }
},

// Smart wizard reset logic
resetWizard: (preserveUserContext = false) => {
  set(state => ({
    currentStep: 0,
    bookingData: {},
    errors: {},
    isBookingComplete: false,
    userId: preserveUserContext ? state.userId : undefined,
    lastResetTimestamp: Date.now()
  }));
}
```

**Guest Mode Handling:**
```typescript
// Guest user persistence with cleanup
const persistConfig = {
  storage: {
    getItem: (name: string) => {
      const item = localStorage.getItem(name);
      const persistedState = JSON.parse(item || '{}');
      
      // Clean up expired guest sessions
      if (persistedState?.isGuestMode && 
          Date.now() - persistedState.lastResetTimestamp > 24 * 60 * 60 * 1000) {
        return { userId: 'guest', isGuestMode: true, lastResetTimestamp: Date.now() };
      }
      
      return persistedState;
    }
  }
}
```

#### Staff Authentication Store
**File**: `src/stores/staff-auth-store.ts`
**Role-Based State:**
```typescript
interface StaffProfile {
  role: 'staff' | 'admin';
  department: string;
  permissions: {
    can_approve_refunds: boolean;
    can_manage_staff: boolean;
    can_view_financial_reports: boolean;
  };
}
```

### Backend Synchronization Patterns
**Optimistic Updates:**
```typescript
// Booking status updates with rollback
updateBookingStatus: async (bookingId: string, newStatus: string) => {
  const previousBookings = get().bookings;
  
  // Optimistic update
  set(state => ({
    bookings: state.bookings.map(b => 
      b.id === bookingId ? { ...b, status: newStatus } : b
    )
  }));
  
  try {
    await apiClient.patch(`/api/staff/bookings/${bookingId}/`, { status: newStatus });
  } catch (error) {
    // Rollback on failure
    set({ bookings: previousBookings });
    throw error;
  }
}
```

### Form State Integration
**React Hook Form + Zustand Pattern:**
```typescript
// Form component integration
const form = useForm<AddressForm>({
  defaultValues: bookingData.pickup_address,
  resolver: zodResolver(addressSchema)
});

// Sync form changes to store
const handleAddressUpdate = (data: AddressForm) => {
  updateBookingData({ pickup_address: data });
  triggerPricingRecalculation();
};
```

---

## SECTION 5: ROUTING & NAVIGATION ARCHITECTURE

### Complete Route Structure & Navigation Patterns

#### Public Route Structure
```
/ (page.tsx)                    → Homepage with hero section and booking CTA
├── /about (page.tsx)           → Company story and service information
├── /services (page.tsx)        → Service catalog and pricing information
├── /contact (page.tsx)         → Contact form and business information
├── /faq (page.tsx)             → Frequently asked questions
├── /terms (page.tsx)           → Terms of service
├── /login (page.tsx)           → Customer authentication
├── /register (page.tsx)        → Customer registration
└── /book (page.tsx)            → Public booking wizard entry point
```

#### Protected Customer Routes
```
/dashboard (page.tsx)           → Customer dashboard overview
├── /dashboard/bookings (page.tsx) → Booking history and management
└── /dashboard/profile (page.tsx)  → Profile settings and preferences
```

#### Staff-Only Routes
```
/staff/login (page.tsx)         → Staff authentication
/staff/dashboard (page.tsx)     → Staff operational dashboard
├── /staff/bookings (page.tsx)     → Booking management interface
├── /staff/bookings/[id] (page.tsx) → Individual booking detail view
├── /staff/customers (page.tsx)     → Customer management interface
├── /staff/customers/[id] (page.tsx) → Customer detail and history
├── /staff/calendar (page.tsx)      → Booking calendar and scheduling
├── /staff/logistics (page.tsx)     → Delivery coordination
└── /staff/reports (page.tsx)       → Analytics and reporting
```

### Authentication Guards & Route Protection

#### Customer Route Protection Pattern
```typescript
// Dashboard page protection
'use client';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated || !user) {
    return <div>Loading...</div>;
  }

  return <DashboardContent />;
}
```

#### Staff Route Protection Pattern
```typescript
// Staff page protection with role checking
export default function StaffBookingsPage() {
  const { isAuthenticated, staffProfile, isLoading } = useStaffAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/staff/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return <LoadingSpinner />;
  }

  return <BookingManagement />;
}
```

### Navigation Components & Menu Systems

#### MainLayout Navigation
**File**: `src/components/layout/main-layout.tsx`
**Features**:
- Responsive navigation with mobile hamburger menu
- Authentication-aware menu items
- Booking wizard trigger integration
- User menu with profile dropdown

**Navigation Items Configuration:**
```typescript
const navigation = [
  { name: 'Home', href: '/' },
  { name: 'Services', href: '/services' },
  { name: 'About', href: '/about' },
  { name: 'Contact', href: '/contact' },
  { name: 'FAQ', href: '/faq' },
];

const authenticatedNavigation = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'My Bookings', href: '/dashboard/bookings' },
];
```

#### StaffLayout Navigation
**File**: `src/components/staff/staff-layout.tsx`
**Features**:
- Role-based menu visibility
- Active route highlighting
- Quick action buttons
- Staff user information display

### Dynamic Routing & Parameter Handling

#### Booking Detail Routes
```typescript
// /staff/bookings/[id]/page.tsx
interface BookingDetailPageProps {
  params: { id: string };
}

export default function BookingDetailPage({ params }: BookingDetailPageProps) {
  const { data: booking } = useQuery({
    queryKey: ['staff', 'booking', params.id],
    queryFn: () => apiClient.get(`/api/staff/bookings/${params.id}/`).then(res => res.data)
  });
  
  return <BookingDetailModal booking={booking} />;
}
```

#### Customer Detail Routes
```typescript
// /staff/customers/[id]/page.tsx - Customer profile management
const { data: customer } = useQuery({
  queryKey: ['staff', 'customer', params.id],
  queryFn: () => apiClient.get(`/api/staff/customers/${params.id}/`).then(res => res.data)
});
```

---

## SECTION 6: FORM HANDLING & VALIDATION REFERENCE

### Form Implementation Patterns & Validation Schemas

#### React Hook Form + Zod Integration Pattern
**Standard Form Setup:**
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const formSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormData = z.infer<typeof formSchema>;

export function ExampleForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    watch
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', password: '' }
  });
}
```

#### Customer Registration Form
**File**: `src/components/auth/register-form.tsx`
**Validation Schema:**
```typescript
const registerSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});
```

**API Integration & Error Handling:**
```typescript
const registerMutation = useMutation({
  mutationFn: async (data: RegisterForm) => {
    const result = await register(data);
    if (!result.success) {
      throw new Error(result.error || 'Registration failed');
    }
    return result.user;
  },
  onSuccess: (user) => {
    router.push('/dashboard?welcome=true');
  },
  onError: (error: any) => {
    if (error.response?.data?.email) {
      setError('email', { message: error.response.data.email[0] });
    } else {
      setApiError(error.message);
    }
  }
});
```

#### Address Form Component
**Booking Wizard Address Step:**
```typescript
const addressSchema = z.object({
  address_line_1: z.string().min(1, 'Street address is required'),
  address_line_2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.enum(['NY', 'CT', 'NJ'], { required_error: 'Please select a state' }),
  zip_code: z.string()
    .regex(/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code')
});
```

**Real-time Validation & State Updates:**
```typescript
const form = useForm<AddressForm>({
  resolver: zodResolver(addressSchema),
  defaultValues: bookingData.pickup_address,
  mode: 'onChange' // Real-time validation
});

// Watch for changes and update booking store
const watchedValues = watch();
useEffect(() => {
  const subscription = watch((value) => {
    if (value.address_line_1 && value.city && value.state) {
      updateBookingData({ pickup_address: value as BookingAddress });
      debouncedPricingUpdate();
    }
  });
  return () => subscription.unsubscribe();
}, [watch, updateBookingData]);
```

### Advanced Form Features

#### Multi-Step Form State Management
**Booking Wizard Pattern:**
```typescript
// Step validation before progression
const canProceedToNextStep = () => {
  switch (currentStep) {
    case 1: // Service Selection
      return bookingData.service_type && 
             (bookingData.mini_move_package_id || bookingData.standard_delivery_item_count);
    case 2: // Date & Time
      return bookingData.pickup_date && bookingData.pickup_time;
    case 3: // Addresses
      return bookingData.pickup_address && bookingData.delivery_address;
    default:
      return true;
  }
};
```

#### Form Error Handling Patterns
**Global Error Display:**
```typescript
// API error mapping to form fields
const handleApiErrors = (error: AxiosError) => {
  if (error.response?.data?.errors) {
    Object.entries(error.response.data.errors).forEach(([field, message]) => {
      setError(field as keyof FormData, { message: message as string });
    });
  } else {
    setApiError(error.response?.data?.message || 'An error occurred');
  }
};
```

### Form Component Library

#### Reusable Input Components
**Input with Validation Display:**
```typescript
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label, error, helper, className, ...props
}, ref) => {
  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium">{label}</label>}
      <input
        ref={ref}
        className={cn(
          'w-full px-4 py-3 border rounded-md',
          error ? 'border-red-300' : 'border-gray-300',
          className
        )}
        {...props}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {helper && !error && <p className="text-sm text-gray-500">{helper}</p>}
    </div>
  );
});
```

#### Select Component with Options
```typescript
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  options, placeholder = 'Select an option', error, ...props
}, ref) => {
  return (
    <select ref={ref} className={cn('form-select', error && 'border-red-300')} {...props}>
      <option value="">{placeholder}</option>
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
});
```

---

## SECTION 7: UI COMPONENT SYSTEM DOCUMENTATION

### Design System & Component Library Reference

#### Color System & Theme Configuration
**Tailwind Theme Extension:**
```typescript
// tailwind.config.js
theme: {
  extend: {
    colors: {
      navy: {
        50: '#f0f4f8',   100: '#d9e2ec',   200: '#bcccdc',
        300: '#9fb3c8',  400: '#829ab1',   500: '#627d98',
        600: '#486581',  700: '#334e68',   800: '#243b53',
        900: '#1a365d'   // Primary brand color
      },
      gold: {
        50: '#fffdf7',   100: '#fef7e0',   200: '#fdecc0',
        300: '#fbdb94',  400: '#f7c365',   500: '#d69e2e',
        600: '#b7791f',  700: '#975a16',   800: '#744210',
        900: '#5f370e'   // Luxury accent color
      },
      cream: {
        50: '#fefcf3',   100: '#fef7e0',   200: '#fdecc0',
        300: '#fbdb94',  400: '#f7c365',   500: '#f1a545',
        600: '#d69e2e',  700: '#b7791f',   800: '#975a16',
        900: '#744210'   // Background warmth
      }
    },
    fontFamily: {
      serif: ['var(--font-playfair)', 'serif'],      // Headings
      sans: ['var(--font-inter)', 'sans-serif']      // Body text
    }
  }
}
```

#### Typography System
**Font Configuration:**
```typescript
// app/layout.tsx
import { Inter, Playfair_Display } from "next/font/google";

const inter = Inter({ 
  subsets: ["latin"], 
  variable: '--font-inter' 
});

const playfair = Playfair_Display({ 
  subsets: ["latin"], 
  variable: '--font-playfair' 
});
```

**Typography Classes:**
- Headings: `font-serif font-bold text-navy-900`
- Body text: `font-sans text-navy-700`
- Captions: `text-sm text-navy-600`

### Core Component System

#### Button Component Variants
**File**: `src/components/ui/button.tsx`
**Comprehensive Variant System:**
```typescript
const buttonVariants = {
  variant: {
    default: 'bg-navy-900 text-white hover:bg-navy-800',
    primary: 'bg-gold-600 text-white hover:bg-gold-700 shadow-lg',
    outline: 'border-2 border-navy-900 text-navy-900 hover:bg-navy-900 hover:text-white',
    ghost: 'text-navy-900 hover:bg-navy-100 hover:text-navy-800',
    luxury: 'bg-gradient-to-r from-gold-500 to-gold-600 text-white shadow-gold hover:from-gold-600',
    destructive: 'bg-red-600 text-white hover:bg-red-700',
    link: 'text-navy-600 underline-offset-4 hover:underline'
  },
  size: {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4',
    lg: 'h-12 px-8 text-lg',
    xl: 'h-14 px-10 text-xl',
    icon: 'h-10 w-10'
  }
};
```

#### Card Component System
**File**: `src/components/ui/card.tsx`
**Structured Card Components:**
```typescript
// Base Card with variant system
const cardVariants = {
  variant: {
    default: 'bg-white border border-gray-200',
    elevated: 'bg-white shadow-lg border-0',
    luxury: 'bg-gradient-to-br from-cream-50 to-white border border-gold-200 luxury-card-shadow',
    outlined: 'bg-white border-2 border-navy-200'
  },
  padding: {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }
};

// Subcomponents
export const CardHeader = ({ children, className }) => (
  <div className={cn('pb-4 border-b border-gray-100', className)}>
    {children}
  </div>
);

export const CardContent = ({ children, className }) => (
  <div className={cn('py-4', className)}>{children}</div>
);
```

### Form Input Components

#### Enhanced Input Component
**File**: `src/components/ui/input.tsx`
**Features**:
- Error state styling with red borders
- Label integration with required indicators
- Helper text display
- Disabled state handling
- Focus management for accessibility

```typescript
const inputVariants = {
  variant: {
    default: 'border-gray-300 focus:border-navy-500 focus:ring-navy-500',
    error: 'border-red-300 focus:border-red-500 focus:ring-red-500',
    success: 'border-green-300 focus:border-green-500 focus:ring-green-500'
  },
  size: {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-4 py-4 text-lg'
  }
};
```

#### Select Component with Options
**Enhanced Select Interface:**
```typescript
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  placeholder?: string;
  helper?: string;
}
```

### Layout System Components

#### Responsive Container System
**Global Container Configuration:**
```typescript
// tailwind.config.js
container: {
  center: true,
  padding: "2rem",
  screens: {
    "2xl": "1400px"
  }
}
```

#### Modal Component System
**File**: `src/components/ui/modal.tsx`
**Features**:
- HeadlessUI Dialog integration
- Backdrop click handling
- Escape key support
- Focus trap management
- Transition animations

```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnBackdrop?: boolean;
  children: React.ReactNode;
}
```

### Icon System Integration

#### Heroicons Integration
**Usage Pattern:**
```typescript
import { 
  ChevronDownIcon, 
  UserIcon, 
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon 
} from '@heroicons/react/24/outline';

// Icon with consistent sizing
<UserIcon className="h-5 w-5 text-navy-600" />
```

### Responsive Design Patterns

#### Mobile-First Responsive Classes
**Standard Responsive Patterns:**
```typescript
// Navigation responsive behavior
className="hidden md:flex items-center space-x-8"  // Desktop nav
className="md:hidden"  // Mobile hamburger menu

// Card grid responsive layout
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"

// Typography responsive sizing
className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold"
```

#### Utility Classes for Luxury Design
**Custom Tailwind Utilities:**
```css
@layer components {
  .luxury-card-shadow {
    @apply shadow-lg shadow-navy-900/10 hover:shadow-xl hover:shadow-navy-900/20 transition-shadow duration-300;
  }
  
  .gradient-gold {
    @apply bg-gradient-to-r from-gold-400 to-gold-600;
  }
}
```

---

## SECTION 8: DEVELOPMENT EXTENSION PATTERNS

### Adding New Pages Following Established Patterns

#### Public Page Creation Pattern
**1. Create Page Component:**
```typescript
// src/app/new-page/page.tsx
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function NewPage() {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-serif font-bold text-navy-900 mb-6">
          New Page Title
        </h1>
        <Card variant="luxury">
          <CardContent>
            <p className="text-navy-700">Page content here...</p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
```

**2. Add Navigation Link:**
```typescript
// src/components/layout/main-layout.tsx
const navigation = [
  // ... existing items
  { name: 'New Page', href: '/new-page' }
];
```

#### Protected Page Creation Pattern
**Customer Dashboard Page:**
```typescript
'use client';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'next/navigation';

export default function NewDashboardPage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return <div>Loading...</div>;
  }

  return (
    <MainLayout>
      {/* Protected content */}
    </MainLayout>
  );
}
```

### Component Creation & Integration Guidelines

#### New UI Component Pattern
**1. Component File Structure:**
```typescript
// src/components/ui/new-component.tsx
import { forwardRef } from 'react';
import { cn } from '@/utils/cn';

interface NewComponentProps {
  // Props interface
}

export const NewComponent = forwardRef<HTMLDivElement, NewComponentProps>(({
  className,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={cn('base-classes', className)}
      {...props}
    />
  );
});

NewComponent.displayName = 'NewComponent';
```

**2. Export from Index:**
```typescript
// src/components/ui/index.ts
export { NewComponent } from './new-component';
```

#### Feature Component Pattern
**Business Logic Component:**
```typescript
// src/components/feature/feature-component.tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, Button } from '@/components/ui';

interface FeatureData {
  // Data interface
}

export function FeatureComponent() {
  const [state, setState] = useState<FeatureData>();

  const { data, isLoading } = useQuery({
    queryKey: ['feature-data'],
    queryFn: () => apiClient.get('/api/feature/').then(res => res.data)
  });

  const mutation = useMutation({
    mutationFn: (data: FeatureData) => 
      apiClient.post('/api/feature/', data),
    onSuccess: () => {
      // Success handling
    }
  });

  return (
    <Card>
      {/* Component implementation */}
    </Card>
  );
}
```

### API Integration Patterns for New Backend Endpoints

#### Standard API Integration Pattern
**1. Add Type Definitions:**
```typescript
// src/types/index.ts
export interface NewDataType {
  id: string;
  name: string;
  // ... other fields matching backend schema
}

export interface NewDataResponse {
  data: NewDataType[];
  total_count: number;
}
```

**2. Query Implementation:**
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['new-data', filters],
  queryFn: async () => {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    
    const response = await apiClient.get(`/api/new-endpoint/?${params}`);
    return response.data as NewDataResponse;
  },
  staleTime: 1000 * 60 * 5, // 5 minutes
});
```

**3. Mutation Implementation:**
```typescript
const createMutation = useMutation({
  mutationFn: async (data: Partial<NewDataType>) => {
    const response = await apiClient.post('/api/new-endpoint/', data);
    return response.data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['new-data'] });
    // Success notification
  },
  onError: (error: AxiosError) => {
    // Error handling
  }
});
```

### Store Extension Patterns

#### Adding New Zustand Store
**1. Create Store File:**
```typescript
// src/stores/new-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NewState {
  data: NewDataType[];
  isLoading: boolean;
  filters: FilterOptions;
}

interface NewActions {
  setData: (data: NewDataType[]) => void;
  updateFilters: (filters: Partial<FilterOptions>) => void;
  reset: () => void;
}

export const useNewStore = create<NewState & NewActions>()(
  persist(
    (set, get) => ({
      // State
      data: [],
      isLoading: false,
      filters: {},

      // Actions
      setData: (data) => set({ data }),
      updateFilters: (filters) => set(state => ({ 
        filters: { ...state.filters, ...filters } 
      })),
      reset: () => set({ data: [], filters: {} })
    }),
    {
      name: 'totetaxi-new-store',
      partialize: (state) => ({ filters: state.filters })
    }
  )
);
```

#### Extending Existing Stores
**Adding Actions to Auth Store:**
```typescript
// Extend existing auth store actions
interface ExtendedAuthActions extends AuthActions {
  updatePreferences: (preferences: UserPreferences) => void;
  toggleNotifications: () => void;
}
```

### Testing Patterns & Development Procedures

#### Component Testing Pattern
```typescript
// src/components/__tests__/new-component.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NewComponent } from '../new-component';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: { queries: { retry: false } }
});

describe('NewComponent', () => {
  it('renders correctly', () => {
    const queryClient = createTestQueryClient();
    
    render(
      <QueryClientProvider client={queryClient}>
        <NewComponent />
      </QueryClientProvider>
    );
    
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
```

#### API Integration Testing
```typescript
// Mock API client for testing
jest.mock('@/lib/api-client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn()
  }
}));
```

---

## SECTION 9: CONFIGURATION & BUILD REFERENCE

### Package.json Dependencies & Scripts

#### Core Dependencies Analysis
```json
{
  "dependencies": {
    "@headlessui/react": "^2.2.7",        // Accessible UI components
    "@heroicons/react": "^2.2.0",         // SVG icons
    "@hookform/resolvers": "^3.10.0",     // React Hook Form validation resolvers
    "@stripe/react-stripe-js": "^4.0.2",  // Stripe payment components
    "@stripe/stripe-js": "^7.9.0",        // Stripe JavaScript SDK
    "@tanstack/react-query": "^5.87.1",   // Server state management
    "@tanstack/react-query-devtools": "^5.87.1", // Development tools
    "axios": "^1.11.0",                   // HTTP client
    "clsx": "^2.1.1",                     // Conditional className utility
    "next": "15.5.0",                     // React framework
    "react": "19.1.0",                    // React library
    "react-dom": "19.1.0",                // React DOM rendering
    "react-hook-form": "^7.62.0",         // Form state management
    "tailwind-merge": "^2.6.0",           // Tailwind class merging
    "zod": "^3.25.76",                    // TypeScript-first schema validation
    "zustand": "^4.5.7"                   // State management
  }
}
```

#### Build Scripts Configuration
```json
{
  "scripts": {
    "dev": "next dev",           // Development server
    "build": "next build",       // Production build
    "start": "next start",       // Production server
    "lint": "eslint"             // Code linting
  }
}
```

### Next.js Configuration

#### Next.js Config File
**File**: `next.config.ts`
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,    // Skip ESLint during builds for speed
  },
  typescript: {
    ignoreBuildErrors: true,     // Skip TypeScript errors during builds
  },
  // Additional optimizations
  experimental: {
    optimizeCss: true,           // CSS optimization
    optimizePackageImports: ['@heroicons/react']  // Bundle optimization
  },
  // Image optimization
  images: {
    domains: ['localhost', 'totetaxi-backend.fly.dev'],
    formats: ['image/webp', 'image/avif']
  }
};

export default nextConfig;
```

### TypeScript Configuration

#### TypeScript Config
**File**: `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2017",                    // JavaScript target version
    "lib": ["dom", "dom.iterable", "esnext"], // Available libraries
    "allowJs": true,                       // Allow JavaScript files
    "skipLibCheck": true,                  // Skip library type checking
    "strict": true,                        // Enable strict type checking
    "noEmit": true,                        // Don't emit JavaScript files
    "esModuleInterop": true,               // Enable ES module interop
    "module": "esnext",                    // Module system
    "moduleResolution": "bundler",         // Module resolution strategy
    "resolveJsonModule": true,             // Allow importing JSON files
    "isolatedModules": true,               // Ensure each file can be safely transpiled
    "jsx": "preserve",                     // JSX handling (Next.js handles this)
    "incremental": true,                   // Enable incremental compilation
    "plugins": [{ "name": "next" }],       // Next.js TypeScript plugin
    "paths": {
      "@/*": ["./src/*"]                   // Path mapping for absolute imports
    }
  },
  "include": [
    "next-env.d.ts", 
    "**/*.ts", 
    "**/*.tsx", 
    ".next/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
```

### Tailwind CSS Configuration

#### Tailwind Config File
**File**: `tailwind.config.js`
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['var(--font-playfair)', 'serif'],      // Custom serif font
        sans: ['var(--font-inter)', 'sans-serif'],     // Custom sans-serif font
      },
      colors: {
        navy: {
          50: '#f0f4f8', 100: '#d9e2ec', 200: '#bcccdc',
          300: '#9fb3c8', 400: '#829ab1', 500: '#627d98',
          600: '#486581', 700: '#334e68', 800: '#243b53',
          900: '#1a365d',
        },
        gold: {
          50: '#fffdf7', 100: '#fef7e0', 200: '#fdecc0',
          300: '#fbdb94', 400: '#f7c365', 500: '#d69e2e',
          600: '#b7791f', 700: '#975a16', 800: '#744210',
          900: '#5f370e',
        },
        cream: {
          50: '#fefcf3', 100: '#fef7e0', 200: '#fdecc0',
          300: '#fbdb94', 400: '#f7c365', 500: '#f1a545',
          600: '#d69e2e', 700: '#b7791f', 800: '#975a16',
          900: '#744210',
        }
      },
      container: {
        center: true,
        padding: "2rem",
        screens: {
          "2xl": "1400px",
        },
      },
    },
  },
  plugins: [],
}
```

### Environment Variables Configuration

#### Required Environment Variables
```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8005     # Backend API URL
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # Stripe publishable key

# Build Configuration
NODE_ENV=development                          # Environment mode
```

#### Environment Variable Usage
```typescript
// src/lib/api-client.ts
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8005',
  withCredentials: true,
});

// src/lib/stripe.ts
export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
};
```

### Build Optimization & Performance

#### Production Build Optimizations
```typescript
// next.config.ts production additions
const nextConfig: NextConfig = {
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  
  // Bundle analyzer (when needed)
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config) => {
      config.plugins.push(new BundleAnalyzerPlugin());
      return config;
    },
  }),
  
  // Performance optimizations
  experimental: {
    optimizeCss: true,
    serverComponentsExternalPackages: ['axios'],
  }
};
```

#### Static File Optimization
```bash
# public/ directory structure
public/
├── favicon.ico                 # Website favicon
├── apple-touch-icon.png        # iOS home screen icon
├── android-chrome-*.png        # Android icons
└── site.webmanifest           # Web app manifest
```

### Development Tools & Debugging

#### Query Client Configuration
**File**: `src/lib/query-client.ts`
```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,        // 5 minutes stale time
      gcTime: 1000 * 60 * 30,          // 30 minutes garbage collection
      retry: (failureCount, error: any) => {
        if (error?.response?.status === 401) return false;
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,     // Disable refetch on focus
    },
    mutations: {
      retry: 1,                        // Retry mutations once
    }
  }
});
```

#### Development Server Configuration
```bash
# Development server runs on http://localhost:3000
# Hot reload enabled
# TypeScript checking in background
# Fast refresh for React components
```

This comprehensive frontend living documentation provides complete executive function over the ToteTaxi Next.js application, enabling independent development, backend integration, and feature extension across all business domains. The documentation spans **1,680 lines** and covers every aspect of the frontend architecture.