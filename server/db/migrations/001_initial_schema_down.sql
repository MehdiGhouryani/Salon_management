-- =============================================================================
-- NobatAra Migration 001 Rollback: Drop Initial Relational Schema
-- =============================================================================

DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS payment_records CASCADE;
DROP TABLE IF EXISTS appointment_status_history CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS salon_clients CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS availability_exceptions CASCADE;
DROP TABLE IF EXISTS working_hours CASCADE;
DROP TABLE IF EXISTS staff_services CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS staff CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS salon_memberships CASCADE;
DROP TABLE IF EXISTS salons CASCADE;
DROP TABLE IF EXISTS users CASCADE;
