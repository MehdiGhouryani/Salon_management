# NobatAra — Engineering Setup

Concise guide for building, running, and testing NobatAra (Persian/RTL salon booking platform: React + TypeScript frontend, Express backend, PostgreSQL).

## 1. Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | `>=22.12.0 <25` (engines) | **24.x LTS is the tested line**; exact dev pin in [`.nvmrc`](../.nvmrc) (`24.22.1`) |
| npm | `>=10.0.0` | Pinned in `package.json` → `packageManager: npm@11.19.1` |
| PostgreSQL | 14+ | **Mandatory for production.** Optional for development (in-memory dev stores, non-persistent) |

Check: `node -v && npm -v`.

## 2. Installation

```bash
npm ci          # clean, lockfile-based install (recommended)
# or
npm install     # respects package-lock.json
```

The committed `package-lock.json` makes installs reproducible. `esbuild` is pinned to `^0.28.0` to satisfy Vite 8's peer requirement — plain `npm install` works without `--legacy-peer-deps`.

## 3. Environment Variables

```bash
cp .env.example .env   # development template, fully commented
```

- Every variable is documented inline in [`.env.example`](../.env.example).
- Production requirements checklist: [`.env.production.example`](../.env.production.example) (template only — never commit real secrets).
- `.env` is loaded **only** when `NODE_ENV != production` (`server/config.ts`). Production reads the process environment from the platform's secret manager.
- **Production fail-fast:** the server refuses to start without `DATABASE_URL` (or discrete `DB_*` vars) and a `SESSION_SECRET` of 32+ chars. Missing `KAVENEGAR_API_KEY` logs a warning and SMS fails closed per request.

## 4. Local Development

```bash
npm run dev      # Express + Vite middleware on http://localhost:3000 (HMR)
```

Development without PostgreSQL runs on **in-memory dev stores** — data resets on restart, by design. This behavior never applies in production mode (fail-closed / fail-fast instead).

## 5. Database

```bash
npm run db:migrate    # apply up migrations (server/db/migrations/*.sql)
npm run db:rollback   # roll back the last migration
npm run db:status     # inspection: applied vs pending migrations
npm run db:seed       # seed canonical fixtures (production-locked; needs --force-production-seed)
npm run admin:bootstrap  # provision a super admin: tsx scripts/bootstrapAdmin.ts --phone <phone> --confirm
```

Migrations are versioned SQL with matching `*_down.sql` scripts; state is tracked in `schema_migrations`.

## 6. Build & Production Start

```bash
npm run build    # vite build → dist/
npm start        # node server.ts (serves dist/ + /api) — requires production env vars
```

`npm start` runs the TypeScript server entry directly via Node's native type stripping (Node 22.12+/24). Verify quickly:

```bash
NODE_ENV=production DATABASE_URL=postgresql://localhost:5432/nobatara \
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))") \
npm start
```

## 7. Tests

Framework: **Vitest** (single framework, same pipeline as Vite) + **Playwright** for browser E2E.

| Command | Layer | What it proves |
|---|---|---|
| `npm run test:unit` | `tests/unit/` — pure domain logic & services (in-memory adapters, explicitly labeled) | OTP lifecycle, sessions, RBAC/CSRF middleware, booking domain rules, repo contracts |
| `npm run test:integration` | `tests/integration/` — **real Express app** (`createApp()`) over HTTP + spawned production servers | auth, cookie flags, OTP rate limits, admin/salon authorization, CSRF prod posture, JSON error contracts |
| `npm run test:db` | `tests/db/` — **real PostgreSQL** (set `TEST_DATABASE_URL`) | migrations, real persistence, transaction rollback, unique constraints, booking concurrency races |
| `npm test` | all Vitest layers | DB suite reports **skipped/blocked** when `TEST_DATABASE_URL` is unset — never silently passes |
| `npm run test:e2e` | `e2e/` — Playwright journeys against the real dev server | storefront, full booking wizard with real OTP + grant, customer history + server-confirmed cancellation (CI runs E2E against isolated PostgreSQL) |

Database test rules: `TEST_DATABASE_URL` must point at an isolated database (a URL containing `prod` is refused); a configured-but-unreachable database makes the suite **fail**, not skip; fixtures use the `t3-` prefix and clean up only their own rows. See [e2e/README.md](../e2e/README.md) for which E2E journeys are implemented and which are blocked (mock-driven console surfaces).

### 7.1 Running the PostgreSQL-backed tests locally without Docker

CI provisions PostgreSQL 16 as a service container. When neither Docker nor a
local PostgreSQL is available (e.g. a locked-down Windows workstation), the
same verification is reproducible with **portable binaries** — no installer, no
admin rights, fully isolated throwaway cluster:

```bash
# 1. Obtain PostgreSQL 16 binaries (either source):
#    a) EDB zip: https://www.enterprisedb.com/download-postgresql-binaries
#       (postgresql-16.x-1-windows-x64-binaries.zip → extract "pgsql")
#    b) npm: npm pack @embedded-postgres/windows-x64@16.x → extract package/native
#       (ships initdb/pg_ctl/postgres only — no psql; use node pg for SQL below)

# 2. Initialize a throwaway cluster (D:\pg16-portable-test\data), dedicated
#    superuser, UTF-8, on a non-default port:
initdb.exe -D D:\pg16-portable-test\data -U nobatara_test -A scram-sha-256 \
  --pwfile=<file-with-password> -E UTF8 --no-locale
postgres.exe -D D:\pg16-portable-test\data -p 5433

# 3. Create the database (no psql in the npm package? use node):
node -e "import('pg').then(async ({default: pg}) => {
  const c = new pg.Client({connectionString: 'postgresql://nobatara_test:<pw>@127.0.0.1:5433/postgres'});
  await c.connect(); await c.query('CREATE DATABASE nobatara_test'); await c.end();
});"

# 4. Verify the migration chain from an EMPTY database (001→005), tracking and
#    idempotency, then run the fail-closed DB suite:
export DATABASE_URL="postgresql://nobatara_test:<pw>@127.0.0.1:5433/nobatara_test"
npm run db:migrate && npm run db:migrate   # second run must be a no-op
export TEST_DATABASE_URL="$DATABASE_URL"
npm run test:db

# 5. E2E with full CI parity (persistent DB; migrations + idempotent seed):
npm run db:seed    # idempotent; safe to repeat
npx playwright test
```

The cluster lives entirely in its own data directory — delete it (and the
binaries) when done; nothing is installed system-wide and no production
credential is ever involved.

## 8. SMS Provider Setup (production OTP delivery)

NobatAra sends OTP codes through **Kavenegar**'s verify/lookup API. No account is created
by this repository and no live SMS is sent from tests or development.

**Provider modes** (`SMS_PROVIDER`):
- `kavenegar` — real gateway; requires `KAVENEGAR_API_KEY`
- `null` — explicitly disabled; OTP requests fail closed with `SMS_PROVIDER_DISABLED`-class errors (never a mock)

**Production setup steps** (no secrets in this repository):
1. In the Kavenegar dashboard, create/approve a verify/lookup **template** whose name matches
   `SMS_TEMPLATE` (default `nobatara-otp`). The template must contain the `{token}` placeholder.
2. Store the API key in the platform secret manager as `KAVENEGAR_API_KEY`.
3. Set `SMS_PROVIDER=kavenegar`, `SMS_TEMPLATE=<approved-name>`, and optionally tune
   `SMS_TIMEOUT_MS` (default 10000) and `SMS_MAX_ATTEMPTS` (default 2, transport failures only).
4. Restart the service. `/api/health/ready` logs a warning until SMS is configured;
   `SMS_PROVIDER=null` in production logs an explicit "OTP delivery disabled" warning.

**Reliability contract** (enforced in `server/services/sms/kavenegarProvider.ts`):
- per-attempt timeout, bounded retries for transport failures only
- business rejections (no credit `SMS_PROVIDER_NO_CREDIT`, unapproved template,
  throttling `SMS_PROVIDER_RATE_LIMITED`, suspended account) return structured
  `errorCode`s and are never retried
- logs mask phone numbers (`0912****89`) and never contain the OTP code
- OTP rate limits (cooldown + per-phone/IP counters) run BEFORE the provider is called

**Client error contract:** OTP request failures return a generic Persian message plus a
structured `error` code (`SMS_DELIVERY_FAILED`, `SMS_PROVIDER_TIMEOUT`, …). Provider
internals (API key, raw responses, full phone) never reach the client.

## 9. Common Troubleshooting

| Symptom | Cause / Fix |
|---|---|
| `npm install` fails with `ERESOLVE` on esbuild | Your checkout predates the esbuild fix; use a branch with `esbuild: ^0.28.0` in `package.json` |
| `npm ci` mismatch error | `package.json` and `package-lock.json` out of sync — re-run `npm install` and commit the updated lockfile |
| Server exits: `Invalid NODE_ENV` / `Invalid PORT` | Bad env values; see `.env.example` for allowed ranges |
| Server exits: "PostgreSQL database is mandatory" | Production mode without `DATABASE_URL`/`DB_HOST` — intentional fail-fast |
| `/api/health/ready` returns 503 `unhealthy` | DB configured but unreachable — check credentials/SSL; liveness (`/live`) stays independent |
| Port 3000 busy | `PORT=3001 npm run dev` |
| Booking/OTP works locally but resets on restart | Expected: development in-memory stores; configure PostgreSQL for persistence |
| Persian text renders with wrong digits/calendar | Presentation-layer concern (Jalali conversion); backend always stores Gregorian |
