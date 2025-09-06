# ToteTaxi Living Documentation

## About This Documentation

This living documentation serves as a **context-preservation system** for AI-assisted development, designed to maintain project continuity across conversations and development sessions. Unlike traditional project documentation that captures specifications and requirements, this documentation functions as **shared project memory** - preserving architectural decisions, business logic reasoning, and integration patterns that enable immediate technical discussions without context rebuilding.

## Documentation Philosophy

**Why Living Documentation for AI Development:**
Complex software projects require maintaining intricate relationships between business requirements, technical architecture, and implementation details. In AI-assisted development, this context must be explicitly captured because AI cannot retain project understanding across sessions. This documentation eliminates the need to re-explain ToteTaxi's business complexity, technical decisions, and architectural patterns every time development work resumes.

**Evolution Pattern:**
- **Phase 1 (Complete):** Strategic architecture and business requirements focused
- **Phase 2 (Current):** Implementation documentation with working foundation and step-by-step building guides
- **Phase 3 (Planned):** Complete system mapping with frontend-backend integration patterns

**Project Context:**
ToteTaxi is a luxury delivery service replacement system with significant business and technical complexity: multiple service types (Mini Moves, Standard Delivery, Specialty Items), sophisticated pricing engines with surcharges, Django User model with profile-based customer/staff separation, payment processing integration, and operational management workflows. This complexity requires detailed documentation to maintain development consistency and architectural integrity.

**Usage Guidelines:**
This documentation enables immediate technical conversations by providing complete project context. It captures not just what to build, but why architectural decisions were made, how business logic should function, and how components integrate. As the codebase grows, this documentation evolves from strategic overview to comprehensive implementation guide, always serving as the definitive source for project understanding and development coordination.

---

# ToteTaxi Frontend Living Documentation & Implementation Guide

**Current Technical Architecture - Next.js 14 + TypeScript + Tailwind v3 + AI-Optimized Stack**

## Implementation Status & Technology Stack

**Phase 2 Status - Foundation Complete:**
- ✅ **Dependencies Installed:** All React 19 compatible versions resolved
- ✅ **Foundation Layer:** API client with Django CSRF integration, TanStack Query provider, Zustand stores
- ✅ **Design System:** Variant-based components (Button, Input, Card, Modal) for easy client modifications
- ✅ **Backend Integration:** Working connection to Django APIs with type safety
- ✅ **Development Environment:** Tailwind v3 stable, TypeScript path aliases, file structure
- 🔄 **Current Phase:** Building marketing homepage with real backend data
- ⏳ **Next Phase:** Authentication implementation and booking wizard development

**Final Technology Stack (Implemented):**
```json
{
  "@tanstack/react-query": "^5.51.1",
  "@tanstack/react-query-devtools": "^5.51.1",
  "axios": "^1.6.2", 
  "zustand": "^4.4.7",
  "@headlessui/react": "^2.0.4",
  "@heroicons/react": "^2.0.18",
  "react-hook-form": "^7.48.2",
  "@hookform/resolvers": "^3.3.2",
  "zod": "^3.22.4",
  "clsx": "^2.0.0",
  "tailwind-merge": "^2.2.0",
  "tailwindcss": "^3.4.0",
  "postcss": "^8.4.0",
  "autoprefixer": "^10.4.0"
}
```

**Technology Decision Context:**
- **React 19 Compatibility Issue:** TanStack Query v4 incompatible, required v5 upgrade
- **Tailwind v4 Beta Rejected:** Downgraded to v3 stable following AI-familiar technology principle
- **Mature Technology Principle:** All choices prioritize stability and AI development compatibility
- **No Bleeding-Edge Technologies:** Ensures reliable development patterns and debugging

## System Architecture Overview (Implemented + Planned)

