import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  Grid,
  Typography,
  LinearProgress,
  Chip,
  CircularProgress,
  Alert,
  alpha
} from '@mui/material';
import {
  Assignment,
  CheckCircle,
  Schedule,
  Warning,
  TrendingUp,
  TrendingDown,
  People,
  Speed,
  HourglassEmpty
} from '@mui/icons-material';
import { dataClient } from '../lib/supabase';

interface TeamLeaderKPICardsProps {
  teamLeaderId: string;
}

interface KPIMetrics {
  totalAssignments: number;
  completedAssignments: number;
  onTimeAssignments: number;
  overdueAssignments: number;
  pendingAssignments: number;
  activeWorkers: number;
  completionRate: number;
  onTimeRate: number;
  avgResponseTime: number;
  todayAssignments: number;
  todayCompleted: number;
}

// 🎨 Clean Corporate Design System - White + Navy + Teal
const COLORS = {
  background: '#FFFFFF',
  surface: '#F8FAFB',
  
  navy: {
    dark: '#0F2942',
    main: '#1E3A5F',
    light: '#E8EDF3'
  },
  
  teal: {
    main: '#14B8A6',
    dark: '#0D9488',
    light: '#99F6E4'
  },
  
  text: {
    primary: '#1F2937',
    secondary: '#6B7280',
    disabled: '#9CA3AF'
  },
  
  border: '#E5E7EB',
  divider: '#F3F4F6',
  
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6'
} as const;

