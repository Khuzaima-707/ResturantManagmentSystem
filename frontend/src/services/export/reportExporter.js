/**
 * Chartered Accountant Grade Report Exporter Service
 * Generates VIP Styled Excel Workbooks (.xlsx) matching the executive reference design:
 * - Dark Navy Executive Header Banner (#0B192C)
 * - Metadata Audit Block (Report Period, Category, Payment, Generated timestamp)
 * - Top KPI Summary Cards Row (Spacious bordered metric boxes)
 * - Signature Vibrant Orange Table Headers (#FF5C28) with bold white text
 * - Status Color Highlighting (Mint Green for Active, Rose Pink for Reversed)
 * - Accounting Totals Row with Double Bottom Ledger Underline
 * - Side Reconciliation Cards (Status vs Sales distribution)
 * - Also provides standardized clean CSV & PDF exports.
 */
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import { formatCurrency, formatNumber } from '../../utils/formatters';

// Common Palette Constants (Matching Reference Design)
const COLOR_NAVY = 'FF0B192C';      // Deep Navy Blue Title Banner
const COLOR_NAVY_SUB = 'FF94A3B8';  // Light Muted Gray Subtitle
const COLOR_ORANGE = 'FFFF5C28';    // Signature Brand Orange Table Header
const COLOR_TEXT_DARK = 'FF0F172A'; // Slate-900 Dark Body Text
const COLOR_MUTED = 'FF64748B';     // Slate-500 Muted Label Text
const COLOR_BORDER = 'FFE2E8F0';    // Slate-200 Clean Border
const COLOR_KPI_BG = 'FFF1F5F9';    // Slate-100 KPI Header Fill
const COLOR_ACTIVE_BG = 'FFE6F9EE'; // Soft Mint Green Active Fill
const COLOR_ACTIVE_TEXT = 'FF15803D';// Forest Green Active Font
const COLOR_REV_BG = 'FFFEE2E2';    // Soft Rose Pink Reversed Fill
const COLOR_REV_TEXT = 'FFB91C1C';  // Deep Crimson Reversed Font

/**
 * Format helper for clean Date string: e.g. "12-Oct-2026 10:15" or "12-Oct-2026 09:30 AM"
 */
function formatExcelDateTime(dateInput, includeAmPm = false) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(d.getDate()).padStart(2, '0');
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const rawHours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');

  if (includeAmPm) {
    const ampm = rawHours >= 12 ? 'PM' : 'AM';
    const hours12 = rawHours % 12 || 12;
    return `${day}-${month}-${year} ${String(hours12).padStart(2, '0')}:${minutes} ${ampm}`;
  }

  return `${day}-${month}-${year} ${String(rawHours).padStart(2, '0')}:${minutes}`;
}

/**
 * Trigger client-side file download in browser from ExcelJS workbook buffer
 */
async function saveWorkbook(workbook, filename) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Applies a uniform thin border to an Excel cell
 */
function applyCellBorder(cell, style = 'thin', color = COLOR_BORDER) {
  cell.border = {
    top: { style, color: { argb: color } },
    left: { style, color: { argb: color } },
    bottom: { style, color: { argb: color } },
    right: { style, color: { argb: color } },
  };
}

// =========================================================================
// 1. SALES REPORT EXCEL (Exact Match to User Reference Screenshot)
// =========================================================================

