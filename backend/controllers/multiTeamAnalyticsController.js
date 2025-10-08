const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Get multi-team analytics data for site supervisor
 */
const getMultiTeamAnalytics = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    // Calculate period start date
    const periodStart = getPeriodStart(period);
    
    // Fetch all team leaders and their teams
    const { data: teamLeaders, error: leadersError } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        team,
        managed_teams
      `)
      .eq('role', 'team_leader')
      .eq('is_active', true);

    if (leadersError) {
      console.error('Error fetching team leaders:', leadersError);
      return res.status(500).json({ 
        message: 'Failed to fetch team leaders', 
        error: leadersError.message 
      });
    }

    // Fetch all workers grouped by team
    const { data: workers, error: workersError } = await supabase
      .from('users')
      .select('id, first_name, last_name, team, team_leader_id, is_active')
      .eq('role', 'worker')
      .eq('is_active', true);

    if (workersError) {
      console.error('Error fetching workers:', workersError);
      return res.status(500).json({ 
        message: 'Failed to fetch workers', 
        error: workersError.message 
      });
    }

    // Fetch work readiness data for the selected period
    const { data: workReadiness, error: readinessError } = await supabase
      .from('work_readiness')
      .select(`
        *,
        worker:users!work_readiness_worker_id_fkey(id, first_name, last_name, team, team_leader_id)
      `)
      .gte('submitted_at', periodStart);

    if (readinessError) {
      console.error('Error fetching work readiness data:', readinessError);
      return res.status(500).json({ 
        message: 'Failed to fetch work readiness data', 
        error: readinessError.message 
      });
    }

    // Fetch assignments data
    const { data: assignments, error: assignmentsError } = await supabase
      .from('work_readiness_assignments')
      .select(`
        *,
        worker:users!work_readiness_assignments_worker_id_fkey(id, first_name, last_name, team, team_leader_id)
      `)
      .gte('assigned_date', periodStart);

    if (assignmentsError) {
      console.error('Error fetching assignments data:', assignmentsError);
      return res.status(500).json({ 
        message: 'Failed to fetch assignments data', 
        error: assignmentsError.message 
      });
    }

    // Process data to create team performance metrics
    const teamPerformance = processTeamPerformance(
      teamLeaders || [],
      workers || [],
      workReadiness || [],
      assignments || []
    );

    // Calculate multi-team metrics
    const multiTeamMetrics = calculateMultiTeamMetrics(teamPerformance);

    // Calculate team leader performance
    const teamLeaderPerformance = calculateTeamLeaderPerformance(
      teamLeaders || [],
      workers || [],
      workReadiness || [],
      assignments || []
    );

    // Generate strategic insights
    const strategicInsights = generateStrategicInsights(
      teamPerformance,
      multiTeamMetrics,
      teamLeaderPerformance
    );

    res.json({
      success: true,
      data: {
        teamPerformance,
        multiTeamMetrics,
        teamLeaderPerformance,
        strategicInsights,
        period,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in getMultiTeamAnalytics:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  }
};

/**
 * Get team performance comparison data
 */
const getTeamPerformanceComparison = async (req, res) => {
  try {
    const { teamIds, period = 'month' } = req.query;
    const periodStart = getPeriodStart(period);
    
    // If specific team IDs provided, filter by them
    let teamLeadersQuery = supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        team,
        managed_teams
      `)
      .eq('role', 'team_leader')
      .eq('is_active', true);

    if (teamIds) {
      const teamIdArray = Array.isArray(teamIds) ? teamIds : [teamIds];
      teamLeadersQuery = teamLeadersQuery.in('id', teamIdArray);
    }

    const { data: teamLeaders, error: leadersError } = await teamLeadersQuery;

    if (leadersError) {
      return res.status(500).json({ 
        message: 'Failed to fetch team leaders', 
        error: leadersError.message 
      });
    }

    // Fetch related data and process
    const { data: workers } = await supabase
      .from('users')
      .select('id, first_name, last_name, team, team_leader_id, is_active')
      .eq('role', 'worker')
      .eq('is_active', true);

    const { data: workReadiness } = await supabase
      .from('work_readiness')
      .select(`
        *,
        worker:users!work_readiness_worker_id_fkey(id, first_name, last_name, team, team_leader_id)
      `)
      .gte('submitted_at', periodStart);

    const { data: assignments } = await supabase
      .from('work_readiness_assignments')
      .select(`
        *,
        worker:users!work_readiness_assignments_worker_id_fkey(id, first_name, last_name, team, team_leader_id)
      `)
      .gte('assigned_date', periodStart);

    const teamPerformance = processTeamPerformance(
      teamLeaders || [],
      workers || [],
      workReadiness || [],
      assignments || []
    );

    res.json({
      success: true,
      data: {
        teamPerformance,
        period,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in getTeamPerformanceComparison:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  }
};

/**
 * Get team leader performance trends for line chart
 */
const getTeamLeaderPerformanceTrends = async (req, res) => {
  try {
    const { period = 'weekly', date } = req.query;
    
    // Calculate period start date based on selected date
    const selectedDate = date ? new Date(date) : new Date();
    const periodStart = getTrendPeriodStart(period, selectedDate);
    
    // Fetch all team leaders
    const { data: teamLeaders, error: leadersError } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        team,
        managed_teams
      `)
      .eq('role', 'team_leader')
      .eq('is_active', true);

    if (leadersError) {
      return res.status(500).json({ 
        message: 'Failed to fetch team leaders', 
        error: leadersError.message 
      });
    }

    // Fetch workers
    const { data: workers } = await supabase
      .from('users')
      .select('id, first_name, last_name, team, team_leader_id, is_active')
      .eq('role', 'worker')
      .eq('is_active', true);

    // Generate data points for the selected period
    const dataPoints = await generatePerformanceDataPoints(period, selectedDate, teamLeaders, workers);
    
    console.log('📊 Generated data points:', dataPoints);
    console.log('📊 Team leaders count:', teamLeaders?.length);
    console.log('📊 Workers count:', workers?.length);
    
    res.json({
      success: true,
      data: {
        performanceTrends: dataPoints,
        period,
        selectedDate: selectedDate.toISOString().split('T')[0],
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in getTeamLeaderPerformanceTrends:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  }
};

/**
 * Get team leader performance analytics
 */
const getTeamLeaderPerformance = async (req, res) => {
  try {
    const { leaderIds, period = 'month' } = req.query;
    const periodStart = getPeriodStart(period);
    
    let teamLeadersQuery = supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        team,
        managed_teams
      `)
      .eq('role', 'team_leader')
      .eq('is_active', true);

    if (leaderIds) {
      const leaderIdArray = Array.isArray(leaderIds) ? leaderIds : [leaderIds];
      teamLeadersQuery = teamLeadersQuery.in('id', leaderIdArray);
    }

    const { data: teamLeaders, error: leadersError } = await teamLeadersQuery;

    if (leadersError) {
      return res.status(500).json({ 
        message: 'Failed to fetch team leaders', 
        error: leadersError.message 
      });
    }

    // Fetch related data
    const { data: workers } = await supabase
      .from('users')
      .select('id, first_name, last_name, team, team_leader_id, is_active')
      .eq('role', 'worker')
      .eq('is_active', true);

    const { data: workReadiness } = await supabase
      .from('work_readiness')
      .select(`
        *,
        worker:users!work_readiness_worker_id_fkey(id, first_name, last_name, team, team_leader_id)
      `)
      .gte('submitted_at', periodStart);

    const { data: assignments } = await supabase
      .from('work_readiness_assignments')
      .select(`
        *,
        worker:users!work_readiness_assignments_worker_id_fkey(id, first_name, last_name, team, team_leader_id)
      `)
      .gte('assigned_date', periodStart);

    const teamLeaderPerformance = calculateTeamLeaderPerformance(
      teamLeaders || [],
      workers || [],
      workReadiness || [],
      assignments || []
    );

    res.json({
      success: true,
      data: {
        teamLeaderPerformance,
        period,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in getTeamLeaderPerformance:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message 
    });
  }
};

// Helper functions

const getPeriodStart = (period) => {
  const now = new Date();
  switch (period) {
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    case 'month':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    case 'quarter':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }
};

const getTrendPeriodStart = (period, selectedDate) => {
  const date = new Date(selectedDate);
  switch (period) {
    case 'daily':
      return new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    case 'weekly':
      return new Date(date.getTime() - 4 * 7 * 24 * 60 * 60 * 1000).toISOString();
    case 'monthly':
      return new Date(date.getTime() - 12 * 30 * 24 * 60 * 60 * 1000).toISOString();
    default:
      return new Date(date.getTime() - 4 * 7 * 24 * 60 * 60 * 1000).toISOString();
  }
};

const generatePerformanceDataPoints = async (period, selectedDate, teamLeaders, workers) => {
  const dataPoints = [];
  const baseDate = new Date(selectedDate);
  
  // Determine number of points and increment based on period
  let pointsCount, increment;
  switch (period) {
    case 'daily':
      pointsCount = 7;
      increment = 1; // days
      break;
    case 'weekly':
      pointsCount = 4;
      increment = 7; // days
      break;
    case 'monthly':
      pointsCount = 12;
      increment = 30; // days
      break;
    default:
      pointsCount = 4;
      increment = 7;
  }

  // Generate data points
  for (let i = pointsCount - 1; i >= 0; i--) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() - (i * increment));
    const dateStr = date.toISOString().split('T')[0];
    
    // Calculate performance metrics for this date
    const dayStart = `${dateStr}T00:00:00.000Z`;
    const dayEnd = `${dateStr}T23:59:59.999Z`;
    
    // Fetch work readiness data for this specific date
    const { data: workReadiness } = await supabase
      .from('work_readiness')
      .select('*, worker:users!work_readiness_worker_id_fkey(id, first_name, last_name, team, team_leader_id)')
      .gte('submitted_at', dayStart)
      .lte('submitted_at', dayEnd);

    // Fetch assignments for this specific date
    const { data: assignments } = await supabase
      .from('work_readiness_assignments')
      .select('*, worker:users!work_readiness_assignments_worker_id_fkey(id, first_name, last_name, team, team_leader_id)')
      .gte('assigned_date', dayStart)
      .lte('assigned_date', dayEnd);

    console.log(`📅 Date ${dateStr}: Work Readiness: ${workReadiness?.length || 0}, Assignments: ${assignments?.length || 0}`);

    // Calculate aggregated metrics for all team leaders
    const metrics = calculateAggregatedMetrics(teamLeaders, workers, workReadiness || [], assignments || []);
    
    dataPoints.push({
      date: dateStr,
      managementScore: metrics.managementScore,
      efficiencyRating: metrics.efficiencyRating,
      workerSatisfaction: metrics.workerSatisfaction,
      complianceRate: metrics.complianceRate,
      healthScore: metrics.healthScore
    });
  }

  return dataPoints;
};

