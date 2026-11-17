import React from 'react';
import { Calendar, Scissors, Store, User, MessageSquare, QrCode, Sun, Moon } from 'lucide-react';
import { Avatar } from '../ui/Avatar';

export type SalonTab = 'appointments' | 'services' | 'showcase' | 'profile' | 'support';

const NAV: { id: SalonTab; label: string; icon: React.ElementType }[] = [
  { id: 'appointments', label: 'نوبت‌ها', icon: Calendar },
  { id: 'services', label: 'خدمات', icon: Scissors },
  { id: 'showcase', label: 'ویترین', icon: Store },
  { id: 'profile', label: 'پروفایل', icon: User },
  { id: 'support', label: 'پشتیبانی', icon: MessageSquare },
];

interface SalonShellProps {
  salonName: string;
  salonCity?: string;
  activeTab: SalonTab;
  onTabChange: (tab: SalonTab) => void;
  onOpenQr: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  supportEnabled?: boolean;
  children: React.ReactNode;
}

/**
 * The salon app as a real responsive app: a full-height page on a phone (top bar + four tabs at
 * the thumb, clear of the home indicator) and a labelled sidebar from `md` up. It used to be a
 * 490px scroll box drawn inside a fake phone, on phones and desktops alike.
 */
export const SalonShell: React.FC<SalonShellProps> = ({
  salonName,
  salonCity,
  activeTab,
  onTabChange,
  onOpenQr,
  isDark,
  onToggleTheme,
  supportEnabled = false,
  children,
}) => {
  const navItems = supportEnabled ? NAV : NAV.filter((item) => item.id !== 'support');
  const mobileGridClass = supportEnabled ? 'grid-cols-5' : 'grid-cols-4';
  return (
  <div dir="rtl" className="min-h-dvh bg-[var(--bg-canvas)] text-[var(--text-primary)] md:flex">
    <aside
      className="hidden md:flex md:flex-col md:w-60 md:shrink-0 md:sticky md:top-0 md:h-dvh border-e border-[var(--border-default)] px-3 py-5 gap-6"
      aria-label="منوی سالن"
    >
      <div className="flex items-center gap-3 px-2">
        <Avatar name={salonName} size={36} />
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{salonName}</div>
          {salonCity && <div className="text-xs text-[var(--text-muted)]">{salonCity}</div>}
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map(({ id, label, icon: Icon }) => {
          const active = id === activeTab;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 h-10 px-3 rounded-xl text-sm transition-colors cursor-pointer ${
                active
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={active ? 2.25 : 1.75} />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-1">
        <button
          type="button"
          onClick={onOpenQr}
          className="flex items-center gap-3 h-10 px-3 rounded-xl text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
        >
          <QrCode className="w-4 h-4 shrink-0" strokeWidth={1.75} />
          کد QR و لینک سالن
        </button>
        <button
          type="button"
          onClick={onToggleTheme}
          className="flex items-center gap-3 h-10 px-3 rounded-xl text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
        >
          {isDark ? (
            <Sun className="w-4 h-4 shrink-0" strokeWidth={1.75} />
          ) : (
            <Moon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
          )}
          {isDark ? 'حالت روز' : 'حالت شب'}
        </button>
      </div>
    </aside>

    <div className="flex-1 min-w-0">
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between gap-3 ps-4 pe-2 h-14 bg-[var(--bg-surface)] border-b border-[var(--border-default)]">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar name={salonName} size={28} />
          <span className="text-sm font-semibold truncate">{salonName}</span>
        </div>
        <button
          type="button"
          onClick={onOpenQr}
          aria-label="کد QR و لینک سالن"
          className="w-11 h-11 flex items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
        >
          <QrCode className="w-5 h-5" strokeWidth={1.75} />
        </button>
      </header>

      <main className="w-full max-w-3xl mx-auto px-4 sm:px-6 md:px-8 pt-5 md:pt-8 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-12">
        {children}
      </main>
    </div>

    <nav
      className="md:hidden fixed inset-x-0 bottom-0 z-30 bg-[var(--bg-surface)] border-t border-[var(--border-default)] pb-[env(safe-area-inset-bottom)]"
      aria-label="بخش‌های برنامه"
    >
      <div className={"grid " + mobileGridClass}>
        {navItems.map(({ id, label, icon: Icon }) => {
          const active = id === activeTab;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              aria-current={active ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center gap-1 min-h-[56px] text-xs cursor-pointer ${
                active ? 'text-[var(--text-primary)] font-semibold' : 'text-[var(--text-muted)]'
              }`}
            >
              {active && (
                <span className="absolute top-0 h-0.5 w-8 rounded-full bg-[var(--text-primary)]" />
              )}
              <Icon className="w-5 h-5" strokeWidth={active ? 2.25 : 1.75} />
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  </div>
  );
};
