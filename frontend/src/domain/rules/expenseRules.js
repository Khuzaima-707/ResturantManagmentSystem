/**
 * Expense Domain Rules & Calculations
 * Pure, regression-locked accounting rules for Standalone Expense Management.
 *
 * CRITICAL REGRESSION RULE:
 * - Expenses NEVER modify Total Sale, Net Revenue, Tax, Total Collected, Outstanding Due,
 *   Order Count, Items Sold, Discounts, Reversal Totals, or COGS.
 * - Gross Profit = Net Revenue - COGS (UNCHANGED)
 * - Operating Profit = Gross Profit - Active Operating Expenses
 * - Voided expenses contribute ZERO to active totals and ZERO to Operating Profit.
 */
import { isWithinInterval, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from 'date-fns';

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Rent',
  'Electricity',
  'Gas',
  'Staff Salary',
  'Internet',
  'Maintenance',
  'Cleaning',
  'Delivery / Fuel',
  'Marketing',
  'Kitchen Supplies',
  'Office Supplies',
  'Repair',
  'Other',
];

export const ALLOWED_PAYMENT_METHODS = ['Cash', 'Online'];

/**
 * Checks if an expense is in VOIDED status
 */
export function isVoidedExpense(expense) {
  if (!expense) return false;
  return String(expense.status || '').toUpperCase() === 'VOIDED';
}

/**
 * Checks if an expense is ACTIVE (non-voided)
 */
export function isActiveExpense(expense) {
  return !isVoidedExpense(expense);
}

/**
 * Checks if payment method is Cash
 */
export function isCashExpense(expense) {
  if (!expense) return false;
  return String(expense.paymentMethod || '').trim().toUpperCase() === 'CASH';
}

/**
 * Checks if payment method is Online
 */
export function isOnlineExpense(expense) {
  if (!expense) return false;
  return String(expense.paymentMethod || '').trim().toUpperCase() === 'ONLINE';
}

/**
 * Pure validation for Expense creation and updates
 */
export function validateExpensePayload(payload) {
  const errors = {};

  if (!payload) {
    return { isValid: false, errors: { general: 'Expense payload is required' } };
  }

  // 1. Amount validation
  const amount = Number(payload.amount);
  if (isNaN(amount) || amount <= 0) {
    errors.amount = 'Amount must be a valid number greater than zero';
  }

  // 2. Category validation
  if (!payload.category || !String(payload.category).trim()) {
    errors.category = 'Category is required';
  }

  // 3. Payment Method validation (ONLY Cash or Online)
  const pm = String(payload.paymentMethod || '').trim();
  const pmUpper = pm.toUpperCase();
  if (pmUpper !== 'CASH' && pmUpper !== 'ONLINE') {
    errors.paymentMethod = 'Payment Method must be either Cash or Online';
  }

  // 4. Online Method validation (conditional)
  if (pmUpper === 'ONLINE') {
    const onlineMethod = String(payload.onlineMethodSnapshot || '').trim();
    if (!onlineMethod) {
      errors.onlineMethodSnapshot = 'Online Method / Account is required for online payments';
    }
  }

  // 5. Expense Date validation
  if (payload.expenseDate) {
    const d = new Date(payload.expenseDate);
    if (isNaN(d.getTime())) {
      errors.expenseDate = 'Invalid expense date';
    }
  }

  const errorList = Object.values(errors);

  return {
    isValid: errorList.length === 0,
    errors,
    errorList,
  };
}

/**
 * Returns the local date string in YYYY-MM-DD format based on user's local timezone.
 * Unlike date.toISOString().split('T')[0], this never shifts the date across midnight.
 */
export function getLocalExpenseDateString(date = new Date()) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Converts a YYYY-MM-DD local date string or date value into an ISO string
 * that preserves the user's local day and time.
 */
export function toLocalExpenseIsoString(dateVal) {
  if (!dateVal) return new Date().toISOString();
  if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateVal.trim())) {
    const [year, month, day] = dateVal.trim().split('-').map(Number);
    const now = new Date();
    // Use local year, month, day with current local time
    const localD = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());
    return localD.toISOString();
  }
  const d = new Date(dateVal);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

/**
 * Formats an expense date for display (e.g. "Oct 22, 2026").
 * Corrects for timezone offsets so calendar dates (like YYYY-MM-DD or UTC-midnight)
 * are always displayed as the exact date intended.
 */
