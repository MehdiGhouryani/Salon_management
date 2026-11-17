import { describe, expect, it } from 'vitest';
import { parsePaymentSettings } from '../../server/config.ts';

const MERCHANT_ID = '11111111-2222-3333-4444-555555555555';

describe('Zarinpal payment configuration', () => {
  it('defaults to sandbox outside production and keeps payments disabled without merchant details', () => {
    const settings = parsePaymentSettings({}, false);
    expect(settings.zarinpalSandbox).toBe(true);
    expect(settings.isZarinpalConfigured).toBe(false);
  });

  it('enables only when a merchant ID and public callback base URL are both configured', () => {
    const settings = parsePaymentSettings({
      ZARINPAL_MERCHANT_ID: MERCHANT_ID,
      PAYMENT_PUBLIC_BASE_URL: 'https://nobatara.example',
    }, false);
    expect(settings.isZarinpalConfigured).toBe(true);
    expect(settings.zarinpalSandbox).toBe(true);
    expect(settings.returnUrl).toBe('https://nobatara.example');
  });

  it('defaults production to live mode and requires HTTPS public URLs', () => {
    const settings = parsePaymentSettings({
      ZARINPAL_MERCHANT_ID: MERCHANT_ID,
      PAYMENT_PUBLIC_BASE_URL: 'https://nobatara.example',
      PAYMENT_RETURN_URL: 'https://app.nobatara.example/billing',
    }, true);
    expect(settings.zarinpalSandbox).toBe(false);
    expect(settings.isZarinpalConfigured).toBe(true);
    expect(settings.returnUrl).toBe('https://app.nobatara.example/billing');
  });

  it('rejects sandbox mode in production and rejects non-HTTPS production callback URLs', () => {
    expect(() => parsePaymentSettings({
      ZARINPAL_SANDBOX: 'true',
      ZARINPAL_MERCHANT_ID: MERCHANT_ID,
      PAYMENT_PUBLIC_BASE_URL: 'https://nobatara.example',
    }, true)).toThrow(/forbidden in production/);

    expect(() => parsePaymentSettings({
      ZARINPAL_MERCHANT_ID: MERCHANT_ID,
      PAYMENT_PUBLIC_BASE_URL: 'http://nobatara.example',
    }, true)).toThrow(/HTTPS in production/);
  });

  it('rejects malformed merchant identifiers and URL values', () => {
    expect(() => parsePaymentSettings({
      ZARINPAL_MERCHANT_ID: 'not-a-merchant-id',
      PAYMENT_PUBLIC_BASE_URL: 'https://nobatara.example',
    }, false)).toThrow(/UUID/);

    expect(() => parsePaymentSettings({
      ZARINPAL_MERCHANT_ID: MERCHANT_ID,
      PAYMENT_PUBLIC_BASE_URL: 'javascript:alert(1)',
    }, false)).toThrow(/absolute HTTP/);
  });
});
