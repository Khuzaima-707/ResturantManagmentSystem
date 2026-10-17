import React, { useState, useMemo } from 'react';
import {
  Receipt,
  ShoppingCart,
  TrendingUp,
  RotateCcw,
  Calendar,
  ChevronDown,
  Users,
  FileCheck2,
  Clock3,
  UtensilsCrossed,
} from 'lucide-react';
import { parseISO, formatDistanceToNow, format } from 'date-fns';
import { useAppStore } from '../store';
import { deriveDashboardData } from '../domain/selectors/dashboardSelectors';
import { getProfitAndCostReportData } from '../domain/selectors/reportSelectors';
import { filterOrdersByOwnership } from '../domain/selectors/invoiceSelectors';
import { formatCurrency, formatNumber } from '../utils/formatters';

/**
 * Image component with robust offline fallback
 */
const FoodThumbnail = ({ src, alt, className, fallbackEmoji = '🍲' }) => {
  const [failedSrc, setFailedSrc] = useState(null);
  const hasFailed = Boolean(failedSrc && failedSrc === src);

  if (hasFailed || !src) {
    return (
      <div
        className={`${className} bg-slate-100 flex items-center justify-center text-base select-none shrink-0 border border-slate-100`}
      >
        <span>{fallbackEmoji}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailedSrc(src)}
      className={`${className} object-cover shrink-0`}
      loading="lazy"
    />
  );
};

