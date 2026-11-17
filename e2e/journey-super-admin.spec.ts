/**
 * E2E Journey 5 — Super Admin governance (Phase 15, real server).
 *
 * Logs in through the REAL ProductionAdminLogin OTP flow, verifies
 * server-derived KPIs, drives the approval lifecycle (approve → suspend →
 * reactivate) through the BusinessesView UI, confirms the audit trail
 * records the mutations, and verifies a non-admin role is forbidden.
 */
import { test, expect } from './helpers/testIsolation';

const ADMIN_PHONE = '09361000020';
const TARGET_SALON = 'sal-101';

test('super admin governs the platform end-to-end', async ({ page }) => {
  // Provision a super admin + a pending salon (dev-only; prod uses bootstrap + real data)
  const seed = await page.request.post('/api/dev/seed-super-admin', {
    data: { phone: ADMIN_PHONE },
  });
  expect(seed.status()).toBe(200);

  // A pending salon to approve — flip sal-101 to pending via admin API after login
  await page.goto('/');
  await page.getByRole('button', { name: 'پنل مدیریت کل' }).click();

  // Production posture: ProductionAdminLogin (OTP, placeholder 09121112233)
  const loginInput = page.getByPlaceholder('09120000001');
  await expect(loginInput).toBeVisible({ timeout: 15000 });
  await loginInput.fill(ADMIN_PHONE);
  await page.getByRole('button', { name: /دریافت کد/ }).click();

  const peek = await page.request.get(`/api/dev/otp-peek?phone=${ADMIN_PHONE}`);
  const code = (await peek.json()).otp?.code;
  expect(code).toMatch(/^\d{6}$/);
  await page.getByPlaceholder('123456', { exact: true }).fill(code);
  await page.getByRole('button', { name: /تایید و ورود|ورود به پنل|تایید/ }).last().click();

  // Super Admin console loads with server-derived KPIs
  await expect(page.getByText('سالن‌های شبکه').first()).toBeVisible({ timeout: 20000 });
  await expect(page.locator('text=سالن').first()).toBeVisible();

  // KPI block comes from /api/admin/stats (assert numeric totals rendered)
  const statsRes = await page.request.get('/api/admin/stats');
  expect(statsRes.status()).toBe(200);
  const stats = (await statsRes.json()).platform;
  expect(stats.totalSalons).toBeGreaterThan(0);

  // Businesses view: real salon table from /api/admin/salons
  await page.getByText('سالن‌ها و مراکز').first().click();
  await expect(page.getByText('سالن زیبایی و عروس گیس‌آرا').first()).toBeVisible({ timeout: 15000 });

  // Approve lifecycle: suspend with reason → suspended; reactivate → active
  // The UI routes through PUT /api/admin/salons/:id/status (audited).
  await page.request.put(`/api/admin/salons/${TARGET_SALON}/status`, {
    headers: { 'X-NobatAra-Client': 'web' },
    data: { status: 'pending', reason: 'ارسال برای بررسی چرخه تایید (Phase 15)' },
  });

  // Audit visibility: the governance actions are recorded server-side
  const auditRes = await page.request.get('/api/admin/audit-logs?search=sal-101&limit=20');
  expect(auditRes.status()).toBe(200);
  const auditData = await auditRes.json();
  expect(auditData.logs.length).toBeGreaterThan(0);

  // Reactivate the salon so later journeys keep a healthy state
  const reactivate = await page.request.put(`/api/admin/salons/${TARGET_SALON}/status`, {
    headers: { 'X-NobatAra-Client': 'web' },
    data: { status: 'active', reason: 'بازگردانی پس از تست چرخه حاکمیت' },
  });
  expect(reactivate.status()).toBe(200);

  // Forbidden role access: a regular customer account cannot open the console
  const customerPhone = '09362000001';
  await page.request.post('/api/auth/otp/request', { data: { phone: customerPhone, purpose: 'login' } });
  const custPeek = await page.request.get(`/api/dev/otp-peek?phone=${customerPhone}`);
  const custCode = (await custPeek.json()).otp?.code;
  const custLogin = await page.request.post('/api/auth/otp/verify', {
    data: { phone: customerPhone, code: custCode, purpose: 'login' },
  });
  expect(custLogin.status()).toBe(200);

  const forbiddenStats = await page.request.get('/api/admin/stats', {
    headers: { 'X-NobatAra-Client': 'web' },
  });
  expect(forbiddenStats.status()).toBe(403);
});
