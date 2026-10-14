/**
 * Domain Calculation Utilities
 * Pure financial and measurement functions
 * Follows decimal-safe arithmetic and rules defined in PRD & TRD
 */

/**
 * Calculates price for weight-based items
 * portion price = basePricePerKg * grams / 1000
 */
export function calculateWeightPrice(basePricePerKg, grams) {
  if (!basePricePerKg || !grams || grams <= 0) return 0;
  return Math.round((basePricePerKg * grams) / 1000);
}

/**
 * Derives grams from custom rupee amount
 * grams = enteredAmount / basePricePerKg * 1000
 */
export function calculateWeightFromAmount(basePricePerKg, enteredAmount) {
  if (!basePricePerKg || !enteredAmount || enteredAmount <= 0) return 0;
  return Math.round((enteredAmount / basePricePerKg) * 1000);
}

/**
 * Calculates total of selected add-ons
 */
export function calculateAddonTotal(addons = []) {
  return addons.reduce(
    (sum, addon) =>
      sum +
      (Number(addon.price) || 0) *
        (addon.quantity !== undefined ? Math.max(0, Number(addon.quantity)) : 1),
    0
  );
}

/**
 * Calculates configured item price (base/portion price + addon total)
 */
export function calculateConfiguredItemPrice(baseOrPortionPrice, addonTotal = 0) {
  return Math.max(0, (Number(baseOrPortionPrice) || 0) + (Number(addonTotal) || 0));
}

/**
 * Calculates single line item subtotal
 */
export function calculateLineSubtotal(unitPrice, addonsTotal = 0, quantity = 1) {
  return Math.max(0, ((Number(unitPrice) || 0) + (Number(addonsTotal) || 0)) * Math.max(1, quantity));
}

/**
 * Calculates raw subtotal of order lines
 */
export function calculateOrderSubtotal(lines = []) {
  return lines.reduce((sum, line) => sum + (Number(line.lineSubtotal) || 0), 0);
}

/**
 * Calculates raw subtotal of cart lines (alias of calculateOrderSubtotal)
 */
export const calculateCartSubtotal = calculateOrderSubtotal;

/**
 * Calculates discount amount
 */
export function calculateDiscount(subtotal, discountType, discountValue) {
  if (!discountValue || discountValue <= 0 || subtotal <= 0) return 0;
  if (discountType === 'percentage') {
    return Math.round((subtotal * Math.min(100, discountValue)) / 100);
  }
  return Math.min(subtotal, Math.round(Number(discountValue) || 0));
}

/**
 * Calculates tax on taxable amount
 */
export function calculateTax(taxableAmount, taxRatePercent) {
  if (!taxRatePercent || taxRatePercent <= 0 || taxableAmount <= 0) return 0;
  return Math.round((taxableAmount * taxRatePercent) / 100);
}

/**
 * Calculates grand total
 */
export function calculateGrandTotal(discountedSubtotal, taxAmount) {
  return Math.max(0, (Number(discountedSubtotal) || 0) + (Number(taxAmount) || 0));
}

/**
 * Calculates change amount for cash payments
 */
export function calculateChange(amountReceived, grandTotal) {
  if (!amountReceived || amountReceived < grandTotal) return 0;
  return Math.round(amountReceived - grandTotal);
}

/**
 * Generates formatted invoice number (e.g. INV-1016)
 */
export function generateInvoiceNumber(prefix = 'INV-', sequenceNumber = 1) {
  const p = prefix || 'INV-';
  return `${p}${String(sequenceNumber).padStart(4, '0')}`;
}

/**
 * Currency formatter for Pakistani Rupee (PKR)
 */
export function formatCurrency(amount) {
  const val = Math.round(Number(amount) || 0);
  return `Rs ${val.toLocaleString()}`;
}

/**
 * Calculates deterministic COGS for weight-based sales
 * COGS = (grams / 1000) * costPricePerKg
 * Example: 200g of Rs 600/kg cost = (200 / 1000) * 600 = Rs 120
 */
export function calculateWeightCost(costPricePerKg, grams) {
  if (costPricePerKg === undefined || costPricePerKg === null || grams === undefined || grams === null || grams <= 0) {
    return 0;
  }
  return Math.round((Number(costPricePerKg) * Number(grams)) / 1000);
}

/**
 * Builds deterministic historical order line snapshots including cost, COGS,
 * proportional discount allocation, net revenue, and gross profit.
 *
 * Implements:
 * - Tax is NEVER included in revenue or profit.
 * - Order discount allocated proportionally by eligible line gross sale.
 * - Missing cost is preserved as null (never assumed zero).
 * - Snapshot frozen at order completion time.
 */
