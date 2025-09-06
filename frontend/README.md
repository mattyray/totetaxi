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

**Strategic Technical Architecture - Next.js 14 + TypeScript + Tailwind CSS + AI-Optimized Stack**

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
    ├── TanStack Query + Axios API layer
    ├── React Hook Form + Zod validation
    ├── Custom Tailwind + Headless UI components
    └── Session-based auth integration with Django User + Profile backend
```

**Backend Integration Points:**
- Customer Flow: React → /api/customer/ (Django User + CustomerProfile endpoints)
- Customer Dashboard: React → /api/customer/ for User profile and booking data
- Admin Operations: React → /api/staff/ (Django User + StaffProfile endpoints)
- Public Operations: React → /api/public/ for guest checkout and pricing
- Real-time Updates: WebSocket connections for live booking status
- File Management: S3 direct uploads with presigned URLs

## Technology Stack Decisions

**AI-Optimized Technology Selection:**
All frontend technologies chosen for maturity, stability, and AI development compatibility. No bleeding-edge technologies that could create syntax or pattern confusion during AI-assisted development.

**State Management: Zustand**
- **Choice Reasoning:** Simple, lightweight, minimal boilerplate
- **AI Compatibility:** Well-established patterns, clear syntax
- **Integration:** Perfect for ToteTaxi's complexity level
- **Alternative Considered:** Redux (rejected due to complexity)

**API Client: TanStack Query + Axios**
- **TanStack Query:** Caching, background refetching, error handling, optimistic updates
- **Axios:** HTTP requests with interceptors for authentication and error handling
- **Choice Reasoning:** Both mature, well-documented, AI-familiar
- **Performance Benefits:** Automatic caching, request deduplication, background sync

**Form Handling: React Hook Form + Zod**
- **React Hook Form:** Performance-optimized forms with minimal re-renders
- **Zod:** Runtime validation matching Django backend patterns
- **Choice Reasoning:** Industry standard, excellent TypeScript integration
- **Integration:** Seamless validation with Django REST error responses

**UI Components: Custom Tailwind + Headless UI**
- **Tailwind CSS:** Utility-first styling with complete AI familiarity
- **Headless UI:** Accessible primitives for complex components (modals, dropdowns)
- **Choice Reasoning:** Maximum control, no heavy component library dependencies
- **Brand Integration:** Custom luxury design system built on Tailwind utilities

**Authentication: Custom Session-Based**
- **Strategy:** Cookie-based authentication matching Django sessions
- **Integration:** Direct compatibility with Django User authentication
- **Security:** CSRF protection, secure session handling
- **Alternative Considered:** Next-Auth (deferred for OAuth future requirements)

**Development Constraints:**
- **AI-Familiar Only:** All technologies must be well-established and AI-workable
- **No Experimental Features:** Avoid bleeding-edge syntax or patterns
- **Mature Ecosystem:** Prioritize technologies with extensive documentation and community

## Authentication Architecture

**Django User Model Integration (Simplified Frontend Auth):**

**Customer Authentication:**
```typescript
// Frontend Customer Auth State
interface CustomerAuthState {
  user: DjangoUser | null;
  customerProfile: CustomerProfile | null;
  isAuthenticated: boolean;
  savedAddresses: SavedAddress[];
  paymentMethods: CustomerPaymentMethod[];
  isLoading: boolean;
}

// Authentication Flow
const useCustomerAuth = () => {
  const { data: authData, isLoading } = useQuery({
    queryKey: ['auth', 'customer'],
    queryFn: () => axios.get('/api/customer/auth/user/'),
    retry: false
  });
  
  return {
    user: authData?.user,
    customerProfile: authData?.customer_profile,
    isAuthenticated: !!authData?.user,
    isLoading
  };
};
```

**Staff Authentication:**
```typescript
// Separate Staff Auth State
interface StaffAuthState {
  user: DjangoUser | null;
  staffProfile: StaffProfile | null;
  isAuthenticated: boolean;
  permissions: StaffPermissions;
  isLoading: boolean;
}

