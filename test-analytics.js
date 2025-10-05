const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rehab_management', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function testAnalytics() {
  try {
    console.log('Testing analytics data fetching...');
    
    // Test each model individually
    const User = require('./models/User');
    const Case = require('./models/Case');
    const Appointment = require('./models/Appointment');
    const CheckIn = require('./models/CheckIn');
    const ActivityLog = require('./models/ActivityLog');
    const Incident = require('./models/Incident');
    const RehabilitationPlan = require('./models/RehabilitationPlan');
    const Notification = require('./models/Notification');

    console.log('Testing User model...');
    const totalUsers = await User.countDocuments();
    console.log('Total users:', totalUsers);

    console.log('Testing Case model...');
    const totalCases = await Case.countDocuments();
    console.log('Total cases:', totalCases);

    console.log('Testing Appointment model...');
    const totalAppointments = await Appointment.countDocuments();
    console.log('Total appointments:', totalAppointments);

    console.log('Testing CheckIn model...');
    const totalCheckIns = await CheckIn.countDocuments();
    console.log('Total check-ins:', totalCheckIns);

    console.log('Testing ActivityLog model...');
    const totalActivityLogs = await ActivityLog.countDocuments();
    console.log('Total activity logs:', totalActivityLogs);

    console.log('Testing Incident model...');
    const totalIncidents = await Incident.countDocuments();
    console.log('Total incidents:', totalIncidents);

    console.log('Testing RehabilitationPlan model...');
    const totalRehabPlans = await RehabilitationPlan.countDocuments();
    console.log('Total rehab plans:', totalRehabPlans);

    console.log('Testing Notification model...');
    const totalNotifications = await Notification.countDocuments();
    console.log('Total notifications:', totalNotifications);

    console.log('All models working correctly!');
    
  } catch (error) {
    console.error('Error testing analytics:', error);
  } finally {
    mongoose.connection.close();
  }
}

testAnalytics();








