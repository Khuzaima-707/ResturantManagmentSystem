import React, { useState, useMemo } from 'react';
import {
  Search,
  MoreVertical,
  CheckCircle2,
  Trash2,
  Lock,
  Building2,
  Eye,
  EyeOff,
  UserCheck,
  X,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useAppStore } from '../../../store';
import { storage } from '../../../services/persistence/storage';
import { CreateUserModal } from './CreateUserModal';

// Default system users with restaurant specific data
const INITIAL_SYSTEM_USERS = [
  {
    id: 'user_admin',
    name: 'Admin',
    officialTitle: 'Executive Officer / Owner',
    username: 'admin',
    email: 'admin@spicehub.pk',
    phone: '03001112233',
    portalRole: 'Admin',
    systemRole: 'Admin',
    role: 'admin',
    branch: 'All Branches',
    linkedEmployeeRecord: 'Direct System User',
    status: 'active',
    isFixedAdmin: true,
  },
  {
    id: 'user_cashier_1',
    name: 'Hamza Farooq',
    officialTitle: 'Main Counter Cashier & Billing',
    username: 'cashier',
    email: 'cashier@spicehub.pk',
    phone: '03003334455',
    portalRole: 'Sales & Billing',
    systemRole: 'Sales & Billing',
    role: 'cashier',
    branch: 'All Branches',
    linkedEmployeeRecord: 'Direct System User',
    status: 'active',
    isActiveCashier: true,
    isFixedAdmin: false,
    password: 'cashier123',
  },
  {
    id: 'user_cashier_2',
    name: 'Bilal Ahmed',
    officialTitle: 'Evening Shift Cashier',
    username: 'bilal.cashier',
    email: 'bilal.cashier@spicehub.pk',
    phone: '03215558899',
    portalRole: 'Sales & Billing',
    systemRole: 'Sales & Billing',
    role: 'cashier',
    branch: 'All Branches',
    linkedEmployeeRecord: 'Direct System User',
    status: 'deactivated',
    isActiveCashier: false,
    isFixedAdmin: false,
    password: 'cashier123',
  },
  {
    id: 'user_cashier_3',
    name: 'Amna Sheikh',
    officialTitle: 'Floor Cashier & Ordering',
    username: 'amna.sheikh',
    email: 'amna.sheikh@spicehub.pk',
    phone: '03002223344',
    portalRole: 'Sales & Billing',
    systemRole: 'Sales & Billing',
    role: 'cashier',
    branch: 'All Branches',
    linkedEmployeeRecord: 'Direct System User',
    status: 'deactivated',
    isActiveCashier: false,
    isFixedAdmin: false,
    password: 'cashier123',
  },
  {
    id: 'user_cashier_4',
    name: 'Zeeshan Akram',
    officialTitle: 'Weekend Counter Cashier',
    username: 'zeeshan.cashier',
    email: 'zeeshan.cashier@spicehub.pk',
    phone: '03004445566',
    portalRole: 'Sales & Billing',
    systemRole: 'Sales & Billing',
    role: 'cashier',
    branch: 'All Branches',
    linkedEmployeeRecord: 'Direct System User',
    status: 'deactivated',
    isActiveCashier: false,
    isFixedAdmin: false,
    password: 'cashier123',
  },
];

