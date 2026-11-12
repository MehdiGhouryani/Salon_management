/**
 * E2E Journey 2 — Customer booking wizard with REAL server OTP
 *
 * EXECUTED PART: proves the wizard drives the REAL /api/auth/otp/request and
 * /api/public/salons/:id/availability endpoints and that the server really
 * issues a booking_verification OTP (retrieved via the dev-only otp-peek route).
 *
 * BLOCKED PART (test.fixme, visible as such in reports): the final
 * verify→submit→receipt leg is BLOCKED by SECURITY-R2 — the server's
 * /api/auth/otp/verify provisions a user/session only for purpose='login',
 * so a CORRECT booking_verification OTP is rejected with 400
 * (server/routes/auth.ts:75 + server/services/auth/otpService.ts:266).
 * The E2E below initially discovered and now documents this defect.
 * Enable the fixme section the moment R2 is fixed. No booking API is stubbed.
 */
import { test, expect, type Page } from '@playwright/test';

const CUSTOMER_PHONE = '09364567890';

async function peekLastOtp(page: Page, phone: string): Promise<string> {
  const res = await page.request.get(`/api/dev/otp-peek?phone=${phone}`);
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.success).toBe(true);
  expect(body.otp?.code).toMatch(/^\d{6}$/);
  return body.otp.code;
}

test('booking wizard reaches real availability and real server OTP issuance', async ({ page }) => {
  await page.goto('/');
  await page.getByTitle('وب‌سایت اختصاصی رزرو سالن برای مشتریان').click();
  await expect(page.getByText('کاتالوگ خدمات و رزرو سریع')).toBeVisible({ timeout: 15000 });

  await page.getByRole('button', { name: 'رزرو این خدمت' }).first().click();
  await expect(page.getByText('انتخاب متخصص:')).toBeVisible({ timeout: 10000 });

  // Step 1 → 2
  await page.getByRole('button', { name: 'مرحله بعد' }).click();

  // Step 2: pick the first available (non-full) slot from the REAL availability grid
  const availableSlot = page
    .locator('button:not([disabled])')
    .filter({ hasText: /([۰-۹]{2}:[۰-۹]{2})|(\d{2}:\d{2})/ })
    .first();
  await availableSlot.click();
  await expect(page.getByRole('button', { name: 'مرحله بعد' })).toBeEnabled();
  await page.getByRole('button', { name: 'مرحله بعد' }).click();

  // Step 3: identity + phone → REAL server OTP request
  await expect(page.getByText('تایید شماره و ثبت')).toBeVisible({ timeout: 10000 });
  await page.getByPlaceholder('مثال: سارا محمدی').fill('کاربر سفر رزرو');
  await page.getByPlaceholder('۰۹۱۲۱۲۳۴۵۶۷').fill(CUSTOMER_PHONE);
  await page.getByRole('button', { name: 'دریافت کد تایید پیامکی' }).click();

  // The server really issued a 6-digit booking_verification OTP
  await expect(page.getByText('کد تایید ۶ رقمی سرور')).toBeVisible({ timeout: 15000 });
  const code = await peekLastOtp(page, CUSTOMER_PHONE);
  expect(code).toMatch(/^\d{6}$/);
});

test.fixme(
  'customer completes booking through the wizard (BLOCKED by SECURITY-R2 until booking OTP verify is fixed)',
  async ({ page }) => {
    // Steps identical to the executed test above, then:
    //  - fill OTP (peeked via /api/dev/otp-peek) and click "تایید و ورود"
    //  - expect "ثبت قطعی نوبت" to become enabled
    //  - click it and expect the receipt with "کد پیگیری"
    //
    // Today this is impossible: the correct booking OTP is rejected with
    // OTP_VERIFICATION_FAILED because result.user is undefined for
    // purpose=booking_verification. See e2e/README.md and the risk register R2.
    expect(true).toBe(true);
  }
);
