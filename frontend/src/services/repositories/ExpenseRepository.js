/**
 * Expense & Accounting Repository
 * Connects POS expenses & P&L statements to Express REST API & MongoDB Atlas.
 * Falls back safely to browser storage when offline.
 */
import { api } from '../adapters/apiClient';
import { storage } from '../persistence/storage';

const STORAGE_KEY = 'expenses';

export const ExpenseRepository = {
  getAll: async (params = {}) => {
    try {
      const query = new URLSearchParams(params).toString();
      const endpoint = query ? `/expenses?${query}` : '/expenses';
      const res = await api.get(endpoint);
      if (res && res.success && Array.isArray(res.data)) {
        storage.set(STORAGE_KEY, res.data);
        return res.data;
      }
    } catch {
      // Backend offline fallback
    }

    const saved = storage.get(STORAGE_KEY, []);
    return Array.isArray(saved) ? saved : [];
  },

  getProfitAndLoss: async (params = {}) => {
    try {
      const query = new URLSearchParams(params).toString();
      const endpoint = query ? `/expenses/profit-and-loss?${query}` : '/expenses/profit-and-loss';
      const res = await api.get(endpoint);
      if (res && res.success && res.data) {
        return res.data;
      }
    } catch {
      // Fallback
    }

    // Client-side P&L calculation fallback
    const orders = storage.get('orders', []) || [];
    const expenses = storage.get(STORAGE_KEY, []) || [];
    const validOrders = orders.filter((o) => o.status === 'completed');
    const grossSales = validOrders.reduce((sum, o) => sum + (Number(o.grandTotal) || 0), 0);
    const taxDeducted = validOrders.reduce((sum, o) => sum + (Number(o.taxAmount) || 0), 0);
    const netRevenue = grossSales - taxDeducted;
    const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const netOperatingProfit = netRevenue - totalExpenses;
    const profitMargin = netRevenue > 0 ? (netOperatingProfit / netRevenue) * 100 : 0;

    return {
      period: 'All Time (Offline Fallback)',
      grossSales: Math.round(grossSales),
      discountsGiven: validOrders.reduce((sum, o) => sum + (Number(o.discountAmount) || 0), 0),
      reversalsDeducted: 0,
      netRevenue: Math.round(netRevenue),
      totalExpenses: Math.round(totalExpenses),
      netOperatingProfit: Math.round(netOperatingProfit),
      profitMargin: Number(profitMargin.toFixed(1)),
      isProfitable: netOperatingProfit >= 0,
    };
  },

  create: async (expensePayload) => {
    try {
      const res = await api.post('/expenses', expensePayload);
      if (res && res.success && res.data) {
        const all = storage.get(STORAGE_KEY, []) || [];
        storage.set(STORAGE_KEY, [res.data, ...all.filter((e) => e.id !== res.data.id)]);
        return res.data;
      }
    } catch (err) {
      console.warn('[ExpenseRepository] Live API create failed, falling back to local storage:', err.message);
    }

    const all = storage.get(STORAGE_KEY, []) || [];
    const fallbackExpense = {
      ...expensePayload,
      id: expensePayload.id || `exp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      date: expensePayload.date || new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    storage.set(STORAGE_KEY, [fallbackExpense, ...all]);
    return fallbackExpense;
  },

  delete: async (id) => {
    try {
      const res = await api.delete(`/expenses/${id}`);
      if (res && res.success) {
        const all = storage.get(STORAGE_KEY, []) || [];
        storage.set(STORAGE_KEY, all.filter((e) => e.id !== id));
        return true;
      }
    } catch {
      // Fallback
    }

    const all = storage.get(STORAGE_KEY, []) || [];
    storage.set(STORAGE_KEY, all.filter((e) => e.id !== id));
    return true;
  },
};

export default ExpenseRepository;
