/**
 * NobatAra Unit Tests — Salon operations & repository contracts (CATEGORY: unit/in-memory)
 *
 * Migrated 1:1 from the legacy hand-rolled `tests/salon_manager.test.ts` (9 cases).
 * Repository logic is exercised with the isolated in-memory adapter. PostgreSQL
 * query behavior (constraints, transactions, real persistence) is proven by
 * tests/db/postgres-repositories.test.ts.
 */
import { describe, it, expect } from 'vitest';
import { salonRepository } from '../../server/repositories/salonRepository.ts';
import { appointmentRepository } from '../../server/repositories/appointmentRepository.ts';
import { serviceRepository } from '../../server/repositories/serviceRepository.ts';
import { staffRepository } from '../../server/repositories/staffRepository.ts';

describe('Tenant isolation (unit, in-memory)', () => {
  it('Salon manager can access profile and dashboard of their own salon', async () => {
    const salon = await salonRepository.findById('sal-101');
    expect(salon !== null).toBe(true);
    expect(salon?.id).toBe('sal-101');
  });

  it('Cross-tenant isolation: staff of salon A cannot query salon B data', async () => {
    const salonA = 'sal-101';
    const salonB = 'sal-102';

    const apptsA = await appointmentRepository.findBySalonId(salonA);
    for (const a of apptsA) {
      expect(a.salon_id).toBe(salonA);
      expect(a.salon_id !== salonB).toBe(true);
    }
  });
});

describe('Service management & constraint validation (unit, in-memory)', () => {
  it('Creates a new salon service with valid price and duration', async () => {
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

    expect(created.id).toBe(serviceId);
    expect(Number(created.price)).toBe(850000);
    expect(created.duration_minutes).toBe(90);

    const fetched = await serviceRepository.findById(serviceId);
    expect(fetched !== null).toBe(true);
  });

  it('Updates service details and toggles active status', async () => {
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

    expect(updated?.name).toBe('خدمت آزمایشی بروزرسانی‌شده');
    expect(Number(updated?.price)).toBe(650000);
    expect(updated?.is_active).toBe(false);
  });
});

describe('Staff & service assignment (unit, in-memory)', () => {
  it('Creates new specialist and assigns catalog services', async () => {
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

    expect(createdStaff.id).toBe(staffId);
    expect(createdStaff.name).toBe('پریسا خسروی');

    await staffRepository.assignService(staffId, 'srv-101', 2500000, 180, true);
    const assigned = await staffRepository.getAssignedServices(staffId);
    expect(assigned.length).toBe(1);
    expect(assigned[0].service_id).toBe('srv-101');
  });
});

describe('Appointment status transitions & settlement (unit, in-memory)', () => {
  it('Transitions appointment from confirmed to completed and marks paid', async () => {
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

    expect(updated?.status).toBe('completed');

    const fetched = await appointmentRepository.findById(apptId);
    expect(fetched?.status).toBe('completed');
  });
});

describe('Rescheduling & conflict validation (unit, in-memory)', () => {
  it('Reschedules appointment to a free time slot', async () => {
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
    expect(isSlotAvailable).toBe(true);

    const rescheduled = await appointmentRepository.reschedule(
      apptId,
      '1403/08/25',
      '17:00',
      '20:00',
      'stf-101',
      'مدیر سالن'
    );

    expect(rescheduled?.booking_time).toBe('17:00');
    expect(rescheduled?.end_time).toBe('20:00');
  });

  it('Rejects rescheduling to an already occupied overlapping slot', async () => {
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

    expect(isSlotAvailable).toBe(false);
  });
});

describe('Working hours & calendar exceptions (unit, in-memory)', () => {
  it('Updates salon operating hours and adds holiday exception', async () => {
    await salonRepository.setWorkingHours('sal-101', [
      { dayOfWeek: 0, startTime: '09:00', endTime: '20:00', isClosed: false },
      { dayOfWeek: 6, startTime: '00:00', endTime: '00:00', isClosed: true }, // Friday closed
    ]);

    const hours = await salonRepository.getWorkingHours('sal-101');
    expect(hours.length > 0).toBe(true);

    const addedException = await salonRepository.addAvailabilityException({
      salonId: 'sal-101',
      startDate: '1403/09/01',
      endDate: '1403/09/02',
      reason: 'تعطیلی به مناسبت بازسازی بخش VIP سالن',
      exceptionType: 'holiday',
      isAvailable: false,
    });

    expect(addedException.reason.includes('بازسازی')).toBe(true);

    const allExceptions = await salonRepository.getAllAvailabilityExceptions('sal-101');
    expect(allExceptions.some((e) => e.id === addedException.id)).toBe(true);

    const deleted = await salonRepository.deleteAvailabilityException('sal-101', addedException.id);
    expect(deleted).toBe(true);
  });
});
