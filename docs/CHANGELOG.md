# ToteTaxi Development Changelog

**Project:** ToteTaxi Platform
**Last Updated:** April 2, 2026

---

## Summary

This document tracks all completed development work for client presentation and internal reference.

---

## April 2, 2026

### Payment Security Audit & Hardening

Comprehensive audit of the March 31 payment recovery system found 1 critical, 3 high, and 4 medium issues. All critical and high issues fixed in two commits.

**Critical fix — 3D Secure guest checkout broken:**
- `customer_info` (name, email, phone) was deliberately stripped from localStorage by the Zustand `partialize` function (PII protection). But after a 3D Secure redirect (full page reload), the `/booking-success` page needs this data to create the guest booking. The POST sent `undefined` for all required fields → 400 → customer charged with no booking.
- Fix: `customer_info` is now conditionally persisted to localStorage only when `pendingPaymentIntentId` is set (active payment flow). Cleared when the PI is cleared on booking completion.

**Critical fix — PaymentIntent session binding (stolen-PI replay):**
- Anyone who obtained a succeeded PI id (from Stripe dashboard, logs, URLs) could craft a request to create a booking against someone else's charge. The backend only checked `status=succeeded`, not PI ownership.
- Fix: Backend generates a random UUID `booking_token` at PI creation time, stores it in Stripe PI metadata, and returns it to the frontend. Booking creation views now verify the submitted token matches the PI metadata. Backwards compatible — PIs created before this deploy skip verification.

**High fixes:**

| Issue | Description | Fix |
|-------|-------------|-----|
| Orphan alert audit ordering | `PaymentAudit(action='orphan_alert_sent')` was written before `send_mail()` — failed email permanently skipped orphans | Moved audit writes to after email succeeds |
| Infinite retry loop | Server-rejected booking creation (400/422) never cleared `pendingPaymentIntentId` — recovery fired on every page visit | `clearPendingPaymentIntentId()` called on all server rejection paths |
| C2 reuse race condition | PI reuse check ran outside `transaction.atomic()` — two concurrent requests could both pass it | Moved inside atomic block with `select_for_update()` |
| Cleanup hiding charged payments | `cleanup_orphaned_payments` could mark a payment as `failed` even though Stripe captured funds (webhook failure left DB at `pending`) | Task now calls `stripe.PaymentIntent.retrieve()` before expiring; updates DB to `succeeded` if PI was actually captured |

**Other fixes:**
- Store version migration now preserves `pendingPaymentIntentId` and `pendingBookingToken` across version bumps to avoid orphaning in-flight payments during deploys

**Files changed:** `payments/tasks.py`, `bookings/views.py`, `customers/booking_views.py`, `booking-store.ts`, `review-payment-step.tsx`, `booking-success/page.tsx`
**Tests:** 327 passed, 0 regressions

---

## March 31, 2026

### Payment Recovery & Orphan Detection

Second incident of a customer being charged with no booking created (Maya Seidler, $285 Standard Delivery). Same root cause as March 18: the frontend POST to create the booking never reached the server after Stripe charged the card. The March 18 database fix worked — a Payment record existed — but the frontend gap was never closed.

**What changed:**

1. **Orphan alert emails (backend)** — New Celery task runs every 15 minutes. Detects payments that succeeded but have no booking after 10 minutes, emails staff with customer details and Stripe dashboard link. Uses `PaymentAudit` to prevent re-alerting.

2. **Payment recovery (frontend)** — The `paymentIntentId` is now persisted to localStorage via the Zustand booking store (version 8). If a customer refreshes or returns after paying, the app detects the pending payment and auto-retries booking creation. Also added automatic retry (2 attempts, 3s delay) on the booking creation mutation.

3. **3D Secure redirect handling (frontend)** — Created `/booking-success` page to handle Stripe redirects after 3D Secure authentication. Previously, the `return_url` pointed to a non-existent route — any 3DS redirect would have landed on a 404.

4. **Enriched Stripe PI metadata (backend)** — PaymentIntent metadata now includes customer name, phone, pickup date, and time (both guest and authenticated flows). Enables staff to identify orphaned payments and enables future auto-recovery.

**Bug fixes:**
- Fixed Django admin `ValueError` when creating bookings — `calculate_pricing()` accessed M2M `specialty_items` before the model was saved.
- Fixed misleading `CRITICAL` log on pricing-preview endpoint — was logged as "blocked booking AFTER payment" but it's a pre-payment check.

**Files changed:** `payments/tasks.py`, `config/settings.py`, `bookings/views.py`, `bookings/models.py`, `customers/booking_views.py`, `booking-store.ts`, `review-payment-step.tsx`, `booking-success/page.tsx` (new)

---

### Operational Fixes (March 21–23)

Bug fixes and infrastructure improvements deployed between March 21–23.

| Item | Description |
|------|-------------|
| OOM fix | Bumped web VM to 2GB, reduced gunicorn workers from 4 to 3 |
| Health endpoint | Added `/health/` for UptimeRobot monitoring |
| SEO assets | Added robots.txt, sitemap.xml, Google Search Console verification, fixed web manifest |
| Google Places parsing | Fixed address autocomplete crash when city/state/zip missing from API response |
| Guest checkout KeyError | Fixed staff logistics tasks endpoint crashing on guest bookings |
| N+1 query | Fixed N+1 on staff dashboard urgent bookings query |

---

## March 18, 2026

### Payment Architecture Fix — Orphaned Payment Prevention

