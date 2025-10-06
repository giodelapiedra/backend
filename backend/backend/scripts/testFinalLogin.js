const axios = require('axios');

// API URL
const API_URL = 'http://localhost:5000/api';

// Final admin credentials
const credentials = {
  email: 'admin@admin.com',
  password: 'admin'
};

// Test login with API
async function testLogin() {
  try {
    console.log('🔍 Testing login with API...');
    console.log(`Email: ${credentials.email}`);
    console.log(`Password: ${credentials.password}`);
    
    // Make API call
    const response = await axios.post(`${API_URL}/auth/login`, credentials);
    
    console.log('\n✅ Login successful!');
    console.log('User data:', response.data.user);
    console.log('Token in cookies:', response.headers['set-cookie'] ? 'Yes' : 'No');
    
  } catch (error) {
    console.log('\n❌ Login failed!');
    console.log('Error:', error.response?.data?.message || error.message);
    
    if (error.response) {
      console.log('Status code:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
}

// Run the function
testLogin();
