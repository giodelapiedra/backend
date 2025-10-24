const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for user profile photo uploads
const userPhotoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/users');
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp and user ID if available
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const userId = req.user?._id || 'temp';
    cb(null, `user-${userId}-${uniqueSuffix}${extension}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Check MIME type
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed!'), false);
  }
  
  // Check file extension
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (!allowedExtensions.includes(fileExtension)) {
    return cb(new Error('Invalid file extension!'), false);
  }
  
  // Check file size (2MB limit)
  if (file.size && file.size > 2 * 1024 * 1024) {
    return cb(new Error('File size must be less than 2MB!'), false);
  }
  
  cb(null, true);
};

// User profile photo upload middleware
const uploadUserPhoto = multer({ 
  storage: userPhotoStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit for profile photos
  }
});

// Single photo upload for user registration
const uploadSingleUserPhoto = uploadUserPhoto.single('profileImage');

// Multiple photos upload (for future use)
const uploadMultipleUserPhotos = uploadUserPhoto.array('photos', 3);

module.exports = {
  uploadSingleUserPhoto,
  uploadMultipleUserPhotos,
  uploadUserPhoto
};
