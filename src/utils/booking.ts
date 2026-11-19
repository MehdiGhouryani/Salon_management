import { toLatinDigits } from './formatters';

/** Shared front-end booking time utilities and customer/staff slot presets. */
export function timeToMinutes(value: string): number {
  const [hours, minutes] = toLatinDigits(value).split(':').map((part) => Number.parseInt(part, 10));
  return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
}

/** Labels may be Persian display text or canonical ISO dates from the API. */
export function isTodayLabel(value: string): boolean {
  if (value.startsWith('امروز')) return true;
  try {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' }).format(new Date());
    return value === today;
  } catch {
    return false;
  }
}

export function todayLabelFa(date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(date);
  } catch {
    return '';
  }
}

export const SLOTS = ['۱۰:۰۰', '۱۱:۳۰', '۱۲:۰۰', '۱۳:۰۰', '۱۴:۳۰', '۱۶:۰۰', '۱۷:۳۰', '۱۹:۰۰', '۲۰:۳۰'];
