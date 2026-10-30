import React from 'react';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Switch } from '../ui/Switch';
import { PageTitle } from './PageTitle';
import { SettingsSection } from './SettingsSection';
import { PLANS, PlanId } from './plans';

interface ProfileSalon {
  name: string;
  city?: string;
  ownerName?: string;
  phone?: string;
  plan?: string;
  planExpiry?: string;
}

interface ProfileTabProps {
  salon: ProfileSalon;
  isDemoMode: boolean;
  onlineBooking: boolean;
  onToggleOnlineBooking: (next: boolean) => void;
  smsEnabled: boolean;
  onToggleSms: (next: boolean) => void;
  isDark: boolean;
  onSetDark: (dark: boolean) => void;
  onOpenSubscription: () => void;
  salonOptions: { slug: string; name: string }[];
  currentSlug: string;
  onChangeSalon: (slug: string) => void;
  onOpenSuperAdmin: () => void;
}

const SettingRow: React.FC<{
  title: string;
  description?: string;
  children: React.ReactNode;
}> = ({ title, description, children }) => (
  <div className="flex items-center justify-between gap-4 py-3 border-b border-[var(--border-subtle)] last:border-b-0">
    <div className="min-w-0">
      <div className="text-sm font-medium text-[var(--text-primary)]">{title}</div>
      {description && <div className="text-[13px] text-[var(--text-secondary)] mt-0.5">{description}</div>}
    </div>
    {children}
  </div>
);

export const ProfileTab: React.FC<ProfileTabProps> = ({
  salon,
  isDemoMode,
  onlineBooking,
  onToggleOnlineBooking,
  smsEnabled,
  onToggleSms,
  isDark,
  onSetDark,
  onOpenSubscription,
  salonOptions,
  currentSlug,
  onChangeSalon,
  onOpenSuperAdmin,
}) => {
  const plan = salon.plan ? PLANS[salon.plan as PlanId] : undefined;
  return (
    <div>
      <PageTitle title="پروفایل" />

      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-5">
        <div className="flex items-center gap-4 py-5 border-b border-[var(--border-subtle)]">
          <Avatar name={salon.name} size={48} />
          <div className="min-w-0">
            <div className="text-base font-semibold text-[var(--text-primary)] truncate">
              {salon.name}
            </div>
            <div className="text-[13px] text-[var(--text-secondary)] mt-0.5">
              {[salon.ownerName && `مدیر: ${salon.ownerName}`, salon.city].filter(Boolean).join(' · ')}
            </div>
            {salon.phone && (
              <div dir="ltr" className="text-[13px] text-[var(--text-muted)] mt-0.5 tabular-nums text-end">
                {salon.phone}
              </div>
            )}
          </div>
        </div>

        <SettingsSection title="اشتراک">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {plan ? plan.title : 'اشتراک فعال'}
                </span>
              </div>
              {plan && (
                <div className="text-[13px] text-[var(--text-secondary)] mt-1">{plan.features}</div>
              )}
              {salon.planExpiry && (
                <div className="text-[13px] text-[var(--text-muted)] mt-1">
                  انقضا: {salon.planExpiry}
                </div>
              )}
            </div>
            <Button variant="secondary" size="sm" onClick={onOpenSubscription}>
              تمدید یا ارتقا
            </Button>
          </div>
        </SettingsSection>

        <SettingsSection title="نوبت‌دهی">
          <SettingRow
            title="پذیرش نوبت آنلاین"
            description="مشتری‌ها می‌توانند از وب‌سایت سالن نوبت بگیرند."
          >
            <Switch label="پذیرش نوبت آنلاین" checked={onlineBooking} onChange={onToggleOnlineBooking} />
          </SettingRow>
          <SettingRow title="پیامک اطلاع‌رسانی" description="تأیید و یادآوری نوبت برای مشتری.">
            <Switch label="پیامک اطلاع‌رسانی" checked={smsEnabled} onChange={onToggleSms} />
          </SettingRow>
        </SettingsSection>

        <SettingsSection title="نمایش">
          <SettingRow title="حالت نمایش">
            <div className="inline-flex rounded-xl bg-[var(--bg-elevated)] p-1 gap-1" role="group" aria-label="حالت نمایش">
              {[
                { dark: false, label: 'روز' },
                { dark: true, label: 'شب' },
              ].map((o) => (
                <button
                  key={o.label}
                  type="button"
                  aria-pressed={isDark === o.dark}
                  onClick={() => onSetDark(o.dark)}
                  className={`h-8 px-4 rounded-lg text-sm transition-colors cursor-pointer ${
                    isDark === o.dark
                      ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] font-semibold border border-[var(--border-default)]'
                      : 'text-[var(--text-secondary)] border border-transparent'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </SettingRow>
        </SettingsSection>

        {isDemoMode && (
          <SettingsSection title="ابزار نسخه دمو" description="فقط در پیش‌نمایش آزمایشی دیده می‌شود.">
            <div className="space-y-4">
              <Select
                label="سالن فعال"
                value={currentSlug}
                onChange={(e) => onChangeSalon(e.target.value)}
                options={salonOptions.map((s) => ({ value: s.slug, label: s.name }))}
              />
              <Button variant="outline" size="md" onClick={onOpenSuperAdmin}>
                رفتن به پنل ادمین
              </Button>
            </div>
          </SettingsSection>
        )}
      </div>
    </div>
  );
};
