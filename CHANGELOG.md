# ToteTaxi Development Changelog

**Project:** ToteTaxi Platform
**Last Updated:** February 6, 2026

---

## Summary

This document tracks all completed development work for client presentation and internal reference.

---

## February 6, 2026

### Auth & Permissions Security Fixes (PR #5)

6 more findings fixed from the security audit.

| Finding | Severity | Description | Fix |
|---------|----------|-------------|-----|
| H3 | HIGH | Staff endpoints used inline `hasattr` checks instead of DRF permission classes — no role enforcement | Created `IsStaffMember` and `IsAdminStaff` permission classes, applied to all 14 staff views |
| H5 | HIGH | Booking status accepted any arbitrary string — no transition validation | Added `VALID_TRANSITIONS` state machine to Booking model, validated in staff update view |
| C4 | CRITICAL | Booking number generation had race condition — concurrent saves could produce duplicates | Wrapped in `transaction.atomic()` + `select_for_update()` |
| C5 | CRITICAL | Customer stats (total_bookings, total_spent_cents) incremented in both payments AND logistics — double counting | Removed duplicate from logistics; kept single increment in payments with F() expressions |
| L1 | MINOR | StaffAction logged `view_booking` but it wasn't in ACTION_TYPES choices | Added `view_booking` to ACTION_TYPES |
| L18 | MINOR | SECRET_KEY had insecure default that could silently be used in production | Required in production (no fallback when FLY_APP_NAME set), default only for local dev |

**Skipped:** H4 (lock_account `timezone.timedelta`) — investigated and confirmed NOT broken (Django re-exports timedelta). H6 (CSRF) — low risk given CORS + SameSite + separate domains.

**Tests added:** 23 new tests across 3 test files
**Test results:** 185 passed, 0 regressions

---

### Security Audit & Critical Fixes (PR #4)

Full security audit performed. 6 findings fixed and deployed.

| Finding | Severity | Description | Fix |
|---------|----------|-------------|-----|
| C1 | CRITICAL | Payment amount never verified — attacker could pay $1 for a $995 move | Server-side Stripe PI amount vs booking total check on both guest and authenticated flows |
| C2 | CRITICAL | PaymentIntent reuse — same PI could create multiple bookings; guest flow had no Payment record | PI reuse check before booking creation; guest flow now creates Payment record |
| C3 | CRITICAL | Onfleet webhook had zero authentication — anyone could fake delivery status updates | HMAC-SHA512 signature verification using `ONFLEET_WEBHOOK_SECRET` |
| H1 | HIGH | Public calendar endpoint leaked customer names, booking IDs, prices to unauthenticated users | Staff gets full data, public gets booking counts only |
| H2 | HIGH | Booking/payment status endpoints enumerable via sequential TT-XXXXXX numbers | Changed to UUID-only lookup, stripped sensitive fields from response |
| H8 | HIGH | API error responses included raw exceptions — leaked Stripe keys, DB schema, file paths | Replaced all `str(e)` with generic messages; detailed errors logged server-side only |

**Tests added:** 24 new security tests across 4 test files
**Test results:** 162 passed, 0 regressions

---

## January 8, 2026

### Bug Fixes

| Bug | Description | Fix | Files Changed |
|-----|-------------|-----|---------------|
| Double-click login | Staff portal required clicking login twice due to CSRF race condition | Changed CSRF endpoint to AllowAny permission | `backend/apps/accounts/views.py` |
| Calendar not loading | Staff booking calendar showed no data | Fixed wrong API URL (`/api/public/calendar/availability/` → `/a
pi/public/availability/`) | `frontend/src/components/staff/booking-calendar.tsx` |
| Logistics stats empty | Dashboard stats showed blank values | Fixed response structure mismatch between backend and frontend | `backend/apps/logistics/services.py` |
| Refresh button no feedback | "Refresh Data" button appeared non-functional | Added isFetching loading state and visual feedback | `frontend/src/components/staff/staff-dashboard-overview.tsx` |
| Service buttons not working | "Select Petite/Standard/Full Move" buttons did nothing | Added onClick handlers to save package selection to booking wizard | `frontend/src/components/marketing/service-showcase.tsx` |
| Surge pricing only charges once | Out-of-zone surcharge only charged once even when both pickup AND delivery were outside core area | Updated to charge $175 per out-of-zone location (max $350) | `backend/apps/bookings/models.py`, `views.py`, `serializers.py` |
| Password field not registering | Login form password field wouldn't accept input | Fixed Input component conflict with react-hook-form (controlled vs uncontrolled) | `frontend/src/components/ui/input.tsx` |

### Features Built

#### Reports & Analytics Page
**Location:** Staff Dashboard → Reports

**Backend API** (`backend/apps/accounts/views.py`):
- New endpoint: `GET /api/staff/reports/`
- Returns:
  - Total revenue, booking count, customer count, completion rate
  - Daily revenue and bookings (past 30 days)
  - Bookings breakdown by status
  - Revenue breakdown by service type
  - Top 10 customers by revenue
  - Monthly revenue (past 12 months)

