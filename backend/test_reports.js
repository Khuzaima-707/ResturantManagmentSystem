import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './src/config/db.js';
import { app } from './src/app.js';
import http from 'http';

async function runReportTests() {
  console.log('--- 🧪 STARTING MODULE 6 (REPORTS & DASHBOARD ANALYTICS) LIVE TESTS ---');

  // 1. Establish Atlas DB connection
  console.log('1. Connecting to MongoDB Atlas...');
  await connectDB();
  console.log('   ✅ Atlas Connected successfully!');

  // Start temporary local server on a test port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(5094, resolve));
  const baseUrl = 'http://localhost:5094';
  console.log(`   📡 Local test server listening on ${baseUrl}`);

  try {
    // 2. Test GET /api/reports/dashboard
    console.log('\n2. Testing GET /api/reports/dashboard...');
    const dashRes = await fetch(`${baseUrl}/api/reports/dashboard`);
    const dashData = await dashRes.json();
    if (!dashRes.ok || !dashData.success) {
      throw new Error('GET dashboard metrics failed: ' + JSON.stringify(dashData));
    }
    const { kpis, charts } = dashData;
    console.log('   ✅ 8 PRD KPI Cards calculated from Atlas DB:');
    console.log(`      1. Gross Sales: Rs ${kpis.grossSales}`);
    console.log(`      2. Completed Orders (Audit): ${kpis.completedOrders}`);
    console.log(`      3. Valid Orders (Active): ${kpis.validOrdersCount}`);
    console.log(`      4. Reversed Orders: ${kpis.reversedOrdersCount}`);
    console.log(`      5. Net Revenue (excl. tax & reversals): Rs ${kpis.netRevenue}`);
    console.log(`      6. Reversals Total (incl. tax): Rs ${kpis.reversalsTotal}`);
    console.log(`      7. Average Order Value (AOV): Rs ${kpis.averageOrderValue}`);
    console.log(`      8. Tax Collected: Rs ${kpis.taxCollected}`);
    console.log(`      9. Items Sold: ${kpis.itemsSold}`);

    console.log('\n   ✅ Dashboard Visual Breakdown Data:');
    console.log(`      - Sales by Category groups: ${charts.salesByCategory.length}`);
    console.log(`      - Payment breakdown methods:`, Object.keys(charts.paymentBreakdown));
    console.log(`      - Top Selling Items count: ${charts.topSellingItems.length}`);
    console.log(`      - Recent activity items: ${dashData.recentActivity.length}`);

    // 3. Test GET /api/reports/sales
    console.log('\n3. Testing GET /api/reports/sales...');
    const salesRes = await fetch(`${baseUrl}/api/reports/sales`);
    const salesData = await salesRes.json();
    if (!salesRes.ok || !salesData.success) {
      throw new Error('GET sales report failed');
    }
    console.log(`   Total Completed Sales: Rs ${salesData.summary.totalSales}`);
    console.log(`   Total Items Sold: ${salesData.summary.itemsSold}`);
    console.log('   ✅ Sales report endpoint passed!');

    // 4. Test GET /api/reports/revenue (Revenue Reconciliation)
    console.log('\n4. Testing GET /api/reports/revenue (Auditable Reconciliation)...');
    const revRes = await fetch(`${baseUrl}/api/reports/revenue`);
    const revData = await revRes.json();
    if (!revRes.ok || !revData.success) {
      throw new Error('GET revenue report failed');
    }
    console.log(`   Gross Billed: Rs ${revData.summary.grossBilledAmount}`);
    console.log(`   Reversals: Rs ${revData.summary.reversalsTotal}`);
    console.log(`   Taxes: Rs ${revData.summary.taxTotal}`);
    console.log(`   Net Revenue: Rs ${revData.summary.netRevenue}`);
    console.log('   ✅ Revenue reconciliation report passed!');

    console.log('\n🎉 ========================================================');
    console.log('🎉 ALL MODULE 6 (REPORTS & DASHBOARD) TESTS PASSED 100%!');
    console.log('🎉 LIVE REPORTING & DASHBOARD FULLY OPERATIONAL!');
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

runReportTests();
