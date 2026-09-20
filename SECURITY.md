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
- Table auto-creation moved out of import time into lifespan startup, gated by
  `AUTO_CREATE_TABLES` (warns in prod).

## Still to do before real production traffic

1. **Database migrations** — replace `AUTO_CREATE_TABLES` with Alembic
   migrations so schema changes are reviewable and reversible.
2. **Object storage** — serve `/uploads` from S3/GCS behind a CDN with signed
   URLs instead of local disk on the API host.
3. **Stronger auth** — consider short-lived access tokens + refresh tokens, and
   step-up approval for manager overrides. PINs are kiosk-appropriate but weak;
   enforce lockout/backoff per operator if tablets are shared.
4. **TLS everywhere** — terminate TLS at the load balancer / reverse proxy;
   HSTS is only emitted when `ENVIRONMENT=prod`.
5. **Observability** — structured log shipping, error tracking (e.g. Sentry),
   and metrics for upload latency / AI failure rate.
6. **Backups & DR** — automated Postgres backups and a tested restore runbook.
7. **Dependency scanning** — run `pip-audit` / Dependabot on both
   `requirements.txt` and `package-lock.json` in CI.
8. **Secrets management** — move `JWT_SECRET`/`GEMINI_API_KEY` into a real
   secret manager (AWS Secrets Manager, Doppler, etc.) instead of `.env` files
   on disk.
