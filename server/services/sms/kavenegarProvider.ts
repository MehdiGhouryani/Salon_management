import type { SmsProvider, SmsSendResult } from './types.ts';

export class KavenegarSmsProvider implements SmsProvider {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  getName(): string {
    return 'Kavenegar';
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 10);
  }

  async sendOtp(phone: string, code: string, template: string = 'nobatara-otp'): Promise<SmsSendResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Kavenegar API key is not configured.',
      };
    }

    try {
      // In Iranian standard telecom APIs, phone is formatted as national (09...) or E.164 without plus
      const receptor = phone.startsWith('+98') ? `0${phone.substring(3)}` : phone;
      const url = `https://api.kavenegar.com/v1/${this.apiKey}/verify/lookup.json`;

      const params = new URLSearchParams({
        receptor,
        token: code,
        template,
      });

      const response = await fetch(`${url}?${params.toString()}`, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Kavenegar HTTP error: ${response.status}`,
        };
      }

      const data: any = await response.json();
      if (data?.return?.status === 200 && data?.entries?.[0]?.messageid) {
        return {
          success: true,
          messageId: String(data.entries[0].messageid),
          cost: data.entries[0].cost || 0,
        };
      }

      return {
        success: false,
        error: data?.return?.message || 'Kavenegar lookup failed',
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Kavenegar dispatch error: ${err.message}`,
      };
    }
  }
}
