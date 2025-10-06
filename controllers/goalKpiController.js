const { db, supabase } = require('../config/supabase');

/**
 * Goal Tracking & KPI Controller
 * 
 * This controller provides comprehensive Goal Tracking & KPI functionality including:
 * - Weekly work readiness goal tracking
 * - KPI rating calculation based on completion percentage
 * - Individual and team performance metrics
 * - Data filtering by worker and team leader
 * - Weekly achievement summaries
 */

/**
 * Calculate KPI score based on consecutive days completed in cycle
 * @param {number} consecutiveDays - Number of consecutive days completed (0-7)
 * @returns {object} KPI score and rating
 */
const calculateKPI = (consecutiveDays) => {
  let rating, color, description, score;
  
  // KPI scoring based on consecutive days:
  // 7/7 days: Excellent
  // 5-6 days: Good  
  // 3-4 days: Average
  // Less than 3 days: No KPI points
  
  if (consecutiveDays >= 7) {
    rating = 'Excellent';
    color = '#10b981'; // green
    description = 'Outstanding! Complete 7-day cycle achieved.';
    score = 100;
  } else if (consecutiveDays >= 5) {
    rating = 'Good';
    color = '#22c55e'; // light green
    description = 'Good progress! Keep going to complete the cycle.';
    score = Math.round((consecutiveDays / 7) * 100);
  } else if (consecutiveDays >= 3) {
    rating = 'Average';
    color = '#eab308'; // yellow/orange
    description = 'Average progress. Focus on consistency.';
    score = Math.round((consecutiveDays / 7) * 100);
  } else {
    rating = 'No KPI Points';
    color = '#ef4444'; // red
    description = 'Need at least 3 consecutive days for KPI points.';
    score = 0;
  }

  return {
    rating,
    color,
    description,
    score: score,
    consecutiveDays: consecutiveDays,
    maxDays: 7
  };
};

/**
 * Calculate KPI score based on completion rate percentage
 * @param {number} completionRate - Completion rate percentage (0-100)
 * @param {number} currentDay - Current day in cycle (optional)
 * @param {number} totalAssessments - Total number of assessments submitted (optional)
 * @returns {object} KPI score and rating
 */
const calculateCompletionRateKPI = (completionRate, currentDay = null, totalAssessments = null) => {
  let rating, color, description, score;
  
  // Check if user hasn't started KPI rating yet
  if (completionRate === 0 && (totalAssessments === 0 || totalAssessments === null)) {
    rating = 'Not Started';
    color = '#6b7280'; // gray
    description = 'KPI rating not yet started. Begin your work readiness assessments.';
    score = 0;
    return { rating, color, description, score, completionRate, maxRate: 100 };
  }
  
  // Special handling for early cycle days
  if (currentDay !== null && currentDay <= 2) {
    // Days 1-2: Neutral rating, no penalty
    rating = 'On Track';
    color = '#3b82f6'; // blue
    description = 'Just started the cycle. Keep going!';
    score = 0; // No KPI points yet
    return { rating, color, description, score, completionRate, maxRate: 100 };
  }
  
  // KPI scoring based on completion rate for days 3+:
  // 100%: Excellent
  // 70-99%: Good  
  // 50-69%: Average
  // Below 50%: Needs Improvement
  
  if (completionRate >= 100) {
    rating = 'Excellent';
    color = '#10b981'; // green
    description = 'Outstanding! Perfect completion rate achieved.';
    score = 100;
  } else if (completionRate >= 70) {
    rating = 'Good';
    color = '#22c55e'; // light green
    description = 'Good progress! Keep up the consistency.';
    score = Math.round(completionRate);
  } else if (completionRate >= 50) {
    rating = 'Average';
    color = '#eab308'; // yellow/orange
    description = 'Average progress. Focus on consistency.';
    score = Math.round(completionRate);
  } else {
    rating = 'Needs Improvement';
    color = '#ef4444'; // red
    description = 'Below average performance. Needs attention.';
    score = Math.round(completionRate);
  }

  return {
    rating,
    color,
    description,
    score: score,
    completionRate: completionRate,
    maxRate: 100
  };
};

/**
 * Get start and end dates for a given week (Sunday to Saturday)
 * @param {Date} date - Any date in the week
 * @returns {object} Week start and end dates
 */
