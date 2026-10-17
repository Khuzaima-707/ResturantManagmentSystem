import React, { useState, useMemo, useRef } from 'react';
import {
  Trash2,
  Plus,
  Minus,
  Receipt,
  Utensils,
  CreditCard,
  Banknote,
  Smartphone,
  AlertCircle,
  X,
  ShoppingBag,
  Printer,
  Tag,
} from 'lucide-react';
import { useAppStore } from '../../../store';
import { OrderRepository } from '../../../services/repositories/OrderRepository';
import {
  calculateCartSubtotal,
  calculateDiscount,
  calculateTax,
  calculateGrandTotal,
  calculateChange,
  generateInvoiceNumber,
  formatCurrency,
  buildOrderLineSnapshots,
} from '../../../domain/calculations';
import { getItemCompatibleAddons } from '../../../domain/rules';
import { Button } from '../../../components/ui/Button';

/**
 * OrderCartPanel Component
 * Handles the Current Order panel on POS screen.
 * Supports:
 * - Dine-In / Takeaway selection
 * - Cart line snapshots with thumbnails, configuration summary, and +/- controls
 * - Discount calculation (% and fixed Rs)
 * - Dynamic Tax calculation using store settings
 * - Payment method selection (Cash, Card, Online)
 * - Cash received & live change calculation
 * - Validation with user-friendly inline messages
 * - Sale completion with canonical order transaction snapshots
 */
