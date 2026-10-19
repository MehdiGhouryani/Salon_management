import type { PoolClient } from 'pg';
import { query } from '../db/pool.ts';

export type SalonStatus = 'active' | 'pending' | 'suspended' | 'trial';
export type PlanType = 'bronze' | 'silver' | 'gold_vip';

export interface DbSalon {
  id: string;
  slug: string;
  name: string;
  category: string;
  tagline: string | null;
  owner_name: string;
  phone: string;
  email: string | null;
  province: string;
  city: string;
  address: string;
  status: SalonStatus;
  plan: PlanType;
  plan_expiry: Date;
  verified_badge: boolean;
  timezone: string;
  banner_image: string | null;
  gallery_images: string[];
  features: string[];
  rating: number;
  reviews_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateSalonDto {
  id: string;
  slug: string;
  name: string;
  category?: string;
  tagline?: string | null;
  ownerName: string;
  phone: string;
  email?: string | null;
  province: string;
  city: string;
  address: string;
  status?: SalonStatus;
  plan?: PlanType;
  planExpiry: Date;
  verifiedBadge?: boolean;
  timezone?: string;
  bannerImage?: string | null;
  galleryImages?: string[];
  features?: string[];
  rating?: number;
  reviewsCount?: number;
}

export interface UpdateSalonDto {
  name?: string;
  category?: string;
  tagline?: string | null;
  ownerName?: string;
  phone?: string;
  email?: string | null;
  province?: string;
  city?: string;
  address?: string;
  status?: SalonStatus;
  plan?: PlanType;
  planExpiry?: Date;
  verifiedBadge?: boolean;
  timezone?: string;
  bannerImage?: string | null;
  galleryImages?: string[];
  features?: string[];
  rating?: number;
  reviewsCount?: number;
}

export interface FindSalonsFilter {
  city?: string;
  province?: string;
  category?: string;
  status?: SalonStatus;
  plan?: PlanType;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface DbWorkingHour {
  id: string;
  salon_id: string;
  staff_id: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_closed: boolean;
  created_at: Date;
  updated_at: Date;
}

export const salonRepository = {
  async findById(id: string, client?: PoolClient): Promise<DbSalon | null> {
    const res = await query<DbSalon>(
      `SELECT * FROM salons WHERE id = $1 LIMIT 1`,
      [id],
      client
    );
    return res.rows[0] || null;
  },

  async findBySlug(slug: string, client?: PoolClient): Promise<DbSalon | null> {
    const res = await query<DbSalon>(
      `SELECT * FROM salons WHERE slug = $1 LIMIT 1`,
      [slug],
      client
    );
    return res.rows[0] || null;
  },

  async findAll(filter: FindSalonsFilter = {}, client?: PoolClient): Promise<DbSalon[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (filter.status) {
      conditions.push(`status = $${idx++}`);
      values.push(filter.status);
    }
    if (filter.plan) {
      conditions.push(`plan = $${idx++}`);
      values.push(filter.plan);
    }
    if (filter.city && filter.city !== 'همه شهرها') {
      conditions.push(`city LIKE $${idx++}`);
      values.push(`%${filter.city}%`);
    }
    if (filter.province) {
      conditions.push(`province = $${idx++}`);
      values.push(filter.province);
    }
    if (filter.category && filter.category !== 'all') {
      conditions.push(`category LIKE $${idx++}`);
      values.push(`%${filter.category}%`);
    }
    if (filter.search) {
      conditions.push(`(name ILIKE $${idx} OR city ILIKE $${idx} OR address ILIKE $${idx} OR owner_name ILIKE $${idx})`);
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

    const res = await query<DbSalon>(
      `SELECT * FROM salons ${whereClause} ORDER BY rating DESC, created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      values,
      client
    );
    return res.rows;
  },

  async count(filter: FindSalonsFilter = {}, client?: PoolClient): Promise<number> {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (filter.status) {
      conditions.push(`status = $${idx++}`);
      values.push(filter.status);
    }
    if (filter.city && filter.city !== 'همه شهرها') {
      conditions.push(`city LIKE $${idx++}`);
      values.push(`%${filter.city}%`);
    }
    if (filter.search) {
      conditions.push(`(name ILIKE $${idx} OR city ILIKE $${idx})`);
      values.push(`%${filter.search}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const res = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM salons ${whereClause}`,
      values,
      client
    );
    return parseInt(res.rows[0]?.count || '0', 10);
  },

  async create(dto: CreateSalonDto, client?: PoolClient): Promise<DbSalon> {
    const res = await query<DbSalon>(
      `INSERT INTO salons (
        id, slug, name, category, tagline, owner_name, phone, email,
        province, city, address, status, plan, plan_expiry, verified_badge,
        timezone, banner_image, gallery_images, features, rating, reviews_count
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21
      )
      RETURNING *`,
      [
        dto.id,
        dto.slug,
        dto.name,
        dto.category || 'زیبایی و سلامت',
        dto.tagline || null,
        dto.ownerName,
        dto.phone,
        dto.email || null,
        dto.province,
        dto.city,
        dto.address,
        dto.status || 'pending',
        dto.plan || 'bronze',
        dto.planExpiry,
        dto.verifiedBadge || false,
        dto.timezone || 'Asia/Tehran',
        dto.bannerImage || null,
        dto.galleryImages || [],
        dto.features || [],
        dto.rating || 5.0,
        dto.reviewsCount || 0,
      ],
      client
    );
    return res.rows[0];
  },

  async update(id: string, dto: UpdateSalonDto, client?: PoolClient): Promise<DbSalon | null> {
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
    if (dto.tagline !== undefined) {
      fields.push(`tagline = $${idx++}`);
      values.push(dto.tagline);
    }
    if (dto.ownerName !== undefined) {
      fields.push(`owner_name = $${idx++}`);
      values.push(dto.ownerName);
    }
    if (dto.phone !== undefined) {
      fields.push(`phone = $${idx++}`);
      values.push(dto.phone);
    }
    if (dto.email !== undefined) {
      fields.push(`email = $${idx++}`);
      values.push(dto.email);
    }
    if (dto.province !== undefined) {
      fields.push(`province = $${idx++}`);
      values.push(dto.province);
    }
    if (dto.city !== undefined) {
      fields.push(`city = $${idx++}`);
      values.push(dto.city);
    }
    if (dto.address !== undefined) {
      fields.push(`address = $${idx++}`);
      values.push(dto.address);
    }
    if (dto.status !== undefined) {
      fields.push(`status = $${idx++}`);
      values.push(dto.status);
    }
    if (dto.plan !== undefined) {
      fields.push(`plan = $${idx++}`);
      values.push(dto.plan);
    }
    if (dto.planExpiry !== undefined) {
      fields.push(`plan_expiry = $${idx++}`);
      values.push(dto.planExpiry);
    }
    if (dto.verifiedBadge !== undefined) {
      fields.push(`verified_badge = $${idx++}`);
      values.push(dto.verifiedBadge);
    }
    if (dto.timezone !== undefined) {
      fields.push(`timezone = $${idx++}`);
      values.push(dto.timezone);
    }
    if (dto.bannerImage !== undefined) {
      fields.push(`banner_image = $${idx++}`);
      values.push(dto.bannerImage);
    }
    if (dto.galleryImages !== undefined) {
      fields.push(`gallery_images = $${idx++}`);
      values.push(dto.galleryImages);
    }
    if (dto.features !== undefined) {
      fields.push(`features = $${idx++}`);
      values.push(dto.features);
    }
    if (dto.rating !== undefined) {
      fields.push(`rating = $${idx++}`);
      values.push(dto.rating);
    }
    if (dto.reviewsCount !== undefined) {
      fields.push(`reviews_count = $${idx++}`);
      values.push(dto.reviewsCount);
    }

    if (fields.length === 0) {
      return this.findById(id, client);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const res = await query<DbSalon>(
      `UPDATE salons SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
      client
    );
    return res.rows[0] || null;
  },

  async updatePlan(
    id: string,
    plan: PlanType,
    planExpiry: Date,
    client?: PoolClient
  ): Promise<DbSalon | null> {
    const res = await query<DbSalon>(
      `UPDATE salons SET plan = $1, plan_expiry = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
      [plan, planExpiry, id],
      client
    );
    return res.rows[0] || null;
  },

  async updateStatus(id: string, status: SalonStatus, client?: PoolClient): Promise<DbSalon | null> {
    const res = await query<DbSalon>(
      `UPDATE salons SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id],
      client
    );
    return res.rows[0] || null;
  },

  async getWorkingHours(salonId: string, client?: PoolClient): Promise<DbWorkingHour[]> {
    const res = await query<DbWorkingHour>(
      `SELECT * FROM working_hours WHERE salon_id = $1 AND staff_id IS NULL ORDER BY day_of_week ASC`,
      [salonId],
      client
    );
    return res.rows;
  },

  async setWorkingHours(
    salonId: string,
    hours: Array<{ dayOfWeek: number; startTime: string; endTime: string; isClosed: boolean }>,
    client?: PoolClient
  ): Promise<void> {
    for (const h of hours) {
      await query(
        `INSERT INTO working_hours (salon_id, staff_id, day_of_week, start_time, end_time, is_closed)
         VALUES ($1, NULL, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`,
        [salonId, h.dayOfWeek, h.startTime, h.endTime, h.isClosed],
        client
      );
    }
  },
};
