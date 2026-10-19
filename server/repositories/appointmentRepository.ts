import type { PoolClient } from 'pg';
import { query } from '../db/pool.ts';

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

export const appointmentRepository = {
  async findById(id: string, client?: PoolClient): Promise<DbAppointment | null> {
    const res = await query<DbAppointment>(
      `SELECT * FROM appointments WHERE id = $1 LIMIT 1`,
      [id],
      client
    );
    return res.rows[0] || null;
  },

  async findByTrackingCode(trackingCode: string, client?: PoolClient): Promise<DbAppointment | null> {
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
    const res = await query<DbAppointment>(
      `SELECT * FROM appointments WHERE client_phone = $1 ORDER BY booking_date DESC, booking_time DESC`,
      [phone],
      client
    );
    return res.rows;
  },

  async checkSlotAvailability(
    salonId: string,
    staffId: string,
    bookingDate: string,
    bookingTime: string,
    excludeAppointmentId?: string,
    client?: PoolClient
  ): Promise<boolean> {
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

  async create(dto: CreateAppointmentDto, client?: PoolClient): Promise<DbAppointment> {
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

  async updatePaymentStatus(
    id: string,
    paymentStatus: PaymentStatus,
    client?: PoolClient
  ): Promise<DbAppointment | null> {
    const res = await query<DbAppointment>(
      `UPDATE appointments SET payment_status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [paymentStatus, id],
      client
    );
    return res.rows[0] || null;
  },

  async countBySalon(salonId: string, client?: PoolClient): Promise<number> {
    const res = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM appointments WHERE salon_id = $1`,
      [salonId],
      client
    );
    return parseInt(res.rows[0]?.count || '0', 10);
  },
};
