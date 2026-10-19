-- =============================================================================
-- NobatAra Migration 002 Rollback: Revert Authentication Challenges & Session Hardening
-- =============================================================================

DROP TABLE IF EXISTS otp_challenges CASCADE;

ALTER TABLE clients DROP COLUMN IF EXISTS user_id CASCADE;
ALTER TABLE user_sessions DROP COLUMN IF EXISTS idle_expires_at CASCADE;
ALTER TABLE user_sessions DROP COLUMN IF EXISTS session_type CASCADE;
