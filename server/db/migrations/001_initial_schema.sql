-- =============================================================================
-- NobatAra Migration 001: Initial Relational Schema
-- Target: PostgreSQL 14+ / Cloud SQL for PostgreSQL
-- =============================================================================

-- Enable standard UUID and cryptography extensions if available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. USERS & IDENTITY
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL UNIQUE,
  full_name VARCHAR(128) NOT NULL,
  email VARCHAR(255) NULL,
  platform_role VARCHAR(32) NOT NULL DEFAULT 'user' 
    CHECK (platform_role IN ('user', 'super_admin', 'platform_support', 'platform_auditor')),
  status VARCHAR(32) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'pending')),
  two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  avatar_url TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_platform_role ON users(platform_role);

-- -----------------------------------------------------------------------------
-- 2. SALONS (TENANTS)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS salons (
  id VARCHAR(64) PRIMARY KEY,
  slug VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(128) NOT NULL DEFAULT 'زیبایی و سلامت',
  tagline TEXT NULL,
  owner_name VARCHAR(128) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255) NULL,
  province VARCHAR(64) NOT NULL,
  city VARCHAR(128) NOT NULL,
  address TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('active', 'pending', 'suspended', 'trial')),
  plan VARCHAR(32) NOT NULL DEFAULT 'bronze'
    CHECK (plan IN ('bronze', 'silver', 'gold_vip')),
  plan_expiry TIMESTAMPTZ NOT NULL,
  verified_badge BOOLEAN NOT NULL DEFAULT FALSE,
  timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Tehran',
  banner_image TEXT NULL,
  gallery_images TEXT[] NOT NULL DEFAULT '{}',
  features TEXT[] NOT NULL DEFAULT '{}',
  rating NUMERIC(3,2) NOT NULL DEFAULT 5.0 CHECK (rating >= 0 AND rating <= 5.0),
  reviews_count INT NOT NULL DEFAULT 0 CHECK (reviews_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_salons_slug ON salons(slug);
CREATE INDEX IF NOT EXISTS idx_salons_status ON salons(status);
CREATE INDEX IF NOT EXISTS idx_salons_city ON salons(city);

-- -----------------------------------------------------------------------------
-- 3. SALON MEMBERSHIPS (MULTI-TENANCY RBAC)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS salon_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  salon_id VARCHAR(64) NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  role VARCHAR(32) NOT NULL DEFAULT 'manager'
    CHECK (role IN ('owner', 'manager', 'staff', 'receptionist')),
  status VARCHAR(32) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'invited', 'suspended')),
  permissions JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_salon UNIQUE (user_id, salon_id)
);

CREATE INDEX IF NOT EXISTS idx_salon_memberships_user_id ON salon_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_salon_memberships_salon_id ON salon_memberships(salon_id);

