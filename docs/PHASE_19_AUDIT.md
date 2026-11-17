# NobatAra — Phase 19 Audit Report
## Pre-Release Hardening, Git Review & CI Verification

**Date:** 2026-11-17
**Branch:** `work/db-reliability` · **Base HEAD:** `5d2ddbb` (unchanged history; one new commit added on top, see §1)
**Baseline:** Phase 18 audit (`docs/PHASE_18_AUDIT.md`)
**Verification environment:** local workstation + the isolated portable PostgreSQL 16.15 cluster from Phase 18 (no Docker on this machine)
**Overall verdict:** release candidate prepared — **ready for the first authorized remote CI run** (push awaits explicit authorization)

---

## 1. Git status & commit information

Reviewed at start of Phase 19:
- `git status --short`: 29 modified files + 2 untracked paths (`docs/PHASE_18_AUDIT.md`, `e2e/helpers/`)
- `git diff --stat` (final): 29 files, 1065 insertions, 104 deletions
- `git diff --name-status`: all `M` (no deletes/renames) — see the Phase 18 audit §2 for the categorized list
- `git diff --check`: only intentional Markdown hard-line-break trailing spaces (repo style); no conflict markers, no whitespace errors in code
- HEAD `5d2ddbb` on `work/db-reliability`; `origin/main` = `8de9001`; branch 56 ahead / 0 behind; no history rewritten, main untouched

**File-count discrepancy resolved:** the "26 files changed" figure in the Phase 18 session was an *intermediate* `git diff --stat` snapshot taken before the last three edits of that phase (`package.json` + `package-lock.json` dependency reclassification, `docs/API_CONTRACTS.md` aggregates documentation). Final count: **29 modified + 2 untracked = 31 paths**, every intended Phase 18 file accounted for.

**Phase 19 additions** (reviewed the same way, then committed): `server/config.ts`, `Dockerfile`, `playwright.config.ts`, `vitest.config.ts`, `tests/unit/test-endpoints-flag.test.ts` (new), `tests/integration/production-posture.test.ts`, `server/repositories/appointmentRepository.ts`, `server/routes/dev.ts`, `docs/DEPLOYMENT.md`, `docs/KNOWN_ISSUES.md`, `.env.example`. Committed tree: **34 modified files + 3 new files, ~1480 insertions / 118 deletions** — no secrets, no local PostgreSQL data, no test artifacts (`.gitignore` already excludes `*.png`, `test-results/`, `playwright-report/`, `dist/`, `.env*`).

**Commit:** created on `work/db-reliability` (local only). **NOT pushed** — per the strict rules, every remote operation awaits explicit authorization.

## 2. Test-only endpoint security findings

Both `POST /api/dev/reset-rate-limiters` and `POST /api/dev/reset-e2e-bookings` were hardened and now enforce **five independent layers**:

1. **Router mount guard** — the dev router is only mounted when `config.isProduction` is false (pre-existing).
2. **Route-level re-check** — each route re-checks the flag and answers the standard JSON 404 (`API_ENDPOINT_NOT_FOUND`) — no information leakage (verified by spawned-server tests).
3. **Explicit opt-in flag (NEW, Phase 19)** — `ENABLE_TEST_ENDPOINTS=true` is required in addition to non-production mode; **default OFF** (dev server without the flag → 404, proven by a spawned dev-server test). The flag expression hard-codes `!isProduction`: even an operator error setting the flag in a production environment cannot enable the routes (spawned production server *with* the flag set → still 404). Whitespace-trimmed exact-`true` semantics match the repo's other env parsing (`tests/unit/test-endpoints-flag.test.ts`).
4. **Server-side phone allowlist (NEW, Phase 19)** — `E2E_TEST_PHONE_ALLOWLIST` (7 synthetic `0936…` test phones) lives in `server/routes/dev.ts`; the client can never extend it. Requests naming any non-allowlisted phone are rejected **fail-closed** (`400 TEST_PHONE_NOT_ALLOWLISTED`) with **zero deletions** — including mixed lists. Bookings/OTP rows for real customers are structurally unreachable; OTP deletion is additionally scoped to the caller's own IP (the test client's address).
5. **No auth bypass** — the routes remain unauthenticated dev tools by design (the E2E suite calls them before login), but the flag + allowlist + production 404s mean the surface only exists inside a deliberately flagged dev/test process. Production rate limiting, OTP cooldowns, and the integration rate-limit tests (which assert real 429s) are untouched.

**Security regression tests added (10):**
- `tests/unit/test-endpoints-flag.test.ts` (4): default OFF; non-`true` values never enable; exact `true` enables only outside production; production hard-disabled via `NODE_ENV` **and** `APP_MODE` paths.
- `tests/integration/production-posture.test.ts` (2, spawned real servers): production + wrongly-set flag → JSON 404 on both routes (valid CSRF headers used, proving the routes are absent rather than CSRF-blocked); development without the flag → 404 (default OFF).
- `tests/integration/http-api.test.ts` (4 + drift guard): allowlist matches the E2E helper list exactly; allowlisted phone → 200 and cooldown provably gone; **non-allowlisted phone → 400 and the OTP challenge provably survives** (resend cooldown still applies); mixed list → fail-closed, nothing deleted; bookings deletion deletes only allowlisted phones' appointments and provably preserves a real-customer-shaped booking.

