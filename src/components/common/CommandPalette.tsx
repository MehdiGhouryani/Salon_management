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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="fixed inset-0"
        onClick={() => setCommandPaletteOpen(false)}
      ></div>

      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[80vh]">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800">
          <Search className="w-5 h-5 text-rose-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجوی نام سالن، مدیر، کاربر، تیکت یا دستور کاری..."
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none text-right font-medium"
            autoFocus
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="p-1 text-slate-400 hover:text-white rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd
            onClick={() => setCommandPaletteOpen(false)}
            className="px-2 py-0.5 text-xs bg-slate-800 border border-slate-700 rounded text-slate-400 cursor-pointer"
          >
            Esc
          </kbd>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-3 space-y-4 text-xs divide-y divide-slate-800/60">
          {/* Quick Actions / Tabs */}
          {filteredItems.actions && filteredItems.actions.length > 0 && (
            <div className="pt-2 first:pt-0">
              <span className="text-[11px] font-bold text-slate-400 px-3 mb-1.5 block">
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
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800/80 text-slate-200 transition-colors text-right cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-rose-400" />
                        <span className="font-medium">{act.label}</span>
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Salons */}
          {filteredItems.salons && filteredItems.salons.length > 0 && (
            <div className="pt-3">
              <span className="text-[11px] font-bold text-slate-400 px-3 mb-1.5 block">
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
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800/80 text-slate-200 transition-colors text-right cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Store className="w-4 h-4 text-indigo-400 shrink-0" />
                      <div>
                        <p className="font-semibold text-slate-100">{salon.name}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          مدیر: {salon.ownerName} · {salon.city} · {salon.phone}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
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
              <span className="text-[11px] font-bold text-slate-400 px-3 mb-1.5 block">
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
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800/80 text-slate-200 transition-colors text-right cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <UserIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <p className="font-semibold text-slate-100">{usr.name}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {usr.email} · {usr.role}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                      مدیریت کاربر
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer tip */}
        <div className="px-4 py-2.5 bg-slate-950/60 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span>راهنما: کلید Esc جهت خروج</span>
          <span className="text-slate-400">جستجوی بلادرنگ در تمام پایگاه داده</span>
        </div>
      </div>
    </div>
  );
};
