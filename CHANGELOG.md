# ToteTaxi Development Changelog

**Project:** ToteTaxi Platform
**Last Updated:** February 11, 2026

---

## Summary

This document tracks all completed development work for client presentation and internal reference.

---

## February 11, 2026

### Item Description Field for Standard Delivery

Added a required `item_description` field so customers describe what they're sending with standard delivery bookings. The field appears as a textarea in the booking wizard when item count > 0, and is required before proceeding.

**Backend:**
- `item_description` TextField on Booking model (nullable, blank, max 500 chars)
- Migration: `0011_booking_item_description`
- Added to 7 serializers (guest + authenticated flows) with validation: required when `standard_delivery_item_count > 0`
- Staff API `_get_service_details()` returns item_description in response
- Django admin: added to Service Selection fieldset + list display

**Frontend:**
- Conditional textarea in service-selection-step (appears when item count > 0, 500 char limit)
- `canContinue()` blocks progression when description is blank
- Sent in pricing preview, payment intent, and booking creation API calls
- Displayed in customer dashboard booking detail, staff detail page, and staff calendar modal

**Emails:**
- Confirmation email: shows description under Standard Delivery Details
- Reminder email: shows description after total price

**Tests:** 266 passed, 0 regressions (2 pre-existing failures)

---

## February 10, 2026

### Post-Launch Bug Fixes

| Bug | Description | Fix | Files Changed |
|-----|-------------|-----|---------------|
| Free order flow broken | Frontend checked `=== 'free_order'` but backend returns `'free_order_<UUID>'` after R2 security fix | Changed to `startsWith('free_order_')` + pass actual unique ID | `review-payment-step.tsx` |
| Onfleet airport geocoding 400 | Onfleet couldn't geocode "JFK International Airport" as a street address | Added `AIRPORT_DESTINATIONS` dict with lat/lng coords for JFK and EWR | `backend/apps/logistics/services.py` |
| Mobile menu scroll | Sign Out button cut off on small screens | Added `max-h-[calc(100vh-80px)] overflow-y-auto` to mobile nav | `main-layout.tsx` |

### UI Improvements

| Item | Description | Files Changed |
|------|-------------|---------------|
| Persistent Book Now button | "Book Now" now always visible in nav (logged in or out, desktop + mobile) | `main-layout.tsx` |
| Services page cleanup | Removed per-service booking buttons, single "Book Now" CTA, added Airport Transfer section | `services/page.tsx` |

---

## February 9–10, 2026

### Bi-Directional Airport Transfer (PR #11)

Extended airport transfer service to support both to-airport (luggage delivery) and from-airport (arrival pickup) directions.

**Backend:**
- `transfer_direction` CharField: `to_airport` (default) / `from_airport`
- `blade_terminal` CharField (max 2 chars, nullable) — JFK terminals: 1,4,5,7,8; EWR: A,B,C
- Ready-time auto-calc only for to_airport; from_airport skips it
- Migration: `0010_add_transfer_direction_terminal`

**Frontend:**
- Direction toggle (radio buttons) in date-time step
- Terminal selector dropdown (filtered by airport)
- UI labels change based on direction ("Flight Departure" vs "Flight Arrival")
- Confirmation email shows direction-specific details

### Security Hardening (PR #10)

7 fixes from the second re-audit round.

| Finding | Severity | Description | Fix |
|---------|----------|-------------|-----|
| R2 | HIGH | Free orders all used same `free_order` ID — no reuse prevention | Unique UUIDs (`free_order_<uuid4>`) + C2 reuse prevention applies |
| R3 | HIGH | Discount code TOCTOU race — usage count checked then updated non-atomically | `select_for_update` in both guest + authenticated serializers |
| R4 | MEDIUM | After partial refund, no subsequent refunds allowed | New `partially_refunded` status, subsequent refunds enabled |
| R7 | MEDIUM | Legacy `PaymentConfirmView` still accessible | Removed entirely |
| R8 | MEDIUM | Authenticated `CreatePaymentIntentView` had no permission class | Added `IsAuthenticated` |
| R10 | MEDIUM | Payment/Refund list+create views open to any authenticated user | Added `IsStaffMember` permission class |
| R11 | LOW | Discount validation error messages revealed whether code existed | Uniform 400 response (no enumeration) |

**Tests:** 16 new tests, 254 total passed, 0 regressions

---

## February 9, 2026

### Payment Flow Hardening (PR #9)

4 fixes to improve payment reliability and prevent orphaned records.

| Finding | Severity | Description | Fix |
|---------|----------|-------------|-----|
| NEW | HIGH | Booking creation not atomic — if Payment.objects.create() failed mid-flow, customer charged but no booking record | Wrapped booking + payment creation in `transaction.atomic()` (both guest + authenticated) |
| #5 gap | MEDIUM | `booking.save()` after status='paid' triggered full pricing recalculation | Added `_skip_pricing=True` (was already used elsewhere from M4 fix) |
| Sentry | MEDIUM | Webhook task crashed with MaxRetriesExceededError for Stripe invoices created outside the app | Graceful handling: log details + return instead of crashing. Increased retry window from ~31s to ~5min |
| #8 gap | LOW | STRIPE_WEBHOOK_SECRET defaulted to empty string in production | Required in production (same pattern as SECRET_KEY from L18) |

**Tests:** 238 passed, 0 regressions (5 pre-existing failures)
**Remaining from re-audit (PR 2+3 planned):** Discount code TOCTOU race, unlimited free orders, partial refund blocking, legacy endpoint cleanup

### Discount Code Bug Fix

