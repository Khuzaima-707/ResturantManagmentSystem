import React from 'react';
import { cn } from '../../utils/cn';

/**
 * Reusable Design System Toggle / Switch Component
 */
export const Toggle = ({
  checked = false,
  onChange,
  disabled = false,
  label,
  description,
  id,
  className,
}) => {
  const handleClick = () => {
    if (!disabled && typeof onChange === 'function') {
      onChange(!checked);
    }
  };

  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      {(label || description) && (
        <div className="flex flex-col select-none cursor-pointer" onClick={handleClick}>
          {label && (
            <span className="text-xs font-semibold text-slate-800 leading-snug">
              {label}
            </span>
          )}
          {description && (
            <span className="text-[11px] text-slate-400 mt-0.5 leading-normal">
              {description}
            </span>
          )}
        </div>
      )}

      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={handleClick}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#FF5C28]/20',
          checked ? 'bg-[#FF5C28]' : 'bg-slate-200',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out',
            checked ? 'translate-x-4' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  );
};

export default Toggle;
