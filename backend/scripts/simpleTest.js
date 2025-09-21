const axios = require('axios');

async function simpleTest() {
  try {
    console.log('Testing server connection...');
    
    // Test health endpoint first
    const healthResponse = await axios.get('http://localhost:5000/api/health');
    console.log('Health check:', healthResponse.data);
    
    // Test login
    console.log('Testing login...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@example.com',
      password: 'password123'
    });
    
    console.log('Login successful!');
    console.log('Token received:', loginResponse.data.token ? 'Yes' : 'No');
    
    const token = loginResponse.data.token;
    
    // Test user creation with exact MongoDB format
    const userData = {
      firstName: 'Test',
      lastName: 'Worker',
      email: 'test.worker2@example.com',
      password: 'password123',
      role: 'worker',
      phone: '555-0123',
      isActive: true,
      medicalInfo: {
        allergies: [],
        medications: [],
        medicalConditions: []
      },
      isAvailable: true
    };
    
    console.log('Creating user with data:', JSON.stringify(userData, null, 2));
    
    const createResponse = await axios.post('http://localhost:5000/api/users', userData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('SUCCESS! User created:', createResponse.data);
    
  } catch (error) {
    console.error('ERROR DETAILS:');
    console.error('Message:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      console.error('Headers:', error.response.headers);
    }
    if (error.request) {
      console.error('Request made but no response received');
    }
  }
}

simpleTest();
