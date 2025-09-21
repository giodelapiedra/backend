const axios = require('axios');

async function testPasswordValidation() {
  console.log('🔐 Testing Password Validation Requirements\n');
  
  const testPasswords = [
    { password: 'password123', description: 'Too short, no uppercase, no special char' },
    { password: 'Password123', description: 'Missing special character' },
    { password: 'password123!', description: 'Missing uppercase' },
    { password: 'PASSWORD123!', description: 'Missing lowercase' },
    { password: 'Password!', description: 'Missing number' },
    { password: 'Password123!', description: '✅ Valid password' },
    { password: 'MySecurePass123!', description: '✅ Valid password (longer)' },
    { password: 'Test123@', description: '✅ Valid password (different special char)' }
  ];

  for (const test of testPasswords) {
    try {
      console.log(`Testing: "${test.password}" - ${test.description}`);
      
      const response = await axios.post('http://localhost:5000/api/auth/register', {
        firstName: 'Test',
        lastName: 'User',
        email: `test${Date.now()}@example.com`,
        password: test.password,
        role: 'worker'
      });
      
      console.log('  ✅ SUCCESS - Password accepted\n');
      
    } catch (error) {
      if (error.response?.data?.errors) {
        console.log('  ❌ FAILED - Validation errors:');
        error.response.data.errors.forEach(err => {
          console.log(`    - ${err.msg}`);
        });
      } else {
        console.log('  ❌ FAILED - Other error:', error.response?.data?.message);
      }
      console.log('');
    }
  }
}

async function showPasswordRequirements() {
  console.log('📋 PASSWORD REQUIREMENTS:\n');
  console.log('1. At least 12 characters long');
  console.log('2. Must contain at least one uppercase letter (A-Z)');
  console.log('3. Must contain at least one lowercase letter (a-z)');
  console.log('4. Must contain at least one number (0-9)');
  console.log('5. Must contain at least one special character (@$!%*?&)\n');
  
  console.log('✅ VALID EXAMPLES:');
  console.log('  - Password123!');
  console.log('  - MySecurePass123!');
  console.log('  - Test123@');
  console.log('  - Worker2024!');
  console.log('  - RehabPass123$\n');
  
  console.log('❌ INVALID EXAMPLES:');
  console.log('  - password123 (too short, no uppercase, no special)');
  console.log('  - Password123 (no special character)');
  console.log('  - password123! (no uppercase)');
  console.log('  - PASSWORD123! (no lowercase)');
  console.log('  - Password! (no number)\n');
}

async function runTests() {
  await showPasswordRequirements();
  await testPasswordValidation();
  
  console.log('🏁 Password validation tests completed!');
  console.log('\n💡 TIP: When users register, make sure they use passwords that meet all requirements.');
  process.exit(0);
}

runTests().catch(console.error);


