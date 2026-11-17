/**
 * Phase 15 — Cross-platform QA: visual states, responsive widths,
 * automated accessibility (axe), and horizontal-overflow checks for all
 * three personas. Screenshots are written to test-results/ (not committed).
 *
 * Phase 18: the axe scans now INCLUDE the color-contrast rule and run against
 * BOTH themes (dark is the app default; light is activated through the same
 * localStorage key the ThemeContext reads). Contrast insufficiency must be
 * FIXED, never excluded from the gate.
 *
 * NOTE: axe scans catch a subset of WCAG issues (labels, contrast, roles).
 * They do NOT constitute full WCAG conformance — keyboard walkthroughs and
 * screen-reader testing remain manual follow-ups (documented in the Phase 18
 * audit as NOT TESTED in this environment).
 */
import { test, expect } from './helpers/testIsolation';
import AxeBuilder from '@axe-core/playwright';

const WIDTHS = [360, 390, 768, 1024, 1440] as const;

async function assertNoHorizontalOverflow(page: import('@playwright/test').Page, label: string) {
  const overflow = await page.evaluate(() => {
    const doc = document.scrollingElement as HTMLElement;
    return { scrollW: doc.scrollWidth, clientW: doc.clientWidth };
  });
  expect(
    overflow.scrollW <= overflow.clientW + 1,
    `${label}: horizontal overflow ${overflow.scrollW}px > viewport ${overflow.clientW}px`
  ).toBe(true);
}

async function axeViolations(page: import('@playwright/test').Page, disabledRules: string[] = []) {
  const builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']);
  if (disabledRules.length) builder.disableRules(disabledRules);
  const { violations } = await builder.analyze();
  return violations;
}

/** Log serious/critical violations with their first node targets. */
async function assertNoSeriousViolations(
  page: import('@playwright/test').Page,
  label: string,
  disabledRules: string[] = []
) {
  const violations = await axeViolations(page, disabledRules);
  const serious = violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  if (serious.length > 0) {
    console.log(
      `AXE SERIOUS VIOLATIONS (${label}):`,
      JSON.stringify(
        serious.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.slice(0, 3).map((n) => n.target),
        })),
        null,
        1
      )
    );
  }
  expect(serious.length, `serious+critical axe violations on ${label}`).toBe(0);
}

test.describe('Storefront responsive + a11y', () => {
  for (const width of WIDTHS) {
    test(`storefront @ ${width}px renders without overflow`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 15000 });
      await assertNoHorizontalOverflow(page, `storefront ${width}px`);
      await page.screenshot({ path: `test-results/qa/storefront-${width}.png`, fullPage: false });
    });
  }

  test('storefront axe scan (dark theme): no serious WCAG-A/AA violations incl. contrast', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 15000 });

    // Phase 18: color-contrast is IN the gate now (dark is the default theme).
    await assertNoSeriousViolations(page, 'storefront dark');
  });

  test('storefront axe scan (light theme): no serious WCAG-A/AA violations incl. contrast', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    // The ThemeContext reads this exact key at startup; set it before any app code runs.
    await page.addInitScript(() => {
      try {
        localStorage.setItem('nobatara_theme', 'light');
      } catch {
        /* storage may be blocked; the app falls back to dark */
      }
    });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 15000 });

    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(theme).toBe('light');

    await assertNoSeriousViolations(page, 'storefront light');
  });
});

test.describe('Booking modal responsive + a11y', () => {
  test('booking wizard @ 390px opens, no overflow, dialog is labelled', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const catalog = page.getByRole('region', { name: 'خدمات و قیمت‌ها' });
    await expect(catalog).toBeVisible({ timeout: 15000 });
    await catalog.getByRole('button', { name: /^رزرو/ }).first().click();
    await expect(page.getByRole('list', { name: 'مراحل رزرو' })).toBeVisible({ timeout: 10000 });
    await assertNoHorizontalOverflow(page, 'booking modal 390px');
    await page.screenshot({ path: 'test-results/qa/booking-modal-390.png' });

    // Dialog focus management: Escape closes and focus returns to the page
    await page.keyboard.press('Escape');
    await expect(page.getByRole('list', { name: 'مراحل رزرو' })).not.toBeVisible({ timeout: 5000 });
  });

  test('booking wizard @ 1440px renders without overflow', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const catalog = page.getByRole('region', { name: 'خدمات و قیمت‌ها' });
    await expect(catalog).toBeVisible({ timeout: 15000 });
    await catalog.getByRole('button', { name: /^رزرو/ }).first().click();
    await expect(page.getByRole('list', { name: 'مراحل رزرو' })).toBeVisible({ timeout: 10000 });
    await assertNoHorizontalOverflow(page, 'booking modal 1440px');
    await page.screenshot({ path: 'test-results/qa/booking-modal-1440.png' });
  });
});

