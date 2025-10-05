const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rehab_management', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function testComplexAnalytics() {
  try {
    console.log('Testing complex analytics queries...');
    
    const Case = require('./models/Case');
    const ActivityLog = require('./models/ActivityLog');

    console.log('Testing top case managers query...');
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
    console.log('Top case managers:', topCaseManagers);

    console.log('Testing top active workers query...');
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
    console.log('Top active workers:', topActiveWorkers);

    console.log('All complex queries working correctly!');
    
  } catch (error) {
    console.error('Error testing complex analytics:', error);
    console.error('Error stack:', error.stack);
  } finally {
    mongoose.connection.close();
  }
}

testComplexAnalytics();
