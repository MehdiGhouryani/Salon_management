export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  /** Structured provider failure family (Phase 14) — safe to expose to ops, never internals. */
  errorCode?: string;
  cost?: number;
}

export interface SmsProvider {
  getName(): string;
  isConfigured(): boolean;
  sendOtp(phone: string, code: string, template?: string): Promise<SmsSendResult>;
}
