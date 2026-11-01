import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

const cloud_name = (process.env.CLOUDINARY_CLOUD_NAME || 'ytnhy3y2').trim();
const api_key = (process.env.CLOUDINARY_API_KEY || '438874385154127').trim();
const api_secret = (process.env.CLOUDINARY_API_SECRET || '15Fj2VvyL04FtzLaG19Nz-UhFRw').trim();

cloudinary.config({
  cloud_name,
  api_key,
  api_secret,
  secure: true,
});

export default cloudinary;
