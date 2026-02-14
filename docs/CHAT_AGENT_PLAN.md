# ToteTaxi AI Chat Agent — Implementation Plan

## Context
Adding a customer-facing AI chat assistant to ToteTaxi. The agent helps visitors and logged-in customers get service info, pricing estimates, availability checks, and booking status lookups — all without writing to the database. It streams responses via SSE and lives as a floating chat bubble on every customer-facing page.

This is a new `apps/assistant/` Django app on the backend and a `components/chat/` component set on the frontend. No existing code is modified beyond wiring in the new app/component.

---

## Concepts

### SSE (Server-Sent Events)
How the chat response streams word-by-word to the browser (like ChatGPT). Instead of waiting for the full response, the server pushes text chunks in real-time over an open connection.

### Gunicorn Workers
The processes that handle requests on the server (we have 4). Normally each handles one request at a time. SSE holds connections open for seconds, so we switch to **gevent** workers — an upgrade that lets each worker handle many concurrent connections instead of just one.

---

## PR 1: Backend — LangGraph Agent Core

**Branch:** `feature/chat-agent-backend`

### New Files

```
backend/apps/assistant/
├── __init__.py
├── apps.py                    # AssistantConfig
├── admin.py                   # Empty (no models)
├── prompts.py                 # System prompt with all business knowledge
├── tools.py                   # 6 LangGraph tools wrapping existing logic
├── graph.py                   # LangGraph agent definition (state, nodes, edges)
├── views.py                   # SSE streaming ChatView + HealthCheckView
├── urls.py                    # /chat/ and /health/ endpoints
├── migrations/
│   └── __init__.py            # No models, no migrations
└── tests/
    ├── __init__.py
    ├── conftest.py            # Mock ANTHROPIC_API_KEY for tests
    ├── test_tools.py          # Tool functions against real DB fixtures
    └── test_views.py          # SSE endpoint with mocked agent
```

### Modified Files

| File | Change |
|------|--------|
| `backend/config/settings.py` | Add `'apps.assistant'` to LOCAL_APPS, add ANTHROPIC_API_KEY + LangSmith env vars |
| `backend/config/urls.py` | Add `path('api/assistant/', include('apps.assistant.urls'))` |
| `backend/requirements.txt` | Add langchain-anthropic, langchain-core, langgraph, langgraph-checkpoint-redis, langsmith, gevent |
| `backend/.env.example` | Add ANTHROPIC_API_KEY, LANGCHAIN_API_KEY, LANGCHAIN_PROJECT |

### Architecture

**LangGraph Agent (graph.py):**
- `AgentState` with `messages` list (standard ReAct pattern)
- Two nodes: `agent` (calls Claude) and `tools` (executes tool calls)
- Conditional edge: if LLM returns tool_calls → route to tools node, else → END
- Tools node feeds results back to agent node (agent → tools → agent loop)
- `RedisSaver` checkpointer on Redis DB 3 (DB 0=Celery, 1=cache, 2=tests)
- LLM: `claude-sonnet-4-20250514` with `temperature=0.3`, `max_tokens=1024`, streaming=True
- Auth-aware: authenticated users get booking lookup tools; anonymous users get public tools only

**Tools (tools.py) — 6 functions, all read-only:**

| Tool | Wraps | Auth Required |
|------|-------|---------------|
| `check_zip_coverage` | `bookings/zip_codes.py:validate_service_area()` | No |
| `get_pricing_estimate` | `services/models.py` (MiniMovePackage, StandardDeliveryConfig) + pricing math | No |
| `check_availability` | `bookings/models.py:Booking.objects.filter()` + `SurchargeRule` queries | No |
| `lookup_booking_status` | `bookings/models.py:Booking.objects.filter(customer_id=user_id)` — last 5 bookings | Yes |
| `lookup_booking_history` | Same + aggregate stats (total_count, completed, upcoming, total_spent) | Yes |
| `build_booking_handoff` | Returns `{action: 'open_booking_wizard', prefill_data: {...}}` — no DB access | No |

**System Prompt (prompts.py):**
- All service descriptions, pricing rules, and surcharge logic embedded directly (corpus is ~3k tokens — RAG would add latency for zero benefit)
- FAQ knowledge (cancellation, tipping, insurance, prohibited items, etc.)
- Tool usage guidelines (when to use which tool)
- Auth context injected dynamically: "user is logged in (user_id: X)" or "user is NOT logged in"
- Tone: professional but warm, concise (3-4 sentences), dollar amounts not cents

**SSE Endpoint (views.py):**
- `POST /api/assistant/chat/` with `{message, thread_id}`
- `permission_classes = [AllowAny]` — auth detected via `request.user.is_authenticated`
- Rate limit: `20/h per IP` (same pattern as other public endpoints)
- Input validation: max 500 chars, non-empty
- Returns `StreamingHttpResponse` with `content_type='text/event-stream'`
- SSE event types: `token` (streamed text), `tool_call` (tool invocation), `tool_result` (tool output), `done` (end), `error` (failure)
- Error handling: catches agent exceptions, yields SSE error event with fallback message + contact info

