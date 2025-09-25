I'll generate the comprehensive 1,800-line living documentation now. Let me analyze all the frontend files and cross-reference with the backend integration patterns.# TOTETAXI FRONTEND - LIVING DOCUMENTATION
*Generated: September 25, 2025*
*Comprehensive Development Guide for Complete Frontend Executive Function*

---

## SECTION 1: SYSTEM MENTAL MODEL

### **Technology Stack Philosophy**
**Framework:** Next.js 15.5.0 + App Router + React 19.1.0 + TypeScript
**Architecture:** Component-based luxury service booking platform with dual authentication flows
**Core Philosophy:** Seamless booking experience supporting both authenticated customers and guest users

### **Technical Foundation**
```typescript
// Core Dependencies
Next.js 15.5.0          // App Router, Server Components
React 19.1.0            // Latest concurrent features  
TypeScript 5+           // Strict type safety
Zustand 4.5.7          // Lightweight state management
TanStack Query 5.87.1   // Advanced data fetching/caching
Tailwind CSS 3.4.17    // Utility-first styling
React Hook Form 7.62.0  // Performance-optimized forms
Zod 3.25.76            // Runtime type validation
Stripe.js 7.9.0        // Payment processing
Axios 1.11.0           // HTTP client with interceptors
```

### **Project Architecture Strategy**
**Dual Authentication System:** Separate auth flows for customers (`/auth/*`) and staff (`/staff/auth/*`)
**Booking-Centric Design:** Multi-step wizard drives core user journey with persistent state
**Guest-First Approach:** Full booking capability without account creation, optional registration
**Payment Integration:** Stripe-based processing with both authenticated and guest checkout flows

### **Component Organization Philosophy**
```
src/components/
├── booking/           # Multi-step booking wizard components
├── auth/             # Customer authentication components  
├── dashboard/        # Customer dashboard and history
├── staff/            # Staff-only management interfaces
├── ui/              # Reusable design system components
├── layout/          # Page layouts and navigation
└── marketing/       # Service showcase and landing pages
```

### **State Management Strategy**
**4 Zustand Stores Approach:**
- `auth-store`: Customer authentication and profile data
- `booking-store`: Multi-step booking wizard state with persistence
- `staff-auth-store`: Separate staff authentication system
- `ui-store`: UI state like modals, notifications, loading states

---

## SECTION 2: BACKEND INTEGRATION REFERENCE & MAPPING

### **API Client Configuration**
```typescript
// /src/lib/api-client.ts - Axios configuration with CSRF handling
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8005',
  withCredentials: true,  // Essential for Django CSRF cookies
  headers: { 'Content-Type': 'application/json' }
});

// Auto-CSRF injection for mutations
interceptors.request.use(async (config) => {
  if (['post', 'put', 'patch', 'delete'].includes(config.method!)) {
    // Auto-fetch CSRF token for write operations
  }
});
```

### **Authentication API Integration**
**Customer Authentication Endpoints:**
```typescript
// CSRF Token (required first)
GET /api/customer/csrf-token/ → { csrf_token: string }

// Authentication Flow
POST /api/customer/auth/register/
  Request: { email, password, first_name, last_name, phone? }
  Response: { success: boolean, user: DjangoUser }

POST /api/customer/auth/login/  
  Headers: { 'X-CSRFToken': token }
  Request: { email, password }
  Response: { user: DjangoUser, customer_profile: CustomerProfile }

POST /api/customer/auth/logout/ → { message: 'Logout successful' }
GET /api/customer/auth/user/ → Current user + profile data
```

**Staff Authentication (Separate System):**
```typescript
POST /api/staff/auth/login/ → Staff-specific login
POST /api/staff/auth/logout/ → Staff logout  
GET /api/staff/auth/user/ → Staff user context
```

### **Core Booking API Integration**
**Service Catalog (Public):**
```typescript
GET /api/public/services/ → {
  mini_move_packages: MiniMovePackage[],
  standard_delivery: StandardDeliveryConfig,
  specialty_items: SpecialtyItem[]
}
```

**Booking Creation (Dual Path):**
```typescript
// Authenticated Customer Path
POST /api/customer/bookings/create/
  Auth: Required (session-based)
  Request: BookingData + address_nicknames + save_addresses
  Response: { booking: Booking, payment?: { client_secret } }

// Guest Booking Path  
POST /api/public/guest-booking/
  Auth: Not required
  Request: BookingData + customer_info (first_name, last_name, email, phone)
  Response: { booking: Booking, payment?: { client_secret } }
```

