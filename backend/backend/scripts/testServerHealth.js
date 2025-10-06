const axios = require('axios');

async function testServerHealth() {
  try {
    console.log('Testing server health...');
    
    const response = await axios.get('http://localhost:5000/api/health');
    console.log('✅ Server is running');
    console.log('Response:', response.data);
    
  } catch (error) {
    console.error('❌ Server not responding:');
    console.error('Message:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('Server is not running on port 5000');
    }
  }
}

testServerHealth();
