const axios = require('axios');

async function testWorkerRehabilitationPlanPage() {
  try {
    console.log('Testing Worker Rehabilitation Plan Page...');
    
    // Login as worker
    const workerLogin = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'test.user@example.com',
      password: 'password123'
    });
    const workerToken = workerLogin.data.token;
    console.log('✅ Worker login successful');
    
    // Get rehabilitation plans
    const plansResponse = await axios.get('http://localhost:5000/api/rehabilitation-plans', {
      headers: { 'Authorization': `Bearer ${workerToken}` }
    });
    
    console.log('✅ Rehabilitation plans fetched successfully');
    console.log('Total plans:', plansResponse.data.plans?.length || 0);
    
    if (plansResponse.data.plans && plansResponse.data.plans.length > 0) {
      // Find the most recent active plan
      const activePlan = plansResponse.data.plans.find(p => p.status === 'active');
      
      if (activePlan) {
        console.log(`\n📋 Active Plan Found:`);
        console.log(`- Plan ID: ${activePlan._id}`);
        console.log(`- Plan Name: ${activePlan.planName}`);
        console.log(`- Case Number: ${activePlan.case.caseNumber}`);
        console.log(`- Plan Status: ${activePlan.status}`);
        console.log(`- Exercises: ${activePlan.exercises.length}`);
        
        // Get today's exercises
        console.log('\n📅 Fetching today\'s exercises...');
        const todayResponse = await axios.get(`http://localhost:5000/api/rehabilitation-plans/${activePlan._id}/today`, {
          headers: { 'Authorization': `Bearer ${workerToken}` }
        });
        
        console.log('✅ Today\'s exercises fetched successfully');
        console.log('Exercises for today:', todayResponse.data.exercises.length);
        
        todayResponse.data.exercises.forEach((exercise, index) => {
          console.log(`  ${index + 1}. ${exercise.name} (${exercise.duration} min) - ${exercise.completion.status}`);
        });
        
        console.log('\n🎯 Test Results:');
        console.log('✅ Worker can access rehabilitation plans');
        console.log('✅ Active plan found successfully');
        console.log('✅ Today\'s exercises loaded correctly');
        console.log('✅ Frontend should now display the plan correctly');
        
      } else {
        console.log('❌ No active plan found');
      }
    } else {
      console.log('❌ No rehabilitation plans found');
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

testWorkerRehabilitationPlanPage();
