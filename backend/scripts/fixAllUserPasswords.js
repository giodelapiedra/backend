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

// Fix all user passwords with consistent hashing
async function fixAllUserPasswords() {
  try {
    console.log('🔧 Fixing all user passwords with consistent hashing...');
    
    // Get all users
    const users = await User.find({});
    
    if (users.length === 0) {
      console.log('❌ No users found in the database');
      return;
    }
    
    console.log(`\n📋 Found ${users.length} users to fix:`);
    
    // Define default passwords for each role
    const defaultPasswords = {
      'admin': 'admin123',
      'worker': 'Password123!',
      'clinician': 'Password123!',
      'case_manager': 'Password123!',
      'employer': 'Password123!',
      'site_supervisor': 'Password123!',
      'gp_insurer': 'Password123!'
    };
    
    let fixedCount = 0;
    
    for (const user of users) {
      try {
        console.log(`\n🔍 Processing: ${user.email} (${user.role})`);
        
        // Get the default password for this role
        const defaultPassword = defaultPasswords[user.role] || 'Password123!';
        
        // Hash the password with consistent settings
        const salt = await bcrypt.genSalt(10); // Use consistent salt rounds
        const hashedPassword = await bcrypt.hash(defaultPassword, salt);
        
        // Update the user's password directly in the database
        await User.updateOne(
          { _id: user._id },
          { 
            $set: { 
              password: hashedPassword,
              isActive: true,
              loginAttempts: 0
            } 
          }
        );
        
        console.log(`✅ Fixed password for ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Password: ${defaultPassword}`);
        console.log(`   Hash: ${hashedPassword.substring(0, 20)}...`);
        
        fixedCount++;
        
      } catch (error) {
        console.error(`❌ Error fixing ${user.email}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Successfully fixed ${fixedCount} out of ${users.length} users`);
    
    // Test a few passwords to make sure they work
    console.log('\n🧪 Testing password verification...');
    
    const testUsers = [
      { email: 'admin@admin.com', password: 'admin123' },
      { email: 'john.doe@example.com', password: 'Password123!' },
      { email: 'michael.johnson@example.com', password: 'Password123!' }
    ];
    
    for (const testUser of testUsers) {
      const user = await User.findOne({ email: testUser.email }).select('+password');
      if (user) {
        const isMatch = await bcrypt.compare(testUser.password, user.password);
        console.log(`${testUser.email}: ${isMatch ? '✅ WORKS' : '❌ FAILED'}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error fixing user passwords:', error);
  } finally {
    // Close the database connection
    mongoose.connection.close();
  }
}

// Run the function
fixAllUserPasswords();
