import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  Typography,
  Stack,
  Avatar,
  Card,
  Grid,
  Button,
  Pagination,
  Tooltip,
  alpha
} from '@mui/material';
import {
  CheckCircle,
  Warning,
  EmojiEvents,
  Assignment,
  TrendingUp,
  Schedule,
  Star,
  ArrowForward
} from '@mui/icons-material';

// Type-safe interfaces
interface Assignment {
  worker_id: string;
  assigned_date: string;
  status?: string;
  due_time?: string;
  completed_at?: string;
  work_readiness?: any;
  workReadiness?: any;
  work_readiness_id?: string;
  worker?: {
    first_name?: string;
    last_name?: string;
  };
}

interface WorkerData {
  workerId: string;
  workerName: string;
  totalAssignments: number;
  readinessCompleted: number;
  completionRate: number;
  onTimeRate: number;
  overdueCount: number;
  qualityScore: number;
  rank: number;
  grade: string;
  gradeColor: string;
}

interface WorkerPerformanceKPIProps {
  assignments: Assignment[];
  selectedMonth: string;
}

// Constants
const WORKERS_PER_PAGE = 10;

// 🎨 2025 Clean Corporate Design System - White + Navy + Teal
const COLORS = {
  // Base colors - Clean White
  background: '#FFFFFF',
  surface: '#F8FAFB',
  
  // Navy Blue - Professional & Trustworthy
  navy: {
    dark: '#0F2942',      // Deep navy
    main: '#1E3A5F',      // Main navy
    medium: '#2C5282',    // Medium navy
    light: '#E8EDF3'      // Light navy tint
  },
  
  // Teal - Modern Accent
  teal: {
    dark: '#0D9488',      // Deep teal
    main: '#14B8A6',      // Main teal
    light: '#99F6E4',     // Light teal
    subtle: '#F0FDFA'     // Subtle teal bg
  },
  
  // Neutrals
  text: {
    primary: '#1F2937',
    secondary: '#6B7280',
    disabled: '#9CA3AF'
  },
  
  border: '#E5E7EB',
  divider: '#F3F4F6',
  
  // Status colors - Corporate friendly
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6'
} as const;

const GRADE_THRESHOLDS = {
  A: 95,
  B: 85,
  C: 70
} as const;

