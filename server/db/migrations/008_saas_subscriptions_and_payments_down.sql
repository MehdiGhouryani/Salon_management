DROP INDEX IF EXISTS uq_payment_records_subscription_attempt;
ALTER TABLE payment_records DROP COLUMN IF EXISTS subscription_payment_attempt_id;
DROP TABLE IF EXISTS salon_subscriptions;
DROP TABLE IF EXISTS subscription_payment_attempts;
DROP TABLE IF EXISTS subscription_plans;