const getWeekDateRange = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const diff = d.getDate() - day; // Go back to Sunday
  
  // Sunday
  const startDate = new Date(d.setDate(diff));
  startDate.setHours(0, 0, 0, 0);
  
  // Saturday
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  endDate.setHours(23, 59, 59, 999);
  
  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    startDateISO: startDate.toISOString().split('T')[0],
    endDateISO: endDate.toISOString().split('T')[0],
    weekLabel: `Week of ${startDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
  };
};

/**
 * Get current week and previous week data for comparison
 * @param {Date} date - Reference date (defaults to current date)
 * @returns {object} Current and previous week information
 */
const getWeekComparison = (date = new Date()) => {
  const currentWeek = getWeekDateRange(date);
  
  // Get previous week
  const prevWeekStart = new Date(currentWeek.startDate);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const previousWeek = getWeekDateRange(prevWeekStart);
  
  return {
    currentWeek,
    previousWeek
  };
};

/**
 * Calculate working days count between start and end date (Monday-Friday)
 */
const getWorkingDaysCount = (startDate, endDate) => {
  let workingDays = 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  while (start <= end) {
    const day = start.getDay();
    if (day !== 0 && day !== 6) { // Not Sunday (0) or Saturday (6)
      workingDays++;
    }
    start.setDate(start.getDate() + 1);
  }
  
  return workingDays;
};

/**
 * Calculate working days elapsed since start of current week (Monday)
 * @param {Date} weekStartDate - Start date of the week (Monday)
 * @param {Date} currentDate - Current date (defaults to today)
 * @returns {number} Number of working days elapsed (0-5)
 */
const getWorkingDaysElapsed = (weekStartDate, currentDate = new Date()) => {
  const startOfWeek = new Date(weekStartDate);
  const today = new Date(currentDate);
  
  let workingDaysElapsed = 0;
  const currentDateInWeek = new Date(startOfWeek);
  
  // Count working days from Monday up to today (or end of week)
  while (currentDateInWeek <= today && currentDateInWeek.getDay() <= 5) {
    if (currentDateInWeek.getDay() >= 1 && currentDateInWeek.getDay() <= 5) { // Monday = 1, Friday = 5
      workingDaysElapsed++;
    }
    currentDateInWeek.setDate(currentDateInWeek.getDate() + 1);
  }
  
  // Cap at 5 working days
  return Math.min(workingDaysElapsed, 5);
};

/**
 * Calculate submission streaks
 */
const calculateStreaks = (assessments) => {
  if (!assessments || assessments.length === 0) {
    return { current: 0, longest: 0 };
  }

  // Sort assessments by date
  const sortedAssessments = assessments
    .map(a => a)
    .sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at));

  let longestStreak = 0;
  let tempStreak = 0;
  let lastDate = null;

  // Calculate working days streak (consecutive weekdays)
  sortedAssessments.forEach(assessment => {
    const assessmentDate = new Date(assessment.submitted_at);
    
    // Skip weekends
    if (assessmentDate.getDay() === 0 || assessmentDate.getDay() === 6) {
      return;
    }
    
    if (!lastDate) {
      tempStreak = 1;
    } else {
      const daysDiff = Math.floor((assessmentDate - lastDate) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1; // Start new streak
      }
    }
    
    lastDate = new Date(assessmentDate);
  });

  longestStreak = Math.max(longestStreak, tempStreak);
  
  // Calculate current streak from the end
  let currentStreak = 0;
  const today = new Date();
  const sortedDates = [...new Set(sortedAssessments
    .map(a => new Date(a.submitted_at))
    .filter(d => d.getDay() !== 0 && d.getDay() !== 6) // Only weekdays
    .sort((a, b) => b - a))]; // Sort descending (most recent first)

  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) {
      const lastSubmission = sortedDates[i];
      const daysSinceLastSubmission = Math.floor((today - lastSubmission) / (1000 * 60 * 60 * 24));
      
      if (daysSinceLastSubmission <= 1) {
        currentStreak = 1;
        
        // Continue checking previous days
        let j = 1;
        while (j < sortedDates.length) {
          const currentDate = sortedDates[j - 1];
          const previousDate = sortedDates[j];
          const daysDiff = Math.floor((currentDate - previousDate) / (1000 * 60 * 60 * 24));
          
          if (daysDiff === 1) {
            currentStreak++;
            j++;
          } else {
            break;
          }
        }
      }
    }
    break;
  }

  return {
    current: currentStreak,
    longest: longestStreak
  };
};

/**
 * Get Weekly Work Readiness Goal Tracking for Worker Dashboard (Cycle-based)
 * @route GET /api/goal-kpi/worker/weekly-progress
 * @access Worker
 */
const getWorkerWeeklyProgress = async (req, res) => {
  try {
    const workerId = req.query.workerId;
    
    if (!workerId) {
      return res.status(400).json({
        success: false,
        message: 'Worker ID is required'
      });
    }
    
    // Get worker info
    const { data: worker, error: workerError } = await supabase
      .from('users')
      .select('id, first_name, last_name, role')
      .eq('id', workerId)
      .eq('role', 'worker')
      .single();
    
    if (workerError || !worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }
    
    // Get latest assessment to check cycle status
    const { data: latestAssessment, error: assessmentError } = await supabase
      .from('work_readiness')
      .select('cycle_start, cycle_day, streak_days, cycle_completed, submitted_at')
      .eq('worker_id', workerId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .single();
    
    if (assessmentError && assessmentError.code !== 'PGRST116') {
      throw assessmentError;
    }
    
    // Check if cycle exists
    if (!latestAssessment?.cycle_start) {
      return res.json({
        success: true,
        message: 'No active cycle',
        data: {
          weeklyProgress: {
            completedDays: 0,
            totalWorkDays: 7,
            completionRate: 0,
            kpi: calculateKPI(0),
            weekLabel: 'No Active Cycle',
            streaks: { current: 0, longest: 0 },
            topPerformingDays: 0
          },
          dailyBreakdown: [],
          kpiMetrics: {
            currentKPI: calculateKPI(0),
            goalType: 'Work Readiness Assessment',
            weeklyTarget: 7,
            actualCompleted: 0,
            performanceTrend: []
          }
        }
      });
    }
    
    const cycleStart = new Date(latestAssessment.cycle_start);
    const today = new Date();
    
    // Calculate cycle progress based on consecutive days
    const consecutiveDaysCompleted = latestAssessment.streak_days || 0;
    
    // Get assessments for this cycle
    const cycleEnd = new Date(cycleStart);
    cycleEnd.setDate(cycleStart.getDate() + 6); // 7-day cycle
    
    const { data: assessments, error: assessmentsError } = await supabase
      .from('work_readiness')
      .select('*')
      .eq('worker_id', workerId)
      .gte('submitted_at', cycleStart.toISOString())
      .lte('submitted_at', cycleEnd.toISOString())
      .order('submitted_at', { ascending: true });

    if (assessmentsError) {
      throw assessmentsError;
    }

    // Calculate daily breakdown for cycle
    const dailyBreakdown = [];
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(cycleStart);
      currentDate.setDate(cycleStart.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];
      
      const dayAssessment = assessments?.find(a => 
        new Date(a.submitted_at).toISOString().split('T')[0] === dateStr
      );
      
      dailyBreakdown.push({
        date: dateStr,
        dayName: currentDate.toLocaleDateString('en-US', { weekday: 'short' }),
        completed: !!dayAssessment,
        readinessLevel: dayAssessment?.readiness_level || null,
        fatigueLevel: dayAssessment?.fatigue_level || null,
        mood: dayAssessment?.mood || null,
        submittedAt: dayAssessment?.submitted_at || null
      });
    }
    
    // Calculate KPI with consecutive days
    const kpi = calculateKPI(consecutiveDaysCompleted);
    
    // Achievement summary
    const achievementSummary = {
      completedDays: consecutiveDaysCompleted,
      totalWorkDays: 7,
      completionRate: Math.round((consecutiveDaysCompleted / 7) * 100),
      kpi: kpi,
      weekLabel: `Cycle Day ${latestAssessment.cycle_day || 1} of 7`,
      streaks: calculateStreaks(assessments),
      topPerformingDays: dailyBreakdown.filter(d => d.completed && d.readinessLevel === 'fit').length
    };

    res.json({
      success: true,
      data: {
        weeklyProgress: achievementSummary,
        dailyBreakdown,
        kpiMetrics: {
          currentKPI: kpi,
          goalType: 'Work Readiness Assessment',
          weeklyTarget: 7,
          actualCompleted: consecutiveDaysCompleted,
          performanceTrend: await getPerformanceTrend(workerId)
        },
        cycle: {
          cycleStart: latestAssessment.cycle_start,
          currentDay: latestAssessment.cycle_day || 1,
          streakDays: latestAssessment.streak_days || 0,
          cycleCompleted: latestAssessment.cycle_completed || false
        }
      }
    });

  } catch (error) {
    console.error('Error fetching worker weekly progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch weekly progress',
      error: error.message
    });
  }
};

/**
 * Get Monthly Performance Tracking for Team Leader
 * Comprehensive monthly KPI calculation and reporting
 * @route GET /api/goal-kpi/team-leader/monthly-performance
 * @access Team Leader
 */
const getMonthlyPerformanceTracking = async (req, res) => {
  try {
    console.log('📅 getMonthlyPerformanceTracking called with:', req.query);
    const teamLeaderId = req.query.teamLeaderId;
    const { 
      year = new Date().getFullYear(), 
      month = new Date().getMonth() + 1,
      includePreviousMonths = '3' // Include last 3 months for comparison
    } = req.query;
    
    if (!teamLeaderId) {
      return res.status(400).json({
        success: false,
        message: 'Team Leader ID is required'
      });
    }
    
    // Simplified response for now to prevent timeouts
    const response = {
      success: true,
      data: {
        monthlyWorkerKPIs: [],
        monthlyTeamSummary: {
          month: new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          monthStart: new Date(year, month - 1, 1).toISOString().split('T')[0],
          monthEnd: new Date(year, month, 0).toISOString().split('T')[0],
          totalMembers: 0,
          totalAssessments: 0,
          completedCycles: 0,
          averageCompletionRate: 0,
          teamKPI: {
            rating: "Not Available",
            color: "#6b7280",
            description: "Monthly performance data is being optimized for better performance.",
            score: 0
          }
        },
        monthlyTrends: [],
        performanceInsights: [
          {
            type: "info",
            message: "Monthly performance tracking is being optimized for better performance. Please check back later."
          }
        ]
      }
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ Error fetching monthly performance tracking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch monthly performance tracking',
      error: error.message
    });
  }
};

/**
 * Calculate working days in a month (Monday-Friday)
 */
const getWorkingDaysInMonth = (monthStart, monthEnd) => {
  let workingDays = 0;
  const current = new Date(monthStart);
  
  while (current <= monthEnd) {
    const dayOfWeek = current.getDay();
    // Monday = 1, Tuesday = 2, ..., Friday = 5
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      workingDays++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return workingDays;
};

/**
 * Generate monthly performance insights
 */
const generateMonthlyInsights = (monthlyWorkerKPIs, teamSummary, monthlyTrends) => {
  const insights = [];
  
  // Top performers
  const topPerformers = monthlyWorkerKPIs
    .filter(member => member.monthlyMetrics.monthlyKPI.rating === 'Excellent')
    .slice(0, 3);
  
  if (topPerformers.length > 0) {
    insights.push({
      type: 'success',
      title: 'Top Performers',
      message: `${topPerformers.length} team members achieved Excellent rating this month`,
      data: topPerformers.map(member => ({
        name: member.workerName,
        completionRate: member.monthlyMetrics.completionRate,
        completedCycles: member.monthlyMetrics.completedCycles
      }))
    });
  }
  
  // Workers needing improvement
  const needsImprovement = monthlyWorkerKPIs
    .filter(member => member.monthlyMetrics.monthlyKPI.rating === 'Needs Improvement')
    .slice(0, 3);
  
  if (needsImprovement.length > 0) {
    insights.push({
      type: 'warning',
      title: 'Needs Improvement',
      message: `${needsImprovement.length} team members need support to improve their performance`,
      data: needsImprovement.map(member => ({
        name: member.workerName,
        completionRate: member.monthlyMetrics.completionRate,
        completedCycles: member.monthlyMetrics.completedCycles
      }))
    });
  }
  
  // Monthly trends
  if (monthlyTrends.length >= 2) {
    const currentMonth = monthlyTrends[monthlyTrends.length - 1];
    const previousMonth = monthlyTrends[monthlyTrends.length - 2];
    
    const completionRateChange = currentMonth.completionRate - previousMonth.completionRate;
    const cyclesChange = currentMonth.completedCycles - previousMonth.completedCycles;
    
    if (completionRateChange > 0) {
      insights.push({
        type: 'info',
        title: 'Improving Trend',
        message: `Team completion rate improved by ${Math.round(completionRateChange)}% compared to last month`,
        data: { 
          currentRate: currentMonth.completionRate,
          previousRate: previousMonth.completionRate,
          improvement: completionRateChange
        }
      });
    } else if (completionRateChange < 0) {
      insights.push({
        type: 'warning',
        title: 'Declining Trend',
        message: `Team completion rate decreased by ${Math.round(Math.abs(completionRateChange))}% compared to last month`,
        data: { 
          currentRate: currentMonth.completionRate,
          previousRate: previousMonth.completionRate,
          decline: Math.abs(completionRateChange)
        }
      });
    }
  }
  
  // Team performance summary
  insights.push({
    type: 'info',
    title: 'Monthly Summary',
    message: `Team completed ${teamSummary.totalCompletedCycles} cycles with ${Math.round(teamSummary.averageCompletionRate)}% average completion rate`,
    data: {
      totalCycles: teamSummary.totalCompletedCycles,
      averageRate: teamSummary.averageCompletionRate,
      teamKPI: teamSummary.teamMonthlyKPI.rating
    }
  });
  
  return insights;
};
const getTeamMonitoringDashboard = async (req, res) => {
  try {
    console.log('📊 getTeamMonitoringDashboard called with:', req.query);
    const teamLeaderId = req.query.teamLeaderId;
    const { timeRange = '30' } = req.query; // Last 30 days by default
    
    if (!teamLeaderId) {
      return res.status(400).json({
        success: false,
        message: 'Team Leader ID is required'
      });
    }
    
    // Get team members
    const { data: teamLeader } = await supabase
      .from('users')
      .select('managed_teams')
      .eq('id', teamLeaderId)
      .eq('role', 'team_leader')
      .single();
    
    const { data: teamMembers } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, team')
      .eq('role', 'worker')
      .in('team', teamLeader?.managed_teams || []);
    
    const teamMemberIds = teamMembers?.map(member => member.id) || [];
    
    // Calculate date range for monitoring
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(timeRange));
    
    // Get all assessments in the monitoring period
    const { data: allAssessments } = await supabase
      .from('work_readiness')
      .select('*')
      .in('worker_id', teamMemberIds)
      .gte('submitted_at', startDate.toISOString())
      .lte('submitted_at', endDate.toISOString())
      .order('submitted_at', { ascending: false });
    
    // 1. CURRENT CYCLE STATUS (Real-time monitoring)
    const currentCycleStatus = await Promise.all(teamMembers.map(async (member) => {
      const { data: latestAssessment } = await supabase
        .from('work_readiness')
        .select('cycle_start, cycle_day, streak_days, cycle_completed, submitted_at')
        .eq('worker_id', member.id)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .single();
      
      if (!latestAssessment) {
        return {
          workerId: member.id,
          workerName: `${member.first_name} ${member.last_name}`,
          status: 'No Cycle Started',
          currentDay: 0,
          streakDays: 0,
          cycleCompleted: false,
          lastSubmission: null
        };
      }
      
      const cycleStart = new Date(latestAssessment.cycle_start);
      const cycleEnd = new Date(cycleStart);
      cycleEnd.setDate(cycleStart.getDate() + 6);
      
      // Check if cycle is completed
      const isCompleted = latestAssessment.cycle_completed || latestAssessment.streak_days >= 7;
      
      return {
        workerId: member.id,
        workerName: `${member.first_name} ${member.last_name}`,
        status: isCompleted ? 'Cycle Completed' : 'Cycle In Progress',
        currentDay: latestAssessment.cycle_day,
        streakDays: latestAssessment.streak_days,
        cycleCompleted: isCompleted,
        cycleStart: cycleStart.toISOString().split('T')[0],
        cycleEnd: cycleEnd.toISOString().split('T')[0],
        lastSubmission: latestAssessment.submitted_at
      };
    }));
    
    // 2. COMPLETED CYCLES HISTORY (Past performance)
    const completedCyclesHistory = await Promise.all(teamMembers.map(async (member) => {
      const { data: completedCycles } = await supabase
        .from('work_readiness')
        .select('cycle_start, cycle_day, streak_days, cycle_completed, submitted_at')
        .eq('worker_id', member.id)
        .eq('cycle_completed', true)
        .gte('submitted_at', startDate.toISOString())
        .lte('submitted_at', endDate.toISOString())
        .order('submitted_at', { ascending: false });
      
      const cyclesWithKPI = completedCycles?.map(cycle => {
        const completionRate = (cycle.streak_days / 7) * 100;
        const kpi = calculateCompletionRateKPI(completionRate, null, null);
        
        return {
          cycleStart: cycle.cycle_start,
          completedAt: cycle.submitted_at,
          streakDays: cycle.streak_days,
          completionRate: completionRate,
          kpi: kpi
        };
      }) || [];
      
      return {
        workerId: member.id,
        workerName: `${member.first_name} ${member.last_name}`,
        completedCycles: cyclesWithKPI,
        totalCompletedCycles: cyclesWithKPI.length,
        averageKPI: cyclesWithKPI.length > 0 
          ? cyclesWithKPI.reduce((sum, cycle) => sum + cycle.kpi.score, 0) / cyclesWithKPI.length
          : 0
      };
    }));
    
    // 3. TEAM PERFORMANCE SUMMARY (Rolling average)
    const teamPerformanceSummary = {
      totalMembers: teamMembers.length,
      activeMembers: currentCycleStatus.filter(member => member.status !== 'No Cycle Started').length,
      completedCyclesThisPeriod: completedCyclesHistory.reduce((sum, member) => sum + member.totalCompletedCycles, 0),
      averageCyclesPerMember: teamMembers.length > 0 
        ? completedCyclesHistory.reduce((sum, member) => sum + member.totalCompletedCycles, 0) / teamMembers.length
        : 0,
      teamAverageKPI: completedCyclesHistory.length > 0
        ? completedCyclesHistory.reduce((sum, member) => sum + member.averageKPI, 0) / completedCyclesHistory.length
        : 0
    };
    
    // 4. PERFORMANCE TRENDS (Weekly breakdown)
    const performanceTrends = [];
    const weeksBack = Math.ceil(parseInt(timeRange) / 7);
    
    for (let i = 0; i < weeksBack; i++) {
      const weekStart = new Date(endDate);
      weekStart.setDate(endDate.getDate() - (i * 7) - 6);
      const weekEnd = new Date(endDate);
      weekEnd.setDate(endDate.getDate() - (i * 7));
      
      const weekCompletedCycles = completedCyclesHistory.map(member => 
        member.completedCycles.filter(cycle => {
          const cycleDate = new Date(cycle.completedAt);
          return cycleDate >= weekStart && cycleDate <= weekEnd;
        }).length
      );
      
      const weekTotalCycles = weekCompletedCycles.reduce((sum, cycles) => sum + cycles, 0);
      const weekAverageCycles = teamMembers.length > 0 ? weekTotalCycles / teamMembers.length : 0;
      
      performanceTrends.unshift({
        weekLabel: `Week ${weeksBack - i}`,
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
        completedCycles: weekTotalCycles,
        averageCyclesPerMember: Math.round(weekAverageCycles * 100) / 100
      });
    }
    
    res.json({
      success: true,
      data: {
        monitoringDashboard: {
          timeRange: `${timeRange} days`,
          generatedAt: new Date().toISOString(),
          currentCycleStatus: currentCycleStatus,
          completedCyclesHistory: completedCyclesHistory,
          teamPerformanceSummary: teamPerformanceSummary,
          performanceTrends: performanceTrends,
          insights: generateMonitoringInsights(currentCycleStatus, completedCyclesHistory, teamPerformanceSummary)
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching team monitoring dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team monitoring dashboard',
      error: error.message
    });
  }
};

/**
 * Generate monitoring insights for team leaders
 */
const generateMonitoringInsights = (currentCycleStatus, completedCyclesHistory, teamSummary) => {
  const insights = [];
  
  // Current cycle insights
  const inProgressCycles = currentCycleStatus.filter(member => member.status === 'Cycle In Progress').length;
  const completedCycles = currentCycleStatus.filter(member => member.status === 'Cycle Completed').length;
  const noCycleStarted = currentCycleStatus.filter(member => member.status === 'No Cycle Started').length;
  
  if (inProgressCycles > 0) {
    insights.push({
      type: 'info',
      title: 'Active Cycles',
      message: `${inProgressCycles} team members currently have active cycles in progress`,
      data: currentCycleStatus.filter(member => member.status === 'Cycle In Progress')
    });
  }
  
  if (completedCycles > 0) {
    insights.push({
      type: 'success',
      title: 'Recent Completions',
      message: `${completedCycles} team members have completed their cycles`,
      data: currentCycleStatus.filter(member => member.status === 'Cycle Completed')
    });
  }
  
  if (noCycleStarted > 0) {
    insights.push({
      type: 'warning',
      title: 'Inactive Members',
      message: `${noCycleStarted} team members haven't started any cycles yet`,
      data: currentCycleStatus.filter(member => member.status === 'No Cycle Started')
    });
  }
  
  // Performance insights
  if (teamSummary.averageCyclesPerMember > 0) {
    insights.push({
      type: 'info',
      title: 'Team Performance',
      message: `Team averages ${Math.round(teamSummary.averageCyclesPerMember * 100) / 100} completed cycles per member`,
      data: { averageCycles: teamSummary.averageCyclesPerMember }
    });
  }
  
  return insights;
};

