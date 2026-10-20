import type { PoolClient } from 'pg';
import { query, isDatabaseConfigured } from '../db/pool.ts';

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

export interface FindUsersFilter {
  role?: PlatformRole;
  status?: UserStatus;
  search?: string;
  limit?: number;
  offset?: number;
}

const inMemoryUsers: Map<string, DbUser> = new Map([
  [
    'usr-superadmin',
    {
      id: 'usr-superadmin',
      phone: '09120000000',
      full_name: 'مدیر ارشد سامانه (Super Admin)',
      email: 'admin@nobatara.ir',
      platform_role: 'super_admin',
      status: 'active',
      two_factor_enabled: true,
      avatar_url: null,
      created_at: new Date('2025-01-01'),
      updated_at: new Date('2025-01-01'),
    },
  ],
  [
    'usr-101',
    {
      id: 'usr-101',
      phone: '09121111111',
      full_name: 'سارا رادمنش (مدیر گیس‌آرا)',
      email: 'sara@gisara.ir',
      platform_role: 'user',
      status: 'active',
      two_factor_enabled: false,
      avatar_url: null,
      created_at: new Date('2025-02-01'),
      updated_at: new Date('2025-02-01'),
    },
  ],
  [
    'usr-102',
    {
      id: 'usr-102',
      phone: '09122222222',
      full_name: 'مریم احمدی',
      email: 'maryam@gmail.com',
      platform_role: 'user',
      status: 'active',
      two_factor_enabled: false,
      avatar_url: null,
      created_at: new Date('2025-02-10'),
      updated_at: new Date('2025-02-10'),
    },
  ],
]);

export const userRepository = {
  async findById(id: string, client?: PoolClient): Promise<DbUser | null> {
    if (!isDatabaseConfigured()) {
      return inMemoryUsers.get(id) || null;
    }
    const res = await query<DbUser>(
      `SELECT * FROM users WHERE id = $1 LIMIT 1`,
      [id],
      client
    );
    return res.rows[0] || null;
  },

  async findByPhone(phone: string, client?: PoolClient): Promise<DbUser | null> {
    if (!isDatabaseConfigured()) {
      for (const u of inMemoryUsers.values()) {
        if (u.phone === phone) return u;
      }
      return null;
    }
    const res = await query<DbUser>(
      `SELECT * FROM users WHERE phone = $1 LIMIT 1`,
      [phone],
      client
    );
    return res.rows[0] || null;
  },

  async create(dto: CreateUserDto, client?: PoolClient): Promise<DbUser> {
    if (!isDatabaseConfigured()) {
      const newUser: DbUser = {
        id: `usr-${Date.now()}`,
        phone: dto.phone,
        full_name: dto.fullName,
        email: dto.email || null,
        platform_role: dto.platformRole || 'user',
        status: dto.status || 'active',
        two_factor_enabled: dto.twoFactorEnabled || false,
        avatar_url: dto.avatarUrl || null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      inMemoryUsers.set(newUser.id, newUser);
      return newUser;
    }
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
    if (!isDatabaseConfigured()) {
      const u = inMemoryUsers.get(id);
      if (!u) return null;
      if (dto.fullName !== undefined) u.full_name = dto.fullName;
      if (dto.email !== undefined) u.email = dto.email;
      if (dto.platformRole !== undefined) u.platform_role = dto.platformRole;
      if (dto.status !== undefined) u.status = dto.status;
      if (dto.twoFactorEnabled !== undefined) u.two_factor_enabled = dto.twoFactorEnabled;
      if (dto.avatarUrl !== undefined) u.avatar_url = dto.avatarUrl;
      u.updated_at = new Date();
      inMemoryUsers.set(id, u);
      return u;
    }

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

  async findAll(filter: FindUsersFilter = {}, client?: PoolClient): Promise<DbUser[]> {
    if (!isDatabaseConfigured()) {
      let list = Array.from(inMemoryUsers.values());
      if (filter.role) list = list.filter((u) => u.platform_role === filter.role);
      if (filter.status) list = list.filter((u) => u.status === filter.status);
      if (filter.search) {
        const q = filter.search.toLowerCase();
        list = list.filter(
          (u) =>
            u.full_name.toLowerCase().includes(q) ||
            u.phone.includes(q) ||
            (u.email && u.email.toLowerCase().includes(q))
        );
      }
      return list;
    }

    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (filter.role) {
      conditions.push(`platform_role = $${idx++}`);
      values.push(filter.role);
    }
    if (filter.status) {
      conditions.push(`status = $${idx++}`);
      values.push(filter.status);
    }
    if (filter.search) {
      conditions.push(`(full_name ILIKE $${idx} OR phone ILIKE $${idx} OR email ILIKE $${idx})`);
      values.push(`%${filter.search}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filter.limit && filter.limit > 0 ? filter.limit : 50;
    const offset = filter.offset && filter.offset >= 0 ? filter.offset : 0;

    values.push(limit);
    const limitIdx = idx++;
    values.push(offset);
    const offsetIdx = idx++;

    const res = await query<DbUser>(
      `SELECT * FROM users ${whereClause} ORDER BY created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      values,
      client
    );
    return res.rows;
  },

  async count(filter: FindUsersFilter = {}, client?: PoolClient): Promise<number> {
    if (!isDatabaseConfigured()) {
      const list = await this.findAll(filter);
      return list.length;
    }

    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (filter.role) {
      conditions.push(`platform_role = $${idx++}`);
      values.push(filter.role);
    }
    if (filter.status) {
      conditions.push(`status = $${idx++}`);
      values.push(filter.status);
    }
    if (filter.search) {
      conditions.push(`(full_name ILIKE $${idx} OR phone ILIKE $${idx} OR email ILIKE $${idx})`);
      values.push(`%${filter.search}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const res = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM users ${whereClause}`,
      values,
      client
    );
    return parseInt(res.rows[0]?.count || '0', 10);
  },

  async getMemberships(userId: string, client?: PoolClient): Promise<DbSalonMembership[]> {
    if (!isDatabaseConfigured()) {
      return [];
    }
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
    if (!isDatabaseConfigured()) {
      return {
        id: `mem-${Date.now()}`,
        user_id: userId,
        salon_id: salonId,
        role,
        status: 'active',
        permissions,
        created_at: new Date(),
        updated_at: new Date(),
      };
    }
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

