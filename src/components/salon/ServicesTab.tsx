import React from 'react';
import { toPersianDigits } from '../../utils/formatters';
import { SalonServiceItem, SalonStaffItem } from '../../mock/salonDirectoryData';
import { Avatar } from '../ui/Avatar';
import { EmptyState } from '../ui/EmptyState';
import { PageTitle } from './PageTitle';
import { money } from './format';

interface ServicesTabProps {
  services: SalonServiceItem[];
  staff: SalonStaffItem[];
}

const fa = (n: number) => toPersianDigits(String(n));

export const ServicesTab: React.FC<ServicesTabProps> = ({ services, staff }) => (
  <div>
    <PageTitle
      title="خدمات و پرسنل"
      sub={`${fa(services.length)} خدمت، ${fa(staff.length)} نفر پرسنل`}
    />

    <section className="mb-8">
      <h2 className="mb-2 text-base font-semibold text-[var(--text-primary)]">خدمات</h2>
      {services.length === 0 ? (
        <EmptyState title="هنوز خدمتی تعریف نشده" />
      ) : (
        <ul className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
          {services.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-4 px-4 py-3.5 border-b border-[var(--border-subtle)] last:border-b-0"
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[var(--text-primary)] truncate">
                  {s.name}
                </div>
                <div className="text-[13px] text-[var(--text-secondary)] mt-0.5">
                  {s.categoryLabel} · {s.duration}
                </div>
              </div>
              <div className="shrink-0 text-sm tabular-nums text-[var(--text-primary)]">
                {money(s.price)}
                <span className="text-[11px] text-[var(--text-muted)] ms-1">تومان</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>

    <section>
      <h2 className="mb-2 text-base font-semibold text-[var(--text-primary)]">پرسنل</h2>
      {staff.length === 0 ? (
        <EmptyState title="هنوز پرسنلی ثبت نشده" />
      ) : (
        <ul className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
          {staff.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-subtle)] last:border-b-0"
            >
              <Avatar src={p.avatar} name={p.name} size={40} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-[var(--text-primary)] truncate">
                  {p.name}
                </div>
                <div className="text-[13px] text-[var(--text-secondary)] truncate mt-0.5">
                  {p.role}
                  {p.specialty ? ` · ${p.specialty}` : ''}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  </div>
);
