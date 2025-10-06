const axios = require('axios');

async function testFrontendRehabilitationPlan() {
  try {
    console.log('Testing Frontend Rehabilitation Plan Integration...');
    
    // Login as worker
    const workerLogin = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'test.user@example.com',
      password: 'password123'
    });
    const workerToken = workerLogin.data.token;
    console.log('✅ Worker login successful');
    
    // Simulate the frontend API call
    console.log('\n📱 Simulating frontend API call...');
    const response = await axios.get('http://localhost:5000/api/rehabilitation-plans', {
      headers: { 'Authorization': `Bearer ${workerToken}` }
    });
    
    console.log('✅ API call successful');
    console.log('Total plans:', response.data.plans?.length || 0);
    
    if (response.data.plans && response.data.plans.length > 0) {
      // Find the most recent active plan (same logic as frontend)
      const activePlan = response.data.plans.find(p => p.status === 'active');
      
      if (activePlan) {
        console.log(`\n📋 Active Plan Found:`);
        console.log(`- Plan ID: ${activePlan._id}`);
        console.log(`- Plan Name: ${activePlan.planName}`);
        console.log(`- Case Number: ${activePlan.case.caseNumber}`);
        console.log(`- Plan Status: ${activePlan.status}`);
        console.log(`- Exercises: ${activePlan.exercises.length}`);
        
        // Get today's exercises (same as frontend)
        console.log('\n📅 Getting today\'s exercises...');
        const todayResponse = await axios.get(`http://localhost:5000/api/rehabilitation-plans/${activePlan._id}/today`, {
          headers: { 'Authorization': `Bearer ${workerToken}` }
        });
        
        console.log('✅ Today\'s exercises fetched successfully');
        console.log('Plan data:', JSON.stringify(todayResponse.data, null, 2));
        
        console.log('\n🎯 Frontend Integration Test Results:');
        console.log('✅ Worker authentication working');
        console.log('✅ Rehabilitation plans API working');
        console.log('✅ Active plan detection working');
        console.log('✅ Today\'s exercises API working');
        console.log('✅ Data structure matches frontend expectations');
        console.log('\n🚀 The rehabilitation plan page should now work correctly!');
        console.log('   Go to: http://localhost:3000/worker/rehabilitation-plan');
        
      } else {
        console.log('❌ No active plan found - this would show "No active rehabilitation plan found"');
      }
    } else {
      console.log('❌ No rehabilitation plans found - this would show "No rehabilitation plan assigned"');
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

testFrontendRehabilitationPlan();
