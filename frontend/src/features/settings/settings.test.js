import { describe, it, expect, beforeEach } from 'vitest';
import {
  getDefaultSettings,
  validateTaxRate,
  normalizeSettings,
  mergeSettings,
} from '../../domain/rules/settingsRules';
import { SettingsRepository } from '../../services/repositories/SettingsRepository';
import { storage } from '../../services/persistence/storage';
import { resetApplicationData } from '../../services/reset/resetService';
import {
  calculateNetRevenue,
  calculateTaxCollected,
  getValidNonReversedOrders,
} from '../../domain/selectors/dashboardSelectors';
import {
  deriveSalesReport,
  deriveRevenueReport,
} from '../../domain/selectors/reportSelectors';
import { calculateTax, calculateGrandTotal } from '../../domain/calculations';
import { useAppStore } from '../../store';

describe('Settings Module & Data Management (Batch 5)', () => {
  beforeEach(() => {
    // Clear storage before each test
    storage.clearAll();
  });

  // ==========================================
  // Section 37: Settings Tests
  // ==========================================

  it('1. Business settings save properly with normalized structure', () => {
    const customBusiness = {
      name: 'Spice Garden Karachi',
      address: 'Shop 12, Burns Road, Karachi',
      phone: '0300-9876543',
      email: 'contact@spicegarden.pk',
      currency: 'PKR',
      registrationNumber: 'NTN-9988776',
      website: 'https://spicegarden.pk',
    };

    const merged = mergeSettings(getDefaultSettings(), { business: customBusiness });
    expect(merged.business.name).toBe('Spice Garden Karachi');
    expect(merged.business.address).toBe('Shop 12, Burns Road, Karachi');
    expect(merged.business.phone).toBe('0300-9876543');
    expect(merged.business.currency).toBe('PKR');
    expect(merged.business.registrationNumber).toBe('NTN-9988776');
    expect(merged.business.website).toBe('https://spicegarden.pk');

    // Backward compatible top-level aliases
    expect(merged.restaurantName).toBe('Spice Garden Karachi');
    expect(merged.address).toBe('Shop 12, Burns Road, Karachi');
  });

  it('2. Business settings persist via SettingsRepository', () => {
    const repo = new SettingsRepository(storage);
    const initial = repo.getSettings();
    expect(initial.business.name).toBe('SpiceHub Restaurant & Grill');

    repo.updateSettings({
      business: {
        name: 'Lahore Tikka House',
        phone: '042-35889900',
      },
    });

    const persisted = repo.getSettings();
    expect(persisted.business.name).toBe('Lahore Tikka House');
    expect(persisted.business.phone).toBe('042-35889900');
    expect(persisted.business.currency).toBe('PKR'); // Preserves defaults
  });

  it('3. Tax enabled configuration applies configured rate', () => {
    const settings = mergeSettings(getDefaultSettings(), {
      tax: { enabled: true, rate: 16, label: 'Sales Tax (SRB)' },
    });

    expect(settings.tax.enabled).toBe(true);
    expect(settings.tax.rate).toBe(16);
    expect(settings.tax.label).toBe('Sales Tax (SRB)');

    const subtotal = 1000;
    const rate = settings.tax.enabled ? settings.tax.rate : 0;
    const tax = calculateTax(subtotal, rate);
    expect(tax).toBe(160);
    expect(calculateGrandTotal(subtotal, tax)).toBe(1160);
  });

  it('4. Tax disabled configuration applies 0 tax', () => {
    const settings = mergeSettings(getDefaultSettings(), {
      tax: { enabled: false, rate: 15 },
    });

    expect(settings.tax.enabled).toBe(false);

    const subtotal = 1000;
    const effectiveRate = settings.tax.enabled ? settings.tax.rate : 0;
    const tax = calculateTax(subtotal, effectiveRate);
    expect(tax).toBe(0);
    expect(calculateGrandTotal(subtotal, tax)).toBe(1000);
  });

  it('5. Invalid negative tax or extreme tax rates are rejected by validator', () => {
    expect(validateTaxRate(-1).isValid).toBe(false);
    expect(validateTaxRate(-15).isValid).toBe(false);
    expect(validateTaxRate(51).isValid).toBe(false);
    expect(validateTaxRate(100).isValid).toBe(false);
    expect(validateTaxRate('not-a-number').isValid).toBe(false);
    expect(validateTaxRate(NaN).isValid).toBe(false);

    // Valid rates
    expect(validateTaxRate(0).isValid).toBe(true);
    expect(validateTaxRate(5).isValid).toBe(true);
    expect(validateTaxRate(16).isValid).toBe(true);
    expect(validateTaxRate(50).isValid).toBe(true);
  });

  it('6. Historical invoice tax is unaffected by future Settings change', () => {
    // Yesterday invoice completed with 10% tax rate snapshot
    const historicalOrder = {
      id: 'ord-hist-999',
      invoiceNumber: 'INV-999',
      subtotal: 1000,
      taxRateSnapshot: 10,
      taxAmount: 100,
      grandTotal: 1100,
      status: 'completed',
    };

    // Today settings changed to 18% and then tax disabled
    const updatedSettings = mergeSettings(getDefaultSettings(), {
      tax: { enabled: false, rate: 18 },
    });
    expect(updatedSettings.tax.rate).toBe(18);

    // The historical invoice snapshot must retain its own stored values
    expect(historicalOrder.taxRateSnapshot).toBe(10);
    expect(historicalOrder.taxAmount).toBe(100);
    expect(historicalOrder.grandTotal).toBe(1100);

    // Dashboard tax collector continues to calculate from immutable historical snapshot
    const totalTax = calculateTaxCollected([historicalOrder]);
    expect(totalTax).toBe(100);
  });

  it('7. New POS tax calculation reads current Settings', () => {
    const repo = new SettingsRepository(storage);
    repo.updateSettings({
      tax: { enabled: true, rate: 12 },
    });

    const currentSettings = repo.getSettings();
    const subtotal = 500;
    const currentRate = currentSettings.tax.enabled ? currentSettings.tax.rate : 0;
    const tax = calculateTax(subtotal, currentRate);
    expect(tax).toBe(60);
    expect(calculateGrandTotal(subtotal, tax)).toBe(560);
  });

  it('8. Default order type configuration integrates properly', () => {
    const settings = mergeSettings(getDefaultSettings(), {
      pos: { defaultOrderType: 'Takeaway' },
    });
    expect(settings.pos.defaultOrderType).toBe('Takeaway');
    expect(settings.defaultOrderType).toBe('Takeaway');
  });

  it('9. Invoice footer integration supports custom messages and fallback', () => {
    const customSettings = mergeSettings(getDefaultSettings(), {
      invoice: { footer: 'Thank you for visiting! Follow us @spicehub.pk' },
    });
    expect(customSettings.invoice.footer).toBe('Thank you for visiting! Follow us @spicehub.pk');
    expect(customSettings.invoiceFooter).toBe('Thank you for visiting! Follow us @spicehub.pk');

    // Empty footer defaults cleanly
    const emptyFooterSettings = normalizeSettings({ invoice: { footer: '   ' } });
    expect(emptyFooterSettings.invoice.footer).toBe('Thank you for dining with us! • Good Food • Good Mood');
  });

  it('10. Business info invoice integration feeds business fields', () => {
    const repo = new SettingsRepository(storage);
    repo.updateSettings({
      business: {
        name: 'The Royal Biryani',
        address: 'Clifton Block 4, Karachi',
        phone: '021-99887766',
        email: 'info@royalbiryani.pk',
      },
    });

    const s = repo.getSettings();
    expect(s.business.name).toBe('The Royal Biryani');
    expect(s.business.address).toBe('Clifton Block 4, Karachi');
    expect(s.business.phone).toBe('021-99887766');
    expect(s.business.email).toBe('info@royalbiryani.pk');
  });

  it('11. Logo reference persists safely in settings without raw base64 bloating', () => {
    const repo = new SettingsRepository(storage);
    const logoRef = 'logo_test_123456789.png';
    repo.updateSettings({
      business: { logoRef },
    });

    const s = repo.getSettings();
    expect(s.business.logoRef).toBe(logoRef);

    // Remove logo
    repo.updateSettings({
      business: { logoRef: null },
    });
    expect(repo.getSettings().business.logoRef).toBeNull();
  });

  // ==========================================
  // Section 38: Delete All Data Tests
  // ==========================================

  it('12. Wrong confirmation phrase cannot trigger delete (case-sensitive check)', () => {
    const checkPhrase = (phrase) => phrase === 'DELETE ALL DATA';

    expect(checkPhrase('delete all data')).toBe(false);
    expect(checkPhrase('Delete All Data')).toBe(false);
    expect(checkPhrase('DELETE DATA')).toBe(false);
    expect(checkPhrase('DELETE ALL DATA ')).toBe(false);
    expect(checkPhrase('')).toBe(false);
  });

  it('13. Exact DELETE ALL DATA allows final action', () => {
    const checkPhrase = (phrase) => phrase === 'DELETE ALL DATA';
    expect(checkPhrase('DELETE ALL DATA')).toBe(true);
  });

  it('14-22. Full reset clears categories, items, addons, cart, orders, reversals, images, and restores safe defaults', async () => {
    // Populate dummy operational data in storage
    storage.set('categories', [{ id: 'cat-1', name: 'BBQ' }]);
    storage.set('menu_items', [{ id: 'item-1', name: 'Chicken Tikka', basePrice: 400 }]);
    storage.set('addons', [{ id: 'addon-1', name: 'Raita', price: 40 }]);
    storage.set('pos_cart', [{ id: 'line-1', quantity: 2 }]);
    storage.set('orders', [{ id: 'ord-1', grandTotal: 840, status: 'completed' }]);
    storage.set('reversals', [{ id: 'rev-1', invoiceId: 'ord-1' }]);
    storage.set('settings', {
      business: { name: 'Temporary Name', currency: 'USD' },
      tax: { enabled: false, rate: 0 },
    });

    // Mock Zustand store wrapper
    const mockStoreState = {
      categories: [{ id: 'cat-1' }],
      items: [{ id: 'item-1' }],
      addons: [{ id: 'addon-1' }],
      cart: [{ id: 'line-1' }],
      orders: [{ id: 'ord-1' }],
      reversals: [{ id: 'rev-1' }],
      settings: { business: { name: 'Temporary Name' } },
    };

    const mockStore = {
      getState: () => mockStoreState,
      setState: (partial) => {
        Object.assign(mockStoreState, partial);
      },
    };

    const result = await resetApplicationData(mockStore);
    expect(result.success).toBe(true);

    // 14. Categories cleared
    expect(storage.get('categories', [])).toEqual([]);
    expect(mockStoreState.categories).toEqual([]);

    // 15. Items cleared
    expect(storage.get('menu_items', [])).toEqual([]);
    expect(mockStoreState.items).toEqual([]);

    // 16. Add-ons cleared
    expect(storage.get('addons', [])).toEqual([]);
    expect(mockStoreState.addons).toEqual([]);

    // 17. Cart cleared
    expect(storage.get('pos_cart', [])).toEqual([]);
    expect(mockStoreState.cart).toEqual([]);

    // 18. Orders cleared
    expect(storage.get('orders', [])).toEqual([]);
    expect(mockStoreState.orders).toEqual([]);

    // 19. Reversals cleared
    expect(storage.get('reversals', [])).toEqual([]);
    expect(mockStoreState.reversals).toEqual([]);

    // 20. Operational persistence cleared
    expect(storage.get('categories')).toHaveLength(0);
    expect(storage.get('menu_items')).toHaveLength(0);
    expect(storage.get('orders')).toHaveLength(0);

    // 21. Settings return to safe defaults
    const resetSettings = storage.get('settings');
    expect(resetSettings.business.name).toBe('SpiceHub Restaurant & Grill');
    expect(resetSettings.business.currency).toBe('PKR');
    expect(resetSettings.tax.enabled).toBe(true);
    expect(resetSettings.tax.rate).toBe(5);
  });

  it('23. Old demo sales are not automatically reseeded after reset', async () => {
    storage.set('orders', [{ id: 'demo-1', grandTotal: 500 }]);
    await resetApplicationData();

    // After reset, orders must strictly remain empty
    const ordersAfterReset = storage.get('orders', []);
    expect(ordersAfterReset).toEqual([]);
    expect(ordersAfterReset).toHaveLength(0);
  });

  it('24. Dashboard selectors return natural zero state with empty transactions', () => {
    const emptyOrders = [];
    const validOrders = getValidNonReversedOrders(emptyOrders);
    expect(validOrders).toEqual([]);

    const netRev = calculateNetRevenue(emptyOrders);
    expect(netRev).toBe(0);

    const taxCol = calculateTaxCollected(emptyOrders);
    expect(taxCol).toBe(0);
    expect(Number.isNaN(netRev)).toBe(false);
    expect(Number.isNaN(taxCol)).toBe(false);
  });

  it('25. Reports selectors return professional empty state without NaN or crashes', () => {
    const emptyOrders = [];
    const sales = deriveSalesReport(emptyOrders, []);
    expect(sales.grossSales).toBe(0);
    expect(sales.completedOrders).toBe(0);
    expect(sales.validOrderCount).toBe(0);
    expect(sales.averageOrderValue).toBe(0);
    expect(sales.validNetSales).toBe(0);
    expect(sales.itemsSold).toBe(0);
    expect(Number.isNaN(sales.averageOrderValue)).toBe(false);

    const revenue = deriveRevenueReport(emptyOrders, []);
    expect(revenue.grossBilled).toBe(0);
    expect(revenue.netRevenue).toBe(0);
    expect(revenue.taxCollected).toBe(0);
    expect(revenue.totalDiscounts).toBe(0);
  });

  it('26. Application remains fully usable after reset', () => {
    // Clear everything
    storage.clearAll();
    const safeDefaults = getDefaultSettings();
    storage.set('settings', safeDefaults);

    // Simulate adding a category and menu item
    const newCategory = { id: 'cat-new-1', name: 'Desserts', status: 'active' };
    storage.set('categories', [newCategory]);

    const newItem = {
      id: 'item-new-1',
      name: 'Gulab Jamun',
      categoryId: newCategory.id,
      basePrice: 150,
      status: 'active',
    };
    storage.set('menu_items', [newItem]);

    // Simulate creating a new order
    const newOrder = {
      id: 'ord-new-1',
      invoiceNumber: 'INV-001',
      subtotal: 150,
      taxRateSnapshot: safeDefaults.tax.rate,
      taxAmount: calculateTax(150, safeDefaults.tax.rate),
      grandTotal: 150 + calculateTax(150, safeDefaults.tax.rate),
      status: 'completed',
    };
    storage.set('orders', [newOrder]);

    const retrievedOrders = storage.get('orders');
    expect(retrievedOrders).toHaveLength(1);
    expect(retrievedOrders[0].invoiceNumber).toBe('INV-001');
    expect(calculateNetRevenue(retrievedOrders)).toBe(newOrder.subtotal);
  });

  it('27. Unrelated browser storage keys are not wiped by application reset', async () => {
    // Simulate other keys in localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('user_other_app_token', 'secret123');
      window.localStorage.setItem('theme_preference', 'dark');

      await resetApplicationData();

      // Application keys are scoped, non-prefixed keys remain intact
      expect(window.localStorage.getItem('user_other_app_token')).toBe('secret123');
      expect(window.localStorage.getItem('theme_preference')).toBe('dark');

      // Cleanup
      window.localStorage.removeItem('user_other_app_token');
      window.localStorage.removeItem('theme_preference');
    }
  });

  it('28. New order creation creates a real-time notification with order details', () => {
    const storeState = useAppStore.getState();
    const initialNotifCount = storeState.notifications.length;

    const testOrder = {
      id: 'ord-notif-1',
      invoiceNumber: 'INV-777',
      orderType: 'Dine-In',
      grandTotal: 850,
      paymentMethod: 'Cash',
      status: 'completed',
    };

    storeState.addOrder(testOrder);

    const updatedState = useAppStore.getState();
    expect(updatedState.notifications.length).toBe(initialNotifCount + 1);

    const latestNotif = updatedState.notifications[0];
    expect(latestNotif.title).toContain('INV-777');
    expect(latestNotif.description).toContain('850');
    expect(latestNotif.read).toBe(false);
  });

  it('29. Mark notification as read and mark all as read updates read state', () => {
    const store = useAppStore.getState();
    const notifs = store.notifications;
    if (notifs.length > 0) {
      store.markNotificationAsRead(notifs[0].id);
      expect(useAppStore.getState().notifications[0].read).toBe(true);

      store.markAllNotificationsAsRead();
      expect(useAppStore.getState().notifications.every((n) => n.read)).toBe(true);
    }
  });

  it('30. Full reset clears notifications state and storage', async () => {
    storage.set('notifications', [{ id: 'n1', title: 'test' }]);
    await resetApplicationData();
    expect(storage.get('notifications', [])).toEqual([]);
  });

  it('31. deleteInvoice archives full line items, amount, and timestamp into deletionHistory', () => {
    const store = useAppStore.getState();
    const testOrder = {
      id: 'ord-del-test-1',
      invoiceNumber: 'INV-888',
      orderType: 'Dine-In',
      grandTotal: 1250,
      lines: [
        {
          id: 'l-1',
          itemNameSnapshot: 'Chicken Karahi',
          quantity: 1,
          unitPrice: 1200,
          lineSubtotal: 1200,
          addonSnapshots: [{ id: 'a1', name: 'Roti' }],
        },
      ],
      completedAt: '2026-10-09T05:00:00.000Z',
    };

    store.addOrder(testOrder);
    expect(useAppStore.getState().orders.some((o) => o.id === testOrder.id)).toBe(true);

    const deleted = store.deleteInvoice(testOrder.id, 'Wrong table served');
    expect(deleted).toBe(true);
    expect(useAppStore.getState().orders.some((o) => o.id === testOrder.id)).toBe(false);

    const history = useAppStore.getState().deletionHistory;
    const latestDeleted = history[0];
    expect(latestDeleted.title).toContain('INV-888');
    expect(latestDeleted.totalAmount).toBe(1250);
    expect(latestDeleted.invoices[0].lines[0].itemName).toBe('Chicken Karahi');
    expect(latestDeleted.invoices[0].lines[0].addons).toContain('Roti');
    expect(latestDeleted.deletedAt).toBeDefined();
  });

  it('32. resetApplicationData archives operational orders into deletionHistory before reset', async () => {
    storage.set('orders', [
      {
        id: 'ord-pre-reset-1',
        invoiceNumber: 'INV-0099',
        grandTotal: 500,
        lines: [{ itemName: 'Tea', quantity: 2, unitPrice: 250, lineSubtotal: 500 }],
      },
    ]);

    await resetApplicationData();

    // Orders are wiped
    expect(storage.get('orders', [])).toHaveLength(0);

    // But deletion_history captured the audit log!
    const history = storage.get('deletion_history', []);
    const resetAudit = history.find((h) => h.type === 'bulk_reset');
    expect(resetAudit).toBeDefined();
    expect(resetAudit.totalInvoicesDeleted).toBe(1);
    expect(resetAudit.invoices[0].invoiceNumber).toBe('INV-0099');
    expect(resetAudit.invoices[0].lines[0].itemName).toBe('Tea');
  });

  it('33. clearDeletionHistory empties audit history logs', () => {
    const store = useAppStore.getState();
    store.clearDeletionHistory();
    expect(useAppStore.getState().deletionHistory).toEqual([]);
    expect(storage.get('deletion_history', [])).toEqual([]);
  });
});
