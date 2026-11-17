import type { PoolClient } from 'pg';
import { query, isDatabaseConfigured, withTransaction } from '../db/pool.ts';
import { addMinutesToTime, doIntervalsOverlap } from '../utils/bookingTime.ts';
import { parseBookingDateInput } from '../utils/jalali.ts';

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
export type PaymentStatus = 'pending' | 'paid_in_person' | 'refunded' | 'waived';

export interface DbAppointment {
  id: string;
  tracking_code: string;
  salon_id: string;
  service_id: string;
  staff_id: string;
  client_id: string | null;
  client_name: string;
  client_phone: string;
  booking_date: string;
  /** Canonical Gregorian DATE (YYYY-MM-DD when materialized by pg). Phase 06. */
  booking_date_greg?: string | null;
  /** Raw pre-migration date string preserved by migration 004. */
  booking_date_legacy?: string | null;
  booking_time: string;
  end_time: string | null;
  price: string | number;
  payment_method: string;
  payment_status: PaymentStatus;
  status: AppointmentStatus;
  cancellation_reason: string | null;
  notes: string | null;
  is_demo: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Allowed appointment status transitions (Phase 09 — documented business rule:
 * completed / cancelled / no_show are terminal states; no commercial
 * cancellation-window policy is invented here).
 */
export const APPOINTMENT_STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  pending: ['confirmed', 'cancelled', 'no_show'],
  confirmed: ['completed', 'cancelled', 'no_show'],
  completed: [],
  cancelled: [],
  no_show: [],
};

export interface CreateAppointmentDto {
  id: string;
  trackingCode: string;
  salonId: string;
  serviceId: string;
  staffId: string;
  clientId?: string | null;
  clientName: string;
  clientPhone: string;
  bookingDate: string;
  bookingTime: string;
  endTime?: string | null;
  price: number;
  paymentMethod?: string;
  paymentStatus?: PaymentStatus;
  status?: AppointmentStatus;
  notes?: string | null;
  isDemo?: boolean;
}

export interface FindAppointmentsFilter {
  date?: string;
  startDate?: string;
  endDate?: string;
  status?: AppointmentStatus;
  staffId?: string;
  limit?: number;
  offset?: number;
}

