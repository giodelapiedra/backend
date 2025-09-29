import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Chip,
  Avatar,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Collapse,
} from '@mui/material';
import {
  TrendingUp,
  People,
  Assignment,
  Schedule,
  Group,
  Refresh,
  Dashboard,
  History,
  Security,
  FitnessCenter,
  Assessment,
  FilterList,
  GetApp,
  Clear,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

import LayoutWithSidebar from '../../components/LayoutWithSidebar';
import api from '../../utils/api';

// Optimized chart components
const OptimizedPieChart = memo(({ data, height = 300 }: { data: any[], height?: number }) => (
  <ResponsiveContainer width="100%" height={height}>
    <RechartsPieChart>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        labelLine={false}
        label={({ name, percentage }) => `${name}: ${percentage}%`}
        outerRadius={80}
        fill="#8884d8"
        dataKey="value"
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={entry.color} />
        ))}
      </Pie>
      <RechartsTooltip />
    </RechartsPieChart>
  </ResponsiveContainer>
));

const OptimizedBarChart = memo(({ data, height = 300 }: { data: any[], height?: number }) => (
  <ResponsiveContainer width="100%" height={height}>
    <RechartsBarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis 
        dataKey="name" 
        fontSize={12}
        angle={-45}
        textAnchor="end"
        height={60}
      />
      <YAxis fontSize={12} />
      <RechartsTooltip />
      <Bar dataKey="value" fill="#0073e6" radius={[4, 4, 0, 0]} />
    </RechartsBarChart>
  </ResponsiveContainer>
));

const OptimizedLineChart = memo(({ data, height = 400 }: { data: any[], height?: number }) => (
  <ResponsiveContainer width="100%" height={height}>
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="month" />
      <YAxis />
      <RechartsTooltip />
      <Legend />
      <Line type="monotone" dataKey="cases" stroke="#0073e6" strokeWidth={3} name="Cases" />
      <Line type="monotone" dataKey="appointments" stroke="#4caf50" strokeWidth={3} name="Appointments" />
    </LineChart>
  </ResponsiveContainer>
));

interface EnhancedAnalyticsData {
  overview: {
    totalUsers: number;
    totalCases: number;
    totalAppointments: number;
    totalActivityLogs: number;
    totalIncidents: number;
    totalRehabPlans: number;
    totalNotifications: number;
    activeUsers: number;
    casesThisMonth: number;
    appointmentsThisMonth: number;
    activityLogsThisMonth: number;
    incidentsThisMonth: number;
    userGrowth: number;
    caseGrowth: number;
    activityLogGrowth: number;
  };
  users: {
    byRole: Array<{ role: string; count: number; percentage: number }>;
    recentRegistrations: Array<{ name: string; email: string; role: string; createdAt: string }>;
    activeUsers: Array<{ name: string; email: string; lastLogin: string; role: string }>;
  };
  cases: {
    byStatus: Array<{ status: string; count: number; percentage: number }>;
    resolutionTime: number;
    monthlyTrend: Array<{ month: string; count: number }>;
    topCaseManagers: Array<{ name: string; casesHandled: number; successRate: number }>;
  };
  appointments: {
    totalScheduled: number;
    totalCompleted: number;
    totalNoShow: number;
    totalCancelled: number;
    completedRate: number;
    noShowRate: number;
    cancellationRate: number;
    byType: Array<{ type: string; count: number }>;
    monthlyTrend: Array<{ month: string; scheduled: number; completed: number; noShow: number }>;
  };
  activityLogs: {
    byType: Array<{ type: string; count: number; percentage: number }>;
    byPriority: Array<{ _id: string; count: number }>;
    recentLogs: Array<{
      id: string;
      title: string;
      description: string;
      activityType: string;
      priority: string;
      worker: string;
      case: string;
      clinician: string;
      createdAt: string;
      isReviewed: boolean;
    }>;
    monthlyTrend: Array<{ month: string; total: number; reviewed: number; pending: number }>;
    topActiveWorkers: Array<{
      name: string;
      email: string;
      activityCount: number;
      completedExercises: number;
      skippedExercises: number;
      checkIns: number;
      completionRate: number;
    }>;
  };
  incidents: {
    byType: Array<{ _id: string; count: number }>;
    bySeverity: Array<{ _id: string; count: number }>;
    byStatus: Array<{ _id: string; count: number }>;
    recentIncidents: Array<{
      id: string;
      incidentNumber: string;
      incidentType: string;
      severity: string;
      status: string;
      incidentDate: string;
      description: string;
      reportedBy: string;
      worker: string;
      employer: string;
      createdAt: string;
    }>;
  };
  rehabilitationPlans: {
    byStatus: Array<{ _id: string; count: number }>;
    avgCompletionRate: number;
    totalPlans: number;
  };
  notifications: {
    byType: Array<{ _id: string; count: number }>;
    unreadCount: number;
    readCount: number;
    totalCount: number;
  };
  system: {
    uptime: number;
    responseTime: number;
    errorRate: number;
    dataQuality: number;
    totalDataPoints: number;
    dataIntegrity: number;
  };
}

