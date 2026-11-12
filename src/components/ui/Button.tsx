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
      'inline-flex items-center justify-center font-medium select-none whitespace-nowrap transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-canvas)]';

    // Variant classes using semantic token variables
    const variantClasses: Record<ButtonVariant, string> = {
      primary:
        'bg-[var(--brand-primary)] hover:bg-[var(--brand-hover)] text-white font-semibold focus-visible:ring-[var(--brand-primary)]',
      secondary:
        'bg-[var(--bg-elevated)] hover:bg-[var(--bg-subsurface)] text-[var(--text-primary)] border border-[var(--border-default)] focus-visible:ring-[var(--brand-primary)]',
      outline:
        'bg-transparent hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-strong)] focus-visible:ring-[var(--brand-primary)]',
      ghost:
        'bg-transparent hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus-visible:ring-[var(--brand-primary)]',
      danger:
        'bg-[var(--status-error-solid)] hover:opacity-90 text-white font-semibold focus-visible:ring-[var(--status-error-solid)]',
      success:
        'bg-[var(--status-success-solid)] hover:opacity-90 text-white font-semibold focus-visible:ring-[var(--status-success-solid)]',
      warning:
        'bg-[var(--status-warning-solid)] hover:opacity-90 text-white font-semibold focus-visible:ring-[var(--status-warning-solid)]',
    };

    // Sizing
    const sizeClasses: Record<ButtonSize, string> = {
      xs: 'h-8 px-3 text-xs rounded-lg gap-1 min-h-[32px]',
      sm: 'h-9 px-3.5 text-sm rounded-xl gap-1.5 min-h-[36px]',
      md: 'h-11 px-5 text-sm rounded-xl gap-2 min-h-[44px]',
      lg: 'h-12 px-6 text-base rounded-xl gap-2.5 min-h-[48px]',
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
