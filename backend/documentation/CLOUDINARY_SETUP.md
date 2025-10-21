# Cloudinary Integration Setup Guide

## Overview
Your application has been successfully integrated with Cloudinary for file uploads. All image uploads (profile photos and incident photos) will now be stored in the cloud instead of local storage.

## Configuration Required

### 1. Get Your Cloudinary Credentials
You need to provide two additional pieces of information from your Cloudinary dashboard:

1. **Cloud Name**: Found in your Cloudinary dashboard
2. **API Secret**: Found in your Cloudinary dashboard (you already have the API key)

### 2. Update Configuration
Edit `backend/config/cloudinary.js` and replace the placeholder values:

```javascript
cloudinary.config({
  cloud_name: 'your_actual_cloud_name', // Replace this
  api_key: 'Pg1dI_pObyemK3XXFwQuiUNgvRA', // Already provided
  api_secret: 'your_actual_api_secret' // Replace this
});
```

### 3. Test the Integration
Run the test script to verify everything works:

```bash
cd backend
node scripts/testCloudinary.js
```

## What's Changed

### Upload Middleware
- **Old**: `backend/middleware/upload.js` (local file storage)
- **New**: `backend/middleware/cloudinaryUpload.js` (cloud storage)

### Routes Updated
- **Incidents**: Now uses Cloudinary for incident photos
- **Users**: Now uses Cloudinary for profile photos

### Benefits
- ✅ Images stored in the cloud (no local storage needed)
- ✅ Automatic image optimization and resizing
- ✅ CDN delivery for faster loading
- ✅ Automatic backup and redundancy
- ✅ No server storage limitations

## File Structure
```
backend/
├── config/
│   └── cloudinary.js          # Cloudinary configuration
├── middleware/
│   ├── upload.js              # Old local upload (can be removed)
│   └── cloudinaryUpload.js    # New Cloudinary upload
└── scripts/
    └── testCloudinary.js      # Test script
```

## Testing
1. Update the configuration with your actual credentials
2. Run the test script
3. Try uploading a profile photo or incident photo through your application

## Next Steps
1. Get your Cloudinary credentials from the dashboard
2. Update the configuration file
3. Test the integration
4. Remove the old `uploads/` folder if no longer needed
5. Update your frontend to handle Cloudinary URLs (they should work the same way)

## Support
If you encounter any issues:
1. Check your Cloudinary credentials
2. Verify your Cloudinary account is active
3. Check the test script output for specific error messages
