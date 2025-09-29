import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Alert,
  Grid,
} from '@mui/material';
import {
  CheckCircle,
  LocalHospital,
  Work,
  PlayArrow,
  Assessment,
  Favorite,
  Warning,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import LayoutWithSidebar from '../../components/LayoutWithSidebar';
import SimpleCheckIn from '../../components/SimpleCheckIn';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

// Interfaces
interface Case {
  _id: string;
  caseNumber: string;
  status: string;
  description: string;
  priority: string;
}

interface Appointment {
  _id: string;
  title: string;
  date: string;
}

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isRead: boolean;
  createdAt: string;
  sender: {
    firstName: string;
    lastName: string;
  };
  actionUrl?: string;
}

interface DashboardStats {
  totalCheckIns: number;
  completedTasks: number;
  upcomingAppointments: number;
  unreadNotifications: number;
}

const WorkerDashboard: React.FC = memo(() => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [cases, setCases] = useState<Case[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [showSimpleCheckIn, setShowSimpleCheckIn] = useState(false);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState(false);
  const [checkInError, setCheckInError] = useState<string | null>(null);
  const [showWorkReadinessModal, setShowWorkReadinessModal] = useState(false);
  const [workReadinessForm, setWorkReadinessForm] = useState({
    fatigueLevel: '',
    painDiscomfort: '',
    painAreas: [] as string[],
    readinessLevel: '',
    mood: '',
    notes: ''
  });
  const [workReadinessLoading, setWorkReadinessLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hasSubmittedToday, setHasSubmittedToday] = useState(false);
  const [todaySubmission, setTodaySubmission] = useState<any>(null);

  const fetchWorkerData = useCallback(async () => {
    try {
      setLoading(true);
      const [casesRes, notificationsRes] = await Promise.all([
        api.get('/cases'),
        api.get('/notifications')
      ]);

      setCases(casesRes.data.cases || []);
      setNotifications(notificationsRes.data.notifications || []);
    } catch (error) {
      console.error('Error fetching worker data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkerData();
    checkTodaySubmission();
  }, [fetchWorkerData]);

  const checkTodaySubmission = async () => {
    try {
      const response = await api.get('/work-readiness/check-today');
      setHasSubmittedToday(response.data.alreadySubmitted);
      setTodaySubmission(response.data.assessment);
    } catch (error) {
      console.error('Error checking today submission:', error);
    }
  };

  // Global mouse and touch events for dragging
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const sliderTrack = document.querySelector('[data-slider-track]') as HTMLElement;
      if (!sliderTrack) return;
      
      const rect = sliderTrack.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      
      // Convert percentage to level (1-5)
      let level: number;
      if (percentage <= 20) level = 1;
      else if (percentage <= 40) level = 2;
      else if (percentage <= 60) level = 3;
      else if (percentage <= 80) level = 4;
      else level = 5;
      
      setWorkReadinessForm(prev => ({ ...prev, fatigueLevel: level.toString() }));
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      
      const sliderTrack = document.querySelector('[data-slider-track]') as HTMLElement;
      if (!sliderTrack) return;
      
      const rect = sliderTrack.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      
      // Convert percentage to level (1-5)
      let level: number;
      if (percentage <= 20) level = 1;
      else if (percentage <= 40) level = 2;
      else if (percentage <= 60) level = 3;
      else if (percentage <= 80) level = 4;
      else level = 5;
      
      setWorkReadinessForm(prev => ({ ...prev, fatigueLevel: level.toString() }));
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    const handleGlobalTouchEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
      document.addEventListener('touchend', handleGlobalTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('touchmove', handleGlobalTouchMove);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [isDragging]);

  // Memoized calculations
  const unreadNotifications = useMemo(() => 
    notifications.filter(n => !n.isRead), [notifications]
  );

  const unreadNotificationCount = useMemo(() => 
    unreadNotifications.length, [unreadNotifications]
  );

  const recentNotifications = useMemo(() => 
    unreadNotifications.slice(0, 3), [unreadNotifications]
  );

  useEffect(() => {
    if (showSimpleCheckIn && cases.length === 1 && !selectedCase) {
      setSelectedCase(cases[0]);
    }
  }, [showSimpleCheckIn, cases, selectedCase]);

  const handleSimpleCheckInSubmit = useCallback(async (data: any) => {
    try {
      setCheckInLoading(true);
      setCheckInError(null);
      setCheckInSuccess(false);
      
      // Convert SimpleCheckIn data to backend format
      const checkInData = {
        case: data.caseId || selectedCase?._id || cases[0]?._id,
        painLevel: {
          current: data.painLevel,
          worst: data.painLevel,
          average: data.painLevel
        },
        functionalStatus: {
          sleep: data.sleepQuality === 'good' ? 8 : data.sleepQuality === 'ok' ? 5 : 2,
          mood: data.mood === 'great' ? 8 : data.mood === 'okay' ? 5 : 2,
          energy: data.mood === 'great' ? 8 : data.mood === 'okay' ? 5 : 2,
          mobility: data.canDoJob === 'yes' ? 8 : data.canDoJob === 'modified' ? 5 : 2,
          dailyActivities: data.canDoJob === 'yes' ? 8 : data.canDoJob === 'modified' ? 5 : 2
        },
        workStatus: {
          workedToday: data.canDoJob !== 'no',
          hoursWorked: data.canDoJob === 'yes' ? 8 : data.canDoJob === 'modified' ? 4 : 0,
          difficulties: data.canDoJob === 'modified' ? ['Modified duties'] : [],
          painAtWork: data.canDoJob === 'no' ? data.painLevel : 0
        },
        symptoms: {
          swelling: false,
          stiffness: false,
          weakness: false,
          numbness: false,
          tingling: false,
          other: ''
        },
        notes: `Check-in: Pain ${data.painLevel}/10, Job: ${data.canDoJob}, Mood: ${data.mood}, Sleep: ${data.sleepQuality}`
      };

      console.log('Submitting check-in data:', checkInData);
      
      const response = await api.post('/check-ins', checkInData);
      console.log('Check-in response:', response.data);
      
      // Show success modal
      setCheckInSuccess(true);
      
      // Refresh data after a short delay
      setTimeout(async () => {
        await fetchWorkerData();
      }, 2000);
      
    } catch (err: any) {
      console.error('Error submitting check-in:', err);
      
      // Check if it's a duplicate check-in error
      if (err.response?.data?.message?.includes('already exists') || 
          err.response?.data?.message?.includes('duplicate')) {
        setCheckInError('duplicate');
      } else {
        setCheckInError(err.response?.data?.message || 'Failed to submit check-in');
      }
      
      // Don't set general error state for check-in errors - modal handles it
    } finally {
      setCheckInLoading(false);
    }
  }, [selectedCase, cases, fetchWorkerData]);

  // Callback handlers
  const handleNotificationAction = useCallback((notification: Notification) => {
    api.put(`/notifications/${notification._id}/read`);
    window.location.href = notification.actionUrl || '/cases';
  }, []);

  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      // Refresh notifications
      const response = await api.get('/notifications');
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  const handleCheckInClick = useCallback(() => {
    setShowSimpleCheckIn(true);
  }, []);

  const handleRehabPlanClick = useCallback(() => {
    navigate('/worker/rehabilitation-plan');
  }, [navigate]);

  const handleWorkReadinessClick = useCallback(() => {
    setShowWorkReadinessModal(true);
  }, []);

  const handleWorkReadinessSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!workReadinessForm.fatigueLevel || !workReadinessForm.painDiscomfort || 
        !workReadinessForm.readinessLevel || !workReadinessForm.mood) {
      return;
    }

    try {
      setWorkReadinessLoading(true);
      
      // Submit work readiness data
      const response = await api.post('/work-readiness/submit', {
        fatigueLevel: workReadinessForm.fatigueLevel,
        painDiscomfort: workReadinessForm.painDiscomfort,
        painAreas: workReadinessForm.painAreas,
        readinessLevel: workReadinessForm.readinessLevel,
        mood: workReadinessForm.mood,
        notes: workReadinessForm.notes
      });
      
      console.log('Work readiness submitted:', response.data);
      
      // Reset form and close modal
      setWorkReadinessForm({
        fatigueLevel: '',
        painDiscomfort: '',
        painAreas: [],
        readinessLevel: '',
        mood: '',
        notes: ''
      });
      setShowWorkReadinessModal(false);
      
      // Show success message
      setSuccessMessage('Work readiness assessment submitted successfully!');
      
      // Update submission status
      setHasSubmittedToday(true);
      setTodaySubmission(response.data.assessment);
      
    } catch (error: any) {
      console.error('Error submitting work readiness:', error);
      if (error.response?.data?.alreadySubmitted) {
        setHasSubmittedToday(true);
        setTodaySubmission(error.response.data);
        setSuccessMessage('You have already submitted your work readiness assessment for today.');
      }
    } finally {
      setWorkReadinessLoading(false);
    }
  }, [workReadinessForm]);

  const handleSliderMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleSliderTouchStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleSliderClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    
    // Convert percentage to level (1-5)
    let level: number;
    if (percentage <= 20) level = 1;
    else if (percentage <= 40) level = 2;
    else if (percentage <= 60) level = 3;
    else if (percentage <= 80) level = 4;
    else level = 5;
    
    setWorkReadinessForm(prev => ({ ...prev, fatigueLevel: level.toString() }));
  }, []);

  const handleCloseCheckIn = useCallback(() => {
    setShowSimpleCheckIn(false);
    setSelectedCase(null);
    setCheckInSuccess(false);
    setCheckInError(null);
  }, []);

  if (loading) {
    return (
      <LayoutWithSidebar>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <Typography>Loading dashboard...</Typography>
        </Box>
      </LayoutWithSidebar>
    );
  }

  return (
    <LayoutWithSidebar>
      <Box sx={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
        padding: { xs: 1, sm: 2, md: 3 },
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        {/* Error messages now handled by modals - no inline error display needed */}

        {successMessage && (
          <Alert 
            severity="success" 
            sx={{ 
              mb: 3, 
              borderRadius: 2,
              backgroundColor: '#f0fdf4',
              borderColor: '#bbf7d0',
              color: '#166534'
            }} 
            onClose={() => setSuccessMessage('')}
          >
            {successMessage}
          </Alert>
        )}

        {/* Welcome Section */}
        <Box sx={{ 
          textAlign: 'center', 
          mb: 6,
          width: '100%',
          maxWidth: { xs: '100%', sm: 600 }
        }}>
          <Typography 
            variant="h3" 
            component="h1" 
            sx={{ 
              fontWeight: 700, 
              color: '#1e293b',
              mb: 2,
              fontSize: { xs: '1.8rem', sm: '2.2rem', md: '3rem' }
            }}
          >
            Welcome Back!
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ 
              color: '#64748b',
              fontWeight: 400,
              fontSize: { xs: '0.9rem', sm: '1rem', md: '1.25rem' },
              px: { xs: 2, sm: 0 },
              mb: 3
            }}
          >
            Let's check in on your recovery progress today
          </Typography>
          
          {/* Team Information */}
          {user?.team && (
            <Box sx={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '0.5rem 1rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s ease',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                borderColor: '#3b82f6'
              }
            }}>
              <Work sx={{ 
                color: '#6b7280', 
                mr: 1, 
                fontSize: '1.25rem' 
              }} />
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: 500, 
                  color: '#374151',
                  fontSize: '0.875rem',
                  mr: 1
                }}
              >
                {user.team}
              </Typography>
              {user?.package && (
                <Chip
                  label={user.package === 'package1' ? 'Package 1' : user.package === 'package2' ? 'Package 2' : 'Package 3'}
                  size="small"
                  sx={{
                    backgroundColor: user.package === 'package1' ? '#dcfce7' : user.package === 'package2' ? '#dbeafe' : '#fef3c7',
                    color: user.package === 'package1' ? '#166534' : user.package === 'package2' ? '#1e40af' : '#92400e',
                    fontSize: '0.75rem',
                    height: '20px',
                    fontWeight: 500
                  }}
                />
              )}
            </Box>
          )}
        </Box>

        {/* Main Action Cards */}
        {/* Notifications Section */}
        {unreadNotificationCount > 0 && (
          <Card sx={{ 
            mb: 3, 
            borderRadius: 3,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            backgroundColor: 'white',
            border: '1px solid #e2e8f0'
          }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} sx={{ mb: 2 }}>
                <Box sx={{ 
                  backgroundColor: '#f59e0b',
                  borderRadius: 2,
                  p: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Warning sx={{ fontSize: 20, color: 'white' }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                  Alerts ({unreadNotificationCount})
                </Typography>
              </Box>
              
              {recentNotifications.map((notification) => (
                <Box key={notification._id} sx={{ 
                  mb: 3, 
                  p: 3, 
                  bgcolor: notification.type === 'high_pain' ? '#fef2f2' : 
                           notification.type === 'rtw_review' ? '#fef3c7' : 
                           notification.type === 'case_closed' ? '#f0fdf4' :
                           notification.type === 'return_to_work' ? '#fef3c7' : '#f0f9ff', 
                  borderRadius: 2,
                  border: notification.type === 'high_pain' ? '1px solid #fecaca' :
                          notification.type === 'rtw_review' ? '1px solid #fde68a' :
                          notification.type === 'case_closed' ? '1px solid #bbf7d0' :
                          notification.type === 'return_to_work' ? '1px solid #fde68a' : '1px solid #bae6fd'
                }}>
                  <Box display="flex" alignItems="center" gap={2} sx={{ mb: 2 }}>
                    <Box sx={{ 
                      backgroundColor: notification.type === 'high_pain' ? '#ef4444' : 
                                      notification.type === 'rtw_review' ? '#f59e0b' : 
                                      notification.type === 'case_closed' ? '#22c55e' :
                                      notification.type === 'return_to_work' ? '#f59e0b' : '#3b82f6',
                      borderRadius: 2,
                      p: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {notification.type === 'high_pain' ? <LocalHospital sx={{ fontSize: 20, color: 'white' }} /> :
                       notification.type === 'rtw_review' ? <Work sx={{ fontSize: 20, color: 'white' }} /> :
                       notification.type === 'case_closed' ? <CheckCircle sx={{ fontSize: 20, color: 'white' }} /> :
                       notification.type === 'return_to_work' ? <Work sx={{ fontSize: 20, color: 'white' }} /> :
                       <Assessment sx={{ fontSize: 20, color: 'white' }} />}
                    </Box>
                    <Box flex={1}>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                        {notification.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        From: {notification.sender.firstName} {notification.sender.lastName} • {new Date(notification.createdAt).toLocaleString()}
                      </Typography>
                    </Box>
                    <Chip
                      label={notification.priority.toUpperCase()}
                      color={notification.priority === 'urgent' ? 'error' : 
                             notification.priority === 'high' ? 'warning' : 'info'}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </Box>
                  
                  <Typography variant="body1" sx={{ mb: 2, color: '#374151' }}>
                    {notification.message}
                  </Typography>
                  
                  <Box display="flex" gap={1} sx={{ mt: 2 }}>
                    {notification.actionUrl && (
                      <Button
                        variant="contained"
                        color={notification.type === 'high_pain' ? 'error' : 
                               notification.type === 'rtw_review' ? 'warning' : 
                               notification.type === 'case_closed' ? 'success' :
                               notification.type === 'return_to_work' ? 'warning' : 'primary'}
                        size="small"
                        onClick={() => handleNotificationAction(notification)}
                        sx={{
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 600,
                          backgroundColor: notification.type === 'high_pain' ? '#ef4444' : 
                                          notification.type === 'rtw_review' ? '#f59e0b' : 
                                          notification.type === 'case_closed' ? '#22c55e' :
                                          notification.type === 'return_to_work' ? '#f59e0b' : '#3b82f6',
                          '&:hover': {
                            backgroundColor: notification.type === 'high_pain' ? '#dc2626' : 
                                            notification.type === 'rtw_review' ? '#d97706' : 
                                            notification.type === 'case_closed' ? '#16a34a' :
                                            notification.type === 'return_to_work' ? '#d97706' : '#2563eb'
                          }
                        }}
                      >
                        View Details
                      </Button>
                    )}
                    <Button
                      variant="outlined"
                      color="success"
                      size="small"
                      startIcon={<CheckCircle />}
                      onClick={() => handleMarkAsRead(notification._id)}
                      sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                        borderColor: '#22c55e',
                        color: '#22c55e',
                        '&:hover': {
                          borderColor: '#16a34a',
                          backgroundColor: '#f0fdf4'
                        }
                      }}
                    >
                      Mark as Read
                    </Button>
                  </Box>
                </Box>
              ))}
              
              {unreadNotifications.length > 3 && (
                <Button
                  variant="outlined"
                  color="warning"
                  fullWidth
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    borderColor: '#f59e0b',
                    color: '#92400e',
                    '&:hover': {
                      borderColor: '#d97706',
                      backgroundColor: '#fef3c7'
                    }
                  }}
                >
                  View All Alerts ({unreadNotifications.length})
                </Button>
              )}
            </CardContent>
          </Card>
        )}


        <Grid container spacing={window.innerWidth <= 768 ? 2 : 3} sx={{ 
          maxWidth: { xs: '100%', sm: 600 }, 
          mx: 'auto',
          px: { xs: 2, sm: 0 }
        }}>
          {/* Daily Check-In Card - Only for Package 2+ */}
          {user?.package && user.package !== 'package1' && (
            <Grid item xs={12}>
              <Card 
                sx={{ 
                  borderRadius: 3,
                  boxShadow: '0 4px 20px rgba(59, 130, 246, 0.15)',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 30px rgba(59, 130, 246, 0.25)',
                  }
                }}
                onClick={handleCheckInClick}
              >
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <Box sx={{ mb: 2 }}>
                    <Favorite sx={{ fontSize: 48, opacity: 0.9 }} />
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    Daily Check-In
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Recovery Exercises Card - Only for Package 2+ */}
          {user?.package && user.package !== 'package1' && (
            <Grid item xs={12}>
              <Card 
                sx={{ 
                  borderRadius: 3,
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
                  }
                }}
                onClick={handleRehabPlanClick}
              >
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <Box sx={{ mb: 2 }}>
                    <PlayArrow sx={{ fontSize: 48, color: '#1e293b' }} />
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 600, color: '#1e293b' }}>
                    Recovery Exercises
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Work Readiness Card */}
          <Grid item xs={12}>
            <Card 
              sx={{ 
                borderRadius: 3,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                backgroundColor: hasSubmittedToday ? '#f0f9ff' : 'white',
                cursor: hasSubmittedToday ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                opacity: hasSubmittedToday ? 0.7 : 1,
                '&:hover': hasSubmittedToday ? {} : {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
                }
              }}
              onClick={hasSubmittedToday ? undefined : handleWorkReadinessClick}
            >
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Box sx={{ mb: 2 }}>
                  {hasSubmittedToday ? (
                    <CheckCircle sx={{ fontSize: 48, color: '#10b981' }} />
                  ) : (
                    <Work sx={{ fontSize: 48, color: '#1e293b' }} />
                  )}
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 600, color: hasSubmittedToday ? '#10b981' : '#1e293b' }}>
                  {hasSubmittedToday ? 'Already Submitted Today' : 'Work Readiness'}
                </Typography>
                {hasSubmittedToday && todaySubmission && (
                  <Typography variant="body2" sx={{ color: '#6b7280', mt: 1 }}>
                    Submitted at {new Date(todaySubmission.submittedAt).toLocaleTimeString()}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Report Incident Card */}
          <Grid item xs={12}>
            <Card 
              sx={{ 
                borderRadius: 3,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                backgroundColor: 'white',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
                }
              }}
              onClick={() => {/* Navigate to incident reporting */}}
            >
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Box sx={{ mb: 2 }}>
                  <Warning sx={{ fontSize: 48, color: '#1e293b' }} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 600, color: '#1e293b' }}>
                  Report Incident
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Work Readiness Modal */}
        {showWorkReadinessModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: window.innerWidth <= 768 ? '0' : '1rem'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: window.innerWidth <= 768 ? '0' : '1rem',
              padding: window.innerWidth <= 768 ? '1rem' : '2rem',
              maxWidth: '600px',
              width: '100%',
              height: window.innerWidth <= 768 ? '100vh' : 'auto',
              maxHeight: window.innerWidth <= 768 ? '100vh' : '90vh',
              overflowY: 'auto',
              boxShadow: window.innerWidth <= 768 ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: window.innerWidth <= 768 ? '1rem' : '1.5rem',
                paddingBottom: window.innerWidth <= 768 ? '0.75rem' : '1rem',
                borderBottom: '1px solid #e5e7eb',
                position: 'sticky',
                top: 0,
                backgroundColor: 'white',
                zIndex: 10
              }}>
                <div style={{
                  backgroundColor: '#3b82f6',
                  borderRadius: window.innerWidth <= 768 ? '0.5rem' : '0.75rem',
                  padding: window.innerWidth <= 768 ? '0.5rem' : '0.75rem',
                  marginRight: window.innerWidth <= 768 ? '0.75rem' : '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Work sx={{ fontSize: window.innerWidth <= 768 ? 20 : 24, color: 'white' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <h2 style={{
                    fontSize: window.innerWidth <= 768 ? '1.25rem' : '1.5rem',
                    fontWeight: 'bold',
                    color: '#111827',
                    margin: 0,
                    lineHeight: 1.2
                  }}>
                    Work Readiness Assessment
                  </h2>
                  <p style={{
                    fontSize: window.innerWidth <= 768 ? '0.75rem' : '0.875rem',
                    color: '#6b7280',
                    margin: 0,
                    marginTop: '0.25rem'
                  }}>
                    Help us understand your current work readiness
                  </p>
                </div>
                <button
                  onClick={() => setShowWorkReadinessModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    color: '#6b7280',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    borderRadius: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ×
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleWorkReadinessSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Fatigue Level */}
                <div style={{ marginBottom: window.innerWidth <= 768 ? '1.25rem' : '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: window.innerWidth <= 768 ? '1rem' : '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: window.innerWidth <= 768 ? '0.75rem' : '0.5rem',
                    textAlign: 'center'
                  }}>
                    Fatigue Level *
                  </label>
                  
                  {/* Range Slider Container */}
                  <div style={{
                    padding: '1.5rem 1rem',
                    backgroundColor: '#f8fafc',
                    borderRadius: '1rem',
                    border: '1px solid #e2e8f0'
                  }}>
                    {/* Slider Track */}
                    <div 
                      data-slider-track
                      style={{
                        position: 'relative',
                        height: '6px',
                        backgroundColor: '#e2e8f0',
                        borderRadius: '3px',
                        marginBottom: '2rem',
                        cursor: 'pointer'
                      }}
                      onClick={handleSliderClick}
                    >
                      {/* Active Range */}
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: '0%',
                        right: '0%',
                        height: '100%',
                        backgroundColor: workReadinessForm.fatigueLevel ? 
                          (parseInt(workReadinessForm.fatigueLevel) === 1 ? '#dcfce7' :
                           parseInt(workReadinessForm.fatigueLevel) === 2 ? '#bbf7d0' :
                           parseInt(workReadinessForm.fatigueLevel) === 3 ? '#fef3c7' :
                           parseInt(workReadinessForm.fatigueLevel) === 4 ? '#fed7aa' : '#fecaca') : '#e2e8f0',
                        borderRadius: '3px',
                        width: workReadinessForm.fatigueLevel ? `${(parseInt(workReadinessForm.fatigueLevel) - 1) * 25}%` : '0%',
                        transition: 'all 0.3s ease'
                      }} />
                      
                      {/* Slider Handle */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: workReadinessForm.fatigueLevel ? `${(parseInt(workReadinessForm.fatigueLevel) - 1) * 25}%` : '0%',
                          transform: 'translate(-50%, -50%)',
                          width: '24px',
                          height: '24px',
                          backgroundColor: '#3b82f6',
                          borderRadius: '50%',
                          border: '3px solid white',
                          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
                          cursor: isDragging ? 'grabbing' : 'grab',
                          transition: isDragging ? 'none' : 'all 0.3s ease',
                          zIndex: 10,
                          userSelect: 'none'
                        }}
                        onMouseDown={handleSliderMouseDown}
                        onTouchStart={handleSliderTouchStart}
                        draggable={false}
                      />
                    </div>
                    
                    {/* Level Labels */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '1rem'
                    }}>
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          onClick={() => setWorkReadinessForm({ ...workReadinessForm, fatigueLevel: level.toString() })}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            cursor: 'pointer',
                            padding: '0.5rem',
                            borderRadius: '0.5rem',
                            backgroundColor: workReadinessForm.fatigueLevel === level.toString() ? '#dbeafe' : 'transparent',
                            transition: 'all 0.2s ease',
                            minWidth: '60px'
                          }}
                        >
                          <div style={{
                            fontSize: '1.5rem',
                            marginBottom: '0.25rem'
                          }}>
                            {level === 1 ? '😴' : level === 2 ? '😌' : level === 3 ? '😐' : level === 4 ? '😔' : '😫'}
                          </div>
                          <div style={{
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            color: workReadinessForm.fatigueLevel === level.toString() ? '#1e40af' : '#374151'
                          }}>
                            {level}
                          </div>
                          <div style={{
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            textAlign: 'center',
                            lineHeight: 1.2
                          }}>
                            {level === 1 ? 'Very Low' : level === 2 ? 'Low' : level === 3 ? 'Moderate' : level === 4 ? 'High' : 'Very High'}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Current Selection Display */}
                    {workReadinessForm.fatigueLevel && (
                      <div style={{
                        textAlign: 'center',
                        padding: '0.75rem',
                        backgroundColor: 'white',
                        borderRadius: '0.5rem',
                        border: '1px solid #e2e8f0',
                        marginTop: '0.5rem'
                      }}>
                        <div style={{
                          fontSize: '1.25rem',
                          fontWeight: '600',
                          color: '#1e293b',
                          marginBottom: '0.25rem'
                        }}>
                          Level {workReadinessForm.fatigueLevel} - {
                            workReadinessForm.fatigueLevel === '1' ? 'Very Low Fatigue' :
                            workReadinessForm.fatigueLevel === '2' ? 'Low Fatigue' :
                            workReadinessForm.fatigueLevel === '3' ? 'Moderate Fatigue' :
                            workReadinessForm.fatigueLevel === '4' ? 'High Fatigue' : 'Very High Fatigue'
                          }
                        </div>
                        <div style={{
                          fontSize: '0.875rem',
                          color: '#6b7280'
                        }}>
                          {workReadinessForm.fatigueLevel === '1' ? 'Feeling fresh and energetic' :
                           workReadinessForm.fatigueLevel === '2' ? 'Slightly tired but manageable' :
                           workReadinessForm.fatigueLevel === '3' ? 'Some fatigue, need rest soon' :
                           workReadinessForm.fatigueLevel === '4' ? 'Quite tired, rest recommended' : 'Extremely tired, rest required'}
                        </div>
                      </div>
                    )}
                    
                    {/* Drag Instruction */}
                    <div style={{
                      textAlign: 'center',
                      marginTop: '0.75rem',
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.25rem'
                    }}>
                      <span>👆</span>
                      <span>Click and drag the blue handle or click anywhere on the track</span>
                    </div>
                  </div>
                </div>

                {/* Pain/Discomfort */}
                <div style={{ marginBottom: window.innerWidth <= 768 ? '1.25rem' : '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: window.innerWidth <= 768 ? '1rem' : '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: window.innerWidth <= 768 ? '0.75rem' : '0.5rem'
                  }}>
                    Pain/Discomfort *
                  </label>
                  <div style={{ 
                    display: 'flex', 
                    gap: window.innerWidth <= 768 ? '0.75rem' : '1rem',
                    flexDirection: window.innerWidth <= 768 ? 'column' : 'row'
                  }}>
                    <button
                      type="button"
                      onClick={() => setWorkReadinessForm({ ...workReadinessForm, painDiscomfort: 'yes' })}
                      style={{
                        padding: window.innerWidth <= 768 ? '1rem' : '0.75rem 1.5rem',
                        border: workReadinessForm.painDiscomfort === 'yes' ? '2px solid #ef4444' : '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        backgroundColor: workReadinessForm.painDiscomfort === 'yes' ? '#fef2f2' : 'white',
                        color: workReadinessForm.painDiscomfort === 'yes' ? '#dc2626' : '#374151',
                        fontSize: window.innerWidth <= 768 ? '1rem' : '1rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        flex: 1,
                        minHeight: window.innerWidth <= 768 ? '48px' : 'auto'
                      }}
                    >
                      {window.innerWidth <= 768 ? 'Yes, I have pain' : 'Yes, I have pain/discomfort'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setWorkReadinessForm({ ...workReadinessForm, painDiscomfort: 'no' })}
                      style={{
                        padding: window.innerWidth <= 768 ? '1rem' : '0.75rem 1.5rem',
                        border: workReadinessForm.painDiscomfort === 'no' ? '2px solid #10b981' : '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        backgroundColor: workReadinessForm.painDiscomfort === 'no' ? '#f0fdf4' : 'white',
                        color: workReadinessForm.painDiscomfort === 'no' ? '#059669' : '#374151',
                        fontSize: window.innerWidth <= 768 ? '1rem' : '1rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        flex: 1,
                        minHeight: window.innerWidth <= 768 ? '48px' : 'auto'
                      }}
                    >
                      {window.innerWidth <= 768 ? 'No pain' : 'No pain/discomfort'}
                    </button>
                  </div>
                </div>

                {/* Pain Areas (if pain is yes) */}
                {workReadinessForm.painDiscomfort === 'yes' && (
                  <div style={{ marginBottom: window.innerWidth <= 768 ? '1.25rem' : '1.5rem' }}>
                    <label style={{
                      display: 'block',
                      fontSize: window.innerWidth <= 768 ? '1rem' : '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: window.innerWidth <= 768 ? '0.75rem' : '0.5rem'
                    }}>
                      Pain Areas (Select all that apply)
                    </label>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: window.innerWidth <= 768 ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(120px, 1fr))', 
                      gap: window.innerWidth <= 768 ? '0.75rem' : '0.5rem' 
                    }}>
                      {['Head', 'Neck', 'Shoulders', 'Arms', 'Back', 'Chest', 'Abdomen', 'Hips', 'Legs', 'Feet'].map((area) => (
                        <button
                          key={area}
                          type="button"
                          onClick={() => {
                            const newAreas = workReadinessForm.painAreas.includes(area)
                              ? workReadinessForm.painAreas.filter(a => a !== area)
                              : [...workReadinessForm.painAreas, area];
                            setWorkReadinessForm({ ...workReadinessForm, painAreas: newAreas });
                          }}
                          style={{
                            padding: window.innerWidth <= 768 ? '0.75rem 0.5rem' : '0.5rem',
                            border: workReadinessForm.painAreas.includes(area) ? '2px solid #ef4444' : '1px solid #d1d5db',
                            borderRadius: '0.375rem',
                            backgroundColor: workReadinessForm.painAreas.includes(area) ? '#fef2f2' : 'white',
                            color: workReadinessForm.painAreas.includes(area) ? '#dc2626' : '#374151',
                            fontSize: window.innerWidth <= 768 ? '0.875rem' : '0.875rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            textAlign: 'center',
                            minHeight: window.innerWidth <= 768 ? '44px' : 'auto'
                          }}
                        >
                          {area}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Readiness Level */}
                <div style={{ marginBottom: window.innerWidth <= 768 ? '1.25rem' : '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: window.innerWidth <= 768 ? '1rem' : '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: window.innerWidth <= 768 ? '0.75rem' : '0.5rem'
                  }}>
                    Work Readiness *
                  </label>
                  <div style={{ 
                    display: 'flex', 
                    gap: window.innerWidth <= 768 ? '0.75rem' : '0.75rem', 
                    flexWrap: 'wrap',
                    flexDirection: window.innerWidth <= 768 ? 'column' : 'row'
                  }}>
                    {[
                      { value: 'fit', label: 'Fit for Work', color: '#dcfce7', textColor: '#166534' },
                      { value: 'minor', label: 'Minor Concerns', color: '#fef3c7', textColor: '#92400e' },
                      { value: 'not_fit', label: 'Not Fit for Work', color: '#fecaca', textColor: '#dc2626' }
                    ].map((level) => (
                      <button
                        key={level.value}
                        type="button"
                        onClick={() => setWorkReadinessForm({ ...workReadinessForm, readinessLevel: level.value })}
                        style={{
                          padding: window.innerWidth <= 768 ? '1rem' : '0.75rem 1.5rem',
                          border: workReadinessForm.readinessLevel === level.value ? '2px solid #3b82f6' : '1px solid #d1d5db',
                          borderRadius: '0.5rem',
                          backgroundColor: workReadinessForm.readinessLevel === level.value ? '#dbeafe' : level.color,
                          color: workReadinessForm.readinessLevel === level.value ? '#1e40af' : level.textColor,
                          fontSize: window.innerWidth <= 768 ? '1rem' : '1rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          flex: 1,
                          minWidth: window.innerWidth <= 768 ? 'auto' : '150px',
                          minHeight: window.innerWidth <= 768 ? '48px' : 'auto'
                        }}
                      >
                        {level.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mood */}
                <div style={{ marginBottom: window.innerWidth <= 768 ? '1.25rem' : '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: window.innerWidth <= 768 ? '1rem' : '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: window.innerWidth <= 768 ? '0.75rem' : '0.5rem',
                    textAlign: 'center'
                  }}>
                    Current Mood *
                  </label>
                  
                  {/* Mood Options Container */}
                  <div style={{
                    padding: '1.5rem 1rem',
                    backgroundColor: '#f8fafc',
                    borderRadius: '1rem',
                    border: '1px solid #e2e8f0'
                  }}>
                    {/* Mood Options Grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: window.innerWidth <= 768 ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
                      gap: window.innerWidth <= 768 ? '1rem' : '0.75rem',
                      marginBottom: '1rem'
                    }}>
                      {[
                        { value: 'excellent', label: 'Excellent', emoji: '😊', color: '#dcfce7', description: 'Feeling great!' },
                        { value: 'good', label: 'Good', emoji: '😌', color: '#bbf7d0', description: 'Pretty good' },
                        { value: 'okay', label: 'Okay', emoji: '😐', color: '#fef3c7', description: 'Not bad' },
                        { value: 'poor', label: 'Poor', emoji: '😔', color: '#fed7aa', description: 'Not great' },
                        { value: 'terrible', label: 'Terrible', emoji: '😢', color: '#fecaca', description: 'Really bad' }
                      ].map((mood) => (
                        <button
                          key={mood.value}
                          type="button"
                          onClick={() => setWorkReadinessForm({ ...workReadinessForm, mood: mood.value })}
                          style={{
                            padding: window.innerWidth <= 768 ? '1rem 0.5rem' : '1rem 0.75rem',
                            border: workReadinessForm.mood === mood.value ? '2px solid #3b82f6' : '1px solid #d1d5db',
                            borderRadius: '0.75rem',
                            backgroundColor: workReadinessForm.mood === mood.value ? '#dbeafe' : mood.color,
                            color: '#374151',
                            fontSize: window.innerWidth <= 768 ? '0.875rem' : '0.875rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.25rem',
                            boxShadow: workReadinessForm.mood === mood.value ? '0 4px 12px rgba(59, 130, 246, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.1)',
                            transform: workReadinessForm.mood === mood.value ? 'scale(1.05)' : 'scale(1)',
                            minHeight: window.innerWidth <= 768 ? '80px' : '100px'
                          }}
                        >
                          <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>{mood.emoji}</div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.125rem' }}>{mood.label}</div>
                          <div style={{ fontSize: '0.75rem', opacity: 0.7, textAlign: 'center', lineHeight: 1.2 }}>{mood.description}</div>
                        </button>
                      ))}
                    </div>
                    
                    {/* Current Selection Display */}
                    {workReadinessForm.mood && (
                      <div style={{
                        textAlign: 'center',
                        padding: '0.75rem',
                        backgroundColor: 'white',
                        borderRadius: '0.5rem',
                        border: '1px solid #e2e8f0',
                        marginTop: '0.5rem'
                      }}>
                        <div style={{
                          fontSize: '1.25rem',
                          fontWeight: '600',
                          color: '#1e293b',
                          marginBottom: '0.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem'
                        }}>
                          <span style={{ fontSize: '1.5rem' }}>
                            {workReadinessForm.mood === 'excellent' ? '😊' :
                             workReadinessForm.mood === 'good' ? '😌' :
                             workReadinessForm.mood === 'okay' ? '😐' :
                             workReadinessForm.mood === 'poor' ? '😔' : '😢'}
                          </span>
                          <span>
                            {workReadinessForm.mood === 'excellent' ? 'Excellent Mood' :
                             workReadinessForm.mood === 'good' ? 'Good Mood' :
                             workReadinessForm.mood === 'okay' ? 'Okay Mood' :
                             workReadinessForm.mood === 'poor' ? 'Poor Mood' : 'Terrible Mood'}
                          </span>
                        </div>
                        <div style={{
                          fontSize: '0.875rem',
                          color: '#6b7280'
                        }}>
                          {workReadinessForm.mood === 'excellent' ? 'You are feeling great and positive!' :
                           workReadinessForm.mood === 'good' ? 'You are in a pretty good mood' :
                           workReadinessForm.mood === 'okay' ? 'Your mood is neutral, not bad' :
                           workReadinessForm.mood === 'poor' ? 'You are not feeling great today' : 'You are feeling really down today'}
                        </div>
                      </div>
                    )}
                    
                    {/* Selection Instruction */}
                    <div style={{
                      textAlign: 'center',
                      marginTop: '0.75rem',
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.25rem'
                    }}>
                      <span>👆</span>
                      <span>Click any mood to select</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div style={{ marginBottom: window.innerWidth <= 768 ? '1.5rem' : '2rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: window.innerWidth <= 768 ? '1rem' : '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: window.innerWidth <= 768 ? '0.75rem' : '0.5rem'
                  }}>
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    value={workReadinessForm.notes}
                    onChange={(e) => setWorkReadinessForm({ ...workReadinessForm, notes: e.target.value })}
                    placeholder="Any additional comments about your work readiness..."
                    style={{
                      width: '100%',
                      padding: window.innerWidth <= 768 ? '1rem' : '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: window.innerWidth <= 768 ? '1rem' : '0.875rem',
                      resize: 'vertical',
                      minHeight: window.innerWidth <= 768 ? '100px' : '80px',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                {/* Action Buttons */}
                <div style={{ 
                  display: 'flex', 
                  gap: window.innerWidth <= 768 ? '0.75rem' : '1rem', 
                  justifyContent: 'flex-end',
                  marginTop: 'auto',
                  paddingTop: window.innerWidth <= 768 ? '1rem' : '0',
                  borderTop: window.innerWidth <= 768 ? '1px solid #e5e7eb' : 'none'
                }}>
                  <button
                    type="button"
                    onClick={() => setShowWorkReadinessModal(false)}
                    style={{
                      padding: window.innerWidth <= 768 ? '1rem 1.5rem' : '0.75rem 1.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      backgroundColor: 'white',
                      color: '#374151',
                      fontSize: window.innerWidth <= 768 ? '1rem' : '1rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      flex: window.innerWidth <= 768 ? 1 : 'none',
                      minHeight: window.innerWidth <= 768 ? '48px' : 'auto'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={workReadinessLoading || !workReadinessForm.fatigueLevel || !workReadinessForm.painDiscomfort || !workReadinessForm.readinessLevel || !workReadinessForm.mood}
                    style={{
                      padding: window.innerWidth <= 768 ? '1rem 1.5rem' : '0.75rem 1.5rem',
                      border: 'none',
                      borderRadius: '0.5rem',
                      backgroundColor: workReadinessLoading ? '#9ca3af' : '#3b82f6',
                      color: 'white',
                      fontSize: window.innerWidth <= 768 ? '1rem' : '1rem',
                      fontWeight: '600',
                      cursor: workReadinessLoading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      opacity: workReadinessLoading ? 0.6 : 1,
                      flex: window.innerWidth <= 768 ? 1 : 'none',
                      minHeight: window.innerWidth <= 768 ? '48px' : 'auto'
                    }}
                  >
                    {workReadinessLoading ? 'Submitting...' : 'Submit Assessment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* SimpleCheckIn Modal */}
        {showSimpleCheckIn && (
          <SimpleCheckIn
            onSubmit={handleSimpleCheckInSubmit}
            onClose={handleCloseCheckIn}
            loading={checkInLoading}
            success={checkInSuccess}
            error={checkInError}
          />
        )}
      </Box>
    </LayoutWithSidebar>
  );
});

WorkerDashboard.displayName = 'WorkerDashboard';

export default WorkerDashboard;
