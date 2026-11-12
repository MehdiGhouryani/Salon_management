import express from 'express';
import type { Request, Response } from 'express';
import { config } from '../config.ts';
import { getDevMockSmsProvider } from '../services/sms/index.ts';

export const devRouter = express.Router();

/**
 * GET /api/dev/otp-peek?phone=0912...
 *
 * DEVELOPMENT/TEST ONLY. Exposes the most recent OTP produced by the isolated
 * DevMockSmsProvider so browser E2E tests can complete REAL OTP flows (real
 * generation, real verification, real session issuance) without a real telco.
 *
 * Production isolation (defense in depth):
 *  1. This router is only mounted when config.isProduction is false (routes/index.ts).
 *  2. The route itself re-checks and returns the standard JSON 404 in production.
 *  3. DevMockSmsProvider refuses to run in production at all.
 */
devRouter.get('/otp-peek', (req: Request, res: Response): void => {
  if (config.isProduction) {
    res.status(404).json({ error: 'API_ENDPOINT_NOT_FOUND' });
    return;
  }

  const phone = req.query.phone ? String(req.query.phone) : undefined;
  const record = getDevMockSmsProvider()?.getLastSentOtp(phone);

  res.status(200).json({
    success: true,
    otp: record ?? null,
  });
});