// Role-based UI rendering
const useStaffPermissions = () => {
  const { staffProfile } = useStaffAuth();
  
  return {
    canApproveRefunds: staffProfile?.can_approve_refunds,
    canManageStaff: staffProfile?.can_manage_staff,
    canViewReports: staffProfile?.can_view_financial_reports
  };
};
```

**Frontend Authentication Benefits:**
- **Standard Django patterns** - no custom authentication state complexity
- **Simplified type definitions** - User + Profile interfaces instead of complex unified models
- **Clear separation** - customer vs staff auth handled through different endpoints
- **Session reliability** - Django's battle-tested session management

## Core Frontend Applications

**🏠 Marketing Site - Luxury Positioning & SEO**

**Primary Responsibility:** Convert high-value visitors into booking conversions through premium positioning

**Technology Integration:**
- **Next.js SSR:** SEO optimization for service pages and pricing information
- **TanStack Query:** Real-time pricing displays from /api/public/services/
- **Tailwind:** Custom luxury design system with brand-specific utilities
- **Headless UI:** Accessible navigation and modal components

**Updated Integration Patterns:**
```typescript
// Real-time service data integration
const useServiceCatalog = () => {
  return useQuery({
    queryKey: ['services', 'catalog'],
    queryFn: () => axios.get('/api/public/services/'),
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 30, // 30 minutes
  });
};

