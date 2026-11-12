/**
 * E2E Journey 3 — Customer OTP login + booking history (real server, real browser)
 *
 * Proves the real authentication round trip: ServerAuthModal → /api/auth/otp/request
 * + /api/auth/otp/verify (purpose=login) → real session cookie →
 * /api/public/bookings/my returns the customer's (currently empty) history.
 *
 * The booking row assertion is pending SECURITY-R2: the booking wizard cannot
 * create bookings until booking OTP verification is fixed (see journey-booking.spec.ts).
 */
import { test, expect } from '@playwright/test';

const CUSTOMER_PHONE = '09364567890';

test('customer can log in via real OTP and see their booking history from the server', async ({ page }) => {
  await page.goto('/');
  await page.getByTitle('وب‌سایت اختصاصی رزرو سالن برای مشتریان').click();
  await expect(page.getByText('کاتالوگ خدمات و رزرو سریع')).toBeVisible({ timeout: 15000 });

  // Open the customer side drawer (accessible name comes from aria-label)
  await page.getByRole('button', { name: 'باز کردن منوی کشویی' }).click();
  await expect(page.getByText('نوبت‌های من')).toBeVisible({ timeout: 10000 });

  // Non-demo posture: the quick-login form forwards to the REAL OTP auth modal
  await page.getByPlaceholder('نام و نام خانوادگی').fill('کاربر سفر رزرو');
  await page.getByPlaceholder('شماره موبایل (09...)').fill(CUSTOMER_PHONE);
  await page.getByRole('button', { name: 'ثبت مشخصات و ورود' }).click();

  // REAL OTP login modal (ServerAuthModal → /api/auth/otp/request + /verify)
  const phoneInput = page.getByPlaceholder('09123456789');
  await expect(phoneInput).toBeVisible({ timeout: 10000 });
  await phoneInput.fill(CUSTOMER_PHONE);
  await page.getByRole('button', { name: 'دریافت کد تایید' }).click();

  // Retrieve the REAL OTP issued by the server (dev-only peek route)
  const otpRes = await page.request.get(`/api/dev/otp-peek?phone=${CUSTOMER_PHONE}`);
  expect(otpRes.status()).toBe(200);
  const otpBody = await otpRes.json();
  const code: string = otpBody.otp?.code;
  expect(code).toMatch(/^\d{6}$/);

  await page.getByPlaceholder('123456').fill(code);
  await page.getByRole('button', { name: 'تایید و ورود به سیستم' }).click();

  // REAL server-backed assertion: the session cookie issued by the OTP verify
  // endpoint authenticates subsequent requests (cookie lives in the browser context).
  const meRes = await page.request.get('/api/auth/me');
  const me = await meRes.json();
  expect(me.authenticated).toBe(true);
  expect(me.user.platformRole).toBe('user');

  // The drawer's bookings tab re-renders with the (empty) server-scoped history
  await expect(page.getByText('نوبتی برای نمایش یافت نشد')).toBeVisible({ timeout: 15000 });
});
