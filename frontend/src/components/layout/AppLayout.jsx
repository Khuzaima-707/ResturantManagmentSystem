import React, { useState } from 'react';
import { Outlet, useLocation, NavLink } from 'react-router-dom';
import {
  Menu,
  Settings,
  ChefHat,
} from 'lucide-react';
import { Sidebar } from './Sidebar';
import { NotificationDropdown } from './NotificationDropdown';
import { ToastNotification } from '../ui/ToastNotification';

/**
 * Metadata for each application section in the top navigation bar
 */
const SECTION_CONFIG = {
  '/dashboard': {
    title: 'Dashboard',
    subtitle: 'Welcome back!',
  },
  '/pos': {
    title: 'Sales / POS',
    subtitle: 'Create and manage restaurant customer orders & billing',
  },
  '/orders': {
    title: 'Sales / POS',
    subtitle: 'Live customer orders, takeaway & dine-in billing',
  },
  '/tables': {
    title: 'Tables',
    subtitle: 'Floor layout, dine-in tables & guest assignments',
  },
  '/menu': {
    title: 'Items / Menu',
    subtitle: 'Manage your restaurant menu items.',
  },
  '/menus': {
    title: 'Items / Menu',
    subtitle: 'Manage your restaurant menu items.',
  },
  '/kitchen': {
    title: 'Kitchen',
    subtitle: 'Live order preparation, cook queues & portions',
  },
  '/expenses': {
    title: 'Expenses',
    subtitle: 'Track operational overheads, receipts & expense categories',
  },
  '/accounts': {
    title: 'Expenses',
    subtitle: 'Track operational overheads, receipts & expense categories',
  },
  '/reports': {
    title: 'Reports',
    subtitle: 'Audited sales breakdown, net revenue & ledger analytics',
  },
  '/analytics': {
    title: 'Reports',
    subtitle: 'Audited sales breakdown, net revenue & ledger analytics',
  },
  '/settings': {
    title: 'Settings',
    subtitle: 'Store configuration, tax rates & preferences',
  },
  '/help': {
    title: 'Help & Support',
    subtitle: 'POS documentation, cashier guides & assistance',
  },
};

/**
 * Main Application Shell Layout
 * Renders the clean top navbar matching the reference design across every section:
 * - Left: Section Title (bold) + Section Subtitle (subdued)
 * - Right: Notification Bell with '8+' orange badge + Settings Gear icon
 * No duplicate headers, no clutter.
 */
export const AppLayout = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const location = useLocation();

  const currentSection =
    SECTION_CONFIG[location.pathname] ||
    (location.pathname.startsWith('/reports') || location.pathname.startsWith('/analytics')
      ? {
          title: 'Reports',
          subtitle: 'Audited sales breakdown, net revenue & ledger analytics',
        }
      : location.pathname.startsWith('/settings')
      ? {
          title: 'Settings',
          subtitle: 'Store configuration, tax rates & preferences',
        }
      : {
          title: 'Dashboard',
          subtitle: 'Welcome back!',
        });

  return (
    <div className="min-h-screen lg:h-screen lg:max-h-screen bg-[#ECEEF2] flex font-sans antialiased text-slate-900 p-3.5 sm:p-4 lg:p-4.5 gap-3.5 sm:gap-4 lg:gap-4.5 overflow-x-hidden lg:overflow-hidden">
      {/* Real-time Order & Alert Notification Toast */}
      <ToastNotification />

      {/* Left Sidebar (Aligned evenly on top, bottom, and sides) */}
      <Sidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Right Main Content Area (Equal margins, identical top and bottom alignment) */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* 1. TOP NAVBAR FLOATING WHITE CARD */}
        <header className="bg-white rounded-2xl px-5 py-3 border border-slate-200/70 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center justify-between shrink-0 mb-3.5">
          {/* Left: Mobile Trigger + Section Title & Subtitle */}
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Menu */}
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                setIsMobileSidebarOpen(true);
              }}
              className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors shrink-0 outline-none focus:outline-none focus-visible:outline-none focus:ring-0"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Mobile Brand Icon */}
            <div className="flex lg:hidden items-center gap-2 mr-1 shrink-0">
              <div className="w-7 h-7 rounded-lg bg-[#FF5C28] flex items-center justify-center text-white shadow-xs">
                <ChefHat className="w-4 h-4" />
              </div>
            </div>

            {/* Section Title & Subtitle */}
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-800 leading-tight">
                {currentSection.title}
              </h1>
              <p className="text-xs font-normal text-slate-400 mt-0.5">
                {currentSection.subtitle}
              </p>
            </div>
          </div>

          {/* Right: Notification Center & Quick Settings */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            {/* Real-time Notification Center */}
            <NotificationDropdown />

            {/* Quick Settings Gear Icon */}
            <NavLink
              to="/settings"
              aria-label="Quick Settings"
              onClick={(e) => {
                e.currentTarget.blur();
              }}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer outline-none focus:outline-none focus-visible:outline-none focus:ring-0"
            >
              <Settings className="w-5 h-5" />
            </NavLink>
          </div>
        </header>

        {/* Section Viewport */}
        <main className="flex-1 overflow-y-auto pr-0.5 pb-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300/80 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;

