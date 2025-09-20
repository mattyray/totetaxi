Here's the updated Frontend Living Documentation with all the changes from this chat session:

```markdown
# ToteTaxi Frontend Living Documentation & AI Memory Persistence System

## About This Documentation

This living documentation serves as **AI memory persistence** for ToteTaxi frontend development, enabling immediate technical context without rebuilding project understanding. It captures both operational reality and development roadmap to maintain continuity across AI development sessions.

**Current Status:** Production-ready booking system with morning-only pickup times and complete pricing integration
**Development Phase:** Phase 1, 2, 3 & 4 Complete - Enhanced Guest/Auth Booking System with Morning-Only Scheduling

---

## Current Implementation Status (Major Update - Morning-Only Pickup & Pricing Engine)

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

**Phase 5 - COMPLETE: Morning-Only Pickup Times & Advanced Pricing**
- **🆕 Morning-only scheduling** - Removed afternoon/evening pickup times per business requirements
- **🆕 1-hour time windows** - Standard/Full packages offer specific hour selection (8-10 AM)
- **🆕 No time preference option** - Petite packages include flexible scheduling
- **🆕 Time window surcharges** - Standard packages: +$25, Full packages: free
- **🆕 Complete pricing engine** - Real Tote Taxi pricing with all services populated
- **🆕 Package type tracking** - Proper service tier identification for UI logic

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

## Major Accomplishments This Session (Phase 5 Implementation)

### Morning-Only Pickup Time System

**Updated Pickup Time Options:**
- **Removed:** `'afternoon'` (12-3 PM), `'evening'` (4-7 PM) - no longer offered per business decision
- **Updated:** `'morning'` (8-11 AM) - standard 3-hour window for all packages
- **Added:** `'morning_specific'` - 1-hour window selection (8 AM, 9 AM, or 10 AM)
- **Added:** `'no_time_preference'` - flexible scheduling for Petite packages only

**Package-Specific Time Features:**
```typescript
// Petite Package: No premium time options, includes flexible scheduling
'morning' (8-11 AM) | 'no_time_preference' (coordinate with customer)

// Standard Package: 1-hour window available with $25 surcharge
'morning' (8-11 AM) | 'morning_specific' (8-9 AM, 9-10 AM, or 10-11 AM) +$25

