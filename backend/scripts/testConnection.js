const axios = require('axios');

async function testConnection() {
  try {
    console.log('🔍 Testing Server Connection...\n');

    // Test basic connection
    console.log('🔄 Testing basic connection...');
    const response = await axios.get('http://localhost:5000/api/auth/login', {
      timeout: 5000
    });
    console.log('✅ Server is responding');
    console.log('Status:', response.status);

  } catch (error) {
    console.error('❌ Connection Error:');
    if (error.code === 'ECONNREFUSED') {
      console.error('Server is not running on port 5000');
    } else if (error.code === 'ENOTFOUND') {
      console.error('Cannot resolve localhost');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('Connection timeout');
    } else {
      console.error('Error code:', error.code);
      console.error('Message:', error.message);
    }
  }
}

testConnection();


