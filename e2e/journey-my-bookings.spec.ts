/**
 * E2E Journey 3 — Customer OTP login + booking history (v11 UI, real server)
 *
 * Proves the real authentication round trip: storefront drawer → ServerAuthModal
 * → /api/auth/otp/request + /api/auth/otp/verify (purpose=login) → real session
 * cookie → /api/auth/me confirms the session server-side.
 */
import { test, expect } from '@playwright/test';

const CUSTOMER_PHONE = '09364567890';

test('customer can log in via real OTP and their session is verified by the server', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 15000 });

  // Open the customer drawer from the storefront banner
  await page.getByRole('button', { name: 'نوبت‌های من' }).click();

  // Drawer quick login (non-demo posture forwards to the REAL OTP auth modal)
  const phoneInput = page.getByPlaceholder('09121234567');
  await expect(phoneInput).toBeVisible({ timeout: 10000 });
  await phoneInput.fill(CUSTOMER_PHONE);
  await page.getByRole('button', { name: 'ورود', exact: true }).click();

  // REAL OTP login modal (ServerAuthModal → /api/auth/otp/request + /verify)
  const modalPhone = page.getByPlaceholder('09123456789');
  await expect(modalPhone).toBeVisible({ timeout: 10000 });
  await modalPhone.fill(CUSTOMER_PHONE);
  await page.getByRole('button', { name: 'دریافت کد تایید' }).click();

  // Retrieve the REAL OTP issued by the server (dev-only peek route)
  const otpRes = await page.request.get(`/api/dev/otp-peek?phone=${CUSTOMER_PHONE}`);
  expect(otpRes.status()).toBe(200);
  const otpBody = await otpRes.json();
  const code: string = otpBody.otp?.code;
  expect(code).toMatch(/^\d{6}$/);

  await page.getByPlaceholder('123456', { exact: true }).fill(code);
  await page.getByRole('button', { name: 'تایید و ورود به سیستم' }).click();

  // REAL server-backed assertion: the session cookie issued by the OTP verify
  // endpoint authenticates subsequent requests (cookie lives in the browser context).
  const meRes = await page.request.get('/api/auth/me');
  const me = await meRes.json();
  expect(me.authenticated).toBe(true);
  expect(me.user.platformRole).toBe('user');
});
