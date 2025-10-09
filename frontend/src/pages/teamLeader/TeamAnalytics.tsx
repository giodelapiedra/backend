import React, { useState, useEffect, useCallback, useMemo, memo, useReducer } from 'react';
import { useAuth } from '../../contexts/AuthContext.supabase';
import { SupabaseAPI } from '../../utils/supabaseApi';
import LoadingSpinner from '../../components/LoadingSpinner';
import Toast from '../../components/Toast';
import LayoutWithSidebar from '../../components/LayoutWithSidebar';
import EmptyState from '../../components/EmptyState';
import { Box, Card, CardContent, Typography, Button } from '@mui/material';
import TrendChart from '../../components/TrendChart';
import { useIsMobile } from '../../hooks/layout';
import { useAnalytics } from '../../hooks/useAnalytics';
import { dateFilterReducer, makeInitial } from '../../reducers/dateFilter';
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
  BarElement,
  Filler
} from 'chart.js';
import { Line, Pie, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  Filler
);

// Gradient helper function
function makeAreaGradient(chart: any, color: string) {
  const { ctx, chartArea } = chart;
  if (!chartArea) return color;
  const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  g.addColorStop(0, color.replace('1)', '0.25)'));
  g.addColorStop(1, color.replace('1)', '0.05)'));
  return g;
}

// No plugin registration needed - using scriptable backgroundColor

// Type alias for trend data items
type TrendDataItem = {
  date: string;
  notFitForWork: number;
  minorConcernsFitForWork: number;
  fitForWork: number;
  total: number;
};

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
        notStarted?: number;
        completedPercentage: number;
        pendingPercentage: number;
        notStartedPercentage: number;
        byStatus: any[];
        monthlyAssessments: any[];
      };
      todayWorkReadinessStats: {
        completed: number;
        total: number;
      };
    loginStats: {
      todayLogins: number;
      weeklyLogins: number;
      monthlyLogins: number;
      dailyBreakdown?: Array<{
        date: string;
        count: number;
      }>;
    };
    teamPerformance: Array<{
    memberName: string;
      email: string;
      role: string;
      team: string;
      lastLogin: string;
      isActive: boolean;
      workReadinessStatus: string;
      activityLevel: number;
      loggedInToday: boolean;
      recentCheckIns: number;
      recentAssessments: number;
      completedAssessments: number;
    }>;
    readinessTrendData: TrendDataItem[];
    complianceRate: number;
    activityRate: number;
  };
}

