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
  ChevronLeft,
  DollarSign,
  Activity,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { toPersianDigits, formatCurrency, formatNumber, getStatusBadge } from '../../utils/formatters';

export const OverviewView: React.FC = () => {
  const {
    salons,
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
      {/* Top Banner: Quick Action */}
      {pendingSalons.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                {toPersianDigits(pendingSalons.length)} سالن در انتظار بررسی و تایید مدارک
              </h3>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                سالن‌های «{pendingSalons.map((s) => s.name).join('، ')}» مدارک خود را ارسال کرده‌اند.
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('businesses')}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-xl transition-colors shrink-0 shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <span>بررسی پرونده‌ها</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#181B24] border border-stone-200/90 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">کل سالن‌های شبکه</span>
            <Store className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="my-3">
            <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 tabular-nums">
              {toPersianDigits(salons.length)}
            </span>
            <span className="text-xs text-zinc-500 mr-1.5">مجموعه</span>
          </div>
          <div className="flex items-center justify-between pt-2.5 border-t border-stone-100 dark:border-zinc-800 text-[11px] text-zinc-500">
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              {toPersianDigits(activeSalons.length)} فعال
            </span>
            <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              {toPersianDigits(pendingSalons.length)} در انتظار
            </span>
            <span className="text-zinc-500 flex items-center gap-1">
              {toPersianDigits(trialSalons.length)} آزمایشی
            </span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#181B24] border border-stone-200/90 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">گردش ماهانه سالن‌ها</span>
            <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="my-3">
            <span className="text-2xl font-bold tracking-tight text-emerald-700 dark:text-emerald-400 tabular-nums">
              {formatCurrency(totalMonthlyRevenue, 'toman')}
            </span>
          </div>
          <div className="flex items-center justify-between pt-2.5 border-t border-stone-100 dark:border-zinc-800 text-[11px] text-zinc-500">
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
              <ArrowUpRight className="w-3.5 h-3.5" /> ۱۸.۴٪ رشد
            </span>
            <span>تسویه حضوری در سالن</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#181B24] border border-stone-200/90 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">نوبت‌های رزرو شده</span>
            <TrendingUp className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="my-3">
            <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 tabular-nums">
              {formatNumber(totalAppointments)}
            </span>
            <span className="text-xs text-zinc-500 mr-1.5">نوبت</span>
          </div>
          <div className="flex items-center justify-between pt-2.5 border-t border-stone-100 dark:border-zinc-800 text-[11px] text-zinc-500">
            <span>{toPersianDigits(totalStaff)} متخصص فعال</span>
            <span className="text-emerald-600 dark:text-emerald-400">تکمیل: ۹۷٪</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#181B24] border border-stone-200/90 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">پیامک و دیسپچ</span>
            <MessageSquare className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="my-3 flex items-baseline gap-3">
            <div>
              <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                {toPersianDigits(deliveredMessages)}
              </span>
              <span className="text-[11px] text-zinc-500 mr-1">تحویل شده</span>
            </div>
            {failedMessages > 0 && (
              <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                ({toPersianDigits(failedMessages)} باز ارسال)
              </span>
            )}
          </div>
          <div className="flex items-center justify-between pt-2.5 border-t border-stone-100 dark:border-zinc-800 text-[11px] text-zinc-500">
            <span>تیکت‌های باز: {toPersianDigits(openTickets)}</span>
            <span className="text-emerald-600 dark:text-emerald-400">پایداری: ۹۹.۹٪</span>
          </div>
        </div>
      </div>

      {/* Main Split: Growth Chart & Pending Approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Growth & Revenue Chart */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-[#181B24] border border-stone-200/90 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-stone-100 dark:border-zinc-800">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                روند گردش کار و حجم نوبت‌دهی سالن‌ها
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                توزیع نوبت‌ها و مبالغ ثبت‌شده در بازه انتخابی
              </p>
            </div>

            {/* Timeframe Selector */}
            <div className="flex items-center p-1 bg-stone-100 dark:bg-[#0E1015] border border-stone-200 dark:border-zinc-800 rounded-xl text-xs">
              <button
                onClick={() => setTimeRange('7d')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  timeRange === '7d' ? 'bg-white dark:bg-[#181B24] text-zinc-900 dark:text-zinc-100 font-bold shadow-xs' : 'text-zinc-500 dark:text-zinc-400'
                }`}
              >
                ۷ روز اخیر
              </button>
              <button
                onClick={() => setTimeRange('30d')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  timeRange === '30d' ? 'bg-white dark:bg-[#181B24] text-zinc-900 dark:text-zinc-100 font-bold shadow-xs' : 'text-zinc-500 dark:text-zinc-400'
                }`}
              >
                ۳۰ روزه
              </button>
              <button
                onClick={() => setTimeRange('12m')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  timeRange === '12m' ? 'bg-white dark:bg-[#181B24] text-zinc-900 dark:text-zinc-100 font-bold shadow-xs' : 'text-zinc-500 dark:text-zinc-400'
                }`}
              >
                سالانه
              </button>
            </div>
          </div>

          {/* Bar Chart Representation */}
          <div className="py-6">
            <div className="h-52 w-full flex items-end gap-3 sm:gap-6 pt-6 px-2 border-b border-stone-100 dark:border-zinc-800">
              {chartPoints.map((point, idx) => {
                const heightPercent = Math.max(15, Math.round((point.revenue / maxChartRev) * 100));
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                    {/* Tooltip on Hover */}
                    <div className="absolute -top-12 z-20 hidden group-hover:flex flex-col items-center bg-zinc-900 dark:bg-zinc-800 text-white px-2 py-1 rounded-md text-[10px] shadow-xl whitespace-nowrap pointer-events-none">
                      <span className="font-bold">{formatCurrency(point.revenue, 'toman')}</span>
                      <span className="text-zinc-300">{formatNumber(point.bookings)} نوبت</span>
                    </div>

                    {/* Bar visual */}
                    <div className="w-full max-w-[42px] bg-stone-100 dark:bg-zinc-800 rounded-t-lg relative overflow-hidden h-44 flex items-end">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full bg-gradient-to-t from-rose-600 to-pink-500 hover:from-rose-700 hover:to-pink-600 rounded-t-lg transition-all duration-300"
                      ></div>
                    </div>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium truncate">
                      {point.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs text-zinc-500 pt-2">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-600"></span>
                گردش کار سالن‌ها
              </span>
            </div>
            <span className="font-mono text-[11px]">
              تأخیر پاسخگویی: {toPersianDigits(metrics.avgResponseTimeMs)}ms
            </span>
          </div>
        </div>

        {/* Pending Approval Queue */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#181B24] border border-stone-200/90 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                سالن‌های در انتظار تایید ({toPersianDigits(pendingSalons.length)})
              </h3>
              <button
                onClick={() => setActiveTab('businesses')}
                className="text-xs text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
              >
                مشاهده همه
              </button>
            </div>

            <div className="divide-y divide-stone-100 dark:divide-zinc-800 my-2">
              {pendingSalons.map((salon) => (
                <div key={salon.id} className="py-3 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{salon.name}</h4>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        {salon.city} · مدیر: {salon.ownerName}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-medium">
                      در انتظار
                    </span>
                  </div>

                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 bg-stone-50 dark:bg-[#0E1015] p-2 rounded-xl leading-relaxed">
                    {salon.notes || 'مدارک صنفی ارسال شده است.'}
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => approveSalon(salon.id)}
                      className="flex-1 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors cursor-pointer text-center"
                    >
                      تایید سالن
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('businesses');
                        setInspectedSalon(salon);
                      }}
                      className="px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 bg-stone-100 dark:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
                    >
                      جزئیات
                    </button>
                  </div>
                </div>
              ))}

              {pendingSalons.length === 0 && (
                <div className="py-8 text-center text-zinc-400 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="text-xs">تمامی سالن‌ها تایید شده‌اند.</p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100 dark:border-zinc-800 text-[11px] text-zinc-400">
            با تایید هر سالن، پیامک فعال‌سازی به مدیر سالن ارسال و آدرس وب‌سایت فعال می‌شود.
          </div>
        </div>
      </div>
    </div>
  );
};
