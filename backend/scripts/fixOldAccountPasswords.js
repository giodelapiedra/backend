const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

async function fixOldAccountPasswords() {
  try {
    console.log('🔍 Fixing Old Account Passwords...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/occupational-rehab', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB database: data5\n');

    // List of old accounts that need password reset
    const oldAccounts = [
      'admin@example.com',
      'clinician@example.com', 
      'casemanager@example.com',
      'worker@example.com',
      'worker2@example.com',
      'supervisor@example.com',
      'employer@example.com',
      'test.user@example.com',
      'projectklouds@gmail.com',
      'a2@gmail.com'
    ];

    const workingPassword = 'Password123!';
    let updatedCount = 0;

    console.log('🔄 Resetting passwords for old accounts:\n');

    for (const email of oldAccounts) {
      try {
        const user = await User.findOne({ email: email });
        
        if (user) {
          console.log(`✅ Found: ${user.firstName} ${user.lastName} (${user.email})`);
          console.log(`   Role: ${user.role}`);
          
          // Reset password
          user.password = workingPassword;
          await user.save();
          
          console.log(`   ✅ Password reset to: ${workingPassword}`);
          updatedCount++;
        } else {
          console.log(`❌ Not found: ${email}`);
        }
        console.log('');
        
      } catch (error) {
        console.log(`❌ Error with ${email}: ${error.message}`);
        console.log('');
      }
    }

    console.log('🎯 Summary:');
    console.log(`- Old accounts processed: ${oldAccounts.length}`);
    console.log(`- Successfully updated: ${updatedCount}`);
    console.log(`- Not found: ${oldAccounts.length - updatedCount}`);

    console.log('\n📋 ALL WORKING ACCOUNTS:');
    console.log('========================');
    console.log('Password for ALL accounts: Password123!');
    console.log('');
    console.log('🆕 New Accounts (@rehab.com):');
    console.log('- Admin: admin@rehab.com');
    console.log('- Clinician: clinician@rehab.com');
    console.log('- Case Manager: casemanager@rehab.com');
    console.log('- Worker: worker@rehab.com');
    console.log('- Employer: employer@rehab.com');
    console.log('- Site Supervisor: sitesupervisor@rehab.com');
    console.log('- GP Insurer: gpinsurer@rehab.com');
    console.log('- Additional Clinician: projectklouds24@gmail.com');
    console.log('');
    console.log('🔄 Fixed Old Accounts (@example.com):');
    console.log('- Admin: admin@example.com');
    console.log('- Clinician: clinician@example.com');
    console.log('- Case Manager: casemanager@example.com');
    console.log('- Worker: worker@example.com');
    console.log('- Worker 2: worker2@example.com');
    console.log('- Site Supervisor: supervisor@example.com');
    console.log('- Employer: employer@example.com');
    console.log('- Test User: test.user@example.com');
    console.log('- Worker: projectklouds@gmail.com');
    console.log('- Worker: a2@gmail.com');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

fixOldAccountPasswords();
