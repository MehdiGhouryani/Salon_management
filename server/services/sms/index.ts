import { config } from '../../config.ts';
import type { SmsProvider } from './types.ts';
import { KavenegarSmsProvider } from './kavenegarProvider.ts';
import { DevMockSmsProvider } from './devMockProvider.ts';
import { NullSmsProvider } from './nullProvider.ts';
import { getIntegrationRuntime, type KavenegarIntegrationSettings } from '../integrations/integrationSettingsService.ts';

export * from './types.ts';
export * from './kavenegarProvider.ts';
export * from './devMockProvider.ts';
export * from './nullProvider.ts';

let devMockProviderInstance: DevMockSmsProvider | null = null;

export async function getSmsProvider(): Promise<SmsProvider> {
  // Explicit environment override always wins (emergency fail-closed switch).
  if (config.sms.provider === 'null') {
    return new NullSmsProvider('ارسال پیامک با تنظیم SMS_PROVIDER=null غیرفعال شده است.');
  }

  const integration = await getIntegrationRuntime<KavenegarIntegrationSettings>('kavenegar');
  if (integration.enabled && integration.configured && integration.settings.apiKey) {
    return new KavenegarSmsProvider(integration.settings.apiKey, {
      template: integration.settings.template || config.sms.template,
    });
  }

  if (config.isDevelopment || config.nodeEnv === 'test') {
    if (!devMockProviderInstance) devMockProviderInstance = new DevMockSmsProvider();
    return devMockProviderInstance;
  }

  return new NullSmsProvider(
    'درگاه ارسال پیامک عملیاتی پیکربندی نشده است. کلید کاوه‌نگار را از بخش تنظیمات پنل مدیریت وارد کنید.'
  );
}

export function getDevMockSmsProvider(): DevMockSmsProvider | null {
  if (config.isProduction) return null;
  if (!devMockProviderInstance) {
    devMockProviderInstance = new DevMockSmsProvider();
  }
  return devMockProviderInstance;
}
