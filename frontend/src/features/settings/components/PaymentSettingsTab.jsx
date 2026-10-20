import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Building2,
  Smartphone,
  Plus,
  Trash2,
  Edit2,
  Star,
  CheckCircle,
  AlertCircle,
  Copy,
  Check,
  Globe,
  ArrowRightLeft,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { DEFAULT_PAYMENT_ACCOUNTS } from '../../../domain/rules/settingsRules';

const CHANNEL_OPTIONS = [
  { id: 'EasyPaisa', label: 'EasyPaisa', defaultBank: 'EasyPaisa', icon: Smartphone, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { id: 'JazzCash', label: 'JazzCash', defaultBank: 'JazzCash', icon: Smartphone, color: 'text-rose-600 bg-rose-50 border-rose-200' },
  { id: 'Bank', label: 'Bank Transfer', defaultBank: 'Meezan Bank', icon: Building2, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { id: 'Raast', label: 'Raast (P2P / Merchant)', defaultBank: 'Raast ID', icon: ArrowRightLeft, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { id: 'SadaPay', label: 'SadaPay', defaultBank: 'SadaPay', icon: Wallet, color: 'text-teal-600 bg-teal-50 border-teal-200' },
  { id: 'NayaPay', label: 'NayaPay', defaultBank: 'NayaPay', icon: Wallet, color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { id: 'Custom', label: 'Other / Custom', defaultBank: '', icon: Globe, color: 'text-purple-600 bg-purple-50 border-purple-200' },
];

export const PaymentSettingsTab = ({ settings, onSave }) => {
  const currentAccounts = Array.isArray(settings?.paymentAccounts) && settings.paymentAccounts.length > 0
    ? settings.paymentAccounts
    : DEFAULT_PAYMENT_ACCOUNTS;

  const [accounts, setAccounts] = useState(currentAccounts);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [formError, setFormError] = useState('');

  const [formData, setFormData] = useState({
    channel: 'EasyPaisa',
    bankName: 'EasyPaisa',
    title: '',
    accountNumber: '',
    isActive: true,
    isDefault: false,
  });

  useEffect(() => {
    if (Array.isArray(settings?.paymentAccounts) && settings.paymentAccounts.length > 0) {
      setAccounts(settings.paymentAccounts);
    }
  }, [settings?.paymentAccounts]);

  const showNotification = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleCopy = (id, text) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormError('');
    setFormData({
      channel: 'EasyPaisa',
      bankName: 'EasyPaisa',
      title: '',
      accountNumber: '',
      isActive: true,
      isDefault: accounts.length === 0,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (acc) => {
    setEditingId(acc.id);
    setFormError('');
    setFormData({
      channel: acc.channel || 'Bank',
      bankName: acc.bankName || acc.channel || '',
      title: acc.title || '',
      accountNumber: acc.accountNumber || '',
      isActive: acc.isActive !== false,
      isDefault: Boolean(acc.isDefault),
    });
    setIsModalOpen(true);
  };

  const handleChannelSelect = (chId) => {
    const chOpt = CHANNEL_OPTIONS.find((c) => c.id === chId);
    setFormData((prev) => ({
      ...prev,
      channel: chId,
      bankName: chOpt ? chOpt.defaultBank : prev.bankName,
    }));
  };

  const handleSaveForm = (e) => {
    e?.preventDefault();
    if (!formData.title.trim()) {
      setFormError('Account Title (Beneficiary Name) is required.');
      return;
    }
    if (!formData.accountNumber.trim()) {
      setFormError('Account Number / IBAN is required.');
      return;
    }

    let updated;
    if (editingId) {
      updated = accounts.map((acc) => {
        if (acc.id === editingId) {
          return {
            ...acc,
            channel: formData.channel,
            bankName: formData.bankName.trim() || formData.channel,
            title: formData.title.trim(),
            accountNumber: formData.accountNumber.trim(),
            isActive: formData.isActive,
            isDefault: formData.isDefault,
          };
        }
        return formData.isDefault ? { ...acc, isDefault: false } : acc;
      });
    } else {
      const newAcc = {
        id: `acc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        channel: formData.channel,
        bankName: formData.bankName.trim() || formData.channel,
        title: formData.title.trim(),
        accountNumber: formData.accountNumber.trim(),
        isActive: formData.isActive,
        isDefault: formData.isDefault || accounts.length === 0,
      };
      updated = formData.isDefault || accounts.length === 0
        ? [...accounts.map((a) => ({ ...a, isDefault: false })), newAcc]
        : [...accounts, newAcc];
    }

    setAccounts(updated);
    setIsModalOpen(false);
    onSave?.({ paymentAccounts: updated });
    showNotification(editingId ? 'Payment account updated.' : 'New payment account added successfully.');
  };

  const handleToggleActive = (id) => {
    const updated = accounts.map((acc) =>
      acc.id === id ? { ...acc, isActive: !acc.isActive } : acc
    );
    setAccounts(updated);
    onSave?.({ paymentAccounts: updated });
    showNotification('Account status updated.');
  };

  const handleSetDefault = (id) => {
    const updated = accounts.map((acc) => ({
      ...acc,
      isDefault: acc.id === id,
    }));
    setAccounts(updated);
    onSave?.({ paymentAccounts: updated });
    showNotification('Primary default payment account set.');
  };

  const handleDelete = (id) => {
    if (accounts.length <= 1) {
      alert('You must have at least one payment account configured.');
      return;
    }
    if (window.confirm('Are you sure you want to delete this payment account?')) {
      const target = accounts.find((a) => a.id === id);
      const remaining = accounts.filter((a) => a.id !== id);
      if (target?.isDefault && remaining.length > 0) {
        remaining[0].isDefault = true;
      }
      setAccounts(remaining);
      onSave?.({ paymentAccounts: remaining });
      showNotification('Payment account removed.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Banner Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#FF5C28] flex items-center justify-center border border-orange-100 shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Payment & Online Accounts</CardTitle>
                <CardDescription>
                  Configure Bank Accounts, EasyPaisa, JazzCash, and Wallets for customer online payments in POS checkout and balance settlements.
                </CardDescription>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              leftIcon={Plus}
              onClick={handleOpenAddModal}
              className="shrink-0"
            >
              Add Payment Account
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Accounts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {accounts.map((acc) => {
              const chOpt = CHANNEL_OPTIONS.find((c) => c.id === acc.channel) || CHANNEL_OPTIONS[2];
              const Icon = chOpt.icon;
              const isDefault = Boolean(acc.isDefault);
              const isActive = acc.isActive !== false;

              return (
                <div
                  key={acc.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isDefault
                      ? 'border-[#FF5C28] bg-orange-50/20 shadow-2xs'
                      : isActive
                      ? 'border-slate-200 bg-white hover:border-slate-300'
                      : 'border-slate-200 bg-slate-50/60 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${chOpt.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-slate-800">
                            {acc.bankName || acc.channel}
                          </span>
                          {isDefault && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.2 rounded-full text-[10px] font-bold bg-[#FF5C28] text-white">
                              <Star className="w-2.5 h-2.5 fill-white" />
                              <span>Primary</span>
                            </span>
                          )}
                          {!isActive && (
                            <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600">
                              Inactive
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium block">
                          Provider: {acc.channel}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSetDefault(acc.id)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          isDefault
                            ? 'text-[#FF5C28] bg-orange-50'
                            : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                        }`}
                        title={isDefault ? 'Primary Default Account' : 'Make Primary Default'}
                      >
                        <Star className={`w-3.5 h-3.5 ${isDefault ? 'fill-[#FF5C28]' : ''}`} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(acc)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Edit Account"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(acc.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Account"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Account Details Box */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-[11px]">Title (Beneficiary):</span>
                      <span className="font-bold text-slate-800">{acc.title}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-[11px]">A/C / Number:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-900 tracking-tight">
                          {acc.accountNumber}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(acc.id, acc.accountNumber)}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer"
                          title="Copy Account Number"
                        >
                          {copiedId === acc.id ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Toggle Active Bottom Row */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Available in POS Online:</span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={() => handleToggleActive(acc.id)}
                        className="w-3.5 h-3.5 rounded text-[#FF5C28] border-slate-300 focus:ring-[#FF5C28] cursor-pointer accent-[#FF5C28]"
                      />
                      <span className={`font-semibold ${isActive ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {isActive ? 'Enabled' : 'Disabled'}
                      </span>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Add / Edit Account Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Payment Account' : 'Add New Payment Account'}
        subtitle="Customer transfers and QR payments will display these credentials."
        icon={Wallet}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveForm} className="space-y-4 p-4 sm:p-5">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Provider / Channel Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Account Provider / Type *
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
              {CHANNEL_OPTIONS.map((ch) => {
                const isSelected = formData.channel === ch.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => handleChannelSelect(ch.id)}
                    className={`py-1.5 px-1 rounded-xl text-center text-xs font-bold transition-all border cursor-pointer ${
                      isSelected
                        ? 'border-[#FF5C28] bg-orange-50 text-[#FF5C28] shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {ch.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bank / Provider Name */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Bank / Wallet Name *
            </label>
            <input
              type="text"
              required
              value={formData.bankName}
              onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
              placeholder="e.g. Meezan Bank, HBL, EasyPaisa, JazzCash"
              className="w-full h-9 px-3 text-xs bg-white rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#FF5C28]"
            />
          </div>

          {/* Account Title */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Account Title (Beneficiary Name) *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. SpiceHub Restaurant & Grill or Ali Raza"
              className="w-full h-9 px-3 text-xs bg-white rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#FF5C28]"
            />
          </div>

          {/* Account Number / IBAN */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Account Number / Mobile # / IBAN *
            </label>
            <input
              type="text"
              required
              value={formData.accountNumber}
              onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
              placeholder="e.g. 0300-1234567 or PK36MEZN0001020304050607"
              className="w-full h-9 px-3 text-xs font-mono font-bold bg-white rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#FF5C28]"
            />
          </div>

          {/* Options: Active and Set Default */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 select-none">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 rounded text-[#FF5C28] border-slate-300 focus:ring-[#FF5C28] cursor-pointer accent-[#FF5C28]"
              />
              <span>Enable this account for POS and Settlement checkout</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 select-none">
              <input
                type="checkbox"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                className="w-4 h-4 rounded text-[#FF5C28] border-slate-300 focus:ring-[#FF5C28] cursor-pointer accent-[#FF5C28]"
              />
              <span>Set as primary default online payment account</span>
            </label>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
            >
              {editingId ? 'Save Changes' : 'Add Account'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PaymentSettingsTab;