export async function exportSalesReportExcel({ orders = [], kpis = {}, filters = {}, settings = {} }) {
  const restaurantName = settings?.business?.name || settings?.restaurantName || 'SpiceHub Restaurant & Grill';
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SpiceHub POS System';
  workbook.created = new Date();

  const ws = workbook.addWorksheet('Sales Report', {
    views: [{ showGridLines: true }],
  });

  // Set precise column widths
  ws.columns = [
    { key: 'colA', width: 14 }, // Invoice #
    { key: 'colB', width: 19 }, // Date / Time
    { key: 'colC', width: 14 }, // Order Type
    { key: 'colD', width: 15 }, // Category
    { key: 'colE', width: 13 }, // Payment
    { key: 'colF', width: 9 },  // Items
    { key: 'colG', width: 15 }, // Gross Sales
    { key: 'colH', width: 15 }, // Net Revenue
    { key: 'colI', width: 12 }, // Tax
    { key: 'colJ', width: 13 }, // Status
    { key: 'colK', width: 15 }, // Valid Net
    { key: 'colL', width: 15 }, // Valid Gross
    { key: 'colM', width: 12 }, // Valid Items
    { key: 'colN', width: 15 }, // Valid Discount
    { key: 'colO', width: 4 },  // Spacer
    { key: 'colP', width: 14 }, // Side Col 1
    { key: 'colQ', width: 16 }, // Side Col 2
  ];

  // --- ROW 1 & 2: Top Title Banner (Navy Blue #0B192C with White Text) ---
  ws.mergeCells('A1:N1');
  const titleCell = ws.getCell('A1');
  titleCell.value = `${restaurantName} — Sales Report`;
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_NAVY } };
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(1).height = 26;

  ws.mergeCells('A2:N2');
  const subCell = ws.getCell('A2');
  subCell.value = 'Audited sales breakdown • Filter-aware export • Amounts in PKR';
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_NAVY } };
  subCell.font = { name: 'Arial', size: 9.5, color: { argb: COLOR_NAVY_SUB } };
  subCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(2).height = 18;

  // --- ROWS 4-7: Report Parameters / Filter Metadata ---
  const metaConfig = [
    { row: 4, label: 'Report Period', val: filters.datePreset || 'This Week' },
    { row: 5, label: 'Category', val: filters.category || 'All Categories' },
    { row: 6, label: 'Payment', val: filters.paymentMethod || 'All Payments' },
    { row: 7, label: 'Generated', val: formatExcelDateTime(Date.now(), true) },
  ];

  metaConfig.forEach(({ row, label, val }) => {
    const lblCell = ws.getCell(`A${row}`);
    lblCell.value = label;
    lblCell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF334155' } };

    const valCell = ws.getCell(`B${row}`);
    valCell.value = val;
    valCell.font = { name: 'Arial', size: 9.5, color: { argb: 'FF0F172A' } };
    ws.getRow(row).height = 18;
  });

  // --- ROWS 9-10: Executive KPI Summary Cards Row ---
  const kpiLabels = ['Total Sale', 'Valid Net Sales', 'Valid Orders', 'Average Order Val', 'Items Sold', 'Discounts Given'];
  const validOrderCount = kpis.validOrderCount !== undefined ? kpis.validOrderCount : (kpis.completedOrders || 0);
  const kpiValues = [
    `Rs ${formatNumber(kpis.validBilledSales || kpis.totalSale || kpis.grossSales || 0)}`,
    `Rs ${formatNumber(kpis.validNetSales || 0)}`,
    Number(validOrderCount),
    Number(Math.round(kpis.averageOrderValue || 0)),
    Number(kpis.itemsSold || 0),
    `Rs ${formatNumber(kpis.discountsGiven || 0)}`,
  ];

  ws.getRow(9).height = 18;
  ws.getRow(10).height = 24;

  const kpiCols = ['A', 'B', 'C', 'D', 'E', 'F'];
  kpiCols.forEach((col, idx) => {
    const headerCell = ws.getCell(`${col}9`);
    headerCell.value = kpiLabels[idx];
    headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_KPI_BG } };
    headerCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: COLOR_MUTED } };
    headerCell.alignment = { vertical: 'middle', horizontal: 'center' };
    applyCellBorder(headerCell);

    const valCell = ws.getCell(`${col}10`);
    valCell.value = kpiValues[idx];
    valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    valCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: COLOR_TEXT_DARK } };
    valCell.alignment = { vertical: 'middle', horizontal: 'center' };
    applyCellBorder(valCell);
  });

  // --- ROW 12: Main Data Table Header (Vibrant Orange #FF5C28 with White Bold Text) ---
  const headers = [
    'Invoice #',
    'Date / Time',
    'Order Type',
    'Category',
    'Payment',
    'Items',
    'Gross Sales',
    'Net Revenue',
    'Tax',
    'Status',
    'Valid Net',
    'Valid Gross',
    'Valid Items',
    'Valid Discount',
  ];

  const headerRow = ws.getRow(12);
  headerRow.height = 24;
  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ORANGE } };
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    applyCellBorder(cell, 'thin', 'FFE04D1D');
  });

  // Side Table: Active vs Reversed Sales (Columns P & Q)
  const activeOrders = orders.filter((o) => o.status !== 'reversed');
  const reversedOrders = orders.filter((o) => o.status === 'reversed');
  const activeSales = activeOrders.reduce((sum, o) => sum + (Number(o.grandTotal) || 0), 0);
  const reversedSales = reversedOrders.reduce((sum, o) => sum + (Number(o.grandTotal) || 0), 0);

  // Side Table Header
  const sideH1 = ws.getCell('P2');
  sideH1.value = 'Status';
  sideH1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_NAVY } };
  sideH1.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
  sideH1.alignment = { horizontal: 'center', vertical: 'middle' };
  applyCellBorder(sideH1);

  const sideH2 = ws.getCell('Q2');
  sideH2.value = 'Sales';
  sideH2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_NAVY } };
  sideH2.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
  sideH2.alignment = { horizontal: 'center', vertical: 'middle' };
  applyCellBorder(sideH2);

  // Side Table Rows
  const sideR1 = ws.getCell('P3');
  sideR1.value = 'Active';
  sideR1.font = { name: 'Arial', size: 9 };
  applyCellBorder(sideR1);
  const sideR1Val = ws.getCell('Q3');
  sideR1Val.value = activeSales;
  sideR1Val.numFmt = '#,##0';
  sideR1Val.font = { name: 'Arial', size: 9 };
  applyCellBorder(sideR1Val);

  const sideR2 = ws.getCell('P4');
  sideR2.value = 'Reversed';
  sideR2.font = { name: 'Arial', size: 9 };
  applyCellBorder(sideR2);
  const sideR2Val = ws.getCell('Q4');
  sideR2Val.value = reversedSales;
  sideR2Val.numFmt = '#,##0';
  sideR2Val.font = { name: 'Arial', size: 9 };
  applyCellBorder(sideR2Val);

  // Side Table Metric / Amount
  const sideM1 = ws.getCell('P6');
  sideM1.value = 'Metric';
  sideM1.font = { name: 'Arial', size: 9, bold: true, color: { argb: COLOR_MUTED } };
  const sideM2 = ws.getCell('Q6');
  sideM2.value = 'Amount';
  sideM2.font = { name: 'Arial', size: 9, bold: true, color: { argb: COLOR_MUTED } };

  // --- ROWS 13+: Data Rows ---
  let currentRowIdx = 13;
  let totalGross = 0;
  let totalNet = 0;
  let totalTax = 0;
  let totalValidNet = 0;
  let totalValidGross = 0;
  let totalValidItems = 0;
  let totalValidDiscount = 0;

  orders.forEach((o) => {
    const isReversed = o.status === 'reversed';
    const itemsCount = (o.lines || []).reduce((q, l) => q + (Number(l.quantity) || 1), 0);
    const grossVal = Number(o.grandTotal) || 0;
    const netVal = Number(o.subtotal) || 0;
    const taxVal = Number(o.taxAmount) || 0;
    const discVal = Number(o.discountAmount) || 0;

    const validNet = isReversed ? 0 : netVal;
    const validGross = isReversed ? 0 : grossVal;
    const validItems = isReversed ? 0 : itemsCount;
    const validDiscount = isReversed ? 0 : discVal;

    totalGross += grossVal;
    totalNet += netVal;
    totalTax += taxVal;
    totalValidNet += validNet;
    totalValidGross += validGross;
    totalValidItems += validItems;
    totalValidDiscount += validDiscount;

    const row = ws.getRow(currentRowIdx);
    row.height = 20;

    // Col A: Invoice #
    const cInv = row.getCell(1);
    cInv.value = o.invoiceNumber || o.id;
    cInv.alignment = { horizontal: 'center', vertical: 'middle' };
    cInv.font = { name: 'Arial', size: 9 };
    applyCellBorder(cInv);

    // Col B: Date / Time
    const cDate = row.getCell(2);
    cDate.value = formatExcelDateTime(o.completedAt || o.createdAt || Date.now());
    cDate.alignment = { horizontal: 'center', vertical: 'middle' };
    cDate.font = { name: 'Arial', size: 9 };
    applyCellBorder(cDate);

    // Col C: Order Type
    const cType = row.getCell(3);
    cType.value = o.orderType || 'Dine-In';
    cType.alignment = { horizontal: 'center', vertical: 'middle' };
    cType.font = { name: 'Arial', size: 9 };
    applyCellBorder(cType);

    // Col D: Category
    const cCat = row.getCell(4);
    cCat.value = (o.lines && (o.lines[0]?.categoryNameSnapshot || o.lines[0]?.categoryName || o.lines[0]?.category)) || o.category || 'General';
    cCat.alignment = { horizontal: 'center', vertical: 'middle' };
    cCat.font = { name: 'Arial', size: 9 };
    applyCellBorder(cCat);

    // Col E: Payment
    const cPay = row.getCell(5);
    cPay.value = o.paymentMethod || 'Cash';
    cPay.alignment = { horizontal: 'center', vertical: 'middle' };
    cPay.font = { name: 'Arial', size: 9 };
    applyCellBorder(cPay);

    // Col F: Items
    const cItems = row.getCell(6);
    cItems.value = itemsCount;
    cItems.alignment = { horizontal: 'center', vertical: 'middle' };
    cItems.font = { name: 'Arial', size: 9 };
    applyCellBorder(cItems);

    // Col G: Gross Sales
    const cGross = row.getCell(7);
    cGross.value = grossVal;
    cGross.numFmt = '"Rs "#,##0';
    cGross.alignment = { horizontal: 'right', vertical: 'middle' };
    cGross.font = { name: 'Arial', size: 9 };
    applyCellBorder(cGross);

    // Col H: Net Revenue
    const cNet = row.getCell(8);
    cNet.value = netVal;
    cNet.numFmt = '"Rs "#,##0';
    cNet.alignment = { horizontal: 'right', vertical: 'middle' };
    cNet.font = { name: 'Arial', size: 9 };
    applyCellBorder(cNet);

    // Col I: Tax
    const cTax = row.getCell(9);
    cTax.value = taxVal;
    cTax.numFmt = '"Rs "#,##0';
    cTax.alignment = { horizontal: 'right', vertical: 'middle' };
    cTax.font = { name: 'Arial', size: 9 };
    applyCellBorder(cTax);

    // Col J: Status (Mint Green for Active, Rose Pink for Reversed)
    const cStatus = row.getCell(10);
    cStatus.value = isReversed ? 'Reversed' : 'Active';
    cStatus.alignment = { horizontal: 'center', vertical: 'middle' };
    cStatus.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: isReversed ? COLOR_REV_BG : COLOR_ACTIVE_BG },
    };
    cStatus.font = {
      name: 'Arial',
      size: 9,
      bold: true,
      color: { argb: isReversed ? COLOR_REV_TEXT : COLOR_ACTIVE_TEXT },
    };
    applyCellBorder(cStatus);

    // Col K: Valid Net
    const cVNet = row.getCell(11);
    cVNet.value = validNet;
    cVNet.numFmt = '"Rs "#,##0';
    cVNet.alignment = { horizontal: 'right', vertical: 'middle' };
    cVNet.font = { name: 'Arial', size: 9 };
    applyCellBorder(cVNet);

    // Col L: Valid Gross
    const cVGross = row.getCell(12);
    cVGross.value = validGross;
    cVGross.numFmt = '"Rs "#,##0';
    cVGross.alignment = { horizontal: 'right', vertical: 'middle' };
    cVGross.font = { name: 'Arial', size: 9 };
    applyCellBorder(cVGross);

    // Col M: Valid Items
    const cVItems = row.getCell(13);
    cVItems.value = validItems;
    cVItems.alignment = { horizontal: 'center', vertical: 'middle' };
    cVItems.font = { name: 'Arial', size: 9 };
    applyCellBorder(cVItems);

    // Col N: Valid Discount
    const cVDisc = row.getCell(14);
    cVDisc.value = validDiscount;
    cVDisc.numFmt = '"Rs "#,##0';
    cVDisc.alignment = { horizontal: 'right', vertical: 'middle' };
    cVDisc.font = { name: 'Arial', size: 9 };
    applyCellBorder(cVDisc);

    currentRowIdx += 1;
  });

  // --- TOTALS ROW: Report Totals (active filter scope) with Double Bottom Border ---
  const totRow = ws.getRow(currentRowIdx);
  totRow.height = 24;

  const cTotLabel = totRow.getCell(1);
  cTotLabel.value = 'Report Totals (active filter scope)';
  cTotLabel.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: COLOR_TEXT_DARK } };
  cTotLabel.alignment = { horizontal: 'left', vertical: 'middle' };

  for (let c = 1; c <= 14; c += 1) {
    const cell = totRow.getCell(c);
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'double', color: { argb: COLOR_TEXT_DARK } },
    };
  }

  // Values in totals row
  const setTotVal = (col, val, numFmt = '"Rs "#,##0', align = 'right') => {
    const cell = totRow.getCell(col);
    cell.value = val;
    cell.numFmt = numFmt;
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: COLOR_TEXT_DARK } };
    cell.alignment = { horizontal: align, vertical: 'middle' };
  };

  setTotVal(7, totalGross);
  setTotVal(8, totalNet);
  setTotVal(9, totalTax);
  setTotVal(11, totalValidNet);
  setTotVal(12, totalValidGross);
  setTotVal(13, totalValidItems, '#,##0', 'center');
  setTotVal(14, totalValidDiscount);

  const filename = `Sales_Report_${(filters.datePreset || 'Period').replace(/\s+/g, '_')}_${Date.now()}`;
  await saveWorkbook(workbook, filename);
}

// =========================================================================
// 2. REVENUE REPORT EXCEL (Executive Financial Statement matching reference design)
// =========================================================================

