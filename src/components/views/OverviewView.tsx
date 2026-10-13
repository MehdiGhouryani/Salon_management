import React, { useState } from 'react';
import {
  Store,
  Users,
  CreditCard,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  DollarSign,
  Activity,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { toPersianDigits, formatCurrency, formatNumber, getStatusBadge } from '../../utils/formatters';

export const OverviewView: React.FC = () => {
  const {
    salons,
    users,
    messages,
    tickets,
    transactions,
    metrics,
    approveSalon,
    setActiveTab,
    setInspectedSalon,
  } = useAdmin();

  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '12m'>('30d');

  // Computed metrics
  const activeSalons = salons.filter((s) => s.status === 'active');
  const pendingSalons = salons.filter((s) => s.status === 'pending');
  const suspendedSalons = salons.filter((s) => s.status === 'suspended');
  const trialSalons = salons.filter((s) => s.status === 'trial');

  const totalMonthlyRevenue = salons.reduce((acc, s) => acc + s.monthlyRevenue, 0);
  const totalAppointments = salons.reduce((acc, s) => acc + s.totalAppointments, 0);
  const totalStaff = salons.reduce((acc, s) => acc + s.activeStaffCount, 0);

  const deliveredMessages = messages.filter((m) => m.status === 'delivered').length;
  const failedMessages = messages.filter((m) => m.status === 'failed' || m.status === 'retrying').length;
  const openTickets = tickets.filter((t) => t.status === 'open' || t.status === 'in_progress').length;

  // Chart data simulation
  const chartPoints =
    timeRange === '7d'
      ? [
          { label: 'شنبه', revenue: 142000000, bookings: 380 },
          { label: 'یکشنبه', revenue: 168000000, bookings: 420 },
          { label: 'دوشنبه', revenue: 155000000, bookings: 395 },
          { label: 'سه‌شنبه', revenue: 189000000, bookings: 490 },
          { label: 'چهارشنبه', revenue: 215000000, bookings: 560 },
          { label: 'پنج‌شنبه', revenue: 278000000, bookings: 710 },
          { label: 'جمعه', revenue: 240000000, bookings: 630 },
        ]
      : timeRange === '30d'
      ? [
          { label: 'هفته ۱', revenue: 1100000000, bookings: 2900 },
          { label: 'هفته ۲', revenue: 1350000000, bookings: 3450 },
          { label: 'هفته ۳', revenue: 1520000000, bookings: 3920 },
          { label: 'هفته ۴', revenue: 1840000000, bookings: 4810 },
        ]
      : [
          { label: 'فروردین', revenue: 4200000000, bookings: 11200 },
          { label: 'اردیبهشت', revenue: 4900000000, bookings: 12900 },
          { label: 'خرداد', revenue: 5300000000, bookings: 13800 },
          { label: 'تیر', revenue: 5800000000, bookings: 15100 },
          { label: 'مرداد', revenue: 6400000000, bookings: 16700 },
          { label: 'شهریور', revenue: 7100000000, bookings: 18900 },
          { label: 'مهر', revenue: 7850000000, bookings: 20400 },
          { label: 'آبان', revenue: 8400000000, bookings: 22100 },
        ];

  const maxChartRev = Math.max(...chartPoints.map((p) => p.revenue));

  return (
    <div className="space-y-6">
      {/* Top Banner: Quick System Health & Urgent Actions */}
      {pendingSalons.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-amber-200">
                اقدام فوری: {toPersianDigits(pendingSalons.length)} سالن جدید در انتظار احراز هویت و تایید رسمی
              </h3>
              <p className="text-[11px] text-amber-300/80 mt-0.5">
                سالن‌های «{pendingSalons.map((s) => s.name).join('، ')}» مدارک خود را ارسال کرده‌اند و منتظر شروع نوبت‌دهی هستند.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('businesses')}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors shrink-0 shadow cursor-pointer flex items-center gap-1.5"
          >
            <span>بررسی و تایید فوری</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Primary KPI Grid (High density, zero-pill, tabular numbers) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Salons */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold text-slate-300">کل سالن‌های شبکه</span>
            <Store className="w-4 h-4 text-rose-400" />
          </div>
          <div className="my-3">
            <span className="text-2xl font-bold tracking-tight text-white tabular-nums">
              {toPersianDigits(salons.length)}
            </span>
            <span className="text-xs text-slate-400 mr-1.5">مجموعه سالن</span>
          </div>
          <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400">
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              {toPersianDigits(activeSalons.length)} فعال
            </span>
            <span className="text-amber-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              {toPersianDigits(pendingSalons.length)} منتظر تایید
            </span>
            <span className="text-indigo-400 flex items-center gap-1">
              {toPersianDigits(trialSalons.length)} آزمایشی
            </span>
          </div>
        </div>

        {/* KPI 2: Monthly Salon Workload Volume (In-Person Settlement) */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold text-slate-300">گردش کار سالن‌ها (تسویه حضوری)</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="my-3">
            <span className="text-2xl font-bold tracking-tight text-emerald-300 tabular-nums">
              {formatCurrency(totalMonthlyRevenue, 'toman')}
            </span>
          </div>
          <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400">
            <span className="text-emerald-400 flex items-center gap-0.5">
              <ArrowUpRight className="w-3.5 h-3.5" /> ۱۸.۴٪ رشد نسبت به ماه قبل
            </span>
            <span className="text-slate-400 font-medium">تسویه نوبت‌ها: حضوری در سالن</span>
          </div>
        </div>

        {/* KPI 3: Total Bookings */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold text-slate-300">نوبت‌های رزرو شده</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="my-3">
            <span className="text-2xl font-bold tracking-tight text-white tabular-nums">
              {formatNumber(totalAppointments)}
            </span>
            <span className="text-xs text-slate-400 mr-1.5">نوبت موفق</span>
          </div>
          <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400">
            <span>پرسنل ثبت‌شده: {toPersianDigits(totalStaff)} آرایشگر</span>
            <span className="text-emerald-400">نرخ تکمیل: ۹۷٪</span>
          </div>
        </div>

        {/* KPI 4: SMS Dispatch & Support */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold text-slate-300">وضعیت پیامک و پشتیبانی</span>
            <MessageSquare className="w-4 h-4 text-sky-400" />
          </div>
          <div className="my-3 flex items-baseline gap-3">
            <div>
              <span className="text-2xl font-bold text-white tabular-nums">
                {toPersianDigits(deliveredMessages)}
              </span>
              <span className="text-[11px] text-slate-400 mr-1">پیامک موفق</span>
            </div>
            {failedMessages > 0 && (
              <span className="text-xs text-rose-400 font-semibold">
                ({toPersianDigits(failedMessages)} نیازمند تلاش مجدد)
              </span>
            )}
          </div>
          <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400">
            <span className="text-sky-400">تیکت‌های فعال: {toPersianDigits(openTickets)} مورد</span>
            <span className="text-emerald-400">پایداری درگاه: ۹۹.۹٪</span>
          </div>
        </div>
      </div>

      {/* Main Split: Revenue / Growth Chart & Fast Approval Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Growth & Revenue Chart (2 Columns) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-rose-400" />
                روند گردش مالی و حجم نوبت‌دهی سالن‌ها
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                تحلیل آماری تراکنش‌ها و رزروهای مشتریان در شبکه سامانه
              </p>
            </div>

            {/* Timeframe Selector (Interactive Buttons) */}
            <div className="flex items-center p-1 bg-slate-800/80 border border-slate-700/60 rounded-xl text-xs">
              <button
                onClick={() => setTimeRange('7d')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  timeRange === '7d' ? 'bg-slate-700 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                ۷ روز اخیر
              </button>
              <button
                onClick={() => setTimeRange('30d')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  timeRange === '30d' ? 'bg-slate-700 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                ۳۰ روزه (هفتگی)
              </button>
              <button
                onClick={() => setTimeRange('12m')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  timeRange === '12m' ? 'bg-slate-700 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                سال جاری
              </button>
            </div>
          </div>

          {/* SVG / Bar Chart Representation */}
          <div className="py-6">
            <div className="h-52 w-full flex items-end gap-3 sm:gap-6 pt-6 px-2 border-b border-slate-800">
              {chartPoints.map((point, idx) => {
                const heightPercent = Math.max(15, Math.round((point.revenue / maxChartRev) * 100));
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                    {/* Tooltip on Hover */}
                    <div className="absolute -top-12 z-20 hidden group-hover:flex flex-col items-center bg-slate-800 border border-slate-700 px-2 py-1 rounded-md text-[10px] text-white shadow-xl whitespace-nowrap pointer-events-none">
                      <span className="font-bold text-emerald-400">{formatCurrency(point.revenue, 'toman')}</span>
                      <span className="text-slate-300">{formatNumber(point.bookings)} نوبت</span>
                    </div>

                    {/* Bar visual */}
                    <div className="w-full max-w-[42px] bg-slate-800 rounded-t-lg relative overflow-hidden h-44 flex items-end">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full bg-gradient-to-t from-rose-600 via-rose-500 to-amber-400 rounded-t-lg transition-all duration-500 group-hover:brightness-110"
                      ></div>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium truncate">
                      {point.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-2">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span>
                گردش مالی سالن‌ها
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-slate-700"></span>
                سقف ظرفیت سیستم
              </span>
            </div>
            <span className="text-slate-400 font-mono text-[11px]">
              پایگاه داده بهینه‌سازی شده · تأخیر میانگین: {toPersianDigits(metrics.avgResponseTimeMs)}ms
            </span>
          </div>
        </div>

        {/* Quick Pending Approval & Alert Queue (1 Column) */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                سالن‌های در انتظار تایید ({toPersianDigits(pendingSalons.length)})
              </h3>
              <button
                onClick={() => setActiveTab('businesses')}
                className="text-xs text-rose-400 hover:text-rose-300 transition-colors"
              >
                مشاهده همه
              </button>
            </div>

            <div className="divide-y divide-slate-800/80 my-2">
              {pendingSalons.map((salon) => (
                <div key={salon.id} className="py-3 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">{salon.name}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {salon.city} · مدیر: {salon.ownerName}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 font-medium">
                      در انتظار بررسی
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 bg-slate-800/50 p-2 rounded-lg leading-relaxed">
                    {salon.notes || 'مدارک صنفی ارسال شده است.'}
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => approveSalon(salon.id)}
                      className="flex-1 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors cursor-pointer text-center"
                    >
                      تایید و اعطای نشان رسمی
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('businesses');
                        setInspectedSalon(salon);
                      }}
                      className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                    >
                      بررسی کامل
                    </button>
                  </div>
                </div>
              ))}

              {pendingSalons.length === 0 && (
                <div className="py-8 text-center text-slate-400 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="text-xs">تمامی سالن‌ها تایید شده و صف خالی است.</p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400">
            با تایید سالن، پیامک فعال‌سازی به مدیر سالن مخابره و لینک نوبت‌دهی آنلاین اختصاصی فعال می‌شود.
          </div>
        </div>
      </div>

      {/* Recent High-Volume Salons & Financial Transactions Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Salons Summary */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Store className="w-4 h-4 text-rose-400" />
              برترین سالن‌های شبکه از لحاظ نوبت‌دهی و گردش
            </h3>
            <button
              onClick={() => setActiveTab('businesses')}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              مشاهده فهرست کامل ({toPersianDigits(salons.length)})
            </button>
          </div>

          <div className="divide-y divide-slate-800/80 mt-2">
            {salons.slice(0, 4).map((s) => {
              const badge = getStatusBadge(s.status);
              return (
                <div key={s.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-rose-400 shrink-0">
                      {s.name.slice(0, 1)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-100 truncate">{s.name}</span>
                        {s.verifiedBadge && (
                          <span className="text-[10px] text-sky-400 font-semibold" title="دارای نشان تاییدیه ادمین">
                            ✓ رسمی
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {s.city} · {s.ownerName} · {toPersianDigits(s.activeStaffCount)} پرسنل
                      </p>
                    </div>
                  </div>

                  <div className="text-left shrink-0">
                    <p className="font-bold text-emerald-400 tabular-nums">
                      {formatCurrency(s.monthlyRevenue, 'toman')}
                    </p>
                    <span className={`inline-block mt-0.5 px-2 py-0.5 text-[10px] rounded-md font-medium border ${badge.bg} ${badge.text} ${badge.border}`}>
                      {badge.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Transactions Ledger */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              تراکنش‌های اخیر درگاه بانکی (حق اشتراک B2B سالن‌ها)
            </h3>
            <button
              onClick={() => setActiveTab('subscriptions')}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              مدیریت مالی و پلن‌ها
            </button>
          </div>

          <div className="divide-y divide-slate-800/80 mt-2">
            {transactions.slice(0, 4).map((tx) => (
              <div key={tx.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-semibold text-slate-100">{tx.salonName}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    درگاه: {tx.gateway} · کد رهگیری: <span className="font-mono text-slate-300">{tx.trackingCode}</span>
                  </p>
                </div>

                <div className="text-left">
                  <p className="font-bold text-slate-100 tabular-nums">
                    {formatCurrency(tx.amount, 'toman')}
                  </p>
                  <span
                    className={`inline-block mt-0.5 px-2 py-0.5 text-[10px] rounded font-medium ${
                      tx.status === 'successful'
                        ? 'text-emerald-400 bg-emerald-500/10'
                        : 'text-rose-400 bg-rose-500/10'
                    }`}
                  >
                    {tx.status === 'successful' ? 'موفق' : 'ناموفق'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
