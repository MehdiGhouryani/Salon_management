/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, Suspense, lazy } from 'react';
import { AdminProvider, useAdmin } from './context/AdminContext';
import { ThemeProvider } from './context/ThemeContext';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { CommandPalette } from './components/common/CommandPalette';
import { ToastContainer } from './components/common/ToastContainer';
import { ShortcutsModal } from './components/common/ShortcutsModal';
import { ThemeToggle } from './components/common/ThemeToggle';
import { LoadingFallback } from './components/common/LoadingFallback';

// Lazy-loaded views for code splitting & performance core
const OverviewView = lazy(() => import('./components/views/OverviewView').then((m) => ({ default: m.OverviewView })));
const BusinessesView = lazy(() => import('./components/views/BusinessesView').then((m) => ({ default: m.BusinessesView })));
const UsersView = lazy(() => import('./components/views/UsersView').then((m) => ({ default: m.UsersView })));
const SubscriptionsView = lazy(() => import('./components/views/SubscriptionsView').then((m) => ({ default: m.SubscriptionsView })));
const MessagesView = lazy(() => import('./components/views/MessagesView').then((m) => ({ default: m.MessagesView })));
const SupportView = lazy(() => import('./components/views/SupportView').then((m) => ({ default: m.SupportView })));
const OperationsView = lazy(() => import('./components/views/OperationsView').then((m) => ({ default: m.OperationsView })));
const SecurityView = lazy(() => import('./components/views/SecurityView').then((m) => ({ default: m.SecurityView })));
const SettingsView = lazy(() => import('./components/views/SettingsView').then((m) => ({ default: m.SettingsView })));
const SalonSimulatorView = lazy(() => import('./components/views/SalonSimulatorView').then((m) => ({ default: m.SalonSimulatorView })));

