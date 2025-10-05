const axios = require('axios');

async function testLogin() {
  try {
    console.log('Testing login API...');
    
    // First, get CSRF token
    console.log('1. Getting CSRF token...');
    const csrfResponse = await axios.get('http://localhost:5000/api/csrf-token', {
      withCredentials: true
    });
    console.log('CSRF token received:', csrfResponse.data.csrfToken ? 'Yes' : 'No');
    
    // Test login
    console.log('2. Testing login...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'john.doe@example.com',
      password: 'Worker123'
    }, {
      withCredentials: true,
      headers: {
        'X-CSRF-Token': csrfResponse.data.csrfToken,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Login successful!');
    console.log('Status:', loginResponse.status);
    console.log('User:', loginResponse.data.user.email);
    console.log('Role:', loginResponse.data.user.role);
    console.log('Token exists:', !!loginResponse.data.token);
    
  } catch (error) {
    console.error('Login failed:');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.response?.data?.message);
    console.error('Error:', error.message);
    
    if (error.response?.data) {
      console.error('Response data:', error.response.data);
    }
  }
}

testLogin();
