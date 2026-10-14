import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Reusable Select Dropdown Component
 */
export const Select = React.forwardRef(({
  options = [],
  value,
  onChange,
  placeholder,
  error,
  disabled,
  className,
  children,
  ...props
}, ref) => {
  return (
    <div className="relative w-full">
      <select
        ref={ref}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={cn(
          'w-full h-10 pl-3.5 pr-9 text-sm rounded-xl bg-white border text-slate-800 transition-all duration-150 appearance-none cursor-pointer',
          'border-slate-200 focus:outline-none focus:border-[#FF5C28] focus:ring-2 focus:ring-[#FF5C28]/20',
          'disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed',
          error && 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20',
          className
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.length > 0
          ? options.map((opt) => (
              <option key={opt.value ?? opt.id ?? opt} value={opt.value ?? opt.id ?? opt}>
                {opt.label ?? opt.name ?? opt}
              </option>
            ))
          : children}
      </select>
      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
        <ChevronDown className="w-4 h-4" />
      </div>
    </div>
  );
});

Select.displayName = 'Select';
export default Select;
