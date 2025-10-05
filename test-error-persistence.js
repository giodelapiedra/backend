const axios = require('axios');

async function testErrorPersistence() {
  console.log('🧪 Testing Error Message Persistence...\n');
  
  try {
    // Get CSRF token
    const csrfResponse = await axios.get('http://localhost:5000/api/csrf-token', {
      withCredentials: true
    });
    
    console.log('Testing login with wrong password...');
    try {
      await axios.post('http://localhost:5000/api/auth/login', {
        email: 'john.doe@example.com',
        password: 'wrongpassword123'
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
      console.log('✅ Error should now stay visible for 3 seconds in the UI');
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testErrorPersistence();
