const axios = require('axios');

async function testUserCreation() {
  try {
    console.log('Testing user creation API...');
    
    // First, login as admin to get token
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@example.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.token;
    console.log('Admin login successful, token received');
    
    // Test user creation
    const userData = {
      firstName: 'Test',
      lastName: 'Worker',
      email: 'test.worker@example.com',
      password: 'password123',
      role: 'worker',
      phone: '+63-912-345-6789'
    };
    
    console.log('Creating user with data:', userData);
    
    const createResponse = await axios.post('http://localhost:5000/api/users', userData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('User creation successful!');
    console.log('Response:', createResponse.data);
    
    // Test fetching users
    const usersResponse = await axios.get('http://localhost:5000/api/users', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Users fetched successfully!');
    console.log('Total users:', usersResponse.data.users.length);
    usersResponse.data.users.forEach(user => {
      console.log(`- ${user.firstName} ${user.lastName} (${user.email}) - ${user.role}`);
    });
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testUserCreation();
