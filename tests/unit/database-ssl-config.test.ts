import { describe, expect, it } from 'vitest';
import { parseDatabaseSslSettings } from '../../server/config.ts';

describe('PostgreSQL TLS configuration', () => {
  it('keeps TLS off by default for local development and verifies certificates when enabled', () => {
    expect(parseDatabaseSslSettings({}, false)).toMatchObject({
      ssl: false,
      sslRejectUnauthorized: true,
      sslCa: undefined,
    });

    expect(parseDatabaseSslSettings({ DB_SSL: 'true' }, false)).toMatchObject({
      ssl: true,
      sslRejectUnauthorized: true,
    });
  });

  it('enables TLS for require, verify-ca and verify-full URL modes', () => {
    for (const mode of ['require', 'verify-ca', 'verify-full']) {
      expect(
        parseDatabaseSslSettings({ DATABASE_URL: `postgresql://db.example/nobatara?sslmode=${mode}` }, false).ssl
      ).toBe(true);
    }
  });

  it('accepts an explicitly supplied PEM CA and expands escaped newlines', () => {
    const ca = '-----BEGIN CERTIFICATE-----\\nMIIBtest\\n-----END CERTIFICATE-----';
    const parsed = parseDatabaseSslSettings({ DB_SSL: 'true', DB_SSL_CA: ca }, true);
    expect(parsed.sslCa).toBe('-----BEGIN CERTIFICATE-----\nMIIBtest\n-----END CERTIFICATE-----');
    expect(parsed.sslRejectUnauthorized).toBe(true);
  });

  it('rejects disabled certificate verification in Production', () => {
    expect(() =>
      parseDatabaseSslSettings(
        { DB_SSL: 'true', DB_SSL_REJECT_UNAUTHORIZED: 'false' },
        true
      )
    ).toThrow(/forbidden in production/i);
  });

  it('validates boolean values and rejects a CA without TLS', () => {
    expect(() => parseDatabaseSslSettings({ DB_SSL: 'yes' }, false)).toThrow(/Invalid DB_SSL/);
    expect(() =>
      parseDatabaseSslSettings({ DB_SSL_CA: '-----BEGIN CERTIFICATE-----' }, false)
    ).toThrow(/requires DB_SSL/);
    expect(() =>
      parseDatabaseSslSettings({ DB_SSL: 'true', DB_SSL_CA: 'not-a-certificate' }, false)
    ).toThrow(/PEM-encoded/);
  });
});
