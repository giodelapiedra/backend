import React, { useEffect, useCallback, useState } from 'react';
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
  Pagination,
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
  Close,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext.supabase';
import { dataClient } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import LayoutWithSidebar from '../../components/LayoutWithSidebar';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useGetCasesQuery, useGetClinicianCasesQuery, casesApi } from '../../store/api/casesApi';
import { useGetIncidentsQuery, incidentsApi } from '../../store/api/incidentsApi';
import { CaseAssignmentService } from '../../utils/caseAssignmentService';
import {
  setLoading,
  setError,
  setSuccessMessage,
  openDialog,
  closeDialog,
  clearMessages,
} from '../../store/slices/uiSlice';

interface RehabPlan {
  _id: string;
  planName: string;
  status: string;
  case?: {
    _id: string;
    caseNumber: string;
    status: string;
    worker: {
      firstName: string;
      lastName: string;
    };
  };
  exercises: Array<{
    name: string;
    sets: number;
    reps: number;
    completed: boolean;
  }>;
  startDate: string;
  endDate: string;
  progress: number;
}

interface Case {
  id: string;
  case_number: string;
  status: string;
  priority: string;
  clinician_id?: string;
  case_manager_id?: string;
  worker?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  case_manager?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  incident?: {
    id: string;
    incident_type: string;
    description: string;
    severity: string;
  };
  created_at: string;
  updated_at: string;
}

interface DashboardStats {
  totalCases: number;
  activeCases: number;
  completedCases: number;
  pendingAssessments: number;
  upcomingAppointments: number;
  avgCaseDuration: number;
  complianceRate: number;
  exerciseRateChange?: number;
}

