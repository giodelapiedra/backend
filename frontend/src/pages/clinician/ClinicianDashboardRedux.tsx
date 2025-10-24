import React, { useEffect, useCallback, useState, useMemo, memo } from 'react';
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
  Avatar,
} from '@mui/material';
import {
  Add,
  Close,
  People,
  CheckCircle,
  Cancel,
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

// Security utilities
const sanitizeInput = (input: string): string => {
  return input.replace(/[<>"'&]/g, (match) => {
    const escapeMap: { [key: string]: string } = {
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '&': '&amp;'
    };
    return escapeMap[match];
  });
};

// Allowed video platforms for security
const ALLOWED_VIDEO_DOMAINS = [
  'youtube.com',
  'youtu.be',
  'vimeo.com',
  'cloudinary.com',
  'res.cloudinary.com',
  'drive.google.com',
  'dropbox.com'
];

const validateVideoUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    
    // Must be HTTPS for security
    if (urlObj.protocol !== 'https:') {
      return false;
    }
    
    // Check if hostname is in allowed domains
    return ALLOWED_VIDEO_DOMAINS.some(domain => 
      urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
};

const validatePlanForm = (form: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!form.caseId || typeof form.caseId !== 'string') {
    errors.push('Please select a valid case');
  }
  
  if (!form.planName || typeof form.planName !== 'string' || form.planName.trim().length < 3) {
    errors.push('Plan name must be at least 3 characters long');
  }
  
  // FIXED: Make duration required
  if (!form.duration || typeof form.duration !== 'number' || form.duration < 1 || form.duration > 365) {
    errors.push('Duration is required and must be between 1 and 365 days');
  }
  
  if (!form.exercises || !Array.isArray(form.exercises) || form.exercises.length === 0) {
    errors.push('At least one exercise is required');
  } else {
    form.exercises.forEach((exercise: any, index: number) => {
      if (!exercise.name || typeof exercise.name !== 'string' || exercise.name.trim().length < 2) {
        errors.push(`Exercise ${index + 1} name must be at least 2 characters long`);
      }
      
      // CRITICAL FIX: Strengthen video URL validation
      if (exercise.videoUrl && typeof exercise.videoUrl === 'string' && exercise.videoUrl.trim().length > 0) {
        if (!validateVideoUrl(exercise.videoUrl.trim())) {
          errors.push(
            `Exercise ${index + 1} video URL must be a valid HTTPS URL from allowed platforms (YouTube, Vimeo, Cloudinary, Google Drive, Dropbox)`
          );
        }
      }
    });
  }
  
  return { isValid: errors.length === 0, errors };
};

