import type { SmsProvider, SmsSendResult } from './types.ts';
import { config } from '../../config.ts';

export interface MockOtpRecord {
  phone: string;
  code: string;
  timestamp: Date;
}

export class DevMockSmsProvider implements SmsProvider {
  private readonly sentOtps: MockOtpRecord[] = [];

  constructor() {
    if (config.isProduction) {
      throw new Error(
        'SECURITY VIOLATION: DevMockSmsProvider cannot be instantiated in production mode.'
      );
    }
  }

  getName(): string {
    return 'DevMockSmsProvider (Testing/Development Adapter)';
  }

  isConfigured(): boolean {
    return true;
  }

  async sendOtp(phone: string, code: string): Promise<SmsSendResult> {
    if (config.isProduction) {
      return {
        success: false,
        error: 'DevMockSmsProvider is completely disabled in production.',
      };
    }

    const record: MockOtpRecord = {
      phone,
      code,
      timestamp: new Date(),
    };
    this.sentOtps.push(record);

    // Keep buffer bounded
    if (this.sentOtps.length > 50) {
      this.sentOtps.shift();
    }

    console.log(`[DevMockSmsProvider] (Development Only) Dispatched OTP to ${phone}`);

    return {
      success: true,
      messageId: `mock-msg-${Date.now()}`,
      cost: 0,
    };
  }

  /**
   * Helper for automated test runner to inspect the last sent OTP
   */
  getLastSentOtp(phone?: string): MockOtpRecord | undefined {
    if (phone) {
      return [...this.sentOtps].reverse().find((r) => r.phone === phone);
    }
    return this.sentOtps[this.sentOtps.length - 1];
  }

  clear(): void {
    this.sentOtps.length = 0;
  }
}
