import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  IconButton,
  Chip,
  TextField,
  Button,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  People,
  Assignment,
  Event,
  Security,
  FitnessCenter,
  Refresh,
  MoreVert,
  FilterList,
  Clear,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import LayoutWithSidebar from '../../components/LayoutWithSidebar';
import api from '../../utils/api';

interface AnalyticsData {
  overview: {
    totalUsers: number;
    totalCases: number;
    totalAppointments: number;
    totalIncidents: number;
    activeUsers: number;
    userGrowth: number;
    caseGrowth: number;
  };
  usersByRole: Array<{ role: string; count: number }>;
  casesByStatus: Array<{ status: string; count: number }>;
  monthlyTrend: Array<{ month: string; users: number; cases: number; appointments: number }>;
  recentActivities: Array<{
    type: string;
    count: number;
    change: number;
  }>;
}

const COLORS = {
  primary: '#7B68EE',
  secondary: '#20B2AA',
  success: '#32CD32',
  warning: '#FF8C00',
  danger: '#FF6B6B',
  info: '#3498db',
};

const ROLE_COLORS = ['#7B68EE', '#20B2AA', '#32CD32', '#FF8C00', '#FF6B6B', '#3498db', '#9B59B6'];

// Memoized chart components for better performance
const MemoizedLineChart = memo(({ data, colors }: { data: any[], colors: any }) => (
  <ResponsiveContainer width="100%" height={350}>
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis 
        dataKey="month" 
        tick={{ fontSize: 12 }}
        angle={-45}
        textAnchor="end"
        height={60}
      />
      <YAxis tick={{ fontSize: 12 }} />
      <Tooltip 
        labelStyle={{ color: '#333' }}
        contentStyle={{ 
          backgroundColor: '#fff', 
          border: '1px solid #ccc',
          borderRadius: '4px'
        }}
      />
      <Legend />
      <Line 
        type="monotone" 
        dataKey="users" 
        stroke={colors.primary} 
        strokeWidth={3} 
        name="Users"
        dot={{ fill: colors.primary, strokeWidth: 2, r: 4 }}
        activeDot={{ r: 6, stroke: colors.primary, strokeWidth: 2 }}
      />
      <Line 
        type="monotone" 
        dataKey="cases" 
        stroke={colors.secondary} 
        strokeWidth={3} 
        name="Cases"
        dot={{ fill: colors.secondary, strokeWidth: 2, r: 4 }}
        activeDot={{ r: 6, stroke: colors.secondary, strokeWidth: 2 }}
      />
      <Line 
        type="monotone" 
        dataKey="appointments" 
        stroke={colors.success} 
        strokeWidth={3} 
        name="Appointments"
        dot={{ fill: colors.success, strokeWidth: 2, r: 4 }}
        activeDot={{ r: 6, stroke: colors.success, strokeWidth: 2 }}
      />
    </LineChart>
  </ResponsiveContainer>
));

const MemoizedPieChart = memo(({ data, colors }: { data: any[], colors: string[] }) => (
  <ResponsiveContainer width="100%" height={300}>
    <PieChart>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        labelLine={false}
        label={({ role, count }) => `${role}: ${count}`}
        outerRadius={80}
        fill="#8884d8"
        dataKey="count"
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
        ))}
      </Pie>
      <Tooltip />
    </PieChart>
  </ResponsiveContainer>
));

const MemoizedModalPieChart = memo(({ data, colors }: { data: any[], colors: string[] }) => {
  // Calculate percentages for proper display
  const total = data.reduce((sum, item) => sum + item.count, 0);
  
  return (
    <ResponsiveContainer width="100%" height={500}>
      <PieChart>
        <Pie
          data={data.map(item => ({
            ...item,
            percentage: total > 0 ? Math.round((item.count / total) * 100) : 0
          }))}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ role, count, percentage }) => `${role}\n${percentage}%`}
          outerRadius={180}
          fill="#8884d8"
          dataKey="count"
          fontSize={14}
          fontWeight={600}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value, name, props) => [
            `${value} users (${props.payload.percentage}%)`,
            props.payload.role
          ]}
          labelStyle={{ fontSize: 14, fontWeight: 600 }}
          contentStyle={{ 
            fontSize: 14,
            borderRadius: 8,
            border: '1px solid #e0e0e0'
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
});