**Payment Integration:**
```typescript
// Payment Intent Creation
POST /api/payments/create-intent/
  Request: { booking_id: string, customer_email?: string }
  Response: { client_secret: string, amount_cents: number }

// Payment Confirmation
POST /api/payments/confirm/
  Request: { payment_intent_id: string }
  Response: { status: 'succeeded' | 'failed' }
```

### **Customer Dashboard APIs**
```typescript
GET /api/customer/dashboard/ → {
  customer_profile: { name, total_bookings, total_spent_dollars, is_vip },
  booking_summary: { recent_bookings, upcoming_bookings }
}

GET /api/customer/bookings/ → Booking[] (paginated)
GET /api/customer/bookings/{uuid}/ → Detailed booking with pricing breakdown
```

### **Type Definitions & API Contracts**
```typescript
interface BookingData {
  service_type: 'mini_move' | 'standard_delivery';
  pickup_date: string; // ISO date
  pickup_time: 'morning' | 'morning_specific' | 'no_time_preference';
  pickup_address: BookingAddress;
  delivery_address: BookingAddress;
  special_instructions?: string;
  coi_required?: boolean;
  
  // Mini Move specific
  mini_move_package_id?: string;
  include_packing?: boolean;
  include_unpacking?: boolean;
  
  // Standard delivery specific
  standard_delivery_item_count?: number;
  is_same_day_delivery?: boolean;
  specialty_item_ids?: string[];
}

interface BookingAddress {
  address_line_1: string;
  address_line_2?: string; 
  city: string;
  state: 'NY' | 'CT' | 'NJ';
  zip_code: string;
}
```

---

## SECTION 3: COMPLETE COMPONENT ARCHITECTURE

### **Booking Wizard Components (Core Flow)**
```typescript
// /src/components/booking/booking-wizard.tsx
export function BookingWizard() {
  const { currentStep, bookingData, canProceedToStep } = useBookingWizard();
  
  const steps = [
    { component: ServiceSelectionStep, title: 'Service Selection' },
    { component: AddressStep, title: 'Pickup & Delivery' },
    { component: DateTimeStep, title: 'Schedule' },
    { component: AuthChoiceStep, title: 'Account' },
    { component: CustomerInfoStep, title: 'Contact Info' }, // Guest only
    { component: ReviewPaymentStep, title: 'Review & Pay' }
  ];
  
  return <StepperNavigation steps={steps} currentStep={currentStep} />;
}
```

**Key Booking Step Components:**
- `ServiceSelectionStep`: Service type + package selection with real-time pricing
- `AddressStep`: Dual address forms with test data buttons for development
- `DateTimeStep`: Calendar integration with availability checking
- `AuthChoiceStep`: Login/Register/Continue as Guest decision point
- `CustomerInfoStep`: Guest information collection (shown only for non-authenticated)
- `ReviewPaymentStep`: Booking summary + Stripe payment integration

### **Authentication Components**
```typescript
// /src/components/auth/login-form.tsx
export function LoginForm() {
  const { login, isLoading } = useAuthStore();
  const { handleSubmit, register } = useForm<LoginData>();
  
  const onSubmit = async (data: LoginData) => {
    const result = await login(data.email, data.password);
    if (result.success) {
      router.push('/dashboard');
    }
  };
}

// /src/components/auth/user-menu.tsx - Authenticated user dropdown
export function UserMenu() {
  const { user, customerProfile, logout } = useAuthStore();
  
  const menuItems = [
    { label: 'Dashboard', icon: UserIcon, onClick: () => router.push('/dashboard') },
    { label: 'Book Service', icon: PlusIcon, primary: true },
    { label: 'Settings', icon: Cog6ToothIcon },
    { label: 'Sign Out', icon: ArrowRightOnRectangleIcon, danger: true }
  ];
}
```

### **Dashboard Components**
```typescript
// /src/components/dashboard/dashboard-overview.tsx
export function DashboardOverview() {
  const { user } = useAuthStore();
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['customer', 'dashboard', user?.id],
    queryFn: () => apiClient.get('/api/customer/dashboard/'),
    enabled: !!user?.id
  });
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatsCard title="Total Bookings" value={profile?.total_bookings} />
      <StatsCard title="Total Spent" value={`$${profile?.total_spent_dollars}`} />
      <StatsCard title="VIP Status" value={profile?.is_vip ? 'Active' : 'Standard'} />
    </div>
  );
}
```

