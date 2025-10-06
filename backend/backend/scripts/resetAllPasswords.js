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

// Standard password for all users - easy to remember
const DEFAULT_PASSWORD = 'Password123!';

// Reset all user passwords
async function resetAllPasswords() {
  try {
    console.log('🔄 Resetting all user passwords...');
    
    // Get all users
    const users = await User.find({});
    console.log(`Found ${users.length} users to reset passwords`);
    
    // Hash the default password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, salt);
    
    // Update all users with the new password
    const updateResult = await User.updateMany(
      {}, // Empty filter to match all documents
      { password: hashedPassword }
    );
    
    console.log(`✅ Successfully reset passwords for ${updateResult.modifiedCount} users`);
    console.log('');
    console.log('🔑 DEFAULT PASSWORD FOR ALL USERS: Password123!');
    console.log('');
    
    // Show all users with their emails for login
    console.log('👤 USER CREDENTIALS:');
    console.log('===================');
    
    // Group users by role for better organization
    const usersByRole = {};
    users.forEach(user => {
      if (!usersByRole[user.role]) {
        usersByRole[user.role] = [];
      }
      usersByRole[user.role].push(user);
    });
    
    // Display users by role
    for (const [role, roleUsers] of Object.entries(usersByRole)) {
      console.log(`\n${role.toUpperCase()} USERS:`);
      roleUsers.forEach(user => {
        console.log(`- ${user.firstName} ${user.lastName}: ${user.email}`);
      });
    }
    
    console.log('\n');
    console.log('🔐 SAMPLE LOGIN CREDENTIALS BY ROLE:');
    console.log('================================');
    
    // Show one example user for each role
    for (const [role, roleUsers] of Object.entries(usersByRole)) {
      if (roleUsers.length > 0) {
        const user = roleUsers[0];
        console.log(`\n${role.toUpperCase()}:`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Password: ${DEFAULT_PASSWORD}`);
      }
    }
    
    console.log('\n✅ Password reset complete!');
    
  } catch (error) {
    console.error('❌ Error resetting passwords:', error);
  } finally {
    // Close the database connection
    mongoose.connection.close();
  }
}

// Run the function
resetAllPasswords();