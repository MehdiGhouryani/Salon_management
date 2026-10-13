import React, { useState } from 'react';
import {
  LayoutDashboard,
  Store,
  Users,
  CreditCard,
  MessageSquare,
  HelpCircle,
  Activity,
  ShieldAlert,
  Settings,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  Scissors,
  CheckCircle,
  Keyboard,
} from 'lucide-react';
import { useAdmin, AdminTab } from '../../context/AdminContext';
import { toPersianDigits } from '../../utils/formatters';

interface NavItem {
  id: AdminTab;
  title: string;
  shortcut: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  badgeType?: 'warning' | 'error' | 'info';
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, salons, messages, tickets, setShortcutsModalOpen } = useAdmin();
  const [collapsed, setCollapsed] = useState(false);

  const pendingSalons = salons.filter((s) => s.status === 'pending').length;
  const failedMessages = messages.filter((m) => m.status === 'failed' || m.status === 'retrying').length;
  const openTickets = tickets.filter((t) => t.status === 'open' || t.status === 'in_progress').length;

  const navGroups: NavGroup[] = [
    {
      label: 'نظارت و مدیریت',
      items: [
        {
          id: 'overview',
          title: 'داشبورد نظارتی',
          shortcut: '1',
          icon: LayoutDashboard,
        },
        {
          id: 'businesses',
          title: 'سالن‌ها و کسب‌وکارها',
          shortcut: '2',
          icon: Store,
          badge: pendingSalons > 0 ? pendingSalons : undefined,
          badgeType: 'warning',
        },
        {
          id: 'users',
          title: 'کاربران و پرسنل',
          shortcut: '3',
          icon: Users,
        },
        {
          id: 'subscriptions',
          title: 'اشتراک‌ها و مالی',
          shortcut: '4',
          icon: CreditCard,
        },
      ],
    },
    {
      label: 'ارتباطات و زیرساخت',
      items: [
        {
          id: 'messages',
          title: 'پیامک و دیسپچ',
          shortcut: '5',
          icon: MessageSquare,
          badge: failedMessages > 0 ? failedMessages : undefined,
          badgeType: 'error',
        },
        {
          id: 'support',
          title: 'تیکت‌های پشتیبانی',
          shortcut: '6',
          icon: HelpCircle,
          badge: openTickets > 0 ? openTickets : undefined,
          badgeType: 'info',
        },
        {
          id: 'operations',
          title: 'سلامت سرور و کش',
          shortcut: '7',
          icon: Activity,
        },
      ],
    },
    {
      label: 'امنیت و تنظیمات',
      items: [
        {
          id: 'security',
          title: 'امنیت و لاگ‌ها',
          shortcut: '8',
          icon: ShieldAlert,
        },
        {
          id: 'settings',
          title: 'تنظیمات هسته',
          shortcut: '9',
          icon: Settings,
        },
      ],
    },
    {
      label: 'شبیه‌ساز زنده',
      items: [
        {
          id: 'simulator',
          title: 'دستیار سالن (موبایل)',
          shortcut: '0',
          icon: Smartphone,
        },
      ],
    },
  ];

  return (
    <aside
      className={`relative z-20 flex flex-col h-screen bg-[#070A11] border-l border-slate-800/80 transition-all duration-300 select-none ${
        collapsed ? 'w-20' : 'w-64 md:w-72'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-600/25 shrink-0">
            <Scissors className="w-5 h-5 text-white transform -rotate-45" />
          </div>
          {!collapsed && (
            <div className="flex flex-col text-right truncate">
              <span className="text-sm font-bold tracking-tight text-white truncate">
                سالن‌دستیار مرکزی
              </span>
              <span className="text-[10px] text-slate-400 font-medium truncate">
                پنل مدیریت ادمین اصلی
              </span>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          title={collapsed ? 'گسترش منو' : 'جمع کردن منو'}
        >
          {collapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-1">
            {!collapsed && (
              <p className="px-3 mb-2 text-[10px] font-bold text-slate-400 tracking-wider">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer group relative ${
                    isActive
                      ? 'bg-rose-500/15 text-rose-300 font-bold border border-rose-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/90 border border-transparent'
                  } ${collapsed ? 'justify-center px-0' : ''}`}
                  title={collapsed ? `${item.title} (کلید ${item.shortcut})` : undefined}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-rose-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  {!collapsed && <span className="truncate flex-1 text-right">{item.title}</span>}

                  {/* Badges */}
                  {!collapsed && item.badge !== undefined && (
                    <span
                      className={`px-1.5 py-0.2 text-[10px] font-bold rounded-full border ${
                        item.badgeType === 'error'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          : item.badgeType === 'warning'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                      }`}
                    >
                      {toPersianDigits(item.badge)}
                    </span>
                  )}

                  {/* Quick keyboard shortcut pill */}
                  {!collapsed && (
                    <kbd className="opacity-0 group-hover:opacity-70 transition-opacity text-[10px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      {item.shortcut}
                    </kbd>
                  )}

                  {/* Collapsed Badge Dot */}
                  {collapsed && item.badge !== undefined && (
                    <span
                      className={`absolute top-2 left-2 w-2 h-2 rounded-full ${
                        item.badgeType === 'error'
                          ? 'bg-rose-400'
                          : item.badgeType === 'warning'
                          ? 'bg-amber-400'
                          : 'bg-sky-400'
                      }`}
                    ></span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer Info & Shortcuts Prompt */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/80">
        {!collapsed ? (
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1.5 py-1">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <CheckCircle className="w-3.5 h-3.5" /> نسخه ۲.۵ (پایدار)
            </span>
            <button
              onClick={() => setShortcutsModalOpen(true)}
              className="text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
              title="مشاهده تمام کلیدهای میانبر"
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>کلیدها [?]</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShortcutsModalOpen(true)}
            className="flex justify-center w-full text-slate-400 hover:text-white py-1 cursor-pointer"
            title="کلیدهای میانبر (?)"
          >
            <Keyboard className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
};
