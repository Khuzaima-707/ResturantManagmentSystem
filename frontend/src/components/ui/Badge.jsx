import React from 'react';
import { cn } from '../../utils/cn';

/**
 * Reusable Status & Category Badge
 * Supports dot indicators matching reference screenshots
 */
export const Badge = ({
  children,
  variant = 'neutral', // 'success' | 'warning' | 'danger' | 'brand' | 'neutral' | 'info'
  size = 'md',          // 'sm' | 'md'
  withDot = false,
  className,
}) => {
  const variants = {
    success: {
      container: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
      dot: 'bg-emerald-500',
    },
    warning: {
      container: 'bg-amber-50 text-amber-700 border-amber-200/70',
      dot: 'bg-amber-500',
    },
    danger: {
      container: 'bg-rose-50 text-rose-700 border-rose-200/70',
      dot: 'bg-rose-500',
    },
    brand: {
      container: 'bg-orange-50 text-[#FF5C28] border-orange-200',
      dot: 'bg-[#FF5C28]',
    },
    neutral: {
      container: 'bg-slate-100 text-slate-700 border-slate-200',
      dot: 'bg-slate-400',
    },
    info: {
      container: 'bg-blue-50 text-blue-700 border-blue-200/70',
      dot: 'bg-blue-500',
    },
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  const config = variants[variant] || variants.neutral;

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border leading-none whitespace-nowrap',
        config.container,
        sizes[size],
        className
      )}
    >
      {withDot && (
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', config.dot)} />
      )}
      <span>{children}</span>
    </span>
  );
};

export default Badge;
