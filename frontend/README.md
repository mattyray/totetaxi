UPDATED - ToteTaxi Frontend Living Documentation & RoadmapStrategic Technical Architecture - Next.js 14 + TypeScript + Tailwind CSSSystem Architecture OverviewToteTaxi Frontend Ecosystem
├── Marketing Site (SSR for SEO)
│   ├── Brand positioning & service education
│   ├── SEO optimization & lead capture
│   └── Trust building & conversion focus
├── Booking Wizard (Client-Side SPA)
│   ├── Dual-mode: Guest checkout + authenticated booking
│   ├── Real-time pricing & availability
│   ├── Form management & validation
│   └── Stripe payment integration
├── Customer Dashboard (Customer Portal) (NEW)
│   ├── Authentication (login/signup)
│   ├── Booking history & live tracking
│   ├── Profile management & saved addresses
│   └── Payment methods & account settings
├── Admin Dashboard (Staff Interface)
│   ├── Booking management & operations
│   ├── Customer service & support
│   ├── Financial operations & reporting
│   └── Role-based access control
├── Design System (BLADE-Inspired)
│   ├── Luxury brand aesthetics
│   ├── Mobile-first responsive design
│   └── Accessibility compliance
└── Infrastructure Layer
    ├── Next.js 14 App Router
    ├── TypeScript & Zod validation
    ├── Zustand state management
    └── API integration with Django backendBackend Integration Points:

Customer Flow: React → customers + bookings + services + payments APIs
Customer Dashboard: React → customers + bookings APIs for self-service
Admin Operations: React → crm + all backend app APIs
Real-time Updates: WebSocket connections for live status
File Management: S3 direct uploads with presigned URLs
Core Frontend Applications🏠 Marketing Site - Luxury Positioning & SEOPrimary Responsibility: Convert high-value visitors into booking conversions through premium positioningBusiness Logic Ownership:

Brand positioning that conveys luxury and reliability
Service education for complex offerings (Mini Moves, Specialty Items)
Trust building through testimonials and partnership displays
SEO optimization for organic traffic acquisition
Lead capture and conversion funnel management
NEW: Clear pathways to both guest checkout and customer account creation
Core Page Architecture:

Homepage: Hero positioning, service overview, trust indicators, conversion CTAs
Services: Deep-dive into Mini Moves, Standard Delivery, Specialty Items with pricing transparency
How It Works: Process explanation to build confidence in service reliability
About/Partners: Brand credibility through Blade partnership, press coverage
FAQ/Legal: Address common concerns, terms, privacy policy
Login/Signup: Customer authentication entry points
Frontend Integration Needs:

Service Data: Real-time pricing displays from services API
Booking CTAs: Seamless handoff to booking wizard with service pre-selection
Authentication CTAs: Clear paths to customer login/signup
Trust Signals: Dynamic testimonial rotation, real booking count displays
Performance: SSR for SEO, fast loading for luxury customer expectations
User Journey Optimization:

Guest users: Direct path to booking wizard
Returning customers: Clear login prompts with benefits (saved addresses, payment methods)
New customers: Gentle signup encouragement with value proposition
Mobile experience: 70% of luxury customers browse on mobile
Key External Relationships:

→ Booking Wizard: Primary conversion path from all CTAs
→ Customer Dashboard: Login/signup flows
← Backend Services API: Displays current pricing, availability windows
← Backend Bookings API: Shows real booking volume, service popularity
SEO Tools: Google Analytics, Search Console, structured data
Performance: Next.js optimization, Netlify CDN
MVP Simplifications:

Static testimonials (no dynamic rotation initially)
Manual content updates (no CMS integration)
Basic contact forms (no complex lead scoring)
Simple login/signup forms (no social authentication)
📝 Booking Wizard - Dual-Mode Conversion OptimizationPrimary Responsibility: Guide customers through complex service selection with minimal friction while supporting both guest and authenticated booking flowsBusiness Logic Ownership:

