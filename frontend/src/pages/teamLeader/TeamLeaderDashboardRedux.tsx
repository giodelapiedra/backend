import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext.supabase';
import {
  useGetTeamLeaderAnalyticsQuery,
  useGetWorkReadinessTrendQuery,
  useGetWorkReadinessAssignmentsQuery,
  useGetMonthlyPerformanceQuery,
} from '../../store/api/teamLeaderApi';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  setMainTab,
  setSelectedDate,
  setFilterStatus,
  setShowInactive,
  setSorting,
  resetFilters,
  resetToToday,
} from '../../store/slices/teamLeaderSlice';
import { useWorkReadinessRealtime, useTeamRealtime } from '../../hooks/useRealtime';
import { SupabaseAPI } from '../../utils/supabaseApi';
import LoadingSpinner from '../../components/LoadingSpinner';
import Toast from '../../components/Toast';
import LayoutWithSidebar from '../../components/LayoutWithSidebar';
import { getProfileImageProps } from '../../utils/imageUtils';
import { dataClient } from '../../lib/supabase';
import { Line } from 'react-chartjs-2';
import { Box, Typography, Button, Card, CardContent, Grid, Fade, Tabs, Tab } from '@mui/material';
import {
  People,
  TrendingUp,
  Assignment,
  CheckCircle,
  Timeline
} from '@mui/icons-material';
import StatCard from '../../components/StatCard';
import TrendChart from '../../components/TrendChart';
import RecentActivityItem from '../../components/RecentActivityItem';
import TeamKPIDashboard from '../../components/TeamKPIDashboard';
import MonthlyPerformanceSection from '../../components/MonthlyPerformanceSection';
import MonthlyAssignmentTracking from '../../components/MonthlyAssignmentTracking';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title as ChartTitle,
  Tooltip as ChartTooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ChartTitle,
  ChartTooltip,
  Legend,
  Filler
);

