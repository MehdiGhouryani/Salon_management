import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  elevated = false,
  interactive = false,
  className = '',
  children,
  ...props
}) => {
  return (
    <div
      className={`rounded-2xl border transition-all duration-150 ${
        elevated
          ? 'bg-[#F1F5F9] dark:bg-[#18243A] border-slate-200 dark:border-[#344258]'
          : 'bg-white dark:bg-[#111B2E] border-slate-200/90 dark:border-[#344258]'
      } ${
        interactive
          ? 'hover:border-slate-300 dark:hover:border-[#4A5D7C] hover:shadow-xs cursor-pointer active:scale-[0.99]'
          : 'shadow-xs'
      } text-slate-900 dark:text-[#E7ECF5] ${className}`}
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
    <div className={`p-4 sm:p-5 border-b border-slate-100 dark:border-[#23324B] ${className}`} {...props}>
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
      className={`text-sm sm:text-base font-bold text-slate-900 dark:text-[#E7ECF5] tracking-tight ${className}`}
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
      className={`text-xs text-slate-500 dark:text-[#9AAAC2] mt-1 leading-relaxed ${className}`}
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
      className={`p-4 sm:p-5 border-t border-slate-100 dark:border-[#23324B] bg-slate-50/50 dark:bg-[#0D1527]/50 rounded-b-2xl ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
