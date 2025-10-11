import React, { useEffect, useCallback, useState, useMemo } from 'react';
import {
  Box,
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
  Button,
  Card,
  CardContent,
  IconButton,
  Typography,
  Grid,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  Add,
  Close,
  People,
  CheckCircle,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext.supabase';
import { dataClient } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import LayoutWithSidebar from '../../components/LayoutWithSidebar';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useGetClinicianCasesQuery, casesApi } from '../../store/api/casesApi';
import { useGetIncidentsQuery, incidentsApi } from '../../store/api/incidentsApi';
import {
  setError,
  setSuccessMessage,
  clearMessages,
} from '../../store/slices/uiSlice';

// Import new sub-components
import StatsCards from '../../components/clinician/StatsCards';
import RehabPlansSection from '../../components/clinician/RehabPlansSection';
import CasesTable from '../../components/clinician/CasesTable';
import NotificationsList from '../../components/clinician/NotificationsList';

export interface RehabPlan {
  _id: string;
  planName: string;
  status: string;
  duration?: number; // Number of days the plan should last
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
  endDate: string | null;
  progress: number;
  progressStats?: {
    completedDays?: number;
    totalDays?: number;
  };
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
    error,
    successMessage,
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
  const [progressDialog, setProgressDialog] = useState(false);
  const [editPlanDialog, setEditPlanDialog] = useState(false);
  const [completePlanDialog, setCompletePlanDialog] = useState(false);
  const [planToComplete, setPlanToComplete] = useState<RehabPlan | null>(null);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [isCompletingPlan, setIsCompletingPlan] = useState(false);
  
  // Rehabilitation plan form state
  const [planForm, setPlanForm] = useState({
    caseId: '',
    planName: 'Recovery Plan',
    planDescription: 'Daily recovery exercises and activities',
    duration: 7, // Default 7 days
    exercises: [
      {
        name: '',
        repetitions: '',
        instructions: '',
        videoUrl: ''
      }
    ]
  });

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

  // Derived data from RTK Query (exactly like Case Manager) - MEMOIZED
  const clinicianCases = useMemo(() => clinicianCasesData?.cases || [], [clinicianCasesData?.cases]);
  const totalCasesCount = useMemo(() => clinicianCases.length, [clinicianCases.length]);
  
  // Memoized calculations for rehabilitation plans
  const activeRehabPlans = useMemo(() => 
    rehabPlans.filter(plan => 
    plan.status === 'active' && 
    plan.case && 
    plan.case.status !== 'closed'
    ), [rehabPlans]
  );

  // Get case IDs that already have active plans
  const caseIdsWithActivePlans = useMemo(() => 
    new Set(activeRehabPlans.map(plan => plan.case?._id).filter(Boolean)),
    [activeRehabPlans]
  );

  // Filter available cases (cases without active plans)
  const availableCasesForPlan = useMemo(() => 
    clinicianCases.filter((caseItem: any) => 
      !caseIdsWithActivePlans.has(caseItem.id) && 
      caseItem.status !== 'closed'
    ),
    [clinicianCases, caseIdsWithActivePlans]
  );

  // Calculate stats directly from RTK Query data (like Case Manager) - MEMOIZED
  const stats: DashboardStats = useMemo(() => ({
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
  }), [totalCasesCount, clinicianCases]);

