import React from 'react';
import { cn } from '../../utils/cn';

/**
 * Reusable DataTable Shell
 * Matches the tables in Menu and Reports screenshots
 */
export const DataTable = ({
  columns = [],
  data = [],
  keyField = 'id',
  isLoading = false,
  emptyMessage = 'No records found',
  className,
  onRowClick,
}) => {
  return (
    <div className={cn('w-full bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.02),0_2px_8px_-2px_rgba(15,23,42,0.03)]', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 text-xs font-semibold select-none">
              {columns.map((col, index) => (
                <th
                  key={col.key || index}
                  className={cn(
                    'py-2.5 px-3.5 font-semibold select-none text-xs',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center',
                    col.headerClassName
                  )}
                >
                  {col.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-slate-400">
                  <div className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-[#FF5C28] border-t-transparent rounded-full animate-spin" />
                    <span>Loading data...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-slate-400 text-xs">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={row[keyField] ?? rowIndex}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'transition-colors duration-150',
                    onRowClick ? 'cursor-pointer hover:bg-slate-50/70' : 'hover:bg-slate-50/40'
                  )}
                >
                  {columns.map((col, colIndex) => (
                    <td
                      key={col.key || colIndex}
                      className={cn(
                        'py-2.5 px-3.5 align-middle text-slate-800 text-xs',
                        col.align === 'right' && 'text-right',
                        col.align === 'center' && 'text-center',
                        col.cellClassName
                      )}
                    >
                      {col.render
                        ? col.render(row[col.key], row, rowIndex)
                        : (row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;
