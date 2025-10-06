const axios = require('axios');

async function debugWorkersAPI() {
  try {
    console.log('🔍 Debugging Workers API...\n');

    // Step 1: Login as site supervisor
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'supervisor@example.com',
      password: 'Password123!'
    });
    
    const supervisorToken = loginResponse.data.token;
    console.log('✅ Site supervisor login successful');

    // Step 2: Get workers
    console.log('\n👥 Fetching workers...');
    const workersResponse = await axios.get('http://localhost:5000/api/users?role=worker', {
      headers: { 'Authorization': `Bearer ${supervisorToken}` }
    });
    
    console.log('Workers response:', JSON.stringify(workersResponse.data, null, 2));

  } catch (error) {
    console.error('❌ ERROR:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Message:', error.message);
    }
  }
}

debugWorkersAPI();
