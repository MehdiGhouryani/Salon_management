/**
 * Real PostgreSQL tests for the SaaS subscription payment ledger.
 * The provider is not called: this suite exercises the server-side settlement
 * transaction with a verified reference, including duplicate callback safety.
 */
import { randomInt, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DB_TESTS_ENABLED, initDatabaseUnderTest, type DbUnderTest } from './_setup.ts';

let db: DbUnderTest;
let testUserId = '';
let attemptId = '';
let userRepository: typeof import('../../server/repositories/userRepository.ts')['userRepository'];
let subscriptionRepository: typeof import('../../server/repositories/subscriptionRepository.ts')['subscriptionRepository'];
let settleVerifiedSubscriptionPayment: typeof import('../../server/services/payments/subscriptionService.ts')['settleVerifiedSubscriptionPayment'];
let getAdminOverview: typeof import('../../server/repositories/subscriptionRepository.ts')['subscriptionRepository']['getAdminOverview'];

describe.skipIf(!DB_TESTS_ENABLED)('PostgreSQL subscription payment idempotency and settlement', () => {
  beforeAll(async () => {
    db = await initDatabaseUnderTest();
    const [users, subscriptions, service] = await Promise.all([
      import('../../server/repositories/userRepository.ts'),
      import('../../server/repositories/subscriptionRepository.ts'),
      import('../../server/services/payments/subscriptionService.ts'),
    ]);
    userRepository = users.userRepository;
    subscriptionRepository = subscriptions.subscriptionRepository;
    getAdminOverview = subscriptions.subscriptionRepository.getAdminOverview;
    settleVerifiedSubscriptionPayment = service.settleVerifiedSubscriptionPayment;

    const phone = '093700' + String(randomInt(0, 100000)).padStart(5, '0');
    const user = await userRepository.create({
      phone,
      fullName: 'کاربر آزمایش پرداخت اشتراک',
      platformRole: 'user',
      status: 'active',
    });
    testUserId = user.id;
  }, 120_000);

  afterAll(async () => {
    if (db?.raw) {
      if (attemptId) {
        await db.raw.query('DELETE FROM audit_logs WHERE target = $1', ['subscription-payment:' + attemptId]);
        await db.raw.query('DELETE FROM payment_records WHERE subscription_payment_attempt_id = $1', [attemptId]);
        await db.raw.query('DELETE FROM salon_subscriptions WHERE payment_attempt_id = $1', [attemptId]);
        await db.raw.query('DELETE FROM subscription_payment_attempts WHERE id = $1', [attemptId]);
      }
      if (testUserId) await db.raw.query('DELETE FROM users WHERE id = $1', [testUserId]);
      await db.raw.end();
    }
  });

  it('creates a single idempotent attempt and activates exactly one subscription on repeated settlement', async () => {
    const plans = await subscriptionRepository.listActivePlans();
    const bronze = plans.find((plan) => plan.code === 'bronze');
    expect(bronze).toBeTruthy();
    expect(Number(bronze?.price_toman)).toBe(890000);

    const idempotencyKey = 'db-billing-' + randomUUID();
    const input = {
      salonId: db.fixtures.salonId,
      userId: testUserId,
      planCode: 'bronze' as const,
      amountToman: 890000,
      idempotencyKey,
    };

    const first = await db.withTransaction((client) =>
      subscriptionRepository.createPaymentAttempt(input, client)
    );
    expect(first.created).toBe(true);
    attemptId = first.attempt.id;
    expect(Number(first.attempt.amount_rial)).toBe(8900000);
    expect(first.attempt.status).toBe('creating');

    const duplicateRequest = await db.withTransaction((client) =>
      subscriptionRepository.createPaymentAttempt(input, client)
    );
    expect(duplicateRequest.created).toBe(false);
    expect(duplicateRequest.attempt.id).toBe(attemptId);

    const authority = 'T3PAY' + randomUUID().replaceAll('-', '').slice(0, 30);
    const pending = await subscriptionRepository.setPending(attemptId, authority, 'request accepted');
    expect(pending?.status).toBe('pending');
    expect((await subscriptionRepository.findByAuthority(authority))?.id).toBe(attemptId);

    const reference = 'T3REF' + randomUUID().replaceAll('-', '').slice(0, 24);
    // Simulate two duplicate provider callbacks racing at the same time.
    // The SELECT ... FOR UPDATE lock must let only one request create the
    // subscription and ledger row; the other must observe status=paid.
    const settlements = await Promise.all([
      settleVerifiedSubscriptionPayment(attemptId, reference, 'first callback'),
      settleVerifiedSubscriptionPayment(attemptId, reference, 'concurrent duplicate callback'),
    ]);
    expect(settlements.filter((result) => result.success && !result.duplicate)).toHaveLength(1);
    expect(settlements.filter((result) => result.success && result.duplicate)).toHaveLength(1);

    const payment = await db.raw.query(
      'SELECT status, gateway_reference FROM subscription_payment_attempts WHERE id = $1',
      [attemptId]
    );
    expect(payment.rows[0]).toMatchObject({ status: 'paid', gateway_reference: reference });

    const subscriptions = await db.raw.query(
      'SELECT id, status, plan_code, payment_attempt_id FROM salon_subscriptions WHERE payment_attempt_id = $1',
      [attemptId]
    );
    expect(subscriptions.rows).toHaveLength(1);
    expect(subscriptions.rows[0]).toMatchObject({ status: 'active', plan_code: 'bronze', payment_attempt_id: attemptId });

    const ledger = await db.raw.query(
      'SELECT amount, currency, transaction_type, status FROM payment_records WHERE subscription_payment_attempt_id = $1',
      [attemptId]
    );
    expect(ledger.rows).toHaveLength(1);
    expect(ledger.rows[0]).toMatchObject({
      amount: '890000',
      currency: 'IRT',
      transaction_type: 'subscription',
      status: 'completed',
    });

    const salon = await db.raw.query('SELECT plan, plan_expiry FROM salons WHERE id = $1', [db.fixtures.salonId]);
    expect(salon.rows[0].plan).toBe('bronze');
    expect(new Date(salon.rows[0].plan_expiry).getTime()).toBeGreaterThan(Date.now());

    const adminOverview = await getAdminOverview(20, 0);
    expect(adminOverview.summary.activeSubscriptions).toBeGreaterThanOrEqual(1);
    expect(adminOverview.summary.mrrToman).toBeGreaterThanOrEqual(890000);
    expect(adminOverview.summary.revenueMtdToman).toBeGreaterThanOrEqual(890000);
    expect(adminOverview.plans.find((plan) => plan.code === 'bronze')?.activeSubscribers).toBeGreaterThanOrEqual(1);
    expect(adminOverview.transactions.some((tx) => tx.id === attemptId && tx.status === 'paid')).toBe(true);
  });
});
