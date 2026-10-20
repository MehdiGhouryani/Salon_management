import React from 'react';
import { Inbox } from 'lucide-react';
import { Button, ButtonProps } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: ButtonProps['variant'];
    icon?: React.ReactNode;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-surface)]/60 ${className}`}
      dir="rtl"
    >
      <div
        className="w-14 h-14 rounded-2xl bg-[var(--bg-elevated)] text-[var(--text-muted)] flex items-center justify-center mb-4 shadow-xs"
        aria-hidden="true"
      >
        {icon || <Inbox className="w-7 h-7" />}
      </div>
      <h4 className="text-sm sm:text-base font-bold text-[var(--text-primary)] mb-1.5">
        {title}
      </h4>
      {description && (
        <p className="text-xs text-[var(--text-secondary)] max-w-sm leading-relaxed mb-5">
          {description}
        </p>
      )}
      {action && (
        <Button
          variant={action.variant || 'primary'}
          size="sm"
          onClick={action.onClick}
          rightIcon={action.icon}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};
