# ToteTaxi Platform Updates

**Last Updated:** January 8, 2026
**Status:** Bug Fixes Complete, Features In Progress

---

## Table of Contents
1. [Completed Work](#completed-work)
2. [Pricing & Booking Flow](#1-pricing--booking-flow)
3. [Notifications & Customer Experience](#2-notifications--customer-experience)
4. [CRM & Reporting](#3-crm--reporting)
5. [Partnerships & Website Updates](#4-partnerships--website-updates)
6. [JFK Route Expansion](#5-jfk-route-expansion)
7. [Priority Summary](#priority-summary)

---

## Completed Work

### Bug Fixes (All Critical Bugs Resolved)

| Bug | Status | Files Changed |
|-----|--------|---------------|
| BUG-1: Double-click login (CSRF) | ✅ Fixed | `backend/apps/accounts/views.py` - CSRF endpoint needed AllowAny permission |
| BUG-2: Calendar not loading | ✅ Fixed | `frontend/src/components/staff/booking-calendar.tsx` - Wrong API URL |
| BUG-3: Logistics stats empty | ✅ Fixed | `backend/apps/logistics/services.py` - Response structure mismatch |
| BUG-4: Refresh button no feedback | ✅ Fixed | `frontend/src/components/staff/staff-dashboard-overview.tsx` - Added isFetching state |
| BUG-5: Service buttons not working | ✅ Fixed | `frontend/src/components/marketing/service-showcase.tsx` - Added onClick handlers |
| BUG-6: Surge pricing only charges once | ✅ Fixed | `backend/apps/bookings/models.py`, `views.py`, `serializers.py` - Now charges $175 per out-of-zone location |
| Password field not registering | ✅ Fixed | `frontend/src/components/ui/input.tsx` - Input component conflicting with react-hook-form |

### Features Completed

#### Reports & Analytics Page (3.1)
**Status:** ✅ Complete

**Backend API** (`backend/apps/accounts/views.py`):
- `StaffReportsView` at `/api/staff/reports/`
- Returns comprehensive analytics data including:
  - Total revenue, booking count, customer count, completion rate
  - Daily revenue and bookings for the past 30 days
  - Bookings breakdown by status
  - Revenue breakdown by service type
  - Top 10 customers by revenue
  - Monthly revenue for the past 12 months

**Frontend Page** (`frontend/src/app/staff/reports/page.tsx`):
- Key metrics cards: Total Revenue, Total Bookings, Total Customers, Completion Rate
- Simple bar charts for daily revenue and daily bookings
- Bookings by Status breakdown with color-coded indicators
- Revenue by Service Type table
- Top Customers table with details
- Monthly Revenue summary table

### Infrastructure Fixes (Previous Session)
- ✅ Stripe webhook retry logic (race condition fix)
- ✅ Onfleet webhook retry logic (race condition fix)
- ✅ Onfleet Trigger 7 handler (taskUpdated)
- ✅ Customer profile 500 error fix (staff users)
- ✅ Memory scaling for Celery beat (512 MB)

---

## 1. Pricing & Booking Flow

### 1.1 Description Box (Required Field)
**Priority:** 🟢 Easy Win
**Effort:** Easy
**Status:** Not Started

**Request:** For standard deliveries, require clients to specify what is being picked up (boxes, suitcases, trunks) before checkout.

**Files to Update:**
- Backend: Add validation to booking serializer
- Frontend: Make field required in booking form

---

### 1.2 Box Size Dimensions
**Priority:** 🟢 Easy Win
**Effort:** Easy
**Status:** Not Started

**Request:** List standard box size limits clearly, with a note that oversized items may incur additional charges.

**Files to Update:**
- Frontend: Add info section to booking form/services page

---

### 1.3 Round-Trip Bookings
**Priority:** 🟡 Medium
**Effort:** Medium-Large
**Status:** Not Started

**Request:** Allow clients to book round-trip deliveries within the same booking flow.

**Current State:** Users must book two separate deliveries.

**Implementation Notes:**
- Add "round-trip" option to booking wizard
- Create linked booking pairs
- Consider pricing (discount for round-trip?)
- Update confirmation emails to show both legs

---

## 2. Notifications & Customer Experience

### 2.1 Calendar Invite (.ics) in Reminder Emails
**Priority:** 🟢 Easy Win
**Effort:** Easy
**Status:** Not Started

**Request:** Add calendar invite attachments to the 24-hour reminder emails.

**Current State:** Reminder emails exist and run hourly. No .ics attachment.

**Files to Update:**
- `backend/apps/customers/emails.py` - `send_booking_reminder_email()` function
- Create .ics file with pickup date/time and attach to email

---

### 2.2 Post-Delivery Review Email
**Priority:** 🟢 Easy Win
**Effort:** Easy
**Status:** Not Started

**Request:** Automatically email clients after completed delivery prompting Google review.

**Implementation:**
- Trigger when booking status changes to "completed"
- Create new email template with Google review link
- Add to existing email system

**Files to Create/Update:**
- `backend/apps/customers/emails.py` - Add `send_review_request_email()` function
- `backend/templates/emails/review_request.txt` - New template
- Trigger from Onfleet webhook when dropoff completes (or booking status change)

---

### 2.3 Abandoned Cart Emails
**Priority:** 🟡 Medium
**Effort:** Medium
**Status:** Not Started

**Request:** Similar to Shopify's "left items in cart" flow - trigger emails to users who begin but don't complete a booking.

**Implementation Notes:**
- Need to track partial booking sessions
- Store incomplete booking data with timestamps
- Celery task to check for abandoned bookings (e.g., started 24h ago, not completed)
- Email template with link to resume booking
- Consider: What data to save? How long to wait before sending?

---

## 3. CRM & Reporting

### 3.1 Reports Page Implementation
**Priority:** 🟡 Medium
**Effort:** Large
**Status:** ✅ Complete

See [Completed Work](#completed-work) section for details.

---

### 3.2 Service Type Filters Not Working
**Priority:** 🟡 Medium
**Effort:** Medium
**Status:** Needs Investigation

**Request:** Filters for Blade vs. Tote Taxi vs. standard deliveries vs mini moves don't seem to be working correctly.

**Action Needed:** Get specific example of what's broken to investigate.

---

### 3.3 Customer Data Not Populating in CRM
**Priority:** 🟡 Medium
**Effort:** Unknown
**Status:** Needs Investigation

**Request:** Customer records do not appear to be populating correctly in the CRM.

**Action Needed:** Get specific example of missing/incorrect customer data to investigate.

---

## 4. Partnerships & Website Updates

### 4.1 Add Hampton Jitney as Partner
**Priority:** 🟢 Easy Win
**Effort:** Easy
**Status:** Not Started

**Request:** Add Hampton Jitney as a partner option on the website.

**Files to Update:**
- Frontend: Partnerships page content

---

### 4.2 Add Tote Camps to Footer
**Priority:** 🟢 Easy Win
**Effort:** Easy
**Status:** Not Started

**Request:** Add Tote Camps to the website footer with link to totecamps.com.

**Files to Update:**
- Frontend: Footer component

---

## 5. JFK Route Expansion

**Priority:** 🔴 High (Business Priority)
**Status:** Partially Ready

### 5.1 Manhattan ↔ JFK Standard Delivery
**Effort:** Easy (should work already)
**Status:** Verify

**Request:** Use standard delivery flow for Manhattan ↔ JFK luggage orders.

**Current State:** Standard delivery flow should support this. May need:
- Verify JFK ZIP codes are in service area
- Adjust pricing/zones if needed

---

### 5.2 JFK Promotional Banner/Popup
**Priority:** 🟢 Easy Win
**Effort:** Easy
**Status:** Not Started

**Request:** Website popup or banner to promote JFK luggage delivery service.

**Files to Update:**
- Frontend: Add promotional banner component
- Consider: Homepage hero section, popup on first visit, or persistent banner

---

### 5.3 Google Ads / SEO Keywords
**Priority:** 🟡 Medium
**Effort:** Outside Development Scope
**Status:** Advisory

**Request:** Help with Google Ads or organic ranking for:
- "JFK luggage delivery"
- "JetBlue luggage delivery JFK"

**Notes:**
- On-page SEO can be improved (meta tags, content, structured data)
- Google Ads setup requires marketing expertise
- Consider creating dedicated landing page for JFK service

---

## Priority Summary

### Completed ✅
| Item | Type | Status |
|------|------|--------|
| Double-click login | Bug | ✅ Fixed |
| Calendar not loading | Bug | ✅ Fixed |
| Service buttons not working | Bug | ✅ Fixed |
| Surge pricing x2 | Bug | ✅ Fixed |
| Logistics stats empty | Bug | ✅ Fixed |
| Refresh button feedback | Bug | ✅ Fixed |
| Password field not registering | Bug | ✅ Fixed |
| Reports page | Feature | ✅ Complete |
| Calendar invite in emails | Feature | ✅ Complete |
| Post-delivery review email | Feature | ✅ Complete |
| Hampton Jitney partner | Content | ✅ Complete |
| Tote Camps footer link | Content | ✅ Complete |

### Easy Wins (Quick Value) - Remaining
| Item | Type | Effort |
|------|------|--------|
| Description box required | Feature | Easy |
| Box size dimensions | Feature | Easy |
| JFK promo banner | Feature | Easy (on hold) |

### Medium Priority - Remaining
| Item | Type | Effort |
|------|------|--------|
| Abandoned cart emails | Feature | Medium |
| Service type filters | Bug/Feature | Medium |
| CRM customer data | Bug | Unknown |
| Round-trip bookings | Feature | Large |

### Needs More Information
- Service type filters - need specific example of failure
- CRM customer data - need specific example of missing data

---

## Questions for Client

1. **CRM issues:** Can you show a specific example of a customer record that's not populating correctly?
2. **Report filters:** Which specific filter combination isn't working? (date range + service type?)
3. **Round-trip bookings:** Should round-trip get a discount? Same-day return or different days?
4. **Abandoned cart:** How long after starting a booking should we send the reminder? (24h? 48h?)
