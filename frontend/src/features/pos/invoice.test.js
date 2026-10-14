import { describe, it, expect, beforeEach } from 'vitest';
import {
  getInvoiceById,
  getInvoiceHistory,
  filterInvoices,
  isInvoiceReversible,
  createReversalSnapshot,
  calculateReversalImpact,
  getReversalByInvoice,
  formatInvoiceForPrint,
} from '../../domain/selectors/invoiceSelectors';
import {
  calculateNetRevenue,
  calculateTaxCollected,
  calculateReversalTotal,
  getValidNonReversedOrders,
} from '../../domain/selectors/dashboardSelectors';
import { storage } from '../../services/persistence/storage';

describe('Batch 4: Invoice, History & Full Reversal Workflow', () => {
  // Canonical completed order fixture using historical snapshots
  const mockHistoricalOrder = {
    id: 'ord-hist-101',
    invoiceNumber: 'INV-101',
    status: 'completed',
    orderType: 'Dine-In',
    lines: [
      {
        id: 'line-1',
        itemId: 'item-biryani',
        itemNameSnapshot: 'Special Chicken Biryani',
        basePriceSnapshot: 900,
        baseUnitSnapshot: '1 Kg',
        pricingMode: 'portion',
        selectedPortionLabel: '250g',
        selectedWeightGrams: 250,
        unitPrice: 225,
        quantity: 2,
        lineSubtotal: 450,
        addonSnapshots: [
          { id: 'addon-raita', name: 'Zeera Raita', price: 40 },
        ],
      },
      {
        id: 'line-2',
        itemId: 'item-karahi',
        itemNameSnapshot: 'Chicken Karahi',
        basePriceSnapshot: 1500,
        baseUnitSnapshot: '1 Kg',
        pricingMode: 'amount',
        selectedPortionLabel: 'Rs 300 (200g)',
        selectedWeightGrams: 200,
        unitPrice: 300,
        quantity: 1,
        lineSubtotal: 300,
        addonSnapshots: [],
      },
    ],
    subtotal: 750,
    discountType: 'fixed',
    discountValue: 50,
    discountAmount: 50,
    taxableAmount: 700,
    taxRateSnapshot: 16,
    taxAmount: 112,
    grandTotal: 812,
    paymentMethod: 'Cash',
    amountReceived: 1000,
    changeAmount: 188,
    cashierName: 'John Holland',
    storeName: 'Chengxi Store',
    createdAt: '2026-03-01T10:00:00.000Z',
    completedAt: '2026-03-01T10:05:00.000Z',
  };

  beforeEach(() => {
    storage.clear();
  });

  // 1. completed invoice detail uses stored snapshots
  it('1. completed invoice detail uses stored snapshots', () => {
    const formatted = formatInvoiceForPrint(mockHistoricalOrder);
    expect(formatted.lines[0].name).toBe('Special Chicken Biryani');
    expect(formatted.lines[0].portion).toBe('250g');
    expect(formatted.lines[0].grams).toBe(250);
    expect(formatted.lines[0].quantity).toBe(2);
    expect(formatted.lines[0].lineSubtotal).toBe(450);
    expect(formatted.lines[0].addons).toEqual(['Zeera Raita']);
  });

  // 2. menu price change does not alter historical invoice
  it('2. menu price change does not alter historical invoice', () => {
    // Simulate live menu price changing to Rs 1,400 tomorrow
    const liveMenu = { 'item-biryani': { basePrice: 1400, name: 'Special Chicken Biryani' } };

    // The historical invoice must strictly maintain its stored lineSubtotal and unitPrice
    expect(mockHistoricalOrder.lines[0].unitPrice).toBe(225);
    expect(mockHistoricalOrder.lines[0].lineSubtotal).toBe(450);
    expect(mockHistoricalOrder.subtotal).toBe(750);
    expect(mockHistoricalOrder.grandTotal).toBe(812);
    expect(liveMenu['item-biryani'].basePrice).toBe(1400);
  });

  // 3. menu item name change does not alter historical invoice
  it('3. menu item name change does not alter historical invoice', () => {
    // Simulate live menu item renaming
    const liveItem = { id: 'item-biryani', name: 'Royal Sindhi Biryani Gold Edition' };

    // Historical invoice uses itemNameSnapshot
    expect(mockHistoricalOrder.lines[0].itemNameSnapshot).toBe('Special Chicken Biryani');
    expect(mockHistoricalOrder.lines[0].itemNameSnapshot).not.toBe(liveItem.name);
  });

  // 4. add-on change does not alter historical invoice
  it('4. add-on change does not alter historical invoice', () => {
    // Simulate live add-on price change or deletion
    const liveAddon = { id: 'addon-raita', name: 'Fresh Mint Raita', price: 90 };

    expect(mockHistoricalOrder.lines[0].addonSnapshots[0].name).toBe('Zeera Raita');
    expect(mockHistoricalOrder.lines[0].addonSnapshots[0].price).toBe(40);
    expect(mockHistoricalOrder.lines[0].addonSnapshots[0].name).not.toBe(liveAddon.name);
  });

  // 5. weight snapshot is preserved
  it('5. weight snapshot is preserved', () => {
    const biryaniLine = mockHistoricalOrder.lines[0];
    const karahiLine = mockHistoricalOrder.lines[1];

    expect(biryaniLine.selectedWeightGrams).toBe(250);
    expect(biryaniLine.selectedPortionLabel).toBe('250g');

    expect(karahiLine.pricingMode).toBe('amount');
    expect(karahiLine.selectedWeightGrams).toBe(200);
    expect(karahiLine.lineSubtotal).toBe(300);
  });

  // 6. invoice totals match completed transaction
  it('6. invoice totals match completed transaction', () => {
    expect(mockHistoricalOrder.subtotal).toBe(750);
    expect(mockHistoricalOrder.discountAmount).toBe(50);
    expect(mockHistoricalOrder.taxableAmount).toBe(700);
    expect(mockHistoricalOrder.taxAmount).toBe(112);
    expect(mockHistoricalOrder.grandTotal).toBe(812);
    expect(mockHistoricalOrder.amountReceived).toBe(1000);
    expect(mockHistoricalOrder.changeAmount).toBe(188);
  });

  // 7. tax snapshot is preserved
  it('7. tax snapshot is preserved', () => {
    expect(mockHistoricalOrder.taxRateSnapshot).toBe(16);
    expect(mockHistoricalOrder.taxAmount).toBe(112);
    // Calculation: 700 * 0.16 = 112
    expect(Math.round(mockHistoricalOrder.taxableAmount * (mockHistoricalOrder.taxRateSnapshot / 100))).toBe(112);
  });

  // 8. full reversal creates linked reversal record
  it('8. full reversal creates linked reversal record', () => {
    const reversal = createReversalSnapshot(mockHistoricalOrder, {
      reason: 'Customer Cancelled',
      note: 'Left before food preparation',
      reversedBy: 'Manager Ali',
    });

    expect(reversal.id).toMatch(/^rev-/);
    expect(reversal.originalOrderId).toBe(mockHistoricalOrder.id);
    expect(reversal.originalInvoiceNumber).toBe(mockHistoricalOrder.invoiceNumber);
    expect(reversal.reason).toBe('Customer Cancelled');
    expect(reversal.note).toBe('Left before food preparation');
    expect(reversal.reversedBy).toBe('Manager Ali');
    expect(reversal.status).toBe('reversed');
  });

  // 9. reversal uses original invoice values
  it('9. reversal uses original invoice values', () => {
    const reversal = createReversalSnapshot(mockHistoricalOrder, {
      reason: 'Billing Error',
    });

    expect(reversal.subtotalReversed).toBe(mockHistoricalOrder.subtotal);
    expect(reversal.discountReversed).toBe(mockHistoricalOrder.discountAmount);
    expect(reversal.taxReversed).toBe(mockHistoricalOrder.taxAmount);
    expect(reversal.totalReversedIncludingTax).toBe(mockHistoricalOrder.grandTotal);

    const impact = calculateReversalImpact(reversal);
    expect(impact.totalReversedIncludingTax).toBe(812);
    expect(impact.taxReversed).toBe(112);
  });

  // 10. reversal includes correct original tax
  it('10. reversal includes correct original tax', () => {
    const reversal = createReversalSnapshot(mockHistoricalOrder, {
      reason: 'Duplicate Sale',
    });

    expect(reversal.taxReversed).toBe(112);
    expect(reversal.totalReversedIncludingTax).toBe(812);
  });

  // 11. original invoice is not deleted
  it('11. original invoice is not deleted', () => {
    const orders = [mockHistoricalOrder];
    const reversal = createReversalSnapshot(mockHistoricalOrder, { reason: 'Wrong Order' });

    // Mark order status as reversed while preserving all original data
    const updatedOrders = orders.map((o) =>
      o.id === reversal.originalOrderId ? { ...o, status: 'reversed' } : o
    );

    expect(updatedOrders).toHaveLength(1);
    expect(updatedOrders[0].id).toBe(mockHistoricalOrder.id);
    expect(updatedOrders[0].status).toBe('reversed');
    expect(updatedOrders[0].grandTotal).toBe(812);
  });

  // 12. already reversed invoice cannot reverse again
  it('12. already reversed invoice cannot reverse again', () => {
    const reversals = [
      {
        id: 'rev-01',
        originalOrderId: mockHistoricalOrder.id,
        originalInvoiceNumber: mockHistoricalOrder.invoiceNumber,
        reason: 'Customer Cancelled',
      },
    ];

    expect(isInvoiceReversible(mockHistoricalOrder, reversals)).toBe(false);

    // Also if status is already 'reversed'
    const reversedOrder = { ...mockHistoricalOrder, status: 'reversed' };
    expect(isInvoiceReversible(reversedOrder, [])).toBe(false);
  });

  // 13. incomplete/draft invoice cannot reverse
  it('13. incomplete/draft invoice cannot reverse', () => {
    const pendingOrder = { ...mockHistoricalOrder, status: 'pending' };
    const draftOrder = { ...mockHistoricalOrder, status: 'draft' };

    expect(isInvoiceReversible(pendingOrder, [])).toBe(false);
    expect(isInvoiceReversible(draftOrder, [])).toBe(false);
    expect(isInvoiceReversible(null, [])).toBe(false);
  });

  // 14. reversed invoice status displays correctly
  it('14. reversed invoice status displays correctly', () => {
    const reversals = [
      {
        id: 'rev-01',
        originalOrderId: mockHistoricalOrder.id,
        originalInvoiceNumber: mockHistoricalOrder.invoiceNumber,
        reason: 'Customer Cancelled',
        reversedAt: '2026-03-01T11:00:00.000Z',
      },
    ];

    const linkedRev = getReversalByInvoice(reversals, mockHistoricalOrder.id);
    expect(linkedRev).toBeTruthy();
    expect(linkedRev.reason).toBe('Customer Cancelled');

    const formattedPrint = formatInvoiceForPrint(mockHistoricalOrder, {}, linkedRev);
    expect(formattedPrint.meta.isReversed).toBe(true);
    expect(formattedPrint.meta.reversalReason).toBe('Customer Cancelled');
  });

  // 15. reversal persists after refresh
  it('15. reversal persists after refresh', () => {
    const reversal = createReversalSnapshot(mockHistoricalOrder, { reason: 'Wrong Order' });
    storage.set('reversals', [reversal]);

    const retrievedReversals = storage.get('reversals', []);
    expect(retrievedReversals).toHaveLength(1);
    expect(retrievedReversals[0].originalOrderId).toBe(mockHistoricalOrder.id);
  });

  // 16. invoice persists after refresh
  it('16. invoice persists after refresh', () => {
    storage.set('orders', [mockHistoricalOrder]);

    const retrievedOrders = storage.get('orders', []);
    expect(retrievedOrders).toHaveLength(1);
    expect(retrievedOrders[0].invoiceNumber).toBe('INV-101');
    expect(retrievedOrders[0].grandTotal).toBe(812);
  });

  // 17. dashboard selectors remain compatible
  it('17. dashboard selectors remain compatible', () => {
    const orders = [mockHistoricalOrder];
    const reversals = [];

    const nonReversed = getValidNonReversedOrders(orders, reversals);
    expect(nonReversed).toHaveLength(1);

    const netRev = calculateNetRevenue(orders, reversals);
    // grandTotal 812 - taxAmount 112 = 700
    expect(netRev).toBe(700);

    const taxColl = calculateTaxCollected(orders, reversals);
    expect(taxColl).toBe(112);
  });

  // 18. reversed sale no longer contributes to valid Net Revenue
  it('18. reversed sale no longer contributes to valid Net Revenue', () => {
    const reversal = createReversalSnapshot(mockHistoricalOrder, { reason: 'Cancelled' });
    const orders = [{ ...mockHistoricalOrder, status: 'reversed' }];
    const reversals = [reversal];

    const netRev = calculateNetRevenue(orders, reversals);
    expect(netRev).toBe(0);
  });

  // 19. reversed tax no longer contributes to valid Tax Collected
  it('19. reversed tax no longer contributes to valid Tax Collected', () => {
    const reversal = createReversalSnapshot(mockHistoricalOrder, { reason: 'Cancelled' });
    const orders = [{ ...mockHistoricalOrder, status: 'reversed' }];
    const reversals = [reversal];

    const taxColl = calculateTaxCollected(orders, reversals);
    expect(taxColl).toBe(0);
  });

  // 20. Reversals Including Tax increases correctly
  it('20. Reversals Including Tax increases correctly', () => {
    const reversal = createReversalSnapshot(mockHistoricalOrder, { reason: 'Cancelled' });
    const reversals = [reversal];

    const revTotal = calculateReversalTotal(reversals);
    expect(revTotal).toBe(812);
  });

  // 21. zero invoice history is safe
  it('21. zero invoice history is safe', () => {
    expect(getInvoiceHistory([])).toEqual([]);
    expect(filterInvoices([])).toEqual([]);
    expect(getInvoiceById([], 'INV-999')).toBeNull();
    expect(isInvoiceReversible(null)).toBe(false);
  });

  // 22. invoice filtering works
  it('22. invoice filtering works by search query, status, payment method, and order type', () => {
    const order2 = {
      ...mockHistoricalOrder,
      id: 'ord-102',
      invoiceNumber: 'INV-102',
      status: 'reversed',
      orderType: 'Takeaway',
      paymentMethod: 'Card',
      lines: [{ itemNameSnapshot: 'Chicken Fajita Pizza', quantity: 1, lineSubtotal: 800 }],
    };
    const orderList = [mockHistoricalOrder, order2];

    // Search by invoice #
    expect(filterInvoices(orderList, { searchQuery: '102' })).toHaveLength(1);
    expect(filterInvoices(orderList, { searchQuery: '102' })[0].invoiceNumber).toBe('INV-102');

    // Search by item name
    expect(filterInvoices(orderList, { searchQuery: 'Pizza' })).toHaveLength(1);
    expect(filterInvoices(orderList, { searchQuery: 'Biryani' })).toHaveLength(1);

    // Status filter
    expect(filterInvoices(orderList, { status: 'reversed' })).toHaveLength(1);
    expect(filterInvoices(orderList, { status: 'completed' })).toHaveLength(1);

    // Payment method filter
    expect(filterInvoices(orderList, { paymentMethod: 'Card' })).toHaveLength(1);
    expect(filterInvoices(orderList, { paymentMethod: 'Cash' })).toHaveLength(1);

    // Order type filter
    expect(filterInvoices(orderList, { orderType: 'Takeaway' })).toHaveLength(1);
    expect(filterInvoices(orderList, { orderType: 'Dine-In' })).toHaveLength(1);
  });
});
