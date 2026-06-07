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

## INC-002: Orphaned Stripe Payment — Same Pattern, Different Customer

**Date:** 2026-03-31
**Severity:** High
**Customer:** mayaseidler@edgelinefilms.com
**Amount:** $285.00
**Stripe PI:** `pi_3TH3c0IOokQBXWLK0Fv7SqPW`
**Status:** RESOLVED — customer handled by Dipendra, fixes deployed 2026-03-31

### What Happened

Customer was charged $285 for a Standard Delivery (Brooklyn to Wainscott, pickup April 1) but no booking was created. Customer called to report the charge. Staff found the payment in Stripe dashboard.

### Timeline (ET)

| Time | Event |
|------|-------|
| 10:46:32 | PI #1 created (`pi_3TH3Yq...`) — $285, Payment record created (status=pending) |
| 10:46–10:49 | Customer on Stripe form but never submitted — PI stayed `requires_payment_method` |
| 10:49:48 | PI #2 created (`pi_3TH3c0...`) — $285, new Payment record created (status=pending) |
| 10:50:11 | Stripe webhook fired → Celery task updated Payment to `status=succeeded` |
| 10:50:11 | PaymentAudit logged: "Payment succeeded but no booking linked yet" |
| 10:50+ | POST to `/api/public/guest-booking/` **never reached the server** |
| ~11:36 | Staff found payment in admin, tried to create booking manually → hit M2M ValueError |

### Comparison with INC-001 (Amanda)

| | INC-001 (Amanda, Mar 17) | INC-002 (Maya, Mar 31) |
|---|---|---|
| **Core failure** | Booking POST never reached server | Booking POST never reached server |
| **Payment DB record** | None existed (pre-fix) | Exists, status=succeeded, booking=null |
| **Webhook** | Retried 10x, gave up | Succeeded, updated Payment record |
| **Detection** | Customer called, manual Stripe search | Staff saw in Stripe immediately |
| **3D Secure** | No | No |
| **PI attempts** | 1 | 2 (first abandoned) |

### Root Cause

Same fundamental issue as INC-001: the frontend has an unprotected gap between `stripe.confirmPayment()` succeeding and the booking creation POST firing. If anything disrupts this flow — JS error, browser extension, network drop, tab close — the customer is charged with no booking.

The March 18 fix (INC-001 resolution) solved the **database side** — Payment records now exist and webhooks process correctly. But the **frontend gap** was never addressed.

Additional finding: the Stripe `return_url` in `confirmPayment()` points to `/booking-success` which did not exist as a route. Any future 3D Secure redirect would have landed on a 404.

### Resolution (2026-03-31)

Four fixes deployed:

1. **Backend orphan alert task** — New Celery task runs every 15 minutes, emails staff when a Payment has `status=succeeded` but `booking=null` for more than 10 minutes. Uses `BOOKING_EMAIL_BCC` for recipients. Skips already-alerted payments via `PaymentAudit(action='orphan_alert_sent')`.

2. **Frontend payment recovery** — `paymentIntentId` now persisted to localStorage via Zustand store. On page mount, if a pending PI exists with no completed booking, auto-retries booking creation. Also added `retry: 2, retryDelay: 3000` to the booking creation mutation for transient network failures.

3. **`/booking-success` route** — New Next.js page handles Stripe 3D Secure redirects. Reads `payment_intent` and `redirect_status` from URL params, creates the booking using data from localStorage.

4. **Enriched PI metadata** — Stripe PaymentIntent now stores customer name, phone, pickup date, and pickup time in metadata (both guest and authenticated flows). Enables future auto-recovery from webhook data.

5. **Admin M2M bug fix** — Added `self.pk` guard in `Booking.calculate_pricing()` to prevent `ValueError` when creating bookings via Django admin.

6. **Misleading log fix** — Changed pricing-preview same-day restriction log from `CRITICAL`/`error` to `warning` with accurate message text.

### Files Changed

- `backend/apps/payments/tasks.py` — new `alert_succeeded_orphans` task
- `backend/config/settings.py` — Celery Beat schedule entry
- `backend/apps/bookings/views.py` — enriched PI metadata, fixed log message
- `backend/apps/bookings/models.py` — `self.pk` guard for M2M access
- `backend/apps/customers/booking_views.py` — enriched PI metadata
- `frontend/src/stores/booking-store.ts` — `pendingPaymentIntentId` persisted, store version 8
- `frontend/src/components/booking/review-payment-step.tsx` — persist PI, recovery on mount, retry config
- `frontend/src/app/booking-success/page.tsx` — new route for 3D Secure redirects

