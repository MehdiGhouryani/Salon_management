/**
 * E2E Journey 2 — Customer booking wizard with REAL server OTP (v11 UI)
 *
 * EXECUTED PART: proves the v11 wizard drives the REAL availability endpoint
 * and the REAL /api/auth/otp/request (a genuine 6-digit booking_verification
 * OTP is issued and retrieved via the dev-only otp-peek route).
 *
 * BLOCKED PART (test.fixme, visible as such in reports): the final
 * verify→submit→receipt leg is BLOCKED by SECURITY-R2 — the server's
 * /api/auth/otp/verify provisions a user/session only for purpose='login',
 * so a CORRECT booking_verification OTP is rejected with 400
 * (server/routes/auth.ts:75 + server/services/auth/otpService.ts:266).
 * No booking API is stubbed anywhere in this spec.
 */
import { test, expect } from './helpers/testIsolation';
import type { Page } from '@playwright/test';

const CUSTOMER_PHONE = '09364567890';
const COMPLETION_PHONE = '09364567891';

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
  const catalog = page.getByRole('region', { name: 'خدمات و قیمت‌ها' });
  await expect(catalog).toBeVisible({ timeout: 15000 });

  // Open the wizard for a specific catalog service
  await catalog.getByRole('button', { name: /^رزرو/ }).first().click();
  await expect(page.getByRole('list', { name: 'مراحل رزرو' })).toBeVisible({ timeout: 10000 });

  // Step 1 → 2 (service/specialist selection)
  await page.getByRole('button', { name: 'ادامه' }).click();

  // Step 2: the real availability API honestly reports closed days (e.g. Fridays)
  // — pick the next open day chip, then the first available slot.
  const dayChips = page.getByRole('radiogroup', { name: 'روز نوبت' }).getByRole('radio');
  await expect(dayChips.first()).toBeVisible({ timeout: 10000 });
  if (await dayChips.count() > 1) {
    await dayChips.nth(1).click();
  }

  const availableSlot = page
    .locator('button:not([disabled])')
    .filter({ hasText: /([۰-۹]{2}:[۰-۹]{2})|(\d{2}:\d{2})/ })
    .first();
  await availableSlot.click();
  await expect(page.getByRole('button', { name: 'ادامه' })).toBeEnabled();
  await page.getByRole('button', { name: 'ادامه' }).click();

  // Step 3: identity + phone → REAL server OTP request
  await page.getByLabel('نام و نام خانوادگی').fill('کاربر سفر رزرو');
  await page.getByLabel('شماره موبایل').fill(CUSTOMER_PHONE);
  await page.getByRole('button', { name: 'دریافت کد تأیید' }).click();

  // The server really issued a 6-digit booking_verification OTP
  await expect(page.getByText('کد ۶ رقمی به شماره')).toBeVisible({ timeout: 15000 });
  const code = await peekLastOtp(page, CUSTOMER_PHONE);
  expect(code).toMatch(/^\d{6}$/);
});

test('customer completes a REAL guest booking through the wizard (OTP grant, no account)', async ({ page }) => {
  await page.goto('/');
  const catalog = page.getByRole('region', { name: 'خدمات و قیمت‌ها' });
  await expect(catalog).toBeVisible({ timeout: 15000 });

  await catalog.getByRole('button', { name: /^رزرو/ }).first().click();
  await expect(page.getByRole('list', { name: 'مراحل رزرو' })).toBeVisible({ timeout: 10000 });

  await page.getByRole('button', { name: 'ادامه' }).click();

  const dayChips = page.getByRole('radiogroup', { name: 'روز نوبت' }).getByRole('radio');
  await expect(dayChips.first()).toBeVisible({ timeout: 10000 });
  if ((await dayChips.count()) > 1) {
    await dayChips.nth(1).click();
  }

  const availableSlot = page
    .locator('button:not([disabled])')
    .filter({ hasText: /([۰-۹]{2}:[۰-۹]{2})|(\d{2}:\d{2})/ })
    .first();
  await availableSlot.click();
  await expect(page.getByRole('button', { name: 'ادامه' })).toBeEnabled();
  await page.getByRole('button', { name: 'ادامه' }).click();

  // Step 3: identity + phone → REAL server OTP request
  await page.getByLabel('نام و نام خانوادگی').fill('کاربر سفر رزرو');
  await page.getByLabel('شماره موبایل').fill(COMPLETION_PHONE);
  await page.getByRole('button', { name: 'دریافت کد تأیید' }).click();
  await expect(page.getByText('کد ۶ رقمی به شماره')).toBeVisible({ timeout: 15000 });

  // Real OTP, real grant issuance (Phase 08 contract)
  const code = await peekLastOtp(page, COMPLETION_PHONE);
  await page.getByLabel('کد تأیید').fill(code);
  await page.getByRole('button', { name: 'تأیید کد' }).click();

  // Verification success → the wizard enables the final submission
  const submitButton = page.getByRole('button', { name: 'ثبت نوبت' });
  await expect(submitButton).toBeEnabled({ timeout: 15000 });
  await submitButton.click();

  // Confirmation receipt with the REAL tracking code from the booking API
  await expect(page.getByText('کد پیگیری')).toBeVisible({ timeout: 15000 });
});
