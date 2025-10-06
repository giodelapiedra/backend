const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/occupational-rehab', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Appointment = require('../models/Appointment');
const User = require('../models/User');
const Case = require('../models/Case');

async function createTestAppointmentForToday() {
  try {
    console.log('🧪 Creating test appointment for today...');
    
    // Find a clinician and worker
    const clinician = await User.findOne({ role: 'clinician' });
    const worker = await User.findOne({ role: 'worker' });
    const caseDoc = await Case.findOne({ worker: worker._id });
    
    if (!clinician || !worker || !caseDoc) {
      console.log('❌ Missing required users or case. Please ensure you have:');
      console.log('   - At least one clinician');
      console.log('   - At least one worker');
      console.log('   - At least one case assigned to the worker');
      return;
    }
    
    // Create appointment for today at 2:00 PM
    const today = new Date();
    today.setHours(14, 0, 0, 0); // 2:00 PM today
    
    const appointmentData = {
      clinician: clinician._id,
      worker: worker._id,
      case: caseDoc._id,
      appointmentType: 'assessment',
      scheduledDate: today,
      duration: 60,
      location: 'telehealth',
      purpose: 'Test appointment for notification system',
      status: 'scheduled'
    };
    
    const appointment = new Appointment(appointmentData);
    await appointment.save();
    
    console.log('✅ Test appointment created successfully!');
    console.log(`📅 Appointment ID: ${appointment._id}`);
    console.log(`👨‍⚕️ Clinician: ${clinician.firstName} ${clinician.lastName}`);
    console.log(`👷 Worker: ${worker.firstName} ${worker.lastName}`);
    console.log(`📅 Scheduled for: ${today.toLocaleString()}`);
    console.log(`📍 Location: ${appointmentData.location}`);
    
    console.log('\n🧪 Now you can test the notification system by running:');
    console.log('   node scripts/testNotificationSystem.js');
    
  } catch (error) {
    console.error('❌ Error creating test appointment:', error);
  } finally {
    mongoose.connection.close();
  }
}

createTestAppointmentForToday();
