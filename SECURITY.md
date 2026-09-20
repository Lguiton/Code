# Security hardening notes

This document records what was hardened and what still needs attention
before serving real customer data.

## What was fixed

**Secrets & configuration**
- `DATABASE_URL`, `JWT_SECRET`, and `GEMINI_API_KEY` are no longer hardcoded.
  They come from environment variables (`backend/.env`), validated at startup
  by `backend/app/core/config.py`. The app **fails fast** if `DATABASE_URL` or
  `JWT_SECRET` is missing, and refuses weak/placeholder JWT secrets.
- `.env.example` documents every setting. `.env` is git-ignored.

**Authentication**
- The frontend's hardcoded `1234` PIN is gone. Operators log in via
  `POST /api/v1/auth/pin-login` with a tenant id + operator code + PIN.
- PINs are stored as bcrypt hashes (`operators` table); seed them with
  `backend/seed_operator.py`.
- JWTs now require `exp`/`tenant_id`/`operator_id`, expire after
  `JWT_EXPIRE_HOURS` (default 12h), and are signed with the configured secret.
- `operator_id` on uploads comes from the signed token, not from a
  client-submitted form field (previously spoofable).
- The frontend keeps the token in React state only — never in `localStorage`.

**Injection & input validation**
- `reporting.py` no longer interpolates `tenant_id` into SQL; it uses a bound
  parameter (`?`). (The `ATTACH` connection string is operator-controlled
  server config, not user input.)
- `log_type` is restricted to an allow-list; uploads are sniffed with
  `filetype` (magic bytes, not just the declared content type) and limited to
  jpeg/png/webp and `MAX_UPLOAD_MB`.
- Uploaded files are stored under `UPLOAD_DIR/<tenant_id>/<uuid>.<ext>` —
  no path traversal possible.

**AI safety**
- The vision mock is now explicit (`MOCK_AI=true`) and **refused in
  production**. Previously, a missing API key silently returned fake
  `VERIFIED` results. Without a key and without mock mode, uploads fail
  closed with 503.

**HTTP hardening**
- CORS restricted to explicit origins (`CORS_ORIGINS`); the old
  `allow_origins=["*"]` + `allow_credentials=True` combo was rejected by
  browsers anyway.
- Security headers middleware (`nosniff`, `DENY` framing, referrer policy,
  HSTS in prod).
- `TrustedHostMiddleware` with configurable `ALLOWED_HOSTS`.
- Sliding-window rate limiting on `/ingestion/upload` and `/auth/pin-login`
  (defaults: 30 req/min per IP) to blunt spam and PIN brute force.
- API docs (`/docs`, `/redoc`, `/openapi.json`) disabled when
  `ENVIRONMENT=prod`.
- Generic 500 responses — exception details go to server logs, not clients.
- `GET /api/v1/health` for load-balancer/orchestrator probes.

**Ops**
- `Dockerfile` + `docker-compose.yml` (Postgres 16 + API) for reproducible deploys.
- **Alembic migrations** (`backend/alembic/`) — the Docker image runs
  `alembic upgrade head` before starting uvicorn, and `AUTO_CREATE_TABLES`
  is off in compose. New schema changes go in
  `backend/alembic/versions/` (see `0001_baseline`,
  `0002_log_review_columns`). Existing dev databases created by
  `create_all` can be stamped instead of rebuilt:
  `alembic stamp 0001_baseline`.

**Manager review workflow**
- `GET /api/v1/review/queue` — tenant-scoped, newest-first list of
  `FLAGGED`/`PENDING` logs with submitter info and AI scores.
- `POST /api/v1/review/{log_id}/decision` — `{"decision": "approve"}`
  marks the log `VERIFIED`; `{"decision": "override", "manager_notes"}`
  marks it `OVERRIDDEN` (notes required). Every decision stamps
  `reviewed_by`/`reviewed_at` for the audit trail. Cross-tenant ids return
  404 (no existence leak); re-reviewing returns 409.
- `GET /api/v1/reports/summary` — tenant-scoped dashboard aggregates
  (totals, verification rate, volume, per-log-type breakdown, recent logs).
- `GET /api/v1/reports/monthly.pdf` — audit-ready monthly PDF (per-type
  table, items needing review, full log listing) for health inspectors.

## Still to do before real production traffic

1. **Object storage** — serve `/uploads` from S3/GCS behind a CDN with signed
   URLs instead of local disk on the API host.
2. **Stronger auth** — consider short-lived access tokens + refresh tokens, and
   step-up approval for manager overrides. PINs are kiosk-appropriate but weak;
   enforce lockout/backoff per operator if tablets are shared.
3. **TLS everywhere** — terminate TLS at the load balancer / reverse proxy;
   HSTS is only emitted when `ENVIRONMENT=prod`.
4. **Observability** — structured log shipping, error tracking (e.g. Sentry),
   and metrics for upload latency / AI failure rate.
5. **Backups & DR** — automated Postgres backups and a tested restore runbook.
6. **Dependency scanning** — run `pip-audit` / Dependabot on both
   `requirements.txt` and `package-lock.json` in CI.
7. **Secrets management** — move `JWT_SECRET`/`GEMINI_API_KEY` into a real
   secret manager (AWS Secrets Manager, Doppler, etc.) instead of `.env` files
   on disk.
