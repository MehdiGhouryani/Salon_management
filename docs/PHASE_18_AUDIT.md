# NobatAra — Phase 18 Audit Report
## Production Readiness Hardening & Final Verification

**Date:** 2026-11-17
**Branch:** `work/db-reliability` (working tree holds the Phase 18 changes, uncommitted)
**Verifier:** Phase 18 engagement — Senior Staff/Security/QA review
**Overall movement:** DEVELOPMENT READY → **STAGING READY (locally verified)** · CI execution still unverified (branch unpushed by rule)

---

## 1. Verified Git State

| Item | Value |
|---|---|
| Branch | `work/db-reliability` |
| HEAD at engagement start | `5d2ddbb` (`feat(infra): Phase 16 …`) |
| origin/main | `8de9001` — unchanged; branch is 56 commits ahead, 0 behind |
| Working tree at start | clean (matched the Phase 17 historical references exactly) |
| Remote | `https://github.com/MehdiGhouryani/Salon_management.git` |
| Pushed? | **No** — per engagement rules (nothing pushed, nothing merged, nothing deployed) |
| Working tree at end | Phase 18 changes present (uncommitted, see §2) |

Phase 17 implementation lives entirely in `work/db-reliability` (HEAD 5d2ddbb). No branch switching, no destructive Git commands, no uncommitted work overwritten.

## 2. Changed Files (29 modified + 1 new directory)

**Server (production fixes):**
- `server/db/migrations/004_canonical_dates_and_schedule_integrity.sql` — 3 real-PostgreSQL bugs fixed (§4)
- `server/repositories/appointmentRepository.ts` — status-transition `$1` type-inference fix; new `getSalonBookingAggregates()`
- `server/repositories/salonRepository.ts` — availability-exception DATE columns now cross the boundary as canonical text (holiday blocking fixed on real PG); new aggregates wiring in admin route
- `server/repositories/staffRepository.ts` — new `getActiveStaffCounts()`
- `server/routes/admin.ts` — `/api/admin/salons` now returns REAL per-salon aggregates
- `server/routes/dev.ts` — dev/test-only `POST /api/dev/reset-rate-limiters` and `POST /api/dev/reset-e2e-bookings` (production-isolated)
- `server/services/auth/otpService.ts` — dev/test-only `resetChallengesForPhones(phones, clientIp)`

**Frontend:**
- `src/hooks/useAdminOps.ts` — maps real server aggregates (no hardcoded zeros)
- `src/components/common/ToastContainer.tsx` — accessible name on the icon-only close button (critical axe violation fixed)

**Tests & config:**
- `vitest.config.ts` — `fileParallelism: false` (DB suites share one database)
- `tests/db/postgres-repositories.test.ts` — 2 new regression tests; 2 broken assertions fixed
- `tests/db/booking-concurrency.test.ts` — grant-contract test strengthened; nondeterministic race assertion fixed
- `tests/integration/http-api.test.ts` — 2 new aggregate tests (non-empty + empty datasets)
- `e2e/helpers/testIsolation.ts` (**new**) — per-test rate-limiter/OTP/booking reset fixture
- all 6 `e2e/*.spec.ts` — shared fixture imports; contrast-inclusive dual-theme axe scans; keyboard/focus test; availability-driven slot picking
- `package.json` + `package-lock.json` — vite/build toolchain reclassified to `devDependencies`

**Docs:** `docs/SECURITY.md`, `docs/IMPLEMENTATION_STATUS.md`, `docs/KNOWN_ISSUES.md`, `docs/SETUP.md`, `docs/API_CONTRACTS.md`, `e2e/README.md`, `.env.example`, `.env.production.example`

## 3. Environment Provisioned for Phase 1

