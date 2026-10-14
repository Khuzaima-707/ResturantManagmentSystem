/**
 * Centralized Design System Tokens
 * Source of truth for Restaurant POS & Management System UI
 * Visual direction: Coral/Orange primary, pure white surfaces, light slate page bg,
 * dark navy/charcoal typography, rounded cards, subtle shadows & professional outline icons.
 */

export const tokens = {
  colors: {
    // Primary Brand (Coral / Orange accent)
    primary: {
      DEFAULT: '#FF5C28',
      hover: '#E64A19',
      active: '#D83F0E',
      light: '#FFF4EF',
      subtle: '#FFF8F5',
      border: '#FFD4C4',
      glow: 'rgba(255, 92, 40, 0.25)',
    },
    // Page & Surfaces
    page: {
      bg: '#F8FAFC',
    },
    surface: {
      DEFAULT: '#FFFFFF',
      muted: '#F8FAFC',
      subtle: '#F1F5F9',
      hover: '#F8FAFC',
      active: '#F1F5F9',
    },
    // Borders
    border: {
      DEFAULT: '#EEF2F6',
      subtle: '#F1F5F9',
      strong: '#E2E8F0',
      active: '#FF5C28',
      focus: '#FF5C28',
    },
    // Typography
    text: {
      primary: '#0F172A',
      secondary: '#475569',
      muted: '#64748B',
      subtle: '#94A3B8',
      inverse: '#FFFFFF',
    },
    // Semantic States
    status: {
      success: {
        text: '#059669',
        bg: '#ECFDF5',
        border: '#A7F3D0',
        dot: '#10B981',
      },
      warning: {
        text: '#D97706',
        bg: '#FFFBEB',
        border: '#FDE68A',
        dot: '#F59E0B',
      },
      danger: {
        text: '#DC2626',
        bg: '#FEF2F2',
        border: '#FECACA',
        dot: '#EF4444',
      },
      info: {
        text: '#2563EB',
        bg: '#EFF6FF',
        border: '#BFDBFE',
        dot: '#3B82F6',
      },
    },
  },

  typography: {
    fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
    sizes: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',      // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',   // 24px
      '3xl': '1.875rem', // 30px
    },
    weights: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
    },
    lineHeights: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
  },

  spacing: {
    1: '0.25rem',  // 4px
    2: '0.5rem',   // 8px
    2.5: '0.625rem', // 10px
    3: '0.75rem',  // 12px
    4: '1rem',     // 16px
    5: '1.25rem',  // 20px
    6: '1.5rem',   // 24px
    8: '2rem',     // 32px
    10: '2.5rem',  // 40px
    12: '3rem',    // 48px
  },

  radii: {
    sm: '0.375rem', // 6px
    md: '0.5rem',   // 8px
    lg: '0.75rem',  // 12px
    xl: '1rem',     // 16px
    '2xl': '1.25rem', // 20px
    full: '9999px',
  },

  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    card: '0 1px 3px rgba(0, 0, 0, 0.03), 0 2px 8px -2px rgba(15, 23, 42, 0.04)',
    cardHover: '0 4px 12px -2px rgba(15, 23, 42, 0.08)',
    dropdown: '0 10px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.06)',
    modal: '0 20px 35px -5px rgba(15, 23, 42, 0.15), 0 10px 15px -5px rgba(15, 23, 42, 0.08)',
    brandGlow: '0 4px 14px 0 rgba(255, 92, 40, 0.35)',
  },

  inputHeights: {
    sm: '2.25rem', // 36px
    md: '2.625rem', // 42px
    lg: '3rem',    // 48px
  },

  buttons: {
    heights: {
      sm: '2.25rem', // 36px
      md: '2.625rem', // 42px
      lg: '3rem',    // 48px
    },
    padding: {
      sm: '0.75rem',
      md: '1.125rem',
      lg: '1.5rem',
    },
  },

  iconSizes: {
    xs: 14,
    sm: 16,
    md: 18,
    lg: 20,
    xl: 24,
    '2xl': 28,
  },
};

export default tokens;
