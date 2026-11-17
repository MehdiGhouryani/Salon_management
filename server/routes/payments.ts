import express from 'express';
import { config } from '../config.ts';
import { processZarinpalCallback } from '../services/payments/subscriptionService.ts';

export const paymentsRouter = express.Router();

function redirectToConfiguredReturn(
  res: express.Response,
  status: 'success' | 'cancelled' | 'failed' | 'pending',
  attemptId?: string
): void {
  const returnUrl = config.payments.returnUrl || config.payments.publicBaseUrl;
  if (!returnUrl) {
    res.status(503).json({ error: 'PAYMENT_RETURN_URL_NOT_CONFIGURED' });
    return;
  }

  const target = new URL(returnUrl);
  target.searchParams.set('subscription_payment', status);
  if (attemptId) target.searchParams.set('payment_attempt', attemptId);
  res.redirect(303, target.toString());
}

/**
 * Zarinpal returns the browser here. The callback is only a signal:
 * the amount and authority are re-verified against Zarinpal before a
 * subscription is activated.
 */
paymentsRouter.get('/zarinpal/callback', async (req, res): Promise<void> => {
  const authority = String(req.query.Authority || '');
  const status = String(req.query.Status || '');

  if (!authority || authority.length > 64) {
    redirectToConfiguredReturn(res, 'failed');
    return;
  }

  try {
    const result = await processZarinpalCallback(authority, status);
    const returnStatus = result.success
      ? 'success'
      : result.reason === 'cancelled'
        ? 'cancelled'
        : result.reason === 'pending'
          ? 'pending'
          : 'failed';
    redirectToConfiguredReturn(res, returnStatus, result.attemptId);
  } catch {
    // Do not expose provider/database internals to the browser. A transient
    // failure leaves the payment attempt pending and can be reconciled safely.
    const target = config.payments.returnUrl || config.payments.publicBaseUrl;
    if (target) {
      const url = new URL(target);
      url.searchParams.set('subscription_payment', 'pending');
      res.redirect(303, url.toString());
      return;
    }
    res.status(503).json({ error: 'PAYMENT_RETURN_URL_NOT_CONFIGURED' });
  }
});