No Docker, no PostgreSQL, no service on 5432 existed on this workstation. An **isolated portable PostgreSQL 16.15** was provisioned (EDB zip download failed mid-transfer at ~90 MB repeatedly; switched to the npm `@embedded-postgres/windows-x64@16.15.0-beta.19` package):
- data dir `D:\pg16-portable-test\data` (throwaway, outside the repo), dedicated superuser `nobatara_test`, port **5433**, UTF-8
- database `nobatara_test` — **never** a production credential or production database
- The reproducible procedure is now documented in `docs/SETUP.md §7.1` (local without Docker) and mirrors the CI service exactly.

## 4. Database Migration Results (real PostgreSQL 16.15, empty → full)

| Check | Result |
|---|---|
| Chain 001→005 from EMPTY database | **PASS** — in order, inside transactions |
| Migration tracking (`schema_migrations`) | **PASS** — applied_at recorded; `db:status` honest |
| Idempotency (re-run `db:migrate`) | **PASS** — "already up to date", never destructive |
| Rollback (`db:rollback` ×2 then re-up) | **PASS** — 005 and 004 down cleanly, re-applied |
| Failed-migration rollback | **PASS** — the first (buggy) 004 attempt left zero partial state |
| FK constraints (23503) | **PASS** — appointments→nonexistent salon rejected |
| Unique constraints (23505) | **PASS** — exact slot, working-hours duplicates |
| Advisory-lock concurrency | **PASS** — exact-slot race (5 parallel → 1 wins), partial-overlap race (R7), reschedule race |
| Working-hours persistence & fail-safe | **PASS** — unconfigured hours reject bookings |
| Canonical date / Jalali behavior | **PASS** — SQL↔TS cross-verified on leap/non-leap/impossible dates |

### Migration 004 was genuinely broken on real PostgreSQL — 3 bugs fixed

1. **`::uuid` sentinel cast** on a `VARCHAR(64)` column → `COALESCE types character varying and uuid cannot be matched`. Migration 004 had **never executed against real PostgreSQL** (the Phase 17 claim is confirmed; 001–003 had).
2. **Month-walk array indexing** — the TS util's 0-based month-length array was ported verbatim into 1-based PL/pgSQL, shifting every conversion one month late (`1403/08/25 → 2024-12-14` instead of `2024-11-15`); the round-trip guard then returned NULL for many dates (fail-safe held — no silent corruption).
3. **Same off-by-one** in the round-trip `g_d_m[gm-1]` lookup (NULL for January).

### Production bugs the DB suite exposed (would have failed in staging)

| Bug | Impact | Fix |
|---|---|---|
| `availability_exceptions.start_date/end_date` crossed the repo as JS `Date` objects while all consumers compare 'YYYY-MM-DD' strings | **Holiday/leave blocking silently never fired on real PostgreSQL** (worked only in dev in-memory mode) | Repositories select DATE columns via `to_char(...,'YYYY-MM-DD')`, matching the declared `DbAvailabilityException` contract |
| `updateStatus` bound `$1` as both status column and CASE comparison → "inconsistent types deduced for parameter $1" | **Every status transition failed on real PostgreSQL** (customer cancel, salon panel transitions) | Distinct placeholders (`$1` value, `$4` comparison) + regression test |
| E2E suite not idempotent against a persistent DB (hardcoded slot, accumulated bookings) | Suite reruns 409/timeout — masked for months by in-memory dev mode | Availability-driven slot picking + dev-only booking cleanup fixture |

## 5. Database Test Suite (previously 23 skipped → now executed)

| Metric | Phase 17 baseline | Phase 18 |
|---|---|---|
| Skipped (no TEST_DATABASE_URL) | **23 skipped** | **0 skipped** |
| Passed | 0 executed | **25 passed** |
| Failed | — | 0 |
| Stability | — | 6+ consecutive clean runs; R7 race determinism fixed |

`npm run test:db` is correctly wired (`TEST_DATABASE_URL` gate, fail-closed setup, no silent fallbacks, prod-URL refusal). CI defines a PostgreSQL 16 service with health checks and correct env — but see §11: CI has **never executed**.

## 6. E2E Results (Playwright, real server + real PostgreSQL)

