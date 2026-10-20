import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  Store,
  User as UserIcon,
  HelpCircle,
  Shield,
  Activity,
  CreditCard,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';
import { useAdmin, AdminTab } from '../../context/AdminContext';

export const CommandPalette: React.FC = () => {
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    setActiveTab,
    salons,
    users,
    tickets,
    setInspectedSalon,
  } = useAdmin();

  const [search, setSearch] = useState('');

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return {
        actions: [
          { label: 'داشبورد جامع نظارتی', tab: 'overview' as AdminTab, icon: Activity },
          { label: 'بررسی سالن‌های در انتظار تایید', tab: 'businesses' as AdminTab, icon: Store },
          { label: 'مشاهده کاربران و پرسنل', tab: 'users' as AdminTab, icon: UserIcon },
          { label: 'مدیریت پیامک‌های در صف و خطاها', tab: 'messages' as AdminTab, icon: MessageSquare },
          { label: 'مشاهده تیکت‌های پشتیبانی باز', tab: 'support' as AdminTab, icon: HelpCircle },
          { label: 'لاگ‌های امنیتی و فایروال', tab: 'security' as AdminTab, icon: Shield },
          { label: 'پیش‌نمایش اپلیکیشن سالن (شبیه‌ساز)', tab: 'simulator' as AdminTab, icon: Store },
        ],
        salons: salons.slice(0, 4),
        users: users.slice(0, 3),
      };
    }

    return {
      actions: [
        { label: 'رفتن به بخش سالن‌ها', tab: 'businesses' as AdminTab, icon: Store },
        { label: 'رفتن به بخش مالی و پلن‌ها', tab: 'subscriptions' as AdminTab, icon: CreditCard },
        { label: 'رفتن به لاگ‌های امنیتی', tab: 'security' as AdminTab, icon: Shield },
      ].filter((a) => a.label.toLowerCase().includes(q)),
      salons: salons.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.ownerName.toLowerCase().includes(q) ||
          s.city.toLowerCase().includes(q) ||
          s.phone.includes(q)
      ),
      users: users.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.phone.includes(q)
      ),
      tickets: tickets.filter(
        (t) =>
          t.subject.toLowerCase().includes(q) ||
          t.salonName.toLowerCase().includes(q) ||
          t.ticketNumber.toLowerCase().includes(q)
      ),
    };
  }, [search, salons, users, tickets]);

  if (!commandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-[var(--bg-overlay)] backdrop-blur-xs animate-in fade-in duration-150" dir="rtl">
      <div
        className="fixed inset-0"
        onClick={() => setCommandPaletteOpen(false)}
      ></div>

      <div className="relative w-full max-w-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[80vh] text-[var(--text-primary)]">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--border-subtle)]">
          <Search className="w-5 h-5 text-[var(--brand-primary)] shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجوی نام سالن، مدیر، کاربر، تیکت یا دستور کاری..."
            className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none text-right font-medium"
            autoFocus
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd
            onClick={() => setCommandPaletteOpen(false)}
            className="px-2 py-0.5 text-xs bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded text-[var(--text-muted)] cursor-pointer"
          >
            Esc
          </kbd>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-3 space-y-4 text-xs divide-y divide-[var(--border-subtle)]">
          {/* Quick Actions / Tabs */}
          {filteredItems.actions && filteredItems.actions.length > 0 && (
            <div className="pt-2 first:pt-0">
              <span className="text-[11px] font-bold text-[var(--text-muted)] px-3 mb-1.5 block">
                بخش‌های ناوبری و اقدامات
              </span>
              <div className="space-y-1">
                {filteredItems.actions.map((act, idx) => {
                  const Icon = act.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setActiveTab(act.tab);
                        setCommandPaletteOpen(false);
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] transition-colors text-right cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-[var(--brand-primary)]" />
                        <span className="font-medium">{act.label}</span>
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Salons */}
          {filteredItems.salons && filteredItems.salons.length > 0 && (
            <div className="pt-3">
              <span className="text-[11px] font-bold text-[var(--text-muted)] px-3 mb-1.5 block">
                سالن‌ها و کسب‌وکارها ({filteredItems.salons.length})
              </span>
              <div className="space-y-1">
                {filteredItems.salons.map((salon) => (
                  <button
                    key={salon.id}
                    onClick={() => {
                      setActiveTab('businesses');
                      setInspectedSalon(salon);
                      setCommandPaletteOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] transition-colors text-right cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Store className="w-4 h-4 text-[var(--status-info)] shrink-0" />
                      <div>
                        <p className="font-semibold text-[var(--text-primary)]">{salon.name}</p>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                          مدیر: {salon.ownerName} · {salon.city} · <span className="font-mono tabular-nums">{salon.phone}</span>
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-subsurface)] text-[var(--text-secondary)] border border-[var(--border-subtle)] font-medium">
                      مشاهده جزئیات
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Users */}
          {filteredItems.users && filteredItems.users.length > 0 && (
            <div className="pt-3">
              <span className="text-[11px] font-bold text-[var(--text-muted)] px-3 mb-1.5 block">
                کاربران و پرسنل ({filteredItems.users.length})
              </span>
              <div className="space-y-1">
                {filteredItems.users.map((usr) => (
                  <button
                    key={usr.id}
                    onClick={() => {
                      setActiveTab('users');
                      setCommandPaletteOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] transition-colors text-right cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <UserIcon className="w-4 h-4 text-[var(--status-success)] shrink-0" />
                      <div>
                        <p className="font-semibold text-[var(--text-primary)]">{usr.name}</p>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                          {usr.email} · {usr.role}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-subsurface)] text-[var(--text-secondary)] border border-[var(--border-subtle)] font-medium">
                      مدیریت کاربر
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer tip */}
        <div className="px-4 py-2.5 bg-[var(--bg-subsurface)] border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] flex items-center justify-between">
          <span>راهنما: کلید Esc جهت خروج</span>
          <span className="text-[var(--text-muted)]">جستجوی بلادرنگ در تمام پایگاه داده</span>
        </div>
      </div>
    </div>
  );
};
