/**
 * Order Repository
 * Connects POS checkout and billing to the Express REST API & MongoDB Atlas.
 * Provides resilient offline fallback to local storage.
 */
import { api } from '../adapters/apiClient';
import { storage } from '../persistence/storage';
import {
  generateNextSequentialInvoiceNumber,
  repairDuplicateInvoiceNumbersLocally,
} from '../../domain/selectors/invoiceSelectors';

const STORAGE_KEY = 'orders';

export const OrderRepository = {
  getNextInvoiceNumber: async (prefix = 'INV-') => {
    try {
      const res = await api.get(`/orders/next-invoice-number?prefix=${encodeURIComponent(prefix)}`);
      if (res && res.success && res.invoiceNumber) {
        return res;
      }
    } catch {
      // Server offline / disconnected fallback
    }
    const all = storage.get(STORAGE_KEY, []) || [];
    return generateNextSequentialInvoiceNumber(all, prefix);
  },
  getAll: async (params = {}) => {
    try {
      const activeUser = storage.get('active_user', null);
      const isCashier = activeUser && !String(activeUser.role || '').toLowerCase().includes('admin') && String(activeUser.username || '').toLowerCase() !== 'admin';
      const effectiveParams = { ...params };
      if (isCashier) {
        if (activeUser.id) effectiveParams.createdByUserId = activeUser.id;
        if (activeUser.name) effectiveParams.cashierName = activeUser.name;
        effectiveParams.role = 'cashier';
      }
      const query = new URLSearchParams(effectiveParams).toString();
      const endpoint = query ? `/orders?${query}` : '/orders';
      const res = await api.get(endpoint);
      if (res && res.success && Array.isArray(res.data)) {
        return res.data;
      }
    } catch {
      // Backend offline fallback
    }

    const saved = storage.get(STORAGE_KEY, null);
    if (saved && Array.isArray(saved)) return saved;
    return [];
  },

  getById: async (id) => {
    const local = storage.get(STORAGE_KEY, []) || [];
    const foundLocal = Array.isArray(local)
      ? local.find((o) => o.id === id || o.invoiceNumber === id)
      : null;
    if (foundLocal) return foundLocal;

    try {
      const res = await api.get(`/orders/${id}`);
      if (res && res.success && res.data) {
        return res.data;
      }
    } catch {
      // Fallback
    }

    const all = await OrderRepository.getAll();
    return all.find((o) => o.id === id || o.invoiceNumber === id) || null;
  },

  create: async (orderPayload) => {
    // Clean and sanitize payload to ensure seamless validation
    const sanitized = {
      ...orderPayload,
      lines: (orderPayload.lines || []).map((l) => ({
        ...l,
        itemImageSnapshot: l.itemImageSnapshot || '',
        categoryIdSnapshot: l.categoryIdSnapshot || '',
        categoryNameSnapshot: l.categoryNameSnapshot || '',
        pricingMode:
          l.pricingMode === 'weight'
            ? (l.selectedPortionLabel ? 'portion' : 'custom_weight')
            : l.pricingMode === 'amount'
            ? 'custom_weight'
            : (l.pricingMode || (l.isDeal ? 'deal' : 'piece')),
        basePriceSnapshot: Number(l.basePriceSnapshot) || 0,
        unitPrice: Number(l.unitPrice) || 0,
        quantity: Math.max(1, Number(l.quantity) || 1),
        lineSubtotal: Number(l.lineSubtotal) || 0,
        note: l.note || '',
      })),
      customerName: orderPayload.customerName || '',
      customerPhone: orderPayload.customerPhone || '',
      tableNumber: orderPayload.tableNumber || '',
    };

    const res = await api.post('/orders', sanitized);
    if (res && res.success && res.data) {
      return res.data;
    }
    throw new Error(res?.error?.message || res?.message || 'Failed to save order in MongoDB Atlas');
  },

  updateKitchenStatus: async (id, kitchenStatus) => {
    try {
      const res = await api.patch(`/orders/${id}/kitchen-status`, { kitchenStatus });
      if (res && res.success && res.data) {
        const all = storage.get(STORAGE_KEY, []) || [];
        storage.set(STORAGE_KEY, all.map((o) => (o.id === id ? res.data : o)));
        return res.data;
      }
    } catch {
      // Fallback
    }

    const all = storage.get(STORAGE_KEY, []) || [];
    const updated = all.map((o) => (o.id === id ? { ...o, kitchenStatus } : o));
    storage.set(STORAGE_KEY, updated);
    return updated.find((o) => o.id === id);
  },

  settleBalance: async (
    id,
    {
      amountPaid,
      paymentMethod = 'Cash',
      receivedBy = 'Cashier',
      cardNetwork,
      cardSlipNumber,
      onlineChannel,
      onlineAccountId,
      onlineAccountNumber,
      onlineAccountTitle,
      onlineBankName,
      onlineTransactionId,
      note = '',
    } = {}
  ) => {
    try {
      const res = await api.patch(`/orders/${id}/settle-balance`, {
        amountPaid,
        paymentMethod,
        receivedBy,
        cardNetwork,
        cardSlipNumber,
        onlineChannel,
        onlineAccountId,
        onlineAccountNumber,
        onlineAccountTitle,
        onlineBankName,
        onlineTransactionId,
        note,
      });
      if (res && res.success && res.data) {
        const all = storage.get(STORAGE_KEY, []) || [];
        storage.set(STORAGE_KEY, all.map((o) => (o.id === id || o.invoiceNumber === id ? res.data : o)));
        return res.data;
      }
    } catch (err) {
      console.warn('[OrderRepository] settleBalance live sync warning:', err.message);
    }
    return null;
  },
};

export default OrderRepository;
