import express from 'express';
import type { Request, Response } from 'express';
import { config } from '../config.ts';
import { getDevMockSmsProvider } from '../services/sms/index.ts';
import { userRepository } from '../repositories/userRepository.ts';

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

/**
 * POST /api/dev/seed-salon-membership { phone, salonId, role }
 *
 * DEVELOPMENT/TEST ONLY (in-memory adapter): provisions a user + salon
 * membership so E2E journeys can exercise the salon panel. In production this
 * route is not mounted; memberships are provisioned by the admin bootstrap /
 * database seeding only.
 */
devRouter.post('/seed-salon-membership', async (req: Request, res: Response): Promise<void> => {
  if (config.isProduction) {
    res.status(404).json({ error: 'API_ENDPOINT_NOT_FOUND' });
    return;
  }
  const { phone, salonId, role } = req.body || {};
  if (!phone || !salonId) {
    res.status(400).json({ error: 'PHONE_AND_SALON_REQUIRED', message: 'شماره و شناسه سالن الزامی است.' });
    return;
  }

  let user = await userRepository.findByPhone(String(phone));
  if (!user) {
    user = await userRepository.create({
      phone: String(phone),
      fullName: 'کاربر E2E سالن',
      platformRole: 'user',
      status: 'active',
    });
  }
  const membership = await userRepository.addMembership(
    user.id,
    String(salonId),
    role === 'owner' || role === 'manager' || role === 'staff' || role === 'receptionist' ? role : 'owner'
  );

  res.status(200).json({
    success: true,
    userId: user.id,
    membership: { salonId: membership.salon_id, role: membership.role },
  });
});
