import React, { useEffect, useState } from 'react';
import { Phone, MessageSquare } from 'lucide-react';
import { CustomerBooking } from '../../types/admin';
import { SalonStaffItem } from '../../mock/salonDirectoryData';
import { Sheet } from '../ui/Sheet';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { SLOTS, money, shortDate } from './format';

export interface BookingChanges {
  time: string;
  staffName: string;
  notes: string;
}

interface BookingDetailSheetProps {
  booking: CustomerBooking | null;
  staff: SalonStaffItem[];
  onClose: () => void;
  onSettle: (b: CustomerBooking) => void | Promise<void>;
  onCancel: (b: CustomerBooking) => void | Promise<void>;
  onSave: (b: CustomerBooking, changes: BookingChanges) => boolean | Promise<boolean>;
  onSms: (b: CustomerBooking) => void;
}

const STATUS = {
  confirmed: { label: 'در انتظار تسویه', variant: 'warning' as const },
  completed: { label: 'تسویه شد', variant: 'success' as const },
  cancelled: { label: 'لغو شد', variant: 'neutral' as const },
};

const Fact: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-baseline justify-between gap-4 py-2.5 border-b border-[var(--border-subtle)] last:border-b-0">
    <dt className="text-[13px] text-[var(--text-secondary)]">{label}</dt>
    <dd className="text-sm text-[var(--text-primary)] text-end">{children}</dd>
  </div>
);

export const BookingDetailSheet: React.FC<BookingDetailSheetProps> = ({
  booking,
  staff,
  onClose,
  onSettle,
  onCancel,
  onSave,
  onSms,
}) => {
  const [time, setTime] = useState('');
  const [staffName, setStaffName] = useState('');
  const [notes, setNotes] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    if (!booking) return;
    setTime(booking.time);
    setStaffName(booking.staffName);
    setNotes(booking.notes || '');
    setConfirmCancel(false);
  }, [booking?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!booking) return null;
  const st = STATUS[booking.status];
  const editable = booking.status === 'confirmed';
  const dirty =
    time !== booking.time || staffName !== booking.staffName || notes !== (booking.notes || '');
  const slots = SLOTS.includes(booking.time) ? SLOTS : [booking.time, ...SLOTS];
  const staffOptions = staff.some((s) => s.name === staffName)
    ? staff.map((s) => ({ value: s.name, label: s.name }))
    : [{ value: staffName, label: staffName }, ...staff.map((s) => ({ value: s.name, label: s.name }))];

  return (
    <Sheet
      isOpen
      onClose={onClose}
      title={booking.clientName}
      description={
        <span className="inline-flex items-center gap-2 flex-wrap">
          <span dir="ltr" className="tabular-nums">
            {booking.clientPhone}
          </span>
          <Badge variant={st.variant} size="sm">
            {st.label}
          </Badge>
        </span>
      }
      footer={
        editable ? (
          <div className="space-y-3">
            <Button size="lg" className="w-full" variant="success" onClick={() => onSettle(booking)}>
              تکمیل خدمت و ثبت تسویه حضوری
            </Button>
            {confirmCancel ? (
              <div className="rounded-xl border border-[var(--border-default)] p-3">
                <p className="text-sm text-[var(--text-primary)]">
                  نوبت «{booking.clientName}» ساعت {booking.time} لغو شود؟
                </p>
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setConfirmCancel(false)}>
                    بازگشت
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => onCancel(booking)}>
                    لغو نوبت
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmCancel(true)}
                className="w-full h-10 text-sm text-[var(--status-error)] hover:underline cursor-pointer"
              >
                لغو نوبت
              </button>
            )}
          </div>
        ) : undefined
      }
    >
      <div className="grid grid-cols-2 gap-2">
        <a
          href={`tel:${booking.clientPhone}`}
          className="inline-flex items-center justify-center gap-2 h-10 rounded-xl border border-[var(--border-strong)] text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
        >
          <Phone className="w-4 h-4" /> تماس
        </a>
        <button
          type="button"
          onClick={() => onSms(booking)}
          className="inline-flex items-center justify-center gap-2 h-10 rounded-xl border border-[var(--border-strong)] text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
        >
          <MessageSquare className="w-4 h-4" /> پیامک
        </button>
      </div>

      <dl className="mt-4">
        <Fact label="زمان">
          {shortDate(booking.date)}، ساعت {booking.time}
        </Fact>
        <Fact label="خدمت">{booking.serviceName}</Fact>
        <Fact label="پرسنل">{booking.staffName}</Fact>
        <Fact label="مبلغ">
          {money(booking.price)} <span className="text-[11px] text-[var(--text-muted)]">تومان</span>
        </Fact>
        <Fact label="کد پیگیری">
          <span dir="ltr">{booking.trackingCode}</span>
        </Fact>
        {!editable && booking.notes && <Fact label="یادداشت">{booking.notes}</Fact>}
      </dl>

      {editable && (
        <div className="mt-5 space-y-4">
          <fieldset>
            <legend className="text-sm font-medium text-[var(--text-primary)] mb-2">
              تغییر ساعت
            </legend>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {slots.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTime(s)}
                  aria-pressed={time === s}
                  className={`h-10 rounded-xl border text-sm transition-colors cursor-pointer ${
                    time === s
                      ? 'border-[var(--text-primary)] bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold'
                      : 'border-[var(--border-strong)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </fieldset>
          <Select
            label="پرسنل"
            value={staffName}
            onChange={(e) => setStaffName(e.target.value)}
            options={staffOptions}
          />
          <Input
            label="یادداشت"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="مثلاً ترجیح رنگ"
          />
          {dirty && (
            <Button
              variant="secondary"
              size="md"
              onClick={() => onSave(booking, { time, staffName, notes })}
            >
              ذخیره تغییرات
            </Button>
          )}
        </div>
      )}
    </Sheet>
  );
};
