import React, { forwardRef } from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';

export type SelectSize = 'sm' | 'md' | 'lg';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  options?: SelectOption[];
  helperText?: string;
  error?: string;
  size?: SelectSize;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      options,
      helperText,
      error,
      size = 'md',
      className = '',
      id,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const selectId = id || React.useId();
    const errorId = `${selectId}-error`;
    const helperId = `${selectId}-helper`;

    const sizeClasses: Record<SelectSize, string> = {
      sm: 'min-h-[36px] py-1.5 text-xs rounded-lg',
      md: 'min-h-[44px] py-2.5 text-xs sm:text-sm rounded-xl',
      lg: 'min-h-[48px] py-3 text-sm sm:text-base rounded-xl',
    };

    return (
      <div className="w-full text-right" dir="rtl">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5 select-none"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={`w-full appearance-none pl-10 pr-3.5 border transition-all duration-150 outline-none cursor-pointer
              bg-[var(--bg-surface)]
              text-[var(--text-primary)]
              disabled:opacity-50 disabled:cursor-not-allowed
              ${sizeClasses[size]}
              ${
                error
                  ? 'border-[var(--status-error)] focus:ring-2 focus:ring-[var(--status-error)]/20'
                  : 'border-[var(--border-subtle)] focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/15'
              }
              ${className}`}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    disabled={opt.disabled}
                    className="bg-[var(--bg-surface)] text-[var(--text-primary)]"
                  >
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          <div
            className="absolute left-3.5 flex items-center pointer-events-none text-[var(--text-muted)]"
            aria-hidden="true"
          >
            <ChevronDown className="w-4 h-4 shrink-0" />
          </div>
        </div>

        {error && (
          <p
            id={errorId}
            className="mt-1.5 text-xs text-[var(--status-error)] flex items-center gap-1 font-medium animate-in fade-in duration-150"
            role="alert"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}

        {!error && helperText && (
          <p id={helperId} className="mt-1.5 text-[11px] text-[var(--text-secondary)]">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
