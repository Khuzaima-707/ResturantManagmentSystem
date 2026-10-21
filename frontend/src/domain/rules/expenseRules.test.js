import { describe, it, expect } from 'vitest';
import {
  isVoidedExpense,
  isActiveExpense,
  isCashExpense,
  isOnlineExpense,
  validateExpensePayload,
  filterExpenses,
  calculateExpenseSummary,
  calculateOperatingProfit,
  isExpenseVisibleToUser,
  filterExpensesByOwnership,
} from './expenseRules';
import { deriveFinancialSummaryReport } from '../selectors/reportSelectors';

describe('Expense Domain Rules & Regression Safety', () => {
  const sampleExpenses = [
    {
      id: 'exp-1',
      expenseDate: '2026-10-21T10:00:00.000Z',
      categoryId: 'Utilities',
      category: 'Electricity',
      categoryNameSnapshot: 'Electricity',
      amount: 5000,
      paymentMethod: 'Cash',
      status: 'ACTIVE',
      description: 'Electricity bill October',
      referenceNumber: 'ELEC-1001',
      createdByName: 'Admin',
    },
    {
      id: 'exp-2',
      expenseDate: '2026-10-21T11:00:00.000Z',
      categoryId: 'Utilities',
      category: 'Gas',
      categoryNameSnapshot: 'Gas',
      amount: 3000,
      paymentMethod: 'Online',
      onlineMethodSnapshot: 'JazzCash',
      status: 'ACTIVE',
      description: 'Gas cylinder delivery',
      referenceNumber: 'GAS-442',
      createdByName: 'Admin',
    },
    {
      id: 'exp-3',
      expenseDate: '2026-10-20T09:00:00.000Z',
      categoryId: 'Salaries',
      category: 'Staff Salary',
      categoryNameSnapshot: 'Staff Salary',
      amount: 15000,
      paymentMethod: 'Online',
      onlineMethodSnapshot: 'Meezan Bank',
      status: 'ACTIVE',
      description: 'Chef advance',
      referenceNumber: 'SAL-01',
      createdByName: 'Admin',
    },
    {
      id: 'exp-4',
      expenseDate: '2026-10-19T14:00:00.000Z',
      categoryId: 'Maintenance',
      category: 'Repair',
      categoryNameSnapshot: 'Repair',
      amount: 2500,
      paymentMethod: 'Cash',
      status: 'VOIDED',
      voidReason: 'Duplicate invoice entered accidentally',
      voidedByName: 'Admin',
      description: 'Kitchen exhaust fan repair',
      referenceNumber: 'REP-99',
      createdByName: 'Admin',
    },
    {
      id: 'exp-5',
      expenseDate: '2026-10-15T12:00:00.000Z',
      categoryId: 'Supplies',
      category: 'Kitchen Supplies',
      categoryNameSnapshot: 'Kitchen Supplies',
      amount: 4000,
      paymentMethod: 'Online',
      onlineMethodSnapshot: 'Easypaisa',
      status: 'ACTIVE',
      description: 'Paper packaging supplies',
      referenceNumber: 'SUP-55',
      createdByName: 'Admin',
    },
  ];

  describe('1. Active vs Voided Checks', () => {
    it('accurately identifies active and voided records', () => {
      expect(isActiveExpense(sampleExpenses[0])).toBe(true);
      expect(isVoidedExpense(sampleExpenses[0])).toBe(false);

      expect(isActiveExpense(sampleExpenses[3])).toBe(false);
      expect(isVoidedExpense(sampleExpenses[3])).toBe(true);
    });

    it('accurately classifies Cash vs Online expenses', () => {
      expect(isCashExpense(sampleExpenses[0])).toBe(true);
      expect(isOnlineExpense(sampleExpenses[0])).toBe(false);

      expect(isCashExpense(sampleExpenses[1])).toBe(false);
      expect(isOnlineExpense(sampleExpenses[1])).toBe(true);
    });
  });

  describe('2. Validation Rules', () => {
    it('requires positive amount and rejects zero or negative', () => {
      const zeroCheck = validateExpensePayload({
        amount: 0,
        category: 'Rent',
        paymentMethod: 'Cash',
      });
      expect(zeroCheck.isValid).toBe(false);
      expect(zeroCheck.errors.amount).toBeDefined();

      const negCheck = validateExpensePayload({
        amount: -100,
        category: 'Rent',
        paymentMethod: 'Cash',
      });
      expect(negCheck.isValid).toBe(false);
      expect(negCheck.errors.amount).toBeDefined();
    });

    it('requires Online Method when payment method is Online', () => {
      const missingOnlineMethod = validateExpensePayload({
        amount: 2000,
        category: 'Internet',
        paymentMethod: 'Online',
        onlineMethodSnapshot: '',
      });
      expect(missingOnlineMethod.isValid).toBe(false);
      expect(missingOnlineMethod.errors.onlineMethodSnapshot).toBeDefined();

      const validOnline = validateExpensePayload({
        amount: 2000,
        category: 'Internet',
        paymentMethod: 'Online',
        onlineMethodSnapshot: 'JazzCash',
      });
      expect(validOnline.isValid).toBe(true);
    });

    it('accepts custom free-text online methods (JazzCash, Easypaisa, Meezan, Custom Bank)', () => {
      ['JazzCash', 'Easypaisa', 'Meezan Bank', 'HBL Corporate Account', 'Owner Wallet'].forEach(
        (method) => {
          const res = validateExpensePayload({
            amount: 1500,
            category: 'Marketing',
            paymentMethod: 'Online',
            onlineMethodSnapshot: method,
          });
          expect(res.isValid).toBe(true);
        }
      );
    });
  });

  describe('3. Summary Calculations & Void Exclusion', () => {
    it('calculates totals strictly excluding VOIDED expenses', () => {
      const summary = calculateExpenseSummary(sampleExpenses);

      // Active expenses:
      // exp-1: 5000 (Cash)
      // exp-2: 3000 (Online - JazzCash)
      // exp-3: 15000 (Online - Meezan)
      // exp-5: 4000 (Online - Easypaisa)
      // (exp-4 is VOIDED with 2500, MUST contribute ZERO)
      expect(summary.totalExpenses).toBe(27000);
      expect(summary.cashExpenses).toBe(5000);
      expect(summary.onlineExpenses).toBe(22000);
      expect(summary.activeCount).toBe(4);
      expect(summary.voidedCount).toBe(1);

      // Total reconciles exactly
      expect(summary.cashExpenses + summary.onlineExpenses).toBe(summary.totalExpenses);
    });
  });

  describe('4. Operating Profit Calculation', () => {
    it('computes Operating Profit = Gross Profit - Total Operating Expenses', () => {
      const grossProfit = 40000;
      const operatingExpenses = 25000;
      const res = calculateOperatingProfit(grossProfit, operatingExpenses, 100000);

      expect(res.operatingProfit).toBe(15000);
      expect(res.operatingMargin).toBe(15);
    });

    it('safely handles negative Operating Profit when Expenses > Gross Profit', () => {
      const grossProfit = 10000;
      const operatingExpenses = 15000;
      const res = calculateOperatingProfit(grossProfit, operatingExpenses, 100000);

      expect(res.operatingProfit).toBe(-5000);
      expect(res.operatingMargin).toBe(-5);
    });
  });

  describe('5. Filters: Date, Category, Payment, Status, Search', () => {
    it('filters by payment method', () => {
      const cashOnly = filterExpenses(sampleExpenses, { paymentMethod: 'Cash' });
      expect(cashOnly.every((e) => e.paymentMethod === 'Cash')).toBe(true);

      const onlineOnly = filterExpenses(sampleExpenses, { paymentMethod: 'Online' });
      expect(onlineOnly.every((e) => e.paymentMethod === 'Online')).toBe(true);
    });

    it('filters by status (Active vs Voided)', () => {
      const activeOnly = filterExpenses(sampleExpenses, { status: 'ACTIVE' });
      expect(activeOnly.length).toBe(4);
      expect(activeOnly.every((e) => e.status !== 'VOIDED')).toBe(true);

      const voidedOnly = filterExpenses(sampleExpenses, { status: 'VOIDED' });
      expect(voidedOnly.length).toBe(1);
      expect(voidedOnly[0].id).toBe('exp-4');
    });

    it('filters by category', () => {
      const gasOnly = filterExpenses(sampleExpenses, { category: 'Gas' });
      expect(gasOnly.length).toBe(1);
      expect(gasOnly[0].category).toBe('Gas');
    });

    it('searches by note, reference number, and online method', () => {
      const searchRef = filterExpenses(sampleExpenses, { searchQuery: 'ELEC-1001' });
      expect(searchRef.length).toBe(1);
      expect(searchRef[0].id).toBe('exp-1');

      const searchOnline = filterExpenses(sampleExpenses, { searchQuery: 'JazzCash' });
      expect(searchOnline.length).toBe(1);
      expect(searchOnline[0].id).toBe('exp-2');

      const searchNote = filterExpenses(sampleExpenses, { searchQuery: 'exhaust fan' });
      expect(searchNote.length).toBe(1);
      expect(searchNote[0].id).toBe('exp-4');
    });
  });

  describe('6. Critical Financial Regression Lock Verification', () => {
    const mockOrders = [
      {
        id: 'ord-101',
        invoiceNumber: 'INV-101',
        createdAt: '2026-10-21T12:00:00.000Z',
        completedAt: '2026-10-21T12:00:00.000Z',
        status: 'completed',
        subtotal: 1000,
        taxAmount: 160,
        discountAmount: 0,
        grandTotal: 1160,
        totalPaid: 1160,
        balanceDue: 0,
        paymentStatus: 'paid',
        paymentMethod: 'Cash',
        lines: [
          {
            itemId: 'item-1',
            itemNameSnapshot: 'Chicken Biryani',
            quantity: 2,
            unitPriceSnapshot: 500,
            costPriceSnapshot: 250, // COGS = 2 * 250 = 500
            total: 1000,
          },
        ],
      },
    ];

    const mockReversals = [];

    it('CONFIRMS that adding an expense NEVER modifies existing Sales, Revenue, Tax, Collected, COGS, or Gross Profit', () => {
      // 1. Calculate financial summary WITHOUT expenses
      const baseline = deriveFinancialSummaryReport(
        mockOrders,
        mockReversals,
        { datePreset: 'All Dates' },
        [],
        [],
        []
      );

      const baselineSales = baseline.statement.grossSales;
      const baselineRevenue = baseline.statement.netRevenue;
      const baselineTax = baseline.statement.taxCollected;
      const baselineCollected = baseline.statement.totalCollected;
      const baselineOutstanding = baseline.statement.totalOutstanding;
      const baselineCOGS = baseline.statement.totalCOGS;
      const baselineGrossProfit = baseline.statement.grossProfit;
      const baselineGrossMargin = baseline.statement.grossProfitMargin;

      // Baseline expectations:
      // Gross Sales: 1000
      // Net Revenue: 1000
      // Tax: 160
      // Total Collected: 1160
      // Outstanding: 0
      // COGS: 500
      // Gross Profit: 500
      // Operating Expenses: 0
      // Operating Profit: 500

      expect(baselineSales).toBe(1000);
      expect(baselineRevenue).toBe(1000);
      expect(baselineTax).toBe(160);
      expect(baselineCollected).toBe(1160);
      expect(baselineOutstanding).toBe(0);
      expect(baselineCOGS).toBe(500);
      expect(baselineGrossProfit).toBe(500);
      expect(baseline.statement.operatingExpenses).toBe(0);
      expect(baseline.statement.operatingProfit).toBe(500);

      // 2. Add an Operating Expense of Rs 200 Cash
      const testExpenses = [
        {
          id: 'exp-test',
          expenseDate: '2026-10-21T13:00:00.000Z',
          category: 'Electricity',
          categoryNameSnapshot: 'Electricity',
          amount: 200,
          paymentMethod: 'Cash',
          status: 'ACTIVE',
        },
      ];

      const withExpense = deriveFinancialSummaryReport(
        mockOrders,
        mockReversals,
        { datePreset: 'All Dates' },
        [],
        [],
        testExpenses
      );

      // STRICT REGRESSION ASSERTIONS:
      // Existing values MUST remain 100% IDENTICAL
      expect(withExpense.statement.grossSales).toBe(baselineSales);
      expect(withExpense.statement.netRevenue).toBe(baselineRevenue);
      expect(withExpense.statement.taxCollected).toBe(baselineTax);
      expect(withExpense.statement.totalCollected).toBe(baselineCollected);
      expect(withExpense.statement.totalOutstanding).toBe(baselineOutstanding);
      expect(withExpense.statement.totalCOGS).toBe(baselineCOGS);
      expect(withExpense.statement.grossProfit).toBe(baselineGrossProfit);
      expect(withExpense.statement.grossProfitMargin).toBe(baselineGrossMargin);

      // ONLY Operating Expenses and Operating Profit change:
      expect(withExpense.statement.operatingExpenses).toBe(200);
      expect(withExpense.statement.operatingProfit).toBe(300); // 500 - 200 = 300
    });
  });

  describe('6. Role Access & Final Ownership Scoping Rules', () => {
    const adminUser = {
      id: 'user_admin',
      username: 'admin',
      name: 'Admin Manager',
      role: 'admin',
    };

    const cashier1 = {
      id: 'user_cashier_1',
      username: 'cashier1',
      name: 'Cashier Staff',
      role: 'cashier',
    };

    const cashier2 = {
      id: 'user_cashier_2',
      username: 'cashier2',
      name: 'Cashier Staff', // identical display name to test ID isolation
      role: 'cashier',
    };

    const expenseA = {
      id: 'exp-A',
      amount: 5000,
      paymentMethod: 'Cash',
      category: 'Rent',
      status: 'ACTIVE',
      createdByUserId: 'user_admin',
      createdByName: 'Admin Manager',
      createdByRole: 'admin',
    };

    const expenseB = {
      id: 'exp-B',
      amount: 1500,
      paymentMethod: 'Online',
      onlineMethodSnapshot: 'JazzCash',
      category: 'Utilities',
      status: 'ACTIVE',
      createdByUserId: 'user_cashier_1',
      createdByName: 'Cashier Staff',
      createdByRole: 'cashier',
    };

    const expenseC = {
      id: 'exp-C',
      amount: 800,
      paymentMethod: 'Cash',
      category: 'Kitchen Supplies',
      status: 'ACTIVE',
      createdByUserId: 'user_cashier_2',
      createdByName: 'Cashier Staff',
      createdByRole: 'cashier',
    };

    const allExpenses = [expenseA, expenseB, expenseC];

    it('Admin can view all expenses across all users (Expense A + B + C)', () => {
      expect(isExpenseVisibleToUser(expenseA, adminUser)).toBe(true);
      expect(isExpenseVisibleToUser(expenseB, adminUser)).toBe(true);
      expect(isExpenseVisibleToUser(expenseC, adminUser)).toBe(true);

      const adminVisible = filterExpensesByOwnership(allExpenses, adminUser);
      expect(adminVisible).toHaveLength(3);
      expect(adminVisible.map((e) => e.id)).toEqual(['exp-A', 'exp-B', 'exp-C']);
    });

    it('Cashier 1 sees Expense B (own), but MUST NOT see Expense A (Admin) or Expense C (Cashier 2)', () => {
      // Cashier 1 must NOT see Expense A (Admin)
      expect(isExpenseVisibleToUser(expenseA, cashier1)).toBe(false);

      // Cashier 1 sees Expense B (own)
      expect(isExpenseVisibleToUser(expenseB, cashier1)).toBe(true);

      // Cashier 1 must NOT see Expense C (Cashier 2)
      expect(isExpenseVisibleToUser(expenseC, cashier1)).toBe(false);

      const cashier1Visible = filterExpensesByOwnership(allExpenses, cashier1);
      expect(cashier1Visible).toHaveLength(1);
      expect(cashier1Visible[0].id).toBe('exp-B');
    });

    it('Cashier 2 sees Expense C (own), but MUST NOT see Expense A (Admin) or Expense B (Cashier 1)', () => {
      expect(isExpenseVisibleToUser(expenseA, cashier2)).toBe(false);
      expect(isExpenseVisibleToUser(expenseB, cashier2)).toBe(false);
      expect(isExpenseVisibleToUser(expenseC, cashier2)).toBe(true);

      const cashier2Visible = filterExpensesByOwnership(allExpenses, cashier2);
      expect(cashier2Visible).toHaveLength(1);
      expect(cashier2Visible[0].id).toBe('exp-C');
    });

    it('never determines ownership from display name only when user ID differs', () => {
      // Both cashier1 and cashier2 have display name "Cashier Staff"
      // Cashier 2 cannot see Cashier 1's expense even though names match exactly
      expect(cashier1.name).toBe(cashier2.name);
      expect(isExpenseVisibleToUser(expenseB, cashier2)).toBe(false);
    });

    it('computes summary strictly on scoped expenses so Cashier never sees restaurant-wide totals', () => {
      const cashier1Scoped = filterExpensesByOwnership(allExpenses, cashier1);
      const cashier1Summary = calculateExpenseSummary(cashier1Scoped);

      // Cashier 1 only sees their own Rs 1500 online expense
      expect(cashier1Summary.totalExpenses).toBe(1500);
      expect(cashier1Summary.onlineExpenses).toBe(1500);
      expect(cashier1Summary.cashExpenses).toBe(0);
      expect(cashier1Summary.activeCount).toBe(1);

      // Admin summary contains all 3: 5000 + 1500 + 800 = 7300
      const adminSummary = calculateExpenseSummary(allExpenses);
      expect(adminSummary.totalExpenses).toBe(7300);
      expect(adminSummary.cashExpenses).toBe(5800);
      expect(adminSummary.onlineExpenses).toBe(1500);
      expect(adminSummary.activeCount).toBe(3);
    });
  });
});
