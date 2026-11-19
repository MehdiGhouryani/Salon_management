import React from 'react';
import { DetailedSalonData } from '../../mock/salonDirectoryData';
import { CustomerBooking } from '../../types/admin';
import { Button } from '../ui/Button';
import { formatNumber, toPersianDigits } from '../../utils/formatters';
import { FlowFrame } from './FlowFrame';
import { StepConfirm, StepService, StepTime } from './booking/BookingSteps';
import { useBookingFlow } from './booking/useBookingFlow';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  salon: DetailedSalonData;
  onBookingSuccess: (booking: CustomerBooking) => void;
  initialServiceId?: string;
}

const STEP_NAMES = ['خدمت و متخصص', 'زمان', 'تأیید'];

const BookingFlowView: React.FC<Omit<BookingModalProps, 'isOpen'>> = ({
  onClose,
  salon,
  onBookingSuccess,
  initialServiceId,
}) => {
  const flow = useBookingFlow(salon, initialServiceId, onBookingSuccess);
  const { step, otpStage } = flow;

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (otpStage === 'input_phone') flow.sendOtp();
    else if (otpStage === 'input_code') flow.verifyOtp();
    else flow.confirm();
  };

  const primaryLabel =
    step < 3
      ? 'ادامه'
      : otpStage === 'input_phone'
        ? 'دریافت کد تأیید'
        : otpStage === 'input_code'
          ? 'تأیید کد'
          : 'ثبت نوبت';
  const primaryDisabled =
    (step === 1 && !flow.service) ||
    (step === 2 && (flow.slotsLoading || flow.slotsFailed || !flow.isOpenOnDay || !flow.time));

  const summary = [
    flow.service?.name,
    step >= 2 && flow.time ? `${flow.day.main} ${flow.day.sub}، ساعت ${toPersianDigits(flow.time)}` : null,
  ].filter(Boolean);

  return (
    <FlowFrame
      onClose={onClose}
      title="رزرو نوبت"
      subtitle={salon.name}
      steps={
        <ol className="grid grid-cols-3 gap-2" aria-label="مراحل رزرو">
          {STEP_NAMES.map((name, i) => {
            const n = i + 1;
            const state = n < step ? 'done' : n === step ? 'current' : 'todo';
            return (
              <li key={name} aria-current={state === 'current' ? 'step' : undefined}>
                <span
                  className={`block h-1 rounded-full ${
                    state === 'todo' ? 'bg-[var(--bg-elevated)]' : 'bg-[var(--text-primary)]'
                  } ${state === 'done' ? 'opacity-40' : ''}`}
                />
                <span
                  className={`block text-xs mt-1.5 ${
                    state === 'current'
                      ? 'font-semibold text-[var(--text-primary)]'
                      : 'text-[var(--text-muted)]'
                  }`}
                >
                  {name}
                </span>
              </li>
            );
          })}
        </ol>
      }
      footer={
        <div className="space-y-3">
          {flow.service && (
            <p className="text-sm text-[var(--text-secondary)] flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate">{summary.join('، ')}</span>
              <span className="shrink-0 tabular-nums text-[var(--text-primary)]">
                {formatNumber(flow.service.price)}
                <span className="text-xs text-[var(--text-muted)] ms-1">تومان</span>
              </span>
            </p>
          )}
          {flow.error && (
            <p role="alert" className="text-sm text-[var(--status-error)]">
              {flow.error}
            </p>
          )}
          <div className="flex gap-3">
            {step > 1 && (
              <Button variant="outline" size="lg" onClick={flow.back} disabled={flow.busy}>
                بازگشت
              </Button>
            )}
            {step < 3 ? (
              <Button
                size="lg"
                className="flex-1 rounded-full"
                onClick={flow.next}
                disabled={primaryDisabled}
              >
                {primaryLabel}
              </Button>
            ) : (
              <Button
                type="submit"
                form="booking-form"
                size="lg"
                className="flex-1 rounded-full"
                isLoading={flow.busy}
              >
                {primaryLabel}
              </Button>
            )}
          </div>
        </div>
      }
    >
      {step === 1 && <StepService salon={salon} flow={flow} />}
      {step === 2 && <StepTime flow={flow} />}
      {step === 3 && <StepConfirm salon={salon} flow={flow} onSubmit={submit} />}
    </FlowFrame>
  );
};

export const BookingModal: React.FC<BookingModalProps> = ({ isOpen, ...rest }) =>
  isOpen ? <BookingFlowView key={rest.salon.id} {...rest} /> : null;