export async function exportRevenueReportExcel({ kpis = {}, paymentBreakdown = [], taxBreakdown = {}, discountBreakdown = {}, filters = {}, settings = {} }) {
  const restaurantName = settings?.business?.name || settings?.restaurantName || 'SpiceHub Restaurant & Grill';
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SpiceHub POS System';
  workbook.created = new Date();

  const ws = workbook.addWorksheet('Revenue Statement', {
    views: [{ showGridLines: true }],
  });

  ws.columns = [
    { key: 'colA', width: 8 },  // Line #
    { key: 'colB', width: 38 }, // Head / Component
    { key: 'colC', width: 18 }, // Amount (PKR)
    { key: 'colD', width: 22 }, // Classification
    { key: 'colE', width: 48 }, // Audit Notes
    { key: 'colF', width: 4 },  // Spacer
    { key: 'colG', width: 22 }, // Side Tender
    { key: 'colH', width: 16 }, // Side Amount
  ];

  // Top Navy Banner
  ws.mergeCells('A1:E1');
  const tCell = ws.getCell('A1');
  tCell.value = `${restaurantName} — Revenue & Tax Audit Report`;
  tCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_NAVY } };
  tCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  tCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(1).height = 26;

  ws.mergeCells('A2:E2');
  const sCell = ws.getCell('A2');
  sCell.value = 'Financial revenue breakdown • Tax compliance statement • Amounts in PKR';
  sCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_NAVY } };
  sCell.font = { name: 'Arial', size: 9.5, color: { argb: COLOR_NAVY_SUB } };
  sCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(2).height = 18;

  // Metadata
  const metaConfig = [
    { row: 4, label: 'Report Period', val: filters.datePreset || 'This Week' },
    { row: 5, label: 'Date Scope', val: filters.datePreset || 'This Week' },
    { row: 6, label: 'Generated', val: formatExcelDateTime(Date.now(), true) },
  ];
  metaConfig.forEach(({ row, label, val }) => {
    ws.getCell(`A${row}`).value = label;
    ws.getCell(`A${row}`).font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF334155' } };
    ws.getCell(`B${row}`).value = val;
    ws.getCell(`B${row}`).font = { name: 'Arial', size: 9.5, color: { argb: 'FF0F172A' } };
    ws.getRow(row).height = 18;
  });

  // KPI Summary Cards
  const kpiLabels = ['Gross Billed', 'Total Discounts', 'Tax Collected', 'Reversals', 'Net Revenue', 'Avg Net / Order'];
  const kpiValues = [
    `Rs ${formatNumber(kpis.grossBilled || 0)}`,
    `Rs ${formatNumber(kpis.totalDiscounts || 0)}`,
    `Rs ${formatNumber(kpis.taxCollected || 0)}`,
    `Rs ${formatNumber(kpis.reversalsIncludingTax || 0)}`,
    `Rs ${formatNumber(kpis.netRevenue || 0)}`,
    `Rs ${formatNumber(kpis.avgNetRevenuePerOrder || 0)}`,
  ];

  ws.getRow(9).height = 18;
  ws.getRow(10).height = 24;
  ['A', 'B', 'C', 'D', 'E'].forEach((col, idx) => {
    const hc = ws.getCell(`${col}9`);
    hc.value = kpiLabels[idx];
    hc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_KPI_BG } };
    hc.font = { name: 'Arial', size: 9, bold: true, color: { argb: COLOR_MUTED } };
    hc.alignment = { horizontal: 'center', vertical: 'middle' };
    applyCellBorder(hc);

    const vc = ws.getCell(`${col}10`);
    vc.value = kpiValues[idx];
    vc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    vc.font = { name: 'Arial', size: 12, bold: true, color: { argb: COLOR_TEXT_DARK } };
    vc.alignment = { horizontal: 'center', vertical: 'middle' };
    applyCellBorder(vc);
  });

  // Main Revenue Table Header (Orange #FF5C28)
  const headers = ['Line #', 'Financial Metric Head', 'Amount (PKR)', 'Classification', 'Audit Notes'];
  const hRow = ws.getRow(12);
  hRow.height = 24;
  headers.forEach((h, idx) => {
    const c = hRow.getCell(idx + 1);
    c.value = h;
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ORANGE } };
    c.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    applyCellBorder(c, 'thin', 'FFE04D1D');
  });

  // Side Table: Payment Tender Breakdown
  const sideH1 = ws.getCell('G2');
  sideH1.value = 'Payment Tender';
  sideH1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_NAVY } };
  sideH1.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
  applyCellBorder(sideH1);

  const sideH2 = ws.getCell('H2');
  sideH2.value = 'Amount (PKR)';
  sideH2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_NAVY } };
  sideH2.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
  applyCellBorder(sideH2);

  paymentBreakdown.forEach((p, idx) => {
    const rowNum = 3 + idx;
    const c1 = ws.getCell(`G${rowNum}`);
    c1.value = `${p.method} (${p.percentage}%)`;
    c1.font = { name: 'Arial', size: 9 };
    applyCellBorder(c1);

    const c2 = ws.getCell(`H${rowNum}`);
    c2.value = Number(p.amount) || 0;
    c2.numFmt = '"Rs "#,##0';
    c2.font = { name: 'Arial', size: 9 };
    applyCellBorder(c2);
  });

  // Data Rows for Revenue
  const statementRows = [
    [1, 'Gross Billed Customer Volume', Number(kpis.grossBilled || 0), 'Gross Turnover', 'Total gross sales billed before deductions'],
    [2, 'Total Discounts Allowed', Number(kpis.totalDiscounts || 0), 'Revenue Contra', 'Promotional vouchers & discretionary price reductions'],
    [3, 'Sales Tax Collected (Output)', Number(kpis.taxCollected || 0), 'Statutory Liability', 'Sales tax collected on behalf of tax authorities'],
    [4, 'Transaction Reversals (Incl Tax)', Number(kpis.reversalsIncludingTax || 0), 'Void / Cancellation', 'Refunded transactions and voided sale tickets'],
    [5, 'Net Realized Operating Revenue', Number(kpis.netRevenue || 0), 'Net Revenue', 'Core operating sales (Gross minus Tax, Discounts, Reversals)'],
    [6, 'Average Net Revenue Per Valid Order', Number(kpis.avgNetRevenuePerOrder || 0), 'Yield Efficiency', 'Average net financial yield per non-reversed ticket'],
  ];

  statementRows.forEach((r, idx) => {
    const row = ws.getRow(13 + idx);
    row.height = 20;

    const c1 = row.getCell(1);
    c1.value = r[0];
    c1.alignment = { horizontal: 'center', vertical: 'middle' };
    applyCellBorder(c1);

    const c2 = row.getCell(2);
    c2.value = r[1];
    c2.font = { name: 'Arial', size: 9, bold: true };
    applyCellBorder(c2);

    const c3 = row.getCell(3);
    c3.value = r[2];
    c3.numFmt = '"Rs "#,##0.00';
    c3.font = { name: 'Arial', size: 9, bold: true };
    c3.alignment = { horizontal: 'right', vertical: 'middle' };
    applyCellBorder(c3);

    const c4 = row.getCell(4);
    c4.value = r[3];
    c4.alignment = { horizontal: 'center', vertical: 'middle' };
    applyCellBorder(c4);

    const c5 = row.getCell(5);
    c5.value = r[4];
    c5.font = { name: 'Arial', size: 9, color: { argb: COLOR_MUTED } };
    applyCellBorder(c5);
  });

  // Totals Row
  const totRow = ws.getRow(19);
  totRow.height = 24;
  for (let c = 1; c <= 5; c += 1) {
    const cell = totRow.getCell(c);
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'double', color: { argb: COLOR_TEXT_DARK } },
    };
  }
  totRow.getCell(2).value = 'Net Realized Operating Total';
  totRow.getCell(2).font = { name: 'Arial', size: 9.5, bold: true, color: { argb: COLOR_TEXT_DARK } };
  const totVal = totRow.getCell(3);
  totVal.value = Number(kpis.netRevenue || 0);
  totVal.numFmt = '"Rs "#,##0.00';
  totVal.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: COLOR_TEXT_DARK } };
  totVal.alignment = { horizontal: 'right', vertical: 'middle' };

  const filename = `Revenue_Report_${(filters.datePreset || 'Period').replace(/\s+/g, '_')}_${Date.now()}`;
  await saveWorkbook(workbook, filename);
}

// =========================================================================
// 3. REVERSALS REPORT EXCEL (Audit Register matching reference design)
// =========================================================================

