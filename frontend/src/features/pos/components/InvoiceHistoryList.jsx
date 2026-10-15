import React, { useState, useMemo } from 'react';
import {
  Search,
  Eye,
  Printer,
  Download,
  RotateCcw,
  Receipt,
  Trash2,
  RotateCcw as ResetIcon,
} from 'lucide-react';
import { useAppStore } from '../../../store';
import { DataTable } from '../../../components/ui/DataTable';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { SearchInput } from '../../../components/ui/SearchInput';
import { formatCurrency } from '../../../domain/calculations';
import {
  getInvoiceHistory,
  filterInvoices,
  isInvoiceReversible,
  getReversalByInvoice,
} from '../../../domain/selectors/invoiceSelectors';
import { downloadInvoicePdf } from '../../../services/pdf/invoicePdfGenerator';
import { InvoiceModal } from './InvoiceModal';
import { ReversalModal } from './ReversalModal';

/**
 * InvoiceHistoryList Component
 * Displays searchable, filterable sales transaction ledger.
 * Supports viewing details, print, PDF download, full reversal, and deletion.
 */
export const InvoiceHistoryList = () => {
  const { orders, reversals, settings, deleteInvoice, user } = useAppStore();
  const isCashier = Boolean(
    (user?.role?.toLowerCase().includes('cashier') && !user?.role?.toLowerCase().includes('admin')) ||
    (user?.username?.toLowerCase() === 'cashier' && user?.username?.toLowerCase() !== 'admin')
  );
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [datePreset, setDatePreset] = useState('All Time');
  const [paymentMethod, setPaymentMethod] = useState('All');
  const [orderType, setOrderType] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals
  const [selectedInvoiceForView, setSelectedInvoiceForView] = useState(null);
  const [selectedInvoiceForReversal, setSelectedInvoiceForReversal] = useState(null);

  // Sorted and filtered list
  const historyList = useMemo(() => {
    const sorted = getInvoiceHistory(orders);
    return filterInvoices(sorted, {
      searchQuery,
      datePreset,
      paymentMethod,
      orderType,
      status: statusFilter,
    });
  }, [orders, searchQuery, datePreset, paymentMethod, orderType, statusFilter]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setDatePreset('All Time');
    setPaymentMethod('All');
    setOrderType('All');
    setStatusFilter('All');
  };

  const columns = [
    {
      key: 'invoiceNumber',
      title: 'Invoice #',
      headerClassName: 'w-28 font-bold',
      render: (invNum, row) => (
        <button
          type="button"
          onClick={() => setSelectedInvoiceForView(row)}
          className="font-bold text-xs text-[#FF5C28] hover:underline cursor-pointer flex items-center gap-1"
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>{invNum}</span>
        </button>
      ),
    },
    {
      key: 'completedAt',
      title: 'Date / Time',
      headerClassName: 'w-36',
      render: (dateVal, row) => {
        const d = new Date(dateVal || row.createdAt || Date.now());
        return (
          <div className="text-[11px] text-slate-700 whitespace-nowrap">
            <span className="font-semibold block">{d.toLocaleDateString()}</span>
            <span className="text-slate-400">
              {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
            </span>
          </div>
        );
      },
    },
    {
      key: 'orderType',
      title: 'Order Type',
      headerClassName: 'w-24 text-center',
      align: 'center',
      cellClassName: 'text-center',
      render: (type) => (
        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
          {type || 'Dine-In'}
        </span>
      ),
    },
    {
      key: 'lines',
      title: 'Items',
      headerClassName: 'min-w-[140px]',
      render: (lines) => {
        const count = Array.isArray(lines) ? lines.length : 0;
        const preview = (lines || []).map((l) => l.itemNameSnapshot).slice(0, 2).join(', ');
        return (
          <div className="text-[11px]">
            <span className="font-semibold text-slate-800">{count} {count === 1 ? 'item' : 'items'}</span>
            {preview && (
              <span className="text-slate-400 block truncate max-w-xs text-[10px]">
                {preview}
                {count > 2 ? '...' : ''}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'paymentMethod',
      title: 'Payment',
      headerClassName: 'w-24 text-center',
      align: 'center',
      cellClassName: 'text-center',
      render: (method) => (
        <span className="text-[11px] font-medium text-slate-700">{method || 'Cash'}</span>
      ),
    },
    {
      key: 'grandTotal',
      title: 'Grand Total',
      headerClassName: 'w-28 text-right',
      align: 'right',
      cellClassName: 'text-right',
      render: (total) => (
        <span className="font-bold text-xs text-slate-900 whitespace-nowrap">
          {formatCurrency(total || 0)}
        </span>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      headerClassName: 'w-24 text-center',
      align: 'center',
      cellClassName: 'text-center',
      render: (status) => {
        const isReversed = (status || '').toLowerCase() === 'reversed';
        return isReversed ? (
          <Badge variant="danger" size="sm">
            Reversed
          </Badge>
        ) : (
          <Badge variant="success" size="sm">
            Completed
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      title: 'Actions',
      headerClassName: 'w-36 text-center',
      align: 'center',
      cellClassName: 'text-center',
      render: (_, row) => {
        const reversible = isInvoiceReversible(row, reversals);
        const linkedRev = getReversalByInvoice(reversals, row.id);

        return (
          <div className="flex items-center justify-center gap-1.5">
            {/* View Modal */}
            <button
              type="button"
              onClick={() => setSelectedInvoiceForView(row)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-[#FF5C28] hover:bg-orange-50 transition-colors cursor-pointer"
              title="View Invoice"
              aria-label="View Invoice"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>

            {/* Browser Print */}
            <button
              type="button"
              onClick={() => {
                setSelectedInvoiceForView(row);
                setTimeout(() => window.print(), 200);
              }}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Print Receipt"
              aria-label="Print Receipt"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>

            {/* Download PDF */}
            <button
              type="button"
              onClick={() => downloadInvoicePdf(row, settings, linkedRev)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Download PDF"
              aria-label="Download PDF"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {/* Reverse Invoice (if eligible) */}
            {reversible ? (
              <button
                type="button"
                onClick={() => setSelectedInvoiceForReversal(row)}
                className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                title="Reverse Invoice"
                aria-label="Reverse Invoice"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            ) : null}

            {/* Delete Invoice (Admin only) */}
            {!isCashier && (
              <button
                type="button"
                onClick={() => setInvoiceToDelete(row)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                title="Delete Invoice"
                aria-label="Delete Invoice"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search by Invoice # or item */}
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search invoice # or item name..."
            className="w-full sm:max-w-xs"
          />

          {/* Quick Filters Group */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Date Preset */}
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
              className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:border-[#FF5C28] cursor-pointer"
            >
              <option value="All Time">All Time</option>
              <option value="Today">Today</option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
            </select>

            {/* Payment Method */}
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:border-[#FF5C28] cursor-pointer"
            >
              <option value="All">All Payments</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="Online">Online</option>
            </select>

            {/* Order Type */}
            <select
              value={orderType}
              onChange={(e) => setOrderType(e.target.value)}
              className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:border-[#FF5C28] cursor-pointer"
            >
              <option value="All">All Types</option>
              <option value="Dine-In">Dine-In</option>
              <option value="Takeaway">Takeaway</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:border-[#FF5C28] cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="reversed">Reversed</option>
            </select>

            {/* Reset Button */}
            {(searchQuery ||
              datePreset !== 'All Time' ||
              paymentMethod !== 'All' ||
              orderType !== 'All' ||
              statusFilter !== 'All') && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="h-9 px-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-500 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                title="Reset Filters"
              >
                <ResetIcon className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Invoices Table or Empty State */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {orders.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-700">No invoices yet.</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Completed sales from the POS register will be saved here in the permanent transaction ledger.
            </p>
          </div>
        ) : historyList.length === 0 ? (
          <div className="p-12 text-center">
            <Search className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-700">No matching invoices found.</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Try adjusting your search terms or relaxing your filter selections.
            </p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={historyList}
            keyField="id"
          />
        )}
      </div>

      {/* Invoice Detail / Print / Download Modal */}
      {selectedInvoiceForView && (
        <InvoiceModal
          order={selectedInvoiceForView}
          isOpen={Boolean(selectedInvoiceForView)}
          onClose={() => setSelectedInvoiceForView(null)}
          onInvoiceUpdated={(rev) => {
            // Refresh view
            const updated = orders.find((o) => o.id === rev.originalOrderId);
            setSelectedInvoiceForView(updated || null);
          }}
        />
      )}

      {/* Reversal Confirmation Modal */}
      {selectedInvoiceForReversal && (
        <ReversalModal
          order={selectedInvoiceForReversal}
          isOpen={Boolean(selectedInvoiceForReversal)}
          onClose={() => setSelectedInvoiceForReversal(null)}
          onReversalCompleted={() => {
            setSelectedInvoiceForReversal(null);
          }}
        />
      )}

      {/* Delete Invoice Confirmation Modal (Admin only) */}
      {!isCashier && invoiceToDelete && (
        <Modal
          isOpen={Boolean(invoiceToDelete)}
          onClose={() => setInvoiceToDelete(null)}
          title={`Delete Invoice #${invoiceToDelete.invoiceNumber}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete invoice <strong className="text-slate-900">#{invoiceToDelete.invoiceNumber}</strong> (amount: <strong>{formatCurrency(invoiceToDelete.grandTotal || 0)}</strong>)?
            </p>
            <div className="p-3 rounded-xl bg-orange-50 border border-orange-100 text-[11px] text-[#FF5C28]">
              <strong>Audit Safety:</strong> Full invoice line items, timestamp, and details will be safely archived in <strong>Settings &gt; Deletion History</strong>.
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setInvoiceToDelete(null)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isCashier) return;
                  deleteInvoice(invoiceToDelete.id, 'Manually deleted from Invoice History');
                  setInvoiceToDelete(null);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer shadow-xs"
              >
                Yes, Delete Invoice
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default InvoiceHistoryList;
