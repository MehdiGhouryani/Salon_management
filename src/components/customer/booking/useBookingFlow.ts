import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdmin } from '../../../context/AdminContext';
import { DetailedSalonData, SalonServiceItem, SalonStaffItem } from '../../../mock/salonDirectoryData';
import { CustomerBooking } from '../../../types/admin';
import { isValidMobile, normalizePhone, toLatinDigits, toPersianDigits } from '../../../utils/formatters';

export interface AvailableSlotItem {
  time: string;
  endTime: string;
  available: boolean;
  staffId?: string;
  staffName?: string;
  conflictReason?: string;
}

export interface DayItem {
  dateKey: string;
  /** stored on the booking, e.g. "امروز (پنجشنبه ۸ آبان)" */
  label: string;
  main: string;
  sub: string;
}

export type BookingStep = 1 | 2 | 3;
export type OtpStage = 'input_phone' | 'input_code' | 'verified';

const pad = (n: number) => String(n).padStart(2, '0');
/** The local calendar day. toISOString() is UTC and gives yesterday between 00:00 and 03:30 in Iran. */
const localDateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function getUpcomingBookingDays(): DayItem[] {
  const short = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { weekday: 'short', day: 'numeric', month: 'short' });
  const weekday = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { weekday: 'long' });
  const dayMonth = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { day: 'numeric', month: 'long' });
  const days: DayItem[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const formatted = short.format(d);
    days.push({
      dateKey: localDateKey(d),
      label: i === 0 ? `امروز (${formatted})` : i === 1 ? `فردا (${formatted})` : formatted,
      main: i === 0 ? 'امروز' : i === 1 ? 'فردا' : weekday.format(d),
      sub: dayMonth.format(d),
    });
  }
  return days;
}

const JSON_HEADERS = { 'Content-Type': 'application/json', 'X-NobatAra-Client': 'web' };

