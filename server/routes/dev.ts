import express from 'express';
import type { Request, Response } from 'express';
import { config } from '../config.ts';
import { getDevMockSmsProvider } from '../services/sms/index.ts';
import { userRepository } from '../repositories/userRepository.ts';
import { otpService } from '../services/auth/otpService.ts';
import { clearRateLimitBuckets, clearRateLimitBucketsForTest } from '../middleware/rateLimit.ts';
import { appointmentRepository } from '../repositories/appointmentRepository.ts';

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
 * Server-side allowlist (Phase 19) of the ONLY phone numbers the reset
 * endpoints may ever touch. This list lives here, on the server — the client
 * can never extend it. Any request naming a phone outside this list is
 * rejected WITHOUT any deletion (fail-closed), so real customer OTP records
 * and bookings are structurally unreachable through these routes.
 *
 * Kept identical to e2e/helpers/testIsolation.ts (E2E_OTP_PHONES); the
 * integration suite asserts the two stay in lock-step.
 */
export const E2E_TEST_PHONE_ALLOWLIST: readonly string[] = [
  '09361000005', // salon-ops staff login + visual-a11y salon manager
  '09361000020', // super-admin console + visual-a11y super admin
  '09364567890', // journey-booking customer
  '09364567891', // journey-booking completion
  '09364567892', // journey-my-bookings
  '09362000001', // super-admin forbidden-role customer
  '09362000077', // salon-ops booking form
];

/**
 * Normalizes and validates the requested phones against the server-side
 * allowlist. FAIL-CLOSED: one non-allowlisted phone rejects the whole request
 * (no partial deletion, no guessing about Persian digits or prefixes — the
 * caller must send exactly the canonical national numbers).
 */
function parseAllowlistedPhones(req: Request): { phones: string[]; rejected: string[] } {
  const raw: string[] = Array.isArray(req.body?.phones)
    ? req.body.phones.map((p: unknown) => String(p)).slice(0, 100)
    : [];
  const rejected = raw.filter((p) => !E2E_TEST_PHONE_ALLOWLIST.includes(p.trim()));
  const phones = raw.filter((p) => E2E_TEST_PHONE_ALLOWLIST.includes(p.trim()));
  return { phones, rejected };
}

/**
 * Shared guard (Phase 19): production returns the standard JSON 404, and the
 * endpoints additionally require the EXPLICIT ENABLE_TEST_ENDPOINTS=true flag
 * (config.testEndpointsEnabled, default OFF) even in non-production — a dev or
 * staging process that did not deliberately opt in gets the same 404, so the
 * reset surface is never silently available.
 */
function assertTestEndpointsEnabled(res: Response): boolean {
  if (config.isProduction || !config.testEndpointsEnabled) {
    res.status(404).json({ error: 'API_ENDPOINT_NOT_FOUND' });
    return false;
  }
  return true;
}

/**
 * POST /api/dev/reset-rate-limiters { phones?: string[] }
 *
 * DEVELOPMENT/TEST ONLY (Phases 18/19). Clears the in-process rate-limit
 * buckets and (for ALLOWLISTED phones only) deletes their OTP challenges so
 * the sequential E2E suite — which drives every request through one
 * deterministic test IP — never trips security limits that exist for
 * real-world traffic distribution, not for a single test client.
 *
 * Isolation layers: (1) router not mounted in production; (2) route re-checks
 * the flag itself → standard 404; (3) requires ENABLE_TEST_ENDPOINTS=true
 * (default OFF); (4) server-side phone allowlist, fail-closed; (5) the caller
 * IP scope can only ever be the test client's own address.
 *
 * Body:
 *  - phones: national phone numbers whose OTP challenges (cooldown + counters)
 *    should be deleted in the ACTIVE store (in-memory or PostgreSQL). Every
 *    phone must be in E2E_TEST_PHONE_ALLOWLIST.
 */
