/**
 * NobatAra Time & Availability Calculation Utilities
 * Handles Persian week mapping (0=Saturday to 6=Friday), time string arithmetic,
 * and slot overlap verification.
 */

export interface TimeInterval {
  start: string; // "HH:MM" 24h
  end: string;   // "HH:MM" 24h
}

/**
 * Converts "HH:MM" string to minutes since midnight
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const parts = timeStr.trim().split(':');
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

/**
 * Converts minutes since midnight back to "HH:MM" zero-padded string
 */
export function minutesToTime(totalMinutes: number): string {
  const normalized = Math.max(0, Math.min(24 * 60 - 1, totalMinutes));
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  const hStr = hours < 10 ? `0${hours}` : `${hours}`;
  const mStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return `${hStr}:${mStr}`;
}

/**
 * Adds duration in minutes to "HH:MM" string, returning new "HH:MM"
 */
export function addMinutesToTime(timeStr: string, minutesToAdd: number): string {
  const currentMinutes = timeToMinutes(timeStr);
  return minutesToTime(currentMinutes + minutesToAdd);
}

export const addMinutesToTimeString = addMinutesToTime;

/**
 * Formats a Date object to Persian date string (e.g. "1403/08/24") or ISO fallback
 */
export function formatIranianDate(date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('fa-IR-u-nu-latn-ca-persian', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date).replace(/\//g, '/');
  } catch {
    return date.toISOString().split('T')[0];
  }
}

/**
 * Parses date string or returns current date
 */
export function parseBookingDate(dateStr: string): Date {
  if (!dateStr || dateStr === 'امروز') return new Date();
  if (dateStr.includes('-')) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

/**
 * Checks if two time intervals [startA, endA) and [startB, endB) overlap
 * Definition: A starts before B ends, AND B starts before A ends
 */
export function doIntervalsOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const minStartA = timeToMinutes(startA);
  const minEndA = timeToMinutes(endA);
  const minStartB = timeToMinutes(startB);
  const minEndB = timeToMinutes(endB);

  return minStartA < minEndB && minStartB < minEndA;
}

/**
 * Determines Iranian day-of-week:
 * 0 = Saturday (شنبه)
 * 1 = Sunday (یکشنبه)
 * 2 = Monday (دوشنبه)
 * 3 = Tuesday (سه‌شنبه)
 * 4 = Wednesday (چهارشنبه)
 * 5 = Thursday (پنج‌شنبه)
 * 6 = Friday (جمعه)
 */
export function getIranianDayOfWeek(date: Date): number {
  const jsDay = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  return (jsDay + 1) % 7;
}

export const IRANIAN_DAY_NAMES: Record<number, string> = {
  0: 'شنبه',
  1: 'یکشنبه',
  2: 'دوشنبه',
  3: 'سه‌شنبه',
  4: 'چهارشنبه',
  5: 'پنج‌شنبه',
  6: 'جمعه',
};

/**
 * Generates an array of available slots for a given working day and duration
 */
export function generateAvailableSlots(
  startTime: string,
  endTime: string,
  durationMinutes: number,
  existingAppointments: Array<{ booking_time: string; end_time: string | null }>,
  slotIntervalMinutes: number = 30
): Array<{ time: string; endTime: string; available: boolean; conflictReason?: string }> {
  const slots: Array<{ time: string; endTime: string; available: boolean; conflictReason?: string }> = [];

  const dayStartMinutes = timeToMinutes(startTime);
  const dayEndMinutes = timeToMinutes(endTime);

  // Latest time a slot can start while finishing before or at dayEndMinutes
  const maxStartMinutes = dayEndMinutes - durationMinutes;

  for (let current = dayStartMinutes; current <= maxStartMinutes; current += slotIntervalMinutes) {
    const slotStart = minutesToTime(current);
    const slotEnd = minutesToTime(current + durationMinutes);

    // Check overlap with existing appointments
    let hasConflict = false;
    for (const appt of existingAppointments) {
      const apptEnd = appt.end_time || addMinutesToTime(appt.booking_time, 60);
      if (doIntervalsOverlap(slotStart, slotEnd, appt.booking_time, apptEnd)) {
        hasConflict = true;
        break;
      }
    }

    slots.push({
      time: slotStart,
      endTime: slotEnd,
      available: !hasConflict,
      conflictReason: hasConflict ? 'نوبت پر است' : undefined,
    });
  }

  return slots;
}
