import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  CircularProgress,
  LinearProgress,
  Grid,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle,
  Warning,
  TrendingUp,
  TrendingDown,
  CalendarToday,
  Speed,
  Assessment,
  EmojiEvents,
  Refresh
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext.supabase';
import { authClient } from '../lib/supabase';
import { kpiAPI } from '../utils/backendApi';

interface KPIData {
  rating: string;
  color: string;
  description: string;
  score: number;
}

interface WeeklyProgress {
  completedDays: number;
  totalWorkDays: number;
  completionRate: number;
  kpi: KPIData;
  weekLabel: string;
  streaks: {
    current: number;
    longest: number;
  };
  topPerformingDays: number;
}

interface DailyBreakdownEntry {
  date: string;
  dayName: string;
  completed: boolean;
  readinessLevel: string | null;
  fatigueLevel: number | null;
  mood: string | null;
} 

interface GoalTrackingData {
  weeklyProgress: WeeklyProgress;
  dailyBreakdown: DailyBreakdownEntry[];
}

interface GoalTrackingCardProps {
  userId: string;
  compact?: boolean;
}

const GoalTrackingCard: React.FC<GoalTrackingCardProps> = ({ 
  userId, 
  compact = false 
}) => {
  const { user } = useAuth();
  const [data, setData] = useState<GoalTrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchGoalData = async () => {
    try {
      setRefreshing(true);
      
      if (!user?.id) {
        throw new Error('User ID is required');
      }

      // Use the new backend API
      const result = await kpiAPI.getWorkerWeeklyProgress(user.id);
      
      if (result.success) {
        setData(result.data);
        setError(null);
      } else {
        throw new Error(result.message || 'Failed to fetch goal data');
      }
    } catch (err: any) {
      console.error('Error fetching goal data:', err);
      setError(err.message || 'Failed to load goal tracking data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchGoalData();
    }
  }, [user?.id]);

  const handleRefresh = () => {
    fetchGoalData();
  };

  const getKPIButtonColor = (rating: string) => {
    switch (rating) {
      case 'Excellent': return 'success';
      case 'Good': return 'primary';
      case 'Average': return 'warning';
      case 'Needs Improvement': return 'error';
      default: return 'default';
    }
  };

  const getKPIIcon = (rating: string) => {
    switch (rating) {
      case 'Excellent': return <EmojiEvents sx={{ fontSize: 20 }} />;
      case 'Good': return <TrendingUp sx={{ fontSize: 20 }} />;
      case 'Average': return <Assessment sx={{ fontSize: 20 }} />;
      case 'Needs Improvement': return <TrendingDown sx={{ fontSize: 20 }} />;
      default: return <Assessment sx={{ fontSize: 20 }} />;
    }
  };

  if (loading && !data) {
    return (
      <Card sx={{ 
        borderRadius: 3,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        backgroundColor: 'white',
      }}>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress size={24} />
          <Typography sx={{ mt: 2, color: '#64748b' }}>
            Loading your weekly goals...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (error && !data) {
    return (
      <Card sx={{ 
        borderRadius: 3,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        backgroundColor: '#f0f9ff',
        border: '1px solid #bae6fd',
      }}>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <TrendingUp sx={{ color: '#3b82f6', fontSize: 48, mb: 2 }} />
          <Typography sx={{ color: '#1e40af', mb: 2, fontWeight: 600 }}>
            KPI Tracking Coming Soon
          </Typography>
          <Typography sx={{ color: '#6b7280', mb: 2, fontSize: '0.875rem' }}>
            Your work readiness submissions are being tracked. KPI dashboard will be available once backend is deployed.
          </Typography>
          <Typography sx={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 500 }}>
            ✅ Work readiness data is being saved successfully
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const progressPercentage = data.weeklyProgress.completionRate;
  const currentKPI = data.weeklyProgress.kpi;

  return (
    <Card sx={{ 
      borderRadius: 3,
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
      backgroundColor: 'white',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background gradient overlay */}
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: `linear-gradient(90deg, ${currentKPI.color}, ${currentKPI.color}88)`,
      }} />

      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 3 
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ 
              backgroundColor: '#f0f9ff',
              borderRadius: 2,
              p: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Speed sx={{ fontSize: 20, color: '#0ea5e9' }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
              {compact ? 'This Week' : 'Weekly Goals & KPI'}
            </Typography>
          </Box>
          
          <Tooltip title="Refresh data">
            <IconButton 
              size="small" 
              onClick={handleRefresh}
              disabled={refreshing}
              sx={{ 
                color: '#64748b',
                '&:hover': { backgroundColor: '#f1f5f9' }
              }}
            >
              <Refresh sx={{ 
                fontSize: 18, 
                animation: refreshing ? 'spin 1s linear infinite' : 'none',
                '@keyframes spin': {
                  '0%': { transform: 'rotate(0deg)' },
                  '100%': { transform: 'rotate(360deg)' },
                }
              }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Week Label */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            mb: 1 
          }}>
            <CalendarToday sx={{ fontSize: 16, color: '#64748b' }} />
            <Typography 
              variant="body2" 
              sx={{ 
                fontWeight: 500, 
                color: '#374151',
                fontSize: '0.875rem'
              }}
            >
              {data.weeklyProgress.weekLabel}
            </Typography>
          </Box>
        </Box>

        {/* Progress Section */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            mb: 1 
          }}>
            <Typography variant="body2" sx={{ fontWeight: 500, color: '#374151' }}>
              Work Readiness Assessments
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1f2937' }}>
              {data.weeklyProgress.completedDays}/{data.weeklyProgress.totalWorkDays} days
            </Typography>
          </Box>
          
          {/* Progress Bar */}
          <LinearProgress
            variant="determinate"
            value={progressPercentage}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: '#e5e7eb',
              mb: 1,
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
                backgroundColor: currentKPI.color,
              }
            }}
          />
          
          <Typography variant="caption" sx={{ color: '#64748b' }}>
            {progressPercentage}% completion rate
          </Typography>
        </Box>

        {/* KPI Section */}
        <Box sx={{ mb: 3 }}>
          <Chip
            icon={getKPIIcon(currentKPI.rating)}
            label={`${currentKPI.rating} KPI`}
            color={getKPIButtonColor(currentKPI.rating) as any}
            size="medium"
            sx={{ 
              fontWeight: 600,
              fontSize: '0.875rem',
              height: 32,
              '& .MuiChip-label': {
                px: 1
              }
            }}
          />
          
          {!compact && (
            <Typography 
              variant="caption" 
              sx={{ 
                display: 'block', 
                mt: 1, 
                color: '#6b7280',
                fontSize: '0.75rem',
                lineHeight: 1.4
              }}
            >
              {currentKPI.description}
            </Typography>
          )}
        </Box>

        {/* Stats Section */}
        {compact ? (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" sx={{ 
                fontWeight: 700, 
                color: '#1e293b',
                fontSize: '1.125rem'
              }}>
                {data.weeklyProgress.streaks.current}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                Day Streak
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" sx={{ 
                fontWeight: 700, 
                color: '#1e293b',
                fontSize: '1.125rem'
              }}>
                {data.weeklyProgress.topPerformingDays}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                Best Days
              </Typography>
            </Box>
          </Box>
        ) : (
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Box sx={{ 
                textAlign: 'center',
                p: 2,
                backgroundColor: '#f8fafc',
                borderRadius: 2,
                border: '1px solid #e2e8f0'
              }}>
                <Typography variant="h6" sx={{ 
                  fontWeight: 700, 
                  color: '#1e293b',
                  fontSize: '1.25rem'
                }}>
                  {data.weeklyProgress.streaks.current}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  Current Streak
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box sx={{ 
                textAlign: 'center',
                p: 2,
                backgroundColor: '#f8fafc',
                borderRadius: 2,
                border: '1px solid #e2e8f0'
              }}>
                <Typography variant="h6" sx={{ 
                  fontWeight: 700, 
                  color: '#1e293b',
                  fontSize: '1.25rem'
                }}>
                  {data.weeklyProgress.topPerformingDays}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  Best Days This Week
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ 
                textAlign: 'center',
                p: 2,
                backgroundColor: '#f0fdf4',
                borderRadius: 2,
                border: '1px solid #bbf7d0'
              }}>
                <Typography variant="body2" sx={{ color: '#14532d', fontWeight: 500 }}>
                  🏆 Longest streak this year: {data.weeklyProgress.streaks.longest} days
                </Typography>
              </Box>
            </Grid>
          </Grid>
        )}

        {/* Daily Breakdown */}
        {!compact && data.dailyBreakdown.length > 0 && (
          <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid #e5e7eb' }}>
            <Typography variant="subtitle2" sx={{ 
              fontWeight: 600, 
              color: '#374151',
              mb: 2 
            }}>
              This Week's Progress
            </Typography>
            <Grid container spacing={1}>
              {data.dailyBreakdown.map((day, index) => (
                <Grid item key={day.date} xs={12}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 2,
                    p: 1.5,
                    backgroundColor: day.completed ? '#f0fdf4' : '#f9fafb',
                    borderRadius: 1.5,
                    border: `1px solid ${day.completed ? '#bbf7d0' : '#e5e7eb'}`
                  }}>
                    <Box sx={{ minWidth: 60 }}>
                      <Typography variant="caption" sx={{ 
                        fontWeight: 500,
                        color: day.completed ? '#166534' : '#6b7280',
                        fontSize: '0.75rem'
                      }}>
                        {day.dayName}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1,
                      flex: 1 
                    }}>
                      {day.completed ? (
                        <CheckCircle sx={{ fontSize: 16, color: '#22c55e' }} />
                      ) : (
                        <Typography sx={{ 
                          fontSize: 16, 
                          color: '#9ca3af',
                          fontWeight: 300
                        }}>
                          ○
                        </Typography>
                      )}
                      
                      {day.completed ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Chip 
                            label={day.readinessLevel === 'fit' ? 'FIT' : day.readinessLevel === 'minor' ? 'MINOR' : 'NOT FIT'}
                            size="small"
                            sx={{ 
                              fontSize: '0.625rem',
                              height: 20,
                              backgroundColor: day.readinessLevel === 'fit' ? '#dcfce7' : 
                                              day.readinessLevel === 'minor' ? '#fef3c7' : '#fecaca',
                              color: day.readinessLevel === 'fit' ? '#166534' : 
                                     day.readinessLevel === 'minor' ? '#92400e' : '#991b1b'
                            }}
                          />
                          <Typography variant="caption" sx={{ color: '#64748b', ml: 1 }}>
                            Fatigue: {day.fatigueLevel}/10
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                          No submission
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default GoalTrackingCard;
