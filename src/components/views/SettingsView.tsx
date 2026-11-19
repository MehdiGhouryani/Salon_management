import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CircleOff,
  CreditCard,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  RefreshCw,
  Save,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { api, ApiError } from '../../api/client';

type IntegrationKey = 'kavenegar' | 'zarinpal';
interface IntegrationStatus {
  key: IntegrationKey;
  title: string;
  description: string;
  enabled: boolean;
  configured: boolean;
  source: 'database' | 'environment' | 'not_configured';
  updatedAt: string | null;
  fields: Record<string, boolean>;
  mode?: 'sandbox' | 'live';
}

const sourceLabel: Record<IntegrationStatus['source'], string> = {
  database: 'ذخیره‌شده در پنل',
  environment: 'تنظیم‌شده روی سرور',
  not_configured: 'تنظیم نشده',
};

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'ارتباط با سرور یا ذخیره تنظیمات ناموفق بود.';
}

export const SettingsView: React.FC = () => {
  const { isDemoMode, addToast } = useAdmin();
  const [statuses, setStatuses] = useState<IntegrationStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<IntegrationKey | null>(null);

  // Secret inputs intentionally start empty. The API never returns stored values.
  const [kavenegarKey, setKavenegarKey] = useState('');
  const [kavenegarTemplate, setKavenegarTemplate] = useState('');
  const [showKavenegarKey, setShowKavenegarKey] = useState(false);
  const [kavenegarEnabled, setKavenegarEnabled] = useState(false);

  const [zarinpalMerchant, setZarinpalMerchant] = useState('');
  const [zarinpalBaseUrl, setZarinpalBaseUrl] = useState('');
  const [zarinpalReturnUrl, setZarinpalReturnUrl] = useState('');
  const [zarinpalSandbox, setZarinpalSandbox] = useState(true);
  const [zarinpalEnabled, setZarinpalEnabled] = useState(false);

  const statusByKey = useMemo(
    () => Object.fromEntries(statuses.map((item) => [item.key, item])) as Partial<Record<IntegrationKey, IntegrationStatus>>,
    [statuses]
  );

  const loadSettings = useCallback(async () => {
    if (isDemoMode) return;
    setLoading(true);
    try {
      const response = await api.get<{ success: boolean; integrations: IntegrationStatus[] }>('/api/admin/integrations');
      const list = response.integrations || [];
      setStatuses(list);
      const sms = list.find((item) => item.key === 'kavenegar');
      const payment = list.find((item) => item.key === 'zarinpal');
      if (sms) {
        setKavenegarEnabled(sms.enabled);
      }
      if (payment) {
        setZarinpalEnabled(payment.enabled);
        setZarinpalSandbox(payment.mode !== 'live');
      }
    } catch (error) {
      addToast({ type: 'error', title: 'دریافت تنظیمات اتصال ناموفق بود', message: errorMessage(error) });
    } finally {
      setLoading(false);
    }
  }, [isDemoMode, addToast]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const saveIntegration = async (key: IntegrationKey) => {
    setSaving(key);
    const payload = key === 'kavenegar'
      ? {
          enabled: kavenegarEnabled,
          ...(kavenegarKey.trim() ? { apiKey: kavenegarKey.trim() } : {}),
          ...(kavenegarTemplate.trim() ? { template: kavenegarTemplate.trim() } : {}),
        }
      : {
          enabled: zarinpalEnabled,
          ...(zarinpalMerchant.trim() ? { merchantId: zarinpalMerchant.trim() } : {}),
          ...(zarinpalBaseUrl.trim() ? { publicBaseUrl: zarinpalBaseUrl.trim() } : {}),
          ...(zarinpalReturnUrl.trim() ? { returnUrl: zarinpalReturnUrl.trim() } : {}),
          sandbox: zarinpalSandbox,
        };

    try {
      const response = await api.put<{ success: boolean; integration: IntegrationStatus }>(
        `/api/admin/integrations/${key}`,
        payload
      );
      setStatuses((current) => [
        ...current.filter((item) => item.key !== key),
        response.integration,
      ]);
      if (key === 'kavenegar') setKavenegarKey('');
      else setZarinpalMerchant('');
      addToast({
        type: 'success',
        title: 'تنظیمات ذخیره شد',
        message: response.integration.enabled ? 'اتصال فعال است.' : 'تنظیمات ذخیره شد و اتصال غیرفعال است.',
      });
    } catch (error) {
      addToast({ type: 'error', title: 'ذخیره تنظیمات ناموفق بود', message: errorMessage(error) });
    } finally {
      setSaving(null);
    }
  };

  const smsStatus = statusByKey.kavenegar;
  const paymentStatus = statusByKey.zarinpal;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-text-main flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            تنظیمات اتصال سرویس‌ها
          </h2>
          <p className="text-xs text-text-muted mt-1">
            کلیدها و توکن‌های سرویس‌های متصل را از همین صفحه مدیریت کنید.
          </p>
        </div>
        {!isDemoMode && (
          <button
            type="button"
            onClick={() => void loadSettings()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 dark:border-border-default px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-text-main disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            به‌روزرسانی وضعیت
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs leading-6 text-zinc-700 dark:text-text-muted">
          <p className="font-bold text-zinc-900 dark:text-text-main">ذخیره امن اطلاعات اتصال</p>
          <p>
            کلیدها در مرورگر نمایش داده نمی‌شوند و در پایگاه‌داده به‌صورت رمز‌شده نگهداری می‌شوند.
            برای تغییر کلید، مقدار جدید را وارد کنید؛ خالی گذاشتن فیلد رمز، مقدار قبلی را حفظ می‌کند.
          </p>
        </div>
      </div>

      {isDemoMode ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>حالت دمو فعال است. برای جلوگیری از نمایش ذخیره‌سازی ساختگی، ورود و ذخیره کلیدهای واقعی فقط در پنل عملیاتی و پس از اتصال پایگاه‌داده فعال است.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <section className="rounded-2xl border border-stone-200 dark:border-border-default bg-white dark:bg-elevated p-5 space-y-5">
            <div className="flex items-start justify-between gap-3 border-b border-stone-100 dark:border-border-default pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-text-main">کاوه‌نگار | پیامک</h3>
                  <p className="text-[11px] text-text-muted mt-0.5">ارسال کد ورود و تأیید شماره همراه</p>
                </div>
              </div>
              <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${smsStatus?.enabled ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-stone-100 text-stone-600 dark:bg-surface dark:text-text-muted'}`}>
                {smsStatus?.enabled ? 'فعال' : 'غیرفعال'}
              </span>
            </div>

            {loading && !smsStatus ? (
              <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-text-muted" /></div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label htmlFor="kavenegar-api-key" className="block text-xs font-semibold text-zinc-700 dark:text-text-main">API Key</label>
                  <div className="relative">
                    <input
                      id="kavenegar-api-key"
                      type={showKavenegarKey ? 'text' : 'password'}
                      autoComplete="new-password"
                      dir="ltr"
                      value={kavenegarKey}
                      onChange={(event) => setKavenegarKey(event.target.value)}
                      placeholder={smsStatus?.fields.apiKey ? 'کلید قبلی ثبت شده؛ برای جایگزینی وارد کنید' : 'کلید API کاوه‌نگار'}
                      className="w-full rounded-xl border border-stone-200 dark:border-border-default bg-stone-50 dark:bg-surface px-3 py-2.5 pl-10 text-left text-xs font-mono text-zinc-900 dark:text-text-main"
                    />
                    <button type="button" onClick={() => setShowKavenegarKey((value) => !value)} aria-label={showKavenegarKey ? 'پنهان کردن کلید' : 'نمایش کلید واردشده'} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                      {showKavenegarKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-text-muted">مقدار ذخیره‌شده قابل بازیابی یا نمایش مجدد نیست.</p>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="kavenegar-template" className="block text-xs font-semibold text-zinc-700 dark:text-text-main">نام الگوی پیامک</label>
                  <input
                    id="kavenegar-template"
                    dir="ltr"
                    value={kavenegarTemplate}
                    onChange={(event) => setKavenegarTemplate(event.target.value)}
                    placeholder="nobatara-otp (در صورت خالی‌بودن، مقدار پیش‌فرض حفظ می‌شود)"
                    className="w-full rounded-xl border border-stone-200 dark:border-border-default bg-stone-50 dark:bg-surface px-3 py-2.5 text-left text-xs font-mono text-zinc-900 dark:text-text-main"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-text-main">
                  <input type="checkbox" checked={kavenegarEnabled} onChange={(event) => setKavenegarEnabled(event.target.checked)} className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500" />
                  فعال‌سازی ارسال پیامک از طریق کاوه‌نگار
                </label>
                <div className="flex items-center justify-between gap-3 pt-2">
                  <span className="text-[10px] text-text-muted">{smsStatus ? sourceLabel[smsStatus.source] : 'وضعیت هنوز دریافت نشده'}</span>
                  <button type="button" onClick={() => void saveIntegration('kavenegar')} disabled={saving !== null || loading} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50">
                    {saving === 'kavenegar' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    ذخیره تنظیمات پیامک
                  </button>
                </div>
              </>
            )}
          </section>

          <section className="rounded-2xl border border-stone-200 dark:border-border-default bg-white dark:bg-elevated p-5 space-y-5">
            <div className="flex items-start justify-between gap-3 border-b border-stone-100 dark:border-border-default pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-text-main">زرین‌پال | پرداخت</h3>
                  <p className="text-[11px] text-text-muted mt-0.5">پرداخت آنلاین اشتراک سالن‌ها</p>
                </div>
              </div>
              <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${paymentStatus?.enabled ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-stone-100 text-stone-600 dark:bg-surface dark:text-text-muted'}`}>
                {paymentStatus?.enabled ? 'فعال' : 'غیرفعال'}
              </span>
            </div>

            {loading && !paymentStatus ? (
              <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-text-muted" /></div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label htmlFor="zarinpal-merchant" className="block text-xs font-semibold text-zinc-700 dark:text-text-main">Merchant ID</label>
                  <input
                    id="zarinpal-merchant"
                    type="password"
                    autoComplete="new-password"
                    dir="ltr"
                    value={zarinpalMerchant}
                    onChange={(event) => setZarinpalMerchant(event.target.value)}
                    placeholder={paymentStatus?.fields.merchantId ? 'مرچنت قبلی ثبت شده؛ برای جایگزینی وارد کنید' : 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'}
                    className="w-full rounded-xl border border-stone-200 dark:border-border-default bg-stone-50 dark:bg-surface px-3 py-2.5 text-left text-xs font-mono text-zinc-900 dark:text-text-main"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="zarinpal-public-url" className="block text-xs font-semibold text-zinc-700 dark:text-text-main">آدرس عمومی API</label>
                  <input
                    id="zarinpal-public-url"
                    dir="ltr"
                    value={zarinpalBaseUrl}
                    onChange={(event) => setZarinpalBaseUrl(event.target.value)}
                    placeholder={paymentStatus?.fields.publicBaseUrl ? 'آدرس قبلی تنظیم شده؛ برای تغییر وارد کنید' : 'https://api.example.com'}
                    className="w-full rounded-xl border border-stone-200 dark:border-border-default bg-stone-50 dark:bg-surface px-3 py-2.5 text-left text-xs font-mono text-zinc-900 dark:text-text-main"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="zarinpal-return-url" className="block text-xs font-semibold text-zinc-700 dark:text-text-main">آدرس بازگشت پرداخت در اپلیکیشن</label>
                  <input
                    id="zarinpal-return-url"
                    dir="ltr"
                    value={zarinpalReturnUrl}
                    onChange={(event) => setZarinpalReturnUrl(event.target.value)}
                    placeholder={paymentStatus?.fields.returnUrl ? 'آدرس قبلی تنظیم شده؛ برای تغییر وارد کنید' : 'https://app.example.com/billing'}
                    className="w-full rounded-xl border border-stone-200 dark:border-border-default bg-stone-50 dark:bg-surface px-3 py-2.5 text-left text-xs font-mono text-zinc-900 dark:text-text-main"
                  />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-text-main">
                    <input type="checkbox" checked={zarinpalSandbox} onChange={(event) => setZarinpalSandbox(event.target.checked)} className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500" />
                    حالت آزمایشی (Sandbox)
                  </label>
                  <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-text-main">
                    <input type="checkbox" checked={zarinpalEnabled} onChange={(event) => setZarinpalEnabled(event.target.checked)} className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500" />
                    فعال‌سازی پرداخت زرین‌پال
                  </label>
                </div>
                <div className="flex items-center justify-between gap-3 pt-2">
                  <span className="text-[10px] text-text-muted">
                    {paymentStatus ? sourceLabel[paymentStatus.source] : 'وضعیت هنوز دریافت نشده'}
                    {paymentStatus?.mode === 'sandbox' ? ' · آزمایشی' : paymentStatus?.mode === 'live' ? ' · واقعی' : ''}
                  </span>
                  <button type="button" onClick={() => void saveIntegration('zarinpal')} disabled={saving !== null || loading} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50">
                    {saving === 'zarinpal' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    ذخیره تنظیمات درگاه
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      <section className="rounded-2xl border border-stone-200 dark:border-border-default bg-white dark:bg-elevated p-4 flex items-start gap-3">
        <KeyRound className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs leading-6">
          <p className="font-bold text-zinc-900 dark:text-text-main">سرویس‌های بعدی</p>
          <p className="text-text-muted">
            در حال حاضر فقط اتصال‌های واقعی کاوه‌نگار و زرین‌پال مدیریت می‌شوند. درگاه ملت و سرویس‌های دیگر تا زمان پیاده‌سازی API، تست اتصال و مسیر خطایابی به‌عنوان اتصال فعال نمایش داده نمی‌شوند.
          </p>
          <p className="text-[10px] text-text-muted flex items-center gap-1.5"><CircleOff className="w-3.5 h-3.5" /> ثبت اطلاعات خام در مرورگر یا لاگ انجام نمی‌شود.</p>
        </div>
      </section>
    </div>
  );
};