**ToteTaxi Frontend Ecosystem**
```
├── Foundation Layer (✅ IMPLEMENTED)
│   ├── Next.js 14 App Router with TypeScript
│   ├── TanStack Query v5 + Axios API integration  
│   ├── Zustand state management with persistence
│   ├── Tailwind v3 + custom luxury design tokens
│   └── Component variant system for client flexibility
├── Design System (✅ IMPLEMENTED)
│   ├── Button, Input, Card, Modal components
│   ├── Luxury brand aesthetics (navy/gold/cream)
│   ├── Headless UI accessibility primitives
│   └── Easy client modification patterns
├── Marketing Site (🔄 IN PROGRESS)
│   ├── Homepage with hero section and component testing
│   ├── Service showcase with real Django backend data
│   ├── Trust signals and conversion optimization  
│   └── SEO optimization and lead capture
├── Booking Wizard (⏳ PLANNED)
│   ├── Multi-step form with React Hook Form + Zod
│   ├── Dual-mode: Guest checkout + authenticated booking
│   ├── Real-time pricing via TanStack Query
│   └── Stripe payment integration
├── Customer Dashboard (⏳ PLANNED)
│   ├── Django User authentication integration
│   ├── CustomerProfile data management
│   ├── SavedAddress and PaymentMethod management
│   └── Booking history and account settings
└── Admin Dashboard (⏳ PLANNED)
    ├── Staff authentication with StaffProfile roles
    ├── Booking management and customer support
    ├── Audit logging integration
    └── Business intelligence and reporting
```

## Current File Structure (Implemented)

```
frontend/src/
├── lib/                          ✅ Core utilities
│   ├── query-client.ts          ✅ TanStack Query v5 configuration
│   └── api-client.ts            ✅ Axios + Django CSRF integration
├── types/
│   └── index.ts                 ✅ Django User/Profile TypeScript interfaces
├── stores/
│   ├── auth-store.ts            ✅ Zustand customer auth with persistence
│   └── ui-store.ts              ✅ UI state (modals, notifications, sidebar)
├── utils/
│   └── cn.ts                    ✅ Tailwind class merging utility
├── components/
│   ├── providers/
│   │   └── query-provider.tsx   ✅ TanStack Query provider wrapper
│   ├── layout/
│   │   └── main-layout.tsx      ✅ Base layout with header/footer
│   ├── ui/                      ✅ Design system components
│   │   ├── button.tsx           ✅ Variant-based button component
│   │   ├── input.tsx            ✅ Form input with validation styling
│   │   ├── card.tsx             ✅ Content container variants
│   │   ├── modal.tsx            ✅ Headless UI modal wrapper
│   │   └── index.ts             ✅ Component exports
│   └── test-api-connection.tsx  ✅ Backend connection test component
└── app/
    ├── layout.tsx               ✅ Root layout with providers
    ├── page.tsx                 ✅ Homepage with component testing
    ├── globals.css              ✅ Tailwind v3 + luxury design tokens
    └── (additional pages)       ⏳ Future application pages

Configuration Files:
├── tailwind.config.js           ✅ Custom luxury color scheme
├── postcss.config.js            ✅ Tailwind v3 PostCSS setup
├── tsconfig.json                ✅ TypeScript with @ path alias
└── package.json                 ✅ Dependencies with exact versions
```

## Technology Integration Patterns (Implemented)

**API Client with Django Integration:**
```typescript
// src/lib/api-client.ts (WORKING IMPLEMENTATION)
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8005',
  withCredentials: true, // Essential for Django session cookies
  headers: { 'Content-Type': 'application/json' }
});

// Django CSRF token integration
apiClient.interceptors.request.use(async (config) => {
  if (['post', 'put', 'patch', 'delete'].includes(config.method!)) {
    try {
      const csrfResponse = await axios.get(`${config.baseURL}/api/customer/csrf-token/`, {
        withCredentials: true
      });
      config.headers['X-CSRFToken'] = csrfResponse.data.csrf_token;
    } catch (error) {
      console.warn('Could not fetch CSRF token:', error);
    }
  }
  return config;
});

// Authentication error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth state and redirect to login
      console.log('Auth error detected');
    }
    return Promise.reject(error);
  }
);
```

**TanStack Query v5 Configuration:**
```typescript
// src/lib/query-client.ts (WORKING IMPLEMENTATION)
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30,   // v5 syntax (was cacheTime in v4)
      retry: (failureCount, error: any) => {
        if (error?.response?.status === 401) return false;
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    }
  }
});
```

