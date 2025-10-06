const bcrypt = require('bcryptjs');
const { supabase, db } = require('../config/supabase');

// All admin accounts created
const adminAccounts = [
  { role: 'admin', email: 'admin_admin@test.com', password: 'Admin123!@#' },
  { role: 'worker', email: 'admin_worker@test.com', password: 'Admin123!@#' },
  { role: 'employer', email: 'admin_employer@test.com', password: 'Admin123!@#' },
  { role: 'site_supervisor', email: 'admin_site_supervisor@test.com', password: 'Admin123!@#' },
  { role: 'clinician', email: 'admin_clinician@test.com', password: 'Admin123!@#' },
  { role: 'case_manager', email: 'admin_case_manager@test.com', password: 'Admin123!@#' },
  { role: 'gp_insurer', email: 'admin_gp_insurer@test.com', password: 'Admin123!@#' },
  { role: 'team_leader', email: 'admin_team_leader@test.com', password: 'Admin123!@#' }
];

// Test login for a specific account
const testLogin = async (account) => {
  try {
    console.log(`🔐 Testing login for ${account.role}...`);
    
    // Find user by email
    const user = await db.users.findByEmail(account.email);
    
    if (!user) {
      console.log(`❌ User not found: ${account.email}`);
      return false;
    }
    
    // Check if user is active
    if (!user.is_active) {
      console.log(`❌ Account is deactivated: ${account.email}`);
      return false;
    }
    
    // Check password
    const isMatch = await bcrypt.compare(account.password, user.password_hash);
    
    if (!isMatch) {
      console.log(`❌ Invalid password for: ${account.email}`);
      return false;
    }
    
    console.log(`✅ Login successful for ${account.role}:`);
    console.log(`   Email: ${account.email}`);
    console.log(`   Name: ${user.first_name} ${user.last_name}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   ID: ${user.id}`);
    console.log('');
    
    return true;
    
  } catch (error) {
    console.error(`❌ Error testing login for ${account.role}:`, error);
    return false;
  }
};

// Test all admin accounts
const testAllLogins = async () => {
  console.log('🚀 Testing login for all admin accounts...\n');
  
  try {
    const results = [];
    
    for (const account of adminAccounts) {
      const success = await testLogin(account);
      results.push({ account, success });
    }
    
    console.log('📊 Login Test Results:');
    console.log('======================');
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`✅ Successful logins: ${successful}/${adminAccounts.length}`);
    console.log(`❌ Failed logins: ${failed}/${adminAccounts.length}`);
    
    if (failed > 0) {
      console.log('\n❌ Failed accounts:');
      results.filter(r => !r.success).forEach(({ account }) => {
        console.log(`   - ${account.role}: ${account.email}`);
      });
    }
    
    console.log('\n🎉 Login testing completed!');
    
  } catch (error) {
    console.error('❌ Error testing logins:', error);
    process.exit(1);
  }
};

// Run the script
if (require.main === module) {
  testAllLogins()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { testAllLogins, testLogin };

