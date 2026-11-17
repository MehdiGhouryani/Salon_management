# NobatAra — Deployment & Operations Guide (Phase 16)

**Scope:** controlled staging/production deployment. This repository performs **no**
live deployment; every external account (domain, hosting, PostgreSQL, SMS) is an
explicit operator prerequisite listed in §7. The pre-Phase-16 guide is preserved
at `docs/DEPLOYMENT_LEGACY.md`.

---

## 1. Architecture overview

```
Browser (React SPA, RTL, dark default)
   | HTTPS
   v
Reverse proxy / load balancer (TLS termination)        <- TRUST_PROXY_COUNT=1
   v
Node.js API + static SPA (Express, port 8080)          <- this repo, Dockerfile
   |-- /api/auth        OTP login, sessions, grants
   |-- /api/public      storefront, availability, booking, tracking
   |-- /api/salon/:id   tenant panel (membership-gated)
   |-- /api/admin       super-admin governance (RBAC + audit)
   |-- /api/health      liveness (no DB) / readiness (DB probe)
   +-- PostgreSQL 16    canonical data (migrations 001-005)
```

Key modules: `server/services/booking/bookingRules.ts` (single booking engine),
`server/services/auth/otpService.ts` + `sms/` (OTP + SMS), `server/middleware/`
(CSRF, correlation, rate limit), `docs/API_CONTRACTS_SALON_OPERATIONS.md`.

## 2. Environment reference

Full variable reference with defaults lives in `.env.example` (dev) and
`.env.production.example` (production checklist). Mandatory production values:

