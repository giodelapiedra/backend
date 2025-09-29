const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

async function resetAllAccountPasswords() {
  try {
    console.log('🔍 Resetting All Account Passwords...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/occupational-rehab', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB database: data5\n');

    // Get all users
    const users = await User.find({});
    console.log(`👥 Found ${users.length} users to reset\n`);

    const workingPassword = 'Password123!';
    let updatedCount = 0;

    for (const user of users) {
      try {
        console.log(`🔄 Resetting password for: ${user.firstName} ${user.lastName} (${user.email})`);
        console.log(`   Role: ${user.role}`);
        
        // Reset password
        user.password = workingPassword;
        await user.save();
        
        console.log(`   ✅ Password reset to: ${workingPassword}`);
        updatedCount++;
        
      } catch (error) {
        console.log(`   ❌ Error resetting password: ${error.message}`);
      }
      console.log('');
    }

    console.log('🎯 Summary:');
    console.log(`- Total users: ${users.length}`);
    console.log(`- Successfully updated: ${updatedCount}`);
    console.log(`- Failed updates: ${users.length - updatedCount}`);
    console.log(`- Working password for all accounts: ${workingPassword}`);

    console.log('\n📋 All Account Credentials:');
    console.log('=====================================');
    console.log('Admin Account:');
    console.log('  Email: admin@example.com');
    console.log('  Password: Password123!');
    console.log('');
    console.log('Case Manager Account:');
    console.log('  Email: casemanager@example.com');
    console.log('  Password: Password123!');
    console.log('');
    console.log('Clinician Account:');
    console.log('  Email: clinician@example.com');
    console.log('  Password: Password123!');
    console.log('');
    console.log('Employer Account:');
    console.log('  Email: employer@example.com');
    console.log('  Password: Password123!');
    console.log('');
    console.log('Worker Accounts:');
    console.log('  Email: worker@example.com');
    console.log('  Password: Password123!');
    console.log('');
    console.log('  Email: worker2@example.com');
    console.log('  Password: Password123!');
    console.log('');
    console.log('  Email: test.user@example.com');
    console.log('  Password: Password123!');
    console.log('');
    console.log('Site Supervisor Account:');
    console.log('  Email: supervisor@example.com');
    console.log('  Password: Password123!');
    console.log('');
    console.log('Additional Accounts:');
    console.log('  Email: projectklouds@gmail.com (Worker)');
    console.log('  Password: Password123!');
    console.log('');
    console.log('  Email: a2@gmail.com (Worker)');
    console.log('  Password: Password123!');
    console.log('');
    console.log('  Email: projectklouds24@gmail.com (Clinician)');
    console.log('  Password: Password123!');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

resetAllAccountPasswords();
