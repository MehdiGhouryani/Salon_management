import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'خطا در بارگذاری اطلاعات',
  message = 'در برقراری ارتباط با سرور مشکلی رخ داده است. لطفاً اتصال اینترنت خود را بررسی کرده و مجدداً تلاش فرمایید.',
  onRetry,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-6 sm:p-10 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 text-rose-950 dark:text-rose-100 ${className}`}
      dir="rtl"
      role="alert"
    >
      <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-[#FB7185] flex items-center justify-center mb-3.5 shadow-xs" aria-hidden="true">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1.5">
        {title}
      </h4>
      <p className="text-xs text-slate-600 dark:text-[#9AAAC2] max-w-sm leading-relaxed mb-4">
        {message}
      </p>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          rightIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          تلاش مجدد
        </Button>
      )}
    </div>
  );
};
