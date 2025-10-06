const mongoose = require('mongoose');
require('dotenv').config();
const bcrypt = require('bcryptjs');

const User = require('../models/User');

async function createClinicianAccount() {
  try {
    console.log('Connecting to MongoDB...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/occupational-rehab', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Check if clinician already exists
    let clinician = await User.findOne({ email: 'projectklouds24@gmail.com' });
    
    if (clinician) {
      console.log('Clinician already exists, updating password...');
      clinician.password = 'Password123!';
      await clinician.save();
      console.log('✅ Password updated to "Password123!"');
    } else {
      console.log('Creating new clinician account...');
      
      // Create new clinician
      clinician = new User({
        firstName: 'Gio',
        lastName: 'Delapiedra',
        email: 'projectklouds24@gmail.com',
        password: 'Password123!',
        role: 'clinician',
        phone: '+1234567890',
        address: '123 Medical Center',
        specialty: 'Physical Therapy',
        specialization: 'Physical Therapy',
        licenseNumber: 'PT12345',
        isActive: true
      });
      
      await clinician.save();
      console.log('✅ New clinician account created');
    }
    
    console.log(`Clinician: ${clinician.firstName} ${clinician.lastName} (${clinician.email})`);
    console.log(`Role: ${clinician.role}`);
    console.log(`ID: ${clinician._id}`);
    
    // Verify the password
    const isPasswordValid = await bcrypt.compare('Password123!', clinician.password);
    console.log(`Password verification: ${isPasswordValid}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createClinicianAccount();
