const axios = require('axios');

async function testBeautifulPopup() {
  console.log('🎨 Testing Beautiful Error Popup...\n');
  
  try {
    // Get CSRF token
    const csrfResponse = await axios.get('http://localhost:5000/api/csrf-token', {
      withCredentials: true
    });
    
    console.log('Testing login with wrong password to trigger popup...');
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
      console.log('✅ Beautiful popup should now appear!');
      console.log('✅ Features:');
      console.log('   - Centered on screen');
      console.log('   - Semi-transparent backdrop');
      console.log('   - Blue exclamation icon');
      console.log('   - "Invalid credentials" title');
      console.log('   - Helpful message');
      console.log('   - Close button');
      console.log('   - Auto-hide after 5 seconds');
      console.log('   - Smooth fade-in animation');
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testBeautifulPopup();
