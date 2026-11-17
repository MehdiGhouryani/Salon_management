import type { PoolClient } from 'pg';
import { query } from '../db/pool.ts';

export type SubscriptionPlanCode = 'bronze' | 'silver' | 'gold_vip';
export type SubscriptionPaymentStatus = 'creating' | 'pending' | 'paid' | 'failed' | 'cancelled';
export type SalonSubscriptionStatus = 'active' | 'expired' | 'superseded' | 'cancelled';

export interface DbSubscriptionPlan {
  code: SubscriptionPlanCode; title: string; offer: string;
  price_toman: string | number; duration_months: number; max_staff: number;
  sms_included: number; features: string; sort_order: number; is_active: boolean;
}
export interface DbSubscriptionPaymentAttempt {
  id: string; salon_id: string; created_by_user_id: string;
  plan_code: SubscriptionPlanCode; amount_toman: string | number; amount_rial: string | number;
  gateway: 'zarinpal'; status: SubscriptionPaymentStatus; idempotency_key: string;
  authority: string | null; gateway_reference: string | null; gateway_message: string | null;
  failure_code: string | null; created_at: Date; updated_at: Date; verified_at: Date | null;
}
export interface DbSalonSubscription {
  id: string; salon_id: string; plan_code: SubscriptionPlanCode; payment_attempt_id: string;
  status: SalonSubscriptionStatus; price_toman: string | number; starts_at: Date; ends_at: Date;
  created_by_user_id: string; created_at: Date; updated_at: Date;
  plan_title?: string; plan_offer?: string;
}

