import { describe, it, expect } from 'vitest';
import {
  calculateDealFinancials,
  buildOrderLineSnapshots,
  calculateWeightPrice,
  calculateWeightCost,
} from './index';
import {
  deriveSalesReport,
  deriveDealsReport,
  getProfitAndCostReportData,
} from '../selectors/reportSelectors';
import { calculateItemsSold } from '../selectors/dashboardSelectors';
import { createReversalSnapshot } from '../selectors/invoiceSelectors';

describe('DEALS Feature - Financial Calculations & Rules Verification', () => {
  // --- 1. PIECE ITEM DEAL ---
  it('1. calculates piece item deal selling price, cost, savings, and profit correctly', () => {
    const includedItems = [
      { itemId: 'item_burger', name: 'Zinger Burger', quantity: 1, sellingPrice: 400, costPrice: 220 },
      { itemId: 'item_drink', name: 'Soft Drink 500ml', quantity: 1, sellingPrice: 100, costPrice: 50 },
    ];
    const dealPrice = 450;

    const financials = calculateDealFinancials(includedItems, dealPrice);

    expect(financials.regularPrice).toBe(500); // 400 + 100
    expect(financials.customerSaving).toBe(50); // 500 - 450
    expect(financials.totalCost).toBe(270); // 220 + 50
    expect(financials.estimatedGrossProfit).toBe(180); // 450 - 270
    expect(financials.profitMargin).toBe(40); // Math.round((180 / 450) * 100) = 40%
    expect(financials.hasCost).toBe(true);
  });

  // --- 2. WEIGHT ITEM DEAL ---
  it('2. correctly reuses weight/portion logic for weight items inside a deal', () => {
    // Chicken Biryani: selling Rs 800/kg, cost Rs 500/kg -> 500g portion
    const biryaniSelling = calculateWeightPrice(800, 500); // Rs 400
    const biryaniCost = calculateWeightCost(500, 500); // Rs 250

    expect(biryaniSelling).toBe(400);
    expect(biryaniCost).toBe(250);

    const includedItems = [
      {
        itemId: 'item_biryani',
        name: 'Chicken Biryani',
        portion: '500g',
        weightGrams: 500,
        quantity: 1,
        sellingPrice: biryaniSelling,
        costPrice: biryaniCost,
      },
      {
        itemId: 'item_raita',
        name: 'Raita',
        quantity: 1,
        sellingPrice: 50,
        costPrice: 20,
      },
    ];
    const dealPrice = 400; // Customer gets Rs 450 regular value for Rs 400

    const financials = calculateDealFinancials(includedItems, dealPrice);

    expect(financials.regularPrice).toBe(450);
    expect(financials.customerSaving).toBe(50);
    expect(financials.totalCost).toBe(270); // 250 + 20
    expect(financials.estimatedGrossProfit).toBe(130); // 400 - 270
    expect(financials.profitMargin).toBe(32.5); // (130 / 400) * 100 = 32.5%
    expect(financials.hasCost).toBe(true);
  });

  // --- 3. ADD-ON INSIDE DEAL ---
  it('3. supports add-ons inside a deal with correct price and cost contribution', () => {
    const includedItems = [
      { itemId: 'item_pizza', name: 'Large Pizza', quantity: 1, sellingPrice: 1200, costPrice: 600 },
      { itemId: 'addon_cheese', itemType: 'addon', name: 'Extra Cheese', quantity: 1, sellingPrice: 150, costPrice: 60 },
      { itemId: 'addon_dip', itemType: 'addon', name: 'Garlic Dip', quantity: 1, sellingPrice: 50, costPrice: 20 },
    ];
    const dealPrice = 1199;

    const financials = calculateDealFinancials(includedItems, dealPrice);

    expect(financials.regularPrice).toBe(1400); // 1200 + 150 + 50
    expect(financials.customerSaving).toBe(201); // 1400 - 1199
    expect(financials.totalCost).toBe(680); // 600 + 60 + 20
    expect(financials.estimatedGrossProfit).toBe(519); // 1199 - 680
    expect(financials.hasCost).toBe(true);
  });

  // --- 4. MULTIPLE QUANTITIES OF INCLUDED ITEMS ---
  it('4. calculates included items with quantities greater than 1 correctly', () => {
    const includedItems = [
      { itemId: 'item_roll', name: 'Chicken Roll', quantity: 4, sellingPrice: 200, costPrice: 110 }, // 4 * 200 = 800, cost 4 * 110 = 440
      { itemId: 'item_cola', name: 'Next Cola 1.5L', quantity: 2, sellingPrice: 140, costPrice: 90 }, // 2 * 140 = 280, cost 2 * 90 = 180
    ];
    const dealPrice = 899;

    const financials = calculateDealFinancials(includedItems, dealPrice);

    expect(financials.regularPrice).toBe(1080); // 800 + 280
    expect(financials.customerSaving).toBe(181); // 1080 - 899
    expect(financials.totalCost).toBe(620); // 440 + 180
    expect(financials.estimatedGrossProfit).toBe(279); // 899 - 620
    expect(financials.profitMargin).toBe(31.03);
    expect(financials.hasCost).toBe(true);
  });

  // --- 5. MISSING COST SAFETY (REQUIREMENT 14) ---
  it('5. marks deal cost and profit as unavailable if any component lacks cost (never assumes zero)', () => {
    const includedItems = [
      { itemId: 'item_roll', name: 'Chicken Roll', quantity: 2, sellingPrice: 200, costPrice: 110 },
      { itemId: 'item_water', name: 'Mineral Water 500ml', quantity: 1, sellingPrice: 50, costPrice: null }, // MISSING COST!
    ];
    const dealPrice = 400;

    const financials = calculateDealFinancials(includedItems, dealPrice);

    expect(financials.regularPrice).toBe(450);
    expect(financials.customerSaving).toBe(50);
    expect(financials.totalCost).toBeNull(); // Missing cost!
    expect(financials.estimatedGrossProfit).toBeNull(); // Missing profit!
    expect(financials.profitMargin).toBeNull();
    expect(financials.hasCost).toBe(false);
  });

  // --- 6. ORDER SNAPSHOT GENERATION FOR DEALS ---
  it('6. builds immutable order snapshots for deals with frozen cost and included items', () => {
    const cartLines = [
      {
        id: 'line_1',
        dealId: 'deal_family_1',
        isDeal: true,
        itemNameSnapshot: 'Family Deal',
        pricingMode: 'deal',
        unitPrice: 599,
        quantity: 1,
        lineSubtotal: 599,
        includedItems: [
          { itemId: 'item_biryani', name: 'Biryani 500g', quantity: 1, sellingPrice: 400, costPrice: 250 },
          { itemId: 'item_raita', name: 'Raita', quantity: 1, sellingPrice: 50, costPrice: 20 },
          { itemId: 'item_drink', name: 'Next Cola 1L', quantity: 1, sellingPrice: 120, costPrice: 70 },
        ],
      },
    ];

    const snapshots = buildOrderLineSnapshots(cartLines, [], [], 0);
    expect(snapshots).toHaveLength(1);

    const dealSnap = snapshots[0];
    expect(dealSnap.isDeal).toBe(true);
    expect(dealSnap.dealId).toBe('deal_family_1');
    expect(dealSnap.pricingMode).toBe('deal');
    expect(dealSnap.grossLineSale).toBe(599);
    expect(dealSnap.allocatedDiscount).toBe(0);
    expect(dealSnap.netRevenue).toBe(599);
    expect(dealSnap.totalCOGS).toBe(340); // 250 + 20 + 70
    expect(dealSnap.grossProfit).toBe(259); // 599 - 340
    expect(dealSnap.hasCostPrice).toBe(true);
    expect(dealSnap.includedItems).toHaveLength(3);
  });

  // --- 7. MULTIPLE QUANTITIES OF A DEAL IN ORDER ---
  it('7. calculates snapshots correctly when ordering multiple quantities of a deal', () => {
    const cartLines = [
      {
        id: 'line_2',
        dealId: 'deal_family_1',
        isDeal: true,
        itemNameSnapshot: 'Family Deal',
        pricingMode: 'deal',
        unitPrice: 599,
        quantity: 2,
        lineSubtotal: 1198,
        includedItems: [
          { itemId: 'item_biryani', name: 'Biryani 500g', quantity: 1, sellingPrice: 400, costPrice: 250 },
          { itemId: 'item_raita', name: 'Raita', quantity: 1, sellingPrice: 50, costPrice: 20 },
          { itemId: 'item_drink', name: 'Next Cola 1L', quantity: 1, sellingPrice: 120, costPrice: 70 },
        ],
      },
    ];

    const snapshots = buildOrderLineSnapshots(cartLines, [], [], 0);
    const dealSnap = snapshots[0];

    expect(dealSnap.quantity).toBe(2);
    expect(dealSnap.grossLineSale).toBe(1198);
    expect(dealSnap.totalCOGS).toBe(680); // (250 + 20 + 70) * 2 = 340 * 2 = 680
    expect(dealSnap.grossProfit).toBe(518); // 1198 - 680
  });

  // --- 8. PROPORTIONAL INVOICE DISCOUNT PARTICIPATION ---
  it('8. participates proportionally in invoice-level discounts and computes net revenue', () => {
    // Total order subtotal = Rs 1,000 (Deal Rs 600 + Regular Item Rs 400), Discount = Rs 100 (10%)
    const cartLines = [
      {
        id: 'line_deal',
        dealId: 'deal_1',
        isDeal: true,
        itemNameSnapshot: 'Super Deal',
        pricingMode: 'deal',
        unitPrice: 600,
        quantity: 1,
        lineSubtotal: 600,
        includedItems: [
          { itemId: 'item_1', name: 'Item 1', quantity: 1, sellingPrice: 700, costPrice: 300 },
        ],
      },
      {
        id: 'line_regular',
        itemId: 'item_burger',
        isDeal: false,
        itemNameSnapshot: 'Regular Burger',
        pricingMode: 'piece',
        unitPrice: 400,
        costPriceSnapshot: 200,
        quantity: 1,
        lineSubtotal: 400,
      },
    ];

    const orderDiscount = 100;

    const snapshots = buildOrderLineSnapshots(cartLines, [], [], orderDiscount);
    const dealLine = snapshots[0];
    const regularLine = snapshots[1];

    // Deal is 60% of order -> allocated discount = Rs 60
    expect(dealLine.allocatedDiscount).toBe(60);
    expect(dealLine.netRevenue).toBe(540); // 600 - 60
    expect(dealLine.totalCOGS).toBe(300);
    expect(dealLine.grossProfit).toBe(240); // 540 - 300

    // Regular line is 40% of order -> allocated discount = Rs 40
    expect(regularLine.allocatedDiscount).toBe(40);
    expect(regularLine.netRevenue).toBe(360); // 400 - 40
    expect(regularLine.totalCOGS).toBe(200);
    expect(regularLine.grossProfit).toBe(160); // 360 - 200

    // Total Net Revenue = 540 + 360 = 900 (Subtotal 1000 - Discount 100)
    expect(dealLine.netRevenue + regularLine.netRevenue).toBe(900);
  });

  // --- 9. TAX EXCLUSION FROM PROFIT & REVENUE ---
  it('9. ensures tax is never included in deal net revenue or gross profit', () => {
    const order = {
      id: 'ord_deal_tax',
      invoiceNumber: 'INV-DEAL-01',
      status: 'completed',
      subtotal: 599,
      discountAmount: 0,
      taxAmount: 96, // 16% tax
      grandTotal: 695, // 599 + 96
      lines: [
        {
          id: 'l1',
          dealId: 'deal_1',
          isDeal: true,
          itemNameSnapshot: 'Deal 1',
          quantity: 1,
          lineSubtotal: 599,
          netRevenue: 599, // Net revenue strictly excludes tax
          totalCOGS: 300,
          grossProfit: 299, // Gross profit strictly excludes tax
        },
      ],
    };

    const salesReport = deriveSalesReport([order], []);
    expect(salesReport.validNetSales).toBe(599); // grandTotal (695) - tax (96) = 599
    expect(salesReport.dealsSold).toBe(1);
    expect(salesReport.dealRevenue).toBe(599);
    expect(salesReport.dealCost).toBe(300);
    expect(salesReport.dealGrossProfit).toBe(299);
  });

  // --- 10. HISTORICAL PROFIT IMMUTABILITY ---
  it('10. guarantees historical deal profit remains unchanged if menu item cost changes later', () => {
    // Original sale made with biryani cost Rs 250
    const historicalOrder = {
      id: 'ord_historical_deal',
      invoiceNumber: 'INV-HIST-01',
      status: 'completed',
      subtotal: 599,
      discountAmount: 0,
      taxAmount: 0,
      grandTotal: 599,
      lines: [
        {
          id: 'line_hist',
          dealId: 'deal_1',
          isDeal: true,
          itemNameSnapshot: 'Historical Deal',
          quantity: 1,
          lineSubtotal: 599,
          netRevenue: 599,
          totalCOGS: 270, // Frozen snapshot: Biryani 250 + Raita 20
          grossProfit: 329, // 599 - 270
          includedItems: [
            { itemId: 'item_biryani', name: 'Chicken Biryani', quantity: 1, sellingPrice: 400, costPrice: 250 },
            { itemId: 'item_raita', name: 'Raita', quantity: 1, sellingPrice: 50, costPrice: 20 },
          ],
        },
      ],
    };

    // New catalog where Chicken Biryani cost increases to Rs 350
    const updatedCatalogItems = [
      { id: 'item_biryani', name: 'Chicken Biryani', basePrice: 800, costPrice: 350 },
      { id: 'item_raita', name: 'Raita', basePrice: 50, costPrice: 30 },
    ];

    const reportData = getProfitAndCostReportData([historicalOrder], [], {}, updatedCatalogItems, []);

    // Profit report must honor stored snapshot (totalCOGS: 270, profit: 329), not recalculate with new cost 380
    expect(reportData.kpis.cogs).toBe(270);
    expect(reportData.kpis.grossProfit).toBe(329);
    expect(reportData.kpis.netSales).toBe(599);
  });

  // --- 11. REVERSAL FLOW ---
  it('11. correctly reverses Deal Net Revenue, Deal COGS, Deal Gross Profit without deleting original invoice', () => {
    const dealOrder = {
      id: 'ord_to_reverse',
      invoiceNumber: 'INV-REV-01',
      status: 'completed',
      subtotal: 599,
      discountAmount: 0,
      taxAmount: 0,
      grandTotal: 599,
      lines: [
        {
          id: 'l_rev',
          dealId: 'deal_1',
          isDeal: true,
          itemNameSnapshot: 'Family Deal',
          quantity: 1,
          lineSubtotal: 599,
          netRevenue: 599,
          totalCOGS: 300,
          grossProfit: 299,
        },
      ],
    };

    // Before reversal
    const preRevReport = deriveSalesReport([dealOrder], []);
    expect(preRevReport.dealsSold).toBe(1);
    expect(preRevReport.dealRevenue).toBe(599);
    expect(preRevReport.dealCost).toBe(300);
    expect(preRevReport.dealGrossProfit).toBe(299);

    // Create reversal snapshot
    const reversalRecord = createReversalSnapshot(dealOrder, {
      reason: 'Customer Cancelled',
      note: 'Change of mind',
      reversedBy: 'Admin Cashier',
    });

    // After reversal
    const postRevReport = deriveSalesReport([dealOrder], [reversalRecord]);
    expect(postRevReport.dealsSold).toBe(0);
    expect(postRevReport.dealRevenue).toBe(0);
    expect(postRevReport.dealCost).toBe(0);
    expect(postRevReport.dealGrossProfit).toBe(0);
    expect(postRevReport.validNetSales).toBe(0);

    // Verify profit report also excludes reversed deal COGS & profit
    const postRevProfit = getProfitAndCostReportData([dealOrder], [reversalRecord]);
    expect(postRevProfit.kpis.netSales).toBe(0);
    expect(postRevProfit.kpis.cogs).toBe(0);
    expect(postRevProfit.kpis.grossProfit).toBe(0);
  });

  // --- 12. ITEMS SOLD RULE (REQUIREMENT 13) ---
  it('12. counts a sold deal as 1 item sold and does not inflate components into total items sold', () => {
    const orderWithDeal = {
      id: 'ord_items_sold',
      invoiceNumber: 'INV-ITEMS-01',
      status: 'completed',
      lines: [
        {
          id: 'l1',
          dealId: 'deal_family',
          isDeal: true,
          itemNameSnapshot: 'Family Deal (3 items bundle)',
          quantity: 1,
          includedItems: [
            { name: 'Biryani 500g', quantity: 1 },
            { name: 'Raita', quantity: 1 },
            { name: 'Cola 1L', quantity: 1 },
          ],
        },
        {
          id: 'l2',
          itemId: 'item_zinger',
          isDeal: false,
          itemNameSnapshot: 'Zinger Burger',
          quantity: 2,
        },
      ],
    };

    // 1 Deal + 2 Zingers = 3 Items Sold (NOT 3 included items + 2 zingers = 5)
    const itemsSold = calculateItemsSold([orderWithDeal], []);
    expect(itemsSold).toBe(3);
  });

  // --- 13. DEDICATED DEALS REPORT SELECTOR ---
  it('13. deriveDealsReport returns exact Deals metrics', () => {
    const orders = [
      {
        id: 'ord_1',
        invoiceNumber: 'INV-1',
        status: 'completed',
        lines: [
          {
            id: 'l1',
            isDeal: true,
            dealId: 'deal_1',
            quantity: 2,
            netRevenue: 1000,
            totalCOGS: 600,
            grossProfit: 400,
          },
        ],
      },
      {
        id: 'ord_2',
        invoiceNumber: 'INV-2',
        status: 'completed',
        lines: [
          {
            id: 'l2',
            isDeal: false,
            quantity: 1,
            netRevenue: 300,
            totalCOGS: 150,
            grossProfit: 150,
          },
        ],
      },
    ];

    const dealsMetrics = deriveDealsReport(orders, []);
    expect(dealsMetrics.dealsSold).toBe(2);
    expect(dealsMetrics.dealRevenue).toBe(1000);
    expect(dealsMetrics.dealCost).toBe(600);
    expect(dealsMetrics.dealGrossProfit).toBe(400);
  });

  // --- 14. EMPTY DEAL PRICE MUST NOT BE TREATED AS ZERO ---
  it('14. does NOT treat empty or invalid deal price as zero (saving and profit remain null)', () => {
    const includedItems = [
      { itemId: 'item_1', name: 'Item 1', quantity: 1, sellingPrice: 700, costPrice: 400 },
      { itemId: 'item_2', name: 'Item 2', quantity: 1, sellingPrice: 540, costPrice: 540 },
    ]; // Regular = 1240, Cost = 940

    // Test with empty string ""
    const emptyStringFin = calculateDealFinancials(includedItems, '');
    expect(emptyStringFin.regularPrice).toBe(1240);
    expect(emptyStringFin.totalCost).toBe(940);
    expect(emptyStringFin.customerSaving).toBeNull(); // NOT 1240!
    expect(emptyStringFin.estimatedGrossProfit).toBeNull(); // NOT -940!
    expect(emptyStringFin.profitMargin).toBeNull();
    expect(emptyStringFin.isDealPriceProvided).toBe(false);

    // Test with null
    const nullFin = calculateDealFinancials(includedItems, null);
    expect(nullFin.customerSaving).toBeNull();
    expect(nullFin.estimatedGrossProfit).toBeNull();

    // Test with undefined
    const undefinedFin = calculateDealFinancials(includedItems, undefined);
    expect(undefinedFin.customerSaving).toBeNull();
    expect(undefinedFin.estimatedGrossProfit).toBeNull();

    // Test with spaces only
    const spacesFin = calculateDealFinancials(includedItems, '   ');
    expect(spacesFin.customerSaving).toBeNull();
    expect(spacesFin.estimatedGrossProfit).toBeNull();
  });

  // --- 15. USER EXAMPLE: REGULAR 1240, DEAL 1100, COST 940 ---
  it('15. calculates exact user example: Regular 1240, Deal 1100, Cost 940 -> Saving 140, Gross Profit 160', () => {
    const includedItems = [
      { itemId: 'item_1', name: 'Component 1', quantity: 1, sellingPrice: 800, costPrice: 600 },
      { itemId: 'item_2', name: 'Component 2', quantity: 1, sellingPrice: 440, costPrice: 340 },
    ]; // Regular = 1240, Cost = 940
    const dealPrice = 1100;

    const fin = calculateDealFinancials(includedItems, dealPrice);

    expect(fin.regularPrice).toBe(1240);
    expect(fin.totalCost).toBe(940);
    expect(fin.customerSaving).toBe(140); // 1240 - 1100
    expect(fin.estimatedGrossProfit).toBe(160); // 1100 - 940
  });

  // --- 16. DEAL PRICE 0 EDGE CASE ---
  it('16. handles deal price = 0 correctly as an explicitly entered zero price', () => {
    const includedItems = [
      { itemId: 'item_1', name: 'Item 1', quantity: 1, sellingPrice: 1240, costPrice: 940 },
    ];
    const dealPrice = 0;

    const fin = calculateDealFinancials(includedItems, dealPrice);

    expect(fin.regularPrice).toBe(1240);
    expect(fin.totalCost).toBe(940);
    expect(fin.isDealPriceProvided).toBe(true);
    expect(fin.customerSaving).toBe(1240); // 1240 - 0
    expect(fin.estimatedGrossProfit).toBe(-940); // 0 - 940
  });

  // --- 17. DEAL PRICE ABOVE REGULAR EDGE CASE ---
  it('17. handles deal price above regular price correctly', () => {
    const includedItems = [
      { itemId: 'item_1', name: 'Item 1', quantity: 1, sellingPrice: 1000, costPrice: 600 },
    ];
    const dealPrice = 1200;

    const fin = calculateDealFinancials(includedItems, dealPrice);

    expect(fin.regularPrice).toBe(1000);
    expect(fin.totalCost).toBe(600);
    expect(fin.customerSaving).toBe(-200); // 1000 - 1200
    expect(fin.estimatedGrossProfit).toBe(600); // 1200 - 600
  });
});
