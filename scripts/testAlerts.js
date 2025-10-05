const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Case = require('../models/Case');
const CheckIn = require('../models/CheckIn');
const Notification = require('../models/Notification');
const Incident = require('../models/Incident');

async function testAlertSystem() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/occupational-rehab', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Find a clinician
    const clinician = await User.findOne({ role: 'clinician', isActive: true });
    if (!clinician) {
      console.log('No clinician found. Creating one...');
      const newClinician = new User({
        firstName: 'Dr. Test',
        lastName: 'Clinician',
        email: 'test.clinician@example.com',
        password: 'password123',
        role: 'clinician',
        specialty: 'Physical Therapy',
        licenseNumber: 'PT123456'
      });
      await newClinician.save();
      console.log('Created test clinician:', newClinician._id);
    }

    // Find a worker
    const worker = await User.findOne({ role: 'worker', isActive: true });
    if (!worker) {
      console.log('No worker found. Creating one...');
      const newWorker = new User({
        firstName: 'Test',
        lastName: 'Worker',
        email: 'test.worker@example.com',
        password: 'password123',
        role: 'worker'
      });
      await newWorker.save();
      console.log('Created test worker:', newWorker._id);
    }

    // Find a case manager
    const caseManager = await User.findOne({ role: 'case_manager', isActive: true });
    if (!caseManager) {
      console.log('No case manager found. Creating one...');
      const newCaseManager = new User({
        firstName: 'Test',
        lastName: 'CaseManager',
        email: 'test.casemanager@example.com',
        password: 'password123',
        role: 'case_manager'
      });
      await newCaseManager.save();
      console.log('Created test case manager:', newCaseManager._id);
    }

    // Find an employer
    const employer = await User.findOne({ role: 'employer', isActive: true });
    if (!employer) {
      console.log('No employer found. Creating one...');
      const newEmployer = new User({
        firstName: 'Test',
        lastName: 'Employer',
        email: 'test.employer@example.com',
        password: 'password123',
        role: 'employer'
      });
      await newEmployer.save();
      console.log('Created test employer:', newEmployer._id);
    }

    // Find or create a case with clinician assigned
    let testCase = await Case.findOne({ clinician: { $exists: true } }).populate('clinician worker caseManager');
    
    if (!testCase) {
      console.log('No case with clinician found. Creating one...');
      
      // Create a mock incident first
      const incident = new Incident({
        incidentNumber: 'INC-TEST-' + Date.now(),
        incidentDate: new Date(),
        incidentType: 'injury',
        severity: 'medical_treatment',
        description: 'Test incident for alert testing',
        reportedBy: worker._id,
        worker: worker._id,
        employer: employer._id
      });
      await incident.save();
      console.log('Created test incident:', incident._id);

      // Create case with clinician assigned
      testCase = new Case({
        worker: worker._id,
        employer: employer._id,
        caseManager: caseManager._id,
        clinician: clinician._id,
        incident: incident._id,
        priority: 'high',
        injuryDetails: {
          bodyPart: 'Back',
          injuryType: 'Strain',
          severity: 'moderate',
          description: 'Lower back strain from lifting'
        },
        status: 'triaged'
      });
      await testCase.save();
      console.log('Created test case with clinician:', testCase._id);
    }

    console.log('Test case found:', {
      caseId: testCase._id,
      caseNumber: testCase.caseNumber,
      clinician: testCase.clinician ? `${testCase.clinician.firstName} ${testCase.clinician.lastName}` : 'None',
      worker: testCase.worker ? `${testCase.worker.firstName} ${testCase.worker.lastName}` : 'None'
    });

    // Test 1: Create a check-in with high pain level
    console.log('\n=== Test 1: High Pain Alert ===');
    const highPainCheckIn = new CheckIn({
      case: testCase._id,
      worker: testCase.worker._id,
      painLevel: {
        current: 8,
        worst: 9,
        average: 7
      },
      painLocation: ['Back', 'Lower back'],
      painQuality: 'Sharp, burning',
      functionalStatus: {
        sleep: 3,
        mood: 4,
        energy: 3,
        mobility: 2,
        dailyActivities: 3
      },
      workStatus: {
        workedToday: false,
        painAtWork: 8
      }
    });
    await highPainCheckIn.save();
    console.log('Created high pain check-in:', highPainCheckIn._id);

    // Test 2: Create a check-in with work status issues
    console.log('\n=== Test 2: Return to Work Alert ===');
    const rtwCheckIn = new CheckIn({
      case: testCase._id,
      worker: testCase.worker._id,
      painLevel: {
        current: 5,
        worst: 6,
        average: 4
      },
      workStatus: {
        workedToday: false,
        hoursWorked: 0,
        tasksPerformed: [],
        difficulties: ['Cannot lift heavy objects', 'Pain when bending'],
        painAtWork: 6
      },
      functionalStatus: {
        sleep: 6,
        mood: 5,
        energy: 5,
        mobility: 4,
        dailyActivities: 4
      }
    });
    await rtwCheckIn.save();
    console.log('Created RTW check-in:', rtwCheckIn._id);

    // Test 3: Create a check-in with poor sleep
    console.log('\n=== Test 3: Fatigue Alert ===');
    const fatigueCheckIn = new CheckIn({
      case: testCase._id,
      worker: testCase.worker._id,
      painLevel: {
        current: 4,
        worst: 5,
        average: 3
      },
      functionalStatus: {
        sleep: 1, // Poor sleep
        mood: 3,
        energy: 2,
        mobility: 5,
        dailyActivities: 4
      },
      workStatus: {
        workedToday: true,
        hoursWorked: 4,
        painAtWork: 4
      }
    });
    await fatigueCheckIn.save();
    console.log('Created fatigue check-in:', fatigueCheckIn._id);

    // Check notifications created
    console.log('\n=== Checking Notifications ===');
    const notifications = await Notification.find({ recipient: testCase.clinician._id })
      .populate('sender', 'firstName lastName')
      .sort({ createdAt: -1 });
    
    console.log(`Found ${notifications.length} notifications for clinician:`);
    notifications.forEach((notif, index) => {
      console.log(`${index + 1}. ${notif.type} - ${notif.title}`);
      console.log(`   Message: ${notif.message}`);
      console.log(`   Priority: ${notif.priority}`);
      console.log(`   Created: ${notif.createdAt}`);
      console.log(`   Read: ${notif.isRead}`);
      console.log('');
    });

    // Test the alert creation function directly
    console.log('\n=== Testing Alert Creation Function ===');
    const { createCheckInAlerts } = require('../routes/checkIns');
    
    // Create a test check-in with all alert triggers
    const testCheckIn = new CheckIn({
      case: testCase._id,
      worker: testCase.worker._id,
      painLevel: {
        current: 9, // High pain
        worst: 10,
        average: 8
      },
      workStatus: {
        workedToday: false, // Cannot work
        painAtWork: 9
      },
      functionalStatus: {
        sleep: 1, // Poor sleep
        mood: 2,
        energy: 1,
        mobility: 2,
        dailyActivities: 2
      }
    });
    await testCheckIn.save();
    
    // Populate the check-in
    await testCheckIn.populate([
      { path: 'case', select: 'caseNumber status clinician caseManager worker' },
      { path: 'worker', select: 'firstName lastName email' }
    ]);

    // Test the alert creation function
    await createCheckInAlerts(testCheckIn, testCase);
    console.log('Alert creation function completed');

    // Check final notification count
    const finalNotifications = await Notification.find({ recipient: testCase.clinician._id })
      .populate('sender', 'firstName lastName')
      .sort({ createdAt: -1 });
    
    console.log(`\nFinal notification count: ${finalNotifications.length}`);
    
    // Show unread count
    const unreadCount = await Notification.countDocuments({ 
      recipient: testCase.clinician._id, 
      isRead: false 
    });
    console.log(`Unread notifications: ${unreadCount}`);

  } catch (error) {
    console.error('Error in test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the test
testAlertSystem();
