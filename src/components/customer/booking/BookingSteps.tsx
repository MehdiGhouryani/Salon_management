import React from 'react';
import { Check, RefreshCw } from 'lucide-react';
import { DetailedSalonData } from '../../../mock/salonDirectoryData';
import { toPersianDigits } from '../../../utils/formatters';
import { Avatar } from '../../ui/Avatar';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { money, shortDate } from '../../salon/format';
import { BookingFlow } from './useBookingFlow';

const fa = (n: number) => toPersianDigits(String(n));

const Radio: React.FC<{ selected: boolean }> = ({ selected }) => (
  <span
    className={`mt-0.5 w-5 h-5 shrink-0 rounded-full border flex items-center justify-center ${
      selected
        ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-surface)]'
        : 'border-[var(--border-strong)]'
    }`}
  >
    {selected && <Check className="w-3 h-3" strokeWidth={3} />}
  </span>
);

const choiceClass = (selected: boolean) =>
  `transition-colors cursor-pointer border ${
    selected
      ? 'border-[var(--text-primary)] bg-[var(--bg-elevated)]'
      : 'border-[var(--border-default)] hover:border-[var(--border-strong)]'
  }`;

export const StepService: React.FC<{ salon: DetailedSalonData; flow: BookingFlow }> = ({
  salon,
  flow,
}) => (
  <div>
    <h3 className="text-base font-semibold mb-3">خدمت</h3>
    <div role="radiogroup" aria-label="خدمت" className="space-y-2">
      {salon.services.map((s) => {
        const selected = flow.service?.id === s.id;
        return (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => flow.setService(s)}
            className={`w-full text-start flex items-start gap-3 rounded-2xl p-3.5 ${choiceClass(selected)}`}
          >
            <Radio selected={selected} />
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold">{s.name}</span>
              <span className="block text-sm text-[var(--text-secondary)] mt-0.5">{s.duration}</span>
            </span>
            <span className="shrink-0 text-[15px] tabular-nums">
              {money(s.price)}
              <span className="text-xs text-[var(--text-muted)] ms-1">تومان</span>
            </span>
          </button>
        );
      })}
    </div>

    <h3 className="text-base font-semibold mt-6 mb-3">متخصص</h3>
    <div role="radiogroup" aria-label="متخصص" className="flex flex-wrap gap-2">
      <button
        type="button"
        role="radio"
        aria-checked={flow.staff === 'any'}
        onClick={() => flow.setStaff('any')}
        className={`h-11 px-4 rounded-full text-sm ${choiceClass(flow.staff === 'any')}`}
      >
        اولین متخصص خالی
      </button>
      {salon.staff.map((p) => {
        const selected = flow.staff !== 'any' && flow.staff.id === p.id;
        return (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => flow.setStaff(p)}
            className={`h-11 ps-1.5 pe-4 rounded-full text-sm flex items-center gap-2 ${choiceClass(selected)}`}
          >
            <Avatar src={p.avatar} name={p.name} size={32} />
            {p.name}
          </button>
        );
      })}
    </div>
  </div>
);

export const StepTime: React.FC<{ flow: BookingFlow }> = ({ flow }) => (
  <div>
    <h3 className="text-base font-semibold mb-3">روز</h3>
    <div
      role="radiogroup"
      aria-label="روز نوبت"
      className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1"
    >
      {flow.days.map((d) => {
        const selected = flow.day.dateKey === d.dateKey;
        return (
          <button
            key={d.dateKey}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => flow.setDay(d)}
            className={`shrink-0 w-[4.9rem] h-[4.4rem] flex flex-col items-center justify-center rounded-2xl ${choiceClass(selected)}`}
          >
            <span className="text-sm font-semibold">{d.main}</span>
            <span className="text-xs text-[var(--text-secondary)] mt-0.5">{d.sub}</span>
          </button>
        );
      })}
    </div>

    <h3 className="text-base font-semibold mt-6 mb-3">ساعت</h3>
    {flow.slotsLoading ? (
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2" aria-busy="true" aria-label="در حال دریافت ساعت‌های آزاد">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-11 rounded-xl bg-[var(--bg-elevated)] animate-pulse" />
        ))}
      </div>
    ) : flow.slotsFailed ? (
      <div role="alert" className="rounded-2xl border border-[var(--border-default)] p-4">
        <p className="text-sm text-[var(--text-primary)]">
          ساعت‌های آزاد دریافت نشد. اتصال را بررسی کنید و دوباره تلاش کنید.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={flow.retrySlots}
          rightIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          تلاش دوباره
        </Button>
      </div>
    ) : !flow.isOpenOnDay ? (
      <p className="text-sm text-[var(--text-secondary)] rounded-2xl border border-dashed border-[var(--border-strong)] p-4">
        {flow.closedReason || 'سالن در این روز تعطیل است.'} روز دیگری را انتخاب کنید.
      </p>
    ) : flow.slots.every((s) => !s.available) ? (
      <p className="text-sm text-[var(--text-secondary)] rounded-2xl border border-dashed border-[var(--border-strong)] p-4">
        برای این روز ساعت آزادی نمانده است. روز دیگری را انتخاب کنید.
      </p>
    ) : (
      <div role="radiogroup" aria-label="ساعت نوبت" className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {flow.slots.map((s) => {
          const selected = flow.time === s.time;
          return (
            <button
              key={s.time}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={!s.available}
              onClick={() => flow.setTime(s.time)}
              className={`h-11 rounded-xl text-sm ${
                !s.available
                  ? 'border border-transparent bg-[var(--bg-elevated)] text-[var(--text-muted)] cursor-not-allowed'
                  : choiceClass(selected)
              } ${selected ? 'font-semibold' : ''}`}
            >
              {s.available ? toPersianDigits(s.time) : 'پر'}
            </button>
          );
        })}
      </div>
    )}

    <p className="mt-6 text-sm text-[var(--text-secondary)]">
      رزرو رایگان است. هزینه‌ی خدمت را بعد از انجام کار، حضوری در سالن پرداخت می‌کنید.
    </p>
  </div>
);

