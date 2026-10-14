import React from 'react';
import { PackageOpen } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Reusable Empty State Component
 */
export const EmptyState = ({
  icon: Icon = PackageOpen,
  title = 'No items found',
  description = 'Get started by creating a new record or adjusting your filters.',
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)]',
        className
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF5C28] mb-4">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-base font-bold text-slate-800 tracking-tight mb-1">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-slate-500 max-w-sm mb-5">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
};

export default EmptyState;
