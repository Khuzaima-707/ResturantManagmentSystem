import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Reusable Icon Button
 * Used for close buttons, header notifications, quick filters, cart badges
 */
export const IconButton = React.forwardRef(({
  icon: Icon,
  className,
  variant = 'ghost', // 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size = 'md',        // 'sm' | 'md' | 'lg'
  isLoading = false,
  disabled = false,
  type = 'button',
  ariaLabel,
  ...props
}, ref) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 select-none active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none cursor-pointer';

  const variants = {
    primary: 'bg-[#FF5C28] hover:bg-[#E64A19] active:bg-[#D83F0E] text-white focus:ring-[#FF5C28]/40 shadow-sm shadow-orange-500/20',
    secondary: 'bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-200 focus:ring-slate-200 shadow-sm',
    outline: 'bg-transparent hover:bg-orange-50 active:bg-orange-100 text-[#FF5C28] border border-[#FF5C28] focus:ring-[#FF5C28]/30',
    ghost: 'bg-transparent hover:bg-slate-100 active:bg-slate-200 text-slate-500 hover:text-slate-800 focus:ring-slate-200',
    danger: 'bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-600 focus:ring-rose-500/30',
  };

  const sizes = {
    sm: 'w-8 h-8 rounded-lg',
    md: 'w-10 h-10 rounded-xl',
    lg: 'w-11 h-11 rounded-xl',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <button
      ref={ref}
      type={type}
      aria-label={ariaLabel}
      disabled={disabled || isLoading}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {isLoading ? (
        <Loader2 className={cn('animate-spin', iconSizes[size])} />
      ) : Icon ? (
        <Icon className={iconSizes[size]} />
      ) : null}
    </button>
  );
});

IconButton.displayName = 'IconButton';
export default IconButton;
