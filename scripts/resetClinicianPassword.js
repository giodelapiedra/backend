const mongoose = require('mongoose');
require('dotenv').config();
const bcrypt = require('bcryptjs');

const User = require('../models/User');

async function resetClinicianPassword() {
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
    
    // Reset password to 'password123'
    const hashedPassword = await bcrypt.hash('password123', 12);
    clinician.password = hashedPassword;
    await clinician.save();
    
    console.log('✅ Password reset to "password123"');
    
    // Verify the new password
    const isPasswordValid = await bcrypt.compare('password123', clinician.password);
    console.log(`Password verification: ${isPasswordValid}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

resetClinicianPassword();
