import React, { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { toPersianDigits, formatCurrency, formatNumber } from '../../utils/formatters';
import { EmptyState } from '../ui/EmptyState';

type TimeRange = '7d' | '30d' | '12m';

interface ChartPoint {
  label: string;
  revenue: number;
  bookings: number;
}

// Sample series for the demo only. Production shows a "not connected" state instead of these numbers.
const SAMPLE_SERIES: Record<TimeRange, ChartPoint[]> = {
  '7d': [
    { label: 'شنبه', revenue: 142000000, bookings: 380 },
    { label: 'یکشنبه', revenue: 168000000, bookings: 420 },
    { label: 'دوشنبه', revenue: 155000000, bookings: 395 },
    { label: 'سه‌شنبه', revenue: 189000000, bookings: 490 },
    { label: 'چهارشنبه', revenue: 215000000, bookings: 560 },
    { label: 'پنج‌شنبه', revenue: 278000000, bookings: 710 },
    { label: 'جمعه', revenue: 240000000, bookings: 630 },
  ],
  '30d': [
    { label: 'هفته ۱', revenue: 1100000000, bookings: 2900 },
    { label: 'هفته ۲', revenue: 1350000000, bookings: 3450 },
    { label: 'هفته ۳', revenue: 1520000000, bookings: 3920 },
    { label: 'هفته ۴', revenue: 1840000000, bookings: 4810 },
  ],
  '12m': [
    { label: 'فروردین', revenue: 4200000000, bookings: 11200 },
    { label: 'اردیبهشت', revenue: 4900000000, bookings: 12900 },
    { label: 'خرداد', revenue: 5300000000, bookings: 13800 },
    { label: 'تیر', revenue: 5800000000, bookings: 15100 },
    { label: 'مرداد', revenue: 6400000000, bookings: 16700 },
    { label: 'شهریور', revenue: 7100000000, bookings: 18900 },
    { label: 'مهر', revenue: 7850000000, bookings: 20400 },
    { label: 'آبان', revenue: 8400000000, bookings: 22100 },
  ],
};

const RANGE_LABEL: Record<TimeRange, string> = { '7d': '۷ روز اخیر', '30d': '۳۰ روزه', '12m': 'سالانه' };

const PLOT_HEIGHT = 192; // px
const AXIS_HEIGHT = 24; // px, room for the period labels

/** Short Persian axis label: 0, ۱ میلیارد, ۲۵۰ میلیون. */
const axisLabel = (value: number): string => {
  if (value === 0) return '۰';
  if (value >= 1e9) {
    const n = (value / 1e9).toLocaleString('en-US', { maximumFractionDigits: 1 }).replace('.', '٫');
    return `${toPersianDigits(n)} میلیارد`;
  }
  return `${toPersianDigits(Math.round(value / 1e6).toLocaleString('en-US'))} میلیون`;
};

/** The smallest round number at or above the maximum, so the top tick sits above the tallest bar. */
const roundedAxisMax = (value: number): number => {
  if (value <= 0) return 1;
  const unit = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / unit) * unit;
};

