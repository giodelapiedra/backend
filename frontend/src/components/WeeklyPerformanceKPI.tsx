import React, { useMemo, useState } from 'react';
import {
  Box,
  Card,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Chip,
  Stack,
  Grid,
  Alert,
  Button,
  Pagination
} from '@mui/material';
import {
  Timeline,
  Assignment,
  CheckCircle,
  Schedule,
  Speed,
  TrendingUp,
  TrendingDown
} from '@mui/icons-material';

interface WeeklyPerformanceKPIProps {
  assignments: any[];
  selectedMonth: string;
}

interface WeekData {
  week: string;
  weekNumber: number;
  dateRange: string;
  assigned: number;
  completed: number;
  onTime: number;
  overdue: number;
  completionRate: number;
  onTimeRate: number;
  overdueRate: number;
  avgResponseTime: number;
  qualityScore: number;
  grade: string;
  gradeColor: string;
}

const WeeklyPerformanceKPI: React.FC<WeeklyPerformanceKPIProps> = ({
  assignments,
  selectedMonth
}) => {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const weeksPerPage = 5; // Show 5 weeks per page
  
  const weeklyData = useMemo(() => {
    const month = parseInt(selectedMonth.split('-')[1]) - 1;
    const year = parseInt(selectedMonth.split('-')[0]);
    
    // Find the first assignment date to determine when system started
    const assignmentDates = assignments
      .map(a => new Date(a.assigned_date))
      .sort((a, b) => a.getTime() - b.getTime());
    const firstAssignmentDate = assignmentDates.length > 0 ? assignmentDates[0] : null;
    
    // Get first day of month and system start date
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const systemStartDate = firstAssignmentDate || firstDay;
    
    const weeks: WeekData[] = [];
    let currentWeekStart = new Date(systemStartDate);
    
    while (currentWeekStart <= lastDay) {
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      if (weekEnd > lastDay) weekEnd.setTime(lastDay.getTime());
      
      const weekAssignments = assignments.filter(a => {
        const assignmentDate = new Date(a.assigned_date);
        const assignmentDateOnly = new Date(
          assignmentDate.getFullYear(),
          assignmentDate.getMonth(),
          assignmentDate.getDate()
        );
        const weekStartOnly = new Date(
          currentWeekStart.getFullYear(),
          currentWeekStart.getMonth(),
          currentWeekStart.getDate()
        );
        const weekEndOnly = new Date(
          weekEnd.getFullYear(),
          weekEnd.getMonth(),
          weekEnd.getDate()
        );
        
        return assignmentDateOnly >= weekStartOnly && assignmentDateOnly <= weekEndOnly;
      });
      
      const completed = weekAssignments.filter(a => a.status === 'completed').length;
      const onTime = weekAssignments.filter(a => {
        if (a.status !== 'completed' || !a.completed_at || !a.due_time) return false;
        const completedDate = new Date(a.completed_at);
        const dueTime = new Date(a.due_time);
        return completedDate <= dueTime;
      }).length;
      const overdue = weekAssignments.filter(a => a.status === 'overdue' || a.is_overdue).length;
      
      const completionRate = weekAssignments.length > 0 
        ? (completed / weekAssignments.length) * 100 
        : 0;
      const onTimeRate = completed > 0 
        ? (onTime / completed) * 100 
        : 0;
      const overdueRate = weekAssignments.length > 0
        ? (overdue / weekAssignments.length) * 100
        : 0;
      
      const avgResponseTime = completed > 0
        ? weekAssignments
            .filter(a => a.status === 'completed' && a.completed_at)
            .reduce((sum, a) => {
              const assignedDate = new Date(a.assigned_date);
              const completedDate = new Date(a.completed_at);
              return sum + (completedDate.getTime() - assignedDate.getTime()) / (1000 * 60 * 60);
            }, 0) / completed
        : 0;
      
      // Calculate quality score (weighted: 50% completion, 30% on-time, 20% overdue penalty)
      const qualityScore = Math.max(0, 
        (completionRate * 0.5) + 
        (onTimeRate * 0.3) - 
        (overdueRate * 0.2)
      );
      
      // Determine grade based on quality score
      let grade = '';
      let gradeColor = '';
      
      if (qualityScore >= 95) { grade = 'A+'; gradeColor = '#10b981'; }
      else if (qualityScore >= 90) { grade = 'A'; gradeColor = '#10b981'; }
      else if (qualityScore >= 85) { grade = 'A-'; gradeColor = '#10b981'; }
      else if (qualityScore >= 80) { grade = 'B+'; gradeColor = '#3b82f6'; }
      else if (qualityScore >= 75) { grade = 'B'; gradeColor = '#3b82f6'; }
      else if (qualityScore >= 70) { grade = 'B-'; gradeColor = '#3b82f6'; }
      else if (qualityScore >= 65) { grade = 'C+'; gradeColor = '#f59e0b'; }
      else if (qualityScore >= 60) { grade = 'C'; gradeColor = '#f59e0b'; }
      else if (qualityScore >= 55) { grade = 'C-'; gradeColor = '#f97316'; }
      else if (qualityScore >= 50) { grade = 'D'; gradeColor = '#ef4444'; }
      else { grade = 'F'; gradeColor = '#ef4444'; }
      
      weeks.push({
        week: `Week ${weeks.length + 1}`,
        weekNumber: weeks.length + 1,
        dateRange: `${currentWeekStart.getDate()}-${weekEnd.getDate()}`,
        assigned: weekAssignments.length,
        completed,
        onTime,
        overdue,
        completionRate,
        onTimeRate,
        overdueRate,
        avgResponseTime,
        qualityScore,
        grade,
        gradeColor
      });
      
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }
    
    return weeks;
  }, [assignments, selectedMonth]);

  // Calculate summary stats
  const totalAssigned = weeklyData.reduce((sum, w) => sum + w.assigned, 0);
  const totalCompleted = weeklyData.reduce((sum, w) => sum + w.completed, 0);
  const totalOnTime = weeklyData.reduce((sum, w) => sum + w.onTime, 0);
  const totalOverdue = weeklyData.reduce((sum, w) => sum + w.overdue, 0);
  const overallCompletionRate = totalAssigned > 0 ? (totalCompleted / totalAssigned) * 100 : 0;
  const overallOnTimeRate = totalCompleted > 0 ? (totalOnTime / totalCompleted) * 100 : 0;
  const avgQualityScore = weeklyData.length > 0
    ? weeklyData.reduce((sum, w) => sum + w.qualityScore, 0) / weeklyData.length
    : 0;

  // Calculate trend (compare last week to previous week)
  const trend = weeklyData.length >= 2
    ? weeklyData[weeklyData.length - 1].qualityScore - weeklyData[weeklyData.length - 2].qualityScore
    : 0;

  // Pagination calculations
  const totalPages = Math.ceil(weeklyData.length / weeksPerPage);
  const startIndex = (currentPage - 1) * weeksPerPage;
  const endIndex = startIndex + weeksPerPage;
  const paginatedWeeks = weeklyData.slice(startIndex, endIndex);

  // Reset to page 1 when month changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedMonth]);

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setCurrentPage(value);
    // Scroll to top of table
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (weeklyData.length === 0 || weeklyData.every(w => w.assigned === 0)) {
    return (
      <Alert 
        severity="info" 
        sx={{ 
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
    );
  }

  return (
    <Box>
      {/* Summary Cards */}
      <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: { xs: 3, sm: 4 } }}>
        {/* Overall Quality Score */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{
            p: { xs: 2, sm: 3 },
            background: 'white',
            borderRadius: { xs: 3, sm: 2 },
            boxShadow: { xs: '0 2px 8px rgba(0,0,0,0.08)', sm: 'none' },
            border: '1px solid #e5e7eb',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: avgQualityScore >= 80 ? '#10b981' : avgQualityScore >= 70 ? '#3b82f6' : avgQualityScore >= 60 ? '#f59e0b' : '#ef4444'
            }
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 1.5, sm: 2 } }}>
              <Box sx={{
                width: { xs: 44, sm: 48 },
                height: { xs: 44, sm: 48 },
                borderRadius: '50%',
                background: avgQualityScore >= 80 ? '#dcfce7' : avgQualityScore >= 70 ? '#dbeafe' : avgQualityScore >= 60 ? '#fef3c7' : '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 2
              }}>
                <Timeline sx={{
                  fontSize: { xs: 22, sm: 24 },
                  color: avgQualityScore >= 80 ? '#10b981' : avgQualityScore >= 70 ? '#3b82f6' : avgQualityScore >= 60 ? '#f59e0b' : '#ef4444'
                }} />
              </Box>
            </Box>
            <Typography variant="h3" sx={{ fontWeight: 700, color: '#1a1a1a', mb: 0.5, fontSize: { xs: '1.75rem', sm: '2rem' } }}>
              {avgQualityScore.toFixed(1)}%
            </Typography>
            <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 1, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
              Average Quality Score
            </Typography>
            {trend !== 0 && (
              <Chip
                icon={trend > 0 ? <TrendingUp sx={{ fontSize: 14 }} /> : <TrendingDown sx={{ fontSize: 14 }} />}
                label={`${trend > 0 ? '+' : ''}${trend.toFixed(1)}% vs last week`}
                size="small"
                sx={{
                  height: 24,
                  fontSize: '0.7rem',
                  bgcolor: trend > 0 ? '#dcfce7' : '#fee2e2',
                  color: trend > 0 ? '#166534' : '#991b1b',
                  fontWeight: 600,
                  '& .MuiChip-icon': {
                    color: trend > 0 ? '#166534' : '#991b1b'
                  }
                }}
              />
            )}
          </Card>
        </Grid>

        {/* Total Completed */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{
            p: { xs: 2, sm: 3 },
            background: 'white',
            borderRadius: { xs: 3, sm: 2 },
            boxShadow: { xs: '0 2px 8px rgba(0,0,0,0.08)', sm: 'none' },
            border: '1px solid #e5e7eb',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: '#10b981'
            }
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 1.5, sm: 2 } }}>
              <Box sx={{
                width: { xs: 44, sm: 48 },
                height: { xs: 44, sm: 48 },
                borderRadius: '50%',
                background: '#dcfce7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 2
              }}>
                <CheckCircle sx={{ fontSize: { xs: 22, sm: 24 }, color: '#10b981' }} />
              </Box>
            </Box>
            <Typography variant="h3" sx={{ fontWeight: 700, color: '#1a1a1a', mb: 0.5, fontSize: { xs: '1.75rem', sm: '2rem' } }}>
              {totalCompleted}
            </Typography>
            <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 1, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
              Completed This Month
            </Typography>
            <Typography variant="caption" sx={{ color: '#10b981', fontSize: '0.7rem', fontWeight: 600 }}>
              {overallCompletionRate.toFixed(1)}% completion rate
            </Typography>
          </Card>
        </Grid>

        {/* On-Time Rate */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{
            p: { xs: 2, sm: 3 },
            background: 'white',
            borderRadius: { xs: 3, sm: 2 },
            boxShadow: { xs: '0 2px 8px rgba(0,0,0,0.08)', sm: 'none' },
            border: '1px solid #e5e7eb',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: '#3b82f6'
            }
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 1.5, sm: 2 } }}>
              <Box sx={{
                width: { xs: 44, sm: 48 },
                height: { xs: 44, sm: 48 },
                borderRadius: '50%',
                background: '#dbeafe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 2
              }}>
                <Schedule sx={{ fontSize: { xs: 22, sm: 24 }, color: '#3b82f6' }} />
              </Box>
            </Box>
            <Typography variant="h3" sx={{ fontWeight: 700, color: '#1a1a1a', mb: 0.5, fontSize: { xs: '1.75rem', sm: '2rem' } }}>
              {overallOnTimeRate.toFixed(1)}%
            </Typography>
            <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 1, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
              On-Time Rate
            </Typography>
            <Typography variant="caption" sx={{ color: '#3b82f6', fontSize: '0.7rem', fontWeight: 600 }}>
              {totalOnTime} on-time submissions
            </Typography>
          </Card>
        </Grid>

        {/* Total Weeks */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{
            p: { xs: 2, sm: 3 },
            background: 'white',
            borderRadius: { xs: 3, sm: 2 },
            boxShadow: { xs: '0 2px 8px rgba(0,0,0,0.08)', sm: 'none' },
            border: '1px solid #e5e7eb',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: '#8b5cf6'
            }
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 1.5, sm: 2 } }}>
              <Box sx={{
                width: { xs: 44, sm: 48 },
                height: { xs: 44, sm: 48 },
                borderRadius: '50%',
                background: '#f3e8ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 2
              }}>
                <Assignment sx={{ fontSize: { xs: 22, sm: 24 }, color: '#8b5cf6' }} />
              </Box>
            </Box>
            <Typography variant="h3" sx={{ fontWeight: 700, color: '#1a1a1a', mb: 0.5, fontSize: { xs: '1.75rem', sm: '2rem' } }}>
              {weeklyData.length}
            </Typography>
            <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 1, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
              Weeks Tracked
            </Typography>
            <Typography variant="caption" sx={{ color: '#8b5cf6', fontSize: '0.7rem', fontWeight: 600 }}>
              {totalAssigned} total assignments
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Weekly Performance Table */}
      <TableContainer
        component={Paper}
        sx={{
          borderRadius: { xs: 3, sm: 2 },
          border: '1px solid #e5e7eb',
          boxShadow: { xs: '0 2px 8px rgba(0,0,0,0.08)', sm: 'none' },
          overflow: 'auto',
          maxWidth: '100%',
          WebkitOverflowScrolling: 'touch',
          '&::-webkit-scrollbar': {
            height: { xs: 6, sm: 8 }
          },
          '&::-webkit-scrollbar-track': {
            bgcolor: '#f3f4f6'
          },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: '#cbd5e1',
            borderRadius: 4,
            '&:hover': {
              bgcolor: '#94a3b8'
            }
          }
        }}
      >
        <Table sx={{ minWidth: { xs: 900, sm: 'auto' } }}>
          <TableHead sx={{
            bgcolor: '#fafbfc',
            '& th': {
              borderBottom: '2px solid #e5e7eb',
              color: '#6b7280',
              fontWeight: 700,
              textTransform: 'uppercase',
              fontSize: { xs: '0.7rem', sm: '0.75rem' },
              letterSpacing: '0.05em',
              py: { xs: 1.5, sm: 2 }
            }
          }}>
            <TableRow>
              <TableCell sx={{ minWidth: 100 }}>Week</TableCell>
              <TableCell align="center" sx={{ minWidth: 80 }}>Assigned</TableCell>
              <TableCell align="center" sx={{ minWidth: 80 }}>Completed</TableCell>
              <TableCell align="center" sx={{ minWidth: 140 }}>Completion Rate</TableCell>
              <TableCell align="center" sx={{ minWidth: 120 }}>On-Time Rate</TableCell>
              <TableCell align="center" sx={{ minWidth: 130 }}>Avg Response Time</TableCell>
              <TableCell align="center" sx={{ minWidth: 120 }}>Quality Score</TableCell>
              <TableCell align="center" sx={{ minWidth: 80 }}>Grade</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedWeeks.map((week, index) => (
              <TableRow
                key={startIndex + index}
                sx={{
                  '&:hover': {
                    bgcolor: '#f9fafb'
                  },
                  '& td': {
                    py: { xs: 1.5, sm: 2 },
                    fontSize: { xs: '0.8rem', sm: '0.875rem' },
                    borderBottom: '1px solid #f3f4f6'
                  }
                }}
              >
                <TableCell>
                  <Stack>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#374151', fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                      {week.week}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#9ca3af', fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                      {week.dateRange}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={week.assigned}
                    size="small"
                    sx={{
                      bgcolor: '#f3f4f6',
                      color: '#374151',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      height: 24
                    }}
                  />
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={week.completed}
                    size="small"
                    sx={{
                      bgcolor: '#dcfce7',
                      color: '#166534',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      height: 24
                    }}
                  />
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
                    <LinearProgress
                      variant="determinate"
                      value={week.completionRate}
                      sx={{
                        width: { xs: 60, sm: 80 },
                        height: { xs: 6, sm: 8 },
                        borderRadius: 4,
                        bgcolor: '#f3f4f6',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: week.completionRate >= 90 ? '#10b981' : week.completionRate >= 75 ? '#3b82f6' : week.completionRate >= 60 ? '#f59e0b' : '#ef4444',
                          borderRadius: 4
                        }
                      }}
                    />
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#374151', minWidth: 45, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      {week.completionRate.toFixed(1)}%
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#374151', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    {week.onTimeRate.toFixed(1)}%
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    icon={<Speed sx={{ fontSize: 14 }} />}
                    label={`${week.avgResponseTime.toFixed(1)}h`}
                    size="small"
                    sx={{
                      bgcolor: week.avgResponseTime < 12 ? '#dcfce7' : week.avgResponseTime < 24 ? '#fef3c7' : '#fee2e2',
                      color: week.avgResponseTime < 12 ? '#166534' : week.avgResponseTime < 24 ? '#92400e' : '#991b1b',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      height: 24,
                      '& .MuiChip-icon': {
                        color: week.avgResponseTime < 12 ? '#166534' : week.avgResponseTime < 24 ? '#92400e' : '#991b1b'
                      }
                    }}
                  />
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
                    <LinearProgress
                      variant="determinate"
                      value={week.qualityScore}
                      sx={{
                        width: { xs: 50, sm: 60 },
                        height: { xs: 6, sm: 8 },
                        borderRadius: 4,
                        bgcolor: '#f3f4f6',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: week.gradeColor,
                          borderRadius: 4
                        }
                      }}
                    />
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#374151', minWidth: 45, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      {week.qualityScore.toFixed(1)}%
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={week.grade}
                    size="small"
                    sx={{
                      bgcolor: `${week.gradeColor}15`,
                      color: week.gradeColor,
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      height: 28,
                      minWidth: 45
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mt: { xs: 3, sm: 4 },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2
        }}>
          {/* Page Info */}
          <Typography variant="body2" sx={{ 
            color: '#6b7280', 
            fontWeight: 500,
            fontSize: { xs: '0.8rem', sm: '0.875rem' }
          }}>
            Showing weeks {startIndex + 1}-{Math.min(endIndex, weeklyData.length)} of {weeklyData.length}
          </Typography>

          {/* Pagination Controls */}
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              variant="outlined"
              size="small"
              onClick={() => handlePageChange({} as any, currentPage - 1)}
              disabled={currentPage === 1}
              sx={{
                minWidth: { xs: 36, sm: 44 },
                height: { xs: 36, sm: 44 },
                borderRadius: 3,
                borderColor: '#e5e7eb',
                color: '#6b7280',
                fontSize: { xs: '0.875rem', sm: '1rem' },
                fontWeight: 600,
                '&:hover': {
                  borderColor: '#667eea',
                  color: '#667eea',
                  bgcolor: 'rgba(102, 126, 234, 0.05)'
                },
                '&:disabled': {
                  borderColor: '#f3f4f6',
                  color: '#d1d5db'
                }
              }}
            >
              ←
            </Button>

            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={handlePageChange}
              color="primary"
              size={window.innerWidth < 600 ? 'small' : 'medium'}
              siblingCount={window.innerWidth < 600 ? 0 : 1}
              boundaryCount={1}
              sx={{
                '& .MuiPaginationItem-root': {
                  fontWeight: 600,
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  minWidth: { xs: 32, sm: 40 },
                  height: { xs: 32, sm: 40 },
                  borderRadius: 2,
                  color: '#6b7280',
                  border: '1px solid #e5e7eb',
                  '&:hover': {
                    bgcolor: 'rgba(102, 126, 234, 0.05)',
                    borderColor: '#667eea',
                    color: '#667eea'
                  },
                  '&.Mui-selected': {
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5568d3 0%, #6a3f91 100%)',
                      color: 'white'
                    }
                  }
                }
              }}
            />

            <Button
              variant="outlined"
              size="small"
              onClick={() => handlePageChange({} as any, currentPage + 1)}
              disabled={currentPage === totalPages}
              sx={{
                minWidth: { xs: 36, sm: 44 },
                height: { xs: 36, sm: 44 },
                borderRadius: 3,
                borderColor: '#e5e7eb',
                color: '#6b7280',
                fontSize: { xs: '0.875rem', sm: '1rem' },
                fontWeight: 600,
                '&:hover': {
                  borderColor: '#667eea',
                  color: '#667eea',
                  bgcolor: 'rgba(102, 126, 234, 0.05)'
                },
                '&:disabled': {
                  borderColor: '#f3f4f6',
                  color: '#d1d5db'
                }
              }}
            >
              →
            </Button>
          </Stack>
        </Box>
      )}
    </Box>
  );
};

export default WeeklyPerformanceKPI;

