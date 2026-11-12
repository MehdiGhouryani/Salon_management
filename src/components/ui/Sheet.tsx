import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

/**
 * A bottom sheet on a phone and a centred dialog from `sm` up. The footer stays in view and
 * clears the home indicator; the body scrolls on its own.
 */
export const Sheet: React.FC<SheetProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  className = '',
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      dir="rtl"
      role="dialog"
      aria-modal="true"
    >
      <div className="fixed inset-0 bg-[var(--bg-overlay)]" onClick={onClose} aria-hidden="true" />
      <div
        className={`relative w-full sm:max-w-md bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[92dvh] sm:max-h-[85vh] flex flex-col ${className}`}
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
            {description && (
              <div className="text-sm text-[var(--text-secondary)] mt-1">{description}</div>
            )}
          </div>
          <Button
            variant="ghost"
            size="xs"
            onClick={onClose}
            aria-label="بستن"
            className="w-8 h-8 shrink-0 text-[var(--text-muted)]"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="px-5 pb-5 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-[var(--border-subtle)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
