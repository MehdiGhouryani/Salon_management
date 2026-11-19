import type { PoolClient } from 'pg';
import { query } from '../db/pool.ts';

export interface DbPlatformIntegration {
  integration_key: string;
  encrypted_config: string;
  is_enabled: boolean;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export const integrationSettingsRepository = {
  async findByKey(key: string, client?: PoolClient): Promise<DbPlatformIntegration | null> {
    const result = await query<DbPlatformIntegration>(
      `SELECT integration_key, encrypted_config, is_enabled, updated_by, created_at, updated_at
       FROM platform_integrations
       WHERE integration_key = $1
       LIMIT 1`,
      [key],
      client
    );
    return result.rows[0] || null;
  },

  async upsert(
    input: {
      key: string;
      encryptedConfig: string;
      enabled: boolean;
      updatedBy: string;
    },
    client?: PoolClient
  ): Promise<DbPlatformIntegration> {
    const result = await query<DbPlatformIntegration>(
      `INSERT INTO platform_integrations (
         integration_key, encrypted_config, is_enabled, updated_by
       ) VALUES ($1, $2, $3, $4)
       ON CONFLICT (integration_key) DO UPDATE SET
         encrypted_config = EXCLUDED.encrypted_config,
         is_enabled = EXCLUDED.is_enabled,
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()
       RETURNING integration_key, encrypted_config, is_enabled, updated_by, created_at, updated_at`,
      [input.key, input.encryptedConfig, input.enabled, input.updatedBy],
      client
    );
    if (!result.rows[0]) throw new Error('Platform integration upsert did not return a row.');
    return result.rows[0];
  },
};
