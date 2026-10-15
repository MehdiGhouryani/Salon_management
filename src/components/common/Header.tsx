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
  Globe,
} from 'lucide-react';
import { useAdmin, AdminTab } from '../../context/AdminContext';
import { toPersianDigits } from '../../utils/formatters';
import { ThemeToggle } from './ThemeToggle';

const tabTitles: Record<AdminTab, { title: string; subtitle: string }> = {
  overview: { title: 'داشبورد نظارتی', subtitle: 'وضعیت کل شبکه سالن‌ها و شاخص‌های کلیدی' },
  businesses: { title: 'سالن‌ها و کسب‌وکارها', subtitle: 'بررسی مدارک، تایید صلاحیت و اشتراک‌ها' },
  users: { title: 'کاربران و پرسنل', subtitle: 'مدیریت دسترسی‌ها و احراز هویت' },
  subscriptions: { title: 'اشتراک‌ها و تراکنش‌ها', subtitle: 'تعرفه‌ها، تمدیدها و گردش مالی پلتفرم' },
  messages: { title: 'مرکز پیامک و دیسپچ', subtitle: 'صف ارسال پیامک‌های نوبت‌دهی و اطلاع‌رسانی' },
  support: { title: 'مرکز پشتیبانی', subtitle: 'تیکت‌ها و درخواست‌های مدیران سالن' },
  operations: { title: 'سلامت سرور و سیستم', subtitle: 'پایش منابع سرور، کش و وضعیت وب‌سرویس‌ها' },
  security: { title: 'مرکز امنیت و لاگ‌ها', subtitle: 'لاگ‌های امنیتی، نشست‌های فعال و رویدادها' },
  settings: { title: 'تنظیمات هسته', subtitle: 'تنظیمات پلتفرم، کلیدهای ارتباطی و پیامک' },
  simulator: { title: 'شبیه‌ساز سالن', subtitle: 'پیش‌نمایش تعاملی اپلیکیشن مدیر سالن' },
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
    setPersona,
  } = useAdmin();

  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const pendingSalons = salons.filter((s) => s.status === 'pending');
  const failedMessages = messages.filter((m) => m.status === 'failed' || m.status === 'retrying');
  const openTickets = tickets.filter((t) => t.status === 'open' || t.status === 'in_progress');
  const totalAlerts = pendingSalons.length + failedMessages.length + openTickets.length;

  const currentInfo = tabTitles[activeTab] || tabTitles.overview;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-5 py-3 bg-white dark:bg-[#0F172A] backdrop-blur-md border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 transition-colors shadow-xs">
      {/* Zone 1: Contextual Breadcrumb & Title */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex flex-col text-right truncate">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-slate-500 dark:text-slate-400">پنل کل</span>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">/</span>
            <span className="text-rose-600 dark:text-rose-400 font-bold truncate">{currentInfo.title}</span>
          </div>
          <span className="hidden md:inline text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            {currentInfo.subtitle}
          </span>
        </div>
      </div>

      {/* Zone 2: Instant Search Button */}
      <div className="flex items-center gap-2.5 max-w-md w-full justify-center">
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="w-full max-w-sm flex items-center justify-between gap-2 px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-[#151F32] hover:bg-slate-200/80 dark:hover:bg-[#1E293B] hover:text-slate-800 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl transition-all cursor-pointer shadow-xs group"
          title="جستجو در بخش‌ها (Ctrl+K)"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-600 transition-colors" />
            <span className="truncate">جستجوی سالن، کاربر، تیکت...</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-md text-slate-500 dark:text-slate-400 font-mono shadow-inner">
            <Command className="w-2.5 h-2.5" /> K
          </kbd>
        </button>
      </div>

      {/* Zone 3: Actions, Theme Switcher & Profile */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Prominent Theme Toggle in Admin Header */}
        <ThemeToggle variant="segmented" className="hidden sm:inline-flex" />
        <ThemeToggle variant="icon" className="sm:hidden" />

        {/* Keyboard Shortcuts Trigger Button */}
        <button
          onClick={() => setShortcutsModalOpen(true)}
          className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 bg-slate-100 dark:bg-[#151F32] hover:bg-slate-200/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl transition-colors cursor-pointer hidden sm:flex items-center justify-center"
          title="کلیدهای میانبر (?)"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        {/* Switch to Salon Customer Website */}
        <button
          onClick={() => setPersona('salon_website')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-rose-500/30 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-600 hover:text-white text-rose-700 dark:text-rose-300 transition-all cursor-pointer shadow-xs"
          title="مشاهده وب‌سایت اختصاصی رزرو سالن"
        >
          <Globe className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">وب‌سایت سالن</span>
        </button>

        {/* Switch to Salon Android App */}
        <button
          onClick={() => setPersona('salon_app')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer shadow-xs"
          title="مشاهده اپلیکیشن مدیر سالن"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">اپلیکیشن سالن</span>
        </button>

        {/* Notifications & Action Items */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-[#0E1015] hover:bg-slate-200/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl transition-colors cursor-pointer"
            aria-label="اعلان‌ها"
          >
            <Bell className="w-4 h-4" />
            {totalAlerts > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-xs">
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
              <div className="absolute left-0 mt-2 w-80 max-w-[92vw] z-50 bg-white dark:bg-[#181B24] border border-stone-200 dark:border-zinc-800 rounded-2xl shadow-xl p-4 divide-y divide-stone-100 dark:divide-zinc-800 animate-in fade-in zoom-in-95 duration-150 text-right">
                <div className="flex items-center justify-between pb-3">
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    رویدادهای نیازمند بررسی
                  </h4>
                  <span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
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
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-amber-900 dark:text-amber-200">
                          {toPersianDigits(pendingSalons.length)} سالن در انتظار بررسی
                        </p>
                        <p className="text-[11px] text-amber-700 dark:text-amber-300/70 mt-0.5">
                          مدارک ارسال شده نیازمند بازبینی است.
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
                      <RotateCcw className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-rose-900 dark:text-rose-200">
                          {toPersianDigits(failedMessages.length)} پیامک ناموفق
                        </p>
                        <p className="text-[11px] text-rose-700 dark:text-rose-300/70 mt-0.5">
                          آماده تلاش مجدد ارسال در صف مخابراتی.
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
                      className="flex items-start gap-2.5 p-2.5 rounded-xl bg-stone-500/10 border border-stone-500/20 hover:bg-stone-500/15 cursor-pointer transition-colors"
                    >
                      <Sparkles className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-zinc-900 dark:text-zinc-200">
                          {toPersianDigits(openTickets.length)} تیکت بدون پاسخ
                        </p>
                        <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                          درخواست‌های پشتیبانی سالن‌داران.
                        </p>
                      </div>
                    </div>
                  )}

                  {totalAlerts === 0 && (
                    <div className="text-center py-5 text-zinc-500 dark:text-zinc-400 flex flex-col items-center gap-1.5">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
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
                    className="text-[11px] text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors w-full py-1 cursor-pointer"
                  >
                    مشاهده کنسول سلامت و لاگ‌های سرور
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Super Admin Identity Badge */}
        <div className="flex items-center gap-2.5 pr-2.5 border-r border-stone-200 dark:border-zinc-800">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-gradient-to-l from-rose-600 to-pink-600 flex items-center justify-center font-bold text-xs text-white shadow-xs">
              م‌غ
            </div>
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0E1015]"
              title="احراز هویت دومرحله‌ای فعال"
            ></span>
          </div>
          <div className="hidden xl:flex flex-col text-right">
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 leading-tight">
              مهدی غوریانی
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
              <ShieldCheck className="w-2.5 h-2.5" /> ادمین اصلی
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
