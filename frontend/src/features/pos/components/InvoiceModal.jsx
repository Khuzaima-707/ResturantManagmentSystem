import React, { useState } from 'react';
import {
  Printer,
  Download,
  RotateCcw,
  PlusCircle,
  ChefHat,
  AlertCircle,
} from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { formatCurrency } from '../../../domain/calculations';
import { isInvoiceReversible, getReversalByInvoice } from '../../../domain/selectors/invoiceSelectors';
import { downloadInvoicePdf } from '../../../services/pdf/invoicePdfGenerator';
import { getImage } from '../../../services/persistence/imageStorage';
import { useAppStore } from '../../../store';
import { ReversalModal } from './ReversalModal';

/**
 * InvoiceModal Component
 * Pixel-perfect Invoice Preview matching user reference image.
 * Includes header action pills (Reverse, PDF, Print, New Sale),
 * restaurant badge, metadata block, item table, totals, payment details, and dashed footer.
 */
export const InvoiceModal = ({
  order,
  isOpen,
  onClose,
  onInvoiceUpdated,
  isReadOnly = false,
}) => {
  const { settings, reversals } = useAppStore();
  const [isReversalModalOpen, setIsReversalModalOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);

  const logoRef = settings?.business?.logoRef || settings?.logoRef || null;

  React.useEffect(() => {
    let isMounted = true;
    async function loadLogo() {
      if (!logoRef) {
        setLogoUrl(null);
        return;
      }
      if (logoRef.startsWith('data:') || logoRef.startsWith('blob:')) {
        setLogoUrl(logoRef);
        return;
      }
      try {
        const url = await getImage(logoRef);
        if (isMounted) setLogoUrl(url);
      } catch {
        if (isMounted) setLogoUrl(null);
      }
    }
    loadLogo();
    return () => {
      isMounted = false;
    };
  }, [logoRef]);

  if (!isOpen || !order) return null;

  const linkedReversal = getReversalByInvoice(reversals, order.id);
  const isReversed = order.status === 'reversed' || Boolean(linkedReversal);
  const eligibleForReversal = !isReadOnly && isInvoiceReversible(order, reversals);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    downloadInvoicePdf(order, settings, linkedReversal);
  };

  const rawDate = order.completedAt || order.createdAt;
  const dateObj = rawDate ? new Date(rawDate) : new Date(0);
  const formattedDate = dateObj.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = dateObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const rawRestName = settings?.business?.name || settings?.restaurantName || 'SpiceHub Restaurant & Grill';
  const restaurantName = rawRestName === 'SpiceHub' ? 'SpiceHub Restaurant & Grill' : rawRestName;
  const restaurantSub = 'Restaurant & Grill';
  const address =
    settings?.business?.address ||
    (settings?.address && settings?.address !== 'Shop #4, Food Street, Main Boulevard'
      ? settings.address
      : '123 Food Street, Gulshan, Karachi');
  const phone =
    settings?.business?.phone ||
    (settings?.phone && settings?.phone !== '+92 300 1234567'
      ? settings.phone
      : '021-1234567');
  const email = settings?.business?.email || settings?.email || 'info@spicehub.pk';

  const showLogo = settings?.invoice?.showLogo !== false;
  const showAddress = settings?.invoice?.showAddress !== false;
  const showPhone = settings?.invoice?.showPhone !== false;
  const showEmail = settings?.invoice?.showEmail !== false;
  const showTaxBreakdown = settings?.invoice?.showTaxBreakdown !== false;
  const showPaymentDetails = settings?.invoice?.showPaymentDetails !== false;
  const footerMessage = settings?.invoice?.footer || settings?.invoiceFooter || 'Thank you for dining with us! • Good Food • Good Mood';

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Invoice Preview"
        hideCloseButton={false}
        maxWidth="max-w-[460px]"
        bodyClassName="p-3 sm:p-4 overflow-y-auto max-h-[85vh]"
        headerClassName="px-5 py-3 border-b border-slate-100"
      >
        <div id="printable-invoice-content" className="space-y-3.5 w-full mx-auto">
          {/* Action Toolbar - Fully visible pills, no clipping */}
          <div className="flex items-center justify-between gap-1.5 p-1.5 rounded-2xl bg-slate-50 border border-slate-200/80 no-print">
            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
              {eligibleForReversal && (
                <button
                  type="button"
                  onClick={() => setIsReversalModalOpen(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border border-rose-200 hover:border-rose-300 text-rose-600 bg-white hover:bg-rose-50 text-[11px] font-semibold cursor-pointer transition-all shadow-2xs whitespace-nowrap"
                  title="Reverse this invoice"
                >
                  <RotateCcw className="w-3 h-3 text-rose-500" />
                  <span>Reverse</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleDownloadPdf}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border border-orange-200 hover:border-orange-300 text-[#FF5C28] bg-white hover:bg-orange-50 text-[11px] font-semibold cursor-pointer transition-all shadow-2xs whitespace-nowrap"
                title="Download client-side PDF"
              >
                <Download className="w-3 h-3 text-[#FF5C28]" />
                <span>PDF</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-[11px] font-semibold cursor-pointer transition-all shadow-2xs whitespace-nowrap"
                title="Print invoice"
              >
                <Printer className="w-3 h-3 text-slate-500" />
                <span>Print</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#FF5C28] hover:bg-[#E04D1D] active:bg-[#D83F0E] text-white text-[11px] font-semibold cursor-pointer transition-all shadow-xs shrink-0 whitespace-nowrap"
              title="Close and start new sale"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New Sale</span>
            </button>
          </div>

          {/* Reversed Alert Banner */}
          {isReversed && (
            <div className="p-3 rounded-2xl bg-gradient-to-r from-rose-50 to-red-50 border border-rose-200 text-rose-800 space-y-1 text-xs shadow-2xs mb-2">
              <div className="flex items-center justify-between font-bold text-rose-700">
                <span className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-extrabold tracking-wide">TRANSACTION REVERSED</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] uppercase font-bold border border-rose-200">
                  Void / Reversed
                </span>
              </div>
              {linkedReversal?.reason && (
                <p className="text-[11px] text-rose-700 pt-0.5 pl-6">
                  <span className="font-semibold text-rose-800">Reason:</span> {linkedReversal.reason}
                </p>
              )}
            </div>
          )}

          {/* Clean Receipt Container (Thermal Receipt Format with taller vertical spacing) */}
          <div className="rounded-2xl border border-slate-200/90 p-5 sm:p-6 bg-white shadow-2xs text-xs text-slate-700 min-h-[490px] flex flex-col justify-between">
            <div className="space-y-4">
              {/* Thermal Receipt Inset Reversal Header with generous spacing */}
              {isReversed && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-center mb-3">
                  <div className="text-[11px] font-extrabold tracking-wider text-rose-600 uppercase">
                    ● Transaction Reversed ●
                  </div>
                  {linkedReversal?.reason && (
                    <div className="text-[10px] text-rose-500 font-semibold mt-0.5">
                      Reason: {linkedReversal.reason}
                    </div>
                  )}
                </div>
              )}

              {/* Top Restaurant Row */}
              <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  {showLogo && (
                    <div className="w-10 h-10 rounded-xl bg-[#FFF5F0] border border-orange-100/80 flex items-center justify-center text-[#FF5C28] shadow-2xs shrink-0 overflow-hidden">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-0.5" />
                      ) : (
                        <ChefHat className="w-5 h-5 stroke-[2.2]" />
                      )}
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 leading-tight">
                      {restaurantName}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">{restaurantSub}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="inline-block px-2.5 py-0.5 rounded-full border border-orange-200 bg-orange-50/50 text-[#FF5C28] text-[11px] font-semibold">
                    {order.orderType || 'Dine-In'}
                  </span>
                  <span className="font-extrabold text-xs sm:text-sm text-[#FF5C28] block mt-1">
                    #{order.invoiceNumber}
                  </span>
                </div>
              </div>

              {/* Business Info & Meta Block */}
              <div className="flex items-start justify-between text-[11px] py-1.5 text-slate-500 gap-2 border-b border-slate-100">
                <div className="space-y-1">
                  {showAddress && <div>{address}</div>}
                  {showPhone && <div>Phone: {phone}</div>}
                </div>

                <div className="text-right space-y-1 shrink-0">
                  <div>
                    <span className="font-medium text-slate-700">{formattedDate}</span> • {formattedTime}
                  </div>
                  <div>
                    Cashier: <span className="font-semibold text-slate-800">{order.cashierName || 'Admin User'}</span>
                  </div>
                </div>
              </div>

              {/* Billed Items Table */}
              <div className="pt-1 min-h-[70px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                      <th className="py-2 pr-1 font-bold w-6">#</th>
                      <th className="py-2 px-1 font-bold">Item</th>
                      <th className="py-2 px-1 font-bold text-center w-12">Qty</th>
                      <th className="py-2 px-1 font-bold text-right w-16">Rate</th>
                      <th className="py-2 pl-1 font-bold text-right w-20">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {(order.lines || []).map((line, idx) => {
                      const addonsList = Array.isArray(line.addonSnapshots) ? line.addonSnapshots : [];
                      const addonsTotal = addonsList.reduce(
                        (sum, a) =>
                          sum +
                          (Number(a?.price) || 0) *
                            (a?.quantity !== undefined ? Math.max(1, Number(a.quantity)) : 1),
                        0
                      );
                      const unitPrice = Number(line.unitPrice) || 0;
                      const baseItemPrice = line.portionPrice !== undefined && line.portionPrice !== null
                        ? Number(line.portionPrice)
                        : (line.baseCalculatedPrice ? Number(line.baseCalculatedPrice) : Math.max(0, unitPrice - addonsTotal));

                      const portionLabel =
                        line.pricingMode === 'amount'
                          ? `Custom (${line.selectedWeightGrams}g)`
                          : line.selectedPortionLabel || line.baseUnitSnapshot || '';

                      let portionDisplay = '';
                      if (portionLabel) {
                        portionDisplay = (baseItemPrice > 0 && (addonsTotal > 0 || line.pricingMode === 'amount' || line.selectedPortionLabel))
                          ? `Portion: ${portionLabel} (Rs ${baseItemPrice.toLocaleString('en-PK')})`
                          : portionLabel;
                      } else if (addonsTotal > 0 && baseItemPrice > 0) {
                        portionDisplay = `Base Item (Rs ${baseItemPrice.toLocaleString('en-PK')})`;
                      }

                      return (
                        <tr key={line.id || idx}>
                          <td className="py-2.5 pr-1 text-slate-400 font-mono text-[10px] align-top">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-1 align-top">
                            <div className="font-bold text-slate-900 text-[11px]">
                              {line.itemNameSnapshot}
                            </div>
                            {portionDisplay && (
                              <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                                {portionDisplay}
                              </div>
                            )}
                            {Array.isArray(line.addonSnapshots) &&
                              line.addonSnapshots.length > 0 && (
                                <div className="text-[10px] text-[#FF5C28] mt-0.5">
                                  + {line.addonSnapshots
                                      .map((a) => {
                                        if (typeof a === 'string') return a;
                                        if (!a) return '';
                                        const priceVal = Number(a.price) || 0;
                                        const qty = a.quantity && a.quantity > 1 ? ` x${a.quantity}` : '';
                                        const totalAddonPrice = priceVal * (a.quantity || 1);
                                        return priceVal > 0
                                          ? `${a.name}${qty} (Rs ${totalAddonPrice.toLocaleString('en-PK')})`
                                          : `${a.name}${qty}`;
                                      })
                                      .filter(Boolean)
                                      .join(', ')}
                                </div>
                              )}
                          </td>
                          <td className="py-2.5 px-1 text-center text-slate-800 font-medium align-top text-[11px]">
                            {line.quantity || 1}
                          </td>
                          <td className="py-2.5 px-1 text-right text-slate-600 align-top text-[11px]">
                            {formatCurrency(line.unitPrice || 0)}
                          </td>
                          <td className="py-2.5 pl-1 text-right font-bold text-slate-900 align-top text-[11px]">
                            {formatCurrency(line.lineSubtotal || 0)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Financial Summary */}
              <div className="space-y-1.5 pt-3 border-t border-slate-100 text-[11px] text-slate-600">
                <div className="flex justify-between items-center">
                  <span>Subtotal</span>
                  <span className="font-bold text-slate-900">
                    {formatCurrency(order.subtotal || 0)}
                  </span>
                </div>

                {Number(order.discountAmount) > 0 && (
                  <div className="flex justify-between items-center">
                    <span>Discount</span>
                    <span className="font-bold text-slate-900">
                      {formatCurrency(order.discountAmount || 0)}
                    </span>
                  </div>
                )}

                {showTaxBreakdown && (
                  <div className="flex justify-between items-center">
                    <span>Tax ({order.taxRateSnapshot ?? (settings?.tax?.rate ?? settings?.taxRate ?? 5)}%)</span>
                    <span className="font-bold text-slate-900">
                      {formatCurrency(order.taxAmount || 0)}
                    </span>
                  </div>
                )}
              </div>

              {/* Grand Total Highlight Box */}
              <div className="bg-[#FFF5F0] border border-orange-100/90 rounded-2xl px-4 py-2.5 sm:py-3 flex items-center justify-between text-slate-900 font-bold my-1">
                <span className="text-xs sm:text-sm font-bold">Grand Total</span>
                <span className="text-base sm:text-lg font-extrabold text-[#FF5C28]">
                  {formatCurrency(order.grandTotal || 0)}
                </span>
              </div>

              {/* Payment Details */}
              {showPaymentDetails && (
                <div className="space-y-1 pt-1 text-[11px] text-slate-600">
                  <div className="flex justify-between items-center">
                    <span>Payment Method</span>
                    <span className="font-bold text-slate-900">
                      {(order.paymentMethod || 'Cash').toUpperCase()}
                      {order.paymentMethod === 'Card' && order.cardNetwork && ` (${order.cardNetwork})`}
                      {order.paymentMethod === 'Online' && order.onlineChannel && ` (${order.onlineChannel})`}
                    </span>
                  </div>

                  {order.paymentMethod === 'Card' && order.posSlipNumber && (
                    <div className="flex justify-between items-center text-[10px] text-slate-500">
                      <span>POS Slip / Ref #</span>
                      <span className="font-semibold text-slate-800">{order.posSlipNumber}</span>
                    </div>
                  )}

                  {order.paymentMethod === 'Online' && order.transactionId && (
                    <div className="flex justify-between items-center text-[10px] text-slate-500">
                      <span>Transaction ID / Ref #</span>
                      <span className="font-semibold text-slate-800">{order.transactionId}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span>Amount Received</span>
                    <span className="font-bold text-slate-900">
                      {formatCurrency(order.amountReceived || order.grandTotal || 0)}
                    </span>
                  </div>

                  {order.paymentMethod === 'Cash' && Number(order.changeAmount) > 0 && (
                    <div className="flex justify-between items-center">
                      <span>Change</span>
                      <span className="font-bold text-emerald-600">
                        {formatCurrency(order.changeAmount || 0)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Dashed Footer Note */}
            <div className="border-t border-dashed border-slate-200 pt-3 mt-4 text-center">
              <p className="font-medium text-[10px] text-slate-400">
                {footerMessage}
              </p>
            </div>
          </div>
        </div>
      </Modal>

      {/* Dedicated 80mm Print-Only Thermal Receipt (72mm Printable Area) */}
      <div className="thermal-receipt" aria-hidden="true">
        {/* 1. Reversal Notice (if reversed) */}
        {isReversed && (
          <div className="receipt-row border border-black border-dashed p-1 mb-2 text-center">
            <div className="font-bold text-[12px] tracking-wider uppercase">
              *** TRANSACTION REVERSED ***
            </div>
            {linkedReversal?.reason && (
              <div className="text-[10px] mt-0.5">
                Reason: {linkedReversal.reason}
              </div>
            )}
          </div>
        )}

        {/* 2. Restaurant Header */}
        <div className="receipt-row text-center mb-1">
          <div className="font-bold text-[17px] leading-tight">
            {restaurantName}
          </div>
          {showPhone && phone && (
            <div className="text-[10.5px] mt-0.5">
              Tel: {phone}
            </div>
          )}
          {showAddress && address && (
            <div
              className="text-[10.5px] leading-tight mt-0.5"
              style={{ overflowWrap: 'anywhere', wordBreak: 'normal' }}
            >
              {address}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-b border-black border-dashed my-2" />

        {/* 3. Invoice Metadata */}
        <div className="receipt-row text-[10.5px] space-y-0.5">
          <div className="flex justify-between items-center">
            <span className="font-bold">Invoice #{order.invoiceNumber}</span>
            <span>{formattedDate} {formattedTime}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Cashier: {order.cashierName || 'Staff'}</span>
            <span>Payment: {(order.paymentMethod || 'Cash').toUpperCase()}</span>
          </div>
          {order.orderType && (
            <div className="flex justify-between items-center">
              <span>Order Type:</span>
              <span className="font-semibold">{order.orderType}</span>
            </div>
          )}
          {isReversed && linkedReversal?.reason && (
            <div className="font-bold text-[10.5px] pt-0.5">
              Reason: {linkedReversal.reason}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-b border-black border-dashed my-2" />

        {/* 4. Item Table (72mm Proportions: 42% ITEM, 12% QTY, 20% RATE, 26% AMOUNT) */}
        <table className="receipt-table w-full text-left border-collapse text-[10.5px]">
          <thead>
            <tr className="border-b border-black border-dashed font-bold">
              <th style={{ width: '42%' }} className="pb-1 text-left">ITEM</th>
              <th style={{ width: '12%' }} className="pb-1 text-center">QTY</th>
              <th style={{ width: '20%' }} className="pb-1 text-right">RATE</th>
              <th style={{ width: '26%' }} className="pb-1 text-right">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {(order.lines || []).map((line, idx) => {
              const addonsList = Array.isArray(line.addonSnapshots) ? line.addonSnapshots : [];
              const addonsTotal = addonsList.reduce(
                (sum, a) =>
                  sum +
                  (Number(a?.price) || 0) *
                    (a?.quantity !== undefined ? Math.max(1, Number(a.quantity)) : 1),
                0
              );
              const unitPrice = Number(line.unitPrice) || 0;
              const baseItemPrice = line.portionPrice !== undefined && line.portionPrice !== null
                ? Number(line.portionPrice)
                : (line.baseCalculatedPrice ? Number(line.baseCalculatedPrice) : Math.max(0, unitPrice - addonsTotal));

              const portionText =
                line.pricingMode === 'amount'
                  ? `Custom: ${line.selectedWeightGrams}g`
                  : line.selectedPortionLabel || line.baseUnitSnapshot || '';

              let portionDisplay = '';
              if (portionText) {
                portionDisplay = (baseItemPrice > 0 && (addonsTotal > 0 || line.pricingMode === 'amount' || line.selectedPortionLabel))
                  ? `Portion: ${portionText} (Rs ${baseItemPrice.toLocaleString('en-PK')})`
                  : `Portion: ${portionText}`;
              } else if (addonsTotal > 0 && baseItemPrice > 0) {
                portionDisplay = `Base Item (Rs ${baseItemPrice.toLocaleString('en-PK')})`;
              }

              return (
                <tr key={line.id || idx} className="align-top">
                  <td style={{ width: '42%' }} className="pt-1 pb-0.5 pr-1 text-left">
                    <div
                      className="font-bold leading-tight"
                      style={{ overflowWrap: 'anywhere', wordBreak: 'normal' }}
                    >
                      {line.itemNameSnapshot}
                    </div>
                    {portionDisplay && (
                      <div className="text-[9.5px] text-gray-700 leading-tight">
                        {portionDisplay}
                      </div>
                    )}
                    {Array.isArray(line.addonSnapshots) && line.addonSnapshots.length > 0 && (
                      <div
                        className="text-[9.5px] text-gray-700 leading-tight"
                        style={{ overflowWrap: 'anywhere', wordBreak: 'normal' }}
                      >
                        {line.addonSnapshots
                          .map((a) => {
                            if (typeof a === 'string') return `+ ${a}`;
                            if (!a) return '';
                            const priceVal = Number(a.price) || 0;
                            const qty = a.quantity && a.quantity > 1 ? ` x${a.quantity}` : '';
                            const totalAddonPrice = priceVal * (a.quantity || 1);
                            return priceVal > 0 ? `+ ${a.name}${qty} (Rs ${totalAddonPrice})` : `+ ${a.name}${qty}`;
                          })
                          .filter(Boolean)
                          .join(', ')}
                      </div>
                    )}
                  </td>
                  <td style={{ width: '12%' }} className="pt-1 pb-0.5 text-center font-medium">
                    {line.quantity || 1}
                  </td>
                  <td style={{ width: '20%' }} className="pt-1 pb-0.5 text-right font-mono">
                    {formatCurrency(line.unitPrice || 0)}
                  </td>
                  <td style={{ width: '26%' }} className="pt-1 pb-0.5 text-right font-bold font-mono">
                    {formatCurrency(line.lineSubtotal || 0)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Divider */}
        <div className="border-b border-black border-dashed my-2" />

        {/* 5. Totals Section */}
        <div className="receipt-totals text-[10.5px] space-y-1">
          <div className="flex justify-between items-center">
            <span>Subtotal:</span>
            <span className="font-mono font-medium">{formatCurrency(order.subtotal || 0)}</span>
          </div>

          {Number(order.discountAmount) > 0 && (
            <div className="flex justify-between items-center">
              <span>Discount:</span>
              <span className="font-mono font-medium">-{formatCurrency(order.discountAmount || 0)}</span>
            </div>
          )}

          {showTaxBreakdown && (
            <div className="flex justify-between items-center">
              <span>Tax ({order.taxRateSnapshot ?? (settings?.tax?.rate ?? settings?.taxRate ?? 5)}%):</span>
              <span className="font-mono font-medium">{formatCurrency(order.taxAmount || 0)}</span>
            </div>
          )}

          {/* Grand Total - Prominent Monochrome Thermal Emphasis */}
          <div className="border-y border-black border-dashed py-1.5 my-1.5 flex justify-between items-center text-[14px] font-bold">
            <span>GRAND TOTAL:</span>
            <span className="font-mono font-extrabold">{formatCurrency(order.grandTotal || 0)}</span>
          </div>
        </div>

        {/* 6. Payment Breakdown */}
        {showPaymentDetails && (
          <div className="receipt-payment text-[10.5px] space-y-0.5 pt-1">
            <div className="flex justify-between items-center">
              <span>Payment Method:</span>
              <span className="font-semibold">{(order.paymentMethod || 'Cash').toUpperCase()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Amount Received:</span>
              <span className="font-mono font-medium">{formatCurrency(order.amountReceived || order.grandTotal || 0)}</span>
            </div>
            {order.paymentMethod === 'Cash' && Number(order.changeAmount) > 0 && (
              <div className="flex justify-between items-center font-bold">
                <span>Change:</span>
                <span className="font-mono">{formatCurrency(order.changeAmount || 0)}</span>
              </div>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="border-b border-black border-dashed my-2" />

        {/* 7. Footer Note */}
        <div className="text-center text-[9.5px] italic leading-tight pt-0.5">
          {footerMessage}
        </div>
      </div>

      {/* Linked Reversal Confirmation Modal */}
      {eligibleForReversal && (
        <ReversalModal
          order={order}
          isOpen={isReversalModalOpen}
          onClose={() => setIsReversalModalOpen(false)}
          onReversalCompleted={(rev) => {
            setIsReversalModalOpen(false);
            if (typeof onInvoiceUpdated === 'function') {
              onInvoiceUpdated(rev);
            }
          }}
        />
      )}
    </>
  );
};

export default InvoiceModal;
