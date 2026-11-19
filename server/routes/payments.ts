import express from 'express';
import { config } from '../config.ts';
import { processZarinpalCallback } from '../services/payments/subscriptionService.ts';
import { getIntegrationRuntime, type ZarinpalIntegrationSettings } from '../services/integrations/integrationSettingsService.ts';

export const paymentsRouter = express.Router();

async function redirectToConfiguredReturn(
  res: express.Response,
  status: 'success' | 'cancelled' | 'failed' | 'pending',
  attemptId?: string
): Promise<void> {
  let returnUrl = config.payments.returnUrl || config.payments.publicBaseUrl;
  try {
    const integration = await getIntegrationRuntime<ZarinpalIntegrationSettings>('zarinpal');
    returnUrl = integration.settings.returnUrl || integration.settings.publicBaseUrl || returnUrl;
  } catch {
    // Keep the environment URL as a safe fallback if stored settings are unavailable.
  }
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
    await redirectToConfiguredReturn(res, 'failed');
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
    await redirectToConfiguredReturn(res, returnStatus, result.attemptId);
  } catch {
    // Do not expose provider/database internals to the browser. A transient
    // failure leaves the payment attempt pending and can be reconciled safely.
    await redirectToConfiguredReturn(res, 'pending');
  }
});
