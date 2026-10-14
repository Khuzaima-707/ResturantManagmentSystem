import { describe, it, expect } from 'vitest';
import {
  getProfitAndCostReportData,
  deriveSalesReport,
  deriveRevenueReport,
  deriveReversalReport,
  getTaxBreakdown,
  getDiscountBreakdown,
  getPaymentMethodBreakdown,
  filterReportOrders,
} from './reportSelectors';
import {
  buildOrderLineSnapshots,
  calculateOrderSubtotal,
  calculateTax,
  calculateGrandTotal,
  calculateDiscount,
} from '../calculations/index';

/**
 * ==============================================================================
 * CHARTERED ACCOUNTANT (CA / CPA) FINANCIAL AUDIT & RECONCILIATION TEST SUITE
 * ==============================================================================
 * Standards Applied:
 * 1. IFRS 15: Revenue from Contracts with Customers (Performance obligations & discount allocation)
 * 2. IAS 2: Inventories / Cost of Goods Sold (Matching Principle: COGS recognized with revenue)
 * 3. Prudence / Conservatism Concept: Missing costs must never generate fictitious 100% margin
 * 4. General Ledger Reconciliation: Zero penny variance across Line Items, Tables & KPIs
 * 5. Reversal / Credit Note Accounting: Contra-revenue and economic neutrality
 * ==============================================================================
 */

