const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rehab_management', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function testFullAnalytics() {
  try {
    console.log('Testing full analytics endpoint logic...');
    
    const User = require('./models/User');
    const Case = require('./models/Case');
    const Appointment = require('./models/Appointment');
    const CheckIn = require('./models/CheckIn');
    const ActivityLog = require('./models/ActivityLog');
    const Incident = require('./models/Incident');
    const RehabilitationPlan = require('./models/RehabilitationPlan');
    const Notification = require('./models/Notification');

    // Test each section step by step
    console.log('1. Testing overview metrics...');
    const totalUsers = await User.countDocuments();
    const totalCases = await Case.countDocuments();
    const totalAppointments = await Appointment.countDocuments();
    const totalActivityLogs = await ActivityLog.countDocuments();
    const totalIncidents = await Incident.countDocuments();
    const totalRehabPlans = await RehabilitationPlan.countDocuments();
    const totalNotifications = await Notification.countDocuments();
    console.log('Overview metrics OK');

    console.log('2. Testing user analytics...');
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    console.log('User analytics OK');

    console.log('3. Testing case analytics...');
    const casesByStatus = await Case.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    console.log('Case analytics OK');

    console.log('4. Testing appointment analytics...');
    const appointmentsByStatus = await Appointment.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    console.log('Appointment analytics OK');

    console.log('5. Testing activity log analytics...');
    const activityLogsByType = await ActivityLog.aggregate([
      { $group: { _id: '$activityType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    console.log('Activity log analytics OK');

    console.log('6. Testing incident analytics...');
    const incidentsByType = await Incident.aggregate([
      { $group: { _id: '$incidentType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    console.log('Incident analytics OK');

    console.log('7. Testing rehabilitation plan analytics...');
    const rehabPlansByStatus = await RehabilitationPlan.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    console.log('Rehabilitation plan analytics OK');

    console.log('8. Testing notification analytics...');
    const notificationsByType = await Notification.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    console.log('Notification analytics OK');

    console.log('9. Testing complex aggregations...');
    const topCaseManagers = await Case.aggregate([
      { $match: { caseManager: { $exists: true } } },
      { $group: { 
        _id: '$caseManager', 
        casesHandled: { $sum: 1 },
        closedCases: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } }
      }},
      { $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }},
      { $unwind: '$user' },
      { $addFields: {
        successRate: { 
          $round: [{ 
            $multiply: [{ 
              $cond: [
                { $gt: ['$casesHandled', 0] },
                { $divide: ['$closedCases', '$casesHandled'] },
                0
              ]
            }, 100] 
          }, 1] 
        }
      }},
      { $project: {
        name: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
        casesHandled: 1,
        successRate: 1
      }},
      { $sort: { casesHandled: -1 } },
      { $limit: 5 }
    ]);
    console.log('Top case managers OK');

    const topActiveWorkers = await ActivityLog.aggregate([
      { $group: { 
        _id: '$worker', 
        activityCount: { $sum: 1 },
        completedExercises: { $sum: { $cond: [{ $eq: ['$activityType', 'exercise_completed'] }, 1, 0] } },
        skippedExercises: { $sum: { $cond: [{ $eq: ['$activityType', 'exercise_skipped'] }, 1, 0] } },
        checkIns: { $sum: { $cond: [{ $eq: ['$activityType', 'daily_check_in'] }, 1, 0] } }
      }},
      { $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }},
      { $unwind: '$user' },
      { $addFields: {
        completionRate: { 
          $round: [{ 
            $multiply: [{ 
              $cond: [
                { $gt: [{ $add: ['$completedExercises', '$skippedExercises'] }, 0] },
                { $divide: ['$completedExercises', { $add: ['$completedExercises', '$skippedExercises'] }] },
                0
              ]
            }, 100] 
          }, 1] 
        }
      }},
      { $project: {
        name: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
        email: '$user.email',
        activityCount: 1,
        completedExercises: 1,
        skippedExercises: 1,
        checkIns: 1,
        completionRate: 1
      }},
      { $sort: { activityCount: -1 } },
      { $limit: 10 }
    ]);
    console.log('Top active workers OK');

    console.log('All analytics sections working correctly!');
    
  } catch (error) {
    console.error('Error testing full analytics:', error);
    console.error('Error stack:', error.stack);
  } finally {
    mongoose.connection.close();
  }
}

testFullAnalytics();








