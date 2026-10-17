import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Tabs } from '../components/ui/Tabs';
import { ItemsList } from '../features/menu/items/ItemsList';
import { CategoriesList } from '../features/menu/categories/CategoriesList';
import { AddonsList } from '../features/menu/addons/AddonsList';
import { DealsList } from '../features/menu/deals/DealsList';

import { useAppStore } from '../store';
import { isCashierUser } from '../domain/selectors/invoiceSelectors';

/**
 * MenuPage Component
 * Tabs: All Items, Categories, Add-ons, Deals
 */
export const MenuPage = () => {
  const { user } = useAppStore();
  const isCashier = isCashierUser(user);

  const [activeTab, setActiveTab] = useState('All Items');
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isAddDealModalOpen, setIsAddDealModalOpen] = useState(false);

  const tabs = [
    {
      id: 'All Items',
      label: 'All Items',
    },
    {
      id: 'Categories',
      label: 'Categories',
    },
    {
      id: 'Add-ons',
      label: 'Add-ons',
    },
    {
      id: 'Deals',
      label: 'Deals',
    },
  ];

  return (
    <div className="space-y-4 max-w-[1440px] mx-auto select-none">
      {/* Main Container Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/70 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
        {/* Navigation Tabs Header with + Add Item & + Add Deal buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/90 mb-5 pb-0.5">
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={setActiveTab}
            variant="line"
            className="border-b-0"
          />

          {!isCashier && (
            <div className="flex items-center gap-2 self-start sm:self-center shrink-0 mb-2 sm:mb-0">
              {activeTab === 'All Items' && (
                <button
                  type="button"
                  onClick={() => setIsAddItemModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#FF5C28] hover:bg-[#E04D1D] text-white text-xs font-semibold rounded-full shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Add Item</span>
                </button>
              )}
              {activeTab === 'Deals' && (
                <button
                  type="button"
                  onClick={() => setIsAddDealModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#FF5C28] hover:bg-[#E04D1D] text-white text-xs font-semibold rounded-full shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Add Deal</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tab Viewport */}
        <div>
          {activeTab === 'All Items' && (
            <ItemsList
              isAddModalOpen={isAddItemModalOpen}
              onAddModalClose={() => setIsAddItemModalOpen(false)}
            />
          )}
          {activeTab === 'Categories' && <CategoriesList />}
          {activeTab === 'Add-ons' && <AddonsList />}
          {activeTab === 'Deals' && (
            <DealsList
              isAddModalOpen={isAddDealModalOpen}
              onAddModalClose={() => setIsAddDealModalOpen(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default MenuPage;