-- -----------------------------------------------------------------------------
-- 4. USER SESSIONS (STATELESS / STATEFUL SESSION TRACKING)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ NULL,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- -----------------------------------------------------------------------------
-- 5. STAFF (SALON SPECIALISTS)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS staff (
  id VARCHAR(64) PRIMARY KEY,
  salon_id VARCHAR(64) NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(128) NOT NULL,
  phone VARCHAR(20) NULL,
  role VARCHAR(128) NOT NULL,
  specialty VARCHAR(128) NULL,
  avatar_url TEXT NULL,
  rating NUMERIC(3,2) NOT NULL DEFAULT 5.0 CHECK (rating >= 0 AND rating <= 5.0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_salon_id ON staff(salon_id);
CREATE INDEX IF NOT EXISTS idx_staff_is_active ON staff(is_active);

-- -----------------------------------------------------------------------------
-- 6. SERVICES (SALON CATALOG)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS services (
  id VARCHAR(64) PRIMARY KEY,
  salon_id VARCHAR(64) NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  name VARCHAR(128) NOT NULL,
  category VARCHAR(64) NOT NULL,
  category_label VARCHAR(64) NOT NULL,
  price BIGINT NOT NULL CHECK (price >= 0),
  duration_minutes INT NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
  description TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_salon_id ON services(salon_id);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_is_active ON services(is_active);

-- -----------------------------------------------------------------------------
-- 7. STAFF_SERVICES (MANY-TO-MANY MAPPING)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS staff_services (
  staff_id VARCHAR(64) NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  service_id VARCHAR(64) NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  custom_price BIGINT NULL CHECK (custom_price IS NULL OR custom_price >= 0),
  custom_duration_minutes INT NULL CHECK (custom_duration_minutes IS NULL OR custom_duration_minutes > 0),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (staff_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_services_service_id ON staff_services(service_id);

-- -----------------------------------------------------------------------------
-- 8. WORKING HOURS
-- -----------------------------------------------------------------------------
-- day_of_week: 0 = Saturday, 1 = Sunday, 2 = Monday, 3 = Tuesday, 4 = Wednesday, 5 = Thursday, 6 = Friday (Iranian calendar)
CREATE TABLE IF NOT EXISTS working_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id VARCHAR(64) NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  staff_id VARCHAR(64) NULL REFERENCES staff(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time VARCHAR(8) NOT NULL DEFAULT '09:00',
  end_time VARCHAR(8) NOT NULL DEFAULT '20:00',
  is_closed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_working_hours_salon_id ON working_hours(salon_id);
CREATE INDEX IF NOT EXISTS idx_working_hours_staff_id ON working_hours(staff_id);

-- -----------------------------------------------------------------------------
-- 9. AVAILABILITY EXCEPTIONS (HOLIDAYS, LEAVE, BLOCKED PERIODS)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS availability_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id VARCHAR(64) NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  staff_id VARCHAR(64) NULL REFERENCES staff(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time VARCHAR(8) NULL,
  end_time VARCHAR(8) NULL,
  reason VARCHAR(255) NOT NULL,
  exception_type VARCHAR(32) NOT NULL DEFAULT 'holiday'
    CHECK (exception_type IN ('holiday', 'sick_leave', 'personal', 'special_hours', 'emergency')),
  is_available BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_availability_exceptions_salon_id ON availability_exceptions(salon_id);
CREATE INDEX IF NOT EXISTS idx_availability_exceptions_staff_id ON availability_exceptions(staff_id);
CREATE INDEX IF NOT EXISTS idx_availability_exceptions_date ON availability_exceptions(start_date, end_date);

-- -----------------------------------------------------------------------------
-- 10. CLIENTS (GLOBAL CUSTOMER IDENTITY)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL UNIQUE,
  full_name VARCHAR(128) NOT NULL,
  email VARCHAR(255) NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);

-- -----------------------------------------------------------------------------
-- 11. SALON_CLIENTS (TENANT-CUSTOMER RELATIONSHIP)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS salon_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id VARCHAR(64) NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  total_bookings INT NOT NULL DEFAULT 0 CHECK (total_bookings >= 0),
  total_spent BIGINT NOT NULL DEFAULT 0 CHECK (total_spent >= 0),
  last_visit_at TIMESTAMPTZ NULL,
  notes TEXT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_salon_client UNIQUE (salon_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_salon_clients_salon_id ON salon_clients(salon_id);
CREATE INDEX IF NOT EXISTS idx_salon_clients_client_id ON salon_clients(client_id);

-- -----------------------------------------------------------------------------
-- 12. APPOINTMENTS (BOOKINGS)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointments (
  id VARCHAR(64) PRIMARY KEY,
  tracking_code VARCHAR(32) NOT NULL UNIQUE,
  salon_id VARCHAR(64) NOT NULL REFERENCES salons(id) ON DELETE RESTRICT,
  service_id VARCHAR(64) NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  staff_id VARCHAR(64) NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  client_id UUID NULL REFERENCES clients(id) ON DELETE SET NULL,
  client_name VARCHAR(128) NOT NULL,
  client_phone VARCHAR(20) NOT NULL,
  booking_date VARCHAR(32) NOT NULL,
  booking_time VARCHAR(10) NOT NULL,
  end_time VARCHAR(10) NULL,
  price BIGINT NOT NULL CHECK (price >= 0),
  payment_method VARCHAR(32) NOT NULL DEFAULT 'in_person',
  payment_status VARCHAR(32) NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid_in_person', 'refunded', 'waived')),
  status VARCHAR(32) NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
  cancellation_reason TEXT NULL,
  notes TEXT NULL,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_staff_slot UNIQUE (salon_id, staff_id, booking_date, booking_time)
);

CREATE INDEX IF NOT EXISTS idx_appointments_salon_id ON appointments(salon_id);
CREATE INDEX IF NOT EXISTS idx_appointments_client_phone ON appointments(client_phone);
CREATE INDEX IF NOT EXISTS idx_appointments_tracking_code ON appointments(tracking_code);
CREATE INDEX IF NOT EXISTS idx_appointments_date_time ON appointments(booking_date, booking_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- -----------------------------------------------------------------------------
-- 13. APPOINTMENT STATUS HISTORY (AUDIT TRAIL)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointment_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id VARCHAR(64) NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  old_status VARCHAR(32) NULL,
  new_status VARCHAR(32) NOT NULL,
  changed_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  changed_by_name VARCHAR(128) NOT NULL,
  reason TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointment_status_history_apt_id ON appointment_status_history(appointment_id);

-- -----------------------------------------------------------------------------
-- 14. PAYMENT RECORDS (FINANCIAL TRANSACTIONS)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id VARCHAR(64) NOT NULL REFERENCES salons(id) ON DELETE RESTRICT,
  appointment_id VARCHAR(64) NULL REFERENCES appointments(id) ON DELETE SET NULL,
  client_id UUID NULL REFERENCES clients(id) ON DELETE SET NULL,
  amount BIGINT NOT NULL,
  currency VARCHAR(16) NOT NULL DEFAULT 'IRT',
  transaction_type VARCHAR(32) NOT NULL
    CHECK (transaction_type IN ('in_person_service', 'subscription', 'sms_topup', 'refund')),
  status VARCHAR(32) NOT NULL DEFAULT 'completed'
    CHECK (status IN ('completed', 'pending', 'failed', 'refunded')),
  payment_method VARCHAR(32) NOT NULL DEFAULT 'pos_terminal'
    CHECK (payment_method IN ('cash', 'pos_terminal', 'card_to_card', 'zarinpal', 'saman', 'mellat')),
  reference_number VARCHAR(64) NULL,
  metadata JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_records_salon_id ON payment_records(salon_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_appointment_id ON payment_records(appointment_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_status ON payment_records(status);

-- -----------------------------------------------------------------------------
-- 15. AUDIT LOGS (PLATFORM SECURITY & GOVERNANCE)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor VARCHAR(128) NOT NULL,
  actor_role VARCHAR(64) NOT NULL,
  action VARCHAR(128) NOT NULL,
  target VARCHAR(128) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT NOT NULL,
  severity VARCHAR(32) NOT NULL DEFAULT 'info'
    CHECK (severity IN ('info', 'warning', 'critical')),
  category VARCHAR(64) NOT NULL DEFAULT 'business'
    CHECK (category IN ('auth', 'privilege', 'business', 'financial', 'system')),
  details JSONB NULL,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(category);