**Component Variant System for Client Flexibility:**
```typescript
// src/components/ui/button.tsx (IMPLEMENTED)
import { cn } from '@/utils/cn';
import { ButtonHTMLAttributes, forwardRef } from 'react';

// Easy client modification - all styling in config objects
const buttonVariants = {
  variant: {
    primary: 'bg-navy-900 text-white hover:bg-navy-800 focus:ring-navy-500',
    secondary: 'bg-gold-500 text-navy-900 hover:bg-gold-600 focus:ring-gold-400',
    outline: 'border-2 border-navy-900 text-navy-900 hover:bg-navy-50 focus:ring-navy-300',
    ghost: 'text-navy-900 hover:bg-navy-100 focus:ring-navy-300',
  },
  size: {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl',
  },
  rounded: {
    none: 'rounded-none',
    sm: 'rounded',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  }
};

const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants.variant;
  size?: keyof typeof buttonVariants.size;
  rounded?: keyof typeof buttonVariants.rounded;
  children: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md', 
  rounded = 'md',
  className,
  children,
  ...props
}, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        baseStyles,
        buttonVariants.variant[variant],
        buttonVariants.size[size], 
        buttonVariants.rounded[rounded],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';
```

## State Management Architecture (Implemented)

**Zustand Stores with Persistence:**
```typescript
// src/stores/auth-store.ts (IMPLEMENTED)
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DjangoUser, CustomerProfile } from '@/types';

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
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      customerProfile: null,
      isAuthenticated: false,
      isLoading: false,

      // Actions
      setAuth: (user, profile) => set({
        user,
        customerProfile: profile,
        isAuthenticated: true,
        isLoading: false
      }),

      clearAuth: () => set({
        user: null,
        customerProfile: null,
        isAuthenticated: false,
        isLoading: false
      }),

      setLoading: (loading) => set({ isLoading: loading }),

      updateProfile: (updates) => set((state) => ({
        customerProfile: state.customerProfile 
          ? { ...state.customerProfile, ...updates }
          : null
      }))
    }),
    {
      name: 'totetaxi-auth',
      partialize: (state) => ({
        user: state.user,
        customerProfile: state.customerProfile,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);
```

## Client Modification Strategy (Implemented)

**Easy Styling Changes (Configuration Level):**
```javascript
// tailwind.config.js - Update colors here for brand changes
module.exports = {
  theme: {
    extend: {
      colors: {
        // CLIENT: Change these values for brand updates
        navy: {
          50: '#f0f4f8',   // Light navy
          900: '#1a365d'   // Dark navy
        },
        gold: {
          50: '#fffdf7',   // Light gold
          500: '#d69e2e',  // Medium gold
          900: '#5f370e'   // Dark gold
        },
        cream: {
          50: '#fefcf3',   // Light cream
          100: '#fef7e0'   // Medium cream
        }
      }
    }
  }
}

// Component variant changes - Update in individual component files
const buttonVariants = {
  variant: {
    // CLIENT: Modify these classes for design changes
    primary: 'bg-navy-900 text-white hover:bg-navy-800',
    secondary: 'bg-gold-500 text-navy-900 hover:bg-gold-600'
  }
};
```

## Step-by-Step Development Guide

### Adding New Components

**Template for New UI Components:**
```typescript
// Pattern: src/components/ui/[component-name].tsx
import { cn } from '@/utils/cn';
import { forwardRef } from 'react';

// 1. Define variant configurations for easy client changes
const componentVariants = {
  variant: {
    default: 'bg-white border border-gray-200',
    elevated: 'bg-white shadow-lg',
    luxury: 'bg-white border border-gold-200 shadow-xl'
  },
  size: {
    sm: 'p-4',
    md: 'p-6', 
    lg: 'p-8'
  }
};

// 2. Create TypeScript interface
interface ComponentProps {
  variant?: keyof typeof componentVariants.variant;
  size?: keyof typeof componentVariants.size;
  children: React.ReactNode;
  className?: string;
}

// 3. Implement with forwardRef for flexibility
export const Component = forwardRef<HTMLDivElement, ComponentProps>(({
  variant = 'default',
  size = 'md',
  className,
  children,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'transition-all duration-200', // Base styles
        componentVariants.variant[variant],
        componentVariants.size[size],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

Component.displayName = 'Component';

// 4. Export from src/components/ui/index.ts
export { Component } from './component';
```

### Adding New Pages