| Run | Result | Notes |
|---|---|---|
| Phase 17 baseline | 13 passed / 3 failed | suspected rate limiter |
| Phase 18 full suite | **18 passed / 0 failed** (suite grew: +2 a11y scans, +1 keyboard test) | CI parity (persistent DB, migrations + idempotent seed) |
| Consecutive run 2 | **18/18** | same persistent DB, no reset between runs |
| Consecutive run 3 | **18/18** | ~28 s each, stable timings |

Root cause of the historical flakiness (investigated, confirmed): the whole suite drives one deterministic IP (`127.0.0.1`) into the production OTP limiter (10 sends / 10 min / IP), and reused phones hit the 60 s resend cooldown. Fix is **test-only isolation** — no production limit touched:

- `POST /api/dev/reset-rate-limiters` — mounted ONLY when `config.isProduction` is false, re-checks the flag itself (404 in production), clears in-process limiter buckets and deletes OTP challenges for explicitly listed test phones + the caller IP.
- `POST /api/dev/reset-e2e-bookings` — same isolation pattern; deletes appointments only for listed test phones.
- `e2e/helpers/testIsolation.ts` invokes both before every test. Individual security/rate-limit tests still pass (they reset buckets directly and assert 429s in the integration suite — untouched).

## 7. Security Regression Results

| Area | Status |
|---|---|
| Full Vitest security posture (unit + integration: RBAC 401/403, CSRF, cookie flags, OTP limits, tenant boundaries, production posture) | **PASS — 190/190 across 14 files** |
| OTP security (CSPRNG, HMAC at rest, TTL/cooldown/attempt caps, atomic consumption, purpose separation) | **PASS — untouched by the E2E fix** |
| Production proxy trust | **PASS — unchanged** (`TRUST_PROXY_COUNT` default 0, now documented in both env examples) |
| Dev endpoints | **PASS** — both new reset routes verified production-isolated (unmounted + re-checked + 404) |
| Dependency audit (`npm audit --omit=dev`) | **PASS — 0 vulnerabilities** (build toolchain note in §10) |
| Secrets | **PASS** — no secrets/keys/real phone numbers committed; test phones remain synthetic |

## 8. Accessibility Results

| Item | Status |
|---|---|
| axe scans (WCAG 2.0/2.1 A+AA) **including `color-contrast`** | **PASS — storefront (dark + light), salon panel, admin console: 0 serious/critical** |
| Contrast checks | Previously excluded from the gate; now enforced in BOTH themes (dark default via ThemeContext default, light via the same localStorage key) — Phase 5d token tuning holds up |
| Icon-only toast close button (axe `button-name`, critical) | **FIXED** — Persian accessible name `بستن اعلان` |
| Keyboard navigation / visible focus / Escape-close | **PASS** — new dedicated E2E test |
| Responsive widths 360→1440, horizontal overflow | **PASS** (pre-existing coverage retained) |
| Screen-reader (NVDA/VoiceOver) walkthrough | **NOT TESTED — cannot be executed in this environment**; remains a manual release prerequisite |
| Physical-device (real mobile) checks | **NOT TESTED** — same |

## 9. Build, Lint & Regression

| Check | Result |
|---|---|
| `npm ci` (twice, incl. after package reclassification) | **PASS** |
| `npm run typecheck` / `npm run lint` | **PASS — 0 errors** |
| Full Vitest (`npm test`, unit + integration + DB with `TEST_DATABASE_URL`) | **PASS — 190/190, 14 files** |
| `npm run test:db` | **PASS — 25/25** |
| `npx playwright test` ×3 | **PASS — 18/18 each** |
| `npm run build` | **PASS** (~400 ms, clean) |
| `npm run audit` | **PASS — 0 vulnerabilities** (production tree) |

## 10. SMS Provider Reliability (no live credentials — verified without sending)

