import type { PoolClient } from 'pg';
import { query, isDatabaseConfigured } from '../db/pool.ts';

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

// In-memory fallback fixtures for development/tests when database is not configured
const inMemoryServices: Map<string, DbService> = new Map([
  [
    'srv-101',
    {
      id: 'srv-101',
      salon_id: 'sal-101',
      name: 'رنگ و هایلایت تخصصی مو (آمبره و بالیاژ)',
      category: 'hair',
      category_label: 'خدمات تخصصی مو',
      duration_minutes: 180,
      price: 2400000,
      description: 'استفاده از متریال درجه یک لورال با حفاظت کامل از بافت مو و رنگساژ دلخواه',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ],
  [
    'srv-102',
    {
      id: 'srv-102',
      salon_id: 'sal-101',
      name: 'کراتین، بوتاکس و پروتئین‌تراپی مو',
      category: 'hair',
      category_label: 'خدمات تخصصی مو',
      duration_minutes: 210,
      price: 3600000,
      description: 'احیای ۱۰۰٪ و صافی شلاقی با ماندگاری ۹ ماهه بدون گاز و بو',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ],
  [
    'srv-103',
    {
      id: 'srv-103',
      salon_id: 'sal-101',
      name: 'کاشت و ژلیش روسی ناخن',
      category: 'nail',
      category_label: 'ناخن و پدیکور',
      duration_minutes: 90,
      price: 680000,
      description: 'کاشت ژل با دوام بالا، مانیکور روسی اصولی و طراحی ژورنالی',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ],
  [
    'srv-104',
    {
      id: 'srv-104',
      salon_id: 'sal-101',
      name: 'پدیکور درمانی و کفسابی اسپا',
      category: 'spa',
      category_label: 'اسپا و آرامش',
      duration_minutes: 60,
      price: 550000,
      description: 'کوکتل تراپی، نمک دریایی، پارافین تراپی و ماساژ ریلکسی پا',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ],
  [
    'srv-105',
    {
      id: 'srv-105',
      salon_id: 'sal-101',
      name: 'میکاپ VIP عروس و همراه',
      category: 'makeup',
      category_label: 'میکاپ و چهره',
      duration_minutes: 150,
      price: 4500000,
      description: 'گریم سینمایی با برندهای مک، نارس و هدی بیوتی با کانتورینگ حرفه‌ای',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ],
]);

export const serviceRepository = {
  async findById(id: string, client?: PoolClient): Promise<DbService | null> {
    if (!isDatabaseConfigured()) {
      return inMemoryServices.get(id) || null;
    }

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
    if (!isDatabaseConfigured()) {
      let list = Array.from(inMemoryServices.values()).filter((s) => s.salon_id === salonId);
      if (onlyActive) list = list.filter((s) => s.is_active);
      return list;
    }

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
    if (!isDatabaseConfigured()) {
      const created: DbService = {
        id: dto.id,
        salon_id: dto.salonId,
        name: dto.name,
        category: dto.category,
        category_label: dto.categoryLabel,
        price: dto.price,
        duration_minutes: dto.durationMinutes || 60,
        description: dto.description || null,
        is_active: dto.isActive !== false,
        created_at: new Date(),
        updated_at: new Date(),
      };
      inMemoryServices.set(dto.id, created);
      return created;
    }

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
    if (!isDatabaseConfigured()) {
      const existing = inMemoryServices.get(id);
      if (!existing) return null;
      if (dto.name !== undefined) existing.name = dto.name;
      if (dto.category !== undefined) existing.category = dto.category;
      if (dto.categoryLabel !== undefined) existing.category_label = dto.categoryLabel;
      if (dto.price !== undefined) existing.price = dto.price;
      if (dto.durationMinutes !== undefined) existing.duration_minutes = dto.durationMinutes;
      if (dto.description !== undefined) existing.description = dto.description;
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
    if (!isDatabaseConfigured()) {
      const existing = inMemoryServices.get(id);
      if (!existing) return false;
      existing.is_active = false;
      return true;
    }

    const res = await query(
      `UPDATE services SET is_active = FALSE, updated_at = NOW() WHERE id = $1`,
      [id],
      client
    );
    return (res.rowCount ?? 0) > 0;
  },
};
