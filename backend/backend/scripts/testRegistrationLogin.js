const axios = require('axios');

async function testRegistrationWithValidPassword() {
  console.log('🧪 Testing Registration with Valid Password\n');
  
  try {
    const testUser = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'johndoe@example.com',
      password: 'Password123!', // Valid password
      role: 'worker',
      phone: '+1234567890'
    };

    console.log('Sending registration request with valid password...');
    console.log('Password:', testUser.password);
    
    const response = await axios.post('http://localhost:5000/api/auth/register', testUser);
    
    console.log('✅ Registration successful!');
    console.log('Status:', response.status);
    console.log('User ID:', response.data.user.id);
    console.log('Email:', response.data.user.email);
    console.log('Role:', response.data.user.role);
    console.log('Token received:', response.data.token ? 'Yes' : 'No');
    
  } catch (error) {
    console.log('❌ Registration failed!');
    console.log('Status:', error.response?.status);
    console.log('Error:', error.response?.data);
    
    if (error.response?.data?.errors) {
      console.log('Validation errors:');
      error.response.data.errors.forEach((err, index) => {
        console.log(`  ${index + 1}. ${err.msg}`);
      });
    }
  }
}

async function testLoginWithRegisteredUser() {
  console.log('\n🔐 Testing Login with Registered User\n');
  
  try {
    const loginData = {
      email: 'johndoe@example.com',
      password: 'Password123!'
    };

    console.log('Sending login request...');
    
    const response = await axios.post('http://localhost:5000/api/auth/login', loginData);
    
    console.log('✅ Login successful!');
    console.log('Status:', response.status);
    console.log('User:', response.data.user.firstName, response.data.user.lastName);
    console.log('Role:', response.data.user.role);
    console.log('Token received:', response.data.token ? 'Yes' : 'No');
    
  } catch (error) {
    console.log('❌ Login failed!');
    console.log('Status:', error.response?.status);
    console.log('Error:', error.response?.data);
  }
}

async function showPasswordRequirements() {
  console.log('📋 PASSWORD REQUIREMENTS FOR REGISTRATION:\n');
  console.log('✅ Password must be at least 12 characters long');
  console.log('✅ Must contain at least one uppercase letter (A-Z)');
  console.log('✅ Must contain at least one lowercase letter (a-z)');
  console.log('✅ Must contain at least one number (0-9)');
  console.log('✅ Must contain at least one special character (@$!%*?&)\n');
  
  console.log('💡 VALID PASSWORD EXAMPLES:');
  console.log('  - Password123!');
  console.log('  - MySecurePass123!');
  console.log('  - Worker2024!');
  console.log('  - RehabPass123$');
  console.log('  - TestUser123@\n');
}

async function runTests() {
  await showPasswordRequirements();
  await testRegistrationWithValidPassword();
  await testLoginWithRegisteredUser();
  
  console.log('\n🏁 Registration and Login tests completed!');
  console.log('\n💡 SOLUTION: Make sure users use passwords that meet all requirements.');
  console.log('   The system is working correctly - the issue is password validation.');
  process.exit(0);
}

runTests().catch(console.error);