export function formatExpenseDisplayDate(dateVal, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
  if (!dateVal) return 'N/A';
  if (typeof dateVal === 'string') {
    // If it's a date-only string or UTC-midnight string like 2026-10-22 or 2026-10-22T00:00:00...
    if (/^\d{4}-\d{2}-\d{2}(T00:00:00(\.000)?Z?)?$/.test(dateVal.trim())) {
      const [year, month, day] = dateVal.trim().slice(0, 10).split('-').map(Number);
      const localD = new Date(year, month - 1, day);
      return localD.toLocaleDateString(undefined, options);
    }
  }
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString(undefined, options);
}

/**
 * Resolves Date interval for standard RMS filter presets
 */
export function resolveExpenseDateInterval(preset = 'All Dates', customRange = null, refDate = new Date()) {
  const now = refDate instanceof Date ? refDate : new Date(refDate);

  switch (preset) {
    case 'Today':
      return { start: startOfDay(now), end: endOfDay(now) };
    case 'Yesterday': {
      const y = subDays(now, 1);
      return { start: startOfDay(y), end: endOfDay(y) };
    }
    case 'This Week':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfDay(now) };
    case 'Last Week': {
      const lastWeekRef = subDays(now, 7);
      return {
        start: startOfWeek(lastWeekRef, { weekStartsOn: 1 }),
        end: endOfWeek(lastWeekRef, { weekStartsOn: 1 }),
      };
    }
    case 'This Month':
      return { start: startOfMonth(now), end: endOfDay(now) };
    case 'Last Month': {
      const lastMonthRef = new Date(now.getFullYear(), now.getMonth() - 1, 15);
      return {
        start: startOfMonth(lastMonthRef),
        end: endOfMonth(lastMonthRef),
      };
    }
    case 'Custom Range':
    case 'Custom': {
      if (customRange?.start && customRange?.end) {
        const s = typeof customRange.start === 'string' ? parseISO(customRange.start) : new Date(customRange.start);
        const e = typeof customRange.end === 'string' ? parseISO(customRange.end) : new Date(customRange.end);
        if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
          return { start: startOfDay(s), end: endOfDay(e) };
        }
      }
      return null;
    }
    case 'All Dates':
    default:
      return null;
  }
}

/**
 * Filters an expense array by date, category, payment method, status and search query
 */
export function filterExpenses(expenses = [], filters = {}) {
  if (!Array.isArray(expenses)) return [];

  const {
    datePreset = 'All Dates',
    customRange = null,
    category = 'All',
    paymentMethod = 'All',
    status = 'All',
    search = '',
    searchQuery = '',
    referenceDate = new Date(),
  } = filters;

  const dateInterval = resolveExpenseDateInterval(datePreset, customRange, referenceDate);
  const searchParam = searchQuery || search || '';
  const searchLower = String(searchParam).trim().toLowerCase();
  const categoryFilter = String(category || 'All').trim();
  const pmFilter = String(paymentMethod || 'All').trim().toUpperCase();
  const statusFilter = String(status || 'All').trim().toUpperCase();

  return expenses.filter((exp) => {
    if (!exp) return false;

    // 1. Status Filter
    const isVoided = isVoidedExpense(exp);
    if (statusFilter === 'ACTIVE' && isVoided) return false;
    if (statusFilter === 'VOIDED' && !isVoided) return false;

    // 2. Category Filter
    if (categoryFilter !== 'All' && categoryFilter !== 'all') {
      const expCat = String(exp.category || exp.categoryNameSnapshot || '').trim();
      if (expCat.toLowerCase() !== categoryFilter.toLowerCase()) return false;
    }

    // 3. Payment Method Filter
    if (pmFilter !== 'ALL') {
      const expPm = String(exp.paymentMethod || '').trim().toUpperCase();
      if (expPm !== pmFilter) return false;
    }

    // 4. Date Filter
    if (dateInterval) {
      const rawDate = exp.expenseDate || exp.date || exp.createdAt;
      if (!rawDate) return false;
      let d;
      if (typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}(T00:00:00(\.000)?Z?)?$/.test(rawDate.trim())) {
        const [year, month, day] = rawDate.trim().slice(0, 10).split('-').map(Number);
        d = new Date(year, month - 1, day, 12, 0, 0); // Noon local time to avoid timezone edge boundary
      } else {
        d = typeof rawDate === 'string' ? parseISO(rawDate) : new Date(rawDate);
      }
      if (isNaN(d.getTime())) return false;
      if (!isWithinInterval(d, dateInterval)) return false;
    }

    // 5. Search Filter (Description, Reference, Online Method, Category, Paid To)
    if (searchLower) {
      const desc = String(exp.description || exp.title || exp.note || '').toLowerCase();
      const ref = String(exp.referenceNumber || exp.receiptNumber || '').toLowerCase();
      const onlineMethod = String(exp.onlineMethodSnapshot || '').toLowerCase();
      const cat = String(exp.category || '').toLowerCase();
      const paidTo = String(exp.paidTo || '').toLowerCase();

      const matches =
        desc.includes(searchLower) ||
        ref.includes(searchLower) ||
        onlineMethod.includes(searchLower) ||
        cat.includes(searchLower) ||
        paidTo.includes(searchLower);

      if (!matches) return false;
    }

    return true;
  });
}