// Modern SaaS Color Palette
const COLORS = {
  primary: {
    main: '#6366f1',
    light: '#818cf8',
    dark: '#4f46e5',
    bg: 'rgba(99, 102, 241, 0.08)',
  },
  success: {
    main: '#10b981',
    light: '#34d399',
    dark: '#059669',
    bg: 'rgba(16, 185, 129, 0.08)',
  },
  warning: {
    main: '#f59e0b',
    light: '#fbbf24',
    dark: '#d97706',
    bg: 'rgba(245, 158, 11, 0.08)',
  },
  error: {
    main: '#ef4444',
    light: '#f87171',
    dark: '#dc2626',
    bg: 'rgba(239, 68, 68, 0.08)',
  },
  purple: {
    main: '#8b5cf6',
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

const TeamLeaderDashboardRedux: React.FC = () => {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  
  // Redux state
  const {
    mainTab,
    selectedDate,
    filterStatus,
    showInactive,
    sortBy,
    sortOrder,
    selectedMonth,
    selectedYear,
  } = useAppSelector(state => state.teamLeader);

  // Local UI state
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [createTeamLoading, setCreateTeamLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdUser, setCreatedUser] = useState<any>(null);
  
  // Pagination state
  const [teamMembersPage, setTeamMembersPage] = useState(1);
  const [teamMembersPageSize, setTeamMembersPageSize] = useState(10);
  const [activeCasesPage, setActiveCasesPage] = useState(1);
  const [activeCasesPageSize, setActiveCasesPageSize] = useState(5);
  const [notificationsPage, setNotificationsPage] = useState(1);
  const [notificationsPageSize, setNotificationsPageSize] = useState(10);

  // Date range states
  const [readinessDateRange, setReadinessDateRange] = useState<'week' | 'month' | 'year' | 'custom'>('week');
  const [readinessStartDate, setReadinessStartDate] = useState<Date>(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const [readinessEndDate, setReadinessEndDate] = useState<Date>(new Date());

  // Notifications and cases state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [activeCases, setActiveCases] = useState<any[]>([]);
  const [activeCasesLoading, setActiveCasesLoading] = useState(false);
  const [viewDetails, setViewDetails] = useState({ open: false, case: null as any });
  const [searchQuery, setSearchQuery] = useState('');

  // RTK Query hooks - Fetch data from Redux
  const {
    data: analyticsData,
    isLoading: analyticsLoading,
    error: analyticsError,
    refetch: refetchAnalytics
  } = useGetTeamLeaderAnalyticsQuery(user?.id || '', {
    skip: !user?.id,
    pollingInterval: 60000, // Refresh every 60 seconds
  });

  const {
    data: trendData,
    isLoading: trendLoading,
    refetch: refetchTrend
  } = useGetWorkReadinessTrendQuery(
    { teamLeaderId: user?.id || '', days: 7 },
    { skip: !user?.id }
  );

  const {
    data: monthlyData,
    isLoading: monthlyLoading,
    refetch: refetchMonthly
  } = useGetMonthlyPerformanceQuery(
    { teamLeaderId: user?.id || '', year: selectedYear, month: selectedMonth },
    { skip: !user?.id }
  );

  // Real-time subscriptions - removed callback parameter since hooks don't support it
  useWorkReadinessRealtime(user?.id || '');
  useTeamRealtime(user?.id || '');

  // Use useEffect to refetch when data changes
  useEffect(() => {
    if (user?.id) {
      refetchAnalytics();
      refetchTrend();
      refetchMonthly();
    }
  }, [user?.id, refetchAnalytics, refetchTrend, refetchMonthly]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    
    setNotificationsLoading(true);
    try {
      const { data, error } = await dataClient
        .from('notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setNotificationsLoading(false);
    }
  }, [user?.id]);

  // Fetch active cases
  const fetchActiveCases = useCallback(async () => {
    if (!user?.id || !analyticsData?.teamMembers) return;
    
    setActiveCasesLoading(true);
    try {
      const teamMemberIds = analyticsData.teamMembers.map((m: any) => m.id);
      
      if (teamMemberIds.length === 0) {
        setActiveCases([]);
        setActiveCasesLoading(false);
        return;
      }

      const { data, error } = await dataClient
        .from('cases')
        .select(`
          *,
          worker:users!cases_worker_id_fkey(id, first_name, last_name, email)
        `)
        .in('worker_id', teamMemberIds)
        .neq('status', 'closed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActiveCases(data || []);
    } catch (err) {
      console.error('Error fetching active cases:', err);
    } finally {
      setActiveCasesLoading(false);
    }
  }, [user?.id, analyticsData?.teamMembers]);

  // Fetch data on mount and when dependencies change
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    fetchActiveCases();
  }, [fetchActiveCases]);

  // Show loading state
  if (analyticsLoading || !user) {
    return (
      <LayoutWithSidebar>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <LoadingSpinner />
        </Box>
      </LayoutWithSidebar>
    );
  }

  // Show error state
  if (analyticsError) {
    return (
      <LayoutWithSidebar>
        <Box sx={{ p: 3 }}>
          <Typography color="error">
            Failed to load dashboard data. Please refresh the page.
          </Typography>
        </Box>
      </LayoutWithSidebar>
    );
  }

  const { teamMembers = [], metrics, workReadiness = [], todaySubmissions = [] } = analyticsData || {};
  const totalMembers = metrics?.totalMembers || 0;
  const todaySubmissionCount = metrics?.todaySubmissionCount || 0;
  const complianceRate = metrics?.complianceRate || '0.0';
  const loggedInCount = metrics?.loggedInCount || 0;

  // Filter team members based on search and status
  const filteredTeamMembers = useMemo(() => {
    let filtered = teamMembers;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((member: any) =>
        member.first_name?.toLowerCase().includes(query) ||
        member.last_name?.toLowerCase().includes(query) ||
        member.email?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (!showInactive) {
      filtered = filtered.filter((member: any) => member.is_active !== false);
    }

    // Sort
    filtered.sort((a: any, b: any) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'name':
          aVal = `${a.first_name} ${a.last_name}`.toLowerCase();
          bVal = `${b.first_name} ${b.last_name}`.toLowerCase();
          break;
        case 'date':
          aVal = a.created_at || '';
          bVal = b.created_at || '';
          break;
        default:
          aVal = a[sortBy];
          bVal = b[sortBy];
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [teamMembers, searchQuery, showInactive, sortBy, sortOrder]);

  // Paginate team members
  const paginatedTeamMembers = useMemo(() => {
    const start = (teamMembersPage - 1) * teamMembersPageSize;
    const end = start + teamMembersPageSize;
    return filteredTeamMembers.slice(start, end);
  }, [filteredTeamMembers, teamMembersPage, teamMembersPageSize]);

  return (
    <LayoutWithSidebar>
      <Box sx={{ 
        p: { xs: 2, md: 3 }, 
        maxWidth: '1600px', 
        mx: 'auto',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        minHeight: '100vh'
      }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: COLORS.neutral[900], mb: 1 }}>
            Team Leader Dashboard
          </Typography>
          <Typography variant="body1" sx={{ color: COLORS.neutral[600] }}>
            Welcome back, {user?.firstName} {user?.lastName}
          </Typography>
        </Box>

        {/* Key Metrics */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Team Members"
              value={totalMembers}
              icon={<People sx={{ fontSize: 40, color: COLORS.primary.main }} />}
              color={COLORS.primary.main}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Today's Submissions"
              value={todaySubmissionCount}
              icon={<CheckCircle sx={{ fontSize: 40, color: COLORS.success.main }} />}
              color={COLORS.success.main}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Compliance Rate"
              value={`${complianceRate}%`}
              icon={<TrendingUp sx={{ fontSize: 40, color: COLORS.warning.main }} />}
              color={COLORS.warning.main}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Logged In Today"
              value={loggedInCount}
              icon={<Assignment sx={{ fontSize: 40, color: COLORS.purple.main }} />}
              color={COLORS.purple.main}
            />
          </Grid>
        </Grid>

        {/* Tabs */}
        <Box sx={{ px: { xs: 1.5, md: 0 }, mb: 3 }}>
          <Tabs
            value={mainTab}
            onChange={(e, v) => dispatch(setMainTab(v))}
            variant="scrollable"
            scrollButtons
            allowScrollButtonsMobile
            sx={{
              minHeight: 0,
              '& .MuiTabs-flexContainer': {
                gap: 1,
              },
              '& .MuiTab-root': {
                minHeight: 38,
                textTransform: 'none',
                borderRadius: 9999,
                px: 2,
                fontWeight: 600,
                color: '#475569',
                backgroundColor: '#f1f5f9',
              },
              '& .Mui-selected': {
                color: '#111827 !important',
                backgroundColor: '#e0e7ff !important',
              },
              '& .MuiTabs-indicator': {
                display: 'none',
              },
            }}
          >
            <Tab iconPosition="start" icon={<Assignment sx={{ fontSize: 18 }} />} label="Monthly Tracking" />
            <Tab iconPosition="start" icon={<TrendingUp sx={{ fontSize: 18 }} />} label="Team KPI" />
            <Tab iconPosition="start" icon={<People sx={{ fontSize: 18 }} />} label="Team Members" />
            <Tab iconPosition="start" icon={<Timeline sx={{ fontSize: 18 }} />} label="Weekly Goals" />
          </Tabs>
        </Box>

        {/* Tab 0: Monthly Assignment Performance Tracking */}
        {mainTab === 0 && user?.id && user?.team && (
          <Box sx={{ mb: 4, p: { xs: 1, md: 0 } }}>
            <MonthlyAssignmentTracking 
              teamLeaderId={user.id} 
              team={user.team} 
            />
          </Box>
        )}

        {/* Tab 1: Team Assignment Performance */}
        {mainTab === 1 && (
          <Box sx={{ mb: 4, p: { xs: 1, md: 0 } }}>
            <TeamKPIDashboard teamLeaderId={user?.id || ''} />
          </Box>
        )}

        {/* Tab 2: Team Members */}
        {mainTab === 2 && (
          <Box sx={{ mb: 4, p: { xs: 1, md: 0 } }}>
            <Card sx={{ borderRadius: 2, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Team Members ({filteredTeamMembers.length})
                </Typography>
                
                {/* Add team members list here */}
                <Typography variant="body2" color="text.secondary">
                  Team members will be displayed here
                </Typography>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Tab 3: Weekly Goals & KPI */}
        {mainTab === 3 && (
          <Box sx={{ mb: 4, p: { xs: 1, md: 0 } }}>
            <MonthlyPerformanceSection teamLeaderId={user?.id || ''} />
          </Box>
        )}

        {/* Toast notification */}
        {toast && (
          <Toast
            open={true}
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </Box>
    </LayoutWithSidebar>
  );
};

export default TeamLeaderDashboardRedux;

