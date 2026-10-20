import React, { useState } from 'react';
import { AlertTriangle, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';

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

  const badgeVariant =
    actionVariant === 'success' ? 'success' : actionVariant === 'danger' ? 'error' : 'warning';

  const modalIcon = (
    <Badge variant={badgeVariant} size="md">
      {actionVariant === 'success' ? (
        <CheckCircle2 className="w-4 h-4" />
      ) : actionVariant === 'danger' ? (
        <AlertCircle className="w-4 h-4" />
      ) : (
        <AlertTriangle className="w-4 h-4" />
      )}
    </Badge>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={subtitle || `هدف: تغییر وضعیت «${entityName}» به «${targetStatusLabel}»`}
      icon={modalIcon}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-[var(--text-primary)] mb-1.5">
            علت و توضیحات تغییر وضعیت <span className="text-[var(--status-error)]">* (اجباری)</span>
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError(null);
            }}
            placeholder={placeholder}
            className="w-full px-3.5 py-2.5 bg-[var(--bg-subsurface)] border border-[var(--border-subtle)] rounded-xl text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/15 transition-all leading-relaxed"
            required
          />
          <p className="text-[11px] text-[var(--text-muted)] mt-1">
            این علت همراه با هویت اپراتور جاری در لاگ ممیزی پلتفرم (Audit Trail) به صورت دائمی ثبت می‌گردد.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-[var(--status-error-bg)] border border-[var(--status-error-border)] text-[var(--status-error)] text-xs rounded-xl flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)] mt-2">
          <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--status-success)]" />
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
              variant={actionVariant}
              size="sm"
              isLoading={isSubmitting}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
