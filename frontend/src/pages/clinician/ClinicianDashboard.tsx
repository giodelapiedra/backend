import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Grid,
} from '@mui/material';
import {
  CheckCircle,
  Warning,
  FitnessCenter,
  LocalHospital,
  Work,
  Add,
  Edit,
  Visibility,
  Assessment,
  Schedule,
  People,
  Timeline,
  MedicalServices,
  DirectionsRun,
  Refresh,
  Assignment,
  TrendingUp,
  PhotoCamera,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import api from '../../utils/api';
import { createImageProps } from '../../utils/imageUtils';

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
    instructions: string;
    duration: number;
    frequency: string;
    difficulty: string;
    status: string;
  }>;
  activities: Array<{
    name: string;
    description: string;
    type: string;
    status: string;
  }>;
  case: {
    _id: string;
    caseNumber: string;
    status: string;
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
  notes?: string;
  progressStats?: {
    totalDays: number;
    completedDays: number;
    skippedDays: number;
    consecutiveCompletedDays: number;
    consecutiveSkippedDays: number;
  };
}

interface ProgressData {
  plan: RehabPlan;
  today: {
    exercises: Array<{
      _id: string;
      name: string;
      description: string;
      duration: number;
      category: string;
      difficulty: string;
      completion: {
        status: 'completed' | 'skipped' | 'not_started';
        completedAt?: string;
        skippedReason?: string;
        skippedNotes?: string;
      };
    }>;
    completion: any;
    overallStatus: string;
  };
  progressStats: {
    totalDays: number;
    completedDays: number;
    skippedDays: number;
    consecutiveCompletedDays: number;
    consecutiveSkippedDays: number;
  };
  last7Days: Array<{
    date: string;
    completedExercises: number;
    skippedExercises: number;
    totalExercises: number;
    overallStatus: string;
    exercises: any[];
  }>;
  exerciseProgress: Array<{
    _id: string;
    name: string;
    description: string;
    duration: number;
    category: string;
    difficulty: string;
    totalDays: number;
    completedCount: number;
    skippedCount: number;
    completionRate: number;
    recentCompletions: any[];
  }>;
  alerts: Array<{
    type: string;
    message: string;
    triggeredAt: string;
    isRead: boolean;
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
  worker: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  clinician?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  expectedReturnDate?: string;
  incident?: {
    incidentNumber: string;
    incidentDate: string;
    description: string;
    severity: string;
    incidentType: string;
    photos?: Array<{
      url: string;
      caption: string;
      uploadedAt: string;
    }>;
  };
}

interface DashboardStats {
  activePlans: number;
  completedPlans: number;
  totalGoals: number;
  completedGoals: number;
  goalCompletionRate: number;
  totalExercises: number;
  completedExercises: number;
  exerciseCompletionRate: number;
  activeCases: number;
  upcomingAppointments: number;
}

const ClinicianDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rehabPlans, setRehabPlans] = useState<RehabPlan[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  // Memoized calculations for better performance
  const activeRehabPlans = useMemo(() => 
    rehabPlans.filter(plan => plan.status === 'active'), 
    [rehabPlans]
  );

  const myCases = useMemo(() => 
    cases.filter(c => c.clinician?._id === user?.id), 
    [cases, user?.id]
  );

  const recentPlans = useMemo(() => 
    rehabPlans.slice(0, 3), 
    [rehabPlans]
  );
  const [selectedPlan, setSelectedPlan] = useState<RehabPlan | null>(null);
  const [planDialog, setPlanDialog] = useState(false);
  const [assessmentDialog, setAssessmentDialog] = useState(false);
  const [appointmentDialog, setAppointmentDialog] = useState(false);
  const [progressDialog, setProgressDialog] = useState(false);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [isSchedulingAssessment, setIsSchedulingAssessment] = useState(false);
  const [isBookingAppointment, setIsBookingAppointment] = useState(false);
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [lastProgressHash, setLastProgressHash] = useState<string>('');
  const [hasNewData, setHasNewData] = useState(false);
  
  // Case detail viewing
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [caseDetailDialog, setCaseDetailDialog] = useState(false);
  
  // Handle case detail viewing
  const handleViewCaseDetails = async (caseId: string) => {
    try {
      console.log('🔍 Fetching case details for ID:', caseId);
      const response = await api.get(`/cases/${caseId}`);
      console.log('✅ Case details response:', response.data);
      console.log('📋 Incident data:', response.data.case.incident);
      console.log('📸 Photos data:', response.data.case.incident?.photos);
      setSelectedCase(response.data.case);
      setCaseDetailDialog(true);
      console.log('📋 Case detail dialog opened');
    } catch (error) {
      console.error('❌ Error fetching case details:', error);
    }
  };

  // Debug dialog state changes
  useEffect(() => {
    console.log('🔍 Dialog state changed - open:', caseDetailDialog, 'selectedCase:', selectedCase);
    if (selectedCase) {
      console.log('🔍 Selected case incident:', selectedCase.incident);
      console.log('🔍 Incident photos:', selectedCase.incident?.photos);
    }
  }, [caseDetailDialog, selectedCase]);
  
  // Form states
  const [planForm, setPlanForm] = useState({
    case: '',
    planName: '',
    startDate: '',
    endDate: '',
    goals: [{ description: '', targetDate: '', progress: 0 }],
    exercises: [{ name: '', description: '', instructions: '', duration: 30, frequency: 'Daily', difficulty: 'beginner' }],
    notes: ''
  });
  
  const [assessmentForm, setAssessmentForm] = useState({
    case: '',
    assessmentType: 'initial',
    scheduledDate: '',
    notes: ''
  });
  
  const [appointmentForm, setAppointmentForm] = useState({
    case: '',
    worker: '',
    appointmentType: 'assessment',
    scheduledDate: '',
    duration: 60,
    location: 'clinic',
    purpose: ''
  });

  // Function to generate a simple hash of progress data for change detection
  const generateProgressHash = (plans: RehabPlan[]) => {
    return plans
      .filter(plan => plan.status === 'active')
      .map(plan => {
        const stats = plan.progressStats || {
          totalDays: 0,
          completedDays: 0,
          skippedDays: 0,
          consecutiveCompletedDays: 0,
          consecutiveSkippedDays: 0
        };
        return `${plan._id}-${stats.completedDays}-${stats.skippedDays}-${stats.consecutiveCompletedDays}`;
      })
      .join('|');
  };

  // Smart refresh function that only updates if data has changed
  const smartRefresh = async () => {
    try {
      const [rehabPlansRes] = await Promise.all([
        api.get('/rehabilitation-plans')
      ]);

      const plans = rehabPlansRes.data.plans || [];
      const newHash = generateProgressHash(plans);
      
      // Only update if the hash has changed (meaning there's new data)
      if (newHash !== lastProgressHash) {
        console.log('Progress data changed, updating...');
        setHasNewData(true);
        
        // Fetch progress stats for each active plan
        const plansWithProgress = await Promise.all(
          plans.map(async (plan: any) => {
            try {
              if (plan.status === 'active') {
                const progressRes = await api.get(`/rehabilitation-plans/${plan._id}/progress`);
                return {
                  ...plan,
                  progressStats: progressRes.data.progressStats || plan.progressStats
                };
              }
              return plan;
            } catch (err) {
              return {
                ...plan,
                progressStats: plan.progressStats || {
                  totalDays: 0,
                  completedDays: 0,
                  skippedDays: 0,
                  consecutiveCompletedDays: 0,
                  consecutiveSkippedDays: 0
                }
              };
            }
          })
        );
        
        setRehabPlans(plansWithProgress);
        setLastProgressHash(newHash);
        setLastUpdated(new Date());
        
        // Clear the new data indicator after 3 seconds
        setTimeout(() => setHasNewData(false), 3000);
      }
    } catch (err) {
      console.log('Smart refresh failed:', err);
    }
  };

  useEffect(() => {
    fetchClinicianData();
    
    // Smart refresh every 60 seconds - only updates if there are actual changes
    const interval = setInterval(() => {
      smartRefresh();
    }, 60000);
    
    return () => clearInterval(interval);
  }, [lastProgressHash]);

  const fetchProgressData = async (planId: string) => {
    try {
      setLoadingProgress(true);
      const response = await api.get(`/rehabilitation-plans/${planId}/progress`);
      setProgressData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch progress data');
    } finally {
      setLoadingProgress(false);
    }
  };

  const handleViewProgress = (plan: RehabPlan) => {
    setSelectedPlan(plan);
    setProgressDialog(true);
    fetchProgressData(plan._id);
  };

  const fetchClinicianData = async () => {
    try {
      setLoading(true);
      
      // Fetch essential data first (reduced API calls)
      const [rehabPlansRes, casesRes] = await Promise.all([
        api.get('/rehabilitation-plans'),
        api.get('/cases')
      ]);

      const plans = rehabPlansRes.data.plans || [];
      const cases = casesRes.data.cases || [];
      
      // Ensure progress stats are included for each plan
      const plansWithProgress = await Promise.all(
        plans.map(async (plan: any) => {
          try {
            // Fetch progress stats for each active plan
            if (plan.status === 'active') {
              const progressRes = await api.get(`/rehabilitation-plans/${plan._id}/progress`);
              return {
                ...plan,
                progressStats: progressRes.data.progressStats || plan.progressStats
              };
            }
            return plan;
          } catch (err) {
            // If progress fetch fails, use existing stats or default
            return {
              ...plan,
              progressStats: plan.progressStats || {
                totalDays: 0,
                completedDays: 0,
                skippedDays: 0,
                consecutiveCompletedDays: 0,
                consecutiveSkippedDays: 0
              }
            };
          }
        })
      );
      
      setRehabPlans(plansWithProgress);
      setCases(cases);
      setLastUpdated(new Date());
      
      // Set initial hash for change detection
      const initialHash = generateProgressHash(plansWithProgress);
      setLastProgressHash(initialHash);
      
      // Calculate stats from fetched data (no separate API call needed)
      const activePlans = plansWithProgress.filter((plan: any) => plan.status === 'active');
      const completedPlans = plans.filter((plan: any) => plan.status === 'completed');
      
      const totalGoals = activePlans.reduce((sum: number, plan: any) => sum + (plan.goals?.length || 0), 0);
      const completedGoals = activePlans.reduce((sum: number, plan: any) => 
        sum + (plan.goals?.filter((goal: any) => goal.status === 'completed').length || 0), 0
      );
      
      const totalExercises = activePlans.reduce((sum: number, plan: any) => sum + (plan.exercises?.length || 0), 0);
      const completedExercises = activePlans.reduce((sum: number, plan: any) => 
        sum + (plan.exercises?.filter((exercise: any) => exercise.status === 'completed').length || 0), 0
      );
      
      const activeCases = cases.filter((c: Case) => 
        c.status && ['new', 'triaged', 'assessed', 'in_rehab'].includes(c.status)
      ).length;
      
      setStats({
        activePlans: activePlans.length,
        completedPlans: completedPlans.length,
        totalGoals,
        completedGoals,
        goalCompletionRate: totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0,
        totalExercises,
        completedExercises,
        exerciseCompletionRate: totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0,
        activeCases,
        upcomingAppointments: 0
      });
      
      // Fetch notifications separately (non-blocking)
      api.get('/notifications')
        .then(notificationsRes => {
          setNotifications(notificationsRes.data.notifications || []);
          setUnreadNotificationCount(notificationsRes.data.unreadCount || 0);
        })
        .catch(err => console.warn('Failed to fetch notifications:', err));
      

    } catch (err: any) {
      console.error('Error fetching clinician data:', err);
      setError(err.response?.data?.message || 'Failed to fetch data');
      // Set empty arrays as fallback
      setRehabPlans([]);
      setCases([]);
      setStats({
        activePlans: 0,
        completedPlans: 0,
        totalGoals: 0,
        completedGoals: 0,
        goalCompletionRate: 0,
        totalExercises: 0,
        completedExercises: 0,
        exerciseCompletionRate: 0,
        activeCases: 0,
        upcomingAppointments: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async () => {
    try {
      setIsCreatingPlan(true);
      
      // Get the selected case to get worker ID
      const caseItem = cases.find(c => c._id === planForm.case);
      if (!caseItem) {
        setError('Please select a case');
        return;
      }
      
      const planData = {
        case: planForm.case,
        worker: caseItem.worker._id,
        planName: planForm.planName,
        planDescription: planForm.notes || 'Daily recovery exercises and activities',
        exercises: planForm.exercises.filter(exercise => exercise.name.trim() !== '').map(exercise => ({
          name: exercise.name,
          description: exercise.description,
          duration: exercise.duration,
          category: 'other', // Default category
          difficulty: exercise.difficulty === 'beginner' ? 'easy' : 
                     exercise.difficulty === 'intermediate' ? 'medium' : 'hard',
          instructions: exercise.instructions
        })),
        settings: {
          autoGenerateDaily: true,
          reminderTime: "09:00",
          allowSkipping: true,
          maxConsecutiveSkips: 2,
          progressMilestoneDays: 5
        }
      };

      await api.post('/rehabilitation-plans', planData);
      
      setPlanDialog(false);
      setPlanForm({
        case: '',
        planName: '',
        startDate: '',
        endDate: '',
        goals: [{ description: '', targetDate: '', progress: 0 }],
        exercises: [{ name: '', description: '', instructions: '', duration: 30, frequency: 'Daily', difficulty: 'beginner' }],
        notes: ''
      });
      
      fetchClinicianData(); // Refresh data
      
      // Get case details for the success message
      const workerName = `${caseItem.worker.firstName} ${caseItem.worker.lastName}`;
      const caseNumber = caseItem.caseNumber;
      
      setSuccessMessage(`Rehabilitation plan "${planForm.planName}" created successfully for ${workerName} (Case ${caseNumber})! The worker will receive daily check-in reminders to track their progress with the exercises.`);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create rehabilitation plan');
    } finally {
      setIsCreatingPlan(false);
    }
  };

  const handleScheduleAssessment = async () => {
    try {
      setIsSchedulingAssessment(true);
      
      const assessmentData = {
        case: assessmentForm.case,
        assessmentType: assessmentForm.assessmentType,
        scheduledDate: assessmentForm.scheduledDate,
        notes: assessmentForm.notes
      };

      await api.post('/assessments', assessmentData);
      
      setAssessmentDialog(false);
      setAssessmentForm({
        case: '',
        assessmentType: 'initial',
        scheduledDate: '',
        notes: ''
      });
      
      fetchClinicianData(); // Refresh data
      
      // Get case details for the success message
      const caseItem = cases.find(c => c._id === assessmentForm.case);
      const workerName = caseItem ? `${caseItem.worker.firstName} ${caseItem.worker.lastName}` : 'worker';
      const caseNumber = caseItem?.caseNumber || '';
      const assessmentType = assessmentForm.assessmentType.replace('_', ' ');
      
      setSuccessMessage(`${assessmentType.charAt(0).toUpperCase() + assessmentType.slice(1)} assessment scheduled successfully for ${workerName} (Case ${caseNumber})! The worker will be notified about the upcoming assessment.`);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to schedule assessment');
    } finally {
      setIsSchedulingAssessment(false);
    }
  };

  const handleBookAppointment = async () => {
    try {
      setIsBookingAppointment(true);
      
      const appointmentData = {
        case: appointmentForm.case,
        worker: appointmentForm.worker,
        appointmentType: appointmentForm.appointmentType,
        scheduledDate: appointmentForm.scheduledDate,
        duration: appointmentForm.duration,
        location: appointmentForm.location,
        purpose: appointmentForm.purpose
      };

      await api.post('/appointments', appointmentData);
      
      setAppointmentDialog(false);
      setAppointmentForm({
        case: '',
        worker: '',
        appointmentType: 'assessment',
        scheduledDate: '',
        duration: 60,
        location: 'clinic',
        purpose: ''
      });
      
      fetchClinicianData(); // Refresh data
      
      // Get case details for the success message
      const caseItem = cases.find(c => c._id === appointmentForm.case);
      const workerName = caseItem ? `${caseItem.worker.firstName} ${caseItem.worker.lastName}` : 'worker';
      const caseNumber = caseItem?.caseNumber || '';
      const appointmentType = appointmentForm.appointmentType.replace('_', ' ');
      const appointmentDate = new Date(appointmentForm.scheduledDate).toLocaleString();
      const appointmentLocation = appointmentForm.location === 'telehealth' ? 'via telehealth' : `at ${appointmentForm.location}`;
      
      setSuccessMessage(`${appointmentType.charAt(0).toUpperCase() + appointmentType.slice(1)} appointment booked successfully for ${workerName} (Case ${caseNumber}) on ${appointmentDate} ${appointmentLocation}! The worker will be notified about the appointment.`);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to book appointment');
    } finally {
      setIsBookingAppointment(false);
    }
  };

  const addGoal = () => {
    setPlanForm({
      ...planForm,
      goals: [...planForm.goals, { description: '', targetDate: '', progress: 0 }]
    });
  };

  const addExercise = () => {
    setPlanForm({
      ...planForm,
      exercises: [...planForm.exercises, { name: '', description: '', instructions: '', duration: 30, frequency: 'Daily', difficulty: 'beginner' }]
    });
  };

  const updateGoal = (index: number, field: string, value: any) => {
    const updatedGoals = [...planForm.goals];
    updatedGoals[index] = { ...updatedGoals[index], [field]: value };
    setPlanForm({ ...planForm, goals: updatedGoals });
  };

  const updateExercise = (index: number, field: string, value: any) => {
    const updatedExercises = [...planForm.exercises];
    updatedExercises[index] = { ...updatedExercises[index], [field]: value };
    setPlanForm({ ...planForm, exercises: updatedExercises });
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: any } = {
      'active': 'success',
      'completed': 'success',
      'paused': 'warning',
      'cancelled': 'error',
      'new': 'info',
      'triaged': 'warning',
      'assessed': 'primary',
      'in_rehab': 'secondary',
      'return_to_work': 'success',
      'closed': 'default',
    };
    return colors[status] || 'default';
  };

  const getPriorityColor = (priority: string) => {
    const colors: { [key: string]: any } = {
      'urgent': 'error',
      'high': 'warning',
      'medium': 'info',
      'low': 'success',
    };
    return colors[priority] || 'default';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'TBD';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'TBD';
    }
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
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        minHeight: '100vh',
        p: { xs: 2, md: 3 }
      }}>
        {/* Header Section */}
        <Box sx={{ mb: { xs: 3, md: 4 } }}>
          <Typography variant="h4" component="h1" sx={{ 
            fontWeight: 700, 
            color: '#2d3748',
            mb: 1,
            fontSize: { xs: '1.5rem', md: '2.125rem' }
          }}>
            Welcome back, Dr. {user?.lastName}
          </Typography>
          <Typography variant="subtitle1" sx={{ 
            color: '#718096',
            fontSize: { xs: '0.875rem', md: '1.1rem' }
          }}>
            Monitor your workers' rehabilitation progress and manage their recovery journey
          </Typography>
        </Box>

        {/* Error and Success Messages */}
        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3,
              borderRadius: 3,
              backgroundColor: '#fef2f2',
              borderColor: '#fecaca',
              color: '#dc2626',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.1)'
            }}
            onClose={() => setError('')}
          >
            {error}
          </Alert>
        )}
        
        {successMessage && (
          <Alert 
            severity="success" 
            sx={{ 
              mb: 3,
              borderRadius: 3,
              backgroundColor: '#f0fdf4',
              borderColor: '#bbf7d0',
              color: '#166534',
              boxShadow: '0 4px 12px rgba(34, 197, 94, 0.1)'
            }}
            onClose={() => setSuccessMessage('')}
          >
            {successMessage}
          </Alert>
        )}

        {/* Main Dashboard Content */}
        <Box sx={{ 
          display: 'flex', 
          gap: { xs: 2, md: 3 }, 
          mb: 4,
          flexDirection: { xs: 'column', md: 'row' }
        }}>
          {/* Active Cases Card */}
          <Card sx={{ 
            borderRadius: { xs: 3, md: 4 },
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
            flex: 1,
            minHeight: { xs: 120, md: 'auto' }
          }}>
            <CardContent sx={{ 
              p: { xs: 2, md: 3 }, 
              textAlign: 'center',
              display: 'flex',
              flexDirection: { xs: 'row', md: 'column' },
              alignItems: 'center',
              justifyContent: { xs: 'space-between', md: 'center' }
            }}>
              <Box sx={{ 
                width: { xs: 50, md: 60 }, 
                height: { xs: 50, md: 60 }, 
                borderRadius: '50%', 
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: { xs: 0, md: 'auto' },
                mb: { xs: 0, md: 2 }
              }}>
                <MedicalServices sx={{ fontSize: { xs: 24, md: 32 }, color: 'white' }} />
              </Box>
              <Box sx={{ textAlign: { xs: 'right', md: 'center' } }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, fontSize: { xs: '0.9rem', md: '1.25rem' } }}>
                  Active Cases
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, mb: 1, fontSize: { xs: '1.8rem', md: '3rem' } }}>
                  {stats?.activeCases || myCases.length}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                  Under Treatment
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Exercise Completion Card */}
          <Card sx={{ 
            borderRadius: { xs: 3, md: 4 },
            background: 'linear-gradient(135deg, #ff6b6b 0%, #ff8e8e 100%)',
            color: 'white',
            boxShadow: '0 8px 32px rgba(255, 107, 107, 0.3)',
            flex: 1,
            minHeight: { xs: 120, md: 'auto' }
          }}>
            <CardContent sx={{ 
              p: { xs: 2, md: 3 }, 
              textAlign: 'center',
              display: 'flex',
              flexDirection: { xs: 'row', md: 'column' },
              alignItems: 'center',
              justifyContent: { xs: 'space-between', md: 'center' }
            }}>
              <Box sx={{ 
                width: { xs: 50, md: 60 }, 
                height: { xs: 50, md: 60 }, 
                borderRadius: '50%', 
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: { xs: 0, md: 'auto' },
                mb: { xs: 0, md: 2 }
              }}>
                <DirectionsRun sx={{ fontSize: { xs: 24, md: 32 }, color: 'white' }} />
              </Box>
              <Box sx={{ textAlign: { xs: 'right', md: 'center' } }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, fontSize: { xs: '0.9rem', md: '1.25rem' } }}>
                  Exercise Completion
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, mb: 1, fontSize: { xs: '1.8rem', md: '3rem' } }}>
                  {stats?.exerciseCompletionRate || 0}%
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                  This Week
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Progress Tracking Cards */}
        <Box sx={{ 
          display: 'flex', 
          gap: { xs: 2, md: 3 }, 
          mb: 4,
          flexDirection: { xs: 'column', lg: 'row' }
        }}>
          {/* Rehabilitation Progress Card */}
          <Card sx={{ 
            flex: 1,
            borderRadius: { xs: 3, md: 4 },
            background: 'white',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            border: '1px solid rgba(0,0,0,0.05)'
          }}>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                mb: 2,
                flexDirection: { xs: 'column', sm: 'row' },
                textAlign: { xs: 'center', sm: 'left' }
              }}>
                <Box sx={{ 
                  width: { xs: 40, md: 50 }, 
                  height: { xs: 40, md: 50 }, 
                  borderRadius: '50%', 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: { xs: 0, sm: 2 },
                  mb: { xs: 1, sm: 0 }
                }}>
                  <FitnessCenter sx={{ fontSize: { xs: 20, md: 24 }, color: 'white' }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#2d3748', fontSize: { xs: '1rem', md: '1.25rem' } }}>
                    Rehabilitation Progress
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#718096', fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                    {stats?.completedGoals || 0} / {stats?.totalGoals || 0} goals completed
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ mb: 2 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={stats?.goalCompletionRate || 0} 
                  sx={{ 
                    height: 8, 
                    borderRadius: 4,
                    backgroundColor: '#e2e8f0',
                    '& .MuiLinearProgress-bar': {
                      background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: 4
                    }
                  }}
                />
              </Box>
              <Typography variant="body2" sx={{ color: '#718096' }}>
                Target: {stats?.goalCompletionRate || 0}% completion rate
              </Typography>
            </CardContent>
          </Card>

          {/* Exercise Compliance Card */}
          <Card sx={{ 
            flex: 1,
            borderRadius: 4,
            background: 'white',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            border: '1px solid rgba(0,0,0,0.05)'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ 
                  width: 50, 
                  height: 50, 
                  borderRadius: '50%', 
                  background: 'linear-gradient(135deg, #ff6b6b 0%, #ff8e8e 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 2
                }}>
                  <DirectionsRun sx={{ fontSize: 24, color: 'white' }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#2d3748' }}>
                    Exercise Compliance
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#718096' }}>
                    {stats?.completedExercises || 0} / {stats?.totalExercises || 0} exercises done
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ mb: 2 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={stats?.exerciseCompletionRate || 0} 
                  sx={{ 
                    height: 8, 
                    borderRadius: 4,
                    backgroundColor: '#e2e8f0',
                    '& .MuiLinearProgress-bar': {
                      background: 'linear-gradient(90deg, #ff6b6b 0%, #ff8e8e 100%)',
                      borderRadius: 4
                    }
                  }}
                />
              </Box>
              <Typography variant="body2" sx={{ color: '#718096' }}>
                Target: 80% compliance rate
              </Typography>
            </CardContent>
          </Card>

          {/* Recovery Timeline Card */}
          <Card sx={{ 
            flex: 1,
            borderRadius: 4,
            background: 'white',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            border: '1px solid rgba(0,0,0,0.05)'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ 
                  width: 50, 
                  height: 50, 
                  borderRadius: '50%', 
                  background: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 2
                }}>
                  <Timeline sx={{ fontSize: 24, color: 'white' }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#2d3748' }}>
                    Recovery Timeline
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#718096' }}>
                    Average recovery time tracking
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ mb: 2 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={75} 
                  sx={{ 
                    height: 8, 
                    borderRadius: 4,
                    backgroundColor: '#e2e8f0',
                    '& .MuiLinearProgress-bar': {
                      background: 'linear-gradient(90deg, #4ecdc4 0%, #44a08d 100%)',
                      borderRadius: 4
                    }
                  }}
                />
              </Box>
              <Typography variant="body2" sx={{ color: '#718096' }}>
                Target: 12 weeks average recovery
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {/* Notifications Section */}
        {unreadNotificationCount > 0 && (
          <Card sx={{ 
            borderRadius: 4,
            background: 'white',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            border: '1px solid rgba(0,0,0,0.05)',
            mb: 4
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Warning color="warning" sx={{ fontSize: 28 }} />
                  <Typography variant="h5" color="warning.main" sx={{ fontWeight: 700 }}>
                    Alerts ({unreadNotificationCount})
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Check-in alerts require your attention
                </Typography>
              </Box>
              
              {notifications.filter(n => !n.isRead).slice(0, 3).map((notification) => (
                <Box key={notification._id} sx={{ 
                  mb: 3, 
                  p: 3, 
                  bgcolor: notification.type === 'high_pain' ? '#fef2f2' : 
                           notification.type === 'rtw_review' ? '#fef3c7' : '#f0f9ff', 
                  borderRadius: 2,
                  border: notification.type === 'high_pain' ? '1px solid #fecaca' :
                          notification.type === 'rtw_review' ? '1px solid #fde68a' : '1px solid #bae6fd'
                }}>
                  <Box display="flex" alignItems="center" gap={2} sx={{ mb: 2 }}>
                    <Box sx={{ 
                      backgroundColor: notification.type === 'high_pain' ? '#ef4444' : 
                                      notification.type === 'rtw_review' ? '#f59e0b' : '#3b82f6',
                      borderRadius: 2,
                      p: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {notification.type === 'high_pain' ? <LocalHospital sx={{ fontSize: 20, color: 'white' }} /> :
                       notification.type === 'rtw_review' ? <Work sx={{ fontSize: 20, color: 'white' }} /> :
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
                  
                  {notification.actionUrl && (
                    <Button
                      variant="contained"
                      color={notification.type === 'high_pain' ? 'error' : 
                             notification.type === 'rtw_review' ? 'warning' : 'primary'}
                      size="small"
                      onClick={async () => {
                        try {
                          // Mark notification as read
                          await api.put(`/notifications/${notification._id}/read`);
                          // Navigate to action URL using React Router
                          navigate(notification.actionUrl || '/cases');
                        } catch (error) {
                          console.error('Error marking notification as read:', error);
                          // Still navigate even if marking as read fails
                          navigate(notification.actionUrl || '/cases');
                        }
                      }}
                      sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                        backgroundColor: notification.type === 'high_pain' ? '#ef4444' : 
                                        notification.type === 'rtw_review' ? '#f59e0b' : '#3b82f6',
                        '&:hover': {
                          backgroundColor: notification.type === 'high_pain' ? '#dc2626' : 
                                          notification.type === 'rtw_review' ? '#d97706' : '#2563eb'
                        }
                      }}
                    >
                      View Case Details
                    </Button>
                  )}
                </Box>
              ))}
              
              {notifications.filter(n => !n.isRead).length > 3 && (
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
                  View All Alerts ({notifications.filter(n => !n.isRead).length})
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Actions Section */}
        <Box sx={{ 
          display: 'flex', 
          gap: { xs: 2, md: 3 }, 
          mb: 4,
          flexDirection: { xs: 'column', lg: 'row' }
        }}>
          {/* Quick Actions Card */}
          <Card sx={{ 
            flex: 1,
            borderRadius: { xs: 3, md: 4 },
            background: 'white',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            border: '1px solid rgba(0,0,0,0.05)'
          }}>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#2d3748', mb: 3, fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
                Quick Actions
              </Typography>
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: '1fr' },
                gap: 2 
              }}>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<Assessment />}
                  onClick={() => setAssessmentDialog(true)}
                  sx={{
                    borderRadius: { xs: 2, md: 3 },
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: { xs: '0.875rem', md: '1rem' },
                    py: { xs: 1.5, md: 2 },
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                      boxShadow: '0 6px 16px rgba(102, 126, 234, 0.4)'
                    }
                  }}
                >
                  Schedule Assessment
                </Button>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<Schedule />}
                  onClick={() => setAppointmentDialog(true)}
                  sx={{
                    borderRadius: 3,
                    textTransform: 'none',
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #ff6b6b 0%, #ff8e8e 100%)',
                    boxShadow: '0 4px 12px rgba(255, 107, 107, 0.3)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #ff5252 0%, #ff7979 100%)',
                      boxShadow: '0 6px 16px rgba(255, 107, 107, 0.4)'
                    }
                  }}
                >
                  Book Appointment
                </Button>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<Add />}
                  onClick={() => setPlanDialog(true)}
                  sx={{
                    borderRadius: 3,
                    textTransform: 'none',
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
                    boxShadow: '0 4px 12px rgba(78, 205, 196, 0.3)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #45b7aa 0%, #3d8b7a 100%)',
                      boxShadow: '0 6px 16px rgba(78, 205, 196, 0.4)'
                    }
                  }}
                >
                  Create Rehab Plan
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<People />}
                  onClick={() => window.location.href = '/cases'}
                  sx={{
                    borderRadius: 3,
                    textTransform: 'none',
                    fontWeight: 600,
                    borderColor: '#e2e8f0',
                    color: '#4a5568',
                    '&:hover': {
                      borderColor: '#cbd5e0',
                      backgroundColor: '#f7fafc'
                    }
                  }}
                >
                  View All Cases
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Recent Activity Card */}
          <Card sx={{ 
            flex: 1,
            borderRadius: 4,
            background: 'white',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            border: '1px solid rgba(0,0,0,0.05)'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#2d3748', mb: 3 }}>
                Recent Activity
              </Typography>
              <List dense>
                {recentPlans.map((plan) => (
                  <ListItem key={plan._id} sx={{ px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <Box sx={{ 
                        width: 32, 
                        height: 32, 
                        borderRadius: '50%', 
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Timeline sx={{ fontSize: 16, color: 'white' }} />
                      </Box>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#2d3748' }}>
                          {plan.planName} updated
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" sx={{ color: '#718096' }}>
                          Case {plan.case.caseNumber}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
                {rehabPlans.length === 0 && (
                  <ListItem sx={{ px: 0 }}>
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ color: '#718096', textAlign: 'center' }}>
                          No recent activity
                        </Typography>
                      }
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Box>

        {/* Active Rehabilitation Plans */}
        <Card sx={{ 
          borderRadius: { xs: 3, md: 4 },
          background: 'white',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          border: '1px solid rgba(0,0,0,0.05)',
          mb: 4
        }}>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: { xs: 'flex-start', md: 'center' },
              mb: 3,
              flexDirection: { xs: 'column', md: 'row' },
              gap: { xs: 2, md: 0 }
            }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#2d3748', fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
                  Active Rehabilitation Plans
                </Typography>
                <Typography variant="body2" sx={{ color: '#718096', fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                  Assessment → Rehab Plan → Monitor Progress → Return to Work
                </Typography>
                {lastUpdated && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" sx={{ color: '#a0aec0', fontSize: '0.7rem' }}>
                      Last updated: {lastUpdated.toLocaleTimeString()}
                    </Typography>
                    {hasNewData && (
                      <Box sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        backgroundColor: '#4caf50',
                        '@keyframes pulse': {
                          '0%': { opacity: 1 },
                          '50%': { opacity: 0.5 },
                          '100%': { opacity: 1 }
                        },
                        animation: 'pulse 1.5s infinite'
                      }} />
                    )}
                  </Box>
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title="Check for New Progress Data">
                  <IconButton
                    onClick={smartRefresh}
                    disabled={loading}
                    sx={{
                      backgroundColor: 'rgba(78, 205, 196, 0.1)',
                      '&:hover': { backgroundColor: 'rgba(78, 205, 196, 0.2)' }
                    }}
                  >
                    <Refresh sx={{ color: '#4ecdc4' }} />
                  </IconButton>
                </Tooltip>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setPlanDialog(true)}
                  sx={{
                    borderRadius: { xs: 2, md: 3 },
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: { xs: '0.875rem', md: '1rem' },
                    py: { xs: 1.5, md: 2 },
                    px: { xs: 2, md: 3 },
                    background: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
                    boxShadow: '0 4px 12px rgba(78, 205, 196, 0.3)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #45b7aa 0%, #3d8b7a 100%)',
                      boxShadow: '0 6px 16px rgba(78, 205, 196, 0.4)'
                    }
                  }}
                >
                  New Plan
                </Button>
              </Box>
            </Box>
            
                {activeRehabPlans.length > 0 ? (
                  <List>
                    {activeRehabPlans.map((plan) => (
                  <ListItem 
                    key={plan._id} 
                    sx={{ 
                      borderRadius: 3,
                      mb: 2,
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#f8fafc'
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 50 }}>
                      <Box sx={{ 
                        width: 40, 
                        height: 40, 
                        borderRadius: '50%', 
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <FitnessCenter sx={{ fontSize: 20, color: 'white' }} />
                      </Box>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={2} sx={{ mb: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#2d3748' }}>
                            {plan.planName}
                          </Typography>
                          <Chip
                            label={plan.status}
                            color={getStatusColor(plan.status)}
                            size="small"
                            sx={{ borderRadius: 2 }}
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" sx={{ color: '#4a5568', mb: 0.5 }}>
                            Case: {plan.case.caseNumber} - {plan.case.worker.firstName} {plan.case.worker.lastName}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#718096', mb: 1, display: 'block' }}>
                            Started: {formatDate(plan.startDate)} | 
                            {plan.endDate && ` Ends: ${formatDate(plan.endDate)}`}
                          </Typography>
                          
                          {/* Progress Indicators */}
                          {plan.progressStats && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  backgroundColor: '#4caf50'
                                }} />
                                <Typography variant="caption" sx={{ color: '#4caf50', fontWeight: 600 }}>
                                  {plan.progressStats.completedDays} completed
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  backgroundColor: '#ff9800'
                                }} />
                                <Typography variant="caption" sx={{ color: '#ff9800', fontWeight: 600 }}>
                                  {plan.progressStats.skippedDays} skipped
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  backgroundColor: '#2196f3'
                                }} />
                                <Typography variant="caption" sx={{ color: '#2196f3', fontWeight: 600 }}>
                                  {plan.progressStats.consecutiveCompletedDays} streak
                                </Typography>
                              </Box>
                            </Box>
                          )}
                          
                          {/* Overall Progress Bar */}
                          {plan.progressStats && plan.progressStats.totalDays > 0 && (
                            <Box sx={{ width: '100%', mb: 1 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="caption" sx={{ color: '#718096' }}>
                                  Overall Progress
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#718096', fontWeight: 600 }}>
                                  {Math.round((plan.progressStats.completedDays / plan.progressStats.totalDays) * 100)}%
                                </Typography>
                              </Box>
                              <LinearProgress
                                variant="determinate"
                                value={(plan.progressStats.completedDays / plan.progressStats.totalDays) * 100}
                                sx={{
                                  height: 6,
                                  borderRadius: 3,
                                  backgroundColor: '#e2e8f0',
                                  '& .MuiLinearProgress-bar': {
                                    borderRadius: 3,
                                    background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)'
                                  }
                                }}
                              />
                            </Box>
                          )}
                        </Box>
                      }
                    />
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="View Progress">
                        <IconButton
                          size="small"
                          onClick={() => handleViewProgress(plan)}
                          sx={{
                            backgroundColor: 'rgba(102, 126, 234, 0.1)',
                            '&:hover': { backgroundColor: 'rgba(102, 126, 234, 0.2)' }
                          }}
                        >
                          <Timeline sx={{ color: '#667eea' }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedPlan(plan);
                            setPlanDialog(true);
                          }}
                          sx={{
                            backgroundColor: 'rgba(78, 205, 196, 0.1)',
                            '&:hover': { backgroundColor: 'rgba(78, 205, 196, 0.2)' }
                          }}
                        >
                          <Visibility sx={{ color: '#4ecdc4' }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Schedule Assessment">
                        <IconButton
                          size="small"
                          onClick={() => setAssessmentDialog(true)}
                          sx={{
                            backgroundColor: 'rgba(255, 107, 107, 0.1)',
                            '&:hover': { backgroundColor: 'rgba(255, 107, 107, 0.2)' }
                          }}
                        >
                          <Assessment sx={{ color: '#ff6b6b' }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Box textAlign="center" py={4}>
                <Box sx={{ 
                  width: 80, 
                  height: 80, 
                  borderRadius: '50%', 
                  background: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e0 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2
                }}>
                  <FitnessCenter sx={{ fontSize: 40, color: '#718096' }} />
                </Box>
                <Typography variant="h6" sx={{ color: '#4a5568', mb: 1 }}>
                  No active rehabilitation plans
                </Typography>
                <Typography variant="body2" sx={{ color: '#718096', mb: 2 }}>
                  Create your first rehabilitation plan to start monitoring worker progress
                </Typography>
                <Button 
                  variant="contained" 
                  onClick={() => setPlanDialog(true)}
                  sx={{
                    borderRadius: 3,
                    textTransform: 'none',
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
                    boxShadow: '0 4px 12px rgba(78, 205, 196, 0.3)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #45b7aa 0%, #3d8b7a 100%)',
                      boxShadow: '0 6px 16px rgba(78, 205, 196, 0.4)'
                    }
                  }}
                >
                  Create First Plan
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Cases Overview */}
        <Card sx={{ 
          borderRadius: { xs: 3, md: 4 },
          background: 'white',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          border: '1px solid rgba(0,0,0,0.05)'
        }}>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#2d3748', mb: 3, fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
              My Cases
            </Typography>
            
            {myCases.length > 0 ? (
              <>
                <Box sx={{ 
                  display: { xs: 'none', md: 'block' }
                }}>
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                        <TableCell sx={{ fontWeight: 600, color: '#2d3748' }}>Case Number</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#2d3748' }}>Worker</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#2d3748' }}>Injury</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#2d3748' }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#2d3748' }}>Priority</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#2d3748' }}>Expected Return</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: '#2d3748' }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                  <TableBody>
                    {myCases.map((caseItem) => (
                      <TableRow key={caseItem._id} sx={{ '&:hover': { backgroundColor: '#f8fafc' } }}>
                        <TableCell sx={{ fontWeight: 600, color: '#2d3748' }}>{caseItem.caseNumber}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500, color: '#4a5568' }}>
                            {caseItem.worker.firstName} {caseItem.worker.lastName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: '#718096' }}>
                            {caseItem.injuryDetails.bodyPart} - {caseItem.injuryDetails.injuryType}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={caseItem.status}
                            color={getStatusColor(caseItem.status)}
                            size="small"
                            sx={{ borderRadius: 2 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={caseItem.priority}
                            color={getPriorityColor(caseItem.priority)}
                            size="small"
                            variant="outlined"
                            sx={{ borderRadius: 2 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: '#718096' }}>
                            {formatDate(caseItem.expectedReturnDate)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="View Details">
                              <IconButton 
                                size="small"
                                onClick={() => handleViewCaseDetails(caseItem._id)}
                                sx={{
                                  backgroundColor: 'rgba(78, 205, 196, 0.1)',
                                  '&:hover': { backgroundColor: 'rgba(78, 205, 196, 0.2)' }
                                }}
                              >
                                <Visibility sx={{ color: '#4ecdc4', fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit Case">
                              <IconButton 
                                size="small"
                                sx={{
                                  backgroundColor: 'rgba(102, 126, 234, 0.1)',
                                  '&:hover': { backgroundColor: 'rgba(102, 126, 234, 0.2)' }
                                }}
                              >
                                <Edit sx={{ color: '#667eea', fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              </Box>
              
              {/* Mobile Card View */}
              <Box sx={{ 
                display: { xs: 'block', md: 'none' }
              }}>
                {myCases.map((caseItem) => (
                  <Card key={caseItem._id} sx={{ 
                    mb: 2, 
                    borderRadius: 3,
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#f8fafc'
                  }}>
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#2d3748', fontSize: '1rem' }}>
                          {caseItem.caseNumber}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Chip
                            label={caseItem.status}
                            color={getStatusColor(caseItem.status)}
                            size="small"
                            sx={{ borderRadius: 2 }}
                          />
                          <Chip
                            label={caseItem.priority}
                            color={getPriorityColor(caseItem.priority)}
                            size="small"
                            variant="outlined"
                            sx={{ borderRadius: 2 }}
                          />
                        </Box>
                      </Box>
                      
                      <Typography variant="body2" sx={{ fontWeight: 500, color: '#4a5568', mb: 1 }}>
                        {caseItem.worker.firstName} {caseItem.worker.lastName}
                      </Typography>
                      
                      <Typography variant="body2" sx={{ color: '#718096', mb: 2 }}>
                        {caseItem.injuryDetails.bodyPart} - {caseItem.injuryDetails.injuryType}
                      </Typography>
                      
                      <Typography variant="caption" sx={{ color: '#718096', display: 'block', mb: 2 }}>
                        Expected Return: {formatDate(caseItem.expectedReturnDate)}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="View Details">
                          <IconButton 
                            size="small"
                            sx={{
                              backgroundColor: 'rgba(78, 205, 196, 0.1)',
                              '&:hover': { backgroundColor: 'rgba(78, 205, 196, 0.2)' }
                            }}
                          >
                            <Visibility sx={{ color: '#4ecdc4', fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Case">
                          <IconButton 
                            size="small"
                            sx={{
                              backgroundColor: 'rgba(102, 126, 234, 0.1)',
                              '&:hover': { backgroundColor: 'rgba(102, 126, 234, 0.2)' }
                            }}
                          >
                            <Edit sx={{ color: '#667eea', fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
              </>
            ) : (
              <Box textAlign="center" py={4}>
                <Box sx={{ 
                  width: 80, 
                  height: 80, 
                  borderRadius: '50%', 
                  background: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e0 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2
                }}>
                  <MedicalServices sx={{ fontSize: 40, color: '#718096' }} />
                </Box>
                <Typography variant="h6" sx={{ color: '#4a5568', mb: 1 }}>
                  No cases assigned
                </Typography>
                <Typography variant="body2" sx={{ color: '#718096' }}>
                  Contact your case manager to get cases assigned to you
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Plan Details Dialog */}
        <Dialog open={planDialog} onClose={() => setPlanDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            {selectedPlan ? 'Rehabilitation Plan Details' : 'Create New Rehabilitation Plan'}
          </DialogTitle>
          <DialogContent>
            {selectedPlan ? (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  {selectedPlan.planName}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Case: {selectedPlan.case.caseNumber} - {selectedPlan.case.worker.firstName} {selectedPlan.case.worker.lastName}
                </Typography>

                <Typography variant="h6" gutterBottom>
                  Goals Progress
                </Typography>
                {selectedPlan.goals.map((goal, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Box display="flex" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Typography variant="body2">{goal.description}</Typography>
                      <Typography variant="caption">{goal.progress}%</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={goal.progress}
                      color={goal.progress === 100 ? 'success' : 'primary'}
                    />
                    <Typography variant="caption" color="text.secondary">
                      Target: {formatDate(goal.targetDate)} | Status: {goal.status}
                    </Typography>
                  </Box>
                ))}

                <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                  Exercises
                </Typography>
                {selectedPlan.exercises.map((exercise, index) => (
                  <Box key={index} sx={{ mb: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Typography variant="subtitle2">{exercise.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {exercise.description}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {exercise.frequency} | {exercise.duration} min | {exercise.difficulty}
                    </Typography>
                    <Chip
                      label={exercise.status}
                      color={getStatusColor(exercise.status)}
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  </Box>
                ))}

                {selectedPlan.notes && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Notes
                    </Typography>
                    <Typography variant="body2">
                      {selectedPlan.notes}
                    </Typography>
                  </Box>
                )}
              </Box>
            ) : (
              <Box sx={{ mt: 2 }}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Select Case</InputLabel>
                  <Select
                    value={planForm.case}
                    onChange={(e) => setPlanForm({ ...planForm, case: e.target.value })}
                  >
                    {cases.map((caseItem) => (
                      <MenuItem key={caseItem._id} value={caseItem._id}>
                        {caseItem.caseNumber} - {caseItem.worker.firstName} {caseItem.worker.lastName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label="Plan Name"
                  value={planForm.planName}
                  onChange={(e) => setPlanForm({ ...planForm, planName: e.target.value })}
                  sx={{ mb: 2 }}
                />

                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <TextField
                    fullWidth
                    label="Start Date"
                    type="date"
                    value={planForm.startDate}
                    onChange={(e) => setPlanForm({ ...planForm, startDate: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    fullWidth
                    label="End Date"
                    type="date"
                    value={planForm.endDate}
                    onChange={(e) => setPlanForm({ ...planForm, endDate: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>

                <Typography variant="h6" gutterBottom>
                  Goals
                </Typography>
                {planForm.goals.map((goal, index) => (
                  <Box key={index} sx={{ mb: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <TextField
                      fullWidth
                      label="Goal Description"
                      value={goal.description}
                      onChange={(e) => updateGoal(index, 'description', e.target.value)}
                      sx={{ mb: 1 }}
                    />
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <TextField
                        fullWidth
                        label="Target Date"
                        type="date"
                        value={goal.targetDate}
                        onChange={(e) => updateGoal(index, 'targetDate', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
                      <TextField
                        label="Progress (%)"
                        type="number"
                        value={goal.progress}
                        onChange={(e) => updateGoal(index, 'progress', parseInt(e.target.value) || 0)}
                        inputProps={{ min: 0, max: 100 }}
                      />
                    </Box>
                  </Box>
                ))}
                <Button onClick={addGoal} startIcon={<Add />} sx={{ mb: 2 }}>
                  Add Goal
                </Button>

                <Typography variant="h6" gutterBottom>
                  Exercises
                </Typography>
                {planForm.exercises.map((exercise, index) => (
                  <Box key={index} sx={{ mb: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <TextField
                      fullWidth
                      label="Exercise Name"
                      value={exercise.name}
                      onChange={(e) => updateExercise(index, 'name', e.target.value)}
                      sx={{ mb: 1 }}
                    />
                    <TextField
                      fullWidth
                      label="Description"
                      value={exercise.description}
                      onChange={(e) => updateExercise(index, 'description', e.target.value)}
                      sx={{ mb: 1 }}
                    />
                    <TextField
                      fullWidth
                      label="Instructions"
                      value={exercise.instructions}
                      onChange={(e) => updateExercise(index, 'instructions', e.target.value)}
                      sx={{ mb: 1 }}
                    />
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <TextField
                        label="Duration (min)"
                        type="number"
                        value={exercise.duration}
                        onChange={(e) => updateExercise(index, 'duration', parseInt(e.target.value) || 30)}
                        inputProps={{ min: 1 }}
                      />
                      <FormControl sx={{ minWidth: 120 }}>
                        <InputLabel>Frequency</InputLabel>
                        <Select
                          value={exercise.frequency}
                          onChange={(e) => updateExercise(index, 'frequency', e.target.value)}
                        >
                          <MenuItem value="Daily">Daily</MenuItem>
                          <MenuItem value="3x per week">3x per week</MenuItem>
                          <MenuItem value="2x per week">2x per week</MenuItem>
                          <MenuItem value="Weekly">Weekly</MenuItem>
                        </Select>
                      </FormControl>
                      <FormControl sx={{ minWidth: 120 }}>
                        <InputLabel>Difficulty</InputLabel>
                        <Select
                          value={exercise.difficulty}
                          onChange={(e) => updateExercise(index, 'difficulty', e.target.value)}
                        >
                          <MenuItem value="beginner">Beginner</MenuItem>
                          <MenuItem value="intermediate">Intermediate</MenuItem>
                          <MenuItem value="advanced">Advanced</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                  </Box>
                ))}
                <Button onClick={addExercise} startIcon={<Add />} sx={{ mb: 2 }}>
                  Add Exercise
                </Button>

                <TextField
                  fullWidth
                  label="Notes"
                  multiline
                  rows={3}
                  value={planForm.notes}
                  onChange={(e) => setPlanForm({ ...planForm, notes: e.target.value })}
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPlanDialog(false)}>Close</Button>
            {selectedPlan ? (
              <Button variant="contained">Edit Plan</Button>
            ) : (
              <Button 
                variant="contained" 
                onClick={handleCreatePlan}
                disabled={isCreatingPlan || !planForm.case || !planForm.planName}
              >
                {isCreatingPlan ? 'Creating...' : 'Create Plan'}
              </Button>
            )}
          </DialogActions>
        </Dialog>

        {/* Assessment Dialog */}
        <Dialog open={assessmentDialog} onClose={() => setAssessmentDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>Schedule Assessment</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Select Case</InputLabel>
                <Select
                  value={assessmentForm.case}
                  onChange={(e) => setAssessmentForm({ ...assessmentForm, case: e.target.value })}
                >
                  {cases.map((caseItem) => (
                    <MenuItem key={caseItem._id} value={caseItem._id}>
                      {caseItem.caseNumber} - {caseItem.worker.firstName} {caseItem.worker.lastName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Assessment Type</InputLabel>
                <Select
                  value={assessmentForm.assessmentType}
                  onChange={(e) => setAssessmentForm({ ...assessmentForm, assessmentType: e.target.value })}
                >
                  <MenuItem value="initial">Initial Assessment</MenuItem>
                  <MenuItem value="follow_up">Follow-up Assessment</MenuItem>
                  <MenuItem value="discharge">Discharge Assessment</MenuItem>
                  <MenuItem value="return_to_work">Return to Work Assessment</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Scheduled Date"
                type="datetime-local"
                value={assessmentForm.scheduledDate}
                onChange={(e) => setAssessmentForm({ ...assessmentForm, scheduledDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={assessmentForm.notes}
                onChange={(e) => setAssessmentForm({ ...assessmentForm, notes: e.target.value })}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAssessmentDialog(false)}>Cancel</Button>
            <Button 
              variant="contained" 
              onClick={handleScheduleAssessment}
              disabled={isSchedulingAssessment || !assessmentForm.case || !assessmentForm.scheduledDate}
            >
              {isSchedulingAssessment ? 'Scheduling...' : 'Schedule Assessment'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Appointment Dialog */}
        <Dialog open={appointmentDialog} onClose={() => setAppointmentDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>Book Appointment</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Select Case</InputLabel>
                <Select
                  value={appointmentForm.case}
                  onChange={(e) => {
                    const selectedCase = cases.find(c => c._id === e.target.value);
                    setAppointmentForm({ 
                      ...appointmentForm, 
                      case: e.target.value,
                      worker: selectedCase?.worker._id || ''
                    });
                  }}
                >
                  {cases.map((caseItem) => (
                    <MenuItem key={caseItem._id} value={caseItem._id}>
                      {caseItem.caseNumber} - {caseItem.worker.firstName} {caseItem.worker.lastName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Appointment Type</InputLabel>
                <Select
                  value={appointmentForm.appointmentType}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, appointmentType: e.target.value })}
                >
                  <MenuItem value="assessment">Assessment</MenuItem>
                  <MenuItem value="treatment">Treatment</MenuItem>
                  <MenuItem value="follow_up">Follow-up</MenuItem>
                  <MenuItem value="consultation">Consultation</MenuItem>
                  <MenuItem value="telehealth">Telehealth</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Scheduled Date"
                type="datetime-local"
                value={appointmentForm.scheduledDate}
                onChange={(e) => setAppointmentForm({ ...appointmentForm, scheduledDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 2 }}
              />

              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField
                  label="Duration (minutes)"
                  type="number"
                  value={appointmentForm.duration}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, duration: parseInt(e.target.value) || 60 })}
                  inputProps={{ min: 15, max: 480 }}
                />
                <FormControl sx={{ minWidth: 120 }}>
                  <InputLabel>Location</InputLabel>
                  <Select
                    value={appointmentForm.location}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, location: e.target.value })}
                  >
                    <MenuItem value="clinic">Clinic</MenuItem>
                    <MenuItem value="telehealth">Telehealth</MenuItem>
                    <MenuItem value="workplace">Workplace</MenuItem>
                    <MenuItem value="home">Home</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <TextField
                fullWidth
                label="Purpose"
                multiline
                rows={2}
                value={appointmentForm.purpose}
                onChange={(e) => setAppointmentForm({ ...appointmentForm, purpose: e.target.value })}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAppointmentDialog(false)}>Cancel</Button>
            <Button 
              variant="contained" 
              onClick={handleBookAppointment}
              disabled={isBookingAppointment || !appointmentForm.case || !appointmentForm.scheduledDate}
            >
              {isBookingAppointment ? 'Booking...' : 'Book Appointment'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Progress Monitoring Dialog */}
        <Dialog 
          open={progressDialog} 
          onClose={() => setProgressDialog(false)} 
          maxWidth="lg" 
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Assessment />
              Progress Monitoring - {selectedPlan?.planName}
            </Box>
          </DialogTitle>
          <DialogContent>
            {loadingProgress ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : progressData ? (
              <Box sx={{ mt: 2 }}>
                {/* Plan Info */}
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Plan Information
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Worker</Typography>
                        <Typography variant="body1">
                          {progressData.plan.worker.firstName} {progressData.plan.worker.lastName}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Case</Typography>
                        <Typography variant="body1">{progressData.plan.case.caseNumber}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">Status</Typography>
                        <Chip 
                          label={progressData.plan.status} 
                          color={progressData.plan.status === 'active' ? 'success' : 'default'}
                          size="small"
                        />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>

                {/* Progress Stats */}
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Progress Statistics
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="success.main">
                          {progressData.progressStats.completedDays}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">Days Completed</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="primary.main">
                          {progressData.progressStats.consecutiveCompletedDays}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">Consecutive Days</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="warning.main">
                          {progressData.progressStats.skippedDays}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">Days Skipped</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="info.main">
                          {progressData.progressStats.totalDays}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">Total Days</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>

                {/* Today's Status */}
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Today's Exercise Status
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Chip 
                        label={progressData.today.overallStatus.toUpperCase()} 
                        color={
                          progressData.today.overallStatus === 'completed' ? 'success' :
                          progressData.today.overallStatus === 'partial' ? 'warning' :
                          progressData.today.overallStatus === 'skipped' ? 'error' : 'default'
                        }
                      />
                      <Typography variant="body2" color="text.secondary">
                        {new Date().toLocaleDateString()}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {progressData.today.exercises.map((exercise) => (
                        <Box 
                          key={exercise._id}
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            p: 2,
                            border: '1px solid #e0e0e0',
                            borderRadius: 1
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              backgroundColor: 
                                exercise.completion.status === 'completed' ? '#4caf50' :
                                exercise.completion.status === 'skipped' ? '#ff9800' : '#e0e0e0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              {exercise.completion.status === 'completed' && (
                                <CheckCircle sx={{ color: 'white', fontSize: 16 }} />
                              )}
                              {exercise.completion.status === 'skipped' && (
                                <Warning sx={{ color: 'white', fontSize: 16 }} />
                              )}
                            </Box>
                            <Box>
                              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                {exercise.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {exercise.description}
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                              {exercise.duration} min
                            </Typography>
                            <Chip 
                              label={exercise.completion.status.toUpperCase()} 
                              color={
                                exercise.completion.status === 'completed' ? 'success' :
                                exercise.completion.status === 'skipped' ? 'warning' : 'default'
                              }
                              size="small"
                            />
                            {exercise.completion.completedAt && (
                              <Typography variant="caption" color="text.secondary">
                                {new Date(exercise.completion.completedAt).toLocaleTimeString()}
                              </Typography>
                            )}
                            {exercise.completion.skippedReason && (
                              <Typography variant="caption" color="text.secondary">
                                Reason: {exercise.completion.skippedReason}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </CardContent>
                </Card>

                {/* Last 7 Days Progress */}
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Last 7 Days Progress
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell align="center">Completed</TableCell>
                            <TableCell align="center">Skipped</TableCell>
                            <TableCell align="center">Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {progressData.last7Days.map((day) => (
                            <TableRow key={day.date}>
                              <TableCell>
                                {new Date(day.date).toLocaleDateString()}
                              </TableCell>
                              <TableCell align="center">
                                <Typography color="success.main" sx={{ fontWeight: 600 }}>
                                  {day.completedExercises}/{day.totalExercises}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Typography color="warning.main" sx={{ fontWeight: 600 }}>
                                  {day.skippedExercises}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Chip 
                                  label={day.overallStatus} 
                                  color={
                                    day.overallStatus === 'completed' ? 'success' :
                                    day.overallStatus === 'partial' ? 'warning' :
                                    day.overallStatus === 'skipped' ? 'error' : 'default'
                                  }
                                  size="small"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>

                {/* Exercise Progress */}
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Exercise Progress Details
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Exercise</TableCell>
                            <TableCell align="center">Duration</TableCell>
                            <TableCell align="center">Completed</TableCell>
                            <TableCell align="center">Skipped</TableCell>
                            <TableCell align="center">Completion Rate</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {progressData.exerciseProgress.map((exercise) => (
                            <TableRow key={exercise._id}>
                              <TableCell>
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {exercise.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {exercise.description}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell align="center">
                                {exercise.duration} min
                              </TableCell>
                              <TableCell align="center">
                                <Typography color="success.main" sx={{ fontWeight: 600 }}>
                                  {exercise.completedCount}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Typography color="warning.main" sx={{ fontWeight: 600 }}>
                                  {exercise.skippedCount}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <LinearProgress 
                                    variant="determinate" 
                                    value={exercise.completionRate} 
                                    sx={{ width: 60, height: 8 }}
                                  />
                                  <Typography variant="body2">
                                    {Math.round(exercise.completionRate)}%
                                  </Typography>
                                </Box>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>

                {/* Alerts */}
                {progressData.alerts.length > 0 && (
                  <Card sx={{ mt: 3 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Alerts & Notifications
                      </Typography>
                      {progressData.alerts.map((alert, index) => (
                        <Alert 
                          key={index}
                          severity={
                            alert.type === 'skipped_sessions' ? 'warning' :
                            alert.type === 'progress_milestone' ? 'success' : 'info'
                          }
                          sx={{ mb: 1 }}
                        >
                          <Typography variant="body2">
                            {alert.message}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(alert.triggeredAt).toLocaleString()}
                          </Typography>
                        </Alert>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </Box>
            ) : (
              <Typography>No progress data available</Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setProgressDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Case Detail Dialog */}
        <Dialog open={caseDetailDialog} onClose={() => setCaseDetailDialog(false)} maxWidth="lg" fullWidth>
          <DialogTitle>
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#1f2937' }}>
              Case Details: {selectedCase?.caseNumber}
            </Typography>
          </DialogTitle>
          <DialogContent>
            {selectedCase && (
              <Box sx={{ mt: 2 }}>
                <Grid container spacing={3}>
                  {/* Case Information */}
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                          <Assignment sx={{ mr: 1 }} />
                          Case Information
                        </Typography>
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                          <Chip 
                            label={selectedCase.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                            color={getStatusColor(selectedCase.status)}
                            size="small"
                            sx={{ mt: 0.5 }}
                          />
                        </Box>
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" color="text.secondary">Priority</Typography>
                          <Chip 
                            label={selectedCase.priority?.toUpperCase() || 'UNKNOWN'}
                            color={getPriorityColor(selectedCase.priority)}
                            size="small"
                            sx={{ mt: 0.5 }}
                          />
                        </Box>
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" color="text.secondary">Worker</Typography>
                          <Typography variant="body1">
                            {selectedCase.worker.firstName} {selectedCase.worker.lastName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {selectedCase.worker.email}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">Injury Details</Typography>
                          <Typography variant="body1">
                            {selectedCase.injuryDetails.bodyPart} - {selectedCase.injuryDetails.injuryType}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {selectedCase.injuryDetails.description}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Incident Information */}
                  {selectedCase.incident && (
                    <Grid item xs={12} md={6}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                            <Warning sx={{ mr: 1 }} />
                            Incident Information
                          </Typography>
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" color="text.secondary">Incident Number</Typography>
                            <Typography variant="body1">{selectedCase.incident.incidentNumber}</Typography>
                          </Box>
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" color="text.secondary">Incident Date</Typography>
                            <Typography variant="body1">
                              {new Date(selectedCase.incident.incidentDate).toLocaleDateString()}
                            </Typography>
                          </Box>
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" color="text.secondary">Incident Type</Typography>
                            <Typography variant="body1">{selectedCase.incident.incidentType}</Typography>
                          </Box>
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" color="text.secondary">Severity</Typography>
                            <Chip 
                              label={selectedCase.incident.severity?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                              color={getPriorityColor(selectedCase.incident.severity)}
                              size="small"
                              sx={{ mt: 0.5 }}
                            />
                          </Box>
                          <Box>
                            <Typography variant="subtitle2" color="text.secondary">Description</Typography>
                            <Typography variant="body1">{selectedCase.incident.description}</Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}
                </Grid>

                {/* Incident Photos */}
                {selectedCase.incident?.photos && selectedCase.incident.photos.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                          <PhotoCamera sx={{ mr: 1 }} />
                          Incident Photos ({selectedCase.incident.photos.length})
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                          {selectedCase.incident.photos.map((photo, index) => (
                            <Box key={index} sx={{ position: 'relative' }}>
                              <img
                                {...createImageProps(photo.url)}
                                alt={photo.caption || `Incident photo ${index + 1}`}
                                style={{
                                  width: 200,
                                  height: 200,
                                  objectFit: 'cover',
                                  borderRadius: 8,
                                  border: '2px solid #e2e8f0',
                                  cursor: 'pointer'
                                }}
                                onClick={() => window.open(createImageProps(photo.url).src, '_blank')}
                              />
                              {photo.caption && (
                                <Typography variant="caption" sx={{ 
                                  display: 'block', 
                                  mt: 0.5, 
                                  textAlign: 'center',
                                  color: 'text.secondary',
                                  fontSize: '0.7rem',
                                  maxWidth: 200
                                }}>
                                  {photo.caption}
                                </Typography>
                              )}
                            </Box>
                          ))}
                        </Box>
                      </CardContent>
                    </Card>
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCaseDetailDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
};

export default ClinicianDashboard;