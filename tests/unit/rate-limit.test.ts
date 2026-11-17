import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { clearRateLimitBuckets, clearRateLimitBucketsForTest, rateLimit } from '../../server/middleware/rateLimit.ts';

interface InvocationResult {
  statusCode: number;
  body?: any;
  headers: Record<string, string>;
  nextCalled: boolean;
}

function invoke(middleware: ReturnType<typeof rateLimit>, ip = '192.0.2.10'): Promise<InvocationResult> {
  return new Promise((resolve, reject) => {
    const result: InvocationResult = {
      statusCode: 200,
      headers: {},
      nextCalled: false,
    };
    const req = { ip, body: {} } as Request;
    const res = {
      setHeader(name: string, value: string) {
        result.headers[name] = value;
        return this;
      },
      status(code: number) {
        result.statusCode = code;
        return this;
      },
      json(body: unknown) {
        result.body = body;
        resolve(result);
        return this;
      },
    } as unknown as Response;
    const next: NextFunction = (err?: any) => {
      if (err) {
        reject(err);
        return;
      }
      result.nextCalled = true;
      resolve(result);
    };

    middleware(req, res, next);
  });
}

describe('rateLimit middleware', () => {
  beforeEach(() => {
    clearRateLimitBuckets();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-18T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    clearRateLimitBuckets();
  });

  it('allows up to max requests and returns 429 with Retry-After after that', async () => {
    const middleware = rateLimit({
      windowMs: 60_000,
      max: 2,
      keyFor: (req) => String(req.ip),
      code: 'UNIT_RATE_LIMIT',
    });

    expect((await invoke(middleware)).statusCode).toBe(200);
    expect((await invoke(middleware)).statusCode).toBe(200);

    const limited = await invoke(middleware);
    expect(limited.statusCode).toBe(429);
    expect(limited.headers['Retry-After']).toBe('60');
    expect(limited.body).toMatchObject({
      success: false,
      error: 'UNIT_RATE_LIMIT',
      retryAfterSeconds: 60,
    });
  });

  it('isolates counters by policy code and caller identity', async () => {
    const firstPolicy = rateLimit({
      windowMs: 60_000,
      max: 1,
      keyFor: (req) => String(req.ip),
      code: 'POLICY_A',
    });
    const secondPolicy = rateLimit({
      windowMs: 60_000,
      max: 1,
      keyFor: (req) => String(req.ip),
      code: 'POLICY_B',
    });

    expect((await invoke(firstPolicy)).statusCode).toBe(200);
    expect((await invoke(firstPolicy)).statusCode).toBe(429);
    expect((await invoke(secondPolicy)).statusCode).toBe(200);
    expect((await invoke(firstPolicy, '192.0.2.11')).statusCode).toBe(200);
  });

  it('starts a fresh window after the previous window expires', async () => {
    const middleware = rateLimit({
      windowMs: 1_000,
      max: 1,
      keyFor: (req) => String(req.ip),
      code: 'WINDOW_RESET',
    });

    expect((await invoke(middleware)).statusCode).toBe(200);
    expect((await invoke(middleware)).statusCode).toBe(429);

    vi.advanceTimersByTime(1_001);
    expect((await invoke(middleware)).statusCode).toBe(200);
  });

  it('rejects invalid rate-limit configuration', () => {
    expect(() =>
      rateLimit({ windowMs: 0, max: 1, keyFor: () => 'x' })
    ).toThrow(/windowMs/);
    expect(() =>
      rateLimit({ windowMs: 1_000, max: 0, keyFor: () => 'x' })
    ).toThrow(/max/);
  });
});


describe('test-scoped persistent rate-limit reset', () => {
  it('clears only the requested policy identity', async () => {
    const first = rateLimit({
      windowMs: 60_000,
      max: 1,
      keyFor: (req) => String(req.ip),
      code: 'TEST_SCOPED_RESET',
    });
    const unrelated = rateLimit({
      windowMs: 60_000,
      max: 1,
      keyFor: (req) => String(req.ip),
      code: 'TEST_SCOPED_RESET_OTHER',
    });

    expect((await invoke(first)).statusCode).toBe(200);
    expect((await invoke(first)).statusCode).toBe(429);
    expect((await invoke(unrelated)).statusCode).toBe(200);

    await clearRateLimitBucketsForTest('TEST_SCOPED_RESET', ['192.0.2.10']);

    expect((await invoke(first)).statusCode).toBe(200);
    expect((await invoke(unrelated)).statusCode).toBe(429);
  });
});