| Variable | Requirement |
|---|---|
| `DATABASE_URL` | PostgreSQL 14+; server **refuses to start** without it |
| `SESSION_SECRET` | >=32 random chars (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`) |
| `CORS_ORIGIN` | Exact https origins allowed to call the API cross-origin |
| `TRUST_PROXY_COUNT` | `1` behind one reverse proxy (default 0 trusts nothing) |
| `KAVENEGAR_API_KEY`, `SMS_TEMPLATE`, `SMS_PROVIDER` | OTP delivery (docs/SETUP.md section 8) |
| `NODE_ENV=production` | Secure cookies, fail-closed DB, HSTS, SAMEORIGIN |

## 3. First deployment (staging-like)

1. **Provision PostgreSQL** - managed instance or `docker compose up -d nobatara-db`
   (local compose file; volume `nobatara_pgdata`, port bound to 127.0.0.1 only).
2. **Configure secrets** in the platform secret manager (never in git).
3. **Build** `docker build -t nobatara:latest .` (multi-stage, non-root, healthcheck).
4. **Migrate once before first start:** `DATABASE_URL=... npm run db:migrate` -
   applies 001-005 in order inside transactions; tracked in `schema_migrations`;
   startup never auto-migrates.
5. **Verify:** `curl /api/health/live` (200, DB-independent) and
   `/api/health/ready` (200 when DB reachable). Log in via OTP, book a test
   appointment, confirm it appears in the salon panel.

## 4. Database operations

**Backup (before every migration and daily):**
```bash
pg_dump "$DATABASE_URL" --format=custom --file=backup-$(date +%F-%H%M).dump
```
**Restore:**
```bash
pg_restore --clean --if-exists --dbname "$DATABASE_URL" backup-<file>.dump
```
**Migration procedure:** run `npm run db:migrate` in a maintenance window with a
fresh backup present; `npm run db:status` must show all applied afterwards.
**Rollback:** `npm run db:rollback` reverses one migration via its `*_down.sql`
(004/005 downs are data-preserving; see their headers). Application rollback =
redeploy previous image tag; migrations 004/005 are backward-compatible with the
previous app version (additive columns only).
**Monitoring:** `/api/health/ready` probes `SELECT 1` with a 3s timeout and
reports latency + reachability; alert on `unhealthy` for >1 minute.

## 5. Application operations

- **Liveness** `/api/health/live` - process only; keep load-balancer checks here.
- **Readiness** `/api/health/ready` - DB probe; remove from rotation while unhealthy.
- **Graceful shutdown** - SIGTERM closes the HTTP server, drains the DB pool, exits.
- **Structured logs** - every HTTP line is JSON (`{ts, level, requestId, method, path, status, durationMs}`); `X-Request-Id` response header correlates a client report to server logs. Query strings are never logged.
- **Metrics (minimum set)** - health readiness status, HTTP 5xx rate (log-derived), DB latency from `checkDbHealth`, OTP request/429 counts (log-derived).

## 6. Security runbook (summary - full policy in docs/SECURITY.md)

- TLS terminated at the proxy; HSTS + SAMEORIGIN set by the app in production.
- Cookies: HttpOnly, Secure, SameSite=Lax. CSRF: Origin allowlist + `X-NobatAra-Client` on mutations.
- Secrets: platform secret manager only; `.env*` files never committed.
- DB: dedicated non-superuser role for the app; admin access via bastion, not public exposure (local compose binds 127.0.0.1 only).
- Admin access: super_admin provisioned only via `scripts/bootstrapAdmin.ts`; last-admin and self-lockout protections enforced server-side.
- Log privacy: phones masked in SMS logs; OTP codes never logged; query strings never logged.
- Dev/test-only reset endpoints (`/api/dev/reset-*`): absent in production (404) and additionally hard-disabled unless the process was explicitly started with `ENABLE_TEST_ENDPOINTS=true` — never set that outside a deliberate test run.

### 6.1 Rate limiter scalability (Phase 19 analysis — current scope and the multi-instance path)

**Current implementation** (`server/middleware/rateLimit.ts`): a fixed-window
counter kept in an **in-process `Map`**, keyed by server-derived identity
(`req.ip` honoring `TRUST_PROXY_COUNT`, plus the phone where applicable).

**Single-process limitation (honest scope):**
- The counter lives in one Node process's memory. It does not survive restarts
  and is not shared with any other process.
- With exactly ONE application instance the documented limits are exact:
  e.g. `/api/auth/otp/request` allows 10 sends per IP per 10 minutes.

**What happens with multiple instances behind a load balancer:**
- Every instance keeps its own map, so the effective allowance multiplies by
  the instance count: N instances → a client can send up to **N × max** within
  one window.
- Because the per-instance windows start independently (first request each
  instance sees), bursts can also slip across unsynchronized windows.
- **Bypass is real, not theoretical**: with round-robin balancing, consecutive
  requests from one client land on different instances and may never exceed
  any single instance's counter. The same applies to the OTP service's
  per-phone/IP counter (`otpService.countRecentRequests`) in its in-memory
  mode. (The DB-backed OTP counter does NOT have this problem when instances
  share one PostgreSQL — it is shared by construction.)

**Recommended shared-storage architecture for a future phase (no dependency
introduced now):**
1. **Preferred — Redis** (atomic `INCR` + `EXPIRE`, or a sorted-set sliding
   window): sub-millisecond, purpose-built, single source of truth for all
   instances. Justified once horizontal scaling is actually planned.
2. **Zero-new-infrastructure alternative — PostgreSQL**: a small
   `rate_limit_buckets(key PK, window_start, count)` table with an atomic
   UPSERT. Correct but adds ~1 DB round trip per limited request — acceptable
   for OTP/admin routes, not for global high-rate middleware.
3. Either way, the `rateLimit()` call sites keep their current shape: only the
   bucket store swaps behind the same `keyFor` contract.

Until a shared store exists, **run a single application instance** (the
deployment defaults to one) — this is recorded in the release checklist.

## 7. External prerequisites (operator actions - none performed by this repo)

1. **PostgreSQL hosting** (managed Cloud SQL / self-managed).
2. **Kavenegar account + approved OTP template + credit** (docs/SETUP.md section 8).
3. **Domain + TLS certificate** and the reverse proxy in front of the container.
4. **Hosting environment** (Cloud Run / VM / Kubernetes - image is portable).

## 8. Release checklist (gate every production release)

- [ ] Working tree clean on the release commit; CI green (quality, integration, **database**, build, E2E jobs)
- [ ] `npm run build` succeeds locally; dist artifact attached to the release
- [ ] `npm audit` - 0 high/critical
- [ ] Migrations reviewed (`db:status`); new migrations have `*_down.sql` and were applied to **staging** first
- [ ] Fresh `pg_dump` backup taken and restore-tested on staging
- [ ] Staging smoke test: OTP login, booking creation, salon panel load, admin status change
- [ ] Rollback plan: previous image tag + `db:rollback` path documented in release notes
- [ ] Scale = ONE application instance (§6.1: the in-memory rate limiter is per-process; a shared store is a prerequisite for horizontal scaling)
- [ ] **Explicit production approval** recorded (operator sign-off)

## 9. Troubleshooting quick reference

| Symptom | Cause / action |
|---|---|
| Server exits: "PostgreSQL database is mandatory" | Production without `DATABASE_URL` - intended fail-fast |
| `/api/health/ready` 503 `unreachable` | DB configured but down - check credentials/SSL/network |
| OTP 503 `SMS_DELIVERY_FAILED` / `SMS_PROVIDER_NO_CREDIT` | See docs/SETUP.md section 8; provider account/credit/template |
| 401 on authenticated calls | Session cookie missing/expired - check HTTPS + SameSite |
| 403 `CSRF_ORIGIN_*` | Origin not in `CORS_ORIGIN`; use exact origins |
| 429 `RATE_LIMITED` | Expected limiter; inspect `Retry-After` header |
