import React from 'react';
import { cn } from '../../utils/cn';

/**
 * Reusable Tabs Component
 * Supports both underline tabs (Menu/Reports) and pill tabs (POS category filter)
 */
export const Tabs = ({
  tabs = [],
  activeTab,
  onChange,
  variant = 'line', // 'line' | 'pills'
  className,
  tabClassName,
}) => {
  return (
    <div
      className={cn(
        variant === 'line'
          ? 'flex items-center gap-2 sm:gap-3.5 lg:gap-5 border-b border-slate-200 overflow-x-auto scrollbar-none whitespace-nowrap'
          : 'flex items-center gap-2 overflow-x-auto py-1 scrollbar-none',
        className
      )}
    >
      {tabs.map((tab) => {
        const id = tab.id ?? tab.value ?? tab;
        const label = tab.label ?? tab.name ?? tab;
        const count = tab.count;
        const isActive = activeTab === id;

        if (variant === 'pills') {
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={cn(
                'px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer shrink-0',
                isActive
                  ? 'bg-[#FF5C28] text-white shadow-sm shadow-orange-500/20'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50',
                tabClassName
              )}
            >
              {label}
              {count !== undefined && (
                <span
                  className={cn(
                    'ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]',
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        }

        // Underline variant
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn(
              'pb-3 text-xs sm:text-[13px] lg:text-sm font-semibold transition-all duration-150 relative cursor-pointer shrink-0',
              isActive
                ? 'text-[#FF5C28]'
                : 'text-slate-500 hover:text-slate-800',
              tabClassName
            )}
          >
            <span>{label}</span>
            {count !== undefined && (
              <span className="ml-1.5 text-xs text-slate-400 font-normal">({count})</span>
            )}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF5C28] rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
