const mongoose = require('mongoose');
require('dotenv').config();
const bcrypt = require('bcryptjs');

const User = require('../models/User');

async function fixClinicianPassword() {
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
      console.log('❌ Clinician not found');
      return;
    }
    
    console.log('✅ Found clinician:', clinician.email);
    
    // Manually hash the password (bypass the pre-save middleware)
    const plainPassword = 'password123';
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);
    
    console.log('🔐 Hashing password manually...');
    console.log(`- Plain password: ${plainPassword}`);
    console.log(`- Salt rounds: 12`);
    console.log(`- Hashed password: ${hashedPassword.substring(0, 20)}...`);
    
    // Update the password directly in the database (bypass middleware)
    await User.updateOne(
      { _id: clinician._id },
      { password: hashedPassword }
    );
    
    console.log('✅ Password updated in database');
    
    // Verify the password works
    const updatedClinician = await User.findById(clinician._id);
    const isPasswordValid = await bcrypt.compare(plainPassword, updatedClinician.password);
    console.log(`✅ Password verification: ${isPasswordValid ? 'SUCCESS' : 'FAILED'}`);
    
    if (isPasswordValid) {
      console.log('\n🎉 LOGIN CREDENTIALS:');
      console.log(`Email: projectklouds24@gmail.com`);
      console.log(`Password: password123`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

fixClinicianPassword();
