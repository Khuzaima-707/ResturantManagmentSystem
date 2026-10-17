import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  CheckCheck,
  Trash2,
  ShoppingBag,
  RotateCcw,
  Clock,
} from 'lucide-react';
import { useAppStore } from '../../store';
import { isNotificationVisibleToUser } from '../../domain/selectors/invoiceSelectors';

/**
 * Format relative time cleanly (e.g. Just now, 5m ago, 2h ago, or date)
 */
function formatTimeAgo(isoString) {
  if (!isoString) return 'Recently';
  try {
    const now = new Date();
    const date = new Date(isoString);
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch {
    return 'Recently';
  }
}

/**
 * NotificationDropdown Component
 * Real-time notification center next to Quick Settings.
 * Displays real notifications for orders and reversals.
 */
export const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const {
    notifications = [],
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotifications,
    user,
  } = useAppStore();

  const userNotifications = React.useMemo(() => {
    return (notifications || []).filter((n) => isNotificationVisibleToUser(n, user));
  }, [notifications, user]);

  const unreadCount = userNotifications.filter((n) => !n.read).length;

  // Close dropdown on click outside or Escape key
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button: Notification Bell with Dynamic Real-time Badge */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer select-none focus:outline-none"
        aria-label="View notifications"
        title="Notifications"
      >
        <Bell className="w-5 h-5 text-slate-500 hover:text-slate-800 transition-colors" />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-[#FF5C28] text-white text-[10px] font-bold min-w-4 h-4 px-1 rounded-full border-2 border-white flex items-center justify-center shadow-xs animate-in zoom-in-75 duration-150">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200/90 shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-900">Notifications</h3>
              {unreadCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-orange-100 text-[#FF5C28] text-[10px] font-bold">
                  {unreadCount} new
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-medium">
                  All read
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllNotificationsAsRead}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#FF5C28] hover:text-[#E04D1D] cursor-pointer"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
            {userNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center mx-auto mb-2 text-[#FF5C28]">
                  <Bell className="w-5 h-5 text-[#FF5C28]" />
                </div>
                <h4 className="font-bold text-xs text-slate-700">No notifications yet</h4>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[220px] mx-auto">
                  New orders will automatically appear here as sales are completed in the POS.
                </p>
              </div>
            ) : (
              userNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => markNotificationAsRead(notif.id)}
                  className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer select-none ${
                    notif.read ? 'bg-white hover:bg-slate-50/60' : 'bg-orange-50/30 hover:bg-orange-50/50'
                  }`}
                >
                  {/* Icon Indicator */}
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs ${
                      notif.type === 'reversal'
                        ? 'bg-rose-50 border-rose-100 text-rose-600'
                        : 'bg-[#FFF5F0] border-orange-100 text-[#FF5C28]'
                    }`}
                  >
                    {notif.type === 'reversal' ? (
                      <RotateCcw className="w-4 h-4" />
                    ) : (
                      <ShoppingBag className="w-4 h-4" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4
                        className={`text-xs truncate ${
                          notif.read ? 'font-semibold text-slate-700' : 'font-bold text-slate-900'
                        }`}
                      >
                        {notif.title}
                      </h4>
                      {!notif.read && (
                        <span
                          className="w-2 h-2 rounded-full bg-[#FF5C28] shrink-0"
                          title="Unread"
                        />
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {notif.description}
                    </p>

                    <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatTimeAgo(notif.timestamp)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {userNotifications.length > 0 && (
            <div className="p-2.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400 font-medium">
                {userNotifications.length} {userNotifications.length === 1 ? 'order update' : 'order updates'}
              </span>
              <button
                type="button"
                onClick={clearNotifications}
                className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-rose-600 font-medium cursor-pointer transition-colors"
                title="Clear all notifications"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear all</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
