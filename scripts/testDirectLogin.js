const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/occupational-rehab', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Admin credentials to test
const testCredentials = {
  email: 'new.admin@example.com',
  password: 'Admin123!'
};

// Test login directly against database
async function testDirectLogin() {
  try {
    console.log('🔍 Testing login directly against database...');
    
    // Find user by email
    const user = await User.findOne({ email: testCredentials.email }).select('+password');
    
    if (!user) {
      console.log(`❌ User not found with email: ${testCredentials.email}`);
      return;
    }
    
    console.log('User found in database:');
    console.log('- ID:', user._id);
    console.log('- Name:', user.firstName, user.lastName);
    console.log('- Role:', user.role);
    console.log('- Active:', user.isActive);
    console.log('- Login attempts:', user.loginAttempts);
    
    // Check if password matches
    const isMatch = await bcrypt.compare(testCredentials.password, user.password);
    
    if (isMatch) {
      console.log(`✅ Password matches for: ${testCredentials.email}`);
    } else {
      console.log(`❌ Password doesn't match for: ${testCredentials.email}`);
      console.log('Stored password hash:', user.password);
      
      // Update password
      console.log('Updating password...');
      
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(testCredentials.password, salt);
      
      user.password = hashedPassword;
      await user.save();
      
      console.log(`✅ Password updated for: ${testCredentials.email}`);
      console.log('New password hash:', hashedPassword);
    }
    
    console.log('\n🔐 LOGIN CREDENTIALS (VERIFIED):');
    console.log('============================');
    console.log(`Email: ${testCredentials.email}`);
    console.log(`Password: ${testCredentials.password}`);
    
  } catch (error) {
    console.error('❌ Error testing login:', error);
  } finally {
    // Close the database connection
    mongoose.connection.close();
  }
}

// Run the function
testDirectLogin();
