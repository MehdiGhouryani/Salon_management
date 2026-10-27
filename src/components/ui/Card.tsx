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
    default: 'bg-[var(--bg-surface)] border-[var(--border-default)]',
    elevated: 'bg-[var(--bg-elevated)] border-[var(--border-default)]',
    outlined: 'bg-transparent border-[var(--border-strong)]',
    subtle: 'bg-[var(--bg-subsurface)] border-[var(--border-default)]',
  };

  const paddingClasses = {
    none: '',
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-5',
    lg: 'p-5 sm:p-6 lg:p-8',
  };

  const interactiveClasses = interactive
    ? 'hover:border-[var(--border-strong)] cursor-pointer'
    : '';

  return (
    <div
      className={`rounded-2xl border transition-colors duration-150 text-[var(--text-primary)] ${variantClasses[variant]} ${paddingClasses[padding]} ${interactiveClasses} ${className}`}
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
      className={`text-base font-semibold text-[var(--text-primary)] ${className}`}
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
      className={`text-sm text-[var(--text-secondary)] mt-1 ${className}`}
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