**Result: PASS.** The production OTP limiter was not weakened — no limit value, window, or key changed.

## 3. Docker runtime findings

**Decision: Approach B (minimum runtime dependencies, tsx retained).** Approach A (compile the server TS to JS) was rejected as the riskier change: every server file imports relative modules with explicit `.ts` specifiers that Node's type-stripping resolves but `tsc` emit does not rewrite — a compile step would require touching the entire server import graph, violating the "no unnecessary refactoring" constraint.

Applied changes:
- Dependency classification corrected to match reality — server code imports only `express`, `cookie-parser`, `dotenv`, `pg` (+ Node builtins); `tsx` moved into `dependencies` (it *is* the production runtime runner: zero-transpile-drift design); `react`, `react-dom`, `lucide-react`, `@fontsource-variable/vazirmatn`, `vite`, plugins, and test tools stay/land in `devDependencies`.
- `Dockerfile` runtime stage now runs `npm ci --omit=dev` instead of copying the full `node_modules`.

**Verification (local, everything provable without Docker):**
- Isolated production-only tree installed from the committed lockfile: **17 MB** (vs the previous full copy), `tsx` present.
- The tree **boots the real production server** (`NODE_ENV=production`, port 3214): `/api/health/live` 200; `/api/health/ready` reports `database: connected` (real PostgreSQL 16.15, 235 ms); `/api/public/salons` serves real DB rows; OTP fails closed with `SMS_DELIVERY_FAILED` (no SMS provider — correct production posture); **all three dev routes (both resets + otp-peek) return 404** even with valid CSRF headers.
- **Docker image build / container startup: NOT TESTED** — Docker is not available in this environment. The Dockerfile change is validated by the equivalent local install; the first CI/staging Docker build is the remaining evidence step.

## 4. Rate limiter scalability findings (documented — behavior unchanged)

Documented in `docs/DEPLOYMENT.md §6.1` + a release-checklist item:
- Current implementation: fixed-window in-process `Map`, server-derived keys.
- Single-instance limits are exact; **multiple instances multiply the effective allowance by the instance count** (each keeps its own unsynchronized window), and round-robin traffic can spread across instances so a client may never exceed any single instance's counter — bypass is real.
- The DB-backed OTP per-phone/IP counter does **not** share this defect when instances share one PostgreSQL (shared by construction).
- Recommended future architecture: Redis (`INCR`/`EXPIRE` or sorted-set sliding window) preferred once horizontal scaling is planned; a PostgreSQL `rate_limit_buckets` UPSERT table is the zero-new-dependency alternative. Call sites keep their shape — only the bucket store swaps.
- **No new infrastructure dependency introduced.** Release checklist now gates: "Scale = ONE application instance" until a shared store lands.

## 5. picomatch advisory analysis (GHSA-fc5q-39xc-vjpf / CVE-2026-112366)

| Question | Finding |
|---|---|
| Affected path | `vite@8.3.8 → tinyglobby@0.2.17 → fdir@6.5.0 → picomatch@4.0.7`; also `vitest@5.1.0 → picomatch@4.0.7` — **all devDependencies** |
| Runtime or build-time? | **Build/dev-time only.** Verified: `npm ls picomatch` in the installed **production-only tree (17 MB)** → empty; picomatch is not installed at all outside dev tooling. At build time it matches the repo's own glob patterns, never attacker input. |
| Patched versions | **None.** OSV range: `introduced: 0 → last_affected: 4.0.7` (4.0.7 is the latest release). Advisory published 2026-10-19, last modified 2026-11-17 — it landed *during* the Phase 18 session, which is why the first audit that day reported 0 and a later one reported 5. |
| Can we upgrade? | **Not yet** — no fixed release exists. npm's only suggested fix is a breaking `vite@6.2.7` downgrade: rejected (would break the toolchain and hide nothing). |
| Accepted risk & revisit conditions | Documented in `docs/KNOWN_ISSUES.md`. **Revisit when:** picomatch > 4.0.7 ships a fix (upgrade via npm `overrides`), or vite/tinyglobby move to a fixed picomatch, or the advisory is re-scored/withdrawn — re-run `npm audit` then. `npm audit --omit=dev` reports **0 vulnerabilities**. |

## 6. PostgreSQL results — **PASS**

- Full migration chain 001→005 from empty DB re-verified on the real PostgreSQL 16.15 portable instance (tracking, idempotency, rollback round trip).
- **`npm run test:db`: 25/25 passed** — all 23 formerly-skipped tests plus the Phase 18 regression tests — executed against real PostgreSQL 16.15, **0 skipped, 0 mocked substitutes**. Included inside the full-suite run below.

