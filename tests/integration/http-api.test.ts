/**
 * NobatAra HTTP Integration Tests (CATEGORY: integration/real-HTTP)
 *
 * Runs the REAL production Express app (createApp(): security headers, CORS,
 * session auth, CSRF, JSON 404 trap, error handler) on an ephemeral port and
 * validates actual HTTP contracts — migrated from the legacy
 * `tests/super_admin.test.ts` (7 cases) plus new coverage:
 * session cookie flags, OTP rate limits over HTTP, public route contracts,
 * tenant boundaries over HTTP, and a documented expected-failure (SECURITY-R1).
 *
 * NOTE: this suite uses the in-memory dev adapters because no PostgreSQL is
 * configured; it proves HTTP/middleware behavior, not persistence.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { createApp } from '../../server/app.ts';
import { userRepository } from '../../server/repositories/userRepository.ts';
import { sessionService } from '../../server/services/auth/sessionService.ts';
import { otpService } from '../../server/services/auth/otpService.ts';
import { getDevMockSmsProvider } from '../../server/services/sms/index.ts';
import { bookingService } from '../../server/services/booking/bookingService.ts';

let server: http.Server;
let baseUrl: string;

const mockReq: any = { headers: { 'user-agent': 'IntegrationTest/1.0' }, socket: { remoteAddress: '127.0.0.1' } };
const mockRes: any = { cookie: () => {}, clearCookie: () => {} };

let regUserId = '';
let regUserToken = '';
let adminToken = '';

beforeAll(async () => {
  server = http.createServer(createApp());
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as { port: number };
  baseUrl = `http://127.0.0.1:${address.port}`;

  // Standard user
  let regUser = await userRepository.findByPhone('09128887766');
  if (!regUser) {
    regUser = await userRepository.create({
      phone: '09128887766',
      fullName: 'کاربر معمولی',
      platformRole: 'user',
      status: 'active',
    });
  }
  regUserId = regUser.id;

  // Super admin user
  let superAdminUser = await userRepository.findByPhone('09120000000');
  if (!superAdminUser) {
    superAdminUser = await userRepository.create({
      phone: '09120000000',
      fullName: 'مدیر ارشد سامانه',
      platformRole: 'super_admin',
      status: 'active',
    });
  }

  const regSession = await sessionService.createSession(regUser, mockReq, mockRes, 'web');
  const adminSession = await sessionService.createSession(superAdminUser, mockReq, mockRes, 'web');
  regUserToken = regSession.rawToken;
  adminToken = adminSession.rawToken;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('Admin API security & RBAC over HTTP (integration)', () => {
  it('Unauthenticated request to /api/admin/stats is denied with 401', async () => {
    const res = await fetch(`${baseUrl}/api/admin/stats`);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('AUTHENTICATION_REQUIRED');
  });

  it('Regular user session cannot access /api/admin/stats (403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${regUserToken}` },
    });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe('FORBIDDEN_PLATFORM_ROLE');
  });

  it('Super Admin session can access /api/admin/stats and view platform metrics', async () => {
    const res = await fetch(`${baseUrl}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(typeof data.platform.totalSalons === 'number').toBe(true);
    expect(typeof data.platform.activeSalons === 'number').toBe(true);
    expect(typeof data.platform.totalUsers === 'number').toBe(true);
  });

  it('Status change without compulsory reason is rejected with 400', async () => {
    const res = await fetch(`${baseUrl}/api/admin/salons/sal-101/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
        'X-NobatAra-Client': 'test',
      },
      body: JSON.stringify({ status: 'suspended' }), // Missing reason
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('REASON_REQUIRED');
  });

  it('Suspending salon with valid reason updates status and records audit log', async () => {
    const suspendRes = await fetch(`${baseUrl}/api/admin/salons/sal-101/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
        'X-NobatAra-Client': 'test',
      },
      body: JSON.stringify({
        status: 'suspended',
        reason: 'عدم ارائه مدارک پروانه کسب معتبر و نقض قوانین',
      }),
    });

    expect(suspendRes.status).toBe(200);
    const data = await suspendRes.json();
    expect(data.success).toBe(true);
    expect(data.salon.status).toBe('suspended');

    const auditRes = await fetch(`${baseUrl}/api/admin/audit-logs?search=sal-101`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(auditRes.status).toBe(200);
    const auditData = await auditRes.json();
    expect(auditData.logs.length > 0).toBe(true);
    expect(auditData.logs[0].action).toBe('SALON_STATUS_CHANGE');
  });

  it('Granting super_admin role via standard API route is strictly forbidden (403)', async () => {
    const res = await fetch(`${baseUrl}/api/admin/users/${regUserId}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
        'X-NobatAra-Client': 'test',
      },
      body: JSON.stringify({ role: 'super_admin' }),
    });

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe('SUPER_ADMIN_ASSIGNMENT_FORBIDDEN');
  });

  it('Audit logs endpoint supports filtering by severity and category', async () => {
    const res = await fetch(`${baseUrl}/api/admin/audit-logs?severity=critical&category=business`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.logs)).toBe(true);
  });
});

describe('OTP authentication over HTTP (integration, real server OTP + dev SMS mock)', () => {
  const otpPhone = '09361234567';

  it('POST /api/auth/otp/request issues an OTP via the real server pipeline', async () => {
    getDevMockSmsProvider()?.clear();
    const res = await fetch(`${baseUrl}/api/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-NobatAra-Client': 'test' },
      body: JSON.stringify({ phone: otpPhone, purpose: 'login' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    const sent = getDevMockSmsProvider()?.getLastSentOtp(otpPhone);
    expect(sent).toBeTruthy();
    expect(/^\d{6}$/.test(sent!.code)).toBe(true);
  });

  it('Immediate re-request is rate-limited with 429 (resend cooldown)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-NobatAra-Client': 'test' },
      body: JSON.stringify({ phone: otpPhone, purpose: 'login' }),
    });
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error).toBe('OTP_REQUEST_FAILED');
  });

  it('Invalid OTP code over HTTP is rejected with structured 400 error', async () => {
    const res = await fetch(`${baseUrl}/api/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-NobatAra-Client': 'test' },
      body: JSON.stringify({ phone: otpPhone, code: '000000', purpose: 'login' }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('OTP_VERIFICATION_FAILED');
  });

  it('Correct OTP over HTTP issues an HttpOnly, SameSite session cookie and real session', async () => {
    const sent = getDevMockSmsProvider()?.getLastSentOtp(otpPhone);
    expect(sent).toBeTruthy();

    const res = await fetch(`${baseUrl}/api/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-NobatAra-Client': 'test' },
      body: JSON.stringify({ phone: otpPhone, code: sent!.code, purpose: 'login' }),
    });
    expect(res.status).toBe(200);

    const setCookie = res.headers.get('set-cookie') || '';
    expect(setCookie).toContain('nobatara_session=');
    expect(setCookie.toLowerCase()).toContain('httponly');
    expect(setCookie.toLowerCase()).toContain('samesite=lax');

    const data = await res.json();
    expect(data.user.platformRole).toBe('user');

    // The session cookie actually authenticates subsequent requests
    const cookieValue = setCookie.split(';')[0];
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieValue },
    });
    const me = await meRes.json();
    expect(me.authenticated).toBe(true);
    expect(me.user.platformRole).toBe('user');
  });

  it('Exhausting OTP max attempts over HTTP returns 429', async () => {
    const attemptPhone = '09369998877';
    otpService.clearInMemory();
    await otpService.requestOtp(attemptPhone, 'login', '127.0.0.1');

    let lastRes: Response | null = null;
    for (let i = 0; i < 4; i++) {
      lastRes = await fetch(`${baseUrl}/api/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-NobatAra-Client': 'test' },
        body: JSON.stringify({ phone: attemptPhone, code: '111111', purpose: 'login' }),
      });
    }
    expect(lastRes!.status).toBe(429);
  });
});

describe('Public routes & error contracts over HTTP (integration)', () => {
  it('GET /api/public/salons returns the active salon directory', async () => {
    const res = await fetch(`${baseUrl}/api/public/salons`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.salons)).toBe(true);
    expect(data.salons.length > 0).toBe(true);
    // Public directory must not leak internal fields
    const first = data.salons[0];
    expect(first).not.toHaveProperty('email');
  });

  it('GET /api/public/salons/:unknown returns structured JSON 404 (SALON_NOT_FOUND)', async () => {
    const res = await fetch(`${baseUrl}/api/public/salons/does-not-exist`);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe('SALON_NOT_FOUND');
  });

  it('Unknown /api/* route returns strict JSON 404 (never HTML)', async () => {
    const res = await fetch(`${baseUrl}/api/nonexistent-route`);
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toContain('application/json');
    const data = await res.json();
    expect(data.error.code).toBe('API_ENDPOINT_NOT_FOUND');
  });

  it('POST /api/public/bookings without a session is rejected with 401', async () => {
    const res = await fetch(`${baseUrl}/api/public/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-NobatAra-Client': 'test' },
      body: JSON.stringify({
        salonId: 'sal-101', serviceId: 'srv-101', bookingDate: '2026-11-20',
        bookingTime: '10:00', clientName: 'مهمان', clientPhone: '09120001111',
      }),
    });
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('AUTHENTICATION_REQUIRED');
  });

  it('GET /api/public/bookings/my without a session is rejected with 401', async () => {
    const res = await fetch(`${baseUrl}/api/public/bookings/my`);
    expect(res.status).toBe(401);
  });

  it.fails('SECURITY-R1 (expected failure until fixed): tracking without verified phone must NOT expose the appointment', async () => {
    // The admin-suite test above suspends sal-101 (in-memory state persists for
    // this file); the R1 probe needs an ACTIVE salon to create its booking.
    const { salonRepository } = await import('../../server/repositories/salonRepository.ts');
    await salonRepository.updateStatus('sal-101', 'active');

    // Desired behavior: unauthenticated tracking by tracking code alone must be
    // rejected, because the code space is small (4 digits) and the payload
    // contains customer PII (name, phone, notes). Current code returns the
    // appointment (200). This test is marked `fails` intentionally so the
    // defect stays visible until R1 is fixed; flip to `it()` when fixed.
    const created = await bookingService.createBooking({
      salonId: 'sal-101',
      serviceId: 'srv-101',
      staffId: 'stf-101',
      bookingDate: '2026-11-20',
      bookingTime: '09:00',
      clientName: 'قربانی ریسک R1',
      clientPhone: '09370001122',
      ipAddress: '127.0.0.1',
      userAgent: 'R1Probe',
    });

    const res = await fetch(`${baseUrl}/api/public/bookings/track/${created.trackingCode}`);
    expect(res.status).toBe(403); // ← desired; currently 200, so this test is expected to fail
  });
});

describe('Tenant boundaries over HTTP (integration)', () => {
  it('Authenticated customer without salon membership gets 403 on salon routes', async () => {
    const res = await fetch(`${baseUrl}/api/salon/sal-101/profile`, {
      headers: { Authorization: `Bearer ${regUserToken}` },
    });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe('FORBIDDEN_SALON_ACCESS');
  });

  it('Unauthenticated request to salon routes is rejected with 401', async () => {
    const res = await fetch(`${baseUrl}/api/salon/sal-101/appointments`);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('AUTHENTICATION_REQUIRED');
  });
});
