import React, { useState } from 'react';
import {
  Search,
  Bell,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Command,
  Keyboard,
  Radio,
} from 'lucide-react';
import { useAdmin, AdminTab } from '../../context/AdminContext';
import { toPersianDigits } from '../../utils/formatters';

const tabTitles: Record<AdminTab, { title: string; subtitle: string }> = {
  overview: { title: 'داشبورد جامع نظارتی', subtitle: 'خلاصه وضعیت شبکه، درآمد و شاخص‌های کلیدی' },
  businesses: { title: 'مدیریت سالن‌ها و کسب‌وکارها', subtitle: 'بررسی پرونده‌ها، تایید صلاحیت، اشتراک و تعلیق' },
  users: { title: 'کاربران، پرسنل و دسترسی‌ها', subtitle: 'مدیریت سطوح دسترسی (RBAC) و احراز هویت دومرحله‌ای' },
  subscriptions: { title: 'اشتراک‌ها و تراکنش‌های مالی', subtitle: 'تعرفه پلن‌ها، فاکتورهای بانکی و درآمد ماهانه' },
  messages: { title: 'مرکز پیامک و دیسپچ مخابراتی', subtitle: 'مانیتورینگ صف، تلاش مجدد ارسال‌ها و الگوهای خودکار' },
  support: { title: 'مرکز پشتیبانی و تیکت‌ها', subtitle: 'رسیدگی به درخواست‌های مدیران سالن با پاسخ‌های آماده' },
  operations: { title: 'عملیات، سلامت سرور و کش', subtitle: 'پایش سخت‌افزار، کش Redis و لاگ‌های سرور' },
  security: { title: 'مرکز امنیت، نشست‌ها و فایروال', subtitle: 'لاگ‌های امنیتی، نشست‌های فعال و لیست سیاه IP' },
  settings: { title: 'تنظیمات هسته و وب‌سرویس‌ها', subtitle: 'کلیدهای درگاه و پیامک، حالت تعمیرات و بنر سراسری' },
  simulator: { title: 'پیش‌نمایش دستیار سالن (شبیه‌ساز)', subtitle: 'تست تعاملی تقویم و نوبت‌دهی سالن‌ها در ابعاد موبایل' },
};

