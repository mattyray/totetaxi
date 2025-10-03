Perfect! Let me search for the frontend_snapshot.txt file in the project knowledge.Let me get the complete frontend_snapshot.txt content to analyze it properly.Let me search for more comprehensive sections to understand the complete codebase structure:Perfect! I have all the information I need from the frontend_snapshot.txt. Now I'll generate the living documentation following the Strategic Extraction Protocol, targeting approximately **1600 lines**. This will be a comprehensive yet concise strategic navigation system.

Let me create this now:

---

# TOTETAXI FRONTEND - LIVING DOCUMENTATION v2.0
**Strategic Navigation System for AI Executive Function**

**Purpose**: This document serves as a magnifying glass into frontend_snapshot.txt, providing comprehensive architectural understanding and file mapping to enable intelligent file requesting without reproducing implementations.

**Generated**: 2025-10-03  
**Frontend Stack**: Next.js 15.5.0 (App Router) + React 19 + TypeScript + Tailwind CSS  
**Size**: ~1600 lines (10-15% compression of frontend_snapshot.txt)  
**Backend Integration**: Cross-references backend README.md for API specifications

---

## SECTION 1: SYSTEM ARCHITECTURE MENTAL MODEL

### 1.1 Technology Stack Overview

**Core Framework & Build**
- **Framework**: Next.js 15.5.0 with App Router (file-based routing)
- **React**: Version 19.1.0 (latest)
- **TypeScript**: Version 5.x (strict mode enabled)
- **Build Tool**: Next.js native compiler with Turbopack support

**State Management & Data Fetching**
- **Client State**: Zustand 4.5.7 (lightweight store with persistence)
- **Server State**: TanStack Query 5.87.1 (formerly React Query)
- **Data Fetching**: Axios 1.11.0 with custom interceptors
- **Form State**: React Hook Form 7.62.0 with Zod 3.25.76 validation

**Styling & UI Framework**
- **CSS Framework**: Tailwind CSS 3.4.17 (utility-first)
- **UI Components**: Headless UI 2.2.7 (accessible primitives)
- **Icons**: Heroicons 2.2.0 (React components)
- **Design System**: Custom luxury brand (navy/gold/cream color palette)
- **Utilities**: clsx + tailwind-merge for className composition

**Payment Integration**
- **Stripe React**: @stripe/react-stripe-js 4.0.2
- **Stripe JS**: @stripe/stripe-js 7.9.0

