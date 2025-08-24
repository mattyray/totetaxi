# **ToteTaxi Frontend Technical Documentation & Roadmap**

*Living Document - Next.js 14 + TypeScript + Tailwind CSS*

## **System Architecture Overview**

```
Frontend (Next.js on Netlify:3000)
├── Marketing Site (SSR for SEO)
│   ├── Home, Services, Pricing, FAQ
│   ├── How It Works, Partners, Contact
│   └── Press, About, Legal
├── Booking Wizard (Client-Side SPA)
│   ├── Service Selection (Mini Moves, Standard, Specialty)
│   ├── Calendar & Availability
│   ├── Details Collection (Addresses, Items, COI)
│   ├── Review & Pricing
│   ├── Stripe Checkout Integration
│   └── Confirmation & Tracking
├── Admin Dashboard (Staff Interface)
│   ├── Bookings Management
│   ├── Customer Profiles
│   ├── Financial Operations
│   └── Reports & Analytics
├── Design System
│   ├── BLADE-inspired UI Components
│   ├── Luxury Brand Aesthetics
│   └── Mobile-First Responsive Design
└── Infrastructure
    ├── API Integration Layer
    ├── State Management (Zustand)
    ├── Form Validation (Zod)
    └── Performance Optimization
```

## **Frontend Architecture Deep Dive**

### **🏠 Marketing Site - Static & SEO-Optimized**

**Purpose:** Convert visitors into customers with luxury positioning and clear value proposition  
**Why SSR:** SEO critical for organic traffic, fast initial load times, social sharing  
**File Structure:** `src/app/(marketing)/` - App Router with layouts

**Responsibilities:**
- **Brand Positioning** - Communicate luxury, reliability, and premium service
- **Service Education** - Explain Mini Moves, Standard Delivery, Specialty Items
- **Trust Building** - Customer testimonials, press mentions, security badges
- **SEO Optimization** - Structured data, meta tags, Core Web Vitals
- **Lead Capture** - Convert visitors to booking wizard or contact forms
- **Mobile Experience** - 70% of luxury customers browse on mobile

**Page Architecture:**
```typescript
// src/app/(marketing)/layout.tsx
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-white">
      <MarketingHeader />
      <main className="flex-1">
        {children}
      </main>
      <MarketingFooter />
    </div>
  )
}

// src/app/(marketing)/page.tsx - Home Page
export default function HomePage() {
  return (
    <>
      <HeroSection />
      <ServicesOverview />
      <TrustIndicators />
      <HowItWorks />
      <CustomerTestimonials />
      <CallToAction />
    </>
  )
}

// src/app/(marketing)/services/page.tsx - Services Deep Dive
export default function ServicesPage() {
  return (
    <>
      <ServiceHero />
      <MiniMovesSection />
      <StandardDeliverySection />
      <SpecialtyItemsSection />
      <PricingTransparency />
      <ServiceComparison />
      <BookingCTA />
    </>
  )
}
```

**Key Components:**
```typescript
// components/marketing/HeroSection.tsx
interface HeroSectionProps {
  variant?: 'home' | 'services' | 'about'
}

export function HeroSection({ variant = 'home' }: HeroSectionProps) {
  return (
    <section className="relative bg-gradient-to-b from-slate-50 to-white py-20 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Luxury Delivery Between 
            <span className="text-blue-600"> NYC & The Hamptons</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Premium door-to-door service for your most valuable possessions. 
            Trusted by Blade passengers and luxury travelers since 2016.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <BookNowButton size="lg" />
            <LearnMoreButton variant="ghost" />
          </div>
        </div>
        <TrustBadges className="mt-16" />
      </div>
    </section>
  )
}

// components/marketing/ServicesOverview.tsx
export function ServicesOverview() {
  const services = [
    {
      name: 'Mini Moves',
      description: 'Complete household relocations with white-glove service',
      packages: ['Petite (15 items)', 'Standard (30 items)', 'Full (unlimited)'],
      startingPrice: '$995',
      cta: 'Book Mini Move',
      icon: TruckIcon,
      popular: true
    },
    {
      name: 'Standard Delivery',  
      description: 'Per-item delivery for weekend travelers and Blade passengers',
      packages: ['$95 per item', '$285 minimum', 'Same-day available'],
      startingPrice: '$95',
      cta: 'Book Delivery',
      icon: PackageIcon
    },
    {
      name: 'Specialty Items',
      description: 'Premium handling for valuable and oversized items',
      packages: ['Peloton ($500)', 'Surfboards ($350)', 'Cribs ($350)'],
      startingPrice: '$275',
      cta: 'Add Specialty',
      icon: StarIcon
    }
  ]

  return (
    <section className="py-24 bg-gray-50">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Three Ways We Serve You
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            From weekend getaways to complete relocations, we handle your logistics with care.
          </p>
        </div>
        
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 lg:max-w-none lg:grid-cols-3">
          {services.map((service) => (
            <ServiceCard key={service.name} service={service} />
          ))}
        </div>
      </div>
    </section>
  )
}
```

**SEO Strategy:**
```typescript
// lib/seo.ts
export function generatePageMetadata({
  title,
  description,
  path = '',
  image = '/images/og-default.jpg'
}): Metadata {
  const baseUrl = 'https://totetaxi.com'
  const fullUrl = `${baseUrl}${path}`
  
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: fullUrl,
      siteName: 'ToteTaxi',
      images: [{ url: `${baseUrl}${image}` }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${baseUrl}${image}`],
    },
    alternates: {
      canonical: fullUrl,
    },
  }
}

// JSON-LD structured data for rich snippets
export function generateServiceSchema(service: ServiceType) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    'name': service.name,
    'description': service.description,
    'provider': {
      '@type': 'Organization',
      'name': 'ToteTaxi',
      'url': 'https://totetaxi.com'
    },
    'areaServed': ['New York City', 'The Hamptons'],
    'serviceType': 'Luxury Delivery Service'
  }
}
```

**Performance Optimization:**
```typescript
// next.config.ts
const nextConfig = {
  images: {
    domains: ['images.totetaxi.com'],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@heroicons/react'],
  },
}

// components/OptimizedImage.tsx
interface OptimizedImageProps {
  src: string
  alt: string
  priority?: boolean
  className?: string
}

export function OptimizedImage({ src, alt, priority = false, className }: OptimizedImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      priority={priority}
      className={className}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,..."
    />
  )
}
```

**Inter-Section Dependencies:**
- **→ Booking Wizard**: All CTAs lead to booking flow
- **→ Design System**: Uses shared components and styling
- **← Backend API**: Fetches pricing, availability for display
- **SEO Tools**: Google Analytics, Search Console integration

---

### **📝 Booking Wizard - Multi-Step Conversion Flow**

**Purpose:** Guide customers through complex booking process with minimal friction  
**Why SPA:** Rich interactions, form state persistence, real-time pricing updates  
**File Structure:** `src/app/book/` - Client-side routing with state management

**Responsibilities:**
- **Service Selection** - Guide users to optimal service choice
- **Calendar Integration** - Show availability, surcharges, constraints
- **Form Management** - Complex multi-step form with validation
- **Real-time Pricing** - Dynamic price updates as options change
- **Address Validation** - Ensure accurate pickup/delivery locations
- **Payment Integration** - Secure Stripe checkout with error handling
- **State Persistence** - Save progress, handle browser refresh
- **Mobile Optimization** - Touch-friendly, thumb-navigable interface

**Wizard Architecture:**
```typescript
// types/booking.ts
export interface BookingState {
  // Step tracking
  currentStep: BookingStep
  completedSteps: BookingStep[]
  
  // Service selection
  serviceType: 'mini_move' | 'standard_delivery' | 'specialty_items'
  packageType?: 'petite' | 'standard' | 'full'
  itemCount?: number
  specialtyItems: SpecialtyItemSelection[]
  
  // Scheduling
  selectedDate: Date | null
  timeWindow: string
  isRushDelivery: boolean
  
