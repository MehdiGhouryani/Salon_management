import React, { useState, useMemo } from 'react';
import {
  Smartphone,
  Calendar,
  Clock,
  User,
  Plus,
  CheckCircle2,
  DollarSign,
  Scissors,
  Check,
  Phone,
  Sparkles,
  CreditCard,
  Copy,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Share2,
  Wifi,
  Battery,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { useTheme } from '../../context/ThemeContext';
import { getSalonBySlug } from '../../mock/salonDirectoryData';
import { toPersianDigits, formatCurrency } from '../../utils/formatters';
import { ThemeToggle } from '../common/ThemeToggle';

export const SalonAppView: React.FC = () => {
  const {
    salons,
    currentSalonSlug,
    setCurrentSalonSlug,
    customerBookings,
    completeCustomerBookingInSalon,
    addCustomerBooking,
    setPersona,
    addToast,
  } = useAdmin();

  const { theme } = useTheme();

  // Active salon for the salon manager
  const currentSalon = useMemo(() => {
    return salons.find((s) => s.slug === currentSalonSlug) || salons[0];
  }, [salons, currentSalonSlug]);

  const salonDetailed = useMemo(() => {
    return getSalonBySlug(currentSalon.slug || 'gisara', salons);
  }, [currentSalon, salons]);

  // Android App active tab
  const [activeAppTab, setActiveAppTab] = useState<'appointments' | 'services' | 'subscription' | 'new_booking'>('appointments');
  const [copiedLink, setCopiedLink] = useState(false);

  // New manual appointment form state
  const [manualClientName, setManualClientName] = useState('');
  const [manualClientPhone, setManualClientPhone] = useState('');
  const [manualServiceName, setManualServiceName] = useState('');
  const [manualPrice, setManualPrice] = useState(450000);
  const [manualTime, setManualTime] = useState('۱۶:۰۰');

  // Subscription payment simulation state
  const [selectedPlanToBuy, setSelectedPlanToBuy] = useState<'gold_vip' | 'silver' | 'bronze'>('gold_vip');
  const [selectedGateway, setSelectedGateway] = useState<'zarinpal' | 'mellat' | 'saman'>('zarinpal');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Filter bookings for this salon
  const salonBookings = useMemo(() => {
    return customerBookings.filter((b) => b.salonId === currentSalon.id || b.salonName.includes(currentSalon.name));
  }, [customerBookings, currentSalon]);

  // Handle URL Copy
  const handleCopySalonUrl = () => {
    const url = `https://nobatara.ir/${currentSalon.slug}`;
    navigator.clipboard?.writeText(url);
    setCopiedLink(true);
    addToast({
      type: 'success',
      title: 'لینک سالن کپی شد',
      message: url,
    });
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Handle manual booking creation
  const handleCreateManualBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualClientName.trim() || !manualClientPhone.trim()) {
      addToast({
        type: 'error',
        title: 'نام و تلفن مشتری الزامی است',
      });
      return;
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const trackingPrefix = currentSalon.slug ? currentSalon.slug.slice(0, 3).toUpperCase() : 'ARA';

    addCustomerBooking({
      id: `manual-${Date.now()}`,
      trackingCode: `${trackingPrefix}-${randomSuffix}`,
      salonId: currentSalon.id,
      salonName: currentSalon.name,
      clientName: manualClientName.trim(),
      clientPhone: manualClientPhone.trim(),
      serviceName: manualServiceName || 'خدمت حضوری',
      serviceCategory: 'نوبت حضوری سالن',
      staffName: salonDetailed.staff[0]?.name || 'پرسنل سالن',
      date: 'امروز',
      time: manualTime,
      price: manualPrice,
      paymentMethod: 'in_person',
      createdAt: 'هم‌اکنون',
      status: 'confirmed',
    });

    setManualClientName('');
    setManualClientPhone('');
    setActiveAppTab('appointments');

    addToast({
      type: 'success',
      title: 'نوبت جدید ثبت شد',
    });
  };

  // Handle B2B Subscription Payment simulation
  const handlePaySubscription = () => {
    setIsProcessingPayment(true);
    setTimeout(() => {
      setIsProcessingPayment(false);
      addToast({
        type: 'success',
        title: 'اشتراک سالن تمدید شد',
        message: `تراکنش موفق درگاه بانکی شاپرک.`,
      });
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#0E1015] text-[#18181B] dark:text-[#F4F4F6] py-6 px-4 font-sans antialiased transition-colors" dir="rtl">
      {/* Top Controller Bar */}
      <div className="max-w-4xl mx-auto mb-6 bg-white dark:bg-[#14161F] border border-stone-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>اپلیکیشن مدیر سالن</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-stone-200 dark:border-zinc-700 font-mono">
                نسخه شبیه‌ساز اندروید
              </span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              مدیریت نوبت‌ها، تسویه حضوری و تنظیمات سالن
            </p>
          </div>
        </div>

        {/* Change Salon selector and Prominent Theme Toggle */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">سالن:</span>
            <select
              value={currentSalon.slug}
              onChange={(e) => setCurrentSalonSlug(e.target.value)}
              className="px-3 py-1.5 text-xs bg-stone-50 dark:bg-[#0E1015] border border-stone-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-rose-500 cursor-pointer font-medium"
            >
              {salons.map((s) => (
                <option key={s.id} value={s.slug}>
                  {s.name} ({s.city})
                </option>
              ))}
            </select>
          </div>

          <ThemeToggle variant="segmented" className="hidden sm:inline-flex" />
          <ThemeToggle variant="icon" className="sm:hidden" />
        </div>
      </div>

      {/* MOBILE DEVICE CASING CONTAINER */}
      <div className="max-w-md mx-auto relative">
        <div className="relative bg-white dark:bg-[#14161F] border-[10px] border-stone-300 dark:border-zinc-800 rounded-[48px] shadow-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/5">
          {/* Top Notch & Camera */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-stone-200 dark:bg-zinc-800 rounded-full z-30 flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-stone-400 dark:bg-zinc-950 border border-stone-300 dark:border-zinc-700" />
          </div>

          {/* Android Status Bar */}
          <div className="pt-3 pb-1 px-6 bg-stone-100 dark:bg-[#0D0F14] text-[11px] font-mono text-zinc-500 dark:text-zinc-400 flex items-center justify-between border-b border-stone-200 dark:border-zinc-800 z-20">
            <span className="font-bold text-zinc-800 dark:text-zinc-200">۱۰:۲۸</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px]">5G</span>
              <Wifi className="w-3.5 h-3.5 text-zinc-400" />
              <div className="flex items-center gap-1">
                <span className="text-[10px]">۹۲٪</span>
                <Battery className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </div>

          {/* App Header */}
          <div className="p-4 bg-stone-50 dark:bg-[#10121A] border-b border-stone-200 dark:border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-l from-rose-600 to-pink-600 flex items-center justify-center text-white font-bold text-base shadow-xs">
                  {currentSalon.name.slice(0, 2)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-tight">{currentSalon.name}</h3>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    مدیر: {currentSalon.ownerName}
                  </span>
                </div>
              </div>

              {/* Plan Badge */}
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40">
                اشتراک VIP
              </span>
            </div>

            {/* Salon Booking Link Box */}
            <div className="p-3 bg-white dark:bg-[#181B24] border border-stone-200 dark:border-zinc-800 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-700 dark:text-zinc-300 font-bold flex items-center gap-1">
                  <Share2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  لینک وب‌سایت سالن:
                </span>
                <span className="text-[10px] text-zinc-400">مخصوص مشتریان</span>
              </div>

              <div className="flex items-center gap-1.5 bg-stone-50 dark:bg-[#0E1015] px-2.5 py-1.5 rounded-xl border border-stone-200 dark:border-zinc-800 text-xs text-rose-600 dark:text-rose-400 font-mono">
                <span className="truncate">https://nobatara.ir/{currentSalon.slug}</span>
                <button
                  onClick={handleCopySalonUrl}
                  className="mr-auto p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                  title="کپی لینک"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="flex items-center justify-between pt-1 text-[11px]">
                <button
                  onClick={() => {
                    setCurrentSalonSlug(currentSalon.slug || 'gisara');
                    setPersona('salon_website');
                  }}
                  className="text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                >
                  <ExternalLink className="w-3 h-3" />
                  مشاهده وب‌سایت مشتریان
                </button>
                <span className="text-zinc-500 text-[10px]">تسویه حضوری</span>
              </div>
            </div>
          </div>

          {/* App Scrollable Content */}
          <div className="h-[480px] overflow-y-auto p-4 space-y-4 bg-stone-50/50 dark:bg-[#0E1015]">
            {/* TAB 1: APPOINTMENTS */}
            {activeAppTab === 'appointments' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    نوبت‌های دریافتی:
                  </span>
                  <button
                    onClick={() => setActiveAppTab('new_booking')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>نوبت دستی</span>
                  </button>
                </div>

                {salonBookings.length === 0 ? (
                  <div className="p-8 text-center bg-white dark:bg-[#181B24] border border-stone-200 dark:border-zinc-800 rounded-2xl space-y-2">
                    <Calendar className="w-8 h-8 text-zinc-400 mx-auto" />
                    <p className="text-xs text-zinc-500">نوبتی برای این سالن ثبت نشده است.</p>
                    <button
                      onClick={() => {
                        setCurrentSalonSlug(currentSalon.slug || 'gisara');
                        setPersona('salon_website');
                      }}
                      className="text-xs text-rose-600 dark:text-rose-400 underline font-bold cursor-pointer"
                    >
                      ثبت یک نوبت آزمایشی در وب‌سایت
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {salonBookings.map((b) => (
                      <div
                        key={b.id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          b.status === 'completed'
                            ? 'bg-stone-100/70 dark:bg-[#14161F] border-stone-200 dark:border-zinc-800 opacity-75'
                            : b.status === 'cancelled'
                            ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/30 opacity-60'
                            : 'bg-white dark:bg-[#181B24] border-stone-200/90 dark:border-zinc-800 shadow-xs'
                        }`}
                      >
                        {/* Top row */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{b.clientName}</span>
                            <span className="text-[10px] font-mono text-zinc-500">{b.clientPhone}</span>
                          </div>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                            {b.trackingCode}
                          </span>
                        </div>

                        {/* Details */}
                        <div className="grid grid-cols-2 gap-1 text-[11px] text-zinc-600 dark:text-zinc-400 mb-3">
                          <div>خدمت: <strong className="text-zinc-900 dark:text-zinc-200">{b.serviceName}</strong></div>
                          <div>زمان: <strong className="text-zinc-900 dark:text-zinc-200">{b.date} - {b.time}</strong></div>
                          <div>متخصص: <span className="text-zinc-500">{b.staffName}</span></div>
                          <div>هزینه: <strong className="text-rose-600 dark:text-rose-400 font-mono tabular-nums">{formatCurrency(b.price)}</strong></div>
                        </div>

                        {/* Settlement Action Bar */}
                        <div className="pt-2.5 border-t border-stone-100 dark:border-zinc-800 flex items-center justify-between">
                          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-medium">
                            <CreditCard className="w-3 h-3" />
                            تسویه حضوری در سالن
                          </span>

                          {b.status === 'confirmed' ? (
                            <button
                              onClick={() => completeCustomerBookingInSalon(b.id)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-xs flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>تکمیل و تسویه</span>
                            </button>
                          ) : b.status === 'completed' ? (
                            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" />
                              تسویه شده
                            </span>
                          ) : (
                            <span className="text-[11px] text-rose-500">لغو شده</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: MANUAL BOOKING FORM */}
            {activeAppTab === 'new_booking' && (
              <form onSubmit={handleCreateManualBooking} className="space-y-3 bg-white dark:bg-[#181B24] p-4 rounded-2xl border border-stone-200 dark:border-zinc-800">
                <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-zinc-800">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">ثبت نوبت دستی:</span>
                  <button
                    type="button"
                    onClick={() => setActiveAppTab('appointments')}
                    className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    بازگشت
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] text-zinc-600 dark:text-zinc-400 mb-1">نام مشتری:</label>
                  <input
                    type="text"
                    required
                    value={manualClientName}
                    onChange={(e) => setManualClientName(e.target.value)}
                    placeholder="مثال: مریم محمدی"
                    className="w-full px-3 py-2 text-xs bg-stone-50 dark:bg-[#0E1015] border border-stone-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-zinc-600 dark:text-zinc-400 mb-1">شماره تماس:</label>
                  <input
                    type="tel"
                    required
                    value={manualClientPhone}
                    onChange={(e) => setManualClientPhone(e.target.value)}
                    placeholder="09121112233"
                    className="w-full px-3 py-2 text-xs font-mono bg-stone-50 dark:bg-[#0E1015] border border-stone-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-rose-500 text-right"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-zinc-600 dark:text-zinc-400 mb-1">عنوان خدمت:</label>
                  <input
                    type="text"
                    required
                    value={manualServiceName}
                    onChange={(e) => setManualServiceName(e.target.value)}
                    placeholder="مثال: رنگ و لایت"
                    className="w-full px-3 py-2 text-xs bg-stone-50 dark:bg-[#0E1015] border border-stone-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-zinc-600 dark:text-zinc-400 mb-1">ساعت نوبت:</label>
                    <input
                      type="text"
                      value={manualTime}
                      onChange={(e) => setManualTime(e.target.value)}
                      placeholder="۱۶:۳۰"
                      className="w-full px-3 py-2 text-xs font-mono bg-stone-50 dark:bg-[#0E1015] border border-stone-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-600 dark:text-zinc-400 mb-1">مبلغ (تومان):</label>
                    <input
                      type="number"
                      value={manualPrice}
                      onChange={(e) => setManualPrice(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs font-mono bg-stone-50 dark:bg-[#0E1015] border border-stone-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-all mt-2 cursor-pointer"
                >
                  ثبت نوبت
                </button>
              </form>
            )}

            {/* TAB 3: SERVICES */}
            {activeAppTab === 'services' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">خدمات فعال سالن:</span>
                  <span className="text-[10px] text-zinc-500">{toPersianDigits(salonDetailed.services.length)} خدمت</span>
                </div>

                <div className="space-y-2">
                  {salonDetailed.services.map((srv) => (
                    <div
                      key={srv.id}
                      className="p-3 bg-white dark:bg-[#181B24] border border-stone-200 dark:border-zinc-800 rounded-2xl flex items-center justify-between text-xs shadow-xs"
                    >
                      <div>
                        <div className="font-bold text-zinc-900 dark:text-zinc-100">{srv.name}</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">{srv.duration} · {srv.categoryLabel}</div>
                      </div>
                      <div className="text-left font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                        {formatCurrency(srv.price)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: SUBSCRIPTION */}
            {activeAppTab === 'subscription' && (
              <div className="space-y-3.5 bg-white dark:bg-[#181B24] p-4 rounded-2xl border border-stone-200 dark:border-zinc-800">
                <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-zinc-800">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    تمدید اشتراک سالن
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold">
                    فعال
                  </span>
                </div>

                {/* Plan Selection */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block">انتخاب بسته:</label>
                  {[
                    { id: 'gold_vip', name: 'بسته ویژه VIP (۳ ماهه)', price: 3490000, desc: 'پرسنل نامحدود + پیامک' },
                    { id: 'silver', name: 'بسته نقره‌ای (۱ ماهه)', price: 1790000, desc: 'تا ۸ پرسنل + ۳۰۰ پیامک' },
                    { id: 'bronze', name: 'بسته برنزی (۱ ماهه)', price: 890000, desc: 'تا ۳ پرسنل' },
                  ].map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPlanToBuy(p.id as any)}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                        selectedPlanToBuy === p.id
                          ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-zinc-900 dark:text-zinc-100'
                          : 'bg-stone-50 dark:bg-[#0E1015] border-stone-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300'
                      }`}
                    >
                      <div>
                        <div className="font-bold">{p.name}</div>
                        <div className="text-[10px] text-zinc-400">{p.desc}</div>
                      </div>
                      <div className="font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                        {formatCurrency(p.price)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Gateway Selection */}
                <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-zinc-800">
                  <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block">درگاه پرداخت:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'zarinpal', name: 'زرین‌پال' },
                      { id: 'mellat', name: 'ملت' },
                      { id: 'saman', name: 'سامان' },
                    ].map((gw) => (
                      <button
                        key={gw.id}
                        type="button"
                        onClick={() => setSelectedGateway(gw.id as any)}
                        className={`p-2 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                          selectedGateway === gw.id
                            ? 'bg-rose-600 border-rose-600 text-white shadow-xs'
                            : 'bg-stone-50 dark:bg-[#0E1015] border-stone-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        {gw.name}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isProcessingPayment}
                  onClick={handlePaySubscription}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer mt-3"
                >
                  {isProcessingPayment ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4" />
                  )}
                  <span>پرداخت و تمدید اشتراک</span>
                </button>
              </div>
            )}
          </div>

          {/* Android Bottom Navigation Bar */}
          <div className="p-2 bg-white dark:bg-[#14161F] border-t border-stone-200 dark:border-zinc-800 grid grid-cols-3 gap-1 text-center text-[10px]">
            <button
              onClick={() => setActiveAppTab('appointments')}
              className={`p-2 rounded-xl transition-all cursor-pointer flex flex-col items-center gap-1 ${
                activeAppTab === 'appointments'
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>نوبت‌ها</span>
            </button>

            <button
              onClick={() => setActiveAppTab('services')}
              className={`p-2 rounded-xl transition-all cursor-pointer flex flex-col items-center gap-1 ${
                activeAppTab === 'services'
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <Scissors className="w-4 h-4" />
              <span>خدمات</span>
            </button>

            <button
              onClick={() => setActiveAppTab('subscription')}
              className={`p-2 rounded-xl transition-all cursor-pointer flex flex-col items-center gap-1 ${
                activeAppTab === 'subscription'
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>اشتراک سالن</span>
            </button>
          </div>

          {/* Softkeys */}
          <div className="py-2.5 bg-stone-100 dark:bg-[#0D0F14] flex items-center justify-around text-zinc-400 text-xs border-t border-stone-200 dark:border-zinc-800">
            <span>◁</span>
            <span className="w-3.5 h-3.5 rounded-full border border-zinc-400 inline-block" />
            <span>□</span>
          </div>
        </div>
      </div>
    </div>
  );
};
