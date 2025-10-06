const axios = require('axios');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { connectDB } = require('../config/database');
const User = require('../models/User');

// Test case ID from the URL
const caseId = '68d35022e3e7033f2ade12dd';

// Create a test token for a clinician
async function createTestToken() {
  try {
    // Connect to the database
    console.log('Connecting to database...');
    await connectDB();
    console.log(`Connected to database: ${mongoose.connection.name}`);
    
    // Find a clinician user
    const clinician = await User.findOne({ role: 'clinician' });
    
    if (!clinician) {
      console.error('No clinician found in database');
      return null;
    }
    
    console.log(`Found clinician: ${clinician.firstName} ${clinician.lastName} (${clinician._id})`);
    
    // Create a token
    const token = jwt.sign(
      { 
        id: clinician._id,
        role: clinician.role,
        email: clinician.email
      },
      'your-secret-key', // Replace with your actual secret key
      { expiresIn: '1h' }
    );
    
    return { token, userId: clinician._id };
  } catch (error) {
    console.error('Error creating test token:', error);
    return null;
  }
}

// Test the case details endpoint
async function testCaseEndpoint(token, userId) {
  try {
    console.log(`Testing case endpoint for case ID: ${caseId}`);
    console.log(`Using user ID: ${userId}`);
    
    const response = await axios({
      method: 'get',
      url: `http://localhost:5000/api/cases/${caseId}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('API Response Status:', response.status);
    
    if (response.data && response.data.case) {
      console.log('Case found successfully!');
      console.log('- Case Number:', response.data.case.caseNumber);
      console.log('- Status:', response.data.case.status);
      console.log('- Priority:', response.data.case.priority);
      
      // Check clinician assignment
      if (response.data.case.clinician) {
        console.log('- Clinician:', typeof response.data.case.clinician);
        if (typeof response.data.case.clinician === 'object') {
          console.log(`  - Name: ${response.data.case.clinician.firstName} ${response.data.case.clinician.lastName}`);
          console.log(`  - Email: ${response.data.case.clinician.email}`);
          console.log(`  - ID: ${response.data.case.clinician._id}`);
        } else {
          console.log(`  - ID: ${response.data.case.clinician}`);
        }
      } else {
        console.log('- No clinician assigned');
      }
    } else {
      console.error('Invalid response format:', response.data);
    }
    
  } catch (error) {
    console.error('API request failed:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message
    });
    
    if (error.response) {
      console.error('Error response data:', error.response.data);
    }
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the test
async function run() {
  const result = await createTestToken();
  if (result) {
    await testCaseEndpoint(result.token, result.userId);
  } else {
    console.error('Failed to create test token');
  }
}

run();
