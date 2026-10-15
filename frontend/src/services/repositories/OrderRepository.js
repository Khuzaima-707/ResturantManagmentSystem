/**
 * Order Repository
 * Connects POS checkout and billing to the Express REST API & MongoDB Atlas.
 * Provides resilient offline fallback to local storage.
 */
import { api } from '../adapters/apiClient';
import { storage } from '../persistence/storage';

const STORAGE_KEY = 'orders';

export const OrderRepository = {
  getAll: async (params = {}) => {
    try {
      const query = new URLSearchParams(params).toString();
      const endpoint = query ? `/orders?${query}` : '/orders';
      const res = await api.get(endpoint);
      if (res && res.success && Array.isArray(res.data)) {
        const local = storage.get(STORAGE_KEY, []) || [];
        if (res.data.length > 0) {
          const backendKeys = new Set(res.data.map((o) => o.id || o.invoiceNumber));
          const unsynced = local.filter((o) => {
            const k = o.id || o.invoiceNumber;
            return k && !backendKeys.has(k);
          });
          const merged = [...res.data, ...unsynced];
          storage.set(STORAGE_KEY, merged);
          return merged;
        } else if (local.length > 0) {
          return local;
        } else {
          storage.set(STORAGE_KEY, []);
          return [];
        }
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
    try {
      const res = await api.post('/orders', orderPayload);
      if (res && res.success && res.data) {
        const all = storage.get(STORAGE_KEY, []) || [];
        const filtered = all.filter((o) => o.id !== res.data.id && o.id !== orderPayload.id);
        const deduped = [res.data, ...filtered];
        storage.set(STORAGE_KEY, deduped);
        return res.data;
      }
    } catch (err) {
      console.warn('[OrderRepository] Live API sync deferred, order safely stored locally:', err.message);
    }

    // Offline client fallback: Ensure order is in storage without duplicating
    const all = storage.get(STORAGE_KEY, []) || [];
    const exists = all.some(
      (o) =>
        (orderPayload.id && o.id === orderPayload.id) ||
        (orderPayload.invoiceNumber && o.invoiceNumber === orderPayload.invoiceNumber)
    );
    if (!exists) {
      storage.set(STORAGE_KEY, [orderPayload, ...all]);
    }
    return orderPayload;
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
};

export default OrderRepository;
