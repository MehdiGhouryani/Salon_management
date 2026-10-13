/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AdminProvider, useAdmin } from './context/AdminContext';
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
import { Globe, Smartphone, Shield } from 'lucide-react';

const AdminLayout: React.FC = () => {
  const { activeTab, setActiveTab, salons, messages, tickets } = useAdmin();

  const pendingSalons = salons.filter((s) => s.status === 'pending').length;
  const failedMessages = messages.filter((m) => m.status === 'failed' || m.status === 'retrying').length;
  const openTickets = tickets.filter((t) => t.status === 'open' || t.status === 'in_progress').length;

  const topTabs = [
    { id: 'overview' as const, label: 'داشبورد نظارتی', count: undefined },
    { id: 'businesses' as const, label: 'سالن‌ها و مراکز', count: pendingSalons > 0 ? pendingSalons : undefined, countType: 'warning' as const },
    { id: 'users' as const, label: 'کاربران و پرسنل', count: undefined },
    { id: 'subscriptions' as const, label: 'مالی و اشتراک‌ها', count: undefined },
    { id: 'messages' as const, label: 'پیامک و دیسپچ', count: failedMessages > 0 ? failedMessages : undefined, countType: 'error' as const },
    { id: 'support' as const, label: 'مرکز پشتیبانی', count: openTickets > 0 ? openTickets : undefined, countType: 'info' as const },
    { id: 'operations' as const, label: 'سلامت سیستم', count: undefined },
    { id: 'security' as const, label: 'امنیت و لاگ‌ها', count: undefined },
    { id: 'settings' as const, label: 'تنظیمات', count: undefined },
    { id: 'simulator' as const, label: 'شبیه‌ساز سالن', count: undefined },
  ];

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
    <div className="flex h-screen bg-[#F8F9FA] dark:bg-[#0E1015] text-[#18181B] dark:text-[#F4F4F6] overflow-hidden font-sans antialiased transition-colors duration-200" dir="rtl">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header Contract */}
        <Header />

        {/* Scrollable Content Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-zinc-50/70 dark:bg-[#12141C]/80">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Quick Category Tab Bar for Super Admin */}
            <div className="flex items-center gap-1.5 p-1.5 bg-white dark:bg-[#181B24] border border-stone-200 dark:border-zinc-800 rounded-2xl overflow-x-auto shadow-xs select-none">
              {topTabs.map((tab) => {
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold border border-rose-500/30 shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-stone-100 dark:hover:bg-zinc-800/60 border border-transparent'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.count !== undefined && (
                      <span
                        className={`px-1.5 py-0.2 text-[10px] font-bold rounded-full border ${
                          tab.countType === 'error'
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                            : tab.countType === 'warning'
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                            : 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/20'
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

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
    <div className="relative min-h-screen bg-[#F8F9FA] dark:bg-[#0E1015] text-[#18181B] dark:text-[#F4F4F6] transition-colors duration-200">
      {renderContent()}

      {/* FLOATING THREE-PILLAR PERSONA SWITCHER */}
      <div className="fixed bottom-4 left-4 z-50 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="bg-white/95 dark:bg-[#181B24]/95 backdrop-blur-md border border-stone-200 dark:border-zinc-800 shadow-xl rounded-2xl p-1.5 flex items-center gap-1.5 text-xs ring-1 ring-black/5 dark:ring-white/5">
          {/* Pillar 1: Salon Website for Clients */}
          <button
            onClick={() => setPersona('salon_website')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              persona === 'salon_website'
                ? 'bg-gradient-to-l from-rose-600 to-pink-600 text-white shadow-md shadow-rose-500/25'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-stone-100 dark:hover:bg-zinc-800/60'
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
                ? 'bg-zinc-900 dark:bg-zinc-700 text-white shadow-md'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-stone-100 dark:hover:bg-zinc-800/60'
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
                ? 'bg-rose-950 dark:bg-rose-950/80 text-rose-300 border border-rose-500/30 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-stone-100 dark:hover:bg-zinc-800/60'
            }`}
            title="پنل مدیریت کل پلتفرم"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>پنل مدیریت کل</span>
          </button>

          <div className="w-px h-5 bg-stone-200 dark:bg-zinc-800 mx-1" />

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
