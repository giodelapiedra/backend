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

// Create user in Supabase Auth
const createAuthUser = async (account) => {
  try {
    console.log(`🔐 Creating Supabase Auth user for ${account.role}...`);
    
    const { data, error } = await supabase.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: {
        first_name: 'Admin',
        last_name: account.role.charAt(0).toUpperCase() + account.role.slice(1),
        role: account.role
      }
    });
    
    if (error) {
      console.error(`❌ Error creating auth user for ${account.role}:`, error);
      return null;
    }
    
    console.log(`✅ Created Supabase Auth user for ${account.role}:`);
    console.log(`   Email: ${account.email}`);
    console.log(`   Auth ID: ${data.user.id}`);
    console.log('');
    
    return data.user;
    
  } catch (error) {
    console.error(`❌ Error creating auth user for ${account.role}:`, error);
    return null;
  }
};

// Create all auth users
const createAllAuthUsers = async () => {
  console.log('🚀 Creating Supabase Auth users for all admin accounts...\n');
  
  try {
    const results = [];
    
    for (const account of adminAccounts) {
      const authUser = await createAuthUser(account);
      results.push({ account, authUser });
    }
    
    console.log('📊 Auth User Creation Results:');
    console.log('================================');
    
    const successful = results.filter(r => r.authUser).length;
    const failed = results.filter(r => !r.authUser).length;
    
    console.log(`✅ Successful: ${successful}/${adminAccounts.length}`);
    console.log(`❌ Failed: ${failed}/${adminAccounts.length}`);
    
    if (successful > 0) {
      console.log('\n✅ Created auth users:');
      results.filter(r => r.authUser).forEach(({ account, authUser }) => {
        console.log(`   ${account.role}: ${account.email} (ID: ${authUser.id})`);
      });
    }
    
    if (failed > 0) {
      console.log('\n❌ Failed to create:');
      results.filter(r => !r.authUser).forEach(({ account }) => {
        console.log(`   ${account.role}: ${account.email}`);
      });
    }
    
    console.log('\n🎉 Auth user creation completed!');
    
  } catch (error) {
    console.error('❌ Error creating auth users:', error);
    process.exit(1);
  }
};

// Run the script
if (require.main === module) {
  createAllAuthUsers()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { createAllAuthUsers, createAuthUser };

