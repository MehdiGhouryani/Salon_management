import React from 'react';
import { AlertTriangle, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel?: () => void;
  onClose?: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'تایید و اجرا',
  cancelLabel = 'انصراف',
  variant = 'warning',
  onConfirm,
  onCancel,
  onClose,
}) => {
  const handleClose = () => {
    if (onCancel) onCancel();
    if (onClose) onClose();
  };

  const badgeVariant = variant === 'danger' ? 'error' : variant === 'info' ? 'info' : 'warning';

  const modalIcon = (
    <Badge variant={badgeVariant} size="md">
      {variant === 'danger' ? <AlertCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
    </Badge>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      description={message}
      icon={modalIcon}
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={handleClose}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            size="sm"
            onClick={() => {
              onConfirm();
              handleClose();
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="sr-only">{message}</div>
    </Modal>
  );
};
