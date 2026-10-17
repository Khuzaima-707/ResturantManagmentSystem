import { describe, it, expect } from 'vitest';
import { isCashierUser } from '../selectors/invoiceSelectors';
import { calculateDealFinancials } from '../calculations';

describe('Role-based visibility for Menu Items, Add-ons and Deals', () => {
  const adminUser = { id: 'admin-1', username: 'admin', role: 'admin', name: 'Master Admin' };
  const cashierUser = { id: 'cashier-1', username: 'cashier', role: 'cashier', name: 'Front Cashier' };

  describe('1. Role Resolution Helper', () => {
    it('identifies admin user correctly', () => {
      expect(isCashierUser(adminUser)).toBe(false);
      expect(isCashierUser({ id: 'u2', role: 'Administrator' })).toBe(false);
      expect(isCashierUser({ id: 'u3', username: 'admin', role: 'user' })).toBe(false);
    });

    it('identifies cashier user correctly', () => {
      expect(isCashierUser(cashierUser)).toBe(true);
      expect(isCashierUser({ id: 'c2', role: 'Cashier 2' })).toBe(true);
      expect(isCashierUser({ id: 'c3', username: 'cashier' })).toBe(true);
    });
  });

  describe('2. Menu Items Column Definition by Role', () => {
    function getItemsColumns(user) {
      const isCashier = isCashierUser(user);
      return [
        { key: 'index', title: '#' },
        { key: 'imageRef', title: 'Image' },
        { key: 'name', title: 'Item Name' },
        { key: 'categoryId', title: 'Category' },
        { key: 'description', title: 'Description' },
        ...(!isCashier
          ? [
              {
                key: 'costPrice',
                title: 'Cost',
                render: (cost) => (cost !== null && cost !== undefined ? `Rs ${cost}` : '—'),
              },
            ]
          : []),
        { key: 'basePrice', title: 'Price / Unit' },
        { key: 'status', title: 'Status' },
        ...(!isCashier ? [{ key: 'actions', title: 'Actions' }] : []),
      ];
    }

    it('admin sees Cost column and Actions in Items table', () => {
      const cols = getItemsColumns(adminUser);
      const keys = cols.map((c) => c.key);
      expect(keys).toContain('costPrice');
      expect(keys).toContain('basePrice');
      expect(keys).toContain('actions');
      const costCol = cols.find((c) => c.key === 'costPrice');
      expect(costCol.title).toBe('Cost');
      expect(costCol.render(500)).toBe('Rs 500');
    });

    it('cashier NEVER sees Cost column or Actions column (cleanly removed, no "-" placeholder column)', () => {
      const cols = getItemsColumns(cashierUser);
      const keys = cols.map((c) => c.key);
      expect(keys).not.toContain('costPrice');
      expect(keys).not.toContain('actions');
      expect(keys).toContain('name');
      expect(keys).toContain('categoryId');
      expect(keys).toContain('basePrice');
      expect(keys).toContain('status');
      // Verify column count is strictly 2 less than admin
      expect(cols.length).toBe(getItemsColumns(adminUser).length - 2);
    });
  });

  describe('3. Add-ons Column Definition by Role', () => {
    function getAddonsColumns(user) {
      const isCashier = isCashierUser(user);
      return [
        { key: 'index', title: '#' },
        { key: 'name', title: 'Add-on Name' },
        ...(!isCashier
          ? [
              {
                key: 'costPrice',
                title: 'Cost',
                render: (val) => (val !== null && val !== undefined ? `Rs ${val}` : '—'),
              },
            ]
          : []),
        { key: 'price', title: 'Sell Price' },
        { key: 'categoryIds', title: 'Compatible Categories' },
        { key: 'status', title: 'Status' },
        ...(!isCashier ? [{ key: 'actions', title: 'Actions' }] : []),
      ];
    }

    it('admin sees Cost and Sell Price for Add-ons', () => {
      const cols = getAddonsColumns(adminUser);
      const keys = cols.map((c) => c.key);
      expect(keys).toContain('costPrice');
      expect(keys).toContain('price');
      expect(keys).toContain('actions');
    });

    it('cashier sees Sell Price but NEVER Cost column for Add-ons (cleanly removed, no placeholder)', () => {
      const cols = getAddonsColumns(cashierUser);
      const keys = cols.map((c) => c.key);
      expect(keys).not.toContain('costPrice');
      expect(keys).not.toContain('actions');
      expect(keys).toContain('name');
      expect(keys).toContain('price');
      expect(cols.length).toBe(getAddonsColumns(adminUser).length - 2);
    });
  });

  describe('4. Deals Column Definition and Render by Role', () => {
    function getDealsColumns(user) {
      const isCashier = isCashierUser(user);
      return [
        { key: 'index', title: '#' },
        { key: 'name', title: 'Deal' },
        { key: 'includedItems', title: 'Included Items' },
        {
          key: 'dealPrice',
          title: isCashier ? 'Deal Price' : 'Regular / Deal Price',
          render: (deal) => {
            if (isCashier) {
              return `Rs ${deal.dealPrice}`;
            }
            const fin = calculateDealFinancials(deal.includedItems || [], deal.dealPrice || 0);
            return `Rs ${deal.dealPrice} (Reg: Rs ${fin.regularPrice})`;
          },
        },
        ...(!isCashier
          ? [
              {
                key: 'costPrice',
                title: 'Cost & Margin',
                render: (deal) => {
                  const fin = calculateDealFinancials(deal.includedItems || [], deal.dealPrice || 0);
                  return `Cost: Rs ${fin.totalCost}, Profit: Rs ${fin.estimatedGrossProfit} (${fin.profitMargin}%)`;
                },
              },
            ]
          : []),
        { key: 'status', title: 'Status' },
        ...(!isCashier ? [{ key: 'actions', title: 'Actions' }] : []),
      ];
    }

    const testDeal = {
      id: 'deal-combo-1',
      name: 'Combo Deal',
      dealPrice: 1100,
      includedItems: [
        { itemId: 'item-1', name: 'Biryani', sellingPrice: 620, costPrice: 470, quantity: 2 },
      ],
    };

    it('admin sees Regular / Deal Price, Cost & Margin, and full profit figures', () => {
      const cols = getDealsColumns(adminUser);
      const keys = cols.map((c) => c.key);
      expect(keys).toContain('costPrice');
      expect(keys).toContain('actions');

      const priceCol = cols.find((c) => c.key === 'dealPrice');
      expect(priceCol.title).toBe('Regular / Deal Price');
      expect(priceCol.render(testDeal)).toContain('Reg: Rs 1240');

      const costCol = cols.find((c) => c.key === 'costPrice');
      expect(costCol.title).toBe('Cost & Margin');
      expect(costCol.render(testDeal)).toContain('Cost: Rs 940');
      expect(costCol.render(testDeal)).toContain('Profit: Rs 160');
    });

    it('cashier sees Deal Price but NO Cost, NO Profit, and NO Margin (cleanly omitted, no "-" column)', () => {
      const cols = getDealsColumns(cashierUser);
      const keys = cols.map((c) => c.key);
      expect(keys).not.toContain('costPrice');
      expect(keys).not.toContain('actions');

      const priceCol = cols.find((c) => c.key === 'dealPrice');
      expect(priceCol.title).toBe('Deal Price');
      const rendered = priceCol.render(testDeal);
      expect(rendered).toBe('Rs 1100');
      expect(rendered).not.toContain('Cost');
      expect(rendered).not.toContain('Profit');
      expect(rendered).not.toContain('Margin');
    });
  });

  describe('5. Deals and Add-ons Internal Calculations Integrity', () => {
    it('calculates deal financials internally without affecting POS', () => {
      const items = [
        { itemId: 'i1', name: 'Burger', sellingPrice: 400, costPrice: 220, quantity: 2 },
        { itemId: 'i2', name: 'Drink', sellingPrice: 100, costPrice: 45, quantity: 2 },
      ];
      const fin = calculateDealFinancials(items, 850);
      expect(fin.regularPrice).toBe(1000);
      expect(fin.customerSaving).toBe(150);
      expect(fin.totalCost).toBe(530); // (220*2) + (45*2) = 440 + 90 = 530
      expect(fin.estimatedGrossProfit).toBe(320); // 850 - 530 = 320
      expect(fin.profitMargin).toBe(37.65);
    });

    it('reconciles deal COGS and gross profit in reportSelectors matching Deals view', async () => {
      const { getProfitAndCostReportData } = await import('../selectors/reportSelectors');
      const dealOrder = {
        id: 'ord-deal-1',
        invoiceNumber: 'INV-0001',
        completedAt: new Date().toISOString(),
        status: 'completed',
        lines: [
          {
            id: 'l1',
            isDeal: true,
            dealId: 'deal-combo-1',
            itemNameSnapshot: 'Combo Deal',
            categoryNameSnapshot: 'Deals',
            unitPrice: 1100,
            quantity: 1,
            lineSubtotal: 1100,
            grossLineSale: 1100,
            netRevenue: 1100,
            includedItems: [
              { itemId: 'item-1', name: 'Biryani', sellingPrice: 620, costPrice: 470, quantity: 2 },
            ],
          },
        ],
      };

      const report = getProfitAndCostReportData([dealOrder], [], { datePreset: 'All Time' });
      expect(report.itemRows.length).toBe(1);
      const row = report.itemRows[0];
      expect(row.name).toBe('Combo Deal');
      expect(row.category).toBe('Deals');
      expect(row.netSales).toBe(1100);
      expect(row.cogs).toBe(940); // 470 * 2 = 940 (NOT 605)
      expect(row.grossProfit).toBe(160); // 1100 - 940 = 160 (NOT 495)
      expect(row.profitMargin).toBe('14.55%');
    });

    it('excludes deals when Items Only filter (viewType: items) is active', async () => {
      const { getProfitAndCostReportData } = await import('../selectors/reportSelectors');
      const mixedOrder = {
        id: 'ord-mix-1',
        invoiceNumber: 'INV-0002',
        completedAt: new Date().toISOString(),
        status: 'completed',
        lines: [
          {
            id: 'l1',
            isDeal: true,
            itemNameSnapshot: 'Combo Deal',
            unitPrice: 1100,
            quantity: 1,
            lineSubtotal: 1100,
            grossLineSale: 1100,
            netRevenue: 1100,
            includedItems: [{ name: 'Biryani', costPrice: 470, quantity: 2, sellingPrice: 620 }],
          },
          {
            id: 'l2',
            isDeal: false,
            itemId: 'item-kunafa',
            itemNameSnapshot: 'Kunafa',
            categoryNameSnapshot: 'Deserts',
            unitPrice: 500,
            quantity: 1,
            costPriceSnapshot: 400,
            lineSubtotal: 500,
            grossLineSale: 500,
            netRevenue: 500,
          },
        ],
      };

      const itemsOnlyReport = getProfitAndCostReportData([mixedOrder], [], { datePreset: 'All Time', viewType: 'items' });
      expect(itemsOnlyReport.itemRows.some((r) => r.name === 'Combo Deal')).toBe(false);
      expect(itemsOnlyReport.itemRows.some((r) => r.name === 'Kunafa')).toBe(true);
    });

    it('shows deal and itemized component profits when Deals Only filter (viewType: deals) is active', async () => {
      const { getProfitAndCostReportData } = await import('../selectors/reportSelectors');
      const dealOrder = {
        id: 'ord-deal-2',
        invoiceNumber: 'INV-0003',
        completedAt: new Date().toISOString(),
        status: 'completed',
        lines: [
          {
            id: 'l1',
            isDeal: true,
            itemNameSnapshot: 'Combo Deal',
            unitPrice: 1100,
            quantity: 1,
            lineSubtotal: 1100,
            grossLineSale: 1100,
            netRevenue: 1100,
            includedItems: [
              { itemId: 'item-1', name: 'Chicken Biryani', sellingPrice: 620, costPrice: 470, quantity: 2 },
            ],
          },
        ],
      };

      const dealsReport = getProfitAndCostReportData([dealOrder], [], { datePreset: 'All Time', viewType: 'deals' });
      // Parent deal row + 1 component row
      expect(dealsReport.itemRows.length).toBe(2);

      // Parent deal row
      const dealRow = dealsReport.itemRows[0];
      expect(dealRow.name).toBe('Combo Deal');
      expect(dealRow.isDeal).toBe(true);
      expect(dealRow.netSales).toBe(1100);
      expect(dealRow.cogs).toBe(940);
      expect(dealRow.grossProfit).toBe(160);
      expect(dealRow.margin).toBe(14.55);

      // Child component row
      const compRow = dealsReport.itemRows[1];
      expect(compRow.name).toBe('Chicken Biryani');
      expect(compRow.isDealComponent).toBe(true);
      expect(compRow.parentDealName).toBe('Combo Deal');
      expect(compRow.qtySold).toBe(2);
      expect(compRow.cogs).toBe(940);
      expect(compRow.grossProfit).toBe(160);
      expect(compRow.margin).toBe(14.55);

      // KPIs should not double-count component rows
      expect(dealsReport.kpis.netSales).toBe(1100);
      expect(dealsReport.kpis.cogs).toBe(940);
      expect(dealsReport.kpis.grossProfit).toBe(160);
    });
  });
});
