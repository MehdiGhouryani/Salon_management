import type { PoolClient } from 'pg';
import { query } from '../db/pool.ts';

export interface DbService {
  id: string;
  salon_id: string;
  name: string;
  category: string;
  category_label: string;
  price: string | number; // BIGINT in Postgres can be returned as string
  duration_minutes: number;
  description: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateServiceDto {
  id: string;
  salonId: string;
  name: string;
  category: string;
  categoryLabel: string;
  price: number;
  durationMinutes: number;
  description?: string | null;
  isActive?: boolean;
}

export interface UpdateServiceDto {
  name?: string;
  category?: string;
  categoryLabel?: string;
  price?: number;
  durationMinutes?: number;
  description?: string | null;
  isActive?: boolean;
}

export const serviceRepository = {
  async findById(id: string, client?: PoolClient): Promise<DbService | null> {
    const res = await query<DbService>(
      `SELECT * FROM services WHERE id = $1 LIMIT 1`,
      [id],
      client
    );
    return res.rows[0] || null;
  },

  async findBySalonId(
    salonId: string,
    onlyActive: boolean = true,
    client?: PoolClient
  ): Promise<DbService[]> {
    const where = onlyActive
      ? `WHERE salon_id = $1 AND is_active = TRUE`
      : `WHERE salon_id = $1`;
    const res = await query<DbService>(
      `SELECT * FROM services ${where} ORDER BY category ASC, price ASC`,
      [salonId],
      client
    );
    return res.rows;
  },

  async create(dto: CreateServiceDto, client?: PoolClient): Promise<DbService> {
    const res = await query<DbService>(
      `INSERT INTO services (
        id, salon_id, name, category, category_label, price, duration_minutes, description, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        dto.id,
        dto.salonId,
        dto.name,
        dto.category,
        dto.categoryLabel,
        dto.price,
        dto.durationMinutes || 60,
        dto.description || null,
        dto.isActive !== false,
      ],
      client
    );
    return res.rows[0];
  },

  async update(id: string, dto: UpdateServiceDto, client?: PoolClient): Promise<DbService | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (dto.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(dto.name);
    }
    if (dto.category !== undefined) {
      fields.push(`category = $${idx++}`);
      values.push(dto.category);
    }
    if (dto.categoryLabel !== undefined) {
      fields.push(`category_label = $${idx++}`);
      values.push(dto.categoryLabel);
    }
    if (dto.price !== undefined) {
      fields.push(`price = $${idx++}`);
      values.push(dto.price);
    }
    if (dto.durationMinutes !== undefined) {
      fields.push(`duration_minutes = $${idx++}`);
      values.push(dto.durationMinutes);
    }
    if (dto.description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(dto.description);
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

    const res = await query<DbService>(
      `UPDATE services SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
      client
    );
    return res.rows[0] || null;
  },

  async delete(id: string, client?: PoolClient): Promise<boolean> {
    // Soft delete by setting is_active = false
    const res = await query(
      `UPDATE services SET is_active = FALSE, updated_at = NOW() WHERE id = $1`,
      [id],
      client
    );
    return (res.rowCount ?? 0) > 0;
  },
};
