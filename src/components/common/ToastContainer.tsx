import React from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X, Undo2 } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useAdmin();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 left-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-3 p-3.5 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-xl shadow-2xl backdrop-blur-md text-right text-xs animate-in slide-in-from-bottom-3 duration-200 text-[var(--text-primary)]"
          >
            {/* Icon */}
            <div className="shrink-0 mt-0.5">
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-[var(--status-success)]" />}
              {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-[var(--status-error)]" />}
              {toast.type === 'warning' && <AlertTriangle className="w-4 h-4 text-[var(--status-warning)]" />}
              {toast.type === 'info' && <Info className="w-4 h-4 text-[var(--status-info)]" />}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[var(--text-primary)]">{toast.title}</p>
              {toast.message && <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">{toast.message}</p>}
            </div>

            {/* Undo button if available */}
            {toast.undoAction && (
              <button
                onClick={() => {
                  toast.undoAction?.();
                  removeToast(toast.id);
                }}
                className="flex items-center gap-1 text-[11px] font-semibold text-[var(--brand-primary)] hover:underline px-2 py-1 rounded bg-[var(--brand-subdued)] transition-colors shrink-0 cursor-pointer"
              >
                <Undo2 className="w-3 h-3" />
                <span>بازگردانی</span>
              </button>
            )}

            {/* Close button */}
            <button
              onClick={() => removeToast(toast.id)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5 rounded transition-colors shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
