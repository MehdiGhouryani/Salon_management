import type { PoolClient } from 'pg';
import { query } from '../db/pool.ts';

export type TransactionType = 'in_person_service' | 'subscription' | 'sms_topup' | 'refund';
export type PaymentRecordStatus = 'completed' | 'pending' | 'failed' | 'refunded';
export type PaymentMethod = 'cash' | 'pos_terminal' | 'card_to_card' | 'zarinpal' | 'saman' | 'mellat';

export interface DbPaymentRecord {
  id: string;
  salon_id: string;
  appointment_id: string | null;
  client_id: string | null;
  amount: string | number;
  currency: string;
  transaction_type: TransactionType;
  status: PaymentRecordStatus;
  payment_method: PaymentMethod;
  reference_number: string | null;
  metadata: any | null;
  created_at: Date;
}

export interface CreatePaymentRecordDto {
  salonId: string;
  appointmentId?: string | null;
  clientId?: string | null;
  amount: number;
  currency?: string;
  transactionType: TransactionType;
  status?: PaymentRecordStatus;
  paymentMethod: PaymentMethod;
  referenceNumber?: string | null;
  metadata?: any | null;
}

export const paymentRecordRepository = {
  async findById(id: string, client?: PoolClient): Promise<DbPaymentRecord | null> {
    const res = await query<DbPaymentRecord>(
      `SELECT * FROM payment_records WHERE id = $1 LIMIT 1`,
      [id],
      client
    );
    return res.rows[0] || null;
  },

  async findBySalonId(
    salonId: string,
    limit: number = 50,
    offset: number = 0,
    client?: PoolClient
  ): Promise<DbPaymentRecord[]> {
    const res = await query<DbPaymentRecord>(
      `SELECT * FROM payment_records WHERE salon_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [salonId, limit, offset],
      client
    );
    return res.rows;
  },

  async create(dto: CreatePaymentRecordDto, client?: PoolClient): Promise<DbPaymentRecord> {
    const res = await query<DbPaymentRecord>(
      `INSERT INTO payment_records (
        salon_id, appointment_id, client_id, amount, currency,
        transaction_type, status, payment_method, reference_number, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        dto.salonId,
        dto.appointmentId || null,
        dto.clientId || null,
        dto.amount,
        dto.currency || 'IRT',
        dto.transactionType,
        dto.status || 'completed',
        dto.paymentMethod,
        dto.referenceNumber || null,
        dto.metadata ? JSON.stringify(dto.metadata) : null,
      ],
      client
    );
    return res.rows[0];
  },

  async calculateSalonRevenue(salonId: string, client?: PoolClient): Promise<number> {
    const res = await query<{ sum: string }>(
      `SELECT COALESCE(SUM(amount), 0) as sum
       FROM payment_records
       WHERE salon_id = $1 AND status = 'completed' AND transaction_type = 'in_person_service'`,
      [salonId],
      client
    );
    return parseInt(res.rows[0]?.sum || '0', 10);
  },
};
