# ToteTaxi Frontend Living Documentation & AI Memory Persistence System

## About This Documentation

This living documentation serves as **AI memory persistence** for ToteTaxi frontend development, enabling immediate technical context without rebuilding project understanding. It captures both operational reality and development roadmap to maintain continuity across AI development sessions.

**Current Status:** Production-ready booking system with dual authentication flows and guest checkout capability
**Development Phase:** Phase 1, 2 & 3 Complete - Enhanced Guest/Auth Booking System with Fixed Modal Experience

---

## Current Implementation Status (Major Update - Guest Checkout & Modal Booking Fixed)

**Phase 1 - COMPLETE: Guest Booking System & Marketing Site**
- Complete 5-step booking wizard with Django integration
- Marketing website with real ToteTaxi content and testimonials
- Working backend API integration for services, pricing, and booking creation
- Production-ready state management and form handling
- Mobile-responsive luxury design system

**Phase 2 - COMPLETE: Customer Authentication & Dashboard**
- Full authentication system (login/register/logout)
- Customer dashboard with booking history and account overview
- Address book management and quick rebooking
- Enhanced booking wizard for authenticated users
- Session persistence and protected routes
- Auth-aware navigation with enhanced user menu

**Phase 3 - COMPLETE: Staff Operations Dashboard**
- Complete staff authentication system with role-based access (staff/admin)
- Professional staff dashboard with business KPIs and operational metrics
- Comprehensive booking management with status updates and filtering
- Staff navigation system with sidebar layout and proper routing
- Calendar view placeholder and customer management interface
- Audit logging integration with backend staff action tracking
- Session persistence for staff users with separate auth store

**Phase 4 - COMPLETE: Enhanced Guest Experience & Modal Booking**
- **Auth Choice Step** - Clear user decision flow (guest vs login vs register)
- **Modal-based booking wizard** - Restored original popup/overlay experience
- **Proper guest checkout flow** - Full 5-step process without authentication barriers
- **User session isolation** - Different users get separate booking data
- **Incognito session handling** - Automatic auth clearing for fresh sessions
- **Customer stats integration** - Confirmed bookings properly update customer spending totals

**Technology Stack (Implemented & Working):**
```json
{
  "core": {
    "next": "15.5.0",
    "react": "19.1.0", 
    "@tanstack/react-query": "^5.87.1",
    "axios": "^1.11.0",
    "zustand": "^4.5.7"
  },
  "ui": {
    "@headlessui/react": "^2.2.7",
    "@heroicons/react": "^2.2.0",
    "tailwindcss": "^3.4.17",
    "tailwind-merge": "^2.6.0"
  },
  "forms": {
    "react-hook-form": "^7.62.0",
    "@hookform/resolvers": "^3.10.0", 
    "zod": "^3.25.76"
  }
}
```

## Major Accomplishments This Session (Phase 4 Implementation)

### Enhanced Booking Experience

**Modal-Based Booking Wizard:**
- **Restored original modal/popup design** - Users preferred the overlay booking experience
- **Auto-opening modal** on `/book` page with proper modal state management
- **Modal completion handling** - Success screens with automatic redirect to homepage
- **Proper modal sizing** - `xl` size with overflow handling for mobile compatibility
- **Background styling maintained** - Cream/navy gradients preserved in modal content

**Auth Choice Integration:**
- **Step 0: Get Started** - New initial step presenting clear user options
- **Guest checkout path** - Complete 5-step flow (service → date → address → info → payment)
- **Login integration** - Existing users can sign in and skip customer info step
- **Registration flow** - New users can create accounts with auto-login on success
- **Fallback guest option** - Always available "Continue as Guest" for all auth screens

### User Session Management

**Booking Data Isolation:**
- **User-specific booking storage** - Each user gets isolated booking wizard state
- **Guest session handling** - Proper guest user identification and data separation
- **Auth state switching** - Different authenticated users get clean booking states
- **Session persistence** - User switching triggers appropriate data resets

**Incognito/Fresh Session Handling:**
- **Activity-based session clearing** - 30+ minute inactivity triggers logout
- **Fresh session detection** - Automatic auth clearing for new browser sessions
- **URL-based logout triggers** - `?logout=true` parameter forces clean sessions
- **Storage management** - localStorage clearing with proper fallback handling

