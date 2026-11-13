import React, { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Loader2, LogOut, QrCode } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { DetailedSalonData } from '../../mock/salonDirectoryData';
import { CustomerBooking } from '../../types/admin';
import { toPersianDigits } from '../../utils/formatters';
import { SalonQrModal } from '../common/SalonQrModal';
import { ServerAuthModal } from '../common/ServerAuthModal';
import { api, ApiError } from '../../api/client';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { isValidMobile, money, normalizePhone } from '../salon/format';
import { FlowFrame } from './FlowFrame';

interface CustomerSiteDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentSalon: DetailedSalonData;
  onOpenReceipt?: (booking: CustomerBooking) => void;
}

const STATUS: Record<string, { label: string; variant: 'warning' | 'success' | 'neutral' | 'error' }> = {
  pending: { label: 'در انتظار تایید', variant: 'warning' as const },
  confirmed: { label: 'ثبت شده', variant: 'warning' as const },
  completed: { label: 'انجام شد', variant: 'success' as const },
  cancelled: { label: 'لغو شد', variant: 'neutral' as const },
  no_show: { label: 'بدون حضور', variant: 'error' as const },
};

export const CustomerSiteDrawer: React.FC<CustomerSiteDrawerProps> = ({
  isOpen,
  onClose,
  currentSalon,
  onOpenReceipt,
}) => {
  const {
    isDemoMode,
    clientSession,
    setClientSession,
    logoutClientSession,
    customerBookings,
    cancelCustomerBooking,
    setPersona,
    addToast,
  } = useAdmin();
  const { theme, setTheme } = useTheme();

  const [qrOpen, setQrOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<'bookings' | 'salon'>('bookings');
  const [name, setName] = useState(clientSession.name || '');
  const [phone, setPhone] = useState(clientSession.phone || '');
  const [phoneError, setPhoneError] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);




  // Privacy: only the verified client's own bookings, never every booking of the salon.
  // Phase 11: production bookings come from the server (/api/public/bookings/my)
  // after a real OTP login; demo mode keeps the local preview records.
  const [serverBookings, setServerBookings] = useState<CustomerBooking[]>([]);
  const [serverLoading, setServerLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [cancellingCode, setCancellingCode] = useState<string | null>(null);
  const [trackResult, setTrackResult] = useState<CustomerBooking | null>(null);
  const [trackError, setTrackError] = useState('');
  const [trackCode, setTrackCode] = useState('');
  const [trackLoading, setTrackLoading] = useState(false);

  const { serverAuth } = useAuth();

  const fetchMyBookings = useCallback(async () => {
    if (!isDemoMode && serverAuth.authenticated) {
      setServerLoading(true);
      setServerError('');
      try {
        const data = await api.get<{ success: boolean; bookings: any[] }>('/api/public/bookings/my');
        setServerBookings(
          (data.bookings || []).map((b) => ({
            id: b.id,
            trackingCode: b.trackingCode,
            salonId: b.salonId,
            salonName: b.salonName || '',
            serviceName: b.serviceName || b.serviceId || '',
            serviceCategory: '',
            staffName: b.staffName || '',
            clientName: b.clientName,
            clientPhone: b.clientPhone,
            date: b.bookingDate,
            time: b.bookingTime,
            price: typeof b.price === 'string' ? parseInt(b.price, 10) : b.price,
            paymentMethod: 'in_person' as const,
            createdAt: b.createdAt || new Date().toISOString(),
            status: b.status,
          }))
        );
      } catch (err) {
        setServerError(
          err instanceof ApiError ? err.message : 'خطا در دریافت نوبت‌های شما.'
        );
      } finally {
        setServerLoading(false);
      }
    }
  }, [isDemoMode, serverAuth.authenticated]);

  useEffect(() => {
    if (isOpen && !isDemoMode && serverAuth.authenticated) {
      fetchMyBookings();
    }
  }, [isOpen, fetchMyBookings]);

  if (!isOpen) return null;

  const cancel = async (b: CustomerBooking) => {
    setConfirmId(null);
    if (!isDemoMode) {
      setCancellingCode(b.trackingCode);
      try {
        // Server-confirmed cancellation only: the response IS the updated record.
        const data = await api.post<{ success: boolean; appointment: any }>(
          `/api/public/bookings/${encodeURIComponent(b.trackingCode)}/cancel`,
          { reason: 'لغو توسط مشتری در پنل کاربری' }
        );
        setServerBookings((prev) =>
          prev.map((x) =>
            x.trackingCode === b.trackingCode
              ? { ...x, status: data.appointment?.status || 'cancelled' }
              : x
          )
        );
        addToast({ type: 'success', title: 'نوبت لغو شد', message: `کد پیگیری ${b.trackingCode}` });
      } catch (err) {
        addToast({
          type: 'error',
          title: 'لغو نوبت ناموفق بود',
          message: err instanceof ApiError ? err.message : 'خطای ارتباط با سرور.',
        });
      } finally {
        setCancellingCode(null);
      }
      return;
    }
    cancelCustomerBooking(b.id);
    addToast({ type: 'info', title: '[شبیه‌سازی دمو] نوبت لغو شد', message: b.serviceName });
  };

  const trackByCode = async () => {
    const code = trackCode.trim();
    if (!code) return;
    setTrackLoading(true);
    setTrackError('');
    setTrackResult(null);
    try {
      const data = await api.get<{ success: boolean; appointment: any }>(
        `/api/public/bookings/track/${encodeURIComponent(code)}${
          isValidMobile(phone) ? `?phone=${encodeURIComponent(phone)}` : ''
        }`
      );
      const a = data.appointment;
      setTrackResult({
        id: a.id,
        trackingCode: a.trackingCode,
        salonId: a.salonId,
        salonName: '',
        serviceName: a.serviceId || '',
        serviceCategory: '',
        staffName: '',
        clientName: a.clientName || '',
        clientPhone: a.clientPhone || '',
        date: a.bookingDate,
        time: a.bookingTime,
        price: typeof a.price === 'string' ? parseInt(a.price, 10) : a.price,
        paymentMethod: 'in_person' as const,
        createdAt: new Date().toISOString(),
        status: a.status,
      });
    } catch (err) {
      setTrackError(err instanceof ApiError ? err.message : 'خطا در رهگیری نوبت.');
    } finally {
      setTrackLoading(false);
    }
  };

  // Privacy: server records for logged-in customers (production); local preview records in demo.
  const mine = !isDemoMode
    ? serverBookings
    : clientSession.isLoggedIn && clientSession.phone
      ? customerBookings.filter((b) => b.clientPhone === clientSession.phone)
      : [];

  const login = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDemoMode) {
      setAuthOpen(true);
      return;
    }
    if (!isValidMobile(phone)) {
      setPhoneError('شماره باید با ۰۹ شروع شود و ۱۱ رقم باشد.');
      return;
    }
    setPhoneError('');
    setClientSession({
      isLoggedIn: true,
      phone: normalizePhone(phone),
      name: name.trim() || 'کاربر آزمایشی',
      verifiedAt: 'شبیه‌سازی آزمایشی کلاینت',
    });
    addToast({
      type: 'info',
      title: '[شبیه‌سازی دمو] ورود به پیش‌نمایش آزمایشی',
      message: 'این یک نشست محلی شبیه‌سازی‌شده است.',
    });
  };

  const copyLink = () => {
    const url = `https://nobatara.ir/${currentSalon.slug || 'gisara'}`;
    navigator.clipboard?.writeText(url);
    setCopied(true);
    addToast({ type: 'success', title: 'لینک سالن کپی شد', message: url });
    setTimeout(() => setCopied(false), 2500);
  };



  return (
    <>
      <FlowFrame
        onClose={onClose}
        title="نوبت‌های من"
        subtitle={currentSalon.name}
        footer={
          isDemoMode ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                setPersona('salon_app');
              }}
              className="text-sm text-[var(--text-secondary)] hover:underline cursor-pointer"
            >
              ورود به اپلیکیشن سالن (نسخه دمو)
            </button>
          ) : undefined
        }
      >
        {clientSession.isLoggedIn ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar name={clientSession.name || 'کاربر'} size={40} />
              <div className="min-w-0">
                <div className="text-[15px] font-semibold truncate">{clientSession.name || 'کاربر گرامی'}</div>
                <div dir="ltr" className="text-sm text-[var(--text-secondary)] tabular-nums text-end">
                  <span dir="ltr">{clientSession.phone}</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                logoutClientSession();
                addToast({ type: 'info', title: 'از حساب خارج شدید' });
              }}
              aria-label="خروج از حساب"
              className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <form onSubmit={login} noValidate className="space-y-3">
            <p className="text-sm text-[var(--text-secondary)]">
              برای دیدن نوبت‌هایتان وارد شوید.
            </p>
            <Input label="نام" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            <Input
              label="شماره موبایل"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              error={phoneError || undefined}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              placeholder="09121234567"
              tabularNums
            />
            <Button type="submit" size="md">
              ورود
            </Button>
          </form>
        )}

        <div
          className="mt-6 inline-flex rounded-xl bg-[var(--bg-elevated)] p-1 gap-1"
          role="group"
          aria-label="بخش حساب"
        >
          {(
            [
              { id: 'bookings', label: mine.length ? `نوبت‌ها (${toPersianDigits(mine.length)})` : 'نوبت‌ها' },
              { id: 'salon', label: 'اطلاعات سالن' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`h-9 px-4 rounded-lg text-sm transition-colors cursor-pointer ${
                tab === t.id
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] font-semibold border border-[var(--border-default)]'
                  : 'text-[var(--text-secondary)] border border-transparent'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'bookings' && (
          <div className="mt-2">
            {/* Phase 11: public tracking — code + optional verified phone.
                Anonymous results never include customer PII (server contract). */}
            <div className="mb-4 p-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-subsurface)] space-y-2">
              <p className="text-xs text-[var(--text-secondary)]">پیگیری با کد رهگیری</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={trackCode}
                  onChange={(e) => setTrackCode(e.target.value)}
                  placeholder="مثلاً GIS-123456"
                  dir="ltr"
                  className="flex-1 min-w-0 px-3 py-2 text-sm font-mono rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-accent)]"
                />
                <Button size="sm" onClick={trackByCode} disabled={trackLoading || !trackCode.trim()}>
                  {trackLoading ? '...' : 'پیگیری'}
                </Button>
              </div>
              {trackError && <p className="text-xs text-rose-600">{trackError}</p>}
              {trackResult && (
                <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">خدمت</span>
                    <span>{trackResult.serviceName || trackResult.serviceId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">زمان</span>
                    <span className="tabular-nums">{trackResult.date} ساعت {trackResult.time}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--text-secondary)]">وضعیت</span>
                    <Badge variant={STATUS[trackResult.status]?.variant || 'neutral'}>
                      {STATUS[trackResult.status]?.label || trackResult.status}
                    </Badge>
                  </div>
                  {!trackResult.clientName && (
                    <p className="text-[11px] text-[var(--text-muted)] pt-1">
                      برای مشاهده مشخصات کامل، پس از ورود همین کد را با شماره موبایل خود جستجو کنید.
                    </p>
                  )}
                </div>
              )}
            </div>
            {!isDemoMode && serverLoading ? (
              <div className="py-8 text-center text-sm text-[var(--text-secondary)]">
                <Loader2 className="w-6 h-6 mx-auto animate-spin text-[var(--brand-accent)]" />
                <p className="mt-2">در حال دریافت نوبت‌های شما از سرور…</p>
              </div>
            ) : !isDemoMode && serverError ? (
              <div className="py-6 text-center text-sm space-y-2">
                <p className="text-rose-600">{serverError}</p>
                <Button variant="outline" size="sm" onClick={() => fetchMyBookings()}>
                  تلاش دوباره
                </Button>
              </div>
            ) : mine.length === 0 ? (
              <p className="py-8 text-sm text-[var(--text-secondary)]">
                {!isDemoMode && serverAuth.authenticated
                  ? 'هنوز نوبتی ثبت نکرده‌اید. از فهرست خدمات، «رزرو» را بزنید.'
                  : 'برای مشاهده نوبت‌های خود، با رمز یکبار مصرف وارد شوید.'}
              </p>
            ) : (
              <ul className="divide-y divide-[var(--border-subtle)]">
                {mine.map((b) => {
                  const st = STATUS[b.status];
                  return (
                    <li key={b.id} className="py-4">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[15px] font-semibold">{b.serviceName}</span>
                        <span className="text-[15px] tabular-nums shrink-0">
                          {money(b.price)}
                          <span className="text-xs text-[var(--text-muted)] ms-1">تومان</span>
                        </span>
                      </div>
                      <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                        {b.date}، ساعت {b.time}
                      </p>
                      <p className="text-sm text-[var(--text-secondary)]">{b.staffName}</p>
                      <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5" dir="ltr">
                        {b.trackingCode}
                      </p>
                      <div className="mt-2.5 flex items-center justify-between gap-3">
                        <Badge variant={st?.variant || 'neutral'} size="sm">
                          {st?.label || b.status}
                        </Badge>
                        <div className="flex items-center gap-4 text-sm">
                          {onOpenReceipt && (
                            <button
                              type="button"
                              onClick={() => onOpenReceipt(b)}
                              className="text-[var(--text-primary)] hover:underline cursor-pointer"
                            >
                              رسید
                            </button>
                          )}
                          {b.status === 'confirmed' && confirmId !== b.id && (
                            <button
                              type="button"
                              onClick={() => setConfirmId(b.id)}
                              className="text-[var(--status-error)] hover:underline cursor-pointer"
                            >
                              لغو نوبت
                            </button>
                          )}
                        </div>
                      </div>
                      {confirmId === b.id && (
                        <div className="mt-3 rounded-xl border border-[var(--border-default)] p-3">
                          <p className="text-sm">نوبت «{b.serviceName}» لغو شود؟</p>
                          <div className="mt-2.5 flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setConfirmId(null)}>
                              بازگشت
                            </Button>
                            <Button variant="danger" size="sm" onClick={() => cancel(b)}>
                              لغو نوبت
                            </Button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {tab === 'salon' && (
          <div className="mt-4 space-y-6">
            <div>
              <h3 className="text-sm text-[var(--text-secondary)]">لینک سالن</h3>
              <div className="mt-2 flex items-center gap-2">
                <div
                  dir="ltr"
                  className="flex-1 min-w-0 h-10 px-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-subsurface)] text-sm flex items-center truncate"
                >
                  nobatara.ir/{currentSalon.slug || 'gisara'}
                </div>
                <Button
                  variant="outline"
                  size="md"
                  onClick={copyLink}
                  leftIcon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                >
                  {copied ? 'کپی شد' : 'کپی'}
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setQrOpen(true)}
                  leftIcon={<QrCode className="w-4 h-4" />}
                >
                  QR
                </Button>
              </div>
            </div>

            <dl>
              {[
                ['آدرس', `${currentSalon.city}، ${currentSalon.address}`],
                ['ساعت کاری', currentSalon.workingHours && toPersianDigits(currentSalon.workingHours)],
                ['تلفن', currentSalon.phone],
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-baseline justify-between gap-4 py-2.5 border-b border-[var(--border-subtle)] last:border-b-0"
                  >
                    <dt className="text-sm text-[var(--text-secondary)] shrink-0">{k}</dt>
                    <dd className="text-sm text-end">
                      {k === 'تلفن' ? (
                        <a href={`tel:${v}`} dir="ltr" className="tabular-nums hover:underline">
                          {v}
                        </a>
                      ) : (
                        v
                      )}
                    </dd>
                  </div>
                ))}
            </dl>

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-[var(--text-secondary)]">حالت نمایش</span>
              <div className="inline-flex rounded-xl bg-[var(--bg-elevated)] p-1 gap-1" role="group" aria-label="حالت نمایش">
                {[
                  { id: 'light', label: 'روز' },
                  { id: 'dark', label: 'شب' },
                ].map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    aria-pressed={theme === o.id}
                    onClick={() => setTheme(o.id as 'light' | 'dark')}
                    className={`h-8 px-4 rounded-lg text-sm transition-colors cursor-pointer ${
                      theme === o.id
                        ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] font-semibold border border-[var(--border-default)]'
                        : 'text-[var(--text-secondary)] border border-transparent'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </FlowFrame>

      <SalonQrModal isOpen={qrOpen} onClose={() => setQrOpen(false)} salon={currentSalon} />
      <ServerAuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
};
