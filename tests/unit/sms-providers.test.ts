/**
 * NobatAra Unit Tests — SMS provider layer (CATEGORY: unit/provider-mocks)
 *
 * Phase 14: timeout, provider failure families, bounded retry semantics,
 * rate-limit handling, masked-phone logging, and config-driven provider
 * selection. The HTTP gateway is mocked — no live SMS is ever sent.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { KavenegarSmsProvider, maskPhone } from '../../server/services/sms/kavenegarProvider.ts';
import { NullSmsProvider } from '../../server/services/sms/nullProvider.ts';

const PROVIDER_OPTIONS = { timeoutMs: 200, maxAttempts: 2, template: 'nobatara-otp' };

function gatewayResponder(
  fn: (url: string, init: RequestInit) => Promise<Response>
) {
  return vi.fn(fn as unknown as typeof fetch);
}

const okGateway = () =>
  okResponse({ return: { status: 200, message: 'success' }, entries: [{ messageid: 42, cost: 120 }] });

const okResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('maskPhone (unit)', () => {
  it('keeps first 4 and last 2 digits only', () => {
    expect(maskPhone('09123456789')).toBe('0912****89');
  });
  it('masks short/invalid input fully', () => {
    expect(maskPhone('123')).toBe('***');
    expect(maskPhone('')).toBe('***');
  });
});

describe('Kavenegar provider — delivery success (unit, gateway mocked)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns messageId and cost on provider acceptance', async () => {
    const fetchMock = gatewayResponder(async () => okGateway());
    vi.stubGlobal('fetch', fetchMock);

    const p = new KavenegarSmsProvider('test-api-key-123456', PROVIDER_OPTIONS);
    const res = await p.sendOtp('09123456789', '123456');

    expect(res.success).toBe(true);
    expect(res.messageId).toBe('42');
    // request hit the verify/lookup endpoint with receptor + token
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/verify/lookup.json');
    expect(url).toContain('receptor=09123456789');
    expect(url).toContain('token=123456');
  });
});

describe('Kavenegar provider — failure families (unit, gateway mocked)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('insufficient credit (418) → SMS_PROVIDER_NO_CREDIT, NOT retried', async () => {
    const fetchMock = gatewayResponder(async () =>
      okResponse({ return: { status: 418, message: 'insufficient credit' } })
    );
    vi.stubGlobal('fetch', fetchMock);

    const p = new KavenegarSmsProvider('test-api-key-123456', PROVIDER_OPTIONS);
    const res = await p.sendOtp('09123456789', '123456');
    expect(res.success).toBe(false);
    expect(res.errorCode).toBe('SMS_PROVIDER_NO_CREDIT');
    expect(fetchMock.mock.calls.length).toBe(1); // business rejection: no retry
  });

  it('template not approved (409) → SMS_PROVIDER_TEMPLATE_NOT_APPROVED', async () => {
    vi.stubGlobal('fetch', gatewayResponder(async () =>
      okResponse({ return: { status: 409, message: 'template not found' } })
    ));
    const p = new KavenegarSmsProvider('test-api-key-123456', PROVIDER_OPTIONS);
    const res = await p.sendOtp('09123456789', '123456');
    expect(res.errorCode).toBe('SMS_PROVIDER_TEMPLATE_NOT_APPROVED');
  });

  it('provider throttle (429) → SMS_PROVIDER_RATE_LIMITED, not retried', async () => {
    const fetchMock = gatewayResponder(async () =>
      okResponse({ return: { status: 429, message: 'too many requests' } })
    );
    vi.stubGlobal('fetch', fetchMock);
    const p = new KavenegarSmsProvider('test-api-key-123456', PROVIDER_OPTIONS);
    const res = await p.sendOtp('09123456789', '123456');
    expect(res.errorCode).toBe('SMS_PROVIDER_RATE_LIMITED');
    expect(fetchMock.mock.calls.length).toBe(1);
  });

  it('gateway 5xx → retried up to maxAttempts then SMS_PROVIDER_UNAVAILABLE', async () => {
    const fetchMock = gatewayResponder(async () => okResponse({ message: 'boom' }, 503));
    vi.stubGlobal('fetch', fetchMock);
    const p = new KavenegarSmsProvider('test-api-key-123456', { ...PROVIDER_OPTIONS, maxAttempts: 2 });
    const res = await p.sendOtp('09123456789', '123456');
    expect(res.success).toBe(false);
    expect(res.errorCode).toBe('SMS_PROVIDER_UNAVAILABLE');
    expect(fetchMock.mock.calls.length).toBe(2);
  });

  it('gateway timeout → SMS_PROVIDER_TIMEOUT with bounded retry', async () => {
    const fetchMock = gatewayResponder(async (_url, init) => {
      const signal = init.signal as AbortSignal;
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError'))
        );
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    const p = new KavenegarSmsProvider('test-api-key-123456', {
      ...PROVIDER_OPTIONS,
      timeoutMs: 50,
      maxAttempts: 2,
    });
    const res = await p.sendOtp('09123456789', '123456');
    expect(res.success).toBe(false);
    expect(res.errorCode).toBe('SMS_PROVIDER_TIMEOUT');
    expect(fetchMock.mock.calls.length).toBe(2);
  });

  it('never logs the OTP or the full phone number', async () => {
    const logs: string[] = [];
    const orig = console.log;
    const warn = console.warn;
    console.log = (...a: unknown[]) => logs.push(a.join(' '));
    console.warn = (...a: unknown[]) => logs.push(a.join(' '));
    try {
      vi.stubGlobal('fetch', gatewayResponder(async () => okGateway()));
      const p = new KavenegarSmsProvider('test-api-key-123456', PROVIDER_OPTIONS);
      await p.sendOtp('09123456789', '654321');
    } finally {
      console.log = orig;
      console.warn = warn;
    }
    const joined = logs.join('\n');
    expect(joined).not.toContain('09123456789');
    expect(joined).not.toContain('654321');
    expect(joined).toContain('0912****89');
  });
});

describe('Provider selection & fail-closed modes (unit)', () => {
  it('NullSmsProvider reports unconfigured and never succeeds', async () => {
    const p = new NullSmsProvider('ارسال پیامک غیرفعال است.');
    expect(p.isConfigured()).toBe(false);
    const res = await p.sendOtp('09123456789', '123456');
    expect(res.success).toBe(false);
  });
});
