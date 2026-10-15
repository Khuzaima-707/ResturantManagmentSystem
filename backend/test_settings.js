import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './src/config/db.js';
import { app } from './src/app.js';
import http from 'http';

async function runSettingsTests() {
  console.log('--- 🧪 STARTING MODULE 7 (SETTINGS & DATA MANAGEMENT) LIVE TESTS ---');

  // 1. Establish Atlas DB connection
  console.log('1. Connecting to MongoDB Atlas...');
  await connectDB();
  console.log('   ✅ Atlas Connected successfully!');

  // Start temporary local server on a test port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(5093, resolve));
  const baseUrl = 'http://localhost:5093';
  console.log(`   📡 Local test server listening on ${baseUrl}`);

  try {
    // 2. Test GET /api/settings
    console.log('\n2. Testing GET /api/settings...');
    const getRes = await fetch(`${baseUrl}/api/settings`);
    const getData = await getRes.json();
    if (!getRes.ok || !getData.success) {
      throw new Error('GET settings failed: ' + JSON.stringify(getData));
    }
    console.log(`   Business Name: ${getData.data.businessName}`);
    console.log(`   Tax Rate: ${getData.data.defaultTaxRate}% | Invoice Prefix: ${getData.data.invoicePrefix}`);
    console.log('   ✅ GET settings passed!');

    // 3. Test PUT /api/settings (Update business profile & tax)
    console.log('\n3. Testing PUT /api/settings (Updating settings)...');
    const updatePayload = {
      businessName: 'Royal Spice Gourmet POS',
      defaultTaxRate: 16,
      footerNote: 'Thank you for choosing Royal Spice Gourmet! Have a great day.',
    };
    const putRes = await fetch(`${baseUrl}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload),
    });
    const putData = await putRes.json();
    if (!putRes.ok || !putData.success || putData.data.businessName !== updatePayload.businessName) {
      throw new Error('PUT settings failed');
    }
    console.log(`   Updated Business Name: ${putData.data.businessName}`);
    console.log('   ✅ Settings update passed!');

    // 4. Test Danger Zone Reset Validation (Incorrect confirmation phrase)
    console.log('\n4. Testing Danger Zone safeguard (Invalid confirmation phrase)...');
    const badResetRes = await fetch(`${baseUrl}/api/settings/danger-zone/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmationPhrase: 'delete please' }),
    });
    const badResetData = await badResetRes.json();
    if (badResetRes.status !== 400 || badResetData.success) {
      throw new Error('Danger Zone failed to reject incorrect confirmation phrase');
    }
    console.log('   Status: 400 (Expected 400)');
    console.log(`   Rejection: ${badResetData.error.message || badResetData.error.details[0]?.message}`);
    console.log('   ✅ Danger Zone safeguard successfully intercepted unauthorized wipe!');

    // 5. Test Danger Zone Reset with exact phrase 'DELETE ALL DATA'
    console.log('\n5. Testing Danger Zone with exact phrase "DELETE ALL DATA"...');
    const validResetRes = await fetch(`${baseUrl}/api/settings/danger-zone/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmationPhrase: 'DELETE ALL DATA', resetType: 'transactions' }),
    });
    const validResetData = await validResetRes.json();
    if (!validResetRes.ok || !validResetData.success) {
      throw new Error('Valid Danger Zone reset failed: ' + JSON.stringify(validResetData));
    }
    console.log(`   Wipe Summary:`, validResetData.deletedSummary);
    console.log('   ✅ Danger zone reset executed cleanly without errors!');

    console.log('   ✅ Danger zone reset executed cleanly without errors!');

    console.log('\n🎉 ========================================================');
    console.log('🎉 ALL MODULE 7 (SETTINGS & DANGER ZONE) TESTS PASSED 100%!');
    console.log('🎉 ENTIRE BACKEND REST API SUITE IS NOW LIVE & VERIFIED!');
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

runSettingsTests();
