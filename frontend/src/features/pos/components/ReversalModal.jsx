import React, { useState } from 'react';
import {
  AlertTriangle,
  RotateCcw,
  Receipt,
} from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { FormField } from '../../../components/ui/FormField';
import { formatCurrency } from '../../../domain/calculations';
import { createReversalSnapshot } from '../../../domain/selectors/invoiceSelectors';
import { useAppStore } from '../../../store';

const PRESET_REASONS = [
  'Customer Cancelled',
  'Wrong Order',
  'Billing Error',
  'Duplicate Sale',
  'Food Quality Issue',
  'Other',
];

/**
 * ReversalModal Component
 * Full Reversal Confirmation with mandatory reason selection,
 * irreversible financial warning, and ledger snapshot creation.
 */
export const ReversalModal = ({
  order,
  isOpen,
  onClose,
  onReversalCompleted,
}) => {
  const { addReversal, user } = useAppStore();

  const [selectedReason, setSelectedReason] = useState(PRESET_REASONS[0]);
  const [customNote, setCustomNote] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !order) return null;

  const handleConfirmReversal = () => {
    setError('');

    const effectiveReason =
      selectedReason === 'Other'
        ? customNote.trim()
        : customNote.trim()
        ? `${selectedReason}: ${customNote.trim()}`
        : selectedReason;

    if (!effectiveReason) {
      setError('Please provide a specific reason for reversing this invoice.');
      return;
    }

    try {
      setIsSubmitting(true);
      const reversalRecord = createReversalSnapshot(order, {
        reason: effectiveReason,
        note: customNote.trim(),
        reversedBy: user?.name || 'Admin Cashier',
      });

      addReversal(reversalRecord);
      setIsSubmitting(false);

      if (typeof onReversalCompleted === 'function') {
        onReversalCompleted(reversalRecord);
      }
      onClose();
    } catch (err) {
      setIsSubmitting(false);
      setError(err.message || 'Failed to process reversal. Please try again.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reverse Invoice"
      icon={RotateCcw}
      maxWidth="max-w-md"
      footer={
        <div className="flex items-center justify-between w-full pt-1">
          <Button
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isSubmitting}
            type="button"
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="md"
            leftIcon={RotateCcw}
            onClick={handleConfirmReversal}
            disabled={isSubmitting}
            type="button"
          >
            {isSubmitting ? 'Processing...' : 'Confirm Reversal'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {/* Warning Banner */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-xs text-amber-900">
              Irreversible Ledger Action
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              This invoice will remain in history visibly marked as{' '}
              <span className="font-bold text-rose-700">REVERSED</span>. A
              dedicated reversal transaction record will be added to the financial ledger. The
              original invoice record will not be deleted.
            </p>
          </div>
        </div>

        {/* Invoice Summary Card */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between text-slate-700 font-semibold">
            <span className="flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-slate-500" />
              <span>Invoice #{order.invoiceNumber}</span>
            </span>
            <span className="text-[11px] text-slate-500">{order.orderType || 'Dine-In'}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 text-[11px]">
            <div>
              <span className="text-slate-400 block">Original Tax:</span>
              <span className="font-semibold text-slate-700">
                {formatCurrency(order.taxAmount || 0)} ({order.taxRateSnapshot || 0}%)
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Total to Reverse:</span>
              <span className="font-bold text-[#FF5C28] text-xs">
                {formatCurrency(order.grandTotal || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Mandatory Reversal Reason Selection */}
        <div className="space-y-3 pt-1">
          <FormField label="Reason for Reversal *" required error={error}>
            <select
              value={selectedReason}
              onChange={(e) => {
                setSelectedReason(e.target.value);
                if (error) setError('');
              }}
              className="w-full h-10 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#FF5C28] focus:ring-1 focus:ring-[#FF5C28] cursor-pointer"
            >
              {PRESET_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label={
              selectedReason === 'Other'
                ? 'Specify Reason *'
                : 'Additional Note (Optional)'
            }
          >
            <textarea
              rows={2}
              value={customNote}
              onChange={(e) => {
                setCustomNote(e.target.value);
                if (error) setError('');
              }}
              placeholder={
                selectedReason === 'Other'
                  ? 'Please describe why this invoice is being reversed...'
                  : 'Add context or authorized staff initials...'
              }
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#FF5C28] focus:ring-1 focus:ring-[#FF5C28] resize-none"
            />
          </FormField>
        </div>
      </div>
    </Modal>
  );
};

export default ReversalModal;
