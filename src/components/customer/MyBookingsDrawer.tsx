import React, { useState } from 'react';
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
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { CustomerBooking } from '../../types/admin';
import { toPersianDigits, formatCurrency } from '../../utils/formatters';

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
  const { customerBookings, cancelCustomerBooking } = useAdmin();
  const [filterPhone, setFilterPhone] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredBookings = customerBookings.filter((b) => {
    if (!filterPhone.trim()) return true;
    return (
      b.clientPhone.includes(filterPhone.trim()) ||
      b.trackingCode.toLowerCase().includes(filterPhone.toLowerCase())
    );
  });

  const handleCancelClick = (id: string) => {
    cancelCustomerBooking(id);
    setCancellingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200" dir="rtl">
      <div className="w-full max-w-md h-full bg-white dark:bg-[#181B24] border-r border-stone-200 dark:border-zinc-800 shadow-2xl flex flex-col text-zinc-900 dark:text-zinc-100 animate-in slide-in-from-left duration-300 transition-colors">
        {/* Drawer Header */}
        <div className="p-5 border-b border-stone-100 dark:border-zinc-800 bg-stone-50/70 dark:bg-[#10121A]/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">نوبت‌های من</h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">پیگیری و وضعیت نوبت‌ها</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
            aria-label="بستن"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 bg-stone-50/40 dark:bg-[#10121A]/30 border-b border-stone-100 dark:border-zinc-800">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={filterPhone}
              onChange={(e) => setFilterPhone(e.target.value)}
              placeholder="جستجو با شماره موبایل یا کد پیگیری..."
              className="w-full pr-9 pl-3 py-2 text-xs bg-white dark:bg-[#0E1015] border border-stone-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-rose-500 transition-colors font-mono"
            />
          </div>
        </div>

        {/* Bookings List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredBookings.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 space-y-2">
              <Calendar className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-600 stroke-1" />
              <p className="text-xs">هیچ نوبتی ثبت نشده است</p>
            </div>
          ) : (
            filteredBookings.map((b) => {
              const isCancelled = b.status === 'cancelled';
              return (
                <div
                  key={b.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isCancelled
                      ? 'bg-stone-50/60 dark:bg-[#10121A]/40 border-stone-200 dark:border-zinc-800 opacity-60'
                      : 'bg-stone-50 dark:bg-[#10121A] border-stone-200 dark:border-zinc-800 hover:border-stone-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-zinc-800 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{b.salonName}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold">
                        {toPersianDigits(b.trackingCode)}
                      </span>
                    </div>

                    {isCancelled ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold">
                        لغو شده
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold">
                        تایید شده
                      </span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-300">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 text-[11px]">خدمت:</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">{b.serviceName}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 text-[11px]">زمان:</span>
                      <span className="font-semibold">
                        {b.date} - ساعت {toPersianDigits(b.time)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 text-[11px]">متخصص:</span>
                      <span>{b.staffName}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-zinc-400 text-[11px]">تسویه حضوری:</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400 font-mono tabular-nums">{formatCurrency(b.price)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-3 pt-2.5 border-t border-stone-200 dark:border-zinc-800 flex items-center justify-between gap-2">
                    {onOpenReceipt && (
                      <button
                        onClick={() => onOpenReceipt(b)}
                        className="px-3 py-1.5 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 bg-white dark:bg-[#181B24] rounded-lg border border-stone-200 dark:border-zinc-700 transition-colors cursor-pointer"
                      >
                        رسید و پیامک
                      </button>
                    )}

                    {!isCancelled && (
                      <div>
                        {cancellingId === b.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleCancelClick(b.id)}
                              className="px-2.5 py-1 text-[10px] font-bold text-white bg-rose-600 rounded-lg cursor-pointer"
                            >
                              بله، لغو شود
                            </button>
                            <button
                              onClick={() => setCancellingId(null)}
                              className="px-2 py-1 text-[10px] text-zinc-500 bg-stone-200 dark:bg-zinc-800 rounded-lg cursor-pointer"
                            >
                              انصراف
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setCancellingId(b.id)}
                            className="px-2.5 py-1.5 text-[11px] text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                          >
                            لغو نوبت
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Notice */}
        <div className="p-4 bg-stone-50 dark:bg-[#10121A] border-t border-stone-100 dark:border-zinc-800 text-[11px] text-zinc-500 text-center">
          تسویه هزینه خدمات به صورت حضوری در سالن انجام می‌شود.
        </div>
      </div>
    </div>
  );
};