export const OrderCartPanel = ({ onOrderCompleted, onClose }) => {
  const {
    cart,
    updateCartQuantity,
    updateCartLineAddons,
    updateCartLinePortion,
    updateCartLineCustomAmount,
    removeCartLine,
    clearCart,
    orderType,
    setOrderType,
    settings,
    orders,
    addOrder,
    user,
    items,
    addons,
  } = useAppStore();

  const [customRsEditingLineId, setCustomRsEditingLineId] = useState(null);
  const [customRsInputVal, setCustomRsInputVal] = useState('');

  // Discount states
  const [discountType, setDiscountType] = useState('percentage'); // 'percentage' | 'fixed'
  const [discountValue, setDiscountValue] = useState('');
  const [guestCount, setGuestCount] = useState(1);

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState(
    settings?.pos?.defaultPaymentMethod || 'Cash'
  ); // 'Cash' | 'Card' | 'Online'
  const [cashReceived, setCashReceived] = useState('');

  // Card payment details (Matches Image 2)
  const [cardNetwork, setCardNetwork] = useState('Visa'); // 'Visa' | 'Mastercard' | 'PayPak' | 'UnionPay'
  const [cardSlipNumber, setCardSlipNumber] = useState('');

  // Online payment details (Matches Image 3)
  const [onlineChannel, setOnlineChannel] = useState('JazzCash'); // 'JazzCash' | 'EasyPaisa' | 'Raast' | 'Bank'
  const [onlineTransactionId, setOnlineTransactionId] = useState('');

  // Operator verification checkbox (Matches Image 2 & 3)
  const [operatorVerified, setOperatorVerified] = useState(true);

  const [validationError, setValidationError] = useState('');
  const [isClearing, setIsClearing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  // Financial calculations via pure domain utilities
  const subtotal = useMemo(() => calculateCartSubtotal(cart), [cart]);

  const parsedDiscountVal = Math.max(0, Number(discountValue) || 0);
  const discountAmount = useMemo(
    () => calculateDiscount(subtotal, discountType, parsedDiscountVal),
    [subtotal, discountType, parsedDiscountVal]
  );

  const discountedSubtotal = Math.max(0, subtotal - discountAmount);

  // Dynamic tax from settings
  const isTaxEnabled = settings?.tax?.enabled ?? settings?.taxEnabled;
  const configuredRate = settings?.tax?.rate ?? settings?.taxRate;
  const taxRate = isTaxEnabled ? (Number(configuredRate) || 0) : 0;
  const taxAmount = useMemo(
    () => calculateTax(discountedSubtotal, taxRate),
    [discountedSubtotal, taxRate]
  );

  const grandTotal = useMemo(
    () => calculateGrandTotal(discountedSubtotal, taxAmount),
    [discountedSubtotal, taxAmount]
  );

  // Cash change calculation
  const parsedCashReceived = Number(cashReceived) || 0;
  const changeAmount = useMemo(() => {
    if (paymentMethod !== 'Cash') return 0;
    return calculateChange(parsedCashReceived, grandTotal);
  }, [paymentMethod, parsedCashReceived, grandTotal]);

  // Direct In-Cart Add-on Handlers
  const handleAddAddonToLine = (lineId, addon) => {
    const targetLine = cart.find((l) => l.id === lineId);
    if (!targetLine) return;
    const currentAddons = Array.isArray(targetLine.addonSnapshots) ? [...targetLine.addonSnapshots] : [];
    if (currentAddons.some((a) => a.id === addon.id)) return;
    const newAddon = {
      id: addon.id,
      name: addon.name,
      price: Number(addon.price) || 0,
      costPrice: addon.costPrice !== undefined ? addon.costPrice : null,
      quantity: 1,
    };
    updateCartLineAddons(lineId, [...currentAddons, newAddon]);
  };

  const handleUpdateAddonQtyOnLine = (lineId, addonId, delta) => {
    const targetLine = cart.find((l) => l.id === lineId);
    if (!targetLine) return;
    const currentAddons = Array.isArray(targetLine.addonSnapshots) ? targetLine.addonSnapshots : [];
    const updated = currentAddons
      .map((a) => {
        if (a.id === addonId) {
          const newQty = (a.quantity || 1) + delta;
          return newQty > 0 ? { ...a, quantity: newQty } : null;
        }
        return a;
      })
      .filter(Boolean);
    updateCartLineAddons(lineId, updated);
  };

  const handleRemoveAddonFromLine = (lineId, addonId) => {
    const targetLine = cart.find((l) => l.id === lineId);
    if (!targetLine) return;
    const currentAddons = Array.isArray(targetLine.addonSnapshots) ? targetLine.addonSnapshots : [];
    updateCartLineAddons(
      lineId,
      currentAddons.filter((a) => a.id !== addonId)
    );
  };

  const isCashInsufficient =
    paymentMethod === 'Cash' &&
    grandTotal > 0 &&
    parsedCashReceived < grandTotal;

  const isCardIncomplete =
    paymentMethod === 'Card' &&
    (!cardSlipNumber || !cardSlipNumber.trim() || !operatorVerified);

  const isOnlineIncomplete =
    paymentMethod === 'Online' &&
    (!onlineTransactionId || !onlineTransactionId.trim() || !operatorVerified);

  const isCheckoutDisabled =
    cart.length === 0 ||
    (paymentMethod === 'Cash' && isCashInsufficient) ||
    isCardIncomplete ||
    isOnlineIncomplete;

  const handleClearCart = () => {
    const confirmRequired = settings?.pos?.confirmClearCart !== false;
    if (confirmRequired && !isClearing) {
      setIsClearing(true);
      setTimeout(() => setIsClearing(false), 3000);
      return;
    }
    clearCart();
    setIsClearing(false);
    setCashReceived('');
    setCardSlipNumber('');
    setOnlineTransactionId('');
    setDiscountValue('');
    setValidationError('');
  };

  const handleCheckout = async () => {
    if (isSubmittingRef.current || isSubmitting) return;

    setValidationError('');

    if (cart.length === 0) {
      setValidationError('Cannot complete sale: Cart is empty.');
      return;
    }

    if (grandTotal <= 0 && subtotal <= 0) {
      setValidationError('Cannot complete sale: Invalid order amount.');
      return;
    }

    if (paymentMethod === 'Cash') {
      const received = Number(cashReceived) || 0;
      if (received < grandTotal) {
        setValidationError(
          `Insufficient cash received: Rs ${grandTotal - received} remaining.`
        );
        return;
      }
    }

    if (paymentMethod === 'Card') {
      if (!cardSlipNumber || !cardSlipNumber.trim()) {
        setValidationError(
          'Card payment complete karne ke liye slip # ya last 4 digits enter karein.'
        );
        return;
      }
      if (!operatorVerified) {
        setValidationError('Operator verification required on POS machine.');
        return;
      }
    }

    if (paymentMethod === 'Online') {
      if (!onlineTransactionId || !onlineTransactionId.trim()) {
        setValidationError(
          'Online payment complete karne ke liye Transaction ID enter karein.'
        );
        return;
      }
      if (!operatorVerified) {
        setValidationError('Operator verification required in app.');
        return;
      }
    }

    // Require valid portion selection before completing sale
    const unselectedPortionLine = cart.find(
      (l) => l.requiresPortionSelection || l.selectedPortionLabel === 'Select Portion' || (l.pricingMode === 'weight' && !l.portionPrice)
    );
    if (unselectedPortionLine) {
      setValidationError(`Please select a portion for "${unselectedPortionLine.itemNameSnapshot}" before completing sale.`);
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      // 1. Authoritative sequential invoice number from server/database
      const prefix = settings?.invoicePrefix || 'INV-';
      const seqInfo = await OrderRepository.getNextInvoiceNumber(prefix);
      const invoiceNumber = seqInfo?.invoiceNumber || generateInvoiceNumber(prefix, (orders?.length || 0) + 1);
      const sequenceNumber = seqInfo?.sequenceNumber || (orders?.length || 0) + 1;

      // 2. Immutable creator attribution from the logged-in user at sale completion
      const loggedInUser = user || storage.get('active_user', null) || {};
      const isRoleAdmin = String(loggedInUser.role || '').toLowerCase().includes('admin') || String(loggedInUser.username || '').toLowerCase() === 'admin';
      const createdByUserId = String(loggedInUser.id || (loggedInUser.username ? `user_${loggedInUser.username}` : (isRoleAdmin ? 'user_admin' : 'user_cashier'))).trim();
      const createdByName = String(loggedInUser.name || loggedInUser.username || (isRoleAdmin ? 'Admin' : 'Cashier')).trim();
      const createdByRole = isRoleAdmin ? 'admin' : 'cashier';

      const amountReceivedFinal =
        paymentMethod === 'Cash'
          ? Number(cashReceived) || grandTotal
          : grandTotal;

      const changeAmountFinal =
        paymentMethod === 'Cash'
          ? Math.max(0, amountReceivedFinal - grandTotal)
          : 0;

      const finalLines = buildOrderLineSnapshots(cart, items, addons, discountAmount);

      const newCompletedOrder = {
        id: `ord-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        invoiceNumber,
        sequenceNumber,
        status: 'completed',
        orderType: orderType || 'Dine-In',
        guestCount: orderType === 'Takeaway' ? 1 : Math.max(1, Number(guestCount) || 1),
        lines: finalLines,
        subtotal,
        discountType,
        discountValue: parsedDiscountVal,
        discountAmount,
        taxableAmount: discountedSubtotal,
        taxRateSnapshot: taxRate,
        taxAmount,
        grandTotal,
        paymentMethod,
        cardNetwork: paymentMethod === 'Card' ? cardNetwork : undefined,
        posSlipNumber: paymentMethod === 'Card' ? cardSlipNumber.trim() : undefined,
        onlineChannel: paymentMethod === 'Online' ? onlineChannel : undefined,
        transactionId: paymentMethod === 'Online' ? onlineTransactionId.trim() : undefined,
        paymentVerified: operatorVerified,
        amountReceived: amountReceivedFinal,
        changeAmount: changeAmountFinal,
        createdByUserId,
        createdByName,
        createdByRole,
        cashierName: createdByName,
        storeName: settings?.storeName || 'Chengxi Store',
        completedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 3. Commit to persistent transaction ledger (returns final synced order if updated by server)
      const finalOrder = await addOrder(newCompletedOrder);

      // Reset active cart and controls
      clearCart();
      setGuestCount(1);
      setCashReceived('');
      setCardSlipNumber('');
      setOnlineTransactionId('');
      setDiscountValue('');
      setValidationError('');

      // Trigger Invoice confirmation modal with final immutable order
      if (typeof onOrderCompleted === 'function') {
        onOrderCompleted(finalOrder || newCompletedOrder);
      }
    } finally {
      setTimeout(() => {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }, 600);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col h-full overflow-hidden">
      {/* Header: Title, Order Type & Close (Matches Image 2) */}
      <div className="py-2.5 px-3.5 sm:px-4 border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-[#FF5C28]" />
          <h2 className="text-sm sm:text-base font-bold text-slate-900">Current Order</h2>
          <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-[#FF5C28] text-[11px] font-bold">
            {orderType}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Clear Cart Button (when items exist) */}
          {cart.length > 0 && (
            <button
              type="button"
              onClick={handleClearCart}
              className={`text-xs px-2 py-1 rounded-lg transition-colors font-bold flex items-center gap-1 cursor-pointer ${
                isClearing
                  ? 'bg-rose-100 text-rose-700 border border-rose-200'
                  : 'text-rose-500 hover:text-rose-600 hover:bg-rose-50'
              }`}
              title={isClearing ? 'Click again to confirm clear' : 'Clear active cart'}
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>{isClearing ? 'Confirm?' : 'Clear All'}</span>
            </button>
          )}

          {/* Close Drawer Button */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close cart drawer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Top Section: Table Header & Scrollable Items List */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Table Header: # Item Qty Price (Matches Screenshot 2) */}
        <div className="grid grid-cols-12 text-[11px] font-bold text-slate-400 px-3 py-1.5 border-b border-slate-100 shrink-0 bg-white">
          <span className="col-span-1">#</span>
          <span className="col-span-5">Item</span>
          <span className="col-span-3 text-center">Qty</span>
          <span className="col-span-3 text-right">Price</span>
        </div>

        {/* Cart Items List or Compact Empty State */}
        <div className="flex-1 overflow-y-auto min-h-0 px-3 py-1.5 space-y-1.5">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-3.5 text-center text-slate-400">
              <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-200/80 flex items-center justify-center mb-1 text-slate-400">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-slate-800">Your cart is empty</p>
              <p className="text-[11px] text-slate-400 max-w-[210px] leading-tight mt-0.5">
                Click + on any menu item to start building your order.
              </p>
            </div>
          ) : (
            cart.map((line, idx) => {
              const masterItem = !line.isDeal
                ? (items || []).find((it) => it.id === line.itemId || String(it.id) === String(line.itemId))
                : null;
              const compatibleAddons = masterItem ? getItemCompatibleAddons(masterItem, addons) : [];
              const selectedAddons = Array.isArray(line.addonSnapshots) ? line.addonSnapshots : [];
              const selectedAddonIds = new Set(selectedAddons.map((a) => a.id));
              const availableUnselectedAddons = compatibleAddons.filter((a) => !selectedAddonIds.has(a.id));

              return (
                <div
                  key={line.id}
                  className="p-2 rounded-xl border border-slate-100 bg-white hover:border-slate-200 transition-all text-xs"
                >
                  <div className="grid grid-cols-12 items-center gap-1.5">
                    <span className="col-span-1 font-semibold text-slate-400">{idx + 1}</span>

                    <div className="col-span-5 flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200/60 overflow-hidden shrink-0 flex items-center justify-center">
                        {line.itemImageSnapshot ? (
                          <img
                            src={line.itemImageSnapshot}
                            alt={line.itemNameSnapshot}
                            className="w-full h-full object-cover"
                          />
                        ) : line.isDeal ? (
                          <Tag className="w-3.5 h-3.5 text-[#FF5C28]" />
                        ) : (
                          <Utensils className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-slate-900 truncate text-[11px] leading-tight flex items-center gap-1">
                          {line.isDeal && (
                            <span className="px-1 py-0.2 rounded-xs bg-[#FF5C28] text-white text-[8px] font-black shrink-0">
                              DEAL
                            </span>
                          )}
                          <span className="truncate">{line.itemNameSnapshot}</span>
                        </h4>
                        <span className="text-[10px] text-slate-400 block font-medium">
                          Rs {line.portionPrice || line.unitPrice}
                        </span>

                        {/* Deal Included Items */}
                        {line.isDeal && Array.isArray(line.includedItems) && line.includedItems.length > 0 && (
                          <div className="mt-0.5 space-y-0.5">
                            {line.includedItems.map((inc, i) => (
                              <span key={i} className="text-[9px] text-slate-500 font-medium block leading-tight">
                                • {inc.name}{inc.portion ? ` ${inc.portion}` : ''}{inc.quantity && inc.quantity > 1 ? ` x${inc.quantity}` : ''}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Portion & Custom Weight Controls */}
                        {!line.isDeal && (
                          <div className="mt-0.5">
                            {((Array.isArray(masterItem?.portionOptions) && masterItem.portionOptions.length > 0) ||
                              (masterItem?.unitType || '').toLowerCase() === 'weight' ||
                              (masterItem?.unit || '').toLowerCase().includes('kg') ||
                              (line.baseUnitSnapshot || '').toLowerCase().includes('kg')) ? (
                              <div className="space-y-0.5">
                                {customRsEditingLineId === line.id ? (
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] font-bold text-slate-600">Rs</span>
                                    <input
                                      type="number"
                                      min="10"
                                      step="10"
                                      autoFocus
                                      value={customRsInputVal}
                                      onChange={(e) => setCustomRsInputVal(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          const entered = Number(customRsInputVal) || 0;
                                          if (entered > 0) {
                                            updateCartLineCustomAmount?.(line.id, entered);
                                          }
                                          setCustomRsEditingLineId(null);
                                        } else if (e.key === 'Escape') {
                                          setCustomRsEditingLineId(null);
                                        }
                                      }}
                                      onBlur={() => {
                                        const entered = Number(customRsInputVal) || 0;
                                        if (entered > 0) {
                                          updateCartLineCustomAmount?.(line.id, entered);
                                        }
                                        setCustomRsEditingLineId(null);
                                      }}
                                      placeholder="Amount"
                                      className="w-16 h-5 px-1 text-[10px] font-bold text-slate-800 bg-white border border-orange-300 rounded outline-none focus:ring-1 focus:ring-[#FF5C28]"
                                    />
                                    {Number(line.basePriceSnapshot || masterItem?.basePrice) > 0 ? (
                                      <span className="text-[9px] font-semibold text-slate-400">
                                        ≈ {Math.round((Number(customRsInputVal || 0) / Number(line.basePriceSnapshot || masterItem?.basePrice)) * 1000)}g
                                      </span>
                                    ) : null}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <select
                                      value={line.requiresPortionSelection ? '' : (line.pricingMode === 'amount' ? 'custom_rs' : (line.selectedPortionLabel || ''))}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === 'custom_rs') {
                                          setCustomRsInputVal(line.pricingMode === 'amount' ? String(line.portionPrice || 100) : '100');
                                          setCustomRsEditingLineId(line.id);
                                        } else if (val) {
                                          const isWeight = (masterItem?.unitType || '').toLowerCase() === 'weight' || (masterItem?.unit || '').toLowerCase().includes('kg') || (line.baseUnitSnapshot || '').toLowerCase().includes('kg');
                                          const basePr = Number(line.basePriceSnapshot || masterItem?.basePrice || 0);

                                          let found = (masterItem?.portionOptions || []).find((p) => (p.label || p.name) === val);
                                          if (!found && isWeight) {
                                            const std = [
                                              { label: '250g', grams: 250, price: Math.round(basePr * 0.25) },
                                              { label: '500g', grams: 500, price: Math.round(basePr * 0.5) },
                                              { label: '750g', grams: 750, price: Math.round(basePr * 0.75) },
                                              { label: '1kg', grams: 1000, price: Math.round(basePr) },
                                            ].find((s) => s.label === val);
                                            if (std) found = std;
                                          }
                                          if (found) {
                                            const grams = found.grams || (found.quantityInBaseUnit ? Math.round(Number(found.quantityInBaseUnit) * 1000) : null);
                                            const price = found.price !== undefined
                                              ? Number(found.price)
                                              : (isWeight && grams && basePr ? Math.round((basePr * grams) / 1000) : basePr);
                                            updateCartLinePortion(line.id, {
                                              label: found.label || found.name,
                                              grams,
                                              price,
                                              pricingMode: isWeight ? 'weight' : 'portion',
                                            });
                                          }
                                        }
                                      }}
                                      className={`text-[10px] font-bold rounded px-1.5 py-0.5 cursor-pointer outline-none border ${
                                        line.requiresPortionSelection || line.selectedPortionLabel === 'Select Portion'
                                          ? 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse'
                                          : 'text-[#FF5C28] bg-orange-50 border-orange-200'
                                      }`}
                                    >
                                      {(line.requiresPortionSelection || line.selectedPortionLabel === 'Select Portion') && (
                                        <option value="">⚠️ Select Portion</option>
                                      )}
                                      {(() => {
                                        const isWeight = (masterItem?.unitType || '').toLowerCase() === 'weight' || (masterItem?.unit || '').toLowerCase().includes('kg') || (line.baseUnitSnapshot || '').toLowerCase().includes('kg');
                                        const basePr = Number(line.basePriceSnapshot || masterItem?.basePrice || 0);
                                        const opts = (Array.isArray(masterItem?.portionOptions) && masterItem.portionOptions.length > 0)
                                          ? masterItem.portionOptions.map((opt) => {
                                              const g = opt.grams || (opt.quantityInBaseUnit ? Math.round(Number(opt.quantityInBaseUnit) * 1000) : null);
                                              const pr = opt.price !== undefined ? Number(opt.price) : (isWeight && g && basePr ? Math.round((basePr * g) / 1000) : basePr);
                                              return { label: opt.label || opt.name, price: pr };
                                            })
                                          : isWeight
                                          ? [
                                              { label: '250g', price: Math.round(basePr * 0.25) },
                                              { label: '500g', price: Math.round(basePr * 0.5) },
                                              { label: '750g', price: Math.round(basePr * 0.75) },
                                              { label: '1kg', price: Math.round(basePr) },
                                            ]
                                          : [];
                                        return (
                                          <>
                                            {opts.map((opt) => (
                                              <option key={opt.label} value={opt.label}>
                                                {opt.label} (Rs {opt.price})
                                              </option>
                                            ))}
                                            {isWeight && (
                                              <option value="custom_rs">
                                                {line.pricingMode === 'amount' ? line.selectedPortionLabel : 'Custom Rs Amount...'}
                                              </option>
                                            )}
                                          </>
                                        );
                                      })()}
                                    </select>
                                    {line.pricingMode === 'amount' && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setCustomRsInputVal(String(line.portionPrice || ''));
                                          setCustomRsEditingLineId(line.id);
                                        }}
                                        className="text-[9.5px] font-bold text-slate-500 hover:text-[#FF5C28] underline cursor-pointer"
                                        title="Edit custom rupee amount"
                                      >
                                        Edit Rs
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : line.selectedPortionLabel ? (
                              <span className="text-[9px] text-[#FF5C28] font-semibold block">
                                {line.selectedPortionLabel}
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="col-span-3 flex items-center justify-center">
                      <div className="flex items-center border border-slate-200 rounded-full bg-white">
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(line.id, -1)}
                          className="w-4.5 h-4.5 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-l-full cursor-pointer"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="px-1.5 text-xs font-bold text-slate-800 min-w-[14px] text-center">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(line.id, 1)}
                          className="w-4.5 h-4.5 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-r-full cursor-pointer"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>

                    <div className="col-span-3 flex items-center justify-end gap-1.5">
                      <span className="font-bold text-slate-900 text-xs whitespace-nowrap">
                        Rs {line.lineSubtotal}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeCartLine(line.id)}
                        className="p-0.5 text-slate-300 hover:text-rose-500 rounded transition-colors cursor-pointer shrink-0"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Add-ons Tray directly attached to item */}
                  {!line.isDeal && (selectedAddons.length > 0 || compatibleAddons.length > 0) && (
                    <div className="mt-1.5 pt-1.5 border-t border-slate-100/90 space-y-1.5">
                      {/* Active Add-ons on this line */}
                      {selectedAddons.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 items-center">
                          <span className="text-[9.5px] font-bold text-orange-600 bg-orange-100/80 px-1.5 py-0.5 rounded tracking-wide shrink-0">
                            Active:
                          </span>
                          {selectedAddons.map((addon) => (
                            <div
                              key={addon.id}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-orange-50 border border-orange-200 text-slate-800 text-xs font-semibold shadow-2xs"
                            >
                              <span>{addon.name}</span>
                              <span className="text-xs font-bold text-[#FF5C28]">
                                +Rs {(Number(addon.price) || 0) * (addon.quantity || 1)}
                              </span>
                              <div className="flex items-center ml-0.5 bg-white rounded-md border border-orange-200 shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateAddonQtyOnLine(line.id, addon.id, -1)}
                                  className="w-4 h-4 flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-l cursor-pointer text-xs font-bold transition-colors"
                                  title="Decrease quantity"
                                >
                                  -
                                </button>
                                <span className="text-xs font-bold text-slate-800 px-1 min-w-[12px] text-center">
                                  {addon.quantity || 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateAddonQtyOnLine(line.id, addon.id, 1)}
                                  className="w-4 h-4 flex items-center justify-center text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-r cursor-pointer text-xs font-bold transition-colors"
                                  title="Increase quantity"
                                >
                                  +
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveAddonFromLine(line.id, addon.id)}
                                className="w-4 h-4 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-100/70 rounded-full cursor-pointer transition-colors ml-0.5"
                                title="Remove addon"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Available Add-ons to quickly add with 1-click */}
                      {availableUnselectedAddons.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[9.5px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded tracking-wide shrink-0">
                            + Add:
                          </span>
                          {availableUnselectedAddons.map((addon) => (
                            <button
                              key={addon.id}
                              type="button"
                              onClick={() => handleAddAddonToLine(line.id, addon)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-50 hover:bg-orange-50 active:scale-95 border border-slate-200 hover:border-[#FF5C28]/40 text-slate-700 hover:text-[#FF5C28] text-xs font-medium transition-all shadow-2xs hover:shadow-xs cursor-pointer group"
                            >
                              <Plus className="w-3 h-3 text-slate-400 group-hover:text-[#FF5C28] transition-colors" />
                              <span className="font-semibold text-slate-800 group-hover:text-[#FF5C28]">
                                {addon.name}
                              </span>
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-white border border-slate-200 text-[#FF5C28] font-bold text-[11px] shadow-2xs group-hover:border-orange-200">
                                Rs {addon.price}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Lower Section: Calculations & Payment Details (Matches Screenshot 2) */}
      <div className="shrink-0 border-t border-slate-100 bg-white px-3.5 py-1.5 space-y-1.5">
        {/* Subtotal */}
        <div className="flex justify-between items-center text-xs text-slate-600">
          <span>Subtotal</span>
          <span className="font-bold text-slate-900">{formatCurrency(subtotal)}</span>
        </div>

        {/* Discount Controls */}
        <div className="flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <span>Discount</span>
            <div className="inline-flex rounded-full bg-slate-100 p-0.5 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setDiscountType('percentage')}
                className={`px-1.5 py-0.2 rounded-full cursor-pointer ${
                  discountType === 'percentage'
                    ? 'bg-white text-[#FF5C28] shadow-2xs'
                    : 'text-slate-600'
                }`}
              >
                %
              </button>
              <button
                type="button"
                onClick={() => setDiscountType('fixed')}
                className={`px-1.5 py-0.2 rounded-full cursor-pointer ${
                  discountType === 'fixed'
                    ? 'bg-white text-[#FF5C28] shadow-2xs'
                    : 'text-slate-600'
                }`}
              >
                Rs
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min="0"
              max={discountType === 'percentage' ? '100' : undefined}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder="0"
              className="w-16 h-6 px-1.5 text-right text-xs font-medium bg-white rounded-md border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#FF5C28]"
            />
            <span className="font-semibold text-slate-900 text-xs">
              {discountAmount > 0 ? `-${formatCurrency(discountAmount)}` : 'Rs 0'}
            </span>
          </div>
        </div>

        {/* Tax */}
        <div className="flex justify-between items-center text-xs text-slate-600">
          <div className="flex items-center gap-1">
            <span>Tax ({taxRate}%)</span>
            {!settings?.taxEnabled && (
              <span className="text-[10px] text-slate-400">(disabled)</span>
            )}
          </div>
          <span className="font-bold text-slate-900">{formatCurrency(taxAmount)}</span>
        </div>

        {/* Grand Total Box (Matches Screenshot 2) */}
        <div className="bg-[#FFF4EC] border border-[#FFE2D1] rounded-xl px-3 py-1.5 flex items-center justify-between shadow-2xs">
          <span className="text-sm font-bold text-slate-800">Grand Total</span>
          <span className="text-lg font-black text-slate-900">
            Rs {grandTotal.toLocaleString('en-PK')}
          </span>
        </div>

        {/* Payment Method Selector */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-500 block select-none">
            Payment Method
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'Cash', label: 'Cash', icon: Banknote },
              { id: 'Card', label: 'Card', icon: CreditCard },
              { id: 'Online', label: 'Online', icon: Smartphone },
            ].map((method) => {
              const Icon = method.icon;
              const isSelected = paymentMethod === method.id;
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(method.id);
                    setValidationError('');
                  }}
                  className={`py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all border cursor-pointer ${
                    isSelected
                      ? 'bg-[#FF5C28] text-white border-[#FF5C28] shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{method.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cash Payment Section (Matches Screenshot 2) */}
        {paymentMethod === 'Cash' && (
          <div className="space-y-1 pt-0.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Amount Received *</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-400 font-bold">Rs</span>
                <input
                  type="number"
                  min="0"
                  value={cashReceived}
                  onChange={(e) => {
                    setCashReceived(e.target.value);
                    setValidationError('');
                  }}
                  placeholder="0"
                  className="w-24 h-7 px-2 text-right text-xs font-bold bg-white rounded-lg border border-slate-300 focus:outline-none focus:border-[#FF5C28] focus:ring-1 focus:ring-[#FF5C28]"
                />
              </div>
            </div>

            {/* Quick cash shortcut pills (Matches Screenshot 2: Exact, 1000, 2000, 5000) */}
            <div className="flex items-center gap-1.5 justify-end flex-wrap pt-0.5">
              <button
                type="button"
                onClick={() => setCashReceived(String(grandTotal))}
                className="text-[11px] px-2.5 py-0.5 rounded-xl border border-[#FF5C28] bg-orange-50/60 hover:bg-orange-100 text-[#FF5C28] font-bold transition-colors cursor-pointer"
              >
                Exact (Rs {grandTotal})
              </button>
              {[1000, 2000, 5000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setCashReceived(String(val))}
                  className="text-[11px] px-2.5 py-0.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors cursor-pointer"
                >
                  Rs {val}
                </button>
              ))}
            </div>

            {/* Change Result */}
            <div className="flex justify-between items-center text-xs pt-0.5">
              <span className="font-bold text-slate-800">Change</span>
              <span className="font-bold text-emerald-600 text-sm">
                Rs {changeAmount.toLocaleString('en-PK')}
              </span>
            </div>

            {/* Insufficient Cash Warning */}
            {isCashInsufficient && (
              <div className="flex items-center gap-1 text-[11px] font-medium text-rose-600">
                <span>⚠️ Cash amount received enter karein</span>
              </div>
            )}
          </div>
        )}

        {/* Card Payment Section */}
        {paymentMethod === 'Card' && (
          <div className="space-y-1 pt-0.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600">Total Charge:</span>
              <span className="font-bold text-slate-900 text-sm">
                Rs {grandTotal.toLocaleString('en-PK')}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1">
              {['Visa', 'Mastercard', 'PayPak', 'UnionPay'].map((network) => (
                <button
                  key={network}
                  type="button"
                  onClick={() => setCardNetwork(network)}
                  className={`py-1 px-1 rounded-lg text-[11px] font-bold transition-all border cursor-pointer text-center ${
                    cardNetwork === network
                      ? 'bg-[#FF5C28] text-white border-[#FF5C28]'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {network}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={cardSlipNumber}
              onChange={(e) => {
                setCardSlipNumber(e.target.value);
                setValidationError('');
              }}
              placeholder="Slip # ya Last 4 Digits (1234)"
              className="w-full h-7 px-2.5 text-xs bg-white rounded-lg border border-slate-200 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#FF5C28]"
            />

            <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-slate-700 font-medium">
              <input
                type="checkbox"
                checked={operatorVerified}
                onChange={(e) => setOperatorVerified(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-[#FF5C28] border-slate-300 focus:ring-[#FF5C28] cursor-pointer accent-[#FF5C28]"
              />
              <span>Operator verified payment on machine</span>
            </label>
          </div>
        )}

        {/* Online Payment Section */}
        {paymentMethod === 'Online' && (
          <div className="space-y-1 pt-0.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600">Total Charge:</span>
              <span className="font-bold text-slate-900 text-sm">
                Rs {grandTotal.toLocaleString('en-PK')}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1">
              {['JazzCash', 'EasyPaisa', 'Raast', 'Bank'].map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setOnlineChannel(ch)}
                  className={`py-1 px-1 rounded-lg text-[11px] font-bold transition-all border cursor-pointer text-center ${
                    onlineChannel === ch
                      ? 'bg-[#FF5C28] text-white border-[#FF5C28]'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={onlineTransactionId}
              onChange={(e) => {
                setOnlineTransactionId(e.target.value);
                setValidationError('');
              }}
              placeholder="Transaction ID / Ref #"
              className="w-full h-7 px-2.5 text-xs bg-white rounded-lg border border-slate-200 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#FF5C28]"
            />

            <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-slate-700 font-medium">
              <input
                type="checkbox"
                checked={operatorVerified}
                onChange={(e) => setOperatorVerified(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-[#FF5C28] border-slate-300 focus:ring-[#FF5C28] cursor-pointer accent-[#FF5C28]"
              />
              <span>Operator verified in app</span>
            </label>
          </div>
        )}

        {/* Validation Error Banner if any */}
        {validationError && (
          <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px]">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Checkout Button: Directly below payment method (Matches Screenshot 2) */}
        <button
          type="button"
          disabled={isCheckoutDisabled || isSubmitting}
          onClick={handleCheckout}
          className="w-full h-11 px-4 rounded-2xl bg-[#FF5C28] hover:bg-[#E04D1D] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Processing Sale...</span>
            </>
          ) : (
            <>
              <Printer className="w-4 h-4 stroke-[2.2]" />
              <span>Complete Sale & Print invoice</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default OrderCartPanel;