// Full Package: 1-hour window included free
'morning' (8-11 AM) | 'morning_specific' (8-9 AM, 9-10 AM, or 10-11 AM) FREE
```

### Complete Service Catalog Integration

**Real Tote Taxi Pricing (All Services Populated):**

**Mini Move Packages:**
- **Petite:** $995 - 15 items, shared van, COI +$50, no time preference option
- **Standard:** $1,725 - 30 items, COI included, priority scheduling, 1-hour window +$25 (MOST POPULAR)
- **Full Move:** $2,490 - Unlimited items, van exclusive, COI included, 1-hour window FREE

**Professional Organizing Services:**
- **Petite Packing:** $1,400 (4 hrs, 2 organizers, $250 supplies)
- **Standard Packing:** $2,535 (8 hrs, 2 organizers, $250 supplies)
- **Full Packing:** $5,070 (8 hrs, 4 organizers, $500 supplies)
- **Petite Unpacking:** $1,130 (4 hrs, 2 organizers, organizing only)
- **Standard Unpacking:** $2,265 (8 hrs, 2 organizers, organizing only)
- **Full Unpacking:** $4,525 (8 hrs, 4 organizers, organizing only)
- **NYC Tax:** 8.25% applied to all organizing services

**Standard Delivery:**
- $95 per item, $285 minimum charge, $360 same-day flat rate

**Specialty Items:**
- Crib: $350, Surfboard: $350, Peloton: $500, Wardrobe Box: $275

**Geographic Surcharges:**
- CT/NJ Distance: +$220
- Amagansett/Montauk: +$120

### Enhanced Date/Time Selection Component

**Complete Rewrite of DateTimeStep:**
```typescript
// src/components/booking/date-time-step.tsx - COMPLETELY REWRITTEN
// FUNCTIONALITY:
//   - Morning-only time slot selection with package-aware options
//   - 1-hour window selection grid for Standard/Full packages
//   - No time preference option for Petite packages only
//   - Specific hour tracking (8, 9, or 10 AM) for precise scheduling
//   - Real-time pricing updates with time window surcharge calculation
//   - Package type validation before pricing API calls
// BUSINESS LOGIC:
//   - Only calls pricing API when package is selected
//   - Displays appropriate time options based on package tier
//   - Shows surcharge information (+$25 or FREE) for time windows
//   - Validates required data before enabling continue button
// USER EXPERIENCE: Clear time selection with pricing transparency
```

### Updated Type System

**Enhanced Booking Types:**
```typescript
// src/types/index.ts - UPDATED PICKUP TIME TYPES
export interface BookingData {
  // ... existing fields
  pickup_time?: 'morning' | 'morning_specific' | 'no_time_preference';
  specific_pickup_hour?: number; // 8, 9, or 10 for 1-hour windows
  package_type?: 'petite' | 'standard' | 'full'; // For UI logic
  pricing_data?: {
    base_price_dollars: number;
    surcharge_dollars: number;
    coi_fee_dollars: number;
    organizing_total_dollars: number;
    organizing_tax_dollars: number;
    geographic_surcharge_dollars: number;
    time_window_surcharge_dollars: number; // NEW: +$25 for Standard
    total_price_dollars: number;
  };
}
```

### Service Selection Enhancement

**Package Type Tracking:**
```typescript
// src/components/booking/service-selection-step.tsx - ENHANCED
// ADDED: package_type assignment on Mini Move selection
const handleMiniMoveSelect = (packageId: string) => {
  const selectedPackage = services?.mini_move_packages.find(pkg => pkg.id === packageId);
  updateBookingData({
    service_type: 'mini_move',
    mini_move_package_id: packageId,
    package_type: selectedPackage?.package_type, // NEW: Track tier for UI
    standard_delivery_item_count: undefined,
    specialty_item_ids: undefined,
  });
};
```

### Review & Payment Display

**Pickup Time Display Logic:**
```typescript
// src/components/booking/review-payment-step.tsx - UPDATED
// ADDED: Helper function for time display
function getTimeDisplay(pickupTime: string | undefined, specificHour?: number) {
  switch (pickupTime) {
    case 'morning':
      return '8:00 AM - 11:00 AM';
    case 'morning_specific':
      return specificHour ? `${specificHour}:00 AM - ${specificHour + 1}:00 AM` : '8:00 AM - 11:00 AM';
    case 'no_time_preference':
      return 'Flexible timing - we\'ll coordinate with you';
    default:
      return '8:00 AM - 11:00 AM';
  }
}
// REMOVED: All references to afternoon/evening times
```

## Complete File Structure (Current Implementation)

```
frontend/src/
├── app/                                    Next.js 15 App Router Pages
│   ├── layout.tsx                         Root layout with TanStack Query provider & auth
│   ├── page.tsx                           Homepage with modal booking wizard integration
│   ├── globals.css                        Tailwind + luxury design tokens (navy/gold/cream)
│   ├── book/
│   │   └── page.tsx                       MODAL BOOKING PAGE - Auto-opens wizard modal, redirects on close
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
│   │   ├── modal.tsx                      ENHANCED - Headless UI modal with proper sizing/overflow
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
│   │   ├── dashboard-overview.tsx         Account stats with accurate spending totals
│   │   ├── booking-history.tsx            Filterable booking list with confirmed status tracking
│   │   ├── quick-actions.tsx              Rebook, modify, support shortcuts
│   │   └── index.ts                       Dashboard exports
│   ├── booking/                           🆕 ENHANCED - Complete Booking Wizard System
│   │   ├── booking-wizard.tsx             MODAL-COMPATIBLE - Supports onComplete callback, proper step handling
│   │   ├── auth-choice-step.tsx           Step 0: Guest vs Login vs Register choice with embedded forms
│   │   ├── service-selection-step.tsx     🆕 UPDATED - Step 1: Sets package_type for UI logic
│   │   ├── date-time-step.tsx             🆕 COMPLETELY REWRITTEN - Step 2: Morning-only times with 1-hour windows
│   │   ├── address-step.tsx               Step 3: Pickup/delivery forms, special instructions
│   │   ├── customer-info-step.tsx         Step 4: Contact info (guest only), VIP signup option
│   │   ├── review-payment-step.tsx        🆕 UPDATED - Step 5: Fixed time display for new pickup options
│   │   └── index.ts                       Booking exports
│   ├── marketing/
│   │   └── service-showcase.tsx           Homepage component - fetches live Django service data
│   ├── providers/
│   │   └── query-provider.tsx             TanStack Query setup with React Query Devtools
│   └── test-api-connection.tsx            Dev tool - tests all API endpoints (remove in production)
├── hooks/                                 Custom React Hooks
│   └── use-click-away.ts                  Click outside detection for modals/dropdowns
├── stores/                                Zustand State Management
│   ├── auth-store.ts                      Customer auth with login/register methods, session clearing
│   ├── staff-auth-store.ts                Staff authentication with role-based access
│   ├── ui-store.ts                        UI state (modals, notifications, sidebar)
│   └── booking-store.ts                   🆕 UPDATED - User isolation with new pickup time fields
├── lib/                                   Core Utilities  
│   ├── api-client.ts                      Axios + Django CSRF integration with auth
│   └── query-client.ts                    TanStack Query v5 configuration
├── types/
│   └── index.ts                           🆕 UPDATED - New pickup time types, package_type field
└── utils/
    └── cn.ts                              Tailwind class merging utility
