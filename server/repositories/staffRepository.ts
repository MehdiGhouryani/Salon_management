import type { PoolClient } from 'pg';
import { query, isDatabaseConfigured } from '../db/pool.ts';

export interface DbStaff {
  id: string;
  salon_id: string;
  user_id: string | null;
  name: string;
  phone: string | null;
  role: string;
  specialty: string | null;
  avatar_url: string | null;
  rating: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateStaffDto {
  id: string;
  salonId: string;
  userId?: string | null;
  name: string;
  phone?: string | null;
  role: string;
  specialty?: string | null;
  avatarUrl?: string | null;
  rating?: number;
  isActive?: boolean;
}

export interface UpdateStaffDto {
  name?: string;
  phone?: string | null;
  role?: string;
  specialty?: string | null;
  avatarUrl?: string | null;
  rating?: number;
  isActive?: boolean;
}

export interface DbStaffServiceMapping {
  staff_id: string;
  service_id: string;
  custom_price: string | number | null;
  custom_duration_minutes: number | null;
  is_primary: boolean;
  created_at: Date;
}

// In-memory fallback fixtures for development/tests when database is not configured
const inMemoryStaff: Map<string, DbStaff> = new Map([
  [
    'stf-101',
    {
      id: 'stf-101',
      salon_id: 'sal-101',
      user_id: 'usr-102',
      name: 'سارا رادمنش',
      phone: '09121111111',
      role: 'مدیر هنری و متخصص ارشد رنگ و لایت',
      specialty: 'رنگ و لایت تخصصی',
      avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80',
      rating: 4.98,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ],
  [
    'stf-102',
    {
      id: 'stf-102',
      salon_id: 'sal-101',
      user_id: null,
      name: 'الناز افشار',
      phone: '09122222222',
      role: 'آرتیست ارشد ناخن و اسپا',
      specialty: 'کاشت روسی و ژلیش',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      rating: 4.92,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ],
  [
    'stf-103',
    {
      id: 'stf-103',
      salon_id: 'sal-101',
      user_id: null,
      name: 'مریم فلاحی',
      phone: '09123333333',
      role: 'متخصص احیا و تراپی مو',
      specialty: 'کراتین و پروتئین',
      avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
      rating: 4.87,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ],
  [
    'stf-104',
    {
      id: 'stf-104',
      salon_id: 'sal-101',
      user_id: null,
      name: 'رویا کمالی',
      phone: '09124444444',
      role: 'میکاپ آرتیست عروس',
      specialty: 'میکاپ VIP',
      avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
      rating: 4.95,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ],
]);

const inMemoryStaffServices: DbStaffServiceMapping[] = [
  { staff_id: 'stf-101', service_id: 'srv-101', custom_price: null, custom_duration_minutes: null, is_primary: true, created_at: new Date() },
  { staff_id: 'stf-102', service_id: 'srv-103', custom_price: null, custom_duration_minutes: null, is_primary: true, created_at: new Date() },
  { staff_id: 'stf-102', service_id: 'srv-104', custom_price: null, custom_duration_minutes: null, is_primary: false, created_at: new Date() },
  { staff_id: 'stf-103', service_id: 'srv-102', custom_price: null, custom_duration_minutes: null, is_primary: true, created_at: new Date() },
  { staff_id: 'stf-104', service_id: 'srv-105', custom_price: null, custom_duration_minutes: null, is_primary: true, created_at: new Date() },
];

export const staffRepository = {
  async findById(id: string, client?: PoolClient): Promise<DbStaff | null> {
    if (!isDatabaseConfigured()) {
      return inMemoryStaff.get(id) || null;
    }

    const res = await query<DbStaff>(
      `SELECT * FROM staff WHERE id = $1 LIMIT 1`,
      [id],
      client
    );
    return res.rows[0] || null;
  },

  async findBySalonId(
    salonId: string,
    onlyActive: boolean = true,
    client?: PoolClient
  ): Promise<DbStaff[]> {
    if (!isDatabaseConfigured()) {
      let list = Array.from(inMemoryStaff.values()).filter((s) => s.salon_id === salonId);
      if (onlyActive) list = list.filter((s) => s.is_active);
      return list;
    }

    const where = onlyActive
      ? `WHERE salon_id = $1 AND is_active = TRUE`
      : `WHERE salon_id = $1`;
    const res = await query<DbStaff>(
      `SELECT * FROM staff ${where} ORDER BY rating DESC, created_at ASC`,
      [salonId],
      client
    );
    return res.rows;
  },

  async create(dto: CreateStaffDto, client?: PoolClient): Promise<DbStaff> {
    if (!isDatabaseConfigured()) {
      const created: DbStaff = {
        id: dto.id,
        salon_id: dto.salonId,
        user_id: dto.userId || null,
        name: dto.name,
        phone: dto.phone || null,
        role: dto.role,
        specialty: dto.specialty || null,
        avatar_url: dto.avatarUrl || null,
        rating: dto.rating || 5.0,
        is_active: dto.isActive !== false,
        created_at: new Date(),
        updated_at: new Date(),
      };
      inMemoryStaff.set(dto.id, created);
      return created;
    }

    const res = await query<DbStaff>(
      `INSERT INTO staff (
        id, salon_id, user_id, name, phone, role, specialty, avatar_url, rating, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        dto.id,
        dto.salonId,
        dto.userId || null,
        dto.name,
        dto.phone || null,
        dto.role,
        dto.specialty || null,
        dto.avatarUrl || null,
        dto.rating || 5.0,
        dto.isActive !== false,
      ],
      client
    );
    return res.rows[0];
  },

  async update(id: string, dto: UpdateStaffDto, client?: PoolClient): Promise<DbStaff | null> {
    if (!isDatabaseConfigured()) {
      const existing = inMemoryStaff.get(id);
      if (!existing) return null;
      if (dto.name !== undefined) existing.name = dto.name;
      if (dto.phone !== undefined) existing.phone = dto.phone;
      if (dto.role !== undefined) existing.role = dto.role;
      if (dto.specialty !== undefined) existing.specialty = dto.specialty;
      if (dto.avatarUrl !== undefined) existing.avatar_url = dto.avatarUrl;
      if (dto.rating !== undefined) existing.rating = dto.rating;
      if (dto.isActive !== undefined) existing.is_active = dto.isActive;
      existing.updated_at = new Date();
      return existing;
    }

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (dto.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(dto.name);
    }
    if (dto.phone !== undefined) {
      fields.push(`phone = $${idx++}`);
      values.push(dto.phone);
    }
    if (dto.role !== undefined) {
      fields.push(`role = $${idx++}`);
      values.push(dto.role);
    }
    if (dto.specialty !== undefined) {
      fields.push(`specialty = $${idx++}`);
      values.push(dto.specialty);
    }
    if (dto.avatarUrl !== undefined) {
      fields.push(`avatar_url = $${idx++}`);
      values.push(dto.avatarUrl);
    }
    if (dto.rating !== undefined) {
      fields.push(`rating = $${idx++}`);
      values.push(dto.rating);
    }
    if (dto.isActive !== undefined) {
      fields.push(`is_active = $${idx++}`);
      values.push(dto.isActive);
    }

    if (fields.length === 0) {
      return this.findById(id, client);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const res = await query<DbStaff>(
      `UPDATE staff SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
      client
    );
    return res.rows[0] || null;
  },

  async assignService(
    staffId: string,
    serviceId: string,
    customPrice?: number | null,
    customDuration?: number | null,
    isPrimary: boolean = false,
    client?: PoolClient
  ): Promise<void> {
    if (!isDatabaseConfigured()) {
      const idx = inMemoryStaffServices.findIndex((m) => m.staff_id === staffId && m.service_id === serviceId);
      const mapping: DbStaffServiceMapping = {
        staff_id: staffId,
        service_id: serviceId,
        custom_price: customPrice || null,
        custom_duration_minutes: customDuration || null,
        is_primary: isPrimary,
        created_at: new Date(),
      };
      if (idx >= 0) inMemoryStaffServices[idx] = mapping;
      else inMemoryStaffServices.push(mapping);
      return;
    }

    await query(
      `INSERT INTO staff_services (staff_id, service_id, custom_price, custom_duration_minutes, is_primary)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (staff_id, service_id) DO UPDATE
       SET custom_price = EXCLUDED.custom_price,
           custom_duration_minutes = EXCLUDED.custom_duration_minutes,
           is_primary = EXCLUDED.is_primary`,
      [staffId, serviceId, customPrice || null, customDuration || null, isPrimary],
      client
    );
  },

  async getAssignedServices(staffId: string, client?: PoolClient): Promise<DbStaffServiceMapping[]> {
    if (!isDatabaseConfigured()) {
      return inMemoryStaffServices.filter((m) => m.staff_id === staffId);
    }

    const res = await query<DbStaffServiceMapping>(
      `SELECT * FROM staff_services WHERE staff_id = $1`,
      [staffId],
      client
    );
    return res.rows;
  },

  async delete(id: string, client?: PoolClient): Promise<boolean> {
    if (!isDatabaseConfigured()) {
      const existing = inMemoryStaff.get(id);
      if (!existing) return false;
      existing.is_active = false;
      return true;
    }

    const res = await query(
      `UPDATE staff SET is_active = FALSE, updated_at = NOW() WHERE id = $1`,
      [id],
      client
    );
    return (res.rowCount ?? 0) > 0;
  },
};
