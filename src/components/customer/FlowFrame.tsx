import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface FlowFrameProps {
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** progress, shown under the title */
  steps?: React.ReactNode;
  /** stays in view at the bottom and clears the home indicator */
  footer?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * A task flow: a whole screen on a phone (nothing stacked behind it, nothing to mis-tap) and a
 * centred dialog from `sm` up. Booking, the receipt and the customer's account share it.
 */
export const FlowFrame: React.FC<FlowFrameProps> = ({
  onClose,
  title,
  subtitle,
  steps,
  footer,
  children,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 sm:flex sm:items-center sm:justify-center sm:p-6"
      dir="rtl"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 hidden sm:block bg-[var(--bg-overlay)]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative flex flex-col h-dvh sm:h-auto sm:max-h-[min(92dvh,780px)] w-full sm:max-w-xl bg-[var(--bg-surface)] text-[var(--text-primary)] sm:rounded-3xl sm:shadow-xl overflow-hidden">
        <div className="shrink-0 flex items-start justify-between gap-3 ps-5 pe-3 pt-[calc(1rem+env(safe-area-inset-top))] sm:pt-5 pb-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold">{title}</h2>
            {subtitle && (
              <p className="text-sm text-[var(--text-secondary)] mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="w-11 h-11 -mt-1 flex items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {steps && <div className="shrink-0 px-5 pb-3">{steps}</div>}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="shrink-0 px-5 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
