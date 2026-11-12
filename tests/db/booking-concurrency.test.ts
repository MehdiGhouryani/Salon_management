/**
 * NobatAra PostgreSQL Booking Concurrency Tests (CATEGORY: database/real-PostgreSQL)
 *
 * Proves the real booking race behavior against actual PostgreSQL transactions:
 *  - exact-slot race: 5 parallel createBooking calls → exactly 1 wins
 *    (uq_staff_slot unique constraint + transaction-scoped advisory lock)
 *  - partial-overlap race (R7 regression): 2 parallel bookings with
 *    overlapping-but-different start times and NO pre-existing rows → exactly 1
 *    wins (this is what the advisory xact lock + FOR UPDATE hardening guarantees;
 *    under plain READ COMMITTED both transactions could pass the overlap check)
 *
 * SKIPPED/BLOCKED honestly when TEST_DATABASE_URL is not configured.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DB_TESTS_ENABLED, initDatabaseUnderTest, type DbUnderTest } from './_setup.ts';

let db: DbUnderTest;

describe.skipIf(!DB_TESTS_ENABLED)('PostgreSQL booking concurrency (real transactions)', () => {
  beforeAll(async () => {
    db = await initDatabaseUnderTest();
  }, 120_000);

  afterAll(async () => {
    if (db) {
      await db.cleanup();
      await db.raw.end();
    }
  });

  it('exact-slot race: 5 simultaneous createBooking calls for one slot → exactly 1 succeeds', async () => {
    const phoneBases = ['09370000201', '09370000202', '09370000203', '09370000204', '09370000205'];

    const results = await Promise.allSettled(
      phoneBases.map((phone, i) =>
        db.bookingService.createBooking({
          salonId: db.fixtures.salonId,
          serviceId: db.fixtures.serviceId,
          staffId: db.fixtures.staffId,
          bookingDate: '2026-11-20',
          bookingTime: '15:00',
          clientName: `متقاضی موازی ${i + 1}`,
          clientPhone: phone,
          ipAddress: '127.0.0.1',
          userAgent: 'pg-race-test',
        })
      )
    );

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(4);

    // Losing requests must fail with the structured booking conflict, not crash
    for (const r of rejected) {
      expect((r as PromiseRejectedResult).reason?.code).toBe('SLOT_ALREADY_TAKEN');
    }

    // Exactly one row persisted for that slot
    const persisted = await db.raw.query(
      `SELECT COUNT(*)::int AS c FROM appointments WHERE salon_id = $1 AND staff_id = $2 AND booking_date = '2026-11-20' AND booking_time = '15:00' AND status <> 'cancelled'`,
      [db.fixtures.salonId, db.fixtures.staffId]
    );
    expect(persisted.rows[0].c).toBe(1);
  });

  it('R7 regression: parallel partial-overlap bookings with no prior rows → exactly 1 succeeds', async () => {
    // Two bookings that overlap (10:00-11:00 vs 10:30-11:30) created CONCURRENTLY.
    // Neither exists beforehand, so the unique constraint alone cannot prevent
    // the double-booking; the advisory xact lock + FOR UPDATE serialization must.
    const results = await Promise.allSettled([
      db.bookingService.createBooking({
        salonId: db.fixtures.salonId,
        serviceId: db.fixtures.serviceId,
        staffId: db.fixtures.staffId,
        bookingDate: '2026-11-21',
        bookingTime: '10:00',
        clientName: 'متقاضی همپوشان اول',
        clientPhone: '09370000301',
        ipAddress: '127.0.0.1',
        userAgent: 'pg-overlap-race-a',
      }),
      db.bookingService.createBooking({
        salonId: db.fixtures.salonId,
        serviceId: db.fixtures.serviceId,
        staffId: db.fixtures.staffId,
        bookingDate: '2026-11-21',
        bookingTime: '10:30',
        clientName: 'متقاضی همپوشان دوم',
        clientPhone: '09370000302',
        ipAddress: '127.0.0.1',
        userAgent: 'pg-overlap-race-b',
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    expect((rejected[0] as PromiseRejectedResult).reason?.code).toBe('SLOT_ALREADY_TAKEN');

    // And the persisted pair must really be 10:00-11:00 (the winner)
    const persisted = await db.raw.query(
      `SELECT booking_time, end_time FROM appointments WHERE salon_id = $1 AND staff_id = $2 AND booking_date = '2026-11-21' AND status <> 'cancelled'`,
      [db.fixtures.salonId, db.fixtures.staffId]
    );
    expect(persisted.rows.length).toBe(1);
    expect(persisted.rows[0].booking_time).toBe('10:00');
  });
});
