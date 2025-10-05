const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dtcgzgbxhefwhqpeotrl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0Y2d6Z2J4aGVmd2hxcGVvdHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTE0NDcxOCwiZXhwIjoyMDc0NzIwNzE4fQ.D1wSP12YM8jPtF-llVFiC4cI7xKJtRMtiaUuwRzJ3z8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixSupabaseStorage() {
  console.log('🔧 Fixing Supabase Storage Configuration...');
  
  try {
    // Check if physio bucket exists
    console.log('1. Checking bucket...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
      return;
    }
    
    console.log('Available buckets:', buckets.map(b => ({ id: b.id, public: b.public })));
    
    const physioBucket = buckets.find(b => b.id === 'physio');
    
    if (!physioBucket) {
      console.log('🚨 physio bucket not found! Creating it...');
      
      // Create bucket
      const { data: bucketData, error: bucketError } = await supabase.storage.createBucket('physio', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      });
      
      if (bucketError) {
        console.error('Error creating bucket:', bucketError);
        return;
      }
      
      console.log('✅ Bucket created:', bucketData);
    } else {
      console.log('✅ physio bucket exists, making sure it\'s public:', physioBucket.public);
      
      if (!physioBucket.public) {
        console.log('🔒 Bucket is not public! This might cause 400 errors.');
        console.log('Please go to Supabase Dashboard > Storage and set the bucket to public.');
      }
    }
    
    // Check bucket policies
    console.log('\n2. Checking bucket policies...');
    try {
      const { data: policies } = await supabase.rpc('get_bucket_policies', { bucket_name: 'physio' });
      console.log('Bucket policies:', policies);
    } catch (policyError) {
      console.log('Could not fetch policies (this is normal):', policyError.message);
    }
    
    // Test uploading a file
    console.log('\n3. Testing image upload...');
    
    // Check if there are any existing profile images
    const { data: files, error: listError } = await supabase.storage
      .from('physio')
      .list('profile-images', {
        limit: 5,
        sortBy: { column: 'created_at', order: 'desc' }
      });
    
    if (listError) {
      console.log('Error listing files:', listError);
      console.log('This might mean the folder structure needs to be created.');
    } else {
      console.log('📁 Existing profile images:', files);
    }
    
    console.log('\n✅ Storage check complete!');
    console.log('\nIf you\'re still getting 400 errors:');
    console.log('1. Go to Supabase Dashboard > Storage');
    console.log('2. Make sure "physio" bucket is set to public');
    console.log('3. Check bucket policies allow public read access');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the fix
fixSupabaseStorage().then(() => {
  console.log('\n🏁 Storage fix completed');
  process.exit(0);
}).catch(error => {
  console.error('Failed:', error);
  process.exit(1);
});
