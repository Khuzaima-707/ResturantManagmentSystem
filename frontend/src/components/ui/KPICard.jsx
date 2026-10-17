import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Reusable KPI Card Component
 * Faithful to reference screenshots with color-coded icons, bold numbers and trend badges.
 */
export const KPICard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'orange', // 'orange' | 'green' | 'purple' | 'red' | 'blue' | 'amber'
  trend,            // e.g. { value: '47% Cleared', isPositive: true } or string
  showArrow = false,
  onClick,
  className,
  size = 'md',      // 'sm' | 'md'
}) => {
  const isSm = size === 'sm';
  const colorStyles = {
    orange: {
      bg: 'bg-orange-50 text-[#FF5C28]',
      border: 'border-orange-100',
      badge: 'text-orange-600 bg-orange-50',
    },
    green: {
      bg: 'bg-emerald-50 text-emerald-600',
      border: 'border-emerald-100',
      badge: 'text-emerald-700 bg-emerald-50',
    },
    purple: {
      bg: 'bg-purple-50 text-purple-600',
      border: 'border-purple-100',
      badge: 'text-purple-700 bg-purple-50',
    },
    red: {
      bg: 'bg-rose-50 text-rose-600',
      border: 'border-rose-100',
      badge: 'text-rose-700 bg-rose-50',
    },
    blue: {
      bg: 'bg-blue-50 text-blue-600',
      border: 'border-blue-100',
      badge: 'text-blue-700 bg-blue-50',
    },
    amber: {
      bg: 'bg-amber-50 text-amber-600',
      border: 'border-amber-100',
      badge: 'text-amber-700 bg-amber-50',
    },
  };

  const scheme = colorStyles[color] || colorStyles.orange;

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02),0_2px_8px_-2px_rgba(15,23,42,0.03)] transition-all duration-200',
        isSm ? 'p-2.5 sm:p-3 rounded-xl min-h-[72px]' : 'p-5 rounded-2xl min-h-[96px]',
        onClick && 'cursor-pointer hover:shadow-[0_4px_12px_-2px_rgba(15,23,42,0.08)] hover:border-slate-300',
        className
      )}
    >
      <div className={cn('flex items-center justify-between min-w-0 w-full', (trend || subtitle) ? (isSm ? 'mb-1.5' : 'mb-3') : 'mb-0')}>
        <div className={cn('flex items-center min-w-0 flex-1', isSm ? 'gap-2' : 'gap-3')}>
          {Icon && (
            <div
              className={cn(
                'flex items-center justify-center border shrink-0',
                isSm ? 'w-7 h-7 sm:w-8 sm:h-8 rounded-lg' : 'w-10 h-10 rounded-xl',
                scheme.bg,
                scheme.border
              )}
            >
              <Icon className={isSm ? 'w-3.5 h-3.5 sm:w-4 sm:h-4' : 'w-5 h-5'} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <span
              title={title}
              className={cn(
                'font-medium text-slate-500 block leading-snug break-words whitespace-normal',
                isSm ? 'text-[11px] sm:text-xs' : 'text-xs'
              )}
            >
              {title}
            </span>
            <div
              className={cn(
                'font-bold text-slate-900 tracking-tight leading-tight mt-1 whitespace-nowrap',
                isSm ? 'text-sm sm:text-base' : 'text-xl md:text-2xl'
              )}
            >
              {value}
            </div>
          </div>
        </div>
      </div>

      {(trend || subtitle) && (
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100/70 text-xs">
          {typeof trend === 'object' && trend !== null ? (
            <span className={cn('font-semibold inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md', trend.isPositive ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50')}>
              {trend.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {trend.value}
            </span>
          ) : trend ? (
            <span className={cn('font-semibold px-1.5 py-0.5 rounded-md', scheme.badge)}>
              {trend}
            </span>
          ) : null}
          {subtitle && <span className="text-slate-400">{subtitle}</span>}
        </div>
      )}
    </div>
  );
};

export default KPICard;
