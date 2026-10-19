import React, { useState, useEffect } from 'react';
import {
  Scissors,
  User,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Phone,
  ShieldCheck,
  Check,
  RotateCcw,
} from 'lucide-react';
import { DetailedSalonData, SalonServiceItem, SalonStaffItem } from '../../mock/salonDirectoryData';
import { CustomerBooking } from '../../types/admin';
import { useAdmin } from '../../context/AdminContext';
import { toPersianDigits, formatCurrency } from '../../utils/formatters';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  salon: DetailedSalonData;
  onBookingSuccess: (booking: CustomerBooking) => void;
  initialServiceId?: string;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  salon,
  onBookingSuccess,
  initialServiceId,
}) => {
  const { isDemoMode, clientSession, setClientSession, addToast } = useAdmin();

  if (!isOpen) return null;

  // 3-step streamlined workflow
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Service and Staff
  const [selectedService, setSelectedService] = useState<SalonServiceItem>(() => {
    return salon.services.find((s) => s.id === initialServiceId) || salon.services[0];
  });
  const [selectedStaff, setSelectedStaff] = useState<SalonStaffItem | 'any'>('any');

  // Step 2: Date & Time
  const availableDates = [
    { label: 'امروز (فوری)', value: 'امروز ۲۳ آبان', active: true },
    { label: 'فردا', value: 'فردا ۲۴ آبان', active: true },
    { label: 'شنبه', value: 'شنبه ۲۵ آبان', active: true },
    { label: 'یکشنبه', value: 'یکشنبه ۲۶ آبان', active: true },
    { label: 'دوشنبه', value: 'دوشنبه ۲۷ آبان', active: true },
  ];
  const [selectedDate, setSelectedDate] = useState<string>(availableDates[1].value);

  const timeSlots = [
    '۱۰:۰۰',
    '۱۱:۱۵',
    '۱۲:۳۰',
    '۱۴:۰۰',
    '۱۵:۳۰',
    '۱۷:۰۰',
    '۱۸:۱۵',
    '۱۹:۳۰',
  ];
  const [selectedTime, setSelectedTime] = useState<string>(timeSlots[2]);

  // Step 3: Customer Info & OTP verification
  const [clientName, setClientName] = useState(clientSession.name || '');
  const [clientPhone, setClientPhone] = useState(clientSession.phone || '');
  const [otpStage, setOtpStage] = useState<'input_phone' | 'input_code' | 'verified'>(
    clientSession.isLoggedIn ? 'verified' : 'input_phone'
  );
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpTimer, setOtpTimer] = useState(60);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Sync client session if logged in
  useEffect(() => {
    if (clientSession.isLoggedIn) {
      setClientName(clientSession.name);
      setClientPhone(clientSession.phone);
      setOtpStage('verified');
    }
  }, [clientSession]);

  // Keep initialServiceId updated if provided
  useEffect(() => {
    if (initialServiceId) {
      const found = salon.services.find((s) => s.id === initialServiceId);
      if (found) setSelectedService(found);
    }
  }, [initialServiceId, salon]);

  // Timer countdown for OTP
  useEffect(() => {
    let interval: any;
    if (otpStage === 'input_code' && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpStage, otpTimer]);

  const staffNameLabel =
    selectedStaff === 'any'
      ? (salon.staff[0]?.name || 'نزدیک‌ترین متخصص خالی')
      : selectedStaff.name;

  const handleNextStep = () => {
    setErrorMsg('');
    if (step === 1) {
      if (!selectedService) {
        setErrorMsg('لطفاً یک خدمت را انتخاب کنید');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!selectedDate || !selectedTime) {
        setErrorMsg('لطفاً روز و ساعت نوبت را مشخص کنید');
        return;
      }
      setStep(3);
    }
  };

  const handlePrevStep = () => {
    setErrorMsg('');
    setStep((prev) => (Math.max(prev - 1, 1) as 1 | 2 | 3));
  };

  // Send OTP
  const handleSendOtp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!clientName.trim() || clientName.trim().length < 2) {
      setErrorMsg('لطفاً نام خود را وارد کنید');
      return;
    }
    const cleanPhone = clientPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10 || !clientPhone.startsWith('09')) {
      setErrorMsg('شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد');
      return;
    }

    if (!isDemoMode) {
      setErrorMsg('سرویس ارسال پیامک در نسخه عملیاتی هنوز متصل نشده است (در انتظار فاز ۱۰). امکان ارسال واقعی پیامک در این مرحله وجود ندارد.');
      return;
    }

    // In demo mode: Clearly labeled local simulation
    const randomCode = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(randomCode);
    setOtpTimer(60);
    setOtpStage('input_code');
    setErrorMsg('');

    addToast({
      type: 'info',
      title: '[شبیه‌ساز پیش‌نمایش دمو] تولید کد آزمایشی',
      message: `توجه: هیچ پیامکی به مخابرات ارسال نشد. کد شبیه‌سازی برای تست: ${randomCode}`,
    });
  };

  // Verify OTP
  const handleVerifyOtp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isDemoMode) {
      setErrorMsg('احراز هویت سرور در این فاز پیکربندی نشده است.');
      return;
    }

    // Strict check against simulated code only; no hardcoded bypass 1234
    if (!generatedOtp || otpCode.trim() !== generatedOtp) {
      setErrorMsg('کد وارد شده صحیح نمی‌باشد. لطفاً کد ۴ رقمی شبیه‌سازی شده را وارد فرمایید.');
      return;
    }

    setOtpStage('verified');
    setErrorMsg('');
    setClientSession({
      isLoggedIn: true,
      phone: clientPhone,
      name: clientName,
      verifiedAt: 'شبیه‌سازی آزمایشی کلاینت',
    });

    addToast({
      type: 'info',
      title: '[شبیه‌سازی دمو] نشست آزمایشی فعال شد',
      message: `${clientName} عزیز، ورود آزمایشی شما در مرورگر ثبت شد.`,
    });
  };

  // Final booking confirmation
  const handleFinalConfirm = () => {
    if (otpStage !== 'verified') {
      setErrorMsg('لطفاً ابتدا مرحله شماره موبایل را تکمیل فرمایید.');
      return;
    }

    if (!isDemoMode) {
      setErrorMsg('ثبت قطعی نوبت در نسخه عملیاتی نیازمند اتصال پایگاه‌داده در فاز ۳ تا ۵ است.');
      return;
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const trackingPrefix = salon.slug ? salon.slug.slice(0, 3).toUpperCase() : 'ARA';
    const trackingCode = `${trackingPrefix}-${randomSuffix}`;

    const newBooking: CustomerBooking = {
      id: `bk-${Date.now()}`,
      trackingCode,
      salonId: salon.id,
      salonName: salon.name,
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      serviceName: selectedService.name,
      serviceCategory: selectedService.category,
      staffName: staffNameLabel,
      date: selectedDate,
      time: selectedTime,
      price: selectedService.price,
      paymentMethod: 'in_person',
      createdAt: 'هم‌اکنون',
      status: 'confirmed',
      notes: notes.trim() || undefined,
      isDemo: true,
    };

    onBookingSuccess(newBooking);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200" dir="rtl">
      <div className="relative w-full max-w-xl bg-white dark:bg-[#111B2E] border border-slate-200 dark:border-[#344258] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-900 dark:text-[#E7ECF5] transition-colors">
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-[#344258] flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-[#E7ECF5] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              <span>رزرو نوبت {salon.name}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-[#9AAAC2] mt-0.5">
              مرحله {toPersianDigits(step)} از ۳: {step === 1 ? 'خدمت و آرایشگر' : step === 2 ? 'تاریخ و ساعت' : 'تایید شماره و ثبت'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#18243A] transition-colors cursor-pointer"
            aria-label="بستن"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3-Step Clean Progress Bar */}
        <div className="px-3 sm:px-5 pt-2.5 pb-2 bg-slate-50 dark:bg-[#18243A]/60 border-b border-slate-100 dark:border-[#344258]">
          <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] sm:text-xs">
            <div className={`py-1.5 px-1 sm:px-2 rounded-lg font-bold transition-all truncate ${step === 1 ? 'bg-rose-600 text-white shadow-xs' : step > 1 ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40' : 'text-slate-400 dark:text-slate-600'}`}>
              ۱. خدمت و آرایشگر
            </div>
            <div className={`py-1.5 px-1 sm:px-2 rounded-lg font-bold transition-all truncate ${step === 2 ? 'bg-rose-600 text-white shadow-xs' : step > 2 ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40' : 'text-slate-400 dark:text-slate-600'}`}>
              ۲. زمان نوبت
            </div>
            <div className={`py-1.5 px-1 sm:px-2 rounded-lg font-bold transition-all truncate ${step === 3 ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-400 dark:text-slate-600'}`}>
              ۳. تایید و ثبت
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-xs text-rose-800 dark:text-rose-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ================= STEP 1: SERVICE & STAFF ================= */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Service Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-700 dark:text-[#9AAAC2] block">
                  انتخاب خدمت:
                </label>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {salon.services.map((srv) => {
                    const isSelected = selectedService.id === srv.id;
                    return (
                      <div
                        key={srv.id}
                        onClick={() => setSelectedService(srv)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-500 shadow-xs ring-1 ring-rose-500/30'
                            : 'bg-stone-50 dark:bg-[#18243A] border-stone-200 dark:border-[#344258] hover:border-stone-300 dark:hover:border-zinc-700'
                        }`}
                      >
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-[#E7ECF5] truncate">
                            {srv.name}
                          </h4>
                          <p className="text-[11px] text-zinc-500 dark:text-[#9AAAC2] mt-0.5">
                            {srv.duration} · {srv.description}
                          </p>
                        </div>
                        <div className="text-left shrink-0">
                          <span className="text-xs sm:text-sm font-extrabold text-rose-600 dark:text-rose-400 font-mono tabular-nums">
                            {formatCurrency(srv.price)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Staff Specialist Selection */}
              <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-[#344258]">
                <label className="text-xs font-bold text-zinc-700 dark:text-[#9AAAC2] block">
                  انتخاب متخصص:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedStaff('any')}
                    className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                      selectedStaff === 'any'
                        ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-500 text-rose-700 dark:text-rose-300 font-bold ring-1 ring-rose-500/30'
                        : 'bg-stone-50 dark:bg-[#18243A] border-stone-200 dark:border-[#344258] text-zinc-700 dark:text-[#9AAAC2]'
                    }`}
                  >
                    <div className="text-xs font-bold">اولین متخصص خالی</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">پیشنهادی سالن</div>
                  </button>

                  {salon.staff.map((st) => {
                    const isSelected = selectedStaff !== 'any' && selectedStaff.id === st.id;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setSelectedStaff(st)}
                        className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer flex items-center gap-2 ${
                          isSelected
                            ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-500 font-bold ring-1 ring-rose-500/30'
                            : 'bg-stone-50 dark:bg-[#18243A] border-stone-200 dark:border-[#344258]'
                        }`}
                      >
                        <img src={st.avatar} alt={st.name} className="w-8 h-8 rounded-full object-cover" />
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate text-zinc-800 dark:text-[#E7ECF5]">{st.name}</div>
                          <div className="text-[10px] text-zinc-400 truncate">{st.role}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 2: DATE & TIME ================= */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Date Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-700 dark:text-[#9AAAC2] block">
                  انتخاب روز نوبت:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {availableDates.map((d, idx) => {
                    const isSelected = selectedDate === d.value;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedDate(d.value)}
                        className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-rose-600 text-white border-rose-600 shadow-sm font-bold'
                            : 'bg-stone-50 dark:bg-[#18243A] border-stone-200 dark:border-[#344258] text-zinc-700 dark:text-[#9AAAC2] hover:border-stone-300 dark:hover:border-zinc-700'
                        }`}
                      >
                        <div className="text-xs">{d.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Slots */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-700 dark:text-[#9AAAC2] block">
                  انتخاب ساعت:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {timeSlots.map((time, idx) => {
                    const isSelected = selectedTime === time;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedTime(time)}
                        className={`py-2 px-1 rounded-xl border text-center text-xs font-mono font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                            : 'bg-stone-50 dark:bg-[#18243A] border-stone-200 dark:border-[#344258] text-zinc-700 dark:text-[#9AAAC2] hover:border-stone-300 dark:hover:border-zinc-700'
                        }`}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* In-Person Payment Reminder Card */}
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl flex items-center gap-3 text-emerald-800 dark:text-emerald-300">
                <CreditCard className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div className="text-xs leading-relaxed">
                  <div className="font-bold">تسویه هزینه حضوری در سالن</div>
                  <div className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
                    نیازی به پرداخت آنلاین نیست. هزینه پس از اتمام خدمت در سالن پرداخت می‌شود.
                  </div>
                </div>
              </div>

              {/* Mini Booking Summary */}
              <div className="p-3 bg-stone-50 dark:bg-[#18243A] border border-stone-200 dark:border-[#344258] rounded-xl text-xs space-y-1">
                <div className="flex justify-between text-zinc-600 dark:text-[#9AAAC2]">
                  <span>خدمت انتخابی:</span>
                  <span className="font-bold text-zinc-900 dark:text-[#E7ECF5]">{selectedService.name}</span>
                </div>
                <div className="flex justify-between text-zinc-600 dark:text-[#9AAAC2]">
                  <span>متخصص:</span>
                  <span className="font-bold text-zinc-900 dark:text-[#E7ECF5]">{staffNameLabel}</span>
                </div>
                <div className="flex justify-between text-zinc-600 dark:text-[#9AAAC2] pt-1 border-t border-stone-200 dark:border-[#344258]">
                  <span>مبلغ قابل پرداخت در سالن:</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400 font-mono tabular-nums">{formatCurrency(selectedService.price)}</span>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 3: MOBILE OTP & CONFIRMATION ================= */}
          {step === 3 && (
            <div className="space-y-4">
              {otpStage !== 'verified' ? (
                <div className="space-y-4">
                  <div className="text-xs text-zinc-600 dark:text-[#9AAAC2]">
                    جهت دریافت پیامک تایید نوبت، شماره موبایل خود را وارد کنید:
                  </div>

                  {otpStage === 'input_phone' && (
                    <form onSubmit={handleSendOtp} className="space-y-3">
                      <div>
                        <label className="text-xs font-bold text-zinc-700 dark:text-[#9AAAC2] block mb-1">
                          نام و نام خانوادگی *
                        </label>
                        <input
                          type="text"
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          placeholder="مثال: سارا محمدی"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-[#344258] bg-stone-50 dark:bg-[#18243A] text-xs text-zinc-900 dark:text-[#E7ECF5] focus:outline-none focus:border-rose-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-zinc-700 dark:text-[#9AAAC2] block mb-1">
                          شماره موبایل *
                        </label>
                        <input
                          type="tel"
                          value={clientPhone}
                          onChange={(e) => setClientPhone(e.target.value)}
                          placeholder="۰۹۱۲۱۲۳۴۵۶۷"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-[#344258] bg-stone-50 dark:bg-[#18243A] text-xs font-mono text-zinc-900 dark:text-[#E7ECF5] focus:outline-none focus:border-rose-500"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        دریافت کد تایید پیامکی
                      </button>
                    </form>
                  )}

                  {otpStage === 'input_code' && (
                    <form onSubmit={handleVerifyOtp} className="space-y-3">
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/50 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-1">
                        <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span>شبیه‌ساز پیش‌نمایش کد تایید (حالت آزمایشی دمو)</span>
                        </div>
                        <p className="text-[11px] text-amber-700 dark:text-amber-300/80 leading-relaxed">
                          در این فاز هیچ پیامک مخابراتی واقعی ارسال نمی‌شود. جهت تست ادامه فرآیند، از کد شبیه‌سازی زیر استفاده نمایید:
                        </p>
                        <div className="font-mono font-bold pt-1 text-sm text-rose-600 dark:text-rose-400">
                          کد شبیه‌سازی تست: {generatedOtp}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-zinc-700 dark:text-[#9AAAC2] block mb-1">
                          کد تایید ۴ رقمی:
                        </label>
                        <input
                          type="text"
                          maxLength={4}
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          placeholder="----"
                          className="w-full text-center tracking-widest text-lg font-mono px-3 py-2.5 rounded-xl border border-stone-200 dark:border-[#344258] bg-stone-50 dark:bg-[#18243A] text-zinc-900 dark:text-[#E7ECF5] focus:outline-none focus:border-rose-500"
                          autoFocus
                          required
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer"
                        >
                          تایید و ورود
                        </button>
                        <button
                          type="button"
                          onClick={() => setOtpStage('input_phone')}
                          className="px-3 py-2.5 rounded-xl border border-stone-200 dark:border-[#344258] text-zinc-600 dark:text-[#9AAAC2] text-xs hover:bg-stone-100 dark:hover:bg-[#18243A] transition-colors cursor-pointer"
                        >
                          ویرایش شماره
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                /* VERIFIED USER CONFIRMATION */
                <div className="space-y-4">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                    <span className="flex items-center gap-1.5 font-bold">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      شماره تایید شده: {clientName} ({clientPhone})
                    </span>
                    <button
                      type="button"
                      onClick={() => setOtpStage('input_phone')}
                      className="text-[11px] underline text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
                    >
                      تغییر
                    </button>
                  </div>

                  {/* Optional Note */}
                  <div>
                    <label className="text-xs font-bold text-zinc-700 dark:text-[#9AAAC2] block mb-1">
                      یادداشت برای سالن (اختیاری):
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="اگر نکته خاصی مد نظرتان است بنویسید..."
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-[#344258] bg-stone-50 dark:bg-[#18243A] text-xs text-zinc-900 dark:text-[#E7ECF5] focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  {/* Summary Box */}
                  <div className="p-4 bg-stone-50 dark:bg-[#18243A] border border-stone-200 dark:border-[#344258] rounded-2xl space-y-2 text-xs">
                    <div className="font-bold text-zinc-900 dark:text-[#E7ECF5] pb-1.5 border-b border-stone-200 dark:border-[#344258]">
                      خلاصه نوبت:
                    </div>
                    <div className="flex justify-between text-zinc-600 dark:text-[#9AAAC2]">
                      <span>خدمت:</span>
                      <span className="font-bold text-zinc-900 dark:text-[#E7ECF5]">{selectedService.name}</span>
                    </div>
                    <div className="flex justify-between text-zinc-600 dark:text-[#9AAAC2]">
                      <span>متخصص:</span>
                      <span className="font-bold text-zinc-900 dark:text-[#E7ECF5]">{staffNameLabel}</span>
                    </div>
                    <div className="flex justify-between text-zinc-600 dark:text-[#9AAAC2]">
                      <span>زمان:</span>
                      <span className="font-bold text-zinc-900 dark:text-[#E7ECF5]">{selectedDate} - ساعت {selectedTime}</span>
                    </div>
                    <div className="flex justify-between text-zinc-600 dark:text-[#9AAAC2] pt-2 border-t border-stone-200 dark:border-[#344258]">
                      <span>مبلغ پرداختی در سالن:</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400 font-mono text-sm tabular-nums">{formatCurrency(selectedService.price)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Bottom Action Controls */}
        <div className="p-4 sm:p-5 border-t border-stone-100 dark:border-[#344258]/80 bg-stone-50/50 dark:bg-[#18243A]/60 flex items-center justify-between gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={handlePrevStep}
              className="px-4 py-2.5 rounded-xl border border-stone-200 dark:border-[#344258] text-zinc-600 dark:text-[#9AAAC2] hover:bg-stone-100 dark:hover:bg-[#18243A] text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
            >
              <ChevronRight className="w-4 h-4" />
              <span>مرحله قبل</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 text-xs font-medium cursor-pointer"
            >
              انصراف
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>مرحله بعد</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinalConfirm}
              disabled={otpStage !== 'verified'}
              className={`px-7 py-3 rounded-xl text-xs font-bold text-white shadow-md transition-all flex items-center gap-2 cursor-pointer ${
                otpStage === 'verified'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                  : 'bg-stone-400 dark:bg-zinc-700 opacity-60 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>ثبت نهایی نوبت</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