const TeamLeaderKPICards: React.FC<TeamLeaderKPICardsProps> = ({ teamLeaderId }) => {
  const [metrics, setMetrics] = useState<KPIMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchKPIMetrics();
  }, [teamLeaderId]);

  const fetchKPIMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: assignments, error: fetchError } = await dataClient
        .from('work_readiness_assignments')
        .select('*, worker:users!work_readiness_assignments_worker_id_fkey(id, first_name, last_name, team_leader_id)')
        .eq('team_leader_id', teamLeaderId);

      if (fetchError) throw fetchError;

      const teamAssignments = assignments || [];

      const total = teamAssignments.length;
      const completed = teamAssignments.filter((a: any) => a.status === 'completed').length;
      const overdue = teamAssignments.filter((a: any) => a.status === 'overdue').length;
      const pending = teamAssignments.filter((a: any) => 
        a.status === 'pending' || 
        a.status === 'not_started' || 
        a.status === 'in_progress'
      ).length;

      const onTime = teamAssignments.filter((a: any) => {
        if (a.status !== 'completed' || !a.completed_at || !a.due_time) return false;
        const completedDate = new Date(a.completed_at);
        const dueTime = new Date(a.due_time);
        return completedDate <= dueTime;
      }).length;

      const uniqueWorkers = new Set(teamAssignments.map((a: any) => a.worker_id)).size;

      const completedWithTime = teamAssignments.filter((a: any) => 
        a.status === 'completed' && a.completed_at && a.assigned_date
      );
      
      const totalResponseTime = completedWithTime.reduce((sum: number, a: any) => {
        const assignedDate = new Date(a.assigned_date);
        const completedDate = new Date(a.completed_at);
        const hours = (completedDate.getTime() - assignedDate.getTime()) / (1000 * 60 * 60);
        return sum + hours;
      }, 0);
      
      const avgResponseTime = completedWithTime.length > 0 
        ? totalResponseTime / completedWithTime.length 
        : 0;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayAssignments = teamAssignments.filter((a: any) => {
        const assignedDate = new Date(a.assigned_date);
        assignedDate.setHours(0, 0, 0, 0);
        return assignedDate.getTime() === today.getTime();
      }).length;

      const todayCompleted = teamAssignments.filter((a: any) => {
        if (a.status !== 'completed' || !a.completed_at) return false;
        const completedDate = new Date(a.completed_at);
        completedDate.setHours(0, 0, 0, 0);
        return completedDate.getTime() === today.getTime();
      }).length;

      const completionRate = total > 0 ? (completed / total) * 100 : 0;
      const onTimeRate = completed > 0 ? (onTime / completed) * 100 : 0;

      setMetrics({
        totalAssignments: total,
        completedAssignments: completed,
        onTimeAssignments: onTime,
        overdueAssignments: overdue,
        pendingAssignments: pending,
        activeWorkers: uniqueWorkers,
        completionRate,
        onTimeRate,
        avgResponseTime,
        todayAssignments,
        todayCompleted
      });

    } catch (err: any) {
      console.error('Error fetching KPI metrics:', err);
      setError(err.message || 'Failed to load KPI metrics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <CircularProgress sx={{ color: COLORS.teal.main }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
    );
  }

  if (!metrics) {
    return null;
  }

  const cardStyle = {
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
  };

  return (
    <Box sx={{ mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: COLORS.navy.dark, mb: 0.5 }}>
          Team Performance Overview
        </Typography>
        <Typography variant="body2" sx={{ color: COLORS.text.secondary }}>
          Real-time metrics and key performance indicators
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Total Assignments */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={cardStyle}>
            <Box sx={{ 
              p: 2.5,
              borderTop: `3px solid ${COLORS.navy.main}`
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Box sx={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 2,
                  bgcolor: alpha(COLORS.navy.main, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Assignment sx={{ fontSize: 20, color: COLORS.navy.main }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: COLORS.navy.dark, fontSize: '1.75rem' }}>
                    {metrics.totalAssignments}
                  </Typography>
                </Box>
              </Box>
              <Typography variant="caption" sx={{ color: COLORS.text.secondary, fontSize: '0.75rem' }}>
                Total Assignments
              </Typography>
              <Typography variant="caption" sx={{ color: COLORS.navy.main, display: 'block', fontSize: '0.7rem', mt: 0.5 }}>
                {metrics.todayAssignments} assigned today
              </Typography>
            </Box>
          </Card>
        </Grid>

        {/* Completed Assignments */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={cardStyle}>
            <Box sx={{ 
              p: 2.5,
              borderTop: `3px solid ${COLORS.teal.main}`
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Box sx={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 2,
                  bgcolor: alpha(COLORS.teal.main, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <CheckCircle sx={{ fontSize: 20, color: COLORS.teal.main }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: COLORS.navy.dark, fontSize: '1.75rem' }}>
                    {metrics.completedAssignments}
                  </Typography>
                </Box>
              </Box>
              <Typography variant="caption" sx={{ color: COLORS.text.secondary, fontSize: '0.75rem' }}>
                Completed
              </Typography>
              <LinearProgress
                variant="determinate"
                value={metrics.completionRate}
                sx={{ 
                  mt: 1,
                  height: 4, 
                  borderRadius: 2,
                  bgcolor: COLORS.divider,
                  '& .MuiLinearProgress-bar': {
                    bgcolor: COLORS.teal.main,
                    borderRadius: 2
                  }
                }}
              />
              <Typography variant="caption" sx={{ color: COLORS.teal.main, display: 'block', fontSize: '0.7rem', mt: 0.5 }}>
                {metrics.completionRate.toFixed(1)}% completion rate
              </Typography>
            </Box>
          </Card>
        </Grid>

        {/* On-Time Performance */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={cardStyle}>
            <Box sx={{ 
              p: 2.5,
              borderTop: `3px solid ${COLORS.success}`
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Box sx={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 2,
                  bgcolor: alpha(COLORS.success, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Schedule sx={{ fontSize: 20, color: COLORS.success }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: COLORS.navy.dark, fontSize: '1.75rem' }}>
                    {metrics.onTimeAssignments}
                  </Typography>
                </Box>
              </Box>
              <Typography variant="caption" sx={{ color: COLORS.text.secondary, fontSize: '0.75rem' }}>
                On-Time Submissions
              </Typography>
              <LinearProgress
                variant="determinate"
                value={metrics.onTimeRate}
                sx={{ 
                  mt: 1,
                  height: 4, 
                  borderRadius: 2,
                  bgcolor: COLORS.divider,
                  '& .MuiLinearProgress-bar': {
                    bgcolor: COLORS.success,
                    borderRadius: 2
                  }
                }}
              />
              <Typography variant="caption" sx={{ color: COLORS.success, display: 'block', fontSize: '0.7rem', mt: 0.5 }}>
                {metrics.onTimeRate.toFixed(1)}% on-time rate
              </Typography>
            </Box>
          </Card>
        </Grid>

        {/* Overdue Assignments */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={cardStyle}>
            <Box sx={{ 
              p: 2.5,
              borderTop: `3px solid ${metrics.overdueAssignments > 0 ? COLORS.error : COLORS.warning}`
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Box sx={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 2,
                  bgcolor: alpha(metrics.overdueAssignments > 0 ? COLORS.error : COLORS.warning, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Warning sx={{ fontSize: 20, color: metrics.overdueAssignments > 0 ? COLORS.error : COLORS.warning }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: COLORS.navy.dark, fontSize: '1.75rem' }}>
                    {metrics.overdueAssignments}
                  </Typography>
                </Box>
              </Box>
              <Typography variant="caption" sx={{ color: COLORS.text.secondary, fontSize: '0.75rem' }}>
                Overdue Assignments
              </Typography>
              <Chip
                label={`${metrics.pendingAssignments} Pending`}
                size="small"
                sx={{
                  mt: 1,
                  bgcolor: alpha(COLORS.warning, 0.1),
                  color: COLORS.warning,
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  height: 22
                }}
              />
            </Box>
          </Card>
        </Grid>

        {/* Total Pending */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={cardStyle}>
            <Box sx={{ 
              p: 2.5,
              borderTop: `3px solid ${COLORS.warning}`
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Box sx={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 2,
                  bgcolor: alpha(COLORS.warning, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <HourglassEmpty sx={{ fontSize: 20, color: COLORS.warning }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: COLORS.navy.dark, fontSize: '1.75rem' }}>
                    {metrics.pendingAssignments}
                  </Typography>
                </Box>
              </Box>
              <Typography variant="caption" sx={{ color: COLORS.text.secondary, fontSize: '0.75rem' }}>
                Total Pending
              </Typography>
              <Typography variant="caption" sx={{ color: COLORS.warning, display: 'block', fontSize: '0.7rem', mt: 0.5 }}>
                {metrics.totalAssignments > 0 ? `${((metrics.pendingAssignments / metrics.totalAssignments) * 100).toFixed(1)}% of total` : 'No data'}
              </Typography>
            </Box>
          </Card>
        </Grid>

        {/* Avg Response Time */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={cardStyle}>
            <Box sx={{ 
              p: 2.5,
              borderTop: `3px solid ${COLORS.text.secondary}`
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Box sx={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 2,
                  bgcolor: alpha(COLORS.text.secondary, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Speed sx={{ fontSize: 20, color: COLORS.text.secondary }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: COLORS.navy.dark, fontSize: '1.75rem' }}>
                    {metrics.avgResponseTime.toFixed(1)}h
                  </Typography>
                </Box>
              </Box>
              <Typography variant="caption" sx={{ color: COLORS.text.secondary, fontSize: '0.75rem' }}>
                Avg Response Time
              </Typography>
              <Typography variant="caption" sx={{ 
                color: metrics.avgResponseTime < 12 ? COLORS.success : metrics.avgResponseTime < 24 ? COLORS.warning : COLORS.error, 
                display: 'block', 
                fontSize: '0.7rem', 
                mt: 0.5 
              }}>
                {metrics.avgResponseTime < 12 ? '⚡ Fast response' : metrics.avgResponseTime < 24 ? '⏱️ Standard' : '⚠️ Slow'}
              </Typography>
            </Box>
          </Card>
        </Grid>

        {/* Today's Activity */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={cardStyle}>
            <Box sx={{ 
              p: 2.5,
              borderTop: `3px solid ${metrics.todayCompleted >= metrics.todayAssignments ? COLORS.success : COLORS.warning}`
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Box sx={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 2,
                  bgcolor: alpha(metrics.todayCompleted >= metrics.todayAssignments ? COLORS.success : COLORS.warning, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {metrics.todayCompleted >= metrics.todayAssignments ? (
                    <TrendingUp sx={{ fontSize: 20, color: COLORS.success }} />
                  ) : (
                    <TrendingDown sx={{ fontSize: 20, color: COLORS.warning }} />
                  )}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: COLORS.navy.dark, fontSize: '1.75rem' }}>
                    {metrics.todayCompleted}/{metrics.todayAssignments}
                  </Typography>
                </Box>
              </Box>
              <Typography variant="caption" sx={{ color: COLORS.text.secondary, fontSize: '0.75rem' }}>
                Today's Progress
              </Typography>
              <LinearProgress
                variant="determinate"
                value={metrics.todayAssignments > 0 ? (metrics.todayCompleted / metrics.todayAssignments) * 100 : 0}
                sx={{ 
                  mt: 1,
                  height: 4, 
                  borderRadius: 2,
                  bgcolor: COLORS.divider,
                  '& .MuiLinearProgress-bar': {
                    bgcolor: metrics.todayCompleted >= metrics.todayAssignments ? COLORS.success : COLORS.warning,
                    borderRadius: 2
                  }
                }}
              />
              <Typography variant="caption" sx={{ 
                color: metrics.todayCompleted >= metrics.todayAssignments ? COLORS.success : COLORS.warning, 
                display: 'block', 
                fontSize: '0.7rem', 
                mt: 0.5 
              }}>
                {metrics.todayAssignments > 0 ? `${((metrics.todayCompleted / metrics.todayAssignments) * 100).toFixed(0)}% completed` : 'No assignments today'}
              </Typography>
            </Box>
          </Card>
        </Grid>

        {/* Overall Rate */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={cardStyle}>
            <Box sx={{ 
              p: 2.5,
              borderTop: `3px solid ${metrics.completionRate >= 90 ? COLORS.success : metrics.completionRate >= 70 ? COLORS.warning : COLORS.error}`
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Box sx={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 2,
                  bgcolor: alpha(metrics.completionRate >= 90 ? COLORS.success : metrics.completionRate >= 70 ? COLORS.warning : COLORS.error, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {metrics.completionRate >= 90 ? (
                    <CheckCircle sx={{ fontSize: 20, color: COLORS.success }} />
                  ) : (
                    <Warning sx={{ fontSize: 20, color: metrics.completionRate >= 70 ? COLORS.warning : COLORS.error }} />
                  )}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: COLORS.navy.dark, fontSize: '1.75rem' }}>
                    {metrics.completionRate.toFixed(0)}%
                  </Typography>
                </Box>
              </Box>
              <Typography variant="caption" sx={{ color: COLORS.text.secondary, fontSize: '0.75rem' }}>
                Overall Rate
              </Typography>
              <Chip
                label={
                  metrics.completionRate >= 90 ? 'Excellent' :
                  metrics.completionRate >= 70 ? 'Good' : 'Needs Attention'
                }
                size="small"
                sx={{
                  mt: 1,
                  bgcolor: alpha(metrics.completionRate >= 90 ? COLORS.success : metrics.completionRate >= 70 ? COLORS.warning : COLORS.error, 0.1),
                  color: metrics.completionRate >= 90 ? COLORS.success :
                         metrics.completionRate >= 70 ? COLORS.warning : COLORS.error,
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  height: 22
                }}
              />
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TeamLeaderKPICards;
