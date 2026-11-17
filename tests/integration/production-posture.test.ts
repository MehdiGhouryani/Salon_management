/**
 * NobatAra Production Posture Integration Tests (CATEGORY: integration/real-HTTP)
 *
 * Spawns REAL `node server.ts` child processes with production environment
 * variables (never touching a real database: the probe DATABASE_URL points at
 * an unreachable local port) and verifies:
 *  - production fails fast without a configured database (clear, non-silent)
 *  - security headers in production (X-Frame-Options, nosniff, no-cache API)
 *  - CSRF rejects state-changing requests without Origin in production
 *  - CSRF rejects cross-origin browser-style requests in production
 *  - readiness honestly reports an unreachable database (no fake success)
 */
import { describe, it, expect, afterAll } from 'vitest';
import { spawn, spawnSync, type ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';

const ROOT = path.resolve(__dirname, '../..');
const SERVER_ENTRY = path.join(ROOT, 'server.ts');
const PROD_PORT = 3211;
const BASE = `http://127.0.0.1:${PROD_PORT}`;
const TEST_SESSION_SECRET = 'prod-posture-probe-secret-0123456789abcdef0123456789abcdef';

let serverProcess: ChildProcess | null = null;

const prodEnv = (extra: Record<string, string> = {}): NodeJS.ProcessEnv => ({
  ...process.env,
  NODE_ENV: 'production',
  PORT: String(PROD_PORT),
  HOST: '127.0.0.1',
  SESSION_SECRET: TEST_SESSION_SECRET,
  // Exact-origin allowlist for the CSRF matrix (Phase 07)
  CORS_ORIGIN: 'https://app.nobatara.ir',
  ...extra,
});

async function waitForLive(url: string, timeoutMs = 20000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

afterAll(() => {
  serverProcess?.kill();
});

describe('Production fail-fast (spawned node server.ts)', () => {
  it('Refuses to start in production without a configured database, with a clear error', () => {
    const result = spawnSync(process.execPath, [SERVER_ENTRY], {
      cwd: ROOT,
      env: prodEnv(), // no DATABASE_URL / DB_HOST
      encoding: 'utf-8',
      timeout: 30000,
    });

    expect(result.status).not.toBe(0);
    const output = `${result.stdout || ''}${result.stderr || ''}`;
    expect(output).toContain('PostgreSQL database is mandatory');
  });
});

describe('Production HTTP posture (spawned node server.ts, unreachable probe DB)', () => {
  it('Serves with production security headers, honest readiness, and production CSRF enforcement', async () => {
    // dist/ must exist: this suite exercises the real production server entry.
    const distIndex = path.join(ROOT, 'dist', 'index.html');
    if (!fs.existsSync(distIndex)) {
      throw new Error('dist/index.html missing — run `npm run build` before the production posture suite (CI does this).');
    }

    serverProcess = spawn(process.execPath, [SERVER_ENTRY], {
      cwd: ROOT,
      env: prodEnv({
        // Unreachable probe DB: config valid, connection impossible — proves
        // readiness reports failure honestly instead of faking success.
        DATABASE_URL: 'postgresql://127.0.0.1:54321/nobatara_prod_posture_probe',
      }),
      stdio: 'ignore',
    });

    const live = await waitForLive(`${BASE}/api/health/live`);
    if (!live) {
      throw new Error('Production probe server did not become live within 20s');
    }

    // 1. Liveness is DB-independent and returns 200
    const liveRes = await fetch(`${BASE}/api/health/live`);
    expect(liveRes.status).toBe(200);

    // 2. Readiness honestly reports unreachable database as 503 (fail closed)
    const readyRes = await fetch(`${BASE}/api/health/ready`);
    expect(readyRes.status).toBe(503);
    const ready = await readyRes.json();
    expect(ready.database.configured).toBe(true);
    expect(ready.database.status).toBe('unreachable');

    // 3. Production security headers on static responses
    const indexRes = await fetch(`${BASE}/`);
    expect(indexRes.status).toBe(200);
    expect(indexRes.headers.get('x-frame-options')).toBe('SAMEORIGIN');
    expect(indexRes.headers.get('x-content-type-options')).toBe('nosniff');

    // 4. API responses are no-store
    const apiRes = await fetch(`${BASE}/api/health/live`);
    expect(apiRes.headers.get('cache-control')).toContain('no-store');

    // 5. CSRF: production state-changing request without Origin is rejected
    const csrfMissing = await fetch(`${BASE}/api/admin/stats`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'suspended' }),
    });
    expect(csrfMissing.status).toBe(403);
    const csrfMissingBody = await csrfMissing.json();
    expect(csrfMissingBody.error).toBe('CSRF_ORIGIN_MISSING');

    // 6. CSRF: cross-origin browser-style request (no custom anti-CSRF header) is rejected
    const csrfForbidden = await fetch(`${BASE}/api/auth/otp/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://evil.example',
      },
      body: JSON.stringify({ phone: '09121234567', purpose: 'login' }),
    });
    expect(csrfForbidden.status).toBe(403);
    const csrfForbiddenBody = await csrfForbidden.json();
    expect(csrfForbiddenBody.error).toBe('CSRF_ORIGIN_FORBIDDEN');

    // 7. JSON 404 trap still applies in production
    const notFound = await fetch(`${BASE}/api/does-not-exist`);
    expect(notFound.status).toBe(404);
    expect(notFound.headers.get('content-type')).toContain('application/json');

    // 8. CSRF exact-origin matrix (Phase 07): lookalike, subdomain-swap,
    //    null, and malformed origins must all be rejected; only the exact
    //    configured origin passes.
    const csrfCases: Array<[string, string | undefined, string]> = [
      ['https://app.nobatara.ir.evil.io', 'CSRF_ORIGIN_FORBIDDEN', 'lookalike suffix'],
      ['https://evil.io/app.nobatara.ir', 'CSRF_ORIGIN_FORBIDDEN', 'path mimicry'],
      ['https://nobatara.ir', 'CSRF_ORIGIN_FORBIDDEN', 'subdomain swap'],
      ['null', 'CSRF_ORIGIN_INVALID', 'null origin'],
      ['not-a-url', 'CSRF_ORIGIN_INVALID', 'malformed origin'],
    ];
    for (const [originHeader, expectedCode, label] of csrfCases) {
      const evil = await fetch(`${BASE}/api/auth/otp/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: originHeader,
        },
        body: JSON.stringify({ phone: '09121234567', purpose: 'login' }),
      });
      expect(evil.status, label).toBe(403);
      expect((await evil.json()).error, label).toBe(expectedCode);
    }

    // Exact configured origin passes CSRF (reaches auth: 401 on admin stats)
    const allowed = await fetch(`${BASE}/api/admin/stats`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://app.nobatara.ir',
      },
      body: JSON.stringify({ status: 'suspended' }),
    });
    expect(allowed.status).toBe(401);
    expect((await allowed.json()).error).toBe('AUTHENTICATION_REQUIRED');

    // 9. HSTS is present in production
    expect(indexRes.headers.get('strict-transport-security')).toContain('max-age=31536000');
  }, 60000);
});

