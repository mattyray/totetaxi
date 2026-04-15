
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

Available MCP integrations for this project. At the start of every session, these should be recognized and usable.

- **Google Analytics 4** — `mcp__google-analytics__*` tools (configured in `~/.claude.json` project-scoped). Uses the official `analytics-mcp` pipx package with service account auth. Service account key at `~/.claude/ga4-service-account.json` (gitignored, 600 perms). GA4 Property ID: `533140405`. Google Cloud project: `tote-taxi-474517`. Service account email: `totetaxi-analytics-mcp@tote-taxi-474517.iam.gserviceaccount.com` has Viewer role on the property. Use `run_report`, `run_realtime_report`, `get_account_summaries`, `get_property_details` to pull traffic, events, funnels, and realtime data directly.
- **LangSmith** — `mcp__langsmith__*` tools. Provides access to traces, runs, and projects for the `totetaxi-assistant` LangGraph project. Use `fetch_runs`, `list_projects`, `get_thread_history` to inspect chat agent behavior, tool calls, token usage, and latency.
- **Netlify** — `mcp__netlify__*` tools. Access to the Tote Taxi Netlify site (deploys, env vars, project settings). Use `netlify-project-services-reader` for config, `netlify-deploy-services-reader` for deploy history.
- **Sentry** — `mcp__sentry__*` tools. Access to both Sentry projects (`matthew-raynor/totetaxi-django`, `matthew-raynor/totetaxi-next`, `danielle-candela/totetaxi-backend`). Use `list_issues`, `list_events`, `find_projects`, `get_sentry_resource` to investigate errors.
- **Claude.ai hosted (OAuth required)** — Gmail (`mcp__claude_ai_Gmail__*`), Google Calendar (`mcp__claude_ai_Google_Calendar__*`), Stripe (`mcp__claude_ai_Stripe__*`). Require OAuth authentication on first use via the `__authenticate` tool.

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
- `Payment.booking` is nullable — Payment records are created at PaymentIntent time before a Booking exists. Always null-check `payment.booking` before accessing booking fields
- `select_for_update()` cannot be combined with `select_related()` on nullable FKs in PostgreSQL — use `select_for_update().get()` then access relations separately
- Fly.io `release_command` is disabled (OOM on 256MB machines) — run migrations manually: `fly ssh console -C "su appuser -c 'cd /app && python manage.py migrate'"`
- Celery Beat runs `cleanup_orphaned_payments` daily at 6am — expires `Payment(booking=None, status='pending')` records older than 24 hours and cancels their Stripe PIs
- Celery Beat runs `alert_succeeded_orphans` every 15 min — emails `BOOKING_EMAIL_BCC` when `Payment(status='succeeded', booking=None)` exists for >10 min. Uses `PaymentAudit(action='orphan_alert_sent')` to prevent re-alerting
- `/booking-success` page handles Stripe 3D Secure redirects — reads `payment_intent` and `redirect_status` from URL params, creates booking using `bookingData` from the Zustand store (localStorage)
- `pendingPaymentIntentId` in the booking store (localStorage) enables crash recovery — if a customer pays then refreshes/crashes, `review-payment-step.tsx` auto-retries booking creation on mount
- `customer_info` is conditionally persisted to localStorage only when `pendingPaymentIntentId` is set — this allows 3D Secure redirects to recover guest contact info after a full page reload. It's cleared when the PI is cleared on booking completion
- `booking_token` (UUID) is generated at PI creation time, stored in Stripe PI metadata, and returned to the frontend. Booking creation views verify the token matches — prevents stolen-PI replay attacks. Backwards compatible: PIs without a `booking_token` in metadata skip verification
- `cleanup_orphaned_payments` checks actual Stripe PI status before expiring — if a PI is `succeeded` in Stripe but `pending` in DB (webhook failure), it updates the DB to `succeeded` instead of marking `failed`, so `alert_succeeded_orphans` can catch it
- `alert_succeeded_orphans` writes `PaymentAudit(action='orphan_alert_sent')` records AFTER `send_mail()` succeeds — if email fails, orphans are retried on the next 15-minute run instead of being silently marked as alerted
- C2 PaymentIntent reuse check (`Payment.objects.filter(booking__isnull=False)`) runs inside `transaction.atomic()` with `select_for_update()` — prevents TOCTOU race where two concurrent requests could both pass the check
- Docs (CHANGELOG, INCIDENTS, SECURITY_AUDIT) live in `docs/`, not project root. README.md and CLAUDE.md stay at root
