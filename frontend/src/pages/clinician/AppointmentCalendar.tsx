import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Card,
  Typography,
  IconButton,
  Button,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Grid,
  Paper,
  Avatar,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Event,
  CalendarToday,
  AccessTime,
  LocationOn,
  VideoCall,
  ContentCopy,
} from '@mui/icons-material';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, parseISO, isSameDay } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext.supabase';
import { dataClient } from '../../lib/supabase';
import LayoutWithSidebar from '../../components/LayoutWithSidebar';

interface Appointment {
  _id: string;
  case: {
    _id: string;
    caseNumber: string;
    worker: {
      _id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  worker: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  clinician: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  appointmentType: string;
  scheduledDate: string;
  duration: number;
  location: string;
  status: string;
  notes: string;
  telehealthInfo?: {
    platform: string;
    meetingId: string;
    meetingUrl: string;
    password: string;
    instructions: string;
    zoomMeeting: {
      id: string;
      topic: string;
      startTime: string;
      duration: number;
      joinUrl: string;
      password: string;
      meetingId: string;
      hostId: string;
      createdAt: string;
      status: string;
    };
  };
}

interface AppointmentDialogProps {
  open: boolean;
  onClose: () => void;
  appointments: Appointment[];
  selectedDate: Date;
  copyToClipboard: (text: string) => void;
}

const AppointmentDialog: React.FC<AppointmentDialogProps> = ({ open, onClose, appointments, selectedDate, copyToClipboard }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ 
        background: 'linear-gradient(135deg, #7B68EE 0%, #20B2AA 100%)',
        color: 'white',
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'flex-start', sm: 'center' },
        gap: 2,
        p: 3,
        borderRadius: '16px 16px 0 0'
      }}>
        <Box display="flex" alignItems="center" gap={2}>
          <Box sx={{
            width: 48,
            height: 48,
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
          }}>
            <CalendarToday sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ 
              fontWeight: 700,
              letterSpacing: '-0.02em',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              mb: 0.5
            }}>
              {format(selectedDate, 'MMMM d, yyyy')}
            </Typography>
            <Typography variant="subtitle2" sx={{ 
              opacity: 0.9,
              fontWeight: 500
            }}>
              {appointments.length} {appointments.length === 1 ? 'appointment' : 'appointments'} scheduled
            </Typography>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        {appointments.length === 0 ? (
          <Box sx={{ 
            p: 4, 
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2
          }}>
            <Box sx={{
              width: 80,
              height: 80,
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(123, 104, 238, 0.1)',
              mb: 2
            }}>
              <CalendarToday sx={{ fontSize: 40, color: 'primary.main' }} />
            </Box>
            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 600 }}>
              No Appointments
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400 }}>
              There are no appointments scheduled for this date. Select a different date to view appointments.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ p: 2 }}>
            {appointments.map((appointment, index) => (
              <Paper 
                key={appointment._id} 
                elevation={0}
                sx={{ 
                  p: 3, 
                  mb: 2, 
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  background: 'linear-gradient(to right bottom, white, rgba(255,255,255,0.95))',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  '&:hover': {
                    boxShadow: '0 8px 24px rgba(123, 104, 238, 0.15)',
                    transform: 'translateY(-2px)',
                    borderColor: 'primary.main',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      flexWrap: 'wrap',
                      gap: 2,
                      mb: 2 
                    }}>
                      <Box>
                        <Typography variant="h6" sx={{
                          color: 'primary.main',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          mb: 0.5
                        }}>
                          <AccessTime sx={{ fontSize: 20 }} />
                          {format(parseISO(appointment.scheduledDate), 'h:mm a')}
                        </Typography>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 500 }}>
                          {appointment.appointmentType.charAt(0).toUpperCase() + appointment.appointmentType.slice(1)} Session
                        </Typography>
                      </Box>
                      <Box sx={{ 
                        display: 'inline-flex',
                        alignItems: 'center',
                        px: 2,
                        py: 1,
                        borderRadius: '12px',
                        background: appointment.status === 'confirmed' ? 'linear-gradient(135deg, #4CAF50 0%, #45B649 100%)' : 
                                  appointment.status === 'cancelled' ? 'linear-gradient(135deg, #FF5252 0%, #FF1744 100%)' : 
                                  'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        letterSpacing: '0.02em',
                        textTransform: 'uppercase'
                      }}>
                        {appointment.status}
                      </Box>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1.5,
                        p: 2,
                        borderRadius: 2,
                        bgcolor: 'rgba(123, 104, 238, 0.05)'
                      }}>
                        <Avatar sx={{ 
                          bgcolor: 'primary.main',
                          width: 40,
                          height: 40
                        }}>
                          {appointment.worker.firstName[0]}{appointment.worker.lastName[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                            Worker
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {appointment.worker.firstName} {appointment.worker.lastName}
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1.5,
                        p: 2,
                        borderRadius: 2,
                        bgcolor: 'rgba(32, 178, 170, 0.05)'
                      }}>
                        <Box sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'secondary.main'
                        }}>
                          <AccessTime sx={{ color: 'white' }} />
                        </Box>
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                            Duration
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {appointment.duration} minutes
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1.5,
                        p: 2,
                        borderRadius: 2,
                        bgcolor: 'rgba(123, 104, 238, 0.05)'
                      }}>
                        <Box sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'primary.main'
                        }}>
                          <LocationOn sx={{ color: 'white' }} />
                        </Box>
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                            Location
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {appointment.location.charAt(0).toUpperCase() + appointment.location.slice(1)}
                          </Typography>
                        </Box>
                      </Box>
                      
                      {appointment.location === 'telehealth' && appointment.telehealthInfo?.zoomMeeting && (
                        <Box sx={{ 
                          p: 2,
                          borderRadius: 2,
                          bgcolor: 'rgba(32, 178, 170, 0.05)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 1
                        }}>
                          <Typography variant="subtitle2" color="text.secondary">
                            Zoom Meeting
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button 
                              variant="contained" 
                              size="small" 
                              onClick={() => window.open(appointment.telehealthInfo!.zoomMeeting!.joinUrl, '_blank')}
                              startIcon={<VideoCall />}
                              sx={{
                                background: 'linear-gradient(135deg, #2196F3 0%, #1E88E5 100%)',
                                boxShadow: '0 2px 8px rgba(33, 150, 243, 0.3)',
                                '&:hover': {
                                  background: 'linear-gradient(135deg, #1E88E5 0%, #1976D2 100%)',
                                }
                              }}
                            >
                              Join Meeting
                            </Button>
                            <Tooltip title="Copy Meeting Link">
                              <IconButton 
                                size="small" 
                                onClick={() => copyToClipboard(appointment.telehealthInfo!.zoomMeeting!.joinUrl)}
                                sx={{
                                  bgcolor: 'rgba(33, 150, 243, 0.1)',
                                  '&:hover': {
                                    bgcolor: 'rgba(33, 150, 243, 0.2)',
                                  }
                                }}
                              >
                                <ContentCopy fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                      )}
                    </Box>
                  </Grid>
                  
                  {appointment.notes && (
                    <Grid item xs={12}>
                      <Box sx={{ 
                        mt: 1, 
                        p: 2, 
                        borderRadius: 2,
                        bgcolor: 'rgba(0,0,0,0.02)',
                        border: '1px dashed',
                        borderColor: 'divider'
                      }}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                          Notes
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                          {appointment.notes}
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </Paper>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ 
        p: 3,
        borderTop: '1px solid',
        borderColor: 'divider',
        gap: 1
      }}>
        <Button 
          onClick={onClose}
          variant="outlined"
          sx={{
            borderRadius: 2,
            px: 3
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const AppointmentCalendar: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  
  const { user } = useAuth();
  
  // Function to get appointments for a specific date
  const getAppointmentsForDate = useCallback((date: Date) => {
    return appointments.filter(appointment => 
      isSameDay(parseISO(appointment.scheduledDate), date)
    );
  }, [appointments]);
  
  
  // Function to get appointment status color
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'confirmed':
        return '#4caf50'; // Green
      case 'scheduled':
        return '#ff9800'; // Orange
      case 'cancelled':
        return '#f44336'; // Red
      case 'completed':
        return '#2196f3'; // Blue
      default:
        return '#9e9e9e'; // Grey
    }
  };
  
  // Function to copy text to clipboard
  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Link copied to clipboard!');
    }).catch(err => {
      console.error('Could not copy text: ', err);
    });
  }, []);
  
  // Fetch appointments
  useEffect(() => {
    const fetchAppointments = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null); // Clear previous errors
        const startDate = startOfMonth(currentMonth);
        const endDate = endOfMonth(currentMonth);
        
        // Format dates for API query
        const formattedStartDate = format(startDate, 'yyyy-MM-dd');
        const formattedEndDate = format(endDate, 'yyyy-MM-dd');
        
        // Appointments table doesn't exist yet, so we'll use mock data
        const appointmentsData: any[] = [];
        setAppointments(appointmentsData);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch appointments');
        console.error('Error fetching appointments:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAppointments();
  }, [currentMonth, user]); // Include user dependency
  
  // Handle previous month
  const handlePreviousMonth = useCallback(() => {
    setCurrentMonth(subMonths(currentMonth, 1));
  }, [currentMonth]);
  
  // Handle next month
  const handleNextMonth = useCallback(() => {
    setCurrentMonth(addMonths(currentMonth, 1));
  }, [currentMonth]);
  
  // Handle date click
  const handleDateClick = useCallback((date: Date) => {
    setSelectedDate(date);
    setDialogOpen(true);
  }, []);
  
  // Generate calendar days
  const days = useMemo(() => eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  }), [currentMonth]);
  
  // Get day of week for the first day of the month (0 = Sunday, 6 = Saturday)
  const firstDayOfMonth = useMemo(() => startOfMonth(currentMonth).getDay(), [currentMonth]);
  
  // Generate blank cells for days before the first day of the month
  const blankCells = useMemo(() => Array.from({ length: firstDayOfMonth }, (_, i) => (
    <Box 
      key={`blank-${i}`} 
      sx={{ 
        height: { xs: 80, sm: 120 },
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.default',
        opacity: 0.5
      }}
    />
  )), [firstDayOfMonth]);
  
  return (
    <LayoutWithSidebar>
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Card sx={{ overflow: 'hidden' }}>
          <Box sx={{ 
            p: 3, 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between', 
            alignItems: { xs: 'stretch', sm: 'center' },
            gap: 2,
            background: 'linear-gradient(135deg, #7B68EE 0%, #20B2AA 100%)',
            color: 'white',
            borderRadius: '16px 16px 0 0',
            boxShadow: '0 4px 20px rgba(123, 104, 238, 0.25)'
          }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 2,
              pl: { xs: 0, sm: 2 }
            }}>
              <Box sx={{
                width: 48,
                height: 48,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
              }}>
                <Event sx={{ fontSize: 28 }} />
              </Box>
              <Typography variant="h5" sx={{ 
                fontWeight: 700,
                letterSpacing: '-0.02em',
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
              }}>
                Appointment Calendar
              </Typography>
            </Box>
            
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              justifyContent: { xs: 'center', sm: 'flex-end' }
            }}>
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                borderRadius: '12px',
                p: 0.5,
                mr: 2
              }}>
                <IconButton 
                  onClick={handlePreviousMonth} 
                  sx={{ 
                    color: 'white',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.1)'
                    }
                  }}
                >
                  <ChevronLeft />
                </IconButton>
                <Typography variant="h6" sx={{ 
                  px: 2,
                  fontWeight: 600,
                  letterSpacing: '-0.01em'
                }}>
                  {format(currentMonth, 'MMMM yyyy')}
                </Typography>
                <IconButton 
                  onClick={handleNextMonth} 
                  sx={{ 
                    color: 'white',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.1)'
                    }
                  }}
                >
                  <ChevronRight />
                </IconButton>
              </Box>
              <Button 
                variant="contained" 
                onClick={() => setCurrentMonth(new Date())}
                sx={{ 
                  bgcolor: 'rgba(255, 255, 255, 0.9)',
                  color: 'primary.main',
                  fontWeight: 600,
                  px: 3,
                  '&:hover': {
                    bgcolor: 'white'
                  }
                }}
              >
                Today
              </Button>
            </Box>
          </Box>
          
          {error && (
            <Alert severity="error" sx={{ m: 2 }}>
              {error}
            </Alert>
          )}
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ p: 2 }}>
              {/* Calendar header - Days of week */}
              <Grid container sx={{ mb: 1 }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <Grid item xs={12/7} key={day}>
                    <Box sx={{ 
                      py: 1.5,
                      textAlign: 'center', 
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      letterSpacing: '0.02em',
                      color: day === 'Sun' ? '#ff4757' : day === 'Sat' ? '#2196f3' : '#666',
                      borderBottom: '2px solid',
                      borderColor: 'divider'
                    }}>
                      {day}
                    </Box>
                  </Grid>
                ))}
              </Grid>
              
              {/* Calendar grid */}
              <Grid container>
                {/* Blank cells */}
                {blankCells.map((cell, index) => (
                  <Grid item xs={12/7} key={`blank-${index}`}>
                    {cell}
                  </Grid>
                ))}
                
                {/* Calendar days */}
                {days.map((day) => {
                  const dayAppointments = getAppointmentsForDate(day);
                  const hasAppointmentsForDay = dayAppointments.length > 0;
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isCurrentDay = isToday(day);
                  
                  return (
                    <Grid item xs={12/7} key={day.toString()}>
                      <Box 
                        sx={{ 
                          height: { xs: 100, sm: 140 },
                          border: '1px solid',
                          borderColor: 'divider',
                          p: 1.5,
                          position: 'relative',
                          bgcolor: isCurrentDay ? 'primary.light' : 'white',
                          opacity: !isCurrentMonth ? 0.5 : 1,
                          cursor: hasAppointmentsForDay ? 'pointer' : 'default',
                          transition: 'all 0.2s ease',
                          '&:hover': hasAppointmentsForDay ? {
                            transform: 'translateY(-2px)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            borderColor: 'primary.main',
                          } : {},
                          overflow: 'hidden'
                        }}
                        onClick={() => hasAppointmentsForDay && handleDateClick(day)}
                      >
                        <Box sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          mb: 1
                        }}>
                          <Typography 
                            variant="body1" 
                            sx={{ 
                              fontWeight: isCurrentDay ? 700 : isCurrentMonth ? 500 : 400,
                              color: isCurrentDay ? 'white' : 
                                    !isCurrentMonth ? 'text.disabled' : 
                                    format(day, 'E') === 'Sun' ? '#ff4757' :
                                    format(day, 'E') === 'Sat' ? '#2196f3' : 'text.primary',
                              fontSize: '0.95rem'
                            }}
                          >
                            {format(day, 'd')}
                          </Typography>
                          {hasAppointmentsForDay && (
                            <Box sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                              bgcolor: isCurrentDay ? 'rgba(255,255,255,0.2)' : 'primary.light',
                              color: isCurrentDay ? 'white' : 'white',
                              px: 1,
                              py: 0.5,
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: 600
                            }}>
                              {dayAppointments.length}
                            </Box>
                          )}
                        </Box>
                        
                        {/* Appointment indicators */}
                        {hasAppointmentsForDay && (
                          <Box sx={{ 
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 0.5
                          }}>
                            {dayAppointments.slice(0, 2).map((appointment) => (
                              <Box 
                                key={appointment._id}
                                sx={{ 
                                  bgcolor: getStatusColor(appointment.status),
                                  color: 'white',
                                  px: 1,
                                  py: 0.75,
                                  borderRadius: '8px',
                                  fontSize: '0.75rem',
                                  fontWeight: 500,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.5,
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                  transition: 'transform 0.2s ease',
                                  '&:hover': {
                                    transform: 'translateX(2px)'
                                  }
                                }}
                              >
                                <Typography sx={{ 
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  bgcolor: 'rgba(255,255,255,0.2)',
                                  px: 0.75,
                                  py: 0.25,
                                  borderRadius: '4px'
                                }}>
                                  {format(parseISO(appointment.scheduledDate), 'h:mm a')}
                                </Typography>
                                <Typography sx={{
                                  flex: 1,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  {appointment.worker.firstName}
                                </Typography>
                              </Box>
                            ))}
                            
                            {dayAppointments.length > 2 && (
                              <Box sx={{ 
                                textAlign: 'center',
                                color: 'text.secondary',
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                mt: 0.5,
                                p: 0.5,
                                borderRadius: '6px',
                                bgcolor: 'rgba(0,0,0,0.04)'
                              }}>
                                +{dayAppointments.length - 2} more
                              </Box>
                            )}
                          </Box>
                        )}
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          )}
        </Card>
      </Box>
      
      {/* Appointment details dialog */}
      {selectedDate && (
        <AppointmentDialog 
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          appointments={getAppointmentsForDate(selectedDate)}
          selectedDate={selectedDate}
          copyToClipboard={copyToClipboard}
        />
      )}
    </LayoutWithSidebar>
  );
};

export default AppointmentCalendar;