### **Staff Components (Administrative Interface)**
```typescript
// /src/components/staff/staff-layout.tsx - Staff-only navigation
export function StaffLayout({ children }) {
  const { user: staffUser } = useStaffAuthStore();
  
  const navigation = [
    { name: 'Dashboard', href: '/staff/dashboard' },
    { name: 'Bookings', href: '/staff/bookings' },
    { name: 'Customers', href: '/staff/customers' },
    { name: 'Calendar', href: '/staff/calendar' }
  ];
}

// /src/components/staff/booking-detail-modal.tsx
export function BookingDetailModal({ bookingId, isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('general');
  
  const tabs = ['general', 'customer', 'payment', 'logistics'];
  
  // Staff can edit booking status, dates, addresses, special instructions
}
```

### **UI Component System**
```typescript
// /src/components/ui/button.tsx - Consistent button system
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

// /src/components/ui/card.tsx - Layout building blocks
interface CardProps {
  variant?: 'default' | 'elevated' | 'outlined';
  hover?: boolean;
}

// /src/components/ui/input.tsx - Form inputs with consistent validation styling  
interface InputProps {
  label?: string;
  error?: string;
  required?: boolean;
}
```

### **Layout Components**
```typescript  
// /src/components/layout/main-layout.tsx
export function MainLayout({ children }) {
  const { isAuthenticated, user } = useAuthStore();
  
  return (
    <div className="min-h-screen bg-cream-50">
      <Navigation 
        isAuthenticated={isAuthenticated}
        user={user}
        ctaButton={<BookServiceButton />}
      />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
```

---

## SECTION 4: STATE MANAGEMENT IMPLEMENTATION GUIDE

### **Zustand Store Architecture**

#### **Authentication Store (`auth-store.ts`)**
```typescript
interface AuthState {
  user: DjangoUser | null;
  customerProfile: CustomerProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthActions {
  setAuth: (user: DjangoUser, profile?: CustomerProfile) => void;
  clearAuth: () => void;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (data: RegisterData) => Promise<AuthResult>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<CustomerProfile>) => void;
}

// Persistence with cleanup
export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      // Auto-cleanup inactive sessions
      clearSessionIfIncognito: () => {
        const lastActivity = localStorage.getItem('totetaxi-last-activity');
        if (lastActivity && Date.now() - parseInt(lastActivity) > 24 * 60 * 60 * 1000) {
          get().clearAuth();
        }
      }
    }),
    { name: 'totetaxi-auth' }
  )
);
```

#### **Booking Wizard Store (`booking-store.ts`)**
```typescript
interface BookingWizardState {
  currentStep: number;
  isLoading: boolean;
  bookingData: BookingData;
  errors: Record<string, string>;
  isBookingComplete: boolean;
  completedBookingNumber?: string;
  isGuestMode: boolean;
}

interface BookingWizardActions {
  // Step navigation
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  canProceedToStep: (step: number) => boolean;
  
  // Data management
  updateBookingData: (data: Partial<BookingData>) => void;
  resetWizard: () => void;
  
  // Error handling
  setError: (field: string, message: string) => void;
  clearErrors: () => void;
  
  // Completion
  setBookingComplete: (bookingNumber: string) => void;
}

// Step validation logic
const canProceedToStep = (step: number): boolean => {
  switch (step) {
    case 1: return !!bookingData.service_type;
    case 2: return !!bookingData.pickup_address && !!bookingData.delivery_address;
    case 3: return !!bookingData.pickup_date && !!bookingData.pickup_time;
    case 4: return true; // Auth choice always available
    case 5: return isAuthenticated || !!bookingData.customer_info;
    default: return false;
  }
};
```

#### **Staff Authentication Store (`staff-auth-store.ts`)**
```typescript
// Separate authentication system for staff users
interface StaffAuthState {
  staffUser: StaffUser | null;
  isStaffAuthenticated: boolean;
  permissions: string[];
}

// Independent from customer auth with different endpoints
```

#### **UI State Store (`ui-store.ts`)**
```typescript
interface UIState {
  modals: Record<string, boolean>;
  notifications: Notification[];
  isLoading: Record<string, boolean>;
}

// Global UI state management for modals, notifications, loading states
```

