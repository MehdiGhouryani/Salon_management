import React, { useState, useMemo } from 'react';
import {
  Lock,
  Copy,
  Check,
  Search,
  MapPin,
  Calendar,
  Clock,
  Star,
  ShieldCheck,
  Scissors,
  Sparkles,
  Phone,
  CreditCard,
  Building,
  User,
  ChevronLeft,
  Smartphone,
  X,
  Menu,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { useTheme } from '../../context/ThemeContext';
import {
  salonDirectoryDetails,
  getSalonBySlug,
  SalonServiceItem,
} from '../../mock/salonDirectoryData';
import { BookingModal } from './BookingModal';
import { BookingReceiptModal } from './BookingReceiptModal';
import { CustomerSiteDrawer } from './CustomerSiteDrawer';
import { CustomerBooking } from '../../types/admin';
import { toPersianDigits, formatCurrency } from '../../utils/formatters';

const categoriesList = [
  { id: 'all', label: 'همه خدمات', icon: Sparkles },
  { id: 'hair', label: 'مو، رنگ و لایت', icon: Scissors },
  { id: 'nail', label: 'ناخن و پدیکور', icon: Sparkles },
  { id: 'skin', label: 'پوست و فیشیال', icon: Sparkles },
  { id: 'makeup', label: 'میکاپ و عروس', icon: Sparkles },
  { id: 'men', label: 'پیرایش آقایان', icon: User },
  { id: 'spa', label: 'ماساژ و اسپا', icon: Sparkles },
];

export const SalonWebsiteView: React.FC = () => {
  const {
    salons,
    currentSalonSlug,
    setCurrentSalonSlug,
    clientSession,
    customerBookings,
    addCustomerBooking,
    setPersona,
    addToast,
  } = useAdmin();

  const { theme } = useTheme();


  // Current active salon data
  const currentSalon = useMemo(() => {
    return getSalonBySlug(currentSalonSlug, salons);
  }, [currentSalonSlug, salons]);

  // Search & Filter state for catalog / services
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Modals state
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>(undefined);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [activeReceiptBooking, setActiveReceiptBooking] = useState<CustomerBooking | null>(null);
  const [sideMenuOpen, setSideMenuOpen] = useState(false);

  // Active bookings count for logged in customer
  const clientBookingsCount = useMemo(() => {
    if (!clientSession.isLoggedIn) {
      return customerBookings.filter((b) => b.salonId === currentSalon.id).length;
    }
    return customerBookings.filter((b) => b.clientPhone === clientSession.phone).length;
  }, [customerBookings, clientSession, currentSalon]);

  // Services filtered for current salon
  const filteredServices = useMemo(() => {
    if (!currentSalon.services) return [];
    return currentSalon.services.filter((s) => {
      const matchCat = activeCategory === 'all' || s.category === activeCategory;
      const matchSearch =
        !searchTerm.trim() ||
        s.name.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
        s.description.toLowerCase().includes(searchTerm.trim().toLowerCase());
      return matchCat && matchSearch;
    });
  }, [currentSalon, activeCategory, searchTerm]);

  // Handle URL Copy
  const handleCopyUrl = () => {
    const url = `https://nobatara.ir/${currentSalon.slug}`;
    navigator.clipboard?.writeText(url);
    setCopiedLink(true);
    addToast({
      type: 'success',
      title: 'لینک اختصاصی سالن کپی شد',
      message: url,
    });
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleBookingSuccess = (booking: CustomerBooking) => {
    addCustomerBooking(booking);
    setBookingModalOpen(false);
    setActiveReceiptBooking(booking);
    setReceiptModalOpen(true);
  };

  const openBookingForService = (srvId?: string) => {
    setSelectedServiceId(srvId);
    setBookingModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F4F4F5] dark:bg-[#0A0F1D] text-slate-900 dark:text-slate-100 font-sans antialiased pb-28 transition-colors duration-200" dir="rtl">
      {/* 1. CLEAN LUXURY TOP NAVBAR WITH SIDE MENU TRIGGER */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          {/* Brand & Salon Title */}
          <div className="flex items-center gap-3">
            <div
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 to-rose-400 text-white flex items-center justify-center font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
              title={currentSalon.name}
            >
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight">
                  {currentSalon.name}
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-200 dark:border-emerald-800/40">
                  رزرو آنلاین
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {currentSalon.city} · {currentSalon.address.split('،')[0]} · تسویه حضوری در محل
              </p>
            </div>
          </div>

          {/* Left Actions: Fast booking CTA + Side Drawer Toggle Button */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => openBookingForService()}
              className="hidden sm:flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              <span>رزرو آنلاین نوبت</span>
            </button>

            {/* Side Drawer Toggle Button (منوی کشویی کاربری: مشخصات، نوبت‌ها، QR و تم) */}
            <button
              onClick={() => setSideMenuOpen(true)}
              className="relative px-3.5 py-2.5 rounded-xl border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-[#151F32] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition-all cursor-pointer flex items-center gap-2 active:scale-95 shadow-xs"
              aria-label="باز کردن منوی کشویی"
            >
              <Menu className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              <span className="text-xs font-bold hidden sm:inline">منوی کاربری و نوبت‌ها</span>
              {clientBookingsCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold font-mono flex items-center justify-center">
                  {toPersianDigits(clientBookingsCount)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* 2. DEDICATED SALON VIEW */}
      <div>
        {/* HERO BANNER */}
        {currentSalon.bannerImage && (
          <div className="relative h-48 sm:h-72 w-full overflow-hidden bg-slate-900 shadow-inner">
            <img
              src={currentSalon.bannerImage}
              alt={currentSalon.name}
              className="w-full h-full object-cover opacity-90 dark:opacity-75 transition-all duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
            <div className="absolute bottom-6 right-4 sm:right-8 flex items-center gap-2">
              <span className="px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-4 h-4 text-rose-400" />
                <span>سالن برگزیده و دارای نشان تایید رسمی</span>
              </span>
            </div>
          </div>
        )}

        {/* A. ELEVATED SOFT PLATINUM SALON PROFILE CARD (تفکیک سطوح پلاتینی روی پس‌زمینه فیلی) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 sm:-mt-14 relative z-10 mb-8">
          <div className="bg-white dark:bg-[#0F172A] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.07)] dark:shadow-none">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3">
                {/* Clean unboxed metadata with separators (Zero-Pill discipline) */}
                <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                    <ShieldCheck className="w-4 h-4" /> دارای مجوز رسمی
                  </span>
                  <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                  <span className="font-mono font-bold text-amber-500 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    {toPersianDigits(currentSalon.rating)} ({toPersianDigits(currentSalon.reviewsCount)} نظر مراجعین)
                  </span>
                  <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {currentSalon.workingHours}
                  </span>
                </div>

                {/* Salon Title & Tagline */}
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  {currentSalon.name}
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                  {currentSalon.tagline}
                </p>

                {/* Location & Address */}
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
                  <MapPin className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>{currentSalon.city} · {currentSalon.address}</span>
                </div>
              </div>

              {/* Direct Booking CTA & In-Person Payment Guarantee */}
              <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
                <button
                  onClick={() => openBookingForService()}
                  className="px-6 py-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Calendar className="w-4 h-4" />
                  <span>رزرو نوبت آنلاین</span>
                </button>

                <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-center text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-1.5 font-medium">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>تسویه حضوری در محل سالن</span>
                </div>
              </div>
            </div>

            {/* Special Salon Features Line */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">امکانات سالن:</span>
              {currentSalon.features.map((feat, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px]"
                >
                  ✓ {feat}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* B. SERVICES CATALOG & FAST BOOKING SECTION */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 space-y-8">
            {/* Category Filter & Search Bar */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    <span>کاتالوگ خدمات و رزرو سریع</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    خدمت مورد نظرتان را انتخاب کنید و تاریخ و ساعت دلخواه را آنلاین رزرو نمایید.
                  </p>
                </div>

                {/* Service Search Input */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="جستجوی خدمت..."
                    className="w-full pl-8 pr-9 py-2 text-xs bg-white dark:bg-[#151821] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-rose-500 transition-colors"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Category Segmented Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none select-none">
                {categoriesList.map((cat) => {
                  const Icon = cat.icon;
                  const isActive = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        isActive
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-white dark:bg-[#151821] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Services Grid with Direct Booking CTA */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredServices.map((service) => (
                <div
                  key={service.id}
                  className="bg-white dark:bg-[#0F172A] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.1)] group"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                        {service.name}
                      </h3>
                      <span className="text-[11px] px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0 font-medium border border-slate-200/60 dark:border-slate-700/60">
                        {service.duration}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                      {service.description}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400">هزینه خدمت:</div>
                      <div className="text-base font-black text-rose-600 dark:text-rose-400 font-mono tabular-nums">
                        {formatCurrency(service.price)}
                      </div>
                    </div>

                    <button
                      onClick={() => openBookingForService(service.id)}
                      className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <span>رزرو این خدمت</span>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* C. SALON SPECIALISTS & STAFF */}
            <section className="space-y-4 pt-6 border-t border-slate-200/90 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <User className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span>آرایشگران و متخصصین سالن</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  پرسنل و کادر فعال در این مجموعه
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {currentSalon.staff.map((member) => (
                  <div
                    key={member.id}
                    className="p-4 bg-white dark:bg-[#0F172A] border border-slate-200/90 dark:border-slate-800 rounded-2xl flex items-center gap-3 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)]"
                  >
                    <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-sm text-slate-700 dark:text-slate-300 shrink-0">
                      {member.name.slice(0, 1)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {member.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {member.role}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-amber-500 font-bold mt-1 font-mono">
                        <Star className="w-3 h-3 fill-current" />
                        <span>{toPersianDigits(member.rating)}</span>
                        <span className="text-slate-400 font-sans mr-1 font-normal">({member.specialty})</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </main>
        </div>

      {/* 3. MODALS */}
      <BookingModal
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        salon={currentSalon}
        initialServiceId={selectedServiceId}
        onBookingSuccess={handleBookingSuccess}
      />

      <BookingReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        booking={activeReceiptBooking}
      />

      <CustomerSiteDrawer
        isOpen={sideMenuOpen}
        onClose={() => setSideMenuOpen(false)}
        currentSalon={currentSalon}
        onOpenReceipt={(booking) => {
          setActiveReceiptBooking(booking);
          setReceiptModalOpen(true);
        }}
      />
    </div>
  );
};
