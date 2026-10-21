import React, { useState } from 'react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';
import { useAppStore } from '../../store';
import { formatCurrency } from '../../utils/formatters';

/**
 * VoidExpenseModal Component
 * Prompts user for mandatory Void Reason before marking expense as VOIDED.
 * Strictly preserves audit history - does not delete from MongoDB.
 */
export const VoidExpenseModal = ({
  isOpen,
  onClose,
  expense,
  onSuccess,
}) => {
  const { user, voidExpense } = useAppStore();
  const [voidReason, setVoidReason] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !expense) return null;

  const handleVoid = async (e) => {
    e.preventDefault();
    if (!voidReason.trim()) {
      setError('Please provide a specific reason for voiding this expense.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      await voidExpense(expense.id, {
        voidReason: voidReason.trim(),
        voidedByName: user?.name || user?.username || 'Administrator',
        voidedByUserId: user?.id || user?._id || '',
      });

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to void expense. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-rose-100 bg-rose-50/70">
          <div className="flex items-center gap-2 text-rose-700">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <h2 className="text-sm font-bold">Void Expense Record</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleVoid} className="p-5 space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Category</span>
              <span className="font-semibold text-slate-800">
                {expense.categoryNameSnapshot || expense.category}
              </span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Amount</span>
              <span className="font-bold text-slate-900">
                {formatCurrency(expense.amount)}
              </span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Payment</span>
              <span className="font-medium text-slate-800">
                {expense.paymentMethod}
                {expense.onlineMethodSnapshot ? ` (${expense.onlineMethodSnapshot})` : ''}
              </span>
            </div>
          </div>

          <div className="text-xs text-rose-700 bg-rose-50/60 p-3 rounded-xl border border-rose-200/60">
            <p className="font-semibold mb-0.5">Audit Notice:</p>
            <p className="text-[11px] leading-relaxed text-rose-600">
              Voiding will zero-out this entry's impact on Active Total Expenses and Operating Profit.
              The entry will NOT be deleted and will remain in historical audit logs.
            </p>
          </div>

          {error && (
            <p className="text-xs text-rose-600 font-semibold">{error}</p>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Void Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="e.g. Duplicate bill entered, vendor refund issued, wrong amount..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-rose-500 transition-colors resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-full transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !voidReason.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-full transition-colors cursor-pointer"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Confirm Void</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VoidExpenseModal;
