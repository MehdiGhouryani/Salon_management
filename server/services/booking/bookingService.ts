import crypto from 'crypto';
import type { PoolClient } from 'pg';
import { config } from '../../config.ts';
import { withTransaction, isDatabaseConfigured, query } from '../../db/pool.ts';
import { normalizeIranianPhone } from '../../utils/phone.ts';
import { parseBookingDateInput } from '../../utils/jalali.ts';
import {
  resolveBookingScheduleContext,
  assertNotPast,
  isValidHHMM,
  assertScheduleOpen,
  assertStaffEligibleForService,
  filterEligibleStaff,
  effectiveWorkingHours,
  findBlockingException,
  tehranTodayIso,
  timeToMinutes as rulesTimeToMinutes,
} from './bookingRules.ts';
import { bookingGrantService, BookingGrantError } from '../auth/bookingGrantService.ts';
import {
  timeToMinutes,
  minutesToTime,
  addMinutesToTime,
  doIntervalsOverlap,
  IRANIAN_DAY_NAMES,
} from '../../utils/bookingTime.ts';
import { salonRepository, type DbSalon } from '../../repositories/salonRepository.ts';
import { serviceRepository, type DbService } from '../../repositories/serviceRepository.ts';
import { staffRepository, type DbStaff } from '../../repositories/staffRepository.ts';
import { clientRepository } from '../../repositories/clientRepository.ts';
import { appointmentRepository, type DbAppointment } from '../../repositories/appointmentRepository.ts';
import { auditLogRepository } from '../../repositories/auditLogRepository.ts';
import type { DbUser } from '../../repositories/userRepository.ts';

export class BookingError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number = 400, code: string = 'BOOKING_ERROR') {
    super(message);
    this.name = 'BookingError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

// In-memory concurrency locks for dev/test environment when DB is not configured
const inMemoryLocks: Map<string, Promise<void>> = new Map();

let overrideIsProduction: boolean | null = null;

export function _setTestProductionMode(val: boolean | null) {
  overrideIsProduction = val;
}

class AsyncMutex {
  private queue: Array<() => void> = [];
  private locked = false;

  async acquire(): Promise<() => void> {
    if (!this.locked) {
      this.locked = true;
      return () => this.release();
    }

    return new Promise<() => void>((resolve) => {
      this.queue.push(() => {
        this.locked = true;
        resolve(() => this.release());
      });
    });
  }

  private release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) next();
    } else {
      this.locked = false;
    }
  }
}

const mutexMap = new Map<string, AsyncMutex>();

function getMutex(key: string): AsyncMutex {
  let m = mutexMap.get(key);
  if (!m) {
    m = new AsyncMutex();
    mutexMap.set(key, m);
  }
  return m;
}

async function acquireLock(key: string): Promise<() => void> {
  const mutex = getMutex(key);
  return await mutex.acquire();
}

function assertBookingTimeValidityPublic(bookingTime: string, endTime: string): void {
  if (!isValidHHMM(bookingTime) || !isValidHHMM(endTime)) {
    throw new BookingError('ساعت نوبت معتبر نیست. قالب صحیح: HH:MM (۲۴ ساعته).', 400, 'INVALID_BOOKING_TIME');
  }
}