Fixed 100% discount codes not applying to blade_transfer bookings. Root cause: `return total_cents` inside blade_transfer pricing block caused early return before discount code section in both `PaymentIntentCreateSerializer._calculate_total_price()` paths (guest + authenticated).

---

## February 7, 2026

### Performance & Code Quality (PR #6)

13 findings fixed from the security audit (1 HIGH, 7 MEDIUM, 5 MINOR). 2 items confirmed already fixed.

| Finding | Severity | Description | Fix |
|---------|----------|-------------|-----|
| H7 | HIGH | `time.sleep()` in Stripe webhook blocked gunicorn workers up to 3.9s | Moved to Celery tasks with exponential backoff retry |
| M2 | MEDIUM | Calendar N+1 queries (120+ for 60-day range) | Bulk query + defaultdict grouping (2 queries total) |
| M3 | MEDIUM | Customer management N+1 (200+ for 100 customers) | Prefetch with to_attr (3 queries total) |
| M4 | MEDIUM | Booking.save() recalculated pricing every time | Added `_skip_pricing` flag for status-only saves |
| M6 | MEDIUM | BrowsableAPI enabled in production | Conditional on DEBUG setting |
| M8 | MEDIUM | PaymentSerializer N+1 on booking relation | Added select_related to PaymentListView |
| M9 | MEDIUM | date.fromisoformat crashed on invalid input | Added try/except returning 400 |
| M10 | MEDIUM | Stripe webhook returned 404/500 causing Stripe retries | Now always returns 200 (async Celery processing) |
| L4 | MINOR | _get_most_used_address ignores address_type | Documented: SavedAddress has no address_type field |
| L5 | MINOR | CustomerBookingListView returned soft-deleted bookings | Added deleted_at__isnull=True filter |
| L9 | MINOR | Refund modal didn't show remaining refundable amount | Shows total_refunded and remaining amount |
| L11 | MINOR | No search debounce on staff management pages | 300ms useDebounce hook on booking + customer search |
| L19 | MINOR | Password reset didn't invalidate previous tokens | Old tokens marked used before creating new one |

**Already fixed (no changes needed):** M7 (pagination — DEFAULT_PAGINATION_CLASS in settings), L7 (console.log — next.config removeConsole)

**New files:** `backend/apps/payments/tasks.py`, `frontend/src/hooks/use-debounce.ts`
**Tests added:** 14 new tests across 4 test files
**Test results:** 199 passed, 0 regressions (5 pre-existing failures)

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

### Security Fixes: 36
- C1: Payment amount verification
- C2: PaymentIntent reuse prevention + guest Payment record
- C3: Onfleet webhook HMAC authentication
- C4: Booking number race condition (atomic generation)
- C5: Customer stats double-counting fix
- H1: Calendar PII stripped for public users
- H2: Booking/payment status UUID-only lookup
- H3: Staff permission classes (replace inline hasattr checks)
- H5: Booking status transition validation
- H7: Webhook time.sleep() replaced with Celery tasks
- H8: Error message sanitization
- M2: Calendar N+1 queries optimized
- M3: Customer management N+1 queries optimized
- M4: Booking.save() _skip_pricing flag
- M6: BrowsableAPI disabled in production
- M8: PaymentSerializer N+1 fixed
- M9: date.fromisoformat error handling
- M10: Stripe webhook always returns 200
- L1: StaffAction view_booking type added
- L4: _get_most_used_address documented
- L5: Soft-deleted bookings filtered
- L9: Refund modal partial refund awareness
- L11: Search debounce (300ms)
- L18: SECRET_KEY required in production
- L19: Password reset token invalidation
- R1: Booking creation atomic transactions
- R2: Free order unique UUIDs
- R3: Discount code TOCTOU race fix
- R4: Partial refund status + subsequent refunds
- R5: _skip_pricing on final booking save
- R6: Webhook task graceful retry exhaustion
- R7: Legacy PaymentConfirmView removed
- R8: Authenticated PI view requires IsAuthenticated
- R9: STRIPE_WEBHOOK_SECRET required in production
- R10: Payment/Refund views require IsStaffMember
- R11: Discount validation uniform error response

### Bugs Fixed: 11
- Double-click login (CSRF)
- Calendar not loading
- Logistics stats empty
- Refresh button no feedback
- Service buttons not working
- Surge pricing only charges once
- Password field not registering
- Customer profile 500 error
- Free order flow (startsWith fix)
- Onfleet airport geocoding (lat/lng coords)
- Mobile menu scroll (overflow fix)

### Features Built: 4
- Reports & Analytics page (full implementation)
- Discount codes (percentage + fixed, per-customer limits, service restrictions)
- Bi-directional airport transfer (to/from airport, terminal selection)
- Item description field for standard delivery

### Email Features: 2
- Calendar invite (.ics) in reminder emails
- Post-delivery review request email

### Content Updates: 6
- Tote Camps footer link
- Hampton Jitney on partnerships page
- Hampton Jitney on homepage
- JFK promo banner/popup
- Persistent Book Now nav button
- Services page cleanup

### Infrastructure Fixes: 6
- Stripe webhook retry logic
- Onfleet webhook retry logic
- Onfleet Trigger 7 handler
- Celery beat memory scaling
- Google Places API billing enabled
- api.totetaxi.com subdomain + SSL

---

## Pending Work

### Proposed Features (Approved Jan 9)

| Feature | Estimate | Priority | Status |
|---------|----------|----------|--------|
| Discount Codes | 10-12 hours | HIGH | **DONE** (PR #8) |
| Item Description Field | 5-6 hours | MEDIUM | **DONE** (Feb 11) |
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
