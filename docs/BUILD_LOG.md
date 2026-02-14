# BUILD LOG — ToteTaxi AI Chat Agent

*The story behind the build. For LinkedIn content and future reference.*

---

## Feb 13, 2026 — Day 1: Full Stack in One Shot

### What shipped
Customer-facing AI chat assistant for ToteTaxi — a moving/logistics platform serving the NYC tri-state area. The agent handles service inquiries, pricing estimates, coverage checks, availability lookups, and booking status for authenticated customers. When a customer is ready to book, the agent hands off to the booking wizard with pre-filled details.

### The stack decision
**LangGraph + Claude Sonnet + Django SSE + custom React hook**

Why not a chatbot SaaS? The agent needs to query our actual database — live pricing, real-time availability, customer booking history. No third-party chatbot can do that without becoming a maintenance liability. Building it ourselves means the agent is as accurate as the app itself.

Why LangGraph over a raw API loop? Tool calling. The agent decides which tools to invoke based on the conversation. LangGraph's ReAct pattern (think → act → observe → think) handles the routing. We wrote 6 tools that wrap existing business logic — no new database queries, just thin wrappers around code that already works.

### Architecture choices worth noting

**System prompt over RAG.** Our entire knowledge base (services, pricing tiers, surcharge rules, FAQs) fits in ~3k tokens. RAG would add a vector DB, an embedding pipeline, retrieval latency, and zero accuracy improvement. The system prompt approach means the agent's knowledge updates when we update the prompt — one file, one truth.

**SSE over WebSockets.** Server-Sent Events work over standard HTTP. No Django Channels, no ASGI migration, no protocol upgrade complexity. Django's `StreamingHttpResponse` does the job. The trade-off is one-directional streaming (server → client), but that's exactly what chat needs — the client sends a POST, the server streams the response.

**Gevent over ASGI.** SSE connections hold a worker for the duration of the stream. With sync gunicorn, 4 workers = max 4 concurrent chats. One flag change (`--worker-class gevent`) gives us cooperative multitasking — same 4 workers handle hundreds of concurrent SSE streams. Zero code changes to existing views. Django, DRF, psycopg2, Redis, Stripe, Celery — all compatible.

**Custom fetch hook over Vercel AI SDK.** The AI SDK is built for Next.js API routes that proxy to LLMs. Our architecture is Django → SSE → browser. Writing a custom `useChatStream` hook with native `fetch()` + `ReadableStream` was 180 lines. Simpler dependency tree, full control over SSE parsing, and the auth headers (cookies, CSRF, X-Session-Id) just work.

### What surprised me

**Test fixtures are the real work.** The agent code — graph, tools, views — took a few hours. Getting 42 tests to pass took longer than the feature code. Django's `Booking.save()` triggers cascading validations (address lookups, pricing calculations, Onfleet task creation). Every test fixture needs `_skip_pricing=True` and real Address objects. The lesson: your test setup complexity mirrors your domain model complexity.

**Token streaming changes the UX contract.** With a REST API, the user sees nothing, then sees everything. With SSE token streaming, they see the response forming in real-time. This means tool call indicators matter — "Checking service area..." appears while the agent is thinking, not after. The typing indicator only shows when there's genuinely nothing to display yet. Small details, but they make the agent feel alive.

### By the numbers
- 42 backend tests (27 tool tests, 15 view tests), 0 regressions on 307 existing tests
- 6 LangGraph tools, all read-only database queries
- ~3k token system prompt covering 5 service types, 3 pricing tiers, geographic surcharges, FAQs
- 3 new frontend files (hook, widget, barrel export), 1 modified (provider mount)
- SSE streaming with 5 event types: token, tool_call, tool_result, done, error
- Gevent: 1 flag change enables hundreds of concurrent chat sessions

### Files added
```
backend/apps/assistant/    — Django app (prompts, tools, graph, views, tests)
frontend/src/hooks/use-chat-stream.ts    — SSE streaming hook
frontend/src/components/chat/            — Floating widget + panel
docs/BUILD_LOG.md                        — This file
```

---

## Feb 13, 2026 — Day 1 Addendum: The Smoke Test Gauntlet

### What broke (and why)

The code worked in tests. Then the smoke test started. Five issues surfaced back-to-back, each a lesson in the gap between "tests pass" and "the thing actually works."

**1. Hop-by-hop headers.** Django's dev server rejects `Connection: keep-alive` — it's a hop-by-hop header forbidden in WSGI. Production (gunicorn) handles it fine, but dev server throws `AssertionError`. Fix: removed the header entirely. SSE doesn't need it; the `text/event-stream` content type already implies a persistent connection.

