import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const userMenuRef = useRef(null);

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

  // Core system modules
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
      name: 'Reports',
      path: '/reports',
      icon: BarChart3,
    },
  ];

  const secondaryNavItems = [
    {
      name: 'Settings',
      path: '/settings',
      icon: Settings,
    },
  ];

  const sidebarCard = (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.02)] p-4 sm:p-4.5 select-none justify-between overflow-hidden">
      {/* Top Half: Logo & Navigation */}
      <div className="flex flex-col min-h-0">
        {/* 1. Restaurant Brand Logo (Dynamic from Settings) */}
        <div className="flex items-center justify-between pb-4 pt-1 px-1">
          <div className="flex items-center gap-3 min-w-0">
            {/* Chef Hat or Custom Logo */}
            <div className="w-10 h-10 rounded-2xl bg-[#FFF5F0] border border-orange-100/80 flex items-center justify-center text-[#FF5C28] shadow-2xs shrink-0 overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
              ) : (
                <ChefHat className="w-5 h-5 stroke-[2.2]" />
              )}
            </div>
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
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* 2. Main Menu Navigation */}
        <div className="mt-2 flex-1 overflow-y-auto pr-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <span className="text-[11px] font-semibold text-slate-400 block mb-1.5 px-0.5 uppercase tracking-wider">
            Menu
          </span>
          <nav className="space-y-1">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-150 group',
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
          </nav>

          {/* 3. Others Navigation (Only Settings retained) */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 block mb-1.5 px-0.5 uppercase tracking-wider">
              Others
            </span>
            <nav className="space-y-1">
              {secondaryNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-150 group',
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
              onClick={() => {
                setIsUserMenuOpen(false);
                setIsEditProfileOpen(true);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-[#FF5C28] hover:bg-orange-50/60 rounded-xl transition-colors text-left cursor-pointer"
            >
              <UserCog className="w-4 h-4 text-[#FF5C28]" />
              <span>Edit Profile</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsUserMenuOpen(false);
                navigate('/settings');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors text-left cursor-pointer"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span>Settings</span>
            </button>
            <div className="h-px bg-slate-100 my-0.5" />
            <button
              type="button"
              onClick={async () => {
                setIsUserMenuOpen(false);
                await logout();
                navigate('/login');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-rose-500" />
              <span>Sign Out</span>
            </button>
          </div>
        )}

        <div
          onClick={() => setIsUserMenuOpen((prev) => !prev)}
          className="p-2 sm:p-2.5 rounded-2xl border border-slate-200/80 bg-white hover:border-slate-300 transition-colors flex items-center justify-between shadow-2xs cursor-pointer group"
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
              onClick={async (e) => {
                e.stopPropagation();
                await logout();
                navigate('/login');
              }}
              className="p-1.5 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              aria-label="Sign Out"
              title="Sign Out / Logout"
            >
              <LogOut className="w-3.5 h-3.5 stroke-[2.2]" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsUserMenuOpen((prev) => !prev);
              }}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
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