```

## Enhanced Booking System (Latest Updates)

### Morning-Only Scheduling Logic

**Package-Aware Time Selection:**
```typescript
// Date/Time Step - Package-specific options
const getPackageType = () => {
  if (bookingData.service_type !== 'mini_move' || !bookingData.mini_move_package_id) {
    return null;
  }
  return bookingData.package_type; // 'petite' | 'standard' | 'full'
};

const packageType = getPackageType();

// Render appropriate time options:
// - All packages: Morning (8-11 AM) standard option
// - Petite only: No time preference (flexible)
// - Standard/Full only: 1-hour specific windows (8, 9, or 10 AM)
```

**Pricing Integration:**
```typescript
// Pricing API includes time window surcharge
const pricingMutation = useMutation({
  mutationFn: async (): Promise<PricingPreview> => {
    const response = await apiClient.post('/api/public/pricing-preview/', {
      // ... other fields
      pickup_time: selectedTime, // 'morning' | 'morning_specific' | 'no_time_preference'
      specific_pickup_hour: selectedTime === 'morning_specific' ? specificHour : undefined,
    });
    return response.data;
  }
});

// Backend calculates surcharge:
// - Standard + morning_specific: +$25
// - Full + morning_specific: $0 (included free)
// - Petite + no_time_preference: $0 (no premium option)
```

### Booking Store Updates

**New Fields Added:**
```typescript
// src/stores/booking-store.ts
export interface BookingData {
  // ... existing fields
  pickup_time?: 'morning' | 'morning_specific' | 'no_time_preference';
  specific_pickup_hour?: number; // 8, 9, or 10
  package_type?: 'petite' | 'standard' | 'full';
  pricing_data?: {
    // ... existing pricing fields
    time_window_surcharge_dollars: number; // NEW
  };
}

const initialBookingData: BookingData = {
  // ...
  pickup_time: 'morning', // Default to standard morning window
  // ...
};
```

## Backend Integration Architecture (Updated)

### Public APIs (Enhanced Pricing)
```
GET /api/public/services/ - Complete service catalog with all pricing ✅
GET /api/public/availability/ - Calendar with surcharges ✅
POST /api/public/pricing-preview/ - Real-time pricing with time window surcharges ✅
  Request: {
    pickup_time: 'morning' | 'morning_specific' | 'no_time_preference',
    specific_pickup_hour?: 8 | 9 | 10
  }
  Response: {
    pricing: {
      base_price_dollars: number,
      time_window_surcharge_dollars: number, // NEW
      total_price_dollars: number,
      // ... other fields
    }
  }
POST /api/public/guest-booking/ - Guest booking with new time fields ✅
```

### Customer APIs (Updated)
```
POST /api/customer/bookings/create/ - Authenticated booking with new time options ✅
  Accepts: pickup_time, specific_pickup_hour fields
  Updates: Customer stats, creates confirmed booking
```

## Critical Issues Resolved This Session

### Pricing Engine Integration

**RESOLVED:** Complete pricing integration with real Tote Taxi data:
- All Mini Move packages created with correct pricing ($995, $1,725, $2,490)
- Organizing services populated with NYC tax calculation (8.25%)
- Standard delivery and specialty items configured
- Geographic surcharges implemented (CT/NJ, Amagansett/Montauk)
- Time window surcharges calculated correctly (+$25 Standard, FREE Full)

### Morning-Only Scheduling Implementation

**RESOLVED:** Complete removal of afternoon/evening times:
- Updated all TypeScript types to new pickup time options
- Rewrote DateTimeStep component for morning-only selection
- Implemented package-specific time features (1-hour windows, no preference)
- Fixed all display logic in review/confirmation screens
- Backend migration applied to update existing bookings

### Service Selection Package Tracking

**RESOLVED:** Proper package tier identification for UI logic:
- Service selection now sets `package_type` field when package selected
- Date/time step uses package type to show appropriate options
- Time window surcharges calculated based on package tier
- All components properly validate package selection before pricing

## Development Patterns & Standards (Updated)

### Pickup Time Selection Pattern (New Standard)

**Package-Aware Time Options:**
```typescript
// Conditional rendering based on package type
{packageType === 'petite' && (
  <button onClick={() => handleTimeSelect('no_time_preference')}>
    No Time Preference - Flexible timing
  </button>
)}

