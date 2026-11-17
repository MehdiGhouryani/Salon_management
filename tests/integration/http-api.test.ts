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
import { clearRateLimitBuckets } from '../../server/middleware/rateLimit.ts';
import { bookingGrantService } from '../../server/services/auth/bookingGrantService.ts';
import { salonRepository } from '../../server/repositories/salonRepository.ts';
import { appointmentRepository } from '../../server/repositories/appointmentRepository.ts';
import { staffRepository } from '../../server/repositories/staffRepository.ts';

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
  await userRepository.addMembership(regUser.id, 'sal-101', 'owner', []);
  adminToken = adminSession.rawToken;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('Authenticated account session management over HTTP', () => {
  it('lists only the signed-in account sessions and revokes one of its own sessions', async () => {
    const admin = await userRepository.findByPhone('09120000000');
    expect(admin).toBeTruthy();

    const extraSession = await sessionService.createSession(admin!, mockReq, mockRes, 'mobile');
    const listResponse = await fetch(`${baseUrl}/api/auth/sessions`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(listResponse.status).toBe(200);
    const listData = await listResponse.json();
    expect(listData.success).toBe(true);
    expect(listData.sessions.some((session: any) => session.id === extraSession.sessionId)).toBe(true);
    expect(listData.sessions.every((session: any) => typeof session.isCurrent === 'boolean')).toBe(true);

    const regularSession = await sessionService.validateSession(regUserToken);
    expect(regularSession.session).toBeTruthy();
    expect(listData.sessions.some((session: any) => session.id === regularSession.session!.id)).toBe(false);

    const revokeResponse = await fetch(`${baseUrl}/api/auth/sessions/${extraSession.sessionId}/revoke`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'X-NobatAra-Client': 'integration-test',
      },
    });
    expect(revokeResponse.status).toBe(200);
    expect((await revokeResponse.json()).success).toBe(true);

    const afterResponse = await fetch(`${baseUrl}/api/auth/sessions`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const afterData = await afterResponse.json();
    expect(afterData.sessions.some((session: any) => session.id === extraSession.sessionId)).toBe(false);
  });

  it('revokes other devices while preserving the current authenticated session', async () => {
    const admin = await userRepository.findByPhone('09120000000');
    expect(admin).toBeTruthy();

    const extraSession = await sessionService.createSession(admin!, mockReq, mockRes, 'api');
    const response = await fetch(`${baseUrl}/api/auth/sessions/revoke-others`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'X-NobatAra-Client': 'integration-test',
      },
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.revokedCount).toBeGreaterThanOrEqual(1);

    const afterResponse = await fetch(`${baseUrl}/api/auth/sessions`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const afterData = await afterResponse.json();
    expect(afterData.sessions.length).toBe(1);
    expect(afterData.sessions[0].isCurrent).toBe(true);
    expect(afterData.sessions[0].id).not.toBe(extraSession.sessionId);
  });
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

  it('Salons list carries REAL aggregates: current-month revenue, appointment count, active staff (Phase 18)', async () => {
    // Dedicated fixture salon so seeded rows never influence the assertions.
    const salonId = 't18-agg-salon';
    await salonRepository.create({
      id: salonId,
      slug: 't18-agg-salon',
      name: 'سالن تست تجمیع داده',
      ownerName: 'مالک تجمیع',
      phone: '09361818181',
      province: 'تهران',
      city: 'تهران',
      address: 'تهران، محل تست تجمیع',
      status: 'active',
      planExpiry: new Date('2027-01-01'),
    }).catch(() => {});

    // Two paid appointments inside the CURRENT Asia/Tehran month:
    // one confirmed + one completed → both count toward monthly revenue.
    const tehranToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' }).format(new Date());
    const monthStart = `${tehranToday.slice(0, 7)}-01`;
    const [y, m] = monthStart.split('-').map(Number);
    const monthEnd = new Date(Date.UTC(y, m, 0, 12)).toISOString().slice(0, 10);

    await appointmentRepository.create({
      id: 't18-appt-confirmed',
      trackingCode: 'GIS-T18C1',
      salonId,
      serviceId: 'srv-t18',
      staffId: 'stf-t18-active',
      clientName: 'مشتری تجمیع ۱',
      clientPhone: '09361818182',
      bookingDate: monthEnd,
      bookingTime: '11:00',
      price: 500000,
      status: 'confirmed',
    });
    await appointmentRepository.create({
      id: 't18-appt-completed',
      trackingCode: 'GIS-T18C2',
      salonId,
      serviceId: 'srv-t18',
      staffId: 'stf-t18-active',
      clientName: 'مشتری تجمیع ۲',
      clientPhone: '09361818183',
      bookingDate: monthStart,
      bookingTime: '12:00',
      price: 300000,
      status: 'completed',
    });
    // A cancelled appointment adds to the total count but NOT to revenue.
    await appointmentRepository.create({
      id: 't18-appt-cancelled',
      trackingCode: 'GIS-T18C3',
      salonId,
      serviceId: 'srv-t18',
      staffId: 'stf-t18-active',
      clientName: 'مشتری تجمیع ۳',
      clientPhone: '09361818184',
      bookingDate: monthEnd,
      bookingTime: '13:00',
      price: 999999,
      status: 'cancelled',
    });

    await staffRepository.create({ id: 'stf-t18-active', salonId, name: 'پرسنل فعال', role: 'متخصص', isActive: true });
    await staffRepository.create({ id: 'stf-t18-inactive', salonId, name: 'پرسنل غیرفعال', role: 'متخصص', isActive: false });

    const res = await fetch(`${baseUrl}/api/admin/salons?search=${encodeURIComponent('سالن تست تجمیع داده')}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    const salon = (data.salons || []).find((s: any) => s.id === salonId);
    expect(salon).toBeTruthy();
    expect(salon.monthlyRevenue).toBe(800000); // 500000 confirmed + 300000 completed
    expect(salon.totalAppointments).toBe(3); // includes the cancelled row
    expect(salon.activeStaffCount).toBe(1); // inactive staff excluded
  });

  it('Salons list reports honest zeros for a salon with no activity (Phase 18)', async () => {
    const salonId = 't18-empty-salon';
    await salonRepository.create({
      id: salonId,
      slug: 't18-empty-salon',
      name: 'سالن بدون فعالیت',
      ownerName: 'مالک بدون نوبت',
      phone: '09361818185',
      province: 'تهران',
      city: 'تهران',
      address: 'تهران، محل تست خالی',
      status: 'active',
      planExpiry: new Date('2027-01-01'),
    }).catch(() => {});

    const res = await fetch(`${baseUrl}/api/admin/salons?search=${encodeURIComponent('بدون فعالیت')}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    const salon = (data.salons || []).find((s: any) => s.id === salonId);
    expect(salon).toBeTruthy();
    expect(salon.monthlyRevenue).toBe(0);
    expect(salon.totalAppointments).toBe(0);
    expect(salon.activeStaffCount).toBe(0);
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

  it('SECURITY-R1 (fixed): anonymous code-only tracking returns operational status WITHOUT customer PII', async () => {
    // The admin-suite test above suspends sal-101 (in-memory state persists for
    // this file); the R1 probes need an ACTIVE salon.
    const { salonRepository } = await import('../../server/repositories/salonRepository.ts');
    await salonRepository.updateStatus('sal-101', 'active');

    const created = await bookingService.createBooking({
      salonId: 'sal-101',
      serviceId: 'srv-101',
      staffId: 'stf-101',
      bookingDate: '2026-11-21',
      bookingTime: '09:30',
      clientName: 'قربانی ریسک R1',
      clientPhone: '09370001122',
      ipAddress: '127.0.0.1',
      userAgent: 'R1Probe',
    });

    const res = await fetch(`${baseUrl}/api/public/bookings/track/${created.trackingCode}`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    // Operational subset is present
    expect(data.appointment.status).toBe('confirmed');
    expect(data.appointment.trackingCode).toBe(created.trackingCode);
    // Customer PII must be absent for code-only lookups
    expect(data.appointment).not.toHaveProperty('clientName');
    expect(data.appointment).not.toHaveProperty('clientPhone');
    expect(data.appointment).not.toHaveProperty('notes');
  });

  it('SECURITY-R1 (fixed): matching phone unlocks full PII; mismatch is rejected; invalid phone rejected', async () => {
    const created = await bookingService.createBooking({
      salonId: 'sal-101',
      serviceId: 'srv-101',
      staffId: 'stf-101',
      bookingDate: '2026-11-21',
      bookingTime: '12:30',
      clientName: 'مالک نوبت',
      clientPhone: '09370001233',
      ipAddress: '127.0.0.1',
      userAgent: 'R1Probe2',
    });

    // Matching phone → full data
    const ok = await fetch(`${baseUrl}/api/public/bookings/track/${created.trackingCode}?phone=09370001233`);
    expect(ok.status).toBe(200);
    const okData = await ok.json();
    expect(okData.appointment.clientName).toBe('مالک نوبت');
    expect(okData.appointment.clientPhone).toBe('09370001233');

    // Wrong-but-valid phone → 403
    const wrong = await fetch(`${baseUrl}/api/public/bookings/track/${created.trackingCode}?phone=09370001299`);
    expect(wrong.status).toBe(403);
    expect((await wrong.json()).error).toBe('PHONE_MISMATCH');

    // Malformed phone → 400 (the old code silently skipped the check)
    const bad = await fetch(`${baseUrl}/api/public/bookings/track/${created.trackingCode}?phone=abc`);
    expect(bad.status).toBe(400);
    expect((await bad.json()).error).toBe('INVALID_PHONE');
  });

  it('SECURITY-R1 (fixed): tracking codes are high-entropy (6-digit suffix, not 4)', async () => {
    const created = await bookingService.createBooking({
      salonId: 'sal-101',
      serviceId: 'srv-101',
      staffId: 'stf-101',
      bookingDate: '2026-11-21',
      bookingTime: '15:30',
      clientName: 'آنتریپ کد',
      clientPhone: '09370001344',
      ipAddress: '127.0.0.1',
      userAgent: 'EntropyProbe',
    });
    // GIS-XXXXXX (6 digits) — the old 4-digit space had only 9,000 codes/salon
    expect(created.trackingCode).toMatch(/^GIS-\d{6}$/);
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

describe('Super admin self-protection (Phase 07, integration)', () => {
  it('an administrator cannot suspend their own account', async () => {
    const { userRepository } = await import('../../server/repositories/userRepository.ts');
    const admin = await userRepository.findByPhone('09120000000');
    expect(admin).toBeTruthy();

    const res = await fetch(`${baseUrl}/api/admin/users/${admin!.id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
        'X-NobatAra-Client': 'test',
      },
      body: JSON.stringify({ status: 'suspended', reason: 'تست حفاظت از مدیر ارشد' }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('SELF_SUSPENSION_FORBIDDEN');
  });

  it('an administrator cannot change their own role', async () => {
    const { userRepository } = await import('../../server/repositories/userRepository.ts');
    const admin = await userRepository.findByPhone('09120000000');

    const res = await fetch(`${baseUrl}/api/admin/users/${admin!.id}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
        'X-NobatAra-Client': 'test',
      },
      body: JSON.stringify({ role: 'user' }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('SELF_ROLE_CHANGE_FORBIDDEN');
  });

  it('rate limiting on OTP verification is enforced server-side (429 after the window cap)', async () => {
    clearRateLimitBuckets();
    // Hammer the verify endpoint beyond the 12-per-10-minute IP cap; the
    // per-challenge attempt cap returns 400s first, but the middleware must
    // eventually return a structured 429 RATE_LIMITED.
    let sawRateLimit = false;
    for (let i = 0; i < 20; i++) {
      const res = await fetch(`${baseUrl}/api/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-NobatAra-Client': 'test' },
        body: JSON.stringify({ phone: '09365550000', code: '000000', purpose: 'login' }),
      });
      if (res.status === 429) {
        const data = await res.json();
        expect(data.error).toBe('OTP_VERIFY_RATE_LIMIT');
        sawRateLimit = true;
        break;
      }
      expect([400, 429]).toContain(res.status);
    }
    expect(sawRateLimit).toBe(true);
  });
});

describe('Guest booking grant flow (Phase 08, integration)', () => {
  // Each test uses its own phone: the real resend-cooldown and per-IP request
  // limits would (correctly) 429 repeated OTP requests for the same identity.
  const GUEST_PHONE = '09362223344';
  const GUEST_BOOKING = {
    salonId: 'sal-101',
    serviceId: 'srv-104',
    staffId: 'stf-102',
    bookingDate: '2026-11-21',
    bookingTime: '14:00',
    clientName: 'مشتری مهمان',
    clientPhone: GUEST_PHONE,
  };

  beforeAll(async () => {
    // Isolate this describe from OTP request budgets consumed by earlier tests
    clearRateLimitBuckets();
    const { otpService } = await import('../../server/services/auth/otpService.ts');
    otpService.clearInMemory();
  });

  let grantProbeIpCounter = 0;
  async function issueGuestGrantViaHttp(phone: string = GUEST_PHONE): Promise<string> {
    // OTP request happens in-process with a fresh probe IP per call so the
    // REAL 5-per-10-minute per-phone/IP service limit (which this suite would
    // otherwise trip with its many OTP requests) stays honest. Verification
    // and grant issuance still run over real HTTP.
    const { otpService } = await import('../../server/services/auth/otpService.ts');
    grantProbeIpCounter += 1;
    const otpRes = await otpService.requestOtp(phone, 'booking_verification', `10.9.9.${grantProbeIpCounter}`);
    expect(otpRes.success).toBe(true);
    const sent = getDevMockSmsProvider()?.getLastSentOtp(phone);
    expect(sent).toBeTruthy();

    const verifyRes = await fetch(`${baseUrl}/api/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-NobatAra-Client': 'test' },
      body: JSON.stringify({ phone, code: sent!.code, purpose: 'booking_verification' }),
    });
    expect(verifyRes.status).toBe(200);
    const data = await verifyRes.json();
    expect(data.bookingGrant).toMatch(/^[0-9a-f]{64}$/);
    expect(data.success).toBe(true);
    // CRITICAL: a booking grant must never create a login session
    expect(verifyRes.headers.get('set-cookie')).toBeNull();
    return data.bookingGrant as string;
  }

  it('successful guest verification issues a single-use grant WITHOUT a login session', async () => {
    await issueGuestGrantViaHttp();
  });

  it('guest booking with a valid grant succeeds; the grant is then reusable-proof', async () => {
    const guestPhone = '09362223355';
    const grant = await issueGuestGrantViaHttp(guestPhone);

    const res = await fetch(`${baseUrl}/api/public/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-NobatAra-Client': 'test',
        'X-NobatAra-Booking-Grant': grant,
      },
      body: JSON.stringify({ ...GUEST_BOOKING, clientPhone: guestPhone }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.trackingCode).toMatch(/^GIS-\d{6}$/);

    // The same grant can never authorize a second booking
    const reuse = await fetch(`${baseUrl}/api/public/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-NobatAra-Client': 'test',
        'X-NobatAra-Booking-Grant': grant,
      },
      body: JSON.stringify({ ...GUEST_BOOKING, clientPhone: guestPhone, bookingTime: '15:00' }),
    });
    expect(reuse.status).toBe(401);
    expect((await reuse.json()).error).toBe('BOOKING_GRANT_ALREADY_USED');
  });

  it('an expired grant is rejected with BOOKING_GRANT_EXPIRED', async () => {
    const { token } = await bookingGrantService.issueGrant(GUEST_PHONE, -1000);
    const res = await fetch(`${baseUrl}/api/public/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-NobatAra-Client': 'test',
        'X-NobatAra-Booking-Grant': token,
      },
      body: JSON.stringify(GUEST_BOOKING),
    });
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('BOOKING_GRANT_EXPIRED');
  });

  it('a grant cannot be transferred to a different phone (GRANT_PHONE_MISMATCH)', async () => {
    const grant = await issueGuestGrantViaHttp('09362223366');
    const res = await fetch(`${baseUrl}/api/public/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-NobatAra-Client': 'test',
        'X-NobatAra-Booking-Grant': grant,
      },
      body: JSON.stringify({ ...GUEST_BOOKING, clientPhone: '09368887766', clientName: 'سارق مجوز' }),
    });
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe('GRANT_PHONE_MISMATCH');
  });

  it('an unknown grant token is rejected (BOOKING_GRANT_INVALID)', async () => {
    const res = await fetch(`${baseUrl}/api/public/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-NobatAra-Client': 'test',
        'X-NobatAra-Booking-Grant': 'f'.repeat(64),
      },
      body: JSON.stringify(GUEST_BOOKING),
    });
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('BOOKING_GRANT_INVALID');
  });

  it('invalid OTP for booking purpose is rejected (no grant issued)', async () => {
    const otpRes = await fetch(`${baseUrl}/api/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-NobatAra-Client': 'test' },
      body: JSON.stringify({ phone: '09363334455', purpose: 'booking_verification' }),
    });
    expect(otpRes.status).toBe(200);

    const verifyRes = await fetch(`${baseUrl}/api/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-NobatAra-Client': 'test' },
      body: JSON.stringify({ phone: '09363334455', code: '000000', purpose: 'booking_verification' }),
    });
    expect(verifyRes.status).toBe(400);
    const data = await verifyRes.json();
    expect(data.error).toBe('OTP_VERIFICATION_FAILED');
    expect(data.bookingGrant).toBeUndefined();
  });

  it('a booking OTP cannot be replayed (single verification)', async () => {
    const otpRes = await fetch(`${baseUrl}/api/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-NobatAra-Client': 'test' },
      body: JSON.stringify({ phone: '09364445566', purpose: 'booking_verification' }),
    });
    expect(otpRes.status).toBe(200);
    const sent = getDevMockSmsProvider()?.getLastSentOtp('09364445566');

    const first = await fetch(`${baseUrl}/api/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-NobatAra-Client': 'test' },
      body: JSON.stringify({ phone: '09364445566', code: sent!.code, purpose: 'booking_verification' }),
    });
    expect(first.status).toBe(200);

    const replay = await fetch(`${baseUrl}/api/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-NobatAra-Client': 'test' },
      body: JSON.stringify({ phone: '09364445566', code: sent!.code, purpose: 'booking_verification' }),
    });
    expect(replay.status).toBe(400);
    expect((await replay.json()).message).toContain('قبلا استفاده شده');
  });

  it('a LOGIN OTP never becomes a booking grant (purpose separation)', async () => {
    const otpRes = await fetch(`${baseUrl}/api/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-NobatAra-Client': 'test' },
      body: JSON.stringify({ phone: '09365556677', purpose: 'login' }),
    });
    expect(otpRes.status).toBe(200);
    const sent = getDevMockSmsProvider()?.getLastSentOtp('09365556677');

    const verifyRes = await fetch(`${baseUrl}/api/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-NobatAra-Client': 'test' },
      body: JSON.stringify({ phone: '09365556677', code: sent!.code, purpose: 'login' }),
    });
    expect(verifyRes.status).toBe(200);
    const data = await verifyRes.json();
    // Login issues a session, never a booking grant
    expect(data.bookingGrant).toBeUndefined();
    expect(verifyRes.headers.get('set-cookie')).toContain('nobatara_session=');
  });

  it('concurrent submissions with one grant: exactly one booking wins', async () => {
    const grant = await issueGuestGrantViaHttp('09362223377');

    const results = await Promise.allSettled([
      fetch(`${baseUrl}/api/public/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-NobatAra-Client': 'test',
          'X-NobatAra-Booking-Grant': grant,
        },
        body: JSON.stringify({ ...GUEST_BOOKING, clientPhone: '09362223377', bookingTime: '16:00' }),
      }),
      fetch(`${baseUrl}/api/public/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-NobatAra-Client': 'test',
          'X-NobatAra-Booking-Grant': grant,
        },
        body: JSON.stringify({ ...GUEST_BOOKING, clientPhone: '09362223377', bookingTime: '16:00' }),
      }),
    ]);

    const outcomes = await Promise.all(
      results.map(async (r) => {
        if (r.status === 'fulfilled') {
          return { status: r.value.status, code: (await r.value.json()).error as string | undefined };
        }
        return { status: (r as PromiseRejectedResult).reason?.statusCode ?? 0, code: (r as PromiseRejectedResult).reason?.code };
      })
    );
    const successes = outcomes.filter((o) => o.status === 201);
    const grantRejections = outcomes.filter((o) => o.status === 401 && o.code === 'BOOKING_GRANT_ALREADY_USED');
    expect(successes.length).toBe(1);
    expect(grantRejections.length).toBe(1);
  });
});

