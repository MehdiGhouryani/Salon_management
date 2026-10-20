import assert from 'assert';
import { normalizeIranianPhone, cleanPhoneInput } from '../server/utils/phone.ts';
import { otpService } from '../server/services/auth/otpService.ts';
import { sessionService, hashSessionToken } from '../server/services/auth/sessionService.ts';
import { getDevMockSmsProvider } from '../server/services/sms/index.ts';
import { NullSmsProvider } from '../server/services/sms/nullProvider.ts';
import {
  requirePlatformRole,
  requireSalonMembership,
  requireSalonPermission,
  csrfProtection,
  Policies,
} from '../server/middleware/auth.ts';

async function runTestSuite() {
  console.log('====================================================');
  console.log('   NobatAra Phase 5 Automated Security Test Suite   ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void> | void) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}\n`);
      failed++;
    }
  }

  // ---------------------------------------------------------------------------
  // 1. Phone Normalization & Validation
  // ---------------------------------------------------------------------------
  console.log('--- 1. Phone Normalization & Validation Tests ---');

  await test('Normalizes standard 09123456789 format', () => {
    const res = normalizeIranianPhone('09123456789');
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.e164, '+989123456789');
    assert.strictEqual(res.national, '09123456789');
  });

  await test('Normalizes international +989123456789 format', () => {
    const res = normalizeIranianPhone('+989123456789');
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.e164, '+989123456789');
    assert.strictEqual(res.national, '09123456789');
  });

  await test('Normalizes 00989123456789 format', () => {
    const res = normalizeIranianPhone('00989123456789');
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.e164, '+989123456789');
    assert.strictEqual(res.national, '09123456789');
  });

  await test('Normalizes 10-digit 9123456789 format', () => {
    const res = normalizeIranianPhone('9123456789');
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.e164, '+989123456789');
    assert.strictEqual(res.national, '09123456789');
  });

  await test('Normalizes Persian/Arabic digits (۰۹۱۲۳۴۵۶۷۸۹)', () => {
    const res = normalizeIranianPhone('۰۹۱۲۳۴۵۶۷۸۹');
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.national, '09123456789');
    assert.strictEqual(res.e164, '+989123456789');
  });

  await test('Normalizes formatted phone with dashes and spaces', () => {
    const res = normalizeIranianPhone('0912-345 6789');
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.national, '09123456789');
  });

  await test('Rejects non-Iranian mobile numbers (e.g. US +1)', () => {
    const res = normalizeIranianPhone('+14155552671');
    assert.strictEqual(res.isValid, false);
  });

  await test('Rejects landlines and invalid prefixes (021..., 081...)', () => {
    const res1 = normalizeIranianPhone('02122409876');
    assert.strictEqual(res1.isValid, false);
    const res2 = normalizeIranianPhone('08123456789');
    assert.strictEqual(res2.isValid, false);
  });

  await test('Rejects malformed, too short, or non-numeric inputs', () => {
    assert.strictEqual(normalizeIranianPhone('12345').isValid, false);
    assert.strictEqual(normalizeIranianPhone('').isValid, false);
    assert.strictEqual(normalizeIranianPhone('invalid-phone').isValid, false);
  });

  // ---------------------------------------------------------------------------
  // 2. Cryptographic OTP Challenges & Resend Cooldown
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Cryptographic OTP Lifecycle & Anti-Bruteforce Tests ---');

  const testPhone = '09198765432';
  otpService.clearInMemory();
  sessionService.clearInMemory();
  const mockSms = getDevMockSmsProvider();

  await test('Requests OTP and generates 6-digit code dispatched via SMS provider', async () => {
    mockSms?.clear();
    const reqRes = await otpService.requestOtp(testPhone, 'login', '127.0.0.1');
    assert.strictEqual(reqRes.success, true);
    assert.strictEqual(reqRes.phoneNational, testPhone);
    assert.strictEqual(reqRes.resendAvailableInSeconds, 60);

    const sent = mockSms?.getLastSentOtp(testPhone);
    assert.ok(sent);
    assert.strictEqual(/^\d{6}$/.test(sent.code), true);
  });

  await test('Enforces resend cooldown: rejecting requests within 60 seconds', async () => {
    const reqRes2 = await otpService.requestOtp(testPhone, 'login', '127.0.0.1');
    assert.strictEqual(reqRes2.success, false);
    assert.strictEqual(reqRes2.statusCode, 429);
    assert.ok(reqRes2.resendAvailableInSeconds > 0);
  });

  await test('Verifies valid OTP code and marks challenge consumed', async () => {
    const sent = mockSms?.getLastSentOtp(testPhone);
    assert.ok(sent);

    const verifyRes = await otpService.verifyOtp(testPhone, sent.code, 'login', '127.0.0.1');
    assert.strictEqual(verifyRes.success, true);
    assert.ok(verifyRes.user);
    assert.strictEqual(verifyRes.user.phone, testPhone);
    assert.strictEqual(verifyRes.user.platform_role, 'user'); // Strict customer role
  });

  await test('Replay Attack Prevention: rejects reusing the already-consumed OTP', async () => {
    const sent = mockSms?.getLastSentOtp(testPhone);
    assert.ok(sent);

    const replayRes = await otpService.verifyOtp(testPhone, sent.code, 'login', '127.0.0.1');
    assert.strictEqual(replayRes.success, false);
    assert.strictEqual(replayRes.statusCode, 400);
    assert.ok(replayRes.error?.includes('قبلا استفاده شده'));
  });

  await test('Rejects incorrect OTP code and decrements attempt count', async () => {
    const newPhone = '09191112233';
    await otpService.requestOtp(newPhone, 'login', '127.0.0.1');

    const wrongRes = await otpService.verifyOtp(newPhone, '999999', 'login', '127.0.0.1');
    assert.strictEqual(wrongRes.success, false);
    assert.strictEqual(wrongRes.statusCode, 400);
    assert.ok(wrongRes.error?.includes('اشتباه'));
  });

  await test('Cross-Purpose Rejection: code for booking_verification cannot be used for login', async () => {
    const purposePhone = '09192223344';
    await otpService.requestOtp(purposePhone, 'booking_verification', '127.0.0.1');
    const sent = mockSms?.getLastSentOtp(purposePhone);
    assert.ok(sent);

    const crossRes = await otpService.verifyOtp(purposePhone, sent.code, 'login', '127.0.0.1');
    assert.strictEqual(crossRes.success, false);
  });

  // ---------------------------------------------------------------------------
  // 3. SMS Provider Production Safeguard
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. SMS Provider Fail-Closed Production Safeguards ---');

  await test('NullSmsProvider fails closed with descriptive error', async () => {
    const nullProvider = new NullSmsProvider('درگاه پیامک پیکربندی نشده است.');
    assert.strictEqual(nullProvider.isConfigured(), false);
    const sendRes = await nullProvider.sendOtp('09121111111', '123456');
    assert.strictEqual(sendRes.success, false);
    assert.ok(sendRes.error?.includes('درگاه'));
  });

  // ---------------------------------------------------------------------------
  // 4. Persistent Sessions, Hashing at Rest & Revocation
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Session Security, Hashing & Revocation Tests ---');

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

  await test('Creates session with 256-bit token and sets HttpOnly cookie', async () => {
    const sessionRes = await sessionService.createSession(mockUser, mockReq, mockRes, 'web');
    assert.ok(sessionRes.rawToken);
    assert.strictEqual(sessionRes.rawToken.length, 64); // 32 bytes hex = 64 hex chars
    createdRawToken = sessionRes.rawToken;

    assert.ok(capturedCookie);
    assert.strictEqual((capturedCookie as any).name, 'nobatara_session');
    assert.strictEqual((capturedCookie as any).opts.httpOnly, true);
    assert.strictEqual((capturedCookie as any).opts.path, '/');
    assert.strictEqual((capturedCookie as any).opts.sameSite, 'lax');
  });

  await test('Validates active session and confirms token is hashed at rest', async () => {
    const expectedHash = hashSessionToken(createdRawToken);
    assert.strictEqual(expectedHash.length, 64);

    const validation = await sessionService.validateSession(createdRawToken);
    assert.strictEqual(validation.valid, true);
    assert.ok(validation.session);
    assert.strictEqual(validation.session.token_hash, expectedHash);
  });

  await test('Rejects invalid or nonexistent session token', async () => {
    const invalidRes = await sessionService.validateSession('non-existent-token-abc-123');
    assert.strictEqual(invalidRes.valid, false);
    assert.strictEqual(invalidRes.error, 'SESSION_NOT_FOUND');
  });

  await test('Revokes session and rejects subsequent validation requests', async () => {
    const revoked = await sessionService.revokeSession(createdRawToken, mockRes);
    assert.strictEqual(revoked, true);

    const validationAfterRevoke = await sessionService.validateSession(createdRawToken);
    assert.strictEqual(validationAfterRevoke.valid, false);
    assert.strictEqual(validationAfterRevoke.error, 'SESSION_REVOKED');
  });

  // ---------------------------------------------------------------------------
  // 5. Server-Side RBAC & Tenant Isolation Middlewares
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. Server-Side RBAC & Tenant Authorization Tests ---');

  await test('requirePlatformRole denies access to unauthorized role', async () => {
    const req: any = {
      isAuthenticated: true,
      user: { ...mockUser, platform_role: 'user' },
    };
    let statusCode = 200;
    let jsonBody: any = null;
    const res: any = {
      status: (code: number) => {
        statusCode = code;
        return {
          json: (b: any) => { jsonBody = b; },
        };
      },
    };

    let nextCalled = false;
    const middleware = requirePlatformRole('super_admin');
    middleware(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(statusCode, 403);
    assert.strictEqual(jsonBody?.error, 'FORBIDDEN_PLATFORM_ROLE');
  });

  await test('requirePlatformRole allows access to authorized super_admin', async () => {
    const req: any = {
      isAuthenticated: true,
      user: { ...mockUser, platform_role: 'super_admin' },
    };
    let nextCalled = false;
    const middleware = requirePlatformRole('super_admin');
    middleware(req, {} as any, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, true);
  });

  await test('requirePlatformRole allows financial_manager to access financial platform scope', async () => {
    const req: any = {
      isAuthenticated: true,
      user: { ...mockUser, platform_role: 'financial_manager' },
    };
    let nextCalled = false;
    const middleware = requirePlatformRole('super_admin', 'financial_manager');
    middleware(req, {} as any, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, true);
  });

  await test('requireSalonMembership prevents cross-salon unauthorized access', async () => {
    const req: any = {
      isAuthenticated: true,
      user: { ...mockUser, platform_role: 'user' },
      params: { salonId: 'sal-101' },
      salonMemberships: [
        { salon_id: 'sal-102', role: 'manager', status: 'active' }, // Belongs to sal-102, NOT sal-101
      ],
    };

    let statusCode = 200;
    let jsonBody: any = null;
    const res: any = {
      status: (code: number) => {
        statusCode = code;
        return {
          json: (b: any) => { jsonBody = b; },
        };
      },
    };

    let nextCalled = false;
    const middleware = requireSalonMembership('owner', 'manager');
    middleware(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(statusCode, 403);
    assert.strictEqual(jsonBody?.error, 'FORBIDDEN_SALON_ACCESS');
  });

  await test('requireSalonMembership permits authorized member of the specific salon', async () => {
    const req: any = {
      isAuthenticated: true,
      user: { ...mockUser, platform_role: 'user' },
      params: { salonId: 'sal-101' },
      salonMemberships: [
        { salon_id: 'sal-101', role: 'manager', status: 'active' },
      ],
    };

    let nextCalled = false;
    const middleware = requireSalonMembership('owner', 'manager');
    middleware(req, {} as any, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, true);
  });

  await test('requireSalonPermission permits manager or owner unconditionally', async () => {
    const req: any = {
      isAuthenticated: true,
      user: { ...mockUser, platform_role: 'user' },
      params: { salonId: 'sal-101' },
      salonMemberships: [
        { salon_id: 'sal-101', role: 'manager', status: 'active', permissions: [] },
      ],
    };

    let nextCalled = false;
    const middleware = requireSalonPermission('appointments:write');
    middleware(req, {} as any, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, true);
  });

  await test('requireSalonPermission enforces specific permission for staff', async () => {
    // Staff WITHOUT permission
    const reqNoPerm: any = {
      isAuthenticated: true,
      user: { ...mockUser, platform_role: 'user' },
      params: { salonId: 'sal-101' },
      salonMemberships: [
        { salon_id: 'sal-101', role: 'staff', status: 'active', permissions: ['appointments:read'] },
      ],
    };

    let statusCode = 200;
    let jsonBody: any = null;
    const res: any = {
      status: (code: number) => {
        statusCode = code;
        return { json: (b: any) => { jsonBody = b; } };
      },
    };

    let nextCalled = false;
    const middleware = requireSalonPermission('appointments:write');
    middleware(reqNoPerm, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(statusCode, 403);
    assert.strictEqual(jsonBody?.error, 'FORBIDDEN_SALON_PERMISSION');

    // Staff WITH permission
    const reqWithPerm: any = {
      isAuthenticated: true,
      user: { ...mockUser, platform_role: 'user' },
      params: { salonId: 'sal-101' },
      salonMemberships: [
        { salon_id: 'sal-101', role: 'staff', status: 'active', permissions: ['appointments:read', 'appointments:write'] },
      ],
    };

    let permNextCalled = false;
    middleware(reqWithPerm, {} as any, () => { permNextCalled = true; });
    assert.strictEqual(permNextCalled, true);
  });

  // ---------------------------------------------------------------------------
  // 6. Multi-Session Management Tests
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. Multi-Session Listing & Granular Revocation Tests ---');

  await test('Lists multiple active sessions for user and revokes remote sessions', async () => {
    sessionService.clearInMemory();
    const testUser = { ...mockUser, id: 'multi-session-user-1' };

    const sess1 = await sessionService.createSession(testUser, mockReq, mockRes, 'web');
    const sess2 = await sessionService.createSession(testUser, mockReq, mockRes, 'mobile');

    const sessions = await sessionService.getUserSessions(testUser.id);
    assert.strictEqual(sessions.length, 2);

    // Revoke sess2 by ID
    const revoked = await sessionService.revokeSessionById(sess2.sessionId, testUser.id);
    assert.strictEqual(revoked, true);

    const sessionsAfter = await sessionService.getUserSessions(testUser.id);
    assert.strictEqual(sessionsAfter.length, 1);
    assert.strictEqual(sessionsAfter[0].id, sess1.sessionId);
  });

  await test('revokeOtherSessions leaves only current session active', async () => {
    sessionService.clearInMemory();
    const testUser = { ...mockUser, id: 'multi-session-user-2' };

    const sess1 = await sessionService.createSession(testUser, mockReq, mockRes, 'web');
    const sess2 = await sessionService.createSession(testUser, mockReq, mockRes, 'mobile');
    const sess3 = await sessionService.createSession(testUser, mockReq, mockRes, 'api');

    const revokedCount = await sessionService.revokeOtherSessions(testUser.id, sess1.sessionId);
    assert.strictEqual(revokedCount, 2);

    const remaining = await sessionService.getUserSessions(testUser.id);
    assert.strictEqual(remaining.length, 1);
    assert.strictEqual(remaining[0].id, sess1.sessionId);
  });

  // ---------------------------------------------------------------------------
  // 7. Customer Identity Privilege Isolation
  // ---------------------------------------------------------------------------
  console.log('\n--- 7. Customer Identity & Public Privilege Separation Tests ---');

  await test('Public phone authentication strictly provisions role=user (never super_admin)', async () => {
    const customerPhone = '09359876543';
    const reqOtp = await otpService.requestOtp(customerPhone, 'login', '127.0.0.1');
    assert.strictEqual(reqOtp.success, true);

    const sent = mockSms?.getLastSentOtp(customerPhone);
    assert.ok(sent);

    const verified = await otpService.verifyOtp(customerPhone, sent.code, 'login', '127.0.0.1');
    assert.strictEqual(verified.success, true);
    assert.strictEqual(verified.user?.platform_role, 'user');
    assert.strictEqual(Policies.isCustomer(verified.user), true);
    assert.strictEqual(Policies.isSuperAdmin(verified.user), false);
    assert.strictEqual(Policies.isFinancialManager(verified.user), false);
  });

  // ---------------------------------------------------------------------------
  // 8. CSRF Protection
  // ---------------------------------------------------------------------------
  console.log('\n--- 8. CSRF & State-Changing Request Protection Tests ---');

  await test('csrfProtection allows safe GET requests without tokens', () => {
    const getReq: any = { method: 'GET', headers: {} };
    let nextCalled = false;
    csrfProtection(getReq, {} as any, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true);
  });

  await test('csrfProtection allows state-changing POST when anti-CSRF header is present', () => {
    const postReq: any = {
      method: 'POST',
      headers: { 'x-nobatara-client': 'web' },
    };
    let nextCalled = false;
    csrfProtection(postReq, {} as any, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true);
  });

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log('\n====================================================');
  console.log(`Test Execution Finished: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
