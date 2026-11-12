/**
 * NobatAra Unit Tests — Booking authorization grants (CATEGORY: unit/in-memory)
 *
 * Contract under test (Phase 08): short-lived, single-use, phone-bound
 * grants with hash-only storage and precise error codes.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  bookingGrantService,
  BookingGrantError,
} from '../../server/services/auth/bookingGrantService.ts';

beforeEach(() => {
  bookingGrantService.clearInMemory();
});

describe('Grant issuance (unit)', () => {
  it('issues a 256-bit token bound to the normalized phone', async () => {
    const { token, expiresAt } = await bookingGrantService.issueGrant('۰۹۳۶۱۲۳۴۵۶۷');
    expect(token).toMatch(/^[0-9a-f]{64}$/); // 32 bytes hex
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('rejects issuance for invalid phones', async () => {
    await expect(bookingGrantService.issueGrant('12345')).rejects.toMatchObject({
      code: 'BOOKING_GRANT_INVALID',
    });
  });
});

describe('Grant validation & consumption (unit)', () => {
  it('validates a fresh grant without consuming it', async () => {
    const { token } = await bookingGrantService.issueGrant('09361234567');
    const grant = await bookingGrantService.validateGrant(token, '09361234567');
    expect(grant.consumed_at).toBeNull();
    // still consumable after validation
    await expect(bookingGrantService.validateGrant(token, '09361234567')).resolves.toBeTruthy();
  });

  it('consumes atomically and rejects reuse (BOOKING_GRANT_ALREADY_USED)', async () => {
    const { token } = await bookingGrantService.issueGrant('09361234567');
    const consumed = await bookingGrantService.consumeGrant(token, '09361234567');
    expect(consumed.consumed_at).toBeTruthy();
    await expect(bookingGrantService.consumeGrant(token, '09361234567')).rejects.toMatchObject({
      code: 'BOOKING_GRANT_ALREADY_USED',
      statusCode: 401,
    });
    await expect(bookingGrantService.validateGrant(token, '09361234567')).rejects.toMatchObject({
      code: 'BOOKING_GRANT_ALREADY_USED',
    });
  });

  it('binds grants to the phone (GRANT_PHONE_MISMATCH on foreign phone)', async () => {
    const { token } = await bookingGrantService.issueGrant('09361234567');
    await expect(bookingGrantService.validateGrant(token, '09369999999')).rejects.toMatchObject({
      code: 'GRANT_PHONE_MISMATCH',
      statusCode: 403,
    });
    await expect(bookingGrantService.consumeGrant(token, '09369999999')).rejects.toMatchObject({
      code: 'GRANT_PHONE_MISMATCH',
    });
  });

  it('rejects unknown tokens (BOOKING_GRANT_INVALID)', async () => {
    await expect(
      bookingGrantService.validateGrant('f'.repeat(64), '09361234567')
    ).rejects.toMatchObject({ code: 'BOOKING_GRANT_INVALID', statusCode: 401 });
  });

  it('rejects expired grants (BOOKING_GRANT_EXPIRED) — negative TTL override', async () => {
    const { token } = await bookingGrantService.issueGrant('09361234567', -1000);
    await expect(bookingGrantService.validateGrant(token, '09361234567')).rejects.toMatchObject({
      code: 'BOOKING_GRANT_EXPIRED',
      statusCode: 401,
    });
    await expect(bookingGrantService.consumeGrant(token, '09361234567')).rejects.toMatchObject({
      code: 'BOOKING_GRANT_EXPIRED',
    });
  });

  it('never stores the raw token (hash-only persistence)', async () => {
    // In-memory adapter mirrors the DB schema: only token_hash exists.
    const { token } = await bookingGrantService.issueGrant('09361234567');
    const grant = await bookingGrantService.validateGrant(token, '09361234567');
    expect(grant.token_hash).not.toContain(token);
    expect(grant.token_hash).toHaveLength(64);
    const asRecord = JSON.stringify(grant);
    expect(asRecord.includes(token)).toBe(false);
  });
});
