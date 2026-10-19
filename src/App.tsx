/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AdminProvider, useAdmin, AdminTab } from './context/AdminContext';
import { ThemeProvider } from './context/ThemeContext';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { CommandPalette } from './components/common/CommandPalette';
import { ToastContainer } from './components/common/ToastContainer';
import { ShortcutsModal } from './components/common/ShortcutsModal';
import { ThemeToggle } from './components/common/ThemeToggle';

import { OverviewView } from './components/views/OverviewView';
import { BusinessesView } from './components/views/BusinessesView';
import { UsersView } from './components/views/UsersView';
import { SubscriptionsView } from './components/views/SubscriptionsView';
import { MessagesView } from './components/views/MessagesView';
import { SupportView } from './components/views/SupportView';
import { OperationsView } from './components/views/OperationsView';
import { SecurityView } from './components/views/SecurityView';
import { SettingsView } from './components/views/SettingsView';
import { SalonSimulatorView } from './components/views/SalonSimulatorView';

import { SalonWebsiteView } from './components/customer/SalonWebsiteView';
import { SalonAppView } from './components/views/SalonAppView';
import {
  Globe,
  Smartphone,
  Shield,
  LayoutDashboard,
  Store,
  Users as UsersIcon,
  CreditCard,
  Sliders,
  MessageSquare,
  HelpCircle,
  Activity,
  ShieldAlert,
  Settings as SettingsIcon,
  Layers,
  Check,
  X,
  Loader2,
  LogOut,
} from 'lucide-react';
import { ProductionAdminLogin } from './components/common/ProductionAdminLogin';


type MainCategory = 'overview' | 'businesses' | 'users' | 'finance' | 'system';

