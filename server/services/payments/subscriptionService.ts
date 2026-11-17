import { config } from '../../config.ts';
import { withTransaction, query } from '../../db/pool.ts';
import { auditLogRepository } from '../../repositories/auditLogRepository.ts';
import { salonRepository } from '../../repositories/salonRepository.ts';
import { subscriptionRepository, type DbSubscriptionPaymentAttempt, type SubscriptionPlanCode } from '../../repositories/subscriptionRepository.ts';

export class SubscriptionPaymentError extends Error {
  readonly code: string;
  readonly statusCode: number;
  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.name = 'SubscriptionPaymentError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

interface ZarinpalRequestPayload {
  merchant_id: string;
  amount: number;
  callback_url: string;
  description: string;
  metadata?: { mobile?: string };
}

interface ZarinpalResponse {
  data?: {
    code?: number;
    message?: string;
    authority?: string;
    ref_id?: number | string;
  };
  errors?: unknown;
}

export function zarinpalApiBaseUrl(sandbox = config.payments.zarinpalSandbox): string {
  return sandbox ? 'https://sandbox.zarinpal.com/pg/v4/payment' : 'https://api.zarinpal.com/pg/v4/payment';
}

export function zarinpalPaymentUrl(authority: string, sandbox = config.payments.zarinpalSandbox): string {
  const host = sandbox ? 'https://sandbox.zarinpal.com' : 'https://www.zarinpal.com';
  return host + '/pg/StartPay/' + encodeURIComponent(authority);
}

function parseZarinpalRequestResponse(payload: unknown): { authority: string; message: string | null } {
  const response = payload as ZarinpalResponse;
  const code = Number(response?.data?.code);
  const authority = typeof response?.data?.authority === 'string' ? response.data.authority.trim() : '';
  if (code !== 100 || !authority || authority.length > 64) {
    throw new SubscriptionPaymentError('GATEWAY_REQUEST_REJECTED', 'درگاه پرداخت نتوانست درخواست پرداخت را ایجاد کند.', 502);
  }
  return { authority, message: String(response?.data?.message || '').slice(0, 255) || null };
}

function parseZarinpalVerifyResponse(payload: unknown): { verified: boolean; reference: string | null; message: string | null; code: number } {
  const response = payload as ZarinpalResponse;
  const code = Number(response?.data?.code);
  const rawReference = response?.data?.ref_id;
  const reference = rawReference === undefined || rawReference === null ? null : String(rawReference).trim();
  return {
    verified: code === 100 || code === 101,
    reference: reference && reference.length <= 64 ? reference : null,
    message: String(response?.data?.message || '').slice(0, 255) || null,
    code: Number.isFinite(code) ? code : -1,
  };
}

async function postZarinpal(pathname: 'request.json' | 'verify.json', body: object): Promise<unknown> {
  if (!config.payments.zarinpalMerchantId) {
    throw new SubscriptionPaymentError('PAYMENT_GATEWAY_NOT_CONFIGURED', 'درگاه پرداخت زرین‌پال در سرور پیکربندی نشده است.', 503);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.payments.timeoutMs);
  try {
    const response = await fetch(zarinpalApiBaseUrl() + '/' + pathname, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new SubscriptionPaymentError('GATEWAY_INVALID_RESPONSE', 'پاسخ درگاه پرداخت معتبر نیست.', 502);
    }
    if (!response.ok) {
      throw new SubscriptionPaymentError('GATEWAY_HTTP_ERROR', 'ارتباط با درگاه پرداخت ناموفق بود.', 502);
    }
    return payload;
  } catch (err) {
    if (err instanceof SubscriptionPaymentError) throw err;
    throw new SubscriptionPaymentError(
      'GATEWAY_UNAVAILABLE',
      'در حال حاضر ارتباط با درگاه پرداخت برقرار نمی‌شود. وضعیت پرداخت تغییر نکرده است.',
      502
    );
  } finally {
    clearTimeout(timer);
  }
}

async function requestGatewayPayment(input: {
  amountRial: number;
  callbackUrl: string;
  description: string;
  mobile?: string;
}): Promise<{ authority: string; paymentUrl: string; message: string | null }> {
  const payload: ZarinpalRequestPayload = {
    merchant_id: config.payments.zarinpalMerchantId!,
    amount: input.amountRial,
    callback_url: input.callbackUrl,
    description: input.description.slice(0, 255),
    ...(input.mobile ? { metadata: { mobile: input.mobile } } : {}),
  };
  const response = parseZarinpalRequestResponse(await postZarinpal('request.json', payload));
  return {
    ...response,
    paymentUrl: zarinpalPaymentUrl(response.authority),
  };
}

async function verifyGatewayPayment(amountRial: number, authority: string) {
  const response = await postZarinpal('verify.json', {
    merchant_id: config.payments.zarinpalMerchantId!,
    amount: amountRial,
    authority,
  });
  return parseZarinpalVerifyResponse(response);
}

export interface StartSubscriptionCheckoutResult {
  attemptId: string;
  status: 'pending' | 'already_paid';
  paymentUrl?: string;
  reused: boolean;
}

export async function startSubscriptionCheckout(input: {
  salonId: string;
  userId: string;
  mobile?: string;
  planCode: SubscriptionPlanCode;
  idempotencyKey: string;
}): Promise<StartSubscriptionCheckoutResult> {
  if (!config.payments.isZarinpalConfigured) {
    throw new SubscriptionPaymentError(
      'PAYMENT_GATEWAY_NOT_CONFIGURED',
      'درگاه پرداخت زرین‌پال هنوز در تنظیمات سرور فعال نشده است.',
      503
    );
  }
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(input.idempotencyKey)) {
    throw new SubscriptionPaymentError('INVALID_IDEMPOTENCY_KEY', 'کلید یکتای پرداخت نامعتبر است.', 400);
  }

