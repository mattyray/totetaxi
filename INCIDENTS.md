# ToteTaxi Incident Log

A running record of production incidents, edge cases, and anomalies for reference across conversations.

---

## INC-001: Orphaned Stripe Payment — Customer Charged With No Booking

**Date:** 2026-03-17
**Severity:** Critical
**Customer:** amanda.b.lightman@gmail.com
**Amount:** $1,725.00
**Stripe PI:** `pi_3TC2xDIOokQBXWLK1qfoesmI`
**Stripe Event:** `evt_3TC2xDIOokQBXWLK1k0pCidp`
**Status:** RESOLVED — fix deployed 2026-03-18

### What Happened

Customer was charged $1,725 for a Mini Move but no Booking or Payment record exists in the database. The Celery webhook task retried 10 times over ~5 minutes looking for a matching Payment record, never found one, and logged:

```
CRITICAL: ORPHANED PAYMENT: Stripe PI pi_3TC2xDIOokQBXWLK1qfoesmI succeeded ($1725.00)
but no Payment record found after 10 retries.
Customer: amanda.b.lightman@gmail.com. Service: mini_move.
MANUAL REFUND REQUIRED via Stripe dashboard.
```

No `POST /api/public/guest-booking/` request from this customer appears in the server logs. The booking creation request either never fired or was lost.

Additionally, 3 more PaymentIntents were created in quick succession ($1,725 each): `pi_3TC35i...`, `pi_3TC36G...`, `pi_3TC37J...`. Unknown if these were also charged.

### Root Cause

The guest and authenticated booking flows use a two-step architecture with a gap where money is at risk:

1. `POST /api/public/create-payment-intent/` — creates Stripe PI, returns client_secret. **No Payment or Booking record created in DB.** PI metadata only has `customer_email` and `service_type`, no `booking_id`.
2. Customer pays via Stripe Elements — card charged immediately. Stripe fires `payment_intent.succeeded` webhook.
3. `POST /api/public/guest-booking/` — creates both Booking and Payment record in one atomic transaction. **If this never runs, the charge is orphaned.**

The webhook task (backend/apps/payments/tasks.py) queries `Payment.objects.get(stripe_payment_intent_id=pi_id)`. Since the Payment is only created in step 3, if step 3 fails the webhook finds nothing.

### Affected Flows

| Flow | Vulnerable | Why |
|------|-----------|-----|
| Guest booking | YES (confirmed) | PI created without Payment record. Booking POST creates both. |
| Authenticated customer booking | YES (same architecture) | Same two-step pattern. Not yet triggered — likely because logged-in users have pre-filled name/email reducing errors. |
| Staff booking | NO | Uses Checkout Sessions. Booking created first, then checkout link generated. `booking_id` in metadata. |

### Known Failure Modes