### Post-Deployment Hardening (2026-04-02)

Security audit of the March 31 recovery system found 6 additional issues. All fixed:

1. **3D Secure guest checkout broken** — `customer_info` stripped from localStorage by `partialize`, so guest 3DS redirects always failed with 400. Fix: conditionally persist `customer_info` when `pendingPaymentIntentId` is set.
2. **Stolen-PI replay** — No session binding on PaymentIntents; anyone with a succeeded PI id could create a booking against it. Fix: `booking_token` (UUID) generated at PI creation, stored in Stripe metadata, verified at booking creation.
3. **Orphan alert audit ordering** — Audit records written before `send_mail()`, so email failure permanently skipped orphans. Fix: write after email succeeds.
4. **Infinite retry loop** — `pendingPaymentIntentId` not cleared on server rejection (400/422). Fix: `clearPendingPaymentIntentId()` on all non-retryable error paths.
5. **C2 reuse race** — Check ran outside `transaction.atomic()`. Fix: moved inside with `select_for_update()`.
6. **Cleanup hiding charged payments** — Task marked payments as `failed` when Stripe PI was actually `succeeded`. Fix: verify Stripe status before expiring.

Commits: `bf7e7fc`, `eed53ec`

---

## INC-003: Triple Charge via Customer Wizard + Silent Recovery System

**Date:** 2026-06-07
**Severity:** High (small customer-money exposure, but the entire recovery/alert net was found offline)
**Customer:** saraelsawy@gmail.com (registered customer, user id 210)
**Amount charged:** 3 × $335.00 = $1,005.00 — **$670.00 is duplicate** (2 extra charges)
**Booking:** TT-000148 (`788633e5-1dd0-4090-b133-9c1dfcaa3b56`), Standard Delivery, pickup 2026-06-13, status `paid`
**Status:** UNDER INVESTIGATION — no refunds issued, no code changed. Charges NOT yet refunded.

### What Happened

Customer reported a Stripe payment notification with no booking, and suspected duplicate receipts. Investigation found she was **charged three times** for one Standard Delivery. She created a registered account at 08:29 ET and ran the **booking wizard three times** while logged in. The first two charges succeeded but the booking-creation step never completed; she retried each time, and the third attempt finally created **TT-000148**. Net result: one booking, two orphaned duplicate charges.

Initial report suspected the booking was "pushed through the staff backend." **It was not.** All three PaymentIntents carry customer-wizard metadata (`booking_token`, `customer_name`, `pickup_date`, `service_type`); none have the staff signature (`booking_id`-only metadata + `stripe_checkout_url`). `created_by_staff` is null, there are zero `StaffAction` records for this customer/booking, and zero Django-admin entries. The backend cannot distinguish "customer clicked" from "staff clicked while logged in as her," but the **staff create-booking tool was definitively not used** — this was the customer wizard, three times.

### Timeline (ET)

