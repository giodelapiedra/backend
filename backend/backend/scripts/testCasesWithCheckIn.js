const axios = require('axios');

async function testCasesWithCheckIn() {
  try {
    console.log('Testing Cases API with check-in data...');
    
    // Login as clinician to get cases
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'projectklouds24@gmail.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.token;
    console.log('Clinician login successful');
    
    // Get cases
    const casesResponse = await axios.get('http://localhost:5000/api/cases', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Cases fetched:', casesResponse.data.cases.length);
    
    casesResponse.data.cases.forEach((caseItem, index) => {
      console.log(`\nCase ${index + 1}:`);
      console.log(`- Case Number: ${caseItem.caseNumber}`);
      console.log(`- Status: ${caseItem.status}`);
      console.log(`- Worker: ${caseItem.worker?.firstName} ${caseItem.worker?.lastName}`);
      
      if (caseItem.lastCheckIn) {
        console.log(`- Last Check-in:`);
        console.log(`  - Date: ${new Date(caseItem.lastCheckIn.checkInDate).toLocaleString()}`);
        console.log(`  - Pain Level: ${caseItem.lastCheckIn.painLevel.current}/10`);
        console.log(`  - Work Status: ${caseItem.lastCheckIn.workStatus.workedToday ? 'Working' : 'Not Working'}`);
        console.log(`  - Sleep Quality: ${caseItem.lastCheckIn.functionalStatus.sleep}/10`);
        console.log(`  - Mood: ${caseItem.lastCheckIn.functionalStatus.mood}/10`);
      } else {
        console.log(`- Last Check-in: No check-ins available`);
      }
    });
    
  } catch (error) {
    console.error('ERROR DETAILS:');
    console.error('Message:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testCasesWithCheckIn();
