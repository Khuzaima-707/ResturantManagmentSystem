/**
 * Centralized formatting utilities
 * Provides consistent currency, number and date formatting across the system
 */
import { format, parseISO } from 'date-fns';

/**
 * Formats a monetary value into Pakistani Rupee representation
 * Example: 125000 -> "Rs 125,000"
 */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'Rs 0';
  }
  const rounded = Math.round(Number(amount));
  return `Rs ${rounded.toLocaleString('en-PK')}`;
}

/**
 * Formats a raw number with locale comma grouping
 * Example: 1250 -> "1,250"
 */
export function formatNumber(val) {
  if (val === null || val === undefined || isNaN(val)) {
    return '0';
  }
  return Number(val).toLocaleString();
}

/**
 * Formats an ISO date string or Date object into human-readable timestamp
 */
export function formatDateTime(dateInput, formatStr = 'dd MMM yyyy, hh:mm a') {
  if (!dateInput) return '';
  try {
    const d = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
    return format(d, formatStr);
  } catch {
    return String(dateInput);
  }
}

/**
 * Formats date into simple short date (e.g. "12 Oct")
 */
export function formatShortDate(dateInput) {
  return formatDateTime(dateInput, 'dd MMM');
}

/**
 * Formats percentage
 * Example: 24.5 -> "25%"
 */
export function formatPercent(val) {
  if (val === null || val === undefined || isNaN(val)) return '0%';
  return `${Math.round(Number(val))}%`;
}
