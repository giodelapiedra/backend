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
// Removed teamRatingCalculator import - now using backend KPI system
import { calculateMonthlyMetrics, AssignmentData } from '../utils/metricsCalculator';
import { ExcelExportService } from '../services/excelExportService';
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
  Assignment,
  Group
} from '@mui/icons-material';
import { BackendAssignmentAPI } from '../utils/backendAssignmentApi';

interface MonthlyTrackingProps {
  teamLeaderId: string;
  team: string;
}

interface MonthlyMetrics {
  // Base metrics
  totalAssignments: number;
  completedAssignments: number;
  onTimeSubmissions: number;
  lateSubmissions?: number;  // Late submissions (completed after due time)
  overdueSubmissions: number;
  notStartedAssignments: number;
  averageResponseTime: number;
  teamHealthScore: number;
  highRiskReports: number;
  caseClosures: number;
  completionRate: number;
  onTimeRate: number;
  
  // Shift-based metrics
  activeWorkers: number;
  shiftsCompleted: number;
  totalShifts: number;
  qualityScore: number;
  improvementRate: number;
  highRiskCount: number;
  totalMembers: number;
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
  
  // Helper functions for KPI calculations
  const calculateTeamHealth = (assignments: any[]) => {
    if (!assignments.length) return 0;
    const healthyAssignments = assignments.filter(a => !a.is_overdue && a.status !== 'not_started').length;
    const onTimeRate = assignments.filter(a => a.status === 'completed' && !a.is_overdue).length / assignments.length;
    const riskRate = 1 - (assignments.filter(a => a.risk_level === 'high').length / assignments.length);
    
    return Math.round(
      (healthyAssignments / assignments.length * 0.4 + // Current health: 40%
      onTimeRate * 0.3 +                              // On-time performance: 30%
      riskRate * 0.3) * 100                          // Risk management: 30%
    );
  };

  const calculateQualityScore = (assignments: any[]) => {
    if (!assignments.length) return 0;
    const completionQuality = assignments.filter(a => a.status === 'completed').length / assignments.length;
    const timelinessQuality = assignments.filter(a => !a.is_overdue).length / assignments.length;
    const riskQuality = 1 - (assignments.filter(a => a.risk_level === 'high').length / assignments.length);
    
    return Math.round(
      (completionQuality * 0.4 +    // Completion quality: 40%
      timelinessQuality * 0.4 +     // Timeliness quality: 40%
      riskQuality * 0.2) * 100      // Risk management: 20%
    );
  };

  const getPreviousMonthMetrics = () => {
    // Get previous month's metrics from state
    const prevMonth = new Date(parseInt(selectedYear), parseInt(selectedMonth.split('-')[1]) - 2, 1);
    return metrics;
  };
  
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
      
      // ✅ DATA INTEGRITY CHECK: Validate assignment data
      const validAssignments = assignmentsResponse.assignments?.filter((a: any) => {
        const hasRequiredFields = a.assigned_date && a.due_time && a.status;
        if (!hasRequiredFields) {
          console.warn('⚠️ Invalid assignment missing required fields:', a.id);
        }
        return hasRequiredFields;
      }) || [];
      
      console.log(`✅ Data Validation: ${validAssignments.length}/${assignmentsResponse.assignments?.length || 0} valid assignments`);
      
      // Store current month assignments for system start date calculation
      setCurrentMonthAssignments(validAssignments);
      
      // Filter data for selected month using VALIDATED assignments
      const monthAssignments = validAssignments.filter((assignment: any) => {
        const assignmentDate = new Date(assignment.assigned_date);
        // Normalize dates to avoid timezone issues
        const assignmentDateOnly = new Date(assignmentDate.getFullYear(), assignmentDate.getMonth(), assignmentDate.getDate());
        const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
        
        console.log('Assignment Date:', assignmentDateOnly, 'vs Range:', startDateOnly, 'to', endDateOnly);
        return assignmentDateOnly >= startDateOnly && assignmentDateOnly <= endDateOnly;
      });
      
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
    console.log('📊 ===== CALCULATING MONTHLY METRICS =====');
    console.log(`📋 Total Assignments: ${assignments.length}`);
    
    // Base calculations
    const total = assignments.length;
    const completed = assignments.filter(a => a.status === 'completed').length;
    const onTime = assignments.filter(a => a.status === 'completed' && !a.is_overdue).length;
    const overdue = assignments.filter(a => a.status === 'completed' && a.is_overdue).length;
    const notStarted = assignments.filter(a => a.status === 'not_started').length;

    // Shift-based calculations
    const shiftsUsed = assignments.filter(a => a.due_time).length;
    console.log(`✅ Assignments with shift-based deadlines: ${shiftsUsed}/${assignments.length}`);
    
