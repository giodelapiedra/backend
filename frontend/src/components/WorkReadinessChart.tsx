import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Line } from 'react-chartjs-2';
import { Box, Typography, CircularProgress, Select, MenuItem, FormControl, Alert } from '@mui/material';
import { TrendingUp, ErrorOutline } from '@mui/icons-material';
import { dataClient } from '../lib/supabase';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ChartData {
  date: string;
  notFit: number;
  minorConcerns: number;
  fit: number;
}

interface WorkReadinessChartProps {
  teamLeaderId: string;
}

// Utility: Format date to YYYY-MM-DD (local timezone)
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Utility: Validate readiness level
const normalizeReadinessLevel = (level: string | null | undefined): 'not_fit' | 'minor' | 'fit' | null => {
  if (!level) return null;
  const normalized = level.toLowerCase().trim();
  
  if (normalized === 'not_fit' || normalized === 'not_fit_for_work') return 'not_fit';
  if (normalized === 'minor' || normalized === 'minor_concerns' || normalized === 'minor_concerns_fit_for_work') return 'minor';
  if (normalized === 'fit' || normalized === 'fit_for_work') return 'fit';
  
  return null;
};

const WorkReadinessChart: React.FC<WorkReadinessChartProps> = ({ teamLeaderId }) => {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(7);
  const [totalNotFit, setTotalNotFit] = useState(0);
  const [totalMinor, setTotalMinor] = useState(0);
  const [totalFit, setTotalFit] = useState(0);

  // Memoized totals calculation
  const totals = useMemo(() => ({
    total: totalNotFit + totalMinor + totalFit,
    notFit: totalNotFit,
    minor: totalMinor,
    fit: totalFit
  }), [totalNotFit, totalMinor, totalFit]);

  const fetchWorkReadinessData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate input
      if (!teamLeaderId || !teamLeaderId.trim()) {
        throw new Error('Invalid team leader ID');
      }

      // Calculate date range - INCLUDING TODAY (local timezone)
      const today = new Date();
      const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
      const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
      startDate.setDate(startDate.getDate() - (days - 1));

      // Query database with RLS protection (Supabase handles SQL injection)
      const { data: workReadiness, error } = await dataClient
        .from('work_readiness')
        .select('submitted_at, readiness_level')
        .eq('team_leader_id', teamLeaderId)
        .gte('submitted_at', startDate.toISOString())
        .lte('submitted_at', endDate.toISOString())
        .order('submitted_at', { ascending: true });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      // Initialize all dates with zero counts (local timezone)
      const dateMap = new Map<string, ChartData>();
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateKey = formatLocalDate(date);
        
        dateMap.set(dateKey, {
          date: dateKey,
          notFit: 0,
          minorConcerns: 0,
          fit: 0
        });
      }

      // Process records efficiently
      let notFitTotal = 0;
      let minorTotal = 0;
      let fitTotal = 0;

      if (workReadiness && workReadiness.length > 0) {
        workReadiness.forEach((record) => {
          // Extract date from timestamp
          const dateKey = record.submitted_at.split('T')[0];
          
          // Skip if date not in range
          if (!dateMap.has(dateKey)) return;

          const dayData = dateMap.get(dateKey)!;
          const level = normalizeReadinessLevel(record.readiness_level);

          // Update counts based on level
          switch (level) {
            case 'not_fit':
              dayData.notFit++;
              notFitTotal++;
              break;
            case 'minor':
              dayData.minorConcerns++;
              minorTotal++;
              break;
            case 'fit':
              dayData.fit++;
              fitTotal++;
              break;
            default:
              // Invalid level - log in development only
              if (process.env.NODE_ENV === 'development') {
                console.warn('Unknown readiness level:', record.readiness_level);
              }
          }
        });
      }

      // Convert to sorted array
      const chartArray = Array.from(dateMap.values()).sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // Update state
      setChartData(chartArray);
      setTotalNotFit(notFitTotal);
      setTotalMinor(minorTotal);
      setTotalFit(fitTotal);
      setLoading(false);

      // Development logging only
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Chart data loaded:', { 
          records: workReadiness?.length, 
          notFit: notFitTotal, 
          minor: minorTotal, 
          fit: fitTotal 
        });
      }

    } catch (error: any) {
      console.error('Error fetching work readiness data:', error);
      setError(error.message || 'Failed to load chart data');
      setLoading(false);
      
      // Reset to empty state
      setChartData([]);
      setTotalNotFit(0);
      setTotalMinor(0);
      setTotalFit(0);
    }
  }, [teamLeaderId, days]);

  useEffect(() => {
    // Only fetch if we have a valid team leader ID
    if (teamLeaderId && teamLeaderId.trim()) {
      fetchWorkReadinessData();
    }
  }, [teamLeaderId, days, fetchWorkReadinessData]);

  // Memoized chart configuration for performance
  const chartConfig = useMemo(() => ({
    labels: chartData.map(item => {
      const date = new Date(item.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
    datasets: [
      {
        label: 'Not Fit for Work',
        data: chartData.map(item => item.notFit),
        borderColor: '#9333ea',
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: '#9333ea'
      },
      {
        label: 'Minor Concerns',
        data: chartData.map(item => item.minorConcerns),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: '#3b82f6'
      },
      {
        label: 'Fit for Work',
        data: chartData.map(item => item.fit),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: '#10b981'
      }
    ]
  }), [chartData]);

  // Memoized chart options
  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => {
            return `${context.dataset.label}: ${context.parsed.y}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          color: '#6b7280',
          font: { size: 12 }
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          color: '#6b7280',
          font: { size: 12 },
          stepSize: 1,
          callback: (value: any) => {
            return Number.isInteger(value) ? value : '';
          }
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index' as const
    }
  }), []);

  return (
    <Box sx={{
      backgroundColor: 'white',
      borderRadius: 2,
      padding: 3,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      marginBottom: 3,
      border: '1px solid #e5e7eb'
    }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 3,
        flexWrap: 'wrap',
        gap: 2
      }}>
        <Box>
          <Typography variant="h6" sx={{ 
            fontSize: '1.25rem', 
            fontWeight: '600', 
            color: '#1f2937',
            mb: 0.5
          }}>
            Work Readiness Activity
          </Typography>
          <Typography variant="caption" sx={{ color: '#6b7280' }}>
            {totals.total} total assessment{totals.total !== 1 ? 's' : ''}
          </Typography>
        </Box>

        {/* Date Range Selector */}
        <FormControl size="small">
          <Select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            sx={{
              fontSize: '0.875rem',
              minWidth: 120
            }}
          >
            <MenuItem value={7}>Last 7 Days</MenuItem>
            <MenuItem value={14}>Last 14 Days</MenuItem>
            <MenuItem value={30}>Last 30 Days</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Legend */}
      <Box sx={{ 
        display: 'flex', 
        gap: 3,
        marginBottom: 2,
        flexWrap: 'wrap'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            backgroundColor: '#9333ea'
          }} />
          <Typography variant="caption" sx={{ color: '#6b7280' }}>
            Not Fit ({totals.notFit})
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            backgroundColor: '#3b82f6'
          }} />
          <Typography variant="caption" sx={{ color: '#6b7280' }}>
            Minor Concerns ({totals.minor})
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            backgroundColor: '#10b981'
          }} />
          <Typography variant="caption" sx={{ color: '#6b7280' }}>
            Fit ({totals.fit})
          </Typography>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          icon={<ErrorOutline />}
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}

      {/* Chart Area */}
      <Box sx={{ height: 350, position: 'relative' }}>
        {loading ? (
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%'
          }}>
            <CircularProgress size={40} sx={{ mb: 2 }} />
            <Typography variant="body2" sx={{ color: '#6b7280' }}>
              Loading chart data...
            </Typography>
          </Box>
        ) : error ? (
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#ef4444'
          }}>
            <ErrorOutline sx={{ fontSize: 48, mb: 2 }} />
            <Typography variant="h6" sx={{ fontWeight: 500, mb: 1 }}>
              Failed to Load Data
            </Typography>
            <Typography variant="body2" sx={{ textAlign: 'center', color: '#6b7280' }}>
              Please refresh the page or contact support
            </Typography>
          </Box>
        ) : chartData.length > 0 ? (
          <Line data={chartConfig} options={chartOptions} />
        ) : (
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#9ca3af'
          }}>
            <TrendingUp sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" sx={{ fontWeight: 500, mb: 1 }}>
              No Data Available
            </Typography>
            <Typography variant="body2">
              Work readiness assessments will appear here
            </Typography>
          </Box>
        )}
      </Box>

      {/* Statistics */}
      {!loading && !error && totals.total > 0 && (
        <Box sx={{
          display: 'flex',
          gap: 2,
          marginTop: 3,
          padding: 2,
          backgroundColor: '#f9fafb',
          borderRadius: 1,
          flexWrap: 'wrap'
        }}>
          <Box sx={{ flex: 1, minWidth: 120 }}>
            <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.5 }}>
              Total Not Fit
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#9333ea' }}>
              {totals.notFit}
            </Typography>
          </Box>
          <Box sx={{ flex: 1, minWidth: 120 }}>
            <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.5 }}>
              Total Minor Concerns
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#3b82f6' }}>
              {totals.minor}
            </Typography>
          </Box>
          <Box sx={{ flex: 1, minWidth: 120 }}>
            <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 0.5 }}>
              Total Fit
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#10b981' }}>
              {totals.fit}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default WorkReadinessChart;

