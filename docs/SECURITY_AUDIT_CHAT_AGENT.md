# Security Audit: Chat Agent + Full Codebase

*Feb 14, 2026 — Three agents ran in parallel against the full codebase*

## Agents Used
1. **llm-security-auditor** (custom) — LLM-specific vulnerabilities
2. **ecommerce-security** (built-in) — Payment flows, auth, Stripe
3. **code-reviewer** (built-in) — Django DRF + React/TypeScript bugs

## Cross-Reference
A previous security audit was completed Feb 6-9, 2026 (see `SECURITY_AUDIT_FEB2026.md`). That audit produced PRs #4-#10, all merged and deployed. Some findings below were re-flagged by agents that lacked context from that audit. These are marked accordingly.

---

## PR Plan

### PR 1: Chat Agent Feature (`feature/chat-agent-backend`)
All chat agent code + security fixes specific to the chat agent. Ship together — the feature shouldn't deploy without these fixes.

| ID | Severity | Finding | Fix |
|----|----------|---------|-----|
| C1 | CRITICAL | IDOR via LLM-controlled `user_id` | Hard-bind `user_id` in `tool_node` |
| C3 | CRITICAL | Thread-unsafe global `_checkpointer` | Remove or add lock (unused, clean up) |
| H1 | HIGH | Conversation history injection | Per-message content length limit |
| H2 | HIGH | Token stuffing — no per-message limit | `MAX_HISTORY_MSG_LENGTH = 1000`, truncate |
| H3 | HIGH | Booking count leakage in `check_availability` | Return "available"/"busy" labels, not counts |
| H7 | HIGH | `item_count=0` silently dropped in handoff | `if item_count is not None:` |
| M2 | MEDIUM | `special_instructions` unbounded text | Truncate to 500 chars |
| M3 | MEDIUM | Health check exposes API key presence | Remove `api_key_configured` field |
| M10 | MEDIUM | Stale `isStreaming` closure (double-click) | Use ref for streaming guard |

### PR 2: Pre-existing Fixes (new branch off `main`, after PR 1 merges)
Issues unrelated to the chat agent that have been present since before this feature.

