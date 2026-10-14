import React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Reusable Search Input Component
 * Matches the reference search bars in POS and Menu screens
 */
export const SearchInput = React.forwardRef(({
  value,
  onChange,
  onClear,
  placeholder = 'Search items (e.g. burger, pizza, drink...)',
  className,
  ...props
}, ref) => {
  return (
    <div className={cn('relative flex items-center w-full max-w-md', className)}>
      <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400">
        <Search className="w-4 h-4" />
      </div>
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full h-10 pl-10 pr-9 text-sm rounded-xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF5C28] focus:ring-2 focus:ring-[#FF5C28]/20 transition-all duration-150"
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={onClear || (() => onChange && onChange({ target: { value: '' } }))}
          className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
});

SearchInput.displayName = 'SearchInput';
export default SearchInput;
