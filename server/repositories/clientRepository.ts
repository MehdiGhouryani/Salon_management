import type { PoolClient } from 'pg';
import { query } from '../db/pool.ts';

export interface DbClient {
  id: string;
  phone: string;
  full_name: string;
  email: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface DbSalonClient {
  id: string;
  salon_id: string;
  client_id: string;
  total_bookings: number;
  total_spent: string | number;
  last_visit_at: Date | null;
  notes: string | null;
  tags: string[];
  created_at: Date;
  updated_at: Date;
}

export interface CreateClientDto {
  phone: string;
  fullName: string;
  email?: string | null;
  notes?: string | null;
}

export const clientRepository = {
  async findById(id: string, client?: PoolClient): Promise<DbClient | null> {
    const res = await query<DbClient>(
      `SELECT * FROM clients WHERE id = $1 LIMIT 1`,
      [id],
      client
    );
    return res.rows[0] || null;
  },

  async findByPhone(phone: string, client?: PoolClient): Promise<DbClient | null> {
    const res = await query<DbClient>(
      `SELECT * FROM clients WHERE phone = $1 LIMIT 1`,
      [phone],
      client
    );
    return res.rows[0] || null;
  },

  async createOrUpdate(dto: CreateClientDto, client?: PoolClient): Promise<DbClient> {
    const res = await query<DbClient>(
      `INSERT INTO clients (phone, full_name, email, notes)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (phone) DO UPDATE
       SET full_name = EXCLUDED.full_name,
           email = COALESCE(EXCLUDED.email, clients.email),
           notes = COALESCE(EXCLUDED.notes, clients.notes),
           updated_at = NOW()
       RETURNING *`,
      [dto.phone, dto.fullName, dto.email || null, dto.notes || null],
      client
    );
    return res.rows[0];
  },

  async getSalonClient(
    salonId: string,
    clientId: string,
    client?: PoolClient
  ): Promise<DbSalonClient | null> {
    const res = await query<DbSalonClient>(
      `SELECT * FROM salon_clients WHERE salon_id = $1 AND client_id = $2 LIMIT 1`,
      [salonId, clientId],
      client
    );
    return res.rows[0] || null;
  },

  async recordBookingVisit(
    salonId: string,
    clientId: string,
    amountSpent: number,
    client?: PoolClient
  ): Promise<void> {
    await query(
      `INSERT INTO salon_clients (salon_id, client_id, total_bookings, total_spent, last_visit_at)
       VALUES ($1, $2, 1, $3, NOW())
       ON CONFLICT (salon_id, client_id) DO UPDATE
       SET total_bookings = salon_clients.total_bookings + 1,
           total_spent = salon_clients.total_spent + EXCLUDED.total_spent,
           last_visit_at = NOW(),
           updated_at = NOW()`,
      [salonId, clientId, amountSpent],
      client
    );
  },

  async findBySalonId(
    salonId: string,
    limit: number = 50,
    offset: number = 0,
    client?: PoolClient
  ): Promise<Array<DbClient & { total_bookings: number; total_spent: string | number; last_visit_at: Date | null }>> {
    const res = await query(
      `SELECT c.*, sc.total_bookings, sc.total_spent, sc.last_visit_at
       FROM clients c
       JOIN salon_clients sc ON c.id = sc.client_id
       WHERE sc.salon_id = $1
       ORDER BY sc.last_visit_at DESC NULLS LAST, sc.total_bookings DESC
       LIMIT $2 OFFSET $3`,
      [salonId, limit, offset],
      client
    );
    return res.rows;
  },
};
