import React, { useState } from 'react';
import {
  X,
  User,
  Calendar,
  Clock,
  QrCode,
  Sun,
  Moon,
  MapPin,
  Phone,
  Copy,
  Check,
  Scissors,
  Sparkles,
  LogOut,
  LogIn,
  ChevronLeft,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  Search,
  Smartphone,
  Store,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { useTheme } from '../../context/ThemeContext';
import { DetailedSalonData } from '../../mock/salonDirectoryData';
import { CustomerBooking } from '../../types/admin';
import { toPersianDigits, formatCurrency } from '../../utils/formatters';
import { SalonQrModal } from '../common/SalonQrModal';

interface CustomerSiteDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentSalon: DetailedSalonData;
  onOpenReceipt?: (booking: CustomerBooking) => void;
}

export const CustomerSiteDrawer: React.FC<CustomerSiteDrawerProps> = ({
  isOpen,
  onClose,
  currentSalon,
  onOpenReceipt,
}) => {
  const {
    isDemoMode,
    salons,
    setCurrentSalonSlug,
    clientSession,
    setClientSession,
    logoutClientSession,
    customerBookings,
    cancelCustomerBooking,
    setPersona,
    addToast,
  } = useAdmin();

  const { theme, setTheme } = useTheme();

  // Modals & Sub-states inside drawer
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<'bookings' | 'profile'>('bookings');

  // Quick Client Auth Form state
  const [inputPhone, setInputPhone] = useState(clientSession.phone || '');
  const [inputName, setInputName] = useState(clientSession.name || '');

  if (!isOpen) return null;

  // PRIVACY FIX (Phase 2): Strictly show bookings belonging ONLY to the verified logged-in client.
  // NEVER fall back to exposing all bookings of the salon to unauthenticated visitors!
  const relevantBookings = (clientSession.isLoggedIn && clientSession.phone)
    ? customerBookings.filter((b) => b.clientPhone === clientSession.phone)
    : [];

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPhone.trim() || inputPhone.trim().length < 10) {
      addToast({
        type: 'error',
        title: 'شماره موبایل نامعتبر است',
        message: 'لطفاً یک شماره معتبر مانند 09121112233 وارد کنید.',
      });
      return;
    }

    if (!isDemoMode) {
      addToast({
        type: 'error',
        title: 'ورود مستقیم بدون احراز هویت پیامکی مسدود است',
        message: 'در نسخه عملیاتی، ورود با کد تایید پیامکی از طریق سرور انجام خواهد شد.',
      });
      return;
    }

    setClientSession({
      isLoggedIn: true,
      phone: inputPhone.trim(),
      name: inputName.trim() || 'کاربر آزمایشی',
      verifiedAt: 'شبیه‌سازی آزمایشی کلاینت',
    });

    addToast({
      type: 'info',
      title: '[شبیه‌سازی دمو] ورود به پیش‌نمایش آزمایشی',
      message: `خوش آمدید، ${inputName.trim() || 'کاربر آزمایشی'} (این یک نشست محلی شبیه‌سازی شده است).`,
    });
  };

  const handleCopySalonUrl = () => {
    const url = `https://nobatara.ir/${currentSalon.slug || 'gisara'}`;
    navigator.clipboard?.writeText(url);
    setCopiedLink(true);
    addToast({
      type: 'success',
      title: 'لینک اختصاصی سالن کپی شد',
      message: url,
    });
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="w-full max-w-md h-full bg-white dark:bg-[#111B2E] border-r border-slate-200 dark:border-[#344258] shadow-2xl flex flex-col text-slate-900 dark:text-[#E7ECF5] animate-in slide-in-from-left duration-300 transition-colors">
        {/* ========================================================= */}
        {/* DRAWER TOP BAR: BRAND + MINIMAL WORDLESS THEME TOGGLE + CLOSE */}
        {/* ========================================================= */}
        <div className="p-4 border-b border-slate-200 dark:border-[#344258] bg-slate-50/80 dark:bg-[#0B1120]/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-400 text-white flex items-center justify-center font-bold shadow-xs">
              <Scissors className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                منوی کاربری و نوبت‌ها
              </h2>
              <span className="text-[10px] text-slate-500 dark:text-[#9AAAC2]">
                {currentSalon.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* MINIMAL WORDLESS THEME TOGGLE (بدون کلمه - فقط آیکون آفتاب و ماه) */}
            <div
              className="flex items-center p-1 bg-slate-200/80 dark:bg-[#18243A] rounded-xl border border-slate-300/80 dark:border-[#344258] select-none"
              title="تغییر تم تاریک و روشن"
            >
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                  theme === 'light'
                    ? 'bg-white text-amber-500 shadow-xs'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                aria-label="تم روز"
              >
                <Sun className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-[#111B2E] text-indigo-400 shadow-xs'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                aria-label="تم شب"
              >
                <Moon className="w-4 h-4" />
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#18243A] transition-colors cursor-pointer"
              aria-label="بستن منو"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* USER PROFILE SECTION (AUTHENTICATED OR FAST LOGIN) */}
        {/* ========================================================= */}
        <div className="p-4 bg-slate-50/50 dark:bg-[#0B1120]/50 border-b border-slate-200 dark:border-[#344258]">
          {clientSession.isLoggedIn ? (
            <div className="flex items-center justify-between gap-3 p-3 bg-white dark:bg-[#18243A] border border-slate-200 dark:border-[#344258] rounded-2xl shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold flex items-center justify-center text-sm border border-rose-200 dark:border-rose-900/40">
                  {clientSession.name ? clientSession.name.slice(0, 1) : 'ک'}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {clientSession.name || 'کاربر گرامی'}
                    </span>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-[#9AAAC2]">
                    {clientSession.phone}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  logoutClientSession();
                  addToast({
                    type: 'info',
                    title: 'از حساب کاربری خارج شدید',
                  });
                }}
                className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                title="خروج از حساب"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleLoginSubmit}
              className="p-3 bg-white dark:bg-[#18243A] border border-slate-200 dark:border-[#344258] rounded-2xl shadow-xs space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  مشخصات مشتری / ورود سریع
                </span>
                <span className="text-[10px] text-slate-400">جهت مشاهده نوبت‌ها</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  placeholder="نام و نام خانوادگی"
                  className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-[#344258] rounded-lg text-slate-900 dark:text-[#E7ECF5] focus:outline-none focus:border-rose-500"
                />
                <input
                  type="tel"
                  value={inputPhone}
                  onChange={(e) => setInputPhone(e.target.value)}
                  placeholder="شماره موبایل (09...)"
                  className="px-2.5 py-1.5 text-xs font-mono bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-[#344258] rounded-lg text-slate-900 dark:text-[#E7ECF5] focus:outline-none focus:border-rose-500 text-right"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>ثبت مشخصات و ورود</span>
              </button>
            </form>
          )}
        </div>

        {/* ========================================================= */}
        {/* DRAWER SUB-NAV TABS: Bookings | QR Code & Share */}
        {/* ========================================================= */}
        <div className="p-2 border-b border-slate-200 dark:border-[#344258] bg-white dark:bg-[#111B2E] grid grid-cols-2 gap-1.5 text-center text-xs select-none">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`py-2.5 px-3 rounded-xl transition-all cursor-pointer font-bold flex items-center justify-center gap-1.5 ${
              activeTab === 'bookings'
                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>نوبت‌های من</span>
            {relevantBookings.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center font-mono font-bold">
                {toPersianDigits(relevantBookings.length)}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`py-2.5 px-3 rounded-xl transition-all cursor-pointer font-bold flex items-center justify-center gap-1.5 ${
              activeTab === 'profile'
                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>بارکد QR سالن</span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* TAB CONTENT AREA */}
        {/* ========================================================= */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: BOOKINGS */}
          {activeTab === 'bookings' && (
            <div className="space-y-3">
              {relevantBookings.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-[#344258] rounded-2xl space-y-2">
                  <Calendar className="w-8 h-8 text-slate-400 mx-auto stroke-1" />
                  <p className="text-xs text-slate-600 dark:text-[#9AAAC2] font-bold">
                    نوبتی برای نمایش یافت نشد
                  </p>
                  <p className="text-[11px] text-slate-400">
                    می‌توانید از بخش کاتالوگ خدمات در صفحه، نوبت دلخواهتان را آنلاین رزرو کنید.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {relevantBookings.map((b) => {
                    const isCancelled = b.status === 'cancelled';
                    const isCompleted = b.status === 'completed';

                    return (
                      <div
                        key={b.id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isCancelled
                            ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/30 opacity-70'
                            : isCompleted
                            ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/30'
                            : 'bg-white dark:bg-[#18243A] border-slate-200 dark:border-[#344258] shadow-xs'
                        }`}
                      >
                        {/* Prominent Date & Time Row */}
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#344258] mb-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                            <Clock className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                            <span>{b.date} · ساعت {b.time}</span>
                          </div>
                          <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 font-mono tabular-nums">
                            {formatCurrency(b.price)}
                          </span>
                        </div>

                        {/* Service, Staff & Salon Info */}
                        <div className="space-y-1 mb-2.5">
                          <div className="text-xs font-bold text-slate-900 dark:text-[#E7ECF5]">
                            {b.serviceName}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-[#9AAAC2] flex items-center justify-between">
                            <span>متخصص: <strong className="text-slate-700 dark:text-[#9AAAC2] font-normal">{b.staffName}</strong></span>
                            <span>{b.salonName}</span>
                          </div>
                        </div>

                        {/* Status & Actions */}
                        <div className="pt-2 border-t border-slate-100 dark:border-[#344258] flex items-center justify-between">
                          <div className="flex items-center gap-1 text-[11px] font-semibold">
                            {isCompleted ? (
                              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> تسویه شده در سالن
                              </span>
                            ) : isCancelled ? (
                              <span className="text-rose-500 flex items-center gap-1">
                                <XCircle className="w-3.5 h-3.5" /> لغو شده
                              </span>
                            ) : (
                              <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                <CreditCard className="w-3.5 h-3.5" /> تسویه حضوری در محل
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {onOpenReceipt && (
                              <button
                                onClick={() => onOpenReceipt(b)}
                                className="text-[11px] text-slate-600 dark:text-[#9AAAC2] hover:text-rose-600 underline cursor-pointer"
                              >
                                مشاهده رسید
                              </button>
                            )}

                            {!isCancelled && !isCompleted && (
                              <button
                                onClick={() => {
                                  if (!isDemoMode) {
                                    addToast({
                                      type: 'error',
                                      title: 'لغو نوبت در محیط عملیاتی مسدود است',
                                      message: 'لغو نوبت نیازمند احراز هویت پیامکی در فاز ۵ است.',
                                    });
                                    return;
                                  }
                                  cancelCustomerBooking(b.id);
                                  addToast({
                                    type: 'info',
                                    title: '[شبیه‌سازی دمو] نوبت لغو شد',
                                    message: `نوبت ${b.serviceName} در حافظه موقت لغو شد.`,
                                  });
                                }}
                                className="text-[11px] text-rose-500 hover:text-rose-700 cursor-pointer"
                              >
                                لغو نوبت
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: QR CODE & DIRECT SHARE */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-[#344258] rounded-2xl space-y-3 text-center">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center shadow-xs">
                  <QrCode className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                    بارکد QR اختصاصی {currentSalon.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-[#9AAAC2] mt-0.5">
                    اسکن بارکد با دوربین گوشی جهت رزرو فوری نوبت در این سالن
                  </p>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#18243A] border border-slate-200 dark:border-[#344258] text-xs">
                  <span className="font-mono text-slate-700 dark:text-[#9AAAC2] truncate ltr text-left pl-2">
                    nobatara.ir/{currentSalon.slug || 'gisara'}
                  </span>
                  <button
                    onClick={handleCopySalonUrl}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold transition-all shrink-0 cursor-pointer text-[10px]"
                  >
                    {copiedLink ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedLink ? 'کپی شد' : 'کپی آدرس'}</span>
                  </button>
                </div>

                <button
                  onClick={() => setQrModalOpen(true)}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <QrCode className="w-4 h-4" />
                  <span>مشاهده، اشتراک و چاپ بارکد QR</span>
                </button>
              </div>

              {/* Contact and address quick card */}
              <div className="p-3.5 bg-white dark:bg-[#18243A] border border-slate-200 dark:border-[#344258] rounded-2xl space-y-2 text-xs">
                <span className="font-bold text-slate-900 dark:text-white block pb-1 border-b border-slate-100 dark:border-[#344258]">
                  اطلاعات تماس و آدرس سالن
                </span>
                <div className="flex items-center gap-2 text-slate-600 dark:text-[#9AAAC2]">
                  <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>{currentSalon.city} · {currentSalon.address}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-[#9AAAC2]">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{currentSalon.workingHours}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-[#9AAAC2]">
                  <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="font-mono">{currentSalon.phone}</span>
                </div>
              </div>
            </div>
          )}


        </div>

        {/* ========================================================= */}
        {/* FOOTER: SWITCH TO SALON ADMIN APP */}
        {/* ========================================================= */}
        <div className="p-3 border-t border-slate-200 dark:border-[#344258] bg-slate-50/70 dark:bg-[#0B1120]/70 flex items-center justify-between text-[11px] text-slate-500">
          <button
            onClick={() => {
              if (!isDemoMode) {
                addToast({
                  type: 'error',
                  title: 'دسترسی مسدود است',
                  message: 'ورود به اپلیکیشن سالن نیازمند احراز هویت است و دسترسی مستقیم عمومی در نسخه عملیاتی غیرفعال است.',
                });
                return;
              }
              onClose();
              setPersona('salon_app');
            }}
            className="flex items-center gap-1.5 text-slate-600 dark:text-[#9AAAC2] hover:text-rose-600 dark:hover:text-rose-400 font-medium cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>{isDemoMode ? '[پیش‌نمایش دمو] ورود به اپلیکیشن سالن' : 'ورود مدیر سالن (نیازمند احراز هویت)'}</span>
          </button>

          <span className="font-mono text-slate-400 text-[10px]">
            {isDemoMode ? 'سامانه نوبت‌آرا (نسخه آزمایشی)' : 'سامانه نوبت‌آرا'}
          </span>
        </div>
      </div>

      {/* QR MODAL */}
      <SalonQrModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        salon={currentSalon}
      />
    </div>
  );
};
