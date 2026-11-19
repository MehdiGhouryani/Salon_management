import type { PoolClient } from 'pg';
import { config } from '../../config.ts';
import { isDatabaseConfigured, query } from '../../db/pool.ts';
import { integrationSettingsRepository, type DbPlatformIntegration } from '../../repositories/integrationSettingsRepository.ts';
import { decryptIntegrationConfig, encryptIntegrationConfig } from './secretCrypto.ts';

export type IntegrationKey = 'kavenegar' | 'zarinpal';
type IntegrationConfig = Record<string, string | boolean | undefined>;

export interface KavenegarIntegrationSettings extends IntegrationConfig {
  apiKey?: string;
  template?: string;
}

export interface ZarinpalIntegrationSettings extends IntegrationConfig {
  merchantId?: string;
  sandbox?: boolean;
  publicBaseUrl?: string;
  returnUrl?: string;
}

export class IntegrationSettingsError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.name = 'IntegrationSettingsError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export interface IntegrationRuntime<T extends IntegrationConfig = IntegrationConfig> {
  key: IntegrationKey;
  enabled: boolean;
  configured: boolean;
  source: 'database' | 'environment' | 'not_configured';
  settings: T;
  updatedAt: Date | null;
}

export interface IntegrationStatus {
  key: IntegrationKey;
  title: string;
  description: string;
  enabled: boolean;
  configured: boolean;
  source: IntegrationRuntime['source'];
  updatedAt: Date | null;
  fields: Record<string, boolean>;
  mode?: 'sandbox' | 'live';
}

const INTEGRATIONS: Record<IntegrationKey, { title: string; description: string }> = {
  kavenegar: {
    title: 'کاوه‌نگار',
    description: 'ارسال پیامک ورود و کد تأیید مشتریان',
  },
  zarinpal: {
    title: 'زرین‌پال',
    description: 'پرداخت آنلاین اشتراک سالن‌ها',
  },
};

function envSettings(key: IntegrationKey): IntegrationConfig {
  if (key === 'kavenegar') {
    return { apiKey: config.auth.kavenegarApiKey, template: config.sms.template };
  }
  return {
    merchantId: config.payments.zarinpalMerchantId,
    sandbox: config.payments.zarinpalSandbox,
    publicBaseUrl: config.payments.publicBaseUrl,
    returnUrl: config.payments.returnUrl,
  };
}

function isConfigured(key: IntegrationKey, settings: IntegrationConfig): boolean {
  if (key === 'kavenegar') {
    return typeof settings.apiKey === 'string' && settings.apiKey.length > 10;
  }
  return (
    typeof settings.merchantId === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(settings.merchantId) &&
    typeof settings.publicBaseUrl === 'string' &&
    Boolean(settings.publicBaseUrl) &&
    typeof settings.returnUrl === 'string' &&
    Boolean(settings.returnUrl)
  );
}

function hasEnvironmentConfig(key: IntegrationKey): boolean {
  return isConfigured(key, envSettings(key));
}

async function findStored(key: IntegrationKey, client?: PoolClient): Promise<DbPlatformIntegration | null> {
  if (!isDatabaseConfigured()) return null;
  return integrationSettingsRepository.findByKey(key, client);
}

async function getState(key: IntegrationKey, client?: PoolClient): Promise<IntegrationRuntime> {
  const row = await findStored(key, client);
  const saved = row ? decryptIntegrationConfig(row.encrypted_config) as IntegrationConfig : {};
  const settings = { ...envSettings(key), ...saved };
  const configured = isConfigured(key, settings);
  const forcedOff = key === 'kavenegar' && config.sms.provider === 'null';
  const enabled = !forcedOff && (row ? row.is_enabled && configured : configured);
  const source: IntegrationRuntime['source'] = row
    ? 'database'
    : hasEnvironmentConfig(key)
      ? 'environment'
      : 'not_configured';

  return {
    key,
    enabled,
    configured,
    source,
    settings,
    updatedAt: row?.updated_at || null,
  };
}

