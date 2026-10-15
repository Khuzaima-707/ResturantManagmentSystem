import React, { useState, useMemo } from 'react';
import {
  Trash2,
  Clock,
  Search,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from 'lucide-react';
import { useAppStore } from '../../../store';
import { formatCurrency } from '../../../domain/calculations';

function formatTimestamp(iso) {
  if (!iso) return 'N/A';
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch {
    return iso;
  }
}

/**
 * DeletionHistoryTab Component
 * Audit trail of all deleted invoices, reversals, and cleared items with exact timestamps.
 */
export const DeletionHistoryTab = () => {
  const { deletionHistory = [], clearDeletionHistory, user } = useAppStore();
  const isCashier = Boolean(
    (user?.role?.toLowerCase().includes('cashier') && !user?.role?.toLowerCase().includes('admin')) ||
    (user?.username?.toLowerCase() === 'cashier' && user?.username?.toLowerCase() !== 'admin')
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  // Filter deletion records by search query
  const filteredRecords = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return deletionHistory;

    return (deletionHistory || []).filter((rec) => {
      const matchTitle = (rec.title || '').toLowerCase().includes(query);
      const matchReason = (rec.reason || '').toLowerCase().includes(query);
      const matchInvoice = (rec.invoices || []).some((inv) =>
        (inv.invoiceNumber || '').toLowerCase().includes(query) ||
        (inv.lines || []).some((l) => (l.itemName || '').toLowerCase().includes(query))
      );
      return matchTitle || matchReason || matchInvoice;
    });
  }, [deletionHistory, searchQuery]);

  if (isCashier) return null;

  // Aggregate metrics
  const totalEvents = deletionHistory.length;
  const totalDeletedInvoices = deletionHistory.reduce(
    (sum, r) => sum + (r.totalInvoicesDeleted || (r.invoices || []).length || 0),
    0
  );
  const totalDeletedValue = deletionHistory.reduce(
    (sum, r) => sum + (Number(r.totalAmount) || 0),
    0
  );

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleClear = () => {
    if (!isConfirmingClear) {
      setIsConfirmingClear(true);
      setTimeout(() => setIsConfirmingClear(false), 3000);
      return;
    }
    clearDeletionHistory();
    setIsConfirmingClear(false);
  };

  return (
    <div className="space-y-5">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Deletion & Audit History
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-semibold">
              {totalEvents} {totalEvents === 1 ? 'Event' : 'Events'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Audit trail of all deleted invoices, reversed sales, and cleared items with exact timestamps and full itemized details.
          </p>
        </div>

        {/* Aggregate KPI chips */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-left">
            <div className="text-[10px] text-slate-400 font-medium">Invoices Cleared</div>
            <div className="text-xs font-bold text-slate-800">{totalDeletedInvoices}</div>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-orange-50/50 border border-orange-100 text-left">
            <div className="text-[10px] text-slate-400 font-medium">Total Value</div>
            <div className="text-xs font-bold text-[#FF5C28]">{formatCurrency(totalDeletedValue)}</div>
          </div>

          {deletionHistory.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                isConfirmingClear
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                  : 'bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border-slate-200'
              }`}
              title="Clear audit log"
            >
              {isConfirmingClear ? 'Confirm Clear Log?' : 'Clear Log'}
            </button>
          )}
        </div>
      </div>

      {/* Search Input Bar */}
      {deletionHistory.length > 0 && (
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by invoice number (#INV-...), item name, or reason..."
            className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#FF5C28] shadow-2xs"
          />
        </div>
      )}

      {/* History Records List */}
      {filteredRecords.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-400 mx-auto mb-3">
            <Trash2 className="w-6 h-6 stroke-[1.8]" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            {deletionHistory.length === 0
              ? 'No Deletion History Yet'
              : 'No matching deletion records found'}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {deletionHistory.length === 0
              ? 'Whenever an invoice is removed, reversed, or operational data is reset, complete details and item lists will appear here.'
              : 'Try searching with a different invoice number or item name.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRecords.map((record) => {
            const isExpanded = expandedId === record.id;
            const isReversal = record.type === 'invoice_reversal';
            const invoicesList = record.invoices || [];

            return (
              <div
                key={record.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden transition-all duration-150"
              >
                {/* Header Row */}
                <div
                  onClick={() => toggleExpand(record.id)}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors cursor-pointer select-none"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs ${
                        isReversal
                          ? 'bg-amber-50 border-amber-100 text-amber-600'
                          : 'bg-rose-50 border-rose-100 text-rose-600'
                      }`}
                    >
                      {isReversal ? (
                        <RotateCcw className="w-4 h-4" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-xs sm:text-sm text-slate-900 leading-tight">
                          {record.title}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold">
                          {invoicesList.length} {invoicesList.length === 1 ? 'Invoice' : 'Invoices'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 text-slate-500 font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatTimestamp(record.deletedAt)}</span>
                        </span>
                        {record.reason && (
                          <span className="text-slate-500 italic">
                            Reason: "{record.reason}"
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                    <span className="font-extrabold text-xs sm:text-sm text-slate-900">
                      {formatCurrency(record.totalAmount || 0)}
                    </span>
                    <button
                      type="button"
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                      title={isExpanded ? 'Collapse details' : 'Expand details'}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Detailed Item View */}
                {isExpanded && (
                  <div className="border-t border-slate-100 p-4 bg-slate-50/40 space-y-4 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">
                        Deleted Invoices & Item Breakdown ({invoicesList.length})
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Exact state at time of deletion
                      </span>
                    </div>

                    {invoicesList.map((inv, invIdx) => (
                      <div
                        key={inv.id || invIdx}
                        className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs space-y-3"
                      >
                        {/* Sub-header of invoice */}
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#FF5C28]">
                              #{inv.invoiceNumber}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-orange-50 text-[#FF5C28] text-[10px] font-semibold border border-orange-100">
                              {inv.orderType || 'Dine-In'}
                            </span>
                            <span className="text-slate-400 text-[11px]">
                              Paid via {inv.paymentMethod || 'Cash'}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-slate-500 text-[11px] mr-2">
                              Originally Billed: {formatTimestamp(inv.completedAt)}
                            </span>
                            <span className="font-bold text-slate-900 text-xs">
                              {formatCurrency(inv.grandTotal || 0)}
                            </span>
                          </div>
                        </div>

                        {/* Items Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 pb-1.5 select-none">
                                <th className="py-1.5 pr-2 w-8">#</th>
                                <th className="py-1.5 px-2">Deleted Item</th>
                                <th className="py-1.5 px-2 text-center w-16">Qty</th>
                                <th className="py-1.5 px-2 text-right w-20">Rate</th>
                                <th className="py-1.5 pl-2 text-right w-24">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                              {(inv.lines || []).map((line, lIdx) => (
                                <tr key={line.id || lIdx}>
                                  <td className="py-2 pr-2 text-slate-400 font-mono text-[11px]">
                                    {lIdx + 1}
                                  </td>
                                  <td className="py-2 px-2">
                                    <div className="font-bold text-slate-800">
                                      {line.itemName}
                                    </div>
                                    {line.portion && (
                                      <div className="text-[11px] text-slate-400">
                                        {line.portion}
                                      </div>
                                    )}
                                    {Array.isArray(line.addons) && line.addons.length > 0 && (
                                      <div className="text-[10px] text-[#FF5C28] mt-0.5">
                                        + {line.addons.join(', ')}
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-2 px-2 text-center text-slate-700 font-medium">
                                    {line.quantity || 1}
                                  </td>
                                  <td className="py-2 px-2 text-right text-slate-600">
                                    {formatCurrency(line.unitPrice || 0)}
                                  </td>
                                  <td className="py-2 pl-2 text-right font-bold text-slate-900">
                                    {formatCurrency(line.lineSubtotal || 0)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DeletionHistoryTab;
