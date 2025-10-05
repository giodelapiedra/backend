import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Avatar,
  CircularProgress,
  Paper,
  Button,
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
  Chip,
  IconButton,
} from '@mui/material';
import {
  AccessTime,
  Assignment,
  CheckCircle,
  Schedule,
  ExpandMore,
  ExpandLess,
  Visibility,
  Download,
  Close,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext.supabase';
import { dataClient } from '../../lib/supabase';
import { CaseAssignmentService } from '../../utils/caseAssignmentService';
import LayoutWithSidebar from '../../components/LayoutWithSidebar';
import { createImageProps } from '../../utils/imageUtils';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface ClinicianProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profileImage?: string;
  specialty?: string;
  licenseNumber?: string;
  isAvailable: boolean;
}

interface AnalyticsData {
  clinician: ClinicianProfile;
  analytics: {
    totalCases: number;
    activeCases: number;
    completedCases: number;
    upcomingAppointments: number;
    casesByStatus: {
      status: string;
      count: number;
    }[];
    casesByInjuryType: {
      injuryType: string;
      count: number;
    }[];
    monthlyStats: {
      month: string;
      newCases: number;
      completedCases: number;
    }[];
    averageRecoveryTime: number;
    successRate: number;
    appointmentStats: {
      total: number;
      upcoming: number;
      confirmed: number;
      completed: number;
      cancelled: number;
      byStatus: {
        status: string;
        count: number;
      }[];
      byType: {
        appointmentType: string;
        count: number;
      }[];
      monthlyAppointments: {
        month: string;
        appointments: number;
      }[];
    };
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const ClinicianAnalytics: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [monthlyAppointments, setMonthlyAppointments] = useState<any[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [expandedChart, setExpandedChart] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Fetch clinician profile
      const { data: clinicianData, error: clinicianError } = await dataClient
        .from('users')
        .select('*')
        .eq('id', user.id)
        .eq('role', 'clinician')
        .single();

      if (clinicianError) {
        throw clinicianError;
      }

      // Fetch cases assigned to this clinician using the case assignment service
      const assignedCases = await CaseAssignmentService.getClinicianCases(user.id);
      const casesData = assignedCases;
      const enrichedCases = assignedCases;
      
      console.log('Fetched assigned cases for analytics:', assignedCases.length);
      console.log('Current user (clinician):', user.id);

      // Appointments table doesn't exist yet, so we'll use mock data
      const appointmentsData: any[] = [];

      // Calculate analytics
      const totalCases = enrichedCases?.length || 0;
      const activeCases = enrichedCases?.filter(c => ['triaged', 'assessed', 'in_rehab'].includes(c.status)).length || 0;
      const completedCases = enrichedCases?.filter(c => c.status === 'completed').length || 0;
      const upcomingAppointments = appointmentsData?.filter(a => a.status === 'scheduled' || a.status === 'confirmed').length || 0;

      // Mock analytics data structure
      const analyticsData = {
        clinician: {
          id: clinicianData.id,
          firstName: clinicianData.first_name,
          lastName: clinicianData.last_name,
          email: clinicianData.email,
          specialty: 'Clinical Specialist',
          licenseNumber: 'CLN-001',
          isAvailable: true
        },
        analytics: {
          totalCases,
          activeCases,
          completedCases,
          upcomingAppointments,
          casesByStatus: [
            { status: 'triaged', count: enrichedCases?.filter(c => c.status === 'triaged').length || 0 },
            { status: 'assessed', count: enrichedCases?.filter(c => c.status === 'assessed').length || 0 },
            { status: 'in_rehab', count: enrichedCases?.filter(c => c.status === 'in_rehab').length || 0 },
            { status: 'completed', count: completedCases }
          ],
          casesByInjuryType: [
            { injuryType: 'Back Injury', count: enrichedCases?.filter(c => c.incident?.incident_type === 'strain_injury').length || 0 },
            { injuryType: 'Slip and Fall', count: enrichedCases?.filter(c => c.incident?.incident_type === 'slip_fall').length || 0 },
            { injuryType: 'Cut/Laceration', count: enrichedCases?.filter(c => c.incident?.incident_type === 'cut_laceration').length || 0 },
            { injuryType: 'Other', count: enrichedCases?.filter(c => !['strain_injury', 'slip_fall', 'cut_laceration'].includes(c.incident?.incident_type)).length || 0 }
          ],
          monthlyStats: [
            { month: 'Jan 2025', newCases: Math.floor(Math.random() * 5), completedCases: Math.floor(Math.random() * 3) },
            { month: 'Feb 2025', newCases: Math.floor(Math.random() * 5), completedCases: Math.floor(Math.random() * 3) },
            { month: 'Mar 2025', newCases: Math.floor(Math.random() * 5), completedCases: Math.floor(Math.random() * 3) }
          ],
          averageRecoveryTime: 45,
          successRate: totalCases > 0 ? Math.round((completedCases / totalCases) * 100) : 0,
          appointmentStats: {
            total: appointmentsData?.length || 0,
            upcoming: upcomingAppointments,
            confirmed: appointmentsData?.filter(a => a.status === 'confirmed').length || 0,
            completed: appointmentsData?.filter(a => a.status === 'completed').length || 0,
            cancelled: appointmentsData?.filter(a => a.status === 'cancelled').length || 0,
            byStatus: [
              { status: 'scheduled', count: appointmentsData?.filter(a => a.status === 'scheduled').length || 0 },
              { status: 'confirmed', count: appointmentsData?.filter(a => a.status === 'confirmed').length || 0 },
              { status: 'completed', count: appointmentsData?.filter(a => a.status === 'completed').length || 0 },
              { status: 'cancelled', count: appointmentsData?.filter(a => a.status === 'cancelled').length || 0 }
            ],
            byType: [
              { appointmentType: 'Initial Assessment', count: Math.floor(Math.random() * 5) },
              { appointmentType: 'Follow-up', count: Math.floor(Math.random() * 8) },
              { appointmentType: 'Progress Review', count: Math.floor(Math.random() * 3) }
            ],
            monthlyAppointments: [
              { month: 'Jan 2025', appointments: Math.floor(Math.random() * 10) },
              { month: 'Feb 2025', appointments: Math.floor(Math.random() * 10) },
              { month: 'Mar 2025', appointments: Math.floor(Math.random() * 10) }
            ]
          }
        }
      };

      setAnalyticsData(analyticsData);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load analytics data';
      setError(errorMessage);
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
    fetchAnalytics();
    }
  }, [user?.id]);

  const fetchMonthlyAppointments = async (month: string) => {
    try {
      setLoadingAppointments(true);
      
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Convert month string like "Jan 2025" to date range
      const [monthName, year] = month.split(' ');
      const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth();
      const startDate = new Date(parseInt(year), monthIndex, 1);
      const endDate = new Date(parseInt(year), monthIndex + 1, 0);
      
      // Appointments table doesn't exist yet, so we'll use mock data
      const appointmentsData: any[] = [];
      setMonthlyAppointments(appointmentsData);
    } catch (err: any) {
      console.error('Error fetching monthly appointments:', err);
      setMonthlyAppointments([]);
    } finally {
      setLoadingAppointments(false);
    }
  };

  const handleExpandMonth = (month: string) => {
    if (expandedMonth === month) {
      setExpandedMonth(null);
      setMonthlyAppointments([]);
    } else {
      setExpandedMonth(month);
      fetchMonthlyAppointments(month);
    }
  };

  const handleExpandChart = (chartType: string) => {
    setExpandedChart(chartType);
  };

  const downloadAnalyticsAsExcel = () => {
    if (!analyticsData?.analytics) return;

    const analytics = analyticsData.analytics;
    
    // Create multiple sheets data with proper null checks
    const sheets = {
      'Overview': [
        ['Metric', 'Value'],
        ['Total Cases', analytics.totalCases || 0],
        ['Active Cases', analytics.activeCases || 0],
        ['Completed Cases', analytics.completedCases || 0],
        ['Total Appointments', analytics.appointmentStats?.total || 0],
        ['Upcoming Appointments', analytics.appointmentStats?.upcoming || 0],
        ['Confirmed Appointments', analytics.appointmentStats?.confirmed || 0],
        ['Completed Appointments', analytics.appointmentStats?.completed || 0],
        ['Cancelled Appointments', analytics.appointmentStats?.cancelled || 0]
      ],
      'Monthly Progress': [
        ['Month', 'New Cases', 'Completed Cases'],
        ...(analytics.monthlyStats || []).map((stat: any) => [stat.month, stat.newCases || 0, stat.completedCases || 0])
      ],
      'Monthly Appointments': [
        ['Month', 'Appointments'],
        ...(analytics.appointmentStats?.monthlyAppointments || []).map((stat: any) => [stat.month, stat.appointments || 0])
      ],
      'Case Status Distribution': [
        ['Status', 'Count'],
        ...(analytics.casesByStatus || []).map((stat: any) => [stat.status, stat.count || 0])
      ],
      'Appointment Status Distribution': [
        ['Status', 'Count'],
        ...(analytics.appointmentStats?.byStatus || []).map((stat: any) => [stat.status, stat.count || 0])
      ],
      'Appointment Type Distribution': [
        ['Type', 'Count'],
        ...(analytics.appointmentStats?.byType || []).map((stat: any) => [stat.appointmentType, stat.count || 0])
      ]
    };

    // Convert to CSV format (we'll create multiple CSV files)
    Object.entries(sheets).forEach(([sheetName, data]) => {
      const csvContent = data.map((row: any[]) => 
        row.map((cell: any) => `"${cell}"`).join(',')
      ).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `analytics_${sheetName.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  if (loading) {
    return (
      <LayoutWithSidebar>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </LayoutWithSidebar>
    );
  }

  if (error) {
    return (
      <LayoutWithSidebar>
        <Box p={3}>
          <Typography color="error">{error}</Typography>
        </Box>
      </LayoutWithSidebar>
    );
  }

  return (
    <LayoutWithSidebar>
      <Box sx={{ p: 3, background: '#f8fafc', minHeight: '100vh' }}>
        {/* Header Section */}
        <Box sx={{ mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h4" component="h1" gutterBottom sx={{ 
                fontWeight: 600,
                color: '#1a1a1a',
                mb: 0.5
              }}>
                📊 Clinician Analytics
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 400 }}>
                Comprehensive overview of your cases and appointments
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={downloadAnalyticsAsExcel}
              sx={{ 
                borderRadius: 1,
                px: 3,
                py: 1,
                borderColor: '#7B68EE',
                color: '#7B68EE',
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '14px',
                '&:hover': {
                  backgroundColor: 'rgba(123, 104, 238, 0.04)',
                  borderColor: '#7B68EE',
                },
                transition: 'all 0.2s ease'
              }}
            >
              Download Excel
            </Button>
          </Box>
        </Box>

        {/* Profile Section */}
        <Card sx={{ mb: 4, borderRadius: 2, boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}>
          <CardContent>
            <Grid container spacing={3} alignItems="center">
              <Grid item>
                {analyticsData?.clinician.profileImage ? (
                  <img
                    {...createImageProps(analyticsData.clinician.profileImage)}
                    alt={`${analyticsData.clinician.firstName} ${analyticsData.clinician.lastName}`}
                    style={{
                      width: 100,
                      height: 100,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      boxShadow: '0 4px 12px rgba(123, 104, 238, 0.3)',
                      border: '3px solid rgba(255,255,255,0.8)',
                    }}
                  />
                ) : (
                  <Avatar
                    sx={{ 
                      width: 100, 
                      height: 100, 
                      background: 'linear-gradient(135deg, #7B68EE 0%, #20B2AA 100%)',
                      fontWeight: 700,
                      fontSize: '2rem',
                      boxShadow: '0 4px 12px rgba(123, 104, 238, 0.3)',
                      border: '3px solid rgba(255,255,255,0.8)',
                      '&:hover': {
                        transform: 'scale(1.05)',
                        boxShadow: '0 4px 20px rgba(123, 104, 238, 0.4)',
                        transition: 'all 0.2s ease-in-out'
                      }
                    }}
                  >
                    {analyticsData?.clinician.firstName?.[0]}{analyticsData?.clinician.lastName?.[0]}
                  </Avatar>
                )}
              </Grid>
              <Grid item xs>
                <Typography variant="h4" gutterBottom>
                  Dr. {analyticsData?.clinician.firstName} {analyticsData?.clinician.lastName}
                </Typography>
                <Typography variant="body1" color="textSecondary">
                  {analyticsData?.clinician.specialty || 'Clinical Specialist'}
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  License: {analyticsData?.clinician.licenseNumber}
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Grid container spacing={3}>
                    <Grid item>
                      <Typography variant="h6">{analyticsData?.analytics.totalCases || 0}</Typography>
                      <Typography variant="body2" color="textSecondary">Total Cases</Typography>
                    </Grid>
                    <Grid item>
                      <Typography variant="h6">{analyticsData?.analytics.activeCases || 0}</Typography>
                      <Typography variant="body2" color="textSecondary">Active Cases</Typography>
                    </Grid>
                    <Grid item>
                      <Typography variant="h6">{analyticsData?.analytics.successRate || 0}%</Typography>
                      <Typography variant="body2" color="textSecondary">Success Rate</Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Analytics Grid */}
        <Grid container spacing={3}>
          {/* Case Status Distribution */}
          <Grid item xs={12} md={6}>
            <Paper 
              sx={{ 
                p: 3, 
                borderRadius: 2,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': { 
                  backgroundColor: 'rgba(123, 104, 238, 0.08)',
                  borderColor: '#7B68EE',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 25px rgba(123, 104, 238, 0.15)'
                }
              }}
              onClick={() => handleExpandChart('caseStatus')}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Case Status Distribution</Typography>
                <Typography variant="caption" sx={{ color: '#7B68EE', fontSize: '0.75rem' }}>
                  Click to expand
                </Typography>
              </Box>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analyticsData?.analytics.casesByStatus}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {analyticsData?.analytics.casesByStatus.map((entry: { status: string; count: number }, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>

          {/* Monthly Progress */}
          <Grid item xs={12} md={6}>
            <Paper 
              sx={{ 
                p: 3, 
                borderRadius: 2,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': { 
                  backgroundColor: 'rgba(123, 104, 238, 0.08)',
                  borderColor: '#7B68EE',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 25px rgba(123, 104, 238, 0.15)'
                }
              }}
              onClick={() => handleExpandChart('monthlyProgress')}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Monthly Progress</Typography>
                <Typography variant="caption" sx={{ color: '#7B68EE', fontSize: '0.75rem' }}>
                  Click to expand
                </Typography>
              </Box>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analyticsData?.analytics.monthlyStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="newCases" stroke="#8884d8" name="New Cases" />
                    <Line type="monotone" dataKey="completedCases" stroke="#82ca9d" name="Completed Cases" />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>

          {/* Injury Type Distribution */}
          <Grid item xs={12} md={6}>
            <Paper 
              sx={{ 
                p: 3, 
                borderRadius: 2,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': { 
                  backgroundColor: 'rgba(123, 104, 238, 0.08)',
                  borderColor: '#7B68EE',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 25px rgba(123, 104, 238, 0.15)'
                }
              }}
              onClick={() => handleExpandChart('injuryType')}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Injury Type Distribution</Typography>
                <Typography variant="caption" sx={{ color: '#7B68EE', fontSize: '0.75rem' }}>
                  Click to expand
                </Typography>
              </Box>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData?.analytics.casesByInjuryType}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="injuryType" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#8884d8" name="Cases" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>

          {/* Appointment Status Distribution */}
          <Grid item xs={12} md={6}>
            <Paper 
              sx={{ 
                p: 3, 
                borderRadius: 2,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': { 
                  backgroundColor: 'rgba(123, 104, 238, 0.08)',
                  borderColor: '#7B68EE',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 25px rgba(123, 104, 238, 0.15)'
                }
              }}
              onClick={() => handleExpandChart('appointmentStatus')}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Appointment Status Distribution</Typography>
                <Typography variant="caption" sx={{ color: '#7B68EE', fontSize: '0.75rem' }}>
                  Click to expand
                </Typography>
              </Box>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analyticsData?.analytics.appointmentStats.byStatus}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {analyticsData?.analytics.appointmentStats.byStatus.map((entry: { status: string; count: number }, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>

          {/* Appointment Type Distribution */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom>Appointment Type Distribution</Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData?.analytics.appointmentStats.byType}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="appointmentType" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#00C49F" name="Appointments" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>

          {/* Monthly Appointments */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Monthly Appointments</Typography>
                <Button
                  size="small"
                  startIcon={<ExpandMore />}
                  onClick={() => setExpandedMonth('modal')}
                  sx={{ color: '#7B68EE' }}
                >
                  Expand
                </Button>
              </Box>
              
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analyticsData?.analytics.appointmentStats.monthlyAppointments}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="appointments" stroke="#FF8042" name="Appointments" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>

          {/* Key Metrics */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom>Key Metrics</Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <AccessTime sx={{ fontSize: 40, color: '#0088FE', mb: 1 }} />
                    <Typography variant="h4">{analyticsData?.analytics.averageRecoveryTime || 0}</Typography>
                    <Typography variant="body2" color="textSecondary">Avg. Recovery Days</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Assignment sx={{ fontSize: 40, color: '#00C49F', mb: 1 }} />
                    <Typography variant="h4">{analyticsData?.analytics.activeCases || 0}</Typography>
                    <Typography variant="body2" color="textSecondary">Active Cases</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Schedule sx={{ fontSize: 40, color: '#FFBB28', mb: 1 }} />
                    <Typography variant="h4">{analyticsData?.analytics.appointmentStats.upcoming || 0}</Typography>
                    <Typography variant="body2" color="textSecondary">Upcoming Appointments</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <CheckCircle sx={{ fontSize: 40, color: '#FF8042', mb: 1 }} />
                    <Typography variant="h4">{analyticsData?.analytics.completedCases || 0}</Typography>
                    <Typography variant="body2" color="textSecondary">Completed Cases</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Appointment Metrics */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom>Appointment Metrics</Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Schedule sx={{ fontSize: 40, color: '#0088FE', mb: 1 }} />
                    <Typography variant="h4">{analyticsData?.analytics.appointmentStats.total || 0}</Typography>
                    <Typography variant="body2" color="textSecondary">Total Appointments</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <CheckCircle sx={{ fontSize: 40, color: '#00C49F', mb: 1 }} />
                    <Typography variant="h4">{analyticsData?.analytics.appointmentStats.confirmed || 0}</Typography>
                    <Typography variant="body2" color="textSecondary">Confirmed Appointments</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Assignment sx={{ fontSize: 40, color: '#FFBB28', mb: 1 }} />
                    <Typography variant="h4">{analyticsData?.analytics.appointmentStats.completed || 0}</Typography>
                    <Typography variant="body2" color="textSecondary">Completed Appointments</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <AccessTime sx={{ fontSize: 40, color: '#FF8042', mb: 1 }} />
                    <Typography variant="h4">{analyticsData?.analytics.appointmentStats.cancelled || 0}</Typography>
                    <Typography variant="body2" color="textSecondary">Cancelled Appointments</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>

        {/* Monthly Appointments Expanded Modal */}
        <Dialog 
          open={expandedMonth === 'modal'} 
          onClose={() => setExpandedMonth(null)}
          maxWidth="xl"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 2,
              maxHeight: '90vh'
            }
          }}
        >
          <DialogTitle sx={{ pb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#2c3e50' }}>
                📊 Monthly Appointments - Expanded View
              </Typography>
              <IconButton 
                onClick={() => setExpandedMonth(null)} 
                size="small"
                sx={{ 
                  backgroundColor: 'rgba(123, 104, 238, 0.1)',
                  '&:hover': { backgroundColor: 'rgba(123, 104, 238, 0.2)' }
                }}
              >
                <ExpandLess />
              </IconButton>
            </Box>
          </DialogTitle>
          
          <DialogContent>
            {/* Expanded Chart */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                📈 Monthly Appointments Trend
              </Typography>
              <Box sx={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analyticsData?.analytics.appointmentStats.monthlyAppointments}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 14, fill: '#666' }}
                      axisLine={{ stroke: '#666' }}
                    />
                    <YAxis 
                      tick={{ fontSize: 14, fill: '#666' }}
                      axisLine={{ stroke: '#666' }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="appointments" 
                      stroke="#FF8042" 
                      name="Appointments" 
                      strokeWidth={4}
                      dot={{ fill: '#FF8042', strokeWidth: 2, r: 6 }}
                      activeDot={{ r: 8, stroke: '#FF8042', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Box>

            {/* Monthly Breakdown */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                📊 Monthly Breakdown - Click any month to view details
              </Typography>
              <Grid container spacing={3}>
                {analyticsData?.analytics.appointmentStats.monthlyAppointments.map((monthData, index) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                    <Card 
                      variant="outlined" 
                      sx={{ 
                        p: 3, 
                        cursor: 'pointer',
                        height: '100%',
                        transition: 'all 0.3s ease',
                        '&:hover': { 
                          backgroundColor: 'rgba(123, 104, 238, 0.08)',
                          borderColor: '#7B68EE',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 8px 25px rgba(123, 104, 238, 0.15)'
                        }
                      }}
                      onClick={() => handleExpandMonth(monthData.month)}
                    >
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#2c3e50', mb: 1 }}>
                          {monthData.month}
                        </Typography>
                        <Typography variant="h4" sx={{ color: '#7B68EE', fontWeight: 800, mb: 2 }}>
                          {monthData.appointments}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
                          appointments
                        </Typography>
                        <IconButton 
                          size="small"
                          sx={{ 
                            backgroundColor: 'rgba(123, 104, 238, 0.1)',
                            '&:hover': { backgroundColor: 'rgba(123, 104, 238, 0.2)' }
                          }}
                        >
                          <ExpandMore />
                        </IconButton>
                      </Box>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </DialogContent>
          
          <DialogActions>
            <Button onClick={() => setExpandedMonth(null)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Monthly Appointments Detail Dialog */}
        <Dialog 
          open={expandedMonth !== null && expandedMonth !== 'modal' && expandedMonth !== 'all'} 
          onClose={() => setExpandedMonth(null)}
          maxWidth="xl"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 2,
              maxHeight: '90vh'
            }
          }}
        >
          <DialogTitle sx={{ pb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#2c3e50' }}>
                📋 Detailed Appointments for {expandedMonth}
              </Typography>
              <IconButton 
                onClick={() => setExpandedMonth(null)} 
                size="small"
                sx={{ 
                  backgroundColor: 'rgba(123, 104, 238, 0.1)',
                  '&:hover': { backgroundColor: 'rgba(123, 104, 238, 0.2)' }
                }}
              >
                <ExpandLess />
              </IconButton>
            </Box>
          </DialogTitle>
          
          <DialogContent>
            {loadingAppointments ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            ) : monthlyAppointments.length === 0 ? (
              <Box textAlign="center" p={3}>
                <Typography color="text.secondary">
                  No appointments found for {expandedMonth}
                </Typography>
              </Box>
            ) : (
              <TableContainer 
                component={Paper} 
                variant="outlined"
                sx={{ 
                  borderRadius: 2,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              >
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'rgba(123, 104, 238, 0.05)' }}>
                      <TableCell sx={{ fontWeight: 600, fontSize: '1rem' }}>📅 Date & Time</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '1rem' }}>👤 Patient</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '1rem' }}>🏥 Type</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '1rem' }}>📊 Status</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '1rem' }}>⏱️ Duration</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '1rem' }}>🔧 Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {monthlyAppointments.map((appointment, index) => (
                      <TableRow 
                        key={appointment._id}
                        sx={{ 
                          '&:hover': { 
                            backgroundColor: 'rgba(123, 104, 238, 0.02)' 
                          },
                          '&:nth-of-type(even)': {
                            backgroundColor: 'rgba(0,0,0,0.01)'
                          }
                        }}
                      >
                        <TableCell sx={{ py: 2 }}>
                          <Box>
                            <Typography variant="body1" fontWeight={600} sx={{ fontSize: '1rem' }}>
                              {new Date(appointment.scheduledDate).toLocaleDateString()}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
                              {new Date(appointment.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 2 }}>
                          <Box display="flex" alignItems="center" gap={2}>
                            <Avatar sx={{ width: 40, height: 40, fontSize: '1rem', backgroundColor: '#7B68EE' }}>
                              {appointment.worker.firstName.charAt(0)}{appointment.worker.lastName.charAt(0)}
                            </Avatar>
                            <Box>
                              <Typography variant="body1" fontWeight={500} sx={{ fontSize: '1rem' }}>
                                {appointment.worker.firstName} {appointment.worker.lastName}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
                                Case: {appointment.case.caseNumber}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 2 }}>
                          <Chip
                            label={appointment.appointmentType.replace('_', ' ')}
                            size="medium"
                            variant="outlined"
                            sx={{ 
                              fontSize: '0.9rem',
                              fontWeight: 500,
                              borderColor: '#7B68EE',
                              color: '#7B68EE'
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ py: 2 }}>
                          <Chip
                            label={appointment.status.replace('_', ' ')}
                            color={appointment.status === 'completed' ? 'success' : 
                                   appointment.status === 'confirmed' ? 'primary' : 
                                   appointment.status === 'cancelled' ? 'error' : 'default'}
                            size="medium"
                            sx={{ 
                              fontSize: '0.9rem',
                              fontWeight: 600
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ py: 2 }}>
                          <Typography variant="body1" fontWeight={500} sx={{ fontSize: '1rem' }}>
                            {appointment.duration} min
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 2 }}>
                          <IconButton 
                            size="medium" 
                            color="primary"
                            sx={{ 
                              backgroundColor: 'rgba(123, 104, 238, 0.1)',
                              '&:hover': { backgroundColor: 'rgba(123, 104, 238, 0.2)' }
                            }}
                          >
                            <Visibility />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DialogContent>
          
          <DialogActions>
            <Button onClick={() => setExpandedMonth(null)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Expanded Case Status Distribution Dialog */}
        <Dialog 
          open={expandedChart === 'caseStatus'} 
          onClose={() => setExpandedChart(null)}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            }
          }}
        >
          <DialogTitle sx={{ pb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#2c3e50' }}>
                📊 Case Status Distribution - Detailed View
              </Typography>
              <IconButton onClick={() => setExpandedChart(null)} size="small">
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          
          <DialogContent>
            {/* Expanded Chart */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ height: 500 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analyticsData?.analytics.casesByStatus}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={150}
                      label={({ name, value, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {analyticsData?.analytics.casesByStatus.map((entry: { status: string; count: number }, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Box>

            {/* Detailed Statistics */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                📈 Detailed Statistics
              </Typography>
              <Grid container spacing={2}>
                {analyticsData?.analytics.casesByStatus.map((item, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Card sx={{ p: 2, backgroundColor: `${COLORS[index % COLORS.length]}15` }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ 
                          width: 20, 
                          height: 20, 
                          backgroundColor: COLORS[index % COLORS.length],
                          borderRadius: '50%' 
                        }} />
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {item.status.replace('_', ' ').toUpperCase()}
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS[index % COLORS.length] }}>
                            {item.count} cases
                          </Typography>
                        </Box>
                      </Box>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </DialogContent>
          
          <DialogActions>
            <Button onClick={() => setExpandedChart(null)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Expanded Monthly Progress Dialog */}
        <Dialog 
          open={expandedChart === 'monthlyProgress'} 
          onClose={() => setExpandedChart(null)}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            }
          }}
        >
          <DialogTitle sx={{ pb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#2c3e50' }}>
                📈 Monthly Progress - Detailed View
              </Typography>
              <IconButton onClick={() => setExpandedChart(null)} size="small">
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          
          <DialogContent>
            {/* Expanded Chart */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ height: 500 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analyticsData?.analytics.monthlyStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="newCases" stroke="#8884d8" name="New Cases" strokeWidth={3} />
                    <Line type="monotone" dataKey="completedCases" stroke="#82ca9d" name="Completed Cases" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Box>

            {/* Monthly Data Table */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                📊 Monthly Data Breakdown
              </Typography>
              <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                      <TableCell sx={{ fontWeight: 600 }}>Month</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">New Cases</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">Completed Cases</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">Completion Rate</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analyticsData?.analytics.monthlyStats.map((month, index) => (
                      <TableRow key={index}>
                        <TableCell sx={{ fontWeight: 500 }}>{month.month}</TableCell>
                        <TableCell align="right">
                          <Chip 
                            label={month.newCases} 
                            color="primary" 
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Chip 
                            label={month.completedCases} 
                            color="success" 
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {month.newCases > 0 ? ((month.completedCases / month.newCases) * 100).toFixed(1) : 0}%
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </DialogContent>
          
          <DialogActions>
            <Button onClick={() => setExpandedChart(null)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Expanded Injury Type Distribution Dialog */}
        <Dialog 
          open={expandedChart === 'injuryType'} 
          onClose={() => setExpandedChart(null)}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            }
          }}
        >
          <DialogTitle sx={{ pb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#2c3e50' }}>
                📊 Injury Type Distribution - Detailed View
              </Typography>
              <IconButton onClick={() => setExpandedChart(null)} size="small">
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          
          <DialogContent>
            {/* Expanded Chart */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ height: 500 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData?.analytics.casesByInjuryType}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="injuryType" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#8884d8" name="Cases" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Box>

            {/* Detailed Statistics */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                📈 Detailed Statistics
              </Typography>
              <Grid container spacing={2}>
                {analyticsData?.analytics.casesByInjuryType.map((item, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Card sx={{ p: 2, backgroundColor: '#8884d815' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ 
                          width: 20, 
                          height: 20, 
                          backgroundColor: '#8884d8',
                          borderRadius: '50%' 
                        }} />
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {item.injuryType.toUpperCase()}
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: '#8884d8' }}>
                            {item.count} cases
                          </Typography>
                        </Box>
                      </Box>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </DialogContent>
          
          <DialogActions>
            <Button onClick={() => setExpandedChart(null)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Expanded Appointment Status Distribution Dialog */}
        <Dialog 
          open={expandedChart === 'appointmentStatus'} 
          onClose={() => setExpandedChart(null)}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            }
          }}
        >
          <DialogTitle sx={{ pb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#2c3e50' }}>
                📊 Appointment Status Distribution - Detailed View
              </Typography>
              <IconButton onClick={() => setExpandedChart(null)} size="small">
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          
          <DialogContent>
            {/* Expanded Chart */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ height: 500 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analyticsData?.analytics.appointmentStats.byStatus}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={150}
                      label={({ name, value, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {analyticsData?.analytics.appointmentStats.byStatus.map((entry: { status: string; count: number }, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Box>

            {/* Detailed Statistics */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                📈 Detailed Statistics
              </Typography>
              <Grid container spacing={2}>
                {analyticsData?.analytics.appointmentStats.byStatus.map((item, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Card sx={{ p: 2, backgroundColor: `${COLORS[index % COLORS.length]}15` }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ 
                          width: 20, 
                          height: 20, 
                          backgroundColor: COLORS[index % COLORS.length],
                          borderRadius: '50%' 
                        }} />
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {item.status.replace('_', ' ').toUpperCase()}
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS[index % COLORS.length] }}>
                            {item.count} appointments
                          </Typography>
                        </Box>
                      </Box>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </DialogContent>
          
          <DialogActions>
            <Button onClick={() => setExpandedChart(null)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LayoutWithSidebar>
  );
};

export default ClinicianAnalytics;

