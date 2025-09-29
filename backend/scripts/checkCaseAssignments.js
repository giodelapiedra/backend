const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Case = require('../models/Case');
const CheckIn = require('../models/CheckIn');

async function checkCaseAssignments() {
  try {
    console.log('Connecting to MongoDB...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/occupational-rehab', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Find test.user@example.com worker
    const worker = await User.findOne({ email: 'test.user@example.com' });
    if (!worker) {
      console.log('Worker test.user@example.com not found');
      return;
    }
    console.log(`Found worker: ${worker.firstName} ${worker.lastName} (${worker.email})`);

    // Find projectklouds24@gmail.com clinician
    const clinician = await User.findOne({ email: 'projectklouds24@gmail.com' });
    if (!clinician) {
      console.log('Clinician projectklouds24@gmail.com not found');
      return;
    }
    console.log(`Found clinician: ${clinician.firstName} ${clinician.lastName} (${clinician.email})`);

    // Find cases assigned to this worker
    const cases = await Case.find({ worker: worker._id })
      .populate('worker', 'firstName lastName email')
      .populate('clinician', 'firstName lastName email')
      .populate('caseManager', 'firstName lastName email');
    
    console.log(`\nFound ${cases.length} cases for worker ${worker.email}:`);
    
    cases.forEach((caseItem, index) => {
      console.log(`\nCase ${index + 1}:`);
      console.log(`- Case Number: ${caseItem.caseNumber}`);
      console.log(`- Status: ${caseItem.status}`);
      console.log(`- Worker: ${caseItem.worker?.firstName} ${caseItem.worker?.lastName} (${caseItem.worker?.email})`);
      console.log(`- Clinician: ${caseItem.clinician?.firstName} ${caseItem.clinician?.lastName} (${caseItem.clinician?.email})`);
      console.log(`- Case Manager: ${caseItem.caseManager?.firstName} ${caseItem.caseManager?.lastName} (${caseItem.caseManager?.email})`);
      
      // Check if clinician is properly assigned
      if (caseItem.clinician?._id.toString() === clinician._id.toString()) {
        console.log(`✅ Clinician assignment is CORRECT`);
      } else {
        console.log(`❌ Clinician assignment is INCORRECT`);
      }
    });

    // Find check-ins for this worker
    const checkIns = await CheckIn.find({ worker: worker._id })
      .populate('worker', 'firstName lastName email')
      .populate('case', 'caseNumber clinician')
      .sort({ checkInDate: -1 });
    
    console.log(`\nFound ${checkIns.length} check-ins for worker ${worker.email}:`);
    
    checkIns.forEach((checkIn, index) => {
      console.log(`\nCheck-in ${index + 1}:`);
      console.log(`- Date: ${new Date(checkIn.checkInDate).toLocaleString()}`);
      console.log(`- Pain Level: ${checkIn.painLevel.current}/10`);
      console.log(`- Work Status: ${checkIn.workStatus.workedToday ? 'Working' : 'Not Working'}`);
      console.log(`- Case: ${checkIn.case?.caseNumber}`);
      console.log(`- Case Clinician: ${checkIn.case?.clinician}`);
      
      // Check if this check-in should be visible to the clinician
      if (checkIn.case?.clinician?.toString() === clinician._id.toString()) {
        console.log(`✅ This check-in SHOULD be visible to ${clinician.email}`);
      } else {
        console.log(`❌ This check-in should NOT be visible to ${clinician.email}`);
      }
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

checkCaseAssignments();