describe('Booking policy via HTTP (Phase 09)', () => {
  it('rejects past dates with PAST_DATE_NOT_ALLOWED', async () => {
    const phone = '09367778899';
    const { token } = await bookingGrantService.issueGrant(phone);
    const res = await fetch(`${baseUrl}/api/public/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-NobatAra-Client': 'test',
        'X-NobatAra-Booking-Grant': token,
      },
      body: JSON.stringify({
        salonId: 'sal-101', serviceId: 'srv-101', staffId: 'stf-101',
        bookingDate: '2026-11-12', bookingTime: '10:00',
        clientName: 'تست گذشته', clientPhone: phone,
      }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('PAST_DATE_NOT_ALLOWED');
  });

  it('rejects staff-service pairs that are not assigned (STAFF_NOT_ELIGIBLE_FOR_SERVICE)', async () => {
    const phone = '09367778811';
    const { token } = await bookingGrantService.issueGrant(phone);
    const res = await fetch(`${baseUrl}/api/public/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-NobatAra-Client': 'test',
        'X-NobatAra-Booking-Grant': token,
      },
      body: JSON.stringify({
        salonId: 'sal-101', serviceId: 'srv-101', staffId: 'stf-102',
        bookingDate: '2026-11-28', bookingTime: '10:00',
        clientName: 'تست صلاحیت', clientPhone: phone,
      }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('STAFF_NOT_ELIGIBLE_FOR_SERVICE');
  });

  it('completed appointments cannot be cancelled by the customer', async () => {
    const { bookingService } = await import('../../server/services/booking/bookingService.ts');
    const { appointmentRepository } = await import('../../server/repositories/appointmentRepository.ts');

    const created = await bookingService.createBooking({
      salonId: 'sal-101', serviceId: 'srv-101', staffId: 'stf-101',
      bookingDate: '2026-11-28', bookingTime: '17:00',
      clientName: 'نوبت تکمیل‌شده', clientPhone: '09367778822',
      ipAddress: '127.0.0.1', userAgent: 'policy-probe',
    });
    await appointmentRepository.updateStatus(created.appointment.id, 'completed', 'سالن', 'تسویه');

    await expect(
      bookingService.cancelBooking(created.trackingCode, '09367778822', 'لغو پس از تکمیل')
    ).rejects.toMatchObject({ statusCode: 409, code: 'APPOINTMENT_NOT_CANCELLABLE' });
  });
});

describe('Phase 19 security: dev/test reset endpoints (flag ON in this suite via vitest env)', () => {
  const ALLOWLIST = [
    '09361000005',
    '09361000020',
    '09364567890',
    '09364567891',
    '09364567892',
    '09362000001',
    '09362000077',
  ];
  const CUSTOMER_PHONE = '09365550001'; // real-customer-shaped, NOT allowlisted

  it('server-side allowlist exists and matches the E2E helper list exactly (drift guard)', async () => {
    const { E2E_TEST_PHONE_ALLOWLIST } = await import('../../server/routes/dev.ts');
    expect([...E2E_TEST_PHONE_ALLOWLIST]).toEqual(ALLOWLIST);
  });

  it('allowlisted phone: reset deletes the OTP challenge (cooldown gone) — 200', async () => {
    const allowlisted = ALLOWLIST[4]; // 09364567892
    await clearRateLimitBuckets();

    const first = await fetch(`${baseUrl}/api/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-NobatAra-Client': 'test' },
      body: JSON.stringify({ phone: allowlisted, purpose: 'login' }),
    });
    expect(first.status).toBe(200);

    // Immediate re-request hits the 60s resend cooldown — proves the challenge exists.
    const cooldown = await fetch(`${baseUrl}/api/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-NobatAra-Client': 'test' },
      body: JSON.stringify({ phone: allowlisted, purpose: 'login' }),
    });
    expect(cooldown.status).toBe(429);

    const reset = await fetch(`${baseUrl}/api/dev/reset-rate-limiters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-NobatAra-Client': 'test' },
      body: JSON.stringify({ phones: ALLOWLIST }),
    });
    expect(reset.status).toBe(200);
    const resetBody = await reset.json();
    expect(resetBody.success).toBe(true);
    expect(resetBody.otpChallengesDeleted).toBeGreaterThanOrEqual(1);

    // After the reset the cooldown is gone: the re-request succeeds again.
    const after = await fetch(`${baseUrl}/api/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-NobatAra-Client': 'test' },
      body: JSON.stringify({ phone: allowlisted, purpose: 'login' }),
    });
    expect(after.status).toBe(200);
  });

  it('NON-allowlisted phone: reset is REJECTED with 400 and the OTP challenge SURVIVES', async () => {
    await clearRateLimitBuckets();

    const first = await fetch(`${baseUrl}/api/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-NobatAra-Client': 'test' },
      body: JSON.stringify({ phone: CUSTOMER_PHONE, purpose: 'login' }),
    });
    expect(first.status).toBe(200);

    const reset = await fetch(`${baseUrl}/api/dev/reset-rate-limiters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-NobatAra-Client': 'test' },
      body: JSON.stringify({ phones: [CUSTOMER_PHONE] }),
    });
    expect(reset.status).toBe(400);
    const resetBody = await reset.json();
    expect(resetBody.error).toBe('TEST_PHONE_NOT_ALLOWLISTED');
    expect(resetBody.rejectedCount).toBe(1);

    // The real-customer-shaped challenge was NOT deleted: the resend cooldown
    // still applies (this is exactly the production protection that must hold).
    const cooldown = await fetch(`${baseUrl}/api/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-NobatAra-Client': 'test' },
      body: JSON.stringify({ phone: CUSTOMER_PHONE, purpose: 'login' }),
    });
    expect(cooldown.status).toBe(429);
  });

  it('mixed list (one allowlisted + one unknown): fail-closed — nothing is deleted', async () => {
    await clearRateLimitBuckets();

    const first = await fetch(`${baseUrl}/api/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-NobatAra-Client': 'test' },
      body: JSON.stringify({ phone: ALLOWLIST[2], purpose: 'login' }),
    });
    expect(first.status).toBe(200);

    const reset = await fetch(`${baseUrl}/api/dev/reset-rate-limiters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-NobatAra-Client': 'test' },
      body: JSON.stringify({ phones: [ALLOWLIST[2], '09365550099'] }),
    });
    expect(reset.status).toBe(400);
    expect((await reset.json()).error).toBe('TEST_PHONE_NOT_ALLOWLISTED');

    // The allowlisted phone's challenge also survived the rejected request.
    const cooldown = await fetch(`${baseUrl}/api/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-NobatAra-Client': 'test' },
      body: JSON.stringify({ phone: ALLOWLIST[2], purpose: 'login' }),
    });
    expect(cooldown.status).toBe(429);
  });

  it('allowlisted phone: reset-e2e-bookings deletes ONLY that phone\u2019s appointments', async () => {
    await clearRateLimitBuckets();
    await appointmentRepository.create({
      id: 't19-e2e-book-allow',
      trackingCode: 'GIS-T19A1',
      salonId: 'sal-101',
      serviceId: 'srv-101',
      staffId: 'stf-101',
      clientName: 'دارنده مجوز آزمایشی',
      clientPhone: '09364567891',
      bookingDate: '2026-12-01',
      bookingTime: '09:00',
      price: 100000,
      status: 'confirmed',
    });

    const reset = await fetch(`${baseUrl}/api/dev/reset-e2e-bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-NobatAra-Client': 'test' },
      body: JSON.stringify({ phones: ALLOWLIST }),
    });
    expect(reset.status).toBe(200);
    const body = await reset.json();
    expect(body.success).toBe(true);
    expect(body.appointmentsDeleted).toBeGreaterThanOrEqual(1);

    const gone = await appointmentRepository.findById('t19-e2e-book-allow');
    expect(gone).toBeNull();
  });

  it('NON-allowlisted phone: reset-e2e-bookings is rejected with 400 and the booking SURVIVES', async () => {
    await clearRateLimitBuckets();
    await appointmentRepository.create({
      id: 't19-e2e-book-customer',
      trackingCode: 'GIS-T19C1',
      salonId: 'sal-101',
      serviceId: 'srv-101',
      staffId: 'stf-101',
      clientName: 'مشتری واقعی‌نما',
      clientPhone: CUSTOMER_PHONE,
      bookingDate: '2026-12-01',
      bookingTime: '10:00',
      price: 100000,
      status: 'confirmed',
    });

    const reset = await fetch(`${baseUrl}/api/dev/reset-e2e-bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-NobatAra-Client': 'test' },
      body: JSON.stringify({ phones: [CUSTOMER_PHONE] }),
    });
    expect(reset.status).toBe(400);
    expect((await reset.json()).error).toBe('TEST_PHONE_NOT_ALLOWLISTED');

    const stillThere = await appointmentRepository.findById('t19-e2e-book-customer');
    expect(stillThere).toBeTruthy();
    expect(stillThere?.client_phone).toBe(CUSTOMER_PHONE);
  });
});


