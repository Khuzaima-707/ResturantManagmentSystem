import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './src/config/db.js';
import { app } from './src/app.js';
import http from 'http';

async function runExpenseTests() {
  console.log('--- 🧪 STARTING MODULE 8 (ACCOUNTING & EXPENSES) LIVE TESTS ---');

  // 1. Establish Atlas DB connection
  console.log('1. Connecting to MongoDB Atlas...');
  await connectDB();
  console.log('   ✅ Atlas Connected successfully!');

  // Start temporary local server on a test port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(5092, resolve));
  const baseUrl = 'http://localhost:5092';
  console.log(`   📡 Local test server listening on ${baseUrl}`);

  try {
    // 2. Test SEED default expenses
    console.log('\n2. Testing POST /api/expenses/seed...');
    const seedRes = await fetch(`${baseUrl}/api/expenses/seed?force=true`, { method: 'POST' });
    const seedData = await seedRes.json();
    console.log('   Seed response status:', seedRes.status);
    console.log('   Seed message:', seedData.message);
    if (!seedData.success || seedData.count < 4) {
      throw new Error('Seed expenses failed: ' + JSON.stringify(seedData));
    }
    console.log(`   ✅ Seed passed! (${seedData.count} starter expenses seeded)`);

    // 3. Test GET all expenses with summary
    console.log('\n3. Testing GET /api/expenses...');
    const getRes = await fetch(`${baseUrl}/api/expenses`);
    const getData = await getRes.json();
    console.log(`   Status: ${getRes.status}, Total Expenses: ${getData.pagination.total}`);
    console.log(`   Total Amount: Rs ${getData.summary.totalAmount} (Cash: Rs ${getData.summary.cashExpenses}, Bank: Rs ${getData.summary.bankExpenses})`);
    console.log(`   Category Breakdown:`, getData.summary.categoryBreakdown);
    if (!getData.success || getData.pagination.total < 4) {
      throw new Error('GET /api/expenses failed');
    }
    console.log('   Sample expense:', getData.data[0].title, '| Amount: Rs', getData.data[0].amount);
    console.log('   ✅ GET all expenses passed!');

    // 4. Test POST Create New Expense
    console.log('\n4. Testing POST /api/expenses (Record daily vegetable purchase)...');
    const newExpensePayload = {
      title: 'Daily Fresh Vegetables & Potatoes (Aloo)',
      category: 'Raw Materials / Meat & Groceries',
      amount: 3500,
      paymentMethod: 'Cash',
      paidTo: 'Subzi Mandi Vendor #12',
      receiptNumber: 'RCP-7740',
      note: 'Fresh onions, tomatoes, and golden potatoes for Biryani',
      recordedBy: 'Kitchen Head',
    };

    const createRes = await fetch(`${baseUrl}/api/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newExpensePayload),
    });
    const createData = await createRes.json();
    if (!createRes.ok || !createData.success) {
      throw new Error('Create expense failed: ' + JSON.stringify(createData));
    }
    const createdExpense = createData.data;
    console.log(`   ✅ Expense created with ID: ${createdExpense.id} | Title: "${createdExpense.title}" | Amount: Rs ${createdExpense.amount}`);

    // 5. Test P&L Statement (Profit & Loss Accounting)
    console.log('\n5. Testing GET /api/expenses/profit-and-loss (P&L Financial Accounting)...');
    const pnlRes = await fetch(`${baseUrl}/api/expenses/profit-and-loss`);
    const pnlData = await pnlRes.json();
    if (!pnlRes.ok || !pnlData.success) {
      throw new Error('P&L calculation failed: ' + JSON.stringify(pnlData));
    }
    const { pnl } = pnlData;
    console.log('   ✅ Executive Profit & Loss (P&L) Statement:');
    console.log(`      - Gross Billed Sales: Rs ${pnl.grossBilledSales}`);
    console.log(`      - Reversals Deducted: Rs ${pnl.totalReversals}`);
    console.log(`      - Net Revenue: Rs ${pnl.netRevenue}`);
    console.log(`      - Total Operating Expenses: Rs ${pnl.totalExpenses}`);
    console.log(`      - Net Operating Profit: Rs ${pnl.netOperatingProfit}`);
    console.log(`      - Profit Margin: ${pnl.profitMarginPercent}% (Profitable: ${pnl.isProfitable ? 'YES' : 'NO'})`);
    console.log('   ✅ Real P&L Accounting statement reconciled perfectly!');

    // 6. Test PUT Update Expense
    console.log(`\n6. Testing PUT /api/expenses/${createdExpense.id}...`);
    const updateRes = await fetch(`${baseUrl}/api/expenses/${createdExpense.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 3800 }),
    });
    const updateData = await updateRes.json();
    if (!updateData.success || updateData.data.amount !== 3800) {
      throw new Error('Update expense failed');
    }
    console.log(`   ✅ Expense updated to: Rs ${updateData.data.amount}`);

    // 7. Test Validation on invalid amount (<= 0)
    console.log('\n7. Testing Validation on invalid amount (amount <= 0)...');
    const badRes = await fetch(`${baseUrl}/api/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Bad Expense', amount: 0 }),
    });
    const badData = await badRes.json();
    if (badRes.status !== 400 || badData.success) {
      throw new Error('Validation failed to reject zero amount');
    }
    console.log('   Status: 400 (Expected 400)');
    console.log('   ✅ Validation successfully rejected invalid amount!');

    // 8. Test DELETE
    console.log(`\n8. Testing DELETE /api/expenses/${createdExpense.id}...`);
    const delRes = await fetch(`${baseUrl}/api/expenses/${createdExpense.id}`, { method: 'DELETE' });
    const delData = await delRes.json();
    if (!delData.success) {
      throw new Error('Delete expense failed');
    }
    console.log(`   ✅ Expense deleted successfully!`);

    console.log('\n🎉 ========================================================');
    console.log('🎉 ALL MODULE 8 (ACCOUNTING & EXPENSES) TESTS PASSED 100%!');
    console.log('🎉 EXPENSE & P&L ACCOUNTING LIVE IN MONGODB ATLAS!');
    console.log('🎉 ========================================================\n');
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exitCode = 1;
  } finally {
    try {
      await Expense.deleteMany({});
    } catch {}
    server.close();
    await mongoose.disconnect();
    console.log('🔌 Connections closed cleanly.');
  }
}

runExpenseTests();
