export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  cost?: number;
}

export interface SmsProvider {
  getName(): string;
  isConfigured(): boolean;
  sendOtp(phone: string, code: string, template?: string): Promise<SmsSendResult>;
}