**2. Redis checkpointer API churn.** LangGraph's `RedisSaver` changed its constructor between versions — `from_conn_string()` returned a context manager instead of a saver. Then `RedisSaver({"connection_string": url})` failed because it expected a string, not a dict. Then `RedisSaver(redis_url=url)` worked... until runtime, when it tried `JSON.SET` — a RedisJSON module command that standard Redis doesn't have. Fix: disabled the checkpointer entirely for V1 (ephemeral conversations). Persistence can wait.

**3. AIMessageChunk content shape.** The LangGraph streaming docs show `msg.content` as a string. In practice, `AIMessageChunk` during `stream_mode="messages"` returns content as a *list of dicts*: `[{"type": "text", "text": "Hello"}]`. Concatenating `str + list` is a `TypeError`. Fix: isinstance check → extract text blocks → join.

**4. Empty tool_call chunks.** Streaming emits partial tool-call chunks with empty names before the full tool call arrives. These produced `{"tool": ""}` SSE events that confused the frontend. Fix: `if tool_name:` guard.

**5. Markdown rendering in the widget.** The agent's response contained `**bold**` formatting. The widget rendered raw asterisks. Fix: lightweight `MarkdownContent` and `InlineMarkdown` components (bold, lists, spacing) — no markdown library, just regex splits.

### The takeaway

Every one of these bugs was invisible in tests. Tests mock the LLM, mock Redis, and don't run a real SSE stream through Django's dev server. The smoke test is where integration happens. The five fixes took maybe 30 minutes combined, but they're the difference between a demo that works and a product that works.

### Updated numbers
- 42 backend tests, 307 total passed (3 pre-existing failures)
- Frontend builds clean (130 pre-existing lint warnings, 0 new)
- 5 smoke test fixes, 0 new dependencies added

---

## Feb 14, 2026 — Day 2: Memory, Handoff, and the Race Condition

### What shipped
Three features that transform the agent from a stateless Q&A bot into something that feels like a conversation: persistent memory within a session, a 21-field booking handoff, and a fix for a race condition that silently wiped pre-filled data.

### Conversation memory — the simple way
V1 launched with no memory. Every message was a fresh conversation. The agent couldn't reference what you just said two messages ago.

The original plan was Redis-backed conversation state via LangGraph's `RedisSaver` checkpointer. Day 1's smoke test killed that — Docker's Redis doesn't have the RedisJSON module, and the `RedisSaver` API was unstable across versions.

The fix was embarrassingly simple: the frontend sends the full chat history with every request. The backend rebuilds the conversation from it. No Redis state, no server-side sessions, no module dependencies.

```
POST /api/assistant/chat/
{
  "message": "What about a petite mini move?",
  "thread_id": "abc-123",
  "history": [
    {"role": "user", "content": "How much is a mini move?"},
    {"role": "assistant", "content": "We have three tiers..."}
  ]
}
```

Capped at 30 messages per request to bound token cost. Used `useRef` instead of state in the hook's `sendMessage` callback to avoid stale closures — a subtle React bug where `useCallback` captures the messages array at mount time, not at call time.

Trade-off: slightly larger payloads vs. zero server-side state. For a customer service agent with short conversations, this is the right call.

### Expanded handoff — 21 fields, zero pricing
The booking handoff tool went from 6 parameters to 21. The agent can now pre-fill addresses, dates, packing/unpacking preferences, COI requirements, and special instructions — everything a customer might mention in conversation.

One deliberate omission: **pricing is never pre-filled**. The booking wizard has its own `useRecalculatePricing` hook that calculates totals server-side from the filled fields. Letting the agent set pricing would create a source-of-truth conflict — what if the agent's estimate disagrees with the wizard's live calculation? The agent handles discovery. The wizard handles execution.

### The race condition: initializeForUser() vs. prefill data
The handoff flow: user chats with agent → agent builds prefill → user clicks "Start Booking" → navigate to `/book` → wizard opens with pre-filled fields.

It didn't work. The fields were empty every time.

The booking wizard's auth step (step 0) calls `initializeForUser()`, which resets the Zustand booking store to defaults. This runs on mount, and again after login/guest selection. Any data we set on the store before step 0 completes gets wiped.

The timeline:
1. Chat widget sets `bookingData` via Zustand ✓
2. Navigate to `/book`, wizard mounts
3. `initializeForUser()` fires → resets `bookingData` to defaults ✗
4. User sees empty wizard

