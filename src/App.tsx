/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
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
} from 'lucide-react';

type MainCategory = 'overview' | 'businesses' | 'users' | 'finance' | 'system';

const AdminLayout: React.FC = () => {
  const { activeTab, setActiveTab, salons, messages, tickets } = useAdmin();

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
    <div className="flex h-screen bg-[#F4F4F5] dark:bg-[#0A0F1D] text-slate-900 dark:text-slate-100 overflow-hidden font-sans antialiased transition-colors duration-250" dir="rtl">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header Contract */}
        <Header />

        {/* Scrollable Content Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#F4F4F5] dark:bg-[#0A0F1D]">
          <div className="max-w-7xl mx-auto space-y-5">
            {/* 1. Primary Clean Category Tabs Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-1.5 bg-white dark:bg-[#0F172A] border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs">
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
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold border border-rose-500/30 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`} />
                      <span>{cat.label}</span>
                      {cat.badge !== undefined && (
                        <span
                          className={`px-1.5 py-0.2 text-[10px] font-bold rounded-full border ${
                            cat.badgeType === 'error'
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                              : cat.badgeType === 'warning'
                              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                              : 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20'
                          }`}
                        >
                          {cat.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Quick Persona Indicators */}
              <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pl-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#1E222D] border border-slate-200 dark:border-slate-800 text-[11px] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  شبکه نوبت‌آرا فعال
                </span>
              </div>
            </div>

            {/* 2. Sub-Category Selector for Multi-tool groups */}
            {currentCategory === 'finance' && (
              <div className="flex items-center gap-2 p-1 bg-white/70 dark:bg-[#151821]/70 backdrop-blur-xs border border-slate-200 dark:border-slate-800 rounded-xl w-fit text-xs">
                <button
                  onClick={() => setActiveTab('subscriptions')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    activeTab === 'subscriptions'
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>اشتراک‌ها، بسته‌ها و تراکنش‌ها</span>
                </button>
                <button
                  onClick={() => setActiveTab('messages')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    activeTab === 'messages'
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>مرکز پیامک و دیسپچ نوبت‌ها</span>
                  {failedMessages > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[10px] font-bold">
                      {failedMessages}
                    </span>
                  )}
                </button>
              </div>
            )}

            {currentCategory === 'system' && (
              <div className="flex items-center gap-1.5 p-1 bg-white/70 dark:bg-[#151821]/70 backdrop-blur-xs border border-slate-200 dark:border-slate-800 rounded-xl w-fit overflow-x-auto text-xs">
                <button
                  onClick={() => setActiveTab('operations')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    activeTab === 'operations'
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>سلامت سیستم و منابع سرور</span>
                </button>
                <button
                  onClick={() => setActiveTab('security')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    activeTab === 'security'
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>امنیت، رویدادها و لاگ‌ها</span>
                </button>
                <button
                  onClick={() => setActiveTab('support')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    activeTab === 'support'
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>مرکز پشتیبانی و تیکت‌ها</span>
                  {openTickets > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-sky-500/20 text-sky-700 dark:text-sky-300 text-[10px] font-bold">
                      {openTickets}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    activeTab === 'settings'
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <SettingsIcon className="w-3.5 h-3.5" />
                  <span>تنظیمات هسته</span>
                </button>
                <button
                  onClick={() => setActiveTab('simulator')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    activeTab === 'simulator'
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
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
  const { persona, setPersona } = useAdmin();

  const renderContent = () => {
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

  return (
    <div className="relative min-h-screen bg-[#F4F4F5] dark:bg-[#0A0F1D] text-slate-900 dark:text-slate-100 transition-colors duration-250">
      {renderContent()}

      {/* FLOATING THREE-PILLAR PERSONA SWITCHER */}
      <div className="fixed bottom-4 left-4 z-50 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 shadow-xl rounded-2xl p-1.5 flex items-center gap-1.5 text-xs ring-1 ring-black/5 dark:ring-white/5">
          {/* Pillar 1: Salon Website for Clients */}
          <button
            onClick={() => setPersona('salon_website')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              persona === 'salon_website'
                ? 'bg-gradient-to-l from-rose-600 to-pink-600 text-white shadow-md shadow-rose-500/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
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
                ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
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
                ? 'bg-rose-950 dark:bg-rose-950/80 text-rose-300 border border-rose-500/30 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
            title="پنل مدیریت کل پلتفرم"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>پنل مدیریت کل</span>
          </button>

          <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-1" />

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
