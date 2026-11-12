import type { Request, Response, NextFunction } from 'express';

/**
 * Minimal fixed-window in-process rate limiter (Phase 07).
 *
 * Scope honesty: this limits a SINGLE server process. A horizontally scaled
 * production deployment must front the service with a shared limiter (e.g.
 * Redis-based) or the effective limit multiplies by instance count. That
 * limitation is documented in the deployment checklist, not hidden.
 *
 * Identifiers are derived server-side only: `req.ip` honors the configured
 * trust-proxy policy and can never be freely chosen by the client, and
 * callers may add a normalized phone where available.
 */

interface Bucket {
  windowStart: number;
  count: number;
}

const buckets = new Map<string, Bucket>();

// Periodic cleanup so the map cannot grow unbounded.
let lastSweep = Date.now();
function sweep(now: number): void {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart > 30 * 60_000) buckets.delete(key);
  }
}

export interface RateLimitOptions {
  /** Sliding/fixed window duration in milliseconds. */
  windowMs: number;
  /** Maximum allowed requests inside one window. */
  max: number;
  /** Server-derived identity(ies) for the caller (already joined by caller). */
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

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    sweep(now);

    const key = `${code}:${keyFor(req)}`;
    const bucket = buckets.get(key);

    if (!bucket || now - bucket.windowStart >= windowMs) {
      buckets.set(key, { windowStart: now, count: 1 });
      return next();
    }

    bucket.count += 1;
    if (bucket.count > max) {
      const retryAfterSeconds = Math.ceil((bucket.windowStart + windowMs - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.status(429).json({
        success: false,
        error: code,
        message,
        retryAfterSeconds,
      });
      return;
    }

    next();
  };
}

/** Test-only: clears all buckets between test cases. */
export function clearRateLimitBuckets(): void {
  buckets.clear();
}
