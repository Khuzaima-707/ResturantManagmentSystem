import React, { useState } from 'react';
import { X, Eye, EyeOff, AlertCircle, UserPlus, CheckCircle2 } from 'lucide-react';

/**
 * CreateUserModal Component
 * Modal dialog to provision new cashier accounts.
 * Branches is strictly 'All Branches', phone restricted to max 11 digits.
 */
export const CreateUserModal = ({ isOpen, onClose, onUserCreated }) => {
  const [fullName, setFullName] = useState('');
  const [officialTitle, setOfficialTitle] = useState('Counter Cashier & Billing');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [phone, setPhone] = useState('');
  const [branch, setBranch] = useState('All Branches');
  const [linkedEmployee, setLinkedEmployee] = useState('Direct System User');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handlePhoneChange = (e) => {
    // Only allow numbers and limit strictly to max 11 digits
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 11);
    setPhone(digitsOnly);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('Full Name is required.');
      return;
    }
    if (!loginIdentifier.trim()) {
      setError('Login Identifier (Username or Email) is required.');
      return;
    }
    if (!temporaryPassword || temporaryPassword.length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }

    const cleanUsername = loginIdentifier.trim().toLowerCase();
    const newUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: fullName.trim(),
      fullName: fullName.trim(),
      officialTitle: officialTitle.trim() || 'Counter Cashier & Billing',
      loginIdentifier: cleanUsername,
      username: cleanUsername,
      email: cleanUsername.includes('@') ? cleanUsername : `${cleanUsername}@spicehub.pk`,
      phone: phone.trim() ? phone.trim().slice(0, 11) : '03000000000',
      portalRole: 'Sales & Billing',
      systemRole: 'Sales & Billing',
      role: 'cashier',
      branch: 'All Branches',
      branchScope: 'All Branches',
      linkedEmployeeRecord: linkedEmployee || 'Direct System User',
      status: 'deactivated',
      isActiveCashier: false,
      password: temporaryPassword,
      createdAt: new Date().toISOString(),
    };

    onUserCreated?.(newUser);
    onClose();

    // Reset form
    setFullName('');
    setOfficialTitle('Counter Cashier & Billing');
    setLoginIdentifier('');
    setPhone('');
    setBranch('All Branches');
    setTemporaryPassword('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Card */}
      <div className="relative bg-white rounded-3xl border border-slate-200/90 shadow-2xl w-full max-w-lg p-5 sm:p-6 z-10 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#FF5C28] flex items-center justify-center shrink-0">
              <UserPlus className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Add New Cashier Account
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Provision a new cashier with credentials, branch scope, and access status.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer outline-none focus:outline-none"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* 1. Full Name */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">
                Cashier Full Name <span className="text-[#FF5C28]">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Kashan Malik"
                className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:border-[#FF5C28] focus:ring-2 focus:ring-[#FF5C28]/20 text-xs font-medium text-slate-800 bg-white outline-none transition-all"
              />
            </div>

            {/* 2. Official Title / Designation */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">
                Title / Designation
              </label>
              <input
                type="text"
                value={officialTitle}
                onChange={(e) => setOfficialTitle(e.target.value)}
                placeholder="e.g. Counter Cashier & Billing"
                className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:border-[#FF5C28] focus:ring-2 focus:ring-[#FF5C28]/20 text-xs font-medium text-slate-800 bg-white outline-none transition-all"
              />
            </div>

            {/* 3. Login Identifier */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">
                Login Identifier (Username/Email) <span className="text-[#FF5C28]">*</span>
              </label>
              <input
                type="text"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                placeholder="e.g. kashan.cashier"
                className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:border-[#FF5C28] focus:ring-2 focus:ring-[#FF5C28]/20 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition-all font-mono"
              />
            </div>

            {/* 4. Phone Number (Max 11 digits) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 block">
                  Phone Number
                </label>
                <span className="text-[10px] text-slate-400">
                  {phone.length}/11 digits
                </span>
              </div>
              <input
                type="tel"
                maxLength={11}
                value={phone}
                onChange={handlePhoneChange}
                placeholder="e.g. 03001234567"
                className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:border-[#FF5C28] focus:ring-2 focus:ring-[#FF5C28]/20 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition-all font-mono"
              />
            </div>

            {/* 5. Assigned Branch (Only All Branches) */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">
                Assigned Branch
              </label>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:border-[#FF5C28] focus:ring-2 focus:ring-[#FF5C28]/20 text-xs font-semibold text-slate-800 bg-white outline-none transition-all cursor-pointer"
              >
                <option value="All Branches">All Branches</option>
              </select>
            </div>

            {/* 6. Linked Employee Record */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">
                Linked Employee Record
              </label>
              <input
                type="text"
                value={linkedEmployee}
                onChange={(e) => setLinkedEmployee(e.target.value)}
                placeholder="Direct System User"
                className="w-full h-10 px-3 rounded-xl border border-slate-200 focus:border-[#FF5C28] focus:ring-2 focus:ring-[#FF5C28]/20 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition-all"
              />
            </div>
          </div>

          {/* 7. Password */}
          <div className="space-y-1 pt-1">
            <label className="text-xs font-semibold text-slate-700 block">
              Password <span className="text-[#FF5C28]">*</span>
            </label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                value={temporaryPassword}
                onChange={(e) => setTemporaryPassword(e.target.value)}
                placeholder="e.g. cashier123"
                className="w-full h-10 pl-3 pr-10 rounded-xl border border-slate-200 focus:border-[#FF5C28] focus:ring-2 focus:ring-[#FF5C28]/20 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer outline-none focus:outline-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#FF5C28] hover:bg-[#E64A19] active:bg-[#D83F0E] transition-all shadow-sm shadow-orange-500/20 cursor-pointer outline-none focus:outline-none flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save & Add Cashier</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateUserModal;
