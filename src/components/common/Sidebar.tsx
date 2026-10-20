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
  X,
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

export const Sidebar: React.FC = React.memo(() => {
  const {
    activeTab,
    setActiveTab,
    salons,
    messages,
    tickets,
    mobileSidebarOpen,
    setMobileSidebarOpen,
  } = useAdmin();
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
    <>
      <aside
        className={`relative z-20 hidden md:flex flex-col h-screen bg-[var(--bg-surface)] border-l border-[var(--border-subtle)] transition-all duration-300 select-none shrink-0 ${
          collapsed ? 'w-20' : 'w-60 md:w-64'
        }`}
      >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-[var(--brand-primary)] text-white flex items-center justify-center shadow-xs shrink-0">
            <Scissors className="w-5 h-5 transform -rotate-45" />
          </div>
          {!collapsed && (
            <div className="flex flex-col text-right truncate">
              <span className="text-sm font-bold text-[var(--text-primary)] truncate">
                نوبت‌آرا
              </span>
              <span className="text-[10px] text-[var(--text-secondary)] font-medium truncate">
                سامانه مدیریت کل
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
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
              <p className="px-3 mb-1.5 text-[10px] font-bold text-[var(--text-muted)]">
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
                      ? 'bg-[var(--brand-subdued)] text-[var(--brand-primary)] font-bold border border-[var(--brand-border)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] border border-transparent'
                  } ${collapsed ? 'justify-center px-0' : ''}`}
                  title={collapsed ? item.title : undefined}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-[var(--brand-primary)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'
                    }`}
                  />
                  {!collapsed && <span className="truncate flex-1 text-right">{item.title}</span>}

                  {!collapsed && item.badge !== undefined && (
                    <span
                      className={`px-1.5 py-0.2 text-[10px] font-bold rounded-full border tabular-nums ${
                        item.badgeType === 'error'
                          ? 'bg-[var(--status-error-bg)] text-[var(--status-error)] border-[var(--status-error-border)]'
                          : item.badgeType === 'warning'
                          ? 'bg-[var(--status-warning-bg)] text-[var(--status-warning)] border-[var(--status-warning-border)]'
                          : 'bg-[var(--status-info-bg)] text-[var(--status-info)] border-[var(--status-info-border)]'
                      }`}
                    >
                      {toPersianDigits(item.badge)}
                    </span>
                  )}

                  {collapsed && item.badge !== undefined && (
                    <span
                      className={`absolute top-2 left-2 w-2 h-2 rounded-full ${
                        item.badgeType === 'error'
                          ? 'bg-[var(--status-error)]'
                          : item.badgeType === 'warning'
                          ? 'bg-[var(--status-warning)]'
                          : 'bg-[var(--status-info)]'
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
      <div className="p-3 border-t border-[var(--border-subtle)] space-y-2 bg-[var(--bg-subsurface)]">
        {!collapsed ? (
          <ThemeToggle variant="switch" />
        ) : (
          <div className="flex justify-center">
            <ThemeToggle variant="icon" />
          </div>
        )}

        {!collapsed ? (
          <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] px-1 pt-1 border-t border-[var(--border-subtle)]">
            <span className="flex items-center gap-1.5 font-medium text-[var(--status-success)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-success)]" />
              سرور فعال
            </span>
            <span className="font-mono text-[10px] text-[var(--text-muted)] tabular-nums">نسخه ۲.۴</span>
          </div>
        ) : (
          <div className="flex justify-center pt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-success)]" title="سرور فعال" />
          </div>
        )}
      </div>
    </aside>

    {/* Mobile Slide-Over Drawer Navigation */}
    {mobileSidebarOpen && (
      <div
        className="md:hidden fixed inset-0 z-50 flex justify-end bg-[var(--bg-overlay)] backdrop-blur-xs animate-in fade-in duration-200"
        onClick={() => setMobileSidebarOpen(false)}
      >
        <div
          className="w-72 max-w-[85vw] h-full bg-[var(--bg-surface)] border-l border-[var(--border-subtle)] shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 text-right select-none"
          onClick={(e) => e.stopPropagation()}
          dir="rtl"
        >
          {/* Drawer Brand Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--brand-primary)] text-white flex items-center justify-center shadow-xs">
                <Scissors className="w-5 h-5 transform -rotate-45" />
              </div>
              <div className="flex flex-col text-right">
                <span className="text-sm font-bold text-[var(--text-primary)]">نوبت‌آرا</span>
                <span className="text-[10px] text-[var(--text-secondary)]">سامانه مدیریت کل</span>
              </div>
            </div>
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] cursor-pointer"
              aria-label="بستن منو"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links in Mobile Drawer */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
            {navGroups.map((group, groupIdx) => (
              <div key={groupIdx} className="space-y-1">
                <p className="px-3 mb-1.5 text-[10px] font-bold text-[var(--text-muted)]">
                  {group.label}
                </p>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setMobileSidebarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[var(--brand-subdued)] text-[var(--brand-primary)] font-bold border border-[var(--brand-border)] shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={`w-4 h-4 ${
                            isActive ? 'text-[var(--brand-primary)]' : 'text-[var(--text-muted)]'
                          }`}
                        />
                        <span>{item.title}</span>
                      </div>
                      {item.badge !== undefined && (
                        <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full border tabular-nums bg-[var(--brand-subdued)] text-[var(--brand-primary)] border-[var(--brand-border)]">
                          {toPersianDigits(item.badge)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Mobile Drawer Footer */}
          <div className="p-3 border-t border-[var(--border-subtle)] space-y-2 bg-[var(--bg-subsurface)]">
            <ThemeToggle variant="switch" />
            <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] px-1 pt-1 border-t border-[var(--border-subtle)]">
              <span className="flex items-center gap-1.5 font-medium text-[var(--status-success)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-success)]" />
                سرور فعال
              </span>
              <span className="font-mono text-[10px] text-[var(--text-muted)]">نسخه ۲.۴</span>
            </div>
          </div>
        </div>
      </div>
    )}
  </>
  );
});
