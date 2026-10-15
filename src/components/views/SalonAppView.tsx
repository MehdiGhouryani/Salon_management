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
  QrCode,
  Image as ImageIcon,
  ChevronLeft,
  Settings,
  HelpCircle,
  Bell,
  Sun,
  Moon,
  MapPin,
  Camera,
  Layers,
  ArrowUpRight,
  ChevronRight,
  Store,
  X,
  TrendingUp,
  Edit3,
  MessageSquare,
  Save,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { useTheme } from '../../context/ThemeContext';
import { CustomerBooking } from '../../types/admin';
import {
  getSalonBySlug,
  updateSalonDetails,
  luxuryBannerPresets,
  DetailedSalonData,
} from '../../mock/salonDirectoryData';
import { toPersianDigits, formatCurrency } from '../../utils/formatters';
import { ThemeToggle } from '../common/ThemeToggle';
import { SalonQrModal } from '../common/SalonQrModal';

export const SalonAppView: React.FC = () => {
  const {
    salons,
    currentSalonSlug,
    setCurrentSalonSlug,
    customerBookings,
    completeCustomerBookingInSalon,
    cancelCustomerBooking,
    addCustomerBooking,
    updateCustomerBooking,
    updateSalonPlan,
    setPersona,
    addToast,
  } = useAdmin();

  const { theme, toggleTheme } = useTheme();

  // Active salon for the salon manager
  const currentSalon = useMemo(() => {
    return salons.find((s) => s.slug === currentSalonSlug) || salons[0];
  }, [salons, currentSalonSlug]);

  const [salonDetailed, setSalonDetailed] = useState<DetailedSalonData>(() => {
    return getSalonBySlug(currentSalon.slug || 'gisara', salons);
  });

  // Keep detailed salon synchronized if current salon changes
  useMemo(() => {
    setSalonDetailed(getSalonBySlug(currentSalon.slug || 'gisara', salons));
  }, [currentSalon, salons]);

  // Android App active tab: 4 standard tabs modeled after Snapp / Digikala
  const [activeAppTab, setActiveAppTab] = useState<
    'appointments' | 'services' | 'showcase' | 'profile'
  >('appointments');

  // Modals and Bottom Sheets state
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [newBookingSheetOpen, setNewBookingSheetOpen] = useState(false);

  // Snapp / Digikala Style Bottom Sheet for Appointment Details & Management
  const [selectedBookingForSheet, setSelectedBookingForSheet] = useState<CustomerBooking | null>(null);
  const [editBookingTime, setEditBookingTime] = useState('');
  const [editBookingStaff, setEditBookingStaff] = useState('');
  const [editBookingNotes, setEditBookingNotes] = useState('');
  const [isEditingTimeMode, setIsEditingTimeMode] = useState(false);

  // New manual appointment form state
  const [manualClientName, setManualClientName] = useState('');
  const [manualClientPhone, setManualClientPhone] = useState('');
  const [manualServiceName, setManualServiceName] = useState('');
  const [manualStaffName, setManualStaffName] = useState('');
  const [manualPrice, setManualPrice] = useState(450000);
  const [manualTime, setManualTime] = useState('۱۶:۰۰');

  // Showcase edit state (banner & tagline)
  const [editableTagline, setEditableTagline] = useState(salonDetailed.tagline);
  const [editableWorkingHours, setEditableWorkingHours] = useState(salonDetailed.workingHours);
  const [editableAddress, setEditableAddress] = useState(salonDetailed.address);
  const [customBannerUrl, setCustomBannerUrl] = useState('');

  // Subscription payment simulation state
  const [selectedPlanToBuy, setSelectedPlanToBuy] = useState<'gold_vip' | 'silver' | 'bronze'>('gold_vip');
  const [selectedGateway, setSelectedGateway] = useState<'zarinpal' | 'mellat' | 'saman'>('zarinpal');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Profile toggles
  const [onlineBookingEnabled, setOnlineBookingEnabled] = useState(true);
  const [smsNotificationEnabled, setSmsNotificationEnabled] = useState(true);

  // Filter bookings for this salon
  const salonBookings = useMemo(() => {
    return customerBookings.filter(
      (b) => b.salonId === currentSalon.id || b.salonName.includes(currentSalon.name)
    );
  }, [customerBookings, currentSalon]);

  // Daily Settlement Stats (خلاصه صندوق و تسویه روزانه سالن)
  const dailyStats = useMemo(() => {
    const completedList = salonBookings.filter((b) => b.status === 'completed');
    const confirmedList = salonBookings.filter((b) => b.status === 'confirmed');
    const totalCollected = completedList.reduce((sum, b) => sum + (b.price || 0), 0);
    const pendingCollection = confirmedList.reduce((sum, b) => sum + (b.price || 0), 0);

    return {
      completedCount: completedList.length,
      confirmedCount: confirmedList.length,
      totalCollected,
      pendingCollection,
    };
  }, [salonBookings]);

  // Handle URL Copy
  const handleCopySalonUrl = () => {
    const url = `https://nobatara.ir/${currentSalon.slug || 'gisara'}`;
    navigator.clipboard?.writeText(url);
    setCopiedLink(true);
    addToast({
      type: 'success',
      title: 'لینک صفحه سالن کپی شد',
      message: url,
    });
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Handle Banner change
  const handleSelectBannerPreset = (url: string) => {
    const updated = updateSalonDetails(currentSalon.slug || 'gisara', {
      bannerImage: url,
    });
    setSalonDetailed(updated);
    addToast({
      type: 'success',
      title: 'تصویر هدر سایت سالن تغییر یافت',
      message: 'تغییرات بلافاصله در وب‌سایت مشتریان اعمال گردید.',
    });
  };

  const handleSaveCustomBanner = () => {
    if (!customBannerUrl.trim()) return;
    const updated = updateSalonDetails(currentSalon.slug || 'gisara', {
      bannerImage: customBannerUrl.trim(),
    });
    setSalonDetailed(updated);
    setCustomBannerUrl('');
    addToast({
      type: 'success',
      title: 'تصویر اختصاصی بنر سالن ذخیره شد',
    });
  };

  const handleSaveShowcaseDetails = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = updateSalonDetails(currentSalon.slug || 'gisara', {
      tagline: editableTagline,
      workingHours: editableWorkingHours,
      address: editableAddress,
    });
    setSalonDetailed(updated);
    addToast({
      type: 'success',
      title: 'مشخصات ویترین سالن ذخیره شد',
      message: 'اطلاعات در وب‌سایت به‌روزرسانی شدند.',
    });
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
      serviceName: manualServiceName || 'خدمت حضوری سالن',
      serviceCategory: 'نوبت حضوری سالن',
      staffName: manualStaffName || salonDetailed.staff[0]?.name || 'پرسنل سالن',
      date: 'امروز',
      time: manualTime,
      price: manualPrice,
      paymentMethod: 'in_person',
      createdAt: 'هم‌اکنون',
      status: 'confirmed',
    });

    setManualClientName('');
    setManualClientPhone('');
    setNewBookingSheetOpen(false);

    addToast({
      type: 'success',
      title: 'نوبت جدید ثبت شد',
      message: `${manualClientName.trim()} · ساعت ${manualTime}`,
    });
  };

  // Open Snapp/Digikala bottom sheet for appointment detail & edit
  const handleOpenBookingSheet = (b: CustomerBooking) => {
    setSelectedBookingForSheet(b);
    setEditBookingTime(b.time);
    setEditBookingStaff(b.staffName);
    setEditBookingNotes(b.notes || '');
    setIsEditingTimeMode(false);
  };

  // Save changes to existing booking from bottom sheet
  const handleSaveBookingChanges = () => {
    if (!selectedBookingForSheet) return;
    updateCustomerBooking(selectedBookingForSheet.id, {
      time: editBookingTime,
      staffName: editBookingStaff,
      notes: editBookingNotes,
    });
    setSelectedBookingForSheet((prev) =>
      prev
        ? {
            ...prev,
            time: editBookingTime,
            staffName: editBookingStaff,
            notes: editBookingNotes,
          }
        : null
    );
    setIsEditingTimeMode(false);
  };

  const handleSendClientSms = (phone: string, clientName: string) => {
    addToast({
      type: 'info',
      title: 'پیامک تایید به مشتری صادر شد',
      message: `اطلاعیه نوبت به ${phone} (${clientName}) تحویل داده شد.`,
    });
  };

  // Handle B2B Subscription Payment simulation
  const handlePaySubscription = () => {
    setIsProcessingPayment(true);
    setTimeout(() => {
      setIsProcessingPayment(false);
      updateSalonPlan(currentSalon.id, selectedPlanToBuy);
      setSubModalOpen(false);
      addToast({
        type: 'success',
        title: 'اشتراک سالن با موفقیت تمدید شد',
        message: 'تراکنش موفق درگاه بانکی شاپرک. پلن جدید فعال گردید.',
      });
    }, 1200);
  };

  return (
    <div
      className="min-h-screen bg-[#F4F4F5] dark:bg-[#0B1120] text-slate-900 dark:text-[#E7ECF5] py-2 px-1 sm:py-6 sm:px-4 font-sans antialiased transition-colors"
      dir="rtl"
    >
      {/* Top Controller Bar */}
      <div className="max-w-4xl mx-auto mb-4 sm:mb-6 bg-white dark:bg-[#111B2E] border border-slate-200 dark:border-[#344258] rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 shadow-xs">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-[#E7ECF5] flex items-center gap-2">
              <span>اپلیکیشن مدیر سالن</span>
              <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#18243A] text-slate-600 dark:text-[#9AAAC2] font-mono">
                نسخه مدیریت هوشمند
              </span>
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-[#9AAAC2] mt-0.5">
              مدیریت نوبت‌ها، تسویه حضوری، بارکد QR اختصاصی و تنظیمات وب‌سایت
            </p>
          </div>
        </div>

        {/* Change Salon selector, QR Trigger, and Theme Toggle */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
          <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
            <span className="text-xs text-slate-500 dark:text-[#9AAAC2] whitespace-nowrap">سالن:</span>
            <select
              value={currentSalon.slug}
              onChange={(e) => setCurrentSalonSlug(e.target.value)}
              className="flex-1 sm:flex-initial px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-[#18243A] border border-slate-200 dark:border-[#344258] rounded-xl text-slate-900 dark:text-[#E7ECF5] focus:outline-none focus:border-rose-500 cursor-pointer font-medium"
            >
              {salons.map((s) => (
                <option key={s.id} value={s.slug}>
                  {s.name} ({s.city})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setQrModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-100 dark:bg-[#18243A] hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#344258] transition-colors cursor-pointer"
            title="مشاهده و چاپ کد QR سالن"
          >
            <QrCode className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span className="hidden sm:inline">بارکد QR</span>
          </button>

          <ThemeToggle variant="segmented" className="hidden sm:inline-flex" />
          <ThemeToggle variant="icon" className="sm:hidden" />
        </div>
      </div>

      {/* MOBILE DEVICE CASING CONTAINER */}
      <div className="max-w-md mx-auto relative">
        <div className="relative bg-white dark:bg-[#111B2E] border border-slate-200 dark:border-[#344258] sm:border-[8px] sm:border-slate-300 sm:dark:border-[#344258] rounded-2xl sm:rounded-[44px] shadow-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/5">
          {/* Top Notch & Speaker (Visible on desktop simulator only) */}
          <div className="hidden sm:flex absolute top-2 left-1/2 -translate-x-1/2 w-28 h-3.5 bg-slate-200 dark:bg-[#18243A] rounded-full z-30 items-center justify-center gap-2">
            <div className="w-8 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
            <div className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-950" />
          </div>

          {/* Android Status Bar */}
          <div className="pt-2 sm:pt-3 pb-1.5 px-4 sm:px-6 bg-slate-100 dark:bg-[#0B1120] text-[11px] font-mono text-slate-500 dark:text-[#9AAAC2] flex items-center justify-between border-b border-slate-200 dark:border-[#344258]/80 z-20">
            <span className="font-bold text-slate-800 dark:text-slate-200">۱۰:۲۸</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px]">5G</span>
              <Wifi className="w-3.5 h-3.5 text-slate-400" />
              <div className="flex items-center gap-1">
                <span className="text-[10px]">۹۲٪</span>
                <Battery className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </div>

          {/* App Top Compact Bar */}
          <div className="px-4 py-3 bg-slate-50 dark:bg-[#0B1120] border-b border-slate-200 dark:border-[#344258] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {currentSalon.name.slice(0, 2)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {currentSalon.name}
                  </h3>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                </div>
                <span className="text-[10px] text-slate-500 dark:text-[#9AAAC2] block truncate">
                  {currentSalon.city} · مدیر: {currentSalon.ownerName}
                </span>
              </div>
            </div>

            {/* Quick QR & Share Button */}
            <button
              onClick={() => setQrModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 text-[10px] font-bold cursor-pointer active:scale-95 transition-all"
            >
              <QrCode className="w-3 h-3" />
              <span>کد QR</span>
            </button>
          </div>

          {/* App Scrollable Content Area */}
          <div className="h-[490px] overflow-y-auto p-4 space-y-4 bg-slate-50/60 dark:bg-[#0B1120]/60 text-slate-900 dark:text-[#E7ECF5]">
            {/* ==================================================== */}
            {/* TAB 1: APPOINTMENTS & DAILY SETTLEMENT */}
            {/* ==================================================== */}
            {activeAppTab === 'appointments' && (
              <div className="space-y-3.5">
                {/* 1. Daily Settlement & Cashflow Summary Card (خلاصه دخل روزانه) */}
                <div className="p-3.5 bg-white dark:bg-[#111B2E] border border-slate-200/90 dark:border-[#344258] rounded-2xl shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      خلاصه دخل و تسویه امروز
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {toPersianDigits(dailyStats.completedCount + dailyStats.confirmedCount)} نوبت کل
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 rounded-xl">
                      <span className="text-[10px] text-emerald-800 dark:text-emerald-300 block">
                        تسویه شده امروز:
                      </span>
                      <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 font-mono tabular-nums mt-0.5 block">
                        {formatCurrency(dailyStats.totalCollected)}
                      </span>
                    </div>

                    <div className="p-2.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 rounded-xl">
                      <span className="text-[10px] text-amber-800 dark:text-amber-300 block">
                        در انتظار تسویه:
                      </span>
                      <span className="text-xs font-black text-amber-700 dark:text-amber-400 font-mono tabular-nums mt-0.5 block">
                        {formatCurrency(dailyStats.pendingCollection)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Appointments Header & Bottom Sheet Trigger */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    صف نوبت‌های سالن:
                  </span>
                  <button
                    onClick={() => setNewBookingSheetOpen(true)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold cursor-pointer shadow-xs active:scale-95 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>نوبت حضوری جدید</span>
                  </button>
                </div>

                {/* 3. Appointment Cards List */}
                {salonBookings.length === 0 ? (
                  <div className="p-8 text-center bg-white dark:bg-[#111B2E] border border-slate-200/90 dark:border-[#344258] rounded-2xl space-y-2.5">
                    <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs text-slate-500 dark:text-[#9AAAC2]">
                      نوبتی در صف انتظار این سالن نیست.
                    </p>
                    <button
                      onClick={() => {
                        setCurrentSalonSlug(currentSalon.slug || 'gisara');
                        setPersona('salon_website');
                      }}
                      className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-bold cursor-pointer inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      ثبت یک نوبت آزمایشی در وب‌سایت
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {salonBookings.map((b) => {
                      const isCompleted = b.status === 'completed';
                      const isCancelled = b.status === 'cancelled';
                      return (
                        <div
                          key={b.id}
                          onClick={() => handleOpenBookingSheet(b)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer group relative ${
                            isCompleted
                              ? 'bg-slate-50 dark:bg-[#111B2E]/70 border-emerald-200/60 dark:border-emerald-800/40 opacity-90'
                              : isCancelled
                              ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/30 opacity-60'
                              : 'bg-white dark:bg-[#111B2E] border-slate-200/90 dark:border-[#344258] shadow-xs hover:border-rose-300 dark:hover:border-rose-900/50 hover:shadow-md'
                          }`}
                        >
                          {/* Top row */}
                          <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100 dark:border-[#344258]">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-[#E7ECF5] group-hover:text-rose-600 transition-colors">
                                {b.clientName}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500 dark:text-[#9AAAC2]">
                                {b.clientPhone}
                              </span>
                            </div>
                            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-lg border border-rose-200/60 dark:border-rose-900/30">
                              <Clock className="w-3 h-3" />
                              <span>{b.date} · {b.time}</span>
                            </span>
                          </div>

                          {/* Details */}
                          <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-600 dark:text-[#9AAAC2] mb-2.5">
                            <div>
                              خدمت:{' '}
                              <strong className="text-slate-900 dark:text-slate-200">
                                {b.serviceName}
                              </strong>
                            </div>
                            <div>
                              متخصص:{' '}
                              <span className="text-slate-700 dark:text-[#9AAAC2] font-medium">{b.staffName}</span>
                            </div>
                            <div>
                              مبلغ خدمت:{' '}
                              <strong className="text-rose-600 dark:text-rose-400 font-mono tabular-nums">
                                {formatCurrency(b.price)}
                              </strong>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                              <CreditCard className="w-3 h-3" />
                              تسویه حضوری در سالن
                            </div>
                          </div>

                          {/* Action Bar */}
                          <div className="pt-2 border-t border-slate-100 dark:border-[#344258] flex items-center justify-between gap-2">
                            <span className="text-[10px] text-slate-400 flex items-center gap-1 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors font-medium">
                              <Edit3 className="w-3 h-3" />
                              <span>جزئیات و ویرایش نوبت</span>
                            </span>

                            {isCompleted ? (
                              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                تسویه شده در محل
                              </span>
                            ) : isCancelled ? (
                              <span className="text-[11px] text-rose-500 font-bold">
                                نوبت لغو شده
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  completeCustomerBookingInSalon(b.id);
                                }}
                                className="py-1 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold shadow-xs flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>تکمیل و تسویه</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ==================================================== */}
            {/* TAB 2: SERVICES & STAFF */}
            {/* ==================================================== */}
            {activeAppTab === 'services' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Scissors className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    خدمات فعال سالن در وب‌سایت:
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {toPersianDigits(salonDetailed.services.length)} لاین فعال
                  </span>
                </div>

                <div className="space-y-2">
                  {salonDetailed.services.map((srv) => (
                    <div
                      key={srv.id}
                      className="p-3 bg-white dark:bg-[#111B2E] border border-slate-200 dark:border-[#344258] rounded-xl flex items-center justify-between text-xs shadow-xs"
                    >
                      <div className="min-w-0 pr-1">
                        <div className="font-bold text-slate-900 dark:text-[#E7ECF5] truncate">
                          {srv.name}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-[#9AAAC2] mt-0.5">
                          {srv.duration} · {srv.categoryLabel}
                        </div>
                      </div>
                      <div className="text-left font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums shrink-0 mr-2">
                        {formatCurrency(srv.price)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Staff List Preview */}
                <div className="pt-3 border-t border-slate-200 dark:border-[#344258] space-y-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    پرسنل و متخصصین سالن:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {salonDetailed.staff.map((st) => (
                      <div
                        key={st.id}
                        className="p-2.5 bg-white dark:bg-[#111B2E] border border-slate-200 dark:border-[#344258] rounded-xl flex items-center gap-2"
                      >
                        <img
                          src={st.avatar}
                          alt={st.name}
                          className="w-8 h-8 rounded-full object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 dark:text-[#E7ECF5] truncate">
                            {st.name}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate mt-0.5">
                            {st.role}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ==================================================== */}
            {/* TAB 3: SHOWCASE & BANNER EDITOR */}
            {/* ==================================================== */}
            {activeAppTab === 'showcase' && (
              <div className="space-y-4">
                {/* Header Section */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Store className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      ویترین و مشخصات صفحه اختصاصی سالن
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-[#9AAAC2]">
                      تنظیم بنر، تیتر معرفی و نحوه نمایش در سایت
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setCurrentSalonSlug(currentSalon.slug || 'gisara');
                      setPersona('salon_website');
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                  >
                    <span>مشاهده سایت</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                {/* Current Banner Preview Card */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-[#9AAAC2] block">
                    تصویر هدر فعلی وب‌سایت:
                  </label>
                  <div className="relative h-28 rounded-2xl overflow-hidden border border-slate-200 dark:border-[#344258] group shadow-sm">
                    <img
                      src={salonDetailed.bannerImage}
                      alt={salonDetailed.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-2.5">
                      <span className="text-[11px] text-white font-bold flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                        هدر فعال در وب‌سایت مشتریان
                      </span>
                    </div>
                  </div>
                </div>

                {/* Curated Luxury Banner Presets */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-[#9AAAC2] block">
                    انتخاب سریع از بین بنرهای لوکس سالن:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {luxuryBannerPresets.map((preset) => {
                      const isSelected = salonDetailed.bannerImage === preset.url;
                      return (
                        <div
                          key={preset.id}
                          onClick={() => handleSelectBannerPreset(preset.url)}
                          className={`relative rounded-xl overflow-hidden border cursor-pointer transition-all h-20 group ${
                            isSelected
                              ? 'ring-2 ring-rose-500 border-rose-500 shadow-md'
                              : 'border-slate-200 dark:border-[#344258] hover:border-slate-400'
                          }`}
                        >
                          <img
                            src={preset.url}
                            alt={preset.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-end p-1.5">
                            <span className="text-[10px] text-white font-bold truncate leading-tight">
                              {preset.name}
                            </span>
                          </div>
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Custom URL Input */}
                <div className="p-3 bg-white dark:bg-[#111B2E] border border-slate-200 dark:border-[#344258] rounded-xl space-y-2">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-[#9AAAC2] block">
                    یا ثبت آدرس اینترنتی عکس اختصاصی:
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={customBannerUrl}
                      onChange={(e) => setCustomBannerUrl(e.target.value)}
                      placeholder="https://.../my-salon-banner.jpg"
                      className="flex-1 px-3 py-1.5 text-xs ltr font-mono bg-slate-50 dark:bg-[#18243A] border border-slate-200 dark:border-[#344258] rounded-lg text-slate-900 dark:text-[#E7ECF5] focus:outline-none focus:border-rose-500"
                    />
                    <button
                      type="button"
                      onClick={handleSaveCustomBanner}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 text-white text-xs font-bold rounded-lg cursor-pointer transition-all active:scale-95"
                    >
                      اعمال
                    </button>
                  </div>
                </div>

                {/* Showcase Details Form */}
                <form
                  onSubmit={handleSaveShowcaseDetails}
                  className="p-3.5 bg-white dark:bg-[#111B2E] border border-slate-200 dark:border-[#344258] rounded-xl space-y-3"
                >
                  <span className="text-xs font-bold text-slate-900 dark:text-[#E7ECF5] block pb-1 border-b border-slate-100 dark:border-[#344258]">
                    اطلاعات متنی صفحه وب‌سایت
                  </span>

                  <div>
                    <label className="block text-[11px] text-slate-600 dark:text-[#9AAAC2] mb-1">
                      تیتر معرفی کوتاه (Tagline):
                    </label>
                    <textarea
                      rows={2}
                      value={editableTagline}
                      onChange={(e) => setEditableTagline(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#18243A] border border-slate-200 dark:border-[#344258] rounded-lg text-slate-900 dark:text-[#E7ECF5] focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-600 dark:text-[#9AAAC2] mb-1">
                      ساعات کاری سالن:
                    </label>
                    <input
                      type="text"
                      value={editableWorkingHours}
                      onChange={(e) => setEditableWorkingHours(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-[#18243A] border border-slate-200 dark:border-[#344258] rounded-lg text-slate-900 dark:text-[#E7ECF5] focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-600 dark:text-[#9AAAC2] mb-1">
                      آدرس دقیق سالن:
                    </label>
                    <input
                      type="text"
                      value={editableAddress}
                      onChange={(e) => setEditableAddress(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-[#18243A] border border-slate-200 dark:border-[#344258] rounded-lg text-slate-900 dark:text-[#E7ECF5] focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    ذخیره تغییرات ویترین سایت
                  </button>
                </form>
              </div>
            )}

            {/* ==================================================== */}
            {/* TAB 4: PROFILE & MANAGEMENT (SNAPP / DIGIKALA STYLE) */}
            {/* ==================================================== */}
            {activeAppTab === 'profile' && (
              <div className="space-y-4">
                {/* 1. Profile Header Card */}
                <div className="p-4 bg-white dark:bg-[#111B2E] border border-slate-200 dark:border-[#344258] rounded-2xl shadow-xs space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 to-rose-400 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                        {currentSalon.name.slice(0, 2)}
                      </div>
                      <div className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center border-2 border-white dark:border-[#344258]">
                        <Check className="w-3 h-3" />
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {currentSalon.name}
                        </h3>
                      </div>
                      <span className="text-xs text-slate-600 dark:text-[#9AAAC2] block mt-0.5">
                        مدیریت: {currentSalon.ownerName}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
                        {currentSalon.phone}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-[#344258] flex items-center justify-between text-[11px] text-slate-500 dark:text-[#9AAAC2]">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      حساب تجاری رسمی احراز هویت شده
                    </span>
                    <span className="font-mono text-slate-400">
                      کد {currentSalon.id}
                    </span>
                  </div>
                </div>

                {/* 2. Subscription Status Card (Integrated into Profile) */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 dark:from-[#151F32] dark:to-[#0F172A] text-white shadow-md border border-slate-800 dark:border-[#344258]/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold">
                          {currentSalon.plan === 'gold_vip'
                            ? 'اشتراک طلایی VIP سالن'
                            : currentSalon.plan === 'silver'
                            ? 'اشتراک نقره‌ای سالن'
                            : 'اشتراک برنزی پایه'}
                        </div>
                        <div className="text-[10px] text-slate-300">
                          انقضا: {currentSalon.planExpiry} (۲۶ روز مانده)
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                      فعال
                    </span>
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-2 border-t border-white/10">
                    <span className="text-[10px] text-slate-300">
                      پرسنل نامحدود · پیامک خودکار · درگاه اختصاصی
                    </span>
                    <button
                      onClick={() => setSubModalOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>تمدید / ارتقا</span>
                    </button>
                  </div>
                </div>

                {/* 3. Snapp/Digikala Navigation Rows */}
                <div className="bg-white dark:bg-[#111B2E] border border-slate-200 dark:border-[#344258] rounded-2xl shadow-xs divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden text-xs">
                  {/* Row 1: QR Code & Direct Link */}
                  <div
                    onClick={() => setQrModalOpen(true)}
                    className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-[#151F32]/50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                        <QrCode className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-[#E7ECF5]">
                          بارکد QR اختصاصی و لینک سالن
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-[#9AAAC2]">
                          چاپ برای آینه‌ها، استند و اشتراک با مشتریان
                        </div>
                      </div>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-rose-600 transition-colors" />
                  </div>

                  {/* Row 2: Online booking toggle */}
                  <div className="p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-[#E7ECF5]">
                          پذیرش نوبت آنلاین در سایت
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-[#9AAAC2]">
                          امکان رزرو توسط مشتریان فعال باشد
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setOnlineBookingEnabled(!onlineBookingEnabled);
                        addToast({
                          type: 'info',
                          title: !onlineBookingEnabled
                            ? 'پذیرش نوبت آنلاین فعال شد'
                            : 'پذیرش نوبت آنلاین موقتاً متوقف شد',
                        });
                      }}
                      className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                        onlineBookingEnabled ? 'bg-emerald-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                      }`}
                    >
                      <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                    </button>
                  </div>

                  {/* Row 3: SMS notification toggle */}
                  <div className="p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-[#E7ECF5]">
                          پیامک خودکار تایید و یادآوری
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-[#9AAAC2]">
                          ارسال کد پیگیری بلافاصله پس از ثبت نوبت
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSmsNotificationEnabled(!smsNotificationEnabled);
                        addToast({
                          type: 'info',
                          title: !smsNotificationEnabled
                            ? 'ارسال پیامک فعال شد'
                            : 'ارسال پیامک متوقف شد',
                        });
                      }}
                      className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                        smsNotificationEnabled ? 'bg-emerald-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                      }`}
                    >
                      <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                    </button>
                  </div>

                  {/* Row 4: Working hours & Showcase jump */}
                  <div
                    onClick={() => setActiveAppTab('showcase')}
                    className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-[#151F32]/50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-[#E7ECF5]">
                          ساعات کاری و مشخصات ویترین
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-[#9AAAC2]">
                          ویرایش عکس بنر، آدرس و زمان‌بندی سالن
                        </div>
                      </div>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-rose-600 transition-colors" />
                  </div>

                  {/* Row 5: Theme switcher row */}
                  <div
                    onClick={toggleTheme}
                    className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-[#151F32]/50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-[#E7ECF5]">
                          حالت نمایش (تاریک / روشن)
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-[#9AAAC2]">
                          {theme === 'dark' ? 'تم سرمه‌ای شب فعال است' : 'تم روز فعال است'}
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                      تغییر تم
                    </span>
                  </div>

                  {/* Row 6: 24/7 Support */}
                  <div
                    onClick={() => {
                      addToast({
                        type: 'info',
                        title: 'پشتیبانی اختصاصی نوبت‌آرا',
                        message: 'شماره مستقیم پشتیبانی: ۰۲۱-۹۱۰۰۸۰۰۰ (پاسخگویی ۲۴ ساعته)',
                      });
                    }}
                    className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-[#151F32]/50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#18243A] text-slate-600 dark:text-[#9AAAC2] flex items-center justify-center">
                        <HelpCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-[#E7ECF5]">
                          پشتیبانی و راهنمای سالن‌ها
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-[#9AAAC2]">
                          تماس با کارشناس سامانه نوبت‌آرا
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      ۰۲۱-۹۱۰۰۸۰۰۰
                    </span>
                  </div>
                </div>

                {/* Switch to Super Admin / Log Out */}
                <button
                  onClick={() => setPersona('super_admin')}
                  className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-[#344258] bg-white dark:bg-[#111B2E] text-slate-600 dark:text-[#9AAAC2] hover:text-rose-600 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>ورود به پنل مرکزی نظارت کل پلتفرم (سوپر ادمین)</span>
                </button>
              </div>
            )}
          </div>

          {/* Android Bottom Navigation Bar (4 CLEAN TABS: Calendar, Services, Showcase, Profile) */}
          <div className="p-2 bg-white dark:bg-[#0B1120] border-t border-slate-200 dark:border-[#344258] grid grid-cols-4 gap-1 text-center text-[10px] select-none shadow-sm">
            <button
              onClick={() => setActiveAppTab('appointments')}
              className={`p-2 rounded-xl transition-all cursor-pointer flex flex-col items-center gap-1 min-h-[44px] justify-center ${
                activeAppTab === 'appointments'
                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>نوبت‌ها</span>
            </button>

            <button
              onClick={() => setActiveAppTab('services')}
              className={`p-2 rounded-xl transition-all cursor-pointer flex flex-col items-center gap-1 min-h-[44px] justify-center ${
                activeAppTab === 'services'
                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Scissors className="w-4 h-4" />
              <span>خدمات</span>
            </button>

            <button
              onClick={() => setActiveAppTab('showcase')}
              className={`p-2 rounded-xl transition-all cursor-pointer flex flex-col items-center gap-1 min-h-[44px] justify-center ${
                activeAppTab === 'showcase'
                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>ویترین سایت</span>
            </button>

            <button
              onClick={() => setActiveAppTab('profile')}
              className={`p-2 rounded-xl transition-all cursor-pointer flex flex-col items-center gap-1 min-h-[44px] justify-center ${
                activeAppTab === 'profile'
                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <User className="w-4 h-4" />
              <span>پروفایل</span>
            </button>
          </div>

          {/* ========================================================= */}
          {/* 1. AUTHENTIC MOBILE BOTTOM SHEET: NEW APPOINTMENT (SNAPP / DIGIKALA STYLE) */}
          {/* ========================================================= */}
          {newBookingSheetOpen && (
            <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-200">
              <div
                className="bg-white dark:bg-[#111B2E] border-t border-slate-200 dark:border-[#344258] rounded-t-3xl p-4 sm:p-5 shadow-2xl max-h-[90%] overflow-y-auto animate-in slide-in-from-bottom duration-300 space-y-3.5"
                dir="rtl"
              >
                {/* Swipe / drag handle indicator */}
                <div className="w-12 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto cursor-grab" />

                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#344258]">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                      <Plus className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        ثبت نوبت حضوری جدید
                      </h4>
                      <span className="text-[10px] text-slate-500 dark:text-[#9AAAC2] block">
                        مشابه ثبت سریع در اپلیکیشن‌های اسنپ و دیجی‌کالا
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setNewBookingSheetOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#18243A] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleCreateManualBooking} className="space-y-3 text-xs">
                  {/* Client Info */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-[#9AAAC2] mb-1">
                        نام مشتری:
                      </label>
                      <input
                        type="text"
                        required
                        value={manualClientName}
                        onChange={(e) => setManualClientName(e.target.value)}
                        placeholder="پریناز معتمدی"
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#18243A] border border-slate-200 dark:border-[#344258] rounded-xl text-slate-900 dark:text-[#E7ECF5] focus:outline-none focus:border-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-[#9AAAC2] mb-1">
                        تلفن همراه:
                      </label>
                      <input
                        type="tel"
                        required
                        value={manualClientPhone}
                        onChange={(e) => setManualClientPhone(e.target.value)}
                        placeholder="09121112233"
                        className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-[#18243A] border border-slate-200 dark:border-[#344258] rounded-xl text-slate-900 dark:text-[#E7ECF5] focus:outline-none focus:border-rose-500 text-right"
                      />
                    </div>
                  </div>

                  {/* Quick Service Selection Chips */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-[#9AAAC2]">
                      انتخاب سریع از خدمات سالن:
                    </label>
                    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                      {salonDetailed.services.map((srv) => (
                        <button
                          key={srv.id}
                          type="button"
                          onClick={() => {
                            setManualServiceName(srv.name);
                            setManualPrice(srv.price);
                          }}
                          className={`px-2.5 py-1.5 rounded-xl border text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                            manualServiceName === srv.name
                              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                              : 'bg-slate-50 dark:bg-[#18243A] border-slate-200 dark:border-[#344258] text-slate-700 dark:text-[#9AAAC2] hover:border-rose-300'
                          }`}
                        >
                          {srv.name} ({formatCurrency(srv.price)})
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Staff Chips */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-[#9AAAC2]">
                      انتخاب متخصص سالن:
                    </label>
                    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                      {salonDetailed.staff.map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setManualStaffName(st.name)}
                          className={`px-2.5 py-1 rounded-xl border text-[10px] font-medium whitespace-nowrap transition-all cursor-pointer ${
                            manualStaffName === st.name || (!manualStaffName && salonDetailed.staff[0]?.name === st.name)
                              ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 font-bold'
                              : 'bg-slate-50 dark:bg-[#18243A] border-slate-200 dark:border-[#344258] text-slate-600 dark:text-[#9AAAC2]'
                          }`}
                        >
                          {st.name} ({st.role})
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Time slots */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-[#9AAAC2]">
                      ساعت نوبت:
                    </label>
                    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                      {['۱۰:۰۰', '۱۱:۳۰', '۱۳:۰۰', '۱۴:۳۰', '۱۶:۰۰', '۱۷:۳۰', '۱۹:۰۰', '۲۰:۳۰'].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setManualTime(t)}
                          className={`px-2.5 py-1 rounded-xl border text-[10px] font-mono font-bold transition-all cursor-pointer ${
                            manualTime === t
                              ? 'bg-rose-600 text-white border-rose-600'
                              : 'bg-slate-50 dark:bg-[#18243A] border-slate-200 dark:border-[#344258] text-slate-700 dark:text-[#9AAAC2]'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[10px] font-medium text-slate-600 dark:text-[#9AAAC2] mb-1">
                        زمان سفارشی:
                      </label>
                      <input
                        type="text"
                        value={manualTime}
                        onChange={(e) => setManualTime(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-[#18243A] border border-slate-200 dark:border-[#344258] rounded-xl text-slate-900 dark:text-[#E7ECF5]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-600 dark:text-[#9AAAC2] mb-1">
                        مبلغ تسویه (تومان):
                      </label>
                      <input
                        type="number"
                        value={manualPrice}
                        onChange={(e) => setManualPrice(Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-[#18243A] border border-slate-200 dark:border-[#344258] rounded-xl text-slate-900 dark:text-[#E7ECF5]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 mt-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>ثبت فوری نوبت در دفترچه سالن</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 2. AUTHENTIC MOBILE BOTTOM SHEET: APPOINTMENT DETAILS & EDIT (SNAPP / DIGIKALA STYLE) */}
          {/* ========================================================= */}
          {selectedBookingForSheet && (
            <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-200">
              <div
                className="bg-white dark:bg-[#111B2E] border-t border-slate-200 dark:border-[#344258] rounded-t-3xl p-4 sm:p-5 shadow-2xl max-h-[90%] overflow-y-auto animate-in slide-in-from-bottom duration-300 space-y-3.5"
                dir="rtl"
              >
                {/* Swipe / drag indicator */}
                <div className="w-12 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto cursor-grab" />

                {/* Header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-[#344258]">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {selectedBookingForSheet.clientName}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono text-slate-500 dark:text-[#9AAAC2]">
                          {selectedBookingForSheet.clientPhone}
                        </span>
                        {selectedBookingForSheet.status === 'completed' ? (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 font-bold border border-emerald-200 dark:border-emerald-800">
                            تسویه شده
                          </span>
                        ) : selectedBookingForSheet.status === 'cancelled' ? (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 font-bold border border-rose-200 dark:border-rose-900">
                            لغو شده
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 font-bold border border-amber-200 dark:border-amber-800">
                            در انتظار تسویه حضوری
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedBookingForSheet(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#18243A] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Quick Client Actions */}
                <div className="grid grid-cols-3 gap-2">
                  <a
                    href={`tel:${selectedBookingForSheet.clientPhone}`}
                    className="py-1.5 px-2 rounded-xl bg-slate-50 dark:bg-[#18243A] hover:bg-slate-100 dark:hover:bg-[#18243A] border border-slate-200 dark:border-[#344258] text-slate-800 dark:text-slate-200 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                  >
                    <Phone className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>تماس با مشتری</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => handleSendClientSms(selectedBookingForSheet.clientPhone, selectedBookingForSheet.clientName)}
                    className="py-1.5 px-2 rounded-xl bg-slate-50 dark:bg-[#18243A] hover:bg-slate-100 dark:hover:bg-[#18243A] border border-slate-200 dark:border-[#344258] text-slate-800 dark:text-slate-200 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                    <span>ارسال پیامک</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(selectedBookingForSheet.clientPhone);
                      addToast({ type: 'success', title: 'شماره تلفن کپی شد' });
                    }}
                    className="py-1.5 px-2 rounded-xl bg-slate-50 dark:bg-[#18243A] hover:bg-slate-100 dark:hover:bg-[#18243A] border border-slate-200 dark:border-[#344258] text-slate-800 dark:text-slate-200 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3 h-3 text-slate-400" />
                    <span>کپی شماره</span>
                  </button>
                </div>

                {/* Appointment Card Prominent Info (No tracking code!) */}
                <div className="p-3.5 bg-slate-50 dark:bg-[#18243A] border border-slate-200 dark:border-[#344258] rounded-2xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-[#9AAAC2] text-[11px]">تاریخ و زمان نوبت:</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400 font-mono flex items-center gap-1 bg-white dark:bg-[#111B2E] px-2 py-0.5 rounded-lg border border-slate-200 dark:border-[#344258]">
                      <Clock className="w-3 h-3" />
                      <span>{selectedBookingForSheet.date} · ساعت {selectedBookingForSheet.time}</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-[#344258]/60">
                    <span className="text-slate-500 text-[11px]">خدمت درخواستی:</span>
                    <strong className="text-slate-900 dark:text-[#E7ECF5]">{selectedBookingForSheet.serviceName}</strong>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-[#344258]/60">
                    <span className="text-slate-500 text-[11px]">متخصص مسئول:</span>
                    <span className="text-slate-800 dark:text-slate-200 font-medium">{selectedBookingForSheet.staffName}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-[#344258]/60">
                    <span className="text-slate-500 text-[11px]">مبلغ خدمت:</span>
                    <strong className="text-rose-600 dark:text-rose-400 font-mono tabular-nums text-xs">
                      {formatCurrency(selectedBookingForSheet.price)}
                    </strong>
                  </div>
                </div>

                {/* Reschedule & Staff Edit Section */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                      <span>تغییر ساعت نوبت:</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsEditingTimeMode(!isEditingTimeMode)}
                      className="text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:underline"
                    >
                      {isEditingTimeMode ? 'بستن لیست ساعت‌ها' : 'انتخاب ساعت جدید'}
                    </button>
                  </div>

                  {isEditingTimeMode && (
                    <div className="space-y-2 p-2.5 bg-white dark:bg-[#111B2E] border border-slate-200 dark:border-[#344258] rounded-xl">
                      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                        {['۱۰:۰۰', '۱۱:۳۰', '۱۲:۰۰', '۱۴:۳۰', '۱۶:۰۰', '۱۷:۳۰', '۱۹:۰۰', '۲۰:۳۰'].map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setEditBookingTime(slot)}
                            className={`px-2.5 py-1 rounded-xl border text-[10px] font-mono font-bold transition-all cursor-pointer ${
                              editBookingTime === slot
                                ? 'bg-rose-600 text-white border-rose-600'
                                : 'bg-slate-50 dark:bg-[#18243A] border-slate-200 dark:border-[#344258] text-slate-700 dark:text-[#9AAAC2]'
                            }`}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 whitespace-nowrap">ساعت سفارشی:</span>
                        <input
                          type="text"
                          value={editBookingTime}
                          onChange={(e) => setEditBookingTime(e.target.value)}
                          className="flex-1 px-2.5 py-1 text-xs font-mono bg-slate-50 dark:bg-[#18243A] border border-slate-200 dark:border-[#344258] rounded-xl text-slate-900 dark:text-[#E7ECF5]"
                        />
                      </div>
                    </div>
                  )}

                  {/* Staff selection */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-200 mb-1">
                      متخصص سالن:
                    </label>
                    <select
                      value={editBookingStaff}
                      onChange={(e) => setEditBookingStaff(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-[#18243A] border border-slate-200 dark:border-[#344258] rounded-xl text-slate-900 dark:text-[#E7ECF5] focus:outline-none focus:border-rose-500"
                    >
                      {salonDetailed.staff.map((st) => (
                        <option key={st.id} value={st.name}>
                          {st.name} ({st.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Internal Salon Notes */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-200 mb-1">
                      یادداشت داخلی سالن:
                    </label>
                    <input
                      type="text"
                      value={editBookingNotes}
                      onChange={(e) => setEditBookingNotes(e.target.value)}
                      placeholder="مثال: ترجیح مشتری استفاده از رنگ بدون آمونیاک"
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-[#18243A] border border-slate-200 dark:border-[#344258] rounded-xl text-slate-900 dark:text-[#E7ECF5] focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-2 border-t border-slate-100 dark:border-[#344258] space-y-2">
                  {selectedBookingForSheet.status !== 'completed' && selectedBookingForSheet.status !== 'cancelled' && (
                    <button
                      type="button"
                      onClick={() => {
                        completeCustomerBookingInSalon(selectedBookingForSheet.id);
                        setSelectedBookingForSheet(null);
                      }}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>تکمیل خدمت و ثبت تسویه حضوری</span>
                    </button>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveBookingChanges}
                      className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>ذخیره تغییرات</span>
                    </button>

                    {selectedBookingForSheet.status !== 'cancelled' && (
                      <button
                        type="button"
                        onClick={() => {
                          cancelCustomerBooking(selectedBookingForSheet.id);
                          setSelectedBookingForSheet(null);
                        }}
                        className="py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/80 text-rose-600 dark:text-rose-400 font-bold text-xs border border-rose-200 dark:border-rose-900 transition-colors cursor-pointer"
                      >
                        لغو نوبت
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: QR CODE SHARING MODAL */}
      <SalonQrModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        salon={salonDetailed}
      />

      {/* MODAL 2: IN-APP SUBSCRIPTION PAYMENT / UPGRADE MODAL */}
      {subModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-white dark:bg-[#111B2E] border border-slate-200 dark:border-[#344258] rounded-3xl shadow-2xl overflow-hidden p-5 space-y-4 text-slate-900 dark:text-[#E7ECF5]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#344258]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">تمدید یا ارتقای اشتراک سالن</h3>
                  <p className="text-[10px] text-slate-500">پرداخت امن از درگاه شاپرک</p>
                </div>
              </div>
              <button
                onClick={() => setSubModalOpen(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Plan Options */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-700 dark:text-[#9AAAC2] block">
                انتخاب پلن اشتراک:
              </label>
              {[
                {
                  id: 'gold_vip',
                  name: 'بسته طلایی VIP (۳ ماهه)',
                  price: 3490000,
                  desc: 'پرسنل نامحدود + پیامک رایگان + نشان تایید',
                },
                {
                  id: 'silver',
                  name: 'بسته نقره‌ای (۱ ماهه)',
                  price: 1790000,
                  desc: 'تا ۸ پرسنل + ۳۰۰ پیامک',
                },
                {
                  id: 'bronze',
                  name: 'بسته برنزی پایه (۱ ماهه)',
                  price: 890000,
                  desc: 'تا ۳ پرسنل',
                },
              ].map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedPlanToBuy(p.id as any)}
                  className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                    selectedPlanToBuy === p.id
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-slate-900 dark:text-[#E7ECF5] font-bold'
                      : 'bg-slate-50 dark:bg-[#18243A] border-slate-200 dark:border-[#344258] text-slate-600 dark:text-[#9AAAC2]'
                  }`}
                >
                  <div>
                    <div>{p.name}</div>
                    <div className="text-[10px] text-slate-400 font-normal mt-0.5">{p.desc}</div>
                  </div>
                  <div className="font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                    {formatCurrency(p.price)}
                  </div>
                </div>
              ))}
            </div>

            {/* Gateway Selection */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-[#344258]">
              <label className="text-[11px] font-bold text-slate-700 dark:text-[#9AAAC2] block">
                انتخاب درگاه پرداخت آنلاین:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'zarinpal', name: 'زرین‌پال' },
                  { id: 'mellat', name: 'بانک ملت' },
                  { id: 'saman', name: 'سامان' },
                ].map((gw) => (
                  <button
                    key={gw.id}
                    type="button"
                    onClick={() => setSelectedGateway(gw.id as any)}
                    className={`py-2 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                      selectedGateway === gw.id
                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 shadow-xs'
                        : 'bg-slate-50 dark:bg-[#18243A] border-slate-200 dark:border-[#344258] text-slate-600 dark:text-[#9AAAC2]'
                    }`}
                  >
                    {gw.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Payment */}
            <button
              type="button"
              disabled={isProcessingPayment}
              onClick={handlePaySubscription}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isProcessingPayment ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CreditCard className="w-4 h-4" />
              )}
              <span>اتصال به درگاه و تمدید اشتراک</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
