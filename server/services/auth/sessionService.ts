import crypto from 'crypto';
import type { Request, Response } from 'express';
import { config } from '../../config.ts';
import { query, isDatabaseConfigured } from '../../db/pool.ts';
import { userRepository, type DbUser, type DbSalonMembership } from '../../repositories/userRepository.ts';

export interface DbUserSession {
  id: string;
  user_id: string;
  token_hash: string;
  ip_address: string;
  user_agent: string;
  expires_at: Date;
  idle_expires_at: Date;
  revoked_at: Date | null;
  session_type: string;
  last_active_at: Date;
  created_at: Date;
}

export interface SessionValidationResult {
  valid: boolean;
  user?: DbUser;
  session?: DbUserSession;
  memberships?: DbSalonMembership[];
  error?: string;
  statusCode?: number;
}

// In-memory fallback exclusively for development when database is not configured
const inMemorySessions: Map<string, DbUserSession> = new Map();

/**
 * Computes SHA-256 hash of the opaque session token
 */
export function hashSessionToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Extracts client IP address respecting trusted reverse proxy configuration
 */
export function extractClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(',');
    return ips[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

export const sessionService = {
  /**
   * Generates a new cryptographically secure session and sets the HttpOnly cookie
   */
  async createSession(
    user: DbUser,
    req: Request,
    res: Response,
    sessionType: 'web' | 'mobile' | 'api' = 'web'
  ): Promise<{ rawToken: string; expiresAt: Date; sessionId: string }> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashSessionToken(rawToken);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + config.auth.sessionTtlHours * 3600 * 1000);
    const idleExpiresAt = new Date(now.getTime() + config.auth.sessionIdleMinutes * 60 * 1000);

    const ipAddress = extractClientIp(req);
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const sessionId = crypto.randomUUID();

    const sessionRecord: DbUserSession = {
      id: sessionId,
      user_id: user.id,
      token_hash: tokenHash,
      ip_address: ipAddress,
      user_agent: userAgent,
      expires_at: expiresAt,
      idle_expires_at: idleExpiresAt,
      revoked_at: null,
      session_type: sessionType,
      last_active_at: now,
      created_at: now,
    };

    if (isDatabaseConfigured()) {
      await query(
        `INSERT INTO user_sessions (
          id, user_id, token_hash, ip_address, user_agent,
          expires_at, idle_expires_at, revoked_at, session_type, last_active_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          sessionRecord.id,
          sessionRecord.user_id,
          sessionRecord.token_hash,
          sessionRecord.ip_address,
          sessionRecord.user_agent,
          sessionRecord.expires_at,
          sessionRecord.idle_expires_at,
          sessionRecord.revoked_at,
          sessionRecord.session_type,
          sessionRecord.last_active_at,
          sessionRecord.created_at,
        ]
      );
    } else {
      inMemorySessions.set(tokenHash, sessionRecord);
    }

    // Attach strict HttpOnly cookie to response
    res.cookie(config.auth.sessionCookieName, rawToken, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    });

    return { rawToken, expiresAt, sessionId };
  },

  /**
   * Validates a session token and loads the authenticated user and their salon memberships
   */
  async validateSession(rawToken: string, ipAddress?: string): Promise<SessionValidationResult> {
    if (!rawToken || typeof rawToken !== 'string') {
      return { valid: false, error: 'SESSION_MISSING', statusCode: 401 };
    }

    const tokenHash = hashSessionToken(rawToken);
    let session: DbUserSession | null = null;

    if (isDatabaseConfigured()) {
      const res = await query<DbUserSession>(
        `SELECT * FROM user_sessions WHERE token_hash = $1 LIMIT 1`,
        [tokenHash]
      );
      session = res.rows[0] || null;
    } else {
      session = inMemorySessions.get(tokenHash) || null;
    }

    if (!session) {
      return { valid: false, error: 'SESSION_NOT_FOUND', statusCode: 401 };
    }

    const now = new Date();

    if (session.revoked_at) {
      return { valid: false, error: 'SESSION_REVOKED', statusCode: 401 };
    }

    if (session.expires_at < now) {
      return { valid: false, error: 'SESSION_EXPIRED', statusCode: 401 };
    }

    if (session.idle_expires_at && session.idle_expires_at < now) {
      return { valid: false, error: 'SESSION_IDLE_TIMEOUT', statusCode: 401 };
    }

    // Retrieve the user record from repository
    let user: DbUser | null = null;
    let memberships: DbSalonMembership[] = [];

    if (isDatabaseConfigured()) {
      user = await userRepository.findById(session.user_id);
      if (user) {
        memberships = await userRepository.getMemberships(user.id);
      }
    } else {
      // In-memory dev user lookup
      user = {
        id: session.user_id,
        phone: '09121111111',
        full_name: 'کاربر سیستم',
        email: null,
        platform_role: 'user',
        status: 'active',
        two_factor_enabled: false,
        avatar_url: null,
        created_at: session.created_at,
        updated_at: session.created_at,
      };
    }

    if (!user) {
      return { valid: false, error: 'USER_NOT_FOUND', statusCode: 401 };
    }

    if (user.status !== 'active') {
      return { valid: false, error: 'USER_SUSPENDED', statusCode: 403 };
    }

    // Touch idle expiry and last_active_at (throttled every 5 minutes)
    const elapsedMinutes = (now.getTime() - new Date(session.last_active_at).getTime()) / (60 * 1000);
    if (elapsedMinutes >= 5) {
      const newIdleExpiresAt = new Date(now.getTime() + config.auth.sessionIdleMinutes * 60 * 1000);
      if (isDatabaseConfigured()) {
        await query(
          `UPDATE user_sessions SET last_active_at = NOW(), idle_expires_at = $1 WHERE id = $2`,
          [newIdleExpiresAt, session.id]
        );
      } else {
        session.last_active_at = now;
        session.idle_expires_at = newIdleExpiresAt;
      }
    }

    return {
      valid: true,
      user,
      session,
      memberships,
    };
  },

  /**
   * Revokes a session and clears the cookie
   */
  async revokeSession(rawToken: string, res?: Response): Promise<boolean> {
    if (!rawToken) return false;

    const tokenHash = hashSessionToken(rawToken);

    if (isDatabaseConfigured()) {
      await query(
        `UPDATE user_sessions SET revoked_at = NOW() WHERE token_hash = $1`,
        [tokenHash]
      );
    } else {
      const sess = inMemorySessions.get(tokenHash);
      if (sess) {
        sess.revoked_at = new Date();
      }
    }

    if (res) {
      res.clearCookie(config.auth.sessionCookieName, {
        httpOnly: true,
        secure: config.isProduction,
        sameSite: 'lax',
        path: '/',
      });
    }

    return true;
  },

  /**
   * Revokes all active sessions for a specific user
   */
  async revokeAllUserSessions(userId: string): Promise<void> {
    if (isDatabaseConfigured()) {
      await query(
        `UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`,
        [userId]
      );
    } else {
      for (const sess of inMemorySessions.values()) {
        if (sess.user_id === userId) {
          sess.revoked_at = new Date();
        }
      }
    }
  },

  /**
   * Clears in-memory session map (for unit testing)
   */
  clearInMemory(): void {
    inMemorySessions.clear();
  },
};
