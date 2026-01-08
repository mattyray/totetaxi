# ToteTaxi Platform Updates

**Last Updated:** January 8, 2026
**Status:** Planning & Investigation Complete

---

## Table of Contents
1. [Critical Bugs](#critical-bugs)
2. [Pricing & Booking Flow](#1-pricing--booking-flow)
3. [Notifications & Customer Experience](#2-notifications--customer-experience)
4. [CRM & Reporting](#3-crm--reporting)
5. [Partnerships & Website Updates](#4-partnerships--website-updates)
6. [JFK Route Expansion](#5-jfk-route-expansion)
7. [Priority Summary](#priority-summary)

---

## Critical Bugs

These are blocking issues that need to be fixed first.

### BUG-1: Double-Click Required to Login (Staff Portal)
**Priority:** 🔴 Critical
**Effort:** Medium
**Status:** Investigated

**Problem:** Staff users must click the login button twice. First click shows "invalid username/password", second click works.

**Root Cause:** CSRF token race condition in the API interceptor. On first login attempt, no CSRF token is cached. The interceptor tries to fetch it asynchronously, but the login request is sent before the token is retrieved, causing it to fail.

**Files to Fix:**
- `frontend/src/lib/api-client.ts` (lines 27-57) - Need to properly await CSRF token fetch before sending request

**Solution:** Ensure CSRF token fetch completes before the login POST request is sent. Consider pre-fetching CSRF token on page load.

---

### BUG-2: Staff Calendar Not Loading
**Priority:** 🔴 Critical
**Effort:** Easy (1 line fix)
**Status:** Investigated

**Problem:** Booking Calendar page shows header but no calendar grid or data.

**Root Cause:** Frontend calling wrong API endpoint.
- Frontend calls: `/api/public/calendar/availability/`
- Backend endpoint: `/api/public/availability/`

**Files to Fix:**
- `frontend/src/components/staff/booking-calendar.tsx` (line 77)

**Solution:** Change API URL from `/api/public/calendar/availability/` to `/api/public/availability/`

---

### BUG-3: Logistics Stats Not Loading
**Priority:** 🔴 Critical
**Effort:** Medium
**Status:** Investigated

**Problem:** Logistics Management page shows empty stats:
- Active Tasks (blank)
- Today's Deliveries (blank)
- Completed Today (blank)
- Completion Rate (just shows %)

**Root Cause:** API response structure mismatch.
- Frontend expects: `summary.active_tasks`, `summary.tasks_today`, `summary.completed_today`
- Backend returns: `totetaxi_stats.total_bookings`, `integration_stats.tasks_active`, etc.

**Files to Fix:**
- Option A: `backend/apps/logistics/services.py` (lines 508-547) - Reshape response
- Option B: `frontend/src/components/staff/logistics-management.tsx` - Update to read nested data

**Solution:** Either flatten the backend response or update frontend to extract from nested structure.

---

### BUG-4: Refresh Button Appears Non-Functional
**Priority:** 🟡 Medium
**Effort:** Easy
**Status:** Investigated

**Problem:** "Refresh Data" button on Operations Dashboard doesn't appear to do anything.

**Root Cause:** Button works but has no visual feedback (no loading spinner, no success message).

**Files to Fix:**
- `frontend/src/components/staff/staff-dashboard-overview.tsx` (lines 122-133)

**Solution:** Add loading state, disable button during fetch, show success/error toast.

---

### BUG-5: Service Selection Buttons Don't Work
**Priority:** 🔴 Critical
**Effort:** Easy
**Status:** Investigated

**Problem:** "Select Petite", "Select Standard", "Select Full Move", "Calculate Your Delivery" buttons on Services page don't work when clicked.

**Root Cause:** Missing onClick handlers. Buttons navigate to `/book` but don't save which package was selected to the booking wizard state.

**Files to Fix:**
- `frontend/src/app/services/page.tsx` (line 126 and similar)

**Solution:** Add onClick handler that calls `updateBookingData()` with selected package before navigation.

---

### BUG-6: Surge Pricing Only Charges Once
**Priority:** 🔴 Critical (Revenue Impact)
**Effort:** Medium
**Status:** Investigated

**Problem:** If both pickup AND delivery are outside the core service area, customer should be charged $175 x 2 = $350. Currently only charges $175 max.

**Example:** NJ pickup (outside zone) + Montauk delivery (outside zone) = Should be $350, but only charges $175.

**Root Cause:** Code uses boolean OR instead of counting both:
```python
# Current (wrong):
self.is_outside_core_area = pickup_surcharge or delivery_surcharge

# Should track both separately and sum
```

**Files to Fix:**
- `backend/apps/bookings/models.py` (line 353) - Track both surcharges
- `backend/apps/bookings/models.py` (lines 499-503) - `calculate_geographic_surcharge()` method
- `backend/apps/bookings/views.py` (lines 228-230, 298-300, 355-357) - Pricing preview
- `backend/apps/bookings/serializers.py` (lines 340-341, 385-386, 424-425) - Price calculation

**Solution:**
1. Add `pickup_outside_core_area` and `delivery_outside_core_area` fields (or calculate on the fly)
2. Update `calculate_geographic_surcharge()` to return $175 per out-of-zone address
3. Update all pricing views/serializers to sum both surcharges

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
**Status:** Placeholder Only

**Current State:** Page shows "Business reports and analytics will be implemented here."

**Request:** Need working reports for:
- Daily sales
- Weekly sales
- Monthly sales
- Filter by service type (Blade vs Tote Taxi vs Standard vs Mini Moves)

**Implementation Notes:**
- Backend: Create `/api/staff/reports/` endpoints with date range and service type filters
- Frontend: Build report components with charts/tables
- Permission system already exists (`can_view_financial_reports`)

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

### Immediate Fixes (Do First)
| Item | Type | Effort |
|------|------|--------|
| Double-click login | Bug | Medium |
| Calendar not loading | Bug | Easy |
| Service buttons not working | Bug | Easy |
| Surge pricing x2 | Bug | Medium |
| Logistics stats empty | Bug | Medium |

### Easy Wins (Quick Value)
| Item | Type | Effort |
|------|------|--------|
| Calendar invite in emails | Feature | Easy |
| Description box required | Feature | Easy |
| Box size dimensions | Feature | Easy |
| Post-delivery review email | Feature | Easy |
| Hampton Jitney partner | Content | Easy |
| Tote Camps footer link | Content | Easy |
| JFK promo banner | Feature | Easy |
| Refresh button feedback | Bug | Easy |

### Medium Priority
| Item | Type | Effort |
|------|------|--------|
| Abandoned cart emails | Feature | Medium |
| Reports page | Feature | Large |
| Service type filters | Bug/Feature | Medium |
| CRM customer data | Bug | Unknown |
| Round-trip bookings | Feature | Large |

### Needs More Information
- Service type filters - need specific example of failure
- CRM customer data - need specific example of missing data
- Surge pricing - need booking number from NJ→Montauk case

---

## Technical Notes

### Already Completed (This Session)
- ✅ Stripe webhook retry logic (race condition fix)
- ✅ Onfleet webhook retry logic (race condition fix)
- ✅ Onfleet Trigger 7 handler (taskUpdated)
- ✅ Customer profile 500 error fix (staff users)
- ✅ Memory scaling for Celery beat (512 MB)

### Pending Deployment
- Customer profile view fix (`backend/apps/customers/views.py`)

---

## Questions for Client

1. **Surge pricing:** Can you provide the booking number for the NJ→Montauk delivery that only charged once?
2. **CRM issues:** Can you show a specific example of a customer record that's not populating correctly?
3. **Report filters:** Which specific filter combination isn't working? (date range + service type?)
4. **Round-trip bookings:** Should round-trip get a discount? Same-day return or different days?
5. **Abandoned cart:** How long after starting a booking should we send the reminder? (24h? 48h?)