1. **Booking POST never fires** — customer closes tab, browser crashes, navigates away after paying (most likely Amanda's case)
2. **Booking POST fails** — network error, backend validation error, 500. Frontend shows fallback error with phone number.
3. **Frontend JS crash** — Sentry `TOTETAXI-NEXT-4` (UnhandledRejection on `/book`) seen same day. Could prevent `createBookingMutation` from executing.
4. **Stale form state** — multiple PI creation attempts corrupt frontend state, causing booking POST to send invalid data

### Proposed Fix

Move Payment record creation from step 3 to step 1. When the PaymentIntent is created, also create a `Payment` record with `status='pending'` and no booking. The booking creation step then links the existing Payment to the new Booking.

**Changes required:**
- Make `Payment.booking` nullable (migration)
- Create Payment in both PI creation views (guest + authenticated)
- Update both booking creation views to find and link existing Payment
- Update webhook task to handle Payment with null booking
- Audit all `payment.booking` references for null safety

**Considerations:**
- Multiple PIs per session → multiple pending Payment records. Need admin visibility or cleanup.
- `Payment.booking` FK is `on_delete=PROTECT`. Making nullable requires null checks everywhere.
- The C2 reuse prevention check (`booking__isnull=False`) already handles nullable correctly.

### Sentry Investigation (2026-03-18)

**TOTETAXI-NEXT-4** — `UnhandledRejection: Object Not Found Matching Id:3, MethodName:update, ParamCount:4` on `/book`. Confirmed as the cause of Amanda's failed booking POST. This is a **browser extension error** (password manager like LastPass/Bitwarden) injecting into the DOM and crashing when React re-renders form elements. No stacktrace (third-party code). Amanda was on Windows 7 / Chrome 140. This error has occurred **6 times** since 2025-12-01 — it will recur because we can't control user extensions.

**TOTETAXI-NEXT-A** — `Failed to load chunk` on `/book` (3 users same day). Unrelated — network/cache issue, not specific to Amanda's session.

### Resolution (2026-03-18)

Fix deployed across 5 commits (`198105c` through `799dd02`):

1. **Payment record created at PaymentIntent time** — `Payment(booking=None, status='pending')` is created immediately when Stripe PI is created, before the customer pays. The webhook will always find it.
2. **Booking creation links existing Payment** — instead of creating a new Payment, the booking view finds the existing one via `select_for_update()` and links it to the booking.
3. **Webhook task null-safe** — handles `payment.booking is None` gracefully. Uses `select_for_update()` with `transaction.atomic()` to prevent race condition with the booking view.
4. **~20 null-safety guards** — across models, serializers, admin, views, services, tasks.
5. **Revenue queries filtered** — `booking__isnull=False` prevents orphaned payments from inflating revenue.
6. **Orphan cleanup task** — Celery Beat runs daily at 6am, expires `Payment(booking=None, status='pending')` older than 24h, cancels Stripe PIs.
7. **CLAUDE.md updated** — nullable FK gotchas, `select_for_update` limitation, disabled `release_command`.

**Production issues found during smoke testing:**
- `PaymentAdmin.get_customer_name` used `full_name` instead of `get_full_name()` — pre-existing bug surfaced
- Docker build cache didn't pick up migration file — required `--no-cache` deploy
- `release_command` is disabled on Fly.io (OOM) — migration had to be run manually via SSH
- Race condition between webhook task and booking view — webhook overwrote booking link. Fixed with `select_for_update()` in the webhook task.
- PostgreSQL error: `FOR UPDATE cannot be applied to the nullable side of an outer join` — removed `select_related('booking')` from `select_for_update()` call.

### Action Items

- [ ] Refund Amanda: `pi_3TC2xDIOokQBXWLK1qfoesmI` ($1,725)
- [ ] Check if 3 additional PIs were also charged
- [ ] Contact amanda.b.lightman@gmail.com
- [x] Implement fix
- [x] Deploy to production
- [x] Smoke test on production
- [ ] (Future) Add unique constraint on `stripe_payment_intent_id` — prevents duplicate Payments for same PI
- [ ] (Future) Frontend error boundary on `/book` — show recovery message when JS crashes after payment

### Related

- Commits: `198105c`, `7af5f16`, `1c8d8c4`, `4ea2f81`, `ef88575`, `799dd02`
- Commit `4546f00` — prior partial fix for same-day restriction edge case. Did NOT fix the underlying two-step architecture issue.
- Sentry `TOTETAXI-NEXT-4` — browser extension crash on `/book`, confirmed cause of Amanda's failed booking POST (6 occurrences since Dec 2025).
- Sentry `TOTETAXI-NEXT-A` — chunk load failure, unrelated.

---

## Edge Cases & Anomalies Log

### Multiple PaymentIntents Per Session

Customers can create multiple PIs by retrying the payment step. Each creates a separate Stripe charge authorization. Only one gets linked to a booking. The others may or may not be captured depending on Stripe's automatic capture settings. No cleanup mechanism exists.

### Webhook Retry Window

The Celery webhook task retries 10 times with exponential backoff (1s, 2s, 4s, 8s, 16s, 32s, 60s, 60s, 60s, 60s) — total window ~5 minutes. If the booking creation takes longer than this (extremely unlikely) or never happens (the actual problem), the payment is marked orphaned.

### Git Config Probe

2026-03-17: `GET /.git/config` from Chrome/122 Windows — someone scanning for exposed git repos. Returned 404. Not a real concern but worth noting.

### Redis Connection Drops

Celery worker periodically loses connection to Upstash Redis (`Connection closed by server`). Reconnects immediately. Normal behavior for managed Redis with idle timeout. No data loss.
