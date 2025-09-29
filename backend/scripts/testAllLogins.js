const axios = require('axios');

// API URL
const API_URL = 'http://localhost:5000/api';

// All user credentials to test
const testCredentials = [
  // Admin accounts
  { email: 'admin@example.com', password: 'admin123', role: 'admin' },
  { email: 'system.admin@example.com', password: 'admin123', role: 'admin' },
  { email: 'super.admin@example.com', password: 'admin123', role: 'admin' },
  { email: 'new.admin@example.com', password: 'admin123', role: 'admin' },
  { email: 'superadmin@example.com', password: 'admin123', role: 'admin' },
  { email: 'simple@admin.com', password: 'admin123', role: 'admin' },
  { email: 'test@admin.com', password: 'admin123', role: 'admin' },
  { email: 'admin@admin.com', password: 'admin123', role: 'admin' },
  
  // Worker accounts
  { email: 'john.doe@example.com', password: 'Password123!', role: 'worker' },
  { email: 'jane.smith@example.com', password: 'Password123!', role: 'worker' },
  { email: 'test.user@example.com', password: 'Password123!', role: 'worker' },
  
  // Clinician accounts
  { email: 'michael.johnson@example.com', password: 'Password123!', role: 'clinician' },
  { email: 'projectklouds24@gmail.com', password: 'Password123!', role: 'clinician' },
  
  // Case Manager accounts
  { email: 'sarah.wilson@example.com', password: 'Password123!', role: 'case_manager' },
  
  // Employer accounts
  { email: 'test@company.com', password: 'Password123!', role: 'employer' },
  
  // Site Supervisor accounts
  { email: 'supervisor@company.com', password: 'Password123!', role: 'site_supervisor' },
  
  // GP/Insurer accounts
  { email: 'gp.insurer@example.com', password: 'Password123!', role: 'gp_insurer' }
];

// Test login for all users
async function testAllLogins() {
  console.log('🧪 Testing login for all users...');
  console.log('='.repeat(80));
  
  let successCount = 0;
  let failCount = 0;
  
  for (const credentials of testCredentials) {
    try {
      console.log(`\n🔍 Testing: ${credentials.email} (${credentials.role})`);
      
      // Make API call
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: credentials.email,
        password: credentials.password
      });
      
      console.log(`✅ SUCCESS - ${credentials.email}`);
      console.log(`   Role: ${response.data.user.role}`);
      console.log(`   Name: ${response.data.user.firstName} ${response.data.user.lastName}`);
      
      successCount++;
      
    } catch (error) {
      console.log(`❌ FAILED - ${credentials.email}`);
      console.log(`   Error: ${error.response?.data?.message || error.message}`);
      
      failCount++;
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`📊 TEST RESULTS:`);
  console.log(`✅ Successful logins: ${successCount}`);
  console.log(`❌ Failed logins: ${failCount}`);
  console.log(`📈 Success rate: ${((successCount / testCredentials.length) * 100).toFixed(1)}%`);
  
  if (failCount === 0) {
    console.log('\n🎉 All users can now login successfully!');
  } else {
    console.log(`\n⚠️  ${failCount} users still have login issues.`);
  }
}

// Run the function
testAllLogins();
