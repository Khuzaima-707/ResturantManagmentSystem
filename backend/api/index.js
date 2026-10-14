import 'dotenv/config';
import { app } from '../src/app.js';
import { connectDB } from '../src/config/db.js';

// Export default serverless handler for Vercel
export default async function handler(req, res) {
  try {
    if (process.env.MONGODB_URI) {
      await connectDB();
    }
  } catch (err) {
    console.error('Serverless DB connection error:', err.message);
  }
  return app(req, res);
}