### **State Persistence Strategy**
```typescript
// Selective persistence with cleanup
const persistConfig = {
  name: 'totetaxi-booking-wizard',
  partialize: (state) => ({
    bookingData: state.bookingData,
    currentStep: state.currentStep,
    isGuestMode: state.isGuestMode
  }),
  // Auto-expire booking data after 24 hours
  onRehydrateStorage: () => (state) => {
    if (state && state.lastResetTimestamp) {
      const hoursSince = (Date.now() - state.lastResetTimestamp) / (1000 * 60 * 60);
      if (hoursSince > 24) {
        state.resetWizard();
      }
    }
  }
};
```

---

## SECTION 5: ROUTING & NAVIGATION ARCHITECTURE

### **Next.js App Router Structure**
```
src/app/
├── page.tsx                    # Homepage with service showcase
├── about/page.tsx             # About page
├── booking/page.tsx           # Booking wizard entry point
├── login/page.tsx             # Customer login
├── register/page.tsx          # Customer registration  
├── dashboard/page.tsx         # Customer dashboard (protected)
└── staff/
    ├── login/page.tsx         # Staff login (separate auth)
    ├── dashboard/page.tsx     # Staff dashboard
    ├── bookings/page.tsx      # Booking management
    └── customers/page.tsx     # Customer management
```

### **Route Protection Strategy**
```typescript
// /src/middleware.ts - Route-level authentication
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Customer protected routes
  if (pathname.startsWith('/dashboard')) {
    const authCookie = request.cookies.get('totetaxi-auth');
    if (!authCookie) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  
  // Staff protected routes
  if (pathname.startsWith('/staff') && !pathname.includes('/staff/login')) {
    const staffAuthCookie = request.cookies.get('totetaxi-staff-auth');
    if (!staffAuthCookie) {
      return NextResponse.redirect(new URL('/staff/login', request.url));
    }
  }
}
```

### **Navigation Components**
```typescript
// Dynamic navigation based on authentication state
export function Navigation({ isAuthenticated, user }) {
  const navigation = [
    { name: 'Services', href: '/services' },
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' }
  ];
  
  const userNavigation = isAuthenticated ? [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'My Bookings', href: '/dashboard/bookings' },
    { name: 'Profile', href: '/dashboard/profile' }
  ] : [
    { name: 'Login', href: '/login' },
    { name: 'Sign Up', href: '/register' }
  ];
  
  return (
    <nav className="sticky top-0 bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Logo />
          <NavItems items={navigation} />
          {isAuthenticated ? <UserMenu user={user} /> : <AuthButtons />}
        </div>
      </div>
    </nav>
  );
}
```

### **Progressive Navigation Pattern**
```typescript
// Booking wizard navigation with step validation
export function BookingStepperNavigation({ steps, currentStep }) {
  const { canProceedToStep } = useBookingWizard();
  
  return (
    <nav className="flex items-center justify-center space-x-8 mb-8">
      {steps.map((step, index) => (
        <button
          key={step.title}
          onClick={() => canProceedToStep(index) && setCurrentStep(index)}
          className={cn(
            'flex items-center space-x-2 px-3 py-2 rounded-md transition-colors',
            index === currentStep && 'bg-navy-100 text-navy-900',
            index < currentStep && canProceedToStep(index) && 'text-green-600',
            !canProceedToStep(index) && 'text-gray-400 cursor-not-allowed'
          )}
          disabled={!canProceedToStep(index)}
        >
          <StepIcon index={index} currentStep={currentStep} />
          <span className="hidden sm:block">{step.title}</span>
        </button>
      ))}
    </nav>
  );
}
```

---

## SECTION 6: FORM HANDLING & VALIDATION REFERENCE

### **React Hook Form + Zod Integration Pattern**
```typescript
// /src/components/booking/address-step.tsx
const addressSchema = z.object({
  pickup_address: z.object({
    address_line_1: z.string().min(1, 'Address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.enum(['NY', 'CT', 'NJ'], { required_error: 'State is required' }),
    zip_code: z.string().regex(/^\d{5}$/, 'ZIP code must be 5 digits')
  }),
  delivery_address: z.object({
    // Same schema as pickup_address
  })
});

export function AddressStep() {
  const { bookingData, updateBookingData, errors, setError, clearError } = useBookingWizard();
  
  const form = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      pickup_address: bookingData.pickup_address,
      delivery_address: bookingData.delivery_address
    }
  });
  
  const onSubmit = (data: AddressFormData) => {
    updateBookingData(data);
    nextStep();
  };
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <AddressForm 
        title="Pickup Address"
        {...form.register('pickup_address')}
        error={form.formState.errors.pickup_address?.message}
      />
      <AddressForm 
        title="Delivery Address"
        {...form.register('delivery_address')}
        error={form.formState.errors.delivery_address?.message}
      />
      <Button type="submit" disabled={!form.formState.isValid}>
        Continue
      </Button>
    </form>
  );
}
```