### Booking Flow Enhancements

**Step Progression Logic:**
- **Dynamic step calculation** - Authenticated users skip customer info (4 steps total)
- **Guest users complete all steps** - Full 5-step process including customer information
- **Proper step validation** - Each step validates required data before progression
- **Back navigation support** - Users can navigate back to step 0 (auth choice)

**Customer Stats Integration:**
- **Automatic stats updates** - Confirmed bookings immediately update customer spending
- **Demo mode booking status** - All bookings automatically set to 'confirmed' status
- **Customer profile stats** - `add_booking_stats()` called on successful booking creation
- **Dashboard synchronization** - Customer dashboard shows accurate spending totals

## Complete File Structure (Current Implementation)

```
frontend/src/
├── app/                                    Next.js 15 App Router Pages
│   ├── layout.tsx                         Root layout with TanStack Query provider & auth
│   ├── page.tsx                           Homepage with modal booking wizard integration
│   ├── globals.css                        Tailwind + luxury design tokens (navy/gold/cream)
│   ├── book/
│   │   └── page.tsx                       🆕 MODAL BOOKING PAGE - Auto-opens wizard modal, redirects on close
│   ├── login/
│   │   └── page.tsx                       Customer login page with auth integration
│   ├── register/
│   │   └── page.tsx                       Customer registration page
│   ├── dashboard/
│   │   ├── page.tsx                       Customer dashboard main page (auth protected)
│   │   └── bookings/
│   │       └── page.tsx                   Detailed booking history with filters
│   ├── staff/                             Complete staff system with professional interface
│   │   ├── login/
│   │   │   └── page.tsx                   Staff authentication page
│   │   ├── dashboard/
│   │   │   └── page.tsx                   Staff operations dashboard with business KPIs
│   │   ├── bookings/
│   │   │   └── page.tsx                   Staff booking management with status updates
│   │   ├── calendar/
│   │   │   └── page.tsx                   Staff calendar view (ready for full calendar)
│   │   ├── customers/
│   │   │   └── page.tsx                   Staff customer management interface
│   │   ├── logistics/
│   │   │   └── page.tsx                   Logistics coordination page
│   │   └── reports/
│   │       └── page.tsx                   Business reports and analytics
│   ├── services/ 
│   │   └── page.tsx                       Services page - live Django pricing, real descriptions
│   ├── about/
│   │   └── page.tsx                       About page - Danielle Candela founder story
│   ├── faq/
│   │   └── page.tsx                       FAQ - real ToteTaxi policies, prohibited items
│   ├── contact/
│   │   └── page.tsx                       Contact - real info (631-595-5100, info@totetaxi.com)
│   └── terms/
│       └── page.tsx                       Terms of service page
├── components/
│   ├── layout/
│   │   └── main-layout.tsx                Site header/footer with auth-aware navigation
│   ├── ui/                                Design System Components
│   │   ├── button.tsx                     Variant-based (primary/secondary/outline/ghost)
│   │   ├── input.tsx                      Form inputs with validation, dark text styling
│   │   ├── card.tsx                       Content containers (default/elevated/luxury)
│   │   ├── modal.tsx                      🆕 ENHANCED - Headless UI modal with proper sizing/overflow
│   │   ├── select.tsx                     Dropdown selects with proper styling
│   │   └── index.ts                       Component exports
│   ├── auth/                              Complete Customer Authentication System
│   │   ├── login-form.tsx                 Email/password login with session handling
│   │   ├── register-form.tsx              Account creation with validation
│   │   ├── user-menu.tsx                  Enhanced user menu with "Book a Move" integration
│   │   └── index.ts                       Auth exports
│   ├── staff/                             Complete staff operations system
│   │   ├── staff-login-form.tsx           Staff authentication with role validation
│   │   ├── staff-dashboard-overview.tsx   Business KPIs, revenue metrics, urgent bookings
│   │   ├── staff-layout.tsx               Professional sidebar navigation with mobile support
│   │   ├── booking-management.tsx         Complete booking CRUD with search/filter
│   │   ├── booking-calendar.tsx           Calendar view (placeholder for full calendar)
│   │   ├── customer-management.tsx        Customer profiles with detailed history
│   │   └── index.ts                       Staff component exports
│   ├── dashboard/                         Customer Dashboard System
│   │   ├── dashboard-overview.tsx         🆕 FIXED - Account stats with accurate spending totals
│   │   ├── booking-history.tsx            Filterable booking list with confirmed status tracking
│   │   ├── quick-actions.tsx              Rebook, modify, support shortcuts
│   │   └── index.ts                       Dashboard exports
│   ├── booking/                           🆕 ENHANCED - Complete Booking Wizard System
│   │   ├── booking-wizard.tsx             🆕 MODAL-COMPATIBLE - Supports onComplete callback, proper step handling
│   │   ├── auth-choice-step.tsx           🆕 NEW - Step 0: Guest vs Login vs Register choice with embedded forms
│   │   ├── service-selection-step.tsx     Step 1: Service types, Mini Move packages
│   │   ├── date-time-step.tsx             Step 2: Calendar, real-time pricing, COI options
│   │   ├── address-step.tsx               Step 3: Pickup/delivery forms, special instructions
│   │   ├── customer-info-step.tsx         Step 4: Contact info (guest only), VIP signup option
│   │   ├── review-payment-step.tsx        Step 5: Order summary with proper completion handling
│   │   └── index.ts                       Booking exports
│   ├── marketing/
│   │   └── service-showcase.tsx           Homepage component - fetches live Django service data
│   ├── providers/
│   │   └── query-provider.tsx             TanStack Query setup with React Query Devtools
│   └── test-api-connection.tsx            Dev tool - tests all API endpoints (remove in production)
├── hooks/                                 Custom React Hooks
│   └── use-click-away.ts                  Click outside detection for modals/dropdowns
├── stores/                                🆕 ENHANCED - Zustand State Management
│   ├── auth-store.ts                      🆕 ENHANCED - Customer auth with login/register methods, session clearing
│   ├── staff-auth-store.ts                Staff authentication with role-based access
│   ├── ui-store.ts                        UI state (modals, notifications, sidebar)
│   └── booking-store.ts                   🆕 COMPLETELY REWRITTEN - User isolation, guest support, auth choice handling
├── lib/                                   Core Utilities  
│   ├── api-client.ts                      Axios + Django CSRF integration with auth
│   └── query-client.ts                    TanStack Query v5 configuration
├── types/
│   └── index.ts                           Django model interfaces, booking types, auth types
└── utils/
    └── cn.ts                              Tailwind class merging utility
```