Reviewed end-to-end (`server/services/sms/*`, `otpService`): config validation, per-attempt `AbortSignal` timeout, bounded retries **for transport failures only** (business rejections never retried → no duplicate sends), structured error families, phone masking (`0912****89`) with **OTP never logged**, production **fail-closed** (`NullSmsProvider`; DevMock throws in production). 10 unit tests with a mocked gateway cover success, every failure family, retry/timeout semantics, and assert **no OTP/full phone in logs**. **Live SMS delivery: BLOCKED — still requires valid Kavenegar credentials**; explicitly unverified against the real telco.

## 11. Remaining External Prerequisites (honest status)

| Prerequisite | Status |
|---|---|
| CI pipeline execution (GitHub Actions) | **NOT TESTED** — branch intentionally unpushed; first push will run the PG-backed `database` and `e2e` jobs for the first time |
| Live SMS delivery (Kavenegar) | **BLOCKED** — credentials |
| Screen-reader + real-device a11y pass | **NOT TESTED** — manual |
| Staging deployment (Docker/compose run) | **NOT TESTED** — Docker unavailable here; deployment guide ready |
| Shared rate limiter for horizontal scale (Redis) | **NOT IMPLEMENTED** — documented single-process scope |
| Payments (Zarinpal/Shaparak) | **NOT IMPLEMENTED** — separate track |

## 12. Unresolved Defects

| ID | Severity | Description | Action |
|---|---|---|---|
| DEF-18-1 | **P3** | `picomatch` ReDoS advisory (GHSA-fc5q-39xc-vjpf) in the **build toolchain only** (vite→tinyglobby→fdir→picomatch). New advisory; 4.0.7 (latest) is already affected — no upstream fix; npm's only suggestion is a breaking Vite 8→6 downgrade. Toolchain reclassified to `devDependencies`, so the production runtime tree audits clean. | Track; re-run audit when picomatch patches |
| DEF-18-2 | **P3** | Production Docker stage copies the full `node_modules` (comment claims "dev deps stripped") because the CMD needs `tsx` (a devDependency) | Optional cleanup: move `tsx` to dependencies or compile the server for the image |
| DEF-18-3 | **P3** | In-memory rate limiter is per-process only | Documented (rateLimit.ts header + deployment checklist); needs shared limiter before horizontal scaling |
| DEF-18-4 | **P2 (process)** | CI has never executed despite a complete workflow | First push is a verification event, not a formality — watch the PG/e2e jobs |

No P1 defects remain open from the Phase 17 list.

## 13. Next-Phase Instructions (exact)

1. **Commit** the Phase 18 working tree on `work/db-reliability` (suggest: `fix(hardening): Phase 18 — real-PG migration/test fixes, E2E isolation, real admin aggregates, contrast-inclusive a11y gates`).
2. **Push the branch** (`git push -u origin work/db-reliability`) — this is the first CI execution; watch all 5 jobs, especially `database` (PostgreSQL 16 service) and `e2e`. Do not merge to main until the full pipeline is green.
3. **Fix whatever CI surfaces** (expected diffs: OS-specific timings, first-run seeds) — the local procedure in `docs/SETUP.md §7.1` reproduces the CI database job exactly.
4. **Staging**: provision managed PostgreSQL 16 → `db:migrate` → `db:seed` → `admin:bootstrap` → deploy per `docs/DEPLOYMENT.md`; verify `/api/health/live|ready`, one real OTP booking, salon-panel transition, admin governance action.
5. **SMS**: supply `KAVENEGAR_API_KEY` + approved template in staging secrets, send one real OTP, verify delivery + masked logs — closes the BLOCKED item.
6. **A11y**: manual NVDA (Windows) + VoiceOver (macOS/iOS) walkthrough of the storefront booking, my-bookings, salon panel, admin console; physical-device checks at 360/390 px.
7. **Re-audit**: confirm `picomatch` advisory patch status; re-run `npm run audit`.

**Bottom line:** every claim above is backed by an executed command on this machine. The application now has real-PostgreSQL-verified migrations and persistence, honest dashboard data, deterministic E2E with untouched production security, and contrast-enforced accessibility gates — the remaining gap to *release ready* is execution evidence (CI + staging + live SMS + manual a11y), not implementation.
