const { supabase } = require('../config/supabase');

// Import utilities
const logger = require('../utils/logger');
const dateUtils = require('../utils/dateUtils');
const kpiUtils = require('../utils/kpiUtils');
const teamAnalyticsUtils = require('../utils/teamAnalyticsUtils');
const errorHandler = require('../middleware/errorHandler');

const asyncHandler = errorHandler.asyncHandler;
const createError = errorHandler.createError;

/**
 * Goal Tracking & KPI Controller
 * 
 * This controller provides comprehensive Goal Tracking & KPI functionality including:
 * - Weekly work readiness goal tracking
 * - KPI rating calculation based on completion percentage
 * - Individual and team performance metrics
 * - Data filtering by worker and team leader
 * - Weekly achievement summaries
 * 
 * Updated to use service layer architecture for better maintainability
 */

/**
 * Calculate KPI score based on consecutive days completed in cycle
 * @param {number} consecutiveDays - Number of consecutive days completed (0-7)
 * @returns {object} KPI score and rating
 */
const calculateKPI = kpiUtils.calculateKPI;

/**
 * Calculate KPI score based on assignment completion rate
 * @param {number} completedAssignments - Number of completed assignments
 * @param {number} totalAssignments - Total number of assignments given
 * @param {number} onTimeSubmissions - Number of on-time submissions
 * @param {number} qualityScore - Average quality score (0-100)
 * @param {number} pendingAssignments - Number of pending assignments with future due dates (optional)
 * @param {number} overdueAssignments - Number of overdue assignments (optional)
 * @returns {object} KPI score and rating
 */
const calculateAssignmentKPI = kpiUtils.calculateAssignmentKPI;

/**
 * Calculate KPI score based on completion rate percentage (Legacy - for backward compatibility)
 * @param {number} completionRate - Completion rate percentage (0-100)
 * @param {number} currentDay - Current day in cycle (optional)
 * @param {number} totalAssessments - Total number of assessments submitted (optional)
 * @returns {object} KPI score and rating
 */
const calculateCompletionRateKPI = kpiUtils.calculateCompletionRateKPI;

/**
 * Get start and end dates for a given week (Sunday to Saturday)
 * @param {Date} date - Any date in the week
 * @returns {object} Week start and end dates
 */
const getWeekDateRange = dateUtils.getWeekDateRange;

/**
 * Get current week and previous week data for comparison
 * @param {Date} date - Reference date (defaults to current date)
 * @returns {object} Current and previous week information
 */
const getWeekComparison = dateUtils.getWeekComparison;

/**
 * Calculate working days count between start and end date (Monday-Friday)
 */
const getWorkingDaysCount = dateUtils.getWorkingDaysCount;

/**
 * Calculate working days elapsed since start of current week (Monday)
 * @param {Date} weekStartDate - Start date of the week (Monday)
 * @param {Date} currentDate - Current date (defaults to today)
 * @returns {number} Number of working days elapsed (0-5)
 */
const getWorkingDaysElapsed = dateUtils.getWorkingDaysElapsed;

/**
 * Calculate submission streaks
 */
