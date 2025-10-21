import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Stack,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  Divider,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
} from '@mui/material';
import {
  TrendingUp,
  OpenInFull,
  Close,
  CalendarToday,
  FilterList,
  Restore,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  LabelList,
} from 'recharts';
import { format, subDays, eachMonthOfInterval, eachDayOfInterval, differenceInDays } from 'date-fns';

interface Case {
  _id?: string;
  created_at: string;
  status?: string;
  caseNumber?: string;
  worker?: {
    firstName?: string;
    lastName?: string;
  };
}

interface ChartData {
  period: string;
  cases: number;
  fullDate?: string;
  periodNumber?: number;
}

interface MonthlyCaseTrendChartProps {
  cases: Case[];
  dateRange: string;
}

// ---------- Utils ----------
const getStatusColor = (status?: string) => {
  const colors: Record<string, string> = {
    triaged: '#3B82F6',
    assessed: '#10B981',
    in_rehab: '#F59E0B',
    completed: '#6B7280',
    cancelled: '#EF4444',
  };
  return colors[(status || '').toLowerCase()] || '#6B7280';
};

const getStatusLabel = (status?: string) =>
  status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : 'Unknown';

// Date helpers
const toYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const safeDateFromInput = (value?: string | null) => {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
};

// ---------- Custom Tooltip ----------
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <Box
        sx={{
          bgcolor: 'white',
          p: 1.5,
          borderRadius: 1.5,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          border: '1px solid #e5e7eb',
        }}
      >
        <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
          {data.fullDate || data.period}
        </Typography>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#3B82F6' }} />
          <Typography variant="body2" fontWeight={600} color="#1a1a1a">
            {data.cases} {data.cases === 1 ? 'case' : 'cases'}
          </Typography>
        </Stack>
      </Box>
    );
  }
  return null;
};