// ✅ PHILIPPINE TIME HELPER FUNCTION
const getPhilippineTime = () => {
  // Simple approach: Use current time as is
  // The server should be running in Philippine Time
  return new Date();
};

// ✅ WEEKLY TEAM KPI CALCULATION
const calculateWeeklyTeamKPI = (weeklySubmissionRate, weeklySubmissions, totalMembers) => {
  // Simple percentage-based team rating
  let rating, color, description;
  
  if (weeklySubmissionRate >= 90) {
    rating = 'Excellent';
    color = '#10b981'; // green
    description = `Excellent! ${weeklySubmissions}/${totalMembers} members submitted work readiness this week (${Math.round(weeklySubmissionRate)}%).`;
  } else if (weeklySubmissionRate >= 75) {
    rating = 'Good';
    color = '#3b82f6'; // blue
    description = `Good performance! ${weeklySubmissions}/${totalMembers} members submitted work readiness this week (${Math.round(weeklySubmissionRate)}%).`;
  } else if (weeklySubmissionRate >= 60) {
    rating = 'Average';
    color = '#f59e0b'; // yellow
    description = `Average performance. ${weeklySubmissions}/${totalMembers} members submitted work readiness this week (${Math.round(weeklySubmissionRate)}%).`;
  } else if (weeklySubmissionRate >= 40) {
    rating = 'Needs Improvement';
    color = '#ef4444'; // red
    description = `Needs improvement. Only ${weeklySubmissions}/${totalMembers} members submitted work readiness this week (${Math.round(weeklySubmissionRate)}%).`;
  } else {
    rating = 'Poor';
    color = '#dc2626'; // dark red
    description = `Poor performance. Only ${weeklySubmissions}/${totalMembers} members submitted work readiness this week (${Math.round(weeklySubmissionRate)}%).`;
  }
  
  return {
    rating,
    color,
    description,
    score: Math.round(weeklySubmissionRate),
    completionRate: weeklySubmissionRate,
    maxRate: 100,
    weeklySubmissions,
    totalMembers,
    weeklySubmissionRate: Math.round(weeklySubmissionRate)
  };
};