export async function exportReversalReportExcel({ reversals = [], kpis = {}, filters = {}, settings = {} }) {
  const restaurantName = settings?.business?.name || settings?.restaurantName || 'SpiceHub Restaurant & Grill';
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SpiceHub POS System';
  workbook.created = new Date();

  const ws = workbook.addWorksheet('Reversals Audit', {
    views: [{ showGridLines: true }],
  });

  ws.columns = [
    { key: 'colA', width: 20 }, // Reversal ID
    { key: 'colB', width: 16 }, // Invoice #
    { key: 'colC', width: 19 }, // Date / Time
    { key: 'colD', width: 28 }, // Reason
    { key: 'colE', width: 15 }, // Subtotal
    { key: 'colF', width: 15 }, // Discount
    { key: 'colG', width: 13 }, // Tax
    { key: 'colH', width: 16 }, // Total Reversed
    { key: 'colI', width: 13 }, // Status
    { key: 'colJ', width: 18 }, // Staff
    { key: 'colK', width: 4 },  // Spacer
    { key: 'colL', width: 22 }, // Side Reason
    { key: 'colM', width: 14 }, // Side Count
  ];

  // Top Navy Banner
  ws.mergeCells('A1:J1');
  const tCell = ws.getCell('A1');
  tCell.value = `${restaurantName} — Reversals & Audit Register`;
  tCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_NAVY } };
  tCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  tCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(1).height = 26;

  ws.mergeCells('A2:J2');
  const sCell = ws.getCell('A2');
  sCell.value = 'Cancelled transactions audit • Reversal justification log • Amounts in PKR';
  sCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_NAVY } };
  sCell.font = { name: 'Arial', size: 9.5, color: { argb: COLOR_NAVY_SUB } };
  sCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(2).height = 18;

  // Metadata
  const metaConfig = [
    { row: 4, label: 'Report Period', val: filters.datePreset || 'This Week' },
    { row: 5, label: 'Reason Filter', val: filters.reason || 'All Reasons' },
    { row: 6, label: 'Generated', val: formatExcelDateTime(Date.now(), true) },
  ];
  metaConfig.forEach(({ row, label, val }) => {
    ws.getCell(`A${row}`).value = label;
    ws.getCell(`A${row}`).font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF334155' } };
    ws.getCell(`B${row}`).value = val;
    ws.getCell(`B${row}`).font = { name: 'Arial', size: 9.5, color: { argb: 'FF0F172A' } };
    ws.getRow(row).height = 18;
  });

  // KPI Summary Cards
  const kpiLabels = ['Reversals Count', 'Subtotal Reversed', 'Discount Impact', 'Tax Reversed', 'Total Reversed'];
  const kpiValues = [
    Number(kpis.reversalCount || 0),
    `Rs ${formatNumber(kpis.reversedSubtotal || 0)}`,
    `Rs ${formatNumber(kpis.reversedDiscountImpact || 0)}`,
    `Rs ${formatNumber(kpis.reversedTax || 0)}`,
    `Rs ${formatNumber(kpis.reversalTotalIncludingTax || 0)}`,
  ];

  ws.getRow(9).height = 18;
  ws.getRow(10).height = 24;
  ['A', 'B', 'C', 'D', 'E'].forEach((col, idx) => {
    const hc = ws.getCell(`${col}9`);
    hc.value = kpiLabels[idx];
    hc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_KPI_BG } };
    hc.font = { name: 'Arial', size: 9, bold: true, color: { argb: COLOR_MUTED } };
    hc.alignment = { horizontal: 'center', vertical: 'middle' };
    applyCellBorder(hc);

    const vc = ws.getCell(`${col}10`);
    vc.value = kpiValues[idx];
    vc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    vc.font = { name: 'Arial', size: 12, bold: true, color: { argb: COLOR_TEXT_DARK } };
    vc.alignment = { horizontal: 'center', vertical: 'middle' };
    applyCellBorder(vc);
  });

  // Main Table Header (Orange #FF5C28)
  const headers = [
    'Reversal ID',
    'Original Invoice #',
    'Date / Time',
    'Reason / Justification',
    'Subtotal',
    'Discount',
    'Tax',
    'Total Reversed',
    'Status',
    'Authorized Staff',
  ];

  const hRow = ws.getRow(12);
  hRow.height = 24;
  headers.forEach((h, idx) => {
    const c = hRow.getCell(idx + 1);
    c.value = h;
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ORANGE } };
    c.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    applyCellBorder(c, 'thin', 'FFE04D1D');
  });

  // Data Rows
  let curRow = 13;
  let sumSub = 0;
  let sumDisc = 0;
  let sumTax = 0;
  let sumTot = 0;

  reversals.forEach((r) => {
    const subVal = Number(r.subtotalReversed) || 0;
    const discVal = Number(r.discountReversed) || 0;
    const taxVal = Number(r.taxReversed) || 0;
    const totVal = Number(r.totalReversedIncludingTax) || 0;

    sumSub += subVal;
    sumDisc += discVal;
    sumTax += taxVal;
    sumTot += totVal;

    const row = ws.getRow(curRow);
    row.height = 20;

    const c1 = row.getCell(1);
    c1.value = r.id;
    c1.alignment = { horizontal: 'center', vertical: 'middle' };
    applyCellBorder(c1);

    const c2 = row.getCell(2);
    c2.value = r.originalInvoiceNumber;
    c2.alignment = { horizontal: 'center', vertical: 'middle' };
    c2.font = { bold: true };
    applyCellBorder(c2);

    const c3 = row.getCell(3);
    c3.value = formatExcelDateTime(r.reversedAt || r.createdAt || Date.now());
    c3.alignment = { horizontal: 'center', vertical: 'middle' };
    applyCellBorder(c3);

    const c4 = row.getCell(4);
    c4.value = r.reason || 'N/A';
    applyCellBorder(c4);

    const c5 = row.getCell(5);
    c5.value = subVal;
    c5.numFmt = '"Rs "#,##0';
    c5.alignment = { horizontal: 'right', vertical: 'middle' };
    applyCellBorder(c5);

    const c6 = row.getCell(6);
    c6.value = discVal;
    c6.numFmt = '"Rs "#,##0';
    c6.alignment = { horizontal: 'right', vertical: 'middle' };
    applyCellBorder(c6);

    const c7 = row.getCell(7);
    c7.value = taxVal;
    c7.numFmt = '"Rs "#,##0';
    c7.alignment = { horizontal: 'right', vertical: 'middle' };
    applyCellBorder(c7);

    const c8 = row.getCell(8);
    c8.value = totVal;
    c8.numFmt = '"Rs "#,##0';
    c8.alignment = { horizontal: 'right', vertical: 'middle' };
    c8.font = { bold: true };
    applyCellBorder(c8);

    const c9 = row.getCell(9);
    c9.value = 'Reversed';
    c9.alignment = { horizontal: 'center', vertical: 'middle' };
    c9.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_REV_BG } };
    c9.font = { name: 'Arial', size: 9, bold: true, color: { argb: COLOR_REV_TEXT } };
    applyCellBorder(c9);

    const c10 = row.getCell(10);
    c10.value = r.reversedBy || 'Staff';
    c10.alignment = { horizontal: 'center', vertical: 'middle' };
    applyCellBorder(c10);

    curRow += 1;
  });

  // Totals Row
  const totRow = ws.getRow(curRow);
  totRow.height = 24;
  for (let c = 1; c <= 10; c += 1) {
    totRow.getCell(c).border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'double', color: { argb: COLOR_TEXT_DARK } },
    };
  }
  totRow.getCell(1).value = 'Report Totals (active filter scope)';
  totRow.getCell(1).font = { name: 'Arial', size: 9.5, bold: true, color: { argb: COLOR_TEXT_DARK } };

  const setTot = (col, val) => {
    const c = totRow.getCell(col);
    c.value = val;
    c.numFmt = '"Rs "#,##0';
    c.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: COLOR_TEXT_DARK } };
    c.alignment = { horizontal: 'right', vertical: 'middle' };
  };

  setTot(5, sumSub);
  setTot(6, sumDisc);
  setTot(7, sumTax);
  setTot(8, sumTot);

  const filename = `Reversals_Report_${(filters.datePreset || 'Period').replace(/\s+/g, '_')}_${Date.now()}`;
  await saveWorkbook(workbook, filename);
}

// =========================================================================
// 3. PROFIT & COST REPORT EXCEL
// =========================================================================

