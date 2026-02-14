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

*Next: Smoke test the full flow, commit, create PR, deploy to Fly.io, verify SSE through production proxy.*
