import crypto from 'crypto';
import type { PoolClient } from 'pg';
import { config } from '../../config.ts';
import { withTransaction, isDatabaseConfigured, query } from '../../db/pool.ts';
import { normalizeIranianPhone } from '../../utils/phone.ts';
import {
  timeToMinutes,
  minutesToTime,
  addMinutesToTime,
  getIranianDayOfWeek,
  generateAvailableSlots,
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

    // 3. Determine Iranian Day of Week
    let dayOfWeek = 0;
    const parsedDate = new Date(dateStr);
    if (!isNaN(parsedDate.getTime())) {
      dayOfWeek = getIranianDayOfWeek(parsedDate);
    } else {
      // Fallback for custom Jalali strings (e.g. 1403/08/25)
      // Defaults to Saturday (0) if date string is custom
      dayOfWeek = 0;
    }
    const dayName = IRANIAN_DAY_NAMES[dayOfWeek] || 'نامشخص';

    // 4. Retrieve Working Hours
    const workingHours = await salonRepository.getWorkingHours(salonId);
    const dayHours = workingHours.find((h) => h.day_of_week === dayOfWeek);

    if (!dayHours || dayHours.is_closed) {
      return {
        isOpen: false,
        reason: `سالن در روز ${dayName} تعطیل می‌باشد.`,
        date: dateStr,
        dayOfWeek,
        dayName,
        serviceDurationMinutes: duration,
        serviceName: service.name,
        servicePrice: price,
        slots: [],
      };
    }

    // 5. Check Availability Exceptions
    const exceptions = await salonRepository.getAvailabilityExceptions(salonId, dateStr, staffId);
    const activeException = exceptions.find((e) => !e.is_available);
    if (activeException) {
      return {
        isOpen: false,
        reason: activeException.reason || 'تعطیلی کاری در این تاریخ ثبت شده است.',
        date: dateStr,
        dayOfWeek,
        dayName,
        serviceDurationMinutes: duration,
        serviceName: service.name,
        servicePrice: price,
        slots: [],
      };
    }

    // 6. Determine eligible staff
    const allStaff = await staffRepository.findBySalonId(salonId, true);
    if (allStaff.length === 0) {
      return {
        isOpen: false,
        reason: 'هیچ متخصصی در حال حاضر در این سالن فعال نمی‌باشد.',
        date: dateStr,
        dayOfWeek,
        dayName,
        serviceDurationMinutes: duration,
        serviceName: service.name,
        servicePrice: price,
        slots: [],
      };
    }

    let targetStaffList: DbStaff[] = [];
    if (staffId && staffId !== 'any') {
      const specificStaff = allStaff.find((s) => s.id === staffId);
      if (!specificStaff) {
        throw new BookingError('متخصص انتخاب شده یافت نشد.', 404, 'STAFF_NOT_FOUND');
      }
      targetStaffList = [specificStaff];
    } else {
      targetStaffList = allStaff;
    }

    // 7. Generate Time Intervals
    const dayStartMinutes = timeToMinutes(dayHours.start_time);
    const dayEndMinutes = timeToMinutes(dayHours.end_time);
    const maxStartMinutes = dayEndMinutes - duration;

    // Fetch all existing appointments for this salon and date
    const existingAppointments = await appointmentRepository.findBySalonId(salonId, {
      date: dateStr,
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

      // Find an available staff member who is free for this interval
      let freeStaff: DbStaff | null = null;

      for (const staff of targetStaffList) {
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
      date: dateStr,
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

    // 2. Authoritative Salon & Service Resolution
    const salon = await salonRepository.findById(params.salonId);
    if (!salon || salon.status !== 'active') {
      throw new BookingError('سالن مورد نظر یافت نشد یا در وضعیت فعال نمی‌باشد.', 404, 'SALON_NOT_FOUND');
    }

    const service = await serviceRepository.findById(params.serviceId);
    if (!service || service.salon_id !== params.salonId || !service.is_active) {
      throw new BookingError('خدمت مورد نظر یافت نشد یا غیرفعال است.', 404, 'SERVICE_NOT_FOUND');
    }

    // Authoritative duration and price from database/repo (NEVER trust client values)
    const durationMinutes = service.duration_minutes || 60;
    const price = typeof service.price === 'string' ? parseInt(service.price, 10) : service.price;
    const endTime = addMinutesToTime(params.bookingTime, durationMinutes);

    // 3. Working Hours Verification
    let dayOfWeek = 0;
    const parsedDate = new Date(params.bookingDate);
    if (!isNaN(parsedDate.getTime())) {
      dayOfWeek = getIranianDayOfWeek(parsedDate);
    }
    const workingHours = await salonRepository.getWorkingHours(params.salonId);
    const dayHours = workingHours.find((h) => h.day_of_week === dayOfWeek);

    if (dayHours && dayHours.is_closed) {
      throw new BookingError('سالن در این روز تعطیل است و امکان رزرو وجود ندارد.', 400, 'SALON_CLOSED');
    }

    if (dayHours) {
      const reqStart = timeToMinutes(params.bookingTime);
      const reqEnd = timeToMinutes(endTime);
      const openStart = timeToMinutes(dayHours.start_time);
      const openEnd = timeToMinutes(dayHours.end_time);

      if (reqStart < openStart || reqEnd > openEnd) {
        throw new BookingError(
          `زمان درخواستی خارج از ساعات کاری سالن (${dayHours.start_time} الی ${dayHours.end_time}) می‌باشد.`,
          400,
          'OUTSIDE_WORKING_HOURS'
        );
      }
    }

    // 4. Concurrency Protection & Overlap Prevention Execution
    let selectedStaffId = params.staffId;

    // Concurrency execution wrapper (handles both Postgres transaction and in-memory mutex)
    const executeAtomicBooking = async (client?: PoolClient): Promise<DbAppointment> => {
      // If staffId is 'any' or omitted, select an available qualified specialist
      if (!selectedStaffId || selectedStaffId === 'any') {
        const staffList = await staffRepository.findBySalonId(params.salonId, true, client);
        let foundStaff: DbStaff | null = null;

        for (const st of staffList) {
          const isFree = await appointmentRepository.checkSlotOverlap(
            params.salonId,
            st.id,
            params.bookingDate,
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
          params.bookingDate,
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
          b.booking_date === params.bookingDate &&
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
      const prefix = salon.slug ? salon.slug.slice(0, 3).toUpperCase() : 'NB';
      const randomCode = crypto.randomInt(1000, 9999);
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
          bookingDate: params.bookingDate,
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
        actorRole: 'customer',
        action: 'ثبت قطعی نوبت حضوری توسط مشتری',
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
          date: params.bookingDate,
          time: params.bookingTime,
          price,
        },
      }).catch(() => {});

      return createdAppt;
    };

    // If PostgreSQL is configured, wrap in a database transaction with row locks
    if (isDatabaseConfigured()) {
      return await withTransaction(async (dbClient) => {
        const appointment = await executeAtomicBooking(dbClient);
        return {
          trackingCode: appointment.tracking_code,
          appointment,
        };
      });
    } else {
      // In-Memory Dev/Test: Mutex lock per (salon, staff, date) to prevent parallel race conditions
      const lockKey = `${params.salonId}:${params.staffId || 'any'}:${params.bookingDate}`;
      const release = await acquireLock(lockKey);
      try {
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

    if (phone) {
      const norm = normalizeIranianPhone(phone);
      if (norm.isValid && appt.client_phone !== norm.national) {
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
