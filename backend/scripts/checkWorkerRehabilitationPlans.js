const axios = require('axios');

async function checkWorkerRehabilitationPlans() {
  try {
    console.log('Checking worker rehabilitation plans...');
    
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
      plansResponse.data.plans.forEach((plan, index) => {
        console.log(`\nPlan ${index + 1}:`);
        console.log(`- Plan ID: ${plan._id}`);
        console.log(`- Plan Name: ${plan.planName}`);
        console.log(`- Case Number: ${plan.case.caseNumber}`);
        console.log(`- Case Status: ${plan.case.status}`);
        console.log(`- Plan Status: ${plan.status}`);
        console.log(`- Exercises: ${plan.exercises.length}`);
      });
    } else {
      console.log('No rehabilitation plans found for worker');
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

checkWorkerRehabilitationPlans();
