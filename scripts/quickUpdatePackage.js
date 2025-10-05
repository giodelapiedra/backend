require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function updatePackage() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/occupational-rehab');
    
    const user = await User.findOne({ email: 'test.user@example.com' });
    
    if (user) {
      console.log('Found user:', user.email, 'Current package:', user.package);
      user.package = 'package2';
      await user.save();
      console.log('✅ Updated to package2');
    } else {
      console.log('❌ User not found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

updatePackage();
