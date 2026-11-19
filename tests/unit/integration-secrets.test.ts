import { describe, expect, it } from 'vitest';
import { decryptIntegrationConfig, encryptIntegrationConfig } from '../../server/services/integrations/secretCrypto.ts';

describe('Platform integration secret encryption', () => {
  it('round-trips credentials without embedding the plaintext in storage', () => {
    const secret = 'kavenegar-api-key-test-value-2026';
    const encrypted = encryptIntegrationConfig({ apiKey: secret, template: 'nobatara-otp' });

    expect(encrypted).not.toContain(secret);
    expect(encrypted.startsWith('v1.')).toBe(true);
    expect(decryptIntegrationConfig(encrypted)).toEqual({
      apiKey: secret,
      template: 'nobatara-otp',
    });
  });

  it('rejects tampered ciphertext', () => {
    const encrypted = encryptIntegrationConfig({ merchantId: 'merchant-secret-value' });
    const parts = encrypted.split('.');
    parts[3] = (parts[3][0] === 'A' ? 'B' : 'A') + parts[3].slice(1);

    expect(() => decryptIntegrationConfig(parts.join('.'))).toThrow(/Unable to decrypt/);
  });

  it('rejects unsupported and malformed payloads', () => {
    expect(() => decryptIntegrationConfig('v2.invalid')).toThrow(/Unsupported or malformed/);
  });
});
