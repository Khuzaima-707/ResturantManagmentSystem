import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Sanitize values to remove accidental newlines (\n, \r), quotes, and whitespace from Vercel UI
const cleanVal = (val, fallback = '') => {
  if (!val) return fallback;
  return String(val).replace(/[\r\n"']/g, '').trim();
};

const cloud_name = cleanVal(process.env.CLOUDINARY_CLOUD_NAME, 'ytnhy3y2');
const api_key = cleanVal(process.env.CLOUDINARY_API_KEY, '438874385154127');
const api_secret = cleanVal(process.env.CLOUDINARY_API_SECRET, '15Fj2VvyL04FtzLaG19Nz-UhFRw');

// Unset process.env.CLOUDINARY_URL so the Cloudinary SDK does not override sanitized config
delete process.env.CLOUDINARY_URL;

cloudinary.config({
  cloud_name,
  api_key,
  api_secret,
  secure: true,
});

export default cloudinary;