const calculateAggregatedMetrics = (teamLeaders, workers, workReadiness, assignments) => {
  // Calculate aggregated metrics across all team leaders using MonthlyAssignmentTracking logic
  
  const totalAssignments = assignments.length;
  const completedAssignments = assignments.filter(a => a.status === 'completed').length;
  
  // Calculate completion rate (Management Score)
  const completionRate = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0;
  
  // Calculate on-time submissions (within 24 hours)
  const onTimeSubmissions = assignments.filter(a => {
    if (a.status !== 'completed') return false;
    const assignedDate = new Date(a.assigned_date);
    const completedDate = new Date(a.completed_at || a.updated_at);
    return completedDate <= new Date(assignedDate.getTime() + 24 * 60 * 60 * 1000);
  }).length;
  
  // Calculate on-time rate (Efficiency Rating)
  const onTimeRate = completedAssignments > 0 ? (onTimeSubmissions / completedAssignments) * 100 : 0;
  
  // Calculate average response time (in hours)
  const completedWithTime = assignments.filter(a => a.completed_at);
  const totalResponseTime = completedWithTime.reduce((sum, a) => {
    const assignedDate = new Date(a.assigned_date);
    const completedDate = new Date(a.completed_at);
    return sum + (completedDate.getTime() - assignedDate.getTime()) / (1000 * 60 * 60);
  }, 0);
  const averageResponseTime = completedWithTime.length > 0 ? totalResponseTime / completedWithTime.length : 0;
  
  // Calculate team health score based on readiness levels from completed assignments
  let teamHealthScore = 0;
  if (completedAssignments > 0) {
    const readinessScores = assignments
      .filter(a => a.status === 'completed' && a.work_readiness?.readiness_level)
      .map(a => {
        const level = a.work_readiness.readiness_level;
        return level === 'fit' ? 100 : level === 'minor' ? 75 : level === 'not_fit' ? 25 : 0;
      });
    
    if (readinessScores.length > 0) {
      teamHealthScore = readinessScores.reduce((sum, score) => sum + score, 0) / readinessScores.length;
    } else {
      // Fallback calculation based on completion rate
      teamHealthScore = Math.min(100, completionRate);
    }
  }
  
  // Calculate high risk reports
  const highRiskReports = assignments.filter(a => 
    a.status === 'completed' && 
    a.work_readiness?.readiness_level === 'not_fit'
  ).length;
  
  // Worker satisfaction based on readiness levels
  let workerSatisfaction = 0;
  if (workReadiness.length > 0) {
    const satisfactionScores = workReadiness.map(wr => {
      const level = wr.readiness_level;
      return level === 'fit' ? 100 : level === 'minor' ? 75 : level === 'not_fit' ? 25 : 0;
    });
    workerSatisfaction = satisfactionScores.reduce((sum, score) => sum + score, 0) / satisfactionScores.length;
  }
  
  return {
    managementScore: Math.round(completionRate * 10) / 10,
    efficiencyRating: Math.round(onTimeRate * 10) / 10,
    workerSatisfaction: Math.round(workerSatisfaction * 10) / 10,
    complianceRate: Math.round(completionRate * 10) / 10, // Same as management score
    healthScore: Math.round(teamHealthScore * 10) / 10,
    averageResponseTime: Math.round(averageResponseTime * 10) / 10,
    highRiskReports: highRiskReports,
    totalAssignments: totalAssignments,
    completedAssignments: completedAssignments,
    onTimeSubmissions: onTimeSubmissions
  };
};

