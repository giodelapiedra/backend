const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/occupational-rehab', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const User = require('../models/User');
const Notification = require('../models/Notification');

async function createTestIncidentNotification() {
  try {
    console.log('🧪 Creating test incident notification for Case Manager...\n');
    
    // Find users
    const siteSupervisor = await User.findOne({ role: 'site_supervisor' });
    const caseManager = await User.findOne({ role: 'case_manager' });
    const worker = await User.findOne({ role: 'worker' });
    
    if (!siteSupervisor || !caseManager || !worker) {
      console.log('❌ Missing required users');
      return;
    }
    
    console.log('👥 Users found:');
    console.log(`   Site Supervisor: ${siteSupervisor.firstName} ${siteSupervisor.lastName}`);
    console.log(`   Case Manager: ${caseManager.firstName} ${caseManager.lastName}`);
    console.log(`   Worker: ${worker.firstName} ${worker.lastName}`);
    
    // Create test incident notification
    const testNotification = new Notification({
      recipient: caseManager._id,
      sender: siteSupervisor._id,
      type: 'incident_reported',
      title: '🚨 New Incident Reported',
      message: `Site Supervisor ${siteSupervisor.firstName} ${siteSupervisor.lastName} reported a new incident (INC-2024-001). Please review and create a case.`,
      relatedEntity: {
        type: 'incident',
        id: new mongoose.Types.ObjectId() // Generate a valid ObjectId
      },
      priority: 'high',
      actionUrl: '/incidents',
      metadata: {
        incidentNumber: 'INC-2024-001',
        severity: 'near_miss',
        incidentType: 'slip_fall',
        reportedBy: siteSupervisor._id,
        reportedByName: `${siteSupervisor.firstName} ${siteSupervisor.lastName}`,
        workerId: worker._id,
        employerId: siteSupervisor.employer
      }
    });
    
    await testNotification.save();
    
    console.log('\n✅ Test incident notification created successfully!');
    console.log(`   Notification ID: ${testNotification._id}`);
    console.log(`   Recipient: ${caseManager.firstName} ${caseManager.lastName}`);
    console.log(`   Sender: ${siteSupervisor.firstName} ${siteSupervisor.lastName}`);
    console.log(`   Type: ${testNotification.type}`);
    console.log(`   Priority: ${testNotification.priority}`);
    console.log(`   Title: ${testNotification.title}`);
    
    console.log('\n🎯 TESTING INSTRUCTIONS:');
    console.log('=' .repeat(50));
    console.log('1. Login as Case Manager:');
    console.log(`   Email: ${caseManager.email}`);
    console.log('   Password: manager123');
    console.log('');
    console.log('2. Go to: http://localhost:3000/case-manager');
    console.log('');
    console.log('3. Look for the notification in the "Check-in Alerts" section');
    console.log('   - Should show red warning icon');
    console.log('   - Should have red background');
    console.log('   - Should display incident details');
    
  } catch (error) {
    console.error('❌ Error creating test notification:', error);
  } finally {
    mongoose.connection.close();
  }
}

createTestIncidentNotification();
