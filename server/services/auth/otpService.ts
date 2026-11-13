import crypto from 'crypto';
import type { PoolClient } from 'pg';
import { config } from '../../config.ts';
import { query, isDatabaseConfigured } from '../../db/pool.ts';
import { normalizeIranianPhone } from '../../utils/phone.ts';
import { getSmsProvider } from '../sms/index.ts';
import { maskPhone } from '../sms/kavenegarProvider.ts';
import { userRepository, type DbUser } from '../../repositories/userRepository.ts';
import { clientRepository } from '../../repositories/clientRepository.ts';

export type OtpPurpose = 'login' | 'booking_verification' | 'admin_step_up';

export interface OtpChallenge {
  id: string;
  phone: string;
  purpose: OtpPurpose;
  code_hash: string;
  attempts: number;
  max_attempts: number;
  resend_available_at: Date;
  expires_at: Date;
  consumed_at: Date | null;
  ip_address: string;
  created_at: Date;
}

// In-memory fallback store exclusively for development/test when database is not configured
const inMemoryChallenges: Map<string, OtpChallenge> = new Map();

/**
 * Computes a secure HMAC-SHA256 hash of the OTP combined with phone and purpose
 */
function hashOtpCode(code: string, phone: string, purpose: string): string {
  return crypto
    .createHmac('sha256', config.auth.sessionSecret)
    .update(`${code}:${phone}:${purpose}`)
    .digest('hex');
}

/**
 * Generates a cryptographically secure 6-digit numeric OTP string
 */
function generateSecureOtpCode(): string {
  // Generates integer between 100000 and 999999 inclusive
  return String(crypto.randomInt(100000, 1000000));
}