// Dynamic pricing preview
const usePricingPreview = (serviceConfig: ServiceConfig) => {
  return useQuery({
    queryKey: ['pricing', 'preview', serviceConfig],
    queryFn: () => axios.post('/api/public/pricing-preview/', serviceConfig),
    enabled: !!serviceConfig.service_type,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};
```

**User Journey Optimization:**
- **Guest users:** Direct path to booking wizard via /api/public/ endpoints
- **Returning customers:** Django User login with CustomerProfile benefits display
- **New customers:** User registration creates Django User + auto-generated CustomerProfile
- **Mobile experience:** 70% of luxury customers browse on mobile

**Component Architecture:**
```typescript
// Service selection cards with real-time pricing
const ServiceCard = ({ serviceType }: { serviceType: string }) => {
  const { data: pricing } = usePricingPreview({ service_type: serviceType });
  
  return (
    <Card className="luxury-card-shadow border-gold-200">
      <CardHeader>
        <h3 className="text-2xl font-serif text-navy-900">{serviceType}</h3>
      </CardHeader>
      <CardContent>
        <PriceDisplay pricing={pricing} />
        <FeatureList features={getServiceFeatures(serviceType)} />
      </CardContent>
    </Card>
  );
};
```

**Key External Relationships:**
- → Booking Wizard: Primary conversion path from all CTAs
- → Customer Dashboard: Django User login/signup flows
- ← Backend /api/public/: Current pricing, availability windows
- SEO Tools: Google Analytics, Search Console, structured data
- Performance: Next.js optimization, CDN

---

**📝 Booking Wizard - Dual-Mode Conversion Optimization**

**Primary Responsibility:** Guide customers through complex service selection with minimal friction while supporting both guest and Django User authenticated booking flows

**Technology Integration:**
- **React Hook Form:** Multi-step form management with validation
- **Zod:** Schema validation matching Django REST serializers
- **Zustand:** Wizard state persistence across steps
- **TanStack Query:** Real-time pricing updates and availability checking

**Simplified Authentication Integration:**
```typescript
// Dual-mode booking state management
interface BookingWizardState {
  // Service selection
  serviceType: 'mini_move' | 'standard_delivery' | 'specialty_item';
  selectedPackage?: MiniMovePackage;
  itemCount?: number;
  specialtyItems?: SpecialtyItem[];
  
  // User context
  isAuthenticated: boolean;
  customerProfile?: CustomerProfile;
  savedAddresses: SavedAddress[];
  paymentMethods: CustomerPaymentMethod[];
  
  // Form data
  pickupDate: Date;
  pickupTime: string;
  addresses: {
    pickup: Address | SavedAddress;
    delivery: Address | SavedAddress;
  };
  
  // Pricing
  pricingBreakdown?: PricingBreakdown;
  
  // Flow control
  currentStep: number;
  isSubmitting: boolean;
  paymentIntentId?: string;
}

// Zustand store for wizard state
const useBookingWizard = create<BookingWizardState>((set, get) => ({
  // State initialization
  serviceType: 'mini_move',
  isAuthenticated: false,
  savedAddresses: [],
  paymentMethods: [],
  currentStep: 1,
  isSubmitting: false,
  
  // Actions
  setServiceType: (type) => set({ serviceType: type }),
  setAuthentication: (auth) => set({ 
    isAuthenticated: auth.isAuthenticated,
    customerProfile: auth.customerProfile,
    savedAddresses: auth.savedAddresses,
    paymentMethods: auth.paymentMethods
  }),
  nextStep: () => set((state) => ({ currentStep: state.currentStep + 1 })),
  // ... other actions
}));
```

**Core Wizard Flow Implementation:**
```typescript
// Step 1: Service Selection with real-time pricing
const ServiceSelectionStep = () => {
  const { register, watch } = useForm<ServiceSelectionForm>({
    resolver: zodResolver(serviceSelectionSchema)
  });
  
  const watchedValues = watch();
  const { data: pricing } = usePricingPreview(watchedValues);
  
  return (
    <StepContainer>
      <ServiceTypeSelector register={register} />
      <PricingPreview pricing={pricing} />
      <NavigationButtons onNext={() => wizardStore.nextStep()} />
    </StepContainer>
  );
};

// Step 2: Authentication check and profile integration
const CustomerInfoStep = () => {
  const { isAuthenticated, customerProfile } = useCustomerAuth();
  const { savedAddresses } = useBookingWizard();
  
  if (isAuthenticated) {
    return <AuthenticatedCustomerForm 
      profile={customerProfile} 
      savedAddresses={savedAddresses} 
    />;
  }
  
  return <GuestCustomerForm />;
};

// Step 3: Address selection with saved address integration
const AddressSelectionStep = () => {
  const { savedAddresses, isAuthenticated } = useBookingWizard();
  const { register, control } = useForm<AddressForm>();
  
  return (
    <AddressStepContainer>
      {isAuthenticated && savedAddresses.length > 0 && (
        <SavedAddressSelector addresses={savedAddresses} />
      )}
      <AddressFormFields register={register} control={control} />
      <AddressSaveOption show={isAuthenticated} />
    </AddressStepContainer>
  );
};
```

**Dual-Mode Experience Design:**

**Guest Checkout Flow:**
```typescript
const guestBookingMutation = useMutation({
  mutationFn: (bookingData: GuestBookingData) => 
    axios.post('/api/public/guest-booking/', bookingData),
  onSuccess: (response) => {
    // Create payment intent
    createPaymentIntent(response.data.booking.id);
  }
});
```

**Authenticated User Flow:**
```typescript
const authenticatedBookingMutation = useMutation({
  mutationFn: (bookingData: AuthenticatedBookingData) =>
    axios.post('/api/customer/bookings/create/', bookingData),
  onSuccess: (response) => {
    // Payment with saved methods
    handleAuthenticatedPayment(response.data);
  }
});
```

**Form Validation Integration:**
```typescript
// Zod schemas matching Django serializers
const serviceSelectionSchema = z.object({
  service_type: z.enum(['mini_move', 'standard_delivery', 'specialty_item']),
  mini_move_package_id: z.string().uuid().optional(),
  standard_delivery_item_count: z.number().min(1).optional(),
  specialty_item_ids: z.array(z.string().uuid()).optional(),
  pickup_date: z.date().min(new Date()),
  coi_required: z.boolean().default(false)
});

const addressSchema = z.object({
  address_line_1: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.enum(['NY', 'CT', 'NJ']),
  zip_code: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code")
});
```

**Key External Relationships:**
- ← Marketing Site: Entry point with service pre-selection
- ← Customer Dashboard: Authenticated entry point for existing Django Users
- → Backend /api/public/: Pricing calculations, availability data
- → Backend /api/customer/: Django User profile data, SavedAddress, CustomerPaymentMethod
- → Stripe API: Payment processing and webhook handling
- State Persistence: Zustand with localStorage persistence

---

**👤 Customer Dashboard - Self-Service Portal**

**Primary Responsibility:** Comprehensive customer self-service interface for Django User + CustomerProfile management

**Technology Integration:**
- **TanStack Query:** Real-time booking data with background sync
- **React Hook Form:** Profile and address management forms
- **Headless UI:** Complex dashboard navigation and modal components
- **Tailwind:** Professional dashboard design with luxury touches

**Django User Integration Architecture:**
```typescript
// Customer dashboard data management
const useCustomerDashboard = () => {
  const userQuery = useQuery({
    queryKey: ['customer', 'auth', 'user'],
    queryFn: () => axios.get('/api/customer/auth/user/')
  });
  
  const profileQuery = useQuery({
    queryKey: ['customer', 'profile'],
    queryFn: () => axios.get('/api/customer/profile/'),
    enabled: !!userQuery.data
  });
  
  const bookingsQuery = useQuery({
    queryKey: ['customer', 'bookings'],
    queryFn: () => axios.get('/api/customer/bookings/'),
    enabled: !!userQuery.data
  });
  
  const addressesQuery = useQuery({
    queryKey: ['customer', 'addresses'],
    queryFn: () => axios.get('/api/customer/addresses/'),
    enabled: !!userQuery.data
  });
  
  return {
    user: userQuery.data?.user,
    profile: profileQuery.data,
    bookings: bookingsQuery.data,
    addresses: addressesQuery.data,
    isLoading: userQuery.isLoading || profileQuery.isLoading
  };
};
```

**Dashboard Component Architecture:**
```typescript
// Dashboard overview with real-time data
const DashboardOverview = () => {
  const { profile, bookings } = useCustomerDashboard();
  const { data: dashboardData } = useQuery({
    queryKey: ['customer', 'dashboard'],
    queryFn: () => axios.get('/api/customer/dashboard/'),
    refetchInterval: 1000 * 60 * 5 // Refresh every 5 minutes
  });
  
  return (
    <DashboardGrid>
      <WelcomeCard profile={profile} />
      <BookingStatsCard stats={dashboardData?.booking_summary} />
      <RecentBookingsCard bookings={dashboardData?.recent_bookings} />
      <QuickActionsCard />
    </DashboardGrid>
  );
};

// Booking history with search and filtering
const BookingHistory = () => {
  const [filters, setFilters] = useState<BookingFilters>({});
  const { data: bookings, isLoading } = useQuery({
    queryKey: ['customer', 'bookings', filters],
    queryFn: () => axios.get('/api/customer/bookings/', { params: filters }),
    keepPreviousData: true
  });
  
  return (
    <BookingHistoryContainer>
      <BookingFilters filters={filters} onChange={setFilters} />
      <BookingTable bookings={bookings} isLoading={isLoading} />
    </BookingHistoryContainer>
  );
};
```

**Address Book Management:**
```typescript
// Address CRUD with optimistic updates
const useAddressManagement = () => {
  const queryClient = useQueryClient();
  
  const createAddress = useMutation({
    mutationFn: (address: CreateAddressData) =>
      axios.post('/api/customer/addresses/', address),
    onMutate: async (newAddress) => {
      await queryClient.cancelQueries(['customer', 'addresses']);
      const previousAddresses = queryClient.getQueryData(['customer', 'addresses']);
      
      queryClient.setQueryData(['customer', 'addresses'], (old: SavedAddress[]) => [
        ...old,
        { ...newAddress, id: 'temp-' + Date.now() }
      ]);
      
      return { previousAddresses };
    },
    onError: (err, newAddress, context) => {
      queryClient.setQueryData(['customer', 'addresses'], context?.previousAddresses);
    },
    onSettled: () => {
      queryClient.invalidateQueries(['customer', 'addresses']);
    }
  });
  
  return { createAddress };
};
```

**Security & Privacy Implementation:**
- **User data isolation:** React Query keys scoped to customer data only
- **Session security:** Automatic logout on 401 responses
- **Payment security:** PCI compliance through Stripe integration
- **Privacy controls:** Clear data usage displays and CustomerProfile settings

**Key External Relationships:**
- ← Django User Authentication: Required for all dashboard features
- → Backend /api/customer/: All customer-specific data and operations
- ← Booking Wizard: Authenticated booking entry point from dashboard
- → Stripe API: Payment method management and billing
- Real-time: WebSocket updates for live booking tracking

---

**🎨 Design System - BLADE-Inspired Luxury Interface**

**Technology Integration:**
- **Tailwind CSS:** Custom utility classes for luxury brand aesthetics
- **Headless UI:** Accessible component primitives
- **Custom Components:** Brand-specific design system built on Tailwind
- **TypeScript:** Strict typing for component props and design tokens

**Design Token System:**
```typescript
// Custom Tailwind configuration for luxury branding
const designTokens = {
  colors: {
    navy: {
      50: '#f0f4f8',
      900: '#1a365d'
    },
    gold: {
      50: '#fffdf7',
      500: '#d69e2e',
      900: '#744210'
    },
    cream: {
      50: '#fefcf3',
      100: '#fef7e0'
    }
  },
  fontFamily: {
    'serif': ['Playfair Display', 'serif'],
    'sans': ['Inter', 'sans-serif']
  },
  spacing: {
    '18': '4.5rem',
    '88': '22rem'
  }
};

// Component variant system
const buttonVariants = {
  primary: 'bg-navy-900 text-white hover:bg-navy-800 font-medium',
  secondary: 'bg-gold-500 text-navy-900 hover:bg-gold-600 font-medium',
  outline: 'border-2 border-navy-900 text-navy-900 hover:bg-navy-50'
};
```

**Component Architecture:**
```typescript
// Base Button component with variants
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'outline';
  size: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  variant, 
  size, 
  children, 
  ...props 
}) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-md transition-colors';
  const variantClasses = buttonVariants[variant];
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };
  
  return (
    <button 
      className={cn(baseClasses, variantClasses, sizeClasses[size])}
      {...props}
    >
      {children}
    </button>
  );
};