/** Server-only resolver. Never return this object from an HTTP route. */
export async function getIntegrationRuntime<T extends IntegrationConfig = IntegrationConfig>(
  key: IntegrationKey
): Promise<IntegrationRuntime<T>> {
  return await getState(key) as IntegrationRuntime<T>;
}

/** Safe status DTO for the admin browser — no secret values or ciphertext. */
export async function getIntegrationStatuses(): Promise<IntegrationStatus[]> {
  const keys: IntegrationKey[] = ['kavenegar', 'zarinpal'];
  return Promise.all(keys.map(async (key) => {
    const state = await getState(key);
    const fields = key === 'kavenegar'
      ? { apiKey: Boolean(state.settings.apiKey), template: Boolean(state.settings.template) }
      : {
          merchantId: Boolean(state.settings.merchantId),
          publicBaseUrl: Boolean(state.settings.publicBaseUrl),
          returnUrl: Boolean(state.settings.returnUrl),
        };
    return {
      key,
      ...INTEGRATIONS[key],
      enabled: state.enabled,
      configured: state.configured,
      source: state.source,
      updatedAt: state.updatedAt,
      fields,
      ...(key === 'zarinpal' ? { mode: state.settings.sandbox ? 'sandbox' as const : 'live' as const } : {}),
    };
  }));
}

function readString(input: Record<string, unknown>, field: string, current: IntegrationConfig): string | undefined {
  if (!Object.prototype.hasOwnProperty.call(input, field)) return current[field] as string | undefined;
  if (typeof input[field] !== 'string') {
    throw new IntegrationSettingsError('INVALID_INTEGRATION_FIELD', `مقدار ${field} معتبر نیست.`);
  }
  const value = String(input[field]).trim();
  // Empty inputs mean "keep the existing value"; raw saved credentials never need to be sent back to the browser.
  return value || current[field] as string | undefined;
}

function cleanUrl(value: string, label: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new IntegrationSettingsError('INVALID_INTEGRATION_URL', `${label} باید یک آدرس کامل HTTP یا HTTPS باشد.`);
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new IntegrationSettingsError('INVALID_INTEGRATION_URL', `${label} باید آدرس معتبر و بدون نام کاربری، رمز، query یا fragment باشد.`);
  }
  if (config.isProduction && url.protocol !== 'https:') {
    throw new IntegrationSettingsError('HTTPS_REQUIRED', `در محیط عملیاتی، ${label} باید با HTTPS شروع شود.`);
  }
  return url.toString().replace(/\/$/, '');
}

