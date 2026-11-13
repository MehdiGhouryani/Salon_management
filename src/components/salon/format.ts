import { toPersianDigits } from '../../utils/formatters';

const PERSIAN = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC = '٠١٢٣٤٥٦٧٨٩';

export const toLatinDigits = (s: string) =>
  s
    .replace(/[۰-۹]/g, (d) => String(PERSIAN.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(ARABIC.indexOf(d)));

export const normalizePhone = (s: string) => toLatinDigits(s).replace(/[\s\-]/g, '');
export const isValidMobile = (s: string) => /^09\d{9}$/.test(normalizePhone(s));

/** Grouped number in Persian digits, no unit (the unit is a smaller grey suffix next to it). */
export const money = (n: number) => toPersianDigits(n.toLocaleString('en-US'));

export const timeToMinutes = (t: string) => {
  const [h, m] = toLatinDigits(t).split(':').map((x) => parseInt(x, 10));
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
};

/** The customer flow stores "امروز (یکشنبه ۴ آبان)"; the walk-in form stores plain "امروز".
 *  Phase 12: server appointments use canonical Gregorian dates — Tehran-today
 *  ISO counts as today. */
export const isTodayLabel = (date: string) => {
  if (date.startsWith('امروز')) return true;
  try {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' }).format(new Date());
    return date === today;
  } catch {
    return false;
  }
};

/** "امروز (یکشنبه ۴ آبان)" -> "امروز" for compact rows. */
export const shortDate = (date: string) => date.split(' (')[0];

export const todayLabelFa = (d: Date = new Date()) => {
  try {
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(d);
  } catch {
    return '';
  }
};

export const SLOTS = ['۱۰:۰۰', '۱۱:۳۰', '۱۲:۰۰', '۱۳:۰۰', '۱۴:۳۰', '۱۶:۰۰', '۱۷:۳۰', '۱۹:۰۰', '۲۰:۳۰'];
