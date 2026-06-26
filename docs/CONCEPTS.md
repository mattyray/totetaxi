# Engineering Concepts — a living glossary

Plain-language definitions of the ideas we hit while building ToteTaxi, with a
note on *where each one showed up in this codebase*. We add to this as we go.

---

### State
The data describing **what is true right now** — the current snapshot of the
system. Not what *happened* (that's an event), not the *behavior* (that's code).
*In this project:* the `status` fields are the state — a Payment is
`pending`/`succeeded`/`refunded`, a Booking is `pending`/`paid`/`cancelled`, a
PendingBooking is `pending`/`materialized`/`duplicate`/`failed`.

### Stateful vs stateless
**Stateful** = behavior depends on remembered data from the past.
**Stateless** = each operation depends only on its inputs, nothing remembered.
*In this project:* the pricing calculation is stateless (same inputs → same
price). The reconcile task is stateful (it reads PendingBooking rows from the DB).
A web server can be *stateless* per request while the *database* holds the state.

### State machine
The rules for which state changes are **allowed**. PendingBooking can go
`pending → materialized`, but never `materialized → pending`. Modeling allowed
transitions prevents impossible/corrupt states.

### Atomicity
"Both things happen, or neither does." When two steps must succeed together but
can't be made truly simultaneous, the gap between them is where bugs live.
*In this project:* the charge (Stripe) and the booking-save (our DB) weren't
atomic — money could be taken with no booking saved. That gap *is* the whole
orphaned-payment bug.

### Capture-then-confirm / durable intent
Record **what you're about to do** somewhere that survives a crash, *before* the
risky step — so any worker can finish it later.
*In this project:* we save the full booking (`PendingBooking`) at PaymentIntent
creation, *before* charging. If the browser dies, the server still has everything
it needs to complete the booking.

### Reconciliation loop
A background job that wakes up on a schedule and **corrects the state** —
converging the system toward "correct" instead of guaranteeing perfection
instantly. How banks/accounting/payments systems stay consistent.
*In this project:* `reconcile_pending_payments` runs every 5 minutes, finds
charges with no booking, and finishes them from the saved payload.

### Eventual consistency
Accepting that the system may be briefly "wrong" (charge exists, booking doesn't)
and will be made right shortly by a reconciliation process — rather than demanding
everything be perfect at the same instant.

### Race condition
When two things run at the same time and the outcome depends on **who finishes
first**. Nasty because they only fail *sometimes*.
*In this project:* two background workers each recovering one of a customer's two
charges could both check "is there a booking yet?", both see "no," and both create
one → a double booking.

### Idempotency
Doing it **twice has the same effect as doing it once**. Essential whenever
something can run more than once (retries, webhooks, overlapping jobs). Usually
built from *state + a dedup key*: "check the state under this key; if already done,
stop."
*In this project:* recovery checks `if pending.status == 'materialized': return`,
so the webhook + browser + reconcile can all fire and you still get one booking.

### Deduplication (dedup)
Recognizing two things are **the same logical thing** and collapsing them to one.
The hard part is *defining "the same"* via a **dedup key**.
*In this project:* one customer's two charges (different PaymentIntent IDs, but one
order) are deduped to a single booking. Keys: `cart_key` (precise, same browser
session) and `fingerprint` (fuzzy: email+date+service+amount). Too narrow → real
duplicates slip through; too wide → two genuine orders wrongly merged.

### Lock / mutual exclusion
A "one at a time through this door" mechanism so concurrent workers don't clobber
each other.
- **Row lock** (`SELECT … FOR UPDATE`) — locks a specific DB row. Only helps if
  both workers touch the *same* row.
- **Advisory lock** (`pg_advisory_xact_lock`) — a lock on an *arbitrary key* (we
  used `cart_key`), not tied to a row. This is what made the duplicate-charge dedup
  safe, because the two charges are *different* rows a row-lock can't serialize.

### At-least-once delivery
Platforms like Stripe may send the **same webhook event more than once** (network
retries). You can never assume "this runs once" — which is *why* idempotency is
mandatory in payment systems. You turn the platform's "at least once" into your
own "effectively once."

### Fail-open vs fail-closed
When unsure, which way do you err? **Fail-closed/fail-safe** = err toward the safe
outcome.
*In this project:* if dedup can't be certain, it refuses to auto-create a booking
and alerts a human (alert-only refund) — we never auto-move money on a guess.

### Observability
Being able to *see* what the system is doing — especially when it fails. The worst
bug is a silent one.
*In this project:* `logger.critical` on a saturated batch, the duplicate-charge
alert, and the `PaymentAudit` records exist so a failure is *visible*, not silent.

### Feature flag / kill-switch
A setting that turns behavior on/off **instantly, without redeploying code**.
*In this project:* `ORPHAN_AUTORECOVERY_ENABLED` — flip it off via
`fly secrets set` and the new behavior stops in seconds.

### Defense in depth / belt-and-suspenders
Layering multiple independent safeguards so no single failure is catastrophic.
*In this project:* advisory lock **+** deterministic ordering **+** singleton lock
**+** per-row isolation all guard the same double-booking risk from different angles.

### Adversarial testing / red-teaming
Testing by asking "**how could this fail?**" rather than "does it work?" Confirming
something works is only half the job.
*In this project:* agents whose only job was to break the design found the
concurrency hole in the dedup that normal "happy-path" testing missed.

### Testing pyramid
Different test layers catch different bugs:
- **Unit/integration** — fast, exhaustive, but mock the outside world.
- **End-to-end (live)** — real Stripe/DB, proves it works for real.
- **Browser (e2e)** — drives the actual UI; the only layer that proves the
  frontend sends/shows the right things.
*In this project:* 354 pytest cases + a live Stripe-test run + a threaded Postgres
concurrency test + 4 Playwright tests.

---

*Add new terms here as we hit them.*
