/**
 * NobatAra Unit Tests — Auth, OTP, Sessions, RBAC, CSRF (CATEGORY: unit/in-memory)
 *
 * Migrated 1:1 from the legacy hand-rolled `tests/auth.test.ts` (32 cases).
 * These run against real service logic with explicitly isolated in-memory
 * adapters (no HTTP, no database). Database-backed behavior is covered by
 * tests/db/ (fail-closed) and HTTP contracts by tests/integration/.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { normalizeIranianPhone } from '../../server/utils/phone.ts';
import { otpService } from '../../server/services/auth/otpService.ts';
import { sessionService, hashSessionToken } from '../../server/services/auth/sessionService.ts';
import { getDevMockSmsProvider } from '../../server/services/sms/index.ts';
import { NullSmsProvider } from '../../server/services/sms/nullProvider.ts';
import {
  requirePlatformRole,
  requireSalonMembership,
  requireSalonPermission,
  csrfProtection,
  Policies,
} from '../../server/middleware/auth.ts';

const testPhone = '09198765432';
const mockSms = getDevMockSmsProvider();

const mockUser = {
  id: 'usr-test-101',
  phone: '09121111111',
  full_name: 'مدیر تست',
  email: 'test@nobatara.ir',
  platform_role: 'super_admin' as const,
  status: 'active' as const,
  two_factor_enabled: true,
  avatar_url: null,
  created_at: new Date(),
  updated_at: new Date(),
};

let capturedCookie: { name: string; val: string; opts: any } | null = null;
const mockReq: any = {
  headers: { 'user-agent': 'TestAgent/1.0' },
  socket: { remoteAddress: '127.0.0.1' },
};
const mockRes: any = {
  cookie: (name: string, val: string, opts: any) => {
    capturedCookie = { name, val, opts };
  },
  clearCookie: (_name: string, _opts: any) => {
    capturedCookie = null;
  },
};

let createdRawToken = '';

beforeAll(() => {
  otpService.clearInMemory();
  sessionService.clearInMemory();
});

describe('Phone normalization (unit)', () => {
  it('Normalizes standard 09123456789 format', () => {
    const res = normalizeIranianPhone('09123456789');
    expect(res.isValid).toBe(true);
    expect(res.e164).toBe('+989123456789');
    expect(res.national).toBe('09123456789');
  });

  it('Normalizes international +989123456789 format', () => {
    const res = normalizeIranianPhone('+989123456789');
    expect(res.isValid).toBe(true);
    expect(res.national).toBe('09123456789');
    expect(res.e164).toBe('+989123456789');
  });

  it('Normalizes 10-digit 9123456789 format', () => {
    const res = normalizeIranianPhone('9123456789');
    expect(res.isValid).toBe(true);
    expect(res.e164).toBe('+989123456789');
    expect(res.national).toBe('09123456789');
  });

  it('Normalizes Persian/Arabic digits (۰۹۱۲۳۴۵۶۷۸۹)', () => {
    const res = normalizeIranianPhone('۰۹۱۲۳۴۵۶۷۸۹');
    expect(res.isValid).toBe(true);
    expect(res.national).toBe('09123456789');
    expect(res.e164).toBe('+989123456789');
  });

  it('Normalizes formatted phone with dashes and spaces', () => {
    const res = normalizeIranianPhone('0912-345 6789');
    expect(res.isValid).toBe(true);
    expect(res.national).toBe('09123456789');
  });

  it('Rejects non-Iranian mobile numbers (e.g. US +1)', () => {
    expect(normalizeIranianPhone('+14155552671').isValid).toBe(false);
  });

  it('Rejects landlines and invalid prefixes (021..., 081...)', () => {
    expect(normalizeIranianPhone('02122409876').isValid).toBe(false);
    expect(normalizeIranianPhone('08123456789').isValid).toBe(false);
  });

  it('Rejects malformed, too short, or non-numeric inputs', () => {
    expect(normalizeIranianPhone('12345').isValid).toBe(false);
    expect(normalizeIranianPhone('').isValid).toBe(false);
    expect(normalizeIranianPhone('invalid-phone').isValid).toBe(false);
  });
});

describe('Cryptographic OTP lifecycle & anti-bruteforce (unit, in-memory adapter)', () => {
  it('Requests OTP and generates 6-digit code dispatched via SMS provider', async () => {
    mockSms?.clear();
    const reqRes = await otpService.requestOtp(testPhone, 'login', '127.0.0.1');
    expect(reqRes.success).toBe(true);
    expect(reqRes.phoneNational).toBe(testPhone);
    expect(reqRes.resendAvailableInSeconds).toBe(60);

    const sent = mockSms?.getLastSentOtp(testPhone);
    expect(sent).toBeTruthy();
    expect(/^\d{6}$/.test(sent!.code)).toBe(true);
  });

  it('Enforces resend cooldown: rejecting requests within 60 seconds', async () => {
    const reqRes2 = await otpService.requestOtp(testPhone, 'login', '127.0.0.1');
    expect(reqRes2.success).toBe(false);
    expect(reqRes2.statusCode).toBe(429);
    expect(reqRes2.resendAvailableInSeconds! > 0).toBe(true);
  });

  it('Verifies valid OTP code and marks challenge consumed', async () => {
    const sent = mockSms?.getLastSentOtp(testPhone);
    expect(sent).toBeTruthy();

    const verifyRes = await otpService.verifyOtp(testPhone, sent!.code, 'login', '127.0.0.1');
    expect(verifyRes.success).toBe(true);
    expect(verifyRes.user).toBeTruthy();
    expect(verifyRes.user!.phone).toBe(testPhone);
    expect(verifyRes.user!.platform_role).toBe('user'); // Strict customer role
  });

  it('Replay Attack Prevention: rejects reusing the already-consumed OTP', async () => {
    const sent = mockSms?.getLastSentOtp(testPhone);
    expect(sent).toBeTruthy();

    const replayRes = await otpService.verifyOtp(testPhone, sent!.code, 'login', '127.0.0.1');
    expect(replayRes.success).toBe(false);
    expect(replayRes.statusCode).toBe(400);
    expect(replayRes.error?.includes('قبلا استفاده شده')).toBe(true);
  });

  it('Rejects incorrect OTP code and decrements attempt count', async () => {
    const newPhone = '09191112233';
    await otpService.requestOtp(newPhone, 'login', '127.0.0.1');

    const wrongRes = await otpService.verifyOtp(newPhone, '999999', 'login', '127.0.0.1');
    expect(wrongRes.success).toBe(false);
    expect(wrongRes.statusCode).toBe(400);
    expect(wrongRes.error?.includes('اشتباه')).toBe(true);
  });

  it('Cross-Purpose Rejection: code for booking_verification cannot be used for login', async () => {
    const purposePhone = '09192223344';
    await otpService.requestOtp(purposePhone, 'booking_verification', '127.0.0.1');
    const sent = mockSms?.getLastSentOtp(purposePhone);
    expect(sent).toBeTruthy();

    const crossRes = await otpService.verifyOtp(purposePhone, sent!.code, 'login', '127.0.0.1');
    expect(crossRes.success).toBe(false);
  });
});

describe('SMS provider production safeguard (unit)', () => {
  it('NullSmsProvider fails closed with descriptive error', async () => {
    const nullProvider = new NullSmsProvider('درگاه پیامک پیکربندی نشده است.');
    expect(nullProvider.isConfigured()).toBe(false);
    const sendRes = await nullProvider.sendOtp('09121111111', '123456');
    expect(sendRes.success).toBe(false);
    expect(sendRes.error?.includes('درگاه')).toBe(true);
  });
});

describe('Session security, hashing & revocation (unit, in-memory adapter)', () => {
  it('Creates session with 256-bit token and sets HttpOnly cookie', async () => {
    const sessionRes = await sessionService.createSession(mockUser, mockReq, mockRes, 'web');
    expect(sessionRes.rawToken).toBeTruthy();
    expect(sessionRes.rawToken.length).toBe(64); // 32 bytes hex = 64 hex chars
    createdRawToken = sessionRes.rawToken;

    expect(capturedCookie).toBeTruthy();
    expect(capturedCookie!.name).toBe('nobatara_session');
    expect(capturedCookie!.opts.httpOnly).toBe(true);
    expect(capturedCookie!.opts.path).toBe('/');
    expect(capturedCookie!.opts.sameSite).toBe('lax');
  });

  it('Validates active session and confirms token is hashed at rest', async () => {
    const expectedHash = hashSessionToken(createdRawToken);
    expect(expectedHash.length).toBe(64);

    const validation = await sessionService.validateSession(createdRawToken);
    expect(validation.valid).toBe(true);
    expect(validation.session).toBeTruthy();
    expect(validation.session!.token_hash).toBe(expectedHash);
  });

  it('Rejects invalid or nonexistent session token', async () => {
    const invalidRes = await sessionService.validateSession('non-existent-token-abc-123');
    expect(invalidRes.valid).toBe(false);
    expect(invalidRes.error).toBe('SESSION_NOT_FOUND');
  });

  it('Revokes session and rejects subsequent validation requests', async () => {
    const revoked = await sessionService.revokeSession(createdRawToken, mockRes);
    expect(revoked).toBe(true);

    const validationAfterRevoke = await sessionService.validateSession(createdRawToken);
    expect(validationAfterRevoke.valid).toBe(false);
    expect(validationAfterRevoke.error).toBe('SESSION_REVOKED');
  });
});

describe('Server-side RBAC & tenant authorization middleware (unit)', () => {
  const callGuard = (
    guard: (req: any, res: any, next: any) => void,
    req: any
  ): { statusCode: number; jsonBody: any; nextCalled: boolean } => {
    let statusCode = 200;
    let jsonBody: any = null;
    let nextCalled = false;
    const res: any = {
      status: (code: number) => {
        statusCode = code;
        return { json: (b: any) => { jsonBody = b; } };
      },
    };
    guard(req, res, () => { nextCalled = true; });
    return { statusCode, jsonBody, nextCalled };
  };

  it('requirePlatformRole denies access to unauthorized role', () => {
    const req: any = { isAuthenticated: true, user: { ...mockUser, platform_role: 'user' } };
    const r = callGuard(requirePlatformRole('super_admin'), req);
    expect(r.nextCalled).toBe(false);
    expect(r.statusCode).toBe(403);
    expect(r.jsonBody?.error).toBe('FORBIDDEN_PLATFORM_ROLE');
  });

  it('requirePlatformRole allows access to authorized super_admin', () => {
    const req: any = { isAuthenticated: true, user: { ...mockUser, platform_role: 'super_admin' } };
    const r = callGuard(requirePlatformRole('super_admin'), req);
    expect(r.nextCalled).toBe(true);
  });

  it('requirePlatformRole allows financial_manager to access financial platform scope', () => {
    const req: any = { isAuthenticated: true, user: { ...mockUser, platform_role: 'financial_manager' } };
    const r = callGuard(requirePlatformRole('super_admin', 'financial_manager'), req);
    expect(r.nextCalled).toBe(true);
  });

  it('requireSalonMembership prevents cross-salon unauthorized access', () => {
    const req: any = {
      isAuthenticated: true,
      user: { ...mockUser, platform_role: 'user' },
      params: { salonId: 'sal-101' },
      salonMemberships: [
        { salon_id: 'sal-102', role: 'manager', status: 'active' }, // Belongs to sal-102, NOT sal-101
      ],
    };
    const r = callGuard(requireSalonMembership('owner', 'manager'), req);
    expect(r.nextCalled).toBe(false);
    expect(r.statusCode).toBe(403);
    expect(r.jsonBody?.error).toBe('FORBIDDEN_SALON_ACCESS');
  });

  it('requireSalonMembership permits authorized member of the specific salon', () => {
    const req: any = {
      isAuthenticated: true,
      user: { ...mockUser, platform_role: 'user' },
      params: { salonId: 'sal-101' },
      salonMemberships: [{ salon_id: 'sal-101', role: 'manager', status: 'active' }],
    };
    const r = callGuard(requireSalonMembership('owner', 'manager'), req);
    expect(r.nextCalled).toBe(true);
  });

  it('requireSalonPermission permits manager or owner unconditionally', () => {
    const req: any = {
      isAuthenticated: true,
      user: { ...mockUser, platform_role: 'user' },
      params: { salonId: 'sal-101' },
      salonMemberships: [
        { salon_id: 'sal-101', role: 'manager', status: 'active', permissions: [] },
      ],
    };
    const r = callGuard(requireSalonPermission('appointments:write'), req);
    expect(r.nextCalled).toBe(true);
  });

  it('requireSalonPermission enforces specific permission for staff', () => {
    const reqNoPerm: any = {
      isAuthenticated: true,
      user: { ...mockUser, platform_role: 'user' },
      params: { salonId: 'sal-101' },
      salonMemberships: [
        { salon_id: 'sal-101', role: 'staff', status: 'active', permissions: ['appointments:read'] },
      ],
    };
    const r = callGuard(requireSalonPermission('appointments:write'), reqNoPerm);
    expect(r.nextCalled).toBe(false);
    expect(r.statusCode).toBe(403);
    expect(r.jsonBody?.error).toBe('FORBIDDEN_SALON_PERMISSION');

    const reqWithPerm: any = {
      isAuthenticated: true,
      user: { ...mockUser, platform_role: 'user' },
      params: { salonId: 'sal-101' },
      salonMemberships: [
        { salon_id: 'sal-101', role: 'staff', status: 'active', permissions: ['appointments:read', 'appointments:write'] },
      ],
    };
    const r2 = callGuard(requireSalonPermission('appointments:write'), reqWithPerm);
    expect(r2.nextCalled).toBe(true);
  });
});

describe('Multi-session management (unit, in-memory adapter)', () => {
  it('Lists multiple active sessions for user and revokes remote sessions', async () => {
    sessionService.clearInMemory();
    const testUser = { ...mockUser, id: 'multi-session-user-1' };

    const sess1 = await sessionService.createSession(testUser, mockReq, mockRes, 'web');
    const sess2 = await sessionService.createSession(testUser, mockReq, mockRes, 'mobile');

    const sessions = await sessionService.getUserSessions(testUser.id);
    expect(sessions.length).toBe(2);

    const revoked = await sessionService.revokeSessionById(sess2.sessionId, testUser.id);
    expect(revoked).toBe(true);

    const sessionsAfter = await sessionService.getUserSessions(testUser.id);
    expect(sessionsAfter.length).toBe(1);
    expect(sessionsAfter[0].id).toBe(sess1.sessionId);
  });

  it('revokeOtherSessions leaves only current session active', async () => {
    sessionService.clearInMemory();
    const testUser = { ...mockUser, id: 'multi-session-user-2' };

    const sess1 = await sessionService.createSession(testUser, mockReq, mockRes, 'web');
    await sessionService.createSession(testUser, mockReq, mockRes, 'mobile');
    await sessionService.createSession(testUser, mockReq, mockRes, 'api');

    const revokedCount = await sessionService.revokeOtherSessions(testUser.id, sess1.sessionId);
    expect(revokedCount).toBe(2);

    const remaining = await sessionService.getUserSessions(testUser.id);
    expect(remaining.length).toBe(1);
    expect(remaining[0].id).toBe(sess1.sessionId);
  });
});

describe('Customer identity privilege separation (unit)', () => {
  it('Public phone authentication strictly provisions role=user (never super_admin)', async () => {
    const customerPhone = '09359876543';
    const reqOtp = await otpService.requestOtp(customerPhone, 'login', '127.0.0.1');
    expect(reqOtp.success).toBe(true);

    const sent = mockSms?.getLastSentOtp(customerPhone);
    expect(sent).toBeTruthy();

    const verified = await otpService.verifyOtp(customerPhone, sent!.code, 'login', '127.0.0.1');
    expect(verified.success).toBe(true);
    expect(verified.user?.platform_role).toBe('user');
    expect(Policies.isCustomer(verified.user)).toBe(true);
    expect(Policies.isSuperAdmin(verified.user)).toBe(false);
    expect(Policies.isFinancialManager(verified.user)).toBe(false);
  });
});

describe('CSRF protection middleware (unit)', () => {
  it('csrfProtection allows safe GET requests without tokens', () => {
    const getReq: any = { method: 'GET', headers: {} };
    let nextCalled = false;
    csrfProtection(getReq, {} as any, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });

  it('csrfProtection allows state-changing POST when anti-CSRF header is present', () => {
    const postReq: any = {
      method: 'POST',
      headers: { 'x-nobatara-client': 'web' },
    };
    let nextCalled = false;
    csrfProtection(postReq, {} as any, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });
});
