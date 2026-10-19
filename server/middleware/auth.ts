import type { Request, Response, NextFunction } from 'express';
import { config } from '../config.ts';
import { sessionService } from '../services/auth/sessionService.ts';
import type { DbUser, DbSalonMembership, PlatformRole } from '../repositories/userRepository.ts';
import type { DbUserSession } from '../services/auth/sessionService.ts';

// Augment Express Request interface with session context
declare global {
  namespace Express {
    interface Request {
      user?: DbUser;
      session?: DbUserSession;
      salonMemberships?: DbSalonMembership[];
      isAuthenticated?: boolean;
    }
  }
}

export type SalonRole = 'owner' | 'manager' | 'staff' | 'receptionist';

/**
 * Session authentication middleware:
 * Extracts session token from HttpOnly cookie or Authorization Bearer header,
 * validates it against the database, and attaches authenticated user context to req.
 */
export async function authenticateSession(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  req.isAuthenticated = false;

  // 1. Extract raw token from cookie (primary) or Bearer header (for APIs)
  const cookieToken = req.cookies?.[config.auth.sessionCookieName];
  let rawToken: string | undefined = cookieToken;

  if (!rawToken) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      rawToken = authHeader.substring(7).trim();
    }
  }

  if (!rawToken) {
    return next();
  }

  try {
    const validation = await sessionService.validateSession(rawToken);
    if (validation.valid && validation.user && validation.session) {
      req.isAuthenticated = true;
      req.user = validation.user;
      req.session = validation.session;
      req.salonMemberships = validation.memberships || [];
    }
  } catch (err: any) {
    console.error('[NobatAra Auth Middleware] Session validation error:', err.message);
  }

  next();
}

/**
 * CSRF & Origin validation middleware for state-changing requests
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  const method = req.method.toUpperCase();

  // Safe methods do not mutate state
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return next();
  }

  // 1. Allow custom anti-CSRF header
  const clientHeader = req.headers['x-nobatara-client'] || req.headers['x-requested-with'];
  if (clientHeader) {
    return next();
  }

  // 2. Validate Origin / Referer
  const origin = req.headers.origin || req.headers.referer;
  if (!origin) {
    // In production, state-changing requests without origin or anti-CSRF header are rejected
    if (config.isProduction) {
      res.status(403).json({
        error: 'CSRF_ORIGIN_MISSING',
        message: 'درخواست تغییر وضعیت بدون هدر معتبر مسدود شد.',
      });
      return;
    }
    return next();
  }

  try {
    const originUrl = new URL(String(origin));
    const host = req.headers.host;

    // Same origin match
    if (host && originUrl.host === host) {
      return next();
    }

    // Explicit CORS origins match
    if (config.corsOrigins.some((allowed) => allowed.includes(originUrl.host))) {
      return next();
    }

    // Development local / AI Studio proxy match
    if (config.isDevelopment) {
      return next();
    }

    res.status(403).json({
      error: 'CSRF_ORIGIN_FORBIDDEN',
      message: 'مبدا ارسال درخواست نامعتبر است.',
    });
  } catch {
    res.status(403).json({
      error: 'CSRF_ORIGIN_INVALID',
      message: 'هدر مبدا درخواست ساختار نامعتبر دارد.',
    });
  }
}

/**
 * Guard: Requires the user to have a valid, active server-verified session
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated || !req.user) {
    res.status(401).json({
      error: 'AUTHENTICATION_REQUIRED',
      message: 'احراز هویت الزامی است. لطفا ابتدا با شماره موبایل خود وارد شوید.',
    });
    return;
  }
  next();
}

/**
 * Guard: Requires a specific platform role (e.g. 'super_admin', 'platform_support')
 */
export function requirePlatformRole(...allowedRoles: PlatformRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.isAuthenticated || !req.user) {
      res.status(401).json({
        error: 'AUTHENTICATION_REQUIRED',
        message: 'احراز هویت الزامی است.',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.platform_role)) {
      res.status(403).json({
        error: 'FORBIDDEN_PLATFORM_ROLE',
        message: 'شما دسترسی لازم به این بخش از سامانه را ندارید.',
      });
      return;
    }

    next();
  };
}

/**
 * Guard: Requires the user to have an active membership in the target salon
 */
export function requireSalonMembership(...allowedRoles: SalonRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.isAuthenticated || !req.user) {
      res.status(401).json({
        error: 'AUTHENTICATION_REQUIRED',
        message: 'احراز هویت الزامی است.',
      });
      return;
    }

    // Super admins have platform-level governance override
    if (req.user.platform_role === 'super_admin') {
      return next();
    }

    const salonId = String(req.params.salonId || req.headers['x-salon-id'] || '').trim();
    if (!salonId) {
      res.status(400).json({
        error: 'SALON_ID_REQUIRED',
        message: 'شناسه سالن مشخص نشده است.',
      });
      return;
    }

    const membership = (req.salonMemberships || []).find(
      (m) => m.salon_id === salonId && m.status === 'active'
    );

    if (!membership) {
      res.status(403).json({
        error: 'FORBIDDEN_SALON_ACCESS',
        message: 'شما عضو این سالن نیستید یا دسترسی شما غیرفعال شده است.',
      });
      return;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(membership.role as SalonRole)) {
      res.status(403).json({
        error: 'FORBIDDEN_SALON_ROLE',
        message: 'نقش کاربری شما در این سالن اجازه انجام این عملیات را ندارد.',
      });
      return;
    }

    next();
  };
}
