import React from 'react';
import { Skeleton } from '../ui/Skeleton';

export interface LoadingFallbackProps {
  message?: string;
  type?: 'page' | 'card' | 'table';
}

export const LoadingFallback: React.FC<LoadingFallbackProps> = ({
  message = 'در حال بارگذاری صفحه...',
  type = 'page',
}) => {
  if (type === 'card') {
    return (
      <div className="p-6 rounded-2xl bg-white dark:bg-[#18243A] border border-stone-200/80 dark:border-[#344258] space-y-4 animate-pulse">
        <Skeleton height={24} width="40%" />
        <Skeleton height={16} width="80%" />
        <Skeleton height={100} width="100%" />
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="p-6 rounded-2xl bg-white dark:bg-[#18243A] border border-stone-200/80 dark:border-[#344258] space-y-3 animate-pulse">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-[#344258]">
          <Skeleton height={20} width="30%" />
          <Skeleton height={32} width={100} />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 py-2">
            <Skeleton variant="circular" width={36} height={36} />
            <Skeleton height={18} className="flex-1" />
            <Skeleton height={18} width={80} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 w-full max-w-7xl mx-auto animate-pulse dir-rtl">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-stone-200/60 dark:border-[#344258]">
        <div className="space-y-2">
          <Skeleton height={28} width={240} className="rounded-lg" />
          <Skeleton height={16} width={320} className="rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton height={38} width={110} className="rounded-xl" />
          <Skeleton height={38} width={110} className="rounded-xl" />
        </div>
      </div>

      {/* Metric Cards Skeleton Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 rounded-2xl bg-white dark:bg-[#18243A] border border-stone-200/80 dark:border-[#344258] space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton height={16} width={90} />
              <Skeleton variant="circular" width={32} height={32} />
            </div>
            <Skeleton height={28} width={120} />
            <Skeleton height={12} width={140} />
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-[#18243A] border border-stone-200/80 dark:border-[#344258] space-y-4">
          <Skeleton height={22} width={180} />
          <Skeleton height={180} width="100%" className="rounded-xl" />
          <div className="space-y-2 pt-2">
            <Skeleton height={14} width="90%" />
            <Skeleton height={14} width="75%" />
          </div>
        </div>
        <div className="p-6 rounded-2xl bg-white dark:bg-[#18243A] border border-stone-200/80 dark:border-[#344258] space-y-4">
          <Skeleton height={22} width={140} />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton variant="circular" width={40} height={40} />
              <div className="space-y-1 flex-1">
                <Skeleton height={14} width="80%" />
                <Skeleton height={12} width="50%" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {message && (
        <p className="text-center text-xs text-zinc-400 dark:text-[#9AAAC2] pt-2 font-medium">
          {message}
        </p>
      )}
    </div>
  );
};
