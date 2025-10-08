import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Avatar,
  Badge,
  Divider,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Pagination,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import { useTheme, useMediaQuery } from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  People,
  Assessment,
  Timeline,
  Analytics,
  EmojiEvents,
  HealthAndSafety,
  Speed,
  Assignment,
  Warning,
  CheckCircle,
  Group,
  SupervisorAccount,
  CompareArrows,
  Insights,
  Visibility,
  Close,
  Refresh,
  CalendarToday,
  DateRange as DateRangeIcon
} from '@mui/icons-material';
import { dataClient } from '../lib/supabase';
import PerformanceLineChart from './PerformanceLineChart';
import LayoutWithSidebar from './LayoutWithSidebar';

// Add CSS animation for refresh button
const spinAnimation = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

// Inject the CSS
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = spinAnimation;
  document.head.appendChild(style);
}

interface TeamPerformance {
  teamName: string;
  teamLeader: string;
  teamLeaderId: string;
  workerCount: number;
  activeWorkers: number;
  assignedWorkers: number;
  unassignedWorkers: number;
  todayAssignments: number;
  unselectedWorkers: Array<{
    workerId: string;
    reason: string;
    notes: string;
  }>;
  activityTodayCount: number;
  complianceRate: number;
  healthScore: number;
  activeCases: number;
  completedAssignments: number;
  totalAssignments: number;
  averageResponseTime: number;
  highRiskReports: number;
  trend: 'up' | 'down' | 'stable';
  lastUpdated: string;
}

interface MultiTeamMetrics {
  totalTeams: number;
  totalWorkers: number;
  totalTeamLeaders: number;
  overallComplianceRate: number;
  crossTeamHealthScore: number;
  totalActiveCases: number;
  totalAssignments: number;
  totalCompletedAssignments: number;
  averageResponseTime: number;
  topPerformingTeam: string;
  needsAttentionTeam: string;
}

interface TeamLeaderPerformance {
  leaderName: string;
  leaderId: string;
  teamName: string;
  teamSize: number;
  managementScore: number;
  workerSatisfaction: number;
  efficiencyRating: number;
  responseTimeScore: number;
  qualityScore: number;
  overallGrade: string;
  improvementAreas: string[];
  strengths: string[];
  trendDirection: 'up' | 'down' | 'stable';
}