export const subscriptionRepository = {
  async listActivePlans(client?: PoolClient): Promise<DbSubscriptionPlan[]> {
    const result = await query<DbSubscriptionPlan>(
      'SELECT * FROM subscription_plans WHERE is_active = TRUE ORDER BY sort_order ASC', [], client
    );
    return result.rows;
  },
  async findPlan(code: string, client?: PoolClient): Promise<DbSubscriptionPlan | null> {
    const result = await query<DbSubscriptionPlan>(
      'SELECT * FROM subscription_plans WHERE code = $1 AND is_active = TRUE LIMIT 1', [code], client
    );
    return result.rows[0] || null;
  },
  async createPaymentAttempt(input: {
    salonId: string; userId: string; planCode: SubscriptionPlanCode;
    amountToman: number; idempotencyKey: string;
  }, client?: PoolClient): Promise<{ attempt: DbSubscriptionPaymentAttempt; created: boolean }> {
    const result = await query<DbSubscriptionPaymentAttempt>(
      `INSERT INTO subscription_payment_attempts (
         salon_id, created_by_user_id, plan_code, amount_toman, amount_rial,
         gateway, status, idempotency_key
       ) VALUES ($1, $2, $3, $4::bigint, $4::bigint * 10::bigint, 'zarinpal', 'creating', $5)
       ON CONFLICT (salon_id, idempotency_key) DO NOTHING RETURNING *`,
      [input.salonId, input.userId, input.planCode, input.amountToman, input.idempotencyKey], client
    );
    if (result.rows[0]) return { attempt: result.rows[0], created: true };
    const existing = await query<DbSubscriptionPaymentAttempt>(
      'SELECT * FROM subscription_payment_attempts WHERE salon_id = $1 AND idempotency_key = $2 LIMIT 1',
      [input.salonId, input.idempotencyKey], client
    );
    if (!existing.rows[0]) throw new Error('Idempotent payment attempt could not be recovered.');
    return { attempt: existing.rows[0], created: false };
  },
  async setPending(id: string, authority: string, gatewayMessage: string | null, client?: PoolClient) {
    const result = await query<DbSubscriptionPaymentAttempt>(
      `UPDATE subscription_payment_attempts
       SET status = 'pending', authority = $2, gateway_message = $3, updated_at = NOW()
       WHERE id = $1 AND status = 'creating' RETURNING *`,
      [id, authority, gatewayMessage], client
    );
    return result.rows[0] || null;
  },
  async setFailed(id: string, failureCode: string, gatewayMessage: string | null, client?: PoolClient): Promise<void> {
    await query(
      `UPDATE subscription_payment_attempts
       SET status = 'failed', failure_code = $2, gateway_message = $3, updated_at = NOW()
       WHERE id = $1 AND status IN ('creating', 'pending')`,
      [id, failureCode.slice(0, 64), gatewayMessage?.slice(0, 255) || null], client
    );
  },
  async findByAuthority(authority: string, client?: PoolClient): Promise<DbSubscriptionPaymentAttempt | null> {
    const result = await query<DbSubscriptionPaymentAttempt>(
      'SELECT * FROM subscription_payment_attempts WHERE gateway = $1 AND authority = $2 LIMIT 1',
      ['zarinpal', authority], client
    );
    return result.rows[0] || null;
  },
  async lockById(id: string, client: PoolClient): Promise<DbSubscriptionPaymentAttempt | null> {
    const result = await query<DbSubscriptionPaymentAttempt>(
      'SELECT * FROM subscription_payment_attempts WHERE id = $1 FOR UPDATE', [id], client
    );
    return result.rows[0] || null;
  },
  async markPaid(id: string, reference: string, gatewayMessage: string | null, client: PoolClient): Promise<void> {
    await query(
      `UPDATE subscription_payment_attempts
       SET status = 'paid', gateway_reference = $2, gateway_message = $3,
           failure_code = NULL, verified_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND status <> 'paid'`,
      [id, reference.slice(0, 64), gatewayMessage?.slice(0, 255) || null], client
    );
  },
  async currentSubscription(salonId: string, client?: PoolClient): Promise<DbSalonSubscription | null> {
    const result = await query<DbSalonSubscription>(
      `SELECT s.*, p.title AS plan_title, p.offer AS plan_offer
       FROM salon_subscriptions s JOIN subscription_plans p ON p.code = s.plan_code
       WHERE s.salon_id = $1 AND s.status = 'active'
       ORDER BY s.ends_at DESC LIMIT 1`, [salonId], client
    );
    return result.rows[0] || null;
  },
  async listSubscriptionHistory(salonId: string, limit = 10, client?: PoolClient): Promise<DbSalonSubscription[]> {
    const result = await query<DbSalonSubscription>(
      `SELECT s.*, p.title AS plan_title, p.offer AS plan_offer
       FROM salon_subscriptions s JOIN subscription_plans p ON p.code = s.plan_code
       WHERE s.salon_id = $1 ORDER BY s.created_at DESC LIMIT $2`,
      [salonId, Math.min(50, Math.max(1, limit))], client
    );
    return result.rows;
  },
  async listPaymentAttempts(salonId: string, limit = 10, client?: PoolClient): Promise<DbSubscriptionPaymentAttempt[]> {
    const result = await query<DbSubscriptionPaymentAttempt>(
      `SELECT id, salon_id, plan_code, amount_toman, amount_rial, gateway, status,
              idempotency_key, authority, gateway_reference, gateway_message, failure_code,
              created_at, updated_at, verified_at, created_by_user_id
       FROM subscription_payment_attempts WHERE salon_id = $1
       ORDER BY created_at DESC LIMIT $2`,
      [salonId, Math.min(50, Math.max(1, limit))], client
    );
    return result.rows;
  },
  async listRecentPayments(limit = 50, offset = 0, client?: PoolClient) {
    const result = await query<DbSubscriptionPaymentAttempt & { salon_name: string }>(
      `SELECT p.*, s.name AS salon_name FROM subscription_payment_attempts p
       JOIN salons s ON s.id = p.salon_id ORDER BY p.created_at DESC
       LIMIT $1 OFFSET $2`,
      [Math.min(100, Math.max(1, limit)), Math.max(0, offset)], client
    );
    return result.rows;
  },
  async getAdminOverview(limit = 20, offset = 0) {
    const [plans, metrics, payments, total] = await Promise.all([
      query<DbSubscriptionPlan & { active_subscribers: number; mrr_toman: string | number }>(
        `SELECT
           p.*,
           COUNT(s.id) FILTER (
             WHERE s.status = 'active' AND s.ends_at > NOW()
           )::int AS active_subscribers,
           COALESCE(
             SUM(ROUND(s.price_toman::numeric / p.duration_months)) FILTER (
               WHERE s.status = 'active' AND s.ends_at > NOW()
             ),
             0
           )::bigint AS mrr_toman
         FROM subscription_plans p
         LEFT JOIN salon_subscriptions s ON s.plan_code = p.code
         WHERE p.is_active = TRUE
         GROUP BY p.code
         ORDER BY p.sort_order ASC`,
        []
      ),
      query<{
        active_subscriptions: string;
        pending_payments: string;
        failed_payments: string;
        total_attempts: string;
        revenue_mtd_toman: string;
        active_mrr_toman: string;
      }>(
        `SELECT
           (SELECT COUNT(*)::text FROM salon_subscriptions
             WHERE status = 'active' AND ends_at > NOW()) AS active_subscriptions,
           COUNT(*) FILTER (WHERE status IN ('creating', 'pending'))::text AS pending_payments,
           COUNT(*) FILTER (WHERE status = 'failed')::text AS failed_payments,
           COUNT(*)::text AS total_attempts,
           COALESCE(SUM(amount_toman) FILTER (
             WHERE status = 'paid' AND verified_at >= date_trunc('month', NOW())
           ), 0)::text AS revenue_mtd_toman,
           (SELECT COALESCE(SUM(ROUND(s.price_toman::numeric / p.duration_months)), 0)::text
            FROM salon_subscriptions s
            JOIN subscription_plans p ON p.code = s.plan_code
            WHERE s.status = 'active' AND s.ends_at > NOW()) AS active_mrr_toman
         FROM subscription_payment_attempts`,
        []
      ),
      query<{
        id: string;
        salon_id: string;
        salon_name: string;
        plan_code: SubscriptionPlanCode;
        plan_title: string;
        amount_toman: string | number;
        gateway: string;
        status: SubscriptionPaymentStatus;
        gateway_reference: string | null;
        created_at: Date;
        verified_at: Date | null;
      }>(
        `SELECT
           a.id, a.salon_id, s.name AS salon_name, a.plan_code,
           p.title AS plan_title, a.amount_toman, a.gateway, a.status,
           a.gateway_reference, a.created_at, a.verified_at
         FROM subscription_payment_attempts a
         JOIN salons s ON s.id = a.salon_id
         JOIN subscription_plans p ON p.code = a.plan_code
         ORDER BY a.created_at DESC
         LIMIT $1 OFFSET $2`,
        [Math.min(100, Math.max(1, limit)), Math.max(0, offset)]
      ),
      query<{ count: string }>('SELECT COUNT(*)::text AS count FROM subscription_payment_attempts', []),
    ]);

    const summary = metrics.rows[0];
    return {
      plans: plans.rows.map((plan) => ({
        code: plan.code,
        title: plan.title,
        offer: plan.offer,
        priceToman: Number(plan.price_toman),
        durationMonths: Number(plan.duration_months),
        monthlyPriceToman: Math.round(Number(plan.price_toman) / Number(plan.duration_months)),
        maxStaff: Number(plan.max_staff),
        smsIncluded: Number(plan.sms_included),
        features: plan.features,
        activeSubscribers: Number(plan.active_subscribers || 0),
        mrrToman: Number(plan.mrr_toman || 0),
      })),
      summary: {
        activeSubscriptions: Number(summary?.active_subscriptions || 0),
        pendingPayments: Number(summary?.pending_payments || 0),
        failedPayments: Number(summary?.failed_payments || 0),
        totalAttempts: Number(summary?.total_attempts || 0),
        revenueMtdToman: Number(summary?.revenue_mtd_toman || 0),
        mrrToman: Number(summary?.active_mrr_toman || 0),
      },
      transactions: payments.rows.map((payment) => ({
        id: payment.id,
        salonId: payment.salon_id,
        salonName: payment.salon_name,
        planCode: payment.plan_code,
        planName: payment.plan_title,
        amountToman: Number(payment.amount_toman),
        gateway: payment.gateway,
        status: payment.status,
        reference: payment.gateway_reference,
        createdAt: payment.created_at,
        verifiedAt: payment.verified_at,
      })),
      totalPayments: Number.parseInt(total.rows[0]?.count || '0', 10),
    };
  },
  async countPaymentAttempts(client?: PoolClient): Promise<number> {
    const result = await query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM subscription_payment_attempts', [], client
    );
    return Number.parseInt(result.rows[0]?.count || '0', 10);
  },
};