const AdminLayout: React.FC = () => {
  const { activeTab, setActiveTab, salons, messages, tickets, isDemoMode, serverAuth, serverLogout } = useAdmin();

  const pendingSalons = salons.filter((s) => s.status === 'pending').length;
  const failedMessages = messages.filter((m) => m.status === 'failed' || m.status === 'retrying').length;
  const openTickets = tickets.filter((t) => t.status === 'open' || t.status === 'in_progress').length;

  // Map individual tab to main category
  const getCurrentCategory = (): MainCategory => {
    if (activeTab === 'overview') return 'overview';
    if (activeTab === 'businesses') return 'businesses';
    if (activeTab === 'users') return 'users';
    if (activeTab === 'subscriptions' || activeTab === 'messages') return 'finance';
    return 'system';
  };

  const currentCategory = getCurrentCategory();

  interface CategoryItem {
    id: MainCategory;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    defaultTab: AdminTab;
    badge?: number;
    badgeType?: 'warning' | 'error' | 'info';
  }

  // 5 Streamlined Core Categories
  const categories: CategoryItem[] = [
    {
      id: 'overview',
      label: 'داشبورد و شاخص‌ها',
      icon: LayoutDashboard,
      defaultTab: 'overview',
      badge: undefined,
    },
    {
      id: 'businesses',
      label: 'سالن‌ها و مراکز',
      icon: Store,
      defaultTab: 'businesses',
      badge: pendingSalons > 0 ? pendingSalons : undefined,
      badgeType: 'warning',
    },
    {
      id: 'users',
      label: 'کاربران و پرسنل',
      icon: UsersIcon,
      defaultTab: 'users',
      badge: undefined,
    },
    {
      id: 'finance',
      label: 'مالی و پیامک',
      icon: CreditCard,
      defaultTab: (activeTab === 'messages' ? 'messages' : 'subscriptions') as AdminTab,
      badge: failedMessages > 0 ? failedMessages : undefined,
      badgeType: 'error',
    },
    {
      id: 'system',
      label: 'عملیات و ابزارها',
      icon: Sliders,
      defaultTab: (['support', 'operations', 'security', 'settings', 'simulator'].includes(activeTab)
        ? activeTab
        : 'operations') as AdminTab,
      badge: openTickets > 0 ? openTickets : undefined,
      badgeType: 'info',
    },
  ];

  const handleCategorySelect = (cat: CategoryItem) => {
    setActiveTab(cat.defaultTab);
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewView />;
      case 'businesses':
        return <BusinessesView />;
      case 'users':
        return <UsersView />;
      case 'subscriptions':
        return <SubscriptionsView />;
      case 'messages':
        return <MessagesView />;
      case 'support':
        return <SupportView />;
      case 'operations':
        return <OperationsView />;
      case 'security':
        return <SecurityView />;
      case 'settings':
        return <SettingsView />;
      case 'simulator':
        return <SalonSimulatorView />;
      default:
        return <OverviewView />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-[#E7ECF5] overflow-hidden font-sans antialiased transition-colors duration-200" dir="rtl">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header Contract */}
        <Header />

        {/* Scrollable Content Body */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 bg-slate-50 dark:bg-[#0B1120]">
          <div className="max-w-7xl mx-auto space-y-5">
            {/* 1. Primary Clean Category Tabs Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-1.5 bg-white dark:bg-[#111B2E] border border-slate-200/90 dark:border-[#344258] rounded-2xl shadow-xs">
              <div className="flex items-center gap-1.5 overflow-x-auto p-0.5 select-none scrollbar-none">
                {categories.map((cat) => {
                  const isSelected = currentCategory === cat.id;
                  const Icon = cat.icon;

                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleCategorySelect(cat)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-rose-50 dark:bg-[#F43F7A]/15 text-[#E11D48] dark:text-[#FB7185] font-bold border border-rose-300 dark:border-[#F43F7A]/30 shadow-xs'
                          : 'text-slate-600 dark:text-[#9AAAC2] hover:text-slate-900 dark:hover:text-[#E7ECF5] hover:bg-slate-100 dark:hover:bg-[#18243A] border border-transparent'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-[#E11D48] dark:text-[#F43F7A]' : 'text-slate-400 dark:text-[#9AAAC2]'}`} />
                      <span>{cat.label}</span>
                      {cat.badge !== undefined && (
                        <span
                          className={`px-1.5 py-0.2 text-[10px] font-bold rounded-full border tabular-nums ${
                            cat.badgeType === 'error'
                              ? 'bg-rose-500/10 text-rose-600 dark:text-[#FB7185] border-rose-500/20'
                              : cat.badgeType === 'warning'
                              ? 'bg-amber-500/10 text-amber-700 dark:text-[#FBBF24] border-amber-500/20'
                              : 'bg-sky-500/10 text-sky-700 dark:text-[#38BDF8] border-sky-500/20'
                          }`}
                        >
                          {cat.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Quick Persona / Auth Indicators */}
              <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 dark:text-[#9AAAC2] pl-2">
                {serverAuth.authenticated && !isDemoMode ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      مدیر کل: {serverAuth.user?.fullName} ({serverAuth.user?.phone})
                    </span>
                    <button
                      onClick={() => serverLogout()}
                      className="px-2 py-1 text-[11px] rounded-lg bg-slate-100 dark:bg-[#1E293B] hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-[#334155] transition-colors flex items-center gap-1 cursor-pointer"
                      title="خروج از حساب مدیر"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>خروج</span>
                    </button>
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/20 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    پیش‌نمایش آزمایشی (داده‌های سنتتیک دمو)
                  </span>
                )}
              </div>
            </div>

            {/* 2. Sub-Category Selector for Multi-tool groups */}
            {currentCategory === 'finance' && (
              <div className="flex items-center gap-2 p-1 bg-white/80 dark:bg-[#111B2E]/90 backdrop-blur-xs border border-slate-200 dark:border-[#344258] rounded-xl w-fit text-xs">
                <button
                  onClick={() => setActiveTab('subscriptions')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    activeTab === 'subscriptions'
                      ? 'bg-slate-900 text-white dark:bg-[#18243A] dark:text-[#E7ECF5] border border-slate-900 dark:border-[#344258] shadow-xs font-bold'
                      : 'text-slate-600 dark:text-[#9AAAC2] hover:text-slate-900 dark:hover:text-[#E7ECF5]'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>اشتراک‌ها، بسته‌ها و تراکنش‌ها</span>
                </button>
                <button
                  onClick={() => setActiveTab('messages')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    activeTab === 'messages'
                      ? 'bg-slate-900 text-white dark:bg-[#18243A] dark:text-[#E7ECF5] border border-slate-900 dark:border-[#344258] shadow-xs font-bold'
                      : 'text-slate-600 dark:text-[#9AAAC2] hover:text-slate-900 dark:hover:text-[#E7ECF5]'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>مرکز پیامک و دیسپچ نوبت‌ها</span>
                  {failedMessages > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-600 dark:text-[#FB7185] text-[10px] font-bold tabular-nums">
                      {failedMessages}
                    </span>
                  )}
                </button>
              </div>
            )}

            {currentCategory === 'system' && (
              <div className="flex items-center gap-1.5 p-1 bg-white/80 dark:bg-[#111B2E]/90 backdrop-blur-xs border border-slate-200 dark:border-[#344258] rounded-xl w-fit overflow-x-auto text-xs">
                <button
                  onClick={() => setActiveTab('operations')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    activeTab === 'operations'
                      ? 'bg-slate-900 text-white dark:bg-[#18243A] dark:text-[#E7ECF5] border border-slate-900 dark:border-[#344258] shadow-xs font-bold'
                      : 'text-slate-600 dark:text-[#9AAAC2] hover:text-slate-900 dark:hover:text-[#E7ECF5]'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>سلامت سیستم و منابع سرور</span>
                </button>
                <button
                  onClick={() => setActiveTab('security')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    activeTab === 'security'
                      ? 'bg-slate-900 text-white dark:bg-[#18243A] dark:text-[#E7ECF5] border border-slate-900 dark:border-[#344258] shadow-xs font-bold'
                      : 'text-slate-600 dark:text-[#9AAAC2] hover:text-slate-900 dark:hover:text-[#E7ECF5]'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>امنیت، رویدادها و لاگ‌ها</span>
                </button>
                <button
                  onClick={() => setActiveTab('support')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    activeTab === 'support'
                      ? 'bg-slate-900 text-white dark:bg-[#18243A] dark:text-[#E7ECF5] border border-slate-900 dark:border-[#344258] shadow-xs font-bold'
                      : 'text-slate-600 dark:text-[#9AAAC2] hover:text-slate-900 dark:hover:text-[#E7ECF5]'
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>مرکز پشتیبانی و تیکت‌ها</span>
                  {openTickets > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-sky-500/20 text-sky-700 dark:text-[#38BDF8] text-[10px] font-bold tabular-nums">
                      {openTickets}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    activeTab === 'settings'
                      ? 'bg-slate-900 text-white dark:bg-[#18243A] dark:text-[#E7ECF5] border border-slate-900 dark:border-[#344258] shadow-xs font-bold'
                      : 'text-slate-600 dark:text-[#9AAAC2] hover:text-slate-900 dark:hover:text-[#E7ECF5]'
                  }`}
                >
                  <SettingsIcon className="w-3.5 h-3.5" />
                  <span>تنظیمات هسته</span>
                </button>
                <button
                  onClick={() => setActiveTab('simulator')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    activeTab === 'simulator'
                      ? 'bg-slate-900 text-white dark:bg-[#18243A] dark:text-[#E7ECF5] border border-slate-900 dark:border-[#344258] shadow-xs font-bold'
                      : 'text-slate-600 dark:text-[#9AAAC2] hover:text-slate-900 dark:hover:text-[#E7ECF5]'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>شبیه‌ساز سالن</span>
                </button>
              </div>
            )}

            {/* 3. The Active Decluttered View */}
            {renderActiveView()}
          </div>
        </main>
      </div>

      {/* Global Modals & Overlays */}
      <CommandPalette />
      <ToastContainer />
      <ShortcutsModal />
    </div>
  );
};

const MainSwitcher: React.FC = () => {
  const { persona, setPersona, isDemoMode, serverAuth, serverLogout } = useAdmin();
  const [mobilePersonaOpen, setMobilePersonaOpen] = useState(false);
  const [isPillCollapsed, setIsPillCollapsed] = useState(true);

  const renderContent = () => {
    // SERVER AUTHENTICATION & RBAC GATE (Phase 5):
    if (persona === 'super_admin' && !isDemoMode) {
      if (serverAuth.isLoading) {
        return (
          <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 text-slate-100" dir="rtl">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
              <p className="text-sm text-slate-300">در حال بررسی نشست امن سرور...</p>
            </div>
          </div>
        );
      }

      if (!serverAuth.authenticated) {
        return <ProductionAdminLogin onCancel={() => setPersona('salon_website')} />;
      }

      if (serverAuth.user?.platformRole !== 'super_admin') {
        return (
          <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 text-slate-100" dir="rtl">
            <div className="max-w-md w-full bg-[#111B2E] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-white">دسترسی مسدود است (403 Forbidden)</h2>
                <p className="text-xs text-amber-300 font-semibold">حساب کاربری شما فاقد مجوز مدیر کل است</p>
                <p className="text-xs text-slate-400 leading-relaxed pt-2">
                  شماره شما ({serverAuth.user?.phone}) با موفقیت احراز هویت شد، اما نقش شما در سرور ({serverAuth.user?.platformRole}) مجوز دسترسی به پنل مدیریت کل پلتفرم را ندارد.
                </p>
              </div>
              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={() => serverLogout()}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white transition-colors cursor-pointer"
                >
                  خروج از حساب
                </button>
                <button
                  onClick={() => setPersona('salon_website')}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                >
                  بازگشت به وب‌سایت سالن
                </button>
              </div>
            </div>
          </div>
        );
      }
    }

    switch (persona) {
      case 'salon_website':
        return <SalonWebsiteView />;
      case 'salon_app':
        return <SalonAppView />;
      case 'super_admin':
      default:
        return <AdminLayout />;
    }
  };

  const getPersonaLabel = () => {
    switch (persona) {
      case 'salon_website':
        return 'وب‌سایت سالن';
      case 'salon_app':
        return 'اپلیکیشن سالن';
      case 'super_admin':
      default:
        return 'پنل مدیریت کل';
    }
  };

  const getPersonaIcon = () => {
    switch (persona) {
      case 'salon_website':
        return Globe;
      case 'salon_app':
        return Smartphone;
      case 'super_admin':
      default:
        return Shield;
    }
  };

  const ActiveIcon = getPersonaIcon();

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-[#E7ECF5] transition-colors duration-200">
      {/* Top Governance / Security Environment Mode Indicator */}
      <div
        className={`px-3 py-1.5 text-[11px] flex items-center justify-between border-b transition-colors select-none ${
          isDemoMode
            ? 'bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-300'
            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-900 dark:text-emerald-300'
        }`}
        dir="rtl"
      >
        <div className="flex items-center gap-2 truncate">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              isDemoMode ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
            }`}
          />
          <span className="truncate">
            {isDemoMode ? (
              <span>
                <strong>محیط پیش‌نمایش آزمایشی (Demo Mode):</strong> داده‌ها و عملیات جنبه شبیه‌سازی دارند و سوئیچر نقش‌ها ابزار تست توسعه است.
              </span>
            ) : (
              <span>
                <strong>محیط عملیاتی سرور (Production Mode):</strong> دسترسی به ادمین منوط به احراز هویت سرور است.
              </span>
            )}
          </span>
        </div>
        <div className="shrink-0 mr-2">
          {isDemoMode ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
              توسعه / Demo Preview
            </span>
          ) : (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
              عملیاتی / Production
            </span>
          )}
        </div>
      </div>

      {renderContent()}

      {/* MOBILE COLLAPSIBLE FLOATING BUTTON */}
      <div className="sm:hidden fixed bottom-16 left-3.5 z-40">
        {isPillCollapsed ? (
          <button
            onClick={() => setMobilePersonaOpen(true)}
            className="w-10 h-10 rounded-full bg-white/95 dark:bg-[#111B2E]/95 backdrop-blur-md border border-slate-200/90 dark:border-[#344258] shadow-lg text-slate-800 dark:text-[#E7ECF5] flex items-center justify-center active:scale-90 transition-all cursor-pointer ring-1 ring-black/5 dark:ring-white/5 relative group"
            aria-label="تغییر بخش نوبت‌آرا"
            title={`بخش فعلی: ${getPersonaLabel()} (برای تغییر کلیک کنید)`}
          >
            <ActiveIcon className="w-4 h-4 text-[#F43F7A]" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#F43F7A] ring-2 ring-white dark:ring-[#111B2E]" />
          </button>
        ) : (
          <div className="flex items-center gap-1 p-1 bg-white/95 dark:bg-[#111B2E]/95 backdrop-blur-md border border-slate-200/90 dark:border-[#344258] shadow-xl rounded-full text-slate-800 dark:text-[#E7ECF5] text-xs font-bold ring-1 ring-black/5 dark:ring-white/5 animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setMobilePersonaOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-[#18243A] transition-colors cursor-pointer"
            >
              <ActiveIcon className="w-3.5 h-3.5 text-[#F43F7A]" />
              <span className="text-[11px]">{getPersonaLabel()}</span>
            </button>
            <button
              onClick={() => setIsPillCollapsed(true)}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              title="جمع کردن به دکمه کوچک"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* MOBILE PERSONA SELECTION MODAL SHEET */}
      {mobilePersonaOpen && (
        <div
          className="sm:hidden fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setMobilePersonaOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-[#111B2E] border border-slate-200 dark:border-[#344258] rounded-3xl p-4 shadow-2xl space-y-3 animate-in slide-in-from-bottom duration-200 text-right"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#344258]">
              <span className="text-xs font-bold text-slate-800 dark:text-[#E7ECF5] flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#F43F7A]" />
                انتخاب بخش پلتفرم نوبت‌آرا
              </span>
              <button
                onClick={() => setMobilePersonaOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-[#E7ECF5] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 text-xs">
              {/* Pillar 1: Salon Website */}
              <button
                onClick={() => {
                  setPersona('salon_website');
                  setMobilePersonaOpen(false);
                }}
                className={`flex items-center justify-between p-3 rounded-2xl font-bold transition-all cursor-pointer ${
                  persona === 'salon_website'
                    ? 'bg-[#E11D48] dark:bg-[#F43F7A] text-white shadow-xs'
                    : 'bg-slate-50 dark:bg-[#18243A] text-slate-700 dark:text-[#E7ECF5] border border-slate-200 dark:border-[#344258]'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  <span>وب‌سایت سالن (رزرو مشتریان)</span>
                </span>
                {persona === 'salon_website' && <Check className="w-4 h-4" />}
              </button>

              {/* Pillar 2: Salon App */}
              <button
                onClick={() => {
                  setPersona('salon_app');
                  setMobilePersonaOpen(false);
                }}
                className={`flex items-center justify-between p-3 rounded-2xl font-bold transition-all cursor-pointer ${
                  persona === 'salon_app'
                    ? 'bg-[#E11D48] dark:bg-[#F43F7A] text-white shadow-xs'
                    : 'bg-slate-50 dark:bg-[#18243A] text-slate-700 dark:text-[#E7ECF5] border border-slate-200 dark:border-[#344258]'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  <span>اپلیکیشن سالن (مدیریت صندوق)</span>
                </span>
                {persona === 'salon_app' && <Check className="w-4 h-4" />}
              </button>

              {/* Pillar 3: Super Admin */}
              <button
                onClick={() => {
                  setPersona('super_admin');
                  setMobilePersonaOpen(false);
                }}
                className={`flex items-center justify-between p-3 rounded-2xl font-bold transition-all cursor-pointer ${
                  persona === 'super_admin'
                    ? 'bg-[#E11D48] dark:bg-[#F43F7A] text-white shadow-xs'
                    : 'bg-slate-50 dark:bg-[#18243A] text-slate-700 dark:text-[#E7ECF5] border border-slate-200 dark:border-[#344258]'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span>پنل مدیریت و نظارت کل</span>
                  {!isDemoMode && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      مسدود
                    </span>
                  )}
                </span>
                {persona === 'super_admin' && <Check className="w-4 h-4" />}
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-[#344258] flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-500 dark:text-[#9AAAC2]">پوسته صفحه:</span>
              <ThemeToggle variant="segmented" />
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP FLOATING THREE-PILLAR SWITCHER (Hidden on mobile screens) */}
      <div className="hidden sm:block fixed bottom-4 left-4 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
        <div className="bg-white/95 dark:bg-[#111B2E]/95 backdrop-blur-md border border-slate-200/90 dark:border-[#344258] shadow-xl rounded-2xl p-1.5 flex items-center gap-1.5 text-xs ring-1 ring-black/5 dark:ring-white/5">
          {/* Pillar 1: Salon Website for Clients */}
          <button
            onClick={() => setPersona('salon_website')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              persona === 'salon_website'
                ? 'bg-[#E11D48] dark:bg-[#F43F7A] text-white shadow-xs'
                : 'text-slate-600 dark:text-[#9AAAC2] hover:text-slate-900 dark:hover:text-[#E7ECF5] hover:bg-slate-100 dark:hover:bg-[#18243A]'
            }`}
            title="وب‌سایت اختصاصی رزرو سالن برای مشتریان"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>وب‌سایت سالن</span>
          </button>

          {/* Pillar 2: Android App for Salon Manager */}
          <button
            onClick={() => setPersona('salon_app')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              persona === 'salon_app'
                ? 'bg-slate-900 dark:bg-[#18243A] text-white dark:text-[#E7ECF5] border border-slate-800 dark:border-[#344258] shadow-xs'
                : 'text-slate-600 dark:text-[#9AAAC2] hover:text-slate-900 dark:hover:text-[#E7ECF5] hover:bg-slate-100 dark:hover:bg-[#18243A]'
            }`}
            title="اپلیکیشن نوبت‌دهی مدیر سالن"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>اپلیکیشن سالن</span>
          </button>

          {/* Pillar 3: Super Admin Web Panel */}
          <button
            onClick={() => setPersona('super_admin')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              persona === 'super_admin'
                ? 'bg-rose-50 dark:bg-[#F43F7A]/20 text-[#E11D48] dark:text-[#FB7185] border border-rose-200 dark:border-[#F43F7A]/40 shadow-xs'
                : 'text-slate-600 dark:text-[#9AAAC2] hover:text-slate-900 dark:hover:text-[#E7ECF5] hover:bg-slate-100 dark:hover:bg-[#18243A]'
            }`}
            title={!isDemoMode ? 'پنل مدیریت کل (مسدود در محیط بدون سرور)' : 'پنل مدیریت کل پلتفرم (پیش‌نمایش آزمایشی)'}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>پنل مدیریت کل</span>
            {!isDemoMode && (
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold">
                مسدود
              </span>
            )}
          </button>

          <div className="w-px h-5 bg-slate-200 dark:border-[#344258] mx-1" />

          {/* Fast Theme Toggle Icon */}
          <ThemeToggle variant="icon" />
        </div>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AdminProvider>
        <MainSwitcher />
      </AdminProvider>
    </ThemeProvider>
  );
}