const MultiTeamAnalytics: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  
  // Data states
  const [teamPerformance, setTeamPerformance] = useState<TeamPerformance[]>([]);
  const [multiTeamMetrics, setMultiTeamMetrics] = useState<MultiTeamMetrics | null>(null);
  const [teamLeaderPerformance, setTeamLeaderPerformance] = useState<TeamLeaderPerformance[]>([]);
  const [insights, setInsights] = useState<{ recommendations: any[]; alerts: any[]; opportunities: any[] } | null>(null);
  const [viewDetailsDialog, setViewDetailsDialog] = useState<{
    open: boolean;
    team: TeamPerformance | null;
  }>({ open: false, team: null });
  // Date filter for Active Teams and DB queries
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dateRangeMode, setDateRangeMode] = useState<'single' | 'range'>('single');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  // Simple in-memory cache by key (period|date)
  const cacheRef = React.useRef<Map<string, any>>(new Map());
  // Prevent race conditions on fast filter changes
  const requestSeqRef = React.useRef<number>(0);
  
  // Pagination states
  const [comparisonPage, setComparisonPage] = useState(1);
  const [leaderPage, setLeaderPage] = useState(1);
  const [inactivePage, setInactivePage] = useState(1);
  const itemsPerPage = 10;
  
  // Manual refresh function
  const handleManualRefresh = () => {
    console.log('🔄 Manual refresh triggered');
    const cacheKey = dateRangeMode === 'range' 
      ? `range_${startDate}_${endDate}`
      : `data_${selectedDate}`;
    cacheRef.current.delete(cacheKey);
    console.log('🗑️ Cache cleared for key:', cacheKey);
    fetchMultiTeamData();
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMultiTeamData();
    }, 250); // debounce to reduce query spam
    return () => clearTimeout(timer);
  }, [selectedDate, dateRangeMode, startDate, endDate]);
  
  // Auto-refresh every 30 seconds for real-time updates
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      // Clear cache and refetch for current date/range
      const cacheKey = dateRangeMode === 'range' 
        ? `range_${startDate}_${endDate}`
        : `data_${selectedDate}`;
      cacheRef.current.delete(cacheKey);
      fetchMultiTeamData();
    }, 30000); // 30 seconds
    
    return () => clearInterval(refreshInterval);
  }, [selectedDate, dateRangeMode, startDate, endDate]);

  const fetchMultiTeamData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Build cache key based on mode (single date or range)
      const cacheKey = dateRangeMode === 'range' 
        ? `range_${startDate}_${endDate}`
        : `data_${selectedDate}`;
      
      console.log('🔍 Fetching multi-team data for:', { selectedDate, dateRangeMode, startDate, endDate, cacheKey });
      
      // Check cache first
      if (cacheRef.current.has(cacheKey)) {
        const cached = cacheRef.current.get(cacheKey);
        const cacheAge = Date.now() - cached.timestamp;
        
        console.log('📦 Cache found, age:', cacheAge, 'ms');
        
        // Use cache if less than 30 seconds old
        if (cacheAge < 30000) {
        console.log('✅ Using cached data');
        setTeamPerformance(cached.teamPerformance);
        setMultiTeamMetrics(cached.multiTeamMetrics);
        setTeamLeaderPerformance(cached.teamLeaderPerformance);
        setInsights(cached.insights);
        setLoading(false);
        return;
        } else {
          console.log('⏰ Cache expired, fetching fresh data');
        }
      } else {
        console.log('🆕 No cache found, fetching fresh data');
      }

      const currentSeq = ++requestSeqRef.current;
      // Fetch all team leaders and their teams
      const teamLeadersPromise = dataClient
        .from('users')
        .select('id, first_name, last_name, team, managed_teams')
        .eq('role', 'team_leader')
        .eq('is_active', true);

      // Fetch all active workers (minimal columns)
      const workersPromise = dataClient
        .from('users')
        .select('id, team, team_leader_id, is_active')
        .eq('role', 'worker')
        .eq('is_active', true);

      // Determine date range based on mode
      let queryStartDate: string;
      let queryEndDate: string;
      
      if (dateRangeMode === 'range') {
        // Range mode: Use user-selected range
        queryStartDate = startDate;
        queryEndDate = endDate;
      } else {
        // Single date mode: Get 30 days before selected date for comprehensive KPI
        const endDateObj = new Date(selectedDate);
        endDateObj.setHours(23, 59, 59, 999);
        
        const startDateObj = new Date(endDateObj);
        startDateObj.setDate(startDateObj.getDate() - 30); // Last 30 days
        startDateObj.setHours(0, 0, 0, 0);
        
        queryStartDate = startDateObj.toISOString().split('T')[0];
        queryEndDate = selectedDate;
      }
      
      console.log('📅 Date range for queries:', { queryStartDate, queryEndDate, selectedDate });
      
      // Get work readiness for the date range
      const wrPromise = dataClient
        .from('work_readiness')
        .select('id, worker_id, readiness_level, submitted_at')
        .gte('submitted_at', `${queryStartDate}T00:00:00.000Z`)
        .lte('submitted_at', `${queryEndDate}T23:59:59.999Z`);

      // Fetch assignments for the date range (to include overdue ones)
      const aPromise = dataClient
        .from('work_readiness_assignments')
        .select('id, worker_id, status, assigned_date, completed_at, due_time')
        .gte('assigned_date', queryStartDate)
        .lte('assigned_date', queryEndDate);
        
      console.log('🔍 Database query filters:', {
        workReadiness: `submitted_at >= ${queryStartDate}T00:00:00.000Z AND submitted_at <= ${queryEndDate}T23:59:59.999Z`,
        assignments: `assigned_date >= ${queryStartDate} AND assigned_date <= ${queryEndDate}`
      });

      // Fetch cases within period (for active case counts)
      const cPromise = dataClient
        .from('cases')
        .select('id, worker_id, status, created_at')
        .gte('created_at', `${queryStartDate}T00:00:00.000Z`)
        .lte('created_at', `${queryEndDate}T23:59:59.999Z`);

      // Fetch unselected workers data (with valid reasons - these should be excluded from KPI penalties)
      const uPromise = dataClient
        .from('unselected_workers')
        .select('id, worker_id, team_leader_id, reason, notes, created_at')
        .gte('created_at', `${queryStartDate}T00:00:00.000Z`)
        .lte('created_at', `${queryEndDate}T23:59:59.999Z`);

      const [
        { data: teamLeaders, error: leadersError },
        { data: workers, error: workersError },
        { data: workReadiness, error: readinessError },
        { data: assignments, error: assignmentsError },
        { data: cases, error: casesError },
        { data: unselectedWorkers, error: unselectedError }
      ] = await Promise.all([teamLeadersPromise, workersPromise, wrPromise, aPromise, cPromise, uPromise]);

      if (leadersError) throw leadersError;
      if (workersError) throw workersError;
      if (readinessError) throw readinessError;
      if (assignmentsError) throw assignmentsError;
      if (casesError) throw casesError;
      if (unselectedError) throw unselectedError;

      console.log('📊 Raw data counts:', {
        teamLeaders: teamLeaders?.length || 0,
        workers: workers?.length || 0,
        workReadiness: workReadiness?.length || 0,
        assignments: assignments?.length || 0,
        cases: cases?.length || 0,
        unselectedWorkers: unselectedWorkers?.length || 0
      });

      const processedTeamPerformance = processTeamPerformance(
        teamLeaders || [],
        workers || [],
        workReadiness || [],
        assignments || [],
        cases || [],
        unselectedWorkers || []
      );

      console.log('🎯 Processed team performance:', processedTeamPerformance.map(t => ({
        teamName: t.teamName,
        complianceRate: t.complianceRate,
        totalAssignments: t.totalAssignments,
        assignedWorkers: t.assignedWorkers,
        activityTodayCount: t.activityTodayCount
      })));

      const processedMultiTeamMetrics = calculateMultiTeamMetrics(processedTeamPerformance);

      const processedTeamLeaderPerformance = calculateTeamLeaderPerformance(
        teamLeaders || [],
        workers || [],
        workReadiness || [],
        assignments || []
      );

      // Ignore stale responses
      if (currentSeq !== requestSeqRef.current) {
        console.log('⚠️ Ignoring stale response, currentSeq:', currentSeq, 'requestSeqRef.current:', requestSeqRef.current);
        return;
      }

      const generatedInsights = generateStrategicInsights(processedTeamPerformance, processedTeamLeaderPerformance, processedMultiTeamMetrics);

      console.log('✅ Setting processed data to state');
      setTeamPerformance(processedTeamPerformance);
      setMultiTeamMetrics(processedMultiTeamMetrics);
      setTeamLeaderPerformance(processedTeamLeaderPerformance);
      setInsights(generatedInsights);

      // Cache the result with timestamp for proper expiration
      cacheRef.current.set(cacheKey, {
        teamPerformance: processedTeamPerformance,
        multiTeamMetrics: processedMultiTeamMetrics,
        teamLeaderPerformance: processedTeamLeaderPerformance,
        insights: generatedInsights,
        timestamp: Date.now()
      });

    } catch (err) {
      console.error('Error fetching multi-team data:', err);
      setError('Failed to load multi-team analytics data');
    } finally {
      setLoading(false);
    }
  };

  const generateStrategicInsights = (
    teams: TeamPerformance[],
    leaders: TeamLeaderPerformance[],
    metrics: MultiTeamMetrics | null
  ) => {
    const out = { recommendations: [] as any[], alerts: [] as any[], opportunities: [] as any[] };
    if (!metrics) return out;

    // Alerts: underperforming teams (compliance < 60) with activity
    const underperforming = teams.filter(t => t.totalAssignments > 0 && t.complianceRate < 60);
    if (underperforming.length > 0) {
      out.alerts.push({
        title: 'Underperforming Teams Detected',
        description: `${underperforming.length} team(s) below 60% compliance`,
        teams: underperforming.map(t => t.teamName)
      });
    }

    // Alerts: high risk volume (not_fit) above threshold
    const highRiskTeams = teams
      .filter(t => t.totalAssignments > 0)
      .filter(t => t.highRiskReports >= Math.max(2, Math.ceil(t.totalAssignments * 0.15)));
    if (highRiskTeams.length > 0) {
      out.alerts.push({
        title: 'High Risk Reports',
        description: `${highRiskTeams.length} team(s) with elevated not_fit reports`,
        teams: highRiskTeams.map(t => t.teamName)
      });
    }

    // Recommendations: resource reallocation if there is a significant gap in compliance
    const activeTeams = teams.filter(t => t.totalAssignments > 0).slice().sort((a, b) => b.complianceRate - a.complianceRate);
    if (activeTeams.length >= 2) {
      const best = activeTeams[0];
      const worst = activeTeams[activeTeams.length - 1];
      if ((best.complianceRate - worst.complianceRate) >= 20) {
        out.recommendations.push({
          title: 'Resource Reallocation',
          description: `Share best practices from ${best.teamName} to ${worst.teamName} (∆ ${Math.round(best.complianceRate - worst.complianceRate)}%)`
        });
      }
    }

    // Recommendations: coaching leaders with low management score but sufficient team size
    const coachingLeaders = leaders.filter(l => l.teamSize >= 5 && l.managementScore > 0 && l.managementScore < 60);
    if (coachingLeaders.length > 0) {
      out.recommendations.push({
        title: 'Leader Coaching',
        description: `Provide coaching for ${coachingLeaders.map(l => l.leaderName).slice(0, 3).join(', ')}${coachingLeaders.length > 3 ? '…' : ''}`
      });
    }

    // Recommendations: reduce response time for teams with high averageResponseTime (> 24h)
    const slowResponseTeams = teams.filter(t => t.totalAssignments > 0 && t.averageResponseTime > 24);
    if (slowResponseTeams.length > 0) {
      out.recommendations.push({
        title: 'Reduce Response Time',
        description: `${slowResponseTeams.length} team(s) avg response time > 24h — review assignment process`
      });
    }

    // Opportunities: highlight consistently strong leaders
    const strongLeaders = leaders.filter(l => l.managementScore >= 85);
    if (strongLeaders.length > 0) {
      out.opportunities.push({
        title: 'Mentorship Opportunity',
        description: `Invite ${strongLeaders.map(l => l.leaderName).slice(0, 3).join(', ')}${strongLeaders.length > 3 ? '…' : ''} to mentor others`
      });
    }

    // Recommendations: initiate activity for inactive teams
    const inactiveTeams = teams.filter(t => t.totalAssignments === 0);
    if (inactiveTeams.length > 0) {
      out.recommendations.push({
        title: 'Kickstart Inactive Teams',
        description: `Begin assignments for ${inactiveTeams.map(t => t.teamName).slice(0, 3).join(', ')}${inactiveTeams.length > 3 ? '…' : ''}`
      });
    }

    return out;
  };

  // No period filter; daily filter only

  const processTeamPerformance = (
    teamLeaders: any[],
    workers: any[],
    workReadiness: any[],
    assignments: any[],
    cases: any[],
    unselectedWorkers: any[]
  ): TeamPerformance[] => {
    return teamLeaders.map(leader => {
      const teamWorkers = workers.filter(w => w.team_leader_id === leader.id);
      const teamReadiness = workReadiness.filter((wr: any) => 
        teamWorkers.some(tw => tw.id === wr.worker_id)
      );
      const teamAssignments = assignments.filter((a: any) => 
        teamWorkers.some(tw => tw.id === a.worker_id)
      );
      const teamCases = cases.filter((c: any) => 
        teamWorkers.some(tw => tw.id === c.worker_id)
      );
      const teamUnselected = unselectedWorkers.filter((u: any) => u.team_leader_id === leader.id);

      // Daily-based metrics
      const today = selectedDate; // already YYYY-MM-DD
      const assignmentsToday = teamAssignments.filter((a: any) => a.assigned_date && a.assigned_date.startsWith(today));
      
      // CRITICAL FIX: Exclude cancelled assignments from all calculations
      const validAssignmentsToday = assignmentsToday.filter((a: any) => a.status !== 'cancelled');
      const assignedWorkerIdsToday = new Set(validAssignmentsToday.map((a: any) => a.worker_id));
      const unselectedWorkerIdsToday = new Set(teamUnselected.map((u: any) => u.worker_id));

      // Assigned today (excluding unselected with reasons AND cancelled assignments)
      const assignedTodayCount = Array.from(assignedWorkerIdsToday).filter((id: any) => !unselectedWorkerIdsToday.has(id)).length;

      // Completed today = completed assignments among those assigned today (excluding cancelled)
      const completedToday = validAssignmentsToday.filter((a: any) => a.status === 'completed').length;

      // Compliance today = completedToday / assignedTodayCount (cancelled assignments excluded)
      const completionRate = assignedTodayCount > 0 ? (completedToday / assignedTodayCount) * 100 : 0;

      const cancelledToday = assignmentsToday.filter((a: any) => a.status === 'cancelled').length;
      
      console.log(`🔍 Team ${leader.team || 'Unassigned'} (${leader.first_name} ${leader.last_name}):`, {
        today,
        totalAssignmentsToday: assignmentsToday.length,
        validAssignmentsToday: validAssignmentsToday.length,
        cancelledAssignmentsToday: cancelledToday,
        assignmentsTodayData: assignmentsToday.map(a => ({
          worker_id: a.worker_id,
          status: a.status,
          assigned_date: a.assigned_date,
          completed_at: a.completed_at
        })),
        assignedWorkerIdsToday: Array.from(assignedWorkerIdsToday),
        unselectedWorkerIdsToday: Array.from(unselectedWorkerIdsToday),
        assignedTodayCount,
        completedToday,
        completionRate: completionRate.toFixed(1) + '%'
      });

      const todayAssignments = assignedTodayCount;

      // Activity today includes assignments created today and readiness submissions today
      const readinessToday = teamReadiness.filter((wr: any) => typeof wr.submitted_at === 'string' && wr.submitted_at.startsWith(today)).length;
      const activityTodayCount = todayAssignments + readinessToday;

      // Calculate unassigned workers (total workers - assigned workers - unselected workers)
      const unassignedWorkers = teamWorkers.filter(w => 
        !assignedWorkerIdsToday.has(w.id) && !unselectedWorkerIdsToday.has(w.id)
      ).length;

      const readinessScores = teamReadiness.map((wr: any) => {
        const level = wr.readiness_level;
        return level === 'fit' ? 100 : level === 'minor' ? 75 : level === 'not_fit' ? 25 : 0;
      });
      const healthScore = readinessScores.length > 0 
        ? readinessScores.reduce((sum: number, score: number) => sum + score, 0) / readinessScores.length 
        : 0;

      // Check if team leader has started any activity for the selected day
      const hasStartedActivity = assignedTodayCount > 0 || readinessToday > 0;

      const highRiskReports = teamReadiness.filter((wr: any) => wr.readiness_level === 'not_fit').length;

      // Compute average response time (hours) from assigned_date -> completed_at on completed
      const completedWithTime = teamAssignments.filter((a: any) => a.status === 'completed' && a.assigned_date && a.completed_at);
      const totalResponseHrs = completedWithTime.reduce((sum: number, a: any) => {
        const start = new Date(a.assigned_date).getTime();
        const done = new Date(a.completed_at).getTime();
        if (isNaN(start) || isNaN(done) || done < start) return sum;
        return sum + (done - start) / (1000 * 60 * 60);
      }, 0);
      const averageResponseTime = completedWithTime.length > 0 ? totalResponseHrs / completedWithTime.length : 0;

      // Active cases = cases not closed/resolved
      const activeCases = teamCases.filter((c: any) => (c.status || '').toLowerCase() !== 'closed' && (c.status || '').toLowerCase() !== 'resolved').length;

      // Calculate active workers only (exclude inactive workers from total count)
      const activeWorkers = teamWorkers.filter(w => w.is_active);
      const activeWorkerCount = activeWorkers.length;
      
      console.log(`👥 Team ${leader.team || 'Unassigned'} Worker Count:`, {
        totalWorkers: teamWorkers.length,
        activeWorkers: activeWorkerCount,
        inactiveWorkers: teamWorkers.length - activeWorkerCount,
        workerDetails: teamWorkers.map(w => ({
          id: w.id,
          is_active: w.is_active,
          team_leader_id: w.team_leader_id
        }))
      });

      return {
        teamName: leader.team || 'Unassigned Team',
        teamLeader: `${leader.first_name} ${leader.last_name}`,
        teamLeaderId: leader.id,
        workerCount: activeWorkerCount, // FIXED: Only count active workers
        activeWorkers: activeWorkerCount,
        assignedWorkers: assignedTodayCount,
        unassignedWorkers,
        todayAssignments,
        activityTodayCount,
        unselectedWorkers: teamUnselected.map((u: any) => ({
          workerId: u.worker_id,
          reason: u.reason || 'No reason provided',
          notes: u.notes || ''
        })),
        complianceRate: hasStartedActivity ? completionRate : 0,
        healthScore: hasStartedActivity ? healthScore : 0,
        activeCases,
        completedAssignments: completedToday,
        totalAssignments: assignedTodayCount,
        averageResponseTime: hasStartedActivity ? averageResponseTime : 0,
        highRiskReports,
        trend: hasStartedActivity ? (completionRate > 80 ? 'up' : completionRate < 60 ? 'down' : 'stable') : 'stable',
        lastUpdated: new Date().toISOString()
      };
    });
  };

  const calculateMultiTeamMetrics = (teamPerformance: TeamPerformance[]): MultiTeamMetrics => {
    const totalTeams = teamPerformance.length;
    const totalWorkers = teamPerformance.reduce((sum, team) => sum + team.workerCount, 0);
    const totalTeamLeaders = totalTeams;
    
    console.log('📊 Multi-Team Metrics Calculation:', {
      totalTeams,
      totalWorkers,
      teamBreakdown: teamPerformance.map(t => ({
        teamName: t.teamName,
        workerCount: t.workerCount,
        activeWorkers: t.activeWorkers
      }))
    });
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

  const calculateTeamLeaderPerformance = (
    teamLeaders: any[],
    workers: any[],
    workReadiness: any[],
    assignments: any[]
  ): TeamLeaderPerformance[] => {
    const now = new Date();
    
    return teamLeaders.map(leader => {
      // Get team workers (exclude those with unassigned reasons)
      const teamWorkers = workers.filter(w => w.team_leader_id === leader.id);
      const teamReadiness = workReadiness.filter((wr: any) => 
        teamWorkers.some(tw => tw.id === wr.worker_id)
      );
      const teamAssignments = assignments.filter((a: any) => 
        teamWorkers.some(tw => tw.id === a.worker_id)
      );

      // CRITICAL: Only count assignments that have reached deadline OR are completed
      // EXCLUDE cancelled assignments from all calculations
      // This includes historical data (not just today)
      const eligibleAssignments = teamAssignments.filter((a: any) => {
        // First exclude cancelled assignments
        if (a.status === 'cancelled') return false;
        
        const isCompleted = a.status === 'completed';
        // due_time is TIMESTAMP, combine with assigned_date for actual deadline
        const dueTime = a.due_time ? new Date(a.due_time) : null;
        const hasReachedDeadline = dueTime ? now >= dueTime : false;
        
        return isCompleted || hasReachedDeadline;
      });

      // Separate completed vs overdue/missed
      const completedAssignments = eligibleAssignments.filter((a: any) => a.status === 'completed').length;
      const overdueAssignments = eligibleAssignments.filter((a: any) => {
        const dueTime = a.due_time ? new Date(a.due_time) : null;
        return a.status !== 'completed' && dueTime && now >= dueTime;
      }).length;
      
      const totalEligibleAssignments = eligibleAssignments.length;
      
      // Calculate efficiency with PENALTY for overdue
      // Base efficiency from completed work
      let efficiencyRating = 0;
      if (totalEligibleAssignments > 0) {
        const baseEfficiency = (completedAssignments / totalEligibleAssignments) * 100;
        // Apply penalty: each overdue assignment reduces score
        const penaltyPerOverdue = totalEligibleAssignments > 0 ? (100 / totalEligibleAssignments) : 0;
        const totalPenalty = overdueAssignments * penaltyPerOverdue * 1.5; // 1.5x penalty multiplier
        efficiencyRating = Math.max(0, baseEfficiency - totalPenalty);
      }

      // Calculate Response Time Score (only for completed assignments)
      const completedWithTime = eligibleAssignments.filter((a: any) => 
        a.status === 'completed' && a.assigned_date && a.completed_at
      );
      
      let avgResponseHours = 0;
      if (completedWithTime.length > 0) {
        const totalHours = completedWithTime.reduce((sum: number, a: any) => {
          const start = new Date(a.assigned_date).getTime();
          const end = new Date(a.completed_at).getTime();
          return sum + (end - start) / (1000 * 60 * 60);
        }, 0);
        avgResponseHours = totalHours / completedWithTime.length;
      }
      
      // Response Time Score: Faster = Better
      const responseTimeScore = avgResponseHours === 0 ? 0 :
                               avgResponseHours <= 24 ? 100 :
                               avgResponseHours <= 48 ? 85 :
                               avgResponseHours <= 72 ? 70 :
                               avgResponseHours <= 96 ? 55 : 40;

      // Quality Score based on work readiness outcomes and assignment coverage
      const highRiskCount = teamReadiness.filter((wr: any) => wr.readiness_level === 'not_fit').length;
      const fitCount = teamReadiness.filter((wr: any) => wr.readiness_level === 'fit').length;
      const totalReadiness = teamReadiness.length;
      
      let qualityScore = 0;
      if (totalEligibleAssignments > 0) {
        // Base quality from work readiness outcomes
        let readinessQuality = 0;
        if (totalReadiness > 0) {
          const fitRate = (fitCount / totalReadiness) * 100;
          const riskManagement = highRiskCount <= 2 ? 20 : highRiskCount <= 4 ? 10 : 0;
          readinessQuality = (fitRate * 0.8) + riskManagement;
        }
        
        // Coverage quality: How many eligible workers got assignments (excluding cancelled)
        // Note: Workers with unassigned reasons are already excluded from teamWorkers
        const validAssignments = teamAssignments.filter((a: any) => a.status !== 'cancelled');
        const assignedWorkerIds = new Set(validAssignments.map((a: any) => a.worker_id));
        const coverageRate = teamWorkers.length > 0 ? 
          (assignedWorkerIds.size / teamWorkers.length) * 100 : 0;
        
        // Combine: 70% readiness quality + 30% coverage
        qualityScore = Math.min(100, (readinessQuality * 0.7) + (coverageRate * 0.3));
      }

      // Check if team leader has started any activity
      const hasStartedActivity = totalEligibleAssignments > 0 || teamReadiness.length > 0;

      // ENHANCED Management Score Calculation
      let managementScore = 0;
      if (hasStartedActivity) {
        const teamSizeBonus = teamWorkers.length >= 5 ? 15 : teamWorkers.length >= 3 ? 10 : 5;
        managementScore = Math.min(100, (
          efficiencyRating * 0.45 +
          responseTimeScore * 0.30 +
          qualityScore * 0.15 +
          teamSizeBonus
        ));
      }

      // Worker Satisfaction correlates with management quality
      const workerSatisfaction = hasStartedActivity ? Math.min(100, managementScore * 0.92) : 0;

      // Calculate Overall Grade
      const getGrade = (score: number): string => {
        if (!hasStartedActivity) return 'N/A';
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
      };
      
      const overallGrade = getGrade(managementScore);

      // Determine Trend Direction
      const trendDirection: 'up' | 'down' | 'stable' = 
        managementScore >= 85 ? 'up' :
        managementScore < 60 ? 'down' : 'stable';

      const improvementAreas: string[] = [];
      const strengths: string[] = [];

      if (!hasStartedActivity) {
        improvementAreas.push('Start assigning work readiness assessments');
        improvementAreas.push('Begin team management activities');
      } else {
        // Improvement Areas
        if (efficiencyRating < 70) improvementAreas.push('Assignment completion rate');
        if (responseTimeScore < 70) improvementAreas.push('Response time optimization');
        if (qualityScore < 60) improvementAreas.push('Work readiness quality');
        if (teamWorkers.length < 5) improvementAreas.push('Team size optimization');
        if (highRiskCount > 3) improvementAreas.push('High-risk worker management');

        // Strengths
        if (efficiencyRating >= 85) strengths.push('Excellent completion rate');
        if (responseTimeScore >= 85) strengths.push('Fast response time');
        if (qualityScore >= 80) strengths.push('High quality outcomes');
        if (teamWorkers.length >= 8) strengths.push('Large team management');
        if (fitCount > teamWorkers.length * 0.75 && totalReadiness > 0) {
          strengths.push('Outstanding worker health');
        }
      }

      return {
        leaderName: `${leader.first_name} ${leader.last_name}`,
        leaderId: leader.id,
        teamName: leader.team || 'Unassigned Team',
        teamSize: teamWorkers.length,
        managementScore,
        workerSatisfaction,
        efficiencyRating,
        responseTimeScore,
        qualityScore,
        overallGrade,
        improvementAreas,
        strengths,
        trendDirection
      };
    });
  };


  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp sx={{ color: '#10b981', fontSize: 16 }} />;
      case 'down':
        return <TrendingDown sx={{ color: '#ef4444', fontSize: 16 }} />;
      default:
        return <Timeline sx={{ color: '#6b7280', fontSize: 16 }} />;
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <LayoutWithSidebar>
    <Box sx={{ 
      minHeight: '100vh',
      bgcolor: '#fafafa',
      pb: 6
    }}>
      {/* Header */}
      <Box sx={{ 
        bgcolor: 'white',
        borderBottom: '1px solid #e5e7eb',
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 3, md: 4 },
        mb: { xs: 3, md: 4 }
      }}>
        <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 600, 
              mb: 0.5, 
              color: '#111827',
              fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' }
            }}
          >
          Multi-Team Analytics
        </Typography>
          <Typography variant="body2" sx={{ color: '#6b7280', mb: 3 }}>
            Comprehensive overview of team performance and insights
        </Typography>
          
        {/* Global Date Filter */}
        <Box sx={{ 
          display: 'flex', 
            flexDirection: 'column',
            gap: 2
          }}>
            {/* Date Mode Toggle */}
            <ToggleButtonGroup
              value={dateRangeMode}
              exclusive
              onChange={(e, newMode) => {
                if (newMode !== null) {
                  setDateRangeMode(newMode);
                  // Reset to today when switching modes
                  if (newMode === 'single') {
                    setSelectedDate(new Date().toISOString().split('T')[0]);
                  } else {
                    const today = new Date().toISOString().split('T')[0];
                    setStartDate(today);
                    setEndDate(today);
                  }
                }
              }}
              size="small"
              sx={{
                '& .MuiToggleButton-root': {
                  textTransform: 'none',
                  fontSize: '0.813rem',
                  fontWeight: 500,
                  px: 2,
                  py: 0.75,
                  border: '1px solid #e5e7eb',
                  color: '#6b7280',
                  '&.Mui-selected': {
                    bgcolor: '#eef2ff',
                    color: '#6366f1',
                    borderColor: '#c7d2fe',
                    '&:hover': {
                      bgcolor: '#e0e7ff'
                    }
                  },
                  '&:hover': {
                    bgcolor: '#f9fafb'
                  }
                }
              }}
            >
              <ToggleButton value="single">
                <CalendarToday sx={{ fontSize: 16, mr: 0.75 }} />
                Single Date
              </ToggleButton>
              <ToggleButton value="range">
                <DateRangeIcon sx={{ fontSize: 16, mr: 0.75 }} />
                Date Range
              </ToggleButton>
            </ToggleButtonGroup>

            {/* Date Inputs */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1.5,
              flexWrap: 'wrap'
            }}>
              {dateRangeMode === 'single' ? (
          <TextField
            type="date"
            size="small"
                  label="Date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{
                    minWidth: { xs: '100%', sm: 180 },
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'white',
                      fontSize: '0.875rem',
                      '& fieldset': { borderColor: '#e5e7eb' },
                      '&:hover fieldset': { borderColor: '#d1d5db' }
              }
            }}
          />
              ) : (
                <>
                  <TextField
                    type="date"
                    size="small"
                    label="Start Date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{
                      minWidth: { xs: '100%', sm: 160 },
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'white',
                        fontSize: '0.875rem',
                        '& fieldset': { borderColor: '#e5e7eb' },
                        '&:hover fieldset': { borderColor: '#d1d5db' }
                      }
                    }}
                  />
                  <Typography sx={{ color: '#9ca3af', fontSize: '0.875rem', display: { xs: 'none', sm: 'block' } }}>
                    to
                  </Typography>
                  <TextField
                    type="date"
                    size="small"
                    label="End Date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ min: startDate }}
                    sx={{
                      minWidth: { xs: '100%', sm: 160 },
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'white',
                        fontSize: '0.875rem',
                        '& fieldset': { borderColor: '#e5e7eb' },
                        '&:hover fieldset': { borderColor: '#d1d5db' }
                      }
                    }}
                  />
                </>
              )}
              
          <Button 
            variant="outlined" 
                size="small"
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  if (dateRangeMode === 'single') {
                    setSelectedDate(today);
                  } else {
                    setStartDate(today);
                    setEndDate(today);
                  }
                }}
            sx={{
                  minWidth: { xs: '100%', sm: 'auto' },
                  textTransform: 'none',
                  borderColor: '#e5e7eb',
                  color: '#374151',
                  fontSize: '0.875rem',
                  '&:hover': {
                    borderColor: '#d1d5db',
                    bgcolor: '#f9fafb'
                  }
            }}
          >
            Today
          </Button>
              
              <IconButton 
                size="small"
                onClick={handleManualRefresh}
                disabled={loading}
                sx={{
                  bgcolor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  '&:hover': {
                    bgcolor: '#f3f4f6',
                    borderColor: '#d1d5db'
                  },
                  '&:disabled': {
                    bgcolor: '#f9fafb',
                    opacity: 0.5
                  }
                }}
              >
                <Tooltip title="Refresh Data">
                  <Refresh sx={{ fontSize: 18, color: '#374151' }} />
                </Tooltip>
              </IconButton>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Period Selector removed - daily filter only */}

      {/* Multi-Team Overview Cards */}
      <Box sx={{ maxWidth: 1400, mx: 'auto', px: { xs: 2, sm: 3, md: 4 } }}>
      {multiTeamMetrics && (
          <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: { xs: 3, md: 4 } }}>
            <Grid item xs={12} sm={6} lg={3}>
              <Card sx={{ 
                bgcolor: 'white',
                border: '1px solid #e5e7eb',
                boxShadow: 'none',
                transition: 'all 0.2s',
                '&:hover': {
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  transform: 'translateY(-2px)'
                }
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ color: '#6b7280', mb: 1, fontSize: '0.813rem', fontWeight: 500 }}>
                      Total Teams
                    </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 600, color: '#111827', fontSize: { xs: '1.75rem', md: '2rem' } }}>
                        {multiTeamMetrics.totalTeams}
                      </Typography>
                  </Box>
                    <Box sx={{ 
                      width: 48, 
                      height: 48, 
                      borderRadius: 2, 
                      bgcolor: '#eef2ff', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}>
                      <Group sx={{ fontSize: 24, color: '#6366f1' }} />
                    </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

            <Grid item xs={12} sm={6} lg={3}>
              <Card sx={{ 
                bgcolor: 'white',
                border: '1px solid #e5e7eb',
                boxShadow: 'none',
                transition: 'all 0.2s',
                '&:hover': {
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  transform: 'translateY(-2px)'
                }
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ color: '#6b7280', mb: 1, fontSize: '0.813rem', fontWeight: 500 }}>
                      Total Workers
                    </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 600, color: '#111827', fontSize: { xs: '1.75rem', md: '2rem' } }}>
                        {multiTeamMetrics.totalWorkers}
                      </Typography>
                  </Box>
                    <Box sx={{ 
                      width: 48, 
                      height: 48, 
                      borderRadius: 2, 
                      bgcolor: '#f0fdf4', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}>
                      <People sx={{ fontSize: 24, color: '#10b981' }} />
                    </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

            <Grid item xs={12} sm={6} lg={3}>
              <Card sx={{ 
                bgcolor: 'white',
                border: '1px solid #e5e7eb',
                boxShadow: 'none',
                transition: 'all 0.2s',
                '&:hover': {
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  transform: 'translateY(-2px)'
                }
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ color: '#6b7280', mb: 1, fontSize: '0.813rem', fontWeight: 500 }}>
                      Overall Compliance
                    </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 600, color: '#111827', fontSize: { xs: '1.75rem', md: '2rem' } }}>
                        {multiTeamMetrics.overallComplianceRate.toFixed(1)}%
                      </Typography>
                  </Box>
                    <Box sx={{ 
                      width: 48, 
                      height: 48, 
                      borderRadius: 2, 
                      bgcolor: '#fef3c7', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}>
                      <CheckCircle sx={{ fontSize: 24, color: '#f59e0b' }} />
                    </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

            <Grid item xs={12} sm={6} lg={3}>
              <Card sx={{ 
                bgcolor: 'white',
                border: '1px solid #e5e7eb',
                boxShadow: 'none',
                transition: 'all 0.2s',
                '&:hover': {
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  transform: 'translateY(-2px)'
                }
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ color: '#6b7280', mb: 1, fontSize: '0.813rem', fontWeight: 500 }}>
                      Health Score
                    </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 600, color: '#111827', fontSize: { xs: '1.75rem', md: '2rem' } }}>
                        {multiTeamMetrics.crossTeamHealthScore.toFixed(1)}%
                      </Typography>
                  </Box>
                    <Box sx={{ 
                      width: 48, 
                      height: 48, 
                      borderRadius: 2, 
                      bgcolor: '#fee2e2', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}>
                      <HealthAndSafety sx={{ fontSize: 24, color: '#ef4444' }} />
                    </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
        <Card sx={{ 
          bgcolor: 'white',
          border: '1px solid #e5e7eb',
          boxShadow: 'none'
        }}>
          <Box sx={{ borderBottom: '1px solid #e5e7eb' }}>
          <Tabs 
            value={activeTab} 
            onChange={(e, newValue) => setActiveTab(newValue)}
              variant={isMobile ? 'scrollable' : 'scrollable'}
              scrollButtons="auto"
              sx={{
                px: { xs: 1, sm: 2 },
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  minHeight: 56,
                  color: '#6b7280',
                  px: { xs: 1.5, sm: 2 },
                  '&.Mui-selected': {
                    color: '#111827'
                  }
                },
                '& .MuiTabs-indicator': {
                  height: 2,
                  bgcolor: '#6366f1'
                }
              }}
          >
            <Tab 
                icon={<CompareArrows sx={{ fontSize: 18 }} />} 
              iconPosition="start" 
                label="Comparison" 
            />
            <Tab 
                icon={<CheckCircle sx={{ fontSize: 18 }} />} 
              iconPosition="start" 
              label="Active Teams" 
            />
            <Tab 
                icon={<SupervisorAccount sx={{ fontSize: 18 }} />} 
              iconPosition="start" 
                label="Leaders" 
            />
            <Tab 
                icon={<Warning sx={{ fontSize: 18 }} />} 
              iconPosition="start" 
                label="Inactive" 
            />
            <Tab 
                icon={<Insights sx={{ fontSize: 18 }} />} 
              iconPosition="start" 
                label="Insights" 
            />
            <Tab 
                icon={<Analytics sx={{ fontSize: 18 }} />} 
              iconPosition="start" 
                label="Analytics" 
            />
          </Tabs>
        </Box>

          <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          {/* Team Comparison Tab */}
          {activeTab === 0 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: '#111827', fontSize: '1.125rem' }}>
                Team Performance Comparison
              </Typography>
              
              <TableContainer 
                component={Paper} 
                sx={{ 
                  border: '1px solid #e5e7eb',
                  boxShadow: 'none',
                  borderRadius: 2,
                  overflow: 'hidden'
                }}
              >
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f9fafb' }}>
                      <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem', py: 2 }}>Team</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem', py: 2 }}>Leader</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem', py: 2 }}>Assigned</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem', py: 2 }}>Compliance</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem', py: 2 }}>Health</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem', py: 2 }}>Risk</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem', py: 2 }}>Trend</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {teamPerformance
                      .slice((comparisonPage - 1) * itemsPerPage, comparisonPage * itemsPerPage)
                      .map((team, index) => (
                      <TableRow 
                        key={index}
                        sx={{
                          '&:hover': { bgcolor: '#f9fafb' },
                          borderBottom: '1px solid #f3f4f6'
                        }}
                      >
                        <TableCell sx={{ py: 2.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ width: 36, height: 36, bgcolor: '#eef2ff', color: '#6366f1', fontSize: '0.875rem', fontWeight: 600 }}>
                              {team.teamName.charAt(0)}
                            </Avatar>
                            <Typography variant="body2" sx={{ fontWeight: 500, color: '#111827' }}>
                              {team.teamName}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 2.5 }}>
                          <Typography variant="body2" sx={{ color: '#6b7280' }}>
                            {team.teamLeader}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 2.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#111827' }}>
                            {team.assignedWorkers}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 2.5 }}>
                          <Chip
                            label={team.totalAssignments > 0 ? `${team.complianceRate.toFixed(1)}%` : 'No Data'}
                            size="small"
                            sx={{
                              bgcolor: team.totalAssignments > 0 ? (
                                team.complianceRate >= 80 ? '#dcfce7' :
                                team.complianceRate >= 60 ? '#fef3c7' : '#fee2e2'
                              ) : '#f3f4f6',
                              color: team.totalAssignments > 0 ? (
                                team.complianceRate >= 80 ? '#166534' :
                                team.complianceRate >= 60 ? '#92400e' : '#991b1b'
                              ) : '#6b7280',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              height: 24,
                              border: 'none'
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ py: 2.5 }}>
                          <Chip
                            label={team.totalAssignments > 0 ? `${team.healthScore.toFixed(1)}%` : 'No Data'}
                            size="small"
                            sx={{
                              bgcolor: team.totalAssignments > 0 ? (
                                team.healthScore >= 80 ? '#dcfce7' :
                                team.healthScore >= 60 ? '#fef3c7' : '#fee2e2'
                              ) : '#f3f4f6',
                              color: team.totalAssignments > 0 ? (
                                team.healthScore >= 80 ? '#166534' :
                                team.healthScore >= 60 ? '#92400e' : '#991b1b'
                              ) : '#6b7280',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              height: 24,
                              border: 'none'
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ py: 2.5 }}>
                          {team.highRiskReports > 0 ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Warning sx={{ color: '#ef4444', fontSize: 18 }} />
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#ef4444' }}>
                                {team.highRiskReports}
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="body2" sx={{ color: '#9ca3af' }}>—</Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ py: 2.5 }}>
                          {getTrendIcon(team.trend)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {/* Pagination */}
              {teamPerformance.length > itemsPerPage && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <Pagination 
                    count={Math.ceil(teamPerformance.length / itemsPerPage)}
                    page={comparisonPage}
                    onChange={(e, page) => setComparisonPage(page)}
                    color="primary"
                    shape="rounded"
                    sx={{
                      '& .MuiPaginationItem-root': {
                        fontSize: '0.875rem',
                        fontWeight: 500
                      }
                    }}
                  />
                </Box>
              )}
            </Box>
          )}

      {/* Active Teams Tab */}
          {activeTab === 1 && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', fontSize: '1.125rem' }}>
                  Active Teams
              </Typography>
          {/* Date filter and refresh */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Tooltip title="Refresh data">
                    <IconButton 
                      onClick={handleManualRefresh}
                      disabled={loading}
                      sx={{ 
                        color: '#6b7280',
                        '&:hover': { 
                          bgcolor: '#f3f4f6',
                          color: '#6366f1'
                        }
                      }}
                    >
                      <Refresh sx={{ fontSize: 20, animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                    </IconButton>
                  </Tooltip>
            <TextField
              type="date"
              size="small"
                    label="Date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
                    sx={{
                      minWidth: 180,
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'white',
                        fontSize: '0.875rem',
                        '& fieldset': { borderColor: '#e5e7eb' }
                      }
                    }}
                  />
                  <Button 
                    variant="outlined" 
                    size="small"
                    onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                    sx={{
                      textTransform: 'none',
                      borderColor: '#e5e7eb',
                      color: '#374151',
                      fontSize: '0.875rem',
                      '&:hover': {
                        borderColor: '#d1d5db',
                        bgcolor: '#f9fafb'
                      }
                    }}
                  >
                    Today
                  </Button>
                </Box>
          </Box>
              
              {(() => {
                // Show only teams active for the selected day (assignment created today or readiness submitted today)
                const activeTeams = teamPerformance.filter(t => t.activityTodayCount > 0);
                
                if (activeTeams.length === 0) {
                  return (
                    <Alert 
                      severity="info" 
                      sx={{ 
                        border: '1px solid #dbeafe',
                        bgcolor: '#eff6ff',
                        color: '#1e40af',
                        '& .MuiAlert-icon': { color: '#3b82f6' }
                      }}
                    >
                      No active teams found. Teams will appear here once they start assigning work readiness assessments.
                    </Alert>
                  );
                }

                return (
                  <Grid container spacing={3}>
                    {activeTeams.map((team, index) => (
                      <Grid item xs={12} md={6} lg={4} key={index}>
                        <Card sx={{ 
                          height: '100%', 
                          border: '1px solid #e5e7eb',
                          boxShadow: 'none',
                          transition: 'all 0.2s',
                          '&:hover': {
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                            transform: 'translateY(-2px)'
                          }
                        }}>
                          <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                                <Avatar sx={{ 
                                  width: 44, 
                                  height: 44, 
                                  bgcolor: '#f0fdf4',
                                  color: '#166534',
                                  fontSize: '1rem',
                                  fontWeight: 600
                                }}>
                                  {team.teamName.charAt(0)}
                                </Avatar>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#111827', mb: 0.25 }}>
                                    {team.teamName}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: '#6b7280' }}>
                                    {team.teamLeader}
                                  </Typography>
                                </Box>
                              </Box>
                              <IconButton
                                size="small"
                                onClick={() => setViewDetailsDialog({ open: true, team })}
                                sx={{ 
                                  color: '#6b7280',
                                  '&:hover': { 
                                    bgcolor: '#f3f4f6',
                                    color: '#6366f1'
                                  }
                                }}
                              >
                                <Visibility sx={{ fontSize: 20 }} />
                              </IconButton>
                            </Box>

                            <Divider sx={{ my: 2, borderColor: '#f3f4f6' }} />

                            <Stack spacing={2.5}>
                              {/* Compliance Rate */}
                              <Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                  <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.813rem', fontWeight: 500 }}>
                                  Compliance Rate
                                </Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#111827', fontSize: '0.875rem' }}>
                                    {team.complianceRate.toFixed(1)}%
                                  </Typography>
                                </Box>
                                <LinearProgress 
                                  variant="determinate" 
                                  value={team.complianceRate}
                                  sx={{ 
                                    height: 6, 
                                    borderRadius: 3,
                                    bgcolor: '#f3f4f6',
                                    '& .MuiLinearProgress-bar': {
                                      bgcolor: team.complianceRate >= 80 ? '#10b981' :
                                               team.complianceRate >= 60 ? '#f59e0b' : '#ef4444',
                                      borderRadius: 3
                                    }
                                  }}
                                />
                              </Box>

                              {/* Assignment Stats */}
                              <Box>
                                <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.813rem', fontWeight: 500, mb: 1.5 }}>
                                  Assignments
                                </Typography>
                                <Stack spacing={1}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.813rem' }}>Total Assigned</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#111827', fontSize: '0.875rem' }}>
                                    {team.assignedWorkers}/{team.workerCount}
                                  </Typography>
                                </Box>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.813rem' }}>Today</Typography>
                                    <Chip 
                                      label={team.todayAssignments}
                                      size="small"
                                      sx={{ 
                                        bgcolor: '#dcfce7',
                                        color: '#166534',
                                        fontWeight: 600,
                                        height: 20,
                                        fontSize: '0.75rem',
                                        '& .MuiChip-label': { px: 1 }
                                      }}
                                    />
                                </Box>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.813rem' }}>Unassigned</Typography>
                                    <Chip 
                                      label={team.unassignedWorkers}
                                      size="small"
                                      sx={{ 
                                        bgcolor: team.unassignedWorkers > 0 ? '#fef3c7' : '#f3f4f6',
                                        color: team.unassignedWorkers > 0 ? '#92400e' : '#6b7280',
                                        fontWeight: 600,
                                        height: 20,
                                        fontSize: '0.75rem',
                                        '& .MuiChip-label': { px: 1 }
                                      }}
                                    />
                                </Box>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.813rem' }}>Completed</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#10b981', fontSize: '0.875rem' }}>
                                    {team.completedAssignments}/{team.totalAssignments}
                                  </Typography>
                                </Box>
                                </Stack>
                              </Box>

                              {/* Unselected Workers */}
                              {team.unselectedWorkers.length > 0 && (
                                <Box>
                                  <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.813rem', fontWeight: 500, mb: 1.5 }}>
                                    Unselected ({team.unselectedWorkers.length})
                                  </Typography>
                                  <Stack spacing={1}>
                                    {team.unselectedWorkers.slice(0, 2).map((unselected, idx) => (
                                      <Box key={idx} sx={{ p: 1.5, bgcolor: '#fef3c7', borderRadius: 1.5, border: '1px solid #fde68a' }}>
                                        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', color: '#92400e', mb: 0.5, fontSize: '0.75rem' }}>
                                          {unselected.workerId}
                                      </Typography>
                                        <Typography variant="caption" sx={{ color: '#78350f', fontSize: '0.688rem' }}>
                                          {unselected.reason}
                                      </Typography>
                                    </Box>
                                  ))}
                                    {team.unselectedWorkers.length > 2 && (
                                      <Typography variant="caption" sx={{ color: '#6b7280', fontSize: '0.75rem' }}>
                                        +{team.unselectedWorkers.length - 2} more
                                    </Typography>
                                  )}
                                  </Stack>
                                </Box>
                              )}

                              {/* Health Score */}
                              <Box sx={{ pt: 1 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.813rem', fontWeight: 500 }}>
                                    Health Score
                                </Typography>
                                <Chip
                                  label={`${team.healthScore.toFixed(1)}%`}
                                  size="small"
                                  sx={{
                                      bgcolor: team.healthScore >= 80 ? '#dcfce7' :
                                               team.healthScore >= 60 ? '#fef3c7' : '#fee2e2',
                                      color: team.healthScore >= 80 ? '#166534' :
                                             team.healthScore >= 60 ? '#92400e' : '#991b1b',
                                      fontWeight: 600,
                                      height: 24,
                                      fontSize: '0.75rem'
                                    }}
                                  />
                                </Box>
                              </Box>
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                );
              })()}
            </Box>
          )}

          {/* Team Leader Performance Tab */}
          {activeTab === 2 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: '#111827', fontSize: '1.125rem' }}>
                Team Leader Performance
              </Typography>
              
              {/* Performance Trends Chart */}
              <Box sx={{ mb: 4 }}>
                <PerformanceLineChart
                  teamLeaderPerformance={teamLeaderPerformance}
                  selectedDate={selectedDate}
                  isMobile={isMobile}
                />
              </Box>
              
              <Grid container spacing={3}>
                {teamLeaderPerformance
                  .slice((leaderPage - 1) * itemsPerPage, leaderPage * itemsPerPage)
                  .map((leader, index) => (
                  <Grid item xs={12} md={6} lg={4} key={index}>
                    <Card sx={{ 
                      height: '100%', 
                      border: '1px solid #e5e7eb',
                      boxShadow: 'none',
                      transition: 'all 0.2s',
                      '&:hover': {
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                        transform: 'translateY(-2px)'
                      }
                    }}>
                      <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                          <Avatar sx={{ 
                            width: 44, 
                            height: 44, 
                            bgcolor: '#eef2ff',
                            color: '#6366f1',
                            fontSize: '1rem',
                            fontWeight: 600
                          }}>
                            {leader.leaderName.charAt(0)}
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#111827', mb: 0.25 }}>
                              {leader.leaderName}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#6b7280' }}>
                              {leader.teamName}
                            </Typography>
                          </Box>
                        </Box>

                        <Divider sx={{ my: 2, borderColor: '#f3f4f6' }} />

                        <Stack spacing={2.5}>
                          {/* Overall Grade Badge */}
                          <Box sx={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            p: 2,
                            bgcolor: leader.overallGrade === 'A' ? '#dcfce7' :
                                     leader.overallGrade === 'B' ? '#dbeafe' :
                                     leader.overallGrade === 'C' ? '#fef3c7' :
                                     leader.overallGrade === 'D' || leader.overallGrade === 'F' ? '#fee2e2' : '#f3f4f6',
                            borderRadius: 2,
                            border: '1px solid',
                            borderColor: leader.overallGrade === 'A' ? '#86efac' :
                                        leader.overallGrade === 'B' ? '#93c5fd' :
                                        leader.overallGrade === 'C' ? '#fde68a' :
                                        leader.overallGrade === 'D' || leader.overallGrade === 'F' ? '#fecaca' : '#e5e7eb'
                          }}>
                          <Box>
                              <Typography variant="caption" sx={{ 
                                color: '#6b7280', 
                                fontSize: '0.75rem',
                                textTransform: 'uppercase',
                                letterSpacing: 0.5
                              }}>
                                Overall Grade
                              </Typography>
                              <Typography variant="h3" sx={{ 
                                fontWeight: 700,
                                color: leader.overallGrade === 'A' ? '#166534' :
                                       leader.overallGrade === 'B' ? '#1e40af' :
                                       leader.overallGrade === 'C' ? '#92400e' :
                                       leader.overallGrade === 'D' || leader.overallGrade === 'F' ? '#991b1b' : '#6b7280',
                                lineHeight: 1
                              }}>
                                {leader.overallGrade}
                              </Typography>
                            </Box>
                            {getTrendIcon(leader.trendDirection)}
                          </Box>

                          {/* Management Score */}
                          <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                              <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.813rem', fontWeight: 500 }}>
                              Management Score
                            </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#111827', fontSize: '0.875rem' }}>
                                {leader.managementScore > 0 ? `${leader.managementScore.toFixed(1)}%` : 'No Data'}
                              </Typography>
                            </Box>
                            <LinearProgress 
                              variant="determinate" 
                              value={leader.managementScore}
                              sx={{ 
                                height: 6, 
                                borderRadius: 3,
                                bgcolor: '#f3f4f6',
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: leader.managementScore >= 80 ? '#10b981' :
                                           leader.managementScore >= 60 ? '#f59e0b' : '#ef4444',
                                  borderRadius: 3
                                }
                              }}
                            />
                          </Box>

                          {/* Key Metrics Grid */}
                          <Box sx={{ 
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: 1.5
                          }}>
                            <Box sx={{ 
                              p: 1.5, 
                              bgcolor: leader.efficiencyRating >= 80 ? '#f0fdf4' : 
                                       leader.efficiencyRating >= 60 ? '#fffbeb' : '#fef2f2',
                              borderRadius: 1.5,
                              border: '1px solid',
                              borderColor: leader.efficiencyRating >= 80 ? '#d1fae5' :
                                          leader.efficiencyRating >= 60 ? '#fde68a' : '#fecaca'
                            }}>
                              <Typography variant="caption" sx={{ color: '#6b7280', fontSize: '0.688rem', display: 'block', mb: 0.5 }}>
                                Efficiency
                              </Typography>
                              <Typography variant="body1" sx={{ 
                                fontWeight: 600, 
                                color: leader.efficiencyRating >= 80 ? '#166534' :
                                       leader.efficiencyRating >= 60 ? '#92400e' : '#991b1b',
                                fontSize: '1rem' 
                              }}>
                                {leader.efficiencyRating.toFixed(0)}%
                            </Typography>
                          </Box>

                            <Box sx={{ 
                              p: 1.5, 
                              bgcolor: leader.responseTimeScore >= 80 ? '#f0fdf4' : 
                                       leader.responseTimeScore >= 60 ? '#fffbeb' : '#fef2f2',
                              borderRadius: 1.5,
                              border: '1px solid',
                              borderColor: leader.responseTimeScore >= 80 ? '#d1fae5' :
                                          leader.responseTimeScore >= 60 ? '#fde68a' : '#fecaca'
                            }}>
                              <Typography variant="caption" sx={{ color: '#6b7280', fontSize: '0.688rem', display: 'block', mb: 0.5 }}>
                                Response Time
                            </Typography>
                              <Typography variant="body1" sx={{ 
                                fontWeight: 600, 
                                color: leader.responseTimeScore >= 80 ? '#166534' :
                                       leader.responseTimeScore >= 60 ? '#92400e' : '#991b1b',
                                fontSize: '1rem' 
                              }}>
                                {leader.responseTimeScore.toFixed(0)}%
                            </Typography>
                            </Box>
                            
                            <Box sx={{ 
                              p: 1.5, 
                              bgcolor: leader.qualityScore >= 80 ? '#f0fdf4' : 
                                       leader.qualityScore >= 60 ? '#fffbeb' : '#fef2f2',
                              borderRadius: 1.5,
                              border: '1px solid',
                              borderColor: leader.qualityScore >= 80 ? '#d1fae5' :
                                          leader.qualityScore >= 60 ? '#fde68a' : '#fecaca'
                            }}>
                              <Typography variant="caption" sx={{ color: '#6b7280', fontSize: '0.688rem', display: 'block', mb: 0.5 }}>
                                Quality
                              </Typography>
                              <Typography variant="body1" sx={{ 
                                fontWeight: 600, 
                                color: leader.qualityScore >= 80 ? '#166534' :
                                       leader.qualityScore >= 60 ? '#92400e' : '#991b1b',
                                fontSize: '1rem' 
                              }}>
                                {leader.qualityScore.toFixed(0)}%
                              </Typography>
                            </Box>
                            
                            <Box sx={{ 
                              p: 1.5, 
                              bgcolor: '#f9fafb', 
                              borderRadius: 1.5,
                              border: '1px solid #f3f4f6'
                            }}>
                              <Typography variant="caption" sx={{ color: '#6b7280', fontSize: '0.688rem', display: 'block', mb: 0.5 }}>
                                Team Size
                              </Typography>
                              <Typography variant="body1" sx={{ fontWeight: 600, color: '#111827', fontSize: '1rem' }}>
                                {leader.teamSize}
                              </Typography>
                            </Box>
                          </Box>

                          {leader.strengths.length > 0 && (
                            <Box>
                              <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.813rem', fontWeight: 500, mb: 1 }}>
                                Strengths
                              </Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                              {leader.strengths.map((strength, idx) => (
                                <Chip
                                  key={idx}
                                  label={strength}
                                  size="small"
                                    sx={{ 
                                      bgcolor: '#dcfce7', 
                                      color: '#166534',
                                      fontWeight: 500,
                                      fontSize: '0.75rem',
                                      height: 24,
                                      border: 'none'
                                    }}
                                />
                              ))}
                              </Box>
                            </Box>
                          )}

                          {leader.improvementAreas.length > 0 && (
                            <Box>
                              <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.813rem', fontWeight: 500, mb: 1 }}>
                                Areas to Improve
                              </Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                              {leader.improvementAreas.map((area, idx) => (
                                <Chip
                                  key={idx}
                                  label={area}
                                  size="small"
                                    sx={{ 
                                      bgcolor: '#fef2f2', 
                                      color: '#991b1b',
                                      fontWeight: 500,
                                      fontSize: '0.75rem',
                                      height: 24,
                                      border: 'none'
                                    }}
                                />
                              ))}
                              </Box>
                            </Box>
                          )}
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              
              {/* Pagination */}
              {teamLeaderPerformance.length > itemsPerPage && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                  <Pagination 
                    count={Math.ceil(teamLeaderPerformance.length / itemsPerPage)}
                    page={leaderPage}
                    onChange={(e, page) => setLeaderPage(page)}
                    color="primary"
                    shape="rounded"
                    sx={{
                      '& .MuiPaginationItem-root': {
                        fontSize: '0.875rem',
                        fontWeight: 500
                      }
                    }}
                  />
                </Box>
              )}
            </Box>
          )}

          {/* Inactive Teams Tab */}
          {activeTab === 3 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: '#111827', fontSize: '1.125rem' }}>
                Inactive Teams
              </Typography>
              
              {(() => {
                const inactiveTeams = teamPerformance.filter(t => t.totalAssignments === 0);
                
                if (inactiveTeams.length === 0) {
                  return (
                    <Alert 
                      severity="success"
                      sx={{ 
                        border: '1px solid #d1fae5',
                        bgcolor: '#ecfdf5',
                        color: '#065f46',
                        '& .MuiAlert-icon': { color: '#10b981' }
                      }}
                    >
                      All teams are active! No inactive teams found.
                    </Alert>
                  );
                }

                return (
                  <>
                    <TableContainer 
                      component={Paper} 
                      sx={{ 
                        border: '1px solid #e5e7eb',
                        boxShadow: 'none',
                        borderRadius: 2,
                        overflow: 'hidden'
                      }}
                    >
                    <Table>
                      <TableHead>
                          <TableRow sx={{ bgcolor: '#f9fafb' }}>
                            <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem', py: 2 }}>Team</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem', py: 2 }}>Leader</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem', py: 2 }}>Workers</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem', py: 2 }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: '0.875rem', py: 2 }}>Action Needed</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                          {inactiveTeams
                            .slice((inactivePage - 1) * itemsPerPage, inactivePage * itemsPerPage)
                            .map((team, index) => (
                            <TableRow 
                              key={index}
                              sx={{
                                '&:hover': { bgcolor: '#f9fafb' },
                                borderBottom: '1px solid #f3f4f6'
                              }}
                            >
                              <TableCell sx={{ py: 2.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                  <Avatar sx={{ width: 36, height: 36, bgcolor: '#fef3c7', color: '#92400e', fontSize: '0.875rem', fontWeight: 600 }}>
                                  {team.teamName.charAt(0)}
                                </Avatar>
                                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#111827' }}>
                                  {team.teamName}
                                </Typography>
                              </Box>
                            </TableCell>
                              <TableCell sx={{ py: 2.5 }}>
                                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                                {team.teamLeader}
                              </Typography>
                            </TableCell>
                              <TableCell sx={{ py: 2.5 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: '#111827' }}>
                                {team.workerCount}
                              </Typography>
                            </TableCell>
                              <TableCell sx={{ py: 2.5 }}>
                              <Chip
                                label="Inactive"
                                size="small"
                                sx={{
                                    bgcolor: '#fef3c7',
                                    color: '#92400e',
                                    fontWeight: 600,
                                    fontSize: '0.75rem',
                                    height: 24,
                                    border: 'none'
                                }}
                              />
                            </TableCell>
                              <TableCell sx={{ py: 2.5 }}>
                                <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.813rem' }}>
                                Start assigning work readiness assessments
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                    
                    {/* Pagination */}
                    {inactiveTeams.length > itemsPerPage && (
                      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                        <Pagination 
                          count={Math.ceil(inactiveTeams.length / itemsPerPage)}
                          page={inactivePage}
                          onChange={(e, page) => setInactivePage(page)}
                          color="primary"
                          shape="rounded"
                          sx={{
                            '& .MuiPaginationItem-root': {
                              fontSize: '0.875rem',
                              fontWeight: 500
                            }
                          }}
                        />
                      </Box>
                    )}
                  </>
                );
              })()}
            </Box>
          )}

          {/* Strategic Insights Tab */}
          {activeTab === 4 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: '#111827', fontSize: '1.125rem' }}>
                Strategic Insights
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card sx={{ 
                    border: '1px solid #e5e7eb',
                    boxShadow: 'none',
                    transition: 'all 0.2s',
                    '&:hover': {
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                      transform: 'translateY(-2px)'
                    }
                  }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                        <Box sx={{ 
                          width: 40, 
                          height: 40, 
                          borderRadius: 2, 
                          bgcolor: '#f0fdf4', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center' 
                        }}>
                          <EmojiEvents sx={{ color: '#10b981', fontSize: 22 }} />
                        </Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#111827' }}>
                          Top Performing Team
                        </Typography>
                      </Box>
                      <Typography variant="h5" sx={{ fontWeight: 600, color: '#10b981', mb: 1 }}>
                        {multiTeamMetrics?.topPerformingTeam || 'N/A'}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.875rem' }}>
                        Highest compliance rate across all active teams
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card sx={{ 
                    border: '1px solid #e5e7eb',
                    boxShadow: 'none',
                    transition: 'all 0.2s',
                    '&:hover': {
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                      transform: 'translateY(-2px)'
                    }
                  }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                        <Box sx={{ 
                          width: 40, 
                          height: 40, 
                          borderRadius: 2, 
                          bgcolor: '#fee2e2', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center' 
                        }}>
                          <Warning sx={{ color: '#ef4444', fontSize: 22 }} />
                        </Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#111827' }}>
                          Needs Attention
                        </Typography>
                      </Box>
                      <Typography variant="h5" sx={{ fontWeight: 600, color: '#ef4444', mb: 1 }}>
                        {(() => {
                          const activeTeams = teamPerformance.filter(t => t.totalAssignments > 0);
                          if (activeTeams.length === 0) return 'No active teams';
                          const worst = activeTeams.slice().sort((a,b) => a.complianceRate - b.complianceRate)[0];
                          return worst?.teamName || 'N/A';
                        })()}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.875rem' }}>
                        Lowest compliance among active teams
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12}>
                  <Card sx={{ 
                    border: '1px solid #e5e7eb',
                    boxShadow: 'none'
                  }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: '#111827' }}>
                        Key Recommendations
                      </Typography>

                      {!insights || (insights.alerts.length === 0 && insights.recommendations.length === 0 && insights.opportunities.length === 0) ? (
                        <Box sx={{ 
                          p: 4, 
                          textAlign: 'center', 
                          bgcolor: '#f9fafb', 
                          borderRadius: 2,
                          border: '1px solid #f3f4f6'
                        }}>
                          <Typography variant="body2" sx={{ color: '#6b7280' }}>
                          No insights yet. Start team activities to generate actionable recommendations.
                        </Typography>
                        </Box>
                      ) : (
                        <Stack spacing={2}>
                          {insights.alerts.map((a, idx) => (
                            <Box 
                              key={`alert-${idx}`} 
                              sx={{ 
                                display: 'flex', 
                                alignItems: 'flex-start', 
                                gap: 1.5,
                                p: 2,
                                bgcolor: '#fef2f2',
                                borderRadius: 1.5,
                                border: '1px solid #fecaca'
                              }}
                            >
                              <Warning sx={{ color: '#ef4444', fontSize: 20, mt: 0.25 }} />
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: '#111827', mb: 0.5 }}>
                                  {a.title}
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.875rem' }}>
                                  {a.description}
                                </Typography>
                                {a.teams && (
                                  <Typography variant="caption" sx={{ color: '#991b1b', mt: 0.5, display: 'block' }}>
                                    Teams: {a.teams.join(', ')}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          ))}

                          {insights.recommendations.map((r, idx) => (
                            <Box 
                              key={`rec-${idx}`} 
                              sx={{ 
                                display: 'flex', 
                                alignItems: 'flex-start', 
                                gap: 1.5,
                                p: 2,
                                bgcolor: '#eff6ff',
                                borderRadius: 1.5,
                                border: '1px solid #dbeafe'
                              }}
                            >
                              <CheckCircle sx={{ color: '#3b82f6', fontSize: 20, mt: 0.25 }} />
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: '#111827', mb: 0.5 }}>
                                  {r.title}
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.875rem' }}>
                                  {r.description}
                                </Typography>
                              </Box>
                            </Box>
                          ))}

                          {insights.opportunities.map((o, idx) => (
                            <Box 
                              key={`opp-${idx}`} 
                              sx={{ 
                                display: 'flex', 
                                alignItems: 'flex-start', 
                                gap: 1.5,
                                p: 2,
                                bgcolor: '#f0fdf4',
                                borderRadius: 1.5,
                                border: '1px solid #d1fae5'
                              }}
                            >
                              <EmojiEvents sx={{ color: '#10b981', fontSize: 20, mt: 0.25 }} />
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: '#111827', mb: 0.5 }}>
                                  {o.title}
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.875rem' }}>
                                  {o.description}
                                </Typography>
                              </Box>
                            </Box>
                          ))}
                        </Stack>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Performance Analytics Tab */}
          {activeTab === 5 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: '#111827', fontSize: '1.125rem' }}>
                Performance Analytics
              </Typography>
              
              {/* Calendar Filter Section */}
              <Card sx={{ 
                mb: 4, 
                border: '1px solid #e5e7eb',
                boxShadow: 'none'
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: '#111827' }}>
                    Date Range Filter
                  </Typography>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1.5,
                    flexWrap: 'wrap'
                  }}>
                    <TextField
                      type="date"
                      size="small"
                      label="Start Date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        minWidth: { xs: '100%', sm: 180 },
                        '& .MuiOutlinedInput-root': {
                          bgcolor: 'white',
                          fontSize: '0.875rem',
                          '& fieldset': { borderColor: '#e5e7eb' }
                        }
                      }}
                    />
                    <TextField
                      type="date"
                      size="small"
                      label="End Date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        minWidth: { xs: '100%', sm: 180 },
                        '& .MuiOutlinedInput-root': {
                          bgcolor: 'white',
                          fontSize: '0.875rem',
                          '& fieldset': { borderColor: '#e5e7eb' }
                        }
                      }}
                    />
                    <Button 
                      variant="outlined" 
                      size="small"
                      onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                      sx={{
                        minWidth: { xs: '100%', sm: 'auto' },
                        textTransform: 'none',
                        borderColor: '#e5e7eb',
                        color: '#374151',
                        fontSize: '0.875rem',
                        '&:hover': {
                          borderColor: '#d1d5db',
                          bgcolor: '#f9fafb'
                        }
                      }}
                    >
                      Today
                    </Button>
                    <Button 
                      variant="outlined" 
                      size="small"
                      onClick={() => {
                        const today = new Date();
                        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                        setSelectedDate(weekAgo.toISOString().split('T')[0]);
                      }}
                      sx={{
                        minWidth: { xs: '100%', sm: 'auto' },
                        textTransform: 'none',
                        borderColor: '#e5e7eb',
                        color: '#374151',
                        fontSize: '0.875rem',
                        '&:hover': {
                          borderColor: '#d1d5db',
                          bgcolor: '#f9fafb'
                        }
                      }}
                    >
                      Last 7 Days
                    </Button>
                  </Box>
                </CardContent>
              </Card>

              {/* Performance Trends Chart */}
              <Box sx={{ mb: 4 }}>
                <PerformanceLineChart
                  teamLeaderPerformance={teamLeaderPerformance}
                  selectedDate={selectedDate}
                  isMobile={isMobile}
                />
              </Box>

              {/* Additional Analytics Cards */}
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card sx={{ 
                    border: '1px solid #e5e7eb', 
                    height: '100%',
                    boxShadow: 'none',
                    transition: 'all 0.2s',
                    '&:hover': {
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                      transform: 'translateY(-2px)'
                    }
                  }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                        <Box sx={{ 
                          width: 40, 
                          height: 40, 
                          borderRadius: 2, 
                          bgcolor: '#eef2ff', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center' 
                        }}>
                          <TrendingUp sx={{ color: '#6366f1', fontSize: 22 }} />
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827' }}>
                          Performance Trends
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ color: '#6b7280', mb: 2, fontSize: '0.875rem' }}>
                        Track team leader performance over time with interactive charts and detailed metrics.
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                        <Chip label="Management Score" size="small" sx={{ bgcolor: '#eef2ff', color: '#6366f1', fontSize: '0.75rem', height: 24 }} />
                        <Chip label="Efficiency Rating" size="small" sx={{ bgcolor: '#dcfce7', color: '#166534', fontSize: '0.75rem', height: 24 }} />
                        <Chip label="Worker Satisfaction" size="small" sx={{ bgcolor: '#fef3c7', color: '#92400e', fontSize: '0.75rem', height: 24 }} />
                        <Chip label="Health Score" size="small" sx={{ bgcolor: '#dbeafe', color: '#1e40af', fontSize: '0.75rem', height: 24 }} />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card sx={{ 
                    border: '1px solid #e5e7eb', 
                    height: '100%',
                    boxShadow: 'none',
                    transition: 'all 0.2s',
                    '&:hover': {
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                      transform: 'translateY(-2px)'
                    }
                  }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                        <Box sx={{ 
                          width: 40, 
                          height: 40, 
                          borderRadius: 2, 
                          bgcolor: '#f0fdf4', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center' 
                        }}>
                          <Assessment sx={{ color: '#10b981', fontSize: 22 }} />
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827' }}>
                          Data Insights
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ color: '#6b7280', mb: 2, fontSize: '0.875rem' }}>
                        Real-time data from your work readiness assignments and team performance metrics.
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                        <Chip label="Real-time Data" size="small" sx={{ bgcolor: '#dcfce7', color: '#166534', fontSize: '0.75rem', height: 24 }} />
                        <Chip label="Historical Trends" size="small" sx={{ bgcolor: '#eef2ff', color: '#6366f1', fontSize: '0.75rem', height: 24 }} />
                        <Chip label="Team Comparison" size="small" sx={{ bgcolor: '#fce7f3', color: '#9f1239', fontSize: '0.75rem', height: 24 }} />
                        <Chip label="Performance KPIs" size="small" sx={{ bgcolor: '#fef3c7', color: '#92400e', fontSize: '0.75rem', height: 24 }} />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}
        </CardContent>
      </Card>
      </Box>

      {/* View Details Dialog */}
      <Dialog
        open={viewDetailsDialog.open}
        onClose={() => setViewDetailsDialog({ open: false, team: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{ width: 40, height: 40, mr: 2, bgcolor: '#10b981' }}>
              {viewDetailsDialog.team?.teamName.charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {viewDetailsDialog.team?.teamName} - Detailed Overview
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Team Leader: {viewDetailsDialog.team?.teamLeader}
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={() => setViewDetailsDialog({ open: false, team: null })}
            size="small"
          >
            <Close />
          </IconButton>
        </DialogTitle>
        
        <DialogContent>
          {viewDetailsDialog.team && (
            <Box className="print-dialog">
              {/* Print Header (print-only) */}
              <Box className="only-print">
                <Box className="print-header">
                  <Typography className="print-title">
                    {viewDetailsDialog.team.teamName} - Team Performance Report
                  </Typography>
                  <Typography className="print-subtitle">
                    Team Leader: {viewDetailsDialog.team.teamLeader} | Generated: {new Date().toLocaleDateString()}
                  </Typography>
                </Box>

                {/* Key Metrics */}
                <Box className="print-section">
                  <Typography className="print-section-title">Key Performance Metrics</Typography>
                  <Box className="print-metrics-grid">
                    <Box className="print-metric-card">
                      <Typography className="print-metric-value">
                        {viewDetailsDialog.team.complianceRate.toFixed(1)}%
                      </Typography>
                      <Typography className="print-metric-label">Compliance Rate</Typography>
                    </Box>
                    <Box className="print-metric-card">
                      <Typography className="print-metric-value">
                        {viewDetailsDialog.team.assignedWorkers}/{viewDetailsDialog.team.workerCount}
                      </Typography>
                      <Typography className="print-metric-label">Assigned Workers</Typography>
                    </Box>
                    <Box className="print-metric-card">
                      <Typography className="print-metric-value">
                        {viewDetailsDialog.team.todayAssignments}
                      </Typography>
                      <Typography className="print-metric-label">Today's Assignments</Typography>
                    </Box>
                    <Box className="print-metric-card">
                      <Typography className="print-metric-value">
                        {viewDetailsDialog.team.healthScore.toFixed(1)}%
                      </Typography>
                      <Typography className="print-metric-label">Health Score</Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>

              {/* Screen-only cards for better UI */}
              <Box className="no-print">
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white' }}>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" sx={{ fontWeight: 700 }}>
                          {viewDetailsDialog.team.complianceRate.toFixed(1)}%
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          Compliance Rate
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: 'white' }}>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" sx={{ fontWeight: 700 }}>
                          {viewDetailsDialog.team.assignedWorkers}/{viewDetailsDialog.team.workerCount}
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          Assigned Workers
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white' }}>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" sx={{ fontWeight: 700 }}>
                          {viewDetailsDialog.team.todayAssignments}
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          Today's Assignments
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'white' }}>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" sx={{ fontWeight: 700 }}>
                          {viewDetailsDialog.team.healthScore.toFixed(1)}%
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          Health Score
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>

              {/* Worker Breakdown (print-only) */}
              <Box className="only-print print-section">
                <Typography className="print-section-title">Worker Breakdown</Typography>
                <table className="print-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Count</th>
                      <th>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Total Workers</td>
                      <td>{viewDetailsDialog.team.workerCount}</td>
                      <td>100%</td>
                    </tr>
                    <tr>
                      <td>Assigned</td>
                      <td>{viewDetailsDialog.team.assignedWorkers}</td>
                      <td>{((viewDetailsDialog.team.assignedWorkers / viewDetailsDialog.team.workerCount) * 100).toFixed(1)}%</td>
                    </tr>
                    <tr>
                      <td>Unassigned</td>
                      <td>{viewDetailsDialog.team.unassignedWorkers}</td>
                      <td>{((viewDetailsDialog.team.unassignedWorkers / viewDetailsDialog.team.workerCount) * 100).toFixed(1)}%</td>
                    </tr>
                    <tr>
                      <td>Unselected</td>
                      <td>{viewDetailsDialog.team.unselectedWorkers.length}</td>
                      <td>{((viewDetailsDialog.team.unselectedWorkers.length / viewDetailsDialog.team.workerCount) * 100).toFixed(1)}%</td>
                    </tr>
                  </tbody>
                </table>
              </Box>

              {/* Screen-only worker breakdown */}
              <Box className="no-print">
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                      Worker Breakdown
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#f0f9ff', borderRadius: 2 }}>
                          <Typography variant="h4" sx={{ fontWeight: 700, color: '#0369a1' }}>
                            {viewDetailsDialog.team.workerCount}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Total Workers
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#f0fdf4', borderRadius: 2 }}>
                          <Typography variant="h4" sx={{ fontWeight: 700, color: '#166534' }}>
                            {viewDetailsDialog.team.assignedWorkers}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Assigned
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#fef3c7', borderRadius: 2 }}>
                          <Typography variant="h4" sx={{ fontWeight: 700, color: '#92400e' }}>
                            {viewDetailsDialog.team.unassignedWorkers}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Unassigned
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#fef2f2', borderRadius: 2 }}>
                          <Typography variant="h4" sx={{ fontWeight: 700, color: '#dc2626' }}>
                            {viewDetailsDialog.team.unselectedWorkers.length}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Unselected
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Box>

              {/* Assignment Details (print-only) */}
              <Box className="only-print print-section">
                <Typography className="print-section-title">Assignment Details</Typography>
                <table className="print-table">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th>Value</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Total Assignments</td>
                      <td>{viewDetailsDialog.team.totalAssignments}</td>
                      <td>Active</td>
                    </tr>
                    <tr>
                      <td>Completed Assignments</td>
                      <td>{viewDetailsDialog.team.completedAssignments}</td>
                      <td>{viewDetailsDialog.team.completedAssignments > 0 ? 'Completed' : 'Pending'}</td>
                    </tr>
                    <tr>
                      <td>Average Response Time</td>
                      <td>{viewDetailsDialog.team.averageResponseTime > 0 
                        ? `${viewDetailsDialog.team.averageResponseTime.toFixed(1)} hours`
                        : 'N/A'
                      }</td>
                      <td>{viewDetailsDialog.team.averageResponseTime > 24 ? 'Slow' : 'Good'}</td>
                    </tr>
                    <tr>
                      <td>High Risk Reports</td>
                      <td>{viewDetailsDialog.team.highRiskReports}</td>
                      <td>{viewDetailsDialog.team.highRiskReports > 0 ? 'Attention Required' : 'Normal'}</td>
                    </tr>
                  </tbody>
                </table>
              </Box>

              {/* Screen-only assignment details */}
              <Box className="no-print">
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                      Assignment Details
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Total Assignments
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 600 }}>
                            {viewDetailsDialog.team.totalAssignments}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Completed Assignments
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 600, color: '#10b981' }}>
                            {viewDetailsDialog.team.completedAssignments}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Average Response Time
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 600 }}>
                            {viewDetailsDialog.team.averageResponseTime > 0 
                              ? `${viewDetailsDialog.team.averageResponseTime.toFixed(1)}h`
                              : 'N/A'
                            }
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            High Risk Reports
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 600, color: '#ef4444' }}>
                            {viewDetailsDialog.team.highRiskReports}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Box>

              {/* Unselected Workers Details */}
              {viewDetailsDialog.team.unselectedWorkers.length > 0 && (
                <>
                  <Box className="only-print print-section">
                    <Typography className="print-section-title">Unselected Workers Details</Typography>
                    <table className="print-table">
                      <thead>
                        <tr>
                          <th>Worker ID</th>
                          <th>Reason</th>
                          <th>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewDetailsDialog.team.unselectedWorkers.map((unselected, idx) => (
                          <tr key={idx}>
                            <td>{unselected.workerId}</td>
                            <td>{unselected.reason}</td>
                            <td>{unselected.notes || 'No notes provided'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Box>

                  {/* Screen-only unselected workers */}
                  <Box className="no-print">
                    <Card>
                      <CardContent>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                          Unselected Workers Details
                        </Typography>
                        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                                <TableCell sx={{ fontWeight: 600 }}>Worker ID</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Reason</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Notes</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {viewDetailsDialog.team.unselectedWorkers.map((unselected, idx) => (
                                <TableRow key={idx}>
                                  <TableCell>
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                      {unselected.workerId}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Chip
                                      label={unselected.reason}
                                      size="small"
                                      sx={{
                                        backgroundColor: '#fef3c7',
                                        color: '#92400e',
                                        fontWeight: 600
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2" color="text.secondary">
                                      {unselected.notes || 'No notes provided'}
                                    </Typography>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </CardContent>
                    </Card>
                  </Box>
                </>
              )}

              {/* Print Footer (print-only) */}
              <Box className="only-print print-footer">
                <Typography>
                  Report generated on {new Date().toLocaleString()} | Multi-Team Analytics System
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => window.print()} variant="outlined" color="primary">
            Print
          </Button>
          <Button onClick={() => setViewDetailsDialog({ open: false, team: null })}>
            Close
          </Button>
        </DialogActions>
        
        {/* Print Styles */}
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            
            .print-dialog, .print-dialog * {
              visibility: visible;
            }
            
            .print-dialog {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              height: 100%;
              background: white;
              z-index: 9999;
              padding: 20px;
              box-shadow: none;
              border: none;
            }
            
            .print-header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 15px;
            }
            
            .print-title {
              font-size: 24px;
              font-weight: bold;
              color: #333;
              margin-bottom: 5px;
            }
            
            .print-subtitle {
              font-size: 14px;
              color: #666;
            }
            
            .print-section {
              margin-bottom: 25px;
              page-break-inside: avoid;
            }
            
            .print-section-title {
              font-size: 18px;
              font-weight: bold;
              color: #333;
              margin-bottom: 15px;
              border-bottom: 1px solid #ddd;
              padding-bottom: 5px;
            }
            
            .print-metrics-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 15px;
              margin-bottom: 20px;
            }
            
            .print-metric-card {
              text-align: center;
              padding: 15px;
              border: 1px solid #ddd;
              border-radius: 5px;
              background: #f9f9f9;
            }
            
            .print-metric-value {
              font-size: 20px;
              font-weight: bold;
              color: #333;
              margin-bottom: 5px;
            }
            
            .print-metric-label {
              font-size: 12px;
              color: #666;
              text-transform: uppercase;
            }
            
            .print-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            
            .print-table th,
            .print-table td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
              font-size: 12px;
            }
            
            .print-table th {
              background-color: #f5f5f5;
              font-weight: bold;
            }
            
            .print-footer {
              margin-top: 30px;
              text-align: center;
              font-size: 10px;
              color: #999;
              border-top: 1px solid #ddd;
              padding-top: 10px;
            }
            
            .no-print {
              display: none !important;
            }
            .only-print {
              display: block !important;
            }
          }
          .only-print { display: none; }
        `}</style>
      </Dialog>
    </Box>
    </LayoutWithSidebar>
  );
};

export default MultiTeamAnalytics;
