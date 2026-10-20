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
  Menu,
} from 'lucide-react';
import { useAdmin, AdminTab } from '../../context/AdminContext';
import { toPersianDigits } from '../../utils/formatters';
import { ThemeToggle } from './ThemeToggle';

const tabTitles: Record<AdminTab, { title: string; subtitle: string }> = {
  overview: { title: 'داشبورد نظارتی', subtitle: 'وضعیت کل شبکه سالن‌ها و شاخص‌های کلیدی' },
  businesses: { title: 'سالن‌ها و مراکز', subtitle: 'بررسی مدارک، تایید صلاحیت و اشتراک‌ها' },
  users: { title: 'کاربران و پرسنل', subtitle: 'مدیریت دسترسی‌ها و احراز هویت' },
  subscriptions: { title: 'اشتراک‌ها و تراکنش‌ها', subtitle: 'تعرفه‌ها، تمدیدها و گردش مالی پلتفرم' },
  messages: { title: 'مرکز پیامک و دیسپچ', subtitle: 'صف ارسال پیامک‌های نوبت‌دهی و اطلاع‌رسانی' },
  support: { title: 'مرکز پشتیبانی', subtitle: 'تیکت‌ها و درخواست‌های مدیران سالن' },
  operations: { title: 'سلامت سرور و سیستم', subtitle: 'پایش منابع سرور، کش و وضعیت وب‌سرویس‌ها' },
  security: { title: 'مرکز امنیت و لاگ‌ها', subtitle: 'لاگ‌های امنیتی، نشست‌های فعال و رویدادها' },
  settings: { title: 'تنظیمات هسته', subtitle: 'تنظیمات پلتفرم، کلیدهای ارتباطی و پیامک' },
  simulator: { title: 'شبیه‌ساز سالن', subtitle: 'پیش‌نمایش تعاملی اپلیکیشن مدیر سالن' },
};

