import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Phase 16: request correlation + structured logging.
 *
 * Every request receives an `x-request-id` (client-supplied IDs are accepted
 * only from trusted proxies — with default trust proxy=0 the header is
 * ignored and an ID is generated). The ID flows into the response header and
 * every subsequent log line for that request, making failures traceable
 * across server logs without exposing any request payload.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  export namespace Express {
    export interface Request {
      requestId?: string;
    }
  }
}

export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const trusted = req.app.get('trust proxy');
  const fromProxy = trusted ? req.header('x-request-id') : undefined;
  const requestId = fromProxy || crypto.randomUUID();

  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}

/** Structured single-line log: safe for log shippers. Never log bodies. */
export function logRequest(req: Request, res: Response, durationMs: number): void {
  const entry = {
    ts: new Date().toISOString(),
    level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
    type: 'http',
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    status: res.statusCode,
    durationMs,
  };
  console.log(JSON.stringify(entry));
}

/** Application-level structured log helper (startup, migrations, etc.). */
export function logStructured(level: 'info' | 'warn' | 'error', type: string, fields: Record<string, unknown>): void {
  console.log(JSON.stringify({ ts: new Date().toISOString(), level, type, ...fields }));
}
