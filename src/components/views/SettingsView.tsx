import React, { useState } from 'react';
import {
  Settings,
  Key,
  Database,
  Radio,
  Eye,
  EyeOff,
  Save,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  RefreshCw,
  Bell,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { maskApiKey } from '../../utils/formatters';

export const SettingsView: React.FC = () => {
  const { isDemoMode, securitySettings, updateSecuritySettings, addToast } = useAdmin();

  // API credentials state - Empty defaults for secure configuration state
  const [kavenegarKey, setKavenegarKey] = useState('');
  const [zarinpalMerchant, setZarinpalMerchant] = useState('');
  const [samanTerminal, setSamanTerminal] = useState('');
  const [showKeys, setShowKeys] = useState(false);

  // Broadcast banner state
  const [bannerActive, setBannerActive] = useState(false);
  const [bannerText, setBannerText] = useState('سیستم در تاریخ ۲۵ آبان از ساعت ۰۳:۰۰ الی ۰۴:۰۰ بامداد جهت ارتقای سرورها در دسترس نخواهد بود.');

  const handleSaveApiKeys = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDemoMode) {
      addToast({
        type: 'error',
        title: 'تنظیمات در محیط عملیاتی مسدود است',
        message: 'در نسخه عملیاتی، کلیدهای وب‌سرویس باید در متغیرهای محرمانه سرور (.env) تعریف شوند.',
      });
      return;
    }
    addToast({
      type: 'info',
      title: '[شبیه‌سازی دمو] کلیدها در حافظه موقت کلاینت ذخیره شدند',
      message: 'توجه: هیچ داده‌ای در سرور ذخیره نشد و پس از بازنشانی صفحه پاک می‌شود.',
    });
  };

  const handleSaveBanner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDemoMode) {
      addToast({
        type: 'error',
        title: 'ذخیره اطلاعیه نیازمند سرور است',
        message: 'پایدارسازی اطلاعیه در فاز ۴ با پایگاه‌داده انجام خواهد شد.',
      });
      return;
    }
    addToast({
      type: 'info',
      title: bannerActive ? '[شبیه‌سازی دمو] اطلاعیه سراسری در حافظه موقت فعال شد' : '[شبیه‌سازی دمو] اطلاعیه غیرفعال شد',
    });
  };

  return (
    <div className="space-y-6">
      {/* Security Advisory Banner */}
      <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3 text-xs text-amber-800 dark:text-amber-300">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold block">خط‌مشی امنیت سرور و مدیریت اسرار (Secrets Management):</span>
          <p className="leading-relaxed text-[11px] text-amber-700 dark:text-amber-300/90">
            بر اساس الزامات فاز ۲، هیچ‌گونه کلید امنیتی یا مرچنت درگاه بانکی در کدهای فرانت‌اند نگهداری نمی‌شود. در محیط عملیاتی، این مقادیر مستقیماً از طریق متغیرهای محیطی سمت سرور (<code className="font-mono bg-amber-500/20 px-1 py-0.5 rounded">.env</code>) خوانده می‌شوند و فرم زیر صرفاً به عنوان پیش‌نمایش رابط کاربری است.
          </p>
        </div>
      </div>

      {/* Header */}
      <div>
        <h2 className="text-base font-bold text-zinc-900 dark:text-[#E7ECF5] flex items-center gap-2">
          <Settings className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          تنظیمات هسته و اتصالات
        </h2>
        <p className="text-xs text-zinc-500 dark:text-[#9AAAC2] mt-0.5">
          پیکربندی کلیدهای وب‌سرویس پیامک، درگاه بانکی شاپرک و اطلاعیه‌های سراسری
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form 1: API Keys & Gateways */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#18243A] border border-stone-200/90 dark:border-[#344258] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-[#344258]">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-[#E7ECF5] flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-500" />
              کلیدهای اتصال پیامک و درگاه
            </h3>
            <button
              type="button"
              onClick={() => setShowKeys(!showKeys)}
              className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center gap-1 cursor-pointer"
            >
              {showKeys ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showKeys ? 'پنهان‌سازی کلیدها' : 'نمایش کلیدها'}</span>
            </button>
          </div>

          <form onSubmit={handleSaveApiKeys} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-zinc-600 dark:text-[#9AAAC2] mb-1">API Key کاوه‌نگار (سرویس پیامک خدماتی)</label>
              <input
                type={showKeys ? 'text' : 'password'}
                dir="ltr"
                value={kavenegarKey}
                onChange={(e) => setKavenegarKey(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-[#111B2E] border border-stone-200 dark:border-[#344258] rounded-xl text-zinc-900 dark:text-[#E7ECF5] font-mono text-left"
              />
            </div>

            <div>
              <label className="block text-zinc-600 dark:text-[#9AAAC2] mb-1">مرچنت‌کد زرین‌پال (درگاه پرداخت اشتراک)</label>
              <input
                type={showKeys ? 'text' : 'password'}
                dir="ltr"
                value={zarinpalMerchant}
                onChange={(e) => setZarinpalMerchant(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-[#111B2E] border border-stone-200 dark:border-[#344258] rounded-xl text-zinc-900 dark:text-[#E7ECF5] font-mono text-left"
              />
            </div>

            <div>
              <label className="block text-zinc-600 dark:text-[#9AAAC2] mb-1">ترمینال سامانه به‌پرداخت ملت</label>
              <input
                type={showKeys ? 'text' : 'password'}
                dir="ltr"
                value={samanTerminal}
                onChange={(e) => setSamanTerminal(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-[#111B2E] border border-stone-200 dark:border-[#344258] rounded-xl text-zinc-900 dark:text-[#E7ECF5] font-mono text-left"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                ذخیره کلیدهای وب‌سرویس
              </button>
            </div>
          </form>
        </div>

        {/* Form 2: System Broadcast Banner */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#18243A] border border-stone-200/90 dark:border-[#344258] shadow-xs space-y-4">
          <div className="pb-3 border-b border-stone-100 dark:border-[#344258]">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-[#E7ECF5] flex items-center gap-2">
              <Bell className="w-4 h-4 text-rose-500" />
              پیام اطلاعیه سراسری
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              نمایش بنر هشدار در بالای پنل تمام سالن‌ها و اپلیکیشن‌ها
            </p>
          </div>

          <form onSubmit={handleSaveBanner} className="space-y-3.5 text-xs">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="banner-toggle"
                checked={bannerActive}
                onChange={(e) => setBannerActive(e.target.checked)}
                className="rounded text-rose-600"
              />
              <label htmlFor="banner-toggle" className="text-zinc-800 dark:text-zinc-200 font-semibold cursor-pointer">
                فعال‌سازی بنر اطلاعیه سراسری
              </label>
            </div>

            <div>
              <label className="block text-zinc-600 dark:text-[#9AAAC2] mb-1">متن پیام برای سالن‌ها</label>
              <textarea
                rows={4}
                value={bannerText}
                onChange={(e) => setBannerText(e.target.value)}
                className="w-full p-3 bg-stone-50 dark:bg-[#111B2E] border border-stone-200 dark:border-[#344258] rounded-xl text-zinc-900 dark:text-[#E7ECF5] focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                اعمال وضعیت اطلاعیه
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
