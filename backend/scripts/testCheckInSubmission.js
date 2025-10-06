const axios = require('axios');

async function testCheckInSubmission() {
  try {
    console.log('Testing check-in submission...');
    
    // First, login as a worker
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'test.worker@example.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.token;
    console.log('Worker login successful, token received');
    
    // Get cases for the worker
    const casesResponse = await axios.get('http://localhost:5000/api/cases', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Cases fetched:', casesResponse.data.cases.length);
    
    if (casesResponse.data.cases.length === 0) {
      console.log('No cases found for worker. Creating a test case...');
      
      // Login as admin to create a case
      const adminLoginResponse = await axios.post('http://localhost:5000/api/auth/login', {
        email: 'admin@example.com',
        password: 'password123'
      });
      
      const adminToken = adminLoginResponse.data.token;
      
      // Create a test case
      const caseData = {
        caseNumber: 'TEST-CASE-001',
        incident: '68cbb5557cc290d36200856b', // Use existing incident
        worker: loginResponse.data.user._id,
        clinician: '68ccce00ba1d1bdeb7747535', // Use existing clinician
        caseManager: '68cbb5567cc290d36200856d', // Use existing case manager
        status: 'active',
        injuryDetails: {
          bodyPart: 'Back',
          injuryType: 'Strain',
          description: 'Lower back strain from lifting'
        }
      };
      
      const caseResponse = await axios.post('http://localhost:5000/api/cases', caseData, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Test case created:', caseResponse.data.case.caseNumber);
      
      // Now try check-in with the new case
      const checkInData = {
        case: caseResponse.data.case._id,
        painLevel: { current: 3 },
        functionalStatus: {
          sleep: 8,
          mood: 8,
        },
        workStatus: {
          workedToday: true,
          difficulties: [],
        }
      };
      
      console.log('Submitting check-in with data:', JSON.stringify(checkInData, null, 2));
      
      const checkInResponse = await axios.post('http://localhost:5000/api/check-ins', checkInData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('SUCCESS! Check-in created:', checkInResponse.data);
      
    } else {
      // Use existing case
      const caseId = casesResponse.data.cases[0]._id;
      
      const checkInData = {
        case: caseId,
        painLevel: { current: 3 },
        functionalStatus: {
          sleep: 8,
          mood: 8,
        },
        workStatus: {
          workedToday: true,
          difficulties: [],
        }
      };
      
      console.log('Submitting check-in with data:', JSON.stringify(checkInData, null, 2));
      
      const checkInResponse = await axios.post('http://localhost:5000/api/check-ins', checkInData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('SUCCESS! Check-in created:', checkInResponse.data);
    }
    
  } catch (error) {
    console.error('ERROR DETAILS:');
    console.error('Message:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testCheckInSubmission();
