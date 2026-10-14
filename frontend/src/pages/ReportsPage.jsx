import React, { useState, useMemo, useEffect } from 'react';
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  RotateCcw,
  BarChart2,
  PieChart as PieIcon,
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
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
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
} from '../domain/selectors/reportSelectors';
import {
  groupSalesByDate,
  groupSalesByCategory,
} from '../domain/selectors/dashboardSelectors';
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
  const { orders, reversals, categories, settings, items, addons, user } = useAppStore();

  const isCashier = Boolean(
    (user?.role?.toLowerCase().includes('cashier') && !user?.role?.toLowerCase().includes('admin')) ||
    (user?.username?.toLowerCase() === 'cashier' && user?.username?.toLowerCase() !== 'admin')
  );

  // Navigation tab: 'Sales' | 'Revenue' | 'Reversals' | 'Profit'
  const [activeTab, setActiveTab] = useState('Sales');

  // Unified Filter States (Cashier strictly locked to 'Today')
  const [datePreset, setDatePreset] = useState(isCashier ? 'Today' : 'This Week');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedItem, setSelectedItem] = useState('All');
  const [profitViewType, setProfitViewType] = useState('all'); // 'all' | 'items' | 'addons'
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('All');
  const [selectedOrderType, setSelectedOrderType] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedReason, setSelectedReason] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

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
      ];
    }
    return [
      { id: 'Sales', label: 'Sales' },
      { id: 'Revenue', label: 'Revenue' },
      { id: 'Reversals', label: 'Reversals' },
      { id: 'Profit', label: 'Profit & Cost' },
    ];
  }, [isCashier]);

  useEffect(() => {
    if (isCashier && activeTab === 'Profit') {
      setActiveTab('Sales');
    }
  }, [isCashier, activeTab]);

  const effectiveDatePreset = isCashier ? 'Today' : datePreset;
  const effectiveCustomRange = isCashier
    ? null
    : (datePreset === 'Custom' && customStartDate && customEndDate
        ? { startDate: customStartDate, endDate: customEndDate }
        : null);

  const customRange = effectiveCustomRange;

  // Unified Filtered Datasets (Single source of truth)
  const filteredOrders = useMemo(() => {
    return filterReportOrders(orders, {
      datePreset: effectiveDatePreset,
      customRange: effectiveCustomRange,
      category: selectedCategory,
      paymentMethod: selectedPaymentMethod,
      orderType: selectedOrderType,
      status: selectedStatus,
      searchQuery,
    });
  }, [
    orders,
    effectiveDatePreset,
    effectiveCustomRange,
    selectedCategory,
    selectedPaymentMethod,
    selectedOrderType,
    selectedStatus,
    searchQuery,
  ]);

  const filteredReversals = useMemo(() => {
    return filterReportReversals(reversals, {
      datePreset: effectiveDatePreset,
      customRange: effectiveCustomRange,
      reason: selectedReason,
      searchQuery,
    });
  }, [reversals, effectiveDatePreset, effectiveCustomRange, selectedReason, searchQuery]);

  // Reset Filters
  const handleResetFilters = () => {
    setDatePreset(isCashier ? 'Today' : 'This Week');
    setCustomStartDate('');
    setCustomEndDate('');
    setSelectedCategory('All');
    setSelectedItem('All');
    setProfitViewType('all');
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

  // Profit & Cost Report Data (Deterministic, snapshot-based, includes Add-ons)
  const profitReportData = useMemo(() => {
    return getProfitAndCostReportData(
      orders,
      reversals,
      {
        datePreset,
        customRange,
        category: selectedCategory,
        item: selectedItem !== 'All' ? selectedItem : searchQuery,
        viewType: profitViewType,
      },
      items,
      addons
    );
  }, [orders, reversals, datePreset, customRange, selectedCategory, selectedItem, searchQuery, profitViewType, items, addons]);

  const profitKpis = profitReportData.kpis;
  const profitItemRows = profitReportData.itemRows;

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
      datePreset,
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
      filters: { datePreset },
      settings,
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
      title: 'Invoice #',
      headerClassName: 'w-28 font-bold',
      render: (invNum, row) => (
        <button
          type="button"
          onClick={() => setSelectedInvoiceForView(row)}
          className="font-bold text-xs text-[#FF5C28] hover:underline cursor-pointer flex items-center gap-1"
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>{invNum || `#${row.id}`}</span>
        </button>
      ),
    },
    {
      key: 'completedAt',
      title: 'Date & Time',
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
      render: (sub) => (
        <span className="text-xs text-slate-700">{formatCurrency(sub || 0)}</span>
      ),
    },
    {
      key: 'discountAmount',
      title: 'Discount',
      headerClassName: 'w-20 text-right',
      align: 'right',
      cellClassName: 'text-right',
      render: (disc) => (
        <span className="text-xs text-rose-600">
          {Number(disc) > 0 ? `-${formatCurrency(disc)}` : 'Rs 0'}
        </span>
      ),
    },
    {
      key: 'taxAmount',
      title: 'Tax',
      headerClassName: 'w-20 text-right',
      align: 'right',
      cellClassName: 'text-right',
      render: (tax) => (
        <span className="text-xs text-slate-500">{formatCurrency(tax || 0)}</span>
      ),
    },
    {
      key: 'grandTotal',
      title: 'Grand Total',
      headerClassName: 'w-28 text-right font-bold',
      align: 'right',
      cellClassName: 'text-right',
      render: (total) => (
        <span className="font-bold text-xs text-slate-900">{formatCurrency(total || 0)}</span>
      ),
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
      render: (status) => {
        const isRev = (status || '').toLowerCase() === 'reversed';
        return isRev ? (
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
      title: 'Original Inv #',
      headerClassName: 'w-28 font-bold',
      render: (invNum, row) => {
        const originalOrder = orders.find((o) => o.id === row.originalOrderId);
        return (
          <button
            type="button"
            onClick={() => originalOrder && setSelectedInvoiceForView(originalOrder)}
            className="font-bold text-xs text-[#FF5C28] hover:underline cursor-pointer flex items-center gap-1"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>{invNum}</span>
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
      title: 'Item',
      headerClassName: 'min-w-[170px] font-bold',
      render: (name, row) => (
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-xs text-slate-800">{name}</span>
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
      ),
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
            row.isAddon
              ? 'bg-orange-50 text-[#FF5C28] border border-orange-200/60'
              : 'bg-slate-100 text-slate-700'
          }`}
        >
          {cat || (row.isAddon ? 'Add-ons' : 'General')}
        </span>
      ),
    },
    {
      key: 'qtyWeightDisplay',
      title: 'Qty / Weight Sold',
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
      title: 'Net Sales',
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
      title: 'Gross Profit',
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
      title: 'Profit Margin %',
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

  // Pagination slicing
  const activeDataset =
    activeTab === 'Profit'
      ? profitItemRows
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

      {/* Cashier 1-Day Restriction Banner */}
      {isCashier && (
        <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200/90 text-amber-900 text-xs flex items-center justify-between gap-3 shadow-2xs no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
              <Lock className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-bold text-amber-900 block leading-tight">
                Cashier View Locked to Today (1 Day Only)
              </span>
              <span className="text-[11px] text-amber-700 block mt-0.5">
                Cashier accounts are restricted to today's shift & single-day sales report. Historical multi-day reports require Administrator credentials.
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-amber-200/70 text-amber-900 font-bold text-[10px] tracking-wide uppercase border border-amber-300 shrink-0">
            1-Day Access
          </span>
        </div>
      )}

      {/* 3. Common Filter Toolbar (Single Shared Filter Source) */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3 no-print">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
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
            className="w-full lg:max-w-xs"
          />

          {/* Filters Group */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Date Preset */}
            {isCashier ? (
              <div className="h-9 px-3 bg-amber-50 border border-amber-200 rounded-xl font-bold text-amber-800 flex items-center gap-2 text-xs select-none">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <span>Today (1 Day Only)</span>
              </div>
            ) : (
              <select
                value={datePreset}
                onChange={(e) => {
                  setDatePreset(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:border-[#FF5C28] cursor-pointer"
              >
                <option value="Today">Today</option>
                <option value="Yesterday">Yesterday</option>
                <option value="This Week">This Week</option>
                <option value="This Month">This Month</option>
                <option value="All Time">All Time</option>
                <option value="Custom">Custom Range</option>
              </select>
            )}

            {/* Custom Range Inputs */}
            {!isCashier && datePreset === 'Custom' && (
              <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => {
                    setCustomStartDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-7 px-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700"
                />
                <span className="text-slate-400 text-xs">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => {
                    setCustomEndDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-7 px-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700"
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
                className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:border-[#FF5C28] cursor-pointer"
              >
                <option value="All">All Categories</option>
                {activeTab === 'Profit' && <option value="Add-ons">Add-ons</option>}
                {(categories || [])
                  .filter((c) => c && c.name && c.name.toLowerCase() !== 'add-ons')
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
                className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:border-[#FF5C28] cursor-pointer"
              >
                <option value="All">All Items & Add-ons</option>
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
                className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:border-[#FF5C28] cursor-pointer"
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
                className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:border-[#FF5C28] cursor-pointer"
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
                className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:border-[#FF5C28] cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="completed">Completed</option>
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
                className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:border-[#FF5C28] cursor-pointer"
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
              title="Gross Sales"
              value={formatCurrency(salesKpis.grossSales)}
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

          {/* Charts Row: Daily Sales Trend & Category Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Daily Sales Bar Chart */}
            <Card className="lg:col-span-7 flex flex-col justify-between">
              <CardHeader className="flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle>Daily Sales Trend</CardTitle>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Valid gross sales volume grouped by date
                  </p>
                </div>
                <BarChart2 className="w-4 h-4 text-slate-400" />
              </CardHeader>
              <CardContent className="h-64 pt-2">
                {salesDailyChart.length === 0 ||
                salesDailyChart.every((d) => d.grossSales === 0) ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No sales recorded for this interval.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesDailyChart} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#64748B' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => `Rs ${val >= 1000 ? `${Math.round(val / 1000)}k` : val}`}
                      />
                      <Tooltip
                        formatter={(val) => [formatCurrency(val), 'Sales']}
                        labelFormatter={(lbl) => `Date: ${lbl}`}
                        contentStyle={{
                          backgroundColor: '#1E293B',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '12px',
                          border: 'none',
                        }}
                      />
                      <Bar dataKey="grossSales" fill="#FF5C28" radius={[4, 4, 0, 0]} maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Category Sales Breakdown */}
            <Card className="lg:col-span-5 flex flex-col justify-between">
              <CardHeader className="flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle>Sales by Category</CardTitle>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Product share distribution across active sales
                  </p>
                </div>
                <PieIcon className="w-4 h-4 text-slate-400" />
              </CardHeader>
              <CardContent className="pt-2 flex flex-col justify-between min-h-[250px]">
                {categoryBreakdown.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-xs text-slate-400">
                    No category sales data for selected filters.
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-2">
                    {/* Left: Donut Chart matching screenshot */}
                    <div className="w-44 h-44 shrink-0 flex items-center justify-center relative">
                      <PieChart width={176} height={176}>
                        <Tooltip
                          formatter={(value, name) => [
                            `${formatCurrency(value)} (${
                              categoryBreakdown.find((c) => (c.name || c.category) === name)?.percentage || 0
                            }%)`,
                            name,
                          ]}
                          contentStyle={{
                            borderRadius: '12px',
                            fontSize: '11px',
                            border: '1px solid #E2E8F0',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                          }}
                        />
                        <Pie
                          data={categoryBreakdown}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={46}
                          outerRadius={72}
                          paddingAngle={3}
                          stroke="#FFFFFF"
                          strokeWidth={2}
                          isAnimationActive={false}
                        >
                          {categoryBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </div>

                    {/* Right: Category List with Percentages matching screenshot */}
                    <div className="flex-1 w-full space-y-3.5 max-h-52 overflow-y-auto pr-1">
                      {categoryBreakdown.map((cat) => (
                        <div
                          key={cat.category || cat.name}
                          className="flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: cat.color }}
                            />
                            <span className="font-medium text-slate-700 truncate">
                              {cat.category || cat.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-bold text-slate-900 text-xs">
                              {cat.percentage}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer Invoices count note matching screenshot */}
                {(salesKpis.validOrderCount ?? filteredOrders.length) > 0 && (
                  <div className="pt-2 border-t border-slate-100 flex justify-end">
                    <span className="text-[11px] text-slate-400 font-medium">
                      {salesKpis.validOrderCount ?? filteredOrders.length}{' '}
                      {(salesKpis.validOrderCount ?? filteredOrders.length) === 1 ? 'invoice' : 'invoices'}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
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
              title="Gross Billed"
              value={formatCurrency(revenueKpis.grossBilled)}
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

          {/* Revenue Trend Chart */}
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Revenue Trend</CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">
                  Gross Billed vs Net Revenue vs Stored Tax Collected
                </p>
              </div>
              <TrendingUp className="w-4 h-4 text-slate-400" />
            </CardHeader>
            <CardContent className="h-72 pt-2">
              {revenueDailyChart.length === 0 ||
              revenueDailyChart.every((d) => d.grossBilled === 0) ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No revenue data available for the selected filters.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueDailyChart} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="netRevGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="grossBilledGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => `Rs ${val >= 1000 ? `${Math.round(val / 1000)}k` : val}`}
                    />
                    <Tooltip
                      formatter={(val, name, item) => {
                        const key = item?.dataKey || name;
                        let label = 'Tax';
                        if (key === 'grossBilled' || name === 'Gross Sales' || name === 'Gross Billed') {
                          label = 'Gross Sales';
                        } else if (key === 'netRevenue' || name === 'Net Revenue') {
                          label = 'Net Revenue';
                        } else if (key === 'tax' || name === 'Tax') {
                          label = 'Tax';
                        }
                        return [formatCurrency(val), label];
                      }}
                      labelFormatter={(lbl) => `Date: ${lbl}`}
                      contentStyle={{
                        backgroundColor: '#0B0F19',
                        borderRadius: '10px',
                        color: '#fff',
                        fontSize: '12px',
                        border: '1px solid #1E293B',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
                        padding: '8px 12px',
                      }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="grossBilled" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#grossBilledGradient)" name="Gross Sales" />
                    <Area type="monotone" dataKey="netRevenue" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#netRevGradient)" name="Net Revenue" />
                    <Bar dataKey="tax" fill="#8B5CF6" radius={[2, 2, 0, 0]} maxBarSize={18} name="Tax" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

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

          {/* Reversal Trend Chart */}
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Reversal Trend</CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">
                  Reversed customer-billed volume and count over time
                </p>
              </div>
              <RotateCcw className="w-4 h-4 text-slate-400" />
            </CardHeader>
            <CardContent className="h-64 pt-2">
              {reversalDailyChart.length === 0 ||
              reversalDailyChart.every((d) => d.reversalTotal === 0) ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No reversals recorded for this interval.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reversalDailyChart} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => `Rs ${val}`}
                    />
                    <Tooltip
                      formatter={(val, name) => [
                        name === 'reversalTotal' ? formatCurrency(val) : val,
                        name === 'reversalTotal' ? 'Reversal Total' : 'Count',
                      ]}
                      labelFormatter={(lbl) => `Date: ${lbl}`}
                      contentStyle={{
                        backgroundColor: '#1E293B',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '12px',
                        border: 'none',
                      }}
                    />
                    <Bar dataKey="reversalTotal" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={32} name="reversalTotal" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

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
                />

                {/* Accounting TOTAL ROW: Section 8 Requirement */}
                <div className="border-t-2 border-slate-300 bg-slate-50/80 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="font-bold text-slate-800 flex items-center gap-2">
                    <span className="uppercase tracking-wider text-[11px] text-slate-500">Total / Overall</span>
                    <span className="text-slate-400">({profitItemRows.length} items sold across {profitKpis.validOrdersCount} valid invoices)</span>
                  </div>
                  <div className="flex items-center gap-5 sm:gap-7 flex-wrap justify-end">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-medium">Total Net Sales</span>
                      <span className="font-bold text-slate-900 text-sm">{formatCurrency(profitKpis.netSales)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-medium">Total COGS</span>
                      <span className="font-bold text-slate-700 text-sm">{formatCurrency(profitKpis.cogs)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-medium">Total Gross Profit</span>
                      <span className={`font-bold text-sm ${profitKpis.grossProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {formatCurrency(profitKpis.grossProfit)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-medium">Overall Margin</span>
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                        {profitKpis.grossProfitMargin}%
                      </span>
                    </div>
                  </div>
                </div>

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
