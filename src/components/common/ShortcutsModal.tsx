import React from 'react';
import { Keyboard, Zap } from 'lucide-react';
import { useAdmin, AdminTab } from '../../context/AdminContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

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
    <Modal
      isOpen={shortcutsModalOpen}
      onClose={() => setShortcutsModalOpen(false)}
      title="کلیدهای میانبر ناوبری پرسرعت"
      description="جابجایی آنی میان بخش‌های سیستم بدون نیاز به ماوس"
      icon={<Keyboard className="w-4 h-4" />}
      size="md"
      footer={
        <div className="flex items-center justify-between w-full text-xs text-[var(--text-secondary)]">
          <span>نکته: کلیدهای عددی خارج از فیلدهای ورودی متن کار می‌کنند.</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShortcutsModalOpen(false)}
          >
            متوجه شدم
          </Button>
        </div>
      }
    >
      <div className="space-y-1.5 max-h-[55vh] overflow-y-auto pr-1">
        {shortcuts.map((sc, i) => (
          <div
            key={i}
            onClick={() => {
              if (sc.tab) {
                setActiveTab(sc.tab);
                setShortcutsModalOpen(false);
              }
            }}
            className={`flex items-center justify-between p-2.5 rounded-xl transition-colors text-xs ${
              sc.tab
                ? 'hover:bg-[var(--bg-elevated)] cursor-pointer text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] bg-[var(--bg-subsurface)] border border-[var(--border-subtle)]'
            }`}
          >
            <div className="flex items-center gap-2">
              {sc.tab && <Zap className="w-3.5 h-3.5 text-[var(--brand-primary)] shrink-0" />}
              <span className="font-medium">{sc.label}</span>
            </div>
            <kbd
              className="px-2 py-0.5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-md font-mono text-[11px] text-[var(--brand-primary)] font-bold shrink-0 shadow-xs"
              dir="ltr"
            >
              {sc.key}
            </kbd>
          </div>
        ))}
      </div>
    </Modal>
  );
};
