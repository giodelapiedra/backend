const mongoose = require('mongoose');
const { connectDB } = require('../config/database');

// Import all necessary models
require('../models/Incident');
require('../models/Assessment');
require('../models/Appointment');
require('../models/CheckIn');
require('../models/RehabilitationPlan');
const Case = require('../models/Case');
const User = require('../models/User');

// Test case ID from the URL
const caseId = '68d35022e3e7033f2ade12dd';
// Try with different clinician IDs to test access control
const userIds = [
  '68cfd4ba5553a72fec0cba4d', // Project Klouds (should have access)
  '68cf98ec1dca52bfebe2e99e'  // Dr. Michael Johnson (might not have access)
];

async function simulateRequest() {
  try {
    // Connect to the database
    console.log('Connecting to database...');
    await connectDB();
    console.log(`Connected to database: ${mongoose.connection.name}`);
    
    // Find the case first
    console.log(`Looking for case with ID: ${caseId}`);
    const caseDoc = await Case.findById(caseId)
      .populate('worker', 'firstName lastName email phone address')
      .populate('employer', 'firstName lastName email phone')
      .populate('caseManager', 'firstName lastName email phone')
      .populate('clinician', 'firstName lastName email phone')
      .populate('incident', 'incidentNumber incidentDate description incidentType severity photos');
    
    if (!caseDoc) {
      console.log('Case not found');
      return;
    }
    
    console.log('Case found:');
    console.log('- Case Number:', caseDoc.caseNumber);
    console.log('- Status:', caseDoc.status);
    console.log('- Priority:', caseDoc.priority);
    
    // Test with each user ID
    for (const userId of userIds) {
      console.log(`\n--- Testing with user ID: ${userId} ---`);
      
      // Get the user
      const user = await User.findById(userId);
      if (!user) {
        console.error(`User with ID ${userId} not found`);
        continue;
      }
      
      console.log(`Found user: ${user.firstName} ${user.lastName} (${user.role})`);
      
      // Simulate the access control logic
      let hasAccess = false;
      
      switch (user.role) {
        case 'admin':
        case 'gp_insurer':
          hasAccess = true;
          break;
        case 'clinician':
          // Handle both populated and unpopulated clinician field
          if (caseDoc.clinician) {
            // If clinician is a populated object
            if (typeof caseDoc.clinician === 'object' && caseDoc.clinician._id) {
              hasAccess = caseDoc.clinician._id.toString() === user._id.toString();
            } 
            // If clinician is just an ID
            else {
              hasAccess = caseDoc.clinician.toString() === user._id.toString();
            }
            console.log('Clinician access check:', {
              userId: user._id.toString(),
              clinicianId: typeof caseDoc.clinician === 'object' ? 
                caseDoc.clinician._id.toString() : caseDoc.clinician.toString(),
              hasAccess
            });
          }
          break;
        // Add other roles as needed
      }
      
      console.log('Access check result:', {
        hasAccess,
        userRole: user.role,
        userId: user._id.toString()
      });
      
      if (hasAccess) {
        console.log('User has access to this case');
      } else {
        console.log('Access denied');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

simulateRequest();