// Form components with validation integration
interface InputProps {
  label: string;
  error?: string;
  register: UseFormRegister<any>;
  name: string;
  type?: string;
}

const Input: React.FC<InputProps> = ({ 
  label, 
  error, 
  register, 
  name, 
  type = 'text' 
}) => {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-navy-900">
        {label}
      </label>
      <input
        {...register(name)}
        type={type}
        className={cn(
          "block w-full rounded-md border-gray-300 shadow-sm",
          "focus:border-navy-500 focus:ring-navy-500",
          error && "border-red-300 focus:border-red-500 focus:ring-red-500"
        )}
      />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};
```

**Authentication UI Patterns:**
```typescript
// Login form with validation
const LoginForm = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginData>({
    resolver: zodResolver(loginSchema)
  });
  
  const loginMutation = useMutation({
    mutationFn: (data: LoginData) => 
      axios.post('/api/customer/auth/login/', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['auth']);
      router.push('/dashboard');
    }
  });
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <h2 className="text-2xl font-serif text-center text-navy-900">
          Welcome Back
        </h2>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(loginMutation.mutate)} className="space-y-4">
          <Input 
            label="Email" 
            name="email" 
            type="email"
            register={register}
            error={errors.email?.message}
          />
          <Input 
            label="Password" 
            name="password" 
            type="password"
            register={register}
            error={errors.password?.message}
          />
          <Button 
            type="submit" 
            variant="primary" 
            size="lg" 
            disabled={loginMutation.isLoading}
            className="w-full"
          >
            {loginMutation.isLoading ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
```

---

**🔗 API Integration Layer - Backend Communication**

**Primary Responsibility:** Type-safe, reliable communication with Django User + Profile backend

**Technology Integration:**
- **Axios:** HTTP client with interceptors and error handling
- **TanStack Query:** Caching, background sync, optimistic updates
- **TypeScript:** Complete type safety for API responses
- **Zod:** Runtime validation for API responses

**API Client Architecture:**
```typescript
// Axios instance with authentication and error handling
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8005',
  withCredentials: true, // Include cookies for Django sessions
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor for CSRF token
apiClient.interceptors.request.use(async (config) => {
  // Get CSRF token for state-changing operations
  if (['post', 'put', 'patch', 'delete'].includes(config.method!)) {
    const csrfResponse = await axios.get('/api/customer/csrf-token/');
    config.headers['X-CSRFToken'] = csrfResponse.data.csrf_token;
  }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth state and redirect to login
      queryClient.setQueryData(['auth'], null);
      router.push('/login');
    }
    return Promise.reject(error);
  }
);
```

**Type-Safe API Patterns:**
```typescript
// Django User + Profile API patterns with full typing
class CustomerAPI {
  static async login(data: LoginData): Promise<AuthResponse> {
    const response = await apiClient.post('/api/customer/auth/login/', data);
    return authResponseSchema.parse(response.data);
  }
  