Dual-mode operation: Seamless experience for guest checkout AND logged-in customers
Service selection flow optimized for customer understanding
Dynamic pricing calculation with real-time backend integration
Multi-step form management with progress persistence
Smart pre-filling: Use customer profile data for authenticated users
Address validation and reuse for returning customers
Payment processing with Stripe Elements integration (including saved payment methods)
Booking confirmation and tracking handoff
Core Wizard Flow:

Authentication Check: Detect if user is logged in, offer login benefits
Service Selection: Guide between Mini Move packages, Standard Delivery, Specialty Items
Calendar & Availability: Date selection with surcharge indicators, van availability constraints
Details Collection: Address input (pre-filled for customers), customer information, special requirements, COI toggle
Review & Pricing: Final price breakdown with transparent surcharge explanation
Payment: Stripe checkout with saved payment methods for customers, option to save for guests
Confirmation: Booking details, tracking information, next steps
Dual-Mode Experience Design:Guest Checkout Flow:

Clean, simple form experience
Option to "create account to save time next time"
All information collected step-by-step
Option to save payment method (creates customer account)
Authenticated Customer Flow:

Welcome message with customer name
Pre-filled addresses from saved addresses
Saved payment methods available
Streamlined checkout experience
One-click address and payment selection
Frontend Integration Needs:

Authentication State: Check if customer is logged in, show appropriate UI
Customer Profile Data: Pre-fill forms with saved addresses and preferences
Real-time Pricing: Dynamic price updates as options change via services API
Availability Checking: Calendar integration showing available dates and surcharges
Booking Creation: Submit complete booking data to bookings API (guest + authenticated)
Payment Processing: Stripe PaymentIntent creation with saved payment method options
Status Updates: Real-time booking status via WebSocket or polling
State Management Strategy:

Zustand store for wizard state persistence
Customer authentication state integration
Form validation with Zod schemas
Local storage backup for browser refresh recovery (respects authentication state)
Progress tracking and step validation
Error state management and recovery flows
User Experience Patterns:

Mobile-first thumb-friendly navigation
Smart suggestions: "Use home address" for returning customers
Progress indicators and step completion feedback
Contextual help and pricing explanations
Authentication prompts: Strategic login suggestions at optimal moments
Graceful error handling with clear recovery paths
Accessibility compliance throughout flow
Key External Relationships:

← Marketing Site: Entry point with service pre-selection
← Customer Dashboard: Authenticated entry point for existing customers
→ Backend Services API: Pricing calculations, availability data
→ Backend Customers API: Customer profile data, saved addresses
→ Backend Bookings API: Booking creation, validation, confirmation
→ Stripe API: Payment processing and webhook handling
State Persistence: Local storage, session recovery
MVP Simplifications:

Linear wizard flow (no step jumping initially)
Basic address autocomplete (no Google Places API)
Simple authentication prompts (no sophisticated nudging)
Basic saved payment method handling
👤 Customer Dashboard - Self-Service Portal (NEW)Primary Responsibility: Comprehensive customer self-service interface for booking management, profile control, and account settingsBusiness Logic Ownership:

Customer authentication and session management
Complete booking history and status tracking
Profile management and preferences
Saved addresses and payment methods management
Account settings and notification preferences (future)
Self-service capabilities to reduce support burden
Dashboard Architecture:

Account Overview: Welcome dashboard with key stats and recent activity
Booking History: Comprehensive list with search, filter, and tracking capabilities
Active Bookings: Live tracking of current deliveries with real-time updates
Address Book: Manage saved pickup/delivery locations with easy editing
Payment Methods: Stripe-powered payment method management
Profile Settings: Update contact information, preferences, password
Support Center: Help articles, contact options, booking-specific support
Customer Experience Features:Dashboard Homepage:

Welcome message with customer name
Overview of recent bookings and account activity
Quick actions (book again, track delivery, update profile)
Booking statistics (total bookings, frequent routes)
Booking Management:

Booking History: Searchable list with status, dates, and amounts
Booking Details: Deep-dive view with all booking information
Live Tracking: Real-time delivery status for active bookings
Booking Actions: Reschedule (if applicable), contact support, download receipts
Profile Management:

Personal Information: Name, email, phone with validation
Address Book: Add, edit, delete frequently used addresses
Payment Methods: Add, remove, set default payment methods via Stripe
Account Security: Change password, session management
Frontend Integration Needs:

Authentication: Customer login state management and session handling
Booking APIs: Fetch customer booking history and details
Profile APIs: Customer information management and updates
Address APIs: CRUD operations for customer saved addresses
Payment APIs: Stripe customer and payment method management
Real-time Updates: Live booking status via WebSocket integration
Mobile Optimization: Full responsive design for mobile usage
Dashboard Workflows:

New Customer Setup: Guided first-time experience
Repeat Booking: Quick rebooking from previous booking details
Address Management: Easy adding/editing of frequent locations
Payment Method Updates: Secure card management through Stripe
Support Integration: Direct access to help and booking-specific support
Security & Privacy:

Data Protection: Customers can only access their own bookings and data
Session Security: Proper session timeout and security measures
Payment Security: PCI compliance through Stripe integration
Privacy Controls: Clear data usage and privacy settings
Key External Relationships:

← Customer Authentication: Secure login required for all dashboard features
→ Backend Customers API: Profile management and customer data
→ Backend Bookings API: Customer booking history and status
← Booking Wizard: Authenticated booking entry point from dashboard
→ Stripe API: Payment method management and billing
← Admin Dashboard: Staff can view customer accounts for support
Real-time: WebSocket updates for live booking tracking
MVP Simplifications:

Basic booking history list (no advanced filtering initially)
Simple address book (no address validation)
Basic payment method management via Stripe
No advanced notification preferences
No loyalty/rewards features
Basic support integration (contact forms)
🎨 Design System - BLADE-Inspired Luxury InterfacePrimary Responsibility: Consistent premium UI that reinforces luxury positioning across all customer touchpointsBusiness Logic Ownership:

Visual identity that conveys trust and premium service quality
Component library ensuring consistent user experience
Mobile-first responsive design for luxury mobile users
Accessibility compliance for inclusive experience
Performance optimization with minimal bundle impact
Developer experience with well-typed, documented components
Core Design Principles:

Luxury Aesthetics: BLADE-inspired sophistication with warm grays, premium blues
Trust Indicators: Subtle shadows, smooth transitions, polished interactions
Mobile Excellence: Touch-friendly sizing, thumb-zone optimization
Information Hierarchy: Clear pricing displays, status indicators, progress feedback
Accessibility: WCAG 2.1 AA compliance, keyboard navigation, screen reader support
Authentication States: Clear visual distinction between guest and authenticated experiences
Component Architecture:

Base Components: Button variants, Input fields, Cards, Modal overlays
Booking Components: Service cards, Calendar picker, Price displays, Progress indicators
Customer Components: Dashboard widgets, Profile forms, Booking history cards, Address forms (NEW)
Authentication Components: Login forms, Signup flows, Password reset, Session management (NEW)
Admin Components: Data tables, Action menus, Status badges, Dashboard widgets
Layout Components: Responsive containers, Navigation, Headers, Footers
Authentication UI Patterns:

Guest State: Clean, minimal UI focused on conversion
Authenticated State: Personalized UI with customer name, saved data, quick actions
Login Prompts: Strategic, non-intrusive authentication encouragement
Account Management: Professional, trustworthy UI for sensitive operations
Customer Dashboard Patterns:

Information Density: Balanced information display without overwhelming
Action Hierarchy: Primary actions prominent, secondary actions accessible
Status Communication: Clear booking status with appropriate visual indicators
Data Entry: Streamlined forms with validation and helpful feedback
Frontend Integration Needs:

