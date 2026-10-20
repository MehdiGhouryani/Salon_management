import React, { forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  tabularNums?: boolean;
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

    return (
      <div className="w-full text-right" dir="rtl">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-slate-700 dark:text-[#E7ECF5] mb-1.5 select-none"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {trailingIcon && (
            <div className="absolute right-3.5 flex items-center pointer-events-none text-slate-400 dark:text-[#9AAAC2] shrink-0" aria-hidden="true">
              {trailingIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm transition-all duration-150 outline-none
              bg-white dark:bg-[#0D1527]
              text-slate-900 dark:text-[#E7ECF5]
              placeholder:text-slate-400 dark:placeholder:text-[#6B7D99]
              disabled:opacity-50 disabled:cursor-not-allowed
              ${trailingIcon ? 'pr-10' : ''}
              ${leadingIcon ? 'pl-10' : ''}
              ${
                error
                  ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20 dark:focus:ring-rose-500/30'
                  : 'border-slate-200 dark:border-[#344258] focus:border-[#F43F7A] focus:ring-2 focus:ring-[#F43F7A]/15'
              }
              ${tabularNums ? 'tabular-nums font-mono' : ''}
              ${className}`}
            {...props}
          />

          {leadingIcon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400 dark:text-[#9AAAC2] shrink-0" aria-hidden="true">
              {leadingIcon}
            </div>
          )}
        </div>

        {error && (
          <p
            id={errorId}
            className="mt-1.5 text-xs text-rose-600 dark:text-[#FB7185] flex items-center gap-1 font-medium animate-in fade-in duration-150"
            role="alert"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}

        {!error && helperText && (
          <p id={helperId} className="mt-1.5 text-[11px] text-slate-500 dark:text-[#9AAAC2]">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