  const [salon, plan] = await Promise.all([
    salonRepository.findById(input.salonId),
    subscriptionRepository.findPlan(input.planCode),
  ]);
  if (!salon) throw new SubscriptionPaymentError('SALON_NOT_FOUND', 'سالن مورد نظر یافت نشد.', 404);
  if (!plan) throw new SubscriptionPaymentError('SUBSCRIPTION_PLAN_NOT_FOUND', 'پلن انتخابی فعال نیست.', 404);

  const amountToman = Number(plan.price_toman);
  const amountRial = amountToman * 10;
  if (!Number.isSafeInteger(amountToman) || amountToman <= 0 || !Number.isSafeInteger(amountRial)) {
    throw new SubscriptionPaymentError('INVALID_SUBSCRIPTION_AMOUNT', 'مبلغ پلن برای پرداخت معتبر نیست.', 500);
  }

  const created = await withTransaction((client) =>
    subscriptionRepository.createPaymentAttempt({
      salonId: input.salonId,
      userId: input.userId,
      planCode: plan.code,
      amountToman,
      idempotencyKey: input.idempotencyKey,
    }, client)
  );
  const attempt = created.attempt;

  if (!created.created) {
    if (attempt.status === 'paid') {
      return { attemptId: attempt.id, status: 'already_paid', reused: true };
    }
    if (attempt.status === 'pending' && attempt.authority) {
      return {
        attemptId: attempt.id,
        status: 'pending',
        paymentUrl: zarinpalPaymentUrl(attempt.authority),
        reused: true,
      };
    }
    throw new SubscriptionPaymentError(
      'IDEMPOTENCY_KEY_ALREADY_USED',
      'این درخواست پرداخت قبلاً استفاده شده است؛ یک بار دیگر تلاش کنید.',
      409
    );
  }

  const callbackUrl = new URL('/api/payments/zarinpal/callback', config.payments.publicBaseUrl!).toString();
  try {
    const gateway = await requestGatewayPayment({
      amountRial,
      callbackUrl,
      description: 'اشتراک ' + plan.offer + ' - ' + salon.name,
      mobile: input.mobile,
    });

    const updated = await withTransaction((client) =>
      subscriptionRepository.setPending(attempt.id, gateway.authority, gateway.message, client)
    );
    if (!updated) {
      throw new SubscriptionPaymentError(
        'PAYMENT_ATTEMPT_STATE_CONFLICT',
        'وضعیت درخواست پرداخت تغییر کرده است. با پشتیبانی تماس بگیرید.',
        409
      );
    }

    return {
      attemptId: attempt.id,
      status: 'pending',
      paymentUrl: gateway.paymentUrl,
      reused: false,
    };
  } catch (err) {
    const failureCode = err instanceof SubscriptionPaymentError ? err.code : 'GATEWAY_REQUEST_FAILED';
    await subscriptionRepository.setFailed(attempt.id, failureCode, null).catch(() => undefined);
    throw err;
  }
}

export interface ZarinpalCallbackResult {
  success: boolean;
  attemptId?: string;
  duplicate?: boolean;
  reason?: 'unknown_authority' | 'cancelled' | 'verification_failed' | 'pending';
}

