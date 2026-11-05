import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { CustomerBooking } from '../../types/admin';
import { Button } from '../ui/Button';
import { money } from '../salon/format';
import { FlowFrame } from './FlowFrame';

interface BookingReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: CustomerBooking | null;
  /** the salon's own phone and address; nothing is invented when they are missing */
  salonPhone?: string;
  salonAddress?: string;
}

const Fact: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-baseline justify-between gap-4 py-3 border-b border-[var(--border-subtle)] last:border-b-0">
    <dt className="text-sm text-[var(--text-secondary)] shrink-0">{label}</dt>
    <dd className="text-[15px] text-[var(--text-primary)] text-end">{children}</dd>
  </div>
);

export const BookingReceiptModal: React.FC<BookingReceiptModalProps> = ({
  isOpen,
  onClose,
  booking,
  salonPhone,
  salonAddress,
}) => {
  const [copied, setCopied] = useState(false);
  if (!isOpen || !booking) return null;

  const copyCode = () => {
    navigator.clipboard?.writeText(booking.trackingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <FlowFrame
      onClose={onClose}
      title="نوبت شما ثبت شد"
      subtitle={booking.salonName}
      footer={
        <div className="flex gap-3">
          {salonPhone && (
            <a
              href={`tel:${salonPhone}`}
              className="inline-flex items-center justify-center h-12 px-5 rounded-full border border-[var(--border-strong)] text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
            >
              تماس با سالن
            </a>
          )}
          <Button size="lg" className="flex-1 rounded-full" onClick={onClose}>
            بستن
          </Button>
        </div>
      }
    >
      <p className="text-sm text-[var(--text-secondary)]">کد پیگیری</p>
      <div className="mt-1 flex items-center justify-between gap-3">
        <span dir="ltr" className="text-3xl font-bold tabular-nums">
          {booking.trackingCode}
        </span>
        <button
          type="button"
          onClick={copyCode}
          className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full border border-[var(--border-strong)] text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'کپی شد' : 'کپی'}
        </button>
      </div>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        این کد را هنگام مراجعه یا تماس با سالن همراه داشته باشید.
      </p>

      <dl className="mt-6">
        <Fact label="زمان">
          {booking.date}، ساعت {booking.time}
        </Fact>
        <Fact label="خدمت">{booking.serviceName}</Fact>
        <Fact label="متخصص">{booking.staffName}</Fact>
        {salonAddress && <Fact label="آدرس">{salonAddress}</Fact>}
        <Fact label="مبلغ">
          <span className="tabular-nums">{money(booking.price)}</span>
          <span className="text-xs text-[var(--text-muted)] ms-1">تومان</span>
        </Fact>
      </dl>

      <p className="mt-5 text-sm text-[var(--text-secondary)]">
        پرداخت حضوری است: مبلغ را بعد از انجام خدمت، با کارتخوان یا نقد در سالن می‌دهید.
      </p>
    </FlowFrame>
  );
};