export async function exportProfitReportExcel({ itemRows = [], kpis = {}, filters = {}, settings = {} }) {
  const restaurantName = settings?.business?.name || settings?.restaurantName || 'SpiceHub Restaurant & Grill';
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SpiceHub POS System';
  workbook.created = new Date();

  const ws = workbook.addWorksheet('Profit & Cost', {
    views: [{ showGridLines: true }],
  });

  ws.columns = [
    { key: 'colA', width: 26 }, // Item
    { key: 'colB', width: 18 }, // Category
    { key: 'colC', width: 18 }, // Qty / Weight Sold
    { key: 'colD', width: 15 }, // Valid Invoices
    { key: 'colE', width: 17 }, // Net Sales (PKR)
    { key: 'colF', width: 17 }, // COGS (PKR)
    { key: 'colG', width: 17 }, // Gross Profit (PKR)
    { key: 'colH', width: 16 }, // Profit Margin %
  ];

  // Banner
  ws.mergeCells('A1:H1');
  const titleCell = ws.getCell('A1');
  titleCell.value = `${restaurantName} — Profit & Cost Report`;
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_NAVY } };
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(1).height = 26;

  ws.mergeCells('A2:H2');
  const subCell = ws.getCell('A2');
  subCell.value = 'Item-Wise COGS & Gross Profit Audit • Transaction-Level Cost Snapshots • Amounts in PKR';
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_NAVY } };
  subCell.font = { name: 'Arial', size: 9.5, color: { argb: COLOR_NAVY_SUB } };
  subCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(2).height = 18;

  // Metadata
  const metaConfig = [
    { row: 4, label: 'Report Period', val: filters.datePreset || 'This Week' },
    { row: 5, label: 'Category Filter', val: filters.category || 'All Categories' },
    { row: 6, label: 'Item Filter', val: filters.item || 'All Items' },
    { row: 7, label: 'Generated', val: formatExcelDateTime(Date.now(), true) },
  ];
  metaConfig.forEach(({ row, label, val }) => {
    ws.getCell(`A${row}`).value = label;
    ws.getCell(`A${row}`).font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF334155' } };
    ws.getCell(`B${row}`).value = val;
    ws.getCell(`B${row}`).font = { name: 'Arial', size: 9.5, color: { argb: 'FF0F172A' } };
    ws.getRow(row).height = 18;
  });

  // KPI Summary Cards
  const kpiLabels = ['Net Sales', 'Total COGS', 'Gross Profit', 'Profit Margin', 'Cost Status'];
  const kpiValues = [
    `Rs ${formatNumber(kpis.netSales || 0)}`,
    `Rs ${formatNumber(kpis.cogs || 0)}`,
    `Rs ${formatNumber(kpis.grossProfit || 0)}`,
    `${kpis.grossProfitMargin || 0}%`,
    kpis.hasMissingCosts ? `${kpis.missingCostCount} Missing` : 'All Costs Valid',
  ];

  ws.getRow(9).height = 18;
  ws.getRow(10).height = 24;
  ['A', 'B', 'C', 'D', 'E'].forEach((col, idx) => {
    const hc = ws.getCell(`${col}9`);
    hc.value = kpiLabels[idx];
    hc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_KPI_BG } };
    hc.font = { name: 'Arial', size: 9, bold: true, color: { argb: COLOR_MUTED } };
    hc.alignment = { horizontal: 'center', vertical: 'middle' };
    applyCellBorder(hc);

    const vc = ws.getCell(`${col}10`);
    vc.value = kpiValues[idx];
    vc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    vc.font = { name: 'Arial', size: 12, bold: true, color: { argb: idx === 4 && kpis.hasMissingCosts ? COLOR_REV_TEXT : COLOR_TEXT_DARK } };
    vc.alignment = { horizontal: 'center', vertical: 'middle' };
    applyCellBorder(vc);
  });

  // Main Headers
  const headers = [
    'Item',
    'Category',
    'Qty / Weight Sold',
    'Valid Invoices',
    'Net Sales',
    'COGS',
    'Gross Profit',
    'Profit Margin %',
  ];
  const hRow = ws.getRow(12);
  hRow.height = 24;
  headers.forEach((h, idx) => {
    const c = hRow.getCell(idx + 1);
    c.value = h;
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ORANGE } };
    c.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    applyCellBorder(c, 'thin', 'FFE04D1D');
  });

  // Rows
  let curRow = 13;
  itemRows.forEach((r) => {
    const row = ws.getRow(curRow);
    row.height = 20;

    const c1 = row.getCell(1);
    c1.value = r.name;
    c1.font = { name: 'Arial', size: 9, bold: true, color: { argb: COLOR_TEXT_DARK } };
    applyCellBorder(c1);

    const c2 = row.getCell(2);
    c2.value = r.category;
    c2.font = { name: 'Arial', size: 9, color: { argb: COLOR_TEXT_DARK } };
    applyCellBorder(c2);

    const c3 = row.getCell(3);
    c3.value = r.qtyWeightDisplay;
    c3.font = { name: 'Arial', size: 9 };
    c3.alignment = { horizontal: 'center', vertical: 'middle' };
    applyCellBorder(c3);

    const c4 = row.getCell(4);
    c4.value = Number(r.validInvoices) || 0;
    c4.font = { name: 'Arial', size: 9 };
    c4.alignment = { horizontal: 'center', vertical: 'middle' };
    applyCellBorder(c4);

    const c5 = row.getCell(5);
    c5.value = Number(r.netSales) || 0;
    c5.numFmt = '"Rs "#,##0';
    c5.font = { name: 'Arial', size: 9 };
    c5.alignment = { horizontal: 'right', vertical: 'middle' };
    applyCellBorder(c5);

    const c6 = row.getCell(6);
    if (r.hasCost && r.cogs !== null) {
      c6.value = Number(r.cogs) || 0;
      c6.numFmt = '"Rs "#,##0';
      c6.font = { name: 'Arial', size: 9 };
      c6.alignment = { horizontal: 'right', vertical: 'middle' };
    } else {
      c6.value = 'Cost Missing';
      c6.font = { name: 'Arial', size: 8.5, italic: true, color: { argb: COLOR_REV_TEXT } };
      c6.alignment = { horizontal: 'center', vertical: 'middle' };
    }
    applyCellBorder(c6);

    const c7 = row.getCell(7);
    if (r.hasCost && r.grossProfit !== null) {
      c7.value = Number(r.grossProfit) || 0;
      c7.numFmt = '"Rs "#,##0';
      c7.font = { name: 'Arial', size: 9, bold: true, color: { argb: r.grossProfit >= 0 ? COLOR_ACTIVE_TEXT : COLOR_REV_TEXT } };
      c7.alignment = { horizontal: 'right', vertical: 'middle' };
    } else {
      c7.value = 'Unavailable';
      c7.font = { name: 'Arial', size: 8.5, italic: true, color: { argb: COLOR_REV_TEXT } };
      c7.alignment = { horizontal: 'center', vertical: 'middle' };
    }
    applyCellBorder(c7);

    const c8 = row.getCell(8);
    if (r.hasCost && r.margin !== null) {
      c8.value = `${r.margin}%`;
      c8.font = { name: 'Arial', size: 9, bold: true };
      c8.alignment = { horizontal: 'center', vertical: 'middle' };
    } else {
      c8.value = 'N/A';
      c8.font = { name: 'Arial', size: 8.5, italic: true, color: { argb: COLOR_MUTED } };
      c8.alignment = { horizontal: 'center', vertical: 'middle' };
    }
    applyCellBorder(c8);

    curRow += 1;
  });

  // Totals Row
  const totRow = ws.getRow(curRow);
  totRow.height = 24;
  for (let c = 1; c <= 8; c += 1) {
    totRow.getCell(c).border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'double', color: { argb: COLOR_TEXT_DARK } },
    };
  }
  totRow.getCell(1).value = 'TOTAL / OVERALL';
  totRow.getCell(1).font = { name: 'Arial', size: 9.5, bold: true, color: { argb: COLOR_TEXT_DARK } };

  const setTot = (col, val, isCurrency = true) => {
    const c = totRow.getCell(col);
    c.value = val;
    if (isCurrency) {
      c.numFmt = '"Rs "#,##0';
      c.alignment = { horizontal: 'right', vertical: 'middle' };
    } else {
      c.alignment = { horizontal: 'center', vertical: 'middle' };
    }
    c.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: COLOR_TEXT_DARK } };
  };

  setTot(5, Number(kpis.netSales || 0));
  setTot(6, Number(kpis.cogs || 0));
  setTot(7, Number(kpis.grossProfit || 0));
  setTot(8, `${kpis.grossProfitMargin || 0}%`, false);

  const filename = `Profit_Cost_Report_${(filters.datePreset || 'Period').replace(/\s+/g, '_')}_${Date.now()}`;
  await saveWorkbook(workbook, filename);
}

// =========================================================================
// 4. CSV AND PDF COMPATIBILITY EXPORTS
// =========================================================================

