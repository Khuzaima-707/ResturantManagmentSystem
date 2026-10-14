import React, { useState, useMemo, useRef } from 'react';
import {
  Plus,
  Minus,
  Check,
  Scale,
  Utensils,
  ShoppingBag,
} from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import {
  calculateWeightPrice,
  calculateWeightFromAmount,
  calculateAddonTotal,
  calculateConfiguredItemPrice,
  calculateLineSubtotal,
  formatCurrency,
} from '../../../domain/calculations';
import { getCompatibleAddons, STANDARD_WEIGHT_PORTIONS, detectAddonType } from '../../../domain/rules';
import { useAppStore } from '../../../store';

function createCartLineId() {
  return `line_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
}

/**
 * ItemConfigModalContent Component
 * Form state for configuring an individual item.
 * Keyed by item.id so state automatically resets when a new item is selected.
 */
const ItemConfigModalContent = ({ item, isOpen, onClose, onAddToCart }) => {
  const { categories, addons } = useAppStore();

  const category = useMemo(() => {
    if (!item) return null;
    return (
      categories.find(
        (c) =>
          c.id === item.categoryId ||
          (item.categoryName && c.name.toLowerCase() === item.categoryName.toLowerCase())
      ) ||
      (item.categoryName ? { id: item.categoryId || 'cat-custom', name: item.categoryName } : null)
    );
  }, [categories, item]);

  // Is this item sold by weight / kg?
  const isWeightBased = useMemo(() => {
    if (!item) return false;
    const uType = (item.unitType || '').toLowerCase();
    const uName = (item.unit || item.baseUnit || '').toLowerCase();
    return uType === 'weight' || uName.includes('kg') || uName.includes('gram');
  }, [item]);

  // Available portions for weight items or items with custom portions
  const availablePortions = useMemo(() => {
    // 1. If item has custom portionOptions (e.g. Small, Medium, Large or Half, Full)
    if (Array.isArray(item?.portionOptions) && item.portionOptions.length > 0) {
      return item.portionOptions.map((p) => ({
        label: p.label || p.name,
        name: p.name || p.label,
        grams: p.grams || (p.quantityInBaseUnit ? Math.round(Number(p.quantityInBaseUnit) * 1000) : null),
        price: p.price !== undefined ? Number(p.price) : undefined,
      }));
    }
    // 2. If weight based, fallback to category or standard weight portions
    if (isWeightBased) {
      if (category && Array.isArray(category.defaultPortions) && category.defaultPortions.length > 0) {
        return category.defaultPortions.map((p) => ({
          label: p.label || p.name,
          grams: p.grams || Math.round((Number(p.quantityInBaseUnit) || 0) * 1000) || 500,
        }));
      }
      return STANDARD_WEIGHT_PORTIONS.map((p) => ({
        label: p.label,
        grams: Math.round(p.quantityInBaseUnit * 1000),
      }));
    }
    return [];
  }, [isWeightBased, item, category]);

  // Only resolve add-ons that have been explicitly added or assigned to this item.
  // If the user did not add add-ons to this item, none will appear.
  const compatibleAddons = useMemo(() => {
    if (!item) return [];

    const result = [];
    const seenNames = new Set();
    const seenIds = new Set();

    // 1. Direct extra add-ons configured on this item (from ItemModal)
    if (Array.isArray(item.addons) && item.addons.length > 0) {
      item.addons.forEach((da, idx) => {
        if (!da || !da.name || !(Number(da.price) > 0)) return;
        const normName = da.name.trim().toLowerCase();
        const storeAddon = (addons || []).find(
          (sa) => sa && (sa.id === da.id || (sa.name && sa.name.trim().toLowerCase() === normName))
        );
        const resolvedCost =
          da.costPrice !== undefined && da.costPrice !== null
            ? Number(da.costPrice)
            : storeAddon?.costPrice !== undefined && storeAddon?.costPrice !== null
            ? Number(storeAddon.costPrice)
            : null;

        const id = da.id || storeAddon?.id || `direct-addon-${idx}-${normName}`;
        if (!seenNames.has(normName) && !seenIds.has(id)) {
          seenNames.add(normName);
          seenIds.add(id);
          result.push({
            id,
            name: da.name.trim(),
            price: Number(da.price) || 0,
            costPrice: resolvedCost,
            status: 'active',
            type: da.type || storeAddon?.type || detectAddonType(da.name) || 'Food',
          });
        }
      });
    }

    // 2. Add-ons linked via item.addonIds or addon.itemIds
    const itemAddonIds = Array.isArray(item.addonIds) ? item.addonIds.map(String) : [];
    const currentItemId = String(item.id || '').toLowerCase();

    (addons || []).forEach((addon) => {
      if (addon.status !== 'active') return;
      const aId = String(addon.id || '');
      const isLinkedById = itemAddonIds.includes(aId);
      const isLinkedByItemIds =
        Array.isArray(addon.itemIds) &&
        addon.itemIds.some((id) => String(id).toLowerCase() === currentItemId);

      if (isLinkedById || isLinkedByItemIds) {
        const normName = (addon.name || '').trim().toLowerCase();
        if (!seenNames.has(normName) && !seenIds.has(aId)) {
          seenNames.add(normName);
          seenIds.add(aId);
          result.push({
            ...addon,
            costPrice: addon.costPrice !== undefined && addon.costPrice !== null ? Number(addon.costPrice) : null,
            type: addon.type || detectAddonType(addon.name) || 'Food',
          });
        }
      }
    });

    return result;
  }, [item, addons]);

  // Split into Food Add-ons and Drink Extras
  const { foodAddons, drinkAddons } = useMemo(() => {
    const food = [];
    const drinks = [];
    compatibleAddons.forEach((a) => {
      const type = a.type || detectAddonType(a.name);
      if (type === 'Drink') {
        drinks.push({ ...a, type });
      } else {
        food.push({ ...a, type });
      }
    });
    return { foodAddons: food, drinkAddons: drinks };
  }, [compatibleAddons]);

  // Configuration States
  const [pricingMode, setPricingMode] = useState('portion'); // 'portion' | 'amount'
  const [selectedPortionIndex, setSelectedPortionIndex] = useState(0);
  const [customRupeeAmount, setCustomRupeeAmount] = useState('100');
  const [selectedAddonQuantities, setSelectedAddonQuantities] = useState({}); // { [addonId]: quantity }
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const isAddingRef = useRef(false);

  // Selected portion grams & base price calculation
  const currentPortion = availablePortions[selectedPortionIndex] || availablePortions[0] || null;

  let baseCalculatedPrice = 0;
  let derivedWeightGrams = null;
  let portionLabel = item.unit || item.baseUnit || 'Piece';

  if (currentPortion && currentPortion.price !== undefined) {
    // Explicit portion price (e.g. Small: Rs 350, Medium: Rs 650, Large: Rs 950)
    baseCalculatedPrice = currentPortion.price;
    portionLabel = currentPortion.label || currentPortion.name;
    derivedWeightGrams = currentPortion.grams || null;
  } else if (isWeightBased && currentPortion) {
    if (pricingMode === 'portion') {
      derivedWeightGrams = currentPortion.grams;
      baseCalculatedPrice = calculateWeightPrice(item.basePrice, derivedWeightGrams);
      portionLabel = currentPortion.label;
    } else {
      // Custom Rupee Amount Mode
      const parsedAmount = Math.max(0, Math.round(Number(customRupeeAmount) || 0));
      baseCalculatedPrice = parsedAmount;
      derivedWeightGrams = calculateWeightFromAmount(item.basePrice, parsedAmount);
      portionLabel = `Rs ${parsedAmount} (${derivedWeightGrams}g)`;
    }
  } else {
    // Standard item
    baseCalculatedPrice = item.basePrice || 0;
    if (currentPortion) {
      portionLabel = currentPortion.label || currentPortion.name;
    }
  }

  // Add-ons calculations with individual quantities
  const selectedAddonIds = useMemo(
    () => Object.keys(selectedAddonQuantities).filter((id) => (selectedAddonQuantities[id] || 0) > 0),
    [selectedAddonQuantities]
  );

  const selectedAddonsList = useMemo(() => {
    return compatibleAddons
      .filter((a) => (selectedAddonQuantities[a.id] || 0) > 0)
      .map((a) => ({
        ...a,
        quantity: Math.max(1, Number(selectedAddonQuantities[a.id]) || 1),
      }));
  }, [compatibleAddons, selectedAddonQuantities]);

  const addonsTotal = calculateAddonTotal(selectedAddonsList);

  // Single unit price including add-ons
  const unitPrice = calculateConfiguredItemPrice(baseCalculatedPrice, addonsTotal);

  // Total line subtotal
  const lineSubtotal = calculateLineSubtotal(unitPrice, 0, quantity);

  const handleToggleAddon = (aid) => {
    setSelectedAddonQuantities((prev) => {
      const current = prev[aid] || 0;
      if (current > 0) {
        const next = { ...prev };
        delete next[aid];
        return next;
      }
      return { ...prev, [aid]: 1 };
    });
  };

  const handleUpdateAddonQty = (aid, delta, e) => {
    if (e) e.stopPropagation();
    setSelectedAddonQuantities((prev) => {
      const current = prev[aid] || 0;
      const nextQty = current + delta;
      if (nextQty <= 0) {
        const next = { ...prev };
        delete next[aid];
        return next;
      }
      return { ...prev, [aid]: nextQty };
    });
  };

  const handleAdd = () => {
    if (isAddingRef.current || isAdding) return;
    if (unitPrice <= 0 && lineSubtotal <= 0) return;

    isAddingRef.current = true;
    setIsAdding(true);

    try {
      const cartLineSnapshot = {
        id: createCartLineId(),
        itemId: item.id,
        itemNameSnapshot: item.name,
        itemImageSnapshot: item.imageRef || null,
        categoryIdSnapshot: item.categoryId || null,
        categoryNameSnapshot: category?.name || item.categoryName || 'Specialty',
        pricingMode: isWeightBased ? pricingMode : 'piece',
        basePriceSnapshot: item.basePrice || 0,
        costPriceSnapshot: item.costPrice !== undefined ? item.costPrice : null,
        baseUnitSnapshot: item.unit || item.baseUnit || 'Piece',
        selectedWeightGrams: isWeightBased ? derivedWeightGrams : null,
        selectedPortionLabel: portionLabel,
        portionPrice: baseCalculatedPrice,
        addonSnapshots: selectedAddonsList.map((a) => ({
          id: a.id,
          name: a.name,
          price: a.price,
          costPrice: a.costPrice !== undefined ? a.costPrice : null,
          quantity: a.quantity || 1,
        })),
        quantity,
        unitPrice,
        lineSubtotal,
        note: '',
      };

      onAddToCart(cartLineSnapshot);
      onClose();
    } finally {
      setTimeout(() => {
        isAddingRef.current = false;
        setIsAdding(false);
      }, 400);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={item.name}
      maxWidth="max-w-[400px]"
      headerClassName="px-4 py-2.5 sm:py-3 border-b border-slate-100"
      bodyClassName="p-3 sm:p-3.5 overflow-y-auto flex-1"
      footerClassName="px-4 py-2 sm:py-2.5 bg-slate-50/80 border-t border-slate-100"
      footer={
        <div className="flex items-center justify-between w-full">
          <div>
            <span className="text-[10px] text-slate-400 block font-medium leading-none mb-0.5">Total Price</span>
            <span className="text-base font-extrabold text-[#FF5C28] leading-none">
              {formatCurrency(lineSubtotal)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={unitPrice <= 0 || isAdding}
              className="h-8 px-3.5 rounded-lg bg-[#FF5C28] hover:bg-[#E04D1D] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{isAdding ? 'Adding...' : 'Add to Order'}</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        {/* Top Product Summary - Compact */}
        <div className="flex items-center gap-2.5 p-2 bg-slate-50/80 rounded-xl border border-slate-100">
          <div className="w-12 h-12 rounded-lg bg-slate-200 overflow-hidden shrink-0 flex items-center justify-center border border-slate-200/60 shadow-2xs">
            {item.imageRef ? (
              <img
                src={item.imageRef}
                alt={item.name}
                className="w-full h-full object-cover object-center"
              />
            ) : (
              <Utensils className="w-5 h-5 text-slate-400" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] font-bold text-[#FF5C28] bg-orange-50 border border-orange-100 px-1.5 py-0.2 rounded-full">
                {category?.name || 'General'}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                Base: {formatCurrency(item.basePrice || 0)} / {item.unit || item.baseUnit || 'Unit'}
              </span>
            </div>

            <h3 className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 truncate leading-tight">
              {item.name}
            </h3>

            {item.description && (
              <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1 leading-snug">
                {item.description}
              </p>
            )}
          </div>
        </div>

        {/* Weight Items: Pricing Mode Selector */}
        {isWeightBased && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-800">
                Pricing Mode
              </label>
              <div className="flex items-center bg-slate-100 p-0.5 rounded-full text-[11px] font-semibold text-slate-600">
                <button
                  type="button"
                  onClick={() => setPricingMode('portion')}
                  className={`px-2.5 py-0.5 rounded-full transition-all cursor-pointer ${
                    pricingMode === 'portion'
                      ? 'bg-white text-[#FF5C28] shadow-xs font-bold'
                      : 'hover:text-slate-900'
                  }`}
                >
                  By Portion
                </button>
                <button
                  type="button"
                  onClick={() => setPricingMode('amount')}
                  className={`px-2.5 py-0.5 rounded-full transition-all cursor-pointer ${
                    pricingMode === 'amount'
                      ? 'bg-white text-[#FF5C28] shadow-xs font-bold'
                      : 'hover:text-slate-900'
                  }`}
                >
                  By Rupees (Rs)
                </button>
              </div>
            </div>

            {/* Mode A: Select Portion */}
            {pricingMode === 'portion' ? (
              <div className="space-y-1">
                <span className="text-[10px] font-medium text-slate-500 block">
                  Select Weight Portion:
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  {availablePortions.map((p, idx) => {
                    const priceForPortion = calculateWeightPrice(item.basePrice, p.grams);
                    const isSelected = selectedPortionIndex === idx;

                    return (
                      <button
                        key={p.label || idx}
                        type="button"
                        onClick={() => setSelectedPortionIndex(idx)}
                        className={`py-1.5 px-1 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                          isSelected
                            ? 'border-[#FF5C28] bg-orange-50/60 shadow-2xs ring-1 ring-[#FF5C28]'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <span className={`text-[11px] font-bold ${isSelected ? 'text-[#FF5C28]' : 'text-slate-800'}`}>
                          {p.label}
                        </span>
                        <span className="text-[10px] font-medium text-slate-500 mt-0.5">
                          {formatCurrency(priceForPortion)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Mode B: Custom Rupee Amount */
              <div className="p-2 bg-orange-50/40 rounded-xl border border-orange-100 space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-700 flex items-center justify-between">
                  <span>Enter Custom Rupee Amount:</span>
                  <span className="text-[9px] text-slate-400">e.g. "Rs 100 ki biryani"</span>
                </label>

                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-400">
                      Rs
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="10"
                      value={customRupeeAmount}
                      onChange={(e) => setCustomRupeeAmount(e.target.value)}
                      placeholder="100"
                      className="w-full h-8 pl-8 pr-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-[#FF5C28] focus:ring-1 focus:ring-[#FF5C28]"
                    />
                  </div>

                  <div className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg flex items-center gap-1 shrink-0">
                    <Scale className="w-3 h-3 text-[#FF5C28]" />
                    <span className="text-xs font-bold text-slate-800">
                      {derivedWeightGrams}g
                    </span>
                  </div>
                </div>

                {/* Quick denomination chips */}
                <div className="flex items-center gap-1 flex-wrap pt-0.5">
                  <span className="text-[9px] text-slate-400 font-medium">Quick:</span>
                  {[50, 100, 150, 200, 250, 500].map((quickAmt) => (
                    <button
                      key={quickAmt}
                      type="button"
                      onClick={() => setCustomRupeeAmount(String(quickAmt))}
                      className="px-1.5 py-0.5 bg-white border border-slate-200 hover:border-orange-200 text-slate-600 rounded text-[9px] font-semibold transition-colors cursor-pointer"
                    >
                      Rs {quickAmt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Custom Portions / Sizes (e.g. Small, Medium, Large, Half, Full) */}
        {!isWeightBased && availablePortions.length > 0 ? (
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-800 block">
              Select Portion / Size:
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {availablePortions.map((p, idx) => {
                const isSelected = selectedPortionIndex === idx;
                const pPrice = p.price !== undefined ? p.price : item.basePrice;

                return (
                  <button
                    key={p.label || p.name || idx}
                    type="button"
                    onClick={() => setSelectedPortionIndex(idx)}
                    className={`py-1.5 px-2 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                      isSelected
                        ? 'border-[#FF5C28] bg-orange-50/60 shadow-2xs ring-1 ring-[#FF5C28]'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <span className={`text-[11px] font-bold ${isSelected ? 'text-[#FF5C28]' : 'text-slate-800'}`}>
                      {p.label || p.name}
                    </span>
                    <span className="text-[10px] font-semibold text-[#FF5C28] mt-0.5">
                      {formatCurrency(pPrice)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : !isWeightBased ? (
          <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100 text-xs">
            <span className="text-slate-500 font-medium">Portion / Unit:</span>
            <span className="font-bold text-slate-800">
              1 {item.unit || item.baseUnit || 'Piece'} ({formatCurrency(item.basePrice || 0)})
            </span>
          </div>
        ) : null}

        {/* Food Add-ons Section - Only shown if item has add-ons */}
        {foodAddons.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                <span>Add-ons</span>
                <span className="text-[9px] font-semibold px-1.5 py-0.2 bg-slate-100 text-slate-500 rounded-full">
                  {foodAddons.length}
                </span>
              </label>
              {foodAddons.some((a) => selectedAddonIds.includes(a.id)) && (
                <span className="text-[10px] text-[#FF5C28] font-bold">
                  +{formatCurrency(
                    calculateAddonTotal(
                      foodAddons
                        .filter((a) => selectedAddonIds.includes(a.id))
                        .map((a) => ({ ...a, quantity: selectedAddonQuantities[a.id] || 1 }))
                    )
                  )}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto pr-0.5">
              {foodAddons.map((addon) => {
                const isChecked = selectedAddonIds.includes(addon.id);
                const addonQty = selectedAddonQuantities[addon.id] || 0;
                const totalItemAddonPrice = (Number(addon.price) || 0) * (addonQty || 1);

                return (
                  <div
                    key={addon.id}
                    onClick={() => handleToggleAddon(addon.id)}
                    className={`py-1.5 px-2 rounded-lg border flex items-center justify-between gap-1.5 cursor-pointer transition-all ${
                      isChecked
                        ? 'border-[#FF5C28] bg-orange-50/60 text-slate-900 shadow-2xs ring-1 ring-[#FF5C28]/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                    }`}
                    title={addon.name}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <div
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 transition-colors ${
                          isChecked
                            ? 'bg-[#FF5C28] text-white'
                            : 'border border-slate-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] font-medium truncate block leading-tight">
                          {addon.name}
                        </span>
                        {isChecked && addonQty > 1 ? (
                          <span className="text-[9px] font-bold text-[#FF5C28] block leading-none mt-0.5">
                            +{formatCurrency(totalItemAddonPrice)}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {isChecked ? (
                      <div
                        className="flex items-center gap-1 shrink-0 bg-white/95 border border-orange-200 rounded-md p-0.5 shadow-2xs"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={(e) => handleUpdateAddonQty(addon.id, -1, e)}
                          className="w-4.5 h-4.5 rounded flex items-center justify-center text-slate-600 hover:bg-orange-100 hover:text-[#FF5C28] transition-colors cursor-pointer"
                          title="Decrease"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="w-3.5 text-center text-[10px] font-black text-[#FF5C28]">
                          {addonQty}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleUpdateAddonQty(addon.id, 1, e)}
                          className="w-4.5 h-4.5 rounded flex items-center justify-center text-slate-600 hover:bg-orange-100 hover:text-[#FF5C28] transition-colors cursor-pointer"
                          title="Increase"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-600 shrink-0">
                        +{formatCurrency(addon.price)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Drink Add-ons Section - Only shown if item has drink add-ons */}
        {drinkAddons.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                <span>🥤 Drinks / Extras</span>
                <span className="text-[9px] font-semibold px-1.5 py-0.2 bg-sky-50 text-sky-600 rounded-full border border-sky-100">
                  {drinkAddons.length}
                </span>
              </label>
              {drinkAddons.some((a) => selectedAddonIds.includes(a.id)) && (
                <span className="text-[10px] text-sky-600 font-bold">
                  +{formatCurrency(
                    calculateAddonTotal(
                      drinkAddons
                        .filter((a) => selectedAddonIds.includes(a.id))
                        .map((a) => ({ ...a, quantity: selectedAddonQuantities[a.id] || 1 }))
                    )
                  )}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto pr-0.5">
              {drinkAddons.map((addon) => {
                const isChecked = selectedAddonIds.includes(addon.id);
                const addonQty = selectedAddonQuantities[addon.id] || 0;
                const totalItemAddonPrice = (Number(addon.price) || 0) * (addonQty || 1);

                return (
                  <div
                    key={addon.id}
                    onClick={() => handleToggleAddon(addon.id)}
                    className={`py-1.5 px-2 rounded-lg border flex items-center justify-between gap-1.5 cursor-pointer transition-all ${
                      isChecked
                        ? 'border-sky-500 bg-sky-50/60 text-slate-900 shadow-2xs ring-1 ring-sky-400/30'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                    }`}
                    title={addon.name}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <div
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 transition-colors ${
                          isChecked
                            ? 'bg-sky-500 text-white'
                            : 'border border-slate-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] font-medium truncate block leading-tight">
                          {addon.name}
                        </span>
                        {isChecked && addonQty > 1 ? (
                          <span className="text-[9px] font-bold text-sky-600 block leading-none mt-0.5">
                            +{formatCurrency(totalItemAddonPrice)}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {isChecked ? (
                      <div
                        className="flex items-center gap-1 shrink-0 bg-white/95 border border-sky-200 rounded-md p-0.5 shadow-2xs"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={(e) => handleUpdateAddonQty(addon.id, -1, e)}
                          className="w-4.5 h-4.5 rounded flex items-center justify-center text-slate-600 hover:bg-sky-100 hover:text-sky-600 transition-colors cursor-pointer"
                          title="Decrease"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="w-3.5 text-center text-[10px] font-black text-sky-600">
                          {addonQty}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleUpdateAddonQty(addon.id, 1, e)}
                          className="w-4.5 h-4.5 rounded flex items-center justify-center text-slate-600 hover:bg-sky-100 hover:text-sky-600 transition-colors cursor-pointer"
                          title="Increase"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-600 shrink-0">
                        +{formatCurrency(addon.price)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quantity Controls & Rate per item */}
        <div className="p-2 bg-slate-50/80 rounded-xl border border-slate-200/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-700">Quantity</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <Minus className="w-3 h-3" />
              </button>

              <span className="w-5 text-center text-xs font-bold text-slate-900">
                {quantity}
              </span>

              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[9px] text-slate-400 block font-medium leading-none mb-0.5">Rate per item</span>
            <span className="text-xs font-bold text-slate-800">
              {formatCurrency(unitPrice)}
              {addonsTotal > 0 && (
                <span className="text-[10px] text-slate-400 font-normal ml-1">
                  (+Rs {addonsTotal})
                </span>
              )}
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
};

/**
 * ItemConfigModal
 * Public wrapper that keys by item.id so state automatically resets when a new item is selected.
 */
export const ItemConfigModal = ({ item, isOpen, onClose, onAddToCart }) => {
  if (!isOpen || !item) return null;

  return (
    <ItemConfigModalContent
      key={item.id}
      item={item}
      isOpen={isOpen}
      onClose={onClose}
      onAddToCart={onAddToCart}
    />
  );
};

export default ItemConfigModal;
