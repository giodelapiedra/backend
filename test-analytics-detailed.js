const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rehab_management', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function testAnalyticsDetailed() {
  try {
    console.log('Testing analytics aggregation queries...');
    
    const User = require('./models/User');
    const Case = require('./models/Case');
    const Appointment = require('./models/Appointment');
    const ActivityLog = require('./models/ActivityLog');
    const Incident = require('./models/Incident');
    const RehabilitationPlan = require('./models/RehabilitationPlan');
    const Notification = require('./models/Notification');

    console.log('Testing User aggregation...');
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    console.log('Users by role:', usersByRole);

    console.log('Testing Case aggregation...');
    const casesByStatus = await Case.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    console.log('Cases by status:', casesByStatus);

    console.log('Testing Appointment aggregation...');
    const appointmentsByStatus = await Appointment.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    console.log('Appointments by status:', appointmentsByStatus);

    console.log('Testing ActivityLog aggregation...');
    const activityLogsByType = await ActivityLog.aggregate([
      { $group: { _id: '$activityType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    console.log('Activity logs by type:', activityLogsByType);

    console.log('Testing Incident aggregation...');
    const incidentsByType = await Incident.aggregate([
      { $group: { _id: '$incidentType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    console.log('Incidents by type:', incidentsByType);

    console.log('Testing RehabilitationPlan aggregation...');
    const rehabPlansByStatus = await RehabilitationPlan.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    console.log('Rehab plans by status:', rehabPlansByStatus);

    console.log('Testing Notification aggregation...');
    const notificationsByType = await Notification.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    console.log('Notifications by type:', notificationsByType);

    console.log('All aggregation queries working correctly!');
    
  } catch (error) {
    console.error('Error testing analytics aggregation:', error);
    console.error('Error stack:', error.stack);
  } finally {
    mongoose.connection.close();
  }
}

testAnalyticsDetailed();








