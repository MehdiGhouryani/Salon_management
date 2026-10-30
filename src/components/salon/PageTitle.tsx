import React from 'react';

interface PageTitleProps {
  title: string;
  /** small muted text next to the title, e.g. the date */
  meta?: string;
  /** one sentence about the data: the finding, the scope. Never about the interface. */
  sub?: React.ReactNode;
  /** the one primary action, if the screen has one */
  action?: React.ReactNode;
}

export const PageTitle: React.FC<PageTitleProps> = ({ title, meta, sub, action }) => (
  <div className="mb-5">
    <div className="flex items-start justify-between gap-4">
      <h1 className="min-w-0 text-xl sm:text-2xl font-bold text-[var(--text-primary)] flex items-baseline flex-wrap gap-x-3">
        <span>{title}</span>
        {meta && <span className="text-sm font-normal text-[var(--text-muted)]">{meta}</span>}
      </h1>
      {action && <div className="shrink-0">{action}</div>}
    </div>
    {sub && <p className="text-sm text-[var(--text-secondary)] mt-1.5">{sub}</p>}
  </div>
);
