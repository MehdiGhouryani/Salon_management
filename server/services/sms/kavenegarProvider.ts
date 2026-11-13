import type { SmsProvider, SmsSendResult } from './types.ts';
import { config } from '../../config.ts';

/** Masks a national phone for logs: keeps the first 4 and last 2 digits. */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 8) return '***';
  return `${phone.slice(0, 4)}****${phone.slice(-2)}`;
}

/** Classifies a Kavenegar return.status into an actionable error family. */
function classifyKavenegarError(
  returnStatus: number | undefined
): { code: string; retryable: boolean } {
  // Documented Kavenegar verify/lookup statuses relevant to OTP delivery:
  // 429 = requests throttled, 418 = insufficient credit,
  // 417 = account disabled, 409 = template not approved, 403 = restriction.
  switch (returnStatus) {
    case 429:
      return { code: 'SMS_PROVIDER_RATE_LIMITED', retryable: true };
    case 418:
      return { code: 'SMS_PROVIDER_NO_CREDIT', retryable: false };
    case 417:
      return { code: 'SMS_PROVIDER_ACCOUNT_SUSPENDED', retryable: false };
    case 409:
      return { code: 'SMS_PROVIDER_TEMPLATE_NOT_APPROVED', retryable: false };
    case 403:
      return { code: 'SMS_PROVIDER_ACCOUNT_RESTRICTED', retryable: false };
    default:
      return { code: 'SMS_PROVIDER_ERROR', retryable: false };
  }
}

export class KavenegarSmsProvider implements SmsProvider {
  private readonly apiKey: string;
  private readonly template: string;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;

  constructor(
    apiKey: string,
    options: { template?: string; timeoutMs?: number; maxAttempts?: number } = {}
  ) {
    this.apiKey = apiKey;
    this.template = options.template || config.sms.template;
    this.timeoutMs = options.timeoutMs ?? config.sms.timeoutMs;
    this.maxAttempts = Math.max(1, options.maxAttempts ?? config.sms.maxAttempts);
  }

  getName(): string {
    return 'Kavenegar';
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 10);
  }

  /**
   * Sends one OTP via Kavenegar verify/lookup.
   *
   * Reliability contract (Phase 14):
   *  - hard per-attempt timeout (AbortSignal)
   *  - bounded retries ONLY for transport-level failures (timeout/network/HTTP 5xx);
   *    provider business rejections (credit, template, throttle) are NOT retried,
   *    so a retried attempt can never duplicate an accepted OTP
   *  - structured errorCode on failure; provider internals stay in server logs
   *    with the phone number MASKED (never full, never the OTP)
   */
  async sendOtp(phone: string, code: string, template: string = this.template): Promise<SmsSendResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Kavenegar API key is not configured.',
        errorCode: 'SMS_PROVIDER_NOT_CONFIGURED',
      };
    }

    // Iranian telecom receptors use the national 09… form.
    const receptor = phone.startsWith('+98') ? `0${phone.substring(3)}` : phone;
    const masked = maskPhone(receptor);
    const url = `https://api.kavenegar.com/v1/${this.apiKey}/verify/lookup.json`;

    let lastResult: SmsSendResult = {
      success: false,
      error: 'سرویس پیامک در دسترس نیست.',
      errorCode: 'SMS_PROVIDER_UNAVAILABLE',
    };

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        const params = new URLSearchParams({
          receptor,
          token: code,
          template,
        });

        const response = await fetch(`${url}?${params.toString()}`, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(this.timeoutMs),
        });

        // HTTP 5xx from the gateway: retryable transport failure.
        if (response.status >= 500) {
          lastResult = {
            success: false,
            error: 'سرویس پیامک موقتاً در دسترس نیست.',
            errorCode: 'SMS_PROVIDER_UNAVAILABLE',
          };
          console.warn(`[SMS:Kavenegar] attempt ${attempt}/${this.maxAttempts} gateway 5xx for ${masked}`);
          continue;
        }

        const data: any = await response.json().catch(() => null);

        if (!response.ok) {
          const cls = classifyKavenegarError(data?.return?.status);
          console.warn(
            `[SMS:Kavenegar] provider rejection for ${masked}: ${cls.code} (return.status=${data?.return?.status ?? response.status})`
          );
          return {
            success: false,
            error: 'سرویس پیامک درخواست را نپذیرفت.',
            errorCode: cls.code,
          };
        }

        if (data?.return?.status === 200 && data?.entries?.[0]?.messageid) {
          console.log(`[SMS:Kavenegar] OTP accepted for ${masked} (attempt ${attempt})`);
          return {
            success: true,
            messageId: String(data.entries[0].messageid),
            cost: data.entries[0].cost || 0,
          };
        }

        // Business rejection from the provider (credit/template/throttle/...).
        const cls = classifyKavenegarError(data?.return?.status);
        console.warn(
          `[SMS:Kavenegar] provider rejection for ${masked}: ${cls.code} (return.status=${data?.return?.status})`
        );
        return {
          success: false,
          error: 'سرویس پیامک درخواست را نپذیرفت.',
          errorCode: cls.code,
        };
      } catch (err: any) {
        const isTimeout = err?.name === 'AbortError' || err?.name === 'TimeoutError';
        lastResult = {
          success: false,
          error: isTimeout
            ? 'سرویس پیامک در مهلت مقرر پاسخ نداد.'
            : 'خطای ارتباط با سرویس پیامک.',
          errorCode: isTimeout ? 'SMS_PROVIDER_TIMEOUT' : 'SMS_PROVIDER_UNAVAILABLE',
        };
        console.warn(
          `[SMS:Kavenegar] attempt ${attempt}/${this.maxAttempts} ${isTimeout ? 'timeout' : 'network error'} for ${masked}`
        );
        // loop continues → bounded retry for transport failures only
      }
    }

    console.error(`[SMS:Kavenegar] delivery failed for ${masked} after ${this.maxAttempts} attempts`);
    return lastResult;
  }
}