const processTeamPerformance = (teamLeaders, workers, workReadiness, assignments) => {
  return teamLeaders.map(leader => {
    const teamWorkers = workers.filter(w => w.team_leader_id === leader.id);
    const teamReadiness = workReadiness.filter(wr => 
      teamWorkers.some(tw => tw.id === wr.worker_id)
    );
    const teamAssignments = assignments.filter(a => 
      teamWorkers.some(tw => tw.id === a.worker_id)
    );

    const completedAssignments = teamAssignments.filter(a => a.status === 'completed').length;
    const totalAssignments = teamAssignments.length;
    const completionRate = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0;

    // Calculate health score based on readiness levels
    const readinessScores = teamReadiness.map(wr => {
      const level = wr.readiness_level;
      return level === 'fit' ? 100 : level === 'minor' ? 75 : level === 'not_fit' ? 25 : 0;
    });
    const healthScore = readinessScores.length > 0 
      ? readinessScores.reduce((sum, score) => sum + score, 0) / readinessScores.length 
      : 0;

    const highRiskReports = teamReadiness.filter(wr => wr.readiness_level === 'not_fit').length;

    // Calculate average response time (placeholder - would need actual response time data)
    const averageResponseTime = 0;

    return {
      teamName: leader.team || 'Unassigned Team',
      teamLeader: `${leader.first_name} ${leader.last_name}`,
      teamLeaderId: leader.id,
      workerCount: teamWorkers.length,
      activeWorkers: teamWorkers.filter(w => w.is_active).length,
      complianceRate: completionRate,
      healthScore: healthScore,
      activeCases: 0, // Will be implemented when cases are connected
      completedAssignments,
      totalAssignments,
      averageResponseTime,
      highRiskReports,
      trend: completionRate > 80 ? 'up' : completionRate < 60 ? 'down' : 'stable',
      lastUpdated: new Date().toISOString()
    };
  });
};