export const otpService = {
  /**
   * Requests a new OTP challenge
   */
  async requestOtp(
    rawPhone: string,
    purpose: OtpPurpose = 'login',
    ipAddress: string
  ): Promise<{
    success: boolean;
    phoneE164: string;
    phoneNational: string;
    resendAvailableInSeconds: number;
    expiresInSeconds: number;
    error?: string;
    errorCode?: string;
    statusCode?: number;
  }> {
    const phoneNorm = normalizeIranianPhone(rawPhone);
    if (!phoneNorm.isValid) {
      return {
        success: false,
        phoneE164: '',
        phoneNational: '',
        resendAvailableInSeconds: 0,
        expiresInSeconds: 0,
        error: phoneNorm.error || 'شماره موبایل نامعتبر است.',
        statusCode: 400,
      };
    }

    const phoneKey = phoneNorm.national;
    const now = new Date();

    // Check existing active challenge for cooldown
    const existing = await this.findLatestChallenge(phoneKey, purpose);
    if (existing && existing.resend_available_at > now && !existing.consumed_at) {
      const waitSeconds = Math.ceil((existing.resend_available_at.getTime() - now.getTime()) / 1000);
      return {
        success: false,
        phoneE164: phoneNorm.e164,
        phoneNational: phoneNorm.national,
        resendAvailableInSeconds: waitSeconds,
        expiresInSeconds: Math.ceil((existing.expires_at.getTime() - now.getTime()) / 1000),
        error: `لطفا پیش از درخواست مجدد پیامک، ${waitSeconds} ثانیه صبر کنید.`,
        statusCode: 429,
      };
    }

    // Rate limiting: max 5 requests per 10 minutes from same IP or phone
    const recentRequestsCount = await this.countRecentRequests(phoneKey, ipAddress, 10 * 60 * 1000);
    if (recentRequestsCount >= 5) {
      return {
        success: false,
        phoneE164: phoneNorm.e164,
        phoneNational: phoneNorm.national,
        resendAvailableInSeconds: 600,
        expiresInSeconds: 0,
        error: 'تعداد درخواست‌های شما بیش از حد مجاز است. لطفا ۱۰ دقیقه دیگر دوباره تلاش فرمایید.',
        statusCode: 429,
      };
    }

    // Generate secure code and hash
    const code = generateSecureOtpCode();
    const codeHash = hashOtpCode(code, phoneKey, purpose);

    const resendAvailableAt = new Date(now.getTime() + config.auth.otpResendCooldownSeconds * 1000);
    const expiresAt = new Date(now.getTime() + config.auth.otpTtlSeconds * 1000);

    // Save challenge
    await this.saveChallenge({
      id: crypto.randomUUID(),
      phone: phoneKey,
      purpose,
      code_hash: codeHash,
      attempts: 0,
      max_attempts: config.auth.otpMaxAttempts,
      resend_available_at: resendAvailableAt,
      expires_at: expiresAt,
      consumed_at: null,
      ip_address: ipAddress,
      created_at: now,
    });

    // Send OTP via SMS provider
    const smsProvider = getSmsProvider();
    // Phase 14: OTP rate limits already applied above (cooldown + per-IP/phone
    // counters) BEFORE the provider is called — the provider can never be
    // leveraged for SMS flooding.
    const sendResult = await smsProvider.sendOtp(phoneNorm.national, code);

    if (!sendResult.success) {
      // Structured, generic client error — provider internals stay in logs.
      const genericError = 'ارسال پیامک با خطا مواجه شد. لطفا دقایقی دیگر تلاش کنید.';
      if (config.isProduction) {
        return {
          success: false,
          phoneE164: phoneNorm.e164,
          phoneNational: phoneNorm.national,
          resendAvailableInSeconds: 0,
          expiresInSeconds: 0,
          error: genericError,
          errorCode: sendResult.errorCode || 'SMS_DELIVERY_FAILED',
          statusCode: 503,
        };
      } else {
        console.warn(
          `[OTP Service] Dev warning: SMS provider error (${sendResult.errorCode || 'unknown'}) for ${maskPhone(phoneNorm.national)}`
        );
      }
    }

    return {
      success: true,
      phoneE164: phoneNorm.e164,
      phoneNational: phoneNorm.national,
      resendAvailableInSeconds: config.auth.otpResendCooldownSeconds,
      expiresInSeconds: config.auth.otpTtlSeconds,
    };
  },

  /**
   * Verifies an OTP challenge atomically
   */
  async verifyOtp(
    rawPhone: string,
    code: string,
    purpose: OtpPurpose = 'login',
    _ipAddress: string
  ): Promise<{
    success: boolean;
    user?: DbUser;
    phoneNational: string;
    error?: string;
    statusCode?: number;
  }> {
    const phoneNorm = normalizeIranianPhone(rawPhone);
    if (!phoneNorm.isValid) {
      return {
        success: false,
        phoneNational: '',
        error: phoneNorm.error || 'شماره موبایل نامعتبر است.',
        statusCode: 400,
      };
    }

    const cleanCode = (code || '').trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      return {
        success: false,
        phoneNational: phoneNorm.national,
        error: 'کد تایید باید ۶ رقم عددی باشد.',
        statusCode: 400,
      };
    }

    const phoneKey = phoneNorm.national;
    const challenge = await this.findLatestChallenge(phoneKey, purpose);

    if (!challenge) {
      return {
        success: false,
        phoneNational: phoneNorm.national,
        error: 'درخواست تایید یافت نشد. لطفا ابتدا درخواست کد ارسال کنید.',
        statusCode: 400,
      };
    }

    const now = new Date();

    if (challenge.consumed_at) {
      return {
        success: false,
        phoneNational: phoneNorm.national,
        error: 'این کد قبلا استفاده شده است. لطفا کد جدید دریافت کنید.',
        statusCode: 400,
      };
    }

    if (challenge.expires_at < now) {
      return {
        success: false,
        phoneNational: phoneNorm.national,
        error: 'کد تایید منقضی شده است. لطفا مجددا کد دریافت فرمایید.',
        statusCode: 400,
      };
    }

    if (challenge.attempts >= challenge.max_attempts) {
      return {
        success: false,
        phoneNational: phoneNorm.national,
        error: 'تعداد دفعات تلاش مجاز به پایان رسیده است. لطفا کد جدید دریافت نمایید.',
        statusCode: 429,
      };
    }

    // ATOMIC attempt registration (Phase 07): the guard conditions live in the
    // UPDATE statement itself, so parallel verifies can no longer all read
    // attempts=0 and bypass the max-attempts cap. If the guard fails, the
    // challenge raced to a terminal state — re-read for the accurate error.
    const registeredAttempts = await this.atomicRegisterAttempt(challenge.id);
    if (registeredAttempts === null) {
      const raced = await this.findLatestChallenge(phoneKey, purpose);
      if (raced?.consumed_at) {
        return {
          success: false,
          phoneNational: phoneNorm.national,
          error: 'این کد قبلا استفاده شده است. لطفا کد جدید دریافت کنید.',
          statusCode: 400,
        };
      }
      if (raced && raced.expires_at < new Date()) {
        return {
          success: false,
          phoneNational: phoneNorm.national,
          error: 'کد تایید منقضی شده است. لطفا مجددا کد دریافت فرمایید.',
          statusCode: 400,
        };
      }
      return {
        success: false,
        phoneNational: phoneNorm.national,
        error: 'تعداد دفعات تلاش مجاز به پایان رسیده است. لطفا کد جدید دریافت نمایید.',
        statusCode: 429,
      };
    }

    // Compute hash of entered code and compare in constant time
    const expectedHash = challenge.code_hash;
    const actualHash = hashOtpCode(cleanCode, phoneKey, purpose);

    const isMatch =
      expectedHash.length === actualHash.length &&
      crypto.timingSafeEqual(Buffer.from(expectedHash, 'hex'), Buffer.from(actualHash, 'hex'));

    if (!isMatch) {
      const remainingAttempts = challenge.max_attempts - registeredAttempts;
      return {
        success: false,
        phoneNational: phoneNorm.national,
        error:
          remainingAttempts > 0
            ? `کد وارد شده اشتباه است. (${remainingAttempts} تلاش باقی‌مانده)`
            : 'کد اشتباه است و فرصت‌های مجاز به پایان رسید. لطفا کد جدید دریافت کنید.',
        statusCode: 400,
      };
    }

    // ATOMIC consume (Phase 07): only one verify can win the consumption —
    // a parallel replay loses and is rejected here.
    const consumed = await this.atomicConsume(challenge.id);
    if (!consumed) {
      return {
        success: false,
        phoneNational: phoneNorm.national,
        error: 'این کد قبلا استفاده شده است. لطفا کد جدید دریافت کنید.',
        statusCode: 400,
      };
    }

    // If purpose is 'login', find or provision the verified user
    let user: DbUser | undefined;
    if (purpose === 'login') {
      user = await this.provisionOrFindUser(phoneNorm.national);
      if (user.status === 'suspended') {
        return {
          success: false,
          phoneNational: phoneNorm.national,
          error: 'حساب کاربری شما مسدود شده است. با پشتیبانی تماس بگیرید.',
          statusCode: 403,
        };
      }
    }

    return {
      success: true,
      user,
      phoneNational: phoneNorm.national,
    };
  },

  async provisionOrFindUser(nationalPhone: string, client?: PoolClient): Promise<DbUser> {
    if (isDatabaseConfigured()) {
      let user = await userRepository.findByPhone(nationalPhone, client);
      if (!user) {
        // Also check with international prefix if stored that way
        user = await userRepository.findByPhone(`+98${nationalPhone.substring(1)}`, client);
      }

      if (!user) {
        // Create standard customer user (STRICTLY platform_role = 'user')
        user = await userRepository.create(
          {
            phone: nationalPhone,
            fullName: `کاربر ${nationalPhone.slice(-4)}`,
            platformRole: 'user',
            status: 'active',
            twoFactorEnabled: false,
          },
          client
        );
      }

      // Ensure client record also exists and is updated
      await clientRepository.createOrUpdate(
        {
          phone: nationalPhone,
          fullName: user.full_name,
        },
        client
      );

      return user;
    }

    // Fallback for development without DB: FIRST check the in-memory user
    // store — memberships and other relations attach to the real user id, and
    // the old code here always returned a synthetic dev-user-<phone> identity,
    // silently detaching every dev login from its salon memberships.
    const existing = await userRepository.findByPhone(nationalPhone);
    if (existing) {
      return existing;
    }
    const fallback: DbUser = {
      id: `dev-user-${nationalPhone}`,
      phone: nationalPhone,
      full_name: `کاربر ${nationalPhone.slice(-4)}`,
      email: null,
      platform_role: 'user',
      status: 'active',
      two_factor_enabled: false,
      avatar_url: null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    await userRepository.create({
      phone: nationalPhone,
      fullName: fallback.full_name,
      platformRole: 'user',
      status: 'active',
    }).catch(() => {});
    return fallback;
  },

  async findLatestChallenge(phone: string, purpose: OtpPurpose): Promise<OtpChallenge | null> {
    if (isDatabaseConfigured()) {
      const res = await query<OtpChallenge>(
        `SELECT * FROM otp_challenges
         WHERE phone = $1 AND purpose = $2
         ORDER BY created_at DESC
         LIMIT 1`,
        [phone, purpose]
      );
      return res.rows[0] || null;
    }

    // In-memory dev search
    const key = `${phone}:${purpose}`;
    return inMemoryChallenges.get(key) || null;
  },

  async saveChallenge(challenge: OtpChallenge): Promise<void> {
    if (isDatabaseConfigured()) {
      await query(
        `INSERT INTO otp_challenges (
          id, phone, purpose, code_hash, attempts, max_attempts,
          resend_available_at, expires_at, consumed_at, ip_address, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          challenge.id,
          challenge.phone,
          challenge.purpose,
          challenge.code_hash,
          challenge.attempts,
          challenge.max_attempts,
          challenge.resend_available_at,
          challenge.expires_at,
          challenge.consumed_at,
          challenge.ip_address,
          challenge.created_at,
        ]
      );
      return;
    }

    const key = `${challenge.phone}:${challenge.purpose}`;
    inMemoryChallenges.set(key, challenge);
  },

  async incrementAttempts(challengeId: string): Promise<void> {
    if (isDatabaseConfigured()) {
      await query(
        `UPDATE otp_challenges SET attempts = attempts + 1 WHERE id = $1`,
        [challengeId]
      );
      return;
    }

    for (const challenge of inMemoryChallenges.values()) {
      if (challenge.id === challengeId) {
        challenge.attempts += 1;
        break;
      }
    }
  },

  /**
   * ATOMIC attempt registration (Phase 07): increments attempts only if the
   * challenge is still unconsumed, unexpired, and under the attempt cap.
   * Returns the new attempts count, or null when the guard failed (raced).
   */
  async atomicRegisterAttempt(challengeId: string): Promise<number | null> {
    if (isDatabaseConfigured()) {
      const res = await query<{ attempts: number }>(
        `UPDATE otp_challenges
         SET attempts = attempts + 1
         WHERE id = $1
           AND consumed_at IS NULL
           AND expires_at > NOW()
           AND attempts < max_attempts
         RETURNING attempts`,
        [challengeId]
      );
      return res.rows.length > 0 ? Number(res.rows[0].attempts) : null;
    }

    // In-memory adapter is single-threaded per process: the equivalent guard
    // is enforced synchronously.
    const challenge = [...inMemoryChallenges.values()].find((c) => c.id === challengeId);
    if (
      !challenge ||
      challenge.consumed_at ||
      challenge.expires_at < new Date() ||
      challenge.attempts >= challenge.max_attempts
    ) {
      return null;
    }
    challenge.attempts += 1;
    return challenge.attempts;
  },

  /**
   * ATOMIC consumption (Phase 07): only the first verifier wins; a parallel
   * replay loses the race and is rejected.
   */
  async atomicConsume(challengeId: string): Promise<boolean> {
    if (isDatabaseConfigured()) {
      const res = await query(
        `UPDATE otp_challenges SET consumed_at = NOW()
         WHERE id = $1 AND consumed_at IS NULL
         RETURNING id`,
        [challengeId]
      );
      return res.rows.length > 0;
    }

    const challenge = [...inMemoryChallenges.values()].find((c) => c.id === challengeId);
    if (!challenge || challenge.consumed_at) return false;
    challenge.consumed_at = new Date();
    return true;
  },

  async consumeChallenge(challengeId: string): Promise<void> {
    if (isDatabaseConfigured()) {
      await query(
        `UPDATE otp_challenges SET consumed_at = NOW() WHERE id = $1`,
        [challengeId]
      );
      return;
    }

    for (const challenge of inMemoryChallenges.values()) {
      if (challenge.id === challengeId) {
        challenge.consumed_at = new Date();
        break;
      }
    }
  },

  async countRecentRequests(phone: string, ipAddress: string, windowMs: number): Promise<number> {
    const since = new Date(Date.now() - windowMs);

    if (isDatabaseConfigured()) {
      const res = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM otp_challenges
         WHERE (phone = $1 OR ip_address = $2) AND created_at >= $3`,
        [phone, ipAddress, since]
      );
      return parseInt(res.rows[0]?.count || '0', 10);
    }

    let count = 0;
    for (const c of inMemoryChallenges.values()) {
      if ((c.phone === phone || c.ip_address === ipAddress) && c.created_at >= since) {
        count++;
      }
    }
    return count;
  },

  /**
   * Helper for unit tests to clear in-memory challenges
   */
  clearInMemory(): void {
    inMemoryChallenges.clear();
  },
};
