import { describe, it, expect } from 'vitest';
import {
  isInvoiceVisibleToUser,
  filterOrdersByOwnership,
  repairDuplicateInvoiceNumbersLocally,
  generateNextSequentialInvoiceNumber,
  getInvoiceHistory,
  filterInvoices,
  getUserCartStorageKey,
  isNotificationVisibleToUser,
  filterNotificationsByTargetUser,
} from './invoiceSelectors';

describe('Role-Based Invoice Ownership & Invoice Number Uniqueness', () => {
  // Test Users
  const adminUser = {
    id: 'user_admin',
    name: 'John Holland',
    username: 'admin',
    role: 'Admin Cashier',
  };

  const cashier1User = {
    id: 'user_cashier_1',
    name: 'Cashier 1',
    username: 'cashier1',
    role: 'Cashier',
  };

  const cashier2User = {
    id: 'user_cashier_2',
    name: 'Cashier 2',
    username: 'cashier2',
    role: 'Cashier',
  };

  // Test Invoices
  const invoiceA = {
    id: 'ord-a',
    invoiceNumber: 'INV-0001',
    sequenceNumber: 1,
    status: 'completed',
    createdByUserId: 'user_admin',
    createdByName: 'John Holland',
    createdByRole: 'admin',
    grandTotal: 1500,
    completedAt: '2026-10-16T10:00:00.000Z',
    lines: [{ itemNameSnapshot: 'Chicken Karahi', lineSubtotal: 1500 }],
  };

  const invoiceB = {
    id: 'ord-b',
    invoiceNumber: 'INV-0002',
    sequenceNumber: 2,
    status: 'completed',
    createdByUserId: 'user_cashier_1',
    createdByName: 'Cashier 1',
    createdByRole: 'cashier',
    grandTotal: 800,
    completedAt: '2026-10-16T10:05:00.000Z',
    lines: [{ itemNameSnapshot: 'Special Biryani', lineSubtotal: 800 }],
  };

  const invoiceC = {
    id: 'ord-c',
    invoiceNumber: 'INV-0003',
    sequenceNumber: 3,
    status: 'completed',
    createdByUserId: 'user_cashier_2',
    createdByName: 'Cashier 2',
    createdByRole: 'cashier',
    grandTotal: 650,
    completedAt: '2026-10-16T10:10:00.000Z',
    lines: [{ itemNameSnapshot: 'Zinger Burger', lineSubtotal: 650 }],
  };

  const historicalInvoiceMissingCreator = {
    id: 'ord-hist-legacy',
    invoiceNumber: 'INV-0000',
    sequenceNumber: 0,
    status: 'completed',
    createdByUserId: null,
    createdByName: null,
    createdByRole: null,
    cashierName: 'Old Pos Terminal',
    grandTotal: 500,
    completedAt: '2026-10-15T08:00:00.000Z',
    lines: [{ itemNameSnapshot: 'Tea', lineSubtotal: 500 }],
  };

  const allOrders = [invoiceA, invoiceB, invoiceC, historicalInvoiceMissingCreator];

  // ================= 1. USER'S SPECIFIED VERIFICATION TEST =================
  it('Admin creates invoice A, Cashier 1 creates invoice B: verifies role-based visibility rules', () => {
    // 1. Cashier 1 logs in: must NOT see invoice A (Admin created)
    const cashier1Orders = filterOrdersByOwnership(allOrders, cashier1User);
    expect(cashier1Orders.some((o) => o.id === invoiceA.id)).toBe(false);

    // 2. Cashier 1: sees invoice B only (created by Cashier 1)
    expect(cashier1Orders.some((o) => o.id === invoiceB.id)).toBe(true);
    expect(cashier1Orders.filter((o) => o.id === invoiceB.id)).toHaveLength(1);
    expect(cashier1Orders).toHaveLength(1); // Invoice B only!

    // 3. Admin logs in: sees invoice A and invoice B (and all authorized invoices)
    const adminOrders = filterOrdersByOwnership(allOrders, adminUser);
    expect(adminOrders.some((o) => o.id === invoiceA.id)).toBe(true);
    expect(adminOrders.some((o) => o.id === invoiceB.id)).toBe(true);
    expect(adminOrders.some((o) => o.id === invoiceC.id)).toBe(true);
    expect(adminOrders.some((o) => o.id === historicalInvoiceMissingCreator.id)).toBe(true);
    expect(adminOrders).toHaveLength(4);

    // 4. Cashier 2 logs in: sees neither invoice A nor invoice B
    const cashier2Orders = filterOrdersByOwnership(allOrders, cashier2User);
    expect(cashier2Orders.some((o) => o.id === invoiceA.id)).toBe(false);
    expect(cashier2Orders.some((o) => o.id === invoiceB.id)).toBe(false);
    expect(cashier2Orders.some((o) => o.id === invoiceC.id)).toBe(true); // Sees only C
    expect(cashier2Orders).toHaveLength(1);
  });

  // ================= 2. EXISTING DATA & ATTRIBUTION SAFETY =================
  it('does NOT invent ownership for historical invoices with genuinely missing creator data', () => {
    // Cashier 1 must NOT be assigned the legacy order
    expect(isInvoiceVisibleToUser(historicalInvoiceMissingCreator, cashier1User)).toBe(false);

    // Cashier 2 must NOT be assigned the legacy order
    expect(isInvoiceVisibleToUser(historicalInvoiceMissingCreator, cashier2User)).toBe(false);

    // Only Admin can see legacy unassigned invoices
    expect(isInvoiceVisibleToUser(historicalInvoiceMissingCreator, adminUser)).toBe(true);
  });

  // ================= 3. SEARCH & FILTERING INTEGRATION =================
  it('applies ownership filtering cleanly to search and invoice history sorting', () => {
    const cashier1Orders = filterOrdersByOwnership(allOrders, cashier1User);
    const sorted = getInvoiceHistory(cashier1Orders);
    const filtered = filterInvoices(sorted, { searchQuery: 'INV-0001' });

    // Cashier 1 searching for INV-0001 (Admin invoice) gets 0 results
    expect(filtered).toHaveLength(0);

    // Cashier 1 searching for INV-0002 (their own invoice) finds it
    const myFiltered = filterInvoices(sorted, { searchQuery: 'INV-0002' });
    expect(myFiltered).toHaveLength(1);
    expect(myFiltered[0].invoiceNumber).toBe('INV-0002');
  });

  // ================= 4. INVOICE NUMBER UNIQUENESS & DUPLICATE REPAIR =================
  it('repairs existing duplicate invoice numbers without deleting any completed order', () => {
    // Simulating screenshot situation: 3 completed orders all sharing 'INV-0001'
    const duplicateOrders = [
      {
        id: 'ord-dup-1',
        invoiceNumber: 'INV-0001',
        sequenceNumber: 1,
        completedAt: '2026-10-16T08:00:00.000Z',
        grandTotal: 1000,
        lines: [{ itemNameSnapshot: 'Order 1' }],
      },
      {
        id: 'ord-dup-2',
        invoiceNumber: 'INV-0001', // DUPLICATE!
        sequenceNumber: 1,
        completedAt: '2026-10-16T08:15:00.000Z',
        grandTotal: 1200,
        lines: [{ itemNameSnapshot: 'Order 2' }],
      },
      {
        id: 'ord-dup-3',
        invoiceNumber: 'INV-0001', // DUPLICATE!
        sequenceNumber: 1,
        completedAt: '2026-10-16T08:30:00.000Z',
        grandTotal: 1400,
        lines: [{ itemNameSnapshot: 'Order 3' }],
      },
    ];

    const repaired = repairDuplicateInvoiceNumbersLocally(duplicateOrders, 'INV-');

    // 1. Existing completed invoices must not be silently deleted
    expect(repaired).toHaveLength(3);
    expect(repaired.map((o) => o.id)).toEqual(['ord-dup-1', 'ord-dup-2', 'ord-dup-3']);

    // 2. Every invoice must receive a unique sequential invoice number
    expect(repaired[0].invoiceNumber).toBe('INV-0001');
    expect(repaired[1].invoiceNumber).toBe('INV-0002');
    expect(repaired[2].invoiceNumber).toBe('INV-0003');

    // 3. Sequences are consecutive
    expect(repaired[0].sequenceNumber).toBe(1);
    expect(repaired[1].sequenceNumber).toBe(2);
    expect(repaired[2].sequenceNumber).toBe(3);

    // 4. Financial data and lines are preserved 100%
    expect(repaired[0].grandTotal).toBe(1000);
    expect(repaired[1].grandTotal).toBe(1200);
    expect(repaired[2].grandTotal).toBe(1400);
  });

  it('safely heals duplicate INV-0001 when a deal is added later and sorts it to the top (INV-0008)', () => {
    // Exact scenario from user: 7 existing orders (INV-0001 to INV-0007),
    // and a new deal order at 06:38 AM accidentally assigned duplicate INV-0001.
    const ordersWithDuplicateDeal = [
      { id: 'ord-1', invoiceNumber: 'INV-0001', sequenceNumber: 1, completedAt: '2026-10-19T06:01:00Z', grandTotal: 550, lines: [{ itemNameSnapshot: 'Zinger Burger' }] },
      { id: 'ord-2', invoiceNumber: 'INV-0002', sequenceNumber: 2, completedAt: '2026-10-19T06:04:00Z', grandTotal: 1000, lines: [{ itemNameSnapshot: 'Chicken biryani' }] },
      { id: 'ord-3', invoiceNumber: 'INV-0003', sequenceNumber: 3, completedAt: '2026-10-19T06:09:00Z', grandTotal: 200, status: 'reversed', lines: [{ itemNameSnapshot: 'Chicken Roll' }] },
      { id: 'ord-4', invoiceNumber: 'INV-0004', sequenceNumber: 4, completedAt: '2026-10-19T06:14:00Z', grandTotal: 600, lines: [{ itemNameSnapshot: 'Kunafa' }] },
      { id: 'ord-5', invoiceNumber: 'INV-0005', sequenceNumber: 5, completedAt: '2026-10-19T06:14:00Z', grandTotal: 263, lines: [{ itemNameSnapshot: '7up' }] },
      { id: 'ord-6', invoiceNumber: 'INV-0006', sequenceNumber: 6, completedAt: '2026-10-19T06:16:00Z', grandTotal: 210, lines: [{ itemNameSnapshot: 'Chicken Roll' }] },
      { id: 'ord-7', invoiceNumber: 'INV-0007', sequenceNumber: 7, completedAt: '2026-10-19T06:29:00Z', grandTotal: 126, lines: [{ itemNameSnapshot: 'Mountain Dew' }] },
      { id: 'ord-deal-8', invoiceNumber: 'INV-0001', sequenceNumber: 1, completedAt: '2026-10-19T06:38:00Z', grandTotal: 788, lines: [{ itemNameSnapshot: 'New Deal', isDeal: true }] },
    ];

    const repaired = repairDuplicateInvoiceNumbersLocally(ordersWithDuplicateDeal, 'INV-');

    // Zinger keeps INV-0001
    const zinger = repaired.find((o) => o.id === 'ord-1');
    expect(zinger.invoiceNumber).toBe('INV-0001');
    expect(zinger.sequenceNumber).toBe(1);

    // Deal is automatically resequenced to INV-0008
    const deal = repaired.find((o) => o.id === 'ord-deal-8');
    expect(deal.invoiceNumber).toBe('INV-0008');
    expect(deal.sequenceNumber).toBe(8);
    expect(deal.grandTotal).toBe(788);

    // When sorted descending (newest / highest sequence first), deal is at row 1 (the very top)
    const sorted = getInvoiceHistory(ordersWithDuplicateDeal);
    expect(sorted[0].id).toBe('ord-deal-8');
    expect(sorted[0].invoiceNumber).toBe('INV-0008');
    expect(sorted[1].invoiceNumber).toBe('INV-0007');
    expect(sorted[7].invoiceNumber).toBe('INV-0001');
  });

  // ================= 5. SEQUENTIAL NUMBER GENERATOR =================
  it('generates the next sequential invoice number safely across existing orders', () => {
    const existing = [
      { sequenceNumber: 1, invoiceNumber: 'INV-0001' },
      { sequenceNumber: 2, invoiceNumber: 'INV-0002' },
      { sequenceNumber: 3, invoiceNumber: 'INV-0003' },
    ];

    const next = generateNextSequentialInvoiceNumber(existing, 'INV-');
    expect(next.sequenceNumber).toBe(4);
    expect(next.invoiceNumber).toBe('INV-0004');
  });

  // ================= 6. USER-SCOPED POS CART PERSISTENCE =================
  it('scopes cart localStorage keys strictly by immutable user ID', () => {
    expect(getUserCartStorageKey(adminUser)).toBe('cart_user_admin');
    expect(getUserCartStorageKey(cashier1User)).toBe('cart_user_cashier_1');
    expect(getUserCartStorageKey(cashier2User)).toBe('cart_user_cashier_2');
    expect(getUserCartStorageKey(null)).toBe('cart_guest');
  });

  // ================= 7. USER-TARGETED NOTIFICATIONS =================
  describe('User-Targeted Notification Scoping', () => {
    const adminNotification = {
      id: 'notif-admin-1',
      type: 'order',
      title: 'New Order #INV-0001',
      createdByUserId: 'user_admin',
      createdByRole: 'admin',
      targetUserId: 'user_admin',
      targetRoles: ['admin'],
    };

    const cashier1Notification = {
      id: 'notif-cashier-1',
      type: 'order',
      title: 'New Order #INV-0002',
      createdByUserId: 'user_cashier_1',
      createdByRole: 'cashier',
      targetUserId: 'user_cashier_1',
      targetRoles: ['admin', 'cashier'],
    };

    const broadcastNotification = {
      id: 'notif-broadcast',
      type: 'announcement',
      title: 'Shift Change Notice',
      targetRoles: ['cashier', 'all'],
    };

    it('Admin sees all notifications (admin sales, cashier sales, broadcasts)', () => {
      const all = [adminNotification, cashier1Notification, broadcastNotification];
      const visibleToAdmin = filterNotificationsByTargetUser(all, adminUser);
      expect(visibleToAdmin).toHaveLength(3);
    });

    it('Cashier NEVER sees Admin-created order notification', () => {
      expect(isNotificationVisibleToUser(adminNotification, cashier1User)).toBe(false);
      expect(isNotificationVisibleToUser(adminNotification, cashier2User)).toBe(false);
    });

    it('Cashier 1 sees their own order notification, but Cashier 2 does NOT', () => {
      expect(isNotificationVisibleToUser(cashier1Notification, cashier1User)).toBe(true);
      expect(isNotificationVisibleToUser(cashier1Notification, cashier2User)).toBe(false);
    });

    it('All cashiers see broadcast announcements explicitly targeting cashiers', () => {
      expect(isNotificationVisibleToUser(broadcastNotification, cashier1User)).toBe(true);
      expect(isNotificationVisibleToUser(broadcastNotification, cashier2User)).toBe(true);
    });

    it('Cashier NEVER sees Balance Settled notifications (strictly Admin)', () => {
      const balanceSettledNotif = {
        id: 'notif-stl-1',
        type: 'order',
        title: 'Balance Settled #INV-0002',
        description: 'Received Rs 25 via Cash. Fully Paid',
        targetRoles: ['admin', 'cashier'],
      };
      expect(isNotificationVisibleToUser(balanceSettledNotif, cashier1User)).toBe(false);
      expect(isNotificationVisibleToUser(balanceSettledNotif, cashier2User)).toBe(false);
      expect(isNotificationVisibleToUser(balanceSettledNotif, adminUser)).toBe(true);
    });

    it('Cashier NEVER sees Reversal or Deletion notifications (strictly Admin)', () => {
      const reversalNotif = {
        id: 'notif-rev-1',
        type: 'reversal',
        title: 'Invoice Reversed #INV-0003',
        description: 'Refund Rs 500',
      };
      const deleteNotif = {
        id: 'notif-del-1',
        type: 'reversal',
        title: 'Invoice #INV-0004 Deleted',
        description: 'Removed Rs 300',
      };
      expect(isNotificationVisibleToUser(reversalNotif, cashier1User)).toBe(false);
      expect(isNotificationVisibleToUser(deleteNotif, cashier1User)).toBe(false);
      expect(isNotificationVisibleToUser(reversalNotif, adminUser)).toBe(true);
      expect(isNotificationVisibleToUser(deleteNotif, adminUser)).toBe(true);
    });
  });
});

