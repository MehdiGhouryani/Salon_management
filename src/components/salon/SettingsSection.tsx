import React from 'react';

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

/** A label column beside its panel from `lg` up; stacked on a phone. Sections are split by a rule. */
export const SettingsSection: React.FC<SettingsSectionProps> = ({ title, description, children }) => (
  <section className="grid lg:grid-cols-[16rem_minmax(0,1fr)] gap-x-10 gap-y-3 py-6 border-b border-[var(--border-subtle)] last:border-b-0">
    <div>
      <h2 className="text-base font-medium text-[var(--text-primary)]">{title}</h2>
      {description && <p className="text-sm text-[var(--text-secondary)] mt-1">{description}</p>}
    </div>
    <div className="min-w-0">{children}</div>
  </section>
);
