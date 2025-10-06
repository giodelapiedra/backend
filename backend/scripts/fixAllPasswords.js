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

// Standard password for all users
const DEFAULT_PASSWORD = 'Password123!';

// Fix all user passwords and ensure they work
async function fixAllPasswords() {
  try {
    console.log('🔄 Fixing all user passwords...');
    
    // Get all users
    const users = await User.find({});
    console.log(`Found ${users.length} users to fix passwords`);
    
    // Hash the default password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, salt);
    
    // Update each user individually to ensure proper password hashing
    for (const user of users) {
      // Update password and ensure account is active
      user.password = hashedPassword;
      user.isActive = true;
      
      // Reset login attempts if any
      if (user.loginAttempts) {
        user.loginAttempts = 0;
      }
      
      // Save the user
      await user.save();
      console.log(`✅ Fixed password for: ${user.email} (${user.role})`);
    }
    
    console.log('\n🔐 ALL USERS NOW HAVE THIS PASSWORD:');
    console.log('================================');
    console.log(`Password: ${DEFAULT_PASSWORD}`);
    
    // Group users by role for better organization
    const usersByRole = {};
    users.forEach(user => {
      if (!usersByRole[user.role]) {
        usersByRole[user.role] = [];
      }
      usersByRole[user.role].push(user);
    });
    
    // Display users by role
    console.log('\n👤 USERS BY ROLE:');
    console.log('===============');
    
    for (const [role, roleUsers] of Object.entries(usersByRole)) {
      console.log(`\n${role.toUpperCase()} USERS (${roleUsers.length}):`);
      roleUsers.forEach(user => {
        console.log(`- ${user.firstName} ${user.lastName}: ${user.email}`);
      });
    }
    
    console.log('\n✅ All passwords fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing passwords:', error);
  } finally {
    // Close the database connection
    mongoose.connection.close();
  }
}

// Run the function
fixAllPasswords();
