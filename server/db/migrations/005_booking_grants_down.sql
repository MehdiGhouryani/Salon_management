-- =============================================================================
-- Migration 005 DOWN: drop booking authorization grants
-- =============================================================================
-- Recovery: SAFE. Grants are ephemeral single-use credentials (default 15
-- minute TTL); dropping the table discards no booking data, no account state,
-- and no audit history.
-- =============================================================================

DROP INDEX IF EXISTS idx_booking_grants_expiry;
DROP INDEX IF EXISTS idx_booking_grants_phone;
DROP TABLE IF EXISTS booking_grants;
