import React, { useEffect, useState } from 'react';
import { CheckCircle2, ShoppingBag, X, Bell } from 'lucide-react';
import { useAppStore } from '../../store';

/**
 * Plays a gentle, pleasant pos notification chime using native Web Audio API
 */
export function playNotificationSound() {
  try {
    if (typeof window === 'undefined') return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {}
}

export const ToastNotification = () => {
  const { activeToast, dismissToast } = useAppStore();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (activeToast) {
      setIsVisible(true);
      playNotificationSound();

      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          dismissToast?.();
        }, 300);
      }, 4500);

      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [activeToast, dismissToast]);

  if (!activeToast && !isVisible) return null;

  return (
    <div
      className={`fixed top-4 right-4 sm:top-5 sm:right-6 z-[9999] transition-all duration-300 ease-out select-none ${
        isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-3 scale-95 pointer-events-none'
      }`}
    >
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-[0_12px_32px_rgba(0,0,0,0.12)] flex items-start gap-3.5 max-w-[360px] min-w-[300px]">
        {/* Glow Status Icon */}
        <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#FF5C28] shrink-0 shadow-2xs">
          <ShoppingBag className="w-5 h-5 text-[#FF5C28]" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
              {activeToast?.title || 'New Notification'}
            </h4>
          </div>
          <p className="text-xs font-medium text-slate-500 mt-0.5 leading-snug">
            {activeToast?.description || 'Action completed successfully.'}
          </p>
          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400 font-semibold">
            <span>Just now</span>
            <span>•</span>
            <span className="text-emerald-600 font-bold">Saved in Database</span>
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => dismissToast?.(), 200);
          }}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default ToastNotification;