export const Header: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    salons,
    messages,
    tickets,
    setCommandPaletteOpen,
    setShortcutsModalOpen,
  } = useAdmin();

  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const pendingSalons = salons.filter((s) => s.status === 'pending');
  const failedMessages = messages.filter((m) => m.status === 'failed' || m.status === 'retrying');
  const openTickets = tickets.filter((t) => t.status === 'open' || t.status === 'in_progress');
  const totalAlerts = pendingSalons.length + failedMessages.length + openTickets.length;

  const currentInfo = tabTitles[activeTab] || tabTitles.overview;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-5 py-3 bg-[#0B0F19]/90 backdrop-blur-md border-b border-slate-800/80 text-slate-100">
      {/* Zone 1: Contextual Breadcrumb & Subtitle */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex flex-col text-right truncate">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-slate-400">ادمین مرکزی</span>
            <span aria-hidden="true" className="text-slate-600">/</span>
            <span className="text-rose-400 font-bold truncate">{currentInfo.title}</span>
          </div>
          <span className="hidden md:inline text-[11px] text-slate-400 mt-0.5 truncate">
            {currentInfo.subtitle}
          </span>
        </div>
      </div>

      {/* Zone 2: Instant Search Button (Center, Quick Command Access) */}
      <div className="flex items-center gap-2.5 max-w-md w-full justify-center">
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="w-full max-w-sm flex items-center justify-between gap-2 px-3 py-1.5 text-xs text-slate-400 bg-slate-900/90 hover:bg-slate-800/90 hover:text-slate-200 border border-slate-700/60 rounded-xl transition-all cursor-pointer shadow-sm group"
          title="جستجوی سریع در تمام بخش‌ها (Ctrl+K)"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-400 transition-colors" />
            <span className="truncate">جستجوی سالن، کاربر، تیکت...</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] bg-slate-950 border border-slate-700/80 rounded-md text-slate-400 font-mono shadow-inner">
            <Command className="w-2.5 h-2.5" /> K
          </kbd>
        </button>
      </div>

      {/* Zone 3: Fast Actions, Alerts & Profile */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Keyboard Shortcuts Trigger Button */}
        <button
          onClick={() => setShortcutsModalOpen(true)}
          className="p-2 text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 rounded-xl transition-colors cursor-pointer hidden sm:flex items-center justify-center"
          title="کلیدهای میانبر ناوبری پرسرعت (?)"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        {/* Live Salon Simulator Switcher */}
        <button
          onClick={() => setActiveTab(activeTab === 'simulator' ? 'overview' : 'simulator')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer shadow-sm ${
            activeTab === 'simulator'
              ? 'bg-rose-500 text-white border-rose-400 shadow-rose-500/20'
              : 'bg-slate-900 text-slate-200 border-slate-700/70 hover:bg-slate-800 hover:border-slate-600'
          }`}
          title="مشاهده شبیه‌ساز برنامه دستیار سالن"
        >
          <Smartphone className="w-3.5 h-3.5 text-rose-400" />
          <span className="hidden lg:inline">
            {activeTab === 'simulator' ? 'داشبورد ادمین' : 'دستیار سالن'}
          </span>
          {activeTab !== 'simulator' && (
            <span className="flex h-1.5 w-1.5 rounded-full bg-rose-400"></span>
          )}
        </button>

        {/* Notifications & Action Items */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2 text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 rounded-xl transition-colors cursor-pointer"
            aria-label="اعلان‌ها و رویدادهای نیازمند اقدام"
          >
            <Bell className="w-4 h-4" />
            {totalAlerts > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm">
                {toPersianDigits(totalAlerts)}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {notificationsOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setNotificationsOpen(false)}
              ></div>
              <div className="absolute left-0 mt-2 w-80 max-w-[92vw] z-50 bg-[#0F1523] border border-slate-700/80 rounded-2xl shadow-2xl p-4 divide-y divide-slate-800 animate-in fade-in zoom-in-95 duration-150 text-right">
                <div className="flex items-center justify-between pb-3">
                  <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                    هشدارهای نیازمند اقدام فوری
                  </h4>
                  <span className="text-[11px] text-rose-400 font-semibold">
                    {toPersianDigits(totalAlerts)} مورد فعال
                  </span>
                </div>

                <div className="py-2.5 space-y-2 max-h-72 overflow-y-auto text-xs">
                  {pendingSalons.length > 0 && (
                    <div
                      onClick={() => {
                        setActiveTab('businesses');
                        setNotificationsOpen(false);
                      }}
                      className="flex items-start gap-2.5 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 cursor-pointer transition-colors"
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-amber-200">
                          {toPersianDigits(pendingSalons.length)} سالن در انتظار بررسی و تایید
                        </p>
                        <p className="text-[11px] text-amber-300/70 mt-0.5">
                          مدارک ارسالی نیازمند احراز هویت است.
                        </p>
                      </div>
                    </div>
                  )}

                  {failedMessages.length > 0 && (
                    <div
                      onClick={() => {
                        setActiveTab('messages');
                        setNotificationsOpen(false);
                      }}
                      className="flex items-start gap-2.5 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/15 cursor-pointer transition-colors"
                    >
                      <RotateCcw className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-rose-200">
                          {toPersianDigits(failedMessages.length)} پیامک ناموفق در صف دیسپچ
                        </p>
                        <p className="text-[11px] text-rose-300/70 mt-0.5">
                          خطای بلک‌لیست مخابراتی؛ آماده ارسال مجدد.
                        </p>
                      </div>
                    </div>
                  )}

                  {openTickets.length > 0 && (
                    <div
                      onClick={() => {
                        setActiveTab('support');
                        setNotificationsOpen(false);
                      }}
                      className="flex items-start gap-2.5 p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/15 cursor-pointer transition-colors"
                    >
                      <Sparkles className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-sky-200">
                          {toPersianDigits(openTickets.length)} تیکت بدون پاسخ سالن‌داران
                        </p>
                        <p className="text-[11px] text-sky-300/70 mt-0.5">
                          درخواست‌های راهنمایی فنی و پشتیبانی.
                        </p>
                      </div>
                    </div>
                  )}

                  {totalAlerts === 0 && (
                    <div className="text-center py-5 text-slate-400 flex flex-col items-center gap-1.5">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      <p className="text-xs">سیستم در وضعیت مطلوب، بدون هشدار فعال</p>
                    </div>
                  )}
                </div>

                <div className="pt-2 text-center">
                  <button
                    onClick={() => {
                      setActiveTab('operations');
                      setNotificationsOpen(false);
                    }}
                    className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors w-full py-1 cursor-pointer"
                  >
                    مشاهده کنسول سلامت و لاگ‌های سرور
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Super Admin Identity Badge */}
        <div className="flex items-center gap-2.5 pr-2.5 border-r border-slate-800/80">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-500 via-rose-600 to-amber-500 flex items-center justify-center font-bold text-xs text-white shadow">
              م‌غ
            </div>
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#0B0F19]"
              title="احراز هویت دو مرحله‌ای ۲FA فعال"
            ></span>
          </div>
          <div className="hidden xl:flex flex-col text-right">
            <span className="text-xs font-bold text-slate-200 leading-tight">
              مهدی غوریانی
            </span>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
              <ShieldCheck className="w-2.5 h-2.5" /> ادمین اصلی (امن)
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
