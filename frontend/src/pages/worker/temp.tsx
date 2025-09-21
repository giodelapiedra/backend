import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Stepper,
  Step,
  StepLabel,
  Divider,
} from '@mui/material';
import {
  CheckCircle,
  Assignment,
  CalendarToday,
  TrendingUp,
  Warning,
  Info,
  PlayArrow,
  Pause,
  Stop,
  FitnessCenter,
  LocalHospital,
  Work,
  Add,
  Edit,
  Visibility,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/Layout';
import axios from 'axios';

interface CheckIn {
  _id: string;
  checkInDate: string;
  painLevel: {
    current: number;
    worst: number;
    average: number;
  };
  functionalStatus: {
    sleep: number;
    mood: number;
    energy: number;
    mobility: number;
    dailyActivities: number;
  };
  exerciseCompliance: {
    completed: boolean;
    exercises: Array<{
      name: string;
      completed: boolean;
      difficulty: number;
    }>;
  };
  workStatus: {
    workedToday: boolean;
    hoursWorked: number;
    painAtWork: number;
  };
  notes?: string;
}

interface RehabPlan {
  _id: string;
  planName: string;
  status: string;
  startDate: string;
  endDate?: string;
  goals: Array<{
    description: string;
    targetDate: string;
    status: string;
    progress: number;
  }>;
  exercises: Array<{
    name: string;
    description: string;
    sets: number;
    repetitions: number;
    frequency: string;
    status: string;
  }>;
  activities: Array<{
    name: string;
    description: string;
    status: string;
  }>;
}

interface Case {
  _id: string;
  caseNumber: string;
  status: string;
  priority: string;
  injuryDetails: {
    bodyPart: string;
    injuryType: string;
    severity: string;
    description: string;
  };
  workRestrictions: {
    lifting: {
      maxWeight: number;
    };
    standing: {
      maxDuration: number;
    };
    other: string;
  };
}

interface PreventiveTask {
  _id: string;
  taskName: string;
  description: string;
  dueDate: string;
  status: string;
  priority: string;
  category: string;
  assignedBy: {
    firstName: string;
    lastName: string;
  };
  completedDate?: string;
  notes?: string;
}

interface Appointment {
  _id: string;
  appointmentType: string;
  scheduledDate: string;
  duration: number;
  location: string;
  purpose: string;
  status: string;
  clinician: {
    firstName: string;
    lastName: string;
    specialty: string;
  };
  case: {
    caseNumber: string;
  };
}

interface DashboardStats {
  todayCheckIn: boolean;
  lastCheckIn: CheckIn | null;
  avgPainLevel: number;
  exerciseCompliance: number;
  totalCheckIns: number;
  streak: number;
  activePlans: number;
  completedPlans: number;
  goalCompletionRate: number;
  exerciseCompletionRate: number;
  pendingTasks: number;
  upcomingAppointments: number;
}

const WorkerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [rehabPlans, setRehabPlans] = useState<RehabPlan[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [preventiveTasks, setPreventiveTasks] = useState<PreventiveTask[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkInDialog, setCheckInDialog] = useState(false);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [checkInForm, setCheckInForm] = useState({
    painLevel: { current: 0, worst: 0, average: 0 },
    painLocation: [] as string[],
    painQuality: '',
    painTriggers: [] as string[],
    functionalStatus: { sleep: 0, mood: 0, energy: 0, mobility: 0, dailyActivities: 0 },
    medicationCompliance: { taken: false, sideEffects: [] as string[], effectiveness: 0 },
    exerciseCompliance: { completed: false, exercises: [] as any[], barriers: [] as string[], modifications: '' },
    workStatus: { workedToday: false, hoursWorked: 0, tasksPerformed: [] as string[], difficulties: [] as string[], accommodations: [] as string[], painAtWork: 0 },
    symptoms: { swelling: false, stiffness: false, weakness: false, numbness: false, tingling: false, other: '' },
    activities: { household: '', social: '', recreational: '', other: '' },
    concerns: '',
    questions: '',
    goals: '',
    notes: ''
  });

  useEffect(() => {
    fetchWorkerData();
  }, []);

  // Auto-select case when check-in dialog opens
  useEffect(() => {
    if (checkInDialog && cases.length === 1 && !selectedCase) {
      setSelectedCase(cases[0]);
    }
  }, [checkInDialog, cases, selectedCase]);

  const fetchWorkerData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [checkInsRes, rehabPlansRes, casesRes, tasksRes, appointmentsRes, statsRes] = await Promise.all([
        axios.get('/check-ins'),
        axios.get('/rehab-plans'),
        axios.get('/cases'),
        axios.get('/preventive-tasks'),
        axios.get('/appointments'),
        axios.get('/check-ins/dashboard/stats')
      ]);

      setCheckIns(checkInsRes.data.checkIns);
      setRehabPlans(rehabPlansRes.data.rehabPlans);
      setCases(casesRes.data.cases);
      setPreventiveTasks(tasksRes.data.tasks || []);
      setAppointments(appointmentsRes.data.appointments || []);
      setStats(statsRes.data);

    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckInSubmit = async () => {
    try {
      if (!selectedCase) return;

      await axios.post('/check-ins', {
        case: selectedCase._id,
        ...checkInForm
      });

      setCheckInDialog(false);
      setSelectedCase(null);
      setCheckInForm({
        painLevel: { current: 0, worst: 0, average: 0 },
        painLocation: [],
        painQuality: '',
        painTriggers: [],
        functionalStatus: { sleep: 0, mood: 0, energy: 0, mobility: 0, dailyActivities: 0 },
        medicationCompliance: { taken: false, sideEffects: [], effectiveness: 0 },
        exerciseCompliance: { completed: false, exercises: [], barriers: [], modifications: '' },
        workStatus: { workedToday: false, hoursWorked: 0, tasksPerformed: [], difficulties: [], accommodations: [], painAtWork: 0 },
        symptoms: { swelling: false, stiffness: false, weakness: false, numbness: false, tingling: false, other: '' },
        activities: { household: '', social: '', recreational: '', other: '' },
        concerns: '',
        questions: '',
        goals: '',
        notes: ''
      });
      
      fetchWorkerData(); // Refresh data
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit check-in');
    }
  };

  const getPainLevelColor = (level: number) => {
    if (level <= 3) return 'success';
    if (level <= 6) return 'warning';
    return 'error';
  };

  const getPainLevelText = (level: number) => {
    if (level <= 2) return 'Minimal';
    if (level <= 4) return 'Mild';
    if (level <= 6) return 'Moderate';
    if (level <= 8) return 'Severe';
    return 'Extreme';
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: any } = {
      'new': 'info',
      'triaged': 'warning',
      'assessed': 'primary',
      'in_rehab': 'secondary',
      'return_to_work': 'success',
      'closed': 'default',
      'active': 'success',
      'completed': 'success',
      'paused': 'warning',
      'cancelled': 'error',
    };
    return colors[status] || 'default';
  };

  if (loading) {
    return (
      <Layout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box sx={{ 
        minHeight: '100vh', 
        backgroundColor: '#f8fafc',
        padding: 3
      }}>
        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3, 
              borderRadius: 2,
              backgroundColor: '#fef2f2',
              borderColor: '#fecaca',
              color: '#dc2626'
            }} 
            onClose={() => setError('')}
          >
            {error}
          </Alert>
        )}

        {/* Header Section */}
        <Box sx={{ 
          backgroundColor: 'white', 
          borderRadius: 3, 
          padding: 3, 
          mb: 3,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h3" component="h1" sx={{ 
                fontWeight: 700, 
                color: '#1e293b',
                mb: 1
              }}>
                Welcome back, {user?.firstName}!
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Track your recovery progress and manage your rehabilitation journey
              </Typography>
            </Box>
            <Box display="flex" gap={2}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setCheckInDialog(true)}
                sx={{ 
                  backgroundColor: '#8b5cf6',
                  borderRadius: 2,
                  px: 3,
                  py: 1.5,
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: 600,
                  '&:hover': {
                    backgroundColor: '#7c3aed'
                  }
                }}
              >
                Daily Check-in
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Statistics Cards */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
          gap: 3, 
          mb: 4 
        }}>
          <Card sx={{ 
            borderRadius: 3,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: 'none',
            background: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" sx={{ 
                    color: '#dc2626', 
                    fontWeight: 600,
                    mb: 1,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Pain Level
                  </Typography>
                  <Typography variant="h3" sx={{ 
                    fontWeight: 800, 
                    color: '#dc2626',
                    lineHeight: 1
                  }}>
                    {stats?.lastCheckIn?.painLevel.current || 0}/10
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#dc2626' }}>
                    {getPainLevelText(stats?.lastCheckIn?.painLevel.current || 0)}
                  </Typography>
                </Box>
                <Box sx={{ 
                  backgroundColor: '#ef4444',
                  borderRadius: 2,
                  p: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <LocalHospital sx={{ fontSize: 28, color: 'white' }} />
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ 
            borderRadius: 3,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: 'none',
            background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" sx={{ 
                    color: '#166534', 
                    fontWeight: 600,
                    mb: 1,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Exercise Compliance
                  </Typography>
                  <Typography variant="h3" sx={{ 
                    fontWeight: 800, 
                    color: '#166534',
                    lineHeight: 1
                  }}>
                    {stats?.exerciseCompliance || 0}%
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#166534' }}>
                    Last 7 days
                  </Typography>
                </Box>
                <Box sx={{ 
                  backgroundColor: '#22c55e',
                  borderRadius: 2,
                  p: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FitnessCenter sx={{ fontSize: 28, color: 'white' }} />
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ 
            borderRadius: 3,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: 'none',
            background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" sx={{ 
                    color: '#1e40af', 
                    fontWeight: 600,
                    mb: 1,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Check-in Streak
                  </Typography>
                  <Typography variant="h3" sx={{ 
                    fontWeight: 800, 
                    color: '#1e40af',
                    lineHeight: 1
                  }}>
                    {stats?.streak || 0}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#1e40af' }}>
                    Days
                  </Typography>
                </Box>
                <Box sx={{ 
                  backgroundColor: '#3b82f6',
                  borderRadius: 2,
                  p: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <TrendingUp sx={{ fontSize: 28, color: 'white' }} />
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ 
            borderRadius: 3,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: 'none',
            background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" sx={{ 
                    color: '#7c2d12', 
                    fontWeight: 600,
                    mb: 1,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Upcoming
                  </Typography>
                  <Typography variant="h3" sx={{ 
                    fontWeight: 800, 
                    color: '#7c2d12',
                    lineHeight: 1
                  }}>
                    {stats?.upcomingAppointments || appointments.filter(a => new Date(a.scheduledDate) > new Date()).length}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#7c2d12' }}>
                    Appointments
                  </Typography>
                </Box>
                <Box sx={{ 
                  backgroundColor: '#8b5cf6',
                  borderRadius: 2,
                  p: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <CalendarToday sx={{ fontSize: 28, color: 'white' }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Daily Check-in Section */}
        <Card sx={{ 
          borderRadius: 3,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: 'none',
          mb: 4
        }}>
          <CardContent sx={{ p: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Box>
                <Typography variant="h5" sx={{ 
                  fontWeight: 700, 
                  color: '#1e293b',
                  mb: 1
                }}>
                  Daily Check-in
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Complete your daily check-in to track your progress and pain levels
                </Typography>
              </Box>
              <Box>
                {stats?.todayCheckIn ? (
                  <Chip 
                    label="Completed Today" 
                    color="success" 
                    sx={{ 
                      fontWeight: 600,
                      px: 2,
                      py: 1
                    }}
                  />
                ) : (
                  <Chip 
                    label="Pending" 
                    color="warning" 
                    sx={{ 
                      fontWeight: 600,
                      px: 2,
                      py: 1
                    }}
                  />
                )}
              </Box>
            </Box>
            
            {stats?.todayCheckIn ? (
              <Box sx={{ 
                backgroundColor: '#f0fdf4',
                borderRadius: 2,
                p: 3,
                border: '1px solid #bbf7d0'
              }}>
                <Alert severity="success" sx={{ 
                  mb: 3,
                  backgroundColor: 'transparent',
                  color: '#166534',
                  '& .MuiAlert-icon': {
                    color: '#22c55e'
                  }
                }}>
                  Great job! You've completed your check-in for today.
                </Alert>
                {stats.lastCheckIn && (
                  <Box>
                    <Typography variant="subtitle1" sx={{ 
                      fontWeight: 600, 
                      color: '#166534',
                      mb: 2
                    }}>
                      Today's Pain Level: {stats.lastCheckIn.painLevel.current}/10
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={(stats.lastCheckIn.painLevel.current / 10) * 100}
                      color={getPainLevelColor(stats.lastCheckIn.painLevel.current)}
                      sx={{ 
                        height: 12, 
                        borderRadius: 6,
                        backgroundColor: '#e5e7eb',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 6
                        }
                      }}
                    />
                    <Typography variant="caption" sx={{ 
                      color: '#166534',
                      mt: 1,
                      display: 'block'
                    }}>
                      {getPainLevelText(stats.lastCheckIn.painLevel.current)}
                    </Typography>
                  </Box>
                )}
              </Box>
            ) : (
              <Box sx={{ 
                backgroundColor: '#fef3c7',
                borderRadius: 2,
                p: 3,
                border: '1px solid #fde68a'
              }}>
                <Alert severity="warning" sx={{ 
                  mb: 3,
                  backgroundColor: 'transparent',
                  color: '#92400e',
                  '& .MuiAlert-icon': {
                    color: '#f59e0b'
                  }
                }}>
                  You haven't completed your daily check-in yet today.
                </Alert>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<Add />}
                  onClick={() => setCheckInDialog(true)}
                  sx={{ 
                    backgroundColor: '#8b5cf6',
                    borderRadius: 2,
                    py: 1.5,
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 600,
                    '&:hover': {
                      backgroundColor: '#7c3aed'
                    }
                  }}
                >
                  Start Daily Check-in
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Check-in Dialog */}
        <Dialog 
          open={checkInDialog} 
          onClose={() => setCheckInDialog(false)} 
          maxWidth="md" 
          fullWidth
        >
          <DialogTitle>
            Daily Check-in
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1">
              Complete your daily check-in form here.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCheckInDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCheckInSubmit} variant="contained">
              Submit
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
};

export default WorkerDashboard;