const EnhancedAnalytics: React.FC = memo(() => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analyticsData, setAnalyticsData] = useState<EnhancedAnalyticsData | null>(null);
  const [refreshInterval] = useState(30000); // 30 seconds
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [tabValue, setTabValue] = useState(0);
  const [refreshTimeout, setRefreshTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Filter states
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activityTypeFilter, setActivityTypeFilter] = useState('all');
  // Filter loading state
  const [filterLoading, setFilterLoading] = useState(false);

  // Debounced filter application
  const applyFilters = useCallback(() => {
    setFilterLoading(true);
    // Simulate filter processing time for better UX
    setTimeout(() => {
      setFilterLoading(false);
    }, 300);
  }, []);

  // Apply filters when they change
  useEffect(() => {
    applyFilters();
  }, [roleFilter, statusFilter, activityTypeFilter, dateRange, applyFilters]);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/analytics');
      setAnalyticsData(response.data);
      setLastUpdated(new Date());
      setError('');
    } catch (err: any) {
      console.error('Error fetching analytics:', err);
      setError(err.response?.data?.message || 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    // Debounce refresh to prevent multiple rapid calls
    if (refreshTimeout) {
      clearTimeout(refreshTimeout);
    }
    
    const timeout = setTimeout(() => {
      fetchAnalytics();
    }, 300);
    
    setRefreshTimeout(timeout);
  }, [fetchAnalytics, refreshTimeout]);

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, refreshInterval);
    return () => {
      clearInterval(interval);
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
    };
  }, [fetchAnalytics, refreshInterval, refreshTimeout]);

  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  }, []);

  // Filter functions
  const handleFilterToggle = useCallback(() => {
    setFiltersOpen(!filtersOpen);
  }, [filtersOpen]);

  const handleClearFilters = useCallback(() => {
    setDateRange({ startDate: '', endDate: '' });
    setRoleFilter('all');
    setStatusFilter('all');
    setActivityTypeFilter('all');
  }, []);

  const handleRoleFilterChange = useCallback((value: string) => {
    setRoleFilter(value);
  }, []);

  const handleStatusFilterChange = useCallback((value: string) => {
    setStatusFilter(value);
  }, []);

  // Export functionality
  const handleExportData = useCallback(() => {
    if (!analyticsData) return;
    
    const exportData = {
      exportDate: new Date().toISOString(),
      filters: {
        dateRange,
        roleFilter,
        statusFilter,
        activityTypeFilter
      },
      data: analyticsData
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [analyticsData, dateRange, roleFilter, statusFilter, activityTypeFilter]);

  // Color functions - memoized for performance
  const colorMaps = useMemo(() => ({
    role: {
      admin: '#e74c3c',
      clinician: '#3498db',
      case_manager: '#2ecc71',
      employer: '#f39c12',
      worker: '#9b59b6',
      site_supervisor: '#1abc9c',
      gp_insurer: '#34495e'
    },
    status: {
      open: '#3498db',
      in_progress: '#f39c12',
      closed: '#2ecc71',
      pending: '#95a5a6',
      completed: '#2ecc71',
      cancelled: '#e74c3c',
      no_show: '#e67e22'
    },
    activityType: {
      exercise_completed: '#2ecc71',
      exercise_skipped: '#e74c3c',
      daily_check_in: '#3498db',
      pain_level_update: '#f39c12',
      work_status_update: '#9b59b6',
      goal_achieved: '#1abc9c',
      milestone_reached: '#e67e22',
      plan_review: '#34495e',
      appointment_attended: '#2ecc71',
      incident_reported: '#e74c3c'
    },
    priority: {
      low: '#2ecc71',
      medium: '#f39c12',
      high: '#e74c3c',
      urgent: '#8e44ad'
    }
  }), []);

  const getRoleColor = useCallback((role: string) => (colorMaps.role as any)[role] || '#95a5a6', [colorMaps.role]);
  const getStatusColor = useCallback((status: string) => (colorMaps.status as any)[status] || '#95a5a6', [colorMaps.status]);

  // Filtered data preparation
  const filteredUsers = useMemo(() => {
    if (!analyticsData?.users) return { byRole: [], recentRegistrations: [], activeUsers: [] };
    
    let filtered = { ...analyticsData.users };
    
    // Filter by role
    if (roleFilter !== 'all') {
      filtered.byRole = filtered.byRole.filter(user => user.role === roleFilter);
      filtered.recentRegistrations = filtered.recentRegistrations.filter(user => user.role === roleFilter);
      filtered.activeUsers = filtered.activeUsers.filter(user => user.role === roleFilter);
    }
    
    // Filter by date range
    if (dateRange.startDate || dateRange.endDate) {
      filtered.recentRegistrations = filtered.recentRegistrations.filter(user => {
        const userDate = new Date(user.createdAt);
        const startDate = dateRange.startDate ? new Date(dateRange.startDate) : null;
        const endDate = dateRange.endDate ? new Date(dateRange.endDate) : null;
        
        if (startDate && userDate < startDate) return false;
        if (endDate && userDate > endDate) return false;
        return true;
      });
    }
    
    return filtered;
  }, [analyticsData?.users, roleFilter, dateRange]);

  const filteredCases = useMemo(() => {
    if (!analyticsData?.cases) return { byStatus: [], monthlyTrend: [], topCaseManagers: [] };
    
    let filtered = { ...analyticsData.cases };
    
    // Filter by status
    if (statusFilter !== 'all') {
      filtered.byStatus = filtered.byStatus.filter(case_ => case_.status === statusFilter);
    }
    
    return filtered;
  }, [analyticsData?.cases, statusFilter]);

  // Memoized chart data for better performance
  const chartData = useMemo(() => {
    // Calculate total for percentage calculations
    const totalUserCount = filteredUsers.byRole.reduce((sum: number, item: any) => sum + item.count, 0);
    const caseStatuses = (filteredCases.byStatus as any[]) || [];
    const totalCaseCount = caseStatuses.reduce((sum: number, item: any) => sum + item.count, 0);
    
    return {
      userRoles: filteredUsers.byRole.map((item: any) => ({
        name: item.role,
        value: item.count,
        percentage: totalUserCount > 0 ? Math.round((item.count / totalUserCount) * 100) : 0,
        color: getRoleColor(item.role)
      })),
      caseStatuses: caseStatuses.map((item: any) => ({
        name: item.status,
        value: item.count,
        percentage: totalCaseCount > 0 ? Math.round((item.count / totalCaseCount) * 100) : 0,
        color: getStatusColor(item.status)
      })),
    monthlyTrend: analyticsData?.cases?.monthlyTrend?.map(item => ({
      month: item.month,
      cases: item.count,
      appointments: analyticsData?.appointments?.monthlyTrend?.find(apt => apt.month === item.month)?.scheduled || 0,
      activities: analyticsData?.activityLogs?.monthlyTrend?.find(act => act.month === item.month)?.total || 0,
      incidents: analyticsData?.incidents?.recentIncidents?.filter(inc => 
        new Date(inc.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) === item.month
      ).length || 0
    })) || [],
    activityTrend: analyticsData?.activityLogs?.monthlyTrend?.map(item => ({
      month: item.month,
      total: item.total,
      reviewed: item.reviewed,
      pending: item.pending
    })) || []
    };
  }, [filteredUsers.byRole, filteredCases.byStatus, analyticsData, getRoleColor, getStatusColor]);


  if (loading && !analyticsData) {
    return (
      <LayoutWithSidebar>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress size={60} />
        </Box>
      </LayoutWithSidebar>
    );
  }

  if (error) {
    return (
      <LayoutWithSidebar>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      </LayoutWithSidebar>
    );
  }

  if (!analyticsData) return null;

  return (
    <LayoutWithSidebar>
      <Box>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 4, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 2, sm: 0 } }}>
          <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
            <Typography variant="h3" component="h1" sx={{ 
              fontWeight: 700,
              color: '#1a1a1a',
              mb: 0.5,
              fontSize: { xs: '1.8rem', sm: '2.2rem', md: '2.5rem' }
            }}>
              📊 Enhanced Analytics Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 400, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
              Comprehensive insights and performance metrics
            </Typography>
          </Box>
          <Box display="flex" gap={2} alignItems="center" sx={{ flexDirection: { xs: 'column', sm: 'row' }, width: { xs: '100%', sm: 'auto' } }}>
            <Chip 
              label={`Last updated: ${lastUpdated.toLocaleTimeString()}`}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
            />
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={handleRefresh}
              sx={{ 
                borderRadius: 1,
                fontSize: { xs: '0.8rem', sm: '0.875rem' },
                px: { xs: 2, sm: 3 },
                py: { xs: 1, sm: 1.25 }
              }}
            >
              Refresh
            </Button>
            <Button
              variant="outlined"
              startIcon={<FilterList />}
              onClick={handleFilterToggle}
              sx={{ 
                borderRadius: 1,
                fontSize: { xs: '0.8rem', sm: '0.875rem' },
                px: { xs: 2, sm: 3 },
                py: { xs: 1, sm: 1.25 }
              }}
            >
              {filtersOpen ? 'Hide Filters' : 'Show Filters'}
            </Button>
            <Button
              variant="contained"
              startIcon={<GetApp />}
              onClick={handleExportData}
              sx={{ 
                borderRadius: 1,
                backgroundColor: '#0073e6',
                fontSize: { xs: '0.8rem', sm: '0.875rem' },
                px: { xs: 2, sm: 3 },
                py: { xs: 1, sm: 1.25 },
                '&:hover': { backgroundColor: '#005bb5' }
              }}
            >
              Export Report
            </Button>
          </Box>
        </Box>

        {/* Filter Panel */}
        <Collapse in={filtersOpen}>
          <Card sx={{ mb: 3, backgroundColor: '#f8f9fa' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#2c3e50' }}>
                  🔍 Data Filters {filterLoading && <CircularProgress size={16} sx={{ ml: 1 }} />}
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Clear />}
                  onClick={handleClearFilters}
                  sx={{ color: '#e74c3c', borderColor: '#e74c3c' }}
                >
                  Clear All
                </Button>
              </Box>
              
              <Grid container spacing={3}>
                {/* Date Range Filter */}
                <Grid item xs={12} md={3}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: '#34495e' }}>
                    📅 Date Range
                  </Typography>
                  <TextField
                    fullWidth
                    type="date"
                    label="Start Date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                  />
                  <TextField
                    fullWidth
                    type="date"
                    label="End Date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </Grid>

                {/* Role Filter */}
                <Grid item xs={12} md={3}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: '#34495e' }}>
                    👥 User Role
                  </Typography>
                  <FormControl fullWidth size="small">
                    <InputLabel>Role</InputLabel>
                    <Select
                      value={roleFilter}
                      onChange={(e) => handleRoleFilterChange(e.target.value)}
                      label="Role"
                    >
                      <MenuItem value="all">All Roles</MenuItem>
                      <MenuItem value="admin">Admin</MenuItem>
                      <MenuItem value="clinician">Clinician</MenuItem>
                      <MenuItem value="case_manager">Case Manager</MenuItem>
                      <MenuItem value="employer">Employer</MenuItem>
                      <MenuItem value="worker">Worker</MenuItem>
                      <MenuItem value="site_supervisor">Site Supervisor</MenuItem>
                      <MenuItem value="gp_insurer">GP Insurer</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Status Filter */}
                <Grid item xs={12} md={3}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: '#34495e' }}>
                    📊 Case Status
                  </Typography>
                  <FormControl fullWidth size="small">
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={statusFilter}
                      onChange={(e) => handleStatusFilterChange(e.target.value)}
                      label="Status"
                    >
                      <MenuItem value="all">All Statuses</MenuItem>
                      <MenuItem value="open">Open</MenuItem>
                      <MenuItem value="in_progress">In Progress</MenuItem>
                      <MenuItem value="closed">Closed</MenuItem>
                      <MenuItem value="pending">Pending</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Activity Type Filter */}
                <Grid item xs={12} md={3}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: '#34495e' }}>
                    🏃 Activity Type
                  </Typography>
                  <FormControl fullWidth size="small">
                    <InputLabel>Activity Type</InputLabel>
                    <Select
                      value={activityTypeFilter}
                      onChange={(e) => setActivityTypeFilter(e.target.value)}
                      label="Activity Type"
                    >
                      <MenuItem value="all">All Types</MenuItem>
                      <MenuItem value="exercise">Exercise</MenuItem>
                      <MenuItem value="assessment">Assessment</MenuItem>
                      <MenuItem value="check_in">Check-in</MenuItem>
                      <MenuItem value="therapy">Therapy</MenuItem>
                      <MenuItem value="consultation">Consultation</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Collapse>

        {/* Tabbed Interface */}
        <Card sx={{ 
          borderRadius: 2,
          border: '1px solid #e1e5e9',
          boxShadow: 'none',
          overflow: 'hidden'
        }}>
          <Box sx={{ 
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid #e1e5e9'
          }}>
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: { xs: '12px', sm: '14px' },
                  minHeight: { xs: 40, sm: 48 },
                  px: { xs: 1, sm: 2 },
                  '&.Mui-selected': {
                    color: '#0073e6',
                    fontWeight: 600
                  }
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: '#0073e6',
                  height: 3,
                  borderRadius: '2px 2px 0 0'
                },
                '& .MuiTabs-scrollButtons': {
                  color: '#0073e6',
                  '&.Mui-disabled': {
                    opacity: 0.3
                  }
                }
              }}
            >
              <Tab 
                icon={<Dashboard />} 
                iconPosition="start" 
                label="Overview" 
              />
              <Tab 
                icon={<History />} 
                iconPosition="start" 
                label="Activity Logs" 
              />
              <Tab 
                icon={<Security />} 
                iconPosition="start" 
                label="Incidents" 
              />
              <Tab 
                icon={<Schedule />} 
                iconPosition="start" 
                label="Appointments" 
              />
              <Tab 
                icon={<FitnessCenter />} 
                iconPosition="start" 
                label="Rehabilitation" 
              />
              <Tab 
                icon={<Assessment />} 
                iconPosition="start" 
                label="System Health" 
              />
            </Tabs>
          </Box>

          {/* Tab Content */}
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            {/* Overview Tab */}
            {tabValue === 0 && (
              <Box>
                {/* Overview KPIs */}
                <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: { xs: 3, sm: 4 } }}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ 
                      borderRadius: 2,
                      border: '1px solid #e1e5e9',
                      boxShadow: 'none',
                      '&:hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }
                    }}>
                      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ 
                              mb: 1, 
                              fontSize: { xs: '11px', sm: '13px' }, 
                              fontWeight: 500 
                            }}>
                              TOTAL USERS
                            </Typography>
                            <Typography variant="h4" sx={{ 
                              fontWeight: 700, 
                              color: '#1a1a1a',
                              fontSize: { xs: '1.5rem', sm: '2rem' }
                            }}>
                              {analyticsData.overview.totalUsers}
                            </Typography>
                            <Box display="flex" alignItems="center" gap={0.5} sx={{ mt: 1 }}>
                              <TrendingUp sx={{ fontSize: { xs: 14, sm: 16 }, color: '#4caf50' }} />
                              <Typography variant="body2" sx={{ 
                                color: '#4caf50', 
                                fontWeight: 500,
                                fontSize: { xs: '0.7rem', sm: '0.75rem' }
                              }}>
                                +{analyticsData.overview.userGrowth}% this month
                              </Typography>
                            </Box>
                          </Box>
                          <Avatar sx={{ 
                            bgcolor: '#e3f2fd', 
                            width: { xs: 40, sm: 56 }, 
                            height: { xs: 40, sm: 56 } 
                          }}>
                            <People sx={{ fontSize: { xs: 20, sm: 28 }, color: '#2196f3' }} />
                          </Avatar>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ 
                      borderRadius: 2,
                      border: '1px solid #e1e5e9',
                      boxShadow: 'none',
                      '&:hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }
                    }}>
                      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ 
                              mb: 1, 
                              fontSize: { xs: '11px', sm: '13px' }, 
                              fontWeight: 500 
                            }}>
                              TOTAL CASES
                            </Typography>
                            <Typography variant="h4" sx={{ 
                              fontWeight: 700, 
                              color: '#1a1a1a',
                              fontSize: { xs: '1.5rem', sm: '2rem' }
                            }}>
                              {analyticsData.overview.totalCases}
                            </Typography>
                            <Box display="flex" alignItems="center" gap={0.5} sx={{ mt: 1 }}>
                              <TrendingUp sx={{ fontSize: { xs: 14, sm: 16 }, color: '#4caf50' }} />
                              <Typography variant="body2" sx={{ 
                                color: '#4caf50', 
                                fontWeight: 500,
                                fontSize: { xs: '0.7rem', sm: '0.75rem' }
                              }}>
                                +{analyticsData.overview.caseGrowth}% this month
                              </Typography>
                            </Box>
                          </Box>
                          <Avatar sx={{ 
                            bgcolor: '#f3e5f5', 
                            width: { xs: 40, sm: 56 }, 
                            height: { xs: 40, sm: 56 } 
                          }}>
                            <Assignment sx={{ fontSize: { xs: 20, sm: 28 }, color: '#9c27b0' }} />
                          </Avatar>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ 
                      borderRadius: 2,
                      border: '1px solid #e1e5e9',
                      boxShadow: 'none',
                      '&:hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }
                    }}>
                      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ 
                              mb: 1, 
                              fontSize: { xs: '11px', sm: '13px' }, 
                              fontWeight: 500 
                            }}>
                              APPOINTMENTS
                            </Typography>
                            <Typography variant="h4" sx={{ 
                              fontWeight: 700, 
                              color: '#1a1a1a',
                              fontSize: { xs: '1.5rem', sm: '2rem' }
                            }}>
                              {analyticsData.overview.totalAppointments}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ 
                              mt: 1,
                              fontSize: { xs: '0.7rem', sm: '0.75rem' }
                            }}>
                              {analyticsData.appointments.completedRate}% completed
                            </Typography>
                          </Box>
                          <Avatar sx={{ 
                            bgcolor: '#e8f5e8', 
                            width: { xs: 40, sm: 56 }, 
                            height: { xs: 40, sm: 56 } 
                          }}>
                            <Schedule sx={{ fontSize: { xs: 20, sm: 28 }, color: '#4caf50' }} />
                          </Avatar>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ 
                      borderRadius: 2,
                      border: '1px solid #e1e5e9',
                      boxShadow: 'none',
                      '&:hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }
                    }}>
                      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ 
                              mb: 1, 
                              fontSize: { xs: '11px', sm: '13px' }, 
                              fontWeight: 500 
                            }}>
                              ACTIVE USERS
                            </Typography>
                            <Typography variant="h4" sx={{ 
                              fontWeight: 700, 
                              color: '#1a1a1a',
                              fontSize: { xs: '1.5rem', sm: '2rem' }
                            }}>
                              {analyticsData.overview.activeUsers}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ 
                              mt: 1,
                              fontSize: { xs: '0.7rem', sm: '0.75rem' }
                            }}>
                              Online now
                            </Typography>
                          </Box>
                          <Avatar sx={{ 
                            bgcolor: '#fff3e0', 
                            width: { xs: 40, sm: 56 }, 
                            height: { xs: 40, sm: 56 } 
                          }}>
                            <Group sx={{ fontSize: { xs: 20, sm: 28 }, color: '#ff9800' }} />
                          </Avatar>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {/* Quick Charts Row */}
                <Grid container spacing={{ xs: 2, sm: 3 }}>
                  <Grid item xs={12} md={6}>
                    <Card sx={{ borderRadius: 2, border: '1px solid #e1e5e9', boxShadow: 'none' }}>
                      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                        <Typography variant="h6" sx={{ 
                          fontWeight: 600, 
                          mb: { xs: 2, sm: 3 },
                          fontSize: { xs: '1rem', sm: '1.25rem' }
                        }}>
                          User Role Distribution
                        </Typography>
                        <OptimizedPieChart data={chartData.userRoles} height={300} />
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Card sx={{ borderRadius: 2, border: '1px solid #e1e5e9', boxShadow: 'none' }}>
                      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                        <Typography variant="h6" sx={{ 
                          fontWeight: 600, 
                          mb: { xs: 2, sm: 3 },
                          fontSize: { xs: '1rem', sm: '1.25rem' }
                        }}>
                          Case Status Distribution
                        </Typography>
                        <OptimizedBarChart data={chartData.caseStatuses} height={300} />
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Users Tab */}
            {tabValue === 1 && (
              <Box>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={8}>
                    <Card sx={{ borderRadius: 2, border: '1px solid #e1e5e9', boxShadow: 'none' }}>
                      <CardContent sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                          User Role Distribution
                        </Typography>
                        <OptimizedPieChart data={chartData.caseStatuses} height={400} />
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Card sx={{ borderRadius: 2, border: '1px solid #e1e5e9', boxShadow: 'none' }}>
                      <CardContent sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                          Recent Registrations
                        </Typography>
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {filteredUsers.recentRegistrations.slice(0, 5).map((user, index) => (
                                <TableRow key={index}>
                                  <TableCell>
                                    <Box display="flex" alignItems="center" gap={1}>
                                      <Avatar sx={{ width: 32, height: 32, bgcolor: getRoleColor(user.role) }}>
                                        {user.name.charAt(0)}
                                      </Avatar>
                                      <Box>
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                          {user.name}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          {new Date(user.createdAt).toLocaleDateString()}
                                        </Typography>
                                      </Box>
                                    </Box>
                                  </TableCell>
                                  <TableCell>
                                    <Chip 
                                      label={user.role.replace('_', ' ')}
                                      size="small"
                                      sx={{ 
                                        backgroundColor: getRoleColor(user.role),
                                        color: 'white',
                                        textTransform: 'capitalize',
                                        fontSize: '11px'
                                      }}
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Cases Tab */}
            {tabValue === 2 && (
              <Box>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={8}>
                    <Card sx={{ borderRadius: 2, border: '1px solid #e1e5e9', boxShadow: 'none' }}>
                      <CardContent sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                          Case Status Distribution
                        </Typography>
                        <OptimizedBarChart data={chartData.caseStatuses} height={400} />
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Card sx={{ borderRadius: 2, border: '1px solid #e1e5e9', boxShadow: 'none' }}>
                      <CardContent sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                          Top Case Managers
                        </Typography>
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 600 }}>Manager</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Cases</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {analyticsData.cases.topCaseManagers.map((manager, index) => (
                                <TableRow key={index}>
                                  <TableCell>
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                      {manager.name}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Box display="flex" alignItems="center" gap={1}>
                                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {manager.casesHandled}
                                      </Typography>
                                      <LinearProgress 
                                        variant="determinate" 
                                        value={manager.successRate} 
                                        sx={{ 
                                          width: 60,
                                          height: 4, 
                                          borderRadius: 2,
                                          backgroundColor: '#f5f5f5',
                                          '& .MuiLinearProgress-bar': {
                                            backgroundColor: manager.successRate > 80 ? '#4caf50' : manager.successRate > 60 ? '#ff9800' : '#f44336',
                                            borderRadius: 2
                                          }
                                        }} 
                                      />
                                    </Box>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Appointments Tab */}
            {tabValue === 3 && (
              <Box>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Card sx={{ borderRadius: 2, border: '1px solid #e1e5e9', boxShadow: 'none' }}>
                      <CardContent sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                          Appointment Statistics
                        </Typography>
                        <Grid container spacing={3}>
                          <Grid item xs={12} sm={3}>
                            <Box textAlign="center">
                              <Typography variant="h3" sx={{ fontWeight: 700, color: '#0073e6' }}>
                                {analyticsData.appointments.totalScheduled}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Total Scheduled
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={12} sm={3}>
                            <Box textAlign="center">
                              <Typography variant="h3" sx={{ fontWeight: 700, color: '#4caf50' }}>
                                {analyticsData.appointments.completedRate}%
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Completion Rate
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={12} sm={3}>
                            <Box textAlign="center">
                              <Typography variant="h3" sx={{ fontWeight: 700, color: '#ff9800' }}>
                                {analyticsData.appointments.noShowRate}%
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                No-Show Rate
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={12} sm={3}>
                            <Box textAlign="center">
                              <Typography variant="h3" sx={{ fontWeight: 700, color: '#9c27b0' }}>
                                {analyticsData.appointments.byType.length}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Appointment Types
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Trends Tab */}
            {tabValue === 4 && (
              <Box>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Card sx={{ borderRadius: 2, border: '1px solid #e1e5e9', boxShadow: 'none' }}>
                      <CardContent sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                          Monthly Trends
                        </Typography>
                        <OptimizedLineChart data={chartData.monthlyTrend} height={400} />
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            )}
          </Box>
        </Card>
      </Box>
    </LayoutWithSidebar>
  );
});

EnhancedAnalytics.displayName = 'EnhancedAnalytics';

export default EnhancedAnalytics;