export const StepConfirm: React.FC<{
  salon: DetailedSalonData;
  flow: BookingFlow;
  onSubmit: (e: React.FormEvent) => void;
}> = ({ flow, onSubmit }) => {
  const { otpStage } = flow;
  return (
    <form id="booking-form" onSubmit={onSubmit} noValidate className="space-y-4">
      {otpStage === 'input_phone' && (
        <>
          <p className="text-sm text-[var(--text-secondary)]">
            برای ثبت نوبت، شماره موبایل شما با یک کد پیامکی تأیید می‌شود.
          </p>
          <Input
            label="نام و نام خانوادگی"
            value={flow.clientName}
            onChange={(e) => flow.setClientName(e.target.value)}
            autoComplete="name"
          />
          <Input
            label="شماره موبایل"
            value={flow.clientPhone}
            onChange={(e) => flow.setClientPhone(e.target.value)}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            placeholder="09121234567"
            tabularNums
          />
        </>
      )}

      {otpStage === 'input_code' && (
        <>
          <p className="text-sm text-[var(--text-secondary)]">
            کد ۶ رقمی به شماره{' '}
            <span dir="ltr" className="tabular-nums text-[var(--text-primary)]">
              {toPersianDigits(flow.clientPhone)}
            </span>{' '}
            فرستاده شد.
          </p>
          <Input
            label="کد تأیید"
            value={flow.otpCode}
            onChange={(e) => flow.setOtpCode(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            dir="ltr"
            placeholder="------"
            tabularNums
            autoFocus
          />
          <div className="flex items-center justify-between gap-3 text-sm">
            {flow.resendIn > 0 ? (
              <span className="text-[var(--text-secondary)]">
                ارسال دوباره تا {fa(flow.resendIn)} ثانیه دیگر
              </span>
            ) : (
              <button
                type="button"
                onClick={flow.sendOtp}
                disabled={flow.busy}
                className="text-[var(--brand-accent)] hover:underline cursor-pointer disabled:opacity-50"
              >
                ارسال دوباره کد
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                flow.setOtpStage('input_phone');
                flow.setError('');
              }}
              className="text-[var(--text-secondary)] hover:underline cursor-pointer"
            >
              ویرایش شماره
            </button>
          </div>
        </>
      )}

      {otpStage === 'verified' && (
        <>
          <p className="text-sm text-[var(--text-secondary)]">
            شماره{' '}
            <span dir="ltr" className="tabular-nums text-[var(--text-primary)]">
              {toPersianDigits(flow.clientPhone)}
            </span>{' '}
            تأیید شده است.
          </p>
          <dl>
            {[
              ['خدمت', flow.service?.name],
              ['متخصص', flow.staffLabel],
              ['زمان', `${shortDate(flow.day.label)} ${flow.day.sub}، ساعت ${toPersianDigits(flow.time)}`],
              ['پرداخت', `حضوری در سالن، ${money(flow.service?.price ?? 0)} تومان`],
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-4 py-2.5 border-b border-[var(--border-subtle)] last:border-b-0">
                <dt className="text-sm text-[var(--text-secondary)]">{k}</dt>
                <dd className="text-sm text-[var(--text-primary)] text-end">{v}</dd>
              </div>
            ))}
          </dl>
          <Input
            label="یادداشت برای سالن (اختیاری)"
            value={flow.notes}
            onChange={(e) => flow.setNotes(e.target.value)}
            placeholder="مثلاً ترجیح رنگ یا حساسیت"
          />
        </>
      )}
    </form>
  );
};
