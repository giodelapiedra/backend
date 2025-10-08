import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, Box, Typography, Button, ButtonGroup, useTheme, useMediaQuery } from '@mui/material';
import { 
  AreaChart, 
  Area, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { ShowChart, Timeline } from '@mui/icons-material';

interface TrendChartProps {
  title: string;
  data: Array<{
    date: string;
    fitForWork: number;
    minorConcernsFitForWork: number;
    notFitForWork: number;
    total?: number;
  }>;
  isLoading?: boolean;
  height?: number;
  externalTimePeriod?: TimePeriod;
  onTimePeriodChange?: (period: TimePeriod) => void;
}

type ChartType = 'area' | 'line';
type TimePeriod = 'week' | 'month' | 'year';

const TrendChart: React.FC<TrendChartProps> = ({
  title,
  data,
  isLoading = false,
  height = 300,
  externalTimePeriod,
  onTimePeriodChange
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [chartType, setChartType] = useState<ChartType>('area');
  const [chartKey, setChartKey] = useState(0);
  
  // Use external time period if provided, otherwise use internal state
  const [internalTimePeriod, setInternalTimePeriod] = useState<TimePeriod>('week');
  const timePeriod = externalTimePeriod || internalTimePeriod;
  
  // Force chart re-render when switching between mobile and desktop
  useEffect(() => {
    setChartKey(prev => prev + 1);
  }, [isMobile]);
  
  const setTimePeriod = (period: TimePeriod) => {
    if (onTimePeriodChange) {
      onTimePeriodChange(period);
    } else {
      setInternalTimePeriod(period);
    }
  };

  // Process data based on time period (optimized)
  // Backend already filters data by date range, so we just format it here
  const processedData = useMemo(() => {
    if (!data || !data.length) {
      console.log('TrendChart - No data to process');
      return [];
    }

    console.log('TrendChart - Processing data:', {
      timePeriod,
      dataLength: data.length,
      firstDate: data[0]?.date,
      lastDate: data[data.length - 1]?.date,
      sampleData: data.slice(0, 3)
    });

    // Format dates for display based on time period
    return data.map(item => {
      try {
        const date = new Date(item.date);
        if (isNaN(date.getTime())) {
          console.error('Invalid date:', item.date);
          return item;
        }

        let formattedDate = '';
        
        switch (timePeriod) {
          case 'week':
            // Show as "Mon 15" format
            formattedDate = date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
            break;
          case 'month':
            // Show as "Oct 15" format
            formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            break;
          case 'year':
            // Show as "Jan '24" format
            formattedDate = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            break;
          default:
            formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
        
        return {
          ...item,
          date: formattedDate,
          fitForWork: item.fitForWork || 0,
          minorConcernsFitForWork: item.minorConcernsFitForWork || 0,
          notFitForWork: item.notFitForWork || 0
        };
      } catch (error) {
        console.error('Error processing data item:', error, item);
        return item;
      }
    });
  }, [data, timePeriod]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box
          sx={{
            backgroundColor: 'white',
            padding: 2,
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
            border: '1px solid rgba(0, 0, 0, 0.08)'
          }}
        >
          <Typography
            sx={{
              fontWeight: 600,
              fontSize: '0.875rem',
              color: '#1e293b',
              mb: 1,
              fontFamily: 'Inter, system-ui, sans-serif'
            }}
          >
            {label}
          </Typography>
          {payload.map((entry: any, index: number) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: entry.color
                }}
              />
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  color: '#64748b',
                  fontFamily: 'Inter, system-ui, sans-serif'
                }}
              >
                {entry.name}: {entry.value}
              </Typography>
            </Box>
          ))}
        </Box>
      );
    }
    return null;
  };

  const chartColors = {
    fitForWork: '#10b981',
    minorConcernsFitForWork: '#f59e0b',
    notFitForWork: '#ef4444'
  };

  const renderChart = () => {
    const mobileHeight = 300; // Increased height for mobile
    const chartHeight = isMobile ? mobileHeight : height;
    
    console.log('TrendChart - renderChart called:', {
      isMobile,
      chartHeight,
      dataLength: processedData?.length || 0,
      isLoading,
      data: processedData
    });
    
    if (isLoading) {
      return (
        <Box
          sx={{
            height: chartHeight,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fafafa',
            borderRadius: 2,
            animation: 'pulse 2s infinite',
            gap: 2
          }}
        >
          <Box sx={{ 
            width: 60, 
            height: 60, 
            borderRadius: '50%', 
            backgroundColor: '#f5f5f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'spin 1s linear infinite'
          }}>
            <ShowChart sx={{ fontSize: 30, color: '#6366f1' }} />
          </Box>
          <Typography sx={{ 
            color: '#737373', 
            fontSize: { xs: '0.875rem', md: '1rem' },
            fontWeight: 500
          }}>
            Loading chart data...
          </Typography>
        </Box>
      );
    }

    if (!processedData || processedData.length === 0) {
      console.log('TrendChart - No data available');
      return (
        <Box
          sx={{
            height: chartHeight,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fafafa',
            borderRadius: 2,
            gap: 2
          }}
        >
          <Box sx={{ 
            width: 80, 
            height: 80, 
            borderRadius: '50%', 
            backgroundColor: '#f5f5f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShowChart sx={{ fontSize: 40, color: '#a3a3a3' }} />
          </Box>
          <Typography sx={{ color: '#737373', fontSize: { xs: '0.875rem', md: '1rem' }, fontWeight: 500 }}>
            No data available for this period
          </Typography>
        </Box>
      );
    }

    // Calculate dynamic width for mobile to ensure all data is visible
    const dataLength = processedData.length;
    const minWidthPerPoint = 80; // Increased width per data point for better visibility
    const calculatedWidth = isMobile && dataLength > 4 ? dataLength * minWidthPerPoint : '100%';
    
    // Adjust margins for mobile to ensure chart is visible
    const chartMargin = isMobile 
      ? { top: 10, right: 20, left: 10, bottom: 50 } // Better margins for mobile
      : { top: 10, right: 30, left: 0, bottom: 0 };

    const chartContent = chartType === 'area' ? (
        <ResponsiveContainer width={calculatedWidth as any} height={chartHeight} key={`area-${chartKey}`}>
          <AreaChart 
            data={processedData} 
            margin={chartMargin}
          >
            <defs>
              <linearGradient id="fitGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="minorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="notFitGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ 
                fontSize: isMobile ? 10 : 12, 
                fill: '#737373',
                width: isMobile ? 40 : 'auto',
                dy: isMobile ? 15 : 0
              }}
              angle={isMobile ? -45 : 0}
              textAnchor={isMobile ? 'end' : 'middle'}
              height={isMobile ? 100 : 30}
              interval={0}
              minTickGap={5}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: isMobile ? 10 : 12, fill: '#737373' }}
              width={isMobile ? 40 : 60}
              tickCount={5}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="fitForWork"
              name="Fit for Work"
              stackId="1"
              stroke={chartColors.fitForWork}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#fitGradient)"
            />
            <Area
              type="monotone"
              dataKey="minorConcernsFitForWork"
              name="Minor Concerns"
              stackId="1"
              stroke={chartColors.minorConcernsFitForWork}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#minorGradient)"
            />
            <Area
              type="monotone"
              dataKey="notFitForWork"
              name="Not Fit"
              stackId="1"
              stroke={chartColors.notFitForWork}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#notFitGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
    ) : (
        <ResponsiveContainer width={calculatedWidth as any} height={chartHeight} key={`line-${chartKey}`}>
          <LineChart data={processedData} margin={chartMargin}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ 
                fontSize: isMobile ? 10 : 12, 
                fill: '#737373',
                width: isMobile ? 40 : 'auto',
                dy: isMobile ? 15 : 0
              }}
              angle={isMobile ? -45 : 0}
              textAnchor={isMobile ? 'end' : 'middle'}
              height={isMobile ? 100 : 30}
              interval={0}
              minTickGap={5}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: isMobile ? 10 : 12, fill: '#737373' }}
              width={isMobile ? 40 : 60}
              tickCount={5}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="fitForWork"
              name="Fit for Work"
              stroke={chartColors.fitForWork}
              strokeWidth={isMobile ? 2 : 3}
              dot={{ fill: chartColors.fitForWork, strokeWidth: 2, r: isMobile ? 3 : 4 }}
              activeDot={{ r: isMobile ? 5 : 6, stroke: chartColors.fitForWork, strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="minorConcernsFitForWork"
              name="Minor Concerns"
              stroke={chartColors.minorConcernsFitForWork}
              strokeWidth={isMobile ? 2 : 3}
              dot={{ fill: chartColors.minorConcernsFitForWork, strokeWidth: 2, r: isMobile ? 3 : 4 }}
              activeDot={{ r: isMobile ? 5 : 6, stroke: chartColors.minorConcernsFitForWork, strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="notFitForWork"
              name="Not Fit"
              stroke={chartColors.notFitForWork}
              strokeWidth={isMobile ? 2 : 3}
              dot={{ fill: chartColors.notFitForWork, strokeWidth: 2, r: isMobile ? 3 : 4 }}
              activeDot={{ r: isMobile ? 5 : 6, stroke: chartColors.notFitForWork, strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
    );

    // Wrap in scrollable container for mobile when there are many data points
    if (isMobile && dataLength > 4) {
      return (
        <Box sx={{ 
          overflowX: 'auto',
          overflowY: 'hidden',
          width: '100%',
          height: chartHeight, // Ensure the container has a height
          WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
          '&::-webkit-scrollbar': {
            height: '6px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: '#f1f1f1',
            borderRadius: '10px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#888',
            borderRadius: '10px',
            '&:hover': {
              backgroundColor: '#555',
            },
          },
        }}>
          {chartContent}
        </Box>
      );
    }

    return chartContent;
  };

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <Card
        sx={{
          borderRadius: { xs: '16px', md: 3 },
          boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.02)',
          border: '1px solid #e5e5e5',
          height: '100%',
          backgroundColor: '#ffffff',
          overflow: 'visible', // Important for chart visibility
          '& .recharts-wrapper': {
            // Fix for recharts container
            overflow: 'visible !important'
          }
        }}
      >
        <CardContent sx={{ 
          p: { xs: 2, md: 3 },
          overflow: 'visible' // Important for chart visibility
        }}>
          {/* Header with title */}
          <Box sx={{ mb: { xs: 2, md: 3 } }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                fontSize: { xs: '1rem', md: '1.25rem' },
                color: '#171717',
                mb: 2
              }}
            >
              {title}
            </Typography>
            
            {/* Controls - Stacked on mobile */}
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', md: 'row' },
              gap: { xs: 1.5, md: 2 },
              alignItems: { xs: 'stretch', md: 'center' }
            }}>
              {/* Chart type toggle */}
              <ButtonGroup size="small" variant="outlined" fullWidth sx={{ display: { xs: 'flex', md: 'inline-flex' } }}>
                <Button
                  onClick={() => setChartType('area')}
                  sx={{
                    backgroundColor: chartType === 'area' ? '#6366f1' : 'transparent',
                    color: chartType === 'area' ? 'white' : '#737373',
                    borderRadius: '10px',
                    px: { xs: 1.5, md: 2 },
                    py: 0.75,
                    fontSize: { xs: '0.75rem', md: '0.8125rem' },
                    fontWeight: 600,
                    borderColor: '#e5e5e5',
                    flex: { xs: 1, md: 'initial' },
                    '&:hover': {
                      backgroundColor: chartType === 'area' ? '#4f46e5' : '#f5f5f5',
                      borderColor: chartType === 'area' ? '#4f46e5' : '#d4d4d4'
                    }
                  }}
                >
                  <Timeline sx={{ fontSize: { xs: 14, md: 16 }, mr: 0.5 }} />
                  Area
                </Button>
                <Button
                  onClick={() => setChartType('line')}
                  sx={{
                    backgroundColor: chartType === 'line' ? '#6366f1' : 'transparent',
                    color: chartType === 'line' ? 'white' : '#737373',
                    borderRadius: '10px',
                    px: { xs: 1.5, md: 2 },
                    py: 0.75,
                    fontSize: { xs: '0.75rem', md: '0.8125rem' },
                    fontWeight: 600,
                    borderColor: '#e5e5e5',
                    flex: { xs: 1, md: 'initial' },
                    '&:hover': {
                      backgroundColor: chartType === 'line' ? '#4f46e5' : '#f5f5f5',
                      borderColor: chartType === 'line' ? '#4f46e5' : '#d4d4d4'
                    }
                  }}
                >
                  <ShowChart sx={{ fontSize: { xs: 14, md: 16 }, mr: 0.5 }} />
                  Line
                </Button>
              </ButtonGroup>

              {/* Time period toggle */}
              <ButtonGroup size="small" variant="outlined" fullWidth sx={{ display: { xs: 'flex', md: 'inline-flex' } }}>
                {(['week', 'month', 'year'] as TimePeriod[]).map((period) => (
                  <Button
                    key={period}
                    onClick={() => setTimePeriod(period)}
                    sx={{
                      backgroundColor: timePeriod === period ? '#6366f1' : 'transparent',
                      color: timePeriod === period ? 'white' : '#737373',
                      borderRadius: '10px',
                      px: { xs: 1.5, md: 2 },
                      py: 0.75,
                      fontSize: { xs: '0.75rem', md: '0.8125rem' },
                      fontWeight: 600,
                      textTransform: 'capitalize',
                      borderColor: '#e5e5e5',
                      flex: { xs: 1, md: 'initial' },
                      '&:hover': {
                        backgroundColor: timePeriod === period ? '#4f46e5' : '#f5f5f5',
                        borderColor: timePeriod === period ? '#4f46e5' : '#d4d4d4'
                      }
                    }}
                  >
                    {period}
                  </Button>
                ))}
              </ButtonGroup>
            </Box>
          </Box>

          {/* Chart legend */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 1, sm: 3 }, 
            mb: { xs: 2, md: 2 }, 
            justifyContent: { xs: 'flex-start', sm: 'center' }
          }}>
            {Object.entries({
              fitForWork: 'Fit for Work',
              minorConcernsFitForWork: 'Minor Concerns',
              notFitForWork: 'Not Fit'
            }).map(([key, label]) => (
              <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: chartColors[key as keyof typeof chartColors]
                  }}
                />
                <Typography
                  sx={{
                    fontSize: { xs: '0.75rem', md: '0.8125rem' },
                    color: '#737373',
                    fontWeight: 500,
                  }}
                >
                  {label}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Chart */}
          <Box sx={{ 
            mt: { xs: 2, md: 2 }, 
            height: { xs: 300, md: height },
            width: '100%',
            overflow: 'visible'
          }}>
            {renderChart()}
          </Box>
        </CardContent>
      </Card>
    </>
  );
};

export default TrendChart;
