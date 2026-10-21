import React from 'react';
import { DollarSign, Banknote, Globe, Receipt } from 'lucide-react';
import { KPICard } from '../../components/ui/KPICard';
import { formatCurrency, formatNumber } from '../../utils/formatters';

/**
 * ExpenseSummaryCards Component
 * Renders the top executive KPI summary cards:
 * - Total Expenses (Active only, excluding VOIDED)
 * - Cash Expenses (Physical cash paid)
 * - Online Expenses (Online transfer/wallet paid)
 * - Expense Entries (Total count of active expenses)
 *
 * All cards dynamically respond to the active filters.
 */
export const ExpenseSummaryCards = ({ summary }) => {
  const {
    totalExpenses = 0,
    cashExpenses = 0,
    onlineExpenses = 0,
    activeCount = 0,
    voidedCount = 0,
  } = summary || {};

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <KPICard
        title="Total Expenses"
        value={formatCurrency(totalExpenses)}
        subtitle={voidedCount > 0 ? `Excludes ${voidedCount} voided` : 'All active entries'}
        color="orange"
        icon={DollarSign}
        showArrow={false}
      />
      <KPICard
        title="Cash Expenses"
        value={formatCurrency(cashExpenses)}
        subtitle="Physical cash spent"
        color="green"
        icon={Banknote}
        showArrow={false}
      />
      <KPICard
        title="Online Expenses"
        value={formatCurrency(onlineExpenses)}
        subtitle="Bank & mobile wallets"
        color="blue"
        icon={Globe}
        showArrow={false}
      />
      <KPICard
        title="Expense Entries"
        value={formatNumber(activeCount)}
        subtitle={voidedCount > 0 ? `${voidedCount} voided archived` : 'Recorded entries'}
        color="purple"
        icon={Receipt}
        showArrow={false}
      />
    </div>
  );
};

export default ExpenseSummaryCards;