  static async getProfile(): Promise<CustomerProfile> {
    const response = await apiClient.get('/api/customer/profile/');
    return customerProfileSchema.parse(response.data);
  }
  
  static async getSavedAddresses(): Promise<SavedAddress[]> {
    const response = await apiClient.get('/api/customer/addresses/');
    return savedAddressArraySchema.parse(response.data);
  }
  
  static async createBooking(data: AuthenticatedBookingData): Promise<Booking> {
    const response = await apiClient.post('/api/customer/bookings/create/', data);
    return bookingSchema.parse(response.data.booking);
  }
}

// Public API for guest operations
class PublicAPI {
  static async getServices(): Promise<ServiceCatalog> {
    const response = await apiClient.get('/api/public/services/');
    return serviceCatalogSchema.parse(response.data);
  }
  
  static async getPricingPreview(data: PricingPreviewData): Promise<PricingBreakdown> {
    const response = await apiClient.post('/api/public/pricing-preview/', data);
    return pricingBreakdownSchema.parse(response.data);
  }
  
  static async createGuestBooking(data: GuestBookingData): Promise<Booking> {
    const response = await apiClient.post('/api/public/guest-booking/', data);
    return bookingSchema.parse(response.data.booking);
  }
}
```

**TanStack Query Integration:**
```typescript
// Query hooks with caching and error handling
export const useCustomerAuth = () => {
  return useQuery({
    queryKey: ['auth', 'customer'],
    queryFn: CustomerAPI.getAuthUser,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 30, // 30 minutes
  });
};

