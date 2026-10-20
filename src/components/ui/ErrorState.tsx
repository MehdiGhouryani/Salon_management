import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  actionLabel?: string;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'خطا در بارگذاری اطلاعات',
  message = 'در برقراری ارتباط با سرور مشکلی رخ داده است. لطفاً اتصال اینترنت خود را بررسی کرده و مجدداً تلاش فرمایید.',
  onRetry,
  actionLabel = 'تلاش مجدد',
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-6 sm:p-10 rounded-2xl border border-[var(--status-error-border)] bg-[var(--status-error-bg)] text-[var(--text-primary)] ${className}`}
      dir="rtl"
      role="alert"
    >
      <div
        className="w-12 h-12 rounded-2xl bg-[var(--bg-surface)] text-[var(--status-error)] flex items-center justify-center mb-3.5 shadow-xs border border-[var(--status-error-border)]"
        aria-hidden="true"
      >
        <AlertCircle className="w-6 h-6" />
      </div>
      <h4 className="text-sm sm:text-base font-bold text-[var(--text-primary)] mb-1.5">
        {title}
      </h4>
      <p className="text-xs text-[var(--text-secondary)] max-w-sm leading-relaxed mb-4">
        {message}
      </p>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          rightIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