| Time (ET) | PI | Result |
|-----------|----|--------|
| 08:34 | `pi_3Tffu3IOokQBXWLK0PW2wzlE` | succeeded $335 — Payment stuck `pending`, no booking → **orphan** |
| 08:49 | `pi_3Tfg8tIOokQBXWLK1urMG57k` | succeeded $335 — Payment stuck `pending`, no booking → **orphan** (the customer's screenshot) |
| 13:16 | `pi_3TfkIyIOokQBXWLK0bm2PTNx` | succeeded $335 — linked → **TT-000148**, status `paid` |
| ~13:55 | — | `worker` machine OOM-killed (`exit 137`), restarted; backlog of retry tasks drained |
| ~14:08 | — | ~39 "ORPHANED PAYMENT" Sentry alerts fired in a burst (mostly invoice false-positives, see below) |

### Root Cause (three layers)

1. **Customer-facing (the duplicate charges):** The wizard charges the card in a step *before* the booking is created, and there is **no duplicate-payment guard**. When the booking step fails, the customer retries; each retry mints a fresh PaymentIntent and charges again. Same two-step gap as INC-001/INC-002, now manifesting as repeat charges rather than a single orphan.

2. **Why the booking step failed twice (inferred, not proven):** Card charged, booking POST didn't complete — the same frontend gap as the prior incidents. Not a server crash (backend Sentry clean of 5xx for this flow) and not deterministic (attempt 3 succeeded identically). The exact client-side failure is **unrecoverable from telemetry**: the frontend project (`totetaxi-next`) has **no error events and no session replay** for the session. Confirming it requires asking the customer.

3. **Why the recovery system stayed silent (the real systemic finding):**
   - **`beat` machine STOPPED since 2026-04-15 (~7 weeks).** Every scheduled safety-net task was offline: `alert_succeeded_orphans` (15-min orphan email), `cleanup_orphaned_payments` (daily Stripe reconciliation), `send_booking_reminders`.
   - **`worker` dropped the webhook tasks.** Stripe delivered all three `payment_intent.succeeded` events (`pending_webhooks: 0`) and the web process set the idempotency cache flag and dispatched the Celery tasks — but the worker never executed the two orphan tasks (Celery default early-ack + worker instability = tasks lost, not redelivered). That's why those two Payments are stuck `pending` with empty `charge_id`. The third payment was marked `paid` by the synchronous booking-create view, which never depends on the worker.
   - Combined effect: the orphans never reached `status=succeeded`, so even a *running* `alert_succeeded_orphans` wouldn't have caught them yet; and `cleanup_orphaned_payments` (which reconciles `pending`→`succeeded` against Stripe and would have surfaced them) was dead.

### Broader Finding: Orphan Alert Is Noisy (False Positives)

While investigating, a reconciliation of all succeeded Stripe charges (last ~120 days) initially looked like ~$34k of orphaned payments. **This was a false alarm.** ~47 of those (~$34.6k) are **Stripe Invoices** (description `Invoice XXXX-NNNN`) — staff billing customers directly outside the wizard, including recurring clients (`croider@aol.com`, `Caroline.Leventhal@gmail.com`). They are legitimate paid revenue, tracked in Stripe, and by design never create a DB booking. The `process_payment_succeeded` task flags **every** account payment without a booking as "ORPHANED PAYMENT — MANUAL REFUND REQUIRED," so all invoice traffic trips the alarm. This noise would bury the few real cases even when alerting is running.

**Actual app-booking exposure (charges with wizard metadata, no paid booking, not refunded) is small (~$1,800):**

| Customer | Amount | Date | Note |
|----------|--------|------|------|
| saraelsawy@gmail.com | 2 × $335 | 2026-06-07 | got TT-000148; two duplicate over-charges |
| fryer.v@icloud.com | 2 × $150 | 2026-03-08 | two charges, no paid booking found — likely double-charge |
| mayaseidler@edgelinefilms.com | $285 | 2026-03-31 | INC-002 (known/handled) |
| michael.haas@lw.com | $285 | 2026-05-28 | got TT-000139 — duplicate over-charge |
| walter2002@aol.com (staff PI) | $285 | 2026-04-20 | staff checkout, unlinked — needs verification |

### Investigation Note

One investigation `manage.py shell` session ran on the 512 MB `worker` machine; the worker OOM-restarted (`exit 137`) minutes later at ~13:55 ET. This likely triggered the restart that drained the backlog and surfaced the burst of alerts. **The charges pre-date the investigation by weeks/months** — investigation surfaced them, it did not create them.

### Current State

- **No money moved, no application code changed.** Investigation only.
- **`beat` machine restarted** (manual `fly machine start`). Scheduled tasks run again. Expect orphan-alert emails to `BOOKING_EMAIL_BCC` once they fire — most will be the invoice false-positives until the alert is scoped to app PIs.

### Action Items

- [ ] Decide on Sara refund: `pi_3Tffu3...` and `pi_3Tfg8t...` ($670 total) — keep `pi_3TfkIy...` (TT-000148)
- [ ] Reconcile the two stuck `pending` Payment records for Sara's orphan PIs after refund decision
- [ ] Verify the small real list (fryer.v, walter2002) — served vs. owed
- [ ] **Scope orphan detection to app PIs** (require `booking_token`/`service_type`) so Stripe Invoices stop tripping the alarm
- [ ] **Add uptime monitoring for `beat` and `worker`** — a dead scheduler silently disabled the entire recovery net for 7 weeks
- [ ] Harden worker task durability (`acks_late` + `task_reject_on_worker_lost`) so worker death doesn't drop webhook tasks
- [ ] Set idempotency cache flag only after successful processing (currently set before dispatch, blocks reprocessing of dropped tasks)
- [ ] (Customer-facing) Duplicate-payment guard in the wizard; add frontend Sentry + session replay to see the booking-step failure
- [ ] Investigate why `beat` stopped on 2026-04-15 and was never restarted

### Related

- Builds on INC-001 (Amanda) and INC-002 (Maya) — same two-step frontend gap; this is the first manifestation as repeat charges and the first time the recovery net was found fully offline.
- Stripe webhook endpoint: `we_1SKkzeIOokQBXWLKhGa7YBwE` → `https://totetaxi-backend.fly.dev/api/payments/webhook/` (enabled, delivering).

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
