import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { config } from '../config.ts';
import { isDatabaseConfigured, query } from '../db/pool.ts';

interface MemoryBucket {
  count: number;
  expiresAt: number;
}

interface RateLimitDecision {
  count: number;
  retryAfterSeconds: number;
}

const memoryBuckets = new Map<string, MemoryBucket>();
let lastMemorySweep = 0;
let lastDatabaseSweep = 0;
const MEMORY_BUCKET_LIMIT = 50_000;
const SWEEP_INTERVAL_MS = 60_000;

/**
 * The database key is an HMAC, not a raw IP address or phone number.
 * All app instances share the same digest because production requires the
 * same SESSION_SECRET on every instance.
 */
function createBucketHash(code: string, identity: string): string {
  return crypto
    .createHmac('sha256', config.auth.sessionSecret)
    .update(`${code}:${identity}`)
    .digest('hex');
}

function sweepMemoryBuckets(now: number): void {
  if (now - lastMemorySweep < SWEEP_INTERVAL_MS) return;
  lastMemorySweep = now;

  for (const [key, bucket] of memoryBuckets) {
    if (bucket.expiresAt <= now) memoryBuckets.delete(key);
  }
}

function consumeMemoryBucket(
  key: string,
  now: number,
  windowMs: number
): RateLimitDecision {
  sweepMemoryBuckets(now);

  let bucket = memoryBuckets.get(key);
  if (!bucket || bucket.expiresAt <= now) {
    if (memoryBuckets.size >= MEMORY_BUCKET_LIMIT) {
      const error = new Error('The in-memory rate-limit store is at capacity.');
      Object.assign(error, {
        statusCode: 503,
        code: 'RATE_LIMIT_STORAGE_FULL',
      });
      throw error;
    }

    bucket = { count: 0, expiresAt: now + windowMs };
    memoryBuckets.set(key, bucket);
  }

  bucket.count += 1;
  return {
    count: bucket.count,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.expiresAt - now) / 1000)),
  };
}

/**
 * Atomically increments a shared PostgreSQL fixed-window counter.
 * The row lock acquired by ON CONFLICT DO UPDATE serializes concurrent
 * requests across separate Node processes and application instances.
 */
async function consumeDatabaseBucket(
  bucketHash: string,
  windowMs: number
): Promise<RateLimitDecision> {
  const result = await query<{
    request_count: number;
    retry_after_seconds: number;
  }>(
    `INSERT INTO api_rate_limit_buckets (
       bucket_hash, window_started_at, request_count, expires_at
     )
     VALUES (
       $1, NOW(), 1,
       NOW() + ($2::double precision * INTERVAL '1 millisecond')
     )
     ON CONFLICT (bucket_hash) DO UPDATE
     SET
       request_count = CASE
         WHEN api_rate_limit_buckets.expires_at <= NOW() THEN 1
         ELSE api_rate_limit_buckets.request_count + 1
       END,
       window_started_at = CASE
         WHEN api_rate_limit_buckets.expires_at <= NOW() THEN NOW()
         ELSE api_rate_limit_buckets.window_started_at
       END,
       expires_at = CASE
         WHEN api_rate_limit_buckets.expires_at <= NOW()
           THEN NOW() + ($2::double precision * INTERVAL '1 millisecond')
         ELSE api_rate_limit_buckets.expires_at
       END
     RETURNING
       request_count,
       GREATEST(1, CEIL(EXTRACT(EPOCH FROM (expires_at - NOW()))))::int
         AS retry_after_seconds`,
    [bucketHash, windowMs]
  );

  const row = result.rows[0];
  if (!row) {
    // Never fail open if a configured database did not return the counter row.
    throw new Error('Rate-limit storage did not return the updated counter.');
  }

  return {
    count: Number(row.request_count),
    retryAfterSeconds: Number(row.retry_after_seconds),
  };
}

/**
 * Best-effort cleanup of expired shared counters. Cleanup is deliberately
 * separate from admission: a cleanup failure never bypasses rate limiting.
 */
function scheduleDatabaseSweep(now: number): void {
  if (now - lastDatabaseSweep < SWEEP_INTERVAL_MS) return;
  lastDatabaseSweep = now;

  void query(
    `WITH expired AS (
       SELECT bucket_hash
       FROM api_rate_limit_buckets
       WHERE expires_at <= NOW()
       ORDER BY expires_at
       LIMIT 1000
     )
     DELETE FROM api_rate_limit_buckets AS buckets
     USING expired
     WHERE buckets.bucket_hash = expired.bucket_hash`
  ).catch((err) => {
    console.warn('[RateLimit] Expired bucket cleanup failed:', err instanceof Error ? err.message : 'unknown error');
  });
}

export interface RateLimitOptions {
  /** Fixed-window duration in milliseconds. */
  windowMs: number;
  /** Maximum allowed requests inside one window. */
  max: number;
  /** Server-derived identity(ies) for the caller. */
  keyFor: (req: Request) => string;
  /** Structured error code returned with 429. */
  code?: string;
  /** Persian user-facing message returned with 429. */
  message?: string;
}

export function rateLimit(options: RateLimitOptions) {
  const {
    windowMs,
    max,
    keyFor,
    code = 'RATE_LIMITED',
    message = 'تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش فرمایید.',
  } = options;

  if (!Number.isSafeInteger(windowMs) || windowMs <= 0) {
    throw new Error('RateLimitOptions.windowMs must be a positive safe integer.');
  }
  if (!Number.isSafeInteger(max) || max <= 0) {
    throw new Error('RateLimitOptions.max must be a positive safe integer.');
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    void (async () => {
      const now = Date.now();
      const identity = String(keyFor(req) ?? 'unknown').trim() || 'unknown';
      const bucketHash = createBucketHash(code, identity);

      const decision = isDatabaseConfigured()
        ? await consumeDatabaseBucket(bucketHash, windowMs)
        : consumeMemoryBucket(bucketHash, now, windowMs);

      if (isDatabaseConfigured()) {
        scheduleDatabaseSweep(now);
      }

      if (decision.count > max) {
        res.setHeader('Retry-After', String(decision.retryAfterSeconds));
        res.status(429).json({
          success: false,
          error: code,
          message,
          retryAfterSeconds: decision.retryAfterSeconds,
        });
        return;
      }

      next();
    })().catch(next);
  };
}

/** Test-only: clears process-local fallback buckets; persistent rows are untouched. */
export function clearRateLimitBuckets(): void {
  memoryBuckets.clear();
  lastMemorySweep = 0;
}


/**
 * Test-only targeted reset for the deterministic E2E client.
 * The caller is selected by a dev-only allowlisted endpoint; only HMAC keys
 * for the explicitly supplied test identities are deleted, never whole IP
 * ranges or customer rows.
 */
export async function clearRateLimitBucketsForTest(code: string, identities: string[]): Promise<number> {
  const hashes = Array.from(new Set(
    identities.map((identity) => String(identity).trim()).filter(Boolean)
  )).map((identity) => createBucketHash(code, identity));

  for (const hash of hashes) memoryBuckets.delete(hash);
  if (!hashes.length || !isDatabaseConfigured()) return hashes.length;

  const result = await query(
    'DELETE FROM api_rate_limit_buckets WHERE bucket_hash = ANY($1::char(64)[])',
    [hashes]
  );
  return Number(result.rowCount || 0);
}
