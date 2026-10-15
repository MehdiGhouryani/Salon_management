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
  Sparkles,
} from 'lucide-react';
import { useAdmin, AdminTab } from '../../context/AdminContext';
import { toPersianDigits } from '../../utils/formatters';
import { ThemeToggle } from './ThemeToggle';

interface NavItem {
  id: AdminTab;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  badgeType?: 'warning' | 'error' | 'info';
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, salons, messages, tickets } = useAdmin();
  const [collapsed, setCollapsed] = useState(false);

  const pendingSalons = salons.filter((s) => s.status === 'pending').length;
  const failedMessages = messages.filter((m) => m.status === 'failed' || m.status === 'retrying').length;
  const openTickets = tickets.filter((t) => t.status === 'open' || t.status === 'in_progress').length;

  const navGroups: NavGroup[] = [
    {
      label: 'مدیریت و نظارت',
      items: [
        {
          id: 'overview',
          title: 'داشبورد کلی',
          icon: LayoutDashboard,
        },
        {
          id: 'businesses',
          title: 'سالن‌ها و مراکز',
          icon: Store,
          badge: pendingSalons > 0 ? pendingSalons : undefined,
          badgeType: 'warning',
        },
        {
          id: 'users',
          title: 'کاربران و پرسنل',
          icon: Users,
        },
        {
          id: 'subscriptions',
          title: 'مالی و اشتراک‌ها',
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
          icon: MessageSquare,
          badge: failedMessages > 0 ? failedMessages : undefined,
          badgeType: 'error',
        },
        {
          id: 'support',
          title: 'مرکز پشتیبانی',
          icon: HelpCircle,
          badge: openTickets > 0 ? openTickets : undefined,
          badgeType: 'info',
        },
        {
          id: 'operations',
          title: 'سلامت سیستم',
          icon: Activity,
        },
        {
          id: 'security',
          title: 'امنیت و لاگ‌ها',
          icon: ShieldAlert,
        },
      ],
    },
    {
      label: 'ابزارها',
      items: [
        {
          id: 'simulator',
          title: 'شبیه‌ساز سالن',
          icon: Smartphone,
        },
        {
          id: 'settings',
          title: 'تنظیمات',
          icon: Settings,
        },
      ],
    },
  ];

  return (
    <aside
      className={`relative z-20 flex flex-col h-screen bg-white dark:bg-[#0F172A] border-l border-slate-200 dark:border-slate-800 transition-all duration-300 select-none ${
        collapsed ? 'w-20' : 'w-60 md:w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-l from-rose-600 to-pink-600 text-white flex items-center justify-center shadow-md shadow-rose-500/20 shrink-0">
            <Scissors className="w-5 h-5 transform -rotate-45" />
          </div>
          {!collapsed && (
            <div className="flex flex-col text-right truncate">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                نوبت‌آرا
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
                سامانه مدیریت کل
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title={collapsed ? 'گسترش منو' : 'جمع کردن منو'}
        >
          {collapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {navGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-1">
            {!collapsed && (
              <p className="px-3 mb-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500">
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
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer group relative ${
                    isActive
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold border border-rose-500/30 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
                  } ${collapsed ? 'justify-center px-0' : ''}`}
                  title={collapsed ? item.title : undefined}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                    }`}
                  />
                  {!collapsed && <span className="truncate flex-1 text-right">{item.title}</span>}

                  {!collapsed && item.badge !== undefined && (
                    <span
                      className={`px-1.5 py-0.2 text-[10px] font-bold rounded-full border ${
                        item.badgeType === 'error'
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                          : item.badgeType === 'warning'
                          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                          : 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20'
                      }`}
                    >
                      {toPersianDigits(item.badge)}
                    </span>
                  )}

                  {collapsed && item.badge !== undefined && (
                    <span
                      className={`absolute top-2 left-2 w-2 h-2 rounded-full ${
                        item.badgeType === 'error'
                          ? 'bg-rose-500'
                          : item.badgeType === 'warning'
                          ? 'bg-amber-500'
                          : 'bg-sky-500'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Dedicated Theme Switcher & Footer in Sidebar */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-[#0A0F1D]/60">
        {!collapsed ? (
          <ThemeToggle variant="switch" />
        ) : (
          <div className="flex justify-center">
            <ThemeToggle variant="icon" />
          </div>
        )}

        {!collapsed ? (
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
            <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              سرور فعال
            </span>
            <span className="font-mono text-[10px] text-slate-400">نسخه ۲.۴</span>
          </div>
        ) : (
          <div className="flex justify-center pt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" title="سرور فعال" />
          </div>
        )}
      </div>
    </aside>
  );
};
