import type { SmsProvider, SmsSendResult } from './types.ts';

export class NullSmsProvider implements SmsProvider {
  private readonly reason: string;

  constructor(reason: string = 'SMS gateway is not configured.') {
    this.reason = reason;
  }

  getName(): string {
    return 'NullSmsProvider (Unconfigured)';
  }

  isConfigured(): boolean {
    return false;
  }

  async sendOtp(_phone: string, _code: string): Promise<SmsSendResult> {
    return {
      success: false,
      error: this.reason,
    };
  }
}