export const useServiceCatalog = () => {
  return useQuery({
    queryKey: ['services', 'catalog'],
    queryFn: PublicAPI.getServices,
    staleTime: 1000 * 60 * 10, // 10 minutes (services change rarely)
    cacheTime: 1000 * 60 * 60, // 1 hour
  });
};

export const usePricingPreview = (config: PricingConfig) => {
  return useQuery({
    queryKey: ['pricing', 'preview', config],
    queryFn: () => PublicAPI.getPricingPreview(config),
    enabled: !!config.service_type,
    staleTime: 1000 * 60 * 2, // 2 minutes (pricing may change)
  });
};

// Mutation hooks with optimistic updates
export const useCreateBooking = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: CustomerAPI.createBooking,
    onSuccess: (newBooking) => {
      // Update booking list cache
      queryClient.setQueryData(['customer', 'bookings'], (old: Booking[]) => 
        [newBooking, ...(old || [])]
      );
      
      // Update dashboard data
      queryClient.invalidateQueries(['customer', 'dashboard']);
    }
  });
};
```

**Error Handling Strategy:**
```typescript
// Centralized error handling for API responses
const handleApiError = (error: AxiosError) => {
  if (error.response?.status === 400) {
    // Validation errors from Django REST
    const validationErrors = error.response.data;
    return formatValidationErrors(validationErrors);
  }
  
  if (error.response?.status === 401) {
    // Authentication required
    return 'Please log in to continue';
  }
  
  if (error.response?.status === 403) {
    // Permission denied
    return 'You do not have permission to perform this action';
  }
  
  if (error.response?.status >= 500) {
    // Server errors
    return 'Service temporarily unavailable. Please try again later.';
  }
  
  return 'An unexpected error occurred. Please try again.';
};