describe('Persistent support ticket API over HTTP', () => {
  it('lets a salon owner open a ticket, the super admin reply, and the salon continue the conversation', async () => {
    const create = await fetch(`${baseUrl}/api/salon/sal-101/support/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${regUserToken}`,
        'X-NobatAra-Client': 'integration-test',
      },
      body: JSON.stringify({
        subject: 'مشکل اتصال پیامک',
        category: 'sms',
        priority: 'high',
        message: 'پیامک‌های تایید برای مشتریان ارسال نمی‌شوند.',
      }),
    });

    expect(create.status).toBe(201);
    const created = await create.json();
    expect(created.ticket.ticketNumber).toMatch(/^SUP-/);
    expect(created.ticket.messages).toHaveLength(1);
    const ticketId = created.ticket.id;

    const adminList = await fetch(`${baseUrl}/api/admin/support/tickets?status=open&priority=high`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(adminList.status).toBe(200);
    const list = await adminList.json();
    expect(list.tickets.some((ticket: any) => ticket.id === ticketId)).toBe(true);

    const reply = await fetch(`${baseUrl}/api/admin/support/tickets/${ticketId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
        'X-NobatAra-Client': 'integration-test',
      },
      body: JSON.stringify({ content: 'درخواست دریافت شد و در حال بررسی است.' }),
    });
    expect(reply.status).toBe(201);

    const salonReply = await fetch(`${baseUrl}/api/salon/sal-101/support/tickets/${ticketId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${regUserToken}`,
        'X-NobatAra-Client': 'integration-test',
      },
      body: JSON.stringify({ content: 'ممنون، منتظر نتیجه می‌مانیم.' }),
    });
    expect(salonReply.status).toBe(201);

    const status = await fetch(`${baseUrl}/api/admin/support/tickets/${ticketId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
        'X-NobatAra-Client': 'integration-test',
      },
      body: JSON.stringify({ status: 'resolved' }),
    });
    expect(status.status).toBe(200);
    expect((await status.json()).ticket.status).toBe('resolved');

    const ownList = await fetch(`${baseUrl}/api/salon/sal-101/support/tickets`, {
      headers: { Authorization: `Bearer ${regUserToken}` },
    });
    expect(ownList.status).toBe(200);
    const ownData = await ownList.json();
    const ownTicket = ownData.tickets.find((ticket: any) => ticket.id === ticketId);
    expect(ownTicket).toBeTruthy();
    expect(ownTicket.messages).toHaveLength(3);
  });

  it('rejects invalid ticket data and prevents access from a different salon tenant', async () => {
    const invalid = await fetch(`${baseUrl}/api/salon/sal-101/support/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${regUserToken}`,
        'X-NobatAra-Client': 'integration-test',
      },
      body: JSON.stringify({ subject: 'no', category: 'unknown', message: 'bad', priority: 'critical' }),
    });
    expect(invalid.status).toBe(400);

    const crossTenant = await fetch(`${baseUrl}/api/salon/sal-102/support/tickets`, {
      headers: { Authorization: `Bearer ${regUserToken}` },
    });
    expect(crossTenant.status).toBe(403);
  });
});
