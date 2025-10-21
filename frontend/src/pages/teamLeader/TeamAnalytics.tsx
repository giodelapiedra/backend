import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext.supabase';
import { SupabaseAPI } from '../../utils/supabaseApi';
import LoadingSpinner from '../../components/LoadingSpinner';
import Toast from '../../components/Toast';
import LayoutWithSidebar from '../../components/LayoutWithSidebar';
import { Box, Typography, Button } from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';
import { Line, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

// Type definitions
interface AnalyticsData {
  teamLeader: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    team: string;
    managedTeams: string[];
  };
  analytics: {
    totalTeamMembers: number;
    activeTeamMembers: number;
      workReadinessStats: {
        total: number;
        completed: number;
        pending: number;
        overdue: number;
        cancelled: number;
        completedPercentage: number;
        pendingPercentage: number;
        overduePercentage: number;
        cancelledPercentage: number;
      };
      todayWorkReadinessStats: {
        completed: number;
        total: number;
      };
    loginStats: {
      totalLogins: number;
      todayLogins: number;
      weeklyLogins: number;
      monthlyLogins: number;
      dailyBreakdown: Array<{
        date: string;
        count: number;
      }>;
    };
    complianceRate: number;
    activityRate: number;
  };
}

// Minimal white aesthetic color system - Clean & Professional
const COLORS = {
  primary: { main: '#0F172A', light: '#334155', dark: '#000000' },
  secondary: '#64748B',
  accent: '#3B82F6',
  success: { main: '#10B981', light: '#34D399', dark: '#059669' },
  warning: { main: '#F59E0B', light: '#FBBF24', dark: '#D97706' },
  purple: { main: '#8B5CF6', light: '#A78BFA', dark: '#7C3AED' },
  border: '#E2E8F0',
  bg: '#FFFFFF',
  bgSecondary: '#F8FAFC',
  hover: '#F1F5F9',
  error: { main: '#EF4444', light: '#F87171', dark: '#DC2626' },
  neutral: {
    white: '#FFFFFF',
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  }
};

