import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Utensils,
  Search,
  Receipt,
  History,
  Calendar,
  ChevronDown,
} from 'lucide-react';
import { SearchInput } from '../components/ui/SearchInput';
import { Tabs } from '../components/ui/Tabs';
import { useAppStore } from '../store';
import { ProductCard } from '../features/pos/components/ProductCard';
import { DealCard } from '../features/pos/components/DealCard';
import { ItemConfigModal } from '../features/pos/components/ItemConfigModal';
import { OrderCartPanel } from '../features/pos/components/OrderCartPanel';
import { InvoiceModal } from '../features/pos/components/InvoiceModal';
import { InvoiceHistoryList } from '../features/pos/components/InvoiceHistoryList';
import {
  calculateCartSubtotal,
  calculateTax,
  calculateGrandTotal,
} from '../domain/calculations';
import { sortCategories, sortMenuItems } from '../domain/rules';
import { filterOrdersByOwnership } from '../domain/selectors/invoiceSelectors';

/**
 * POSPage Component
 * Full-featured Point of Sale interface.
 * Implements:
 * - Full-width clean item catalog grid
 * - Top toolbar with Order Button trigger [ 👜 Order (1) Rs 294 ] matching user reference
 * - Slide-over Order Drawer with backdrop blur (opens on click/add, closes with ✕)
 * - Dine-In / Takeaway selector
 * - Fast item configuration modal
 * - Invoice History toggle
 */