export const OverviewView: React.FC = () => {
  const {
    salons,
    messages,
    tickets,
    metrics,
    approveSalon,
    setActiveTab,
    setInspectedSalon,
    isDemoMode,
  } = useAdmin();

  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  const activeSalons = salons.filter((s) => s.status === 'active');
  const pendingSalons = salons.filter((s) => s.status === 'pending');
  const trialSalons = salons.filter((s) => s.status === 'trial');

  const totalMonthlyRevenue = salons.reduce((acc, s) => acc + s.monthlyRevenue, 0);
  const totalAppointments = salons.reduce((acc, s) => acc + s.totalAppointments, 0);
  const totalStaff = salons.reduce((acc, s) => acc + s.activeStaffCount, 0);

  const deliveredMessages = messages.filter((m) => m.status === 'delivered').length;
  const failedMessages = messages.filter((m) => m.status === 'failed' || m.status === 'retrying').length;
  const openTickets = tickets.filter((t) => t.status === 'open' || t.status === 'in_progress').length;

  const points = SAMPLE_SERIES[timeRange];
  const axisMax = roundedAxisMax(Math.max(...points.map((p) => p.revenue)));
  const ticks = [0, axisMax / 2, axisMax];
  const latest = points[points.length - 1];

  return (
    <div className="space-y-6">
      {/* The one finding of the screen: what is waiting for a decision. */}
      <p className="text-sm text-text-muted">
        {pendingSalons.length > 0
          ? `${toPersianDigits(pendingSalons.length)} سالن منتظر تأیید مدارک است. تا تأیید، پیامک فعال‌سازی ارسال نمی‌شود.`
          : `هیچ سالنی منتظر تأیید نیست. ${toPersianDigits(activeSalons.length)} سالن فعال در شبکه است.`}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* The largest block answers the question: which salons need a decision. */}
        <section
          aria-labelledby="overview-queue-title"
          className="lg:col-span-2 rounded-2xl border border-border-default bg-surface p-5"
        >
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-border-subtle">
            <h2 id="overview-queue-title" className="text-sm font-semibold text-text-main">
              سالن‌های منتظر تصمیم
            </h2>
            <div className="flex items-center gap-3 text-xs text-text-muted tabular-nums">
              <span>{toPersianDigits(pendingSalons.length)} مورد</span>
              {salons.length > 0 && (
                <button
                  onClick={() => setActiveTab('businesses')}
                  className="font-semibold text-text-main hover:underline cursor-pointer"
                >
                  همه‌ی سالن‌ها
                </button>
              )}
            </div>
          </div>

          {pendingSalons.length === 0 ? (
            <EmptyState
              className="mt-4"
              title="هیچ سالنی منتظر تأیید نیست"
              description="وقتی سالنی مدارک خود را بفرستد، اینجا نمایش داده می‌شود."
            />
          ) : (
            <>
              <ul className="divide-y divide-border-subtle">
                {pendingSalons.map((salon) => (
                  <li key={salon.id} className="py-4 flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-text-main">{salon.name}</h3>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-status-warning">
                          در انتظار
                        </span>
                      </div>
                      <p className="text-xs text-text-muted mt-1">
                        {salon.city} · مدیر: {salon.ownerName}
                      </p>
                      <p className="text-xs text-text-secondary mt-2 leading-relaxed">
                        {salon.notes || 'مدارک صنفی ارسال شده است.'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setActiveTab('businesses');
                          setInspectedSalon(salon);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-text-muted hover:text-text-main cursor-pointer transition-colors"
                      >
                        جزئیات
                      </button>
                      <button
                        onClick={() => approveSalon(salon.id)}
                        className="px-3 py-1.5 text-xs font-semibold text-text-main border border-border-strong rounded-lg hover:bg-subsurface cursor-pointer transition-colors"
                      >
                        تأیید سالن
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="pt-3 mt-1 border-t border-border-subtle text-xs text-text-muted leading-relaxed">
                با تأیید هر سالن، پیامک فعال‌سازی به مدیر سالن ارسال و آدرس اختصاصی وب‌سایت سالن فعال می‌شود.
              </p>
            </>
          )}
        </section>

        {/* Numbers of the network: one container split by hairlines, label above value, no icons. */}
        <section
          aria-labelledby="overview-numbers-title"
          className="rounded-2xl border border-border-default bg-surface"
        >
          <h2 id="overview-numbers-title" className="sr-only">
            اعداد شبکه
          </h2>
          <dl className="divide-y divide-border-subtle">
            <div className="px-5 py-4">
              <dt className="text-xs text-text-muted">سالن‌های شبکه</dt>
              <dd className="mt-1 text-2xl font-semibold text-text-main tabular-nums">{toPersianDigits(salons.length)}</dd>
              <dd className="mt-1 text-xs text-text-muted tabular-nums">
                {toPersianDigits(activeSalons.length)} فعال · {toPersianDigits(pendingSalons.length)} در انتظار · {toPersianDigits(trialSalons.length)} آزمایشی
              </dd>
            </div>
            <div className="px-5 py-4">
              <dt className="text-xs text-text-muted">گردش ماهانه‌ی سالن‌ها</dt>
              <dd className="mt-1 text-2xl font-semibold text-text-main tabular-nums whitespace-nowrap">
                {formatCurrency(totalMonthlyRevenue, 'toman')}
              </dd>
            </div>
            <div className="px-5 py-4">
              <dt className="text-xs text-text-muted">نوبت‌های رزرو شده</dt>
              <dd className="mt-1 text-2xl font-semibold text-text-main tabular-nums">{formatNumber(totalAppointments)}</dd>
              <dd className="mt-1 text-xs text-text-muted tabular-nums">{toPersianDigits(totalStaff)} متخصص فعال</dd>
            </div>
            <div className="px-5 py-4">
              <dt className="text-xs text-text-muted">پیامک‌های تحویل‌شده</dt>
              <dd className="mt-1 text-2xl font-semibold text-text-main tabular-nums">{toPersianDigits(deliveredMessages)}</dd>
              <dd className="mt-1 text-xs text-text-muted tabular-nums">
                {toPersianDigits(failedMessages)} باز ارسال · {toPersianDigits(openTickets)} تیکت باز
              </dd>
            </div>
          </dl>
        </section>
      </div>

      {/* Revenue and bookings over time: one hue, real axis, no legend for a single series. */}
      <section aria-labelledby="overview-chart-title" className="rounded-2xl border border-border-default bg-surface p-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-border-subtle">
          <div className="min-w-0">
            <h2 id="overview-chart-title" className="text-sm font-semibold text-text-main">
              گردش مالی و نوبت‌ها
            </h2>
            {isDemoMode ? (
              <p className="text-xs text-text-muted mt-1 tabular-nums">
                آخرین دوره: {formatCurrency(latest.revenue, 'toman')} و {formatNumber(latest.bookings)} نوبت. این اعداد نمونه‌اند و از سرور نیامده‌اند.
              </p>
            ) : (
              <p className="text-xs text-text-muted mt-1">گزارش گردش مالی هنوز به سرور وصل نشده است.</p>
            )}
          </div>

          {isDemoMode && (
            <div role="group" aria-label="بازه‌ی زمانی" className="flex items-center p-1 bg-subsurface border border-border-subtle rounded-xl text-xs shrink-0">
              {(['7d', '30d', '12m'] as TimeRange[]).map((range) => (
                <button
                  key={range}
                  aria-pressed={timeRange === range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 rounded-lg cursor-pointer transition-colors ${
                    timeRange === range ? 'bg-surface text-text-main font-semibold' : 'text-text-muted hover:text-text-main'
                  }`}
                >
                  {RANGE_LABEL[range]}
                </button>
              ))}
            </div>
          )}
        </div>

        {isDemoMode ? (
          <div className="pt-5">
            <div className="relative" style={{ height: PLOT_HEIGHT + AXIS_HEIGHT }}>
              {ticks.map((tick) => (
                <React.Fragment key={tick}>
                  <div
                    className="absolute left-0 right-12 border-t border-dashed border-border-subtle"
                    style={{ bottom: AXIS_HEIGHT + (tick / axisMax) * PLOT_HEIGHT }}
                  />
                  <span
                    className="absolute right-0 -translate-y-1/2 text-[11px] text-text-muted tabular-nums"
                    style={{ bottom: AXIS_HEIGHT + (tick / axisMax) * PLOT_HEIGHT }}
                  >
                    {axisLabel(tick)}
                  </span>
                </React.Fragment>
              ))}

              <div
                className="absolute left-0 right-12 flex items-end gap-3 sm:gap-5"
                style={{ bottom: AXIS_HEIGHT, height: PLOT_HEIGHT }}
              >
                {points.map((point) => (
                  <div key={point.label} className="flex-1 h-full flex items-end justify-center">
                    <div
                      className="w-full max-w-[40px] bg-brand rounded-t-md transition-[height] duration-300"
                      style={{ height: `${Math.max(3, (point.revenue / axisMax) * 100)}%` }}
                      title={`${point.label}: ${formatCurrency(point.revenue, 'toman')} · ${formatNumber(point.bookings)} نوبت`}
                    />
                  </div>
                ))}
              </div>

              <div className="absolute left-0 right-12 bottom-0 flex gap-3 sm:gap-5">
                {points.map((point) => (
                  <span key={point.label} className="flex-1 text-center text-[11px] text-text-muted truncate">
                    {point.label}
                  </span>
                ))}
              </div>
            </div>
            <p className="mt-4 text-xs text-text-muted tabular-nums">
              تأخیر پاسخ سرور: {toPersianDigits(metrics.avgResponseTimeMs)} میلی‌ثانیه
            </p>
          </div>
        ) : (
          <EmptyState
            className="mt-5"
            title="نمودار گردش مالی هنوز وصل نشده است"
            description="پس از اتصال گزارش‌های سرور، روند گردش و نوبت‌ها اینجا نمایش داده می‌شود."
          />
        )}
      </section>
    </div>
  );
};