export const SecuritySettingsTab = ({
  isCreateModalOpen: propIsOpen,
  setIsCreateModalOpen: propSetIsOpen,
}) => {
  const { user } = useAppStore();

  const isCashier = Boolean(
    (user?.role?.toLowerCase().includes('cashier') && !user?.role?.toLowerCase().includes('admin')) ||
    (user?.username?.toLowerCase() === 'cashier' && user?.username?.toLowerCase() !== 'admin')
  );

  if (isCashier) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 mx-auto">
          <Lock className="w-6 h-6 text-slate-600" />
        </div>
        <h3 className="text-base font-bold text-slate-800">Administrator Access Required</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          User &amp; Access Control is restricted to restaurant administrators only. Cashiers cannot view or modify system users.
        </p>
      </div>
    );
  }

  // Modal State
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isCreateModalOpen = propIsOpen !== undefined ? propIsOpen : internalIsOpen;
  const setIsCreateModalOpen = propSetIsOpen || setInternalIsOpen;

  // Users State (Strictly normalized to All Branches and Admin)
  const [usersList, setUsersList] = useState(() => {
    const saved = storage.get('rms_users_list', null);
    const userProfiles = storage.get('user_profiles', {});
    const savedAdmin = userProfiles?.admin || {};

    if (Array.isArray(saved) && saved.length > 0) {
      const normalized = saved.map((u) => {
        const isAdmin = Boolean(
          u.isFixedAdmin ||
          u.id === 'user_admin' ||
          u.username === 'admin' ||
          u.username === 'superadmin' ||
          u.email?.includes('superadmin') ||
          u.role === 'admin' ||
          u.portalRole?.toLowerCase().includes('admin')
        );
        if (isAdmin) {
          const currentAdminName =
            savedAdmin.name ||
            (u.name && u.name !== 'Admin' ? u.name : (u.name || 'Admin'));
          return {
            ...u,
            id: 'user_admin',
            name: currentAdminName,
            fullName: currentAdminName,
            officialTitle: savedAdmin.officialTitle || u.officialTitle || 'Executive Officer / Owner',
            username: 'admin',
            email: 'admin@spicehub.pk',
            phone: '03001112233',
            portalRole: savedAdmin.role || 'Admin',
            systemRole: savedAdmin.role || 'Admin',
            role: 'admin',
            branch: 'All Branches',
            linkedEmployeeRecord: 'Direct System User',
            status: 'active',
            isFixedAdmin: true,
            avatarUrl: savedAdmin.avatarUrl !== undefined ? savedAdmin.avatarUrl : u.avatarUrl,
          };
        }
        return {
          ...u,
          branch: 'All Branches',
          portalRole: u.portalRole || 'Sales & Billing',
          systemRole: u.systemRole || 'Sales & Billing',
        };
      });
      storage.set('rms_users_list', normalized);
      return normalized;
    }
    const defaultAdmin = {
      ...INITIAL_SYSTEM_USERS[0],
      ...(savedAdmin.name ? { name: savedAdmin.name, fullName: savedAdmin.name } : {}),
      ...(savedAdmin.avatarUrl !== undefined ? { avatarUrl: savedAdmin.avatarUrl } : {}),
    };

    const customUsers = storage.get('rms_custom_users', []);
    if (Array.isArray(customUsers) && customUsers.length > 0) {
      const merged = [defaultAdmin, ...customUsers].map((u) => ({ ...u, branch: 'All Branches' }));
      storage.set('rms_users_list', merged);
      return merged;
    }
    const initialList = [defaultAdmin, ...INITIAL_SYSTEM_USERS.slice(1)];
    storage.set('rms_users_list', initialList);
    return initialList;
  });

  // Filter & Search states (matching Screenshot 1)
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('All Branches');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [statusFilter, setStatusFilter] = useState('All');

  // Menu and modal action states
  const [openActionMenuId, setOpenActionMenuId] = useState(null);
  const [passwordModalUser, setPasswordModalUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [notification, setNotification] = useState('');

  // Close menus on outside click
  React.useEffect(() => {
    const handleOutsideClick = () => setOpenActionMenuId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Ensure that in Admin Settings, the current session user is strictly Admin
  React.useEffect(() => {
    const cur = useAppStore.getState().user;
    const isCashierSession = Boolean(
      cur &&
      (cur.role?.toLowerCase().includes('cashier') || cur.username !== 'admin') &&
      !cur.role?.toLowerCase().includes('admin')
    );
    if (isCashierSession) {
      const adminProfile = {
        id: 'user_admin',
        name: 'Admin',
        username: 'admin',
        email: 'admin@spicehub.pk',
        role: 'Admin',
        branch: 'All Branches',
        initials: 'AD',
        officialTitle: 'Executive Officer / Owner',
      };
      useAppStore.setState({ user: adminProfile });
      storage.set('active_user', adminProfile);
    }
  }, []);

  /**
   * Activate Cashier Handler
   * Activates this specific cashier for Cashier Portal & POS without deactivating other active cashiers.
   */
  const handleActivateCashier = (targetCashier) => {
    if (targetCashier.isFixedAdmin) return;

    const updated = usersList.map((u) => {
      if (u.id === targetCashier.id) {
        return {
          ...u,
          status: 'active',
          isActiveCashier: true,
        };
      }
      return u;
    });

    setUsersList(updated);
    storage.set('rms_users_list', updated);
    storage.set('rms_custom_users', updated.filter((u) => !u.isFixedAdmin));

    // Save active cashier references for Cashier Portal
    const activeCashiers = updated.filter((u) => !u.isFixedAdmin && u.status === 'active');
    storage.set('active_cashier_users', activeCashiers);

    const activeCashierPayload = {
      id: targetCashier.id,
      name: targetCashier.name || targetCashier.fullName,
      username: targetCashier.username || targetCashier.loginIdentifier || 'cashier',
      email: targetCashier.email,
      phone: targetCashier.phone,
      branch: targetCashier.branch,
      role: 'Cashier',
      officialTitle: targetCashier.officialTitle,
      avatarUrl: targetCashier.avatarUrl || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    };
    storage.set('active_cashier_user', activeCashierPayload);
    storage.set('active_cashier_id', targetCashier.id);

    // Update user_profiles.cashier in storage
    const profiles = storage.get('user_profiles', {});
    profiles.cashier = {
      ...activeCashierPayload,
      initials: (activeCashierPayload.name || 'C1').split(' ').filter(Boolean).map((n) => n[0].toUpperCase()).slice(0, 2).join('') || 'C1',
    };
    storage.set('user_profiles', profiles);

    setOpenActionMenuId(null);
    setNotification(`Cashier "${targetCashier.name}" is now ACTIVE on Cashier Portal & POS!`);
    setTimeout(() => setNotification(''), 5000);
  };

  /**
   * Deactivate Cashier Handler
   */
  const handleDeactivateCashier = (targetCashier) => {
    if (targetCashier.isFixedAdmin) return;

    const updated = usersList.map((u) => {
      if (u.id === targetCashier.id) {
        return {
          ...u,
          status: 'deactivated',
          isActiveCashier: false,
        };
      }
      return u;
    });

    setUsersList(updated);
    storage.set('rms_users_list', updated);
    storage.set('rms_custom_users', updated.filter((u) => !u.isFixedAdmin));

    const activeCashiers = updated.filter((u) => !u.isFixedAdmin && u.status === 'active');
    storage.set('active_cashier_users', activeCashiers);

    if (activeCashiers.length > 0) {
      storage.set('active_cashier_user', activeCashiers[0]);
      storage.set('active_cashier_id', activeCashiers[0].id);
    } else {
      storage.remove('active_cashier_user');
      storage.remove('active_cashier_id');
    }

    setOpenActionMenuId(null);
    setNotification(`Cashier "${targetCashier.name}" access deactivated.`);
    setTimeout(() => setNotification(''), 4000);
  };

  /**
   * Activate All Cashiers Handler
   * Enables all cashiers simultaneously for Cashier Portal
   */
  const handleActivateAllCashiers = () => {
    const updated = usersList.map((u) => {
      if (u.isFixedAdmin) return u;
      return {
        ...u,
        status: 'active',
        isActiveCashier: true,
      };
    });

    setUsersList(updated);
    storage.set('rms_users_list', updated);
    storage.set('rms_custom_users', updated.filter((u) => !u.isFixedAdmin));

    const activeCashiers = updated.filter((u) => !u.isFixedAdmin);
    storage.set('active_cashier_users', activeCashiers);
    if (activeCashiers[0]) {
      storage.set('active_cashier_user', activeCashiers[0]);
      storage.set('active_cashier_id', activeCashiers[0].id);
    }

    setNotification('All cashiers have been ACTIVATED for Cashier Portal & POS!');
    setTimeout(() => setNotification(''), 5000);
  };

  /**
   * Deactivate All Cashiers Handler
   */
  const handleDeactivateAllCashiers = () => {
    const updated = usersList.map((u) => {
      if (u.isFixedAdmin) return u;
      return {
        ...u,
        status: 'deactivated',
        isActiveCashier: false,
      };
    });

    setUsersList(updated);
    storage.set('rms_users_list', updated);
    storage.set('rms_custom_users', updated.filter((u) => !u.isFixedAdmin));
    storage.set('active_cashier_users', []);
    storage.remove('active_cashier_user');
    storage.remove('active_cashier_id');

    setNotification('All cashier accounts have been DEACTIVATED.');
    setTimeout(() => setNotification(''), 5000);
  };

  /**
   * Delete Cashier Handler
   */
  const handleDeleteCashier = (targetCashier) => {
    if (targetCashier.isFixedAdmin) return;
    if (window.confirm(`Are you sure you want to delete cashier account for "${targetCashier.name}"?`)) {
      const updated = usersList.filter((u) => u.id !== targetCashier.id);
      setUsersList(updated);
      storage.set('rms_users_list', updated);
      storage.set('rms_custom_users', updated.filter((u) => !u.isFixedAdmin));
      setOpenActionMenuId(null);
      setNotification(`Cashier account for "${targetCashier.name}" removed.`);
      setTimeout(() => setNotification(''), 4000);
    }
  };

  /**
   * Save Password Handler
   */
  const handleSavePassword = (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 4) {
      alert('Password must be at least 4 characters long.');
      return;
    }
    if (!passwordModalUser) return;

    if (passwordModalUser.isFixedAdmin) {
      const creds = storage.get('auth_credentials', { admin: 'admin123', cashier: 'cashier123' });
      creds.admin = newPassword;
      storage.set('auth_credentials', creds);
    } else {
      const updated = usersList.map((u) => {
        if (u.id === passwordModalUser.id) {
          return { ...u, password: newPassword };
        }
        return u;
      });
      setUsersList(updated);
      storage.set('rms_users_list', updated);
      storage.set('rms_custom_users', updated.filter((u) => !u.isFixedAdmin));
      if (passwordModalUser.isActiveCashier) {
        const creds = storage.get('auth_credentials', { admin: 'admin123', cashier: 'cashier123' });
        creds.cashier = newPassword;
        storage.set('auth_credentials', creds);
      }
    }

    setNotification(`Password updated for "${passwordModalUser.name}".`);
    setPasswordModalUser(null);
    setNewPassword('');
    setTimeout(() => setNotification(''), 4000);
  };

  /**
   * New Cashier Created Handler
   */
  const handleUserCreated = (newUser, setAsActive) => {
    let updated;
    if (setAsActive) {
      updated = [
        ...usersList.map((u) => (u.isFixedAdmin ? u : { ...u, status: 'deactivated', isActiveCashier: false })),
        { ...newUser, status: 'active', isActiveCashier: true },
      ];
      handleActivateCashier(newUser);
    } else {
      updated = [...usersList, newUser];
      setUsersList(updated);
      storage.set('rms_users_list', updated);
      storage.set('rms_custom_users', updated.filter((u) => !u.isFixedAdmin));
      setNotification(`New cashier account "${newUser.name}" added successfully.`);
      setTimeout(() => setNotification(''), 4000);
    }
  };

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      // Search filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchName = (u.name || '').toLowerCase().includes(query);
        const matchEmail = (u.email || '').toLowerCase().includes(query);
        const matchUsername = (u.username || '').toLowerCase().includes(query);
        const matchTitle = (u.officialTitle || u.portalRole || '').toLowerCase().includes(query);
        const matchPhone = (u.phone || '').toLowerCase().includes(query);
        if (!matchName && !matchEmail && !matchUsername && !matchTitle && !matchPhone) {
          return false;
        }
      }

      // Branch filter
      if (branchFilter !== 'All Branches') {
        if (!u.branch?.toLowerCase().includes(branchFilter.toLowerCase().replace('branch', '').trim()) &&
            !u.branch?.toLowerCase().includes('all branches')) {
          return false;
        }
      }

      // Role filter
      if (roleFilter !== 'All Roles') {
        if (roleFilter === 'Admin' && !u.isFixedAdmin) return false;
        if (roleFilter === 'Cashier / Billing' && u.isFixedAdmin) return false;
      }

      // Status filter
      if (statusFilter !== 'All') {
        if (statusFilter.toLowerCase() !== u.status?.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [usersList, searchTerm, branchFilter, roleFilter, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Toast Notification Banner */}
      {notification && (
        <div className="p-3 sm:p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-2 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{notification}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification('')}
            className="text-emerald-700 hover:text-emerald-900 font-bold text-xs p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* FILTER & SEARCH HEADER (Exact Match to Screenshot 1) */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-lg">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, or designation..."
            className="w-full h-10 pl-4 pr-10 rounded-full border border-slate-200/90 bg-white text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#FF5C28] focus:ring-2 focus:ring-[#FF5C28]/20 transition-all shadow-inner/10"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-600">
          {/* Branch Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-500 whitespace-nowrap text-[11px]">Branch:</span>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 outline-none focus:border-[#FF5C28] focus:ring-1 focus:ring-[#FF5C28]/20 cursor-pointer shadow-2xs transition-colors"
            >
              <option value="All Branches">All Branches</option>
            </select>
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-500 whitespace-nowrap text-[11px]">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 outline-none focus:border-[#FF5C28] focus:ring-1 focus:ring-[#FF5C28]/20 cursor-pointer shadow-2xs transition-colors"
            >
              <option value="All Roles">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="Cashier / Billing">Cashier / Billing</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-500 whitespace-nowrap text-[11px]">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 outline-none focus:border-[#FF5C28] focus:ring-1 focus:ring-[#FF5C28]/20 cursor-pointer shadow-2xs transition-colors"
            >
              <option value="All">All</option>
              <option value="active">Active</option>
              <option value="deactivated">Deactivated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Quick Cashier Activation Controls (Voice Requirement) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-orange-50/70 via-white to-emerald-50/60 rounded-2xl border border-orange-200/70 shadow-2xs">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-800">
            Cashier Portal Availability:
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            {usersList.filter((u) => !u.isFixedAdmin && u.status === 'active').length} of {usersList.filter((u) => !u.isFixedAdmin).length} Cashiers Active
          </span>
          <span className="text-[11px] text-slate-500 hidden md:inline">
            (Active cashiers appear directly on Cashier Login screen)
          </span>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <button
            type="button"
            onClick={handleActivateAllCashiers}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Make all cashiers active on the Cashier Portal"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Activate All Cashiers</span>
          </button>
          <button
            type="button"
            onClick={handleDeactivateAllCashiers}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Deactivate all cashiers"
          >
            <X className="w-3.5 h-3.5" />
            <span>Deactivate All</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* ENTERPRISE USER MANAGEMENT TABLE (Matching Screenshot 1) */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02),0_2px_8px_-2px_rgba(15,23,42,0.03)]">
        <div className="w-full">
          <table className="w-full text-left border-collapse table-auto">
            {/* Table Header matching other sections */}
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 text-xs font-semibold select-none">
                <th className="py-2.5 px-3">Name &amp; Title</th>
                <th className="py-2.5 px-3">Login Identifier</th>
                <th className="py-2.5 px-3 whitespace-nowrap">System Role</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Assigned Branch</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Linked Record</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Access Status</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <UserCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">No accounts match your current filter</p>
                    <p className="text-[11px] mt-0.5">Try clearing your search query or reset filters.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, index) => {
                  const isNearBottom = index >= Math.max(1, filteredUsers.length - 2);
                  const isAdmin = Boolean(
                    u.isFixedAdmin ||
                    u.id === 'user_admin' ||
                    u.username === 'admin' ||
                    u.username === 'superadmin' ||
                    u.role === 'admin' ||
                    (u.name && u.name.toLowerCase().includes('admin'))
                  );
                  const isCurrentLoggedInUser = isAdmin;
                  const isThisCashierActive = Boolean(u.status === 'active' && !isAdmin);

                  return (
                    <tr
                      key={u.id}
                      className={`transition-colors duration-150 hover:bg-slate-50/60 ${
                        isThisCashierActive ? 'bg-orange-50/20' : ''
                      }`}
                    >
                      {/* 1. Name & Title (Clean text, no box logo) */}
                      <td className="py-2.5 px-3 align-middle">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-900 text-xs">
                              {isAdmin ? 'Admin' : u.name}
                            </span>
                            {isCurrentLoggedInUser && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200">
                                You
                              </span>
                            )}
                            {isThisCashierActive && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                                <Sparkles className="w-2.5 h-2.5" />
                                <span>Active POS</span>
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 block truncate font-normal mt-0.5">
                            {isAdmin ? 'Executive Officer / Owner' : (u.officialTitle || 'Counter Cashier & Billing')}
                          </span>
                        </div>
                      </td>

                      {/* 2. Login Identifier */}
                      <td className="py-2.5 px-3 align-middle">
                        <div className="min-w-0">
                          <span className="text-slate-800 font-medium text-xs block truncate" title={isAdmin ? 'admin@spicehub.pk' : (u.email || u.username)}>
                            {isAdmin ? 'admin@spicehub.pk' : (u.email || u.username)}
                          </span>
                          <span className="text-slate-500 text-[11px] block truncate mt-0.5 font-mono">
                            {isAdmin ? '03001112233' : (u.phone || '03000000000')}
                          </span>
                        </div>
                      </td>

                      {/* 3. System Role */}
                      <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                        {isAdmin ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                            <span>Admin</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            <span>Sales &amp; Billing</span>
                          </span>
                        )}
                      </td>

                      {/* 4. Assigned Branch */}
                      <td className="py-2.5 px-3 align-middle whitespace-nowrap text-slate-600">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>All Branches</span>
                        </div>
                      </td>

                      {/* 5. Linked Employee Record */}
                      <td className="py-2.5 px-3 align-middle whitespace-nowrap text-slate-500 text-xs">
                        <span>{u.linkedEmployeeRecord || 'Direct System User'}</span>
                      </td>

                      {/* 6. Access Status (1-Click Interactive Toggle) */}
                      <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                        {u.status === 'active' ? (
                          isAdmin ? (
                            <span className="inline-flex items-center justify-center gap-1.5 w-[88px] h-6 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 select-none">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>Active</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleDeactivateCashier(u)}
                              title="Click to deactivate this cashier"
                              className="inline-flex items-center justify-center gap-1.5 w-[88px] h-6 rounded-full text-[11px] font-semibold bg-emerald-50 hover:bg-rose-50 text-emerald-700 hover:text-rose-700 border border-emerald-200 hover:border-rose-300 transition-colors cursor-pointer group/status shadow-2xs"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 group-hover/status:bg-rose-500" />
                              <span className="group-hover/status:hidden">Active</span>
                              <span className="hidden group-hover/status:inline">Deactivate</span>
                            </button>
                          )
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleActivateCashier(u)}
                            title="Click to activate this cashier for Cashier Portal"
                            className="inline-flex items-center justify-center gap-1.5 w-[88px] h-6 rounded-full text-[11px] font-semibold bg-slate-50 hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 transition-colors cursor-pointer group/status shadow-2xs"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 group-hover/status:bg-emerald-500 transition-colors" />
                            <span className="group-hover/status:hidden">Deactive</span>
                            <span className="hidden group-hover/status:inline">Activate</span>
                          </button>
                        )}
                      </td>

                      {/* 7. Actions */}
                      <td className="py-2.5 px-3 align-middle text-right whitespace-nowrap relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenActionMenuId(openActionMenuId === u.id ? null : u.id);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
                          aria-label="Actions"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Action Popover Menu */}
                        {openActionMenuId === u.id && (
                          <>
                            {/* Backdrop to close menu on outside click */}
                            <div
                              className="fixed inset-0 z-40 cursor-default"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenActionMenuId(null);
                              }}
                            />
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className={`absolute right-2 ${
                                isNearBottom ? 'bottom-8 origin-bottom-right' : 'top-8 origin-top-right'
                              } w-48 bg-white rounded-xl shadow-2xl border border-slate-200/90 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-left`}
                            >
                              {!isAdmin && (
                                <>
                                  {u.status !== 'active' ? (
                                    <button
                                      type="button"
                                      onClick={() => handleActivateCashier(u)}
                                      className="w-full px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 cursor-pointer transition-colors"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Set as Active Cashier</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleDeactivateCashier(u)}
                                      className="w-full px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-50 flex items-center gap-2 cursor-pointer transition-colors"
                                    >
                                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                      <span>Deactivate Access</span>
                                    </button>
                                  )}
                                </>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  setPasswordModalUser(u);
                                  setNewPassword('');
                                  setOpenActionMenuId(null);
                                }}
                                className="w-full px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors"
                              >
                                <Lock className="w-3.5 h-3.5 text-slate-400" />
                                <span>Change Password</span>
                              </button>

                              {!isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCashier(u)}
                                  className="w-full px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer transition-colors border-t border-slate-100 mt-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                  <span>Delete Cashier</span>
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Summary */}
        <div className="py-3 px-4 bg-slate-50/60 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
          <div>
            Showing <strong className="text-slate-700">{filteredUsers.length}</strong> of{' '}
            <strong className="text-slate-700">{usersList.length}</strong> accounts (1 Core Administrator,{' '}
            {usersList.length - 1} Cashier Operators)
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{usersList.filter((u) => !u.isFixedAdmin && u.status === 'active').length} Active Cashiers on Portal</span>
            </span>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
            onClick={() => setPasswordModalUser(null)}
          />
          <div className="relative bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md p-5 sm:p-6 z-10 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#FF5C28] flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Change Password</h3>
                  <p className="text-xs text-slate-500">For {passwordModalUser.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPasswordModalUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePassword} className="mt-4 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  New Password (min 4 characters)
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full h-10 pl-3 pr-10 rounded-xl border border-slate-200 focus:border-[#FF5C28] focus:ring-2 focus:ring-[#FF5C28]/20 text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPasswordModalUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#FF5C28] hover:bg-[#E64A19] shadow-sm"
                >
                  Save Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
