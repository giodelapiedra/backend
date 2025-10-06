const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/occupational-rehab', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const User = require('../models/User');

async function testLoginCredentials() {
  try {
    console.log('🔍 Testing login credentials...\n');
    
    const users = await User.find({}, 'firstName lastName email role password').sort({ role: 1, firstName: 1 });
    
    // Define passwords by role
    const rolePasswords = {
      'admin': 'admin123',
      'case_manager': 'manager123',
      'clinician': 'clinician123',
      'worker': 'worker123',
      'employer': 'employer123',
      'site_supervisor': 'supervisor123'
    };
    
    console.log('🧪 Testing password verification...\n');
    
    for (const user of users) {
      const expectedPassword = rolePasswords[user.role] || 'password123';
      const isPasswordValid = await bcrypt.compare(expectedPassword, user.password);
      
      console.log(`${user.firstName} ${user.lastName} (${user.role})`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Expected Password: ${expectedPassword}`);
      console.log(`   Password Valid: ${isPasswordValid ? '✅ YES' : '❌ NO'}`);
      console.log('-'.repeat(50));
    }
    
    console.log('\n🔑 WORKING CREDENTIALS:');
    console.log('=' .repeat(60));
    
    // Show only working credentials
    for (const user of users) {
      const expectedPassword = rolePasswords[user.role] || 'password123';
      const isPasswordValid = await bcrypt.compare(expectedPassword, user.password);
      
      if (isPasswordValid) {
        console.log(`\n${user.role.toUpperCase()}:`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Password: ${expectedPassword}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing credentials:', error);
  } finally {
    mongoose.connection.close();
  }
}

testLoginCredentials();