// Error boundary component for API errors
const APIErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary
      fallback={<ErrorFallback />}
      onError={(error) => {
        console.error('API Error:', error);
        // Optional: Send to error tracking service
      }}
    >
      {children}
    </ErrorBoundary>
  );
};
```

**Performance Optimization:**
- **Request deduplication:** TanStack Query automatically deduplicates identical requests
- **Background refetching:** Keep data fresh with background updates
- **Optimistic updates:** Immediate UI updates for better user experience
- **Intelligent caching:** Different cache times based on data volatility
- **Error recovery:** Automatic retry with exponential backoff

## Data Flow Architecture

**Customer Booking Journey (Guest):**
```
Marketing Site (Next.js SSR)
    ↓ Service selection
Booking Wizard (Zustand state + React Hook Form)
    ↓ Real-time pricing via TanStack Query
Services API ← → TanStack Query Cache
    ↓ Form submission via Axios
Guest Booking API → Payment Processing (Stripe)
    ↓ Payment confirmation
Confirmation Page + Email Notifications
```

**Customer Booking Journey (Authenticated):**
```
Marketing Site → Customer Dashboard (TanStack Query auth)
    ↓ Pre-filled from CustomerProfile
Booking Wizard (Enhanced with saved data)
    ↓ Django User + CustomerProfile integration
User Profile APIs ← → TanStack Query Cache
    ↓ Authenticated booking creation
Customer Booking API → Enhanced Payment (saved methods)
    ↓ Optimistic UI updates
Dashboard Updates + Real-time Tracking
```

**Staff Operations Flow:**
```
Staff Authentication (Separate auth context)
    ↓ Role-based permission loading
Staff Dashboard (TanStack Query with admin scope)
    ↓ Permission-based UI rendering
Booking + Customer Management
    ↓ CRUD operations with audit logging
Staff APIs ← → Admin Query Cache
    ↓ Real-time operational updates
WebSocket Integration → Live Dashboard Updates
```

## State Management Strategy

**Zustand Store Architecture:**
```typescript
// Authentication store (customer)
interface CustomerAuthStore {
  user: DjangoUser | null;
  customerProfile: CustomerProfile | null;
  isAuthenticated: boolean;
  login: (credentials: LoginData) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<CustomerProfile>) => void;
}

// Booking wizard store
interface BookingWizardStore {
  currentStep: number;
  serviceType: ServiceType;
  selectedOptions: BookingOptions;
  customerInfo: CustomerInfo;
  addresses: {
    pickup: Address | SavedAddress;
    delivery: Address | SavedAddress;
  };
  pricing: PricingBreakdown | null;
  
  // Actions
  setServiceType: (type: ServiceType) => void;
  setAddresses: (addresses: AddressData) => void;
  nextStep: () => void;
  previousStep: () => void;
  reset: () => void;
}

// UI state store
interface UIStore {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  notifications: Notification[];
  modals: {
    login: boolean;
    addressForm: boolean;
    paymentMethod: boolean;
  };
  
  // Actions
  toggleSidebar: () => void;
  openModal: (modal: keyof UIStore['modals']) => void;
  closeModal: (modal: keyof UIStore['modals']) => void;
  addNotification: (notification: Notification) => void;
}
```

**TanStack Query Integration:**
```typescript
// Query client configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes default
      cacheTime: 1000 * 60 * 30, // 30 minutes default
      retry: (failureCount, error) => {
        if (error.response?.status === 401) return false;
        return failureCount < 3;
      },
    },
    mutations: {
      retry: 1,
      onError: (error) => {
        const message = handleApiError(error as AxiosError);
        useUIStore.getState().addNotification({
          type: 'error',
          message,
          duration: 5000
        });
      }
    }
  }
});

// Provider setup
const App = ({ Component, pageProps }: AppProps) => {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-cream-50">
        <Component {...pageProps} />
      </div>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};
```

This comprehensive frontend documentation reflects the mature, AI-optimized technology stack while maintaining all the sophisticated customer experience and staff operational functionality. The technology choices prioritize development velocity, maintainability, and AI-assisted development compatibility.