import React, { useState, useMemo, useEffect } from 'react';
import {
  Banknote,
  DollarSign,
  Clock,
  User,
  CheckCircle2,
  AlertTriangle,
  Printer,
  History,
  Lock,
  Unlock,
  Receipt,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { useAppStore } from '../store';
import { ShiftRepository } from '../services/repositories';
import { cn } from '../utils/cn';

export function ShiftsPage() {
  const { currentShift, openShift, closeShift, user, orders, expenses, reversals } = useAppStore();

  const [shiftsHistory, setShiftsHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Open Shift Form
  const [openingFloat, setOpeningFloat] = useState('5000');
  const [cashierName, setCashierName] = useState(user?.name || 'Cashier 1');
  const [openNotes, setOpenNotes] = useState('');
  const [openingSubmitting, setOpeningSubmitting] = useState(false);

  // Close Shift Modal
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [actualCashCounted, setActualCashCounted] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [closingSubmitting, setClosingSubmitting] = useState(false);

  // Viewing Z-Report Modal
  const [viewingZReport, setViewingZReport] = useState(null);

  // Fetch past shifts archive
  useEffect(() => {
    let isMounted = true;
    setLoadingHistory(true);
    ShiftRepository.getAll()
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setShiftsHistory(data);
        }
      })
      .catch((err) => console.warn('Failed to load past shifts:', err))
      .finally(() => {
        if (isMounted) setLoadingHistory(false);
      });
    return () => {
      isMounted = false;
    };
  }, [currentShift]);

  // Real-time Shift Calculations
  const shiftMetrics = useMemo(() => {
    if (!currentShift) return null;

    const shiftStartTime = new Date(currentShift.openedAt).getTime();
    const reversedOrderIds = new Set(
      Array.isArray(reversals) ? reversals.map((r) => r.originalOrderId || r.orderId) : []
    );
    // Non-reversed completed orders since shift opened
    const shiftOrders = (orders || []).filter((o) => {
      if (o.status !== 'completed' || reversedOrderIds.has(o.id)) return false;
      const orderTime = new Date(o.completedAt || o.createdAt).getTime();
      return orderTime >= shiftStartTime;
    });

    const cashSales = shiftOrders
      .filter((o) => o.paymentMethod === 'Cash')
      .reduce((sum, o) => sum + (Number(o.grandTotal) || 0), 0);

    const cardSales = shiftOrders
      .filter((o) => o.paymentMethod === 'Card')
      .reduce((sum, o) => sum + (Number(o.grandTotal) || 0), 0);

    const onlineSales = shiftOrders
      .filter((o) => o.paymentMethod === 'Online')
      .reduce((sum, o) => sum + (Number(o.grandTotal) || 0), 0);

    const totalSales = cashSales + cardSales + onlineSales;

    // Shift cash expenses
    const shiftExpenses = (expenses || []).filter((e) => {
      if (e.paymentMethod !== 'Cash') return false;
      const expTime = new Date(e.date || e.createdAt).getTime();
      return expTime >= shiftStartTime;
    });
    const cashExpenses = shiftExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const floatNum = Number(currentShift.openingFloat) || 0;
    const expectedCashInDrawer = floatNum + cashSales - cashExpenses;

    return {
      orderCount: shiftOrders.length,
      cashSales,
      cardSales,
      onlineSales,
      totalSales,
      cashExpenses,
      expectedCashInDrawer,
      openingFloat: floatNum,
    };
  }, [currentShift, orders, expenses, reversals]);

  const handleOpenShiftSubmit = async (e) => {
    e.preventDefault();
    const floatNum = Number(openingFloat);
    if (isNaN(floatNum) || floatNum < 0) {
      alert('Please enter a valid starting float amount');
      return;
    }

    try {
      setOpeningSubmitting(true);
      await openShift({
        cashierName: cashierName.trim() || 'Cashier 1',
        openingFloat: floatNum,
        notes: openNotes.trim(),
      });
    } catch (err) {
      alert(err.message || 'Failed to open register shift');
    } finally {
      setOpeningSubmitting(false);
    }
  };

  const handleCloseShiftSubmit = async (e) => {
    e.preventDefault();
    const countedNum = Number(actualCashCounted);
    if (isNaN(countedNum) || countedNum < 0) {
      alert('Please enter the counted cash amount in drawer');
      return;
    }

    try {
      setClosingSubmitting(true);
      const closed = await closeShift({
        actualCashCounted: countedNum,
        notes: closingNotes.trim(),
      });
      setIsCloseModalOpen(false);
      setViewingZReport(closed);
    } catch (err) {
      alert(err.message || 'Failed to close register shift');
    } finally {
      setClosingSubmitting(false);
    }
  };

  const countedVal = Number(actualCashCounted) || 0;
  const expectedVal = shiftMetrics?.expectedCashInDrawer || 0;
  const discrepancyVal = countedVal - expectedVal;

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Banknote className="w-6 h-6 text-[#FF5C28]" />
            Cash Register & Shift Closing (Z-Report)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Cash drawer sessions, opening floats, drawer count balancing, and end-of-day Z-Reports.
          </p>
        </div>

        {currentShift && (
          <button
            onClick={() => {
              setActualCashCounted(String(shiftMetrics?.expectedCashInDrawer || 0));
              setIsCloseModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold shadow-md shadow-rose-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Lock className="w-4 h-4" />
            Close Shift & Generate Z-Report
          </button>
        )}
      </div>

      {/* Main Active Shift Panel or Open Shift Prompt */}
      {currentShift ? (
        <div className="space-y-6">
          {/* Active Shift Banner Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
                  <Unlock className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-slate-900">
                      Register Shift #{currentShift.shiftNumber || 1}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                      Active Live
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Cashier: <strong className="text-slate-800">{currentShift.cashierName}</strong> • Opened:{' '}
                    {new Date(currentShift.openedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    ({new Date(currentShift.openedAt).toLocaleDateString()})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setActualCashCounted(String(shiftMetrics?.expectedCashInDrawer || 0));
                    setIsCloseModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs"
                >
                  End Shift Closing
                </button>
              </div>
            </div>

            {/* Shift Financial Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Opening Float
                </span>
                <div className="text-xl font-black text-slate-900 mt-1">
                  Rs {shiftMetrics?.openingFloat.toLocaleString('en-PK')}
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">Initial Drawer Cash</p>
              </div>

              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                  Cash Sales
                </span>
                <div className="text-xl font-black text-emerald-600 mt-1">
                  Rs {shiftMetrics?.cashSales.toLocaleString('en-PK')}
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Total Billed: Rs {shiftMetrics?.totalSales.toLocaleString('en-PK')}
                </p>
              </div>

              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">
                  Cash Paid Out
                </span>
                <div className="text-xl font-black text-rose-600 mt-1">
                  Rs {shiftMetrics?.cashExpenses.toLocaleString('en-PK')}
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">Petty Cash Expenses</p>
              </div>

              <div className="bg-orange-50/60 p-4 rounded-2xl border border-orange-200/60">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#FF5C28]">
                  Expected Drawer Cash
                </span>
                <div className="text-xl font-black text-slate-900 mt-1">
                  Rs {shiftMetrics?.expectedCashInDrawer.toLocaleString('en-PK')}
                </div>
                <p className="text-[10px] text-[#FF5C28] mt-0.5">Float + Cash Sales - Paid Out</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Open Shift Prompt Card */
        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs max-w-xl mx-auto">
          <div className="text-center max-w-sm mx-auto mb-6">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-200 text-[#FF5C28] flex items-center justify-center mx-auto mb-3 shadow-2xs">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-slate-900">Cash Register is Closed</h2>
            <p className="text-xs text-slate-500 mt-1">
              Please declare your opening cash float to begin cashiering and bill transactions.
            </p>
          </div>

          <form onSubmit={handleOpenShiftSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Active Cashier Name *
              </label>
              <input
                type="text"
                required
                value={cashierName}
                onChange={(e) => setCashierName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF5C28]/20 focus:border-[#FF5C28]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Opening Cash Float (PKR) *
              </label>
              <input
                type="number"
                required
                min="0"
                value={openingFloat}
                onChange={(e) => setOpeningFloat(e.target.value)}
                placeholder="e.g. 5000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-base font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF5C28]/20 focus:border-[#FF5C28]"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Cash provided in drawer for giving change to customers.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Opening Notes (Optional)
              </label>
              <input
                type="text"
                value={openNotes}
                onChange={(e) => setOpenNotes(e.target.value)}
                placeholder="e.g. Morning Shift opening with clean bills"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#FF5C28]/20 focus:border-[#FF5C28]"
              />
            </div>

            <button
              type="submit"
              disabled={openingSubmitting}
              className="w-full py-3 rounded-xl bg-[#FF5C28] hover:bg-[#E04B1A] text-white text-sm font-bold shadow-md shadow-orange-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 mt-2"
            >
              {openingSubmitting ? 'Opening Shift...' : 'Open Cash Register & Begin'}
            </button>
          </form>
        </div>
      )}

      {/* Historical Shifts Archive */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-slate-500" />
              Past Closed Shifts & Z-Reports Archive
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Audited end-of-day register balancing records</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Shift #</th>
                <th className="py-3 px-4">Cashier</th>
                <th className="py-3 px-4">Opened / Closed</th>
                <th className="py-3 px-4 text-right">Float</th>
                <th className="py-3 px-4 text-right">Total Sales</th>
                <th className="py-3 px-4 text-right">Counted Cash</th>
                <th className="py-3 px-4 text-center">Discrepancy</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {shiftsHistory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    No closed shifts recorded yet.
                  </td>
                </tr>
              ) : (
                shiftsHistory.map((sh) => {
                  const disc = Number(sh.discrepancy || 0);
                  const isBalanced = disc === 0;
                  const isSurplus = disc > 0;

                  return (
                    <tr key={sh.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-black text-slate-900">
                        Shift #{sh.shiftNumber}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">{sh.cashierName}</td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(sh.openedAt).toLocaleDateString()} •{' '}
                        {new Date(sh.openedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        -{' '}
                        {sh.closedAt
                          ? new Date(sh.closedAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Active'}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-600">
                        Rs {Number(sh.openingFloat || 0).toLocaleString('en-PK')}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        Rs {Number(sh.totalSales || 0).toLocaleString('en-PK')}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        Rs {Number(sh.actualCashCounted || 0).toLocaleString('en-PK')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black',
                            isBalanced
                              ? 'bg-emerald-50 text-emerald-700'
                              : isSurplus
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-rose-50 text-rose-700'
                          )}
                        >
                          {isBalanced ? 'Balanced (Rs 0)' : `${disc > 0 ? '+' : ''}Rs ${disc}`}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setViewingZReport(sh)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                        >
                          View Z-Report
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Close Shift & Count Drawer Modal */}
      {isCloseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-scaleUp">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">End Shift & Close Register</h3>
                <p className="text-xs text-slate-500">
                  Shift #{currentShift?.shiftNumber} • {currentShift?.cashierName}
                </p>
              </div>
              <button
                onClick={() => setIsCloseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCloseShiftSubmit} className="p-6 space-y-5">
              {/* Drawer Cash Summary Breakdown */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Opening Float:</span>
                  <span className="font-semibold text-slate-900">
                    Rs {shiftMetrics?.openingFloat.toLocaleString('en-PK')}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total Cash Sales:</span>
                  <span className="font-semibold text-emerald-600">
                    + Rs {shiftMetrics?.cashSales.toLocaleString('en-PK')}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Cash Paid Out (Expenses):</span>
                  <span className="font-semibold text-rose-600">
                    - Rs {shiftMetrics?.cashExpenses.toLocaleString('en-PK')}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-sm text-slate-900">
                  <span>Expected Cash in Drawer:</span>
                  <span className="text-base text-[#FF5C28]">
                    Rs {expectedVal.toLocaleString('en-PK')}
                  </span>
                </div>
              </div>

              {/* Physical Cash Count Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Actual Physical Cash Counted in Drawer (PKR) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={actualCashCounted}
                  onChange={(e) => setActualCashCounted(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-lg font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF5C28]/20 focus:border-[#FF5C28]"
                />
              </div>

              {/* Discrepancy Live Feedback */}
              <div
                className={cn(
                  'p-3.5 rounded-xl border flex items-center justify-between text-xs font-bold',
                  discrepancyVal === 0
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : discrepancyVal > 0
                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                )}
              >
                <span>Drawer Discrepancy:</span>
                <span className="text-sm font-black">
                  {discrepancyVal === 0
                    ? 'Rs 0 (Balanced Perfect)'
                    : discrepancyVal > 0
                    ? `+ Rs ${discrepancyVal} (Surplus)`
                    : `- Rs ${Math.abs(discrepancyVal)} (Shortage)`}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Closing Remarks / Reason for Discrepancy
                </label>
                <input
                  type="text"
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="e.g. Drawer balanced cleanly"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#FF5C28]/20 focus:border-[#FF5C28]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCloseModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={closingSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all disabled:opacity-50"
                >
                  {closingSubmitting ? 'Finalizing...' : 'Close & Print Z-Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Z-Report View & Print Modal */}
      {viewingZReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-scaleUp">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-orange-400" />
                <span className="font-bold text-sm">Official Z-Report (End-of-Day)</span>
              </div>
              <button
                onClick={() => setViewingZReport(null)}
                className="text-slate-400 hover:text-white font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Printable Paper Slip View */}
            <div className="p-6 bg-slate-50/50 font-mono text-xs space-y-4">
              <div className="text-center border-b border-dashed border-slate-300 pb-3">
                <h4 className="font-bold text-base text-slate-900 tracking-wider">
                  SPICEHUB RESTAURANT
                </h4>
                <p className="text-[11px] text-slate-500">Official Daily Z-Report</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Shift #{viewingZReport.shiftNumber} • Cashier: {viewingZReport.cashierName}
                </p>
                <p className="text-[10px] text-slate-400">
                  Closed: {new Date(viewingZReport.closedAt || viewingZReport.openedAt).toLocaleString()}
                </p>
              </div>

              {/* Sales Breakdown */}
              <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-3 text-slate-700">
                <div className="flex justify-between">
                  <span>CASH SALES:</span>
                  <span className="font-bold">
                    Rs {Number(viewingZReport.cashSales || 0).toLocaleString('en-PK')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>CARD SALES:</span>
                  <span>Rs {Number(viewingZReport.cardSales || 0).toLocaleString('en-PK')}</span>
                </div>
                <div className="flex justify-between">
                  <span>ONLINE SALES:</span>
                  <span>Rs {Number(viewingZReport.onlineSales || 0).toLocaleString('en-PK')}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                  <span>TOTAL SALES:</span>
                  <span>Rs {Number(viewingZReport.totalSales || 0).toLocaleString('en-PK')}</span>
                </div>
              </div>

              {/* Drawer Cash Reconciliation */}
              <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-3 text-slate-700">
                <div className="flex justify-between">
                  <span>OPENING FLOAT:</span>
                  <span>Rs {Number(viewingZReport.openingFloat || 0).toLocaleString('en-PK')}</span>
                </div>
                <div className="flex justify-between">
                  <span>EXPENSES PAID OUT:</span>
                  <span>- Rs {Number(viewingZReport.expensesPaidOut || 0).toLocaleString('en-PK')}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900">
                  <span>EXPECTED IN DRAWER:</span>
                  <span>
                    Rs {Number(viewingZReport.expectedCashInDrawer || 0).toLocaleString('en-PK')}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-slate-900">
                  <span>ACTUAL COUNTED CASH:</span>
                  <span>
                    Rs {Number(viewingZReport.actualCashCounted || 0).toLocaleString('en-PK')}
                  </span>
                </div>
                <div className="flex justify-between font-black text-sm pt-1">
                  <span>DISCREPANCY:</span>
                  <span
                    className={
                      viewingZReport.discrepancy < 0
                        ? 'text-rose-600'
                        : viewingZReport.discrepancy > 0
                        ? 'text-blue-600'
                        : 'text-emerald-600'
                    }
                  >
                    {viewingZReport.discrepancy === 0
                      ? 'Rs 0 (BALANCED)'
                      : `${viewingZReport.discrepancy > 0 ? '+' : ''}Rs ${viewingZReport.discrepancy}`}
                  </span>
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-400 pt-1">
                *** SYSTEM GENERATED FINANCIAL AUDIT RECORD ***
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                <Printer className="w-4 h-4" />
                Print Z-Report
              </button>
              <button
                onClick={() => setViewingZReport(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ShiftsPage;
