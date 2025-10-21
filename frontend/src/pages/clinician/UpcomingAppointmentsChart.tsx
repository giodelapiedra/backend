// src/components/UpcomingAppointmentsChart.tsx
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
  ListItemAvatar,
  ListItemText,
  Avatar,
  Divider,
  Badge,
  Tooltip,
  TextField,
} from '@mui/material';
import {
  CalendarToday,
  OpenInFull,
  Close,
  AccessTime,
  Person,
  Event,
  FilterList,
  Restore,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  LabelList,
} from 'recharts';
import { format, addDays, eachDayOfInterval } from 'date-fns';

interface Worker {
  firstName?: string;
  lastName?: string;
}
interface Appointment {
  _id?: string;
  scheduledDate: string | number | Date;
  status?: string;
  appointmentType?: string;
  duration?: number;
  worker?: Worker;
}
interface AppointmentData {
  day: string;
  appointments: number;
  fullDate?: string;
}
interface UpcomingAppointmentsChartProps {
  appointments: Appointment[];
}

// ---------- Utils ----------
const toYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const endOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};
const safeDateFromInput = (value: string | undefined) => {
  if (!value) return null; // Why: avoid invalid Date while user is typing
  const d = new Date(`${value}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
};

const getStatusColor = (status?: string) => {
  const colors: Record<string, string> = {
    scheduled: '#3B82F6',
    confirmed: '#10B981',
    completed: '#6B7280',
    cancelled: '#EF4444',
    rescheduled: '#F59E0B',
  };
  return colors[(status || '').toLowerCase()] || '#6B7280';
};
const getStatusLabel = (status?: string) =>
  status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : 'Scheduled';
const getAppointmentTypeColor = (type?: string) => {
  const colors: Record<string, string> = {
    assessment: '#8B5CF6',
    telehealth: '#3B82F6',
    consultation: '#10B981',
    'follow-up': '#F59E0B',
    therapy: '#EC4899',
  };
  return colors[(type || '').toLowerCase()] || '#6B7280';
};

// ---------- Tooltip ----------
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
          {data.fullDate || data.day}
        </Typography>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#3B82F6' }} />
          <Typography variant="body2" fontWeight={600} color="#1a1a1a">
            {data.appointments} {data.appointments === 1 ? 'appointment' : 'appointments'}
          </Typography>
        </Stack>
      </Box>
    );
  }
  return null;
};

const UpcomingAppointmentsChart: React.FC<UpcomingAppointmentsChartProps> = ({ appointments }) => {
  const today = useMemo(() => startOfDay(new Date()), []);
  const defaultEnd = useMemo(() => endOfDay(addDays(today, 13)), [today]);

  const [range, setRange] = useState<{ start: string; end: string }>({
    start: toYMD(today),
    end: toYMD(defaultEnd),
  });
  const [modalOpen, setModalOpen] = useState(false);

  // Parse once + frequency map
  const { parsedAppointments, countsByYMD } = useMemo(() => {
    const parsed: Array<Appointment & { _dt: Date; _ymd: string }> = [];
    const freq: Record<string, number> = {};
    for (const a of appointments || []) {
      const d = new Date(a.scheduledDate as any);
      if (isNaN(d.getTime())) continue;
      const ymd = toYMD(d);
      parsed.push({ ...(a as Appointment), _dt: d, _ymd: ymd });
      freq[ymd] = (freq[ymd] || 0) + 1;
    }
    return { parsedAppointments: parsed, countsByYMD: freq };
  }, [appointments]);

  const startDate = useMemo(() => safeDateFromInput(range.start), [range.start]);
  const endDate = useMemo(() => safeDateFromInput(range.end), [range.end]);
  const hasValidRange = !!startDate && !!endDate && startDate <= endDate;

  const days = useMemo(() => {
    if (!hasValidRange) return [];
    return eachDayOfInterval({ start: startOfDay(startDate!), end: startOfDay(endDate!) });
  }, [hasValidRange, startDate, endDate]);

  const weeklyData: AppointmentData[] = useMemo(() => {
    if (!hasValidRange) return [];
    return days.map((day) => {
      const ymd = toYMD(day);
      return {
        day: format(day, 'MMM dd'),
        appointments: countsByYMD[ymd] || 0,
        fullDate: format(day, 'EEEE, MMMM dd, yyyy'),
      };
    });
  }, [days, countsByYMD, hasValidRange]);

  const filteredAppointments = useMemo(() => {
    if (!hasValidRange) return [];
    const s = startOfDay(startDate!);
    const e = endOfDay(endDate!);
    return parsedAppointments
      .filter((a) => a._dt >= s && a._dt <= e)
      .sort((a, b) => a._dt.getTime() - b._dt.getTime());
  }, [parsedAppointments, startDate, endDate, hasValidRange]);

  const totalAppointments = filteredAppointments.length;
  const rangeLabel = hasValidRange
    ? `${format(startDate!, 'MMM dd')} to ${format(endDate!, 'MMM dd')}`
    : 'Invalid date range';
  const avg =
    hasValidRange && weeklyData.length > 0 ? totalAppointments / weeklyData.length : 0;

  const setPreset = (daysAhead: number) => {
    const s = toYMD(today);
    const e = toYMD(endOfDay(addDays(today, daysAhead - 1)));
    setRange({ start: s, end: e });
  };
  const resetRange = () => {
    setRange({ start: toYMD(today), end: toYMD(defaultEnd) });
  };

  // Reusable Date Controls
  const DateControls = ({ compact = false }: { compact?: boolean }) => (
    <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap">
      {!compact && <FilterList sx={{ fontSize: 18, color: 'text.secondary' }} />}
      <TextField
        size="small"
        type="date"
        label={compact ? 'Start' : 'Start date'}
        InputLabelProps={{ shrink: true }}
        value={range.start}
        onChange={(e) => setRange((r) => ({ ...r, start: e.target.value }))}
        sx={{ minWidth: compact ? 135 : 160 }}
      />
      <TextField
        size="small"
        type="date"
        label={compact ? 'End' : 'End date'}
        InputLabelProps={{ shrink: true }}
        value={range.end}
        onChange={(e) => setRange((r) => ({ ...r, end: e.target.value }))}
        sx={{ minWidth: compact ? 135 : 160 }}
      />
      <Stack direction="row" spacing={1}>
        <Chip label="7d" size="small" variant="outlined" onClick={() => setPreset(7)} />
        <Chip label="14d" size="small" variant="outlined" onClick={() => setPreset(14)} />
        {/* 30d removed per request */}
        <Tooltip title="Reset to default">
          <IconButton onClick={resetRange} size="small">
            <Restore fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Stack>
  );

  const ChartOrEmpty = (height: number, denseTicks = false) => {
    if (!hasValidRange) {
      return (
        <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height={height}>
          <CalendarToday sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography color="text.secondary" variant="body2" fontWeight={500}>
            Please select a valid date range
          </Typography>
        </Box>
      );
    }
    if (weeklyData.length === 0 || totalAppointments === 0) {
      return (
        <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height={height}>
          <CalendarToday sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography color="text.secondary" variant="body2" fontWeight={500}>
            No appointments in {rangeLabel.toLowerCase()}
          </Typography>
          <Typography color="text.secondary" variant="caption" mt={1}>
            Showing {rangeLabel}
          </Typography>
        </Box>
      );
    }
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={weeklyData}
          barCategoryGap="25%"
        >
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="day"
            tick={{ fill: '#6b7280', fontSize: denseTicks ? 10 : 12 }}
            axisLine={{ stroke: '#e5e7eb' }}
            angle={-45}
            textAnchor="end"
            height={denseTicks ? 58 : 70}
            interval={denseTicks ? 1 : 0}
          />
          <YAxis
            tick={{ fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
            allowDecimals={false}
          />
          <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.08)' }} />
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
          <Bar
            dataKey="appointments"
            fill="url(#barGrad)"
            radius={[8, 8, 0, 0]}
            name="Appointments"
            animationDuration={400}
          >
            <LabelList dataKey="appointments" position="top" style={{ fill: '#374151', fontWeight: 600 }} />
          </Bar>
        </BarChart>
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
            Upcoming Appointments
          </Typography>
          <Typography variant="caption" color="text.secondary">
            View your scheduled appointments
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
          <DateControls />
          <Chip
            label={`${totalAppointments} total`}
            size="small"
            variant="outlined"
            color={totalAppointments > 0 ? 'primary' : 'default'}
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
      {ChartOrEmpty(320, weeklyData.length >= 30)}

      {/* Modal */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        maxWidth="xl"
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
              Upcoming Appointments - Detailed View
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              {hasValidRange ? rangeLabel : 'Invalid date range'} • {totalAppointments}{' '}
              {totalAppointments === 1 ? 'appointment' : 'appointments'} scheduled
            </Typography>
          </Box>
          {/* Modal has its own filters (same state/shared) */}
          <DateControls compact />
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
                  Daily Appointment Distribution
                </Typography>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Chip label={`Total: ${totalAppointments}`} color="primary" sx={{ fontWeight: 600 }} />
                  <Chip
                    label={`Avg: ${avg.toFixed(1)} per day`}
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                  />
                </Stack>
              </Stack>
              {ChartOrEmpty(520)}
            </Paper>

            {/* Appointment Details */}
            <Paper sx={{ p: 3, bgcolor: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', borderRadius: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                  <Typography variant="h6" fontWeight={600} color="#1a1a1a">
                    Appointment Details
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mt={0.5}>
                    {filteredAppointments.length} scheduled{' '}
                    {filteredAppointments.length === 1 ? 'appointment' : 'appointments'}
                  </Typography>
                </Box>
              </Stack>

              {filteredAppointments.length === 0 ? (
                <Box display="flex" flexDirection="column" alignItems="center" py={6}>
                  <CalendarToday sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                  <Typography color="text.secondary" variant="body2">
                    No appointments found for this period
                  </Typography>
                </Box>
              ) : (
                <List sx={{ py: 0 }}>
                  {filteredAppointments.map((appointment: any, index: number) => {
                    const apptDate: Date = appointment._dt;
                    const isToday = toYMD(apptDate) === toYMD(today);
                    const isTomorrow = toYMD(apptDate) === toYMD(addDays(today, 1));

                    return (
                      <React.Fragment key={appointment._id || `${appointment._ymd}-${index}`}>
                        <ListItem
                          sx={{
                            py: 2.5,
                            px: 2,
                            borderRadius: 1,
                            mb: index < filteredAppointments.length - 1 ? 1 : 0,
                            '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.05)' },
                          }}
                        >
                          <ListItemAvatar>
                            <Badge
                              overlap="circular"
                              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                              badgeContent={
                                <Box
                                  sx={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: '50%',
                                    bgcolor: getStatusColor(appointment.status),
                                    border: '2px solid white',
                                  }}
                                />
                              }
                            >
                              <Avatar
                                sx={{
                                  bgcolor: getAppointmentTypeColor(appointment.appointmentType),
                                  width: 56,
                                  height: 56,
                                }}
                              >
                                <Event sx={{ fontSize: 28 }} />
                              </Avatar>
                            </Badge>
                          </ListItemAvatar>

                          <ListItemText
                            primary={
                              <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                                <Typography variant="h6" fontWeight={600} color="#1a1a1a">
                                  {appointment.appointmentType
                                    ? appointment.appointmentType.charAt(0).toUpperCase() +
                                      appointment.appointmentType.slice(1)
                                    : 'Appointment'}
                                </Typography>
                                {isToday && <Chip label="Today" size="small" color="primary" sx={{ height: 22 }} />}
                                {isTomorrow && <Chip label="Tomorrow" size="small" color="warning" sx={{ height: 22 }} />}
                              </Stack>
                            }
                            secondary={
                              <Stack spacing={0.8} mt={1.5}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                  <CalendarToday sx={{ fontSize: 16, color: 'text.secondary' }} />
                                  <Typography variant="body1" color="text.secondary">
                                    {format(apptDate, 'EEEE, MMMM dd, yyyy')}
                                  </Typography>
                                </Stack>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                  <AccessTime sx={{ fontSize: 16, color: 'text.secondary' }} />
                                  <Typography variant="body1" color="text.secondary">
                                    {format(apptDate, 'h:mm a')} • {appointment.duration || 60} minutes
                                  </Typography>
                                </Stack>
                                {appointment.worker && (
                                  <Stack direction="row" alignItems="center" spacing={1}>
                                    <Person sx={{ fontSize: 16, color: 'text.secondary' }} />
                                    <Typography variant="body1" color="text.secondary">
                                      {appointment.worker.firstName} {appointment.worker.lastName}
                                    </Typography>
                                  </Stack>
                                )}
                              </Stack>
                            }
                          />

                          <Box textAlign="right">
                            <Chip
                              label={getStatusLabel(appointment.status)}
                              size="medium"
                              sx={{
                                bgcolor: `${getStatusColor(appointment.status)}15`,
                                color: getStatusColor(appointment.status),
                                fontWeight: 600,
                                border: 'none',
                                fontSize: 13,
                              }}
                            />
                          </Box>
                        </ListItem>
                        {index < filteredAppointments.length - 1 && <Divider sx={{ my: 0 }} />}
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

export default UpcomingAppointmentsChart;
