import React from 'react';
import { Inbox } from 'lucide-react';
import { Button, ButtonProps } from './Button';

export interface EmptyStateActionConfig {
  label: string;
  onClick: () => void;
  variant?: ButtonProps['variant'];
  icon?: React.ReactNode;
}

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: EmptyStateActionConfig | React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

/**
 * An empty section keeps its frame and says one thing: what is missing and, if there is one,
 * the next step. Words, not an illustration: the icon is a bare muted glyph, never a tinted tile.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  children,
  className = '',
}) => {
  const isActionConfig = (act: unknown): act is EmptyStateActionConfig => {
    return Boolean(act && typeof act === 'object' && 'label' in act && 'onClick' in act);
  };

  return (
    <div
      className={`flex flex-col items-center justify-center text-center px-6 py-8 sm:py-10 rounded-2xl border border-dashed border-[var(--border-strong)] ${className}`}
      dir="rtl"
    >
      <div className="mb-3 text-[var(--text-muted)]" aria-hidden="true">
        {icon || <Inbox className="w-6 h-6" strokeWidth={1.5} />}
      </div>
      <h4 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h4>
      {description && (
        <p className="text-sm text-[var(--text-secondary)] max-w-sm mt-1">{description}</p>
      )}
      {action && (
        <div className="mt-4">
          {isActionConfig(action) ? (
            <Button
              variant={action.variant || 'primary'}
              size="sm"
              onClick={action.onClick}
              rightIcon={action.icon}
            >
              {action.label}
            </Button>
          ) : (
            action
          )}
        </div>
      )}
      {children}
    </div>
  );
};