{(packageType === 'standard' || packageType === 'full') && (
  <div>
    <button onClick={() => handleTimeSelect('morning_specific')}>
      Specific 1-Hour Window
      {packageType === 'standard' && <span>(+$25)</span>}
      {packageType === 'full' && <span>(Free)</span>}
    </button>
    {selectedTime === 'morning_specific' && (
      <div className="grid grid-cols-3 gap-2">
        {[8, 9, 10].map((hour) => (
          <button onClick={() => handleSpecificHourSelect(hour)}>
            {hour}:00 - {hour + 1}:00 AM
          </button>
        ))}
      </div>
    )}
  </div>
)}
```

### Pricing Calculation Pattern (Enhanced)

**Complete Pricing Integration:**
```typescript
// Always validate required data before pricing call
useEffect(() => {
  if (selectedDate && bookingData.service_type) {
    // For mini_move, ensure we have package_id
    if (bookingData.service_type === 'mini_move' && !bookingData.mini_move_package_id) {
      return;
    }
    // For other services, validate appropriately
    pricingMutation.mutate();
  }
}, [selectedDate, selectedTime, specificHour, bookingData.mini_move_package_id]);

// Backend returns complete pricing breakdown
const pricing = {
  base_price_dollars: 995,
  coi_fee_dollars: 50,
  organizing_total_dollars: 1400,
  organizing_tax_dollars: 115.50,
  time_window_surcharge_dollars: 25, // Standard package 1-hour window
  total_price_dollars: 2585.50
};
```

## Updated Development Priorities

### Phase 6: Advanced Calendar & Logistics (Immediate Priority)

**Full Calendar Integration:**
- Drag-and-drop booking scheduling with morning-only time slots
- Van capacity management and route optimization
- Driver assignment with 1-hour window coordination
- Service area and availability management with time slot blocking

**Enhanced Scheduling Features:**
- Real-time availability checking for 1-hour windows
- Automatic conflict detection for specific time slots
- Driver workload balancing with time window assignments
- Route optimization considering pickup time windows

### Phase 7: Communication & Advanced Features

**Customer Communication:**
- Automated confirmation emails with specific pickup times
- SMS notifications for 1-hour window reminders
- Morning-of confirmation calls for time-specific bookings
- Customer preference management for flexible scheduling

**Advanced Analytics:**
- Time slot utilization analysis (8 AM vs 9 AM vs 10 AM popularity)
- Premium pricing effectiveness (1-hour window uptake)
- Package tier distribution and revenue optimization
- Customer preference patterns (flexible vs specific timing)

## Production Deployment Readiness (Complete)

**Fully Ready for Production:**
- Complete morning-only pickup time implementation ✅
- Real Tote Taxi pricing across all services ✅
- Package-specific time window features ✅
- Time window surcharge calculation ✅
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
- Staff training on dashboard usage, new time windows, and booking management workflows

**Post-Launch Enhancement Pipeline:**
- Advanced calendar functionality with morning time slot management
- Enhanced customer communication for 1-hour window coordination
- Document management and file upload capabilities
- Advanced analytics for time slot optimization
- Mobile app development with time window push notifications

## Architecture Summary

**ToteTaxi is now a complete luxury delivery service platform featuring:**

1. **Morning-only scheduling system** - Business-aligned pickup times with premium options
2. **Package-tiered time windows** - 1-hour precision for Standard/Full, flexibility for Petite
3. **Complete pricing integration** - Real Tote Taxi rates with accurate surcharge calculation
4. **Triple booking flow support** - Guest checkout, authenticated booking, and staff management
5. **Modal-based booking experience** - Original popup design with enhanced functionality
6. **Comprehensive user session management** - Isolated data per user with incognito handling
7. **Accurate customer relationship tracking** - Real spending totals and booking statistics
8. **Professional staff operations interface** - Complete business management dashboard
9. **Production-ready infrastructure** - Error handling, loading states, and session persistence

This documentation serves as complete AI memory for ToteTaxi development, covering the morning-only scheduling implementation, complete pricing engine integration, and comprehensive customer/staff management platform. The system now provides seamless booking experiences with business-aligned scheduling while maintaining professional operations management capabilities.
```

The key additions reflect:
1. Morning-only pickup time system
2. Package-specific time window features
3. Complete pricing integration with real Tote Taxi data
4. Updated TypeScript types and component logic
5. Enhanced service selection with package type tracking
6. All file changes and their purposes