const WorkerPerformanceKPI: React.FC<WorkerPerformanceKPIProps> = ({ assignments, selectedMonth }) => {
  const [currentPage, setCurrentPage] = useState(1);
  
  const getWorkerName = useCallback((worker?: { first_name?: string; last_name?: string }): string => {
    if (!worker) return 'Unknown Worker';
    const firstName = worker.first_name?.trim() || '';
    const lastName = worker.last_name?.trim() || '';
    return `${firstName} ${lastName}`.trim() || 'Unknown Worker';
  }, []);

  const calculateGrade = useCallback((score: number): { grade: string; color: string } => {
    if (score >= GRADE_THRESHOLDS.A) return { grade: 'A', color: COLORS.success };
    if (score >= GRADE_THRESHOLDS.B) return { grade: 'B', color: COLORS.teal.main };
    if (score >= GRADE_THRESHOLDS.C) return { grade: 'C', color: COLORS.warning };
    return { grade: 'D', color: COLORS.error };
  }, []);
  
  const workerData = useMemo((): WorkerData[] => {
    if (!Array.isArray(assignments) || assignments.length === 0) {
      return [];
    }

    if (!/^\d{4}-\d{2}$/.test(selectedMonth)) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Invalid selectedMonth format:', selectedMonth);
      }
      return [];
    }
    
    const [selectedYear, selectedMonthNum] = selectedMonth.split('-');
    const filterMonth = parseInt(selectedMonthNum, 10) - 1;
    const filterYear = parseInt(selectedYear, 10);

    if (isNaN(filterMonth) || isNaN(filterYear) || filterMonth < 0 || filterMonth > 11) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Invalid month/year values:', { filterMonth, filterYear });
      }
      return [];
    }
    
    interface WorkerStats {
      workerId: string;
      workerName: string;
      totalAssignments: number;
      readinessCompleted: number;
      onTimeSubmissions: number;
      lateSubmissions: number;
      pendingAssignments: number;
      overdueSubmissions: number;
      avgReadinessLevel: number;
      readinessLevelCount: number;
    }
    
    const workerMap = new Map<string, WorkerStats>();
    
    assignments.forEach(assignment => {
      if (!assignment || !assignment.worker_id || !assignment.assigned_date) {
        return;
      }

      try {
        const assignedDate = new Date(assignment.assigned_date);
        if (isNaN(assignedDate.getTime())) return;

        if (assignedDate.getMonth() !== filterMonth || assignedDate.getFullYear() !== filterYear) {
          return;
        }
      } catch (err) {
        return;
      }
      
      const workerId = assignment.worker_id;
      const workerName = getWorkerName(assignment.worker);
      
      if (!workerMap.has(workerId)) {
        workerMap.set(workerId, {
          workerId,
          workerName,
          totalAssignments: 0,
          readinessCompleted: 0,
          onTimeSubmissions: 0,
          lateSubmissions: 0,
          pendingAssignments: 0,
          overdueSubmissions: 0,
          avgReadinessLevel: 0,
          readinessLevelCount: 0
        });
      }
      
      const worker = workerMap.get(workerId)!;
      worker.totalAssignments++;
      
      const status = assignment.status?.toLowerCase()?.trim() || '';
      
      if (status === 'pending') {
        worker.pendingAssignments++;
      }
      
      if (status === 'overdue') {
        worker.overdueSubmissions++;
      }
      
      const hasWorkReadiness = Boolean(
        assignment.work_readiness || 
        assignment.workReadiness || 
        assignment.work_readiness_id
      );
      
      if (hasWorkReadiness) {
        worker.readinessCompleted++;
        
        const readinessData = assignment.work_readiness || assignment.workReadiness;
        if (readinessData?.readiness_level) {
          let level = 50;
          const readinessLevel = readinessData.readiness_level.toLowerCase();
          if (readinessLevel === 'fit') level = 100;
          else if (readinessLevel === 'minor') level = 70;
          else if (readinessLevel === 'not_fit') level = 30;
          
          worker.avgReadinessLevel += level;
          worker.readinessLevelCount++;
        }
        
        if (status === 'completed') {
          if (assignment.due_time && assignment.completed_at) {
            const dueTime = new Date(assignment.due_time);
            const completedTime = new Date(assignment.completed_at);
            
            if (completedTime <= dueTime) {
              worker.onTimeSubmissions++;
            } else {
              worker.lateSubmissions++;
            }
          } else {
            worker.onTimeSubmissions++;
          }
        }
      }
    });
    
    const workerDataArray: WorkerData[] = [];
    
    workerMap.forEach((worker) => {
      const completionRate = worker.totalAssignments > 0 
        ? (worker.readinessCompleted / worker.totalAssignments) * 100 
        : 0;
      
      let onTimeRate = worker.totalAssignments > 0
        ? (worker.onTimeSubmissions / worker.totalAssignments) * 100
        : 0;
      
      let qualityScore = worker.readinessLevelCount > 0
        ? worker.avgReadinessLevel / worker.readinessLevelCount
        : 70;
      
      if (worker.lateSubmissions > 0) {
        const latePenaltyRate = (worker.lateSubmissions / worker.totalAssignments) * 50;
        onTimeRate = Math.max(0, onTimeRate - latePenaltyRate);
        
        const latePenaltyQuality = (worker.lateSubmissions / worker.totalAssignments) * 20;
        qualityScore = Math.max(0, qualityScore - latePenaltyQuality);
      }
      
      let weightedScore = (completionRate * 0.5) +
                         (onTimeRate * 0.25) +
                         (qualityScore * 0.1);
      
      const pendingBonus = worker.pendingAssignments > 0
        ? Math.min(5, (worker.pendingAssignments / worker.totalAssignments) * 5)
        : 0;
      
      const overduePenalty = Math.min(10, (worker.overdueSubmissions / worker.totalAssignments) * 10);
      
      const recoveryBonus = completionRate >= 80 ? 3 : 0;
      
      weightedScore = weightedScore + pendingBonus - overduePenalty + recoveryBonus;
      
      const finalScore = Math.max(0, Math.min(100, weightedScore));
      
      const { grade, color: gradeColor } = calculateGrade(finalScore);
      
      workerDataArray.push({
        workerId: worker.workerId,
        workerName: worker.workerName,
        totalAssignments: worker.totalAssignments,
        readinessCompleted: worker.readinessCompleted,
        completionRate: Math.round(completionRate * 10) / 10,
        onTimeRate: Math.round(onTimeRate * 10) / 10,
        overdueCount: worker.overdueSubmissions,
        qualityScore: Math.round(finalScore * 10) / 10,
        rank: 0,
        grade,
        gradeColor
      });
    });
    
    workerDataArray.sort((a, b) => b.qualityScore - a.qualityScore);
    
    workerDataArray.forEach((worker, index) => {
      worker.rank = index + 1;
    });
    
    return workerDataArray;
  }, [assignments, selectedMonth, getWorkerName, calculateGrade]);
  
  const paginationData = useMemo(() => {
    const totalPages = Math.ceil(workerData.length / WORKERS_PER_PAGE);
    const startIndex = (currentPage - 1) * WORKERS_PER_PAGE;
    const endIndex = startIndex + WORKERS_PER_PAGE;
    const paginatedWorkers = workerData.slice(startIndex, endIndex);

    return {
      totalPages,
      startIndex,
      endIndex,
      paginatedWorkers
    };
  }, [workerData, currentPage]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedMonth]);

  const handlePageChange = useCallback((event: React.ChangeEvent<unknown>, value: number) => {
    setCurrentPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  
  const summaryStats = useMemo(() => {
    const avgQuality = workerData.length > 0
      ? workerData.reduce((sum, w) => sum + w.qualityScore, 0) / workerData.length
      : 0;
    
    const topPerformers = workerData.filter(w => w.qualityScore >= 95).length;
    const totalOverdue = workerData.reduce((sum, w) => sum + w.overdueCount, 0);
    
    return {
      totalWorkers: workerData.length,
      avgQuality,
      topPerformers,
      totalOverdue
    };
  }, [workerData]);

  return (
    <Box sx={{ bgcolor: COLORS.surface, minHeight: '100vh' }}>
      {/* 📊 Clean Corporate Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Total Workers */}
        <Grid item xs={12} sm={6} lg={3}>
          <Card sx={{ 
            bgcolor: COLORS.background,
            borderRadius: 2,
            border: `1px solid ${COLORS.border}`,
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            transition: 'all 0.2s ease',
            '&:hover': {
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              transform: 'translateY(-2px)'
            }
          }}>
            <Box sx={{ 
              p: 2.5,
              borderTop: `3px solid ${COLORS.navy.main}`
            }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: 2,
                  bgcolor: alpha(COLORS.navy.main, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Assignment sx={{ fontSize: 24, color: COLORS.navy.main }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ 
                    color: COLORS.text.secondary,
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    mb: 0.5
                  }}>
                    Total Workers
                  </Typography>
                  <Typography variant="h4" sx={{ 
                    fontWeight: 700, 
                    color: COLORS.navy.dark,
                    fontSize: '2rem'
                  }}>
                    {summaryStats.totalWorkers}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Card>
        </Grid>

        {/* Average Quality */}
        <Grid item xs={12} sm={6} lg={3}>
          <Card sx={{ 
            bgcolor: COLORS.background,
            borderRadius: 2,
            border: `1px solid ${COLORS.border}`,
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            transition: 'all 0.2s ease',
            '&:hover': {
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              transform: 'translateY(-2px)'
            }
          }}>
            <Box sx={{ 
              p: 2.5,
              borderTop: `3px solid ${COLORS.teal.main}`
            }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: 2,
                  bgcolor: alpha(COLORS.teal.main, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <CheckCircle sx={{ fontSize: 24, color: COLORS.teal.main }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ 
                    color: COLORS.text.secondary,
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    mb: 0.5
                  }}>
                    Avg Quality Score
                  </Typography>
                  <Typography variant="h4" sx={{ 
                    fontWeight: 700, 
                    color: COLORS.navy.dark,
                    fontSize: '2rem'
                  }}>
                    {summaryStats.avgQuality.toFixed(1)}%
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Card>
        </Grid>

        {/* Top Performers */}
        <Grid item xs={12} sm={6} lg={3}>
          <Card sx={{ 
            bgcolor: COLORS.background,
            borderRadius: 2,
            border: `1px solid ${COLORS.border}`,
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            transition: 'all 0.2s ease',
            '&:hover': {
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              transform: 'translateY(-2px)'
            }
          }}>
            <Box sx={{ 
              p: 2.5,
              borderTop: `3px solid ${COLORS.success}`
            }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: 2,
                  bgcolor: alpha(COLORS.success, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <EmojiEvents sx={{ fontSize: 24, color: COLORS.success }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ 
                    color: COLORS.text.secondary,
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    mb: 0.5
                  }}>
                    Top Performers (A)
                  </Typography>
                  <Typography variant="h4" sx={{ 
                    fontWeight: 700, 
                    color: COLORS.navy.dark,
                    fontSize: '2rem'
                  }}>
                    {summaryStats.topPerformers}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Card>
        </Grid>

        {/* Total Overdue */}
        <Grid item xs={12} sm={6} lg={3}>
          <Card sx={{ 
            bgcolor: COLORS.background,
            borderRadius: 2,
            border: `1px solid ${COLORS.border}`,
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            transition: 'all 0.2s ease',
            '&:hover': {
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              transform: 'translateY(-2px)'
            }
          }}>
            <Box sx={{ 
              p: 2.5,
              borderTop: `3px solid ${COLORS.error}`
            }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: 2,
                  bgcolor: alpha(COLORS.error, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Warning sx={{ fontSize: 24, color: COLORS.error }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ 
                    color: COLORS.text.secondary,
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    mb: 0.5
                  }}>
                    Total Overdue
                  </Typography>
                  <Typography variant="h4" sx={{ 
                    fontWeight: 700, 
                    color: COLORS.navy.dark,
                    fontSize: '2rem'
                  }}>
                    {summaryStats.totalOverdue}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* 📋 Clean Corporate Performance Table */}
      <Card sx={{
        bgcolor: COLORS.background,
        borderRadius: 2,
        border: `1px solid ${COLORS.border}`,
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: COLORS.navy.light }}>
                <TableCell sx={{ 
                  fontWeight: 600, 
                  fontSize: '0.75rem', 
                  color: COLORS.navy.dark,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  py: 2,
                  px: 3
                }}>
                  Rank
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 600, 
                  fontSize: '0.75rem', 
                  color: COLORS.navy.dark,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  py: 2
                }}>
                  Worker
                </TableCell>
                <TableCell align="center" sx={{ 
                  fontWeight: 600, 
                  fontSize: '0.75rem', 
                  color: COLORS.navy.dark,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  py: 2
                }}>
                  Assignments
                </TableCell>
                <TableCell align="center" sx={{ 
                  fontWeight: 600, 
                  fontSize: '0.75rem', 
                  color: COLORS.navy.dark,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  py: 2
                }}>
                  Completed
                </TableCell>
                <TableCell align="center" sx={{ 
                  fontWeight: 600, 
                  fontSize: '0.75rem', 
                  color: COLORS.navy.dark,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  py: 2
                }}>
                  Completion
                </TableCell>
                <TableCell align="center" sx={{ 
                  fontWeight: 600, 
                  fontSize: '0.75rem', 
                  color: COLORS.navy.dark,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  py: 2
                }}>
                  On-Time
                </TableCell>
                <TableCell align="center" sx={{ 
                  fontWeight: 600, 
                  fontSize: '0.75rem', 
                  color: COLORS.navy.dark,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  py: 2
                }}>
                  Overdue
                </TableCell>
                <TableCell align="center" sx={{ 
                  fontWeight: 600, 
                  fontSize: '0.75rem', 
                  color: COLORS.navy.dark,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  py: 2
                }}>
                  Quality
                </TableCell>
                <TableCell align="center" sx={{ 
                  fontWeight: 600, 
                  fontSize: '0.75rem', 
                  color: COLORS.navy.dark,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  py: 2
                }}>
                  Grade
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 600, 
                  fontSize: '0.75rem', 
                  color: COLORS.navy.dark,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  py: 2,
                  px: 3
                }}>
                  Status
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginationData.paginatedWorkers.map((worker, index) => (
                <TableRow 
                  key={worker.workerId}
                  sx={{
                    borderBottom: `1px solid ${COLORS.divider}`,
                    '&:hover': {
                      bgcolor: COLORS.surface
                    },
                    '&:last-child': {
                      borderBottom: 'none'
                    }
                  }}
                >
                  {/* Rank */}
                  <TableCell sx={{ py: 2, px: 3 }}>
                    {worker.rank <= 3 ? (
                      <Tooltip title={`#${worker.rank} Top Performer`} arrow>
                        <Box sx={{ 
                          width: 36, 
                          height: 36, 
                          borderRadius: 2,
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          bgcolor: worker.rank === 1 
                            ? '#FCD34D'
                            : worker.rank === 2 
                            ? '#D1D5DB'
                            : '#FDBA74',
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                        }}>
                          <EmojiEvents sx={{ 
                            fontSize: 20,
                            color: worker.rank === 1 ? '#92400E' : 
                                   worker.rank === 2 ? '#6B7280' : '#9A3412'
                          }} />
                        </Box>
                      </Tooltip>
                    ) : (
                      <Typography variant="body2" sx={{ 
                        fontWeight: 600, 
                        color: COLORS.text.secondary,
                        fontSize: '0.875rem'
                      }}>
                        #{worker.rank}
                      </Typography>
                    )}
                  </TableCell>
                  
                  {/* Worker Name */}
                  <TableCell sx={{ py: 2 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar sx={{ 
                        bgcolor: COLORS.navy.main,
                        width: 36, 
                        height: 36,
                        fontSize: '0.875rem',
                        fontWeight: 600
                      }}>
                        {worker.workerName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </Avatar>
                      <Typography variant="body2" sx={{ 
                        fontWeight: 600, 
                        color: COLORS.text.primary,
                        fontSize: '0.875rem'
                      }}>
                        {worker.workerName}
                      </Typography>
                    </Stack>
                  </TableCell>
                  
                  {/* Total */}
                  <TableCell align="center" sx={{ py: 2 }}>
                    <Chip 
                      label={worker.totalAssignments}
                      size="small"
                      sx={{ 
                        bgcolor: alpha(COLORS.navy.main, 0.1),
                        color: COLORS.navy.dark,
                        fontWeight: 600,
                        fontSize: '0.8125rem',
                        height: 24,
                        minWidth: 40
                      }}
                    />
                  </TableCell>
                  
                  {/* Completed */}
                  <TableCell align="center" sx={{ py: 2 }}>
                    <Chip 
                      label={worker.readinessCompleted}
                      size="small"
                      sx={{ 
                        bgcolor: alpha(COLORS.teal.main, 0.1),
                        color: COLORS.teal.dark,
                        fontWeight: 600,
                        fontSize: '0.8125rem',
                        height: 24,
                        minWidth: 40
                      }}
                    />
                  </TableCell>
                  
                  {/* Completion Rate */}
                  <TableCell align="center" sx={{ py: 2 }}>
                    <Stack spacing={0.5} alignItems="center">
                      <Typography variant="body2" sx={{ 
                        fontWeight: 600, 
                        color: COLORS.text.primary,
                        fontSize: '0.875rem'
                      }}>
                        {worker.completionRate.toFixed(1)}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={worker.completionRate}
                        sx={{ 
                          width: 80, 
                          height: 4, 
                          borderRadius: 2,
                          bgcolor: COLORS.divider,
                          '& .MuiLinearProgress-bar': {
                            bgcolor: worker.completionRate >= 90 ? COLORS.success : 
                                    worker.completionRate >= 70 ? COLORS.warning : COLORS.error,
                            borderRadius: 2
                          }
                        }}
                      />
                    </Stack>
                  </TableCell>
                  
                  {/* On-Time Rate */}
                  <TableCell align="center" sx={{ py: 2 }}>
                    <Stack spacing={0.5} alignItems="center">
                      <Typography variant="body2" sx={{ 
                        fontWeight: 600, 
                        color: COLORS.text.primary,
                        fontSize: '0.875rem'
                      }}>
                        {worker.onTimeRate.toFixed(1)}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={worker.onTimeRate}
                        sx={{ 
                          width: 80, 
                          height: 4, 
                          borderRadius: 2,
                          bgcolor: COLORS.divider,
                          '& .MuiLinearProgress-bar': {
                            bgcolor: worker.onTimeRate >= 90 ? COLORS.teal.main : 
                                    worker.onTimeRate >= 70 ? COLORS.warning : COLORS.error,
                            borderRadius: 2
                          }
                        }}
                      />
                    </Stack>
                  </TableCell>
                  
                  {/* Overdue */}
                  <TableCell align="center" sx={{ py: 2 }}>
                    <Chip 
                      label={worker.overdueCount}
                      size="small"
                      sx={{ 
                        bgcolor: worker.overdueCount === 0 
                          ? alpha(COLORS.success, 0.1)
                          : worker.overdueCount <= 2 
                          ? alpha(COLORS.warning, 0.1)
                          : alpha(COLORS.error, 0.1),
                        color: worker.overdueCount === 0 ? COLORS.success : 
                               worker.overdueCount <= 2 ? COLORS.warning : COLORS.error,
                        fontWeight: 600,
                        fontSize: '0.8125rem',
                        height: 24,
                        minWidth: 40
                      }}
                    />
                  </TableCell>
                  
                  {/* Quality Score */}
                  <TableCell align="center" sx={{ py: 2 }}>
                    <Stack spacing={0.5} alignItems="center">
                      <Typography variant="h6" sx={{ 
                        fontWeight: 700, 
                        color: COLORS.navy.dark,
                        fontSize: '1rem'
                      }}>
                        {worker.qualityScore.toFixed(1)}
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={worker.qualityScore}
                        sx={{ 
                          width: 80, 
                          height: 5, 
                          borderRadius: 2,
                          bgcolor: COLORS.divider,
                          '& .MuiLinearProgress-bar': {
                            bgcolor: worker.qualityScore >= 95 ? COLORS.success : 
                                     worker.qualityScore >= 85 ? COLORS.teal.main :
                                     worker.qualityScore >= 70 ? COLORS.warning : COLORS.error,
                            borderRadius: 2
                          }
                        }}
                      />
                    </Stack>
                  </TableCell>
                  
                  {/* Grade */}
                  <TableCell align="center" sx={{ py: 2 }}>
                    <Chip
                      label={worker.grade}
                      sx={{
                        bgcolor: alpha(worker.gradeColor, 0.1),
                        color: worker.gradeColor,
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        height: 28,
                        minWidth: 40,
                        border: `1px solid ${alpha(worker.gradeColor, 0.3)}`
                      }}
                    />
                  </TableCell>
                  
                  {/* Status */}
                  <TableCell sx={{ py: 2, px: 3 }}>
                    {worker.qualityScore >= 95 ? (
                      <Chip
                        label="Excellent"
                        size="small"
                        sx={{
                          bgcolor: alpha(COLORS.success, 0.1),
                          color: COLORS.success,
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          height: 24
                        }}
                      />
                    ) : worker.qualityScore >= 85 ? (
                      <Chip
                        label="Very Good"
                        size="small"
                        sx={{
                          bgcolor: alpha(COLORS.teal.main, 0.1),
                          color: COLORS.teal.dark,
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          height: 24
                        }}
                      />
                    ) : worker.qualityScore >= 70 ? (
                      <Chip
                        label="Good"
                        size="small"
                        sx={{
                          bgcolor: alpha(COLORS.warning, 0.1),
                          color: COLORS.warning,
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          height: 24
                        }}
                      />
                    ) : (
                      <Chip
                        label="Needs Work"
                        size="small"
                        sx={{
                          bgcolor: alpha(COLORS.error, 0.1),
                          color: COLORS.error,
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          height: 24
                        }}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Clean Corporate Pagination */}
        {paginationData.totalPages > 1 && (
          <Box sx={{ 
            p: 3,
            borderTop: `1px solid ${COLORS.divider}`,
            bgcolor: COLORS.surface
          }}>
            <Stack 
              direction={{ xs: 'column', sm: 'row' }} 
              alignItems="center" 
              justifyContent="space-between"
              spacing={2}
            >
              <Typography variant="body2" sx={{ 
                color: COLORS.text.secondary,
                fontWeight: 500,
                fontSize: '0.875rem'
              }}>
                Showing <strong>{paginationData.startIndex + 1}-{Math.min(paginationData.endIndex, workerData.length)}</strong> of <strong>{workerData.length}</strong> workers
              </Typography>

              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  variant="outlined"
                  size="small"
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(null as any, currentPage - 1)}
                  sx={{
                    borderColor: COLORS.border,
                    color: COLORS.navy.main,
                    '&:hover': {
                      borderColor: COLORS.navy.main,
                      bgcolor: alpha(COLORS.navy.main, 0.04)
                    }
                  }}
                >
                  Previous
                </Button>
                
                <Pagination
                  count={paginationData.totalPages}
                  page={currentPage}
                  onChange={handlePageChange}
                  size="small"
                  sx={{
                    '& .MuiPaginationItem-root': {
                      fontWeight: 500,
                      color: COLORS.text.secondary,
                      '&.Mui-selected': {
                        bgcolor: COLORS.teal.main,
                        color: COLORS.background,
                        '&:hover': {
                          bgcolor: COLORS.teal.dark
                        }
                      },
                      '&:hover': {
                        bgcolor: alpha(COLORS.teal.main, 0.1)
                      }
                    }
                  }}
                />
                
                <Button
                  variant="outlined"
                  size="small"
                  disabled={currentPage === paginationData.totalPages}
                  onClick={() => handlePageChange(null as any, currentPage + 1)}
                  endIcon={<ArrowForward sx={{ fontSize: 16 }} />}
                  sx={{
                    borderColor: COLORS.border,
                    color: COLORS.navy.main,
                    '&:hover': {
                      borderColor: COLORS.navy.main,
                      bgcolor: alpha(COLORS.navy.main, 0.04)
                    }
                  }}
                >
                  Next
                </Button>
              </Stack>
            </Stack>
          </Box>
        )}
      </Card>
    </Box>
  );
};

export default WorkerPerformanceKPI;
