/**
 * NobatAra PostgreSQL Repository Tests (CATEGORY: database/real-PostgreSQL)
 *
 * Proves REAL persistence: migrations, repository writes readable via raw SQL,
 * transaction rollback, uniqueness constraints, and — critically — that the
 * repositories are NOT silently running on in-memory fallbacks.
 *
 * SKIPPED/BLOCKED honestly when TEST_DATABASE_URL is not configured.
 * A configured-but-unreachable database makes these tests FAIL (never skip).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DB_TESTS_ENABLED, initDatabaseUnderTest, type DbUnderTest } from './_setup.ts';

let db: DbUnderTest;

describe.skipIf(!DB_TESTS_ENABLED)('PostgreSQL repositories — migrations & persistence', () => {
  beforeAll(async () => {
    db = await initDatabaseUnderTest();
  }, 120_000);

  afterAll(async () => {
    if (db) {
      await db.cleanup();
      await db.raw.end();
    }
  });

  it('connected to a real PostgreSQL (no silent in-memory fallback)', async () => {
    expect(db.isDatabaseConfigured()).toBe(true);
    const probe = await db.getPool().query('SELECT version() AS v');
    expect(probe.rows[0].v).toContain('PostgreSQL');
  });

  it('applies and records all schema migrations', async () => {
    const applied = await db.raw.query(`SELECT name FROM schema_migrations ORDER BY name`);
    const names = applied.rows.map((r: any) => r.name);
    expect(names).toContain('001_initial_schema');
    expect(names).toContain('002_auth_and_sessions');
    expect(names).toContain('003_rbac_and_roles');
  });

  it('persists repository writes so raw SQL can read them back', async () => {
    const apptId = 't3-appt-persist';
    await db.appointmentRepository.create({
      id: apptId,
      trackingCode: 'T3-PERSIST',
      salonId: db.fixtures.salonId,
      serviceId: db.fixtures.serviceId,
      staffId: db.fixtures.staffId,
      clientName: 'مشتری پایداری',
      clientPhone: '09370000101',
      bookingDate: '2026-11-20',
      bookingTime: '10:00',
      endTime: '11:00',
      price: 500000,
      status: 'confirmed',
    });

    const rawRow = await db.raw.query(
      `SELECT client_name, booking_time, price FROM appointments WHERE id = $1`,
      [apptId]
    );
    expect(rawRow.rows.length).toBe(1);
    expect(rawRow.rows[0].client_name).toBe('مشتری پایداری');
    expect(rawRow.rows[0].booking_time).toBe('10:00');
    expect(Number(rawRow.rows[0].price)).toBe(500000);
  });

  it('reads rows created outside the repository layer (memory-fallback tripwire)', async () => {
    // Row inserted ONLY via raw SQL — the in-memory adapter could never see it.
    await db.raw.query(
      `INSERT INTO appointments (id, tracking_code, salon_id, service_id, staff_id, client_name, client_phone, booking_date, booking_time, end_time, price, payment_method, payment_status, status, is_demo)
       VALUES ('t3-appt-raw', 'T3-RAW', $1, $2, $3, 'مشتری خام', '09370000102', '2026-11-21', '12:00', '13:00', 500000, 'in_person', 'pending', 'confirmed', false)`,
      [db.fixtures.salonId, db.fixtures.serviceId, db.fixtures.staffId]
    );

    const found = await db.appointmentRepository.findById('t3-appt-raw');
    expect(found).toBeTruthy();
    expect(found!.client_name).toBe('مشتری خام');
  });

  it('rolls back the whole transaction when the callback throws', async () => {
    await expect(
      db.withTransaction(async (client: any) => {
        await client.query(
          `INSERT INTO services (id, salon_id, name, category, category_label, price, duration_minutes, is_active)
           VALUES ('t3-srv-tx', $1, 'خدمت باید حذف شود', 'hair', 'مو', 100000, 30, true)`,
          [db.fixtures.salonId]
        );
        throw new Error('deliberate rollback trigger');
      })
    ).rejects.toThrow('deliberate rollback trigger');

    const left = await db.raw.query(`SELECT id FROM services WHERE id = 't3-srv-tx'`);
    expect(left.rows.length).toBe(0); // rollback really rolled back
  });

  it('enforces uq_staff_slot: exact duplicate slot insert is rejected with 23505', async () => {
    // One existing appointment 10:00-11:00 for the fixture staff (created above)
    let pgError: any = null;
    try {
      await db.raw.query(
        `INSERT INTO appointments (id, tracking_code, salon_id, service_id, staff_id, client_name, client_phone, booking_date, booking_time, end_time, price, payment_method, payment_status, status, is_demo)
         VALUES ('t3-appt-dup', 'T3-DUP', $1, $2, $3, 'تکراری', '09370000103', '2026-11-20', '10:00', '11:00', 500000, 'in_person', 'pending', 'confirmed', false)`,
        [db.fixtures.salonId, db.fixtures.serviceId, db.fixtures.staffId]
      );
    } catch (err: any) {
      pgError = err;
    }
    expect(pgError).toBeTruthy();
    expect(pgError.code).toBe('23505');
  });
});

describe.skipIf(!DB_TESTS_ENABLED)('PostgreSQL schema integrity & canonical dates (Phase 06)', () => {
  beforeAll(async () => {
    db = await initDatabaseUnderTest();
  }, 120_000);

  afterAll(async () => {
    if (db) {
      await db.cleanup();
      await db.raw.end();
    }
  });

  it('re-runs migrations safely: migrateUp is idempotent and never destructive', async () => {
    const appliedAgain = await db.migrateUp();
    expect(appliedAgain).toEqual([]); // nothing left to apply, nothing reapplied
    const count = await db.raw.query(`SELECT COUNT(*)::int AS c FROM schema_migrations`);
    expect(count.rows[0].c).toBeGreaterThanOrEqual(4);
  });

  it('canonicalizes Jalali booking dates identically to the TypeScript util (SQL↔TS cross-verification)', async () => {
    // 1403/08/25 → must equal the TS util's conversion of the same input.
    const { parseBookingDateInput } = await import('../../server/utils/jalali.ts');
    const expected = parseBookingDateInput('1403/08/25')!.canonical;

    await db.raw.query(
      `INSERT INTO appointments (id, tracking_code, salon_id, service_id, staff_id, client_name, client_phone, booking_date, booking_time, end_time, price, payment_method, payment_status, status, is_demo)
       VALUES ('t3-appt-jalali', 'T3-JAL', $1, $2, $3, 'مشتری شمسی', '09370000104', '1403/08/25', '16:00', '17:00', 500000, 'in_person', 'pending', 'confirmed', false)`,
      [db.fixtures.salonId, db.fixtures.serviceId, db.fixtures.staffId]
    );

    const row = await db.raw.query(
      `SELECT booking_date, booking_date_greg::text AS greg FROM appointments WHERE id = 't3-appt-jalali'`
    );
    expect(row.rows[0].booking_date).toBe('1403/08/25'); // original preserved, never reinterpreted silently
    expect(row.rows[0].greg).toBe(expected); // SQL conversion == TS conversion
    expect(expected).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('rejects impossible Jalali dates as NULL canonical values (no silent reinterpretation)', async () => {
    const { jalaliToGregorian } = await import('../../server/utils/jalali.ts');

    // 1403 IS a Jalali leap year: Esfand 30 exists and both implementations
    // must agree on its Gregorian value.
    const tsLeap = jalaliToGregorian(1403, 12, 30);
    expect(tsLeap).toBeTruthy();
    const sqlLeap = await db.raw.query(`SELECT nobatara_jalali_to_gregorian(1403, 12, 30) AS g`);
    const tsIso = `${tsLeap!.gy}-${String(tsLeap!.gm).padStart(2, '0')}-${String(tsLeap!.gd).padStart(2, '0')}`;
    expect(String(sqlLeap.rows[0].g)).toBe(tsIso);

    // 1404 is NOT a leap year: Esfand 30 does not exist — both implementations
    // must reject it (NULL/null) instead of silently rolling over to Farvardin.
    const tsImpossible = jalaliToGregorian(1404, 12, 30);
    const sqlImpossible = await db.raw.query(`SELECT nobatara_jalali_to_gregorian(1404, 12, 30) AS g`);
    expect(tsImpossible).toBeNull();
    expect(sqlImpossible.rows[0].g).toBeNull();
  });

  it('rejects appointments referencing nonexistent salons (foreign key 23503)', async () => {
    let pgError: any = null;
    try {
      await db.raw.query(
        `INSERT INTO appointments (id, tracking_code, salon_id, service_id, staff_id, client_name, client_phone, booking_date, booking_date_greg, booking_time, end_time, price, payment_method, payment_status, status, is_demo)
         VALUES ('t3-appt-fk', 'T3-FK', 't3-nonexistent-salon', $1, $2, 'بدون سالن', '09370000105', '2026-11-22', '2026-11-22', '09:00', '10:00', 500000, 'in_person', 'pending', 'confirmed', false)`,
        [db.fixtures.serviceId, db.fixtures.staffId]
      );
    } catch (err: any) {
      pgError = err;
    }
    expect(pgError).toBeTruthy();
    expect(pgError.code).toBe('23503');
  });

  it('enforces one working-hours row per (salon, day) — duplicate insert rejected with 23505', async () => {
    let pgError: any = null;
    try {
      await db.raw.query(
        `INSERT INTO working_hours (salon_id, staff_id, day_of_week, start_time, end_time, is_closed)
         VALUES ($1, NULL, 0, '09:00', '18:00', false)`,
        [db.fixtures.salonId]
      );
      await db.raw.query(
        `INSERT INTO working_hours (salon_id, staff_id, day_of_week, start_time, end_time, is_closed)
         VALUES ($1, NULL, 0, '10:00', '19:00', false)`,
        [db.fixtures.salonId]
      );
    } catch (err: any) {
      pgError = err;
    }
    expect(pgError).toBeTruthy();
    expect(pgError.code).toBe('23505');
  });

  it('mixed-format dates can no longer alias the same staff slot (canonical uniqueness)', async () => {
    // Same calendar day, same staff, same time — one written in Jalali, one in
    // Gregorian ISO. The legacy VARCHAR constraint cannot see the collision;
    // the canonical uq_staff_slot_greg index must reject the second insert.
    const { jalaliToGregorian } = await import('../../server/utils/jalali.ts');
    const j = jalaliToGregorian(1404, 9, 5)!;
    const iso = `${j.gy}-${String(j.gm).padStart(2, '0')}-${String(j.gd).padStart(2, '0')}`;

    // Insert the ISO-form row via repository (canonical path)
    await db.appointmentRepository.create({
      id: 't3-appt-alias-1',
      trackingCode: 'T3-AL1',
      salonId: db.fixtures.salonId,
      serviceId: db.fixtures.serviceId,
      staffId: db.fixtures.staffId,
      clientName: 'قالب میلادی',
      clientPhone: '09370000106',
      bookingDate: iso,
      bookingTime: '11:00',
      endTime: '12:00',
      price: 500000,
      status: 'confirmed',
    });

    let pgError: any = null;
    try {
      // Same slot, Jalali spelling of the same day — must violate the canonical index
      await db.raw.query(
        `INSERT INTO appointments (id, tracking_code, salon_id, service_id, staff_id, client_name, client_phone, booking_date, booking_date_greg, booking_time, end_time, price, payment_method, payment_status, status, is_demo)
         VALUES ('t3-appt-alias-2', 'T3-AL2', $1, $2, $3, 'قالب شمسی', '09370000107', $4, $5, '11:00', '12:00', 500000, 'in_person', 'pending', 'confirmed', false)`,
        [
          db.fixtures.salonId,
          db.fixtures.serviceId,
          db.fixtures.staffId,
          '1404/09/05',
          iso,
        ]
      );
    } catch (err: any) {
      pgError = err;
    }
    expect(pgError).toBeTruthy();
    expect(pgError.code).toBe('23505');
  });
});

describe('Database test gate (always visible in reports)', () => {
  it('reports whether PostgreSQL-backed tests ran, were blocked, or failed', () => {
    if (!DB_TESTS_ENABLED) {
      console.warn(
        '[db-suite] BLOCKED — TEST_DATABASE_URL is not configured. PostgreSQL tests are SKIPPED (not passed). Configure an isolated test database to run them.'
      );
    }
    expect(true).toBe(true);
  });
});