function escapeCsv(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export function exportReportToCsv(filename, rows = []) {
  if (!rows || rows.length === 0) return;
  const csvContent = '\uFEFF' + rows.map((r) => r.map(escapeCsv).join(',')).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportSalesReportCsv({ orders = [], kpis = {}, filters = {}, settings = {} }) {
  const restName = settings?.business?.name || settings?.restaurantName || 'SpiceHub Restaurant & Grill';
  const dateStr = formatExcelDateTime(Date.now());
  const dateScope = filters.datePreset || 'This Week';

  const rows = [
    ['RESTAURANT SALES AUDIT TRANSACTION LEDGER', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['Business Name:', restName, 'Date Scope:', dateScope, 'Generated:', dateStr, '', '', '', '', '', '', '', 'Currency: PKR'],
    [],
    ['--- 1. SALES PERFORMANCE KPI SUMMARY ---', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['Total Sale (PKR):', Number((kpis.validBilledSales || kpis.totalSale || kpis.grossSales || 0).toFixed(2)), 'Valid Net Sales (PKR):', Number((kpis.validNetSales || 0).toFixed(2)), 'Completed Orders:', Number(kpis.validOrderCount !== undefined ? kpis.validOrderCount : (kpis.completedOrders || 0)), 'AOV (PKR):', Number((kpis.averageOrderValue || 0).toFixed(2)), 'Items Sold:', Number(kpis.itemsSold || 0), 'Discounts (PKR):', Number((kpis.discountsGiven || 0).toFixed(2)), '', ''],
    [],
    ['--- 2. DETAILED TRANSACTIONS LEDGER ---', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['Invoice #', 'Date / Time', 'Order Type', 'Category', 'Payment', 'Items', 'Gross Sales', 'Net Revenue', 'Tax', 'Status', 'Valid Net', 'Valid Gross', 'Valid Items', 'Valid Discount'],
    ...orders.map((o) => {
      const isReversed = o.status === 'reversed';
      const itemsCount = (o.lines || []).reduce((q, l) => q + (Number(l.quantity) || 1), 0);
      const grossVal = Number(o.grandTotal) || 0;
      const netVal = Number(o.subtotal) || 0;
      const taxVal = Number(o.taxAmount) || 0;
      const discVal = Number(o.discountAmount) || 0;

      return [
        o.invoiceNumber || o.id,
        formatExcelDateTime(o.completedAt || o.createdAt || Date.now()),
        o.orderType || 'Dine-In',
        (o.lines && o.lines[0]?.categoryName) || 'General',
        o.paymentMethod || 'Cash',
        itemsCount,
        grossVal,
        netVal,
        taxVal,
        isReversed ? 'Reversed' : 'Active',
        isReversed ? 0 : netVal,
        isReversed ? 0 : grossVal,
        isReversed ? 0 : itemsCount,
        isReversed ? 0 : discVal,
      ];
    }),
  ];

  const filename = `Sales_Report_${dateScope.replace(/\s+/g, '_')}_${Date.now()}`;
  exportReportToCsv(filename, rows);
}

export function exportRevenueReportCsv({ kpis = {}, paymentBreakdown = [], taxBreakdown = {}, discountBreakdown = {}, filters = {}, settings = {} }) {
  const restName = settings?.business?.name || settings?.restaurantName || 'SpiceHub Restaurant & Grill';
  const dateStr = formatExcelDateTime(Date.now());
  const dateScope = filters.datePreset || 'This Week';

  const rows = [
    ['RESTAURANT FINANCIAL REVENUE & TAX AUDIT STATEMENT', '', '', '', ''],
    ['Business Name:', restName, 'Scope:', dateScope, 'Generated:', dateStr],
    [],
    ['--- 1. REVENUE & EARNINGS SUMMARY ---', '', '', '', ''],
    ['Line #', 'Financial Metric Head', 'Amount (PKR)', 'Classification', 'Accounting Notes'],
    [1, 'Gross Billed Customer Volume', Number((kpis.grossBilled || 0).toFixed(2)), 'Gross Turnover', 'Total sales billed before deductions'],
    [2, 'Total Discounts Allowed', Number((kpis.totalDiscounts || 0).toFixed(2)), 'Revenue Contra', 'Promotional & discretionary deductions'],
    [3, 'Sales Tax Collected (Output)', Number((kpis.taxCollected || 0).toFixed(2)), 'Statutory Liability', 'Sales tax collected for tax authority'],
    [4, 'Transaction Reversals (Incl Tax)', Number((kpis.reversalsIncludingTax || 0).toFixed(2)), 'Void / Cancellation', 'Refunded transactions & voided tickets'],
    [5, 'Net Realized Operating Revenue', Number((kpis.netRevenue || 0).toFixed(2)), 'Net Revenue', 'Gross minus Tax, Discounts & Reversals'],
    [6, 'Average Net Revenue Per Valid Order', Number((kpis.avgNetRevenuePerOrder || 0).toFixed(2)), 'Yield Efficiency', 'Average net yield per valid order'],
    [],
    ['--- 2. PAYMENT TENDER RECONCILIATION ---', '', '', '', ''],
    ['Payment Tender', 'Billed Volume (PKR)', 'Transactions Count', 'Volume Share (%)', ''],
    ...paymentBreakdown.map((p) => [
      p.method,
      Number((p.amount || 0).toFixed(2)),
      Number(p.count || 0),
      `${p.percentage}%`,
      '',
    ]),
  ];

  const filename = `Revenue_Report_${dateScope.replace(/\s+/g, '_')}_${Date.now()}`;
  exportReportToCsv(filename, rows);
}

export function exportReversalReportCsv({ reversals = [], kpis = {}, filters = {}, settings = {} }) {
  const restName = settings?.business?.name || settings?.restaurantName || 'SpiceHub Restaurant & Grill';
  const dateStr = formatExcelDateTime(Date.now());
  const dateScope = filters.datePreset || 'This Week';

  const rows = [
    ['TRANSACTION REVERSAL & AUDIT REGISTER', '', '', '', '', '', '', '', '', ''],
    ['Business Name:', restName, 'Date Scope:', dateScope, 'Generated:', dateStr, '', '', '', ''],
    [],
    ['--- 1. REVERSAL FINANCIAL IMPACT SUMMARY ---', '', '', '', '', '', '', '', '', ''],
    ['Reversal Count:', Number(kpis.reversalCount || 0), 'Subtotal Reversed (PKR):', Number((kpis.reversedSubtotal || 0).toFixed(2)), 'Discounts Reversed (PKR):', Number((kpis.reversedDiscountImpact || 0).toFixed(2)), 'Tax Reversed (PKR):', Number((kpis.reversedTax || 0).toFixed(2)), 'Total Reversed (PKR):', Number((kpis.reversalTotalIncludingTax || 0).toFixed(2)), '', '', '', '', ''],
    [],
    ['--- 2. REVERSAL AUDIT RECORDS ---', '', '', '', '', '', '', '', '', ''],
    ['Reversal ID', 'Original Invoice #', 'Date / Time', 'Reason / Justification', 'Subtotal (PKR)', 'Discount (PKR)', 'Tax (PKR)', 'Total Reversed (PKR)', 'Status', 'Authorized Staff'],
    ...reversals.map((r) => [
      r.id,
      r.originalInvoiceNumber,
      formatExcelDateTime(r.reversedAt || r.createdAt || Date.now()),
      r.reason || 'N/A',
      Number((Number(r.subtotalReversed) || 0).toFixed(2)),
      Number((Number(r.discountReversed) || 0).toFixed(2)),
      Number((Number(r.taxReversed) || 0).toFixed(2)),
      Number((Number(r.totalReversedIncludingTax) || 0).toFixed(2)),
      'Reversed',
      r.reversedBy || 'Staff',
    ]),
  ];

  const filename = `Reversals_Report_${dateScope.replace(/\s+/g, '_')}_${Date.now()}`;
  exportReportToCsv(filename, rows);
}

export function exportProfitReportCsv({ itemRows = [], kpis = {}, filters = {}, settings = {} }) {
  const restName = settings?.business?.name || settings?.restaurantName || 'SpiceHub Restaurant & Grill';
  const dateStr = formatExcelDateTime(Date.now());
  const dateScope = filters.datePreset || 'This Week';

  const rows = [
    ['PROFIT & COST REPORT (COGS & GROSS PROFIT AUDIT)', '', '', '', '', '', '', ''],
    ['Business Name:', restName, 'Date Scope:', dateScope, 'Generated:', dateStr, '', ''],
    [],
    ['--- 1. PROFITABILITY KPI SUMMARY ---', '', '', '', '', '', '', ''],
    ['Net Sales (PKR):', Number(kpis.netSales || 0), 'COGS (PKR):', Number(kpis.cogs || 0), 'Gross Profit (PKR):', Number(kpis.grossProfit || 0), 'Profit Margin (%):', `${kpis.grossProfitMargin || 0}%`],
    ...(kpis.hasMissingCosts ? [['Missing Cost Items Warning:', `${kpis.missingCostCount} items missing cost`, '', '', '', '', '', '']] : []),
    [],
    ['--- 2. ITEM-WISE PROFIT & COST BREAKDOWN ---', '', '', '', '', '', '', ''],
    ['Item', 'Category', 'Qty / Weight Sold', 'Valid Invoices', 'Net Sales (PKR)', 'COGS (PKR)', 'Gross Profit (PKR)', 'Profit Margin (%)'],
    ...itemRows.map((r) => [
      r.name,
      r.category,
      r.qtyWeightDisplay,
      r.validInvoices,
      r.netSales,
      r.hasCost && r.cogs !== null ? r.cogs : 'Cost Missing',
      r.hasCost && r.grossProfit !== null ? r.grossProfit : 'Unavailable',
      r.hasCost && r.margin !== null ? `${r.margin}%` : 'N/A',
    ]),
    [],
    ['TOTAL', '', '', '', Number(kpis.netSales || 0), Number(kpis.cogs || 0), Number(kpis.grossProfit || 0), `${kpis.grossProfitMargin || 0}%`],
  ];

  const filename = `Profit_Cost_Report_${dateScope.replace(/\s+/g, '_')}_${Date.now()}`;
  exportReportToCsv(filename, rows);
}

export function downloadReportPdf({
  reportType = 'Sales',
  kpis = {},
  filters = {},
  settings = {},
  statement = null,
  itemRows = [],
  user = {},
  canViewCosts = true,
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = margin;

  const restaurantName = settings?.business?.name || settings?.restaurantName || 'SpiceHub Restaurant & Grill';

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(11, 25, 44);
  doc.text(restaurantName, pageWidth / 2, y, { align: 'center' });
  y += 5.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`${reportType} Report • Period: ${filters.datePreset || 'All Dates'}`, pageWidth / 2, y, { align: 'center' });
  y += 4.5;
  const genUser = user?.name || user?.username || 'Authorized Staff';
  doc.text(`Generated on ${new Date().toLocaleString()} by ${genUser}`, pageWidth / 2, y, { align: 'center' });
  y += 6;

  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // If this is Financial Summary with statement object
  if (reportType === 'Financial Summary' && statement) {
    // Statement Sections
    const printSectionHeader = (title) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(255, 92, 40); // Orange
      doc.text(title, margin, y);
      y += 5;
    };

    const printLine = (label, val, isBold = false, isIndented = true, isCurrency = true) => {
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(isBold ? 15 : 71, isBold ? 23 : 85, isBold ? 42 : 105);
      doc.text(label, margin + (isIndented ? 4 : 0), y);
      const valStr = isCurrency && typeof val === 'number'
        ? formatCurrency(val)
        : String(val);
      doc.text(valStr, pageWidth - margin, y, { align: 'right' });
      y += 4.5;
    };

    // 1. REVENUE
    printSectionHeader('REVENUE');
    printLine('Gross Sales', statement.grossSales);
    printLine('Less: Discounts', Number(statement.discounts) > 0 ? `-${formatCurrency(statement.discounts)}` : 'Rs 0', false, true, false);
    printLine('Less: Reversals Effect', Number(statement.reversalEffect) > 0 ? `-${formatCurrency(statement.reversalEffect)}` : 'Rs 0', false, true, false);
    doc.setDrawColor(203, 213, 225);
    doc.line(margin + 4, y, pageWidth - margin, y);
    y += 2;
    printLine('NET REVENUE', statement.netRevenue, true, false);
    y += 2;

    // 2. COST OF SALES & GROSS PROFIT (Admin only)
    if (canViewCosts) {
      printSectionHeader('COST OF SALES (COGS)');
      printLine('Food / Item Cost', statement.foodCOGS);
      printLine('Add-on Cost', statement.addonCOGS);
      printLine('Deal Cost', statement.dealCOGS);
      doc.line(margin + 4, y, pageWidth - margin, y);
      y += 2;
      printLine('TOTAL COGS', statement.totalCOGS, true, false);
      y += 2;

      printSectionHeader('GROSS PROFIT');
      printLine('Gross Profit (Net Revenue - Total COGS)', statement.grossProfit, true, false);
      printLine('Gross Margin %', `${statement.grossProfitMargin}%`, true, false, false);
      y += 2;
    }

    // 3. TAX SUMMARY
    printSectionHeader('TAX SUMMARY');
    printLine('Tax Collected (Excluded from revenue & profit)', statement.taxCollected, true, false);
    y += 2;

    // 4. PAYMENT COLLECTION
    printSectionHeader('PAYMENT COLLECTION');
    printLine('Cash', statement.cashTotal);
    printLine('Card', statement.cardTotal);
    printLine('Online', statement.onlineTotal);
    if (statement.otherTotal > 0) {
      printLine('Other', statement.otherTotal);
    }
    doc.line(margin + 4, y, pageWidth - margin, y);
    y += 2;
    printLine('TOTAL COLLECTED', statement.totalCollected, true, false);
    y += 4;

    // 5. ITEM PROFITABILITY SUMMARY TABLE (Top 15 items if space permits)
    if (Array.isArray(itemRows) && itemRows.length > 0 && y < pageHeight - 35) {
      printSectionHeader('ITEM PROFITABILITY SUMMARY');
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y, pageWidth - margin * 2, 5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);

      doc.text('Item', margin + 2, y + 3.5);
      doc.text('Category', margin + 45, y + 3.5);
      doc.text('Qty/Wt', margin + 75, y + 3.5);
      doc.text('Net Sales', margin + 105, y + 3.5, { align: 'right' });
      if (canViewCosts) {
        doc.text('COGS', margin + 135, y + 3.5, { align: 'right' });
        doc.text('Profit', margin + 158, y + 3.5, { align: 'right' });
        doc.text('Margin', pageWidth - margin - 2, y + 3.5, { align: 'right' });
      }
      y += 6;

      const topItems = itemRows.slice(0, 18);
      topItems.forEach((item) => {
        if (y > pageHeight - 15) return;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);

        const truncName = item.name.length > 20 ? `${item.name.substring(0, 19)}…` : item.name;
        doc.text(truncName, margin + 2, y + 3);
        doc.text(item.category || '', margin + 45, y + 3);
        doc.text(item.qtyWeightDisplay || `${item.qtySold} pcs`, margin + 75, y + 3);
        doc.text(formatCurrency(item.netSales), margin + 105, y + 3, { align: 'right' });

        if (canViewCosts) {
          const cogsStr = item.hasCost && item.cogs !== null ? formatCurrency(item.cogs) : 'Missing';
          const profStr = item.hasCost && item.grossProfit !== null ? formatCurrency(item.grossProfit) : 'N/A';
          const marginStr = item.hasCost && item.margin !== null ? `${item.margin}%` : '—';

          doc.text(cogsStr, margin + 135, y + 3, { align: 'right' });
          doc.text(profStr, margin + 158, y + 3, { align: 'right' });
          doc.text(marginStr, pageWidth - margin - 2, y + 3, { align: 'right' });
        }
        y += 4.2;
      });
    }
  } else {
    // Standard KPI list fallback
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(234, 88, 12);
    doc.text('Key Performance Indicators', margin, y);
    y += 7;

    doc.setFontSize(9);
    Object.entries(kpis).forEach(([key, val]) => {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
      doc.text(label, margin + 4, y);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      const valText = typeof val === 'number' && key.toLowerCase().includes('count')
        ? formatNumber(val)
        : typeof val === 'number'
        ? formatCurrency(val)
        : String(val);

      doc.text(valText, pageWidth - margin - 4, y, { align: 'right' });
      y += 6;
    });
  }

  y = Math.min(pageHeight - 8, y + 5);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Report generated directly from canonical transaction ledger snapshots. Tax is excluded from revenue.', pageWidth / 2, y, { align: 'center' });

  const safeFilename = `Financial_Summary_${(filters.datePreset || 'Report').replace(/\s+/g, '_')}_${Date.now()}.pdf`;
  doc.save(safeFilename);
}

// =========================================================================
// 5. FINANCIAL SUMMARY EXCEL EXPORT (Chartered Accountant VIP Format)
// =========================================================================

export async function exportFinancialSummaryExcel({
  statement = {},
  itemRows = [],
  filters = {},
  settings = {},
  user = {},
  canViewCosts = true,
}) {
  const restaurantName = settings?.business?.name || settings?.restaurantName || 'SpiceHub Restaurant & Grill';
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SpiceHub POS System';
  workbook.created = new Date();

  const ws = workbook.addWorksheet('Financial Summary', {
    views: [{ showGridLines: true }],
  });

  const numCols = canViewCosts ? 7 : 4;
  ws.columns = [
    { key: 'colA', width: 28 }, // Item / Section
    { key: 'colB', width: 18 }, // Category / Detail
    { key: 'colC', width: 16 }, // Qty / Weight
    { key: 'colD', width: 18 }, // Net Sales
    ...(canViewCosts
      ? [
          { key: 'colE', width: 18 }, // COGS
          { key: 'colF', width: 18 }, // Gross Profit
          { key: 'colG', width: 16 }, // Margin %
        ]
      : []),
  ];

  const lastColLetter = canViewCosts ? 'G' : 'D';

  // 1. Title Banner
  ws.mergeCells(`A1:${lastColLetter}1`);
  const tCell = ws.getCell('A1');
  tCell.value = `${restaurantName} — Financial Summary Report`;
  tCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_NAVY } };
  tCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  tCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(1).height = 26;

  ws.mergeCells(`A2:${lastColLetter}2`);
  const sCell = ws.getCell('A2');
  sCell.value = 'Professional Profit & Loss Statement & Item Profitability Ledger • Tax Strictly Excluded from Revenue • Amounts in PKR';
  sCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_NAVY } };
  sCell.font = { name: 'Arial', size: 9.5, color: { argb: COLOR_NAVY_SUB } };
  sCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(2).height = 18;

  // 2. Metadata Audit Block
  const metaConfig = [
    { row: 4, label: 'Report Period', val: filters.datePreset || 'All Dates' },
    { row: 5, label: 'Category Filter', val: filters.category || 'All Categories' },
    { row: 6, label: 'Payment Method', val: filters.paymentMethod || 'All Methods' },
    { row: 7, label: 'Generated By', val: user?.name || user?.username || 'Admin User' },
    { row: 8, label: 'Generated Date/Time', val: formatExcelDateTime(Date.now(), true) },
  ];
  metaConfig.forEach(({ row, label, val }) => {
    ws.getCell(`A${row}`).value = label;
    ws.getCell(`A${row}`).font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF334155' } };
    ws.getCell(`B${row}`).value = val;
    ws.getCell(`B${row}`).font = { name: 'Arial', size: 9.5, color: { argb: 'FF0F172A' } };
    ws.getRow(row).height = 18;
  });

  // 3. Statement Header Banner
  let curRow = 10;
  ws.mergeCells(`A${curRow}:${lastColLetter}${curRow}`);
  const stHead = ws.getCell(`A${curRow}`);
  stHead.value = 'FINANCIAL STATEMENT SUMMARY';
  stHead.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ORANGE } };
  stHead.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  stHead.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(curRow).height = 22;
  curRow += 1;

  const addStatementLine = (lineLabel, lineVal, isHeader = false, isLedgerTotal = false, isCurrency = true) => {
    const row = ws.getRow(curRow);
    row.height = isHeader ? 20 : isLedgerTotal ? 22 : 18;
    const cA = row.getCell(1);
    const cB = row.getCell(2);

    cA.value = lineLabel;
    if (isHeader) {
      cA.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF1E293B' } };
      cA.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    } else {
      cA.font = { name: 'Arial', size: 9, bold: isLedgerTotal, color: { argb: isLedgerTotal ? 'FF0F172A' : 'FF475569' } };
    }

    if (lineVal !== null && lineVal !== undefined) {
      cB.value = lineVal;
      if (isCurrency && typeof lineVal === 'number') {
        cB.numFmt = '"Rs "#,##0';
        cB.alignment = { horizontal: 'right', vertical: 'middle' };
      } else {
        cB.alignment = { horizontal: 'right', vertical: 'middle' };
      }
      cB.font = { name: 'Arial', size: 9.5, bold: isLedgerTotal, color: { argb: isLedgerTotal ? COLOR_ACTIVE_TEXT : 'FF0F172A' } };
    }

    if (isLedgerTotal) {
      cA.border = { top: { style: 'thin', color: { argb: 'FF94A3B8' } }, bottom: { style: 'double', color: { argb: 'FF0F172A' } } };
      cB.border = { top: { style: 'thin', color: { argb: 'FF94A3B8' } }, bottom: { style: 'double', color: { argb: 'FF0F172A' } } };
    }

    curRow += 1;
  };

  // REVENUE
  addStatementLine('REVENUE', null, true);
  addStatementLine('   Gross Sales', statement.grossSales);
  addStatementLine('   Less: Discounts Given', statement.discounts > 0 ? -statement.discounts : 0);
  addStatementLine('   Less: Reversal Effect', statement.reversalEffect > 0 ? -statement.reversalEffect : 0);
  addStatementLine('NET REVENUE', statement.netRevenue, false, true);

  // COST OF SALES (Admin Only)
  if (canViewCosts) {
    addStatementLine('COST OF SALES (COGS)', null, true);
    addStatementLine('   Food / Item Cost', statement.foodCOGS);
    addStatementLine('   Add-on Cost', statement.addonCOGS);
    addStatementLine('   Deal Cost', statement.dealCOGS);
    addStatementLine('TOTAL COGS', statement.totalCOGS, false, true);

    addStatementLine('GROSS PROFIT', statement.grossProfit, false, true);
    addStatementLine('   Gross Profit Margin', `${statement.grossProfitMargin || 0}%`, false, false, false);

    addStatementLine('OPERATING EXPENSES', null, true);
    (statement.operatingExpensesBreakdown || []).forEach((cat) => {
      addStatementLine(`   ${cat.category}`, cat.amount);
    });
    addStatementLine('TOTAL OPERATING EXPENSES', statement.operatingExpenses > 0 ? -statement.operatingExpenses : 0, false, true);

    addStatementLine('OPERATING PROFIT', statement.operatingProfit, false, true);
    addStatementLine('   Operating Profit Margin', `${statement.operatingProfitMargin || 0}%`, false, false, false);
  }

  // TAX SUMMARY
  addStatementLine('TAX SUMMARY', null, true);
  addStatementLine('   Tax Collected (Excluded from Revenue)', statement.taxCollected);

  // PAYMENT COLLECTION
  addStatementLine('PAYMENT COLLECTION', null, true);
  addStatementLine('   Cash Collected', statement.cashTotal);
  addStatementLine('   Card Collected', statement.cardTotal);
  addStatementLine('   Online Collected', statement.onlineTotal);
  if (statement.otherTotal > 0) {
    addStatementLine('   Other Methods', statement.otherTotal);
  }
  addStatementLine('TOTAL COLLECTED', statement.totalCollected, false, true);

  // REVERSALS & AUDIT
  addStatementLine('REVERSALS & AUDIT', null, true);
  addStatementLine('   Total Discounts', statement.totalDiscounts);
  addStatementLine('   Reversed Invoices Count', statement.reversalCount, false, false, false);
  addStatementLine('   Total Reversal Value (Incl. Tax)', statement.reversalValue);

  curRow += 2;

  // 4. ITEM PROFITABILITY TABLE
  ws.mergeCells(`A${curRow}:${lastColLetter}${curRow}`);
  const itemHead = ws.getCell(`A${curRow}`);
  itemHead.value = 'ITEM PROFITABILITY BREAKDOWN';
  itemHead.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ORANGE } };
  itemHead.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  itemHead.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(curRow).height = 22;
  curRow += 1;

  const tableHeaders = [
    'Item',
    'Category',
    'Qty / Weight Sold',
    'Net Sales',
    ...(canViewCosts ? ['COGS', 'Gross Profit', 'Profit Margin %'] : []),
  ];

  const thRow = ws.getRow(curRow);
  thRow.height = 22;
  tableHeaders.forEach((h, idx) => {
    const c = thRow.getCell(idx + 1);
    c.value = h;
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_KPI_BG } };
    c.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF334155' } };
    c.alignment = { horizontal: idx >= 3 ? 'right' : idx === 2 ? 'center' : 'left', vertical: 'middle' };
    applyCellBorder(c);
  });
  curRow += 1;

  itemRows.forEach((r) => {
    const row = ws.getRow(curRow);
    row.height = 19;

    const c1 = row.getCell(1);
    c1.value = r.name;
    c1.font = { name: 'Arial', size: 9, bold: true, color: { argb: COLOR_TEXT_DARK } };
    applyCellBorder(c1);

    const c2 = row.getCell(2);
    c2.value = r.category;
    c2.font = { name: 'Arial', size: 9, color: { argb: COLOR_TEXT_DARK } };
    applyCellBorder(c2);

    const c3 = row.getCell(3);
    c3.value = r.qtyWeightDisplay || `${r.qtySold} pcs`;
    c3.font = { name: 'Arial', size: 9 };
    c3.alignment = { horizontal: 'center', vertical: 'middle' };
    applyCellBorder(c3);

    const c4 = row.getCell(4);
    c4.value = Number(r.netSales) || 0;
    c4.numFmt = '"Rs "#,##0';
    c4.font = { name: 'Arial', size: 9 };
    c4.alignment = { horizontal: 'right', vertical: 'middle' };
    applyCellBorder(c4);

    if (canViewCosts) {
      const c5 = row.getCell(5);
      if (r.hasCost && r.cogs !== null) {
        c5.value = Number(r.cogs) || 0;
        c5.numFmt = '"Rs "#,##0';
        c5.font = { name: 'Arial', size: 9 };
        c5.alignment = { horizontal: 'right', vertical: 'middle' };
      } else {
        c5.value = 'Cost Missing';
        c5.font = { name: 'Arial', size: 8.5, italic: true, color: { argb: COLOR_REV_TEXT } };
        c5.alignment = { horizontal: 'center', vertical: 'middle' };
      }
      applyCellBorder(c5);

      const c6 = row.getCell(6);
      if (r.hasCost && r.grossProfit !== null) {
        c6.value = Number(r.grossProfit) || 0;
        c6.numFmt = '"Rs "#,##0';
        c6.font = { name: 'Arial', size: 9, bold: true, color: { argb: r.grossProfit >= 0 ? COLOR_ACTIVE_TEXT : COLOR_REV_TEXT } };
        c6.alignment = { horizontal: 'right', vertical: 'middle' };
      } else {
        c6.value = 'Unavailable';
        c6.font = { name: 'Arial', size: 8.5, italic: true, color: { argb: COLOR_REV_TEXT } };
        c6.alignment = { horizontal: 'center', vertical: 'middle' };
      }
      applyCellBorder(c6);

      const c7 = row.getCell(7);
      if (r.hasCost && r.margin !== null) {
        c7.value = `${r.margin}%`;
        c7.font = { name: 'Arial', size: 9, bold: true };
        c7.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        c7.value = 'N/A';
        c7.font = { name: 'Arial', size: 8.5, italic: true, color: { argb: COLOR_MUTED } };
        c7.alignment = { horizontal: 'center', vertical: 'middle' };
      }
      applyCellBorder(c7);
    }

    curRow += 1;
  });

  // Table Totals Row
  const totRow = ws.getRow(curRow);
  totRow.height = 22;
  for (let c = 1; c <= numCols; c += 1) {
    totRow.getCell(c).border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'double', color: { argb: COLOR_TEXT_DARK } },
    };
  }
  totRow.getCell(1).value = 'TOTAL / OVERALL';
  totRow.getCell(1).font = { name: 'Arial', size: 9.5, bold: true, color: { argb: COLOR_TEXT_DARK } };

  const cNet = totRow.getCell(4);
  cNet.value = Number(statement.netRevenue || 0);
  cNet.numFmt = '"Rs "#,##0';
  cNet.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: COLOR_TEXT_DARK } };
  cNet.alignment = { horizontal: 'right', vertical: 'middle' };

  if (canViewCosts) {
    const cCogs = totRow.getCell(5);
    cCogs.value = Number(statement.totalCOGS || 0);
    cCogs.numFmt = '"Rs "#,##0';
    cCogs.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: COLOR_TEXT_DARK } };
    cCogs.alignment = { horizontal: 'right', vertical: 'middle' };

    const cProfit = totRow.getCell(6);
    cProfit.value = Number(statement.grossProfit || 0);
    cProfit.numFmt = '"Rs "#,##0';
    cProfit.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: statement.grossProfit >= 0 ? COLOR_ACTIVE_TEXT : COLOR_REV_TEXT } };
    cProfit.alignment = { horizontal: 'right', vertical: 'middle' };

    const cMargin = totRow.getCell(7);
    cMargin.value = `${statement.grossProfitMargin || 0}%`;
    cMargin.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: COLOR_TEXT_DARK } };
    cMargin.alignment = { horizontal: 'center', vertical: 'middle' };
  }

  const filename = `Financial_Summary_${(filters.datePreset || 'All_Dates').replace(/\s+/g, '_')}_${Date.now()}`;
  await saveWorkbook(workbook, filename);
}

