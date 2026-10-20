import type { PoolClient } from 'pg';
import { query, isDatabaseConfigured } from '../db/pool.ts';
import { doIntervalsOverlap } from '../utils/bookingTime.ts';

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
      return list;
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
      conditions.push(`booking_date = $${idx++}`);
      values.push(filter.date);
    }
    if (filter.startDate) {
      conditions.push(`booking_date >= $${idx++}`);
      values.push(filter.startDate);
    }
    if (filter.endDate) {
      conditions.push(`booking_date <= $${idx++}`);
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
    if (!isDatabaseConfigured()) {
      for (const appt of inMemoryAppointments.values()) {
        if (
          appt.salon_id === salonId &&
          appt.staff_id === staffId &&
          appt.booking_date === bookingDate &&
          appt.status !== 'cancelled' &&
          appt.id !== excludeAppointmentId
        ) {
          const existingEnd = appt.end_time || appt.booking_time;
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
    const conditions = [
      'salon_id = $1',
      'staff_id = $2',
      'booking_date = $3',
      "status NOT IN ('cancelled')",
      'booking_time < $4',
      'COALESCE(end_time, booking_time) > $5',
    ];
    const values: any[] = [salonId, staffId, bookingDate, endTime, bookingTime];

    if (excludeAppointmentId) {
      conditions.push('id != $6');
      values.push(excludeAppointmentId);
    }

    const res = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM appointments WHERE ${conditions.join(' AND ')}`,
      values,
      client
    );
    return parseInt(res.rows[0]?.count || '0', 10) === 0;
  },

  async create(dto: CreateAppointmentDto, client?: PoolClient): Promise<DbAppointment> {
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
        booking_date: dto.bookingDate,
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
        client_name, client_phone, booking_date, booking_time, end_time,
        price, payment_method, payment_status, status, notes, is_demo
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16, $17
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
      existing.status = newStatus;
      if (newStatus === 'cancelled') {
        existing.cancellation_reason = reason || null;
      }
      existing.updated_at = new Date();
      return existing;
    }

    const current = await this.findById(id, client);
    if (!current) return null;

    const res = await query<DbAppointment>(
      `UPDATE appointments
       SET status = $1,
           cancellation_reason = CASE WHEN $1 = 'cancelled' THEN $2 ELSE cancellation_reason END,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [newStatus, reason || null, id],
      client
    );

    // Record status transition in audit history
    await query(
      `INSERT INTO appointment_status_history (
        appointment_id, old_status, new_status, changed_by_user_id, changed_by_name, reason
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, current.status, newStatus, changedByUserId || null, changedByName, reason || null],
      client
    );

    return res.rows[0] || null;
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
      existing.booking_date = newDate;
      existing.booking_time = newTime;
      existing.end_time = newEndTime;
      if (newStaffId) existing.staff_id = newStaffId;
      existing.updated_at = new Date();
      return existing;
    }

    const current = await this.findById(id, client);
    if (!current) return null;

    const targetStaffId = newStaffId || current.staff_id;
    const res = await query<DbAppointment>(
      `UPDATE appointments
       SET booking_date = $1,
           booking_time = $2,
           end_time = $3,
           staff_id = $4,
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [newDate, newTime, newEndTime, targetStaffId, id],
      client
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
      client
    );

    return res.rows[0] || null;
  },

  /**
   * Testing helper: clears in-memory appointments
   */
  _clearInMemory() {
    inMemoryAppointments.clear();
  },
};