describe('Phase 19: dev/test-only reset endpoints are unreachable where they must be', () => {
  const RESET_ROUTES = ['/api/dev/reset-rate-limiters', '/api/dev/reset-e2e-bookings'];
  const resetBody = JSON.stringify({
    phones: ['09361000005', '09361000020', '09364567890', '09364567891', '09364567892', '09362000001', '09362000077'],
  });

  it('Production returns the standard JSON 404 EVEN IF an operator wrongly sets ENABLE_TEST_ENDPOINTS=true', async () => {
    // Operator-error simulation: the flag is set, but production posture
    // hard-disables the endpoints regardless (config.testEndpointsEnabled is
    // force-false in production; the dev router is also never mounted).
    serverProcess = spawn(process.execPath, [SERVER_ENTRY], {
      cwd: ROOT,
      env: prodEnv({
        DATABASE_URL: 'postgresql://127.0.0.1:54321/nobatara_prod_posture_probe',
        ENABLE_TEST_ENDPOINTS: 'true',
      }),
      stdio: 'ignore',
    });

    const live = await waitForLive(`${BASE}/api/health/live`);
    expect(live).toBe(true);

    for (const route of RESET_ROUTES) {
      // Valid Origin + anti-CSRF header: the request must PASS CSRF and reach
      // the routing layer, where the API 404 trap answers — proving the routes
      // themselves are absent in production, not merely blocked by CSRF.
      const res = await fetch(`${BASE}${route}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://app.nobatara.ir',
          'X-NobatAra-Client': 'web',
        },
        body: resetBody,
      });
      expect(res.status, route).toBe(404);
      const body = await res.json();
      // Standard JSON 404 trap: no information leakage about the endpoint.
      // (The API trap answers { success:false, error:{ code, message, documentation } }.)
      expect(body.error?.code, route).toBe('API_ENDPOINT_NOT_FOUND');
    }
  }, 60000);

  it('Development WITHOUT the explicit flag returns 404 (disabled by default, not just in production)', async () => {
    let devProcess: ChildProcess | null = spawn(process.execPath, [SERVER_ENTRY], {
      cwd: ROOT,
      env: {
        ...process.env,
        NODE_ENV: 'development',
        PORT: '3213',
        HOST: '127.0.0.1',
        // NOTE: ENABLE_TEST_ENDPOINTS deliberately ABSENT — default OFF.
        ENABLE_TEST_ENDPOINTS: '',
      },
      stdio: 'ignore',
    });
    const DEV_BASE = 'http://127.0.0.1:3213';
    try {
      const live = await waitForLive(`${DEV_BASE}/api/health/live`);
      expect(live).toBe(true);

      for (const route of RESET_ROUTES) {
        const res = await fetch(`${DEV_BASE}${route}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: resetBody,
        });
        expect(res.status, `dev without flag: ${route}`).toBe(404);
        expect((await res.json()).error, route).toBe('API_ENDPOINT_NOT_FOUND');
      }
    } finally {
      devProcess?.kill();
      devProcess = null;
    }
  }, 60000);
});
