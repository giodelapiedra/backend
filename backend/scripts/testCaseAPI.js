const axios = require('axios');
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Test case ID from the URL
const caseId = '68d35022e3e7033f2ade12dd';

// Function to make the API request
async function testCaseAPI(token) {
  try {
    console.log(`Testing API endpoint for case ID: ${caseId}`);
    console.log(`Using token: ${token.substring(0, 15)}...`);
    
    const response = await axios({
      method: 'get',
      url: `http://localhost:5000/api/cases/${caseId}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('API Response Status:', response.status);
    console.log('API Response Data:', JSON.stringify(response.data, null, 2).substring(0, 500) + '...');
    
    if (response.data && response.data.case) {
      console.log('Case found successfully!');
      console.log('- Case Number:', response.data.case.caseNumber);
      console.log('- Status:', response.data.case.status);
      console.log('- Priority:', response.data.case.priority);
      
      // Check clinician assignment
      if (response.data.case.clinician) {
        console.log('- Clinician:', typeof response.data.case.clinician);
        if (typeof response.data.case.clinician === 'object') {
          console.log(`  - Name: ${response.data.case.clinician.firstName} ${response.data.case.clinician.lastName}`);
          console.log(`  - Email: ${response.data.case.clinician.email}`);
          console.log(`  - ID: ${response.data.case.clinician._id}`);
        } else {
          console.log(`  - ID: ${response.data.case.clinician}`);
        }
      } else {
        console.log('- No clinician assigned');
      }
    } else {
      console.error('Invalid response format:', response.data);
    }
    
  } catch (error) {
    console.error('API request failed:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message
    });
    
    if (error.response) {
      console.error('Error response data:', error.response.data);
    }
  } finally {
    rl.close();
  }
}

// Get JWT token from user input
rl.question('Enter your JWT token: ', (token) => {
  testCaseAPI(token);
});
