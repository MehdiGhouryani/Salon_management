import React, { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { CustomerBooking } from '../../types/admin';
import { toPersianDigits } from '../../utils/formatters';
import { useDebounce } from '../../hooks/useDebounce';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { PageTitle } from './PageTitle';
import { isTodayLabel, money, shortDate, timeToMinutes, todayLabelFa } from './format';

type Filter = 'all' | 'pending' | 'done' | 'cancelled';

const fa = (n: number) => toPersianDigits(String(n));
const sum = (list: CustomerBooking[]) => list.reduce((s, b) => s + (b.price || 0), 0);

interface TodayTabProps {
  bookings: CustomerBooking[];
  onOpenBooking: (b: CustomerBooking) => void;
  onSettle: (b: CustomerBooking) => void;
  onNewBooking: () => void;
  /** demo only: jump to the customer site to place an online booking */
  onSimulateOnline?: () => void;
}

const Figure: React.FC<{
  label: string;
  value: string;
  unit?: string;
  lead?: boolean;
  className?: string;
}> = ({ label, value, unit, lead, className = '' }) => (
  <div className={`p-4 sm:p-5 ${className}`}>
    <div className="text-[13px] text-[var(--text-secondary)]">{label}</div>
    <div className="mt-1.5 flex items-baseline gap-1.5">
      <span
        className={`leading-none ${
          lead ? 'text-[32px] font-bold' : 'text-2xl font-semibold'
        } text-[var(--text-primary)]`}
      >
        {value}
      </span>
      {unit && <span className="text-[13px] text-[var(--text-muted)]">{unit}</span>}
    </div>
  </div>
);

const Row: React.FC<{
  b: CustomerBooking;
  showDay?: boolean;
  onOpen: (b: CustomerBooking) => void;
  onSettle: (b: CustomerBooking) => void;
}> = ({ b, showDay, onOpen, onSettle }) => {
  const cancelled = b.status === 'cancelled';
  return (
    <li className="flex items-stretch border-b border-[var(--border-subtle)] last:border-b-0">
      <button
        type="button"
        onClick={() => onOpen(b)}
        className="flex-1 min-w-0 flex items-center gap-3 sm:gap-4 px-4 py-3.5 text-start hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
      >
        <span
          className={`w-12 sm:w-16 shrink-0 text-sm font-semibold tabular-nums ${
            cancelled ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)]'
          }`}
        >
          {showDay && <span className="block text-xs font-normal text-[var(--text-muted)]">{shortDate(b.date)}</span>}
          {b.time}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={`block text-sm font-semibold truncate ${
              cancelled ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)]'
            }`}
          >
            {b.clientName}
          </span>
          <span className="block text-[13px] text-[var(--text-secondary)] truncate mt-0.5">
            {b.serviceName} · {b.staffName}
          </span>
        </span>
        <span className="hidden sm:flex shrink-0 items-baseline gap-1.5">
          <span className="w-24 text-right text-sm tabular-nums text-[var(--text-primary)]">
            {money(b.price)}
          </span>
        </span>
      </button>
      <div className="shrink-0 w-[6.5rem] sm:w-28 flex flex-col sm:flex-row items-end sm:items-center justify-center sm:justify-end gap-1.5 pe-3 sm:pe-4">
        <span className="sm:hidden text-[13px] tabular-nums text-[var(--text-primary)]">
          {money(b.price)}
          <span className="text-[11px] text-[var(--text-muted)] ms-1">تومان</span>
        </span>
        {b.status === 'confirmed' && (
          <Button variant="outline" size="sm" onClick={() => onSettle(b)}>
            تسویه
          </Button>
        )}
        {b.status === 'completed' && (
          <Badge variant="success" size="sm">
            تسویه شد
          </Badge>
        )}
        {cancelled && (
          <Badge variant="neutral" size="sm">
            لغو شد
          </Badge>
        )}
      </div>
    </li>
  );
};

export const TodayTab: React.FC<TodayTabProps> = ({
  bookings,
  onOpenBooking,
  onSettle,
  onNewBooking,
  onSimulateOnline,
}) => {
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const q = useDebounce(search, 250).trim().toLowerCase();

  const today = useMemo(
    () =>
      bookings
        .filter((b) => isTodayLabel(b.date))
        .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time)),
    [bookings]
  );
  const later = useMemo(() => bookings.filter((b) => !isTodayLabel(b.date)), [bookings]);

  const pending = today.filter((b) => b.status === 'confirmed');
  const done = today.filter((b) => b.status === 'completed');
  const active = today.filter((b) => b.status !== 'cancelled');

  const matches = (b: CustomerBooking) => {
    const okFilter =
      filter === 'all' ||
      (filter === 'pending' && b.status === 'confirmed') ||
      (filter === 'done' && b.status === 'completed') ||
      (filter === 'cancelled' && b.status === 'cancelled');
    const okText =
      !q ||
      b.clientName.toLowerCase().includes(q) ||
      b.clientPhone.includes(q) ||
      b.serviceName.toLowerCase().includes(q) ||
      b.staffName.toLowerCase().includes(q);
    return okFilter && okText;
  };
  const todayShown = today.filter(matches);
  const laterShown = later.filter(matches);
  const filtering = filter !== 'all' || q !== '';

  let finding: string;
  if (today.length === 0) finding = 'امروز نوبتی ثبت نشده است.';
  else if (pending.length === 0) finding = 'همه‌ی نوبت‌های امروز تسویه یا لغو شده‌اند.';
  else
    finding = `${fa(pending.length)} نوبت منتظر تسویه است؛ اولین مورد ساعت ${pending[0].time} (${pending[0].clientName}).`;

  const FILTERS: { id: Filter; label: string }[] = [
    { id: 'all', label: 'همه' },
    { id: 'pending', label: pending.length ? `در انتظار ${fa(pending.length)}` : 'در انتظار' },
    { id: 'done', label: 'تسویه‌شده' },
    { id: 'cancelled', label: 'لغو شده' },
  ];

  return (
    <div>
      <PageTitle
        title="نوبت‌های امروز"
        meta={todayLabelFa()}
        sub={finding}
        action={
          <Button size="md" leftIcon={<Plus className="w-4 h-4" />} onClick={onNewBooking}>
            نوبت حضوری
          </Button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
        <Figure
          lead
          label="در انتظار تسویه"
          value={money(sum(pending))}
          unit="تومان"
          className="col-span-2 sm:col-span-1"
        />
        <Figure
          label="تسویه‌شده"
          value={money(sum(done))}
          unit="تومان"
          className="border-t sm:border-t-0 sm:border-s border-[var(--border-subtle)]"
        />
        <Figure
          label="نوبت‌های امروز"
          value={fa(active.length)}
          className="border-t sm:border-t-0 border-s border-[var(--border-subtle)]"
        />
      </div>

      {bookings.length > 0 && (
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
          <div
            className="inline-flex max-w-full overflow-x-auto rounded-xl bg-[var(--bg-elevated)] p-1 gap-1"
            role="group"
            aria-label="فیلتر وضعیت"
          >
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                aria-pressed={filter === f.id}
                className={`h-8 px-3 rounded-lg text-sm whitespace-nowrap transition-colors cursor-pointer ${
                  filter === f.id
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] font-semibold border border-[var(--border-default)]'
                    : 'text-[var(--text-secondary)] border border-transparent hover:text-[var(--text-primary)]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {bookings.length > 6 && (
            <label className="relative block sm:w-64">
              <span className="sr-only">جستجوی نوبت</span>
              <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="نام، تلفن، خدمت یا پرسنل"
                className="w-full h-10 ps-9 pe-3 rounded-xl bg-[var(--bg-subsurface)] border border-[var(--border-strong)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)]"
              />
            </label>
          )}
        </div>
      )}

      <div className="mt-4 space-y-6">
        {bookings.length === 0 && (
          <EmptyState
            title="هنوز نوبتی ثبت نشده"
            description="نوبت‌های آنلاین مشتریان و نوبت‌های حضوری شما به ترتیب ساعت همین‌جا می‌آیند."
            action={{
              label: 'ثبت نوبت حضوری',
              onClick: onNewBooking,
              icon: <Plus className="w-4 h-4" />,
            }}
          >
            {onSimulateOnline && (
              <button
                type="button"
                onClick={onSimulateOnline}
                className="mt-3 text-sm text-[var(--brand-accent)] hover:underline cursor-pointer"
              >
                ثبت یک نوبت آزمایشی از وب‌سایت مشتریان
              </button>
            )}
          </EmptyState>
        )}

        {bookings.length > 0 && filtering && todayShown.length + laterShown.length === 0 && (
          <EmptyState
            title="نوبتی با این فیلتر پیدا نشد"
            action={{
              label: 'پاک کردن فیلتر',
              variant: 'outline',
              onClick: () => {
                setFilter('all');
                setSearch('');
              },
            }}
          />
        )}

        {bookings.length > 0 && today.length === 0 && !filtering && (
          <EmptyState
            title="امروز نوبتی ندارید"
            description="نوبت‌های روزهای بعد در پایین فهرست شده‌اند."
          />
        )}

        {todayShown.length > 0 && (
          <section>
            <h2 className="flex items-baseline gap-2 mb-2 text-base font-semibold text-[var(--text-primary)]">
              امروز
              <span className="text-sm font-normal text-[var(--text-muted)]">
                {fa(todayShown.length)} نوبت (مبالغ به تومان)
              </span>
            </h2>
            <ul className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
              {todayShown.map((b) => (
                <Row key={b.id} b={b} onOpen={onOpenBooking} onSettle={onSettle} />
              ))}
            </ul>
          </section>
        )}

        {laterShown.length > 0 && (
          <section>
            <h2 className="flex items-baseline gap-2 mb-2 text-base font-semibold text-[var(--text-primary)]">
              روزهای بعد
              <span className="text-sm font-normal text-[var(--text-muted)]">
                {fa(laterShown.length)} نوبت (مبالغ به تومان)
              </span>
            </h2>
            <ul className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
              {laterShown.map((b) => (
                <Row key={b.id} b={b} showDay onOpen={onOpenBooking} onSettle={onSettle} />
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
};