  // Addresses
  pickupAddress: Address | null
  dropoffAddress: Address | null
  
  // Options
  coiRequired: boolean
  specialInstructions: string
  
  // Customer
  customer: CustomerInfo | null
  
  // Pricing
  priceBreakdown: PriceBreakdown | null
  finalTotal: number
  
  // Payment
  stripeClientSecret: string | null
  paymentStatus: 'idle' | 'processing' | 'succeeded' | 'failed'
}

export type BookingStep = 
  | 'service-selection'
  | 'calendar'
  | 'details'
  | 'review'
  | 'payment'
  | 'confirmation'
```

**State Management:**
```typescript
// stores/bookingStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface BookingStore extends BookingState {
  // Actions
  setServiceType: (type: BookingState['serviceType']) => void
  setPackageType: (type: BookingState['packageType']) => void
  setSelectedDate: (date: Date) => void
  setAddress: (type: 'pickup' | 'dropoff', address: Address) => void
  setCustomerInfo: (customer: CustomerInfo) => void
  updatePricing: () => Promise<void>
  
  // Navigation
  goToStep: (step: BookingStep) => void
  goToNextStep: () => void
  goToPreviousStep: () => void
  canProceedToNext: () => boolean
  
  // Persistence
  resetBooking: () => void
  loadSavedBooking: () => void
}

export const useBookingStore = create<BookingStore>()(
  persist(
    (set, get) => ({
      // Initial state
      currentStep: 'service-selection',
      completedSteps: [],
      serviceType: null,
      // ... other initial values
      
      // Actions
      setServiceType: (type) => {
        set({ serviceType: type })
        // Auto-advance for simple selections
        if (type === 'standard_delivery') {
          get().goToStep('calendar')
        }
      },
      
      updatePricing: async () => {
        const state = get()
        if (!state.serviceType || !state.selectedDate) return
        
        try {
          const pricing = await api.bookings.calculatePricing({
            serviceType: state.serviceType,
            packageType: state.packageType,
            date: state.selectedDate,
            specialtyItems: state.specialtyItems,
            coiRequired: state.coiRequired
          })
          
          set({ 
            priceBreakdown: pricing.breakdown,
            finalTotal: pricing.total 
          })
        } catch (error) {
          console.error('Pricing calculation failed:', error)
        }
      },
      
      canProceedToNext: () => {
        const { currentStep, serviceType, selectedDate, pickupAddress, dropoffAddress } = get()
        
        switch (currentStep) {
          case 'service-selection':
            return !!serviceType
          case 'calendar':
            return !!selectedDate
          case 'details':
            return !!pickupAddress && !!dropoffAddress
          case 'review':
            return true // Review is always ready if we got here
          default:
            return false
        }
      }
    }),
    {
      name: 'totetaxi-booking',
      partialize: (state) => ({
        serviceType: state.serviceType,
        packageType: state.packageType,
        selectedDate: state.selectedDate,
        // Don't persist sensitive data
      })
    }
  )
)
```

**Step Components:**
```typescript
// components/booking/ServiceSelectionStep.tsx
export function ServiceSelectionStep() {
  const { serviceType, setServiceType } = useBookingStore()
  
  const services = [
    {
      id: 'mini_move',
      name: 'Mini Move',
      description: 'Complete household relocation',
      bestFor: 'Moving apartments, seasonal relocations',
      startingPrice: 995,
      popular: true,
      icon: TruckIcon,
      features: [
        'White-glove packing service',
        'Insurance included on Standard & Full',
        'Flexible scheduling',
        'Up to 30 items (Standard)'
      ]
    },
    {
      id: 'standard_delivery',
      name: 'Standard Delivery', 
      description: 'Per-item weekend delivery',
      bestFor: 'Weekend trips, Blade passengers',
      startingPrice: 95,
      icon: PackageIcon,
      features: [
        '$95 per item',
        '$285 minimum order',
        'Same-day available (+$75)',
        'Perfect for luggage & essentials'
      ]
    },
    {
      id: 'specialty_items',
      name: 'Specialty Items',
      description: 'Premium handling for valuable items',
      bestFor: 'Pelotons, surfboards, artwork',
      startingPrice: 275,
      icon: StarIcon,
      features: [
        'Expert handling protocols',
        'Custom packaging available',
        'Only when van is scheduled',
        'Perfect add-on to Mini Moves'
      ]
    }
  ]

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          How Can We Help You Today?
        </h1>
        <p className="text-lg text-gray-600">
          Choose the service that best fits your needs
        </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-3">
        {services.map((service) => (
          <ServiceCard
            key={service.id}
            service={service}
            selected={serviceType === service.id}
            onClick={() => setServiceType(service.id as any)}
          />
        ))}
      </div>
      
      {/* Conditional sub-options */}
      {serviceType === 'mini_move' && <MiniMovePackageSelector />}
      {serviceType === 'specialty_items' && <SpecialtyItemSelector />}
    </div>
  )
}

// components/booking/CalendarStep.tsx
export function CalendarStep() {
  const { selectedDate, setSelectedDate, serviceType } = useBookingStore()
  const [availabilityData, setAvailabilityData] = useState<AvailabilityData | null>(null)
  
  // Fetch availability when step loads
  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        const data = await api.services.getAvailability(serviceType)
        setAvailabilityData(data)
      } catch (error) {
        console.error('Failed to fetch availability:', error)
      }
    }
    
    fetchAvailability()
  }, [serviceType])

  const getDayInfo = (date: Date): DayInfo => {
    if (!availabilityData) return { available: false, surcharge: 0 }
    
    const dateStr = format(date, 'yyyy-MM-dd')
    return availabilityData.dates[dateStr] || { available: false, surcharge: 0 }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          When Do You Need This?
        </h1>
        <p className="text-lg text-gray-600">
          Select your preferred pickup date
        </p>
      </div>
      
      <BookingCalendar
        selected={selectedDate}
        onSelect={setSelectedDate}
        getDayInfo={getDayInfo}
        minDate={new Date()}
        maxDate={addMonths(new Date(), 2)}
      />
      
      {selectedDate && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">
            {format(selectedDate, 'EEEE, MMMM do, yyyy')}
          </h3>
          <TimeWindowSelector />
          <SurchargeNotice date={selectedDate} />
        </div>
      )}
    </div>
  )
}

