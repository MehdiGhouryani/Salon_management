import express from 'express';
import type { Request, Response } from 'express';
import { otpService, type OtpPurpose } from '../services/auth/otpService.ts';
import { sessionService, extractClientIp } from '../services/auth/sessionService.ts';
import { requireAuth } from '../middleware/auth.ts';
import { auditLogRepository } from '../repositories/auditLogRepository.ts';

export const authRouter = express.Router();

/**
 * POST /api/auth/otp/request
 * Initiates phone OTP challenge
 */
authRouter.post('/otp/request', async (req: Request, res: Response): Promise<void> => {
  const { phone, purpose = 'login' } = req.body || {};

  if (!phone || typeof phone !== 'string') {
    res.status(400).json({
      error: 'PHONE_REQUIRED',
      message: 'شماره موبایل الزامی است.',
    });
    return;
  }

  const validPurposes: OtpPurpose[] = ['login', 'booking_verification', 'admin_step_up'];
  if (!validPurposes.includes(purpose as OtpPurpose)) {
    res.status(400).json({
      error: 'INVALID_PURPOSE',
      message: 'هدف درخواست کد معتبر نیست.',
    });
    return;
  }

  const clientIp = extractClientIp(req);
  const result = await otpService.requestOtp(phone, purpose as OtpPurpose, clientIp);

  if (!result.success) {
    res.status(result.statusCode || 400).json({
      error: 'OTP_REQUEST_FAILED',
      message: result.error,
      resendAvailableInSeconds: result.resendAvailableInSeconds,
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: 'کد تایید پیامک شد.',
    phone: result.phoneNational,
    resendAvailableInSeconds: result.resendAvailableInSeconds,
    expiresInSeconds: result.expiresInSeconds,
  });
});

/**
 * POST /api/auth/otp/verify
 * Verifies phone OTP challenge, issues persistent session and sets HttpOnly cookie
 */
authRouter.post('/otp/verify', async (req: Request, res: Response): Promise<void> => {
  const { phone, code, purpose = 'login' } = req.body || {};

  if (!phone || !code) {
    res.status(400).json({
      error: 'MISSING_FIELDS',
      message: 'شماره موبایل و کد تایید الزامی هستند.',
    });
    return;
  }

  const clientIp = extractClientIp(req);
  const result = await otpService.verifyOtp(phone, code, purpose as OtpPurpose, clientIp);

  if (!result.success || !result.user) {
    // Record failed login audit log
    await auditLogRepository.create({
      actor: phone,
      actorRole: 'anonymous_visitor',
      action: 'تلاش ناموفق برای تایید کد پیامکی',
      target: 'Auth OTP',
      ipAddress: clientIp,
      userAgent: String(req.headers['user-agent'] || 'Unknown'),
      severity: 'warning',
      category: 'auth',
      details: { phone, reason: result.error },
    }).catch(() => {});

    res.status(result.statusCode || 400).json({
      error: 'OTP_VERIFICATION_FAILED',
      message: result.error || 'کد تایید معتبر نیست.',
    });
    return;
  }

  // Create persistent server session and attach HttpOnly cookie
  const { expiresAt, sessionId } = await sessionService.createSession(
    result.user,
    req,
    res,
    'web'
  );

  // Record successful login audit log
  await auditLogRepository.create({
    actor: result.user.full_name,
    actorRole: result.user.platform_role,
    action: 'ورود موفق به سامانه با شماره موبایل',
    target: `User:${result.user.id}`,
    ipAddress: clientIp,
    userAgent: String(req.headers['user-agent'] || 'Unknown'),
    severity: 'info',
    category: 'auth',
    details: { phone: result.user.phone, sessionId },
  }).catch(() => {});

  res.status(200).json({
    success: true,
    message: 'ورود با موفقیت انجام شد.',
    user: {
      id: result.user.id,
      phone: result.user.phone,
      fullName: result.user.full_name,
      platformRole: result.user.platform_role,
      status: result.user.status,
    },
    sessionExpiresAt: expiresAt.toISOString(),
  });
});

/**
 * GET /api/auth/me
 * Retrieves the currently authenticated user's session profile and salon memberships
 */
authRouter.get('/me', (req: Request, res: Response) => {
  if (!req.isAuthenticated || !req.user) {
    res.status(200).json({
      authenticated: false,
      user: null,
      salonMemberships: [],
    });
    return;
  }

  res.status(200).json({
    authenticated: true,
    user: {
      id: req.user.id,
      phone: req.user.phone,
      fullName: req.user.full_name,
      email: req.user.email,
      platformRole: req.user.platform_role,
      status: req.user.status,
      twoFactorEnabled: req.user.two_factor_enabled,
    },
    salonMemberships: (req.salonMemberships || []).map((m) => ({
      salonId: m.salon_id,
      role: m.role,
      status: m.status,
      permissions: m.permissions,
    })),
  });
});

/**
 * POST /api/auth/logout
 * Revokes current session and clears the session cookie
 */
authRouter.post('/logout', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const cookieToken = req.cookies?.['nobatara_session'];
  let rawToken: string | undefined = cookieToken;

  if (!rawToken) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      rawToken = authHeader.substring(7).trim();
    }
  }

  if (rawToken) {
    await sessionService.revokeSession(rawToken, res);
  }

  if (req.user) {
    await auditLogRepository.create({
      actor: req.user.full_name,
      actorRole: req.user.platform_role,
      action: 'خروج از حساب کاربری',
      target: `User:${req.user.id}`,
      ipAddress: extractClientIp(req),
      userAgent: String(req.headers['user-agent'] || 'Unknown'),
      severity: 'info',
      category: 'auth',
    }).catch(() => {});
  }

  res.status(200).json({
    success: true,
    message: 'با موفقیت از سامانه خارج شدید.',
  });
});
