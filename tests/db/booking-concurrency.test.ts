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

describe.skipIf(!DB_TESTS_ENABLED)('PostgreSQL booking rules & rollback (Phase 09, real DB)', () => {
  beforeAll(async () => {
    db = await initDatabaseUnderTest();
  }, 120_000);

  afterAll(async () => {
    if (db) {
      await db.cleanup();
      await db.raw.end();
    }
  });

  it('different service durations produce overlapping intervals that conflict', async () => {
    // t3-srv-1 = 60 min, t3-srv-2 = 90 min. 10:00-11:00 then 10:30 (90min) overlaps.
    await db.bookingService.createBooking({
      salonId: db.fixtures.salonId,
      serviceId: db.fixtures.serviceId,
      staffId: db.fixtures.staffId,
      bookingDate: '2026-11-25',
      bookingTime: '10:00',
      clientName: 'مدت ۶۰ دقیقه',
      clientPhone: '09370000501',
      ipAddress: '127.0.0.1',
      userAgent: 'duration-probe',
    });

    await expect(
      db.bookingService.createBooking({
        salonId: db.fixtures.salonId,
        serviceId: db.fixtures.service2Id,
        staffId: db.fixtures.staffId,
        bookingDate: '2026-11-25',
        bookingTime: '10:30',
        clientName: 'مدت ۹۰ دقیقه',
        clientPhone: '09370000502',
        ipAddress: '127.0.0.1',
        userAgent: 'duration-probe',
      })
    ).rejects.toMatchObject({ code: 'SLOT_ALREADY_TAKEN' });
  });

  it('fail-safe: bookings without configured working hours are rejected', async () => {
    await db.salonRepository.create({
      id: 't3-salon-nohours', slug: 't3-nohours', name: 'سالن بدون ساعات کاری',
      ownerName: 'تست', phone: '09370000003', province: 'تهران', city: 'تهران',
      address: 'تهران', status: 'active', planExpiry: new Date('2027-01-01'),
    }).catch(() => {});
    await db.serviceRepository.create({
      id: 't3-srv-nohours', salonId: 't3-salon-nohours', name: 'خدمت بدون برنامه',
      category: 'hair', categoryLabel: 'مو', price: 100000, durationMinutes: 30, isActive: true,
    }).catch(() => {});
    await db.staffRepository.create({
      id: 't3-stf-nohours', salonId: 't3-salon-nohours', name: 'متخصص بدون برنامه',
      phone: '09370000004', role: 'متخصص', specialty: '', rating: 4, isActive: true,
    }).catch(() => {});
    await db.staffRepository.assignService('t3-stf-nohours', 't3-srv-nohours');

    await expect(
      db.bookingService.createBooking({
        salonId: 't3-salon-nohours',
        serviceId: 't3-srv-nohours',
        staffId: 't3-stf-nohours',
        bookingDate: '2026-11-26',
        bookingTime: '10:00',
        clientName: 'بدون برنامه',
        clientPhone: '09370000503',
        ipAddress: '127.0.0.1',
        userAgent: 'failsafe-probe',
      })
    ).rejects.toMatchObject({ code: 'WORKING_HOURS_NOT_CONFIGURED' });

    await db.raw.query(`DELETE FROM staff_services WHERE staff_id = 't3-stf-nohours'`);
    await db.raw.query(`DELETE FROM staff WHERE id = 't3-stf-nohours'`);
    await db.raw.query(`DELETE FROM services WHERE id = 't3-srv-nohours'`);
    await db.raw.query(`DELETE FROM salons WHERE id = 't3-salon-nohours'`);
  });

  it('rejects past dates (PAST_DATE_NOT_ALLOWED)', async () => {
    await expect(
      db.bookingService.createBooking({
        salonId: db.fixtures.salonId,
        serviceId: db.fixtures.serviceId,
        staffId: db.fixtures.staffId,
        bookingDate: '2020-01-01',
        bookingTime: '10:00',
        clientName: 'تاریخ گذشته',
        clientPhone: '09370000504',
        ipAddress: '127.0.0.1',
        userAgent: 'past-probe',
      })
    ).rejects.toMatchObject({ code: 'PAST_DATE_NOT_ALLOWED' });
  });

  it('a holiday exception blocks bookings for that date', async () => {
    await db.salonRepository.addAvailabilityException({
      salonId: db.fixtures.salonId,
      startDate: '2026-11-27',
      endDate: '2026-11-27',
      reason: 'تعطیلی آزمایشی فاز ۹',
      exceptionType: 'holiday',
      isAvailable: false,
    });

    await expect(
      db.bookingService.createBooking({
        salonId: db.fixtures.salonId,
        serviceId: db.fixtures.serviceId,
        staffId: db.fixtures.staffId,
        bookingDate: '2026-11-27',
        bookingTime: '10:00',
        clientName: 'روز تعطیل',
        clientPhone: '09370000506',
        ipAddress: '127.0.0.1',
        userAgent: 'holiday-probe',
      })
    ).rejects.toMatchObject({ code: 'SCHEDULE_EXCEPTION_BLOCKED' });

    const all = await db.salonRepository.getAllAvailabilityExceptions(db.fixtures.salonId);
    for (const e of all) {
      if (e.reason === 'تعطیلی آزمایشی فاز ۹') {
        await db.salonRepository.deleteAvailabilityException(db.fixtures.salonId, e.id);
      }
    }
  });

  it('a failed booking never double-burns the grant; slot conflicts reject cleanly', async () => {
    const { bookingGrantService } = await import('../../server/services/auth/bookingGrantService.ts');
    const { token } = await bookingGrantService.issueGrant('09370000507');

    const created = await db.bookingService.createBooking({
      salonId: db.fixtures.salonId,
      serviceId: db.fixtures.serviceId,
      staffId: db.fixtures.staffId,
      bookingDate: '2026-11-25',
      bookingTime: '16:00',
      clientName: 'دارنده مجوز',
      clientPhone: '09370000507',
      ipAddress: '127.0.0.1',
      userAgent: 'rollback-probe',
      bookingGrant: token,
    });
    expect(created.trackingCode).toBeTruthy();

    // Same grant + same slot: slot conflict wins; grant state stays consistent.
    await expect(
      db.bookingService.createBooking({
        salonId: db.fixtures.salonId,
        serviceId: db.fixtures.serviceId,
        staffId: db.fixtures.staffId,
        bookingDate: '2026-11-25',
        bookingTime: '16:00',
        clientName: 'دارنده مجوز',
        clientPhone: '09370000507',
        ipAddress: '127.0.0.1',
        userAgent: 'rollback-probe',
        bookingGrant: token,
      })
    ).rejects.toMatchObject({ code: 'SLOT_ALREADY_TAKEN' });

    await expect(
      bookingGrantService.consumeGrant(token, '09370000507')
    ).rejects.toMatchObject({ code: 'BOOKING_GRANT_ALREADY_USED' });
  });

  it('concurrent reschedules to the same slot: exactly one wins (advisory lock in tx)', async () => {
    const a = await db.bookingService.createBooking({
      salonId: db.fixtures.salonId,
      serviceId: db.fixtures.serviceId,
      staffId: db.fixtures.staffId,
      bookingDate: '2026-11-25',
      bookingTime: '12:00',
      clientName: 'جابجایی الف',
      clientPhone: '09370000508',
      ipAddress: '127.0.0.1',
      userAgent: 'resched-race',
    });
    const b = await db.bookingService.createBooking({
      salonId: db.fixtures.salonId,
      serviceId: db.fixtures.serviceId,
      staffId: db.fixtures.staffId,
      bookingDate: '2026-11-25',
      bookingTime: '13:00',
      clientName: 'جابجایی ب',
      clientPhone: '09370000509',
      ipAddress: '127.0.0.1',
      userAgent: 'resched-race',
    });

    const results = await Promise.allSettled([
      db.bookingService.rescheduleAppointment({
        salonId: db.fixtures.salonId,
        appointmentId: a.appointment.id,
        newDate: '2026-11-25',
        newTime: '18:00',
        actorName: 'مدیر تست',
      }),
      db.bookingService.rescheduleAppointment({
        salonId: db.fixtures.salonId,
        appointmentId: b.appointment.id,
        newDate: '2026-11-25',
        newTime: '18:00',
        actorName: 'مدیر تست',
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    expect((rejected[0] as PromiseRejectedResult).reason?.code).toBe('SLOT_ALREADY_TAKEN');
  });
});