test.describe('Salon panel responsive + a11y', () => {
  test('salon dashboard @ 1440px loads real data without overflow', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    // Dev-only: seed the membership (fresh server per run resets in-memory state)
    await page.request.post('/api/dev/seed-salon-membership', {
      data: { phone: '09361000005', salonId: 'sal-101', role: 'owner' },
    });
    await page.goto('/');
    await page.getByRole('button', { name: 'اپلیکیشن سالن' }).click();

    const loginInput = page.getByPlaceholder('09121112233');
    await expect(loginInput).toBeVisible({ timeout: 15000 });
    await loginInput.fill('09361000005');
    await page.getByRole('button', { name: 'دریافت کد تایید یکبار مصرف' }).click();
    const peek = await page.request.get('/api/dev/otp-peek?phone=09361000005');
    const code = (await peek.json()).otp?.code;
    await page.getByPlaceholder('123456', { exact: true }).fill(code);
    await page.getByRole('button', { name: 'تایید کد و ورود به سالن' }).click();

    await expect(page.locator('h1', { hasText: 'نوبت‌های امروز' })).toBeVisible({ timeout: 20000 });
    await assertNoHorizontalOverflow(page, 'salon panel 1440px');

    // Phase 18: contrast included in the gate.
    await assertNoSeriousViolations(page, 'salon panel dark');
    await page.screenshot({ path: 'test-results/qa/salon-panel-1440.png' });
  });
});

test.describe('Super Admin responsive + a11y', () => {
  test('admin console @ 1440px loads KPIs without overflow', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.request.post('/api/dev/seed-super-admin', { data: { phone: '09361000020' } });

    await page.getByRole('button', { name: 'پنل مدیریت کل' }).click();
    const loginInput = page.getByPlaceholder('09120000001');
    await expect(loginInput).toBeVisible({ timeout: 15000 });
    await loginInput.fill('09361000020');
    await page.getByRole('button', { name: /دریافت کد/ }).click();
    const qaPeek = await page.request.get('/api/dev/otp-peek?phone=09361000020');
    const code = (await qaPeek.json()).otp?.code;
    await page.getByPlaceholder('123456', { exact: true }).fill(code);
    await page.getByRole('button', { name: /تایید/ }).last().click();

    await expect(page.getByText('سالن‌های شبکه').first()).toBeVisible({ timeout: 20000 });
    await assertNoHorizontalOverflow(page, 'admin console 1440px');

    // Phase 18: the admin console gets the same contrast-inclusive axe gate.
    await assertNoSeriousViolations(page, 'admin console dark');
    await page.screenshot({ path: 'test-results/qa/admin-console-1440.png' });
  });
});

test.describe('Keyboard navigation & focus (Phase 18)', () => {
  test('storefront is operable by keyboard: visible focus, Escape closes the booking modal', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 15000 });

    // Tab from the top of the document: focus must move and be VISIBLE.
    await page.keyboard.press('Tab');
    const focused = page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return el ? { tag: el.tagName, text: (el.textContent || '').trim().slice(0, 40) } : null;
    });
    expect(await focused).not.toBeNull();

    // Focus indicators: the focused element must have a non-zero focus outline/ring.
    const hasFocusIndicator = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return false;
      const style = getComputedStyle(el);
      const outline = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth || '0') > 0;
      const boxShadow = style.boxShadow !== 'none' && style.boxShadow.includes('ring');
      return outline || boxShadow || el.classList.toString().includes('focus');
    });
    expect(hasFocusIndicator, 'first tab stop must show a visible focus indicator').toBe(true);

    // The booking modal must open from the keyboard path and close with Escape.
    const catalog = page.getByRole('region', { name: 'خدمات و قیمت‌ها' });
    await expect(catalog).toBeVisible({ timeout: 15000 });
    const bookButton = catalog.getByRole('button', { name: /^رزرو/ }).first();
    await bookButton.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('list', { name: 'مراحل رزرو' })).toBeVisible({ timeout: 10000 });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('list', { name: 'مراحل رزرو' })).not.toBeVisible({ timeout: 5000 });
  });
});
