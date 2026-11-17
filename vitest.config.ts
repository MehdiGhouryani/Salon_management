import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * NobatAra test architecture:
 *  - tests/unit         : pure domain logic and service tests (in-memory adapters)
 *  - tests/integration  : real Express app over HTTP, middleware, session/RBAC contracts
 *  - tests/db           : PostgreSQL-backed repository, transaction and concurrency tests.
 *                         Fail-closed: they never fall back to in-memory stores.
 *  - e2e/               : Playwright browser journeys (separate runner: npm run test:e2e)
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    include: [
      'tests/unit/**/*.test.ts',
      'tests/integration/**/*.test.ts',
      'tests/db/**/*.test.ts',
    ],
    env: {
      // Test posture: not production (dev SMS mock available), never touches prod env.
      NODE_ENV: 'test',
      // Phase 19: the integration suite exercises the dev/test-only reset
      // endpoints, which require an explicit opt-in. Production isolation is
      // tested separately by spawning real servers with the flag SET and
      // asserting 404 (config.testEndpointsEnabled is hard-false in production).
      ENABLE_TEST_ENDPOINTS: 'true',
    },
    testTimeout: 30_000,
    hookTimeout: 90_000,
    // Each file gets a fresh module registry: config.ts singletons cannot leak across suites.
    isolate: true,
    reporters: 'default',
    // Phase 18: DB-backed suites share ONE database and fixture IDs (t3-*).
    // Parallel test FILES interleave cleanupFixtures() with another file's
    // tests — wiping fixtures mid-run (skipped suites, flaky races). The DB
    // suites are fast; sequential files keep their fixtures consistent.
    fileParallelism: false,
  },
});
