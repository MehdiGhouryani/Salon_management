/**
 * Phase 19 security regression: the dev/test-only reset endpoints
 * (/api/dev/reset-rate-limiters, /api/dev/reset-e2e-bookings) must be
 * DISABLED BY DEFAULT and require the EXPLICIT ENABLE_TEST_ENDPOINTS=true
 * flag on top of non-production mode. Production can never enable them —
 * the isProduction guard is hard-coded into the flag expression.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';

async function loadConfigWithEnv(env: Record<string, string>): Promise<boolean> {
  vi.resetModules();
  const saved = process.env.ENABLE_TEST_ENDPOINTS;
  const savedNodeEnv = process.env.NODE_ENV;
  const savedAppMode = process.env.APP_MODE;
  const savedDbUrl = process.env.DATABASE_URL;
  const savedSecret = process.env.SESSION_SECRET;
  try {
    process.env.ENABLE_TEST_ENDPOINTS = env.ENABLE_TEST_ENDPOINTS ?? '';
    if (env.NODE_ENV !== undefined) process.env.NODE_ENV = env.NODE_ENV;
    if (env.APP_MODE !== undefined) process.env.APP_MODE = env.APP_MODE;
    if (env.NODE_ENV === 'production' || env.APP_MODE === 'production') {
      // Production posture demands a database + session secret before the
      // config parses; this suite only reads the flag, so an unreachable
      // probe URL is enough (nothing connects).
      process.env.DATABASE_URL = 'postgresql://probe:probe@127.0.0.1:1/probe';
      process.env.SESSION_SECRET = 'prod-flag-probe-secret-0123456789abcdef0123456789abcdef';
    }
    const { config } = await import('../../server/config.ts');
    return config.testEndpointsEnabled;
  } finally {
    // Restore: other suites in this worker must not inherit modified env.
    if (saved === undefined) delete process.env.ENABLE_TEST_ENDPOINTS;
    else process.env.ENABLE_TEST_ENDPOINTS = saved;
    if (savedNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = savedNodeEnv;
    if (savedAppMode === undefined) delete process.env.APP_MODE;
    else process.env.APP_MODE = savedAppMode;
    if (savedDbUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = savedDbUrl;
    if (savedSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = savedSecret;
  }
}

describe('ENABLE_TEST_ENDPOINTS flag semantics (Phase 19 security)', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('is DISABLED by default (flag unset, development)', async () => {
    const enabled = await loadConfigWithEnv({ NODE_ENV: 'development' });
    expect(enabled).toBe(false);
  });

  it('is DISABLED when the flag is any value other than "true" after trim (trim matches the other env vars)', async () => {
    for (const value of ['false', '1', 'yes', 'TRUE', 'enabled', 'truefalse', 'true false']) {
      const enabled = await loadConfigWithEnv({ NODE_ENV: 'development', ENABLE_TEST_ENDPOINTS: value });
      expect(enabled, `value "${value}" must not enable the endpoints`).toBe(false);
    }
  });

  it('is enabled ONLY with the exact "true" flag in non-production', async () => {
    const enabled = await loadConfigWithEnv({ NODE_ENV: 'development', ENABLE_TEST_ENDPOINTS: 'true' });
    expect(enabled).toBe(true);

    const enabledTest = await loadConfigWithEnv({ NODE_ENV: 'test', ENABLE_TEST_ENDPOINTS: 'true' });
    expect(enabledTest).toBe(true);
  });

  it('can NEVER be enabled in production — flag is hard-disabled regardless of NODE_ENV or APP_MODE', async () => {
    const viaNodeEnv = await loadConfigWithEnv({
      NODE_ENV: 'production',
      ENABLE_TEST_ENDPOINTS: 'true',
    });
    expect(viaNodeEnv).toBe(false);

    // APP_MODE=production also forces production posture (server/config.ts).
    const viaAppMode = await loadConfigWithEnv({
      NODE_ENV: 'development',
      APP_MODE: 'production',
      ENABLE_TEST_ENDPOINTS: 'true',
    });
    expect(viaAppMode).toBe(false);
  });
});
