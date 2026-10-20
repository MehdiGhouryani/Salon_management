import React, { useState, useMemo } from 'react';
import {
  Search,
  MapPin,
  Calendar,
  Clock,
  Star,
  ShieldCheck,
  CheckCircle2,
  Scissors,
  Sparkles,
  Phone,
  CreditCard,
  Building,
  User,
  ArrowRight,
  Filter,
  Layers,
  ChevronLeft,
  X,
  ExternalLink,
  Info,
  Check,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import {
  salonDirectoryDetails,
  getSalonDetail,
  DetailedSalonData,
  SalonServiceItem,
} from '../../mock/salonDirectoryData';
import { BookingModal } from './BookingModal';
import { BookingReceiptModal } from './BookingReceiptModal';
import { MyBookingsDrawer } from './MyBookingsDrawer';
import { CustomerBooking } from '../../types/admin';
import { toPersianDigits, formatCurrency } from '../../utils/formatters';

const categoriesList = [
  { id: 'all', label: 'همه خدمات', icon: Sparkles },
  { id: 'hair', label: 'مو و رنگ و لایت', icon: Scissors },
  { id: 'nail', label: 'ناخن و پدیکور', icon: Sparkles },
  { id: 'skin', label: 'پوست و فیشیال', icon: Sparkles },
  { id: 'makeup', label: 'میکاپ و عروس', icon: Sparkles },
  { id: 'men', label: 'پیرایش آقایان', icon: User },
  { id: 'spa', label: 'ماساژ و اسپا', icon: Sparkles },
];

const citiesList = [
  'همه شهرها',
  'تهران',
  'اصفهان',
  'مشهد',
  'شیراز',
  'تبریز',
  'کرج',
];

export const CustomerPortal: React.FC = () => {
  const {
    isDemoMode,
    salons,
    setViewMode,
    clientSession,
    customerBookings,
    addCustomerBooking,
  } = useAdmin();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('همه شهرها');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Modals state
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [activeSalonForBooking, setActiveSalonForBooking] = useState<DetailedSalonData | null>(null);
  const [activeServiceId, setActiveServiceId] = useState<string | undefined>(undefined);

  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [activeReceiptBooking, setActiveReceiptBooking] = useState<CustomerBooking | null>(null);

  const [myBookingsOpen, setMyBookingsOpen] = useState(false);
  const [selectedSalonDetailModal, setSelectedSalonDetailModal] = useState<DetailedSalonData | null>(null);

  // Active confirmed bookings count strictly for verified current client session (Privacy Protection)
  const activeBookingsCount =
    clientSession.isLoggedIn && clientSession.phone
      ? customerBookings.filter(
          (b) => b.clientPhone === clientSession.phone && b.status === 'confirmed'
        ).length
      : 0;

  // Filter salons
  const filteredSalons = useMemo(() => {
    return salons
      .filter((s) => s.status === 'active') // Only approved active salons for customers
      .filter((s) => {
        // City filter
        if (selectedCity !== 'همه شهرها') {
          if (!s.city.includes(selectedCity) && !s.province.includes(selectedCity)) {
            return false;
          }
        }
        // Search term filter
        if (searchTerm.trim()) {
          const q = searchTerm.trim().toLowerCase();
          const matchName = s.name.toLowerCase().includes(q);
          const matchCategory = s.category.toLowerCase().includes(q);
          const matchCity = s.city.toLowerCase().includes(q);
          const detail = salonDirectoryDetails[s.id];
          const matchServices = detail?.services.some((srv) => srv.name.toLowerCase().includes(q));
          if (!matchName && !matchCategory && !matchCity && !matchServices) {
            return false;
          }
        }
        // Category filter
        if (selectedCategory !== 'all') {
          const detail = salonDirectoryDetails[s.id];
          if (detail) {
            const hasCat = detail.services.some((srv) => srv.category === selectedCategory);
            if (!hasCat) return false;
          }
        }
        return true;
      });
  }, [salons, selectedCity, searchTerm, selectedCategory]);

  const handleOpenBooking = (salonData: DetailedSalonData, serviceId?: string) => {
    setActiveSalonForBooking(salonData);
    setActiveServiceId(serviceId);
    setBookingModalOpen(true);
  };

  const handleBookingSuccess = (newBooking: CustomerBooking) => {
    addCustomerBooking(newBooking);
    setBookingModalOpen(false);
    setActiveReceiptBooking(newBooking);
    setReceiptModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-rose-500 selection:text-white" dir="rtl">
      {/* 1. TOP ANNOUNCEMENT & ADMIN MODE SWITCHER BANNER */}
      <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-indigo-950 border-b border-rose-900/40 text-xs px-4 py-2 flex items-center justify-between gap-3 text-slate-300">
        <div className="flex items-center gap-2 truncate">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
          <span className="font-semibold text-rose-300">سایت رسمی مشتریان سالن‌ها:</span>
          <span className="truncate hidden sm:inline">
            کلیه نوبت‌ها با پرداخت ۱۰۰٪ در محل سالن ثبت می‌شوند (بدون نیاز به کارت به کارت یا درگاه اینترنتی)
          </span>
        </div>

        {/* DEMO-ONLY SWITCH TO ADMIN PANEL BUTTON */}
        {isDemoMode ? (
          <button
            onClick={() => setViewMode('admin')}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-rose-300 hover:text-white border border-rose-500/30 rounded-lg transition-all shrink-0 cursor-pointer shadow-sm group"
            title="مشاهده پیش‌نمایش پنل ادمین (حالت آزمایشی)"
          >
            <Building className="w-3.5 h-3.5 text-rose-400 group-hover:rotate-12 transition-transform" />
            <span>پیش‌نمایش ادمین (حالت آزمایشی دمو)</span>
            <ChevronLeft className="w-3 h-3 text-rose-400" />
          </button>
        ) : (
          <span className="text-[11px] text-slate-400">
            ورود ادمین: منحصراً از درگاه امن
          </span>
        )}
      </div>

      {/* 2. MAIN CLIENT HEADER */}
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-rose-600/30">
              <Scissors className="w-5 h-5 rotate-45" />
            </div>
            <div>
              <div className="text-base font-extrabold text-white tracking-tight flex items-center gap-1.5">
                <span>بیوتی‌پلاس</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  سامانه مشتریان
                </span>
              </div>
              <p className="text-[11px] text-slate-400">رزرو آنلاین و پرداخت در محل سالن‌های زیبایی</p>
            </div>
          </div>

          {/* City Selector */}
          <div className="hidden md:flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300">
            <MapPin className="w-3.5 h-3.5 text-rose-400" />
            <span>شهر:</span>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer pr-1"
            >
              {citiesList.map((city) => (
                <option key={city} value={city} className="bg-slate-900 text-white">
                  {city}
                </option>
              ))}
            </select>
          </div>

          {/* Client Navigation Actions */}
          <div className="flex items-center gap-2.5">
            {/* My Bookings Button */}
            <button
              onClick={() => setMyBookingsOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition-all cursor-pointer relative shadow-sm"
            >
              <Calendar className="w-4 h-4 text-rose-400" />
              <span>نوبت‌های من</span>
              {activeBookingsCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-mono flex items-center justify-center font-bold">
                  {toPersianDigits(activeBookingsCount)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* 3. HERO SECTION */}
      <section className="relative overflow-hidden pt-8 pb-12 sm:pt-12 sm:pb-16 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border-b border-slate-800/60">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-rose-900/15 via-transparent to-transparent pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-rose-400" />
            <span>ساده‌ترین و امن‌ترین راه رزرو خدمات زیبایی در کشور</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight sm:leading-snug">
            رزرو آنلاین نوبت در برترین سالن‌ها
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-pink-400 to-amber-300">
              با پرداخت ۱۰۰٪ در محل سالن (نقد و کارتخوان)
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-xs sm:text-sm text-slate-300 leading-relaxed">
            بدون نیاز به ورود اطلاعات بانکی یا درگاه پرداخت اینترنتی؛ سالن و متخصص مورد نظرتان را انتخاب کنید، نوبت خود را ثبت کرده و هزینه را پس از دریافت خدمت در سالن تسویه کنید.
          </p>

          {/* Unified Search Box */}
          <div className="max-w-2xl mx-auto mt-6 bg-slate-900/90 p-2 rounded-2xl border border-slate-700/80 shadow-2xl flex flex-col sm:flex-row items-center gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 w-full">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="جستجوی نام سالن، خدمت (مثلاً بالیاژ، کاشت ناخن، فیشیال)..."
                className="w-full py-2 text-xs bg-transparent text-white placeholder-slate-400 focus:outline-none"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="md:hidden py-2 px-3 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
              >
                {citiesList.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-all shadow-md shadow-rose-600/30 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <span>یافتن سالن</span>
              </button>
            </div>
          </div>

          {/* 4 Guarantees Badges */}
          <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl mx-auto text-right">
            <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-xl flex items-center gap-2.5 text-xs">
              <CreditCard className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold text-white block">پرداخت حضوری</span>
                <span className="text-[10px] text-slate-400">کارتخوان یا نقد در سالن</span>
              </div>
            </div>

            <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-xl flex items-center gap-2.5 text-xs">
              <Clock className="w-4 h-4 text-blue-400 shrink-0" />
              <div>
                <span className="font-bold text-white block">رزرو فوری نوبت</span>
                <span className="text-[10px] text-slate-400">بدون معطلی و در لحظه</span>
              </div>
            </div>

            <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-xl flex items-center gap-2.5 text-xs">
              <ShieldCheck className="w-4 h-4 text-rose-400 shrink-0" />
              <div>
                <span className="font-bold text-white block">سالن‌های تاییدشده</span>
                <span className="text-[10px] text-slate-400">دارای جواز رسمی کسب</span>
              </div>
            </div>

            <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-xl flex items-center gap-2.5 text-xs">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold text-white block">پیامک تایید فوری</span>
                <span className="text-[10px] text-slate-400">ارسال کد رهگیری نوبت</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CATEGORIES FILTER BAR */}
      <section className="border-b border-slate-800/80 bg-slate-950 py-4 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categoriesList.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800/90 border border-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 5. SALONS CATALOGUE & DIRECTORY */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>سالن‌های برگزیده و آماده رزرو</span>
              <span className="text-xs font-normal text-slate-400">
                ({toPersianDigits(filteredSalons.length)} سالن فعال)
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              تمامی قیمت‌ها مصوب سالن بوده و پرداخت به طور کامل در زمان حضور انجام می‌شود.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>مرتب‌سازی:</span>
            <span className="font-semibold text-rose-400">بیشترین امتیاز و رضایت مشتریان</span>
          </div>
        </div>

        {/* SALON CARDS GRID */}
        {filteredSalons.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-3 bg-slate-900/40 rounded-2xl border border-slate-800">
            <Building className="w-12 h-12 mx-auto text-slate-600 stroke-1" />
            <h3 className="text-sm font-bold text-white">سالنی با فیلترهای انتخابی یافت نشد</h3>
            <p className="text-xs text-slate-500">
              لطفاً شهر یا عبارت جستجو را تغییر دهید یا فیلتر دسته‌بندی را روی «همه خدمات» بگذارید.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCity('همه شهرها');
                setSelectedCategory('all');
              }}
              className="px-4 py-2 text-xs font-bold text-rose-400 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            >
              پاک کردن همه فیلترها
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSalons.map((salon) => {
              const detail = getSalonDetail(salon.id, salon);

              return (
                <div
                  key={salon.id}
                  className="bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-rose-950/20 flex flex-col group"
                >
                  {/* Card Image Banner */}
                  <div className="relative h-48 w-full overflow-hidden bg-slate-950">
                    <img
                      src={detail.bannerImage}
                      alt={salon.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />

                    {/* Verified Badge */}
                    {salon.verifiedBadge && (
                      <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md border border-emerald-500/40 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        <span>تایید هویت و صلاحیت</span>
                      </div>
                    )}

                    {/* In-Person Payment Tag */}
                    <div className="absolute top-3 left-3 bg-emerald-950/80 backdrop-blur-md border border-emerald-500/40 text-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <CreditCard className="w-3 h-3" />
                      <span>پرداخت در سالن</span>
                    </div>

                    {/* Rating and Reviews */}
                    <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-xl border border-slate-800 text-xs">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span className="font-bold text-white">{detail.rating}</span>
                      <span className="text-[10px] text-slate-400">({toPersianDigits(detail.reviewsCount)} نظر)</span>
                    </div>

                    <div className="absolute bottom-3 left-3 text-[11px] text-slate-300 flex items-center gap-1 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-xl border border-slate-800">
                      <MapPin className="w-3 h-3 text-rose-400" />
                      <span>{salon.city}</span>
                    </div>
                  </div>

                  {/* Card Content Body */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-rose-300 transition-colors">
                        {salon.name}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{detail.tagline}</p>

                      <div className="mt-3 flex items-center gap-1.5 text-slate-400 text-[11px]">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span className="truncate">
                          {typeof detail.workingHours === 'string'
                            ? detail.workingHours
                            : 'همه روزه ۹:۳۰ الی ۲۰:۰۰'}
                        </span>
                      </div>
                    </div>

                    {/* Top Services Samples with In-Person Prices */}
                    <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 space-y-2">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                        <span>خدمات منتخب و قیمت:</span>
                        <span className="text-emerald-400">تسویه با کارتخوان</span>
                      </div>
                      <div className="space-y-1.5">
                        {detail.services.slice(0, 2).map((srv) => (
                          <div
                            key={srv.id}
                            className="flex items-center justify-between text-xs cursor-pointer hover:bg-slate-900 p-1 rounded transition-colors"
                            onClick={() => handleOpenBooking(detail, srv.id)}
                          >
                            <span className="text-slate-300 truncate max-w-[170px] text-[11px]">{srv.name}</span>
                            <span className="font-extrabold text-emerald-400 text-xs shrink-0">
                              {formatCurrency(srv.price)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        onClick={() => setSelectedSalonDetailModal(detail)}
                        className="flex-1 py-2 px-3 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer text-center"
                      >
                        مشاهده کامل سالن
                      </button>

                      <button
                        onClick={() => handleOpenBooking(detail)}
                        className="flex-1 py-2 px-3 text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 rounded-xl transition-all shadow-md shadow-rose-600/20 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>رزرو نوبت</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 6. SALON DETAILED PREVIEW MODAL */}
      {selectedSalonDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
            {/* Header image banner */}
            <div className="relative h-44 sm:h-56 w-full">
              <img
                src={selectedSalonDetailModal.bannerImage}
                alt={selectedSalonDetailModal.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
              <button
                onClick={() => setSelectedSalonDetailModal(null)}
                className="absolute top-4 left-4 p-2 bg-slate-950/80 text-white rounded-xl hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="absolute bottom-4 right-4 left-4">
                <h2 className="text-xl sm:text-2xl font-bold text-white">{selectedSalonDetailModal.name}</h2>
                <p className="text-xs text-slate-300 mt-1">{selectedSalonDetailModal.tagline}</p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              {/* Payment in person notice */}
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-xs text-emerald-300">
                <CreditCard className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>روش تسویه حساب این سالن:</strong> ۱۰۰٪ پرداخت در محل سالن با دستگاه کارتخوان یا نقد (بدون درگاه اینترنتی).
                </span>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2 text-slate-300">
                  <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>آدرس: {selectedSalonDetailModal.address}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Clock className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>
                    ساعات کاری:{' '}
                    {typeof selectedSalonDetailModal.workingHours === 'string'
                      ? selectedSalonDetailModal.workingHours
                      : 'همه روزه ۹:۳۰ الی ۲۰:۰۰'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>تلفن تماس: {toPersianDigits(selectedSalonDetailModal.phone)}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Star className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>امتیاز: {selectedSalonDetailModal.rating} از ۵ ستاره ({toPersianDigits(selectedSalonDetailModal.reviewsCount)} نظر)</span>
                </div>
              </div>

              {/* Services List with instant booking buttons */}
              <div>
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-rose-400" />
                  <span>لیست کلیه خدمات و تعرفه‌ها</span>
                </h3>
                <div className="space-y-2">
                  {selectedSalonDetailModal.services.map((srv) => (
                    <div
                      key={srv.id}
                      className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{srv.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                            {srv.duration}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">{srv.description}</p>
                      </div>

                      <div className="text-left shrink-0 space-y-1">
                        <div className="text-xs font-extrabold text-emerald-400">
                          {formatCurrency(srv.price)}
                        </div>
                        <button
                          onClick={() => {
                            setSelectedSalonDetailModal(null);
                            handleOpenBooking(selectedSalonDetailModal, srv.id);
                          }}
                          className="px-3 py-1 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors cursor-pointer"
                        >
                          رزرو نوبت
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Staff Team */}
              <div>
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-purple-400" />
                  <span>تیم متخصصین و بیوتی آرتیست‌ها</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {selectedSalonDetailModal.staff.map((st) => (
                    <div key={st.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-3">
                      <img src={st.avatar} alt={st.name} className="w-10 h-10 rounded-full object-cover border border-slate-700" />
                      <div>
                        <div className="text-xs font-bold text-white">{st.name}</div>
                        <div className="text-[10px] text-rose-400">{st.role}</div>
                        <div className="text-[10px] text-slate-400">{st.specialty}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              <a
                href={`tel:${selectedSalonDetailModal.phone}`}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 rounded-xl border border-slate-700 hover:bg-slate-700"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                تماس تلفنی با سالن
              </a>

              <button
                onClick={() => {
                  const s = selectedSalonDetailModal;
                  setSelectedSalonDetailModal(null);
                  handleOpenBooking(s);
                }}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-all shadow-md shadow-rose-600/30 cursor-pointer"
              >
                رزرو نوبت در این سالن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. BOOKING FLOW MODAL */}
      {activeSalonForBooking && (
        <BookingModal
          isOpen={bookingModalOpen}
          onClose={() => setBookingModalOpen(false)}
          salon={activeSalonForBooking}
          onBookingSuccess={handleBookingSuccess}
          initialServiceId={activeServiceId}
        />
      )}

      {/* 8. BOOKING RECEIPT & SMS PREVIEW MODAL */}
      <BookingReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        booking={activeReceiptBooking}
        salonPhone={activeSalonForBooking?.phone}
        salonAddress={activeSalonForBooking?.address}
      />

      {/* 9. MY BOOKINGS DRAWER */}
      <MyBookingsDrawer
        isOpen={myBookingsOpen}
        onClose={() => setMyBookingsOpen(false)}
        onOpenReceipt={(b) => {
          setActiveReceiptBooking(b);
          setReceiptModalOpen(true);
        }}
      />

      {/* 10. PUBLIC FOOTER */}
      <footer className="mt-16 bg-slate-950 border-t border-slate-800/80 py-8 px-4 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-rose-500" />
            <span className="font-bold text-white">سامانه بیوتی‌پلاس</span>
            <span>- پلتفرم سراسری نوبت‌دهی سالن‌های زیبایی</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>شرایط پرداخت: تسویه حضوری در محل سالن</span>
            {isDemoMode && (
              <>
                <span>•</span>
                <button
                  onClick={() => setViewMode('admin')}
                  className="text-rose-400 hover:text-rose-300 font-bold cursor-pointer underline underline-offset-4"
                >
                  پیش‌نمایش پنل مدیریت ادمین کل (دمو)
                </button>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};
