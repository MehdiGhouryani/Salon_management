-- =============================================================================
-- Migration 006 DOWN: remove shared rate-limit counters
-- =============================================================================
-- SAFE: these rows are transient security counters; rolling back resets active
-- rate-limit windows but does not delete customer, booking, or audit data.

DROP INDEX IF EXISTS idx_api_rate_limit_buckets_expires_at;
DROP TABLE IF EXISTS api_rate_limit_buckets;
