const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/occupational-rehab', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Get all users with their passwords
async function getAllUsers() {
  try {
    console.log('🔍 Getting all users from database...');
    
    // Get all users from the database
    const users = await User.find({});
    
    if (users.length === 0) {
      console.log('❌ No users found in the database');
      return;
    }
    
    console.log(`\n📋 Found ${users.length} users in the database:`);
    console.log('='.repeat(80));
    
    // Group users by role
    const usersByRole = {};
    users.forEach(user => {
      if (!usersByRole[user.role]) {
        usersByRole[user.role] = [];
      }
      usersByRole[user.role].push(user);
    });
    
    // Display users by role
    Object.keys(usersByRole).sort().forEach(role => {
      console.log(`\n👥 ${role.toUpperCase()} USERS:`);
      console.log('-'.repeat(50));
      
      usersByRole[role].forEach((user, index) => {
        console.log(`${index + 1}. Name: ${user.firstName} ${user.lastName}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Active: ${user.isActive ? '✅ Yes' : '❌ No'}`);
        console.log(`   Created: ${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}`);
        console.log(`   Last Login: ${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}`);
        console.log('');
      });
    });
    
    console.log('\n🔐 LOGIN CREDENTIALS SUMMARY:');
    console.log('='.repeat(80));
    
    // Show all login credentials
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.role.toUpperCase()}: ${user.email}`);
    });
    
    console.log('\n⚠️  NOTE: All users have been set with these default passwords:');
    console.log('   - Password123! (for most users)');
    console.log('   - admin (for admin@admin.com)');
    console.log('   - test123 (for test@admin.com)');
    console.log('   - admin123 (for superadmin@example.com)');
    
  } catch (error) {
    console.error('❌ Error getting users:', error);
  } finally {
    // Close the database connection
    mongoose.connection.close();
  }
}

// Run the function
getAllUsers();