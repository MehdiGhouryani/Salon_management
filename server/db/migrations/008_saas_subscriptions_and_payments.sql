CREATE TABLE IF NOT EXISTS subscription_plans (
  code VARCHAR(32) PRIMARY KEY CHECK (code IN ('bronze', 'silver', 'gold_vip')),
  title VARCHAR(128) NOT NULL,
  offer VARCHAR(160) NOT NULL,
  price_toman BIGINT NOT NULL CHECK (price_toman > 0),
  duration_months SMALLINT NOT NULL CHECK (duration_months BETWEEN 1 AND 24),
  max_staff INTEGER NOT NULL CHECK (max_staff > 0),
  sms_included INTEGER NOT NULL DEFAULT 0 CHECK (sms_included >= 0),
  features TEXT NOT NULL DEFAULT '',
  sort_order SMALLINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO subscription_plans
  (code, title, offer, price_toman, duration_months, max_staff, sms_included, features, sort_order, is_active)
VALUES
  ('bronze', 'اشتراک برنزی پایه', 'بسته برنزی پایه (۱ ماهه)', 890000, 1, 3, 0, 'تا ۳ پرسنل', 1, TRUE),
  ('silver', 'اشتراک نقره‌ای', 'بسته نقره‌ای (۱ ماهه)', 1790000, 1, 8, 300, 'تا ۸ پرسنل، ۳۰۰ پیامک', 2, TRUE),
  ('gold_vip', 'اشتراک طلایی VIP', 'بسته طلایی VIP (۳ ماهه)', 3490000, 3, 999, 0, 'پرسنل نامحدود، پیامک رایگان، نشان تأیید', 3, TRUE)
ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title, offer = EXCLUDED.offer,
  price_toman = EXCLUDED.price_toman, duration_months = EXCLUDED.duration_months,
  max_staff = EXCLUDED.max_staff, sms_included = EXCLUDED.sms_included,
  features = EXCLUDED.features, sort_order = EXCLUDED.sort_order, updated_at = NOW();

CREATE TABLE IF NOT EXISTS subscription_payment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id VARCHAR(64) NOT NULL REFERENCES salons(id) ON DELETE RESTRICT,
  created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  plan_code VARCHAR(32) NOT NULL REFERENCES subscription_plans(code) ON DELETE RESTRICT,
  amount_toman BIGINT NOT NULL CHECK (amount_toman > 0),
  amount_rial BIGINT NOT NULL CHECK (amount_rial = amount_toman * 10),
  gateway VARCHAR(24) NOT NULL CHECK (gateway IN ('zarinpal')),
  status VARCHAR(24) NOT NULL DEFAULT 'creating'
    CHECK (status IN ('creating', 'pending', 'paid', 'failed', 'cancelled')),
  idempotency_key VARCHAR(80) NOT NULL,
  authority VARCHAR(64) NULL,
  gateway_reference VARCHAR(64) NULL,
  gateway_message VARCHAR(255) NULL,
  failure_code VARCHAR(64) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ NULL,
  CONSTRAINT uq_subscription_payment_idempotency UNIQUE (salon_id, idempotency_key),
  CONSTRAINT uq_subscription_payment_authority UNIQUE (gateway, authority),
  CONSTRAINT uq_subscription_payment_gateway_reference UNIQUE (gateway, gateway_reference)
);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_salon_created
  ON subscription_payment_attempts(salon_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_status_created
  ON subscription_payment_attempts(status, created_at DESC);

CREATE TABLE IF NOT EXISTS salon_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id VARCHAR(64) NOT NULL REFERENCES salons(id) ON DELETE RESTRICT,
  plan_code VARCHAR(32) NOT NULL REFERENCES subscription_plans(code) ON DELETE RESTRICT,
  payment_attempt_id UUID NOT NULL UNIQUE
    REFERENCES subscription_payment_attempts(id) ON DELETE RESTRICT,
  status VARCHAR(24) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'expired', 'superseded', 'cancelled')),
  price_toman BIGINT NOT NULL CHECK (price_toman > 0),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL CHECK (ends_at > starts_at),
  created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_salon_active_subscription
  ON salon_subscriptions(salon_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_salon_subscriptions_history
  ON salon_subscriptions(salon_id, created_at DESC);
