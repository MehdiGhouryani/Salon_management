/**
 * NobatAra Booking Rules Engine (Phase 09)
 *
 * ONE shared domain module used by EVERY appointment creation and change path:
 * public booking, manual salon booking, rescheduling, and availability.
 * No path may keep private validation logic — schedule rules, eligibility,
 * time/date validity, and the past-date policy live here and only here.
 *
 * Time & calendar:
 *  - canonical Gregorian dates everywhere in domain logic and storage
 *  - Asia/Tehran is the business timezone: "today"/"now" never depend on the
 *    host machine's timezone
 *  - Jalali conversion happens only at validated input boundaries
 *    (server/utils/jalali.ts) and for presentation
 *  - Saturday-first weekday mapping: 0=شنبه … 6=جمعه
 *
 * Fail-safe rule: missing critical schedule configuration (no working hours
 * for a weekday) REJECTS the booking instead of accidentally permitting it.
 */

import { config } from '../../config.ts';
import { salonRepository } from '../../repositories/salonRepository.ts';
import { serviceRepository } from '../../repositories/serviceRepository.ts';
import { staffRepository } from '../../repositories/staffRepository.ts';
import type { DbSalon, DbWorkingHour, DbAvailabilityException } from '../../repositories/salonRepository.ts';
import type { DbService } from '../../repositories/serviceRepository.ts';
import type { DbStaff } from '../../repositories/staffRepository.ts';
import { parseBookingDateInput } from '../../utils/jalali.ts';

export class BookingRuleError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'BookingRuleError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/** Canonical "today" in the Asia/Tehran business timezone (YYYY-MM-DD). */
export function tehranTodayIso(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' }).format(new Date());
}

/** Current wall-clock HH:MM in Asia/Tehran. */
export function tehranNowHHMM(): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tehran',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidHHMM(time: string): boolean {
  return typeof time === 'string' && TIME_PATTERN.test(time);
}

