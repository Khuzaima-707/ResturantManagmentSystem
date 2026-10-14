import mongoose from 'mongoose';
import { Order } from '../models/Order.js';
import { isDbConnected } from '../config/db.js';

function getStartOfDay(d = new Date()) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getEndOfDay(d = new Date()) {
  const date = new Date(d);
  date.setHours(23, 59, 59, 999);
  return date;
}

function getStartOfWeek(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getEndOfWeek(d = new Date()) {
  const start = getStartOfWeek(d);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function getStartOfMonth(d = new Date()) {
  const date = new Date(d);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getEndOfMonth(d = new Date()) {
  const date = new Date(d);
  date.setMonth(date.getMonth() + 1, 0);
  date.setHours(23, 59, 59, 999);
  return date;
}

/**
 * Calculates date range boundaries based on named preset or custom dates
 */
function resolveDateRange(datePreset, startDate, endDate) {
  const now = new Date();
  if (datePreset === 'Today') {
    return { $gte: getStartOfDay(now), $lte: getEndOfDay(now) };
  }
  if (datePreset === 'This Week') {
    return {
      $gte: getStartOfWeek(now),
      $lte: getEndOfWeek(now),
    };
  }
  if (datePreset === 'This Month') {
    return { $gte: getStartOfMonth(now), $lte: getEndOfMonth(now) };
  }
  if (datePreset === 'Custom' && startDate && endDate) {
    try {
      const s = new Date(startDate);
      const e = new Date(endDate);
      return { $gte: getStartOfDay(s), $lte: getEndOfDay(e) };
    } catch {
      // Fallback
    }
  }
  return null;
}

/**
 * POST /api/orders
 * Creates a completed order with snapshot lines, auto-incremented invoice number,
 * and server-validated pure domain calculations.
 */
export async function createOrder(req, res, next) {
  try {
    const body = { ...req.body };

    // 1. Calculate each line's subtotal and addons
    const calculatedLines = body.lines.map((l, index) => {
      const addonsTotal = (l.addonSnapshots || []).reduce(
        (sum, a) => sum + (Number(a.price) || 0),
        0
      );
      const unitPrice = Number(l.unitPrice) || 0;
      const quantity = Math.max(1, Math.floor(Number(l.quantity) || 1));
      const lineSubtotal = Math.round((unitPrice + addonsTotal) * quantity);

      return {
        id: l.id || `line-${index + 1}-${Date.now()}`,
        itemId: l.itemId,
        itemNameSnapshot: l.itemNameSnapshot,
        itemImageSnapshot: l.itemImageSnapshot || '',
        categoryIdSnapshot: l.categoryIdSnapshot || '',
        pricingMode: l.pricingMode || 'piece',
        selectedPortionLabel: l.selectedPortionLabel || '',
        selectedWeightGrams: Number(l.selectedWeightGrams) || 0,
        baseUnitSnapshot: l.baseUnitSnapshot || 'piece',
        basePriceSnapshot: Number(l.basePriceSnapshot) || 0,
        addonSnapshots: l.addonSnapshots || [],
        addonsTotal,
        unitPrice,
        quantity,
        lineSubtotal,
        note: l.note || '',
      };
    });

    // 2. Calculate Order Financials
    const subtotal = calculatedLines.reduce((sum, l) => sum + l.lineSubtotal, 0);

    let discountAmount = 0;
    const discountValue = Number(body.discountValue) || 0;
    if (body.discountType === 'percentage') {
      discountAmount = Math.round((subtotal * Math.min(100, discountValue)) / 100);
    } else if (body.discountType === 'fixed') {
      discountAmount = Math.min(subtotal, Math.round(discountValue));
    }

    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxRateSnapshot = Number(body.taxRateSnapshot) || 0;
    const taxAmount = Math.round((taxableAmount * taxRateSnapshot) / 100);
    const grandTotal = Math.max(0, taxableAmount + taxAmount);

    let amountReceived = Number(body.amountReceived) || 0;
    let changeAmount = 0;

    if (body.paymentMethod === 'Cash') {
      if (amountReceived < grandTotal) {
        return res.status(400).json({
          success: false,
          error: {
            message: `Insufficient cash received. Required: Rs ${grandTotal}, Received: Rs ${amountReceived}`,
          },
        });
      }
      changeAmount = Math.max(0, amountReceived - grandTotal);
    } else {
      // For Card / Online, amount received equals grand total
      amountReceived = grandTotal;
      changeAmount = 0;
    }

    // 3. Generate sequential invoice number atomically
    const lastOrder = await Order.findOne().sort({ sequenceNumber: -1 });
    const sequenceNumber = lastOrder && lastOrder.sequenceNumber ? lastOrder.sequenceNumber + 1 : 1;
    const invoicePrefix = body.invoicePrefix || 'INV-';
    const invoiceNumber = `${invoicePrefix}${String(sequenceNumber).padStart(4, '0')}`;

    // 4. Order ID
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const id = body.id || `ord-${Date.now()}-${randomSuffix}`;

    const orderPayload = {
      id,
      invoiceNumber,
      sequenceNumber,
      status: 'completed',
      orderType: body.orderType || 'Dine-In',
      guestCount: body.orderType === 'Takeaway' ? (Number(body.guestCount) || 1) : (Number(body.guestCount) || 1),
      cashierName: body.cashierName || 'Cashier 1',
      customerName: body.customerName || '',
      customerPhone: body.customerPhone || '',
      tableNumber: body.tableNumber || '',
      lines: calculatedLines,
      subtotal,
      discountType: body.discountType || 'none',
      discountValue,
      discountAmount,
      taxableAmount,
      taxRateSnapshot,
      taxAmount,
      grandTotal,
      paymentMethod: body.paymentMethod || 'Cash',
      amountReceived,
      changeAmount,
      completedAt: new Date(),
    };

    const createdOrder = await Order.create(orderPayload);

    return res.status(201).json({
      success: true,
      message: `Sale completed successfully. Invoice #${invoiceNumber}`,
      data: createdOrder,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/orders
 * Returns orders with rich filtering, search, pagination, and calculated summary metrics
 */
export async function getAllOrders(req, res, next) {
  try {
    if (!isDbConnected()) {
      return res.status(200).json({
        success: true,
        count: 0,
        total: 0,
        page: 1,
        totalPages: 1,
        data: [],
        metrics: {
          grossSales: 0,
          netRevenue: 0,
          totalTax: 0,
          reversalsTotal: 0,
          totalItemsSold: 0,
          averageOrderValue: 0,
          completedOrdersCount: 0,
        },
        offline: true,
      });
    }

    const {
      status,
      orderType,
      paymentMethod,
      datePreset,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 50,
      sort = '-completedAt',
    } = req.query;

    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (orderType && orderType !== 'all') {
      filter.orderType = orderType;
    }

    if (paymentMethod && paymentMethod !== 'all') {
      filter.paymentMethod = paymentMethod;
    }

    const dateRange = resolveDateRange(datePreset, startDate, endDate);
    if (dateRange) {
      filter.completedAt = dateRange;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { invoiceNumber: searchRegex },
        { customerName: searchRegex },
        { customerPhone: searchRegex },
        { tableNumber: searchRegex },
        { 'lines.itemNameSnapshot': searchRegex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const sortOptions = {};
    if (sort === '-completedAt') sortOptions.completedAt = -1;
    else if (sort === 'completedAt') sortOptions.completedAt = 1;
    else if (sort === '-grandTotal') sortOptions.grandTotal = -1;
    else if (sort === 'grandTotal') sortOptions.grandTotal = 1;
    else sortOptions.completedAt = -1;

    const [orders, totalMatching] = await Promise.all([
      Order.find(filter).sort(sortOptions).skip(skip).limit(limitNum),
      Order.countDocuments(filter),
    ]);

    // Calculate aggregated metrics for the filtered view
    const allMatching = await Order.find(filter);
    const grossSales = allMatching.reduce((s, o) => s + (o.grandTotal || 0), 0);
    const validOrders = allMatching.filter((o) => o.status !== 'reversed');
    const reversedOrders = allMatching.filter((o) => o.status === 'reversed');

    const netRevenue = validOrders.reduce((s, o) => s + (o.grandTotal - (o.taxAmount || 0)), 0);
    const totalTax = validOrders.reduce((s, o) => s + (o.taxAmount || 0), 0);
    const reversalsTotal = reversedOrders.reduce((s, o) => s + (o.grandTotal || 0), 0);
    const totalItemsSold = validOrders.reduce(
      (s, o) => s + o.lines.reduce((ls, l) => ls + (l.quantity || 1), 0),
      0
    );

    return res.status(200).json({
      success: true,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalMatching,
        pages: Math.ceil(totalMatching / limitNum) || 1,
      },
      summary: {
        totalOrders: allMatching.length,
        validOrdersCount: validOrders.length,
        reversedOrdersCount: reversedOrders.length,
        grossSales,
        netRevenue,
        totalTax,
        reversalsTotal,
        totalItemsSold,
        averageOrderValue:
          validOrders.length > 0
            ? Math.round(
                validOrders.reduce((s, o) => s + (o.grandTotal || 0), 0) / validOrders.length
              )
            : 0,
      },
      data: orders,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/orders/:id
 * Retrieve order by custom id, invoiceNumber (e.g. INV-0001), or MongoDB _id
 */
export async function getOrderById(req, res, next) {
  try {
    const { id } = req.params;

    let order = await Order.findOne({ id });

    if (!order) {
      order = await Order.findOne({ invoiceNumber: id.toUpperCase() });
    }

    if (!order && mongoose.Types.ObjectId.isValid(id)) {
      order = await Order.findById(id);
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        error: { message: `Order '${id}' not found` },
      });
    }

    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/orders/:id/kitchen-status
 * Updates the kitchen preparation status ('received' | 'preparing' | 'ready' | 'served')
 */
export async function updateKitchenStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { kitchenStatus } = req.body;

    const allowed = ['received', 'preparing', 'ready', 'served'];
    if (!kitchenStatus || !allowed.includes(kitchenStatus)) {
      return res.status(400).json({
        success: false,
        error: { message: `Invalid kitchen status. Must be one of: ${allowed.join(', ')}` },
      });
    }

    let order = await Order.findOne({ id });
    if (!order && mongoose.Types.ObjectId.isValid(id)) {
      order = await Order.findById(id);
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        error: { message: `Order '${id}' not found` },
      });
    }

    order.kitchenStatus = kitchenStatus;
    await order.save();

    return res.status(200).json({
      success: true,
      message: `Kitchen status updated to '${kitchenStatus}'`,
      data: order,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/orders/seed
 * Seeds realistic starter orders for testing POS, receipts, and reporting
 */
export async function seedOrders(req, res, next) {
  try {
    const { force = false } = req.query;

    if (force === 'true' || force === true) {
      await Order.deleteMany({});
    }

    const count = await Order.countDocuments();
    if (count > 0 && !force) {
      return res.status(200).json({
        success: true,
        message: `Orders already seeded. Total orders: ${count}`,
        count,
      });
    }

    const sampleOrders = [
      {
        id: 'ord-sample-01',
        invoiceNumber: 'INV-0001',
        sequenceNumber: 1,
        status: 'completed',
        orderType: 'Dine-In',
        cashierName: 'Cashier 1',
        customerName: 'Usman Ali',
        customerPhone: '0300-1234567',
        tableNumber: 'Table 4',
        lines: [
          {
            id: 'l1',
            itemId: 'item-1',
            itemNameSnapshot: 'Special Chicken Biryani',
            categoryIdSnapshot: 'cat-biryani',
            pricingMode: 'portion',
            selectedPortionLabel: '500g',
            selectedWeightGrams: 500,
            baseUnitSnapshot: 'kg',
            basePriceSnapshot: 1000,
            addonSnapshots: [
              { id: 'addon-raita', name: 'Zeera Raita', price: 60 },
              { id: 'addon-salad', name: 'Fresh Kachumber Salad', price: 80 },
            ],
            addonsTotal: 140,
            unitPrice: 500,
            quantity: 2,
            lineSubtotal: 1280, // (500 + 140) * 2
            note: 'Less spicy',
          },
          {
            id: 'l2',
            itemId: 'item-2',
            itemNameSnapshot: 'Crispy Zinger Burger',
            categoryIdSnapshot: 'cat-burgers',
            pricingMode: 'piece',
            baseUnitSnapshot: 'piece',
            basePriceSnapshot: 480,
            addonSnapshots: [{ id: 'addon-cheese', name: 'Cheddar Cheese Slice', price: 70 }],
            addonsTotal: 70,
            unitPrice: 480,
            quantity: 1,
            lineSubtotal: 550, // (480 + 70) * 1
          },
        ],
        subtotal: 1830,
        discountType: 'none',
        discountValue: 0,
        discountAmount: 0,
        taxableAmount: 1830,
        taxRateSnapshot: 16,
        taxAmount: 293, // 1830 * 0.16 = 292.8 -> 293
        grandTotal: 2123,
        paymentMethod: 'Cash',
        amountReceived: 2500,
        changeAmount: 377,
        completedAt: new Date(Date.now() - 3600000 * 2), // 2 hours ago
      },
      {
        id: 'ord-sample-02',
        invoiceNumber: 'INV-0002',
        sequenceNumber: 2,
        status: 'completed',
        orderType: 'Takeaway',
        cashierName: 'Cashier 1',
        customerName: 'Farhan Khan',
        customerPhone: '0321-9876543',
        lines: [
          {
            id: 'l3',
            itemId: 'item-2',
            itemNameSnapshot: 'Crispy Zinger Burger',
            categoryIdSnapshot: 'cat-burgers',
            pricingMode: 'piece',
            baseUnitSnapshot: 'piece',
            basePriceSnapshot: 480,
            addonSnapshots: [{ id: 'addon-fries', name: 'Mini French Fries', price: 120 }],
            addonsTotal: 120,
            unitPrice: 480,
            quantity: 2,
            lineSubtotal: 1200,
          },
        ],
        subtotal: 1200,
        discountType: 'fixed',
        discountValue: 100,
        discountAmount: 100,
        taxableAmount: 1100,
        taxRateSnapshot: 16,
        taxAmount: 176,
        grandTotal: 1276,
        paymentMethod: 'Card',
        amountReceived: 1276,
        changeAmount: 0,
        completedAt: new Date(Date.now() - 3600000), // 1 hour ago
      },
    ];

    await Order.insertMany(sampleOrders);

    return res.status(200).json({
      success: true,
      message: 'Sample orders seeded successfully in MongoDB Atlas.',
      count: sampleOrders.length,
      data: sampleOrders,
    });
  } catch (error) {
    next(error);
  }
}
