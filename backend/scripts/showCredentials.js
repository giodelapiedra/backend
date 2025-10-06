const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/occupational-rehab', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const User = require('../models/User');

async function showCurrentCredentials() {
  try {
    console.log('🔑 CURRENT USER CREDENTIALS:\n');
    
    const users = await User.find({}, 'firstName lastName email role').sort({ role: 1, firstName: 1 });
    
    // Define passwords by role
    const rolePasswords = {
      'admin': 'Admin123',
      'case_manager': 'Manager123',
      'clinician': 'Clinician123',
      'worker': 'Worker123',
      'employer': 'Employer123',
      'site_supervisor': 'Supervisor123',
      'team_leader': 'Teamleader123',
      'gp_insurer': 'Gpinsurer123'
    };
    
    console.log('=' .repeat(80));
    
    users.forEach((user, index) => {
      const password = rolePasswords[user.role] || 'password123';
      console.log(`\n${index + 1}. ${user.firstName} ${user.lastName}`);
      console.log(`   Role: ${user.role.toUpperCase()}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: ${password}`);
      console.log('-'.repeat(50));
    });
    
    console.log('\n🚀 READY TO TEST!');
    console.log('All accounts are now active with simple passwords.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

showCurrentCredentials();
