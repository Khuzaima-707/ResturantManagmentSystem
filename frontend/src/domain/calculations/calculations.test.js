import { describe, it, expect } from 'vitest';
import {
  calculateWeightPrice,
  calculateWeightFromAmount,
  calculateAddonTotal,
  calculateLineSubtotal,
  calculateFlatLineSubtotal,
  calculateOrderSubtotal,
  calculateDiscount,
  calculateTax,
  calculateGrandTotal,
  calculateChange,
  calculateWeightCost,
  buildOrderLineSnapshots,
} from './index';
import { suggestCategory, getCompatibleAddons } from '../rules/index';

describe('Domain Calculations & Pricing', () => {
  it('calculates portion prices correctly for 250g, 500g, 750g, 1000g on a Rs 1,000/kg item', () => {
    const basePrice = 1000;
    expect(calculateWeightPrice(basePrice, 250)).toBe(250);
    expect(calculateWeightPrice(basePrice, 500)).toBe(500);
    expect(calculateWeightPrice(basePrice, 750)).toBe(750);
    expect(calculateWeightPrice(basePrice, 1000)).toBe(1000);
  });

  it('calculates custom rupee amount to derived grams correctly', () => {
    // Rs 100 on Rs 1,000/kg should give 100g
    expect(calculateWeightFromAmount(1000, 100)).toBe(100);
    // Rs 250 on Rs 1,000/kg should give 250g
    expect(calculateWeightFromAmount(1000, 250)).toBe(250);
  });

  it('calculates add-on totals correctly', () => {
    const addons = [{ price: 50 }, { price: 30 }, { price: 40 }];
    expect(calculateAddonTotal(addons)).toBe(120);
  });

  it('calculates single line subtotal with add-ons and quantity', () => {
    // Rs 450 burger + Rs 50 cheese, qty 2 = Rs 1,000
    expect(calculateLineSubtotal(450, 50, 2)).toBe(1000);
  });

  it('calculates flat line subtotal where add-ons apply to the entire line rather than per-item', () => {
    // 5 rolls @ Rs 200 + 2 sauces @ Rs 80 (Rs 160) = Rs 1,160
    expect(calculateFlatLineSubtotal(200, 160, 5)).toBe(1160);
    expect(calculateLineSubtotal(200, 160, 5, true)).toBe(1160);
  });

  it('calculates order subtotal and grand total', () => {
    const lines = [{ lineSubtotal: 1000 }, { lineSubtotal: 500 }];
    expect(calculateOrderSubtotal(lines)).toBe(1500);
    expect(calculateGrandTotal(1500, 240)).toBe(1740);
  });

  it('calculates percentage and fixed discounts', () => {
    expect(calculateDiscount(1000, 'percentage', 10)).toBe(100);
    expect(calculateDiscount(1000, 'fixed', 150)).toBe(150);
  });

  it('calculates tax accurately', () => {
    // 16% on Rs 1,000 = Rs 160
    expect(calculateTax(1000, 16)).toBe(160);
  });

  it('calculates cash change without negative values', () => {
    expect(calculateChange(1500, 1200)).toBe(300);
    expect(calculateChange(1000, 1200)).toBe(0);
  });

  describe('COGS & Gross Profit Calculations', () => {
    it('1. calculates piece-based item cost and COGS correctly', () => {
      // Zinger Burger: Selling 450, Cost 280, Qty 2 -> Gross: 900, COGS: 560, Profit: 340
      const cartLines = [
        {
          id: 'item-burger',
          name: 'Zinger Burger',
          pricingMode: 'fixed',
          unitPrice: 450,
          costPrice: 280,
          quantity: 2,
          lineSubtotal: 900,
        },
      ];
      const snapshots = buildOrderLineSnapshots(cartLines, [], [], 0);
      expect(snapshots[0].grossLineSale).toBe(900);
      expect(snapshots[0].itemCOGS).toBe(560);
      expect(snapshots[0].totalCOGS).toBe(560);
      expect(snapshots[0].netRevenue).toBe(900);
      expect(snapshots[0].grossProfit).toBe(340);
      expect(snapshots[0].grossProfitMargin).toBe(37.78);
    });

    it('2 & 3. calculates weight-based and rupee-based custom weight COGS deterministically', () => {
      // Selling / Kg = 1000, Cost / Kg = 600, Customer requests Rs 200 worth -> 200g
      // COGS = (200 / 1000) * 600 = 120, Gross Profit = 200 - 120 = 80
      const weightCost = calculateWeightCost(600, 200);
      expect(weightCost).toBe(120);

      const cartLines = [
        {
          id: 'item-biryani',
          name: 'Chicken Biryani',
          pricingMode: 'custom_weight',
          pricePerKg: 1000,
          costPricePerKg: 600,
          selectedWeightGrams: 200,
          unitPrice: 200,
          quantity: 1,
          lineSubtotal: 200,
        },
      ];
      const snapshots = buildOrderLineSnapshots(cartLines, [], [], 0);
      expect(snapshots[0].grossLineSale).toBe(200);
      expect(snapshots[0].itemCOGS).toBe(120);
      expect(snapshots[0].totalCOGS).toBe(120);
      expect(snapshots[0].netRevenue).toBe(200);
      expect(snapshots[0].grossProfit).toBe(80);
      expect(snapshots[0].grossProfitMargin).toBe(40);
    });

    it('4. calculates item with add-ons COGS accurately', () => {
      // Burger: selling 450, cost 280. Cheese Addon: selling 50, cost 30. Qty 1
      // Line Gross: 500. Item COGS: 280, Addon COGS: 30, Total COGS: 310, Profit: 190
      const cartLines = [
        {
          id: 'item-burger',
          name: 'Zinger Burger',
          pricingMode: 'fixed',
          unitPrice: 450,
          costPrice: 280,
          quantity: 1,
          lineSubtotal: 500,
          addons: [
            { id: 'addon-cheese', name: 'Extra Cheese', price: 50, costPrice: 30 },
          ],
        },
      ];
      const snapshots = buildOrderLineSnapshots(cartLines, [], [], 0);
      expect(snapshots[0].itemGrossSale).toBe(450);
      expect(snapshots[0].addonGrossSale).toBe(50);
      expect(snapshots[0].grossLineSale).toBe(500);
      expect(snapshots[0].itemCOGS).toBe(280);
      expect(snapshots[0].addonCOGS).toBe(30);
      expect(snapshots[0].totalCOGS).toBe(310);
      expect(snapshots[0].grossProfit).toBe(190);
      expect(snapshots[0].grossProfitMargin).toBe(38);
    });

    it('5 & 6. allocates order-level discount proportionally across multiple items without rounding drift', () => {
      // Biryani: Rs 200, Burger: Rs 400, Subtotal: Rs 600, Order Discount: Rs 60
      // Biryani allocated discount = 20, Burger allocated discount = 40
      // Net Revenues: Biryani = 180, Burger = 360
      const cartLines = [
        {
          id: 'biryani',
          name: 'Chicken Biryani',
          unitPrice: 200,
          costPrice: 120,
          quantity: 1,
          lineSubtotal: 200,
        },
        {
          id: 'burger',
          name: 'Zinger Burger',
          unitPrice: 400,
          costPrice: 250,
          quantity: 1,
          lineSubtotal: 400,
        },
      ];
      const snapshots = buildOrderLineSnapshots(cartLines, [], [], 60);
      expect(snapshots[0].allocatedDiscount).toBe(20);
      expect(snapshots[0].netRevenue).toBe(180);
      expect(snapshots[0].grossProfit).toBe(180 - 120); // 60

      expect(snapshots[1].allocatedDiscount).toBe(40);
      expect(snapshots[1].netRevenue).toBe(360);
      expect(snapshots[1].grossProfit).toBe(360 - 250); // 110

      // Sum of allocated discounts strictly equals order discount
      expect(snapshots[0].allocatedDiscount + snapshots[1].allocatedDiscount).toBe(60);
    });

    it('10. handles missing cost safely without assuming zero cost or reporting fake 100% margins', () => {
      const cartLines = [
        {
          id: 'mystery-item',
          name: 'Chef Secret Special',
          unitPrice: 500,
          costPrice: null, // No cost defined
          quantity: 1,
          lineSubtotal: 500,
        },
      ];
      const snapshots = buildOrderLineSnapshots(cartLines, [], [], 0);
      expect(snapshots[0].hasCost).toBe(false);
      expect(snapshots[0].itemCOGS).toBeNull();
      expect(snapshots[0].totalCOGS).toBeNull();
      expect(snapshots[0].grossProfit).toBeNull();
      expect(snapshots[0].grossProfitMargin).toBeNull();
    });
  });
});

