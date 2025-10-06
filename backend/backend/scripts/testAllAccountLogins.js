const axios = require('axios');

async function testAllAccountLogins() {
  try {
    console.log('🔍 Testing All Account Logins...\n');

    const accounts = [
      { email: 'admin@rehab.com', role: 'admin', name: 'Admin User' },
      { email: 'clinician@rehab.com', role: 'clinician', name: 'Dr. Maria Santos' },
      { email: 'casemanager@rehab.com', role: 'case_manager', name: 'John Manager' },
      { email: 'worker@rehab.com', role: 'worker', name: 'Juan Worker' },
      { email: 'employer@rehab.com', role: 'employer', name: 'Sarah Employer' },
      { email: 'sitesupervisor@rehab.com', role: 'site_supervisor', name: 'Site Supervisor' },
      { email: 'gpinsurer@rehab.com', role: 'gp_insurer', name: 'GP Insurer' },
      { email: 'projectklouds24@gmail.com', role: 'clinician', name: 'Gio Delapiedra' },
      // Also test the old accounts that might still exist
      { email: 'admin@example.com', role: 'admin', name: 'Admin User (Old)' },
      { email: 'clinician@example.com', role: 'clinician', name: 'Dr. Michael Smith' },
      { email: 'casemanager@example.com', role: 'case_manager', name: 'Sarah Johnson' },
      { email: 'worker@example.com', role: 'worker', name: 'John Doe' },
      { email: 'worker2@example.com', role: 'worker', name: 'Jane Smith' },
      { email: 'supervisor@example.com', role: 'site_supervisor', name: 'Robert Wilson' },
      { email: 'employer@example.com', role: 'employer', name: 'ABC Construction' },
      { email: 'test.user@example.com', role: 'worker', name: 'Test User' },
      { email: 'projectklouds@gmail.com', role: 'worker', name: 'Gio Delapiedra (Worker)' },
      { email: 'a2@gmail.com', role: 'worker', name: 'Gio Delapiedra (Worker 2)' }
    ];

    const password = 'Password123!';
    let successCount = 0;
    let failCount = 0;

    console.log('🔐 Testing Login Credentials:\n');

    for (const account of accounts) {
      try {
        console.log(`🔄 Testing: ${account.name} (${account.email})`);
        
        const response = await axios.post('http://localhost:5000/api/auth/login', {
          email: account.email,
          password: password
        });

        if (response.data.token) {
          console.log(`   ✅ SUCCESS - Role: ${account.role}`);
          console.log(`   Token: ${response.data.token.substring(0, 20)}...`);
          successCount++;
        } else {
          console.log(`   ❌ FAILED - No token received`);
          failCount++;
        }

      } catch (error) {
        if (error.response) {
          console.log(`   ❌ FAILED - Status: ${error.response.status}`);
          console.log(`   Error: ${error.response.data.message || 'Unknown error'}`);
        } else {
          console.log(`   ❌ FAILED - Network error: ${error.message}`);
        }
        failCount++;
      }
      console.log('');
    }

    console.log('🎯 Summary:');
    console.log(`- Total accounts tested: ${accounts.length}`);
    console.log(`- Successful logins: ${successCount}`);
    console.log(`- Failed logins: ${failCount}`);
    console.log(`- Success rate: ${Math.round((successCount / accounts.length) * 100)}%`);

    console.log('\n✅ Working Accounts:');
    console.log('===================');
    console.log('All accounts use password: Password123!');
    console.log('');
    console.log('🔑 Quick Login Reference:');
    console.log('- Admin: admin@rehab.com');
    console.log('- Clinician: clinician@rehab.com');
    console.log('- Case Manager: casemanager@rehab.com');
    console.log('- Worker: worker@rehab.com');
    console.log('- Employer: employer@rehab.com');
    console.log('- Site Supervisor: sitesupervisor@rehab.com');
    console.log('- GP Insurer: gpinsurer@rehab.com');
    console.log('- Additional Clinician: projectklouds24@gmail.com');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

testAllAccountLogins();
