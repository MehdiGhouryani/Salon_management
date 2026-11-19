/**
 * Real PostgreSQL integration tests for encrypted platform provider settings.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DB_TESTS_ENABLED, initDatabaseUnderTest, type DbUnderTest } from './_setup.ts';

let db: DbUnderTest;
let saveIntegrationSettings: typeof import('../../server/services/integrations/integrationSettingsService.ts')['saveIntegrationSettings'];
let getIntegrationRuntime: typeof import('../../server/services/integrations/integrationSettingsService.ts')['getIntegrationRuntime'];
let getIntegrationStatuses: typeof import('../../server/services/integrations/integrationSettingsService.ts')['getIntegrationStatuses'];

describe.skipIf(!DB_TESTS_ENABLED)('PostgreSQL platform integration secret storage', () => {
  beforeAll(async () => {
    db = await initDatabaseUnderTest();
    const service = await import('../../server/services/integrations/integrationSettingsService.ts');
    saveIntegrationSettings = service.saveIntegrationSettings;
    getIntegrationRuntime = service.getIntegrationRuntime;
    getIntegrationStatuses = service.getIntegrationStatuses;
    await db.raw.query('DELETE FROM platform_integrations WHERE integration_key = $1', ['kavenegar']);
  }, 120_000);

  afterAll(async () => {
    if (db?.raw) {
      await db.raw.query('DELETE FROM platform_integrations WHERE integration_key = $1', ['kavenegar']);
      await db.raw.end();
    }
  });

  it('stores encrypted settings, exposes only status flags, and updates live runtime values', async () => {
    const secret = 'kavenegar-realistic-api-key-for-tests';
    const saved = await saveIntegrationSettings('kavenegar', {
      apiKey: secret,
      template: 'nobatara-test',
      enabled: true,
    }, 'integration-test-admin');

    expect(saved.enabled).toBe(true);
    expect(saved.configured).toBe(true);
    expect(saved.fields.apiKey).toBe(true);

    const raw = await db.raw.query(
      'SELECT encrypted_config, is_enabled FROM platform_integrations WHERE integration_key = $1',
      ['kavenegar']
    );
    expect(raw.rows).toHaveLength(1);
    expect(raw.rows[0].encrypted_config).not.toContain(secret);
    expect(raw.rows[0].is_enabled).toBe(true);

    const runtime = await getIntegrationRuntime('kavenegar');
    expect(runtime.enabled).toBe(true);
    expect(runtime.settings.apiKey).toBe(secret);
    expect(runtime.settings.template).toBe('nobatara-test');

    const statuses = await getIntegrationStatuses();
    const status = statuses.find((item) => item.key === 'kavenegar');
    expect(status?.fields.apiKey).toBe(true);
    expect(JSON.stringify(statuses)).not.toContain(secret);
  });

  it('keeps existing secrets when a password field is left blank and supports disabling the provider', async () => {
    const secret = 'kavenegar-realistic-api-key-for-tests';
    const updated = await saveIntegrationSettings('kavenegar', {
      apiKey: '',
      template: 'nobatara-next',
      enabled: false,
    }, 'integration-test-admin');

    expect(updated.enabled).toBe(false);
    const runtime = await getIntegrationRuntime('kavenegar');
    expect(runtime.settings.apiKey).toBe(secret);
    expect(runtime.settings.template).toBe('nobatara-next');
  });
});
