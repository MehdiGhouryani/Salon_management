import type { PoolClient } from 'pg';
import { query } from '../db/pool.ts';

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

export const staffRepository = {
  async findById(id: string, client?: PoolClient): Promise<DbStaff | null> {
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
    const res = await query<DbStaffServiceMapping>(
      `SELECT * FROM staff_services WHERE staff_id = $1`,
      [staffId],
      client
    );
    return res.rows;
  },

  async delete(id: string, client?: PoolClient): Promise<boolean> {
    const res = await query(
      `UPDATE staff SET is_active = FALSE, updated_at = NOW() WHERE id = $1`,
      [id],
      client
    );
    return (res.rowCount ?? 0) > 0;
  },
};
