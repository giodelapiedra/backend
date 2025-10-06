const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dtcgzgbxhefwhqpeotrl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0Y2d6Z2J4aGVmd2hxcGVvdHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTE0NDcxOCwiZXhwIjoyMDc0NzIwNzE4fQ.D1wSP12YM8jPtF-llVFiC4cI7xKJtRMtiaUuwRzJ3z8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function makePhysioBucketPublic() {
  console.log('🔓 Making physio bucket public...');
  
  try {
    // First, let's update the bucket to make it public using REST API
    const response = await fetch('https://dtcgzgbxhefwhqpeotrl.supabase.co/rest/v1/storage/v1/bucket/physio', {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        public: true,
        file_size_limit: 5242880, // 5MB
        allowed_mime_types: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      })
    });
    
    console.log('Bucket update response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Bucket made public successfully:', result);
    } else {
      const error = await response.text();
      console.log('❌ Failed to make bucket public:', error);
    }
    
    // Verify the change
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (!bucketsError) {
      const physioBucket = buckets.find(b => b.id === 'physio');
      console.log('🔍 Verification - physio bucket public status:', physioBucket?.public);
    }
    
  } catch (error) {
    console.error('Error making bucket public:', error);
  }
}

// Run the fix
makePhysioBucketPublic().then(() => {
  console.log('\n🏁 Bucket public status updated');
  process.exit(0);
}).catch(error => {
  console.error('Failed:', error);
  process.exit(1);
});
