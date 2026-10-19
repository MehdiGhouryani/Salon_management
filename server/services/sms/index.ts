import { config } from '../../config.ts';
import type { SmsProvider } from './types.ts';
import { KavenegarSmsProvider } from './kavenegarProvider.ts';
import { DevMockSmsProvider } from './devMockProvider.ts';
import { NullSmsProvider } from './nullProvider.ts';

export * from './types.ts';
export * from './kavenegarProvider.ts';
export * from './devMockProvider.ts';
export * from './nullProvider.ts';

let activeProvider: SmsProvider | null = null;
let devMockProviderInstance: DevMockSmsProvider | null = null;

export function getSmsProvider(): SmsProvider {
  if (activeProvider) {
    return activeProvider;
  }

  // 1. If Kavenegar API key is provided, use real Kavenegar integration
  if (config.auth.kavenegarApiKey) {
    activeProvider = new KavenegarSmsProvider(config.auth.kavenegarApiKey);
    return activeProvider;
  }

  // 2. In non-production, instantiate DevMockSmsProvider
  if (config.isDevelopment || config.nodeEnv === 'test') {
    if (!devMockProviderInstance) {
      devMockProviderInstance = new DevMockSmsProvider();
    }
    activeProvider = devMockProviderInstance;
    return activeProvider;
  }

  // 3. In production with no SMS provider configured, fail closed!
  activeProvider = new NullSmsProvider(
    'درگاه ارسال پیامک عملیاتی پیکربندی نشده است. لطفا KAVENEGAR_API_KEY را در متغیرهای سرور تنظیم نمایید.'
  );
  return activeProvider;
}

export function getDevMockSmsProvider(): DevMockSmsProvider | null {
  if (config.isProduction) return null;
  if (!devMockProviderInstance) {
    devMockProviderInstance = new DevMockSmsProvider();
  }
  return devMockProviderInstance;
}
