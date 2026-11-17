/**
 * Shared Playwright fixture (Phases 18/19): resets the server's in-process
 * rate limiter buckets and the OTP cooldown state of the allowlisted test
 * phones BEFORE each test, and removes bookings those test phones created.
 *
 * Why this exists: the whole E2E suite drives every request through ONE
 * deterministic test IP (127.0.0.1). The production OTP rate limits (max 10
 * sends / 10 min / IP) exist to throttle real-world distributed traffic, not a
 * single sequential test client — without the reset, tests after the 10th OTP
 * send in the suite are rejected with 429 (the Phase 17 "13 passed / 3
 * failed" flakiness). Against a persistent database (CI parity), bookings from
 * earlier runs must also be removed or the wizard journeys time out on full
 * slot grids.
 *
 * Production safety (Phase 19 hardening):
 *  - the reset routes live in the dev router: NOT MOUNTED in production, and
 *    they re-check the flag themselves (standard 404);
 *  - they additionally require the server's EXPLICIT ENABLE_TEST_ENDPOINTS=true
 *    flag (default OFF — a dev/staging process without it returns 404 too);
 *  - the server holds the phone allowlist; any non-allowlisted phone rejects
 *    the whole request without deleting anything, so real customer OTP
 *    records and bookings are structurally unreachable;
 *  - E2E_OTP_PHONES below MUST stay identical to the server's
 *    E2E_TEST_PHONE_ALLOWLIST (server/routes/dev.ts) — the integration suite
 *    asserts the two lists match.
 */
import { test as base, expect } from '@playwright/test';

/** Every phone number any E2E journey requests an OTP for (national format). */
const E2E_OTP_PHONES = [
  '09361000005', // salon-ops staff login + visual-a11y salon manager
  '09361000020', // super-admin console + visual-a11y super admin
  '09364567890', // journey-booking customer
  '09364567891', // journey-booking completion
  '09364567892', // journey-my-bookings
  '09362000001', // super-admin forbidden-role customer
  '09362000077', // salon-ops booking form
];

export const test = base.extend({
  // eslint-disable-next-line no-empty-pattern
  page: async ({ page }, use) => {
    await page.request.post('/api/dev/reset-rate-limiters', {
      data: { phones: E2E_OTP_PHONES },
      failOnStatusCode: false,
    });
    // The suite books REAL slots through the shared engine; against a
    // persistent database (CI parity) previous runs must not shrink today's
    // availability, or the wizard journeys time out on full slot grids.
    await page.request.post('/api/dev/reset-e2e-bookings', {
      data: { phones: E2E_OTP_PHONES },
      failOnStatusCode: false,
    });
    await use(page);
  },
});

export { expect };
