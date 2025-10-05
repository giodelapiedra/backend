const axios = require('axios');

async function checkServerStatus() {
  try {
    console.log('Checking if server is running...');
    
    // Try to connect to the server
    const response = await axios.get('http://localhost:5000/api/health', {
      timeout: 5000 // 5 second timeout
    });
    
    console.log('Server response:', response.data);
    console.log('Server is running!');
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('Server is not running. Connection refused.');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('Server connection timed out.');
    } else {
      console.error('Error checking server status:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
    }
  }
}

checkServerStatus();
