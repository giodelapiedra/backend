const axios = require('axios');

async function testLogout() {
  console.log('🚪 Testing Logout Functionality...\n');
  
  try {
    // First, login to get a token
    console.log('1. Logging in...');
    const csrfResponse = await axios.get('http://localhost:5000/api/csrf-token', {
      withCredentials: true
    });
    
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
    
    console.log('✅ Login successful');
    
    // Now test logout
    console.log('\n2. Testing logout...');
    const logoutResponse = await axios.post('http://localhost:5000/api/auth/logout', {}, {
      withCredentials: true,
      headers: {
        'X-CSRF-Token': csrfResponse.data.csrfToken,
        'Authorization': `Bearer ${loginResponse.data.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Logout successful:', logoutResponse.data.message);
    console.log('✅ Server-side cookies should be cleared');
    console.log('✅ Frontend should also clear cookies and state');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
  }
}

testLogout();