**Template for New Application Pages:**
```typescript
// Pattern: src/app/[page-name]/page.tsx
'use client';

import { MainLayout } from '@/components/layout/main-layout';
import { Button, Card, CardHeader, CardContent } from '@/components/ui';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export default function PageName() {
  // 1. Data fetching with TanStack Query
  const { data, isLoading, error } = useQuery({
    queryKey: ['page-data'],
    queryFn: async () => {
      const response = await apiClient.get('/api/endpoint/');
      return response.data;
    }
  });

  // 2. Loading and error states
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading data</div>;

  // 3. Page layout with consistent structure
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-3xl font-serif font-bold text-navy-900 mb-8">
          Page Title
        </h1>
        
        <Card variant="elevated">
          <CardHeader>
            <h2 className="text-xl font-medium text-navy-900">Section Title</h2>
          </CardHeader>
          <CardContent>
            {/* Page content */}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
```

### Adding API Integration

**Template for New API Hooks:**
```typescript
// Pattern: src/hooks/use-[feature-name].ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { DataType } from '@/types';

// 1. Query hook for data fetching
export const useFeatureData = (id?: string) => {
  return useQuery({
    queryKey: ['feature', id],
    queryFn: async (): Promise<DataType> => {
      const response = await apiClient.get(`/api/feature/${id}/`);
      return response.data;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30    // 30 minutes
  });
};

// 2. Mutation hook for data updates
export const useUpdateFeature = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: UpdateDataType): Promise<DataType> => {
      const response = await apiClient.put(`/api/feature/${data.id}/`, data);
      return response.data;
    },
    onSuccess: (updatedData) => {
      // Update cached data
      queryClient.setQueryData(['feature', updatedData.id], updatedData);
      // Invalidate related queries
      queryClient.invalidateQueries(['feature-list']);
    }
  });
};
```

## Core Frontend Applications (Implementation Guide)

### 🏠 Marketing Site (🔄 IN PROGRESS)

**Current Implementation Status:**
- ✅ Basic homepage with hero section
- ✅ Component testing interface
- ✅ Working Django backend connection
- 🔄 Service showcase with real data
- ⏳ Trust signals and testimonials
- ⏳ SEO optimization

**Next Development Steps:**
```typescript
// 1. Create service showcase component
// src/components/marketing/service-showcase.tsx
export const ServiceShowcase = () => {
  const { data: services, isLoading } = useQuery({
    queryKey: ['services', 'catalog'],
    queryFn: async () => {
      const response = await apiClient.get('/api/public/services/');
      return response.data;
    }
  });

  if (isLoading) return <ServiceSkeletonLoader />;

  return (
    <section className="py-16 bg-cream-50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-serif font-bold text-center text-navy-900 mb-12">
          Our Services
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {services.mini_move_packages.map((pkg) => (
            <ServiceCard key={pkg.id} service={pkg} />
          ))}
        </div>
      </div>
    </section>
  );
};
```

**Real-time Pricing Integration:**
```typescript
// src/components/marketing/pricing-preview.tsx
export const PricingPreview = ({ serviceType }: { serviceType: string }) => {
  const { data: pricing } = useQuery({
    queryKey: ['pricing', 'preview', serviceType],
    queryFn: () => apiClient.post('/api/public/pricing-preview/', {
      service_type: serviceType,
      pickup_date: new Date().toISOString().split('T')[0]
    }),
    enabled: !!serviceType,
    staleTime: 1000 * 60 * 2 // 2 minutes
  });

  return (
    <Card variant="luxury" className="text-center">
      <CardContent>
        <div className="text-2xl font-bold text-navy-900 mb-2">
          ${pricing?.pricing?.total_price_dollars || '---'}
        </div>
        <p className="text-navy-600 text-sm">Starting price</p>
      </CardContent>
    </Card>
  );
};
```

### 📝 Booking Wizard (⏳ PLANNED - Ready for Implementation)

