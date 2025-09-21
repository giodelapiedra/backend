import React, { useState, useEffect } from 'react';
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
  isRead: boolean;
}

interface DashboardStats {
  totalCheckIns: number;
  completedTasks: number;
  upcomingAppointments: number;
  unreadNotifications: number;
}

const WorkerDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [rehabPlans, setRehabPlans] = useState<RehabPlan[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [preventiveTasks, setPreventiveTasks] = useState<PreventiveTask[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
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

  useEffect(() => {
    if (showSimpleCheckIn && cases.length === 1 && !selectedCase) {
      setSelectedCase(cases[0]);
    }
  }, [showSimpleCheckIn, cases, selectedCase]);

  const fetchWorkerData = async () => {
    try {
      setLoading(true);
      const [checkInsRes, rehabPlansRes, casesRes, tasksRes, appointmentsRes, statsRes, notificationsRes] = await Promise.all([
        api.get('/check-ins'),
        api.get('/rehab-plans'),
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

      const unreadCount = notificationsRes.data.notifications?.filter((n: Notification) => !n.isRead).length || 0;
      setUnreadNotificationCount(unreadCount);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleSimpleCheckInSubmit = async (data: any) => {
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
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return '#10b981';
      case 'completed': return '#3b82f6';
      case 'pending': return '#f59e0b';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

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
        padding: { xs: 2, md: 3 }
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
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography 
            variant="h3" 
            component="h1" 
            sx={{ 
              fontWeight: 700, 
              color: '#1e293b',
              mb: 2,
              fontSize: { xs: '2rem', md: '3rem' }
            }}
          >
            Welcome Back!
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ 
              color: '#64748b',
              fontWeight: 400,
              fontSize: { xs: '1rem', md: '1.25rem' }
            }}
          >
            Let's check in on your recovery progress today
          </Typography>
        </Box>

        {/* Main Action Cards */}
        <Grid container spacing={3} sx={{ maxWidth: 600, mx: 'auto' }}>
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
              onClick={() => setShowSimpleCheckIn(true)}
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
              onClick={() => navigate('/worker/rehabilitation-plan')}
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
            onClose={() => {
              setShowSimpleCheckIn(false);
              setSelectedCase(null);
              setCheckInSuccess(false);
              setCheckInError(null);
            }}
            loading={checkInLoading}
            success={checkInSuccess}
            error={checkInError}
          />
        )}
      </Box>
    </Layout>
  );
};

export default WorkerDashboard;