import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'success'
  | 'warning';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className = '',
      children,
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    // Base classes adhering to ergonomic design system touch targets and focus states
    const baseClasses =
      'inline-flex items-center justify-center font-medium select-none whitespace-nowrap transition-all duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98]';

    // Variant classes using semantic token variables
    const variantClasses: Record<ButtonVariant, string> = {
      primary:
        'bg-[var(--brand-primary)] hover:bg-[var(--brand-accent)] text-white shadow-xs font-semibold focus-visible:ring-[var(--brand-primary)] dark:focus-visible:ring-offset-[#0B1120]',
      secondary:
        'bg-[var(--bg-elevated)] hover:bg-[var(--bg-subsurface)] text-[var(--text-primary)] border border-[var(--border-subtle)] focus-visible:ring-[var(--brand-primary)] dark:focus-visible:ring-offset-[#0B1120]',
      outline:
        'bg-transparent hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-strong)] focus-visible:ring-[var(--brand-primary)] dark:focus-visible:ring-offset-[#0B1120]',
      ghost:
        'bg-transparent hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus-visible:ring-[var(--brand-primary)] dark:focus-visible:ring-offset-[#0B1120]',
      danger:
        'bg-[var(--status-error)] hover:opacity-90 text-white shadow-xs font-semibold focus-visible:ring-[var(--status-error)] dark:focus-visible:ring-offset-[#0B1120]',
      success:
        'bg-[var(--status-success)] hover:opacity-90 text-white shadow-xs font-semibold focus-visible:ring-[var(--status-success)] dark:focus-visible:ring-offset-[#0B1120]',
      warning:
        'bg-[var(--status-warning)] hover:opacity-90 text-white shadow-xs font-semibold focus-visible:ring-[var(--status-warning)] dark:focus-visible:ring-offset-[#0B1120]',
    };

    // Sizing
    const sizeClasses: Record<ButtonSize, string> = {
      xs: 'h-7 px-2.5 text-[11px] rounded-lg gap-1 min-h-[28px]',
      sm: 'h-9 px-3 text-xs rounded-xl gap-1.5 min-h-[36px]',
      md: 'h-11 px-4 text-xs sm:text-sm rounded-xl gap-2 min-h-[44px]',
      lg: 'h-12 px-5 text-sm sm:text-base rounded-2xl gap-2.5 min-h-[48px]',
      icon: 'h-11 w-11 p-0 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center',
    };

    const widthClass = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className}`}
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
