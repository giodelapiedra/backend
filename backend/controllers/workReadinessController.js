const WorkReadiness = require('../models/WorkReadiness');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { validationResult } = require('express-validator');

// Submit Work Readiness Assessment
const submitWorkReadiness = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { fatigueLevel, painDiscomfort, painAreas, readinessLevel, mood, notes } = req.body;
    const workerId = req.user._id;

    // Check if worker has already submitted today's assessment
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingAssessment = await WorkReadiness.findOne({
      worker: workerId,
      submittedAt: {
        $gte: today,
        $lt: tomorrow
      }
    });

    if (existingAssessment) {
      return res.status(400).json({
        message: 'You have already submitted your work readiness assessment for today',
        alreadySubmitted: true,
        submittedAt: existingAssessment.submittedAt
      });
    }

    // Get worker details
    const worker = await User.findById(workerId).select('firstName lastName email team teamLeader');
    if (!worker) {
      return res.status(404).json({ message: 'Worker not found' });
    }

    // Create work readiness record
    const workReadinessData = {
      worker: workerId,
      teamLeader: worker.teamLeader,
      team: worker.team,
      fatigueLevel: parseInt(fatigueLevel),
      painDiscomfort,
      painAreas: painAreas || [],
      readinessLevel,
      mood,
      notes: notes || '',
      submittedAt: new Date(),
      status: 'submitted'
    };

    const workReadiness = new WorkReadiness(workReadinessData);
    await workReadiness.save();

    // Send notification to team leader
    if (worker.teamLeader) {
      try {
        await Notification.create({
          recipient: worker.teamLeader,
          sender: workerId,
          type: 'work_readiness_submitted',
          title: 'Work Readiness Assessment Submitted',
          message: `${worker.firstName} ${worker.lastName} has submitted their work readiness assessment.`,
          priority: 'medium',
          actionUrl: '/team-leader',
          metadata: {
            workerId: workerId,
            workerName: `${worker.firstName} ${worker.lastName}`,
            team: worker.team,
            assessmentId: workReadiness._id,
            readinessLevel,
            fatigueLevel,
            mood
          }
        });
      } catch (notificationError) {
        console.log('Notification creation failed, but assessment was saved');
      }
    }

    res.status(201).json({
      message: 'Work readiness assessment submitted successfully',
      assessment: {
        id: workReadiness._id,
        fatigueLevel: workReadiness.fatigueLevel,
        painDiscomfort: workReadiness.painDiscomfort,
        painAreas: workReadiness.painAreas,
        readinessLevel: workReadiness.readinessLevel,
        mood: workReadiness.mood,
        notes: workReadiness.notes,
        submittedAt: workReadiness.submittedAt
      }
    });

  } catch (error) {
    console.error('Error submitting work readiness:', error);
    res.status(500).json({ message: 'Error submitting assessment', error: error.message });
  }
};

// Get Work Readiness Assessments for Team Leader
const getTeamWorkReadiness = async (req, res) => {
  try {
    const teamLeaderId = req.user._id;
    
    // Extract date range parameters
    const { startDate, endDate } = req.query;
    
    // Get team members
    const teamMembers = await User.find({ 
      teamLeader: teamLeaderId,
      role: 'worker',
      isActive: true 
    }).select('_id firstName lastName email team');

    const teamMemberIds = teamMembers.map(member => member._id);

    // Determine date range for assessments
    let dateFilter = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Include the entire end date
      dateFilter = {
        submittedAt: {
          $gte: start,
          $lte: end
        }
      };
    } else {
      // Default to today if no date range provided
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      dateFilter = {
        submittedAt: { $gte: today, $lt: tomorrow }
      };
    }

    const assessments = await WorkReadiness.find({
      worker: { $in: teamMemberIds },
      ...dateFilter
    }).populate('worker', 'firstName lastName email team')
      .sort({ submittedAt: -1 });

    // Calculate compliance
    const totalTeamMembers = teamMembers.length;
    const submittedAssessments = assessments.length;
    const complianceRate = totalTeamMembers > 0 ? Math.round((submittedAssessments / totalTeamMembers) * 100) : 0;

    // Get non-compliant workers
    const submittedWorkerIds = assessments.map(assessment => assessment.worker._id.toString());
    const nonCompliantWorkers = teamMembers.filter(member => 
      !submittedWorkerIds.includes(member._id.toString())
    );

    // Group assessments by readiness level
    const readinessStats = {
      fit: assessments.filter(a => a.readinessLevel === 'fit').length,
      minor: assessments.filter(a => a.readinessLevel === 'minor').length,
      not_fit: assessments.filter(a => a.readinessLevel === 'not_fit').length
    };

    // Group assessments by fatigue level
    const fatigueStats = {
      1: assessments.filter(a => a.fatigueLevel === 1).length,
      2: assessments.filter(a => a.fatigueLevel === 2).length,
      3: assessments.filter(a => a.fatigueLevel === 3).length,
      4: assessments.filter(a => a.fatigueLevel === 4).length,
      5: assessments.filter(a => a.fatigueLevel === 5).length
    };

    res.json({
      message: 'Team work readiness data retrieved successfully',
      data: {
        compliance: {
          totalTeamMembers,
          submittedAssessments,
          complianceRate,
          nonCompliantCount: nonCompliantWorkers.length
        },
        assessments,
        nonCompliantWorkers,
        readinessStats,
        fatigueStats,
        teamMembers
      }
    });

  } catch (error) {
    console.error('Error getting team work readiness:', error);
    res.status(500).json({ message: 'Error retrieving team data', error: error.message });
  }
};