### **Multi-Step Form State Management**
```typescript
// Persistent form state across wizard steps
export function BookingWizard() {
  const { 
    bookingData, 
    updateBookingData, 
    errors, 
    currentStep,
    canProceedToStep 
  } = useBookingWizard();
  
  // Form data persists in Zustand store across navigation
  const handleStepSubmit = (stepData: Partial<BookingData>) => {
    updateBookingData(stepData);
    nextStep();
  };
  
  // Validation occurs at step level and wizard level
  const canContinue = () => {
    switch (currentStep) {
      case 0: return !!bookingData.service_type;
      case 1: return validateAddresses(bookingData);
      case 2: return validateDateTime(bookingData);
      default: return true;
    }
  };
}
```

### **Form Component Patterns**
```typescript
// Reusable form components with consistent styling
export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  required,
  className,
  ...props
}, ref) => {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-navy-900">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        ref={ref}
        className={cn(
          'w-full px-4 py-3 border border-gray-300 rounded-md',
          'focus:border-navy-500 focus:ring-navy-500',
          error && 'border-red-300 focus:border-red-500',
          className
        )}
        {...props}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
});

// Select component with same pattern
export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  error,
  options,
  placeholder,
  ...props
}, ref) => {
  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-navy-900">{label}</label>}
      <select
        ref={ref}
        className={cn(
          'w-full px-4 py-3 border border-gray-300 rounded-md',
          error && 'border-red-300'
        )}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
});
```

### **Authentication Form Patterns**
```typescript
// Login form with CSRF handling
export function LoginForm() {
  const { login, isLoading } = useAuthStore();
  
  const form = useForm<LoginData>({
    resolver: zodResolver(loginSchema)
  });
  
  const onSubmit = async (data: LoginData) => {
    const result = await login(data.email, data.password);
    if (!result.success) {
      form.setError('root', { message: result.error });
    }
  };
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Input
        {...form.register('email')}
        label="Email"
        type="email"
        error={form.formState.errors.email?.message}
        required
      />
      <Input
        {...form.register('password')}
        label="Password" 
        type="password"
        error={form.formState.errors.password?.message}
        required
      />
      {form.formState.errors.root && (
        <p className="text-red-600 text-sm">{form.formState.errors.root.message}</p>
      )}
      <Button type="submit" isLoading={isLoading}>
        {isLoading ? 'Signing In...' : 'Sign In'}
      </Button>
    </form>
  );
}
```

---

## SECTION 7: UI COMPONENT SYSTEM DOCUMENTATION

### **Design System Foundation**
```javascript
// tailwind.config.js - Custom design tokens
module.exports = {
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f8fafc',
          600: '#475569',
          700: '#334155', 
          900: '#0f172a'
        },
        cream: {
          50: '#fefce8',
          100: '#fef3c7',
          200: '#fde68a'
        }
      },
      fontFamily: {
        serif: ['Georgia', 'serif']
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem'
      }
    }
  }
};
```

### **Button Component System**
```typescript
// /src/components/ui/button.tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className,
  children,
  disabled,
  ...props
}, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        'disabled:opacity-50 disabled:pointer-events-none',
        // Variant styles
        variant === 'primary' && 'bg-navy-900 text-white hover:bg-navy-800 focus:ring-navy-500',
        variant === 'secondary' && 'bg-gray-100 text-gray-900 hover:bg-gray-200',
        variant === 'outline' && 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
        // Size styles  
        size === 'sm' && 'h-9 px-3 text-sm',
        size === 'md' && 'h-10 px-4 py-2',
        size === 'lg' && 'h-11 px-8 text-base',
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Spinner className="mr-2 h-4 w-4" />}
      {children}
    </button>
  );
});
```

