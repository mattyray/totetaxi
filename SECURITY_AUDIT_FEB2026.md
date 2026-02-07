# ToteTaxi Security Audit & Fix Plan
**Date:** February 6, 2026
**Audited by:** Claude Code (code-reviewer + ecommerce-security agents)
**Status:** PR 1 & PR 2 merged & deployed, PR 3 merged & deployed

---

## Table of Contents
1. [Findings Summary](#findings-summary)
2. [Existing Test Coverage](#existing-test-coverage)
3. [Fix Plan by PR](#fix-plan-by-pr)
4. [Test Plan](#test-plan)
5. [Deployment Strategy](#deployment-strategy)
6. [Verification Checklist](#verification-checklist)

---

## Findings Summary

### CRITICAL — Fix Before Next Deploy

| ID | Finding | Files | Test Coverage |
|----|---------|-------|---------------|
| C1 | **Payment amount never verified** — booking creation checks `payment_intent.status == 'succeeded'` but never checks amount matches booking total. Attacker could pay $1 and book a $2,500 move. | `bookings/views.py:554-572`, `customers/booking_views.py:110-128` | **FIXED** PR #4 |
| C2 | **PaymentIntent reuse** — no check prevents using one successful PI to create multiple bookings. Guest flow doesn't even create a Payment record. | `bookings/views.py:535-617`, `customers/booking_views.py:84-185` | **FIXED** PR #4 |
| C3 | **Onfleet webhook has zero auth** — no signature verification despite `ONFLEET_WEBHOOK_SECRET` in settings. Anyone can POST fake task completions to mark bookings complete. | `logistics/views.py:127-198` | **FIXED** PR #4 |
| C4 | **Booking number race condition** — concurrent saves generate same `TT-XXXXXX`, one crashes with unhandled `IntegrityError` after payment. | `bookings/models.py:327-336` | **FIXED** PR #5 — atomic select_for_update |
| C5 | **Double-counting customer stats** — both `confirm_payment()` and `_mark_booking_completed()` increment `total_bookings` and `total_spent_cents`. | `payments/services.py:78-85`, `logistics/models.py:153-174` | **FIXED** PR #5 — removed duplicate, F() expressions |

### HIGH — Fix Within One Sprint

| ID | Finding | Files | Test Coverage |
|----|---------|-------|---------------|
| H1 | **Calendar endpoint leaks all booking PII publicly** — customer names, prices, booking numbers via `AllowAny` permission. | `bookings/views.py:419-483` | **FIXED** PR #4 |
| H2 | **Booking status endpoint enumerable** — sequential `TT-000001` + `AllowAny` = mass scraping of customer names and full addresses. | `bookings/views.py:620-633` | **FIXED** PR #4 |
| H3 | **Staff role permissions never enforced** — `staff` and `admin` roles exist but every view just checks `hasattr(request.user, 'staff_profile')`. Any staff can process unlimited refunds. | `accounts/views.py` (15+ locations), `payments/views.py:521-629` | **FIXED** PR #5 — IsStaffMember/IsAdminStaff permission classes |
| H4 | **`StaffProfile.lock_account` broken** — references `timezone.timedelta` which doesn't exist. Account lockout crashes instead of working. | `accounts/models.py:84` | **NOT BROKEN** — Django re-exports timedelta from datetime |
| H5 | **Booking status accepts any arbitrary string** — staff PATCH doesn't validate against `STATUS_CHOICES`. | `accounts/views.py:696-734` | **FIXED** PR #5 — VALID_TRANSITIONS state machine |
| H6 | **HybridAuthentication bypasses CSRF** — overrides `authenticate()` without calling `enforce_csrf()`. | `customers/authentication.py:8-58` | SKIPPED — low risk (CORS + SameSite + separate domains) |
| H7 | **`time.sleep()` in Stripe webhook** — blocks gunicorn workers up to 3.9 seconds per retry, can exhaust all workers. | `payments/views.py:200-217` | **FIXED** PR #6 — Celery tasks with exponential backoff |
| H8 | **Raw `str(e)` in error responses** — leaks Stripe API details, DB schema, file paths to clients. | Multiple views across payments, bookings, logistics, customers | **FIXED** PR #4 |

### MEDIUM

| ID | Finding | Files |
|----|---------|-------|
| M1 | No rate limiting on payment intent creation endpoints (Stripe cost amplification) | `bookings/views.py`, `payments/views.py`, `customers/booking_views.py` |
| M2 | Calendar availability: 120+ DB queries for 60-day range (N+1) | `bookings/views.py:437-477` | **FIXED** PR #6 — bulk query + defaultdict |
| M3 | Customer management: 200+ queries for 100 customers (N+1) | `accounts/views.py:242-273` | **FIXED** PR #6 — Prefetch with to_attr |
| M4 | `Booking.save()` recalculates pricing every time — can silently change prices after config updates | `bookings/models.py:327-358` | **FIXED** PR #6 — _skip_pricing flag |
| M5 | Webhook idempotency on volatile Redis (lost on restart, 24h TTL < Stripe's 72h retry) | `payments/views.py:170-177` |
| M6 | BrowsableAPI enabled in production | `config/settings.py:200-213` | **FIXED** PR #6 — conditional on DEBUG |
| M7 | Payment/Refund list views have no pagination | `payments/views.py:484-518` | **ALREADY FIXED** — DEFAULT_PAGINATION_CLASS in settings |
| M8 | PaymentSerializer N+1 on booking relation | `payments/serializers.py:35-39` | **FIXED** PR #6 — select_related |
| M9 | `date.fromisoformat` crashes on invalid input (public endpoint) | `bookings/views.py:424-432` | **FIXED** PR #6 — try/except ValueError |
| M10 | Stripe webhook returns 404/500 instead of 200 (causes unwanted retries) | `payments/views.py:280-296` | **FIXED** PR #6 — Celery async dispatch always returns 200 |

### MINOR

| ID | Finding | Files |
|----|---------|-------|
| L1 | `StaffAction.log_action` called with invalid `action_type` `'view_booking'` | `accounts/views.py:495` — **FIXED** PR #5 |
| L2 | `sync_onfleet_status` is a stub that doesn't actually sync | `logistics/views.py:46-79` |
| L3 | Dead `try/except DoesNotExist` on `.filter().first()` calls | `bookings/models.py`, `bookings/views.py`, `bookings/serializers.py` |
| L4 | `_get_most_used_address` ignores `address_type` parameter | `customers/booking_views.py:322-323` | **DOCUMENTED** PR #6 — SavedAddress has no address_type field |
| L5 | `CustomerBookingListView` returns soft-deleted bookings | `customers/views.py:351-352` | **FIXED** PR #6 — filter deleted_at__isnull=True |
| L6 | Duplicate `BookingData`/`BookingAddress` type definitions | `frontend/src/types/index.ts`, `frontend/src/stores/booking-store.ts` |
| L7 | Console.log throughout production frontend code | Multiple frontend files | **ALREADY FIXED** — next.config removeConsole strips in prod |
| L8 | `useRecalculatePricing` stale closure (empty dependency array) | `frontend/src/components/booking/review-payment-step.tsx:128-189` |
| L9 | Refund modal doesn't account for prior partial refunds (client-side only) | `frontend/src/components/staff/refund-modal.tsx:47-54` | **FIXED** PR #6 — shows remaining refundable amount |
| L10 | Floating-point arithmetic for monetary dollar calculations | Multiple `*_dollars` properties |
| L11 | No search debounce on booking/customer management | `frontend/src/components/staff/booking-management.tsx:124-125` | **FIXED** PR #6 — 300ms useDebounce hook |
| L12 | Duplicate view classes across `customers/views.py` and `customers/booking_views.py` | Both files |
| L13 | `CustomerNotesUpdateView` in customers app has no audit logging (unlike accounts version) | `customers/views.py:375-398` |
| L14 | Booking wizard auto-skip step 4 fragile pattern | `frontend/src/components/booking/booking-wizard.tsx:86-91` |
| L15 | `401` response interceptor clears both auth stores on any 401 | `frontend/src/lib/api-client.ts:64-87` — **FIXED** (scoped to matching store) |
| L16 | `CustomerProfile.add_booking_stats` no concurrency protection (needs F() expressions) | `customers/models.py:141-146` — **FIXED** PR #5 |
| L17 | Signal-based Onfleet task creation runs on every `Booking.save()` | `logistics/models.py:181-205` |
| L18 | `SECRET_KEY` has insecure default fallback | `config/settings.py:25` — **FIXED** PR #5 |
| L19 | Password reset doesn't invalidate previous tokens | `customers/views.py:484-525`, `customers/models.py:41-73` | **FIXED** PR #6 — invalidate old tokens on new request |
| L20 | Session ID logged in plaintext (partial, 10 chars) | `customers/authentication.py:32-50` |

### Positive Security Controls (Already Done Right)
- Stripe webhook signature verification (properly implemented)
- Server-side pricing calculation (frontend prices never trusted)
- Rate limiting on auth endpoints (login, register, password reset)
- No raw SQL anywhere (ORM only, no injection risk)
- Security headers in production (HSTS, XSS filter, content-type nosniff)
- Sentry PII protection (`send_default_pii=False`)
- Email verification required for new accounts
- Comprehensive audit logging for staff actions
- Hybrid account prevention (can't be both staff and customer)
- Django password validation suite enabled
- Soft deletion with proper filtering
- CORS properly restricted

---

## Existing Test Coverage

### What's Well Covered
| Area | Files | Cases | Notes |
|------|-------|-------|-------|
| Booking pricing | `test_pricing.py`, `test_booking_flow.py` | ~12 | All package types, surcharges, specialty items |
| Payment flow | `test_stripe.py`, `test_stripe_integration.py`, `test_refunds.py` | ~12 | PI creation, confirmation, refunds, errors |
| Onfleet tasks | `test_task_creation.py` | ~30 | Task creation, state mapping, phone formatting, signals |
| Onfleet webhooks | `test_webhooks.py` | ~15 | All 8 trigger types, error handling, backward compat |
| Logistics views | `test_views.py` | ~23 | Staff endpoints, auth checks, CRUD |
| Customer auth | `test_api.py` | ~16 | Registration, login, password reset, email verification |
| Auth security | `test_security.py` | ~3 | Hybrid account prevention, role isolation |
| Emails | `test_emails.py` | ~12 | 6 email types, content validation, idempotency |
| Celery tasks | `test_tasks.py` | ~6 | Reminder logic, date filtering, status filtering |
| Frontend E2E | 8 Playwright files | ~32 | Booking wizard flows, pricing display, validation |

### Critical Gaps (Need Tests Before Fixing)
| Gap | Relevant Findings | Priority |
|-----|-------------------|----------|
| Payment amount verification (PI amount vs booking total) | C1, C2 | CRITICAL |
| PaymentIntent reuse prevention | C2 | CRITICAL |
| Onfleet webhook signature verification | C3 | CRITICAL |
| Concurrent booking number generation | C4 | CRITICAL |
| Customer stats double-counting | C5 | CRITICAL |
| Staff role-based permissions | H3 | HIGH |
| Public endpoint data exposure | H1, H2 | HIGH |
| Booking status validation | H5 | HIGH |
| `lock_account` functionality | H4 | HIGH |

---

## Fix Plan by PR

### PR 1: Critical Security Fixes
**Branch:** `fix/critical-security`
**Priority:** Ship ASAP
**Estimated scope:** ~10 files changed

#### Fixes Included:
1. **C1 + C2: Payment flow integrity**
   - Add amount verification: after retrieving PI from Stripe, assert `payment_intent.amount == booking.calculate_total()` before marking paid
   - Add PI reuse check: query for existing booking with same `payment_intent_id`, reject if found
   - Create Payment record for guest bookings (currently missing)
   - Files: `bookings/views.py`, `customers/booking_views.py`

2. **C3: Onfleet webhook authentication**
   - Implement HMAC signature verification using `ONFLEET_WEBHOOK_SECRET` from settings
   - Return 401 on invalid/missing signature
   - File: `logistics/views.py`

3. **H1 + H2: Public endpoint lockdown**
   - `CalendarAvailabilityView`: strip PII (remove customer names, prices, booking IDs) — return only date + slot count for public use
   - `BookingStatusView`: require auth OR add a non-guessable token (e.g., UUID lookup instead of sequential booking number)
   - `PaymentStatusView`: same treatment
   - Files: `bookings/views.py`, `bookings/serializers.py`

4. **H8: Error message sanitization**
   - Replace `str(e)` in all API responses with generic messages
   - Keep detailed errors in server logs only
   - Files: `payments/views.py`, `bookings/views.py`, `logistics/views.py`, `customers/booking_views.py`

#### Tests to Write:
```
test_payment_security.py
- test_booking_rejected_when_pi_amount_mismatches_total
- test_booking_rejected_when_pi_already_used
- test_guest_booking_creates_payment_record
- test_payment_amount_matches_booking_after_surcharges

test_webhook_auth.py
- test_onfleet_webhook_rejects_missing_signature
- test_onfleet_webhook_rejects_invalid_signature
- test_onfleet_webhook_accepts_valid_signature

test_public_endpoints.py
- test_calendar_does_not_expose_customer_names
- test_calendar_does_not_expose_booking_ids
- test_booking_status_requires_auth_or_token
- test_payment_status_requires_auth_or_token
- test_sequential_booking_numbers_not_enumerable

test_error_responses.py
- test_payment_error_does_not_leak_stripe_details
- test_booking_error_does_not_leak_db_schema
```

#### Existing Tests to Verify Still Pass:
- `test_stripe.py` (all)
- `test_stripe_integration.py` (all)
- `test_booking_flow.py` (all)
- `test_webhooks.py` (all)
- `test_task_creation.py` (all)

---

### PR 2: Auth, Permissions & State Integrity
**Branch:** `fix/auth-permissions`
**Priority:** Important — fix within one sprint
**Estimated scope:** ~8 files changed

#### Fixes Included:
1. **H3: Staff role enforcement**
   - Create `IsStaffMember` and `IsAdminStaff` DRF permission classes
   - Apply `IsAdminStaff` to refund processing, report generation
   - Apply `IsStaffMember` to all other staff views
   - Replace all `hasattr(request.user, 'staff_profile')` ad-hoc checks
   - Files: new `accounts/permissions.py`, `accounts/views.py`, `payments/views.py`, `logistics/views.py`

2. **H4: Fix broken `lock_account`**
   - Change `timezone.timedelta` to `timedelta` (from `datetime import timedelta`)
   - File: `accounts/models.py`

3. **H5: Booking status validation**
   - Validate `new_status in dict(Booking.STATUS_CHOICES)` before saving
   - File: `accounts/views.py`

4. **H6: CSRF enforcement in HybridAuthentication**
   - Add `self.enforce_csrf(request)` call for cookie-based auth path
   - File: `customers/authentication.py`

5. **C4: Booking number race condition**
   - Replace manual counter with DB sequence or atomic `SELECT FOR UPDATE`
   - Add retry logic for `IntegrityError` on `booking_number`
   - File: `bookings/models.py`

6. **C5: Double-counting customer stats**
   - Remove stat increment from `confirm_payment()` — keep only in `_mark_booking_completed()`
   - Use `F()` expressions for atomic updates (also fixes L16)
   - Files: `payments/services.py`, `logistics/models.py`, `customers/models.py`

7. **L1: Fix invalid `StaffAction` action type**
   - Add `'view_booking'` to `ACTION_TYPES`
   - File: `accounts/models.py`

8. **L18: Remove insecure SECRET_KEY default**
   - Remove default value, require env var
   - File: `config/settings.py`

#### Tests to Write:
```
test_staff_permissions.py
- test_staff_role_cannot_process_refunds
- test_admin_role_can_process_refunds
- test_staff_role_cannot_access_reports (if desired)
- test_admin_role_can_access_reports

test_account_lockout.py
- test_lock_account_sets_locked_until
- test_locked_account_rejects_login
- test_lock_expires_after_duration

test_booking_status_validation.py
- test_invalid_status_rejected
- test_valid_status_transitions_allowed

test_booking_number_concurrency.py
- test_concurrent_booking_creation_no_duplicates

test_customer_stats.py
- test_stats_incremented_once_not_twice_on_completion
- test_concurrent_stat_updates_use_f_expressions
```

#### Existing Tests to Verify Still Pass:
- `test_security.py` (all)
- `test_api.py` (all customer auth)
- `test_booking_flow.py` (all)
- `test_refunds.py` (all)
- `test_views.py` (logistics staff endpoints)

---

### PR 3: Performance & Code Quality
**Branch:** `fix/performance-cleanup`
**Priority:** No security risk — ship when ready
**Estimated scope:** ~15 files changed

#### Fixes Included:
1. **M2: Calendar N+1 queries** — prefetch surcharge rules, single booking query with date range
2. **M3: Customer management N+1** — add `prefetch_related('bookings', 'saved_addresses')`
3. **M4: Pricing recalc on every save** — only recalculate when pricing-relevant fields change
4. **M6: Disable BrowsableAPI in production** — wrap in `if DEBUG`
5. **M7: Add pagination to payment/refund list views**
6. **M8: PaymentSerializer N+1** — add `select_related('booking', 'booking__customer')`
7. **M9: `date.fromisoformat` error handling** — add try/except with 400 response
8. **M10: Stripe webhook return 200 always** — match Onfleet pattern
9. **H7: Move webhook retry to Celery** — replace `time.sleep()` with async task
10. **L5: Filter soft-deleted bookings in CustomerBookingListView**
11. **L7: Strip console.log from production frontend** — or gate behind `NODE_ENV`
12. **L11: Add search debounce** — 300ms on booking/customer management search inputs
13. **L4: Fix `_get_most_used_address`** — use `address_type` parameter
14. **L9: Refund modal partial refund awareness** — check remaining refundable amount
15. **L19: Invalidate previous password reset tokens**

#### Tests (Light):
- Verify existing pricing tests still pass after M4
- Verify existing payment tests still pass after M10
- Manual smoke test booking flow after M4 changes

---

## Deployment Strategy

### Pre-Deploy
- [ ] All existing tests pass (`pytest` backend, `npx playwright test` frontend)
- [ ] New tests pass for the PR being deployed
- [ ] Manual smoke test of booking flow locally

### PR 1 Deployment (Critical Security)
1. Deploy to staging (Fly.io staging app)
2. Smoke test:
   - Create a test booking — verify payment amount is checked
   - Try to reuse a PaymentIntent — verify rejection
   - Hit `/api/public/availability/` — verify no PII in response
   - Hit `/api/public/booking-status/TT-000001/` — verify blocked or stripped
   - Send fake POST to Onfleet webhook — verify 401
3. Deploy to production during low traffic
4. Post-deploy: create a real test booking with test card, refund it
5. Monitor Sentry for 1 hour

### PR 2 Deployment (Auth & Permissions)
1. Deploy to staging
2. Smoke test:
   - Log in as staff (non-admin) — verify refund endpoint returns 403
   - Log in as admin — verify refund works
   - Create booking — verify booking number generated correctly
   - Fail login 5 times — verify account locks
3. Deploy to production
4. Monitor Sentry

### PR 3 Deployment (Performance)
1. Deploy to staging
2. Smoke test:
   - Load staff dashboard — verify speed improvement
   - Create a booking — verify pricing unchanged
   - Check Stripe webhook handling still works
3. Deploy to production
4. Monitor Sentry + check response times

### Rollback Plan
```bash
# Check recent releases
fly releases -a totetaxi

# Roll back to previous release
fly deploy --image <previous-image> -a totetaxi
```
If anything breaks: revert first, debug second.

---

## Verification Checklist

After all PRs are merged and deployed:

- [ ] Re-run code-reviewer agent scoped to changed files
- [ ] Re-run ecommerce-security agent scoped to payment + auth + webhook files
- [ ] Cross-reference new findings against this document
- [ ] Update finding statuses (open -> fixed)
- [ ] All existing tests still pass
- [ ] All new tests pass
- [ ] Production smoke test: full booking + payment + delivery flow
- [ ] Sentry clean for 24 hours post-deploy

---

## Session Notes

### Test Infrastructure Available
- Backend: pytest + pytest-django + factory-boy + faker
- Frontend: Playwright (Chromium, E2E)
- Stripe: Test mode keys available, mock PaymentIntent in tests
- Onfleet: Mock mode built in, conftest forces mock in test env
- Emails: Django test mail.outbox

### Tests That Already Exist (Don't Rewrite)
- Pricing calculation (all package types, surcharges)
- Payment intent creation + confirmation
- Refund processing (full + partial)
- Onfleet task creation + webhook handling
- Customer auth (register, login, verify, reset)
- Email sending + content
- Celery reminder tasks

### Tests to Write (New)
- Payment amount mismatch rejection
- PaymentIntent reuse rejection
- Onfleet webhook signature verification
- Staff role-based access control
- Public endpoint PII stripping
- Account lockout functionality
- Booking status validation
- Concurrent booking number generation
- Customer stats single-count verification
- Error response sanitization