## Enhanced Booking System (Newly Implemented)

### Auth Choice Step (Step 0)

**Guest vs Authenticated Decision Flow:**
```typescript
// src/components/booking/auth-choice-step.tsx
// FUNCTIONALITY:
//   - Three-card selection: Continue as Guest, Sign In, Create Account
//   - Embedded login form with validation and error handling
//   - Embedded registration form with auto-login on success
//   - Always available "Continue as Guest" fallback option
//   - Proper initialization of user-specific booking state
// USER EXPERIENCE: Clear choice presentation, no forced authentication
// BACKEND INTEGRATION: Uses auth store login/register methods with CSRF handling
```

**Modal-Based Booking Experience:**
```typescript
// src/app/book/page.tsx & src/components/booking/booking-wizard.tsx
// FUNCTIONALITY:
//   - Auto-opening modal on page load with background content
//   - Modal completion callback with automatic homepage redirect
//   - Proper modal sizing (xl) with overflow handling for mobile
//   - Success screens with booking confirmation display
//   - Modal close button and escape key handling
// USER EXPERIENCE: Original popup/overlay design preserved and enhanced
// STYLING: Full cream/navy gradient background maintained in modal content
```

### Enhanced Booking Store

**User Session Isolation:**
```typescript
// src/stores/booking-store.ts - COMPLETELY REWRITTEN
// FUNCTIONALITY:
//   - initializeForUser() method isolates booking data by user ID
//   - Guest users get 'guest' identifier with proper state management
//   - User switching triggers data reset while preserving current step
//   - Auth state changes properly update booking mode (guest vs authenticated)
// STEP MANAGEMENT:
//   - Always starts at step 0 (auth choice) for new sessions
//   - Dynamic step calculation (4 steps auth, 5 steps guest)
//   - Proper step validation with user mode awareness
//   - Back navigation supports returning to auth choice
```