### **Card Component System**
```typescript
// /src/components/ui/card.tsx
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined';
  hover?: boolean;
}

export function Card({ variant = 'default', hover = false, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg bg-white',
        variant === 'default' && 'border border-gray-200',
        variant === 'elevated' && 'shadow-lg border border-gray-100',
        variant === 'outlined' && 'border-2 border-gray-300',
        hover && 'transition-shadow hover:shadow-md',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6 pt-0', className)} {...props} />;
}
```

### **Modal Component**
```typescript
// /src/components/ui/modal.tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, size = 'md', children }: ModalProps) {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/25" />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <Dialog.Panel
            className={cn(
              'w-full transform rounded-lg bg-white p-6 shadow-xl transition-all',
              size === 'sm' && 'max-w-sm',
              size === 'md' && 'max-w-md', 
              size === 'lg' && 'max-w-lg',
              size === 'xl' && 'max-w-4xl'
            )}
          >
            {title && (
              <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
                {title}
              </Dialog.Title>
            )}
            {children}
          </Dialog.Panel>
        </div>
      </div>
    </Dialog>
  );
}
```

### **Layout Utilities**
```typescript
// Responsive grid patterns
export function ResponsiveGrid({ children, cols = 3 }: { children: React.ReactNode; cols?: number }) {
  return (
    <div className={cn(
      'grid gap-6',
      cols === 1 && 'grid-cols-1',
      cols === 2 && 'grid-cols-1 md:grid-cols-2',
      cols === 3 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
      cols === 4 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
    )}>
      {children}
    </div>
  );
}

// Container wrapper
export function Container({ children, size = 'default' }: { children: React.ReactNode; size?: 'sm' | 'default' | 'lg' }) {
  return (
    <div className={cn(
      'mx-auto px-4',
      size === 'sm' && 'max-w-2xl',
      size === 'default' && 'max-w-7xl',
      size === 'lg' && 'max-w-none'
    )}>
      {children}
    </div>
  );
}
```

---

## SECTION 8: DEVELOPMENT EXTENSION PATTERNS

### **Adding New Pages**
```typescript
// Pattern: New page following authentication flow
// 1. Create page component in src/app/[page]/page.tsx
export default function NewPage() {
  const { isAuthenticated, user } = useAuthStore();
  
  return (
    <MainLayout>
      <Container>
        <h1 className="text-3xl font-bold text-navy-900">New Page</h1>
        {isAuthenticated ? (
          <AuthenticatedContent user={user} />
        ) : (
          <PublicContent />
        )}
      </Container>
    </MainLayout>
  );
}

// 2. Add navigation link in components/layout/main-layout.tsx
const navigation = [
  // existing items
  { name: 'New Page', href: '/new-page' }
];

// 3. Add route protection in middleware.ts if needed
if (pathname.startsWith('/new-page') && requiresAuth) {
  // redirect to login
}
```

### **Extending Booking Wizard**
```typescript
// Pattern: Adding new booking step
// 1. Create step component in src/components/booking/
export function NewBookingStep() {
  const { bookingData, updateBookingData, nextStep } = useBookingWizard();
  
  const handleSubmit = (data: NewStepData) => {
    updateBookingData({ newField: data.newField });
    nextStep();
  };
  
  return <form onSubmit={handleSubmit}>/* step content */</form>;
}

// 2. Add step to wizard configuration
const steps = [
  // existing steps
  { component: NewBookingStep, title: 'New Step' }
];

// 3. Update BookingData interface in types/index.ts
interface BookingData {
  // existing fields
  newField?: string;
}

// 4. Update validation in booking-store.ts
const canProceedToStep = (step: number): boolean => {
  switch (step) {
    // existing cases
    case newStepIndex: return !!bookingData.newField;
  }
};
```

### **Adding New API Integration**
```typescript
// Pattern: New backend endpoint integration
// 1. Add API call function
export const newApiCall = async (data: NewApiData): Promise<NewApiResponse> => {
  const response = await apiClient.post('/api/new-endpoint/', data);
  return response.data;
};

// 2. Create React Query hook
export function useNewApiCall() {
  return useMutation({
    mutationFn: newApiCall,
    onSuccess: (data) => {
      // Handle success
      queryClient.invalidateQueries({ queryKey: ['related', 'data'] });
    },
    onError: (error) => {
      // Handle error
    }
  });
}

// 3. Use in component
export function NewFeatureComponent() {
  const { mutate: callNewApi, isLoading } = useNewApiCall();
  
  const handleSubmit = (formData: NewApiData) => {
    callNewApi(formData);
  };
}
```

