import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Download,
  Printer,
} from 'lucide-react';
import { Tabs } from '../components/ui/Tabs';
import { useAppStore } from '../store';
import { isCashierUser } from '../domain/selectors/invoiceSelectors';
import {
  filterExpenses,
  calculateExpenseSummary,
  filterExpensesByOwnership,
} from '../domain/rules/expenseRules';
import { ExpenseSummaryCards } from '../features/expenses/ExpenseSummaryCards';
import { ExpenseFilters } from '../features/expenses/ExpenseFilters';
import { ExpenseTable } from '../features/expenses/ExpenseTable';
import { ExpenseCategoryTab } from '../features/expenses/ExpenseCategoryTab';
import { AddExpenseModal } from '../features/expenses/AddExpenseModal';
import { VoidExpenseModal } from '../features/expenses/VoidExpenseModal';
import { ExpenseDetailModal } from '../features/expenses/ExpenseDetailModal';
import {
  exportExpensesCsv,
  printExpenseReport,
} from '../features/expenses/exportExpenses';

/**
 * ExpensesPage Component
 * Standalone Expense Management Module for RMS New.
 * - Admin: Full access across all expenses, categories, voiding, and summaries
 * - Cashier: Access to add expenses, select categories, view ONLY own entered expenses
 * - Zero regression on POS, Sales, Revenue, Invoices, COGS, or Gross Profit.
 */
export function ExpensesPage() {
  const {
    user,
    expenses,
    expenseCategories,
    fetchExpenses,
    fetchExpenseCategories,
    settings,
  } = useAppStore();

  const isCashier = isCashierUser(user);

  // Active Tab: 'Expenses' | 'Expense Categories'
  const [activeTab, setActiveTab] = useState('Expenses');

  // Filter State
  const [filters, setFilters] = useState({
    datePreset: 'All Dates',
    customStartDate: '',
    customEndDate: '',
    category: 'All',
    paymentMethod: 'All',
    status: 'All',
    searchQuery: '',
  });

  // Modals State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState(null);
  const [expenseToVoid, setExpenseToVoid] = useState(null);
  const [expenseToView, setExpenseToView] = useState(null);

  // Sync on initial mount
  useEffect(() => {
    fetchExpenses().catch(() => {});
    fetchExpenseCategories().catch(() => {});
  }, [fetchExpenses, fetchExpenseCategories]);

  // Keep active tab valid if cashier
  useEffect(() => {
    if (isCashier && activeTab !== 'Expenses') {
      setActiveTab('Expenses');
    }
  }, [isCashier, activeTab]);

  // Handle Filter Change
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Reset Filters
  const handleResetFilters = () => {
    setFilters({
      datePreset: 'All Dates',
      customStartDate: '',
      customEndDate: '',
      category: 'All',
      paymentMethod: 'All',
      status: 'All',
      searchQuery: '',
    });
  };

  // Scoped expenses by ownership:
  // - Admin sees all expenses
  // - Cashier sees ONLY expenses entered by that logged-in cashier
  const userExpenses = useMemo(() => {
    return filterExpensesByOwnership(expenses || [], user);
  }, [expenses, user]);

  // Filtered Expenses
  const filteredExpensesList = useMemo(() => {
    return filterExpenses(userExpenses, {
      datePreset: filters.datePreset,
      customRange:
        filters.datePreset === 'Custom' && filters.customStartDate && filters.customEndDate
          ? { start: filters.customStartDate, end: filters.customEndDate }
          : null,
      category: filters.category,
      paymentMethod: filters.paymentMethod,
      status: filters.status,
      searchQuery: filters.searchQuery,
    });
  }, [userExpenses, filters]);

  // Executive KPI summary (dynamically reactive to user's scoped filtered list)
  const expenseSummary = useMemo(() => {
    return calculateExpenseSummary(filteredExpensesList);
  }, [filteredExpensesList]);

  // Tabs Configuration (Cashier only sees Expenses tab; Categories master is hidden)
  const tabs = useMemo(() => {
    if (isCashier) {
      return [{ id: 'Expenses', label: 'Expenses' }];
    }
    return [
      { id: 'Expenses', label: 'Expenses' },
      { id: 'Expense Categories', label: 'Expense Categories' },
    ];
  }, [isCashier]);

  // Actions Handlers
  const handleOpenAdd = () => {
    setExpenseToEdit(null);
    setIsAddModalOpen(true);
  };

  const handleEdit = (expense) => {
    setExpenseToEdit(expense);
    setIsAddModalOpen(true);
  };

  const handleVoid = (expense) => {
    if (isCashier) return;
    setExpenseToVoid(expense);
  };

  const handleView = (expense) => {
    setExpenseToView(expense);
  };

  // Export handlers (Cashier only exports their own visible scope)
  const handleExportCsv = () => {
    exportExpensesCsv({
      expenses: filteredExpensesList,
      summary: expenseSummary,
      filters,
      settings,
      user,
    });
  };

  const handlePrint = () => {
    printExpenseReport({
      expenses: filteredExpensesList,
      summary: expenseSummary,
      filters,
      settings,
      user,
    });
  };

  return (
    <div className="space-y-4 max-w-[1440px] mx-auto select-none pb-10">
      {/* Main Container Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/70 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-5">
        {/* Navigation Tabs Header with + Add Expense & Export Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/90 pb-0.5">
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={setActiveTab}
            variant="line"
            className="border-b-0"
          />

          <div className="flex items-center gap-2 self-start sm:self-center shrink-0 mb-2 sm:mb-0">
            {activeTab === 'Expenses' && (
              <>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-full transition-colors cursor-pointer"
                  title="Export to CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-full transition-colors cursor-pointer"
                  title="Print report"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenAdd}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#FF5C28] hover:bg-[#E04D1D] text-white text-xs font-semibold rounded-full shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Add Expense</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tab 1: Expenses Ledger */}
        {activeTab === 'Expenses' && (
          <div className="space-y-4">
            {/* Top KPI Summary Cards */}
            <ExpenseSummaryCards summary={expenseSummary} />

            {/* Filter Bar */}
            <ExpenseFilters
              filters={filters}
              onFilterChange={handleFilterChange}
              onReset={handleResetFilters}
              categories={expenseCategories}
            />

            {/* Table */}
            <ExpenseTable
              expenses={filteredExpensesList}
              onViewExpense={handleView}
              onEditExpense={handleEdit}
              onVoidExpense={handleVoid}
              canVoid={!isCashier}
            />
          </div>
        )}

        {/* Tab 2: Expense Categories */}
        {activeTab === 'Expense Categories' && !isCashier && <ExpenseCategoryTab />}
      </div>

      {/* Modals */}
      <AddExpenseModal
        key={expenseToEdit?.id || (isAddModalOpen ? 'open' : 'closed')}
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setExpenseToEdit(null);
        }}
        expenseToEdit={expenseToEdit}
        categories={expenseCategories}
      />

      {!isCashier && (
        <VoidExpenseModal
          isOpen={Boolean(expenseToVoid)}
          onClose={() => setExpenseToVoid(null)}
          expense={expenseToVoid}
        />
      )}

      <ExpenseDetailModal
        isOpen={Boolean(expenseToView)}
        onClose={() => setExpenseToView(null)}
        expense={expenseToView}
      />
    </div>
  );
}

export default ExpensesPage;
