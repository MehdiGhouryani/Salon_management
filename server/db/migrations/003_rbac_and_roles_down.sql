-- =============================================================================
-- NobatAra Migration 003 Down: Revert RBAC Expansion & Revocation Metadata
-- =============================================================================

DROP INDEX IF EXISTS idx_user_sessions_user_active;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_sessions' AND column_name = 'revocation_reason'
  ) THEN
    ALTER TABLE user_sessions DROP COLUMN revocation_reason;
  END IF;
END $$;

DO $$
BEGIN
  ALTER TABLE users DROP CONSTRAINT IF EXISTS users_platform_role_check;
  ALTER TABLE users ADD CONSTRAINT users_platform_role_check
    CHECK (platform_role IN ('user', 'super_admin', 'platform_support', 'platform_auditor'));
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;
