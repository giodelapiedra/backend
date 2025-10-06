const axios = require('axios');

async function testCaseDetailsNavigation() {
  try {
    console.log('Testing Case Details navigation...');
    
    // Login as clinician
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'projectklouds24@gmail.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Clinician login successful');
    
    // Get cases to find a case ID
    const casesResponse = await axios.get('http://localhost:5000/api/cases', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Cases fetched successfully');
    console.log('Total cases:', casesResponse.data.cases?.length || 0);
    
    if (casesResponse.data.cases && casesResponse.data.cases.length > 0) {
      const caseId = casesResponse.data.cases[0]._id;
      const caseNumber = casesResponse.data.cases[0].caseNumber;
      
      console.log(`\n📋 Testing case details for: ${caseNumber}`);
      console.log(`Case ID: ${caseId}`);
      
      // Test case details API
      const caseDetailsResponse = await axios.get(`http://localhost:5000/api/cases/${caseId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Case details API working');
      console.log('Case details response:', {
        caseNumber: caseDetailsResponse.data.case?.caseNumber,
        status: caseDetailsResponse.data.case?.status,
        worker: caseDetailsResponse.data.case?.worker?.firstName + ' ' + caseDetailsResponse.data.case?.worker?.lastName,
        clinician: caseDetailsResponse.data.case?.clinician?.firstName + ' ' + caseDetailsResponse.data.case?.clinician?.lastName,
        hasLastCheckIn: !!caseDetailsResponse.data.case?.lastCheckIn
      });
      
      console.log('\n🎯 Navigation URL would be:');
      console.log(`http://localhost:3000/cases/${caseId}`);
      
    } else {
      console.log('No cases found for testing');
    }
    
  } catch (error) {
    console.error('❌ ERROR:');
    console.error('Message:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testCaseDetailsNavigation();
