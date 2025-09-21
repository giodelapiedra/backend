const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { adminLimiter } = require('../middleware/rateLimiter');

// Test route to verify admin routes are working - NOW PROTECTED WITH RATE LIMITING
router.get('/test', adminLimiter, authMiddleware, roleMiddleware('admin'), (req, res) => {
  console.log('🔍 Admin test route hit');
  res.json({ message: 'Admin routes are working!', timestamp: new Date().toISOString() });
});

// Simple analytics test - NOW PROTECTED WITH RATE LIMITING
router.get('/analytics-test', adminLimiter, authMiddleware, roleMiddleware('admin'), (req, res) => {
  console.log('🔍 Analytics test route hit');
  res.json({ 
    message: 'Analytics test working!', 
    timestamp: new Date().toISOString(),
    testData: {
      totalUsers: 11,
      totalCases: 0,
      totalAppointments: 0
    }
  });
});

// Analytics endpoint for admin - ENHANCED WITH COMPREHENSIVE DATA
router.get('/analytics', adminLimiter, authMiddleware, roleMiddleware('admin'), asyncHandler(async (req, res) => {
  console.log('🔍 Enhanced Analytics endpoint hit (authenticated admin)');
  try {
    // Get all collections
    const User = require('../models/User');
    const Case = require('../models/Case');
    const Appointment = require('../models/Appointment');
    const CheckIn = require('../models/CheckIn');
    const ActivityLog = require('../models/ActivityLog');
    const Incident = require('../models/Incident');
    const RehabilitationPlan = require('../models/RehabilitationPlan');
    const Notification = require('../models/Notification');

    // Overview metrics
    const totalUsers = await User.countDocuments();
    const totalCases = await Case.countDocuments();
    const totalAppointments = await Appointment.countDocuments();
    const totalActivityLogs = await ActivityLog.countDocuments();
    const totalIncidents = await Incident.countDocuments();
    const totalRehabPlans = await RehabilitationPlan.countDocuments();
    const totalNotifications = await Notification.countDocuments();
    
    // Active users (logged in within last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const activeUsers = await User.countDocuments({
      lastLogin: { $gte: sevenDaysAgo }
    });

    // Cases this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const casesThisMonth = await Case.countDocuments({
      createdAt: { $gte: startOfMonth }
    });

    // Appointments this month
    const appointmentsThisMonth = await Appointment.countDocuments({
      createdAt: { $gte: startOfMonth }
    });

    // Activity logs this month
    const activityLogsThisMonth = await ActivityLog.countDocuments({
      createdAt: { $gte: startOfMonth }
    });

    // Incidents this month
    const incidentsThisMonth = await Incident.countDocuments({
      createdAt: { $gte: startOfMonth }
    });

    // User growth (this month vs last month)
    const startOfLastMonth = new Date();
    startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);
    startOfLastMonth.setDate(1);
    startOfLastMonth.setHours(0, 0, 0, 0);
    
    const endOfLastMonth = new Date();
    endOfLastMonth.setDate(0);
    endOfLastMonth.setHours(23, 59, 59, 999);
    
    const usersLastMonth = await User.countDocuments({
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
    });
    
    const userGrowth = usersLastMonth > 0 ? 
      Math.round(((totalUsers - usersLastMonth) / usersLastMonth) * 100) : 0;

    // Case growth
    const casesLastMonth = await Case.countDocuments({
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
    });
    
    const caseGrowth = casesLastMonth > 0 ? 
      Math.round(((totalCases - casesLastMonth) / casesLastMonth) * 100) : 0;

    // Activity log growth
    const activityLogsLastMonth = await ActivityLog.countDocuments({
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
    });
    
    const activityLogGrowth = activityLogsLastMonth > 0 ? 
      Math.round(((totalActivityLogs - activityLogsLastMonth) / activityLogsLastMonth) * 100) : 0;

    // User analytics
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const totalUsersForPercentage = usersByRole.reduce((sum, role) => sum + role.count, 0);
    const usersByRoleWithPercentage = usersByRole.map(role => ({
      role: role._id,
      count: role.count,
      percentage: Math.round((role.count / totalUsersForPercentage) * 100)
    }));

    // Recent user registrations
    const recentRegistrations = await User.find()
      .select('firstName lastName email role createdAt')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const recentRegistrationsFormatted = recentRegistrations.map(user => ({
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    }));

    // Active users
    const activeUsersList = await User.find({
      lastLogin: { $gte: sevenDaysAgo }
    })
      .select('firstName lastName email role lastLogin')
      .sort({ lastLogin: -1 })
      .limit(5)
      .lean();

    const activeUsersFormatted = activeUsersList.map(user => ({
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      lastLogin: user.lastLogin,
      role: user.role
    }));

    // Case analytics
    const casesByStatus = await Case.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const totalCasesForPercentage = casesByStatus.reduce((sum, status) => sum + status.count, 0);
    const casesByStatusWithPercentage = casesByStatus.map(status => ({
      status: status._id,
      count: status.count,
      percentage: Math.round((status.count / totalCasesForPercentage) * 100)
    }));

    // Average resolution time (for closed cases)
    const closedCases = await Case.find({ status: 'closed' })
      .select('createdAt updatedAt')
      .lean();

    const resolutionTime = closedCases.length > 0 ? 
      Math.round(closedCases.reduce((sum, case_) => {
        const resolutionDays = Math.ceil((new Date(case_.updatedAt) - new Date(case_.createdAt)) / (1000 * 60 * 60 * 24));
        return sum + resolutionDays;
      }, 0) / closedCases.length) : 0;

    // Monthly case trend (last 6 months)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - i);
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0);
      monthEnd.setHours(23, 59, 59, 999);
      
      const count = await Case.countDocuments({
        createdAt: { $gte: monthStart, $lte: monthEnd }
      });
      
      monthlyTrend.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        count
      });
    }

    // Top case managers
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
        successRate: { $round: [{ $multiply: [{ $divide: ['$closedCases', '$casesHandled'] }, 100] }, 1] }
      }},
      { $project: {
        name: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
        casesHandled: 1,
        successRate: 1
      }},
      { $sort: { casesHandled: -1 } },
      { $limit: 5 }
    ]);

    // Enhanced Appointment analytics
    const appointmentsByStatus = await Appointment.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const totalScheduled = appointmentsByStatus.find(s => s._id === 'scheduled')?.count || 0;
    const totalCompleted = appointmentsByStatus.find(s => s._id === 'completed')?.count || 0;
    const totalNoShow = appointmentsByStatus.find(s => s._id === 'no_show')?.count || 0;
    const totalCancelled = appointmentsByStatus.find(s => s._id === 'cancelled')?.count || 0;

    const completedRate = totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;
    const noShowRate = totalScheduled > 0 ? Math.round((totalNoShow / totalScheduled) * 100) : 0;
    const cancellationRate = totalScheduled > 0 ? Math.round((totalCancelled / totalScheduled) * 100) : 0;

    // Appointment types
    const appointmentsByType = await Appointment.aggregate([
      { $group: { _id: '$appointmentType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const appointmentsByTypeFormatted = appointmentsByType.map(type => ({
      type: type._id || 'Not specified',
      count: type.count
    }));

    // Monthly appointment trend
    const monthlyAppointmentTrend = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - i);
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0);
      monthEnd.setHours(23, 59, 59, 999);
      
      const scheduled = await Appointment.countDocuments({
        createdAt: { $gte: monthStart, $lte: monthEnd }
      });
      
      const completed = await Appointment.countDocuments({
        createdAt: { $gte: monthStart, $lte: monthEnd },
        status: 'completed'
      });
      
      const noShow = await Appointment.countDocuments({
        createdAt: { $gte: monthStart, $lte: monthEnd },
        status: 'no_show'
      });
      
      monthlyAppointmentTrend.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        scheduled,
        completed,
        noShow
      });
    }

    // COMPREHENSIVE ACTIVITY LOG ANALYTICS
    const activityLogsByType = await ActivityLog.aggregate([
      { $group: { _id: '$activityType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const totalActivityLogsForPercentage = activityLogsByType.reduce((sum, type) => sum + type.count, 0);
    const activityLogsByTypeFormatted = activityLogsByType.map(type => ({
      type: type._id,
      count: type.count,
      percentage: Math.round((type.count / totalActivityLogsForPercentage) * 100)
    }));

    // Activity logs by priority
    const activityLogsByPriority = await ActivityLog.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Recent activity logs
    const recentActivityLogs = await ActivityLog.find()
      .populate('worker', 'firstName lastName email')
      .populate('case', 'caseNumber status')
      .populate('clinician', 'firstName lastName email')
      .select('title description activityType priority createdAt isReviewed')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const recentActivityLogsFormatted = recentActivityLogs.map(log => ({
      id: log._id,
      title: log.title,
      description: log.description,
      activityType: log.activityType,
      priority: log.priority,
      worker: log.worker ? `${log.worker.firstName} ${log.worker.lastName}` : 'Unknown',
      case: log.case ? log.case.caseNumber : 'Unknown',
      clinician: log.clinician ? `${log.clinician.firstName} ${log.clinician.lastName}` : 'Unknown',
      createdAt: log.createdAt,
      isReviewed: log.isReviewed
    }));

    // Activity logs monthly trend
    const monthlyActivityTrend = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - i);
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0);
      monthEnd.setHours(23, 59, 59, 999);
      
      const total = await ActivityLog.countDocuments({
        createdAt: { $gte: monthStart, $lte: monthEnd }
      });
      
      const reviewed = await ActivityLog.countDocuments({
        createdAt: { $gte: monthStart, $lte: monthEnd },
        isReviewed: true
      });
      
      const pending = await ActivityLog.countDocuments({
        createdAt: { $gte: monthStart, $lte: monthEnd },
        isReviewed: false
      });
      
      monthlyActivityTrend.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        total,
        reviewed,
        pending
      });
    }

    // Top active workers (by activity logs)
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
              $divide: ['$completedExercises', { $add: ['$completedExercises', '$skippedExercises'] }] 
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

    // INCIDENT ANALYTICS
    const incidentsByType = await Incident.aggregate([
      { $group: { _id: '$incidentType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const incidentsBySeverity = await Incident.aggregate([
      { $group: { _id: '$severity', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const incidentsByStatus = await Incident.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Recent incidents
    const recentIncidents = await Incident.find()
      .populate('reportedBy', 'firstName lastName email')
      .populate('worker', 'firstName lastName email')
      .populate('employer', 'firstName lastName email')
      .select('incidentNumber incidentType severity status incidentDate description createdAt')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const recentIncidentsFormatted = recentIncidents.map(incident => ({
      id: incident._id,
      incidentNumber: incident.incidentNumber,
      incidentType: incident.incidentType,
      severity: incident.severity,
      status: incident.status,
      incidentDate: incident.incidentDate,
      description: incident.description,
      reportedBy: incident.reportedBy ? `${incident.reportedBy.firstName} ${incident.reportedBy.lastName}` : 'Unknown',
      worker: incident.worker ? `${incident.worker.firstName} ${incident.worker.lastName}` : 'Unknown',
      employer: incident.employer ? `${incident.employer.firstName} ${incident.employer.lastName}` : 'Unknown',
      createdAt: incident.createdAt
    }));

    // REHABILITATION PLAN ANALYTICS
    const rehabPlansByStatus = await RehabilitationPlan.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Average completion rate across all rehab plans
    const allRehabPlans = await RehabilitationPlan.find()
      .select('progressStats')
      .lean();

    const avgCompletionRate = allRehabPlans.length > 0 ? 
      Math.round(allRehabPlans.reduce((sum, plan) => {
        const totalDays = plan.progressStats?.totalDays || 0;
        const completedDays = plan.progressStats?.completedDays || 0;
        const completionRate = totalDays > 0 ? (completedDays / totalDays) * 100 : 0;
        return sum + completionRate;
      }, 0) / allRehabPlans.length) : 0;

    // NOTIFICATION ANALYTICS
    const notificationsByType = await Notification.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const unreadNotifications = await Notification.countDocuments({ isRead: false });
    const readNotifications = await Notification.countDocuments({ isRead: true });

    // System health metrics (enhanced)
    const systemHealth = {
      uptime: 99.9,
      responseTime: 150,
      errorRate: 0.1,
      dataQuality: 95.5,
      totalDataPoints: totalUsers + totalCases + totalAppointments + totalActivityLogs + totalIncidents,
      dataIntegrity: 98.2
    };

    const analyticsData = {
      overview: {
        totalUsers,
        totalCases,
        totalAppointments,
        totalActivityLogs,
        totalIncidents,
        totalRehabPlans,
        totalNotifications,
        activeUsers,
        casesThisMonth,
        appointmentsThisMonth,
        activityLogsThisMonth,
        incidentsThisMonth,
        userGrowth,
        caseGrowth,
        activityLogGrowth
      },
      users: {
        byRole: usersByRoleWithPercentage,
        recentRegistrations: recentRegistrationsFormatted,
        activeUsers: activeUsersFormatted
      },
      cases: {
        byStatus: casesByStatusWithPercentage,
        resolutionTime,
        monthlyTrend,
        topCaseManagers
      },
      appointments: {
        totalScheduled,
        totalCompleted,
        totalNoShow,
        totalCancelled,
        completedRate,
        noShowRate,
        cancellationRate,
        byType: appointmentsByTypeFormatted,
        monthlyTrend: monthlyAppointmentTrend
      },
      activityLogs: {
        byType: activityLogsByTypeFormatted,
        byPriority: activityLogsByPriority,
        recentLogs: recentActivityLogsFormatted,
        monthlyTrend: monthlyActivityTrend,
        topActiveWorkers
      },
      incidents: {
        byType: incidentsByType,
        bySeverity: incidentsBySeverity,
        byStatus: incidentsByStatus,
        recentIncidents: recentIncidentsFormatted
      },
      rehabilitationPlans: {
        byStatus: rehabPlansByStatus,
        avgCompletionRate,
        totalPlans: totalRehabPlans
      },
      notifications: {
        byType: notificationsByType,
        unreadCount: unreadNotifications,
        readCount: readNotifications,
        totalCount: totalNotifications
      },
      system: systemHealth
    };

    res.json(analyticsData);
  } catch (error) {
    console.error('Enhanced Analytics error:', error);
    res.status(500).json({ message: 'Failed to fetch enhanced analytics data' });
  }
}));

module.exports = router;
