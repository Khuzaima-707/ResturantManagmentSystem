import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Reusable Modal Component
 * Matches the reference design modal ("Add New Food Item")
 */
export const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  children,
  footer,
  headerRight = null,
  hideCloseButton = false,
  maxWidth = 'max-w-lg', // 'max-w-sm' | 'max-w-md' | 'max-w-lg' | 'max-w-xl' | 'max-w-2xl'
  className,
  hideHeaderBorder = false,
  bodyClassName = '',
  headerClassName = '',
  footerClassName = '',
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative w-full bg-white rounded-3xl border border-slate-200/80 shadow-[0_20px_40px_-15px_rgba(15,23,42,0.15)] z-10 overflow-hidden flex flex-col max-h-[96vh]',
          maxWidth,
          className
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'flex items-center justify-between gap-3 shrink-0',
            hideHeaderBorder ? 'px-6 pt-4 pb-1' : 'px-4 sm:px-6 py-4 border-b border-slate-100',
            headerClassName
          )}
        >
          <div className="flex items-center gap-3 shrink-0">
            {Icon && (
              <div className="w-8 h-8 rounded-full bg-[#FF5C28] text-white flex items-center justify-center shrink-0 shadow-sm">
                <Icon className="w-4 h-4 stroke-[2.5]" />
              </div>
            )}
            <div>
              {title && (
                <h3 className="text-base font-bold text-slate-900 tracking-tight whitespace-nowrap">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {headerRight}
            {!hideCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer shrink-0"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Body */}
        <div className={cn('p-4 sm:p-6 overflow-y-auto flex-1', bodyClassName)}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className={cn(
              'px-4.5 sm:px-6 py-3 sm:py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-end gap-3',
              footerClassName
            )}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
