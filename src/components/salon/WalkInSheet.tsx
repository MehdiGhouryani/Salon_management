import React, { useEffect, useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { SalonServiceItem, SalonStaffItem } from '../../mock/salonDirectoryData';
import { SLOTS, isValidMobile } from './format';

export interface WalkInValues {
  clientName: string;
  clientPhone: string;
  serviceName: string;
  serviceId: string;
  staffName: string;
  staffId: string;
  /** Persian digits normalized to Latin HH:MM for the engine. */
  time: string;
  /** Canonical Gregorian date (Asia/Tehran) selected in the sheet. */
  bookingDate: string;
  price: number;
}

const toLatinDigits = (v: string) =>
  v.replace(/[۰-۹]/g, (ch) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(ch)));

interface WalkInSheetProps {
  isOpen: boolean;
  onClose: () => void;
  services: SalonServiceItem[];
  staff: SalonStaffItem[];
  /** returns true when the appointment was really created (the sheet then closes) */
  onSubmit: (v: WalkInValues) => boolean | Promise<boolean>;
}

/** Name and phone, one service, one time. Staff and price are filled in; both can be changed. */
export const WalkInSheet: React.FC<WalkInSheetProps> = ({
  isOpen,
  onClose,
  services,
  staff,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [staffName, setStaffName] = useState('');
  const [time, setTime] = useState('۱۶:۰۰');
  const [bookingDate, setBookingDate] = useState(() =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' }).format(new Date())
  );
  const [price, setPrice] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName('');
    setPhone('');
    setServiceId(services[0]?.id ?? '');
    setStaffName(staff[0]?.name ?? '');
    setTime('۱۶:۰۰');
    setBookingDate(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' }).format(new Date()));
    setPrice(services[0] ? String(services[0].price) : '');
    setSubmitted(false);
  }, [isOpen, services, staff]);

  const nameError = submitted && !name.trim() ? 'نام مشتری را وارد کنید.' : undefined;
  const phoneError =
    submitted && !phone.trim()
      ? 'شماره موبایل را وارد کنید.'
      : submitted && !isValidMobile(phone)
        ? 'شماره باید با ۰۹ شروع شود و ۱۱ رقم باشد.'
        : undefined;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!name.trim() || !isValidMobile(phone)) return;
    const service = services.find((s) => s.id === serviceId);
    const ok = onSubmit({
      clientName: name.trim(),
      clientPhone: phone.trim(),
      serviceName: service?.name ?? '',
      serviceId: service?.id ?? '',
      staffName,
      staffId: staff.find((st) => st.name === staffName)?.id ?? staff[0]?.id ?? '',
      time: toLatinDigits(time),
      bookingDate,
      price: Math.max(0, parseInt(price, 10) || 0),
    });
    if (ok) onClose();
  };

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title="ثبت نوبت حضوری"
      description="برای مشتری‌ای که همین حالا در سالن است."
      footer={
        <Button type="submit" form="walk-in-form" size="lg" className="w-full">
          ثبت نوبت
        </Button>
      }
    >
      <form id="walk-in-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="نام مشتری"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={nameError}
            autoComplete="off"
          />
          <Input
            label="شماره موبایل"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={phoneError}
            inputMode="tel"
            dir="ltr"
            placeholder="09121234567"
            tabularNums
          />
        </div>

        <Select
          label="خدمت"
          value={serviceId}
          onChange={(e) => {
            setServiceId(e.target.value);
            const s = services.find((x) => x.id === e.target.value);
            if (s) setPrice(String(s.price));
          }}
          options={services.map((s) => ({ value: s.id, label: s.name }))}
        />

        <div className="grid sm:grid-cols-2 gap-4">
          <Select
            label="پرسنل"
            value={staffName}
            onChange={(e) => setStaffName(e.target.value)}
            options={staff.map((s) => ({ value: s.name, label: s.name }))}
          />
          <Input
            label="مبلغ (تومان)"
            type="number"
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            tabularNums
          />
        </div>

        <fieldset>
          <Select
            label="تاریخ نوبت"
            value={bookingDate}
            onChange={(e) => setBookingDate(e.target.value)}
            options={[
              { value: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' }).format(new Date()), label: 'امروز' },
              { value: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' }).format(new Date(Date.now() + 86_400_000)), label: 'فردا' },
              { value: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' }).format(new Date(Date.now() + 2 * 86_400_000)), label: 'پس‌فردا' },
            ]}
          />
          <div className="mt-4" />
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {SLOTS.map((s) => (
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
      </form>
    </Sheet>
  );
};
