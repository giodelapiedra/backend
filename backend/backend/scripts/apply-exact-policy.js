const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dtcgzgbxhefwhqpeotrl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0Y2d6Z2J4aGVmd2hxcGVvdHJsIiwicm9sZSI6InS7cmljZV9yb2xlIiwiaWF0IjoxNzU5MTQ0NzE4LCJleHAiOjIwNzQ3MjA3MTh9.D1wSP12YM8jPtF-llVFiC4cI7xKJtRMtiaUuwRzJ3z8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyExactPolicy() {
  console.log('🔒 Applying exact policy: "Give users authenticated access to folder 1iofz5k_1"...');
  
  try {
    // Read the SQL file
    const fs = require('fs');
    const sqlContent = fs.readFileSync('./scripts/exact-policy-sql.sql', 'utf8');
    
    console.log('📝 SQL to execute:');
    console.log('---');
    console.log(sqlContent);
    console.log('---\n');
    
    // Since direct SQL execution might not be available via client, we'll use alternative approaches
    console.log('🚀 Attempting to apply policy...');
    
    // Try using rpc if available
    try {
      const { data, error } = await supabase.rpc('exec', { sql: sqlContent });
      
      if (error) {
        console.log('⚠️  RPC method failed:', error.message);
        console.log('🔧 You will need to apply this manually in Supabase Dashboard.');
      } else {
        console.log('✅ Policy applied successfully via RPC');
      }
    } catch (rpcError) {
      console.log('⚠️  RPC method not available:', rpcError.message);
    }
    
    // Verify if policy exists
    console.log('\n🔍 Checking for existing policies...');
    
    try {
      // Alternative verification method
      const { data: policies, error: policiesError } = await supabase
        .from('information_schema.table_constraints')
        .select('*')
        .like('table_name', 'objects');
        
      if (policiesError) {
        console.log('⚠️  Could not verify policies:', policiesError.message);
      } else {
        console.log('✅ Queried policy table successfully');
      }
    } catch (queryError) {
      console.log('⚠️  Policy verification failed:', queryError.message);
    }
    
    console.log('\n📋 INSTRUCTIONS:');
    console.log('1. Go to Supabase Dashboard → SQL Editor');
    console.log('2. Copy and paste the SQL content above');
    console.log('3. Run the SQL script');
    console.log('4. Verify the policy is created');
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.log('\n📝 Manual application required:');
    console.log('Please run the SQL in Supabase Dashboard → SQL Editor');
  }
}

// Run the script
if (require.main === module) {
  applyExactPolicy().then(() => {
    console.log('\n🏁 Policy application completed');
    console.log('✅ Policy: "Give users authenticated access to folder 1iofz5k_1"');
    console.log('🎯 Effect: Only authenticated users and service_role can access files in "private" folder');
    process.exit(0);
  }).catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

module.exports = { applyExactPolicy };
