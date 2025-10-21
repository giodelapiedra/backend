import React from 'react';
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
  Chip,
  LinearProgress,
  Stack,
  Avatar,
  Grid,
  alpha
} from '@mui/material';
import {
  EmojiEvents,
  TrendingUp,
  CheckCircle,
  Warning,
  People,
  CalendarToday,
  Timeline,
  Star,
  Schedule
} from '@mui/icons-material';

interface ShiftData {
  date: string;
  shiftName: string;
  scheduled: number;
  ready: number;
  onTime: number;
  late: number;
  readiness: number;
  onTimeRate: number;
}

interface TeamKPI {
  teamName: string;
  monthlyKPI: number;
  qualityKPI: number;
  grade: string;
  gradeColor: string;
  consistency: number;
  latestShift: number;
  totalReady: number;
  totalOnTime: number;
  totalLate?: number;
  totalScheduled: number;
  onTimeRate: number;
  lateRate?: number;
  shifts: ShiftData[];
  remarks: string;
}

interface WorkReadinessKPIProps {
  assignments: any[];
  selectedMonth: string;
}

// 🎨 Clean Corporate Design System - White + Navy + Teal
const COLORS = {
  background: '#FFFFFF',
  surface: '#F8FAFB',
  
  navy: {
    dark: '#0F2942',
    main: '#1E3A5F',
    medium: '#2C5282',
    light: '#E8EDF3'
  },
  
  teal: {
    dark: '#0D9488',
    main: '#14B8A6',
    light: '#99F6E4',
    subtle: '#F0FDFA'
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

const WorkReadinessKPI: React.FC<WorkReadinessKPIProps> = ({ assignments, selectedMonth }) => {
  
  const calculateTeamKPI = (): TeamKPI[] => {
    console.log('📊 WorkReadinessKPI - Total assignments:', assignments.length);
    console.log('📊 Sample assignment:', assignments[0]);
    console.log('📅 Selected Month:', selectedMonth);
    
    const teamShiftsMap = new Map<string, Map<string, ShiftData>>();
    
    const [selectedYear, selectedMonthNum] = selectedMonth.split('-');
    const filterMonth = parseInt(selectedMonthNum) - 1;
    const filterYear = parseInt(selectedYear);
    
    assignments.forEach(assignment => {
      const assignedDate = new Date(assignment.assigned_date);
      if (assignedDate.getMonth() !== filterMonth || assignedDate.getFullYear() !== filterYear) {
        console.log(`⏭️ Skipping assignment from ${assignedDate.toISOString().split('T')[0]} (not in selected month ${selectedMonth})`);
        return;
      }
      
      const teamLeaderId = assignment.team_leader_id;
      const shiftDate = new Date(assignment.assigned_date).toISOString().split('T')[0];
      const shiftKey = shiftDate;
      
      if (!teamShiftsMap.has(teamLeaderId)) {
        teamShiftsMap.set(teamLeaderId, new Map());
      }
      
      const shiftsMap = teamShiftsMap.get(teamLeaderId)!;
      
      if (!shiftsMap.has(shiftKey)) {
        shiftsMap.set(shiftKey, {
          date: shiftDate,
          shiftName: `Shift ${shiftDate}`,
          scheduled: 0,
          ready: 0,
          onTime: 0,
          late: 0,
          readiness: 0,
          onTimeRate: 0
        });
      }
      
      const shift = shiftsMap.get(shiftKey)!;
      shift.scheduled++;
      
      const hasWorkReadiness = assignment.work_readiness || 
                              assignment.workReadiness || 
                              assignment.work_readiness_id;
      
      if (hasWorkReadiness) {
        shift.ready++;
        
        const status = assignment.status?.toLowerCase();
        if (status === 'completed') {
          shift.onTime++;
          console.log(`✅ On-Time: ${shiftDate} - Worker completed on time`);
        } else if (status === 'overdue') {
          shift.late++;
          console.log(`⚠️ Late: ${shiftDate} - Worker submitted but overdue`);
        } else {
          shift.onTime++;
          console.log(`✅ Ready: ${shiftDate} - Worker completed readiness (status: ${assignment.status})`);
        }
      } else {
        console.log(`❌ Not Ready: ${shiftDate} - Worker has no readiness data (status: ${assignment.status})`);
      }
      
      shift.readiness = shift.scheduled > 0 ? (shift.ready / shift.scheduled) * 100 : 0;
      shift.onTimeRate = shift.ready > 0 ? (shift.onTime / shift.ready) * 100 : 0;
    });
    
    console.log('📊 Team Shifts Map:', Array.from(teamShiftsMap.entries()).map(([id, shifts]) => ({
      teamId: id,
      shifts: Array.from(shifts.values())
    })));
    
    const teamKPIs: TeamKPI[] = [];
    
    teamShiftsMap.forEach((shiftsMap, teamLeaderId) => {
      const firstAssignment = assignments.find(a => a.team_leader_id === teamLeaderId);
      const teamName = firstAssignment 
        ? `${firstAssignment.team_leader?.first_name || ''} ${firstAssignment.team_leader?.last_name || ''}`.trim()
        : 'Unknown Team';
      
      const shifts = Array.from(shiftsMap.values());
      
      const totalReady = shifts.reduce((sum, s) => sum + s.ready, 0);
      const totalOnTime = shifts.reduce((sum, s) => sum + s.onTime, 0);
      const totalLate = shifts.reduce((sum, s) => sum + s.late, 0);
      const totalScheduled = shifts.reduce((sum, s) => sum + s.scheduled, 0);
      
      const completionRate = totalScheduled > 0 ? (totalReady / totalScheduled) * 100 : 0;
      const onTimeRate = totalScheduled > 0 ? (totalOnTime / totalScheduled) * 100 : 0;
      const lateRate = totalScheduled > 0 ? (totalLate / totalScheduled) * 100 : 0;
      const qualityScore = 70;
      
      const qualityKPI = (completionRate * 0.5) +
                        (onTimeRate * 0.25) +
                        (lateRate * 0.15) +
                        (qualityScore * 0.1);
      
      console.log(`📊 Team ${teamName}:`, {
        totalReady,
        totalOnTime,
        totalLate,
        totalScheduled,
        completionRate: `${completionRate.toFixed(2)}%`,
        onTimeRate: `${onTimeRate.toFixed(2)}%`,
        lateRate: `${lateRate.toFixed(2)}%`,
        qualityScore,
        qualityKPI: `${qualityKPI.toFixed(2)}%`,
        formula: `(${completionRate.toFixed(1)}% × 0.5) + (${onTimeRate.toFixed(1)}% × 0.25) + (${lateRate.toFixed(1)}% × 0.15) + (${qualityScore} × 0.1) = ${qualityKPI.toFixed(2)}`
      });
      
      const excellentShifts = shifts.filter(s => s.readiness >= 95).length;
      const activeShifts = shifts.length;
      const consistency = activeShifts > 0 ? (excellentShifts / activeShifts) * 100 : 0;
      
      const sortedShifts = [...shifts].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      const latestShift = sortedShifts[0]?.readiness || 0;
      
      let grade = '';
      let gradeColor = '';
      let remarks = '';
      
      if (qualityKPI >= 95) {
        grade = 'A';
        gradeColor = COLORS.success;
        remarks = 'Excellent performance';
      } else if (qualityKPI >= 90) {
        grade = 'B';
        gradeColor = COLORS.teal.main;
        remarks = 'Good performance';
      } else if (qualityKPI >= 80) {
        grade = 'C';
        gradeColor = COLORS.warning;
        remarks = 'Average performance';
      } else {
        grade = 'D';
        gradeColor = COLORS.error;
        remarks = 'Needs improvement';
      }
      
      if (onTimeRate < 80 && completionRate >= 90) {
        remarks += ' - Late submissions impacting quality';
      } else if (onTimeRate >= 95 && completionRate >= 90) {
        remarks = '🌟 Excellent timeliness and readiness';
      }
      
      if (sortedShifts.length >= 6) {
        const last3 = sortedShifts.slice(0, 3);
        const prev3 = sortedShifts.slice(3, 6);
        const recentAvg = last3.reduce((sum, s) => sum + s.readiness, 0) / 3;
        const previousAvg = prev3.reduce((sum, s) => sum + s.readiness, 0) / 3;
        
        if (recentAvg > previousAvg + 10) {
          remarks = '📈 Improving readiness - Strong upward trend';
        } else if (recentAvg > previousAvg + 5) {
          remarks = '📈 Improving readiness';
        } else if (recentAvg < previousAvg - 10) {
          remarks = '📉 Declining readiness - Attention needed';
        } else if (recentAvg < previousAvg - 5) {
          remarks = '📉 Declining readiness';
        } else if (Math.abs(recentAvg - previousAvg) < 3) {
          remarks = '📊 Stable readiness - Consistent performance';
        }
      } else if (sortedShifts.length >= 2) {
        const recentAvg = (sortedShifts[0].readiness + sortedShifts[1].readiness) / 2;
        const olderAvg = sortedShifts.slice(2).reduce((sum, s) => sum + s.readiness, 0) / 
                        Math.max(1, sortedShifts.length - 2);
        
        if (recentAvg > olderAvg + 5) {
          remarks = '📈 Improving readiness';
        } else if (recentAvg < olderAvg - 5) {
          remarks = '📉 Declining readiness';
        }
      }
      
      const criticalShifts = shifts.filter(s => s.readiness < 80).length;
      if (criticalShifts > 0 && completionRate >= 80) {
        remarks += ` (${criticalShifts} critical shift${criticalShifts > 1 ? 's' : ''})`;
      }
      
      teamKPIs.push({
        teamName,
        monthlyKPI: completionRate,
        qualityKPI,
        grade,
        gradeColor,
        consistency,
        latestShift,
        totalReady,
        totalOnTime,
        totalLate,
        totalScheduled,
        onTimeRate,
        lateRate,
        shifts: sortedShifts,
        remarks
      });
    });
    
    return teamKPIs.sort((a, b) => b.qualityKPI - a.qualityKPI);
  };
  
  const teamKPIs = calculateTeamKPI();
  const overallReady = teamKPIs.reduce((sum, t) => sum + t.totalReady, 0);
  const overallOnTime = teamKPIs.reduce((sum, t) => sum + t.totalOnTime, 0);
  const overallLate = teamKPIs.reduce((sum, t) => sum + t.totalLate || 0, 0);
  const overallScheduled = teamKPIs.reduce((sum, t) => sum + t.totalScheduled, 0);
  
  const overallCompletionRate = overallScheduled > 0 ? (overallReady / overallScheduled) * 100 : 0;
  const overallOnTimeRate = overallScheduled > 0 ? (overallOnTime / overallScheduled) * 100 : 0;
  const overallLateRate = overallScheduled > 0 ? (overallLate / overallScheduled) * 100 : 0;
  const overallQualityScore = 70;
  const overallQualityKPI = (overallCompletionRate * 0.5) + (overallOnTimeRate * 0.25) + (overallLateRate * 0.15) + (overallQualityScore * 0.1);
  
  return (
    <Box sx={{ bgcolor: COLORS.surface, minHeight: '100vh' }}>
      {/* 🎯 Clean Corporate Header */}
      <Box sx={{ mb: 4 }}>
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
            <Timeline sx={{ fontSize: 28, color: COLORS.navy.main }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ 
              fontWeight: 700, 
              color: COLORS.navy.dark,
              fontSize: '1.5rem',
              mb: 0.5
            }}>
              Team Work Readiness KPI
            </Typography>
            <Typography variant="body2" sx={{ 
              color: COLORS.text.secondary,
              fontSize: '0.875rem'
            }}>
              Shift-based readiness performance and quality metrics
            </Typography>
          </Box>
        </Stack>
      </Box>
      
      {/* 📊 Clean Corporate Summary Cards */}
      <Grid container spacing={3} mb={4}>
        {/* Quality KPI */}
        <Grid item xs={12} md={3}>
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
              borderTop: `3px solid ${overallQualityKPI >= 95 ? COLORS.success : overallQualityKPI >= 90 ? COLORS.teal.main : overallQualityKPI >= 80 ? COLORS.warning : COLORS.error}`
            }}>
              <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                <Box sx={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: 2,
                  bgcolor: alpha(overallQualityKPI >= 95 ? COLORS.success : overallQualityKPI >= 90 ? COLORS.teal.main : overallQualityKPI >= 80 ? COLORS.warning : COLORS.error, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <EmojiEvents sx={{ fontSize: 24, color: overallQualityKPI >= 95 ? COLORS.success : overallQualityKPI >= 90 ? COLORS.teal.main : overallQualityKPI >= 80 ? COLORS.warning : COLORS.error }} />
                </Box>
                <Chip 
                  label={overallQualityKPI >= 95 ? 'Excellent' : overallQualityKPI >= 90 ? 'Good' : overallQualityKPI >= 80 ? 'Average' : 'Needs Work'}
                  size="small"
                  sx={{ 
                    bgcolor: alpha(overallQualityKPI >= 95 ? COLORS.success : overallQualityKPI >= 90 ? COLORS.teal.main : overallQualityKPI >= 80 ? COLORS.warning : COLORS.error, 0.1),
                    color: overallQualityKPI >= 95 ? COLORS.success : overallQualityKPI >= 90 ? COLORS.teal.main : overallQualityKPI >= 80 ? COLORS.warning : COLORS.error,
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    height: 22
                  }}
                />
              </Stack>
              <Typography variant="h3" sx={{ 
                fontWeight: 700, 
                color: COLORS.navy.dark,
                my: 1.5,
                fontSize: '2rem'
              }}>
                {overallQualityKPI.toFixed(1)}%
              </Typography>
              <Typography variant="body2" sx={{ 
                color: COLORS.text.secondary,
                fontSize: '0.875rem',
                mb: 1.5
              }}>
                Quality KPI Score
              </Typography>
              <LinearProgress
                variant="determinate"
                value={overallQualityKPI}
                sx={{ 
                  height: 4, 
                  borderRadius: 2,
                  bgcolor: COLORS.divider,
                  '& .MuiLinearProgress-bar': {
                    bgcolor: overallQualityKPI >= 95 ? COLORS.success :
                            overallQualityKPI >= 90 ? COLORS.teal.main :
                            overallQualityKPI >= 80 ? COLORS.warning : COLORS.error,
                    borderRadius: 2
                  }
                }}
              />
            </Box>
          </Card>
        </Grid>

        {/* Workers Ready */}
        <Grid item xs={6} sm={6} md={2.25}>
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
              <Box sx={{ 
                width: 40, 
                height: 40, 
                borderRadius: 2,
                bgcolor: alpha(COLORS.teal.main, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 1.5
              }}>
                <CheckCircle sx={{ fontSize: 20, color: COLORS.teal.main }} />
              </Box>
              <Typography variant="h4" sx={{ 
                fontWeight: 700, 
                color: COLORS.navy.dark,
                mb: 0.5,
                fontSize: '1.75rem'
              }}>
                {overallReady}
              </Typography>
              <Typography variant="caption" sx={{ 
                color: COLORS.text.secondary,
                fontSize: '0.75rem'
              }}>
                Workers Ready
              </Typography>
            </Box>
          </Card>
        </Grid>

        {/* On-Time Rate */}
        <Grid item xs={6} sm={6} md={2.25}>
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
              <Box sx={{ 
                width: 40, 
                height: 40, 
                borderRadius: 2,
                bgcolor: alpha(COLORS.navy.main, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 1.5
              }}>
                <TrendingUp sx={{ fontSize: 20, color: COLORS.navy.main }} />
              </Box>
              <Typography variant="h4" sx={{ 
                fontWeight: 700, 
                color: COLORS.navy.dark,
                mb: 0.5,
                fontSize: '1.75rem'
              }}>
                {overallOnTimeRate.toFixed(0)}%
              </Typography>
              <Typography variant="caption" sx={{ 
                color: COLORS.text.secondary,
                fontSize: '0.75rem'
              }}>
                On-Time Rate
              </Typography>
            </Box>
          </Card>
        </Grid>

        {/* Total Teams */}
        <Grid item xs={6} sm={6} md={2.25}>
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
              <Box sx={{ 
                width: 40, 
                height: 40, 
                borderRadius: 2,
                bgcolor: alpha(COLORS.success, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 1.5
              }}>
                <People sx={{ fontSize: 20, color: COLORS.success }} />
              </Box>
              <Typography variant="h4" sx={{ 
                fontWeight: 700, 
                color: COLORS.navy.dark,
                mb: 0.5,
                fontSize: '1.75rem'
              }}>
                {teamKPIs.length}
              </Typography>
              <Typography variant="caption" sx={{ 
                color: COLORS.text.secondary,
                fontSize: '0.75rem'
              }}>
                Active Teams
              </Typography>
            </Box>
          </Card>
        </Grid>

        {/* Consistency */}
        <Grid item xs={6} sm={6} md={2.25}>
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
              borderTop: `3px solid ${COLORS.warning}`
            }}>
              <Box sx={{ 
                width: 40, 
                height: 40, 
                borderRadius: 2,
                bgcolor: alpha(COLORS.warning, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 1.5
              }}>
                <CalendarToday sx={{ fontSize: 20, color: COLORS.warning }} />
              </Box>
              <Typography variant="h4" sx={{ 
                fontWeight: 700, 
                color: COLORS.navy.dark,
                mb: 0.5,
                fontSize: '1.75rem'
              }}>
                {(teamKPIs.reduce((sum, t) => sum + t.consistency, 0) / Math.max(teamKPIs.length, 1)).toFixed(0)}%
              </Typography>
              <Typography variant="caption" sx={{ 
                color: COLORS.text.secondary,
                fontSize: '0.75rem'
              }}>
                Consistency
              </Typography>
            </Box>
          </Card>
        </Grid>
      </Grid>
      
      {/* 📋 Clean Corporate Team Table */}
      <Card sx={{
        bgcolor: COLORS.background,
        borderRadius: 2,
        border: `1px solid ${COLORS.border}`,
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        mb: 4
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
                  Team Leader
                </TableCell>
                <TableCell align="center" sx={{ 
                  fontWeight: 600, 
                  fontSize: '0.75rem', 
                  color: COLORS.navy.dark,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  py: 2
                }}>
                  Readiness
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
                  Quality KPI
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
                <TableCell align="center" sx={{ 
                  fontWeight: 600, 
                  fontSize: '0.75rem', 
                  color: COLORS.navy.dark,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  py: 2
                }}>
                  Consistency
                </TableCell>
                <TableCell align="center" sx={{ 
                  fontWeight: 600, 
                  fontSize: '0.75rem', 
                  color: COLORS.navy.dark,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  py: 2
                }}>
                  Latest
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
              {teamKPIs.map((team, index) => (
                <TableRow 
                  key={index}
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
                  <TableCell sx={{ py: 2, px: 3 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar sx={{ 
                        bgcolor: COLORS.navy.main,
                        width: 36,
                        height: 36,
                        fontSize: '0.875rem',
                        fontWeight: 600
                      }}>
                        {team.teamName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </Avatar>
                      <Typography variant="body2" sx={{ 
                        fontWeight: 600, 
                        color: COLORS.text.primary,
                        fontSize: '0.875rem'
                      }}>
                        {team.teamName}
                      </Typography>
                    </Stack>
                  </TableCell>
                  
                  <TableCell align="center" sx={{ py: 2 }}>
                    <Typography variant="body2" sx={{ 
                      fontWeight: 600, 
                      color: COLORS.text.primary,
                      fontSize: '0.875rem'
                    }}>
                      {team.monthlyKPI.toFixed(1)}%
                    </Typography>
                  </TableCell>
                  
                  <TableCell align="center" sx={{ py: 2 }}>
                    <Stack spacing={0.5} alignItems="center">
                      <Typography variant="body2" sx={{ 
                        fontWeight: 600, 
                        color: COLORS.text.primary,
                        fontSize: '0.875rem'
                      }}>
                        {team.onTimeRate.toFixed(0)}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={team.onTimeRate}
                        sx={{ 
                          width: 60, 
                          height: 4, 
                          borderRadius: 2,
                          bgcolor: COLORS.divider,
                          '& .MuiLinearProgress-bar': {
                            bgcolor: team.onTimeRate >= 90 ? COLORS.teal.main : 
                                    team.onTimeRate >= 75 ? COLORS.warning : COLORS.error,
                            borderRadius: 2
                          }
                        }}
                      />
                    </Stack>
                  </TableCell>
                  
                  <TableCell align="center" sx={{ py: 2 }}>
                    <Typography variant="h6" sx={{ 
                      fontWeight: 700, 
                      color: COLORS.navy.dark,
                      fontSize: '1rem'
                    }}>
                      {team.qualityKPI.toFixed(1)}%
                    </Typography>
                  </TableCell>
                  
                  <TableCell align="center" sx={{ py: 2 }}>
                    <Chip 
                      label={team.grade}
                      sx={{
                        bgcolor: alpha(team.gradeColor, 0.1),
                        color: team.gradeColor,
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        height: 28,
                        minWidth: 40,
                        border: `1px solid ${alpha(team.gradeColor, 0.3)}`
                      }}
                    />
                  </TableCell>
                  
                  <TableCell align="center" sx={{ py: 2 }}>
                    <Typography variant="body2" sx={{ 
                      fontWeight: 600, 
                      color: COLORS.text.primary,
                      fontSize: '0.875rem'
                    }}>
                      {team.consistency.toFixed(0)}%
                    </Typography>
                  </TableCell>
                  
                  <TableCell align="center" sx={{ py: 2 }}>
                    <Chip 
                      label={`${team.latestShift.toFixed(0)}%`}
                      size="small"
                      icon={team.latestShift >= 95 ? <Star sx={{ fontSize: 14 }} /> : team.latestShift < 80 ? <Warning sx={{ fontSize: 14 }} /> : undefined}
                      sx={{
                        bgcolor: team.latestShift >= 95 
                          ? alpha(COLORS.success, 0.1)
                          : team.latestShift >= 80 
                          ? alpha(COLORS.warning, 0.1)
                          : alpha(COLORS.error, 0.1),
                        color: team.latestShift >= 95 ? COLORS.success : 
                               team.latestShift >= 80 ? COLORS.warning : COLORS.error,
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        height: 24,
                        minWidth: 56
                      }}
                    />
                  </TableCell>
                  
                  <TableCell sx={{ py: 2, px: 3 }}>
                    <Typography variant="caption" sx={{ 
                      color: COLORS.text.secondary,
                      fontSize: '0.75rem'
                    }}>
                      {team.remarks}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
      
      {/* 💡 Clean Corporate Info Card */}
      <Card sx={{ 
        bgcolor: COLORS.background,
        borderRadius: 2,
        border: `1px solid ${COLORS.border}`,
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        p: 3
      }}>
        <Stack direction="row" spacing={2} alignItems="center" mb={3}>
          <Box sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            bgcolor: alpha(COLORS.teal.main, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Schedule sx={{ fontSize: 20, color: COLORS.teal.main }} />
          </Box>
          <Typography variant="h6" sx={{ 
            fontWeight: 600, 
            color: COLORS.navy.dark,
            fontSize: '1.125rem'
          }}>
            How KPI is Calculated
          </Typography>
        </Stack>
        <Stack spacing={1.5}>
          <Box sx={{ 
            p: 2, 
            bgcolor: COLORS.surface, 
            borderRadius: 2,
            border: `1px solid ${COLORS.divider}`
          }}>
            <Typography variant="body2" sx={{ 
              color: COLORS.text.primary,
              fontSize: '0.875rem'
            }}>
              <strong>Per-Shift Readiness:</strong> (Workers Ready ÷ Workers Scheduled) × 100
            </Typography>
          </Box>
          <Box sx={{ 
            p: 2, 
            bgcolor: COLORS.surface, 
            borderRadius: 2,
            border: `1px solid ${COLORS.divider}`
          }}>
            <Typography variant="body2" sx={{ 
              color: COLORS.text.primary,
              fontSize: '0.875rem'
            }}>
              <strong>Monthly Team KPI:</strong> (Σ All Ready ÷ Σ All Scheduled) × 100 <em>(Weighted Average)</em>
            </Typography>
          </Box>
          <Box sx={{ 
            p: 2, 
            bgcolor: COLORS.surface, 
            borderRadius: 2,
            border: `1px solid ${COLORS.divider}`
          }}>
            <Typography variant="body2" sx={{ 
              color: COLORS.text.primary,
              fontSize: '0.875rem'
            }}>
              <strong>Quality KPI Formula:</strong> (Completion × 0.5) + (On-Time × 0.25) + (Late × 0.15) + (Quality × 0.1)
            </Typography>
          </Box>
          <Box sx={{ 
            p: 2, 
            bgcolor: COLORS.surface, 
            borderRadius: 2,
            border: `1px solid ${COLORS.divider}`
          }}>
            <Typography variant="body2" sx={{ 
              color: COLORS.text.primary,
              fontSize: '0.875rem'
            }}>
              <strong>Grading Scale:</strong> A (≥95%) | B (90-94.99%) | C (80-89.99%) | D (&lt;80%)
            </Typography>
          </Box>
        </Stack>
      </Card>
    </Box>
  );
};

export default WorkReadinessKPI;
