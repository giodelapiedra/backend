/**
 * Team Analytics Utilities
 * Helper functions for team performance analysis and insights
 */

const logger = require('./logger');
const { calculateAssignmentKPI, calculateCompletionRateKPI } = require('./kpiUtils');

/**
 * Generate monthly performance insights
 * @param {array} monthlyWorkerKPIs - Array of worker KPI data
 * @param {object} teamSummary - Team summary data
 * @param {array} monthlyTrends - Monthly trends data
 * @returns {array} Array of insights
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
  
  logger.logBusiness('Monthly Insights Generated', {
    insightsCount: insights.length,
    topPerformers: topPerformers.length,
    needsImprovement: needsImprovement.length
  });
  
  return insights;
};

/**
 * Generate monitoring insights for team leaders
 * @param {array} currentCycleStatus - Current cycle status data
 * @param {array} completedCyclesHistory - Completed cycles history
 * @param {object} teamSummary - Team summary data
 * @returns {array} Array of insights
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
  
  logger.logBusiness('Monitoring Insights Generated', {
    insightsCount: insights.length,
    inProgressCycles,
    completedCycles,
    noCycleStarted
  });
  
  return insights;
};

/**
 * Generate performance insights for team dashboard
 * @param {array} individualKPIs - Individual KPI data
 * @param {object} teamKPI - Team KPI data
 * @returns {array} Array of insights
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
  
  logger.logBusiness('Performance Insights Generated', {
    insightsCount: insights.length,
    topPerformers: topPerformers.length,
    needsAttention: needsAttention.length,
    consistencyRate: Math.round(consistencyRate)
  });
  
  return insights;
};

/**
 * Calculate team weekly comparison data
 * @param {string} teamLeaderId - Team leader ID
 * @param {object} weekInfo - Week information
 * @param {object} supabase - Supabase client
 * @returns {object} Weekly comparison data
 */
const getTeamWeeklyComparison = async (teamLeaderId, weekInfo, supabase) => {
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
    
    const { getWorkingDaysCount } = require('./dateUtils');
    const currentWorkingDays = getWorkingDaysCount(weekInfo.currentWeek.startDate, weekInfo.currentWeek.endDate);
    const prevWorkingDays = getWorkingDaysCount(prevWeekStart.toISOString(), prevWeekEnd.toISOString());
    
    const currentCompleted = [...new Set(currentWeekAssessments?.map(a => a.worker_id) || [])].length;
    const previousCompleted = [...new Set(previousWeekAssessments?.map(a => a.worker_id) || [])].length;
    
    const currentCompletionRate = teamMemberIds.length > 0 ? (currentCompleted / teamMemberIds.length) * 100 : 0;
    const prevCompletionRate = teamMemberIds.length > 0 ? (previousCompleted / teamMemberIds.length) * 100 : 0;
    
    const result = {
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
    
    logger.logBusiness('Weekly Comparison Calculated', {
      teamLeaderId,
      currentCompletionRate: Math.round(currentCompletionRate),
      prevCompletionRate: Math.round(prevCompletionRate),
      improvement: result.improvement
    });
    
    return result;
    
  } catch (error) {
    logger.error('Error calculating team weekly comparison', { error: error.message, teamLeaderId });
    return null;
  }
};

/**
 * Get performance trend over multiple weeks
 * @param {string} workerId - Worker ID
 * @param {object} supabase - Supabase client
 * @param {number} weeksBack - Number of weeks to look back
 * @returns {array} Performance trends
 */
const getPerformanceTrend = async (workerId, supabase, weeksBack = 4) => {
  try {
    const trends = [];
    const today = new Date();
    const { getWeekDateRange, getWorkingDaysCount } = require('./dateUtils');
    
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
    
    logger.logBusiness('Performance Trend Calculated', {
      workerId,
      weeksBack,
      trendsCount: trends.length
    });
    
    return trends;
  } catch (error) {
    logger.error('Error calculating performance trend', { error: error.message, workerId });
    return [];
  }
};

module.exports = {
  generateMonthlyInsights,
  generateMonitoringInsights,
  generatePerformanceInsights,
  getTeamWeeklyComparison,
  getPerformanceTrend
};