export const Header: React.FC = React.memo(() => {
  const {
    activeTab,
    setActiveTab,
    salons,
    messages,
    tickets,
    setCommandPaletteOpen,
    setShortcutsModalOpen,
    setPersona,
    setMobileSidebarOpen,
  } = useAdmin();

  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const pendingSalons = salons.filter((s) => s.status === 'pending');
  const failedMessages = messages.filter((m) => m.status === 'failed' || m.status === 'retrying');
  const openTickets = tickets.filter((t) => t.status === 'open' || t.status === 'in_progress');
  const totalAlerts = pendingSalons.length + failedMessages.length + openTickets.length;

  const currentInfo = tabTitles[activeTab] || tabTitles.overview;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-5 py-2.5 sm:py-3 bg-[var(--bg-surface)] backdrop-blur-md border-b border-[var(--border-subtle)] text-[var(--text-primary)] transition-colors shadow-xs">
      {/* Zone 1: Contextual Breadcrumb & Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="md:hidden p-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subsurface)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer shrink-0"
          aria-label="باز کردن منوی مدیریت"
          title="منوی ناوبری پنل"
        >
          <Menu className="w-4 h-4" />
        </button>
        <div className="flex flex-col text-right truncate">
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs">
            <span className="font-bold text-[var(--text-secondary)]">پنل کل</span>
            <span aria-hidden="true" className="text-[var(--text-muted)]">/</span>
            <span className="text-[var(--brand-primary)] font-bold truncate">{currentInfo.title}</span>
          </div>
          <span className="hidden md:inline text-[11px] text-[var(--text-secondary)] mt-0.5 truncate">
            {currentInfo.subtitle}
          </span>
        </div>
      </div>

      {/* Zone 2: Instant Search Button */}
      <div className="flex items-center gap-2.5 max-w-md w-full justify-center">
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="w-full max-w-sm flex items-center justify-between gap-2 px-2.5 sm:px-3 py-1.5 text-xs text-[var(--text-secondary)] bg-[var(--bg-subsurface)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-xl transition-all cursor-pointer shadow-xs group"
          title="جستجو در بخش‌ها (Ctrl+K)"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--brand-primary)] transition-colors shrink-0" />
            <span className="truncate">جستجوی سالن، کاربر...</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-md text-[var(--text-muted)] font-mono shadow-inner">
            <Command className="w-2.5 h-2.5" /> K
          </kbd>
        </button>
      </div>

      {/* Zone 3: Actions, Theme Switcher & Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Prominent Theme Toggle in Admin Header */}
        <ThemeToggle variant="segmented" className="hidden sm:inline-flex" />
        <ThemeToggle variant="icon" className="sm:hidden" />

        {/* Keyboard Shortcuts Trigger Button */}
        <button
          onClick={() => setShortcutsModalOpen(true)}
          className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-subsurface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl transition-colors cursor-pointer hidden lg:flex items-center justify-center"
          title="کلیدهای میانبر (?)"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        {/* Switch to Salon Customer Website (Desktop only) */}
        <button
          onClick={() => setPersona('salon_website')}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-[var(--brand-border)] bg-[var(--brand-subdued)] hover:bg-[var(--brand-primary)] hover:text-white text-[var(--brand-primary)] transition-all cursor-pointer shadow-xs"
          title="مشاهده وب‌سایت اختصاصی رزرو سالن"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>وب‌سایت سالن</span>
        </button>

        {/* Switch to Salon Android App (Desktop only) */}
        <button
          onClick={() => setPersona('salon_app')}
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subsurface)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] transition-all cursor-pointer shadow-xs"
          title="مشاهده اپلیکیشن مدیر سالن"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>اپلیکیشن سالن</span>
        </button>

        {/* Notifications & Action Items */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-subsurface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl transition-colors cursor-pointer"
            aria-label="اعلان‌ها"
          >
            <Bell className="w-4 h-4" />
            {totalAlerts > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--brand-primary)] text-[10px] font-bold text-white shadow-xs tabular-nums">
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
              <div className="absolute left-0 mt-2 w-80 max-w-[92vw] z-50 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-xl p-4 divide-y divide-[var(--border-subtle)] animate-in fade-in zoom-in-95 duration-150 text-right">
                <div className="flex items-center justify-between pb-3">
                  <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                    رویدادهای نیازمند بررسی
                  </h4>
                  <span className="text-[11px] text-[var(--brand-primary)] font-semibold tabular-nums">
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
                      className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[var(--status-warning-bg)] border border-[var(--status-warning-border)] hover:opacity-90 cursor-pointer transition-colors"
                    >
                      <AlertTriangle className="w-4 h-4 text-[var(--status-warning)] shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-[var(--status-warning)]">
                          {toPersianDigits(pendingSalons.length)} سالن در انتظار بررسی
                        </p>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
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
                      className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[var(--status-error-bg)] border border-[var(--status-error-border)] hover:opacity-90 cursor-pointer transition-colors"
                    >
                      <RotateCcw className="w-4 h-4 text-[var(--status-error)] shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-[var(--status-error)]">
                          {toPersianDigits(failedMessages.length)} پیامک ناموفق
                        </p>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
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
                      className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[var(--status-info-bg)] border border-[var(--status-info-border)] hover:opacity-90 cursor-pointer transition-colors"
                    >
                      <Sparkles className="w-4 h-4 text-[var(--status-info)] shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-[var(--status-info)]">
                          {toPersianDigits(openTickets.length)} تیکت بدون پاسخ
                        </p>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                          درخواست‌های پشتیبانی سالن‌داران.
                        </p>
                      </div>
                    </div>
                  )}

                  {totalAlerts === 0 && (
                    <div className="text-center py-5 text-[var(--text-muted)] flex flex-col items-center gap-1.5">
                      <CheckCircle2 className="w-6 h-6 text-[var(--status-success)]" />
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
                    className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors w-full py-1 cursor-pointer"
                  >
                    مشاهده کنسول سلامت و لاگ‌های سرور
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Super Admin Identity Badge */}
        <div className="flex items-center gap-2.5 pr-2.5 border-r border-[var(--border-subtle)]">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-[var(--brand-primary)] flex items-center justify-center font-bold text-xs text-white shadow-xs">
              م‌غ
            </div>
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[var(--status-success)] border-2 border-[var(--bg-surface)]"
              title="احراز هویت دومرحله‌ای فعال"
            ></span>
          </div>
          <div className="hidden xl:flex flex-col text-right">
            <span className="text-xs font-bold text-[var(--text-primary)] leading-tight">
              مهدی غوریانی
            </span>
            <span className="text-[10px] text-[var(--status-success)] flex items-center gap-1 font-medium">
              <ShieldCheck className="w-2.5 h-2.5" /> ادمین اصلی
            </span>
          </div>
        </div>
      </div>
    </header>
  );
});
