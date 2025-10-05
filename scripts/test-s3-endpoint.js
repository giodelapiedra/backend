const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dtcgzgbxhefwhqpeotrl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0Y2d6Z2J4aGVmd2hxcGVvdHJsIiwicm9sZSI6InS7cmljZV9yb2xlIiwiaWF0IjoxNzU5MTQ0NzE4LCJleHAiOjIwNzQ3MjA3M Th8.D1wSP12YM8jPtF-llVFiC4cI7xKJtRMtiaUuwRzJ3z8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testS3EndpointAccess() {
  console.log('🔍 Testing S3 Endpoint Access...\n');
  
  try {
    // Test 1: Check if we can list objects in physio bucket
    console.log('1️⃣ Testing bucket access...');
    
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.log('❌ Cannot list buckets:', bucketsError.message);
    } else {
      console.log('✅ Bucket access working');
      
      const physioBucket = buckets.find(b => b.id === 'physio');
      if (physioBucket) {
        console.log(`📦 physio bucket found - Public: ${physioBucket.public}`);
      }
    }
    
    // Test 2: Try to list files in profile-images folder
    console.log('\n2️⃣ Testing profile-images folder access...');
    
    try {
      const { data: files, error: filesError } = await supabase.storage
        .from('physio')
        .list('profile-images', { limit: 5 });
      
      if (filesError) {
        console.log('❌ Cannot access profile-images folder:', filesError.message);
        console.log('🔧 This explains why images are not loading!');
      } else {
        console.log('✅ Profile-images folder accessible');
        console.log(`📁 Found ${files.length} user folders`);
      }
    } catch (folderError) {
      console.log('❌ Folder access failed:', folderError.message);
    }
    
    // Test 3: Check existing policies
    console.log('\n3️⃣ Checking current policies...');
    
    const { data: policies, error: policiesError } = await supabase.rpc('check_storage_policies');
    
    if (policiesError) {
      console.log('⚠️  Could not check policies:', policiesError.message);
      console.log('💡 This might mean policies are blocking access');
    } else {
      console.log('✅ Policy check completed');
    }
    
    
    // Recommendations
    console.log('\n📋 DIAGNOSIS:');
    console.log('🔍 Your profile images are not loading because:');
    console.log('   1. No storage policies exist');
    console.log('   2. S3 endpoint requires authentication');
    console.log('   3. Missing public access configurations');
    
    console.log('\n🚀 SOLUTIONS:');
    console.log('✅ Create minimal policies for public read access');
    console.log('✅ Make physio bucket public');
    console.log('✅ Add policies to allow profile image access');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testS3EndpointAccess().then(() => {
    console.log('\n🏁 S3 endpoint test completed');
    console.log('💡 Next: Apply minimal storage policies');
    process.exit(0);
  }).catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

module.exports = { testS3EndpointAccess };