Fixed a critical architecture issue where customers could be charged via Stripe but no record existed in the database. This happened when the frontend crashed or the browser closed after payment but before the booking creation request fired.

**Root cause:** A browser extension (password manager) crash on the `/book` page killed the JavaScript runtime after Stripe charged the card. The booking POST never executed. Confirmed via Sentry (`TOTETAXI-NEXT-4`).

**What changed:**
- Payment records are now created at PaymentIntent time (before the customer pays), not at booking time (after). Any charge on Stripe always has a matching database record.
- Booking creation finds and links the existing Payment instead of creating a new one.
- Webhook tasks handle payments with no booking gracefully — no more 5-minute retry loops ending in `ORPHANED PAYMENT` log messages.
- Daily cleanup task (6am) expires abandoned Payment records older than 24 hours and cancels their Stripe PaymentIntents.
- Null-safety guards added across 8 files (~20 locations) for the nullable `Payment.booking` FK.
- Revenue/analytics queries exclude unlinked payments to prevent inflation.

**Files changed:** `payments/models.py`, `payments/tasks.py`, `payments/views.py`, `payments/services.py`, `payments/serializers.py`, `payments/admin.py`, `bookings/views.py`, `customers/booking_views.py`, `accounts/views.py`, `config/settings.py`
**Migration:** `payments/0005_make_booking_nullable`
**Tests:** 182 passed, 0 regressions

---

## February 13, 2026

### AI Chat Assistant

Customer-facing AI chat agent available on all public pages as a floating chat bubble. Answers questions about services, pricing, coverage areas, and availability in natural conversation. Authenticated customers can also check booking status and history. When a customer is ready to book, the agent pre-fills the booking wizard with discussed details and hands off seamlessly.

**Backend — LangGraph Agent (`apps/assistant/`):**
- LangGraph ReAct agent with Claude Sonnet, `temperature=0.3`
- 6 read-only tools: `check_zip_coverage`, `get_pricing_estimate`, `check_availability`, `lookup_booking_status`, `lookup_booking_history`, `build_booking_handoff`
- Auth-aware: anonymous users get public tools; authenticated users also get booking lookup tools
- SSE streaming via `StreamingHttpResponse` with 5 event types: `token`, `tool_call`, `tool_result`, `done`, `error`
- Conversation memory: frontend sends full chat history with each request (max 30 messages); backend rebuilds conversation context
- ~3k token system prompt with all business knowledge (no RAG needed)
- Rate limited: 20 requests/hour per IP
- Health check endpoint: `GET /api/assistant/health/`
- Booking handoff pre-fills 21 fields: service type, tier, item count/description, bag count, transfer direction, airport, pickup/delivery addresses, date, packing/unpacking, COI, special instructions

**Frontend — Chat Widget (`components/chat/`):**
- Floating bubble (bottom-right, navy-900) on all customer-facing pages; hidden on `/staff/*`
- Custom `useChatStream` hook with native `fetch()` + `ReadableStream` for SSE parsing
- Auth headers: cookies, CSRF token, X-Session-Id (mobile fallback)
- Markdown rendering (bold, lists, spacing), typing indicator, tool activity labels
- Booking handoff: "Start Booking" button pre-fills wizard via `updateBookingData()` and navigates to `/book`
- "AI-powered" disclosure in chat header (FTC compliance)
- 500-char input limit, disabled during streaming, auto-scroll on new messages

**Deployment:**
- Gunicorn switched from sync to gevent workers (`--worker-class gevent --worker-connections 100`)
- Gevent enables hundreds of concurrent SSE streams on 4 workers (sync = max 4 concurrent chats)
- Requires `ANTHROPIC_API_KEY` Fly.io secret

**New files:** `backend/apps/assistant/` (12 files), `frontend/src/hooks/use-chat-stream.ts`, `frontend/src/components/chat/` (2 files), `docs/BUILD_LOG.md`
**Tests:** 42 new backend tests (27 tool + 15 view), 307 total passed, 0 regressions

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

### Security Fixes: 38
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
- A1: Booking token session binding (stolen-PI replay prevention)
- A2: C2 reuse check moved inside transaction.atomic with select_for_update

### Bugs Fixed: 21
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
- Google Places address parsing (missing city/state/zip)
- Guest checkout KeyError on staff logistics
- N+1 query on staff dashboard urgent bookings
- Admin M2M ValueError on booking creation
- Misleading CRITICAL log on pricing-preview
- Missing /booking-success route (3D Secure time bomb)
- 3D Secure guest checkout losing customer_info on redirect
- Orphan alert audit written before email (silent loss)
- Infinite retry loop on server-rejected booking creation
- Cleanup task hiding Stripe-captured payments as failed

### Features Built: 6
- Reports & Analytics page (full implementation)
- Discount codes (percentage + fixed, per-customer limits, service restrictions)
- Bi-directional airport transfer (to/from airport, terminal selection)
- Item description field for standard delivery
- AI chat assistant (LangGraph + Claude, SSE streaming, 6 tools, booking handoff)
- Payment recovery system (orphan alerts, frontend retry, 3D Secure handling)

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

### Infrastructure Fixes: 9
- Stripe webhook retry logic
- Onfleet webhook retry logic
- Onfleet Trigger 7 handler
- Celery beat memory scaling
- Google Places API billing enabled
- api.totetaxi.com subdomain + SSL
- Health endpoint for uptime monitoring
- OOM fix (2GB VM, 3 workers)
- SEO assets (robots.txt, sitemap, Search Console)

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