### **Creating New UI Components**
```typescript
// Pattern: New reusable component
// 1. Create in src/components/ui/new-component.tsx
interface NewComponentProps {
  variant?: 'default' | 'special';
  size?: 'sm' | 'md' | 'lg';
  // other props
}

export function NewComponent({ 
  variant = 'default', 
  size = 'md',
  className,
  ...props 
}: NewComponentProps) {
  return (
    <div
      className={cn(
        // base styles
        'base-classes',
        // variant styles
        variant === 'default' && 'default-classes',
        variant === 'special' && 'special-classes',
        // size styles
        size === 'sm' && 'small-classes',
        // user classes
        className
      )}
      {...props}
    />
  );
}

// 2. Export from src/components/ui/index.ts
export { NewComponent } from './new-component';

// 3. Use throughout application
import { NewComponent } from '@/components/ui';
```

### **Adding Staff Features**
```typescript
// Pattern: New staff-only functionality
// 1. Create in src/components/staff/new-staff-feature.tsx
export function NewStaffFeature() {
  const { staffUser, permissions } = useStaffAuthStore();
  
  // Check permissions
  if (!permissions.includes('new_feature_permission')) {
    return <UnauthorizedMessage />;
  }
  
  return <StaffFeatureContent />;
}

// 2. Add to staff layout navigation
const staffNavigation = [
  // existing items
  { name: 'New Feature', href: '/staff/new-feature' }
];

// 3. Create page at src/app/staff/new-feature/page.tsx
export default function StaffNewFeaturePage() {
  return (
    <StaffLayout>
      <NewStaffFeature />
    </StaffLayout>
  );
}
```

---

## SECTION 9: CONFIGURATION & BUILD REFERENCE

### **Package.json Scripts**
```json
{
  "scripts": {
    "dev": "next dev",           // Development server with hot reload
    "build": "next build",       // Production build
    "start": "next start",       // Production server  
    "lint": "eslint"            // Code linting
  }
}
```

### **Environment Variables**
```bash
# .env.local - Required environment variables
NEXT_PUBLIC_API_URL=http://localhost:8005           # Backend API URL
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...      # Stripe public key
```

### **Next.js Configuration**
```typescript
// next.config.ts - Production-ready configuration
const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,  // Faster builds in production
  },
  typescript: {
    ignoreBuildErrors: true,   // Faster builds in production  
  },
  // Additional production optimizations could be added here
};
```

### **TypeScript Configuration**
```json
// tsconfig.json - Path mapping and strict checking
{
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]      // Absolute imports from src/
    }
  }
}
```

### **Tailwind Configuration**
```javascript
// tailwind.config.js - Design system configuration  
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}", 
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Custom design tokens for consistent styling
    }
  }
};
```

### **Development Workflow**
```bash
# Standard development workflow
npm run dev                    # Start development server
npm run build                  # Test production build
npm run start                  # Test production server locally

# Development patterns
- Use localhost:3000 for frontend
- Backend runs on localhost:8005  
- CORS configured for cross-origin requests
- Hot reload enabled for rapid development
```

### **Deployment Configuration**
```bash
# Production environment variables required:
NEXT_PUBLIC_API_URL            # Production backend URL
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY  # Production Stripe key

# Build output:
npm run build → Creates .next/ directory with optimized static files
npm run start → Serves production build
```

---

## DEVELOPMENT QUICK REFERENCE

### **Common Development Tasks**

**Start new feature:**
1. Create component in appropriate `/src/components/` subdirectory
2. Add to index.ts exports if reusable
3. Update types in `/src/types/index.ts` if needed
4. Add API integration if required
5. Test with both authenticated and guest users

**Debug authentication:**
- Check browser localStorage for 'totetaxi-auth' key
- Verify CSRF token in network requests
- Test both customer and guest booking flows
- Confirm backend session cookies

**Debug booking flow:**
- Check 'totetaxi-booking-wizard' in localStorage
- Verify step validation logic
- Test Stripe payment integration
- Confirm backend booking creation

**Common pitfalls:**
- Remember CSRF tokens for write operations
- Test both authenticated and guest checkout flows  
- Verify environment variables in different environments
- Check TypeScript strict mode compliance

This living documentation provides complete frontend development executive function, enabling independent feature development, seamless backend integration, and consistent UI patterns across the luxury delivery service platform.