// Get Work Readiness History for Team Leader
const getWorkReadinessHistory = async (req, res) => {
  try {
    const teamLeaderId = req.user._id;
    const { days = 7 } = req.query;

    // Get team members
    const teamMembers = await User.find({ 
      teamLeader: teamLeaderId,
      role: 'worker',
      isActive: true 
    }).select('_id firstName lastName email team');

    const teamMemberIds = teamMembers.map(member => member._id);

    // Get assessments for the specified number of days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    startDate.setHours(0, 0, 0, 0);

    const assessments = await WorkReadiness.find({
      worker: { $in: teamMemberIds },
      submittedAt: { $gte: startDate }
    }).populate('worker', 'firstName lastName email team')
      .sort({ submittedAt: -1 });

    // Group by date
    const assessmentsByDate = {};
    assessments.forEach(assessment => {
      const date = assessment.submittedAt.toISOString().split('T')[0];
      if (!assessmentsByDate[date]) {
        assessmentsByDate[date] = [];
      }
      assessmentsByDate[date].push(assessment);
    });

    // Calculate daily compliance
    const dailyCompliance = Object.keys(assessmentsByDate).map(date => {
      const dayAssessments = assessmentsByDate[date];
      const submittedCount = dayAssessments.length;
      const complianceRate = totalTeamMembers > 0 ? Math.round((submittedCount / teamMembers.length) * 100) : 0;
      
      return {
        date,
        submittedCount,
        totalTeamMembers: teamMembers.length,
        complianceRate,
        assessments: dayAssessments
      };
    }).sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      message: 'Work readiness history retrieved successfully',
      data: {
        dailyCompliance,
        totalDays: parseInt(days),
        teamMembers
      }
    });

  } catch (error) {
    console.error('Error getting work readiness history:', error);
    res.status(500).json({ message: 'Error retrieving history', error: error.message });
  }
};

// Follow up with non-compliant worker
const followUpWorker = async (req, res) => {
  try {
    const { workerId, reason, message } = req.body;
    const teamLeaderId = req.user._id;

    // Verify worker belongs to team leader
    const worker = await User.findOne({
      _id: workerId,
      teamLeader: teamLeaderId,
      role: 'worker'
    });

    if (!worker) {
      return res.status(404).json({ message: 'Worker not found or not in your team' });
    }

    // Create follow-up notification
    const notification = await Notification.create({
      recipient: workerId,
      sender: teamLeaderId,
      type: 'work_readiness_followup',
      title: 'Work Readiness Assessment Reminder',
      message: message || `Please complete your work readiness assessment. Reason: ${reason || 'Required for team compliance'}`,
      priority: 'high',
      actionUrl: '/worker',
      metadata: {
        teamLeaderId,
        teamLeaderName: `${req.user.firstName} ${req.user.lastName}`,
        reason,
        followUpType: 'work_readiness'
      }
    });

    res.json({
      message: 'Follow-up sent successfully',
      notification: {
        id: notification._id,
        message: notification.message,
        sentAt: notification.createdAt
      }
    });

  } catch (error) {
    console.error('Error sending follow-up:', error);
    res.status(500).json({ message: 'Error sending follow-up', error: error.message });
  }
};

