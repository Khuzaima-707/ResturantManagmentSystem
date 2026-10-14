import React from 'react';
import { cn } from '../../utils/cn';

export const Card = ({
  children,
  className,
  hover = false,
  ...props
}) => {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02),0_2px_8px_-2px_rgba(15,23,42,0.03)] transition-all duration-200',
        hover && 'hover:shadow-[0_4px_12px_-2px_rgba(15,23,42,0.08)] hover:border-slate-300/80',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className, ...props }) => (
  <div className={cn('p-5 pb-3 flex flex-col gap-1', className)} {...props}>
    {children}
  </div>
);

export const CardTitle = ({ children, className, ...props }) => (
  <h3 className={cn('text-base font-bold text-slate-900 tracking-tight', className)} {...props}>
    {children}
  </h3>
);

export const CardDescription = ({ children, className, ...props }) => (
  <p className={cn('text-xs text-slate-500 font-normal', className)} {...props}>
    {children}
  </p>
);

export const CardContent = ({ children, className, ...props }) => (
  <div className={cn('p-5 pt-2', className)} {...props}>
    {children}
  </div>
);

export const CardFooter = ({ children, className, ...props }) => (
  <div className={cn('p-5 pt-3 border-t border-slate-100 flex items-center justify-between', className)} {...props}>
    {children}
  </div>
);

export default Card;
