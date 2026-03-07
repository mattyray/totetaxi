# Tote Taxi

A booking and logistics platform for moving and transport services in the NYC tri-state area and the Hamptons. Customers book services, make payments, and track deliveries. Staff manage bookings, logistics, analytics, and customer data through a dedicated dashboard.

**Live:** [totetaxi.com](https://totetaxi.com)

## Services

- **Mini Moves** — Small apartment moves with tiered packages (Petite, Standard, Grand)
- **Standard Delivery** — Door-to-door delivery for regular and specialty items
- **Specialty Items** — Pelotons, surfboards, cribs, and other oversized items
- **Organizing** — Professional organizing services
- **Airport Transfer** — Luggage transport to/from JFK, LGA, EWR, ISP

## Tech Stack

**Backend:** Django 5.2, Django REST Framework, PostgreSQL 16, Redis 7, Celery + Celery Beat

**Frontend:** Next.js, React 19, TypeScript 5, Tailwind CSS 3, Zustand, React Query

**Payments:** Stripe | **Logistics:** Onfleet | **Email:** Postmark | **Storage:** AWS S3

**AI Chat Agent:** LangGraph + Claude Sonnet (langchain-anthropic) | **Observability:** LangSmith

**Monitoring:** Sentry (frontend + backend) | **Infrastructure:** Fly.io (backend), Netlify (frontend)

## Architecture

```
Frontend (Next.js)          Backend (Django + DRF)
├── App Router pages        ├── /api/public/        — Guest booking, pricing, availability
├── Zustand stores          ├── /api/customer/      — Auth, profiles, booking history
├── React Query             ├── /api/staff/         — Booking management, analytics
├── Booking wizard          ├── /api/payments/      — Stripe intents, webhooks, refunds
├── Staff dashboard         ├── /api/staff/logistics/ — Onfleet integration, tracking
└── Chat widget (SSE)       └── /api/assistant/     — AI chat agent (SSE streaming)
```

### AI Chat Agent

Customer-facing conversational assistant built with LangGraph and Claude Sonnet. Handles service inquiries, pricing estimates, coverage checks, availability lookups, and booking status. When a customer is ready to book, the agent hands off to the booking wizard with pre-filled details.

- 6 read-only tools wrapping existing business logic (no new DB queries)
- SSE streaming over Django with gevent workers for concurrency
- System prompt with full service knowledge (~3k tokens, no RAG needed)
- LangSmith traces every agent run end-to-end

### Security

Two rounds of security audits using custom and general-purpose Claude Code agents:

- **Initial audit (Feb 6-9):** 43 findings across 6 PRs — payment verification, IDOR fixes, webhook auth, PII stripping, staff permissions, N+1 query fixes
- **Chat agent audit (Feb 14):** Custom `llm-security-auditor` agent with 8 LLM-specific vulnerability categories. 35 unique findings across 3 agents — including a critical IDOR via LLM-controlled user_id that only the custom agent caught

167 backend tests. Playwright E2E tests for frontend.

## Project Structure

```
backend/
├── config/              — Settings, URLs, WSGI, Celery config
├── apps/
│   ├── accounts/        — User auth, staff management, JWT
│   ├── bookings/        — Booking CRUD, services, pricing, availability
│   ├── customers/       — Customer profiles, HybridAuthentication
│   ├── logistics/       — Onfleet integration, delivery tracking
│   ├── payments/        — Stripe processing, webhooks, refunds
│   ├── services/        — Service definitions
│   └── assistant/       — AI chat agent (tools, graph, SSE views)
└── scripts/             — Entrypoint, deployment scripts

frontend/src/
├── app/                 — Next.js App Router pages
├── components/          — auth/, booking/, chat/, dashboard/, staff/, ui/
├── stores/              — Zustand (auth, staff-auth, booking, ui)
├── hooks/               — Custom hooks (chat stream, pricing, etc.)
├── lib/                 — API client (Axios), utilities
└── types/               — TypeScript definitions
```

## Local Development

### Backend

```bash
cd backend
cp .env.example .env     # Fill in required values
docker-compose up        # PostgreSQL, Redis, Django, Celery, Beat
docker-compose exec web python manage.py migrate
docker-compose exec web python manage.py createsuperuser
```

### Frontend

```bash
cd frontend
npm install
npm run dev              # http://localhost:3000
```

### Running Tests

```bash
# Backend
docker-compose exec web pytest
docker-compose exec web pytest apps/bookings/    # Single app
docker-compose exec web pytest -x               # Stop on first failure

# Frontend (Playwright)
npm run test:e2e
```

### Local Ports

| Service    | Port |
|------------|------|
| Frontend   | 3000 |
| Backend    | 8005 |
| PostgreSQL | 5435 |
| Redis      | 6382 |

## Deployment

- **Backend:** Fly.io (Newark), 3 processes — web (gunicorn + gevent), worker (Celery), beat (Celery Beat)
- **Frontend:** Netlify, auto-deploys from `frontend/` directory

## Built With

Built with [Claude Code](https://claude.ai/code) (Opus).
