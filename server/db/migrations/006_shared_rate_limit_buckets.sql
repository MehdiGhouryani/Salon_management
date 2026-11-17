-- =============================================================================
-- Migration 006: shared, privacy-preserving API rate-limit counters
-- =============================================================================
-- Fixed-window buckets are persisted in PostgreSQL so OTP limits are enforced
-- consistently across multiple Node processes/instances. Only HMAC digests
-- are stored; raw phone numbers and IP addresses are never persisted here.
--
-- Rows expire automatically from the application perspective. The rate-limit
-- middleware periodically deletes expired rows in small batches.

CREATE TABLE IF NOT EXISTS api_rate_limit_buckets (
  bucket_hash CHAR(64) PRIMARY KEY,
  window_started_at TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL CHECK (request_count > 0),
  expires_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT api_rate_limit_bucket_expiry CHECK (expires_at > window_started_at)
);

CREATE INDEX IF NOT EXISTS idx_api_rate_limit_buckets_expires_at
  ON api_rate_limit_buckets(expires_at);