**Frontend** (`frontend/src/app/staff/reports/page.tsx`):
- Key metrics cards with icons
- Daily revenue bar chart
- Daily bookings bar chart
- Bookings by status breakdown (color-coded)
- Revenue by service type table
- Top customers table
- Monthly revenue summary table

### Email Features

| Item | Description | Files Changed |
|------|-------------|---------------|
| Calendar invite (.ics) in reminder emails | 24-hour reminder emails now include downloadable calendar invite with pickup time, location, and booking details (30 min event) | `backend/apps/customers/emails.py` |
| Post-delivery review email | Automatic email sent when booking status changes to "completed" requesting Google review (uses Place ID: ChIJK7UwwRDB0UIRP6hrsPW6ZMk) | `backend/apps/customers/emails.py`, `backend/apps/bookings/signals.py`, `backend/templates/emails/review_request.txt` |

### Content Updates

| Item | Description | Files Changed |
|------|-------------|---------------|
| Tote Camps footer link | Added link to totecamps.com in website footer | `frontend/src/components/layout/main-layout.tsx` |
| Hampton Jitney partner | Added as partner on partnerships page with description and link | `frontend/src/app/partnerships/page.tsx` |
| Hampton Jitney homepage | Added to "Trusted Partners" section on homepage (now 4-column grid) | `frontend/src/app/page.tsx` |
| Remove "New Booking" button | Removed non-functional "+ New Booking" button from staff calendar page | `frontend/src/components/staff/booking-calendar.tsx` |
| Remove "BLADE" branding | Removed all "BLADE" text from booking wizard - now shows "Airport Transfer" | `frontend/src/components/booking/*.tsx` (4 files) |
| JFK Route Announcement Popup | Added popup for new visitors announcing JFK route with "Book Now" CTA linking to Airport Transfer booking | `frontend/src/components/marketing/jfk-announcement-popup.tsx`, `frontend/src/app/page.tsx` |

### Infrastructure

| Item | Description |
|------|-------------|
| Google Places API | Enabled billing to activate address autocomplete |

---

## January 2, 2026 (Previous Session)

### Infrastructure & Webhook Fixes

| Item | Description | Files Changed |
|------|-------------|---------------|
| Stripe webhook retry logic | Fixed race condition where webhooks failed if booking wasn't created yet | `backend/apps/payments/views.py` |
| Onfleet webhook retry logic | Fixed race condition with task creation timing | `backend/apps/logistics/services.py` |
| Onfleet Trigger 7 handler | Implemented taskUpdated webhook handler | `backend/apps/logistics/services.py` |
| Customer profile 500 error | Fixed error when staff users accessed customer profiles | `backend/apps/customers/views.py` |
| Celery beat memory | Scaled memory to 512 MB to prevent OOM issues | Fly.io config |

---

## Running Totals

### Security Fixes: 12
- C1: Payment amount verification
- C2: PaymentIntent reuse prevention + guest Payment record
- C3: Onfleet webhook HMAC authentication
- C4: Booking number race condition (atomic generation)
- C5: Customer stats double-counting fix
- H1: Calendar PII stripped for public users
- H2: Booking/payment status UUID-only lookup
- H3: Staff permission classes (replace inline hasattr checks)
- H5: Booking status transition validation
- H8: Error message sanitization
- L1: StaffAction view_booking type added
- L18: SECRET_KEY required in production

### Bugs Fixed: 8
- Double-click login (CSRF)
- Calendar not loading
- Logistics stats empty
- Refresh button no feedback
- Service buttons not working
- Surge pricing only charges once
- Password field not registering
- Customer profile 500 error

### Features Built: 1
- Reports & Analytics page (full implementation)

### Email Features: 2
- Calendar invite (.ics) in reminder emails
- Post-delivery review request email

### Content Updates: 4
- Tote Camps footer link
- Hampton Jitney on partnerships page
- Hampton Jitney on homepage
- JFK promo banner/popup

### Infrastructure Fixes: 5
- Stripe webhook retry logic
- Onfleet webhook retry logic
- Onfleet Trigger 7 handler
- Celery beat memory scaling
- Google Places API billing enabled

---

## Pending Work

### Proposed Features (Approved Jan 9)

| Feature | Estimate | Priority | Status |
|---------|----------|----------|--------|
| Discount Codes | 10-12 hours | HIGH | Not Started |
| Item Description Field | 5-6 hours | MEDIUM | Not Started |
| MailChimp Integration | 3-4 hours | LOW | Not Started |

### Easy Wins

| Item | Effort | Status |
|------|--------|--------|
| Box size dimensions info | Easy | Not Started |

### Medium Priority

| Item | Effort | Status |
|------|--------|--------|
| Abandoned cart emails | Medium | Not Started |
| Round-trip bookings | Large | Not Started |

### Needs Client Input
- Service type filters - need specific example of failure
- CRM customer data - need specific example of missing data
- Special dates surcharges - need date list from Danielle
