import React, { useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Avatar,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  LinearProgress,
  Tabs,
  Tab,
  Grid,
} from '@mui/material';
import {
  Add,
  Visibility,
  Edit,
  Assignment,
  CheckCircle,
  Warning,
  People,
  Assessment,
  LocalHospital,
  Work,
  Search,
  FilterList,
  FirstPage,
  LastPage,
  ChevronLeft,
  ChevronRight,
  Timeline,
  Refresh,
  CalendarToday,
  Cached,
  AutoAwesome,
  Psychology,
  Speed,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext.supabase';
import LayoutWithSidebar from '../../components/LayoutWithSidebar';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { dataClient } from '../../lib/supabase';
import { useGetCasesQuery, useUpdateCaseMutation, casesApi } from '../../store/api/casesApi';
import { useGetIncidentsQuery, incidentsApi } from '../../store/api/incidentsApi';
import { CaseAssignmentService } from '../../utils/caseAssignmentService';
import {
  setSelectedCase,
  setFilters as setCaseFilters,
  setSorting as setCaseSorting,
  clearFilters as clearCaseFilters,
} from '../../store/slices/casesSlice';
import {
  setLoading,
  setError,
  setSuccessMessage,
  openDialog,
  closeDialog,
  setActiveTab,
  clearMessages,
} from '../../store/slices/uiSlice';

interface Case {
  id: string;
  case_number: string;
  status?: string;
  worker_id: string;
  employer_id: string;
  case_manager_id: string;
  clinician_id?: string;
  incident_id?: string;
  worker?: { id: string; first_name: string; last_name: string; email: string; };
  case_manager?: { id: string; first_name: string; last_name: string; email: string; };
  clinician?: { id: string; first_name: string; last_name: string; email: string; };
  incident?: {
    id: string;
    incident_number?: string;
    incident_date: string;
    description: string;
    severity: string;
    incident_type: string;
  };
  created_at: string;
  updated_at: string;
}

interface Clinician {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  specialty?: string;
  is_available: boolean;
  availability_reason?: string;
  workload: number;
}

interface DashboardStats {
  totalCases: number;
  newCases: number;
  activeCases: number;
  completedCases: number;
  avgCaseDuration: number;
  complianceRate: number;
  upcomingAppointments: number;
  overdueTasks: number;
}

const CaseManagerDashboardRedux: React.FC = () => {
  const { user } = useAuth();
  const dispatch = useAppDispatch();

  // Redux state
  const {
    selectedCase,
    filters: caseFilters,
    sortBy: caseSortBy,
    sortOrder: caseSortOrder
  } = useAppSelector((state: any) => state.cases);

  const {
    loading,
    error,
    successMessage,
    dialogs,
    activeTab
  } = useAppSelector((state: any) => state.ui);

  // Local state for forms and UI
  const [assignmentForm, setAssignmentForm] = React.useState({
    case: '',
    clinician: '',
    assignmentDate: '',
    notes: ''
  });

  const [clinicians, setClinicians] = React.useState<Clinician[]>([]);
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = React.useState(0);
  
  // Smart cache clear modal state
  const [smartCacheModal, setSmartCacheModal] = React.useState(false);
  const [selectedClinicianForCache, setSelectedClinicianForCache] = React.useState<Clinician | null>(null);
  
  // Assignment confirmation modal state
  const [assignmentConfirmationModal, setAssignmentConfirmationModal] = React.useState(false);
  const [assignmentToConfirm, setAssignmentToConfirm] = React.useState<{
    case: Case | null;
    clinician: Clinician | null;
    assignmentDate: string;
    notes: string;
  }>({
    case: null,
    clinician: null,
    assignmentDate: '',
    notes: ''
  });
  
  // Real-time data fetching state
  const [connectionStatus, setConnectionStatus] = React.useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  
  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');

  // RTK Query hooks
  const {
    data: casesData,
    isLoading: casesLoading,
    error: casesError,
    refetch: refetchCases
  } = useGetCasesQuery({
    page: currentPage,
    limit: pageSize,
    search: searchTerm,
    status: statusFilter
  });

  // Get all cases for accurate stats (same as Site Supervisor)
  const {
    data: allCasesData,
    isLoading: allCasesLoading,
    error: allCasesError
  } = useGetCasesQuery({});

  const {
    data: incidentsData,
    isLoading: incidentsLoading,
    error: incidentsError,
    refetch: refetchIncidents
  } = useGetIncidentsQuery({});

  const [updateCase, { isLoading: updatingCase }] = useUpdateCaseMutation();

  // Derived data
  const cases = casesData?.cases || [];
  const allCases = allCasesData?.cases || []; // All cases for accurate stats
  const incidents = incidentsData?.incidents || [];
  const pagination = casesData?.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 };

  // Calculate stats (use all cases for accurate count, same as Site Supervisor)
  const stats: DashboardStats = {
    totalCases: allCases.length, // Use all cases count
    newCases: allCases.filter(c => c.status === 'new').length,
    activeCases: allCases.filter(c => ['triaged', 'assessed', 'in_rehab'].includes(c.status)).length,
    completedCases: allCases.filter(c => ['return_to_work', 'closed'].includes(c.status)).length,
    avgCaseDuration: 45, // Mock data
    complianceRate: 92, // Mock data
    upcomingAppointments: 8, // Mock data
    overdueTasks: 2 // Mock data
  };

  // Effects
  useEffect(() => {
    if (casesError || incidentsError || allCasesError) {
      const errorMessage = casesError || incidentsError || allCasesError;
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
  }, [casesError, incidentsError, allCasesError, dispatch]);

  // Fetch notifications (same logic as Site Supervisor)
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      console.log('Fetching notifications for case manager:', user.id);
      
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
      
      console.log('Notifications fetched:', notificationsData?.length || 0);
      setNotifications(notificationsData || []);
      setUnreadNotificationCount(notificationsData?.filter(n => !n.is_read).length || 0);
    } catch (error) {
      console.error('Error in fetchNotifications:', error);
    }
  }, [user?.id]);

  // Fetch clinicians and notifications
  useEffect(() => {
    const fetchAdditionalData = async () => {
      try {
        // Fetch clinicians using the new service
        const availableClinicians = await CaseAssignmentService.getAvailableClinicians();
        console.log('Available clinicians for case manager:', availableClinicians);
        
        const cliniciansWithAvailability = availableClinicians.map(c => ({
          ...c,
          is_available: true, // All fetched clinicians are available
          workload: Math.floor(Math.random() * 10) // Mock workload
        }));
        
        console.log('Processed clinicians for dropdown:', cliniciansWithAvailability);
        setClinicians(cliniciansWithAvailability);
        
        // Debug: Check if admin_clinician@test.com exists
        await CaseAssignmentService.debugClinicianExists('admin_clinician@test.com');

        // Fetch notifications
        await fetchNotifications();
      } catch (err) {
        console.error('Error fetching additional data:', err);
      }
    };

    // Listen for global notification refresh events
    const handleNotificationRefresh = (event: CustomEvent) => {
      const { userId, allRead } = event.detail;
      console.log('Received notification refresh event:', { userId, allRead });
      
      if (userId === user?.id) {
        console.log('Refreshing notifications for current user...');
        fetchNotifications();
      }
    };

    // Add event listener
    window.addEventListener('notificationsMarkedAsRead', handleNotificationRefresh as EventListener);

    if (user?.id) {
      fetchAdditionalData();
    }

    // Cleanup
    return () => {
      window.removeEventListener('notificationsMarkedAsRead', handleNotificationRefresh as EventListener);
    };
  }, [user?.id]);

  // Function to aggressively clear all browser cache (like Team Leader)
  const clearAllBrowserCache = useCallback(async () => {
    console.log('=== CLEARING ALL BROWSER CACHE ===');
    
    try {
      // Clear localStorage
      localStorage.clear();
      console.log('localStorage cleared');
      
      // Clear sessionStorage
      sessionStorage.clear();
      console.log('sessionStorage cleared');
      
      // Clear IndexedDB
      if ('indexedDB' in window) {
        try {
          const databases = await indexedDB.databases();
          await Promise.all(databases.map(db => {
            return new Promise((resolve, reject) => {
              if (db.name) {
                const deleteReq = indexedDB.deleteDatabase(db.name);
                deleteReq.onsuccess = () => resolve(true);
                deleteReq.onerror = () => reject(deleteReq.error);
              } else {
                resolve(true);
              }
            });
          }));
          console.log('IndexedDB cleared');
        } catch (error) {
          console.log('IndexedDB clear error:', error);
        }
      }
      
      // Clear Service Worker cache
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map(registration => registration.unregister()));
          console.log('Service Worker cleared');
        } catch (error) {
          console.log('Service Worker clear error:', error);
        }
      }
      
      // Clear Cache API
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
          console.log('Cache API cleared');
        } catch (error) {
          console.log('Cache API clear error:', error);
        }
      }
      
      // Clear cookies but preserve login/auth cookies
      try {
        const cookiesToPreserve = ['supabase.auth.token', 'sb-', 'auth-token'];
        
        document.cookie.split(";").forEach(function(cookie) { 
          const cookieName = cookie.replace(/^ +/, "").split("=")[0];
          
          // Only clear cookies that are not auth-related
          const shouldPreserve = cookiesToPreserve.some(preserveName => 
            cookieName.includes(preserveName)
          );
          
          if (!shouldPreserve) {
            document.cookie = cookie.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
          }
        });
        console.log('Non-auth cookies cleared (login cookies preserved)');
      } catch (error) {
        console.log('Cookie clear error:', error);
      }
      
      console.log('=== BROWSER CACHE CLEARED ===');
    } catch (error) {
      console.error('Error clearing browser cache:', error);
    }
  }, []);

  // Smart cache clear for specific clinician
  const smartCacheClearForClinician = useCallback(async (clinician: Clinician) => {
    try {
      console.log('SMART CACHE CLEAR FOR CLINICIAN:', clinician.first_name, clinician.last_name);
      
      // Clear all browser cache first
      await clearAllBrowserCache();
      
      // Clear all Redux caches and refetch
      dispatch(casesApi.util.resetApiState());
      dispatch(incidentsApi.util.resetApiState());
      refetchCases();
      refetchIncidents();
      
      // Invalidate clinician cases cache to force immediate update
      dispatch(casesApi.util.invalidateTags([
        { type: 'Case', id: `clinician-${clinician.id}` },
        { type: 'Case', id: 'LIST' }
      ]));
      
      // Trigger global cache clear event for clinician
      const globalCacheClearEvent = new CustomEvent('globalCacheClear', {
        detail: { 
          clinicianId: clinician.id,
          clinicianName: `${clinician.first_name} ${clinician.last_name}`,
          timestamp: Date.now(),
          triggeredBy: 'case_manager',
          triggeredByUser: user?.email || 'Unknown'
        }
      });
      console.log('CASE MANAGER: Dispatching globalCacheClear event:', globalCacheClearEvent.detail);
      window.dispatchEvent(globalCacheClearEvent);
      
      // Also trigger clinician-specific refresh event
      const clinicianRefreshEvent = new CustomEvent('clinicianDataRefresh', {
        detail: { 
          clinicianId: clinician.id,
          timestamp: Date.now(),
          cacheCleared: true,
          triggeredBy: 'case_manager'
        }
      });
      console.log('CASE MANAGER: Dispatching clinicianDataRefresh event:', clinicianRefreshEvent.detail);
      window.dispatchEvent(clinicianRefreshEvent);
      
      // Show success message
      dispatch(setSuccessMessage(`Smart cache cleared for Dr. ${clinician.first_name} ${clinician.last_name}! Their dashboard will refresh automatically.`));
      setTimeout(() => dispatch(clearMessages()), 5000);
      
      console.log('Smart cache clear completed for clinician:', clinician.id);
    } catch (error) {
      console.error('Error in smart cache clear for clinician:', error);
      dispatch(setError('Failed to clear cache for clinician. Please try again.'));
    }
  }, [clearAllBrowserCache, dispatch, refetchCases, refetchIncidents, user?.email]);

  // Fetch new data when real-time events occur
  const fetchNewData = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      console.log('Real-time: Fetching new data...');
      
      // Comprehensive cache clearing
      console.log('Starting comprehensive cache clear...');
      
      // Clear RTK Query cache for all APIs
      dispatch(casesApi.util.resetApiState());
      dispatch(incidentsApi.util.resetApiState());
      
      // Invalidate all tags to force refetch
      dispatch(casesApi.util.invalidateTags(['Case']));
      dispatch(incidentsApi.util.invalidateTags(['Incident']));
      
      // Clear browser cache if possible
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.log('Browser cache cleared:', cacheNames.length, 'caches');
      }
      
      // Clear localStorage cache
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('rtk') || key.includes('cache') || key.includes('supabase'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Clear sessionStorage cache
      const sessionKeysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.includes('rtk') || key.includes('cache') || key.includes('supabase'))) {
          sessionKeysToRemove.push(key);
        }
      }
      sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
      
      console.log('Comprehensive cache clear completed');
      
      // Fetch notifications (same as /notifications page)
      await fetchNotifications();
      
      // Force refetch cases and incidents data with fresh cache
      refetchCases();
      
      console.log('Real-time: Data updated successfully with cache cleared');
    } catch (error) {
      console.error('Error in real-time data fetch:', error);
    }
  }, [user?.id, dispatch, refetchCases]);

  // Real-time subscription for cases and incidents
  useEffect(() => {
    if (!user?.id) return;

    console.log('Initializing real-time cases and incidents...');

    const casesSubscription = dataClient
      .channel('cases-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cases'
        },
        (payload) => {
          console.log('Real-time: New case detected:', payload);
          console.log('Case data:', payload.new);
          fetchNewData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'cases'
        },
        (payload) => {
          console.log('Real-time: Case updated:', payload);
          console.log('Updated case data:', payload.new);
          fetchNewData();
        }
      )
      .subscribe((status) => {
        console.log('Real-time cases subscription status:', status);
        setConnectionStatus(status === 'SUBSCRIBED' ? 'connected' : 'disconnected');
      });

    const incidentsSubscription = dataClient
      .channel('incidents-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'incidents'
        },
        (payload) => {
          console.log('Real-time: New incident detected:', payload);
          console.log('Incident data:', payload.new);
          fetchNewData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'incidents'
        },
        (payload) => {
          console.log('Real-time: Incident updated:', payload);
          console.log('Updated incident data:', payload.new);
          fetchNewData();
        }
      )
      .subscribe((status) => {
        console.log('Real-time incidents subscription status:', status);
      });

    // Real-time subscription for notifications
    const notificationsSubscription = dataClient
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Real-time: New notification received:', payload);
          console.log('Notification data:', payload.new);
          fetchNewData();
        }
      )
      .subscribe((status) => {
        console.log('Real-time notifications subscription status:', status);
      });

    return () => {
      console.log('Cleaning up real-time subscriptions...');
      casesSubscription.unsubscribe();
      incidentsSubscription.unsubscribe();
      notificationsSubscription.unsubscribe();
    };
  }, [user?.id, fetchNewData]);

  // Handlers
  const handleAssignClinician = useCallback(async () => {
    try {
      if (!assignmentForm.case || !assignmentForm.clinician) {
        dispatch(setError('Please select both case and clinician'));
        return;
      }

      if (!user?.id) {
        dispatch(setError('User not authenticated'));
        return;
      }

      // Get case and clinician details for confirmation
      const selectedCase = cases.find(c => c.id === assignmentForm.case);
      const selectedClinician = clinicians.find(c => c.id === assignmentForm.clinician);
      
      console.log('Selected case:', selectedCase);
      console.log('Selected clinician:', selectedClinician);
      console.log('Assignment form data:', assignmentForm);
      
      if (!selectedCase || !selectedClinician) {
        dispatch(setError('Invalid case or clinician selection'));
        return;
      }

      // Set assignment data for confirmation modal
      setAssignmentToConfirm({
        case: selectedCase,
        clinician: selectedClinician,
        assignmentDate: assignmentForm.assignmentDate,
        notes: assignmentForm.notes
      });

      // Close assignment dialog and show confirmation modal
      dispatch(closeDialog('assignmentDialog'));
      setAssignmentConfirmationModal(true);

    } catch (error) {
      console.error('Error in handleAssignClinician:', error);
      dispatch(setError('An error occurred while preparing assignment'));
    }
  }, [assignmentForm, cases, clinicians, user, dispatch]);

  // Handle confirmed assignment
  const handleConfirmedAssignment = useCallback(async () => {
    try {
      if (!assignmentToConfirm.case || !assignmentToConfirm.clinician || !user?.id) {
        dispatch(setError('Invalid assignment data'));
        return;
      }

      console.log('User confirmed case assignment - starting assignment process...');
      console.log('Assignment details:', {
        caseId: assignmentToConfirm.case.id,
        clinicianId: assignmentToConfirm.clinician.id,
        caseManagerId: user.id,
        caseNumber: assignmentToConfirm.case.case_number,
        clinicianName: `${assignmentToConfirm.clinician.first_name} ${assignmentToConfirm.clinician.last_name}`
      });

      // Use the new case assignment service
      try {
        console.log('CASE MANAGER: Starting case assignment...');
        await CaseAssignmentService.assignCaseToClinician({
          caseId: assignmentToConfirm.case.id,
          clinicianId: assignmentToConfirm.clinician.id,
          caseManagerId: user.id,
          notes: assignmentToConfirm.notes || 'Case assigned by case manager'
        });
        
        console.log('CASE MANAGER: Case assignment completed successfully');
      } catch (error) {
        console.error('CASE MANAGER: Case assignment failed:', error);
        dispatch(setError('Failed to assign case. Please try again.'));
        return; // Exit early if assignment fails
      }
      
      // Show success message
      const successMessage = `Case ${assignmentToConfirm.case.case_number} assigned successfully to Dr. ${assignmentToConfirm.clinician.first_name} ${assignmentToConfirm.clinician.last_name}! Notification sent to clinician.`;
      dispatch(setSuccessMessage(successMessage));
      
      // Clear success message after 8 seconds
      setTimeout(() => {
        dispatch(setSuccessMessage(null));
      }, 8000);
      
      // Close confirmation modal
      setAssignmentConfirmationModal(false);
      
      // Reset form
      setAssignmentForm({
        case: '',
        clinician: '',
        assignmentDate: '',
        notes: ''
      });
      
      // Reset assignment confirmation data
      setAssignmentToConfirm({
        case: null,
        clinician: null,
        assignmentDate: '',
        notes: ''
      });
      
      // AUTOMATIC SMART CACHE CLEAR FOR ASSIGNED CLINICIAN
      console.log('AUTOMATIC SMART CACHE CLEAR FOR ASSIGNED CLINICIAN...');
      console.log('ASSIGNMENT CONFIRMED: Triggering immediate data refresh for:', assignmentToConfirm.clinician.first_name, assignmentToConfirm.clinician.last_name);
      console.log('ASSIGNMENT CONFIRMED: Clinician ID:', assignmentToConfirm.clinician.id);
      await smartCacheClearForClinician(assignmentToConfirm.clinician);
      
    } catch (error) {
      console.error('Error in handleConfirmedAssignment:', error);
      dispatch(setError('An error occurred while assigning the case'));
    }
  }, [assignmentToConfirm, user, dispatch, smartCacheClearForClinician]);

  const handleCaseStatusUpdate = useCallback(async (caseId: string, newStatus: string) => {
    try {
      const updates = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      await updateCase({ id: caseId, updates }).unwrap();
      
      dispatch(setSuccessMessage(`Case status updated to ${newStatus}`));
      refetchCases();
    } catch (err: any) {
      console.error('Error updating case status:', err);
      dispatch(setError(err.message || 'Failed to update case status'));
    }
  }, [updateCase, dispatch, refetchCases]);

  const getStatusColor = (status: string | undefined) => {
    if (!status) return 'default';
    switch (status.toLowerCase()) {
      case 'new': return 'info';
      case 'triaged': return 'primary';
      case 'assessed': return 'secondary';
      case 'in_rehab': return 'warning';
      case 'return_to_work': return 'success';
      case 'closed': return 'default';
      default: return 'default';
    }
  };

  const getSeverityColor = (severity: string | undefined) => {
    if (!severity) return 'default';
    switch (severity.toLowerCase()) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'error';
      default: return 'default';
    }
  };

  const getAvailabilityScoreColor = (score: number) => {
    if (score >= 8) return '#4caf50';
    if (score >= 6) return '#ff9800';
    return '#f44336';
  };

  if (loading || casesLoading) {
    return (
      <LayoutWithSidebar>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ ml: 2 }}>Loading Dashboard...</Typography>
        </Box>
      </LayoutWithSidebar>
    );
  }

  return (
    <LayoutWithSidebar>
      <Box sx={{ p: 3, bgcolor: '#f8fdff' }}>
        {/* Header */}
        <Box sx={{ mb: 3, background: 'linear-gradient(135deg, #2d5a87 0%, #1e3a52 100%)', p: 3, borderRadius: 3, color: 'white', boxShadow: '0 8px 32px rgba(45, 90, 135, 0.3)' }}>
          <Typography variant="h4" gutterBottom sx={{ color: 'white', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
            Case Manager Dashboard
          </Typography>
          <Typography variant="subtitle1" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
            Welcome back, {user?.firstName} {user?.lastName}
          </Typography>
        </Box>

        {/* Error and Success Messages */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => dispatch(setError(null))}>
            {typeof error === 'string' ? error :
             error && typeof error === 'object' && 'message' in error ?
             (error as any).message :
             error && typeof error === 'object' && 'data' in error ?
             String((error as any).data) :
             'An error occurred'}
          </Alert>
        )}

        {successMessage && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => dispatch(setSuccessMessage(null))}>
            {successMessage}
          </Alert>
        )}

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              background: 'rgba(255, 255, 255, 0.15)', 
              backdropFilter: 'blur(15px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(29, 58, 82, 0.2)',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: '0 12px 40px rgba(29, 58, 82, 0.3)',
                background: 'rgba(255, 255, 255, 0.25)'
              }
            }}>
              <CardContent>
                <Typography gutterBottom sx={{ color: '#2d5a87', fontWeight: 'medium' }}>
                  Total Cases
                </Typography>
                <Typography variant="h4" sx={{ color: '#1e3a52', fontWeight: 'bold' }}>
                  {stats.totalCases}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              background: 'rgba(255, 255, 255, 0.15)', 
              backdropFilter: 'blur(15px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(29, 58, 82, 0.2)',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: '0 12px 40px rgba(29, 58, 82, 0.3)',
                background: 'rgba(255, 255, 255, 0.25)'
              }
            }}>
              <CardContent>
                <Typography gutterBottom sx={{ color: '#2d5a87', fontWeight: 'medium' }}>
                  New Cases
                </Typography>
                <Typography variant="h4" sx={{ color: '#3b82c4' }}>
                  {stats.newCases}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              background: 'rgba(255, 255, 255, 0.15)', 
              backdropFilter: 'blur(15px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(29, 58, 82, 0.2)',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: '0 12px 40px rgba(29, 58, 82, 0.3)',
                background: 'rgba(255, 255, 255, 0.25)'
              }
            }}>
              <CardContent>
                <Typography gutterBottom sx={{ color: '#2d5a87', fontWeight: 'medium' }}>
                  Active Cases
                </Typography>
                <Typography variant="h4" sx={{ color: '#4f94cd' }}>
                  {stats.activeCases}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              background: 'rgba(255, 255, 255, 0.15)', 
              backdropFilter: 'blur(15px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(29, 58, 82, 0.2)',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: '0 12px 40px rgba(29, 58, 82, 0.3)',
                background: 'rgba(255, 255, 255, 0.25)'
              }
            }}>
              <CardContent>
                <Typography gutterBottom sx={{ color: '#2d5a87', fontWeight: 'medium' }}>
                  Completed
                </Typography>
                <Typography variant="h4" sx={{ color: '#5ba3d6' }}>
                  {stats.completedCases}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Tabs */}
        <Box sx={{ 
          background: 'rgba(255, 255, 255, 0.1)', 
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)', 
          borderRadius: 3, 
          mb: 3, 
          px: 2, 
          boxShadow: '0 8px 32px rgba(29, 58, 82, 0.15)' 
        }}>
          <Tabs value={activeTab} onChange={(e, newValue) => dispatch(setActiveTab(newValue))}>
            <Tab 
              label={`Cases (${cases.length})`} 
              sx={{ 
                color: '#2d5a87',
                fontWeight: 'medium',
                borderRadius: '12px 12px 0 0',
                '&.Mui-selected': { color: '#1e3a52', fontWeight: 'bold', backgroundColor: 'rgba(45, 90, 135, 0.1)' }
              }} 
            />
            <Tab 
              label={`Recent Notifications (${unreadNotificationCount})`} 
              sx={{ 
                color: '#2d5a87',
                fontWeight: 'medium',
                borderRadius: '12px 12px 0 0',
                '&.Mui-selected': { color: '#1e3a52', fontWeight: 'bold', backgroundColor: 'rgba(45, 90, 135, 0.1)' }
              }} 
            />
          </Tabs>
        </Box>

        {/* Tab Content */}
        {activeTab === 0 && (
          <>
            {/* Actions */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant="h6" sx={{ color: '#1e3a52', fontWeight: 'bold' }}>My Cases</Typography>
                  <Typography variant="caption" sx={{ color: '#2d5a87' }}>
                    Smart refresh • Updates only when new data is available
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => dispatch(openDialog('assignmentDialog'))}
                    sx={{
                      background: 'linear-gradient(135deg, #4f94cd 0%, #2d5a87 100%)',
                      color: 'white',
                      fontWeight: 'medium',
                      borderRadius: 2,
                      boxShadow: '0 4px 15px rgba(79, 148, 205, 0.4)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #3b82c4 0%, #1e3a52 100%)',
                        transform: 'translateY(-1px)'
                      },
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Assign Clinician
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    sx={{
                      borderColor: '#4f94cd',
                      color: '#1e3a52',
                      fontWeight: 'medium',
                      borderRadius: 2,
                      '&:hover': {
                        borderColor: '#2d5a87',
                        bgcolor: 'rgba(79, 148, 205, 0.1)',
                        transform: 'translateY(-1px)'
                      },
                      transition: 'all 0.2s ease'
                    }}
                    onClick={async () => {
                      // Clear all browser cache first
                      await clearAllBrowserCache();
                      
                      // Clear all Redux caches and refetch
                      dispatch(casesApi.util.resetApiState());
                      dispatch(incidentsApi.util.resetApiState());
                      refetchCases();
                      refetchIncidents();
                      
                      // Also refresh notifications
                      if (user?.id) {
                        try {
                          const { data: notificationsData, error: notificationsError } = await dataClient
                            .from('notifications')
                            .select('*')
                            .eq('recipient_id', user.id)
                            .order('created_at', { ascending: false })
                            .limit(10);
                          
                          if (!notificationsError && notificationsData) {
                            setNotifications(notificationsData);
                            setUnreadNotificationCount(notificationsData.filter(n => !n.is_read).length);
                          }
                        } catch (err) {
                          console.error('Error refreshing notifications:', err);
                        }
                      }
                      
                      // Show success message
                      dispatch(setSuccessMessage('All data refreshed successfully!'));
                      setTimeout(() => dispatch(setSuccessMessage(null)), 3000);
                    }}
                  >
                    Manual Refresh
                  </Button>

                  <Button
                    variant="contained"
                    startIcon={<AutoAwesome />}
                    onClick={() => setSmartCacheModal(true)}
                    sx={{
                      background: 'linear-gradient(135deg, #5ba3d6 0%, #4f94cd 100%)',
                      color: 'white',
                      fontWeight: 'medium',
                      borderRadius: 2,
                      '&:hover': {
                        background: 'linear-gradient(135deg, #4f94cd 0%, #2d5a87 100%)',
                        transform: 'translateY(-1px)'
                      },
                      boxShadow: '0 4px 15px rgba(91, 163, 214, 0.4)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Smart Clear Cache
                  </Button>
                </Box>
              </Box>
            </Box>

        {/* Cases Table */}
        <Card sx={{ 
          background: 'rgba(255, 255, 255, 0.12)', 
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.25)', 
          borderRadius: 3,
          boxShadow: '0 12px 40px rgba(29, 58, 82, 0.25)',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease'
        }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: '#1e3a52', fontWeight: 'bold' }}>
              Cases
            </Typography>
            <TableContainer component={Paper} sx={{ 
              borderRadius: 2, 
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.15)' 
            }}>
              <Table>
                <TableHead sx={{ 
                  background: 'rgba(184, 212, 227, 0.3)', 
                  backdropFilter: 'blur(10px)',
                  borderBottom: '1px solid rgba(168, 200, 216, 0.4)'
                }}>
                  <TableRow>
                    <TableCell sx={{ color: '#1e3a52', fontWeight: 'bold' }}>Case #</TableCell>
                    <TableCell sx={{ color: '#1e3a52', fontWeight: 'bold' }}>Worker</TableCell>
                    <TableCell sx={{ color: '#1e3a52', fontWeight: 'bold' }}>Incident</TableCell>
                    <TableCell sx={{ color: '#1e3a52', fontWeight: 'bold' }}>Status</TableCell>
                    <TableCell sx={{ color: '#1e3a52', fontWeight: 'bold' }}>Severity</TableCell>
                    <TableCell sx={{ color: '#1e3a52', fontWeight: 'bold' }}>Clinician</TableCell>
                    <TableCell sx={{ color: '#1e3a52', fontWeight: 'bold' }}>Created</TableCell>
                    <TableCell sx={{ color: '#1e3a52', fontWeight: 'bold' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cases.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        No cases found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    cases.map((caseItem: Case) => (
                      <TableRow key={caseItem.id}>
                        <TableCell>{caseItem.case_number}</TableCell>
                        <TableCell>
                          {caseItem.worker?.first_name} {caseItem.worker?.last_name}
                        </TableCell>
                        <TableCell>
                          {caseItem.incident?.incident_number || (caseItem.incident_id ? `INC-${caseItem.incident_id.slice(-8)}` : 'N/A')}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={caseItem.status || 'Unknown'}
                            color={getStatusColor(caseItem.status) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={caseItem.incident?.severity || 'Unknown'}
                            color={getSeverityColor(caseItem.incident?.severity) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {caseItem.clinician ? (
                            `${caseItem.clinician.first_name} ${caseItem.clinician.last_name}`
                          ) : (
                            <Chip label="Unassigned" color="warning" size="small" />
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(caseItem.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => dispatch(setSelectedCase(caseItem))}
                          >
                            <Visibility />
                          </IconButton>
                          {caseItem.status === 'new' && !caseItem.clinician_id && (
                            <IconButton
                              size="small"
                              onClick={() => {
                                setAssignmentForm(prev => ({ ...prev, case: caseItem.id }));
                                dispatch(openDialog('assignmentDialog'));
                              }}
                            >
                              <Assignment />
                            </IconButton>
                          )}
                          {caseItem.clinician_id && (
                            <Chip
                              size="small"
                              label="Assigned"
                              color="success"
                              variant="outlined"
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
          </>
        )}

        {activeTab === 1 && (
          <Card sx={{ 
            background: 'rgba(255, 255, 255, 0.12)', 
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.25)', 
            borderRadius: 3,
            boxShadow: '0 12px 40px rgba(29, 58, 82, 0.25)',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ color: '#1a5a1a', fontWeight: 'bold' }}>
                  Notifications
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => window.location.href = '/notifications'}
                  sx={{
                    borderColor: '#4caf50',
                    color: '#1a5a1a',
                    fontWeight: 'medium',
                    '&:hover': {
                      borderColor: '#388e3c',
                      bgcolor: '#e8f5e8'
                    }
                  }}
                >
                  View All Notifications
                </Button>
              </Box>
              {notifications.length === 0 ? (
                <Typography sx={{ color: '#2e7d32' }}>
                  No notifications yet.
                </Typography>
              ) : (
                <Box>
                  {notifications.slice(0, 5).map((notification) => (
                    <Box
                      key={notification.id}
                      sx={{
                        p: 2,
                        mb: 1,
                        border: '1px solid',
                        borderColor: notification.is_read ? '#c8e6c9' : '#4caf50',
                        borderRadius: 2,
                        bgcolor: notification.is_read ? '#f8fffe' : '#e8f5e8',
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: notification.is_read ? '#e8f5e8' : '#d4edda'
                        }
                      }}
                      onClick={async () => {
                        if (!notification.is_read) {
                          try {
                            const { error: updateError } = await dataClient
                              .from('notifications')
                              .update({ is_read: true, read_at: new Date().toISOString() })
                              .eq('id', notification.id);

                            if (!updateError) {
                              // Update local state
                              setNotifications(prev => prev.map(n => 
                                n.id === notification.id ? { ...n, is_read: true } : n
                              ));
                              setUnreadNotificationCount(prev => prev > 0 ? prev - 1 : 0);
                              
                              // Clear cache and refresh notifications to ensure consistency
                              await clearAllBrowserCache();
                              if (user?.id) {
                                const { data: notificationsData, error: notificationsError } = await dataClient
                                  .from('notifications')
                                  .select('*')
                                  .eq('recipient_id', user.id)
                                  .order('created_at', { ascending: false })
                                  .limit(10);
                                
                                if (!notificationsError && notificationsData) {
                                  setNotifications(notificationsData);
                                  setUnreadNotificationCount(notificationsData.filter(n => !n.is_read).length);
                                }
                              }
                            }
                          } catch (err) {
                            console.error('Error marking notification as read:', err);
                          }
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle2" sx={{ color: '#1a5a1a', fontWeight: 'medium' }}>
                            {notification.title}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#2e7d32' }}>
                            {notification.message}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#388e3c' }}>
                            {new Date(notification.created_at).toLocaleString()}
                          </Typography>
                        </Box>
                        {!notification.is_read && (
                          <Chip 
                            label="New" 
                            size="small" 
                            sx={{ 
                              bgcolor: '#4caf50', 
                              color: 'black',
                              fontWeight: 'medium',
                              border: '1px solid #388e3c'
                            }}
                          />
                        )}
                      </Box>
                    </Box>
                  ))}
                  {notifications.length > 5 && (
                    <Box sx={{ textAlign: 'center', mt: 2 }}>
                      <Button
                        variant="text"
                        onClick={() => window.location.href = '/notifications'}
                        sx={{
                          color: '#4caf50',
                          fontWeight: 'medium',
                          '&:hover': {
                            bgcolor: '#e8f5e8'
                          }
                        }}
                      >
                        View {notifications.length - 5} more notifications
                      </Button>
                    </Box>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        )}

        {/* Assignment Dialog */}
        <Dialog
          open={dialogs.assignmentDialog || false}
          onClose={() => dispatch(closeDialog('assignmentDialog'))}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              bgcolor: '#ffffff',
              border: '2px solid #c8e6c9'
            }
          }}
        >
          <DialogTitle sx={{ 
            bgcolor: '#e8f5e8', 
            color: '#1a5a1a', 
            fontWeight: 'bold',
            borderBottom: '2px solid #c8e6c9'
          }}>
            Assign Clinician
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Case</InputLabel>
                <Select
                  value={assignmentForm.case}
                  onChange={(e) => setAssignmentForm(prev => ({ ...prev, case: e.target.value }))}
                  label="Case"
                >
                  {cases.filter(c => c.status === 'new' && !c.clinician_id && c.case_manager_id === user?.id).map((caseItem) => (
                    <MenuItem key={caseItem.id} value={caseItem.id}>
                      {caseItem.case_number} - {caseItem.worker?.first_name} {caseItem.worker?.last_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Clinician</InputLabel>
                <Select
                  value={assignmentForm.clinician}
                  onChange={(e) => setAssignmentForm(prev => ({ ...prev, clinician: e.target.value }))}
                  label="Clinician"
                >
                  {clinicians.map((clinician) => (
                    <MenuItem key={clinician.id} value={clinician.id}>
                      {clinician.first_name} {clinician.last_name} 
                      {clinician.specialty && ` (${clinician.specialty})`}
                      {clinician.is_available ? ' - Available' : ' - Busy'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Assignment Date"
                type="date"
                value={assignmentForm.assignmentDate}
                onChange={(e) => setAssignmentForm(prev => ({ ...prev, assignmentDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={assignmentForm.notes}
                onChange={(e) => setAssignmentForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ bgcolor: '#f8fffe', borderTop: '2px solid #c8e6c9' }}>
            <Button 
              onClick={() => dispatch(closeDialog('assignmentDialog'))}
              sx={{
                color: '#2e7d32',
                fontWeight: 'medium',
                '&:hover': {
                  bgcolor: '#e8f5e8'
                }
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignClinician}
              variant="contained"
              disabled={updatingCase}
              sx={{
                bgcolor: '#4caf50',
                color: 'black',
                fontWeight: 'medium',
                '&:hover': {
                  bgcolor: '#388e3c'
                },
                '&:disabled': {
                  bgcolor: '#e8f5e8',
                  color: '#2e7d32'
                }
              }}
            >
              {updatingCase ? <CircularProgress size={20} color="inherit" /> : 'Assign'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Assignment Confirmation Modal */}
        <Dialog
          open={assignmentConfirmationModal}
          onClose={() => {
            setAssignmentConfirmationModal(false);
            setAssignmentToConfirm({
              case: null,
              clinician: null,
              assignmentDate: '',
              notes: ''
            });
          }}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              background: 'linear-gradient(135deg, #5ba3d6 0%, #2d5a87 100%)',
              color: 'white',
              boxShadow: '0 8px 32px rgba(91, 163, 214, 0.4)'
            }
          }}
        >
          <DialogTitle sx={{ 
            textAlign: 'center', 
            pb: 1,
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <Assignment sx={{ fontSize: 28, color: 'white' }} />
              <Typography variant="h5" component="div" sx={{ fontWeight: 'bold', color: 'white' }}>
                Confirm Assignment
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ mt: 1, color: 'rgba(255, 255, 255, 0.9)' }}>
              Are you sure you want to send this case to the clinician?
            </Typography>
          </DialogTitle>
          
          <DialogContent sx={{ pt: 3 }}>
            <Box sx={{ 
              background: 'rgba(255, 255, 255, 0.1)', 
              borderRadius: 2, 
              p: 3,
              backdropFilter: 'blur(10px)',
            }}>
              {assignmentToConfirm.case && assignmentToConfirm.clinician && (
                <>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocalHospital sx={{ fontSize: 20 }} />
                    Case Details
                  </Typography>
                  
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Typography variant="body1" sx={{ fontWeight: 'medium', minWidth: 100 }}>
                        Case:
                      </Typography>
                      <Chip 
                        label={assignmentToConfirm.case.case_number} 
                        color="primary" 
                        variant="outlined"
                        sx={{ color: 'white', borderColor: 'rgba(255, 255, 255, 0.5)' }}
                      />
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Typography variant="body1" sx={{ fontWeight: 'medium', minWidth: 100 }}>
                        Worker:
                      </Typography>
                      <Typography variant="body1">
                        {assignmentToConfirm.case.worker?.first_name} {assignmentToConfirm.case.worker?.last_name}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Typography variant="body1" sx={{ fontWeight: 'medium', minWidth: 100 }}>
                        Status:
                      </Typography>
                      <Chip 
                        label={assignmentToConfirm.case.status || 'New'} 
                        color="secondary" 
                        variant="outlined"
                        sx={{ color: 'white', borderColor: 'rgba(255, 255, 255, 0.5)' }}
                      />
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.2)' }} />

                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <People sx={{ fontSize: 20 }} />
                    Clinician Details
                  </Typography>
                  
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Avatar sx={{ 
                        width: 40, 
                        height: 40, 
                        background: 'linear-gradient(45deg, #4caf50, #8bc34a)',
                        fontSize: 16,
                      }}>
                        {assignmentToConfirm.clinician.first_name[0]}{assignmentToConfirm.clinician.last_name[0]}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          Dr. {assignmentToConfirm.clinician.first_name} {assignmentToConfirm.clinician.last_name}
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.8 }}>
                          {assignmentToConfirm.clinician.specialty || 'General Practice'}
                        </Typography>
                      </Box>
                      <Chip
                        label={assignmentToConfirm.clinician.is_available ? 'Available' : 'Busy'}
                        size="small"
                        color={assignmentToConfirm.clinician.is_available ? 'success' : 'warning'}
                        variant="outlined"
                        sx={{ color: 'white', borderColor: 'rgba(255, 255, 255, 0.5)' }}
                      />
                    </Box>
                  </Box>

                  {assignmentToConfirm.notes && (
                    <>
                      <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.2)' }} />
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Edit sx={{ fontSize: 20 }} />
                        Assignment Notes
                      </Typography>
                      <Box sx={{ 
                        p: 2, 
                        background: 'rgba(255, 255, 255, 0.1)', 
                        borderRadius: 2,
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                      }}>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          {assignmentToConfirm.notes}
                        </Typography>
                      </Box>
                    </>
                  )}

                  <Box sx={{ 
                    mt: 3, 
                    p: 2, 
                    background: 'rgba(255, 255, 255, 0.1)', 
                    borderRadius: 2,
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                  }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AutoAwesome sx={{ fontSize: 18 }} />
                      What happens next?
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <CheckCircle sx={{ fontSize: 16, color: '#4caf50' }} />
                        <Typography variant="body2">Case will be assigned to the selected clinician</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <CheckCircle sx={{ fontSize: 16, color: '#4caf50' }} />
                        <Typography variant="body2">Notification will be sent to the clinician</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckCircle sx={{ fontSize: 16, color: '#4caf50' }} />
                        <Typography variant="body2">Clinician's dashboard will be automatically refreshed</Typography>
                      </Box>
                    </Box>
                  </Box>
                </>
              )}
            </Box>
          </DialogContent>
          
          <DialogActions sx={{ 
            p: 3, 
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
          }}>
            <Button 
              onClick={() => {
                setAssignmentConfirmationModal(false);
                setAssignmentToConfirm({
                  case: null,
                  clinician: null,
                  assignmentDate: '',
                  notes: ''
                });
              }}
              sx={{ 
                color: 'white', 
                borderColor: 'rgba(255, 255, 255, 0.3)',
                '&:hover': {
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                  background: 'rgba(255, 255, 255, 0.1)',
                }
              }}
              variant="outlined"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmedAssignment}
              variant="contained"
              startIcon={<Assignment />}
              sx={{
                background: 'linear-gradient(45deg, #4caf50 0%, #8bc34a 100%)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #45a049 0%, #7cb342 100%)',
                },
                boxShadow: '0 4px 15px rgba(76, 175, 80, 0.4)',
              }}
            >
              Confirm Assignment
            </Button>
          </DialogActions>
        </Dialog>

        {/* Smart Cache Clear Modal */}
        <Dialog
          open={smartCacheModal}
          onClose={() => {
            setSmartCacheModal(false);
            setSelectedClinicianForCache(null);
          }}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              background: 'linear-gradient(135deg, #5ba3d6 0%, #2d5a87 100%)',
              color: 'white',
              boxShadow: '0 8px 32px rgba(91, 163, 214, 0.4)'
            }
          }}
        >
          <DialogTitle sx={{ 
            textAlign: 'center', 
            pb: 1,
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <AutoAwesome sx={{ fontSize: 28 }} />
              <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>
                Smart Cache Clear
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
              Select a clinician to clear their dashboard cache and force real-time data refresh
            </Typography>
          </DialogTitle>
          
          <DialogContent sx={{ pt: 3 }}>
            <Box sx={{ 
              background: 'rgba(255, 255, 255, 0.1)', 
              borderRadius: 2, 
              p: 3,
              backdropFilter: 'blur(10px)',
            }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Psychology sx={{ fontSize: 20 }} />
                Available Clinicians
              </Typography>
              
              <Typography variant="body2" sx={{ mb: 3, opacity: 0.9 }}>
                Choose a clinician to trigger smart cache clearing. This will:
              </Typography>
              
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CheckCircle sx={{ fontSize: 16, color: '#4caf50' }} />
                  <Typography variant="body2">Clear all browser cache for the selected clinician</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CheckCircle sx={{ fontSize: 16, color: '#4caf50' }} />
                  <Typography variant="body2">Force refresh their dashboard data in real-time</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CheckCircle sx={{ fontSize: 16, color: '#4caf50' }} />
                  <Typography variant="body2">Update case counts and notifications instantly</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircle sx={{ fontSize: 16, color: '#4caf50' }} />
                  <Typography variant="body2">Ensure data consistency across all dashboards</Typography>
                </Box>
              </Box>

              <FormControl fullWidth>
                <InputLabel sx={{ color: 'white' }}>Select Clinician</InputLabel>
                <Select
                  value={selectedClinicianForCache?.id || ''}
                  onChange={(e) => {
                    const clinician = clinicians.find(c => c.id === e.target.value);
                    setSelectedClinicianForCache(clinician || null);
                  }}
                  label="Select Clinician"
                  sx={{
                    color: 'white',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'white',
                    },
                    '& .MuiSvgIcon-root': {
                      color: 'white',
                    },
                  }}
                >
                  {clinicians.map((clinician) => (
                    <MenuItem key={clinician.id} value={clinician.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                        <Avatar sx={{ 
                          width: 32, 
                          height: 32, 
                          background: 'linear-gradient(45deg, #4caf50, #8bc34a)',
                          fontSize: 14,
                        }}>
                          {clinician.first_name[0]}{clinician.last_name[0]}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                            Dr. {clinician.first_name} {clinician.last_name}
                          </Typography>
                          <Typography variant="caption" sx={{ opacity: 0.8 }}>
                            {clinician.specialty || 'General Practice'} • {clinician.is_available ? 'Available' : 'Busy'}
                          </Typography>
                        </Box>
                        <Chip
                          label={clinician.is_available ? 'Available' : 'Busy'}
                          size="small"
                          color={clinician.is_available ? 'success' : 'warning'}
                          variant="outlined"
                        />
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {selectedClinicianForCache && (
                <Box sx={{ 
                  mt: 3, 
                  p: 2, 
                  background: 'rgba(255, 255, 255, 0.1)', 
                  borderRadius: 2,
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Speed sx={{ fontSize: 18 }} />
                    Cache Clear Preview
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Ready to clear cache for <strong>Dr. {selectedClinicianForCache.first_name} {selectedClinicianForCache.last_name}</strong>
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 1 }}>
                    This action will immediately refresh their dashboard and sync all case data.
                  </Typography>
                </Box>
              )}
            </Box>
          </DialogContent>
          
          <DialogActions sx={{ 
            p: 3, 
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
          }}>
            <Button 
              onClick={() => {
                setSmartCacheModal(false);
                setSelectedClinicianForCache(null);
              }}
              sx={{ 
                color: 'white', 
                borderColor: 'rgba(255, 255, 255, 0.3)',
                '&:hover': {
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                  background: 'rgba(255, 255, 255, 0.1)',
                }
              }}
              variant="outlined"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (selectedClinicianForCache) {
                  await smartCacheClearForClinician(selectedClinicianForCache);
                  setSmartCacheModal(false);
                  setSelectedClinicianForCache(null);
                }
              }}
              disabled={!selectedClinicianForCache}
              variant="contained"
              startIcon={<Cached />}
              sx={{
                background: 'linear-gradient(45deg, #4caf50 0%, #8bc34a 100%)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #45a049 0%, #7cb342 100%)',
                },
                '&:disabled': {
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: 'rgba(255, 255, 255, 0.5)',
                },
                boxShadow: '0 4px 15px rgba(76, 175, 80, 0.4)',
              }}
            >
              Clear Cache & Refresh
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LayoutWithSidebar>
  );
};

export default CaseManagerDashboardRedux;
