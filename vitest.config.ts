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
    },
    testTimeout: 30_000,
    hookTimeout: 90_000,
    // Each file gets a fresh module registry: config.ts singletons cannot leak across suites.
    isolate: true,
    reporters: 'default',
  },
});
