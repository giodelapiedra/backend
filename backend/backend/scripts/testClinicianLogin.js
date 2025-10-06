const axios = require('axios');

async function testClinicianLogin() {
  try {
    console.log('Testing clinician login...');
    
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'projectklouds24@gmail.com',
      password: 'password123'
    });
    
    console.log('✅ LOGIN SUCCESSFUL!');
    console.log('Response:', loginResponse.data);
    
    const token = loginResponse.data.token;
    console.log('Token received:', token ? 'YES' : 'NO');
    
    // Test accessing protected route
    const profileResponse = await axios.get('http://localhost:5000/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Profile access successful!');
    console.log('User profile:', profileResponse.data);
    
  } catch (error) {
    console.error('❌ LOGIN FAILED:');
    console.error('Message:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testClinicianLogin();