describe('Chartered Accountant Audit: Financial & Cost Accounting Integrity', () => {
  const auditDate = new Date().toISOString();

  // Master Catalog for lookup
  const itemsMaster = [
    { id: 'item-burger-master', name: 'Zinger Burger', basePrice: 500, costPrice: 300, categoryName: 'Burgers' },
    { id: 'item-biryani-master', name: 'Mutton Biryani', basePrice: 1200, costPrice: 750, categoryName: 'Biryani' },
    { id: 'item-pizza-master', name: 'Fajita Pizza Large', basePrice: 1600, costPrice: 900, categoryName: 'Pizza' },
    { id: 'item-secret-master', name: 'Chef Mystery Platter', basePrice: 800, costPrice: null, categoryName: 'Special' },
  ];

  const addonsMaster = [
    { id: 'addon-cheese-master', name: 'Extra Cheese', price: 100, costPrice: 40 },
    { id: 'addon-patty-master', name: 'Double Patty', price: 200, costPrice: 90 },
    { id: 'addon-dip-master', name: 'Garlic Mayo Dip', price: 50, costPrice: 15 },
    { id: 'addon-unknown-master', name: 'Special Topping', price: 80, costPrice: null },
  ];

  // ----------------------------------------------------------------------------
  // AUDIT TEST 1: IFRS 15 Transaction Price & Matching Principle for Add-ons
  // ----------------------------------------------------------------------------
  it('Audit Test 1 [Cost Accounting]: Correctly recognizes Add-on Revenue, COGS, and Gross Profit matching principle', () => {
    // Transaction: 1 Zinger Burger (Sell: 500, Cost: 300) with Extra Cheese (Sell: 100, Cost: 40)
    // and Double Patty (Sell: 200, Cost: 90). Quantity = 2
    // Line Gross Sale = (500 + 100 + 200) * 2 = 1600
    const cartLines = [
      {
        id: 'cart-1',
        itemId: 'item-burger-master',
        itemNameSnapshot: 'Zinger Burger',
        categoryNameSnapshot: 'Burgers',
        quantity: 2,
        unitPrice: 800,
        lineSubtotal: 1600,
        costPriceSnapshot: 300,
        addonSnapshots: [
          { id: 'addon-cheese-master', name: 'Extra Cheese', price: 100, costPrice: 40 },
          { id: 'addon-patty-master', name: 'Double Patty', price: 200, costPrice: 90 },
        ],
      },
    ];

    const snapshots = buildOrderLineSnapshots(cartLines, itemsMaster, addonsMaster, 0);
    const line = snapshots[0];

    // Verification of snapshot construction
    expect(line.grossLineSale).toBe(1600);
    expect(line.itemGrossSale).toBe(1000); // 500 * 2
    expect(line.addonGrossSale).toBe(600); // (100 + 200) * 2
    expect(line.itemCOGS).toBe(600); // 300 * 2
    expect(line.addonCOGS).toBe(260); // (40 + 90) * 2 = 260
    expect(line.totalCOGS).toBe(860); // 600 + 260 = 860
    expect(line.grossProfit).toBe(740); // 1600 - 860 = 740
    expect(line.grossProfitMargin).toBe(46.25); // (740 / 1600) * 100

    // Construct completed order
    const order = {
      id: 'ord-audit-1',
      invoiceNumber: 'INV-AUDIT-001',
      status: 'completed',
      completedAt: auditDate,
      createdAt: auditDate,
      subtotal: 1600,
      discountAmount: 0,
      taxAmount: 0,
      grandTotal: 1600,
      lines: snapshots,
    };

    const report = getProfitAndCostReportData([order], [], { datePreset: 'Today' }, itemsMaster, addonsMaster);

    // There must be 3 rows: Zinger Burger, Extra Cheese, Double Patty
    expect(report.itemRows).toHaveLength(3);

    const burgerRow = report.itemRows.find((r) => r.name === 'Zinger Burger');
    const cheeseRow = report.itemRows.find((r) => r.name === 'Extra Cheese');
    const pattyRow = report.itemRows.find((r) => r.name === 'Double Patty');

    // Audit Burger Row
    expect(burgerRow.isAddon).toBe(false);
    expect(burgerRow.qtySold).toBe(2);
    expect(burgerRow.netSales).toBe(1000);
    expect(burgerRow.cogs).toBe(600);
    expect(burgerRow.grossProfit).toBe(400);
    expect(burgerRow.margin).toBe(40.0);

    // Audit Extra Cheese Row
    expect(cheeseRow.isAddon).toBe(true);
    expect(cheeseRow.category).toBe('Add-ons');
    expect(cheeseRow.qtySold).toBe(2);
    expect(cheeseRow.netSales).toBe(200); // 100 * 2
    expect(cheeseRow.cogs).toBe(80); // 40 * 2
    expect(cheeseRow.grossProfit).toBe(120);
    expect(cheeseRow.margin).toBe(60.0);

    // Audit Double Patty Row
    expect(pattyRow.isAddon).toBe(true);
    expect(pattyRow.category).toBe('Add-ons');
    expect(pattyRow.qtySold).toBe(2);
    expect(pattyRow.netSales).toBe(400); // 200 * 2
    expect(pattyRow.cogs).toBe(180); // 90 * 2
    expect(pattyRow.grossProfit).toBe(220);
    expect(pattyRow.margin).toBe(55.0);

    // Audit Reconciliation with KPIs
    expect(report.kpis.netSales).toBe(1600); // 1000 + 200 + 400
    expect(report.kpis.cogs).toBe(860); // 600 + 80 + 180
    expect(report.kpis.grossProfit).toBe(740); // 400 + 120 + 220
    expect(report.kpis.grossProfitMargin).toBe(46.25);
  });

  // ----------------------------------------------------------------------------
  // AUDIT TEST 2: IFRS 15 Relative Fair Value Discount Allocation Without Leakage
  // ----------------------------------------------------------------------------
  it('Audit Test 2 [IFRS 15 Allocation]: Allocates order discounts proportionally across items and add-ons without penny leakage', () => {
    // 2 Items in Order:
    // Item A: Fajita Pizza Large (Base: 1600, Cost: 900)
    // Item B: Zinger Burger (Base: 500, Cost: 300) + Garlic Dip (Base: 50, Cost: 15) = 550
    // Total Subtotal = 1600 + 550 = 2150
    // Order Discount = Rs 215 (10%)
    const cartLines = [
      {
        id: 'cart-line-a',
        itemId: 'item-pizza-master',
        itemNameSnapshot: 'Fajita Pizza Large',
        categoryNameSnapshot: 'Pizza',
        quantity: 1,
        unitPrice: 1600,
        lineSubtotal: 1600,
        costPriceSnapshot: 900,
      },
      {
        id: 'cart-line-b',
        itemId: 'item-burger-master',
        itemNameSnapshot: 'Zinger Burger',
        categoryNameSnapshot: 'Burgers',
        quantity: 1,
        unitPrice: 550,
        lineSubtotal: 550,
        costPriceSnapshot: 300,
        addonSnapshots: [
          { id: 'addon-dip-master', name: 'Garlic Mayo Dip', price: 50, costPrice: 15 },
        ],
      },
    ];

    const snapshots = buildOrderLineSnapshots(cartLines, itemsMaster, addonsMaster, 215);

    // Mathematical verification of line discount allocation:
    // Line A (Pizza): Math.round((1600 / 2150) * 215) = Math.round(160) = 160
    // Line B (Burger): Math.round((550 / 2150) * 215) = 215 - 160 = 55 (last line residual absorbs rounding)
    expect(snapshots[0].allocatedDiscount).toBe(160);
    expect(snapshots[1].allocatedDiscount).toBe(55);
    expect(snapshots[0].allocatedDiscount + snapshots[1].allocatedDiscount).toBe(215);

    // Pizza net revenue = 1600 - 160 = 1440
    expect(snapshots[0].netRevenue).toBe(1440);
    // Burger + Dip net revenue = 550 - 55 = 495
    expect(snapshots[1].netRevenue).toBe(495);

    const order = {
      id: 'ord-audit-discount',
      invoiceNumber: 'INV-AUDIT-002',
      status: 'completed',
      completedAt: auditDate,
      createdAt: auditDate,
      subtotal: 2150,
      discountAmount: 215,
      taxAmount: 0,
      grandTotal: 1935,
      lines: snapshots,
    };

    const report = getProfitAndCostReportData([order], [], { datePreset: 'Today' }, itemsMaster, addonsMaster);

    // Check row sum matches order net revenue exactly (1440 + 495 = 1935)
    const sumRowNetSales = report.itemRows.reduce((sum, r) => sum + r.netSales, 0);
    expect(sumRowNetSales).toBe(1935);
    expect(report.kpis.netSales).toBe(1935);

    // Check Dip add-on row received its fair share of discount:
    // Dip Gross = 50. Line B Gross = 550. Dip discount = Math.round((50/550)*55) = 5
    // Dip Net Sales = 50 - 5 = 45. Dip Cost = 15. Dip Profit = 30.
    const dipRow = report.itemRows.find((r) => r.name === 'Garlic Mayo Dip');
    expect(dipRow).toBeDefined();
    expect(dipRow.netSales).toBe(45);
    expect(dipRow.cogs).toBe(15);
    expect(dipRow.grossProfit).toBe(30);

    // Burger net sales = 495 - 45 = 450. Burger Cost = 300. Burger Profit = 150.
    const burgerRow = report.itemRows.find((r) => r.name === 'Zinger Burger');
    expect(burgerRow.netSales).toBe(450);
    expect(burgerRow.cogs).toBe(300);
    expect(burgerRow.grossProfit).toBe(150);
  });

  // ----------------------------------------------------------------------------
  // AUDIT TEST 3: Sales Tax Exclusion from Profit (Balance Sheet Liability)
  // ----------------------------------------------------------------------------
  it('Audit Test 3 [Tax Liability Separation]: Sales Tax is excluded from Net Sales, COGS, and Gross Profit', () => {
    // Sale of Rs 1,000 + 16% Tax (Rs 160) = Grand Total Rs 1,160. Cost: Rs 600.
    const orderWithTax = {
      id: 'ord-audit-tax',
      invoiceNumber: 'INV-AUDIT-TAX',
      status: 'completed',
      completedAt: auditDate,
      createdAt: auditDate,
      subtotal: 1000,
      discountAmount: 0,
      taxRateSnapshot: 16,
      taxAmount: 160,
      grandTotal: 1160,
      lines: [
        {
          itemId: 'item-biryani-master',
          itemNameSnapshot: 'Mutton Biryani',
          categoryNameSnapshot: 'Biryani',
          quantity: 1,
          unitPrice: 1000,
          grossLineSale: 1000,
          allocatedDiscount: 0,
          netRevenue: 1000,
          costPriceSnapshot: 600,
          totalCOGS: 600,
          grossProfit: 400,
          hasCost: true,
        },
      ],
    };

    const report = getProfitAndCostReportData([orderWithTax], [], { datePreset: 'Today' });

    // Net Sales must be Rs 1,000 NOT Rs 1,160!
    expect(report.kpis.netSales).toBe(1000);
    expect(report.kpis.netSales).not.toBe(1160);
    // Gross Profit must be Rs 400 NOT Rs 560!
    expect(report.kpis.cogs).toBe(600);
    expect(report.kpis.grossProfit).toBe(400);
    expect(report.kpis.grossProfitMargin).toBe(40.0);

    // Tax Breakdown selector strictly reports tax as liability
    const taxData = getTaxBreakdown([orderWithTax], []);
    expect(taxData.taxCollected).toBe(160);
    expect(taxData.netValidTax).toBe(160);
  });

  // ----------------------------------------------------------------------------
  // AUDIT TEST 4: Reversal / Credit Note Accounting (Contra-Revenue & Economic Nullification)
  // ----------------------------------------------------------------------------
  it('Audit Test 4 [Reversal Accounting]: Reversal of sale completely neutralizes revenue, cost, profit, and tax liability', () => {
    const originalOrder = {
      id: 'ord-to-reverse',
      invoiceNumber: 'INV-REV-001',
      status: 'completed',
      completedAt: auditDate,
      createdAt: auditDate,
      subtotal: 1000,
      discountAmount: 100,
      taxAmount: 144, // 16% on 900
      grandTotal: 1044,
      lines: [
        {
          itemId: 'item-pizza-master',
          itemNameSnapshot: 'Fajita Pizza Large',
          categoryNameSnapshot: 'Pizza',
          quantity: 1,
          grossLineSale: 1000,
          allocatedDiscount: 100,
          netRevenue: 900,
          totalCOGS: 500,
          grossProfit: 400,
          hasCost: true,
        },
      ],
    };

    const reversalRecord = {
      id: 'REV-AUDIT-001',
      originalOrderId: 'ord-to-reverse',
      originalInvoiceNumber: 'INV-REV-001',
      reversedAt: auditDate,
      subtotalReversed: 1000,
      discountReversed: 100,
      taxReversed: 144,
      totalReversedIncludingTax: 1044,
      reason: 'Wrong Order',
    };

    // Before reversal: Economic contribution is 900 sales, 500 cogs, 400 profit
    const preRevReport = getProfitAndCostReportData([originalOrder], [], { datePreset: 'Today' });
    expect(preRevReport.kpis.netSales).toBe(900);
    expect(preRevReport.kpis.cogs).toBe(500);
    expect(preRevReport.kpis.grossProfit).toBe(400);

    // After reversal: Economic contribution must be exactly 0
    const postRevReport = getProfitAndCostReportData([originalOrder], [reversalRecord], { datePreset: 'Today' });
    expect(postRevReport.kpis.netSales).toBe(0);
    expect(postRevReport.kpis.cogs).toBe(0);
    expect(postRevReport.kpis.grossProfit).toBe(0);
    expect(postRevReport.itemRows).toHaveLength(0);

    // Revenue Report audit
    const revReport = deriveRevenueReport([originalOrder], [reversalRecord]);
    expect(revReport.netRevenue).toBe(0);
    expect(revReport.taxCollected).toBe(0); // Tax liability eliminated
    expect(revReport.reversalsIncludingTax).toBe(1044);

    // Reversal Report audit
    const revAudit = deriveReversalReport([reversalRecord]);
    expect(revAudit.reversalCount).toBe(1);
    expect(revAudit.reversalTotalIncludingTax).toBe(1044);
    expect(revAudit.reversedTax).toBe(144);
  });

  // ----------------------------------------------------------------------------
  // AUDIT TEST 5: Conservatism Principle (Missing Cost Handling)
  // ----------------------------------------------------------------------------
  it('Audit Test 5 [Prudence Principle]: Missing Cost item does NOT generate false 100% margin and triggers warning', () => {
    const orderMissingCost = {
      id: 'ord-audit-missing-cost',
      invoiceNumber: 'INV-AUDIT-MISSING',
      status: 'completed',
      completedAt: auditDate,
      createdAt: auditDate,
      subtotal: 800,
      discountAmount: 0,
      taxAmount: 0,
      grandTotal: 800,
      lines: [
        {
          itemId: 'item-secret-master',
          itemNameSnapshot: 'Chef Mystery Platter',
          categoryNameSnapshot: 'Special',
          quantity: 1,
          grossLineSale: 800,
          allocatedDiscount: 0,
          netRevenue: 800,
          costPriceSnapshot: null,
          totalCOGS: null,
          grossProfit: null,
          hasCost: false,
        },
      ],
    };

    const report = getProfitAndCostReportData([orderMissingCost], [], { datePreset: 'Today' });

    // Must flag warning
    expect(report.kpis.hasMissingCosts).toBe(true);
    expect(report.kpis.missingCostCount).toBe(1);

    const secretRow = report.itemRows.find((r) => r.name === 'Chef Mystery Platter');
    expect(secretRow.hasCost).toBe(false);
    expect(secretRow.cogs).toBeNull();
    expect(secretRow.grossProfit).toBeNull();
    expect(secretRow.margin).toBeNull(); // Must not report 100.0%
  });

  // ----------------------------------------------------------------------------
  // AUDIT TEST 6: Zero Variance Mathematical Proof across Mixed Ledger
  // ----------------------------------------------------------------------------
  it('Audit Test 6 [Mathematical Proof]: Proves 0.00 variance between Table Rows and KPI Totals across complex mixed ledger', () => {
    // Multi-transaction mixed day:
    // Invoice 1: Fast Food with Add-ons (Burger + Cheese + Dip)
    // Invoice 2: Custom Weight Item (250g Biryani)
    // Invoice 3: Pizza with 15% discount
    // Invoice 4: Reversal invoice
    const orders = [
      {
        id: 'inv-1',
        invoiceNumber: 'INV-101',
        status: 'completed',
        completedAt: auditDate,
        createdAt: auditDate,
        subtotal: 650,
        discountAmount: 0,
        taxAmount: 0,
        grandTotal: 650,
        lines: [
          {
            itemId: 'item-burger-master',
            itemNameSnapshot: 'Zinger Burger',
            categoryNameSnapshot: 'Burgers',
            quantity: 1,
            unitPrice: 650,
            grossLineSale: 650,
            allocatedDiscount: 0,
            netRevenue: 650,
            costPriceSnapshot: 300,
            addonSnapshots: [
              { id: 'addon-cheese-master', name: 'Extra Cheese', price: 100, costPrice: 40 },
              { id: 'addon-dip-master', name: 'Garlic Mayo Dip', price: 50, costPrice: 15 },
            ],
          },
        ],
      },
      {
        id: 'inv-2',
        invoiceNumber: 'INV-102',
        status: 'completed',
        completedAt: auditDate,
        createdAt: auditDate,
        subtotal: 300,
        discountAmount: 0,
        taxAmount: 0,
        grandTotal: 300,
        lines: [
          {
            itemId: 'item-biryani-master',
            itemNameSnapshot: 'Mutton Biryani',
            categoryNameSnapshot: 'Biryani',
            pricingMode: 'custom_weight',
            quantity: 1,
            selectedWeightGrams: 250,
            unitPrice: 300,
            grossLineSale: 300,
            allocatedDiscount: 0,
            netRevenue: 300,
            costPriceSnapshot: 750, // Cost per kg = 750 -> 250g cost = (250/1000)*750 = 187.5 -> Math.round = 188
            itemCOGS: 188,
            totalCOGS: 188,
            grossProfit: 112,
            hasCost: true,
          },
        ],
      },
      {
        id: 'inv-3',
        invoiceNumber: 'INV-103',
        status: 'completed',
        completedAt: auditDate,
        createdAt: auditDate,
        subtotal: 1600,
        discountAmount: 240, // 15% discount
        taxAmount: 0,
        grandTotal: 1360,
        lines: [
          {
            itemId: 'item-pizza-master',
            itemNameSnapshot: 'Fajita Pizza Large',
            categoryNameSnapshot: 'Pizza',
            quantity: 1,
            unitPrice: 1600,
            grossLineSale: 1600,
            allocatedDiscount: 240,
            netRevenue: 1360,
            costPriceSnapshot: 900,
            totalCOGS: 900,
            grossProfit: 460,
            hasCost: true,
          },
        ],
      },
    ];

    const report = getProfitAndCostReportData(orders, [], { datePreset: 'Today' }, itemsMaster, addonsMaster);

    // 1. Line-level sum of Net Sales == KPI Net Sales
    const totalRowNetSales = report.itemRows.reduce((sum, r) => sum + r.netSales, 0);
    expect(totalRowNetSales).toBe(report.kpis.netSales);

    // 2. Line-level sum of COGS == KPI COGS
    const totalRowCOGS = report.itemRows.reduce((sum, r) => sum + (r.cogs || 0), 0);
    expect(totalRowCOGS).toBe(report.kpis.cogs);

    // 3. Line-level sum of Gross Profit == KPI Gross Profit
    const totalRowGrossProfit = report.itemRows.reduce((sum, r) => sum + (r.grossProfit || 0), 0);
    expect(totalRowGrossProfit).toBe(report.kpis.grossProfit);

    // 4. Mathematical Equation: Gross Profit === Net Sales - COGS
    expect(report.kpis.grossProfit).toBe(report.kpis.netSales - report.kpis.cogs);

    // 5. Mathematical Equation: Margin === (Gross Profit / Net Sales) * 100
    const calculatedMargin = Number(((report.kpis.grossProfit / report.kpis.netSales) * 100).toFixed(2));
    expect(report.kpis.grossProfitMargin).toBe(calculatedMargin);

    // 6. Absolute Zero Variance Audit:
    const varianceNetSales = Math.abs(totalRowNetSales - report.kpis.netSales);
    const varianceCOGS = Math.abs(totalRowCOGS - report.kpis.cogs);
    const varianceProfit = Math.abs(totalRowGrossProfit - report.kpis.grossProfit);

    expect(varianceNetSales).toBe(0);
    expect(varianceCOGS).toBe(0);
    expect(varianceProfit).toBe(0);
  });
});
