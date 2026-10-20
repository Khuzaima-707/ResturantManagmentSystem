import React, { useState } from 'react';
import { Tabs } from '../components/ui/Tabs';
import { useAppStore } from '../store';
import { BusinessProfileTab } from '../features/settings/components/BusinessProfileTab';
import { TaxSettingsTab } from '../features/settings/components/TaxSettingsTab';
import { POSSettingsTab } from '../features/settings/components/POSSettingsTab';
import { InvoiceSettingsTab } from '../features/settings/components/InvoiceSettingsTab';
import { DataManagementTab } from '../features/settings/components/DataManagementTab';
import { DeletionHistoryTab } from '../features/settings/components/DeletionHistoryTab';
import { SecuritySettingsTab } from '../features/settings/components/SecuritySettingsTab';

/**
 * SettingsPage Component
 * Full-featured Settings Module supporting Business Profile, Security & Passwords, Tax, POS, Invoice, Data Management, and Deletion History.
 */
export const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const { settings, updateSettings, user } = useAppStore();

  const isCashier = Boolean(
    (user?.role?.toLowerCase().includes('cashier') && !user?.role?.toLowerCase().includes('admin')) ||
    (user?.username?.toLowerCase() === 'cashier' && user?.username?.toLowerCase() !== 'admin')
  );

  const tabs = [
    { id: 'profile', label: 'Business Profile' },
    { id: 'security', label: 'Security & Passwords' },
    { id: 'tax', label: 'Tax Settings' },
    { id: 'pos', label: 'POS Settings' },
    { id: 'invoice', label: 'Invoice Settings' },
    ...(!isCashier ? [{ id: 'data', label: 'Data Management' }] : []),
    ...(!isCashier ? [{ id: 'history', label: 'Deletion History' }] : []),
  ];

  // If cashier tries to stay on history or data tab, fallback to profile
  React.useEffect(() => {
    if (isCashier && (activeTab === 'history' || activeTab === 'data')) {
      setActiveTab('profile');
    }
  }, [isCashier, activeTab]);

  const handleSaveSettings = async (updates) => {
    updateSettings(updates);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Settings & System Preferences
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage restaurant business profile, sales taxes, POS behavior, invoice branding, and storage.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        variant="line"
      />

      {/* Active Tab Content */}
      {activeTab === 'profile' && (
        <BusinessProfileTab
          settings={settings}
          onSave={handleSaveSettings}
        />
      )}

      {activeTab === 'security' && (
        <SecuritySettingsTab />
      )}

      {activeTab === 'tax' && (
        <TaxSettingsTab
          settings={settings}
          onSave={handleSaveSettings}
        />
      )}

      {activeTab === 'pos' && (
        <POSSettingsTab
          settings={settings}
          onSave={handleSaveSettings}
        />
      )}

      {activeTab === 'invoice' && (
        <InvoiceSettingsTab
          settings={settings}
          onSave={handleSaveSettings}
        />
      )}

      {!isCashier && activeTab === 'data' && (
        <DataManagementTab />
      )}

      {!isCashier && activeTab === 'history' && (
        <DeletionHistoryTab />
      )}
    </div>
  );
};

export default SettingsPage;
