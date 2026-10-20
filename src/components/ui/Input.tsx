import React, { forwardRef } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';

export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  helperText?: string;
  error?: string;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  tabularNums?: boolean;
  size?: InputSize;
  isLoading?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      leadingIcon,
      trailingIcon,
      tabularNums = false,
      size = 'md',
      isLoading = false,
      className = '',
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id || React.useId();
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    const sizeClasses: Record<InputSize, string> = {
      sm: 'min-h-[36px] py-1.5 text-xs rounded-lg',
      md: 'min-h-[44px] py-2.5 text-xs sm:text-sm rounded-xl',
      lg: 'min-h-[48px] py-3 text-sm sm:text-base rounded-xl',
    };

    return (
      <div className="w-full text-right" dir="rtl">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5 select-none"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {trailingIcon && (
            <div
              className="absolute right-3.5 flex items-center pointer-events-none text-[var(--text-muted)] shrink-0"
              aria-hidden="true"
            >
              {trailingIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled || isLoading}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={`w-full px-3.5 border transition-all duration-150 outline-none
              bg-[var(--bg-surface)]
              text-[var(--text-primary)]
              placeholder:text-[var(--text-muted)]
              disabled:opacity-50 disabled:cursor-not-allowed
              ${trailingIcon ? 'pr-10' : ''}
              ${leadingIcon || isLoading ? 'pl-10' : ''}
              ${sizeClasses[size]}
              ${
                error
                  ? 'border-[var(--status-error)] focus:ring-2 focus:ring-[var(--status-error)]/20'
                  : 'border-[var(--border-subtle)] focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/15'
              }
              ${tabularNums ? 'tabular-nums font-mono' : ''}
              ${className}`}
            {...props}
          />

          {(leadingIcon || isLoading) && (
            <div
              className="absolute left-3.5 flex items-center pointer-events-none text-[var(--text-muted)] shrink-0"
              aria-hidden="true"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-[var(--brand-primary)]" />
              ) : (
                leadingIcon
              )}
            </div>
          )}
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

Input.displayName = 'Input';
