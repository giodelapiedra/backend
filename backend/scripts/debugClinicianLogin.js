const mongoose = require('mongoose');
require('dotenv').config();
const bcrypt = require('bcryptjs');

const User = require('../models/User');

async function debugClinicianLogin() {
  try {
    console.log('Connecting to MongoDB...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/data5', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Find clinician
    const clinician = await User.findOne({ email: 'projectklouds24@gmail.com' });
    if (!clinician) {
      console.log('❌ Clinician projectklouds24@gmail.com not found');
      return;
    }
    
    console.log('✅ Found clinician:');
    console.log(`- Name: ${clinician.firstName} ${clinician.lastName}`);
    console.log(`- Email: ${clinician.email}`);
    console.log(`- Role: ${clinician.role}`);
    console.log(`- Is Active: ${clinician.isActive}`);
    console.log(`- Is Available: ${clinician.isAvailable}`);
    console.log(`- Created: ${clinician.createdAt}`);
    console.log(`- Updated: ${clinician.updatedAt}`);
    
    // Test different passwords
    const passwordsToTest = ['password123', 'password', 'admin123', '123456', 'admin'];
    
    console.log('\n🔐 Testing passwords:');
    for (const password of passwordsToTest) {
      const isValid = await bcrypt.compare(password, clinician.password);
      console.log(`- "${password}": ${isValid ? '✅ VALID' : '❌ Invalid'}`);
      if (isValid) {
        console.log(`🎉 CORRECT PASSWORD FOUND: "${password}"`);
        break;
      }
    }
    
    // If no password works, let's reset it
    console.log('\n🔄 Resetting password to "password123"...');
    const newHashedPassword = await bcrypt.hash('password123', 12);
    clinician.password = newHashedPassword;
    await clinician.save();
    
    // Verify the reset
    const isNewPasswordValid = await bcrypt.compare('password123', clinician.password);
    console.log(`✅ Password reset verification: ${isNewPasswordValid ? 'SUCCESS' : 'FAILED'}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

debugClinicianLogin();
