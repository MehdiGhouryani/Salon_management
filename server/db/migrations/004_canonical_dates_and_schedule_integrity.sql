-- =============================================================================
-- Migration 004: Canonical date storage + schedule integrity
-- =============================================================================
-- Forward-only correction approved in Phase 06 (Database Reliability):
--
-- 1. appointments.booking_date is a VARCHAR today and production data can mix
--    Gregorian ISO ("2026-11-13") and Jalali ("1404/08/23") strings. Mixed
--    formats silently break slot-uniqueness semantics (the same day can occupy
--    two distinct constraint values) and make date queries unreliable.
--
-- 2. This migration introduces ONE canonical calendar date column
--    (booking_date_greg DATE, Gregorian, Asia/Tehran business timezone is a
--    presentation concern and does not affect the DATE value) WITHOUT touching
--    the original booking_date values. The original strings are additionally
--    preserved in booking_date_legacy so no data is ever reinterpreted
--    silently: Jalali values are converted by a round-trip-verified algorithm
--    identical to server/utils/jalali.ts, and anything unparseable is left
--    with booking_date_greg IS NULL and remains fully intact in
--    booking_date / booking_date_legacy.
--
-- 3. Adds the missing schedule-integrity constraints:
--    - uq_working_hours_salon_day_staff: one working-hours row per
--      (salon, staff-or-salon-level, weekday)
--    - uq_staff_slot_greg: canonical staff-slot uniqueness on the DATE column
--      (the legacy uq_staff_slot on the VARCHAR stays in place so mixed-format
--      legacy rows keep their existing protection until converted)
--
-- Recovery: the down migration drops only the added columns/indexes/function.
-- The original booking_date column is never modified by this migration, so a
-- rollback loses no data. A post-migration report query for rows whose date
-- could not be canonicalized is documented at the bottom.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Preserve the original raw strings (idempotent, never overwrites)
-- -----------------------------------------------------------------------------
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS booking_date_legacy VARCHAR(32) NULL;

UPDATE appointments
SET booking_date_legacy = booking_date
WHERE booking_date_legacy IS NULL;

