import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      className = '',
      children,
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    // Base styles: Single-line, font-semibold, focus-visible outline, transition
    const baseClasses =
      'inline-flex items-center justify-center font-medium select-none whitespace-nowrap transition-all duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#F43F7A] dark:focus-visible:ring-offset-[#0B1120] active:scale-[0.98]';

    // Variant classes
    const variantClasses: Record<ButtonVariant, string> = {
      primary:
        'bg-[#E11D48] hover:bg-[#BE123C] dark:bg-[#F43F7A] dark:hover:bg-[#E11D48] text-white shadow-xs font-semibold',
      secondary:
        'bg-slate-100 hover:bg-slate-200/80 dark:bg-[#18243A] dark:hover:bg-[#20304C] text-slate-800 dark:text-[#E7ECF5] border border-slate-200 dark:border-[#344258]',
      outline:
        'bg-transparent hover:bg-slate-100/70 dark:hover:bg-[#18243A]/80 text-slate-700 dark:text-[#E7ECF5] border border-slate-300 dark:border-[#344258]',
      ghost:
        'bg-transparent hover:bg-slate-100 dark:hover:bg-[#18243A] text-slate-600 dark:text-[#9AAAC2] hover:text-slate-900 dark:hover:text-[#E7ECF5]',
      danger:
        'bg-rose-600 hover:bg-rose-700 text-white shadow-xs font-semibold dark:bg-rose-700 dark:hover:bg-rose-800',
    };

    // Sizing: Ensures minimum 44px touch targets on mobile for standard sizes
    const sizeClasses: Record<ButtonSize, string> = {
      sm: 'h-9 px-3 text-xs rounded-xl gap-1.5 min-h-[36px]',
      md: 'h-11 px-4 text-xs sm:text-sm rounded-xl gap-2 min-h-[44px]',
      lg: 'h-12 px-5 text-sm sm:text-base rounded-2xl gap-2.5 min-h-[48px]',
      icon: 'h-11 w-11 p-0 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
            <span>{children}</span>
          </>
        ) : (
          <>
            {rightIcon && <span className="shrink-0" aria-hidden="true">{rightIcon}</span>}
            {children && <span>{children}</span>}
            {leftIcon && <span className="shrink-0" aria-hidden="true">{leftIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
