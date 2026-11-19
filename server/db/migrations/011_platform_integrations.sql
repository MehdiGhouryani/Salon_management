CREATE TABLE IF NOT EXISTS platform_integrations (
  integration_key VARCHAR(64) PRIMARY KEY,
  encrypted_config TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT platform_integrations_key_format
    CHECK (integration_key ~ '^[a-z][a-z0-9_-]{1,63}$')
);

CREATE INDEX IF NOT EXISTS idx_platform_integrations_updated_at
  ON platform_integrations (updated_at DESC);