export async function processZarinpalCallback(
  authority: string,
  gatewayStatus: string
): Promise<ZarinpalCallbackResult> {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(authority)) {
    return { success: false, reason: 'unknown_authority' };
  }
  const attempt = await subscriptionRepository.findByAuthority(authority);
  if (!attempt) return { success: false, reason: 'unknown_authority' };
  if (attempt.status === 'paid') return { success: true, attemptId: attempt.id, duplicate: true };

  if (gatewayStatus.toUpperCase() !== 'OK') {
    await withTransaction(async (client) => {
      const locked = await subscriptionRepository.lockById(attempt.id, client);
      if (locked && locked.status === 'pending') {
        await query(
          `UPDATE subscription_payment_attempts
           SET status = 'cancelled', failure_code = 'CUSTOMER_CANCELLED', updated_at = NOW()
           WHERE id = $1 AND status = 'pending'`,
          [attempt.id],
          client
        );
      }
    });
    return { success: false, attemptId: attempt.id, reason: 'cancelled' };
  }

  if (attempt.status !== 'pending') return { success: false, attemptId: attempt.id, reason: 'pending' };

  let verification: ReturnType<typeof parseZarinpalVerifyResponse>;
  try {
    verification = await verifyGatewayPayment(Number(attempt.amount_rial), authority);
  } catch {
    // Transient gateway/network failure leaves the attempt pending for safe retry.
    return { success: false, attemptId: attempt.id, reason: 'pending' };
  }

  if (!verification.verified || !verification.reference) {
    await subscriptionRepository.setFailed(
      attempt.id,
      'GATEWAY_VERIFY_' + verification.code,
      verification.message
    );
    return { success: false, attemptId: attempt.id, reason: 'verification_failed' };
  }

  return withTransaction(async (client) => {
    const locked = await subscriptionRepository.lockById(attempt.id, client);
    if (!locked) return { success: false, attemptId: attempt.id, reason: 'unknown_authority' };
    if (locked.status === 'paid') {
      return { success: true, attemptId: locked.id, duplicate: true };
    }
    if (locked.status !== 'pending') {
      return { success: false, attemptId: locked.id, reason: 'pending' };
    }

    const plan = await subscriptionRepository.findPlan(locked.plan_code, client);
    if (!plan) throw new Error('Subscription plan disappeared before payment settlement.');

    await query(
      `UPDATE salon_subscriptions
       SET status = 'superseded', updated_at = NOW()
       WHERE salon_id = $1 AND status = 'active'`,
      [locked.salon_id],
      client
    );

    const subscription = await query<{ id: string; ends_at: Date }>(
      `INSERT INTO salon_subscriptions (
         salon_id, plan_code, payment_attempt_id, status, price_toman,
         starts_at, ends_at, created_by_user_id
       )
       VALUES (
         $1, $2, $3, 'active', $4, NOW(),
         NOW() + ($5::int * INTERVAL '1 month'), $6
       )
       RETURNING id, ends_at`,
      [locked.salon_id, locked.plan_code, locked.id, Number(locked.amount_toman), plan.duration_months, locked.created_by_user_id],
      client
    );

    await query(
      'UPDATE salons SET plan = $1, plan_expiry = $2, updated_at = NOW() WHERE id = $3',
      [locked.plan_code, subscription.rows[0].ends_at, locked.salon_id],
      client
    );

    await subscriptionRepository.markPaid(locked.id, verification.reference, verification.message, client);

    await query(
      `INSERT INTO payment_records (
         salon_id, amount, currency, transaction_type, status, payment_method,
         reference_number, metadata, subscription_payment_attempt_id
       )
       VALUES ($1, $2, 'IRT', 'subscription', 'completed', 'zarinpal', $3, $4::jsonb, $5)
       ON CONFLICT (subscription_payment_attempt_id) DO NOTHING`,
      [
        locked.salon_id,
        Number(locked.amount_rial),
        verification.reference,
        JSON.stringify({ planCode: locked.plan_code, subscriptionId: subscription.rows[0].id }),
        locked.id,
      ],
      client
    );

    const actor = await query<{ full_name: string; platform_role: string }>(
      'SELECT full_name, platform_role FROM users WHERE id = $1 LIMIT 1',
      [locked.created_by_user_id],
      client
    );
    await auditLogRepository.create({
      actor: actor.rows[0]?.full_name || 'Salon user',
      actorRole: actor.rows[0]?.platform_role || 'salon_member',
      action: 'SUBSCRIPTION_PAYMENT_VERIFIED',
      target: 'subscription-payment:' + locked.id,
      ipAddress: '127.0.0.1',
      userAgent: 'Zarinpal callback',
      severity: 'info',
      category: 'financial',
      details: {
        salonId: locked.salon_id,
        planCode: locked.plan_code,
        amountToman: Number(locked.amount_toman),
        amountRial: Number(locked.amount_rial),
        gatewayReference: verification.reference,
        subscriptionId: subscription.rows[0].id,
      },
    }, client);

    return { success: true, attemptId: locked.id, duplicate: false };
  });
}

export async function getSalonSubscriptionSummary(salonId: string) {
  const [plans, currentSubscription, history, payments] = await Promise.all([
    subscriptionRepository.listActivePlans(),
    subscriptionRepository.currentSubscription(salonId),
    subscriptionRepository.listSubscriptionHistory(salonId, 10),
    subscriptionRepository.listPaymentAttempts(salonId, 10),
  ]);
  return {
    plans,
    currentSubscription,
    history,
    payments: payments.map((payment) => ({
      id: payment.id,
      planCode: payment.plan_code,
      amountToman: Number(payment.amount_toman),
      gateway: payment.gateway,
      status: payment.status,
      reference: payment.gateway_reference,
      createdAt: payment.created_at,
      verifiedAt: payment.verified_at,
    })),
    paymentEnabled: config.payments.isZarinpalConfigured,
  };
}
