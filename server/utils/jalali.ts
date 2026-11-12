/**
 * NobatAra Canonical Date Utilities (Phase 06 — DATE STORAGE)
 *
 * Canonical storage model:
 *  - PostgreSQL DATE column (`appointments.booking_date_greg`) holds the one
 *    canonical calendar date, always a Gregorian YYYY-MM-DD value.
 *  - The API/domain boundary speaks stable Gregorian YYYY-MM-DD strings.
 *  - Jalali (Persian calendar) values are accepted as validated INPUT and
 *    converted exactly once, at the boundary, using a round-trip-verified
 *    algorithm — never reinterpreted or silently discarded.
 *  - Weekday mapping is Saturday-first (0=شنبه … 6=جمعه) and computed in UTC
 *    (Date.UTC noon) so it is independent of the server's local timezone;
 *    Asia/Tehran is the business timezone for presentation formatting.
 *
 * The conversion algorithm is the widely-used 33-year-rule JDF algorithm.
 * The same algorithm is implemented in SQL inside migration 004 for data
 * backfill; a database test cross-verifies that both implementations agree.
 */

const div = (a: number, b: number): number => Math.trunc(a / b);

export interface GregorianDate {
  gy: number;
  gm: number;
  gd: number;
}

export interface JalaliDate {
  jy: number;
  jm: number;
  jd: number;
}

/** Gregorian → Jalali (JDF 33-year-rule algorithm). */
export function gregorianToJalali(gy: number, gm: number, gd: number): JalaliDate {
  const gDaysInMonth = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  let g = gy - (gy <= 1600 ? 621 : 1600);
  const gy2 = gm > 2 ? g + 1 : g;
  let days =
    365 * g +
    div(gy2 + 3, 4) -
    div(gy2 + 99, 100) +
    div(gy2 + 399, 400) -
    80 +
    gd +
    gDaysInMonth[gm - 1];

  jy += 33 * div(days, 12053);
  days %= 12053;
  jy += 4 * div(days, 1461);
  days %= 1461;
  if (days > 365) {
    jy += div(days - 1, 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + div(days, 31) : 7 + div(days - 186, 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return { jy, jm, jd };
}

/** Jalali → Gregorian (JDF 33-year-rule algorithm). Returns null for impossible dates. */
export function jalaliToGregorian(jyIn: number, jm: number, jd: number): GregorianDate | null {
  if (!Number.isInteger(jyIn) || !Number.isInteger(jm) || !Number.isInteger(jd)) return null;
  if (jm < 1 || jm > 12 || jd < 1 || jyIn < 1178 || jyIn > 1633) return null;
  if (jm <= 6 && jd > 31) return null;
  if (jm > 6 && jd > 30) return null;

  let jy = jyIn + 1595;
  let days =
    -355668 +
    365 * jy +
    div(jy, 33) * 8 +
    div((jy % 33) + 3, 4) +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);

  let gy = 400 * div(days, 146097);
  days %= 146097;
  if (days > 36524) {
    days -= 1;
    gy += 100 * div(days, 36524);
    days %= 36524;
    if (days >= 365) days += 1;
  }
  gy += 4 * div(days, 1461);
  days %= 1461;
  if (days > 365) {
    gy += div(days - 1, 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const leap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  const monthLengths = [0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 1;
  while (gm <= 12 && gd > monthLengths[gm]) {
    gd -= monthLengths[gm];
    gm += 1;
  }
  if (gm > 12) return null;

  // Round-trip validation: an impossible Jalali input (e.g. 1403/12/30 in a
  // non-leap year) would silently roll over to the next month — reject it.
  const back = gregorianToJalali(gy, gm, gd);
  if (back.jy !== jyIn || back.jm !== jm || back.jd !== jd) return null;

  return { gy, gm, gd };
}

const ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const JALALI_PATTERN = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/;

export interface ParsedBookingDate {
  /** Canonical Gregorian YYYY-MM-DD — the only value ever stored or queried. */
  canonical: string;
  /** Saturday-first weekday: 0=شنبه … 6=جمعه (computed TZ-independently). */
  weekday: number;
}

/**
 * Validates and canonicalizes a booking date input at the domain boundary.
 * Accepts Gregorian ISO (YYYY-MM-DD) or Jalali (YYYY/MM/DD).
 * Returns null for anything unparseable — callers must reject, never guess.
 */
export function parseBookingDateInput(raw: string): ParsedBookingDate | null {
  if (!raw || typeof raw !== 'string') return null;
  const value = raw.trim().replace(/[۰-۹]/g, (ch) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(ch)));

  const iso = ISO_PATTERN.exec(value);
  if (iso) {
    const gy = Number(iso[1]);
    const gm = Number(iso[2]);
    const gd = Number(iso[3]);
    const probe = new Date(Date.UTC(gy, gm - 1, gd, 12));
    if (
      probe.getUTCFullYear() !== gy ||
      probe.getUTCMonth() !== gm - 1 ||
      probe.getUTCDate() !== gd
    ) {
      return null; // impossible Gregorian date
    }
    return { canonical: value, weekday: (probe.getUTCDay() + 1) % 7 };
  }

  const jalali = JALALI_PATTERN.exec(value);
  if (jalali) {
    const converted = jalaliToGregorian(
      Number(jalali[1]),
      Number(jalali[2]),
      Number(jalali[3])
    );
    if (!converted) return null;
    const canonical = `${converted.gy}-${String(converted.gm).padStart(2, '0')}-${String(
      converted.gd
    ).padStart(2, '0')}`;
    const probe = new Date(Date.UTC(converted.gy, converted.gm - 1, converted.gd, 12));
    return { canonical, weekday: (probe.getUTCDay() + 1) % 7 };
  }

  return null;
}
