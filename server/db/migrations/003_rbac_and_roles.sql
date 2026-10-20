-- =============================================================================
-- NobatAra Migration 003: RBAC Roles Expansion & Session Revocation Metadata
-- Additive migration for financial_manager role, session revocation tracking, and active session indices
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. EXPAND PLATFORM ROLES (ADD FINANCIAL_MANAGER)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  -- Drop existing platform_role check constraint if present and replace with expanded set
  ALTER TABLE users DROP CONSTRAINT IF EXISTS users_platform_role_check;
  ALTER TABLE users ADD CONSTRAINT users_platform_role_check
    CHECK (platform_role IN ('user', 'super_admin', 'platform_support', 'platform_auditor', 'financial_manager'));
EXCEPTION
  WHEN OTHERS THEN
    -- Fallback for environments where users table might not have constraint named users_platform_role_check
    NULL;
END $$;

-- -----------------------------------------------------------------------------
-- 2. USER SESSIONS REVOCATION METADATA
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_sessions' AND column_name = 'revocation_reason'
  ) THEN
    ALTER TABLE user_sessions ADD COLUMN revocation_reason VARCHAR(64) NULL;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. COMPOUND INDEX FOR FAST ACTIVE SESSION LOOKUPS & PRUNING
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active ON user_sessions(user_id, revoked_at, expires_at);