export interface RehabPlan {
  _id: string;
  planName: string;
  status: string;
  duration?: number; // Number of days the plan should last
  worker_id?: string; // Direct worker ID from rehabilitation_plans table
  case?: {
    _id: string;
    caseNumber: string;
    status: string;
    worker: {
      _id: string;
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
  dailyCompletions?: Array<{
    date: string;
    exercises: Array<{
      exerciseId: string;
      exerciseName: string;
      completedAt: string;
      painLevel?: number;
      painNotes?: string;
      status: string;
    }>;
  }>;
}

interface DashboardStats {
  totalCases: number;
  activeCases: number;
  completedCases: number;
  pendingAssessments: number;
}

const ClinicianDashboardRedux: React.FC = memo(() => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Redux state
  const {
    error,
    successMessage,
  } = useAppSelector((state: any) => state.ui);

  // Local state - optimized with better initial values
  const [rehabPlans, setRehabPlans] = useState<RehabPlan[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [hasNewData, setHasNewData] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Rehabilitation plan states
  const [selectedPlan, setSelectedPlan] = useState<RehabPlan | null>(null);
  const [planDialog, setPlanDialog] = useState(false);
  const [progressDialog, setProgressDialog] = useState(false);
  const [editPlanDialog, setEditPlanDialog] = useState(false);
  const [completePlanDialog, setCompletePlanDialog] = useState(false);
  const [cancelPlanDialog, setCancelPlanDialog] = useState(false);
  const [planToComplete, setPlanToComplete] = useState<RehabPlan | null>(null);
  const [planToCancel, setPlanToCancel] = useState<RehabPlan | null>(null);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [isCompletingPlan, setIsCompletingPlan] = useState(false);
  const [isCancellingPlan, setIsCancellingPlan] = useState(false);
  
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

  // RTK Query hooks with optimized caching
  const {
    data: clinicianCasesData,
    isLoading: casesLoading,
    error: casesError,
    refetch: refetchClinicianCases
  } = useGetClinicianCasesQuery(user?.id || '', {
    skip: !user?.id,
    // Optimize polling - only refetch every 60 seconds instead of 10
    pollingInterval: 60000,
  });

  const {
    data: incidentsData,
    isLoading: incidentsLoading,
    error: incidentsError,
    refetch: refetchIncidents
  } = useGetIncidentsQuery({}, {
    // Reduce polling frequency
    pollingInterval: 120000, // 2 minutes
  });

  // Derived data from RTK Query - OPTIMIZED MEMOIZATION
  const clinicianCases = useMemo(() => {
    return clinicianCasesData?.cases || [];
  }, [clinicianCasesData?.cases]);
  
  const totalCasesCount = useMemo(() => {
    return clinicianCases.length;
  }, [clinicianCases.length]);
  
  // Memoized calculations for rehabilitation plans - OPTIMIZED
  const activeRehabPlans = useMemo(() => {
    return rehabPlans.filter(plan => 
      plan.status === 'active' && 
      plan.case && 
      plan.case.status !== 'closed'
    );
  }, [rehabPlans]);

  // Get case IDs that have ANY rehabilitation plan (active, completed, or cancelled) - OPTIMIZED
  // Cases with any existing plan cannot have new plans created
  const caseIdsWithAnyPlan = useMemo(() => {
    return new Set(
      rehabPlans
        .filter(plan => {
          // Include ALL plans regardless of status
          return plan.case;
        })
        .map(plan => plan.case?._id)
        .filter(Boolean)
    );
  }, [rehabPlans]);

  // Filter available cases for creating new rehabilitation plans - OPTIMIZED
  // Cases are available if:
  // 1. Not closed (closed cases cannot be modified)
  // 2. Does NOT have ANY rehabilitation plan (prevents multiple plans per case)
  const availableCasesForPlan = useMemo(() => {
    return clinicianCases.filter((caseItem: any) => {
      // Exclude cases that are closed - closed cases cannot be updated
      const isClosed = caseItem.status === 'closed';
      
      // Check if case has ANY rehabilitation plan
      const hasAnyPlan = caseIdsWithAnyPlan.has(caseItem.id);
      
      // Show case if:
      // 1. Not closed, AND
      // 2. Does NOT have any existing rehabilitation plan
      return !isClosed && !hasAnyPlan;
    });
  }, [clinicianCases, caseIdsWithAnyPlan]);

  // Calculate stats - OPTIMIZED with better performance
  const stats: DashboardStats = useMemo(() => {
    const statusCounts = clinicianCases.reduce((acc, c: any) => {
      const status = c.status;
      if (['triaged', 'assessed', 'in_rehab'].includes(status)) {
        acc.active++;
      } else if (['return_to_work', 'closed'].includes(status)) {
        acc.completed++;
      } else if (status === 'new') {
        acc.pending++;
      }
      return acc;
    }, { active: 0, completed: 0, pending: 0 });

    const completedPlansCount = rehabPlans.filter((p: any) => 
      (p.status || '').toLowerCase() === 'completed'
    ).length;

    return {
      totalCases: totalCasesCount,
      activeCases: statusCounts.active,
      completedCases: statusCounts.completed + completedPlansCount,
      pendingAssessments: statusCounts.pending,
    } as DashboardStats;
  }, [totalCasesCount, clinicianCases, rehabPlans]);

  // Fetch rehabilitation plans - OPTIMIZED with error handling
  const fetchRehabPlans = useCallback(async () => {
    if (!user?.id || isRefreshing) return;
    
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
        .order('created_at', { ascending: false })
        .limit(50); // Limit results for performance

      if (error) throw error;

      // Transform data to match RehabPlan interface - OPTIMIZED with error handling
      const plans = (data || []).map(plan => {
        try {
          // Safe array access with type checking
          // Get completed days from progress_stats or calculate from daily_completions
          const dailyCompletions = Array.isArray(plan.daily_completions) ? plan.daily_completions : [];
          const completedDaysFromStats = plan.progress_stats?.completedDays || 0;
          
          // Calculate completed days from daily_completions as backup
          const completedDaysFromCompletions = dailyCompletions.filter((dc: any) => {
            if (!dc || typeof dc !== 'object') return false;
            
            const dayExercises = Array.isArray(dc.exercises) ? dc.exercises : [];
            const totalExercises = Array.isArray(plan.exercises) ? plan.exercises.length : 0;
            
            if (totalExercises === 0) return false;
            
            const completedExercises = dayExercises.filter((e: any) => 
              e && typeof e === 'object' && e.status === 'completed'
            ).length;
            
            return completedExercises === totalExercises;
          }).length;

          // Use the larger value between stats and calculated completions
          const completedDays = Math.max(completedDaysFromStats, completedDaysFromCompletions);
          
          const duration = Math.max(1, plan.duration || 7); // Ensure minimum duration of 1
          const progressPercentage = duration > 0 ? Math.min(100, Math.round((completedDays / duration) * 100)) : 0;
          
          console.log('Progress calculation:', {
            planId: plan.id,
            completedDaysFromStats,
            completedDaysFromCompletions,
            completedDays,
            duration,
            progressPercentage
          });

          // Ensure progress_stats has correct values
          const updatedProgressStats = {
            ...(plan.progress_stats || {}),
            completedDays: completedDays,
            totalDays: duration,
            skippedDays: 0,
            consecutiveCompletedDays: completedDays,
            consecutiveSkippedDays: 0
          };

          return {
            _id: plan.id,
            planName: sanitizeInput(plan.plan_name || ''),
            status: plan.status,
            duration,
            worker_id: plan.worker_id,
            startDate: plan.start_date,
            endDate: plan.end_date || null,
            progress: progressPercentage, // Use calculated percentage
            case: plan.case ? {
              _id: plan.case.id,
              caseNumber: sanitizeInput(plan.case.case_number || ''),
              status: plan.case.status,
              worker: plan.case.worker ? {
                _id: plan.case.worker.id,
                firstName: sanitizeInput(plan.case.worker.first_name || ''),
                lastName: sanitizeInput(plan.case.worker.last_name || '')
              } : undefined
            } : undefined,
            exercises: Array.isArray(plan.exercises) ? plan.exercises.map((exercise: any) => ({
              name: exercise.name || '',
              sets: exercise.sets || 1,
              reps: exercise.reps || 10,
              completed: false // Simplified - we don't need individual exercise completion status here
            })) : [],
            progressStats: {
              completedDays,
              totalDays: duration,
              ...(plan.progress_stats || {})
            },
            dailyCompletions: dailyCompletions // Include all daily completion records
          };
        } catch (planError) {
          console.error('Error processing individual plan:', planError);
          // Return a safe fallback plan object
          return {
            _id: plan.id,
            planName: sanitizeInput(plan.plan_name || 'Unknown Plan'),
            status: plan.status || 'unknown',
            duration: 7,
            startDate: plan.start_date,
            endDate: plan.end_date || null,
            progress: 0,
            exercises: [],
            progressStats: {
              completedDays: 0,
              totalDays: 7
            }
          };
        }
      });

      setRehabPlans(plans as any);
    } catch (err) {
      console.error('Error fetching rehabilitation plans:', err);
      setRehabPlans([]);
      dispatch(setError('Failed to load rehabilitation plans'));
    }
  }, [user?.id, isRefreshing]); // Removed dispatch - it's stable from Redux

  // Fetch notifications - OPTIMIZED
  const fetchNotifications = useCallback(async () => {
    if (!user?.id || isRefreshing) return;
    
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

      // Sanitize notification data
      const sanitizedNotifications = (notificationsData || []).map(notification => ({
        ...notification,
        message: sanitizeInput(notification.message || ''),
        title: sanitizeInput(notification.title || '')
      }));

      setNotifications(sanitizedNotifications);
      setUnreadNotificationCount(sanitizedNotifications.filter(n => !n.is_read).length);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      dispatch(setError('Failed to load notifications'));
    }
  }, [user?.id, isRefreshing]); // Removed dispatch - it's stable


  // Effects - OPTIMIZED (Fixed: Removed unstable dependencies)
  useEffect(() => {
    if (user?.id && !isRefreshing) {
      // Use Promise.all for parallel execution
      Promise.all([
        fetchNotifications(),
        fetchRehabPlans()
      ]).catch(err => {
        console.error('Error in initial data fetch:', err);
        dispatch(setError('Failed to load initial data'));
      });
    }
  }, [user?.id, isRefreshing]); // Fixed: Only depend on primitive values



  // Handle errors - OPTIMIZED
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

  // Auto-refresh - OPTIMIZED with better interval (Fixed: Stable dependencies)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isRefreshing) {
        console.log('🔄 Auto-refreshing clinician dashboard...');
        // Use Promise.all for parallel execution
        Promise.all([
          refetchClinicianCases(),
          fetchNotifications(),
          fetchRehabPlans()
        ]).catch(err => {
          console.error('Error in auto-refresh:', err);
        });
      }
    }, 30000); // Increased to 30 seconds for better performance

    return () => clearInterval(interval);
  }, [isRefreshing]); // Fixed: Removed function dependencies to prevent recreating interval

  // Rehabilitation Plan Handlers - OPTIMIZED with security
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
    setPlanForm(prev => {
      // Validate index within the current state
      if (index >= 0 && index < prev.exercises.length) {
        return {
          ...prev,
          exercises: prev.exercises.filter((_, i) => i !== index)
        };
      }
      // Return unchanged state if index is invalid
      return prev;
    });
  }, []); // Fixed: No dependencies needed - uses functional update pattern

  const handleExerciseChange = useCallback((index: number, field: string, value: string) => {
    setPlanForm(prev => {
      // Validate index within the current state
      if (index >= 0 && index < prev.exercises.length) {
        // Validate and sanitize input
        const sanitizedValue = field === 'videoUrl' ? value : sanitizeInput(value);
        return {
          ...prev,
          exercises: prev.exercises.map((ex, i) => 
            i === index ? { ...ex, [field]: sanitizedValue } : ex
          )
        };
      }
      // Return unchanged state if index is invalid
      return prev;
    });
  }, []); // Fixed: No dependencies needed - uses functional update pattern

  const handleCreateRehabilitationPlan = useCallback(async () => {
    try {
      setIsCreatingPlan(true);

      // Enhanced validation with security
      const validation = validatePlanForm(planForm);
      if (!validation.isValid) {
        dispatch(setError(validation.errors.join(', ')));
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

      // Prepare exercises data with sanitization
      const exercisesData = planForm.exercises
        .filter(ex => ex.name && ex.name.trim().length > 0)
        .map((ex, index) => ({
          name: sanitizeInput(ex.name.trim()),
          repetitions: sanitizeInput(ex.repetitions || '10 reps'),
          instructions: sanitizeInput(ex.instructions || ''),
          videoUrl: ex.videoUrl ? sanitizeInput(ex.videoUrl.trim()) : '',
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
          duration: Math.min(Math.max(planForm.duration || 7, 1), 365), // Clamp between 1-365 days
          plan_name: sanitizeInput(planForm.planName.trim()),
          plan_description: sanitizeInput(planForm.planDescription.trim()),
          daily_completions: [], // Start with empty daily completions
          progress_stats: {
            totalDays: Math.min(Math.max(planForm.duration || 7, 1), 365),
            completedDays: 0,
            skippedDays: 0,
            consecutiveCompletedDays: 0,
            consecutiveSkippedDays: 0
          }
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Plan created successfully:', data);

      // Notify worker about new plan
      try {
        await dataClient.from('notifications').insert({
          recipient_id: selectedCase.worker_id,
          sender_id: user?.id,
          type: 'rehab_plan_assigned',
          title: 'New Rehabilitation Plan Assigned',
          message: `Your clinician has assigned you a new rehabilitation plan: "${sanitizeInput(planForm.planName.trim())}" for case ${selectedCase.case_number}. Please review and start your exercises.`,
          priority: 'high',
          metadata: {
            plan_id: data.id,
            plan_name: sanitizeInput(planForm.planName.trim()),
            case_number: selectedCase.case_number
          }
        });
      } catch (error) {
        console.error('Failed to send plan assignment notification:', error);
      }

      // Success!
      dispatch(setSuccessMessage(`Rehabilitation plan created successfully for ${selectedCase.worker?.firstName} ${selectedCase.worker?.lastName}! The worker has been notified about their new rehabilitation plan.`));
      
      // Reset form
      setPlanForm({
        caseId: '',
        planName: 'Recovery Plan',
        planDescription: 'Daily recovery exercises and activities',
        duration: 7,
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
    if (!plan || !plan._id) return;
    
    setSelectedPlan(plan);
    // Populate form with existing plan data - sanitized
    setPlanForm({
      caseId: plan.case?._id || '',
      planName: sanitizeInput(plan.planName || 'Recovery Plan'),
      planDescription: 'Daily recovery exercises and activities',
      duration: Math.min(Math.max(plan.duration || 7, 1), 365), // Clamp duration
      exercises: plan.exercises && plan.exercises.length > 0 
        ? plan.exercises.map(ex => ({
            name: sanitizeInput(ex.name || ''),
            repetitions: sanitizeInput(String(ex.reps || '')),
            instructions: '',
            videoUrl: ''
          }))
        : [{ name: '', repetitions: '', instructions: '', videoUrl: '' }]
    });
    setEditPlanDialog(true);
  }, []);

  const handleSaveEditedPlan = useCallback(async () => {
    if (!selectedPlan || !selectedPlan._id) return;
    
    try {
      setIsSavingPlan(true);

      // Enhanced validation with security
      const validation = validatePlanForm(planForm);
      if (!validation.isValid) {
        dispatch(setError(validation.errors.join(', ')));
        return;
      }

      // Get current plan data first to preserve all important fields
      const { data: currentPlan, error: fetchError } = await dataClient
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
        .eq('id', selectedPlan._id)
        .single();

      if (fetchError) {
        console.error('Error fetching current plan:', fetchError);
        throw fetchError;
      }

      // Get current exercises to preserve completion status
      const currentExercises = currentPlan.exercises || [];
      
      // Prepare exercises data while preserving completion status
      const exercisesData = planForm.exercises
        .filter(ex => ex.name && ex.name.trim().length > 0)
        .map((ex, index) => {
          // Try to find matching exercise from current plan to preserve its status
          const matchingExercise = currentExercises[index];
          
          return {
            name: sanitizeInput(ex.name.trim()),
            repetitions: sanitizeInput(ex.repetitions || '10 reps'),
            instructions: sanitizeInput(ex.instructions || ''),
            videoUrl: ex.videoUrl ? sanitizeInput(ex.videoUrl.trim()) : '',
            order: index,
            // Preserve completion status if exercise exists
            completed: matchingExercise?.completed || false,
            completedAt: matchingExercise?.completedAt || null,
            // Preserve any pain/feedback data
            painLevel: matchingExercise?.painLevel,
            painNotes: matchingExercise?.painNotes,
            // Preserve status for daily tracking
            status: matchingExercise?.status || 'pending',
            // Lock completed exercises
            locked: matchingExercise?.status === 'completed' || false
          };
        });

      // Calculate proper progress percentage based on completed days
      const completedDays = currentPlan.progress_stats?.completedDays || 0;
      const totalDays = Math.min(Math.max(planForm.duration || 7, 1), 365);
      const progressPercentage = Math.round((completedDays / totalDays) * 100);

      // Update rehabilitation plan in Supabase while preserving all progress and state
      const { error } = await dataClient
        .from('rehabilitation_plans')
        .update({
          plan_name: sanitizeInput(planForm.planName.trim()),
          exercises: exercisesData,
          duration: totalDays,
          // Preserve and update progress data
          progress_stats: {
            ...currentPlan.progress_stats,
            totalDays: totalDays,
            completedDays: completedDays
          },
          // Preserve daily completions with locked status for completed days
          daily_completions: (currentPlan.daily_completions || []).map((dc: any) => ({
            ...dc,
            // Mark completed days as locked to prevent re-enabling
            locked: dc.exercises?.every((e: any) => e.status === 'completed') || false,
            exercises: dc.exercises?.map((e: any) => ({
              ...e,
              // Keep exercise locked if it was completed
              locked: e.status === 'completed' || false
            }))
          })),
          start_date: currentPlan.start_date,
          status: currentPlan.status,
          case_id: currentPlan.case_id,
          worker_id: currentPlan.worker_id,
          clinician_id: currentPlan.clinician_id,
          // Update progress percentage
          progress: progressPercentage
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
    if (!planToComplete || !planToComplete._id) return;

    try {
      setIsCompletingPlan(true);

      const caseId = planToComplete.case?._id;
      if (!caseId) {
        throw new Error('Case ID not found for this rehabilitation plan');
      }

      // Update plan status to completed
      const currentDate = new Date().toISOString().split('T')[0]; // Format as YYYY-MM-DD
      const { error: planError } = await dataClient
        .from('rehabilitation_plans')
        .update({
          status: 'completed',
          end_date: currentDate
        })
        .eq('id', planToComplete._id);

      if (planError) {
        console.error('Error completing plan:', planError);
        throw planError;
      }

      // CRITICAL FIX: Verify case status was updated by trigger
      console.log('✅ Plan completed, verifying case status update...');
      
      // Wait a moment for trigger to execute
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verify the case status was updated
      const { data: updatedCase, error: caseError } = await dataClient
        .from('cases')
        .select('status')
        .eq('id', caseId)
        .single();

      if (caseError) {
        console.error('Error checking case status:', caseError);
        // Don't throw - plan was completed successfully
      } else if (updatedCase) {
        console.log('📋 Case status after plan completion:', updatedCase.status);
        
        // Check if case status was updated to return_to_work
        if (updatedCase.status !== 'return_to_work' && updatedCase.status !== 'closed') {
          console.warn('⚠️ Case status was not automatically updated to return_to_work');
          console.warn('Current status:', updatedCase.status);
          
          // Attempt manual fallback update
          const { error: manualUpdateError } = await dataClient
            .from('cases')
            .update({ status: 'return_to_work' })
            .eq('id', caseId);
          
          if (manualUpdateError) {
            console.error('Error manually updating case status:', manualUpdateError);
            dispatch(setError('Plan completed but case status update failed. Please manually update the case status.'));
            } else {
              console.log('✅ Manually updated case status to return_to_work');
            }
          } else {
            console.log('✅ Case status correctly updated by trigger');
          }
      }

      // Refresh the cases data to show updated status
      console.log('🔄 Refreshing cases data...');
      await refetchClinicianCases();

      // Create notification for plan completion
      try {
        const notificationData = {
          recipient_id: planToComplete.worker_id,
          sender_id: user?.id,
          type: 'rehabilitation_plan_completed',
          title: '🎉 Rehabilitation Plan Completed!',
          message: `Congratulations! Your rehabilitation plan "${planToComplete.planName}" has been completed successfully. You can now return to work.`,
          priority: 'high',
          metadata: {
            plan_id: planToComplete._id,
            case_id: caseId,
            plan_name: planToComplete.planName,
            completion_date: currentDate
          }
        };

        const { error: notificationError } = await dataClient
          .from('notifications')
          .insert(notificationData);

        if (notificationError) {
          console.error('Error creating completion notification:', notificationError);
          // Don't throw error - notification failure shouldn't break plan completion
        } else {
          console.log('✅ Completion notification sent to worker successfully');
        }
      } catch (notificationErr) {
        console.error('Error in completion notification creation:', notificationErr);
        // Don't throw error - notification failure shouldn't break plan completion
      }

      // Success!
      dispatch(setSuccessMessage(`✅ Rehabilitation plan completed successfully for ${planToComplete.case?.worker?.firstName} ${planToComplete.case?.worker?.lastName}! Case status has been updated. The worker has been notified.`));
      
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
  }, [planToComplete, dispatch, fetchRehabPlans, refetchClinicianCases]);

  // Handle cancel plan dialog
  const handleOpenCancelPlanDialog = useCallback((plan: RehabPlan) => {
    setPlanToCancel(plan);
    setCancelPlanDialog(true);
  }, []);

  const handleCloseCancelPlanDialog = useCallback(() => {
    setCancelPlanDialog(false);
    setPlanToCancel(null);
  }, []);

  const handleConfirmCancelPlan = useCallback(async () => {
    if (!planToCancel || !planToCancel._id) return;

    try {
      setIsCancellingPlan(true);

      // Delete the rehabilitation plan completely from the database
      const { error } = await dataClient
        .from('rehabilitation_plans')
        .delete()
        .eq('id', planToCancel._id);

      if (error) {
        console.error('Error cancelling plan:', error);
        throw error;
      }

      // Refresh cases data
      console.log('🔄 Rehabilitation plan cancelled and deleted, refreshing data...');
      await refetchClinicianCases();

      // Success!
      dispatch(setSuccessMessage(`✅ Rehabilitation plan cancelled and removed successfully for ${planToCancel.case?.worker?.firstName} ${planToCancel.case?.worker?.lastName}. You can now create a new plan if needed.`));
      
      // Close dialog and reset
      setCancelPlanDialog(false);
      setPlanToCancel(null);
      
      // Refresh plans
      fetchRehabPlans();
      
      setTimeout(() => dispatch(clearMessages()), 5000);
    } catch (error: any) {
      console.error('Error cancelling rehabilitation plan:', error);
      dispatch(setError(error.message || 'Failed to cancel rehabilitation plan'));
    } finally {
      setIsCancellingPlan(false);
    }
  }, [planToCancel, dispatch, fetchRehabPlans, refetchClinicianCases]);

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

  // Memoized progress timeline calculation for better performance
  const progressTimelineData = useMemo(() => {
    if (!selectedPlan) return [];
    
    const dailyCompletions = selectedPlan?.dailyCompletions || [];
    const totalDays = selectedPlan.progressStats?.totalDays || selectedPlan.duration || 7;
    const completedDays = selectedPlan.progressStats?.completedDays || 0;
    
    const timelineEntries = [];
    
    // Add completed days with actual data
    dailyCompletions.forEach((completion: any, index: number) => {
      const dayNumber = index + 1;
      const completionDate = completion.date ? new Date(completion.date).toLocaleDateString() : `Day ${dayNumber}`;
      
      // Calculate pain statistics for this day
      const dayExercises = completion.exercises || [];
      const exercisesWithPain = dayExercises.filter((e: any) => e.painLevel !== null && e.painLevel !== undefined);
      const painLevels = exercisesWithPain.map((e: any) => e.painLevel);
      const averagePain = painLevels.length > 0 ? 
        Math.round((painLevels.reduce((sum, level) => sum + level, 0) / painLevels.length) * 10) / 10 : 0;
      const maxPain = painLevels.length > 0 ? Math.max(...painLevels) : 0;
      const minPain = painLevels.length > 0 ? Math.min(...painLevels) : 0;
      
      timelineEntries.push({
        dayNumber,
        date: completionDate,
        isCompleted: true,
        isCurrent: false,
        painData: {
          average: averagePain,
          min: minPain,
          max: maxPain,
          exerciseCount: exercisesWithPain.length,
          hasData: painLevels.length > 0
        },
        exercises: dayExercises
      });
    });
    
    // Add remaining days (pending/current)
    for (let i = completedDays; i < totalDays; i++) {
      const dayNumber = i + 1;
      const isCurrent = dayNumber === completedDays + 1;
      
      timelineEntries.push({
        dayNumber,
        date: `Day ${dayNumber}`,
        isCompleted: false,
        isCurrent,
        painData: null,
        exercises: []
      });
    }
    
    return timelineEntries;
  }, [selectedPlan]);

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
          onCancelPlan={handleOpenCancelPlanDialog}
          onRefresh={() => {
            refetchClinicianCases();
            fetchRehabPlans();
            fetchNotifications();
          }}
        />

        {/* Cases Table */}
        <CasesTable cases={clinicianCases} onRefresh={() => {
          refetchClinicianCases();
          fetchRehabPlans();
          fetchNotifications();
        }} />

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
                  All your assigned cases already have rehabilitation plans. Please complete or cancel existing plans before creating new ones.
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
                  
                  {caseIdsWithAnyPlan.size > 0 && (
                    <Alert severity="info" sx={{ mb: 2, fontSize: '0.875rem' }}>
                      📋 {caseIdsWithAnyPlan.size} case(s) have existing rehabilitation plans and cannot have new plans created until the current plan is completed or cancelled.
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
                      <Grid item xs={12} md={6}>
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
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Day Progress
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600, color: '#10b981' }}>
                            Day {selectedPlan.progressStats?.completedDays || 0} of {selectedPlan.progressStats?.totalDays || selectedPlan.duration || 7}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#6b7280' }}>
                            ({selectedPlan.progressStats?.completedDays || 0} completed)
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ color: '#4a5568', fontSize: '0.875rem', mt: 0.5 }}>
                          {selectedPlan.progressStats?.completedDays === 0 ? 
                            'Starting Day 1' : 
                            `Current: Day ${(selectedPlan.progressStats?.completedDays || 0) + 1}`
                          }
                        </Typography>
                      </Grid>
              </Grid>
          </CardContent>
        </Card>


                {/* Daily Progress Timeline */}
                <Card sx={{ mb: 3, bgcolor: '#f8fafc' }}>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                      📅 Daily Progress Timeline
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {progressTimelineData.map((entry) => (
                        <Box key={entry.dayNumber} sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 2, 
                          p: 1.5,
                          borderRadius: 1,
                          bgcolor: entry.isCompleted ? '#f0fdf4' : entry.isCurrent ? '#fef3c7' : '#f8fafc',
                          border: `1px solid ${entry.isCompleted ? '#bbf7d0' : entry.isCurrent ? '#fde68a' : '#e2e8f0'}`
                        }}>
                          <Box sx={{ 
                            width: 24, 
                            height: 24, 
                            borderRadius: '50%', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            bgcolor: entry.isCompleted ? '#10b981' : entry.isCurrent ? '#f59e0b' : '#e5e7eb',
                            color: 'white',
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}>
                            {entry.isCompleted ? '✓' : entry.dayNumber}
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" sx={{ 
                              fontWeight: entry.isCurrent ? 600 : 500,
                              color: entry.isCompleted ? '#166534' : entry.isCurrent ? '#92400e' : '#6b7280'
                            }}>
                              {entry.date}
                            </Typography>
                            {entry.painData && entry.painData.hasData && (
                              <Typography variant="caption" sx={{ 
                                color: entry.painData.average <= 3 ? '#15803d' : 
                                       entry.painData.average <= 6 ? '#b45309' : '#dc2626',
                                display: 'block',
                                mt: 0.5
                              }}>
                                Pain: {entry.painData.average}/10 
                                {entry.painData.min !== entry.painData.max && ` (${entry.painData.min}-${entry.painData.max})`}
                                • {entry.painData.exerciseCount} exercise{entry.painData.exerciseCount !== 1 ? 's' : ''}
                              </Typography>
                            )}
                          </Box>
                          <Typography variant="caption" sx={{ 
                            color: entry.isCompleted ? '#15803d' : entry.isCurrent ? '#b45309' : '#9ca3af',
                            fontWeight: 500
                          }}>
                            {entry.isCompleted ? 'Completed' : entry.isCurrent ? 'Current' : 'Pending'}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
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
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                              {exercise.completed && (
                                <Chip
                                  label="Completed"
                                  size="small"
                                  color="success"
                                  icon={<CheckCircle />}
                                />
                              )}
                            </Box>
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
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
                background: '#ffffff',
                color: '#2d3748',
                border: '1px solid #e2e8f0',
                px: 3,
                '&:hover': {
                  background: '#f8fafc',
                  borderColor: '#cbd5e0'
                },
                '&:disabled': {
                  background: '#f1f5f9',
                  color: '#94a3b8',
                  borderColor: '#e2e8f0'
                }
              }}
            >
              {isCompletingPlan ? <CircularProgress size={20} sx={{ color: '#2d3748' }} /> : 'Complete Plan'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Cancel Plan Confirmation Dialog */}
        <Dialog
          open={cancelPlanDialog}
          onClose={handleCloseCancelPlanDialog}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 2,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }
          }}
        >
          <DialogTitle sx={{ 
            color: '#111827',
            fontWeight: 600,
            fontSize: '1.25rem',
            borderBottom: '1px solid #f3f4f6',
            pb: 2
          }}>
            Cancel Rehabilitation Plan
          </DialogTitle>
          <DialogContent sx={{ mt: 3 }}>
            <Alert 
              severity="warning" 
              sx={{ 
                mb: 3,
                backgroundColor: '#fffbeb',
                border: '1px solid #fef3c7',
                '& .MuiAlert-icon': {
                  color: '#f59e0b'
                }
              }}
            >
              Are you sure you want to cancel this rehabilitation plan? This action will permanently delete the plan and all its data.
            </Alert>
            
            {planToCancel && (
              <Box>
                <Card sx={{ 
                  border: '1px solid #e5e7eb', 
                  borderRadius: 2,
                  backgroundColor: 'white',
                  boxShadow: 'none'
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Grid container spacing={3}>
                      <Grid item xs={12}>
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', mb: 0.5 }}>
                            {planToCancel.planName}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#6b7280' }}>
                            Case: {planToCancel.case?.caseNumber}
                          </Typography>
                        </Box>
                      </Grid>

                      <Grid item xs={6}>
                        <Typography variant="caption" sx={{ color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                          Worker
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500, color: '#111827', mt: 0.5 }}>
                          {planToCancel.case?.worker?.firstName} {planToCancel.case?.worker?.lastName}
                        </Typography>
                      </Grid>

                      <Grid item xs={6}>
                        <Typography variant="caption" sx={{ color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                          Status
                        </Typography>
                        <Box sx={{ mt: 0.5 }}>
                          <Chip 
                            label={planToCancel.status.toUpperCase()} 
                            size="small"
                            sx={{
                              backgroundColor: '#f3f4f6',
                              color: '#374151',
                              fontWeight: 500,
                              fontSize: '0.75rem',
                              border: '1px solid #e5e7eb'
                            }}
                          />
                        </Box>
                      </Grid>

                      <Grid item xs={12}>
                        <Typography variant="caption" sx={{ color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', display: 'block', mb: 1 }}>
                          Progress
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={planToCancel.progress || 0}
                            sx={{
                              flex: 1,
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: '#f3f4f6',
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 3,
                                backgroundColor: '#3b82f6'
                              }
                            }}
                          />
                          <Typography variant="body2" sx={{ fontWeight: 500, color: '#6b7280', minWidth: 45 }}>
                            {planToCancel.progress || 0}%
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>

                    <Alert 
                      severity="info"
                      sx={{ 
                        mt: 3,
                        backgroundColor: '#eff6ff',
                        border: '1px solid #dbeafe',
                        '& .MuiAlert-icon': {
                          color: '#3b82f6'
                        }
                      }}
                    >
                      After cancelling, this case will become available for creating a new rehabilitation plan.
                    </Alert>
                  </CardContent>
                </Card>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, pt: 2, borderTop: '1px solid #f3f4f6', gap: 1 }}>
            <Button 
              onClick={handleCloseCancelPlanDialog}
              variant="outlined"
              disabled={isCancellingPlan}
              sx={{
                borderColor: '#e5e7eb',
                color: '#6b7280',
                textTransform: 'none',
                fontWeight: 500,
                '&:hover': {
                  borderColor: '#d1d5db',
                  backgroundColor: '#f9fafb'
                }
              }}
            >
              Go Back
            </Button>
            <Button 
              variant="contained"
              disabled={isCancellingPlan}
              onClick={handleConfirmCancelPlan}
              startIcon={isCancellingPlan ? null : <Cancel />}
              sx={{
                px: 3,
                backgroundColor: '#ef4444',
                color: 'white',
                textTransform: 'none',
                fontWeight: 500,
                boxShadow: 'none',
                '&:hover': {
                  backgroundColor: '#dc2626',
                  boxShadow: 'none'
                },
                '&:disabled': {
                  backgroundColor: '#f3f4f6',
                  color: '#9ca3af'
                }
              }}
            >
              {isCancellingPlan ? <CircularProgress size={20} sx={{ color: '#9ca3af' }} /> : 'Cancel Plan'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LayoutWithSidebar>
  );
});

ClinicianDashboardRedux.displayName = 'ClinicianDashboardRedux';

export default ClinicianDashboardRedux;
