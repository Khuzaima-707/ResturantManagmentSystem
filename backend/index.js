import 'dotenv/config';
import dns from 'node:dns';

// Ensure DNS SRV records resolve cleanly on cloud/serverless environments
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignored
}

import { app } from './src/app.js';
import { connectDB } from './src/config/db.js';
import { ensureDefaultUsers } from './src/controllers/authController.js';

let isConnected = false;

export default async function handler(req, res) {
  if (!isConnected && process.env.MONGODB_URI) {
    try {
      await connectDB();
      await ensureDefaultUsers().catch(() => {});
      isConnected = true;
    } catch (err) {
      console.warn('[Vercel Serverless] MongoDB connection deferred:', err.message);
    }
  }

  return app(req, res);
}

export { app };