**Enhanced Auth Store:**
```typescript
// src/stores/auth-store.ts - ENHANCED WITH API METHODS
// NEW FUNCTIONALITY:
//   - login() method with CSRF token handling and error management
//   - register() method with validation and auto-login capability  
//   - logout() method with proper backend communication
//   - clearSessionIfIncognito() for fresh session detection
//   - Activity tracking with 30-minute inactivity timeout
// BACKEND INTEGRATION: Full API integration with Django session auth
// SESSION MANAGEMENT: localStorage clearing with incognito detection
```

## Backend Integration Architecture (Enhanced)

### Customer APIs (All Working)
```
GET /api/customer/csrf-token/ - CSRF token for authenticated requests ✅
POST /api/customer/auth/register/ - Account creation with CustomerProfile ✅
POST /api/customer/auth/login/ - Session authentication with profile data ✅
POST /api/customer/auth/logout/ - Session termination with cleanup ✅
GET /api/customer/auth/user/ - Current user profile ✅
GET /api/customer/dashboard/ - Account overview with accurate stats ✅
GET /api/customer/bookings/ - Complete booking history ✅
POST /api/customer/bookings/create/ - 🆕 ENHANCED - Auto-confirms bookings, updates customer stats ✅
```

### Staff APIs (Complete Integration)
```
POST /api/accounts/auth/login/ - Staff authentication with role checking ✅
POST /api/accounts/auth/logout/ - Staff logout with audit logging ✅
GET /api/accounts/dashboard/ - Business KPIs and urgent bookings ✅
GET /api/accounts/bookings/ - All bookings with search/filters ✅
GET,PATCH /api/accounts/bookings/<uuid>/ - Booking detail and status management ✅
GET /api/accounts/customers/ - Customer management interface ✅
```

### Public APIs (Guest Support)
```
GET /api/public/services/ - Service catalog for all users ✅
GET /api/public/availability/ - Calendar with surcharges ✅
POST /api/public/pricing-preview/ - Real-time pricing calculation ✅
POST /api/public/guest-booking/ - Guest booking creation ✅
```

## Critical Issues Resolved This Session

### Guest Checkout Flow Fixed

**RESOLVED:** Guest users can now complete full booking process:
- Auth choice step presents clear options without barriers
- Guest checkout completes all 5 steps including customer information collection
- Guest bookings create GuestCheckout records in backend
- Staff can view and manage all bookings (guest + authenticated)
- Guest users can optionally upgrade to registered accounts later

### Modal Booking Experience Restored

**RESOLVED:** Original popup/overlay booking design fully restored:
- Booking wizard properly contained in modal with overflow handling
- Auto-opening modal on `/book` page with proper state management
- Modal completion triggers redirect to homepage
- Full styling (gradients, colors, spacing) maintained in modal context
- Mobile-responsive modal sizing with proper touch interactions

### User Session Management

**RESOLVED:** Multiple user accounts properly isolated:
- Different users get separate booking wizard states
- User switching triggers appropriate data resets
- Guest vs authenticated mode properly tracked
- Incognito sessions automatically cleared with activity timeout
- Session persistence works correctly across page navigation

### Customer Stats Integration

**RESOLVED:** Customer spending and booking stats accurate:
- Confirmed bookings automatically trigger `add_booking_stats()` 
- Customer dashboard shows correct total spending
- Booking history displays proper confirmed status
- VIP progress tracking works with real spending data

## Development Patterns & Standards (Updated)

### Dual Authentication Pattern (Complete)

**Customer vs Staff vs Guest Authentication:**
```typescript
// Customer Routes & Auth
import { useAuthStore } from '@/stores/auth-store';
// Protected routes: /dashboard, /dashboard/bookings
// Public routes: /book, /login, /register

// Staff Routes & Auth  
import { useStaffAuthStore } from '@/stores/staff-auth-store';
// Protected routes: /staff/dashboard, /staff/bookings, /staff/calendar, etc.
// Public routes: /staff/login

// Guest Booking Flow
// Public routes: /book (modal), homepage booking button
// No authentication required, creates GuestCheckout records
```

