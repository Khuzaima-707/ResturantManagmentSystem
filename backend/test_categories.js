import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './src/config/db.js';
import { Category } from './src/models/Category.js';
import { app } from './src/app.js';
import http from 'http';

async function runTests() {
  console.log('--- 🧪 STARTING MODULE 1 (CATEGORIES) LIVE TESTS ---');
  
  // 1. Establish Atlas DB connection
  console.log('1. Connecting to MongoDB Atlas...');
  await connectDB();
  console.log('   ✅ Atlas Connected successfully!');

  // Start temporary local server on a test port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(5099, resolve));
  const baseUrl = 'http://localhost:5099';
  console.log(`   📡 Local test server listening on ${baseUrl}`);

  try {
    // 2. Test SEED default categories
    console.log('\n2. Testing POST /api/categories/seed...');
    const seedRes = await fetch(`${baseUrl}/api/categories/seed`, { method: 'POST' });
    const seedData = await seedRes.json();
    console.log('   Seed response status:', seedRes.status);
    console.log('   Seed response message:', seedData.message);
    if (!seedData.success || seedData.count < 6) {
      throw new Error('Seed categories failed: ' + JSON.stringify(seedData));
    }
    console.log(`   ✅ Seed passed! (${seedData.count} categories in MongoDB Atlas)`);

    // 3. Test GET all categories
    console.log('\n3. Testing GET /api/categories...');
    const getRes = await fetch(`${baseUrl}/api/categories`);
    const getData = await getRes.json();
    console.log(`   Status: ${getRes.status}, Total Categories retrieved: ${getData.count}`);
    if (!getData.success || getData.count < 6) {
      throw new Error('GET /api/categories failed');
    }
    console.log('   Sample category:', getData.data[0].name, `(ID: ${getData.data[0].id})`);
    console.log('   ✅ GET all categories passed!');

    // 4. Test Search filter
    console.log('\n4. Testing GET /api/categories?search=biryani...');
    const searchRes = await fetch(`${baseUrl}/api/categories?search=biryani`);
    const searchData = await searchRes.json();
    console.log(`   Search results found: ${searchData.count}`);
    if (!searchData.success || searchData.count === 0) {
      throw new Error('Search failed to find biryani category');
    }
    console.log('   Found category:', searchData.data[0].name);
    console.log('   ✅ Search query passed!');

    // 5. Test GET by custom ID
    console.log('\n5. Testing GET /api/categories/cat-biryani...');
    const singleRes = await fetch(`${baseUrl}/api/categories/cat-biryani`);
    const singleData = await singleRes.json();
    if (!singleData.success || singleData.data.slug !== 'rice-biryani') {
      throw new Error('GET single category by ID failed');
    }
    console.log('   Found:', singleData.data.name, '| Portions:', singleData.data.defaultPortions.length);
    console.log('   ✅ GET single category passed!');

    // 6. Test POST create new category
    console.log('\n6. Testing POST /api/categories (Creating new category)...');
    const newCatPayload = {
      name: 'Desserts & Sweets',
      status: 'active',
      defaultUnitType: 'piece',
      baseUnit: 'piece',
      keywords: ['ice cream', 'gulab jamun', 'kheer', 'dessert'],
    };
    const createRes = await fetch(`${baseUrl}/api/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCatPayload),
    });
    const createData = await createRes.json();
    console.log('   Status:', createRes.status);
    if (!createData.success || !createData.data.id) {
      throw new Error('Create category failed: ' + JSON.stringify(createData));
    }
    const createdId = createData.data.id;
    console.log(`   ✅ Created category: '${createData.data.name}' with ID: '${createdId}', slug: '${createData.data.slug}'`);

    // 7. Test PUT update category
    console.log(`\n7. Testing PUT /api/categories/${createdId}...`);
    const updateRes = await fetch(`${baseUrl}/api/categories/${createdId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Royal Desserts & Sweets' }),
    });
    const updateData = await updateRes.json();
    if (!updateData.success || updateData.data.name !== 'Royal Desserts & Sweets') {
      throw new Error('Update category failed');
    }
    console.log(`   ✅ Updated category name to: '${updateData.data.name}'`);

    // 8. Test validation rejection (Empty name)
    console.log('\n8. Testing Validation on invalid payload (POST with empty name)...');
    const invalidRes = await fetch(`${baseUrl}/api/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    });
    const invalidData = await invalidRes.json();
    console.log('   Status:', invalidRes.status, '(Expected 400)');
    if (invalidRes.status !== 400 || invalidData.success !== false) {
      throw new Error('Validation failed to reject invalid payload');
    }
    console.log('   Validation rejection message:', invalidData.error.message);
    console.log('   ✅ Zod validation successfully intercepted and rejected invalid data!');

    // 9. Test DELETE category
    console.log(`\n9. Testing DELETE /api/categories/${createdId}...`);
    const deleteRes = await fetch(`${baseUrl}/api/categories/${createdId}`, {
      method: 'DELETE',
    });
    const deleteData = await deleteRes.json();
    if (!deleteData.success) {
      throw new Error('Delete category failed');
    }
    console.log('   Delete message:', deleteData.message);
    console.log('   ✅ Category deleted successfully!');

    // 10. Verify deleted category returns 404
    console.log(`\n10. Testing GET /api/categories/${createdId} (after deletion)...`);
    const notFoundRes = await fetch(`${baseUrl}/api/categories/${createdId}`);
    console.log('   Status:', notFoundRes.status, '(Expected 404)');
    if (notFoundRes.status !== 404) {
      throw new Error('Category still found after deletion');
    }
    console.log('   ✅ 404 correctly returned for non-existent category!');

    console.log('\n🎉 ========================================================');
    console.log('🎉 ALL MODULE 1 (CATEGORIES) TESTS PASSED 100% SUCCESSFULLY!');
    console.log('🎉 ATLAS DB IS LIVE, CONNECTED, AND FULLY OPERATIONAL!');
    console.log('🎉 ========================================================\n');

  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