// ✅ IMPROVED TEAM GRADING LOGIC (LEGACY - NOT USED)
const calculateImprovedTeamGrade = (teamMetrics, baseTeamKPI) => {
  const { totalMembers, activeMembers, cycleCompletionRate } = teamMetrics;
  
  // Calculate participation rate
  const participationRate = totalMembers > 0 ? (activeMembers / totalMembers) * 100 : 0;
  
  // Calculate participation penalty (reduced penalty for better team grades)
  const participationPenalty = Math.max(0, (100 - participationRate) * 0.5); // 50% penalty instead of 100%
  
  // Apply penalty to base team KPI score
  const adjustedScore = Math.max(0, baseTeamKPI.score - participationPenalty);
  
  // Debug logging
  console.log('🧮 TEAM GRADING CALCULATION:');
  console.log(`👥 Total Members: ${totalMembers}`);
  console.log(`✅ Active Members: ${activeMembers}`);
  console.log(`📈 Cycle Completion Rate: ${cycleCompletionRate}%`);
  console.log(`🎯 Base Team Score: ${baseTeamKPI.score}`);
  console.log(`📊 Participation Rate: ${participationRate.toFixed(1)}%`);
  console.log(`⚠️ Participation Penalty: ${participationPenalty.toFixed(1)} points`);
  console.log(`🏆 Final Adjusted Score: ${adjustedScore.toFixed(1)}`);
  
  // Determine new rating based on adjusted score
  let rating, color, description;
  
  if (adjustedScore >= 80) {
    rating = 'Excellent';
    color = '#10b981'; // green
    description = `Excellent team performance! ${Math.round(participationRate)}% participation with strong cycle completion.`;
  } else if (adjustedScore >= 60) {
    rating = 'Good';
    color = '#3b82f6'; // blue
    description = `Good team performance. ${Math.round(participationRate)}% participation with solid cycle completion.`;
  } else if (adjustedScore >= 40) {
    rating = 'Average';
    color = '#f59e0b'; // yellow
    description = `Average team performance. ${Math.round(participationRate)}% participation needs improvement.`;
  } else if (adjustedScore >= 20) {
    rating = 'Needs Improvement';
    color = '#ef4444'; // red
    description = `Team needs improvement. Only ${Math.round(participationRate)}% participation.`;
  } else {
    rating = 'Poor';
    color = '#dc2626'; // dark red
    description = `Poor team performance. Very low participation at ${Math.round(participationRate)}%.`;
  }
  
  return {
    rating,
    color,
    description,
    score: Math.round(adjustedScore),
    completionRate: cycleCompletionRate,
    maxRate: 100,
    participationRate: Math.round(participationRate),
    participationPenalty: Math.round(participationPenalty),
    baseScore: baseTeamKPI.score,
    baseRating: baseTeamKPI.rating, // Show original rating before penalty
    adjustedRating: rating // Show final rating after penalty
  };
};

