const axios = require('axios');

async function testHighPainAlert() {
  try {
    console.log('Testing high pain alert creation...');
    
    // First, login as a worker
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'worker@example.com',
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
      console.log('No cases found for worker.');
      return;
    }
    
    const caseId = casesResponse.data.cases[0]._id;
    console.log('Using case:', casesResponse.data.cases[0].caseNumber);
    
    // Create check-in with HIGH PAIN LEVEL (8/10) to trigger alert
    const checkInData = {
      case: caseId,
      painLevel: { 
        current: 8,  // HIGH PAIN LEVEL
        worst: 8,
        average: 8
      },
      functionalStatus: {
        sleep: 2,  // Poor sleep
        mood: 2,   // Poor mood
        energy: 2,
        mobility: 3,
        dailyActivities: 3
      },
      workStatus: {
        workedToday: false,  // Cannot work
        hoursWorked: 0,
        difficulties: ['Cannot perform normal duties'],
        painAtWork: 8
      },
      symptoms: {
        swelling: true,
        stiffness: true,
        weakness: true,
        numbness: false,
        tingling: false,
        other: 'Severe pain and discomfort'
      },
      notes: `HIGH PAIN ALERT TEST: Pain level 8/10, cannot work, poor sleep and mood`
    };
    
    console.log('Submitting HIGH PAIN check-in with data:', JSON.stringify(checkInData, null, 2));
    
    const checkInResponse = await axios.post('http://localhost:5000/api/check-ins', checkInData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('SUCCESS! High pain check-in created:', checkInResponse.data);
    
    // Wait a moment for alerts to be processed
    console.log('Waiting for alerts to be processed...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Login as clinician to check notifications
    const clinicianLoginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'projectklouds24@gmail.com',
      password: 'password123'
    });
    
    const clinicianToken = clinicianLoginResponse.data.token;
    console.log('Clinician login successful');
    
    // Check notifications
    const notificationsResponse = await axios.get('http://localhost:5000/api/notifications', {
      headers: {
        'Authorization': `Bearer ${clinicianToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Clinician notifications:', notificationsResponse.data.notifications.length);
    notificationsResponse.data.notifications.forEach(notification => {
      console.log(`- ${notification.type}: ${notification.title}`);
      console.log(`  Message: ${notification.message}`);
      console.log(`  Priority: ${notification.priority}`);
      console.log(`  Created: ${notification.createdAt}`);
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

testHighPainAlert();