/**
 * Calculates summary cards and breakdown metrics from an expense set.
 * Stricly counts only ACTIVE expenses in totals.
 */
export function calculateExpenseSummary(expenses = []) {
  if (!Array.isArray(expenses)) {
    return {
      totalExpenses: 0,
      cashExpenses: 0,
      onlineExpenses: 0,
      expenseEntries: 0,
      voidedEntries: 0,
      categoryBreakdown: {},
      paymentMethodBreakdown: { Cash: 0, Online: 0 },
    };
  }

  let totalExpenses = 0;
  let cashExpenses = 0;
  let onlineExpenses = 0;
  let expenseEntries = 0;
  let voidedEntries = 0;
  const categoryBreakdown = {};

  expenses.forEach((e) => {
    if (!e) return;
    if (isVoidedExpense(e)) {
      voidedEntries += 1;
      return;
    }

    expenseEntries += 1;
    const amt = Math.round((Number(e.amount) || 0) * 100) / 100;
    totalExpenses += amt;

    if (isCashExpense(e)) {
      cashExpenses += amt;
    } else if (isOnlineExpense(e)) {
      onlineExpenses += amt;
    }

    const cat = String(e.category || e.categoryNameSnapshot || 'Other').trim() || 'Other';
    categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + amt;
  });

  return {
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    cashExpenses: Math.round(cashExpenses * 100) / 100,
    onlineExpenses: Math.round(onlineExpenses * 100) / 100,
    expenseEntries,
    voidedEntries,
    activeCount: expenseEntries,
    voidedCount: voidedEntries,
    categoryBreakdown,
    paymentMethodBreakdown: {
      Cash: Math.round(cashExpenses * 100) / 100,
      Online: Math.round(onlineExpenses * 100) / 100,
    },
  };
}

/**
 * Calculates Operating Profit:
 * Operating Profit = Gross Profit - Active Operating Expenses
 *
 * Can safely produce negative numbers if Expenses > Gross Profit.
 */
export function calculateOperatingProfit(grossProfit = 0, operatingExpenses = 0, netRevenue = 0) {
  const gp = Number(grossProfit) || 0;
  const opex = Number(operatingExpenses) || 0;
  const operatingProfit = Math.round((gp - opex) * 100) / 100;

  const rev = Number(netRevenue) || 0;
  const operatingMargin = rev > 0 ? Number(((operatingProfit / rev) * 100).toFixed(2)) : 0;

  return {
    grossProfit: gp,
    operatingExpenses: opex,
    operatingProfit,
    operatingMargin,
    isProfitable: operatingProfit >= 0,
  };
}

/**
 * Evaluates whether an expense record is visible to the given user based on strict ownership rules:
 * - Admin: sees all expenses created across the restaurant by all users.
 * - Cashier: sees ONLY expenses entered by that logged-in cashier.
 *   MUST NOT see Admin-created expenses.
 *   MUST NOT see another cashier's expenses.
 *   Never determine ownership from display name only.
 */
export function isExpenseVisibleToUser(expense, user) {
  if (!expense || !user) return false;

  const userRole = String(user.role || '').toLowerCase();
  const userUsername = String(user.username || '').toLowerCase();
  const isAdmin = userRole.includes('admin') || userUsername === 'admin';
  if (isAdmin) {
    return true;
  }

  const currentUserId = String(user.id || (user.username ? `user_${user.username}` : '')).trim();
  if (!currentUserId) return false;

  const creatorUserId = String(expense.createdByUserId || '').trim();
  const creatorRole = String(expense.createdByRole || '').toLowerCase();

  // If expense was created by an admin, cashier must NEVER see it
  if (creatorRole === 'admin') {
    return false;
  }

  // Strictly match against logged-in cashier's unique user ID
  if (creatorUserId) {
    return creatorUserId === currentUserId;
  }

  return false;
}

/**
 * Filters an expense array by role-based ownership.
 */
export function filterExpensesByOwnership(expenses = [], user = null) {
  if (!Array.isArray(expenses)) return [];
  if (!user) return [];
  return expenses.filter((e) => isExpenseVisibleToUser(e, user));
}

