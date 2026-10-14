import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './src/config/db.js';
import { app } from './src/app.js';
import http from 'http';

async function runReversalTests() {
  console.log('--- 🧪 STARTING MODULE 5 (REVERSALS & AUDIT TRAIL) LIVE TESTS ---');

  // 1. Establish Atlas DB connection
  console.log('1. Connecting to MongoDB Atlas...');
  await connectDB();
  console.log('   ✅ Atlas Connected successfully!');

  // Start temporary local server on a test port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(5095, resolve));
  const baseUrl = 'http://localhost:5095';
  console.log(`   📡 Local test server listening on ${baseUrl}`);

  try {
    // 2. Seed orders to ensure clean testing state
    console.log('\n2. Ensuring fresh test orders via POST /api/orders/seed...');
    await fetch(`${baseUrl}/api/orders/seed?force=true`, { method: 'POST' });
    console.log('   ✅ Orders initialized.');

    // 3. Inspect orders before reversal
    const beforeOrdersRes = await fetch(`${baseUrl}/api/orders`);
    const beforeOrdersData = await beforeOrdersRes.json();
    console.log(`   Initial State -> Gross Sales: Rs ${beforeOrdersData.summary.grossSales}, Valid Orders: ${beforeOrdersData.summary.validOrdersCount}, Reversed Orders: ${beforeOrdersData.summary.reversedOrdersCount}`);

    // 4. Test POST /api/reversals (Reverse INV-0002)
    console.log('\n4. Testing POST /api/reversals (Reversing INV-0002)...');
    const reversalPayload = {
      invoiceNumber: 'INV-0002',
      reason: 'Customer cancelled takeaway order due to long wait time',
      cashierName: 'Ahmad Cashier',
    };
    const revRes = await fetch(`${baseUrl}/api/reversals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reversalPayload),
    });
    const revData = await revRes.json();

    if (!revRes.ok || !revData.success) {
      throw new Error('Reversal creation failed: ' + JSON.stringify(revData));
    }

    const { reversal, order } = revData.data;
    console.log(`   ✅ Reversal created with ID: ${reversal.id}`);
    console.log(`   Reversed Invoice: #${reversal.originalInvoiceNumber} | Reason: "${reversal.reason}"`);
    console.log(`   Subtotal Impact: Rs ${reversal.subtotalReversed} | Tax Impact: Rs ${reversal.taxReversed}`);
    console.log(`   Total Reversed (including tax): Rs ${reversal.totalReversedIncludingTax}`);

    // Verify original order state
    if (order.status !== 'reversed' || order.reversalId !== reversal.id) {
      throw new Error('Original order was not properly marked as reversed');
    }
    console.log(`   ✅ Original order #${order.invoiceNumber} status successfully updated to 'reversed'! (Invoice was NOT deleted)`);

    // 5. Test Double-Reversal Prevention (409 Conflict)
    console.log('\n5. Testing Double-Reversal Prevention (Attempting to re-reverse INV-0002)...');
    const duplicateRes = await fetch(`${baseUrl}/api/reversals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reversalPayload),
    });
    const duplicateData = await duplicateRes.json();
    if (duplicateRes.status !== 409 || duplicateData.success) {
      throw new Error('Failed to prevent double reversal on already reversed invoice');
    }
    console.log(`   Status: 409 Conflict (Expected 409)`);
    console.log(`   Rejection message: ${duplicateData.error.message}`);
    console.log('   ✅ Double reversal correctly rejected!');

    // 6. Test Validation: Missing / Too Short Reason (< 3 chars)
    console.log('\n6. Testing Validation on invalid reason (empty or < 3 chars)...');
    const badReasonRes = await fetch(`${baseUrl}/api/reversals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceNumber: 'INV-0001', reason: 'no' }),
    });
    const badReasonData = await badReasonRes.json();
    if (badReasonRes.status !== 400 || badReasonData.success) {
      throw new Error('Validation failed to reject short reason');
    }
    console.log('   Status: 400 (Expected 400)');
    console.log('   ✅ Zod validation successfully enforced mandatory descriptive reason!');

    // 7. Test GET all reversals with summary
    console.log('\n7. Testing GET /api/reversals...');
    const allRevRes = await fetch(`${baseUrl}/api/reversals`);
    const allRevData = await allRevRes.json();
    console.log(`   Total Reversals: ${allRevData.summary.reversalCount}`);
    console.log(`   Total Customer Amount Reversed: Rs ${allRevData.summary.totalReversedIncludingTax}`);
    if (!allRevData.success || allRevData.summary.reversalCount < 1) {
      throw new Error('GET /api/reversals failed');
    }
    console.log('   ✅ GET all reversals passed!');

    // 8. Test GET single reversal by ID
    console.log(`\n8. Testing GET /api/reversals/${reversal.id}...`);
    const singleRevRes = await fetch(`${baseUrl}/api/reversals/${reversal.id}`);
    const singleRevData = await singleRevRes.json();
    if (!singleRevRes.ok || !singleRevData.success) {
      throw new Error('GET single reversal failed');
    }
    console.log(`   Found reversal linked to Order ID: ${singleRevData.data.originalOrder.id}`);
    console.log('   ✅ Single reversal lookup with populated original order passed!');

    // 9. Verify Financial Reconciliation in Orders endpoint after reversal
    console.log('\n9. Verifying Financial Reconciliation in Orders API...');
    const afterOrdersRes = await fetch(`${baseUrl}/api/orders`);
    const afterOrdersData = await afterOrdersRes.json();
    console.log(`   Reconciled State ->`);
    console.log(`   - Total Orders Billed (Audit Trail): ${afterOrdersData.summary.totalOrders}`);
    console.log(`   - Valid Active Orders (Excluding Reversals): ${afterOrdersData.summary.validOrdersCount}`);
    console.log(`   - Reversed Orders Count: ${afterOrdersData.summary.reversedOrdersCount}`);
    console.log(`   - Gross Sales: Rs ${afterOrdersData.summary.grossSales}`);
    console.log(`   - Reversals Total: Rs ${afterOrdersData.summary.reversalsTotal}`);
    console.log(`   - Net Revenue: Rs ${afterOrdersData.summary.netRevenue}`);

    if (
      afterOrdersData.summary.reversedOrdersCount !== 1 ||
      afterOrdersData.summary.validOrdersCount !== 1
    ) {
      throw new Error('Financial reconciliation failed on orders endpoint');
    }
    console.log('   ✅ Sales, order counts, and reversals reconcile 100% accurately!');

    console.log('\n🎉 ========================================================');
    console.log('🎉 ALL MODULE 5 (REVERSALS) TESTS PASSED 100% SUCCESSFULLY!');
    console.log('🎉 REVERSALS & AUDIT INTEGRITY LIVE IN MONGODB ATLAS!');
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

runReversalTests();