**Development Roadmap:**
```typescript
// Implementation sequence using our foundation:

// 1. Create wizard state management
// src/stores/booking-wizard-store.ts
interface BookingWizardState {
  currentStep: number;
  serviceType: 'mini_move' | 'standard_delivery' | 'specialty_item';
  selectedOptions: BookingOptions;
  customerInfo: CustomerInfo;
  addresses: {
    pickup: Address | SavedAddress;
    delivery: Address | SavedAddress;
  };
  pricing: PricingBreakdown | null;
  isSubmitting: boolean;
}

export const useBookingWizard = create<BookingWizardState>((set, get) => ({
  currentStep: 1,
  serviceType: 'mini_move',
  selectedOptions: {},
  customerInfo: {},
  addresses: { pickup: null, delivery: null },
  pricing: null,
  isSubmitting: false,
  
  nextStep: () => set((state) => ({ 
    currentStep: Math.min(state.currentStep + 1, 5) 
  })),
  setServiceType: (type) => set({ serviceType: type }),
  updatePricing: (pricing) => set({ pricing }),
  reset: () => set({
    currentStep: 1,
    serviceType: 'mini_move',
    selectedOptions: {},
    // ... reset other fields
  })
}));

// 2. Multi-step form components
// src/components/booking/wizard-steps/
// - service-selection-step.tsx
// - date-time-step.tsx  
// - address-step.tsx
// - customer-info-step.tsx
// - review-payment-step.tsx

// 3. Form validation with Zod
// src/lib/booking-validation.ts
export const serviceSelectionSchema = z.object({
  service_type: z.enum(['mini_move', 'standard_delivery', 'specialty_item']),
  mini_move_package_id: z.string().uuid().optional(),
  standard_delivery_item_count: z.number().min(1).optional(),
  specialty_item_ids: z.array(z.string().uuid()).optional(),
  pickup_date: z.date().min(new Date()),
  coi_required: z.boolean().default(false)
});
```

**Dual-Mode Customer Handling:**
```typescript
// Guest vs Authenticated User Flow
export const CustomerInfoStep = () => {
  const { isAuthenticated, customerProfile } = useAuthStore();
  const { register, control } = useForm<CustomerInfoForm>({
    resolver: zodResolver(customerInfoSchema)
  });

  if (isAuthenticated) {
    return (
      <AuthenticatedCustomerForm 
        profile={customerProfile}
        onSubmit={handleAuthenticatedSubmit}
      />
    );
  }

  return (
    <GuestCustomerForm 
      register={register}
      control={control}
      onSubmit={handleGuestSubmit}
    />
  );
};
```

### 👤 Customer Dashboard (⏳ PLANNED - Foundation Ready)

**Implementation Using Current Architecture:**
```typescript
// 1. Dashboard data management with TanStack Query
export const useCustomerDashboard = () => {
  const userQuery = useQuery({
    queryKey: ['customer', 'auth', 'user'],
    queryFn: () => apiClient.get('/api/customer/auth/user/')
  });
  
  const profileQuery = useQuery({
    queryKey: ['customer', 'profile'],
    queryFn: () => apiClient.get('/api/customer/profile/'),
    enabled: !!userQuery.data
  });
  
  const bookingsQuery = useQuery({
    queryKey: ['customer', 'bookings'],
    queryFn: () => apiClient.get('/api/customer/bookings/'),
    enabled: !!userQuery.data
  });

  return {
    user: userQuery.data?.user,
    profile: profileQuery.data,
    bookings: bookingsQuery.data,
    isLoading: userQuery.isLoading || profileQuery.isLoading
  };
};

// 2. Dashboard components using our design system
// src/components/dashboard/
// - dashboard-overview.tsx
// - booking-history.tsx
// - address-book.tsx
// - payment-methods.tsx
// - profile-settings.tsx
```

**Address Management with Optimistic Updates:**
```typescript
// Address CRUD operations
export const useAddressManagement = () => {
  const queryClient = useQueryClient();
  
  const createAddress = useMutation({
    mutationFn: (address: CreateAddressData) =>
      apiClient.post('/api/customer/addresses/', address),
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

### ⚙️ Admin Dashboard (⏳ PLANNED)

**Staff Authentication Integration:**
```typescript
// Separate staff auth store
interface StaffAuthState {
  user: DjangoUser | null;
  staffProfile: StaffProfile | null;
  isAuthenticated: boolean;
  permissions: StaffPermissions;
  isLoading: boolean;
}

