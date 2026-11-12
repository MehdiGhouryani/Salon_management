-- =============================================================================
-- Migration 005: Booking authorization grants (Phase 08)
-- =============================================================================
-- Guest booking contract: a customer who verifies their phone with an OTP
-- (purpose = booking_verification) receives a short-lived, single-use,
-- phone-bound authorization grant that authorizes exactly one booking
-- submission — without creating a persistent account or an ordinary session.
--
-- Security properties enforced here:
--  - only the SHA-256 hash of the 256-bit bearer token is stored (the raw
--    token exists solely in the verify response and the customer's memory)
--  - the grant is bound to the normalized phone number (not transferable)
--  - single use (consumed_at) and automatic expiry (expires_at)
--  - consumed_by_appointment ties the grant to the booking it authorized
--
-- Recovery: the down migration drops the whole table. Grants are ephemeral
-- credentials with a default 15-minute TTL — losing them never loses booking
-- data or account state.
-- =============================================================================

CREATE TABLE IF NOT EXISTS booking_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL,
  purpose VARCHAR(32) NOT NULL DEFAULT 'booking'
    CHECK (purpose IN ('booking')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ NULL,
  consumed_by_appointment VARCHAR(64) NULL REFERENCES appointments(id) ON DELETE SET NULL,
  CONSTRAINT booking_grants_expiry CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_booking_grants_phone ON booking_grants(phone);
CREATE INDEX IF NOT EXISTS idx_booking_grants_expiry ON booking_grants(expires_at);
