import React, { useState, useEffect } from 'react';
import {
  X,
  Wallet,
  CheckCircle2,
  DollarSign,
  CreditCard,
  Globe,
  Receipt,
  AlertCircle,
} from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { useAppStore } from '../../../store';
import { formatCurrency } from '../../../utils/formatters';

export const SettleBalanceModal = ({ order, isOpen, onClose, onSettled }) => {
  const { settleOrderBalance } = useAppStore();

  const grandTotal = Number(order?.grandTotal) || 0;
  const currentReceived = Number(order?.amountReceived) || 0;
  const balanceDue = Number(
    order?.balanceDue != null ? order.balanceDue : Math.max(0, grandTotal - currentReceived)
  );

  const [amountToPay, setAmountToPay] = useState(balanceDue);
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  // Card payment options (matching POS checkout)
  const [cardNetwork, setCardNetwork] = useState('Visa');
  const [cardSlipNumber, setCardSlipNumber] = useState('');

  // Online payment options (matching POS checkout)
  const [onlineChannel, setOnlineChannel] = useState('JazzCash');
  const [onlineTransactionId, setOnlineTransactionId] = useState('');

  // Verification checkbox
  const [operatorVerified, setOperatorVerified] = useState(true);

  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && order) {
      const due = Number(
        order.balanceDue != null
          ? order.balanceDue
          : Math.max(0, (Number(order.grandTotal) || 0) - (Number(order.amountReceived) || 0))
      );
      setAmountToPay(due);
      setPaymentMethod('Cash');
      setCardNetwork('Visa');
      setCardSlipNumber('');
      setOnlineChannel('JazzCash');
      setOnlineTransactionId('');
      setOperatorVerified(true);
      setNote('');
      setError('');
      setIsSubmitting(false);
    }
  }, [isOpen, order?.id]);

  if (!isOpen || !order) return null;

  const numPay = Number(amountToPay) || 0;
  const remainingAfter = Math.max(0, balanceDue - numPay);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (numPay <= 0) {
      setError('Payment amount must be greater than Rs 0');
      return;
    }
    if (numPay > balanceDue) {
      setError(`Payment cannot exceed current balance due (${formatCurrency(balanceDue)})`);
      return;
    }

    if ((paymentMethod === 'Card' || paymentMethod === 'Online') && !operatorVerified) {
      setError('Please verify the payment on the machine/app before confirming.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = settleOrderBalance(order.id, {
        amountPaid: numPay,
        paymentMethod,
        cardNetwork: paymentMethod === 'Card' ? cardNetwork : undefined,
        cardSlipNumber: paymentMethod === 'Card' ? cardSlipNumber.trim() : undefined,
        onlineChannel: paymentMethod === 'Online' ? onlineChannel : undefined,
        onlineTransactionId: paymentMethod === 'Online' ? onlineTransactionId.trim() : undefined,
        note: note.trim(),
      });

      if (typeof onSettled === 'function') {
        onSettled(updated);
      }
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to settle balance');
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Settle Outstanding Balance"
      maxWidth="max-w-[450px]"
      headerClassName="px-5 py-3 border-b border-slate-100"
      bodyClassName="p-4 sm:p-5"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Invoice Header Badge */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-[#FF5C28] flex items-center justify-center font-bold">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <span className="font-mono font-bold text-xs text-slate-800 block">
                #{order.invoiceNumber}
              </span>
              <span className="text-[11px] text-slate-400">
                {order.orderType || 'Dine-In'} • {order.customerName || 'Walk-in Customer'}
              </span>
            </div>
          </div>

          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            Pending Due
          </span>
        </div>

        {/* Metric Summary Boxes: Grand Total, Paid, and Balance Due */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60">
            <span className="text-[10px] text-slate-500 block font-medium">Grand Total</span>
            <span className="text-xs font-bold text-slate-800 mt-0.5 block">
              {formatCurrency(grandTotal)}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200">
            <span className="text-[10px] text-emerald-700 block font-bold">Paid (وصول شدہ)</span>
            <span className="text-xs font-extrabold text-emerald-800 mt-0.5 block">
              {formatCurrency(currentReceived)}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-amber-50 border border-amber-200">
            <span className="text-[10px] text-amber-800 block font-bold">Balance Due</span>
            <span className="text-xs font-extrabold text-amber-900 mt-0.5 block">
              {formatCurrency(balanceDue)}
            </span>
          </div>
        </div>

        {/* Amount to Pay Input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">
              Amount to Receive Now (Rs)
            </label>
            {numPay !== balanceDue && (
              <button
                type="button"
                onClick={() => setAmountToPay(balanceDue)}
                className="text-[11px] font-bold text-[#FF5C28] hover:underline cursor-pointer"
              >
                Pay Full (Rs {balanceDue})
              </button>
            )}
          </div>

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
              Rs
            </span>
            <input
              type="number"
              step="any"
              min={1}
              max={balanceDue}
              value={amountToPay}
              onChange={(e) => {
                setError('');
                const val = e.target.value;
                setAmountToPay(val === '' ? '' : Number(val));
              }}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FF5C28]/20 focus:border-[#FF5C28]"
              placeholder="Enter amount"
              autoFocus
            />
          </div>

          {/* Balance remaining helper */}
          <div className="flex items-center justify-between text-[11px] px-1 pt-0.5">
            <span className="text-slate-400">Balance after this payment:</span>
            <span
              className={`font-bold ${remainingAfter === 0 ? 'text-emerald-600' : 'text-amber-700'}`}
            >
              {remainingAfter === 0 ? 'Fully Paid (Rs 0 Due)' : formatCurrency(remainingAfter)}
            </span>
          </div>
        </div>

        {/* Payment Method Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 block">Payment Method</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'Cash', label: 'Cash', icon: DollarSign },
              { id: 'Card', label: 'Card', icon: CreditCard },
              { id: 'Online', label: 'Online', icon: Globe },
            ].map((m) => {
              const Icon = m.icon;
              const isSelected = paymentMethod === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(m.id);
                    setError('');
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#FF5C28] bg-orange-50/60 text-[#FF5C28] shadow-2xs font-bold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Card Payment Options (matches POS checkout) */}
        {paymentMethod === 'Card' && (
          <div className="space-y-2 p-3 rounded-xl bg-slate-50/80 border border-slate-200 animate-fadeIn">
            <div>
              <span className="text-[11px] font-semibold text-slate-700 block mb-1">
                Card Network
              </span>
              <div className="grid grid-cols-4 gap-1">
                {['Visa', 'Mastercard', 'PayPak', 'UnionPay'].map((net) => (
                  <button
                    key={net}
                    type="button"
                    onClick={() => setCardNetwork(net)}
                    className={`py-1 px-1 rounded-lg text-[11px] font-bold transition-all border cursor-pointer text-center ${
                      cardNetwork === net
                        ? 'bg-[#FF5C28] text-white border-[#FF5C28]'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {net}
                  </button>
                ))}
              </div>
            </div>

            <input
              type="text"
              value={cardSlipNumber}
              onChange={(e) => setCardSlipNumber(e.target.value)}
              placeholder="Slip # ya Last 4 Digits (1234)"
              className="w-full h-8 px-2.5 text-xs bg-white rounded-lg border border-slate-200 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#FF5C28]"
            />

            <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-slate-700 font-medium pt-0.5">
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

        {/* Online Payment Options (matches POS checkout) */}
        {paymentMethod === 'Online' && (
          <div className="space-y-2 p-3 rounded-xl bg-slate-50/80 border border-slate-200 animate-fadeIn">
            <div>
              <span className="text-[11px] font-semibold text-slate-700 block mb-1">
                Online Channel / Wallet
              </span>
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
            </div>

            <input
              type="text"
              value={onlineTransactionId}
              onChange={(e) => setOnlineTransactionId(e.target.value)}
              placeholder="Transaction ID / Ref #"
              className="w-full h-8 px-2.5 text-xs bg-white rounded-lg border border-slate-200 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#FF5C28]"
            />

            <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-slate-700 font-medium pt-0.5">
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

        {/* Optional Note / Remarks */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 block">Note (Optional)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Paid remaining balance via JazzCash / Card"
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:bg-white focus:border-[#FF5C28]"
          />
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold cursor-pointer transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting || numPay <= 0 || numPay > balanceDue}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#FF5C28] hover:bg-[#E04D1D] active:bg-[#D83F0E] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Confirm Payment ({formatCurrency(numPay)})</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default SettleBalanceModal;