const MonthlyCaseTrendChart: React.FC<MonthlyCaseTrendChartProps> = ({ cases, dateRange }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const now = new Date();

  // Custom date range state - defaults based on parent's dateRange
  const [range, setRange] = useState<{ start: string; end: string }>(() => {
    const defaultDays = dateRange === '7days' ? 7 : 
                       dateRange === '30days' ? 30 : 
                       dateRange === '3months' ? 90 : 180;
    
    return {
      start: toYMD(subDays(now, defaultDays)),
      end: toYMD(now),
    };
  });
  
  const startDate = safeDateFromInput(range.start) || subDays(now, 30);
  const endDate = safeDateFromInput(range.end) || now;

  // Parse cases once + create frequency map
  const { parsedCases, countsByPeriod } = useMemo(() => {
    const parsed: Array<Case & { _dt: Date; _periodKey: string }> = [];
    const freq: Record<string, number> = {};
    
    for (const c of cases || []) {
      const d = new Date(c.created_at);
      if (isNaN(d.getTime())) continue;
      
      // Determine if we should use daily or monthly grouping
      const daysDiff = differenceInDays(endDate, startDate);
      const periodKey = daysDiff <= 31 ? format(d, 'yyyy-MM-dd') : format(d, 'yyyy-MM');
      
      parsed.push({ ...(c as Case), _dt: d, _periodKey: periodKey });
      freq[periodKey] = (freq[periodKey] || 0) + 1;
    }
    return { parsedCases: parsed, countsByPeriod: freq };
  }, [cases, startDate, endDate]);

  // Generate chart data (daily or monthly based on range)
  const chartData: ChartData[] = useMemo(() => {
    const daysDiff = differenceInDays(endDate, startDate);
    
    if (daysDiff <= 31) {
      // Daily view for short ranges
      const days = eachDayOfInterval({
        start: startDate,
        end: endDate,
      });

      return days.map((day) => {
        const dayKey = format(day, 'yyyy-MM-dd');
        return {
          period: format(day, 'MMM dd'),
          cases: countsByPeriod[dayKey] || 0,
          fullDate: format(day, 'EEEE, MMMM dd, yyyy'),
          periodNumber: day.getDate(),
        };
      });
    } else {
      // Monthly view for longer ranges
      const months = eachMonthOfInterval({
        start: new Date(startDate.getFullYear(), startDate.getMonth(), 1),
        end: new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0),
      });

      return months.map((month) => {
        const monthKey = format(month, 'yyyy-MM');
        return {
          period: format(month, 'MMM'),
          cases: countsByPeriod[monthKey] || 0,
          fullDate: format(month, 'MMMM yyyy'),
          periodNumber: month.getMonth(),
        };
      });
    }
  }, [startDate, endDate, countsByPeriod]);

  // Get filtered cases for modal
  const filteredCases = useMemo(() => {
    return parsedCases
      .filter((c) => c._dt >= startDate && c._dt <= endDate)
      .sort((a, b) => b._dt.getTime() - a._dt.getTime()); // Newest first
  }, [parsedCases, startDate, endDate]);

  const totalCases = chartData.reduce((sum, d) => sum + d.cases, 0);
  const avg = chartData.length > 0 ? totalCases / chartData.length : 0;

  const resetRange = () => {
    const defaultDays = dateRange === '7days' ? 7 : 
                       dateRange === '30days' ? 30 : 
                       dateRange === '3months' ? 90 : 180;
    
    setRange({
      start: toYMD(subDays(now, defaultDays)),
      end: toYMD(now),
    });
  };

  // Reusable Controls
  const Controls = ({ compact = false }: { compact?: boolean }) => (
    <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap">
      {!compact && <FilterList sx={{ fontSize: 18, color: 'text.secondary' }} />}
      <TextField
        size="small"
        type="date"
        label={compact ? 'Start' : 'Start date'}
        InputLabelProps={{ shrink: true }}
        value={range.start}
        onChange={(e) => setRange((r) => ({ ...r, start: e.target.value }))}
        sx={{ minWidth: compact ? 140 : 160 }}
      />
      <TextField
        size="small"
        type="date"
        label={compact ? 'End' : 'End date'}
        InputLabelProps={{ shrink: true }}
        value={range.end}
        onChange={(e) => setRange((r) => ({ ...r, end: e.target.value }))}
        sx={{ minWidth: compact ? 140 : 160 }}
      />
      <Tooltip title="Reset to default">
        <IconButton onClick={resetRange} size="small">
          <Restore fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );

  const ChartOrEmpty = (height: number) => {
    if (chartData.length === 0 || totalCases === 0) {
      const daysDiff = differenceInDays(endDate, startDate);
      const rangeText = daysDiff <= 31 
        ? `${format(startDate, 'MMM dd')} to ${format(endDate, 'MMM dd')}`
        : `${format(startDate, 'MMM yyyy')} to ${format(endDate, 'MMM yyyy')}`;
        
      return (
        <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height={height}>
          <TrendingUp sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography color="text.secondary" variant="body2" fontWeight={500}>
            No cases found in selected range
          </Typography>
          <Typography color="text.secondary" variant="caption" mt={1}>
            Showing {rangeText}
          </Typography>
        </Box>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <defs>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="period"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            axisLine={{ stroke: '#e5e7eb' }}
            angle={differenceInDays(endDate, startDate) <= 31 ? -45 : 0}
            textAnchor={differenceInDays(endDate, startDate) <= 31 ? 'end' : 'middle'}
            height={differenceInDays(endDate, startDate) <= 31 ? 70 : 50}
          />
          <YAxis
            tick={{ fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
            allowDecimals={false}
          />
          <RechartsTooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={avg}
            stroke="#9CA3AF"
            strokeDasharray="4 4"
            label={{
              value: `Avg ${avg.toFixed(1)}`,
              position: 'right',
              fill: '#6b7280',
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="cases"
            stroke="url(#lineGrad)"
            strokeWidth={3}
            dot={{ fill: '#3B82F6', strokeWidth: 2, r: 6 }}
            activeDot={{ r: 8, stroke: '#3B82F6', strokeWidth: 2, fill: '#fff' }}
            name="New Cases"
            animationDuration={600}
          >
            <LabelList 
              dataKey="cases" 
              position="top" 
              style={{ fill: '#374151', fontWeight: 600, fontSize: 12 }} 
            />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Paper
      sx={{
        p: 3,
        bgcolor: 'white',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        borderRadius: 2,
        border: '1px solid #f0f0f0',
      }}
    >
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h6" fontWeight={600} color="#1a1a1a" mb={0.5}>
            Monthly Case Trend
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Track new cases over time
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
          <Controls />
          <Chip
            label={`${totalCases} total`}
            size="small"
            variant="outlined"
            color={totalCases > 0 ? 'primary' : 'default'}
            sx={{ fontWeight: 600 }}
          />
          <Tooltip title="View detailed list">
            <IconButton
              onClick={() => setModalOpen(true)}
              size="small"
              sx={{ bgcolor: 'rgba(59, 130, 246, 0.1)', '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.2)' } }}
            >
              <OpenInFull sx={{ fontSize: 18, color: '#3B82F6' }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Chart */}
      {ChartOrEmpty(300)}

      {/* Modal */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2, minHeight: '80vh', bgcolor: '#fafafa' } }}
      >
        <DialogTitle
          sx={{
            borderBottom: '1px solid #e5e7eb',
            pb: 2,
            bgcolor: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Box>
            <Typography variant="h5" fontWeight={600} color="#1a1a1a">
              Monthly Case Trend - Detailed View
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              {format(startDate, 'MMM dd')} to {format(endDate, 'MMM dd')} • {totalCases} {totalCases === 1 ? 'case' : 'cases'} total
            </Typography>
          </Box>
          <Controls compact />
          <IconButton onClick={() => setModalOpen(false)} size="small">
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          <Stack spacing={3}>
            {/* Larger Chart */}
            <Paper sx={{ p: 4, bgcolor: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', borderRadius: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6" fontWeight={600} color="#1a1a1a">
                  Monthly Case Distribution
                </Typography>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Chip label={`Total: ${totalCases}`} color="primary" sx={{ fontWeight: 600 }} />
                  <Chip
                    label={`Avg: ${avg.toFixed(1)} per month`}
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                  />
                </Stack>
              </Stack>
              {ChartOrEmpty(400)}
            </Paper>

            {/* Case Details */}
            <Paper sx={{ p: 3, bgcolor: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', borderRadius: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                  <Typography variant="h6" fontWeight={600} color="#1a1a1a">
                    Recent Cases
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mt={0.5}>
                    {filteredCases.length} {filteredCases.length === 1 ? 'case' : 'cases'} in the selected period
                  </Typography>
                </Box>
              </Stack>

              {filteredCases.length === 0 ? (
                <Box display="flex" flexDirection="column" alignItems="center" py={6}>
                  <CalendarToday sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                  <Typography color="text.secondary" variant="body2">
                    No cases found for this period
                  </Typography>
                </Box>
              ) : (
                <List sx={{ py: 0 }}>
                  {filteredCases.map((caseItem: any, index: number) => {
                    const caseDate = caseItem._dt;
                    const periodKey = caseItem._periodKey;

                    return (
                      <React.Fragment key={caseItem._id || `${periodKey}-${index}`}>
                        <ListItem
                          sx={{
                            py: 2,
                            px: 2,
                            borderRadius: 1,
                            mb: index < filteredCases.length - 1 ? 1 : 0,
                            '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.05)' },
                          }}
                        >
                          <ListItemText
                            primary={
                              <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                                <Typography variant="body1" fontWeight={600} color="#1a1a1a">
                                  {caseItem.caseNumber || `Case ${index + 1}`}
                                </Typography>
                                <Chip
                                  label={getStatusLabel(caseItem.status)}
                                  size="small"
                                  sx={{
                                    bgcolor: `${getStatusColor(caseItem.status)}15`,
                                    color: getStatusColor(caseItem.status),
                                    fontWeight: 600,
                                    border: 'none',
                                    fontSize: 11,
                                  }}
                                />
                              </Stack>
                            }
                            secondary={
                              <Stack spacing={0.5} mt={1}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                  <CalendarToday sx={{ fontSize: 14, color: 'text.secondary' }} />
                                  <Typography variant="body2" color="text.secondary">
                                    {format(caseDate, 'MMMM dd, yyyy')}
                                  </Typography>
                                </Stack>
                                {caseItem.worker && (
                                  <Stack direction="row" alignItems="center" spacing={1}>
                                    <Typography variant="body2" color="text.secondary">
                                      Worker: {caseItem.worker.firstName} {caseItem.worker.lastName}
                                    </Typography>
                                  </Stack>
                                )}
                              </Stack>
                            }
                          />
                        </ListItem>
                        {index < filteredCases.length - 1 && <Divider sx={{ my: 0 }} />}
                      </React.Fragment>
                    );
                  })}
                </List>
              )}
            </Paper>
          </Stack>
        </DialogContent>
      </Dialog>
    </Paper>
  );
};

export default MonthlyCaseTrendChart;
