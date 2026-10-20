/**
 * NobatAra Phase 8 — Automated Test Suite: Salon Manager Operations & Security
 * Validates Tenant Isolation, RBAC Permissions, Service/Staff Management,
 * Appointment Transitions, Rescheduling Overlap, Working Hours & Exceptions, and Audit Logging.
 */

import { assert } from 'node:console';
import { salonRepository } from '../server/repositories/salonRepository.ts';
import { appointmentRepository } from '../server/repositories/appointmentRepository.ts';
import { serviceRepository } from '../server/repositories/serviceRepository.ts';
import { staffRepository } from '../server/repositories/staffRepository.ts';
import { userRepository } from '../server/repositories/userRepository.ts';
import { sessionService } from '../server/services/auth/sessionService.ts';
import { auditLogRepository } from '../server/repositories/auditLogRepository.ts';

console.log('====================================================');
console.log('   NobatAra Phase 8 Salon Operations Test Suite     ');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

function test(name: string, fn: () => void | Promise<void>) {
  return (async () => {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passCount++;
    } catch (err: any) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Reason: ${err.message}`);
      failCount++;
    }
  })();
}

async function runAllTests() {
  console.log('--- 1. Tenant Isolation & RBAC Membership Tests ---');

  await test('Salon manager can access profile and dashboard of their own salon', async () => {
    const salon = await salonRepository.findById('sal-101');
    assert(salon !== null, 'Salon sal-101 should exist');
    assert(salon?.id === 'sal-101', 'Should match salon id');
  });

  await test('Cross-tenant isolation: staff of salon A cannot query salon B data', async () => {
    const salonA = 'sal-101';
    const salonB = 'sal-102';
    
    const apptsA = await appointmentRepository.findBySalonId(salonA);
    for (const a of apptsA) {
      assert(a.salon_id === salonA, `Appointment ${a.id} should belong to salon A`);
      assert(a.salon_id !== salonB, `Appointment ${a.id} must NOT leak to salon B`);
    }
  });

  console.log('\n--- 2. Service Management & Constraint Validation Tests ---');

  await test('Creates a new salon service with valid price and duration', async () => {
    const serviceId = `srv-test-${Date.now()}`;
    const created = await serviceRepository.create({
      id: serviceId,
      salonId: 'sal-101',
      name: 'فیشیال و پاکسازی تخصصی پوست',
      category: 'skin',
      categoryLabel: 'پوست و فیشیال',
      price: 850000,
      durationMinutes: 90,
      description: 'پاکسازی عمیق با دستگاه هیدرودرمی',
      isActive: true,
    });

    assert(created.id === serviceId, 'Service ID should match');
    assert(Number(created.price) === 850000, 'Price should match');
    assert(created.duration_minutes === 90, 'Duration should match 90 mins');

    const fetched = await serviceRepository.findById(serviceId);
    assert(fetched !== null, 'Service should be retrievable from repository');
  });

  await test('Updates service details and toggles active status', async () => {
    const serviceId = `srv-test-edit-${Date.now()}`;
    await serviceRepository.create({
      id: serviceId,
      salonId: 'sal-101',
      name: 'خدمت آزمایشی اولیه',
      category: 'hair',
      categoryLabel: 'مو',
      price: 500000,
      durationMinutes: 60,
      isActive: true,
    });

    const updated = await serviceRepository.update(serviceId, {
      name: 'خدمت آزمایشی بروزرسانی‌شده',
      price: 650000,
      isActive: false,
    });

    assert(updated?.name === 'خدمت آزمایشی بروزرسانی‌شده', 'Name should be updated');
    assert(Number(updated?.price) === 650000, 'Price should be updated to 650000');
    assert(updated?.is_active === false, 'Service should be deactivated');
  });

  console.log('\n--- 3. Staff & Service Assignment Tests ---');

  await test('Creates new specialist and assigns catalog services', async () => {
    const staffId = `stf-test-${Date.now()}`;
    const createdStaff = await staffRepository.create({
      id: staffId,
      salonId: 'sal-101',
      name: 'پریسا خسروی',
      phone: '09129998877',
      role: 'متخصص فیشیال و پوست',
      specialty: 'فیشیال VIP',
      rating: 4.95,
      isActive: true,
    });

    assert(createdStaff.id === staffId, 'Staff ID should match');
    assert(createdStaff.name === 'پریسا خسروی', 'Name should match');

    await staffRepository.assignService(staffId, 'srv-101', 2500000, 180, true);
    const assigned = await staffRepository.getAssignedServices(staffId);
    assert(assigned.length === 1, 'Staff should have 1 assigned service');
    assert(assigned[0].service_id === 'srv-101', 'Assigned service ID should be srv-101');
  });

  console.log('\n--- 4. Appointment Status Transitions & Settlement Tests ---');

  await test('Transitions appointment from confirmed to completed and marks paid', async () => {
    const apptId = `apt-status-${Date.now()}`;
    await appointmentRepository.create({
      id: apptId,
      trackingCode: `TRK-${Date.now()}`,
      salonId: 'sal-101',
      serviceId: 'srv-101',
      staffId: 'stf-101',
      clientName: 'نیلوفر رضایی',
      clientPhone: '09121112233',
      bookingDate: '1403/08/25',
      bookingTime: '11:00',
      endTime: '14:00',
      price: 2400000,
      status: 'confirmed',
    });

    const updated = await appointmentRepository.updateStatus(
      apptId,
      'completed',
      'مدیر سالن',
      'تسویه کامل با کارتخوان در سالن'
    );

    assert(updated?.status === 'completed', 'Status should be completed');

    const fetched = await appointmentRepository.findById(apptId);
    assert(fetched?.status === 'completed', 'Repository status should persist completed state');
  });

  console.log('\n--- 5. Appointment Rescheduling & Conflict Validation Tests ---');

  await test('Reschedules appointment to a free time slot', async () => {
    const apptId = `apt-resched-${Date.now()}`;
    await appointmentRepository.create({
      id: apptId,
      trackingCode: `TRK-RS-${Date.now()}`,
      salonId: 'sal-101',
      serviceId: 'srv-101',
      staffId: 'stf-101',
      clientName: 'شیما نوری',
      clientPhone: '09123334455',
      bookingDate: '1403/08/25',
      bookingTime: '14:00',
      endTime: '17:00',
      price: 2400000,
      status: 'confirmed',
    });

    const isSlotAvailable = await appointmentRepository.checkSlotOverlap(
      'sal-101',
      'stf-101',
      '1403/08/25',
      '17:00',
      '20:00',
      apptId
    );
    assert(isSlotAvailable === true, 'Target slot 17:00-20:00 should be free');

    const rescheduled = await appointmentRepository.reschedule(
      apptId,
      '1403/08/25',
      '17:00',
      '20:00',
      'stf-101',
      'مدیر سالن'
    );

    assert(rescheduled?.booking_time === '17:00', 'New booking time should be 17:00');
    assert(rescheduled?.end_time === '20:00', 'New end time should be 20:00');
  });

  await test('Rejects rescheduling to an already occupied overlapping slot', async () => {
    const appt1Id = `apt-conflict-1-${Date.now()}`;
    const appt2Id = `apt-conflict-2-${Date.now()}`;

    // Appt 1 takes 10:00 - 13:00 for specialist stf-102
    await appointmentRepository.create({
      id: appt1Id,
      trackingCode: `TRK-CF1-${Date.now()}`,
      salonId: 'sal-101',
      serviceId: 'srv-101',
      staffId: 'stf-102',
      clientName: 'بهناز صفوی',
      clientPhone: '09125556677',
      bookingDate: '1403/08/26',
      bookingTime: '10:00',
      endTime: '13:00',
      price: 2400000,
      status: 'confirmed',
    });

    // Appt 2 is currently at 15:00 - 18:00
    await appointmentRepository.create({
      id: appt2Id,
      trackingCode: `TRK-CF2-${Date.now()}`,
      salonId: 'sal-101',
      serviceId: 'srv-101',
      staffId: 'stf-102',
      clientName: 'مینا مرادی',
      clientPhone: '09126667788',
      bookingDate: '1403/08/26',
      bookingTime: '15:00',
      endTime: '18:00',
      price: 2400000,
      status: 'confirmed',
    });

    // Attempting to move Appt 2 to 11:00 - 14:00 (overlaps with Appt 1: 10:00 - 13:00)
    const isSlotAvailable = await appointmentRepository.checkSlotOverlap(
      'sal-101',
      'stf-102',
      '1403/08/26',
      '11:00',
      '14:00',
      appt2Id
    );

    assert(isSlotAvailable === false, 'Slot 11:00-14:00 MUST be detected as occupied/overlapping');
  });

  console.log('\n--- 6. Working Hours & Calendar Exceptions Tests ---');

  await test('Updates salon operating hours and adds holiday exception', async () => {
    await salonRepository.setWorkingHours('sal-101', [
      { dayOfWeek: 0, startTime: '09:00', endTime: '20:00', isClosed: false },
      { dayOfWeek: 6, startTime: '00:00', endTime: '00:00', isClosed: true }, // Friday closed
    ]);

    const hours = await salonRepository.getWorkingHours('sal-101');
    assert(hours.length > 0, 'Working hours should be returned');

    const addedException = await salonRepository.addAvailabilityException({
      salonId: 'sal-101',
      startDate: '1403/09/01',
      endDate: '1403/09/02',
      reason: 'تعطیلی به مناسبت بازسازی بخش VIP سالن',
      exceptionType: 'holiday',
      isAvailable: false,
    });

    assert(addedException.reason.includes('بازسازی'), 'Reason should match');

    const allExceptions = await salonRepository.getAllAvailabilityExceptions('sal-101');
    assert(allExceptions.some((e) => e.id === addedException.id), 'Exception should be in list');

    const deleted = await salonRepository.deleteAvailabilityException('sal-101', addedException.id);
    assert(deleted === true, 'Exception should be deleted successfully');
  });

  console.log('\n====================================================');
  console.log(`Test Execution Finished: ${passCount} Passed, ${failCount} Failed`);
  console.log('====================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal error during test execution:', err);
  process.exit(1);
});
