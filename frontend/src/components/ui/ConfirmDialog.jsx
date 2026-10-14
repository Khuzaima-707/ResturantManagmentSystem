import React, { useState } from 'react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { cn } from '../../utils/cn';

/**
 * Reusable Confirmation Dialog
 * Supports danger actions, optional typed phrase match (e.g. DELETE ALL DATA)
 */
export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger', // 'danger' | 'warning' | 'info'
  requiredPhrase = '',
  isLoading = false,
}) => {
  const [typedPhrase, setTypedPhrase] = useState('');

  const typeConfig = {
    danger: {
      icon: AlertCircle,
      iconBg: 'bg-rose-50 text-rose-600 border-rose-200',
      confirmVariant: 'danger',
    },
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-amber-50 text-amber-600 border-amber-200',
      confirmVariant: 'primary',
    },
    info: {
      icon: Info,
      iconBg: 'bg-blue-50 text-blue-600 border-blue-200',
      confirmVariant: 'primary',
    },
  };

  const currentType = typeConfig[type] || typeConfig.danger;
  const Icon = currentType.icon;

  const isConfirmedPhraseMatch = requiredPhrase
    ? typedPhrase.trim() === requiredPhrase.trim()
    : true;

  const handleConfirm = () => {
    if (isConfirmedPhraseMatch) {
      onConfirm?.();
      setTypedPhrase('');
    }
  };

  const handleClose = () => {
    setTypedPhrase('');
    onClose?.();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      maxWidth="max-w-md"
    >
      <div className="flex flex-col items-center text-center pt-2">
        <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center border mb-4', currentType.iconBg)}>
          <Icon className="w-6 h-6" />
        </div>

        <h3 className="text-base font-bold text-slate-900 tracking-tight mb-2">
          {title}
        </h3>

        <p className="text-xs sm:text-sm text-slate-500 mb-4 leading-relaxed">
          {message}
        </p>

        {requiredPhrase && (
          <div className="w-full text-left mb-5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Type <span className="font-mono text-rose-600 font-bold">{requiredPhrase}</span> to confirm:
            </label>
            <Input
              value={typedPhrase}
              onChange={(e) => setTypedPhrase(e.target.value)}
              placeholder={requiredPhrase}
              className="text-xs font-mono"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-3 w-full pt-2">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1"
          >
            {cancelText}
          </Button>
          <Button
            variant={currentType.confirmVariant}
            onClick={handleConfirm}
            isLoading={isLoading}
            disabled={!isConfirmedPhraseMatch}
            className="flex-1"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
