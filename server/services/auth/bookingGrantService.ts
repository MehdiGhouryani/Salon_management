import crypto from 'crypto';
import type { PoolClient } from 'pg';
import { config } from '../../config.ts';
import { query, isDatabaseConfigured } from '../../db/pool.ts';
import { normalizeIranianPhone } from '../../utils/phone.ts';

/**
 * Booking authorization grants (Phase 08).
 *
 * Contract: a successful booking_verification OTP proves ownership of a
 * normalized phone number and issues a SHORT-LIVED, SINGLE-USE,
 * PHONE-BOUND bearer grant. The grant authorizes exactly one booking
 * submission — it is NOT a login session, grants no access to booking
 * history or account operations, cannot be transferred to another phone,
 * and expires automatically.
 *
 * Security properties:
 *  - 256-bit cryptographically random token (crypto.randomBytes(32))
 *  - only the SHA-256 hash is persisted; the raw token lives solely in the
 *    verify response and is never logged
 *  - single use: atomic consume (guarded UPDATE), preferably inside the
 *    booking transaction so a failed booking rolls the consumption back
 *  - expiry enforced by the database row and re-checked on every use
 *  - phone binding enforced on validation AND consumption
 */

export type BookingGrantErrorCode =
  | 'BOOKING_GRANT_INVALID'
  | 'BOOKING_GRANT_EXPIRED'
  | 'BOOKING_GRANT_ALREADY_USED'
  | 'GRANT_PHONE_MISMATCH';

export class BookingGrantError extends Error {
  statusCode: number;
  code: BookingGrantErrorCode;

  constructor(code: BookingGrantErrorCode, message: string) {
    super(message);
    this.name = 'BookingGrantError';
    this.code = code;
    this.statusCode = 401;
    if (code === 'GRANT_PHONE_MISMATCH') this.statusCode = 403;
  }
}

export interface DbBookingGrant {
  id: string;
  token_hash: string;
  phone: string;
  purpose: string;
  created_at: Date;
  expires_at: Date;
  consumed_at: Date | null;
  consumed_by_appointment: string | null;
}

// In-memory adapter, strictly for development/test when no database is
// configured (mirrors the OTP/session service pattern).
const inMemoryGrants: Map<string, DbBookingGrant> = new Map();

function hashGrantToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export const bookingGrantService = {
  /** Issues a fresh phone-bound grant. Returns the raw token exactly once. */
  async issueGrant(phone: string, ttlOverrideMs?: number): Promise<{ token: string; expiresAt: Date }> {
    const phoneNorm = normalizeIranianPhone(phone);
    if (!phoneNorm.isValid) {
      throw new BookingGrantError('BOOKING_GRANT_INVALID', 'شماره همراه برای صدور مجوز نامعتبر است.');
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashGrantToken(rawToken);
    const ttlMs = ttlOverrideMs ?? config.auth.bookingGrantTtlMinutes * 60 * 1000;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMs);

    if (isDatabaseConfigured()) {
      await query(
        `INSERT INTO booking_grants (token_hash, phone, purpose, created_at, expires_at)
         VALUES ($1, $2, 'booking', $3, $4)`,
        [tokenHash, phoneNorm.national, now, expiresAt]
      );
    } else {
      inMemoryGrants.set(tokenHash, {
        id: `bg-${tokenHash.substring(0, 8)}`,
        token_hash: tokenHash,
        phone: phoneNorm.national,
        purpose: 'booking',
        created_at: now,
        expires_at: expiresAt,
        consumed_at: null,
        consumed_by_appointment: null,
      });
    }

    return { token: rawToken, expiresAt };
  },

  /**
   * Validates a grant WITHOUT consuming it (route-level pre-check so users
   * get precise errors). Raw token + normalized phone must both match.
   */
  async validateGrant(rawToken: string, phone: string): Promise<DbBookingGrant> {
    const phoneNorm = normalizeIranianPhone(phone);
    if (!phoneNorm.isValid) {
      throw new BookingGrantError('GRANT_PHONE_MISMATCH', 'شماره همراه ارسالی معتبر نیست.');
    }
    const tokenHash = hashGrantToken(rawToken);

    let grant: DbBookingGrant | undefined;
    if (isDatabaseConfigured()) {
      const res = await query<DbBookingGrant>(
        `SELECT * FROM booking_grants WHERE token_hash = $1 LIMIT 1`,
        [tokenHash]
      );
      grant = res.rows[0];
    } else {
      grant = inMemoryGrants.get(tokenHash);
    }

    if (!grant) {
      throw new BookingGrantError('BOOKING_GRANT_INVALID', 'مجوز ثبت نوبت معتبر نیست.');
    }
    if (grant.phone !== phoneNorm.national) {
      throw new BookingGrantError('GRANT_PHONE_MISMATCH', 'این مجوز برای شماره همراه دیگری صادر شده است.');
    }
    if (grant.consumed_at) {
      throw new BookingGrantError('BOOKING_GRANT_ALREADY_USED', 'این مجوز قبلاً استفاده شده است.');
    }
    if (grant.expires_at < new Date()) {
      throw new BookingGrantError('BOOKING_GRANT_EXPIRED', 'مجوز ثبت نوبت منقضی شده است. لطفاً دوباره کد تایید را دریافت کنید.');
    }
    return grant;
  },

  /**
   * ATOMIC consume — guarded UPDATE so parallel submissions cannot both win.
   * When called with a transaction client, a failed booking rolls the
   * consumption back (the customer keeps their grant to retry).
   * Records the appointment the grant authorized when one is provided.
   */
  async consumeGrant(
    rawToken: string,
    phone: string,
    client?: PoolClient,
    appointmentId?: string
  ): Promise<DbBookingGrant> {
    const phoneNorm = normalizeIranianPhone(phone);
    if (!phoneNorm.isValid) {
      throw new BookingGrantError('GRANT_PHONE_MISMATCH', 'شماره همراه ارسالی معتبر نیست.');
    }
    const tokenHash = hashGrantToken(rawToken);

    if (isDatabaseConfigured()) {
      const res = await query<DbBookingGrant>(
        `UPDATE booking_grants
         SET consumed_at = NOW(),
             consumed_by_appointment = COALESCE($3, consumed_by_appointment)
         WHERE token_hash = $1
           AND phone = $2
           AND consumed_at IS NULL
           AND expires_at > NOW()
         RETURNING *`,
        [tokenHash, phoneNorm.national, appointmentId || null],
        client
      );
      if (res.rows.length === 0) {
        // Distinguish the raced states for precise error contracts.
        const probe = await query<DbBookingGrant>(
          `SELECT * FROM booking_grants WHERE token_hash = $1 LIMIT 1`,
          [tokenHash],
          client
        );
        const grant = probe.rows[0];
        if (!grant || grant.phone !== phoneNorm.national) {
          throw new BookingGrantError('BOOKING_GRANT_INVALID', 'مجوز ثبت نوبت معتبر نیست.');
        }
        if (grant.consumed_at) {
          throw new BookingGrantError('BOOKING_GRANT_ALREADY_USED', 'این مجوز قبلاً استفاده شده است.');
        }
        throw new BookingGrantError('BOOKING_GRANT_EXPIRED', 'مجوز ثبت نوبت منقضی شده است.');
      }
      return res.rows[0];
    }

    // In-memory adapter (single-threaded per process): synchronous guarded consume.
    const grant = inMemoryGrants.get(tokenHash);
    if (!grant) {
      throw new BookingGrantError('BOOKING_GRANT_INVALID', 'مجوز ثبت نوبت معتبر نیست.');
    }
    if (grant.phone !== phoneNorm.national) {
      throw new BookingGrantError('GRANT_PHONE_MISMATCH', 'این مجوز برای شماره همراه دیگری صادر شده است.');
    }
    if (grant.consumed_at) {
      throw new BookingGrantError('BOOKING_GRANT_ALREADY_USED', 'این مجوز قبلاً استفاده شده است.');
    }
    if (grant.expires_at < new Date()) {
      throw new BookingGrantError('BOOKING_GRANT_EXPIRED', 'مجوز ثبت نوبت منقضی شده است.');
    }
    grant.consumed_at = new Date();
    grant.consumed_by_appointment = appointmentId || null;
    return grant;
  },

  /** Test-only: clears the in-memory adapter. */
  clearInMemory(): void {
    inMemoryGrants.clear();
  },
};
