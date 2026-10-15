import React from 'react';
import {
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Phone,
  User,
  Scissors,
  MessageSquare,
  X,
  CreditCard,
  Building,
} from 'lucide-react';
import { CustomerBooking } from '../../types/admin';
import { toPersianDigits, formatCurrency } from '../../utils/formatters';

interface BookingReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: CustomerBooking | null;
  salonPhone?: string;
  salonAddress?: string;
}

export const BookingReceiptModal: React.FC<BookingReceiptModalProps> = ({
  isOpen,
  onClose,
  booking,
  salonPhone = '02122409876',
  salonAddress = 'خیابان آصف، مجتمع رویال، واحد ۳۰۲',
}) => {
  if (!isOpen || !booking) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200" dir="rtl">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#111B2E] border border-slate-200 dark:border-[#344258] rounded-2xl shadow-2xl overflow-hidden text-slate-900 dark:text-[#E7ECF5] flex flex-col max-h-[92vh] transition-colors">
        {/* Header with success badge */}
        <div className="p-5 border-b border-slate-100 dark:border-[#344258] flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                نوبت با موفقیت ثبت شد
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#9AAAC2] mt-0.5">
                زمان نوبت: <span className="font-bold text-rose-600 dark:text-rose-400">{booking.date} · ساعت {booking.time}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#18243A] rounded-lg transition-colors cursor-pointer"
            aria-label="بستن"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* In-Person Settlement Banner */}
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl flex items-start gap-3 text-emerald-800 dark:text-emerald-300">
            <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">تسویه هزینه: حضوری در سالن</span>
              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
                مبلغ نوبت هنگام مراجعه با دستگاه کارتخوان یا نقد پرداخت می‌شود.
              </p>
            </div>
          </div>

          {/* Core Booking Details Grid */}
          <div className="bg-stone-50 dark:bg-[#18243A] border border-stone-200 dark:border-[#344258] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-[#344258]">
              <span className="text-zinc-500 dark:text-[#9AAAC2] flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /> سالن:
              </span>
              <span className="font-bold text-zinc-900 dark:text-[#E7ECF5]">{booking.salonName}</span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-[#344258]">
              <span className="text-zinc-500 dark:text-[#9AAAC2] flex items-center gap-1.5">
                <Scissors className="w-3.5 h-3.5 text-zinc-500" /> خدمت:
              </span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">{booking.serviceName}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 pb-2 border-b border-stone-200 dark:border-[#344258]">
              <div className="flex items-center gap-1.5 text-zinc-700 dark:text-[#9AAAC2]">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-zinc-500 dark:text-[#9AAAC2]">تاریخ:</span>
                <span className="font-semibold">{booking.date}</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-700 dark:text-[#9AAAC2]">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-zinc-500 dark:text-[#9AAAC2]">ساعت:</span>
                <span className="font-semibold font-mono">{toPersianDigits(booking.time)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pb-2 border-b border-stone-200 dark:border-[#344258]">
              <div className="flex items-center gap-1.5 text-zinc-700 dark:text-[#9AAAC2]">
                <User className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-zinc-500 dark:text-[#9AAAC2]">متخصص:</span>
                <span className="font-semibold">{booking.staffName}</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-700 dark:text-[#9AAAC2]">
                <Phone className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-zinc-500 dark:text-[#9AAAC2]">تلفن شما:</span>
                <span className="font-mono font-semibold">{toPersianDigits(booking.clientPhone)}</span>
              </div>
            </div>

            {/* Address */}
            <div className="pt-1 flex items-start gap-1.5 text-zinc-600 dark:text-[#9AAAC2]">
              <MapPin className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <span>آدرس: {salonAddress}</span>
              </div>
            </div>

            {/* Final Amount */}
            <div className="pt-2 flex items-center justify-between bg-white dark:bg-[#18243A] p-3 rounded-xl border border-stone-200 dark:border-[#344258]">
              <span className="text-zinc-600 dark:text-[#9AAAC2] font-medium">مبلغ قابل پرداخت در سالن:</span>
              <span className="text-base font-extrabold text-rose-600 dark:text-rose-400 font-mono tabular-nums">
                {formatCurrency(booking.price)}
              </span>
            </div>
          </div>

          {/* SMS Notification Preview */}
          <div className="bg-stone-50 dark:bg-[#18243A] border border-stone-200 dark:border-[#344258] rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-[#9AAAC2] border-b border-stone-200 dark:border-[#344258]/80 pb-1.5">
              <span className="flex items-center gap-1.5 font-semibold text-zinc-700 dark:text-[#9AAAC2]">
                <MessageSquare className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /> پیامک ارسال شده:
              </span>
              <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                تایید شده
              </span>
            </div>
            <div className="p-2.5 bg-white dark:bg-[#18243A] rounded-xl text-zinc-700 dark:text-[#9AAAC2] text-[11px] leading-relaxed font-sans border border-stone-200 dark:border-[#344258]">
              «{booking.clientName} عزیز، نوبت شما در {booking.salonName} برای {booking.serviceName} ثبت شد.
              زمان: {booking.date} ساعت {toPersianDigits(booking.time)} · متخصص: {booking.staffName} · تسویه حضوری: {formatCurrency(booking.price)}»
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-stone-50 dark:bg-[#18243A] border-t border-stone-100 dark:border-[#344258] flex items-center justify-between gap-3">
          <a
            href={`tel:${salonPhone}`}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-zinc-700 dark:text-[#9AAAC2] bg-white dark:bg-[#18243A] hover:bg-stone-100 dark:hover:bg-[#18243A] rounded-xl border border-stone-200 dark:border-[#344258] transition-colors"
          >
            <Phone className="w-3.5 h-3.5 text-zinc-500" />
            تماس با سالن
          </a>

          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs cursor-pointer"
          >
            تایید و بستن
          </button>
        </div>
      </div>
    </div>
  );
};
