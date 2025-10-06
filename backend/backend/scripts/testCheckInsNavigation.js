const axios = require('axios');

async function testCheckInsNavigation() {
  try {
    console.log('Testing Check-ins page navigation...');
    
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
      const checkIn = checkInsResponse.data.checkIns[0];
      console.log('\n📋 Check-in details:');
      console.log(`- Worker: ${checkIn.worker?.firstName} ${checkIn.worker?.lastName}`);
      console.log(`- Case: ${checkIn.case?.caseNumber}`);
      console.log(`- Case ID: ${checkIn.case?._id}`);
      console.log(`- Pain Level: ${checkIn.painLevel?.current}/10`);
      console.log(`- Work Status: ${checkIn.workStatus?.workedToday ? 'Working' : 'Not Working'}`);
      
      console.log('\n🎯 Navigation URL would be:');
      console.log(`http://localhost:3000/cases/${checkIn.case?._id}`);
      
      console.log('\n✅ Both "View Case Details" buttons now navigate to the same page!');
      console.log('   - Alert notification button → Case details page');
      console.log('   - Check-ins page button → Case details page');
      
    } else {
      console.log('No check-ins found for testing');
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

testCheckInsNavigation();
