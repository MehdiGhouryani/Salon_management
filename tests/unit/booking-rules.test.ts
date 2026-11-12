/**
 * NobatAra Unit Tests — Booking rules engine (CATEGORY: unit/pure+in-memory)
 * Phase 09: the shared schedule/eligibility/past-date rules every booking
 * path uses.
 */
import { describe, it, expect } from 'vitest';
import {
  assertNotPast,
  assertBookingTimeValidity,
  assertStaffEligibleForService,
  effectiveWorkingHours,
  findBlockingException,
  resolveBookingScheduleContext,
  isValidHHMM,
  tehranTodayIso,
  tehranNowHHMM,
} from '../../server/services/booking/bookingRules.ts';
import { salonRepository } from '../../server/repositories/salonRepository.ts';

function minutesAgoHHMM(minutes: number): string {
  const d = new Date(Date.now() - minutes * 60_000);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tehran',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

describe('Time validity (unit)', () => {
  it('accepts strict 24h HH:MM', () => {
    expect(isValidHHMM('09:30')).toBe(true);
    expect(isValidHHMM('23:59')).toBe(true);
    expect(isValidHHMM('00:00')).toBe(true);
  });

  it('rejects malformed times', () => {
    expect(isValidHHMM('9:30')).toBe(false);
    expect(isValidHHMM('24:00')).toBe(false);
    expect(isValidHHMM('10:5')).toBe(false);
    expect(isValidHHMM('abc')).toBe(false);
    expect(isValidHHMM('')).toBe(false);
  });

  it('assertBookingTimeValidity throws INVALID_BOOKING_TIME', () => {
    expect(() => assertBookingTimeValidity('25:99')).toThrowError(
      expect.objectContaining({ code: 'INVALID_BOOKING_TIME' })
    );
  });
});

describe('Past-date policy, Asia/Tehran (unit)', () => {
  it('rejects dates before Tehran-today', () => {
    const yesterday = new Date(new Date(tehranTodayIso()).getTime() - 86_400_000)
      .toISOString()
      .split('T')[0];
    expect(() => assertNotPast(yesterday)).toThrowError(
      expect.objectContaining({ code: 'PAST_DATE_NOT_ALLOWED' })
    );
  });

  it('rejects same-day times in the past (Tehran clock)', () => {
    const today = tehranTodayIso();
    const pastTime = minutesAgoHHMM(5);
    expect(() => assertNotPast(today, pastTime)).toThrowError(
      expect.objectContaining({ code: 'PAST_TIME_NOT_ALLOWED' })
    );
  });

  it('accepts today with a future time and future dates', () => {
    const today = tehranTodayIso();
    const nowHHMM = tehranNowHHMM();
    const futureTime = `${String(Number(nowHHMM.split(':')[0])).padStart(2, '0')}:${String(
      (Number(nowHHMM.split(':')[1]) + 10) % 60
    ).padStart(2, '0')}`;
    // simple +10 minutes; guard against hour rollover
    if (Number(nowHHMM.split(':')[1]) + 10 < 60) {
      expect(() => assertNotPast(today, futureTime)).not.toThrow();
    }
    expect(() => assertNotPast('2099-01-01', '09:00')).not.toThrow();
  });
});

describe('Working hours fail-safe and staff override (unit, in-memory)', () => {
  const baseCtx = () =>
    ({
      canonicalDate: '2099-01-04', // a future Saturday
      weekday: 0,
      workingHours: [],
      exceptions: [],
      salon: {} as never,
      service: {} as never,
    }) as unknown as Parameters<typeof effectiveWorkingHours>[0];

  it('FAILS SAFE when no working hours are configured (unconfigured, not permissive)', () => {
    const hours = effectiveWorkingHours(baseCtx());
    expect('unconfigured' in hours).toBe(true);
  });

  it('uses salon-level hours when present', () => {
    const ctx = {
      ...baseCtx(),
      workingHours: [
        { salon_id: 'x', staff_id: null, day_of_week: 0, start_time: '09:00', end_time: '18:00', is_closed: false },
      ],
    } as never;
    const hours = effectiveWorkingHours(ctx) as { start: string; end: string };
    expect(hours.start).toBe('09:00');
    expect(hours.end).toBe('18:00');
  });

  it('staff-level hours override salon-level; closed staff rows block', () => {
    const ctx = {
      ...baseCtx(),
      workingHours: [
        { salon_id: 'x', staff_id: null, day_of_week: 0, start_time: '09:00', end_time: '18:00', is_closed: false },
        { salon_id: 'x', staff_id: 'stf-9', day_of_week: 0, start_time: '10:00', end_time: '16:00', is_closed: false },
        { salon_id: 'x', staff_id: 'stf-closed', day_of_week: 0, start_time: '00:00', end_time: '00:00', is_closed: true },
      ],
    } as never;
    const staffHours = effectiveWorkingHours(ctx, 'stf-9') as { start: string; end: string };
    expect(staffHours.start).toBe('10:00');
    expect('closed' in effectiveWorkingHours(ctx, 'stf-closed')).toBe(true);
  });
});

describe('Schedule exceptions (unit, in-memory)', () => {
  const ctxFor = (exceptions: never[]) =>
    ({
      canonicalDate: '2099-01-04',
      weekday: 0,
      workingHours: [
        { salon_id: 'x', staff_id: null, day_of_week: 0, start_time: '09:00', end_time: '18:00', is_closed: false },
      ],
      exceptions,
      salon: {} as never,
      service: {} as never,
    }) as never;

  it('salon-wide all-day exception blocks', () => {
    const e = {
      id: 'e1', salon_id: 'x', staff_id: null, start_date: '2099-01-04', end_date: '2099-01-04',
      start_time: null, end_time: null, reason: 'تعطیل رسمی', exception_type: 'holiday', is_available: false,
    } as never;
    expect(findBlockingException(ctxFor([e]))).toBeTruthy();
  });

  it('timed break blocks only the overlapping interval', () => {
    const e = {
      id: 'e2', salon_id: 'x', staff_id: null, start_date: '2099-01-04', end_date: '2099-01-04',
      start_time: '12:00', end_time: '13:00', reason: 'ناهار', exception_type: 'special_hours', is_available: false,
    } as never;
    const ctx = ctxFor([e]);
    expect(findBlockingException(ctx, undefined, '12:30', '13:30')).toBeTruthy();
    expect(findBlockingException(ctx, undefined, '13:00', '14:00')).toBeNull();
  });

  it('staff-specific exceptions do not block other staff', () => {
    const e = {
      id: 'e3', salon_id: 'x', staff_id: 'stf-9', start_date: '2099-01-04', end_date: '2099-01-04',
      start_time: null, end_time: null, reason: 'مرخصی', exception_type: 'sick_leave', is_available: false,
    } as never;
    const ctx = ctxFor([e]);
    expect(findBlockingException(ctx, 'stf-9')).toBeTruthy();
    expect(findBlockingException(ctx, 'stf-other')).toBeNull();
  });
});

describe('Staff-service eligibility (unit, in-memory seed)', () => {
  it('accepts assigned pairs (stf-101 → srv-101)', async () => {
    await expect(assertStaffEligibleForService('stf-101', 'srv-101')).resolves.toBeUndefined();
  });

  it('rejects unassigned pairs (stf-101 → srv-104)', async () => {
    await expect(assertStaffEligibleForService('stf-101', 'srv-104')).rejects.toMatchObject({
      code: 'STAFF_NOT_ELIGIBLE_FOR_SERVICE',
      statusCode: 400,
    });
  });
});

describe('Context resolution (unit, in-memory seed)', () => {
  it('rejects unparseable dates', async () => {
    await expect(resolveBookingScheduleContext('sal-101', 'srv-101', 'not-a-date')).rejects.toMatchObject({
      code: 'INVALID_DATE',
    });
  });

  it('rejects nonexistent salons', async () => {
    await expect(resolveBookingScheduleContext('no-salon', 'srv-101', '2099-01-04')).rejects.toMatchObject({
      code: 'SALON_NOT_FOUND',
    });
  });

  it('rejects services owned by another salon', async () => {
    // srv-101 belongs to sal-101; asking for it under sal-102 must fail.
    await expect(resolveBookingScheduleContext('sal-102', 'srv-101', '2099-01-04')).rejects.toMatchObject({
      code: 'SERVICE_NOT_FOUND',
    });
  });
});
