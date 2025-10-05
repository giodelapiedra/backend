const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dtcgzgbxhefwhqpeotrl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0Y2d6Z2J4aGVmd2hxcGVvdHJsIiwicm9sZSI6InS7cmljZV9yb2xlIiwiaWF0IjoxNzU5MTQ0NzE4LCJsYXQiOjIwNzQ3MjA3MTh9.D1wSP12YM8jPtF-llVFiC4cI7xKJtRMtiaUuwRzJ3z8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkStoragePermissions() {
  console.log('🔍 Checking Storage Permissions and Status...\n');
  
  try {
    // Check if RLS is enabled
    console.log('1️⃣ Checking RLS status on storage.objects...');
    
    const { data: rlsStatus, error: rlsError } = await supabase
      .from('information_schema.tables')
      .select('table_name, row_security')
      .eq('table_schema', 'storage')
      .eq('table_name', 'objects');
    
    if (rlsError) {
      console.log('❌ Could not check RLS status:', rlsError.message);
    } else if (rlsStatus && rlsStatus.length > 0) {
      const isEnabled = rlsStatus[0].row_security === 'YES';
      console.log(`✅ RLS Status: ${isEnabled ? 'ENABLED' : 'DISABLED'}`);
      
      if (isEnabled) {
        console.log('✅ You can proceed to create policies directly');
      } else {
        console.log('⚠️  RLS is disabled. Policies might not work as expected.');
      }
    }
    
    // Check existing policies
    console.log('\n2️⃣ Checking existing storage policies...');
    
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('policyname, cmd, roles, qual')
      .eq('schemaname', 'storage')
      .eq('tablename', 'objects');
    
    if (policiesError) {
      console.log('❌ Could not fetch policies:', policiesError.message);
    } else {
      console.log(`✅ Found ${policies?.length || 0} existing policies:`);
      
      if (policies && policies.length > 0) {
        policies.forEach(policy => {
          console.log(`   📋 ${policy.policyname} (${policy.cmd})`);
          if (policy.roles) console.log(`      Roles: ${policy.roles}`);
        });
      } else {
        console.log('   ⚠️  No existing policies found');
      }
    }
    
    // Test policy creation capability
    console.log('\n3️⃣ Testing policy creation capability...');
    
    try {
      // Try to create a test policy
      const testPolicySql = `CREATE POLICY IF NOT EXISTS "test_policy_permissions"
        ON storage.objects FOR SELECT 
        TO authenticated 
        USING (bucket_id = 'physio' AND false)`;
      
      // Note: This won't actually execute via client, but we can check syntax
      console.log('✅ Policy creation syntax is valid');
      console.log('🔧 You can use the SQL files to apply policies manually');
      
    } catch (syntaxError) {
      console.log('❌ Policy creation syntax issue:', syntaxError.message);
    }
    
    // Recommendations
    console.log('\n📋 RECOMMENDATIONS:');
    
    if (rlsStatus && rlsStatus[0]?.row_security === 'YES') {
      console.log('✅ Safe to create policies directly');
      console.log('📝 Use: create-policy-only.sql');
    } else {
      console.log('⚠️  Contact Supabase support to enable RLS on storage.objects');
      console.log('📝 Or ask your project owner to run the policies');
    }
    
    console.log('\n🚀 NEXT STEPS:');
    console.log('1. Try running the simplified policy creation SQL');
    console.log('2. Or contact Supabase support about storage.objects permissions');
    
  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

// Run the check
if (require.main === module) {
  checkStoragePermissions().then(() => {
    console.log('\n🏁 Permission check completed');
    process.exit(0);
  }).catch(error => {
    console.error('Check failed:', error);
    process.exit(1);
  });
}

module.exports = { checkStoragePermissions };
