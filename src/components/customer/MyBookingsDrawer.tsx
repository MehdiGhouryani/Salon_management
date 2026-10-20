import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  User,
  Scissors,
  X,
  CreditCard,
  Search,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  LogIn,
  LogOut,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { CustomerBooking } from '../../types/admin';
import { toPersianDigits, formatCurrency } from '../../utils/formatters';
import { ServerAuthModal } from '../common/ServerAuthModal';

interface MyBookingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenReceipt?: (booking: CustomerBooking) => void;
  salon?: any;
}

export const MyBookingsDrawer: React.FC<MyBookingsDrawerProps> = ({
  isOpen,
  onClose,
  onOpenReceipt,
}) => {
  const {
    isDemoMode,
    clientSession,
    logoutClientSession,
    customerBookings,
    cancelCustomerBooking,
    addToast,
  } = useAdmin();

  const [filterQuery, setFilterQuery] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [serverBookings, setServerBookings] = useState<CustomerBooking[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch customer's real bookings from server whenever drawer opens or session changes
  const fetchMyServerBookings = async () => {
    if (!clientSession.isLoggedIn) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/public/bookings/my', {
        headers: {
          'X-NobatAra-Client': 'web',
        },
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.bookings)) {
        const mapped: CustomerBooking[] = data.bookings.map((b: any) => ({
          id: b.id,
          trackingCode: b.trackingCode,
          salonId: b.salonId,
          salonName: 'گیس‌آرا (زعفرانیه)',
          clientName: b.clientName,
          clientPhone: b.clientPhone,
          serviceName: 'خدمت زیبایی',
          serviceCategory: 'hair',
          staffName: 'متخصص سالن',
          date: b.bookingDate,
          time: b.bookingTime,
          price: b.price,
          paymentMethod: 'in_person',
          createdAt: b.createdAt ? new Date(b.createdAt).toLocaleDateString('fa-IR') : 'هم‌اکنون',
          status: b.status,
          notes: b.notes,
          isDemo: b.isDemo,
        }));
        setServerBookings(mapped);
      }
    } catch {
      // Graceful fallback to client state if offline
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && clientSession.isLoggedIn) {
      fetchMyServerBookings();
    }
  }, [isOpen, clientSession.isLoggedIn]);

  if (!isOpen) return null;

  // Merge client state customerBookings with serverBookings (avoiding duplicate IDs)
  const allKnownBookings = [...customerBookings];
  for (const sb of serverBookings) {
    if (!allKnownBookings.some((b) => b.trackingCode === sb.trackingCode || b.id === sb.id)) {
      allKnownBookings.push(sb);
    }
  }

  // PRIVACY ENFORCEMENT: Never return all bookings when input is empty!
  // Only return bookings if client is logged in and phone matches, OR if user explicitly searches their phone or tracking code.
  const filteredBookings = allKnownBookings.filter((b) => {
    const q = filterQuery.trim().toLowerCase();
    if (q) {
      return (
        b.clientPhone.replace(/\s+/g, '').includes(q) ||
        b.trackingCode.toLowerCase().includes(q)
      );
    }
    // If logged in, strictly show only their own bookings
    if (clientSession.isLoggedIn && clientSession.phone) {
      return b.clientPhone === clientSession.phone;
    }
    // If unauthenticated and no search term, return NOTHING
    return false;
  });

  const handleCancelClick = async (id: string) => {
    setCancellingId(id);
    await cancelCustomerBooking(id);
    setCancellingId(null);
    fetchMyServerBookings();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200" dir="rtl">
      <div className="w-full max-w-md h-full bg-surface border-r border-border-subtle shadow-2xl flex flex-col text-text-main animate-in slide-in-from-left duration-300 transition-colors">
        {/* Drawer Header */}
        <div className="p-5 border-b border-border-subtle bg-elevated/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-subdued border border-brand/30 flex items-center justify-center text-brand">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-main">نوبت‌های من</h3>
              <p className="text-[11px] text-text-muted">پیگیری و لغو نوبت‌های اختصاصی</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {clientSession.isLoggedIn && (
              <button
                onClick={fetchMyServerBookings}
                disabled={isLoading}
                className="p-1.5 text-text-subtle hover:text-text-main hover:bg-elevated rounded-lg transition-colors cursor-pointer"
                title="بروزرسانی فهرست نوبت‌ها"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-brand' : ''}`} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-text-subtle hover:text-text-main hover:bg-elevated rounded-lg transition-colors cursor-pointer"
              aria-label="بستن"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Input & Auth Status */}
        <div className="p-4 bg-elevated/40 border-b border-border-subtle space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-text-subtle" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="جستجو با شماره موبایل یا کد رهگیری (مثلاً GIS-1234)..."
              className="w-full pr-9 pl-3 py-2 text-xs bg-surface border border-border-subtle rounded-lg text-text-main placeholder-text-subtle focus:outline-none focus:border-brand transition-colors font-mono"
            />
          </div>

          {clientSession.isLoggedIn ? (
            <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                ورود تایید شده: {toPersianDigits(clientSession.phone)}
              </span>
              <button
                onClick={logoutClientSession}
                className="text-[11px] text-text-muted hover:text-rose-600 flex items-center gap-1 cursor-pointer transition-colors"
                title="خروج از حساب"
              >
                <LogOut className="w-3 h-3" />
                <span>خروج</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="w-full py-1.5 px-3 rounded-lg bg-brand-subdued border border-brand/30 text-xs text-brand font-semibold flex items-center justify-center gap-1.5 hover:bg-brand/15 transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>ورود با رمز یکبار مصرف جهت مشاهده خودکار نوبت‌ها</span>
            </button>
          )}
        </div>

        {/* Bookings List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="py-12 text-center text-text-muted space-y-3">
              <Loader2 className="w-8 h-8 mx-auto text-brand animate-spin" />
              <p className="text-xs">در حال بارگذاری نوبت‌های شما از سرور...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="py-12 text-center text-text-subtle space-y-3">
              <Calendar className="w-10 h-10 mx-auto text-text-subtle stroke-1" />
              <p className="text-xs font-bold text-text-main">نوبتی برای نمایش یافت نشد</p>
              <p className="text-[11px] text-text-muted max-w-xs mx-auto leading-relaxed">
                جهت حفظ حریم خصوصی مراجعین، نوبت‌ها فقط پس از تایید شماره موبایل یا جستجوی مستقیم کد رهگیری نمایش داده می‌شوند.
              </p>
              {!clientSession.isLoggedIn && (
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand hover:bg-brand-accent text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>ورود با رمز یکبار مصرف (OTP)</span>
                </button>
              )}
            </div>
          ) : (
            filteredBookings.map((b) => {
              const isCancelled = b.status === 'cancelled';
              const isCancelling = cancellingId === b.id;

              return (
                <div
                  key={b.id || b.trackingCode}
                  className={`p-4 rounded-xl border transition-all ${
                    isCancelled
                      ? 'bg-elevated/40 border-border-subtle opacity-60'
                      : 'bg-elevated/60 border-border-subtle hover:border-border-strong'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-border-subtle mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-text-main">{b.salonName}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-brand-subdued text-brand font-bold">
                        {toPersianDigits(b.trackingCode)}
                      </span>
                      {b.isDemo && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold">
                          دمو
                        </span>
                      )}
                    </div>

                    {isCancelled ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        لغو شده
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        تایید شده
                      </span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="space-y-1.5 text-xs text-text-muted">
                    <div className="flex items-center justify-between">
                      <span className="text-text-subtle text-[11px]">خدمت:</span>
                      <span className="font-semibold text-text-main">{b.serviceName}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-text-subtle text-[11px]">زمان نوبت:</span>
                      <span className="font-semibold text-text-main font-mono">
                        {b.date} - ساعت {toPersianDigits(b.time)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-text-subtle text-[11px]">متخصص:</span>
                      <span>{b.staffName}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-text-subtle text-[11px]">تسویه حضوری:</span>
                      <span className="font-bold text-brand font-mono tabular-nums">{formatCurrency(b.price)}</span>
                    </div>

                    {b.notes && (
                      <div className="pt-1 text-[11px] text-text-subtle italic truncate">
                        یادداشت: {b.notes}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-3 pt-2.5 border-t border-border-subtle flex items-center justify-between gap-2">
                    {onOpenReceipt && (
                      <button
                        onClick={() => onOpenReceipt(b)}
                        className="text-xs text-brand hover:underline cursor-pointer font-bold"
                      >
                        مشاهده رسید نوبت
                      </button>
                    )}

                    {!isCancelled && (
                      <button
                        onClick={() => handleCancelClick(b.id)}
                        disabled={isCancelling}
                        className="text-xs text-rose-600 hover:text-rose-700 dark:hover:text-rose-400 cursor-pointer font-medium flex items-center gap-1"
                      >
                        {isCancelling ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                        <span>لغو نوبت</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <ServerAuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          setAuthModalOpen(false);
          fetchMyServerBookings();
        }}
      />
    </div>
  );
};
