import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  LinearProgress,
  IconButton,
  Tooltip,
  Fade,
  Zoom,
  Divider,
  Stack,
  Avatar,
  Badge
} from '@mui/material';
import { calculateTeamRating, TeamRatingMetrics } from '../utils/teamRatingCalculator';
import { calculateMonthlyMetrics, AssignmentData } from '../utils/metricsCalculator';
import {
  TrendingUp,
  TrendingDown,
  Assessment,
  Schedule,
  CheckCircle,
  Warning,
  Error,
  Download,
  CalendarToday,
  People,
  Analytics,
  Timeline,
  EmojiEvents,
  HealthAndSafety,
  Speed,
  Assignment
} from '@mui/icons-material';
import { BackendAssignmentAPI } from '../utils/backendAssignmentApi';

interface MonthlyTrackingProps {
  teamLeaderId: string;
  team: string;
}

interface MonthlyMetrics {
  totalAssignments: number;
  completedAssignments: number;
  onTimeSubmissions: number;
  overdueSubmissions: number;
  notStartedAssignments: number;
  averageResponseTime: number;
  teamHealthScore: number;
  highRiskReports: number;
  caseClosures: number;
  completionRate: number;
  onTimeRate: number;
  monthOverMonthChange: {
    completionRate: number;
    onTimeRate: number;
    teamHealth: number;
    responseTime: number;
  };
}

interface WeeklyBreakdown {
  week: string;
  assigned: number;
  completed: number;
  completionRate: number;
  onTimeRate: number;
  avgResponseTime: number;
}

interface WorkerPerformance {
  id: string;
  name: string;
  assignments: number;
  completed: number;
  onTime: number;
  avgReadiness: number;
  avgFatigue: number;
  painReports: number;
  performanceRating: string;
}

