import React from 'react';
import { Keyboard, X, Zap, ArrowRight } from 'lucide-react';
import { useAdmin, AdminTab } from '../../context/AdminContext';

export const ShortcutsModal: React.FC = () => {
  const { shortcutsModalOpen, setShortcutsModalOpen, setActiveTab } = useAdmin();

  if (!shortcutsModalOpen) return null;

  const shortcuts: { key: string; label: string; tab?: AdminTab }[] = [
    { key: '⌘ / Ctrl + K', label: 'جستجوی بلادرنگ سراسری (Command Palette)' },
    { key: '?', label: 'نمایش همین پنجره راهنمای کلیدهای میانبر' },
    { key: 'Esc', label: 'بستن منوها، مودال‌ها و کشوی جزئیات' },
    { key: '1', label: 'انتقال سریع به داشبورد نظارتی', tab: 'overview' },
    { key: '2', label: 'انتقال سریع به سالن‌ها و کسب‌وکارها', tab: 'businesses' },
    { key: '3', label: 'انتقال سریع به کاربران و پرسنل', tab: 'users' },
    { key: '4', label: 'انتقال سریع به مالی و اشتراک‌ها', tab: 'subscriptions' },
    { key: '5', label: 'انتقال سریع به مرکز دیسپچ و پیامک', tab: 'messages' },
    { key: '6', label: 'انتقال سریع به مرکز تیکت‌ها و پشتیبانی', tab: 'support' },
    { key: '7', label: 'انتقال سریع به سلامت و عملیات سیستم', tab: 'operations' },
    { key: '8', label: 'انتقال سریع به امنیت و لاگ‌ها', tab: 'security' },
    { key: '9', label: 'انتقال سریع به تنظیمات هسته سیستم', tab: 'settings' },
    { key: '0', label: 'انتقال سریع به شبیه‌ساز دستیار سالن', tab: 'simulator' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={() => setShortcutsModalOpen(false)}></div>

      <div className="relative w-full max-w-lg bg-white dark:bg-[#111B2E] border border-slate-200 dark:border-[#344258] rounded-2xl shadow-2xl p-6 z-10 text-right space-y-4 text-xs text-slate-900 dark:text-[#E7ECF5]">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#344258]">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-500/10 text-rose-500 dark:text-[#F43F7A] rounded-xl border border-rose-500/20">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-[#E7ECF5] text-sm">کلیدهای میانبر ناوبری پرسرعت</h3>
              <p className="text-[11px] text-slate-500 dark:text-[#9AAAC2]">جابجایی آنی میان بخش‌های سیستم بدون نیاز به ماوس</p>
            </div>
          </div>
          <button
            onClick={() => setShortcutsModalOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-[#E7ECF5] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
          {shortcuts.map((sc, i) => (
            <div
              key={i}
              onClick={() => {
                if (sc.tab) {
                  setActiveTab(sc.tab);
                  setShortcutsModalOpen(false);
                }
              }}
              className={`flex items-center justify-between p-2 rounded-xl transition-colors ${
                sc.tab
                  ? 'hover:bg-slate-100 dark:hover:bg-[#18243A] cursor-pointer text-slate-800 dark:text-[#E7ECF5]'
                  : 'text-slate-600 dark:text-[#9AAAC2] bg-slate-50 dark:bg-[#18243A]/50 border border-slate-200/50 dark:border-[#344258]/50'
              }`}
            >
              <div className="flex items-center gap-2">
                {sc.tab && <Zap className="w-3.5 h-3.5 text-rose-500 dark:text-[#F43F7A]" />}
                <span className="font-medium">{sc.label}</span>
              </div>
              <kbd className="px-2 py-0.5 bg-slate-100 dark:bg-[#18243A] border border-slate-200 dark:border-[#344258] rounded-md font-mono text-[11px] text-rose-600 dark:text-[#FB7185] font-bold shrink-0 shadow-xs" dir="ltr">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-[#344258] text-[11px] text-slate-500 dark:text-[#9AAAC2] text-center flex items-center justify-between">
          <span>نکته: کلیدهای عددی خارج از فیلدهای ورودی متن کار می‌کنند.</span>
          <button
            onClick={() => setShortcutsModalOpen(false)}
            className="px-3 py-1 bg-slate-100 dark:bg-[#18243A] text-slate-700 dark:text-[#E7ECF5] border border-slate-200 dark:border-[#344258] rounded-lg hover:bg-slate-200 dark:hover:bg-[#18243A]/80 transition-colors cursor-pointer"
          >
            متوجه شدم
          </button>
        </div>
      </div>
    </div>
  );
};
