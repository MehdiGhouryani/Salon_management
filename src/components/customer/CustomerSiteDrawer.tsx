import React, { useState } from 'react';
import { Check, Copy, LogOut, QrCode } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { useTheme } from '../../context/ThemeContext';
import { DetailedSalonData } from '../../mock/salonDirectoryData';
import { CustomerBooking } from '../../types/admin';
import { toPersianDigits } from '../../utils/formatters';
import { SalonQrModal } from '../common/SalonQrModal';
import { ServerAuthModal } from '../common/ServerAuthModal';
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

const STATUS = {
  confirmed: { label: 'ثبت شده', variant: 'warning' as const },
  completed: { label: 'انجام شد', variant: 'success' as const },
  cancelled: { label: 'لغو شد', variant: 'neutral' as const },
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

  if (!isOpen) return null;

  // Privacy: only the verified client's own bookings, never every booking of the salon.
  const mine =
    clientSession.isLoggedIn && clientSession.phone
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

  const cancel = (b: CustomerBooking) => {
    if (!isDemoMode) {
      addToast({
        type: 'error',
        title: 'لغو نوبت در محیط عملیاتی مسدود است',
        message: 'لغو نوبت نیازمند احراز هویت پیامکی در فاز ۵ است.',
      });
      return;
    }
    cancelCustomerBooking(b.id);
    setConfirmId(null);
    addToast({ type: 'info', title: '[شبیه‌سازی دمو] نوبت لغو شد', message: b.serviceName });
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
                  {clientSession.phone}
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
            {mine.length === 0 ? (
              <p className="py-8 text-sm text-[var(--text-secondary)]">
                {clientSession.isLoggedIn
                  ? 'هنوز نوبتی ثبت نکرده‌اید. از فهرست خدمات، «رزرو» را بزنید.'
                  : 'بعد از ورود، نوبت‌های شما اینجا فهرست می‌شود.'}
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
                      <div className="mt-2.5 flex items-center justify-between gap-3">
                        <Badge variant={st.variant} size="sm">
                          {st.label}
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
