/**
 * NobatAra Unit Tests — Canonical date utilities (CATEGORY: unit/pure)
 *
 * Ground-truth expectations verified against the real Persian calendar
 * (1403/08/25 = 2024-11-15, a Friday; 1404/09/05 = 2025-11-26, a Wednesday).
 * The SQL counterpart of the conversion algorithm is cross-verified against
 * these same values in tests/db/postgres-repositories.test.ts.
 */
import { describe, it, expect } from 'vitest';
import {
  parseBookingDateInput,
  jalaliToGregorian,
  gregorianToJalali,
} from '../../server/utils/jalali.ts';

describe('Canonical booking date parsing (unit, pure)', () => {
  it('accepts Gregorian ISO input unchanged with Saturday-first weekday', () => {
    const parsed = parseBookingDateInput('2026-11-20');
    expect(parsed!.canonical).toBe('2026-11-20');
    // 2026-11-20 is a Friday → weekday 6 (جمعه) in the Saturday-first mapping
    expect(parsed!.weekday).toBe(6);
  });

  it('converts valid Jalali input to canonical Gregorian (1403/08/25 → 2024-11-15)', () => {
    const parsed = parseBookingDateInput('1403/08/25');
    expect(parsed!.canonical).toBe('2024-11-15');
    expect(parsed!.weekday).toBe(6); // Friday
  });

  it('converts 1404/09/05 → 2025-11-26 (Wednesday)', () => {
    const parsed = parseBookingDateInput('1404/09/05');
    expect(parsed!.canonical).toBe('2025-11-26');
    expect(parsed!.weekday).toBe(4); // Wednesday
  });

  it('rejects impossible Gregorian dates instead of rolling them over', () => {
    expect(parseBookingDateInput('2026-02-30')).toBeNull();
    expect(parseBookingDateInput('2025-13-01')).toBeNull();
  });

  it('rejects impossible Jalali dates (1404/12/30 — non-leap year) instead of rolling over', () => {
    expect(parseBookingDateInput('1404/12/30')).toBeNull();
    // Leap-year Esfand 30 exists (1403 is leap)
    expect(parseBookingDateInput('1403/12/30')!.canonical).toBe('2025-03-20');
  });

  it('rejects garbage and Jalali-string placeholders like "امروز"', () => {
    expect(parseBookingDateInput('امروز')).toBeNull();
    expect(parseBookingDateInput('')).toBeNull();
    expect(parseBookingDateInput('not-a-date')).toBeNull();
  });

  it('normalizes Persian digits in date inputs', () => {
    expect(parseBookingDateInput('۱۴۰۴/۰۹/۰۵')!.canonical).toBe('2025-11-26');
  });
});

describe('Jalali↔Gregorian round-trip (unit, pure)', () => {
  it('round-trips representative dates in both directions', () => {
    const cases: Array<[number, number, number]> = [
      [1403, 1, 1],
      [1403, 8, 25],
      [1403, 12, 30], // leap-year Esfand 30
      [1404, 9, 5],
      [1404, 12, 29], // last day of a non-leap year
    ];
    for (const [jy, jm, jd] of cases) {
      const g = jalaliToGregorian(jy, jm, jd)!;
      expect(g).toBeTruthy();
      const back = gregorianToJalali(g.gy, g.gm, g.gd);
      expect(back).toEqual({ jy, jm, jd });
    }
  });

  it('returns null for out-of-domain or impossible Jalali dates', () => {
    expect(jalaliToGregorian(1404, 12, 30)).toBeNull();
    expect(jalaliToGregorian(1403, 13, 1)).toBeNull();
    expect(jalaliToGregorian(1403, 7, 31)).toBeNull();
    expect(jalaliToGregorian(999, 1, 1)).toBeNull();
  });
});
