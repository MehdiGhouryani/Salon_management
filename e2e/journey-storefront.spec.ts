/**
 * E2E Journey 1 — Public salon browsing (real server, real browser)
 */
import { test, expect } from '@playwright/test';

test('visitor can browse the salon storefront and see services and specialists', async ({ page }) => {
  await page.goto('/');

  // Switch to the salon website persona via the environment switcher
  await page.getByTitle('وب‌سایت اختصاصی رزرو سالن برای مشتریان').click();

  // Storefront renders the service catalog and specialist roster
  await expect(page.getByText('کاتالوگ خدمات و رزرو سریع')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('آرایشگران و متخصصین سالن')).toBeVisible();

  // The catalog exposes bookable services
  const serviceButtons = page.getByRole('button', { name: 'رزرو این خدمت' });
  await expect(serviceButtons.first()).toBeVisible();
  expect(await serviceButtons.count()).toBeGreaterThan(0);

  // Online booking is promoted in the header
  await expect(page.getByText('رزرو آنلاین نوبت').first()).toBeVisible();
});