// Role-based UI rendering
export const useStaffPermissions = () => {
  const { staffProfile } = useStaffAuth();
  
  return {
    canApproveRefunds: staffProfile?.can_approve_refunds,
    canManageStaff: staffProfile?.can_manage_staff,
    canViewReports: staffProfile?.can_view_financial_reports
  };
};
```

## Authentication Implementation Guide

**Step 1: Authentication Components**
```typescript
// src/components/auth/login-form.tsx
export const LoginForm = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginData>({
    resolver: zodResolver(loginSchema)
  });
  
  const loginMutation = useMutation({
    mutationFn: (data: LoginData) => 
      apiClient.post('/api/customer/auth/login/', data),
    onSuccess: (response) => {
      useAuthStore.getState().setAuth(response.data.user, response.data.customer_profile);
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

**Step 2: Protected Route Pattern**
```typescript
// src/components/auth/protected-route.tsx
export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  
  if (isLoading) return <div>Loading...</div>;
  
  if (!isAuthenticated) {
    return <LoginForm />;
  }
  
  return <>{children}</>;
};
```

## TypeScript Integration (Implemented)

**Complete Django Model Interfaces:**
```typescript
// src/types/index.ts (IMPLEMENTED)
export interface DjangoUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  date_joined: string;
}

export interface CustomerProfile {
  id: string;
  user: DjangoUser;
  phone: string;
  stripe_customer_id: string;
  total_bookings: number;
  total_spent_cents: number;
  total_spent_dollars: number;
  preferred_pickup_time: 'morning' | 'afternoon' | 'evening';
  email_notifications: boolean;
  sms_notifications: boolean;
  is_vip: boolean;
  last_booking_at: string | null;
}

export interface SavedAddress {
  id: string;
  user: number;
  nickname: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: 'NY' | 'CT' | 'NJ';
  zip_code: string;
  delivery_instructions?: string;
  times_used: number;
  last_used_at: string | null;
  is_active: boolean;
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
  features: {
    priority_scheduling: boolean;
    protective_wrapping: boolean;
  };
}

export interface ServiceCatalog {
  mini_move_packages: MiniMovePackage[];
  standard_delivery: {
    price_per_item_dollars: number;
    minimum_items: number;
    minimum_charge_dollars: number;
    same_day_flat_rate_dollars: number;
    max_weight_per_item_lbs: number;
  } | null;
  specialty_items: SpecialtyItem[];
}

export interface AuthResponse {
  message: string;
  user: DjangoUser;
  customer_profile: CustomerProfile;
  csrf_token: string;
}
```

## Error Handling & Performance

**Centralized Error Handling:**
```typescript
// src/lib/error-handling.ts
import { AxiosError } from 'axios';

export const handleApiError = (error: AxiosError) => {
  if (error.response?.status === 400) {
    const validationErrors = error.response.data;
    return formatValidationErrors(validationErrors);
  }
  
  if (error.response?.status === 401) {
    return 'Please log in to continue';
  }
  
  if (error.response?.status === 403) {
    return 'You do not have permission to perform this action';
  }
  
  if (error.response?.status >= 500) {
    return 'Service temporarily unavailable. Please try again later.';
  }
  
  return 'An unexpected error occurred. Please try again.';
};
```

**Performance Optimization Patterns:**
```typescript
// Intelligent caching based on data volatility
export const useServiceCatalog = () => {
  return useQuery({
    queryKey: ['services', 'catalog'],
    queryFn: () => apiClient.get('/api/public/services/'),
    staleTime: 1000 * 60 * 10, // 10 minutes (services rarely change)
    gcTime: 1000 * 60 * 60     // 1 hour
  });
};

export const usePricingPreview = (config: PricingConfig) => {
  return useQuery({
    queryKey: ['pricing', 'preview', config],
    queryFn: () => apiClient.post('/api/public/pricing-preview/', config),
    enabled: !!config.service_type,
    staleTime: 1000 * 60 * 2   // 2 minutes (pricing may change)
  });
};
```

## Development Workflow

**Adding New Features (Step-by-Step):**

1. **Plan the Component Structure**
   - Identify reusable patterns from existing components
   - Plan data flow using TanStack Query hooks
   - Design variant system for client flexibility

2. **Implement with Type Safety**
   - Add TypeScript interfaces to `src/types/index.ts`
   - Create API integration hooks in `src/hooks/`
   - Build components using design system patterns

3. **Test Integration**
   - Verify backend API connection
   - Test component variants and responsiveness
   - Validate form handling and error states

4. **Document Patterns**
   - Update living documentation with new patterns
   - Add implementation examples for future reference
   - Note any new client modification points

This comprehensive documentation serves as both implementation reference and step-by-step building guide, ensuring consistent development patterns while maintaining the flexibility for easy client modifications. The foundation is complete and ready for rapid application development using established patterns.