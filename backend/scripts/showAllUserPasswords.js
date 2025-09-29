const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/occupational-rehab', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const User = require('../models/User');

async function showAllUserPasswords() {
  try {
    console.log('🔍 Fetching all user accounts...\n');
    
    const users = await User.find({}, 'firstName lastName email role username password isActive').sort({ role: 1, firstName: 1 });
    
    if (users.length === 0) {
      console.log('❌ No users found in the database');
      return;
    }
    
    console.log('📋 ALL USER ACCOUNTS:\n');
    console.log('=' .repeat(80));
    
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.firstName} ${user.lastName}`);
      console.log(`   Role: ${user.role.toUpperCase()}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Username: ${user.username || 'N/A'}`);
      console.log(`   Password: ${user.password}`);
      console.log(`   Status: ${user.isActive ? '✅ Active' : '❌ Inactive'}`);
      console.log('-'.repeat(50));
    });
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total Users: ${users.length}`);
    
    const roleCounts = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(roleCounts).forEach(([role, count]) => {
      console.log(`   ${role.toUpperCase()}: ${count}`);
    });
    
    console.log('\n🔑 LOGIN CREDENTIALS FOR TESTING:');
    console.log('=' .repeat(50));
    
    // Show one example from each role
    const roles = ['admin', 'case_manager', 'clinician', 'worker', 'site_supervisor'];
    roles.forEach(role => {
      const user = users.find(u => u.role === role);
      if (user) {
        console.log(`\n${role.toUpperCase()}:`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Password: ${user.password}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching users:', error);
  } finally {
    mongoose.connection.close();
  }
}

showAllUserPasswords();