export function exportFinancialSummaryCsv({
  statement = {},
  itemRows = [],
  filters = {},
  settings = {},
  user = {},
  canViewCosts = true,
}) {
  const restaurantName = settings?.business?.name || settings?.restaurantName || 'SpiceHub Restaurant & Grill';
  const rows = [
    [restaurantName, 'Financial Summary Report'],
    ['Report Period', filters.datePreset || 'All Dates'],
    ['Generated By', user?.name || user?.username || 'Admin'],
    ['Generated Date/Time', new Date().toLocaleString()],
    [],
    ['STATEMENT SECTION', 'AMOUNT (PKR)'],
    ['Gross Sales', statement.grossSales || 0],
    ['Less: Discounts', statement.discounts ? `-${statement.discounts}` : 0],
    ['Less: Reversal Effect', statement.reversalEffect ? `-${statement.reversalEffect}` : 0],
    ['NET REVENUE', statement.netRevenue || 0],
    ...(canViewCosts
      ? [
          ['Food / Item COGS', statement.foodCOGS || 0],
          ['Add-on COGS', statement.addonCOGS || 0],
          ['Deal COGS', statement.dealCOGS || 0],
          ['TOTAL COGS', statement.totalCOGS || 0],
          ['GROSS PROFIT', statement.grossProfit || 0],
          ['GROSS PROFIT MARGIN %', `${statement.grossProfitMargin || 0}%`],
          ['TOTAL OPERATING EXPENSES', statement.operatingExpenses ? `-${statement.operatingExpenses}` : 0],
          ['OPERATING PROFIT', statement.operatingProfit || 0],
          ['OPERATING PROFIT MARGIN %', `${statement.operatingProfitMargin || 0}%`],
        ]
      : []),
    ['Tax Collected', statement.taxCollected || 0],
    ['Cash Collected', statement.cashTotal || 0],
    ['Card Collected', statement.cardTotal || 0],
    ['Online Collected', statement.onlineTotal || 0],
    ['TOTAL COLLECTED', statement.totalCollected || 0],
    ['Total Discounts Given', statement.totalDiscounts || 0],
    ['Reversal Count', statement.reversalCount || 0],
    ['Reversal Value', statement.reversalValue || 0],
    [],
    [
      'Item',
      'Category',
      'Qty / Weight Sold',
      'Net Sales',
      ...(canViewCosts ? ['COGS', 'Gross Profit', 'Profit Margin %'] : []),
    ],
  ];

  itemRows.forEach((r) => {
    rows.push([
      r.name,
      r.category,
      r.qtyWeightDisplay || `${r.qtySold} pcs`,
      r.netSales,
      ...(canViewCosts
        ? [
            r.hasCost && r.cogs !== null ? r.cogs : 'Cost Missing',
            r.hasCost && r.grossProfit !== null ? r.grossProfit : 'Unavailable',
            r.hasCost && r.margin !== null ? `${r.margin}%` : 'N/A',
          ]
        : []),
    ]);
  });

  const filename = `Financial_Summary_${(filters.datePreset || 'All_Dates').replace(/\s+/g, '_')}_${Date.now()}`;
  exportReportToCsv(filename, rows);
}

