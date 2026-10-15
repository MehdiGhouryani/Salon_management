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
  Check,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { toPersianDigits, formatCurrency, formatNumber } from '../../utils/formatters';

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
      {/* Top Banner: Quick Action for Pending Salon Files */}
      {pendingSalons.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-300/80 dark:border-amber-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-amber-950 dark:text-amber-200">
                {toPersianDigits(pendingSalons.length)} سالن در صف بررسی مدارک و تایید صلاحیت
              </h3>
              <p className="text-[11px] text-amber-800 dark:text-amber-400 mt-0.5">
                سالن‌های «{pendingSalons.map((s) => s.name).join('، ')}» مدارک خود را ارسال کرده‌اند.
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('businesses')}
            className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-xl transition-all shrink-0 shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95"
          >
            <span>بررسی مدارک سالن‌ها</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Primary KPI Grid: High-Contrast, Spacious, Uncluttered Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Salons in Network */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">کل سالن‌های شبکه</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
              {toPersianDigits(salons.length)}
            </span>
            <span className="text-xs text-slate-500 mr-1.5 font-medium">مجموعه</span>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              {toPersianDigits(activeSalons.length)} فعال
            </span>
            <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              {toPersianDigits(pendingSalons.length)} در انتظار
            </span>
            <span className="text-slate-500 font-medium flex items-center gap-1">
              {toPersianDigits(trialSalons.length)} آزمایشی
            </span>
          </div>
        </div>

        {/* KPI 2: Monthly Platform Revenue */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">گردش ماهانه سالن‌ها</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <span className="text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
              {formatCurrency(totalMonthlyRevenue, 'toman')}
            </span>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
              <ArrowUpRight className="w-3.5 h-3.5" /> ۱۸.۴٪ رشد
            </span>
            <span>تسویه حضوری در سالن</span>
          </div>
        </div>

        {/* KPI 3: Total Bookings */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">نوبت‌های رزرو شده</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
              {formatNumber(totalAppointments)}
            </span>
            <span className="text-xs text-slate-500 mr-1.5 font-medium">نوبت</span>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400">
            <span>{toPersianDigits(totalStaff)} متخصص فعال</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">تکمیل: ۹۷٪</span>
          </div>
        </div>

        {/* KPI 4: SMS Dispatch & Health */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">پیامک و دیسپچ</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3 flex items-baseline gap-3">
            <div>
              <span className="text-3xl font-black text-slate-900 dark:text-slate-100 tabular-nums">
                {toPersianDigits(deliveredMessages)}
              </span>
              <span className="text-[11px] text-slate-500 mr-1 font-medium">تحویل شده</span>
            </div>
            {failedMessages > 0 && (
              <span className="text-xs text-rose-600 dark:text-rose-400 font-bold">
                ({toPersianDigits(failedMessages)} باز ارسال)
              </span>
            )}
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400">
            <span>تیکت‌های باز: {toPersianDigits(openTickets)}</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">پایداری: ۹۹.۹٪</span>
          </div>
        </div>
      </div>

      {/* Main Split: Growth Chart & Pending Approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Growth & Revenue Chart */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                روند گردش مالی و حجم نوبت‌دهی سالن‌ها
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                توزیع نوبت‌ها و مبالغ ثبت‌شده در بازه انتخابی
              </p>
            </div>

            {/* Timeframe Selector */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-[#0E1015] border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
              <button
                onClick={() => setTimeRange('7d')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  timeRange === '7d'
                    ? 'bg-white dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 font-bold shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                ۷ روز اخیر
              </button>
              <button
                onClick={() => setTimeRange('30d')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  timeRange === '30d'
                    ? 'bg-white dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 font-bold shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                ۳۰ روزه
              </button>
              <button
                onClick={() => setTimeRange('12m')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  timeRange === '12m'
                    ? 'bg-white dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 font-bold shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                سالانه
              </button>
            </div>
          </div>

          {/* Bar Chart Representation */}
          <div className="py-6">
            <div className="h-52 w-full flex items-end gap-3 sm:gap-6 pt-6 px-2 border-b border-slate-200/80 dark:border-slate-800">
              {chartPoints.map((point, idx) => {
                const heightPercent = Math.max(15, Math.round((point.revenue / maxChartRev) * 100));
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                    {/* Tooltip on Hover */}
                    <div className="absolute -top-12 z-20 hidden group-hover:flex flex-col items-center bg-slate-900 text-white dark:bg-slate-800 px-2.5 py-1 rounded-lg text-[10px] shadow-xl whitespace-nowrap pointer-events-none">
                      <span className="font-bold">{formatCurrency(point.revenue, 'toman')}</span>
                      <span className="text-slate-300">{formatNumber(point.bookings)} نوبت</span>
                    </div>

                    {/* Bar visual */}
                    <div className="w-full max-w-[42px] bg-slate-100 dark:bg-slate-800/70 rounded-t-lg relative overflow-hidden h-44 flex items-end">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full bg-gradient-to-t from-rose-600 to-pink-500 hover:from-rose-700 hover:to-pink-600 rounded-t-lg transition-all duration-300"
                      />
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                      {point.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-600"></span>
                گردش کار سالن‌ها
              </span>
            </div>
            <span className="font-mono text-[11px]">
              تأخیر پاسخگویی سرور: {toPersianDigits(metrics.avgResponseTimeMs)}ms
            </span>
          </div>
        </div>

        {/* Pending Approval Queue */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                سالن‌های در انتظار تایید ({toPersianDigits(pendingSalons.length)})
              </h3>
              <button
                onClick={() => setActiveTab('businesses')}
                className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
              >
                مشاهده همه
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 my-2">
              {pendingSalons.map((salon) => (
                <div key={salon.id} className="py-3 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{salon.name}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {salon.city} · مدیر: {salon.ownerName}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-semibold">
                      در انتظار
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-[#0E1015] p-2.5 rounded-xl leading-relaxed border border-slate-200/50 dark:border-slate-800/50">
                    {salon.notes || 'مدارک صنفی ارسال شده است.'}
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => approveSalon(salon.id)}
                      className="flex-1 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all cursor-pointer text-center shadow-xs flex items-center justify-center gap-1 active:scale-95"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>تایید سالن</span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('businesses');
                        setInspectedSalon(salon);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 rounded-xl transition-colors cursor-pointer"
                    >
                      جزئیات
                    </button>
                  </div>
                </div>
              ))}

              {pendingSalons.length === 0 && (
                <div className="py-8 text-center text-slate-400 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="text-xs font-medium">تمامی سالن‌ها تایید شده‌اند و پرونده معوقه‌ای وجود ندارد.</p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 leading-relaxed">
            با تایید هر سالن، پیامک فعال‌سازی به مدیر سالن ارسال و آدرس اختصاصی وب‌سایت سالن بلافاصله فعال می‌شود.
          </div>
        </div>
      </div>
    </div>
  );
};
