# NobatAra — Project Closure (Temporary Development Halt)

**Date:** 2026-11-17
**Status:** DEVELOPMENT COMPLETE through Phase 19 · MAIN BRANCH VERIFIED · CI VERIFIED
**Scope:** checkpoint + temporary closure — **not** a production-release certification. No production deployment, no live SMS credentials, no new infrastructure (no Redis).

---

## 1. Development summary (Phases 0 → 19)

NobatAra evolved from a client-only mock SPA (baseline audit 2026-10-19) into a full-stack, security-hardened Persian salon-booking platform:

- **Stack:** React 19 + Vite 8 SPA (RTL, dark default) · Express + TypeScript server run via `tsx` (zero-transpile-drift) · PostgreSQL 16 (5 versioned migrations) · Vitest (unit/integration/real-PG layers) · Playwright browser E2E · GitHub Actions CI.
- **Security posture:** server-side OTP (CSPRNG, HMAC-at-rest, purpose-bound), hashed opaque sessions, CSRF origin validation, server-enforced RBAC + tenant isolation, append-only audit log, fail-closed DB/SMS behavior, rate-limited endpoints, production posture hard-gated.
- **Final phases:** Phase 18 = real-PostgreSQL reliability (migration 004 fixed, holiday/status-transition production bugs fixed, real admin aggregates, contrast-inclusive a11y gates, E2E isolation). Phase 19 = independent review, test-only-endpoint hardening (explicit flag + allowlist), minimal Docker runtime tree, scalability/advisory documentation, clean release-candidate commit.

## 2. Final main branch state

| Item | Value |
|---|---|
| **Final main commit** | the tip of `work/db-reliability` fast-forwarded into `main` (see `git log -1 main`; includes `ed2fb95` Phase 18/19 hardening, `fd1fe8b` audit hash record, `e7a31bd` + `123dca7` first-CI-execution fixes, `2309ca1` calendar-proof E2E journey, and the closure-doc commit) |
| **Checkpoint tag** | `phase-19-checkpoint` (annotated, pushed) |
| **History** | fully linear/fast-forward — no rewrites, no force pushes |
| **Working tree** | clean at closure |

## 3. Final CI results (first real CI execution ever)

**GitHub Actions run `44153409891` — ALL 5 JOBS SUCCESS** on commit `2309ca1`:
- Typecheck, lint & unit tests — **success**
- HTTP integration tests (real Express app) — **success**
- PostgreSQL-backed tests (real DB, fail-closed) — **success** (the 23 formerly-skipped tests ran in CI for the first time; migration 001–005 verified)
- Production build & dependency audit — **success**
- Browser E2E (real server + PostgreSQL) — **success** (17/18 first-attempt + 1 retry; the closed-Friday calendar case was then made calendar-proof)

Three first-execution defects were found, root-caused, fixed, and verified (each reproduced locally in exact CI parity before the fix):
1. `ci.yml` YAML startup failure — `({default: pg})` colon-space inside plain scalars → block scalars.
2. Integration job missing `npm run build` (production-posture suite serves `dist/`).
3. E2E job missing `npm run db:seed` (journeys need canonical fixtures).

## 4. Verification status ledger

| Area | Status |
|---|---|
| Local regression (Phase 19) | **PASS** — 202/202 Vitest, 25/25 real-PG, 18/18 Playwright ×2 (CI-parity DB), build clean, `npm audit --omit=dev` 0 vulnerabilities |
| Remote CI | **VERIFIED** — all 5 jobs green |
| PostgreSQL | **VERIFIED** — migrations 001–005 from empty DB + 25/25 suite on real PG 16.15 (local portable instance AND CI service) |
| Live SMS (Kavenegar) | **BLOCKED** — no credentials; delivery layer fail-closed and unit-tested; explicitly NOT verified against the real telco |
| Docker image build | **NOT TESTED** — Docker unavailable locally; the runtime stage's production-only dependency tree (~17 MB) was verified by booting the exact tree against real PostgreSQL |
| Screen-reader / physical-device accessibility | **NOT TESTED** — manual prerequisite (axe scans incl. contrast are green in both themes) |
| Staging deployment | **NOT DEPLOYED** |
| Production deployment | **NOT DEPLOYED** |

## 5. Known remaining defects

| ID | Severity | Item |
|---|---|---|
| DEF-19-1 | P3 | `journey-salon-ops` flaked once in 9 full-suite runs (never in isolation); unexplained; CI `retries: 1` covers single flakes |
| DEF-18-1 | P3 | picomatch ReDoS (CVE-2026-112366) — dev toolchain only, no upstream fix; accepted + documented (`KNOWN_ISSUES.md`) |
| DEF-18-3 | P3 | In-memory rate limiter is per-process — single-instance gate in the release checklist; shared-store design documented (`DEPLOYMENT.md §6.1`) |

## 6. Outstanding deployment prerequisites (operator actions)

1. Managed PostgreSQL 16 provisioning (`DATABASE_URL`, `sslmode=require`).
2. Kavenegar account + approved `{token}` template + `KAVENEGAR_API_KEY` (docs/SETUP.md §8).
3. Domain + TLS-terminating reverse proxy (`TRUST_PROXY_COUNT=1`).
4. Docker image build verification (`docker build -t nobatara:latest .`) on a machine with Docker.
5. Manual NVDA/VoiceOver + physical-device accessibility pass.
6. Staging smoke test per `docs/DEPLOYMENT.md §8` release checklist (single instance).

## 7. Resuming development later — safe procedure

1. `git fetch origin && git checkout main && git log -1` — confirm the checkpoint commit and tag (`git tag -l phase-19-checkpoint`).
2. `git checkout -b work/<new-track> main` — never commit on `main` directly.
3. `npm ci` → `npm run typecheck` → `npm test` → keep the layers green before changing anything.
4. Database work: `docs/SETUP.md §7.1` documents the reproducible local PostgreSQL-16 procedure (portable binaries, isolated `nobatara_test`, `TEST_DATABASE_URL`). New migrations need `*_down.sql` and must be applied to staging before production.
5. E2E: `npm run test:e2e` (CI parity: `DATABASE_URL` + migrate + **seed**, idempotent).
6. Test-only endpoints stay behind `ENABLE_TEST_ENDPOINTS=true` — never set it in staging/production.
7. Before any release: re-run `docs/DEPLOYMENT.md §8` checklist; re-audit picomatch (upgrade when a fixed release exists); reconsider the shared rate-limit store if scaling beyond one instance.
8. When work resumes in earnest, supersede this document with a fresh status tracker — do not treat closure as a design freeze on requirements, only on this checkpoint's scope.
