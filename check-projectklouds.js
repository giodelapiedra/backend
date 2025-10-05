const mongoose = require('mongoose');
const User = require('./models/User');

async function checkProjectKlouds() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/occupational-rehab');
    console.log('Connected to MongoDB');
    
    const user = await User.findOne({ email: 'projectklouds24@gmail.com' }).select('+password');
    
    if (!user) {
      console.log('User not found: projectklouds24@gmail.com');
      return;
    }
    
    console.log('User found:');
    console.log('- Name:', user.firstName, user.lastName);
    console.log('- Email:', user.email);
    console.log('- Role:', user.role);
    console.log('- Is Active:', user.isActive);
    console.log('- Last Login:', user.lastLogin);
    console.log('- Created:', user.createdAt);
    
    // Test password
    const isMatch = await user.comparePassword('Clinician123');
    console.log('- Password test (Clinician123):', isMatch ? 'SUCCESS' : 'FAILED');
    
    // Check if account is locked
    console.log('- Is Locked:', user.isLocked);
    console.log('- Login Attempts:', user.loginAttempts);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkProjectKlouds();
