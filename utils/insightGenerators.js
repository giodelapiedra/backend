/**
 * Insight Generators
 * Functions for generating performance insights and analytics
 */

/**
 * Generate performance insights for team dashboard
 * @param {Array} individualKPIs - Array of individual KPI data
 * @param {Object} teamKPI - Team KPI data
 * @returns {Array} Array of insights
 */
const generatePerformanceInsights = (individualKPIs, teamKPI) => {
  const insights = [];
  
  // Top performers
  const topPerformers = individualKPIs
    .filter(member => member.weeklyKPIMetrics?.kpi?.rating === 'Excellent')
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
    .filter(member => member.weeklyKPIMetrics?.kpi?.rating === 'Needs Improvement');
  
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
  const highPerformers = individualKPIs.filter(m => ['Excellent', 'Good'].includes(m.weeklyKPIMetrics?.kpi?.rating)).length;
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
 * Generate monitoring insights for team leaders
 * @param {Array} currentCycleStatus - Current cycle status data
 * @param {Array} completedCyclesHistory - Completed cycles history
 * @param {Object} teamSummary - Team summary data
 * @returns {Array} Array of insights
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

/**
 * Generate monthly performance insights
 * @param {Array} monthlyWorkerKPIs - Monthly worker KPI data
 * @param {Object} teamSummary - Team summary data
 * @param {Array} monthlyTrends - Monthly trends data
 * @returns {Array} Array of insights
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

/**
 * Generate team weekly comparison data
 * @param {string} teamLeaderId - Team leader ID
 * @param {Object} weekInfo - Week information
 * @param {Object} supabase - Supabase client
 * @returns {Promise<Object|null>} Comparison data
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
    
    const currentCompleted = [...new Set(currentWeekAssessments?.map(a => a.worker_id) || [])].length;
    const previousCompleted = [...new Set(previousWeekAssessments?.map(a => a.worker_id) || [])].length;
    
    const currentCompletionRate = teamMemberIds.length > 0 ? (currentCompleted / teamMemberIds.length) * 100 : 0;
    const prevCompletionRate = teamMemberIds.length > 0 ? (previousCompleted / teamMemberIds.length) * 100 : 0;
    
    return {
      previousWeek: {
        weekLabel: weekInfo.previousWeek.weekLabel,
        completionRate: Math.round(prevCompletionRate),
        kpiRating: prevCompletionRate >= 90 ? 'Excellent' : prevCompletionRate >= 75 ? 'Good' : prevCompletionRate >= 60 ? 'Average' : 'Needs Improvement'
      },
      currentWeek: {
        weekLabel: weekInfo.currentWeek.weekLabel,
        completionRate: Math.round(currentCompletionRate),
        kpiRating: currentCompletionRate >= 90 ? 'Excellent' : currentCompletionRate >= 75 ? 'Good' : currentCompletionRate >= 60 ? 'Average' : 'Needs Improvement'
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
 * Get performance trend over multiple weeks
 * @param {string} workerId - Worker ID
 * @param {Object} supabase - Supabase client
 * @param {number} weeksBack - Number of weeks to look back
 * @returns {Promise<Array>} Performance trends
 */
const getPerformanceTrend = async (workerId, supabase, weeksBack = 4) => {
  try {
    const trends = [];
    const today = new Date();
    
    for (let i = 0; i < weeksBack; i++) {
      const weekDate = new Date(today);
      weekDate.setDate(today.getDate() - (i * 7));
      
      // Calculate week start and end dates
      const weekStart = new Date(weekDate);
      weekStart.setDate(weekDate.getDate() - weekDate.getDay()); // Sunday
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // Saturday
      
      const { data: assessments } = await supabase
        .from('work_readiness')
        .select('*')
        .eq('worker_id', workerId)
        .gte('submitted_at', weekStart.toISOString())
        .lte('submitted_at', weekEnd.toISOString());
      
      const completedCount = [...new Set(assessments?.map(a => 
        new Date(a.submitted_at).toISOString().split('T')[0]
      ) || [])].length;
      
      const completionRate = Math.min(100, (completedCount / 5) * 100); // Assuming 5 working days
      
      trends.unshift({
        weekLabel: `Week ${weeksBack - i}`,
        completionRate: Math.round(completionRate),
        kpiRating: completionRate >= 90 ? 'Excellent' : completionRate >= 75 ? 'Good' : completionRate >= 60 ? 'Average' : 'Needs Improvement',
        completedDays: completedCount,
        totalDays: 5
      });
    }
    
    return trends;
  } catch (error) {
    console.error('Error calculating performance trend:', error);
    return [];
  }
};

module.exports = {
  generatePerformanceInsights,
  generateMonitoringInsights,
  generateMonthlyInsights,
  getTeamWeeklyComparison,
  getPerformanceTrend
};