const MemoizedBarChart = memo(({ data, getStatusColor }: { data: any[], getStatusColor: (status: string) => string }) => (
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="status" />
      <YAxis />
      <Tooltip />
      <Bar dataKey="count" radius={[8, 8, 0, 0]}>
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
));

// Specific colors for case statuses
const getStatusColor = (status: string) => {
  const statusColors: { [key: string]: string } = {
    'New Cases': '#3498db',        // Blue
    'Triaged': '#f39c12',          // Orange  
    'Assessed': '#9b59b6',         // Purple
    'In Rehabilitation': '#1abc9c', // Teal
    'Return to Work': '#2ecc71',   // Green
    'Closed Cases': '#27ae60',     // Dark Green
    'Cancelled': '#e74c3c',        // Red
    'Pending': '#95a5a6',          // Gray
    'Unknown': '#34495e'            // Dark Gray
  };
  return statusColors[status] || '#95a5a6';
};

const AdminAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  
  // Modal state for Users by Role
  const [usersRoleModalOpen, setUsersRoleModalOpen] = useState(false);
  
  // Debounce timer for API calls
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      // Build query parameters for date filtering
      const params = new URLSearchParams();
      if (dateRange.startDate) {
        params.append('startDate', dateRange.startDate);
      }
      if (dateRange.endDate) {
        params.append('endDate', dateRange.endDate);
      }
      
      const response = await api.get(`/admin/analytics?${params.toString()}`);
      
      if (!response.data) {
        throw new Error('No data received from server');
      }
      
      // Check if data has the expected structure
      if (!response.data.overview || !response.data.usersByRole || !response.data.casesByStatus) {
        // Data structure incomplete but continue
      }
      
      setAnalyticsData(response.data);
      setLastUpdated(new Date());
      setError('');
    } catch (err: any) {
      console.error('❌ Error fetching analytics:', err);
      setError(err.response?.data?.message || 'Failed to fetch analytics data');
      setAnalyticsData(null);
    } finally {
      setLoading(false);
    }
  }, [dateRange.startDate, dateRange.endDate]);

  // Debounced fetch function to prevent excessive API calls
  const debouncedFetchAnalytics = useCallback(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    
    const timer = setTimeout(() => {
      fetchAnalytics();
    }, 500); // 500ms debounce
    
    setDebounceTimer(timer);
  }, [fetchAnalytics, debounceTimer]);

  useEffect(() => {
    fetchAnalytics();
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchAnalytics, 300000);
    return () => {
      clearInterval(interval);
      // Cleanup debounce timer
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [fetchAnalytics, debounceTimer]);

  const handleRefresh = () => {
    fetchAnalytics();
  };

  const handleFilterToggle = () => {
    setFiltersOpen(!filtersOpen);
  };

  const handleClearFilters = () => {
    setDateRange({ startDate: '', endDate: '' });
  };

  const handleApplyFilters = () => {
    debouncedFetchAnalytics();
  };
  
  // Modal handlers
  const handleUsersRoleModalOpen = () => {
    setUsersRoleModalOpen(true);
  };

  const handleUsersRoleModalClose = () => {
    setUsersRoleModalOpen(false);
  };
  
  // Memoized data calculations for better performance
  const memoizedChartData = useMemo(() => {
    if (!analyticsData) return null;
    
    return {
      monthlyTrend: analyticsData.monthlyTrend || [],
      usersByRole: analyticsData.usersByRole || [],
      casesByStatus: analyticsData.casesByStatus || [],
      recentActivities: analyticsData.recentActivities || []
    };
  }, [analyticsData]);

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
        <style>
          {`
            @keyframes pulse {
              0% { opacity: 1; }
              50% { opacity: 0.5; }
              100% { opacity: 1; }
            }
          `}
        </style>
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h3" component="h1" sx={{ 
              fontWeight: 700, 
              mb: 1,
              fontSize: { xs: '1.75rem', sm: '2.5rem' }
            }}>
              Analytics Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Real-time insights and system performance metrics
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Chip 
              label={`Updated: ${lastUpdated.toLocaleTimeString()}`}
              size="small"
              color="primary"
              variant="outlined"
            />
            <Button
              variant="outlined"
              startIcon={<FilterList />}
              onClick={handleFilterToggle}
              size="small"
            >
              {filtersOpen ? 'Hide Filters' : 'Show Filters'}
            </Button>
            <IconButton onClick={handleRefresh} color="primary">
              <Refresh />
            </IconButton>
          </Box>
        </Box>

        {/* Filter Panel */}
        <Collapse in={filtersOpen}>
          <Card sx={{ mb: 3, backgroundColor: '#f8f9fa' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#2c3e50' }}>
                  📅 Date Range Filter
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Clear />}
                  onClick={handleClearFilters}
                  sx={{ color: '#e74c3c', borderColor: '#e74c3c' }}
                >
                  Clear Filters
                </Button>
              </Box>
              
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Start Date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    type="date"
                    label="End Date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Button
                    variant="contained"
                    onClick={handleApplyFilters}
                    sx={{ backgroundColor: '#0073e6' }}
                  >
                    Apply Filters
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Collapse>

        {/* KPI Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Total Users */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              height: '100%',
              background: 'linear-gradient(135deg, #7B68EE 0%, #9B7FFF 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <CardContent sx={{ position: 'relative', zIndex: 2, p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                      Total Users
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                      {analyticsData.overview.totalUsers}
                    </Typography>
                  </Box>
                  <IconButton sx={{ color: 'white', opacity: 0.8 }}>
                    <MoreVert />
                  </IconButton>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {analyticsData.overview.userGrowth >= 0 ? (
                    <TrendingUp sx={{ fontSize: 16 }} />
                  ) : (
                    <TrendingDown sx={{ fontSize: 16 }} />
                  )}
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    {Math.abs(analyticsData.overview.userGrowth)}% from last month
                  </Typography>
                </Box>
              </CardContent>
              <Box
                sx={{
                  position: 'absolute',
                  top: -20,
                  right: -20,
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.1)',
                  zIndex: 1,
                }}
              />
            </Card>
          </Grid>

          {/* Total Cases */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              height: '100%',
              background: 'linear-gradient(135deg, #20B2AA 0%, #4DD0C1 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <CardContent sx={{ position: 'relative', zIndex: 2, p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                      Total Cases
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                      {analyticsData.overview.totalCases}
                    </Typography>
                  </Box>
                  <IconButton sx={{ color: 'white', opacity: 0.8 }}>
                    <MoreVert />
                  </IconButton>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {analyticsData.overview.caseGrowth >= 0 ? (
                    <TrendingUp sx={{ fontSize: 16 }} />
                  ) : (
                    <TrendingDown sx={{ fontSize: 16 }} />
                  )}
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    {Math.abs(analyticsData.overview.caseGrowth)}% from last month
                  </Typography>
                </Box>
              </CardContent>
              <Box
                sx={{
                  position: 'absolute',
                  top: -20,
                  right: -20,
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.1)',
                  zIndex: 1,
                }}
              />
            </Card>
          </Grid>

          {/* Total Appointments */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              height: '100%',
              background: 'linear-gradient(135deg, #32CD32 0%, #7CFC00 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <CardContent sx={{ position: 'relative', zIndex: 2, p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                      Appointments
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                      {analyticsData.overview.totalAppointments}
                    </Typography>
                  </Box>
                  <IconButton sx={{ color: 'white', opacity: 0.8 }}>
                    <MoreVert />
                  </IconButton>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Event sx={{ fontSize: 16 }} />
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Scheduled & Completed
                  </Typography>
                </Box>
              </CardContent>
              <Box
                sx={{
                  position: 'absolute',
                  top: -20,
                  right: -20,
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.1)',
                  zIndex: 1,
                }}
              />
            </Card>
          </Grid>

          {/* Active Users */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              height: '100%',
              background: 'linear-gradient(135deg, #FF8C00 0%, #FFA500 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <CardContent sx={{ position: 'relative', zIndex: 2, p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                      Active Users
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                      {analyticsData.overview.activeUsers}
                    </Typography>
                  </Box>
                  <IconButton sx={{ color: 'white', opacity: 0.8 }}>
                    <MoreVert />
                  </IconButton>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ 
                    width: 8, 
                    height: 8, 
                    borderRadius: '50%', 
                    backgroundColor: 'rgba(255,255,255,0.8)',
                    animation: 'pulse 2s infinite'
                  }} />
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Live Status
                  </Typography>
                </Box>
              </CardContent>
              <Box
                sx={{
                  position: 'absolute',
                  top: -20,
                  right: -20,
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.1)',
                  zIndex: 1,
                }}
              />
            </Card>
          </Grid>
        </Grid>

        {/* Charts Section */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Monthly Trend Line Chart */}
          <Grid item xs={12} lg={8}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                  Monthly Trends
                </Typography>
                <MemoizedLineChart data={memoizedChartData?.monthlyTrend || []} colors={COLORS} />
              </CardContent>
            </Card>
          </Grid>

          {/* User Distribution Pie Chart */}
          <Grid item xs={12} lg={4}>
            <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 } }} onClick={handleUsersRoleModalOpen}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Users by Role
                  </Typography>
                  <Chip 
                    label="Click to expand" 
                    size="small" 
                    color="primary" 
                    variant="outlined"
                    sx={{ fontSize: '0.7rem' }}
                  />
                </Box>
                <MemoizedPieChart data={memoizedChartData?.usersByRole || []} colors={ROLE_COLORS} />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Additional Charts */}
        <Grid container spacing={3}>
          {/* Cases by Status Bar Chart */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                  Cases by Status
                </Typography>
                <MemoizedBarChart data={memoizedChartData?.casesByStatus || []} getStatusColor={getStatusColor} />
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Activities */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                  Recent Activities
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {(analyticsData.recentActivities || []).map((activity, index) => (
                    <Box 
                      key={index}
                      sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        p: 2,
                        backgroundColor: '#f8f9fa',
                        borderRadius: 2
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ 
                          width: 40, 
                          height: 40, 
                          borderRadius: '50%', 
                          backgroundColor: COLORS.primary,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white'
                        }}>
                          {activity.type === 'users' && <People />}
                          {activity.type === 'cases' && <Assignment />}
                          {activity.type === 'appointments' && <Event />}
                          {activity.type === 'incidents' && <Security />}
                        </Box>
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
                            {activity.type}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {activity.count} total
                          </Typography>
                        </Box>
                      </Box>
                      <Chip 
                        label={`${activity.change >= 0 ? '+' : ''}${activity.change}%`}
                        color={activity.change >= 0 ? 'success' : 'error'}
                        size="small"
                      />
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
      
      {/* Users by Role Modal */}
      <Dialog 
        open={usersRoleModalOpen} 
        onClose={handleUsersRoleModalClose}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          backgroundColor: '#f8f9fa',
          borderBottom: '1px solid #e1e5e9'
        }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            👥 Users by Role - Detailed Breakdown
          </Typography>
          <IconButton onClick={handleUsersRoleModalClose} size="small">
            <Clear />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {/* Large Pie Chart */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Role Distribution
              </Typography>
              <MemoizedModalPieChart data={memoizedChartData?.usersByRole || []} colors={ROLE_COLORS} />
            </Grid>
            
            {/* Detailed Table */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Role Statistics
              </Typography>
              <TableContainer component={Paper} sx={{ maxHeight: 500, borderRadius: 2 }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, fontSize: 14 }}>Role</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: 14 }} align="right">Count</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: 14 }} align="right">Percentage</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(memoizedChartData?.usersByRole || []).map((role, index) => {
                      const total = (memoizedChartData?.usersByRole || []).reduce((sum, r) => sum + r.count, 0);
                      const percentage = total > 0 ? Math.round((role.count / total) * 100) : 0;
                      
                      return (
                        <TableRow key={index} hover sx={{ '&:hover': { backgroundColor: '#f5f5f5' } }}>
                          <TableCell sx={{ py: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Box 
                                sx={{ 
                                  width: 16, 
                                  height: 16, 
                                  borderRadius: '50%', 
                                  backgroundColor: ROLE_COLORS[index % ROLE_COLORS.length] 
                                }} 
                              />
                              <Typography sx={{ textTransform: 'capitalize', fontWeight: 500, fontSize: 14 }}>
                                {role.role}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right" sx={{ py: 2 }}>
                            <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
                              {role.count}
                            </Typography>
                          </TableCell>
                          <TableCell align="right" sx={{ py: 2 }}>
                            <Chip 
                              label={`${percentage}%`}
                              size="small"
                              sx={{ 
                                backgroundColor: ROLE_COLORS[index % ROLE_COLORS.length],
                                color: 'white',
                                fontWeight: 600,
                                fontSize: 12
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions sx={{ p: 3, backgroundColor: '#f8f9fa', borderTop: '1px solid #e1e5e9' }}>
          <Button onClick={handleUsersRoleModalClose} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </LayoutWithSidebar>
  );
};

export default AdminAnalytics;

