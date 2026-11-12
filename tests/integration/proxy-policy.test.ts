/**
 * NobatAra Proxy & Client-IP Policy Tests (CATEGORY: integration/real-HTTP)
 *
 * Proves the trust-proxy policy behaviorally, using real spawned production
 * servers and the OTP-request rate limiter as the observable surface:
 *
 *  - DEFAULT (TRUST_PROXY_COUNT unset): client-supplied X-Forwarded-For values
 *    are IGNORED — every request from the same socket shares one rate-limit
 *    bucket and the cap trips regardless of header spoofing.
 *  - TRUST_PROXY_COUNT=1: Express honors exactly one trusted proxy hop, so
 *    distinct X-Forwarded-For tails map to distinct buckets and no cap trips.
 *
 * The actual production proxy topology cannot be verified from this machine —
 * that is why trust is OFF by default and must be configured explicitly per
 * deployment (deployment checklist), never assumed.
 */
import { describe, it, expect, afterAll } from 'vitest';
import { spawn, type ChildProcess } from 'child_process';
import path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const SERVER_ENTRY = path.join(ROOT, 'server.ts');
const TEST_SESSION_SECRET = 'proxy-policy-probe-secret-0123456789abcdef0123456789abcdef';

let serverA: ChildProcess | null = null;
let serverB: ChildProcess | null = null;

const baseEnv = (port: number, extra: Record<string, string> = {}): NodeJS.ProcessEnv => ({
  ...process.env,
  NODE_ENV: 'production',
  PORT: String(port),
  HOST: '127.0.0.1',
  SESSION_SECRET: TEST_SESSION_SECRET,
  // Configured-but-unreachable probe DB: enough to pass startup fail-fast.
  DATABASE_URL: 'postgresql://127.0.0.1:54321/nobatara_proxy_probe',
  ...extra,
});

async function waitForLive(url: string, timeoutMs = 20000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Server did not become live: ${url}`);
}

async function hitOtpRequest(port: number, xff?: string): Promise<Response> {
  return fetch(`http://127.0.0.1:${port}/api/auth/otp/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Nobatara-Client': 'test',
      ...(xff ? { 'X-Forwarded-For': xff } : {}),
    },
    body: JSON.stringify({ phone: '09121234567', purpose: 'login' }),
  });
}

afterAll(() => {
  serverA?.kill();
  serverB?.kill();
});

describe('Client-IP trust policy (spawned production servers)', () => {
  it('default: client-supplied X-Forwarded-For cannot dodge IP rate limiting', async () => {
    serverA = spawn(process.execPath, [SERVER_ENTRY], {
      cwd: ROOT,
      env: baseEnv(3212), // no TRUST_PROXY_COUNT
      stdio: 'ignore',
    });
    await waitForLive('http://127.0.0.1:3212/api/health/live');

    // The OTP request limiter allows 10 per 10 minutes per IP. Spoofing a
    // fresh XFF on every request must NOT create fresh buckets.
    let statuses: number[] = [];
    for (let i = 0; i < 12; i++) {
      const res = await hitOtpRequest(3212, `10.0.${Math.floor(i / 255)}.${i + 1}`);
      statuses.push(res.status);
    }
    expect(statuses.filter((s) => s === 429).length).toBeGreaterThan(0);
  }, 60000);

  it('TRUST_PROXY_COUNT=1: distinct trusted-proxy-reported clients get distinct buckets', async () => {
    serverB = spawn(process.execPath, [SERVER_ENTRY], {
      cwd: ROOT,
      env: baseEnv(3213, { TRUST_PROXY_COUNT: '1' }),
      stdio: 'ignore',
    });
    await waitForLive('http://127.0.0.1:3213/api/health/live');

    // With exactly one trusted hop, the XFF tail becomes req.ip — distinct
    // clients stay distinct, so 12 requests across 12 identities must NOT trip
    // the 10-per-window cap.
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) {
      const res = await hitOtpRequest(3213, `10.1.${Math.floor(i / 255)}.${i + 1}`);
      statuses.push(res.status);
    }
    expect(statuses.filter((s) => s === 429).length).toBe(0);
  }, 60000);
});
