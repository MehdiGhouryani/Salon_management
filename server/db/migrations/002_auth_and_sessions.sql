-- =============================================================================
-- NobatAra Migration 002: Authentication Challenges & Session Hardening
-- Additive migration for OTP challenges, rate limiting, and session security
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. OTP CHALLENGES (PERSISTENT MULTI-INSTANCE VERIFICATION)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS otp_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL,
  purpose VARCHAR(32) NOT NULL DEFAULT 'login'
    CHECK (purpose IN ('login', 'booking_verification', 'admin_step_up')),
  code_hash VARCHAR(64) NOT NULL,
  attempts INT NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts INT NOT NULL DEFAULT 3 CHECK (max_attempts > 0),
  resend_available_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ NULL,
  ip_address VARCHAR(45) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_challenges_phone_purpose ON otp_challenges(phone, purpose, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_otp_challenges_expires_at ON otp_challenges(expires_at);

-- -----------------------------------------------------------------------------
-- 2. CLIENT TO USER LINKAGE (PERSISTENT CUSTOMER IDENTITY)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE clients ADD COLUMN user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. USER SESSIONS HARDENING (IDLE TIMEOUT & ROTATION TRACKING)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_sessions' AND column_name = 'idle_expires_at'
  ) THEN
    ALTER TABLE user_sessions ADD COLUMN idle_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '2 hours');
    CREATE INDEX IF NOT EXISTS idx_user_sessions_idle ON user_sessions(idle_expires_at);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_sessions' AND column_name = 'session_type'
  ) THEN
    ALTER TABLE user_sessions ADD COLUMN session_type VARCHAR(32) NOT NULL DEFAULT 'web'
      CHECK (session_type IN ('web', 'mobile', 'api'));
  END IF;
END $$;
