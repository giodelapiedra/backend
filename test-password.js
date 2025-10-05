const mongoose = require('mongoose');
const User = require('./models/User');

async function testPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/occupational-rehab');
    console.log('Connected to MongoDB');
    
    const user = await User.findOne({ email: 'john.doe@example.com' }).select('+password');
    
    if (!user) {
      console.log('User not found');
      return;
    }
    
    console.log('User found:', user.email);
    console.log('Stored password hash:', user.password.substring(0, 20) + '...');
    
    // Test password comparison
    const isMatch = await user.comparePassword('worker123');
    console.log('Password match:', isMatch);
    
    // Test with wrong password
    const isWrongMatch = await user.comparePassword('wrongpassword');
    console.log('Wrong password match:', isWrongMatch);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testPassword();