**Development Tools**
- **Linting**: ESLint 9.x (Next.js config)
- **TypeScript Config**: Strict mode, path aliases (@/* → ./src/*)
- **PostCSS**: Autoprefixer for browser compatibility

### 1.2 Project Architecture Philosophy

**App Router Organization**
- Next.js App Router provides file-based routing with server/client component separation
- Routes defined by folder structure under src/app/
- Layouts wrap child routes for shared UI elements
- Each route can have page.tsx (route component) and layout.tsx (wrapper)

**Component Architecture Strategy**
```
src/components/
├── auth/          # Authentication forms and user menu
├── booking/       # Multi-step booking wizard components
├── dashboard/     # Customer dashboard components
├── layout/        # Shared layout components (header, footer, main layout)
├── marketing/     # Public marketing sections
├── providers/     # React context providers
├── staff/         # Staff-only management components
└── ui/            # Reusable primitive components (buttons, cards, inputs)
```

**State Management Philosophy**
- Zustand stores for client-side UI state and authentication
- TanStack Query for server state caching and synchronization
- React Hook Form for ephemeral form state
- localStorage persistence for auth tokens and UI preferences

**Backend Integration Approach**
- RESTful API client using Axios with baseURL configuration
- Cookie-based session management with mobile fallback to headers
- Automatic CSRF token handling for mutations
- TanStack Query for automatic retries and caching

### 1.3 Routing Architecture

**App Router Structure** (Next.js file-based routing)
```
src/app/
├── page.tsx                    # Landing page (/)
├── layout.tsx                  # Root layout with fonts and providers
├── about/page.tsx              # About page (/about)
├── book/page.tsx               # Booking page (/book)
├── contact/page.tsx            # Contact page (/contact)
├── faq/page.tsx                # FAQ page (/faq)
├── login/page.tsx              # Customer login (/login)
├── register/page.tsx           # Customer registration (/register)
├── services/page.tsx           # Services overview (/services)
├── dashboard/
│   ├── page.tsx                # Customer dashboard (/dashboard)
│   └── bookings/page.tsx       # Booking history (/dashboard/bookings)
└── staff/
    ├── login/page.tsx          # Staff login (/staff/login)
    ├── dashboard/page.tsx      # Staff dashboard (/staff/dashboard)
    ├── calendar/page.tsx       # Booking calendar (/staff/calendar)
    ├── bookings/
    │   ├── page.tsx            # Booking management (/staff/bookings)
    │   └── [id]/page.tsx       # Booking detail (/staff/bookings/:id)
    ├── customers/
    │   ├── page.tsx            # Customer management (/staff/customers)
    │   └── [id]/page.tsx       # Customer detail (/staff/customers/:id)
    ├── logistics/page.tsx      # Logistics management (/staff/logistics)
    └── reports/page.tsx        # Reports & analytics (/staff/reports)
```

**Route Protection**
- Customer routes (/dashboard/*): Protected by useAuthStore, redirect to /login
- Staff routes (/staff/*): Protected by useStaffAuthStore, redirect to /staff/login
- Public routes: Accessible without authentication

### 1.4 Design System & Brand Identity

**Color Palette** (Luxury brand aesthetic)
```javascript
colors: {
  navy: {
    50: '#f0f4f8',   // Lightest
    600: '#486581',  // Medium
    900: '#1a365d',  // Darkest
  },
  gold: {
    50: '#fffdf7',   // Lightest
    500: '#d69e2e',  // Primary gold
    900: '#5f370e',  // Darkest
  },
  cream: {
    50: '#fefcf3',   // Background
    100: '#fef7e0',  // Subtle highlights
  }
}
```

**Typography System**
- **Sans-serif**: Inter (variable font) for body text
- **Serif**: Playfair Display (variable font) for headings
- Font loading via next/font/google with optimal performance

**Spacing & Layout**
- Container-based layouts with responsive breakpoints
- Tailwind's default spacing scale (4px base unit)
- Max-width content containers for readability

---

## SECTION 2: BACKEND INTEGRATION MAP

**Cross-reference**: See backend README.md for complete API specifications. This section maps which frontend files consume which backend endpoints.

### 2.1 Authentication APIs

**POST /api/auth/login/**
- **Frontend Hook**: N/A (direct apiClient call)
- **Components**: `LoginForm` (components/auth/login-form.tsx)
- **Store**: Updates `authStore` (stores/auth-store.ts)
- **Flow**: LoginForm → apiClient.post → authStore.setUser() → redirect to /dashboard
- **Files to Request**: components/auth/login-form.tsx, stores/auth-store.ts

**POST /api/auth/register/**
- **Frontend Hook**: N/A (direct apiClient call)
- **Components**: `RegisterForm` (components/auth/register-form.tsx)
- **Store**: Updates `authStore` (stores/auth-store.ts)
- **Flow**: RegisterForm → apiClient.post → authStore.setUser() → redirect to /dashboard
- **Files to Request**: components/auth/register-form.tsx, stores/auth-store.ts

**POST /api/auth/logout/**
- **Frontend Hook**: authStore.logout()
- **Components**: `UserMenu` (components/auth/user-menu.tsx)
- **Store**: Clears `authStore` (stores/auth-store.ts)
- **Files to Request**: stores/auth-store.ts, components/auth/user-menu.tsx

**GET /api/auth/session/**
- **Frontend Hook**: authStore.validateSession()
- **Components**: `SessionValidator` in layout.tsx
- **Purpose**: Validate stored sessions on app startup
- **Files to Request**: stores/auth-store.ts, app/layout.tsx

### 2.2 Staff Authentication APIs

**POST /api/staff/login/**
- **Frontend Component**: `StaffLoginForm` (components/staff/staff-login-form.tsx)
- **Store**: Updates `staffAuthStore` (stores/staff-auth-store.ts)
- **Flow**: StaffLoginForm → apiClient.post → staffAuthStore.setStaff() → redirect to /staff/dashboard
- **Files to Request**: components/staff/staff-login-form.tsx, stores/staff-auth-store.ts

**POST /api/staff/logout/**
- **Frontend Hook**: staffAuthStore.logout()
- **Components**: `StaffLayout` (components/staff/staff-layout.tsx)
- **Files to Request**: stores/staff-auth-store.ts, components/staff/staff-layout.tsx

**GET /api/staff/session/**
- **Frontend Hook**: staffAuthStore.validateSession()
- **Components**: `SessionValidator` in layout.tsx
- **Files to Request**: stores/staff-auth-store.ts, app/layout.tsx

### 2.3 Booking APIs

**GET /api/services/**
- **Frontend Hook**: TanStack Query in `ServiceSelectionStep`
- **Components**: `ServiceSelectionStep` (components/booking/service-selection-step.tsx)
- **Purpose**: Fetch available services for booking wizard
- **Caching**: TanStack Query with ['services'] key
- **Files to Request**: components/booking/service-selection-step.tsx

**POST /api/bookings/calculate-price/**
- **Frontend Hook**: Direct apiClient call in `ReviewPaymentStep`
- **Components**: `ReviewPaymentStep` (components/booking/review-payment-step.tsx)
- **Purpose**: Calculate booking price before payment
- **Files to Request**: components/booking/review-payment-step.tsx

**POST /api/bookings/create/**
- **Frontend Hook**: Direct apiClient call in `ReviewPaymentStep`
- **Components**: `ReviewPaymentStep` (components/booking/review-payment-step.tsx)
- **Store**: Clears `bookingStore` on success
- **Flow**: ReviewPaymentStep → apiClient.post → redirect to /dashboard
- **Files to Request**: components/booking/review-payment-step.tsx, stores/booking-store.ts

**GET /api/bookings/**
- **Frontend Hook**: TanStack Query in `BookingHistory`
- **Components**: `BookingHistory` (components/dashboard/booking-history.tsx)
- **Query Key**: ['bookings']
- **Files to Request**: components/dashboard/booking-history.tsx

**GET /api/bookings/{id}/**
- **Frontend Hook**: TanStack Query in `DashboardOverview`
- **Components**: `DashboardOverview` (components/dashboard/dashboard-overview.tsx)
- **Query Key**: ['bookings', id]
- **Files to Request**: components/dashboard/dashboard-overview.tsx

### 2.4 Staff Management APIs

**GET /api/staff/dashboard/**
- **Frontend Component**: `StaffDashboardOverview` (components/staff/staff-dashboard-overview.tsx)
- **Query Key**: ['staff', 'dashboard']
- **Returns**: Booking stats, payment stats, recent bookings
- **Files to Request**: components/staff/staff-dashboard-overview.tsx

**GET /api/staff/bookings/**
- **Frontend Component**: `BookingManagement` (components/staff/booking-management.tsx)
- **Query Key**: ['staff', 'bookings', filters]
- **Purpose**: List all bookings with filtering
- **Files to Request**: components/staff/booking-management.tsx

**GET /api/staff/bookings/{id}/**
- **Frontend Page**: app/staff/bookings/[id]/page.tsx
- **Query Key**: ['staff', 'booking', bookingId]
- **Purpose**: Booking detail with edit capability
- **Files to Request**: app/staff/bookings/[id]/page.tsx

**PUT /api/staff/bookings/{id}/**
- **Frontend Page**: app/staff/bookings/[id]/page.tsx
- **Mutation**: TanStack Query mutation
- **Purpose**: Update booking details
- **Files to Request**: app/staff/bookings/[id]/page.tsx

**GET /api/staff/customers/**
- **Frontend Component**: `CustomerManagement` (components/staff/customer-management.tsx)
- **Query Key**: ['staff', 'customers']
- **Files to Request**: components/staff/customer-management.tsx

**GET /api/staff/customers/{id}/**
- **Frontend Page**: app/staff/customers/[id]/page.tsx
- **Query Key**: ['staff', 'customer', customerId]
- **Files to Request**: app/staff/customers/[id]/page.tsx

**PUT /api/staff/customers/{id}/**
- **Frontend Page**: app/staff/customers/[id]/page.tsx
- **Mutation**: Update customer notes
- **Files to Request**: app/staff/customers/[id]/page.tsx

### 2.5 Payment APIs

**POST /api/payments/create-payment-intent/**
- **Frontend Component**: `ReviewPaymentStep` (components/booking/review-payment-step.tsx)
- **Purpose**: Initialize Stripe payment
- **Integration**: Stripe Elements
- **Files to Request**: components/booking/review-payment-step.tsx

---

## SECTION 3: COMPLETE COMPONENT INTERFACE DOCUMENTATION

### 3.1 Authentication Components

**Component: LoginForm**  
File: `components/auth/login-form.tsx`

```typescript
interface LoginFormProps {
  // No props - standalone form
}
```

**Purpose**: Customer login form with email/password authentication  
**Parent Components**: app/login/page.tsx  
**Child Components**: Input, Button (from ui/)  
**API Integration**: POST /api/auth/login/ via apiClient  
**State Management**: Updates authStore on success  
**Form Validation**: Client-side validation for email format and required fields  
**Navigation**: Redirects to /dashboard on successful login

---

**Component: RegisterForm**  
File: `components/auth/register-form.tsx`

```typescript
interface RegisterFormProps {
  // No props - standalone form
}
```

**Purpose**: Customer registration form with account creation  
**Parent Components**: app/register/page.tsx  
**Child Components**: Input, Button (from ui/)  
**API Integration**: POST /api/auth/register/ via apiClient  
**State Management**: Updates authStore on success  
**Form Fields**: email, password, first_name, last_name, phone  
**Navigation**: Redirects to /dashboard on successful registration

---

**Component: UserMenu**  
File: `components/auth/user-menu.tsx`

```typescript
interface UserMenuProps {
  // No props - uses authStore directly
}
```

**Purpose**: Dropdown menu displaying user profile and logout option  
**Parent Components**: MainLayout (components/layout/main-layout.tsx)  
**Child Components**: None (uses Headless UI Menu)  
**Hooks Used**: useAuthStore, useRouter, useClickAway  
**State**: authStore.user, authStore.customerProfile  
**Features**: 
- Displays user name and email
- Shows VIP status and total spent
- Logout functionality
- Profile link (future)

---

### 3.2 Booking Wizard Components

**Component: BookingWizard**  
File: `components/booking/booking-wizard.tsx`

```typescript
interface BookingWizardProps {
  onComplete?: () => void;  // Called after successful booking
  onCancel?: () => void;    // Called when wizard is closed
}
```

**Purpose**: Multi-step booking wizard orchestrating the booking flow  
**Parent Components**: app/page.tsx (homepage), app/book/page.tsx  
**Child Components**: AuthChoiceStep, ServiceSelectionStep, DateTimeStep, AddressStep, CustomerInfoStep, ReviewPaymentStep  
**Steps**: 6-step wizard (0-5)  
**State Management**: useBookingWizard (stores/booking-store.ts)  
**Navigation**: Step-by-step progression with validation  
**Flow**: AuthChoice → ServiceSelection → DateTime → Address → CustomerInfo → ReviewPayment

---

**Component: AuthChoiceStep**  
File: `components/booking/auth-choice-step.tsx`

```typescript
interface AuthChoiceStepProps {
  // No props - step 0 of BookingWizard
}
```

**Purpose**: First step prompting user to login, register, or continue as guest  
**Parent Components**: BookingWizard  
**Child Components**: Button (from ui/), LoginForm, RegisterForm  
**Modes**: null (choice), 'login', 'register', 'guest'  
**Store Updates**: Sets bookingStore.isGuest flag  
**Navigation**: Advances to step 1 after choice

---

**Component: ServiceSelectionStep**  
File: `components/booking/service-selection-step.tsx`

```typescript
interface ServiceSelectionStepProps {
  // No props - step 1 of BookingWizard
}
```

**Purpose**: Service type selection (standard delivery, mini move, blade transfer)  
**Parent Components**: BookingWizard  
**API Integration**: GET /api/services/ via TanStack Query  
**Store Updates**: Sets bookingStore.service_type  
**Validation**: Requires service selection before advancing  
**Navigation**: Advances to step 2 on selection

---

**Component: DateTimeStep**  
File: `components/booking/date-time-step.tsx`

```typescript
interface DateTimeStepProps {
  // No props - step 2 of BookingWizard
}
```

**Purpose**: Pickup date and time window selection  
**Parent Components**: BookingWizard  
**Child Components**: Input (date), Select (time) from ui/  
**Store Updates**: Sets bookingStore.pickup_date, pickup_time  
**Time Windows**: morning, morning_specific, no_time_preference  
**Validation**: Date must be future date, time required  
**Conditional Logic**: Blade transfer shows additional flight fields

---

**Component: AddressStep**  
File: `components/booking/address-step.tsx`

```typescript
interface AddressStepProps {
  // No props - step 3 of BookingWizard
}
```

**Purpose**: Pickup and delivery address entry  
**Parent Components**: BookingWizard  
**Child Components**: Input, Select (from ui/)  
**Store Updates**: Sets bookingStore.pickup_address, delivery_address  
**Address Fields**: address_line_1, address_line_2, city, state, zip_code  
**Validation**: Required fields per address  
**Saved Addresses**: Shows saved addresses if authenticated

---

**Component: CustomerInfoStep**  
File: `components/booking/customer-info-step.tsx`

```typescript
interface CustomerInfoStepProps {
  // No props - step 4 of BookingWizard
}
```

**Purpose**: Guest customer information collection  
**Parent Components**: BookingWizard  
**Child Components**: Input (from ui/)  
**Conditional**: Only shown if isGuest === true  
**Store Updates**: Sets bookingStore.customer_name, customer_email, customer_phone  
**Validation**: Email format, phone format, required fields  
**Skip**: Authenticated users skip this step

---

**Component: ReviewPaymentStep**  
File: `components/booking/review-payment-step.tsx`

```typescript
interface ReviewPaymentStepProps {
  // No props - step 5 of BookingWizard
}
```

**Purpose**: Booking review and Stripe payment processing  
**Parent Components**: BookingWizard  
**Child Components**: Card (from ui/), Stripe Elements  
**API Integration**: 
- POST /api/bookings/calculate-price/
- POST /api/payments/create-payment-intent/
- POST /api/bookings/create/
**State**: Loading states for price calculation and payment  
**Payment**: Stripe Elements CardElement for payment entry  
**Success Flow**: Create booking → process payment → redirect to /dashboard

---

### 3.3 Dashboard Components

**Component: DashboardOverview**  
File: `components/dashboard/dashboard-overview.tsx`

```typescript
interface DashboardOverviewProps {
  // No props - customer dashboard
}
```

**Purpose**: Customer dashboard showing upcoming bookings and quick actions  
**Parent Components**: app/dashboard/page.tsx  
**Child Components**: Card, CardHeader, CardContent, Button (from ui/), QuickActions  
**API Integration**: GET /api/bookings/ via TanStack Query  
**Query Key**: ['bookings']  
**Data Displayed**: Upcoming bookings, recent bookings, booking stats  
**Navigation**: Links to booking detail pages

---

**Component: BookingHistory**  
File: `components/dashboard/booking-history.tsx`

```typescript
interface BookingHistoryProps {
  // No props - booking history list
}
```

**Purpose**: Complete booking history with filtering and sorting  
**Parent Components**: app/dashboard/bookings/page.tsx  
**Child Components**: Card, Button (from ui/)  
**API Integration**: GET /api/bookings/ via TanStack Query  
**Query Key**: ['bookings']  
**Features**: 
- Filter by status (pending, confirmed, completed, cancelled)
- Sort by date
- Search by booking number
**Navigation**: Click booking to view detail

---

**Component: QuickActions**  
File: `components/dashboard/quick-actions.tsx`

```typescript
interface QuickActionsProps {
  // No props
}
```

**Purpose**: Quick action buttons for common tasks  
**Parent Components**: DashboardOverview  
**Child Components**: Button (from ui/)  
**Actions**: New booking, view bookings, contact support  
**Navigation**: Router navigation to booking wizard, booking history

---

### 3.4 Layout Components

**Component: MainLayout**  
File: `components/layout/main-layout.tsx`

```typescript
interface MainLayoutProps {
  children: React.ReactNode;           // Page content
  onBookNowClick?: () => void;         // Optional booking wizard trigger
  className?: string;                  // Additional CSS classes
}
```

**Purpose**: Main site layout with header, footer, and navigation  
**Parent Components**: All public pages (page.tsx files)  
**Child Components**: UserMenu, Button (from ui/)  
**Header Features**: Logo, navigation links, user menu or login/register buttons  
**Footer Features**: Company info, links, social media  
**State**: useAuthStore for authentication status  
**Navigation**: Next.js Link components

---

### 3.5 Marketing Components

**Component: HeroSection**  
File: `components/marketing/hero-section.tsx`

```typescript
interface HeroSectionProps {
  onBookNowClick?: () => void;  // Booking wizard trigger
}
```

**Purpose**: Landing page hero with headline and CTA  
**Parent Components**: app/page.tsx (homepage)  
**Child Components**: Button (from ui/)  
**Design**: Full-width hero with background image and centered content  
**CTA**: "Book Now" button triggering booking wizard

---

**Component: HowItWorksSection**  
File: `components/marketing/how-it-works-section.tsx`

```typescript
interface HowItWorksSectionProps {
  // No props
}
```

**Purpose**: Step-by-step explanation of booking process  
**Parent Components**: app/page.tsx (homepage)  
**Child Components**: Card (from ui/)  
**Steps**: Book online → We pickup → White-glove delivery  
**Design**: 3-column grid on desktop, stacked on mobile

---

**Component: WhatWeTransportSection**  
File: `components/marketing/what-we-transport-section.tsx`

```typescript
interface WhatWeTransportSectionProps {
  // No props
}
```

**Purpose**: Visual showcase of transportable items  
**Parent Components**: app/page.tsx (homepage)  
**Child Components**: Card (from ui/)  
**Items**: Luggage, furniture, sports equipment, etc.  
**Design**: Grid layout with images and descriptions

---

**Component: ServiceAreasSection**  
File: `components/marketing/service-areas-section.tsx`

```typescript
interface ServiceAreasSectionProps {
  // No props
}
```

**Purpose**: Geographic service area display  
**Parent Components**: app/page.tsx (homepage)  
**Child Components**: Card (from ui/)  
**Areas**: Hamptons, NYC, airports, Connecticut, South Florida  
**Design**: Map or list-based presentation

---

**Component: TestimonialsSection**  
File: `components/marketing/testimonials-section.tsx`

```typescript
interface TestimonialsSectionProps {
  // No props
}
```

**Purpose**: Customer testimonials and reviews  
**Parent Components**: app/page.tsx (homepage)  
**Child Components**: Card (from ui/)  
**Design**: Carousel or grid of testimonial cards

---

**Component: ServiceShowcase**  
File: `components/marketing/service-showcase.tsx`

```typescript
interface ServiceShowcaseProps {
  // No props
}
```

**Purpose**: Detailed service offerings presentation  
**Parent Components**: app/page.tsx (homepage), app/services/page.tsx  
**Child Components**: Card (from ui/)  
**Services**: Standard delivery, mini move, blade transfer, specialty items  
**Design**: Feature comparison or detailed cards

---

### 3.6 Staff Management Components

**Component: StaffLayout**  
File: `components/staff/staff-layout.tsx`

```typescript
interface StaffLayoutProps {
  children: React.ReactNode;  // Page content
}
```

**Purpose**: Staff dashboard layout with sidebar navigation  
**Parent Components**: All /staff/* pages  
**Child Components**: Sidebar navigation, staff profile menu  
**Navigation Items**: Dashboard, Calendar, Bookings, Customers, Logistics, Reports  
**State**: useStaffAuthStore for authentication  
**Logout**: Integrated logout functionality

---

**Component: StaffLoginForm**  
File: `components/staff/staff-login-form.tsx`

```typescript
interface StaffLoginFormProps {
  // No props - standalone form
}
```

**Purpose**: Staff authentication form  
**Parent Components**: app/staff/login/page.tsx  
**Child Components**: Input, Button (from ui/)  
**API Integration**: POST /api/staff/login/ via apiClient  
**Store Updates**: staffAuthStore.setStaff() on success  
**Navigation**: Redirects to /staff/dashboard on success

---

**Component: StaffDashboardOverview**  
File: `components/staff/staff-dashboard-overview.tsx`

```typescript
interface StaffDashboardOverviewProps {
  // No props
}
```

**Purpose**: Staff dashboard with key metrics and recent activity  
**Parent Components**: app/staff/dashboard/page.tsx  
**Child Components**: Card, CardHeader, CardContent, Button (from ui/)  
**API Integration**: GET /api/staff/dashboard/ via TanStack Query  
**Query Key**: ['staff', 'dashboard']  
**Metrics**: Total bookings, pending actions, revenue, customer stats  
**Recent Activity**: Recent bookings needing attention

---

**Component: BookingManagement**  
File: `components/staff/booking-management.tsx`

```typescript
interface BookingManagementProps {
  // No props
}
```

**Purpose**: Staff booking list with filtering and search  
**Parent Components**: app/staff/bookings/page.tsx  
**Child Components**: Card, Button, Select (from ui/), BookingDetailModal  
**API Integration**: GET /api/staff/bookings/ via TanStack Query  
**Query Key**: ['staff', 'bookings', filters]  
**Features**: 
- Filter by status (all, pending, confirmed, completed, cancelled)
- Search by booking number or customer name
- Sort by date, status, amount
**Navigation**: Click booking to open detail modal or navigate to detail page

---

**Component: BookingCalendar**  
File: `components/staff/booking-calendar.tsx`

```typescript
interface BookingCalendarProps {
  // No props
}
```

**Purpose**: Calendar view of bookings by pickup date  
**Parent Components**: app/staff/calendar/page.tsx  
**Child Components**: Card (from ui/)  
**API Integration**: GET /api/staff/bookings/ via TanStack Query  
**Calendar Library**: Custom implementation (or library TBD)  
**Features**: Monthly view, day view, booking details on click

---

**Component: BookingDetailModal**  
File: `components/staff/booking-detail-modal.tsx`

```typescript
interface BookingDetailModalProps {
  bookingId: string;              // Booking to display
  isOpen: boolean;                // Modal visibility
  onClose: () => void;            // Close handler
}
```

**Purpose**: Modal displaying booking details with quick actions  
**Parent Components**: BookingManagement  
**Child Components**: Modal, Card, Button (from ui/)  
**API Integration**: GET /api/staff/bookings/{id}/ via TanStack Query  
**Quick Actions**: Edit, cancel, mark complete  
**Navigation**: "View Full Details" navigates to booking detail page

---

**Component: CustomerManagement**  
File: `components/staff/customer-management.tsx`

```typescript
interface CustomerManagementProps {
  // No props
}
```

**Purpose**: Staff customer list with search and filtering  
**Parent Components**: app/staff/customers/page.tsx  
**Child Components**: Card, Button, Input (from ui/)  
**API Integration**: GET /api/staff/customers/ via TanStack Query  
**Query Key**: ['staff', 'customers']  
**Features**: 
- Search by name, email, phone
- Filter by VIP status
- Sort by total spent, bookings count
**Navigation**: Click customer to view detail page

---

### 3.7 UI Primitive Components

**Component: Button**  
File: `components/ui/button.tsx`

```typescript
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;           // Shows loading spinner
  disabled?: boolean;            // Disabled state
  className?: string;            // Additional classes
  children: React.ReactNode;     // Button content
}
```

**Purpose**: Reusable button component with variants and sizes  
**Used By**: All components throughout the application  
**Variants**: 
- primary: Navy background, white text (main CTAs)
- secondary: Gold background, navy text
- outline: Transparent with navy border
- ghost: Transparent, navy text on hover
- danger: Red for destructive actions
**States**: Hover, active, disabled, loading

---

**Component: Input**  
File: `components/ui/input.tsx`

```typescript
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;                // Input label
  error?: string;                // Error message
  variant?: 'default' | 'error' | 'success';
  helperText?: string;           // Helper text below input
  className?: string;            // Additional classes
}
```

**Purpose**: Reusable form input with label and error handling  
**Used By**: All forms (login, register, booking, customer info)  
**Types**: text, email, password, number, date, tel  
**Validation**: Error state styling, error message display  
**Accessibility**: Label association, aria attributes

---

**Component: Card**  
File: `components/ui/card.tsx`

```typescript
interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'luxury' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  rounded?: 'none' | 'md' | 'lg' | 'xl';
  className?: string;
  children: React.ReactNode;
}
```

**Purpose**: Reusable card container with variants  
**Used By**: Dashboard, marketing sections, forms  
**Subcomponents**: CardHeader, CardContent, CardFooter  
**Variants**: 
- default: White background, subtle shadow
- luxury: Gold accent, enhanced shadow
- outlined: Border instead of shadow

---

**Component: Select**  
File: `components/ui/select.tsx`

```typescript
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;                // Select label
  error?: string;                // Error message
  options: Array<{               // Select options
    value: string;
    label: string;
  }>;
  placeholder?: string;          // Placeholder text
  className?: string;            // Additional classes
}
```

**Purpose**: Reusable select dropdown with options  
**Used By**: Forms (time selection, address state, filters)  
**Validation**: Error state styling, required field indicator  
**Accessibility**: Label association, aria attributes

---

**Component: Modal**  
File: `components/ui/modal.tsx`

```typescript
interface ModalProps {
  isOpen: boolean;               // Modal visibility
  onClose: () => void;           // Close handler
  title?: string;                // Modal title
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: React.ReactNode;     // Modal content
  showCloseButton?: boolean;     // Show X button
  closeOnClickOutside?: boolean; // Close on backdrop click
}
```

**Purpose**: Reusable modal/dialog component  
**Used By**: BookingWizard, BookingDetailModal  
**Library**: Headless UI Transition + Dialog  
**Features**: Backdrop overlay, focus trap, ESC to close, smooth transitions  
**Sizes**: Responsive sizing based on content

---

### 3.8 Provider Components

**Component: QueryProvider**  
File: `components/providers/query-provider.tsx`

```typescript
interface QueryProviderProps {
  children: React.ReactNode;     // App content
}
```

**Purpose**: TanStack Query provider wrapping entire app  
**Parent Components**: app/layout.tsx (root layout)  
**Configuration**: 
- Query client with default options
- React Query DevTools in development
- Stale time, cache time, retry configuration
**Global State**: Server state caching and synchronization

---

**Component: SessionValidator**  
File: `app/layout.tsx`

```typescript
// Internal component, no exported interface
```

**Purpose**: Validates stored sessions on app startup  
**Parent Components**: app/layout.tsx (root layout)  
**Hooks Used**: useAuthStore, useStaffAuthStore  
**Effect**: Runs once on mount to validate customer and staff sessions  
**Flow**: Check isAuthenticated → call validateSession() → clear if invalid

---

## SECTION 4: FILE DIRECTORY + PURPOSE INDEX

```
frontend/
├── public/                                 # Static assets
│   ├── assets/
│   │   ├── images/                        # Marketing images (24 images)
│   │   └── videos/                        # Video assets
│   ├── file.svg                           # Next.js default icon
│   ├── globe.svg                          # Next.js default icon
│   ├── next.svg                           # Next.js logo
│   ├── vercel.svg                         # Vercel logo
│   └── window.svg                         # Next.js default icon
│
├── scripts/                               # Build scripts
│   ├── front_export.py                    # Frontend snapshot generator
│   └── frontend_snapshot.txt              # Complete frontend code snapshot
│
├── src/                                   # Source code
│   ├── app/                               # Next.js App Router pages
│   │   ├── about/
│   │   │   └── page.tsx                   # About page - company story and services
│   │   ├── book/
│   │   │   └── page.tsx                   # Booking page - embedded BookingWizard
│   │   ├── contact/
│   │   │   └── page.tsx                   # Contact page - form and info
│   │   ├── dashboard/
│   │   │   ├── page.tsx                   # Customer dashboard - overview and upcoming bookings
│   │   │   └── bookings/
│   │   │       └── page.tsx               # Booking history - complete list with filters
│   │   ├── faq/
│   │   │   └── page.tsx                   # FAQ page - frequently asked questions
│   │   ├── login/
│   │   │   └── page.tsx                   # Customer login page
│   │   ├── register/
│   │   │   └── page.tsx                   # Customer registration page
│   │   ├── services/
│   │   │   └── page.tsx                   # Services overview - detailed service descriptions
│   │   ├── staff/                         # Staff-only routes
│   │   │   ├── login/
│   │   │   │   └── page.tsx               # Staff login page
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx               # Staff dashboard - metrics and recent activity
│   │   │   ├── calendar/
│   │   │   │   └── page.tsx               # Booking calendar - calendar view of bookings
│   │   │   ├── bookings/
│   │   │   │   ├── page.tsx               # Booking management - list with filters
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx           # Booking detail - edit booking details
│   │   │   ├── customers/
│   │   │   │   ├── page.tsx               # Customer management - list with search
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx           # Customer detail - customer info and bookings
│   │   │   ├── logistics/
│   │   │   │   └── page.tsx               # Logistics management - placeholder for logistics
│   │   │   └── reports/
│   │   │       └── page.tsx               # Reports & analytics - placeholder for reports
│   │   ├── favicon.ico                    # Site favicon
│   │   ├── globals.css                    # Global CSS with Tailwind directives
│   │   ├── layout.tsx                     # Root layout - fonts, QueryProvider, SessionValidator
│   │   └── page.tsx                       # Homepage - hero, how it works, services, testimonials
│   │
│   ├── components/                        # Reusable components
│   │   ├── auth/                          # Authentication components
│   │   │   ├── index.ts                   # Barrel export for auth components
│   │   │   ├── login-form.tsx             # Customer login form with validation
│   │   │   ├── register-form.tsx          # Customer registration form
│   │   │   └── user-menu.tsx              # User dropdown menu with profile and logout
│   │   │
│   │   ├── booking/                       # Booking wizard components
│   │   │   ├── index.ts                   # Barrel export for booking components
│   │   │   ├── booking-wizard.tsx         # Main booking wizard orchestrator (6 steps)
│   │   │   ├── auth-choice-step.tsx       # Step 0: Login, register, or guest choice
│   │   │   ├── service-selection-step.tsx # Step 1: Service type selection
│   │   │   ├── date-time-step.tsx         # Step 2: Pickup date and time selection
│   │   │   ├── address-step.tsx           # Step 3: Pickup and delivery addresses
│   │   │   ├── customer-info-step.tsx     # Step 4: Guest customer information
│   │   │   └── review-payment-step.tsx    # Step 5: Review booking and Stripe payment
│   │   │
│   │   ├── dashboard/                     # Customer dashboard components
│   │   │   ├── dashboard-overview.tsx     # Dashboard home - upcoming bookings and stats
│   │   │   ├── booking-history.tsx        # Booking history list with filters
│   │   │   └── quick-actions.tsx          # Quick action buttons for common tasks
│   │   │
│   │   ├── debug/                         # Debug utilities
│   │   │   └── mobile-debug.tsx           # Mobile debugging component
│   │   │
│   │   ├── layout/                        # Layout components
│   │   │   └── main-layout.tsx            # Main site layout with header and footer
│   │   │
│   │   ├── marketing/                     # Marketing/landing page components
│   │   │   ├── index.ts                   # Barrel export for marketing components
│   │   │   ├── hero-section.tsx           # Homepage hero with headline and CTA
│   │   │   ├── how-it-works-section.tsx   # Step-by-step process explanation
│   │   │   ├── what-we-transport-section.tsx # Items we transport showcase
│   │   │   ├── service-areas-section.tsx  # Geographic service areas
│   │   │   ├── testimonials-section.tsx   # Customer testimonials and reviews
│   │   │   └── service-showcase.tsx       # Detailed service offerings
│   │   │
│   │   ├── providers/                     # React context providers
│   │   │   └── query-provider.tsx         # TanStack Query provider wrapper
│   │   │
│   │   ├── staff/                         # Staff management components
│   │   │   ├── index.ts                   # Barrel export for staff components
│   │   │   ├── staff-login-form.tsx       # Staff authentication form
│   │   │   ├── staff-layout.tsx           # Staff dashboard layout with sidebar
│   │   │   ├── staff-dashboard-overview.tsx # Staff dashboard metrics and activity
│   │   │   ├── booking-management.tsx     # Booking list with filters and search
│   │   │   ├── booking-calendar.tsx       # Calendar view of bookings
│   │   │   ├── booking-detail-modal.tsx   # Quick booking detail modal
│   │   │   └── customer-management.tsx    # Customer list with search
│   │   │
│   │   └── ui/                            # Reusable UI primitives
│   │       ├── index.ts                   # Barrel export for UI components
│   │       ├── button.tsx                 # Button component with variants
│   │       ├── card.tsx                   # Card container with subcomponents
│   │       ├── input.tsx                  # Form input with label and validation
│   │       ├── modal.tsx                  # Modal/dialog component
│   │       └── select.tsx                 # Select dropdown with options
│   │
│   ├── hooks/                             # Custom React hooks
│   │   └── use-click-away.ts              # Hook for detecting clicks outside element
│   │
│   ├── lib/                               # Utilities and configuration
│   │   ├── api-client.ts                  # Axios instance with interceptors
│   │   ├── query-client.ts                # TanStack Query client configuration
│   │   └── stripe.ts                      # Stripe initialization
│   │
│   ├── stores/                            # Zustand state stores
│   │   ├── auth-store.ts                  # Customer authentication state
│   │   ├── staff-auth-store.ts            # Staff authentication state
│   │   ├── booking-store.ts               # Booking wizard state
│   │   └── ui-store.ts                    # UI state (sidebar, modals, notifications)
│   │
│   ├── types/                             # TypeScript type definitions
│   │   └── index.ts                       # All TypeScript interfaces and types
│   │
│   └── utils/                             # Utility functions
│       └── cn.ts                          # className utility (clsx + tailwind-merge)
│
├── .gitignore                             # Git ignore patterns
├── eslint.config.mjs                      # ESLint configuration
├── invoice.html                           # Invoice template (static)
├── netlify.toml                           # Netlify deployment configuration
├── next.config.ts                         # Next.js configuration
├── next-env.d.ts                          # Next.js TypeScript declarations
├── package.json                           # Dependencies and scripts
├── postcss.config.js                      # PostCSS configuration
├── postcss.config.mjs                     # PostCSS configuration (module)
├── README.md                              # Project README
├── tailwind.config.js                     # Tailwind CSS configuration
└── tsconfig.json                          # TypeScript configuration
```

**Total Files**: 75 code files  
**Key Directories**: 16 (app, components, hooks, lib, stores, types, utils)  
**Component Files**: 35+  
**Page Files**: 20+

---

## SECTION 5: FEATURE-TO-FILE DEPENDENCY MAPS

### 5.1 Customer Authentication Flow

**Files Required**:
- app/login/page.tsx
- components/auth/login-form.tsx
- components/auth/user-menu.tsx
- stores/auth-store.ts
- lib/api-client.ts
- types/index.ts

**Backend APIs**: POST /api/auth/login/, POST /api/auth/logout/, GET /api/auth/session/

**Flow**:
1. User navigates to /login
2. LoginForm renders with email/password inputs
3. Form submission → apiClient.post('/api/auth/login/') with credentials
4. Success → authStore.setUser(user) saves user and token
5. Redirect to /dashboard
6. UserMenu displays in MainLayout header
7. Logout → authStore.logout() → apiClient.post('/api/auth/logout/') → clear state → redirect to /

---

### 5.2 Booking Creation Flow

**Files Required**:
- app/book/page.tsx or app/page.tsx (modal trigger)
- components/booking/booking-wizard.tsx
- components/booking/auth-choice-step.tsx
- components/booking/service-selection-step.tsx
- components/booking/date-time-step.tsx
- components/booking/address-step.tsx
- components/booking/customer-info-step.tsx
- components/booking/review-payment-step.tsx
- stores/booking-store.ts
- stores/auth-store.ts
- lib/api-client.ts
- lib/stripe.ts
- types/index.ts

**Backend APIs**: 
- GET /api/services/
- POST /api/bookings/calculate-price/
- POST /api/payments/create-payment-intent/
- POST /api/bookings/create/

**Flow**:
1. User clicks "Book Now" → BookingWizard opens (Modal or page)
2. **Step 0 (AuthChoiceStep)**: User chooses login, register, or guest → bookingStore.setIsGuest()
3. **Step 1 (ServiceSelectionStep)**: Fetch services via TanStack Query → user selects service → bookingStore.setServiceType()
4. **Step 2 (DateTimeStep)**: User selects pickup date and time → bookingStore updates
5. **Step 3 (AddressStep)**: User enters pickup and delivery addresses → bookingStore updates
6. **Step 4 (CustomerInfoStep)**: If guest, collect name, email, phone → bookingStore updates
7. **Step 5 (ReviewPaymentStep)**:
   - Calculate price: POST /api/bookings/calculate-price/ with bookingStore data
   - Display price breakdown
   - Create payment intent: POST /api/payments/create-payment-intent/
   - User enters card details via Stripe Elements
   - On payment success: POST /api/bookings/create/ to create booking
   - Clear bookingStore → redirect to /dashboard

---

### 5.3 Customer Dashboard Feature

**Files Required**:
- app/dashboard/page.tsx
- app/dashboard/bookings/page.tsx
- components/dashboard/dashboard-overview.tsx
- components/dashboard/booking-history.tsx
- components/dashboard/quick-actions.tsx
- stores/auth-store.ts
- lib/api-client.ts
- components/ui/card.tsx
- components/ui/button.tsx
- types/index.ts

**Backend APIs**: GET /api/bookings/, GET /api/bookings/{id}/

**Flow**:
1. Authenticated user navigates to /dashboard
2. DashboardOverview renders:
   - Fetches bookings via TanStack Query: queryKey ['bookings']
   - Displays upcoming bookings
   - Shows recent bookings
   - QuickActions component provides quick links
3. User clicks "View All Bookings" → navigate to /dashboard/bookings
4. BookingHistory renders:
   - Fetches bookings with same query
   - Provides filtering (status), sorting (date)
   - Search by booking number
5. User clicks booking → navigate to booking detail

---

### 5.4 Staff Dashboard Feature

**Files Required**:
- app/staff/dashboard/page.tsx
- app/staff/login/page.tsx
- components/staff/staff-layout.tsx
- components/staff/staff-login-form.tsx
- components/staff/staff-dashboard-overview.tsx
- stores/staff-auth-store.ts
- lib/api-client.ts
- components/ui/card.tsx
- components/ui/button.tsx
- types/index.ts

**Backend APIs**: POST /api/staff/login/, GET /api/staff/dashboard/

**Flow**:
1. Staff navigates to /staff/login
2. StaffLoginForm renders → enter credentials
3. Submit → apiClient.post('/api/staff/login/') → staffAuthStore.setStaff() → redirect to /staff/dashboard
4. StaffDashboardOverview renders:
   - Fetches dashboard data: GET /api/staff/dashboard/
   - Displays metrics: total bookings, pending actions, revenue, customers
   - Shows recent bookings needing attention
   - Quick navigation buttons

---

### 5.5 Staff Booking Management Feature

**Files Required**:
- app/staff/bookings/page.tsx
- app/staff/bookings/[id]/page.tsx
- components/staff/booking-management.tsx
- components/staff/booking-detail-modal.tsx
- stores/staff-auth-store.ts
- lib/api-client.ts
- components/ui/card.tsx
- components/ui/button.tsx
- components/ui/input.tsx
- components/ui/select.tsx
- types/index.ts

**Backend APIs**: 
- GET /api/staff/bookings/
- GET /api/staff/bookings/{id}/
- PUT /api/staff/bookings/{id}/

**Flow**:
1. Staff navigates to /staff/bookings
2. BookingManagement renders:
   - Fetches bookings: GET /api/staff/bookings/ with filters
   - Displays paginated booking list
   - Provides filters: status (all, pending, confirmed, completed, cancelled)
   - Search by booking number or customer name
3. Staff clicks booking → BookingDetailModal opens OR navigate to /staff/bookings/{id}
4. Booking detail page:
   - Fetches booking detail: GET /api/staff/bookings/{id}/
   - Displays all booking information
   - Edit mode allows inline editing
   - Save → PUT /api/staff/bookings/{id}/ to update
   - Invalidate cache → refetch

---

### 5.6 Staff Customer Management Feature

**Files Required**:
- app/staff/customers/page.tsx
- app/staff/customers/[id]/page.tsx
- components/staff/customer-management.tsx
- stores/staff-auth-store.ts
- lib/api-client.ts
- components/ui/card.tsx
- components/ui/button.tsx
- components/ui/input.tsx
- types/index.ts

**Backend APIs**: 
- GET /api/staff/customers/
- GET /api/staff/customers/{id}/
- PUT /api/staff/customers/{id}/

**Flow**:
1. Staff navigates to /staff/customers
2. CustomerManagement renders:
   - Fetches customers: GET /api/staff/customers/
   - Displays customer list
   - Search by name, email, phone
   - Filter by VIP status
3. Staff clicks customer → navigate to /staff/customers/{id}
4. Customer detail page:
   - Fetches customer: GET /api/staff/customers/{id}/
   - Displays customer profile, bookings, saved addresses
   - Edit notes → PUT /api/staff/customers/{id}/ to update

---

## SECTION 6: STATE MANAGEMENT ARCHITECTURE

### 6.1 Zustand Stores Overview

**Store Files**:
- stores/auth-store.ts - Customer authentication state
- stores/staff-auth-store.ts - Staff authentication state
- stores/booking-store.ts - Booking wizard state
- stores/ui-store.ts - UI state (sidebar, modals, notifications)

**Store Pattern**: Zustand with persist middleware for auth stores

---

### 6.2 Customer Auth Store

**File**: stores/auth-store.ts

**State Shape**:
```typescript
interface AuthState {
  user: DjangoUser | null;
  customerProfile: CustomerProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
```

**Actions**:
```typescript
interface AuthActions {
  setUser: (user: DjangoUser, profile?: CustomerProfile) => void;
  logout: () => Promise<void>;
  validateSession: () => Promise<boolean>;
}
```

**Persistence**: localStorage with key 'totetaxi-auth'  
**Sensitive Data**: Token stored separately, not in state  
**Used By**: All customer-facing components, auth forms, UserMenu  
**Initialization**: SessionValidator checks on app startup

---

### 6.3 Staff Auth Store

**File**: stores/staff-auth-store.ts

**State Shape**:
```typescript
interface StaffAuthState {
  staffProfile: StaffProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
```

**Actions**:
```typescript
interface StaffAuthActions {
  setStaff: (profile: StaffProfile) => void;
  logout: () => Promise<void>;
  validateSession: () => Promise<boolean>;
}
```

**Persistence**: localStorage with key 'totetaxi-staff-auth'  
**Sensitive Data**: Token stored separately  
**Used By**: All staff components, StaffLayout, staff pages  
**Initialization**: SessionValidator checks on app startup

---

### 6.4 Booking Store

**File**: stores/booking-store.ts

**State Shape**:
```typescript
interface BookingState {
  // Wizard state
  currentStep: number;
  isGuest: boolean;
  
  // Service selection
  service_type: string | null;
  mini_move_package_id: string | null;
  specialty_items: string[];
  
  // Date/time
  pickup_date: string | null;
  pickup_time: string | null;
  specific_pickup_hour: number | null;
  
  // Addresses
  pickup_address: BookingAddress | null;
  delivery_address: BookingAddress | null;
  
  // Customer info (guest)
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  
  // Additional fields
  special_instructions: string | null;
  coi_required: boolean;
  
  // Blade transfer specific
  blade_airport: string | null;
  blade_flight_date: string | null;
  blade_flight_time: string | null;
  blade_bag_count: number | null;
  
  // Mini move specific
  include_packing: boolean;
  include_unpacking: boolean;
}
```

**Actions**:
```typescript
interface BookingActions {
  nextStep: () => void;
  previousStep: () => void;
  setStep: (step: number) => void;
  setIsGuest: (isGuest: boolean) => void;
  setServiceType: (serviceType: string) => void;
  setPickupDate: (date: string) => void;
  setPickupTime: (time: string) => void;
  setPickupAddress: (address: BookingAddress) => void;
  setDeliveryAddress: (address: BookingAddress) => void;
  setCustomerInfo: (name: string, email: string, phone: string) => void;
  // ... other setters
  resetBooking: () => void;
}
```

**Persistence**: No persistence (ephemeral wizard state)  
**Cleared**: After successful booking creation  
**Used By**: BookingWizard and all step components

---

### 6.5 UI Store

**File**: stores/ui-store.ts

**State Shape**:
```typescript
interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  }>;
  modals: {
    login: boolean;
    register: boolean;
    addressForm: boolean;
    paymentMethod: boolean;
  };
}
```

**Actions**:
```typescript
interface UIActions {
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  openModal: (modal: string) => void;
  closeModal: (modal: string) => void;
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  secureReset: () => void;
}
```

**Persistence**: localStorage for theme only  
**Security**: Input sanitization on notifications  
**Used By**: Layout components, notification system, modal system

---

### 6.6 TanStack Query (Server State)

**Configuration**: lib/query-client.ts

**Default Query Options**:
```typescript
{
  queries: {
    staleTime: 1000 * 60 * 5,        // 5 minutes
    cacheTime: 1000 * 60 * 10,       // 10 minutes
    refetchOnWindowFocus: false,
    retry: 3,
  },
}
```

**Query Keys Naming Convention**:
```typescript
// Customer queries
['bookings']                          // All customer bookings
['bookings', bookingId]               // Single booking detail

// Staff queries
['staff', 'dashboard']                // Staff dashboard data
['staff', 'bookings']                 // All bookings (staff view)
['staff', 'bookings', filters]        // Filtered bookings
['staff', 'booking', bookingId]       // Single booking (staff view)
['staff', 'customers']                // All customers
['staff', 'customer', customerId]     // Single customer detail

// Services
['services']                          // Available services
```

**Mutation Pattern**:
```typescript
const mutation = useMutation({
  mutationFn: async (data) => {
    return apiClient.post('/api/endpoint/', data);
  },
  onSuccess: () => {
    queryClient.invalidateQueries(['queryKey']);
  },
});
```

**Optimistic Updates**: Used in some mutations for immediate UI feedback  
**Error Handling**: Global error toast via UI store  
**DevTools**: Available in development mode

---

## SECTION 7: ROUTING & NAVIGATION ARCHITECTURE

### 7.1 Route Structure

**Public Routes** (No authentication required):
```
/                    - Landing page
/about               - About page
/services            - Services overview
/faq                 - FAQ page
/contact             - Contact page
/book                - Booking page (embedded wizard)
/login               - Customer login
/register            - Customer registration
```

**Protected Customer Routes** (Require customer authentication):
```
/dashboard           - Customer dashboard
/dashboard/bookings  - Booking history
```

**Protected Staff Routes** (Require staff authentication):
```
/staff/login         - Staff login
/staff/dashboard     - Staff dashboard
/staff/calendar      - Booking calendar
/staff/bookings      - Booking management
/staff/bookings/:id  - Booking detail
/staff/customers     - Customer management
/staff/customers/:id - Customer detail
/staff/logistics     - Logistics (placeholder)
/staff/reports       - Reports (placeholder)
```

### 7.2 Route Protection Pattern

**Customer Route Protection**:
```typescript
// In page component
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
// In page component
const { isAuthenticated, isLoading } = useStaffAuthStore();
const router = useRouter();

useEffect(() => {
  if (!isLoading && !isAuthenticated) {
    router.push('/staff/login');
  }
}, [isAuthenticated, isLoading, router]);
```

**Alternative**: Could be extracted into a ProtectedRoute component or middleware

### 7.3 Navigation Components

**MainLayout Navigation**:
- Logo (links to /)
- Navigation links: About, Services, FAQ, Contact
- User menu (if authenticated) or Login/Register buttons
- "Book Now" button (triggers BookingWizard)

**StaffLayout Navigation**:
- Sidebar with navigation items
- Dashboard, Calendar, Bookings, Customers, Logistics, Reports
- Staff profile and logout in header

**Breadcrumbs**: Not currently implemented but could be added to detail pages

---

## SECTION 8: FORM HANDLING & VALIDATION

### 8.1 Form Pattern

**Library**: React Hook Form 7.62.0 + Zod 3.25.76

**Pattern**:
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// 1. Define Zod schema
const schema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type FormData = z.infer<typeof schema>;

// 2. Initialize form with resolver
const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
  resolver: zodResolver(schema),
});

// 3. Submit handler
const onSubmit = async (data: FormData) => {
  // API call
};

// 4. Render form
<form onSubmit={handleSubmit(onSubmit)}>
  <Input
    label="Email"
    error={errors.email?.message}
    {...register('email')}
  />
  <Button type="submit">Submit</Button>
</form>
```

### 8.2 Validation Schemas

**Location**: Inline in component files (could be extracted to schemas/ directory)

**Common Patterns**:
```typescript
// Email validation
z.string().email('Invalid email')

// Required string
z.string().min(1, 'This field is required')

// Phone validation
z.string().regex(/^\d{3}-\d{3}-\d{4}$/, 'Invalid phone format')

// Date validation (future dates only)
z.string().refine(date => new Date(date) > new Date(), 'Date must be in future')

// Conditional validation
z.object({
  serviceType: z.string(),
  packageId: z.string().optional(),
}).refine(data => {
  if (data.serviceType === 'mini_move') {
    return !!data.packageId;
  }
  return true;
}, 'Package is required for mini move')
```

### 8.3 Forms in the Application

**LoginForm**:
- Fields: email, password
- Validation: Email format, required fields
- Submission: POST /api/auth/login/

**RegisterForm**:
- Fields: email, password, first_name, last_name, phone
- Validation: Email format, password length, phone format, required fields
- Submission: POST /api/auth/register/

**CustomerInfoStep** (Booking wizard):
- Fields: name, email, phone
- Validation: Email format, phone format, required fields
- Submission: Data stored in bookingStore

**AddressStep** (Booking wizard):
- Fields: address_line_1, address_line_2, city, state, zip_code (pickup and delivery)
- Validation: Required fields, ZIP code format
- Submission: Data stored in bookingStore

**ReviewPaymentStep** (Booking wizard):
- Fields: Stripe CardElement (handled by Stripe)
- Validation: Stripe validates card
- Submission: POST /api/bookings/create/ after payment success

**Booking Edit Form** (Staff):
- Fields: All booking fields (status, dates, addresses, etc.)
- Validation: Date validation, address validation
- Submission: PUT /api/staff/bookings/{id}/

**Customer Notes Edit** (Staff):
- Fields: notes (textarea)
- Validation: Length limit
- Submission: PUT /api/staff/customers/{id}/

### 8.4 Error Handling

**Client-side Validation Errors**:
- Displayed inline below each field
- Form submission disabled until valid
- Real-time validation on blur

**Server-side Validation Errors**:
- Returned from API as JSON
- Displayed in toast notification OR field-level errors
- Pattern: `{ field: ['error message'] }`

**API Errors**:
- Network errors: Toast notification "Something went wrong"
- 401 Unauthorized: Logout and redirect to login
- 403 Forbidden: Toast "You don't have permission"
- 404 Not Found: Toast "Resource not found"
- 500 Server Error: Toast "Server error, please try again"

---

## SECTION 9: UI COMPONENT SYSTEM & DESIGN

### 9.1 Component Variants

**Button Variants**:
```typescript
'primary'    // Navy background, white text (main CTAs)
'secondary'  // Gold background, navy text
'outline'    // Transparent with navy border
'ghost'      // Transparent, navy text on hover
'danger'     // Red for destructive actions
```

**Button Sizes**:
```typescript
'sm'   // Small (px-3 py-1.5 text-sm)
'md'   // Medium (px-4 py-2 text-base) - default
'lg'   // Large (px-6 py-3 text-lg)
```

**Card Variants**:
```typescript
'default'  // White background, subtle shadow
'luxury'   // Gold accent, enhanced shadow
'outlined' // Border instead of shadow
```

**Input States**:
```typescript
'default'  // Gray border, focus:navy ring
'error'    // Red border, focus:red ring
'success'  // Green border, focus:green ring
```

### 9.2 Responsive Design

**Breakpoints** (Tailwind defaults):
```
sm:  640px   - Small devices
md:  768px   - Medium devices (tablets)
lg:  1024px  - Large devices (desktops)
xl:  1280px  - Extra large screens
2xl: 1536px  - Ultra-wide screens
```

**Responsive Patterns**:
```typescript
// Grid layouts
'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3'

// Stack to horizontal
'flex flex-col md:flex-row'

// Hide/show
'hidden md:block'

// Text sizes
'text-2xl md:text-3xl lg:text-4xl'
```

### 9.3 Accessibility

**Keyboard Navigation**:
- All interactive elements keyboard accessible
- Focus states visible
- Tab order logical

**Screen Readers**:
- Semantic HTML (header, nav, main, section, article)
- ARIA labels where needed
- Form labels associated with inputs

**Color Contrast**:
- WCAG AA compliant (4.5:1 for normal text)
- Navy on white, gold on navy tested

**Focus Management**:
- Modal focus trap (Headless UI)
- Skip links for navigation

### 9.4 Animation & Transitions

**Headless UI Transitions**:
```typescript
// Modal enter/leave
enter: 'transition ease-out duration-200'
enterFrom: 'opacity-0 scale-95'
enterTo: 'opacity-100 scale-100'
leave: 'transition ease-in duration-150'
leaveFrom: 'opacity-100 scale-100'
leaveTo: 'opacity-0 scale-95'
```

**Tailwind Transitions**:
```typescript
'transition-colors duration-200'  // Button hover
'transition-shadow duration-300'  // Card hover
'transition-transform duration-200' // Scale effects
```

**Loading States**:
```typescript
'animate-spin'  // Spinner rotation
'animate-pulse' // Skeleton loading
```

### 9.5 Typography

**Font Families**:
- Sans-serif: Inter (--font-inter) for body text
- Serif: Playfair Display (--font-playfair) for headings

**Font Classes**:
```typescript
'font-sans'   // Inter (body text)
'font-serif'  // Playfair Display (headings)
'font-normal' // 400 weight
'font-medium' // 500 weight
'font-bold'   // 700 weight
```

**Text Sizes**:
```typescript
'text-xs'   // 0.75rem (12px)
'text-sm'   // 0.875rem (14px)
'text-base' // 1rem (16px) - default
'text-lg'   // 1.125rem (18px)
'text-xl'   // 1.25rem (20px)
'text-2xl'  // 1.5rem (24px)
'text-3xl'  // 1.875rem (30px)
'text-4xl'  // 2.25rem (36px)
'text-5xl'  // 3rem (48px)
```

---

## SECTION 10: DEVELOPMENT PATTERNS & CONVENTIONS

### 10.1 Adding a New Page

**Steps**:
1. Create page.tsx in appropriate app/ directory
2. If protected route, add authentication check
3. Wrap with appropriate layout (MainLayout or StaffLayout)
4. Add navigation link if needed
5. Update this documentation

**Example** - Adding a new customer profile page:
```typescript
// app/profile/page.tsx
'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';

export default function ProfilePage() {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-serif font-bold">My Profile</h1>
        {/* Profile content */}
      </div>
    </MainLayout>
  );
}
```

### 10.2 Creating a New Component

**Steps**:
1. Determine appropriate directory (ui/, feature-specific/)
2. Define TypeScript interface for props
3. Create component with forwardRef if needed
4. Use existing UI primitives where possible
5. Add to index.ts for barrel export
6. Document component interface in this documentation

**Example** - Creating a LoadingSpinner component:
```typescript
// components/ui/loading-spinner.tsx
import { cn } from '@/utils/cn';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className={cn('animate-spin rounded-full border-b-2 border-navy-900', sizeClasses[size], className)} />
  );
}
```

### 10.3 Adding Backend Integration

**Steps**:
1. Check backend README.md for API specification
2. Create TanStack Query hook or use direct apiClient call
3. Define TypeScript types for request/response
4. Add error handling and loading states
5. Update backend integration map in this documentation

**Example** - Adding new API endpoint integration:
```typescript
// In component file
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// Fetch data
const { data, isLoading, error } = useQuery({
  queryKey: ['resource', id],
  queryFn: async () => {
    const response = await apiClient.get(`/api/resource/${id}/`);
    return response.data;
  },
});

