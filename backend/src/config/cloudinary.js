import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'ytnhy3y2',
  api_key: process.env.CLOUDINARY_API_KEY || '438874385154127',
  api_secret: process.env.CLOUDINARY_API_SECRET || '15Fj2VvyL04FtzLaG19Nz-UhFRw',
  secure: true,
});

export default cloudinary;
