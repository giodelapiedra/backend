const cloudinary = require('cloudinary').v2;

// Configure Cloudinary with environment variables for security
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dxfdgrerx',
  api_key: process.env.CLOUDINARY_API_KEY || '981778737815535',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'Pg1dI_pObyemK3XXFwQuiUNgvRA'
});

module.exports = cloudinary;
