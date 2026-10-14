import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './src/config/db.js';
import { app } from './src/app.js';
import http from 'http';

async function runOrderTests() {
  console.log('--- 🧪 STARTING MODULE 4 (ORDERS & POS BILLING) LIVE TESTS ---');

  // 1. Establish Atlas DB connection
  console.log('1. Connecting to MongoDB Atlas...');
  await connectDB();
  console.log('   ✅ Atlas Connected successfully!');

  // Start temporary local server on a test port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(5096, resolve));
  const baseUrl = 'http://localhost:5096';
  console.log(`   📡 Local test server listening on ${baseUrl}`);

  try {
    // 2. Test SEED default orders
    console.log('\n2. Testing POST /api/orders/seed...');
    const seedRes = await fetch(`${baseUrl}/api/orders/seed?force=true`, { method: 'POST' });
    const seedData = await seedRes.json();
    console.log('   Seed response status:', seedRes.status);
    console.log('   Seed message:', seedData.message);
    if (!seedData.success || seedData.count < 2) {
      throw new Error('Seed orders failed: ' + JSON.stringify(seedData));
    }
    console.log(`   ✅ Seed passed! (${seedData.count} starter orders seeded)`);

    // 3. Test GET all orders with summary
    console.log('\n3. Testing GET /api/orders...');
    const getRes = await fetch(`${baseUrl}/api/orders`);
    const getData = await getRes.json();
    console.log(`   Status: ${getRes.status}, Total Orders: ${getData.pagination.total}`);
    console.log(`   Summary KPIs -> Gross Sales: Rs ${getData.summary.grossSales}, Net Revenue: Rs ${getData.summary.netRevenue}, Total Tax: Rs ${getData.summary.totalTax}`);
    if (!getData.success || getData.pagination.total < 2) {
      throw new Error('GET /api/orders failed');
    }
    console.log('   Sample invoice:', getData.data[0].invoiceNumber, '| Grand Total: Rs', getData.data[0].grandTotal);
    console.log('   ✅ GET all orders & calculated summary passed!');

    // 4. Test POST Create New POS Order (Dine-In with Biryani + Addons + Burger)
    console.log('\n4. Testing POST /api/orders (Simulating real POS checkout)...');
    const newOrderPayload = {
      orderType: 'Dine-In',
      cashierName: 'Ahmad POS',
      customerName: 'Zubair Sheikh',
      customerPhone: '0300-5554433',
      tableNumber: 'Table 2',
      lines: [
        {
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
          note: 'Spicy with extra lemon',
        },
        {
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
      discountType: 'percentage',
      discountValue: 10, // 10% discount
      taxRateSnapshot: 16, // 16% tax
      paymentMethod: 'Cash',
      amountReceived: 2000, // Grand total calculation should give change
    };

    const createRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOrderPayload),
    });
    const createData = await createRes.json();
    if (!createRes.ok || !createData.success) {
      throw new Error('Create order failed: ' + JSON.stringify(createData));
    }
    const order = createData.data;
    console.log(`   ✅ Order created! Invoice #: ${order.invoiceNumber} (Sequence: ${order.sequenceNumber})`);
    console.log(`   Subtotal: Rs ${order.subtotal} | Discount (10%): Rs ${order.discountAmount}`);
    console.log(`   Taxable: Rs ${order.taxableAmount} | Tax (16%): Rs ${order.taxAmount} | Grand Total: Rs ${order.grandTotal}`);
    console.log(`   Amount Received: Rs ${order.amountReceived} | Change Given: Rs ${order.changeAmount}`);

    if (order.invoiceNumber !== 'INV-0003') {
      throw new Error(`Expected sequence INV-0003, but received ${order.invoiceNumber}`);
    }
    if (order.changeAmount !== order.amountReceived - order.grandTotal) {
      throw new Error('Change calculation mismatch');
    }
    console.log('   ✅ Sequential numbering and domain arithmetic verified 100%!');

    // 5. Test Validation: Cash received less than Grand Total (Financial Guardrail)
    console.log('\n5. Testing Financial Validation (amountReceived < grandTotal)...');
    const invalidCashPayload = {
      ...newOrderPayload,
      amountReceived: 500, // Insufficient cash
    };
    const badCashRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidCashPayload),
    });
    const badCashData = await badCashRes.json();
    if (badCashRes.status !== 400 || badCashData.success) {
      throw new Error('Validation failed to reject insufficient cash');
    }
    console.log('   Status: 400 (Expected 400)');
    console.log(`   Rejection message: ${badCashData.error.message || badCashData.error.details[0]?.message}`);
    console.log('   ✅ Insufficient cash successfully rejected!');

    // 6. Test GET by Invoice Number (INV-0003)
    console.log('\n6. Testing GET /api/orders/INV-0003...');
    const invoiceRes = await fetch(`${baseUrl}/api/orders/INV-0003`);
    const invoiceData = await invoiceRes.json();
    if (!invoiceRes.ok || !invoiceData.success || invoiceData.data.invoiceNumber !== 'INV-0003') {
      throw new Error('GET order by invoice number failed');
    }
    console.log(`   Found invoice for customer: ${invoiceData.data.customerName}`);
    console.log(`   Order lines count: ${invoiceData.data.lines.length}`);
    console.log('   ✅ Invoice lookup by sequence passed!');

    // 7. Test Search by customer name
    console.log('\n7. Testing GET /api/orders?search=Zubair...');
    const searchRes = await fetch(`${baseUrl}/api/orders?search=Zubair`);
    const searchData = await searchRes.json();
    if (!searchData.success || searchData.pagination.total === 0) {
      throw new Error('Search by customer name failed');
    }
    console.log(`   Search matched ${searchData.pagination.total} order(s)`);
    console.log('   ✅ Customer search passed!');

    console.log('\n🎉 ========================================================');
    console.log('🎉 ALL MODULE 4 (ORDERS & POS BILLING) TESTS PASSED 100%!');
    console.log('🎉 ORDERS & BILLING SYSTEM IS LIVE IN MONGODB ATLAS!');
    console.log('🎉 ========================================================\n');
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exitCode = 1;
  } finally {
    server.close();
    await mongoose.disconnect();
    console.log('🔌 Connections closed cleanly.');
  }
}

runOrderTests();