    // Calculate unique workers and shifts
    const uniqueWorkers = new Set(assignments.map(a => a.worker_id)).size;
    const shifts = assignments.reduce((acc, curr) => {
      if (curr.due_time) {
        const shiftDate = new Date(curr.due_time).toISOString().split('T')[0];
        acc[shiftDate] = (acc[shiftDate] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const totalShifts = Object.keys(shifts).length;
    const completedShifts = Object.entries(shifts)
      .filter(([date, _]) => {
        const shiftAssignments = assignments.filter(a => 
          a.due_time && new Date(a.due_time).toISOString().split('T')[0] === date
        );
        const shiftCompleted = shiftAssignments.filter(a => a.status === 'completed').length;
        return shiftCompleted === shiftAssignments.length;
      }).length;

    // Quality calculations
    const qualityScore = calculateQualityScore(assignments);
    const teamHealth = calculateTeamHealth(assignments);
    const highRiskCount = assignments.filter(a => a.risk_level === 'high').length;

    // Improvement rate calculation
    const prevMonthMetrics = getPreviousMonthMetrics();
    const improvementRate = prevMonthMetrics ? 
      ((completed / total) - prevMonthMetrics.completionRate) * 100 : 0;
    
    // Calculate days from first assignment to end of month
    const month = parseInt(selectedMonth.split('-')[1]) - 1;
    const year = parseInt(selectedYear);
    const endOfMonth = new Date(year, month + 1, 0);
    
    // Find the first assignment date
    const assignmentDates = assignments.map(a => new Date(a.assigned_date)).sort((a, b) => a.getTime() - b.getTime());
    const firstAssignmentDate = assignmentDates.length > 0 ? assignmentDates[0] : null;
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
    // FIXED: Use actual shift-based deadline from database, not hardcoded 24 hours
    const onTimeSubmissions = assignments.filter(a => {
      if (a.status !== 'completed' || !a.completed_at || !a.due_time) return false;
      const completedDate = new Date(a.completed_at);
      const dueTime = new Date(a.due_time); // Shift-based deadline from DB
      return completedDate <= dueTime; // Compare against actual deadline
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
    
    // Calculate basic performance score based on completion rate and on-time rate
    const basicPerformanceScore = Math.round((completionRate * 0.6) + (onTimeRate * 0.4));
    
    // Get unique team members from assignments
    const teamMembers = new Set(assignments.map(a => a.worker?.id).filter(Boolean));
    const totalMembers = teamMembers.size;
    
    // Additional metrics for better insights
    const lateRate = totalAssignments > 0 ? (overdueSubmissions / totalAssignments) * 100 : 0;
    const pendingRate = totalAssignments > 0 ? (notStartedAssignments / totalAssignments) * 100 : 0;
    const efficiencyRate = completedAssignments > 0 ? (onTimeSubmissions / completedAssignments) * 100 : 0;
    
    console.log('📊 ===== SHIFT-BASED METRICS CALCULATION =====');
    console.log(`   Total Assignments: ${totalAssignments}`);
    console.log(`   Completed: ${completedAssignments} (${completionRate.toFixed(1)}%)`);
    console.log(`   ✅ On-Time (shift-based): ${onTimeSubmissions} (${onTimeRate.toFixed(1)}%)`);
    console.log(`   ⚠️ Overdue: ${overdueSubmissions} (${lateRate.toFixed(1)}%)`);
    console.log(`   ⏳ Pending: ${notStartedAssignments} (${pendingRate.toFixed(1)}%)`);
    console.log(`   🎯 Efficiency: ${efficiencyRate.toFixed(1)}% (on-time/completed)`);
    console.log(`   ⏰ Avg Response Time: ${averageResponseTime.toFixed(1)} hours`);
    console.log('==========================================');
    
    // Month-over-month changes: real-time neutral (0) until previous-period data is available
    // When previous-month data exists, compute deltas against prior period
    return {
      // Base metrics
      totalAssignments,
      completedAssignments,
      onTimeSubmissions,
      overdueSubmissions,
      notStartedAssignments,
      averageResponseTime: Math.round(averageResponseTime * 10) / 10,
      teamHealthScore: Math.round(teamHealthScore * 10) / 10,
      highRiskReports,
      caseClosures,
      completionRate: Math.round(completionRate * 10) / 10,
      onTimeRate: Math.round(onTimeRate * 10) / 10,
      
      // Shift-based metrics
      activeWorkers: uniqueWorkers,
      shiftsCompleted: completedShifts,
      totalShifts,
      qualityScore: Math.round(basicPerformanceScore * 10) / 10,
      improvementRate: Math.round(improvementRate * 10) / 10,
      highRiskCount: assignments.filter(a => a.risk_level === 'high').length,
      totalMembers,
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
      // FIXED: Use shift-based deadline from database
      const onTime = weekAssignments.filter(a => {
        if (a.status !== 'completed' || !a.completed_at || !a.due_time) return false;
        const completedDate = new Date(a.completed_at);
        const dueTime = new Date(a.due_time);
        return completedDate <= dueTime;
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
        
        // FIXED: Check if on time using shift-based deadline
        if (assignment.completed_at && assignment.due_time) {
          const completedDate = new Date(assignment.completed_at);
          const dueTime = new Date(assignment.due_time);
          if (completedDate <= dueTime) {
            worker.onTime++;
          }
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
    if (!metrics) return;
    
    ExcelExportService.generateMonthlyReport(
      metrics,
      weeklyBreakdown,
      workerPerformance,
      selectedMonth,
      team
    );
  };


  const getTrendIcon = (change: number | null | undefined) => {
    if (change == null || change === 0) return null;
    if (change > 0) return <TrendingUp sx={{ color: '#10b981', fontSize: 20 }} />;
    if (change < 0) return <TrendingDown sx={{ color: '#ef4444', fontSize: 20 }} />;
    return null;
  };

  const getTeamRating = (metrics: MonthlyMetrics) => {
    // BACKEND-ALIGNED KPI calculation
    const completionRate = metrics.completionRate;
    const onTimeRate = metrics.onTimeRate;
    const qualityScore = metrics.qualityScore || 70;
    
    // Calculate late rate (completed assignments / total assignments)
    const lateSubmissions = metrics.lateSubmissions || 0;
    const lateRate = metrics.totalAssignments > 0 
      ? (lateSubmissions / metrics.totalAssignments) * 100 
      : 0;
    
    // Backend-aligned base score calculation
    // Formula: (completion * 0.5) + (onTime * 0.25) + (late * 0.15) + (quality * 0.1)
    const baseScore = (completionRate * 0.5) +      // 50% weight for completion
                     (onTimeRate * 0.25) +          // 25% weight for on-time
                     (lateRate * 0.15) +            // 15% weight for late submissions
                     (qualityScore * 0.1);          // 10% weight for quality
    
    // Pending bonus: up to 5% for pending assignments with future due dates
    const pendingRate = metrics.totalAssignments > 0 
      ? ((metrics.totalAssignments - metrics.completedAssignments - metrics.overdueSubmissions) / metrics.totalAssignments) 
      : 0;
    const pendingBonus = Math.min(5, pendingRate * 5);
    
    // Overdue penalty: up to 10% for overdue assignments
    const overduePenalty = Math.min(10, (metrics.overdueSubmissions / metrics.totalAssignments) * 10);
    
    // Recovery bonus: up to 3% for recent completions (simplified in frontend)
    const recoveryBonus = metrics.improvementRate > 0 ? Math.min(3, metrics.improvementRate * 0.03) : 0;
    
    // Calculate final weighted score aligned with backend
    const weightedScore = Math.max(0, Math.min(100,
      baseScore +           // Base score from weighted formula
      pendingBonus -        // Pending bonus (up to 5%)
      overduePenalty +      // Overdue penalty (up to -10%)
      recoveryBonus         // Recovery bonus (up to 3%)
    ));
    
    // Convert to letter grade using backend KPI scale
    let letterGrade = '';
    let color = '';
    let description = '';
    
    if (weightedScore >= 95) { letterGrade = 'A+'; color = '#10b981'; description = 'Outstanding Performance'; }
    else if (weightedScore >= 90) { letterGrade = 'A'; color = '#10b981'; description = 'Excellent Performance'; }
    else if (weightedScore >= 85) { letterGrade = 'A-'; color = '#10b981'; description = 'Very Good Performance'; }
    else if (weightedScore >= 80) { letterGrade = 'B+'; color = '#3b82f6'; description = 'Good Performance'; }
    else if (weightedScore >= 75) { letterGrade = 'B'; color = '#3b82f6'; description = 'Above Average Performance'; }
    else if (weightedScore >= 70) { letterGrade = 'B-'; color = '#3b82f6'; description = 'Average Performance'; }
    else if (weightedScore >= 65) { letterGrade = 'C+'; color = '#eab308'; description = 'Below Average Performance'; }
    else if (weightedScore >= 60) { letterGrade = 'C'; color = '#eab308'; description = 'Needs Improvement'; }
    else if (weightedScore >= 55) { letterGrade = 'C-'; color = '#f97316'; description = 'Poor Performance'; }
    else if (weightedScore >= 50) { letterGrade = 'D'; color = '#f97316'; description = 'Very Poor Performance'; }
    else { letterGrade = 'F'; color = '#ef4444'; description = 'Critical Performance Issues'; }
    
    return {
      grade: letterGrade,
      score: Math.max(0, Math.min(100, weightedScore)),
      color,
      description,
      breakdown: {
        completionScore: Math.min(50, (completionRate / 100) * 50),  // 50% weight
        onTimeScore: Math.min(25, (onTimeRate / 100) * 25),          // 25% weight
        lateScore: Math.min(15, (lateRate / 100) * 15),              // 15% weight
        qualityScore: Math.min(10, (qualityScore / 100) * 10),       // 10% weight
        pendingBonus: pendingBonus,                                   // up to 5%
        overduePenalty: overduePenalty,                               // up to -10%
        recoveryBonus: recoveryBonus,                                 // up to 3%
        fairCalculation: {
          decidedAssignments: metrics.totalAssignments - metrics.notStartedAssignments,
          fairCompletionRate: completionRate,
          fairOnTimeRate: onTimeRate,
          lateRate: lateRate,
          formula: `(${completionRate.toFixed(1)}% × 0.5) + (${onTimeRate.toFixed(1)}% × 0.25) + (${lateRate.toFixed(1)}% × 0.15) + (${qualityScore.toFixed(1)} × 0.1) + ${pendingBonus.toFixed(2)}% - ${overduePenalty.toFixed(2)}% + ${recoveryBonus.toFixed(2)}% = ${weightedScore.toFixed(2)}`
        }
      }
    };
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
      minHeight: '100vh',
      '@keyframes shimmer': {
        '0%': {
          transform: 'translateX(-100%)',
        },
        '100%': {
          transform: 'translateX(100%)',
        },
      },
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
          Export Excel Report
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
                Key performance indicators and team metrics
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
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                border: '1px solid #E2E8F0',
                borderRadius: 3,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
                  borderColor: '#CBD5E1'
                }
              }}>
                {/* Background gradient overlay */}
                <Box sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: `linear-gradient(90deg, ${getTeamRating(metrics).color}, ${getTeamRating(metrics).color}88)`,
                }} />
                
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 3,
                      background: `linear-gradient(135deg, ${getTeamRating(metrics).color}15, ${getTeamRating(metrics).color}25)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `2px solid ${getTeamRating(metrics).color}30`
                    }}>
                      <EmojiEvents sx={{ fontSize: 24, color: getTeamRating(metrics).color }} />
                    </Box>
                    <Box>
                    <Typography variant="caption" sx={{ 
                      color: '#64748B',
                      fontWeight: 600,
                        fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Team Rating
                    </Typography>
                      <Typography variant="body2" sx={{ 
                        color: '#64748B',
                        fontSize: '0.75rem',
                        mt: 0.5
                      }}>
                        Overall Performance
                      </Typography>
                    </Box>
                  </Stack>
                  
                  <Box>
                    <Typography variant="h2" sx={{ 
                      fontWeight: 700, 
                      color: getTeamRating(metrics).color,
                      fontSize: '2.5rem',
                      lineHeight: 1,
                      textShadow: `0 2px 4px ${getTeamRating(metrics).color}20`
                    }}>
                      {getTeamRating(metrics).grade}
                    </Typography>
                      <Typography variant="body2" sx={{ 
                        color: '#64748B',
                      fontSize: '0.875rem',
                      mt: 1,
                      fontWeight: 500
                    }}>
                      Score: {getTeamRating(metrics).score.toFixed(1)}/100
                    </Typography>
                    <Typography variant="caption" sx={{ 
                      color: getTeamRating(metrics).color,
                        fontSize: '0.75rem',
                      fontWeight: 600,
                      display: 'block',
                        mt: 0.5
                      }}>
                      {getTeamRating(metrics).description}
                      </Typography>
                  </Box>
                </Stack>
              </Card>
            </Grid>
              
            {/* Total Assignments */}
            <Grid item xs={12} sm={6} lg={3}>
              <Card sx={{ 
                p: 3,
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                border: '1px solid #E2E8F0',
                borderRadius: 3,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
                  borderColor: '#CBD5E1'
                }
              }}>
                {/* Background gradient overlay */}
                <Box sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: 'linear-gradient(90deg, #3B82F6, #2563EB)',
                }} />
                
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 3,
                      background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid #3B82F630'
                    }}>
                      <Assignment sx={{ fontSize: 24, color: '#3B82F6' }} />
                    </Box>
                    <Box>
                    <Typography variant="caption" sx={{ 
                      color: '#64748B',
                      fontWeight: 600,
                        fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Total Assignments
                    </Typography>
                      <Typography variant="body2" sx={{ 
                        color: '#64748B',
                        fontSize: '0.75rem',
                        mt: 0.5
                      }}>
                        This Month
                      </Typography>
                    </Box>
                  </Stack>
                  <Box>
                    <Typography variant="h2" sx={{ 
                    fontWeight: 700, 
                    color: '#0F172A',
                      fontSize: '2.5rem',
                    lineHeight: 1
                  }}>
                    {metrics.totalAssignments}
                  </Typography>
                    <Typography variant="body2" sx={{ 
                      color: '#64748B',
                      fontSize: '0.875rem',
                      mt: 1,
                      fontWeight: 500
                    }}>
                      {metrics.completedAssignments} completed
                    </Typography>
                    <Typography variant="caption" sx={{ 
                      color: '#3B82F6',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      display: 'block',
                      mt: 0.5
                    }}>
                      {metrics.notStartedAssignments} pending
                    </Typography>
                  </Box>
                </Stack>
              </Card>
            </Grid>
            
            {/* Completion Rate */}
            <Grid item xs={12} sm={6} lg={3}>
              <Card sx={{ 
                p: 3,
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                border: '1px solid #E2E8F0',
                borderRadius: 3,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
                  borderColor: '#CBD5E1'
                }
              }}>
                {/* Background gradient overlay */}
                <Box sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: 'linear-gradient(90deg, #10B981, #059669)',
                }} />
                
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 3,
                      background: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid #10B98130'
                    }}>
                      <CheckCircle sx={{ fontSize: 24, color: '#10B981' }} />
                    </Box>
                    <Box>
                    <Typography variant="caption" sx={{ 
                      color: '#64748B',
                      fontWeight: 600,
                        fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Completion Rate
                    </Typography>
                      <Typography variant="body2" sx={{ 
                        color: '#64748B',
                        fontSize: '0.75rem',
                        mt: 0.5
                      }}>
                        Success Rate
                      </Typography>
                    </Box>
                  </Stack>
                  <Box>
                    <Typography variant="h2" sx={{ 
                      fontWeight: 700, 
                      color: '#0F172A',
                      fontSize: '2.5rem',
                      lineHeight: 1
                    }}>
                      {metrics.completionRate.toFixed(1)}%
                    </Typography>
                    <Box sx={{ 
                      mt: 2,
                      height: 8,
                      background: '#F1F5F9',
                      borderRadius: 4,
                      overflow: 'hidden',
                      position: 'relative'
                    }}>
                      <Box sx={{
                        width: `${metrics.completionRate}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #10B981, #059669)',
                        borderRadius: 4,
                        transition: 'width 0.6s ease',
                        position: 'relative',
                        '&::after': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                          animation: 'shimmer 2s infinite'
                        }
                      }} />
                    </Box>
                    <Typography variant="caption" sx={{ 
                      color: '#10B981',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      display: 'block',
                      mt: 1
                    }}>
                      {metrics.completedAssignments} out of {metrics.totalAssignments} completed
                    </Typography>
                  </Box>
                </Stack>
              </Card>
            </Grid>
            
            {/* On-Time Rate */}
            <Grid item xs={12} sm={6} lg={3}>
              <Card sx={{ 
                p: 3,
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                border: '1px solid #E2E8F0',
                borderRadius: 3,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
                  borderColor: '#CBD5E1'
                }
              }}>
                {/* Background gradient overlay */}
                <Box sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: 'linear-gradient(90deg, #F59E0B, #D97706)',
                }} />
                
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 3,
                      background: 'linear-gradient(135deg, #FFFBEB, #FEF3C7)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid #F59E0B30'
                    }}>
                      <Schedule sx={{ fontSize: 24, color: '#F59E0B' }} />
                    </Box>
                    <Box>
                    <Typography variant="caption" sx={{ 
                      color: '#64748B',
                      fontWeight: 600,
                        fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      On-Time Rate
                    </Typography>
                      <Typography variant="body2" sx={{ 
                        color: '#64748B',
                        fontSize: '0.75rem',
                        mt: 0.5
                      }}>
                        Timeliness
                      </Typography>
                    </Box>
                  </Stack>
                  <Box>
                    <Typography variant="h2" sx={{ 
                      fontWeight: 700, 
                      color: '#0F172A',
                      fontSize: '2.5rem',
                      lineHeight: 1
                    }}>
                      {metrics.onTimeRate.toFixed(1)}%
                    </Typography>
                    <Box sx={{ 
                      mt: 2,
                      height: 8,
                      background: '#F1F5F9',
                      borderRadius: 4,
                      overflow: 'hidden',
                      position: 'relative'
                    }}>
                      <Box sx={{
                        width: `${metrics.onTimeRate}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #F59E0B, #D97706)',
                        borderRadius: 4,
                        transition: 'width 0.6s ease',
                        position: 'relative',
                        '&::after': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                          animation: 'shimmer 2s infinite'
                        }
                      }} />
                    </Box>
                    <Typography variant="caption" sx={{ 
                      color: '#F59E0B',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      display: 'block',
                      mt: 1
                    }}>
                      {metrics.onTimeSubmissions} on-time submissions
                    </Typography>
                  </Box>
                </Stack>
              </Card>
            </Grid>
            
            {/* Avg Response Time */}
            <Grid item xs={12} sm={6} lg={3}>
              <Card sx={{ 
                p: 3,
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                border: '1px solid #E2E8F0',
                borderRadius: 3,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
                  borderColor: '#CBD5E1'
                }
              }}>
                {/* Background gradient overlay */}
                <Box sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: 'linear-gradient(90deg, #6B7280, #4B5563)',
                }} />
                
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 3,
                      background: 'linear-gradient(135deg, #F3F4F6, #E5E7EB)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid #6B728030'
                    }}>
                      <Speed sx={{ fontSize: 24, color: '#6B7280' }} />
                    </Box>
                    <Box>
                    <Typography variant="caption" sx={{ 
                      color: '#64748B',
                      fontWeight: 600,
                        fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                        Avg Response Time
                    </Typography>
                      <Typography variant="body2" sx={{ 
                        color: '#64748B',
                        fontSize: '0.75rem',
                        mt: 0.5
                      }}>
                        Speed
                      </Typography>
                    </Box>
                  </Stack>
                  <Box>
                    <Typography variant="h2" sx={{ 
                      fontWeight: 700, 
                      color: '#0F172A',
                      fontSize: '2.5rem',
                      lineHeight: 1
                    }}>
                      {metrics.averageResponseTime.toFixed(1)}h
                    </Typography>
                    <Typography variant="body2" sx={{ 
                      color: '#64748B',
                      fontSize: '0.875rem',
                      mt: 1,
                      fontWeight: 500
                    }}>
                      {metrics.completedAssignments} completed
                    </Typography>
                    <Typography variant="caption" sx={{ 
                      color: '#6B7280',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      display: 'block',
                      mt: 0.5
                    }}>
                      {metrics.averageResponseTime < 24 ? 'Fast response' : 'Standard response'}
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
                    Comprehensive performance analysis and KPI breakdown
                  </Typography>
                </Box>
              </Stack>
              <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
                {/* Assignment Status Overview */}
                <Grid item xs={12} lg={6}>
                  <Card sx={{ 
                    p: { xs: 2, sm: 2.5, md: 3 }, 
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    borderRadius: 3,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    overflow: 'hidden',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
                      borderColor: '#CBD5E1'
                    }
                  }}>
                    {/* Top border indicator */}
                    <Box sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '4px',
                      background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                    }} />
                    
                    <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
                      <Box sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid #6366f130'
                      }}>
                        <Assignment sx={{ fontSize: 24, color: '#6366f1' }} />
                      </Box>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', fontSize: '1.25rem' }}>
                        Assignment Status
                      </Typography>
                        <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.875rem' }}>
                          Current month breakdown
                        </Typography>
                      </Box>
                    </Stack>
                    
                    <Stack spacing={3}>
                      {/* Completed Assignments */}
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <CheckCircle sx={{ color: '#10b981', fontSize: 20 }} />
                            <Typography variant="body1" sx={{ fontWeight: 600, color: '#374151' }}>Completed</Typography>
                          </Stack>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>{metrics.completedAssignments}</Typography>
                            <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 600 }}>
                              {metrics.completionRate.toFixed(1)}%
                            </Typography>
                          </Box>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={metrics.completionRate}
                          sx={{ 
                            height: 12, 
                            borderRadius: 6,
                            bgcolor: '#e5e7eb',
                            '& .MuiLinearProgress-bar': {
                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              borderRadius: 6
                            }
                          }}
                        />
                      </Box>
                      
                      {/* On-Time Submissions */}
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Schedule sx={{ color: '#3b82f6', fontSize: 20 }} />
                            <Typography variant="body1" sx={{ fontWeight: 600, color: '#374151' }}>On-Time</Typography>
                          </Stack>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>{metrics.onTimeSubmissions}</Typography>
                            <Typography variant="caption" sx={{ color: '#3b82f6', fontWeight: 600 }}>
                              {metrics.onTimeRate.toFixed(1)}%
                            </Typography>
                          </Box>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={metrics.onTimeRate}
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
                      
                      {/* Overdue Submissions */}
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Warning sx={{ color: '#ef4444', fontSize: 20 }} />
                            <Typography variant="body1" sx={{ fontWeight: 600, color: '#374151' }}>Overdue</Typography>
                          </Stack>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>{metrics.overdueSubmissions}</Typography>
                            <Typography variant="caption" sx={{ color: '#ef4444', fontWeight: 600 }}>
                              {((metrics.overdueSubmissions / metrics.totalAssignments) * 100).toFixed(1)}%
                            </Typography>
                          </Box>
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
                      
                      {/* Pending Assignments */}
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Error sx={{ color: '#f59e0b', fontSize: 20 }} />
                            <Typography variant="body1" sx={{ fontWeight: 600, color: '#374151' }}>Pending</Typography>
                          </Stack>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>{metrics.notStartedAssignments}</Typography>
                            <Typography variant="caption" sx={{ color: '#f59e0b', fontWeight: 600 }}>
                              {((metrics.notStartedAssignments / metrics.totalAssignments) * 100).toFixed(1)}%
                            </Typography>
                          </Box>
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
                      
                      {/* Overall Status Visualization */}
                      <Box sx={{ mt: 3, p: 3, bgcolor: '#f8fafc', borderRadius: 3, border: '1px solid #e2e8f0' }}>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#374151' }}>Overall Status Distribution</Typography>
                        <Box sx={{ position: 'relative', height: 24, borderRadius: 12, bgcolor: '#e5e7eb', overflow: 'hidden' }}>
                          <Box sx={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            height: '100%',
                            width: `${(metrics.completedAssignments / metrics.totalAssignments) * 100}%`,
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            borderRadius: '12px 0 0 12px'
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
                            borderRadius: '0 12px 12px 0'
                          }} />
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="caption" sx={{ color: '#166534', fontWeight: 600, display: 'block' }}>
                              ✅ Completed
                          </Typography>
                            <Typography variant="body2" sx={{ color: '#166534', fontWeight: 700 }}>
                              {metrics.completedAssignments}
                          </Typography>
                          </Box>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="caption" sx={{ color: '#991b1b', fontWeight: 600, display: 'block' }}>
                              ⚠️ Overdue
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#991b1b', fontWeight: 700 }}>
                              {metrics.overdueSubmissions}
                          </Typography>
                          </Box>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="caption" sx={{ color: '#92400e', fontWeight: 600, display: 'block' }}>
                              ⏳ Pending
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#92400e', fontWeight: 700 }}>
                              {metrics.notStartedAssignments}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Stack>
                  </Card>
                </Grid>
                
                {/* Team Rating System */}
                <Grid item xs={12} lg={6}>
                  <Card sx={{ 
                    p: { xs: 2, sm: 2.5, md: 3 }, 
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    borderRadius: 3,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    overflow: 'hidden',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
                      borderColor: '#CBD5E1'
                    }
                  }}>
                    {/* Top border indicator */}
                    <Box sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '4px',
                      background: 'linear-gradient(90deg, #8b5cf6, #7c3aed)',
                    }} />
                    
                    <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
                      <Box sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, #F3E8FF, #E9D5FF)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid #8b5cf630'
                      }}>
                        <EmojiEvents sx={{ fontSize: 24, color: '#8b5cf6' }} />
                      </Box>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', fontSize: '1.25rem' }}>
                        Team Rating System
                      </Typography>
                        <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.875rem' }}>
                          KPI breakdown and scoring
                        </Typography>
                      </Box>
                    </Stack>
                    
                    <Stack spacing={3}>
                      {metrics && (() => {
                        const rating = getTeamRating(metrics);
                        return (
                          <>
                            {/* Current Team Grade */}
                            <Box>
                              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#374151' }}>Current Team Grade</Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <Box sx={{
                                  width: 100,
                                  height: 100,
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: `linear-gradient(135deg, ${rating.color} 0%, ${rating.color}dd 100%)`,
                                  color: 'white',
                                  fontWeight: 'bold',
                                  fontSize: '2rem',
                                  boxShadow: `0 8px 32px ${rating.color}40`,
                                  border: `4px solid ${rating.color}20`
                                }}>
                                  {rating.grade}
                                </Box>
                                <Box>
                                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
                                    {rating.description}
                                  </Typography>
                                  <Typography variant="h6" sx={{ color: '#64748b', mb: 2 }}>
                                    Score: {rating.score.toFixed(1)}/100
                                  </Typography>
                                  <Chip
                                    label={`${rating.score.toFixed(1)}/100`}
                                    sx={{
                                      bgcolor: rating.color,
                                      color: 'white',
                                      fontWeight: 600,
                                      fontSize: '0.875rem',
                                      px: 2,
                                      py: 1
                                    }}
                                  />
                                </Box>
                              </Box>
                            </Box>
                            
                            {/* KPI Breakdown */}
                            <Box>
                              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#374151' }}>KPI Breakdown</Typography>
                              <Stack spacing={2.5}>
                                {/* Completion Rate */}
                                <Box>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                      <CheckCircle sx={{ color: '#10b981', fontSize: 18 }} />
                                      <Typography variant="body1" sx={{ fontWeight: 600, color: '#374151' }}>Completion Rate</Typography>
                                    </Stack>
                                    <Box sx={{ textAlign: 'right' }}>
                                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>{metrics.completionRate.toFixed(1)}%</Typography>
                                      <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 600 }}>
                                        35% weight
                                      </Typography>
                                    </Box>
                                  </Box>
                                  <LinearProgress
                                    variant="determinate"
                                    value={metrics.completionRate}
                                    sx={{ 
                                      height: 10, 
                                      borderRadius: 5,
                                      bgcolor: '#e5e7eb',
                                      '& .MuiLinearProgress-bar': {
                                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                        borderRadius: 5
                                      }
                                    }}
                                  />
                                </Box>
                                
                                {/* On-Time Rate */}
                                <Box>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                      <Schedule sx={{ color: '#3b82f6', fontSize: 18 }} />
                                      <Typography variant="body1" sx={{ fontWeight: 600, color: '#374151' }}>On-Time Rate</Typography>
                                    </Stack>
                                    <Box sx={{ textAlign: 'right' }}>
                                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>{metrics.onTimeRate.toFixed(1)}%</Typography>
                                      <Typography variant="caption" sx={{ color: '#3b82f6', fontWeight: 600 }}>
                                        25% weight
                                      </Typography>
                                    </Box>
                                  </Box>
                                  <LinearProgress
                                    variant="determinate"
                                    value={metrics.onTimeRate}
                                    sx={{ 
                                      height: 10, 
                                      borderRadius: 5,
                                      bgcolor: '#e5e7eb',
                                      '& .MuiLinearProgress-bar': {
                                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                        borderRadius: 5
                                      }
                                    }}
                                  />
                                </Box>
                                
                                {/* Late Rate */}
                                <Box>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                      <Warning sx={{ color: '#ef4444', fontSize: 18 }} />
                                      <Typography variant="body1" sx={{ fontWeight: 600, color: '#374151' }}>Late Rate</Typography>
                                    </Stack>
                                    <Box sx={{ textAlign: 'right' }}>
                                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>
                                        {((metrics.overdueSubmissions / metrics.totalAssignments) * 100).toFixed(1)}%
                                      </Typography>
                                      <Typography variant="caption" sx={{ color: '#ef4444', fontWeight: 600 }}>
                                        15% weight
                                      </Typography>
                                    </Box>
                                  </Box>
                                  <LinearProgress
                                    variant="determinate"
                                    value={(metrics.overdueSubmissions / metrics.totalAssignments) * 100}
                                    sx={{ 
                                      height: 10, 
                                      borderRadius: 5,
                                      bgcolor: '#e5e7eb',
                                      '& .MuiLinearProgress-bar': {
                                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                        borderRadius: 5
                                      }
                                    }}
                                  />
                                </Box>
                                
                                {/* Volume Bonus */}
                                <Box>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                      <Assignment sx={{ color: '#8b5cf6', fontSize: 18 }} />
                                      <Typography variant="body1" sx={{ fontWeight: 600, color: '#374151' }}>Volume Bonus</Typography>
                                    </Stack>
                                    <Box sx={{ textAlign: 'right' }}>
                                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>
                                        {metrics.totalAssignments} assignments
                                      </Typography>
                                      <Typography variant="caption" sx={{ color: '#8b5cf6', fontWeight: 600 }}>
                                        10% bonus
                                      </Typography>
                                    </Box>
                                  </Box>
                                  <LinearProgress
                                    variant="determinate"
                                    value={Math.min(100, (metrics.totalAssignments / 100) * 100)}
                                    sx={{ 
                                      height: 10, 
                                      borderRadius: 5,
                                      bgcolor: '#e5e7eb',
                                      '& .MuiLinearProgress-bar': {
                                        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                                        borderRadius: 5
                                      }
                                    }}
                                  />
                                </Box>
                              </Stack>
                                </Box>
                                
                            {/* Grade Scale */}
                                <Box>
                              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#374151' }}>Grade Scale</Typography>
                              <Stack spacing={1.5}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0' }}>
                                  <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Typography variant="caption" sx={{ color: 'white', fontWeight: 700 }}>A</Typography>
                                  </Box>
                                  <Typography variant="body2" sx={{ color: '#166534', fontWeight: 600 }}>A+ to A- (90-100): Outstanding to Very Good</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, bgcolor: '#eff6ff', borderRadius: 2, border: '1px solid #93c5fd' }}>
                                  <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Typography variant="caption" sx={{ color: 'white', fontWeight: 700 }}>B</Typography>
                            </Box>
                                  <Typography variant="body2" sx={{ color: '#1e40af', fontWeight: 600 }}>B+ to B- (70-89): Good to Average</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, bgcolor: '#fffbeb', borderRadius: 2, border: '1px solid #fde68a' }}>
                                  <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Typography variant="caption" sx={{ color: 'white', fontWeight: 700 }}>C</Typography>
                                </Box>
                                  <Typography variant="body2" sx={{ color: '#92400e', fontWeight: 600 }}>C+ to C- (55-69): Below Average to Poor</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, bgcolor: '#fef2f2', borderRadius: 2, border: '1px solid #fca5a5' }}>
                                  <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Typography variant="caption" sx={{ color: 'white', fontWeight: 700 }}>D</Typography>
                                  </Box>
                                  <Typography variant="body2" sx={{ color: '#991b1b', fontWeight: 600 }}>D to F (0-54): Very Poor to Critical</Typography>
                                </Box>
                              </Stack>
                            </Box>
                            
                            {/* Important Notes */}
                            <Box sx={{ mt: 3, p: 3, bgcolor: '#f0f9ff', borderRadius: 3, border: '1px solid #bae6fd' }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#0369a1', mb: 2, fontSize: '0.875rem' }}>
                                💡 How Team Rating Works
                              </Typography>
                              <Stack spacing={1.5}>
                              <Typography variant="body2" sx={{ color: '#0369a1', fontSize: '0.875rem' }}>
                                  • <strong>Completion Rate (35%)</strong>: Percentage of assignments completed
                              </Typography>
                                <Typography variant="body2" sx={{ color: '#0369a1', fontSize: '0.875rem' }}>
                                  • <strong>On-Time Rate (25%)</strong>: Percentage completed before deadline
                              </Typography>
                                <Typography variant="body2" sx={{ color: '#0369a1', fontSize: '0.875rem' }}>
                                  • <strong>Late Rate (15%)</strong>: Penalty for overdue assignments
                              </Typography>
                                <Typography variant="body2" sx={{ color: '#0369a1', fontSize: '0.875rem' }}>
                                  • <strong>Volume Bonus (10%)</strong>: Bonus for high assignment volume
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#0369a1', fontSize: '0.875rem' }}>
                                  • <strong>Pending assignments</strong> are excluded from rating calculation
                                </Typography>
                              </Stack>
                            </Box>
                          </>
                        );
                      })()}
                    </Stack>
                  </Card>
                </Grid>
                
                {/* Team Health & Safety */}
                <Grid item xs={12} lg={6}>
                  <Card sx={{ 
                    p: { xs: 2, sm: 2.5, md: 3 }, 
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    borderRadius: 3,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    overflow: 'hidden',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
                      borderColor: '#CBD5E1'
                    }
                  }}>
                    {/* Top border indicator */}
                    <Box sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '4px',
                      background: 'linear-gradient(90deg, #10b981, #059669)',
                    }} />
                    
                    <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
                      <Box sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid #10b98130'
                      }}>
                        <HealthAndSafety sx={{ fontSize: 24, color: '#10b981' }} />
                      </Box>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', fontSize: '1.25rem' }}>
                        Team Health & Safety
                      </Typography>
                        <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.875rem' }}>
                          Worker wellness metrics
                        </Typography>
                      </Box>
                    </Stack>
                    
                    <Stack spacing={3}>
                      {/* Team Health Score */}
                      <Box>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#374151' }}>Team Health Score</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Box sx={{
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: metrics.teamHealthScore >= 85 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 
                                       metrics.teamHealthScore >= 70 ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 
                                       'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '1.5rem',
                            boxShadow: `0 8px 32px ${metrics.teamHealthScore >= 85 ? '#10b981' : metrics.teamHealthScore >= 70 ? '#f59e0b' : '#ef4444'}40`,
                            border: `4px solid ${metrics.teamHealthScore >= 85 ? '#10b981' : metrics.teamHealthScore >= 70 ? '#f59e0b' : '#ef4444'}20`
                          }}>
                            {metrics.teamHealthScore.toFixed(0)}%
                          </Box>
                          <Box sx={{ flexGrow: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={metrics.teamHealthScore}
                            sx={{ 
                              height: 16, 
                              borderRadius: 8,
                              bgcolor: '#e5e7eb',
                                mb: 1,
                              '& .MuiLinearProgress-bar': {
                                background: metrics.teamHealthScore >= 85 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 
                                           metrics.teamHealthScore >= 70 ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 
                                           'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                borderRadius: 8
                              }
                            }}
                          />
                            <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.875rem' }}>
                              {metrics.teamHealthScore >= 85 ? 'Excellent health status' : 
                               metrics.teamHealthScore >= 70 ? 'Good health status' : 
                               'Needs attention'}
                          </Typography>
                          </Box>
                        </Box>
                      </Box>
                      
                      {/* High-Risk Reports */}
                      <Box>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#374151' }}>High-Risk Reports</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
                          <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.875rem' }}>
                            {metrics.highRiskReports <= 5 ? 'Low risk level' : 
                             metrics.highRiskReports <= 10 ? 'Moderate risk level' : 
                             'High risk level'}
                          </Typography>
                        </Box>
                      </Box>
                      
                      {/* Case Closures */}
                      <Box>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#374151' }}>Case Closures</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
                          <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.875rem' }}>
                            Successfully resolved cases
                          </Typography>
                        </Box>
                      </Box>
                      
                      {/* Response Time Analysis */}
                      <Box>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#374151' }}>Response Time Analysis</Typography>
                        <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="body2" sx={{ color: '#374151', fontWeight: 600 }}>Average Response Time</Typography>
                            <Typography variant="h6" sx={{ color: '#0f172a', fontWeight: 700 }}>
                              {metrics.averageResponseTime.toFixed(1)} hours
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(100, (24 - metrics.averageResponseTime) / 24 * 100)}
                            sx={{ 
                              height: 8, 
                              borderRadius: 4,
                              bgcolor: '#e5e7eb',
                              '& .MuiLinearProgress-bar': {
                                background: metrics.averageResponseTime < 12 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 
                                           metrics.averageResponseTime < 24 ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 
                                           'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                borderRadius: 4
                              }
                            }}
                          />
                          <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.75rem', mt: 1, display: 'block' }}>
                            {metrics.averageResponseTime < 12 ? 'Fast response time' : 
                             metrics.averageResponseTime < 24 ? 'Standard response time' : 
                             'Slow response time'}
                          </Typography>
                        </Box>
                      </Box>
                    </Stack>
                  </Card>
                </Grid>
                
                {/* Performance Insights */}
                <Grid item xs={12} lg={6}>
                  <Card sx={{ 
                    p: { xs: 2, sm: 2.5, md: 3 }, 
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    borderRadius: 3,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    overflow: 'hidden',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
                      borderColor: '#CBD5E1'
                    }
                  }}>
                    {/* Top border indicator */}
                    <Box sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '4px',
                      background: 'linear-gradient(90deg, #f59e0b, #d97706)',
                    }} />
                    
                    <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
                      <Box sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, #FFFBEB, #FEF3C7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid #f59e0b30'
                      }}>
                        <TrendingUp sx={{ fontSize: 24, color: '#f59e0b' }} />
                      </Box>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', fontSize: '1.25rem' }}>
                          Performance Insights
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.875rem' }}>
                          Key performance indicators
                        </Typography>
                      </Box>
                    </Stack>
                    
                    <Stack spacing={3}>
                      {/* Quality Score */}
                      <Box>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#374151' }}>Quality Score</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Box sx={{
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: metrics.qualityScore >= 85 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 
                                       metrics.qualityScore >= 70 ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 
                                       'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '1.5rem',
                            boxShadow: `0 8px 32px ${metrics.qualityScore >= 85 ? '#10b981' : metrics.qualityScore >= 70 ? '#f59e0b' : '#ef4444'}40`,
                            border: `4px solid ${metrics.qualityScore >= 85 ? '#10b981' : metrics.qualityScore >= 70 ? '#f59e0b' : '#ef4444'}20`
                          }}>
                            {metrics.qualityScore.toFixed(0)}%
                          </Box>
                          <Box sx={{ flexGrow: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={metrics.qualityScore}
                              sx={{ 
                                height: 16, 
                                borderRadius: 8,
                                bgcolor: '#e5e7eb',
                                mb: 1,
                                '& .MuiLinearProgress-bar': {
                                  background: metrics.qualityScore >= 85 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 
                                             metrics.qualityScore >= 70 ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 
                                             'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                  borderRadius: 8
                                }
                              }}
                            />
                            <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.875rem' }}>
                              {metrics.qualityScore >= 85 ? 'Excellent quality' : 
                               metrics.qualityScore >= 70 ? 'Good quality' : 
                               'Needs improvement'}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                      
                      {/* Late Rate Analysis */}
                      <Box>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#374151' }}>Late Rate Analysis</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Chip
                            icon={<Warning />}
                            label={`${((metrics.overdueSubmissions / metrics.totalAssignments) * 100).toFixed(1)}% late`}
                            sx={{
                              bgcolor: ((metrics.overdueSubmissions / metrics.totalAssignments) * 100) <= 5 ? '#dcfce7' : 
                                       ((metrics.overdueSubmissions / metrics.totalAssignments) * 100) <= 15 ? '#fef3c7' : '#fecaca',
                              color: ((metrics.overdueSubmissions / metrics.totalAssignments) * 100) <= 5 ? '#166534' : 
                                     ((metrics.overdueSubmissions / metrics.totalAssignments) * 100) <= 15 ? '#92400e' : '#991b1b',
                              fontWeight: 600,
                              px: 2,
                              py: 1,
                              fontSize: '0.875rem',
                              border: '1px solid',
                              borderColor: ((metrics.overdueSubmissions / metrics.totalAssignments) * 100) <= 5 ? '#bbf7d0' : 
                                          ((metrics.overdueSubmissions / metrics.totalAssignments) * 100) <= 15 ? '#fde68a' : '#fca5a5'
                            }}
                          />
                          <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.875rem' }}>
                            {((metrics.overdueSubmissions / metrics.totalAssignments) * 100) <= 5 ? 'Low late rate' : 
                             ((metrics.overdueSubmissions / metrics.totalAssignments) * 100) <= 15 ? 'Moderate late rate' : 
                             'High late rate'}
                          </Typography>
                        </Box>
                      </Box>
                      
                      {/* Team Members */}
                      <Box>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#374151' }}>Team Members</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Chip
                            icon={<Group />}
                            label={`${metrics.totalMembers} members`}
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
                          <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.875rem' }}>
                            Active team members
                          </Typography>
                        </Box>
                      </Box>
                      
                      {/* Performance Summary */}
                      <Box>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#374151' }}>Performance Summary</Typography>
                        <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                          <Stack spacing={1.5}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="body2" sx={{ color: '#374151', fontWeight: 600 }}>Completion Rate</Typography>
                              <Typography variant="body2" sx={{ color: '#0f172a', fontWeight: 700 }}>
                                {metrics.completionRate.toFixed(1)}%
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="body2" sx={{ color: '#374151', fontWeight: 600 }}>On-Time Rate</Typography>
                              <Typography variant="body2" sx={{ color: '#0f172a', fontWeight: 700 }}>
                                {metrics.onTimeRate.toFixed(1)}%
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="body2" sx={{ color: '#374151', fontWeight: 600 }}>Quality Score</Typography>
                              <Typography variant="body2" sx={{ color: '#0f172a', fontWeight: 700 }}>
                                {metrics.qualityScore.toFixed(1)}%
                              </Typography>
                            </Box>
                          </Stack>
                        </Box>
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
