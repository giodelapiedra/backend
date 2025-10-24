const fs = require('fs');
const path = require('path');
const User = require('./models/User');
const { connectDB } = require('./config/database');

// Utility to fix image URLs in the database
async function fixImageUrls() {
  console.log('🔧 Fixing image URLs in database...\n');
  
  try {
    await connectDB();
    
    // Get all users with profile images
    const users = await User.find({ 
      profileImage: { $exists: true, $ne: null, $ne: '' } 
    });
    
    console.log(`Found ${users.length} users with profile images`);
    
    let fixedCount = 0;
    let cloudinaryCount = 0;
    let localCount = 0;
    
    for (const user of users) {
      let newImageUrl = user.profileImage;
      let needsUpdate = false;
      
      // Fix Cloudinary URLs
      if (user.profileImage.includes('cloudinary.com')) {
        // Ensure it's a proper HTTPS URL
        if (!user.profileImage.startsWith('http')) {
          newImageUrl = `https://${user.profileImage}`;
          needsUpdate = true;
        }
        cloudinaryCount++;
      }
      // Fix local upload URLs
      else if (user.profileImage.includes('/uploads/')) {
        // Ensure it starts with /uploads/
        if (!user.profileImage.startsWith('/uploads/')) {
          newImageUrl = `/uploads/${user.profileImage.replace(/^\/uploads\//, '')}`;
          needsUpdate = true;
        }
        localCount++;
      }
      // Fix relative URLs
      else if (user.profileImage.startsWith('uploads/')) {
        newImageUrl = `/uploads/${user.profileImage.replace(/^uploads\//, '')}`;
        needsUpdate = true;
        localCount++;
      }
      
      if (needsUpdate) {
        await User.findByIdAndUpdate(user._id, { profileImage: newImageUrl });
        console.log(`✅ Fixed image URL for user ${user.email}: ${newImageUrl}`);
        fixedCount++;
      }
    }
    
    console.log('\n📊 Image URL Fix Summary:');
    console.log(`   • Total users processed: ${users.length}`);
    console.log(`   • URLs fixed: ${fixedCount}`);
    console.log(`   • Cloudinary images: ${cloudinaryCount}`);
    console.log(`   • Local images: ${localCount}`);
    
    // Check for missing files
    console.log('\n🔍 Checking for missing image files...');
    const localImageUsers = users.filter(u => 
      u.profileImage && 
      u.profileImage.includes('/uploads/') && 
      !u.profileImage.includes('cloudinary.com')
    );
    
    let missingFiles = 0;
    for (const user of localImageUsers) {
      const filename = user.profileImage.replace('/uploads/', '');
      const filePath = path.join(__dirname, 'uploads', filename);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Missing file: ${filename} (User: ${user.email})`);
        missingFiles++;
        
        // Set to default avatar
        await User.findByIdAndUpdate(user._id, { 
          profileImage: '/images/default-avatar.png' 
        });
      }
    }
    
    if (missingFiles > 0) {
      console.log(`\n🔄 Set ${missingFiles} users to default avatar`);
    }
    
    console.log('\n✅ Image URL fixing completed!');
    
  } catch (error) {
    console.error('❌ Error fixing image URLs:', error);
  }
}

// Create default avatar if it doesn't exist
function createDefaultAvatar() {
  const publicDir = path.join(__dirname, 'public');
  const defaultAvatarPath = path.join(publicDir, 'default-avatar.png');
  
  // Create public directory if it doesn't exist
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  
  // Create a simple SVG default avatar if PNG doesn't exist
  if (!fs.existsSync(defaultAvatarPath)) {
    const svgAvatar = `
      <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#e3f2fd;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#bbdefb;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="200" height="200" fill="url(#bg)" rx="100"/>
        <circle cx="100" cy="70" r="30" fill="#90a4ae"/>
        <path d="M40 160 Q100 130 160 160" stroke="#90a4ae" stroke-width="8" fill="none"/>
        <text x="100" y="190" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#90a4ae">Avatar</text>
      </svg>
    `;
    
    const svgPath = path.join(publicDir, 'default-avatar.svg');
    fs.writeFileSync(svgPath, svgAvatar);
    console.log('✅ Created default avatar SVG');
  }
}

// Run the fix
if (require.main === module) {
  createDefaultAvatar();
  fixImageUrls().then(() => {
    process.exit(0);
  }).catch(console.error);
}

module.exports = { fixImageUrls, createDefaultAvatar };