// In-memory fallback map exclusively for development/test when database is not configured
const inMemoryAppointments: Map<string, DbAppointment> = new Map([
  [
    'apt-101',
    {
      id: 'apt-101',
      tracking_code: 'GIS-8921',
      salon_id: 'sal-101',
      service_id: 'srv-101',
      staff_id: 'stf-101',
      client_id: 'cli-101',
      client_name: 'رویا حسینی',
      client_phone: '09123456789',
      booking_date: '1403/08/20',
      booking_time: '10:30',
      end_time: '13:30',
      price: 2400000,
      payment_method: 'in_person',
      payment_status: 'pending',
      status: 'confirmed',
      cancellation_reason: null,
      notes: 'لطفا رنگساژ دودی نسکافه‌ای مد نظر قرار گیرد',
      is_demo: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ],
  [
    'apt-102',
    {
      id: 'apt-102',
      tracking_code: 'GIS-8922',
      salon_id: 'sal-101',
      service_id: 'srv-103',
      staff_id: 'stf-102',
      client_id: 'cli-102',
      client_name: 'الهام سمیعی',
      client_phone: '09351234567',
      booking_date: '1403/08/21',
      booking_time: '14:00',
      end_time: '15:30',
      price: 680000,
      payment_method: 'in_person',
      payment_status: 'pending',
      status: 'confirmed',
      cancellation_reason: null,
      notes: null,
      is_demo: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ],
]);

export const appointmentRepository = {
  async findById(id: string, client?: PoolClient): Promise<DbAppointment | null> {
    if (!isDatabaseConfigured()) {
      return inMemoryAppointments.get(id) || null;
    }

    const res = await query<DbAppointment>(
      `SELECT * FROM appointments WHERE id = $1 LIMIT 1`,
      [id],
      client
    );
    return res.rows[0] || null;
  },

  async findByTrackingCode(trackingCode: string, client?: PoolClient): Promise<DbAppointment | null> {
    if (!isDatabaseConfigured()) {
      for (const appt of inMemoryAppointments.values()) {
        if (appt.tracking_code === trackingCode) return appt;
      }
      return null;
    }

    const res = await query<DbAppointment>(
      `SELECT * FROM appointments WHERE tracking_code = $1 LIMIT 1`,
      [trackingCode],
      client
    );
    return res.rows[0] || null;
  },

  async findBySalonId(
    salonId: string,
    filter: FindAppointmentsFilter = {},
    client?: PoolClient
  ): Promise<DbAppointment[]> {
    if (!isDatabaseConfigured()) {
      let list = Array.from(inMemoryAppointments.values()).filter((a) => a.salon_id === salonId);
      if (filter.status) list = list.filter((a) => a.status === filter.status);
      if (filter.staffId) list = list.filter((a) => a.staff_id === filter.staffId);
      if (filter.date) list = list.filter((a) => a.booking_date === filter.date);
      if (filter.startDate) list = list.filter((a) => a.booking_date >= filter.startDate!);
      if (filter.endDate) list = list.filter((a) => a.booking_date <= filter.endDate!);
      const offset = filter.offset && filter.offset > 0 ? filter.offset : 0;
      const limit = filter.limit && filter.limit > 0 ? filter.limit : list.length;
      return list.slice(offset, offset + limit);
    }

    const conditions: string[] = ['salon_id = $1'];
    const values: any[] = [salonId];
    let idx = 2;

    if (filter.status) {
      conditions.push(`status = $${idx++}`);
      values.push(filter.status);
    }
    if (filter.staffId) {
      conditions.push(`staff_id = $${idx++}`);
      values.push(filter.staffId);
    }
    // Date filters run against the canonical DATE column (Phase 06); legacy
    // mixed-format strings are covered through the migrated canonical values.
    if (filter.date) {
      conditions.push(`booking_date_greg = $${idx++}::date`);
      values.push(filter.date);
    }
    if (filter.startDate) {
      conditions.push(`booking_date_greg >= $${idx++}::date`);
      values.push(filter.startDate);
    }
    if (filter.endDate) {
      conditions.push(`booking_date_greg <= $${idx++}::date`);
      values.push(filter.endDate);
    }

    const limit = filter.limit && filter.limit > 0 ? filter.limit : 100;
    const offset = filter.offset && filter.offset >= 0 ? filter.offset : 0;

    values.push(limit);
    const limitIdx = idx++;
    values.push(offset);
    const offsetIdx = idx++;

    const res = await query<DbAppointment>(
      `SELECT * FROM appointments
       WHERE ${conditions.join(' AND ')}
       ORDER BY booking_date DESC, booking_time ASC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      values,
      client
    );
    return res.rows;
  },

  async findByClientPhone(phone: string, client?: PoolClient): Promise<DbAppointment[]> {
    if (!isDatabaseConfigured()) {
      return Array.from(inMemoryAppointments.values())
        .filter((a) => a.client_phone === phone)
        .sort((a, b) => b.booking_date.localeCompare(a.booking_date) || b.booking_time.localeCompare(a.booking_time));
    }

    const res = await query<DbAppointment>(
      `SELECT * FROM appointments WHERE client_phone = $1 ORDER BY booking_date DESC, booking_time DESC`,
      [phone],
      client
    );
    return res.rows;
  },

  /**
   * Simple point check: returns true if exact start time is not taken
   */
  async checkSlotAvailability(
    salonId: string,
    staffId: string,
    bookingDate: string,
    bookingTime: string,
    excludeAppointmentId?: string,
    client?: PoolClient
  ): Promise<boolean> {
    if (!isDatabaseConfigured()) {
      for (const appt of inMemoryAppointments.values()) {
        if (
          appt.salon_id === salonId &&
          appt.staff_id === staffId &&
          appt.booking_date === bookingDate &&
          appt.booking_time === bookingTime &&
          appt.status !== 'cancelled' &&
          appt.id !== excludeAppointmentId
        ) {
          return false;
        }
      }
      return true;
    }

    const conditions = [
      'salon_id = $1',
      'staff_id = $2',
      'booking_date = $3',
      'booking_time = $4',
      "status NOT IN ('cancelled')",
    ];
    const values: any[] = [salonId, staffId, bookingDate, bookingTime];

    if (excludeAppointmentId) {
      conditions.push('id != $5');
      values.push(excludeAppointmentId);
    }

    const res = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM appointments WHERE ${conditions.join(' AND ')}`,
      values,
      client
    );
    return parseInt(res.rows[0]?.count || '0', 10) === 0;
  },

  /**
   * Production-grade interval overlap check:
   * Returns true if slot [bookingTime, endTime) is completely FREE with zero overlap.
   * Returns false if an active appointment already occupies any part of this time window.
   */
  async checkSlotOverlap(
    salonId: string,
    staffId: string,
    bookingDate: string,
    bookingTime: string,
    endTime: string,
    excludeAppointmentId?: string,
    client?: PoolClient
  ): Promise<boolean> {
    // Canonical date resolution at the repository boundary (Phase 06):
    // Gregorian ISO or validated Jalali input; unparseable dates can never be
    // "free" — they are rejected rather than guessed.
    const canonicalDay = parseBookingDateInput(bookingDate);
    if (!canonicalDay) return false;
    const canonicalDate = canonicalDay.canonical;

    if (!isDatabaseConfigured()) {
      for (const appt of inMemoryAppointments.values()) {
        if (
          appt.salon_id === salonId &&
          appt.staff_id === staffId &&
          appt.booking_date === canonicalDate &&
          appt.status !== 'cancelled' &&
          appt.id !== excludeAppointmentId
        ) {
          const existingEnd = appt.end_time || addMinutesToTime(appt.booking_time, 60);
          if (doIntervalsOverlap(bookingTime, endTime, appt.booking_time, existingEnd)) {
            return false; // Overlap detected! Slot is not available
          }
        }
      }
      return true;
    }

    // In SQL:
    // Two intervals [A_start, A_end) and [B_start, B_end) overlap if:
    // A_start < B_end AND B_start < A_end
    // Date comparison uses the canonical DATE column (Phase 06): mixed-format
    // legacy strings can no longer alias the same calendar day into two slots.
    const conditions = [
      'salon_id = $1',
      'staff_id = $2',
      'booking_date_greg = $3::date',
      "status NOT IN ('cancelled')",
      'booking_time::time < $4::time',
      "COALESCE(NULLIF(end_time, '')::time, booking_time::time + INTERVAL '60 minutes') > $5::time",
    ];
    const values: any[] = [salonId, staffId, bookingDate, endTime, bookingTime];

    if (excludeAppointmentId) {
      conditions.push('id != $6');
      values.push(excludeAppointmentId);
    }

    // Row-level lock (R7 defense in depth): conflicting appointment rows are
    // locked FOR UPDATE inside the caller's transaction, so a concurrent
    // transaction checking the same slot blocks until the first commits/rolls back.
    // Comparison uses the canonical DATE column (Phase 06).
    const res = await query<{ id: string }>(
      `SELECT id FROM appointments WHERE ${conditions.join(' AND ')} FOR UPDATE`,
      values,
      client
    );
    return res.rows.length === 0;
  },

  async create(dto: CreateAppointmentDto, client?: PoolClient): Promise<DbAppointment> {
    // Canonical date resolution (Phase 06): bookingDate may arrive as a
    // validated Gregorian ISO or Jalali string; booking_date_greg stores the
    // one canonical calendar date. Unparseable values are rejected — never guessed.
    const canonicalDate = parseBookingDateInput(dto.bookingDate);
    if (!canonicalDate) {
      throw new Error(`Invalid booking date: "${dto.bookingDate}". Expected YYYY-MM-DD or a valid Jalali date.`);
    }
    const bookingDateGreg = canonicalDate.canonical;

    if (!isDatabaseConfigured()) {
      const created: DbAppointment = {
        id: dto.id,
        tracking_code: dto.trackingCode,
        salon_id: dto.salonId,
        service_id: dto.serviceId,
        staff_id: dto.staffId,
        client_id: dto.clientId || null,
        client_name: dto.clientName,
        client_phone: dto.clientPhone,
        // In-memory adapter stores the canonical ISO string so dev behavior
        // mirrors the database's DATE column exactly.
        booking_date: bookingDateGreg,
        booking_date_greg: bookingDateGreg,
        booking_time: dto.bookingTime,
        end_time: dto.endTime || null,
        price: dto.price,
        payment_method: dto.paymentMethod || 'in_person',
        payment_status: dto.paymentStatus || 'pending',
        status: dto.status || 'confirmed',
        cancellation_reason: null,
        notes: dto.notes || null,
        is_demo: dto.isDemo || false,
        created_at: new Date(),
        updated_at: new Date(),
      };
      inMemoryAppointments.set(dto.id, created);
      return created;
    }

    const res = await query<DbAppointment>(
      `INSERT INTO appointments (
        id, tracking_code, salon_id, service_id, staff_id, client_id,
        client_name, client_phone, booking_date, booking_date_greg, booking_time, end_time,
        price, payment_method, payment_status, status, notes, is_demo
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17, $18
      )
      RETURNING *`,
      [
        dto.id,
        dto.trackingCode,
        dto.salonId,
        dto.serviceId,
        dto.staffId,
        dto.clientId || null,
        dto.clientName,
        dto.clientPhone,
        dto.bookingDate,
        bookingDateGreg,
        dto.bookingTime,
        dto.endTime || null,
        dto.price,
        dto.paymentMethod || 'in_person',
        dto.paymentStatus || 'pending',
        dto.status || 'confirmed',
        dto.notes || null,
        dto.isDemo || false,
      ],
      client
    );

    // Record initial status history
    await query(
      `INSERT INTO appointment_status_history (
        appointment_id, old_status, new_status, changed_by_name, reason
      ) VALUES ($1, NULL, $2, $3, $4)`,
      [dto.id, dto.status || 'confirmed', dto.clientName, 'نوبت اولیه ثبت شد'],
      client
    );

    return res.rows[0];
  },

  async updateStatus(
    id: string,
    newStatus: AppointmentStatus,
    changedByName: string,
    reason?: string,
    changedByUserId?: string,
    client?: PoolClient
  ): Promise<DbAppointment | null> {
    if (!isDatabaseConfigured()) {
      const existing = inMemoryAppointments.get(id);
      if (!existing) return null;
      // Phase 09: enforce the status transition map (terminal states are final).
      if (!APPOINTMENT_STATUS_TRANSITIONS[existing.status]?.includes(newStatus)) {
        const err = new Error(
          `تغییر وضعیت از «${existing.status}» به «${newStatus}» مجاز نیست.`
        ) as Error & { statusCode?: number; code?: string };
        err.statusCode = 409;
        err.code = 'INVALID_STATUS_TRANSITION';
        throw err;
      }
      existing.status = newStatus;
      if (newStatus === 'cancelled') {
        existing.cancellation_reason = reason || null;
      }
      existing.updated_at = new Date();
      return existing;
    }

    const current = await this.findById(id, client);
    if (!current) return null;

    // Phase 09: enforce the status transition map (terminal states are final).
    if (!APPOINTMENT_STATUS_TRANSITIONS[current.status]?.includes(newStatus)) {
      const err = new Error(
        `تغییر وضعیت از «${current.status}» به «${newStatus}» مجاز نیست.`
      ) as Error & { statusCode?: number; code?: string };
      err.statusCode = 409;
      err.code = 'INVALID_STATUS_TRANSITION';
      throw err;
    }

    // Transactional mutation (Phase 06): the status change and its history
    // row must commit or roll back together when no outer transaction exists.
    // Phase 18: the status value is bound TWICE ($1 for the column, $4 for the
    // CASE comparison). A single $1 in both positions made PostgreSQL deduce
    // "inconsistent types for parameter $1" (varchar column vs literal
    // comparison) and fail every status transition on real PostgreSQL — the
    // in-memory adapter masked this until the Phase 18 DB suite ran it.
    const runUpdate = async (txClient?: PoolClient): Promise<DbAppointment | null> => {
      const res = await query<DbAppointment>(
        `UPDATE appointments
         SET status = $1,
             cancellation_reason = CASE WHEN $4 = 'cancelled' THEN $2 ELSE cancellation_reason END,
             updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [newStatus, reason || null, id, newStatus],
        txClient
      );

      // Record status transition in audit history
      await query(
        `INSERT INTO appointment_status_history (
          appointment_id, old_status, new_status, changed_by_user_id, changed_by_name, reason
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, current.status, newStatus, changedByUserId || null, changedByName, reason || null],
        txClient
      );

      return res.rows[0] || null;
    };

    if (client) {
      return await runUpdate(client);
    }
    return await withTransaction(async (txClient) => runUpdate(txClient));
  },

  /** Phase 10: total matching appointments for stable pagination. */
  async countBySalonId(
    salonId: string,
    filter: FindAppointmentsFilter = {},
    client?: PoolClient
  ): Promise<number> {
    if (!isDatabaseConfigured()) {
      let list = Array.from(inMemoryAppointments.values()).filter((a) => a.salon_id === salonId);
      if (filter.status) list = list.filter((a) => a.status === filter.status);
      if (filter.staffId) list = list.filter((a) => a.staff_id === filter.staffId);
      if (filter.date) list = list.filter((a) => a.booking_date === filter.date);
      if (filter.startDate) list = list.filter((a) => a.booking_date >= filter.startDate!);
      if (filter.endDate) list = list.filter((a) => a.booking_date <= filter.endDate!);
      return list.length;
    }

    const conditions: string[] = ['salon_id = $1'];
    const values: any[] = [salonId];
    let idx = 2;
    if (filter.status) {
      conditions.push(`status = $${idx++}`);
      values.push(filter.status);
    }
    if (filter.staffId) {
      conditions.push(`staff_id = $${idx++}`);
      values.push(filter.staffId);
    }
    if (filter.date) {
      conditions.push(`booking_date_greg = $${idx++}::date`);
      values.push(filter.date);
    }
    if (filter.startDate) {
      conditions.push(`booking_date_greg >= $${idx++}::date`);
      values.push(filter.startDate);
    }
    if (filter.endDate) {
      conditions.push(`booking_date_greg <= $${idx++}::date`);
      values.push(filter.endDate);
    }

    const res = await query<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM appointments WHERE ${conditions.join(' AND ')}`,
      values,
      client
    );
    return res.rows[0]?.total ?? 0;
  },

  async reschedule(
    id: string,
    newDate: string,
    newTime: string,
    newEndTime: string,
    newStaffId?: string,
    changedByName?: string,
    changedByUserId?: string,
    client?: PoolClient
  ): Promise<DbAppointment | null> {
    if (!isDatabaseConfigured()) {
      const existing = inMemoryAppointments.get(id);
      if (!existing) return null;
      const canonical = parseBookingDateInput(newDate);
      if (!canonical) {
        throw new Error(`Invalid reschedule date: "${newDate}".`);
      }
      existing.booking_date = canonical.canonical;
      existing.booking_date_greg = canonical.canonical;
      existing.booking_time = newTime;
      existing.end_time = newEndTime;
      if (newStaffId) existing.staff_id = newStaffId;
      existing.updated_at = new Date();
      return existing;
    }

    const current = await this.findById(id, client);
    if (!current) return null;

    // Canonical date resolution (Phase 06) + transactional mutation: the move
    // and its history row commit or roll back together.
    const canonicalNewDate = parseBookingDateInput(newDate);
    if (!canonicalNewDate) {
      throw new Error(`Invalid reschedule date: "${newDate}". Expected YYYY-MM-DD or a valid Jalali date.`);
    }
    const targetStaffId = newStaffId || current.staff_id;

    const runReschedule = async (txClient?: PoolClient): Promise<DbAppointment | null> => {
      const res = await query<DbAppointment>(
        `UPDATE appointments
         SET booking_date = $1,
             booking_date_greg = $6::date,
             booking_time = $2,
             end_time = $3,
             staff_id = $4,
             updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [newDate, newTime, newEndTime, targetStaffId, id, canonicalNewDate.canonical],
        txClient
      );

      await query(
        `INSERT INTO appointment_status_history (
          appointment_id, old_status, new_status, changed_by_user_id, changed_by_name, reason
        ) VALUES ($1, $2, $2, $3, $4, $5)`,
        [
          id,
          current.status,
          changedByUserId || null,
          changedByName || 'پرسنل سالن',
          `تغییر زمان نوبت از ${current.booking_date} ${current.booking_time} به ${newDate} ${newTime}`,
        ],
        txClient
      );

      return res.rows[0] || null;
    };

    if (client) {
      return await runReschedule(client);
    }
    return await withTransaction(async (txClient) => runReschedule(txClient));
  },

  async countAll(client?: PoolClient): Promise<number> {
    if (!isDatabaseConfigured()) {
      return inMemoryAppointments.size;
    }
    const res = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM appointments`,
      [],
      client
    );
    return parseInt(res.rows[0]?.count || '0', 10);
  },

  /**
   * Per-salon booking aggregates for the Super Admin console (Phase 18).
   *
   * All numbers are computed from real appointment rows — never fabricated:
   *  - monthlyRevenue: SUM(price) of confirmed/completed appointments whose
   *    canonical booking_date_greg falls inside the CURRENT calendar month in
   *    Asia/Tehran (the platform's business timezone). Legacy rows whose date
   *    could not be canonicalized (booking_date_greg IS NULL) are excluded
   *    from the monthly window — the same rule availability queries follow.
   *  - totalAppointments: COUNT(*) of every appointment row for the salon
   *    (same semantics as the platform-wide totalAppointments KPI).
   *
   * Salons with no rows are simply absent from the returned map; callers
   * must treat a missing entry as all-zero.
   */
  async getSalonBookingAggregates(
    salonIds: string[],
    client?: PoolClient
  ): Promise<Map<string, { monthlyRevenue: number; totalAppointments: number }>> {
    const aggregates = new Map<string, { monthlyRevenue: number; totalAppointments: number }>();
    if (salonIds.length === 0) return aggregates;

    if (!isDatabaseConfigured()) {
      const monthStart = tehranMonthStart();
      const monthEnd = tehranMonthEnd(monthStart);
      for (const appt of inMemoryAppointments.values()) {
        if (!salonIds.includes(appt.salon_id)) continue;
        const entry = aggregates.get(appt.salon_id) || { monthlyRevenue: 0, totalAppointments: 0 };
        entry.totalAppointments += 1;
        // Canonicalize the same way the domain layer does: only unambiguous
        // ISO/Jalali dates count toward the monthly revenue window.
        if (appt.status === 'confirmed' || appt.status === 'completed') {
          const greg = appt.booking_date_greg || parseBookingDateInput(appt.booking_date)?.canonical;
          if (greg && greg >= monthStart && greg <= monthEnd) {
            entry.monthlyRevenue += Number(appt.price) || 0;
          }
        }
        aggregates.set(appt.salon_id, entry);
      }
      return aggregates;
    }

    const res = await query<{ salon_id: string; monthly_revenue: string; total_appointments: string }>(
      `WITH bounds AS (
         SELECT date_trunc('month', now() AT TIME ZONE 'Asia/Tehran')::date AS month_start,
                (date_trunc('month', now() AT TIME ZONE 'Asia/Tehran') + interval '1 month - 1 day')::date AS month_end
       )
       SELECT a.salon_id,
              COALESCE(SUM(a.price) FILTER (
                WHERE a.status IN ('confirmed', 'completed')
                  AND a.booking_date_greg IS NOT NULL
                  AND a.booking_date_greg BETWEEN b.month_start AND b.month_end
              ), 0)::text AS monthly_revenue,
              COUNT(*)::text AS total_appointments
       FROM appointments a CROSS JOIN bounds b
       WHERE a.salon_id = ANY($1::text[])
       GROUP BY a.salon_id`,
      [salonIds],
      client
    );
    for (const row of res.rows) {
      aggregates.set(row.salon_id, {
        monthlyRevenue: parseInt(row.monthly_revenue, 10) || 0,
        totalAppointments: parseInt(row.total_appointments, 10) || 0,
      });
    }
    return aggregates;
  },

  /**
   * Testing helper: clears in-memory appointments
   */
  _clearInMemory() {
    inMemoryAppointments.clear();
  },

  /**
   * Phase 19 (dev/test reset endpoint support): deletes appointments — and
   * their status history — for the given CLIENT PHONES in whichever store is
   * active. Callers are responsible for allowlisting phones (the dev route
   * enforces the server-side E2E_TEST_PHONE_ALLOWLIST before invoking this).
   */
  async deleteByClientPhones(
    phones: string[],
    client?: PoolClient
  ): Promise<{ appointmentsDeleted: number; historyDeleted: number }> {
    if (phones.length === 0) return { appointmentsDeleted: 0, historyDeleted: 0 };

    if (!isDatabaseConfigured()) {
      // The in-memory adapter has no status-history store (history writes are
      // no-ops there), so only the appointments themselves are removed.
      let appointmentsDeleted = 0;
      for (const appt of [...inMemoryAppointments.values()]) {
        if (!phones.includes(appt.client_phone)) continue;
        inMemoryAppointments.delete(appt.id);
        appointmentsDeleted += 1;
      }
      return { appointmentsDeleted, historyDeleted: 0 };
    }

    const history = await query(
      `DELETE FROM appointment_status_history
       WHERE appointment_id IN (
         SELECT id FROM appointments WHERE client_phone = ANY($1::text[])
       )`,
      [phones],
      client
    );
    const deleted = await query(
      `DELETE FROM appointments WHERE client_phone = ANY($1::text[])`,
      [phones],
      client
    );
    return {
      appointmentsDeleted: deleted.rowCount ?? 0,
      historyDeleted: history.rowCount ?? 0,
    };
  },
};

/** Today's date in Asia/Tehran as YYYY-MM-DD (the platform business timezone). */
function tehranToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' }).format(new Date());
}

/** First day of the current Asia/Tehran month as YYYY-MM-DD. */
function tehranMonthStart(): string {
  return `${tehranToday().slice(0, 7)}-01`;
}

/** Last day of the current Asia/Tehran month as YYYY-MM-DD. */
function tehranMonthEnd(monthStart: string): string {
  const [y, m] = monthStart.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0, 12)).toISOString().slice(0, 10);
}
