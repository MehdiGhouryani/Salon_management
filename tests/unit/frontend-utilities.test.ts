import { describe, expect, it } from 'vitest';
import {
  formatNumber,
  isValidMobile,
  normalizePhone,
  shortDate,
  toLatinDigits,
} from '../../src/utils/formatters.ts';
import { SLOTS, timeToMinutes } from '../../src/utils/booking.ts';

describe('shared Persian front-end utilities', () => {
  it('normalizes Persian and Arabic digits to Latin digits', () => {
    expect(toLatinDigits('۰۹۱۲۳۴۵۶۷۸۹')).toBe('09123456789');
    expect(toLatinDigits('٠٩١٢٣٤٥٦٧٨٩')).toBe('09123456789');
  });

  it('normalizes and validates Iranian mobile numbers consistently', () => {
    expect(normalizePhone('۰۹۱۲ ۳۴۵-۶۷۸۹')).toBe('09123456789');
    expect(isValidMobile('۰۹۱۲۳۴۵۶۷۸۹')).toBe(true);
    expect(isValidMobile('۰۹۱۲۳۴۵۶۷')).toBe(false);
  });

  it('uses one number formatter for monetary values across the app', () => {
    expect(formatNumber(1200000)).toBe('۱,۲۰۰,۰۰۰');
  });

  it('shortens the existing Persian date-label format', () => {
    expect(shortDate('امروز (پنجشنبه ۸ آبان)')).toBe('امروز');
    expect(shortDate('۱۴۰۵-۰۸-۲۸')).toBe('۱۴۰۵-۰۸-۲۸');
  });

  it('parses Persian time digits and shares the same slot presets', () => {
    expect(timeToMinutes('۱۱:۳۰')).toBe(690);
    expect(SLOTS).toContain('۱۱:۳۰');
  });
});