describe('Domain Category Suggestion & Add-on Rules', () => {
  const categories = [
    { id: 'cat-1', name: 'Burgers', keywords: ['zinger', 'patty', 'beef burger'] },
    { id: 'cat-2', name: 'Biryani', keywords: ['chicken biryani', 'beef biryani', 'pulao'] },
    { id: 'cat-3', name: 'Pizza', keywords: ['fajita', 'tikka pizza', 'cheese slice'] },
  ];

  it('suggests correct category by item name', () => {
    const match1 = suggestCategory('Special Zinger Burger', categories);
    expect(match1?.id).toBe('cat-1');

    const match2 = suggestCategory('Hyderabadi Chicken Biryani', categories);
    expect(match2?.id).toBe('cat-2');
  });

  it('returns null when no safe match exists', () => {
    expect(suggestCategory('Unknown Random Item', categories)).toBeNull();
  });

  it('filters active compatible add-ons', () => {
    const addons = [
      { id: 'a1', name: 'Cheese', price: 50, status: 'active', categoryIds: ['cat-1'] },
      { id: 'a2', name: 'Raita', price: 30, status: 'active', categoryIds: ['cat-2'] },
      { id: 'a3', name: 'Inactive Item', price: 20, status: 'inactive', categoryIds: ['cat-1'] },
    ];

    const compatible = getCompatibleAddons(null, { id: 'cat-1' }, addons);
    expect(compatible.length).toBe(1);
    expect(compatible[0].name).toBe('Cheese');
  });
});