// Modern color palette for better visual design
const COLORS = {
  primary: {
    main: '#6366f1', // Indigo - more modern than blue
    light: '#818cf8',
    dark: '#4f46e5',
    bg: 'rgba(99, 102, 241, 0.08)',
  },
  success: {
    main: '#10b981', // Emerald - fresher than green
    light: '#34d399',
    dark: '#059669',
    bg: 'rgba(16, 185, 129, 0.08)',
  },
  warning: {
    main: '#f59e0b', // Amber
    light: '#fbbf24',
    dark: '#d97706',
    bg: 'rgba(245, 158, 11, 0.08)',
  },
  error: {
    main: '#ef4444', // Red
    light: '#f87171',
    dark: '#dc2626',
    bg: 'rgba(239, 68, 68, 0.08)',
  },
  purple: {
    main: '#8b5cf6', // Violet
    light: '#a78bfa',
    dark: '#7c3aed',
    bg: 'rgba(139, 92, 246, 0.08)',
  },
  neutral: {
    white: '#ffffff',
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
  gradient: {
    primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    success: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    header: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
  }
};

const TeamAnalytics: React.FC = memo(() => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  // Add CSS for animations
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
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
          opacity: 0.7;
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [readinessModalOpen, setReadinessModalOpen] = useState(false);

  // Reducers for chart filters
  const [workReadinessFilter, dispatchWorkReadiness] = useReducer(dateFilterReducer, makeInitial('week'));
  const [loginFilter, dispatchLogin] = useReducer(dateFilterReducer, makeInitial('month'));
  const [trendFilter, dispatchTrend] = useReducer(dateFilterReducer, makeInitial('month'));

  // Use the unified analytics hook
  const { data: analyticsData, error, loading, setData: setAnalyticsData } = useAnalytics(user?.id, {
    work: { range: workReadinessFilter.range, start: workReadinessFilter.start, end: workReadinessFilter.end },
    login: { range: loginFilter.range, start: loginFilter.start, end: loginFilter.end },
    trend: { range: trendFilter.range, start: trendFilter.start, end: trendFilter.end }
  });
  
  const [showChartModal, setShowChartModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [chartKey, setChartKey] = useState(0);

  // Cache clearing functions
  const clearAllBrowserCache = useCallback(async () => {
    console.log('=== CLEARING ALL BROWSER CACHE ===');
    try {
      localStorage.clear();
      console.log('✅ localStorage cleared');
      sessionStorage.clear();
      console.log('✅ sessionStorage cleared');
      
      // Clear IndexedDB
      if ('indexedDB' in window) {
        try {
          const databases = await indexedDB.databases();
          for (const db of databases) {
            if (db.name) {
              indexedDB.deleteDatabase(db.name);
            }
          }
          console.log('✅ IndexedDB cleared');
        } catch (error) {
          console.log('❌ IndexedDB clear error:', error);
        }
      }
      
      // Clear Service Worker cache
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            await registration.unregister();
          }
          console.log('✅ Service Worker cleared');
        } catch (error) {
          console.log('❌ Service Worker clear error:', error);
        }
      }
      
      // Clear Cache API
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
          console.log('✅ Cache API cleared');
        } catch (error) {
          console.log('❌ Cache API clear error:', error);
        }
      }
      
      // Clear cookies (but preserve auth cookies)
      try {
        const cookiesToPreserve = ['supabase.auth.token', 'sb-', 'auth-token'];
        document.cookie.split(";").forEach(function(cookie) { 
          const cookieName = cookie.replace(/^ +/, "").split("=")[0];
          const shouldPreserve = cookiesToPreserve.some(preserveName => 
            cookieName.includes(preserveName)
          );
          if (!shouldPreserve) {
            document.cookie = cookie.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
          }
        });
        console.log('✅ Non-auth cookies cleared (login cookies preserved)');
      } catch (error) {
        console.log('❌ Cookie clear error:', error);
      }
      
      console.log('=== BROWSER CACHE CLEARED ===');
    } catch (error) {
      console.error('Error clearing browser cache:', error);
    }
  }, []);

  const clearDataCache = useCallback(() => {
    console.log('=== CLEARING DATA CACHE ===');
    setLastFetchTime(0);
    setAnalyticsData(null);
    console.log('✅ Data cache cleared');
  }, []);

  useEffect(() => {
    fetchAnalyticsData(); // This will fetch general analytics data
    fetchReadinessAnalyticsData(); // This will fetch work readiness trend data
  }, []);

  // Fetch data when work readiness date range changes
  useEffect(() => {
    setWorkReadinessChartLoading(true);
    fetchAnalyticsData('workReadiness').finally(() => {
      setWorkReadinessChartLoading(false);
    });
  }, [workReadinessDateRange, workReadinessStartDate, workReadinessEndDate]);

  // Fetch data when login date range changes
  useEffect(() => {
    setLoginChartLoading(true);
    fetchAnalyticsData('login').finally(() => {
      setLoginChartLoading(false);
    });
  }, [loginDateRange, loginStartDate, loginEndDate]);

  // Fetch data when readiness chart date range changes (same logic as TeamLeaderDashboard)
  useEffect(() => {
    console.log('🔄 TeamAnalytics: Filter changed, fetching new analytics data...', {
      dateRange: readinessDateRange,
      startDate: readinessStartDate?.toISOString(),
      endDate: readinessEndDate?.toISOString(),
      userId: user?.id
    });
    fetchReadinessAnalyticsData();
  }, [readinessDateRange, readinessStartDate, readinessEndDate, user?.id]);

  // Same logic as TeamLeaderDashboard for work readiness analytics
  const fetchReadinessAnalyticsData = useCallback(async () => {
    try {
      setReadinessChartLoading(true);
      console.log('🔄 TeamAnalytics: Fetching work readiness trend data from Supabase...');
      console.log('📅 TeamAnalytics: Filter parameters:', {
        dateRange: readinessDateRange,
        startDate: readinessStartDate?.toISOString(),
        endDate: readinessEndDate?.toISOString(),
        userId: user?.id
      });
      
      if (!user?.id) {
        console.log('❌ TeamAnalytics: No user ID available for analytics fetch');
        setAnalyticsData(null);
        return;
      }
      
      // Get work readiness trend data from Supabase with force refresh to bypass cache
      const trendData = await SupabaseAPI.getWorkReadinessTrendData(user.id, readinessDateRange, readinessStartDate, readinessEndDate, true);
      
      console.log('✅ TeamAnalytics: Work readiness trend data received:', trendData);
      console.log('📊 TeamAnalytics: Data points:', trendData?.analytics?.readinessTrendData?.length || 0);
      console.log('📊 TeamAnalytics: Chart data details:', trendData?.analytics?.readinessTrendData?.map((item: TrendDataItem) => ({
        date: item.date,
        notFitForWork: item.notFitForWork,
        minorConcernsFitForWork: item.minorConcernsFitForWork,
        fitForWork: item.fitForWork,
        total: item.total
      })));
      
      // Get the full analytics data first, then merge trend data
      const fullAnalyticsData = await SupabaseAPI.getAnalyticsData(user.id);
      
      // Merge trend data into the full analytics data
      if (trendData?.analytics?.readinessTrendData && fullAnalyticsData) {
        (fullAnalyticsData.analytics as any).readinessTrendData = trendData.analytics.readinessTrendData;
        console.log('✅ TeamAnalytics: Merged trend data into full analytics data');
      }
      
      // Set the complete analytics data
      setAnalyticsData(fullAnalyticsData);
    } catch (error) {
      console.error('❌ TeamAnalytics: Error fetching analytics data:', error);
      setAnalyticsData(null);
    } finally {
      setReadinessChartLoading(false);
    }
  }, [readinessDateRange, readinessStartDate, readinessEndDate, user?.id]);

  const fetchAnalyticsData = useCallback(async (chartType?: 'workReadiness' | 'login' | 'readiness', forceRefresh = false) => {
    try {
      // Only set main loading for initial load, not for chart-specific updates
      if (!chartType) {
        setLoading(true);
      }
      
      if (!user?.id) {
        setAnalyticsData(null);
        return;
      }
      
      // Clear cache if force refresh
      if (forceRefresh) {
        await clearAllBrowserCache();
        clearDataCache();
      }
      
      // Fetch analytics data from Supabase
      const result = await SupabaseAPI.getAnalyticsData(user.id);
      
      // Fetch filtered data based on chart type
      if (chartType === 'workReadiness') {
        try {
          console.log('📊 TeamAnalytics: Fetching filtered work readiness stats...');
          console.log('📊 TeamAnalytics: Parameters:', {
            userId: user.id,
            dateRange: workReadinessDateRange,
            startDate: workReadinessStartDate?.toISOString(),
            endDate: workReadinessEndDate?.toISOString()
          });
          
          const workReadinessData = await SupabaseAPI.getWorkReadinessStats(
            user.id, 
            workReadinessDateRange, 
            workReadinessStartDate, 
            workReadinessEndDate
          );
          
          console.log('📊 TeamAnalytics: Work readiness stats received:', workReadinessData);
          
          // Merge filtered work readiness stats
          if (workReadinessData?.analytics?.workReadinessStats) {
            result.analytics.workReadinessStats = workReadinessData.analytics.workReadinessStats;
            console.log('✅ TeamAnalytics: Work readiness stats updated with filtered data');
          }
        } catch (workReadinessError) {
          console.error('❌ TeamAnalytics: Error fetching work readiness stats:', workReadinessError);
        }
      } else if (chartType === 'login') {
        try {
          console.log('📊 TeamAnalytics: Fetching filtered login stats...');
          console.log('📊 TeamAnalytics: Parameters:', {
            userId: user.id,
            dateRange: loginDateRange,
            startDate: loginStartDate?.toISOString(),
            endDate: loginEndDate?.toISOString()
          });
          
          const loginData = await SupabaseAPI.getLoginStats(
            user.id, 
            loginDateRange, 
            loginStartDate, 
            loginEndDate
          );
          
          console.log('📊 TeamAnalytics: Login stats received:', loginData);
          
          // Merge filtered login stats
          if (loginData?.analytics?.loginStats) {
            result.analytics.loginStats = loginData.analytics.loginStats;
            console.log('✅ TeamAnalytics: Login stats updated with filtered data');
          }
        } catch (loginError) {
          console.error('❌ TeamAnalytics: Error fetching login stats:', loginError);
        }
      }
      
      // Fetch work readiness trend data for the readiness chart
      if (chartType === 'readiness' || !chartType) {
        try {
          console.log('📊 TeamAnalytics: Fetching work readiness trend data...');
          console.log('📊 TeamAnalytics: Parameters:', {
            userId: user.id,
            dateRange: readinessDateRange,
            startDate: readinessStartDate?.toISOString(),
            endDate: readinessEndDate?.toISOString()
          });
          
          const trendData = await SupabaseAPI.getWorkReadinessTrendData(
            user.id, 
            readinessDateRange, 
            readinessStartDate, 
            readinessEndDate,
            true  // Force refresh to bypass cache
          );
          
          console.log('📊 TeamAnalytics: Trend data received:', trendData);
          
          // Merge trend data into analytics result
          if (trendData?.analytics?.readinessTrendData) {
            (result.analytics as any).readinessTrendData = trendData.analytics.readinessTrendData;
            console.log('✅ TeamAnalytics: Work readiness trend data added:', trendData.analytics.readinessTrendData.length, 'points');
            console.log('📊 TeamAnalytics: Chart data details:', trendData.analytics.readinessTrendData.map((item: TrendDataItem) => ({
              date: item.date,
              notFitForWork: item.notFitForWork,
              minorConcernsFitForWork: item.minorConcernsFitForWork,
              fitForWork: item.fitForWork,
              total: item.total
            })));
          } else {
            console.log('📊 TeamAnalytics: No trend data received');
          }
        } catch (trendError) {
          console.error('❌ TeamAnalytics: Error fetching work readiness trend data:', trendError);
          // Keep empty array if trend data fails
          (result.analytics as any).readinessTrendData = [];
        }
      }
      
      setAnalyticsData(result);
      setError(null);
      setLastFetchTime(Date.now());
      
    } catch (err: any) {
      console.log('No analytics data found:', err);
      // Set empty analytics data instead of error
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
            notStarted: 0,
            completedPercentage: 0,
            pendingPercentage: 0,
            notStartedPercentage: 0,
            byStatus: [],
            monthlyAssessments: []
          },
          todayWorkReadinessStats: {
            completed: 0,
            total: 0
          },
          loginStats: {
            todayLogins: 0,
            weeklyLogins: 0,
            monthlyLogins: 0,
            dailyBreakdown: []
          },
          teamPerformance: [],
          readinessTrendData: [],
          complianceRate: 0,
          activityRate: 0
        }
      });
      setError(null);
    } finally {
      // Only set main loading false for initial load
      if (!chartType) {
        setLoading(false);
      }
    }
  }, [user?.id, workReadinessDateRange, workReadinessStartDate, workReadinessEndDate, loginDateRange, loginStartDate, loginEndDate, readinessDateRange, readinessStartDate, readinessEndDate]);

  const handleCloseToast = useCallback(() => {
    setToast(null);
  }, []);

  // Memoized chart data calculations with safe notStarted calc
  const wrStats = analyticsData?.analytics?.workReadinessStats;
  const workReadinessChartData = useMemo(() => {
    if (!wrStats) return null;
    
    const completed = wrStats.completed ?? 0;
    const pending = wrStats.pending ?? 0;
    const total = wrStats.total ?? 0;
    const notStarted = Math.max(0, total - (completed + pending));
    
    return {
      labels: ['Completed', 'Pending', 'Not Started'],
      datasets: [{
        data: [completed, pending, notStarted],
        backgroundColor: [
          COLORS.success.main,
          COLORS.warning.main,
          COLORS.error.main
        ],
        borderColor: [
          COLORS.success.main,
          COLORS.warning.main,
          COLORS.error.main
        ],
        borderWidth: 2
      }]
    };
  }, [wrStats]);

  const loginChartData = useMemo(() => {
    if (!analyticsData?.analytics?.loginStats) return null;
    
    const { dailyBreakdown } = analyticsData.analytics.loginStats;
    
    return {
      labels: dailyBreakdown && dailyBreakdown.length > 0 
        ? dailyBreakdown.map(item => new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
        : ['No Data'],
      datasets: [{
        label: 'Daily Login Count',
        data: dailyBreakdown && dailyBreakdown.length > 0
          ? dailyBreakdown.map(item => item.count)
          : [0],
        borderColor: 'rgba(147, 51, 234, 1)',
        backgroundColor: (ctx: any) => makeAreaGradient(ctx.chart, 'rgba(147, 51, 234, 1)'),
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgba(147, 51, 234, 1)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8
      }]
    };
  }, [analyticsData?.analytics?.loginStats]);

  const teamPerformanceChartData = useMemo(() => {
    if (!analyticsData?.analytics?.teamPerformance) return null;
    
    return {
      labels: analyticsData.analytics.teamPerformance.map((member: any) => 
        member.memberName || member.workerName || 'Unknown'
      ).slice(0, 5),
      datasets: [{
        label: 'Activity Level',
        data: analyticsData.analytics.teamPerformance.map((member: any) => 
          member.activityLevel || 0
        ).slice(0, 5),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1
      }]
    };
  }, [analyticsData?.analytics?.teamPerformance]);

  const readinessTrendChartData = useMemo(() => {
    if (!analyticsData?.analytics?.readinessTrendData || 
        !Array.isArray(analyticsData.analytics.readinessTrendData) || 
        analyticsData.analytics.readinessTrendData.length === 0) return null;
    
    return {
      labels: analyticsData.analytics.readinessTrendData.map((item: TrendDataItem) => 
        new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      ),
      datasets: [
        {
          label: 'Not Fit for Work',
          data: analyticsData.analytics.readinessTrendData.map((item: TrendDataItem) => item.notFitForWork),
          borderColor: 'rgba(147, 51, 234, 1)',
          backgroundColor: (ctx: any) => makeAreaGradient(ctx.chart, 'rgba(147, 51, 234, 1)'),
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#9333ea',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8
        },
        {
          label: 'Minor Concerns Fit for Work',
          data: analyticsData.analytics.readinessTrendData.map((item: TrendDataItem) => item.minorConcernsFitForWork),
          borderColor: 'rgba(245, 158, 11, 1)',
          backgroundColor: (ctx: any) => makeAreaGradient(ctx.chart, 'rgba(245, 158, 11, 1)'),
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#f59e0b',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8
        },
        {
          label: 'Fit for Work',
          data: analyticsData.analytics.readinessTrendData.map((item: TrendDataItem) => item.fitForWork),
          borderColor: 'rgba(34, 197, 94, 1)',
          backgroundColor: (ctx: any) => makeAreaGradient(ctx.chart, 'rgba(34, 197, 94, 1)'),
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#22c55e',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8
        }
      ]
    };
  }, [analyticsData?.analytics?.readinessTrendData]);

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
        `}
      </style>
      <Box sx={{ 
        width: '100%',
        p: { xs: 2, sm: 2.5, md: 3 },
        background: COLORS.neutral[50],
        minHeight: '100vh',
        position: 'relative',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}>
        {/* Modern Header with gradient */}
        <Box sx={{ 
          mb: { xs: 3, md: 4 },
          position: 'relative',
          zIndex: 1,
          background: { 
            xs: COLORS.gradient.header, 
            md: COLORS.gradient.header 
          },
          padding: { xs: '24px 20px', md: '32px 24px' },
          borderRadius: { xs: '16px', md: '20px' },
          boxShadow: '0 10px 40px -10px rgba(99, 102, 241, 0.3)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexDirection: { xs: 'column', md: 'row' },
          gap: { xs: 2, md: 3 },
          animation: 'slideUp 0.6s ease-out',
        }}>
          <Box sx={{ textAlign: { xs: 'center', md: 'left' }, flex: 1 }}>
            <Typography variant="h4" sx={{ 
              fontWeight: 700, 
              color: COLORS.neutral.white,
              mb: 0.5,
              fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
              letterSpacing: '-0.02em',
            }}>
              Team Analytics
            </Typography>
            <Typography variant="body1" sx={{ 
              color: 'rgba(255,255,255,0.9)',
              textAlign: { xs: 'center', md: 'left' },
              fontSize: { xs: '0.875rem', md: '0.9375rem' },
              fontWeight: 400,
              maxWidth: '600px',
            }}>
              Monitor team performance and track key metrics in real-time
            </Typography>
          </Box>
          
          {/* Refresh Button - Modern glassmorphic style */}
          <Button
            onClick={() => fetchAnalyticsData(undefined, true)}
            disabled={loading}
            variant="contained"
            sx={{
              background: loading ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(10px)',
              color: COLORS.neutral.white,
              padding: { xs: '10px 20px', md: '12px 28px' },
              borderRadius: '12px',
              fontSize: { xs: '0.8125rem', md: '0.875rem' },
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              border: '1px solid rgba(255,255,255,0.3)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              textTransform: 'none',
              minWidth: { xs: '140px', md: '160px' },
              '&:hover': {
                background: loading ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.25)',
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
                border: '1px solid rgba(255,255,255,0.4)',
              },
              '&:active': {
                transform: 'translateY(0)',
              },
              '&:disabled': {
                background: 'rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.7)',
                border: '1px solid rgba(255,255,255,0.2)',
              }
            }}
          >
            <svg 
              width="18" 
              height="18" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              style={{
                animation: loading ? 'spin 1s linear infinite' : 'none'
              }}
            >
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
              <path d="M21 3v5h-5"/>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
              <path d="M3 21v-5h5"/>
            </svg>
            {loading ? 'Refreshing...' : 'Refresh'}
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
            {/* Overview Cards - Modern clean design */}
            <Box sx={{ 
              display: 'grid',
              gridTemplateColumns: { 
                xs: '1fr', 
                sm: 'repeat(2, 1fr)', 
                md: 'repeat(4, 1fr)' 
              },
              gap: { xs: 2, md: 2.5 },
              mb: { xs: 2, md: 2 }
            }}>
              {/* Total Team Members Card */}
              <Box sx={{
                background: COLORS.neutral.white,
                borderRadius: '16px',
                padding: { xs: '20px', md: '24px' },
                boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.02)',
                border: `1px solid ${COLORS.neutral[200]}`,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                animation: 'slideUp 0.6s ease-out 0.1s both',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: `0 12px 24px -8px ${COLORS.primary.main}40`,
                  borderColor: COLORS.primary.light,
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: `linear-gradient(90deg, ${COLORS.primary.main}, ${COLORS.primary.light})`,
                  borderRadius: '16px 16px 0 0',
                }
              }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography sx={{ 
                      fontSize: '0.8125rem', 
                      fontWeight: '600', 
                      color: COLORS.neutral[500], 
                      mb: 1,
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase',
                    }}>
                      Total Members
                    </Typography>
                    <Typography sx={{ 
                      fontSize: { xs: '2rem', md: '2.25rem' }, 
                      fontWeight: '700', 
                      color: COLORS.neutral[900],
                      lineHeight: 1,
                      letterSpacing: '-0.02em',
                    }}>
                      {analyticsData.analytics.totalTeamMembers}
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    width: { xs: '48px', md: '56px' }, 
                    height: { xs: '48px', md: '56px' }, 
                    background: COLORS.primary.bg,
                    borderRadius: '14px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                  }}>
                    <svg width="28" height="28" fill="none" stroke={COLORS.primary.main} strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </Box>
                </Box>
              </Box>

              {/* Active Members Card */}
              <Box sx={{
                background: COLORS.neutral.white,
                borderRadius: '16px',
                padding: { xs: '20px', md: '24px' },
                boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.02)',
                border: `1px solid ${COLORS.neutral[200]}`,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                animation: 'slideUp 0.6s ease-out 0.2s both',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: `0 12px 24px -8px ${COLORS.success.main}40`,
                  borderColor: COLORS.success.light,
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: `linear-gradient(90deg, ${COLORS.success.main}, ${COLORS.success.light})`,
                  borderRadius: '16px 16px 0 0',
                }
              }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography sx={{ 
                      fontSize: '0.8125rem', 
                      fontWeight: '600', 
                      color: COLORS.neutral[500], 
                      mb: 1,
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase',
                    }}>
                      Active Members
                    </Typography>
                    <Typography sx={{ 
                      fontSize: { xs: '2rem', md: '2.25rem' }, 
                      fontWeight: '700', 
                      color: COLORS.neutral[900],
                      lineHeight: 1,
                      letterSpacing: '-0.02em',
                    }}>
                      {analyticsData.analytics.activeTeamMembers}
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    width: { xs: '48px', md: '56px' }, 
                    height: { xs: '48px', md: '56px' }, 
                    background: COLORS.success.bg,
                    borderRadius: '14px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                  }}>
                    <svg width="28" height="28" fill="none" stroke={COLORS.success.main} strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </Box>
                </Box>
              </Box>

              {/* Work Readiness Completed Card */}
              <Box sx={{
                background: COLORS.neutral.white,
                borderRadius: '16px',
                padding: { xs: '20px', md: '24px' },
                boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.02)',
                border: `1px solid ${COLORS.neutral[200]}`,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                animation: 'slideUp 0.6s ease-out 0.3s both',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: `0 12px 24px -8px ${COLORS.purple.main}40`,
                  borderColor: COLORS.purple.light,
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: `linear-gradient(90deg, ${COLORS.purple.main}, ${COLORS.purple.light})`,
                  borderRadius: '16px 16px 0 0',
                }
              }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography sx={{ 
                      fontSize: '0.8125rem', 
                      fontWeight: '600', 
                      color: COLORS.neutral[500], 
                      mb: 1,
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase',
                    }}>
                      Completed
                    </Typography>
                    <Typography sx={{ 
                      fontSize: { xs: '2rem', md: '2.25rem' }, 
                      fontWeight: '700', 
                      color: COLORS.neutral[900],
                      lineHeight: 1,
                      letterSpacing: '-0.02em',
                    }}>
                      {analyticsData.analytics.workReadinessStats.completed}
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    width: { xs: '48px', md: '56px' }, 
                    height: { xs: '48px', md: '56px' }, 
                    background: COLORS.purple.bg,
                    borderRadius: '14px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                  }}>
                    <svg width="28" height="28" fill="none" stroke={COLORS.purple.main} strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </Box>
                </Box>
              </Box>

              {/* Compliance Rate Card */}
              <Box sx={{
                background: COLORS.neutral.white,
                borderRadius: '16px',
                padding: { xs: '20px', md: '24px' },
                boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.02)',
                border: `1px solid ${COLORS.neutral[200]}`,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                animation: 'slideUp 0.6s ease-out 0.4s both',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: `0 12px 24px -8px ${COLORS.warning.main}40`,
                  borderColor: COLORS.warning.light,
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: `linear-gradient(90deg, ${COLORS.warning.main}, ${COLORS.warning.light})`,
                  borderRadius: '16px 16px 0 0',
                }
              }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography sx={{ 
                      fontSize: '0.8125rem', 
                      fontWeight: '600', 
                      color: COLORS.neutral[500], 
                      mb: 1,
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase',
                    }}>
                      Compliance Rate
                    </Typography>
                    <Typography sx={{ 
                      fontSize: { xs: '2rem', md: '2.25rem' }, 
                      fontWeight: '700', 
                      color: COLORS.neutral[900],
                      lineHeight: 1,
                      letterSpacing: '-0.02em',
                    }}>
                      {analyticsData.analytics.complianceRate}%
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    width: { xs: '48px', md: '56px' }, 
                    height: { xs: '48px', md: '56px' }, 
                    background: COLORS.warning.bg,
                    borderRadius: '14px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                  }}>
                    <svg width="28" height="28" fill="none" stroke={COLORS.warning.main} strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* Date Filter Controls - Modern Design */}
            <Box sx={{
              backgroundColor: COLORS.neutral.white,
              borderRadius: '16px',
              padding: { xs: '16px', md: '20px' },
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              border: `1px solid ${COLORS.neutral[200]}`,
              mb: 2,
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Typography sx={{ 
                  fontSize: '0.875rem', 
                  fontWeight: '600', 
                  color: COLORS.neutral[600],
                  minWidth: '80px'
                }}>
                  Time Period:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {(['week', 'month', 'year', 'custom'] as const).map((range) => (
                    <Button
                      key={range}
                      onClick={(e) => {
                        e.preventDefault();
                        dispatchWorkReadiness({ type: 'SET_RANGE', range });
                      }}
                      variant={workReadinessFilter.range === range ? 'contained' : 'outlined'}
                      sx={{
                        padding: '8px 20px',
                        borderRadius: '10px',
                        border: workReadinessFilter.range === range ? 'none' : `1.5px solid ${COLORS.neutral[300]}`,
                        backgroundColor: workReadinessFilter.range === range ? COLORS.primary.main : 'transparent',
                        color: workReadinessFilter.range === range ? COLORS.neutral.white : COLORS.neutral[600],
                        fontSize: '0.8125rem',
                        fontWeight: '600',
                        textTransform: 'capitalize',
                        minWidth: '80px',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                          backgroundColor: workReadinessDateRange === range ? COLORS.primary.dark : COLORS.neutral[100],
                          borderColor: workReadinessDateRange === range ? COLORS.primary.dark : COLORS.neutral[400],
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                        },
                      }}
                    >
                      {range}
                    </Button>
                  ))}
                </Box>
                {workReadinessFilter.range === 'custom' && (
                  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap', mt: { xs: 1, md: 0 } }}>
                    <input
                      type="date"
                      value={workReadinessStartDate.toISOString().split('T')[0]}
                      onChange={(e) => {
                        e.preventDefault();
                        setWorkReadinessStartDate(new Date(e.target.value));
                      }}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: `1.5px solid ${COLORS.neutral[300]}`,
                        backgroundColor: COLORS.neutral.white,
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: COLORS.neutral[700],
                        fontFamily: 'inherit',
                      }}
                    />
                    <Typography sx={{ color: COLORS.neutral[400], fontWeight: '600' }}>→</Typography>
                    <input
                      type="date"
                      value={workReadinessEndDate.toISOString().split('T')[0]}
                      onChange={(e) => {
                        e.preventDefault();
                        setWorkReadinessEndDate(new Date(e.target.value));
                      }}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: `1.5px solid ${COLORS.neutral[300]}`,
                        backgroundColor: COLORS.neutral.white,
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: COLORS.neutral[700],
                        fontFamily: 'inherit',
                      }}
                    />
                  </Box>
                )}
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
                onClick={async () => {
                  setShowChartModal(true);
                  // Refresh work readiness data when opening detailed view
                  try {
                    await fetchAnalyticsData('workReadiness');
                  } catch (error) {
                    console.error('Error refreshing work readiness data:', error);
                  }
                }}
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
                    onClick={async (e) => {
                      e.stopPropagation();
                      setShowChartModal(true);
                      // Refresh work readiness data when opening detailed view
                      try {
                        await fetchAnalyticsData('workReadiness');
                      } catch (error) {
                        console.error('Error refreshing work readiness data:', error);
                      }
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
                      Not Started
                    </Typography>
                    <Typography sx={{ fontSize: '1.25rem', fontWeight: '700', color: COLORS.error.main }}>
                      {analyticsData.analytics.workReadinessStats.notStarted || ((analyticsData.analytics.workReadinessStats.total || 0) - ((analyticsData.analytics.workReadinessStats.completed || 0) + (analyticsData.analytics.workReadinessStats.pending || 0)))}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ height: { xs: '240px', md: '300px' }, position: 'relative' }}>
                    {(() => {
                      const completed = analyticsData.analytics.workReadinessStats.completed || 0;
                      const pending = analyticsData.analytics.workReadinessStats.pending || 0;
                      const notStarted = analyticsData.analytics.workReadinessStats.notStarted || 
                        ((analyticsData.analytics.workReadinessStats.total || 0) - 
                         ((analyticsData.analytics.workReadinessStats.completed || 0) + 
                          (analyticsData.analytics.workReadinessStats.pending || 0)));
                      
                      const total = completed + pending + notStarted;
                      
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
                              No data for selected period
                            </Typography>
                          </Box>
                        );
                      }
                      
                      return (
                        <Pie
                          data={workReadinessChartData || {
                            labels: ['Completed', 'Pending', 'Not Started'],
                            datasets: [{
                              data: [completed, pending, notStarted],
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
                  borderRadius: isMobile ? '1rem' : '1rem',
                  padding: isMobile ? '1.5rem' : '2rem',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  width: isMobile ? '100%' : 'auto',
                  flex: isMobile ? 'none' : '1'
                }}
                onClick={async () => {
                  setShowLoginModal(true);
                  // Refresh login data when opening detailed view
                  try {
                    await fetchAnalyticsData('login');
                  } catch (error) {
                    console.error('Error refreshing login data:', error);
                  }
                }}
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
                  marginBottom: isMobile ? '0.75rem' : '1.5rem'
                }}>
                  <h3 style={{ 
                    fontSize: isMobile ? '1rem' : '1.25rem', 
                    fontWeight: '600', 
                    color: '#1f2937',
                    margin: 0
                  }}>
                    Login Activity Trends
                  </h3>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={async () => {
                        // Refresh login data
                        try {
                          await fetchAnalyticsData('login');
                        } catch (error) {
                          console.error('Error refreshing login data:', error);
                        }
                      }}
                      style={{
                        padding: '0.5rem',
                        backgroundColor: '#f3f4f6',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        color: '#6b7280',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                        position: 'relative',
                        zIndex: 10
                      }}
                      title="Refresh Login Data"
                    >
                      <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                      </svg>
                      Refresh
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setShowLoginModal(true);
                        // Refresh login data when opening detailed view
                        try {
                          await fetchAnalyticsData('login');
                        } catch (error) {
                          console.error('Error refreshing login data:', error);
                        }
                      }}
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
                <div style={{ height: isMobile ? '200px' : '300px', position: 'relative' }}>
                  {(() => {
                    const todayLogins = analyticsData.analytics.loginStats.todayLogins || 0;
                    const weeklyLogins = analyticsData.analytics.loginStats.weeklyLogins || 0;
                    const monthlyLogins = analyticsData.analytics.loginStats.monthlyLogins || 0;
                    const dailyBreakdown = analyticsData.analytics.loginStats.dailyBreakdown || [];
                    
                    const total = todayLogins + weeklyLogins + monthlyLogins;
                    
                    // Debug logging for chart data (production: remove console.log)
                    if (process.env.NODE_ENV === 'development') {
                      console.log('📊 Login Chart Debug:', {
                        todayLogins,
                        weeklyLogins,
                        monthlyLogins,
                        total,
                        dailyBreakdown: dailyBreakdown.length
                      });
                    }
                    
                    // If no data for selected date range, show empty state
                    if (total === 0) {
                      return (
                        <EmptyState 
                          title="No Login Data Available"
                          subtitle="No login activity found for the selected date range."
                        />
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

            {/* Team Performance Bar Chart */}
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
              borderRadius: isMobile ? '0.5rem' : '1rem',
              padding: isMobile ? '0.75rem' : '2rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              marginBottom: isMobile ? '0.75rem' : '2rem'
            }}>
              <h3 style={{ 
                fontSize: isMobile ? '1rem' : '1.25rem', 
                fontWeight: '600', 
                color: '#1f2937',
                marginBottom: isMobile ? '0.75rem' : '1.5rem',
                textAlign: 'center'
              }}>
                Team Performance Overview
              </h3>
              <div style={{ height: isMobile ? '200px' : '300px', position: 'relative' }}>
                <Bar
                  data={{
                    labels: analyticsData.analytics.teamPerformance.map((member: any) => 
                      member.memberName || member.workerName || 'Unknown'
                    ).slice(0, 5),
                    datasets: [{
                      label: 'Activity Level',
                      data: analyticsData.analytics.teamPerformance.map((member: any) => 
                        member.activityLevel || 0
                      ).slice(0, 5),
                      backgroundColor: 'rgba(59, 130, 246, 0.8)',
                      borderColor: 'rgba(59, 130, 246, 1)',
                      borderWidth: 1
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                          callback: (value) => `${value}%`
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>

            {/* Work Readiness Activity Chart */}
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
              borderRadius: isMobile ? '1rem' : '1rem',
              padding: '1.5rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              marginBottom: isMobile ? '2rem' : '2rem'
            }}>
         <div style={{ 
           display: 'flex', 
           justifyContent: 'space-between', 
           alignItems: 'center',
                  marginBottom: isMobile ? '1.5rem' : '1.5rem'
         }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
             <h3 style={{ 
               fontSize: isMobile ? '1rem' : '1.25rem', 
               fontWeight: '600', 
               color: '#1f2937',
               margin: '0'
             }}>
               Activity
             </h3>
             <button
               onClick={() => setReadinessModalOpen(true)}
               style={{
                 padding: '0.5rem',
                 borderRadius: '0.5rem',
                 border: '1px solid #d1d5db',
                 backgroundColor: 'white',
                 color: '#6b7280',
                 cursor: 'pointer',
                 display: 'flex',
                 alignItems: 'center',
                 gap: '0.25rem',
                 fontSize: '0.875rem',
                 transition: 'all 0.2s ease',
                 boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
               }}
               onMouseEnter={(e) => {
                 e.currentTarget.style.backgroundColor = '#f9fafb';
                 e.currentTarget.style.borderColor = '#9ca3af';
                 e.currentTarget.style.color = '#374151';
               }}
               onMouseLeave={(e) => {
                 e.currentTarget.style.backgroundColor = 'white';
                 e.currentTarget.style.borderColor = '#d1d5db';
                 e.currentTarget.style.color = '#6b7280';
               }}
             >
               <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                 <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
               </svg>
               Expand
             </button>
           </div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem',
                  flexDirection: isMobile ? 'column' : 'row',
                  alignSelf: isMobile ? 'flex-start' : 'center',
                  width: '100%'
                }}>
                  {/* Legend */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: isMobile ? '1rem' : '0.5rem',
                    flexWrap: isMobile ? 'wrap' : 'nowrap',
                    width: isMobile ? '100%' : 'auto',
                    justifyContent: isMobile ? 'space-between' : 'flex-start'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: isMobile ? '45%' : 'auto' }}>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: '#9333ea',
                        flexShrink: 0
                      }}></div>
                      <span style={{ fontSize: '0.875rem', color: '#6b7280', whiteSpace: 'nowrap' }}>Not Fit for Work</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: isMobile ? '45%' : 'auto' }}>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: '#3b82f6',
                        flexShrink: 0
                      }}></div>
                      <span style={{ fontSize: '0.875rem', color: '#6b7280', whiteSpace: 'nowrap' }}>Minor Concerns</span>
                    </div>
                  </div>
                  {/* Time Filter Dropdown */}
                  <div style={{ marginTop: isMobile ? '1rem' : '0', width: isMobile ? '100%' : 'auto' }}>
                    <select 
                    value={readinessDateRange}
                    onChange={(e) => {
                      e.preventDefault();
                      console.log('Readiness filter changed to:', e.target.value);
                      setReadinessDateRange(e.target.value as 'week' | 'month' | 'year' | 'custom');
                    }}
                    disabled={readinessChartLoading}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #d1d5db',
                      backgroundColor: readinessChartLoading ? '#f9fafb' : 'white',
                      fontSize: '0.875rem',
                      color: readinessChartLoading ? '#9ca3af' : '#374151',
                      cursor: readinessChartLoading ? 'not-allowed' : 'pointer',
                      opacity: readinessChartLoading ? 0.7 : 1,
                      width: isMobile ? '100%' : 'auto'
                    }}
                  >
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="year">This Year</option>
                    <option value="custom">Custom Range</option>
                  </select>
                  </div>
                  
                  {/* Custom Date Range Inputs */}
                  {readinessDateRange === 'custom' && (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
                      <input
                        type="date"
                        value={readinessStartDate.toISOString().split('T')[0]}
                        onChange={(e) => {
                          e.preventDefault();
                          setReadinessStartDate(new Date(e.target.value));
                        }}
                        style={{
                          padding: '0.5rem',
                          borderRadius: '0.375rem',
                          border: '1px solid #d1d5db',
                          fontSize: '0.875rem',
                          backgroundColor: 'white'
                        }}
                      />
                      <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>to</span>
                      <input
                        type="date"
                        value={readinessEndDate.toISOString().split('T')[0]}
                        onChange={(e) => {
                          e.preventDefault();
                          setReadinessEndDate(new Date(e.target.value));
                        }}
                        style={{
                          padding: '0.5rem',
                          borderRadius: '0.375rem',
                          border: '1px solid #d1d5db',
                          fontSize: '0.875rem',
                          backgroundColor: 'white'
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
              
              <div style={{ height: isMobile ? '200px' : '300px', position: 'relative' }}>
                {readinessChartLoading ? (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
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
                      Updating chart data...
                    </p>
                  </div>
                ) : (() => {
                  console.log('Readiness Trend Data:', analyticsData.analytics.readinessTrendData);
                  console.log('Data length:', analyticsData.analytics.readinessTrendData?.length);
                  console.log('Data exists check:', !!analyticsData.analytics.readinessTrendData);
                  console.log('Length > 0 check:', analyticsData.analytics.readinessTrendData?.length > 0);
                  
                  if (analyticsData.analytics.readinessTrendData && analyticsData.analytics.readinessTrendData.length > 0) {
                    console.log('First few data points:', analyticsData.analytics.readinessTrendData.slice(0, 3));
                  }
                  
                  // More robust check for data
                  const hasData = analyticsData.analytics.readinessTrendData && 
                                Array.isArray(analyticsData.analytics.readinessTrendData) && 
                                analyticsData.analytics.readinessTrendData.length > 0;
                  
                  console.log('Final hasData check:', hasData);
                  
                  return hasData ? (
                  <Line
                    data={{
                      labels: analyticsData.analytics.readinessTrendData.map((item: TrendDataItem) => 
                        new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      ),
                      datasets: [
                        {
                          label: 'Not Fit for Work',
                          data: analyticsData.analytics.readinessTrendData.map((item: TrendDataItem) => item.notFitForWork),
                          borderColor: 'rgba(147, 51, 234, 1)',
                          backgroundColor: 'rgba(147, 51, 234, 0.1)',
                          fill: true,
                          tension: 0.4,
                          pointBackgroundColor: 'rgba(147, 51, 234, 1)',
                          pointBorderColor: 'rgba(147, 51, 234, 1)',
                          pointRadius: 3,
                          pointHoverRadius: 6,
                          pointHoverBackgroundColor: 'rgba(147, 51, 234, 1)',
                          pointHoverBorderColor: 'rgba(147, 51, 234, 1)',
                          pointHoverBorderWidth: 2,
                          borderWidth: 2
                        },
                        {
                          label: 'Minor Concerns Fit for Work',
                          data: analyticsData.analytics.readinessTrendData.map((item: TrendDataItem) => item.minorConcernsFitForWork),
                          borderColor: 'rgba(59, 130, 246, 1)',
                          backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          fill: true,
                          tension: 0.4,
                          pointBackgroundColor: 'rgba(59, 130, 246, 1)',
                          pointBorderColor: 'rgba(59, 130, 246, 1)',
                          pointRadius: 3,
                          pointHoverRadius: 6,
                          pointHoverBackgroundColor: 'rgba(59, 130, 246, 1)',
                          pointHoverBorderColor: 'rgba(59, 130, 246, 1)',
                          pointHoverBorderWidth: 2,
                          borderWidth: 2
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false // We have custom legend above
                        },
                        tooltip: {
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          titleColor: 'white',
                          bodyColor: 'white',
                          borderColor: 'rgba(255, 255, 255, 0.1)',
                          borderWidth: 1,
                          cornerRadius: 8,
                          displayColors: true,
                          callbacks: {
                            title: function(context) {
                              return new Date(context[0].label).toLocaleDateString('en-US', { 
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              });
                            },
                            label: function(context) {
                              return `${context.dataset.label}: ${context.parsed.y} assessment${context.parsed.y !== 1 ? 's' : ''}`;
                            }
                          }
                        }
                      },
                      scales: {
                        x: {
                          grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawTicks: false
                          },
                          ticks: {
                            color: '#6b7280',
                            font: {
                              size: 11
                            },
                            maxTicksLimit: 8
                          }
                        },
                        y: {
                          beginAtZero: true,
                          grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawTicks: false
                          },
                          ticks: {
                            color: '#6b7280',
                            font: {
                              size: 11
                            },
                            stepSize: 1,
                            callback: function(value) {
                              return value === 0 ? '0' : value;
                            }
                          }
                        }
                      },
                      interaction: {
                        intersect: false,
                        mode: 'index'
                      },
                      elements: {
                        point: {
                          radius: 3,
                          hoverRadius: 6
                        },
                        line: {
                          borderWidth: 2
                        }
                      }
                    }}
                  />
                ) : (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: '#9ca3af'
                  }}>
                    <svg width="48" height="48" fill="currentColor" viewBox="0 0 24 24" style={{ marginBottom: '1rem', opacity: 0.5 }}>
                      <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                    </svg>
                    <p style={{ fontSize: '1rem', fontWeight: '500', margin: '0 0 0.5rem 0' }}>
                      No Readiness Data Available
                    </p>
                    <p style={{ fontSize: '0.875rem', margin: '0' }}>
                      Work readiness assessments will appear here
                    </p>
                  </div>
                );
                })()}
              </div>
            </div>

            {/* Additional Analytics Cards */}
            <div style={{ 
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              flexWrap: isMobile ? 'nowrap' : 'wrap',
              gap: isMobile ? '2rem' : '1.5rem',
              marginBottom: isMobile ? '2rem' : '2rem'
            }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.25)',
                backdropFilter: 'blur(20px)',
                borderRadius: isMobile ? '1rem' : '1rem',
                padding: isMobile ? '1.5rem' : '1.5rem',
                width: isMobile ? '100%' : 'auto',
                flex: isMobile ? 'none' : '1',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ 
                    width: isMobile ? '2rem' : '3rem', 
                    height: isMobile ? '2rem' : '3rem', 
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
                borderRadius: isMobile ? '1rem' : '1rem',
                padding: isMobile ? '1.5rem' : '1.5rem',
                width: isMobile ? '100%' : 'auto',
                flex: isMobile ? 'none' : '1',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ 
                    width: isMobile ? '2rem' : '3rem', 
                    height: isMobile ? '2rem' : '3rem', 
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
                borderRadius: isMobile ? '1rem' : '1rem',
                padding: isMobile ? '1.5rem' : '1.5rem',
                width: isMobile ? '100%' : 'auto',
                flex: isMobile ? 'none' : '1',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ 
                    width: isMobile ? '2rem' : '3rem', 
                    height: isMobile ? '2rem' : '3rem', 
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

            {/* Emissions Trend Chart - Work Readiness Analytics */}
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
              borderRadius: isMobile ? '1rem' : '1rem',
              padding: '1.5rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              marginBottom: isMobile ? '2rem' : '2rem'
            }}>
              <TrendChart
                title={`Emissions Trend - Work Readiness Analytics ${analyticsData?.analytics?.readinessTrendData?.length > 0 ? `(${analyticsData.analytics.readinessTrendData.length} ${analyticsData.analytics.readinessTrendData.length === 1 ? 'date' : 'dates'} with data)` : '(No submissions yet)'}`}
                data={analyticsData?.analytics?.readinessTrendData?.length > 0 ? analyticsData.analytics.readinessTrendData.map((item: TrendDataItem) => ({
                  date: item.date,
                  fitForWork: item.fitForWork,
                  minorConcernsFitForWork: item.minorConcernsFitForWork,
                  notFitForWork: item.notFitForWork,
                  total: item.total
                })) : []}
                isLoading={readinessChartLoading}
                height={400}
                externalTimePeriod={readinessDateRange === 'custom' ? 'week' : readinessDateRange as 'week' | 'month' | 'year'}
                onTimePeriodChange={(period) => {
                  console.log('🔄 TeamAnalytics: Time period changed to:', period);
                  console.log('🗑️ TeamAnalytics: Clearing cache for date range change...');
                  
                  // Clear work readiness trend cache
                  SupabaseAPI.clearCache('work-readiness-trend');
                  
                  // Update the date range state
                  if (period === 'week') {
                    setReadinessDateRange('week');
                    setReadinessStartDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
                    setReadinessEndDate(new Date());
                    console.log('📅 TeamAnalytics: Set to WEEK range (last 7 days)');
                  } else if (period === 'month') {
                    setReadinessDateRange('month');
                    setReadinessStartDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
                    setReadinessEndDate(new Date());
                    console.log('📅 TeamAnalytics: Set to MONTH range (last 30 days)');
                  } else if (period === 'year') {
                    setReadinessDateRange('year');
                    setReadinessStartDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000));
                    setReadinessEndDate(new Date());
                    console.log('📅 TeamAnalytics: Set to YEAR range (last 365 days)');
                  }
                  // The useEffect will automatically trigger and fetch new data
                }}
              />
              
              {/* Database Connection Status */}
              <div style={{ 
                marginTop: '1rem', 
                padding: '1rem', 
                backgroundColor: '#f8fafc', 
                borderRadius: '0.5rem',
                border: '1px solid #e2e8f0'
              }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                  📊 Connected to live database • Team: <code>{analyticsData?.teamLeader?.team || 'Loading...'}</code>
                </Typography>
                <Typography variant="caption" sx={{ color: '#6366f1', fontSize: '0.75rem', ml: 1 }}>
                  • Filter: <strong>{readinessDateRange.toUpperCase()}</strong>
                </Typography>
                {analyticsData?.analytics?.readinessTrendData?.length > 0 && (
                  <>
                    <Typography variant="caption" sx={{ color: '#10b981', fontSize: '0.75rem', ml: 1 }}>
                      • ✅ {analyticsData.analytics.readinessTrendData.length} {analyticsData.analytics.readinessTrendData.length === 1 ? 'date' : 'dates'} with submissions
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#059669', fontSize: '0.75rem', ml: 1 }}>
                      • {analyticsData.analytics.readinessTrendData.reduce((sum, item) => sum + item.total, 0)} total submissions
                    </Typography>
                  </>
                )}
              </div>
            </div>

            {/* Charts Section - Full Width */}
            <div style={{ 
              display: isMobile ? 'flex' : 'grid', 
              flexDirection: isMobile ? 'column' : 'row',
              gridTemplateColumns: '2fr 1fr', 
              gap: isMobile ? '3rem' : '1.5rem',
              marginBottom: isMobile ? '3rem' : '2rem'
            }}>
              {/* Team Performance Table - Takes 2/3 of space */}
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)',
                borderRadius: isMobile ? '1rem' : '1rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  padding: isMobile ? '1.5rem' : '1.5rem', 
                  borderBottom: '1px solid rgba(229, 231, 235, 0.5)' 
                }}>
                  <h3 style={{ 
                    fontSize: isMobile ? '1rem' : '1.25rem', 
                    fontWeight: '600', 
                    color: '#1f2937',
                    margin: '0'
                  }}>
                    Team Performance Overview
                  </h3>
                </div>
                <div style={{ overflowX: 'auto', maxHeight: '500px' }}>
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse',
                    minWidth: '600px'
                  }}>
                    <thead style={{ backgroundColor: 'rgba(249, 250, 251, 0.8)', position: 'sticky', top: 0 }}>
                      <tr>
                        <th style={{ 
                          padding: '1rem 1.5rem', 
                          textAlign: 'left', 
                          fontSize: '0.875rem', 
                          fontWeight: '600', 
                          color: '#374151', 
                          textTransform: 'uppercase', 
                          letterSpacing: '0.05em',
                          borderBottom: '1px solid rgba(229, 231, 235, 0.5)'
                        }}>
                        Team Member
                      </th>
                        <th style={{ 
                          padding: '1rem 1.5rem', 
                          textAlign: 'left', 
                          fontSize: '0.875rem', 
                          fontWeight: '600', 
                          color: '#374151', 
                          textTransform: 'uppercase', 
                          letterSpacing: '0.05em',
                          borderBottom: '1px solid rgba(229, 231, 235, 0.5)'
                        }}>
                          Work Readiness Status
                      </th>
                        <th style={{ 
                          padding: '1rem 1.5rem', 
                          textAlign: 'left', 
                          fontSize: '0.875rem', 
                          fontWeight: '600', 
                          color: '#374151', 
                          textTransform: 'uppercase', 
                          letterSpacing: '0.05em',
                          borderBottom: '1px solid rgba(229, 231, 235, 0.5)'
                        }}>
                          Last Login
                      </th>
                        <th style={{ 
                          padding: '1rem 1.5rem', 
                          textAlign: 'left', 
                          fontSize: '0.875rem', 
                          fontWeight: '600', 
                          color: '#374151', 
                          textTransform: 'uppercase', 
                          letterSpacing: '0.05em',
                          borderBottom: '1px solid rgba(229, 231, 235, 0.5)'
                        }}>
                          Activity Level
                      </th>
                    </tr>
                  </thead>
                    <tbody>
                      {analyticsData.analytics.teamPerformance && analyticsData.analytics.teamPerformance.length > 0 ? (
                        analyticsData.analytics.teamPerformance.map((member: any, index: number) => (
                          <tr key={member.memberId || index} style={{ 
                            borderBottom: '1px solid rgba(229, 231, 235, 0.3)',
                            backgroundColor: index % 2 === 0 ? 'rgba(255, 255, 255, 0.5)' : 'rgba(249, 250, 251, 0.3)'
                          }}>
                            <td style={{ 
                              padding: '1.25rem 1.5rem', 
                              fontSize: '0.875rem', 
                              fontWeight: '500', 
                              color: '#1f2937'
                            }}>
                              {member.memberName || member.workerName || 'Unknown Member'}
                        </td>
                            <td style={{ padding: '1.25rem 1.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <div style={{ 
                                  width: '10px', 
                                  height: '10px', 
                                  borderRadius: '50%', 
                                  backgroundColor: member.workReadinessStatus === 'Completed' ? '#22c55e' : 
                                                 member.workReadinessStatus === 'In Progress' ? '#f59e0b' : 
                                                 member.workReadinessStatus === 'Pending' ? '#3b82f6' : '#6b7280',
                                  marginRight: '0.75rem'
                                }}></div>
                                <span style={{ 
                                  fontSize: '0.875rem', 
                                  color: member.workReadinessStatus === 'Completed' ? '#059669' : 
                                         member.workReadinessStatus === 'In Progress' ? '#d97706' : 
                                         member.workReadinessStatus === 'Pending' ? '#2563eb' : '#6b7280',
                                  textTransform: 'capitalize',
                                  fontWeight: '500'
                                }}>
                                  {member.workReadinessStatus || 'Not Started'}
                                </span>
                              </div>
                        </td>
                            <td style={{ 
                              padding: '1.25rem 1.5rem', 
                              fontSize: '0.875rem', 
                              color: '#6b7280',
                              fontWeight: '500'
                            }}>
                              {member.lastLogin ? new Date(member.lastLogin).toLocaleDateString() : 'Never'}
                        </td>
                            <td style={{ padding: '1.25rem 1.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <div style={{ 
                                  width: '80px', 
                                  backgroundColor: 'rgba(229, 231, 235, 0.5)', 
                                  borderRadius: '9999px', 
                                  height: '10px', 
                                  marginRight: '0.75rem',
                                  overflow: 'hidden'
                                }}>
                                  <div 
                                    style={{ 
                                      backgroundColor: member.activityLevel >= 70 ? '#22c55e' : 
                                                      member.activityLevel >= 40 ? '#f59e0b' : '#ef4444', 
                                      height: '100%', 
                                      borderRadius: '9999px',
                                      width: `${member.activityLevel || 0}%`,
                                      transition: 'width 0.3s ease'
                                    }}
                              ></div>
                            </div>
                                <span style={{ 
                                  fontSize: '0.875rem', 
                                  color: member.activityLevel >= 70 ? '#059669' : 
                                         member.activityLevel >= 40 ? '#d97706' : '#dc2626',
                                  fontWeight: '600'
                                }}>
                                  {member.activityLevel || 0}%
                                </span>
                          </div>
                        </td>
                      </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} style={{ 
                            padding: '3rem 1.5rem', 
                            textAlign: 'center', 
                            color: '#6b7280',
                            fontSize: '1rem',
                            fontWeight: '500'
                          }}>
                            No team performance data available
                          </td>
                        </tr>
                      )}
                  </tbody>
                </table>
                </div>
              </div>

              {/* Work Readiness Progress Chart - Takes 1/3 of space */}
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)',
                borderRadius: isMobile ? '1rem' : '1rem',
                padding: isMobile ? '1.5rem' : '1.5rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                height: 'fit-content'
              }}>
                <h3 style={{ 
                  fontSize: isMobile ? '1rem' : '1.25rem', 
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
            </div>

            {/* Login Activity Chart - Full Width */}
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
              borderRadius: isMobile ? '1rem' : '1rem',
              padding: isMobile ? '1.5rem' : '2rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <h3 style={{ 
                fontSize: isMobile ? '1.25rem' : '1.5rem', 
                fontWeight: '600', 
                color: '#1f2937',
                margin: '0 0 2rem 0'
              }}>
                Login Activity Overview
              </h3>
              
              <div style={{ 
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                flexWrap: isMobile ? 'nowrap' : 'wrap',
                gap: isMobile ? '2rem' : '1.5rem'
              }}>
                <div style={{
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  borderRadius: isMobile ? '1rem' : '1rem',
                  padding: isMobile ? '1.5rem' : '2rem',
                  textAlign: 'center',
                  border: '2px solid rgba(59, 130, 246, 0.2)',
                  width: isMobile ? '100%' : 'auto',
                  flex: isMobile ? 'none' : '1'
                }}>
                  <div style={{ fontSize: '3rem', fontWeight: '700', color: '#3b82f6', marginBottom: '1rem' }}>
                    {analyticsData.analytics.loginStats.todayLogins}
                  </div>
                  <div style={{ fontSize: '1rem', color: '#6b7280', fontWeight: '600' }}>
                    Today's Logins
                  </div>
                </div>

                <div style={{
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  borderRadius: isMobile ? '1rem' : '1rem',
                  padding: isMobile ? '1.5rem' : '2rem',
                  textAlign: 'center',
                  border: '2px solid rgba(34, 197, 94, 0.2)',
                  width: isMobile ? '100%' : 'auto',
                  flex: isMobile ? 'none' : '1'
                }}>
                  <div style={{ fontSize: '3rem', fontWeight: '700', color: '#22c55e', marginBottom: '1rem' }}>
                    {analyticsData.analytics.loginStats.weeklyLogins}
                  </div>
                  <div style={{ fontSize: '1rem', color: '#6b7280', fontWeight: '600' }}>
                    This Week
                  </div>
                </div>

                <div style={{
                  backgroundColor: 'rgba(147, 51, 234, 0.1)',
                  borderRadius: isMobile ? '1rem' : '1rem',
                  padding: isMobile ? '1.5rem' : '2rem',
                  textAlign: 'center',
                  border: '2px solid rgba(147, 51, 234, 0.2)'
                }}>
                  <div style={{ fontSize: '3rem', fontWeight: '700', color: '#9333ea', marginBottom: '1rem' }}>
                    {analyticsData.analytics.loginStats.monthlyLogins}
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
            padding: isMobile ? '0' : '2rem'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: isMobile ? '0' : '1rem',
              padding: isMobile ? '0.75rem' : '2rem',
              maxWidth: '100vw',
              width: '100%',
              maxHeight: '100vh',
              overflow: 'auto',
              position: 'relative',
              boxShadow: isMobile ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
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
                  fontSize: isMobile ? '1.25rem' : '1.5rem'
                }}
              >
                ×
              </button>
              
              <h2 style={{
                fontSize: isMobile ? '1.25rem' : '1.5rem',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: isMobile ? '0.75rem' : '1rem',
                textAlign: 'center'
              }}>
                Work Readiness Distribution - Detailed View
              </h2>
              
              {/* Date Filter Controls */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: isMobile ? '0.125rem' : '0.5rem',
                marginBottom: isMobile ? '0.75rem' : '1.5rem',
                flexWrap: 'wrap'
              }}>
                {['week', 'month', 'year', 'custom'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setWorkReadinessDateRange(range as any)}
                    style={{
                      padding: isMobile ? '0.25rem 0.5rem' : '0.5rem 1rem',
                      borderRadius: '0.5rem',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      backgroundColor: workReadinessDateRange === range ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                      color: workReadinessDateRange === range ? '#3b82f6' : '#6b7280',
                      fontWeight: workReadinessDateRange === range ? 600 : 500,
                      fontSize: isMobile ? '0.625rem' : '0.875rem',
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
                    fetchAnalyticsData('workReadiness');
                  }}
                  disabled={loading}
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
                  marginBottom: isMobile ? '0.75rem' : '1.5rem',
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
                  const notStarted = analyticsData.analytics.workReadinessStats.notStarted || 
                    ((analyticsData.analytics.workReadinessStats.total || 0) - 
                     ((analyticsData.analytics.workReadinessStats.completed || 0) + 
                      (analyticsData.analytics.workReadinessStats.pending || 0)));
                  
                  const total = completed + pending + notStarted;
                  
                  // Debug logging
                  console.log('🔍 Detailed View Debug:', {
                    completed,
                    pending,
                    notStarted,
                    total,
                    workReadinessStats: analyticsData.analytics.workReadinessStats
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
                        labels: ['Completed', 'Pending', 'Not Started'],
                        datasets: [{
                          data: [completed, pending, notStarted],
                          backgroundColor: [
                            'rgba(34, 197, 94, 0.8)', // Green for completed
                            'rgba(245, 158, 11, 0.8)', // Orange for pending
                            'rgba(239, 68, 68, 0.8)' // Red for not started
                          ],
                          borderColor: [
                            'rgba(34, 197, 94, 1)',
                            'rgba(245, 158, 11, 1)',
                            'rgba(239, 68, 68, 1)' // Red border for not started
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
                flexDirection: isMobile ? 'column' : 'row',
                flexWrap: isMobile ? 'nowrap' : 'wrap',
                gap: '1rem'
              }}>
                <div style={{
                  backgroundColor: '#f0fdf4',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #bbf7d0'
                }}>
                  <div style={{ fontSize: '0.875rem', color: '#166534', fontWeight: '600' }}>Completed</div>
                  <div style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', color: '#166534', fontWeight: '700' }}>
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
                  <div style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', color: '#92400e', fontWeight: '700' }}>
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
                  <div style={{ fontSize: '0.875rem', color: '#991b1b', fontWeight: '600' }}>Not Started</div>
                  <div style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', color: '#991b1b', fontWeight: '700' }}>
                    {analyticsData.analytics.workReadinessStats.notStarted || 
                     ((analyticsData.analytics.workReadinessStats.total || 0) - 
                      ((analyticsData.analytics.workReadinessStats.completed || 0) + 
                       (analyticsData.analytics.workReadinessStats.pending || 0)))}
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
          
          // Debug logging
          console.log('🔍 Login Modal Debug:', {
            todayLogins,
            weeklyLogins,
            monthlyLogins,
            total,
            loginStats: analyticsData.analytics.loginStats
          });
          
          // If no data, show empty state instead of closing modal
          if (total === 0) {
            console.log('❌ No login data available, showing empty state');
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
                zIndex: 1000
              }}>
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '1rem',
                  padding: '2rem',
                  maxWidth: '500px',
                  width: '90%',
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
                      fontSize: '1.5rem'
                    }}
                  >
                    ×
                  </button>
                  
                  <h2 style={{
                    fontSize: '1.5rem',
                    fontWeight: '600',
                    color: '#1f2937',
                    marginBottom: '1rem',
                    textAlign: 'center'
                  }}>
                    Login Activity Trends - Detailed View
                  </h2>
                  
                  <div style={{
                    height: '300px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6b7280'
                  }}>
                    <div style={{
                      width: '120px',
                      height: '120px',
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
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                      No Login Data Available
                    </h3>
                    <p style={{ fontSize: '0.875rem', textAlign: 'center' }}>
                      No login activity found for the selected date range.
                    </p>
                  </div>
                </div>
              </div>
            );
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
            padding: isMobile ? '0.75rem' : '2rem'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: isMobile ? '0.5rem' : '1rem',
              padding: isMobile ? '0.75rem' : '2rem',
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
                  fontSize: isMobile ? '1.25rem' : '1.5rem'
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
                  fontSize: isMobile ? '1.25rem' : '1.5rem',
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
                marginBottom: isMobile ? '0.75rem' : '1.5rem',
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
                    fetchAnalyticsData('login');
                  }}
                  disabled={loading}
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
                  marginBottom: isMobile ? '0.75rem' : '1.5rem',
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
                  const dailyBreakdown = analyticsData.analytics.loginStats.dailyBreakdown || [];
                  
                  const total = todayLogins + weeklyLogins + monthlyLogins;
                  
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
                flexDirection: isMobile ? 'column' : 'row',
                flexWrap: isMobile ? 'nowrap' : 'wrap',
                gap: '1rem'
              }}>
                <div style={{
                  backgroundColor: '#f0f9ff',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #bae6fd'
                }}>
                  <div style={{ fontSize: '0.875rem', color: '#0369a1', fontWeight: '600' }}>Today's Logins</div>
                  <div style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', color: '#0369a1', fontWeight: '700' }}>
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
                  <div style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', color: '#166534', fontWeight: '700' }}>
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
                  <div style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', color: '#92400e', fontWeight: '700' }}>
                    {analyticsData.analytics.loginStats.monthlyLogins || 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
          );
        })()}

        {/* Work Readiness Activity Modal */}
        {readinessModalOpen && (
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
            padding: isMobile ? '0.75rem' : '2rem'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: isMobile ? '0.5rem' : '1rem',
              padding: isMobile ? '0.75rem' : '2rem',
              maxWidth: '90vw',
              maxHeight: '90vh',
              width: '1000px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              position: 'relative',
              overflow: 'auto'
            }}>
              {/* Close Button */}
              <button
                onClick={() => setReadinessModalOpen(false)}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  backgroundColor: '#f3f4f6',
                  color: '#6b7280',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '2rem',
                  height: '2rem',
                  fontSize: isMobile ? '1rem' : '1.25rem',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#e5e7eb';
                  e.currentTarget.style.color = '#374151';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                  e.currentTarget.style.color = '#6b7280';
                }}
              >
                ×
              </button>

              {/* Modal Header */}
              <div style={{ marginBottom: '2rem' }}>
                <h2 style={{
                  fontSize: isMobile ? '1.25rem' : '1.5rem',
                  fontWeight: '600',
                  color: '#1f2937',
                  margin: '0 0 0.5rem 0'
                }}>
                  Work Readiness Activity - Detailed View
                </h2>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#6b7280',
                  margin: '0'
                }}>
                  Monitor work readiness trends over time
                </p>
              </div>

              {/* Filter Controls */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: isMobile ? '0.75rem' : '2rem',
                padding: '1rem',
                backgroundColor: '#f9fafb',
                borderRadius: '0.75rem',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {/* Legend */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: '#9333ea'
                    }}></div>
                    <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Not Fit for Work</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: '#3b82f6'
                    }}></div>
                    <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Minor Concerns Fit for Work</span>
                  </div>
                </div>
                
                {/* Time Filter Dropdown */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <select 
                    value={readinessDateRange}
                    onChange={(e) => {
                      e.preventDefault();
                      console.log('Modal readiness filter changed to:', e.target.value);
                      setReadinessDateRange(e.target.value as 'week' | 'month' | 'year' | 'custom');
                    }}
                    disabled={readinessChartLoading}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '0.5rem',
                      border: '1px solid #d1d5db',
                      backgroundColor: readinessChartLoading ? '#f9fafb' : 'white',
                      fontSize: '0.875rem',
                      color: readinessChartLoading ? '#9ca3af' : '#374151',
                      cursor: readinessChartLoading ? 'not-allowed' : 'pointer',
                      opacity: readinessChartLoading ? 0.7 : 1,
                      minWidth: '120px'
                    }}
                  >
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="year">This Year</option>
                    <option value="custom">Custom Range</option>
                  </select>
                  
                  {/* Custom Date Range Inputs */}
                  {readinessDateRange === 'custom' && (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="date"
                        value={readinessStartDate.toISOString().split('T')[0]}
                        onChange={(e) => {
                          e.preventDefault();
                          setReadinessStartDate(new Date(e.target.value));
                        }}
                        style={{
                          padding: '0.75rem',
                          borderRadius: '0.375rem',
                          border: '1px solid #d1d5db',
                          fontSize: '0.875rem',
                          backgroundColor: 'white'
                        }}
                      />
                      <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>to</span>
                      <input
                        type="date"
                        value={readinessEndDate.toISOString().split('T')[0]}
                        onChange={(e) => {
                          e.preventDefault();
                          setReadinessEndDate(new Date(e.target.value));
                        }}
                        style={{
                          padding: '0.75rem',
                          borderRadius: '0.375rem',
                          border: '1px solid #d1d5db',
                          fontSize: '0.875rem',
                          backgroundColor: 'white'
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
              
              {/* Chart Container */}
              <div style={{ height: '500px', position: 'relative' }}>
                {readinessChartLoading ? (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
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
                      Updating chart data...
                    </p>
                  </div>
                ) : analyticsData?.analytics?.readinessTrendData && 
                   Array.isArray(analyticsData.analytics.readinessTrendData) && 
                   analyticsData.analytics.readinessTrendData.length > 0 ? (
                  <Line
                    data={{
                      labels: analyticsData.analytics.readinessTrendData.map((item: TrendDataItem) => 
                        new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      ),
                      datasets: [
                        {
                          label: 'Not Fit for Work',
                          data: analyticsData.analytics.readinessTrendData.map((item: TrendDataItem) => item.notFitForWork),
                          borderColor: 'rgba(147, 51, 234, 1)',
                          backgroundColor: 'rgba(147, 51, 234, 0.1)',
                          fill: true,
                          tension: 0.4,
                          pointBackgroundColor: 'rgba(147, 51, 234, 1)',
                          pointBorderColor: 'rgba(147, 51, 234, 1)',
                          pointRadius: 4,
                          pointHoverRadius: 8,
                          pointHoverBackgroundColor: 'rgba(147, 51, 234, 1)',
                          pointHoverBorderColor: 'rgba(147, 51, 234, 1)',
                          pointHoverBorderWidth: 2,
                          borderWidth: 3
                        },
                        {
                          label: 'Minor Concerns Fit for Work',
                          data: analyticsData.analytics.readinessTrendData.map((item: TrendDataItem) => item.minorConcernsFitForWork),
                          borderColor: 'rgba(59, 130, 246, 1)',
                          backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          fill: true,
                          tension: 0.4,
                          pointBackgroundColor: 'rgba(59, 130, 246, 1)',
                          pointBorderColor: 'rgba(59, 130, 246, 1)',
                          pointRadius: 4,
                          pointHoverRadius: 8,
                          pointHoverBackgroundColor: 'rgba(59, 130, 246, 1)',
                          pointHoverBorderColor: 'rgba(59, 130, 246, 1)',
                          pointHoverBorderWidth: 2,
                          borderWidth: 3
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false // We have custom legend above
                        },
                        tooltip: {
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          titleColor: 'white',
                          bodyColor: 'white',
                          borderColor: 'rgba(255, 255, 255, 0.1)',
                          borderWidth: 1,
                          cornerRadius: 8,
                          displayColors: true,
                          callbacks: {
                            title: function(context) {
                              return new Date(context[0].label).toLocaleDateString('en-US', { 
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              });
                            },
                            label: function(context) {
                              return `${context.dataset.label}: ${context.parsed.y} assessment${context.parsed.y !== 1 ? 's' : ''}`;
                            }
                          }
                        }
                      },
                      scales: {
                        x: {
                          grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawTicks: false
                          },
                          ticks: {
                            color: '#6b7280',
                            font: {
                              size: 12
                            },
                            maxTicksLimit: 12
                          }
                        },
                        y: {
                          beginAtZero: true,
                          grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawTicks: false
                          },
                          ticks: {
                            color: '#6b7280',
                            font: {
                              size: 12
                            },
                            stepSize: 1,
                            callback: function(value) {
                              return value === 0 ? '0' : value;
                            }
                          }
                        }
                      },
                      interaction: {
                        intersect: false,
                        mode: 'index'
                      },
                      elements: {
                        point: {
                          radius: 4,
                          hoverRadius: 8
                        },
                        line: {
                          borderWidth: 3
                        }
                      }
                    }}
                  />
                ) : (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: '#9ca3af'
                  }}>
                    <svg width="64" height="64" fill="currentColor" viewBox="0 0 24 24" style={{ marginBottom: '1rem', opacity: 0.5 }}>
                      <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                    </svg>
                    <p style={{ fontSize: '1.125rem', fontWeight: '500', margin: '0 0 0.5rem 0' }}>
                      No Readiness Data Available
                    </p>
                    <p style={{ fontSize: '0.875rem', margin: '0' }}>
                      Work readiness assessments will appear here
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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
            padding: isMobile ? '0' : '0.5rem'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: isMobile ? '0' : '0.75rem',
              padding: isMobile ? '0.75rem' : '2rem',
              maxWidth: '100vw',
              maxHeight: '100vh',
              width: '100%',
              height: '100%',
              overflow: 'auto',
              position: 'relative',
              animation: 'modalSlideIn 0.3s ease-out',
              boxShadow: isMobile ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}>
              {/* Modal Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: isMobile ? '0.75rem' : '2rem',
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
                    fontSize: isMobile ? '1rem' : '1.5rem',
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
                gap: isMobile ? '0.25rem' : '1rem',
                marginBottom: isMobile ? '0.75rem' : '2rem',
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
                    fetchAnalyticsData('login');
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
                  marginBottom: isMobile ? '0.75rem' : '2rem',
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
              <div style={{ height: isMobile ? '300px' : '600px', position: 'relative' }}>
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
                  const dailyBreakdown = analyticsData.analytics.loginStats.dailyBreakdown || [];
                  
                  const total = todayLogins + weeklyLogins + monthlyLogins;
                  
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
                marginTop: isMobile ? '1rem' : '2rem',
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                flexWrap: isMobile ? 'nowrap' : 'wrap',
                gap: isMobile ? '0.25rem' : '1rem'
              }}>
                <div style={{
                  backgroundColor: '#f0f9ff',
                  padding: isMobile ? '0.5rem' : '1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #bae6fd'
                }}>
                  <div style={{ fontSize: isMobile ? '0.75rem' : '0.875rem', color: '#0369a1', fontWeight: '600' }}>Today's Logins</div>
                  <div style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', color: '#0369a1', fontWeight: '700' }}>
                    {analyticsData?.analytics?.loginStats?.todayLogins || 0}
                  </div>
                </div>
                <div style={{
                  backgroundColor: '#f0fdf4',
                  padding: isMobile ? '0.5rem' : '1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #bbf7d0'
                }}>
                  <div style={{ fontSize: isMobile ? '0.75rem' : '0.875rem', color: '#166534', fontWeight: '600' }}>Weekly Logins</div>
                  <div style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', color: '#166534', fontWeight: '700' }}>
                    {analyticsData?.analytics?.loginStats?.weeklyLogins || 0}
                  </div>
                </div>
                <div style={{
                  backgroundColor: '#fef3c7',
                  padding: isMobile ? '0.5rem' : '1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #fde68a'
                }}>
                  <div style={{ fontSize: isMobile ? '0.75rem' : '0.875rem', color: '#92400e', fontWeight: '600' }}>Monthly Logins</div>
                  <div style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', color: '#92400e', fontWeight: '700' }}>
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
});

TeamAnalytics.displayName = 'TeamAnalytics';

export default TeamAnalytics;