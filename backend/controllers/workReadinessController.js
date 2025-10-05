const { db, supabase } = require('../config/supabase');
const { validationResult } = require('express-validator');
const { invalidateCache } = require('../middleware/cache');

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
    const workerId = req.user.id; // Use Supabase user ID

    // Check if worker has already submitted today's assessment
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    const { data: existingAssessment } = await db.work_readiness.findMany({
      worker_id: workerId,
      submitted_at: today
    });

    if (existingAssessment && existingAssessment.length > 0) {
      return res.status(400).json({
        message: 'You have already submitted your work readiness assessment for today',
        alreadySubmitted: true,
        submittedAt: existingAssessment[0].submitted_at
      });
    }

    // Get worker details from Supabase
    const { data: worker, error: workerError } = await db.users.findMany({
      id: workerId
    });

    if (workerError || !worker || worker.length === 0) {
      return res.status(404).json({ message: 'Worker not found' });
    }

    const workerData = worker[0];

    // Create work readiness record in Supabase
    const workReadinessData = {
      worker_id: workerId,
      team_leader_id: workerData.team_leader_id,
      team: workerData.team,
      fatigue_level: parseInt(fatigueLevel),
      pain_discomfort: painDiscomfort,
      pain_areas: painAreas || [],
      readiness_level: readinessLevel,
      mood: mood,
      notes: notes || '',
      submitted_at: new Date().toISOString(),
      status: 'submitted'
    };

    const { data: workReadiness, error: createError } = await db.work_readiness.create(workReadinessData);
    
    if (createError) {
      console.error('❌ Failed to create work readiness assessment:', createError);
      return res.status(500).json({ message: 'Error submitting assessment', error: createError.message });
    }

    console.log('✅ Work readiness assessment saved to Supabase:', workReadiness.id);

    // Invalidate team leader dashboard cache to reflect new submission immediately
    if (workerData.team_leader_id) {
      try {
        invalidateCache(`team-leader-dashboard-${workerData.team_leader_id}`);
        console.log(`Cache invalidated for team leader: ${workerData.team_leader_id}`);
      } catch (cacheError) {
        console.log('Cache invalidation failed, but assessment was saved:', cacheError);
      }
    }

    // Send notification to team leader (using Supabase notifications)
    if (workerData.team_leader_id) {
      try {
        await db.notifications.create({
          recipient_id: workerData.team_leader_id,
          sender_id: workerId,
          type: 'work_readiness_submitted',
          title: 'Work Readiness Assessment Submitted',
          message: `${workerData.first_name} ${workerData.last_name} has submitted their work readiness assessment.`,
          priority: 'medium',
          action_url: '/team-leader',
          metadata: {
            worker_id: workerId,
            worker_name: `${workerData.first_name} ${workerData.last_name}`,
            team: workerData.team,
            assessment_id: workReadiness.id,
            readiness_level: readinessLevel,
            fatigue_level: fatigueLevel,
            mood: mood
          }
        });
        console.log('✅ Notification sent to team leader');
      } catch (notificationError) {
        console.log('Notification creation failed, but assessment was saved:', notificationError);
      }
    }

    res.status(201).json({
      message: 'Work readiness assessment submitted successfully',
      assessment: {
        id: workReadiness.id,
        fatigueLevel: workReadiness.fatigue_level,
        painDiscomfort: workReadiness.pain_discomfort,
        painAreas: workReadiness.pain_areas,
        readinessLevel: workReadiness.readiness_level,
        mood: workReadiness.mood,
        notes: workReadiness.notes,
        submittedAt: workReadiness.submitted_at
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
    const teamLeaderId = req.user.id; // Use Supabase user ID
    
    console.log('🔍 getTeamWorkReadiness called with teamLeaderId:', teamLeaderId);
    console.log('🔍 User object:', req.user);
    
    // Extract date range parameters
    const { startDate, endDate } = req.query;
    
    // Get team members from Supabase - try multiple approaches
    let teamMembers = [];
    let teamMemberIds = [];

    // First, try to get team members by team_leader_id
    const { data: teamMembersByLeader, error: teamMembersError } = await supabase
      .from('users')
      .select('*')
      .eq('team_leader_id', teamLeaderId)
      .eq('role', 'worker')
      .eq('is_active', true);

    if (teamMembersError) {
      console.error('Error fetching team members by leader:', teamMembersError);
    } else if (teamMembersByLeader && teamMembersByLeader.length > 0) {
      teamMembers = teamMembersByLeader;
      teamMemberIds = teamMembers.map(member => member.id);
    } else {
      // If no team members found by team_leader_id, try to get by team
      const { data: currentUser, error: userError } = await supabase
        .from('users')
        .select('team')
        .eq('id', teamLeaderId)
        .single();

      if (!userError && currentUser?.team) {
        const { data: teamMembersByTeam, error: teamError } = await supabase
          .from('users')
          .select('*')
          .eq('team', currentUser.team)
          .eq('role', 'worker')
          .eq('is_active', true);

        if (!teamError && teamMembersByTeam) {
          teamMembers = teamMembersByTeam;
          teamMemberIds = teamMembers.map(member => member.id);
        }
      }
    }

    console.log('🔍 Team members found:', teamMembers.length);
    console.log('🔍 Team member IDs:', teamMemberIds);
    console.log('🔍 Team members data:', teamMembers);

    // Determine date range for assessments
    let query = supabase
      .from('work_readiness')
      .select(`
        *,
        worker:users!work_readiness_worker_id_fkey(*)
      `);

    // If we have team member IDs, filter by them, otherwise get all work readiness data for this team leader
    if (teamMemberIds.length > 0) {
      query = query.in('worker_id', teamMemberIds);
    } else {
      // Fallback: get work readiness data where team_leader_id matches
      query = query.eq('team_leader_id', teamLeaderId);
    }

    if (startDate && endDate) {
      query = query
        .gte('submitted_at', startDate)
        .lte('submitted_at', endDate);
    } else {
      // Default to today if no date range provided
      const today = new Date().toISOString().split('T')[0];
      query = query
        .gte('submitted_at', `${today}T00:00:00.000Z`)
        .lte('submitted_at', `${today}T23:59:59.999Z`);
    }

    // Get assessments from Supabase
    const { data: assessments, error: assessmentsError } = await query
      .order('submitted_at', { ascending: false });

    if (assessmentsError) {
      console.error('Error fetching assessments:', assessmentsError);
      return res.status(500).json({ message: 'Error fetching assessments', error: assessmentsError.message });
    }

    console.log('🔍 Assessments found:', assessments?.length || 0);
    console.log('🔍 Assessment data:', assessments);
    
    // Also check if there are any work readiness records at all
    const { data: allWorkReadiness, error: allError } = await supabase
      .from('work_readiness')
      .select('*')
      .limit(5);
    
    console.log('🔍 All work readiness records (first 5):', allWorkReadiness);
    console.log('🔍 All work readiness error:', allError);

    // Calculate compliance
    const totalTeamMembers = teamMembers.length;
    const submittedAssessments = assessments.length;
    const complianceRate = totalTeamMembers > 0 ? Math.round((submittedAssessments / totalTeamMembers) * 100) : 0;

    // Get non-compliant workers
    const submittedWorkerIds = assessments.map(assessment => assessment.worker_id);
    const nonCompliantWorkers = teamMembers.filter(member => 
      !submittedWorkerIds.includes(member.id)
    );

    // Group assessments by readiness level
    const readinessStats = {
      fit: assessments.filter(a => a.readiness_level === 'fit').length,
      minor: assessments.filter(a => a.readiness_level === 'minor').length,
      not_fit: assessments.filter(a => a.readiness_level === 'not_fit').length
    };

    // Group assessments by fatigue level
    const fatigueStats = {
      1: assessments.filter(a => a.fatigue_level === 1).length,
      2: assessments.filter(a => a.fatigue_level === 2).length,
      3: assessments.filter(a => a.fatigue_level === 3).length,
      4: assessments.filter(a => a.fatigue_level === 4).length,
      5: assessments.filter(a => a.fatigue_level === 5).length
    };

    // Format assessments to match expected structure
    const formattedAssessments = assessments.map(assessment => ({
      _id: assessment.id,
      worker: {
        _id: assessment.worker_id,
        firstName: assessment.worker?.first_name || '',
        lastName: assessment.worker?.last_name || '',
        email: assessment.worker?.email || '',
        team: assessment.team || assessment.worker?.team || ''
      },
      fatigueLevel: assessment.fatigue_level,
      painDiscomfort: assessment.pain_discomfort,
      painAreas: assessment.pain_areas || [],
      readinessLevel: assessment.readiness_level,
      mood: assessment.mood,
      notes: assessment.notes || '',
      submittedAt: assessment.submitted_at
    }));

    // Format non-compliant workers
    const formattedNonCompliantWorkers = nonCompliantWorkers.map(worker => ({
      _id: worker.id,
      firstName: worker.first_name,
      lastName: worker.last_name,
      email: worker.email,
      team: worker.team
    }));

    res.json({
      message: 'Team work readiness data retrieved successfully',
      data: {
        compliance: {
          totalTeamMembers,
          submittedAssessments,
          complianceRate,
          nonCompliantCount: nonCompliantWorkers.length
        },
        assessments: formattedAssessments,
        nonCompliantWorkers: formattedNonCompliantWorkers,
        readinessStats,
        fatigueStats,
        teamMembers: teamMembers.map(member => ({
          _id: member.id,
          firstName: member.first_name,
          lastName: member.last_name,
          email: member.email,
          team: member.team
        }))
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
