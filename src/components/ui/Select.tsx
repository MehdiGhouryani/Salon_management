import React, { forwardRef } from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options?: SelectOption[];
  helperText?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      options,
      helperText,
      error,
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

    return (
      <div className="w-full text-right" dir="rtl">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold text-slate-700 dark:text-[#E7ECF5] mb-1.5 select-none"
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
            className={`w-full min-h-[44px] appearance-none pl-10 pr-3.5 py-2.5 rounded-xl border text-xs sm:text-sm transition-all duration-150 outline-none cursor-pointer
              bg-white dark:bg-[#0D1527]
              text-slate-900 dark:text-[#E7ECF5]
              disabled:opacity-50 disabled:cursor-not-allowed
              ${
                error
                  ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-slate-200 dark:border-[#344258] focus:border-[#F43F7A] focus:ring-2 focus:ring-[#F43F7A]/15'
              }
              ${className}`}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled} className="bg-white dark:bg-[#111B2E] text-slate-900 dark:text-[#E7ECF5]">
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400 dark:text-[#9AAAC2]" aria-hidden="true">
            <ChevronDown className="w-4 h-4 shrink-0" />
          </div>
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

Select.displayName = 'Select';
