import React from 'react';

export type BadgeVariant =
  | 'neutral'
  | 'brand'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'purple';

export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'md',
  dot = false,
  className = '',
  children,
  ...props
}) => {
  const variantStyles: Record<BadgeVariant, string> = {
    neutral:
      'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-subtle)]',
    brand:
      'bg-[var(--brand-subdued)] text-[var(--brand-primary)] border-[var(--brand-border)]',
    success:
      'bg-[var(--status-success-bg)] text-[var(--status-success)] border-[var(--status-success-border)]',
    warning:
      'bg-[var(--status-warning-bg)] text-[var(--status-warning)] border-[var(--status-warning-border)]',
    error:
      'bg-[var(--status-error-bg)] text-[var(--status-error)] border-[var(--status-error-border)]',
    info:
      'bg-[var(--status-info-bg)] text-[var(--status-info)] border-[var(--status-info-border)]',
    purple:
      'bg-[var(--status-purple-bg)] text-[var(--status-purple)] border-[var(--status-purple-border)]',
  };

  const dotColors: Record<BadgeVariant, string> = {
    neutral: 'bg-[var(--text-muted)]',
    brand: 'bg-[var(--brand-primary)]',
    success: 'bg-[var(--status-success)]',
    warning: 'bg-[var(--status-warning)]',
    error: 'bg-[var(--status-error)]',
    info: 'bg-[var(--status-info)]',
    purple: 'bg-[var(--status-purple)]',
  };

  const sizeClasses: Record<BadgeSize, string> = {
    sm: 'px-2 py-0.2 text-[10px] rounded-md',
    md: 'px-2.5 py-0.5 text-xs rounded-lg',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold border select-none tabular-nums whitespace-nowrap transition-colors ${variantStyles[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant]}`}
          aria-hidden="true"
        />
      )}
      <span>{children}</span>
    </span>
  );
};
