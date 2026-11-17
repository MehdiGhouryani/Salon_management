/**
 * E2E Journey 3 — Customer OTP login + REAL booking history + server-confirmed
 * cancellation (v11 UI, real server).
 *
 * Phase 11: the drawer now reads /api/public/bookings/my after a real OTP
 * login, and cancellation goes through POST /api/public/bookings/:code/cancel.
 * This journey books via the API with a grant (Phase 08), logs in via the UI,
 * asserts the booking appears from the SERVER, cancels it, and verifies the
 * cancelled status is the server's response.
 */
import { test, expect } from './helpers/testIsolation';

const HISTORY_PHONE = '09364567892';

test('customer logs in via OTP and manages a real booking end-to-end', async ({ page }) => {
  // 1. Create a real booking via the API with a real grant (Phase 08 contract)
  const otpReq = await page.request.post('/api/auth/otp/request', {
    data: { phone: HISTORY_PHONE, purpose: 'booking_verification' },
  });
  expect(otpReq.status()).toBe(200);
  const otpPeek = await page.request.get(`/api/dev/otp-peek?phone=${HISTORY_PHONE}`);
  const grantCode = (await otpPeek.json()).otp?.code;
  expect(grantCode).toMatch(/^\d{6}$/);

  const verifyRes = await page.request.post('/api/auth/otp/verify', {
    data: { phone: HISTORY_PHONE, code: grantCode, purpose: 'booking_verification' },
  });
  expect(verifyRes.status()).toBe(200);
  const { bookingGrant } = await verifyRes.json();
  expect(bookingGrant).toBeTruthy();

  // Find the next OPEN day with a genuinely FREE slot. The seed closes sal-101
  // on Fridays, so a blind "today + N days" lands on a closed day whenever the
  // calendar says so (first CI execution hit exactly that: +3d = Friday).
  // Iterating candidates keeps the journey calendar-proof AND idempotent
  // against a persistent database: earlier runs' bookings are skipped, too.
  let bookingDate = '';
  let bookingTime = '';
  for (let dayOffset = 3; dayOffset <= 9; dayOffset++) {
    const candidate = new Date(Date.now() + dayOffset * 86_400_000).toISOString().split('T')[0];
    const availRes = await page.request.get(
      `/api/public/salons/sal-101/availability?serviceId=srv-101&date=${candidate}&staffId=stf-101`
    );
    const availJson = await availRes.json();
    const firstFree: Array<{ time: string; available: boolean }> = availJson.slots || [];
    const free = firstFree.find((s) => s.available);
    if (free) {
      bookingDate = candidate;
      bookingTime = free.time;
      break;
    }
  }
  expect(bookingDate, 'server must report an open day with at least one free slot within a week').toBeTruthy();

  const bookingRes = await page.request.post('/api/public/bookings', {
    headers: { 'X-NobatAra-Booking-Grant': bookingGrant },
    data: {
      salonId: 'sal-101',
      serviceId: 'srv-101',
      staffId: 'stf-101',
      bookingDate,
      bookingTime,
      clientName: 'کاربر تاریخچه',
      clientPhone: HISTORY_PHONE,
    },
  });
  expect(bookingRes.status()).toBe(201);
  const { trackingCode } = await bookingRes.json();
  expect(trackingCode).toMatch(/^GIS-\d{6}$/);

  // 2. Log in through the REAL OTP UI flow (production posture)
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'نوبت‌های من' }).click();
  await expect(page.getByRole('button', { name: 'نوبت‌های من' }).first()).toBeVisible({ timeout: 10000 });

  const phoneInput = page.getByPlaceholder('09121234567');
  await phoneInput.fill(HISTORY_PHONE);
  await page.getByRole('button', { name: 'ورود', exact: true }).click();

  const modalPhone = page.getByPlaceholder('09123456789');
  await expect(modalPhone).toBeVisible({ timeout: 10000 });
  await modalPhone.fill(HISTORY_PHONE);
  await page.getByRole('button', { name: 'دریافت کد تایید' }).click();

  const loginOtpRes = await page.request.get(`/api/dev/otp-peek?phone=${HISTORY_PHONE}`);
  const loginCode = (await loginOtpRes.json()).otp?.code;
  expect(loginCode).toMatch(/^\d{6}$/);

  await page.getByPlaceholder('123456', { exact: true }).fill(loginCode);
  await page.getByRole('button', { name: 'تایید و ورود به سیستم' }).click();

  // 3. The drawer loads the booking from the SERVER (name enrichment visible)
  // The card renders the SERVER record: tracking code + enriched service name
  await expect(page.getByText(trackingCode).first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('رنگ و هایلایت تخصصی مو').first()).toBeVisible({ timeout: 15000 });

  // 4. Cancel through the UI — server-confirmed persistence
  const bookingCard = page.locator('li').filter({ hasText: trackingCode });
  await bookingCard.getByRole('button', { name: 'لغو نوبت' }).click();
  await page.getByRole('button', { name: 'لغو نوبت' }).last().click();

  // The server response updates the record: status badge becomes لغو شد
  await expect(
    bookingCard.getByText('لغو شد', { exact: false })
  ).toBeVisible({ timeout: 15000 });

  // 5. Server truth: tracking now reports cancelled
  const trackRes = await page.request.get(
    `/api/public/bookings/track/${trackingCode}?phone=${HISTORY_PHONE}`
  );
  expect((await trackRes.json()).appointment.status).toBe('cancelled');
});
