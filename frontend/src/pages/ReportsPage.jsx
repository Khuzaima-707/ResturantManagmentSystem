import React, { useState, useMemo, useEffect } from 'react';
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  RotateCcw,
  BarChart2,
  Download,
  Printer,
  FileSpreadsheet,
  Receipt,
  Eye,
  CreditCard,
  RotateCcw as ResetIcon,
  Percent,
  AlertTriangle,
  Lock,
  Calendar,
  FileText,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { KPICard } from '../components/ui/KPICard';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Tabs } from '../components/ui/Tabs';
import { Badge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { SearchInput } from '../components/ui/SearchInput';
import { useAppStore } from '../store';
import {
  filterReportOrders,
  filterReportReversals,
  deriveSalesReport,
  deriveRevenueReport,
  deriveReversalReport,
  groupRevenueByDate,
  groupReversalsByDate,
  getPaymentMethodBreakdown,
  getTaxBreakdown,
  getDiscountBreakdown,
  getProfitAndCostReportData,
  deriveFinancialSummaryReport,
  sortInvoicesDescending,
  sortInvoicesAscending,
} from '../domain/selectors/reportSelectors';
import {
  groupSalesByDate,
  groupSalesByCategory,
} from '../domain/selectors/dashboardSelectors';
import {
  filterOrdersByOwnership,
  repairDuplicateInvoiceNumbersLocally,
} from '../domain/selectors/invoiceSelectors';
import { formatCurrency, formatNumber } from '../utils/formatters';
import {
  exportSalesReportExcel,
  exportSalesReportCsv,
  exportRevenueReportExcel,
  exportRevenueReportCsv,
  exportReversalReportExcel,
  exportReversalReportCsv,
  exportProfitReportExcel,
  exportProfitReportCsv,
  exportFinancialSummaryExcel,
  exportFinancialSummaryCsv,
  downloadReportPdf,
} from '../services/export/reportExporter';
import { InvoiceModal } from '../features/pos/components/InvoiceModal';

const DONUT_COLORS = [
  '#3B82F6', // Blue (matches screenshot slice)
  '#FF5C28', // Signature Coral/Orange (matches screenshot slice)
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
];

/**
 * ReportsPage Component
 * Full-featured analytics and reporting module:
 * 1. Sales Report
 * 2. Revenue Report
 * 3. Reversal Report
 *
 * All metrics, charts, and tables strictly derive from a single unified filter source,
 * using historical transaction snapshots and reconciling 100% with accounting rules.
 */
export const ReportsPage = () => {
  const { orders, reversals, categories, settings, items, addons, deals, user } = useAppStore();

  const isCashier = Boolean(
    (user?.role?.toLowerCase().includes('cashier') && !user?.role?.toLowerCase().includes('admin')) ||
    (user?.username?.toLowerCase() === 'cashier' && user?.username?.toLowerCase() !== 'admin')
  );

  // Navigation tab: 'Sales' | 'Revenue' | 'Reversals' | 'Profit'
  const [activeTab, setActiveTab] = useState('Sales');

  // Unified Filter States (Cashier strictly locked to 'Today')
  const [datePreset, setDatePreset] = useState(isCashier ? 'Today' : 'All Dates');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedItem, setSelectedItem] = useState('All');
  const [profitViewType, setProfitViewType] = useState('all'); // 'all' | 'items' | 'addons'
  const [profitSortBy, setProfitSortBy] = useState('recent'); // 'recent' | 'sales' | 'profit' | 'margin' | 'qty'
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('All');
  const [selectedOrderType, setSelectedOrderType] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedReason, setSelectedReason] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [financialTableTab, setFinancialTableTab] = useState('items'); // 'items' | 'orders'
  const [invoiceSortOrder, setInvoiceSortOrder] = useState('desc'); // 'desc' (5->1) | 'asc' (1->5)

  // Pagination
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal for Viewing Historical Invoice (Read-Only)
  const [selectedInvoiceForView, setSelectedInvoiceForView] = useState(null);

  // Cashier cannot see wholesale costs & profit margins
  const tabs = useMemo(() => {
    if (isCashier) {
      return [
        { id: 'Sales', label: "Today's Sales" },
        { id: 'Revenue', label: "Today's Revenue" },
        { id: 'Reversals', label: "Today's Reversals" },
        { id: 'FinancialSummary', label: "Today's Financial Summary" },
      ];
    }
    return [
      { id: 'Sales', label: 'Sales' },
      { id: 'Revenue', label: 'Revenue' },
      { id: 'Reversals', label: 'Reversals' },
      { id: 'Profit', label: 'Profit & Cost' },
      { id: 'FinancialSummary', label: 'Financial Summary' },
    ];
  }, [isCashier]);

  useEffect(() => {
    if (isCashier && activeTab === 'Profit') {
      setActiveTab('Sales');
    }
  }, [isCashier, activeTab]);

  const effectiveDatePreset = isCashier ? 'Today' : datePreset;
  const effectiveCustomRange = useMemo(() => {
    return isCashier
      ? null
      : (datePreset === 'Custom' && customStartDate && customEndDate
          ? { startDate: customStartDate, endDate: customEndDate }
          : null);
  }, [isCashier, datePreset, customStartDate, customEndDate]);

  const customRange = effectiveCustomRange;

  // Role-based visible datasets
  const visibleOrders = useMemo(() => {
    const scoped = filterOrdersByOwnership(orders, user);
    return repairDuplicateInvoiceNumbersLocally(scoped);
  }, [orders, user]);

  const visibleReversals = useMemo(() => {
    if (!isCashier) return reversals;
    const allowedOrderIds = new Set(visibleOrders.map((o) => o.id));
    const allowedInvoiceNumbers = new Set(visibleOrders.map((o) => o.invoiceNumber));
    return (reversals || []).filter(
      (r) => allowedOrderIds.has(r.originalOrderId) || allowedInvoiceNumbers.has(r.originalInvoiceNumber)
    );
  }, [reversals, visibleOrders, isCashier]);

  // Unified Filtered Datasets (Single source of truth)
  const filteredOrders = useMemo(() => {
    const list = filterReportOrders(visibleOrders, {
      datePreset: effectiveDatePreset,
      customRange: effectiveCustomRange,
      category: selectedCategory,
      paymentMethod: selectedPaymentMethod,
      orderType: selectedOrderType,
      status: selectedStatus,
      searchQuery,
    });
    return invoiceSortOrder === 'asc'
      ? [...list].sort(sortInvoicesAscending)
      : [...list].sort(sortInvoicesDescending);
  }, [
    visibleOrders,
    effectiveDatePreset,
    effectiveCustomRange,
    selectedCategory,
    selectedPaymentMethod,
    selectedOrderType,
    selectedStatus,
    searchQuery,
    invoiceSortOrder,
  ]);

  const filteredReversals = useMemo(() => {
    const list = filterReportReversals(visibleReversals, {
      datePreset: effectiveDatePreset,
      customRange: effectiveCustomRange,
      reason: selectedReason,
      searchQuery,
    });
    return invoiceSortOrder === 'asc'
      ? [...list].sort(sortInvoicesAscending)
      : [...list].sort(sortInvoicesDescending);
  }, [visibleReversals, effectiveDatePreset, effectiveCustomRange, selectedReason, searchQuery, invoiceSortOrder]);

  const reversedOrderIds = useMemo(() => {
    const set = new Set();
    const sourceReversals = Array.isArray(reversals) ? reversals : [];
    sourceReversals.forEach((r) => {
      if (r.originalOrderId) set.add(String(r.originalOrderId));
      if (r.orderId) set.add(String(r.orderId));
      if (r.originalInvoiceNumber) set.add(String(r.originalInvoiceNumber).toUpperCase());
      if (r.invoiceNumber) set.add(String(r.invoiceNumber).toUpperCase());
    });
    return set;
  }, [reversals]);

  const validFilteredOrders = useMemo(() => {
    return filteredOrders.filter((o) => {
      if (!o) return false;
      if ((o.status || '').toLowerCase() === 'reversed') return false;
      if (o.reversalId) return false;
      if (o.id && reversedOrderIds.has(String(o.id))) return false;
      if (o.invoiceNumber && reversedOrderIds.has(String(o.invoiceNumber).toUpperCase())) return false;
      return true;
    });
  }, [filteredOrders, reversedOrderIds]);

  // Reset Filters
  const handleResetFilters = () => {
    setDatePreset(isCashier ? 'Today' : 'All Dates');
    setCustomStartDate('');
    setCustomEndDate('');
    setSelectedCategory('All');
    setSelectedItem('All');
    setProfitViewType('all');
    setProfitSortBy('recent');
    setSelectedPaymentMethod('All');
    setSelectedOrderType('All');
    setSelectedStatus('All');
    setSelectedReason('All');
    setSearchQuery('');
    setCurrentPage(1);
  };

  // --- DERIVED REPORT KPIS ---
  const salesKpis = useMemo(() => {
    return deriveSalesReport(filteredOrders, filteredReversals);
  }, [filteredOrders, filteredReversals]);

  const revenueKpis = useMemo(() => {
    return deriveRevenueReport(filteredOrders, filteredReversals);
  }, [filteredOrders, filteredReversals]);

  const reversalKpis = useMemo(() => {
    return deriveReversalReport(filteredReversals);
  }, [filteredReversals]);

  const hasAnyDeals = useMemo(() => {
    return Boolean(
      (deals && deals.length > 0) ||
      (visibleOrders && visibleOrders.some((o) => (o.lines || []).some((l) => l.isDeal || l.dealId || l.categoryNameSnapshot === 'Deals')))
    );
  }, [deals, visibleOrders]);

  useEffect(() => {
    if (!hasAnyDeals && profitViewType === 'deals') {
      setProfitViewType('all');
    }
  }, [hasAnyDeals, profitViewType]);

  // Profit & Cost Report Data (Deterministic, snapshot-based, includes Add-ons)
  const profitReportData = useMemo(() => {
    return getProfitAndCostReportData(
      visibleOrders,
      visibleReversals,
      {
        datePreset,
        customRange,
        category: selectedCategory,
        item: selectedItem !== 'All' ? selectedItem : searchQuery,
        viewType: profitViewType,
        sortBy: profitSortBy,
      },
      items,
      addons
    );
  }, [visibleOrders, visibleReversals, datePreset, customRange, selectedCategory, selectedItem, searchQuery, profitViewType, profitSortBy, items, addons]);

  const profitKpis = profitReportData.kpis;
  const profitItemRows = profitReportData.itemRows;

  // Role Visibility: Admin sees full summary including costs/profits; Cashier is restricted
  const canViewCosts = !isCashier;

  // Financial Summary / Profit & Loss Report Data (Reconciled statement, trend & item profitability)
  const financialSummaryReport = useMemo(() => {
    return deriveFinancialSummaryReport(
      visibleOrders,
      visibleReversals,
      {
        datePreset: effectiveDatePreset,
        customRange: effectiveCustomRange,
        category: selectedCategory,
        item: selectedItem !== 'All' ? selectedItem : searchQuery,
        paymentMethod: selectedPaymentMethod,
        orderType: selectedOrderType,
        status: selectedStatus,
        searchQuery,
        sortBy: profitSortBy,
      },
      items,
      addons
    );
  }, [
    visibleOrders,
    visibleReversals,
    effectiveDatePreset,
    effectiveCustomRange,
    selectedCategory,
    selectedItem,
    selectedPaymentMethod,
    selectedOrderType,
    selectedStatus,
    searchQuery,
    profitSortBy,
    items,
    addons,
  ]);

  // --- CHARTS & BREAKDOWNS ---
  // Sales Daily Chart
  const salesDailyChart = useMemo(() => {
    return groupSalesByDate(filteredOrders, filteredReversals, datePreset, customRange);
  }, [filteredOrders, filteredReversals, datePreset, customRange]);

  // Category Breakdown
  const categoryBreakdown = useMemo(() => {
    const raw = groupSalesByCategory(filteredOrders, filteredReversals);
    return raw.map((cat, idx) => ({
      ...cat,
      name: cat.name || cat.category || 'Category',
      category: cat.name || cat.category || 'Category',
      value: Number(cat.value || cat.sales || 0),
      sales: Number(cat.value || cat.sales || 0),
      color: DONUT_COLORS[idx % DONUT_COLORS.length],
    }));
  }, [filteredOrders, filteredReversals]);

  // Revenue Daily Chart
  const revenueDailyChart = useMemo(() => {
    return groupRevenueByDate(filteredOrders, filteredReversals, datePreset, customRange);
  }, [filteredOrders, filteredReversals, datePreset, customRange]);

  // Payment Breakdown
  const paymentBreakdown = useMemo(() => {
    return getPaymentMethodBreakdown(filteredOrders, filteredReversals);
  }, [filteredOrders, filteredReversals]);

  // Tax Breakdown
  const taxBreakdown = useMemo(() => {
    return getTaxBreakdown(filteredOrders, filteredReversals);
  }, [filteredOrders, filteredReversals]);

  // Discount Breakdown
  const discountBreakdown = useMemo(() => {
    return getDiscountBreakdown(filteredOrders);
  }, [filteredOrders]);

  // Reversal Daily Chart
  const reversalDailyChart = useMemo(() => {
    return groupReversalsByDate(filteredReversals, effectiveDatePreset, effectiveCustomRange);
  }, [filteredReversals, effectiveDatePreset, effectiveCustomRange]);

  // --- EXPORT HANDLERS ---
  const handleExportExcel = () => {
    const filterMetadata = {
      datePreset: effectiveDatePreset,
      category: selectedCategory,
      item: selectedItem !== 'All' ? selectedItem : searchQuery,
      paymentMethod: selectedPaymentMethod,
      orderType: selectedOrderType,
      status: selectedStatus,
      reason: selectedReason,
    };

    if (activeTab === 'Sales') {
      exportSalesReportExcel({
        orders: filteredOrders,
        kpis: salesKpis,
        filters: filterMetadata,
        settings,
      });
    } else if (activeTab === 'Revenue') {
      exportRevenueReportExcel({
        kpis: revenueKpis,
        paymentBreakdown,
        taxBreakdown,
        discountBreakdown,
        filters: filterMetadata,
        settings,
      });
    } else if (activeTab === 'Profit') {
      exportProfitReportExcel({
        itemRows: profitItemRows,
        kpis: profitKpis,
        filters: filterMetadata,
        settings,
      });
    } else if (activeTab === 'FinancialSummary') {
      exportFinancialSummaryExcel({
        statement: financialSummaryReport.statement,
        itemRows: financialSummaryReport.itemRows,
        filters: filterMetadata,
        settings,
        user,
        canViewCosts,
      });
    } else {
      exportReversalReportExcel({
        reversals: filteredReversals,
        kpis: reversalKpis,
        filters: filterMetadata,
        settings,
      });
    }
  };

  const handleExportCsv = () => {
    const filterMetadata = {
      datePreset: effectiveDatePreset,
      category: selectedCategory,
      item: selectedItem !== 'All' ? selectedItem : searchQuery,
      paymentMethod: selectedPaymentMethod,
      orderType: selectedOrderType,
      status: selectedStatus,
      reason: selectedReason,
    };

    if (activeTab === 'Sales') {
      exportSalesReportCsv({
        orders: filteredOrders,
        kpis: salesKpis,
        filters: filterMetadata,
        settings,
      });
    } else if (activeTab === 'Revenue') {
      exportRevenueReportCsv({
        kpis: revenueKpis,
        paymentBreakdown,
        taxBreakdown,
        discountBreakdown,
        filters: filterMetadata,
        settings,
      });
    } else if (activeTab === 'Profit') {
      exportProfitReportCsv({
        itemRows: profitItemRows,
        kpis: profitKpis,
        filters: filterMetadata,
        settings,
      });
    } else if (activeTab === 'FinancialSummary') {
      exportFinancialSummaryCsv({
        statement: financialSummaryReport.statement,
        itemRows: financialSummaryReport.itemRows,
        filters: filterMetadata,
        settings,
        user,
        canViewCosts,
      });
    } else {
      exportReversalReportCsv({
        reversals: filteredReversals,
        kpis: reversalKpis,
        filters: filterMetadata,
        settings,
      });
    }
  };

  const handleDownloadPdf = () => {
    if (activeTab === 'FinancialSummary') {
      downloadReportPdf({
        reportType: 'Financial Summary',
        statement: financialSummaryReport.statement,
        itemRows: financialSummaryReport.itemRows,
        filters: { datePreset: effectiveDatePreset },
        settings,
        user,
        canViewCosts,
      });
      return;
    }

    const kpisToExport =
      activeTab === 'Sales'
        ? salesKpis
        : activeTab === 'Revenue'
        ? revenueKpis
        : activeTab === 'Profit'
        ? {
            netSales: profitKpis.netSales,
            cogs: profitKpis.cogs,
            grossProfit: profitKpis.grossProfit,
            grossProfitMargin: `${profitKpis.grossProfitMargin}%`,
            missingCostItems: profitKpis.hasMissingCosts ? `${profitKpis.missingCostCount} items` : 'None',
          }
        : reversalKpis;

    downloadReportPdf({
      reportType: activeTab === 'Profit' ? 'Profit & Cost' : activeTab,
      kpis: kpisToExport,
      filters: { datePreset: effectiveDatePreset },
      settings,
      user,
      canViewCosts,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  // --- TABLE COLUMNS & DATA ---
  // Sales Detailed Table
  const salesTableColumns = [
    {
      key: 'invoiceNumber',
      title: (
        <button
          type="button"
          onClick={() => {
            setInvoiceSortOrder((d) => (d === 'desc' ? 'asc' : 'desc'));
            setCurrentPage(1);
          }}
          className="hover:text-[#FF5C28] inline-flex items-center gap-1 font-bold cursor-pointer"
          title={`Click to sort invoices (${invoiceSortOrder === 'desc' ? 'currently newest first' : 'currently oldest first'})`}
        >
          <span>Invoice #</span>
          <span className="text-[10px] text-[#FF5C28] font-bold">
            {invoiceSortOrder === 'desc' ? '↓' : '↑'}
          </span>
        </button>
      ),
      headerClassName: 'w-32 font-bold whitespace-nowrap',
      cellClassName: 'whitespace-nowrap',
      render: (invNum, row) => (
        <button
          type="button"
          onClick={() => setSelectedInvoiceForView(row)}
          className="font-bold text-xs text-[#FF5C28] hover:underline cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <Receipt className="w-3.5 h-3.5 shrink-0" />
          <span className="whitespace-nowrap font-mono">{invNum || `#${row.id}`}</span>
        </button>
      ),
    },
    {
      key: 'completedAt',
      title: 'Date & Time',
      headerClassName: 'w-36 whitespace-nowrap',
      cellClassName: 'whitespace-nowrap',
      render: (dVal, row) => {
        const d = new Date(dVal || row.createdAt || Date.now());
        return (
          <div className="text-[11px] text-slate-700 whitespace-nowrap">
            <span className="font-semibold block whitespace-nowrap">{d.toLocaleDateString()}</span>
            <span className="text-slate-400 whitespace-nowrap">
              {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
            </span>
          </div>
        );
      },
    },
    {
      key: 'orderType',
      title: 'Order Type',
      headerClassName: 'w-24 text-center whitespace-nowrap',
      align: 'center',
      cellClassName: 'text-center whitespace-nowrap',
      render: (type) => (
        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 whitespace-nowrap">
          {type || 'Dine-In'}
        </span>
      ),
    },
    {
      key: 'lines',
      title: 'Items',
      headerClassName: 'min-w-[130px]',
      render: (lines) => {
        const count = (lines || []).reduce((q, l) => q + (Number(l.quantity) || 1), 0);
        const preview = (lines || []).map((l) => l.itemNameSnapshot).slice(0, 2).join(', ');
        return (
          <div className="text-[11px]">
            <span className="font-semibold text-slate-800">{count} items</span>
            {preview && (
              <span className="text-slate-400 block truncate max-w-xs text-[10px]">
                {preview}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'subtotal',
      title: 'Subtotal',
      headerClassName: 'w-24 text-right',
      align: 'right',
      cellClassName: 'text-right',
      render: (sub, row) => {
        const isRev =
          (row?.status || '').toLowerCase() === 'reversed' ||
          Boolean(row?.reversalId) ||
          (row?.id && reversedOrderIds.has(String(row.id))) ||
          (row?.invoiceNumber && reversedOrderIds.has(String(row.invoiceNumber).toUpperCase()));
        if (isRev) {
          return <span className="text-xs text-slate-400 line-through" title="Reversed sale excluded from valid sales total">{formatCurrency(sub || 0)}</span>;
        }
        return <span className="text-xs text-slate-700">{formatCurrency(sub || 0)}</span>;
      },
    },
    {
      key: 'discountAmount',
      title: 'Discount',
      headerClassName: 'w-20 text-right',
      align: 'right',
      cellClassName: 'text-right',
      render: (disc, row) => {
        const isRev =
          (row?.status || '').toLowerCase() === 'reversed' ||
          Boolean(row?.reversalId) ||
          (row?.id && reversedOrderIds.has(String(row.id))) ||
          (row?.invoiceNumber && reversedOrderIds.has(String(row.invoiceNumber).toUpperCase()));
        if (isRev) {
          return <span className="text-xs text-slate-400 line-through">Rs 0</span>;
        }
        return (
          <span className="text-xs text-rose-600">
            {Number(disc) > 0 ? `-${formatCurrency(disc)}` : 'Rs 0'}
          </span>
        );
      },
    },
    {
      key: 'taxAmount',
      title: 'Tax',
      headerClassName: 'w-20 text-right',
      align: 'right',
      cellClassName: 'text-right',
      render: (tax, row) => {
        const isRev =
          (row?.status || '').toLowerCase() === 'reversed' ||
          Boolean(row?.reversalId) ||
          (row?.id && reversedOrderIds.has(String(row.id))) ||
          (row?.invoiceNumber && reversedOrderIds.has(String(row.invoiceNumber).toUpperCase()));
        if (isRev) {
          return <span className="text-xs text-slate-400 line-through">Rs 0</span>;
        }
        return <span className="text-xs text-slate-500">{formatCurrency(tax || 0)}</span>;
      },
    },
    {
      key: 'grandTotal',
      title: 'Grand Total',
      headerClassName: 'w-28 text-right font-bold',
      align: 'right',
      cellClassName: 'text-right',
      render: (total, row) => {
        const isRev =
          (row?.status || '').toLowerCase() === 'reversed' ||
          Boolean(row?.reversalId) ||
          (row?.id && reversedOrderIds.has(String(row.id))) ||
          (row?.invoiceNumber && reversedOrderIds.has(String(row.invoiceNumber).toUpperCase()));
        if (isRev) {
          return <span className="text-xs text-slate-400 line-through" title="Reversed sale excluded from valid sales total">{formatCurrency(total || 0)}</span>;
        }
        return <span className="font-bold text-xs text-slate-900">{formatCurrency(total || 0)}</span>;
      },
    },
    {
      key: 'paymentMethod',
      title: 'Payment',
      headerClassName: 'w-20 text-center',
      align: 'center',
      cellClassName: 'text-center',
      render: (method) => (
        <span className="text-[11px] font-medium text-slate-700">{method || 'Cash'}</span>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      headerClassName: 'w-24 text-center',
      align: 'center',
      cellClassName: 'text-center',
      render: (status, row) => {
        const isRev =
          (status || '').toLowerCase() === 'reversed' ||
          Boolean(row?.reversalId) ||
          (row?.id && reversedOrderIds.has(String(row.id))) ||
          (row?.invoiceNumber && reversedOrderIds.has(String(row.invoiceNumber).toUpperCase()));
        const isPartial =
          (Number(row?.balanceDue) > 0 || (row?.paymentStatus || '').toLowerCase() === 'partial') &&
          !isRev;
        if (isRev) {
          return (
            <Badge variant="danger" size="sm">
              Reversed
            </Badge>
          );
        }
        if (isPartial) {
          return (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-100 text-amber-800 border border-amber-300"
              title={`Balance Due: ${formatCurrency(row?.balanceDue || 0)}`}
            >
              Partial
            </span>
          );
        }
        return (
          <Badge variant="success" size="sm">
            Completed
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      title: 'Action',
      headerClassName: 'w-20 text-center',
      align: 'center',
      cellClassName: 'text-center',
      render: (_, row) => (
        <button
          type="button"
          onClick={() => setSelectedInvoiceForView(row)}
          className="p-1.5 rounded-lg text-slate-500 hover:text-[#FF5C28] hover:bg-orange-50 transition-colors cursor-pointer"
          title="View Historical Invoice"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  // Revenue Detailed Records Table
  const revenueTableColumns = [
    {
      key: 'invoiceNumber',
      title: (
        <button
          type="button"
          onClick={() => {
            setInvoiceSortOrder((d) => (d === 'desc' ? 'asc' : 'desc'));
            setCurrentPage(1);
          }}
          className="hover:text-[#FF5C28] inline-flex items-center gap-1 font-bold cursor-pointer"
          title={`Click to sort invoices (${invoiceSortOrder === 'desc' ? 'currently newest first' : 'currently oldest first'})`}
        >
          <span>Invoice #</span>
          <span className="text-[10px] text-[#FF5C28] font-bold">
            {invoiceSortOrder === 'desc' ? '↓' : '↑'}
          </span>
        </button>
      ),
      headerClassName: 'w-32 font-bold whitespace-nowrap',
      cellClassName: 'whitespace-nowrap',
      render: (invNum, row) => (
        <button
          type="button"
          onClick={() => setSelectedInvoiceForView(row)}
          className="font-bold text-xs text-[#FF5C28] hover:underline cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <Receipt className="w-3.5 h-3.5 shrink-0" />
          <span className="whitespace-nowrap font-mono">{invNum || `#${row.id}`}</span>
        </button>
      ),
    },
    {
      key: 'completedAt',
      title: 'Date & Time',
      headerClassName: 'w-36 whitespace-nowrap',
      cellClassName: 'whitespace-nowrap',
      render: (dVal, row) => {
        const d = new Date(dVal || row.createdAt || Date.now());
        return (
          <div className="text-[11px] text-slate-700 whitespace-nowrap">
            <span className="font-semibold block whitespace-nowrap">{d.toLocaleDateString()}</span>
            <span className="text-slate-400 whitespace-nowrap">
              {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
            </span>
          </div>
        );
      },
    },
    {
      key: 'orderType',
      title: 'Order Type',
      headerClassName: 'w-24 text-center whitespace-nowrap',
      align: 'center',
      cellClassName: 'text-center whitespace-nowrap',
      render: (type) => (
        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 whitespace-nowrap">
          {type || 'Dine-In'}
        </span>
      ),
    },
    {
      key: 'paymentMethod',
      title: 'Payment',
      headerClassName: 'w-24 text-center',
      align: 'center',
      cellClassName: 'text-center',
      render: (method) => (
        <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          {method || 'Cash'}
        </span>
      ),
    },
    {
      key: 'grandTotal',
      title: 'Gross Billed',
      headerClassName: 'w-24 text-right',
      align: 'right',
      cellClassName: 'text-right',
      render: (total, row) => {
        const isRev =
          (row?.status || '').toLowerCase() === 'reversed' ||
          Boolean(row?.reversalId) ||
          (row?.id && reversedOrderIds.has(String(row.id))) ||
          (row?.invoiceNumber && reversedOrderIds.has(String(row.invoiceNumber).toUpperCase()));
        if (isRev) {
          return (
            <span className="text-xs text-slate-400 line-through" title="Reversed sale excluded from valid revenue total">
              {formatCurrency(total ?? row?.grandTotal ?? 0)}
            </span>
          );
        }
        return (
          <span className="text-xs font-semibold text-slate-800">
            {formatCurrency(total ?? row?.grandTotal ?? 0)}
          </span>
        );
      },
    },
    {
      key: 'discountAmount',
      title: 'Discount',
      headerClassName: 'w-24 text-right',
      align: 'right',
      cellClassName: 'text-right',
      render: (disc, row) => {
        const isRev =
          (row?.status || '').toLowerCase() === 'reversed' ||
          Boolean(row?.reversalId) ||
          (row?.id && reversedOrderIds.has(String(row.id))) ||
          (row?.invoiceNumber && reversedOrderIds.has(String(row.invoiceNumber).toUpperCase()));
        if (isRev) {
          return <span className="text-xs text-slate-400 line-through">Rs 0</span>;
        }
        return (
          <span className="text-xs text-rose-600 font-medium">
            {Number(disc) > 0 ? `-${formatCurrency(disc)}` : 'Rs 0'}
          </span>
        );
      },
    },
    {
      key: 'taxAmount',
      title: 'Tax Collected',
      headerClassName: 'w-24 text-right',
      align: 'right',
      cellClassName: 'text-right',
      render: (tax, row) => {
        const isRev =
          (row?.status || '').toLowerCase() === 'reversed' ||
          Boolean(row?.reversalId) ||
          (row?.id && reversedOrderIds.has(String(row.id))) ||
          (row?.invoiceNumber && reversedOrderIds.has(String(row.invoiceNumber).toUpperCase()));
        if (isRev) {
          return <span className="text-xs text-slate-400 line-through">Rs 0</span>;
        }
        return <span className="text-xs text-amber-700 font-medium">{formatCurrency(tax || 0)}</span>;
      },
    },
    {
      key: 'netRevenue',
      title: 'Net Revenue',
      headerClassName: 'w-28 text-right font-bold',
      align: 'right',
      cellClassName: 'text-right',
      render: (_, row) => {
        const isRev =
          (row?.status || '').toLowerCase() === 'reversed' ||
          Boolean(row?.reversalId) ||
          (row?.id && reversedOrderIds.has(String(row.id))) ||
          (row?.invoiceNumber && reversedOrderIds.has(String(row.invoiceNumber).toUpperCase()));
        if (isRev) {
          return <span className="text-xs text-slate-400 line-through">Rs 0</span>;
        }
        const net = Math.max(0, (row?.grandTotal || 0) - (row?.taxAmount || 0));
        return <span className="font-bold text-xs text-emerald-700">{formatCurrency(net)}</span>;
      },
    },
    {
      key: 'status',
      title: 'Status',
      headerClassName: 'w-24 text-center',
      align: 'center',
      cellClassName: 'text-center',
      render: (status, row) => {
        const isRev =
          (status || '').toLowerCase() === 'reversed' ||
          Boolean(row?.reversalId) ||
          (row?.id && reversedOrderIds.has(String(row.id))) ||
          (row?.invoiceNumber && reversedOrderIds.has(String(row.invoiceNumber).toUpperCase()));
        const isPartial =
          (Number(row?.balanceDue) > 0 || (row?.paymentStatus || '').toLowerCase() === 'partial') &&
          !isRev;
        if (isRev) {
          return (
            <Badge variant="danger" size="sm">
              Reversed
            </Badge>
          );
        }
        if (isPartial) {
          return (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-100 text-amber-800 border border-amber-300"
              title={`Balance Due: ${formatCurrency(row?.balanceDue || 0)}`}
            >
              Partial
            </span>
          );
        }
        return (
          <Badge variant="success" size="sm">
            Completed
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      title: 'Action',
      headerClassName: 'w-20 text-center',
      align: 'center',
      cellClassName: 'text-center',
      render: (_, row) => (
        <button
          type="button"
          onClick={() => setSelectedInvoiceForView(row)}
          className="p-1.5 rounded-lg text-slate-500 hover:text-[#FF5C28] hover:bg-orange-50 transition-colors cursor-pointer"
          title="View Invoice"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  // Reversals Detailed Table
  const reversalTableColumns = [
    {
      key: 'id',
      title: 'Reversal ID',
      headerClassName: 'w-28 font-bold',
      render: (id) => <span className="font-mono text-xs font-semibold text-slate-700">{id}</span>,
    },
    {
      key: 'originalInvoiceNumber',
      title: (
        <button
          type="button"
          onClick={() => {
            setInvoiceSortOrder((d) => (d === 'desc' ? 'asc' : 'desc'));
            setCurrentPage(1);
          }}
          className="hover:text-[#FF5C28] inline-flex items-center gap-1 font-bold cursor-pointer"
          title={`Click to sort invoices (${invoiceSortOrder === 'desc' ? 'currently newest first' : 'currently oldest first'})`}
        >
          <span>Original Inv #</span>
          <span className="text-[10px] text-[#FF5C28] font-bold">
            {invoiceSortOrder === 'desc' ? '↓' : '↑'}
          </span>
        </button>
      ),
      headerClassName: 'w-28 font-bold whitespace-nowrap',
      cellClassName: 'whitespace-nowrap',
      render: (invNum, row) => {
        const originalOrder = orders.find((o) => o.id === row.originalOrderId);
        return (
          <button
            type="button"
            onClick={() => originalOrder && setSelectedInvoiceForView(originalOrder)}
            className="font-bold text-xs text-[#FF5C28] hover:underline cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Receipt className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap font-mono">{invNum}</span>
          </button>
        );
      },
    },
    {
      key: 'reversedAt',
      title: 'Reversal Date & Time',
      headerClassName: 'w-36',
      render: (dVal, row) => {
        const d = new Date(dVal || row.createdAt || Date.now());
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
      key: 'reason',
      title: 'Reason',
      headerClassName: 'min-w-[140px]',
      render: (reason) => (
        <span className="text-xs font-medium text-slate-800">{reason || 'N/A'}</span>
      ),
    },
    {
      key: 'subtotalReversed',
      title: 'Subtotal Reversed',
      headerClassName: 'w-28 text-right',
      align: 'right',
      cellClassName: 'text-right',
      render: (sub) => (
        <span className="text-xs text-slate-700">{formatCurrency(sub || 0)}</span>
      ),
    },
    {
      key: 'taxReversed',
      title: 'Tax Reversed',
      headerClassName: 'w-24 text-right',
      align: 'right',
      cellClassName: 'text-right',
      render: (tax) => (
        <span className="text-xs text-slate-500">{formatCurrency(tax || 0)}</span>
      ),
    },
    {
      key: 'totalReversedIncludingTax',
      title: 'Total Reversed',
      headerClassName: 'w-28 text-right font-bold',
      align: 'right',
      cellClassName: 'text-right',
      render: (total) => (
        <span className="font-bold text-xs text-rose-600">{formatCurrency(total || 0)}</span>
      ),
    },
    {
      key: 'actions',
      title: 'View Inv',
      headerClassName: 'w-20 text-center',
      align: 'center',
      cellClassName: 'text-center',
      render: (_, row) => {
        const originalOrder = orders.find((o) => o.id === row.originalOrderId);
        return originalOrder ? (
          <button
            type="button"
            onClick={() => setSelectedInvoiceForView(originalOrder)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-[#FF5C28] hover:bg-orange-50 transition-colors cursor-pointer"
            title="View Original Invoice"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        ) : (
          <span className="text-slate-300">—</span>
        );
      },
    },
  ];

  // Profit & Cost Table Columns
  const profitTableColumns = [
    {
      key: 'name',
      title: (
        <button
          type="button"
          onClick={() => {
            setProfitSortBy((s) => (s === 'recent' ? 'sales' : 'recent'));
            setCurrentPage(1);
          }}
          className="hover:text-[#FF5C28] inline-flex items-center gap-1 font-bold cursor-pointer"
          title="Click to sort by recently sold"
        >
          <span>Item</span>
          {profitSortBy === 'recent' && <span className="text-[10px] text-[#FF5C28]">↓</span>}
        </button>
      ),
      headerClassName: 'min-w-[170px] font-bold',
      render: (name, row) => {
        if (row.isDealComponent) {
          return (
            <div className="pl-3.5 flex items-start gap-1.5 py-0.5">
              <span className="text-slate-400 font-mono text-xs mt-0.5 select-none">↳</span>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-xs text-slate-800">{name}</span>
                  {row.portion && (
                    <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded font-normal">
                      {row.portion}
                    </span>
                  )}
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    Deal Item
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Part of {row.parentDealName}
                </div>
              </div>
            </div>
          );
        }

        return (
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-xs text-slate-800">{name}</span>
              {row.isDeal && (
                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-[#FF5C28] text-white">
                  DEAL
                </span>
              )}
              {row.isAddon && (
                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-orange-100 text-[#FF5C28] border border-orange-200">
                  Add-on
                </span>
              )}
            </div>
            {!row.hasCost && (
              <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-medium mt-0.5">
                <AlertTriangle className="w-2.5 h-2.5" /> Cost Missing
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'category',
      title: 'Category',
      headerClassName: 'w-28 text-center',
      align: 'center',
      cellClassName: 'text-center',
      render: (cat, row) => (
        <span
          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
            row.isDealComponent
              ? 'bg-amber-50 text-amber-800 border border-amber-200/80'
              : row.isAddon
              ? 'bg-orange-50 text-[#FF5C28] border border-orange-200/60'
              : row.isDeal
              ? 'bg-slate-800 text-white'
              : 'bg-slate-100 text-slate-700'
          }`}
        >
          {row.isDealComponent ? `In ${row.parentDealName}` : cat || (row.isAddon ? 'Add-ons' : row.isDeal ? 'Deals' : 'General')}
        </span>
      ),
    },
    {
      key: 'qtyWeightDisplay',
      title: (
        <button
          type="button"
          onClick={() => {
            setProfitSortBy('qty');
            setCurrentPage(1);
          }}
          className="hover:text-[#FF5C28] inline-flex items-center gap-1 font-semibold cursor-pointer"
          title="Click to sort by quantity sold"
        >
          <span>Qty / Weight Sold</span>
          {profitSortBy === 'qty' && <span className="text-[10px] text-[#FF5C28]">↓</span>}
        </button>
      ),
      headerClassName: 'w-32 text-center',
      align: 'center',
      cellClassName: 'text-center',
      render: (display) => (
        <span className="font-semibold text-xs text-slate-700">{display}</span>
      ),
    },
    {
      key: 'validInvoices',
      title: 'Valid Invoices',
      headerClassName: 'w-24 text-center',
      align: 'center',
      cellClassName: 'text-center',
      render: (count) => (
        <span className="text-xs text-slate-600 font-medium">{count}</span>
      ),
    },
    {
      key: 'netSales',
      title: (
        <button
          type="button"
          onClick={() => {
            setProfitSortBy('sales');
            setCurrentPage(1);
          }}
          className="hover:text-[#FF5C28] inline-flex items-center gap-1 font-semibold cursor-pointer justify-end"
          title="Click to sort by net sales"
        >
          <span>Net Sales</span>
          {profitSortBy === 'sales' && <span className="text-[10px] text-[#FF5C28]">↓</span>}
        </button>
      ),
      headerClassName: 'w-28 text-right font-semibold',
      align: 'right',
      cellClassName: 'text-right',
      render: (val) => (
        <span className="font-semibold text-xs text-slate-900">{formatCurrency(val)}</span>
      ),
    },
    {
      key: 'cogs',
      title: 'COGS',
      headerClassName: 'w-28 text-right font-semibold',
      align: 'right',
      cellClassName: 'text-right',
      render: (val, row) => (
        row.hasCost && val !== null ? (
          <span className="text-xs text-slate-700">{formatCurrency(val)}</span>
        ) : (
          <span className="text-[11px] text-amber-600 font-medium italic">Cost Missing</span>
        )
      ),
    },
    {
      key: 'grossProfit',
      title: (
        <button
          type="button"
          onClick={() => {
            setProfitSortBy('profit');
            setCurrentPage(1);
          }}
          className="hover:text-[#FF5C28] inline-flex items-center gap-1 font-bold cursor-pointer justify-end"
          title="Click to sort by gross profit"
        >
          <span>Gross Profit</span>
          {profitSortBy === 'profit' && <span className="text-[10px] text-[#FF5C28]">↓</span>}
        </button>
      ),
      headerClassName: 'w-28 text-right font-bold',
      align: 'right',
      cellClassName: 'text-right',
      render: (val, row) => (
        row.hasCost && val !== null ? (
          <span className={`text-xs font-bold ${val >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatCurrency(val)}
          </span>
        ) : (
          <span className="text-[11px] text-slate-400 italic">Unavailable</span>
        )
      ),
    },
    {
      key: 'margin',
      title: (
        <button
          type="button"
          onClick={() => {
            setProfitSortBy('margin');
            setCurrentPage(1);
          }}
          className="hover:text-[#FF5C28] inline-flex items-center gap-1 font-bold cursor-pointer justify-center"
          title="Click to sort by profit margin %"
        >
          <span>Profit Margin %</span>
          {profitSortBy === 'margin' && <span className="text-[10px] text-[#FF5C28]">↓</span>}
        </button>
      ),
      headerClassName: 'w-28 text-center font-bold',
      align: 'center',
      cellClassName: 'text-center',
      render: (val, row) => (
        row.hasCost && val !== null ? (
          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
            {val}%
          </span>
        ) : (
          <span className="text-xs text-slate-400 italic">—</span>
        )
      ),
    },
  ];

  // Item Profitability Columns for Financial Summary (Respects role visibility)
  const financialSummaryTableColumns = useMemo(() => {
    return [
      {
        key: 'name',
        title: 'Item',
        headerClassName: 'w-48 font-bold',
        render: (name, row) => (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs text-slate-900">{name}</span>
            {row.isDeal && (
              <Badge variant="warning" size="xs">
                Deal
              </Badge>
            )}
            {row.isAddon && (
              <Badge variant="info" size="xs">
                Add-on
              </Badge>
            )}
          </div>
        ),
      },
      {
        key: 'category',
        title: 'Category',
        headerClassName: 'w-28 text-slate-600',
        render: (cat) => <span className="text-xs text-slate-600">{cat || '—'}</span>,
      },
      {
        key: 'qtyWeightDisplay',
        title: 'Qty / Weight Sold',
        headerClassName: 'w-28 text-center',
        align: 'center',
        cellClassName: 'text-center',
        render: (disp, row) => (
          <span className="font-semibold text-xs text-slate-700">
            {disp || `${row.qtySold} pcs`}
          </span>
        ),
      },
      {
        key: 'netSales',
        title: (
          <button
            type="button"
            onClick={() => {
              setProfitSortBy('sales');
              setCurrentPage(1);
            }}
            className="hover:text-[#FF5C28] inline-flex items-center gap-1 font-semibold cursor-pointer justify-end"
            title="Click to sort by net sales"
          >
            <span>Net Sales</span>
            {profitSortBy === 'sales' && <span className="text-[10px] text-[#FF5C28]">↓</span>}
          </button>
        ),
        headerClassName: 'w-28 text-right font-semibold',
        align: 'right',
        cellClassName: 'text-right',
        render: (val) => (
          <span className="font-semibold text-xs text-slate-900">{formatCurrency(val)}</span>
        ),
      },
      ...(canViewCosts
        ? [
            {
              key: 'cogs',
              title: 'COGS',
              headerClassName: 'w-28 text-right font-semibold',
              align: 'right',
              cellClassName: 'text-right',
              render: (val, row) =>
                row.hasCost && val !== null ? (
                  <span className="text-xs text-slate-700">{formatCurrency(val)}</span>
                ) : (
                  <span className="text-[11px] text-amber-600 font-medium italic">Cost Missing</span>
                ),
            },
            {
              key: 'grossProfit',
              title: (
                <button
                  type="button"
                  onClick={() => {
                    setProfitSortBy('profit');
                    setCurrentPage(1);
                  }}
                  className="hover:text-[#FF5C28] inline-flex items-center gap-1 font-bold cursor-pointer justify-end"
                  title="Click to sort by gross profit"
                >
                  <span>Gross Profit</span>
                  {profitSortBy === 'profit' && <span className="text-[10px] text-[#FF5C28]">↓</span>}
                </button>
              ),
              headerClassName: 'w-28 text-right font-bold',
              align: 'right',
              cellClassName: 'text-right',
              render: (val, row) =>
                row.hasCost && val !== null ? (
                  <span className={`text-xs font-bold ${val >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatCurrency(val)}
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400 italic">Unavailable</span>
                ),
            },
            {
              key: 'margin',
              title: (
                <button
                  type="button"
                  onClick={() => {
                    setProfitSortBy('margin');
                    setCurrentPage(1);
                  }}
                  className="hover:text-[#FF5C28] inline-flex items-center gap-1 font-bold cursor-pointer justify-center"
                  title="Click to sort by profit margin %"
                >
                  <span>Profit Margin %</span>
                  {profitSortBy === 'margin' && <span className="text-[10px] text-[#FF5C28]">↓</span>}
                </button>
              ),
              headerClassName: 'w-28 text-center font-bold',
              align: 'center',
              cellClassName: 'text-center',
              render: (val, row) =>
                row.hasCost && val !== null ? (
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                    {val}%
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 italic">—</span>
                ),
            },
          ]
        : []),
    ];
  }, [canViewCosts, profitSortBy]);

  // Pagination slicing
  const activeDataset =
    activeTab === 'Profit'
      ? profitItemRows
      : activeTab === 'FinancialSummary'
      ? (financialTableTab === 'orders' ? filteredOrders : financialSummaryReport.itemRows)
      : activeTab === 'Reversals'
      ? filteredReversals
      : filteredOrders;
  const totalPages = Math.max(1, Math.ceil(activeDataset.length / pageSize));
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return activeDataset.slice(startIndex, startIndex + pageSize);
  }, [activeDataset, currentPage, pageSize]);

  return (
    <div className="space-y-5 select-none max-w-[1440px] mx-auto">
      {/* 1. Header Toolbar with Title, Subtitle, and Export Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-0.5">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            {isCashier ? "Daily Shift / Today's Reports" : "Reports"}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isCashier
              ? "Today's sales, revenue and reversal metrics (Cashier 1-Day View)."
              : "Analyze sales, revenue and reversals."}
          </p>
        </div>

        {/* Export / Print Actions */}
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto no-print">
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-300 hover:border-emerald-400 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
            title="Export professional Chartered Accountant Excel (.xlsx) multi-sheet workbook"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-orange-200 hover:border-orange-300 bg-white hover:bg-orange-50 text-[#FF5C28] text-xs font-semibold transition-all shadow-2xs cursor-pointer"
            title="Download client-side PDF summary"
          >
            <Download className="w-3.5 h-3.5 text-[#FF5C28]" />
            <span>PDF</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
            title="Print report"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* 2. Top Navigation Tabs */}
      <div className="border-b border-slate-200/90 pb-0.5">
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={(tab) => {
            setActiveTab(tab);
            setCurrentPage(1);
          }}
          variant="line"
        />
      </div>


      {/* 3. Common Filter Toolbar (Single Shared Filter Source) */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2.5 no-print">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
          {/* Search Input */}
          <SearchInput
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={
              activeTab === 'Reversals'
                ? 'Search invoice # or reason...'
                : activeTab === 'Profit'
                ? 'Search item name or category...'
                : 'Search invoice # or item name...'
            }
            className="w-full sm:w-48 lg:w-56 shrink-0"
          />

          {/* Filters Group */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            {/* Date Preset */}
            {isCashier ? (
              <div className="h-9 px-2.5 bg-amber-50 border border-amber-200 rounded-xl font-bold text-amber-800 flex items-center gap-1.5 text-xs select-none shrink-0">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <span>Today (1 Day)</span>
              </div>
            ) : (
              <select
                value={datePreset}
                onChange={(e) => {
                  setDatePreset(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:border-[#FF5C28] cursor-pointer text-xs shrink-0"
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
            )}

            {/* Custom Range Inputs */}
            {!isCashier && datePreset === 'Custom' && (
              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 shrink-0">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => {
                    setCustomStartDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-7 px-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 max-w-[125px]"
                />
                <span className="text-slate-400 text-xs">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => {
                    setCustomEndDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-7 px-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 max-w-[125px]"
                />
              </div>
            )}

            {/* Category Filter */}
            {activeTab !== 'Reversals' && (
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:border-[#FF5C28] cursor-pointer text-xs shrink-0"
              >
                <option value="All">All Categories</option>
                <option value="Deals">Deals</option>
                {(activeTab === 'Profit' || activeTab === 'FinancialSummary') && <option value="Add-ons">Add-ons</option>}
                {(categories || [])
                  .filter((c) => c && c.name && c.name.toLowerCase() !== 'add-ons' && c.name.toLowerCase() !== 'deals')
                  .map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
              </select>
            )}

            {/* Item Filter (For Profit & Cost tab) */}
            {activeTab === 'Profit' && (
              <select
                value={selectedItem}
                onChange={(e) => {
                  setSelectedItem(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:border-[#FF5C28] cursor-pointer text-xs shrink-0"
              >
                <option value="All">All Items & Add-ons</option>
                {Array.isArray(deals) && deals.length > 0 && (
                  <optgroup label="Deals">
                    {deals.map((dl) => (
                      <option key={dl.id || dl.name} value={dl.name}>
                        {dl.name} (Deal)
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Menu Items">
                  {(items || []).map((it) => (
                    <option key={it.id || it.name} value={it.name}>
                      {it.name}
                    </option>
                  ))}
                </optgroup>
                {Array.isArray(addons) && addons.length > 0 && (
                  <optgroup label="Add-ons">
                    {addons.map((ad) => (
                      <option key={ad.id || ad.name} value={ad.name}>
                        {ad.name} (Add-on)
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            )}

            {/* Payment Method Filter */}
            {activeTab !== 'Reversals' && activeTab !== 'Profit' && (
              <select
                value={selectedPaymentMethod}
                onChange={(e) => {
                  setSelectedPaymentMethod(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:border-[#FF5C28] cursor-pointer text-xs shrink-0"
              >
                <option value="All">All Payments</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="Online">Online</option>
              </select>
            )}

            {/* Order Type Filter */}
            {activeTab !== 'Reversals' && activeTab !== 'Profit' && (
              <select
                value={selectedOrderType}
                onChange={(e) => {
                  setSelectedOrderType(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:border-[#FF5C28] cursor-pointer text-xs shrink-0"
              >
                <option value="All">All Types</option>
                <option value="Dine-In">Dine-In</option>
                <option value="Takeaway">Takeaway</option>
              </select>
            )}

            {/* Status Filter */}
            {activeTab !== 'Reversals' && activeTab !== 'Profit' && (
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:border-[#FF5C28] cursor-pointer text-xs shrink-0"
              >
                <option value="All">All Status</option>
                <option value="completed">Completed</option>
                <option value="partial">Partial</option>
                <option value="reversed">Reversed</option>
              </select>
            )}

            {/* Reversal Reason Filter (For Reversals tab) */}
            {activeTab === 'Reversals' && (
              <select
                value={selectedReason}
                onChange={(e) => {
                  setSelectedReason(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:border-[#FF5C28] cursor-pointer text-xs shrink-0"
              >
                <option value="All">All Reasons</option>
                <option value="Customer Cancelled">Customer Cancelled</option>
                <option value="Wrong Order">Wrong Order</option>
                <option value="Billing Error">Billing Error</option>
                <option value="Duplicate Sale">Duplicate Sale</option>
                <option value="Food Quality Issue">Food Quality Issue</option>
                <option value="Other">Other</option>
              </select>
            )}

            {/* Reset Filters button */}
            {(selectedStatus !== 'All' ||
              selectedPaymentMethod !== 'All' ||
              selectedOrderType !== 'All' ||
              selectedCategory !== 'All' ||
              (selectedItem && selectedItem !== 'All') ||
              (selectedReason && selectedReason !== 'All') ||
              datePreset !== (isCashier ? 'Today' : 'All Dates') ||
              Boolean(searchQuery)) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="h-9 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                title="Reset all filters"
              >
                <ResetIcon className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ==================== TAB 1: SALES REPORT ==================== */}
      {activeTab === 'Sales' && (
        <div className="space-y-5">
          {/* 6 Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3">
            <KPICard
              size="sm"
              title="Total Sale"
              value={formatCurrency(salesKpis.validBilledSales !== undefined ? salesKpis.validBilledSales : (salesKpis.totalSale || salesKpis.grossSales))}
              color="green"
              icon={DollarSign}
              showArrow={false}
            />
            <KPICard
              size="sm"
              title="Valid Net Sales"
              value={formatCurrency(salesKpis.validNetSales)}
              color="green"
              icon={TrendingUp}
              showArrow={false}
            />
            <KPICard
              size="sm"
              title="Completed Orders"
              value={formatNumber(salesKpis.validOrderCount !== undefined ? salesKpis.validOrderCount : salesKpis.completedOrders)}
              color="orange"
              icon={ShoppingCart}
              showArrow={false}
            />
            <KPICard
              size="sm"
              title="Average Order Value"
              value={formatCurrency(salesKpis.averageOrderValue)}
              color="purple"
              icon={TrendingUp}
              showArrow={false}
            />
            <KPICard
              size="sm"
              title="Items Sold"
              value={formatNumber(salesKpis.itemsSold)}
              color="blue"
              icon={BarChart2}
              showArrow={false}
            />
            <KPICard
              size="sm"
              title="Discounts Given"
              value={formatCurrency(salesKpis.discountsGiven)}
              color="red"
              icon={Percent}
              showArrow={false}
            />
          </div>

          {/* Detailed Sales Transactions Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">
                Sales Transactions ({filteredOrders.length})
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-7 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                No sales found for the selected filters.
              </div>
            ) : (
              <>
                <DataTable
                  columns={salesTableColumns}
                  data={paginatedData}
                  keyField="id"
                  footer={
                    <tr className="border-t-2 border-slate-300 bg-slate-50/90 text-xs font-bold text-slate-900">
                      <td colSpan={4} className="py-2.5 px-3.5 text-slate-800 whitespace-nowrap">
                        <span className="uppercase tracking-wider text-[11px] text-slate-500 font-bold block">
                          Reconciled Sales Total
                        </span>
                        <span className="text-[11px] text-slate-400 font-normal">
                          ({validFilteredOrders.length} valid / {filteredOrders.length} total)
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-extrabold text-slate-900 whitespace-nowrap">
                        {formatCurrency(validFilteredOrders.reduce((s, o) => s + (Number(o.subtotal) || 0), 0))}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-extrabold text-rose-600 whitespace-nowrap">
                        {validFilteredOrders.reduce((s, o) => s + (Number(o.discountAmount) || 0), 0) > 0
                          ? `-${formatCurrency(validFilteredOrders.reduce((s, o) => s + (Number(o.discountAmount) || 0), 0))}`
                          : 'Rs 0'}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-extrabold text-slate-700 whitespace-nowrap">
                        {formatCurrency(validFilteredOrders.reduce((s, o) => s + (Number(o.taxAmount) || 0), 0))}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-extrabold text-slate-900 whitespace-nowrap">
                        {formatCurrency(validFilteredOrders.reduce((s, o) => s + (Number(o.grandTotal) || 0), 0))}
                      </td>
                      <td colSpan={3} className="py-2.5 px-3.5" />
                    </tr>
                  }
                />

                {/* Pagination Controls */}
                <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Page {currentPage} of {totalPages} ({filteredOrders.length} total sales)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB 2: REVENUE REPORT ==================== */}
      {activeTab === 'Revenue' && (
        <div className="space-y-5">
          {/* 6 Revenue KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3">
            <KPICard
              size="sm"
              title="Total Sale"
              value={formatCurrency(revenueKpis.validBilled !== undefined ? revenueKpis.validBilled : (revenueKpis.totalSale || revenueKpis.grossBilled))}
              color="green"
              icon={DollarSign}
              showArrow={false}
            />
            <KPICard
              size="sm"
              title="Total Discounts"
              value={formatCurrency(revenueKpis.totalDiscounts)}
              color="orange"
              icon={Percent}
              showArrow={false}
            />
            <KPICard
              size="sm"
              title="Tax Collected"
              value={formatCurrency(revenueKpis.taxCollected)}
              color="purple"
              icon={TrendingUp}
              showArrow={false}
            />
            <KPICard
              size="sm"
              title="Reversals"
              value={formatCurrency(revenueKpis.reversalsIncludingTax)}
              color="red"
              icon={RotateCcw}
              showArrow={false}
            />
            <KPICard
              size="sm"
              title="Net Revenue"
              value={formatCurrency(revenueKpis.netRevenue)}
              color="green"
              icon={TrendingUp}
              showArrow={false}
            />
            <KPICard
              size="sm"
              title="Avg Net Rev / Order"
              value={formatCurrency(revenueKpis.avgNetRevenuePerOrder)}
              color="blue"
              icon={ShoppingCart}
              showArrow={false}
            />
          </div>


          {/* 3 Summary Breakdown Cards: Payment Methods, Tax Summary, Discounts Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Payment Methods Breakdown */}
            <Card>
              <CardHeader className="flex-row items-center justify-between pb-2">
                <CardTitle>Payment Methods</CardTitle>
                <CreditCard className="w-4 h-4 text-slate-400" />
              </CardHeader>
              <CardContent className="space-y-3 pt-1">
                {paymentBreakdown.map((p) => (
                  <div key={p.method} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-800">{p.method}</span>
                      <span className="text-slate-500 font-medium">
                        {formatCurrency(p.amount)} ({p.count} txns, {p.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-[#FF5C28] rounded-full transition-all duration-300"
                        style={{ width: `${p.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Tax Summary Card */}
            <Card>
              <CardHeader className="flex-row items-center justify-between pb-2">
                <CardTitle>Tax Breakdown</CardTitle>
                <TrendingUp className="w-4 h-4 text-slate-400" />
              </CardHeader>
              <CardContent className="space-y-2.5 pt-1 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-500">Active Valid Tax</span>
                  <span className="font-bold text-slate-900">{formatCurrency(taxBreakdown.taxCollected)}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-500">Reversed Tax</span>
                  <span className="font-bold text-rose-600">{formatCurrency(taxBreakdown.reversedTax)}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-500">Historical Gross Tax</span>
                  <span className="font-semibold text-slate-700">{formatCurrency(taxBreakdown.grossTaxHistorical)}</span>
                </div>
                <div className="flex justify-between items-center pt-1 font-bold text-slate-900">
                  <span>Net Valid Tax</span>
                  <span className="text-[#FF5C28]">{formatCurrency(taxBreakdown.netValidTax)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Discounts Summary Card */}
            <Card>
              <CardHeader className="flex-row items-center justify-between pb-2">
                <CardTitle>Discounts Breakdown</CardTitle>
                <Percent className="w-4 h-4 text-slate-400" />
              </CardHeader>
              <CardContent className="space-y-2.5 pt-1 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-500">Total Discounts Given</span>
                  <span className="font-bold text-rose-600">
                    -{formatCurrency(discountBreakdown.totalDiscounts)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-500">Percentage Discounts</span>
                  <span className="font-semibold text-slate-700">
                    {formatCurrency(discountBreakdown.percentageDiscountsAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-500">Fixed Discounts</span>
                  <span className="font-semibold text-slate-700">
                    {formatCurrency(discountBreakdown.fixedDiscountsAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1 font-bold text-slate-900">
                  <span>Discounted Orders</span>
                  <span className="text-slate-800">{formatNumber(discountBreakdown.discountedOrdersCount)} orders</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Revenue Transactions Records Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Revenue Transactions Records ({filteredOrders.length})
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Complete transactional ledger of gross billed, discounts given, tax collected, and net operating revenue
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-7 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                No revenue records found for the selected filters.
              </div>
            ) : (
              <>
                <DataTable
                  columns={revenueTableColumns}
                  data={paginatedData}
                  keyField="id"
                  footer={
                    <tr className="border-t-2 border-slate-300 bg-slate-50/90 text-xs font-bold text-slate-900">
                      <td colSpan={4} className="py-2.5 px-3.5 text-slate-800 whitespace-nowrap">
                        <span className="uppercase tracking-wider text-[11px] text-slate-500 font-bold block">
                          Reconciled Revenue Total
                        </span>
                        <span className="text-[11px] text-slate-400 font-normal">
                          ({validFilteredOrders.length} valid / {filteredOrders.length} total)
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-extrabold text-slate-900 whitespace-nowrap">
                        {formatCurrency(revenueKpis.validBilled !== undefined ? revenueKpis.validBilled : (revenueKpis.totalSale || revenueKpis.grossBilled))}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-extrabold text-rose-600 whitespace-nowrap">
                        {(revenueKpis.validDiscounts !== undefined ? revenueKpis.validDiscounts : revenueKpis.totalDiscounts) > 0
                          ? `-${formatCurrency(revenueKpis.validDiscounts !== undefined ? revenueKpis.validDiscounts : revenueKpis.totalDiscounts)}`
                          : 'Rs 0'}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-extrabold text-amber-700 whitespace-nowrap">
                        {formatCurrency(revenueKpis.taxCollected)}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-extrabold text-emerald-700 whitespace-nowrap">
                        {formatCurrency(revenueKpis.netRevenue)}
                      </td>
                      <td colSpan={2} className="py-2.5 px-3.5" />
                    </tr>
                  }
                />

                {/* Pagination Controls */}
                <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Page {currentPage} of {totalPages} ({filteredOrders.length} total sales)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB 3: REVERSAL REPORT ==================== */}
      {activeTab === 'Reversals' && (
        <div className="space-y-5">
          {/* 5 Reversals KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
            <KPICard
              size="sm"
              title="Reversal Count"
              value={formatNumber(reversalKpis.reversalCount)}
              color="red"
              icon={RotateCcw}
              showArrow={false}
            />
            <KPICard
              size="sm"
              title="Reversed Subtotal"
              value={formatCurrency(reversalKpis.reversedSubtotal)}
              color="red"
              icon={DollarSign}
              showArrow={false}
            />
            <KPICard
              size="sm"
              title="Discount Impact"
              value={formatCurrency(reversalKpis.reversedDiscountImpact)}
              color="orange"
              icon={Percent}
              showArrow={false}
            />
            <KPICard
              size="sm"
              title="Tax Reversed"
              value={formatCurrency(reversalKpis.reversedTax)}
              color="purple"
              icon={TrendingUp}
              showArrow={false}
            />
            <KPICard
              size="sm"
              title="Total Reversed"
              value={formatCurrency(reversalKpis.reversalTotalIncludingTax)}
              color="red"
              icon={RotateCcw}
              showArrow={false}
            />
          </div>


          {/* Reversal Detail Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">
                Reversal Audit Ledger ({filteredReversals.length})
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-7 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {filteredReversals.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                No reversals found for the selected filters.
              </div>
            ) : (
              <>
                <DataTable
                  columns={reversalTableColumns}
                  data={paginatedData}
                  keyField="id"
                  footer={
                    <tr className="border-t-2 border-slate-300 bg-slate-50/90 text-xs font-bold text-slate-900">
                      <td colSpan={4} className="py-2.5 px-3.5 text-slate-800 whitespace-nowrap">
                        <span className="uppercase tracking-wider text-[11px] text-slate-500 font-bold block">
                          Total Reversals
                        </span>
                        <span className="text-[11px] text-slate-400 font-normal">
                          ({filteredReversals.length} {filteredReversals.length === 1 ? 'reversal' : 'reversals'})
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-extrabold text-slate-900 whitespace-nowrap">
                        {formatCurrency(reversalKpis.reversedSubtotal)}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-extrabold text-slate-700 whitespace-nowrap">
                        {formatCurrency(reversalKpis.reversedTax)}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-extrabold text-rose-600 whitespace-nowrap">
                        {formatCurrency(reversalKpis.reversalTotalIncludingTax)}
                      </td>
                      <td className="py-2.5 px-3.5" />
                    </tr>
                  }
                />

                {/* Pagination Controls */}
                <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Page {currentPage} of {totalPages} ({filteredReversals.length} total reversals)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB 4: PROFIT & COST REPORT ==================== */}
      {activeTab === 'Profit' && (
        <div className="space-y-5">
          {/* Missing Cost Alert Banner if any items lack historical cost */}
          {profitKpis.hasMissingCosts && (
            <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3.5 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 text-amber-700">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-amber-900 block">
                  Missing Cost Price Warning ({profitKpis.missingCostCount} order line{profitKpis.missingCostCount === 1 ? '' : 's'})
                </span>
                <span className="text-amber-800 mt-0.5 block leading-relaxed">
                  Some items sold do not have a recorded cost price. To protect accounting integrity and avoid artificial 100% margin reporting, COGS and Gross Profit for these items are marked as unavailable.
                </span>
              </div>
            </div>
          )}

          {/* 4 Top Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <KPICard
              size="sm"
              title="Net Sales"
              value={formatCurrency(profitKpis.netSales)}
              color="green"
              icon={DollarSign}
              showArrow={false}
            />
            <KPICard
              size="sm"
              title="Total COGS"
              value={formatCurrency(profitKpis.cogs)}
              color="orange"
              icon={ShoppingCart}
              showArrow={false}
            />
            <KPICard
              size="sm"
              title="Gross Profit"
              value={formatCurrency(profitKpis.grossProfit)}
              color={profitKpis.grossProfit >= 0 ? 'green' : 'red'}
              icon={TrendingUp}
              showArrow={false}
            />
            <KPICard
              size="sm"
              title="Gross Profit Margin"
              value={`${profitKpis.grossProfitMargin}%`}
              color="purple"
              icon={Percent}
              showArrow={false}
            />
          </div>

          {/* Item-Wise Profit & Cost Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Item-Wise Profit & Cost Breakdown ({profitItemRows.length} items & add-ons)
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Aggregated strictly from transaction-level historical cost snapshots
                </p>
              </div>
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Segmented Filter Pills */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setProfitViewType('all');
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      profitViewType === 'all'
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfitViewType('items');
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      profitViewType === 'items'
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Items Only
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfitViewType('addons');
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      profitViewType === 'addons'
                        ? 'bg-white text-[#FF5C28] shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Add-ons Only
                  </button>
                  {hasAnyDeals && (
                    <button
                      type="button"
                      onClick={() => {
                        setProfitViewType('deals');
                        setCurrentPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        profitViewType === 'deals'
                          ? 'bg-white text-[#FF5C28] shadow-2xs font-bold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Deals Only
                    </button>
                  )}
                </div>

                {/* Sort By Dropdown */}
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="font-semibold text-slate-600">Sort:</span>
                  <select
                    value={profitSortBy}
                    onChange={(e) => {
                      setProfitSortBy(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="h-7 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none cursor-pointer hover:border-slate-300 transition-colors"
                  >
                    <option value="recent">Recently Sold (Latest First)</option>
                    <option value="sales">Net Sales (Highest First)</option>
                    <option value="profit">Gross Profit (Highest First)</option>
                    <option value="margin">Profit Margin %</option>
                    <option value="qty">Qty Sold (Highest First)</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span>Rows:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="h-7 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>
            </div>

            {profitItemRows.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                No items sold for the selected date range and filters.
              </div>
            ) : (
              <>
                <DataTable
                  columns={profitTableColumns}
                  data={paginatedData}
                  keyField="id"
                  footer={
                    <tr className="border-t-2 border-slate-300 bg-slate-50/90 text-xs font-bold text-slate-900">
                      <td colSpan={4} className="py-2.5 px-3.5 text-slate-800 whitespace-nowrap">
                        <span className="uppercase tracking-wider text-[11px] text-slate-500 font-bold block">Total / Overall</span>
                        <span className="text-[11px] text-slate-400 font-normal">
                          ({profitItemRows.length} items sold across {profitKpis.validOrdersCount} valid invoices)
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-extrabold text-slate-900 whitespace-nowrap">
                        {formatCurrency(profitKpis.netSales)}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-extrabold text-slate-700 whitespace-nowrap">
                        {formatCurrency(profitKpis.cogs)}
                      </td>
                      <td className={`py-2.5 px-3.5 text-right font-extrabold whitespace-nowrap ${profitKpis.grossProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {formatCurrency(profitKpis.grossProfit)}
                      </td>
                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                          {profitKpis.grossProfitMargin}%
                        </span>
                      </td>
                    </tr>
                  }
                />

                {/* Pagination Controls */}
                <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Page {currentPage} of {totalPages} ({profitItemRows.length} total items)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB 5: FINANCIAL SUMMARY (PROFIT & LOSS STYLE) ==================== */}
      {activeTab === 'FinancialSummary' && (
        <div className="space-y-5">
          {/* 1. Top Executive KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3">
            <KPICard
              size="sm"
              title="Total Collected"
              value={formatCurrency(financialSummaryReport.statement.totalCollected)}
              color="blue"
              icon={CreditCard}
              showArrow={false}
            />
            <KPICard
              size="sm"
              title="Net Revenue"
              value={formatCurrency(financialSummaryReport.statement.netRevenue)}
              color="green"
              icon={DollarSign}
              showArrow={false}
            />
            <KPICard
              size="sm"
              title="Total COGS"
              value={canViewCosts ? formatCurrency(financialSummaryReport.statement.totalCOGS) : 'Restricted'}
              color="slate"
              icon={canViewCosts ? Layers : Lock}
              showArrow={false}
            />
            <KPICard
              size="sm"
              title="Gross Profit"
              value={
                canViewCosts
                  ? formatCurrency(financialSummaryReport.statement.grossProfit)
                  : 'Restricted'
              }
              color={canViewCosts && financialSummaryReport.statement.grossProfit >= 0 ? 'green' : 'red'}
              icon={canViewCosts ? TrendingUp : Lock}
              showArrow={false}
            />
            <KPICard
              size="sm"
              title="Gross Margin"
              value={
                canViewCosts
                  ? `${financialSummaryReport.statement.grossProfitMargin}%`
                  : 'Restricted'
              }
              color="purple"
              icon={canViewCosts ? Percent : Lock}
              showArrow={false}
            />
            <KPICard
              size="sm"
              title="Tax Collected"
              value={formatCurrency(financialSummaryReport.statement.taxCollected)}
              color="orange"
              icon={Receipt}
              showArrow={false}
            />
          </div>

          {/* 3. Summary Cards Layout (Section 10) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Card Left: REVENUE, COST OF SALES & GROSS PROFIT */}
            <Card className="flex flex-col justify-between">
              <CardHeader className="flex-row items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Statement of Profit & Loss
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Revenue, Cost of Goods Sold & Gross Margins
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" size="sm" className="font-semibold text-slate-600">
                    PKR
                  </Badge>
                  <FileText className="w-4 h-4 text-slate-400" />
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-6">
                {/* A. REVENUE SECTION */}
                <div>
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                    <span className="text-xs font-bold text-slate-900 tracking-wider uppercase">
                      REVENUE
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium italic">
                      Tax Excluded
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100 text-xs">
                    <div className="flex items-center justify-between py-2 text-slate-700">
                      <span>Gross Sales</span>
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(financialSummaryReport.statement.grossSales)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 text-slate-700">
                      <span>Less: Discounts</span>
                      <span className="font-semibold text-rose-600">
                        {financialSummaryReport.statement.discounts > 0
                          ? `-${formatCurrency(financialSummaryReport.statement.discounts)}`
                          : 'Rs 0'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 text-slate-700">
                      <span>Less: Reversal Effect</span>
                      <span className="font-semibold text-rose-600">
                        {financialSummaryReport.statement.reversalEffect > 0
                          ? `-${formatCurrency(financialSummaryReport.statement.reversalEffect)}`
                          : 'Rs 0'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2.5 font-bold text-xs bg-emerald-50/70 px-2 rounded-lg border-y-2 border-emerald-500/80 text-emerald-950">
                      <span className="uppercase tracking-wide">NET REVENUE</span>
                      <span className="text-sm font-extrabold text-emerald-700">
                        {formatCurrency(financialSummaryReport.statement.netRevenue)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* B. COST OF SALES SECTION */}
                <div>
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                    <span className="text-xs font-bold text-slate-900 tracking-wider uppercase">
                      COST OF SALES (COGS)
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium italic">
                      Historical Snapshots
                    </span>
                  </div>

                  {canViewCosts ? (
                    <div className="divide-y divide-slate-100 text-xs">
                      <div className="flex items-center justify-between py-2 text-slate-700">
                        <span>Food / Item Cost</span>
                        <span className="font-semibold text-slate-800">
                          {formatCurrency(financialSummaryReport.statement.foodCOGS)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 text-slate-700">
                        <span>Add-on Cost</span>
                        <span className="font-semibold text-slate-800">
                          {formatCurrency(financialSummaryReport.statement.addonCOGS)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 text-slate-700">
                        <span>Deal Cost</span>
                        <span className="font-semibold text-slate-800">
                          {formatCurrency(financialSummaryReport.statement.dealCOGS)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2.5 font-bold text-xs bg-slate-100/80 px-2 rounded-lg border-y-2 border-slate-400 text-slate-900">
                        <span className="uppercase tracking-wide">TOTAL COGS</span>
                        <span className="text-sm font-extrabold text-slate-900">
                          {formatCurrency(financialSummaryReport.statement.totalCOGS)}
                        </span>
                      </div>

                      {financialSummaryReport.statement.hasIncompleteCosts && (
                        <div className="mt-2.5 p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>
                            {financialSummaryReport.statement.missingCostCount} items have missing historical cost snapshots (marked as unavailable/incomplete).
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-6 px-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-1.5">
                      <Lock className="w-4 h-4 text-slate-400" />
                      <span className="font-semibold text-slate-700">Cost of Sales Restricted</span>
                      <span className="text-[11px] text-slate-400">
                        Wholesale costs and COGS records are visible to Administrator role only.
                      </span>
                    </div>
                  )}
                </div>

                {/* C. GROSS PROFIT SECTION */}
                <div>
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                    <span className="text-xs font-bold text-slate-900 tracking-wider uppercase">
                      GROSS PROFIT
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium italic">
                      Net Revenue - Total COGS
                    </span>
                  </div>

                  {canViewCosts ? (
                    <div className="divide-y divide-slate-100 text-xs">
                      <div className="flex items-center justify-between py-3 font-bold text-xs bg-emerald-50/60 px-3 rounded-xl border border-emerald-200 text-emerald-950 mt-1">
                        <div>
                          <span className="block text-xs uppercase tracking-wide">GROSS PROFIT</span>
                          <span className="text-[10px] text-emerald-700 font-normal">
                            Net contribution before operational overheads
                          </span>
                        </div>
                        <span
                          className={`text-base font-extrabold ${
                            financialSummaryReport.statement.grossProfit >= 0
                              ? 'text-emerald-700'
                              : 'text-rose-700'
                          }`}
                        >
                          {formatCurrency(financialSummaryReport.statement.grossProfit)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-2 text-slate-700 mt-1 px-1">
                        <span className="font-semibold">Gross Profit Margin</span>
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          {financialSummaryReport.statement.grossProfitMargin}%
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 px-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-1.5">
                      <Lock className="w-4 h-4 text-slate-400" />
                      <span className="font-semibold text-slate-700">Profit Margins Restricted</span>
                      <span className="text-[11px] text-slate-400">
                        Gross Profit and profit margin percentages require Administrator access.
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Card Right: TAX SUMMARY, PAYMENT COLLECTION & AUDIT */}
            <Card className="flex flex-col justify-between">
              <CardHeader className="flex-row items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Tax & Payment Reconciliation
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Separated tax liability, collected tenders & reversal audit
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" size="sm" className="font-semibold text-slate-600">
                    Reconciled
                  </Badge>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-6">
                {/* A. TAX SUMMARY SECTION */}
                <div>
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                    <span className="text-xs font-bold text-slate-900 tracking-wider uppercase">
                      TAX SUMMARY
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium italic">
                      Tax is NOT Revenue
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100 text-xs">
                    <div className="flex items-center justify-between py-2.5 font-bold text-xs bg-amber-50/70 px-2 rounded-lg border-y-2 border-amber-400 text-amber-950 mt-1">
                      <div>
                        <span className="block uppercase tracking-wide">TAX COLLECTED</span>
                        <span className="text-[10px] text-amber-700 font-normal">
                          Stored tax liability from valid non-reversed invoices
                        </span>
                      </div>
                      <span className="text-sm font-extrabold text-amber-800">
                        {formatCurrency(financialSummaryReport.statement.taxCollected)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* B. PAYMENT COLLECTION SECTION */}
                <div>
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                    <span className="text-xs font-bold text-slate-900 tracking-wider uppercase">
                      PAYMENT COLLECTION
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium italic">
                      Completed Tenders
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100 text-xs">
                    {financialSummaryReport.statement.paymentBreakdownList.map((pm) => (
                      <div key={pm.method} className="flex items-center justify-between py-2 text-slate-700">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-800">{pm.method}</span>
                          <span className="text-[10px] text-slate-400">({pm.count} txns)</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] text-slate-500 font-medium">{pm.percentage}%</span>
                          <span className="font-semibold text-slate-900 w-24 text-right">
                            {formatCurrency(pm.amount)}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-between py-2.5 font-bold text-xs bg-blue-50/70 px-2 rounded-lg border-y-2 border-blue-500/80 text-blue-950 mt-1">
                      <div>
                        <span className="uppercase tracking-wide">TOTAL COLLECTED</span>
                        <span className="text-[10px] text-blue-700 font-normal block">
                          Actual money received from customers
                        </span>
                      </div>
                      <span className="text-sm font-extrabold text-blue-800">
                        {formatCurrency(financialSummaryReport.statement.totalCollected)}
                      </span>
                    </div>

                    {Number(financialSummaryReport.statement.totalOutstanding) > 0 && (
                      <div className="flex items-center justify-between py-2 text-xs bg-amber-50/80 px-2 rounded-lg border border-amber-300 text-amber-950 mt-2">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                          <span className="font-bold text-amber-900 uppercase tracking-wide">
                            Outstanding Receivables (کل بقیہ رقم)
                          </span>
                          <span className="text-[10.5px] text-amber-700 font-normal">
                            ({financialSummaryReport.statement.outstandingCount} bills pending)
                          </span>
                        </div>
                        <span className="text-xs font-extrabold text-amber-800">
                          {formatCurrency(financialSummaryReport.statement.totalOutstanding)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* C. REVERSALS & DISCOUNTS AUDIT */}
                <div>
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                    <span className="text-xs font-bold text-slate-900 tracking-wider uppercase">
                      REVERSALS & DISCOUNTS AUDIT
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium italic">
                      Contra-Revenue Log
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100 text-xs">
                    <div className="flex items-center justify-between py-2 text-slate-700">
                      <span>Total Discounts Given</span>
                      <span className="font-semibold text-rose-600">
                        {formatCurrency(financialSummaryReport.statement.totalDiscounts)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 text-slate-700">
                      <span>Reversed Invoices Count</span>
                      <span className="font-semibold text-slate-800">
                        {financialSummaryReport.statement.reversalCount} invoices
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 text-slate-700">
                      <span>Total Reversal Value (Incl. Tax)</span>
                      <span className="font-semibold text-rose-600">
                        {formatCurrency(financialSummaryReport.statement.reversalValue)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 text-slate-700">
                      <span>Net Reversal Impact (Excl. Tax)</span>
                      <span className="font-semibold text-rose-700">
                        {formatCurrency(financialSummaryReport.statement.reversalNetValue)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>


          {/* 4. Detailed Records Tables (Items & Invoices) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex p-0.5 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setFinancialTableTab('items');
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      financialTableTab === 'items'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Item Profitability Records ({financialSummaryReport.itemRows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFinancialTableTab('orders');
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      financialTableTab === 'orders'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Invoice Sales Records ({filteredOrders.length})
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Sort Controls (Item View only) */}
                {financialTableTab === 'items' && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="font-semibold text-slate-600">Sort:</span>
                    <select
                      value={profitSortBy}
                      onChange={(e) => {
                        setProfitSortBy(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="h-7 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none cursor-pointer hover:border-slate-300 transition-colors"
                    >
                      <option value="recent">Recently Sold (Latest First)</option>
                      <option value="sales">Net Sales (Highest First)</option>
                      {canViewCosts && (
                        <>
                          <option value="profit">Gross Profit (Highest First)</option>
                          <option value="margin">Profit Margin %</option>
                        </>
                      )}
                      <option value="qty">Qty Sold (Highest First)</option>
                    </select>
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span>Rows:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="h-7 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>
            </div>

            {activeDataset.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                {financialTableTab === 'items'
                  ? 'No items sold for the selected date range and filters.'
                  : 'No sales invoices recorded for the selected date range and filters.'}
              </div>
            ) : (
              <>
                <DataTable
                  columns={financialTableTab === 'orders' ? salesTableColumns : financialSummaryTableColumns}
                  data={paginatedData}
                  keyField="id"
                  footer={
                    financialTableTab === 'orders' ? (
                      <tr className="border-t-2 border-slate-300 bg-slate-50/90 text-xs font-bold text-slate-900">
                        <td colSpan={4} className="py-2.5 px-3.5 text-slate-800 whitespace-nowrap">
                          <span className="uppercase tracking-wider text-[11px] text-slate-500 font-bold block">
                            Statement Reconciled Total
                          </span>
                          <span className="text-[11px] text-slate-400 font-normal">
                            ({validFilteredOrders.length} valid / {filteredOrders.length} total)
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-extrabold text-slate-900 whitespace-nowrap">
                          {formatCurrency(validFilteredOrders.reduce((s, o) => s + (Number(o.subtotal) || 0), 0))}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-extrabold text-rose-600 whitespace-nowrap">
                          {validFilteredOrders.reduce((s, o) => s + (Number(o.discountAmount) || 0), 0) > 0
                            ? `-${formatCurrency(validFilteredOrders.reduce((s, o) => s + (Number(o.discountAmount) || 0), 0))}`
                            : 'Rs 0'}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-extrabold text-slate-700 whitespace-nowrap">
                          {formatCurrency(validFilteredOrders.reduce((s, o) => s + (Number(o.taxAmount) || 0), 0))}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-extrabold text-slate-900 whitespace-nowrap">
                          {formatCurrency(validFilteredOrders.reduce((s, o) => s + (Number(o.grandTotal) || 0), 0))}
                        </td>
                        <td colSpan={3} className="py-2.5 px-3.5" />
                      </tr>
                    ) : (
                      <tr className="border-t-2 border-slate-300 bg-slate-50/90 text-xs font-bold text-slate-900">
                        <td colSpan={3} className="py-2.5 px-3.5 text-slate-800 whitespace-nowrap">
                          <span className="uppercase tracking-wider text-[11px] text-slate-500 font-bold block">
                            Statement Reconciled Total
                          </span>
                          <span className="text-[11px] text-slate-400 font-normal">
                            ({financialSummaryReport.itemRows.length} items sold across {financialSummaryReport.kpis.validOrdersCount} valid invoices)
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-extrabold text-slate-900 whitespace-nowrap">
                          {formatCurrency(financialSummaryReport.statement.netRevenue)}
                        </td>
                        {canViewCosts && (
                          <>
                            <td className="py-2.5 px-3.5 text-right font-extrabold text-slate-700 whitespace-nowrap">
                              {formatCurrency(financialSummaryReport.statement.totalCOGS)}
                            </td>
                            <td className={`py-2.5 px-3.5 text-right font-extrabold whitespace-nowrap ${financialSummaryReport.statement.grossProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                              {formatCurrency(financialSummaryReport.statement.grossProfit)}
                            </td>
                            <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                {financialSummaryReport.statement.grossProfitMargin}%
                              </span>
                            </td>
                          </>
                        )}
                      </tr>
                    )
                  }
                />

                {/* Pagination Controls */}
                <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Page {currentPage} of {totalPages} ({activeDataset.length} total records)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Historical Invoice Preview Modal (Read-Only) */}
      {selectedInvoiceForView && (
        <InvoiceModal
          order={selectedInvoiceForView}
          isOpen={Boolean(selectedInvoiceForView)}
          onClose={() => setSelectedInvoiceForView(null)}
          isReadOnly={true}
        />
      )}
    </div>
  );
};

export default ReportsPage;