export const POSPage = ({ defaultTab = 'register' }) => {
  const {
    items,
    categories,
    deals,
    cart,
    addToCart,
    orders,
    settings,
    orderType,
    setOrderType,
    user,
  } = useAppStore();

  const visibleOrdersCount = useMemo(() => {
    return filterOrdersByOwnership(orders, user).length;
  }, [orders, user]);

  const [activeView, setActiveView] = useState(defaultTab);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isOrderDrawerOpen, setIsOrderDrawerOpen] = useState(false);
  const [selectedItemForConfig, setSelectedItemForConfig] = useState(null);
  const [completedOrderForInvoice, setCompletedOrderForInvoice] = useState(null);

  const handleOrderCompleted = (order) => {
    if (settings?.pos?.autoOpenInvoice !== false) {
      setCompletedOrderForInvoice(order);
    }
  };

  const handleItemSelect = (item) => {
    // If weight based or has multiple portion options, open config modal
    const isWeightBased = (item.unitType || '').toLowerCase() === 'weight' ||
      (item.unit || item.baseUnit || '').toLowerCase().includes('kg') ||
      (item.unit || item.baseUnit || '').toLowerCase().includes('gram');
    const hasMultiplePortions = Array.isArray(item.portionOptions) && item.portionOptions.length > 1;

    if (isWeightBased || hasMultiplePortions) {
      setSelectedItemForConfig(item);
      return;
    }

    // Direct 1-click Add to Cart
    const cartLineSnapshot = {
      id: `line_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      itemId: item.id,
      itemNameSnapshot: item.name,
      itemImageSnapshot: item.imageRef || null,
      categoryIdSnapshot: item.categoryId || null,
      categoryNameSnapshot: item.categoryName || 'Specialty',
      pricingMode: 'piece',
      basePriceSnapshot: item.basePrice || 0,
      costPriceSnapshot: item.costPrice !== undefined ? item.costPrice : null,
      baseUnitSnapshot: item.unit || item.baseUnit || 'Piece',
      selectedWeightGrams: null,
      selectedPortionLabel: item.unit || item.baseUnit || 'Piece',
      portionPrice: item.basePrice || 0,
      addonSnapshots: [],
      addonsTotal: 0,
      addonsAreFlat: true,
      quantity: 1,
      unitPrice: item.basePrice || 0,
      lineSubtotal: item.basePrice || 0,
      note: '',
    };

    addToCart(cartLineSnapshot);
  };

  // Only sellable active menu items
  const activeMenuItems = useMemo(() => {
    return (items || []).filter((item) => item.status === 'active');
  }, [items]);

  // Only sellable active deals
  const activeDeals = useMemo(() => {
    return (deals || []).filter((deal) => deal.status === 'active');
  }, [deals]);

  // Dynamic category filter list based on active categories sorted strictly by sortOrder
  const sortedCategories = useMemo(() => {
    const activeCats = (categories || []).filter((c) => c.status === 'active');
    return sortCategories(activeCats);
  }, [categories]);

  const categoryTabs = useMemo(() => {
    const tabs = ['All'];
    if (activeDeals.length > 0) {
      tabs.push('Deals');
    }
    tabs.push(...sortedCategories.map((c) => c.name));
    return tabs;
  }, [sortedCategories, activeDeals]);

  // Preserve filter selection safely if an active category is renamed or removed
  React.useEffect(() => {
    if (activeCategory !== 'All' && !categoryTabs.includes(activeCategory)) {
      setActiveCategory('All');
    }
  }, [activeCategory, categoryTabs]);

  // Filter deals by category and search query
  const filteredDeals = useMemo(() => {
    if (activeCategory !== 'All' && activeCategory !== 'Deals') {
      return [];
    }
    const query = searchQuery.trim().toLowerCase();
    return activeDeals.filter((deal) => {
      if (!query) return true;
      if (deal.name?.toLowerCase().includes(query)) return true;
      if (deal.description?.toLowerCase().includes(query)) return true;
      if (deal.includedItems?.some((inc) => inc.name?.toLowerCase().includes(query))) return true;
      return false;
    });
  }, [activeDeals, activeCategory, searchQuery]);

  // Filter items by category and search query, sorted with Food first, Desserts next, Drinks/Water last
  const filteredProducts = useMemo(() => {
    if (activeCategory === 'Deals') {
      return [];
    }

    const list = activeMenuItems.filter((product) => {
      const category = categories.find((c) => c.id === product.categoryId);

      const matchesCategory =
        activeCategory === 'All' ||
        product.categoryId === activeCategory ||
        category?.name?.toLowerCase() === activeCategory.toLowerCase();

      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        (category?.name && category.name.toLowerCase().includes(query)) ||
        (product.description && product.description.toLowerCase().includes(query));

      return matchesCategory && matchesSearch;
    });

    return sortMenuItems(list, categories);
  }, [activeMenuItems, categories, activeCategory, searchQuery]);

  // Real-time Cart Financials for Top Order Button
  const cartSubtotal = useMemo(() => calculateCartSubtotal(cart), [cart]);
  const isTaxEnabled = settings?.tax?.enabled ?? settings?.taxEnabled;
  const configuredRate = settings?.tax?.rate ?? settings?.taxRate;
  const taxRate = isTaxEnabled ? (Number(configuredRate) || 0) : 0;
  const cartTax = useMemo(() => calculateTax(cartSubtotal, taxRate), [cartSubtotal, taxRate]);
  const cartGrandTotal = useMemo(
    () => calculateGrandTotal(cartSubtotal, cartTax),
    [cartSubtotal, cartTax]
  );

  return (
    <div className="space-y-4">
      {/* Top Header Toolbar: Matches Screenshot 2 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-0.5">
        {/* Left: Section Title */}
        <div className="flex items-center gap-2">
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            {activeView === 'register' ? 'Point of Sale' : 'Invoice History'}
          </h1>
          {activeView === 'register' ? (
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
              {filteredProducts.length + filteredDeals.length} Available
            </span>
          ) : (
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-orange-100 text-[#FF5C28] text-xs font-semibold">
              {orders.length} Invoices
            </span>
          )}
        </div>

        {/* Right Toolbar Controls: Matches Screenshot 2 */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap self-start sm:self-auto">
          {/* 1. History Button */}
          <button
            type="button"
            onClick={() => setActiveView(activeView === 'register' ? 'history' : 'register')}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold transition-all cursor-pointer shadow-2xs ${
              activeView === 'history'
                ? 'bg-[#FF5C28] text-white border-[#FF5C28] shadow-xs'
                : 'bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <History className="w-3 h-3" />
            <span>History</span>
            {visibleOrdersCount > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                  activeView === 'history'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {visibleOrdersCount}
              </span>
            )}
          </button>

          {/* 2. Order Cart Trigger Button: Matches Screenshot 2 [ 👜 Order (1) Rs 294 ] */}
          <button
            type="button"
            onClick={() => setIsOrderDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border-2 border-[#FF5C28] text-[#FF5C28] bg-white hover:bg-orange-50/60 font-bold text-[11px] transition-all shadow-2xs cursor-pointer group"
          >
            <ShoppingBag className="w-3 h-3 text-[#FF5C28]" />
            <span>Order</span>
            <span className="w-4 h-4 rounded-full bg-[#FF5C28] text-white flex items-center justify-center text-[9px] font-black">
              {cart.length}
            </span>
            <span className="font-bold text-slate-900 group-hover:text-[#FF5C28] transition-colors">
              Rs {cartGrandTotal.toLocaleString('en-PK')}
            </span>
          </button>

          {/* 3. Dine-In / Takeaway Selector: Matches Screenshot 2 */}
          <div className="relative inline-flex items-center">
            <select
              value={orderType}
              onChange={(e) => setOrderType(e.target.value)}
              className="appearance-none pl-2 pr-5 py-0.5 rounded-full border border-slate-200/90 bg-white text-slate-700 text-[11px] font-semibold shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#FF5C28]/20 cursor-pointer"
            >
              <option value="Dine-In">Dine-In</option>
              <option value="Takeaway">Takeaway</option>
            </select>
            <ChevronDown className="w-2.5 h-2.5 text-slate-400 absolute right-1.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* VIEW: Invoice History */}
      {activeView === 'history' && <InvoiceHistoryList />}

      {/* VIEW: Register / POS Full-Width Item Catalog (No side drawer eating space) */}
      {activeView === 'register' && (
        <div className="w-full space-y-4">
          {/* Search Bar & Dynamic Category Chips */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items or category..."
              className="w-full sm:max-w-xs"
            />

            <div className="overflow-x-auto pb-0.5 max-w-full">
              <Tabs
                tabs={categoryTabs}
                activeTab={activeCategory}
                onChange={setActiveCategory}
                variant="pills"
              />
            </div>
          </div>

          {/* Catalog Grid or Empty State */}
          {activeMenuItems.length === 0 && activeDeals.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
              <Utensils className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-700">
                No active menu items or deals available.
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Activate or create menu items or deals in the Menu section to display them in the POS catalog.
              </p>
            </div>
          ) : filteredProducts.length === 0 && filteredDeals.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
              <Search className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-700">
                {activeCategory === 'Deals' ? 'No matching deals found.' : 'No matching menu items or deals found.'}
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Try searching with another name or select a different category filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {filteredDeals.map((deal) => (
                <DealCard
                  key={`deal-${deal.id}`}
                  deal={deal}
                  showImage={settings?.pos?.showItemImages !== false}
                  onAddToCart={addToCart}
                />
              ))}
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  item={product}
                  showImage={settings?.pos?.showItemImages !== false}
                  onSelect={handleItemSelect}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Slide-over Order Drawer: Matches Screenshot 3 */}
      {isOrderDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Dimmed & Blurred Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity animate-fadeIn cursor-pointer"
            onClick={() => setIsOrderDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Right Slide-over Panel (Matches Image 2 compact width) */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-4 sm:pl-8">
            <div className="w-screen max-w-[430px] sm:max-w-[460px] bg-white shadow-2xl flex flex-col h-full animate-slideInRight overflow-hidden">
              <OrderCartPanel
                onClose={() => setIsOrderDrawerOpen(false)}
                onOrderCompleted={(order) => {
                  setIsOrderDrawerOpen(false);
                  handleOrderCompleted(order);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Product Configuration Modal */}
      <ItemConfigModal
        item={selectedItemForConfig}
        isOpen={Boolean(selectedItemForConfig)}
        onClose={() => setSelectedItemForConfig(null)}
        onAddToCart={(cartLine) => {
          addToCart(cartLine);
          setSelectedItemForConfig(null);
        }}
      />

      {/* Sale Success & Invoice Confirmation Preview */}
      <InvoiceModal
        order={completedOrderForInvoice}
        isOpen={Boolean(completedOrderForInvoice)}
        onClose={() => setCompletedOrderForInvoice(null)}
      />
    </div>
  );
};

export default POSPage;
