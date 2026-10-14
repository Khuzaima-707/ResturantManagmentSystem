import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './src/config/db.js';
import { app } from './src/app.js';
import http from 'http';

async function runAddonTests() {
  console.log('--- 🧪 STARTING MODULE 3 (ADD-ONS) LIVE TESTS ---');

  // 1. Establish Atlas DB connection
  console.log('1. Connecting to MongoDB Atlas...');
  await connectDB();
  console.log('   ✅ Atlas Connected successfully!');

  // Start temporary local server on a test port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(5097, resolve));
  const baseUrl = 'http://localhost:5097';
  console.log(`   📡 Local test server listening on ${baseUrl}`);

  try {
    // 2. Test SEED default addons
    console.log('\n2. Testing POST /api/addons/seed...');
    const seedRes = await fetch(`${baseUrl}/api/addons/seed`, { method: 'POST' });
    const seedData = await seedRes.json();
    console.log('   Seed response status:', seedRes.status);
    console.log('   Seed response message:', seedData.message);
    if (!seedData.success || seedData.count < 15) {
      throw new Error('Seed addons failed: ' + JSON.stringify(seedData));
    }
    console.log(`   ✅ Seed passed! (${seedData.count} add-ons in MongoDB Atlas)`);

    // 3. Test GET all addons
    console.log('\n3. Testing GET /api/addons...');
    const getRes = await fetch(`${baseUrl}/api/addons`);
    const getData = await getRes.json();
    console.log(`   Status: ${getRes.status}, Total Add-ons retrieved: ${getData.count}`);
    if (!getData.success || getData.count < 15) {
      throw new Error('GET /api/addons failed');
    }
    console.log('   Sample add-on:', getData.data[0].name, `(Type: ${getData.data[0].type}, Price: Rs ${getData.data[0].price})`);
    console.log('   ✅ GET all add-ons passed!');

    // 4. Test Category Filter (cat-biryani)
    console.log('\n4. Testing GET /api/addons?categoryId=cat-biryani...');
    const catRes = await fetch(`${baseUrl}/api/addons?categoryId=cat-biryani`);
    const catData = await catRes.json();
    console.log(`   Add-ons compatible with Biryani (including universal drinks): ${catData.count}`);
    if (!catData.success || catData.count === 0) {
      throw new Error('Category filter failed');
    }
    console.log('   Sample compatible addon:', catData.data[0].name);
    console.log('   ✅ Category filter passed!');

    // 5. Test Type Filter (Sauce / Dip)
    console.log('\n5. Testing GET /api/addons?type=Sauce%20/%20Dip...');
    const typeRes = await fetch(`${baseUrl}/api/addons?type=Sauce%20/%20Dip`);
    const typeData = await typeRes.json();
    console.log(`   Sauces/Dips found: ${typeData.count}`);
    if (!typeData.success || typeData.count === 0) {
      throw new Error('Type filter failed');
    }
    console.log('   ✅ Type filter passed!');

    // 6. Test Search Filter
    console.log('\n6. Testing GET /api/addons?search=raita...');
    const searchRes = await fetch(`${baseUrl}/api/addons?search=raita`);
    const searchData = await searchRes.json();
    console.log(`   Search results found: ${searchData.count}`);
    if (!searchData.success || searchData.count === 0) {
      throw new Error('Search failed to find raita');
    }
    console.log('   Found add-on:', searchData.data[0].name);
    console.log('   ✅ Search query passed!');

    // 7. Test POST Create New Addon
    console.log('\n7. Testing POST /api/addons (Create custom add-on)...');
    const newAddonPayload = {
      name: 'Extra Spicy Dip',
      type: 'Sauce / Dip',
      price: 45,
      status: 'active',
      categoryIds: ['cat-burgers', 'cat-bbq'],
      description: 'Hot chili fire dip',
    };
    const createRes = await fetch(`${baseUrl}/api/addons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAddonPayload),
    });
    const createData = await createRes.json();
    if (!createData.success || !createData.data.id) {
      throw new Error('Create add-on failed: ' + JSON.stringify(createData));
    }
    const createdId = createData.data.id;
    console.log(`   ✅ Created add-on: '${createData.data.name}' with ID: '${createdId}'`);

    // 8. Test PUT Update Addon
    console.log(`\n8. Testing PUT /api/addons/${createdId}...`);
    const updateRes = await fetch(`${baseUrl}/api/addons/${createdId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: 55 }),
    });
    const updateData = await updateRes.json();
    if (!updateData.success || updateData.data.price !== 55) {
      throw new Error('Update add-on failed');
    }
    console.log(`   ✅ Updated add-on price to: Rs ${updateData.data.price}`);

    // 9. Test Validation
    console.log('\n9. Testing Validation on invalid payload (price < 0)...');
    const invalidRes = await fetch(`${baseUrl}/api/addons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Bad Addon', price: -10 }),
    });
    const invalidData = await invalidRes.json();
    if (invalidRes.status !== 400 || invalidData.success) {
      throw new Error('Validation failed to reject negative price');
    }
    console.log('   ✅ Zod validation successfully rejected invalid data!');

    // 10. Test DELETE
    console.log(`\n10. Testing DELETE /api/addons/${createdId}...`);
    const deleteRes = await fetch(`${baseUrl}/api/addons/${createdId}`, { method: 'DELETE' });
    const deleteData = await deleteRes.json();
    if (!deleteData.success) {
      throw new Error('Delete add-on failed');
    }
    console.log(`   ✅ Add-on deleted successfully!`);

    console.log('\n🎉 ========================================================');
    console.log('🎉 ALL MODULE 3 (ADD-ONS) TESTS PASSED 100% SUCCESSFULLY!');
    console.log('🎉 ADD-ON CATALOG IS FULLY OPERATIONAL IN MONGODB ATLAS!');
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

runAddonTests();
