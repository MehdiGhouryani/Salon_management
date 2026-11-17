-- Migration 009: connect SaaS payment attempts to the legacy finance ledger.
-- Kept separate from 008 so a database that already applied 008 still receives
-- the additive ledger link safely on its next migration run.
ALTER TABLE payment_records
  ADD COLUMN IF NOT EXISTS subscription_payment_attempt_id UUID NULL
  REFERENCES subscription_payment_attempts(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_records_subscription_attempt
  ON payment_records(subscription_payment_attempt_id);
