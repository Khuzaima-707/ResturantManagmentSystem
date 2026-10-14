import React from 'react';
import { cn } from '../../utils/cn';

/**
 * Reusable Page Header Component
 * Matches the reference screenshot layout: Title + Subtitle on left, actions & controls on right.
 */
export const PageHeader = ({
  title,
  subtitle,
  actions,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6',
        className
      )}
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5">
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
