import React from 'react';

export type BadgeVariant = 'neutral' | 'brand' | 'success' | 'warning' | 'error' | 'info';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  dot = false,
  className = '',
  children,
  ...props
}) => {
  const variantStyles: Record<BadgeVariant, string> = {
    neutral:
      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-[#18243A] dark:text-[#9AAAC2] dark:border-[#344258]',
    brand:
      'bg-rose-50 text-rose-700 border-rose-200 dark:bg-[#F43F7A]/15 dark:text-[#FB7185] dark:border-[#F43F7A]/30',
    success:
      'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-[#34D399] dark:border-emerald-800/40',
    warning:
      'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-[#FBBF24] dark:border-amber-800/40',
    error:
      'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-[#FB7185] dark:border-rose-800/40',
    info:
      'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-[#38BDF8] dark:border-sky-800/40',
  };

  const dotColors: Record<BadgeVariant, string> = {
    neutral: 'bg-slate-400 dark:bg-slate-500',
    brand: 'bg-[#F43F7A]',
    success: 'bg-emerald-500 dark:bg-[#34D399]',
    warning: 'bg-amber-500 dark:bg-[#FBBF24]',
    error: 'bg-rose-500 dark:bg-[#FB7185]',
    info: 'bg-sky-500 dark:bg-[#38BDF8]',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold border select-none tabular-nums whitespace-nowrap transition-colors ${variantStyles[variant]} ${className}`}
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
