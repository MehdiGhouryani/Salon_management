-- =============================================================================
-- Migration 004 DOWN: revert canonical date storage + schedule integrity
-- =============================================================================
-- Recovery implications: SAFE. The original appointments.booking_date column
-- was never modified by the forward migration (only new columns/indexes were
-- added), so dropping the added structures loses no booking data:
--   - booking_date      : untouched original strings (source of truth on rollback)
--   - booking_date_legacy : preserved raw values (dropped; identical to booking_date)
--   - booking_date_greg : derived canonical values (dropped; recomputable by re-running 004)
-- Slot overlap/uniqueness semantics revert to the legacy VARCHAR constraint.
-- =============================================================================

DROP INDEX IF EXISTS uq_staff_slot_greg;
DROP INDEX IF EXISTS uq_working_hours_salon_day_staff;
DROP INDEX IF EXISTS idx_appointments_salon_date_greg;

ALTER TABLE appointments DROP COLUMN IF EXISTS booking_date_greg;
ALTER TABLE appointments DROP COLUMN IF EXISTS booking_date_legacy;

DROP FUNCTION IF EXISTS nobatara_jalali_to_gregorian(INT, INT, INT);