devRouter.post('/reset-rate-limiters', async (req: Request, res: Response): Promise<void> => {
  if (!assertTestEndpointsEnabled(res)) return;

  const { phones, rejected } = parseAllowlistedPhones(req);
  if (rejected.length > 0) {
    res.status(400).json({
      error: 'TEST_PHONE_NOT_ALLOWLISTED',
      message: 'فقط شماره‌های آزمایشیِ فهرست‌شده در سرور قابل بازنشانی هستند.',
      rejectedCount: rejected.length,
    });
    return;
  }

  let otpChallengesDeleted = 0;
  try {
    // Also clears the caller-IP side of the per-phone/IP OTP counter — the
    // E2E suite shares one deterministic client IP.
    otpChallengesDeleted = await otpService.resetChallengesForPhones(phones, req.ip);
  } catch (err: any) {
    res.status(500).json({
      error: 'RATE_LIMIT_RESET_FAILED',
      message: err?.message || 'خطا در بازنشانی وضعیت OTP.',
    });
    return;
  }

  // Shared PostgreSQL rate-limit counters must also reset for this test IP.
  // Request OTP is IP-scoped; verify OTP is scoped to this IP + allowlisted phone.
  const callerIp = String(req.ip || 'unknown');
  try {
    await Promise.all([
      clearRateLimitBucketsForTest('OTP_REQUEST_RATE_LIMIT', [callerIp]),
      clearRateLimitBucketsForTest(
        'OTP_VERIFY_RATE_LIMIT',
        phones.map((phone) => callerIp + ':' + phone)
      ),
    ]);
  } catch (err: any) {
    res.status(500).json({
      error: 'RATE_LIMIT_RESET_FAILED',
      message: err?.message || 'خطا در بازنشانی محدودیت‌های آزمایشی.',
    });
    return;
  }

  clearRateLimitBuckets();

  res.status(200).json({
    success: true,
    otpChallengesDeleted,
  });
});

/**
 * POST /api/dev/reset-e2e-bookings { phones: string[] }
 *
 * DEVELOPMENT/TEST ONLY (Phases 18/19). Deletes appointments (and their
 * status history) for ALLOWLISTED test phone numbers only. The browser E2E
 * suite books real slots through the shared booking engine; against a
 * persistent database (CI parity), yesterday's run must not shrink today's
 * availability or the journeys time out on full slot grids.
 *
 * Isolation layers: production 404 + explicit ENABLE_TEST_ENDPOINTS flag +
 * server-side allowlist with fail-closed rejection — real customer bookings
 * are structurally unreachable through this route.
 */
devRouter.post('/reset-e2e-bookings', async (req: Request, res: Response): Promise<void> => {
  if (!assertTestEndpointsEnabled(res)) return;

  const { phones, rejected } = parseAllowlistedPhones(req);
  if (rejected.length > 0) {
    res.status(400).json({
      error: 'TEST_PHONE_NOT_ALLOWLISTED',
      message: 'فقط شماره‌های آزمایشیِ فهرست‌شده در سرور قابل بازنشانی هستند.',
      rejectedCount: rejected.length,
    });
    return;
  }
  if (phones.length === 0) {
    res.status(400).json({ error: 'PHONES_REQUIRED', message: 'لیست شماره‌ها الزامی است.' });
    return;
  }

  try {
    // The repository handles both stores (PostgreSQL + in-memory dev adapter)
    // and deletes the status history alongside the appointments.
    const result = await appointmentRepository.deleteByClientPhones(phones);
    res.status(200).json({
      success: true,
      appointmentsDeleted: result.appointmentsDeleted,
      historyDeleted: result.historyDeleted,
    });
  } catch (err: any) {
    res.status(500).json({
      error: 'E2E_RESET_FAILED',
      message: err?.message || 'خطا در بازنشانی نوبت‌های آزمایشی.',
    });
  }
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

/**
 * POST /api/dev/seed-super-admin { phone }
 *
 * DEVELOPMENT/TEST ONLY: provisions a platform super_admin so E2E journeys
 * can exercise the governed admin console. In production this route is not
 * mounted; super admins are provisioned exclusively by scripts/bootstrapAdmin.ts.
 */
devRouter.post('/seed-super-admin', async (req: Request, res: Response): Promise<void> => {
  if (config.isProduction) {
    res.status(404).json({ error: 'API_ENDPOINT_NOT_FOUND' });
    return;
  }
  const { phone } = req.body || {};
  if (!phone) {
    res.status(400).json({ error: 'PHONE_REQUIRED', message: 'شماره الزامی است.' });
    return;
  }

  let user = await userRepository.findByPhone(String(phone));
  if (!user) {
    user = await userRepository.create({
      phone: String(phone),
      fullName: 'مدیر ارشد E2E',
      platformRole: 'super_admin',
      status: 'active',
    });
  } else if (user.platform_role !== 'super_admin') {
    user = await userRepository.update(user.id, { platformRole: 'super_admin' });
  }
  if (!user) {
    res.status(500).json({ error: 'SEED_FAILED', message: 'خطا در ایجاد مدیر ارشد.' });
    return;
  }

  res.status(200).json({ success: true, userId: user.id, role: user.platform_role });
});
