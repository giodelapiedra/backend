const axios = require('axios');

async function testSupervisorLogin() {
  try {
    console.log('🔍 Testing Supervisor Login...\n');

    console.log('🔄 Testing: Robert Wilson (supervisor@example.com)');
    
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'supervisor@example.com',
      password: 'Password123!'
    });

    if (response.data.token) {
      console.log('✅ SUCCESS!');
      console.log(`- Name: ${response.data.user.firstName} ${response.data.user.lastName}`);
      console.log(`- Email: ${response.data.user.email}`);
      console.log(`- Role: ${response.data.user.role}`);
      console.log(`- Token: ${response.data.token.substring(0, 20)}...`);
      
      console.log('\n🎯 Login Details:');
      console.log('================');
      console.log('✅ Email: supervisor@example.com');
      console.log('✅ Password: Password123!');
      console.log('✅ Role: site_supervisor');
      console.log('✅ Status: WORKING');
      
    } else {
      console.log('❌ FAILED - No token received');
    }

  } catch (error) {
    if (error.response) {
      console.log('❌ FAILED');
      console.log(`- Status: ${error.response.status}`);
      console.log(`- Error: ${error.response.data.message || 'Unknown error'}`);
    } else {
      console.log('❌ FAILED - Network error:', error.message);
    }
  }
}

testSupervisorLogin();
