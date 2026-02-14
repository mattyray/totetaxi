
# CLAUDE.md — ToteTaxi

## Project Overview
ToteTaxi is a booking and logistics platform for moving/transport services. Customers book services (Mini Moves, Standard Delivery, Specialty Items, Organizing, Airport Transfer), apply discount codes, make payments via Stripe, and track deliveries. Staff manage bookings, logistics, analytics, and customer data through a dedicated dashboard.

## Tech Stack
- **Backend:** Django 5.2 + Django REST Framework, PostgreSQL 16, Redis 7, Celery + Celery Beat
- **Frontend:** Next.js 16, React 19, TypeScript 5, Tailwind CSS 3, Zustand, React Query
- **Payments:** Stripe | **Logistics:** Onfleet | **Email:** Postmark (SMTP) | **Storage:** AWS S3
- **AI Assistant:** LangGraph + langchain-anthropic (Claude Sonnet) | **Observability:** LangSmith
- **Monitoring:** Sentry (frontend + backend) | **Rate Limiting:** django-ratelimit
- **Static Files:** WhiteNoise | **API Docs:** drf-yasg (Swagger)

## Production URLs
- **Frontend:** https://totetaxi.netlify.app (Netlify)
- **Backend:** https://api.totetaxi.com (Fly.io, region `ewr`)
- **Backend (fallback):** https://totetaxi-backend.fly.dev
- **Django Admin:** https://api.totetaxi.com/admin/

## Development Setup

### Backend (from `/backend`)
```bash
docker-compose up                                    # PostgreSQL :5435, Redis :6382, Django :8005, Celery, Beat
docker-compose exec web python manage.py migrate     # Run migrations
docker-compose exec web python manage.py createsuperuser
```

### Frontend (from `/frontend`)
```bash
npm run dev       # Next.js dev server on :3000
npm run build     # Production build
npm run lint      # ESLint (next/core-web-vitals + next/typescript)
```

### Testing
```bash
# Backend (from /backend) — pytest with SQLite in-memory, Celery eager mode, rate limiting disabled
docker-compose exec web pytest                    # All tests
docker-compose exec web pytest apps/bookings/     # Single app
docker-compose exec web pytest -x                 # Stop on first failure

# Frontend (from /frontend) — Playwright, Chromium only, tests in frontend/tests/e2e/
npm run test:e2e          # Headless
npm run test:e2e:headed   # With browser
npm run test:e2e:ui       # Interactive UI mode
```

## API Structure
The backend API is split by audience (defined in `config/urls.py`):
```
/admin/                  — Django admin
/api/public/             — Public booking endpoints (no auth): services, pricing, availability, guest booking
/api/customer/           — Authenticated customer endpoints: profile, bookings, dashboard
/api/staff/              — Staff endpoints: booking management, analytics, reports
/api/staff/logistics/    — Staff logistics: Onfleet integration, delivery tracking
/api/payments/           — Payment endpoints: Stripe intents, webhooks, refunds
/api/assistant/          — AI chat agent: SSE streaming chat, health check
```

## Project Structure

### Backend (`/backend`)
- `config/` — Settings, root URLs, WSGI, Celery config
- `apps/accounts/` — User auth, staff management, JWT tokens
- `apps/bookings/` — Booking CRUD, service catalog, pricing, availability, guest bookings
- `apps/customers/` — Customer profiles, HybridAuthentication class
- `apps/logistics/` — Onfleet integration, delivery tracking
- `apps/payments/` — Stripe processing, webhooks, refunds
- `apps/services/` — Service definitions
- `apps/assistant/` — AI chat agent (LangGraph tools, SSE views, system prompt)
- `scripts/entrypoint.sh` — Auto-runs migrations + collectstatic on container start

### Frontend (`/frontend/src`)
- `app/` — Next.js App Router pages
- `components/` — Organized by domain: `auth/`, `booking/`, `chat/`, `dashboard/`, `staff/`, `marketing/`, `ui/`, `layout/`, `providers/`
- `stores/` — Zustand stores: `auth-store`, `staff-auth-store`, `booking-store`, `ui-store`
- `hooks/` — Custom React hooks
- `lib/` — API client (Axios), utilities
- `types/` — TypeScript type definitions
- `utils/` — Helper functions

## Code Conventions

### Backend (Python)
- Django apps in `apps/` with standard files: `models.py`, `views.py`, `serializers.py`, `urls.py`
- Views use DRF class-based views (APIView, generics)
- URL patterns use kebab-case: `/api/public/guest-booking/`, `/api/public/validate-zip/`
- Models use UUIDs for public-facing IDs
- Black formatter: line-length 88, target Python 3.11
- isort: profile "black", skips migrations
- Timezone: `America/New_York` (USE_TZ=True)