export function timeToMinutes(time: string): number {
  if (!isValidHHMM(time)) return NaN;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export interface BookingScheduleContext {
  salon: DbSalon;
  service: DbService;
  /** Canonical Gregorian date (YYYY-MM-DD). */
  canonicalDate: string;
  /** Saturday-first weekday (0=شنبه … 6=جمعه). */
  weekday: number;
  workingHours: DbWorkingHour[];
  exceptions: DbAvailabilityException[];
}

/**
 * Resolves and validates the shared schedule context for a booking attempt:
 * salon existence + operational status, service validity + ownership,
 * canonical date parsing. Loads working hours and exceptions once so every
 * path reasons over identical data.
 */
export async function resolveBookingScheduleContext(
  salonId: string,
  serviceId: string,
  rawDate: string
): Promise<BookingScheduleContext> {
  const parsed = parseBookingDateInput(rawDate);
  if (!parsed) {
    throw new BookingRuleError(
      'تاریخ نوبت معتبر نیست. قالب صحیح: YYYY-MM-DD یا تاریخ شمسی معتبر.',
      400,
      'INVALID_DATE'
    );
  }

  const salon = await salonRepository.findById(salonId);
  if (!salon || salon.status !== 'active') {
    throw new BookingRuleError('سالن مورد نظر یافت نشد یا در وضعیت فعال نمی‌باشد.', 404, 'SALON_NOT_FOUND');
  }

  const service = await serviceRepository.findById(serviceId);
  if (!service || service.salon_id !== salonId || !service.is_active) {
    throw new BookingRuleError('خدمت مورد نظر در این سالن یافت نشد یا غیرفعال است.', 404, 'SERVICE_NOT_FOUND');
  }

  // ALL exceptions for the salon (salon-wide AND staff-specific); the rules
  // engine filters by staff and date coverage per appointment attempt.
  const [workingHours, exceptions] = await Promise.all([
    salonRepository.getWorkingHours(salonId),
    salonRepository.getAllAvailabilityExceptions(salonId),
  ]);

  return {
    salon,
    service,
    canonicalDate: parsed.canonical,
    weekday: parsed.weekday,
    workingHours,
    exceptions,
  };
}

/**
 * Past-date policy (safe default, documented):
 *  - dates before Tehran-today are rejected;
 *  - same-day bookings must start at or after Tehran-now (minute precision).
 * No commercial cancellation-window rules are invented here.
 */
export function assertNotPast(canonicalDate: string, bookingTime?: string): void {
  const today = tehranTodayIso();
  if (canonicalDate < today) {
    throw new BookingRuleError(
      'امکان ثبت نوبت برای تاریخ گذشته وجود ندارد.',
      400,
      'PAST_DATE_NOT_ALLOWED'
    );
  }
  if (canonicalDate === today && bookingTime) {
    const nowHHMM = tehranNowHHMM();
    if (timeToMinutes(bookingTime) < timeToMinutes(nowHHMM)) {
      throw new BookingRuleError(
        'ساعت انتخابی برای امروز گذشته است. لطفاً ساعت آینده را انتخاب کنید.',
        400,
        'PAST_TIME_NOT_ALLOWED'
      );
    }
  }
}

export function assertBookingTimeValidity(bookingTime: string): void {
  if (!isValidHHMM(bookingTime)) {
    throw new BookingRuleError(
      'ساعت نوبت معتبر نیست. قالب صحیح: HH:MM (۲۴ ساعته).',
      400,
      'INVALID_BOOKING_TIME'
    );
  }
}

/**
 * Effective working hours for a staff member on a weekday: staff-level rows
 * override salon-level rows; if nothing is configured the booking FAILS SAFE.
 */
export function effectiveWorkingHours(
  ctx: BookingScheduleContext,
  staffId?: string
): { start: string; end: string } | { closed: true } | { unconfigured: true } {
  if (staffId) {
    const staffRows = ctx.workingHours.filter((h) => h.staff_id === staffId && h.day_of_week === ctx.weekday);
    if (staffRows.length > 0) {
      const row = staffRows[0];
      return row.is_closed ? { closed: true } : { start: row.start_time, end: row.end_time };
    }
  }

  const salonRows = ctx.workingHours.filter((h) => h.staff_id === null && h.day_of_week === ctx.weekday);
  if (salonRows.length === 0) {
    // FAIL SAFE (Phase 09): missing schedule configuration never permits a booking.
    return { unconfigured: true };
  }
  const row = salonRows[0];
  return row.is_closed ? { closed: true } : { start: row.start_time, end: row.end_time };
}

/**
 * Active blocking exception (holiday / time off / break) covering the date —
 * and, when a time window is present, the requested interval — for the salon
 * or the specific staff member.
 */
export function findBlockingException(
  ctx: BookingScheduleContext,
  staffId?: string,
  bookingTime?: string,
  endTime?: string
): DbAvailabilityException | null {
  for (const e of ctx.exceptions) {
    if (e.is_available) continue;
    const appliesToStaff = !e.staff_id || (staffId ? e.staff_id === staffId : false);
    if (!appliesToStaff) continue;

    const coversDate = ctx.canonicalDate >= e.start_date && ctx.canonicalDate <= e.end_date;
    if (!coversDate) continue;

    if (e.start_time && e.end_time && bookingTime && endTime) {
      // Timed break/time-off: overlaps with the requested interval?
      if (bookingTime < e.end_time && e.start_time < endTime) {
        return e;
      }
      continue;
    }
    // All-day exception
    return e;
  }
  return null;
}

/**
 * Full schedule validation for an appointment attempt. Throws BookingRuleError
 * with a user-facing message on any violation.
 */
export function assertScheduleOpen(
  ctx: BookingScheduleContext,
  options: { staffId?: string; bookingTime: string; endTime: string }
): void {
  assertBookingTimeValidity(options.bookingTime);
  assertBookingTimeValidity(options.endTime);
  assertNotPast(ctx.canonicalDate, options.bookingTime);

  const exception = findBlockingException(ctx, options.staffId, options.bookingTime, options.endTime);
  if (exception) {
    throw new BookingRuleError(
      `در این تاریخ امکان پذیرش نوبت وجود ندارد (${exception.reason || 'تعطیلی یا مرخصی ثبت شده'}).`,
      400,
      'SCHEDULE_EXCEPTION_BLOCKED'
    );
  }

  const hours = effectiveWorkingHours(ctx, options.staffId);
  if ('unconfigured' in hours) {
    throw new BookingRuleError(
      'ساعات کاری این روز برای سالن تنظیم نشده است. امکان ثبت نوبت وجود ندارد.',
      400,
      'WORKING_HOURS_NOT_CONFIGURED'
    );
  }
  if ('closed' in hours) {
    throw new BookingRuleError('سالن در این روز تعطیل است و امکان رزرو وجود ندارد.', 400, 'SALON_CLOSED');
  }

  const reqStart = timeToMinutes(options.bookingTime);
  const reqEnd = timeToMinutes(options.endTime);
  const openStart = timeToMinutes(hours.start);
  const openEnd = timeToMinutes(hours.end);
  if (reqStart < openStart || reqEnd > openEnd) {
    throw new BookingRuleError(
      `زمان درخواستی خارج از ساعات کاری (${hours.start} الی ${hours.end}) می‌باشد.`,
      400,
      'OUTSIDE_WORKING_HOURS'
    );
  }
}

/** Staff-service eligibility: a specialist may only take services assigned to them. */
export async function assertStaffEligibleForService(
  staffId: string,
  serviceId: string
): Promise<void> {
  const assigned = await staffRepository.getAssignedServices(staffId);
  if (!assigned.some((m) => m.service_id === serviceId)) {
    throw new BookingRuleError(
      'این خدمت برای متخصص انتخابی فعال نیست. لطفاً متخصص دیگری انتخاب کنید.',
      400,
      'STAFF_NOT_ELIGIBLE_FOR_SERVICE'
    );
  }
}

/** Filters a staff list down to those eligible for the service. */
export async function filterEligibleStaff(
  staffList: DbStaff[],
  serviceId: string
): Promise<DbStaff[]> {
  const results: DbStaff[] = [];
  for (const staff of staffList) {
    const assigned = await staffRepository.getAssignedServices(staff.id);
    if (assigned.some((m) => m.service_id === serviceId)) {
      results.push(staff);
    }
  }
  return results;
}

export { config };
