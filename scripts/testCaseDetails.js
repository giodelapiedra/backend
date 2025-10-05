const mongoose = require('mongoose');
const { connectDB } = require('../config/database');
const Case = require('../models/Case');
const User = require('../models/User');
// Make sure all models are loaded
require('../models/Incident');
require('../models/Assessment');
require('../models/Appointment');
require('../models/CheckIn');
require('../models/RehabilitationPlan');
const ObjectId = mongoose.Types.ObjectId;

// Test case ID from the URL
const caseId = '68d35022e3e7033f2ade12dd';

async function testCaseDetails() {
  try {
    // Connect to the database
    console.log('Connecting to database...');
    await connectDB();
    console.log(`Connected to database: ${mongoose.connection.name}`);
    
    // Check if the case exists
    console.log(`Looking for case with ID: ${caseId}`);
    
    // First try with Mongoose model
    const caseDoc = await Case.findById(caseId)
      .populate('worker', 'firstName lastName email phone address')
      .populate('employer', 'firstName lastName email phone')
      .populate('caseManager', 'firstName lastName email phone')
      .populate('clinician', 'firstName lastName email phone')
      .populate('incident', 'incidentNumber incidentDate description incidentType severity photos');
    
    if (!caseDoc) {
      console.log('Case not found using Mongoose model');
      
      // Try direct MongoDB query
      console.log('Trying direct MongoDB query...');
      const rawCase = await mongoose.connection.db.collection('cases').findOne({ 
        _id: new ObjectId(caseId) 
      });
      
      if (rawCase) {
        console.log('Case found using direct MongoDB query:');
        console.log(JSON.stringify(rawCase, null, 2));
      } else {
        console.log('Case not found in database at all');
      }
      
      return;
    }
    
    console.log('Case found:');
    console.log('- Case Number:', caseDoc.caseNumber);
    console.log('- Status:', caseDoc.status);
    console.log('- Priority:', caseDoc.priority);
    
    // Check clinician assignment
    if (caseDoc.clinician) {
      console.log('- Clinician:', typeof caseDoc.clinician);
      if (typeof caseDoc.clinician === 'object') {
        console.log(`  - Name: ${caseDoc.clinician.firstName} ${caseDoc.clinician.lastName}`);
        console.log(`  - Email: ${caseDoc.clinician.email}`);
        console.log(`  - ID: ${caseDoc.clinician._id}`);
      } else {
        console.log(`  - ID: ${caseDoc.clinician}`);
        
        // Try to look up the clinician
        const clinician = await User.findById(caseDoc.clinician);
        if (clinician) {
          console.log(`  - Name: ${clinician.firstName} ${clinician.lastName}`);
          console.log(`  - Email: ${clinician.email}`);
        }
      }
    } else {
      console.log('- No clinician assigned');
    }
    
    // Test access control logic for a clinician
    console.log('\nTesting access control for clinicians:');
    
    // Get all clinicians
    const clinicians = await User.find({ role: 'clinician' }).limit(3);
    
    for (const clinician of clinicians) {
      // Test if this clinician would have access
      const clinicianId = clinician._id.toString();
      const caseClinicianId = caseDoc.clinician?.toString() || caseDoc.clinician?._id?.toString();
      
      const hasAccess = clinicianId === caseClinicianId;
      
      console.log(`Clinician ${clinician.firstName} ${clinician.lastName} (${clinicianId}):`);
      console.log(`- Has access: ${hasAccess}`);
      console.log(`- Case clinician ID: ${caseClinicianId}`);
      console.log(`- ID comparison: ${clinicianId} === ${caseClinicianId}`);
    }
    
    // Format the case data as the API would return it
    const formattedCase = {
      case: caseDoc
    };
    
    console.log('\nAPI response format:');
    console.log(JSON.stringify(formattedCase, null, 2).substring(0, 500) + '...');
    
  } catch (error) {
    console.error('Error testing case details:', error);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

testCaseDetails();