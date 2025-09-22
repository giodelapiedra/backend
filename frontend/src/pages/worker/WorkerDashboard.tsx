import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Alert,
  Grid,
} from '@mui/material';
import {
  CheckCircle,
  Assignment,
  TrendingUp,
  FitnessCenter,
  LocalHospital,
  Work,
  Add,
  Visibility,
  PlayArrow,
  History,
  Assessment,
  BarChart,
  Menu,
  Favorite,
  Warning,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/Layout';
import SimpleCheckIn from '../../components/SimpleCheckIn';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

// Interfaces
interface CheckIn {
  _id: string;
  checkInDate: string;
  painLevel?: {
    current: number;
  };
}

interface RehabPlan {
  _id: string;
  planName: string;
  status: string;
}

interface Case {
  _id: string;
  caseNumber: string;
  status: string;
    description: string;
  priority: string;
}

interface PreventiveTask {
  _id: string;
  title: string;
  status: string;
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
  
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [rehabPlans, setRehabPlans] = useState<RehabPlan[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [preventiveTasks, setPreventiveTasks] = useState<PreventiveTask[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showSimpleCheckIn, setShowSimpleCheckIn] = useState(false);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState(false);
  const [checkInError, setCheckInError] = useState<string | null>(null);

  useEffect(() => {
    fetchWorkerData();
  }, []);

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

  const fetchWorkerData = useCallback(async () => {
    try {
      setLoading(true);
      const [checkInsRes, rehabPlansRes, casesRes, tasksRes, appointmentsRes, statsRes, notificationsRes] = await Promise.all([
        api.get('/check-ins'),
        api.get('/rehabilitation-plans'),
        api.get('/cases'),
        api.get('/preventive-tasks'),
        api.get('/appointments'),
        api.get('/check-ins/dashboard/stats'),
        api.get('/notifications')
      ]);

      setCheckIns(checkInsRes.data.checkIns || []);
      setRehabPlans(rehabPlansRes.data.plans || []);
      setCases(casesRes.data.cases || []);
      setPreventiveTasks(tasksRes.data.tasks || []);
      setAppointments(appointmentsRes.data.appointments || []);
      setStats(statsRes.data);
      setNotifications(notificationsRes.data.notifications || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

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

  const getStatusColor = useCallback((status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return '#10b981';
      case 'completed': return '#3b82f6';
      case 'pending': return '#f59e0b';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  }, []);

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

  const handleCloseCheckIn = useCallback(() => {
    setShowSimpleCheckIn(false);
    setSelectedCase(null);
    setCheckInSuccess(false);
    setCheckInError(null);
  }, []);

  if (loading) {
    return (
      <Layout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <Typography>Loading dashboard...</Typography>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
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
              px: { xs: 2, sm: 0 }
            }}
          >
            Let's check in on your recovery progress today
          </Typography>
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

        <Grid container spacing={3} sx={{ 
          maxWidth: { xs: '100%', sm: 600 }, 
          mx: 'auto',
          px: { xs: 2, sm: 0 }
        }}>
          {/* Daily Check-In Card */}
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

          {/* Recovery Exercises Card */}
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

          {/* Work Readiness Card */}
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
              onClick={() => {/* Navigate to work readiness */}}
            >
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Box sx={{ mb: 2 }}>
                  <Work sx={{ fontSize: 48, color: '#1e293b' }} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 600, color: '#1e293b' }}>
                  Work Readiness
                </Typography>
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
    </Layout>
  );
});

WorkerDashboard.displayName = 'WorkerDashboard';

export default WorkerDashboard;