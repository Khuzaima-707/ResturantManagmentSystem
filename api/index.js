import 'dotenv/config';
import dns from 'node:dns';

// Ensure DNS SRV records resolve cleanly on cloud/serverless environments
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignored
}

import { app } from '../backend/src/app.js';
import { connectDB, isDbConnected } from '../backend/src/config/db.js';
import { ensureDefaultUsers } from '../backend/src/controllers/authController.js';

// Export default serverless handler for Vercel
export default async function handler(req, res) {
  if (process.env.MONGODB_URI && !isDbConnected()) {
    try {
      await connectDB();
      await ensureDefaultUsers().catch(() => {});
    } catch (err) {
      console.error('Serverless DB connection error:', err.message);
    }
  }
  return app(req, res);
}
