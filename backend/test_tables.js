import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './src/config/db.js';
import { app } from './src/app.js';
import http from 'http';

async function runTableTests() {
  console.log('--- 🧪 STARTING MODULE 9 (TABLE MANAGEMENT) LIVE TESTS ---');

  // 1. Establish Atlas DB connection
  console.log('1. Connecting to MongoDB Atlas...');
  await connectDB();
  console.log('   ✅ Atlas Connected successfully!');

  // Start temporary local server on a test port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(5091, resolve));
  const baseUrl = 'http://localhost:5091';
  console.log(`   📡 Local test server listening on ${baseUrl}`);

  try {
    // 2. Test SEED default tables
    console.log('\n2. Testing POST /api/tables/seed...');
    const seedRes = await fetch(`${baseUrl}/api/tables/seed?force=true`, { method: 'POST' });
    const seedData = await seedRes.json();
    console.log('   Seed response status:', seedRes.status);
    console.log('   Seed message:', seedData.message);
    if (!seedData.success || seedData.count < 12) {
      throw new Error('Seed tables failed: ' + JSON.stringify(seedData));
    }
    console.log(`   ✅ Seed passed! (${seedData.count} restaurant tables seeded across 4 zones)`);

    // 3. Test GET all tables with live stats
    console.log('\n3. Testing GET /api/tables...');
    const getRes = await fetch(`${baseUrl}/api/tables`);
    const getData = await getRes.json();
    console.log(`   Total Tables: ${getData.count}`);
    console.log(`   Occupancy Stats -> Available: ${getData.stats.available}, Occupied: ${getData.stats.occupied}, Reserved: ${getData.stats.reserved}`);
    if (!getData.success || getData.count < 12) {
      throw new Error('GET /api/tables failed');
    }
    console.log('   Sample table:', getData.data[0].name, `(Zone: ${getData.data[0].zone}, Capacity: ${getData.data[0].capacity})`);
    console.log('   ✅ GET all tables passed!');

    // 4. Test Zone Filter (Family Section)
    console.log('\n4. Testing GET /api/tables?zone=Family%20Section...');
    const zoneRes = await fetch(`${baseUrl}/api/tables?zone=Family%20Section`);
    const zoneData = await zoneRes.json();
    console.log(`   Family Section Booths: ${zoneData.count}`);
    if (!zoneData.success || zoneData.count === 0) {
      throw new Error('Zone filter failed');
    }
    console.log('   ✅ Zone filter passed!');

    // 5. Test Occupy Table (Table tbl-2 with Invoice INV-0001)
    console.log('\n5. Testing POST /api/tables/tbl-2/occupy...');
    const occupyPayload = {
      orderId: 'ord-sample-01',
      invoiceNumber: 'INV-0001',
      waiterName: 'Hamza Waiter',
    };
    const occRes = await fetch(`${baseUrl}/api/tables/tbl-2/occupy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(occupyPayload),
    });
    const occData = await occRes.json();
    if (!occRes.ok || !occData.success || occData.data.status !== 'occupied') {
      throw new Error('Occupy table failed: ' + JSON.stringify(occData));
    }
    console.log(`   ✅ Table #2 status is now 'occupied' with Invoice #${occData.data.currentInvoiceNumber}`);

    // 6. Test Release Table
    console.log('\n6. Testing POST /api/tables/tbl-2/release...');
    const relRes = await fetch(`${baseUrl}/api/tables/tbl-2/release`, { method: 'POST' });
    const relData = await relRes.json();
    if (!relRes.ok || !relData.success || relData.data.status !== 'available') {
      throw new Error('Release table failed');
    }
    console.log(`   ✅ Table #2 status released to 'available'!`);

    // 7. Test POST Create New Table (#13)
    console.log('\n7. Testing POST /api/tables (Create new table #13)...');
    const newTablePayload = {
      number: 13,
      name: 'Rooftop Gazebo 1',
      capacity: 8,
      zone: 'Outdoor Terrace',
      status: 'available',
    };
    const createRes = await fetch(`${baseUrl}/api/tables`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTablePayload),
    });
    const createData = await createRes.json();
    if (!createRes.ok || !createData.success) {
      throw new Error('Create table failed: ' + JSON.stringify(createData));
    }
    console.log(`   ✅ Created Table #${createData.data.number} (${createData.data.name})`);

    // 8. Test Duplicate Table Number Prevention (409 Conflict)
    console.log('\n8. Testing Duplicate Table Number Prevention...');
    const dupRes = await fetch(`${baseUrl}/api/tables`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTablePayload),
    });
    const dupData = await dupRes.json();
    if (dupRes.status !== 409 || dupData.success) {
      throw new Error('Failed to prevent duplicate table number');
    }
    console.log('   Status: 409 Conflict (Expected 409)');
    console.log('   ✅ Duplicate table number rejected!');

    // 9. Test DELETE Table #13
    console.log('\n9. Testing DELETE /api/tables/tbl-13...');
    const delRes = await fetch(`${baseUrl}/api/tables/tbl-13`, { method: 'DELETE' });
    const delData = await delRes.json();
    if (!delData.success) {
      throw new Error('Delete table failed');
    }
    console.log('   ✅ Table deleted successfully!');

    console.log('\n🎉 ========================================================');
    console.log('🎉 ALL MODULE 9 (TABLE MANAGEMENT) TESTS PASSED 100%!');
    console.log('🎉 RESTAURANT TABLE FLOORPLAN LIVE IN MONGODB ATLAS!');
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

runTableTests();
