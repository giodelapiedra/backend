const axios = require('axios');

async function testLoginErrorMessages() {
  console.log('🧪 Testing Login Error Messages...\n');
  
  try {
    // Get CSRF token
    const csrfResponse = await axios.get('http://localhost:5000/api/csrf-token', {
      withCredentials: true
    });
    
    console.log('1. Testing with wrong password...');
    try {
      await axios.post('http://localhost:5000/api/auth/login', {
        email: 'john.doe@example.com',
        password: 'wrongpassword'
      }, {
        withCredentials: true,
        headers: {
          'X-CSRF-Token': csrfResponse.data.csrfToken,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.log('✅ Error Message:', error.response?.data?.message);
      console.log('✅ Status Code:', error.response?.status);
    }
    
    console.log('\n2. Testing with non-existent email...');
    try {
      await axios.post('http://localhost:5000/api/auth/login', {
        email: 'nonexistent@example.com',
        password: 'Worker123'
      }, {
        withCredentials: true,
        headers: {
          'X-CSRF-Token': csrfResponse.data.csrfToken,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.log('✅ Error Message:', error.response?.data?.message);
      console.log('✅ Status Code:', error.response?.status);
    }
    
    console.log('\n3. Testing with correct credentials...');
    try {
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
      console.log('✅ Login Success:', loginResponse.data.message);
    } catch (error) {
      console.log('❌ Unexpected Error:', error.response?.data?.message);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testLoginErrorMessages();
