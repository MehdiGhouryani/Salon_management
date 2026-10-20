import React, { useState } from 'react';
import { AlertTriangle, AlertCircle, CheckCircle2, X, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/Button';

export interface StatusReasonModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  entityName: string;
  targetStatusLabel: string;
  actionVariant?: 'success' | 'warning' | 'danger';
  confirmLabel?: string;
  cancelLabel?: string;
  defaultReason?: string;
  placeholder?: string;
  onConfirm: (reason: string) => Promise<void> | void;
  onClose: () => void;
}

export const StatusReasonModal: React.FC<StatusReasonModalProps> = ({
  isOpen,
  title,
  subtitle,
  entityName,
  targetStatusLabel,
  actionVariant = 'warning',
  confirmLabel = 'تأیید و ثبت در سیستم',
  cancelLabel = 'انصراف',
  defaultReason = '',
  placeholder = 'دلیل دقیق تغییر وضعیت (مثلاً: «تکمیل پرونده مالیاتی و تایید مدارک صنفی» یا «عدم رعایت قوانین و عدم ارائه پروانه»)',
  onConfirm,
  onClose,
}) => {
  const [reason, setReason] = useState(defaultReason);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanReason = reason.trim();
    if (!cleanReason || cleanReason.length < 3) {
      setError('ثبت علت تغییر وضعیت الزامی است (حداقل ۳ کاراکتر).');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onConfirm(cleanReason);
      setReason('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'خطا در ثبت تغییر وضعیت در سرور');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBadgeStyle = () => {
    switch (actionVariant) {
      case 'success':
        return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'danger':
        return 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-500/20';
      default:
        return 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-500/20';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white dark:bg-[#111B2E] border border-slate-200 dark:border-[#344258] rounded-2xl shadow-2xl p-6 z-10 text-right space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-[#23324B]">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl shrink-0 border ${getBadgeStyle()}`}>
              {actionVariant === 'success' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : actionVariant === 'danger' ? (
                <AlertCircle className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-[#E7ECF5]">{title}</h3>
              <p className="text-xs text-slate-500 dark:text-[#9AAAC2] mt-0.5">
                {subtitle || `هدف: تغییر وضعیت «${entityName}» به «${targetStatusLabel}»`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-[#E7ECF5] mb-1.5">
              علت و توضیحات تغییر وضعیت <span className="text-rose-500">* (اجباری)</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(null);
              }}
              placeholder={placeholder}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#0D1527] border border-slate-200 dark:border-[#344258] rounded-xl text-xs text-slate-900 dark:text-[#E7ECF5] placeholder-slate-400 focus:outline-none focus:border-[#F43F7A] transition-colors leading-relaxed"
              required
            />
            <p className="text-[11px] text-slate-400 dark:text-[#9AAAC2] mt-1">
              این علت همراه با هویت اپراتور جاری در لاگ ممیزی پلتفرم (Audit Trail) به صورت دائمی ثبت می‌گردد.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-[#23324B]">
            <span className="text-[10px] text-slate-400 dark:text-[#9AAAC2] flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>ثبت امن با شناسه اپراتور</span>
            </span>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onClose}
                disabled={isSubmitting}
              >
                {cancelLabel}
              </Button>
              <Button
                type="submit"
                variant={actionVariant === 'danger' ? 'danger' : 'primary'}
                size="sm"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin ml-1.5" />
                    <span>در حال ثبت...</span>
                  </>
                ) : (
                  confirmLabel
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
