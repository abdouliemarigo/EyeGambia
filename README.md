# EyeGambia v0.3

**One AI. Every mission.**

This release focuses on building the real product engine before Supabase integration.

## Implemented in v0.3

- Mission-first Eye Mode
- Local persistent conversations/projects with browser storage
- Local context/memory window sent to the AI
- EyeResearch mode with OpenAI web-search tool
- Text/code file attachments
- EyeCode code review endpoint + workspace
- EyeBuild product blueprint endpoint + workspace
- EyeAgents mission mode
- Server-side OpenAI SDK integration
- Input validation and size limits
- In-memory IP rate limiting for development/prototype protection
- Output token cap for cost control
- Request IDs and server error logging
- Health endpoint: `/api/health`
- Security headers including CSP, clickjacking protection, MIME protection and referrer policy
- Responsive futuristic UI

## Run

```bash
npm install
cp .env.example .env.local
npm run typecheck
npm run dev
```

Open `http://localhost:3000`.

For live AI, put your API key in `.env.local`. The browser never receives it.

## What is intentionally still pending

- Real user accounts and OAuth
- Durable cross-device conversations/memory
- Supabase persistence/RLS (final phase)
- Production-grade distributed rate limiting
- Stripe subscription billing
- Durable background agents
- Sandboxed code execution
- Real app file generation/deployment
- Image/PDF extraction and multimodal file pipelines
- Sentry/observability integration

These are separated from the UI so Supabase can be added last without rebuilding the product.

## Production note

The in-memory rate limiter is not sufficient for a multi-instance deployment. Production should use a shared limiter (for example Redis/Upstash) and per-user authenticated quotas. OpenAI recommends controlling request/token sizes and using backoff for rate-limit resilience.

## v0.4 engine additions

- Eye ID local account/session layer (Supabase intentionally deferred)
- Server-side memory storage for cross-device capable deployments
- EyeAgents orchestrator with specialist roles
- Docker-gated sandbox execution endpoint for JavaScript
- EyeBuild real starter-app ZIP generation
- Stripe Checkout adapter (requires STRIPE_SECRET_KEY + STRIPE_PRO_PRICE_ID)
- Production environment hooks for distributed rate limiting and monitoring

### Sandbox safety

Do not enable `EYEGAMBIA_SANDBOX_ENABLED` on a shared production server unless the Docker runner is hardened. The runner uses no network, memory/CPU/PID limits and a read-only mount. For production, use a dedicated sandbox service or microVM.

### Accounts before Supabase

The temporary account layer stores users and sessions in `.eyegambia-data/db.json`. This is useful for development and a single persistent server, but it is **not** a replacement for Supabase/Postgres at scale. Supabase remains the final persistence/authentication migration.


## Distributed rate limiting and monitoring (v0.5)

EyeGambia now supports production-oriented distributed controls without requiring Supabase.

### Upstash Redis

Set these server-only variables in production:

```env
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
EYEGAMBIA_METRICS_TOKEN=use-a-long-random-secret
```

The application then uses Upstash Redis for:

- distributed sliding-window rate limiting
- request/error counters
- recent structured metric events
- Redis health checks

If Redis is not configured, development falls back to an in-process limiter and JSON/console logging. **Do not treat that fallback as production-grade across multiple instances.**

### Monitoring endpoint

With `EYEGAMBIA_METRICS_TOKEN` configured:

```text
GET /api/metrics
Authorization: Bearer <metrics-token>
```

The endpoint is intentionally protected and returns no-cache monitoring data.

### Health endpoint

```text
GET /api/health
```

It reports AI configuration, Redis/rate-limit mode and monitoring status. If Redis is configured but unhealthy, the endpoint returns HTTP 503.

### Rate-limit policy

Current server limits are deliberately conservative:

- Chat: 12/min unauthenticated, 30/min authenticated
- Agents: 10/min
- EyeBuild: 8/min
- EyeCode: 15/min
- Sandbox: 5/min
- Billing: 5/min
- Login: 8/min
- Signup: 5/min

These are infrastructure safeguards, not the final commercial "unlimited" policy. Pro/free quotas should be decided by the product billing layer later.


## v0.6.1 Operations / Observability — reviewed and hardened

This release adds:

- request/trace IDs (`x-eyegambia-trace-id`)
- request/response/error telemetry
- AI token accounting from Responses API usage
- configurable estimated AI cost accounting
- an authenticated `/admin` operations dashboard
- `/api/admin/overview`
- expanded `/api/health`
- Redis-ready distributed telemetry
- environment-driven output-token ceiling

### Admin dashboard

Set:

```env
EYEGAMBIA_METRICS_TOKEN=long-random-secret
```

Then send the same value as:

```text
x-eyegambia-admin-token: long-random-secret
```

The dashboard is intentionally not public. Supabase/RBAC will replace this temporary admin gate in the final phase.

### Cost accounting

Cost is an estimate. Configure the per-million-token values in `.env.local` using your provider's current billing rates. The system records actual input/output token counts returned by the model API.

### Production alerts

The app exposes health/metrics data for an external uptime or alerting service. The next production step is wiring `/api/health` and error events to an alert provider rather than sending alerts from the request path itself.


### Review fixes in v0.6.1

- Fixed the admin page client directive/import ordering.
- Fixed the admin dashboard so its token is actually sent to the protected API.
- Unified Redis observability so the dashboard and `/api/metrics` read the same event store.
- Added distributed rate limiting to the main chat endpoint and generated-app endpoint.
- Chat now forwards recent history and attached text/code to the model.
- Chat now records authenticated user memory.
- Session expiry is enforced server-side.
- Billing checkout now uses the authenticated account email rather than accepting an arbitrary email from the browser.
- Deployment requires authentication and explicit approval.
- Health checks now actually ping Redis instead of merely checking whether credentials exist.
- Removed the stale TypeScript build cache from the project archive.
- Removed the duplicate observability implementation.
- Hardened generated-app string escaping and added TypeScript/React type dependencies to generated projects.
- Production CSP no longer includes `unsafe-eval`; it remains available only in development.

Full dependency installation/build could not be completed in this isolated environment because the package registry timed out. The source-level review and archive integrity checks were completed.
