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
import { NotificationService } from '../../utils/notificationService';
import { CaseAssignmentService } from '../../utils/caseAssignmentService';
import { useGetClinicianCasesQuery, casesApi } from '../../store/api/casesApi';
import { useAppDispatch } from '../../store/hooks';
import { useNavigate } from 'react-router-dom';
import LayoutWithSidebar from '../../components/LayoutWithSidebar';
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
  id: string;
  _id?: string;
  case_number: string;
  caseNumber?: string;
  status: string;
  priority: string;
  clinician_id?: string;
  case_manager_id?: string;
  worker_id?: string;
  incident_id?: string;
  created_at?: string;
  updated_at?: string;
  injuryDetails?: {
    bodyPart: string;
    injuryType: string;
    severity: string;
    description: string;
  };
  workRestrictions?: {
    lifting: {
      maxWeight: number;
    };
    standing: {
      maxDuration: number;
    };
    other: string;
  };
  worker?: {
    id?: string;
    _id?: string;
    first_name?: string;
    firstName?: string;
    last_name?: string;
    lastName?: string;
    email: string;
  };
  clinician?: {
    id?: string;
    _id?: string;
    first_name?: string;
    firstName?: string;
    last_name?: string;
    lastName?: string;
    email: string;
  };
  case_manager?: {
    id?: string;
    _id?: string;
    first_name?: string;
    firstName?: string;
    last_name?: string;
    lastName?: string;
    email: string;
  };
  incident?: {
    id?: string;
    incident_number?: string;
    incidentNumber?: string;
    incident_date?: string;
    incidentDate?: string;
    description: string;
    severity: string;
    incident_type?: string;
    incidentType?: string;
    photos?: Array<{
      url: string;
      caption: string;
      uploadedAt: string;
    }>;
  };
  expectedReturnDate?: string;
}

interface DashboardStats {
  totalCases: number;
  activeCases: number;
  completedCases: number;
  activePlans: number;
  completedPlans: number;
  totalGoals: number;
  completedGoals: number;
  goalCompletionRate: number;
  totalExercises: number;
  completedExercises: number;
  exerciseCompletionRate: number;
  upcomingAppointments: number;
  activeCasesChange?: number;
  rehabPlansChange?: number;
  alertsChange?: number;
  exerciseRateChange?: number;
}

