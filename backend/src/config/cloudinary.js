import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dlism2yam',
  api_key: process.env.CLOUDINARY_API_KEY || '889333236413331',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'HL0KwxbKp0MG4D_VWT9NkKjnFaI',
  secure: true
});

export default cloudinary;
