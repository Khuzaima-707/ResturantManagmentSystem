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
} from 'lucide-react';
import { useAppStore } from '../../../store';
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

  const handleCheckout = () => {
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

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      // Generate canonical invoice transaction snapshot (with collision guard)
      let nextSequence = (orders?.length || 0) + 1;
      const prefix = settings?.invoicePrefix || 'INV-';
      let invoiceNumber = generateInvoiceNumber(prefix, nextSequence);
      while (orders?.some((o) => o.invoiceNumber === invoiceNumber)) {
        nextSequence += 1;
        invoiceNumber = generateInvoiceNumber(prefix, nextSequence);
      }

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
        cashierName: user?.name || 'Cashier',
        storeName: settings?.storeName || 'Chengxi Store',
        completedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Commit to persistent transaction ledger
      addOrder(newCompletedOrder);

      // Reset active cart and controls
      clearCart();
      setGuestCount(1);
      setCashReceived('');
      setCardSlipNumber('');
      setOnlineTransactionId('');
      setDiscountValue('');
      setValidationError('');

      // Trigger Invoice confirmation modal
      if (typeof onOrderCompleted === 'function') {
        onOrderCompleted(newCompletedOrder);
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
      <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
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
          <span className="col-span-6">Item</span>
          <span className="col-span-3 text-center">Qty</span>
          <span className="col-span-2 text-right">Price</span>
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
            cart.map((line, idx) => (
              <div
                key={line.id}
                className="grid grid-cols-12 items-center gap-2 p-1.5 rounded-xl border border-slate-100 bg-white hover:border-slate-200 transition-all text-xs"
              >
                <span className="col-span-1 font-semibold text-slate-400">{idx + 1}</span>

                <div className="col-span-6 flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200/60 overflow-hidden shrink-0 flex items-center justify-center">
                    {line.itemImageSnapshot ? (
                      <img
                        src={line.itemImageSnapshot}
                        alt={line.itemNameSnapshot}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Utensils className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 truncate text-[11px] leading-tight">
                      {line.itemNameSnapshot}
                    </h4>
                    <span className="text-[10px] text-slate-400 block">
                      Rs {line.unitPrice}
                    </span>
                    {line.selectedPortionLabel && (
                      <span className="text-[9px] text-[#FF5C28] block">
                        {line.selectedPortionLabel}
                      </span>
                    )}
                    {Array.isArray(line.addonSnapshots) && line.addonSnapshots.length > 0 && (
                      <span className="text-[9px] text-slate-500 font-medium block truncate">
                        +{line.addonSnapshots
                          .map((a) => `${a.name}${a.quantity && a.quantity > 1 ? ` x${a.quantity}` : ''}`)
                          .join(', ')}
                      </span>
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

                <div className="col-span-2 flex items-center justify-end gap-1">
                  <span className="font-bold text-slate-900 text-xs">
                    Rs {line.lineSubtotal}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeCartLine(line.id)}
                    className="p-0.5 text-slate-300 hover:text-rose-500 rounded transition-colors cursor-pointer"
                    title="Remove item"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Lower Section: Calculations & Payment Details (Matches Screenshot 2) */}
      <div className="shrink-0 border-t border-slate-100 bg-white px-3.5 py-2 space-y-2">
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
        <div className="bg-[#FFF4EC] border border-[#FFE2D1] rounded-2xl px-3.5 py-2 flex items-center justify-between shadow-2xs">
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
