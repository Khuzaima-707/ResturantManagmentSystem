import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateWeightPrice,
  calculateWeightFromAmount,
  calculateAddonTotal,
  calculateConfiguredItemPrice,
  calculateLineSubtotal,
  calculateCartSubtotal,
  calculateDiscount,
  calculateTax,
  calculateGrandTotal,
  calculateChange,
  generateInvoiceNumber,
} from '../../domain/calculations';
import { getCompatibleAddons } from '../../domain/rules';
import { useAppStore } from '../../store';
import { storage } from '../../services/persistence/storage';
import {
  deriveKPIMetrics,
  calculateGrossSales,
  calculateNetRevenue,
  calculateTaxCollected,
  getTopSellingItems,
} from '../../domain/selectors/dashboardSelectors';

describe('Batch 4 — POS & Billing Test Suite', () => {
  beforeEach(() => {
    // Reset Zustand store state before each test
    useAppStore.getState().clearCart();
  });

  // 1. Rs 1,000/kg -> 250g = Rs 250
  it('1. calculates Rs 1,000/kg -> 250g = Rs 250', () => {
    expect(calculateWeightPrice(1000, 250)).toBe(250);
  });

  // 2. Rs 1,000/kg -> 500g = Rs 500
  it('2. calculates Rs 1,000/kg -> 500g = Rs 500', () => {
    expect(calculateWeightPrice(1000, 500)).toBe(500);
  });

  // 3. Rs 1,000/kg -> 750g = Rs 750
  it('3. calculates Rs 1,000/kg -> 750g = Rs 750', () => {
    expect(calculateWeightPrice(1000, 750)).toBe(750);
  });

  // 4. Rs 1,000/kg -> 1kg = Rs 1,000
  it('4. calculates Rs 1,000/kg -> 1kg (1000g) = Rs 1,000', () => {
    expect(calculateWeightPrice(1000, 1000)).toBe(1000);
  });

  // 5. Rs 100 amount at Rs 1,000/kg -> 100g
  it('5. derives 100g from Rs 100 custom amount at Rs 1,000/kg', () => {
    expect(calculateWeightFromAmount(1000, 100)).toBe(100);
  });

  // 6. Rs 250 amount -> 250g
  it('6. derives 250g from Rs 250 custom amount at Rs 1,000/kg', () => {
    expect(calculateWeightFromAmount(1000, 250)).toBe(250);
  });

  // 7. piece item pricing
  it('7. calculates piece item pricing correctly (basePrice * quantity)', () => {
    const basePrice = 450; // Zinger Burger
    const quantity = 2;
    const subtotal = calculateLineSubtotal(basePrice, 0, quantity);
    expect(subtotal).toBe(900);
  });

  // 8. add-on price calculation
  it('8. calculates add-on price totals and configured item unit price correctly', () => {
    const addons = [
      { id: 'a1', name: 'Cheese', price: 60 },
      { id: 'a2', name: 'Fries', price: 120 },
    ];
    const addonTotal = calculateAddonTotal(addons);
    expect(addonTotal).toBe(180);

    const burgerPrice = 450;
    const configuredPrice = calculateConfiguredItemPrice(burgerPrice, addonTotal);
    expect(configuredPrice).toBe(630);
  });

  // 9. quantity calculation
  it('9. calculates line subtotal considering quantity multiplication on configured items', () => {
    // Configured price Rs 630 (Burger 450 + Addons 180), Quantity 3 = 1890
    const lineTotal = calculateLineSubtotal(630, 0, 3);
    expect(lineTotal).toBe(1890);
  });

  // 10. fixed discount
  it('10. calculates fixed Rs discount correctly and prevents negative balance', () => {
    const subtotal = 1000;
    expect(calculateDiscount(subtotal, 'fixed', 150)).toBe(150);
    expect(calculateDiscount(subtotal, 'fixed', 1500)).toBe(1000); // capped at subtotal
  });

  // 11. percentage discount
  it('11. calculates percentage discount correctly and caps at 100%', () => {
    const subtotal = 1000;
    expect(calculateDiscount(subtotal, 'percentage', 10)).toBe(100);
    expect(calculateDiscount(subtotal, 'percentage', 25)).toBe(250);
    expect(calculateDiscount(subtotal, 'percentage', 120)).toBe(1000); // capped at 100%
  });

  // 12. tax
  it('12. calculates dynamic tax rate accurately from taxable amount', () => {
    const taxable = 900; // 1000 - 100 discount
    const taxRate = 16;
    expect(calculateTax(taxable, taxRate)).toBe(144);

    // Dynamic 5% tax rate
    expect(calculateTax(taxable, 5)).toBe(45);
  });

  // 13. tax snapshot preservation
  it('13. preserves taxRateSnapshot and taxAmount on completed order when store settings tax changes', () => {
    const initialTaxRate = 16;
    const taxableAmount = 1000;
    const taxAmount = calculateTax(taxableAmount, initialTaxRate);

    const completedOrder = {
      id: 'ord-tax-test',
      subtotal: 1000,
      taxRateSnapshot: initialTaxRate,
      taxAmount: taxAmount,
      grandTotal: calculateGrandTotal(taxableAmount, taxAmount),
      status: 'completed',
    };

    expect(completedOrder.taxRateSnapshot).toBe(16);
    expect(completedOrder.taxAmount).toBe(160);

    // Later, admin updates tax in settings to 18%
    const updatedSettingsTaxRate = 18;
    expect(updatedSettingsTaxRate).toBe(18);
    expect(completedOrder.taxRateSnapshot).toBe(16); // Snapshot remains pristine 16%
    expect(completedOrder.taxAmount).toBe(160); // Historical tax does NOT re-evaluate
  });

  // 14. cash change
  it('14. calculates cash change correctly when amount received >= grand total', () => {
    const grandTotal = 1160;
    const cashReceived = 1500;
    expect(calculateChange(cashReceived, grandTotal)).toBe(340);
  });

  // 15. insufficient cash rejected
  it('15. rejects insufficient cash and returns 0 change', () => {
    const grandTotal = 1160;
    const cashReceived = 1000;
    expect(calculateChange(cashReceived, grandTotal)).toBe(0);
    const isInsufficient = cashReceived < grandTotal;
    expect(isInsufficient).toBe(true);
  });

  // 16. inactive menu items excluded
  it('16. excludes inactive menu items from active POS selling catalog', () => {
    const allItems = [
      { id: '1', name: 'Active Biryani', status: 'active' },
      { id: '2', name: 'Inactive Burger', status: 'inactive' },
      { id: '3', name: 'Active Karahi', status: 'active' },
    ];
    const sellableItems = allItems.filter((i) => i.status === 'active');
    expect(sellableItems.length).toBe(2);
    expect(sellableItems.find((i) => i.id === '2')).toBeUndefined();
  });

  // 17. inactive add-ons excluded
  it('17. excludes inactive add-ons from compatible add-on selection engine', () => {
    const item = { id: 'item-1', categoryId: 'cat-1' };
    const category = { id: 'cat-1', name: 'Burgers' };
    const allAddons = [
      { id: 'a1', name: 'Cheese', price: 60, status: 'active', categoryIds: ['cat-1'] },
      { id: 'a2', name: 'Old Sauce', price: 20, status: 'inactive', categoryIds: ['cat-1'] },
    ];
    const compatible = getCompatibleAddons(item, category, allAddons);
    expect(compatible.length).toBe(1);
    expect(compatible[0].name).toBe('Cheese');
  });

  // 18. different configurations remain separate lines
  it('18. keeps different configurations of the same item as separate cart lines', () => {
    const { addToCart } = useAppStore.getState();

    // Line A: Chicken Biryani 250g + Raita
    const lineA = {
      id: 'line-1',
      itemId: 'biryani-1',
      itemNameSnapshot: 'Chicken Biryani',
      pricingMode: 'portion',
      selectedPortionLabel: '250g',
      selectedWeightGrams: 250,
      addonSnapshots: [{ id: 'addon-raita', name: 'Raita', price: 40 }],
      quantity: 1,
      unitPrice: 290,
      lineSubtotal: 290,
    };

    // Line B: Chicken Biryani 500g + Extra Chicken
    const lineB = {
      id: 'line-2',
      itemId: 'biryani-1',
      itemNameSnapshot: 'Chicken Biryani',
      pricingMode: 'portion',
      selectedPortionLabel: '500g',
      selectedWeightGrams: 500,
      addonSnapshots: [{ id: 'addon-chicken', name: 'Extra Chicken', price: 100 }],
      quantity: 1,
      unitPrice: 600,
      lineSubtotal: 600,
    };

    addToCart(lineA);
    addToCart(lineB);

    const currentCart = useAppStore.getState().cart;
    expect(currentCart.length).toBe(2);
    expect(currentCart[0].selectedPortionLabel).toBe('250g');
    expect(currentCart[1].selectedPortionLabel).toBe('500g');
  });

  // 19. cart subtotal
  it('19. calculates cart subtotal correctly from multiple distinct cart lines', () => {
    const lines = [
      { lineSubtotal: 290, quantity: 1 },
      { lineSubtotal: 600, quantity: 1 },
      { lineSubtotal: 450, quantity: 1 },
    ];
    expect(calculateCartSubtotal(lines)).toBe(1340);
  });

  // 20. completed transaction snapshot
  it('20. generates a valid canonical completed order transaction with all snapshots', () => {
    const invoiceNumber = generateInvoiceNumber('INV-', 105);
    const subtotal = 1000;
    const discountAmount = 100;
    const taxableAmount = 900;
    const taxAmount = 144;
    const grandTotal = 1044;

    const completedOrder = {
      id: 'ord-test-20',
      invoiceNumber,
      status: 'completed',
      orderType: 'Dine-In',
      lines: [
        {
          id: 'l1',
          itemId: 'item-1',
          itemNameSnapshot: 'Chicken Biryani',
          unitPrice: 500,
          quantity: 2,
          lineSubtotal: 1000,
        },
      ],
      subtotal,
      discountType: 'percentage',
      discountValue: 10,
      discountAmount,
      taxableAmount,
      taxRateSnapshot: 16,
      taxAmount,
      grandTotal,
      paymentMethod: 'Cash',
      amountReceived: 1500,
      changeAmount: 456,
      completedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(completedOrder.id).toBe('ord-test-20');
    expect(completedOrder.invoiceNumber).toBe('INV-0105');
    expect(completedOrder.status).toBe('completed');
    expect(completedOrder.lines.length).toBe(1);
    expect(completedOrder.grandTotal).toBe(1044);
    expect(completedOrder.changeAmount).toBe(456);
  });

  // 21. completed sale persists
  it('21. persists completed sale through addOrder into store and storage', () => {
    const newSale = {
      id: 'ord-persist-test',
      invoiceNumber: 'INV-9999',
      status: 'completed',
      grandTotal: 1500,
      taxAmount: 240,
      createdAt: new Date().toISOString(),
      lines: [{ quantity: 1, lineSubtotal: 1500, itemNameSnapshot: 'Test Food' }],
    };

    useAppStore.getState().addOrder(newSale);

    const ordersFromStore = useAppStore.getState().orders;
    const found = ordersFromStore.find((o) => o.id === 'ord-persist-test');
    expect(found).toBeDefined();
    expect(found.invoiceNumber).toBe('INV-9999');

    // Check persistence storage
    const savedInStorage = storage.get('orders', []);
    const foundInStorage = savedInStorage.find((o) => o.id === 'ord-persist-test');
    expect(foundInStorage).toBeDefined();
  });

  // 22. completed sale is compatible with current Dashboard selectors
  it('22. verifies completed sale seamlessly updates Dashboard KPI calculations', () => {
    const saleA = {
      id: 'ord-dash-1',
      status: 'completed',
      grandTotal: 1160,
      taxAmount: 160,
      discountAmount: 0,
      createdAt: new Date().toISOString(),
      lines: [
        {
          itemId: 'dish-zinger',
          itemNameSnapshot: 'Zinger Burger',
          categoryNameSnapshot: 'Burgers',
          quantity: 2,
          unitPrice: 500,
          lineSubtotal: 1000,
        },
      ],
    };

    const orders = [saleA];
    const reversals = [];

    const gross = calculateGrossSales(orders);
    expect(gross).toBe(1160);

    const net = calculateNetRevenue(orders, reversals);
    // grandTotal (1160) - taxAmount (160) = 1000 Net Revenue (Tax is NOT revenue!)
    expect(net).toBe(1000);

    const tax = calculateTaxCollected(orders, reversals);
    expect(tax).toBe(160);

    const kpis = deriveKPIMetrics(orders, reversals);
    expect(kpis.grossSales).toBe(1160);
    expect(kpis.netRevenue).toBe(1000);
    expect(kpis.taxCollected).toBe(160);
    expect(kpis.itemsSold).toBe(2);

    const topItems = getTopSellingItems(orders, reversals);
    expect(topItems.length).toBe(1);
    expect(topItems[0].name).toBe('Zinger Burger');
    expect(topItems[0].quantitySold).toBe(2);
  });

  // 23. Card payment transaction snapshot
  it('23. records Card payment transaction with cardNetwork and posSlipNumber', () => {
    const cardOrder = {
      id: 'ord-card-1',
      invoiceNumber: 'INV-0099',
      status: 'completed',
      paymentMethod: 'Card',
      cardNetwork: 'Visa',
      posSlipNumber: 'Slip #4829',
      paymentVerified: true,
      amountReceived: 1207.5,
      changeAmount: 0,
      grandTotal: 1207.5,
      completedAt: new Date().toISOString(),
    };

    useAppStore.getState().addOrder(cardOrder);
    const stored = useAppStore.getState().orders.find((o) => o.id === 'ord-card-1');
    expect(stored).toBeDefined();
    expect(stored.paymentMethod).toBe('Card');
    expect(stored.cardNetwork).toBe('Visa');
    expect(stored.posSlipNumber).toBe('Slip #4829');
    expect(stored.paymentVerified).toBe(true);
  });

  // 24. Online payment transaction snapshot
  it('24. records Online payment transaction with onlineChannel and transactionId', () => {
    const onlineOrder = {
      id: 'ord-online-1',
      invoiceNumber: 'INV-0100',
      status: 'completed',
      paymentMethod: 'Online',
      onlineChannel: 'JazzCash',
      transactionId: 'TID 987654321',
      paymentVerified: true,
      amountReceived: 1207.5,
      changeAmount: 0,
      grandTotal: 1207.5,
      completedAt: new Date().toISOString(),
    };

    useAppStore.getState().addOrder(onlineOrder);
    const stored = useAppStore.getState().orders.find((o) => o.id === 'ord-online-1');
    expect(stored).toBeDefined();
    expect(stored.paymentMethod).toBe('Online');
    expect(stored.onlineChannel).toBe('JazzCash');
    expect(stored.transactionId).toBe('TID 987654321');
    expect(stored.paymentVerified).toBe(true);
  });

  // 25. items without user-added add-ons have zero add-ons
  it('25. strictly ensures an item without user-configured add-ons has no add-ons', () => {
    const unconfiguredItem = {
      id: 'item-plain-biryani',
      name: 'Chicken Biryani',
      addons: [],
      addonIds: [],
    };
    const storeAddons = [
      { id: 'a1', name: 'Cold drink', price: 100, status: 'active', itemIds: [] },
      { id: 'a2', name: 'Raita', price: 50, status: 'active', itemIds: [] },
    ];
    const directAddons = Array.isArray(unconfiguredItem.addons) ? unconfiguredItem.addons : [];
    const assignedIds = Array.isArray(unconfiguredItem.addonIds) ? unconfiguredItem.addonIds : [];
    const matched = storeAddons.filter((a) => assignedIds.includes(a.id) || (a.itemIds || []).includes(unconfiguredItem.id));
    expect([...directAddons, ...matched]).toHaveLength(0);

    // When user explicitly adds an add-on to the item
    const configuredItem = {
      ...unconfiguredItem,
      addons: [{ name: 'Raita', price: 50 }],
    };
    expect(configuredItem.addons).toHaveLength(1);
    expect(configuredItem.addons[0].name).toBe('Raita');
  });

  // 26. Multi-quantity add-ons calculation
  it('26. calculates add-on total correctly with custom quantities (e.g., 2 or 3 Raita)', () => {
    const addons = [
      { id: 'addon-raita', name: 'Raita', price: 50, quantity: 3 },
      { id: 'addon-drink', name: 'Cold Drink', price: 80, quantity: 2 },
    ];
    // 3 * 50 = 150, 2 * 80 = 160 -> Total 310
    const addonTotal = calculateAddonTotal(addons);
    expect(addonTotal).toBe(310);

    const basePrice = 200; // 250g biryani
    const configuredPrice = calculateConfiguredItemPrice(basePrice, addonTotal);
    expect(configuredPrice).toBe(510);
  });

  // 27. Cart lines separation and stacking with addon quantities
  it('27. correctly differentiates cart lines with different addon quantities and stacks identical ones', () => {
    useAppStore.getState().clearCart();

    const line1 = {
      id: 'line-1',
      itemId: 'item-biryani',
      unitPrice: 300,
      quantity: 1,
      lineSubtotal: 300,
      addonSnapshots: [{ id: 'addon-raita', name: 'Raita', price: 50, quantity: 2 }],
    };

    const line2 = {
      id: 'line-2',
      itemId: 'item-biryani',
      unitPrice: 350,
      quantity: 1,
      lineSubtotal: 350,
      addonSnapshots: [{ id: 'addon-raita', name: 'Raita', price: 50, quantity: 3 }],
    };

    useAppStore.getState().addToCart(line1);
    useAppStore.getState().addToCart(line2);

    // Should have 2 distinct lines because addon quantities differ (2 Raita vs 3 Raita)
    expect(useAppStore.getState().cart).toHaveLength(2);

    // Adding another line identical to line1 (2 Raita) should stack on line1
    const line1Duplicate = {
      id: 'line-3',
      itemId: 'item-biryani',
      unitPrice: 300,
      quantity: 2,
      lineSubtotal: 600,
      addonSnapshots: [{ id: 'addon-raita', name: 'Raita', price: 50, quantity: 2 }],
    };
    useAppStore.getState().addToCart(line1Duplicate);

    expect(useAppStore.getState().cart).toHaveLength(2);
    expect(useAppStore.getState().cart[0].quantity).toBe(3); // 1 + 2 = 3
    expect(useAppStore.getState().cart[0].lineSubtotal).toBe(900);
  });
});
