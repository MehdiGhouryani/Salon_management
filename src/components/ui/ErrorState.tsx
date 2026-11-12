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

/**
 * Inside the block that failed, never a full-screen banner: one sentence about what failed and a
 * retry. The error colour lives only on the small icon; the frame stays neutral.
 */
export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'خطا در بارگذاری اطلاعات',
  message = 'ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.',
  onRetry,
  actionLabel = 'تلاش مجدد',
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center px-6 py-8 sm:py-10 rounded-2xl border border-[var(--border-default)] text-[var(--text-primary)] ${className}`}
      dir="rtl"
      role="alert"
    >
      <div className="flex items-center gap-2 text-[var(--status-error)]" aria-hidden="true">
        <AlertCircle className="w-4 h-4 shrink-0" />
      </div>
      <h4 className="text-sm font-semibold text-[var(--text-primary)] mt-2">{title}</h4>
      <p className="text-sm text-[var(--text-secondary)] max-w-sm mt-1">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={onRetry}
          rightIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