const calculateMultiTeamMetrics = (teamPerformance) => {
  const totalTeams = teamPerformance.length;
  const totalWorkers = teamPerformance.reduce((sum, team) => sum + team.workerCount, 0);
  const totalTeamLeaders = totalTeams;
  const overallComplianceRate = teamPerformance.length > 0 
    ? teamPerformance.reduce((sum, team) => sum + team.complianceRate, 0) / teamPerformance.length 
    : 0;
  const crossTeamHealthScore = teamPerformance.length > 0 
    ? teamPerformance.reduce((sum, team) => sum + team.healthScore, 0) / teamPerformance.length 
    : 0;
  const totalActiveCases = teamPerformance.reduce((sum, team) => sum + team.activeCases, 0);
  const totalAssignments = teamPerformance.reduce((sum, team) => sum + team.totalAssignments, 0);
  const totalCompletedAssignments = teamPerformance.reduce((sum, team) => sum + team.completedAssignments, 0);
  const averageResponseTime = teamPerformance.length > 0 
    ? teamPerformance.reduce((sum, team) => sum + team.averageResponseTime, 0) / teamPerformance.length 
    : 0;

  const topPerformingTeam = teamPerformance.length > 0 
    ? teamPerformance.reduce((top, current) => 
        current.complianceRate > top.complianceRate ? current : top
      ).teamName 
    : 'N/A';

  const needsAttentionTeam = teamPerformance.length > 0 
    ? teamPerformance.reduce((worst, current) => 
        current.complianceRate < worst.complianceRate ? current : worst
      ).teamName 
    : 'N/A';

  return {
    totalTeams,
    totalWorkers,
    totalTeamLeaders,
    overallComplianceRate,
    crossTeamHealthScore,
    totalActiveCases,
    totalAssignments,
    totalCompletedAssignments,
    averageResponseTime,
    topPerformingTeam,
    needsAttentionTeam
  };
};