**The fix: localStorage bridge.** Instead of writing to Zustand directly, the chat widget stores prefill data in `localStorage` with a timestamp:

```typescript
localStorage.setItem('totetaxi-chat-prefill', JSON.stringify({
  data: handoff.prefill_data,
  timestamp: Date.now()
}));
router.push('/book');
```

The booking wizard reads it *after* auth resolves (`currentStep > 0`), then deletes the key:

```typescript
useEffect(() => {
  if (currentStep > 0) {
    const raw = localStorage.getItem('totetaxi-chat-prefill');
    if (raw) {
      localStorage.removeItem('totetaxi-chat-prefill');
      const { data, timestamp } = JSON.parse(raw);
      if (Date.now() - timestamp < 5 * 60 * 1000) {
        updateBookingData(data);
      }
    }
  }
}, [currentStep, updateBookingData]);
```

5-minute TTL prevents stale prefills from contaminating future normal bookings.

This is a pattern worth remembering: when two systems have conflicting lifecycle timing (chat widget vs. wizard initialization), step outside both systems. localStorage outlives both React state and Zustand store resets.

### Compliance: AI disclosure and separation of concerns
Added "AI-powered" to the chat header. Small change, but it's an FTC guideline: users should know they're interacting with AI before they make decisions.

The broader design principle: the agent assists, but never commits. It can estimate pricing — but the wizard confirms it. It can pre-fill a booking — but the user reviews every field. It can look up booking status — but can't modify bookings. Authentication stays in the secure flow (wizard step 0), not in the chat widget. The agent handles the conversation. The app handles the transaction.

### By the numbers
- 42 backend tests still passing, 308 total (2 pre-existing failures)
- 21 handoff parameters (from 6), covering full booking form
- 30-message history cap per request
- 5-minute TTL on localStorage prefill
- 1 file modified in the existing codebase (booking-wizard.tsx — one useEffect added)

---

---

## Feb 14, 2026 — Day 2 Addendum: The Handoff Bug That Wasn't Fixed

### What broke

Day 2's localStorage bridge pattern for the booking handoff didn't actually work. The symptom: user chats with the agent, clicks "Start Booking," lands on the auth step (step 0), chooses guest or is auto-advanced as a logged-in user — and the wizard is empty. None of the prefill data persists.

### Why the useEffect approach failed

The original fix stored prefill data in `localStorage` and read it in a `useEffect` that watched `currentStep`. The idea: when `currentStep` goes from 0 → 1 (after auth resolves), the effect fires and applies the prefill.

The problem is how React batches Zustand state updates within a single effect. For a logged-in user, `AuthChoiceStep`'s effect runs:

```typescript
initializeForUser(userId, false);  // Zustand: currentStep → 0 (reset)
setCurrentStep(1);                 // Zustand: currentStep → 1
```

Both calls happen synchronously inside one effect. Zustand applies each immediately, but React batches the re-render. React sees the *final* value of `currentStep` (1), compares it to the *previous render's* value — which was also 1 if the store had hydrated from a previous session. No change detected. The `useEffect` never fires. The prefill data sits in `localStorage` unread.

This is a general lesson about React effects: **you can't rely on a useEffect to detect a state change if the change is collapsed by batching**. Setting a value to X, then to Y, then back to X within one effect means React never sees X — it only sees the starting and ending values.

### The fix: move prefill into the store itself

Instead of a fragile React effect, the prefill now happens inside `initializeForUser()` in the Zustand store. A `getChatPrefill()` helper reads from `localStorage` and returns the data (or null if absent/expired). Every code path in `initializeForUser` — full reset, rapid-init guard, timestamp-only update — calls this helper and merges the prefill into `bookingData`.

```typescript
// During a full reset
const chatPrefill = getChatPrefill();
set({
  bookingData: chatPrefill
    ? { ...initialBookingData, ...chatPrefill }
    : { ...initialBookingData },
  // ... reset fields
});
```

No React timing dependency. No effect ordering. The merge happens synchronously inside the store action that was causing the wipe in the first place. The `localStorage` key is cleaned up by a simple effect when the user reaches step 2.

### The takeaway

When two systems fight over the same state (React effects vs. Zustand store initialization), don't referee from the outside. Put the logic where the conflict lives. The store resets the data? The store should also preserve the prefill during that reset. One function, one responsibility, zero race conditions.

### Files changed
- `frontend/src/stores/booking-store.ts` — `getChatPrefill()` helper + merged into all `initializeForUser` paths
- `frontend/src/components/booking/booking-wizard.tsx` — replaced prefill `useEffect` with cleanup-only effect

---