| ID | Severity | Finding | Fix |
|----|----------|---------|-----|
| C2 | CRITICAL | Webhook signature bypass (empty secret in non-prod) | Guard in webhook view: reject if secret empty |
| C4 | CRITICAL | Booking signal extra DB query on every save | Use `_original_status` from `__init__` |
| H5 | HIGH | Refund processing uses `IsStaffMember` not `IsAdminStaff` | Upgrade to `IsAdminStaff` |
| H6 | HIGH | Webhook idempotency on volatile Redis | Move to DB table (TTL extended to 72h in PR #7, but still volatile) |
| H8 | HIGH | `_get_customer_phone` wrong attribute | `customer.profile` → `customer.customer_profile` |
| M9 | MEDIUM | BookingManagementView N+1 on payments | Add `prefetch_related('payments')` |
| M11 | MEDIUM | CalendarAvailabilityView mixes public/staff data | Proper `IsStaffMember` permission class |

### False Positives
Findings that were re-flagged but are either already fixed or intentional design.

| ID | Original Finding | Verdict | Reason |
|----|-----------------|---------|--------|
| H4 | PaymentIntentCreateView `AllowAny` | **Intentional** | Guest checkout requires unauthenticated access. Protected by UUID randomness, rate limiting (10/h), and server-side pricing. Not a legacy endpoint. |

### Accepted Risk / No Action
| ID | Finding | Reason |
|----|---------|--------|
| M1 | LangSmith receives PII | Document in privacy policy. Standard for LLM observability. |
| M4 | Free order prefix convention | Mitigated by server-side $0 verification |
| M5 | Discount code race in preview | Mitigated by `select_for_update()` at booking creation |
| M6 | Session ID in localStorage | Known trade-off for mobile Safari cookie limitation |
| M7 | No CSP headers | Defense-in-depth; future PR |
| M8 | HybridAuthentication skips CSRF | Known, documented; CORS + SameSite + separate domains |

---

## Detailed Findings — PR 1 (Chat Agent)

### C1. IDOR via LLM-controlled `user_id` [LLM Auditor] — CRITICAL
**Location:** `backend/apps/assistant/tools.py:275-306`, `graph.py:131-153`
**Issue:** `lookup_booking_status` and `lookup_booking_history` accept `user_id` as a parameter from the LLM. The `tool_node` executes whatever args the LLM provides with no server-side check that the argument matches the authenticated user.
**Attack:** Prompt injection tells the LLM to call `lookup_booking_status(user_id=1)`, querying another user's bookings.
**Fix:** Hard-bind `user_id` in `tool_node`:
```python
if tool_call["name"] in ("lookup_booking_status", "lookup_booking_history"):
    args["user_id"] = user_id  # From closure, not LLM
```

### C3. Thread-unsafe global `_checkpointer` [Code Reviewer] — CRITICAL
**Location:** `backend/apps/assistant/graph.py:67-79`
**Issue:** Classic check-then-act race under gevent workers. Currently unused (line 174 compiles without it) but dangerous if enabled.
**Fix:** Remove the dead code, or use `threading.Lock()` if needed later.

### H1. Conversation history injection [LLM Auditor] — HIGH
**Location:** `backend/apps/assistant/views.py:90-95`
**Issue:** No prevention of fabricated assistant messages in history array. Attacker can inject fake context to manipulate agent behavior.
**Fix:** Add per-message content length limit (combined with H2).

### H2. Token stuffing — no per-message content limit [LLM Auditor] — HIGH
**Location:** `backend/apps/assistant/views.py:44,90`
**Issue:** History messages have no content length limit. 30 x 50KB = 1.5MB of input tokens per request.
**Fix:** Add `MAX_HISTORY_MSG_LENGTH = 1000` and truncate each message's content.

### H3. Booking count leakage in `check_availability` [LLM Auditor] — HIGH
**Location:** `backend/apps/assistant/tools.py:239-265`
**Issue:** Returns raw `booking_count` per day to unauthenticated users. Competitive intelligence risk.
**Fix:** Return qualitative labels ("available"/"busy") instead of exact counts.

### H7. `build_booking_handoff` silently drops `item_count=0` [Code Reviewer] — HIGH
**Location:** `backend/apps/assistant/tools.py:408`
**Issue:** `if item_count:` evaluates to `False` for 0. System prompt tells LLM to pass 0 for specialty items.
**Fix:** Change to `if item_count is not None:`

### M2. `special_instructions` unbounded text [LLM Auditor] — MEDIUM
**Location:** `backend/apps/assistant/tools.py:371,432`
**Issue:** No length limit on special_instructions flowing through to staff views.
**Fix:** Truncate to 500 characters in `build_booking_handoff`.

### M3. Health check exposes API key presence [LLM Auditor] — MEDIUM
**Location:** `backend/apps/assistant/views.py:189-204`
**Issue:** Returns `api_key_configured: true/false` publicly. Minor information disclosure.
**Fix:** Remove the field, return only `status`.

### M10. Stale closure in `useChatStream.sendMessage` [Code Reviewer] — MEDIUM
**Location:** `frontend/src/hooks/use-chat-stream.ts:36,151`
**Issue:** `isStreaming` state captured at callback creation time. Double-click can bypass the guard and fire two concurrent requests.
**Fix:** Use a ref (`isStreamingRef`) for the guard check instead of the state value.

---

## Detailed Findings — PR 2 (Pre-existing)

### C2. Webhook signature bypass in non-production [E-commerce] — CRITICAL
**Location:** `backend/config/settings.py:321-324`, `backend/apps/payments/views.py:154-159`
**Issue:** `STRIPE_WEBHOOK_SECRET` defaults to empty string outside Fly.io. `stripe.Webhook.construct_event` with an empty secret accepts any signature.
**Cross-ref:** Original audit R9 made the secret required in production (Fly.io). Non-production default still empty.
**Fix:** Add explicit guard in webhook view: reject if secret is empty.

### C4. Booking signal extra DB query on every save [Code Reviewer] — CRITICAL
**Location:** `backend/apps/bookings/signals.py:14-29`
**Issue:** `pre_save` signal re-queries the DB instead of using `_original_status` from `__init__`.
**Cross-ref:** Original audit L17 scoped signal to status transitions. This is a different issue — the signal still does a redundant DB lookup.
**Fix:** `old_status = getattr(instance, '_original_status', instance.status)`

### H5. Refund processing not gated by admin role [E-commerce] — HIGH
**Location:** `backend/apps/payments/views.py:322-411`
**Issue:** `RefundProcessView` uses `IsStaffMember` — any staff can issue refunds, not just admins.
**Cross-ref:** Original audit H3 created `IsAdminStaff` (PR #5) and R10 upgraded refund views from raw `hasattr` to `IsStaffMember` (PR #10). But the upgrade stopped one step short — should be `IsAdminStaff`.
**Fix:** Change permission class to `IsAdminStaff`.

### H6. Webhook idempotency uses volatile Redis cache [E-commerce] — HIGH
**Location:** `backend/apps/payments/views.py:177-184`
**Issue:** Cache flush allows duplicate event processing.
**Cross-ref:** Original audit M5 extended TTL to 72h (PR #7). Underlying volatility not addressed.
**Fix:** Store processed event IDs in a DB table for durability.

### H8. `_get_customer_phone` uses wrong attribute [Code Reviewer] — HIGH
**Location:** `backend/apps/logistics/services.py:427-436`
**Issue:** `booking.customer.profile` should be `booking.customer.customer_profile`. All authenticated Onfleet tasks silently get a placeholder phone number.
**Fix:** Change to `booking.customer.customer_profile`.

### M9. BookingManagementView N+1 on payments [Code Reviewer] — MEDIUM
**Location:** `backend/apps/accounts/views.py:470-473`
**Issue:** Missing `prefetch_related('payments')` — 50 extra queries per page.
**Cross-ref:** Original audit M8 fixed N+1 on `PaymentSerializer`. This is a different view.
**Fix:** Add `prefetch_related('payments')`.

### M11. CalendarAvailabilityView mixes public/staff data [Code Reviewer] — MEDIUM
**Location:** `backend/apps/bookings/views.py:480-483`
**Issue:** Inline staff detection without `IsStaffMember` permission class.
**Cross-ref:** Original audit H1 stripped PII from public response (PR #4). Staff detection pattern remains.
**Fix:** Use proper permission class or separate endpoints.

---

## LOW (12 findings) — Backlog

- Prompt injection relies on system prompt only (add anti-injection clause)
- Handoff cross-validation missing (contradictory service fields)
- localStorage prefill integrity (mitigated by server-side pricing)
- `check_availability` 30-day window (reduce to 14 for public)
- `BookingData` type divergence between `types/index.ts` and `booking-store.ts`
- `TESTING` defined twice in settings.py
- Notification IDs use `Math.random()` instead of `crypto.randomUUID()`
- Missing `AbortController` cleanup in `useChatStream` on unmount
- Contact form email validation (no `EmailField`)
- Onfleet `time.sleep()` blocks gevent workers (cooperative, but long)
- Redis URL parsing fragility in `_get_checkpointer`
- Google Places API key in repo (public key, should be domain-restricted)

---

## What's Working Well (Confirmed Safe)

1. Server-side pricing recalculation at every payment step
2. PaymentIntent amount verification (PI.amount == booking.total_price_cents)
3. PaymentIntent reuse prevention
4. Stripe webhook signatures in production
5. All ORM queries (no raw SQL)
6. IDOR protection on customer booking views
7. Staff/customer profile separation
8. Rate limiting on all critical endpoints
9. Discount code `select_for_update()` at booking creation
10. PUBLIC_TOOLS / ALL_TOOLS code-level auth split
11. Guest vs authenticated booking isolation
12. Booking status transition enforcement