const calculateTeamLeaderPerformance = (teamLeaders, workers, workReadiness, assignments) => {
  return teamLeaders.map(leader => {
    const teamWorkers = workers.filter(w => w.team_leader_id === leader.id);
    const teamReadiness = workReadiness.filter(wr => 
      teamWorkers.some(tw => tw.id === wr.worker_id)
    );
    const teamAssignments = assignments.filter(a => 
      teamWorkers.some(tw => tw.id === a.worker_id)
    );

    const completedAssignments = teamAssignments.filter(a => a.status === 'completed').length;
    const totalAssignments = teamAssignments.length;
    const efficiencyRating = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0;

    // Calculate management score based on team performance
    const managementScore = Math.min(100, efficiencyRating + (teamWorkers.length > 0 ? 20 : 0));

    // Calculate worker satisfaction (placeholder - would need actual satisfaction data)
    const workerSatisfaction = Math.min(100, managementScore * 0.9);

    const improvementAreas = [];
    const strengths = [];

    if (efficiencyRating < 70) improvementAreas.push('Assignment completion rate');
    if (teamWorkers.length < 5) improvementAreas.push('Team size optimization');
    if (teamReadiness.filter(wr => wr.readiness_level === 'not_fit').length > 2) {
      improvementAreas.push('High-risk worker management');
    }

    if (efficiencyRating > 85) strengths.push('High completion rate');
    if (teamWorkers.length > 8) strengths.push('Large team management');
    if (teamReadiness.filter(wr => wr.readiness_level === 'fit').length > teamWorkers.length * 0.8) {
      strengths.push('Excellent worker health management');
    }

    return {
      leaderName: `${leader.first_name} ${leader.last_name}`,
      leaderId: leader.id,
      teamName: leader.team || 'Unassigned Team',
      teamSize: teamWorkers.length,
      managementScore,
      workerSatisfaction,
      efficiencyRating,
      improvementAreas,
      strengths
    };
  });
};

const generateStrategicInsights = (teamPerformance, multiTeamMetrics, teamLeaderPerformance) => {
  const insights = {
    recommendations: [],
    alerts: [],
    opportunities: []
  };

  // Generate recommendations based on performance data
  if (multiTeamMetrics.overallComplianceRate < 70) {
    insights.recommendations.push({
      type: 'critical',
      title: 'Low Overall Compliance Rate',
      description: `Overall compliance rate is ${multiTeamMetrics.overallComplianceRate.toFixed(1)}%. Immediate intervention required.`,
      action: 'Review team leader training programs and implement additional support measures.'
    });
  }

  // Identify teams needing attention
  const underperformingTeams = teamPerformance.filter(team => team.complianceRate < 60);
  if (underperformingTeams.length > 0) {
    insights.alerts.push({
      type: 'warning',
      title: 'Underperforming Teams Detected',
      description: `${underperformingTeams.length} team(s) have compliance rates below 60%.`,
      teams: underperformingTeams.map(team => team.teamName)
    });
  }

  // Identify opportunities for improvement
  const topPerformers = teamLeaderPerformance.filter(leader => leader.managementScore > 85);
  if (topPerformers.length > 0) {
    insights.opportunities.push({
      type: 'success',
      title: 'Best Practices Opportunity',
      description: `${topPerformers.length} team leader(s) are performing exceptionally well.`,
      action: 'Consider creating mentorship programs where top performers can share best practices.'
    });
  }

  return insights;
};

module.exports = {
  getMultiTeamAnalytics,
  getTeamPerformanceComparison,
  getTeamLeaderPerformance,
  getTeamLeaderPerformanceTrends
};