## Feb 14, 2026 — Day 2 Continued: Prompt Engineering and Observability

### The bug that wasn't a code bug

User says "I want a standard delivery." Agent builds a handoff, pre-fills the wizard. User says "actually, make that a full move." Agent responds: "Sure, a full move is a great choice!" The user clicks "Start Booking" — and the wizard is pre-filled with... standard delivery.

The agent acknowledged the change in natural language but never re-invoked the `build_booking_handoff` tool. The old button still carried its original snapshot. This is the category of bug that no amount of unit testing catches — the code is correct, the tool works, the handoff works. The LLM just didn't call it again.

**The fix was one line in the system prompt:**

```
If the customer changes ANY details after you've already created a handoff,
you MUST call build_booking_handoff again with ALL the corrected details.
Each handoff button carries its own snapshot — previous buttons are NOT updated.
```

This is why prompt engineering matters as much as code engineering when you're building agentic systems. The agent's behavior isn't defined by code alone — it's defined by instructions. And instructions have bugs just like code does. The difference is you can't write a test for "the LLM should call this tool in this conversational context." You discover it by using the product.

### LangSmith: seeing inside the agent's head

Debugging that prompt issue by reading code was possible but slow. The real question was: "Did the agent call the tool or not?" We needed observability.

**LangSmith** was already wired into the stack — LangGraph auto-traces when it detects `LANGCHAIN_TRACING_V2=true` and `LANGCHAIN_API_KEY` in the environment. Every agent invocation produces a trace showing:

- The full message chain (system prompt + conversation history + user message)
- Each LLM call and what it returned (text response vs. tool calls)
- Tool arguments and results
- Token counts and latency per step

One setting in `settings.py` enables it. Zero code changes in the agent. That's the benefit of building on LangGraph — observability comes free because the framework owns the execution loop.

**Then we connected LangSmith to Claude Code via MCP.**

Model Context Protocol (MCP) servers expose tools that AI assistants can call directly. LangChain publishes an official `langsmith-mcp-server` that wraps the LangSmith API. One config entry:

```json
{
  "langsmith": {
    "command": "uvx",
    "args": ["langsmith-mcp-server"],
    "env": { "LANGSMITH_API_KEY": "..." }
  }
}
```

