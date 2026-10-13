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
import { MyBookingsDrawer } from './MyBookingsDrawer';
import { CustomerBooking } from '../../types/admin';
import { toPersianDigits, formatCurrency } from '../../utils/formatters';
import { ThemeToggle } from '../common/ThemeToggle';

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

  // URL mode: either a specific salon slug (e.g. 'gisara') or 'all' (the platform homepage directory)
  const isPlatformHome = currentSalonSlug === '' || currentSalonSlug === 'home';

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
  const [myBookingsOpen, setMyBookingsOpen] = useState(false);

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
      title: 'لینک سالن کپی شد',
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
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#0E1015] text-[#18181B] dark:text-[#F4F4F6] font-sans antialiased pb-28 transition-colors duration-200" dir="rtl">
      {/* 1. TOP SIMULATED BROWSER ADDRESS BAR & QUICK CONTROLS */}
      <div className="sticky top-0 z-40 bg-white/90 dark:bg-[#14161F]/90 backdrop-blur-md border-b border-stone-200 dark:border-zinc-800 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          {/* Simulated Browser Address Input */}
          <div className="flex-1 flex items-center gap-2 max-w-xl bg-stone-100 dark:bg-[#0B0D12] border border-stone-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-700 dark:text-zinc-300">
            <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-zinc-400 dark:text-zinc-500 font-mono select-none">https://nobatara.ir/</span>
            
            {/* Salon Slug Selector */}
            <select
              value={isPlatformHome ? 'home' : currentSalon.slug}
              onChange={(e) => {
                if (e.target.value === 'home') {
                  setCurrentSalonSlug('home');
                } else {
                  setCurrentSalonSlug(e.target.value);
                }
              }}
              className="bg-transparent font-mono font-bold text-rose-600 dark:text-rose-400 focus:outline-none cursor-pointer border-none py-0 pr-1 pl-4"
            >
              <option value="gisara" className="bg-white dark:bg-[#181B24] text-zinc-900 dark:text-zinc-100">
                gisara (سالن زیبایی و عروس گیس‌آرا - زعفرانیه)
              </option>
              <option value="kazhal" className="bg-white dark:bg-[#181B24] text-zinc-900 dark:text-zinc-100">
                kazhal (کلینیک پوست و مو کژال - اصفهان)
              </option>
              <option value="barberclub" className="bg-white dark:bg-[#181B24] text-zinc-900 dark:text-zinc-100">
                barberclub (آرایشگاه آقایان باربرکلاب - سعادت‌آباد)
              </option>
              <option value="rosegold" className="bg-white dark:bg-[#181B24] text-zinc-900 dark:text-zinc-100">
                rosegold (سالن ناخن و اسپا رزگلد - مشهد)
              </option>
              <option value="aramis" className="bg-white dark:bg-[#181B24] text-zinc-900 dark:text-zinc-100">
                aramis (مرکز زیبایی و لیزر آرامیس - تبریز)
              </option>
              <option value="home" className="bg-white dark:bg-[#181B24] text-zinc-900 dark:text-zinc-100">
                صفحه اصلی پلتفرم (فهرست سالن‌ها)
              </option>
            </select>
          </div>

          {/* Quick Actions in Browser Header: Clear, Prominent Theme Switcher */}
          <div className="flex items-center gap-2">
            {!isPlatformHome && (
              <button
                onClick={handleCopyUrl}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-stone-100 dark:bg-zinc-800 hover:bg-stone-200/80 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-stone-200 dark:border-zinc-700 transition-colors cursor-pointer"
                title="کپی آدرس سالن"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">کپی آدرس</span>
              </button>
            )}

            {/* My Bookings Button */}
            <button
              onClick={() => setMyBookingsOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-100/80 transition-colors cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>نوبت‌های من</span>
              {clientBookingsCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center font-mono font-bold">
                  {toPersianDigits(clientBookingsCount)}
                </span>
              )}
            </button>

            {/* Prominent Theme Toggle in Header: Segmented on desktop, Icon on mobile */}
            <div className="hidden sm:block">
              <ThemeToggle variant="segmented" />
            </div>
            <div className="sm:hidden">
              <ThemeToggle variant="icon" />
            </div>

            {/* Switch to Android App View for this Salon */}
            <button
              onClick={() => setPersona('salon_app')}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-stone-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-stone-200 dark:border-zinc-700 hover:bg-stone-200/70 transition-colors cursor-pointer"
              title="مشاهده اپلیکیشن مدیر سالن"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>اپلیکیشن مدیر</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. DEDICATED SALON VIEW */}
      {!isPlatformHome ? (
        <div>
          {/* A. LUXURY SALON HERO BANNER */}
          <section className="relative overflow-hidden bg-white dark:bg-[#12141C] border-b border-stone-200 dark:border-zinc-800">
            <div className="absolute inset-0">
              <img
                src={currentSalon.bannerImage}
                alt={currentSalon.name}
                className="w-full h-full object-cover opacity-20 filter blur-xs"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#F8F9FA] dark:from-[#0E1015] via-[#F8F9FA]/85 dark:via-[#0E1015]/85 to-transparent" />
            </div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-3">
                  {/* Clean unboxed metadata with separators (Zero-Pill discipline) */}
                  <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                      <ShieldCheck className="w-3.5 h-3.5" /> سالن تایید شده
                    </span>
                    <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-700">·</span>
                    <span className="font-mono font-bold text-amber-500 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      {toPersianDigits(currentSalon.rating)} ({toPersianDigits(currentSalon.reviewsCount)} نظر)
                    </span>
                    <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-700">·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" />
                      {currentSalon.workingHours}
                    </span>
                  </div>

                  {/* Salon Title & Tagline */}
                  <h1 className="text-2xl sm:text-4xl font-black text-zinc-900 dark:text-white tracking-tight">
                    {currentSalon.name}
                  </h1>
                  <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-300 max-w-2xl leading-relaxed">
                    {currentSalon.tagline}
                  </p>

                  {/* Location & Address */}
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                    <MapPin className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span>{currentSalon.city} - {currentSalon.address}</span>
                  </div>
                </div>

                {/* Primary Booking Call-To-Action */}
                <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0">
                  <button
                    onClick={() => openBookingForService()}
                    className="px-8 py-3.5 rounded-2xl bg-gradient-to-l from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white font-bold text-sm shadow-lg shadow-rose-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>رزرو نوبت آنلاین</span>
                  </button>

                  <div className="px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-center text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>تسویه حضوری در محل سالن</span>
                  </div>
                </div>
              </div>

              {/* Special Salon Features Tag Row */}
              <div className="mt-6 pt-4 border-t border-stone-200/90 dark:border-zinc-800 flex flex-wrap items-center gap-2">
                {currentSalon.features.map((feat, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-3 py-1 rounded-xl bg-stone-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-stone-200 dark:border-zinc-700"
                  >
                    ✓ {feat}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* B. SERVICES CATALOG & FAST BOOKING SECTION */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
            {/* Category Filter & Search Bar */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Scissors className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                    <span>خدمات سالن</span>
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    خدمت مورد نظرتان را انتخاب کنید و تاریخ و ساعت دلخواه را آنلاین رزرو نمایید.
                  </p>
                </div>

                {/* Service Search Input */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-zinc-400 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="جستجوی خدمت..."
                    className="w-full pl-3 pr-9 py-2 text-xs bg-white dark:bg-[#181B24] border border-stone-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Category Segmented Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {categoriesList.map((cat) => {
                  const Icon = cat.icon;
                  const isActive = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        isActive
                          ? 'bg-rose-600 text-white shadow-sm shadow-rose-500/20'
                          : 'bg-white dark:bg-[#181B24] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 border border-stone-200 dark:border-zinc-800'
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
                  className="bg-white dark:bg-[#181B24] border border-stone-200/90 dark:border-zinc-800 rounded-2xl p-5 hover:border-rose-400 dark:hover:border-rose-600 transition-all flex flex-col justify-between shadow-xs hover:shadow-sm group"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                        {service.name}
                      </h3>
                      <span className="text-[11px] px-2 py-0.5 rounded-lg bg-stone-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-stone-200 dark:border-zinc-700 shrink-0">
                        {service.duration}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-3">
                      {service.description}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-stone-100 dark:border-zinc-800/80 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-zinc-400 dark:text-zinc-500">هزینه:</div>
                      <div className="text-base font-extrabold text-rose-600 dark:text-rose-400 font-mono tabular-nums">
                        {formatCurrency(service.price)}
                      </div>
                    </div>

                    <button
                      onClick={() => openBookingForService(service.id)}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>رزرو این خدمت</span>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* C. SALON SPECIALISTS & STAFF */}
            <section className="space-y-4 pt-6 border-t border-stone-200/90 dark:border-zinc-800">
              <div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <User className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                  <span>آرایشگران و متخصصین سالن</span>
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  تیم مجرب و متخصص سالن
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {currentSalon.staff.map((st) => (
                  <div
                    key={st.id}
                    className="p-4 bg-white dark:bg-[#181B24] border border-stone-200/90 dark:border-zinc-800 rounded-2xl flex items-center gap-3.5 shadow-xs"
                  >
                    <img
                      src={st.avatar}
                      alt={st.name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-rose-500/30"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{st.name}</span>
                        <span className="text-xs text-amber-500 font-mono font-bold flex items-center gap-0.5">
                          ★ {toPersianDigits(st.rating)}
                        </span>
                      </div>
                      <div className="text-xs text-rose-600 dark:text-rose-400 font-medium mt-0.5">{st.role}</div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">{st.specialty}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* D. PHOTO GALLERY & REVIEWS */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6 border-t border-stone-200/90 dark:border-zinc-800">
              {/* Gallery */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span>محیط و امکانات سالن</span>
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {currentSalon.galleryImages.map((imgUrl, i) => (
                    <img
                      key={i}
                      src={imgUrl}
                      alt={`${currentSalon.name} ${i + 1}`}
                      className="w-full h-36 object-cover rounded-xl border border-stone-200 dark:border-zinc-800 hover:opacity-90 transition-opacity"
                    />
                  ))}
                </div>
              </div>

              {/* Verified Customer Reviews */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>نظرات مراجعین تایید شده</span>
                </h3>
                <div className="space-y-2.5">
                  {currentSalon.reviews.map((rev, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-white dark:bg-[#181B24] border border-stone-200/90 dark:border-zinc-800 rounded-xl space-y-1.5 shadow-xs"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-zinc-800 dark:text-zinc-200">{rev.author}</span>
                        <span className="font-mono text-amber-500 font-bold">★ {toPersianDigits(rev.rating)}</span>
                      </div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        {rev.comment}
                      </p>
                      <div className="text-[10px] text-zinc-400 dark:text-zinc-500">{rev.date}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </main>
        </div>
      ) : (
        /* PLATFORM HOME DIRECTORY */
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white">
              سامانه نوبت‌دهی آنلاین سالن‌های زیبایی
            </h1>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              هر سالن دارای یک وب‌سایت اختصاصی نوبت‌دهی مستقل است. سالن مدنظر خود را انتخاب کنید و نوبت خود را سریع رزرو نمایید.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.values(salonDirectoryDetails).map((sl) => (
              <div
                key={sl.slug}
                onClick={() => setCurrentSalonSlug(sl.slug)}
                className="bg-white dark:bg-[#181B24] border border-stone-200/90 dark:border-zinc-800 rounded-2xl overflow-hidden hover:border-rose-500 cursor-pointer transition-all shadow-xs hover:shadow-md group"
              >
                <div className="h-44 relative">
                  <img
                    src={sl.bannerImage}
                    alt={sl.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-3 right-3 left-3 text-white">
                    <h3 className="font-bold text-base">{sl.name}</h3>
                    <p className="text-xs text-zinc-200 mt-0.5">{sl.city} · {sl.address}</p>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">
                    {sl.tagline}
                  </p>
                  <div className="pt-2 border-t border-stone-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                    <span className="font-mono text-zinc-400">nobatara.ir/{sl.slug}</span>
                    <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                      ورود به وب‌سایت سالن
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      )}

      {/* Modals & Overlays */}
      <BookingModal
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        salon={currentSalon}
        onBookingSuccess={handleBookingSuccess}
        initialServiceId={selectedServiceId}
      />

      {activeReceiptBooking && (
        <BookingReceiptModal
          isOpen={receiptModalOpen}
          onClose={() => setReceiptModalOpen(false)}
          booking={activeReceiptBooking}
        />
      )}

      <MyBookingsDrawer
        isOpen={myBookingsOpen}
        onClose={() => setMyBookingsOpen(false)}
        salon={currentSalon}
      />
    </div>
  );
};