export function useBookingFlow(
  salon: DetailedSalonData,
  initialServiceId: string | undefined,
  onBookingSuccess: (b: CustomerBooking) => void
) {
  const { clientSession, setClientSession, addToast } = useAdmin();

  const [step, setStep] = useState<BookingStep>(1);
  const [service, setService] = useState<SalonServiceItem | undefined>(
    () => salon.services.find((s) => s.id === initialServiceId) || salon.services[0]
  );
  const [staff, setStaff] = useState<SalonStaffItem | 'any'>('any');

  const days = useMemo(getUpcomingBookingDays, []);
  const [day, setDay] = useState<DayItem>(days[0]);
  const [slots, setSlots] = useState<AvailableSlotItem[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsFailed, setSlotsFailed] = useState(false);
  const [isOpenOnDay, setIsOpenOnDay] = useState(true);
  const [closedReason, setClosedReason] = useState('');
  const [time, setTime] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [clientName, setClientName] = useState(clientSession.name || '');
  const [clientPhone, setClientPhone] = useState(clientSession.phone || '');
  const [otpStage, setOtpStage] = useState<OtpStage>(clientSession.isLoggedIn ? 'verified' : 'input_phone');
  const [otpCode, setOtpCode] = useState('');
  const [bookingGrant, setBookingGrant] = useState<string>('');
  const [resendIn, setResendIn] = useState(0);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Availability comes from the server. If it cannot be reached we say so; we never invent free hours.
  useEffect(() => {
    if (!service) return;
    let alive = true;
    setSlotsLoading(true);
    setSlotsFailed(false);
    const staffQuery = staff === 'any' ? '' : `&staffId=${encodeURIComponent(staff.id)}`;
    const url = `/api/public/salons/${encodeURIComponent(salon.id)}/availability?serviceId=${encodeURIComponent(service.id)}&date=${encodeURIComponent(day.dateKey)}${staffQuery}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;
        setSlotsLoading(false);
        if (!data.success) throw new Error('availability');
        const list: AvailableSlotItem[] = data.slots || [];
        setIsOpenOnDay(data.isOpen);
        setClosedReason(data.reason || '');
        setSlots(list);
        setTime((prev) => {
          if (prev && list.some((s) => s.time === prev && s.available)) return prev;
          return list.find((s) => s.available)?.time || '';
        });
      })
      .catch(() => {
        if (!alive) return;
        setSlotsLoading(false);
        setSlotsFailed(true);
        setSlots([]);
        setTime('');
      });
    return () => {
      alive = false;
    };
  }, [salon.id, service, staff, day, reloadKey]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const chosenSlot = slots.find((s) => s.time === time);
  const staffLabel =
    staff === 'any' ? chosenSlot?.staffName || 'اولین متخصص خالی' : staff.name;

  const next = () => {
    setError('');
    if (step === 1) {
      if (!service) return setError('یک خدمت را انتخاب کنید.');
      setStep(2);
    } else if (step === 2) {
      if (!isOpenOnDay) return setError(closedReason || 'سالن در این تاریخ تعطیل است.');
      if (!time) return setError('یک ساعت آزاد را انتخاب کنید.');
      setStep(3);
    }
  };
  const back = () => {
    setError('');
    setStep((s) => (Math.max(s - 1, 1) as BookingStep));
  };

  const sendOtp = useCallback(async () => {
    if (clientName.trim().length < 2) return setError('نام و نام خانوادگی را کامل وارد کنید.');
    if (!isValidMobile(clientPhone)) return setError('شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد.');
    const phone = normalizePhone(clientPhone);
    setClientPhone(phone);
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ phone, purpose: 'booking_verification' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'ارسال کد تأیید با خطا مواجه شد.');
        return;
      }
      setResendIn(data.resendAvailableInSeconds || 60);
      setOtpCode('');
      setOtpStage('input_code');
      addToast({
        type: 'info',
        title: 'کد تأیید ارسال شد',
        message: data.message || `کد تأیید برای شماره ${data.phone} ارسال شد.`,
      });
    } catch {
      setError('ارتباط با سرور برقرار نشد.');
    } finally {
      setBusy(false);
    }
  }, [clientName, clientPhone, addToast]);

  const verifyOtp = useCallback(async () => {
    const code = toLatinDigits(otpCode).replace(/\s/g, '');
    if (code.length < 6) return setError('کد ۶ رقمی را کامل وارد کنید.');
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: JSON_HEADERS,
        credentials: 'include',
        body: JSON.stringify({ phone: normalizePhone(clientPhone), code, purpose: 'booking_verification' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'کد وارد شده صحیح نیست.');
        return;
      }
      // Phase 08: the server returns a short-lived, single-use booking grant
      // (never a login session). It authorizes exactly one booking submission.
      setBookingGrant(typeof data.bookingGrant === 'string' ? data.bookingGrant : '');
      setOtpStage('verified');
      setClientSession({
        isLoggedIn: true,
        phone: normalizePhone(clientPhone),
        name: clientName.trim(),
        verifiedAt: 'نشست احراز هویت شده سرور',
      });
      addToast({ type: 'success', title: 'شماره موبایل شما تأیید شد' });
    } catch {
      setError('ارتباط با سرور برقرار نشد.');
    } finally {
      setBusy(false);
    }
  }, [otpCode, clientPhone, clientName, setClientSession, addToast]);

  const confirm = useCallback(async () => {
    if (!service) return setError('خدمتی انتخاب نشده است.');
    if (otpStage !== 'verified') return setError('ابتدا شماره موبایل را تأیید کنید.');
    if (!time) return setError('ساعت نوبت مشخص نشده است.');
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/public/bookings', {
        method: 'POST',
        headers: {
          ...JSON_HEADERS,
          ...(bookingGrant ? { 'X-NobatAra-Booking-Grant': bookingGrant } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          salonId: salon.id,
          serviceId: service.id,
          staffId: staff === 'any' ? undefined : staff.id,
          bookingDate: day.dateKey,
          bookingTime: time,
          clientName: clientName.trim(),
          clientPhone: normalizePhone(clientPhone),
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'SLOT_ALREADY_TAKEN') {
          setError('این ساعت همین حالا رزرو شد. ساعت دیگری را انتخاب کنید.');
          setReloadKey((k) => k + 1);
          setStep(2);
        } else if (data.error === 'DATABASE_UNAVAILABLE') {
          setError('پایگاه داده در محیط عملیاتی هنوز متصل نشده است (آماده‌سازی فاز ۴).');
        } else {
          setError(data.message || 'ثبت نوبت با خطا مواجه شد.');
        }
        return;
      }
      const appt = data.appointment;
      onBookingSuccess({
        id: appt.id,
        trackingCode: data.trackingCode || appt.tracking_code,
        salonId: salon.id,
        salonName: salon.name,
        clientName: appt.client_name,
        clientPhone: appt.client_phone,
        serviceName: service.name,
        serviceCategory: service.category,
        staffName: staffLabel,
        date: day.label,
        time: toPersianDigits(time), // the server speaks Latin digits; the app shows Persian ones
        price: typeof appt.price === 'string' ? parseInt(appt.price, 10) : appt.price,
        paymentMethod: 'in_person',
        createdAt: 'هم‌اکنون',
        status: appt.status || 'confirmed',
        notes: appt.notes || undefined,
        isDemo: appt.is_demo,
      });
    } catch {
      setError('ارتباط با سرور برقرار نشد؛ نوبت ثبت نشد.');
    } finally {
      setBusy(false);
    }
  }, [service, otpStage, bookingGrant, time, salon, staff, day, clientName, clientPhone, notes, staffLabel, onBookingSuccess]);

  return {
    step, next, back,
    service, setService, staff, setStaff,
    days, day, setDay,
    slots, slotsLoading, slotsFailed, isOpenOnDay, closedReason, time, setTime,
    retrySlots: () => setReloadKey((k) => k + 1),
    clientName, setClientName, clientPhone, setClientPhone,
    otpStage, setOtpStage, otpCode, setOtpCode, resendIn,
    notes, setNotes, error, setError, busy,
    sendOtp, verifyOtp, confirm, staffLabel,
  };
}

export type BookingFlow = ReturnType<typeof useBookingFlow>;
