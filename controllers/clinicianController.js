// Skip MongoDB imports in production or if mongoose is not available
let mongoose, Case, Appointment, User;
try {
  if (process.env.NODE_ENV !== 'production' && process.env.USE_SUPABASE !== 'true') {
    mongoose = require('mongoose');
    Case = require('../models/Case');
    Appointment = require('../models/Appointment');
    User = require('../models/User');
  } else {
    console.log('Skipping MongoDB imports in clinicianController - using Supabase only');
    Case = {};
    Appointment = {};
    User = {};
  }
} catch (error) {
  console.log('Mongoose not available in clinicianController - using Supabase only');
  mongoose = null;
  Case = {};
  Appointment = {};
  User = {};
}
const { startOfMonth, endOfMonth, subMonths, format } = require('date-fns');

// @desc    Get analytics data for a clinician
// @route   GET /api/clinicians/analytics
// @access  Private (Clinician only)
const getAnalytics = async (req, res) => {
  try {
    console.log('Clinician analytics request received');
    console.log('User:', req.user);
    console.log('Query params:', req.query);
    
    // Check if user is a clinician
    if (req.user.role !== 'clinician') {
      console.error('Non-clinician tried to access analytics');
      return res.status(403).json({ message: 'Access denied. Only clinicians can view analytics.' });
    }

    const clinicianId = req.user._id;
    if (!clinicianId) {
      console.error('No clinician ID found in request');
      return res.status(400).json({ message: 'Clinician ID is required' });
    }


    // Fetch complete clinician profile
    const clinician = await User.findById(clinicianId).select('+specialty +licenseNumber');
    if (!clinician) {
      console.error('Clinician not found:', clinicianId);
      return res.status(404).json({ message: 'Clinician not found' });
    }

    console.log('Fetching analytics for clinician:', clinicianId);
    const now = new Date();

    // Get all cases for the clinician
    console.log('Fetching all cases');
    let allCases;
    try {
      allCases = await Case.find({ clinician: clinicianId });
      console.log(`Found ${allCases.length} total cases`);
    } catch (err) {
      console.error('Error fetching cases:', err);
      allCases = [];
    }
    
    const activeCases = allCases.filter(c => !['closed', 'return_to_work'].includes(c.status));
    const completedCases = allCases.filter(c => c.status === 'closed');
    console.log(`Active cases: ${activeCases.length}, Completed cases: ${completedCases.length}`);

    // Get appointment statistics
    console.log('Fetching appointment statistics');
    let appointmentStats = {
      total: 0,
      upcoming: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      byStatus: [],
      byType: [],
      monthlyAppointments: []
    };

    try {
      // Total appointments
      appointmentStats.total = await Appointment.countDocuments({
        clinician: clinicianId
      });

      // Upcoming appointments
      appointmentStats.upcoming = await Appointment.countDocuments({
        clinician: clinicianId,
        scheduledDate: { $gte: now },
        status: { $ne: 'cancelled' }
      });

      // Appointments by status
      appointmentStats.byStatus = await Appointment.aggregate([
        { $match: { clinician: clinicianId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $project: { status: '$_id', count: 1, _id: 0 } }
      ]);

      // Appointments by type
      appointmentStats.byType = await Appointment.aggregate([
        { $match: { clinician: clinicianId } },
        { $group: { _id: '$appointmentType', count: { $sum: 1 } } },
        { $project: { appointmentType: '$_id', count: 1, _id: 0 } }
      ]);

      // Monthly appointment stats for the last 6 months
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i));
        const monthEnd = endOfMonth(subMonths(now, i));
        
        let monthlyCount = 0;
        try {
          monthlyCount = await Appointment.countDocuments({
            clinician: clinicianId,
            scheduledDate: { $gte: monthStart, $lte: monthEnd }
          });
        } catch (err) {
          console.error('Error counting appointments for month:', err);
        }

        appointmentStats.monthlyAppointments.push({
          month: format(monthStart, 'MMM yyyy'),
          appointments: monthlyCount
        });
      }

      // Individual status counts
      appointmentStats.confirmed = await Appointment.countDocuments({
        clinician: clinicianId,
        status: 'confirmed'
      });

      appointmentStats.completed = await Appointment.countDocuments({
        clinician: clinicianId,
        status: 'completed'
      });

      appointmentStats.cancelled = await Appointment.countDocuments({
        clinician: clinicianId,
        status: 'cancelled'
      });

      console.log('Appointment statistics:', appointmentStats);
    } catch (err) {
      console.error('Error fetching appointment statistics:', err);
    }

    // Calculate cases by status
    console.log('Running case status aggregation');
    let casesByStatus;
    try {
      casesByStatus = await Case.aggregate([
        { $match: { clinician: clinicianId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $project: { status: '$_id', count: 1, _id: 0 } }
      ]);
      console.log('Case status aggregation result:', casesByStatus);
    } catch (err) {
      console.error('Error in case status aggregation:', err);
      casesByStatus = [];
    }

    // Calculate cases by injury type
    console.log('Running injury type aggregation');
    let casesByInjuryType;
    try {
      casesByInjuryType = await Case.aggregate([
        { $match: { clinician: clinicianId } },
        { $group: { _id: '$injuryDetails.injuryType', count: { $sum: 1 } } },
        { $project: { injuryType: '$_id', count: 1, _id: 0 } }
      ]);
      console.log('Injury type aggregation result:', casesByInjuryType);
    } catch (err) {
      console.error('Error in injury type aggregation:', err);
      casesByInjuryType = [];
    }

    // Calculate monthly stats for the last 6 months
    const monthlyStats = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));
      
      let newCases = 0;
      try {
        newCases = await Case.countDocuments({
          clinician: clinicianId,
          createdAt: { $gte: monthStart, $lte: monthEnd }
        });
      } catch (err) {
        console.error('Error counting new cases for month:', err);
      }

      let completedInMonth = 0;
      try {
        completedInMonth = await Case.countDocuments({
          clinician: clinicianId,
          status: 'closed',
          'statusHistory.status': 'closed',
          'statusHistory.changedAt': { $gte: monthStart, $lte: monthEnd }
        });
      } catch (err) {
        console.error('Error counting completed cases for month:', err);
      }

      monthlyStats.push({
        month: format(monthStart, 'MMM yyyy'),
        newCases,
        completedCases: completedInMonth
      });
    }

    // Calculate average recovery time (in days)
    const casesWithCompletionTime = completedCases.map(c => {
      const startDate = c.createdAt;
      const endDate = c.closedDate || c.updatedAt;
      return Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    });

    const averageRecoveryTime = casesWithCompletionTime.length > 0
      ? Math.round(casesWithCompletionTime.reduce((a, b) => a + b, 0) / casesWithCompletionTime.length)
      : 0;

    // Calculate success rate
    const successRate = allCases.length > 0
      ? Math.round((completedCases.length / allCases.length) * 100)
      : 0;

    res.json({
      clinician: {
        id: clinician._id,
        firstName: clinician.firstName,
        lastName: clinician.lastName,
        email: clinician.email,
        profileImage: clinician.profileImage,
        specialty: clinician.specialty,
        licenseNumber: clinician.licenseNumber,
        isAvailable: clinician.isAvailable
      },
      analytics: {
        totalCases: allCases.length,
        activeCases: activeCases.length,
        completedCases: completedCases.length,
        upcomingAppointments: appointmentStats.upcoming,
        casesByStatus,
        casesByInjuryType,
        monthlyStats,
        averageRecoveryTime,
        successRate,
        appointmentStats
      }
    });

  } catch (err) {
    console.error('Error in clinician analytics:', err);
    res.status(500).json({ message: 'Server error while fetching analytics' });
  }
};

module.exports = {
  getAnalytics
};
