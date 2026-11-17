import { describe, expect, it } from 'vitest';
import {
  parseZarinpalRequestResponse,
  parseZarinpalVerifyResponse,
  zarinpalApiBaseUrl,
  zarinpalPaymentUrl,
} from '../../server/services/payments/subscriptionService.ts';

describe('Zarinpal provider response contracts', () => {
  it('accepts only a successful request response with a bounded authority', () => {
    expect(parseZarinpalRequestResponse({
      data: { code: 100, authority: 'A000000000000000000000000000000000', message: 'Success' },
    })).toMatchObject({
      authority: 'A000000000000000000000000000000000',
      message: 'Success',
    });
    expect(() => parseZarinpalRequestResponse({ data: { code: 101, authority: 'old' } })).toThrow();
    expect(() => parseZarinpalRequestResponse({ data: { code: 100, authority: '' } })).toThrow();
  });

  it('treats verification 100 and 101 as verified, and rejects other codes', () => {
    expect(parseZarinpalVerifyResponse({ data: { code: 100, ref_id: 123456 } })).toMatchObject({
      verified: true, reference: '123456', code: 100,
    });
    expect(parseZarinpalVerifyResponse({ data: { code: 101, ref_id: 123456 } })).toMatchObject({
      verified: true, reference: '123456', code: 101,
    });
    expect(parseZarinpalVerifyResponse({ data: { code: -9 } })).toMatchObject({
      verified: false, reference: null, code: -9,
    });
  });

  it('uses sandbox and production API/payment hosts separately', () => {
    expect(zarinpalApiBaseUrl(true)).toBe('https://sandbox.zarinpal.com/pg/v4/payment');
    expect(zarinpalApiBaseUrl(false)).toBe('https://api.zarinpal.com/pg/v4/payment');
    expect(zarinpalPaymentUrl('AUTH-123', true)).toBe('https://sandbox.zarinpal.com/pg/StartPay/AUTH-123');
    expect(zarinpalPaymentUrl('AUTH-123', false)).toBe('https://www.zarinpal.com/pg/StartPay/AUTH-123');
  });
});