Now Claude Code can query traces inline — `fetch_runs` to list recent agent invocations, drill into specific runs to see tool calls and arguments. No copy-pasting from a dashboard, no context switching. The dev tool (Claude Code) can inspect the production tool (ToteTaxi's chat agent) through the observability tool (LangSmith), all via MCP.

### The emerging stack pattern

What's interesting is the layering:

1. **LangGraph** — agent execution framework (tools, state, streaming)
2. **LangSmith** — observability (traces, metrics, debugging)
3. **MCP** — tool protocol connecting AI assistants to external services
4. **Claude** — the LLM powering both the customer-facing agent AND the development assistant

Claude is on both sides. It's the model inside the ToteTaxi chat agent (via `langchain-anthropic`), and it's the model inside Claude Code debugging that agent (via MCP + LangSmith). When Claude Code reads a LangSmith trace, it's looking at another Claude's reasoning. That's a genuinely new development workflow.

### By the numbers
- 1 line added to system prompt (the re-invocation instruction)
- 0 code changes needed
- LangSmith: already wired, just needed API key in `.env`
- MCP server: 6-line JSON config, zero dependencies to install (`uvx` handles it)
- Time from "it's broken" to "it's fixed": ~5 minutes (once we knew where to look)

---

## Feb 14, 2026 — Day 2 Continued: Smoke Testing the Handoff

### The gap between "tool works" and "wizard works"

The booking handoff tool produces correct data. The booking wizard consumes that data. They don't speak the same language.

**Problem 1: Package type vs. package ID.** The agent knows `package_type: "petite"` — a human-readable string. The wizard's service-selection step needs `mini_move_package_id` — a UUID from the database API. The agent can't know the UUID (it's dynamic, fetched from `/api/public/services/`). So the handoff passes `package_type` but not `mini_move_package_id`. The wizard sees a service type with no package selected. The user sees an empty form.

**The fix:** A `useEffect` in `service-selection-step.tsx` that auto-resolves the mapping. When `package_type` is set but `mini_move_package_id` isn't, it finds the matching package from the fetched services data and fills in the UUID. One-shot resolution — only fires when there's a gap to bridge. Normal flow (user clicks a package card) sets the UUID directly and never triggers this effect.

This is a general integration pattern: when two systems use different identifiers for the same concept, the bridge belongs at the consumer, not the producer. The agent shouldn't need to know about database UUIDs. The wizard should handle the translation.

**Problem 2: Date validation after removing the safety net.** The agent originally used `check_availability` to validate dates before building handoffs. During prompt tuning, we told the agent to skip this step (dates are almost never blocked — only same-day and after-6pm-for-next-day). This removed a conversational round-trip but also removed the only date validation gate.

Result: the agent happily passed past dates and today's date through to the handoff. The booking wizard's calendar disables past dates *on click* — but prefilled dates from a handoff bypass the click handler entirely. The `selectedDate` state initializes from the store, `canContinue` checks for truthiness, and the user proceeds through the wizard with an impossible date.

**The fix (two layers):**

1. *Agent-side:* Updated the system prompt with explicit date validation rules. The agent must reject past dates and same-day bookings before building the handoff, directing customers to call (631) 595-5100.

2. *Frontend-side (defense in depth):* A mount `useEffect` on `DateTimeStep` that validates any prefilled date. Past dates are silently cleared. Same-day dates show a restriction modal with the phone number. The calendar's month navigation also checks: only jump to the prefilled date's month if the date is strictly in the future.

The lesson: when you remove a validation step for UX reasons, the validations it was performing don't disappear — they need to move somewhere else. We moved them to two places (prompt + frontend) so neither is a single point of failure.

### By the numbers
- 2 wizard fixes (package ID mapping + date validation)
- 2 prompt additions (date validation rules + availability tool guidance)
- 308 backend tests still passing (2 pre-existing failures)
- Calendar rendering: zero lines changed (the bug was in state initialization, not rendering)

---

## Feb 14, 2026 — Day 2 Continued: Smoke Testing Across Service Types

### Specialty items: a service type that doesn't exist in the UI

The chat agent's handoff tool accepts `service_type: "specialty_item"`. Reasonable — that's a valid backend service type. But the booking wizard only has three cards: Mini Move, Standard Delivery, Airport Transfer. There is no "Specialty Item" card.

Specialty items live *within* the Standard Delivery flow. The wizard's Standard Delivery card shows both "Regular Items" (count + description) and "Specialty Items" (Peloton, Surfboard, Crib, etc. with quantity steppers). The `date-time-step` later converts `standard_delivery` → `specialty_item` on the backend when there are only specialty items and no regular items.

**The fix:** A prompt instruction telling the agent to always use `service_type: "standard_delivery"` for specialty items — not `"specialty_item"`. Updated the tool docstring to remove `"specialty_item"` from the valid options so the LLM doesn't see it as a choice. Zero frontend changes. The wizard already handles every combination natively.

We considered auto-selecting the specific specialty item (e.g., pre-checking "Peloton" with quantity 1) but decided against it. The name matching would be fragile, and the current state is functional — Standard Delivery card is highlighted, the customer taps + on the right item. One tap vs. five files of complexity. Ship what works.

### Airport transfers: the missing fields

The handoff tool had params for airport, direction, and bag count — but not terminal, flight date, or flight time. These are `blade_terminal`, `blade_flight_date`, `blade_flight_time` in the wizard. The fix was purely additive: three new optional params on the tool, mapped to the right prefill keys. The wizard already reads these from `bookingData`. Zero frontend changes.

### Rate limiting: the dev experience trap

Hit the Django rate limit (20/h per IP) during smoke testing. Each chat message is a POST to `/api/assistant/chat/`. Twenty messages across multiple test scenarios burns through it fast. Bumped to 200/h for testing — will reset to 20/h before shipping.

Lesson: rate limits designed for production users can block developers. Consider a higher limit for development or a bypass for localhost.

### Smoke test results

| Service Type | Handoff | Wizard Pre-fill | Completable |
|---|---|---|---|
| Mini Move Petite | Correct | Package auto-resolved from type → UUID | Yes |
| Mini Move Standard | Correct | Same auto-resolve | Yes |
| Standard Delivery | Correct | Item count + description prefilled | Yes |
| Specialty Item (Peloton) | Routes to Standard Delivery | Card selected, customer selects item | Yes |
| Airport Transfer — To JFK | Correct | All fields including terminal, date, time | Yes |
| Airport Transfer — From EWR | Correct | Direction + all fields prefilled | Yes |

### By the numbers
- 2 backend files changed (prompts.py, tools.py)
- 0 frontend files changed for this round
- 3 new tool params (terminal, flight_date, flight_time)
- 1 prompt addition (specialty items routing)
- 42 assistant tests still passing

---

*Next: Test mid-conversation service change, authenticated flow, edge cases. Then commit, PR, deploy.*
