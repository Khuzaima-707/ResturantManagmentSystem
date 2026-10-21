import React from 'react';
import { Search, RotateCcw, Calendar } from 'lucide-react';

/**
 * ExpenseFilters Component
 * Standard filter bar matching Reports and Menu:
 * - Date Presets: All Dates, Today, Yesterday, This Week, Last Week, This Month, Last Month, Custom
 * - Custom Date Range pickers
 * - Category selector (All + active categories)
 * - Payment Method: All, Cash, Online
 * - Status: All, Active, Voided
 * - Search: Description, Reference, Online Method
 * - Reset Filters button
 */
export const ExpenseFilters = ({
  filters,
  onFilterChange,
  onReset,
  categories = [],
}) => {
  const {
    datePreset = 'All Dates',
    customStartDate = '',
    customEndDate = '',
    category = 'All',
    paymentMethod = 'All',
    status = 'All',
    searchQuery = '',
  } = filters;

  const isFiltered =
    datePreset !== 'All Dates' ||
    category !== 'All' ||
    paymentMethod !== 'All' ||
    status !== 'All' ||
    Boolean(searchQuery.trim()) ||
    Boolean(customStartDate) ||
    Boolean(customEndDate);

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      {/* Left side: Dropdown & Date Filters */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        {/* Date Preset Filter */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl">
          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={datePreset}
            onChange={(e) => onFilterChange('datePreset', e.target.value)}
            className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer text-xs"
          >
            <option value="All Dates">All Dates</option>
            <option value="Today">Today</option>
            <option value="Yesterday">Yesterday</option>
            <option value="This Week">This Week</option>
            <option value="Last Week">Last Week</option>
            <option value="This Month">This Month</option>
            <option value="Last Month">Last Month</option>
            <option value="Custom">Custom Range</option>
          </select>
        </div>

        {/* Custom Range Inputs */}
        {datePreset === 'Custom' && (
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 shrink-0">
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => onFilterChange('customStartDate', e.target.value)}
              className="h-7 px-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 max-w-[125px]"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => onFilterChange('customEndDate', e.target.value)}
              className="h-7 px-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 max-w-[125px]"
            />
          </div>
        )}

        {/* Category Filter */}
        <select
          value={category}
          onChange={(e) => onFilterChange('category', e.target.value)}
          className="h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:border-[#FF5C28] cursor-pointer text-xs shrink-0"
        >
          <option value="All">All Categories</option>
          {categories.map((cat) => {
            const name = typeof cat === 'string' ? cat : cat?.name;
            return (
              <option key={name} value={name}>
                {name}
              </option>
            );
          })}
        </select>

        {/* Payment Method Filter */}
        <select
          value={paymentMethod}
          onChange={(e) => onFilterChange('paymentMethod', e.target.value)}
          className="h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:border-[#FF5C28] cursor-pointer text-xs shrink-0"
        >
          <option value="All">All Payment Methods</option>
          <option value="Cash">Cash</option>
          <option value="Online">Online</option>
        </select>

        {/* Status Filter */}
        <select
          value={status}
          onChange={(e) => onFilterChange('status', e.target.value)}
          className="h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:border-[#FF5C28] cursor-pointer text-xs shrink-0"
        >
          <option value="All">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="VOIDED">Voided</option>
        </select>

        {/* Reset Filter Button */}
        {isFiltered && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            title="Reset all filters"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Right side: Search Box */}
      <div className="relative min-w-[220px] max-w-xs w-full">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onFilterChange('searchQuery', e.target.value)}
          placeholder="Search note, ref, online account..."
          className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#FF5C28] transition-colors"
        />
      </div>
    </div>
  );
};

export default ExpenseFilters;
