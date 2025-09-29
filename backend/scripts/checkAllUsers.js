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

// Check all users in the database
async function checkAllUsers() {
  try {
    console.log('🔍 Checking all users in the database...');
    
    // Get all users
    const users = await User.find({}).select('+isActive');
    console.log(`Found ${users.length} total users in the database`);
    
    // Group users by role for better organization
    const usersByRole = {};
    const inactiveUsers = [];
    
    users.forEach(user => {
      // Check if user is active
      if (!user.isActive) {
        inactiveUsers.push(user);
        return;
      }
      
      // Add to role group
      if (!usersByRole[user.role]) {
        usersByRole[user.role] = [];
      }
      usersByRole[user.role].push(user);
    });
    
    // Display users by role
    console.log('\n👤 ACTIVE USERS BY ROLE:');
    console.log('======================');
    
    for (const [role, roleUsers] of Object.entries(usersByRole)) {
      console.log(`\n${role.toUpperCase()} USERS (${roleUsers.length}):`);
      roleUsers.forEach(user => {
        console.log(`- ${user.firstName} ${user.lastName}: ${user.email}`);
      });
    }
    
    // Display inactive users
    console.log('\n⚠️ INACTIVE USERS:');
    console.log('================');
    if (inactiveUsers.length === 0) {
      console.log('No inactive users found');
    } else {
      inactiveUsers.forEach(user => {
        console.log(`- ${user.firstName} ${user.lastName}: ${user.email} (${user.role})`);
      });
    }
    
    // Check for admin users specifically
    const adminUsers = users.filter(user => user.role === 'admin');
    console.log('\n🔐 ADMIN USERS:');
    console.log('=============');
    if (adminUsers.length === 0) {
      console.log('No admin users found in the database!');
    } else {
      adminUsers.forEach(user => {
        console.log(`- ${user.firstName} ${user.lastName}: ${user.email} (Active: ${user.isActive})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking users:', error);
  } finally {
    // Close the database connection
    mongoose.connection.close();
  }
}

// Run the function
checkAllUsers();
