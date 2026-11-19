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

function isAvailabilityResponse(response: import('@playwright/test').Response): boolean {
  return response.request().method() === 'GET' &&
    response.url().includes('/api/public/salons/') &&
    response.url().includes('/availability?');
}

/**
 * Walks upcoming days using the real availability API. Weekday assumptions are
 * intentionally avoided: the test selects the first day that actually returns
 * an open slot for the requested service.
 */
async function chooseFirstRealAvailableSlot(page: Page, initialResponse: import('@playwright/test').Response): Promise<void> {
  const dayChips = page.getByRole('radiogroup', { name: 'روز نوبت' }).getByRole('radio');
  await expect(dayChips.first()).toBeVisible({ timeout: 10000 });

  let availabilityResponse = initialResponse;
  const daysCount = await dayChips.count();

  for (let index = 0; index < daysCount; index++) {
    if (index > 0) {
      const nextAvailability = page.waitForResponse(isAvailabilityResponse);
      await dayChips.nth(index).click();
      availabilityResponse = await nextAvailability;
    }

    expect(availabilityResponse.status()).toBe(200);
    const availability = await availabilityResponse.json();
    const hasAvailableSlot =
      availability.success === true &&
      availability.isOpen === true &&
      Array.isArray(availability.slots) &&
      availability.slots.some((slot: { available?: boolean }) => slot.available === true);

    if (!hasAvailableSlot) continue;

    const availableSlots = page
      .getByRole('radiogroup', { name: 'ساعت نوبت' })
      .getByRole('radio', { disabled: false });
    await expect(availableSlots.first()).toBeVisible({ timeout: 10000 });
    await availableSlots.first().click();
    return;
  }

  throw new Error('No available slot was returned by the real availability API for any of the next seven days.');
}

test('booking wizard reaches real availability and real server OTP issuance', async ({ page }) => {
  await page.goto('/');
  const catalog = page.getByRole('region', { name: 'خدمات و قیمت‌ها' });
  await expect(catalog).toBeVisible({ timeout: 15000 });

  // Open the wizard for a specific catalog service
  await catalog.getByRole('button', { name: /^رزرو/ }).first().click();
  await expect(page.getByRole('list', { name: 'مراحل رزرو' })).toBeVisible({ timeout: 10000 });

  // Step 1 → 2 (service/specialist selection). Capture the initial real
  // availability response, then search the upcoming days for an open slot.
  const initialAvailability = page.waitForResponse(isAvailabilityResponse);
  await page.getByRole('button', { name: 'ادامه' }).click();
  await chooseFirstRealAvailableSlot(page, await initialAvailability);
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

  const initialAvailability = page.waitForResponse(isAvailabilityResponse);
  await page.getByRole('button', { name: 'ادامه' }).click();
  await chooseFirstRealAvailableSlot(page, await initialAvailability);
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
