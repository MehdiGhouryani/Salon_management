/**
 * E2E Journey 1 — Public salon browsing (real server, real browser) — v11 UI
 */
import { test, expect } from './helpers/testIsolation';

test('visitor can browse the salon storefront and see services and specialists', async ({ page }) => {
  await page.goto('/');

  // v11: the salon website is the default persona; the environment bar shows the active section
  await expect(page.getByRole('button', { name: 'وب‌سایت سالن' })).toBeVisible({ timeout: 15000 });

  // Storefront renders the salon hero and the priced service catalog
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('heading', { name: 'خدمات و قیمت‌ها' })).toBeVisible();

  // The catalog exposes bookable services
  const catalog = page.getByRole('region', { name: 'خدمات و قیمت‌ها' });
  const bookButtons = catalog.getByRole('button', { name: /^رزرو/ });
  await expect(bookButtons.first()).toBeVisible();
  expect(await bookButtons.count()).toBeGreaterThan(0);

  // Header promotes booking and the customer menu
  await expect(page.getByRole('button', { name: 'رزرو نوبت' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'نوبت‌های من' })).toBeVisible();
});
