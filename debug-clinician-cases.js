require('dotenv').config({ path: 'env.supabase' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseAnonKey ? 'Present' : 'Missing');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkClinicianCases() {
  console.log('=== CHECKING CLINICIAN CASES ===');
  
  // Find admin_clinician@test.com
  const { data: clinician, error: clinicianError } = await supabase
    .from('users')
    .select('id, first_name, last_name, email')
    .eq('email', 'admin_clinician@test.com')
    .single();

  if (clinicianError || !clinician) {
    console.error('Error finding clinician:', clinicianError?.message || 'Not found');
    return;
  }
  
  console.log('Clinician found:');
  console.log('  - ID:', clinician.id);
  console.log('  - Name:', clinician.first_name, clinician.last_name);
  console.log('  - Email:', clinician.email);
  
  // Get all cases assigned to this clinician
  const { data: cases, error: casesError } = await supabase
    .from('cases')
    .select('id, case_number, status, clinician_id, created_at')
    .eq('clinician_id', clinician.id)
    .order('created_at', { ascending: false });

  if (casesError) {
    console.error('Error fetching cases:', casesError.message);
    return;
  }
  
  console.log('\nTotal cases assigned to clinician:', cases.length);
  console.log('Cases:');
  cases.forEach((c, index) => {
    console.log('  ' + (index + 1) + '. ' + c.case_number + ' - Status: ' + c.status + ' - Created: ' + c.created_at);
  });
  
  // Calculate active cases
  const activeCases = cases.filter(c => 
    c.status && ['new', 'triaged', 'assessed', 'in_rehab'].includes(c.status)
  );
  
  console.log('\nActive cases (new, triaged, assessed, in_rehab):', activeCases.length);
  activeCases.forEach((c, index) => {
    console.log('  ' + (index + 1) + '. ' + c.case_number + ' - Status: ' + c.status);
  });
  
  // Check for recent assignments
  const recentCases = cases.filter(c => {
    const createdAt = new Date(c.created_at);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return createdAt > oneHourAgo;
  });
  
  console.log('\nCases assigned in last hour:', recentCases.length);
  recentCases.forEach((c, index) => {
    console.log('  ' + (index + 1) + '. ' + c.case_number + ' - Status: ' + c.status + ' - Created: ' + c.created_at);
  });
}

checkClinicianCases();




