  // Fetch rehabilitation plans
  const fetchRehabPlans = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await dataClient
        .from('rehabilitation_plans')
        .select(`
          *,
          case:cases!case_id(
            id,
            case_number,
            status,
            worker:users!worker_id(id, first_name, last_name)
          )
        `)
        .eq('clinician_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to match RehabPlan interface
      const plans = (data || []).map(plan => {
        // Calculate completed days based on daily_completions
        const dailyCompletions = plan.daily_completions || [];
        const completedDays = dailyCompletions.filter((dc: any) => {
          // A day is "completed" if all exercises for that day are marked as completed
          const dayExercises = dc.exercises || [];
          const totalExercises = plan.exercises ? plan.exercises.length : 0;
          const completedExercises = dayExercises.filter((e: any) => e.status === 'completed').length;
          return totalExercises > 0 && completedExercises === totalExercises;
        }).length;
        
        // Calculate overall progress based on days (not today's exercises)
        const duration = plan.duration || 7;
        const progressPercentage = duration > 0 ? Math.round((completedDays / duration) * 100) : 0;

        return {
        _id: plan.id,
        planName: plan.plan_name,
        status: plan.status,
        duration: plan.duration || 7,
        startDate: plan.start_date,
        endDate: plan.end_date || null,
          progress: progressPercentage,
        case: plan.case ? {
          _id: plan.case.id,
          caseNumber: plan.case.case_number,
          status: plan.case.status,
          worker: plan.case.worker ? {
            _id: plan.case.worker.id,
            firstName: plan.case.worker.first_name,
            lastName: plan.case.worker.last_name
          } : undefined
        } : undefined,
        exercises: plan.exercises || [],
        progressStats: {
          completedDays,
          totalDays: duration,
          ...(plan.progress_stats || {})
        }
        };
      });

      setRehabPlans(plans as any);
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

  // Rehabilitation Plan Handlers (memoized to prevent lag)
  const handleAddExercise = useCallback(() => {
    setPlanForm(prev => ({
      ...prev,
      exercises: [
        ...prev.exercises,
        {
          name: '',
          repetitions: '',
          instructions: '',
          videoUrl: ''
        }
      ]
    }));
  }, []);

  const handleRemoveExercise = useCallback((index: number) => {
    setPlanForm(prev => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== index)
    }));
  }, []);

  const handleExerciseChange = useCallback((index: number, field: string, value: string) => {
    setPlanForm(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) => 
        i === index ? { ...ex, [field]: value } : ex
      )
    }));
  }, []);

  const handleCreateRehabilitationPlan = useCallback(async () => {
    try {
      setIsCreatingPlan(true);

      // Validation
      if (!planForm.caseId) {
        dispatch(setError('Please select a case'));
        return;
      }

      if (planForm.exercises.length === 0 || !planForm.exercises[0].name) {
        dispatch(setError('Please add at least one exercise with a name'));
        return;
      }

      // Get case and worker info
      const selectedCase = clinicianCases.find((c: any) => c.id === planForm.caseId);
      if (!selectedCase) {
        dispatch(setError('Selected case not found'));
        return;
      }

      // Check if case already has an active plan
      const hasActivePlan = activeRehabPlans.some(plan => plan.case?._id === planForm.caseId);
      if (hasActivePlan) {
        dispatch(setError('This case already has an active rehabilitation plan. Please complete or edit the existing plan.'));
        return;
      }

      // Prepare exercises data
      const exercisesData = planForm.exercises
        .filter(ex => ex.name) // Only include exercises with names
        .map((ex, index) => ({
          name: ex.name,
          repetitions: ex.repetitions || '10 reps',
          instructions: ex.instructions || '',
          videoUrl: ex.videoUrl || '',
          order: index
        }));

      console.log('Creating plan with data:', {
        case_id: planForm.caseId,
        worker_id: selectedCase.worker_id,
        clinician_id: user?.id,
        exercises: exercisesData
      });

      // Create rehabilitation plan in Supabase with REAL columns
      const { data, error } = await dataClient
        .from('rehabilitation_plans')
        .insert({
          case_id: planForm.caseId,
          worker_id: selectedCase.worker_id,
          clinician_id: user?.id,
          exercises: exercisesData,
          duration: planForm.duration || 7, // Duration in days
          plan_name: planForm.planName,
          plan_description: planForm.planDescription
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Plan created successfully:', data);

      // Success!
      dispatch(setSuccessMessage(`Rehabilitation plan created successfully for ${selectedCase.worker?.first_name} ${selectedCase.worker?.last_name}!`));
      
      // Reset form
      setPlanForm({
        caseId: '',
        planName: 'Recovery Plan',
        planDescription: 'Daily recovery exercises and activities',
        duration: 7, // Reset to default 7 days
        exercises: [{ name: '', repetitions: '', instructions: '', videoUrl: '' }]
      });
      
      // Close dialog
      setPlanDialog(false);
      
      // Refresh plans
      fetchRehabPlans();
      
      setTimeout(() => dispatch(clearMessages()), 5000);
    } catch (error: any) {
      console.error('Error creating rehabilitation plan:', error);
      dispatch(setError(error.message || 'Failed to create rehabilitation plan'));
    } finally {
      setIsCreatingPlan(false);
    }
  }, [planForm, clinicianCases, activeRehabPlans, user?.id, dispatch, fetchRehabPlans]);

  const handleEditPlan = useCallback((plan: RehabPlan) => {
    setSelectedPlan(plan);
    // Populate form with existing plan data
    setPlanForm({
      caseId: plan.case?._id || '',
      planName: plan.planName || 'Recovery Plan',
      planDescription: 'Daily recovery exercises and activities',
      duration: plan.duration || 7, // Include duration from existing plan
      exercises: plan.exercises && plan.exercises.length > 0 
        ? plan.exercises.map(ex => ({
            name: ex.name || '',
            repetitions: String(ex.reps || ''),
            instructions: '',
            videoUrl: ''
          }))
        : [{ name: '', repetitions: '', instructions: '', videoUrl: '' }]
    });
    setEditPlanDialog(true);
  }, []);

  const handleSaveEditedPlan = useCallback(async () => {
    if (!selectedPlan) return;
    
    try {
      setIsSavingPlan(true);

      // Validation
      if (planForm.exercises.length === 0 || !planForm.exercises[0].name) {
        dispatch(setError('Please add at least one exercise with a name'));
        return;
      }

      // Prepare exercises data
      const exercisesData = planForm.exercises
        .filter(ex => ex.name)
        .map((ex, index) => ({
          name: ex.name,
          repetitions: ex.repetitions || '10 reps',
          instructions: ex.instructions || '',
          videoUrl: ex.videoUrl || '',
          order: index
        }));

      // Update rehabilitation plan in Supabase
      const { error } = await dataClient
        .from('rehabilitation_plans')
        .update({
          plan_name: planForm.planName,
          exercises: exercisesData
        })
        .eq('id', selectedPlan._id);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      // Success!
      dispatch(setSuccessMessage('Rehabilitation plan updated successfully!'));
      
      // Close dialog
      setEditPlanDialog(false);
      setSelectedPlan(null);
      
      // Refresh plans
      fetchRehabPlans();
      
      setTimeout(() => dispatch(clearMessages()), 5000);
    } catch (error: any) {
      console.error('Error updating rehabilitation plan:', error);
      dispatch(setError(error.message || 'Failed to update rehabilitation plan'));
    } finally {
      setIsSavingPlan(false);
    }
  }, [selectedPlan, planForm, dispatch, fetchRehabPlans]);

  const handleOpenCompletePlanDialog = useCallback((plan: RehabPlan) => {
    setPlanToComplete(plan);
    setCompletePlanDialog(true);
  }, []);

  const handleCloseCompletePlanDialog = useCallback(() => {
    setCompletePlanDialog(false);
    setPlanToComplete(null);
  }, []);

  const handleConfirmCompletePlan = useCallback(async () => {
    if (!planToComplete) return;

    try {
      setIsCompletingPlan(true);

      // Update plan status to completed
      const currentDate = new Date().toISOString().split('T')[0]; // Format as YYYY-MM-DD
      const { error } = await dataClient
        .from('rehabilitation_plans')
        .update({
          status: 'completed',
          end_date: currentDate
        })
        .eq('id', planToComplete._id);

      if (error) {
        console.error('Error completing plan:', error);
        throw error;
      }

      // Success!
      dispatch(setSuccessMessage(`✅ Rehabilitation plan completed successfully for ${planToComplete.case?.worker?.firstName} ${planToComplete.case?.worker?.lastName}!`));
      
      // Close dialog and reset
      setCompletePlanDialog(false);
      setPlanToComplete(null);
      
      // Refresh plans
      fetchRehabPlans();
      
      setTimeout(() => dispatch(clearMessages()), 5000);
    } catch (error: any) {
      console.error('Error completing rehabilitation plan:', error);
      dispatch(setError(error.message || 'Failed to complete rehabilitation plan'));
    } finally {
      setIsCompletingPlan(false);
    }
  }, [planToComplete, dispatch, fetchRehabPlans]);

  // Memoized dialog handlers
  const handleCloseProgressDialog = useCallback(() => {
    setProgressDialog(false);
    setSelectedPlan(null);
  }, []);

  const handleCloseEditDialog = useCallback(() => {
    setEditPlanDialog(false);
    setSelectedPlan(null);
  }, []);

  const handleClosePlanDialog = useCallback(() => {
    setPlanDialog(false);
  }, []);

  const handleOpenProgressDialog = useCallback((plan: RehabPlan) => {
    setSelectedPlan(plan);
    setProgressDialog(true);
  }, []);

  const handleNavigateToTasks = useCallback(() => {
    navigate('/clinician/tasks');
  }, [navigate]);

  const handleOpenCreatePlanDialog = useCallback(() => {
    setPlanDialog(true);
  }, []);

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
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          bgcolor: '#F9FAFB'
        }}>
          <CircularProgress size={60} />
        </Box>
      </LayoutWithSidebar>
    );
  }

  return (
    <LayoutWithSidebar>
      <Box sx={{ 
        p: 3, 
        bgcolor: '#F9FAFB',
        minHeight: '100vh'
      }}>
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
        <StatsCards stats={stats} />

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<People />}
            onClick={handleNavigateToTasks}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)'
              }
            }}
          >
            View Tasks
          </Button>
                  </Box>

        {/* Rehabilitation Plans Section */}
        <RehabPlansSection 
          activeRehabPlans={activeRehabPlans}
          onCreatePlan={handleOpenCreatePlanDialog}
          onEditPlan={handleEditPlan}
          onViewProgress={handleOpenProgressDialog}
          onClosePlan={handleOpenCompletePlanDialog}
          onRefresh={smartCacheClear}
        />

        {/* Cases Table */}
        <CasesTable cases={clinicianCases} onRefresh={smartCacheClear} />

        {/* Notifications */}
        <NotificationsList 
          notifications={notifications} 
          unreadCount={unreadNotificationCount} 
        />

        {/* Create Rehabilitation Plan Dialog */}
        <Dialog
          open={planDialog}
          onClose={handleClosePlanDialog}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
            }
          }}
        >
          <DialogTitle sx={{ pb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ 
                width: 56, 
                height: 56, 
                borderRadius: 2, 
                bgcolor: 'rgba(6, 95, 70, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Add sx={{ fontSize: 32, color: '#065f46' }} />
              </Box>
                  <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#2d3748' }}>
                  Create Rehabilitation Plan
                    </Typography>
                <Typography variant="body2" sx={{ color: '#718096', mt: 0.5 }}>
                  Design a customized recovery program
                    </Typography>
                  </Box>
                </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                Create a customized rehabilitation plan with exercises for your patient
              </Alert>
              
              {availableCasesForPlan.length === 0 ? (
                <Alert severity="warning" sx={{ mb: 3 }}>
                  All your assigned cases already have active rehabilitation plans. Please complete or close existing plans before creating new ones.
                </Alert>
              ) : (
                <>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Select Case *</InputLabel>
                    <Select
                      value={planForm.caseId}
                      onChange={(e) => setPlanForm(prev => ({ ...prev, caseId: e.target.value }))}
                      label="Select Case *"
                    >
                      {availableCasesForPlan.map((caseItem: any) => (
                        <MenuItem key={caseItem.id} value={caseItem.id}>
                          {caseItem.case_number} - {caseItem.worker?.first_name} {caseItem.worker?.last_name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  
                  {caseIdsWithActivePlans.size > 0 && (
                    <Alert severity="info" sx={{ mb: 2, fontSize: '0.875rem' }}>
                      📋 {caseIdsWithActivePlans.size} case(s) already have active plans and are not shown in the list above.
                    </Alert>
                  )}
                </>
              )}

              <TextField
                fullWidth
                label="Plan Name"
                value={planForm.planName}
                onChange={(e) => setPlanForm(prev => ({ ...prev, planName: e.target.value }))}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Plan Description"
                multiline
                rows={2}
                value={planForm.planDescription}
                onChange={(e) => setPlanForm(prev => ({ ...prev, planDescription: e.target.value }))}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                type="number"
                label="Duration (Days)"
                value={planForm.duration}
                onChange={(e) => setPlanForm(prev => ({ ...prev, duration: parseInt(e.target.value) || 7 }))}
                inputProps={{ min: 1, max: 365 }}
                helperText="How many days should this plan last? (e.g., 7 days)"
                sx={{ mb: 2 }}
              />

              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Exercises
              </Typography>

              {planForm.exercises.map((exercise, index) => (
                <Card key={index} sx={{ mb: 2, bgcolor: '#f7fafc', border: '1px dashed #cbd5e0', position: 'relative' }}>
              <CardContent>
                    {planForm.exercises.length > 1 && (
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveExercise(index)}
                        sx={{ position: 'absolute', top: 8, right: 8 }}
                      >
                        <Close fontSize="small" />
                      </IconButton>
                    )}
                    <TextField
                      fullWidth
                      label="Exercise Name (e.g., Cat-Cow)"
                      size="small"
                      value={exercise.name}
                      onChange={(e) => handleExerciseChange(index, 'name', e.target.value)}
                      sx={{ mb: 1 }}
                    />
                    <TextField
                      fullWidth
                      label="Repetitions (e.g., 10 reps)"
                      size="small"
                      value={exercise.repetitions}
                      onChange={(e) => handleExerciseChange(index, 'repetitions', e.target.value)}
                      sx={{ mb: 1 }}
                    />
                    <TextField
                      fullWidth
                      label="Instructions"
                      multiline
                      rows={2}
                      placeholder="E.g., Breathe with each move—loosen the chain before the lift"
                      size="small"
                      value={exercise.instructions}
                      onChange={(e) => handleExerciseChange(index, 'instructions', e.target.value)}
                      sx={{ mb: 1 }}
                    />
                    <TextField
                      fullWidth
                      label="Video URL (optional)"
                      placeholder="https://..."
                      size="small"
                      value={exercise.videoUrl}
                      onChange={(e) => handleExerciseChange(index, 'videoUrl', e.target.value)}
                    />
              </CardContent>
            </Card>
              ))}

          <Button
                startIcon={<Add />}
            variant="outlined"
                fullWidth
                onClick={handleAddExercise}
                sx={{ mb: 2 }}
              >
                Add Another Exercise
          </Button>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button
              onClick={handleClosePlanDialog}
            variant="outlined"
              disabled={isCreatingPlan}
            sx={{
                borderColor: '#e2e8f0',
                color: '#718096',
              '&:hover': {
                  borderColor: '#cbd5e0',
                  bgcolor: '#f7fafc'
              }
            }}
          >
              Cancel
          </Button>
                <Button
                  variant="contained"
              disabled={isCreatingPlan || availableCasesForPlan.length === 0}
              onClick={handleCreateRehabilitationPlan}
              startIcon={isCreatingPlan ? null : <Add />}
                  sx={{
                    background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
                color: 'white',
                px: 3,
                    '&:hover': {
                      background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)'
                },
                '&:disabled': {
                  background: '#e2e8f0',
                  color: '#a0aec0'
                    }
                  }}
                >
              {isCreatingPlan ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Create Plan'}
                </Button>
          </DialogActions>
        </Dialog>

        {/* View Progress Dialog */}
        <Dialog
          open={progressDialog}
          onClose={handleCloseProgressDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Rehabilitation Plan Progress
              </Typography>
              <IconButton onClick={handleCloseProgressDialog}>
                <Close />
                  </IconButton>
              </Box>
          </DialogTitle>
          <DialogContent>
            {selectedPlan && (
              <Box sx={{ pt: 2 }}>
                <Card sx={{ mb: 3, bgcolor: '#f7fafc' }}>
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">
                          Plan Name
                </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {selectedPlan.planName}
                </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">
                          Status
                          </Typography>
                          <Chip
                          label={selectedPlan.status}
                            size="small"
                          color={selectedPlan.status === 'active' ? 'success' : 'default'}
                          sx={{ mt: 0.5 }}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">
                          Worker
                          </Typography>
                        <Typography variant="body1">
                          {selectedPlan.case?.worker?.firstName} {selectedPlan.case?.worker?.lastName}
                          </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">
                          Case Number
                          </Typography>
                        <Typography variant="body1">
                          {selectedPlan.case?.caseNumber || 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Overall Progress
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <LinearProgress
                          variant="determinate"
                            value={selectedPlan.progress || 0}
                          sx={{
                              flex: 1,
                              height: 10,
                              borderRadius: 5,
                            backgroundColor: '#e2e8f0',
                            '& .MuiLinearProgress-bar': {
                                borderRadius: 5,
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                            }
                          }}
                        />
                          <Typography variant="h6" sx={{ fontWeight: 600, minWidth: 50 }}>
                            {selectedPlan.progress || 0}%
                          </Typography>
                        </Box>
                  </Grid>
              </Grid>
          </CardContent>
        </Card>

                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Exercises
              </Typography>
                
                {selectedPlan.exercises && selectedPlan.exercises.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {selectedPlan.exercises.map((exercise, index) => (
                      <Card key={index} sx={{ border: '1px solid #e2e8f0' }}>
          <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                              {index + 1}. {exercise.name}
              </Typography>
                            {exercise.completed && (
                <Chip
                                label="Completed"
                  size="small"
                                color="success"
                                icon={<CheckCircle />}
                />
              )}
            </Box>
                          <Typography variant="body2" color="text.secondary">
                            Sets: {exercise.sets || 'N/A'} | Reps: {exercise.reps || 'N/A'}
                </Typography>
                        </CardContent>
                      </Card>
                    ))}
              </Box>
            ) : (
                  <Alert severity="info">
                    No exercises found for this rehabilitation plan
                  </Alert>
                )}
                        </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseProgressDialog}>
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Rehabilitation Plan Dialog */}
        <Dialog
          open={editPlanDialog}
          onClose={handleCloseEditDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Edit Rehabilitation Plan
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <Alert severity="info" sx={{ mb: 3 }}>
                Update the rehabilitation plan exercises and details
              </Alert>

              <TextField
                fullWidth
                label="Plan Name"
                value={planForm.planName}
                onChange={(e) => setPlanForm(prev => ({ ...prev, planName: e.target.value }))}
                sx={{ mb: 2 }}
              />

              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Exercises
              </Typography>

              {planForm.exercises.map((exercise, index) => (
                <Card key={index} sx={{ mb: 2, bgcolor: '#f7fafc', border: '1px dashed #cbd5e0', position: 'relative' }}>
                  <CardContent>
                    {planForm.exercises.length > 1 && (
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveExercise(index)}
                        sx={{ position: 'absolute', top: 8, right: 8 }}
                      >
                        <Close fontSize="small" />
                      </IconButton>
                    )}
                    <TextField
                      fullWidth
                      label="Exercise Name (e.g., Cat-Cow)"
                      size="small"
                      value={exercise.name}
                      onChange={(e) => handleExerciseChange(index, 'name', e.target.value)}
                      sx={{ mb: 1 }}
                    />
                    <TextField
                      fullWidth
                      label="Repetitions (e.g., 10 reps)"
                      size="small"
                      value={exercise.repetitions}
                      onChange={(e) => handleExerciseChange(index, 'repetitions', e.target.value)}
                      sx={{ mb: 1 }}
                    />
                    <TextField
                      fullWidth
                      label="Instructions"
                      multiline
                      rows={2}
                      placeholder="E.g., Breathe with each move—loosen the chain before the lift"
                      size="small"
                      value={exercise.instructions}
                      onChange={(e) => handleExerciseChange(index, 'instructions', e.target.value)}
                      sx={{ mb: 1 }}
                    />
                    <TextField
                      fullWidth
                      label="Video URL (optional)"
                      placeholder="https://..."
                      size="small"
                      value={exercise.videoUrl}
                      onChange={(e) => handleExerciseChange(index, 'videoUrl', e.target.value)}
                    />
                  </CardContent>
                </Card>
              ))}

              <Button
                startIcon={<Add />}
                variant="outlined"
                fullWidth
                onClick={handleAddExercise}
                sx={{ mb: 2 }}
              >
                Add Another Exercise
              </Button>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseEditDialog}>
              Cancel
            </Button>
            <Button 
              variant="contained" 
              disabled={isSavingPlan}
              onClick={handleSaveEditedPlan}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)'
                }
              }}
            >
              {isSavingPlan ? <CircularProgress size={20} /> : 'Save Changes'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Complete Plan Confirmation Dialog */}
        <Dialog
          open={completePlanDialog}
          onClose={handleCloseCompletePlanDialog}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
            }
          }}
        >
          <DialogTitle sx={{ pb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ 
                width: 56, 
                height: 56, 
                borderRadius: 2, 
                bgcolor: 'rgba(67, 233, 123, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CheckCircle sx={{ fontSize: 32, color: '#43e97b' }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#2d3748' }}>
                  Complete Rehabilitation Plan
                </Typography>
                <Typography variant="body2" sx={{ color: '#718096', mt: 0.5 }}>
                  Confirm plan completion
                </Typography>
              </Box>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ pb: 3 }}>
            {planToComplete && (
              <Box>
                <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                  You are about to mark this rehabilitation plan as completed. This action cannot be undone.
                </Alert>

                <Card sx={{ bgcolor: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: 2 }}>
                  <CardContent sx={{ p: 3 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Typography variant="body2" sx={{ color: '#718096', mb: 0.5 }}>
                          Plan Name
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#2d3748' }}>
                          {planToComplete.planName}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" sx={{ color: '#718096', mb: 0.5 }}>
                          Worker
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500, color: '#2d3748' }}>
                          {planToComplete.case?.worker?.firstName} {planToComplete.case?.worker?.lastName}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" sx={{ color: '#718096', mb: 0.5 }}>
                          Case Number
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500, color: '#2d3748' }}>
                          {planToComplete.case?.caseNumber || 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="body2" sx={{ color: '#718096', mb: 1 }}>
                          Progress
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <LinearProgress
                            variant="determinate"
                            value={planToComplete.progress || 0}
                            sx={{
                              flex: 1,
                              height: 8,
                              borderRadius: 4,
                              backgroundColor: '#e2e8f0',
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 4,
                                background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
                              }
                            }}
                          />
                          <Typography variant="body1" sx={{ fontWeight: 600, color: '#2d3748', minWidth: 50 }}>
                            {planToComplete.progress || 0}%
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
            <Button 
              onClick={handleCloseCompletePlanDialog}
              variant="outlined"
              disabled={isCompletingPlan}
              sx={{
                borderColor: '#e2e8f0',
                color: '#718096',
                '&:hover': {
                  borderColor: '#cbd5e0',
                  bgcolor: '#f7fafc'
                }
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="contained" 
              disabled={isCompletingPlan}
              onClick={handleConfirmCompletePlan}
              startIcon={isCompletingPlan ? null : <CheckCircle />}
              sx={{
                background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                color: 'white',
                px: 3,
                '&:hover': {
                  background: 'linear-gradient(135deg, #38d66c 0%, #2de0c8 100%)'
                },
                '&:disabled': {
                  background: '#e2e8f0',
                  color: '#a0aec0'
                }
              }}
            >
              {isCompletingPlan ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Complete Plan'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LayoutWithSidebar>
  );
};

export default ClinicianDashboardRedux;