export function buildOrderLineSnapshots(cartLines = [], itemsMaster = [], addonsMaster = [], orderDiscountAmount = 0) {
  if (!Array.isArray(cartLines) || cartLines.length === 0) return [];

  const totalSubtotal = cartLines.reduce(
    (sum, line) => sum + (Number(line.lineSubtotal ?? (Number(line.unitPrice || 0) * (Number(line.quantity) || 1))) || 0),
    0
  );
  const parsedDiscount = Math.min(totalSubtotal, Math.max(0, Number(orderDiscountAmount) || 0));

  let allocatedDiscountRunningSum = 0;

  return cartLines.map((line, idx) => {
    const isLastLine = idx === cartLines.length - 1;
    const quantitySnapshot = Math.max(1, Number(line.quantity) || 1);
    const sellingPriceSnapshot = Number(line.unitPrice) || 0;
    const grossLineSale = Number(line.lineSubtotal) || (sellingPriceSnapshot * quantitySnapshot);

    // Addon sales breakdown
    const rawAddons = Array.isArray(line.addonSnapshots)
      ? line.addonSnapshots
      : Array.isArray(line.addons)
      ? line.addons
      : Array.isArray(line.selectedAddons)
      ? line.selectedAddons
      : [];
    const addonGrossSale =
      rawAddons.reduce(
        (sum, a) =>
          sum +
          (Number(a?.price ?? a?.sellingPrice) || 0) *
            (a?.quantity !== undefined ? Math.max(1, Number(a.quantity)) : 1),
        0
      ) * quantitySnapshot;
    const itemGrossSale = Math.max(0, grossLineSale - addonGrossSale);

    // Proportional Discount Allocation
    let allocatedDiscount = 0;
    if (parsedDiscount > 0 && totalSubtotal > 0) {
      if (isLastLine) {
        allocatedDiscount = Math.max(0, parsedDiscount - allocatedDiscountRunningSum);
      } else {
        allocatedDiscount = Math.round((grossLineSale / totalSubtotal) * parsedDiscount);
        allocatedDiscountRunningSum += allocatedDiscount;
      }
    }
    const netRevenue = Math.max(0, grossLineSale - allocatedDiscount);

    // Item Cost Lookup from line or catalog if not already frozen on line
    const catalogItem = Array.isArray(itemsMaster)
      ? itemsMaster.find(
          (it) => it && (it.id === line.itemId || String(it.id).toLowerCase() === String(line.itemId).toLowerCase())
        )
      : null;

    let costPriceSnapshot = null;
    if (line.costPriceSnapshot !== undefined && line.costPriceSnapshot !== null) {
      costPriceSnapshot = Number(line.costPriceSnapshot);
    } else if (line.costPrice !== undefined && line.costPrice !== null) {
      costPriceSnapshot = Number(line.costPrice);
    } else if (line.costPricePerKg !== undefined && line.costPricePerKg !== null) {
      costPriceSnapshot = Number(line.costPricePerKg);
    } else if (catalogItem?.costPrice !== undefined && catalogItem?.costPrice !== null) {
      costPriceSnapshot = Number(catalogItem.costPrice);
    }

    const hasValidItemCost =
      costPriceSnapshot !== null && !isNaN(costPriceSnapshot) && costPriceSnapshot >= 0;

    // Weight detection
    const isWeight =
      line.pricingMode === 'portion' ||
      line.pricingMode === 'custom_weight' ||
      (line.selectedWeightGrams !== undefined && line.selectedWeightGrams !== null && line.selectedWeightGrams > 0);

    const weightGramsSnapshot = isWeight ? Number(line.selectedWeightGrams) || 0 : null;

    // Item COGS
    let itemCOGS = null;
    if (hasValidItemCost) {
      if (isWeight) {
        itemCOGS = Math.round((weightGramsSnapshot / 1000) * costPriceSnapshot * quantitySnapshot);
      } else {
        itemCOGS = Math.round(costPriceSnapshot * quantitySnapshot);
      }
    }

    // Addons COGS
    const addonSnapshotsWithCost = rawAddons.map((a) => {
      let addonCost = null;
      if (a?.costPrice !== undefined && a?.costPrice !== null) {
        addonCost = Number(a.costPrice);
      } else if (Array.isArray(addonsMaster)) {
        const found = addonsMaster.find(
          (am) =>
            am &&
            (am.id === a.id ||
              String(am.id).toLowerCase() === String(a.id).toLowerCase() ||
              (am.name && a.name && am.name.trim().toLowerCase() === a.name.trim().toLowerCase()))
        );
        if (found?.costPrice !== undefined && found?.costPrice !== null) {
          addonCost = Number(found.costPrice);
        }
      }
      if (addonCost === null && Array.isArray(catalogItem?.addons)) {
        const foundItemAddon = catalogItem.addons.find(
          (ia) =>
            ia &&
            (ia.id === a.id ||
              (ia.name && a.name && ia.name.trim().toLowerCase() === a.name.trim().toLowerCase()))
        );
        if (foundItemAddon?.costPrice !== undefined && foundItemAddon?.costPrice !== null) {
          addonCost = Number(foundItemAddon.costPrice);
        }
      }
      return {
        ...a,
        quantity: a?.quantity !== undefined ? Math.max(1, Number(a.quantity)) : 1,
        costPrice: addonCost,
      };
    });

    const addonCOGS = addonSnapshotsWithCost.reduce(
      (sum, a) =>
        sum +
        (Number(a?.costPrice) || 0) *
          (a?.quantity !== undefined ? Math.max(1, Number(a.quantity)) : 1) *
          quantitySnapshot,
      0
    );

    // Total COGS, Gross Profit & Margin
    let totalCOGS = null;
    let grossProfit = null;
    let grossProfitMargin = null;
    const hasCost = hasValidItemCost || (addonSnapshotsWithCost.length > 0 && addonCOGS > 0);

    if (hasCost) {
      totalCOGS = Math.round((itemCOGS || 0) + addonCOGS);
      grossProfit = netRevenue - totalCOGS;
      grossProfitMargin = netRevenue > 0 ? Number(((grossProfit / netRevenue) * 100).toFixed(2)) : 0;
    }

    return {
      ...line,
      quantitySnapshot,
      weightGramsSnapshot,
      sellingPriceSnapshot,
      costPriceSnapshot: hasValidItemCost ? costPriceSnapshot : null,
      addonSnapshots: addonSnapshotsWithCost,
      itemGrossSale,
      addonGrossSale,
      grossLineSale,
      allocatedDiscount,
      netRevenue,
      itemCOGS,
      addonCOGS,
      totalCOGS,
      grossProfit,
      grossProfitMargin,
      hasCost,
    };
  });
}
