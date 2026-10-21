import React, { useState, useRef, useEffect, useMemo } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  ChefHat,
  LayoutDashboard,
  ShoppingCart,
  UtensilsCrossed,
  BarChart3,
  Settings,
  MoreVertical,
  UserCog,
  LogOut,
  X,
  ChevronDown,
  TrendingUp,
  Wallet,
  RotateCcw,
  Percent,
  FileSpreadsheet,
  Building2,
  ShieldCheck,
  CreditCard,
  Sliders,
  FileText,
  Database,
  History,
  Receipt,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAppStore } from '../../store';
import { getImage } from '../../services/persistence/imageStorage';
import { EditProfileModal } from './EditProfileModal';
import { isCashierUser } from '../../domain/selectors/invoiceSelectors';

/**
 * Main Left Sidebar Navigation
 * - Restaurant Brand Logo, dynamic name & tagline from Settings
 * - Complete modules: Dashboard, Sales / POS, Kitchen (KDS), Tables, Expenses & Accounts, Cash Register, Menu, Reports, Settings
 */
export const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout, settings } = useAppStore();
  const isCashier = isCashierUser(user);
  const navigate = useNavigate();
  const location = useLocation();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Check if current route is anywhere in reports
  const isReportsRoute =
    location.pathname.startsWith('/reports') || location.pathname.startsWith('/analytics');
  const [isReportsOpen, setIsReportsOpen] = useState(isReportsRoute);

  // Check if current route is anywhere in settings
  const isSettingsRoute =
    location.pathname.startsWith('/settings') || location.pathname.startsWith('/help');
  const [isSettingsOpen, setIsSettingsOpen] = useState(isSettingsRoute);

  // Automatically keep Reports/Settings open if navigated to their routes
  useEffect(() => {
    if (isReportsRoute) {
      setIsReportsOpen(true);
    }
  }, [isReportsRoute]);

  useEffect(() => {
    if (isSettingsRoute) {
      setIsSettingsOpen(true);
    }
  }, [isSettingsRoute]);

  const restaurantName = settings?.business?.name || settings?.restaurantName || 'SpiceHub';
  const tagline = settings?.business?.tagline || settings?.tagline || 'Restaurant POS';
  const logoRef = settings?.business?.logoRef || settings?.logoRef || null;

  const [logoUrl, setLogoUrl] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadLogo() {
      if (!logoRef) {
        setLogoUrl(null);
        return;
      }
      if (logoRef.startsWith('data:') || logoRef.startsWith('blob:') || logoRef.startsWith('http://') || logoRef.startsWith('https://')) {
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

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUserMenuOpen]);

  // Core system modules (before Reports)
  const mainNavItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'Sales / POS',
      path: '/pos',
      icon: ShoppingCart,
    },
    {
      name: 'Items / Menu',
      path: '/menu',
      icon: UtensilsCrossed,
    },
    {
      name: 'Expenses',
      path: '/expenses',
      icon: Receipt,
    },
  ];

  // Sub-sections for Reports accordion
  const reportSubItems = useMemo(() => {
    const list = [
      {
        name: isCashier ? "Today's Sales" : 'Sales',
        path: '/reports/sales',
        slug: 'sales',
        tab: 'Sales',
        icon: TrendingUp,
      },
      {
        name: isCashier ? "Today's Revenue" : 'Revenue',
        path: '/reports/revenue',
        slug: 'revenue',
        tab: 'Revenue',
        icon: Wallet,
      },
      {
        name: isCashier ? "Today's Reversals" : 'Reversals',
        path: '/reports/reversals',
        slug: 'reversals',
        tab: 'Reversals',
        icon: RotateCcw,
      },
    ];

    if (!isCashier) {
      list.push(
        {
          name: 'Profit & Cost',
          path: '/reports/profit',
          slug: 'profit',
          tab: 'Profit',
          icon: Percent,
        },
        {
          name: 'Financial Summary',
          path: '/reports/financial-summary',
          slug: 'financial-summary',
          tab: 'FinancialSummary',
          icon: FileSpreadsheet,
        }
      );
    }

    return list;
  }, [isCashier]);

  // Sub-sections for Settings accordion
  const settingsSubItems = useMemo(() => {
    const list = [
      {
        name: 'Business Profile',
        path: '/settings/profile',
        slug: 'profile',
        icon: Building2,
      },
      {
        name: 'User & Access Control',
        path: '/settings/security',
        slug: 'security',
        icon: ShieldCheck,
      },
      {
        name: 'Payment Accounts',
        path: '/settings/payment',
        slug: 'payment',
        icon: CreditCard,
      },
      {
        name: 'Tax Settings',
        path: '/settings/tax',
        slug: 'tax',
        icon: Percent,
      },
      {
        name: 'POS Settings',
        path: '/settings/pos',
        slug: 'pos',
        icon: Sliders,
      },
      {
        name: 'Invoice Settings',
        path: '/settings/invoice',
        slug: 'invoice',
        icon: FileText,
      },
    ];

    if (!isCashier) {
      list.push(
        {
          name: 'Data Management',
          path: '/settings/data',
          slug: 'data',
          icon: Database,
        },
        {
          name: 'Deletion History',
          path: '/settings/history',
          slug: 'history',
          icon: History,
        }
      );
    }

    return list;
  }, [isCashier]);

  // Check if a sub-report item is currently active
  const isSubActive = (sub) => {
    if (location.pathname === sub.path) return true;

    // Default to 'sales' when on /reports or /analytics without a section or query tab
    if (location.pathname === '/reports' || location.pathname === '/analytics') {
      const searchTab = new URLSearchParams(location.search).get('tab');
      if (!searchTab) {
        return sub.slug === 'sales';
      }
      return (
        searchTab.toLowerCase() === sub.slug.toLowerCase() ||
        searchTab.toLowerCase() === sub.tab.toLowerCase()
      );
    }

    const searchTab = new URLSearchParams(location.search).get('tab');
    if (
      searchTab &&
      (searchTab.toLowerCase() === sub.slug.toLowerCase() ||
        searchTab.toLowerCase() === sub.tab.toLowerCase())
    ) {
      return true;
    }

    return false;
  };

  // Check if a sub-settings item is currently active
  const isSettingSubActive = (sub) => {
    if (location.pathname === sub.path) return true;

    // Default to 'profile' when on /settings or /help without a subpath
    if (location.pathname === '/settings' || location.pathname === '/help') {
      const searchTab = new URLSearchParams(location.search).get('tab');
      if (!searchTab) {
        return sub.slug === 'profile';
      }
      return (
        searchTab.toLowerCase() === sub.slug.toLowerCase() ||
        (sub.slug === 'profile' && searchTab.toLowerCase() === 'business') ||
        (sub.slug === 'payment' && (searchTab.toLowerCase() === 'payments' || searchTab.toLowerCase() === 'accounts')) ||
        (sub.slug === 'history' && searchTab.toLowerCase() === 'deletion-history')
      );
    }

    const searchTab = new URLSearchParams(location.search).get('tab');
    if (
      searchTab &&
      (searchTab.toLowerCase() === sub.slug.toLowerCase() ||
        (sub.slug === 'profile' && searchTab.toLowerCase() === 'business') ||
        (sub.slug === 'payment' && (searchTab.toLowerCase() === 'payments' || searchTab.toLowerCase() === 'accounts')) ||
        (sub.slug === 'history' && searchTab.toLowerCase() === 'deletion-history'))
    ) {
      return true;
    }

    return false;
  };

  const handleReportsToggle = (e) => {
    e.stopPropagation();
    setIsReportsOpen((prev) => !prev);
  };

  const handleReportsClick = () => {
    if (!isReportsRoute) {
      setIsReportsOpen(true);
      navigate('/reports/sales');
      if (onClose) onClose();
    } else {
      setIsReportsOpen((prev) => !prev);
    }
  };

  const handleSettingsToggle = (e) => {
    e.stopPropagation();
    setIsSettingsOpen((prev) => !prev);
  };

  const handleSettingsClick = () => {
    if (!isSettingsRoute) {
      setIsSettingsOpen(true);
      navigate('/settings/profile');
      if (onClose) onClose();
    } else {
      setIsSettingsOpen((prev) => !prev);
    }
  };

  const sidebarCard = (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-4 sm:p-4.5 select-none justify-between overflow-hidden">
      {/* Top Half: Logo & Navigation */}
      <div className="flex flex-col min-h-0">
        {/* 1. Restaurant Brand Logo (Dynamic from Settings) */}
        <div className="flex items-center justify-between pb-4 pt-1 px-1">
          <div className="flex items-center gap-3 min-w-0">
            {/* Chef Hat or Custom Logo */}
            {logoUrl ? (
              <div className="w-10 h-10 flex items-center justify-center shrink-0">
                <img
                  src={logoUrl}
                  alt={restaurantName || 'Logo'}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-[#FFF5F0] border border-orange-100/80 flex items-center justify-center text-[#FF5C28] shadow-2xs shrink-0 overflow-hidden">
                <ChefHat className="w-5 h-5 stroke-[2.2]" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <span className="text-lg font-bold tracking-tight text-slate-900 block leading-tight truncate" title={restaurantName}>
                {restaurantName}
              </span>
              <span className="text-[10px] font-medium text-slate-400 tracking-wider uppercase block leading-tight mt-0.5 truncate" title={tagline}>
                {tagline}
              </span>
            </div>
          </div>

          {/* Mobile close button */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 outline-none focus:outline-none focus-visible:outline-none focus:ring-0"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* 2. Main Menu Navigation */}
        <div className="mt-2 flex-1 overflow-y-auto overflow-x-hidden pr-0.5 w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <span className="text-[11px] font-semibold text-slate-400 block mb-1.5 px-0.5 uppercase tracking-wider">
            Menu
          </span>
          <nav className="space-y-1 w-full">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    if (onClose) onClose();
                  }}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 w-full h-[38px] px-3.5 rounded-2xl text-xs font-semibold transition-all duration-150 group outline-none focus:outline-none focus-visible:outline-none focus:ring-0 border border-transparent',
                      isActive
                        ? 'bg-[#FF5C28] text-white shadow-md shadow-orange-500/25'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/80'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={cn(
                          'w-4 h-4 shrink-0 transition-colors stroke-[2.2]',
                          isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'
                        )}
                      />
                      <span>{item.name}</span>
                    </>
                  )}
                </NavLink>
              );
            })}

            {/* Reports Dropdown Accordion Section */}
            <div className="space-y-1 w-full">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.currentTarget.blur();
                  handleReportsClick();
                }}
                className={cn(
                  'flex items-center justify-between w-full h-[38px] px-3.5 rounded-2xl text-xs font-semibold transition-all duration-150 cursor-pointer select-none group outline-none focus:outline-none focus-visible:outline-none focus:ring-0 border border-transparent',
                  isReportsRoute
                    ? 'bg-[#FF5C28] text-white shadow-md shadow-orange-500/25'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/80'
                )}
                title="View reports breakdown"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <BarChart3
                    className={cn(
                      'w-4 h-4 shrink-0 transition-colors stroke-[2.2]',
                      isReportsRoute ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'
                    )}
                  />
                  <span className="truncate">Reports</span>
                </div>
                <ChevronDown
                  className={cn(
                    'w-3.5 h-3.5 shrink-0 transition-transform duration-200 stroke-[2.2]',
                    isReportsOpen ? 'rotate-180' : 'rotate-0',
                    isReportsRoute ? 'text-white/90' : 'text-slate-400 group-hover:text-slate-600'
                  )}
                />
              </button>

              {/* Sub-items: Sales, Revenue, Reversals, Profit & Cost, Financial Summary */}
              {isReportsOpen && (
                <div className="ml-3 pl-2 border-l-2 border-orange-200/90 space-y-1 py-1 animate-in fade-in slide-in-from-top-1 duration-150 w-[calc(100%-12px)] overflow-hidden">
                  {reportSubItems.map((sub) => {
                    const SubIcon = sub.icon;
                    const active = isSubActive(sub);
                    return (
                      <NavLink
                        key={sub.name}
                        to={sub.path}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.currentTarget.blur();
                          if (onClose) onClose();
                        }}
                        className={cn(
                          'flex items-center gap-2.5 px-2.5 h-[34px] rounded-xl text-xs transition-all duration-150 group w-full min-w-0 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 border',
                          active
                            ? 'bg-orange-50 text-[#FF5C28] font-bold shadow-2xs border-orange-200/70'
                            : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50/90 font-medium'
                        )}
                      >
                        <SubIcon
                          className={cn(
                            'w-3.5 h-3.5 shrink-0 transition-colors stroke-[2.2]',
                            active ? 'text-[#FF5C28]' : 'text-slate-400 group-hover:text-slate-600'
                          )}
                        />
                        <span className="truncate min-w-0">{sub.name}</span>
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>

          {/* 3. Others Navigation (Settings Dropdown Accordion) */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 block mb-1.5 px-0.5 uppercase tracking-wider">
              Others
            </span>
            <nav className="space-y-1 w-full">
              <div className="space-y-1 w-full">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    handleSettingsClick();
                  }}
                  className={cn(
                    'flex items-center justify-between w-full h-[38px] px-3.5 rounded-2xl text-xs font-semibold transition-all duration-150 cursor-pointer select-none group outline-none focus:outline-none focus-visible:outline-none focus:ring-0 border border-transparent',
                    isSettingsRoute
                      ? 'bg-[#FF5C28] text-white shadow-md shadow-orange-500/25'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/80'
                  )}
                  title="Configure restaurant settings"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Settings
                      className={cn(
                        'w-4 h-4 shrink-0 transition-colors stroke-[2.2]',
                        isSettingsRoute ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'
                      )}
                    />
                    <span className="truncate">Settings</span>
                  </div>
                  <ChevronDown
                    className={cn(
                      'w-3.5 h-3.5 shrink-0 transition-transform duration-200 stroke-[2.2]',
                      isSettingsOpen ? 'rotate-180' : 'rotate-0',
                      isSettingsRoute ? 'text-white/90' : 'text-slate-400 group-hover:text-slate-600'
                    )}
                  />
                </button>

                {/* Sub-items: Business Profile, Security, Payment, Tax, POS, Invoice, Data, History */}
                {isSettingsOpen && (
                  <div className="ml-3 pl-2 border-l-2 border-orange-200/90 space-y-1 py-1 animate-in fade-in slide-in-from-top-1 duration-150 w-[calc(100%-12px)] overflow-hidden">
                    {settingsSubItems.map((sub) => {
                      const SubIcon = sub.icon;
                      const active = isSettingSubActive(sub);
                      return (
                        <NavLink
                          key={sub.name}
                          to={sub.path}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => {
                            e.currentTarget.blur();
                            if (onClose) onClose();
                          }}
                          className={cn(
                            'flex items-center gap-2.5 px-2.5 h-[34px] rounded-xl text-xs transition-all duration-150 group w-full min-w-0 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 border',
                            active
                              ? 'bg-orange-50 text-[#FF5C28] font-bold shadow-2xs border-orange-200/70'
                              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50/90 font-medium'
                          )}
                        >
                          <SubIcon
                            className={cn(
                              'w-3.5 h-3.5 shrink-0 transition-colors stroke-[2.2]',
                              active ? 'text-[#FF5C28]' : 'text-slate-400 group-hover:text-slate-600'
                            )}
                          />
                          <span className="truncate min-w-0">{sub.name}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            </nav>
          </div>
        </div>
      </div>

      {/* 4. Bottom User Profile Card */}
      <div className="mt-4 pt-2 relative" ref={userMenuRef}>
        {/* User Actions Popup Dropdown */}
        {isUserMenuOpen && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-slate-200/90 rounded-2xl shadow-xl p-1.5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.currentTarget.blur();
                setIsUserMenuOpen(false);
                setIsEditProfileOpen(true);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-[#FF5C28] hover:bg-orange-50/60 rounded-xl transition-colors text-left cursor-pointer outline-none focus:outline-none focus-visible:outline-none focus:ring-0"
            >
              <UserCog className="w-4 h-4 text-[#FF5C28]" />
              <span>Edit Profile</span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.currentTarget.blur();
                setIsUserMenuOpen(false);
                navigate('/settings');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors text-left cursor-pointer outline-none focus:outline-none focus-visible:outline-none focus:ring-0"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span>Settings</span>
            </button>
            <div className="h-px bg-slate-100 my-0.5" />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={async (e) => {
                e.currentTarget.blur();
                setIsUserMenuOpen(false);
                await logout();
                navigate('/login');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left cursor-pointer outline-none focus:outline-none focus-visible:outline-none focus:ring-0"
            >
              <LogOut className="w-4 h-4 text-rose-500" />
              <span>Sign Out</span>
            </button>
          </div>
        )}

        <div
          onClick={() => setIsUserMenuOpen((prev) => !prev)}
          className="p-2 sm:p-2.5 rounded-2xl border border-slate-200/80 bg-white hover:border-slate-300 transition-colors flex items-center justify-between shadow-2xs cursor-pointer group outline-none focus:outline-none focus-visible:outline-none focus:ring-0"
          title="Click to view profile options"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {/* User photo with green online dot */}
            <div className="relative shrink-0">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user?.name || 'User'}
                  className="w-8 h-8 rounded-full object-cover border border-slate-100"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-orange-100 text-[#FF5C28] flex items-center justify-center font-bold text-xs border border-orange-200">
                  {user?.initials || (isCashier ? 'C1' : 'JH')}
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
            </div>
            {/* Name & Role */}
            <div className="min-w-0 truncate">
              <span className="text-xs font-semibold text-slate-800 block truncate leading-tight group-hover:text-[#FF5C28] transition-colors">
                {user?.name || (isCashier ? 'Cashier 1' : 'John Holland')}
              </span>
              <span className="text-[10px] text-slate-400 font-normal block leading-tight mt-0.5">
                {user?.role || (isCashier ? 'Cashier' : 'Admin Cashier')}
              </span>
            </div>
          </div>
          {/* Action buttons: Direct Logout & 3-dots */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={async (e) => {
                e.stopPropagation();
                e.currentTarget.blur();
                await logout();
                navigate('/login');
              }}
              className="p-1.5 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer outline-none focus:outline-none focus-visible:outline-none focus:ring-0"
              aria-label="Sign Out"
              title="Sign Out / Logout"
            >
              <LogOut className="w-3.5 h-3.5 stroke-[2.2]" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                e.currentTarget.blur();
                setIsUserMenuOpen((prev) => !prev);
              }}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer outline-none focus:outline-none focus-visible:outline-none focus:ring-0"
              aria-label="User actions"
              title="More options"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Floating Sidebar (Symmetrically aligned top & bottom) */}
      <aside className="hidden lg:flex shrink-0 w-64 h-full z-30 flex-col select-none">
        {sidebarCard}
      </aside>

      {/* Mobile Drawer Sidebar */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          />
          <div className="relative z-50 h-full w-64 max-w-xs p-4 animate-in slide-in-from-left duration-200">
            {sidebarCard}
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditProfileOpen && (
        <EditProfileModal
          isOpen={isEditProfileOpen}
          onClose={() => setIsEditProfileOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;

