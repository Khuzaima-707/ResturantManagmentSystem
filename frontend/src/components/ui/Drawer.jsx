import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Reusable Right Slide-in Drawer
 * Used for POS Current Order cart, item detail drawer, etc.
 */
export const Drawer = ({
  isOpen,
  onClose,
  title,
  subtitle,
  badge,
  children,
  footer,
  width = 'max-w-md', // 'max-w-sm' | 'max-w-md' | 'max-w-lg' | 'max-w-xl'
  className,
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
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            'w-screen bg-white shadow-2xl border-l border-slate-200 flex flex-col transform transition-transform duration-300 ease-in-out',
            width,
            className
          )}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                {title}
              </h3>
              {badge}
            </div>

            <div className="flex items-center gap-1">
              {subtitle && (
                <span className="text-xs text-slate-400 mr-2">{subtitle}</span>
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-5 flex-1 overflow-y-auto">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="p-5 bg-slate-50/80 border-t border-slate-100 shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Drawer;
