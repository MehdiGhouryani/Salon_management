import { defineConfig } from '@playwright/test';

/**
 * NobatAra browser E2E (CATEGORY: e2e/real-browser-real-server)
 *
 * The specs drive the REAL dev server (`npm run dev`) over the real HTTP API —
 * no API stubbing. The only development affordance is the isolated
 * DevMockSmsProvider, whose OTP is retrieved through the dev-only
 * /api/dev/otp-peek route (404 in production) so the full OTP flow
 * (real generation + verification + session) is exercised end to end.
 *
 * NOTE: Salon dashboard / Super Admin approval journeys are intentionally NOT
 * implemented here: those console surfaces are still mock-driven (risk R10)
 * and an E2E run against mocks would prove nothing. See e2e/README.md.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  fullyParallel: false,
  workers: 1, // sequential: journeys share one server's in-memory state by design
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3100',
    trace: 'retain-on-failure',
    locale: 'fa-IR',
  },
  webServer: {
    command: 'npm run dev',
    port: 3100,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    env: {
      PORT: '3100',
      NODE_ENV: 'development',
      // Production CLIENT posture (no demo mode): makes the real OTP login flow
      // reachable from the storefront drawer, exactly as in production builds.
      VITE_APP_MODE: 'production',
      // Phase 19: the dev/test-only reset endpoints are OFF by default even in
      // non-production; the E2E suite explicitly opts in here. Production and
      // any server process without this flag return 404 on both routes.
      ENABLE_TEST_ENDPOINTS: 'true',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