### Frontend (TypeScript)
- Kebab-case filenames: `booking-wizard.tsx`, `staff-dashboard-overview.tsx`
- Components organized by domain under `components/`
- State: Zustand for client state, React Query for server state
- Forms: React Hook Form + Zod validation
- Styling: Tailwind CSS + Headless UI + Heroicons
- Path alias: `@/*` → `./src/*`
- React strict mode enabled
- `ignoreBuildErrors: true` in next.config (TypeScript errors won't block builds)
- Console.log stripped in production builds (errors/warnings kept)

### Authentication
- DRF uses custom `HybridAuthentication` (from `apps.customers.authentication`), not plain JWT
- Separate auth flows for customers and staff (`auth-store` vs `staff-auth-store`)
- JWT via `djangorestframework-simplejwt`

## Deployment

### Backend — Fly.io
- App: `totetaxi-backend`, region: `ewr` (Newark)
- Uses `Dockerfile.prod` (multi-stage, non-root `appuser`)
- 3 Fly processes: `web` (gunicorn, 4 gevent workers, 100 connections), `worker` (celery), `beat` (celery-beat)
- `release_command` auto-runs migrations on deploy
- Secrets managed via `fly secrets set`

### Frontend — Netlify
- Deploys from the `frontend/` directory
- Production env vars in `.env.production`

## Environment Variables

### Frontend (`frontend/.env.local` for dev, `.env.production` for prod)
- `NEXT_PUBLIC_API_URL` — Backend URL (localhost:8005 dev, api.totetaxi.com prod)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Stripe public key
- `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` — Google Places autocomplete
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` — reCAPTCHA v3 spam prevention
- `NEXT_PUBLIC_SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_ENVIRONMENT` — Sentry config

### Backend (`backend/.env` — see `.env.example`)
- `SECRET_KEY`, `DEBUG`, `DATABASE_URL`, `REDIS_URL`
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- `ONFLEET_API_KEY` — Onfleet logistics (mock mode defaults to True locally)
- `POSTMARK_API_KEY` — Transactional email
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_STORAGE_BUCKET_NAME` — S3 media
- `SENTRY_DSN` — Error monitoring
- `CORS_ALLOWED_ORIGINS` — Allowed frontend origins
- `RECAPTCHA_SECRET_KEY` — Server-side reCAPTCHA validation
- `BOOKING_EMAIL_BCC` — BCC list for booking confirmation emails
- `ANTHROPIC_API_KEY` — Claude API key for AI chat assistant
- `LANGSMITH_API_KEY` — LangSmith observability (optional)
- `LANGSMITH_PROJECT` — LangSmith project name (optional)

## Ports (Local Dev)
| Service    | Host Port | Internal |
|------------|-----------|----------|
| Frontend   | 3000      | 3000     |
| Backend    | 8005      | 8000     |
| PostgreSQL | 5435      | 5432     |
| Redis      | 6382      | 6379     |

## MCP Servers (Claude Code)
- **LangSmith:** `langsmith-mcp-server` is configured in `~/.claude.json`. Provides inline access to LangSmith traces, runs, and projects for the `totetaxi-assistant` project. Use `mcp__langsmith__fetch_runs`, `mcp__langsmith__list_projects`, etc. to inspect chat agent behavior, tool calls, token usage, and latency without leaving the terminal.

## Important Gotchas
- Backend `.env` is required locally — Docker won't start without it (see `.env.example`)
- Fly.io uses real env vars (secrets), not `.env` files — settings.py detects `FLY_APP_NAME` to skip `.env` loading
- The entrypoint script (`scripts/entrypoint.sh`) unsets DB_HOST/DB_NAME/etc on Fly.io to force `DATABASE_URL` usage
- Onfleet defaults to mock/sandbox mode (`ONFLEET_MOCK_MODE=True`) — must explicitly set False for real dispatches
- Tests use in-memory SQLite, not PostgreSQL — some DB-specific queries may behave differently
- `ignoreBuildErrors: true` means TypeScript errors won't fail the Next.js build — lint separately with `npm run lint`
- Production docker-compose (`docker-compose.prod.yml`) uses `.env.production`, Redis auth, internal-only networking, and memory limits
- CORS is configured for `localhost:3000` and `totetaxi.netlify.app` by default
- `fly ssh console` connects as root, but Python packages are installed under `appuser` — use `su appuser -c "cd /app && python manage.py ..."` to run management commands
- `BookingData` interface is duplicated in both `frontend/src/types/index.ts` AND `frontend/src/stores/booking-store.ts` — must update both when adding fields
