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
  const { securitySettings, updateSecuritySettings, addToast } = useAdmin();

  // API credentials state
  const [kavenegarKey, setKavenegarKey] = useState('746162384742394541306C62376C544F3532446A31773D3D');
  const [zarinpalMerchant, setZarinpalMerchant] = useState('a9b8c7d6-1234-5678-90ab-cdef12345678');
  const [samanTerminal, setSamanTerminal] = useState('89012345');
  const [showKeys, setShowKeys] = useState(false);

  // Broadcast banner state
  const [bannerActive, setBannerActive] = useState(false);
  const [bannerText, setBannerText] = useState('سیستم در تاریخ ۲۵ آبان از ساعت ۰۳:۰۰ الی ۰۴:۰۰ بامداد جهت ارتقای سرورها در دسترس نخواهد بود.');

  const handleSaveApiKeys = (e: React.FormEvent) => {
    e.preventDefault();
    addToast({
      type: 'success',
      title: 'کلیدهای وب‌سرویس و درگاه با موفقیت بروزرسانی شدند',
      message: 'اعتبارسنجی اتصال با درگاه و پیامک با موفقیت انجام شد.',
    });
  };

  const handleSaveBanner = (e: React.FormEvent) => {
    e.preventDefault();
    addToast({
      type: 'info',
      title: bannerActive ? 'اطلاعیه سراسری در پنل سالن‌ها فعال گردید' : 'اطلاعیه سراسری غیرفعال شد',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <Settings className="w-5 h-5 text-slate-300" />
          تنظیمات هسته، درگاه‌ها و پیکربندی عمومی سامانه
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          تنظیم اطلاعات اتصال درگاه‌های بانکی، ارائه‌دهندگان پیامک، پیام‌های سرتاسری و بکاپ‌گیری
        </p>
      </div>

      {/* Maintenance Mode Warning if active */}
      {securitySettings.maintenanceMode && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            <div>
              <p className="font-bold">حالت تعمیر و نگهداری (Maintenance Mode) هم‌اکنون فعال است!</p>
              <p className="text-[11px] text-rose-300/80 mt-0.5">کاربران عادی و مشتریان سالن‌ها با پیام «سایت در حال بروزرسانی است» مواجه می‌شوند.</p>
            </div>
          </div>
          <button
            onClick={() => updateSecuritySettings({ maintenanceMode: false })}
            className="px-3 py-1.5 bg-rose-600 text-white font-semibold rounded-lg hover:bg-rose-500 cursor-pointer"
          >
            غیرفعال‌سازی فوری
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
        {/* API Credentials Card */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                درگاه‌های بانکی دریافت اشتراک سالن‌ها (B2B SaaS) و پیامک
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">درگاه شاپرک منحصراً جهت دریافت حق اشتراک پلتفرم از مدیران سالن‌هاست (پرداخت نوبت‌ها حضوری است)</p>
            </div>

            <button
              onClick={() => setShowKeys(!showKeys)}
              className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
            >
              {showKeys ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showKeys ? 'مخفی‌سازی' : 'نمایش'}</span>
            </button>
          </div>

          <form onSubmit={handleSaveApiKeys} className="space-y-3.5">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                کلید وب‌سرویس پیامک کاوه‌نگار (API Key)
              </label>
              <input
                type={showKeys ? 'text' : 'password'}
                dir="ltr"
                value={kavenegarKey}
                onChange={(e) => setKavenegarKey(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 font-mono text-xs focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                کد پذیرنده زرین‌پال (Merchant ID)
              </label>
              <input
                type={showKeys ? 'text' : 'password'}
                dir="ltr"
                value={zarinpalMerchant}
                onChange={(e) => setZarinpalMerchant(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 font-mono text-xs focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                شماره ترمینال به‌پرداخت ملت (Terminal ID)
              </label>
              <input
                type={showKeys ? 'text' : 'password'}
                dir="ltr"
                value={samanTerminal}
                onChange={(e) => setSamanTerminal(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 font-mono text-xs focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl transition-colors cursor-pointer shadow"
              >
                <Save className="w-3.5 h-3.5" />
                <span>ذخیره کلیدهای API</span>
              </button>
            </div>
          </form>
        </div>

        {/* System Announcements & Broadcast Banner */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="pb-3 border-b border-slate-800">
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              <Bell className="w-4 h-4 text-sky-400" />
              اطلاعیه و بنر سراسری برای تمام سالن‌ها
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">نمایش پیام هشدار یا راهنما در بالای داشبورد تمام مدیران سالن</p>
          </div>

          <form onSubmit={handleSaveBanner} className="space-y-3.5">
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 cursor-pointer">
              <span className="font-semibold text-slate-200">نمایش بنر سراسری در پنل کاربران</span>
              <input
                type="checkbox"
                checked={bannerActive}
                onChange={(e) => setBannerActive(e.target.checked)}
                className="rounded text-rose-500 focus:ring-rose-500 w-4 h-4 cursor-pointer"
              />
            </label>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">متن اطلاعیه عمومی</label>
              <textarea
                rows={3}
                value={bannerText}
                onChange={(e) => setBannerText(e.target.value)}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-rose-500 leading-relaxed text-xs"
              ></textarea>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-colors cursor-pointer border border-slate-700"
              >
                <Save className="w-3.5 h-3.5" />
                <span>ذخیره وضعیت بنر</span>
              </button>
            </div>
          </form>
        </div>

        {/* Maintenance & Core Guard Switch */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div>
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              حالت اضطراری و تعمیرات سیستم
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">در مواقع ارتقای زیرساخت یا مهاجرت دیتابیس</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-200 block">فعال‌سازی حالت تعمیرات (Maintenance Mode)</span>
                <span className="text-[11px] text-slate-400">فقط سوپرادمین‌ها می‌توانند به سیستم وارد شوند.</span>
              </div>
              <input
                type="checkbox"
                checked={securitySettings.maintenanceMode}
                onChange={(e) => updateSecuritySettings({ maintenanceMode: e.target.checked })}
                className="rounded text-rose-500 focus:ring-rose-500 w-4 h-4 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Database Backup Schedule */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div>
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-emerald-400" />
              پشتیبان‌گیری خودکار پایگاه‌داده (Automated Backups)
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">پشتیبان‌گیری رمزنگاری شده روزانه روی فضای ابری مجزا</p>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3 bg-slate-800/50 rounded-xl flex items-center justify-between">
              <span className="text-slate-300">آخرین پشتیبان خودکار موفق:</span>
              <span className="text-emerald-400 font-medium">امروز ۰۳:۰۰ بامداد (۱.۴ GB)</span>
            </div>

            <div className="p-3 bg-slate-800/50 rounded-xl flex items-center justify-between">
              <span className="text-slate-300">دوره نگهداری فایل‌های پشتیبان:</span>
              <span className="text-slate-200 font-semibold">۳۰ روز اخیر با چرخش خودکار</span>
            </div>

            <button
              onClick={() => {
                addToast({
                  type: 'success',
                  title: 'دستور پشتیبان‌گیری آنی صادر شد',
                  message: 'فایل بکاپ تا چند لحظه دیگر در مسیر امن ذخیره خواهد شد.',
                });
              }}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer mt-2"
            >
              ایجاد پشتیبان دستی فوری (Create Snapshot Now)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
