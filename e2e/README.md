# NobatAra Browser E2E

Playwright journeys that drive the **real dev server** over the **real HTTP API** — no API stubbing.
Run: `npm run test:e2e` (starts the dev server on port 3100 automatically via `webServer`).

## Implemented journeys

| Spec | Journey | Notes |
|---|---|---|
| `journey-storefront.spec.ts` | Public salon browsing | catalog, specialists, booking CTAs |
| `journey-booking.spec.ts` | Full booking wizard with **real OTP** + **guest booking grant** (Phase 08) | real OTP generation + verification + grant issuance; OTP read via the dev-only `/api/dev/otp-peek` route (404 in production) |
| `journey-my-bookings.spec.ts` | Customer login (real OTP) + booking history + server-confirmed cancellation | reads from real `/api/public/bookings/my`, cancels via the real API |
| `journey-salon-ops.spec.ts` | Salon manager panel (Phase 12/13): OTP login → today's appointments → status transitions | real `/api/salon/*` calls |
| `journey-super-admin.spec.ts` | Super-admin governance (Phase 13): OTP login → approve/reject/suspend with mandatory reason → audit-log visibility → 403 for non-admin | real `/api/admin/*` calls |
| `visual-responsive-a11y.spec.ts` | Responsive widths (360→1440), axe WCAG scans **including color-contrast in both themes** (Phase 18), keyboard/focus checks | screenshots land in `test-results/qa/` |

## Test isolation (Phase 18)

Every test resets the server's in-process rate-limit buckets and the OTP
cooldown state of the suite's test phones through
`POST /api/dev/reset-rate-limiters` (`e2e/helpers/testIsolation.ts`), because
the whole suite shares ONE deterministic client IP. The route exists ONLY in
the dev/test router (unmounted in production, re-checks the flag, 404 in
production); no production limit is raised or weakened.

## Deliberately NOT implemented (blocked, not skipped silently)

- ~~Booking completion~~ — **un-blocked in Phase 08**: the guest booking grant
  contract made the full wizard journey (OTP → grant → booking → receipt) complete
  for real; journey-booking.spec.ts now executes it.
- ~~Salon dashboard workflows~~ — **un-blocked in Phase 12/13**: the salon console
  is server-wired and `journey-salon-ops.spec.ts` drives the real API.
- ~~Super Admin approval workflows~~ — **un-blocked in Phase 13**: the governance
  console is server-wired and `journey-super-admin.spec.ts` drives the real API.
- **Screen-reader (NVDA/JAWS/VoiceOver) walkthroughs and physical-device checks**
  — cannot be executed in the current CI/agent environment; remain a manual
  prerequisite for release sign-off (axe scans are a subset of WCAG, not proof
  of full conformance).

## Requirements

`npx playwright install chromium` once per machine (CI installs it in the workflow).

## Database mode

CI (and any parity run) sets `DATABASE_URL` for the server process: apply
`npm run db:migrate` and `npm run db:seed` first (the seed is idempotent).
Without a database the same journeys run against the in-memory dev stores.