const SalonWebsiteView = lazy(() => import('./components/customer/SalonWebsiteView').then((m) => ({ default: m.SalonWebsiteView })));
const SalonAppView = lazy(() => import('./components/views/SalonAppView').then((m) => ({ default: m.SalonAppView })));
import {
  Globe,
  Smartphone,
  Shield,
  ShieldAlert,
  Layers,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { ProductionAdminLogin } from './components/common/ProductionAdminLogin';
import { ProductionSalonLogin } from './components/common/ProductionSalonLogin';


const AdminLayout: React.FC = () => {
  const { activeTab } = useAdmin();

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
    <div className="flex h-full bg-[var(--bg-canvas)] text-[var(--text-primary)] overflow-hidden font-sans antialiased transition-colors duration-200" dir="rtl">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header Contract */}
        <Header />

        {/* Scrollable Content Body */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 bg-[var(--bg-canvas)]">
          <div className="max-w-7xl mx-auto space-y-5">
            {/* The active admin view. Navigation lives in the sidebar only. */}
            <Suspense fallback={<LoadingFallback message="در حال بارگذاری بخش مدیریتی..." />}>
              {renderActiveView()}
            </Suspense>
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

// The three places of the platform, in the order the switch shows them.
const PERSONA_OPTIONS: { key: 'salon_website' | 'salon_app' | 'super_admin'; label: string; title: string; icon: React.FC<{ className?: string }> }[] = [
  { key: 'salon_website', label: 'وب‌سایت سالن', title: 'وب‌سایت اختصاصی رزرو سالن برای مشتریان', icon: Globe },
  { key: 'salon_app', label: 'اپلیکیشن سالن', title: 'اپلیکیشن نوبت‌دهی مدیر سالن', icon: Smartphone },
  { key: 'super_admin', label: 'پنل مدیریت کل', title: 'پنل مدیریت کل پلتفرم (پیش‌نمایش آزمایشی)', icon: Shield },
];

const MainSwitcher: React.FC = () => {
  const { persona, setPersona, isDemoMode, serverAuth, serverLogout } = useAdmin();

  // Phase 15 SEO: private consoles and auth screens must never be indexed.
  useEffect(() => {
    let el = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('name', 'robots');
      document.head.appendChild(el);
    }
    el.setAttribute('content', persona === 'salon_website' ? 'index, follow' : 'noindex, nofollow');
  }, [persona]);
  const [mobilePersonaOpen, setMobilePersonaOpen] = useState(false);

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
            <div className="max-w-md w-full bg-dk-surface border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-white">دسترسی مسدود است (403 Forbidden)</h2>
                <p className="text-xs text-amber-300 font-semibold">حساب کاربری شما فاقد مجوز مدیر کل است</p>
                <p className="text-xs text-text-subtle leading-relaxed pt-2">
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

    // SERVER AUTHENTICATION & RBAC GATE FOR SALON MANAGER / STAFF (Phase 5):
    if (persona === 'salon_app' && !isDemoMode) {
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
        return <ProductionSalonLogin onCancel={() => setPersona('salon_website')} />;
      }

      const hasSalonAccess =
        (serverAuth.salonMemberships && serverAuth.salonMemberships.length > 0) ||
        serverAuth.user?.platformRole === 'super_admin';

      if (!hasSalonAccess) {
        return (
          <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 text-slate-100" dir="rtl">
            <div className="max-w-md w-full bg-dk-surface border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-white">دسترسی مسدود است (403 Forbidden)</h2>
                <p className="text-xs text-amber-300 font-semibold">حساب کاربری شما فاقد عضویت در کادر سالن است</p>
                <p className="text-xs text-text-subtle leading-relaxed pt-2">
                  شماره شما ({serverAuth.user?.phone}) احراز هویت شد، اما هنوز به عنوان مدیر یا پرسنل سالنی در سامانه ثبت نگردیده است.
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

  // The admin shell renders only in demo mode or with a super-admin server session (same gates as renderContent).
  const adminShellActive =
    persona === 'super_admin' &&
    (isDemoMode || (serverAuth.authenticated && serverAuth.user?.platformRole === 'super_admin'));

  const content = (
    <Suspense fallback={<LoadingFallback message="در حال دریافت اطلاعات صفحه..." />}>
      {renderContent()}
    </Suspense>
  );

  return (
    <div
      className={`relative min-h-screen bg-slate-50 dark:bg-canvas text-slate-900 dark:text-text-main transition-colors duration-200 ${
        adminShellActive ? 'h-screen flex flex-col overflow-hidden' : ''
      }`}
    >
      {/* Environment strip: says where the data comes from and holds the only persona switch. It is part of the page, so it never covers content. */}
      <div
        className={`px-3 py-1 text-[11px] flex items-center gap-3 border-b transition-colors select-none ${
          isDemoMode
            ? 'bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-300'
            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-900 dark:text-emerald-300'
        }`}
        dir="rtl"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className={`w-2 h-2 rounded-full shrink-0 ${isDemoMode ? 'bg-amber-500' : 'bg-emerald-500'}`} />
          <span className="truncate">
            {isDemoMode ? (
              <strong>پیش‌نمایش آزمایشی:</strong>
            ) : (
              <strong>محیط عملیاتی:</strong>
            )}{' '}
            {isDemoMode ? 'داده‌ها نمونه‌اند و عملیات شبیه‌سازی می‌شوند.' : 'دسترسی به ادمین منوط به احراز هویت سرور است.'}
          </span>
        </div>

        {/* Wide screens: the three places in one control */}
        <div role="group" aria-label="بخش پلتفرم" className="hidden sm:flex items-center gap-0.5 p-px rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] shrink-0">
          {PERSONA_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setPersona(option.key)}
              aria-pressed={persona === option.key}
              title={option.key === 'super_admin' && !isDemoMode ? 'پنل مدیریت کل (نیازمند ورود به سرور)' : option.title}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                persona === option.key
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-default)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <option.icon className="w-3 h-3" />
              <span>{option.label}</span>
              {option.key === 'super_admin' && !isDemoMode && (
                <span className="text-[11px] text-[var(--status-error)]">مسدود</span>
              )}
            </button>
          ))}
        </div>

        {/* Phones: one button that opens the sheet with the same choices */}
        <button
          type="button"
          onClick={() => setMobilePersonaOpen(true)}
          aria-label="تغییر بخش نوبت‌آرا"
          className="sm:hidden flex items-center gap-1.5 px-2 py-1 rounded-md font-semibold bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-primary)] shrink-0 cursor-pointer"
        >
          <ActiveIcon className="w-3 h-3" />
          <span>{getPersonaLabel()}</span>
        </button>
      </div>

      {adminShellActive ? <div className="flex-1 min-h-0">{content}</div> : content}


      {/* MOBILE PERSONA SELECTION MODAL SHEET */}
      {mobilePersonaOpen && (
        <div
          className="sm:hidden fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 animate-in fade-in duration-150"
          onClick={() => setMobilePersonaOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-surface border border-slate-200 dark:border-border-default rounded-3xl p-4 shadow-2xl space-y-3 animate-in slide-in-from-bottom duration-200 text-right"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-border-default">
              <span className="text-xs font-bold text-slate-800 dark:text-text-main flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-brand-accent" />
                انتخاب بخش پلتفرم نوبت‌آرا
              </span>
              <button
                onClick={() => setMobilePersonaOpen(false)}
                className="p-1 rounded-lg text-text-subtle hover:text-slate-700 dark:hover:text-text-main cursor-pointer"
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
                className={`flex items-center justify-between p-3 rounded-2xl font-bold transition-colors cursor-pointer ${
                  persona === 'salon_website'
                    ? 'bg-brand dark:bg-brand text-white shadow-xs'
                    : 'bg-slate-50 dark:bg-elevated text-slate-700 dark:text-text-main border border-slate-200 dark:border-border-default'
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
                className={`flex items-center justify-between p-3 rounded-2xl font-bold transition-colors cursor-pointer ${
                  persona === 'salon_app'
                    ? 'bg-brand dark:bg-brand text-white shadow-xs'
                    : 'bg-slate-50 dark:bg-elevated text-slate-700 dark:text-text-main border border-slate-200 dark:border-border-default'
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
                className={`flex items-center justify-between p-3 rounded-2xl font-bold transition-colors cursor-pointer ${
                  persona === 'super_admin'
                    ? 'bg-brand dark:bg-brand text-white shadow-xs'
                    : 'bg-slate-50 dark:bg-elevated text-slate-700 dark:text-text-main border border-slate-200 dark:border-border-default'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span>پنل مدیریت و نظارت کل</span>
                  {!isDemoMode && (
                    <span className="text-[11px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      مسدود
                    </span>
                  )}
                </span>
                {persona === 'super_admin' && <Check className="w-4 h-4" />}
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-border-default flex items-center justify-between text-xs">
              <span className="text-[11px] text-text-muted dark:text-text-muted">پوسته صفحه:</span>
              <ThemeToggle variant="segmented" />
            </div>
          </div>
        </div>
      )}

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
