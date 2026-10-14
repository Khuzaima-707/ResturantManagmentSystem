import React from 'react';
import { cn } from '../../utils/cn';

/**
 * Reusable Form Input
 */
export const Input = React.forwardRef(({
  className,
  type = 'text',
  error,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  disabled,
  ...props
}, ref) => {
  return (
    <div className="relative w-full">
      {LeftIcon && (
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <LeftIcon className="w-4 h-4" />
        </div>
      )}
      <input
        ref={ref}
        type={type}
        disabled={disabled}
        className={cn(
          'w-full h-10 px-3.5 text-sm rounded-xl bg-white border text-slate-900 placeholder:text-slate-400 transition-all duration-150',
          'border-slate-200 focus:outline-none focus:border-[#FF5C28] focus:ring-2 focus:ring-[#FF5C28]/20',
          'disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed',
          LeftIcon && 'pl-10',
          RightIcon && 'pr-10',
          error && 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20',
          className
        )}
        {...props}
      />
      {RightIcon && (
        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
          <RightIcon className="w-4 h-4" />
        </div>
      )}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
