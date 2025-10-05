const mongoose = require('mongoose');
const User = require('./models/User');

async function resetPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/occupational-rehab');
    console.log('Connected to MongoDB');
    
    const user = await User.findOne({ email: 'john.doe@example.com' });
    
    if (!user) {
      console.log('User not found');
      return;
    }
    
    console.log('Resetting password for:', user.email);
    
    // Set new password
    user.password = 'Worker123';
    await user.save();
    
    console.log('Password reset successful');
    
    // Test the new password
    const testUser = await User.findOne({ email: 'john.doe@example.com' }).select('+password');
    const isMatch = await testUser.comparePassword('Worker123');
    console.log('New password test:', isMatch);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

resetPassword();
