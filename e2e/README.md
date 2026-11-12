# NobatAra Browser E2E

Playwright journeys that drive the **real dev server** over the **real HTTP API** — no API stubbing.
Run: `npm run test:e2e` (starts the dev server on port 3100 automatically via `webServer`).

## Implemented journeys

| Spec | Journey | Notes |
|---|---|---|
| `journey-storefront.spec.ts` | Public salon browsing | catalog, specialists, booking CTAs |
| `journey-booking.spec.ts` | Full booking wizard with **real OTP** | real OTP generation + verification + session; OTP is read from the isolated `DevMockSmsProvider` via the dev-only `/api/dev/otp-peek` route (404 in production) |
| `journey-my-bookings.spec.ts` | Customer login (real OTP) + booking history | reads from real `/api/public/bookings/my` |

## Deliberately NOT implemented (blocked, not skipped silently)

- **Salon dashboard workflows** — the Salon Manager console is still mock-driven
  (zero `/api/salon/*` call sites in the frontend, risk R10). An E2E run against
  mocked UI would prove nothing about integration. **Blocked until the console is
  wired to the backend.**
- **Super Admin approval workflows** — same reason (only 2 of ~10 admin views are
  server-wired, risk R10). **Blocked until the admin console is wired.**

## Requirements

`npx playwright install chromium` once per machine (CI installs it in the workflow).