Theming: Design tokens integrated with Tailwind CSS configuration
Icons: Consistent icon library (Heroicons) with semantic usage
Typography: Inter font family for readability and premium feel
Animation: Subtle micro-interactions for luxury feel without distraction
Responsive: Breakpoint system aligned with customer device usage
Authentication States: Components that adapt to guest vs authenticated states
Performance Considerations:

Tree-shakable component exports
CSS-in-JS avoided for bundle size
Optimized asset loading
Minimal runtime overhead
Component lazy loading where appropriate
Authentication state management efficiency
Key External Relationships:

→ All Frontend Sections: Provides UI foundation for entire application
Tailwind Configuration: Synced design tokens and utility classes
Accessibility Tools: Screen reader testing, keyboard navigation
Brand Guidelines: Consistent with ToteTaxi luxury positioning
MVP Simplifications:

Core component set only (no advanced interactions)
Basic responsive patterns (complex layouts later)
Essential accessibility features (full audit later)
Simple authentication state management (no advanced personalization)
🔗 API Integration Layer - Backend CommunicationPrimary Responsibility: Type-safe, reliable communication with Django backend across all frontend operationsBusiness Logic Ownership:

HTTP client configuration with authentication and error handling
Dual authentication handling: Customer authentication + staff authentication
TypeScript type safety for all API communications
Request/response transformation between frontend and backend formats
Caching strategy for pricing, availability, and customer data
Error handling with user-friendly messaging and retry logic
Authentication token management for both customer and staff users
Integration Architecture:

Customer Booking Flow: Customers API for auth, Services API for pricing, Bookings API for creation, Payments API for processing
Customer Dashboard: Customers API for profile management, Bookings API for history
Admin Dashboard: CRM API for operations, all backend apps for management functions
Real-time Updates: WebSocket integration for live booking status (both customer and admin)
File Operations: S3 direct upload with presigned URL patterns
Error Recovery: Automatic retries, graceful degradation, offline resilience
Authentication Strategy:

Customer Authentication: Session-based authentication for customer dashboard
Staff Authentication: Separate session-based authentication for admin
Guest Operations: Unauthenticated API access for guest checkout
Token Management: Automatic token refresh and session handling
Security: Proper isolation between customer and staff authentication
Type Safety Strategy:

Comprehensive TypeScript interfaces for all API responses
Customer-specific types: CustomerProfile, SavedAddress, CustomerBooking
Zod schemas for runtime validation and transformation
Generated types from OpenAPI documentation (future)
Consistent error type definitions across application
Type-safe state management integration
Performance Optimization:

Request deduplication for frequent operations
Intelligent caching for pricing, availability, and customer profile data
Background prefetching for likely user actions
Customer data caching strategy (addresses, payment methods)
Request/response compression
Connection pooling and keep-alive
Frontend Integration Needs:

React Hooks: Custom hooks for common API patterns (useBooking, usePricing, useCustomer, useAuth)
State Integration: Seamless Zustand store updates from API responses
Error Boundaries: Application-level error handling and recovery
Loading States: Consistent loading UI patterns across application
Retry Logic: User-controlled retry for failed operations
Authentication Hooks: Customer login state, profile management
Key External Relationships:

← All Frontend Sections: Primary communication layer for backend data
→ Django Backend: All HTTP/WebSocket communication flows through this layer
State Management: Updates Zustand stores with API response data
Authentication: Handles both customer and staff authentication flows
Customer Profile: Manages customer data synchronization
MVP Simplifications:

Basic retry logic (exponential backoff later)
Simple caching strategy (advanced cache invalidation later)
Essential error handling (comprehensive error taxonomy later)
Basic customer profile synchronization
⚙️ Admin Dashboard - Staff Operations InterfacePrimary Responsibility: Comprehensive staff interface for all ToteTaxi operational management and customer serviceBusiness Logic Ownership:

Complete booking lifecycle management for staff operations
Customer account management: View customer profiles, booking patterns, account support
Customer service interface with full booking history access
Financial operations including refund processing and revenue tracking
Operational task management (COI uploads, Onfleet coordination)
Reporting and analytics for business intelligence
Role-based access control for different staff permission levels
Dashboard Architecture:

Operations Overview: Real-time KPIs, upcoming bookings, pending actions dashboard
Booking Management: Comprehensive table with search, filter, and bulk action capabilities
Customer Management: Customer account overview, support tools, account management (NEW)
Customer Profiles: Complete customer view with booking history and service patterns
Financial Interface: Payment tracking, refund processing, revenue analytics
Task Management: COI validation, Onfleet task creation, delivery coordination
Reporting: Business intelligence dashboards with data export capabilities
Customer Management Features (NEW):

Customer Search: Find customers by name, email, phone, or booking number
Customer Profile View: Complete customer account overview with booking history
Account Support: Password resets, account unlocking, profile updates
Communication History: View all customer communications and support interactions
Booking Patterns: Analyze customer behavior, frequency, preferences
Staff Workflow Optimization:

Single-click common actions (create Onfleet task, upload COI, send notifications)
Customer support shortcuts: Quick access to customer accounts from bookings
Bulk operations for efficiency (batch refunds, mass communications)
Smart filtering and search across all booking and customer data
Quick customer lookup and service history
Audit logging for all administrative actions
Frontend Integration Needs:

Real-time Updates: Live booking status changes via WebSocket
Customer Account Management: Staff interfaces for customer account support
File Operations: Direct COI upload to S3 with progress indicators
External Integration: Onfleet task creation, Stripe refund processing
Data Export: CSV generation for accounting and analysis
Mobile Access: Responsive design for mobile staff operations
Permission Architecture:

Admin Role: Full system access, refund processing, customer account management, user management
Staff Role: Booking management, customer service, operational tasks, basic customer support
View-Only: Dashboard access, reporting, no modification capabilities
Audit Trail: Complete logging of all staff actions with user attribution
Key External Relationships:

← API Integration Layer: Primary consumer of admin/CRM APIs
→ Backend CRM App: All administrative operations flow through CRM endpoints
→ Backend Customers App: Customer account management and support operations
→ All Backend Apps: Management interface for entire system
Authentication: Role-based access control and session management (staff only)
Real-time: WebSocket updates for live operational awareness
MVP Simplifications:

Basic dashboard with essential KPIs only
Simple booking and customer tables with core filters
Basic customer account viewing (no advanced management tools)
Manual report generation (no scheduled reports)
Basic audit logging for critical actions only
System Integration PatternsData Flow ArchitectureCustomer Booking Journey (Guest):
Marketing Site (SEO/Conversion)
    ↓
Booking Wizard (Guest Checkout)
    ↓ Real-time pricing
Services API ← → Frontend State Management
    ↓ Booking creation with guest info
Bookings API → Payment Processing
    ↓ Payment confirmation
Logistics API → Email Notifications
    ↓
Confirmation & Tracking (email-based)Customer Booking Journey (Authenticated):
Marketing Site → Customer Login/Dashboard
    ↓
Customer Dashboard → Booking Wizard (Pre-filled)
    ↓ Customer profile integration
Customers API ← → Services API ← → Frontend State
    ↓ Booking creation linked to customer
Bookings API → Payment Processing (saved methods)
    ↓ Payment confirmation
Logistics API → Dashboard Updates + Email Notifications
    ↓
Customer Dashboard Tracking + Email confirmationsStaff Operations Flow:
Admin Authentication (Staff Only)
    ↓
Dashboard Overview (Real-time KPIs)
    ↓
Booking Management + Customer Management
    ↓ Staff actions
CRM API → All Backend Apps (including Customers API)
    ↓ Real-time updates
WebSocket → Live Dashboard UpdatesExternal Service Integration:
Frontend → S3 Direct Upload (COI files)
Frontend → Stripe Elements (Payment + Customer management)
Backend → SES (Email notifications)
Backend → Onfleet (Delivery coordination)State Management StrategyCustomer Authentication State:

Customer login/logout state management
Customer profile data synchronization
Saved addresses and payment methods state
Session timeout and security handling
Authentication persistence across page refreshes
Booking Flow State:

Zustand store with persistence for wizard progress
Customer authentication integration (pre-fill data)
Local storage backup for browser refresh recovery
Real-time pricing updates from services API
Form validation state with Zod schemas
Error state management and recovery flows
Admin Dashboard State:

Staff authentication and permissions
Real-time data updates via WebSocket
Optimistic updates for staff actions
Cached data with smart invalidation
Filter and search state persistence
Audit log integration for action tracking
Performance Optimization PatternsCode Splitting Strategy:

Marketing site separate from booking wizard
Customer dashboard as separate bundle
Admin dashboard as separate bundle
Component-level lazy loading
Dynamic imports for heavy features
Vendor bundle optimization
Data Loading Patterns:

SSR for marketing pages (SEO)
Client-side rendering for interactive flows
Customer data prefetching after authentication
Prefetching for likely user actions
Background data refresh
Optimistic UI updates
Caching Architecture:

Browser cache for static assets
API response caching for pricing/availability
Customer profile data caching
LocalStorage for user preferences and authentication
Service Worker for offline functionality (future)
CDN optimization for global performance
Development RoadmapPhase 1: Foundation & Customer Auth (Week 1)
Objective: Establish project foundation with SEO-optimized marketing site and customer authenticationFrontend Deliverables:

Next.js 14 project setup with TypeScript and Tailwind
Core design system components and luxury styling
Marketing site with SSR (Home, Services, How It Works)
Customer authentication pages (login, signup, dashboard shell)
Basic customer dashboard with booking history
SEO optimization with structured data
Performance baseline with Core Web Vitals
Backend Dependencies:

Basic Django API setup
Customer authentication API (customers app)
Authentication endpoints
Service catalog API for pricing displays
Success Criteria:

Marketing site live with >90 Lighthouse score
Customers can register, login, and view basic dashboard
Design system components documented and reusable
SEO foundation complete with structured data
Mobile-responsive luxury experience
Phase 2: Booking Wizard Integration (Week 2)
Objective: Complete dual-mode booking flow (guest + authenticated)Frontend Deliverables:

Dual-mode booking wizard (guest checkout + authenticated flow)
Multi-step wizard with state management
Service selection with Mini Move packages
Calendar integration with availability display
Address input and customer information forms (with pre-filling)
Real-time pricing updates
Backend Dependencies:

Bookings API for creation and validation
Services API for pricing calculation
Customer profile integration for pre-filled data
Availability API for calendar integration
Success Criteria:

Complete booking wizard flow functional for both guest and authenticated users
Customer dashboard shows booking history from wizard bookings
Real-time pricing working across all service types
Form validation and error handling robust
Mobile-optimized booking experience
Phase 3: Payment & Customer Features (Week 3)
Objective: Complete end-to-end booking with payment processing and full customer dashboardFrontend Deliverables:

Stripe Elements integration with saved payment methods
Payment processing with error handling
Complete customer dashboard with all MVP features
Address book management for customers
Payment method management via Stripe
Booking confirmation page with tracking
Error recovery and retry flows
Backend Dependencies:

Stripe payment processing API
Customer payment method management
Booking confirmation endpoints
Email notification system
Payment webhook handling
Success Criteria:

Full booking-to-payment flow operational for both user types
Customer dashboard fully functional with address and payment management
Stripe integration secure and tested
Confirmation page with tracking information
Error handling with clear user feedback
Phase 4: Admin Dashboard & Customer Support (Week 4)
Objective: Staff operations interface with customer management capabilitiesFrontend Deliverables:

Staff authentication and role-based access
Dashboard with real-time KPIs
Booking management table with actions
Customer management interface for staff
Staff action interfaces (refunds, COI upload)
Mobile-responsive admin interface
Backend Dependencies:

