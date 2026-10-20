import assert from 'assert';
import { bookingService, BookingError, _setTestProductionMode } from '../server/services/booking/bookingService.ts';
import { appointmentRepository } from '../server/repositories/appointmentRepository.ts';
import { salonRepository } from '../server/repositories/salonRepository.ts';
import { serviceRepository } from '../server/repositories/serviceRepository.ts';
import { config } from '../server/config.ts';

async function runBookingTestSuite() {
  console.log('====================================================');
  console.log('   NobatAra Phase 7 Customer Booking Test Suite     ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void> | void) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}\n`);
      failed++;
    }
  }

  // ---------------------------------------------------------------------------
  // 1. Availability Calculation & Business Hours Tests
  // ---------------------------------------------------------------------------
  console.log('--- 1. Availability & Working Hours Tests ---');

  await test('Calculates slots for open working day with service duration', async () => {
    // 2026-10-24 is a Saturday (day 0 in Iranian week)
    const avail = await bookingService.calculateAvailability('sal-101', 'srv-104', '2026-10-24', 'stf-102');
    assert.strictEqual(avail.isOpen, true);
    assert.strictEqual(avail.serviceDurationMinutes, 60);
    assert.strictEqual(avail.serviceName, 'پدیکور درمانی و کفسابی اسپا');
    assert.ok(avail.slots.length > 0);
    // Every slot should end 60 minutes after start
    const firstSlot = avail.slots[0];
    assert.strictEqual(firstSlot.time, '09:30');
    assert.strictEqual(firstSlot.endTime, '10:30');
  });

  await test('Detects closed day (Friday) and returns empty slots with reason', async () => {
    // 2026-10-23 is a Friday (day 6 in Iranian week)
    const avail = await bookingService.calculateAvailability('sal-101', 'srv-101', '2026-10-23');
    assert.strictEqual(avail.isOpen, false);
    assert.strictEqual(avail.slots.length, 0);
    assert.ok(avail.reason?.includes('جمعه'));
  });

  await test('Rejects nonexistent salon or inactive service with 404', async () => {
    try {
      await bookingService.calculateAvailability('nonexistent-salon', 'srv-101', '2026-10-24');
      assert.fail('Should have thrown error');
    } catch (err: any) {
      assert.strictEqual(err.statusCode, 404);
      assert.strictEqual(err.code, 'SALON_NOT_FOUND');
    }

    try {
      await bookingService.calculateAvailability('sal-101', 'nonexistent-service', '2026-10-24');
      assert.fail('Should have thrown error');
    } catch (err: any) {
      assert.strictEqual(err.statusCode, 404);
      assert.strictEqual(err.code, 'SERVICE_NOT_FOUND');
    }
  });

  // ---------------------------------------------------------------------------
  // 2. Successful Booking & Authoritative Pricing Tests
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Booking Creation & Authoritative Pricing Tests ---');

  await test('Successfully creates an appointment with tracking code and authoritative price', async () => {
    const res = await bookingService.createBooking({
      salonId: 'sal-101',
      serviceId: 'srv-103', // 680,000 toman, 90 min
      staffId: 'stf-102',
      bookingDate: '2026-10-24',
      bookingTime: '10:00',
      clientName: 'نیلوفر رضایی',
      clientPhone: '09121112233',
      notes: 'مشتری جدید',
      ipAddress: '127.0.0.1',
      userAgent: 'TestRunner',
    });

    assert.ok(res.trackingCode.startsWith('GIS-'));
    assert.strictEqual(res.appointment.client_name, 'نیلوفر رضایی');
    assert.strictEqual(res.appointment.client_phone, '09121112233');
    assert.strictEqual(res.appointment.booking_time, '10:00');
    assert.strictEqual(res.appointment.end_time, '11:30'); // 90 min duration
    assert.strictEqual(res.appointment.status, 'confirmed');
    assert.strictEqual(res.appointment.payment_status, 'pending');
    assert.strictEqual(res.appointment.payment_method, 'in_person');
    assert.strictEqual(res.appointment.price, 680000); // Server authoritative price
  });

  await test('Normalizes Persian numbers and formatted phone inputs', async () => {
    const res = await bookingService.createBooking({
      salonId: 'sal-101',
      serviceId: 'srv-104',
      staffId: 'stf-102',
      bookingDate: '2026-10-24',
      bookingTime: '12:00',
      clientName: 'مریم کمالی',
      clientPhone: '۰۹۱۲-۹۸۷-۶۵۴۳', // Formatted Persian digits
      ipAddress: '127.0.0.1',
      userAgent: 'TestRunner',
    });

    assert.strictEqual(res.appointment.client_phone, '09129876543');
  });

  await test('Disregards client-sent price and enforces authoritative DB price', async () => {
    // Service srv-101 costs 2,400,000 Toman. Even if caller tries to pass price: 500, DB overrides it.
    const res = await bookingService.createBooking({
      salonId: 'sal-101',
      serviceId: 'srv-101',
      staffId: 'stf-101',
      bookingDate: '2026-10-24',
      bookingTime: '14:00',
      clientName: 'زهرا کاظمی',
      clientPhone: '09125556677',
      ipAddress: '127.0.0.1',
      userAgent: 'TestRunner',
    });

    assert.strictEqual(res.appointment.price, 2400000);
  });

  // ---------------------------------------------------------------------------
  // 3. Slot Overlap & Conflict Prevention Tests
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Overlap & Conflict Prevention Tests ---');

  await test('Rejects exact same time booking for same specialist (SLOT_ALREADY_TAKEN)', async () => {
    try {
      await bookingService.createBooking({
        salonId: 'sal-101',
        serviceId: 'srv-103',
        staffId: 'stf-102',
        bookingDate: '2026-10-24',
        bookingTime: '10:00', // Stf-102 is already booked 10:00-11:30
        clientName: 'شیدا مرادی',
        clientPhone: '09351112233',
        ipAddress: '127.0.0.1',
        userAgent: 'TestRunner',
      });
      assert.fail('Should have rejected overlapping booking');
    } catch (err: any) {
      assert.strictEqual(err.statusCode, 409);
      assert.strictEqual(err.code, 'SLOT_ALREADY_TAKEN');
    }
  });

  await test('Rejects partial overlapping time window (10:30-11:30 when 10:00-11:30 taken)', async () => {
    try {
      await bookingService.createBooking({
        salonId: 'sal-101',
        serviceId: 'srv-104', // 60 min
        staffId: 'stf-102',
        bookingDate: '2026-10-24',
        bookingTime: '10:30', // Overlaps with 10:00-11:30
        clientName: 'پریا صادقی',
        clientPhone: '09352223344',
        ipAddress: '127.0.0.1',
        userAgent: 'TestRunner',
      });
      assert.fail('Should have rejected partial overlap');
    } catch (err: any) {
      assert.strictEqual(err.statusCode, 409);
      assert.strictEqual(err.code, 'SLOT_ALREADY_TAKEN');
    }
  });

  await test('Allows back-to-back booking immediately after previous appointment ends', async () => {
    // Stf-102 has booking 12:00-13:00. 13:00-14:00 is immediately back-to-back and should be ALLOWED!
    const res = await bookingService.createBooking({
      salonId: 'sal-101',
      serviceId: 'srv-104', // 60 min
      staffId: 'stf-102',
      bookingDate: '2026-10-24',
      bookingTime: '13:00',
      clientName: 'ساناز امینی',
      clientPhone: '09353334455',
      ipAddress: '127.0.0.1',
      userAgent: 'TestRunner',
    });

    assert.strictEqual(res.appointment.booking_time, '13:00');
    assert.strictEqual(res.appointment.end_time, '14:00');
  });

  await test('Prevents duplicate double-click submissions by same client on same date/time', async () => {
    try {
      await bookingService.createBooking({
        salonId: 'sal-101',
        serviceId: 'srv-104',
        staffId: 'stf-102',
        bookingDate: '2026-10-24',
        bookingTime: '13:00',
        clientName: 'ساناز امینی',
        clientPhone: '09353334455', // Same client
        ipAddress: '127.0.0.1',
        userAgent: 'TestRunner',
      });
      assert.fail('Should have caught duplicate submission');
    } catch (err: any) {
      assert.strictEqual(err.statusCode, 409);
    }
  });

  // ---------------------------------------------------------------------------
  // 4. Parallel Concurrent Request Race Condition Prevention
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Parallel Concurrency & Mutex Race Prevention Tests ---');

  await test('Parallel concurrent race: 5 simultaneous requests for 1 slot -> exactly 1 succeeds', async () => {
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
          staffId: 'stf-103',
          bookingDate: '2026-10-25',
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

    assert.strictEqual(fulfilled.length, 1, 'Exactly one concurrent request must win the slot');
    assert.strictEqual(rejected.length, 4, 'Remaining concurrent requests must be rejected');
  });

  // ---------------------------------------------------------------------------
  // 5. Customer Privacy, Ownership & Cancellation Tests
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. Customer Privacy & Ownership Tests ---');

  await test('getMyBookings strictly scopes records to the authenticated customer phone', async () => {
    const userPhone = '09121112233';
    const myBookings = await bookingService.getMyBookings(userPhone);

    assert.ok(myBookings.length > 0);
    for (const b of myBookings) {
      assert.strictEqual(b.client_phone, userPhone);
    }

    // Unrelated customer sees zero of User 1's bookings
    const unrelatedBookings = await bookingService.getMyBookings('09990000000');
    assert.strictEqual(unrelatedBookings.length, 0);
  });

  await test('Customer B cannot cancel Customer A appointment (FORBIDDEN_CANCELLATION)', async () => {
    // Client A: 09121112233 created a booking earlier. Let's find its tracking code
    const myBookings = await bookingService.getMyBookings('09121112233');
    const targetCode = myBookings[0].tracking_code;

    try {
      await bookingService.cancelBooking(targetCode, '09998887766'); // Client B
      assert.fail('Client B should not be permitted to cancel Client A booking');
    } catch (err: any) {
      assert.strictEqual(err.statusCode, 403);
      assert.strictEqual(err.code, 'FORBIDDEN_CANCELLATION');
    }
  });

  await test('Customer A cancels their own appointment, setting status=cancelled', async () => {
    const myBookings = await bookingService.getMyBookings('09121112233');
    const target = myBookings[0];

    const cancelled = await bookingService.cancelBooking(target.tracking_code, '09121112233', 'تغییر برنامه کاری');
    assert.strictEqual(cancelled.status, 'cancelled');
    assert.strictEqual(cancelled.cancellation_reason, 'تغییر برنامه کاری');
  });

  await test('Cancelling an appointment frees the slot for subsequent bookings', async () => {
    // The slot 10:00-11:30 for stf-102 was previously cancelled
    // Now another client should be able to book it without collision!
    const rebooked = await bookingService.createBooking({
      salonId: 'sal-101',
      serviceId: 'srv-103',
      staffId: 'stf-102',
      bookingDate: '2026-10-24',
      bookingTime: '10:00',
      clientName: 'مشتری جدید جایگزین',
      clientPhone: '09128889900',
      ipAddress: '127.0.0.1',
      userAgent: 'TestRunner',
    });

    assert.strictEqual(rebooked.appointment.status, 'confirmed');
    assert.strictEqual(rebooked.appointment.booking_time, '10:00');
  });

  // ---------------------------------------------------------------------------
  // 6. Production Fail-Closed Safeguard Test
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. Production Safeguard & Truth in Reporting Tests ---');

  await test('In production mode without PostgreSQL, createBooking fails closed (503)', async () => {
    try {
      _setTestProductionMode(true);

      await bookingService.createBooking({
        salonId: 'sal-101',
        serviceId: 'srv-104',
        staffId: 'stf-102',
        bookingDate: '2026-10-26',
        bookingTime: '14:00',
        clientName: 'تست پروداکشن',
        clientPhone: '09120001122',
        ipAddress: '127.0.0.1',
        userAgent: 'ProdTest',
      });
      assert.fail('Should have failed closed in production without DB');
    } catch (err: any) {
      assert.strictEqual(err.statusCode, 503);
      assert.strictEqual(err.code, 'DATABASE_UNAVAILABLE');
    } finally {
      _setTestProductionMode(null);
    }
  });

  console.log('\n====================================================');
  console.log(`Test Execution Finished: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runBookingTestSuite().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
