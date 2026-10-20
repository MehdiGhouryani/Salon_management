import type { PoolClient } from 'pg';
import { query, isDatabaseConfigured } from '../db/pool.ts';

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

export interface DbAvailabilityException {
  id: string;
  salon_id: string;
  staff_id: string | null;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  reason: string;
  exception_type: string;
  is_available: boolean;
  created_at: Date;
}

// In-memory fallback fixtures for development/tests when database is not configured
const inMemorySalons: Map<string, DbSalon> = new Map([
  [
    'sal-101',
    {
      id: 'sal-101',
      slug: 'gisara',
      name: 'سالن زیبایی و عروس گیس‌آرا',
      category: 'عروس و خدمات VIP',
      tagline: 'مرکز تخصصی عروس، رنگ، لایت و خدمات VIP زیبایی در محیطی آرام و مجلل',
      owner_name: 'سارا رادمنش',
      phone: '02122409876',
      email: 'info@gisara.ir',
      province: 'تهران',
      city: 'تهران (زعفرانیه)',
      address: 'خیابان آصف، مجتمع تجاری رویال، طبقه ۳، واحد ۳۰۲',
      status: 'active',
      plan: 'gold_vip',
      plan_expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      verified_badge: true,
      timezone: 'Asia/Tehran',
      banner_image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80',
      gallery_images: [
        'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=800&q=80',
      ],
      features: ['پارکینگ اختصاصی', 'کافی‌شاپ VIP', 'مواد ارگانیک بدون آمونیاک', 'پرداخت حضوری با پوز'],
      rating: 4.9,
      reviews_count: 348,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ],
  [
    'sal-102',
    {
      id: 'sal-102',
      slug: 'kazhal',
      name: 'کلینیک و مرکز ناخن کژال',
      category: 'ناخن و پدیکور تخصصی',
      tagline: 'طراحی ژورنالی ناخن و اسپا تخصصی دست و پا با متریال برتر آلمانی',
      owner_name: 'مهسا کاظمی',
      phone: '02634456789',
      email: 'info@kazhalbeauty.ir',
      province: 'البرز',
      city: 'کرج (گوهردشت)',
      address: 'فلکه اول گوهردشت، برج نیکامال، طبقه ۴',
      status: 'active',
      plan: 'silver',
      plan_expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      verified_badge: true,
      timezone: 'Asia/Tehran',
      banner_image: 'https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?auto=format&fit=crop&w=1200&q=80',
      gallery_images: ['https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?auto=format&fit=crop&w=800&q=80'],
      features: ['استریلیزاسیون پزشکی اتوکلاو', 'لاک ژل‌های ضد حساسیت', 'تخفیف مشتریان وفادار'],
      rating: 4.8,
      reviews_count: 194,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ],
]);

const inMemoryWorkingHours: Map<string, DbWorkingHour[]> = new Map([
  [
    'sal-101',
    [
      { id: 'wh-0', salon_id: 'sal-101', staff_id: null, day_of_week: 0, start_time: '09:30', end_time: '20:00', is_closed: false, created_at: new Date(), updated_at: new Date() },
      { id: 'wh-1', salon_id: 'sal-101', staff_id: null, day_of_week: 1, start_time: '09:30', end_time: '20:00', is_closed: false, created_at: new Date(), updated_at: new Date() },
      { id: 'wh-2', salon_id: 'sal-101', staff_id: null, day_of_week: 2, start_time: '09:30', end_time: '20:00', is_closed: false, created_at: new Date(), updated_at: new Date() },
      { id: 'wh-3', salon_id: 'sal-101', staff_id: null, day_of_week: 3, start_time: '09:30', end_time: '20:00', is_closed: false, created_at: new Date(), updated_at: new Date() },
      { id: 'wh-4', salon_id: 'sal-101', staff_id: null, day_of_week: 4, start_time: '09:30', end_time: '20:00', is_closed: false, created_at: new Date(), updated_at: new Date() },
      { id: 'wh-5', salon_id: 'sal-101', staff_id: null, day_of_week: 5, start_time: '09:30', end_time: '18:00', is_closed: false, created_at: new Date(), updated_at: new Date() },
      { id: 'wh-6', salon_id: 'sal-101', staff_id: null, day_of_week: 6, start_time: '10:00', end_time: '16:00', is_closed: true, created_at: new Date(), updated_at: new Date() }, // جمعه تعطیل
    ],
  ],
]);

const inMemoryExceptions: DbAvailabilityException[] = [];

export const salonRepository = {
  async findById(id: string, client?: PoolClient): Promise<DbSalon | null> {
    if (!isDatabaseConfigured()) {
      return inMemorySalons.get(id) || null;
    }

    const res = await query<DbSalon>(
      `SELECT * FROM salons WHERE id = $1 LIMIT 1`,
      [id],
      client
    );
    return res.rows[0] || null;
  },

  async findBySlug(slug: string, client?: PoolClient): Promise<DbSalon | null> {
    if (!isDatabaseConfigured()) {
      for (const salon of inMemorySalons.values()) {
        if (salon.slug === slug) return salon;
      }
      return null;
    }

    const res = await query<DbSalon>(
      `SELECT * FROM salons WHERE slug = $1 LIMIT 1`,
      [slug],
      client
    );
    return res.rows[0] || null;
  },

  async findAll(filter: FindSalonsFilter = {}, client?: PoolClient): Promise<DbSalon[]> {
    if (!isDatabaseConfigured()) {
      let list = Array.from(inMemorySalons.values());
      if (filter.status) list = list.filter((s) => s.status === filter.status);
      if (filter.city && filter.city !== 'همه شهرها') list = list.filter((s) => s.city.includes(filter.city!));
      if (filter.search) {
        const q = filter.search.toLowerCase();
        list = list.filter((s) => s.name.toLowerCase().includes(q) || s.city.toLowerCase().includes(q));
      }
      return list;
    }

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
    if (!isDatabaseConfigured()) {
      return inMemorySalons.size;
    }

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
    if (!isDatabaseConfigured()) {
      const created: DbSalon = {
        id: dto.id,
        slug: dto.slug,
        name: dto.name,
        category: dto.category || 'زیبایی و سلامت',
        tagline: dto.tagline || null,
        owner_name: dto.ownerName,
        phone: dto.phone,
        email: dto.email || null,
        province: dto.province,
        city: dto.city,
        address: dto.address,
        status: dto.status || 'pending',
        plan: dto.plan || 'bronze',
        plan_expiry: dto.planExpiry,
        verified_badge: dto.verifiedBadge || false,
        timezone: dto.timezone || 'Asia/Tehran',
        banner_image: dto.bannerImage || null,
        gallery_images: dto.galleryImages || [],
        features: dto.features || [],
        rating: dto.rating || 5.0,
        reviews_count: dto.reviewsCount || 0,
        created_at: new Date(),
        updated_at: new Date(),
      };
      inMemorySalons.set(dto.id, created);
      return created;
    }

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
    if (!isDatabaseConfigured()) {
      const existing = inMemorySalons.get(id);
      if (!existing) return null;
      if (dto.name !== undefined) existing.name = dto.name;
      if (dto.category !== undefined) existing.category = dto.category;
      if (dto.tagline !== undefined) existing.tagline = dto.tagline;
      if (dto.ownerName !== undefined) existing.owner_name = dto.ownerName;
      if (dto.phone !== undefined) existing.phone = dto.phone;
      if (dto.email !== undefined) existing.email = dto.email;
      if (dto.province !== undefined) existing.province = dto.province;
      if (dto.city !== undefined) existing.city = dto.city;
      if (dto.address !== undefined) existing.address = dto.address;
      if (dto.status !== undefined) existing.status = dto.status;
      if (dto.plan !== undefined) existing.plan = dto.plan;
      if (dto.planExpiry !== undefined) existing.plan_expiry = dto.planExpiry;
      if (dto.verifiedBadge !== undefined) existing.verified_badge = dto.verifiedBadge;
      if (dto.timezone !== undefined) existing.timezone = dto.timezone;
      if (dto.bannerImage !== undefined) existing.banner_image = dto.bannerImage;
      if (dto.galleryImages !== undefined) existing.gallery_images = dto.galleryImages;
      if (dto.features !== undefined) existing.features = dto.features;
      if (dto.rating !== undefined) existing.rating = dto.rating;
      if (dto.reviewsCount !== undefined) existing.reviews_count = dto.reviewsCount;
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
    if (!isDatabaseConfigured()) {
      const s = inMemorySalons.get(id);
      if (!s) return null;
      s.plan = plan;
      s.plan_expiry = planExpiry;
      s.updated_at = new Date();
      return s;
    }

    const res = await query<DbSalon>(
      `UPDATE salons SET plan = $1, plan_expiry = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
      [plan, planExpiry, id],
      client
    );
    return res.rows[0] || null;
  },

  async updateStatus(id: string, status: SalonStatus, client?: PoolClient): Promise<DbSalon | null> {
    if (!isDatabaseConfigured()) {
      const s = inMemorySalons.get(id);
      if (!s) return null;
      s.status = status;
      s.updated_at = new Date();
      return s;
    }

    const res = await query<DbSalon>(
      `UPDATE salons SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id],
      client
    );
    return res.rows[0] || null;
  },

  async getWorkingHours(salonId: string, client?: PoolClient): Promise<DbWorkingHour[]> {
    if (!isDatabaseConfigured()) {
      return inMemoryWorkingHours.get(salonId) || [];
    }

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
    if (!isDatabaseConfigured()) {
      const list: DbWorkingHour[] = hours.map((h, i) => ({
        id: `wh-${salonId}-${i}`,
        salon_id: salonId,
        staff_id: null,
        day_of_week: h.dayOfWeek,
        start_time: h.startTime,
        end_time: h.endTime,
        is_closed: h.isClosed,
        created_at: new Date(),
        updated_at: new Date(),
      }));
      inMemoryWorkingHours.set(salonId, list);
      return;
    }

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

  async getAvailabilityExceptions(
    salonId: string,
    dateStr: string,
    staffId?: string,
    client?: PoolClient
  ): Promise<DbAvailabilityException[]> {
    if (!isDatabaseConfigured()) {
      return inMemoryExceptions.filter(
        (e) =>
          e.salon_id === salonId &&
          (!staffId || !e.staff_id || e.staff_id === staffId) &&
          dateStr >= e.start_date &&
          dateStr <= e.end_date
      );
    }

    const conditions = ['salon_id = $1', 'start_date <= $2::date', 'end_date >= $2::date'];
    const values: any[] = [salonId, dateStr];

    if (staffId) {
      conditions.push('(staff_id IS NULL OR staff_id = $3)');
      values.push(staffId);
    } else {
      conditions.push('staff_id IS NULL');
    }

    const res = await query<DbAvailabilityException>(
      `SELECT * FROM availability_exceptions WHERE ${conditions.join(' AND ')}`,
      values,
      client
    );
    return res.rows;
  },

  async getAllAvailabilityExceptions(
    salonId: string,
    client?: PoolClient
  ): Promise<DbAvailabilityException[]> {
    if (!isDatabaseConfigured()) {
      return inMemoryExceptions.filter((e) => e.salon_id === salonId);
    }

    const res = await query<DbAvailabilityException>(
      `SELECT * FROM availability_exceptions WHERE salon_id = $1 ORDER BY start_date ASC`,
      [salonId],
      client
    );
    return res.rows;
  },

  async addAvailabilityException(
    dto: {
      salonId: string;
      staffId?: string | null;
      startDate: string;
      endDate: string;
      startTime?: string | null;
      endTime?: string | null;
      reason: string;
      exceptionType?: string;
      isAvailable?: boolean;
    },
    client?: PoolClient
  ): Promise<DbAvailabilityException> {
    const id = `exc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const created: DbAvailabilityException = {
      id,
      salon_id: dto.salonId,
      staff_id: dto.staffId || null,
      start_date: dto.startDate,
      end_date: dto.endDate,
      start_time: dto.startTime || null,
      end_time: dto.endTime || null,
      reason: dto.reason,
      exception_type: dto.exceptionType || 'holiday',
      is_available: dto.isAvailable ?? false,
      created_at: new Date(),
    };

    if (!isDatabaseConfigured()) {
      inMemoryExceptions.push(created);
      return created;
    }

    const res = await query<DbAvailabilityException>(
      `INSERT INTO availability_exceptions (
        salon_id, staff_id, start_date, end_date, start_time, end_time, reason, exception_type, is_available
      ) VALUES ($1, $2, $3::date, $4::date, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        dto.salonId,
        dto.staffId || null,
        dto.startDate,
        dto.endDate,
        dto.startTime || null,
        dto.endTime || null,
        dto.reason,
        dto.exceptionType || 'holiday',
        dto.isAvailable ?? false,
      ],
      client
    );
    return res.rows[0];
  },

  async deleteAvailabilityException(
    salonId: string,
    exceptionId: string,
    client?: PoolClient
  ): Promise<boolean> {
    if (!isDatabaseConfigured()) {
      const idx = inMemoryExceptions.findIndex(
        (e) => e.id === exceptionId && e.salon_id === salonId
      );
      if (idx >= 0) {
        inMemoryExceptions.splice(idx, 1);
        return true;
      }
      return false;
    }

    const res = await query(
      `DELETE FROM availability_exceptions WHERE id = $1 AND salon_id = $2`,
      [exceptionId, salonId],
      client
    );
    return (res.rowCount ?? 0) > 0;
  },

  /**
   * Helper for tests: add temporary availability exception in memory
   */
  _addInMemoryException(exception: DbAvailabilityException) {
    inMemoryExceptions.push(exception);
  },

  _clearInMemoryExceptions() {
    inMemoryExceptions.length = 0;
  },
};
