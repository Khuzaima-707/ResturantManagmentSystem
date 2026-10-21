import React from 'react';
import { X, AlertCircle, CheckCircle2, Ban, ExternalLink } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

/**
 * ExpenseDetailModal Component
 * Shows full audit trail and details of an expense record:
 * - Financial information & payment metadata
 * - Creator and editor snapshots
 * - Void reason & timestamps (if voided)
 * - Attachment preview
 */
export const ExpenseDetailModal = ({
  isOpen,
  onClose,
  expense,
}) => {
  if (!isOpen || !expense) return null;

  const isVoided = (expense.status || '').toUpperCase() === 'VOIDED';

  const rawDate = expense.expenseDate || expense.createdAt;
  const d = rawDate ? new Date(rawDate) : new Date(0);
  const dateFormatted = rawDate
    ? d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'N/A';

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-bold text-slate-900">Expense Details</h2>
            {isVoided ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                <Ban className="w-3 h-3" /> VOIDED
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" /> ACTIVE
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Top Amount Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/70 border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Amount Paid
              </span>
              <div className="text-2xl font-extrabold text-slate-900 mt-0.5">
                {formatCurrency(expense.amount)}
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-white text-slate-800 border border-slate-200 shadow-2xs">
                {expense.paymentMethod}
              </span>
              {expense.onlineMethodSnapshot && (
                <div className="text-xs font-semibold text-blue-600 mt-1">
                  {expense.onlineMethodSnapshot}
                </div>
              )}
            </div>
          </div>

          {/* Voided Alert Banner */}
          {isVoided && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Voided on {expense.voidedAt ? new Date(expense.voidedAt).toLocaleString() : 'N/A'}</span>
              </div>
              <p className="text-rose-700 text-[11px] pl-5.5">
                <span className="font-semibold">Reason:</span> {expense.voidReason || 'No reason provided'}
              </p>
              <p className="text-rose-600 text-[10px] pl-5.5">
                Voided By: {expense.voidedByName || 'Admin'}
              </p>
            </div>
          )}

          {/* Meta Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[11px]">Date</span>
              <span className="font-semibold text-slate-800">{dateFormatted}</span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[11px]">Category</span>
              <span className="font-semibold text-slate-800">
                {expense.categoryNameSnapshot || expense.category}
              </span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[11px]">Reference / Bill No.</span>
              <span className="font-semibold text-slate-800">
                {expense.referenceNumber || 'N/A'}
              </span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[11px]">Expense ID</span>
              <span className="font-mono text-slate-600 truncate block text-[11px]">
                {expense.id}
              </span>
            </div>
          </div>

          {/* Description */}
          {expense.description && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
              <span className="text-slate-400 block text-[11px] mb-1">Description / Note</span>
              <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                {expense.description}
              </p>
            </div>
          )}

          {/* Attachment Preview */}
          {expense.attachment && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-semibold">Attached Receipt / Bill</span>
                <a
                  href={expense.attachment}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#FF5C28] hover:underline flex items-center gap-1 text-[11px]"
                >
                  <span>Open full size</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 bg-slate-900/5 flex items-center justify-center">
                <img
                  src={expense.attachment}
                  alt="Receipt"
                  className="max-h-48 object-contain"
                />
              </div>
            </div>
          )}

          {/* Full Audit Information */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-500 space-y-1">
            <div className="font-bold text-slate-700 text-xs mb-1">Audit Trail</div>
            <div className="flex justify-between">
              <span>By:</span>
              <span className="font-medium text-slate-700">
                {expense.createdByName || 'Admin'} ({expense.createdByRole || 'Staff'})
              </span>
            </div>
            <div className="flex justify-between">
              <span>Created At:</span>
              <span className="font-medium text-slate-700">
                {expense.createdAt || expense.expenseDate
                  ? new Date(expense.createdAt || expense.expenseDate).toLocaleString()
                  : 'N/A'}
              </span>
            </div>
            {expense.updatedAt && (
              <div className="flex justify-between">
                <span>Last Updated:</span>
                <span className="font-medium text-slate-700">
                  {new Date(expense.updatedAt).toLocaleString()} ({expense.updatedByName || 'Admin'})
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/70 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpenseDetailModal;
