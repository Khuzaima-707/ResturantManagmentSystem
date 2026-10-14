import React, { useState } from 'react';
import { ShieldCheck, KeyRound, User, Lock, Eye, EyeOff, Save, CheckCircle, AlertCircle, UserCog } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../../components/ui/Card';
import { FormField } from '../../../components/ui/FormField';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { useAppStore } from '../../../store';

/**
 * SecuritySettingsTab Component
 * Allows changing login passwords for Admin and Cashier accounts.
 */
export const SecuritySettingsTab = () => {
  const { user, changePassword } = useAppStore();
  const isCashier = Boolean(
    (user?.role?.toLowerCase().includes('cashier') && !user?.role?.toLowerCase().includes('admin')) ||
    (user?.username?.toLowerCase() === 'cashier' && user?.username?.toLowerCase() !== 'admin')
  );

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

  return (
    <div className="space-y-6">
      {/* Tab Header Alert */}
      <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-100 flex items-start gap-3">
        <KeyRound className="w-5 h-5 text-[#FF5C28] shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600 space-y-1">
          <p className="font-semibold text-slate-800">
            Account Credentials & Access Control
          </p>
          <p>
            Update login credentials for system portals. <strong>Admin</strong> has full system permissions, while <strong>Cashier</strong> is strictly restricted to POS operations and 1-day daily reports.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ======================================================== */}
        {/* CARD 1: ADMIN PASSWORD CHANGE */}
        {/* ======================================================== */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
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

        {/* ======================================================== */}
        {/* CARD 2: CASHIER PASSWORD CHANGE */}
        {/* ======================================================== */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
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
  );
};

export default SecuritySettingsTab;