CRM API with dashboard data
Staff authentication and permissions
Customer account management APIs
Admin action endpoints
File upload capabilities
Success Criteria:

Complete staff dashboard operational
Staff can view and manage customer accounts
Booking management with key staff actions
Role-based access control working
Mobile admin functionality
Phase 5: Production & Optimization (Week 5)
Objective: Production-ready application with performance optimizationFrontend Deliverables:

Bundle optimization and code splitting
Accessibility audit and compliance
Cross-browser testing and fixes
Analytics integration and conversion tracking
Customer dashboard performance optimization
Production deployment with monitoring
Backend Dependencies:

All APIs production-ready
Real integrations (Stripe, Onfleet)
Performance optimization
Production security hardening
Success Criteria:

Application deployed and performant
Customer dashboard analytics tracking usage patterns
Analytics tracking booking funnel
Accessibility compliant
Production monitoring active
Technical Architecture DecisionsFrontend Framework Choices

Next.js 14: App Router for advanced routing, SSR for SEO, performance optimization
TypeScript: Full type safety across application, better developer experience
Tailwind CSS: Utility-first styling aligned with design system, excellent performance
Zustand: Lightweight state management without Redux complexity
Zod: Runtime validation with TypeScript integration
Performance Strategy

SSR for Marketing: Search engine optimization and fast initial loads
CSR for Dashboards: Rich interactions and real-time updates
Code Splitting: Separate bundles for different user flows and authentication states
Image Optimization: WebP/AVIF formats, responsive sizing
Bundle Analysis: Tree shaking and dependency optimization
User Experience Principles

Mobile-First: 70% of luxury customers browse on mobile
Progressive Enhancement: Core functionality works without JavaScript
Accessibility: WCAG 2.1 AA compliance throughout
Authentication UX: Seamless guest-to-customer conversion
Error Recovery: Clear paths forward when things go wrong
Performance: Luxury customers expect instant responsiveness
Security Implementation

Input Validation: Zod schemas on all user inputs
XSS Protection: Sanitized output and CSP headers
CSRF Protection: Built-in Next.js protections
Authentication Security: Separate customer and staff authentication flows
Customer Data Protection: Proper authorization for customer data access
File Uploads: Direct S3 upload with signed URLs
Success Metrics & MonitoringCustomer Experience Metrics

Customer Registration Rate: Guest-to-account conversion
Booking Conversion Rate: Marketing site to completed booking (guest + authenticated)
Repeat Booking Rate: Customer dashboard usage for repeat bookings
Wizard Completion Rate: Step-by-step funnel analysis
Payment Success Rate: Stripe transaction success
Customer Support Tickets: Reduction through better self-service
Mobile Experience: Performance and usability on mobile
Performance Indicators

Core Web Vitals: LCP, FID, CLS tracking across all pages
API Response Times: Frontend perception of backend speed
Customer Dashboard Performance: Dashboard loading and interaction times
Error Rates: JavaScript errors and API failures
Bundle Sizes: Loading performance optimization
SEO Performance: Organic traffic and ranking improvements
Business Intelligence

Customer Engagement: Dashboard usage patterns, feature adoption
Authentication Patterns: Guest vs authenticated booking behavior
Service Selection Patterns: Which offerings customers choose
Customer Lifetime Value: Repeat booking patterns and revenue
Address Reuse: Effectiveness of saved address features
Payment Method Adoption: Saved payment method usage rates
Seasonal Trends: Usage patterns for resource planning
Customer Journey Analysis: Optimization opportunities
Staff Efficiency: Admin dashboard usage and task completion
Technical Health

Uptime Monitoring: Application availability
Error Tracking: Sentry integration for issue resolution
Performance Monitoring: Real user monitoring data
Authentication Security: Login attempt monitoring and security metrics
Security Scanning: Regular vulnerability assessment
Dependency Updates: Package security and performance
This living document evolves with system development and serves as the strategic guide for ToteTaxi's frontend architecture, user experience patterns, and development priorities.