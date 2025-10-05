const { supabase, db } = require('../config/supabase');

// Mapping of emails to their Supabase Auth IDs
const authIdMapping = {
  'admin_admin@test.com': 'aa82781a-bbbb-49be-ba0b-5c9a95accc7e',
  'admin_worker@test.com': '0f268ebe-f5ea-4e36-9d35-8a2252a78fc5',
  'admin_employer@test.com': 'c60ee7ab-ea50-4464-9322-dfa9a0f91d51',
  'admin_site_supervisor@test.com': '27e765a8-d935-4010-9694-38252ce86728',
  'admin_clinician@test.com': 'a550a314-e698-4c76-abce-d9f6a4b013ac',
  'admin_case_manager@test.com': '3f070bf3-fc72-465b-853e-32092224c34d',
  'admin_gp_insurer@test.com': '50165014-cfa7-4e69-b9ac-d43cea9baed1',
  'admin_team_leader@test.com': '380bdb06-2dc2-4766-8633-76aa7c48e13f'
};

// Update user with Supabase Auth ID
const updateUserAuthId = async (email, authId) => {
  try {
    console.log(`🔄 Updating user ${email} with auth ID ${authId}...`);
    
    // First, get the current user
    const user = await db.users.findByEmail(email);
    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return false;
    }
    
    // Update the user's ID to match the Supabase Auth ID
    const { data, error } = await supabase
      .from('users')
      .update({ id: authId })
      .eq('email', email)
      .select()
      .single();
    
    if (error) {
      console.error(`❌ Error updating user ${email}:`, error);
      return false;
    }
    
    console.log(`✅ Updated user ${email}:`);
    console.log(`   Old ID: ${user.id}`);
    console.log(`   New ID: ${authId}`);
    console.log('');
    
    return true;
    
  } catch (error) {
    console.error(`❌ Error updating user ${email}:`, error);
    return false;
  }
};

// Update all users
const updateAllUserAuthIds = async () => {
  console.log('🚀 Updating all users with Supabase Auth IDs...\n');
  
  try {
    const results = [];
    
    for (const [email, authId] of Object.entries(authIdMapping)) {
      const success = await updateUserAuthId(email, authId);
      results.push({ email, authId, success });
    }
    
    console.log('📊 Update Results:');
    console.log('==================');
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`✅ Successful: ${successful}/${results.length}`);
    console.log(`❌ Failed: ${failed}/${results.length}`);
    
    if (successful > 0) {
      console.log('\n✅ Updated users:');
      results.filter(r => r.success).forEach(({ email, authId }) => {
        console.log(`   ${email} -> ${authId}`);
      });
    }
    
    if (failed > 0) {
      console.log('\n❌ Failed to update:');
      results.filter(r => !r.success).forEach(({ email }) => {
        console.log(`   ${email}`);
      });
    }
    
    console.log('\n🎉 Auth ID update completed!');
    
  } catch (error) {
    console.error('❌ Error updating auth IDs:', error);
    process.exit(1);
  }
};

// Run the script
if (require.main === module) {
  updateAllUserAuthIds()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { updateAllUserAuthIds, updateUserAuthId };