const ClinicianDashboardRedux: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Redux state
  const {
    loading,
    error,
    successMessage,
    dialogs
  } = useAppSelector((state: any) => state.ui);

  // Local state
  const [rehabPlans, setRehabPlans] = useState<RehabPlan[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [hasNewData, setHasNewData] = useState(false);
  
  // Rehabilitation plan states
  const [selectedPlan, setSelectedPlan] = useState<RehabPlan | null>(null);
  const [planDialog, setPlanDialog] = useState(false);
  const [assessmentDialog, setAssessmentDialog] = useState(false);
  const [appointmentDialog, setAppointmentDialog] = useState(false);
  const [progressDialog, setProgressDialog] = useState(false);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [isSchedulingAssessment, setIsSchedulingAssessment] = useState(false);
  const [isBookingAppointment, setIsBookingAppointment] = useState(false);
  const [progressData, setProgressData] = useState<any>(null);
  const [loadingProgress, setLoadingProgress] = useState(false);
  
  // Pagination states for active rehab plans
  const [currentPage, setCurrentPage] = useState(1);
  const [plansPerPage, setPlansPerPage] = useState(5);

  // RTK Query hooks (exactly like Case Manager)
  const {
    data: clinicianCasesData,
    isLoading: casesLoading,
    error: casesError,
    refetch: refetchClinicianCases
  } = useGetClinicianCasesQuery(user?.id || '', {
    skip: !user?.id, // Skip query if no user ID
  });

  const {
    data: incidentsData,
    isLoading: incidentsLoading,
    error: incidentsError,
    refetch: refetchIncidents
  } = useGetIncidentsQuery({});

  // Derived data from RTK Query (exactly like Case Manager)
  const clinicianCases = clinicianCasesData?.cases || [];
  const totalCasesCount = clinicianCases.length;
  const incidents = incidentsData?.incidents || [];
  
  // Memoized calculations for rehabilitation plans
  const activeRehabPlans = rehabPlans.filter(plan => 
    plan.status === 'active' && 
    plan.case && 
    plan.case.status !== 'closed'
  );
  
  const recentPlans = rehabPlans.slice(0, 3);

  // Calculate stats directly from RTK Query data (like Case Manager)
  const stats: DashboardStats = {
    totalCases: totalCasesCount,
    activeCases: clinicianCases.filter((c: any) => 
      c.status && ['triaged', 'assessed', 'in_rehab'].includes(c.status)
    ).length,
    completedCases: clinicianCases.filter((c: any) => 
      c.status && ['return_to_work', 'closed'].includes(c.status)
    ).length,
    pendingAssessments: clinicianCases.filter((c: any) => c.status === 'new').length,
    upcomingAppointments: 0, // Mock data
    avgCaseDuration: 45, // Mock data
    complianceRate: 92, // Mock data
    exerciseRateChange: 5.2
  };

  // Fetch rehabilitation plans
  const fetchRehabPlans = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      // For now, rehabilitation plans are not implemented in the database
      // This is a placeholder for future implementation
      console.log('Rehabilitation plans fetching - not implemented yet');
      setRehabPlans([]);
    } catch (err) {
      console.error('Error fetching rehabilitation plans:', err);
      setRehabPlans([]);
    }
  }, [user?.id]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data: notificationsData, error: notificationsError } = await dataClient
        .from('notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (notificationsError) {
        console.error('Error fetching notifications:', notificationsError);
        return;
      }

      setNotifications(notificationsData || []);
      setUnreadNotificationCount(notificationsData?.filter(n => !n.is_read).length || 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }, [user?.id]);

  // Smart cache clear function
  const smartCacheClear = useCallback(async () => {
    try {
      console.log('🧹 SMART CACHE CLEAR TRIGGERED FOR CLINICIAN DASHBOARD');
      
      // Clear local state
      setRehabPlans([]);
      setNotifications([]);
      setUnreadNotificationCount(0);
      setHasNewData(false);
      
      // Clear RTK Query cache
      dispatch(casesApi.util.resetApiState());
      dispatch(incidentsApi.util.resetApiState());
      
      // Invalidate all tags to force refetch
      dispatch(casesApi.util.invalidateTags(['Case']));
      dispatch(incidentsApi.util.invalidateTags(['Incident']));
      
      // Clear browser cache
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.log('✅ Browser cache cleared:', cacheNames.length, 'caches');
      }
      
      // Clear localStorage cache
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.includes('rtk') || 
          key.includes('cache') || 
          key.includes('supabase') || 
          key.includes('clinician') ||
          key.includes('case') ||
          key.includes('notification') ||
          key.includes('incident') ||
          key.includes('rehab') ||
          key.includes('dashboard')
        )) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Clear sessionStorage cache
      const sessionKeysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (
          key.includes('rtk') || 
          key.includes('cache') || 
          key.includes('supabase') || 
          key.includes('clinician') ||
          key.includes('case') ||
          key.includes('notification') ||
          key.includes('incident') ||
          key.includes('rehab') ||
          key.includes('dashboard')
        )) {
          sessionKeysToRemove.push(key);
        }
      }
      sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
      
      // Show visual indicator
      dispatch(setSuccessMessage('🧹 Smart cache clear completed! Refreshing data...'));
      
      // Force refetch all data (using RTK Query like Case Manager)
      await refetchClinicianCases();
      await refetchIncidents();
      await fetchNotifications();
      await fetchRehabPlans();
      
      // Update indicators
      setHasNewData(true);
      setLastUpdated(new Date());
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        dispatch(clearMessages());
        setHasNewData(false);
      }, 3000);
      
      console.log('✅ SMART CACHE CLEAR COMPLETED SUCCESSFULLY');
    } catch (err) {
      console.error('❌ Smart cache clear failed:', err);
      dispatch(setError('Cache clear failed. Please refresh the page manually.'));
    }
  }, [dispatch, refetchClinicianCases, refetchIncidents, fetchNotifications, fetchRehabPlans]);

  // Effects
  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
      fetchRehabPlans();
    }
  }, [user?.id, fetchNotifications, fetchRehabPlans]);

  // Real-time subscription for cases - AUTOMATIC DATA REFRESH
  useEffect(() => {
    if (!user?.id) return;
    
    console.log('🔄 Setting up real-time subscription for clinician:', user.id);
    
    const subscription = dataClient
      .channel('clinician-dashboard-updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'cases',
        filter: `clinician_id=eq.${user.id}`
      }, async (payload) => {
        console.log('📡 Real-time case update received:', payload);
        if (payload.new && payload.new.clinician_id === user.id) {
          console.log('🔄 AUTOMATICALLY refreshing clinician dashboard due to case update...');
          
          // Show visual feedback
          dispatch(setSuccessMessage('🔄 Case updated! Refreshing data...'));
          
          // Clear local state
          setRehabPlans([]);
          setNotifications([]);
          setUnreadNotificationCount(0);
          setHasNewData(false);
          
          // Clear RTK Query cache
          dispatch(casesApi.util.resetApiState());
          dispatch(incidentsApi.util.resetApiState());
          
          // Invalidate all tags
          dispatch(casesApi.util.invalidateTags(['Case']));
          dispatch(incidentsApi.util.invalidateTags(['Incident']));
          
          // Force refetch all data (using RTK Query like Case Manager)
          await refetchClinicianCases();
          await refetchIncidents();
          await fetchNotifications();
          await fetchRehabPlans();
          
          // Update indicators
          setHasNewData(true);
          setLastUpdated(new Date());
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            dispatch(clearMessages());
            setHasNewData(false);
          }, 3000);
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'cases',
        filter: `clinician_id=eq.${user.id}`
      }, async (payload) => {
        console.log('📡 Real-time case assignment received:', payload);
        if (payload.new && payload.new.clinician_id === user.id) {
          console.log('🔄 AUTOMATICALLY refreshing clinician dashboard due to new case assignment...');
          
          // Show visual feedback
          dispatch(setSuccessMessage('🔄 New case assigned! Refreshing data...'));
          
          // Clear local state
          setRehabPlans([]);
          setNotifications([]);
          setUnreadNotificationCount(0);
          setHasNewData(false);
          
          // Clear RTK Query cache
          dispatch(casesApi.util.resetApiState());
          dispatch(incidentsApi.util.resetApiState());
          
          // Invalidate all tags
          dispatch(casesApi.util.invalidateTags(['Case']));
          dispatch(incidentsApi.util.invalidateTags(['Incident']));
          
          // Force refetch all data (using RTK Query like Case Manager)
          await refetchClinicianCases();
          await refetchIncidents();
          await fetchNotifications();
          await fetchRehabPlans();
          
          // Update indicators
          setHasNewData(true);
          setLastUpdated(new Date());
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            dispatch(clearMessages());
            setHasNewData(false);
          }, 3000);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${user.id}`
      }, async (payload) => {
        console.log('📡 Real-time notification update received:', payload);
        if (payload.new && payload.new.recipient_id === user.id) {
          console.log('🔄 AUTOMATICALLY refreshing notifications...');
          
          // Show visual feedback
          dispatch(setSuccessMessage('🔄 New notification! Refreshing data...'));
          
          // Clear local state
          setNotifications([]);
          setUnreadNotificationCount(0);
          setHasNewData(false);
          
          // Force refetch notifications
          await fetchNotifications();
          
          // Update indicators
          setHasNewData(true);
          setLastUpdated(new Date());
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            dispatch(clearMessages());
            setHasNewData(false);
          }, 3000);
        }
      })
      .subscribe((status) => {
        console.log('📡 Real-time subscription status:', status);
      });

    return () => {
      console.log('🧹 Cleaning up real-time subscription');
      subscription.unsubscribe();
    };
  }, [user?.id, dispatch, refetchClinicianCases, refetchIncidents, fetchNotifications, fetchRehabPlans]);

  // Global cache clear event listener - AUTOMATIC DATA REFRESH
  useEffect(() => {
    const handleGlobalCacheClear = async (event: any) => {
      console.log('🔄 CLINICIAN DASHBOARD: Global cache clear event received!');
      console.log('🔄 CLINICIAN DASHBOARD: Event detail:', event.detail);
      
      const { reason, caseId, caseNumber, clinicianId, clinicianName, clinicianEmail, timestamp } = event.detail;
      console.log('🔄 CLINICIAN DASHBOARD: Parsed details:', { 
        reason, 
        caseId, 
        caseNumber, 
        clinicianId, 
        clinicianName, 
        clinicianEmail, 
        timestamp 
      });
      console.log('🔄 CLINICIAN DASHBOARD: Current user details:', {
        id: user?.id,
        name: `${user?.firstName} ${user?.lastName}`,
        email: user?.email
      });
      console.log('🔄 CLINICIAN DASHBOARD: User ID comparison:', clinicianId === user?.id);
      console.log('🔄 CLINICIAN DASHBOARD: Reason check:', reason === 'case_assignment');
      console.log('🔄 CLINICIAN DASHBOARD: Email comparison:', clinicianEmail === user?.email);
      
      if (reason === 'case_assignment' && clinicianId === user?.id) {
        console.log('🔄 CLINICIAN DASHBOARD: ✅ Case assigned to this clinician, AUTOMATICALLY refreshing data...');
        
        // Show immediate visual feedback
        dispatch(setSuccessMessage('🔄 New case assigned! Refreshing data...'));
        
        // Clear local state to force fresh data
        setRehabPlans([]);
        setNotifications([]);
        setUnreadNotificationCount(0);
        setHasNewData(false);
        
        // Clear RTK Query cache
        dispatch(casesApi.util.resetApiState());
        dispatch(incidentsApi.util.resetApiState());
        
        // Invalidate all tags to force refetch
        dispatch(casesApi.util.invalidateTags(['Case']));
        dispatch(incidentsApi.util.invalidateTags(['Incident']));
        
        // Force refetch all data immediately (using RTK Query like Case Manager)
        console.log('🔄 CLINICIAN DASHBOARD: Starting data refetch...');
        await refetchClinicianCases();
        await refetchIncidents();
        await fetchNotifications();
        await fetchRehabPlans();
        console.log('🔄 CLINICIAN DASHBOARD: Data refetch completed');
        
        // Update indicators
        setHasNewData(true);
        setLastUpdated(new Date());
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          dispatch(clearMessages());
          setHasNewData(false);
        }, 3000);
        
        console.log('✅ CLINICIAN DASHBOARD: Automatic data refresh completed');
      } else {
        console.log('🔄 CLINICIAN DASHBOARD: ❌ Global cache clear event received but not for this clinician');
        console.log('🔄 CLINICIAN DASHBOARD: Reason:', reason, 'Expected: case_assignment');
        console.log('🔄 CLINICIAN DASHBOARD: Assigned to clinician:', {
          id: clinicianId,
          name: clinicianName,
          email: clinicianEmail
        });
        console.log('🔄 CLINICIAN DASHBOARD: Current user:', {
          id: user?.id,
          name: `${user?.firstName} ${user?.lastName}`,
          email: user?.email
        });
        console.log('🔄 CLINICIAN DASHBOARD: Case details:', {
          id: caseId,
          number: caseNumber
        });
      }
    };

    console.log('🔄 CLINICIAN DASHBOARD: Setting up global cache clear event listener');
    window.addEventListener('globalCacheClear', handleGlobalCacheClear);
    
    return () => {
      console.log('🔄 CLINICIAN DASHBOARD: Cleaning up global cache clear event listener');
      window.removeEventListener('globalCacheClear', handleGlobalCacheClear);
    };
  }, [user?.id, dispatch, refetchClinicianCases, refetchIncidents, fetchNotifications, fetchRehabPlans]);

  // Listen for refresh events when cases are assigned (exactly like Case Manager)
  useEffect(() => {
    const handleRefresh = async (event: any) => {
      console.log('🔄 CLINICIAN DASHBOARD: Received clinicianDataRefresh event:', event.detail);
      const { clinicianId, cacheCleared, triggeredBy } = event.detail;
      console.log('🔄 CLINICIAN DASHBOARD: Current user ID:', user?.id);
      console.log('🔄 CLINICIAN DASHBOARD: Event clinician ID:', clinicianId);
      
      if (clinicianId === user?.id) {
        console.log('🔄 CLINICIAN DASHBOARD: Event is for this clinician, processing...');
        console.log('Cache cleared:', cacheCleared);
        console.log('Triggered by:', triggeredBy);
        console.log('🎯 CLINICIAN DASHBOARD: Received assignment notification - refreshing data immediately!');
        
        // Clear local state to force fresh data
        setRehabPlans([]);
        setNotifications([]);
        setUnreadNotificationCount(0);
        setHasNewData(false);
        
        // Clear browser cache for clinician dashboard
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
          );
          console.log('🧹 Browser cache cleared for clinician dashboard:', cacheNames.length, 'caches');
        }
        
        // Clear localStorage cache
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('rtk') || key.includes('cache') || key.includes('supabase') || key.includes('clinician'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Clear sessionStorage cache
        const sessionKeysToRemove = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && (key.includes('rtk') || key.includes('cache') || key.includes('supabase') || key.includes('clinician'))) {
            sessionKeysToRemove.push(key);
          }
        }
        sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
        
        console.log('✅ All storage cleared, refetching clinician data...');
        // Use RTK Query refetch for immediate data update
        await refetchClinicianCases();
        console.log('✅ CLINICIAN DASHBOARD: Data refresh completed');
      } else {
        console.log('🔄 CLINICIAN DASHBOARD: Event not for this clinician, ignoring');
      }
    };

    window.addEventListener('clinicianDataRefresh', handleRefresh);
    
    return () => {
      window.removeEventListener('clinicianDataRefresh', handleRefresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Window focus listener
  useEffect(() => {
    const handleWindowFocus = () => {
      console.log('🔄 Window focused, refreshing data...');
      refetchClinicianCases();
      fetchNotifications();
      fetchRehabPlans();
    };

    window.addEventListener('focus', handleWindowFocus);
    
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [refetchClinicianCases, fetchNotifications, fetchRehabPlans]);

  // Additional fallback: Listen for any window events that might indicate data changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🔄 Page became visible, refreshing data...');
        refetchClinicianCases();
        fetchNotifications();
        fetchRehabPlans();
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && (e.key.includes('case') || e.key.includes('notification'))) {
        console.log('🔄 Storage change detected, refreshing data...');
        refetchClinicianCases();
        fetchNotifications();
        fetchRehabPlans();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [refetchClinicianCases, fetchNotifications, fetchRehabPlans]);

  // Auto-refresh every 10 seconds (more frequent for better responsiveness)
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing clinician dashboard...');
      refetchClinicianCases();
      fetchNotifications();
      fetchRehabPlans();
    }, 10000); // Changed from 30 seconds to 10 seconds

    return () => clearInterval(interval);
  }, [refetchClinicianCases, fetchNotifications, fetchRehabPlans]);

  // Handle errors
  useEffect(() => {
    if (casesError || incidentsError) {
      const errorMessage = casesError || incidentsError;
      let errorString = 'Failed to fetch data';
      
      if (typeof errorMessage === 'string') {
        errorString = errorMessage;
      } else if (errorMessage && typeof errorMessage === 'object') {
        if ('message' in errorMessage) {
          errorString = (errorMessage as any).message;
        } else if ('data' in errorMessage) {
          const data = (errorMessage as any).data;
          if (typeof data === 'string') {
            errorString = data;
          } else if (data && typeof data === 'object' && 'message' in data) {
            errorString = data.message;
          } else {
            errorString = String(data);
          }
        } else {
          errorString = errorMessage.toString();
        }
      }
      
      dispatch(setError(errorString));
    }
  }, [casesError, incidentsError, dispatch]);

  if (casesLoading || incidentsLoading) {
    return (
      <LayoutWithSidebar>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress size={60} />
        </Box>
      </LayoutWithSidebar>
    );
  }

  return (
    <LayoutWithSidebar>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 600, color: '#2d3748', mb: 1 }}>
            Clinician Dashboard
          </Typography>
          <Typography variant="body1" sx={{ color: '#718096' }}>
            Welcome back, Dr. {user?.firstName} {user?.lastName}
          </Typography>
          {lastUpdated && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <Typography variant="caption" sx={{ color: '#a0aec0' }}>
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
                    '50%': { opacity: 0.4 },
                    '100%': { opacity: 1 }
                  },
                  animation: 'pulse 1.5s infinite'
                }} />
              )}
            </Box>
          )}
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => dispatch(clearMessages())}>
            {error}
          </Alert>
        )}

        {/* Success Alert */}
        {successMessage && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => dispatch(clearMessages())}>
            {successMessage}
          </Alert>
        )}

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                      {stats.totalCases}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Total Cases
                    </Typography>
                  </Box>
                  <Assignment sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              boxShadow: '0 4px 12px rgba(240, 147, 251, 0.3)'
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                      {stats.activeCases}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Active Cases
                    </Typography>
                  </Box>
                  <LocalHospital sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white',
              boxShadow: '0 4px 12px rgba(79, 172, 254, 0.3)'
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                      {stats.pendingAssessments}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Pending Assessments
                    </Typography>
                  </Box>
                  <Assessment sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
              color: 'white',
              boxShadow: '0 4px 12px rgba(67, 233, 123, 0.3)'
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                      {stats.completedCases}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Completed Cases
                    </Typography>
                  </Box>
                  <CheckCircle sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<Refresh />}
            onClick={smartCacheClear}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)'
              }
            }}
          >
            Smart Clear Cache
          </Button>
          <Button
            variant="outlined"
            startIcon={<People />}
            onClick={() => navigate('/clinician/tasks')}
            sx={{
              borderColor: '#667eea',
              color: '#667eea',
              '&:hover': {
                borderColor: '#5a6fd8',
                backgroundColor: 'rgba(102, 126, 234, 0.04)'
              }
            }}
          >
            View Tasks
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => {
              console.log('🧪 TEST: Manually triggering global cache clear event...');
              const testEvent = new CustomEvent('globalCacheClear', {
                detail: { 
                  reason: 'case_assignment',
                  caseId: 'test-case-id',
                  caseNumber: 'TEST-CASE-001',
                  clinicianId: user?.id,
                  clinicianName: `${user?.firstName} ${user?.lastName}`,
                  clinicianEmail: user?.email,
                  timestamp: Date.now()
                }
              });
              window.dispatchEvent(testEvent);
              console.log('🧪 TEST: Global cache clear event dispatched for:', user?.email);
            }}
            sx={{
              borderColor: '#f59e0b',
              color: '#f59e0b',
              '&:hover': {
                borderColor: '#d97706',
                backgroundColor: 'rgba(245, 158, 11, 0.04)'
              }
            }}
          >
            Test Event
          </Button>
        </Box>

        {/* Rehabilitation Plans Section */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#2d3748' }}>
                Active Rehabilitation Plans
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setPlanDialog(true)}
                  sx={{
                    background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)'
                    }
                  }}
                >
                  Create Plan
                </Button>
                <Tooltip title="Smart Clear Cache & Refresh Data">
                  <IconButton
                    onClick={smartCacheClear}
                    sx={{
                      backgroundColor: 'rgba(102, 126, 234, 0.1)',
                      '&:hover': { backgroundColor: 'rgba(102, 126, 234, 0.2)' }
                    }}
                  >
                    <Refresh sx={{ color: '#667eea' }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            {activeRehabPlans.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <FitnessCenter sx={{ fontSize: 48, color: '#a0aec0', mb: 2 }} />
                <Typography variant="h6" sx={{ color: '#718096', mb: 1 }}>
                  No active rehabilitation plans
                </Typography>
                <Typography variant="body2" sx={{ color: '#a0aec0' }}>
                  Create rehabilitation plans for your assigned cases
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {activeRehabPlans.slice(0, 3).map((plan) => (
                  <Grid item xs={12} md={4} key={plan._id}>
                    <Card sx={{ 
                      border: '1px solid #e2e8f0',
                      '&:hover': { 
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        borderColor: '#667eea'
                      }
                    }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600, color: '#2d3748' }}>
                            {plan.planName}
                          </Typography>
                          <Chip
                            label={plan.status}
                            size="small"
                            color={plan.status === 'active' ? 'success' : 'default'}
                            variant="outlined"
                          />
                        </Box>
                        
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" sx={{ color: '#718096', mb: 1 }}>
                            Case: {plan.case?.caseNumber || 'N/A'}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#718096', mb: 1 }}>
                            Worker: {plan.case?.worker?.firstName} {plan.case?.worker?.lastName}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#718096' }}>
                            Progress: {plan.progress || 0}%
                          </Typography>
                        </Box>

                        <LinearProgress
                          variant="determinate"
                          value={plan.progress || 0}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: '#e2e8f0',
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 4,
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                            }
                          }}
                        />

                        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                          <Button
                            size="small"
                            startIcon={<Visibility />}
                            onClick={() => {
                              setSelectedPlan(plan);
                              setProgressDialog(true);
                            }}
                            sx={{ flex: 1 }}
                          >
                            View Progress
                          </Button>
                          <Button
                            size="small"
                            startIcon={<Edit />}
                            variant="outlined"
                            sx={{ flex: 1 }}
                          >
                            Edit
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </CardContent>
        </Card>

        {/* Cases Table */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#2d3748' }}>
                My Cases
              </Typography>
              <Tooltip title="Smart Clear Cache & Refresh Data">
                <IconButton
                  onClick={smartCacheClear}
                  sx={{
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    '&:hover': { backgroundColor: 'rgba(102, 126, 234, 0.2)' }
                  }}
                >
                  <Refresh sx={{ color: '#667eea' }} />
                </IconButton>
              </Tooltip>
            </Box>

            {clinicianCases.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Assignment sx={{ fontSize: 48, color: '#a0aec0', mb: 2 }} />
                <Typography variant="h6" sx={{ color: '#718096', mb: 1 }}>
                  No cases assigned
                </Typography>
                <Typography variant="body2" sx={{ color: '#a0aec0' }}>
                  Cases assigned by case managers will appear here
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Case #</TableCell>
                      <TableCell>Worker</TableCell>
                      <TableCell>Incident</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Priority</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {clinicianCases.map((caseItem: any) => (
                      <TableRow key={caseItem.id}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {caseItem.case_number}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
                              {caseItem.worker?.first_name?.[0]}{caseItem.worker?.last_name?.[0]}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {caseItem.worker?.first_name} {caseItem.worker?.last_name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#718096' }}>
                                {caseItem.worker?.email}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {caseItem.incident?.incident_type || 'N/A'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#718096' }}>
                            {caseItem.incident?.severity || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={caseItem.status}
                            size="small"
                            color={
                              caseItem.status === 'new' ? 'warning' :
                              caseItem.status === 'assessed' ? 'info' :
                              caseItem.status === 'in_rehab' ? 'primary' :
                              caseItem.status === 'completed' ? 'success' : 'default'
                            }
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={caseItem.priority}
                            size="small"
                            color={
                              caseItem.priority === 'urgent' ? 'error' :
                              caseItem.priority === 'high' ? 'warning' :
                              caseItem.priority === 'medium' ? 'info' : 'default'
                            }
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(caseItem.created_at).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="View Details">
                              <IconButton size="small" color="primary">
                                <Visibility />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Start Assessment">
                              <IconButton size="small" color="success">
                                <Assessment />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#2d3748' }}>
                Recent Notifications
              </Typography>
              {unreadNotificationCount > 0 && (
                <Chip
                  label={`${unreadNotificationCount} unread`}
                  size="small"
                  color="error"
                  variant="outlined"
                />
              )}
            </Box>

            {notifications.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Timeline sx={{ fontSize: 48, color: '#a0aec0', mb: 2 }} />
                <Typography variant="h6" sx={{ color: '#718096', mb: 1 }}>
                  No notifications
                </Typography>
                <Typography variant="body2" sx={{ color: '#a0aec0' }}>
                  You'll receive notifications for new case assignments
                </Typography>
              </Box>
            ) : (
              <List>
                {notifications.slice(0, 5).map((notification, index) => (
                  <ListItem key={notification.id} sx={{ px: 0 }}>
                    <ListItemIcon>
                      <Avatar sx={{ 
                        width: 32, 
                        height: 32, 
                        backgroundColor: notification.is_read ? '#e2e8f0' : '#667eea',
                        color: notification.is_read ? '#718096' : 'white'
                      }}>
                        {notification.is_read ? <CheckCircle /> : <Assignment />}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ 
                          fontWeight: notification.is_read ? 400 : 600,
                          color: notification.is_read ? '#718096' : '#2d3748'
                        }}>
                          {notification.title}
                        </Typography>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" sx={{ color: '#718096', mb: 0.5 }}>
                            {notification.message}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#a0aec0' }}>
                            {new Date(notification.created_at).toLocaleString()}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Box>
    </LayoutWithSidebar>
  );
};

export default ClinicianDashboardRedux;
