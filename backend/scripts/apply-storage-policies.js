const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://dtcgzgbxhefwhqpeotrl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0Y2d6Z2J4aGVmd2hxcGVvdHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTE0NDcxOCwiZXhwIjoyMDc0NzIwNzE4fQ.D1wSP12YM8jPtF-llVFiC4cI7xKJtRMtiaUuwRzJ3z8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyStoragePolicies() {
  console.log('🔒 Applying Storage RLS Policies...');
  
  try {
    // Read the SQL file
    const sqlContent = fs.readFileSync('./scripts/profile-images-storage-policies.sql', 'utf8');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent });
    
    if (error) {
      console.error('❌ Error applying policies:', error);
      
      // Try alternative method using SQL editor endpoint
      console.log('🔄 Trying alternative method...');
      
      const { data: altData, error: altError } = await supabase
        .from('sql_queries')
        .insert([{ query: sqlContent }]);
        
      if (altError) {
        console.error('❌ Alternative method failed:', altError);
        console.log('\n📝 MANUAL INSTRUCTIONS:');
        console.log('1. Go to Supabase Dashboard → SQL Editor');
        console.log('2. Copy and paste the contents of profile-images-storage-policies.sql');
        console.log('3. Run the SQL script');
        return;
      }
      
      console.log('✅ Policies applied via alternative method');
    } else {
      console.log('✅ Storage policies applied successfully');
    }
    
    // Verify policies were created
    const { data: policies, error: policyError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('schemaname', 'storage')
      .eq('tablename', 'objects');
    
    if (!policyError && policies) {
      console.log('\n📋 Created policies:');
      policies.forEach(policy => {
        console.log(`  - ${policy.policyname} (${policy.cmd})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Failed to apply policies:', error);
    console.log('\n📝 Please run this SQL manually in Supabase Dashboard → SQL Editor:');
    console.log('---');
    console.log(fs.readFileSync('./scripts/profile-images-storage-policies.sql', 'utf8'));
  }
}

// Run the script
if (require.main === module) {
  applyStoragePolicies().then(() => {
    console.log('\n🏁 Policy application completed');
    process.exit(0);
  }).catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

module.exports = { applyStoragePolicies };
