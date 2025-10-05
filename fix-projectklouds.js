const mongoose = require('mongoose');
const User = require('./models/User');

async function fixProjectKlouds() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/occupational-rehab');
    console.log('Connected to MongoDB');
    
    const user = await User.findOne({ email: 'projectklouds24@gmail.com' });
    
    if (!user) {
      console.log('User not found: projectklouds24@gmail.com');
      return;
    }
    
    console.log('Fixing user:', user.email);
    
    // Reset password
    user.password = 'Clinician123';
    
    // Clear login attempts and unlock account
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.isActive = true;
    
    await user.save();
    
    console.log('Password reset and account unlocked');
    
    // Test the new password
    const testUser = await User.findOne({ email: 'projectklouds24@gmail.com' }).select('+password');
    const isMatch = await testUser.comparePassword('Clinician123');
    console.log('Password test:', isMatch ? 'SUCCESS' : 'FAILED');
    
    console.log('User is now ready for login!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

fixProjectKlouds();
