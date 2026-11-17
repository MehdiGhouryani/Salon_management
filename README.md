# NobatAra — نوبت‌آرا

Persian/RTL salon-appointment platform: customer booking with server-side phone OTP,
salon operations panel, and a super-admin governance console.

| | |
|---|---|
| Stack | React 19 + Vite 8 (RTL SPA) · Express + TypeScript (run via `tsx`) · PostgreSQL 16 |
| Status | **Checkpoint `phase-19-checkpoint`** — DEVELOPMENT COMPLETE · MAIN VERIFIED · CI VERIFIED · **staging/production NOT deployed** |
| CI | GitHub Actions (`ci.yml`): typecheck/lint/unit · integration · **real-PostgreSQL DB suite** · build+audit · browser E2E |

## Quick start

```bash
npm ci
cp .env.example .env     # dev template, fully commented
npm run dev              # http://localhost:3000 (in-memory stores without PostgreSQL)
```

With a real database (recommended — the app fails closed in production without one):

```bash
npm run db:migrate       # apply migrations 001-005 (tracked in schema_migrations)
npm run db:seed          # idempotent canonical fixtures
npm run admin:bootstrap  # provision a super admin (operator CLI)
```

## Documentation map

| Document | Contents |
|---|---|
| [`docs/SETUP.md`](docs/SETUP.md) | install, env vars, migrations, tests, SMS setup, **local PostgreSQL without Docker (§7.1)** |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | deployment/operations guide, release checklist, rate-limiter scale notes (§6.1) |
| [`docs/SECURITY.md`](docs/SECURITY.md) | threat model → implemented controls → verification evidence |
| [`docs/KNOWN_ISSUES.md`](docs/KNOWN_ISSUES.md) | remediation ledger + open accepted risks |
| [`docs/PHASE_18_AUDIT.md`](docs/PHASE_18_AUDIT.md) | production-readiness hardening audit |
| [`docs/PHASE_19_AUDIT.md`](docs/PHASE_19_AUDIT.md) | pre-release review, endpoint isolation, runtime-tree findings |
| [`docs/PROJECT_CLOSURE.md`](docs/PROJECT_CLOSURE.md) | checkpoint status, remaining prerequisites, how to resume |
| [`docs/IMPLEMENTATION_STATUS.md`](docs/IMPLEMENTATION_STATUS.md) | phase-by-phase sign-off history |

## Testing

```bash
npm test                      # unit + integration + PostgreSQL layers (set TEST_DATABASE_URL for the DB suite)
npm run test:e2e              # Playwright journeys (CI parity: DATABASE_URL + migrate + seed)
npm run build && npm start    # production build + server
```

Rules the repo is built on (see `docs/SECURITY.md`): never fake success, never silently fall back
to mocks in production, never claim unexecuted tests passed.