// components/booking/DetailsStep.tsx  
export function DetailsStep() {
  const { 
    pickupAddress, 
    dropoffAddress, 
    setAddress,
    customer,
    setCustomerInfo 
  } = useBookingStore()
  
  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Pickup & Delivery Details
        </h1>
        <p className="text-lg text-gray-600">
          Where should we collect and deliver your items?
        </p>
      </div>
      
      <div className="space-y-8">
        {/* Pickup Address */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <MapPinIcon className="w-5 h-5 mr-2 text-blue-600" />
            Pickup Address
          </h2>
          <AddressInput
            value={pickupAddress}
            onChange={(address) => setAddress('pickup', address)}
            placeholder="Enter pickup address..."
          />
        </div>
        
        {/* Delivery Address */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <MapPinIcon className="w-5 h-5 mr-2 text-green-600" />
            Delivery Address
          </h2>
          <AddressInput
            value={dropoffAddress}
            onChange={(address) => setAddress('dropoff', address)}
            placeholder="Enter delivery address..."
          />
        </div>
        
        {/* Customer Information */}
        <CustomerInfoForm
          value={customer}
          onChange={setCustomerInfo}
        />
        
        {/* Optional fields */}
        <div className="border-t pt-8">
          <COIToggle />
          <SpecialInstructionsField />
        </div>
      </div>
    </div>
  )
}
```

**Real-time Pricing Integration:**
```typescript
// hooks/usePricingUpdates.ts
export function usePricingUpdates() {
  const updatePricing = useBookingStore(state => state.updatePricing)
  const bookingState = useBookingStore()
  
  // Debounce pricing updates to avoid excessive API calls
  const debouncedUpdatePricing = useMemo(
    () => debounce(updatePricing, 500),
    [updatePricing]
  )
  
  // Update pricing when relevant fields change
  useEffect(() => {
    if (bookingState.serviceType && bookingState.selectedDate) {
      debouncedUpdatePricing()
    }
  }, [
    bookingState.serviceType,
    bookingState.packageType,
    bookingState.selectedDate,
    bookingState.specialtyItems,
    bookingState.coiRequired,
    debouncedUpdatePricing
  ])
  
  return {
    pricing: bookingState.priceBreakdown,
    total: bookingState.finalTotal,
    isLoading: !bookingState.priceBreakdown
  }
}

// components/booking/PricingDisplay.tsx
export function PricingDisplay({ variant = 'sidebar' }: { variant?: 'sidebar' | 'full' }) {
  const { pricing, total, isLoading } = usePricingUpdates()
  
  if (isLoading) {
    return <PricingSkeleton variant={variant} />
  }
  
  if (!pricing) {
    return <div className="text-gray-500">Select options to see pricing</div>
  }
  
  return (
    <div className={cn(
      'bg-white rounded-lg border',
      variant === 'sidebar' ? 'p-4' : 'p-6'
    )}>
      <h3 className="font-semibold mb-4">Price Breakdown</h3>
      
      <div className="space-y-2">
        {pricing.lineItems.map((item, index) => (
          <div key={index} className="flex justify-between text-sm">
            <span className="text-gray-600">{item.name}</span>
            <span className="font-medium">${item.amount}</span>
          </div>
        ))}
        
        {pricing.surcharges?.map((surcharge, index) => (
          <div key={index} className="flex justify-between text-sm text-amber-600">
            <span>{surcharge.name}</span>
            <span>+${surcharge.amount}</span>
          </div>
        ))}
      </div>
      
      <div className="border-t mt-4 pt-4">
        <div className="flex justify-between font-bold text-lg">
          <span>Total</span>
          <span className="text-blue-600">${total}</span>
        </div>
      </div>
    </div>
  )
}
```

**Form Validation & Error Handling:**
```typescript
// lib/validation.ts
import { z } from 'zod'

export const addressSchema = z.object({
  line1: z.string().min(1, 'Street address is required'),
  line2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2, 'State is required').max(2, 'State must be 2 characters'),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),
})

export const customerSchema = z.object({
  name: z.string().min(2, 'Full name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().regex(/^\(\d{3}\) \d{3}-\d{4}$/, 'Phone must be format: (555) 123-4567'),
})

export const bookingSchema = z.object({
  serviceType: z.enum(['mini_move', 'standard_delivery', 'specialty_items']),
  selectedDate: z.date().min(new Date(), 'Date must be in the future'),
  pickupAddress: addressSchema,
  dropoffAddress: addressSchema,
  customer: customerSchema,
  // ... other fields
})

// hooks/useFormValidation.ts
export function useFormValidation<T>(schema: z.ZodSchema<T>) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const validate = useCallback((data: unknown): data is T => {
    try {
      schema.parse(data)
      setErrors({})
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {}
        error.errors.forEach((err) => {
          const path = err.path.join('.')
          fieldErrors[path] = err.message
        })
        setErrors(fieldErrors)
      }
      return false
    }
  }, [schema])
  
  return { errors, validate, hasErrors: Object.keys(errors).length > 0 }
}
```

**Inter-Section Dependencies:**
- **← Marketing Site**: Entry point from CTAs
- **→ Backend API**: Real-time pricing, availability, booking creation
- **→ Design System**: Heavily uses shared components
- **→ Payment Integration**: Stripe Elements integration
- **State Persistence**: Zustand with localStorage backup

---

### **🎨 Design System - BLADE-Inspired Luxury Interface**

**Purpose:** Consistent, premium UI components that reflect ToteTaxi's luxury positioning  
**Why Separate:** Reusable across all sections, enforces brand consistency  
**File Structure:** `src/components/ui/` - Shared component library

**Responsibilities:**
- **Visual Identity** - Colors, typography, spacing that convey luxury
- **Component Library** - Reusable, accessible UI components
- **Responsive Design** - Mobile-first, touch-friendly interactions
- **Accessibility** - WCAG 2.1 AA compliance for inclusive design
- **Performance** - Optimized components with minimal bundle impact
- **Developer Experience** - Well-typed, documented components

**Design Tokens:**
```typescript
// lib/design-tokens.ts
export const colors = {
  // Primary brand colors (inspired by BLADE's sophistication)
  primary: {
    50: '#eff6ff',   // Very light blue
    100: '#dbeafe',  // Light blue
    500: '#3b82f6',  // Main blue
    600: '#2563eb',  // Hover blue
    900: '#1e3a8a',  // Dark blue
  },
  
  // Luxury grays (warm, not cold)
  gray: {
    50: '#fafaf9',   // Off-white background
    100: '#f5f5f4',  // Light gray
    300: '#d6d3d1',  // Border gray
    600: '#57534e',  // Text gray
    900: '#1c1917',  // Near black
  },
  
  // Accent colors
  amber: {
    50: '#fffbeb',   // Weekend surcharge background
    400: '#fbbf24',  // Warning/surcharge text
    500: '#f59e0b',  // Active warning
  },
  
  green: {
    50: '#f0fdf4',   // Success background
    500: '#22c55e',  // Success primary
    600: '#16a34a',  // Success hover
  },
  
  red: {
    50: '#fef2f2',   // Error background
    500: '#ef4444',  // Error primary
    600: '#dc2626',  // Error hover
  }
}

export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'monospace'],
  },
  
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    base: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
  }
}

export const spacing = {
  // Consistent spacing scale
  0: '0px',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
}

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
}
```

**Core UI Components:**
```typescript
// components/ui/Button.tsx
import { cn } from '@/lib/utils'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
  // Base styles
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        luxury: 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:from-blue-700 hover:to-blue-800 hover:shadow-xl transition-all duration-200'
      },
      size: {
        sm: 'h-9 rounded-md px-3',
        md: 'h-10 px-4 py-2',
        lg: 'h-11 rounded-md px-8',
        xl: 'h-12 px-10 text-base',
        icon: 'h-10 w-10'
      }
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md'
    }
  }
)

interface ButtonProps 
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

export function Button({ 
  className, 
  variant, 
  size, 
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props 
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={loading || disabled}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      {children}
    </Comp>
  )
}

// Usage examples:
// <Button variant="luxury" size="lg">Book Now</Button>
// <Button variant="outline" size="sm">Learn More</Button>
// <Button loading={isSubmitting} disabled={!isValid}>Continue</Button>

