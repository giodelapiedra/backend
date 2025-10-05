const axios = require('axios');
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/occupational-rehab', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function testRegistration() {
  try {
    console.log('Testing registration with valid data...');
    
    const testUser = {
      firstName: 'Test',
      lastName: 'User',
      email: 'testuser@example.com',
      password: 'Password123!',
      role: 'worker',
      phone: '+1234567890',
      address: {
        street: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        zipCode: '12345',
        country: 'Test Country'
      },
      emergencyContact: {
        name: 'Emergency Contact',
        relationship: 'Friend',
        phone: '+1234567890',
        email: 'emergency@example.com'
      },
      medicalInfo: {
        bloodType: 'O+',
        allergies: [],
        medications: [],
        medicalConditions: []
      }
    };

    console.log('Sending registration request...');
    const response = await axios.post('http://localhost:5000/api/auth/register', testUser);
    
    console.log('✅ Registration successful!');
    console.log('Status:', response.status);
    console.log('Response:', response.data);
    
  } catch (error) {
    console.log('❌ Registration failed!');
    console.log('Status:', error.response?.status);
    console.log('Error:', error.response?.data);
    
    if (error.response?.data?.errors) {
      console.log('Validation errors:');
      Object.entries(error.response.data.errors).forEach(([field, message]) => {
        console.log(`  ${field}: ${message}`);
      });
    }
  }
}

async function testRegistrationMinimal() {
  try {
    console.log('\nTesting registration with minimal required data...');
    
    const minimalUser = {
      firstName: 'Minimal',
      lastName: 'User',
      email: 'minimal@example.com',
      password: 'Password123!',
      role: 'worker'
    };

    console.log('Sending minimal registration request...');
    const response = await axios.post('http://localhost:5000/api/auth/register', minimalUser);
    
    console.log('✅ Minimal registration successful!');
    console.log('Status:', response.status);
    console.log('Response:', response.data);
    
  } catch (error) {
    console.log('❌ Minimal registration failed!');
    console.log('Status:', error.response?.status);
    console.log('Error:', error.response?.data);
    
    if (error.response?.data?.errors) {
      console.log('Validation errors:');
      Object.entries(error.response.data.errors).forEach(([field, message]) => {
        console.log(`  ${field}: ${message}`);
      });
    }
  }
}

async function testRegistrationInvalidPassword() {
  try {
    console.log('\nTesting registration with invalid password...');
    
    const invalidPasswordUser = {
      firstName: 'Invalid',
      lastName: 'Password',
      email: 'invalidpass@example.com',
      password: 'password123', // Missing uppercase and special character
      role: 'worker'
    };

    console.log('Sending invalid password registration request...');
    const response = await axios.post('http://localhost:5000/api/auth/register', invalidPasswordUser);
    
    console.log('❌ This should have failed but succeeded!');
    console.log('Status:', response.status);
    console.log('Response:', response.data);
    
  } catch (error) {
    console.log('✅ Invalid password correctly rejected!');
    console.log('Status:', error.response?.status);
    console.log('Error:', error.response?.data);
    
    if (error.response?.data?.errors) {
      console.log('Validation errors:');
      Object.entries(error.response.data.errors).forEach(([field, message]) => {
        console.log(`  ${field}: ${message}`);
      });
    }
  }
}

async function runTests() {
  console.log('🧪 Testing Registration System\n');
  
  await testRegistration();
  await testRegistrationMinimal();
  await testRegistrationInvalidPassword();
  
  console.log('\n🏁 Tests completed!');
  process.exit(0);
}

runTests().catch(console.error);