export async function saveIntegrationSettings(
  key: IntegrationKey,
  input: unknown,
  updatedBy: string,
  client?: PoolClient
): Promise<IntegrationStatus> {
  if (!isDatabaseConfigured()) {
    throw new IntegrationSettingsError('INTEGRATION_DATABASE_UNAVAILABLE', 'برای ذخیره امن تنظیمات، اتصال پایگاه‌داده لازم است.', 503);
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new IntegrationSettingsError('INVALID_INTEGRATION_SETTINGS', 'ساختار تنظیمات ارسالی معتبر نیست.');
  }

  const body = input as Record<string, unknown>;
  if (body.enabled !== undefined && typeof body.enabled !== 'boolean') {
    throw new IntegrationSettingsError('INVALID_INTEGRATION_STATE', 'وضعیت اتصال باید روشن یا خاموش باشد.');
  }

  const existing = await getState(key, client);
  const settings: IntegrationConfig = { ...existing.settings };

  if (key === 'kavenegar') {
    const apiKey = readString(body, 'apiKey', settings);
    const template = readString(body, 'template', settings);
    if (apiKey && (apiKey.length < 11 || apiKey.length > 512)) {
      throw new IntegrationSettingsError('INVALID_KAVENEGAR_KEY', 'کلید کاوه‌نگار باید بین ۱۱ تا ۵۱۲ نویسه باشد.');
    }
    if (template && template.length > 100) {
      throw new IntegrationSettingsError('INVALID_SMS_TEMPLATE', 'نام الگوی پیامک نمی‌تواند بیشتر از ۱۰۰ نویسه باشد.');
    }
    settings.apiKey = apiKey;
    settings.template = template || 'nobatara-otp';
  } else {
    const merchantId = readString(body, 'merchantId', settings);
    const publicBaseUrl = readString(body, 'publicBaseUrl', settings);
    const returnUrl = readString(body, 'returnUrl', settings);
    if (merchantId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(merchantId)) {
      throw new IntegrationSettingsError('INVALID_ZARINPAL_MERCHANT_ID', 'مرچنت‌کد زرین‌پال باید یک UUID معتبر باشد.');
    }
    if (publicBaseUrl) settings.publicBaseUrl = cleanUrl(publicBaseUrl, 'آدرس عمومی API');
    if (returnUrl) settings.returnUrl = cleanUrl(returnUrl, 'آدرس بازگشت پرداخت');
    settings.merchantId = merchantId;
    if (Object.prototype.hasOwnProperty.call(body, 'sandbox')) {
      if (typeof body.sandbox !== 'boolean') {
        throw new IntegrationSettingsError('INVALID_ZARINPAL_MODE', 'حالت آزمایشی باید روشن یا خاموش باشد.');
      }
      if (config.isProduction && body.sandbox) {
        throw new IntegrationSettingsError('LIVE_MODE_REQUIRED', 'در محیط عملیاتی امکان فعال‌کردن درگاه آزمایشی وجود ندارد.');
      }
      settings.sandbox = body.sandbox;
    }
    if (!settings.returnUrl && settings.publicBaseUrl) settings.returnUrl = settings.publicBaseUrl;
  }

  const configured = isConfigured(key, settings);
  const enabled = typeof body.enabled === 'boolean' ? body.enabled : existing.enabled;

  if (key === 'zarinpal') {
    const identityChanged =
      existing.settings.merchantId !== settings.merchantId ||
      Boolean(existing.settings.sandbox) !== Boolean(settings.sandbox) ||
      existing.settings.publicBaseUrl !== settings.publicBaseUrl;
    if (identityChanged) {
      const pending = await query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM subscription_payment_attempts
         WHERE status IN ('creating', 'pending')`,
        [],
        client
      );
      if (Number(pending.rows[0]?.count || 0) > 0) {
        throw new IntegrationSettingsError(
          'PAYMENT_ATTEMPTS_IN_FLIGHT',
          'تا زمان تعیین تکلیف پرداخت‌های در انتظار، تغییر مرچنت‌کد یا حالت آزمایشی/واقعی مجاز نیست.'
        );
      }
    }
  }
  if (enabled && key === 'kavenegar' && config.sms.provider === 'null') {
    throw new IntegrationSettingsError('INTEGRATION_DISABLED_BY_ENV', 'ارسال پیامک با تنظیم SMS_PROVIDER=null در محیط سرور به‌صورت اضطراری غیرفعال شده است.');
  }
  if (enabled && !configured) {
    throw new IntegrationSettingsError('INTEGRATION_INCOMPLETE', 'برای فعال‌سازی، همه اطلاعات ضروری اتصال را کامل کنید.');
  }

  const row = await integrationSettingsRepository.upsert({
    key,
    encryptedConfig: encryptIntegrationConfig(settings),
    enabled,
    updatedBy,
  }, client);

  return {
    key,
    ...INTEGRATIONS[key],
    enabled: row.is_enabled && configured && !(key === 'kavenegar' && config.sms.provider === 'null'),
    configured,
    source: 'database',
    updatedAt: row.updated_at,
    fields: key === 'kavenegar'
      ? { apiKey: Boolean(settings.apiKey), template: Boolean(settings.template) }
      : {
          merchantId: Boolean(settings.merchantId),
          publicBaseUrl: Boolean(settings.publicBaseUrl),
          returnUrl: Boolean(settings.returnUrl),
        },
    ...(key === 'zarinpal' ? { mode: settings.sandbox ? 'sandbox' as const : 'live' as const } : {}),
  };
}
