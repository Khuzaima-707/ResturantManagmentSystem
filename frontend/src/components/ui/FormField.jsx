import React from 'react';
import { cn } from '../../utils/cn';

/**
 * FormField wrapper for consistent label, required indicator, error text and helper notes
 */
export const FormField = ({
  label,
  required = false,
  error,
  hint,
  children,
  className,
  id,
}) => {
  return (
    <div className={cn('flex flex-col gap-1.5 w-full', className)}>
      {label && (
        <label
          htmlFor={id}
          className="text-xs font-semibold text-slate-700 flex items-center gap-1 select-none"
        >
          <span>{label}</span>
          {required && <span className="text-[#FF5C28] text-sm leading-none">*</span>}
        </label>
      )}

      {children}

      {error ? (
        <p className="text-[11px] font-medium text-rose-600 mt-0.5">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>
      ) : null}
    </div>
  );
};

export default FormField;
