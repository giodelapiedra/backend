const axios = require('axios');

async function testCompleteExerciseAPI() {
  try {
    console.log('Testing Complete Exercise API...');
    
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
        console.log(`- Exercises: ${activePlan.exercises.length}`);
        
        // Get today's exercises
        console.log('\n📅 Getting today\'s exercises...');
        const todayResponse = await axios.get(`http://localhost:5000/api/rehabilitation-plans/${activePlan._id}/today`, {
          headers: { 'Authorization': `Bearer ${workerToken}` }
        });
        
        console.log('✅ Today\'s exercises fetched successfully');
        console.log('Today response structure:', JSON.stringify(todayResponse.data, null, 2));
        
        if (todayResponse.data.exercises && todayResponse.data.exercises.length > 0) {
          const firstExercise = todayResponse.data.exercises[0];
          console.log(`\n🎯 Testing complete exercise for: ${firstExercise.name}`);
          console.log(`- Exercise ID: ${firstExercise._id}`);
          console.log(`- Duration: ${firstExercise.duration}`);
          
          // Test completing the exercise
          console.log('\n🔄 Testing complete exercise API...');
          const completeResponse = await axios.post(`http://localhost:5000/api/rehabilitation-plans/${activePlan._id}/exercises/${firstExercise._id}/complete`, {
            completedDuration: firstExercise.duration
          }, {
            headers: { 'Authorization': `Bearer ${workerToken}` }
          });
          
          console.log('✅ Exercise completed successfully!');
          console.log('Complete response:', JSON.stringify(completeResponse.data, null, 2));
          
        } else {
          console.log('❌ No exercises found for today');
        }
        
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

testCompleteExerciseAPI();