const MonthlyAssignmentTracking: React.FC<MonthlyTrackingProps> = ({
  teamLeaderId,
  team
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  
  console.log('🔍 Debug Year Selection:');
  console.log('Current Year:', new Date().getFullYear());
  console.log('Selected Year State:', selectedYear);
  const [metrics, setMetrics] = useState<MonthlyMetrics | null>(null);
  const [weeklyBreakdown, setWeeklyBreakdown] = useState<WeeklyBreakdown[]>([]);
  const [workerPerformance, setWorkerPerformance] = useState<WorkerPerformance[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [workerPage, setWorkerPage] = useState(1);
  const [workersPerPage] = useState(10);
  const [currentMonthAssignments, setCurrentMonthAssignments] = useState<any[]>([]);
  // Hide month-over-month deltas until we have real comparison data
  const showMoM = false;

  useEffect(() => {
    fetchMonthlyData();
  }, [selectedMonth, selectedYear, teamLeaderId]);

  const fetchMonthlyData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch assignments for the selected month
      const startDate = new Date(parseInt(selectedYear), parseInt(selectedMonth.split('-')[1]) - 1, 1);
      const endDate = new Date(parseInt(selectedYear), parseInt(selectedMonth.split('-')[1]), 0);
      
      console.log('🔍 Debug Monthly Filtering:');
      console.log('Selected Month:', selectedMonth);
      console.log('Start Date:', startDate);
      console.log('End Date:', endDate);
      
      const assignmentsResponse = await BackendAssignmentAPI.getAssignments();
      const unselectedResponse = await BackendAssignmentAPI.getUnselectedWorkers();
      
      console.log('All Assignments:', assignmentsResponse.assignments);
      
      // Store current month assignments for system start date calculation
      setCurrentMonthAssignments(assignmentsResponse.assignments || []);
      
      // Filter data for selected month
      const monthAssignments = assignmentsResponse.assignments?.filter((assignment: any) => {
        const assignmentDate = new Date(assignment.assigned_date);
        // Normalize dates to avoid timezone issues
        const assignmentDateOnly = new Date(assignmentDate.getFullYear(), assignmentDate.getMonth(), assignmentDate.getDate());
        const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
        
        console.log('Assignment Date:', assignmentDateOnly, 'vs Range:', startDateOnly, 'to', endDateOnly);
        return assignmentDateOnly >= startDateOnly && assignmentDateOnly <= endDateOnly;
      }) || [];
      
      console.log('Filtered Month Assignments:', monthAssignments);
      
      const monthUnselected = unselectedResponse.unselectedWorkers?.filter((unselected: any) => {
        const unselectedDate = new Date(unselected.assignment_date);
        // Normalize dates to avoid timezone issues
        const unselectedDateOnly = new Date(unselectedDate.getFullYear(), unselectedDate.getMonth(), unselectedDate.getDate());
        const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
        
        return unselectedDateOnly >= startDateOnly && unselectedDateOnly <= endDateOnly;
      }) || [];
      
      // Calculate metrics
      const calculatedMetrics = calculateMonthlyMetrics(monthAssignments, monthUnselected);
      const weeklyData = calculateWeeklyBreakdown(monthAssignments);
      const workerData = calculateWorkerPerformance(monthAssignments);
      
      setMetrics(calculatedMetrics);
      setWeeklyBreakdown(weeklyData);
      setWorkerPerformance(workerData);
      
    } catch (err: any) {
      console.error('Error fetching monthly data:', err);
      setError(err.message || 'Failed to load monthly data');
    } finally {
      setLoading(false);
    }
  };

  const calculateMonthlyMetrics = (assignments: any[], unselected: any[]): MonthlyMetrics => {
    // Find the first assignment date to determine when system started
    const assignmentDates = assignments.map(a => new Date(a.assigned_date)).sort((a, b) => a.getTime() - b.getTime());
    const firstAssignmentDate = assignmentDates.length > 0 ? assignmentDates[0] : null;
    
    // Calculate days from first assignment to end of month
    const month = parseInt(selectedMonth.split('-')[1]) - 1;
    const year = parseInt(selectedYear);
    const endOfMonth = new Date(year, month + 1, 0);
    const systemStartDate = firstAssignmentDate || new Date(year, month, 1);
    const daysFromStart = Math.ceil((endOfMonth.getTime() - systemStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    
    console.log('🔍 System Start Date Debug:');
    console.log('First Assignment Date:', firstAssignmentDate);
    console.log('System Start Date:', systemStartDate);
    console.log('Days from Start:', daysFromStart);
    console.log('Total Days in Month:', totalDaysInMonth);
    
    const totalAssignments = assignments.length;
    const completedAssignments = assignments.filter(a => a.status === 'completed').length;
    const onTimeSubmissions = assignments.filter(a => {
      if (a.status !== 'completed') return false;
      const assignedDate = new Date(a.assigned_date);
      const completedDate = new Date(a.completed_at || a.updated_at);
      return completedDate <= new Date(assignedDate.getTime() + 24 * 60 * 60 * 1000); // Within 24 hours
    }).length;
    const overdueSubmissions = assignments.filter(a => a.status === 'overdue').length;
    const notStartedAssignments = assignments.filter(a => a.status === 'pending').length;
    
    // Calculate average response time (in hours)
    const completedWithTime = assignments.filter(a => a.completed_at);
    const totalResponseTime = completedWithTime.reduce((sum, a) => {
      const assignedDate = new Date(a.assigned_date);
      const completedDate = new Date(a.completed_at);
      return sum + (completedDate.getTime() - assignedDate.getTime()) / (1000 * 60 * 60);
    }, 0);
    const averageResponseTime = completedWithTime.length > 0 ? totalResponseTime / completedWithTime.length : 0;
    
    // Calculate team health score based on actual data
    let teamHealthScore = 0;
    if (completedAssignments > 0) {
      // Calculate based on readiness levels from completed assignments
      const readinessScores = assignments
        .filter(a => a.status === 'completed' && a.work_readiness?.readiness_level)
        .map(a => {
          const level = a.work_readiness.readiness_level;
          return level === 'fit' ? 100 : level === 'minor' ? 75 : level === 'not_fit' ? 25 : 0;
        });
      
      if (readinessScores.length > 0) {
        teamHealthScore = readinessScores.reduce((sum: number, score: number) => sum + score, 0) / readinessScores.length;
      } else {
        // Fallback calculation based on completion rate
        teamHealthScore = Math.min(100, (completedAssignments / totalAssignments) * 100);
      }
    }
    
    // Calculate high risk reports based on actual data
    const highRiskReports = assignments.filter(a => 
      a.status === 'completed' && 
      a.work_readiness?.readiness_level === 'not_fit'
    ).length;
    
    // Calculate case closures
    const caseClosures = unselected.filter(u => u.case_status === 'closed').length;
    
    // IMPROVED METRICS CALCULATION FOR BETTER TEAM LEADER REPORTING
    const completionRate = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0;
    
    // FIXED: On-Time Rate now includes overdue assignments for realistic reporting
    // This shows what percentage of ALL assignments were completed on time
    const onTimeRate = totalAssignments > 0 ? (onTimeSubmissions / totalAssignments) * 100 : 0;
    
    // Additional metrics for better insights
    const lateRate = totalAssignments > 0 ? (overdueSubmissions / totalAssignments) * 100 : 0;
    const pendingRate = totalAssignments > 0 ? (notStartedAssignments / totalAssignments) * 100 : 0;
    const efficiencyRate = completedAssignments > 0 ? (onTimeSubmissions / completedAssignments) * 100 : 0;
    
    console.log('📊 IMPROVED METRICS CALCULATION:');
    console.log(`   Total Assignments: ${totalAssignments}`);
    console.log(`   Completed: ${completedAssignments} (${completionRate.toFixed(1)}%)`);
    console.log(`   On-Time: ${onTimeSubmissions} (${onTimeRate.toFixed(1)}%)`);
    console.log(`   Overdue: ${overdueSubmissions} (${lateRate.toFixed(1)}%)`);
    console.log(`   Pending: ${notStartedAssignments} (${pendingRate.toFixed(1)}%)`);
    console.log(`   Efficiency: ${efficiencyRate.toFixed(1)}% (on-time/completed)`);
    
    // Month-over-month changes: real-time neutral (0) until previous-period data is available
    // When previous-month data exists, compute deltas against prior period
    return {
      totalAssignments,
      completedAssignments,
      onTimeSubmissions,
      overdueSubmissions,
      notStartedAssignments,
      averageResponseTime: Math.round(averageResponseTime * 10) / 10, // Round to 1 decimal
      teamHealthScore: Math.round(teamHealthScore * 10) / 10, // Round to 1 decimal
      highRiskReports,
      caseClosures,
      completionRate: Math.round(completionRate * 10) / 10, // Round to 1 decimal
      onTimeRate: Math.round(onTimeRate * 10) / 10, // Round to 1 decimal - NOW FIXED!
      monthOverMonthChange: {
        completionRate: 0,
        onTimeRate: 0,
        teamHealth: 0,
        responseTime: 0
      }
    };
  };

  const calculateWeeklyBreakdown = (assignments: any[]): WeeklyBreakdown[] => {
    const weeks: WeeklyBreakdown[] = [];
    const month = parseInt(selectedMonth.split('-')[1]) - 1;
    const year = parseInt(selectedYear);
    
    // Find the first assignment date to determine when system started
    const assignmentDates = assignments.map(a => new Date(a.assigned_date)).sort((a, b) => a.getTime() - b.getTime());
    const firstAssignmentDate = assignmentDates.length > 0 ? assignmentDates[0] : null;
    
    // Get first day of month and system start date
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const systemStartDate = firstAssignmentDate || firstDay;
    
    // Start from system start date, not beginning of month
    let currentWeekStart = new Date(systemStartDate);
    
    while (currentWeekStart <= lastDay) {
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      if (weekEnd > lastDay) weekEnd.setTime(lastDay.getTime());
      
      const weekAssignments = assignments.filter(a => {
        const assignmentDate = new Date(a.assigned_date);
        // Normalize dates to avoid timezone issues
        const assignmentDateOnly = new Date(assignmentDate.getFullYear(), assignmentDate.getMonth(), assignmentDate.getDate());
        const weekStartOnly = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate());
        const weekEndOnly = new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate());
        
        return assignmentDateOnly >= weekStartOnly && assignmentDateOnly <= weekEndOnly;
      });
      
      const completed = weekAssignments.filter(a => a.status === 'completed').length;
      const onTime = weekAssignments.filter(a => {
        if (a.status !== 'completed') return false;
        const assignedDate = new Date(a.assigned_date);
        const completedDate = new Date(a.completed_at || a.updated_at);
        return completedDate <= new Date(assignedDate.getTime() + 24 * 60 * 60 * 1000);
      }).length;
      
      weeks.push({
        week: `Week ${weeks.length + 1} (${currentWeekStart.getDate()}-${weekEnd.getDate()})`,
        assigned: weekAssignments.length,
        completed,
        completionRate: weekAssignments.length > 0 ? (completed / weekAssignments.length) * 100 : 0,
        onTimeRate: completed > 0 ? (onTime / completed) * 100 : 0,
        avgResponseTime: completed > 0 ? 
          weekAssignments
            .filter(a => a.status === 'completed' && a.completed_at)
            .reduce((sum, a) => {
              const assignedDate = new Date(a.assigned_date);
              const completedDate = new Date(a.completed_at);
              return sum + (completedDate.getTime() - assignedDate.getTime()) / (1000 * 60 * 60);
            }, 0) / completed : 0
      });
      
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }
    
    return weeks;
  };

  const calculateWorkerPerformance = (assignments: any[]): WorkerPerformance[] => {
    // Group assignments by worker
    const workerMap = new Map();
    
    assignments.forEach(assignment => {
      const workerId = assignment.worker_id;
      if (!workerMap.has(workerId)) {
        workerMap.set(workerId, {
          id: workerId,
          name: assignment.worker?.first_name + ' ' + assignment.worker?.last_name || 'Unknown Worker',
          assignments: 0,
          completed: 0,
          onTime: 0,
          avgReadiness: 0,
          avgFatigue: 0,
          painReports: 0,
          completedAssignments: [] // Track completed assignments for metrics
        });
      }
      
      const worker = workerMap.get(workerId);
      worker.assignments++;
      
      if (assignment.status === 'completed') {
        worker.completed++;
        worker.completedAssignments.push(assignment);
        
        // Check if on time
        const assignedDate = new Date(assignment.assigned_date);
        const completedDate = new Date(assignment.completed_at || assignment.updated_at);
        if (completedDate <= new Date(assignedDate.getTime() + 24 * 60 * 60 * 1000)) {
          worker.onTime++;
        }
      }
    });
    
    // Convert to array and calculate real metrics only for completed assignments
    return Array.from(workerMap.values()).map(worker => {
      let avgReadiness = 0;
      let avgFatigue = 0;
      let painReports = 0;
      
      // Only calculate metrics if worker has completed assignments
      if (worker.completed > 0) {
        // Calculate average readiness from completed assignments
        const readinessScores = worker.completedAssignments
          .filter((a: any) => a.work_readiness?.readiness_level)
          .map((a: any) => {
            const level = a.work_readiness.readiness_level;
            return level === 'fit' ? 100 : level === 'minor' ? 75 : level === 'not_fit' ? 25 : 0;
          });
        
        avgReadiness = readinessScores.length > 0 
          ? readinessScores.reduce((sum: number, score: number) => sum + score, 0) / readinessScores.length
          : 0;
        
        // Calculate average fatigue from completed assignments
        const fatigueScores = worker.completedAssignments
          .filter((a: any) => a.work_readiness?.fatigue_level)
          .map((a: any) => a.work_readiness.fatigue_level);
        
        avgFatigue = fatigueScores.length > 0
          ? fatigueScores.reduce((sum: number, score: number) => sum + score, 0) / fatigueScores.length
          : 0;
        
        // Count pain reports from completed assignments
        painReports = worker.completedAssignments
          .filter((a: any) => a.work_readiness?.pain_discomfort === 'yes').length;
      }
      
      return {
        id: worker.id,
        name: worker.name,
        assignments: worker.assignments,
        completed: worker.completed,
        onTime: worker.onTime,
        avgReadiness: avgReadiness,
        avgFatigue: avgFatigue,
        painReports: painReports,
        performanceRating: worker.completed === 0 ? 'No Data' :
                          worker.completed / worker.assignments > 0.9 ? 'Excellent' :
                          worker.completed / worker.assignments > 0.8 ? 'Good' :
                          worker.completed / worker.assignments > 0.7 ? 'Average' : 'Needs Improvement'
      };
    });
  };

  const handleExportReport = () => {
    // Mock export functionality
    const reportData = {
      month: selectedMonth,
      year: selectedYear,
      metrics,
      weeklyBreakdown,
      workerPerformance
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monthly-report-${selectedMonth}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getTrendIcon = (change: number | null | undefined) => {
    if (change == null || change === 0) return null;
    if (change > 0) return <TrendingUp sx={{ color: '#10b981', fontSize: 20 }} />;
    if (change < 0) return <TrendingDown sx={{ color: '#ef4444', fontSize: 20 }} />;
    return null;
  };

  const getTeamRating = (metrics: MonthlyMetrics) => {
    const teamRatingMetrics: TeamRatingMetrics = {
      completionRate: metrics.completionRate,
      onTimeRate: metrics.onTimeRate,
      overdueSubmissions: metrics.overdueSubmissions,
      totalAssignments: metrics.totalAssignments,
      notStartedAssignments: metrics.notStartedAssignments
    };
    
    return calculateTeamRating(teamRatingMetrics);
  };

  const getPerformanceColor = (rating: string) => {
    switch (rating) {
      case 'Excellent': return '#10b981';
      case 'Good': return '#3b82f6';
      case 'Average': return '#f59e0b';
      case 'Needs Improvement': return '#ef4444';
      case 'No Data': return '#6b7280';
      default: return '#6b7280';
    }
  };

  // Pagination functions for worker performance
  const getPaginatedWorkers = () => {
    // Sort workers by performance score (best to worst) before pagination
    const sortedWorkers = [...workerPerformance].sort((a, b) => {
      // Calculate performance score for ranking
      const scoreA = (a.completed / Math.max(a.assignments, 1)) * 100 + 
                    (a.onTime / Math.max(a.completed, 1)) * 100 + 
                    a.avgReadiness;
      const scoreB = (b.completed / Math.max(b.assignments, 1)) * 100 + 
                    (b.onTime / Math.max(b.completed, 1)) * 100 + 
                    b.avgReadiness;
      return scoreB - scoreA; // Higher score = better rank (first)
    });
    
    const startIndex = (workerPage - 1) * workersPerPage;
    const endIndex = startIndex + workersPerPage;
    return sortedWorkers.slice(startIndex, endIndex);
  };

  const getWorkerRank = (workerId: string, currentPageWorkers: any[]) => {
    // Calculate the global rank based on the sorted position
    const sortedWorkers = [...workerPerformance].sort((a, b) => {
      const scoreA = (a.completed / Math.max(a.assignments, 1)) * 100 + 
                    (a.onTime / Math.max(a.completed, 1)) * 100 + 
                    a.avgReadiness;
      const scoreB = (b.completed / Math.max(b.assignments, 1)) * 100 + 
                    (b.onTime / Math.max(b.completed, 1)) * 100 + 
                    b.avgReadiness;
      return scoreB - scoreA;
    });
    
    const globalRank = sortedWorkers.findIndex(w => w.id === workerId) + 1;
    return globalRank;
  };

  const getTotalWorkerPages = () => {
    return Math.ceil(workerPerformance.length / workersPerPage);
  };

  const handleWorkerPageChange = (newPage: number) => {
    setWorkerPage(newPage);
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
    <Box sx={{ 
      p: 3,
      background: '#FAFAFA',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <Stack 
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        sx={{ mb: 4 }}
      >
        <Box>
          <Typography variant="h4" sx={{ 
            fontWeight: 700, 
            color: '#0F172A',
            fontSize: '1.875rem',
            mb: 0.5
          }}>
            Performance Analytics
          </Typography>
          <Typography variant="body1" sx={{ 
            color: '#64748B'
          }}>
            Monthly insights and team performance tracking
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={handleExportReport}
          startIcon={<Download />}
          sx={{ 
            bgcolor: '#4F46E5',
            color: 'white',
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
            py: 1.5,
            borderRadius: 2,
            boxShadow: 'none',
            '&:hover': { 
              bgcolor: '#4338CA',
              boxShadow: 'none'
            }
          }}
        >
          Export Report
        </Button>
      </Stack>

      {/* Date Filter */}
      <Card sx={{ 
        mb: 4,
        background: '#FFFFFF',
        borderRadius: 3,
        border: '1px solid #E2E8F0',
        boxShadow: 'none'
      }}>
        <CardContent sx={{ p: 3 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <Chip 
              icon={<CalendarToday sx={{ fontSize: 16 }} />}
              label={new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              sx={{ 
                bgcolor: '#EEF2FF',
                color: '#4F46E5',
                fontWeight: 600,
                fontSize: '0.875rem',
                height: 32
              }}
            />
            <TextField
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                const year = e.target.value.split('-')[0];
                setSelectedYear(year);
              }}
              size="small"
              sx={{
                minWidth: 180,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '& fieldset': {
                    borderColor: '#E2E8F0'
                  },
                  '&:hover fieldset': {
                    borderColor: '#CBD5E1'
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#4F46E5',
                    borderWidth: 1
                  }
                }
              }}
            />
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                const currentMonth = new Date().toISOString().slice(0, 7);
                const currentYear = new Date().getFullYear().toString();
                setSelectedMonth(currentMonth);
                setSelectedYear(currentYear);
              }}
              sx={{ 
                color: '#64748B',
                borderColor: '#E2E8F0',
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 2,
                '&:hover': {
                  bgcolor: '#F8FAFC',
                  borderColor: '#CBD5E1'
                }
              }}
            >
              Today
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Monthly Overview */}
      {metrics && (
        <Box sx={{ mb: 4 }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
            <Box>
              <Typography variant="h5" sx={{ 
                fontWeight: 700, 
                color: '#0F172A',
                fontSize: '1.5rem',
                mb: 0.5
              }}>
                {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Overview
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748B' }}>
                Key performance indicators
              </Typography>
            </Box>
            {(() => {
              if (currentMonthAssignments.length > 0) {
                const assignmentDates = currentMonthAssignments.map((a: any) => new Date(a.assigned_date)).sort((a: Date, b: Date) => a.getTime() - b.getTime());
                const firstAssignmentDate = assignmentDates.length > 0 ? assignmentDates[0] : null;
                if (firstAssignmentDate && firstAssignmentDate.getDate() > 1) {
                  return (
                    <Chip
                      icon={<Timeline sx={{ fontSize: 16 }} />}
                      label={`Started: ${firstAssignmentDate.toLocaleDateString()}`}
                      size="small"
                      sx={{ 
                        bgcolor: '#EFF6FF',
                        color: '#3B82F6',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        height: 28
                      }}
                    />
                  );
                }
              }
              return null;
            })()}
          </Stack>
            
          <Grid container spacing={3}>
            {/* Team Rating */}
            <Grid item xs={12} sm={6} lg={3}>
              <Card sx={{ 
                p: 3,
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 3,
                boxShadow: 'none',
                transition: 'all 0.15s ease',
                '&:hover': {
                  borderColor: '#CBD5E1',
                  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)'
                }
              }}>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      background: metrics ? `${getTeamRating(metrics).color}15` : '#F1F5F9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <EmojiEvents sx={{ fontSize: 20, color: metrics ? getTeamRating(metrics).color : '#64748B' }} />
                    </Box>
                    <Typography variant="caption" sx={{ 
                      color: '#64748B',
                      fontWeight: 600,
                      fontSize: '0.6875rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Team Rating
                    </Typography>
                  </Stack>
                  
                  <Box>
                    <Typography variant="h3" sx={{ 
                      fontWeight: 700, 
                      color: metrics ? getTeamRating(metrics).color : '#64748B',
                      fontSize: '2rem',
                      lineHeight: 1
                    }}>
                      {metrics ? getTeamRating(metrics).grade : 'N/A'}
                    </Typography>
                    {metrics && (
                      <Typography variant="body2" sx={{ 
                        color: '#64748B',
                        fontSize: '0.75rem',
                        mt: 0.5
                      }}>
                        Score: {getTeamRating(metrics).score.toFixed(1)}/100
                      </Typography>
                    )}
                  </Box>
                </Stack>
              </Card>
            </Grid>
              
            {/* Total Assignments */}
            <Grid item xs={12} sm={6} lg={3}>
              <Card sx={{ 
                p: 3,
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 3,
                boxShadow: 'none',
                transition: 'all 0.15s ease',
                '&:hover': {
                  borderColor: '#CBD5E1',
                  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)'
                }
              }}>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      background: '#EFF6FF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Assignment sx={{ fontSize: 20, color: '#3B82F6' }} />
                    </Box>
                    <Typography variant="caption" sx={{ 
                      color: '#64748B',
                      fontWeight: 600,
                      fontSize: '0.6875rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Total Assignments
                    </Typography>
                  </Stack>
                  <Typography variant="h3" sx={{ 
                    fontWeight: 700, 
                    color: '#0F172A',
                    fontSize: '2rem',
                    lineHeight: 1
                  }}>
                    {metrics.totalAssignments}
                  </Typography>
                </Stack>
              </Card>
            </Grid>
            
            {/* Completion Rate */}
            <Grid item xs={12} sm={6} lg={3}>
              <Card sx={{ 
                p: 3,
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 3,
                boxShadow: 'none',
                transition: 'all 0.15s ease',
                '&:hover': {
                  borderColor: '#CBD5E1',
                  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)'
                }
              }}>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      background: '#ECFDF5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <CheckCircle sx={{ fontSize: 20, color: '#10B981' }} />
                    </Box>
                    <Typography variant="caption" sx={{ 
                      color: '#64748B',
                      fontWeight: 600,
                      fontSize: '0.6875rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Completion Rate
                    </Typography>
                  </Stack>
                  <Box>
                    <Typography variant="h3" sx={{ 
                      fontWeight: 700, 
                      color: '#0F172A',
                      fontSize: '2rem',
                      lineHeight: 1
                    }}>
                      {metrics.completionRate.toFixed(1)}%
                    </Typography>
                    <Box sx={{ 
                      mt: 1.5,
                      height: 6,
                      background: '#F1F5F9',
                      borderRadius: 3,
                      overflow: 'hidden'
                    }}>
                      <Box sx={{
                        width: `${metrics.completionRate}%`,
                        height: '100%',
                        background: '#10B981',
                        borderRadius: 3,
                        transition: 'width 0.3s ease'
                      }} />
                    </Box>
                  </Box>
                </Stack>
              </Card>
            </Grid>
            
            {/* On-Time Rate */}
            <Grid item xs={12} sm={6} lg={3}>
              <Card sx={{ 
                p: 3,
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 3,
                boxShadow: 'none',
                transition: 'all 0.15s ease',
                '&:hover': {
                  borderColor: '#CBD5E1',
                  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)'
                }
              }}>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      background: '#FFFBEB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Schedule sx={{ fontSize: 20, color: '#F59E0B' }} />
                    </Box>
                    <Typography variant="caption" sx={{ 
                      color: '#64748B',
                      fontWeight: 600,
                      fontSize: '0.6875rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      On-Time Rate
                    </Typography>
                  </Stack>
                  <Box>
                    <Typography variant="h3" sx={{ 
                      fontWeight: 700, 
                      color: '#0F172A',
                      fontSize: '2rem',
                      lineHeight: 1
                    }}>
                      {metrics.onTimeRate.toFixed(1)}%
                    </Typography>
                    <Box sx={{ 
                      mt: 1.5,
                      height: 6,
                      background: '#F1F5F9',
                      borderRadius: 3,
                      overflow: 'hidden'
                    }}>
                      <Box sx={{
                        width: `${metrics.onTimeRate}%`,
                        height: '100%',
                        background: '#F59E0B',
                        borderRadius: 3,
                        transition: 'width 0.3s ease'
                      }} />
                    </Box>
                  </Box>
                </Stack>
              </Card>
            </Grid>
            
            {/* Avg Response Time */}
            <Grid item xs={12} sm={6} lg={3}>
              <Card sx={{ 
                p: 3,
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 3,
                boxShadow: 'none',
                transition: 'all 0.15s ease',
                '&:hover': {
                  borderColor: '#CBD5E1',
                  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)'
                }
              }}>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      background: '#F3F4F6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Speed sx={{ fontSize: 20, color: '#6B7280' }} />
                    </Box>
                    <Typography variant="caption" sx={{ 
                      color: '#64748B',
                      fontWeight: 600,
                      fontSize: '0.6875rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Avg Response
                    </Typography>
                  </Stack>
                  <Box>
                    <Typography variant="h3" sx={{ 
                      fontWeight: 700, 
                      color: '#0F172A',
                      fontSize: '2rem',
                      lineHeight: 1
                    }}>
                      {metrics.averageResponseTime.toFixed(1)}h
                    </Typography>
                    <Typography variant="body2" sx={{ 
                      color: '#64748B',
                      fontSize: '0.75rem',
                      mt: 0.5
                    }}>
                      {metrics.completedAssignments} completed
                    </Typography>
                  </Box>
                </Stack>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Detailed Tabs */}
      <Fade in timeout={2000}>
        <Card sx={{ 
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: { xs: 2, md: 4 },
          border: '1px solid #e2e8f0',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          overflow: 'hidden'
        }}>
          <Box sx={{ 
            background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
            borderBottom: '1px solid #cbd5e1'
          }}>
            <Tabs 
              value={activeTab} 
              onChange={(e, newValue) => setActiveTab(newValue)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  minHeight: { xs: 48, sm: 60 },
                  px: { xs: 2, sm: 3 },
                  '&.Mui-selected': {
                    color: '#6366f1'
                  }
                },
                '& .MuiTabs-indicator': {
                  height: 3,
                  borderRadius: '3px 3px 0 0',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                },
                '& .MuiTabs-scrollButtons': {
                  color: '#6366f1'
                }
              }}
            >
              <Tab 
                icon={<Timeline sx={{ fontSize: { xs: 18, sm: 20 } }} />} 
                iconPosition="start" 
                label="Weekly" 
                sx={{ '& .MuiTab-iconWrapper': { mr: { xs: 0.5, sm: 1 } } }}
              />
              <Tab 
                icon={<People sx={{ fontSize: { xs: 18, sm: 20 } }} />} 
                iconPosition="start" 
                label="Workers" 
                sx={{ '& .MuiTab-iconWrapper': { mr: { xs: 0.5, sm: 1 } } }}
              />
              <Tab 
                icon={<Analytics sx={{ fontSize: { xs: 18, sm: 20 } }} />} 
                iconPosition="start" 
                label="Metrics" 
                sx={{ '& .MuiTab-iconWrapper': { mr: { xs: 0.5, sm: 1 } } }}
              />
            </Tabs>
          </Box>
        
        <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
          {/* Weekly Breakdown Tab */}
          {activeTab === 0 && (
            <Box>
              <Stack direction="row" spacing={1.5} alignItems="center" mb={{ xs: 2, sm: 3, md: 4 }}>
                <Avatar sx={{ bgcolor: '#6366f1', width: { xs: 32, sm: 36 }, height: { xs: 32, sm: 36 } }}>
                  <Timeline sx={{ color: 'white', fontSize: { xs: 16, sm: 18 } }} />
                </Avatar>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a', fontSize: { xs: '1.1rem', sm: '1.25rem', md: '1.5rem' } }}>
                    Weekly Performance
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b', fontSize: { xs: '0.75rem', sm: '0.8rem' } }}>
                    Track performance trends across weeks
                  </Typography>
                </Box>
              </Stack>
              {weeklyBreakdown.length === 0 || weeklyBreakdown.every(week => week.assigned === 0) ? (
                <Alert 
                  severity="info" 
                  sx={{ 
                    mb: 3,
                    borderRadius: 3,
                    bgcolor: '#dbeafe',
                    border: '1px solid #93c5fd',
                    '& .MuiAlert-icon': {
                      color: '#1d4ed8'
                    }
                  }}
                >
                  <Typography variant="body1" sx={{ fontWeight: 500, color: '#1e40af' }}>
                    No assignment data available for {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.
                    Create some assignments to see weekly performance breakdown.
                  </Typography>
                </Alert>
              ) : (
                <TableContainer 
                  component={Paper} 
                  sx={{ 
                    borderRadius: 3,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                    overflow: 'auto',
                    maxWidth: '100%'
                  }}
                >
                  <Table>
                    <TableHead sx={{ 
                      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%',
                      borderBottom: '2px solid #e2e8f0'
                    }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, color: '#0f172a', fontSize: { xs: '0.8rem', sm: '0.95rem' }, minWidth: 120 }}><strong>Week</strong></TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, color: '#0f172a', fontSize: { xs: '0.8rem', sm: '0.95rem' }, minWidth: 80 }}><strong>Assigned</strong></TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, color: '#0f172a', fontSize: { xs: '0.8rem', sm: '0.95rem' }, minWidth: 80 }}><strong>Completed</strong></TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, color: '#0f172a', fontSize: { xs: '0.8rem', sm: '0.95rem' }, minWidth: 120 }}><strong>Completion Rate</strong></TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, color: '#0f172a', fontSize: { xs: '0.8rem', sm: '0.95rem' }, minWidth: 100 }}><strong>On-Time Rate</strong></TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, color: '#0f172a', fontSize: { xs: '0.8rem', sm: '0.95rem' }, minWidth: 120 }}><strong>Avg Response Time</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {weeklyBreakdown.map((week, index) => (
                        <TableRow 
                          key={index}
                          sx={{
                            '&:hover': {
                              bgcolor: '#f8fafc'
                            },
                            '&:nth-of-type(even)': {
                              bgcolor: '#fafbfc'
                            }
                          }}
                        >
                          <TableCell sx={{ fontWeight: 600, color: '#374151', fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>{week.week}</TableCell>
                          <TableCell align="center">
                            <Badge 
                              badgeContent={week.assigned} 
                              color="primary"
                              sx={{ 
                                '& .MuiBadge-badge': {
                                  bgcolor: '#6366f1',
                                  fontWeight: 600
                                }
                              }}
                            >
                              <Assignment sx={{ color: '#6b7280' }} />
                            </Badge>
                          </TableCell>
                          <TableCell align="center">
                            <Badge 
                              badgeContent={week.completed} 
                              color="success"
                              sx={{ 
                                '& .MuiBadge-badge': {
                                  bgcolor: '#10b981',
                                  fontWeight: 600
                                }
                              }}
                            >
                              <CheckCircle sx={{ color: '#6b7280' }} />
                            </Badge>
                          </TableCell>
                          <TableCell align="center">
                            {week.assigned > 0 ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={week.completionRate}
                                  sx={{ width: 80, height: 10, borderRadius: 5 }}
                                  color={week.completionRate >= 90 ? 'success' : week.completionRate >= 80 ? 'warning' : 'error'}
                                />
                                <Typography variant="body2" sx={{ fontWeight: 600, color: '#374151', minWidth: 40 }}>
                                  {week.completionRate.toFixed(1)}%
                                </Typography>
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.secondary">-</Typography>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            {week.assigned > 0 ? (
                              <Chip
                                label={`${week.onTimeRate.toFixed(1)}%`}
                                size="small"
                                sx={{
                                  bgcolor: week.onTimeRate >= 85 ? '#dcfce7' : week.onTimeRate >= 70 ? '#fef3c7' : '#fecaca',
                                  color: week.onTimeRate >= 85 ? '#166534' : week.onTimeRate >= 70 ? '#92400e' : '#991b1b',
                                  fontWeight: 600,
                                  border: '1px solid',
                                  borderColor: week.onTimeRate >= 85 ? '#bbf7d0' : week.onTimeRate >= 70 ? '#fde68a' : '#fca5a5'
                                }}
                              />
                            ) : (
                              <Typography variant="body2" color="text.secondary">-</Typography>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            {week.assigned > 0 ? (
                              <Chip
                                icon={<Speed />}
                                label={`${week.avgResponseTime.toFixed(1)}h`}
                                size="small"
                                sx={{
                                  bgcolor: '#f0f9ff',
                                  color: '#0369a1',
                                  fontWeight: 600,
                                  border: '1px solid #bae6fd'
                                }}
                              />
                            ) : (
                              <Typography variant="body2" color="text.secondary">-</Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}

          {/* Worker Performance Tab */}
          {activeTab === 1 && (
            <Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" mb={{ xs: 2, sm: 3, md: 4 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar sx={{ bgcolor: '#8b5cf6', width: { xs: 32, sm: 36 }, height: { xs: 32, sm: 36 } }}>
                    <People sx={{ color: 'white', fontSize: { xs: 16, sm: 18 } }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a', fontSize: { xs: '1.1rem', sm: '1.25rem', md: '1.5rem' } }}>
                      Worker Performance
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#64748b', fontSize: { xs: '0.75rem', sm: '0.8rem' } }}>
                      Ranked performance metrics and insights
                    </Typography>
                  </Box>
                </Stack>
                <Chip
                  icon={<People sx={{ fontSize: { xs: 16, sm: 18 } }} />}
                  label={`${((workerPage - 1) * workersPerPage) + 1}-${Math.min(workerPage * workersPerPage, workerPerformance.length)} of ${workerPerformance.length} workers`}
                  sx={{
                    bgcolor: '#f3f4f6',
                    color: '#374151',
                    fontWeight: 600,
                    px: { xs: 1.5, sm: 2 },
                    py: { xs: 0.5, sm: 1 },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    width: { xs: '100%', sm: 'auto' },
                    justifyContent: 'center'
                  }}
                />
              </Stack>
              <TableContainer 
                component={Paper} 
                sx={{ 
                  borderRadius: 3,
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                  overflow: 'auto',
                  maxWidth: '100%'
                }}
              >
                <Table>
                  <TableHead sx={{ 
                    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%',
                    borderBottom: '2px solid #e2e8f0'
                  }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, color: '#0f172a', fontSize: { xs: '0.8rem', sm: '0.95rem' }, minWidth: 60 }}><strong>Rank</strong></TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#0f172a', fontSize: { xs: '0.8rem', sm: '0.95rem' }, minWidth: 120 }}><strong>Worker</strong></TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, color: '#0f172a', fontSize: { xs: '0.8rem', sm: '0.95rem' }, minWidth: 80 }}><strong>Assignments</strong></TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, color: '#0f172a', fontSize: { xs: '0.8rem', sm: '0.95rem' }, minWidth: 80 }}><strong>Completed</strong></TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, color: '#0f172a', fontSize: { xs: '0.8rem', sm: '0.95rem' }, minWidth: 80 }}><strong>On-Time</strong></TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, color: '#0f172a', fontSize: { xs: '0.8rem', sm: '0.95rem' }, minWidth: 100 }}><strong>Avg Readiness</strong></TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, color: '#0f172a', fontSize: { xs: '0.8rem', sm: '0.95rem' }, minWidth: 100 }}><strong>Avg Fatigue</strong></TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, color: '#0f172a', fontSize: { xs: '0.8rem', sm: '0.95rem' }, minWidth: 100 }}><strong>Performance</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {getPaginatedWorkers().map((worker) => {
                      const rank = getWorkerRank(worker.id, getPaginatedWorkers());
                      return (
                        <TableRow 
                          key={worker.id}
                          sx={{
                            '&:hover': {
                              bgcolor: '#f8fafc',
                              transform: 'scale(1.01)',
                              transition: 'all 0.2s ease'
                            },
                            '&:nth-of-type(even)': {
                              bgcolor: '#fafbfc'
                            }
                          }}
                        >
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {rank <= 3 ? (
                                <Box sx={{ 
                                  width: 32, 
                                  height: 32, 
                                  borderRadius: '50%', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  color: 'white',
                                  fontWeight: 'bold',
                                  fontSize: '0.875rem',
                                  background: rank === 1 ? 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)' : 
                                            rank === 2 ? 'linear-gradient(135deg, #c0c0c0 0%, #e5e7eb 100%)' : 
                                            'linear-gradient(135deg, #cd7f32 0%, #f59e0b 100%)',
                                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                  border: '2px solid white'
                                }}>
                                  <EmojiEvents sx={{ fontSize: 16 }} />
                                </Box>
                              ) : (
                                <Typography variant="body2" sx={{ fontWeight: 700, color: '#6b7280', fontSize: '1rem' }}>
                                  #{rank}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Avatar sx={{ bgcolor: '#6366f1', width: { xs: 28, sm: 32 }, height: { xs: 28, sm: 32 }, fontSize: { xs: '0.75rem', sm: '0.875rem' }, fontWeight: 600 }}>
                                {worker.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </Avatar>
                              <Typography variant="body1" sx={{ fontWeight: 600, color: '#374151', fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                                {worker.name}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell align="center">
                            <Badge 
                              badgeContent={worker.assignments} 
                              color="primary"
                              sx={{ 
                                '& .MuiBadge-badge': {
                                  bgcolor: '#6366f1',
                                  fontWeight: 600
                                }
                              }}
                            >
                              <Assignment sx={{ color: '#6b7280' }} />
                            </Badge>
                          </TableCell>
                          <TableCell align="center">
                            <Badge 
                              badgeContent={worker.completed} 
                              color="success"
                              sx={{ 
                                '& .MuiBadge-badge': {
                                  bgcolor: '#10b981',
                                  fontWeight: 600
                                }
                              }}
                            >
                              <CheckCircle sx={{ color: '#6b7280' }} />
                            </Badge>
                          </TableCell>
                          <TableCell align="center">
                            <Badge 
                              badgeContent={worker.onTime} 
                              color="warning"
                              sx={{ 
                                '& .MuiBadge-badge': {
                                  bgcolor: '#f59e0b',
                                  fontWeight: 600
                                }
                              }}
                            >
                              <Schedule sx={{ color: '#6b7280' }} />
                            </Badge>
                          </TableCell>
                          <TableCell align="center">
                            {worker.completed > 0 ? (
                              <Chip
                                icon={<HealthAndSafety />}
                                label={`${worker.avgReadiness.toFixed(0)}%`}
                                size="small"
                                sx={{
                                  bgcolor: worker.avgReadiness >= 85 ? '#dcfce7' : worker.avgReadiness >= 70 ? '#fef3c7' : '#fecaca',
                                  color: worker.avgReadiness >= 85 ? '#166534' : worker.avgReadiness >= 70 ? '#92400e' : '#991b1b',
                                  fontWeight: 600,
                                  border: '1px solid',
                                  borderColor: worker.avgReadiness >= 85 ? '#bbf7d0' : worker.avgReadiness >= 70 ? '#fde68a' : '#fca5a5'
                                }}
                              />
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                -
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            {worker.completed > 0 ? (
                              <Chip
                                icon={<Speed />}
                                label={`${worker.avgFatigue.toFixed(1)}/10`}
                                size="small"
                                sx={{
                                  bgcolor: worker.avgFatigue <= 3 ? '#dcfce7' : worker.avgFatigue <= 5 ? '#fef3c7' : '#fecaca',
                                  color: worker.avgFatigue <= 3 ? '#166534' : worker.avgFatigue <= 5 ? '#92400e' : '#991b1b',
                                  fontWeight: 600,
                                  border: '1px solid',
                                  borderColor: worker.avgFatigue <= 3 ? '#bbf7d0' : worker.avgFatigue <= 5 ? '#fde68a' : '#fca5a5'
                                }}
                              />
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                -
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={worker.performanceRating}
                              size="small"
                              sx={{ 
                                backgroundColor: getPerformanceColor(worker.performanceRating), 
                                color: 'white',
                                fontWeight: 600,
                                px: 2,
                                py: 0.5,
                                borderRadius: 2,
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {/* Enhanced Pagination */}
              {getTotalWorkerPages() > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleWorkerPageChange(workerPage - 1)}
                      disabled={workerPage === 1}
                      sx={{ 
                        minWidth: 44,
                        height: 44,
                        borderRadius: 3,
                        borderColor: '#d1d5db',
                        color: '#6b7280',
                        '&:hover': {
                          borderColor: '#6366f1',
                          color: '#6366f1',
                          bgcolor: '#f8fafc'
                        },
                        '&:disabled': {
                          borderColor: '#e5e7eb',
                          color: '#9ca3af'
                        }
                      }}
                    >
                      ←
                    </Button>
                    
                    {Array.from({ length: Math.min(5, getTotalWorkerPages()) }, (_, i) => {
                      let pageNum: number;
                      if (getTotalWorkerPages() <= 5) {
                        pageNum = i + 1;
                      } else if (workerPage <= 3) {
                        pageNum = i + 1;
                      } else if (workerPage >= getTotalWorkerPages() - 2) {
                        pageNum = getTotalWorkerPages() - 4 + i;
                      } else {
                        pageNum = workerPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={workerPage === pageNum ? "contained" : "outlined"}
                          size="small"
                          onClick={() => handleWorkerPageChange(pageNum)}
                          sx={{
                            minWidth: 44,
                            height: 44,
                            borderRadius: 3,
                            backgroundColor: workerPage === pageNum ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'transparent',
                            color: workerPage === pageNum ? 'white' : '#6b7280',
                            borderColor: workerPage === pageNum ? 'transparent' : '#d1d5db',
                            fontWeight: 600,
                            '&:hover': {
                              backgroundColor: workerPage === pageNum ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' : '#f8fafc',
                              borderColor: workerPage === pageNum ? 'transparent' : '#6366f1',
                              color: workerPage === pageNum ? 'white' : '#6366f1',
                              transform: 'translateY(-1px)'
                            },
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleWorkerPageChange(workerPage + 1)}
                      disabled={workerPage === getTotalWorkerPages()}
                      sx={{ 
                        minWidth: 44,
                        height: 44,
                        borderRadius: 3,
                        borderColor: '#d1d5db',
                        color: '#6b7280',
                        '&:hover': {
                          borderColor: '#6366f1',
                          color: '#6366f1',
                          bgcolor: '#f8fafc'
                        },
                        '&:disabled': {
                          borderColor: '#e5e7eb',
                          color: '#9ca3af'
                        }
                      }}
                    >
                      →
                    </Button>
                  </Stack>
                </Box>
              )}
            </Box>
          )}

          {/* Detailed Metrics Tab */}
          {activeTab === 2 && metrics && (
            <Box>
              <Stack direction="row" spacing={1.5} alignItems="center" mb={{ xs: 2, sm: 3, md: 4 }}>
                <Avatar sx={{ bgcolor: '#10b981', width: { xs: 32, sm: 36 }, height: { xs: 32, sm: 36 } }}>
                  <Analytics sx={{ color: 'white', fontSize: { xs: 16, sm: 18 } }} />
                </Avatar>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a', fontSize: { xs: '1.1rem', sm: '1.25rem', md: '1.5rem' } }}>
                    Detailed Metrics
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b', fontSize: { xs: '0.75rem', sm: '0.8rem' } }}>
                    Comprehensive performance analysis and insights
                  </Typography>
                </Box>
              </Stack>
              <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
                <Grid item xs={12} md={6}>
                  <Card sx={{ 
                    p: { xs: 1.5, sm: 2, md: 2.5 }, 
                    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                    borderRadius: { xs: 2, sm: 4 },
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: { xs: 'none', sm: 'translateY(-2px)' },
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)'
                    }
                  }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" mb={{ xs: 1.5, sm: 2, md: 3 }}>
                      <Avatar sx={{ bgcolor: '#6366f1', width: { xs: 28, sm: 32 }, height: { xs: 28, sm: 32 } }}>
                        <Assignment sx={{ color: 'white', fontSize: { xs: 14, sm: 16 } }} />
                      </Avatar>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', fontSize: { xs: '0.9rem', sm: '1rem', md: '1.25rem' } }}>
                        Assignment Status
                      </Typography>
                    </Stack>
                    <Stack spacing={{ xs: 2, sm: 2.5, md: 3 }}>
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <CheckCircle sx={{ color: '#10b981', fontSize: { xs: 16, sm: 18 } }} />
                            <Typography variant="body1" sx={{ fontWeight: 600, color: '#374151', fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>Completed</Typography>
                          </Stack>
                          <Typography variant="body1" sx={{ fontWeight: 700, color: '#0f172a', fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>{metrics.completedAssignments}</Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={(metrics.completedAssignments / metrics.totalAssignments) * 100}
                          sx={{ 
                            height: { xs: 8, sm: 10, md: 12 }, 
                            borderRadius: { xs: 4, sm: 5, md: 6 },
                            bgcolor: '#e5e7eb',
                            '& .MuiLinearProgress-bar': {
                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              borderRadius: { xs: 4, sm: 5, md: 6 }
                            }
                          }}
                        />
                      </Box>
                      
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Schedule sx={{ color: '#3b82f6', fontSize: 18 }} />
                            <Typography variant="body1" sx={{ fontWeight: 600, color: '#374151' }}>On-Time</Typography>
                          </Stack>
                          <Typography variant="body1" sx={{ fontWeight: 700, color: '#0f172a' }}>{metrics.onTimeSubmissions}</Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={(metrics.onTimeSubmissions / metrics.totalAssignments) * 100}
                          sx={{ 
                            height: 12, 
                            borderRadius: 6,
                            bgcolor: '#e5e7eb',
                            '& .MuiLinearProgress-bar': {
                              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                              borderRadius: 6
                            }
                          }}
                        />
                      </Box>
                      
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Warning sx={{ color: '#ef4444', fontSize: 18 }} />
                            <Typography variant="body1" sx={{ fontWeight: 600, color: '#374151' }}>Overdue</Typography>
                          </Stack>
                          <Typography variant="body1" sx={{ fontWeight: 700, color: '#0f172a' }}>{metrics.overdueSubmissions}</Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={(metrics.overdueSubmissions / metrics.totalAssignments) * 100}
                          sx={{ 
                            height: 12, 
                            borderRadius: 6,
                            bgcolor: '#e5e7eb',
                            '& .MuiLinearProgress-bar': {
                              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                              borderRadius: 6
                            }
                          }}
                        />
                      </Box>
                      
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Error sx={{ color: '#f59e0b', fontSize: 18 }} />
                            <Typography variant="body1" sx={{ fontWeight: 600, color: '#374151' }}>Not Started</Typography>
                          </Stack>
                          <Typography variant="body1" sx={{ fontWeight: 700, color: '#0f172a' }}>{metrics.notStartedAssignments}</Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={(metrics.notStartedAssignments / metrics.totalAssignments) * 100}
                          sx={{ 
                            height: 12, 
                            borderRadius: 6,
                            bgcolor: '#e5e7eb',
                            '& .MuiLinearProgress-bar': {
                              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                              borderRadius: 6
                            }
                          }}
                        />
                      </Box>
                      
                      {/* NEW: Overall Assignment Status Progress Bar */}
                      <Box sx={{ mt: 3, p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                        <Typography variant="body1" sx={{ mb: 2, fontWeight: 600, color: '#374151' }}>Overall Assignment Status</Typography>
                        <Box sx={{ position: 'relative', height: 20, borderRadius: 10, bgcolor: '#e5e7eb', overflow: 'hidden' }}>
                          <Box sx={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            height: '100%',
                            width: `${(metrics.completedAssignments / metrics.totalAssignments) * 100}%`,
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            borderRadius: '10px 0 0 10px'
                          }} />
                          <Box sx={{
                            position: 'absolute',
                            left: `${(metrics.completedAssignments / metrics.totalAssignments) * 100}%`,
                            top: 0,
                            height: '100%',
                            width: `${(metrics.overdueSubmissions / metrics.totalAssignments) * 100}%`,
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                          }} />
                          <Box sx={{
                            position: 'absolute',
                            left: `${((metrics.completedAssignments + metrics.overdueSubmissions) / metrics.totalAssignments) * 100}%`,
                            top: 0,
                            height: '100%',
                            width: `${(metrics.notStartedAssignments / metrics.totalAssignments) * 100}%`,
                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            borderRadius: '0 10px 10px 0'
                          }} />
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                          <Typography variant="caption" sx={{ color: '#166534', fontWeight: 600 }}>
                            ✅ {metrics.completedAssignments} Completed
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#991b1b', fontWeight: 600 }}>
                            ⚠️ {metrics.overdueSubmissions} Overdue
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#92400e', fontWeight: 600 }}>
                            ⏳ {metrics.notStartedAssignments} Pending
                          </Typography>
                        </Box>
                      </Box>
                    </Stack>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card sx={{ 
                    p: { xs: 1.5, sm: 2, md: 2.5 }, 
                    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                    borderRadius: { xs: 2, sm: 4 },
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: { xs: 'none', sm: 'translateY(-2px)' },
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)'
                    }
                  }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" mb={{ xs: 1.5, sm: 2, md: 3 }}>
                      <Avatar sx={{ bgcolor: '#8b5cf6', width: { xs: 28, sm: 32 }, height: { xs: 28, sm: 32 } }}>
                        <EmojiEvents sx={{ color: 'white', fontSize: { xs: 14, sm: 16 } }} />
                      </Avatar>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', fontSize: { xs: '0.9rem', sm: '1rem', md: '1.25rem' } }}>
                        Team Rating System
                      </Typography>
                    </Stack>
                    <Stack spacing={3}>
                      {metrics && (() => {
                        const rating = getTeamRating(metrics);
                        return (
                          <>
                            <Box>
                              <Typography variant="body1" sx={{ mb: 2, fontWeight: 600, color: '#374151' }}>Current Team Grade</Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Box sx={{
                                  width: 80,
                                  height: 80,
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: `linear-gradient(135deg, ${rating.color} 0%, ${rating.color}dd 100%)`,
                                  color: 'white',
                                  fontWeight: 'bold',
                                  fontSize: '1.5rem',
                                  boxShadow: `0 4px 20px ${rating.color}40`
                                }}>
                                  {rating.grade}
                                </Box>
                                <Box>
                                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>
                                    {rating.description}
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                                    Score: {rating.score.toFixed(1)}/100
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>
                            
                            <Box>
                              <Typography variant="body1" sx={{ mb: 2, fontWeight: 600, color: '#374151' }}>Rating Breakdown</Typography>
                              <Stack spacing={2}>
                                <Box>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#374151' }}>Completion Rate (35%)</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>{metrics.completionRate.toFixed(1)}%</Typography>
                                  </Box>
                                  <LinearProgress
                                    variant="determinate"
                                    value={metrics.completionRate}
                                    sx={{ 
                                      height: 8, 
                                      borderRadius: 4,
                                      bgcolor: '#e5e7eb',
                                      '& .MuiLinearProgress-bar': {
                                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                        borderRadius: 4
                                      }
                                    }}
                                  />
                                </Box>
                                
                                <Box>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#374151' }}>On-Time Rate (25%)</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>{metrics.onTimeRate.toFixed(1)}%</Typography>
                                  </Box>
                                  <LinearProgress
                                    variant="determinate"
                                    value={metrics.onTimeRate}
                                    sx={{ 
                                      height: 8, 
                                      borderRadius: 4,
                                      bgcolor: '#e5e7eb',
                                      '& .MuiLinearProgress-bar': {
                                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                        borderRadius: 4
                                      }
                                    }}
                                  />
                                </Box>
                                
                                <Box>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#374151' }}>Late Rate (15%)</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>{((metrics.overdueSubmissions / metrics.totalAssignments) * 100).toFixed(1)}%</Typography>
                                  </Box>
                                  <LinearProgress
                                    variant="determinate"
                                    value={(metrics.overdueSubmissions / metrics.totalAssignments) * 100}
                                    sx={{ 
                                      height: 8, 
                                      borderRadius: 4,
                                      bgcolor: '#e5e7eb',
                                      '& .MuiLinearProgress-bar': {
                                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                        borderRadius: 4
                                      }
                                    }}
                                  />
                                </Box>
                                
                                <Box>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#374151' }}>Volume Bonus (10%)</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>{metrics.totalAssignments} assignments</Typography>
                                  </Box>
                                  <LinearProgress
                                    variant="determinate"
                                    value={Math.min(100, (metrics.totalAssignments / 100) * 100)}
                                    sx={{ 
                                      height: 8, 
                                      borderRadius: 4,
                                      bgcolor: '#e5e7eb',
                                      '& .MuiLinearProgress-bar': {
                                        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                                        borderRadius: 4
                                      }
                                    }}
                                  />
                                </Box>
                                
                                <Box>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#374151' }}>Improvement Bonus (10%)</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                                      {rating.breakdown.improvementBonus > 0 ? `+${rating.breakdown.improvementBonus}` : '0'}
                                    </Typography>
                                  </Box>
                                  <LinearProgress
                                    variant="determinate"
                                    value={rating.breakdown.improvementBonus * 10}
                                    sx={{ 
                                      height: 8, 
                                      borderRadius: 4,
                                      bgcolor: '#e5e7eb',
                                      '& .MuiLinearProgress-bar': {
                                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                        borderRadius: 4
                                      }
                                    }}
                                  />
                                </Box>
                                
                                <Box>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#374151' }}>Grace Period (5%)</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                                      {rating.breakdown.gracePeriodBonus > 0 ? `+${rating.breakdown.gracePeriodBonus}` : '0'}
                                    </Typography>
                                  </Box>
                                  <LinearProgress
                                    variant="determinate"
                                    value={rating.breakdown.gracePeriodBonus * 20}
                                    sx={{ 
                                      height: 8, 
                                      borderRadius: 4,
                                      bgcolor: '#e5e7eb',
                                      '& .MuiLinearProgress-bar': {
                                        background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                                        borderRadius: 4
                                      }
                                    }}
                                  />
                                </Box>
                              </Stack>
                            </Box>
                            
                            <Box>
                              <Typography variant="body1" sx={{ mb: 2, fontWeight: 600, color: '#374151' }}>Grade Scale</Typography>
                              <Stack spacing={1}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: '#10b981' }} />
                                  <Typography variant="body2" sx={{ color: '#374151' }}>A+ to A- (90-100): Outstanding to Very Good</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: '#3b82f6' }} />
                                  <Typography variant="body2" sx={{ color: '#374151' }}>B+ to B- (70-89): Good to Average</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: '#f59e0b' }} />
                                  <Typography variant="body2" sx={{ color: '#374151' }}>C+ to C- (55-69): Below Average to Poor</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: '#ef4444' }} />
                                  <Typography variant="body2" sx={{ color: '#374151' }}>D to F (0-54): Very Poor to Critical</Typography>
                                </Box>
                              </Stack>
                            </Box>
                            
                            <Box sx={{ mt: 3, p: 2, bgcolor: '#f0f9ff', borderRadius: 2, border: '1px solid #bae6fd' }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#0369a1', mb: 1 }}>
                                ✅ Fair Calculation: Pending Assignments
                              </Typography>
                              <Typography variant="body2" sx={{ color: '#0369a1', fontSize: '0.875rem' }}>
                                Team Rating only counts assignments that have been <strong>decided</strong> (completed, overdue, cancelled). 
                                Pending assignments within their due time are <strong>excluded</strong> to give workers the full 24 hours 
                                to complete their tasks. This ensures fair evaluation.
                              </Typography>
                            </Box>
                            
                            <Box sx={{ mt: 2, p: 2, bgcolor: '#fef2f2', borderRadius: 2, border: '1px solid #fecaca' }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#991b1b', mb: 1 }}>
                                ⚠️ Important: Overdue Assignments
                              </Typography>
                              <Typography variant="body2" sx={{ color: '#991b1b', fontSize: '0.875rem' }}>
                                Overdue assignments are <strong>permanent records</strong> and cannot be completed after the deadline. 
                                This ensures accurate performance tracking and prevents "catch-up" submissions that would 
                                distort the true team performance record.
                              </Typography>
                            </Box>
                          </>
                        );
                      })()}
                    </Stack>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card sx={{ 
                    p: { xs: 1.5, sm: 2, md: 2.5 }, 
                    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                    borderRadius: { xs: 2, sm: 4 },
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: { xs: 'none', sm: 'translateY(-2px)' },
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)'
                    }
                  }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" mb={{ xs: 1.5, sm: 2, md: 3 }}>
                      <Avatar sx={{ bgcolor: '#8b5cf6', width: { xs: 28, sm: 32 }, height: { xs: 28, sm: 32 } }}>
                        <HealthAndSafety sx={{ color: 'white', fontSize: { xs: 14, sm: 16 } }} />
                      </Avatar>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', fontSize: { xs: '0.9rem', sm: '1rem', md: '1.25rem' } }}>
                        Team Health & Safety
                      </Typography>
                    </Stack>
                    <Stack spacing={3}>
                      <Box>
                        <Typography variant="body1" sx={{ mb: 2, fontWeight: 600, color: '#374151' }}>Team Health Score</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <LinearProgress
                            variant="determinate"
                            value={metrics.teamHealthScore}
                            sx={{ 
                              flexGrow: 1, 
                              height: 16, 
                              borderRadius: 8,
                              bgcolor: '#e5e7eb',
                              '& .MuiLinearProgress-bar': {
                                background: metrics.teamHealthScore >= 85 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 
                                           metrics.teamHealthScore >= 70 ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 
                                           'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                borderRadius: 8
                              }
                            }}
                          />
                          <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', minWidth: 60 }}>
                            {metrics.teamHealthScore.toFixed(1)}%
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Box>
                        <Typography variant="body1" sx={{ mb: 2, fontWeight: 600, color: '#374151' }}>High-Risk Reports</Typography>
                        <Chip
                          icon={<Warning />}
                          label={`${metrics.highRiskReports} reports`}
                          sx={{
                            bgcolor: metrics.highRiskReports <= 5 ? '#dcfce7' : metrics.highRiskReports <= 10 ? '#fef3c7' : '#fecaca',
                            color: metrics.highRiskReports <= 5 ? '#166534' : metrics.highRiskReports <= 10 ? '#92400e' : '#991b1b',
                            fontWeight: 600,
                            px: 2,
                            py: 1,
                            fontSize: '0.875rem',
                            border: '1px solid',
                            borderColor: metrics.highRiskReports <= 5 ? '#bbf7d0' : metrics.highRiskReports <= 10 ? '#fde68a' : '#fca5a5'
                          }}
                        />
                      </Box>
                      
                      <Box>
                        <Typography variant="body1" sx={{ mb: 2, fontWeight: 600, color: '#374151' }}>Case Closures</Typography>
                        <Chip
                          icon={<CheckCircle />}
                          label={`${metrics.caseClosures} closed cases`}
                          sx={{
                            bgcolor: '#dbeafe',
                            color: '#1e40af',
                            fontWeight: 600,
                            px: 2,
                            py: 1,
                            fontSize: '0.875rem',
                            border: '1px solid #93c5fd'
                          }}
                        />
                      </Box>
                    </Stack>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}
        </CardContent>
      </Card>
    </Fade>
    </Box>
  );
};

export default MonthlyAssignmentTracking;