export const DashboardPage = () => {
  const {
    orders,
    reversals,
    items,
    addons,
    datePreset,
    setDatePreset,
    customDateRange,
    user,
  } = useAppStore();

  const isCashier = Boolean(
    (user?.role?.toLowerCase().includes('cashier') && !user?.role?.toLowerCase().includes('admin')) ||
    (user?.username?.toLowerCase() === 'cashier' && user?.username?.toLowerCase() !== 'admin')
  );

  const effectiveDatePreset = isCashier ? 'Today' : datePreset;

  // Active candle key in revenue chart (guarantees exactly one active candle)
  const [activeCandleKey, setActiveCandleKey] = useState(null);
  const [dropdownOpenCard, setDropdownOpenCard] = useState(null);

  // Scope orders and reversals based on logged-in role ownership
  const effectiveOrders = useMemo(() => {
    return filterOrdersByOwnership(orders, user);
  }, [orders, user]);

  const effectiveReversals = useMemo(() => {
    if (!isCashier) return reversals;
    const allowedOrderIds = new Set(effectiveOrders.map((o) => o.id));
    const allowedInvoiceNumbers = new Set(effectiveOrders.map((o) => o.invoiceNumber));
    return (reversals || []).filter(
      (r) => allowedOrderIds.has(r.originalOrderId) || allowedInvoiceNumbers.has(r.originalInvoiceNumber)
    );
  }, [reversals, effectiveOrders, isCashier]);

  // Derive canonical calculations from active store orders (Cashier restricted to Today & Cashier-scoped orders)
  const { kpis, chartData, topSellingItems, recentActivities } = useMemo(() => {
    return deriveDashboardData(
      effectiveOrders,
      effectiveReversals,
      effectiveDatePreset,
      isCashier ? null : customDateRange
    );
  }, [effectiveOrders, effectiveReversals, effectiveDatePreset, customDateRange, isCashier]);

  // Derive Gross Profit for management dashboard KPI indicator (Hidden for Cashier)
  const activeProfit = useMemo(() => {
    if (isCashier) return null;
    const data = getProfitAndCostReportData(
      orders,
      reversals,
      {
        datePreset: effectiveDatePreset,
        customRange: isCashier ? null : customDateRange,
        items,
        addons,
        itemsMaster: items,
        addonsMaster: addons,
      },
      items,
      addons
    );
    return data?.kpis || null;
  }, [orders, reversals, effectiveDatePreset, customDateRange, isCashier, items, addons]);

  // Derive real top dishes from canonical transaction data (empty when no orders exist)
  const displayTopDishes = useMemo(() => {
    if (!topSellingItems || topSellingItems.length === 0) {
      return [];
    }
    return topSellingItems.map((matchingReal) => {
      // Look up menu item in store items for latest user-uploaded picture
      const catalogItem = (items || []).find((it) => {
        if (matchingReal.id && it.id && String(it.id).toLowerCase() === String(matchingReal.id).toLowerCase()) {
          return true;
        }
        if (matchingReal.name && it.name && it.name.trim().toLowerCase() === matchingReal.name.trim().toLowerCase()) {
          return true;
        }
        return false;
      });

      const resolvedImage =
        catalogItem?.imageRef ||
        catalogItem?.image ||
        matchingReal.image ||
        null;

      return {
        id: matchingReal.id,
        name: matchingReal.name,
        orders: matchingReal.quantitySold,
        image: resolvedImage,
        fallbackEmoji: '🍲',
      };
    });
  }, [topSellingItems, items]);

  // Derive real recent activities (empty when no transactions exist)
  const displayRecentActivities = useMemo(() => {
    if (!recentActivities || recentActivities.length === 0) {
      return [];
    }
    return recentActivities.map((act) => {
      const isRev = act.type === 'reversal';
      const catalogItem = (items || []).find((it) => {
        if (act.itemId && it.id && String(it.id).toLowerCase() === String(act.itemId).toLowerCase()) {
          return true;
        }
        if (act.dishName && it.name && it.name.trim().toLowerCase() === act.dishName.trim().toLowerCase()) {
          return true;
        }
        return false;
      });

      const resolvedImage = catalogItem?.imageRef || catalogItem?.image || act.image || null;

      let waitTime = 'Just now';
      if (act.date) {
        try {
          const d = typeof act.date === 'string' ? parseISO(act.date) : new Date(act.date);
          waitTime = formatDistanceToNow(d, { addSuffix: true });
        } catch {
          waitTime = 'Recent';
        }
      }

      return {
        id: act.id,
        title: act.dishName || act.title || (isRev ? 'Invoice Reversed' : 'Sale Completed'),
        price: formatCurrency(act.amount),
        orderNumber: act.invoiceNumber || `#${act.id}`,
        waitTime,
        status: isRev ? 'Reversed' : act.status || 'Completed',
        statusColor: isRev
          ? 'bg-rose-500'
          : act.status === 'Completed'
          ? 'bg-[#48BB78]'
          : 'bg-[#F6AD55]',
        image: resolvedImage,
        fallbackEmoji: isRev ? '↩️' : '🥗',
      };
    });
  }, [recentActivities, items]);

  // Revenue Bar Chart Dataset derived directly from canonical chartData
  const revenueDays = useMemo(() => {
    if (chartData && chartData.length > 0) {
      const isMonthly = chartData.length > 7;
      const maxGross = Math.max(...chartData.map((d) => d.grossSales || 0), 0);
      return chartData.map((d, idx) => {
        // Every day has a baseline visible height so the hatched bar pattern is always present
        const heightPercent = maxGross > 0
          ? Math.round(((d.grossSales || 0) / maxGross) * 70) + (isMonthly ? 15 : 18)
          : (isMonthly ? 15 : 18);
        const grossVal = Number(d.grossSales) || 0;
        const netVal = Number(d.netRevenue) || 0;
        const taxVal = d.tax !== undefined ? Number(d.tax) : Math.max(0, grossVal - netVal);
        const uniqueKey = d.fullDate || `${d.day}-${d.date || idx}-${idx}`;

        // Parse date number directly from fullDate string to prevent timezone offset shifts
        let dateNumber = idx + 1;
        if (d.fullDate && typeof d.fullDate === 'string') {
          const parts = d.fullDate.split('-');
          if (parts.length === 3) {
            const parsed = parseInt(parts[2], 10);
            if (!isNaN(parsed)) {
              dateNumber = parsed;
            }
          }
        }

        return {
          id: uniqueKey,
          key: uniqueKey,
          day: d.day,
          date: d.date,
          fullDate: d.fullDate,
          dateNumber,
          height: heightPercent,
          grossSales: formatCurrency(grossVal),
          netRevenue: formatCurrency(netVal),
          tax: formatCurrency(taxVal),
          splitTop: formatCurrency(taxVal),
          splitBottom: formatCurrency(netVal),
          total: formatCurrency(grossVal),
          hasData: grossVal > 0,
        };
      });
    }

    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => ({
      id: `day-${day}-${idx}`,
      key: `day-${day}-${idx}`,
      day,
      date: '',
      fullDate: null,
      dateNumber: idx + 1,
      height: 18,
      grossSales: formatCurrency(0),
      netRevenue: formatCurrency(0),
      tax: formatCurrency(0),
      splitTop: formatCurrency(0),
      splitBottom: formatCurrency(0),
      total: formatCurrency(0),
      hasData: false,
    }));
  }, [chartData]);

  // Resolve the single active candle (guaranteed exactly one active candle across any preset)
  const effectiveActiveCandleKey = useMemo(() => {
    if (!revenueDays || revenueDays.length === 0) return null;
    if (activeCandleKey && revenueDays.some((d) => d.id === activeCandleKey)) {
      return activeCandleKey;
    }
    // Default to today if in dataset, else latest with sales, else last day
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const todayItem = revenueDays.find((d) => d.fullDate === todayStr);
    if (todayItem) return todayItem.id;
    const latestWithData = [...revenueDays].reverse().find((d) => d.hasData);
    if (latestWithData) return latestWithData.id;
    return revenueDays[revenueDays.length - 1].id;
  }, [revenueDays, activeCandleKey]);

  const presets = isCashier ? ['Today'] : ['Today', 'This Week', 'This Month'];

  const toggleDropdown = (cardKey) => {
    if (isCashier) return;
    setDropdownOpenCard(dropdownOpenCard === cardKey ? null : cardKey);
  };

  const handleSelectPreset = (p) => {
    if (isCashier) {
      setDatePreset('Today');
      setDropdownOpenCard(null);
      return;
    }
    setDatePreset(p);
    setDropdownOpenCard(null);
  };

  return (
    <div className="max-w-[1440px] mx-auto select-none">
      {/* ======================================================== */}
      {/* SECTION 1: TOP OVERVIEW (KPI CARDS + REVENUE & BUSINESS DATA) */}
      {/* Perfectly fits the initial viewport when opening the software */}
      {/* ======================================================== */}
      <div className="lg:min-h-[calc(100vh-7.8rem)] flex flex-col justify-between gap-3.5 sm:gap-4 pb-1">
        {/* ROW 1: 4 LIVE TRANSACTION KPI CARDS (Total Sale, Order, Revenue(Net), Reversal) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Total Sale */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/70 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center text-[#FF5C28]">
                <Receipt className="w-3.5 h-3.5 stroke-[2]" />
              </div>
              <span className="text-xs font-semibold text-slate-700">
                Total Sale
              </span>
            </div>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight leading-none">
              {formatCurrency(kpis.netSales !== undefined ? kpis.netSales : kpis.grossSales)}
            </span>
            <span className="text-[10px] font-medium text-slate-400">
              {kpis.reversalsCount > 0 ? 'Net of Reversals' : 'Gross Billed'}
            </span>
          </div>
        </div>

        {/* Card 2: Revenue(Net) */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/70 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <TrendingUp className="w-3.5 h-3.5 stroke-[2]" />
              </div>
              <span className="text-xs font-semibold text-slate-700">
                Revenue(Net)
              </span>
            </div>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight leading-none">
              {formatCurrency(kpis.netRevenue)}
            </span>
            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-flex items-center">
              Pure Net
            </span>
          </div>

          {activeProfit && (
            <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10.5px]">
              <span className="text-slate-400 font-medium">
                {effectiveDatePreset === 'Today'
                  ? 'Profit Today:'
                  : effectiveDatePreset === 'This Week'
                  ? 'Profit This Week:'
                  : effectiveDatePreset === 'This Month'
                  ? 'Profit This Month:'
                  : 'Est. Gross Profit:'}
              </span>
              <span className="font-semibold text-emerald-700">
                {formatCurrency(activeProfit.grossProfit || 0)}
                {activeProfit.grossProfitMargin > 0 && (
                  <span className="text-[9.5px] text-emerald-600/80 ml-1 font-medium">
                    ({activeProfit.grossProfitMargin}%)
                  </span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Card 3: Order */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/70 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center text-[#FF5C28]">
                <ShoppingCart className="w-3.5 h-3.5 stroke-[2]" />
              </div>
              <span className="text-xs font-semibold text-slate-700">
                Order
              </span>
            </div>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight leading-none">
              {formatNumber(kpis.activeOrdersCount !== undefined ? kpis.activeOrdersCount : kpis.completedOrders)}
            </span>
            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-flex items-center">
              {kpis.reversalsCount > 0 ? `${kpis.activeOrdersCount} Active` : 'Completed'}
            </span>
          </div>
        </div>

        {/* Card 4: Reversal */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/70 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500">
                <RotateCcw className="w-3.5 h-3.5 stroke-[2]" />
              </div>
              <span className="text-xs font-semibold text-slate-700">
                Reversal
              </span>
            </div>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight leading-none">
              {formatCurrency(kpis.reversalsIncludingTax)}
            </span>
            <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full inline-flex items-center">
              {kpis.reversalsCount} Reversed
            </span>
          </div>
        </div>
      </div>

        {/* ======================================================== */}
        {/* ROW 2: Total Revenue (7 cols) & Business Data (5 cols) */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 items-stretch flex-1">
        {/* Card 5: Total Revenue Card (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-4 sm:p-4.5 border border-slate-200/70 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between pb-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-800 leading-tight">
                Total Revenue
              </h2>
              <p className="text-xs font-normal text-slate-400 mt-0.5">
                Sales Overview
              </p>
            </div>

            <div className="flex items-center gap-2 relative">
              {/* Dropdown: This Week / This Month */}
              <button
                type="button"
                onClick={() => toggleDropdown('revenue')}
                className="px-2.5 py-1 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{datePreset}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {dropdownOpenCard === 'revenue' && (
                <div className="absolute right-0 top-10 w-32 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 animate-in fade-in duration-100">
                  {presets.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleSelectPreset(p)}
                      className="w-full text-left px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-orange-50 hover:text-[#FF5C28] transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Hatched Bar Chart with EXACTLY ONE MOVING CANDLE */}
          <div className="relative pt-6 pb-2">
            {/* SVG Hatch Pattern Defs */}
            <svg className="absolute w-0 h-0" aria-hidden="true">
              <defs>
                {/* Gray Hatched Pattern for Inactive Bars */}
                <pattern
                  id="diagonal-hatch-gray"
                  width="7"
                  height="7"
                  patternTransform="rotate(45 0 0)"
                  patternUnits="userSpaceOnUse"
                >
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="7"
                    stroke="#E2E8F0"
                    strokeWidth="3.2"
                  />
                </pattern>

                {/* Orange Hatched Pattern for THE SINGLE ACTIVE CANDLE */}
                <pattern
                  id="diagonal-hatch-orange"
                  width="7"
                  height="7"
                  patternTransform="rotate(45 0 0)"
                  patternUnits="userSpaceOnUse"
                >
                  <rect width="7" height="7" fill="#FF5C28" />
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="7"
                    stroke="#FF7A4D"
                    strokeWidth="2.5"
                  />
                </pattern>
              </defs>
            </svg>

            {/* Chart Grid Lines & Y-Axis */}
            <div className="flex h-48 sm:h-52 w-full">
              {/* Y-Axis Labels */}
              <div className="w-12 pr-2 shrink-0 flex flex-col justify-between text-[10px] font-medium text-slate-400 select-none pb-5 text-right">
                <span>{kpis.grossSales > 0 ? formatCurrency(kpis.grossSales) : 'Rs 0'}</span>
                <span>{kpis.grossSales > 0 ? formatCurrency(Math.round(kpis.grossSales * 0.75)) : ''}</span>
                <span>{kpis.grossSales > 0 ? formatCurrency(Math.round(kpis.grossSales * 0.5)) : ''}</span>
                <span>{kpis.grossSales > 0 ? formatCurrency(Math.round(kpis.grossSales * 0.25)) : ''}</span>
                <span>0</span>
              </div>

              {/* Bars Viewport */}
              <div
                className={`flex-1 min-w-0 relative pb-5 border-b border-slate-100 flex items-end justify-between ${
                  revenueDays.length > 7 ? 'px-1 sm:px-2 gap-[1px] sm:gap-[2px]' : 'px-2 sm:px-6'
                }`}
              >
                {/* Horizontal Background Guide Lines */}
                <div className="absolute inset-0 pb-5 flex flex-col justify-between pointer-events-none">
                  <div className="border-b border-slate-100/70 border-dashed w-full" />
                  <div className="border-b border-slate-100/70 border-dashed w-full" />
                  <div className="border-b border-slate-100/70 border-dashed w-full" />
                  <div className="border-b border-slate-100/70 border-dashed w-full" />
                  <div className="border-b border-slate-100/70 border-dashed w-full" />
                  <div className="border-b border-slate-100 w-full" />
                </div>

                {/* Day Bars: EXACTLY ONE ACTIVE ORANGE CANDLE AT A TIME */}
                {revenueDays.map((item, idx) => {
                  const isMonthly = revenueDays.length > 7;
                  const isSingleCandle = item.id === effectiveActiveCandleKey;
                  const isFirstFew = idx < (isMonthly ? 4 : 1);
                  const isLastFew = idx > revenueDays.length - (isMonthly ? 5 : 2);
                  const tooltipAlignClass = isFirstFew
                    ? 'left-0'
                    : isLastFew
                    ? 'right-0'
                    : 'left-1/2 -translate-x-1/2';

                  const activeItem = revenueDays.find((d) => d.id === effectiveActiveCandleKey);
                  const activeDateNum = activeItem?.dateNumber || -99;

                  // Clean anchor ticks at 5-day intervals: 1, 5, 10, 15, 20, 25, and last day
                  const isAnchorTick =
                    item.dateNumber === 1 ||
                    item.dateNumber === 5 ||
                    item.dateNumber === 10 ||
                    item.dateNumber === 15 ||
                    item.dateNumber === 20 ||
                    item.dateNumber === 25 ||
                    idx === revenueDays.length - 1;

                  // Suppress anchor tick if it is immediately adjacent to the active candle
                  const isTooCloseToActive =
                    !isSingleCandle && Math.abs(item.dateNumber - activeDateNum) <= 1;

                  const showMonthlyTick = isSingleCandle || (isAnchorTick && !isTooCloseToActive);

                  return (
                    <div
                      key={item.id}
                      onClick={() => setActiveCandleKey(item.id)}
                      onMouseEnter={() => setActiveCandleKey(item.id)}
                      className={`relative z-10 flex flex-col items-center justify-end h-full cursor-pointer group ${
                        isMonthly
                          ? 'flex-1 min-w-[5px] max-w-[22px]'
                          : 'w-8 sm:w-11'
                      }`}
                    >
                      {/* Floating Tooltip ONLY on the single active candle when data exists */}
                      {isSingleCandle && item.hasData && (
                        <div
                          className={`absolute -top-3 ${tooltipAlignClass} bg-[#0B0F19]/95 backdrop-blur-xs text-white px-3 py-2 rounded-xl shadow-2xl border border-slate-700/80 text-[11px] z-30 transition-all pointer-events-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-150 min-w-[145px]`}
                        >
                          <div className="text-[10px] font-semibold text-slate-400 pb-1 mb-1.5 border-b border-slate-800 flex items-center justify-between gap-2">
                            <span>{item.day}</span>
                            {item.date && <span className="text-slate-400 font-normal">{item.date}</span>}
                          </div>
                          <div className="space-y-1 font-medium">
                            <div className="flex items-center justify-between gap-3">
                              <span className="flex items-center gap-1.5 text-slate-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
                                Gross Sales:
                              </span>
                              <span className="font-bold text-white">{item.grossSales}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="flex items-center gap-1.5 text-slate-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                                Net Revenue:
                              </span>
                              <span className="font-bold text-emerald-400">{item.netRevenue}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="flex items-center gap-1.5 text-slate-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]" />
                                Tax:
                              </span>
                              <span className="font-bold text-purple-300">{item.tax}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Bar Graphic: Either the single orange split candle OR the gray hatched bar */}
                      {isSingleCandle ? (
                        /* The SINGLE ACTIVE ORANGE SPLIT CANDLE */
                        <div className="w-full flex flex-col gap-1 sm:gap-1.5 justify-end">
                          {/* Upper Pill Segment */}
                          <div
                            style={{ height: isMonthly ? '18px' : '26px' }}
                            className={`w-full shadow-xs transition-transform scale-105 ${
                              isMonthly ? 'rounded-t-md rounded-b-xs' : 'rounded-t-xl rounded-b-md'
                            }`}
                          >
                            <svg className="w-full h-full">
                              <rect
                                width="100%"
                                height="100%"
                                fill="url(#diagonal-hatch-orange)"
                                rx={isMonthly ? 4 : 8}
                              />
                            </svg>
                          </div>
                          {/* Lower Pill Segment */}
                          <div
                            style={{
                              height: `${Math.max(
                                Math.round((item.height / 100) * 150) - (isMonthly ? 18 : 26),
                                isMonthly ? 20 : 32
                              )}px`,
                            }}
                            className={`w-full shadow-xs transition-transform scale-105 ${
                              isMonthly ? 'rounded-t-xs rounded-b-md' : 'rounded-t-md rounded-b-xl'
                            }`}
                          >
                            <svg className="w-full h-full">
                              <rect
                                width="100%"
                                height="100%"
                                fill="url(#diagonal-hatch-orange)"
                                rx={isMonthly ? 4 : 8}
                              />
                            </svg>
                          </div>
                        </div>
                      ) : (
                        /* Inactive Gray Hatched Bar (Clean baseline continuous rhythm) */
                        <div
                          style={{ height: `${item.height}%` }}
                          className={`w-full transition-all hover:opacity-80 ${
                            isMonthly ? 'rounded-xs' : 'rounded-xl'
                          }`}
                        >
                          <svg className="w-full h-full">
                            <rect
                              width="100%"
                              height="100%"
                              fill="url(#diagonal-hatch-gray)"
                              rx={isMonthly ? 3 : 8}
                            />
                          </svg>
                        </div>
                      )}

                      {/* X-Axis Day / Date Label */}
                      {isMonthly ? (
                        showMonthlyTick ? (
                          <span
                            className={`absolute -bottom-5 text-[10px] font-semibold transition-all whitespace-nowrap select-none ${
                              isSingleCandle
                                ? 'text-[#FF5C28] font-bold z-20 scale-110'
                                : 'text-slate-400 group-hover:text-slate-600'
                            }`}
                          >
                            {item.dateNumber}
                          </span>
                        ) : null
                      ) : (
                        <span
                          className={`absolute -bottom-5 text-xs font-semibold transition-colors select-none ${
                            isSingleCandle
                              ? 'text-[#FF5C28]'
                              : 'text-slate-400 group-hover:text-slate-600'
                          }`}
                        >
                          {item.day}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Card 6: Business Data Card (5 Cols) with 3 Nested Colored Cards */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-4 sm:p-4.5 border border-slate-200/70 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5">
            <h2 className="text-sm sm:text-base font-bold text-slate-800">
              Business Data
            </h2>

            <div className="relative">
              <button
                type="button"
                onClick={() => toggleDropdown('business')}
                className="px-2.5 py-1 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{datePreset}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {dropdownOpenCard === 'business' && (
                <div className="absolute right-0 top-10 w-32 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 animate-in fade-in duration-100">
                  {presets.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleSelectPreset(p)}
                      className="w-full text-left px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-orange-50 hover:text-[#FF5C28] transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 3 Nested Colored Cards */}
          <div className="space-y-2.5 mt-1.5 flex-1 flex flex-col justify-between">
            {/* 1. Purple Card: Number of Customers */}
            <div className="bg-[#EEEDFC] hover:bg-[#E8E6FA] transition-colors rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-medium text-slate-600">
                  Number of Customers
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-700 stroke-[2]" />
                <span className="text-xl sm:text-2xl font-bold text-slate-800 leading-none">
                  {formatNumber(kpis.totalCustomers ?? 0)}
                </span>
              </div>
            </div>

            {/* 2. Peach Card: Total Orders */}
            <div className="bg-[#FFF4EC] hover:bg-[#FFECE0] transition-colors rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-medium text-slate-600">
                  Total Orders
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-slate-700 stroke-[2]" />
                <span className="text-xl sm:text-2xl font-bold text-slate-800 leading-none">
                  {formatNumber(kpis.activeOrdersCount !== undefined ? kpis.activeOrdersCount : kpis.completedOrders)}
                </span>
              </div>
            </div>

            {/* 3. Mint Card: Average Order Values */}
            <div className="bg-[#EAF7EE] hover:bg-[#E0F3E5] transition-colors rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-medium text-slate-600">
                  Average Order Values
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="text-xl sm:text-2xl font-bold text-slate-800 leading-none">
                  {kpis.averageOrderValue > 0 ? formatCurrency(kpis.averageOrderValue) : formatCurrency(0)}
                </span>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 2: RECENT ACTIVITY & TOP DISHES */}
      {/* Pushed down below the initial screen fold ("necha kro") */}
      {/* ======================================================== */}
      <div className="mt-8 sm:mt-12 pt-4 pb-2">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 items-stretch">
        {/* Card 7: Recent Activity Card (6 Cols) */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-4 sm:p-4.5 border border-slate-200/70 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-start">
          <div className="flex items-center justify-between pb-2.5">
            <h2 className="text-sm sm:text-base font-bold text-slate-800">
              Recent Activity
            </h2>
          </div>

          {/* Activity List or Empty State */}
          {displayRecentActivities.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-2.5">
                <Clock3 className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-700">No Recent Activity</span>
              <span className="text-[11px] text-slate-400 mt-0.5 max-w-[220px]">
                Sales and invoice reversals will be logged here
              </span>
            </div>
          ) : (
            <div className="divide-y divide-slate-100/80">
              {displayRecentActivities.map((act) => (
                <div
                  key={act.id}
                  className="py-2.5 flex items-center justify-between gap-3 group"
                >
                  {/* Food Image + Title */}
                  <div className="flex items-center gap-3 min-w-0">
                    <FoodThumbnail
                      src={act.image}
                      alt="Dish thumbnail"
                      fallbackEmoji={act.fallbackEmoji}
                      className="w-10 h-10 rounded-full shadow-2xs border border-slate-100 shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="text-xs sm:text-sm font-semibold text-slate-800 block truncate leading-snug">
                        {act.title}
                      </span>
                      <div className="flex items-center gap-2.5 text-[11px] text-slate-400 font-normal mt-0.5">
                        <span>{act.price}</span>
                        <span>{act.orderNumber}</span>
                        <span className="flex items-center gap-1">
                          <Clock3 className="w-3 h-3 text-slate-400" />
                          {act.waitTime}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`${act.statusColor} text-white font-semibold text-[10px] sm:text-[11px] px-3 py-0.5 rounded-full shadow-2xs shrink-0 tracking-wide`}
                  >
                    {act.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card 8: Top Dishes Card (6 Cols) */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-4 sm:p-4.5 border border-slate-200/70 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-start">
          <div className="flex items-center justify-between pb-2.5">
            <h2 className="text-sm sm:text-base font-bold text-slate-800">
              Top Dishes
            </h2>

            <div className="relative">
              <button
                type="button"
                onClick={() => toggleDropdown('dishes')}
                className="px-2.5 py-1 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{datePreset}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {dropdownOpenCard === 'dishes' && (
                <div className="absolute right-0 top-10 w-32 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 animate-in fade-in duration-100">
                  {presets.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleSelectPreset(p)}
                      className="w-full text-left px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-orange-50 hover:text-[#FF5C28] transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Dishes List or Empty State */}
          {displayTopDishes.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-full bg-orange-50 text-[#FF5C28] flex items-center justify-center mb-2.5">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-700">No Dishes Sold</span>
              <span className="text-[11px] text-slate-400 mt-0.5 max-w-[220px]">
                Top selling dishes will appear here once orders are completed in POS
              </span>
            </div>
          ) : (
            <div className="divide-y divide-slate-100/80">
              {displayTopDishes.map((dish, idx) => (
                <div
                  key={`${dish.id}-${idx}`}
                  className="py-2 flex items-center justify-between gap-3 group"
                >
                  {/* Rectangular Food Thumbnail + Name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <FoodThumbnail
                      key={`${dish.image}-${dish.name}`}
                      src={dish.image}
                      alt={dish.name}
                      fallbackEmoji={dish.fallbackEmoji}
                      className="w-12 h-8 sm:w-13 sm:h-9 rounded-xl shadow-2xs border border-slate-100 shrink-0"
                    />
                    <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
                      {dish.name}
                    </span>
                  </div>

                  {/* Orders Count with Orange 'Orders' label */}
                  <div className="text-right shrink-0 flex items-baseline gap-1">
                    <span className="text-sm font-bold text-slate-800">
                      {dish.orders}
                    </span>
                    <span className="text-[11px] font-medium text-[#FF5C28]">
                      Orders
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