const getTeamWeeklyKPI = async (req, res) => {
  try {
    console.log('🎯 getTeamWeeklyKPI called with:', req.query);
    console.log('🎯 Request headers:', req.headers);
    console.log('🎯 Request method:', req.method);
    console.log('🎯 Request URL:', req.url);
    
    const teamLeaderId = req.query.teamLeaderId;
    const { weekOffset = 0, teamFilter } = req.query;
    
    if (!teamLeaderId) {
      console.log('❌ No team leader ID provided');
      return res.status(400).json({
        success: false,
        message: 'Team Leader ID is required'
      });
    }
    
    // Quick test response to see if API is working
    console.log('✅ API is being called! Team Leader ID:', teamLeaderId);
    
    console.log('✅ Team Leader ID:', teamLeaderId);
    
    // Calculate target week using automatic current date
    const weekInfo = getWeekComparison(new Date());
    
    // Get the team leader's managed teams first
    console.log('🔍 Querying team leader info:', teamLeaderId);
    const { data: teamLeader, error: teamLeaderError } = await supabase
      .from('users')
      .select('managed_teams, team')
      .eq('id', teamLeaderId)
      .eq('role', 'team_leader')
      .single();
    
    if (teamLeaderError) {
      console.log('❌ Team leader query error:', teamLeaderError);
      throw teamLeaderError;
    }
    
    console.log('✅ Team leader managed teams:', teamLeader?.managed_teams);
    console.log('✅ Team leader team:', teamLeader?.team);
    console.log('👤 Team Leader Details:', {
      id: teamLeaderId,
      managed_teams: teamLeader?.managed_teams,
      team: teamLeader?.team
    });
    
    // ✅ ENFORCE ONE-TO-ONE RELATIONSHIP: Each team leader manages only one team
    let teamsToQuery = [];
    if (teamLeader?.team) {
      // Use only the team leader's primary team (one-to-one relationship)
      teamsToQuery = [teamLeader.team];
      console.log('✅ Using primary team for one-to-one relationship:', teamLeader.team);
    } else {
      // If no team info at all, return empty result
      console.log('⚠️ No team information found for team leader');
      return res.json({
        success: true,
        data: {
          teamKPI: {
            weekLabel: weekInfo.currentWeek.weekLabel,
            overallTeamKPI: calculateKPI(0),
            teamOverview: {
              totalMembers: 0,
              activeMembers: 0,
              averageCompletion: 0,
              teamKPI: 'No Team Data'
            },
            individualKPIs: [],
            teamGoalsSummary: [],
            performanceInsights: []
          }
        }
      });
    }
    
    // Get team members whose teams are in the teams to query
    console.log('🔍 Querying team members for teams:', teamsToQuery);
    const { data: teamMembers, error: teamMembersError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, team')
      .eq('role', 'worker')
      .in('team', teamsToQuery);
    
    if (teamMembersError) {
      console.log('❌ Team members query error:', teamMembersError);
      throw teamMembersError;
    }
    
    console.log('✅ Found team members:', teamMembers?.length || 0);
    console.log('🔍 Team Members Details:', teamMembers?.map(m => ({
      id: m.id,
      name: `${m.first_name} ${m.last_name}`,
      email: m.email,
      team: m.team
    })));

    // Check if samward@gmail.com is in the team
    const samwardMember = teamMembers?.find(m => m.email === 'samward@gmail.com');
    if (samwardMember) {
      console.log('✅ Found samward@gmail.com in team:', samwardMember);
    } else {
      console.log('❌ samward@gmail.com NOT found in team members');
      console.log('🔍 Available emails:', teamMembers?.map(m => m.email));
    }

    const teamMemberIds = teamMembers?.map(member => member.id) || [];
    
    if (teamMemberIds.length === 0) {
      return res.json({
        success: true,
        data: {
          teamKPI: {
            weekLabel: weekInfo.currentWeek.weekLabel,
            overallTeamKPI: calculateWeeklyTeamKPI(0, 0, 0),
            teamOverview: {
              totalMembers: 0,
              weeklySubmissions: 0,
              weeklySubmissionRate: 0,
              teamKPI: 'No Team Data',
              weekStart: new Date().toISOString().split('T')[0],
              weekEnd: new Date().toISOString().split('T')[0]
            },
            individualKPIs: [],
            teamGoalsSummary: [],
            performanceInsights: []
          }
        }
      });
    }

    // Calculate expected working days in the week
    const workingDaysCount = getWorkingDaysCount(weekInfo.currentWeek.startDate, weekInfo.currentWeek.endDate);
    
    // Get weekly assessments for all team members
    const { data: assessments, error: assessmentsError } = await supabase
      .from('work_readiness')
      .select(`
        *,
        worker:users!work_readiness_worker_id_fkey(first_name, last_name, email, team)
      `)
      .in('worker_id', teamMemberIds)
      .gte('submitted_at', weekInfo.currentWeek.startDate)
      .lte('submitted_at', weekInfo.currentWeek.endDate);

    if (assessmentsError) {
      throw assessmentsError;
    }

    // ✅ FIXED: Calculate individual KPIs based on each worker's 7-day cycle
    const individualKPIs = await Promise.all(teamMembers.map(async (member) => {
      try {
        console.log(`🔍 Processing worker: ${member.first_name} ${member.last_name} (${member.id})`);
        console.log(`🔍 Worker team: ${member.team}`);
        
        // Get latest assessment to find individual cycle start
      const { data: latestAssessment, error: cycleError } = await supabase
        .from('work_readiness')
        .select('cycle_start, cycle_day, streak_days, cycle_completed')
        .eq('worker_id', member.id)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .single();

      if (cycleError && cycleError.code !== 'PGRST116') {
        console.log('⚠️ No cycle data for worker:', member.id);
        return {
          workerId: member.id,
          workerName: `${member.first_name} ${member.last_name}`,
          email: member.email,
          team: member.team,
          weeklyKPIMetrics: {
            goalType: 'Work Readiness Cycle',
            completedDays: 0,
            totalWorkDays: 7,
            completionRate: 0,
            kpi: calculateCompletionRateKPI(0, null, 0)
          },
          readinessBreakdown: { fit: 0, minor: 0, not_fit: 0 },
          averageFatigueLevel: 0,
          streakDays: 0,
          missedDays: 0
        };
      }

      if (!latestAssessment) {
        console.log('⚠️ No assessments for worker:', member.id);
        return {
          workerId: member.id,
          workerName: `${member.first_name} ${member.last_name}`,
          email: member.email,
          team: member.team,
          weeklyKPIMetrics: {
            goalType: 'Work Readiness Cycle',
            completedDays: 0,
            totalWorkDays: 7,
            completionRate: 0,
            kpi: calculateCompletionRateKPI(0, null, 0)
          },
          readinessBreakdown: { fit: 0, minor: 0, not_fit: 0 },
          averageFatigueLevel: 0,
          streakDays: 0,
          missedDays: 0
        };
      }

               // ✅ Use individual cycle dates (not calendar week)
               const cycleStart = new Date(latestAssessment.cycle_start);
               const cycleEnd = new Date(cycleStart);
               cycleEnd.setDate(cycleStart.getDate() + 6); // 7-day cycle
               cycleEnd.setHours(23, 59, 59, 999); // Include the full last day

      console.log(`🔍 Worker ${member.first_name} cycle:`, {
        cycleStart: cycleStart.toISOString().split('T')[0],
        cycleEnd: cycleEnd.toISOString().split('T')[0],
        currentDay: latestAssessment.cycle_day,
        streakDays: latestAssessment.streak_days
      });

      // Get assessments from individual cycle (not calendar week)
      const { data: cycleAssessments, error: cycleAssessmentsError } = await supabase
        .from('work_readiness')
        .select('*')
        .eq('worker_id', member.id)
        .gte('submitted_at', cycleStart.toISOString())
        .lte('submitted_at', cycleEnd.toISOString())
        .order('submitted_at', { ascending: true });

      if (cycleAssessmentsError) {
        console.error('Error fetching cycle assessments for worker:', member.id, cycleAssessmentsError);
        throw cycleAssessmentsError;
      }

      // Calculate completion rate based on individual 7-day cycle
      const submittedDays = new Set(cycleAssessments?.map(a => 
        new Date(a.submitted_at).toISOString().split('T')[0]
      ) || []);
      
      const completedCount = submittedDays.size;
      const completionRate = (completedCount / 7) * 100; // 7-day cycle, not working days
      
      console.log(`📊 Worker ${member.first_name} cycle stats:`, {
        completedDays: completedCount,
        totalCycleDays: 7,
        completionRate: Math.round(completionRate),
        cycleCompleted: latestAssessment.cycle_completed,
        cycleAssessmentsCount: cycleAssessments?.length || 0,
        submittedDays: Array.from(submittedDays)
      });

      // Calculate KPI based on individual cycle completion
      const kpi = calculateCompletionRateKPI(completionRate, latestAssessment.cycle_day, cycleAssessments?.length || 0);
      
      // Calculate readiness statistics for the individual cycle
      const readinessStats = cycleAssessments?.reduce((stats, assessment) => {
        stats[assessment.readiness_level] = (stats[assessment.readiness_level] || 0) + 1;
        return stats;
      }, {}) || {};

      // Calculate average trends from cycle assessments
      const avgFatigueLevel = cycleAssessments?.length > 0 
        ? cycleAssessments.reduce((sum, a) => sum + a.fatigue_level, 0) / cycleAssessments.length
        : 0;

      // Calculate missed days in current cycle
      const missedDays = Math.max(0, latestAssessment.cycle_day - completedCount);

      return {
        workerId: member.id,
        workerName: `${member.first_name} ${member.last_name}`,
        email: member.email,
        team: member.team,
        weeklyKPIMetrics: {
          goalType: 'Work Readiness Cycle',
          completedDays: completedCount,
          totalWorkDays: 7, // Always 7 days for individual cycle
          completionRate: Math.round(completionRate),
          kpi: kpi
        },
        readinessBreakdown: {
          fit: readinessStats.fit || 0,
          minor: readinessStats.minor || 0,
          not_fit: readinessStats.not_fit || 0
        },
        averageFatigueLevel: Math.round(avgFatigueLevel * 10) / 10,
        lastSubmission: cycleAssessments?.length > 0 
          ? cycleAssessments[cycleAssessments.length - 1].submitted_at
          : null,
        streakDays: latestAssessment.streak_days || 0,
        missedDays: missedDays,
        cycleInfo: {
          cycleStart: cycleStart.toISOString().split('T')[0],
          cycleEnd: cycleEnd.toISOString().split('T')[0],
          currentDay: latestAssessment.cycle_day,
          cycleCompleted: latestAssessment.cycle_completed
        }
      };
      } catch (error) {
        console.error(`❌ Error processing worker ${member.first_name} ${member.last_name}:`, error);
        // Return default values for this worker
        return {
          workerId: member.id,
          workerName: `${member.first_name} ${member.last_name}`,
          email: member.email,
          team: member.team,
          weeklyKPIMetrics: {
            goalType: 'Work Readiness Cycle',
            completedDays: 0,
            totalWorkDays: 7,
            completionRate: 0,
            kpi: calculateCompletionRateKPI(0, null, 0)
          },
          readinessBreakdown: { fit: 0, minor: 0, not_fit: 0 },
          averageFatigueLevel: 0,
          streakDays: 0,
          missedDays: 0
        };
      }
    }));

    // ✅ NEW WEEKLY-BASED TEAM PERFORMANCE SYSTEM
    // Calculate how many members submitted work readiness THIS WEEK
    // Use automatic current date - no manual declaration needed
    
    // Calculate current week (Sunday to Saturday) - AUTOMATIC DATE
    const currentWeekStart = new Date();
    const dayOfWeek = currentWeekStart.getDay(); // 0 = Sunday, 1 = Monday, etc.
    currentWeekStart.setDate(currentWeekStart.getDate() - dayOfWeek); // Go back to Sunday
    currentWeekStart.setHours(0, 0, 0, 0);
    
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6); // Add 6 days to get Saturday
    currentWeekEnd.setHours(23, 59, 59, 999);
    
    // Calculate TODAY's submissions using the same logic as TeamLeaderMonitoring
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    // Alternative approach: Use date string comparison for today
    const todayDateString = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    console.log('📅 Current Week Range:', currentWeekStart.toISOString(), 'to', currentWeekEnd.toISOString());
    console.log('📅 Current Week Start Local:', currentWeekStart.toLocaleDateString('en-CA'));
    console.log('📅 Current Week End Local:', currentWeekEnd.toLocaleDateString('en-CA'));
    console.log('📅 Today Range:', todayStart.toISOString(), 'to', todayEnd.toISOString());
    console.log('📅 Current Date:', new Date().toISOString());
    console.log('📅 Today Date String:', new Date().toISOString().split('T')[0]);
    console.log('📅 Today Start:', todayStart.toISOString());
    console.log('📅 Today End:', todayEnd.toISOString());
    console.log('👥 Team Members Found:', teamMembers?.length || 0);
    console.log('🔍 Team Members:', teamMembers?.map(m => `${m.first_name} ${m.last_name} (${m.id})`));
    
    // Test: Check if samward@gmail.com is in team (using existing samwardMember from above)
    if (samwardMember) {
      console.log('✅ Found samward@gmail.com in team:', samwardMember);
    } else {
      console.log('❌ samward@gmail.com NOT found in team members');
      console.log('🔍 Available emails:', teamMembers?.map(m => m.email));
    }
    
    // Count members who submitted work readiness TODAY
    const todaySubmissions = await Promise.all(teamMembers.map(async (member) => {
      // Use the same logic as TeamLeaderMonitoring for today's submissions
      const { data: todayAssessments, error: todayError } = await supabase
        .from('work_readiness')
        .select('id, submitted_at')
        .eq('worker_id', member.id)
        .gte('submitted_at', todayStart.toISOString())
        .lte('submitted_at', todayEnd.toISOString())
        .limit(1);
      
      if (todayError) {
        console.log(`❌ Error checking today's submissions for ${member.first_name}:`, todayError);
        return false;
      }
      
      if (todayAssessments && todayAssessments.length > 0) {
        console.log(`✅ ${member.first_name} submitted today:`, todayAssessments[0].submitted_at);
        return true;
      }
      
      // Special debugging for samward
      if (member.email === 'samward@gmail.com') {
        console.log(`🔍 SAMWARD TODAY CHECK:`);
        console.log(`📅 Today Start: ${todayStart.toISOString()}`);
        console.log(`📅 Today End: ${todayEnd.toISOString()}`);
        console.log(`📅 Results:`, todayAssessments);
      }
      
      return false;
    }));
    
    const todaySubmissionCount = todaySubmissions.filter(submitted => submitted).length;
    const todaySubmissionRate = teamMembers.length > 0 ? (todaySubmissionCount / teamMembers.length) * 100 : 0;
    
    console.log('📊 Today Submissions Check:', todaySubmissions.map((submitted, index) => ({
      member: `${teamMembers[index].first_name} ${teamMembers[index].last_name}`,
      submitted: submitted
    })));
    console.log('✅ Today Submissions:', todaySubmissionCount, `(${Math.round(todaySubmissionRate)}%)`);
    
    // Debug: Check recent work readiness submissions
    const { data: recentSubmissions, error: recentError } = await supabase
      .from('work_readiness')
      .select('worker_id, submitted_at')
      .order('submitted_at', { ascending: false })
      .limit(5);
    
    if (recentError) {
      console.log('❌ Error fetching recent submissions:', recentError);
    } else {
      console.log('📋 Recent Work Readiness Submissions:', recentSubmissions);
    }
    
    // Debug: Check samward@gmail.com submissions specifically
    if (samwardMember) {
      const { data: samwardSubmissions, error: samwardError } = await supabase
        .from('work_readiness')
        .select('id, submitted_at, worker_id')
        .eq('worker_id', samwardMember.id)
        .order('submitted_at', { ascending: false })
        .limit(5);
      
      if (samwardError) {
        console.log('❌ Error fetching samward submissions:', samwardError);
      } else {
        console.log('📋 Samward Submissions:', samwardSubmissions);
        
        // Check if any submissions are from this week
        const thisWeekSubmissions = samwardSubmissions?.filter(sub => {
          const submissionDate = new Date(sub.submitted_at);
          return submissionDate >= currentWeekStart && submissionDate <= currentWeekEnd;
        });
        
        console.log('📅 Samward This Week Submissions:', thisWeekSubmissions);
        
        // Check if any submissions are from today
        const todaySubmissions = samwardSubmissions?.filter(sub => {
          const submissionDate = new Date(sub.submitted_at);
          const submissionDateString = submissionDate.toISOString().split('T')[0];
          return submissionDateString === todayDateString;
        });
        
        console.log('📅 Samward Today Submissions:', todaySubmissions);
        console.log('📅 Today Date String:', todayDateString);
        console.log('📅 Samward Submission Dates:', samwardSubmissions?.map(s => s.submitted_at.split('T')[0]));
      }
    }
    
    // Count members who submitted work readiness this week
    const weeklySubmissions = await Promise.all(teamMembers.map(async (member) => {
      // Check if member has any work readiness submission this week
      const { data: weeklyAssessments } = await supabase
        .from('work_readiness')
        .select('id')
        .eq('worker_id', member.id)
        .gte('submitted_at', currentWeekStart.toISOString())
        .lte('submitted_at', currentWeekEnd.toISOString())
        .limit(1);
      
      return weeklyAssessments && weeklyAssessments.length > 0;
    }));
    
    const weeklySubmissionCount = weeklySubmissions.filter(submitted => submitted).length;
    
    console.log('📊 Weekly Submissions Check:', weeklySubmissions.map((submitted, index) => ({
      member: `${teamMembers[index].first_name} ${teamMembers[index].last_name}`,
      submitted: submitted
    })));
    console.log('✅ Total Weekly Submissions:', weeklySubmissionCount);
    
    // Calculate weekly submission rate
    const weeklySubmissionRate = teamMembers.length > 0 ? (weeklySubmissionCount / teamMembers.length) * 100 : 0;
    
    // Calculate team KPI based on weekly submissions (simple percentage)
    const teamKPI = calculateWeeklyTeamKPI(weeklySubmissionRate, weeklySubmissionCount, teamMembers.length);
    
    // Additional team metrics for comprehensive view
    const teamMetrics = {
      weeklySubmissions: weeklySubmissionCount,
      totalMembers: teamMembers.length,
      weeklySubmissionRate: Math.round(weeklySubmissionRate),
      weekStart: currentWeekStart.toLocaleDateString('en-CA'), // Use local date format
      weekEnd: currentWeekEnd.toLocaleDateString('en-CA'), // Use local date format
      todaySubmissions: todaySubmissionCount,
      todaySubmissionRate: Math.round(todaySubmissionRate),
      todayDate: new Date().toLocaleDateString('en-CA') // Use local date format
    };
    
    // Debug logging to understand team performance
    console.log('🔍 WEEKLY TEAM PERFORMANCE DEBUG:');
    console.log('📊 Team Metrics:', teamMetrics);
    console.log('🏆 Weekly Team KPI:', teamKPI);
    console.log('📈 Weekly Submission Rate:', weeklySubmissionRate);
    console.log('📈 Weekly Submission Count:', weeklySubmissionCount);
    console.log('👥 Total Team Members:', teamMembers.length);
    
    // Team goals summary - based on individual 7-day cycles
    const teamGoalsSummary = [
      {
        goalType: 'Work Readiness Cycle Completion',
        target: '7-day cycles per worker',
        teamActual: individualKPIs.reduce((sum, member) => sum + member.weeklyKPIMetrics.completedDays, 0),
        teamTarget: 7 * teamMembers.length, // 7 days × number of workers
        achievementRate: teamMembers.length > 0 
          ? Math.round((individualKPIs.reduce((sum, member) => sum + member.weeklyKPIMetrics.completedDays, 0) / (7 * teamMembers.length)) * 100)
          : 0
      }
    ];

    // Performance insights
    const performanceInsights = generatePerformanceInsights(individualKPIs, teamKPI);

    // Final response debugging
    const responseData = {
        teamKPI: {
          weekLabel: weekInfo.currentWeek.weekLabel,
          overallTeamKPI: teamKPI,
          teamOverview: {
            totalMembers: teamMembers.length,
          weeklySubmissions: teamMetrics.weeklySubmissions,
          weeklySubmissionRate: teamMetrics.weeklySubmissionRate,
          teamKPI: teamKPI.rating,
          weekStart: teamMetrics.weekStart,
          weekEnd: teamMetrics.weekEnd,
          todaySubmissions: teamMetrics.todaySubmissions,
          todaySubmissionRate: teamMetrics.todaySubmissionRate,
          todayDate: teamMetrics.todayDate
          },
          individualKPIs: individualKPIs,
          teamGoalsSummary: teamGoalsSummary,
          performanceInsights: performanceInsights,
          weeklyComparison: await getTeamWeeklyComparison(teamLeaderId, weekInfo)
        }
    };
    
    console.log('📤 FINAL RESPONSE DATA:', JSON.stringify(responseData, null, 2));
    
    res.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('❌ Error fetching team weekly KPI:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Request query:', req.query);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch team weekly KPI',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Get performance trend over multiple weeks
 */
const getPerformanceTrend = async (workerId, weeksBack = 4) => {
  try {
    const trends = [];
    const today = new Date();
    
    for (let i = 0; i < weeksBack; i++) {
      const weekDate = new Date(today);
      weekDate.setDate(today.getDate() - (i * 7));
      
      const weekInfo = getWeekDateRange(weekDate);
      const workingDaysCount = getWorkingDaysCount(weekInfo.startDate, weekInfo.endDate);
      
      const { data: assessments } = await supabase
        .from('work_readiness')
        .select('*')
        .eq('worker_id', workerId)
        .gte('submitted_at', weekInfo.startDate)
        .lte('submitted_at', weekInfo.endDate);
      
      const completedCount = [...new Set(assessments?.map(a => 
        new Date(a.submitted_at).toISOString().split('T')[0]
      ) || [])].length;
      
      const completionRate = workingDaysCount > 0 ? (completedCount / workingDaysCount) * 100 : 0;
      
      trends.unshift({
        weekLabel: weekInfo.weekLabel,
        completionRate: Math.round(completionRate),
        kpiRating: calculateCompletionRateKPI(completionRate, null, null).rating,
        completedDays: completedCount,
        totalDays: workingDaysCount
      });
    }
    
    return trends;
  } catch (error) {
    console.error('Error calculating performance trend:', error);
    return [];
  }
};

/**
 * Get team weekly comparison data
 */
const getTeamWeeklyComparison = async (teamLeaderId, weekInfo) => {
  try {
    // Get previous week data
    const prevWeekStart = new Date(weekInfo.previousWeek.startDate);
    const prevWeekEnd = new Date(weekInfo.previousWeek.endDate);
    
    const { data: teamMembers } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'worker')
      .eq('team_leader_id', teamLeaderId);
    
    const teamMemberIds = teamMembers?.map(member => member.id) || [];
    
    if (teamMemberIds.length === 0) return null;
    
    // Current week assessments
    const { data: currentWeekAssessments } = await supabase
      .from('work_readiness')
      .select('*')
      .in('worker_id', teamMemberIds)
      .gte('submitted_at', weekInfo.currentWeek.startDate)
      .lte('submitted_at', weekInfo.currentWeek.endDate);
    
    // Previous week assessments
    const { data: previousWeekAssessments } = await supabase
      .from('work_readiness')
      .select('*')
      .in('worker_id', teamMemberIds)
      .gte('submitted_at', prevWeekStart.toISOString())
      .lte('submitted_at', prevWeekEnd.toISOString());
    
    const currentWorkingDays = getWorkingDaysCount(weekInfo.currentWeek.startDate, weekInfo.currentWeek.endDate);
    const prevWorkingDays = getWorkingDaysCount(prevWeekStart.toISOString(), prevWeekEnd.toISOString());
    
    const currentCompleted = [...new Set(currentWeekAssessments?.map(a => a.worker_id) || [])].length;
    const previousCompleted = [...new Set(previousWeekAssessments?.map(a => a.worker_id) || [])].length;
    
    const currentCompletionRate = teamMemberIds.length > 0 ? (currentCompleted / teamMemberIds.length) * 100 : 0;
    const prevCompletionRate = teamMemberIds.length > 0 ? (previousCompleted / teamMemberIds.length) * 100 : 0;
    
    return {
      previousWeek: {
        weekLabel: weekInfo.previousWeek.weekLabel,
        completionRate: Math.round(prevCompletionRate),
        kpiRating: calculateCompletionRateKPI(prevCompletionRate, null, null).rating
      },
      currentWeek: {
        weekLabel: weekInfo.currentWeek.weekLabel,
        completionRate: Math.round(currentCompletionRate),
        kpiRating: calculateCompletionRateKPI(currentCompletionRate, null, null).rating
      },
      improvement: Math.round(currentCompletionRate - prevCompletionRate),
      improvementTrend: currentCompletionRate > prevCompletionRate ? 'improving' : currentCompletionRate < prevCompletionRate ? 'declining' : 'stable'
    };
    
  } catch (error) {
    console.error('Error calculating team weekly comparison:', error);
    return null;
  }
};

/**
 * Generate performance insights for team dashboard
 */
const generatePerformanceInsights = (individualKPIs, teamKPI) => {
  const insights = [];
  
  // Top performers
  const topPerformers = individualKPIs
    .filter(member => member.weeklyKPIMetrics.kpi.rating === 'Excellent')
    .slice(0, 3);
  
  if (topPerformers.length > 0) {
    insights.push({
      type: 'success',
      title: 'Excellent Performers',
      message: `Congratulations to ${topPerformers.map(m => m.workerName).join(', ')} for achieving excellent KPI ratings this week!`,
      data: topPerformers.map(m => ({ name: m.workerName, kpi: m.weeklyKPIMetrics.kpi.rating }))
    });
  }
  
  // Members needing attention
  const needsAttention = individualKPIs
    .filter(member => member.weeklyKPIMetrics.kpi.rating === 'Needs Improvement');
  
  if (needsAttention.length > 0) {
    insights.push({
      type: 'warning',
      title: 'Members Needing Support',
      message: `${needsAttention.length} team member(s) need additional support to improve their performance.`,
      data: needsAttention.map(m => ({ name: m.workerName, kpi: m.weeklyKPIMetrics.kpi.rating }))
    });
  }
  
  // Team overall performance based on fair metrics
  const overallPerformance = teamKPI.rating;
  
  if (overallPerformance === 'Excellent') {
    insights.push({
      type: 'success',
      title: 'Outstanding Team Performance',
      message: 'Excellent! Most team members have completed their 7-day cycles. Great consistency across different schedules!',
      data: [{ teamKPI: overallPerformance }]
    });
  } else if (overallPerformance === 'Good') {
    insights.push({
      type: 'success',
      title: 'Good Team Performance',
      message: 'Good progress! Most team members are completing their cycles. Keep encouraging consistency.',
      data: [{ teamKPI: overallPerformance }]
    });
  } else if (overallPerformance === 'Average') {
    insights.push({
      type: 'warning',
      title: 'Average Team Performance',
      message: 'Team performance is average. Focus on supporting members who are struggling with their cycles.',
      data: [{ teamKPI: overallPerformance }]
    });
  } else if (overallPerformance === 'Needs Improvement') {
    insights.push({
      type: 'error',
      title: 'Team Performance Needs Attention',
      message: 'Team performance needs immediate attention. Many members are not completing their 7-day cycles.',
      data: [{ teamKPI: overallPerformance }]
    });
  } else if (overallPerformance === 'Not Started') {
    insights.push({
      type: 'info',
      title: 'Team Getting Started',
      message: 'Most team members are just beginning their work readiness journey. Focus on engagement and getting everyone started.',
      data: [{ teamKPI: overallPerformance }]
    });
  }
  
  // Consistency insight
  const highPerformers = individualKPIs.filter(m => ['Excellent', 'Good'].includes(m.weeklyKPIMetrics.kpi.rating)).length;
  const consistencyRate = individualKPIs.length > 0 ? (highPerformers / individualKPIs.length) * 100 : 0;
  
  if (consistencyRate >= 80) {
    insights.push({
      type: 'info',
      title: 'High Consistency',
      message: `${Math.round(consistencyRate)}% of team members are performing well or excellently.`,
      data: [{ consistencyRate: Math.round(consistencyRate) }]
    });
  }
  
  return insights;
};

/**
 * Handle Login-Triggered 7-Day Cycle for Workers
 * @route POST /api/goal-kpi/login-cycle
 * @access Worker
 */
const handleLogin = async (req, res) => {
  try {
    console.log('🚀 HANDLE LOGIN CALLED - NEW VERSION!');
    const { workerId } = req.body;
    
    if (!workerId) {
      return res.status(400).json({
        success: false,
        message: 'Worker ID is required'
      });
    }
    
    console.log('🔍 About to query users table for workerId:', workerId);
    
    // Check if user is WORKER role
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', workerId)
      .single();
    
    console.log('🔍 User query result:', { user, userError });
    
    if (userError) {
      console.log('❌ User query error:', userError);
      throw userError;
    }
    
    // Only process WORKER role
    if (user.role !== 'worker') {
      return res.json({
        success: true,
        message: "No cycle needed for this role",
        cycle: null
      });
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    // Get the last login from authentication_logs (simplified)
    const { data: lastLoginRecord, error: loginError } = await supabase
      .from('authentication_logs')
      .select('created_at')
      .eq('user_id', workerId)
      .eq('action', 'login')
      .eq('success', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    console.log('🔍 Backend Debug - lastLoginRecord:', lastLoginRecord);
    console.log('🔍 Backend Debug - loginError:', loginError);
    
    // If no login record found, treat as first time login
    const lastLogin = lastLoginRecord?.created_at?.split('T')[0] || null;
    console.log('🔍 Backend Debug - lastLogin date:', lastLogin);
    console.log('🔍 Backend Debug - today:', today);
    
    // Check if there's an active cycle in work_readiness
    const { data: latestAssessment, error: assessmentError } = await supabase
      .from('work_readiness')
      .select('cycle_start, cycle_day, streak_days, cycle_completed, submitted_at')
      .eq('worker_id', workerId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .single();
    
    console.log('🔍 Backend Debug - latestAssessment:', latestAssessment);
    console.log('🔍 Backend Debug - assessmentError:', assessmentError);
    
    if (assessmentError && assessmentError.code !== 'PGRST116') {
      throw assessmentError;
    }
    
    // FIRST: Check if no assessments exist (FIRST TIME LOGIN)
    if (!latestAssessment) {
      console.log('🎉 FIRST TIME LOGIN - No assessments found!');
      console.log('🎉 Last login record:', lastLoginRecord);
      console.log('🎉 Last login date:', lastLogin);
      // No assessments at all - first time login
        
      return res.json({
        success: true,
        message: "Welcome! Your 7-day Work Readiness cycle has started.",
        cycle: {
          cycle_start: today,
          current_day: 1,
          streak_days: 0,
          cycle_completed: false
        },
        day: 1,
        isFirstTimeLogin: true  // Flag for first time login
      });
    }
    
    // SPECIAL CASE: Check if this is the very first login (no login records)
    if (!lastLoginRecord || loginError?.code === 'PGRST116') {
      console.log('🎉 VERY FIRST LOGIN - No login records found!');
      console.log('🎉 Login error:', loginError);
      // This is the very first login ever
        
      return res.json({
        success: true,
        message: "Welcome! Your 7-day Work Readiness cycle has started.",
        cycle: {
          cycle_start: today,
          current_day: 1,
          streak_days: 0,
          cycle_completed: false
        },
        day: 1,
        isFirstTimeLogin: true  // Flag for first time login
      });
    }
    
    // SECOND: Check if cycle exists and is completed
    if (latestAssessment?.cycle_completed) {
      // Cycle completed - don't auto-start new one
      // Note: We don't update last_login since the column doesn't exist
        
      return res.json({
        success: true,
        message: "Cycle completed! Login again to start a new 7-day cycle.",
        cycle: {
          cycle_start: null,
          current_day: 0,
          streak_days: 0,
          cycle_completed: true
        },
        day: 0,
        cycleCompleted: true,
        needsNewLogin: true
      });
    }
    
    // THIRD: Check if missed a day (cycle broken) - using login data
    if (latestAssessment?.cycle_start && lastLogin !== today) {
      console.log('🔄 MISSED DAY - Cycle broken, starting new one');
      console.log('🔄 Last login:', lastLogin, 'Today:', today);
      // Missed day - reset cycle
        
      return res.json({
        success: true,
        message: "A new cycle has started.",
        cycle: {
          cycle_start: today,
          current_day: 1,
          streak_days: 1,  // Fixed: Should be 1, not 0
          cycle_completed: false
        },
        day: 1,
        isCycleReset: true  // Flag for cycle reset
      });
    }
    
    // FOURTH: Check if cycle was completed and needs new login to start
    if (latestAssessment?.cycle_completed && lastLogin !== today) {
      console.log('🎉 NEW CYCLE AFTER COMPLETION');
      console.log('🎉 Last login:', lastLogin, 'Today:', today);
      // Previous cycle completed, now starting new one (NEW CYCLE AFTER COMPLETION)
        
      return res.json({
        success: true,
        message: "Welcome! Your new 7-day Work Readiness cycle has started.",
        cycle: {
          cycle_start: today,
          current_day: 1,
          streak_days: 0,
          cycle_completed: false
        },
        day: 1,
        isNewCycleStart: true  // Flag for new cycle start
      });
    }
    
    // FIFTH: Check if no cycle start (shouldn't happen if latestAssessment exists)
    if (!latestAssessment?.cycle_start) {
      console.log('🎉 NO CYCLE START - Starting new one');
      // No existing cycle - start new one (FIRST TIME LOGIN)
      // Note: We don't update last_login since the column doesn't exist
        
      return res.json({
        success: true,
        message: "Welcome! Your 7-day Work Readiness cycle has started.",
        cycle: {
          cycle_start: today,
          current_day: 1,
          streak_days: 0,
          cycle_completed: false
        },
        day: 1,
        isFirstTimeLogin: true  // Flag for first time login
      });
    }
    
    // Continue existing cycle
    const currentDay = latestAssessment.cycle_day || 1;
    console.log('📝 CONTINUING EXISTING CYCLE - Day', currentDay);
    console.log('📝 Last login:', lastLogin, 'Today:', today);
    // Note: We don't update last_login since the column doesn't exist
    
    return res.json({
      success: true,
      message: `Continue your cycle! Day ${currentDay} of 7.`,
      cycle: {
        cycle_start: latestAssessment.cycle_start,
        current_day: currentDay,
        streak_days: latestAssessment.streak_days || 0,
        cycle_completed: latestAssessment.cycle_completed || false
      },
      day: currentDay
    });
    
  } catch (error) {
    console.error('❌ Error handling login cycle:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error message:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to start cycle',
      error: error.message
    });
  }
};

/**
 * Handle Work Readiness Assessment Submission and Update Cycle
 * @route POST /api/goal-kpi/submit-assessment
 * @access Worker
 */
const handleAssessmentSubmission = async (req, res) => {
  try {
    const { workerId, assessmentData } = req.body;
    
    if (!workerId) {
      return res.status(400).json({
        success: false,
        message: 'Worker ID is required'
      });
    }
    
    // Get worker info
    const { data: worker, error: workerError } = await supabase
      .from('users')
      .select('role')
      .eq('id', workerId)
      .eq('role', 'worker')
      .single();
    
    if (workerError || !worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    // Get latest assessment to check cycle status
    const { data: latestAssessment, error: assessmentError } = await supabase
      .from('work_readiness')
      .select('cycle_start, cycle_day, streak_days, cycle_completed, submitted_at')
      .eq('worker_id', workerId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .single();
    
    if (assessmentError && assessmentError.code !== 'PGRST116') {
      throw assessmentError;
    }
    
    // Check if assessment already submitted today
    const { data: existingAssessment } = await supabase
      .from('work_readiness')
      .select('id, worker_id, team_leader_id, team, fatigue_level, pain_discomfort, pain_areas, readiness_level, mood, notes, status')
      .eq('worker_id', workerId)
      .gte('submitted_at', `${today}T00:00:00`)
      .lte('submitted_at', `${today}T23:59:59`)
      .single();
    
    // Determine cycle data with proper consecutive day validation
    let cycleStart, cycleDay, streakDays, cycleCompleted;
    
    if (!latestAssessment?.cycle_start || latestAssessment?.cycle_completed) {
      // Start new cycle
      cycleStart = today;
      cycleDay = 1;
      streakDays = 1;
      cycleCompleted = false;
    } else {
      // Check if submission is consecutive
      const lastSubmissionDate = new Date(latestAssessment.submitted_at);
      const todayDate = new Date(today);
      const daysDiff = Math.floor((todayDate - lastSubmissionDate) / (1000 * 60 * 60 * 24));
      
      console.log('🔍 Date validation:', {
        lastSubmission: lastSubmissionDate.toISOString().split('T')[0],
        today: today,
        daysDiff: daysDiff
      });
      
      if (daysDiff > 1) {
        // Missed day(s) - reset cycle
        console.log('🔄 MISSED DAYS - Resetting cycle due to gap of', daysDiff, 'days');
        cycleStart = today;
        cycleDay = 1;
        streakDays = 0;  // Fixed: Should be 0, not 1
        cycleCompleted = false;
      } else {
        // Continue existing cycle (consecutive day)
        cycleStart = latestAssessment.cycle_start;
        cycleDay = (latestAssessment.cycle_day || 1) + 1;
        streakDays = (latestAssessment.streak_days || 0) + 1;
        cycleCompleted = streakDays >= 7;
        
        console.log('✅ CONSECUTIVE DAY - Continuing cycle:', {
          cycleDay: cycleDay,
          streakDays: streakDays,
          cycleCompleted: cycleCompleted
        });
      }
    }
    
    // Add cycle data to assessment
    const assessmentWithCycle = {
      ...assessmentData,
      cycle_start: cycleStart,
      cycle_day: cycleDay,
      streak_days: streakDays,
      cycle_completed: cycleCompleted,
      submitted_at: new Date().toISOString()
    };
    
    // ✅ FIXED: Handle existing vs new assessment to prevent duplication
    let savedAssessment;
    
    if (existingAssessment) {
      // Update existing assessment with cycle data
      console.log('🔄 Updating existing assessment:', existingAssessment.id);
      
      const updateData = {
        ...existingAssessment,
        ...assessmentData,
        cycle_start: cycleStart,
        cycle_day: cycleDay,
        streak_days: streakDays,
        cycle_completed: cycleCompleted,
        updated_at: new Date().toISOString()
      };
      
      const { data: updatedAssessment, error: updateError } = await supabase
        .from('work_readiness')
        .update(updateData)
        .eq('id', existingAssessment.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('❌ Failed to update assessment with cycle data:', updateError);
        throw updateError;
      }
      
      savedAssessment = updatedAssessment;
      console.log('✅ Assessment updated with cycle data:', savedAssessment.id);
      
    } else {
      // Create new assessment with cycle data
      console.log('🆕 Creating new assessment with cycle data');
      
      const { data: newAssessment, error: saveError } = await supabase
        .from('work_readiness')
        .insert([assessmentWithCycle])
        .select()
        .single();
      
      if (saveError) {
        console.error('❌ Failed to save assessment with cycle data:', saveError);
        throw saveError;
      }
      
      savedAssessment = newAssessment;
      console.log('✅ New assessment saved with cycle data:', savedAssessment.id);
    }
    
    // Calculate KPI based on consecutive days
    const kpi = calculateKPI(streakDays);
    
    // Determine message based on progress
    let message;
    if (cycleCompleted) {
      message = "🎉 Cycle complete! Excellent work! 7 consecutive days achieved!";
    } else if (streakDays >= 2) {
      message = `✅ Day ${streakDays} complete! Keep the streak going!`;
    } else if (streakDays === 1 && cycleDay === 1) {
      message = "🚀 Day 1 complete! Great start to your new cycle!";
    } else {
      message = `📝 Day ${streakDays} complete! Building momentum!`;
    }
    
    res.json({
      success: true,
      message: message,
      cycle: {
        cycle_start: cycleStart,
        current_day: cycleDay,
        streak_days: streakDays,
        cycle_completed: cycleCompleted
      },
      day: streakDays,
      cycleComplete: cycleCompleted,
      kpi: kpi,
      assessmentData: assessmentWithCycle,
      savedAssessmentId: savedAssessment.id
    });
    
  } catch (error) {
    console.error('Error handling assessment submission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update cycle',
      error: error.message
    });
  }
};

module.exports = {
  getWorkerWeeklyProgress,
  getTeamWeeklyKPI,
  getTeamMonitoringDashboard,
  getMonthlyPerformanceTracking,
  generateMonthlyInsights,
  getWorkingDaysInMonth,
  handleLogin,
  handleAssessmentSubmission,
  calculateKPI,
  calculateCompletionRateKPI,
  getWeekDateRange,
  getWorkingDaysCount,
  calculateStreaks,
  getPerformanceTrend,
  getTeamWeeklyComparison,
  generatePerformanceInsights,
  generateMonitoringInsights
};