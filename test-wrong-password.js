const axios = require('axios');

async function testLoginWithWrongPassword() {
  try {
    console.log('Testing login with wrong password...');
    
    // First, get CSRF token
    const csrfResponse = await axios.get('http://localhost:5000/api/csrf-token', {
      withCredentials: true
    });
    
    // Try login with wrong password
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'john.doe@example.com',
      password: 'wrongpassword123'
    }, {
      withCredentials: true,
      headers: {
        'X-CSRF-Token': csrfResponse.data.csrfToken,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Login succeeded (unexpected):', loginResponse.data);
    
  } catch (error) {
    console.log('Login failed (expected):');
    console.log('Status:', error.response?.status);
    console.log('Message:', error.response?.data?.message);
    
    if (error.response?.status === 401 && error.response?.data?.message === 'Invalid credentials') {
      console.log('✅ CORRECT: System properly rejecting wrong password');
    } else {
      console.log('❌ UNEXPECTED ERROR:', error.response?.data?.message);
    }
  }
}

testLoginWithWrongPassword();