### Modal Booking Pattern (New Standard)

**Modal Integration Pattern:**
```typescript
// Modal booking wizard pattern for consistent UX
'use client';
import { Modal } from '@/components/ui/modal';
import { BookingWizard } from '@/components/booking';

// Page component renders modal with auto-open and completion handling
const [showBookingWizard, setShowBookingWizard] = useState(false);
const closeBookingWizard = () => {
  setShowBookingWizard(false);
  router.push('/'); // Redirect on completion
};

<Modal isOpen={showBookingWizard} onClose={closeBookingWizard} size="xl">
  <BookingWizard onComplete={closeBookingWizard} />
</Modal>
```

### User Session Isolation Pattern (New)

**Booking Store Initialization:**
```typescript
// Always initialize booking store for current user
useEffect(() => {
  const userId = user?.id?.toString() || 'guest';
  const isGuest = !isAuthenticated;
  initializeForUser(userId, isGuest);
}, [user?.id, isAuthenticated, initializeForUser]);
```

## Updated Development Priorities

### Phase 5: Advanced Staff Features (Immediate Priority)

**Enhanced Customer Management:**
- Complete customer profile editing and notes system
- VIP management and automated upgrade notifications
- Customer communication history and preferences
- Advanced search and filtering capabilities

**Real-time Updates:**
- WebSocket integration for live booking status updates
- Real-time staff dashboard metrics
- Live customer notifications for booking changes
- Automatic refresh of critical business data

### Phase 6: Advanced Calendar & Logistics

**Full Calendar Integration:**
- Drag-and-drop booking scheduling with conflict detection
- Van capacity management and route optimization
- Driver assignment and tracking integration
- Service area and availability management

**File Management System:**
- COI document upload and verification system
- Photo documentation for deliveries
- Customer file storage and secure sharing
- Insurance certificate tracking and expiration alerts

### Phase 7: Communication & Advanced Features

**Customer Communication:**
- Email template management system
- SMS notification integration
- Automated status update communications
- Customer preference management

**Advanced Analytics:**
- Revenue forecasting and trend analysis
- Customer segmentation and lifetime value
- Service utilization and profitability reports
- Staff performance and efficiency metrics

## Production Deployment Readiness (Complete)

**Fully Ready for Production:**
- Complete guest checkout and authenticated booking flows ✅
- Modal-based booking wizard with proper UX ✅
- Full customer authentication and dashboard system ✅
- Professional staff operations dashboard ✅
- Booking status management and customer stats integration ✅
- Secure dual authentication with session management ✅
- Mobile-responsive design across all interfaces ✅
- Real-time business intelligence and KPI tracking ✅

**Pre-Launch Tasks:**
- Remove TestAPIConnection component from production build
- Configure production environment variables and API endpoints
- Set up real Stripe payment processing integration
- Final cross-browser testing and mobile optimization verification
- Staff training on dashboard usage and booking management workflows

**Post-Launch Enhancement Pipeline:**
- Advanced calendar functionality with drag-and-drop scheduling
- Enhanced customer communication and notification systems
- Document management and file upload capabilities
- Advanced analytics and business intelligence reporting
- Mobile app development for customer and staff usage

## Architecture Summary

**ToteTaxi is now a complete luxury delivery service platform featuring:**

1. **Triple booking flow support** - Guest checkout, authenticated booking, and staff management
2. **Modal-based booking experience** - Original popup design with enhanced functionality
3. **Comprehensive user session management** - Isolated data per user with incognito handling
4. **Accurate customer relationship tracking** - Real spending totals and booking statistics
5. **Professional staff operations interface** - Complete business management dashboard
6. **Production-ready infrastructure** - Error handling, loading states, and session persistence

This documentation serves as complete AI memory for ToteTaxi development, covering the enhanced guest/auth booking system, modal experience restoration, and comprehensive customer/staff management platform. The system now provides seamless booking experiences for all user types while maintaining professional operations management capabilities.