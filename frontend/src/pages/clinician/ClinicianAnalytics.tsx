import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  Typography,
  Grid,
  CircularProgress,
  Paper,
  Button,
  Chip,
  Stack,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  TrendingUp,
  People,
  EventAvailable,
  CheckCircle,
  Refresh,
  FilterList,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext.supabase';
import { dataClient } from '../../lib/supabase';
import { CaseAssignmentService } from '../../utils/caseAssignmentService';
import LayoutWithSidebar from '../../components/LayoutWithSidebar';
import backendApi from '../../utils/backendApi';
import UpcomingAppointmentsChart from './UpcomingAppointmentsChart';
import MonthlyCaseTrendChart from './MonthlyCaseTrendChart';
import { 
  format, 
  subDays,
  addDays,
  subMonths,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
} from 'date-fns';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

interface Stats {
  totalPatients: number;
  activePatients: number;
  completedCases: number;
  upcomingAppointments: number;
}

const ClinicianAnalytics: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState('7days');
  const [stats, setStats] = useState<Stats | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [rehabPlans, setRehabPlans] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [authError, setAuthError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      if (!user?.id) return;
      
      // Clear any previous auth errors
      setAuthError(null);

      // Get date range (include FUTURE dates for appointments)
      const now = new Date();
      let startDate = subDays(now, 7);
      let endDate = addDays(now, 30); // Include next 30 days for upcoming appointments
      
      if (dateRange === '30days') {
        startDate = subDays(now, 30);
        endDate = addDays(now, 30);
      }
      if (dateRange === '3months') {
        startDate = subMonths(now, 3);
        endDate = addDays(now, 90);
      }
      if (dateRange === '6months') {
        startDate = subMonths(now, 6);
        endDate = addDays(now, 180);
      }

      // Fetch cases
      const casesData = await CaseAssignmentService.getClinicianCases(user.id);
      setCases(casesData);

      // Fetch rehabilitation plans
      try {
        const { data: rehabData, error: rehabError } = await dataClient
          .from('rehabilitation_plans')
          .select('*')
          .eq('clinician_id', user.id)
          .order('created_at', { ascending: false });

        if (rehabError) {
          console.error('Error fetching rehabilitation plans:', rehabError);
          setRehabPlans([]);
        } else {
          setRehabPlans(rehabData || []);
          console.log('📋 Rehab Plans Debug:', {
            totalPlans: (rehabData || []).length,
            plans: (rehabData || []).map((p: any) => ({
              id: p.id,
              status: p.status,
              plan_name: p.plan_name,
              clinician_id: p.clinician_id
            }))
          });
        }
      } catch (rehabErr) {
        console.error('Error fetching rehabilitation plans:', rehabErr);
        setRehabPlans([]);
      }
      
      // Fetch appointments with proper error handling
      let appointments: any[] = [];
      try {
        // Try different API endpoints with better error handling
        try {
          // First try with calendar endpoint (which works with date ranges)
          const params = new URLSearchParams({
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          });
          const res = await backendApi.get(`/appointments/calendar?${params.toString()}`);
          const events = Array.isArray(res.data) ? res.data : [];
          
          // Transform calendar events to appointment format
          appointments = events.map((event: any) => ({
            _id: event.id || event._id,
            scheduledDate: event.start,
            status: event.extendedProps?.status || 'scheduled',
            duration: event.extendedProps?.duration || 60,
            appointmentType: event.extendedProps?.appointmentType || 'consultation',
            worker: {
              id: event.extendedProps?.workerId,
              firstName: event.extendedProps?.worker?.split(' ')[0] || '',
              lastName: event.extendedProps?.worker?.split(' ')[1] || '',
            }
          }));
        } catch (calendarErr: any) {
          console.log('Calendar endpoint failed, trying basic endpoint:', calendarErr.message);
          
          // Check if it's an authentication error
          if (calendarErr.response?.status === 401) {
            console.warn('Authentication failed for appointments API - user may need to re-login');
            setAuthError('Authentication failed. Please refresh the page or log in again.');
            // Set empty appointments and continue
            appointments = [];
          } else {
            // Fallback to basic endpoint without params
            try {
              const res = await backendApi.get('/appointments');
              appointments = Array.isArray(res.data) ? res.data : [];
            } catch (basicErr: any) {
              console.warn('Basic appointments endpoint also failed:', basicErr.message);
              appointments = [];
            }
          }
        }
      } catch (err: any) {
        console.warn('Failed to fetch appointments:', err.response?.data || err.message);
        // Continue with empty appointments array
        appointments = [];
      }

      // Filter by date range
      const filteredCases = casesData.filter((c: any) =>
        isWithinInterval(new Date(c.created_at), { start: startDate, end: endDate })
      );

      console.log('🔍 Analytics Debug:', {
        dateRange,
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        totalCases: casesData.length,
        filteredCases: filteredCases.length,
        totalRehabPlans: rehabPlans.length,
        completedRehabPlans: rehabPlans.filter((p: any) => 
          (p.status || '').toLowerCase() === 'completed'
        ).length,
        totalAppointments: appointments.length,
        filteredAppointments: appointments.filter(a => {
          const apptDate = new Date(a.scheduledDate);
          return isWithinInterval(apptDate, { start: startDate, end: endDate });
        }).length,
      });

      // Calculate stats
      const totalPatients = filteredCases.length;
      const activePatients = filteredCases.filter((c: any) =>
        ['triaged', 'assessed', 'in_rehab'].includes(c.status)
      ).length;
      
      // Count completed cases + completed rehabilitation plans
      const completedCaseCount = filteredCases.filter((c: any) => 
        c.status === 'completed'
      ).length;
      
      // Filter rehabilitation plans by date range too
      const filteredRehabPlans = rehabPlans.filter((p: any) => {
        try {
          const planDate = new Date(p.created_at || p.start_date);
          return !isNaN(planDate.getTime()) && isWithinInterval(planDate, { start: startDate, end: endDate });
        } catch (err) {
          console.warn('Invalid rehabilitation plan date:', p);
          return false;
        }
      });
      
      const completedPlansCount = filteredRehabPlans.filter((p: any) => 
        (p.status || '').toLowerCase() === 'completed'
      ).length;
      
      const completedCases = completedCaseCount + completedPlansCount;
      
      console.log('📊 Completed Counts Debug:', {
        completedCaseCount,
        completedPlansCount,
        totalCompletedCases: completedCases,
        filteredRehabPlansCount: filteredRehabPlans.length,
        allRehabPlansCount: rehabPlans.length
      });
      
      const upcomingAppointments = appointments.filter(a =>
        ['scheduled', 'confirmed'].includes(a.status) &&
        new Date(a.scheduledDate) > now
      ).length;

      setStats({
        totalPatients,
        activePatients,
        completedCases,
        upcomingAppointments,
      });

      // Store appointments in state for the chart component
      setAppointments(appointments);

      // Debug: Log raw appointments data
      console.log('📅 Raw appointments:', appointments.slice(0, 3));

      // Filter appointments by date range too (includes future dates now!)
      const filteredAppointments = appointments.filter(a => {
        try {
          const apptDate = new Date(a.scheduledDate);
          return !isNaN(apptDate.getTime()) && isWithinInterval(apptDate, { start: startDate, end: endDate });
        } catch (err) {
          console.warn('Invalid appointment date:', a);
          return false;
        }
      });

      console.log('📊 Filtered appointments:', filteredAppointments.length);

      // Status distribution (using filtered cases)
      const statusMap: Record<string, number> = {};
      filteredCases.forEach((c: any) => {
        const status = c.status || 'unknown';
        statusMap[status] = (statusMap[status] || 0) + 1;
      });
      const status = Object.entries(statusMap).map(([name, value]) => ({
        name: name.toUpperCase(),
        value,
      }));
      setStatusData(status);

    } catch (err) {
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      setLoading(true);
      fetchAnalytics();
    }
  }, [user?.id, dateRange]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  if (loading) {
    return (
      <LayoutWithSidebar>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="70vh">
          <CircularProgress />
        </Box>
      </LayoutWithSidebar>
    );
  }

  if (!stats) return null;

  return (
    <LayoutWithSidebar>
      <Box sx={{ p: 4, bgcolor: '#fafafa', minHeight: '100vh' }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={3}>
            <Box>
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="h4" fontWeight={600} color="#1a1a1a">
                  Analytics Dashboard
              </Typography>
                <Chip 
                  label={
                    dateRange === '7days' ? 'Last 7 Days' :
                    dateRange === '30days' ? 'Last 30 Days' :
                    dateRange === '3months' ? 'Last 3 Months' : 'Last 6 Months'
                  }
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </Stack>
              <Typography variant="body2" color="text.secondary" mt={0.5}>
                Overview of your clinical practice
              </Typography>
            </Box>
            <Stack direction="row" spacing={2}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Date Range</InputLabel>
                <Select
                  value={dateRange}
                  label="Date Range"
                  onChange={(e) => {
                    setDateRange(e.target.value);
                    setLoading(true);
                  }}
                  disabled={loading}
                  startAdornment={<FilterList sx={{ mr: 1, color: 'action.active' }} />}
                  sx={{ bgcolor: 'white' }}
                >
                  <MenuItem value="7days">Last 7 Days</MenuItem>
                  <MenuItem value="30days">Last 30 Days</MenuItem>
                  <MenuItem value="3months">Last 3 Months</MenuItem>
                  <MenuItem value="6months">Last 6 Months</MenuItem>
                </Select>
              </FormControl>
              <Button
                variant="outlined"
                startIcon={refreshing ? <CircularProgress size={16} /> : <Refresh />}
                onClick={handleRefresh}
                disabled={refreshing}
                sx={{ 
                  bgcolor: 'white',
                  borderColor: '#e0e0e0',
                  color: '#1a1a1a',
                  '&:hover': { 
                    bgcolor: '#f5f5f5',
                    borderColor: '#d0d0d0',
                  }
                }}
              >
                Refresh
              </Button>
            </Stack>
          </Box>
        </Box>

        {/* Authentication Error Alert */}
        {authError && (
          <Box sx={{ mb: 3 }}>
            <Paper sx={{ p: 2, bgcolor: '#fff3cd', border: '1px solid #ffeaa7' }}>
              <Typography variant="body2" color="#856404" sx={{ fontWeight: 500 }}>
                ⚠️ {authError}
              </Typography>
            </Paper>
          </Box>
        )}

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} lg={3}>
            <Card sx={{ 
              p: 3, 
              bgcolor: 'white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              borderRadius: 2,
              border: '1px solid #f0f0f0',
              position: 'relative',
            }}>
              {loading && (
                <Box sx={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  right: 0, 
                  bottom: 0, 
                  bgcolor: 'rgba(255,255,255,0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 2,
                  zIndex: 1,
                }}>
                  <CircularProgress size={20} />
                </Box>
              )}
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{ 
                  p: 1.5, 
                  bgcolor: '#EEF2FF', 
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <People sx={{ fontSize: 28, color: '#3B82F6' }} />
                </Box>
                <Box flex={1}>
                  <Typography variant="h4" fontWeight={600} color="#1a1a1a">
                    {stats.totalPatients}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Patients
                  </Typography>
                </Box>
              </Stack>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} lg={3}>
            <Card sx={{ 
              p: 3, 
              bgcolor: 'white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              borderRadius: 2,
              border: '1px solid #f0f0f0',
              position: 'relative',
            }}>
              {loading && (
                <Box sx={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  right: 0, 
                  bottom: 0, 
                  bgcolor: 'rgba(255,255,255,0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 2,
                  zIndex: 1,
                }}>
                  <CircularProgress size={20} />
                </Box>
              )}
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{ 
                  p: 1.5, 
                  bgcolor: '#ECFDF5', 
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <TrendingUp sx={{ fontSize: 28, color: '#10B981' }} />
                </Box>
                <Box flex={1}>
                  <Typography variant="h4" fontWeight={600} color="#1a1a1a">
                    {stats.activePatients}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Patients
                  </Typography>
                </Box>
              </Stack>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} lg={3}>
            <Card sx={{ 
              p: 3, 
              bgcolor: 'white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              borderRadius: 2,
              border: '1px solid #f0f0f0',
              position: 'relative',
            }}>
              {loading && (
                <Box sx={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  right: 0, 
                  bottom: 0, 
                  bgcolor: 'rgba(255,255,255,0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 2,
                  zIndex: 1,
                }}>
                  <CircularProgress size={20} />
                </Box>
              )}
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{ 
                  p: 1.5, 
                  bgcolor: '#FEF3C7', 
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <EventAvailable sx={{ fontSize: 28, color: '#F59E0B' }} />
                </Box>
                <Box flex={1}>
                  <Typography variant="h4" fontWeight={600} color="#1a1a1a">
                    {stats.upcomingAppointments}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Upcoming
                  </Typography>
                </Box>
              </Stack>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} lg={3}>
            <Card sx={{ 
              p: 3, 
              bgcolor: 'white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              borderRadius: 2,
              border: '1px solid #f0f0f0',
              position: 'relative',
            }}>
              {loading && (
                <Box sx={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  right: 0, 
                  bottom: 0, 
                  bgcolor: 'rgba(255,255,255,0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 2,
                  zIndex: 1,
                }}>
                  <CircularProgress size={20} />
                </Box>
              )}
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{ 
                  p: 1.5, 
                  bgcolor: '#D1FAE5', 
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <CheckCircle sx={{ fontSize: 28, color: '#059669' }} />
                </Box>
                <Box flex={1}>
                  <Typography variant="h4" fontWeight={600} color="#1a1a1a">
                    {stats.completedCases}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Completed
                  </Typography>
                </Box>
              </Stack>
            </Card>
          </Grid>
        </Grid>

        {/* Charts */}
        <Grid container spacing={3}>
          {/* Upcoming Appointments Chart */}
          <Grid item xs={12} lg={8}>
            <UpcomingAppointmentsChart appointments={appointments} />
          </Grid>

          {/* Case Status */}
          <Grid item xs={12} lg={4}>
            <Paper sx={{ 
              p: 3, 
              bgcolor: 'white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              borderRadius: 2,
              border: '1px solid #f0f0f0',
              height: '100%',
            }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6" fontWeight={600} color="#1a1a1a">
                  Case Status
              </Typography>
                <Chip 
                  label={`${statusData.reduce((sum, d) => sum + d.value, 0)} cases`} 
                  size="small" 
                  variant="outlined"
                />
              </Stack>
              {statusData.length === 0 ? (
                <Box display="flex" justifyContent="center" alignItems="center" height={250}>
                  <Typography color="text.secondary">No data available</Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                      data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                      label={({ name, value }: any) => `${name}: ${value}`}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
              )}
            </Paper>
          </Grid>

          {/* Monthly Case Trend Chart */}
          <Grid item xs={12}>
            <MonthlyCaseTrendChart cases={cases} dateRange={dateRange} />
          </Grid>
        </Grid>
      </Box>
    </LayoutWithSidebar>
  );
};

export default ClinicianAnalytics;