export const bookingService = {
  /**
   * Calculates live, real available slots for a given salon, service, and date
   */
  async calculateAvailability(
    salonId: string,
    serviceId: string,
    dateStr: string,
    staffId?: string
  ): Promise<{
    isOpen: boolean;
    reason?: string;
    date: string;
    dayOfWeek: number;
    dayName: string;
    serviceDurationMinutes: number;
    serviceName: string;
    servicePrice: number;
    slots: Array<{
      time: string;
      endTime: string;
      available: boolean;
      staffId?: string;
      staffName?: string;
      conflictReason?: string;
    }>;
  }> {
    // 1. Resolve Salon
    const salon = await salonRepository.findById(salonId);
    if (!salon || salon.status !== 'active') {
      throw new BookingError('سالن مورد نظر یافت نشد یا در وضعیت فعال نمی‌باشد.', 404, 'SALON_NOT_FOUND');
    }

    // 2. Resolve Service
    const service = await serviceRepository.findById(serviceId);
    if (!service || service.salon_id !== salonId || !service.is_active) {
      throw new BookingError('خدمت مورد نظر در این سالن یافت نشد یا غیرفعال است.', 404, 'SERVICE_NOT_FOUND');
    }

    const duration = service.duration_minutes || 60;
    const price = typeof service.price === 'string' ? parseInt(service.price, 10) : service.price;

    // 3. Canonical date resolution (Phase 06): Gregorian ISO or validated
    // Jalali input — no silent fallbacks to "today" or Saturday anymore.
    const parsedDay = parseBookingDateInput(dateStr);
    if (!parsedDay) {
      throw new BookingError(
        'تاریخ انتخابی معتبر نیست. قالب صحیح: YYYY-MM-DD یا تاریخ شمسی معتبر.',
        400,
        'INVALID_DATE'
      );
    }
    const canonicalDate = parsedDay.canonical;
    const dayOfWeek = parsedDay.weekday;
    const dayName = IRANIAN_DAY_NAMES[dayOfWeek] || 'نامشخص';

    const closedResponse = (reason: string) => ({
      isOpen: false,
      reason,
      date: canonicalDate,
      dayOfWeek,
      dayName,
      serviceDurationMinutes: duration,
      serviceName: service.name,
      servicePrice: price,
      slots: [],
    });

    const allStaff = await staffRepository.findBySalonId(salonId, true);
    if (allStaff.length === 0) {
      return closedResponse('هیچ متخصصی در حال حاضر در این سالن فعال نمی‌باشد.');
    }

    // Staff-service eligibility (Phase 09): only specialists assigned to this
    // service can appear in availability.
    let targetStaffList: DbStaff[];
    if (staffId && staffId !== 'any') {
      const specificStaff = allStaff.find((s) => s.id === staffId);
      if (!specificStaff) {
        throw new BookingError('متخصص انتخاب شده یافت نشد.', 404, 'STAFF_NOT_FOUND');
      }
      await assertStaffEligibleForService(specificStaff.id, serviceId);
      targetStaffList = [specificStaff];
    } else {
      targetStaffList = await filterEligibleStaff(allStaff, serviceId);
      if (targetStaffList.length === 0) {
        return closedResponse('هیچ متخصص واجد شرایطی برای این خدمت یافت نشد.');
      }
    }

    // Shared rules engine context (Phase 09): identical schedule data to the
    // creation paths.
    const ctx = await resolveBookingScheduleContext(salonId, serviceId, canonicalDate);

    // Fail-safe: missing working-hours configuration closes the day.
    const salonHours = effectiveWorkingHours(ctx);
    if ('unconfigured' in salonHours) {
      return closedResponse('ساعات کاری این روز برای سالن تنظیم نشده است.');
    }
    if ('closed' in salonHours) {
      return closedResponse(`سالن در روز ${dayName} تعطیل می‌باشد.`);
    }

    // Past slots for Tehran-today are not bookable and must not appear open.
    const todayIso = tehranTodayIso();
    const nowMinutes = rulesTimeToMinutes(
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Tehran',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).format(new Date())
    );

    const dayStartMinutes = timeToMinutes(salonHours.start);
    const dayEndMinutes = timeToMinutes(salonHours.end);
    const maxStartMinutes = dayEndMinutes - duration;

    // Fetch all existing appointments for this salon and date
    const existingAppointments = await appointmentRepository.findBySalonId(salonId, {
      date: canonicalDate,
    });
    const activeAppointments = existingAppointments.filter((a) => a.status !== 'cancelled');

    const resultSlots: Array<{
      time: string;
      endTime: string;
      available: boolean;
      staffId?: string;
      staffName?: string;
      conflictReason?: string;
    }> = [];

    // Check slot step: 30 minutes
    const stepMinutes = 30;

    for (let current = dayStartMinutes; current <= maxStartMinutes; current += stepMinutes) {
      const slotStart = minutesToTime(current);
      const slotEnd = addMinutesToTime(slotStart, duration);

      // Past slot policy (Asia/Tehran)
      if (canonicalDate < todayIso || (canonicalDate === todayIso && current < nowMinutes)) {
        resultSlots.push({
          time: slotStart,
          endTime: slotEnd,
          available: false,
          conflictReason: 'این زمان گذشته است',
        });
        continue;
      }

      // Find an eligible staff member who is working and free for this interval
      let freeStaff: DbStaff | null = null;

      for (const staff of targetStaffList) {
        // Staff-specific hours override salon hours; staff-specific exceptions
        // and breaks block the interval.
        const staffHours = effectiveWorkingHours(ctx, staff.id);
        if ('unconfigured' in staffHours || 'closed' in staffHours) continue;
        if (current < timeToMinutes(staffHours.start)) continue;
        if (current + duration > timeToMinutes(staffHours.end)) continue;
        if (findBlockingException(ctx, staff.id, slotStart, slotEnd)) continue;

        const staffAppts = activeAppointments.filter((a) => a.staff_id === staff.id);
        let hasConflict = false;

        for (const appt of staffAppts) {
          const apptEnd = appt.end_time || addMinutesToTime(appt.booking_time, 60);
          if (doIntervalsOverlap(slotStart, slotEnd, appt.booking_time, apptEnd)) {
            hasConflict = true;
            break;
          }
        }

        if (!hasConflict) {
          freeStaff = staff;
          break; // Found an available specialist for this slot
        }
      }

      if (freeStaff) {
        resultSlots.push({
          time: slotStart,
          endTime: slotEnd,
          available: true,
          staffId: freeStaff.id,
          staffName: freeStaff.name,
        });
      } else {
        resultSlots.push({
          time: slotStart,
          endTime: slotEnd,
          available: false,
          conflictReason: 'ظرفیت تکمیل است',
        });
      }
    }

    return {
      isOpen: true,
      date: canonicalDate,
      dayOfWeek,
      dayName,
      serviceDurationMinutes: duration,
      serviceName: service.name,
      servicePrice: price,
      slots: resultSlots,
    };
  },

  /**
   * Atomically creates a validated, authoritative customer booking
   */
  async createBooking(params: {
    salonId: string;
    serviceId: string;
    staffId?: string;
    bookingDate: string;
    bookingTime: string;
    clientName: string;
    clientPhone: string;
    notes?: string;
    user?: DbUser;
    /** Phase 08: guest booking authorization token (booking_verification OTP). */
    bookingGrant?: string;
    /** Phase 09: 'manual' = salon-staff creation path (no grant required). */
    source?: 'public' | 'manual';
    ipAddress: string;
    userAgent: string;
  }): Promise<{
    trackingCode: string;
    appointment: DbAppointment;
  }> {
    // Production Fail-Closed Safeguard:
    // If running in production mode and PostgreSQL is not configured, do not accept fake bookings
    const isProd = overrideIsProduction !== null ? overrideIsProduction : config.isProduction;
    if (isProd && !isDatabaseConfigured()) {
      throw new BookingError(
        'پایگاه داده در محیط عملیاتی پیکربندی نشده است. برای جلوگیری از اتلاف داده‌ها، ثبت نوبت متوقف گردید.',
        503,
        'DATABASE_UNAVAILABLE'
      );
    }

    // 1. Phone Normalization & Validation
    const phoneNorm = normalizeIranianPhone(params.clientPhone);
    if (!phoneNorm.isValid) {
      throw new BookingError(phoneNorm.error || 'شماره موبایل وارد شده نامعتبر است.', 400, 'INVALID_PHONE');
    }

    const clientPhone = phoneNorm.national;
    const clientName = (params.clientName || '').trim();
    if (!clientName || clientName.length < 2) {
      throw new BookingError('نام و نام‌خانوادگی مشتری معتبر نیست.', 400, 'INVALID_CLIENT_NAME');
    }

    // 2-3. Shared rules engine (Phase 09): authoritative salon/service
    // resolution, canonical date, working hours (fail-safe on missing config),
    // exceptions, past-date policy, time validity — identical for every path.
    const ctx = await resolveBookingScheduleContext(
      params.salonId,
      params.serviceId,
      params.bookingDate
    );
    const service = ctx.service;

    // Authoritative duration and price from database/repo (NEVER trust client values)
    const durationMinutes = service.duration_minutes || 60;
    const price = typeof service.price === 'string' ? parseInt(service.price, 10) : service.price;
    const endTime = addMinutesToTime(params.bookingTime, durationMinutes);

    // Staff ownership first, then eligibility (Phase 09/10): a staff member
    // of ANOTHER salon must yield 404 STAFF_NOT_FOUND, not an eligibility error.
    if (params.staffId && params.staffId !== 'any') {
      const staff = await staffRepository.findById(params.staffId);
      if (!staff || staff.salon_id !== params.salonId || !staff.is_active) {
        throw new BookingError('متخصص انتخاب شده در این سالن یافت نشد یا غیرفعال است.', 404, 'STAFF_NOT_FOUND');
      }
      await assertStaffEligibleForService(params.staffId, params.serviceId);
    }

    // Schedule rules: salon-level check first (fail-safe), staff-level hours
    // and exceptions verified inside staff selection below.
    const salonHours = effectiveWorkingHours(ctx);
    if ('unconfigured' in salonHours) {
      throw new BookingError(
        'ساعات کاری این روز برای سالن تنظیم نشده است. امکان ثبت نوبت وجود ندارد.',
        400,
        'WORKING_HOURS_NOT_CONFIGURED'
      );
    }
    if ('closed' in salonHours) {
      throw new BookingError('سالن در این روز تعطیل است و امکان رزرو وجود ندارد.', 400, 'SALON_CLOSED');
    }
    const salonException = findBlockingException(ctx, params.staffId && params.staffId !== 'any' ? params.staffId : undefined, params.bookingTime, endTime);
    if (salonException) {
      throw new BookingError(
        `در این تاریخ امکان پذیرش نوبت وجود ندارد (${salonException.reason || 'تعطیلی یا مرخصی ثبت شده'}).`,
        400,
        'SCHEDULE_EXCEPTION_BLOCKED'
      );
    }
    assertNotPast(ctx.canonicalDate, params.bookingTime);
    assertBookingTimeValidityPublic(params.bookingTime, endTime);
    const canonicalDate = ctx.canonicalDate;

    // 4. Concurrency Protection & Overlap Prevention Execution
    let selectedStaffId = params.staffId;

    // Concurrency execution wrapper (handles both Postgres transaction and in-memory mutex)
    const executeAtomicBooking = async (client?: PoolClient): Promise<DbAppointment> => {
      // If staffId is 'any' or omitted, select an available qualified specialist
      if (!selectedStaffId || selectedStaffId === 'any') {
        const staffList = await staffRepository.findBySalonId(params.salonId, true, client);
        // Phase 09: only specialists assigned to this service are candidates,
        // and their own working hours / exceptions must cover the interval.
        const eligible: DbStaff[] = [];
        for (const st of staffList) {
          const assigned = await staffRepository.getAssignedServices(st.id, client);
          if (!assigned.some((m) => m.service_id === params.serviceId)) continue;
          const stHours = effectiveWorkingHours(ctx, st.id);
          if ('unconfigured' in stHours || 'closed' in stHours) continue;
          if (timeToMinutes(params.bookingTime) < timeToMinutes(stHours.start)) continue;
          if (timeToMinutes(endTime) > timeToMinutes(stHours.end)) continue;
          if (findBlockingException(ctx, st.id, params.bookingTime, endTime)) continue;
          eligible.push(st);
        }

        let foundStaff: DbStaff | null = null;

        for (const st of eligible) {
          const isFree = await appointmentRepository.checkSlotOverlap(
            params.salonId,
            st.id,
            canonicalDate,
            params.bookingTime,
            endTime,
            undefined,
            client
          );
          if (isFree) {
            foundStaff = st;
            break;
          }
        }

        if (!foundStaff) {
          throw new BookingError('در این زمان هیچ متخصصی خالی نمی‌باشد.', 409, 'SLOT_UNAVAILABLE');
        }

        selectedStaffId = foundStaff.id;
      } else {
        // Specific staff selected: lock and verify staff exists
        const staff = await staffRepository.findById(selectedStaffId, client);
        if (!staff || staff.salon_id !== params.salonId || !staff.is_active) {
          throw new BookingError('متخصص انتخاب شده در این سالن یافت نشد یا غیرفعال است.', 404, 'STAFF_NOT_FOUND');
        }

        // Check slot overlap strictly
        const isFree = await appointmentRepository.checkSlotOverlap(
          params.salonId,
          selectedStaffId,
          canonicalDate,
          params.bookingTime,
          endTime,
          undefined,
          client
        );

        if (!isFree) {
          throw new BookingError(
            'این بازه زمانی قبلاً رزرو شده است یا با نوبت دیگری تداخل دارد. لطفاً ساعت دیگری را انتخاب کنید.',
            409,
            'SLOT_ALREADY_TAKEN'
          );
        }
      }

      // Check for exact duplicate client booking on same day and service to prevent double-clicks
      const clientBookings = await appointmentRepository.findByClientPhone(clientPhone, client);
      const duplicateBooking = clientBookings.find(
        (b) =>
          b.salon_id === params.salonId &&
          b.service_id === params.serviceId &&
          b.booking_date === canonicalDate &&
          b.booking_time === params.bookingTime &&
          b.status !== 'cancelled'
      );

      if (duplicateBooking) {
        throw new BookingError('شما قبلاً این نوبت را ثبت کرده‌اید.', 409, 'DUPLICATE_BOOKING');
      }

      // 5. Upsert Client & Salon-Client Record
      const clientRecord = await clientRepository.createOrUpdate(
        {
          phone: clientPhone,
          fullName: clientName,
          notes: params.notes || null,
        },
        client
      );

      await clientRepository.recordBookingVisit(params.salonId, clientRecord.id, price, client);

      // 6. Generate Secure Tracking Code (e.g. GIS-XXXX or NB-XXXXXX)
      const prefix = ctx.salon.slug ? ctx.salon.slug.slice(0, 3).toUpperCase() : 'NB';
      // Phase 07 (R1): 6-digit suffix — 900,000 combinations per salon instead of 9,000.
      const randomCode = crypto.randomInt(100000, 1000000);
      const trackingCode = `${prefix}-${randomCode}`;
      const appointmentId = `apt-${Date.now()}-${crypto.randomInt(100, 999)}`;

      // 7. Persist Appointment in Repository
      const createdAppt = await appointmentRepository.create(
        {
          id: appointmentId,
          trackingCode,
          salonId: params.salonId,
          serviceId: params.serviceId,
          staffId: selectedStaffId,
          clientId: clientRecord.id,
          clientName,
          clientPhone,
          bookingDate: canonicalDate,
          bookingTime: params.bookingTime,
          endTime,
          price,
          paymentMethod: 'in_person',
          paymentStatus: 'pending',
          status: 'confirmed',
          notes: params.notes || null,
          isDemo: config.appMode !== 'production',
        },
        client
      );

      // 8. Record Audit Log (Omit sensitive data / OTP)
      await auditLogRepository.create({
        actor: clientName,
        actorRole: params.source === 'manual' ? 'salon_staff' : 'customer',
        action: params.source === 'manual' ? 'ثبت نوبت حضوری توسط پرسنل سالن' : 'ثبت قطعی نوبت حضوری توسط مشتری',
        target: `Appointment:${createdAppt.id}`,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        severity: 'info',
        category: 'business',
        details: {
          trackingCode,
          salonId: params.salonId,
          serviceId: params.serviceId,
          staffId: selectedStaffId,
          date: canonicalDate,
          time: params.bookingTime,
          price,
        },
      }).catch(() => {});

      return createdAppt;
    };

    // If PostgreSQL is configured, wrap in a database transaction with row locks
    if (isDatabaseConfigured()) {
      return await withTransaction(async (dbClient) => {
        // Phase 08: consume the guest booking grant INSIDE the booking
        // transaction — a failed booking rolls the consumption back and the
        // customer keeps their grant. Phone binding is enforced atomically.
        if (params.bookingGrant) {
          await bookingGrantService.consumeGrant(params.bookingGrant, clientPhone, dbClient);
        }

        // Concurrency hardening (R7): serialize all booking attempts for the same
        // salon + date via a transaction-scoped advisory lock. Without it, two
        // concurrent transactions could both pass the overlap check under READ
        // COMMITTED (snapshot race) for overlapping-but-different start times,
        // which the exact-slot unique constraint does not catch. The lock is
        // released automatically at COMMIT/ROLLBACK.
        await dbClient.query(
          `SELECT pg_advisory_xact_lock(hashtextextended($1 || ':' || $2, 0))`,
          [params.salonId, canonicalDate]
        );
        const appointment = await executeAtomicBooking(dbClient);
        return {
          trackingCode: appointment.tracking_code,
          appointment,
        };
      });
    } else {
      // In-Memory Dev/Test: Mutex lock per (salon, staff, date) to prevent parallel race conditions
      const lockKey = `${params.salonId}:${canonicalDate}`;
      const release = await acquireLock(lockKey);
      try {
        if (params.bookingGrant) {
          await bookingGrantService.consumeGrant(params.bookingGrant, clientPhone);
        }
        const appointment = await executeAtomicBooking();
        return {
          trackingCode: appointment.tracking_code,
          appointment,
        };
      } finally {
        release();
      }
    }
  },

  /**
   * Phase 09 — SINGLE reschedule engine used by the salon route.
   * Runs schedule rules (canonical date, working hours for the TARGET staff,
   * exceptions, past-date policy, staff eligibility) and the overlap check
   * INSIDE the same transaction as the move, under the (salon, date) advisory
   * lock — closing the check-then-move TOCTOU the old route had.
   */
  async rescheduleAppointment(params: {
    salonId: string;
    appointmentId: string;
    newDate: string;
    newTime: string;
    newStaffId?: string;
    actorName?: string;
    actorUserId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<DbAppointment> {
    const appt = await appointmentRepository.findById(params.appointmentId);
    if (!appt || appt.salon_id !== params.salonId) {
      throw new BookingError('نوبت مورد نظر یافت نشد.', 404, 'APPOINTMENT_NOT_FOUND');
    }
    if (['cancelled', 'completed'].includes(appt.status)) {
      throw new BookingError('امکان جابجایی نوبت‌های تکمیل‌شده یا لغو‌شده وجود ندارد.', 409, 'RESCHEDULE_NOT_ALLOWED');
    }

    const ctx = await resolveBookingScheduleContext(params.salonId, appt.service_id, params.newDate);
    const targetStaffId = params.newStaffId || appt.staff_id;

    if (params.newStaffId && params.newStaffId !== appt.staff_id) {
      const staff = await staffRepository.findById(params.newStaffId);
      if (!staff || staff.salon_id !== params.salonId || !staff.is_active) {
        throw new BookingError('متخصص انتخابی در این سالن یافت نشد یا غیرفعال است.', 404, 'STAFF_NOT_FOUND');
      }
      await assertStaffEligibleForService(params.newStaffId, appt.service_id);
    }

    const service = ctx.service;
    const duration = service.duration_minutes || 60;
    const endTime = addMinutesToTime(params.newTime, duration);

    assertBookingTimeValidityPublic(params.newTime, endTime);
    assertNotPast(ctx.canonicalDate, params.newTime);
    assertScheduleOpen(ctx, { staffId: targetStaffId, bookingTime: params.newTime, endTime });

    const moveAndAudit = async (txClient?: PoolClient): Promise<DbAppointment> => {
      const free = await appointmentRepository.checkSlotOverlap(
        params.salonId,
        targetStaffId,
        ctx.canonicalDate,
        params.newTime,
        endTime,
        params.appointmentId,
        txClient
      );
      if (!free) {
        throw new BookingError('زمان جدید انتخابی با نوبت دیگری تداخل دارد.', 409, 'SLOT_ALREADY_TAKEN');
      }

      const moved = await appointmentRepository.reschedule(
        params.appointmentId,
        ctx.canonicalDate,
        params.newTime,
        endTime,
        targetStaffId,
        params.actorName,
        params.actorUserId,
        txClient
      );
      if (!moved) {
        throw new BookingError('خطا در جابجایی نوبت.', 500, 'RESCHEDULE_FAILED');
      }

      await auditLogRepository.create({
        actor: params.actorName || 'مدیر سالن',
        actorRole: 'salon_staff',
        action: `جابجایی زمان نوبت به ${ctx.canonicalDate} ${params.newTime}`,
        target: `Appointment:${params.appointmentId}`,
        ipAddress: params.ipAddress || 'internal',
        userAgent: params.userAgent || 'internal',
        severity: 'info',
        category: 'business',
        details: {
          salonId: params.salonId,
          oldDate: appt.booking_date,
          oldTime: appt.booking_time,
          newDate: ctx.canonicalDate,
          newTime: params.newTime,
        },
      }, txClient).catch(() => {});

      return moved;
    };

    if (isDatabaseConfigured()) {
      return await withTransaction(async (txClient) => {
        // Same (salon, date) advisory lock scope as createBooking: the
        // overlap check and the move are serialized against every other
        // booking or reschedule for the same salon-day.
        await txClient.query(
          `SELECT pg_advisory_xact_lock(hashtextextended($1 || ':' || $2, 0))`,
          [params.salonId, ctx.canonicalDate]
        );
        return await moveAndAudit(txClient);
      });
    }

    // In-memory dev path: mutex + overlap + move under the same scope.
    const lockKey = `${params.salonId}:${params.newStaffId || 'any'}:${ctx.canonicalDate}`;
    const release = await acquireLock(lockKey);
    try {
      return await moveAndAudit();
    } finally {
      release();
    }
  },

  /**
   * Retrieves active and past appointments for authenticated customer
   */
  async getMyBookings(userPhone: string): Promise<DbAppointment[]> {
    const phoneNorm = normalizeIranianPhone(userPhone);
    if (!phoneNorm.isValid) {
      return [];
    }

    const appts = await appointmentRepository.findByClientPhone(phoneNorm.national);
    return appts;
  },

  /**
   * Tracks an appointment by code with verification
   */
  async trackBooking(
    trackingCode: string,
    phone?: string
  ): Promise<DbAppointment | null> {
    const appt = await appointmentRepository.findByTrackingCode(trackingCode);
    if (!appt) return null;

    // Phase 07 (R1): a supplied phone must be VALID and MATCHING — the old
    // code silently skipped the mismatch check for malformed input.
    if (phone !== undefined && phone !== null && String(phone).trim() !== '') {
      const norm = normalizeIranianPhone(String(phone));
      if (!norm.isValid) {
        throw new BookingError('شماره همراه وارد شده معتبر نیست.', 400, 'INVALID_PHONE');
      }
      if (appt.client_phone !== norm.national) {
        throw new BookingError('شماره همراه با مشخصات نوبت تطابق ندارد.', 403, 'PHONE_MISMATCH');
      }
    }

    return appt;
  },

  /**
   * Cancels an appointment requested by the customer
   */
  async cancelBooking(
    trackingCode: string,
    userPhone: string,
    reason: string = 'لغو توسط مشتری'
  ): Promise<DbAppointment> {
    const phoneNorm = normalizeIranianPhone(userPhone);
    if (!phoneNorm.isValid) {
      throw new BookingError('شماره همراه معتبر نیست.', 400, 'INVALID_PHONE');
    }

    const appt = await appointmentRepository.findByTrackingCode(trackingCode);
    if (!appt) {
      throw new BookingError('نوبت مورد نظر با این کد پیگیری یافت نشد.', 404, 'APPOINTMENT_NOT_FOUND');
    }

    // Ownership check: Customer can only cancel their own appointment
    if (appt.client_phone !== phoneNorm.national) {
      throw new BookingError('شما مجاز به لغو این نوبت نمی‌باشید.', 403, 'FORBIDDEN_CANCELLATION');
    }

    if (appt.status === 'cancelled') {
      return appt;
    }

    // Phase 09: completed / no_show appointments are not cancellable by the
    // customer (documented safe rule; no commercial window invented).
    if (!['pending', 'confirmed'].includes(appt.status)) {
      throw new BookingError(
        'امکان لغو این نوبت وجود ندارد (نوبت تکمیل یا بدون حضور ثبت شده است).',
        409,
        'APPOINTMENT_NOT_CANCELLABLE'
      );
    }

    const updated = await appointmentRepository.updateStatus(
      appt.id,
      'cancelled',
      appt.client_name,
      reason
    );

    if (!updated) {
      throw new BookingError('خطا در تغییر وضعیت نوبت.', 500, 'UPDATE_FAILED');
    }

    return updated;
  },
};
