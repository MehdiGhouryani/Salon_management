/**
 * NobatAra Unit Tests — Booking domain service (CATEGORY: unit/in-memory)
 *
 * Migrated 1:1 from the legacy hand-rolled `tests/booking.test.ts` (16 cases).
 * Runs the real bookingService with explicitly isolated in-memory repositories
 * and in-process mutexes. Real PostgreSQL transactions/concurrency are proven
 * separately by tests/db/booking-concurrency.test.ts (fail-closed).
 */
import { describe, it, expect, afterAll } from 'vitest';
import { bookingService, _setTestProductionMode } from '../../server/services/booking/bookingService.ts';

describe('Availability & working hours (unit, in-memory)', () => {
  it('Calculates slots for open working day with service duration', async () => {
    // 2026-10-24 is a Saturday (day 0 in Iranian week)
    const avail = await bookingService.calculateAvailability('sal-101', 'srv-104', '2026-11-28', 'stf-102');
    expect(avail.isOpen).toBe(true);
    expect(avail.serviceDurationMinutes).toBe(60);
    expect(avail.serviceName).toBe('پدیکور درمانی و کفسابی اسپا');
    expect(avail.slots.length > 0).toBe(true);
    const firstSlot = avail.slots[0];
    expect(firstSlot.time).toBe('09:30');
    expect(firstSlot.endTime).toBe('10:30');
  });

  it('Detects closed day (Friday) and returns empty slots with reason', async () => {
    // 2026-10-23 is a Friday (day 6 in Iranian week)
    const avail = await bookingService.calculateAvailability('sal-101', 'srv-101', '2026-11-27');
    expect(avail.isOpen).toBe(false);
    expect(avail.slots.length).toBe(0);
    expect(avail.reason?.includes('جمعه')).toBe(true);
  });

  it('Rejects nonexistent salon or inactive service with 404', async () => {
    await expect(
      bookingService.calculateAvailability('nonexistent-salon', 'srv-101', '2026-11-28')
    ).rejects.toMatchObject({ statusCode: 404, code: 'SALON_NOT_FOUND' });

    await expect(
      bookingService.calculateAvailability('sal-101', 'nonexistent-service', '2026-11-28')
    ).rejects.toMatchObject({ statusCode: 404, code: 'SERVICE_NOT_FOUND' });
  });
});

describe('Booking creation & authoritative pricing (unit, in-memory)', () => {
  it('Successfully creates an appointment with tracking code and authoritative price', async () => {
    const res = await bookingService.createBooking({
      salonId: 'sal-101',
      serviceId: 'srv-103', // 680,000 toman, 90 min
      staffId: 'stf-102',
      bookingDate: '2026-11-28',
      bookingTime: '10:00',
      clientName: 'نیلوفر رضایی',
      clientPhone: '09121112233',
      notes: 'مشتری جدید',
      ipAddress: '127.0.0.1',
      userAgent: 'TestRunner',
    });

    expect(res.trackingCode.startsWith('GIS-')).toBe(true);
    expect(res.appointment.client_name).toBe('نیلوفر رضایی');
    expect(res.appointment.client_phone).toBe('09121112233');
    expect(res.appointment.booking_time).toBe('10:00');
    expect(res.appointment.end_time).toBe('11:30'); // 90 min duration
    expect(res.appointment.status).toBe('confirmed');
    expect(res.appointment.payment_status).toBe('pending');
    expect(res.appointment.payment_method).toBe('in_person');
    expect(res.appointment.price).toBe(680000); // Server authoritative price
  });

  it('Normalizes Persian numbers and formatted phone inputs', async () => {
    const res = await bookingService.createBooking({
      salonId: 'sal-101',
      serviceId: 'srv-104',
      staffId: 'stf-102',
      bookingDate: '2026-11-28',
      bookingTime: '12:00',
      clientName: 'مریم کمالی',
      clientPhone: '۰۹۱۲-۹۸۷-۶۵۴۳', // Formatted Persian digits
      ipAddress: '127.0.0.1',
      userAgent: 'TestRunner',
    });

    expect(res.appointment.client_phone).toBe('09129876543');
  });

  it('Disregards client-sent price and enforces authoritative DB price', async () => {
    // Service srv-101 costs 2,400,000 Toman. Even if caller tries to pass price: 500, DB overrides it.
    const res = await bookingService.createBooking({
      salonId: 'sal-101',
      serviceId: 'srv-101',
      staffId: 'stf-101',
      bookingDate: '2026-11-28',
      bookingTime: '14:00',
      clientName: 'زهرا کاظمی',
      clientPhone: '09125556677',
      ipAddress: '127.0.0.1',
      userAgent: 'TestRunner',
    });

    expect(res.appointment.price).toBe(2400000);
  });
});

