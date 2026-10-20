import React, { useState, useEffect, useMemo } from 'react';
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
  Loader2,
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

interface AvailableSlotItem {
  time: string;
  endTime: string;
  available: boolean;
  staffId?: string;
  staffName?: string;
  conflictReason?: string;
}

function getUpcomingBookingDays() {
  const days = [];
  const now = new Date();

  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const isoKey = d.toISOString().split('T')[0];

    let label = '';
    try {
      const persianFormatted = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }).format(d);
      if (i === 0) label = `امروز (${persianFormatted})`;
      else if (i === 1) label = `فردا (${persianFormatted})`;
      else label = persianFormatted;
    } catch {
      const fallbackDays = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];
      const dayName = fallbackDays[d.getDay()];
      if (i === 0) label = `امروز (${dayName})`;
      else if (i === 1) label = `فردا (${dayName})`;
      else label = `${dayName} (${toPersianDigits(d.getDate())})`;
    }

    days.push({
      dateKey: isoKey,
      label,
    });
  }
  return days;
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
  const upcomingDays = useMemo(() => getUpcomingBookingDays(), []);
  const [selectedDateItem, setSelectedDateItem] = useState<{ dateKey: string; label: string }>(upcomingDays[0]);

  // Live slots from server
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [isSalonOpenOnDate, setIsSalonOpenOnDate] = useState(true);
  const [closedReason, setClosedReason] = useState('');
  const [serverSlots, setServerSlots] = useState<AvailableSlotItem[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>('');

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync client session if logged in
  useEffect(() => {
    if (clientSession.isLoggedIn) {
      if (clientSession.name) setClientName(clientSession.name);
      if (clientSession.phone) setClientPhone(clientSession.phone);
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

  // Fetch real available slots when date, service, or staff changes
  useEffect(() => {
    if (!isOpen || !selectedService) return;

    let isMounted = true;
    setSlotsLoading(true);
    setErrorMsg('');

    const staffQuery = selectedStaff === 'any' ? '' : `&staffId=${encodeURIComponent(selectedStaff.id)}`;
    const url = `/api/public/salons/${encodeURIComponent(salon.id)}/availability?serviceId=${encodeURIComponent(selectedService.id)}&date=${encodeURIComponent(selectedDateItem.dateKey)}${staffQuery}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        setSlotsLoading(false);

        if (data.success) {
          setIsSalonOpenOnDate(data.isOpen);
          setClosedReason(data.reason || '');
          setServerSlots(data.slots || []);

          // Auto-select first available slot if previous selection is invalid
          const firstFree = (data.slots || []).find((s: AvailableSlotItem) => s.available);
          if (firstFree && (!selectedTime || !data.slots.some((s: AvailableSlotItem) => s.time === selectedTime && s.available))) {
            setSelectedTime(firstFree.time);
          } else if (!firstFree) {
            setSelectedTime('');
          }
        } else {
          // Fallback to default slots if network/offline
          setIsSalonOpenOnDate(true);
          const fallbackSlots: AvailableSlotItem[] = [
            { time: '10:00', endTime: '11:00', available: true },
            { time: '11:30', endTime: '12:30', available: true },
            { time: '14:00', endTime: '15:00', available: true },
            { time: '15:30', endTime: '16:30', available: true },
            { time: '17:00', endTime: '18:00', available: true },
            { time: '18:30', endTime: '19:30', available: true },
          ];
          setServerSlots(fallbackSlots);
          setSelectedTime('10:00');
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setSlotsLoading(false);
        setIsSalonOpenOnDate(true);
        const fallbackSlots: AvailableSlotItem[] = [
          { time: '10:00', endTime: '11:00', available: true },
          { time: '11:30', endTime: '12:30', available: true },
          { time: '14:00', endTime: '15:00', available: true },
          { time: '15:30', endTime: '16:30', available: true },
          { time: '17:00', endTime: '18:00', available: true },
        ];
        setServerSlots(fallbackSlots);
        setSelectedTime('10:00');
      });

    return () => {
      isMounted = false;
    };
  }, [salon.id, selectedService, selectedStaff, selectedDateItem, isOpen]);

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
      if (!isSalonOpenOnDate) {
        setErrorMsg(closedReason || 'سالن در این تاریخ تعطیل است.');
        return;
      }
      if (!selectedTime) {
        setErrorMsg('لطفاً یک ساعت آزاد از فهرست انتخاب نمایید.');
        return;
      }
      setStep(3);
    }
  };

  const handlePrevStep = () => {
    setErrorMsg('');
    setStep((prev) => (Math.max(prev - 1, 1) as 1 | 2 | 3));
  };

  // Send real cryptographic OTP via server
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!clientName.trim() || clientName.trim().length < 2) {
      setErrorMsg('لطفاً نام و نام خانوادگی خود را کامل وارد کنید');
      return;
    }
    const cleanPhone = clientPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10 || !clientPhone.startsWith('09')) {
      setErrorMsg('شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-NobatAra-Client': 'web',
        },
        body: JSON.stringify({
          phone: clientPhone.trim(),
          purpose: 'booking_verification',
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.message || 'ارسال کد تایید با خطا مواجه شد.');
        return;
      }

      setOtpTimer(data.resendAvailableInSeconds || 60);
      setOtpStage('input_code');
      setErrorMsg('');

      // In development mode, the mock provider logs OTP
      addToast({
        type: 'info',
        title: 'کد تایید ارسال شد',
        message: data.message || `کد تایید به شماره ${data.phone} ارسال گردید.`,
      });
    } catch {
      setErrorMsg('خطا در برقراری ارتباط با سرور.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Verify real cryptographic OTP
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length < 4) {
      setErrorMsg('لطفاً کد تایید دریافتی را کامل وارد کنید');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-NobatAra-Client': 'web',
        },
        credentials: 'include',
        body: JSON.stringify({
          phone: clientPhone.trim(),
          code: otpCode.trim(),
          purpose: 'booking_verification',
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.message || 'کد وارد شده صحیح نمی‌باشد.');
        return;
      }

      setOtpStage('verified');
      setErrorMsg('');
      setClientSession({
        isLoggedIn: true,
        phone: clientPhone.trim(),
        name: clientName.trim(),
        verifiedAt: 'نشست احراز هویت شده سرور',
      });
      addToast({
        type: 'success',
        title: 'هویت تایید شد',
        message: `${clientName} عزیز، نشست شما با موفقیت تایید شد.`,
      });
    } catch {
      setErrorMsg('خطا در اعتبارسنجی کد با سرور.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Final booking confirmation: Real Server-Side Atomic Persistence (Phase 7)
  const handleFinalConfirm = async () => {
    if (otpStage !== 'verified') {
      setErrorMsg('لطفاً ابتدا مرحله تایید شماره موبایل را انجام دهید.');
      return;
    }

    if (!selectedTime) {
      setErrorMsg('ساعت نوبت مشخص نشده است.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/public/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-NobatAra-Client': 'web',
        },
        credentials: 'include',
        body: JSON.stringify({
          salonId: salon.id,
          serviceId: selectedService.id,
          staffId: selectedStaff === 'any' ? undefined : selectedStaff.id,
          bookingDate: selectedDateItem.dateKey,
          bookingTime: selectedTime,
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim(),
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'SLOT_ALREADY_TAKEN') {
          setErrorMsg('این زمان نوبت قبلاً رزرو شده است یا با نوبت دیگری تداخل دارد. لطفاً ساعت دیگری را انتخاب فرمایید.');
        } else if (data.error === 'DATABASE_UNAVAILABLE') {
          setErrorMsg('پایگاه داده در محیط عملیاتی هنوز متصل نشده است (آماده‌سازی فاز ۴).');
        } else {
          setErrorMsg(data.message || 'ثبت نوبت با خطا مواجه شد.');
        }
        return;
      }

      // Authoritative booking record returned from server
      const appt = data.appointment;
      const bookedRecord: CustomerBooking = {
        id: appt.id,
        trackingCode: data.trackingCode || appt.tracking_code,
        salonId: salon.id,
        salonName: salon.name,
        clientName: appt.client_name,
        clientPhone: appt.client_phone,
        serviceName: selectedService.name,
        serviceCategory: selectedService.category,
        staffName: staffNameLabel,
        date: selectedDateItem.label,
        time: selectedTime,
        price: typeof appt.price === 'string' ? parseInt(appt.price, 10) : appt.price,
        paymentMethod: 'in_person',
        createdAt: 'هم‌اکنون',
        status: appt.status || 'confirmed',
        notes: appt.notes || undefined,
        isDemo: appt.is_demo,
      };

      onBookingSuccess(bookedRecord);
    } catch {
      setErrorMsg('خطا در اتصال به سرور جهت ثبت قطعی نوبت.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200" dir="rtl">
      <div className="relative w-full max-w-xl bg-surface border border-border-subtle rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-text-main transition-colors">
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-border-subtle flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-text-main flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand" />
              <span>رزرو نوبت {salon.name}</span>
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              مرحله {toPersianDigits(step)} از ۳: {step === 1 ? 'خدمت و متخصص' : step === 2 ? 'تاریخ و ساعت' : 'تایید شماره و ثبت'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-subtle hover:text-text-main hover:bg-elevated transition-colors cursor-pointer"
            aria-label="بستن"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3-Step Clean Progress Bar */}
        <div className="px-3 sm:px-5 pt-2.5 pb-2 bg-elevated/40 border-b border-border-subtle">
          <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] sm:text-xs">
            <div className={`py-1.5 px-1 sm:px-2 rounded-lg font-bold transition-all truncate ${step === 1 ? 'bg-brand text-white shadow-xs' : step > 1 ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' : 'text-text-subtle'}`}>
              ۱. خدمت و متخصص
            </div>
            <div className={`py-1.5 px-1 sm:px-2 rounded-lg font-bold transition-all truncate ${step === 2 ? 'bg-brand text-white shadow-xs' : step > 2 ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' : 'text-text-subtle'}`}>
              ۲. تاریخ و ساعت
            </div>
            <div className={`py-1.5 px-1 sm:px-2 rounded-lg font-bold transition-all truncate ${step === 3 ? 'bg-brand text-white shadow-xs' : 'text-text-subtle'}`}>
              ۳. تایید و ثبت
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ================= STEP 1: SERVICE & STAFF ================= */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Service Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-muted block">
                  انتخاب خدمت مورد نظر:
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
                            ? 'bg-brand-subdued border-brand shadow-xs ring-1 ring-brand/30'
                            : 'bg-elevated/50 border-border-subtle hover:border-border-strong'
                        }`}
                      >
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-text-main truncate">
                            {srv.name}
                          </h4>
                          <p className="text-[11px] text-text-muted mt-0.5">
                            {srv.duration} · {srv.description}
                          </p>
                        </div>
                        <div className="text-left shrink-0">
                          <span className="text-xs sm:text-sm font-extrabold text-brand font-mono tabular-nums">
                            {formatCurrency(srv.price)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Staff Specialist Selection */}
              <div className="space-y-2 pt-2 border-t border-border-subtle">
                <label className="text-xs font-bold text-text-muted block">
                  انتخاب متخصص:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedStaff('any')}
                    className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                      selectedStaff === 'any'
                        ? 'bg-brand-subdued border-brand text-brand font-bold ring-1 ring-brand/30'
                        : 'bg-elevated/50 border-border-subtle text-text-main'
                    }`}
                  >
                    <div className="text-xs font-bold">اولین متخصص خالی</div>
                    <div className="text-[10px] text-text-subtle mt-0.5">پیشنهادی سالن</div>
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
                            ? 'bg-brand-subdued border-brand font-bold ring-1 ring-brand/30'
                            : 'bg-elevated/50 border-border-subtle'
                        }`}
                      >
                        <img src={st.avatar} alt={st.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate text-text-main">{st.name}</div>
                          <div className="text-[10px] text-text-subtle truncate">{st.specialty || st.role}</div>
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
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-text-muted block">
                    انتخاب روز نوبت (۷ روز آینده):
                  </label>
                  <span className="text-[11px] text-text-subtle">
                    مدت خدمت: {selectedService.duration}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {upcomingDays.map((d) => {
                    const isSelected = selectedDateItem.dateKey === d.dateKey;
                    return (
                      <button
                        key={d.dateKey}
                        type="button"
                        onClick={() => setSelectedDateItem(d)}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-brand text-white border-brand shadow-xs font-bold'
                            : 'bg-elevated/50 border-border-subtle text-text-main hover:border-border-strong'
                        }`}
                      >
                        <div className="text-xs leading-tight">{d.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Slots */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-text-muted block">
                    ساعت‌های آزاد نوبت:
                  </label>
                  {slotsLoading && (
                    <span className="text-[11px] text-brand flex items-center gap-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>در حال استعلام زمان‌های آزاد...</span>
                    </span>
                  )}
                </div>

                {!isSalonOpenOnDate ? (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-center text-xs text-amber-700 dark:text-amber-300 space-y-1">
                    <Clock className="w-6 h-6 mx-auto text-amber-500 stroke-1" />
                    <div className="font-bold">{closedReason || 'سالن در این روز تعطیل است.'}</div>
                    <div className="text-[11px] text-text-subtle">لطفاً یکی دیگر از روزهای هفته را انتخاب فرمایید.</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {serverSlots.map((slot, idx) => {
                      const isSelected = selectedTime === slot.time;
                      const isAvailable = slot.available;

                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => setSelectedTime(slot.time)}
                          className={`py-2 px-1 rounded-xl border text-center text-xs font-mono font-bold transition-all ${
                            isSelected && isAvailable
                              ? 'bg-brand text-white border-brand shadow-xs cursor-pointer'
                              : isAvailable
                              ? 'bg-elevated/60 border-border-subtle text-text-main hover:border-brand cursor-pointer'
                              : 'bg-elevated/20 border-border-subtle/50 text-text-subtle/50 opacity-50 cursor-not-allowed line-through'
                          }`}
                          title={!isAvailable ? slot.conflictReason || 'نوبت پر است' : `پایان: ساعت ${slot.endTime}`}
                        >
                          <div>{toPersianDigits(slot.time)}</div>
                          {!isAvailable && (
                            <span className="text-[9px] block text-rose-500 font-sans not-italic font-normal">
                              تکمیل
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* In-Person Payment Notice */}
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-emerald-800 dark:text-emerald-300">
                <CreditCard className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div className="text-xs leading-relaxed">
                  <div className="font-bold">تسویه هزینه حضوری در سالن</div>
                  <div className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                    رزرو نوبت کاملاً رایگان است؛ هزینه خدمت ({formatCurrency(selectedService.price)}) پس از اتمام کار در سالن پرداخت می‌شود.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 3: MOBILE OTP & CONFIRMATION ================= */}
          {step === 3 && (
            <div className="space-y-4">
              {otpStage !== 'verified' ? (
                <div className="space-y-4">
                  <div className="text-xs text-text-muted">
                    جهت دریافت پیامک تایید نوبت، شماره موبایل خود را وارد فرمایید:
                  </div>

                  {otpStage === 'input_phone' && (
                    <form onSubmit={handleSendOtp} className="space-y-3">
                      <div>
                        <label className="text-xs font-bold text-text-muted block mb-1">
                          نام و نام خانوادگی *
                        </label>
                        <input
                          type="text"
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          placeholder="مثال: سارا محمدی"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle bg-elevated/50 text-xs text-text-main focus:outline-none focus:border-brand"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-text-muted block mb-1">
                          شماره موبایل *
                        </label>
                        <input
                          type="tel"
                          value={clientPhone}
                          onChange={(e) => setClientPhone(e.target.value)}
                          placeholder="۰۹۱۲۱۲۳۴۵۶۷"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle bg-elevated/50 text-xs font-mono text-text-main focus:outline-none focus:border-brand"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 rounded-xl bg-brand hover:bg-brand-accent text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                        <span>دریافت کد تایید پیامکی</span>
                      </button>
                    </form>
                  )}

                  {otpStage === 'input_code' && (
                    <form onSubmit={handleVerifyOtp} className="space-y-3">
                      <div className="p-3 bg-brand-subdued border border-brand/30 rounded-xl text-xs text-text-main space-y-1">
                        <div className="font-bold flex items-center gap-1.5 text-brand">
                          <ShieldCheck className="w-4 h-4 text-brand shrink-0" />
                          <span>کد تایید ۶ رقمی سرور</span>
                        </div>
                        <p className="text-[11px] text-text-muted leading-relaxed">
                          کد تایید امنیتی به شماره {toPersianDigits(clientPhone)} ارسال گردید. لطفاً کد را در کادر زیر وارد فرمایید:
                        </p>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-text-muted block mb-1">
                          کد تایید ۶ رقمی:
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          placeholder="------"
                          className="w-full text-center tracking-widest text-lg font-mono px-3 py-2.5 rounded-xl border border-border-subtle bg-elevated/50 text-text-main focus:outline-none focus:border-brand"
                          autoFocus
                          required
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="flex-1 py-2.5 rounded-xl bg-brand hover:bg-brand-accent text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
                        >
                          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          <span>تایید و ورود</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setOtpStage('input_phone')}
                          className="px-3 py-2.5 rounded-xl border border-border-subtle text-text-muted text-xs hover:bg-elevated transition-colors cursor-pointer"
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
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                    <span className="flex items-center gap-1.5 font-bold">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      شماره تایید شده: {clientName} ({toPersianDigits(clientPhone)})
                    </span>
                    <button
                      type="button"
                      onClick={() => setOtpStage('input_phone')}
                      className="text-[11px] underline text-text-muted hover:text-text-main cursor-pointer"
                    >
                      تغییر شماره
                    </button>
                  </div>

                  {/* Optional Note */}
                  <div>
                    <label className="text-xs font-bold text-text-muted block mb-1">
                      یادداشت برای سالن (اختیاری):
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="اگر نکته خاصی مد نظرتان است بنویسید..."
                      className="w-full px-3 py-2 rounded-xl border border-border-subtle bg-elevated/50 text-xs text-text-main focus:outline-none focus:border-brand"
                    />
                  </div>

                  {/* Summary Box */}
                  <div className="p-4 bg-elevated/60 border border-border-subtle rounded-2xl space-y-2 text-xs">
                    <div className="font-bold text-text-main pb-1.5 border-b border-border-subtle flex justify-between items-center">
                      <span>خلاصه نوبت:</span>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-normal">تسویه حضوری</span>
                    </div>
                    <div className="flex justify-between text-text-muted">
                      <span>خدمت:</span>
                      <span className="font-bold text-text-main">{selectedService.name}</span>
                    </div>
                    <div className="flex justify-between text-text-muted">
                      <span>متخصص:</span>
                      <span className="font-bold text-text-main">{staffNameLabel}</span>
                    </div>
                    <div className="flex justify-between text-text-muted">
                      <span>زمان:</span>
                      <span className="font-bold text-text-main">{selectedDateItem.label} - ساعت {toPersianDigits(selectedTime)}</span>
                    </div>
                    <div className="flex justify-between text-text-muted">
                      <span>مدت زمان:</span>
                      <span className="font-bold text-text-main">{selectedService.duration}</span>
                    </div>
                    <div className="flex justify-between text-text-muted pt-2 border-t border-border-subtle">
                      <span>مبلغ پرداختی در سالن:</span>
                      <span className="font-bold text-brand font-mono text-sm tabular-nums">{formatCurrency(selectedService.price)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Bottom Action Controls */}
        <div className="p-4 sm:p-5 border-t border-border-subtle bg-elevated/40 flex items-center justify-between gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={handlePrevStep}
              className="px-4 py-2.5 rounded-xl border border-border-subtle text-text-muted hover:bg-elevated text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
            >
              <ChevronRight className="w-4 h-4" />
              <span>مرحله قبل</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-text-muted hover:text-text-main text-xs font-medium cursor-pointer"
            >
              انصراف
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="px-6 py-2.5 rounded-xl bg-brand hover:bg-brand-accent text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>مرحله بعد</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinalConfirm}
              disabled={otpStage !== 'verified' || isSubmitting}
              className={`px-7 py-3 rounded-xl text-xs font-bold text-white shadow-md transition-all flex items-center gap-2 cursor-pointer ${
                otpStage === 'verified' && !isSubmitting
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                  : 'bg-elevated text-text-subtle opacity-60 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>در حال ثبت نوبت...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>ثبت قطعی نوبت</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
