import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './src/config/db.js';
import { app } from './src/app.js';
import http from 'http';

async function runShiftTests() {
  console.log('--- 🧪 STARTING MODULE 10 (CASH REGISTER & SHIFT CLOSING) LIVE TESTS ---');

  // 1. Establish Atlas DB connection
  console.log('1. Connecting to MongoDB Atlas...');
  await connectDB();
  console.log('   ✅ Atlas Connected successfully!');

  // Start temporary local server on a test port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(5090, resolve));
  const baseUrl = 'http://localhost:5090';
  console.log(`   📡 Local test server listening on ${baseUrl}`);

  try {
    // 2. Ensure clean shift state (close any hanging open shifts)
    console.log('\n2. Checking existing active shift status...');
    const currentRes = await fetch(`${baseUrl}/api/shifts/current`);
    const currentData = await currentRes.json();
    if (currentData.hasActiveShift) {
      console.log('   Closing existing shift before test...');
      await fetch(`${baseUrl}/api/shifts/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actualCashCounted: 5000, notes: 'Automated test cleanup' }),
      });
    }
    console.log('   ✅ Cash register ready for new shift testing.');

    // 3. Test POST /api/shifts/open
    console.log('\n3. Testing POST /api/shifts/open (Opening Shift with Rs 5,000 float)...');
    const openPayload = {
      cashierName: 'Ahmad Cashier',
      openingFloat: 5000,
      notes: 'Morning shift opening float',
    };
    const openRes = await fetch(`${baseUrl}/api/shifts/open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(openPayload),
    });
    const openData = await openRes.json();
    if (!openRes.ok || !openData.success) {
      throw new Error('Open shift failed: ' + JSON.stringify(openData));
    }
    const openedShift = openData.data;
    console.log(`   ✅ Shift #${openedShift.shiftNumber} opened successfully!`);
    console.log(`   Cashier: ${openedShift.cashierName} | Opening Float: Rs ${openedShift.openingFloat}`);

    // 4. Test GET /api/shifts/current
    console.log('\n4. Testing GET /api/shifts/current (Live drawer status)...');
    const liveRes = await fetch(`${baseUrl}/api/shifts/current`);
    const liveData = await liveRes.json();
    if (!liveData.success || !liveData.hasActiveShift) {
      throw new Error('Current shift check failed');
    }
    console.log(`   Active Shift #: ${liveData.data.shiftNumber}`);
    console.log(`   Opening Float: Rs ${liveData.data.openingFloat} | Expected Cash: Rs ${liveData.data.expectedCash}`);
    console.log('   ✅ Live shift status retrieved successfully!');

    // 5. Test Duplicate Open Shift Prevention (409 Conflict)
    console.log('\n5. Testing Duplicate Open Shift Prevention...');
    const dupRes = await fetch(`${baseUrl}/api/shifts/open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(openPayload),
    });
    const dupData = await dupRes.json();
    if (dupRes.status !== 409 || dupData.success) {
      throw new Error('Failed to prevent duplicate open shift');
    }
    console.log('   Status: 409 Conflict (Expected 409)');
    console.log(`   Rejection message: ${dupData.error.message}`);
    console.log('   ✅ Duplicate shift correctly rejected!');

    // 6. Test POST /api/shifts/close (Z-Report Day-End Closing)
    console.log('\n6. Testing POST /api/shifts/close (Closing shift & generating Z-Report)...');
    const closePayload = {
      actualCashCounted: 5200, // Rs 200 excess in drawer
      notes: 'Day end register reconciliation',
    };
    const closeRes = await fetch(`${baseUrl}/api/shifts/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(closePayload),
    });
    const closeData = await closeRes.json();
    if (!closeRes.ok || !closeData.success) {
      throw new Error('Close shift failed: ' + JSON.stringify(closeData));
    }
    const closedShift = closeData.data;
    console.log('   ✅ Z-Report Generated Successfully:');
    console.log(`      - Shift #: ${closedShift.shiftNumber} (${closedShift.status.toUpperCase()})`);
    console.log(`      - Opening Float: Rs ${closedShift.openingFloat}`);
    console.log(`      - Cash Sales: Rs ${closedShift.cashSales}`);
    console.log(`      - Expected Cash: Rs ${closedShift.expectedCash}`);
    console.log(`      - Actual Cash Counted: Rs ${closedShift.actualCashCounted}`);
    console.log(`      - Discrepancy: Rs ${closedShift.discrepancy >= 0 ? `+${closedShift.discrepancy}` : closedShift.discrepancy} (${closedShift.discrepancy >= 0 ? 'Surplus' : 'Shortage'})`);

    // 7. Test GET all shifts history
    console.log('\n7. Testing GET /api/shifts...');
    const allRes = await fetch(`${baseUrl}/api/shifts`);
    const allData = await allRes.json();
    if (!allData.success || allData.count === 0) {
      throw new Error('GET all shifts failed');
    }
    console.log(`   Total Historical Shifts Archived: ${allData.count}`);
    console.log('   ✅ Shift archive passed!');

    console.log('\n🎉 ========================================================');
    console.log('🎉 ALL MODULE 10 (CASH REGISTER & SHIFTS) TESTS PASSED 100%!');
    console.log('🎉 SHIFT CLOSING & Z-REPORT SYSTEM LIVE IN MONGODB ATLAS!');
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

runShiftTests();
