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
| `npm run test:e2e` | `e2e/` — Playwright journeys against the real dev server | storefront, full booking wizard with real OTP, customer booking history |

Database test rules: `TEST_DATABASE_URL` must point at an isolated database (a URL containing `prod` is refused); a configured-but-unreachable database makes the suite **fail**, not skip; fixtures use the `t3-` prefix and clean up only their own rows. See [e2e/README.md](../e2e/README.md) for which E2E journeys are implemented and which are blocked (mock-driven console surfaces).

## 8. Common Troubleshooting

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