-- -----------------------------------------------------------------------------
-- 2. Jalali → Gregorian conversion (same algorithm as server/utils/jalali.ts).
--    Round-trip verified: impossible Jalali dates return NULL instead of
--    silently rolling over to the next month.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION nobatara_jalali_to_gregorian(jy_in INT, jm INT, jd INT)
RETURNS DATE AS $$
DECLARE
  jy INT;
  days BIGINT;
  gy INT;
  gd BIGINT;
  gm INT;
  g INT;
  month_lengths INT[];
  leap BOOLEAN;
  rjy INT;
  rjm INT;
  rjd INT;
  g_d_m INT[] := ARRAY[0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  gy2 INT;
  jdn_days BIGINT;
BEGIN
  IF jy_in IS NULL OR jm IS NULL OR jd IS NULL THEN
    RETURN NULL;
  END IF;
  IF jm < 1 OR jm > 12 OR jd < 1 OR jy_in < 1178 OR jy_in > 1633 THEN
    RETURN NULL;
  END IF;
  IF jm <= 6 AND jd > 31 THEN RETURN NULL; END IF;
  IF jm > 6 AND jd > 30 THEN RETURN NULL; END IF;

  -- Jalali → Gregorian (JDF 33-year rule)
  jy := jy_in + 1595;
  days := -355668 + (365 * jy) + FLOOR(jy / 33)::BIGINT * 8
          + FLOOR(((jy % 33) + 3) / 4)::BIGINT + jd
          + CASE WHEN jm < 7 THEN (jm - 1) * 31 ELSE ((jm - 7) * 30) + 186 END;

  gy := 400 * FLOOR(days / 146097)::INT;
  days := days % 146097;
  IF days > 36524 THEN
    days := days - 1;
    gy := gy + 100 * FLOOR(days / 36524)::INT;
    days := days % 36524;
    IF days >= 365 THEN days := days + 1; END IF;
  END IF;
  gy := gy + 4 * FLOOR(days / 1461)::INT;
  days := days % 1461;
  IF days > 365 THEN
    gy := gy + FLOOR((days - 1) / 365)::INT;
    days := (days - 1) % 365;
  END IF;
  gd := days + 1;

  leap := ((gy % 4 = 0 AND gy % 100 <> 0) OR gy % 400 = 0);
  -- PL/pgSQL arrays are 1-BASED: index 1 must be January (31 days). The
  -- original port kept the TypeScript util's 0-based padding element, which
  -- shifted every month walk one month late (caught by the Phase 18 DB suite:
  -- 1403/08/25 resolved to 2024-12-14 instead of 2024-11-15).
  month_lengths := ARRAY[31, CASE WHEN leap THEN 29 ELSE 28 END, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  gm := 1;
  WHILE gm <= 12 AND gd > month_lengths[gm] LOOP
    gd := gd - month_lengths[gm];
    gm := gm + 1;
  END LOOP;
  IF gm > 12 THEN RETURN NULL; END IF;

  -- Round-trip validation: Gregorian → Jalali must return exactly the input.
  -- (Gregorian → Jalali, JDF 33-year rule)
  jdn_days := 0;
  jy := CASE WHEN gy <= 1600 THEN 0 ELSE 979 END;
  g := CASE WHEN gy <= 1600 THEN gy - 621 ELSE gy - 1600 END;
  gy2 := CASE WHEN gm > 2 THEN g + 1 ELSE g END;
  -- g_d_m is 1-BASED here (index 0 does not exist in PL/pgSQL), so the
  -- cumulative-days lookup for month gm is g_d_m[gm] — the TypeScript/PHP
  -- originals use 0-based g_d_m[gm-1] where element 0 is the padding zero.
  jdn_days := (365 * g) + FLOOR((gy2 + 3) / 4)::BIGINT - FLOOR((gy2 + 99) / 100)::BIGINT
              + FLOOR((gy2 + 399) / 400)::BIGINT - 80 + gd + g_d_m[gm];
  jy := jy + 33 * FLOOR(jdn_days / 12053)::INT;
  jdn_days := jdn_days % 12053;
  jy := jy + 4 * FLOOR(jdn_days / 1461)::INT;
  jdn_days := jdn_days % 1461;
  IF jdn_days > 365 THEN
    jy := jy + FLOOR((jdn_days - 1) / 365)::INT;
    jdn_days := (jdn_days - 1) % 365;
  END IF;
  IF jdn_days < 186 THEN
    rjm := 1 + FLOOR(jdn_days / 31)::INT;
    rjd := 1 + (jdn_days % 31)::INT;
  ELSE
    rjm := 7 + FLOOR((jdn_days - 186) / 30)::INT;
    rjd := 1 + ((jdn_days - 186) % 30)::INT;
  END IF;
  rjy := jy;

  IF rjy <> jy_in OR rjm <> jm OR rjd <> jd THEN
    RETURN NULL;
  END IF;

  RETURN MAKE_DATE(gy, gm, gd::INT);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- -----------------------------------------------------------------------------
-- 3. Canonical DATE column + backfill
-- -----------------------------------------------------------------------------
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS booking_date_greg DATE NULL;

-- Gregorian ISO strings convert directly.
UPDATE appointments
SET booking_date_greg = (booking_date)::date
WHERE booking_date_greg IS NULL
  AND booking_date ~ '^\d{4}-\d{2}-\d{2}$';

-- Jalali strings convert through the round-trip-verified function.
UPDATE appointments
SET booking_date_greg = nobatara_jalali_to_gregorian(
      SPLIT_PART(booking_date, '/', 1)::INT,
      SPLIT_PART(booking_date, '/', 2)::INT,
      SPLIT_PART(booking_date, '/', 3)::INT
    )
WHERE booking_date_greg IS NULL
  AND booking_date ~ '^\d{4}/\d{1,2}/\d{1,2}$';

-- Anything else stays booking_date_greg IS NULL: the original value is intact
-- in booking_date / booking_date_legacy. Report such rows after migration:
--   SELECT id, booking_date, booking_date_legacy FROM appointments WHERE booking_date_greg IS NULL;

-- -----------------------------------------------------------------------------
-- 4. Schedule integrity constraints
-- -----------------------------------------------------------------------------
-- Deduplicate pre-existing working-hours rows before the unique index can be
-- created (the old code path could insert multiple rows per salon/day). Keeps
-- the most recently updated row per (salon, staff-or-salon-level, weekday).
DELETE FROM working_hours a
USING working_hours b
WHERE a.salon_id = b.salon_id
  AND COALESCE(a.staff_id::text, '') = COALESCE(b.staff_id::text, '')
  AND a.day_of_week = b.day_of_week
  AND (a.updated_at, a.id::text) < (b.updated_at, b.id::text);

-- One working-hours row per (salon, staff-or-salon-level, weekday). Salon-level
-- rows (staff_id IS NULL) are keyed with a fixed sentinel string so they cannot
-- collide with a real staff row. staff_id is VARCHAR(64) in migration 001, so
-- the sentinel must stay in the same type domain (a ::uuid cast here fails on
-- real PostgreSQL with "COALESCE types character varying and uuid").
CREATE UNIQUE INDEX IF NOT EXISTS uq_working_hours_salon_day_staff
  ON working_hours (salon_id, COALESCE(staff_id, '00000000-0000-0000-0000-000000000000'), day_of_week);

-- Canonical staff-slot uniqueness on the DATE column (cancelled appointments
-- do not occupy a slot). The legacy uq_staff_slot on the VARCHAR remains so
-- mixed-format legacy rows keep their existing protection.
CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_slot_greg
  ON appointments (salon_id, staff_id, booking_date_greg, booking_time)
  WHERE booking_date_greg IS NOT NULL AND status <> 'cancelled';

-- Date-range lookups (availability, dashboards) run against the DATE column.
CREATE INDEX IF NOT EXISTS idx_appointments_salon_date_greg
  ON appointments (salon_id, booking_date_greg, booking_time);
