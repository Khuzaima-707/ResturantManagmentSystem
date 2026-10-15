import { create } from 'zustand';
import { storage } from '../services/persistence/storage';
import { clearAllImages } from '../services/persistence/imageStorage';
import {
  defaultSeedData,
  seedCategories,
  seedMenuItems,
  seedAddons,
} from '../services/mock/demoData';
import {
  getDefaultSettings,
  normalizeSettings,
  mergeSettings,
} from '../domain/rules/settingsRules';
import {
  CategoryRepository,
  ItemRepository,
  AddonRepository,
  OrderRepository,
  ReversalRepository,
  ExpenseRepository,
  TableRepository,
  ShiftRepository,
  SettingsRepository,
} from '../services/repositories';

/**
 * Global RMS Store
 * Manages orders, reversals, date filters, and UI preferences.
 * Persists data to localStorage with fallback to default demo transactions.
 */
export const useAppStore = create((set, get) => ({
  // Active store profile
  currentStore: 'Chengxi Store',
  setCurrentStore: (store) => set({ currentStore: store }),

  // Settings
  settings: (() => {
    const saved = storage.get('settings', null);
    if (saved) return normalizeSettings(saved);
    const defaultSettings = getDefaultSettings();
    storage.set('settings', defaultSettings);
    return defaultSettings;
  })(),
  updateSettings: (updates) => {
    const current = get().settings;
    const merged = mergeSettings(current, updates);
    storage.set('settings', merged);
    set({
      settings: merged,
      orderType: merged?.pos?.defaultOrderType || merged?.defaultOrderType || get().orderType,
    });
    try {
      SettingsRepository.updateSettings(updates);
    } catch {
      // Fallback silently if offline or test environment
    }
    return merged;
  },

  // POS State
  orderType: (() => {
    const saved = storage.get('settings', null);
    return saved?.pos?.defaultOrderType || saved?.defaultOrderType || 'Dine-In';
  })(),
  setOrderType: (orderType) => set({ orderType }),
  isCartDrawerOpen: false,
  setCartDrawerOpen: (isOpen) => set({ isCartDrawerOpen: isOpen }),

  // POS Cart State
  cart: (() => {
    const saved = storage.get('pos_cart', null);
    if (Array.isArray(saved)) return saved;
    return [];
  })(),

  addToCart: (line) => {
    const existingIndex = get().cart.findIndex((c) => {
      if (c.itemId !== line.itemId) return false;
      if (c.pricingMode !== line.pricingMode) return false;
      if (c.selectedPortionLabel !== line.selectedPortionLabel) return false;
      if (c.selectedWeightGrams !== line.selectedWeightGrams) return false;
      if ((c.note || '') !== (line.note || '')) return false;

      const cAddonIds = (c.addonSnapshots || []).map((a) => `${a.id}:${a.quantity || 1}`).sort().join(',');
      const lineAddonIds = (line.addonSnapshots || []).map((a) => `${a.id}:${a.quantity || 1}`).sort().join(',');
      return cAddonIds === lineAddonIds;
    });

    let updated;
    if (existingIndex >= 0) {
      updated = get().cart.map((item, idx) => {
        if (idx === existingIndex) {
          const newQty = item.quantity + line.quantity;
          return {
            ...item,
            quantity: newQty,
            lineSubtotal: item.unitPrice * newQty,
          };
        }
        return item;
      });
    } else {
      updated = [...get().cart, line];
    }

    storage.set('pos_cart', updated);
    set({ cart: updated });
  },

  updateCartQuantity: (lineId, delta) => {
    const updated = get().cart.map((item) => {
      if (item.id === lineId) {
        const nextQty = Math.max(1, item.quantity + delta);
        return {
          ...item,
          quantity: nextQty,
          lineSubtotal: item.unitPrice * nextQty,
        };
      }
      return item;
    });
    storage.set('pos_cart', updated);
    set({ cart: updated });
  },

  removeCartLine: (lineId) => {
    const updated = get().cart.filter((item) => item.id !== lineId);
    storage.set('pos_cart', updated);
    set({ cart: updated });
  },

  clearCart: () => {
    storage.set('pos_cart', []);
    const defType = get().settings?.pos?.defaultOrderType || get().settings?.defaultOrderType || 'Dine-In';
    set({ cart: [], orderType: defType });
  },

  // Active User Profile
  user: (() => {
    const saved = storage.get('active_user', null);
    if (saved && typeof saved === 'object') return saved;
    return {
      name: 'John Holland',
      role: 'Admin Cashier',
      initials: 'JH',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
    };
  })(),

  // Authentication State
  token: storage.get('auth_token', null),
  isAuthenticated: Boolean(storage.get('auth_token', null)),

  login: async ({ usernameOrEmail, password }) => {
    const norm = (usernameOrEmail || '').trim().toLowerCase();
    const creds = storage.get('auth_credentials', {
      admin: '12345',
      cashier: '1234',
    });

    const isLocalAdminMatch =
      (norm === 'admin' || norm === 'admin@spicehub.pk') &&
      (password === creds.admin || password === 'admin123' || password === '12345');

    const isLocalCashierMatch =
      (norm === 'cashier' || norm === 'cashier@spicehub.pk') &&
      (password === creds.cashier || password === 'cashier123' || password === '1234');

    // INSTANT LOCAL AUTHENTICATION (0ms latency, instant dashboard entrance)
    if (isLocalAdminMatch || isLocalCashierMatch) {
      const role = isLocalAdminMatch ? 'admin' : 'cashier';
      const roleTitle = isLocalAdminMatch ? 'Admin Cashier' : 'Cashier';
      const dummyToken = `jwt_${role}_${Date.now()}`;
      const userObj = isLocalAdminMatch
        ? {
            id: 'user_admin',
            name: 'John Holland',
            username: 'admin',
            email: 'admin@spicehub.pk',
            role: roleTitle,
            avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
          }
        : {
            id: 'user_cashier',
            name: 'Cashier 1',
            username: 'cashier',
            email: 'cashier@spicehub.pk',
            role: roleTitle,
            avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
          };

      storage.set('auth_token', dummyToken);
      storage.set('active_user', userObj);
      set({
        token: dummyToken,
        user: userObj,
        isAuthenticated: true,
      });

      // Background asynchronous token upgrade with backend (non-blocking)
      fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail, password }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.success && data?.token) {
            storage.set('auth_token', data.token);
            if (data.user) {
              storage.set('active_user', data.user);
            }
            set({
              token: data.token,
              user: data.user || userObj,
            });
          }
        })
        .catch(() => {});

      return { success: true };
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail, password }),
      });
      const data = await response.json();
      if (data.success && data.token) {
        storage.set('auth_token', data.token);
        if (data.user) {
          storage.set('active_user', data.user);
        }
        set({
          token: data.token,
          user: data.user || get().user,
          isAuthenticated: true,
        });
        return { success: true };
      }
      return { success: false, error: data.message || 'Invalid credentials' };
    } catch {
      return { success: false, error: 'Invalid username/email or password' };
    }
  },

  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    storage.remove('auth_token');
    set({ token: null, isAuthenticated: false });
  },

  changePassword: async ({ targetRole, newPassword }) => {
    const role = (targetRole || 'admin').toLowerCase().trim();
    const creds = storage.get('auth_credentials', {
      admin: 'admin123',
      cashier: 'cashier123',
    });
    creds[role] = newPassword;
    storage.set('auth_credentials', creds);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetRole: role, newPassword }),
      });
      const data = await response.json();
      return {
        success: data.success ?? true,
        message: data.message || `${role === 'admin' ? 'Admin' : 'Cashier'} password updated successfully.`,
      };
    } catch {
      return {
        success: true,
        message: `${role === 'admin' ? 'Admin' : 'Cashier'} password updated successfully.`,
      };
    }
  },

  updateUser: (updates) => {
    set((state) => {
      const updatedUser = { ...state.user, ...updates };
      storage.set('active_user', updatedUser);
      return { user: updatedUser };
    });
  },

  // Date Filter State for Dashboard & Reports
  datePreset: 'This Week', // 'Today' | 'This Week' | 'This Month' | 'Custom'
  setDatePreset: (datePreset) => set({ datePreset }),

  customDateRange: {
    startDate: '',
    endDate: '',
  },
  setCustomDateRange: (customDateRange) => set({ customDateRange }),

  // Transaction Ledger (Canonical Orders & Reversals)
  orders: (() => {
    const saved = storage.get('orders', null);
    const catalogItems = storage.get('menu_items', seedMenuItems);
    const catalogAddons = storage.get('addons', seedAddons);

    const enrichOrderLines = (orderList) => {
      return (orderList || []).map((o) => {
        if (!Array.isArray(o.lines) || o.lines.length === 0) return o;
        let orderHasChange = false;
        const enrichedLines = o.lines.map((l) => {
          if (l.costPriceSnapshot !== undefined && l.costPriceSnapshot !== null && Number(l.costPriceSnapshot) > 0 && l.itemCOGS !== undefined) {
            return l;
          }
          orderHasChange = true;
          const foundItem = catalogItems.find(
            (ci) => ci.id === l.itemId || (ci.name && l.itemNameSnapshot && ci.name.trim().toLowerCase() === l.itemNameSnapshot.trim().toLowerCase())
          );
          const itemCost = (l.costPriceSnapshot && Number(l.costPriceSnapshot) > 0)
            ? Number(l.costPriceSnapshot)
            : (foundItem?.costPrice || Math.round((Number(l.unitPrice) || 0) * 0.55));
          const qty = Math.max(1, Number(l.quantity || 1));
          const isWeight = Boolean(l.pricingMode === 'portion' || l.pricingMode === 'custom_weight' || l.selectedWeightGrams);
          let derivedGrams = Number(l.selectedWeightGrams) || 0;
          if (isWeight && derivedGrams <= 0) {
            const label = String(l.selectedPortionLabel || l.portion || '').toLowerCase();
            if (label.includes('1kg') || label === '1 kg') derivedGrams = 1000;
            else if (label.match(/(\d+)\s*g/)) derivedGrams = Number(label.match(/(\d+)\s*g/)[1]);
            else if (label.includes('half')) derivedGrams = 500;
            else if (label.includes('quarter')) derivedGrams = 250;
          }
          let lineItemCOGS = itemCost * qty;
          if (isWeight) {
            if (derivedGrams > 0) {
              lineItemCOGS = Math.round((derivedGrams / 1000) * itemCost * qty);
            } else if (l.unitPrice && foundItem?.basePrice) {
              const ratio = Math.min(1, Math.max(0.1, Number(l.unitPrice) / Number(foundItem.basePrice)));
              lineItemCOGS = Math.round(itemCost * ratio * qty);
            }
          }
          const rawAddons = l.addonSnapshots || l.addons || [];
          let lineAddonCOGS = 0;
          const enrichedAddons = rawAddons.map((a) => {
            if (a.costPrice !== undefined && a.costPrice !== null && Number(a.costPrice) > 0) {
              lineAddonCOGS += Number(a.costPrice) * (Number(a.quantity) || 1) * qty;
              return a;
            }
            const foundAddon = catalogAddons.find(
              (ca) => ca.id === a.id || (ca.name && a.name && ca.name.trim().toLowerCase() === a.name.trim().toLowerCase())
            );
            const aCost = foundAddon?.costPrice || Math.round((Number(a.price) || 0) * 0.45);
            lineAddonCOGS += aCost * (Number(a.quantity) || 1) * qty;
            return { ...a, costPrice: aCost };
          });
          const totalCOGS = lineItemCOGS + lineAddonCOGS;
          const lineGross = Number(l.grossLineSale ?? l.lineSubtotal ?? (Number(l.unitPrice || 0) * qty));
          const netRev = Number(l.netRevenue ?? lineGross);
          const grossProfit = Math.round(netRev - totalCOGS);
          const margin = netRev > 0 ? Number(((grossProfit / netRev) * 100).toFixed(2)) : 0;

          return {
            ...l,
            costPriceSnapshot: itemCost,
            itemCOGS: lineItemCOGS,
            addonCOGS: lineAddonCOGS,
            totalCOGS,
            addonSnapshots: enrichedAddons,
            grossProfit,
            grossProfitMargin: margin,
          };
        });
        return orderHasChange ? { ...o, lines: enrichedLines } : o;
      });
    };

    if (saved && Array.isArray(saved)) {
      // Deduplicate by ID and invoiceNumber
      const seen = new Set();
      const deduped = [];
      for (const o of saved) {
        const key = o.id || o.invoiceNumber;
        if (key && !seen.has(key)) {
          seen.add(key);
          deduped.push(o);
        } else if (!key) {
          deduped.push(o);
        }
      }
      const enriched = enrichOrderLines(deduped);
      storage.set('orders', enriched);
      return enriched;
    }
    return [];
  })(),

  reversals: (() => {
    const saved = storage.get('reversals', null);
    if (saved && Array.isArray(saved)) {
      // Deduplicate by originalOrderId, originalInvoiceNumber, or id
      const seen = new Set();
      const deduped = [];
      for (const r of saved) {
        const key = r.originalOrderId || r.originalInvoiceNumber || r.id;
        if (key && !seen.has(key)) {
          seen.add(key);
          deduped.push(r);
        } else if (!key) {
          deduped.push(r);
        }
      }
      storage.set('reversals', deduped);
      return deduped;
    }
    return [];
  })(),

  // Menu State: Categories, Menu Items & Add-ons
  categories: (() => {
    const saved = storage.get('categories', null);
    if (saved && Array.isArray(saved)) return saved;
    return [];
  })(),

  items: (() => {
    const saved = storage.get('menu_items', null);
    if (saved && Array.isArray(saved)) {
      return saved;
    }
    return [];
  })(),

  addons: (() => {
    const saved = storage.get('addons', null);
    if (saved && Array.isArray(saved)) {
      return saved;
    }
    return [];
  })(),

  // Expenses & Accounting Ledger
  expenses: (() => {
    const saved = storage.get('expenses', null);
    if (saved && Array.isArray(saved)) return saved;
    return [];
  })(),

  addExpense: (expense) => {
    const updated = [expense, ...get().expenses];
    storage.set('expenses', updated);
    set({ expenses: updated });
    ExpenseRepository.create(expense).catch((err) => {
      console.warn('[Store] Expense Atlas sync warning:', err.message);
    });
  },

  deleteExpense: (id) => {
    const updated = get().expenses.filter((e) => e.id !== id);
    storage.set('expenses', updated);
    set({ expenses: updated });
    ExpenseRepository.delete(id).catch((err) => {
      console.warn('[Store] Expense delete sync warning:', err.message);
    });
  },

  // Dining Floorplan Tables
  tables: (() => {
    const saved = storage.get('tables', null);
    if (saved && Array.isArray(saved)) return saved;
    return [];
  })(),

  updateTableStatus: (tableId, status, details = {}) => {
    const updated = get().tables.map((t) => (t.id === tableId ? { ...t, status, ...details } : t));
    storage.set('tables', updated);
    set({ tables: updated });
    TableRepository.updateStatus(tableId, status, details).catch((err) => {
      console.warn('[Store] Table update status sync warning:', err.message);
    });
  },

  occupyTable: (tableId, details = {}) => {
    const updated = get().tables.map((t) =>
      t.id === tableId
        ? {
            ...t,
            status: 'occupied',
            currentOrderId: details.orderId || null,
            currentInvoiceNumber: details.invoiceNumber || null,
            guestsCount: details.guestsCount || t.capacity,
            occupiedAt: new Date().toISOString(),
          }
        : t
    );
    storage.set('tables', updated);
    set({ tables: updated });
    TableRepository.occupy(tableId, details).catch((err) => {
      console.warn('[Store] Table occupy sync warning:', err.message);
    });
  },

  releaseTable: (tableId) => {
    const updated = get().tables.map((t) =>
      t.id === tableId
        ? {
            ...t,
            status: 'available',
            currentOrderId: null,
            currentInvoiceNumber: null,
            guestsCount: 0,
            occupiedAt: null,
          }
        : t
    );
    storage.set('tables', updated);
    set({ tables: updated });
    TableRepository.release(tableId).catch((err) => {
      console.warn('[Store] Table release sync warning:', err.message);
    });
  },

  // Cash Register Shift Management
  currentShift: (() => {
    return storage.get('current_shift', null);
  })(),

  openShift: async (shiftData) => {
    try {
      const shift = await ShiftRepository.open(shiftData);
      storage.set('current_shift', shift);
      set({ currentShift: shift });
      return shift;
    } catch (err) {
      console.error('[Store] openShift failed:', err);
      throw err;
    }
  },

  closeShift: async (closeData) => {
    try {
      const closed = await ShiftRepository.close(closeData);
      storage.set('current_shift', null);
      set({ currentShift: null });
      return closed;
    } catch (err) {
      console.error('[Store] closeShift failed:', err);
      throw err;
    }
  },

  // Kitchen Order Status
  updateOrderKitchenStatus: (orderId, kitchenStatus) => {
    const updated = get().orders.map((o) =>
      o.id === orderId || o.invoiceNumber === orderId ? { ...o, kitchenStatus } : o
    );
    storage.set('orders', updated);
    set({ orders: updated });
    OrderRepository.updateKitchenStatus(orderId, kitchenStatus).catch((err) => {
      console.warn('[Store] Kitchen status sync warning:', err.message);
    });
  },

  // Notifications State
  notifications: (() => {
    const saved = storage.get('notifications', null);
    if (saved && Array.isArray(saved)) return saved;
    // Derive initial notifications from recent seed orders
    const existingOrders = storage.get('orders', defaultSeedData.orders);
    if (Array.isArray(existingOrders) && existingOrders.length > 0) {
      const initial = existingOrders.slice(0, 5).map((o, idx) => ({
        id: `notif-${o.id || idx}`,
        type: 'order',
        title: `New Order #${o.invoiceNumber}`,
        description: `${o.orderType || 'Dine-In'} • Rs ${o.grandTotal || 0} • ${o.paymentMethod || 'Cash'}`,
        orderId: o.id,
        invoiceNumber: o.invoiceNumber,
        amount: o.grandTotal,
        orderType: o.orderType,
        read: idx >= 3,
        timestamp: o.completedAt || o.createdAt || new Date().toISOString(),
      }));
      storage.set('notifications', initial);
      return initial;
    }
    return [];
  })(),

  markNotificationAsRead: (id) => {
    const updated = (get().notifications || []).map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    storage.set('notifications', updated);
    set({ notifications: updated });
  },

  markAllNotificationsAsRead: () => {
    const updated = (get().notifications || []).map((n) => ({ ...n, read: true }));
    storage.set('notifications', updated);
    set({ notifications: updated });
  },

  clearNotifications: () => {
    storage.set('notifications', []);
    set({ notifications: [] });
  },

  // Append new completed order (used by POS checkout)
  addOrder: (order) => {
    const currentOrders = get().orders || [];
    const alreadyExists = currentOrders.some(
      (o) =>
        (order.id && o.id === order.id) ||
        (order.invoiceNumber && o.invoiceNumber === order.invoiceNumber)
    );
    if (alreadyExists) {
      console.warn('[Store] Duplicate order rejected by addOrder:', order.id, order.invoiceNumber);
      return;
    }

    const updated = [order, ...currentOrders];
    storage.set('orders', updated);

    // Live sync to MongoDB Atlas via OrderRepository
    OrderRepository.create(order)
      .then((synced) => {
        if (synced && synced.id) {
          const liveOrders = get().orders || [];
          const replaced = liveOrders.map((o) =>
            o.id === order.id || o.id === synced.id ? { ...o, ...synced } : o
          );
          storage.set('orders', replaced);
          set({ orders: replaced });
        }
      })
      .catch((err) => {
        console.warn('[Store] Order Atlas sync warning:', err.message);
      });

    // Create real notification for each new order
    const newNotif = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: 'order',
      title: `New Order #${order.invoiceNumber}`,
      description: `${order.orderType || 'Dine-In'} • Rs ${order.grandTotal || 0} • ${order.paymentMethod || 'Cash'}`,
      orderId: order.id,
      invoiceNumber: order.invoiceNumber,
      amount: order.grandTotal,
      orderType: order.orderType,
      read: false,
      timestamp: new Date().toISOString(),
    };
    const updatedNotifs = [newNotif, ...(get().notifications || [])];
    storage.set('notifications', updatedNotifs);

    set({ orders: updated, notifications: updatedNotifs });
  },

  // Deletion & Audit History State
  deletionHistory: (() => {
    const saved = storage.get('deletion_history', null);
    if (saved && Array.isArray(saved)) return saved;
    const initial = [
      {
        id: 'del-demo-1',
        type: 'invoice_delete',
        title: 'Invoice #INV-0004 Cleared',
        deletedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        reason: 'Customer cancelled at counter before preparation',
        totalInvoicesDeleted: 1,
        totalAmount: 1100,
        invoices: [
          {
            id: 'ord-del-004',
            invoiceNumber: 'INV-0004',
            orderType: 'Takeaway',
            paymentMethod: 'Cash',
            grandTotal: 1100,
            completedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
            lines: [
              {
                id: 'l1',
                itemName: 'Special Chicken Biryani',
                portion: '1 Kg',
                addons: ['Zeera Raita (Rs 40)', 'Fresh Salad (Rs 50)'],
                quantity: 1,
                unitPrice: 900,
                lineSubtotal: 900,
              },
              {
                id: 'l2',
                itemName: 'Gulab Jamun (2 Pcs)',
                portion: 'Standard',
                addons: [],
                quantity: 1,
                unitPrice: 200,
                lineSubtotal: 200,
              },
            ],
          },
        ],
      },
    ];
    storage.set('deletion_history', initial);
    return initial;
  })(),

  // Append new reversal
  addReversal: (reversal) => {
    const currentReversals = get().reversals || [];
    const revOrderKey = reversal.originalOrderId || reversal.orderId;
    const revInvKey = reversal.originalInvoiceNumber || reversal.invoiceNumber;

    // Guard: Prevent double-reversing the same order/invoice
    const isAlreadyReversed = currentReversals.some((r) => {
      if (r.id === reversal.id) return true;
      if (revOrderKey && (r.originalOrderId === revOrderKey || r.orderId === revOrderKey)) return true;
      if (revInvKey && (r.originalInvoiceNumber === revInvKey || r.invoiceNumber === revInvKey)) return true;
      return false;
    });

    if (isAlreadyReversed) {
      console.warn('[Store] Reversal already exists for order:', revOrderKey || revInvKey);
      return;
    }

    const updated = [reversal, ...currentReversals];
    const targetOrder = get().orders.find(
      (o) => (revOrderKey && o.id === revOrderKey) || (revInvKey && o.invoiceNumber === revInvKey)
    );
    // Mark target order as reversed in order list
    const updatedOrders = get().orders.map((o) =>
      (revOrderKey && o.id === revOrderKey) || (revInvKey && o.invoiceNumber === revInvKey)
        ? { ...o, status: 'reversed', reversalId: reversal.id }
        : o
    );
    storage.set('reversals', updated);
    storage.set('orders', updatedOrders);

    // Live sync to MongoDB Atlas via ReversalRepository
    ReversalRepository.create(reversal).catch((err) => {
      console.warn('[Store] Reversal Atlas sync warning:', err.message);
    });

    // Audit record of reversal
    let updatedHistory = get().deletionHistory || [];
    if (targetOrder) {
      const auditEntry = {
        id: `del-rev-${Date.now()}`,
        type: 'invoice_reversal',
        title: `Invoice #${reversal.originalInvoiceNumber} Reversed`,
        deletedAt: new Date().toISOString(),
        reason: reversal.reason || 'Reversed',
        totalInvoicesDeleted: 1,
        totalAmount: reversal.totalReversedIncludingTax || targetOrder.grandTotal,
        invoices: [
          {
            id: targetOrder.id,
            invoiceNumber: targetOrder.invoiceNumber,
            orderType: targetOrder.orderType || 'Dine-In',
            paymentMethod: targetOrder.paymentMethod || 'Cash',
            grandTotal: targetOrder.grandTotal,
            completedAt: targetOrder.completedAt || targetOrder.createdAt,
            lines: (targetOrder.lines || []).map((l) => ({
              id: l.id,
              itemName: l.itemNameSnapshot || l.itemName || 'Item',
              portion: l.selectedPortionLabel || l.baseUnitSnapshot || '',
              addons: Array.isArray(l.addonSnapshots)
                ? l.addonSnapshots
                    .map((a) => {
                      if (typeof a === 'string') return a;
                      if (!a) return '';
                      const priceVal = Number(a.price);
                      return priceVal > 0 ? `${a.name} (Rs ${priceVal.toLocaleString('en-PK')})` : (a.name || '');
                    })
                    .filter(Boolean)
                : [],
              quantity: l.quantity || 1,
              unitPrice: l.unitPrice || 0,
              lineSubtotal: l.lineSubtotal || 0,
            })),
          },
        ],
      };
      updatedHistory = [auditEntry, ...updatedHistory];
      storage.set('deletion_history', updatedHistory);
    }

    // Create reversal notification
    const newNotif = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: 'reversal',
      title: `Invoice Reversed #${reversal.originalInvoiceNumber}`,
      description: `Refund Rs ${reversal.totalReversedIncludingTax || 0} • ${reversal.reason || 'Reversed'}`,
      orderId: reversal.originalOrderId,
      invoiceNumber: reversal.originalInvoiceNumber,
      amount: reversal.totalReversedIncludingTax,
      read: false,
      timestamp: new Date().toISOString(),
    };
    const updatedNotifs = [newNotif, ...(get().notifications || [])];
    storage.set('notifications', updatedNotifs);

    set({
      reversals: updated,
      orders: updatedOrders,
      notifications: updatedNotifs,
      deletionHistory: updatedHistory,
    });
  },

  // Delete specific invoice with full audit details
  deleteInvoice: (invoiceId, reason = 'Manually removed by admin') => {
    const targetOrder = get().orders.find((o) => o.id === invoiceId || o.invoiceNumber === invoiceId);
    if (!targetOrder) return false;

    const remainingOrders = get().orders.filter((o) => o.id !== targetOrder.id);
    storage.set('orders', remainingOrders);

    const auditEntry = {
      id: `del-inv-${Date.now()}`,
      type: 'invoice_delete',
      title: `Invoice #${targetOrder.invoiceNumber} Deleted`,
      deletedAt: new Date().toISOString(),
      reason,
      totalInvoicesDeleted: 1,
      totalAmount: targetOrder.grandTotal || 0,
      invoices: [
        {
          id: targetOrder.id,
          invoiceNumber: targetOrder.invoiceNumber,
          orderType: targetOrder.orderType || 'Dine-In',
          paymentMethod: targetOrder.paymentMethod || 'Cash',
          grandTotal: targetOrder.grandTotal,
          completedAt: targetOrder.completedAt || targetOrder.createdAt,
          lines: (targetOrder.lines || []).map((l) => ({
            id: l.id,
            itemName: l.itemNameSnapshot || l.itemName || 'Item',
            portion: l.selectedPortionLabel || l.baseUnitSnapshot || '',
            addons: Array.isArray(l.addonSnapshots)
              ? l.addonSnapshots
                  .map((a) => {
                    if (typeof a === 'string') return a;
                    if (!a) return '';
                    const priceVal = Number(a.price);
                    return priceVal > 0 ? `${a.name} (Rs ${priceVal.toLocaleString('en-PK')})` : (a.name || '');
                  })
                  .filter(Boolean)
              : [],
            quantity: l.quantity || 1,
            unitPrice: l.unitPrice || 0,
            lineSubtotal: l.lineSubtotal || 0,
          })),
        },
      ],
    };

    const updatedHistory = [auditEntry, ...(get().deletionHistory || [])];
    storage.set('deletion_history', updatedHistory);

    const newNotif = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: 'reversal',
      title: `Invoice #${targetOrder.invoiceNumber} Deleted`,
      description: `Removed Rs ${targetOrder.grandTotal || 0} • ${reason}`,
      orderId: targetOrder.id,
      invoiceNumber: targetOrder.invoiceNumber,
      amount: targetOrder.grandTotal,
      read: false,
      timestamp: new Date().toISOString(),
    };
    const updatedNotifs = [newNotif, ...(get().notifications || [])];
    storage.set('notifications', updatedNotifs);

    set({
      orders: remainingOrders,
      deletionHistory: updatedHistory,
      notifications: updatedNotifs,
    });
    return true;
  },

  clearDeletionHistory: () => {
    storage.set('deletion_history', []);
    set({ deletionHistory: [] });
  },

  // ================= CATEGORY ACTIONS =================
  addCategory: (category) => {
    const newRecord = {
      ...category,
      id: category.id || `cat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: category.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [newRecord, ...get().categories];
    storage.set('categories', updated);
    set({ categories: updated });
    return newRecord;
  },

  updateCategory: (id, updates) => {
    const updated = get().categories.map((c) =>
      c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
    );
    storage.set('categories', updated);
    set({ categories: updated });
  },

  setCategoryStatus: (id, status) => {
    get().updateCategory(id, { status });
  },

  deleteCategory: (id) => {
    const updated = get().categories.filter((c) => c.id !== id);
    storage.set('categories', updated);
    set({ categories: updated });
  },

  // ================= MENU ITEM ACTIONS =================
  addItem: (item) => {
    const newRecord = {
      ...item,
      id: item.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [newRecord, ...get().items];
    storage.set('menu_items', updated);
    set({ items: updated });
    return newRecord;
  },

  updateItem: (id, updates) => {
    const updated = get().items.map((item) =>
      item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
    );
    storage.set('menu_items', updated);
    set({ items: updated });
  },

  setItemStatus: (id, status) => {
    get().updateItem(id, { status });
  },

  deleteItem: (id) => {
    const updated = get().items.filter((item) => item.id !== id);
    storage.set('menu_items', updated);
    set({ items: updated });
  },

  // ================= ADD-ON ACTIONS =================
  addAddon: (addon) => {
    const existingIndex = get().addons.findIndex(
      (a) => a && (a.id === addon.id || (a.name && addon.name && a.name.trim().toLowerCase() === addon.name.trim().toLowerCase()))
    );
    const newRecord = {
      ...(existingIndex >= 0 ? get().addons[existingIndex] : {}),
      ...addon,
      id: addon.id || (existingIndex >= 0 ? get().addons[existingIndex].id : `addon-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`),
      createdAt: addon.createdAt || (existingIndex >= 0 ? get().addons[existingIndex].createdAt : new Date().toISOString()),
      updatedAt: new Date().toISOString(),
    };
    const remaining = existingIndex >= 0
      ? get().addons.filter((_, idx) => idx !== existingIndex)
      : get().addons;
    const updated = [newRecord, ...remaining];
    storage.set('addons', updated);
    set({ addons: updated });
    return newRecord;
  },

  updateAddon: (id, updates) => {
    const existing = get().addons.find((a) => a.id === id);
    if (!existing) return;
    const updatedRecord = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    const remaining = get().addons.filter((a) => a.id !== id);
    const updated = [updatedRecord, ...remaining];
    storage.set('addons', updated);
    set({ addons: updated });
  },

  setAddonStatus: (id, status) => {
    get().updateAddon(id, { status });
  },

  deleteAddon: (id) => {
    // 1. Remove from addons
    const updatedAddons = get().addons.filter((a) => a.id !== id);
    storage.set('addons', updatedAddons);

    // 2. Safely remove reference from items and categories
    const updatedItems = get().items.map((item) => {
      if (Array.isArray(item.addonIds) && item.addonIds.includes(id)) {
        return { ...item, addonIds: item.addonIds.filter((aid) => aid !== id) };
      }
      return item;
    });
    storage.set('menu_items', updatedItems);

    const updatedCategories = get().categories.map((cat) => {
      if (Array.isArray(cat.defaultAddonIds) && cat.defaultAddonIds.includes(id)) {
        return { ...cat, defaultAddonIds: cat.defaultAddonIds.filter((aid) => aid !== id) };
      }
      return cat;
    });
    storage.set('categories', updatedCategories);

    set({ addons: updatedAddons, items: updatedItems, categories: updatedCategories });
  },

  // Complete wipe of all restaurant data (categories, items, addons, orders, reversals, expenses, tables)
  clearAllData: async () => {
    storage.set('categories', []);
    storage.set('menu_items', []);
    storage.set('addons', []);
    storage.set('orders', []);
    storage.set('reversals', []);
    storage.set('expenses', []);
    storage.set('tables', []);
    storage.set('shifts', []);
    storage.set('current_shift', null);
    storage.set('pos_cart', []);
    storage.set('notifications', []);
    const safeDefaults = getDefaultSettings();
    storage.set('settings', safeDefaults);
    try {
      await clearAllImages();
    } catch {}
    try {
      await SettingsRepository.dangerZoneReset({ confirmationPhrase: 'DELETE ALL DATA', resetType: 'all' });
    } catch {}
    set({
      categories: [],
      items: [],
      addons: [],
      orders: [],
      reversals: [],
      expenses: [],
      tables: [],
      cart: [],
      notifications: [],
      orderType: safeDefaults?.pos?.defaultOrderType || 'Dine-In',
      settings: safeDefaults,
    });
  },

  // Clear only transaction ledger
  clearAllTransactions: () => {
    storage.set('orders', []);
    storage.set('reversals', []);
    set({ orders: [], reversals: [] });
  },

  // Reset to default seed catalog and transactions
  resetToDemoData: () => {
    storage.set('categories', seedCategories);
    storage.set('menu_items', seedMenuItems);
    storage.set('addons', seedAddons);
    storage.set('orders', defaultSeedData.orders);
    storage.set('reversals', defaultSeedData.reversals);
    set({
      categories: seedCategories,
      items: seedMenuItems,
      addons: seedAddons,
      orders: defaultSeedData.orders,
      reversals: defaultSeedData.reversals,
    });
  },

  // Reset to default seed transactions
  resetToDemoTransactions: () => {
    storage.set('orders', defaultSeedData.orders);
    storage.set('reversals', defaultSeedData.reversals);
    set({ orders: defaultSeedData.orders, reversals: defaultSeedData.reversals });
  },

  // Synchronize store with live Express + MongoDB Atlas backend
  syncWithBackend: async () => {
    try {
      const [cats, its, adds, ords, revs, exps, tbls, curShift] = await Promise.all([
        CategoryRepository.getAll().catch(() => null),
        ItemRepository.getAll().catch(() => null),
        AddonRepository.getAll().catch(() => null),
        OrderRepository.getAll().catch(() => null),
        ReversalRepository.getAll().catch(() => null),
        ExpenseRepository.getAll().catch(() => null),
        TableRepository.getAll().catch(() => null),
        ShiftRepository.getCurrent().catch(() => null),
      ]);

      const updates = {};
      if (Array.isArray(cats)) {
        updates.categories = cats;
        storage.set('categories', cats);
      }
      if (Array.isArray(its)) {
        updates.items = its;
        storage.set('menu_items', its);
      }
      if (Array.isArray(adds)) {
        updates.addons = adds;
        storage.set('addons', adds);
      }
      if (Array.isArray(ords)) {
        const seenOrd = new Set();
        const dedupedOrds = [];
        for (const o of ords) {
          const key = o.id || o.invoiceNumber;
          if (key && !seenOrd.has(key)) {
            seenOrd.add(key);
            dedupedOrds.push(o);
          } else if (!key) {
            dedupedOrds.push(o);
          }
        }
        updates.orders = dedupedOrds;
        storage.set('orders', dedupedOrds);
      }
      if (Array.isArray(revs)) {
        const seenRev = new Set();
        const dedupedRevs = [];
        for (const r of revs) {
          const key = r.originalOrderId || r.originalInvoiceNumber || r.id;
          if (key && !seenRev.has(key)) {
            seenRev.add(key);
            dedupedRevs.push(r);
          } else if (!key) {
            dedupedRevs.push(r);
          }
        }
        updates.reversals = dedupedRevs;
        storage.set('reversals', dedupedRevs);
      }
      if (Array.isArray(exps)) {
        updates.expenses = exps;
        storage.set('expenses', exps);
      }
      if (Array.isArray(tbls)) {
        updates.tables = tbls;
        storage.set('tables', tbls);
      }
      if (curShift !== undefined) {
        updates.currentShift = curShift;
      }

      if (Object.keys(updates).length > 0) {
        set(updates);
      }
    } catch (err) {
      console.warn('[Store] syncWithBackend warning:', err.message);
    }
  },
}));

export default useAppStore;
