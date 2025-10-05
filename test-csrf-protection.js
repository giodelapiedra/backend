const axios = require('axios');

async function testCSRFProtection() {
  console.log('🔒 Testing CSRF Protection...\n');
  
  try {
    // Test 1: Try to make a POST request without CSRF token
    console.log('1. Testing POST without CSRF token (should fail)...');
    try {
      await axios.post('http://localhost:5000/api/auth/login', {
        email: 'test@example.com',
        password: 'test123'
      });
      console.log('❌ FAILED: Request succeeded without CSRF token!');
    } catch (error) {
      if (error.response?.status === 403 && error.response?.data?.message === 'CSRF token missing') {
        console.log('✅ SUCCESS: CSRF protection working - token missing error');
      } else {
        console.log('❌ UNEXPECTED ERROR:', error.response?.data?.message);
      }
    }
    
    // Test 2: Try with invalid CSRF token
    console.log('\n2. Testing POST with invalid CSRF token (should fail)...');
    try {
      await axios.post('http://localhost:5000/api/auth/login', {
        email: 'test@example.com',
        password: 'test123'
      }, {
        headers: {
          'X-CSRF-Token': 'invalid-token-12345'
        }
      });
      console.log('❌ FAILED: Request succeeded with invalid CSRF token!');
    } catch (error) {
      if (error.response?.status === 403 && error.response?.data?.message === 'Invalid CSRF token') {
        console.log('✅ SUCCESS: CSRF protection working - invalid token error');
      } else {
        console.log('❌ UNEXPECTED ERROR:', error.response?.data?.message);
      }
    }
    
    // Test 3: Try with valid CSRF token
    console.log('\n3. Testing POST with valid CSRF token (should work)...');
    try {
      // Get CSRF token first
      const csrfResponse = await axios.get('http://localhost:5000/api/csrf-token');
      const csrfToken = csrfResponse.data.csrfToken;
      
      const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
        email: 'john.doe@example.com',
        password: 'Worker123'
      }, {
        headers: {
          'X-CSRF-Token': csrfToken
        }
      });
      
      if (loginResponse.status === 200) {
        console.log('✅ SUCCESS: CSRF protection working - valid token accepted');
      } else {
        console.log('❌ UNEXPECTED: Login failed with valid CSRF token');
      }
    } catch (error) {
      if (error.response?.status === 401 && error.response?.data?.message === 'Invalid credentials') {
        console.log('✅ SUCCESS: CSRF protection working - valid token accepted (login failed due to wrong credentials, not CSRF)');
      } else {
        console.log('❌ UNEXPECTED ERROR:', error.response?.data?.message);
      }
    }
    
    // Test 4: Test GET request (should work without CSRF)
    console.log('\n4. Testing GET request (should work without CSRF)...');
    try {
      const response = await axios.get('http://localhost:5000/api/health');
      if (response.status === 200) {
        console.log('✅ SUCCESS: GET requests work without CSRF token');
      }
    } catch (error) {
      console.log('❌ FAILED: GET request failed:', error.message);
    }
    
    console.log('\n🔒 CSRF Protection Test Complete!');
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testCSRFProtection();