// Check if worker has already submitted today's assessment
const checkTodaySubmission = async (req, res) => {
  try {
    const workerId = req.user._id;

    // Check if worker has already submitted today's assessment
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingAssessment = await WorkReadiness.findOne({
      worker: workerId,
      submittedAt: {
        $gte: today,
        $lt: tomorrow
      }
    }).select('submittedAt readinessLevel fatigueLevel mood');

    res.json({
      alreadySubmitted: !!existingAssessment,
      assessment: existingAssessment || null
    });

  } catch (error) {
    console.error('Error checking today submission:', error);
    res.status(500).json({ message: 'Error checking submission status', error: error.message });
  }
};

// Get Assessment Logs with Advanced Filtering
const getAssessmentLogs = async (req, res) => {
  try {
    const teamLeaderId = req.user._id;
    const { 
      startDate, 
      endDate, 
      workerId, 
      readinessLevel, 
      fatigueLevel,
      mood,
      page = 1,
      limit = 50,
      sortBy = 'submittedAt',
      sortOrder = 'desc'
    } = req.query;

    // Get team members
    const teamMembers = await User.find({ 
      teamLeader: teamLeaderId,
      role: 'worker',
      isActive: true 
    }).select('_id firstName lastName email team');

    const teamMemberIds = teamMembers.map(member => member._id);

    // Build filter object
    const filter = {
      worker: { $in: teamMemberIds }
    };

    // Date range filter
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.submittedAt = {
        $gte: start,
        $lte: end
      };
    } else if (startDate) {
      const start = new Date(startDate);
      filter.submittedAt = { $gte: start };
    } else if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.submittedAt = { $lte: end };
    }

    // Worker filter
    if (workerId) {
      filter.worker = workerId;
    }

    // Readiness level filter
    if (readinessLevel) {
      filter.readinessLevel = readinessLevel;
    }

    // Fatigue level filter
    if (fatigueLevel) {
      filter.fatigueLevel = parseInt(fatigueLevel);
    }

    // Mood filter
    if (mood) {
      filter.mood = mood;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get assessments with pagination
    const assessments = await WorkReadiness.find(filter)
      .populate('worker', 'firstName lastName email team')
      .populate('reviewedBy', 'firstName lastName')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalCount = await WorkReadiness.countDocuments(filter);

    // Calculate summary statistics
    const summaryStats = await WorkReadiness.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalAssessments: { $sum: 1 },
          avgFatigueLevel: { $avg: '$fatigueLevel' },
          readinessDistribution: {
            $push: '$readinessLevel'
          },
          fatigueDistribution: {
            $push: '$fatigueLevel'
          },
          moodDistribution: {
            $push: '$mood'
          }
        }
      }
    ]);

    // Process summary statistics
    let summary = {
      totalAssessments: 0,
      avgFatigueLevel: 0,
      readinessDistribution: { fit: 0, minor: 0, not_fit: 0 },
      fatigueDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      moodDistribution: { excellent: 0, good: 0, okay: 0, poor: 0, terrible: 0 }
    };

    if (summaryStats.length > 0) {
      const stats = summaryStats[0];
      summary.totalAssessments = stats.totalAssessments;
      summary.avgFatigueLevel = Math.round(stats.avgFatigueLevel * 10) / 10;

      // Count readiness distribution
      stats.readinessDistribution.forEach(level => {
        if (summary.readinessDistribution.hasOwnProperty(level)) {
          summary.readinessDistribution[level]++;
        }
      });

      // Count fatigue distribution
      stats.fatigueDistribution.forEach(level => {
        if (summary.fatigueDistribution.hasOwnProperty(level)) {
          summary.fatigueDistribution[level]++;
        }
      });

      // Count mood distribution
      stats.moodDistribution.forEach(mood => {
        if (summary.moodDistribution.hasOwnProperty(mood)) {
          summary.moodDistribution[mood]++;
        }
      });
    }

    res.json({
      success: true,
      data: {
        assessments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalCount,
          limit: parseInt(limit)
        },
        summary,
        teamMembers: teamMembers.map(member => ({
          _id: member._id,
          name: `${member.firstName} ${member.lastName}`,
          email: member.email,
          team: member.team
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching assessment logs:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching assessment logs', 
      error: error.message 
    });
  }
};

module.exports = {
  submitWorkReadiness,
  getTeamWorkReadiness,
  getWorkReadinessHistory,
  followUpWorker,
  checkTodaySubmission,
  getAssessmentLogs
};
