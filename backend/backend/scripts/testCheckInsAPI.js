const axios = require('axios');

async function testCheckInsAPI() {
  try {
    console.log('Testing Check-ins API...');
    
    // Login as clinician
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'projectklouds24@gmail.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Clinician login successful');
    
    // Get check-ins
    const checkInsResponse = await axios.get('http://localhost:5000/api/check-ins', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Check-ins fetched successfully');
    console.log('Total check-ins:', checkInsResponse.data.checkIns?.length || 0);
    
    if (checkInsResponse.data.checkIns && checkInsResponse.data.checkIns.length > 0) {
      console.log('\n📋 Check-ins found:');
      checkInsResponse.data.checkIns.forEach((checkIn, index) => {
        console.log(`\n${index + 1}. Worker: ${checkIn.worker?.firstName} ${checkIn.worker?.lastName}`);
        console.log(`   Case: ${checkIn.case?.caseNumber}`);
        console.log(`   Date: ${new Date(checkIn.checkInDate).toLocaleString()}`);
        console.log(`   Pain Level: ${checkIn.painLevel?.current}/10`);
        console.log(`   Work Status: ${checkIn.workStatus?.workedToday ? 'Working' : 'Not Working'}`);
        console.log(`   Sleep: ${checkIn.functionalStatus?.sleep}/10`);
        console.log(`   Mood: ${checkIn.functionalStatus?.mood}/10`);
      });
    } else {
      console.log('No check-ins found for this clinician');
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

testCheckInsAPI();