// components/ui/Input.tsx
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export function Input({
  className,
  type,
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  id,
  ...props
}: InputProps) {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`
  
  return (
    <div className="space-y-2">
      {label && (
        <label 
          htmlFor={inputId}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {label}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            {leftIcon}
          </div>
        )}
        
        <input
          type={type}
          id={inputId}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
            'placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            error && 'border-red-500 focus-visible:ring-red-500',
            className
          )}
          {...props}
        />
        
        {rightIcon && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            {rightIcon}
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <ExclamationTriangleIcon className="h-4 w-4" />
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  )
}

// components/ui/Card.tsx
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  selected?: boolean
}

export function Card({ 
  className, 
  hover = false,
  selected = false,
  children, 
  ...props 
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-card text-card-foreground shadow-sm',
        hover && 'transition-all duration-200 hover:shadow-md hover:-translate-y-1',
        selected && 'ring-2 ring-primary border-primary/50 bg-primary/5',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
  )
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-6 pt-0', className)} {...props} />
  )
}
```

**Specialized Booking Components:**
```typescript
// components/ui/ServiceCard.tsx
interface ServiceCardProps {
  service: {
    id: string
    name: string
    description: string
    startingPrice: number
    popular?: boolean
    icon: React.ComponentType<{ className?: string }>
    features: string[]
  }
  selected?: boolean
  onClick?: () => void
}

export function ServiceCard({ service, selected = false, onClick }: ServiceCardProps) {
  const Icon = service.icon
  
  return (
    <Card 
      hover 
      selected={selected}
      className={cn(
        'cursor-pointer relative',
        onClick && 'transition-all duration-200 hover:scale-105'
      )}
      onClick={onClick}
    >
      {service.popular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full">
            MOST POPULAR
          </span>
        </div>
      )}
      
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit">
          <Icon className="h-8 w-8 text-blue-600" />
        </div>
        <h3 className="text-xl font-bold">{service.name}</h3>
        <p className="text-gray-600">{service.description}</p>
        <div className="text-2xl font-bold text-blue-600">
          From ${service.startingPrice}
        </div>
      </CardHeader>
      
      <CardContent>
        <ul className="space-y-2">
          {service.features.map((feature, index) => (
            <li key={index} className="flex items-center text-sm text-gray-600">
              <CheckIcon className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
              {feature}
            </li>
          ))}
        </ul>
        
        <Button 
          variant={selected ? "luxury" : "outline"}
          className="w-full mt-4"
          size="lg"
        >
          {selected ? 'Selected' : `Choose ${service.name}`}
        </Button>
      </CardContent>
    </Card>
  )
}

// components/ui/PriceDisplay.tsx
interface PriceDisplayProps {
  amount: number
  currency?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showCurrency?: boolean
}

export function PriceDisplay({ 
  amount, 
  currency = 'USD',
  size = 'md',
  showCurrency = true 
}: PriceDisplayProps) {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-xl', 
    lg: 'text-2xl',
    xl: 'text-3xl'
  }
  
  return (
    <span className={cn('font-bold text-blue-600', sizeClasses[size])}>
      ${amount.toLocaleString()}
      {showCurrency && currency !== 'USD' && (
        <span className="text-sm text-gray-500 ml-1">{currency}</span>
      )}
    </span>
  )
}

// components/ui/BookingCalendar.tsx
interface BookingCalendarProps {
  selected: Date | null
  onSelect: (date: Date) => void
  getDayInfo: (date: Date) => { available: boolean; surcharge?: number }
  minDate?: Date
  maxDate?: Date
}

export function BookingCalendar({ 
  selected, 
  onSelect, 
  getDayInfo,
  minDate,
  maxDate 
}: BookingCalendarProps) {
  return (
    <div className="p-4 bg-white rounded-lg border">
      <Calendar
        mode="single"
        selected={selected}
        onSelect={onSelect}
        disabled={(date) => {
          if (minDate && date < minDate) return true
          if (maxDate && date > maxDate) return true
          return !getDayInfo(date).available
        }}
        modifiers={{
          surcharge: (date) => {
            const info = getDayInfo(date)
            return info.available && (info.surcharge || 0) > 0
          }
        }}
        modifiersStyles={{
          surcharge: { 
            backgroundColor: '#fbbf24', 
            color: '#92400e',
            fontWeight: 'bold'
          }
        }}
        className="rounded-md"
      />
      
      <div className="mt-4 space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-600 rounded"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-amber-400 rounded"></div>
          <span>Available with surcharge</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-300 rounded"></div>
          <span>Unavailable</span>
        </div>
      </div>
    </div>
  )
}
```

**Responsive Design Patterns:**
```typescript
// lib/responsive.ts
export const breakpoints = {
  sm: '640px',
  md: '768px', 
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
}

// hooks/useResponsive.ts
export function useResponsive() {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  })

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return {
    ...windowSize,
    isMobile: windowSize.width < 768,
    isTablet: windowSize.width >= 768 && windowSize.width < 1024,
    isDesktop: windowSize.width >= 1024,
    breakpoint: windowSize.width < 640 ? 'xs' :
                windowSize.width < 768 ? 'sm' :
                windowSize.width < 1024 ? 'md' :
                windowSize.width < 1280 ? 'lg' : 'xl'
  }
}

// components/ui/ResponsiveContainer.tsx
interface ResponsiveContainerProps {
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  padding?: boolean
}

export function ResponsiveContainer({ 
  children, 
  maxWidth = 'lg',
  padding = true 
}: ResponsiveContainerProps) {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    '2xl': 'max-w-7xl',
    full: 'max-w-full'
  }
  
  return (
    <div className={cn(
      'mx-auto w-full',
      maxWidthClasses[maxWidth],
      padding && 'px-4 sm:px-6 lg:px-8'
    )}>
      {children}
    </div>
  )
}
```

**Accessibility Features:**
```typescript
// components/ui/SkipToContent.tsx
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50"
    >
      Skip to main content
    </a>
  )
}

// components/ui/ScreenReaderOnly.tsx
interface ScreenReaderOnlyProps {
  children: React.ReactNode
}

export function ScreenReaderOnly({ children }: ScreenReaderOnlyProps) {
  return <span className="sr-only">{children}</span>
}

// hooks/useAccessibilityAnnouncements.ts
export function useAccessibilityAnnouncements() {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', priority)
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = message
    
    document.body.appendChild(announcement)
    
    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)
  }, [])
  
  return { announce }
}

// Usage in booking flow:
// announce('Step 2 of 5: Select your date')
// announce('Price updated to $1,825', 'assertive')
```

**Inter-Section Dependencies:**
- **→ ALL SECTIONS**: Provides UI components to entire application
- **←→ Tailwind Config**: Synced design tokens and utilities
- **Performance**: Tree-shakable exports, minimal bundle impact
- **Accessibility**: WCAG 2.1 AA compliance throughout

---

### **🔗 API Integration Layer - Backend Communication**

**Purpose:** Centralized, type-safe communication with Django backend  
**Why Separate:** Consistent error handling, request/response types, caching  
**File Structure:** `src/lib/api/` - Service classes and type definitions

**Responsibilities:**
- **HTTP Client** - Axios-based client with interceptors
- **Type Safety** - Full TypeScript coverage for all endpoints
- **Error Handling** - Consistent error formatting and user feedback
- **Request/Response Transformation** - Convert between frontend/backend formats
- **Caching Strategy** - Smart caching for pricing, availability data
- **Authentication** - Handle staff login tokens, session management
- **Retry Logic** - Automatic retries for transient failures

**API Client Setup:**
```typescript
// lib/api/client.ts
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import { toast } from 'sonner'

interface APIClientConfig {
  baseURL: string
  timeout?: number
  retries?: number
}

class APIClient {
  private client: AxiosInstance
  private retries: number

  constructor({ baseURL, timeout = 10000, retries = 3 }: APIClientConfig) {
    this.retries = retries
    
    this.client = axios.create({
      baseURL,
      timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request interceptor - add auth tokens
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('staff_token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor - handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        const { response, config } = error
        
        // Handle specific error status codes
        if (response?.status === 401) {
          localStorage.removeItem('staff_token')
          window.location.href = '/admin/login'
          return Promise.reject(error)
        }
        
        if (response?.status === 429) {
          toast.error('Too many requests. Please wait a moment.')
          return Promise.reject(error)
        }
        
        // Retry logic for transient errors
        if (this.shouldRetry(error) && config._retryCount < this.retries) {
          config._retryCount = (config._retryCount || 0) + 1
          const delay = Math.pow(2, config._retryCount) * 1000 // Exponential backoff
          
          return new Promise(resolve => {
            setTimeout(() => resolve(this.client(config)), delay)
          })
        }
        
        // Format error for user display
        const errorMessage = this.formatError(error)
        if (!config.skipErrorToast) {
          toast.error(errorMessage)
        }
        
        return Promise.reject(error)
      }
    )
  }

  private shouldRetry(error: any): boolean {
    if (!error.response) return true // Network error
    const status = error.response.status
    return status >= 500 || status === 429 // Server errors or rate limiting
  }

  private formatError(error: any): string {
    if (error.response?.data?.detail) {
      return error.response.data.detail
    }
    if (error.response?.data?.message) {
      return error.response.data.message
    }
    if (error.message) {
      return error.message
    }
    return 'An unexpected error occurred'
  }

  // Public methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get(url, config)
    return response.data
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post(url, data, config)
    return response.data
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch(url, data, config)
    return response.data
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete(url, config)
    return response.data
  }
}

export const apiClient = new APIClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8005/api/v1',
  timeout: 10000,
  retries: 3
})
```

**Type Definitions:**
```typescript
// lib/api/types.ts
export interface Address {
  line1: string
  line2?: string
  city: string
  state: string
  zipCode: string
}

export interface CustomerInfo {
  name: string
  email: string
  phone: string
}

export interface BookingRequest {
  bookingType: 'mini_move' | 'standard_delivery' | 'specialty_items'
  packageType?: 'petite' | 'standard' | 'full'
  selectedDate: string // ISO date string
  pickupAddress: Address
  dropoffAddress: Address
  customer: CustomerInfo
  itemCount?: number
  specialtyItems?: SpecialtyItemSelection[]
  coiRequired: boolean
  specialInstructions?: string
  timeWindow: string
}

export interface BookingResponse {
  id: string
  bookingNumber: string
  status: BookingStatus
  totalPrice: number
  stripeClientSecret?: string
  trackingUrl?: string
  createdAt: string
}

export type BookingStatus = 
  | 'pending'
  | 'paid' 
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'refunded'

export interface PricingRequest {
  bookingType: 'mini_move' | 'standard_delivery' | 'specialty_items'
  packageType?: string
  date: string
  itemCount?: number
  specialtyItems?: SpecialtyItemSelection[]
  coiRequired: boolean
  sameDay?: boolean
}

export interface PricingResponse {
  breakdown: PriceLineItem[]
  surcharges: SurchargeItem[]
  total: number
  validUntil: string // ISO timestamp
}

export interface PriceLineItem {
  name: string
  amount: number
  description?: string
}

export interface SurchargeItem {
  name: string
  amount: number
  reason: string
}

export interface AvailabilityResponse {
  dates: Record<string, DayAvailability> // "2025-08-30": {...}
}

export interface DayAvailability {
  available: boolean
  surcharge?: number
  reason?: string // "Weekend surcharge", "Holiday pricing"
  timeWindows?: string[]
}

export interface SpecialtyItemSelection {
  itemType: 'peloton' | 'surfboard' | 'crib' | 'wardrobe_box'
  quantity: number
}

export interface ServicePackage {
  id: string
  name: string
  description: string
  maxItems: number | null
  basePrice: number
  coiIncluded: boolean
  isActive: boolean
}
```

**Service Classes:**
```typescript
// lib/api/bookings.ts
export class BookingsAPI {
  async calculatePricing(request: PricingRequest): Promise<PricingResponse> {
    try {
      const response = await apiClient.post<PricingResponse>('/bookings/preview/', request)
      
      // Cache pricing for 5 minutes to avoid excessive requests
      const cacheKey = `pricing_${JSON.stringify(request)}`
      localStorage.setItem(cacheKey, JSON.stringify({
        data: response,
        timestamp: Date.now()
      }))
      
      return response
    } catch (error) {
      // Try to return cached pricing if available
      const cacheKey = `pricing_${JSON.stringify(request)}`
      const cached = localStorage.getItem(cacheKey)
      
      if (cached) {
        const { data, timestamp } = JSON.parse(cached)
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000)
        
        if (timestamp > fiveMinutesAgo) {
          toast.info('Using cached pricing due to network issue')
          return data
        }
      }
      
      throw error
    }
  }

  async createBooking(request: BookingRequest): Promise<BookingResponse> {
    return apiClient.post<BookingResponse>('/bookings/', request)
  }

  async getBooking(bookingId: string): Promise<BookingResponse> {
    return apiClient.get<BookingResponse>(`/bookings/${bookingId}/`)
  }

  async confirmBooking(bookingId: string): Promise<{ trackingUrl?: string }> {
    return apiClient.get<{ trackingUrl?: string }>(`/bookings/${bookingId}/confirm/`)
  }
}

// lib/api/services.ts
export class ServicesAPI {
  private availabilityCache = new Map<string, { data: AvailabilityResponse; expires: number }>()

  async getAvailability(serviceType: string): Promise<AvailabilityResponse> {
    const cacheKey = `availability_${serviceType}`
    const cached = this.availabilityCache.get(cacheKey)
    
    // Return cached data if still valid (10 minutes)
    if (cached && cached.expires > Date.now()) {
      return cached.data
    }

    try {
      const response = await apiClient.get<AvailabilityResponse>(`/services/availability/${serviceType}/`)
      
      // Cache for 10 minutes
      this.availabilityCache.set(cacheKey, {
        data: response,
        expires: Date.now() + (10 * 60 * 1000)
      })
      
      return response
    } catch (error) {
      // Return cached data even if expired, better than nothing
      if (cached) {
        toast.warning('Using cached availability data')
        return cached.data
      }
      throw error
    }
  }

  async getPackages(): Promise<ServicePackage[]> {
    return apiClient.get<ServicePackage[]>('/services/packages/')
  }

  async getSpecialtyItems(): Promise<SpecialtyItemSelection[]> {
    return apiClient.get<SpecialtyItemSelection[]>('/services/specialty-items/')
  }
}

// lib/api/payments.ts
export class PaymentsAPI {
  async createPaymentIntent(bookingId: string): Promise<{ clientSecret: string }> {
    return apiClient.post<{ clientSecret: string }>('/payments/create-intent/', {
      bookingId
    })
  }

  async confirmPayment(paymentIntentId: string): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>('/payments/confirm/', {
      paymentIntentId
    })
  }
}

// lib/api/index.ts - Centralized API interface
export const api = {
  bookings: new BookingsAPI(),
  services: new ServicesAPI(),
  payments: new PaymentsAPI(),
}
```

**React Hooks for API Integration:**
```typescript
// hooks/useAPI.ts
import { useState, useCallback } from 'react'
import { api } from '@/lib/api'

interface APIState<T> {
  data: T | null
  loading: boolean
  error: Error | null
}

export function useAPI<T>() {
  const [state, setState] = useState<APIState<T>>({
    data: null,
    loading: false,
    error: null
  })

  const execute = useCallback(async (apiCall: () => Promise<T>) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const data = await apiCall()
      setState({ data, loading: false, error: null })
      return data
    } catch (error) {
      setState({ data: null, loading: false, error: error as Error })
      throw error
    }
  }, [])

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null })
  }, [])

  return { ...state, execute, reset }
}

// hooks/usePricing.ts
export function usePricing() {
  const { data, loading, error, execute } = useAPI<PricingResponse>()
  
  const calculatePricing = useCallback((request: PricingRequest) => {
    return execute(() => api.bookings.calculatePricing(request))
  }, [execute])
  
  return {
    pricing: data,
    loading,
    error,
    calculatePricing
  }
}

// hooks/useBookingCreation.ts
export function useBookingCreation() {
  const { data: booking, loading, error, execute } = useAPI<BookingResponse>()
  const [paymentSecret, setPaymentSecret] = useState<string | null>(null)
  
  const createBooking = useCallback(async (request: BookingRequest) => {
    try {
      const bookingResponse = await execute(() => api.bookings.createBooking(request))
      
      if (bookingResponse?.stripeClientSecret) {
        setPaymentSecret(bookingResponse.stripeClientSecret)
      }
      
      return bookingResponse
    } catch (error) {
      console.error('Booking creation failed:', error)
      throw error
    }
  }, [execute])

  return {
    booking,
    paymentSecret,
    loading,
    error,
    createBooking
  }
}

// hooks/useAvailability.ts
export function useAvailability(serviceType: string) {
  const { data, loading, error, execute } = useAPI<AvailabilityResponse>()
  
  useEffect(() => {
    if (serviceType) {
      execute(() => api.services.getAvailability(serviceType))
    }
  }, [serviceType, execute])
  
  const getDayInfo = useCallback((date: Date): DayAvailability => {
    if (!data) return { available: false }
    
    const dateStr = format(date, 'yyyy-MM-dd')
    return data.dates[dateStr] || { available: false }
  }, [data])
  
  return {
    availability: data,
    loading,
    error,
    getDayInfo,
    refetch: () => execute(() => api.services.getAvailability(serviceType))
  }
}
```

**Error Boundary Integration:**
```typescript
// components/ErrorBoundary.tsx
interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ComponentType<{ error: Error }> },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to monitoring service
    console.error('Application error:', error, errorInfo)
    
    // Could send to Sentry, LogRocket, etc.
    if (process.env.NODE_ENV === 'production') {
      // Send to error monitoring service
    }
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return <FallbackComponent error={this.state.error!} />
    }

    return this.props.children
  }
}

function DefaultErrorFallback({ error }: { error: Error }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="flex items-center mb-4">
          <ExclamationTriangleIcon className="h-8 w-8 text-red-500 mr-3" />
          <h1 className="text-xl font-bold text-gray-900">Something went wrong</h1>
        </div>
        
        <p className="text-gray-600 mb-6">
          We're sorry, but something unexpected happened. Please try refreshing the page.
        </p>
        
        <div className="space-y-3">
          <Button 
            onClick={() => window.location.reload()}
            variant="primary"
            className="w-full"
          >
            Refresh Page
          </Button>
          
          <Button
            onClick={() => window.location.href = '/'}
            variant="outline"
            className="w-full"
          >
            Go to Home
          </Button>
        </div>
        
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4">
            <summary className="text-sm text-gray-500 cursor-pointer">
              Error Details
            </summary>
            <pre className="text-xs text-red-600 mt-2 whitespace-pre-wrap">
              {error.message}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}
```

**Inter-Section Dependencies:**
- **← Booking Wizard**: Primary consumer of booking/pricing APIs
- **← Admin Dashboard**: Uses CRM APIs for staff operations
- **→ Backend**: All HTTP communication goes through this layer
- **State Management**: Integrates with Zustand stores
- **Error Handling**: Provides consistent error UX across app

---

### **⚙️ Admin Dashboard - Staff Operations Interface**

**Purpose:** Comprehensive staff interface for managing all ToteTaxi operations  
**Why Separate:** Different UX patterns, authentication, and functionality from customer-facing site  
**File Structure:** `src/app/admin/` - Protected routes with role-based access

**Responsibilities:**
- **Booking Management** - View, search, filter, and modify all bookings
- **Customer Support** - Access customer profiles, booking history, communication
- **Financial Operations** - Process refunds, view revenue reports, payment tracking
- **Operational Tasks** - Upload COIs, create Onfleet tasks, manage van scheduling
- **Reporting & Analytics** - Generate reports, export data, track KPIs
- **User Management** - Staff accounts, permissions, audit logs

**Authentication & Layout:**
```typescript
// app/admin/layout.tsx
import { redirect } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { useAuth } from '@/hooks/useAuth'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className="lg:pl-64">
        <AdminHeader />
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

// components/admin/AdminSidebar.tsx
export function AdminSidebar() {
  const { user } = useAuth()
  const pathname = usePathname()
  
  const navigation = [
    { 
      name: 'Dashboard', 
      href: '/admin', 
      icon: HomeIcon,
      current: pathname === '/admin'
    },
    { 
      name: 'Bookings', 
      href: '/admin/bookings', 
      icon: TruckIcon,
      current: pathname.startsWith('/admin/bookings')
    },
    { 
      name: 'Customers', 
      href: '/admin/customers', 
      icon: UsersIcon,
      current: pathname.startsWith('/admin/customers')
    },
    { 
      name: 'Financials', 
      href: '/admin/financials', 
      icon: CurrencyDollarIcon,
      current: pathname.startsWith('/admin/financials'),
      adminOnly: true
    },
    { 
      name: 'Reports', 
      href: '/admin/reports', 
      icon: ChartBarIcon,
      current: pathname.startsWith('/admin/reports')
    },
    { 
      name: 'Settings', 
      href: '/admin/settings', 
      icon: CogIcon,
      current: pathname.startsWith('/admin/settings'),
      adminOnly: true
    }
  ]
  
  return (
    <div className="fixed inset-y-0 z-50 flex w-64 flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4 shadow-lg">
        <div className="flex h-16 shrink-0 items-center">
          <img src="/logo.svg" alt="ToteTaxi" className="h-8 w-auto" />
        </div>
        
        <nav className="flex flex-1 flex-col">
          <ul className="flex flex-1 flex-col gap-y-7">
            <li>
              <ul className="-mx-2 space-y-1">
                {navigation.map((item) => {
                  // Hide admin-only items from staff users
                  if (item.adminOnly && user?.role !== 'admin') {
                    return null
                  }
                  
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold',
                          item.current 
                            ? 'bg-blue-50 text-blue-600'
                            : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                        )}
                      >
                        <item.icon className="h-6 w-6 shrink-0" />
                        {item.name}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </li>
          </ul>
        </nav>
        
        <div className="border-t pt-4">
          <UserProfile user={user} />
        </div>
      </div>
    </div>
  )
}
```

**Dashboard Overview:**
```typescript
// app/admin/page.tsx
export default async function AdminDashboard() {
  // Server-side data fetching for initial load
  const dashboardData = await getDashboardData()
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Overview of ToteTaxi operations</p>
      </div>
      
      <KPICards data={dashboardData.kpis} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <UpcomingBookings bookings={dashboardData.upcomingBookings} />
        <PendingActions actions={dashboardData.pendingActions} />
      </div>
      <RecentActivity activities={dashboardData.recentActivity} />
    </div>
  )
}

// components/admin/KPICards.tsx
interface KPICardsProps {
  data: {
    totalBookings: { value: number; change: number }
    revenue: { value: number; change: number }
    pendingBookings: { value: number; change: number }
    avgBookingValue: { value: number; change: number }
  }
}

export function KPICards({ data }: KPICardsProps) {
  const kpis = [
    {
      name: 'Total Bookings',
      value: data.totalBookings.value,
      change: data.totalBookings.change,
      icon: TruckIcon,
      color: 'blue'
    },
    {
      name: 'Revenue',
      value: `$${data.revenue.value.toLocaleString()}`,
      change: data.revenue.change,
      icon: CurrencyDollarIcon,
      color: 'green'
    },
    {
      name: 'Pending Bookings',
      value: data.pendingBookings.value,
      change: data.pendingBookings.change,
      icon: ClockIcon,
      color: 'amber'
    },
    {
      name: 'Avg Booking Value',
      value: `$${data.avgBookingValue.value}`,
      change: data.avgBookingValue.change,
      icon: ChartBarIcon,
      color: 'purple'
    }
  ]
  
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.name} className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{kpi.name}</p>
              <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
            </div>
            <div className={cn(
              'p-3 rounded-full',
              `bg-${kpi.color}-100`
            )}>
              <kpi.icon className={cn('h-6 w-6', `text-${kpi.color}-600`)} />
            </div>
          </div>
          
          <div className="mt-4">
            <div className={cn(
              'flex items-center text-sm',
              kpi.change >= 0 ? 'text-green-600' : 'text-red-600'
            )}>
              {kpi.change >= 0 ? (
                <ArrowUpIcon className="h-4 w-4 mr-1" />
              ) : (
                <ArrowDownIcon className="h-4 w-4 mr-1" />
              )}
              {Math.abs(kpi.change)}% from last month
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
```

**Bookings Management:**
```typescript
// app/admin/bookings/page.tsx
export default function BookingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-gray-600">Manage all ToteTaxi bookings</p>
        </div>
        <Button variant="luxury">
          <PlusIcon className="h-4 w-4 mr-2" />
          New Booking
        </Button>
      </div>
      
      <BookingsFilters />
      <BookingsTable />
    </div>
  )
}

// components/admin/BookingsTable.tsx
export function BookingsTable() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<BookingFilters>({})
  const [pagination, setPagination] = useState({ page: 1, limit: 20 })
  
  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true)
      try {
        const response = await api.admin.getBookings({
          ...filters,
          ...pagination
        })
        setBookings(response.results)
      } catch (error) {
        console.error('Failed to fetch bookings:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchBookings()
  }, [filters, pagination])

  const columns = [
    { key: 'booking_number', header: 'Booking #' },
    { key: 'customer_name', header: 'Customer' },
    { key: 'service_type', header: 'Service' },
    { key: 'pickup_date', header: 'Date' },
    { key: 'status', header: 'Status' },
    { key: 'total_price', header: 'Total' },
    { key: 'actions', header: 'Actions' }
  ]

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <BookingsTableSkeleton />
            ) : (
              bookings.map((booking) => (
                <BookingRow 
                  key={booking.id} 
                  booking={booking}
                  onUpdate={() => {/* refresh data */}}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
      
      <TablePagination 
        current={pagination.page}
        total={Math.ceil(bookings.length / pagination.limit)}
        onChange={(page) => setPagination(prev => ({ ...prev, page }))}
      />
    </Card>
  )
}

// components/admin/BookingRow.tsx
interface BookingRowProps {
  booking: Booking
  onUpdate: () => void
}

export function BookingRow({ booking, onUpdate }: BookingRowProps) {
  const [showActions, setShowActions] = useState(false)
  
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <Link 
          href={`/admin/bookings/${booking.id}`}
          className="text-blue-600 hover:text-blue-900 font-medium"
        >
          {booking.booking_number}
        </Link>
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap">
        <div>
          <div className="font-medium text-gray-900">{booking.customer.name}</div>
          <div className="text-sm text-gray-500">{booking.customer.email}</div>
        </div>
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap">
        <ServiceTypeBadge type={booking.service_type} />
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {format(new Date(booking.pickup_date), 'MMM d, yyyy')}
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap">
        <BookingStatusBadge status={booking.status} />
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        ${booking.total_price.toLocaleString()}
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowActions(!showActions)}
          >
            <EllipsisHorizontalIcon className="h-4 w-4" />
          </Button>
          
          {showActions && (
            <BookingActionsMenu 
              booking={booking}
              onAction={onUpdate}
              onClose={() => setShowActions(false)}
            />
          )}
        </div>
      </td>
    </tr>
  )
}
```

**Staff Actions & Modals:**
```typescript
// components/admin/BookingActionsMenu.tsx
interface BookingActionsMenuProps {
  booking: Booking
  onAction: () => void
  onClose: () => void
}

export function BookingActionsMenu({ booking, onAction, onClose }: BookingActionsMenuProps) {
  const { user } = useAuth()
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [showCOIUpload, setShowCOIUpload] = useState(false)
  
  const actions = [
    {
      name: 'View Details',
      icon: EyeIcon,
      href: `/admin/bookings/${booking.id}`,
      show: true
    },
    {
      name: 'Create Onfleet Task',
      icon: TruckIcon,
      onClick: () => handleCreateOnfleetTask(),
      show: booking.status === 'paid' && !booking.onfleet_task_id
    },
    {
      name: 'Upload COI',
      icon: DocumentIcon,
      onClick: () => setShowCOIUpload(true),
      show: booking.coi_required
    },
    {
      name: 'Send Notification',
      icon: EnvelopeIcon,
      onClick: () => handleSendNotification(),
      show: true
    },
    {
      name: 'Process Refund',
      icon: CurrencyDollarIcon,
      onClick: () => setShowRefundModal(true),
      show: user?.role === 'admin' && booking.status === 'paid',
      destructive: true
    }
  ]

  const handleCreateOnfleetTask = async () => {
    try {
      await api.admin.createOnfleetTask(booking.id)
      toast.success('Onfleet task created successfully')
      onAction()
    } catch (error) {
      toast.error('Failed to create Onfleet task')
    }
    onClose()
  }

  return (
    <>
      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
        <div className="py-1">
          {actions.filter(action => action.show).map((action) => (
            <div key={action.name}>
              {action.href ? (
                <Link
                  href={action.href}
                  className={cn(
                    'flex items-center px-4 py-2 text-sm hover:bg-gray-100',
                    action.destructive ? 'text-red-600' : 'text-gray-700'
                  )}
                >
                  <action.icon className="h-4 w-4 mr-3" />
                  {action.name}
                </Link>
              ) : (
                <button
                  onClick={action.onClick}
                  className={cn(
                    'flex items-center w-full px-4 py-2 text-sm text-left hover:bg-gray-100',
                    action.destructive ? 'text-red-600' : 'text-gray-700'
                  )}
                >
                  <action.icon className="h-4 w-4 mr-3" />
                  {action.name}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Modals */}
      <RefundModal
        booking={booking}
        open={showRefundModal}
        onClose={() => setShowRefundModal(false)}
        onRefund={onAction}
      />
      
      <COIUploadModal
        booking={booking}
        open={showCOIUpload}
        onClose={() => setShowCOIUpload(false)}
        onUpload={onAction}
      />
    </>
  )
}

// components/admin/RefundModal.tsx
interface RefundModalProps {
  booking: Booking
  open: boolean
  onClose: () => void
  onRefund: () => void
}

export function RefundModal({ booking, open, onClose, onRefund }: RefundModalProps) {
  const [amount, setAmount] = useState(booking.total_price)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  
  const handleRefund = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      await api.admin.processRefund(booking.id, {
        amount,
        reason
      })
      
      toast.success('Refund processed successfully')
      onRefund()
      onClose()
    } catch (error) {
      toast.error('Failed to process refund')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Process Refund</DialogTitle>
          <DialogDescription>
            Process a refund for booking {booking.booking_number}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleRefund} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Refund Amount
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                max={booking.total_price}
                className="pl-7 block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Maximum refund: ${booking.total_price}
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Reason for Refund
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              required
            >
              <option value="">Select reason...</option>
              <option value="requested_by_customer">Customer Request</option>
              <option value="service_issue">Service Issue</option>
              <option value="fraudulent">Fraudulent Transaction</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary"
              loading={loading}
              disabled={!reason || amount <= 0}
            >
              Process Refund
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

**Real-time Updates & WebSocket Integration (Future):**
```typescript
// hooks/useRealtimeUpdates.ts
export function useRealtimeUpdates() {
  const [socket, setSocket] = useState<WebSocket | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected')
  
  useEffect(() => {
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}/admin/updates/`
    const ws = new WebSocket(wsUrl)
    
    ws.onopen = () => {
      setConnectionStatus('connected')
      console.log('WebSocket connected')
    }
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      
      // Handle different types of real-time updates
      switch (data.type) {
        case 'booking_status_change':
          toast.info(`Booking ${data.booking_number} status updated to ${data.new_status}`)
          // Trigger data refresh
          break
          
        case 'payment_received':
          toast.success(`Payment received for booking ${data.booking_number}`)
          break
          
        case 'onfleet_update':
          toast.info(`Delivery update: ${data.message}`)
          break
      }
    }
    
    ws.onclose = () => {
      setConnectionStatus('disconnected')
      console.log('WebSocket disconnected')
    }
    
    setSocket(ws)
    
    return () => {
      ws.close()
    }
  }, [])
  
  return { socket, connectionStatus }
}
```

**Inter-Section Dependencies:**
- **← API Integration**: Heavy consumer of admin/CRM APIs
- **← Design System**: Uses admin-specific components
- **→ Backend**: Staff actions trigger backend operations
- **Authentication**: Role-based access control throughout
- **Real-time**: WebSocket integration for live updates

---

## **📱 Performance & SEO Optimization**

**Purpose:** Ensure fast loading, excellent Core Web Vitals, and search engine visibility  
**Why Critical:** Luxury customers expect perfection; SEO drives organic bookings  

**Performance Strategy:**
```typescript
// next.config.ts
const nextConfig = {
  // Enable experimental optimizations
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@heroicons/react', 'lucide-react'],
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // Bundle analysis and optimization
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Bundle analyzer in production builds
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          booking: {
            test: /[\\/]components[\\/]booking[\\/]/,
            name: 'booking-wizard',
            chunks: 'all',
          },
        },
      }
    }
    return config
  }
}
```

**SEO & Analytics:**
```typescript
// lib/analytics.ts
interface AnalyticsEvent {
  action: string
  category: string
  label?: string
  value?: number
}

export class Analytics {
  static track(event: AnalyticsEvent) {
    // Google Analytics 4
    if (typeof gtag !== 'undefined') {
      gtag('event', event.action, {
        event_category: event.category,
        event_label: event.label,
        value: event.value,
      })
    }
    
    // Additional analytics platforms
    if (typeof window !== 'undefined') {
      // Facebook Pixel
      if (window.fbq) {
        window.fbq('track', event.action, {
          content_category: event.category,
          content_name: event.label,
          value: event.value,
        })
      }
    }
  }
  
  static trackBookingStep(step: string, bookingData: any) {
    this.track({
      action: 'booking_step_completed',
      category: 'booking_flow',
      label: step,
      value: bookingData.estimatedValue || 0
    })
  }
  
  static trackConversion(bookingId: string, value: number) {
    this.track({
      action: 'purchase',
      category: 'ecommerce',
      label: bookingId,
      value
    })
    
    // Enhanced ecommerce tracking
    if (typeof gtag !== 'undefined') {
      gtag('event', 'purchase', {
        transaction_id: bookingId,
        value: value,
        currency: 'USD',
        items: [{
          item_id: bookingId,
          item_name: 'ToteTaxi Booking',
          category: 'luxury_delivery',
          quantity: 1,
          price: value
        }]
      })
    }
  }
}
```

---

## **🚀 Development Phases & Roadmap**

### **Phase 1: Foundation & Marketing Site (Week 1)**
**Backend Dependencies:** Basic Django setup, authentication  
**Frontend Priority:**
1. **Project Setup** - Next.js 14, TypeScript, Tailwind configuration
2. **Design System** - Core UI components, BLADE-inspired styling
3. **Marketing Pages** - Home, Services, How It Works (SSR)
4. **SEO Foundation** - Meta tags, structured data, sitemap
5. **Performance Baseline** - Core Web Vitals optimization

**Deliverables:**
- Responsive marketing site with luxury positioning
- Complete design system and component library
- SEO-optimized pages with structured data
- Performance score >90 on Lighthouse

### **Phase 2: Booking Wizard Core (Week 2)**  
**Backend Dependencies:** Bookings API, pricing calculation, availability  
**Frontend Priority:**
1. **State Management** - Zustand store for booking flow
2. **Service Selection** - Multi-service wizard with validation
3. **Calendar Integration** - Availability display with surcharge indicators
4. **Form Management** - Address input, customer info, validation
5. **API Integration** - Real-time pricing, availability checking

**Deliverables:**
- Complete booking wizard (excluding payment)
- Real-time pricing updates
- Form validation and error handling
- Mobile-optimized booking flow

### **Phase 3: Payment & Completion (Week 3)**
**Backend Dependencies:** Stripe integration, payment webhooks, confirmation  
**Frontend Priority:**
1. **Stripe Integration** - Payment Elements, error handling
2. **Review Step** - Final pricing breakdown and terms
3. **Payment Processing** - Loading states, success/failure handling  
4. **Confirmation Page** - Booking details, tracking info
5. **Email Integration** - Confirmation display

**Deliverables:**
- Complete end-to-end booking flow
- Stripe payment processing
- Booking confirmation and tracking
- Error recovery and retry logic

### **Phase 4: Admin Dashboard (Week 4)**
**Backend Dependencies:** CRM APIs, staff authentication, admin actions  
**Frontend Priority:**
1. **Authentication** - Staff login, role-based access
2. **Dashboard Overview** - KPIs, upcoming bookings, alerts
3. **Booking Management** - Table, filters, actions, detail views
4. **Staff Actions** - Refunds, COI upload, Onfleet tasks
5. **Responsive Admin** - Mobile-friendly admin interface

**Deliverables:**
- Complete staff dashboard
- Booking management interface
- Role-based permissions
- Mobile admin capabilities

### **Phase 5: Polish & Launch (Week 5)**
**Backend Dependencies:** All integrations complete  
**Frontend Priority:**
1. **Performance Optimization** - Bundle splitting, lazy loading
2. **Accessibility Audit** - WCAG 2.1 AA compliance
3. **Browser Testing** - Cross-browser compatibility
4. **Analytics Integration** - GA4, conversion tracking
5. **Production Deployment** - Netlify configuration, domains

**Deliverables:**
- Production-ready application
- Analytics and monitoring setup
- Performance optimization complete
- Launch-ready with full documentation

---

## **📋 File Structure & Organization**

```
src/
├── app/                          # Next.js App Router
│   ├── (marketing)/              # Marketing site routes (SSR)
│   │   ├── page.tsx              # Home page
│   │   ├── services/page.tsx     # Services overview
│   │   ├── how-it-works/page.tsx # Process explanation
│   │   └── layout.tsx            # Marketing layout
│   ├── book/                     # Booking wizard (CSR)
│   │   ├── page.tsx              # Booking wizard entry
│   │   └── layout.tsx            # Booking layout
│   ├── admin/                    # Staff dashboard
│   │   ├── page.tsx              # Admin dashboard
│   │   ├── bookings/             # Booking management
│   │   ├── customers/            # Customer management  
│   │   ├── reports/              # Reports & analytics
│   │   └── layout.tsx            # Admin layout
│   ├── api/                      # API routes (if needed)
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles
├── components/                   # Reusable components
│   ├── ui/                       # Design system components
│   │   ├── Button.tsx            # Button variants
│   │   ├── Input.tsx             # Form inputs
│   │   ├── Card.tsx              # Card layouts
│   │   └── index.ts              # Component exports
│   ├── marketing/                # Marketing-specific components
│   │   ├── HeroSection.tsx       # Homepage hero
│   │   ├── ServiceCard.tsx       # Service displays
│   │   └── TestimonialSlider.tsx # Customer testimonials
│   ├── booking/                  # Booking wizard components
│   │   ├── ServiceSelection.tsx  # Service choice step
│   │   ├── CalendarStep.tsx      # Date selection
│   │   ├── DetailsStep.tsx       # Address & info collection
│   │   ├── ReviewStep.tsx        # Final review
│   │   └── PaymentStep.tsx       # Stripe integration
│   └── admin/                    # Admin dashboard components
│       ├── BookingsTable.tsx     # Bookings management
│       ├── Dashboard.tsx         # KPI overview
│       └── StaffActions.tsx      # Admin operations
├── lib/                          # Utility libraries
│   ├── api/                      # Backend communication
│   │   ├── client.ts             # HTTP client setup
│   │   ├── bookings.ts           # Booking APIs
│   │   ├── services.ts           # Service APIs
│   │   └── types.ts              # TypeScript types
│   ├── utils.ts                  # General utilities
│   ├── validation.ts             # Zod schemas
│   └── design-tokens.ts          # Design system tokens
├── hooks/                        # Custom React hooks
│   ├── useBooking.ts             # Booking flow state
│   ├── useAPI.ts                 # API call management
│   ├── usePricing.ts             # Real-time pricing
│   └── useAuth.ts                # Authentication
├── stores/                       # State management
│   ├── bookingStore.ts           # Zustand booking store
│   └── authStore.ts              # Authentication state
├── types/                        # TypeScript definitions
│   ├── booking.ts                # Booking-related types
│   ├── api.ts                    # API response types
│   └── global.ts                 # Global type definitions
└── styles/                       # Styling files
    └── globals.css               # Global CSS + Tailwind
```

This comprehensive frontend documentation provides a complete blueprint for building the ToteTaxi luxury delivery platform. Each section is designed to be modular, scalable, and maintainable as the codebase grows to 20-30k lines.

The architecture prioritizes user experience, performance, and maintainability while supporting the complex business logic of luxury delivery services. Every component and pattern is designed to handle the sophisticated workflows required for ToteTaxi's premium positioning.