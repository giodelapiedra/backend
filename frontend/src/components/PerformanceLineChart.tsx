import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
  useMediaQuery,
  Tooltip as MuiTooltip,
  IconButton,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Area,
  AreaChart,
  ReferenceLine
} from 'recharts';
import { TrendingUp, Info } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { authClient } from '../lib/supabase';

interface PerformanceDataPoint {
  date: string;
  managementScore: number;
  efficiencyRating: number;
  workerSatisfaction: number;
  complianceRate: number;
  healthScore: number;
}

interface PerformanceLineChartProps {
  teamLeaderPerformance: any[];
  selectedDate: string;
  isMobile?: boolean;
}

const PerformanceLineChart: React.FC<PerformanceLineChartProps> = ({
  teamLeaderPerformance,
  selectedDate,
  isMobile = false
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [selectedMetric, setSelectedMetric] = useState<'managementScore' | 'efficiencyRating' | 'workerSatisfaction' | 'complianceRate' | 'healthScore'>('managementScore');
  // Fetch real performance trends data from API
  const { data: performanceTrendsData, isLoading, error } = useQuery({
    queryKey: ['teamLeaderPerformanceTrends', selectedDate, timeRange],
    queryFn: async () => {
      // Get Supabase session token
      const { data: { session } } = await authClient.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No authentication token available');
      }

      const apiBaseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';
      const response = await fetch(`${apiBaseUrl}/api/multi-team-analytics/team-leader-performance-trends?period=${timeRange}&date=${selectedDate}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`Failed to fetch performance trends: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('API Response:', result);
      console.log('Performance Trends Data:', result.data?.performanceTrends);
      
      if (!result.data?.performanceTrends) {
        console.warn('No performance trends data in response');
        return [];
      }
      
      return result.data.performanceTrends;
    },
    enabled: !!selectedDate && !!timeRange,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  });

  const chartData = Array.isArray(performanceTrendsData) ? performanceTrendsData : [];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (timeRange === 'daily') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (timeRange === 'weekly') {
      return `Week ${Math.ceil(date.getDate() / 7)}`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short' });
    }
  };

  const getMetricLabel = (metric: string) => {
    const labels = {
      managementScore: 'Management Score',
      efficiencyRating: 'Efficiency Rating',
      workerSatisfaction: 'Worker Satisfaction',
      complianceRate: 'Compliance Rate',
      healthScore: 'Health Score'
    };
    return labels[metric as keyof typeof labels] || metric;
  };

  const getMetricColor = (metric: string) => {
    const colors = {
      managementScore: '#4f46e5',
      efficiencyRating: '#10b981',
      workerSatisfaction: '#f59e0b',
      complianceRate: '#ef4444',
      healthScore: '#8b5cf6'
    };
    return colors[metric as keyof typeof colors] || '#4f46e5';
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #e5e7eb',
            borderRadius: 2,
            padding: 2,
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(10px)'
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            {formatDate(label)}
          </Typography>
          {payload.map((entry: any, index: number) => (
            <Typography
              key={index}
              variant="body2"
              sx={{ color: entry.color, fontWeight: 500 }}
            >
              {getMetricLabel(entry.dataKey)}: {entry.value.toFixed(1)}%
            </Typography>
          ))}
        </Box>
      );
    }
    return null;
  };

  // Show loading state
  if (isLoading) {
    return (
      <Card 
        sx={{ 
          height: '100%',
          background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
          border: '1px solid #e5e7eb',
          borderRadius: 3,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 400
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={40} sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Loading performance trends...
          </Typography>
        </Box>
      </Card>
    );
  }

  // Show error state
  if (error) {
    return (
      <Card 
        sx={{ 
          height: '100%',
          background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
          border: '1px solid #e5e7eb',
          borderRadius: 3,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to load performance trends data. Please try again.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Error: {error instanceof Error ? error.message : 'Unknown error'}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      sx={{ 
        height: '100%',
        background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
        border: '1px solid #e5e7eb',
        borderRadius: 3,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        '&:hover': {
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
          transform: 'translateY(-2px)',
          transition: 'all 0.3s ease'
        }
      }}
    >
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUp sx={{ color: '#4f46e5', fontSize: 24 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1f2937' }}>
              Performance Trends
            </Typography>
            <MuiTooltip title="Performance metrics over time with smooth trend analysis">
              <IconButton size="small" sx={{ color: '#6b7280' }}>
                <Info fontSize="small" />
              </IconButton>
            </MuiTooltip>
          </Box>
        </Box>

        {/* Controls */}
        <Box sx={{ 
          display: 'flex', 
          gap: 2, 
          mb: 3, 
          flexWrap: isSmallScreen ? 'wrap' : 'nowrap',
          '& .MuiFormControl-root': {
            minWidth: isSmallScreen ? '100%' : 'auto',
            flex: isSmallScreen ? '1 1 100%' : '0 0 auto'
          }
        }}>
          <FormControl size="small" sx={{ minWidth: isSmallScreen ? '100%' : 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => setTimeRange(e.target.value as any)}
            >
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: isSmallScreen ? '100%' : 150 }}>
            <InputLabel>Metric</InputLabel>
            <Select
              value={selectedMetric}
              label="Metric"
              onChange={(e) => setSelectedMetric(e.target.value as any)}
            >
              <MenuItem value="managementScore">Management Score</MenuItem>
              <MenuItem value="efficiencyRating">Efficiency Rating</MenuItem>
              <MenuItem value="workerSatisfaction">Worker Satisfaction</MenuItem>
              <MenuItem value="complianceRate">Compliance Rate</MenuItem>
              <MenuItem value="healthScore">Health Score</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Chart */}
        <Box sx={{ height: isMobile ? 300 : 400, width: '100%' }}>
          {chartData.length === 0 ? (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '100%',
              flexDirection: 'column',
              gap: 2
            }}>
              <Typography variant="h6" color="text.secondary">
                No Performance Data Available
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Performance trends will appear here once data is available for the selected period.
              </Typography>
            </Box>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 20,
              }}
            >
              <defs>
                <linearGradient id={`gradient-${selectedMetric}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={getMetricColor(selectedMetric)} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={getMetricColor(selectedMetric)} stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="#e5e7eb" 
                opacity={0.6}
                horizontal={true}
                vertical={false}
              />
              
              <XAxis 
                dataKey="date"
                tickFormatter={formatDate}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                interval={isMobile ? 1 : 0}
              />
              
              <YAxis 
                domain={[0, 100]}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickFormatter={(value) => `${value}%`}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              <Area
                type="monotone"
                dataKey={selectedMetric}
                stroke={getMetricColor(selectedMetric)}
                strokeWidth={3}
                fill={`url(#gradient-${selectedMetric})`}
                fillOpacity={0.6}
                dot={{ fill: getMetricColor(selectedMetric), strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: getMetricColor(selectedMetric), strokeWidth: 2, fill: '#ffffff' }}
              />
              
              {/* Average reference line */}
              <ReferenceLine 
                y={chartData.length > 0 ? chartData.reduce((sum: number, d: PerformanceDataPoint) => sum + d[selectedMetric], 0) / chartData.length : 0}
                stroke="#6b7280"
                strokeDasharray="2 2"
                strokeOpacity={0.5}
              />
            </AreaChart>
          </ResponsiveContainer>
          )}
        </Box>

        {/* Summary Stats */}
        <Box sx={{ 
          mt: 2, 
          display: 'flex', 
          justifyContent: 'space-between', 
          flexWrap: 'wrap', 
          gap: isSmallScreen ? 1 : 2,
          '& > div': {
            flex: isSmallScreen ? '1 1 calc(33.333% - 8px)' : '0 0 auto',
            minWidth: isSmallScreen ? 'calc(33.333% - 8px)' : 'auto'
          }
        }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant={isSmallScreen ? "body1" : "h6"} sx={{ fontWeight: 700, color: getMetricColor(selectedMetric) }}>
              {chartData.length > 0 ? chartData[chartData.length - 1][selectedMetric].toFixed(1) : '0.0'}%
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: isSmallScreen ? '12px' : '14px' }}>
              Current
            </Typography>
          </Box>
          
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant={isSmallScreen ? "body1" : "h6"} sx={{ fontWeight: 700, color: '#10b981' }}>
              {chartData.length > 0 ? Math.max(...chartData.map((d: PerformanceDataPoint) => d[selectedMetric])).toFixed(1) : '0.0'}%
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: isSmallScreen ? '12px' : '14px' }}>
              Peak
            </Typography>
          </Box>
          
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant={isSmallScreen ? "body1" : "h6"} sx={{ fontWeight: 700, color: '#6b7280' }}>
              {chartData.length > 0 ? (chartData.reduce((sum: number, d: PerformanceDataPoint) => sum + d[selectedMetric], 0) / chartData.length).toFixed(1) : '0.0'}%
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: isSmallScreen ? '12px' : '14px' }}>
              Average
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PerformanceLineChart;

