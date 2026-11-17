-- Migration 010: serialize salon checkout and allow one in-flight gateway attempt.
-- A pending request is reused on subsequent checkout attempts. This prevents a
-- double charge caused by opening multiple independent payment authorities.
CREATE UNIQUE INDEX IF NOT EXISTS uq_subscription_one_open_attempt_per_salon
  ON subscription_payment_attempts(salon_id)
  WHERE status IN ('creating', 'pending');
