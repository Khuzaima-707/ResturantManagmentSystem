import React, { useState } from 'react';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Save,
  CheckCircle,
  AlertCircle,
  UserCog,
  UserPlus,
  Trash2,
  Mail,
  Phone,
  UserCheck,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../../components/ui/Card';
import { FormField } from '../../../components/ui/FormField';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { useAppStore } from '../../../store';
import { storage } from '../../../services/persistence/storage';
import { CreateUserModal } from './CreateUserModal';

/**
 * SecuritySettingsTab Component (User & Access Control)
 * Comprehensive user management, credentials provisioning, and role-based permissions.
 */
export const SecuritySettingsTab = ({
  isCreateModalOpen: propIsOpen,
  setIsCreateModalOpen: propSetIsOpen,
} = {}) => {
  const { user, changePassword } = useAppStore();
  const isCashier = Boolean(
    (user?.role?.toLowerCase().includes('cashier') && !user?.role?.toLowerCase().includes('admin')) ||
    (user?.username?.toLowerCase() === 'cashier' && user?.username?.toLowerCase() !== 'admin')
  );

  // Modal State
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isCreateModalOpen = propIsOpen !== undefined ? propIsOpen : internalIsOpen;
  const setIsCreateModalOpen = propSetIsOpen || setInternalIsOpen;
  const [customUsers, setCustomUsers] = useState(() => {
    const saved = storage.get('rms_custom_users', []);
    return Array.isArray(saved) ? saved : [];
  });
  const [globalNotice, setGlobalNotice] = useState('');

  // Admin Password Form State
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminSuccess, setAdminSuccess] = useState('');
  const [adminError, setAdminError] = useState('');

  // Cashier Password Form State
  const [cashierNewPassword, setCashierNewPassword] = useState('');
  const [cashierConfirmPassword, setCashierConfirmPassword] = useState('');
  const [showCashierPassword, setShowCashierPassword] = useState(false);
  const [cashierSaving, setCashierSaving] = useState(false);
  const [cashierSuccess, setCashierSuccess] = useState('');
  const [cashierError, setCashierError] = useState('');

  // Editing custom user password state
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingUserPassword, setEditingUserPassword] = useState('');
  const [showEditingPassword, setShowEditingPassword] = useState(false);

  const handleUpdateAdminPassword = async (e) => {
    e?.preventDefault();
    setAdminError('');
    setAdminSuccess('');

    if (!adminNewPassword) {
      setAdminError('Please enter a new password for Admin');
      return;
    }
    if (adminNewPassword.length < 4) {
      setAdminError('Password must be at least 4 characters long');
      return;
    }
    if (adminNewPassword !== adminConfirmPassword) {
      setAdminError('New password and confirm password do not match');
      return;
    }

    try {
      setAdminSaving(true);
      const res = await changePassword({
        targetRole: 'admin',
        newPassword: adminNewPassword,
      });
      if (res.success) {
        setAdminSuccess('Admin password updated successfully!');
        setAdminNewPassword('');
        setAdminConfirmPassword('');
        setTimeout(() => setAdminSuccess(''), 4000);
      } else {
        setAdminError(res.message || 'Failed to update Admin password');
      }
    } catch {
      setAdminError('Error updating Admin password');
    } finally {
      setAdminSaving(false);
    }
  };

  const handleUpdateCashierPassword = async (e) => {
    e?.preventDefault();
    setCashierError('');
    setCashierSuccess('');

    if (!cashierNewPassword) {
      setCashierError('Please enter a new password for Cashier');
      return;
    }
    if (cashierNewPassword.length < 4) {
      setCashierError('Password must be at least 4 characters long');
      return;
    }
    if (cashierNewPassword !== cashierConfirmPassword) {
      setCashierError('New password and confirm password do not match');
      return;
    }

    try {
      setCashierSaving(true);
      const res = await changePassword({
        targetRole: 'cashier',
        newPassword: cashierNewPassword,
      });
      if (res.success) {
        setCashierSuccess('Cashier password updated successfully!');
        setCashierNewPassword('');
        setCashierConfirmPassword('');
        setTimeout(() => setCashierSuccess(''), 4000);
      } else {
        setCashierError(res.message || 'Failed to update Cashier password');
      }
    } catch {
      setCashierError('Error updating Cashier password');
    } finally {
      setCashierSaving(false);
    }
  };

  const handleUserCreated = (newUser) => {
    const updated = [newUser, ...customUsers];
    setCustomUsers(updated);
    storage.set('rms_custom_users', updated);
    setGlobalNotice(`User account for "${newUser.fullName}" created successfully! Credentials are now active.`);
    setTimeout(() => setGlobalNotice(''), 5000);
  };

  const handleDeleteUser = (userId, userName) => {
    if (window.confirm(`Are you sure you want to delete access for "${userName}"?`)) {
      const updated = customUsers.filter((u) => u.id !== userId);
      setCustomUsers(updated);
      storage.set('rms_custom_users', updated);
      setGlobalNotice(`Account for "${userName}" removed.`);
      setTimeout(() => setGlobalNotice(''), 4000);
    }
  };

  const handleSaveCustomUserPassword = (userId) => {
    if (!editingUserPassword || editingUserPassword.length < 4) {
      alert('Password must be at least 4 characters long');
      return;
    }
    const updated = customUsers.map((u) => {
      if (u.id === userId) {
        return { ...u, password: editingUserPassword };
      }
      return u;
    });
    setCustomUsers(updated);
    storage.set('rms_custom_users', updated);
    setEditingUserId(null);
    setEditingUserPassword('');
    setGlobalNotice('Password updated successfully for user account.');
    setTimeout(() => setGlobalNotice(''), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Global Success / Alert Banner */}
      {globalNotice && (
        <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-2 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{globalNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setGlobalNotice('')}
            className="text-emerald-600 hover:text-emerald-800 font-bold text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 1: DEFAULT SYSTEM ACCOUNTS (ADMIN & CASHIER) */}
      {/* ======================================================== */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">
          System Core Accounts
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* CARD 1: ADMIN PASSWORD CHANGE */}
          <Card className="flex flex-col justify-between">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#FF5C28] flex items-center justify-center">
                    <UserCog className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle>Admin Account Password</CardTitle>
                    <CardDescription>
                      Username: <strong className="text-slate-700">admin</strong> (Full Admin Portal Access)
                    </CardDescription>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-[#FF5C28]">
                  Administrator
                </span>
              </div>
            </CardHeader>

            <form onSubmit={handleUpdateAdminPassword} className="flex-1 flex flex-col justify-between">
              <CardContent className="space-y-4 pt-3">
                {isCashier && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Only logged-in Admin can modify Admin credentials.</span>
                  </div>
                )}

                {adminSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{adminSuccess}</span>
                  </div>
                )}

                {adminError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{adminError}</span>
                  </div>
                )}

                {/* New Admin Password */}
                <FormField label="New Admin Password" required hint="At least 4 characters">
                  <div className="relative flex items-center">
                    <Input
                      type={showAdminPassword ? 'text' : 'password'}
                      value={adminNewPassword}
                      onChange={(e) => {
                        setAdminNewPassword(e.target.value);
                        if (adminError) setAdminError('');
                      }}
                      placeholder="Enter new admin password"
                      disabled={isCashier}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowAdminPassword((p) => !p)}
                      className="absolute right-2.5 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                      title={showAdminPassword ? 'Hide password' : 'Show password'}
                    >
                      {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </FormField>

                {/* Confirm Admin Password */}
                <FormField label="Confirm Admin Password" required>
                  <div className="relative flex items-center">
                    <Input
                      type={showAdminPassword ? 'text' : 'password'}
                      value={adminConfirmPassword}
                      onChange={(e) => {
                        setAdminConfirmPassword(e.target.value);
                        if (adminError) setAdminError('');
                      }}
                      placeholder="Confirm new admin password"
                      disabled={isCashier}
                      className="pr-10"
                    />
                  </div>
                </FormField>
              </CardContent>

              <CardFooter className="flex items-center justify-between pt-4 border-t border-slate-100">
                <span className="text-[11px] text-slate-400">
                  Default: <code>admin123</code>
                </span>
                <Button
                  variant="primary"
                  type="submit"
                  leftIcon={Save}
                  isLoading={adminSaving}
                  disabled={isCashier || !adminNewPassword || adminSaving}
                >
                  Save Admin Password
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* CARD 2: CASHIER PASSWORD CHANGE */}
          <Card className="flex flex-col justify-between">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#FF5C28] flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle>Cashier Account Password</CardTitle>
                    <CardDescription>
                      Username: <strong className="text-slate-700">cashier</strong> (POS & 1-Day Daily Report)
                    </CardDescription>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  Cashier / Staff
                </span>
              </div>
            </CardHeader>

            <form onSubmit={handleUpdateCashierPassword} className="flex-1 flex flex-col justify-between">
              <CardContent className="space-y-4 pt-3">
                {cashierSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{cashierSuccess}</span>
                  </div>
                )}

                {cashierError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{cashierError}</span>
                  </div>
                )}

                {/* New Cashier Password */}
                <FormField label="New Cashier Password" required hint="At least 4 characters">
                  <div className="relative flex items-center">
                    <Input
                      type={showCashierPassword ? 'text' : 'password'}
                      value={cashierNewPassword}
                      onChange={(e) => {
                        setCashierNewPassword(e.target.value);
                        if (cashierError) setCashierError('');
                      }}
                      placeholder="Enter new cashier password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowCashierPassword((p) => !p)}
                      className="absolute right-2.5 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                      title={showCashierPassword ? 'Hide password' : 'Show password'}
                    >
                      {showCashierPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </FormField>

                {/* Confirm Cashier Password */}
                <FormField label="Confirm Cashier Password" required>
                  <div className="relative flex items-center">
                    <Input
                      type={showCashierPassword ? 'text' : 'password'}
                      value={cashierConfirmPassword}
                      onChange={(e) => {
                        setCashierConfirmPassword(e.target.value);
                        if (cashierError) setCashierError('');
                      }}
                      placeholder="Confirm new cashier password"
                      className="pr-10"
                    />
                  </div>
                </FormField>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500">
                  ℹ️ Cashier will use this password to sign into the POS. Cashiers only have access to 1-day daily sales reports.
                </div>
              </CardContent>

              <CardFooter className="flex items-center justify-between pt-4 border-t border-slate-100">
                <span className="text-[11px] text-slate-400">
                  Default: <code>cashier123</code>
                </span>
                <Button
                  variant="primary"
                  type="submit"
                  leftIcon={Save}
                  isLoading={cashierSaving}
                  disabled={!cashierNewPassword || cashierSaving}
                >
                  Save Cashier Password
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 2: PROVISIONED STAFF ACCOUNTS (CUSTOM USERS) */}
      {/* ======================================================== */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Provisioned Staff & Portal Accounts
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
              {customUsers.length} {customUsers.length === 1 ? 'Account' : 'Accounts'}
            </span>
          </div>
          {!isCashier && customUsers.length > 0 && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setIsCreateModalOpen(true)}
              className="text-xs font-semibold text-[#FF5C28] hover:text-[#E64A19] flex items-center gap-1 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Another Account</span>
            </button>
          )}
        </div>

        {customUsers.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-slate-200 bg-white text-center space-y-2.5">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 text-[#FF5C28] flex items-center justify-center mx-auto">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">No additional staff accounts provisioned yet</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-0.5">
                Click "+ Create User Account" to add floor managers, cashiers, or kitchen accounts with custom login credentials.
              </p>
            </div>
            {!isCashier && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#FF5C28] bg-orange-50 hover:bg-orange-100 transition-colors cursor-pointer mt-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create User Account</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customUsers.map((u) => {
              const isAdmin = u.portalRole?.toLowerCase().includes('admin');
              const isEditingThis = editingUserId === u.id;
              const initials = (u.fullName || u.name || 'User')
                .split(' ')
                .filter(Boolean)
                .map((n) => n[0].toUpperCase())
                .slice(0, 2)
                .join('');

              return (
                <div
                  key={u.id}
                  className="p-4.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3.5 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* User Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${isAdmin ? 'bg-orange-50 text-[#FF5C28] border border-orange-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                          {initials}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 leading-tight">
                            {u.fullName || u.name}
                          </h4>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            {u.portalRole}
                          </p>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isAdmin ? 'bg-orange-100 text-[#E64A19]' : 'bg-amber-100 text-amber-800'}`}>
                        {u.portalRole}
                      </span>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs text-slate-600 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate font-mono text-[11px]" title={u.loginIdentifier || u.email}>
                          {u.loginIdentifier || u.email}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <UserCog className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">
                          Role: {u.portalRole}
                        </span>
                      </div>
                      {u.phone && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{u.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 truncate">
                        <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-mono text-[11px] text-slate-500">
                          Password: {u.password ? '••••••••' : 'Default'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Inline Change Password or Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    {isEditingThis ? (
                      <div className="flex items-center gap-2 w-full animate-in fade-in duration-150">
                        <div className="relative flex-1">
                          <input
                            type={showEditingPassword ? 'text' : 'password'}
                            value={editingUserPassword}
                            onChange={(e) => setEditingUserPassword(e.target.value)}
                            placeholder="New password (min 4)"
                            className="w-full h-8 px-2.5 pr-8 rounded-lg border border-slate-200 text-xs text-slate-800 outline-none focus:border-[#FF5C28] focus:ring-1 focus:ring-[#FF5C28]/20"
                          />
                          <button
                            type="button"
                            onClick={() => setShowEditingPassword((p) => !p)}
                            className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {showEditingPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSaveCustomUserPassword(u.id)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#FF5C28] hover:bg-[#E64A19] cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingUserId(null);
                            setEditingUserPassword('');
                          }}
                          className="px-2 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingUserId(u.id);
                            setEditingUserPassword(u.password || '');
                          }}
                          className="text-xs font-semibold text-[#FF5C28] hover:text-[#E64A19] flex items-center gap-1 cursor-pointer"
                        >
                          <Lock className="w-3 h-3" />
                          <span>Change Password</span>
                        </button>

                        {!isCashier && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u.id, u.fullName || u.name)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete staff account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create User Modal Dialog */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onUserCreated={handleUserCreated}
      />
    </div>
  );
};

export default SecuritySettingsTab;