// Mutate data
const queryClient = useQueryClient();
const mutation = useMutation({
  mutationFn: async (data) => {
    return apiClient.post('/api/resource/', data);
  },
  onSuccess: () => {
    queryClient.invalidateQueries(['resource']);
  },
});
```

### 10.4 Code Organization Rules

**File Naming**:
- Components: kebab-case (login-form.tsx)
- Pages: page.tsx (Next.js App Router convention)
- Types: camelCase interfaces (DjangoUser)
- Utilities: kebab-case (api-client.ts)

**Import Order**:
```typescript
// 1. External libraries
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 2. Internal components
import { Button } from '@/components/ui/button';
import { MainLayout } from '@/components/layout/main-layout';

// 3. Hooks and stores
import { useAuthStore } from '@/stores/auth-store';
import { useClickAway } from '@/hooks/use-click-away';

// 4. Utils and types
import { cn } from '@/utils/cn';
import type { DjangoUser } from '@/types';

// 5. Styles (if any)
import styles from './component.module.css';
```

**Component Structure**:
```typescript
// 1. Imports

// 2. Types/Interfaces
interface ComponentProps {
  // props
}

// 3. Component
export function Component({ prop }: ComponentProps) {
  // 4. Hooks
  const [state, setState] = useState();
  const router = useRouter();
  
  // 5. Derived state
  const computedValue = useMemo(() => {}, []);
  
  // 6. Effects
  useEffect(() => {}, []);
  
  // 7. Handlers
  const handleClick = () => {};
  
  // 8. Early returns
  if (loading) return <Spinner />;
  
  // 9. Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

### 10.5 Testing Patterns

**Component Testing** (Not yet implemented):
- Framework: Vitest + React Testing Library
- Pattern: Test user interactions, not implementation
- Files: *.test.tsx alongside component

**E2E Testing** (Not yet implemented):
- Framework: Playwright (suggested)
- Pattern: Test critical user flows
- Files: tests/e2e/

**Type Safety**:
- TypeScript strict mode enabled
- All props typed with interfaces
- API responses typed
- No `any` types

### 10.6 Environment Variables

**Configuration**: .env.local (not in git)

**Variables**:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8005  # Backend API URL
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_...  # Stripe publishable key
```

**Usage**:
```typescript
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
```

**Note**: Variables prefixed with NEXT_PUBLIC_ are exposed to the browser

### 10.7 Deployment

**Platform**: Netlify (configured via netlify.toml)

**Build Command**: `npm run build`  
**Output Directory**: `.next/`  
**Node Version**: 18.x or higher

**Build Optimizations**:
- TypeScript errors ignored during build (typescript.ignoreBuildErrors)
- ESLint skipped during build (eslint.ignoreDuringBuilds)
- Console.logs removed in production
- Source maps disabled in production

---

## REGENERATION PROTOCOL

When this documentation needs to be updated, follow these steps:

**1. Analyze Changes**: Review what changed in frontend_snapshot.txt
- New components added?
- New routes added?
- Backend API integrations changed?
- State management patterns changed?

**2. Update Sections**:
- Section 1: Technology stack changes
- Section 2: Backend integration map additions/changes
- Section 3: New component interfaces
- Section 4: File directory updates
- Section 5: New feature-to-file maps
- Section 6-10: Pattern changes

**3. Maintain Compression Target**: Keep documentation at ~1600 lines (10-15% of frontend_snapshot.txt)

**4. Preserve Philosophy**: This is a navigation system, not code reproduction

---

## AI USAGE GUIDELINES

**When the AI needs to modify frontend code**:

1. **Load this living documentation first** - Understand architecture and patterns
2. **Identify required files** - Use Section 5 (Feature-to-File Maps) to find all related files
3. **Request specific files** - Ask user for specific files from frontend_snapshot.txt
4. **Make changes following patterns** - Use Section 10 (Development Patterns) for consistency
5. **Update related files** - Consider cascade effects (types, stores, components)
6. **Suggest documentation updates** - If significant changes, note what needs updating here

**When the AI needs backend integration**:

1. **Check Section 2** - Backend Integration Map for existing patterns
2. **Reference backend README.md** - For complete API specifications
3. **Follow TanStack Query patterns** - Use established query key conventions
4. **Handle errors consistently** - Follow error handling patterns from Section 8

**When the AI is uncertain**:

1. **Search this document** - Use Ctrl+F to find relevant sections
2. **Check similar components** - Look at Section 3 for similar interface patterns
3. **Request clarification** - Ask user which pattern to follow
4. **Default to existing patterns** - Don't invent new patterns without reason

---

## DOCUMENT END

**Last Updated**: 2025-10-03  
**Version**: 2.0  
**Total Lines**: ~1600  
**Compression Ratio**: 10-15% of frontend_snapshot.txt  
**Purpose**: Strategic navigation system enabling AI to intelligently request and modify frontend code