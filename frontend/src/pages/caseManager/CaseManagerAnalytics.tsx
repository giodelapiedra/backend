import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  ButtonGroup,
  CircularProgress,
  Alert,
  Avatar,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  useTheme,
  useMediaQuery,
  Tooltip,
  IconButton,
  Divider,
} from '@mui/material';
import {
  TrendingUp,
  Assignment,
  CheckCircle,
  People,
  Warning,
  Schedule,
  LocalHospital,
  Refresh,
  Download,
  ChevronRight,
  AssignmentLate,
  ShowChart,
  BarChart,
} from '@mui/icons-material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement,
  BarElement,
  Filler,
} from 'chart.js';
import { Line, Pie, Bar } from 'react-chartjs-2';
import LayoutWithSidebar from '../../components/LayoutWithSidebar';
import { useAuth } from '../../contexts/AuthContext.supabase';
import axios from 'axios';
import { authClient } from '../../lib/supabase';

// Create API client for analytics
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
const analyticsApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth interceptor
analyticsApi.interceptors.request.use(
  async (config) => {
    try {
      const { data: { session } } = await authClient.auth.getSession();
      if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement,
  BarElement,
  Filler
);

type TimePeriod = 'week' | 'month' | 'year';

interface KPIData {
  totalCases: number;
  activeCases: number;
  completedCases: number;
  newCasesThisPeriod: number;
  closedThisPeriod: number;
  avgResolutionDays: number;   
  clinicianAssignmentRate: number;
  successRate: number;
}

interface AnalyticsData {
  kpis: KPIData;
  distributions: {
    casesByStatus: Array<{ status: string; count: number }>;
    casesBySeverity: Array<{ severity: string; count: number }>;
    casesByInjuryType: Array<{ injuryType: string; count: number }>;
  };
}

interface TrendData {
  date: string;
  newCases: number;
  closedCases: number;
  activeCases: number;
}

interface ClinicianMetric {
  id: string;
  name: string;
  specialty: string;
  isAvailable: boolean;
  activeCases: number;
  completedCases: number;
  totalCases: number;
  avgDuration: number;
  successRate: number;
}

interface WorkerRequiringAttention {
  workerId: string;
  workerName: string;
  caseNumber: string;
  caseStatus: string;
  daysSinceUpdate: number;
  clinicianName: string;
}

interface DeadlineItem {
  id: string;
  title: string;
  dueDate: string;
  dueTime: string;
  status: string;
  workerName: string;
  daysUntilDue: number;
  type: string;
}

const CaseManagerAnalytics: React.FC = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [timePeriod, setTimePeriod] = useState<TimePeriod>('month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [clinicianMetrics, setClinicianMetrics] = useState<ClinicianMetric[]>([]);
  const [workerData, setWorkerData] = useState<any>(null);
  const [deadlineData, setDeadlineData] = useState<any>(null);

  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // OPTIMIZATION: AbortController for request cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // OPTIMIZATION: Memoize fetchAnalyticsData with useCallback to prevent re-renders
  const fetchAnalyticsData = useCallback(async () => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setLoading(true);
    setError(null);

    console.log('Fetching analytics from:', API_BASE_URL);
    console.log('Time period:', timePeriod);

    try {
      // Get incident types from Supabase and count them
      const { data: incidents, error: incidentError } = await authClient
        .from('incidents')
        .select('incident_type')
        .not('incident_type', 'is', null);

      if (incidentError) throw incidentError;

      // Count and sort incident types
      const typeCounts = incidents.reduce((acc: Record<string, number>, incident: any) => {
        const type = incident.incident_type;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});

      // Get top 5 incident types
      const formattedIncidentTypes = Object.entries(typeCounts)
        .map(([type, count]) => ({ injuryType: type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // OPTIMIZATION: Parallel requests with cancellation support
      const [overviewRes, trendsRes, cliniciansRes, workersRes, deadlinesRes] = await Promise.all([
        analyticsApi.get(`/analytics/case-manager/overview?period=${timePeriod}`, { signal }),
        analyticsApi.get(`/analytics/case-manager/trends?period=${timePeriod}`, { signal }),
        analyticsApi.get('/analytics/case-manager/clinicians', { signal }),
        analyticsApi.get('/analytics/case-manager/workers', { signal }),
        analyticsApi.get('/analytics/case-manager/deadlines', { signal }),
      ]);

      // Merge incident types data with overview data
      const overviewData = overviewRes.data.data;
      overviewData.distributions.casesByInjuryType = formattedIncidentTypes;

      console.log('✅ API Responses:', {
        overview: overviewRes.data,
        trends: trendsRes.data,
        clinicians: cliniciansRes.data,
        workers: workersRes.data,
        deadlines: deadlinesRes.data,
      });

      setAnalyticsData(overviewRes.data.data);
      setTrendData(trendsRes.data.data.trends);
      setClinicianMetrics(cliniciansRes.data.data.clinicians);
      setWorkerData(workersRes.data.data);
      setDeadlineData(deadlinesRes.data.data);
      setLastUpdated(new Date());
      
      console.log('📊 State Updated:', {
        kpis: overviewRes.data.data.kpis,
        trendsCount: trendsRes.data.data.trends.length,
        cliniciansCount: cliniciansRes.data.data.clinicians.length,
      });
    } catch (err: any) {
      // Ignore abort errors (they're expected when switching periods quickly)
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        console.log('Request cancelled (expected behavior)');
        return;
      }

      console.error('❌ Error fetching analytics:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      setError(err.response?.data?.message || err.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [timePeriod]); // Only depend on timePeriod

  useEffect(() => {
    fetchAnalyticsData();

    // OPTIMIZATION: Cleanup function to cancel pending requests
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchAnalyticsData]);

  // KPI Card Component
  const KPICard = ({ title, value, subtitle, icon, color, trend }: any) => (
    <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }}>
      <CardContent>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between">
          <Box flex={1}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight="bold" color={color || 'primary.main'}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
            {trend && (
              <Chip
                size="small"
                label={trend}
                color={trend.startsWith('+') ? 'success' : 'error'}
                sx={{ mt: 1 }}
              />
            )}
          </Box>
          <Avatar sx={{ bgcolor: `${color || 'primary.main'}20`, color: color || 'primary.main' }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  // OPTIMIZATION: Memoize color helpers
  const getStatusColor = useCallback((status: string) => {
    const colors: Record<string, string> = {
      new: '#2196f3',
      triaged: '#ff9800',
      assessed: '#9c27b0',
      in_rehab: '#e91e63',
      return_to_work: '#4caf50',
      closed: '#2e7d32',
    };
    return colors[status] || '#757575';
  }, []);

  const getSeverityColor = useCallback((severity: string) => {
    const colors: Record<string, string> = {
      critical: '#d32f2f',
      high: '#f57c00',
      medium: '#fbc02d',
      low: '#388e3c',
    };
    return colors[severity.toLowerCase()] || '#757575';
  }, []);

  // OPTIMIZATION: Memoize trend chart data to prevent recalculation on every render
  const trendChartData = useMemo(() => {
    if (!trendData || trendData.length === 0) {
      return null;
    }

    // Create smooth gradients like the sample image (top to bottom fade)
    const createGradient = (ctx: any, topColor: string, bottomColor: string) => {
      const gradient = ctx.createLinearGradient(0, 0, 0, 400);
      gradient.addColorStop(0, topColor);
      gradient.addColorStop(0.7, bottomColor);
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0.01)');
      return gradient;
    };

    return {
      labels: trendData.map((d) => d.date),
      datasets: [
        {
          label: 'New Cases',
          data: trendData.map((d) => d.newCases),
          borderColor: 'rgba(255, 112, 112, 1)', // Coral/salmon red
          backgroundColor: (context: any) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) return 'rgba(255, 112, 112, 0.6)';
            return createGradient(ctx, 'rgba(255, 112, 112, 0.85)', 'rgba(255, 112, 112, 0.15)');
          },
          borderWidth: 2.5,
          fill: true,
          tension: 0.45, // Smooth curves
          pointRadius: 0, // Hide points by default
          pointHoverRadius: 7,
          pointBackgroundColor: 'rgba(255, 112, 112, 1)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(255, 112, 112, 1)',
          pointHoverBorderWidth: 3,
        },
        {
          label: 'Closed Cases',
          data: trendData.map((d) => d.closedCases),
          borderColor: 'rgba(100, 200, 255, 1)', // Cyan/light blue
          backgroundColor: (context: any) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) return 'rgba(100, 200, 255, 0.6)';
            return createGradient(ctx, 'rgba(100, 200, 255, 0.85)', 'rgba(100, 200, 255, 0.15)');
          },
          borderWidth: 2.5,
          fill: true,
          tension: 0.45,
          pointRadius: 0,
          pointHoverRadius: 7,
          pointBackgroundColor: 'rgba(100, 200, 255, 1)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(100, 200, 255, 1)',
          pointHoverBorderWidth: 3,
        },
        {
          label: 'Active Cases',
          data: trendData.map((d) => d.activeCases),
          borderColor: 'rgba(167, 143, 198, 1)', // Purple/lavender
          backgroundColor: (context: any) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) return 'rgba(167, 143, 198, 0.6)';
            return createGradient(ctx, 'rgba(167, 143, 198, 0.85)', 'rgba(167, 143, 198, 0.15)');
          },
          borderWidth: 2.5,
          fill: true,
          tension: 0.45,
          pointRadius: 0,
          pointHoverRadius: 7,
          pointBackgroundColor: 'rgba(167, 143, 198, 1)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(167, 143, 198, 1)',
          pointHoverBorderWidth: 3,
        },
      ],
    };
  }, [trendData]); // Only recalculate when trendData changes

  // OPTIMIZATION: Memoize chart options (static, never changes)
  const trendChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          boxWidth: 12,
          boxHeight: 12,
          font: {
            size: 11,
            weight: 'bold' as const,
          },
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        padding: 14,
        titleFont: {
          size: 13,
          weight: 'bold' as const,
        },
        bodyFont: {
          size: 12,
        },
        bodySpacing: 8,
        usePointStyle: true,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
      },
    },
    scales: {
      x: {
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.03)',
          drawBorder: false,
        },
        ticks: {
          font: {
            size: 10,
          },
          maxRotation: 0,
          minRotation: 0,
          color: 'rgba(0, 0, 0, 0.6)',
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.06)',
          drawBorder: false,
        },
        ticks: {
          precision: 0,
          font: {
            size: 10,
          },
          padding: 10,
          color: 'rgba(0, 0, 0, 0.6)',
        },
      },
    },
  }), []); // Static options, never change

  // Render trend chart component
  const renderTrendChart = () => {
    if (!trendChartData) {
      return (
        <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height={300}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No trend data available
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No cases found for the selected time period ({timePeriod})
          </Typography>
        </Box>
      );
    }

    return <Line data={trendChartData} options={trendChartOptions} height={300} />;
  };

  // Render case status pie chart with enhanced styling
  const renderStatusPieChart = () => {
    if (!analyticsData?.distributions.casesByStatus) return null;

    const data = analyticsData.distributions.casesByStatus.filter((d) => d.count > 0);

    if (data.length === 0) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" height={300}>
          <Typography color="text.secondary">No data available</Typography>
        </Box>
      );
    }

    const chartData = {
      labels: data.map((d) => {
        const status = d.status.replace(/_/g, ' ').toUpperCase();
        return status === 'NEW' ? 'OPEN CASES' : status;
      }),
      datasets: [
        {
          data: data.map((d) => d.count),
          backgroundColor: data.map((d) => getStatusColor(d.status)),
          borderWidth: 3,
          borderColor: '#fff',
          hoverOffset: 15,
          hoverBorderWidth: 4,
          hoverBorderColor: '#fff',
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right' as const,
          labels: {
            boxWidth: 15,
            padding: 15,
            font: {
              size: 11,
              weight: 'normal' as const,
            },
            usePointStyle: true,
            pointStyle: 'circle',
          },
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          titleFont: {
            size: 14,
            weight: 'bold' as const,
          },
          bodyFont: {
            size: 13,
          },
          borderColor: 'rgba(255, 255, 255, 0.2)',
          borderWidth: 1,
          callbacks: {
            label: function (context: any) {
              const label = context.label || '';
              const value = context.parsed || 0;
              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: ${value} (${percentage}%)`;
            },
          },
        },
      },
    };

    return <Pie data={chartData} options={options} height={300} />;
  };

  // Render injury type bar chart with gradient
  const renderInjuryTypeChart = () => {
    if (!analyticsData?.distributions?.casesByInjuryType) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" height={300}>
          <CircularProgress />
        </Box>
      );
    }

    const data = analyticsData.distributions.casesByInjuryType
      .filter((d) => d.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const chartData = {
      labels: data.map((d) => d.injuryType),
      datasets: [
        {
          label: 'Cases',
          data: data.map((d) => d.count),
          backgroundColor: (context: any) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) return '#0073e6';
            const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
            gradient.addColorStop(0, 'rgba(0, 115, 230, 0.9)');
            gradient.addColorStop(0.5, 'rgba(33, 150, 243, 0.8)');
            gradient.addColorStop(1, 'rgba(100, 181, 246, 0.7)');
            return gradient;
          },
          borderRadius: 8,
          borderWidth: 0,
          hoverBackgroundColor: '#005bb5',
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y' as const,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          titleFont: {
            size: 14,
            weight: 'bold' as const,
          },
          bodyFont: {
            size: 13,
          },
          borderColor: 'rgba(255, 255, 255, 0.2)',
          borderWidth: 1,
          callbacks: {
            label: function (context: any) {
              return `Cases: ${context.parsed.x}`;
            },
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)',
            drawBorder: false,
          },
          ticks: {
            precision: 0,
            font: {
              size: 11,
            },
            padding: 8,
          },
        },
        y: {
          grid: {
            display: false,
          },
          ticks: {
            font: {
              size: 11,
            },
            padding: 8,
          },
        },
      },
    };

    return <Bar data={chartData} options={options} height={300} />;
  };

  if (loading && !analyticsData) {
    return (
      <LayoutWithSidebar>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress size={60} />
        </Box>
      </LayoutWithSidebar>
    );
  }

  return (
    <LayoutWithSidebar>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: '1600px', margin: '0 auto' }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Case Manager Analytics
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </Typography>
          </Box>
          <Box display="flex" gap={2} flexWrap="wrap">
            <ButtonGroup variant="outlined" size={isMobile ? 'small' : 'medium'}>
              <Button
                variant={timePeriod === 'week' ? 'contained' : 'outlined'}
                onClick={() => setTimePeriod('week')}
              >
                Week
              </Button>
              <Button
                variant={timePeriod === 'month' ? 'contained' : 'outlined'}
                onClick={() => setTimePeriod('month')}
              >
                Month
              </Button>
              <Button
                variant={timePeriod === 'year' ? 'contained' : 'outlined'}
                onClick={() => setTimePeriod('year')}
              >
                Year
              </Button>
            </ButtonGroup>
            <Tooltip title="Refresh Data">
              <IconButton onClick={fetchAnalyticsData} color="primary">
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            <strong>Error:</strong> {error}
            <br />
            <Typography variant="caption">
              Check console for details or try refreshing the page.
            </Typography>
          </Alert>
        )}
        
        {!loading && analyticsData && analyticsData.kpis.totalCases === 0 && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <strong>No Cases Found</strong>
            <br />
            You don't have any cases assigned yet. Cases will appear here once they are assigned to you as a case manager.
          </Alert>
        )}

        {analyticsData && (
          <>
            {/* KPI Cards */}
            <Grid container spacing={2} mb={3}>
              <Grid item xs={12} sm={6} md={3}>
                <KPICard
                  title="Total Cases"
                  value={analyticsData.kpis.totalCases}
                  subtitle={`${analyticsData.kpis.activeCases} active`}
                  icon={<Assignment />}
                  color="#2196f3"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <KPICard
                  title="New Cases"
                  value={analyticsData.kpis.newCasesThisPeriod}
                  subtitle={`This ${timePeriod}`}
                  icon={<TrendingUp />}
                  color="#ff9800"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <KPICard
                  title="Avg Resolution Time"
                  value={`${analyticsData.kpis.avgResolutionDays}d`}
                  subtitle="Days to close"
                  icon={<Schedule />}
                  color="#9c27b0"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <KPICard
                  title="Success Rate"
                  value={`${analyticsData.kpis.successRate}%`}
                  subtitle={`${analyticsData.kpis.completedCases} completed`}
                  icon={<CheckCircle />}
                  color="#4caf50"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <KPICard
                  title="Clinician Assignment"
                  value={`${analyticsData.kpis.clinicianAssignmentRate}%`}
                  subtitle="Cases with clinician"
                  icon={<LocalHospital />}
                  color="#00bcd4"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <KPICard
                  title="Closed This Period"
                  value={analyticsData.kpis.closedThisPeriod}
                  subtitle={`This ${timePeriod}`}
                  icon={<CheckCircle />}
                  color="#4caf50"
                />
              </Grid>
              {deadlineData && (
                <>
                  <Grid item xs={12} sm={6} md={3}>
                    <KPICard
                      title="Upcoming Deadlines"
                      value={deadlineData.counts.upcoming}
                      subtitle="Next 7 days"
                      icon={<Schedule />}
                      color="#ff9800"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <KPICard
                      title="Overdue Tasks"
                      value={deadlineData.counts.overdue}
                      subtitle="Requires attention"
                      icon={<AssignmentLate />}
                      color="#f44336"
                    />
                  </Grid>
                </>
              )}
            </Grid>

            {/* Charts Section */}
            <Grid container spacing={3} mb={3}>
              {/* Trend Chart */}
              <Grid item xs={12} lg={8}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <ShowChart sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6" fontWeight="bold">
                        Case Trends Over Time
                      </Typography>
                    </Box>
                    <Box height={300}>{renderTrendChart()}</Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Status Pie Chart */}
              <Grid item xs={12} lg={4}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <BarChart sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6" fontWeight="bold">
                        Cases by Status
                      </Typography>
                    </Box>
                    <Box height={300}>{renderStatusPieChart()}</Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Injury Type Chart */}
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <Assignment sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6" fontWeight="bold">
                        TOP Incident Type
                      </Typography>
                    </Box>
                    <Box height={300}>{renderInjuryTypeChart()}</Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Clinician Performance Table */}
            {clinicianMetrics && clinicianMetrics.length > 0 && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <LocalHospital sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6" fontWeight="bold">
                      Clinician Performance
                    </Typography>
                  </Box>
                  <TableContainer>
                    <Table size={isMobile ? 'small' : 'medium'}>
                      <TableHead>
                        <TableRow>
                          <TableCell>Clinician</TableCell>
                          <TableCell>Specialty</TableCell>
                          <TableCell align="center">Status</TableCell>
                          <TableCell align="center">Active Cases</TableCell>
                          <TableCell align="center">Completed</TableCell>
                          <TableCell align="center">Avg Duration</TableCell>
                          <TableCell align="center">Success Rate</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {clinicianMetrics.slice(0, 10).map((clinician) => (
                          <TableRow key={clinician.id} hover>
                            <TableCell>{clinician.name}</TableCell>
                            <TableCell>{clinician.specialty}</TableCell>
                            <TableCell align="center">
                              <Chip
                                label={clinician.isAvailable ? 'Available' : 'Unavailable'}
                                color={clinician.isAvailable ? 'success' : 'default'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Typography fontWeight="bold" color="primary">
                                {clinician.activeCases}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">{clinician.completedCases}</TableCell>
                            <TableCell align="center">{clinician.avgDuration} days</TableCell>
                            <TableCell align="center">
                              <Chip
                                label={`${clinician.successRate}%`}
                                color={clinician.successRate >= 80 ? 'success' : 'warning'}
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            )}

            {/* Workers Requiring Attention */}
            {workerData?.workersRequiringAttention && workerData.workersRequiringAttention.length > 0 && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Warning sx={{ mr: 1, color: 'warning.main' }} />
                    <Typography variant="h6" fontWeight="bold">
                      Workers Requiring Attention
                    </Typography>
                    <Chip
                      label={workerData.workersRequiringAttention.length}
                      color="warning"
                      size="small"
                      sx={{ ml: 2 }}
                    />
                  </Box>
                  <TableContainer>
                    <Table size={isMobile ? 'small' : 'medium'}>
                      <TableHead>
                        <TableRow>
                          <TableCell>Worker</TableCell>
                          <TableCell>Case Number</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Clinician</TableCell>
                          <TableCell align="center">Days Since Update</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {workerData.workersRequiringAttention.map((worker: WorkerRequiringAttention, index: number) => (
                          <TableRow key={index} hover>
                            <TableCell>{worker.workerName}</TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight="bold">
                                {worker.caseNumber}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={worker.caseStatus}
                                size="small"
                                sx={{
                                  bgcolor: `${getStatusColor(worker.caseStatus)}20`,
                                  color: getStatusColor(worker.caseStatus),
                                }}
                              />
                            </TableCell>
                            <TableCell>{worker.clinicianName}</TableCell>
                            <TableCell align="center">
                              <Chip
                                label={`${worker.daysSinceUpdate} days`}
                                color={worker.daysSinceUpdate > 14 ? 'error' : 'warning'}
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            )}

            {/* Upcoming Deadlines */}
            {deadlineData?.upcomingDeadlines && deadlineData.upcomingDeadlines.length > 0 && (
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Schedule sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6" fontWeight="bold">
                      Upcoming Deadlines (Next 7 Days)
                    </Typography>
                  </Box>
                  <TableContainer>
                    <Table size={isMobile ? 'small' : 'medium'}>
                      <TableHead>
                        <TableRow>
                          <TableCell>Task</TableCell>
                          <TableCell>Worker</TableCell>
                          <TableCell>Due Date</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align="center">Days Until Due</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {deadlineData.upcomingDeadlines.map((deadline: DeadlineItem) => (
                          <TableRow key={deadline.id} hover>
                            <TableCell>{deadline.title}</TableCell>
                            <TableCell>{deadline.workerName}</TableCell>
                            <TableCell>
                              {new Date(deadline.dueDate).toLocaleDateString()} {deadline.dueTime}
                            </TableCell>
                            <TableCell>
                              <Chip label={deadline.status} size="small" />
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={`${deadline.daysUntilDue} days`}
                                color={deadline.daysUntilDue <= 2 ? 'error' : 'warning'}
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </Box>
    </LayoutWithSidebar>
  );
};

export default CaseManagerAnalytics;