const calculateStreaks = kpiUtils.calculateStreaks;

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
    
    // Get latest assessment
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
    const cycleEnd = new Date(cycleStart);
    cycleEnd.setDate(cycleStart.getDate() + 6); // 7-day cycle
    
    // Get assessments
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
    
    // Calculate KPI
    const consecutiveDaysCompleted = latestAssessment.streak_days || 0;
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
    logger.logBusiness('Monthly Performance Tracking Request', { query: req.query });
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
    
    // Calculate date ranges for the target month
    const targetDate = new Date(year, month - 1, 1);
    const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59);
    
    logger.logBusiness('Monthly Analysis', {
      monthStart: dateUtils.getDateString(monthStart),
      monthEnd: dateUtils.getDateString(monthEnd),
      teamMembersCount: teamMembers?.length || 0,
      teamMemberIds
    });
    
    // 1. MONTHLY KPI CALCULATION FOR EACH WORKER
    const monthlyWorkerKPIs = await Promise.all(teamMembers.map(async (member) => {
      // Get all assessments for the target month
      const { data: monthlyAssessments } = await supabase
        .from('work_readiness')
        .select('*')
        .eq('worker_id', member.id)
        .gte('submitted_at', monthStart.toISOString())
        .lte('submitted_at', monthEnd.toISOString())
        .order('submitted_at', { ascending: true });
      
      // Get all assessments for the month (since we don't have cycle tracking columns)
      const { data: completedCycles } = await supabase
        .from('work_readiness')
        .select('submitted_at, readiness_level, fatigue_level, mood')
        .eq('worker_id', member.id)
        .gte('submitted_at', monthStart.toISOString())
        .lte('submitted_at', monthEnd.toISOString())
        .order('submitted_at', { ascending: true });
      
      // Calculate monthly metrics
      const totalAssessments = monthlyAssessments?.length || 0;
      const completedCyclesCount = completedCycles?.length || 0;
      
      logger.logBusiness('Worker Assessment Count', {
        workerName: `${member.first_name} ${member.last_name}`,
        totalAssessments
      });
      
      // Calculate working days in the month (Monday-Friday)
      const workingDaysInMonth = getWorkingDaysInMonth(monthStart, monthEnd);
      
      // Calculate completion rate for the month
      const monthlyCompletionRate = workingDaysInMonth > 0 
        ? (totalAssessments / workingDaysInMonth) * 100 
        : 0;
      
      // Calculate average KPI based on readiness levels (since we don't have cycle tracking)
      const readinessKPIs = monthlyAssessments?.map(assessment => {
        // Convert readiness level to a score
        let score = 0;
        switch(assessment.readiness_level) {
          case 'fit': score = 100; break;
          case 'minor': score = 70; break;
          case 'not_fit': score = 30; break;
          default: score = 50;
        }
        return calculateCompletionRateKPI(score, null, 1);
      }) || [];
      
      const averageCycleKPI = readinessKPIs.length > 0
        ? readinessKPIs.reduce((sum, kpi) => sum + kpi.score, 0) / readinessKPIs.length
        : 0;
      
      // Calculate readiness statistics for the month
      const readinessStats = monthlyAssessments?.reduce((stats, assessment) => {
        stats[assessment.readiness_level] = (stats[assessment.readiness_level] || 0) + 1;
        return stats;
      }, {}) || {};
      
      // Calculate average fatigue level for the month
      const avgFatigueLevel = monthlyAssessments?.length > 0 
        ? monthlyAssessments.reduce((sum, a) => sum + a.fatigue_level, 0) / monthlyAssessments.length
        : 0;
      
      // Calculate monthly KPI rating
      const monthlyKPI = calculateCompletionRateKPI(monthlyCompletionRate, null, totalAssessments);
      
      return {
        workerId: member.id,
        workerName: `${member.first_name} ${member.last_name}`,
        email: member.email,
        team: member.team,
        monthlyMetrics: {
          totalAssessments: totalAssessments,
          completedCycles: completedCyclesCount,
          workingDaysInMonth: workingDaysInMonth,
          completionRate: Math.round(monthlyCompletionRate * 100) / 100,
          averageCycleKPI: Math.round(averageCycleKPI * 100) / 100,
          monthlyKPI: monthlyKPI
        },
        readinessBreakdown: {
          fit: readinessStats.fit || 0,
          minor: readinessStats.minor || 0,
          not_fit: readinessStats.not_fit || 0
        },
        averageFatigueLevel: Math.round(avgFatigueLevel * 10) / 10,
        cycleDetails: monthlyAssessments?.map(assessment => ({
          submittedAt: assessment.submitted_at,
          readinessLevel: assessment.readiness_level,
          fatigueLevel: assessment.fatigue_level,
          mood: assessment.mood,
          kpi: (() => {
            let score = 0;
            switch(assessment.readiness_level) {
              case 'fit': score = 100; break;
              case 'minor': score = 70; break;
              case 'not_fit': score = 30; break;
              default: score = 50;
            }
            return calculateCompletionRateKPI(score, null, 1);
          })()
        })) || []
      };
    }));
    
    // 2. MONTHLY TEAM SUMMARY
    const monthlyTeamSummary = {
      month: monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      monthStart: monthStart.toISOString().split('T')[0],
      monthEnd: monthEnd.toISOString().split('T')[0],
      totalMembers: teamMembers.length,
      activeMembers: monthlyWorkerKPIs.filter(member => member.monthlyMetrics.totalAssessments > 0).length,
      totalAssessments: monthlyWorkerKPIs.reduce((sum, member) => sum + member.monthlyMetrics.totalAssessments, 0),
      totalCompletedCycles: monthlyWorkerKPIs.reduce((sum, member) => sum + member.monthlyMetrics.completedCycles, 0),
      averageCompletionRate: monthlyWorkerKPIs.length > 0
        ? monthlyWorkerKPIs.reduce((sum, member) => sum + member.monthlyMetrics.completionRate, 0) / monthlyWorkerKPIs.length
        : 0,
      averageCycleKPI: monthlyWorkerKPIs.length > 0
        ? monthlyWorkerKPIs.reduce((sum, member) => sum + member.monthlyMetrics.averageCycleKPI, 0) / monthlyWorkerKPIs.length
        : 0,
      teamKPI: calculateCompletionRateKPI(
        monthlyWorkerKPIs.length > 0
          ? monthlyWorkerKPIs.reduce((sum, member) => sum + member.monthlyMetrics.completionRate, 0) / monthlyWorkerKPIs.length
          : 0,
        null,
        null
      )
    };
    
    // 3. MONTHLY TRENDS (Previous months comparison)
    const monthlyTrends = [];
    const monthsBack = parseInt(includePreviousMonths);
    
    for (let i = 0; i < monthsBack; i++) {
      const trendDate = new Date(targetDate);
      trendDate.setMonth(trendDate.getMonth() - i);
      const trendMonthStart = new Date(trendDate.getFullYear(), trendDate.getMonth(), 1);
      const trendMonthEnd = new Date(trendDate.getFullYear(), trendDate.getMonth() + 1, 0, 23, 59, 59);
      
      // Get team data for this month
      const { data: trendAssessments } = await supabase
        .from('work_readiness')
        .select('*')
        .in('worker_id', teamMemberIds)
        .gte('submitted_at', trendMonthStart.toISOString())
        .lte('submitted_at', trendMonthEnd.toISOString());
      
      const { data: trendCompletedCycles } = await supabase
        .from('work_readiness')
        .select('*')
        .in('worker_id', teamMemberIds)
        .gte('submitted_at', trendMonthStart.toISOString())
        .lte('submitted_at', trendMonthEnd.toISOString());
      
      const trendWorkingDays = getWorkingDaysInMonth(trendMonthStart, trendMonthEnd);
      const trendCompletionRate = trendWorkingDays > 0 
        ? (trendAssessments?.length || 0) / trendWorkingDays * 100 
        : 0;
      
      monthlyTrends.unshift({
        month: trendMonthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        monthStart: trendMonthStart.toISOString().split('T')[0],
        monthEnd: trendMonthEnd.toISOString().split('T')[0],
        totalAssessments: trendAssessments?.length || 0,
        completedCycles: trendCompletedCycles?.length || 0,
        workingDays: trendWorkingDays,
        completionRate: Math.round(trendCompletionRate * 100) / 100,
        teamKPI: calculateCompletionRateKPI(trendCompletionRate, null, null)
      });
    }
    
    // 4. PERFORMANCE INSIGHTS
    logger.logBusiness('Generating Performance Insights', {
      workerKPIsCount: monthlyWorkerKPIs.length,
      teamSummary: monthlyTeamSummary,
      trendsCount: monthlyTrends.length
    });
    const performanceInsights = teamAnalyticsUtils.generateMonthlyInsights(monthlyWorkerKPIs, monthlyTeamSummary, monthlyTrends);
    
    res.json({
      success: true,
      data: {
        monthlyWorkerKPIs: monthlyWorkerKPIs,
        monthlyTeamSummary: monthlyTeamSummary,
        monthlyTrends: monthlyTrends,
        performanceInsights: performanceInsights
      }
    });
    
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
      teamKPI: teamSummary.teamKPI?.rating || 'N/A'
    }
  });
  
  return insights;
};
const getTeamMonitoringDashboard = async (req, res) => {
  try {
    logger.logBusiness('Team Monitoring Dashboard Request', { query: req.query });
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
          insights: teamAnalyticsUtils.generateMonitoringInsights(currentCycleStatus, completedCyclesHistory, teamPerformanceSummary)
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
    logger.logBusiness('Team Weekly KPI Request', { 
      query: req.query,
      method: req.method,
      url: req.url
    });
    
    const teamLeaderId = req.query.teamLeaderId;
    const { weekOffset = 0, teamFilter } = req.query;
    
    if (!teamLeaderId) {
      logger.warn('Team Weekly KPI: No team leader ID provided');
      return res.status(400).json({
        success: false,
        message: 'Team Leader ID is required'
      });
    }
    
    logger.logBusiness('Team Weekly KPI: API Called', { teamLeaderId });
    
    // Calculate target week using automatic current date
    const weekInfo = getWeekComparison(new Date());
    
    // Get the team leader's managed teams first
    logger.logBusiness('Querying Team Leader Info', { teamLeaderId });
    const { data: teamLeader, error: teamLeaderError } = await supabase
      .from('users')
      .select('managed_teams, team')
      .eq('id', teamLeaderId)
      .eq('role', 'team_leader')
      .single();
    
    if (teamLeaderError) {
      logger.error('Team leader query error', { error: teamLeaderError, teamLeaderId });
      throw teamLeaderError;
    }
    
    logger.logBusiness('Team Leader Details', {
      id: teamLeaderId,
      managed_teams: teamLeader?.managed_teams,
      team: teamLeader?.team
    });
    
    // ✅ ENFORCE ONE-TO-ONE RELATIONSHIP: Each team leader manages only one team
    let teamsToQuery = [];
    if (teamLeader?.team) {
      // Use only the team leader's primary team (one-to-one relationship)
      teamsToQuery = [teamLeader.team];
      logger.logBusiness('Using Primary Team', { team: teamLeader.team });
    } else {
      // If no team info at all, return empty result
      logger.warn('No team information found for team leader', { teamLeaderId });
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
    logger.logBusiness('Querying Team Members', { teamsToQuery });
    const { data: teamMembers, error: teamMembersError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, team')
      .eq('role', 'worker')
      .in('team', teamsToQuery);
    
    if (teamMembersError) {
      logger.error('Team members query error', { error: teamMembersError, teamsToQuery });
      throw teamMembersError;
    }
    
    logger.logBusiness('Team Members Found', {
      count: teamMembers?.length || 0,
      members: teamMembers?.map(m => ({
        id: m.id,
        name: `${m.first_name} ${m.last_name}`,
        email: m.email,
        team: m.team
      }))
    });

    // Check if samward@gmail.com is in the team
    const samwardMember = teamMembers?.find(m => m.email === 'samward@gmail.com');
    if (samwardMember) {
      logger.logBusiness('Samward Member Found', { samwardMember });
    } else {
      logger.logBusiness('Samward Member Not Found', { 
        availableEmails: teamMembers?.map(m => m.email) 
      });
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
    const workingDaysCount = dateUtils.getWorkingDaysCount(weekInfo.currentWeek.startDate, weekInfo.currentWeek.endDate);
    
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
        logger.logBusiness('Processing Worker', {
          workerName: `${member.first_name} ${member.last_name}`,
          workerId: member.id,
          team: member.team
        });
        
        // Get latest assessment to find individual cycle start
      const { data: latestAssessment, error: cycleError } = await supabase
        .from('work_readiness')
        .select('cycle_start, cycle_day, streak_days, cycle_completed')
        .eq('worker_id', member.id)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .single();

      if (cycleError && cycleError.code !== 'PGRST116') {
        logger.warn('No cycle data for worker', { workerId: member.id });
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
        logger.warn('No assessments for worker', { workerId: member.id });
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

      logger.logBusiness('Worker Cycle Info', {
        workerName: member.first_name,
        cycleStart: dateUtils.getDateString(cycleStart),
        cycleEnd: dateUtils.getDateString(cycleEnd),
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
        logger.error('Error fetching cycle assessments for worker', { 
          workerId: member.id, 
          error: cycleAssessmentsError 
        });
        throw cycleAssessmentsError;
      }

      // Calculate completion rate based on individual 7-day cycle
      const submittedDays = new Set(cycleAssessments?.map(a => 
        new Date(a.submitted_at).toISOString().split('T')[0]
      ) || []);
      
      const completedCount = submittedDays.size;
      const completionRate = (completedCount / 7) * 100; // 7-day cycle, not working days
      
      logger.logBusiness('Worker Cycle Stats', {
        workerName: member.first_name,
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
        logger.error('Error processing worker', { 
          workerName: `${member.first_name} ${member.last_name}`,
          error: error.message 
        });
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
    const currentWeek = dateUtils.getWeekDateRange();
    const currentWeekStart = new Date(currentWeek.startDate);
    const currentWeekEnd = new Date(currentWeek.endDate);
    
    // Calculate TODAY's submissions using the same logic as TeamLeaderMonitoring
    const todayRange = dateUtils.getDayRange();
    const todayStart = new Date(todayRange.start);
    const todayEnd = new Date(todayRange.end);
    
    // Alternative approach: Use date string comparison for today
    const todayDateString = dateUtils.getTodayDateString();
    
    logger.logBusiness('Date Range Calculations', {
      currentWeekStart: currentWeekStart.toISOString(),
      currentWeekEnd: currentWeekEnd.toISOString(),
      todayStart: todayStart.toISOString(),
      todayEnd: todayEnd.toISOString(),
      todayDateString,
      teamMembersCount: teamMembers?.length || 0
    });
    
    // Test: Check if samward@gmail.com is in team (using existing samwardMember from above)
    if (samwardMember) {
      logger.logBusiness('Samward Member Confirmed', { samwardMember });
    } else {
      logger.logBusiness('Samward Member Not Found', { 
        availableEmails: teamMembers?.map(m => m.email) 
      });
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
        logger.error('Error checking today\'s submissions', { 
          workerName: member.first_name, 
          error: todayError 
        });
        return false;
      }
      
      if (todayAssessments && todayAssessments.length > 0) {
        logger.logBusiness('Today Submission Found', {
          workerName: member.first_name,
          submittedAt: todayAssessments[0].submitted_at
        });
        return true;
      }
      
      // Special debugging for samward
      if (member.email === 'samward@gmail.com') {
        logger.logBusiness('Samward Today Check', {
          todayStart: todayStart.toISOString(),
          todayEnd: todayEnd.toISOString(),
          results: todayAssessments
        });
      }
      
      return false;
    }));
    
    const todaySubmissionCount = todaySubmissions.filter(submitted => submitted).length;
    const todaySubmissionRate = teamMembers.length > 0 ? (todaySubmissionCount / teamMembers.length) * 100 : 0;
    
    logger.logBusiness('Today Submissions Check', {
      submissions: todaySubmissions.map((submitted, index) => ({
        member: `${teamMembers[index].first_name} ${teamMembers[index].last_name}`,
        submitted: submitted
      })),
      submissionCount: todaySubmissionCount,
      submissionRate: Math.round(todaySubmissionRate)
    });
    
    // Debug: Check recent work readiness submissions
    const { data: recentSubmissions, error: recentError } = await supabase
      .from('work_readiness')
      .select('worker_id, submitted_at')
      .order('submitted_at', { ascending: false })
      .limit(5);
    
    if (recentError) {
      logger.error('Error fetching recent submissions', { error: recentError });
    } else {
      logger.logBusiness('Recent Work Readiness Submissions', { recentSubmissions });
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
        logger.error('Error fetching samward submissions', { error: samwardError });
      } else {
        logger.logBusiness('Samward Submissions', { samwardSubmissions });
        
        // Check if any submissions are from this week
        const thisWeekSubmissions = samwardSubmissions?.filter(sub => {
          const submissionDate = new Date(sub.submitted_at);
          return submissionDate >= currentWeekStart && submissionDate <= currentWeekEnd;
        });
        
        // Check if any submissions are from today
        const todaySubmissions = samwardSubmissions?.filter(sub => {
          const submissionDate = new Date(sub.submitted_at);
          const submissionDateString = dateUtils.getDateString(submissionDate);
          return submissionDateString === todayDateString;
        });
        
        logger.logBusiness('Samward Submission Analysis', {
          thisWeekSubmissions,
          todaySubmissions,
          todayDateString,
          submissionDates: samwardSubmissions?.map(s => dateUtils.getDateString(s.submitted_at))
        });
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
    
    logger.logBusiness('Weekly Submissions Check', {
      submissions: weeklySubmissions.map((submitted, index) => ({
        member: `${teamMembers[index].first_name} ${teamMembers[index].last_name}`,
        submitted: submitted
      })),
      totalWeeklySubmissions: weeklySubmissionCount
    });
    
    // Calculate weekly submission rate
    const weeklySubmissionRate = teamMembers.length > 0 ? (weeklySubmissionCount / teamMembers.length) * 100 : 0;
    
    // Calculate team KPI based on weekly submissions (simple percentage)
    const teamKPI = kpiUtils.calculateWeeklyTeamKPI(weeklySubmissionRate, weeklySubmissionCount, teamMembers.length);
    
    // Additional team metrics for comprehensive view
    const teamMetrics = {
      weeklySubmissions: weeklySubmissionCount,
      totalMembers: teamMembers.length,
      weeklySubmissionRate: Math.round(weeklySubmissionRate),
      weekStart: dateUtils.getDateString(currentWeekStart), // Use local date format
      weekEnd: dateUtils.getDateString(currentWeekEnd), // Use local date format
      todaySubmissions: todaySubmissionCount,
      todaySubmissionRate: Math.round(todaySubmissionRate),
      todayDate: dateUtils.getTodayDateString() // Use local date format
    };
    
    // Debug logging to understand team performance
    logger.logBusiness('Weekly Team Performance Debug', {
      teamMetrics,
      weeklyTeamKPI: teamKPI,
      weeklySubmissionRate,
      weeklySubmissionCount,
      totalTeamMembers: teamMembers.length
    });
    
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
    const performanceInsights = teamAnalyticsUtils.generatePerformanceInsights(individualKPIs, teamKPI);

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
          weeklyComparison: await teamAnalyticsUtils.getTeamWeeklyComparison(teamLeaderId, weekInfo, supabase)
        }
    };
    
    logger.logBusiness('Final Response Data', { responseData });
    
    res.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    logger.error('Error fetching team weekly KPI', { 
      error: error.message, 
      stack: error.stack, 
      query: req.query 
    });

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
    logger.logBusiness('Handle Login Called', { workerId });
    const { workerId } = req.body;
    
    if (!workerId) {
      return res.status(400).json({
        success: false,
        message: 'Worker ID is required'
      });
    }
    
    logger.logBusiness('Querying Users Table', { workerId });
    
    // Check if user is WORKER role
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', workerId)
      .single();
    
    logger.logBusiness('User Query Result', { user, userError });
    
    if (userError) {
      logger.error('User query error', { error: userError, workerId });
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
    
    // Get today's date in Philippines Time (UTC+8)
    const today = dateUtils.getTodayDateString();
    
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
    
    logger.logBusiness('Backend Debug - Login Record', { lastLoginRecord, loginError });
    
    // If no login record found, treat as first time login
    const lastLogin = lastLoginRecord?.created_at?.split('T')[0] || null;
    logger.logBusiness('Backend Debug - Date Comparison', { lastLogin, today });
    
    // Check if there's an active cycle in work_readiness
    const { data: latestAssessment, error: assessmentError } = await supabase
      .from('work_readiness')
      .select('cycle_start, cycle_day, streak_days, cycle_completed, submitted_at')
      .eq('worker_id', workerId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .single();
    
    logger.logBusiness('Backend Debug - Latest Assessment', { latestAssessment, assessmentError });
    
    if (assessmentError && assessmentError.code !== 'PGRST116') {
      throw assessmentError;
    }
    
    // FIRST: Check if no assessments exist (FIRST TIME LOGIN)
    if (!latestAssessment) {
      logger.logBusiness('First Time Login - No Assessments', { lastLoginRecord, lastLogin });
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
      logger.logBusiness('Very First Login - No Login Records', { loginError });
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
      logger.logBusiness('Missed Day - Cycle Broken', { lastLogin, today });
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
      logger.logBusiness('New Cycle After Completion', { lastLogin, today });
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
      logger.logBusiness('No Cycle Start - Starting New One');
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
    logger.logBusiness('Continuing Existing Cycle', { currentDay, lastLogin, today });
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
    logger.error('Error handling login cycle', { 
      error: error.message, 
      stack: error.stack 
    });
    res.status(500).json({
      success: false,
      message: 'Failed to start cycle',
      error: error.message
    });
  }
};

/**
 * Get Team Leader Assignment KPI Summary
 * @route GET /api/goal-kpi/team-leader/assignment-summary
 * @access Team Leader
 * 
 * NOTE: This function uses the new assignment-based KPI system.
 * It does NOT use cycle-based columns (cycle_day, streak_days, cycle_completed, cycle_start).
 * Those columns are kept in the database for migration purposes but are not used in calculations.
 */
const getTeamLeaderAssignmentKPI = async (req, res) => {
  try {
    const { teamLeaderId } = req.query;
    
    logger.logBusiness('Team Leader Assignment KPI Request', { teamLeaderId });
    
    if (!teamLeaderId) {
      return res.status(400).json({
        success: false,
        message: 'Team Leader ID is required'
      });
    }

    // Get date range for the current month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

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

    // Get all assignments for team members this month
    const { data: assignments, error: assignmentsError } = await supabase
      .from('work_readiness_assignments')
      .select('*')
      .in('worker_id', teamMemberIds)
      .gte('assigned_date', monthStart.toISOString().split('T')[0])
      .lte('assigned_date', monthEnd.toISOString().split('T')[0])
      .order('assigned_date', { ascending: false });

    if (assignmentsError) {
      console.error('Error fetching assignments:', assignmentsError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch assignments'
      });
    }

    // Calculate team metrics
    const totalAssignments = assignments?.length || 0;
    const completedAssignments = assignments?.filter(a => a.status === 'completed').length || 0;
    const onTimeSubmissions = assignments?.filter(a => 
      a.status === 'completed' && 
      a.completed_at && 
      new Date(a.completed_at) <= new Date(a.due_time)
    ).length || 0;
    
    // ✅ PENDING ASSIGNMENTS WITH FUTURE DUE DATES (TEAM LEVEL)
    const currentTime = new Date();
    const pendingAssignments = assignments?.filter(a => {
      if (a.status !== 'pending' || !a.due_time) return false;
      const dueTime = new Date(a.due_time);
      return dueTime > currentTime; // Only count pending assignments with future due dates
    }).length || 0;
    
    // ✅ OVERDUE ASSIGNMENTS CALCULATION (TEAM LEVEL)
    const overdueAssignments = assignments?.filter(a => {
      if (a.status !== 'overdue') return false;
      return true; // All overdue assignments count as penalty
    }).length || 0;

    logger.logBusiness('Team Metrics', {
      totalAssignments,
      completedAssignments,
      onTimeSubmissions,
      pendingAssignments,
      overdueAssignments,
      teamMembersCount: teamMembers?.length || 0
    });

    // Calculate individual worker KPIs
    logger.logBusiness('Calculating Individual KPIs', { 
      teamMembersCount: teamMembers?.length || 0 
    });
    
    const individualKPIs = await Promise.all(teamMembers.map(async (member) => {
      const memberAssignments = assignments?.filter(a => a.worker_id === member.id) || [];
      const memberCompleted = memberAssignments.filter(a => a.status === 'completed').length;
      
      // ✅ SHIFT-BASED ON-TIME CALCULATION
      const memberOnTime = memberAssignments.filter(a => {
        if (a.status !== 'completed' || !a.completed_at || !a.due_time) return false;
        const completedDate = new Date(a.completed_at);
        const dueTime = new Date(a.due_time); // Shift-based deadline from DB
        return completedDate <= dueTime;
      }).length;
      
      // ✅ PENDING ASSIGNMENTS WITH FUTURE DUE DATES
      const currentTime = new Date();
      const memberPending = memberAssignments.filter(a => {
        if (a.status !== 'pending' || !a.due_time) return false;
        const dueTime = new Date(a.due_time);
        return dueTime > currentTime; // Only count pending assignments with future due dates
      }).length;
      
      // ✅ OVERDUE ASSIGNMENTS FOR INDIVIDUAL WORKER
      const memberOverdue = memberAssignments.filter(a => {
        if (a.status !== 'overdue') return false;
        return true; // All overdue assignments count as penalty
      }).length;
      
      // Validate shift-based deadline data
      const assignmentsWithDueTime = memberAssignments.filter(a => a.due_time).length;
      if (assignmentsWithDueTime < memberAssignments.length) {
        logger.warn('Worker assignments missing due_time', {
          workerName: `${member.first_name} ${member.last_name}`,
          missingDueTime: memberAssignments.length - assignmentsWithDueTime
        });
      }

      // Get work readiness data for quality scoring
      const { data: workReadiness } = await supabase
        .from('work_readiness')
        .select('readiness_level')
        .eq('worker_id', member.id)
        .gte('submitted_at', monthStart.toISOString())
        .lte('submitted_at', monthEnd.toISOString());

      // Calculate quality score
      let qualityScore = 0;
      if (workReadiness && workReadiness.length > 0) {
        const qualityScores = workReadiness.map(wr => {
          switch(wr.readiness_level) {
            case 'fit': return 100;
            case 'minor': return 70;
            case 'not_fit': return 30;
            default: return 50;
          }
        });
        qualityScore = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
      }

      const kpi = calculateAssignmentKPI(memberCompleted, memberAssignments.length, memberOnTime, qualityScore, memberPending, memberOverdue);

      return {
        workerId: member.id,
        workerName: `${member.first_name} ${member.last_name}`,
        workerEmail: member.email,
        kpi: kpi,
        assignments: {
          total: memberAssignments.length,
          completed: memberCompleted,
          onTime: memberOnTime,
          pending: memberAssignments.filter(a => a.status === 'pending').length,
          overdue: memberAssignments.filter(a => a.status === 'overdue').length
        }
      };
    }));

    // Calculate team KPI
    const teamCompletionRate = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0;
    const teamOnTimeRate = totalAssignments > 0 ? (onTimeSubmissions / totalAssignments) * 100 : 0;
    const avgQualityScore = individualKPIs.length > 0 
      ? individualKPIs.reduce((sum, kpi) => sum + kpi.kpi.qualityScore, 0) / individualKPIs.length 
      : 0;

    const teamKPI = calculateAssignmentKPI(completedAssignments, totalAssignments, onTimeSubmissions, avgQualityScore, pendingAssignments, overdueAssignments);

    logger.logBusiness('Team KPI Calculation with Penalties', {
      totalAssignments,
      completedAssignments,
      completionRate: teamCompletionRate.toFixed(1),
      pendingAssignments,
      onTimeSubmissions,
      onTimeRate: teamOnTimeRate.toFixed(1),
      avgQualityScore: avgQualityScore.toFixed(1),
      pendingBonus: teamKPI.pendingBonus.toFixed(2),
      overduePenalty: teamKPI.overduePenalty.toFixed(2),
      teamKPIRating: teamKPI.rating,
      teamKPIScore: teamKPI.score.toFixed(2),
      finalFormula: `(${teamCompletionRate.toFixed(1)}% * 0.7) + (${teamOnTimeRate.toFixed(1)}% * 0.2) + (${avgQualityScore.toFixed(1)} * 0.1) + ${teamKPI.pendingBonus.toFixed(2)}% bonus - ${teamKPI.overduePenalty.toFixed(2)}% penalty = ${teamKPI.score.toFixed(2)}`
    });

    res.json({
      success: true,
      teamKPI: teamKPI,
      teamMetrics: {
        totalAssignments,
        completedAssignments,
        onTimeSubmissions,
        pendingAssignments,
        overdueAssignments,
        teamCompletionRate: Math.round(teamCompletionRate),
        teamOnTimeRate: Math.round(teamOnTimeRate),
        avgQualityScore: Math.round(avgQualityScore),
        totalMembers: teamMembers.length
      },
      individualKPIs,
      period: {
        start: monthStart.toISOString().split('T')[0],
        end: monthEnd.toISOString().split('T')[0],
        month: now.toLocaleString('default', { month: 'long', year: 'numeric' })
      }
    });

  } catch (error) {
    console.error('Error in getTeamLeaderAssignmentKPI:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get Worker KPI based on Assignment Completion
 * @route GET /api/goal-kpi/worker/assignment-kpi
 * @access Worker
 * 
 * NOTE: This function uses the new assignment-based KPI system.
 * It does NOT use cycle-based columns (cycle_day, streak_days, cycle_completed, cycle_start).
 * Those columns are kept in the database for migration purposes but are not used in calculations.
 */
const getWorkerAssignmentKPI = async (req, res) => {
  try {
    const { workerId } = req.query;
    
    if (!workerId) {
      return res.status(400).json({
        success: false,
        message: 'Worker ID is required'
      });
    }

    // Get date range for the current month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get all assignments for the worker this month
    const { data: assignments, error: assignmentsError } = await supabase
      .from('work_readiness_assignments')
      .select('*')
      .eq('worker_id', workerId)
      .gte('assigned_date', monthStart.toISOString().split('T')[0])
      .lte('assigned_date', monthEnd.toISOString().split('T')[0])
      .order('assigned_date', { ascending: false });

    if (assignmentsError) {
      console.error('Error fetching assignments:', assignmentsError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch assignments'
      });
    }

    // Get completed work readiness submissions for quality scoring
    const { data: workReadiness, error: workReadinessError } = await supabase
      .from('work_readiness')
      .select('*')
      .eq('worker_id', workerId)
      .gte('submitted_at', monthStart.toISOString())
      .lte('submitted_at', monthEnd.toISOString());

    if (workReadinessError) {
      console.error('Error fetching work readiness:', workReadinessError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch work readiness data'
      });
    }

    // Calculate metrics
    const totalAssignments = assignments?.length || 0;
    const completedAssignments = assignments?.filter(a => a.status === 'completed').length || 0;
    const onTimeSubmissions = assignments?.filter(a => 
      a.status === 'completed' && 
      a.completed_at && 
      new Date(a.completed_at) <= new Date(a.due_time)
    ).length || 0;
    
    // ✅ PENDING ASSIGNMENTS WITH FUTURE DUE DATES (WORKER LEVEL)
    const currentTime = new Date();
    const pendingAssignments = assignments?.filter(a => {
      if (a.status !== 'pending' || !a.due_time) return false;
      const dueTime = new Date(a.due_time);
      return dueTime > currentTime; // Only count pending assignments with future due dates
    }).length || 0;
    
    // ✅ OVERDUE ASSIGNMENTS FOR WORKER
    const overdueAssignments = assignments?.filter(a => {
      if (a.status !== 'overdue') return false;
      return true; // All overdue assignments count as penalty
    }).length || 0;

    // Calculate quality score based on readiness levels
    let qualityScore = 0;
    if (workReadiness && workReadiness.length > 0) {
      const qualityScores = workReadiness.map(wr => {
        switch(wr.readiness_level) {
          case 'fit': return 100;
          case 'minor': return 70;
          case 'not_fit': return 30;
          default: return 50;
        }
      });
      qualityScore = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
    }

    // Calculate KPI using enhanced assignment-based system with pending assignments and overdue penalty
    const kpi = calculateAssignmentKPI(completedAssignments, totalAssignments, onTimeSubmissions, qualityScore, pendingAssignments, overdueAssignments);

    // Get recent assignments for context
    const recentAssignments = assignments?.slice(0, 5).map(assignment => ({
      id: assignment.id,
      assignedDate: assignment.assigned_date,
      status: assignment.status,
      dueTime: assignment.due_time,
      completedAt: assignment.completed_at,
      isOnTime: assignment.status === 'completed' && 
                assignment.completed_at && 
                new Date(assignment.completed_at) <= new Date(assignment.due_time)
    })) || [];

    res.json({
      success: true,
      kpi: kpi,
      metrics: {
        totalAssignments,
        completedAssignments,
        onTimeSubmissions,
        qualityScore: Math.round(qualityScore),
        completionRate: totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0,
        onTimeRate: totalAssignments > 0 ? Math.round((onTimeSubmissions / totalAssignments) * 100) : 0
      },
      recentAssignments,
      period: {
        start: monthStart.toISOString().split('T')[0],
        end: monthEnd.toISOString().split('T')[0],
        month: now.toLocaleString('default', { month: 'long', year: 'numeric' })
      }
    });

  } catch (error) {
    console.error('Error in getWorkerAssignmentKPI:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
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
    
    logger.logBusiness('Handling Assessment Submission', { workerId, assessmentData });
    
    if (!workerId) {
      return res.status(400).json({
        success: false,
        message: 'Worker ID is required'
      });
    }

    // Validate assessment data
    if (!assessmentData) {
      return res.status(400).json({
        success: false,
        message: 'Assessment data is required'
      });
    }

    const { readinessLevel, fatigueLevel } = assessmentData;
    
    // Validation is handled by middleware - no need to duplicate here
    
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
    
    // Get today's date in Philippines Time (UTC+8)
    const today = dateUtils.getTodayDateString();
    
    // Check if worker has active assignment for today
    const { data: assignment, error: assignmentError } = await supabase
      .from('work_readiness_assignments')
      .select('id, status, due_time')
      .eq('worker_id', workerId)
      .eq('assigned_date', today)
      .in('status', ['pending', 'assigned'])
      .single();

    if (assignmentError && assignmentError.code !== 'PGRST116') {
      logger.error('Error checking assignment', { error: assignmentError, workerId });
      return res.status(500).json({
        success: false,
        message: 'Failed to check assignment status'
      });
    }

    if (!assignment) {
      return res.status(400).json({
        success: false,
        message: 'No active work readiness assignment found for today. Please wait for your team leader to assign you.'
      });
    }

    // Check if assignment is overdue - BLOCK submission if overdue
    const currentTime = new Date();
    const dueTime = new Date(assignment.due_time);
    if (currentTime > dueTime) {
      return res.status(400).json({
        success: false,
        message: 'Assignment is overdue - no catch-up allowed. This is a permanent record.',
        error: 'Overdue assignments cannot be completed. This reflects the true performance record.'
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
      
      logger.logBusiness('Date Validation', {
        lastSubmission: dateUtils.getDateString(lastSubmissionDate),
        today: today,
        daysDiff: daysDiff
      });
      
      if (daysDiff > 1) {
        // Missed day(s) - reset cycle
        logger.logBusiness('Missed Days - Resetting Cycle', { daysDiff });
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
        
        logger.logBusiness('Consecutive Day - Continuing Cycle', {
          cycleDay: cycleDay,
          streakDays: streakDays,
          cycleCompleted: cycleCompleted
        });
      }
    }
    
    // Transform assessment data to match database schema (camelCase to snake_case)
    const transformedAssessmentData = {
      worker_id: workerId,
      readiness_level: assessmentData.readinessLevel,
      fatigue_level: assessmentData.fatigueLevel,
      mood: assessmentData.mood,
      pain_discomfort: assessmentData.painDiscomfort,
      notes: assessmentData.notes || null,
      // Legacy cycle columns - kept for migration but not used in new assignment-based system
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
      logger.logBusiness('Updating Existing Assessment', { assessmentId: existingAssessment.id });
      
      const updateData = {
        ...existingAssessment,
        ...transformedAssessmentData,
        updated_at: new Date().toISOString()
      };
      
      const { data: updatedAssessment, error: updateError } = await supabase
        .from('work_readiness')
        .update(updateData)
        .eq('id', existingAssessment.id)
        .select()
        .single();
      
      if (updateError) {
        logger.error('Failed to update assessment with cycle data', { error: updateError, assessmentId: existingAssessment.id });
        throw updateError;
      }
      
      savedAssessment = updatedAssessment;
      logger.logBusiness('Assessment Updated with Cycle Data', { assessmentId: savedAssessment.id });
      
    } else {
      // Create new assessment with cycle data
      logger.logBusiness('Creating New Assessment with Cycle Data');
      
      const { data: newAssessment, error: saveError } = await supabase
        .from('work_readiness')
        .insert([transformedAssessmentData])
        .select()
        .single();
      
      if (saveError) {
        logger.error('Failed to save assessment with cycle data', { error: saveError });
        throw saveError;
      }
      
      savedAssessment = newAssessment;
      logger.logBusiness('New Assessment Saved with Cycle Data', { assessmentId: savedAssessment.id });
    }
    
    // Update assignment status to completed
    try {
      const { data: assignment, error: assignmentError } = await supabase
        .from('work_readiness_assignments')
        .select('id')
        .eq('worker_id', workerId)
        .eq('assigned_date', today)
        .in('status', ['pending', 'assigned'])
        .single();

      if (!assignmentError && assignment) {
        const { error: updateAssignmentError } = await supabase
          .from('work_readiness_assignments')
          .update({
            status: 'completed',
            work_readiness_id: savedAssessment.id,
            completed_at: new Date().toISOString()
          })
          .eq('id', assignment.id);

        if (updateAssignmentError) {
          logger.error('Failed to update assignment status', { error: updateAssignmentError, assignmentId: assignment.id });
        } else {
          logger.logBusiness('Assignment Status Updated to Completed', { assignmentId: assignment.id });
        }
      } else {
        logger.logBusiness('No Active Assignment Found', { workerId });
      }
    } catch (assignmentUpdateError) {
      logger.error('Error updating assignment status', { error: assignmentUpdateError, workerId });
      // Don't fail the whole request if assignment update fails
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
      assessmentData: transformedAssessmentData,
      savedAssessmentId: savedAssessment.id
    });
    
  } catch (error) {
    logger.error('Error handling assessment submission', { error: error.message, workerId });
    res.status(500).json({
      success: false,
      message: 'Failed to update cycle',
      error: error.message
    });
  }
};

module.exports = {
  getWorkerWeeklyProgress,
  getWorkerAssignmentKPI,
  getTeamLeaderAssignmentKPI,
  getTeamWeeklyKPI,
  getTeamMonitoringDashboard,
  getMonthlyPerformanceTracking,
  handleLogin,
  handleAssessmentSubmission,
  calculateKPI,
  calculateCompletionRateKPI,
  calculateAssignmentKPI,
  getWeekDateRange,
  getWorkingDaysCount,
  calculateStreaks,
  getPerformanceTrend: teamAnalyticsUtils.getPerformanceTrend,
  getTeamWeeklyComparison: teamAnalyticsUtils.getTeamWeeklyComparison,
  generatePerformanceInsights: teamAnalyticsUtils.generatePerformanceInsights,
  generateMonitoringInsights: teamAnalyticsUtils.generateMonitoringInsights,
  generateMonthlyInsights: teamAnalyticsUtils.generateMonthlyInsights,
  getWorkingDaysInMonth: dateUtils.getWorkingDaysInMonth
};