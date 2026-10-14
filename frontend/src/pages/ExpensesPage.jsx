import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Calendar,
  Filter,
  Search,
  PieChart,
  Receipt,
  FileText,
  AlertCircle,
  Building,
  CreditCard,
  Banknote,
  CheckCircle2,
  Percent,
} from 'lucide-react';
import { useAppStore } from '../store';
import { ExpenseRepository } from '../services/repositories';
import { getValidNonReversedOrders } from '../domain/selectors/dashboardSelectors';
import { cn } from '../utils/cn';

const EXPENSE_CATEGORIES = [
  'Raw Materials / Meat & Groceries',
  'Utilities (Gas, Electricity, Water)',
  'Staff Wages & Daily Allowances',
  'Kitchen Supplies & Packaging',
  'Maintenance, Repairs & Cleaning',
  'Petty Cash / Operational Misc',
];

export function ExpensesPage() {
  const { expenses, addExpense, deleteExpense, orders, reversals } = useAppStore();

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('ledger'); // 'ledger' | 'pnl'

  // New Expense Form State
  const [formData, setFormData] = useState({
    title: '',
    category: EXPENSE_CATEGORIES[0],
    amount: '',
    paymentMethod: 'Cash',
    paidTo: '',
    notes: '',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Financial Calculations & P&L (Strict Chartered Accountant Ledger Rules)
  const financialSummary = useMemo(() => {
    const validOrders = getValidNonReversedOrders(orders, reversals);
    const grossSales = validOrders.reduce((sum, o) => sum + (Number(o.grandTotal) || 0), 0);
    const totalTax = validOrders.reduce((sum, o) => sum + (Number(o.taxAmount) || 0), 0);
    const totalDiscounts = validOrders.reduce((sum, o) => sum + (Number(o.discountAmount) || 0), 0);
    const netRevenue = grossSales - totalTax;

    const totalExpenses = (expenses || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const cashExpenses = (expenses || [])
      .filter((e) => e.paymentMethod === 'Cash')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const bankExpenses = (expenses || [])
      .filter((e) => e.paymentMethod === 'Bank')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const netOperatingProfit = netRevenue - totalExpenses;
    const profitMargin = netRevenue > 0 ? (netOperatingProfit / netRevenue) * 100 : 0;

    // Category breakdown
    const categoryTotals = {};
    EXPENSE_CATEGORIES.forEach((cat) => {
      categoryTotals[cat] = 0;
    });
    (expenses || []).forEach((e) => {
      const cat = e.category || 'Petty Cash / Operational Misc';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(e.amount || 0);
    });

    return {
      grossSales,
      totalTax,
      totalDiscounts,
      netRevenue,
      totalExpenses,
      cashExpenses,
      bankExpenses,
      netOperatingProfit,
      profitMargin,
      categoryTotals,
    };
  }, [orders, expenses, reversals]);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return (expenses || []).filter((item) => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesSearch =
        !searchQuery ||
        (item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.paidTo && item.paidTo.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [expenses, selectedCategory, searchQuery]);

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    setFormError('');

    const amountNum = Number(formData.amount);
    if (!formData.title.trim()) {
      setFormError('Please enter a description or expense title');
      return;
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      setFormError('Amount must be a positive number greater than 0');
      return;
    }

    try {
      setSubmitting(true);
      const newExp = {
        id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: formData.title.trim(),
        category: formData.category,
        amount: amountNum,
        paymentMethod: formData.paymentMethod,
        paidTo: formData.paidTo.trim() || 'General Vendor',
        notes: formData.notes.trim(),
        date: new Date().toISOString(),
      };

      addExpense(newExp);
      setIsModalOpen(false);
      setFormData({
        title: '',
        category: EXPENSE_CATEGORIES[0],
        amount: '',
        paymentMethod: 'Cash',
        paidTo: '',
        notes: '',
      });
    } catch (err) {
      setFormError(err.message || 'Failed to save expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this expense record?')) {
      deleteExpense(id);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-[#FF5C28]" />
            Accounts & Expense Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time financial accounting, operational expenses ledger, and P&L statements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
            <button
              onClick={() => setActiveTab('ledger')}
              className={cn(
                'px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all',
                activeTab === 'ledger'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Expense Ledger
            </button>
            <button
              onClick={() => setActiveTab('pnl')}
              className={cn(
                'px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all',
                activeTab === 'pnl'
                  ? 'bg-white text-[#FF5C28] shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              P&L Statement
            </button>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF5C28] hover:bg-[#E04B1A] text-white text-sm font-semibold shadow-md shadow-orange-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Record Expense
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Revenue */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Net Sales Revenue</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">
              Rs {financialSummary.netRevenue.toLocaleString('en-PK')}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Gross Rs {financialSummary.grossSales.toLocaleString('en-PK')} (Tax Excluded)
            </p>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Expenses</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-600">
              Rs {financialSummary.totalExpenses.toLocaleString('en-PK')}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Cash: Rs {financialSummary.cashExpenses.toLocaleString('en-PK')} • Bank: Rs {financialSummary.bankExpenses.toLocaleString('en-PK')}
            </p>
          </div>
        </div>

        {/* Net Operating Profit */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Net Operating Profit</span>
            <div
              className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center',
                financialSummary.netOperatingProfit >= 0
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-amber-50 text-amber-600'
              )}
            >
              <DollarSign className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <div
              className={cn(
                'text-2xl font-black',
                financialSummary.netOperatingProfit >= 0 ? 'text-emerald-600' : 'text-amber-600'
              )}
            >
              Rs {financialSummary.netOperatingProfit.toLocaleString('en-PK')}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Net Revenue minus All Expenses
            </p>
          </div>
        </div>

        {/* Operating Margin */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Operating Margin</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Percent className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">
              {financialSummary.profitMargin.toFixed(1)}%
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {financialSummary.netOperatingProfit >= 0 ? 'Healthy Operating Margin' : 'Expenses exceed revenue'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content: Tab Switching */}
      {activeTab === 'ledger' ? (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search expense description, vendor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF5C28]/20 focus:border-[#FF5C28]"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 shrink-0">
                <Filter className="w-3.5 h-3.5" /> Category:
              </span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#FF5C28]/20"
              >
                <option value="All">All Categories ({expenses.length})</option>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Date / Time</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Paid To / Vendor</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4 text-right">Amount (PKR)</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        No expenses found for this criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          {new Date(exp.date || exp.createdAt).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 max-w-xs truncate">
                          {exp.title}
                          {exp.notes && (
                            <span className="block text-[11px] font-normal text-slate-400 truncate">
                              {exp.notes}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
                            {exp.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-medium">
                          {exp.paidTo || 'N/A'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold',
                              exp.paymentMethod === 'Cash'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                                : 'bg-blue-50 text-blue-700 border border-blue-200/50'
                            )}
                          >
                            {exp.paymentMethod === 'Cash' ? (
                              <Banknote className="w-3 h-3" />
                            ) : (
                              <CreditCard className="w-3 h-3" />
                            )}
                            {exp.paymentMethod || 'Cash'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">
                          Rs {Number(exp.amount).toLocaleString('en-PK')}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleDelete(exp.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Expense"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* P&L Statement Tab */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Detailed Statement Table */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Profit & Loss Statement (P&L)</h2>
                <p className="text-xs text-slate-500">Comprehensive GAAP / IFRS Standard Restaurant Accounting</p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200/60">
                Live Audited
              </span>
            </div>

            <div className="space-y-4 text-sm">
              {/* Section 1: Revenue */}
              <div>
                <div className="flex justify-between items-center py-2 text-slate-800 font-bold border-b border-slate-100">
                  <span>1. Gross Billed Food Sales</span>
                  <span>Rs {financialSummary.grossSales.toLocaleString('en-PK')}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 pl-4 text-xs text-slate-500">
                  <span>Less: Promotional Discounts</span>
                  <span>- Rs {financialSummary.totalDiscounts.toLocaleString('en-PK')}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 pl-4 text-xs text-slate-500">
                  <span>Less: Sales Tax Collected (Liability, not revenue)</span>
                  <span>- Rs {financialSummary.totalTax.toLocaleString('en-PK')}</span>
                </div>
                <div className="flex justify-between items-center py-2 text-slate-900 font-bold bg-slate-50 px-3 rounded-lg mt-1">
                  <span>Net Operating Revenue</span>
                  <span>Rs {financialSummary.netRevenue.toLocaleString('en-PK')}</span>
                </div>
              </div>

              {/* Section 2: Operating Expenses */}
              <div className="pt-2">
                <div className="flex justify-between items-center py-2 text-slate-800 font-bold border-b border-slate-100">
                  <span>2. Operating Expenses (OPEX)</span>
                  <span className="text-rose-600">
                    Rs {financialSummary.totalExpenses.toLocaleString('en-PK')}
                  </span>
                </div>
                {EXPENSE_CATEGORIES.map((cat) => {
                  const amt = financialSummary.categoryTotals[cat] || 0;
                  return (
                    <div
                      key={cat}
                      className="flex justify-between items-center py-1.5 pl-4 text-xs text-slate-600"
                    >
                      <span>{cat}</span>
                      <span>Rs {amt.toLocaleString('en-PK')}</span>
                    </div>
                  );
                })}
              </div>

              {/* Section 3: Bottomline Net Operating Profit */}
              <div className="pt-4 border-t-2 border-slate-200">
                <div
                  className={cn(
                    'flex justify-between items-center py-3 px-4 rounded-xl text-base font-black',
                    financialSummary.netOperatingProfit >= 0
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                      : 'bg-rose-50 text-rose-900 border border-rose-200'
                  )}
                >
                  <div>
                    <span>Net Operating Profit / (Loss)</span>
                    <span className="block text-xs font-normal text-slate-500">
                      Operating Margin: {financialSummary.profitMargin.toFixed(1)}%
                    </span>
                  </div>
                  <span className="text-xl">
                    Rs {financialSummary.netOperatingProfit.toLocaleString('en-PK')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Expense Category Breakdown Chart */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-[#FF5C28]" />
              Expense Distribution
            </h3>
            <p className="text-xs text-slate-500">Breakdown of operational spend by category</p>

            <div className="space-y-4 pt-2">
              {EXPENSE_CATEGORIES.map((cat) => {
                const amt = financialSummary.categoryTotals[cat] || 0;
                const pct =
                  financialSummary.totalExpenses > 0
                    ? Math.round((amt / financialSummary.totalExpenses) * 100)
                    : 0;

                return (
                  <div key={cat} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium text-slate-700">
                      <span className="truncate max-w-[180px]">{cat}</span>
                      <span className="font-bold">{pct}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#FF5C28] h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-slate-400 text-right">
                      Rs {amt.toLocaleString('en-PK')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Record Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-scaleUp">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Record New Expense</h3>
                <p className="text-xs text-slate-500">Add an operating purchase or cash payout</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Expense Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 50kg Chicken Meat, Kitchen Gas Cylinder"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF5C28]/20 focus:border-[#FF5C28]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#FF5C28]/20 focus:border-[#FF5C28]"
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Amount (PKR) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 15000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#FF5C28]/20 focus:border-[#FF5C28]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#FF5C28]/20 focus:border-[#FF5C28]"
                  >
                    <option value="Cash">Cash (Petty Drawer)</option>
                    <option value="Bank">Bank Transfer / Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Paid To / Vendor
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Grain Market, Shell Gas"
                    value={formData.paidTo}
                    onChange={(e) => setFormData({ ...formData, paidTo: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF5C28]/20 focus:border-[#FF5C28]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Optional Notes / Invoice #
                </label>
                <input
                  type="text"
                  placeholder="Receipt # or purchase comments"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#FF5C28]/20 focus:border-[#FF5C28]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[#FF5C28] hover:bg-[#E04B1A] text-white text-xs font-bold shadow-md shadow-orange-500/20 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Expense Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExpensesPage;
