import { describe, it, expect } from 'vitest';
import {
  deriveFinancialSummaryReport,
  groupFinancialTrendByDate,
} from './reportSelectors';
import { getDateIntervalForPreset } from './dashboardSelectors';

describe('Financial Summary / Profit & Loss Report Suite', () => {
  // Master Catalog Fixtures
  const masterItems = [
    { id: 'item-biryani', name: 'Chicken Biryani', category: 'Biryani', basePrice: 400, costPrice: 220 },
    { id: 'item-burger', name: 'Beef Burger', category: 'Burgers', basePrice: 300, costPrice: 150 },
    { id: 'item-karahi', name: 'Chicken Karahi', category: 'Karahi & Handi', basePrice: 1600, costPrice: 900, pricingMode: 'portion' },
    { id: 'item-coke', name: 'Cold Drink Can', category: 'Beverages', basePrice: 100, costPrice: 60 },
  ];

  const masterAddons = [
    { id: 'addon-cheese', name: 'Extra Cheese', price: 60, costPrice: 25 },
    { id: 'addon-raita', name: 'Mint Raita', price: 50, costPrice: 15 },
  ];

  // Order 1: Completed standard item + addon with discount and tax
  // Lines: Biryani (2 qty @ 400 = 800) + Raita (2 qty @ 25 = 50) => Line Subtotal 850
  // Discount: 50 => Taxable: 800 => Tax (16%): 128 => GrandTotal: 928
  // Net Revenue = 928 - 128 = 800 (or 850 - 50 = 800)
  // Historical Snapshots: Biryani cost = 200/ea (x2 = 400), Raita cost = 15/ea (x2 = 30) => Total COGS = 430
  const order1 = {
    id: 'ord-101',
    invoiceNumber: 'INV-0101',
    status: 'completed',
    paymentMethod: 'Cash',
    orderType: 'Dine-In',
    completedAt: '2026-10-10T12:00:00.000Z',
    createdAt: '2026-10-10T12:00:00.000Z',
    subtotal: 850,
    discountAmount: 50,
    taxableAmount: 800,
    taxAmount: 128,
    grandTotal: 928,
    lines: [
      {
        id: 'l-1',
        itemId: 'item-biryani',
        itemNameSnapshot: 'Chicken Biryani',
        categoryNameSnapshot: 'Biryani',
        quantity: 2,
        unitPrice: 400,
        lineSubtotal: 850,
        costPriceSnapshot: 200,
        addonSnapshots: [
          { id: 'addon-raita', name: 'Mint Raita', price: 25, costPrice: 15, quantity: 1 },
        ],
      },
    ],
  };

  // Order 2: Completed weight-based item (Chicken Karahi, 500g half kg)
  // Price: 800 (from 1600/kg). Cost Snapshot: 900/kg => 500g cost = 450
  // Tax (16%): 128 => Grand Total: 928. Payment: Card
  // Net Revenue = 800. Total COGS = 450. Gross Profit = 350. Margin = 43.75%
  const order2 = {
    id: 'ord-102',
    invoiceNumber: 'INV-0102',
    status: 'completed',
    paymentMethod: 'Card',
    orderType: 'Takeaway',
    completedAt: '2026-10-10T14:30:00.000Z',
    createdAt: '2026-10-10T14:30:00.000Z',
    subtotal: 800,
    discountAmount: 0,
    taxableAmount: 800,
    taxAmount: 128,
    grandTotal: 928,
    lines: [
      {
        id: 'l-2',
        itemId: 'item-karahi',
        itemNameSnapshot: 'Chicken Karahi',
        categoryNameSnapshot: 'Karahi & Handi',
        pricingMode: 'portion',
        selectedWeightGrams: 500,
        selectedPortionLabel: '500g (Half)',
        quantity: 1,
        unitPrice: 800,
        lineSubtotal: 800,
        costPriceSnapshot: 900, // per kg snapshot
      },
    ],
  };

  // Order 3: Deal Order
  // Deal: Burger + Coke combo @ 350 (Gross 350).
  // Cost: Burger comp 150 + Coke comp 60 = 210.
  // Tax: 56 => Grand Total: 406. Payment: Online
  // Net Revenue = 350. COGS = 210. Gross Profit = 140. Margin = 40.0%
  const order3 = {
    id: 'ord-103',
    invoiceNumber: 'INV-0103',
    status: 'completed',
    paymentMethod: 'Online',
    orderType: 'Dine-In',
    completedAt: '2026-10-11T16:00:00.000Z',
    createdAt: '2026-10-11T16:00:00.000Z',
    subtotal: 350,
    discountAmount: 0,
    taxableAmount: 350,
    taxAmount: 56,
    grandTotal: 406,
    lines: [
      {
        id: 'l-3',
        itemId: 'deal-combo',
        itemNameSnapshot: 'Burger Combo Deal',
        categoryNameSnapshot: 'Deals',
        isDeal: true,
        quantity: 1,
        unitPrice: 350,
        lineSubtotal: 350,
        costPriceSnapshot: 210,
        includedItems: [
          { itemId: 'item-burger', name: 'Beef Burger', quantity: 1, costPrice: 150, sellingPrice: 300 },
          { itemId: 'item-coke', name: 'Cold Drink Can', quantity: 1, costPrice: 60, sellingPrice: 100 },
        ],
      },
    ],
  };

  // Order 4: Completed then REVERSED sale
  // Subtotal: 600, Discount: 100 => Net: 500 => Tax: 80 => Grand: 580
  const order4Reversed = {
    id: 'ord-104',
    invoiceNumber: 'INV-0104',
    status: 'reversed',
    paymentMethod: 'Cash',
    orderType: 'Dine-In',
    completedAt: '2026-10-12T18:00:00.000Z',
    createdAt: '2026-10-12T18:00:00.000Z',
    subtotal: 600,
    discountAmount: 100,
    taxableAmount: 500,
    taxAmount: 80,
    grandTotal: 580,
    lines: [
      {
        id: 'l-4',
        itemId: 'item-burger',
        itemNameSnapshot: 'Beef Burger',
        categoryNameSnapshot: 'Burgers',
        quantity: 2,
        unitPrice: 300,
        lineSubtotal: 600,
        costPriceSnapshot: 150,
      },
    ],
  };

  const reversal4 = {
    id: 'rev-401',
    originalOrderId: 'ord-104',
    originalInvoiceNumber: 'INV-0104',
    reversedAt: '2026-10-12T18:30:00.000Z',
    subtotalReversed: 600,
    discountReversed: 100,
    taxReversed: 80,
    totalReversedIncludingTax: 580,
    reason: 'Customer Cancelled',
  };

  // Order 5: Item with MISSING historical cost snapshot
  // Subtotal: 200, Tax: 32 => Grand: 232. Payment: Cash
  const order5MissingCost = {
    id: 'ord-105',
    invoiceNumber: 'INV-0105',
    status: 'completed',
    paymentMethod: 'Cash',
    orderType: 'Takeaway',
    completedAt: '2026-10-13T11:00:00.000Z',
    createdAt: '2026-10-13T11:00:00.000Z',
    subtotal: 200,
    discountAmount: 0,
    taxableAmount: 200,
    taxAmount: 32,
    grandTotal: 232,
    lines: [
      {
        id: 'l-5',
        itemId: 'item-special',
        itemNameSnapshot: 'Chef Secret Platter',
        categoryNameSnapshot: 'Specials',
        quantity: 1,
        unitPrice: 200,
        lineSubtotal: 200,
        costPriceSnapshot: null, // MISSING
        costPrice: null,
      },
    ],
  };

  const allOrders = [order1, order2, order3, order4Reversed, order5MissingCost];
  const allReversals = [reversal4];

  it('1. Net Revenue strictly excludes Tax and reconciles: Gross Sales - Discounts - Reversal Effect === Net Revenue', () => {
    const report = deriveFinancialSummaryReport(allOrders, allReversals, { datePreset: 'All Dates' }, masterItems, masterAddons);
    const { statement } = report;

    // Gross Sales = Sum of all 5 completed orders' subtotals (850 + 800 + 350 + 600 + 200) = 2800
    expect(statement.grossSales).toBe(2800);

    // Total Discounts = 50 (Order 1) + 100 (Order 4) = 150
    expect(statement.discounts).toBe(150);

    // Valid Non-reversed orders: Order 1 (Net 800), Order 2 (Net 800), Order 3 (Net 350), Order 5 (Net 200) => Net Revenue = 2150
    expect(statement.netRevenue).toBe(2150);

    // Reversal Effect on Net Revenue = Gross (600) - Disc (100) = 500
    expect(statement.reversalEffect).toBe(500);

    // Mathematical identity: Gross Sales - Discounts - Reversal Effect === Net Revenue
    expect(statement.grossSales - statement.discounts - statement.reversalEffect).toBe(statement.netRevenue);
  });

  it('2. Tax is strictly separated and NOT included in Net Revenue, COGS, Profit, or Margins', () => {
    const report = deriveFinancialSummaryReport(allOrders, allReversals, { datePreset: 'All Dates' }, masterItems, masterAddons);
    const { statement } = report;

    // Stored Tax on valid orders: Order 1 (128) + Order 2 (128) + Order 3 (56) + Order 5 (32) = 344
    expect(statement.taxCollected).toBe(344);

    // Total Collected = Net Revenue (2150) + Tax Collected (344) = 2494
    expect(statement.totalCollected).toBe(2494);
    expect(statement.totalCollected).toBe(statement.netRevenue + statement.taxCollected);
  });

  it('3. Separates Food COGS, Add-on COGS, and Deal COGS using historical sale snapshots', () => {
    const report = deriveFinancialSummaryReport(allOrders, allReversals, { datePreset: 'All Dates' }, masterItems, masterAddons);
    const { statement } = report;

    // Order 1: Biryani Food COGS = 200 * 2 = 400. Raita Add-on COGS = 15 * 2 = 30.
    // Order 2: Karahi portion COGS = (500g / 1000g) * 900 = 450.
    // Total Food COGS = 400 + 450 = 850.
    expect(statement.foodCOGS).toBe(850);

    // Total Add-on COGS = 30.
    expect(statement.addonCOGS).toBe(30);

    // Order 3: Deal COGS = 210.
    expect(statement.dealCOGS).toBe(210);

    // Total COGS = 850 + 30 + 210 = 1090.
    expect(statement.totalCOGS).toBe(1090);
  });

  it('4. Handles missing historical costs safely by flagging incomplete instead of assuming zero', () => {
    const report = deriveFinancialSummaryReport(allOrders, allReversals, { datePreset: 'All Dates' }, masterItems, masterAddons);
    const { statement, itemRows } = report;

    expect(statement.hasIncompleteCosts).toBe(true);
    expect(statement.missingCostCount).toBeGreaterThanOrEqual(1);

    const missingItem = itemRows.find((r) => r.name === 'Chef Secret Platter');
    expect(missingItem).toBeDefined();
    expect(missingItem.hasCost).toBe(false);
    expect(missingItem.cogs).toBeNull();
    expect(missingItem.grossProfit).toBeNull();
    expect(missingItem.margin).toBeNull();
  });

  it('5. Gross Profit and Margin calculations are safe against zero revenue without NaN/Infinity', () => {
    const report = deriveFinancialSummaryReport(allOrders, allReversals, { datePreset: 'All Dates' }, masterItems, masterAddons);
    const { statement } = report;

    // Gross Profit = Net Revenue (2150) - Total COGS (1090) = 1060
    expect(statement.grossProfit).toBe(1060);

    // Margin = (1060 / 2150) * 100 = 49.3%
    expect(statement.grossProfitMargin).toBe(49.3);

    // Test zero revenue edge case
    const emptyReport = deriveFinancialSummaryReport([], [], { datePreset: 'All Dates' });
    expect(emptyReport.statement.netRevenue).toBe(0);
    expect(emptyReport.statement.grossProfit).toBe(0);
    expect(emptyReport.statement.grossProfitMargin).toBe(0);
    expect(isNaN(emptyReport.statement.grossProfitMargin)).toBe(false);
    expect(isFinite(emptyReport.statement.grossProfitMargin)).toBe(true);
  });

  it('6. Payment breakdown reconciles with valid completed transactions', () => {
    const report = deriveFinancialSummaryReport(allOrders, allReversals, { datePreset: 'All Dates' }, masterItems, masterAddons);
    const { statement } = report;

    // Valid orders:
    // Order 1 (Cash): 928
    // Order 5 (Cash): 232 => Total Cash = 1160
    expect(statement.cashTotal).toBe(1160);

    // Order 2 (Card): 928 => Total Card = 928
    expect(statement.cardTotal).toBe(928);

    // Order 3 (Online): 406 => Total Online = 406
    expect(statement.onlineTotal).toBe(406);

    // Total Collected = 1160 + 928 + 406 = 2494
    expect(statement.totalCollected).toBe(2494);
  });

  it('7. Item Profitability Table totals reconcile with report statement totals', () => {
    const report = deriveFinancialSummaryReport(allOrders, allReversals, { datePreset: 'All Dates' }, masterItems, masterAddons);
    const { itemRows, statement } = report;

    // Sum of primary row net sales === Statement Net Revenue
    const tableNetSales = itemRows.reduce((sum, r) => sum + r.netSales, 0);
    expect(tableNetSales).toBe(statement.netRevenue);

    // Sum of primary row COGS === Statement Total COGS
    const tableCOGS = itemRows.reduce((sum, r) => sum + (r.cogs || 0), 0);
    expect(tableCOGS).toBe(statement.totalCOGS);

    // Items with verified costs have exact gross profit = 860
    const validCostItemsProfit = itemRows
      .filter((r) => r.hasCost && r.grossProfit !== null)
      .reduce((sum, r) => sum + r.grossProfit, 0);
    expect(validCostItemsProfit).toBe(860);

    // When all orders have complete cost snapshots, table profit reconciles 100% with statement.grossProfit
    const completeOrders = [order1, order2, order3];
    const completeReport = deriveFinancialSummaryReport(completeOrders, [], { datePreset: 'All Dates' }, masterItems, masterAddons);
    const completeTableProfit = completeReport.itemRows.reduce((sum, r) => sum + (r.grossProfit || 0), 0);
    expect(completeTableProfit).toBe(completeReport.statement.grossProfit);
  });

  it('8. Supports Last Week, Last Month, and Custom Date Range presets', () => {
    const ref = new Date('2026-10-17T12:00:00.000Z');

    const lastWeekInterval = getDateIntervalForPreset('Last Week', null, ref);
    expect(lastWeekInterval.label).toBe('Last Week');
    expect(lastWeekInterval.start instanceof Date).toBe(true);
    expect(lastWeekInterval.end instanceof Date).toBe(true);
    expect(lastWeekInterval.start.getTime()).toBeLessThan(lastWeekInterval.end.getTime());

    const lastMonthInterval = getDateIntervalForPreset('Last Month', null, ref);
    expect(lastMonthInterval.label).toBe('Last Month');
    expect(lastMonthInterval.start instanceof Date).toBe(true);
    expect(lastMonthInterval.end instanceof Date).toBe(true);
    expect(lastMonthInterval.start.getTime()).toBeLessThan(lastMonthInterval.end.getTime());

    const customInterval = getDateIntervalForPreset('Custom Date Range', {
      startDate: '2026-10-01',
      endDate: '2026-10-05',
    }, ref);
    expect(customInterval.label).toContain('01 Oct - 05 Oct');
  });

  it('9. Trend points provide Net Revenue, COGS, and Gross Profit per day', () => {
    const trend = groupFinancialTrendByDate(allOrders, allReversals, 'This Month', null, new Date('2026-10-17T12:00:00.000Z'), masterItems, masterAddons);
    expect(Array.isArray(trend)).toBe(true);
    expect(trend.length).toBeGreaterThan(0);
    expect(trend[0]).toHaveProperty('date');
    expect(trend[0]).toHaveProperty('label');
    expect(trend[0]).toHaveProperty('netRevenue');
    expect(trend[0]).toHaveProperty('cogs');
    expect(trend[0]).toHaveProperty('grossProfit');
  });

  it('10. Separates Total Sale, Net Revenue, Total Collected, and Outstanding Due on Partial Payment', () => {
    // Base order: Net Revenue 2020, Tax 101 => Grand Total 2121. Fully collected (balanceDue = 0).
    const baseOrder = {
      id: 'ord-base',
      invoiceNumber: 'INV-BASE',
      status: 'completed',
      paymentMethod: 'Cash',
      completedAt: '2026-10-18T10:00:00.000Z',
      subtotal: 2020,
      taxAmount: 101,
      grandTotal: 2121,
      amountReceived: 2121,
      balanceDue: 0,
      lines: [
        { id: 'lb-1', itemId: 'item-biryani', itemNameSnapshot: 'Base Dish', quantity: 5, unitPrice: 404, lineSubtotal: 2020, costPriceSnapshot: 200 }
      ]
    };

    // New partial-payment order: Item 80, Tax 4 => Grand Total 84. Customer paid 60, Due 24.
    const partialOrder = {
      id: 'ord-partial',
      invoiceNumber: 'INV-PARTIAL',
      status: 'completed',
      paymentMethod: 'Cash',
      completedAt: '2026-10-18T11:00:00.000Z',
      subtotal: 80,
      taxAmount: 4,
      grandTotal: 84,
      amountReceived: 60,
      balanceDue: 24,
      lines: [
        { id: 'lp-1', itemId: 'item-burger', itemNameSnapshot: 'Roll Snack', quantity: 1, unitPrice: 80, lineSubtotal: 80, costPriceSnapshot: 40 }
      ]
    };

    const orders = [baseOrder, partialOrder];
    const report = deriveFinancialSummaryReport(orders, [], { datePreset: 'All Dates' });
    const { statement } = report;

    // 1. Total Sale / Valid Billed must represent full invoice total (2,121 + 84 = 2,205)
    expect(statement.validBilled).toBe(2205);

    // 2. Net Revenue must be full sales value excluding tax (2,020 + 80 = 2,100) — NOT reduced by unpaid due
    expect(statement.netRevenue).toBe(2100);

    // 3. Tax Collected = 101 + 4 = 105
    expect(statement.taxCollected).toBe(105);

    // 4. Total Collected must ONLY count actual money received (2,121 + 60 = 2,181) — NOT 2,205!
    expect(statement.totalCollected).toBe(2181);

    // 5. Outstanding Due = 24
    expect(statement.totalOutstanding).toBe(24);

    // 6. Reconciliation:
    // Valid Billed === Net Revenue + Tax Collected
    expect(statement.validBilled).toBe(statement.netRevenue + statement.taxCollected);
    // Total Collected + Outstanding Due === Valid Billed
    expect(statement.totalCollected + statement.totalOutstanding).toBe(statement.validBilled);
  });

  it('11. Later Due Payment updates ONLY Total Collected and Outstanding Due without altering Revenue or Sales', () => {
    const baseOrder = {
      id: 'ord-base',
      invoiceNumber: 'INV-BASE',
      status: 'completed',
      paymentMethod: 'Cash',
      completedAt: '2026-10-18T10:00:00.000Z',
      subtotal: 2020,
      taxAmount: 101,
      grandTotal: 2121,
      amountReceived: 2121,
      balanceDue: 0,
      lines: [
        { id: 'lb-1', itemId: 'item-biryani', itemNameSnapshot: 'Base Dish', quantity: 5, unitPrice: 404, lineSubtotal: 2020, costPriceSnapshot: 200 }
      ]
    };

    // Customer later pays the remaining 24: amountReceived becomes 84, balanceDue becomes 0
    const settledOrder = {
      id: 'ord-partial',
      invoiceNumber: 'INV-PARTIAL',
      status: 'completed',
      paymentMethod: 'Cash',
      completedAt: '2026-10-18T11:00:00.000Z',
      subtotal: 80,
      taxAmount: 4,
      grandTotal: 84,
      amountReceived: 84,
      balanceDue: 0,
      lines: [
        { id: 'lp-1', itemId: 'item-burger', itemNameSnapshot: 'Roll Snack', quantity: 1, unitPrice: 80, lineSubtotal: 80, costPriceSnapshot: 40 }
      ]
    };

    const orders = [baseOrder, settledOrder];
    const report = deriveFinancialSummaryReport(orders, [], { datePreset: 'All Dates' });
    const { statement } = report;

    // Sales & Revenue remain strictly unchanged (no double counting!)
    expect(statement.validBilled).toBe(2205);
    expect(statement.netRevenue).toBe(2100);
    expect(statement.taxCollected).toBe(105);

    // Total Collected is now fully 2,205
    expect(statement.totalCollected).toBe(2205);

    // Outstanding Due is now 0
    expect(statement.totalOutstanding).toBe(0);

    // Perfect reconciliation
    expect(statement.validBilled).toBe(statement.netRevenue + statement.taxCollected);
    expect(statement.totalCollected + statement.totalOutstanding).toBe(statement.validBilled);
  });
});