const TeamAnalytics: React.FC = () => {
  const { user } = useAuth();
  
  // State variables
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [workReadinessLoading, setWorkReadinessLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Date filtering state - Simplified (only for modals)
  const [workReadinessDateRange, setWorkReadinessDateRange] = useState<'week' | 'month' | 'year' | 'custom'>('week');
  const [workReadinessStartDate, setWorkReadinessStartDate] = useState<Date>(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const [workReadinessEndDate, setWorkReadinessEndDate] = useState<Date>(new Date());
  const [loginDateRange, setLoginDateRange] = useState<'week' | 'month' | 'year' | 'custom'>('week');
  const [loginStartDate, setLoginStartDate] = useState<Date>(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const [loginEndDate, setLoginEndDate] = useState<Date>(new Date());
  
  // Modal states
  const [showChartModal, setShowChartModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Fetch analytics data on mount
  useEffect(() => {
    if (user?.id) {
      fetchAnalyticsData();
    }
  }, [user?.id]);

  // Fetch data when work readiness date range changes
  useEffect(() => {
    if (user?.id) {
      fetchWorkReadinessData();
    }
  }, [workReadinessDateRange, workReadinessStartDate, workReadinessEndDate, user?.id]);

  // Fetch data when login date range changes
  useEffect(() => {
    if (user?.id) {
      fetchLoginData();
    }
  }, [loginDateRange, loginStartDate, loginEndDate, user?.id]);

  const fetchLoginData = async () => {
    try {
      setLoginLoading(true);
      console.log('📊 Fetching login data with filters:', { 
        dateRange: loginDateRange, 
        startDate: loginStartDate, 
        endDate: loginEndDate,
        userId: user?.id 
      });
      
      if (!user?.id) {
        console.log('❌ No user ID available');
        return;
      }
      
      // Fetch login data with date filters
      const loginData = await SupabaseAPI.getLoginStats(
        user.id, 
        loginDateRange, 
        loginStartDate, 
        loginEndDate
      );
      
      // Update analytics data with filtered login stats
      if (loginData?.analytics?.loginStats && analyticsData) {
        setAnalyticsData(prev => ({
          ...prev!,
          analytics: {
            ...prev!.analytics,
            loginStats: loginData.analytics.loginStats
          }
        }));
      }
      
    } catch (err: any) {
      console.error('❌ Error fetching login data:', err);
      setToast({ message: 'Failed to fetch login data', type: 'error' });
    } finally {
      setLoginLoading(false);
    }
  };

  const fetchWorkReadinessData = async () => {
    try {
      setWorkReadinessLoading(true);
      console.log('📊 Fetching work readiness data with filters:', { 
        dateRange: workReadinessDateRange, 
        startDate: workReadinessStartDate, 
        endDate: workReadinessEndDate,
        userId: user?.id 
      });
      
      if (!user?.id) {
        console.log('❌ No user ID available');
        return;
      }
      
      // Fetch work readiness data with date filters
      const workReadinessData = await SupabaseAPI.getWorkReadinessStats(
        user.id, 
        workReadinessDateRange, 
        workReadinessStartDate, 
        workReadinessEndDate
      );
      
      // Update analytics data with filtered work readiness stats
      if (workReadinessData?.analytics?.workReadinessStats && analyticsData) {
        setAnalyticsData(prev => ({
          ...prev!,
          analytics: {
            ...prev!.analytics,
            workReadinessStats: workReadinessData.analytics.workReadinessStats
          }
        }));
      }
      
    } catch (err: any) {
      console.error('❌ Error fetching work readiness data:', err);
      setToast({ message: 'Failed to fetch work readiness data', type: 'error' });
    } finally {
      setWorkReadinessLoading(false);
    }
  };

  const fetchAnalyticsData = async (forceRefresh = false) => {
    try {
      console.log('📊 Fetching analytics data:', { forceRefresh, userId: user?.id });
      
      setLoading(true);
      
      if (!user?.id) {
        console.log('❌ No user ID available');
        return;
      }
      
      // Fetch analytics data from Supabase
      const result = await SupabaseAPI.getAnalyticsData(user.id);
      
      setAnalyticsData(result);
      setError(null);
      
    } catch (err: any) {
      console.error('❌ Error fetching analytics:', err);
      // Set empty analytics data instead of showing error
      setAnalyticsData({
        teamLeader: {
          id: user?.id || '',
          firstName: user?.firstName || '',
          lastName: user?.lastName || '',
          email: user?.email || '',
          team: user?.team || '',
          managedTeams: []
        },
        analytics: {
          totalTeamMembers: 0,
          activeTeamMembers: 0,
          workReadinessStats: {
            total: 0,
            completed: 0,
            pending: 0,
            overdue: 0,
            cancelled: 0,
            completedPercentage: 0,
            pendingPercentage: 0,
            overduePercentage: 0,
            cancelledPercentage: 0
          },
          todayWorkReadinessStats: {
            completed: 0,
            total: 0
          },
          loginStats: {
            totalLogins: 0,
            todayLogins: 0,
            weeklyLogins: 0,
            monthlyLogins: 0,
            dailyBreakdown: []
          },
          complianceRate: 0,
          activityRate: 0
        }
      });
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseToast = () => {
    setToast(null);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <LayoutWithSidebar>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </LayoutWithSidebar>
    );
  }

  return (
    <LayoutWithSidebar>
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.6;
            }
          }
        `}
      </style>
      <Box sx={{ 
        width: '100%',
        p: { xs: 2, sm: 2.5, md: 4 },
        background: COLORS.bgSecondary,
        minHeight: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}>
        {/* Clean Minimal Header */}
        <Box sx={{ 
          mb: 4,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          flexDirection: { xs: 'column', md: 'row' },
          gap: 3,
        }}>
          <Box>
            <Typography sx={{ 
              fontWeight: 700, 
              color: COLORS.primary,
              fontSize: { xs: '1.75rem', md: '2.25rem' },
              letterSpacing: '-0.03em',
              mb: 0.5,
            }}>
              Team Analytics
            </Typography>
            <Typography sx={{ 
              color: COLORS.secondary,
              fontSize: { xs: '0.875rem', md: '0.9375rem' },
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}>
              {analyticsData?.teamLeader?.team && (
                <>
                  <Box component="span" sx={{ 
                    width: 8, 
                    height: 8, 
                    borderRadius: '50%', 
                    background: COLORS.success,
                  }} />
                  {analyticsData.teamLeader.team}
                  {analyticsData.teamLeader.managedTeams && analyticsData.teamLeader.managedTeams.length > 1 && (
                    <Box component="span" sx={{ 
                      fontSize: '0.75rem',
                      color: COLORS.secondary,
                      background: COLORS.hover,
                      px: 1.5,
                      py: 0.5,
                      borderRadius: '12px',
                    }}>
                      +{analyticsData.teamLeader.managedTeams.length - 1} teams
                    </Box>
                  )}
                </>
              )}
            </Typography>
          </Box>
          
          <Button
            onClick={() => fetchAnalyticsData(true)}
            disabled={loading}
            sx={{
              background: COLORS.primary,
              color: COLORS.bg,
              px: 3,
              py: 1.25,
              borderRadius: '12px',
              fontSize: '0.875rem',
              fontWeight: '600',
              textTransform: 'none',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.1)',
              '&:hover': {
                background: COLORS.primary,
                opacity: 0.9,
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
              },
              '&:disabled': {
                background: COLORS.border,
                color: COLORS.secondary,
              }
            }}
          >
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </Button>
        </Box>

        {analyticsData && (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: { xs: 3, md: 3 },
            position: 'relative',
            zIndex: 1,
          }}>
            {/* Minimal White Cards */}
            <Box sx={{ 
              display: 'grid',
              gridTemplateColumns: { 
                xs: '1fr', 
                sm: 'repeat(2, 1fr)', 
                md: 'repeat(4, 1fr)' 
              },
              gap: 3,
              mb: 4
            }}>
              {/* Total Team Members Card */}
              <Box sx={{
                background: COLORS.bg,
                borderRadius: '16px',
                p: 3,
                border: `1px solid ${COLORS.border}`,
                transition: 'all 0.2s ease',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  borderColor: COLORS.accent,
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.08)',
                  '& .card-icon': {
                    transform: 'scale(1.1)',
                    opacity: 0.8,
                  }
                }
              }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ 
                      fontSize: '0.8125rem', 
                      fontWeight: '600', 
                      color: COLORS.secondary, 
                      mb: 2,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      Total Members
                    </Typography>
                    <Typography sx={{ 
                      fontSize: '2.5rem', 
                      fontWeight: '700', 
                      color: COLORS.primary.main,
                      lineHeight: 1,
                      letterSpacing: '-0.02em',
                    }}>
                      {analyticsData.analytics.totalTeamMembers}
                    </Typography>
                  </Box>
                  <Box className="card-icon" sx={{ 
                    transition: 'all 0.3s ease',
                    opacity: 0.6,
                  }}>
                    <svg width="48" height="48" fill="none" stroke={COLORS.accent} strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </Box>
                </Box>
              </Box>

              {/* Active Members Card */}
              <Box sx={{
                background: COLORS.bg,
                borderRadius: '16px',
                p: 3,
                border: `1px solid ${COLORS.border}`,
                transition: 'all 0.2s ease',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  borderColor: COLORS.success.main,
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.08)',
                  '& .card-icon': {
                    transform: 'scale(1.1)',
                    opacity: 0.8,
                  }
                }
              }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ 
                      fontSize: '0.8125rem', 
                      fontWeight: '600', 
                      color: COLORS.secondary, 
                      mb: 2,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      Active Members
                    </Typography>
                    <Typography sx={{ 
                      fontSize: '2.5rem', 
                      fontWeight: '700', 
                      color: COLORS.primary.main,
                      lineHeight: 1,
                      letterSpacing: '-0.02em',
                      mb: 1,
                    }}>
                      {analyticsData.analytics.activeTeamMembers}
                    </Typography>
                    <Typography sx={{ 
                      fontSize: '0.75rem', 
                      color: COLORS.success.main,
                      fontWeight: '500',
                    }}>
                      {analyticsData.analytics.totalTeamMembers > 0 
                        ? `${Math.round((analyticsData.analytics.activeTeamMembers / analyticsData.analytics.totalTeamMembers) * 100)}%`
                        : '0%'} of total
                    </Typography>
                  </Box>
                  <Box className="card-icon" sx={{ 
                    transition: 'all 0.3s ease',
                    opacity: 0.6,
                  }}>
                    <svg width="48" height="48" fill="none" stroke={COLORS.success.main} strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </Box>
                </Box>
              </Box>

              {/* Assessments Card */}
              <Box sx={{
                background: COLORS.bg,
                borderRadius: '16px',
                p: 3,
                border: `1px solid ${COLORS.border}`,
                transition: 'all 0.2s ease',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  borderColor: COLORS.purple.main,
                  boxShadow: '0 4px 12px rgba(139, 92, 246, 0.08)',
                  '& .card-icon': {
                    transform: 'scale(1.1)',
                    opacity: 0.8,
                  }
                }
              }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ 
                      fontSize: '0.8125rem', 
                      fontWeight: '600', 
                      color: COLORS.secondary, 
                      mb: 2,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      Completed
                    </Typography>
                    <Typography sx={{ 
                      fontSize: '2.5rem', 
                      fontWeight: '700', 
                      color: COLORS.primary.main,
                      lineHeight: 1,
                      letterSpacing: '-0.02em',
                      mb: 1,
                    }}>
                      {analyticsData.analytics.workReadinessStats.completed}
                    </Typography>
                    <Typography sx={{ 
                      fontSize: '0.75rem', 
                      color: COLORS.secondary,
                      fontWeight: '500',
                    }}>
                      of {analyticsData.analytics.workReadinessStats.total} total
                    </Typography>
                  </Box>
                  <Box className="card-icon" sx={{ 
                    transition: 'all 0.3s ease',
                    opacity: 0.6,
                  }}>
                    <svg width="48" height="48" fill="none" stroke={COLORS.purple.main} strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </Box>
                </Box>
              </Box>

              {/* Compliance Card */}
              <Box sx={{
                background: COLORS.bg,
                borderRadius: '16px',
                p: 3,
                border: `1px solid ${COLORS.border}`,
                transition: 'all 0.2s ease',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  borderColor: analyticsData.analytics.complianceRate >= 80 ? COLORS.success.main : COLORS.warning.main,
                  boxShadow: analyticsData.analytics.complianceRate >= 80 
                    ? '0 4px 12px rgba(16, 185, 129, 0.08)'
                    : '0 4px 12px rgba(245, 158, 11, 0.08)',
                  '& .card-icon': {
                    transform: 'scale(1.1)',
                    opacity: 0.8,
                  }
                }
              }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ 
                      fontSize: '0.8125rem', 
                      fontWeight: '600', 
                      color: COLORS.secondary, 
                      mb: 2,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      Compliance
                    </Typography>
                    <Typography sx={{ 
                      fontSize: '2.5rem', 
                      fontWeight: '700', 
                      color: COLORS.primary.main,
                      lineHeight: 1,
                      letterSpacing: '-0.02em',
                      mb: 1,
                    }}>
                      {analyticsData.analytics.complianceRate}%
                    </Typography>
                    <Typography sx={{ 
                      fontSize: '0.75rem', 
                      color: analyticsData.analytics.complianceRate >= 80 ? COLORS.success.main : COLORS.warning.main,
                      fontWeight: '500',
                    }}>
                      {analyticsData.analytics.complianceRate >= 80 ? 'Excellent' : 'Needs attention'}
                    </Typography>
                  </Box>
                  <Box className="card-icon" sx={{ 
                    transition: 'all 0.3s ease',
                    opacity: 0.6,
                  }}>
                    <svg width="48" height="48" fill="none" stroke={analyticsData.analytics.complianceRate >= 80 ? COLORS.success.main : COLORS.warning.main} strokeWidth="1.5" viewBox="0 0 24 24">
                      {analyticsData.analytics.complianceRate >= 80 ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      )}
                    </svg>
                  </Box>
                </Box>
              </Box>
            </Box>


            {/* Charts Section - Improved Grid Layout */}
            <Box sx={{ 
              display: 'grid',
              gridTemplateColumns: { 
                xs: '1fr', 
                md: 'repeat(2, 1fr)' 
              },
              gap: { xs: 2.5, md: 3 },
              mb: 3,
            }}>
              {/* Work Readiness Distribution Pie Chart */}
              <Box 
                sx={{
                  backgroundColor: COLORS.neutral.white,
                  borderRadius: '16px',
                  padding: { xs: '20px', md: '24px' },
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  border: `1px solid ${COLORS.neutral[200]}`,
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 24px -8px rgba(0,0,0,0.15)',
                    borderColor: COLORS.primary.light,
                  }
                }}
                onClick={() => setShowChartModal(true)}
              >
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}>
                  <Typography sx={{ 
                    fontSize: { xs: '1.0625rem', md: '1.125rem' }, 
                    fontWeight: '700', 
                    color: COLORS.neutral[900],
                    letterSpacing: '-0.01em',
                  }}>
                    Work Readiness Distribution
                  </Typography>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowChartModal(true);
                    }}
                    sx={{
                      padding: '8px 14px',
                      backgroundColor: COLORS.neutral[100],
                      border: `1px solid ${COLORS.neutral[200]}`,
                      borderRadius: '10px',
                      color: COLORS.neutral[600],
                      fontSize: '0.8125rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.75,
                      transition: 'all 0.2s ease',
                      textTransform: 'none',
                      minWidth: 'auto',
                      '&:hover': {
                        backgroundColor: COLORS.neutral[200],
                        borderColor: COLORS.neutral[300],
                        color: COLORS.neutral[800],
                      },
                    }}
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                    <span>Expand</span>
                  </Button>
                </Box>
                <Box sx={{ 
                  display: 'flex',
                  gap: 2,
                  justifyContent: 'center',
                  mb: 2,
                  flexWrap: 'wrap',
                }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: '600', color: COLORS.neutral[500], mb: 0.25 }}>
                      Total
                    </Typography>
                    <Typography sx={{ fontSize: '1.25rem', fontWeight: '700', color: COLORS.neutral[900] }}>
                      {analyticsData.analytics.workReadinessStats.total || 0}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: '600', color: COLORS.success.main, mb: 0.25 }}>
                      Completed
                    </Typography>
                    <Typography sx={{ fontSize: '1.25rem', fontWeight: '700', color: COLORS.success.main }}>
                      {analyticsData.analytics.workReadinessStats.completed || 0}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: '600', color: COLORS.warning.main, mb: 0.25 }}>
                      Pending
                    </Typography>
                    <Typography sx={{ fontSize: '1.25rem', fontWeight: '700', color: COLORS.warning.main }}>
                      {analyticsData.analytics.workReadinessStats.pending || 0}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: '600', color: COLORS.error.main, mb: 0.25 }}>
                      Overdue
                    </Typography>
                    <Typography sx={{ fontSize: '1.25rem', fontWeight: '700', color: COLORS.error.main }}>
                      {analyticsData.analytics.workReadinessStats.overdue || 0}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ height: { xs: '240px', md: '300px' }, position: 'relative' }}>
                    {(() => {
                      const completed = analyticsData.analytics.workReadinessStats.completed || 0;
                      const pending = analyticsData.analytics.workReadinessStats.pending || 0;
                      const overdue = analyticsData.analytics.workReadinessStats.overdue || 0;
                      
                      const total = completed + pending + overdue;
                      
                      // If no data, show empty state
                      if (total === 0) {
                        return (
                          <Box sx={{
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: COLORS.neutral[500]
                          }}>
                            <Box sx={{
                              width: '100px',
                              height: '100px',
                              borderRadius: '50%',
                              backgroundColor: COLORS.neutral[100],
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              mb: 2,
                            }}>
                              <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                            </Box>
                            <Typography sx={{ fontSize: '0.875rem', fontWeight: '600', textAlign: 'center' }}>
                              No assignments for selected period
                            </Typography>
                          </Box>
                        );
                      }
                      
                      return (
                        <Pie
                          data={{
                            labels: ['Completed', 'Pending', 'Overdue'],
                            datasets: [{
                              data: [completed, pending, overdue],
                              backgroundColor: [
                                COLORS.success.main,
                                COLORS.warning.main,
                                COLORS.error.main
                              ],
                              borderColor: [
                                COLORS.success.dark,
                                COLORS.warning.dark,
                                COLORS.error.dark
                              ],
                              borderWidth: 2,
                              hoverOffset: 8
                            }]
                          }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom',
                            labels: {
                              padding: 20,
                              font: {
                                size: 12,
                                weight: 500
                              },
                              usePointStyle: true,
                              pointStyle: 'circle'
                            }
                          },
                          tooltip: {
                            callbacks: {
                              label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                                const percentage = ((value as number / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                              }
                            }
                          }
                        },
                        animation: {
                          animateScale: true,
                          animateRotate: true
                        }
                      }}
                    />
                  );
                })()}
                </Box>
              </Box>

              {/* Login Activity Line Chart */}
              <div 
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: window.innerWidth <= 768 ? '1rem' : '1rem',
                  padding: window.innerWidth <= 768 ? '1.5rem' : '2rem',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  width: window.innerWidth <= 768 ? '100%' : 'auto',
                  flex: window.innerWidth <= 768 ? 'none' : '1'
                }}
                onClick={() => setShowLoginModal(true)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 8px 12px -1px rgba(0, 0, 0, 0.15), 0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: window.innerWidth <= 768 ? '0.75rem' : '1.5rem'
                }}>
                  <h3 style={{ 
                    fontSize: window.innerWidth <= 768 ? '1rem' : '1.25rem', 
                    fontWeight: '600', 
                    color: '#1f2937',
                    margin: 0
                  }}>
                    Login Activity Trends
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowLoginModal(true)}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#f3f4f6',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      color: '#6b7280',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                      position: 'relative',
                      zIndex: 10
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#e5e7eb';
                      e.currentTarget.style.borderColor = '#9ca3af';
                      e.currentTarget.style.color = '#374151';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#f3f4f6';
                      e.currentTarget.style.borderColor = '#d1d5db';
                      e.currentTarget.style.color = '#6b7280';
                    }}
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                    <span>Expand</span>
                  </button>
                </div>
                <div style={{ height: window.innerWidth <= 768 ? '200px' : '300px', position: 'relative' }}>
                  {(() => {
                    const todayLogins = analyticsData.analytics.loginStats.todayLogins || 0;
                    const weeklyLogins = analyticsData.analytics.loginStats.weeklyLogins || 0;
                    const monthlyLogins = analyticsData.analytics.loginStats.monthlyLogins || 0;
                    const totalLogins = analyticsData.analytics.loginStats.totalLogins || 0;
                    const dailyBreakdown = analyticsData.analytics.loginStats.dailyBreakdown || [];
                    
                    // Use totalLogins or check if dailyBreakdown has any data
                    const hasData = totalLogins > 0 || dailyBreakdown.some(day => day.count > 0);
                    
                    // If no data for selected date range, show empty state
                    if (!hasData) {
                      return (
                        <div style={{
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#6b7280'
                        }}>
                          <div style={{
                            width: '150px',
                            height: '150px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(107, 114, 128, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '1rem'
                          }}>
                            <svg width="60" height="60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          </div>
                          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                            No Login Data Available
                          </h3>
                          <p style={{ fontSize: '0.875rem', textAlign: 'center' }}>
                            No login activity found for the selected date range.
                          </p>
                        </div>
                      );
                    }
                    
                    return (
                      <Line
                        data={{
                          labels: dailyBreakdown.length > 0 
                            ? dailyBreakdown.map(item => new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
                            : ['No Data'],
                          datasets: [{
                            label: 'Daily Login Count',
                            data: dailyBreakdown.length > 0
                              ? dailyBreakdown.map(item => item.count)
                              : [0],
                            borderColor: 'rgba(147, 51, 234, 1)',
                            backgroundColor: 'rgba(147, 51, 234, 0.15)',
                            fill: true,
                            tension: 0.4,
                            pointBackgroundColor: 'rgba(147, 51, 234, 1)',
                            pointBorderColor: '#ffffff',
                            pointBorderWidth: 3,
                            pointRadius: 8,
                            pointHoverRadius: 10,
                            pointHoverBackgroundColor: 'rgba(147, 51, 234, 1)',
                            pointHoverBorderColor: '#ffffff',
                            pointHoverBorderWidth: 4
                          }]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          animation: {
                            duration: 1000,
                            easing: 'easeInOutQuart'
                          },
                          plugins: {
                            legend: {
                              position: 'top',
                              labels: {
                                font: {
                                  size: 12,
                                  weight: 500
                                }
                              }
                            }
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              ticks: {
                                stepSize: 1
                              },
                              grid: {
                                color: 'rgba(0, 0, 0, 0.1)'
                              }
                            },
                            x: {
                              grid: {
                                color: 'rgba(0, 0, 0, 0.1)'
                              }
                            }
                          },
                          interaction: {
                            intersect: false,
                            mode: 'index'
                          }
                        }}
                      />
                    );
                  })()}
                </div>
              </div>
            </Box>



            {/* Additional Analytics Cards */}
            <div style={{ 
              display: 'flex',
              flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
              flexWrap: window.innerWidth <= 768 ? 'nowrap' : 'wrap',
              gap: window.innerWidth <= 768 ? '2rem' : '1.5rem',
              marginBottom: window.innerWidth <= 768 ? '2rem' : '2rem'
            }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.25)',
                backdropFilter: 'blur(20px)',
                borderRadius: window.innerWidth <= 768 ? '1rem' : '1rem',
                padding: window.innerWidth <= 768 ? '1.5rem' : '1.5rem',
                width: window.innerWidth <= 768 ? '100%' : 'auto',
                flex: window.innerWidth <= 768 ? 'none' : '1',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ 
                    width: window.innerWidth <= 768 ? '2rem' : '3rem', 
                    height: window.innerWidth <= 768 ? '2rem' : '3rem', 
                    backgroundColor: 'rgba(59, 130, 246, 0.15)', 
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    boxShadow: '0 4px 16px 0 rgba(59, 130, 246, 0.2)', 
                    borderRadius: '0.75rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    marginRight: '1rem'
                  }}>
                    <svg width="24" height="24" fill="none" stroke="#3b82f6" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6b7280', margin: '0 0 0.25rem 0' }}>
                      Today's Logins
                    </p>
                    <p style={{ fontSize: '1.875rem', fontWeight: '600', color: '#1f2937', margin: '0' }}>
                      {analyticsData.analytics.loginStats.todayLogins}
                    </p>
                  </div>
                  </div>
                </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.25)',
                backdropFilter: 'blur(20px)',
                borderRadius: window.innerWidth <= 768 ? '1rem' : '1rem',
                padding: window.innerWidth <= 768 ? '1.5rem' : '1.5rem',
                width: window.innerWidth <= 768 ? '100%' : 'auto',
                flex: window.innerWidth <= 768 ? 'none' : '1',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ 
                    width: window.innerWidth <= 768 ? '2rem' : '3rem', 
                    height: window.innerWidth <= 768 ? '2rem' : '3rem', 
                    backgroundColor: 'rgba(34, 197, 94, 0.15)', 
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                    boxShadow: '0 4px 16px 0 rgba(34, 197, 94, 0.2)', 
                    borderRadius: '0.75rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    marginRight: '1rem'
                  }}>
                    <svg width="24" height="24" fill="none" stroke="#22c55e" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6b7280', margin: '0 0 0.25rem 0' }}>
                      Activity Rate
                    </p>
                    <p style={{ fontSize: '1.875rem', fontWeight: '600', color: '#1f2937', margin: '0' }}>
                      {analyticsData.analytics.activityRate}%
                    </p>
                  </div>
              </div>
            </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.25)',
                backdropFilter: 'blur(20px)',
                borderRadius: window.innerWidth <= 768 ? '1rem' : '1rem',
                padding: window.innerWidth <= 768 ? '1.5rem' : '1.5rem',
                width: window.innerWidth <= 768 ? '100%' : 'auto',
                flex: window.innerWidth <= 768 ? 'none' : '1',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ 
                    width: window.innerWidth <= 768 ? '2rem' : '3rem', 
                    height: window.innerWidth <= 768 ? '2rem' : '3rem', 
                    backgroundColor: 'rgba(147, 51, 234, 0.15)', 
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(147, 51, 234, 0.2)',
                    boxShadow: '0 4px 16px 0 rgba(147, 51, 234, 0.2)', 
                    borderRadius: '0.75rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    marginRight: '1rem'
                  }}>
                    <svg width="24" height="24" fill="none" stroke="#9333ea" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
              </div>
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#6b7280', margin: '0 0 0.25rem 0' }}>
                      Pending Assessments
                    </p>
                    <p style={{ fontSize: '1.875rem', fontWeight: '600', color: '#1f2937', margin: '0' }}>
                      {analyticsData.analytics.workReadinessStats.pending}
                    </p>
                    <p style={{ fontSize: '0.75rem', fontWeight: '500', color: '#f59e0b', margin: '0.25rem 0 0 0' }}>
                      {analyticsData.analytics.workReadinessStats.pendingPercentage}% of team
                    </p>
                  </div>
                </div>
              </div>
            </div>


            {/* Work Readiness Progress Chart - Full Width */}
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)',
                borderRadius: window.innerWidth <= 768 ? '1rem' : '1rem',
                padding: window.innerWidth <= 768 ? '1.5rem' : '1.5rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              height: 'fit-content',
              marginBottom: window.innerWidth <= 768 ? '3rem' : '2rem'
              }}>
                <h3 style={{ 
                  fontSize: window.innerWidth <= 768 ? '1rem' : '1.25rem', 
                  fontWeight: '600', 
                  color: '#1f2937',
                  margin: '0 0 1.5rem 0'
                }}>
                  Work Readiness Progress
                </h3>
                
                {/* Progress Bars */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '0.75rem'
                    }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1f2937' }}>
                        Completed Assessments
                      </span>
                      <span style={{ fontSize: '0.875rem', fontWeight: '700', color: '#22c55e' }}>
                        {analyticsData.analytics.todayWorkReadinessStats.completed} / {analyticsData.analytics.todayWorkReadinessStats.total}
                      </span>
                    </div>
                    <div style={{ 
                      width: '100%', 
                      backgroundColor: 'rgba(229, 231, 235, 0.5)', 
                      borderRadius: '9999px', 
                      height: '16px',
                      overflow: 'hidden'
                    }}>
                      <div style={{ 
                        backgroundColor: '#22c55e', 
                        height: '100%', 
                        borderRadius: '9999px',
                        width: `${analyticsData.analytics.todayWorkReadinessStats.total > 0 ? 
                          (analyticsData.analytics.todayWorkReadinessStats.completed / analyticsData.analytics.todayWorkReadinessStats.total) * 100 : 0}%`,
                        transition: 'width 0.5s ease'
                      }}></div>
                    </div>
                  </div>

                  <div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '0.75rem'
                    }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1f2937' }}>
                        Pending Assessments
                      </span>
                      <span style={{ fontSize: '0.875rem', fontWeight: '700', color: '#f59e0b' }}>
                        {analyticsData.analytics.workReadinessStats.pending} ({analyticsData.analytics.workReadinessStats.pendingPercentage}%)
                      </span>
                    </div>
                    <div style={{ 
                      width: '100%', 
                      backgroundColor: 'rgba(229, 231, 235, 0.5)', 
                      borderRadius: '9999px', 
                      height: '16px',
                      overflow: 'hidden'
                    }}>
                      <div style={{ 
                        backgroundColor: '#f59e0b', 
                        height: '100%', 
                        borderRadius: '9999px',
                        width: `${analyticsData.analytics.workReadinessStats.total > 0 ? 
                          (analyticsData.analytics.workReadinessStats.pending / analyticsData.analytics.workReadinessStats.total) * 100 : 0}%`,
                        transition: 'width 0.5s ease'
                      }}></div>
                    </div>
                  </div>

                  <div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '0.75rem'
                    }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1f2937' }}>
                        Overall Completion Rate
                      </span>
                      <span style={{ fontSize: '0.875rem', fontWeight: '700', color: '#3b82f6' }}>
                        {analyticsData.analytics.workReadinessStats.total > 0 ? 
                          Math.round((analyticsData.analytics.workReadinessStats.completed / analyticsData.analytics.workReadinessStats.total) * 100) : 0}%
                      </span>
                    </div>
                    <div style={{ 
                      width: '100%', 
                      backgroundColor: 'rgba(229, 231, 235, 0.5)', 
                      borderRadius: '9999px', 
                      height: '16px',
                      overflow: 'hidden'
                    }}>
                      <div style={{ 
                        backgroundColor: '#3b82f6', 
                        height: '100%', 
                        borderRadius: '9999px',
                        width: `${analyticsData.analytics.workReadinessStats.total > 0 ? 
                          (analyticsData.analytics.workReadinessStats.completed / analyticsData.analytics.workReadinessStats.total) * 100 : 0}%`,
                        transition: 'width 0.5s ease'
                      }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Login Activity Chart - Full Width */}
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
              borderRadius: window.innerWidth <= 768 ? '1rem' : '1rem',
              padding: window.innerWidth <= 768 ? '1.5rem' : '2rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <h3 style={{ 
                fontSize: window.innerWidth <= 768 ? '1.25rem' : '1.5rem', 
                fontWeight: '600', 
                color: '#1f2937',
                margin: '0 0 2rem 0'
              }}>
                Login Activity Overview
              </h3>
              
              <div style={{ 
                display: 'flex',
                flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                flexWrap: window.innerWidth <= 768 ? 'nowrap' : 'wrap',
                gap: window.innerWidth <= 768 ? '2rem' : '1.5rem'
              }}>
                <div style={{
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  borderRadius: window.innerWidth <= 768 ? '1rem' : '1rem',
                  padding: window.innerWidth <= 768 ? '1.5rem' : '2rem',
                  textAlign: 'center',
                  border: '2px solid rgba(59, 130, 246, 0.2)',
                  width: window.innerWidth <= 768 ? '100%' : 'auto',
                  flex: window.innerWidth <= 768 ? 'none' : '1'
                }}>
                  <div style={{ fontSize: '3rem', fontWeight: '700', color: '#3b82f6', marginBottom: '1rem' }}>
                    {analyticsData?.analytics?.loginStats?.todayLogins || 0}
                  </div>
                  <div style={{ fontSize: '1rem', color: '#6b7280', fontWeight: '600' }}>
                    Today's Logins
                  </div>
                </div>

                <div style={{
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  borderRadius: window.innerWidth <= 768 ? '1rem' : '1rem',
                  padding: window.innerWidth <= 768 ? '1.5rem' : '2rem',
                  textAlign: 'center',
                  border: '2px solid rgba(34, 197, 94, 0.2)',
                  width: window.innerWidth <= 768 ? '100%' : 'auto',
                  flex: window.innerWidth <= 768 ? 'none' : '1'
                }}>
                  <div style={{ fontSize: '3rem', fontWeight: '700', color: '#22c55e', marginBottom: '1rem' }}>
                    {analyticsData?.analytics?.loginStats?.weeklyLogins || 0}
                  </div>
                  <div style={{ fontSize: '1rem', color: '#6b7280', fontWeight: '600' }}>
                    This Week
                  </div>
                </div>

                <div style={{
                  backgroundColor: 'rgba(147, 51, 234, 0.1)',
                  borderRadius: window.innerWidth <= 768 ? '1rem' : '1rem',
                  padding: window.innerWidth <= 768 ? '1.5rem' : '2rem',
                  textAlign: 'center',
                  border: '2px solid rgba(147, 51, 234, 0.2)'
                }}>
                  <div style={{ fontSize: '3rem', fontWeight: '700', color: '#9333ea', marginBottom: '1rem' }}>
                    {analyticsData?.analytics?.loginStats?.monthlyLogins || 0}
                  </div>
                  <div style={{ fontSize: '1rem', color: '#6b7280', fontWeight: '600' }}>
                    This Month
                  </div>
                </div>
              </div>
            </div>
          </Box>
        )}

        {toast && (
          <Toast
            open={true}
            message={toast.message}
            type={toast.type}
            onClose={handleCloseToast}
          />
        )}

        {/* Chart Modal */}
        {showChartModal && analyticsData && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: window.innerWidth <= 768 ? '0' : '2rem'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: window.innerWidth <= 768 ? '0' : '1rem',
              padding: window.innerWidth <= 768 ? '0.75rem' : '2rem',
              maxWidth: '100vw',
              width: '100%',
              maxHeight: '100vh',
              overflow: 'auto',
              position: 'relative',
              boxShadow: window.innerWidth <= 768 ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}>
              <button
                onClick={() => setShowChartModal(false)}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  color: '#6b7280',
                  fontSize: window.innerWidth <= 768 ? '1.25rem' : '1.5rem'
                }}
              >
                ×
              </button>
              
              <h2 style={{
                fontSize: window.innerWidth <= 768 ? '1.25rem' : '1.5rem',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: window.innerWidth <= 768 ? '0.75rem' : '1rem',
                textAlign: 'center'
              }}>
                Work Readiness Distribution - Detailed View
              </h2>
              
              {/* Date Filter Controls */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: window.innerWidth <= 768 ? '0.125rem' : '0.5rem',
                marginBottom: window.innerWidth <= 768 ? '0.75rem' : '1.5rem',
                flexWrap: 'wrap'
              }}>
                {['week', 'month', 'year', 'custom'].map((range) => (
                  <button
                    key={range}
                    onClick={() => {
                      console.log('🔄 Date range button clicked:', range);
                      setWorkReadinessDateRange(range as any);
                    }}
                    style={{
                      padding: window.innerWidth <= 768 ? '0.25rem 0.5rem' : '0.5rem 1rem',
                      borderRadius: '0.5rem',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      backgroundColor: workReadinessDateRange === range ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                      color: workReadinessDateRange === range ? '#3b82f6' : '#6b7280',
                      fontWeight: workReadinessDateRange === range ? 600 : 500,
                      fontSize: window.innerWidth <= 768 ? '0.625rem' : '0.875rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {range.charAt(0).toUpperCase() + range.slice(1)}
                  </button>
                ))}
                <button
                  onClick={() => {
                    // Validate date range
                    if (workReadinessDateRange === 'custom' && workReadinessStartDate > workReadinessEndDate) {
                      setToast({ message: 'Start date cannot be after end date', type: 'error' });
                      return;
                    }
                    fetchWorkReadinessData();
                  }}
                  disabled={workReadinessLoading}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    backgroundColor: loading ? 'rgba(107, 114, 128, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                    color: loading ? '#6b7280' : '#22c55e',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  {loading ? (
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                  {loading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
              
              {/* Custom Date Range */}
              {workReadinessDateRange === 'custom' && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '1rem',
                  marginBottom: window.innerWidth <= 768 ? '0.75rem' : '1.5rem',
                  flexWrap: 'wrap'
                }}>
                  <div>
                    <label style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem', display: 'block' }}>
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={workReadinessStartDate.toISOString().split('T')[0]}
                      onChange={(e) => {
                        e.preventDefault();
                        setWorkReadinessStartDate(new Date(e.target.value));
                      }}
                      style={{
                        padding: '0.5rem',
                        borderRadius: '0.375rem',
                        border: '1px solid #d1d5db',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem', display: 'block' }}>
                      End Date
                    </label>
                    <input
                      type="date"
                      value={workReadinessEndDate.toISOString().split('T')[0]}
                      onChange={(e) => {
                        e.preventDefault();
                        setWorkReadinessEndDate(new Date(e.target.value));
                      }}
                      style={{
                        padding: '0.5rem',
                        borderRadius: '0.375rem',
                        border: '1px solid #d1d5db',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                </div>
              )}
              
              <div style={{ height: '500px', position: 'relative' }}>
                {(() => {
                  const completed = analyticsData.analytics.workReadinessStats.completed || 0;
                  const pending = analyticsData.analytics.workReadinessStats.pending || 0;
                  const overdue = analyticsData.analytics.workReadinessStats.overdue || 0;
                  const cancelled = analyticsData.analytics.workReadinessStats.cancelled || 0;
                  
                  const total = completed + pending + overdue + cancelled;
                  
                  console.log('📊 Pie Chart Data:', {
                    completed,
                    pending,
                    overdue,
                    cancelled,
                    total,
                    dateRange: workReadinessDateRange,
                    startDate: workReadinessStartDate?.toISOString().split('T')[0],
                    endDate: workReadinessEndDate?.toISOString().split('T')[0]
                  });
                  
                  // If no data, show empty state
                  if (total === 0) {
                    return (
                      <div style={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#6b7280'
                      }}>
                        <div style={{
                          width: '200px',
                          height: '200px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(107, 114, 128, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '1rem'
                        }}>
                          <svg width="80" height="80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                          No Data Available
                        </h3>
                        <p style={{ fontSize: '0.875rem', textAlign: 'center' }}>
                          No work readiness data found for the selected date range.
                        </p>
                      </div>
                    );
                  }
                  
                  return (
                    <Pie
                      data={{
                        labels: ['Completed', 'Pending', 'Overdue', 'Cancelled'],
                        datasets: [{
                          data: [completed, pending, overdue, cancelled],
                          backgroundColor: [
                            'rgba(34, 197, 94, 0.8)', // Green for completed
                            'rgba(245, 158, 11, 0.8)', // Orange for pending
                            'rgba(239, 68, 68, 0.8)', // Red for overdue
                            'rgba(107, 114, 128, 0.8)' // Gray for cancelled
                          ],
                          borderColor: [
                            'rgba(34, 197, 94, 1)',
                            'rgba(245, 158, 11, 1)',
                            'rgba(239, 68, 68, 1)', // Red border for overdue
                            'rgba(107, 114, 128, 1)' // Gray border for cancelled
                          ],
                          borderWidth: 2,
                          hoverOffset: 8
                        }]
                      }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: {
                          padding: 30,
                          font: {
                            size: 16,
                            weight: 600
                          },
                          usePointStyle: true,
                          pointStyle: 'circle'
                        }
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                            const percentage = ((value as number / total) * 100).toFixed(1);
                            return `${label}: ${value} members (${percentage}%)`;
                          }
                        },
                        titleFont: {
                          size: 16,
                          weight: 600
                        },
                        bodyFont: {
                          size: 14,
                          weight: 500
                        }
                      }
                    },
                    animation: {
                      animateScale: true,
                      animateRotate: true,
                      duration: 1000
                    }
                  }}
                />
                  );
                })()}
              </div>
              
              <div style={{
                marginTop: '2rem',
                display: 'flex',
                flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                flexWrap: window.innerWidth <= 768 ? 'nowrap' : 'wrap',
                gap: '1rem'
              }}>
                <div style={{
                  backgroundColor: '#f0fdf4',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #bbf7d0'
                }}>
                  <div style={{ fontSize: '0.875rem', color: '#166534', fontWeight: '600' }}>Completed</div>
                  <div style={{ fontSize: window.innerWidth <= 768 ? '1.25rem' : '1.5rem', color: '#166534', fontWeight: '700' }}>
                    {analyticsData.analytics.workReadinessStats.completed || 0}
                  </div>
                </div>
                <div style={{
                  backgroundColor: '#fffbeb',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #fed7aa'
                }}>
                  <div style={{ fontSize: '0.875rem', color: '#92400e', fontWeight: '600' }}>Pending</div>
                  <div style={{ fontSize: window.innerWidth <= 768 ? '1.25rem' : '1.5rem', color: '#92400e', fontWeight: '700' }}>
                    {analyticsData.analytics.workReadinessStats.pending || 0}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: '500' }}>
                    {analyticsData.analytics.workReadinessStats.pendingPercentage || 0}%
                  </div>
                </div>
                <div style={{
                  backgroundColor: '#fef2f2',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #fecaca'
                }}>
                  <div style={{ fontSize: '0.875rem', color: '#991b1b', fontWeight: '600' }}>Overdue</div>
                  <div style={{ fontSize: window.innerWidth <= 768 ? '1.25rem' : '1.5rem', color: '#991b1b', fontWeight: '700' }}>
                    {analyticsData.analytics.workReadinessStats.overdue || 0}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#991b1b', fontWeight: '500' }}>
                    {analyticsData.analytics.workReadinessStats.overduePercentage || 0}%
                  </div>
                </div>
                <div style={{
                  backgroundColor: '#f9fafb',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #d1d5db'
                }}>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '600' }}>Cancelled</div>
                  <div style={{ fontSize: window.innerWidth <= 768 ? '1.25rem' : '1.5rem', color: '#6b7280', fontWeight: '700' }}>
                    {analyticsData.analytics.workReadinessStats.cancelled || 0}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '500' }}>
                    {analyticsData.analytics.workReadinessStats.cancelledPercentage || 0}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Login Activity Modal */}
        {showLoginModal && analyticsData && (() => {
          const todayLogins = analyticsData.analytics.loginStats.todayLogins || 0;
          const weeklyLogins = analyticsData.analytics.loginStats.weeklyLogins || 0;
          const monthlyLogins = analyticsData.analytics.loginStats.monthlyLogins || 0;
          
          const total = todayLogins + weeklyLogins + monthlyLogins;
          
          // If no data, close the modal and don't show it
          if (total === 0) {
            setShowLoginModal(false);
            setToast({ message: 'No login data available for the selected period', type: 'error' });
            return null;
          }
          
          return (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: window.innerWidth <= 768 ? '0.75rem' : '2rem'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: window.innerWidth <= 768 ? '0.5rem' : '1rem',
              padding: window.innerWidth <= 768 ? '0.75rem' : '2rem',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              position: 'relative'
            }}>
              <button
                onClick={() => setShowLoginModal(false)}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  color: '#6b7280',
                  fontSize: window.innerWidth <= 768 ? '1.25rem' : '1.5rem'
                }}
              >
                ×
              </button>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem'
              }}>
                <h2 style={{
                  fontSize: window.innerWidth <= 768 ? '1.25rem' : '1.5rem',
                  fontWeight: '600',
                  color: '#1f2937',
                  margin: 0
                }}>
                  Login Activity Trends - Detailed View
                </h2>
                <button
                  type="button"
                  onClick={() => setShowLoginModal(true)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    color: '#6b7280',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    position: 'relative',
                    zIndex: 10
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#e5e7eb';
                    e.currentTarget.style.borderColor = '#9ca3af';
                    e.currentTarget.style.color = '#374151';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.color = '#6b7280';
                  }}
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  <span>Expand</span>
                </button>
              </div>
              
              {/* Date Filter Controls */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '0.5rem',
                marginBottom: window.innerWidth <= 768 ? '0.75rem' : '1.5rem',
                flexWrap: 'wrap'
              }}>
                {['week', 'month', 'year', 'custom'].map((range) => (
                  <button
                    key={range}
                    onClick={(e) => {
                      e.preventDefault();
                      setLoginDateRange(range as any);
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '0.5rem',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      backgroundColor: loginDateRange === range ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                      color: loginDateRange === range ? '#3b82f6' : '#6b7280',
                      fontWeight: loginDateRange === range ? 600 : 500,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {range.charAt(0).toUpperCase() + range.slice(1)}
                  </button>
                ))}
                <button
                  onClick={() => {
                    // Validate date range
                    if (loginDateRange === 'custom' && loginStartDate > loginEndDate) {
                      setToast({ message: 'Start date cannot be after end date', type: 'error' });
                      return;
                    }
                    fetchLoginData();
                  }}
                  disabled={loginLoading}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    backgroundColor: loading ? 'rgba(107, 114, 128, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                    color: loading ? '#6b7280' : '#22c55e',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  {loading ? (
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                  {loading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
              
              {/* Custom Date Range */}
              {loginDateRange === 'custom' && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '1rem',
                  marginBottom: window.innerWidth <= 768 ? '0.75rem' : '1.5rem',
                  flexWrap: 'wrap'
                }}>
                  <div>
                    <label style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem', display: 'block' }}>
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={loginStartDate.toISOString().split('T')[0]}
                      onChange={(e) => {
                        e.preventDefault();
                        setLoginStartDate(new Date(e.target.value));
                      }}
                      style={{
                        padding: '0.5rem',
                        borderRadius: '0.375rem',
                        border: '1px solid #d1d5db',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem', display: 'block' }}>
                      End Date
                    </label>
                    <input
                      type="date"
                      value={loginEndDate.toISOString().split('T')[0]}
                      onChange={(e) => {
                        e.preventDefault();
                        setLoginEndDate(new Date(e.target.value));
                      }}
                      style={{
                        padding: '0.5rem',
                        borderRadius: '0.375rem',
                        border: '1px solid #d1d5db',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                </div>
              )}
              
              <div style={{ height: '500px', position: 'relative' }}>
                {(() => {
                  const todayLogins = analyticsData.analytics.loginStats.todayLogins || 0;
                  const weeklyLogins = analyticsData.analytics.loginStats.weeklyLogins || 0;
                  const monthlyLogins = analyticsData.analytics.loginStats.monthlyLogins || 0;
                  const totalLogins = analyticsData.analytics.loginStats.totalLogins || 0;
                  const dailyBreakdown = analyticsData.analytics.loginStats.dailyBreakdown || [];
                  
                  // Use totalLogins or check if dailyBreakdown has any data
                  const hasData = totalLogins > 0 || dailyBreakdown.some(day => day.count > 0);
                  
                  // If no data, show empty state
                  if (!hasData) {
                    return (
                      <div style={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#6b7280'
                      }}>
                        <div style={{
                          width: '200px',
                          height: '200px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(107, 114, 128, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '1rem'
                        }}>
                          <svg width="80" height="80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                          No Login Data Available
                        </h3>
                        <p style={{ fontSize: '0.875rem', textAlign: 'center' }}>
                          No login activity found for the selected date range.
                        </p>
                      </div>
                    );
                  }
                  
                  return (
                    <Line
                      data={{
                        labels: dailyBreakdown.length > 0 
                          ? dailyBreakdown.map(item => new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
                          : ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                        datasets: [{
                          label: 'Daily Login Count',
                          data: dailyBreakdown.length > 0
                            ? dailyBreakdown.map(item => item.count)
                            : [
                                todayLogins,
                                weeklyLogins / 7,
                                weeklyLogins / 5,
                                monthlyLogins / 30
                              ],
                          borderColor: 'rgba(147, 51, 234, 1)',
                          backgroundColor: 'rgba(147, 51, 234, 0.15)',
                          fill: true,
                          tension: 0.4,
                          pointBackgroundColor: 'rgba(147, 51, 234, 1)',
                          pointBorderColor: '#ffffff',
                          pointBorderWidth: 3,
                          pointRadius: 8,
                          pointHoverRadius: 10,
                          pointHoverBackgroundColor: 'rgba(147, 51, 234, 1)',
                          pointHoverBorderColor: '#ffffff',
                          pointHoverBorderWidth: 4
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'top',
                            labels: {
                              padding: 30,
                              font: {
                                size: 16,
                                weight: 600
                              },
                              usePointStyle: true,
                              pointStyle: 'line'
                            }
                          },
                          tooltip: {
                            callbacks: {
                              label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.raw || 0;
                                return `${label}: ${Math.round(value as number)} users`;
                              }
                            },
                            titleFont: {
                              size: 16,
                              weight: 600
                            },
                            bodyFont: {
                              size: 14,
                              weight: 500
                            }
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            grid: {
                              color: 'rgba(0, 0, 0, 0.1)'
                            },
                            ticks: {
                              font: {
                                size: 12,
                                weight: 500
                              }
                            }
                          },
                          x: {
                            grid: {
                              color: 'rgba(0, 0, 0, 0.1)'
                            },
                            ticks: {
                              font: {
                                size: 12,
                                weight: 500
                              }
                            }
                          }
                        },
                        animation: {
                          duration: 1000,
                          easing: 'easeInOutQuart'
                        }
                      }}
                    />
                  );
                })()}
              </div>
              
              <div style={{
                marginTop: '2rem',
                display: 'flex',
                flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                flexWrap: window.innerWidth <= 768 ? 'nowrap' : 'wrap',
                gap: '1rem'
              }}>
                <div style={{
                  backgroundColor: '#f0f9ff',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #bae6fd'
                }}>
                  <div style={{ fontSize: '0.875rem', color: '#0369a1', fontWeight: '600' }}>Today's Logins</div>
                  <div style={{ fontSize: window.innerWidth <= 768 ? '1.25rem' : '1.5rem', color: '#0369a1', fontWeight: '700' }}>
                    {analyticsData.analytics.loginStats.todayLogins || 0}
                  </div>
                </div>
                <div style={{
                  backgroundColor: '#f0fdf4',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #bbf7d0'
                }}>
                  <div style={{ fontSize: '0.875rem', color: '#166534', fontWeight: '600' }}>Weekly Logins</div>
                  <div style={{ fontSize: window.innerWidth <= 768 ? '1.25rem' : '1.5rem', color: '#166534', fontWeight: '700' }}>
                    {analyticsData.analytics.loginStats.weeklyLogins || 0}
                  </div>
                </div>
                <div style={{
                  backgroundColor: '#fef3c7',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #fde68a'
                }}>
                  <div style={{ fontSize: '0.875rem', color: '#92400e', fontWeight: '600' }}>Monthly Logins</div>
                  <div style={{ fontSize: window.innerWidth <= 768 ? '1.25rem' : '1.5rem', color: '#92400e', fontWeight: '700' }}>
                    {analyticsData.analytics.loginStats.monthlyLogins || 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
          );
        })()}

        {/* Login Activity Trends Modal */}
        {showLoginModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: window.innerWidth <= 768 ? '0' : '0.5rem'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: window.innerWidth <= 768 ? '0' : '0.75rem',
              padding: window.innerWidth <= 768 ? '0.75rem' : '2rem',
              maxWidth: '100vw',
              maxHeight: '100vh',
              width: '100%',
              height: '100%',
              overflow: 'auto',
              position: 'relative',
              animation: 'modalSlideIn 0.3s ease-out',
              boxShadow: window.innerWidth <= 768 ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}>
              {/* Modal Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: window.innerWidth <= 768 ? '0.75rem' : '2rem',
                paddingBottom: '1rem',
                borderBottom: '1px solid #e5e7eb'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: '2rem',
                    height: '2rem',
                    backgroundColor: '#3b82f6',
                    borderRadius: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </div>
                  <h2 style={{
                    fontSize: window.innerWidth <= 768 ? '1rem' : '1.5rem',
                    fontWeight: '600',
                    color: '#1f2937',
                    margin: 0
                  }}>
                    Login Activity Trends - Detailed View
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  style={{
                    padding: '0.5rem',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '0.375rem',
                    color: '#6b7280',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                    e.currentTarget.style.color = '#374151';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#6b7280';
                  }}
                >
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Date Filter Controls */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: window.innerWidth <= 768 ? '0.25rem' : '1rem',
                marginBottom: window.innerWidth <= 768 ? '0.75rem' : '2rem',
                flexWrap: 'wrap'
              }}>
                {/* Date Range Buttons */}
                {['week', 'month', 'year', 'custom'].map((range) => (
                  <button
                    key={range}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setLoginDateRange(range as 'week' | 'month' | 'year' | 'custom');
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '0.5rem',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      backgroundColor: loginDateRange === range ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                      color: loginDateRange === range ? '#3b82f6' : '#6b7280',
                      fontWeight: loginDateRange === range ? 600 : 500,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {range.charAt(0).toUpperCase() + range.slice(1)}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    // Validate date range
                    if (loginDateRange === 'custom' && loginStartDate > loginEndDate) {
                      setToast({ message: 'Start date cannot be after end date', type: 'error' });
                      return;
                    }
                    fetchAnalyticsData(true);
                  }}
                  disabled={loading}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    color: '#22c55e',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    opacity: loading ? 0.5 : 1
                  }}
                >
                  {loading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
              
              {/* Custom Date Range */}
              {loginDateRange === 'custom' && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '1rem',
                  marginBottom: window.innerWidth <= 768 ? '0.75rem' : '2rem',
                  flexWrap: 'wrap'
                }}>
                  <div>
                    <label style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem', display: 'block' }}>
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={loginStartDate.toISOString().split('T')[0]}
                      onChange={(e) => {
                        e.preventDefault();
                        setLoginStartDate(new Date(e.target.value));
                      }}
                      style={{
                        padding: '0.5rem',
                        borderRadius: '0.375rem',
                        border: '1px solid #d1d5db',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem', display: 'block' }}>
                      End Date
                    </label>
                    <input
                      type="date"
                      value={loginEndDate.toISOString().split('T')[0]}
                      onChange={(e) => {
                        e.preventDefault();
                        setLoginEndDate(new Date(e.target.value));
                      }}
                      style={{
                        padding: '0.5rem',
                        borderRadius: '0.375rem',
                        border: '1px solid #d1d5db',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Chart Container */}
              <div style={{ height: window.innerWidth <= 768 ? '300px' : '600px', position: 'relative' }}>
                {(() => {
                  if (!analyticsData) {
                    return (
                      <div style={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#6b7280'
                      }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          border: '3px solid #e5e7eb',
                          borderTop: '3px solid #3b82f6',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite',
                          marginBottom: '1rem'
                        }}></div>
                        <p style={{ fontSize: '0.875rem', margin: '0' }}>
                          Loading chart data...
                        </p>
                      </div>
                    );
                  }

                  const todayLogins = analyticsData.analytics.loginStats.todayLogins || 0;
                  const weeklyLogins = analyticsData.analytics.loginStats.weeklyLogins || 0;
                  const monthlyLogins = analyticsData.analytics.loginStats.monthlyLogins || 0;
                  const totalLogins = analyticsData.analytics.loginStats.totalLogins || 0;
                  const dailyBreakdown = analyticsData.analytics.loginStats.dailyBreakdown || [];
                  
                  // Use totalLogins or check if dailyBreakdown has any data
                  const hasData = totalLogins > 0 || dailyBreakdown.some(day => day.count > 0);
                  
                  // If no data, show empty state
                  if (!hasData) {
                    return (
                      <div style={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#6b7280'
                      }}>
                        <div style={{
                          width: '200px',
                          height: '200px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(107, 114, 128, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '1rem'
                        }}>
                          <svg width="80" height="80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', margin: '0 0 0.5rem 0' }}>
                          No Login Data Available
                        </h3>
                        <p style={{ fontSize: '0.875rem', margin: 0, textAlign: 'center' }}>
                          Login activity will appear here once users start logging in
                        </p>
                      </div>
                    );
                  }

                  // Prepare chart data
                  const chartData = {
                    labels: dailyBreakdown.map((item: any) => {
                      const date = new Date(item.date);
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    }),
                    datasets: [
                      {
                        label: 'Daily Logins',
                        data: dailyBreakdown.map((item: any) => item.count),
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#3b82f6',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                      }
                    ]
                  };

                  return (
                    <Line
                      data={chartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: true,
                            position: 'top',
                            labels: {
                              usePointStyle: true,
                              pointStyle: 'line',
                              font: {
                                size: 14,
                                weight: 600
                              }
                            }
                          },
                          tooltip: {
                            callbacks: {
                              label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.raw || 0;
                                return `${label}: ${Math.round(value as number)} users`;
                              }
                            },
                            titleFont: {
                              size: 16,
                              weight: 600
                            },
                            bodyFont: {
                              size: 14,
                              weight: 500
                            }
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            grid: {
                              color: 'rgba(0, 0, 0, 0.1)'
                            },
                            ticks: {
                              font: {
                                size: 12,
                                weight: 500
                              }
                            }
                          },
                          x: {
                            grid: {
                              color: 'rgba(0, 0, 0, 0.1)'
                            },
                            ticks: {
                              font: {
                                size: 12,
                                weight: 500
                              }
                            }
                          }
                        },
                        animation: {
                          duration: 1000,
                          easing: 'easeInOutQuart'
                        }
                      }}
                    />
                  );
                })()}
              </div>

              {/* Summary Cards */}
              <div style={{
                marginTop: window.innerWidth <= 768 ? '1rem' : '2rem',
                display: 'flex',
                flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                flexWrap: window.innerWidth <= 768 ? 'nowrap' : 'wrap',
                gap: window.innerWidth <= 768 ? '0.25rem' : '1rem'
              }}>
                <div style={{
                  backgroundColor: '#f0f9ff',
                  padding: window.innerWidth <= 768 ? '0.5rem' : '1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #bae6fd'
                }}>
                  <div style={{ fontSize: window.innerWidth <= 768 ? '0.75rem' : '0.875rem', color: '#0369a1', fontWeight: '600' }}>Today's Logins</div>
                  <div style={{ fontSize: window.innerWidth <= 768 ? '1.25rem' : '1.5rem', color: '#0369a1', fontWeight: '700' }}>
                    {analyticsData?.analytics?.loginStats?.todayLogins || 0}
                  </div>
                </div>
                <div style={{
                  backgroundColor: '#f0fdf4',
                  padding: window.innerWidth <= 768 ? '0.5rem' : '1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #bbf7d0'
                }}>
                  <div style={{ fontSize: window.innerWidth <= 768 ? '0.75rem' : '0.875rem', color: '#166534', fontWeight: '600' }}>Weekly Logins</div>
                  <div style={{ fontSize: window.innerWidth <= 768 ? '1.25rem' : '1.5rem', color: '#166534', fontWeight: '700' }}>
                    {analyticsData?.analytics?.loginStats?.weeklyLogins || 0}
                  </div>
                </div>
                <div style={{
                  backgroundColor: '#fef3c7',
                  padding: window.innerWidth <= 768 ? '0.5rem' : '1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #fde68a'
                }}>
                  <div style={{ fontSize: window.innerWidth <= 768 ? '0.75rem' : '0.875rem', color: '#92400e', fontWeight: '600' }}>Monthly Logins</div>
                  <div style={{ fontSize: window.innerWidth <= 768 ? '1.25rem' : '1.5rem', color: '#92400e', fontWeight: '700' }}>
                    {analyticsData?.analytics?.loginStats?.monthlyLogins || 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Box>
    </LayoutWithSidebar>
  );
};

export default TeamAnalytics;