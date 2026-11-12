import React from 'react';

export interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}

/** On is a semantic green, not the brand accent. The thumb moves toward the end in both directions. */
export const Switch: React.FC<SwitchProps> = ({ checked, onChange, label, disabled, className = '' }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-canvas)] ${
      checked ? 'bg-[var(--status-success-solid)]' : 'bg-[var(--border-strong)]'
    } ${className}`}
  >
    <span
      className={`absolute top-1 start-1 h-4 w-4 rounded-full bg-white transition-transform ${
        checked ? 'translate-x-5 rtl:-translate-x-5' : ''
      }`}
    />
  </button>
);
