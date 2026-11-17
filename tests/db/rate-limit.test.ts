/**
 * Shared PostgreSQL rate-limit tests (CATEGORY: database/real-PostgreSQL).
 * Confirms atomic counters are shared across middleware instances and survive
 * clearing process-local state (the equivalent of restarting an app process).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DB_TESTS_ENABLED, initDatabaseUnderTest, type DbUnderTest } from './_setup.ts';

let db: DbUnderTest;
let rateLimitModule: typeof import('../../server/middleware/rateLimit.ts');

function invoke(
  middleware: ReturnType<typeof import('../../server/middleware/rateLimit.ts')['rateLimit']>
): Promise<{ statusCode: number; nextCalled: boolean; body?: any }> {
  return new Promise((resolve, reject) => {
    const result = { statusCode: 200, nextCalled: false } as {
      statusCode: number; nextCalled: boolean; body?: any;
    };
    const req = { ip: '198.51.100.45', body: {} } as any;
    const res = {
      setHeader: () => res,
      status(code: number) { result.statusCode = code; return res; },
      json(body: unknown) { result.body = body; resolve(result); return res; },
    } as any;
    middleware(req, res, (err?: any) => {
      if (err) { reject(err); return; }
      result.nextCalled = true;
      resolve(result);
    });
  });
}

describe.skipIf(!DB_TESTS_ENABLED)('shared PostgreSQL rate limiting', () => {
  beforeAll(async () => {
    db = await initDatabaseUnderTest();
    rateLimitModule = await import('../../server/middleware/rateLimit.ts');
  }, 120_000);

  afterAll(async () => {
    if (db?.raw) await db.raw.end();
  });

  it('atomically enforces one fixed-window limit across middleware instances', async () => {
    const policyCode = `PG_RATE_TEST_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const options = {
      windowMs: 10 * 60_000,
      max: 3,
      keyFor: () => '198.51.100.45:test-client',
      code: policyCode,
    };

    const firstInstance = rateLimitModule.rateLimit(options);
    const concurrentResults = await Promise.all(
      Array.from({ length: 10 }, () => invoke(firstInstance))
    );

    expect(concurrentResults.filter((r) => r.nextCalled)).toHaveLength(3);
    expect(concurrentResults.filter((r) => r.statusCode === 429)).toHaveLength(7);

    // Simulate a process restart: clearing local state must not reset a
    // PostgreSQL-backed window. A newly-created middleware uses the same row.
    rateLimitModule.clearRateLimitBuckets();
    const secondInstance = rateLimitModule.rateLimit(options);
    const afterRestart = await invoke(secondInstance);

    expect(afterRestart.statusCode).toBe(429);
    expect(afterRestart.body).toMatchObject({ error: policyCode });

    const persisted = await db.raw.query(
      'SELECT bucket_hash, request_count FROM api_rate_limit_buckets WHERE request_count >= 3'
    );
    expect(persisted.rows.length).toBeGreaterThan(0);
    expect(persisted.rows.every((row: any) => /^[a-f0-9]{64}$/.test(row.bucket_hash.trim()))).toBe(true);
  });
});
