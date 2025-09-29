const mongoose = require('mongoose');
require('dotenv').config();
const bcrypt = require('bcryptjs');

const User = require('../models/User');

async function checkClinicianPassword() {
  try {
    console.log('Connecting to MongoDB...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/occupational-rehab', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Find clinician
    const clinician = await User.findOne({ email: 'projectklouds24@gmail.com' });
    if (!clinician) {
      console.log('Clinician not found');
      return;
    }
    
    console.log(`Found clinician: ${clinician.firstName} ${clinician.lastName} (${clinician.email})`);
    console.log(`Role: ${clinician.role}`);
    console.log(`Is Active: ${clinician.isActive}`);
    
    // Test password
    const testPassword = 'password123';
    const isPasswordValid = await bcrypt.compare(testPassword, clinician.password);
    console.log(`Password '${testPassword}' is valid: ${isPasswordValid}`);
    
    // Try other common passwords
    const commonPasswords = ['admin123', '123456', 'password', 'admin'];
    for (const pwd of commonPasswords) {
      const isValid = await bcrypt.compare(pwd, clinician.password);
      console.log(`Password '${pwd}' is valid: ${isValid}`);
      if (isValid) break;
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

checkClinicianPassword();
