import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findByAuthority: vi.fn(),
  lockById: vi.fn(),
  findPlan: vi.fn(),
  setFailed: vi.fn(),
  markPaid: vi.fn(),
  auditCreate: vi.fn(),
  withTransaction: vi.fn(),
  query: vi.fn(),
}));

vi.mock('../../server/config.ts', () => ({
  config: {
    payments: {
      zarinpalMerchantId: '00000000-0000-4000-8000-000000000000',
      zarinpalSandbox: true,
      timeoutMs: 5000,
      isZarinpalConfigured: true,
      publicBaseUrl: 'https://api.example.test',
      returnUrl: 'https://app.example.test/billing',
    },
  },
}));

vi.mock('../../server/db/pool.ts', () => ({
  withTransaction: mocks.withTransaction,
  query: mocks.query,
}));

vi.mock('../../server/repositories/subscriptionRepository.ts', () => ({
  subscriptionRepository: {
    findByAuthority: mocks.findByAuthority,
    lockById: mocks.lockById,
    findPlan: mocks.findPlan,
    setFailed: mocks.setFailed,
    markPaid: mocks.markPaid,
  },
}));

vi.mock('../../server/repositories/auditLogRepository.ts', () => ({
  auditLogRepository: { create: mocks.auditCreate },
}));

vi.mock('../../server/repositories/salonRepository.ts', () => ({
  salonRepository: { findById: vi.fn() },
}));

import { processZarinpalCallback } from '../../server/services/payments/subscriptionService.ts';

const attempt = {
  id: 'attempt-1',
  salon_id: 'salon-1',
  created_by_user_id: 'user-1',
  plan_code: 'bronze',
  amount_toman: '890000',
  amount_rial: '8900000',
  gateway: 'zarinpal',
  status: 'pending',
  idempotency_key: 'test-payment-key-0001',
  authority: 'A000000000000000000000000000000000',
  gateway_reference: null,
  gateway_message: null,
  failure_code: null,
  created_at: new Date(),
  updated_at: new Date(),
  verified_at: null,
};

describe('Zarinpal callback trust boundary', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findByAuthority.mockResolvedValue({ ...attempt });
    mocks.lockById.mockResolvedValue({ ...attempt });
    mocks.findPlan.mockResolvedValue({ code: 'bronze', duration_months: 1 });
    mocks.withTransaction.mockImplementation(async (callback: (client: object) => Promise<unknown>) =>
      callback({})
    );
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes('INSERT INTO salon_subscriptions')) {
        return { rows: [{ id: 'subscription-1', ends_at: new Date('2027-12-01T00:00:00.000Z') }] };
      }
      if (sql.includes('SELECT full_name, platform_role')) {
        return { rows: [{ full_name: 'Test Owner', platform_role: 'salon_owner' }] };
      }
      return { rows: [], rowCount: 1 };
    });
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { code: 100, ref_id: 123456789, message: 'Verified' } }),
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('verifies an NOK browser callback with Zarinpal before settling a payment', async () => {
    const result = await processZarinpalCallback(attempt.authority, 'NOK');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/verify.json');
    expect(JSON.parse(String(fetchMock.mock.calls[0][1].body))).toMatchObject({
      authority: attempt.authority,
      amount: 8900000,
    });
    expect(result).toMatchObject({ success: true, attemptId: attempt.id, duplicate: false });
    expect(mocks.markPaid).toHaveBeenCalledTimes(1);
    expect(mocks.setFailed).not.toHaveBeenCalled();
    expect(mocks.query.mock.calls.some(([sql]) => String(sql).includes("status = 'cancelled'"))).toBe(false);
  });

  it('marks a non-verified NOK callback failed only after the provider verification response', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { code: -51, message: 'Not paid' } }),
    });

    const result = await processZarinpalCallback(attempt.authority, 'NOK');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mocks.setFailed).toHaveBeenCalledWith(
      attempt.id,
      'GATEWAY_VERIFY_-51',
      'Not paid'
    );
    expect(result).toMatchObject({ success: false, attemptId: attempt.id, reason: 'cancelled' });
    expect(mocks.query).not.toHaveBeenCalled();
  });
});
