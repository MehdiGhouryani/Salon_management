import React from 'react';
import { ChevronRight, ChevronLeft, ChevronDown } from 'lucide-react';
import { Button } from '../ui/Button';
import { toPersianDigits } from '../../utils/formatters';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  itemLabel?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onLoadMore,
  hasMore,
  itemLabel = 'مورد',
}) => {
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div
      className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 sm:px-5 bg-[var(--bg-surface)] border-t border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] select-none rounded-b-2xl"
      dir="rtl"
    >
      {/* Item count summary */}
      <div className="flex items-center gap-1 font-medium">
        <span>نمایش</span>
        <span className="font-bold text-[var(--text-primary)] tabular-nums">
          {toPersianDigits(startItem)}
        </span>
        <span>تا</span>
        <span className="font-bold text-[var(--text-primary)] tabular-nums">
          {toPersianDigits(endItem)}
        </span>
        <span>از کل</span>
        <span className="font-bold text-[var(--brand-primary)] tabular-nums">
          {toPersianDigits(totalItems)}
        </span>
        <span>{itemLabel}</span>
      </div>

      {/* Load More Button (Mobile Friendly) */}
      {hasMore && onLoadMore && (
        <div className="sm:hidden w-full">
          <Button
            variant="outline"
            size="sm"
            fullWidth
            onClick={onLoadMore}
            leftIcon={<ChevronDown className="w-3.5 h-3.5" />}
          >
            بارگذاری نتایج بیشتر
          </Button>
        </div>
      )}

      {/* Page controls */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="xs"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            aria-label="صفحه قبلی"
          >
            <ChevronRight className="w-3.5 h-3.5" />
            <span>قبلی</span>
          </Button>

          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--bg-elevated)] font-semibold text-[var(--text-primary)] tabular-nums">
            <span>{toPersianDigits(currentPage)}</span>
            <span className="text-[var(--text-muted)]">/</span>
            <span>{toPersianDigits(totalPages)}</span>
          </div>

          <Button
            variant="outline"
            size="xs"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            aria-label="صفحه بعدی"
          >
            <span>بعدی</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
};