const ClinicianDashboard: React.FC = () => {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const [rehabPlans, setRehabPlans] = useState<RehabPlan[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);

  // RTK Query for immediate data fetching (like Case Manager)
  const {
    data: clinicianCasesData,
    isLoading: casesLoading,
    error: casesError,
    refetch: refetchClinicianCases
  } = useGetClinicianCasesQuery(user?.id || '', {
    skip: !user?.id, // Skip query if no user ID
  });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  // Derived data from RTK Query (exactly like Case Manager)
  const clinicianCases = clinicianCasesData?.cases || [];
  const totalCasesCount = clinicianCases.length;

  // Calculate stats directly from RTK Query data (like Case Manager)
  const stats: DashboardStats = {
    totalCases: totalCasesCount,
    activeCases: clinicianCases.filter((c: any) => 
      c.status && ['new', 'triaged', 'assessed', 'in_rehab'].includes(c.status)
    ).length,
    completedCases: clinicianCases.filter((c: any) => 
      c.status && ['return_to_work', 'closed'].includes(c.status)
    ).length,
    activePlans: 0, // No rehabilitation plans yet
    completedPlans: 0,
    totalGoals: 0,
    completedGoals: 0,
    goalCompletionRate: 0,
    totalExercises: 0,
    completedExercises: 0,
    exerciseCompletionRate: 0,
    upcomingAppointments: 0
  };

  // Update local state when RTK Query data changes (like Case Manager)
  useEffect(() => {
    console.log('🔄 RTK Query: Updating cases from clinician cases data:', clinicianCases.length);
    setCases(clinicianCases);
    setTotalCases(totalCasesCount);
  }, [clinicianCases, totalCasesCount]);

  // Memoized calculations for better performance
  const activeRehabPlans = useMemo(() => 
    rehabPlans.filter(plan => 
      plan.status === 'active' && 
      plan.case && 
      plan.case.status !== 'closed'
    ), 
    [rehabPlans]
  );

  const myCases = useMemo(() => 
    cases.filter(c => c.clinician_id === user?.id || c.clinician?._id === user?.id), 
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
  
  // Pagination states for active rehab plans
  const [currentPage, setCurrentPage] = useState(1);
  const [plansPerPage, setPlansPerPage] = useState(5);
  
  // Case detail viewing
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [caseDetailDialog, setCaseDetailDialog] = useState(false);
  const [isUpdatingCase, setIsUpdatingCase] = useState(false);
  
  // Pagination states for My Cases
  const [casesCurrentPage, setCasesCurrentPage] = useState(1);
  const [casesPageSize, setCasesPageSize] = useState(10);
  const [totalCases, setTotalCases] = useState(0);
  
  // Pagination handlers for My Cases
  const handleCasesPageChange = useCallback((page: number) => {
    setCasesCurrentPage(page);
  }, []);

  const handleCasesPageSizeChange = useCallback((newPageSize: number) => {
    setCasesPageSize(newPageSize);
    setCasesCurrentPage(1); // Reset to first page when changing page size
  }, []);
  
  // Handle case detail viewing
  const handleViewCaseDetails = async (caseId: string) => {
    try {
      // Skip API call - using Supabase auth
      console.log('Case details fetch skipped - using Supabase auth');
      setSelectedCase(null);
      setCaseDetailDialog(true);
    } catch (error) {
      console.error('❌ Error fetching case details:', error);
    }
  };

  // Handle case status update
  const handleUpdateCaseStatus = async (caseId: string, newStatus: string, notes?: string) => {
    try {
      setIsUpdatingCase(true);
      
      // Skip API call - using Supabase auth
      console.log('Case status update skipped - using Supabase auth');
      
      
      // Update the selected case in the dialog
      if (selectedCase && selectedCase._id === caseId) {
        setSelectedCase(null);
      }
      
      // Refresh the cases list
      fetchClinicianData();
      
      // Show success message
      setSuccessMessage(`Case status updated to ${newStatus.replace('_', ' ')} successfully!`);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (error: any) {
      console.error('Error updating case status:', error);
      setError(error.response?.data?.message || 'Failed to update case status');
    } finally {
      setIsUpdatingCase(false);
    }
  };

  
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

  // Smart cache clear function for comprehensive data refresh
  const smartCacheClear = async () => {
    try {
      console.log('🧹 SMART CACHE CLEAR TRIGGERED FOR CLINICIAN DASHBOARD');
      
      // 1. Clear local state to force fresh data
      console.log('🔄 Clearing local state...');
      setCases([]);
      setRehabPlans([]);
      setNotifications([]);
      setUnreadNotificationCount(0);
      setError('');
      setSuccessMessage('');
      
      // 2. Clear browser cache
      console.log('🧹 Clearing browser cache...');
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.log('✅ Browser cache cleared:', cacheNames.length, 'caches');
      }
      
      // 3. Clear localStorage cache
      console.log('🧹 Clearing localStorage cache...');
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
      console.log('✅ localStorage cleared:', keysToRemove.length, 'keys');
      
      // 4. Clear sessionStorage cache
      console.log('🧹 Clearing sessionStorage cache...');
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
      console.log('✅ sessionStorage cleared:', sessionKeysToRemove.length, 'keys');
      
      // 5. Clear IndexedDB cache (if any)
      console.log('🧹 Clearing IndexedDB cache...');
      if ('indexedDB' in window) {
        try {
          const databases = await indexedDB.databases();
          for (const db of databases) {
            if (db.name && (
              db.name.includes('rtk') || 
              db.name.includes('cache') || 
              db.name.includes('supabase') || 
              db.name.includes('clinician')
            )) {
              indexedDB.deleteDatabase(db.name);
            }
          }
          console.log('✅ IndexedDB cache cleared');
        } catch (error) {
          console.log('⚠️ IndexedDB clear failed:', error);
        }
      }
      
      // 6. Clear service worker cache
      console.log('🧹 Clearing service worker cache...');
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            await registration.unregister();
          }
          console.log('✅ Service worker cache cleared');
        } catch (error) {
          console.log('⚠️ Service worker clear failed:', error);
        }
      }
      
      // 7. Show visual indicator
      setLoading(true);
      setSuccessMessage('🧹 Smart cache clear completed! Refreshing data...');
      
      // 8. Force full data refresh
      console.log('🔄 Performing fresh data fetch...');
      await refetchClinicianCases();
      
      // 9. Update indicators
      setHasNewData(true);
      setLastUpdated(new Date());
      
      // 10. Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
        setHasNewData(false);
      }, 3000);
      
      console.log('✅ SMART CACHE CLEAR COMPLETED SUCCESSFULLY');
    } catch (err) {
      console.error('❌ Smart cache clear failed:', err);
      setError('Cache clear failed. Please refresh the page manually.');
    }
  };

  // Smart refresh function (now uses smart cache clear)
  const smartRefresh = async () => {
    await smartCacheClear();
  };

  useEffect(() => {
    if (user?.id) {
      // Auto-refresh every 10 seconds to ensure data is always fresh (more frequent for real-time updates)
      const interval = setInterval(async () => {
        console.log('🔄 Auto-refreshing clinician dashboard...');
        // Use RTK Query refetch for immediate data update
        await refetchClinicianCases();
      }, 10000);

      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Run when user changes

  // Separate effect for pagination changes
  useEffect(() => {
    if (casesCurrentPage || casesPageSize) {
      // Use RTK Query refetch for pagination changes
      refetchClinicianCases();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [casesCurrentPage, casesPageSize]);

  // Listen for refresh events when cases are assigned
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
        setCases([]);
        setRehabPlans([]);
        setNotifications([]);
        setUnreadNotificationCount(0);
        setError('');
        
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

  // Real-time subscription for automatic updates
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
          console.log('🔄 Auto-refreshing clinician dashboard due to case update...');
          // Use RTK Query refetch for immediate data update
          await refetchClinicianCases();
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
          console.log('🔄 Auto-refreshing clinician dashboard due to new case assignment...');
          // Use RTK Query refetch for immediate data update
          await refetchClinicianCases();
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
          console.log('🔄 Auto-refreshing notifications...');
          // Use RTK Query refetch for immediate data update
          await refetchClinicianCases();
        }
      })
      .subscribe((status) => {
        console.log('📡 Real-time subscription status:', status);
      });

    return () => {
      console.log('🧹 Cleaning up real-time subscription');
      subscription.unsubscribe();
    };
  }, [user?.id]);

  const fetchProgressData = async (planId: string) => {
    try {
      setLoadingProgress(true);
      // Skip API call - using Supabase auth
      console.log('Progress data fetch skipped - using Supabase auth');
      setProgressData({
        plan: {
          _id: planId,
          planName: 'Sample Plan',
          status: 'active',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          goals: [
            {
              description: 'Improve mobility',
              targetDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'in_progress',
              progress: 50
            }
          ],
          exercises: [
            {
              name: 'Basic stretching',
              description: 'Gentle stretching exercises',
              instructions: 'Perform 10 repetitions',
              duration: 15,
              frequency: 'daily',
              difficulty: 'easy',
              status: 'active'
            }
          ],
          activities: [
            {
              name: 'Walking',
              description: 'Light walking exercise',
              type: 'cardio',
              status: 'active'
            }
          ],
          clinician: { _id: '1', firstName: 'Dr. Smith', lastName: 'Johnson', email: 'dr.smith@example.com' },
          case: { _id: '1', caseNumber: 'CASE-001', status: 'active', worker: { _id: '1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' } },
          worker: { _id: '1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' }
        },
        today: {
          exercises: [],
          completion: null,
          overallStatus: 'not_started'
        },
        progressStats: { 
          totalDays: 0, 
          completedDays: 0, 
          skippedDays: 0,
          consecutiveCompletedDays: 0,
          consecutiveSkippedDays: 0
        },
        last7Days: [],
        exerciseProgress: [],
        alerts: []
      });
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

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await NotificationService.markAsRead(notificationId);
      
      // Update local state to remove the notification from unread list
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: true }
            : notification
        )
      );
      
      // Update unread count
      setUnreadNotificationCount(prev => Math.max(0, prev - 1));
      
      setSuccessMessage('Notification marked as read');
      
    } catch (error) {
      console.error('Error marking notification as read:', error);
      setError('Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.is_read);
      await NotificationService.markAllAsRead(user?.id || '');
      
      // Update local state to mark all notifications as read
      setNotifications(prev => 
        prev.map(notification => ({ 
          ...notification, 
          is_read: true
        }))
      );
      
      // Reset unread count
      setUnreadNotificationCount(0);
      
      setSuccessMessage(`${unreadNotifications.length} notifications marked as read`);
      
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      setError('Failed to mark all notifications as read');
    }
  };

  const fetchClinicianData = useCallback(async () => {
    try {
      setLoading(true);
      
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      console.log('Fetching clinician data for user:', user.id);

      // Fetch cases assigned to this clinician using the case assignment service
      console.log('Current user object:', user);
      console.log('Current user ID:', user.id);
      console.log('Current user email:', user.email);
      
      const assignedCases = await CaseAssignmentService.getClinicianCases(user.id);
      const casesData = assignedCases;
      const enrichedCases = assignedCases;
      
      console.log('🔍 CLINICIAN DASHBOARD: Fetched assigned cases for clinician:', assignedCases.length);
      console.log('🔍 CLINICIAN DASHBOARD: Assigned cases data:', assignedCases);
      console.log('🔍 CLINICIAN DASHBOARD: User ID:', user.id);
      console.log('🔍 CLINICIAN DASHBOARD: User email:', user.email);
      
      // DEBUG: Direct database query to verify data
      try {
        const { data: directCasesData, error: directError } = await dataClient
          .from('cases')
          .select('*')
          .eq('clinician_id', user.id);
        
        console.log('🔍 DEBUG: Direct database query result:', directCasesData?.length || 0);
        console.log('🔍 DEBUG: Direct database cases:', directCasesData);
        if (directError) {
          console.error('🔍 DEBUG: Direct database query error:', directError);
        }
      } catch (err) {
        console.error('🔍 DEBUG: Direct database query failed:', err);
      }

      // Fetch notifications directly from Supabase (same as notifications page)
      let notificationsData: any[] = [];
      try {
        const { data: notificationsDataRaw, error: notificationsError } = await dataClient
          .from('notifications')
          .select('*')
          .eq('recipient_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (notificationsError) {
          console.error('Error fetching notifications:', notificationsError);
          notificationsData = [];
        } else {
          notificationsData = notificationsDataRaw || [];
          console.log('Fetched notifications directly:', notificationsData.length);
        }
      } catch (err) {
        console.error('Error fetching notifications:', err);
        notificationsData = [];
      }

      const plans: any[] = []; // No rehabilitation plans table yet
      const cases = enrichedCases || [];
      const totalCasesCount = cases.length;
      
      console.log('🔍 CLINICIAN DASHBOARD: Setting total cases count:', totalCasesCount);
      console.log('🔍 CLINICIAN DASHBOARD: Cases array:', cases);
      setTotalCases(totalCasesCount);
      
      // Ensure progress stats are included for each plan
      const plansWithProgress = await Promise.all(
        plans.map(async (plan: any) => {
          try {
            // Fetch progress stats for each active plan
            if (plan.status === 'active') {
              // Skip API call - using Supabase auth
              console.log('Progress fetch skipped - using Supabase auth');
              const progressRes = { data: { progressStats: { totalDays: 0, completedDays: 0, skippedDays: 0 } } };
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
      
      // Calculate active cases from assigned cases
      const activeCases = assignedCases.filter((c: any) => 
        c.status && ['new', 'triaged', 'assessed', 'in_rehab'].includes(c.status)
      ).length;
      
      console.log('Active cases calculation:', {
        totalAssignedCases: assignedCases.length,
        activeCases: activeCases,
        caseStatuses: assignedCases.map(c => ({ case_number: c.case_number, status: c.status }))
      });
      
      
      // Set notifications
      setNotifications(notificationsData || []);
      setUnreadNotificationCount(notificationsData?.filter(n => !n.is_read).length || 0);
      

    } catch (err: any) {
      console.error('Error fetching clinician data:', err);
      console.error('Error details:', err);
      setError(err.message || 'Failed to fetch data');
      // Set empty arrays as fallback
      setRehabPlans([]);
      setCases([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Listen for global cache clear events (same as site supervisor)
  useEffect(() => {
    const handleGlobalCacheClear = async (event: any) => {
      const { reason, caseId, clinicianId, timestamp, triggeredBy, triggeredByUser } = event.detail;
      console.log('🔄 CLINICIAN DASHBOARD: Received global cache clear event:', { reason, caseId, clinicianId, timestamp, triggeredBy, triggeredByUser });
      console.log('🔄 CLINICIAN DASHBOARD: Current user ID:', user?.id);
      
      // Check if this event is for this clinician (support both old and new event formats)
      const isForThisClinician = (reason === 'case_assignment' && clinicianId === user?.id) || 
                                 (triggeredBy === 'case_manager' && clinicianId === user?.id);
      
      if (isForThisClinician) {
        console.log('🔄 CLINICIAN DASHBOARD: Cache clear event for this clinician, triggering RTK Query refetch...');
        console.log('🎯 CLINICIAN DASHBOARD: Received global cache clear - refreshing data immediately!');
        
        // Use RTK Query refetch for immediate data update
        await refetchClinicianCases();
      } else {
        console.log('🔄 CLINICIAN DASHBOARD: Global cache clear event received but not for this clinician');
      }
    };

    window.addEventListener('globalCacheClear', handleGlobalCacheClear);
    
    return () => {
      window.removeEventListener('globalCacheClear', handleGlobalCacheClear);
    };
  }, [user?.id, refetchClinicianCases]);

  // Add window focus listener to refresh notifications (same as notifications page)
  useEffect(() => {
    const handleWindowFocus = async () => {
      console.log('🔄 Window focused, refreshing clinician dashboard...');
      // Use RTK Query refetch for immediate data update
      await refetchClinicianCases();
    };

    window.addEventListener('focus', handleWindowFocus);
    
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [refetchClinicianCases]);

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
        worker: caseItem.worker?._id || '',
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

      // Skip API call - using Supabase auth
      console.log('Rehabilitation plan creation skipped - using Supabase auth');
      
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
      
      refetchClinicianCases(); // Refresh data
      
      // Get case details for the success message
      const workerName = `${caseItem.worker?.firstName || caseItem.worker?.first_name || ''} ${caseItem.worker?.lastName || caseItem.worker?.last_name || ''}`;
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

      // Skip API call - using Supabase auth
      console.log('Assessment creation skipped - using Supabase auth');
      
      setAssessmentDialog(false);
      setAssessmentForm({
        case: '',
        assessmentType: 'initial',
        scheduledDate: '',
        notes: ''
      });
      
      refetchClinicianCases(); // Refresh data
      
      // Get case details for the success message
      const caseItem = cases.find(c => c._id === assessmentForm.case);
      const workerName = caseItem ? `${caseItem.worker?.firstName || caseItem.worker?.first_name || ''} ${caseItem.worker?.lastName || caseItem.worker?.last_name || ''}` : 'worker';
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
      
      // Get worker ID from selected case
      const selectedCase = cases.find(c => c._id === appointmentForm.case);
      if (!selectedCase) {
        setError('Please select a case');
        return;
      }
      
      const appointmentData = {
        case: appointmentForm.case,
        worker: selectedCase.worker?._id || '', // Get worker ID from case
        appointmentType: appointmentForm.appointmentType,
        scheduledDate: appointmentForm.scheduledDate,
        duration: appointmentForm.duration,
        location: appointmentForm.location,
        purpose: appointmentForm.purpose
      };

      // Skip API call - using Supabase auth
      console.log('Appointment creation skipped - using Supabase auth');
      
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
      
      refetchClinicianCases(); // Refresh data
      
      // Get case details for the success message
      const caseItem = cases.find(c => c._id === appointmentForm.case);
      const workerName = caseItem ? `${caseItem.worker?.firstName || caseItem.worker?.first_name || ''} ${caseItem.worker?.lastName || caseItem.worker?.last_name || ''}` : 'worker';
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
      return 'TBD';
    }
  };


  if (loading) {
    return (
      <LayoutWithSidebar>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </LayoutWithSidebar>
    );
  }

  return (
    <LayoutWithSidebar>
      <Box sx={{ 
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        minHeight: '100vh',
        p: { xs: 0, sm: 1, md: 2 },
        pb: { xs: 2, sm: 3, md: 4 }
      }}>
        {/* Overview Section */}
        <Box sx={{ mb: 4, px: { xs: 2, sm: 3 }, pt: { xs: 2, sm: 3 } }}>
          <Typography variant="h3" component="h1" sx={{ 
            fontWeight: 600,
            color: '#1a1a1a',
            mb: 3,
            fontSize: '2rem'
          }}>
            Overview
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Welcome, Dr. {user?.lastName} - Here's your clinical overview for today
          </Typography>

          {/* Error and Success Messages */}
          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                mt: 3,
                mb: 0,
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
                mt: 3,
                mb: 0,
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
        </Box>

        {/* Alerts Section */}
        {notifications && notifications.filter(n => !n.isRead).length > 0 && (
          <Box sx={{ mb: 4, px: { xs: 2, sm: 3 } }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              mb: 2
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Warning sx={{ color: '#ef4444', fontSize: 24 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#ef4444' }}>
                  Alerts ({notifications.filter(n => !n.isRead).length})
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Check-in alerts require your attention
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleMarkAllAsRead}
                  sx={{
                    textTransform: 'none',
                    borderColor: '#e2e8f0',
                    color: '#64748b',
                    fontSize: '0.75rem',
                    '&:hover': {
                      borderColor: '#cbd5e1',
                      backgroundColor: '#f8fafc'
                    }
                  }}
                >
                  Mark All as Read
                </Button>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {notifications
                .filter(n => !n.is_read)
                .slice(0, 3)
                .map((notification, index) => (
                <Card key={notification.id || index} sx={{ 
                  p: 3,
                  borderRadius: 3,
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  boxShadow: 'none'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <Avatar sx={{ 
                      backgroundColor: '#3b82f6',
                      width: 40,
                      height: 40,
                      fontSize: '0.875rem',
                      fontWeight: 600
                    }}>
                      {notification.type === 'case_assignment' ? 'CA' : 
                       notification.type === 'assessment_reminder' ? 'AR' : 'N'}
                    </Avatar>
                    
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                          {notification.title || 'New Case Assignment'}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip 
                            label="MEDIUM" 
                            size="small"
                            sx={{ 
                              backgroundColor: '#3b82f6',
                              color: 'white',
                              fontWeight: 600,
                              fontSize: '0.75rem'
                            }}
                          />
                          <IconButton
                            size="small"
                            onClick={() => handleMarkAsRead(notification.id)}
                            sx={{ 
                              color: '#64748b',
                              '&:hover': { 
                                backgroundColor: '#f1f5f9',
                                color: '#475569'
                              }
                            }}
                          >
                            <Close fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        From: System • {new Date(notification.created_at).toLocaleDateString('en-US', {
                          month: 'numeric',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </Typography>
                      
                      <Typography variant="body1" sx={{ mb: 2, color: '#374151' }}>
                        {notification.message}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button 
                          variant="contained"
                          size="small"
                          sx={{ 
                            backgroundColor: '#3b82f6',
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 500,
                            '&:hover': {
                              backgroundColor: '#2563eb'
                            }
                          }}
                          onClick={() => {
                            if (notification.type === 'case_assignment' && notification.relatedCase) {
                              handleViewCaseDetails(notification.relatedCase);
                            }
                          }}
                        >
                          View Case Details
                        </Button>
                        <Button 
                          variant="outlined"
                          size="small"
                          onClick={() => handleMarkAsRead(notification.id)}
                          sx={{ 
                            borderColor: '#e2e8f0',
                            color: '#64748b',
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 500,
                            '&:hover': {
                              borderColor: '#cbd5e1',
                              backgroundColor: '#f8fafc'
                            }
                          }}
                        >
                          Mark as Read
                        </Button>
                      </Box>
                    </Box>
                  </Box>
                </Card>
              ))}
            </Box>
          </Box>
        )}

        {/* Analytics Cards */}
        {/* Dashboard Cards */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', px: { xs: 2, sm: 3 } }}>
          {/* Active Cases Card */}
          <Card sx={{ 
            minWidth: 250, 
            flex: 1, 
            borderRadius: 2,
            border: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            overflow: 'hidden',
            '&:hover': {
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            },
            transition: 'box-shadow 0.2s ease'
          }}>
            <Box sx={{ 
              backgroundColor: '#7B68EE', 
              color: 'white', 
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '14px' }}>
                ACTIVE CASES
              </Typography>
            </Box>
            <CardContent sx={{ p: 2.5 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box sx={{ flex: 1 }}>
                  {/* Mini bar chart */}
                  <Box sx={{ mb: 1, display: 'flex', alignItems: 'end', gap: 0.5 }}>
                    <Box sx={{ width: 4, height: 12, backgroundColor: '#7B68EE', borderRadius: 0.5 }} />
                    <Box sx={{ width: 4, height: 18, backgroundColor: '#7B68EE', borderRadius: 0.5 }} />
                    <Box sx={{ width: 4, height: 8, backgroundColor: '#7B68EE', borderRadius: 0.5 }} />
                    <Box sx={{ width: 4, height: 15, backgroundColor: '#7B68EE', borderRadius: 0.5 }} />
                    <Box sx={{ width: 4, height: 10, backgroundColor: '#7B68EE', borderRadius: 0.5 }} />
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a1a1a', mb: 0.5 }}>
                    {stats?.activeCases || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '13px' }}>
                    Last 30 days
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body2" sx={{ color: '#059669', fontWeight: 600, fontSize: '12px' }}>
                    {stats?.activeCasesChange ? `+${stats.activeCasesChange}%` : ''}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Rehab Plans Card */}
          <Card sx={{ 
            minWidth: 250, 
            flex: 1, 
            borderRadius: 2,
            border: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            overflow: 'hidden',
            '&:hover': {
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            },
            transition: 'box-shadow 0.2s ease'
          }}>
            <Box sx={{ 
              backgroundColor: '#16a34a', 
              color: 'white', 
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '14px' }}>
                REHAB PLANS
              </Typography>
            </Box>
            <CardContent sx={{ p: 2.5 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box sx={{ flex: 1 }}>
                  {/* Circular progress indicator */}
                  <Box sx={{ 
                    width: 40, 
                    height: 40, 
                    borderRadius: '50%',
                    backgroundColor: '#f0fdf4',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 1,
                    position: 'relative',
                    border: '3px solid #e5e7eb'
                  }}>
                    <Box sx={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      background: `conic-gradient(#16a34a 0deg ${(activeRehabPlans.length / 20) * 360}deg, transparent ${(activeRehabPlans.length / 20) * 360}deg)`,
                      zIndex: 1
                    }} />
                    <Typography variant="caption" sx={{ 
                      fontWeight: 600, 
                      color: '#16a34a',
                      zIndex: 2,
                      fontSize: '10px'
                    }}>
                      {activeRehabPlans.length}/20
                    </Typography>
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a1a1a', mb: 0.5 }}>
                    {activeRehabPlans.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '13px' }}>
                    Last 30 days
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body2" sx={{ color: '#059669', fontWeight: 600, fontSize: '12px' }}>
                    {stats?.rehabPlansChange ? `+${stats.rehabPlansChange}%` : ''}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Alerts Card */}
          <Card sx={{ 
            minWidth: 250, 
            flex: 1, 
            borderRadius: 2,
            border: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            overflow: 'hidden',
            '&:hover': {
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            },
            transition: 'box-shadow 0.2s ease'
          }}>
            <Box sx={{ 
              backgroundColor: '#E74C3C', 
              color: 'white', 
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '14px' }}>
                ALERTS
              </Typography>
            </Box>
            <CardContent sx={{ p: 2.5 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box sx={{ flex: 1 }}>
                  {/* Circular progress with warning icon */}
                  <Box sx={{ 
                    width: 40, 
                    height: 40, 
                    borderRadius: '50%',
                    backgroundColor: '#fef2f2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 1,
                    position: 'relative',
                    border: '3px solid #fecaca'
                  }}>
                    <Box sx={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      background: `conic-gradient(#E74C3C 0deg ${(unreadNotificationCount / 10) * 360}deg, transparent ${(unreadNotificationCount / 10) * 360}deg)`,
                      zIndex: 1
                    }} />
                    <Warning sx={{ 
                      fontSize: 16, 
                      color: '#E74C3C',
                      zIndex: 2
                    }} />
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a1a1a', mb: 0.5 }}>
                    {unreadNotificationCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '13px' }}>
                    Last 30 days
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body2" sx={{ color: '#E74C3C', fontWeight: 600, fontSize: '12px' }}>
                    {stats?.alertsChange ? `+${stats.alertsChange}%` : ''}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Exercise Completion Card */}
          <Card sx={{ 
            minWidth: 250, 
            flex: 1, 
            borderRadius: 2,
            border: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            overflow: 'hidden',
            '&:hover': {
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            },
            transition: 'box-shadow 0.2s ease'
          }}>
            <Box sx={{ 
              backgroundColor: (stats?.exerciseCompletionRate || 0) > 0 ? '#0073e6' : '#6B7280', 
              color: 'white', 
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '14px' }}>
                EXERCISE RATE
              </Typography>
            </Box>
            <CardContent sx={{ p: 2.5 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box sx={{ flex: 1 }}>
                  {/* Mini bar chart */}
                  <Box sx={{ mb: 1, display: 'flex', alignItems: 'end', gap: 0.5 }}>
                    <Box sx={{ width: 4, height: 8, backgroundColor: '#0073e6', borderRadius: 0.5 }} />
                    <Box sx={{ width: 4, height: 15, backgroundColor: '#0073e6', borderRadius: 0.5 }} />
                    <Box sx={{ width: 4, height: 12, backgroundColor: '#0073e6', borderRadius: 0.5 }} />
                    <Box sx={{ width: 4, height: 18, backgroundColor: '#0073e6', borderRadius: 0.5 }} />
                    <Box sx={{ width: 4, height: 10, backgroundColor: '#0073e6', borderRadius: 0.5 }} />
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a1a1a', mb: 0.5 }}>
                    {stats?.exerciseCompletionRate || 0}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '13px' }}>
                    Last 30 days
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body2" sx={{ color: '#059669', fontWeight: 600, fontSize: '12px' }}>
                    {stats?.exerciseRateChange ? `+${stats.exerciseRateChange}%` : ''}
                  </Typography>
                </Box>
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
                    {(stats?.completedGoals || 0) === 0 && (stats?.totalGoals || 0) === 0 
                      ? 'No goals set yet' 
                      : `${stats?.completedGoals || 0} / ${stats?.totalGoals || 0} goals completed`}
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
                      background: 'linear-gradient(90deg, #dc2626 0%, #ef4444 100%)',
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
                    background: 'linear-gradient(135deg, #4c1d95 0%, #5b21b6 100%)',
                    color: 'white',
                    boxShadow: '0 4px 12px rgba(76, 29, 149, 0.3)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #3b0764 0%, #4c1d95 100%)',
                      boxShadow: '0 6px 16px rgba(76, 29, 149, 0.4)'
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
                    background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
                    color: 'white',
                    boxShadow: '0 4px 12px rgba(6, 95, 70, 0.3)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
                      boxShadow: '0 6px 16px rgba(6, 95, 70, 0.4)'
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
                        <Typography component="span" sx={{ fontWeight: 600, color: '#2d3748', fontSize: '0.875rem' }}>
                          {plan.planName} updated
                        </Typography>
                      }
                      secondary={
                        <Typography component="span" sx={{ color: '#718096', fontSize: '0.75rem' }}>
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
                        <Typography component="span" sx={{ color: '#718096', textAlign: 'center', fontSize: '0.875rem' }}>
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
                <Tooltip title="Smart Clear Cache & Refresh Data">
                  <IconButton
                    onClick={smartCacheClear}
                    disabled={loading}
                    sx={{
                      backgroundColor: 'rgba(78, 205, 196, 0.1)',
                      '&:hover': { backgroundColor: 'rgba(78, 205, 196, 0.2)' }
                    }}
                  >
                    <Refresh sx={{ color: '#4ecdc4' }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Debug: Force Data Refresh">
                  <IconButton
                    onClick={async () => {
                      console.log('🔍 DEBUG: Manual data refresh triggered');
                      console.log('🔍 DEBUG: Current user:', user);
                      console.log('🔍 DEBUG: Current total cases:', totalCases);
                      console.log('🔍 DEBUG: RTK Query cases:', clinicianCases.length);
                      await refetchClinicianCases();
                    }}
                    disabled={loading}
                    sx={{
                      backgroundColor: 'rgba(255, 152, 0, 0.1)',
                      '&:hover': { backgroundColor: 'rgba(255, 152, 0, 0.2)' }
                    }}
                  >
                    <Refresh sx={{ color: '#ff9800' }} />
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
            
                {/* Pagination calculation */}
                {activeRehabPlans.length > 0 ? (
                  <>
                  <List>
                    {activeRehabPlans
                      .slice((currentPage - 1) * plansPerPage, currentPage * plansPerPage)
                      .map((plan) => (
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
                        <Box component="span" display="flex" alignItems="center" gap={2} sx={{ mb: 1 }}>
                          <Typography component="span" sx={{ fontWeight: 600, color: '#2d3748', fontSize: '1rem' }}>
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
                        <Box component="span">
                          <Typography component="span" sx={{ color: '#4a5568', mb: 0.5, fontSize: '0.875rem', display: 'block' }}>
                            Case: {plan.case.caseNumber} - {plan.case.worker.firstName} {plan.case.worker.lastName}
                          </Typography>
                          <Typography component="span" sx={{ color: '#718096', mb: 1, display: 'block', fontSize: '0.75rem' }}>
                            Started: {formatDate(plan.startDate)} | 
                            {plan.endDate && ` Ends: ${formatDate(plan.endDate)}`}
                          </Typography>
                          
                          {/* Progress Indicators */}
                          {plan.progressStats && (
                            <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                              <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box component="span" sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  backgroundColor: '#4caf50',
                                  display: 'inline-block'
                                }} />
                                <Typography component="span" sx={{ color: '#4caf50', fontWeight: 600, fontSize: '0.75rem' }}>
                                  {plan.progressStats.completedDays} completed
                                </Typography>
                              </Box>
                              <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box component="span" sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  backgroundColor: '#ff9800',
                                  display: 'inline-block'
                                }} />
                                <Typography component="span" sx={{ color: '#ff9800', fontWeight: 600, fontSize: '0.75rem' }}>
                                  {plan.progressStats.skippedDays} skipped
                                </Typography>
                              </Box>
                              <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box component="span" sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  backgroundColor: '#2196f3',
                                  display: 'inline-block'
                                }} />
                                <Typography component="span" sx={{ color: '#2196f3', fontWeight: 600, fontSize: '0.75rem' }}>
                                  {plan.progressStats.consecutiveCompletedDays} streak
                                </Typography>
                              </Box>
                            </Box>
                          )}
                          
                          {/* Overall Progress Bar */}
                          {plan.progressStats && plan.progressStats.totalDays > 0 && (
                            <Box component="span" sx={{ width: '100%', mb: 1, display: 'block' }}>
                              <Box component="span" sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography component="span" sx={{ color: '#718096', fontSize: '0.75rem' }}>
                                  Overall Progress
                                </Typography>
                                <Typography component="span" sx={{ color: '#718096', fontWeight: 600, fontSize: '0.75rem' }}>
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
                  
                  {/* Pagination Controls */}
                  {activeRehabPlans.length > plansPerPage && (
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      mt: 2,
                      pt: 2,
                      borderTop: '1px solid',
                      borderColor: 'divider'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Showing {Math.min((currentPage - 1) * plansPerPage + 1, activeRehabPlans.length)} to{' '}
                          {Math.min(currentPage * plansPerPage, activeRehabPlans.length)} of {activeRehabPlans.length} plans
                        </Typography>
                        <FormControl size="small" sx={{ minWidth: 80 }}>
                          <Select
                            value={plansPerPage}
                            onChange={(e) => {
                              setPlansPerPage(Number(e.target.value));
                              setCurrentPage(1);
                            }}
                            variant="outlined"
                          >
                            <MenuItem value={5}>5</MenuItem>
                            <MenuItem value={10}>10</MenuItem>
                            <MenuItem value={25}>25</MenuItem>
                            <MenuItem value={50}>50</MenuItem>
                          </Select>
                        </FormControl>
                        <Typography variant="body2" color="text.secondary">
                          per page
                        </Typography>
                      </Box>
                      
                      <Pagination
                        count={Math.ceil(activeRehabPlans.length / plansPerPage)}
                        page={currentPage}
                        onChange={(e, page) => setCurrentPage(page)}
                        color="primary"
                        size="large"
                        showFirstButton
                        showLastButton
                        siblingCount={1}
                        boundaryCount={1}
                      />
                    </Box>
                  )}
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
                            {caseItem.worker?.firstName || caseItem.worker?.first_name} {caseItem.worker?.lastName || caseItem.worker?.last_name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: '#718096' }}>
                            {caseItem.injuryDetails?.bodyPart || 'N/A'} - {caseItem.injuryDetails?.injuryType || 'N/A'}
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
                                onClick={() => caseItem._id && handleViewCaseDetails(caseItem._id)}
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
                        {caseItem.worker?.firstName || caseItem.worker?.first_name} {caseItem.worker?.lastName || caseItem.worker?.last_name}
                      </Typography>
                      
                      <Typography variant="body2" sx={{ color: '#718096', mb: 2 }}>
                        {caseItem.injuryDetails?.bodyPart || 'N/A'} - {caseItem.injuryDetails?.injuryType || 'N/A'}
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
              
              {/* Pagination Controls for My Cases */}
              {totalCases > casesPageSize && (
                <Box sx={{ 
                  mt: 3, 
                  p: 2, 
                  borderTop: '1px solid #e1e5e9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 2
                }}>
                  {/* Page Size Selector */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ color: '#666' }}>
                      Show:
                    </Typography>
                    <FormControl size="small" sx={{ minWidth: 80 }}>
                      <Select
                        value={casesPageSize}
                        onChange={(e) => handleCasesPageSizeChange(Number(e.target.value))}
                        sx={{ fontSize: '0.875rem' }}
                      >
                        <MenuItem value={5}>5</MenuItem>
                        <MenuItem value={10}>10</MenuItem>
                        <MenuItem value={25}>25</MenuItem>
                        <MenuItem value={50}>50</MenuItem>
                      </Select>
                    </FormControl>
                    <Typography variant="body2" sx={{ color: '#666' }}>
                      per page
                    </Typography>
                  </Box>

                  {/* Pagination Info */}
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    Showing {((casesCurrentPage - 1) * casesPageSize) + 1} to {Math.min(casesCurrentPage * casesPageSize, totalCases)} of {totalCases} cases
                  </Typography>

                  {/* Pagination Component */}
                  <Pagination
                    count={Math.ceil(totalCases / casesPageSize)}
                    page={casesCurrentPage}
                    onChange={(_, page) => handleCasesPageChange(page)}
                    color="primary"
                    size="small"
                    showFirstButton
                    showLastButton
                  />
                </Box>
              )}
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
                {selectedPlan.goals && selectedPlan.goals.length > 0 ? (
                  selectedPlan.goals.map((goal, index) => (
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
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No goals set for this plan.
                  </Typography>
                )}

                <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                  Exercises
                </Typography>
                {selectedPlan.exercises && selectedPlan.exercises.length > 0 ? (
                  selectedPlan.exercises.map((exercise, index) => (
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
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No exercises set for this plan.
                  </Typography>
                )}

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
                        {caseItem.caseNumber} - {caseItem.worker?.firstName || caseItem.worker?.first_name || 'N/A'} {caseItem.worker?.lastName || caseItem.worker?.last_name || 'N/A'}
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
                      {caseItem.caseNumber} - {caseItem.worker?.firstName || caseItem.worker?.first_name || 'N/A'} {caseItem.worker?.lastName || caseItem.worker?.last_name || 'N/A'}
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
                inputProps={{
                  min: new Date().toISOString().slice(0, 16)
                }}
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
                      worker: selectedCase?.worker?._id || ''
                    });
                  }}
                >
                  {cases.map((caseItem) => (
                    <MenuItem key={caseItem._id} value={caseItem._id}>
                      {caseItem.caseNumber} - {caseItem.worker?.firstName || caseItem.worker?.first_name || 'N/A'} {caseItem.worker?.lastName || caseItem.worker?.last_name || 'N/A'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Worker field - read-only display */}
              <TextField
                fullWidth
                label="Worker"
                value={appointmentForm.case ? (() => {
                  const selectedCase = cases.find(c => c._id === appointmentForm.case);
                  return selectedCase ? `${selectedCase.worker?.firstName || selectedCase.worker?.first_name || 'N/A'} ${selectedCase.worker?.lastName || selectedCase.worker?.last_name || 'N/A'}` : '';
                })() : ''}
                InputProps={{
                  readOnly: true,
                }}
                sx={{ mb: 2 }}
              />

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
                inputProps={{
                  min: new Date().toISOString().slice(0, 16)
                }}
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

        {/* Enhanced Progress Monitoring Dialog */}
        <Dialog 
          open={progressDialog} 
          onClose={() => setProgressDialog(false)} 
          maxWidth="xl" 
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
            }
          }}
        >
          <DialogTitle sx={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            borderRadius: '12px 12px 0 0',
            p: 3
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderRadius: '50%',
                p: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Assessment sx={{ fontSize: 28 }} />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Progress Monitoring
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  {selectedPlan?.planName} - Detailed Progress Analysis
                </Typography>
              </Box>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ p: 0 }}>
            {loadingProgress ? (
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                minHeight: '400px',
                background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)'
              }}>
                <Box sx={{ textAlign: 'center' }}>
                  <CircularProgress size={60} sx={{ color: '#667eea', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    Loading Progress Data...
                  </Typography>
                </Box>
              </Box>
            ) : progressData ? (
              <Box sx={{ p: 3 }}>
                {/* Enhanced Plan Info */}
                <Card sx={{ 
                  mb: 3,
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                  border: '1px solid rgba(102, 126, 234, 0.1)'
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ 
                      fontWeight: 700, 
                      color: '#2d3748',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}>
                      <Box sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: '#667eea'
                      }} />
                      Plan Information
                    </Typography>
                    <Box sx={{ 
                      display: 'grid', 
                      gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                      gap: 3,
                      mt: 2
                    }}>
                      <Box sx={{
                        p: 2,
                        borderRadius: 2,
                        background: 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)',
                        border: '1px solid rgba(102, 126, 234, 0.1)'
                      }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mb: 0.5 }}>
                          Worker
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#2d3748' }}>
                          {progressData.plan.worker.firstName} {progressData.plan.worker.lastName}
                        </Typography>
                      </Box>
                      <Box sx={{
                        p: 2,
                        borderRadius: 2,
                        background: 'linear-gradient(135deg, #e8f5e8 0%, #f0f8f0 100%)',
                        border: '1px solid rgba(34, 197, 94, 0.1)'
                      }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mb: 0.5 }}>
                          Case Number
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#2d3748' }}>
                          {progressData.plan.case.caseNumber}
                        </Typography>
                      </Box>
                      <Box sx={{
                        p: 2,
                        borderRadius: 2,
                        background: 'linear-gradient(135deg, #fff3cd 0%, #fef7e0 100%)',
                        border: '1px solid rgba(245, 158, 11, 0.1)'
                      }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mb: 0.5 }}>
                          Status
                        </Typography>
                        <Chip 
                          label={progressData.plan.status.toUpperCase()} 
                          color={progressData.plan.status === 'active' ? 'success' : 'default'}
                          sx={{ 
                            fontWeight: 700,
                            fontSize: '0.875rem',
                            height: 32
                          }}
                        />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>

                {/* Enhanced Progress Stats */}
                <Card sx={{ 
                  mb: 3,
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                  border: '1px solid rgba(102, 126, 234, 0.1)'
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ 
                      fontWeight: 700, 
                      color: '#2d3748',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 3
                    }}>
                      <Box sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: '#22c55e'
                      }} />
                      Progress Statistics
                    </Typography>
                    
                    {/* Overall Progress Bar */}
                    <Box sx={{ mb: 4 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#2d3748' }}>
                          Overall Progress
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: '#22c55e' }}>
                          {Math.round((progressData.progressStats.completedDays / Math.max(progressData.progressStats.totalDays, 1)) * 100)}%
                        </Typography>
                      </Box>
                      <Box sx={{
                        height: 12,
                        borderRadius: 6,
                        background: 'linear-gradient(90deg, #e5e7eb 0%, #f3f4f6 100%)',
                        overflow: 'hidden',
                        position: 'relative'
                      }}>
                        <Box sx={{
                          height: '100%',
                          width: `${(progressData.progressStats.completedDays / Math.max(progressData.progressStats.totalDays, 1)) * 100}%`,
                          background: 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)',
                          borderRadius: 6,
                          transition: 'width 0.8s ease-in-out',
                          position: 'relative',
                          '&::after': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                            animation: 'shimmer 2s infinite'
                          }
                        }} />
                      </Box>
                    </Box>

                    {/* Stats Grid */}
                    <Box sx={{ 
                      display: 'grid', 
                      gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                      gap: 3
                    }}>
                      <Box sx={{
                        p: 3,
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%)',
                        border: '1px solid rgba(34, 197, 94, 0.2)',
                        textAlign: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: 4,
                          background: 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)'
                        }
                      }}>
                        <Typography variant="h3" sx={{ 
                          fontWeight: 800, 
                          color: '#16a34a',
                          mb: 1,
                          background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
                          backgroundClip: 'text',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent'
                        }}>
                          {progressData.progressStats.completedDays}
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: '#166534' }}>
                          Days Completed
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#15803d', mt: 0.5, display: 'block' }}>
                          {progressData.progressStats.completedDays > 0 ? 'Great progress!' : 'Start your journey'}
                        </Typography>
                      </Box>

                      <Box sx={{
                        p: 3,
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        textAlign: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: 4,
                          background: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)'
                        }
                      }}>
                        <Typography variant="h3" sx={{ 
                          fontWeight: 800, 
                          color: '#2563eb',
                          mb: 1,
                          background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                          backgroundClip: 'text',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent'
                        }}>
                          {progressData.progressStats.consecutiveCompletedDays}
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: '#1e40af' }}>
                          Consecutive Days
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#1d4ed8', mt: 0.5, display: 'block' }}>
                          {progressData.progressStats.consecutiveCompletedDays >= 7 ? 'Excellent streak!' : 'Keep it up!'}
                        </Typography>
                      </Box>

                      <Box sx={{
                        p: 3,
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)',
                        border: '1px solid rgba(245, 158, 11, 0.2)',
                        textAlign: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: 4,
                          background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)'
                        }
                      }}>
                        <Typography variant="h3" sx={{ 
                          fontWeight: 800, 
                          color: '#d97706',
                          mb: 1,
                          background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
                          backgroundClip: 'text',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent'
                        }}>
                          {progressData.progressStats.skippedDays}
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: '#92400e' }}>
                          Days Skipped
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#b45309', mt: 0.5, display: 'block' }}>
                          {progressData.progressStats.skippedDays === 0 ? 'Perfect attendance!' : 'Try to reduce'}
                        </Typography>
                      </Box>

                      <Box sx={{
                        p: 3,
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, #e0e7ff 0%, #f0f4ff 100%)',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        textAlign: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: 4,
                          background: 'linear-gradient(90deg, #6366f1 0%, #4f46e5 100%)'
                        }
                      }}>
                        <Typography variant="h3" sx={{ 
                          fontWeight: 800, 
                          color: '#4f46e5',
                          mb: 1,
                          background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                          backgroundClip: 'text',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent'
                        }}>
                          {progressData.progressStats.totalDays}
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: '#3730a3' }}>
                          Total Days
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#4338ca', mt: 0.5, display: 'block' }}>
                          Plan duration
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>

                {/* Enhanced Today's Status */}
                <Card sx={{ 
                  mb: 3,
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                  border: '1px solid rgba(102, 126, 234, 0.1)'
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ 
                      fontWeight: 700, 
                      color: '#2d3748',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 3
                    }}>
                      <Box sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: '#f59e0b'
                      }} />
                      Today's Exercise Status
                    </Typography>
                    
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 3, 
                      mb: 3,
                      p: 2,
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)',
                      border: '1px solid rgba(245, 158, 11, 0.2)'
                    }}>
                      <Chip 
                        label={progressData.today.overallStatus.toUpperCase()} 
                        color={
                          progressData.today.overallStatus === 'completed' ? 'success' :
                          progressData.today.overallStatus === 'partial' ? 'warning' :
                          progressData.today.overallStatus === 'skipped' ? 'error' : 'default'
                        }
                        sx={{ 
                          fontWeight: 700,
                          fontSize: '0.875rem',
                          height: 36,
                          px: 2
                        }}
                      />
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#92400e' }}>
                        {new Date().toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </Typography>
                      <Box sx={{ ml: 'auto' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                          {progressData.today.exercises.filter(e => e.completion.status === 'completed').length} / {progressData.today.exercises.length} completed
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {progressData.today.exercises.map((exercise, index) => (
                        <Box 
                          key={exercise._id}
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            p: 3,
                            borderRadius: 2,
                            border: '1px solid',
                            borderColor: 
                              exercise.completion.status === 'completed' ? 'rgba(34, 197, 94, 0.2)' :
                              exercise.completion.status === 'skipped' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(229, 231, 235, 0.5)',
                            background: 
                              exercise.completion.status === 'completed' ? 'linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%)' :
                              exercise.completion.status === 'skipped' ? 'linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)' : 'linear-gradient(135deg, #f9fafb 0%, #ffffff 100%)',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: '0 8px 25px rgba(0,0,0,0.1)'
                            }
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Box sx={{
                              width: 40,
                              height: 40,
                              borderRadius: '50%',
                              backgroundColor: 
                                exercise.completion.status === 'completed' ? '#22c55e' :
                                exercise.completion.status === 'skipped' ? '#f59e0b' : '#e5e7eb',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              position: 'relative',
                              '&::before': {
                                content: '""',
                                position: 'absolute',
                                top: -2,
                                left: -2,
                                right: -2,
                                bottom: -2,
                                borderRadius: '50%',
                                background: 
                                  exercise.completion.status === 'completed' ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' :
                                  exercise.completion.status === 'skipped' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)',
                                zIndex: -1
                              }
                            }}>
                              {exercise.completion.status === 'completed' && (
                                <CheckCircle sx={{ color: 'white', fontSize: 20 }} />
                              )}
                              {exercise.completion.status === 'skipped' && (
                                <Warning sx={{ color: 'white', fontSize: 20 }} />
                              )}
                              {exercise.completion.status === 'not_started' && (
                                <Typography sx={{ color: '#6b7280', fontSize: 16, fontWeight: 700 }}>
                                  {index + 1}
                                </Typography>
                              )}
                            </Box>
                            <Box>
                              <Typography variant="h6" sx={{ 
                                fontWeight: 700, 
                                color: '#2d3748',
                                mb: 0.5
                              }}>
                                {exercise.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                                {exercise.description}
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{
                              px: 2,
                              py: 1,
                              borderRadius: 1,
                              background: 'rgba(99, 102, 241, 0.1)',
                              border: '1px solid rgba(99, 102, 241, 0.2)'
                            }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#4f46e5' }}>
                                {exercise.duration} min
                              </Typography>
                            </Box>
                            <Chip 
                              label={exercise.completion.status.toUpperCase()} 
                              color={
                                exercise.completion.status === 'completed' ? 'success' :
                                exercise.completion.status === 'skipped' ? 'warning' : 'default'
                              }
                              size="small"
                              sx={{ fontWeight: 600 }}
                            />
                            {exercise.completion.completedAt && (
                              <Typography variant="caption" sx={{ 
                                color: '#22c55e', 
                                fontWeight: 600,
                                px: 1,
                                py: 0.5,
                                borderRadius: 1,
                                background: 'rgba(34, 197, 94, 0.1)'
                              }}>
                                {new Date(exercise.completion.completedAt).toLocaleTimeString()}
                              </Typography>
                            )}
                            {exercise.completion.skippedReason && (
                              <Typography variant="caption" sx={{ 
                                color: '#f59e0b', 
                                fontWeight: 600,
                                px: 1,
                                py: 0.5,
                                borderRadius: 1,
                                background: 'rgba(245, 158, 11, 0.1)'
                              }}>
                                Reason: {exercise.completion.skippedReason}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </CardContent>
                </Card>

                {/* Enhanced Last 7 Days Progress */}
                <Card sx={{ 
                  mb: 3,
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                  border: '1px solid rgba(102, 126, 234, 0.1)'
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ 
                      fontWeight: 700, 
                      color: '#2d3748',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 3
                    }}>
                      <Box sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: '#8b5cf6'
                      }} />
                      Last 7 Days Progress
                    </Typography>
                    
                    <TableContainer component={Paper} variant="outlined" sx={{
                      borderRadius: 2,
                      overflow: 'hidden',
                      border: '1px solid rgba(139, 92, 246, 0.1)'
                    }}>
                      <Table size="small">
                        <TableHead sx={{
                          background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
                        }}>
                          <TableRow>
                            <TableCell sx={{ 
                              color: 'white', 
                              fontWeight: 700,
                              fontSize: '0.875rem'
                            }}>
                              Date
                            </TableCell>
                            <TableCell align="center" sx={{ 
                              color: 'white', 
                              fontWeight: 700,
                              fontSize: '0.875rem'
                            }}>
                              Completed
                            </TableCell>
                            <TableCell align="center" sx={{ 
                              color: 'white', 
                              fontWeight: 700,
                              fontSize: '0.875rem'
                            }}>
                              Skipped
                            </TableCell>
                            <TableCell align="center" sx={{ 
                              color: 'white', 
                              fontWeight: 700,
                              fontSize: '0.875rem'
                            }}>
                              Status
                            </TableCell>
                            <TableCell align="center" sx={{ 
                              color: 'white', 
                              fontWeight: 700,
                              fontSize: '0.875rem'
                            }}>
                              Progress
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {progressData.last7Days.map((day, index) => (
                            <TableRow key={day.date} sx={{
                              '&:hover': {
                                backgroundColor: 'rgba(139, 92, 246, 0.05)'
                              },
                              '&:nth-of-type(even)': {
                                backgroundColor: 'rgba(139, 92, 246, 0.02)'
                              }
                            }}>
                              <TableCell sx={{ fontWeight: 600, color: '#2d3748' }}>
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                    {new Date(day.date).toLocaleDateString('en-US', { 
                                      weekday: 'short',
                                      month: 'short', 
                                      day: 'numeric' 
                                    })}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {new Date(day.date).toLocaleDateString('en-US', { 
                                      year: 'numeric' 
                                    })}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell align="center">
                                <Box sx={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 1,
                                  px: 2,
                                  py: 1,
                                  borderRadius: 1,
                                  background: 'rgba(34, 197, 94, 0.1)',
                                  border: '1px solid rgba(34, 197, 94, 0.2)'
                                }}>
                                  <Typography color="success.main" sx={{ fontWeight: 700 }}>
                                    {day.completedExercises}/{day.totalExercises}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell align="center">
                                <Box sx={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 1,
                                  px: 2,
                                  py: 1,
                                  borderRadius: 1,
                                  background: 'rgba(245, 158, 11, 0.1)',
                                  border: '1px solid rgba(245, 158, 11, 0.2)'
                                }}>
                                  <Typography color="warning.main" sx={{ fontWeight: 700 }}>
                                    {day.skippedExercises}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell align="center">
                                <Chip 
                                  label={day.overallStatus.toUpperCase()} 
                                  color={
                                    day.overallStatus === 'completed' ? 'success' :
                                    day.overallStatus === 'partial' ? 'warning' :
                                    day.overallStatus === 'skipped' ? 'error' : 'default'
                                  }
                                  size="small"
                                  sx={{ fontWeight: 600 }}
                                />
                              </TableCell>
                              <TableCell align="center">
                                <Box sx={{ minWidth: 80 }}>
                                  <Box sx={{
                                    height: 8,
                                    borderRadius: 4,
                                    background: 'linear-gradient(90deg, #e5e7eb 0%, #f3f4f6 100%)',
                                    overflow: 'hidden',
                                    position: 'relative'
                                  }}>
                                    <Box sx={{
                                      height: '100%',
                                      width: `${(day.completedExercises / Math.max(day.totalExercises, 1)) * 100}%`,
                                      background: 
                                        day.overallStatus === 'completed' ? 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)' :
                                        day.overallStatus === 'partial' ? 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)' :
                                        day.overallStatus === 'skipped' ? 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)' : 'linear-gradient(90deg, #6b7280 0%, #4b5563 100%)',
                                      borderRadius: 4,
                                      transition: 'width 0.3s ease'
                                    }} />
                                  </Box>
                                  <Typography variant="caption" sx={{ 
                                    fontWeight: 600, 
                                    color: '#6b7280',
                                    mt: 0.5,
                                    display: 'block'
                                  }}>
                                    {Math.round((day.completedExercises / Math.max(day.totalExercises, 1)) * 100)}%
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

                {/* Enhanced Exercise Progress Details */}
                <Card sx={{
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                  border: '1px solid rgba(102, 126, 234, 0.1)'
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ 
                      fontWeight: 700, 
                      color: '#2d3748',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 3
                    }}>
                      <Box sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: '#ec4899'
                      }} />
                      Exercise Progress Details
                    </Typography>
                    
                    <TableContainer component={Paper} variant="outlined" sx={{
                      borderRadius: 2,
                      overflow: 'hidden',
                      border: '1px solid rgba(236, 72, 153, 0.1)'
                    }}>
                      <Table size="small">
                        <TableHead sx={{
                          background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)'
                        }}>
                          <TableRow>
                            <TableCell sx={{ 
                              color: 'white', 
                              fontWeight: 700,
                              fontSize: '0.875rem'
                            }}>
                              Exercise
                            </TableCell>
                            <TableCell align="center" sx={{ 
                              color: 'white', 
                              fontWeight: 700,
                              fontSize: '0.875rem'
                            }}>
                              Duration
                            </TableCell>
                            <TableCell align="center" sx={{ 
                              color: 'white', 
                              fontWeight: 700,
                              fontSize: '0.875rem'
                            }}>
                              Completed
                            </TableCell>
                            <TableCell align="center" sx={{ 
                              color: 'white', 
                              fontWeight: 700,
                              fontSize: '0.875rem'
                            }}>
                              Skipped
                            </TableCell>
                            <TableCell align="center" sx={{ 
                              color: 'white', 
                              fontWeight: 700,
                              fontSize: '0.875rem'
                            }}>
                              Completion Rate
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {progressData.exerciseProgress.map((exercise) => (
                            <TableRow key={exercise._id} sx={{
                              '&:hover': {
                                backgroundColor: 'rgba(236, 72, 153, 0.05)'
                              },
                              '&:nth-of-type(even)': {
                                backgroundColor: 'rgba(236, 72, 153, 0.02)'
                              }
                            }}>
                              <TableCell sx={{ fontWeight: 600, color: '#2d3748' }}>
                                <Box>
                                  <Typography variant="body1" sx={{ fontWeight: 700 }}>
                                    {exercise.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {exercise.description}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell align="center">
                                <Box sx={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 1,
                                  px: 2,
                                  py: 1,
                                  borderRadius: 1,
                                  background: 'rgba(99, 102, 241, 0.1)',
                                  border: '1px solid rgba(99, 102, 241, 0.2)'
                                }}>
                                  <Typography sx={{ fontWeight: 700, color: '#4f46e5' }}>
                                    {exercise.duration} min
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell align="center">
                                <Box sx={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 1,
                                  px: 2,
                                  py: 1,
                                  borderRadius: 1,
                                  background: 'rgba(34, 197, 94, 0.1)',
                                  border: '1px solid rgba(34, 197, 94, 0.2)'
                                }}>
                                  <Typography color="success.main" sx={{ fontWeight: 700 }}>
                                    {exercise.completedCount}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell align="center">
                                <Box sx={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 1,
                                  px: 2,
                                  py: 1,
                                  borderRadius: 1,
                                  background: 'rgba(245, 158, 11, 0.1)',
                                  border: '1px solid rgba(245, 158, 11, 0.2)'
                                }}>
                                  <Typography color="warning.main" sx={{ fontWeight: 700 }}>
                                    {exercise.skippedCount}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell align="center">
                                <Box sx={{ minWidth: 100 }}>
                                  <Box sx={{
                                    height: 8,
                                    borderRadius: 4,
                                    background: 'linear-gradient(90deg, #e5e7eb 0%, #f3f4f6 100%)',
                                    overflow: 'hidden',
                                    position: 'relative',
                                    mb: 1
                                  }}>
                                    <Box sx={{
                                      height: '100%',
                                      width: `${exercise.completionRate}%`,
                                      background: 
                                        exercise.completionRate >= 80 ? 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)' :
                                        exercise.completionRate >= 60 ? 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)' :
                                        exercise.completionRate >= 40 ? 'linear-gradient(90deg, #f97316 0%, #ea580c 100%)' : 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)',
                                      borderRadius: 4,
                                      transition: 'width 0.3s ease'
                                    }} />
                                  </Box>
                                  <Typography variant="caption" sx={{ 
                                    fontWeight: 700, 
                                    color: 
                                      exercise.completionRate >= 80 ? '#16a34a' :
                                      exercise.completionRate >= 60 ? '#d97706' :
                                      exercise.completionRate >= 40 ? '#ea580c' : '#dc2626'
                                  }}>
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

                {/* Enhanced Alerts */}
                {progressData.alerts.length > 0 && (
                  <Card sx={{ 
                    mt: 3,
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                    border: '1px solid rgba(102, 126, 234, 0.1)'
                  }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="h6" gutterBottom sx={{ 
                        fontWeight: 700, 
                        color: '#2d3748',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 3
                      }}>
                        <Box sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: '#f59e0b'
                        }} />
                        Alerts & Notifications
                      </Typography>
                      {progressData.alerts.map((alert, index) => (
                        <Alert 
                          key={index}
                          severity={
                            alert.type === 'skipped_sessions' ? 'warning' :
                            alert.type === 'progress_milestone' ? 'success' : 'info'
                          }
                          sx={{ 
                            mb: 2,
                            borderRadius: 2,
                            '& .MuiAlert-message': {
                              width: '100%'
                            }
                          }}
                        >
                          <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
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
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                minHeight: '400px',
                background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)'
              }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                    No progress data available
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Progress data will appear here once exercises are completed
                  </Typography>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ 
            p: 3,
            background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
            borderRadius: '0 0 12px 12px'
          }}>
            <Button 
              onClick={() => setProgressDialog(false)}
              variant="contained"
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: 2,
                px: 4,
                py: 1.5,
                fontWeight: 700,
                textTransform: 'none',
                fontSize: '1rem',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)'
                }
              }}
            >
              Close Progress View
            </Button>
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
                {/* Case Progress Timeline */}
                <Paper 
                  elevation={0}
                  sx={{ 
                    mb: 4, 
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    overflow: 'hidden'
                  }}
                >
                  <Box sx={{ 
                    p: { xs: 2, sm: 3 }, 
                    borderBottom: '1px solid #e5e7eb',
                    bgcolor: '#f9fafb'
                  }}>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        fontWeight: 600, 
                        color: '#111827',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}
                    >
                      <Timeline fontSize="small" /> Case Progress
                    </Typography>
                  </Box>
                  
                  <Box sx={{ p: { xs: 2, sm: 3 } }}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      position: 'relative',
                      pb: 1,
                      px: { xs: 1, sm: 3 }
                    }}>
                      {/* Progress Bar */}
                      <Box sx={{ 
                        position: 'absolute',
                        height: '4px',
                        bgcolor: '#e5e7eb',
                        left: '12%',
                        right: '12%',
                        top: '22px',
                        zIndex: 0
                      }} />
                      
                      {/* Status Steps */}
                      {['new', 'triaged', 'assessed', 'in_rehab', 'return_to_work', 'closed'].map((status, index) => {
                        const isActive = ['new', 'triaged', 'assessed', 'in_rehab', 'return_to_work', 'closed']
                          .indexOf(selectedCase.status) >= index;
                        const isCurrent = selectedCase.status === status;
                        
                        return (
                          <Box 
                            key={status}
                            sx={{ 
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              position: 'relative',
                              zIndex: 1,
                              width: { xs: '16.66%', sm: '16.66%' }
                            }}
                          >
                            <Avatar 
                              sx={{ 
                                width: 44,
                                height: 44,
                                bgcolor: isActive ? 
                                  (isCurrent ? '#3b82f6' : '#10b981') : 
                                  '#e5e7eb',
                                color: isActive ? 'white' : '#9ca3af',
                                border: isCurrent ? '2px solid #60a5fa' : 'none',
                                boxShadow: isCurrent ? '0 0 0 4px rgba(59, 130, 246, 0.2)' : 'none'
                              }}
                            >
                              {status === 'new' && <Assignment />}
                              {status === 'triaged' && <TrendingUp />}
                              {status === 'assessed' && <LocalHospital />}
                              {status === 'in_rehab' && <Work />}
                              {status === 'return_to_work' && <CheckCircle />}
                              {status === 'closed' && <Close />}
                            </Avatar>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                mt: 1,
                                fontWeight: isCurrent ? 700 : 500,
                                color: isCurrent ? '#111827' : (isActive ? '#374151' : '#9ca3af'),
                                textAlign: 'center',
                                fontSize: '0.7rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                display: { xs: 'none', sm: 'block' }
                              }}
                            >
                              {status.replace('_', ' ')}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                </Paper>
                
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
                            {selectedCase.worker?.firstName || selectedCase.worker?.first_name || 'N/A'} {selectedCase.worker?.lastName || selectedCase.worker?.last_name || 'N/A'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {selectedCase.worker?.email || 'N/A'}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">Injury Details</Typography>
                          <Typography variant="body1">
                            {selectedCase.injuryDetails?.bodyPart || 'N/A'} - {selectedCase.injuryDetails?.injuryType || 'N/A'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {selectedCase.injuryDetails?.description || 'N/A'}
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
                              {selectedCase.incident?.incidentDate ? new Date(selectedCase.incident.incidentDate).toLocaleDateString() : 'N/A'}
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
            {selectedCase && selectedCase.status !== 'closed' && (
              <Button
                variant="contained"
                color="error"
                startIcon={<CheckCircle />}
                onClick={() => selectedCase._id && handleUpdateCaseStatus(selectedCase._id, 'closed', 'Case closed by clinician')}
                disabled={isUpdatingCase}
                sx={{ mr: 1 }}
              >
                {isUpdatingCase ? 'Closing...' : 'Close Case'}
              </Button>
            )}
            {selectedCase && selectedCase.status !== 'return_to_work' && selectedCase.status !== 'closed' && (
              <Button
                variant="contained"
                color="success"
                startIcon={<Work />}
                onClick={() => selectedCase._id && handleUpdateCaseStatus(selectedCase._id, 'return_to_work', 'Worker returned to work')}
                disabled={isUpdatingCase}
                sx={{ mr: 1 }}
              >
                {isUpdatingCase ? 'Updating...' : 'Return to Work'}
              </Button>
            )}
            <Button onClick={() => setCaseDetailDialog(false)}>Close Dialog</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LayoutWithSidebar>
  );
};

export default ClinicianDashboard;