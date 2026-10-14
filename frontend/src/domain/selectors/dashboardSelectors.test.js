import { describe, it, expect } from 'vitest';
import {
  calculateGrossSales,
  calculateCompletedOrders,
  calculateNetRevenue,
  calculateReversalTotal,
  calculateAverageOrderValue,
  calculateTaxCollected,
  calculateDiscountTotal,
  calculateItemsSold,
  calculateTotalCustomers,
  calculateCustomers,
  getValidNonReversedOrders,
  deriveKPIMetrics,
  getFilteredOrders,
  getFilteredReversals,
  groupSalesByCategory,
  groupSalesByPaymentMethod,
  getTopSellingItems,
  getRecentActivity,
  groupSalesByDate,
  deriveDashboardData,
} from './dashboardSelectors';

describe('Batch 2.1 — Dashboard Accounting & Selectors', () => {
  // Test Data demonstrating varied taxRateSnapshot values & reversals:
  // Order 1: Completed, 16% tax (Subtotal: 1000, Tax: 160, Total: 1160)
  const order1 = {
    id: 'ord-1',
    invoiceNumber: 'INV-1001',
    status: 'completed',
    paymentMethod: 'Cash',
    completedAt: '2026-10-08T10:00:00Z',
    lines: [
      {
        itemId: 'item-1',
        itemNameSnapshot: 'Chicken Biryani',
        categoryNameSnapshot: 'Rice / Biryani',
        quantity: 2,
        unitPrice: 500,
        lineSubtotal: 1000,
      },
    ],
    subtotal: 1000,
    discountAmount: 0,
    taxableAmount: 1000,
    taxRateSnapshot: 16, // 16% tax
    taxAmount: 160,
    grandTotal: 1160,
  };

  // Order 2: Completed, 13% tax with discount (Subtotal: 2000, Discount: 200, Taxable: 1800, Tax: 234, Total: 2034)
  const order2 = {
    id: 'ord-2',
    invoiceNumber: 'INV-1002',
    status: 'completed',
    paymentMethod: 'Card',
    completedAt: '2026-10-08T12:00:00Z',
    lines: [
      {
        itemId: 'item-2',
        itemNameSnapshot: 'Zinger Burger',
        categoryNameSnapshot: 'Burgers',
        quantity: 4,
        unitPrice: 500,
        lineSubtotal: 2000,
      },
    ],
    subtotal: 2000,
    discountAmount: 200,
    taxableAmount: 1800,
    taxRateSnapshot: 13, // 13% tax (Sindh / Takeaway)
    taxAmount: 234,
    grandTotal: 2034,
  };

  // Order 3: Completed, 5% tax (Subtotal: 500, Discount: 0, Taxable: 500, Tax: 25, Total: 525)
  const order3 = {
    id: 'ord-3',
    invoiceNumber: 'INV-1003',
    status: 'completed',
    paymentMethod: 'Online',
    completedAt: '2026-10-07T14:00:00Z',
    lines: [
      {
        itemId: 'item-3',
        itemNameSnapshot: 'Fajita Pizza',
        categoryNameSnapshot: 'Pizza',
        quantity: 1,
        unitPrice: 500,
        lineSubtotal: 500,
      },
    ],
    subtotal: 500,
    discountAmount: 0,
    taxableAmount: 500,
    taxRateSnapshot: 5, // 5% card/digital tax
    taxAmount: 25,
    grandTotal: 525,
  };

  // Order 4: Reversed invoice (Subtotal: 800, Tax: 128, Total: 928)
  const order4 = {
    id: 'ord-4',
    invoiceNumber: 'INV-1004',
    status: 'reversed',
    paymentMethod: 'Cash',
    completedAt: '2026-10-06T15:00:00Z',
    lines: [
      {
        itemId: 'item-1',
        itemNameSnapshot: 'Chicken Biryani',
        categoryNameSnapshot: 'Rice / Biryani',
        quantity: 1,
        unitPrice: 800,
        lineSubtotal: 800,
      },
    ],
    subtotal: 800,
    discountAmount: 0,
    taxableAmount: 800,
    taxRateSnapshot: 16,
    taxAmount: 128,
    grandTotal: 928,
  };

  // Linked Reversal record for Order 4
  const reversal1 = {
    id: 'rev-1',
    originalOrderId: 'ord-4',
    originalInvoiceNumber: 'INV-1004',
    reason: 'Customer cancelled',
    subtotalReversed: 800,
    discountReversed: 0,
    taxReversed: 128,
    totalReversedIncludingTax: 928,
    reversedAt: '2026-10-06T16:00:00Z',
  };

  const testOrders = [order1, order2, order3, order4];
  const testReversals = [reversal1];

  it('1. calculates Gross Sales accurately as sum of grand totals before reversals', () => {
    // 1160 + 2034 + 525 + 928 = 4647
    const gross = calculateGrossSales(testOrders);
    expect(gross).toBe(4647);
  });

  it('2. confirms Completed Orders counts all historical completed invoices (does NOT subtract reversals)', () => {
    // 4 historical completed orders exist in the date range
    // Even though ord-4 was reversed, it remains a historical completed invoice
    const count = calculateCompletedOrders(testOrders);
    expect(count).toBe(4);
  });

  it('3. isolates economically valid non-reversed orders via getValidNonReversedOrders', () => {
    const validOrders = getValidNonReversedOrders(testOrders, testReversals);
    expect(validOrders.length).toBe(3);
    expect(validOrders.map((o) => o.id)).toEqual(['ord-1', 'ord-2', 'ord-3']);
  });

  it('4. calculates Tax Collected from stored taxAmount snapshots without assuming a fixed 16% rate', () => {
    // Valid orders:
    // ord-1 tax: 160 (16%)
    // ord-2 tax: 234 (13%)
    // ord-3 tax: 25 (5%)
    // Total Tax Collected = 160 + 234 + 25 = 419
    // (Reversed ord-4 tax of 128 is NOT collected!)
    const taxCollected = calculateTaxCollected(testOrders, testReversals);
    expect(taxCollected).toBe(419);
  });

  it('5. confirms reversed invoice does NOT contribute to Net Revenue', () => {
    // Valid orders revenue excluding tax:
    // ord-1: 1160 - 160 = 1000
    // ord-2: 2034 - 234 = 1800
    // ord-3: 525 - 25 = 500
    // Total Net Revenue = 1000 + 1800 + 500 = 3300
    // Tax is NOT revenue! ord-4 is reversed, so it contributes Rs 0.
    const netRevenue = calculateNetRevenue(testOrders, testReversals);
    expect(netRevenue).toBe(3300);
  });

  it('6. calculates Reversals Total Including Tax', () => {
    const totalRev = calculateReversalTotal(testReversals);
    expect(totalRev).toBe(928);
  });

  it('7. calculates Average Order Value using validBilledSales / validNonReversedOrderCount', () => {
    // Valid non-reversed orders: 3
    // Valid billed sales: 1160 + 2034 + 525 = 3719
    // AOV = Math.round(3719 / 3) = 1240
    const aov = calculateAverageOrderValue(testOrders, testReversals);
    expect(aov).toBe(1240);
  });

  it('8. confirms reversed invoice does NOT contribute to Items Sold', () => {
    // ord-1: 2 items, ord-2: 4 items, ord-3: 1 item.
    // ord-4 (1 item) is reversed -> excluded!
    // Total Items Sold = 7
    const items = calculateItemsSold(testOrders, testReversals);
    expect(items).toBe(7);
  });

  it('9. calculates Discounts Given from valid completed sales', () => {
    // Discount on ord-2 = 200
    const discounts = calculateDiscountTotal(testOrders, testReversals);
    expect(discounts).toBe(200);
  });

  it('10. derives all 8 KPI cards in deriveKPIMetrics matching accounting rules', () => {
    const kpis = deriveKPIMetrics(testOrders, testReversals);
    expect(kpis.grossSales).toBe(4647);
    expect(kpis.completedOrders).toBe(4); // Historical completed orders
    expect(kpis.validNonReversedOrdersCount).toBe(3);
    expect(kpis.netRevenue).toBe(3300);
    expect(kpis.reversalsIncludingTax).toBe(928);
    expect(kpis.averageOrderValue).toBe(1240);
    expect(kpis.taxCollected).toBe(419);
    expect(kpis.discountsGiven).toBe(200);
    expect(kpis.itemsSold).toBe(7);
    expect(kpis.reversalsCount).toBe(1);
  });

  it('11. filters orders and reversals correctly by date preset (Today, This Week, Custom)', () => {
    const ref = new Date('2026-10-08T15:00:00Z');

    // Today should match ord-1 and ord-2
    const todayOrders = getFilteredOrders(testOrders, 'Today', null, ref);
    expect(todayOrders.length).toBe(2);

    // This Week should match all 4 orders
    const weekOrders = getFilteredOrders(testOrders, 'This Week', null, ref);
    expect(weekOrders.length).toBe(4);

    // Custom date range: Oct 7 only
    const customOrders = getFilteredOrders(
      testOrders,
      'Custom',
      { startDate: '2026-10-07', endDate: '2026-10-07' },
      ref
    );
    expect(customOrders.length).toBe(1);
    expect(customOrders[0].id).toBe('ord-3');

    // Reversals date filter test
    const weekReversals = getFilteredReversals(testReversals, 'This Week', null, ref);
    expect(weekReversals.length).toBe(1);
    expect(weekReversals[0].id).toBe('rev-1');

    const todayReversals = getFilteredReversals(testReversals, 'Today', null, ref);
    expect(todayReversals.length).toBe(0);
  });

  it('12. groups sales by date for charts', () => {
    const ref = new Date('2026-10-08T15:00:00Z');
    const chartBars = groupSalesByDate(testOrders, testReversals, 'This Week', null, ref);
    expect(chartBars.length).toBe(7);
    const thuBar = chartBars.find((b) => b.day === 'Thu');
    expect(thuBar).toBeDefined();
    expect(thuBar.orders).toBe(2);
  });

  it('13. aggregates Sales by Category and computes percentages', () => {
    const catData = groupSalesByCategory(testOrders, testReversals);
    expect(catData.length).toBe(3);
    expect(catData[0].name).toBe('Burgers');
    expect(catData[0].value).toBe(2000);
    expect(catData[0].percentage).toBe(57);
    expect(catData[1].name).toBe('Rice / Biryani');
    expect(catData[1].value).toBe(1000);
  });

  it('14. aggregates Payment Method breakdown accurately', () => {
    const payments = groupSalesByPaymentMethod(testOrders, testReversals);
    const cash = payments.find((p) => p.method === 'Cash');
    const card = payments.find((p) => p.method === 'Card');
    const online = payments.find((p) => p.method === 'Online');

    expect(cash.amount).toBe(1160);
    expect(cash.count).toBe(1);
    expect(card.amount).toBe(2034);
    expect(card.count).toBe(1);
    expect(online.amount).toBe(525);
    expect(online.count).toBe(1);
  });

  it('15. identifies and sorts Top Selling Items by quantity sold', () => {
    const top = getTopSellingItems(testOrders, testReversals);
    expect(top.length).toBe(3);
    expect(top[0].name).toBe('Zinger Burger');
    expect(top[0].quantitySold).toBe(4);
    expect(top[1].name).toBe('Chicken Biryani');
    expect(top[1].quantitySold).toBe(2);
    expect(top[2].name).toBe('Fajita Pizza');
    expect(top[2].quantitySold).toBe(1);
  });

  it('16. aggregates Recent Activity in chronological order (newest first)', () => {
    const activities = getRecentActivity(testOrders, testReversals);
    expect(activities.length).toBe(5);
    expect(activities[0].invoiceNumber).toBe('INV-1002');
    expect(activities[1].invoiceNumber).toBe('INV-1001');
    const revActivity = activities.find((a) => a.type === 'reversal');
    expect(revActivity).toBeDefined();
    expect(revActivity.invoiceNumber).toBe('INV-1004');
    expect(revActivity.amount).toBe(928);
  });

  it('17. handles zero-data calculations safely without crashing or NaN', () => {
    const kpis = deriveKPIMetrics([], []);
    expect(kpis.grossSales).toBe(0);
    expect(kpis.completedOrders).toBe(0);
    expect(kpis.validNonReversedOrdersCount).toBe(0);
    expect(kpis.netRevenue).toBe(0);
    expect(kpis.reversalsIncludingTax).toBe(0);
    expect(kpis.averageOrderValue).toBe(0);
    expect(kpis.taxCollected).toBe(0);
    expect(kpis.discountsGiven).toBe(0);
    expect(kpis.itemsSold).toBe(0);
    expect(kpis.totalCustomers).toBe(0);
    expect(kpis.customers).toBe(0);

    const aov = calculateAverageOrderValue([], []);
    expect(aov).toBe(0);

    const categories = groupSalesByCategory([], []);
    expect(categories).toEqual([]);

    const payments = groupSalesByPaymentMethod([], []);
    expect(payments.every((p) => p.amount === 0 && p.count === 0)).toBe(true);

    const topItems = getTopSellingItems([], []);
    expect(topItems).toEqual([]);

    const activities = getRecentActivity([], []);
    expect(activities).toEqual([]);

    const master = deriveDashboardData([], [], 'Today');
    expect(master.ordersCount).toBe(0);
    expect(master.kpis.grossSales).toBe(0);
    expect(master.kpis.averageOrderValue).toBe(0);
    expect(master.kpis.totalCustomers).toBe(0);
  });

  it('18. verifies recent activities snapshot metadata and zero data reset guarantees', () => {
    const activities = getRecentActivity(testOrders, testReversals);
    const saleActivity = activities.find((a) => a.type === 'sale' && a.invoiceNumber === 'INV-1001');
    expect(saleActivity).toBeDefined();
    expect(saleActivity.itemId).toBe('item-1');
    expect(saleActivity.dishName).toBe('Chicken Biryani');

    // Confirm that after complete clear, both top items and activities are strictly empty
    expect(getTopSellingItems([], [])).toHaveLength(0);
    expect(getRecentActivity([], [])).toHaveLength(0);
  });

  it('19. calculateTotalCustomers: Dine-In uses saved guestCount', () => {
    const orders = [
      { id: 'ord-1', orderType: 'Dine-In', guestCount: 4, status: 'completed' },
      { id: 'ord-2', orderType: 'Dine-In', guestCount: 2, status: 'completed' },
    ];
    expect(calculateTotalCustomers(orders, [])).toBe(6);
  });

  it('20. calculateTotalCustomers: Takeaway defaults guestCount to 1', () => {
    const orders = [
      { id: 'ord-1', orderType: 'Takeaway', status: 'completed' }, // no guestCount
      { id: 'ord-2', orderType: 'Takeaway', guestCount: 1, status: 'completed' },
    ];
    expect(calculateTotalCustomers([orders[0]], [])).toBe(1);
    expect(calculateTotalCustomers([orders[1]], [])).toBe(1);
    expect(calculateTotalCustomers(orders, [])).toBe(2);
  });

  it('21. calculateTotalCustomers: Old orders without guestCount fallback to 1', () => {
    const oldOrders = [
      { id: 'ord-old-1', orderType: 'Dine-In', status: 'completed' }, // undefined guestCount
      { id: 'ord-old-2', orderType: 'Dine-In', guestCount: null, status: 'completed' },
      { id: 'ord-old-3', orderType: 'Dine-In', guestCount: 0, status: 'completed' },
      { id: 'ord-old-4', status: 'completed' }, // no orderType, no guestCount
    ];
    expect(calculateTotalCustomers([oldOrders[0]], [])).toBe(1);
    expect(calculateTotalCustomers([oldOrders[1]], [])).toBe(1);
    expect(calculateTotalCustomers([oldOrders[2]], [])).toBe(1);
    expect(calculateTotalCustomers([oldOrders[3]], [])).toBe(1);
    expect(calculateTotalCustomers(oldOrders, [])).toBe(4);
  });

  it('22. calculateTotalCustomers: Reversed orders are strictly excluded from customer count', () => {
    const orders = [
      { id: 'ord-1', orderType: 'Dine-In', guestCount: 4, status: 'completed' },
      { id: 'ord-2', orderType: 'Dine-In', guestCount: 5, status: 'reversed' }, // reversed status
      { id: 'ord-3', orderType: 'Dine-In', guestCount: 3, status: 'completed' }, // in reversals list
    ];
    const reversals = [
      { id: 'rev-1', originalOrderId: 'ord-3' },
    ];

    // Only ord-1 is active (ord-2 has status reversed, ord-3 is in reversals list)
    expect(calculateTotalCustomers(orders, reversals)).toBe(4);
  });

  it('23. calculateTotalCustomers: NEVER derives customers from items sold, quantity, add-ons, or demo constants', () => {
    const orderWithHeavyItems = {
      id: 'ord-heavy',
      orderType: 'Dine-In',
      guestCount: 2, // strictly 2 customers
      status: 'completed',
      lines: [
        { itemId: 'it-1', quantity: 20, addonSnapshots: [{ id: 'a1' }, { id: 'a2' }] },
        { itemId: 'it-2', quantity: 35, addonSnapshots: [{ id: 'a3' }] },
      ],
      subtotal: 55000,
      grandTotal: 63800,
    };

    // Must be exactly 2 from guestCount, NOT 55 items sold, NOT add-ons, and NOT demo formula (1 * 8 + 15 = 23)
    expect(calculateTotalCustomers([orderWithHeavyItems], [])).toBe(2);
    expect(calculateTotalCustomers([orderWithHeavyItems], [])).not.toBe(55); // not item quantity
    expect(calculateTotalCustomers([orderWithHeavyItems], [])).not.toBe(23); // not demo formula
  });

  it('24. deriveKPIMetrics: exposes totalCustomers, customers, and numberOfCustomers correctly', () => {
    const orders = [
      { id: 'ord-1', orderType: 'Dine-In', guestCount: 5, status: 'completed', grandTotal: 2000 },
      { id: 'ord-2', orderType: 'Takeaway', status: 'completed', grandTotal: 500 }, // fallback 1
      { id: 'ord-3', orderType: 'Dine-In', status: 'completed', grandTotal: 1000 }, // fallback 1
      { id: 'ord-4', orderType: 'Dine-In', guestCount: 3, status: 'reversed', grandTotal: 1200 }, // excluded
    ];
    const metrics = deriveKPIMetrics(orders, []);
    expect(metrics.totalCustomers).toBe(7); // 5 + 1 + 1
    expect(metrics.customers).toBe(7);
    expect(metrics.numberOfCustomers).toBe(7);
  });
});