### Testing Strategy
- **Tool tests:** Each tool tested against real Django ORM with DB fixtures. No LLM mocking needed — tools are pure business logic wrappers.
- **View tests:** Mock `create_agent` to return a fake agent with predictable stream output. Test SSE content type, rate limiting, auth detection, message validation, error handling.
- **Run:** `docker-compose exec web pytest apps/assistant/ -v`

---

## PR 2: Frontend — Chat Widget

**Branch:** `feature/chat-agent-frontend`

### New Files

```
frontend/src/
├── hooks/
│   └── use-chat-stream.ts          # Custom SSE streaming hook
└── components/chat/
    ├── index.ts                     # Barrel export
    └── chat-widget.tsx              # Floating bubble + chat panel
```

### Modified Files

| File | Change |
|------|--------|
| `frontend/src/components/providers/client-providers.tsx` | Import and render `<ChatWidget />` as sibling to SessionValidator |

### Architecture

**Custom Hook (use-chat-stream.ts):**
- Uses native `fetch()` with `ReadableStream` (Axios doesn't support SSE)
- Sends `credentials: 'include'` for cookie auth + `X-Session-Id` + `X-CSRFToken` headers
- Parses SSE event stream manually
- State: `messages[]`, `isStreaming`, `error`
- `thread_id` generated via `crypto.randomUUID()` on mount (ephemeral — new ID on page reload)
- `AbortController` for clean cancellation when user closes chat mid-stream

**Chat Widget (chat-widget.tsx):**
- **Floating bubble:** Fixed bottom-right, `z-[60]`, navy-900 background
- **Chat panel:** 500px tall (max 70vh), white background with cream-100 message bubbles
- **Hidden on staff pages:** `usePathname()` check for `/staff` prefix
- **User messages:** Navy-900 bg, white text, right-aligned
- **Assistant messages:** Cream-100 bg, navy-900 text, left-aligned
- **Tool activity:** Inline italic text ("Checking service area...", "Calculating estimate...")
- **Booking handoff:** "Start Booking" button in message. On click calls `useBookingWizard.getState().updateBookingData(prefill_data)` then navigates to `/book`
- **Typing indicator:** Three bouncing dots
- **Responsive:** Full-width on mobile, fixed 384px on desktop

---

## PR 3: Deployment + Observability

**Branch:** `feature/chat-agent-deploy`

### Modified Files

| File | Change |
|------|--------|
| `backend/fly.toml` | Web process: add `--worker-class gevent --worker-connections 100` |
| `backend/Dockerfile.prod` | CMD: add `--worker-class gevent --worker-connections 100` |
| `backend/config/settings.py` | LangSmith env var wiring (conditional on presence) |

### New Files

| File | Purpose |
|------|---------|
| `docs/BUILD_LOG.md` | LinkedIn content source — architecture decisions, surprises, metrics |

### Fly.io Secrets

```bash
fly secrets set ANTHROPIC_API_KEY=sk-ant-...
fly secrets set LANGCHAIN_API_KEY=lsv2_...        # Optional, for observability
fly secrets set LANGCHAIN_PROJECT=totetaxi-assistant
```

### Why Gevent
- Sync workers block on SSE (1 connection = 1 blocked worker)
- 4 sync workers + 4 concurrent chats = backend maxed out
- Gevent: same 4 workers handle hundreds of concurrent SSE streams
- Drop-in: one flag change, zero code changes to existing views

---

## Key Decisions Summary

| Decision | Choice | Why |
|----------|--------|-----|
| LLM for agent | Sonnet (not Haiku/Opus) | Best balance of tool-calling quality, speed, and cost |
| Streaming | SSE via StreamingHttpResponse | Works with WSGI, no Django Channels needed |
| Concurrency | Gevent workers | Drop-in replacement, handles concurrent SSE streams |
| Frontend streaming | Custom fetch hook | Simpler than Vercel AI SDK adapter layer |
| Knowledge base | System prompt (not RAG) | Corpus is ~3k tokens, RAG adds latency for no benefit |
| DB safety | Code isolation | Read-only DB user is overkill for single-developer project |
| Conversations | Ephemeral | V1 simplicity; persistence can be added later if needed |
| Conversation state | Redis DB 3 | Avoids conflicts with Celery (0), cache (1), tests (2) |

---

## New Dependencies

### Backend (requirements.txt)
- `langchain-anthropic` — Claude integration for LangChain
- `langchain-core` — Base LangChain types and tools
- `langgraph` — Agent graph framework (state machine for tool calling)
- `langgraph-checkpoint-redis` — Redis-backed conversation memory
- `langsmith` — Observability/tracing (optional)
- `gevent` — Async gunicorn workers for SSE streaming

### Frontend (package.json)
- None — uses native `fetch()` API for SSE streaming

---

## Environment Variables Needed

| Variable | Where | Required |
|----------|-------|----------|
| `ANTHROPIC_API_KEY` | Backend .env + Fly secrets | Yes |
| `LANGCHAIN_API_KEY` | Backend .env + Fly secrets | No (observability only) |
| `LANGCHAIN_PROJECT` | Backend .env + Fly secrets | No (defaults to totetaxi-assistant) |
