import React from 'react';
import { Eye, Edit3, Ban } from 'lucide-react';
import { DataTable } from '../../components/ui/DataTable';
import { formatCurrency } from '../../utils/formatters';

/**
 * ExpenseTable Component
 * Renders the tabular expense ledger with:
 * - Date, Category, Description, Payment Method, Online Method
 * - Reference, Amount, Entered By, Status, Actions
 * - Actions: View, Edit, Void
 * - Prohibits hard delete
 */
export const ExpenseTable = ({
  expenses = [],
  onViewExpense,
  onEditExpense,
  onVoidExpense,
  isLoading = false,
  canVoid = true,
}) => {
  const columns = [
    {
      key: 'expenseDate',
      title: 'Date',
      headerClassName: 'w-24 whitespace-nowrap',
      cellClassName: 'whitespace-nowrap',
      render: (val, row) => {
        const d = new Date(val || row.createdAt || Date.now());
        return (
          <div className="text-xs">
            <span className="font-semibold text-slate-800 block">
              {d.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
        );
      },
    },
    {
      key: 'categoryNameSnapshot',
      title: 'Category',
      headerClassName: 'w-32 whitespace-nowrap',
      render: (val, row) => {
        const cat = val || row.category || 'General';
        return (
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
            {cat}
          </span>
        );
      },
    },
    {
      key: 'description',
      title: 'Description',
      headerClassName: 'min-w-[160px] max-w-xs',
      render: (desc, row) => (
        <div className="text-xs max-w-xs">
          <p className="font-medium text-slate-800 truncate" title={desc || ''}>
            {desc || '—'}
          </p>
          {row.attachment && (
            <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-1 mt-0.5">
              Receipt attached
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'paymentMethod',
      title: 'Payment',
      headerClassName: 'w-24 text-center whitespace-nowrap',
      align: 'center',
      cellClassName: 'text-center whitespace-nowrap',
      render: (pm) => {
        const isOnline = (pm || '').toUpperCase() === 'ONLINE';
        return (
          <div className="flex items-center justify-center">
            <span
              className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                isOnline
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {isOnline ? 'Online' : 'Cash'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'referenceNumber',
      title: 'Reference',
      headerClassName: 'w-24 whitespace-nowrap',
      render: (ref) => (
        <span className="text-xs font-mono text-slate-600 truncate block max-w-[100px]" title={ref || ''}>
          {ref || '—'}
        </span>
      ),
    },
    {
      key: 'amount',
      title: 'Amount',
      headerClassName: 'w-28 text-right whitespace-nowrap',
      align: 'right',
      cellClassName: 'text-right whitespace-nowrap',
      render: (amt, row) => {
        const isVoided = (row.status || '').toUpperCase() === 'VOIDED';
        return (
          <span
            className={`text-xs font-extrabold ${
              isVoided
                ? 'text-slate-400 line-through'
                : 'text-slate-900'
            }`}
          >
            {formatCurrency(amt || 0)}
          </span>
        );
      },
    },
    {
      key: 'createdByName',
      title: 'By',
      headerClassName: 'w-24 text-center whitespace-nowrap',
      align: 'center',
      cellClassName: 'text-center whitespace-nowrap',
      render: (name, row) => {
        const role = String(row?.createdByRole || '').toLowerCase();
        const rawName = String(name || row?.createdByName || '').trim();
        const isAdmin = role.includes('admin') || rawName.toLowerCase().includes('admin');
        const isCashierRole = role.includes('cashier') || rawName.toLowerCase().includes('cashier');

        let displayLabel = 'Admin';
        if (!isAdmin && (isCashierRole || role === 'cashier')) {
          displayLabel = rawName ? (rawName.toLowerCase() === 'cashier' ? 'Cashier' : rawName) : 'Cashier';
        } else if (isAdmin) {
          displayLabel = rawName && rawName.toLowerCase() !== 'admin' ? rawName : 'Admin';
        } else {
          displayLabel = rawName || 'Admin';
        }

        return (
          <span
            className={`text-[11px] font-bold ${
              isAdmin ? 'text-purple-700' : 'text-blue-700'
            }`}
            title={`Entered by: ${isAdmin ? `Admin (${displayLabel})` : `Cashier (${displayLabel})`}`}
          >
            {isAdmin ? 'Admin' : 'Cashier'}
          </span>
        );
      },
    },
    {
      key: 'status',
      title: 'Status',
      headerClassName: 'w-20 text-center whitespace-nowrap',
      align: 'center',
      cellClassName: 'text-center whitespace-nowrap',
      render: (status) => {
        const isVoided = (status || '').toUpperCase() === 'VOIDED';
        return isVoided ? (
          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            VOIDED
          </span>
        ) : (
          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            ACTIVE
          </span>
        );
      },
    },
    {
      key: 'actions',
      title: 'Actions',
      headerClassName: 'w-24 text-right whitespace-nowrap',
      align: 'right',
      cellClassName: 'text-right whitespace-nowrap',
      render: (_, row) => {
        const isVoided = (row.status || '').toUpperCase() === 'VOIDED';

        return (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => onViewExpense(row)}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="View details & receipt"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            {!isVoided && (
              <>
                <button
                  type="button"
                  onClick={() => onEditExpense(row)}
                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                  title="Edit expense"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                {canVoid && (
                  <button
                    type="button"
                    onClick={() => onVoidExpense(row)}
                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Void expense"
                  >
                    <Ban className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={expenses}
      keyField="id"
      isLoading={isLoading}
      emptyMessage="No expense entries matching the active filter criteria."
    />
  );
};

export default ExpenseTable;
