/**
 * Settings Repository
 * Provides persistent access to business, tax, POS, and invoice settings.
 * Decouples UI from direct localStorage calls.
 * Supports both static object usage and class instantiation.
 */
import { storage } from '../persistence/storage';
import { getDefaultSettings, normalizeSettings, mergeSettings } from '../../domain/rules/settingsRules';
import { api } from '../adapters/apiClient';

const STORAGE_KEY = 'settings';

export class SettingsRepository {
  constructor(customStorage = storage) {
    this.storage = customStorage;
  }

  getSettings() {
    const saved = this.storage.get(STORAGE_KEY, null);
    if (saved) {
      return normalizeSettings(saved);
    }
    const defaults = getDefaultSettings();
    this.storage.set(STORAGE_KEY, defaults);
    return defaults;
  }

  updateSettings(updates) {
    const current = this.getSettings();
    const merged = mergeSettings(current, updates);
    this.storage.set(STORAGE_KEY, merged);

    // Async sync to Atlas backend
    api.put('/settings', {
      businessName: merged.business?.name || merged.restaurantName || merged.profile?.restaurantName || merged.businessName,
      tagline: merged.business?.tagline || merged.tagline || merged.profile?.tagline,
      logo: merged.business?.logoRef || merged.logoRef || '',
      phone: merged.business?.phone || merged.phone || merged.profile?.phone,
      email: merged.business?.email || merged.email || merged.profile?.email,
      address: merged.business?.address || merged.address || merged.profile?.address,
      ntn: merged.business?.registrationNumber || merged.ntn || merged.profile?.ntn,
      defaultTaxRate: merged.tax?.rate ?? merged.defaultTaxRate,
      isTaxEnabled: merged.tax?.enabled ?? merged.isTaxEnabled,
      invoicePrefix: merged.invoice?.invoicePrefix || merged.invoicePrefix,
      footerNote: merged.invoice?.footer || merged.footerNote,
      currencySymbol: merged.business?.currency || merged.invoice?.currencySymbol || merged.currencySymbol,
      paymentAccounts: merged.paymentAccounts,
    }).catch((err) => console.warn('[SettingsRepository] API sync warning:', err.message));

    return merged;
  }

  resetSettings() {
    const defaults = getDefaultSettings();
    this.storage.set(STORAGE_KEY, defaults);
    return defaults;
  }

  // Static helpers for direct calls without instantiation
  static getSettings() {
    return new SettingsRepository(storage).getSettings();
  }

  static updateSettings(updates) {
    return new SettingsRepository(storage).updateSettings(updates);
  }

  static resetSettings() {
    return new SettingsRepository(storage).resetSettings();
  }

  static async dangerZoneReset({ confirmationPhrase = 'DELETE ALL DATA', resetType = 'all' } = {}) {
    try {
      return await api.post('/settings/danger-zone/reset', { confirmationPhrase, resetType });
    } catch (err) {
      console.warn('[SettingsRepository] Danger zone API reset warning:', err.message);
      return null;
    }
  }
}

export default SettingsRepository;
