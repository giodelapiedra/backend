const { supabase } = require('../config/supabase');

// All admin accounts
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

// Test Supabase Auth login
const testAuthLogin = async (account) => {
  try {
    console.log(`🔐 Testing Supabase Auth login for ${account.role}...`);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: account.email,
      password: account.password
    });
    
    if (error) {
      console.log(`❌ Auth login failed for ${account.role}:`, error.message);
      return false;
    }
    
    console.log(`✅ Auth login successful for ${account.role}:`);
    console.log(`   Email: ${account.email}`);
    console.log(`   User ID: ${data.user.id}`);
    console.log(`   Session: ${data.session ? 'Active' : 'None'}`);
    console.log('');
    
    // Sign out after test
    await supabase.auth.signOut();
    
    return true;
    
  } catch (error) {
    console.error(`❌ Error testing auth login for ${account.role}:`, error);
    return false;
  }
};

// Test all auth logins
const testAllAuthLogins = async () => {
  console.log('🚀 Testing Supabase Auth login for all admin accounts...\n');
  
  try {
    const results = [];
    
    for (const account of adminAccounts) {
      const success = await testAuthLogin(account);
      results.push({ account, success });
    }
    
    console.log('📊 Supabase Auth Login Test Results:');
    console.log('====================================');
    
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
    
    console.log('\n🎉 Supabase Auth login testing completed!');
    
  } catch (error) {
    console.error('❌ Error testing auth logins:', error);
    process.exit(1);
  }
};

// Run the script
if (require.main === module) {
  testAllAuthLogins()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { testAllAuthLogins, testAuthLogin };

