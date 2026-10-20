import type { PoolClient } from 'pg';
import { query } from '../db/pool.ts';

export type PlatformRole = 'user' | 'super_admin' | 'platform_support' | 'platform_auditor' | 'financial_manager';
export type UserStatus = 'active' | 'suspended' | 'pending';

export interface DbUser {
  id: string;
  phone: string;
  full_name: string;
  email: string | null;
  platform_role: PlatformRole;
  status: UserStatus;
  two_factor_enabled: boolean;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserDto {
  phone: string;
  fullName: string;
  email?: string | null;
  platformRole?: PlatformRole;
  status?: UserStatus;
  twoFactorEnabled?: boolean;
  avatarUrl?: string | null;
}

export interface UpdateUserDto {
  fullName?: string;
  email?: string | null;
  platformRole?: PlatformRole;
  status?: UserStatus;
  twoFactorEnabled?: boolean;
  avatarUrl?: string | null;
}

export interface DbSalonMembership {
  id: string;
  user_id: string;
  salon_id: string;
  role: 'owner' | 'manager' | 'staff' | 'receptionist';
  status: 'active' | 'invited' | 'suspended';
  permissions: string[];
  created_at: Date;
  updated_at: Date;
}

export const userRepository = {
  async findById(id: string, client?: PoolClient): Promise<DbUser | null> {
    const res = await query<DbUser>(
      `SELECT * FROM users WHERE id = $1 LIMIT 1`,
      [id],
      client
    );
    return res.rows[0] || null;
  },

  async findByPhone(phone: string, client?: PoolClient): Promise<DbUser | null> {
    const res = await query<DbUser>(
      `SELECT * FROM users WHERE phone = $1 LIMIT 1`,
      [phone],
      client
    );
    return res.rows[0] || null;
  },

  async create(dto: CreateUserDto, client?: PoolClient): Promise<DbUser> {
    const res = await query<DbUser>(
      `INSERT INTO users (
        phone, full_name, email, platform_role, status, two_factor_enabled, avatar_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        dto.phone,
        dto.fullName,
        dto.email || null,
        dto.platformRole || 'user',
        dto.status || 'active',
        dto.twoFactorEnabled || false,
        dto.avatarUrl || null,
      ],
      client
    );
    return res.rows[0];
  },

  async update(id: string, dto: UpdateUserDto, client?: PoolClient): Promise<DbUser | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (dto.fullName !== undefined) {
      fields.push(`full_name = $${idx++}`);
      values.push(dto.fullName);
    }
    if (dto.email !== undefined) {
      fields.push(`email = $${idx++}`);
      values.push(dto.email);
    }
    if (dto.platformRole !== undefined) {
      fields.push(`platform_role = $${idx++}`);
      values.push(dto.platformRole);
    }
    if (dto.status !== undefined) {
      fields.push(`status = $${idx++}`);
      values.push(dto.status);
    }
    if (dto.twoFactorEnabled !== undefined) {
      fields.push(`two_factor_enabled = $${idx++}`);
      values.push(dto.twoFactorEnabled);
    }
    if (dto.avatarUrl !== undefined) {
      fields.push(`avatar_url = $${idx++}`);
      values.push(dto.avatarUrl);
    }

    if (fields.length === 0) {
      return this.findById(id, client);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const res = await query<DbUser>(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
      client
    );
    return res.rows[0] || null;
  },

  async getMemberships(userId: string, client?: PoolClient): Promise<DbSalonMembership[]> {
    const res = await query<DbSalonMembership>(
      `SELECT * FROM salon_memberships WHERE user_id = $1 ORDER BY created_at ASC`,
      [userId],
      client
    );
    return res.rows;
  },

  async addMembership(
    userId: string,
    salonId: string,
    role: 'owner' | 'manager' | 'staff' | 'receptionist' = 'manager',
    permissions: string[] = [],
    client?: PoolClient
  ): Promise<DbSalonMembership> {
    const res = await query<DbSalonMembership>(
      `INSERT INTO salon_memberships (user_id, salon_id, role, permissions)
       VALUES ($1, $2, $3, $4::jsonb)
       ON CONFLICT (user_id, salon_id) DO UPDATE
       SET role = EXCLUDED.role, permissions = EXCLUDED.permissions, updated_at = NOW()
       RETURNING *`,
      [userId, salonId, role, JSON.stringify(permissions)],
      client
    );
    return res.rows[0];
  },
};