## 7. Vitest results — **PASS**

`npm ci` → `npm test` (unit + integration + DB with `TEST_DATABASE_URL`): **202/202 passed across 15 files** (190 from Phase 18 + 10 new Phase 19 security tests + 2 suite additions). 0 skipped at full configuration.

## 8. Playwright results — **PASS (one intermittent flake documented)**

- Phase 19 final verification: **18/18 passed ×3 consecutive full-suite runs** (25.8 s / 26.5 s / 25.5 s) against the real dev server + real PostgreSQL (CI parity).
- Earlier in the session one full-suite run showed a single `journey-salon-ops` failure (17/18) that did not reproduce: the spec passes ×3 in isolation and 8 of 9 full-suite runs today. Cause not captured (failure artifacts were overwritten by the passing next run) — tracked as **DEF-19-1 (P3)** below; Playwright's CI `retries: 1` additionally covers single flakes there.

## 9. Build & lint results — **PASS**

- `npm run typecheck` / `npm run lint`: 0 errors (after all Phase 19 changes).
- `npm run build`: clean (≈370 ms).
- `npm run audit` (`--omit=dev`): **0 vulnerabilities** (one transient npm-registry endpoint error mid-session; clean on retry — registry-side, not a dependency finding).

## 10. Security regression results — **PASS**

- 202/202 Vitest including: RBAC/401/403, CSRF matrices (incl. lookalike-origin cases), cookie flags, production posture, OTP lifecycle + limits, tenant boundaries, Phase 19 flag/allowlist/isolation tests.
- Spawned-server proofs: production 404s with the flag wrongly set; dev default-OFF.
- The Phase 18 fixes (holiday blocking, status transitions, canonical dates, aggregates) remain covered by their DB/integration tests — no regressions.

## 11. Remaining defects

| ID | Severity | Description | Status |
|---|---|---|---|
| DEF-19-1 | **P3** | `journey-salon-ops` failed once in 9 full-suite E2E runs today (never in isolation; cause not captured — artifacts overwritten by the next passing run) | Open; CI's `retries: 1` covers single flakes; capture-on-failure configured as follow-up |
| DEF-18-1 | **P3** | picomatch ReDoS advisory — dev toolchain only, no upstream fix (§5) | Accepted, documented, revisit conditions set |
| DEF-18-3 | **P3** | In-memory rate limiter is per-process | Documented (§4); shared store proposed for a future phase; single-instance gate added to release checklist |
| DEF-18-2 | **RESOLVED in Phase 19** | Runtime image previously shipped full `node_modules` | Fixed via production-only dependency tree (§3); Docker build evidence pending (NOT TESTED) |
| DEF-18-4 | **P2 (process)** | CI has never executed | First push (authorized) is the next verification event |

No P1 defects open.

## 12. Recommended first CI execution procedure

1. Confirm the commit is the branch tip: `git log --oneline -1` on `work/db-reliability` (local only).
2. **With explicit authorization only:** `git push -u origin work/db-reliability` (no force, no main).
3. Watch all five jobs of the `CI` workflow: `quality` (typecheck/lint/unit), `integration`, `database` (PostgreSQL 16 service + `test:db` — the 23 formerly-skipped tests execute for the first time in CI), `build` (vite build + `npm audit`), `e2e` (real server + PostgreSQL service + migrations).
4. Expected first-run risks (nothing to pre-fix): npm-registry flakiness (retry), Playwright browser install duration, and DEF-19-1 (covered by `retries: 1`).
5. If green: the branch is CI-verified and ready for a staging deployment decision. If red: fix on the same branch, re-run — never bypass.

## 13. Exact external prerequisites for staging (unchanged from Phase 18, reconfirmed)

| Prerequisite | Status |
|---|---|
| CI pipeline execution | **NOT TESTED** — awaiting authorized push (§12) |
| Docker image build + container run | **NOT TESTED** — no Docker locally; Dockerfile change validated by the equivalent local production-tree boot |
| Live SMS delivery (Kavenegar) | **BLOCKED** — needs `KAVENEGAR_API_KEY` + approved template + credit |
| Managed PostgreSQL 16 provisioning | **BLOCKED** — operator account |
| Screen-reader (NVDA/VoiceOver) + physical-device a11y pass | **NOT TESTED** — manual prerequisite |
| Staging deployment + smoke test (OTP login → booking → salon panel → admin action) | **NOT TESTED** — blocked on hosting + DB provisioning |

---

**Bottom line:** Phase 18's work survived independent review; its two endpoints with destructive potential are now five-layer isolated and regression-tested; the runtime image carries only what production needs (verified live); the advisory and scalability questions are documented with revisit conditions. The release candidate is clean, committed locally, and the only thing between it and remote CI evidence is an authorized `git push`.
