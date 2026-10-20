import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined' | 'subtle';
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  interactive = false,
  padding = 'none',
  className = '',
  children,
  ...props
}) => {
  const variantClasses = {
    default: 'bg-[var(--bg-surface)] border-[var(--border-subtle)] shadow-xs',
    elevated: 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] shadow-sm',
    outlined: 'bg-transparent border-[var(--border-strong)]',
    subtle: 'bg-[var(--bg-subsurface)] border-[var(--border-subtle)]',
  };

  const paddingClasses = {
    none: '',
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-5',
    lg: 'p-5 sm:p-6 lg:p-8',
  };

  const interactiveClasses = interactive
    ? 'hover:border-[var(--brand-border)] hover:shadow-md cursor-pointer active:scale-[0.99] transition-all duration-150'
    : '';

  return (
    <div
      className={`rounded-2xl border transition-all duration-150 text-[var(--text-primary)] ${variantClasses[variant]} ${paddingClasses[padding]} ${interactiveClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <div
      className={`p-4 sm:p-5 border-b border-[var(--border-subtle)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <h3
      className={`text-sm sm:text-base font-bold text-[var(--text-primary)] tracking-tight ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
};

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <p
      className={`text-xs text-[var(--text-secondary)] mt-1 leading-relaxed ${className}`}
      {...props}
    >
      {children}
    </p>
  );
};

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <div className={`p-4 sm:p-5 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <div
      className={`p-4 sm:p-5 border-t border-[var(--border-subtle)] bg-[var(--bg-subsurface)] rounded-b-2xl ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