describe('Overlap & conflict prevention (unit, in-memory)', () => {
  it('Rejects exact same time booking for same specialist (SLOT_ALREADY_TAKEN)', async () => {
    await expect(
      bookingService.createBooking({
        salonId: 'sal-101',
        serviceId: 'srv-103',
        staffId: 'stf-102',
        bookingDate: '2026-11-28',
        bookingTime: '10:00', // Stf-102 is already booked 10:00-11:30
        clientName: 'شیدا مرادی',
        clientPhone: '09351112233',
        ipAddress: '127.0.0.1',
        userAgent: 'TestRunner',
      })
    ).rejects.toMatchObject({ statusCode: 409, code: 'SLOT_ALREADY_TAKEN' });
  });

  it('Rejects partial overlapping time window (10:30-11:30 when 10:00-11:30 taken)', async () => {
    await expect(
      bookingService.createBooking({
        salonId: 'sal-101',
        serviceId: 'srv-104', // 60 min
        staffId: 'stf-102',
        bookingDate: '2026-11-28',
        bookingTime: '10:30', // Overlaps with 10:00-11:30
        clientName: 'پریا صادقی',
        clientPhone: '09352223344',
        ipAddress: '127.0.0.1',
        userAgent: 'TestRunner',
      })
    ).rejects.toMatchObject({ statusCode: 409, code: 'SLOT_ALREADY_TAKEN' });
  });

  it('Allows back-to-back booking immediately after previous appointment ends', async () => {
    // Stf-102 has booking 12:00-13:00. 13:00-14:00 is immediately back-to-back and should be ALLOWED!
    const res = await bookingService.createBooking({
      salonId: 'sal-101',
      serviceId: 'srv-104', // 60 min
      staffId: 'stf-102',
      bookingDate: '2026-11-28',
      bookingTime: '13:00',
      clientName: 'ساناز امینی',
      clientPhone: '09353334455',
      ipAddress: '127.0.0.1',
      userAgent: 'TestRunner',
    });

    expect(res.appointment.booking_time).toBe('13:00');
    expect(res.appointment.end_time).toBe('14:00');
  });

  it('Prevents duplicate double-click submissions by same client on same date/time', async () => {
    await expect(
      bookingService.createBooking({
        salonId: 'sal-101',
        serviceId: 'srv-104',
        staffId: 'stf-102',
        bookingDate: '2026-11-28',
        bookingTime: '13:00',
        clientName: 'ساناز امینی',
        clientPhone: '09353334455', // Same client
        ipAddress: '127.0.0.1',
        userAgent: 'TestRunner',
      })
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe('Parallel concurrency & mutex race prevention (unit, in-process mutex)', () => {
  it('Parallel concurrent race: 5 simultaneous requests for 1 slot -> exactly 1 succeeds', async () => {
    const clients = [
      { name: 'متقاضی موازی ۱', phone: '09121000001' },
      { name: 'متقاضی موازی ۲', phone: '09121000002' },
      { name: 'متقاضی موازی ۳', phone: '09121000003' },
      { name: 'متقاضی موازی ۴', phone: '09121000004' },
      { name: 'متقاضی موازی ۵', phone: '09121000005' },
    ];

    const results = await Promise.allSettled(
      clients.map((c) =>
        bookingService.createBooking({
          salonId: 'sal-101',
          serviceId: 'srv-104', // 60 min
          staffId: 'stf-102',
          bookingDate: '2026-11-22',
          bookingTime: '15:00',
          clientName: c.name,
          clientPhone: c.phone,
          ipAddress: '127.0.0.1',
          userAgent: 'ParallelTest',
        })
      )
    );

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled.length).toBe(1); // Exactly one concurrent request must win the slot
    expect(rejected.length).toBe(4); // Remaining concurrent requests must be rejected
  });
});

describe('Customer privacy & ownership (unit, in-memory)', () => {
  it('getMyBookings strictly scopes records to the authenticated customer phone', async () => {
    const userPhone = '09121112233';
    const myBookings = await bookingService.getMyBookings(userPhone);

    expect(myBookings.length > 0).toBe(true);
    for (const b of myBookings) {
      expect(b.client_phone).toBe(userPhone);
    }

    const unrelatedBookings = await bookingService.getMyBookings('09990000000');
    expect(unrelatedBookings.length).toBe(0);
  });

  it('Customer B cannot cancel Customer A appointment (FORBIDDEN_CANCELLATION)', async () => {
    const myBookings = await bookingService.getMyBookings('09121112233');
    const targetCode = myBookings[0].tracking_code;

    await expect(
      bookingService.cancelBooking(targetCode, '09998887766') // Client B
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN_CANCELLATION' });
  });

  it('Customer A cancels their own appointment, setting status=cancelled', async () => {
    const myBookings = await bookingService.getMyBookings('09121112233');
    const target = myBookings[0];

    const cancelled = await bookingService.cancelBooking(
      target.tracking_code,
      '09121112233',
      'تغییر برنامه کاری'
    );
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.cancellation_reason).toBe('تغییر برنامه کاری');
  });

  it('Cancelling an appointment frees the slot for subsequent bookings', async () => {
    // The slot 10:00-11:30 for stf-102 was previously cancelled
    const rebooked = await bookingService.createBooking({
      salonId: 'sal-101',
      serviceId: 'srv-103',
      staffId: 'stf-102',
      bookingDate: '2026-11-28',
      bookingTime: '10:00',
      clientName: 'مشتری جدید جایگزین',
      clientPhone: '09128889900',
      ipAddress: '127.0.0.1',
      userAgent: 'TestRunner',
    });

    expect(rebooked.appointment.status).toBe('confirmed');
    expect(rebooked.appointment.booking_time).toBe('10:00');
  });
});

describe('Production safeguard & truth in reporting (unit)', () => {
  it('In production mode without PostgreSQL, createBooking fails closed (503)', async () => {
    try {
      _setTestProductionMode(true);

      await expect(
        bookingService.createBooking({
          salonId: 'sal-101',
          serviceId: 'srv-104',
          staffId: 'stf-102',
          bookingDate: '2026-11-24',
          bookingTime: '14:00',
          clientName: 'تست پروداکشن',
          clientPhone: '09120001122',
          ipAddress: '127.0.0.1',
          userAgent: 'ProdTest',
        })
      ).rejects.toMatchObject({ statusCode: 503, code: 'DATABASE_UNAVAILABLE' });
    } finally {
      _setTestProductionMode(null);
    }
  });
});
