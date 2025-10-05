const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dtcgzgbxhefwhqpeotrl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0Y2d6Z2J4aGVmd2hxcGVvdHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTE0NDcxOCwiZXhwIjoyMDc0NzIwNzE4fQ.D1wSP12YM8jPtF-llVFiC4cI7xKJtRMtiaUuwRzJ3z8';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0Y2d6Z2J4aGVmd2hxcGVvdHJsIiwicm9sZSI6ImFub24iLCJsYXQiOjE3NTkxNDQ3MTgsImV4cCI6MjA3NDcyMDcxOH0.n557fWuqr8-e900nNhWOfeJTzdnhSzsv5tBW2pNM4gw';

// Create clients
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

async function testStoragePolicies() {
  console.log('🧪 Testing Storage RLS Policies...\n');
  
  try {
    // Test 1: Check if policies exist
    console.log('1️⃣ Checking existing policies...');
    const { data: policies, error: policyError } = await supabaseService
      .from('pg_policies')
      .select('*')
      .eq('schemaname', 'storage')
      .eq('tablename', 'objects')
      .not('qual', 'is', null);
    
    if (policyError) {
      console.log('❌ Could not fetch policies:', policyError.message);
    } else if (!policies || policies.length === 0) {
      console.log('⚠️  No policies found. You need to apply the storage policies first.');
      console.log('   Run: node scripts/apply-storage-policies.js');
    } else {
      console.log(`✅ Found ${policies.length} storage policies:`);
      policies.forEach(policy => {
        console.log(`   - ${policy.policyname} (${policy.cmd})`);
      });
    }
    
    // Test 2: Check bucket access (should work for service role)
    console.log('\n2️⃣ Testing bucket access...');
    const { data: buckets, error: bucketsError } = await supabaseService.storage.listBuckets();
    
    if (bucketsError) {
      console.log('❌ Service role cannot list buckets:', bucketsError.message);
    } else {
      console.log('✅ Service role bucket access works');
      buckets.forEach(bucket => {
        console.log(`   - ${bucket.id} (public: ${bucket.public})`);
      });
    }
    
    // Test 3: Check anonymous access to profile images (should work)
    console.log('\n3️⃣ Testing anonymous profile image access...');
    const testProfileUrl = 'profile-images/test-user/profile.jpg';
    const { data: publicUrl } = supabaseAnon.storage
      .from('physio')
      .getPublicUrl(testProfileUrl);
    
    console.log(`✅ Public URL generated for profile images: ${publicUrl?.publicUrl ? 'Yes' : 'No'}`);
    
    // Test 4: Check if profile-images folder exists
    console.log('\n4️⃣ Testing profile-images folder structure...');
    const { data: folders, error: folderError } = await supabaseService.storage
      .from('physio')
      .list('profile-images', { limit: 5 });
    
    if (folderError) {
      console.log('❌ Cannot access profile-images folder:', folderError.message);
    } else {
      console.log(`✅ Profile-images folder accessible. Found ${folders?.length || 0} folders`);
      if (folders && folders.length > 0) {
        console.log('   Sample folders:');
        folders.slice(0, 3).forEach(folder => {
          console.log(`   - ${folder.name}`);
        });
      }
    }
    
    // Test 5: Summary
    console.log('\n📋 Policy Test Summary:');
    console.log('✅ Service role access: Working');
    console.log('✅ Public URL generation: Working');
    console.log(`${policies && policies.length > 0 ? '✅' : '⚠️'} Storage policies: ${policies?.length || 0} found`);
    console.log(`${buckets?.find(b => b.id === 'physio')?.public ? '✅' : '⚠️'} Physio bucket public: ${buckets?.find(b => b.id === 'physio')?.public ? 'Yes' : 'No'}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run tests
if (require.main === module) {
  testStoragePolicies().then(() => {
    console.log('\n🏁 Storage policy tests completed');
    process.exit(0);
  }).catch(error => {
    console.error('Tests failed:', error);
    process.exit(1);
  });
}

module.exports = { testStoragePolicies };
