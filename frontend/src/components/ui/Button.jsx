import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Reusable Button Component
 * Matches the orange/coral primary brand and subtle surfaces
 */
export const Button = React.forwardRef(({
  children,
  className,
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size = 'md',         // 'sm' | 'md' | 'lg'
  isLoading = false,
  disabled = false,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  type = 'button',
  ...props
}, ref) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 select-none active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 cursor-pointer';

  const variants = {
    primary: 'bg-[#FF5C28] hover:bg-[#E64A19] active:bg-[#D83F0E] text-white focus:ring-[#FF5C28]/40 shadow-sm shadow-orange-500/20',
    secondary: 'bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-200 focus:ring-slate-200 shadow-sm',
    outline: 'bg-transparent hover:bg-orange-50 active:bg-orange-100 text-[#FF5C28] border border-[#FF5C28] focus:ring-[#FF5C28]/30',
    ghost: 'bg-transparent hover:bg-slate-100 active:bg-slate-200 text-slate-600 hover:text-slate-900 focus:ring-slate-200',
    danger: 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white focus:ring-rose-500/40 shadow-sm shadow-rose-500/20',
  };

  const sizes = {
    sm: 'text-[11px] h-7 px-2.5 rounded-full gap-1 font-medium',
    md: 'text-xs h-8 px-3.5 rounded-full gap-1.5 font-semibold',
    lg: 'text-xs h-9 px-4 rounded-full gap-2 font-semibold',
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : LeftIcon ? (
        <LeftIcon className="w-4 h-4 shrink-0" />
      ) : null}
      <span>{children}</span>
      {!isLoading && RightIcon && <RightIcon className="w-4 h-4 shrink-0" />}
    </button>
  );
});

Button.displayName = 'Button';
export default Button;
