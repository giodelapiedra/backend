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
  Tabs,
  Tab,
  Grid,
  TablePagination,
  InputAdornment,
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
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext.supabase';
import LayoutWithSidebar from '../../components/LayoutWithSidebar';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { dataClient } from '../../lib/supabase';
import { useGetCasesQuery, useUpdateCaseMutation, casesApi } from '../../store/api/casesApi';
import { useGetIncidentsQuery, incidentsApi } from '../../store/api/incidentsApi';
import { CaseAssignmentService } from '../../utils/caseAssignmentService';
import { getStatusLabel } from '../../utils/themeUtils';
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

// Utility function to safely format dates
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'No date available';
  
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString();
  } catch (error) {
    return 'Invalid Date';
  }
};

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

  // Case details modal state
  const [caseDetailsModal, setCaseDetailsModal] = React.useState(false);
  
  // Real-time data fetching state
  const [connectionStatus, setConnectionStatus] = React.useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  
  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  
  // Pagination controls state
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  // RTK Query hooks with pagination
  const {
    data: casesData,
    isLoading: casesLoading,
    error: casesError,
    refetch: refetchCases
  } = useGetCasesQuery({
    page: page + 1, // Convert to 1-based pagination
    limit: rowsPerPage,
    search: searchTerm,
    status: statusFilter,
    caseManagerId: user?.id
  });

  // Get all cases for accurate stats (same as Site Supervisor)
  const {
    data: allCasesData,
    isLoading: allCasesLoading,
    error: allCasesError
  } = useGetCasesQuery({ includeAll: true });

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
        
        const cliniciansWithAvailability = availableClinicians.map(c => ({
          ...c,
          is_available: true, // All fetched clinicians are available
          workload: 5 // Default workload
        }));
        
        setClinicians(cliniciansWithAvailability);

        // Fetch notifications
        await fetchNotifications();
      } catch (err) {
        console.error('Error fetching additional data:', err);
      }
    };

    // Listen for global notification refresh events
    const handleNotificationRefresh = (event: CustomEvent) => {
      const { userId, allRead } = event.detail;
      
      if (userId === user?.id) {
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
    try {
      // Clear localStorage
      localStorage.clear();
      
      // Clear sessionStorage
      sessionStorage.clear();
      
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
        } catch (error) {
          // IndexedDB clear error - silent fail
        }
      }
      
      // Clear Service Worker cache
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map(registration => registration.unregister()));
        } catch (error) {
          // Service Worker clear error - silent fail
        }
      }
      
      // Clear Cache API
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
        } catch (error) {
          // Cache API clear error - silent fail
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
      } catch (error) {
        // Cookie clear error - silent fail
      }
    } catch (error) {
      console.error('Error clearing browser cache:', error);
    }
  }, []);


  // Fetch new data when real-time events occur
  const fetchNewData = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      // Comprehensive cache clearing
      
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
      
      // Fetch notifications (same as /notifications page)
      await fetchNotifications();
      
      // Force refetch cases and incidents data with fresh cache
      refetchCases();
      
    } catch (error) {
      console.error('Error in real-time data fetch:', error);
    }
  }, [user?.id, dispatch, refetchCases]);

  // Real-time subscription for cases and incidents
  useEffect(() => {
    if (!user?.id) return;

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
          fetchNewData();
        }
      )
      .subscribe((status) => {
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
          fetchNewData();
        }
      )
      .subscribe((status) => {
        // Incidents subscription status
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
          fetchNewData();
        }
      )
      .subscribe((status) => {
        // Notifications subscription status
      });

    return () => {
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
      
      // Assignment form data
      
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

      // Assignment details

      // Use the new case assignment service
      try {
        await CaseAssignmentService.assignCaseToClinician({
          caseId: assignmentToConfirm.case.id,
          clinicianId: assignmentToConfirm.clinician.id,
          caseManagerId: user.id,
          notes: assignmentToConfirm.notes || 'Case assigned by case manager'
        });
        
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
      
      // Trigger clinician dashboard refresh
      const clinicianRefreshEvent = new CustomEvent('clinicianDataRefresh', {
        detail: { 
          clinicianId: assignmentToConfirm.clinician.id,
          timestamp: Date.now(),
          triggeredBy: 'case_manager'
        }
      });
      window.dispatchEvent(clinicianRefreshEvent);
      
    } catch (error) {
      console.error('Error in handleConfirmedAssignment:', error);
      dispatch(setError('An error occurred while assigning the case'));
    }
  }, [assignmentToConfirm, user, dispatch]);

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

  // Pagination handlers
  const handleChangePage = useCallback((event: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to first page when changing page size
  }, []);

  // Search and filter handlers
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(0); // Reset to first page when searching
  }, []);

  const handleStatusFilterChange = useCallback((event: any) => {
    setStatusFilter(event.target.value);
    setPage(0); // Reset to first page when filtering
  }, []);

  // Case details handler
  const handleViewCaseDetails = useCallback((caseItem: Case) => {
    dispatch(setSelectedCase(caseItem));
    setCaseDetailsModal(true);
  }, [dispatch]);

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
      <Box sx={{ 
        p: 4, 
        bgcolor: '#FAFBFC',
        minHeight: '100vh'
      }}>
        {/* Modern Header */}
        <Box sx={{ 
          mb: 4,
          background: '#FFFFFF',
          borderRadius: 3,
          p: 4,
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h4" sx={{ 
                fontWeight: 700, 
                color: '#111827',
                mb: 1,
                letterSpacing: '-0.025em'
              }}>
                Case Manager Dashboard
              </Typography>
              <Typography variant="body1" sx={{ 
                color: '#6B7280',
                fontSize: '1rem'
              }}>
                Welcome back, {user?.firstName} {user?.lastName}
              </Typography>
            </Box>
            <Box sx={{ 
              p: 2,
              borderRadius: 2,
              backgroundColor: '#F3F4F6',
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <Box sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: connectionStatus === 'connected' ? '#10B981' : '#EF4444'
              }} />
              <Typography variant="body2" sx={{ color: '#6B7280', fontWeight: 500 }}>
                {connectionStatus === 'connected' ? 'ONLINE' : 'Offline'}
              </Typography>
            </Box>
          </Box>
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

        {/* Modern Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              backgroundColor: '#FFFFFF',
              borderRadius: 2,
              border: '1px solid #E5E7EB',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                borderColor: '#D1D5DB'
              }
            }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" sx={{ 
                      color: '#6B7280',
                      fontWeight: 500,
                      mb: 1
                    }}>
                      Total Cases
                    </Typography>
                    <Typography variant="h4" sx={{ 
                      color: '#111827',
                      fontWeight: 700,
                      fontSize: '2rem'
                    }}>
                      {stats.totalCases}
                    </Typography>
                  </Box>
                  <Box sx={{
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: '#F3F4F6'
                  }}>
                    <Assessment sx={{ color: '#6B7280', fontSize: 24 }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              backgroundColor: '#FFFFFF',
              borderRadius: 2,
              border: '1px solid #E5E7EB',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                borderColor: '#D1D5DB'
              }
            }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" sx={{ 
                      color: '#6B7280',
                      fontWeight: 500,
                      mb: 1
                    }}>
                      New Cases
                    </Typography>
                    <Typography variant="h4" sx={{ 
                      color: '#3B82F6',
                      fontWeight: 700,
                      fontSize: '2rem'
                    }}>
                      {stats.newCases}
                    </Typography>
                  </Box>
                  <Box sx={{
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: '#EFF6FF'
                  }}>
                    <Add sx={{ color: '#3B82F6', fontSize: 24 }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              backgroundColor: '#FFFFFF',
              borderRadius: 2,
              border: '1px solid #E5E7EB',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                borderColor: '#D1D5DB'
              }
            }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" sx={{ 
                      color: '#6B7280',
                      fontWeight: 500,
                      mb: 1
                    }}>
                      Active Cases
                    </Typography>
                    <Typography variant="h4" sx={{ 
                      color: '#F59E0B',
                      fontWeight: 700,
                      fontSize: '2rem'
                    }}>
                      {stats.activeCases}
                    </Typography>
                  </Box>
                  <Box sx={{
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: '#FFFBEB'
                  }}>
                    <Timeline sx={{ color: '#F59E0B', fontSize: 24 }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              backgroundColor: '#FFFFFF',
              borderRadius: 2,
              border: '1px solid #E5E7EB',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                borderColor: '#D1D5DB'
              }
            }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="body2" sx={{ 
                      color: '#6B7280',
                      fontWeight: 500,
                      mb: 1
                    }}>
                      Completed
                    </Typography>
                    <Typography variant="h4" sx={{ 
                      color: '#10B981',
                      fontWeight: 700,
                      fontSize: '2rem'
                    }}>
                      {stats.completedCases}
                    </Typography>
                  </Box>
                  <Box sx={{
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: '#ECFDF5'
                  }}>
                    <CheckCircle sx={{ color: '#10B981', fontSize: 24 }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Modern Tabs */}
        <Box sx={{ 
          backgroundColor: '#FFFFFF',
          borderRadius: 2,
          border: '1px solid #E5E7EB',
          mb: 4,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
        }}>
          <Tabs 
            value={activeTab} 
            onChange={(e, newValue) => dispatch(setActiveTab(newValue))}
            sx={{
              '& .MuiTabs-indicator': {
                backgroundColor: '#3B82F6',
                height: 3,
                borderRadius: '2px 2px 0 0'
              }
            }}
          >
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    Cases
                  </Typography>
                  <Chip 
                    label={cases.length} 
                    size="small" 
                    sx={{ 
                      backgroundColor: '#F3F4F6',
                      color: '#6B7280',
                      fontWeight: 600,
                      height: 20,
                      fontSize: '0.75rem'
                    }} 
                  />
                </Box>
              }
              sx={{ 
                color: '#6B7280',
                fontWeight: 500,
                textTransform: 'none',
                fontSize: '1rem',
                py: 2,
                px: 3,
                '&.Mui-selected': { 
                  color: '#3B82F6', 
                  fontWeight: 600
                }
              }} 
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    Notifications
                  </Typography>
                  {unreadNotificationCount > 0 && (
                    <Chip 
                      label={unreadNotificationCount} 
                      size="small" 
                      sx={{ 
                        backgroundColor: '#FEE2E2',
                        color: '#DC2626',
                        fontWeight: 600,
                        height: 20,
                        fontSize: '0.75rem'
                      }} 
                    />
                  )}
                </Box>
              }
              sx={{ 
                color: '#6B7280',
                fontWeight: 500,
                textTransform: 'none',
                fontSize: '1rem',
                py: 2,
                px: 3,
                '&.Mui-selected': { 
                  color: '#3B82F6', 
                  fontWeight: 600
                }
              }} 
            />
          </Tabs>
        </Box>

        {/* Tab Content */}
        {activeTab === 0 && (
          <>
            {/* Modern Actions with Search and Filter */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                mb: 3
              }}>
                <Box>
                  <Typography variant="h5" sx={{ 
                    color: '#111827', 
                    fontWeight: 600,
                    mb: 0.5
                  }}>
                    My Cases
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#6B7280' }}>
                    Manage and track your assigned cases
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => dispatch(openDialog('assignmentDialog'))}
                    sx={{
                      backgroundColor: '#3B82F6',
                      color: 'white',
                      fontWeight: 600,
                      borderRadius: 2,
                      px: 3,
                      py: 1.5,
                      textTransform: 'none',
                      fontSize: '0.875rem',
                      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                      '&:hover': {
                        backgroundColor: '#2563EB',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }
                    }}
                  >
                    Assign Clinician
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    sx={{
                      borderColor: '#D1D5DB',
                      color: '#374151',
                      fontWeight: 500,
                      borderRadius: 2,
                      px: 3,
                      py: 1.5,
                      textTransform: 'none',
                      fontSize: '0.875rem',
                      '&:hover': {
                        borderColor: '#9CA3AF',
                        backgroundColor: '#F9FAFB'
                      }
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
                    Refresh
                  </Button>
                </Box>
              </Box>

              {/* Search and Filter Controls */}
              <Box sx={{ 
                display: 'flex', 
                gap: 2, 
                mb: 3,
                alignItems: 'center'
              }}>
                <TextField
                  size="small"
                  placeholder="Search cases..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ fontSize: 20, color: '#6B7280' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ 
                    minWidth: 300,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: '#FFFFFF',
                      '&:hover': {
                        backgroundColor: '#F9FAFB',
                      },
                      '&.Mui-focused': {
                        backgroundColor: 'white',
                      }
                    }
                  }}
                />
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Status Filter</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status Filter"
                    onChange={handleStatusFilterChange}
                    sx={{ borderRadius: 2 }}
                  >
                    <MenuItem value="">All Status</MenuItem>
                    <MenuItem value="new">New</MenuItem>
                    <MenuItem value="triaged">Triaged</MenuItem>
                    <MenuItem value="assessed">Assessed</MenuItem>
                    <MenuItem value="in_rehab">In Rehab</MenuItem>
                    <MenuItem value="return_to_work">Return to Work</MenuItem>
                    <MenuItem value="closed">Closed</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>

        {/* Modern Cases Table */}
        <Card sx={{ 
          backgroundColor: '#FFFFFF',
          borderRadius: 2,
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
        }}>
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ p: 3, borderBottom: '1px solid #E5E7EB' }}>
              <Typography variant="h6" sx={{ 
                color: '#111827', 
                fontWeight: 600,
                fontSize: '1.125rem'
              }}>
                Cases Overview
              </Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead sx={{ backgroundColor: '#F9FAFB' }}>
                  <TableRow>
                    <TableCell sx={{ 
                      color: '#374151', 
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      py: 2
                    }}>
                      Case #
                    </TableCell>
                    <TableCell sx={{ 
                      color: '#374151', 
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      py: 2
                    }}>
                      Worker
                    </TableCell>
                    <TableCell sx={{ 
                      color: '#374151', 
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      py: 2
                    }}>
                      Incident
                    </TableCell>
                    <TableCell sx={{ 
                      color: '#374151', 
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      py: 2
                    }}>
                      Status
                    </TableCell>
                    <TableCell sx={{ 
                      color: '#374151', 
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      py: 2
                    }}>
                      Severity
                    </TableCell>
                    <TableCell sx={{ 
                      color: '#374151', 
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      py: 2
                    }}>
                      Clinician
                    </TableCell>
                    <TableCell sx={{ 
                      color: '#374151', 
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      py: 2
                    }}>
                      Created
                    </TableCell>
                    <TableCell sx={{ 
                      color: '#374151', 
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      py: 2
                    }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {casesLoading ? (
                    // Loading skeleton rows
                    Array.from({ length: rowsPerPage }).map((_, index) => (
                      <TableRow key={`loading-${index}`}>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <CircularProgress size={20} sx={{ mr: 2 }} />
                            <Typography variant="body2" sx={{ color: '#6B7280' }}>
                              Loading...
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell><CircularProgress size={16} /></TableCell>
                        <TableCell><CircularProgress size={16} /></TableCell>
                        <TableCell><CircularProgress size={16} /></TableCell>
                        <TableCell><CircularProgress size={16} /></TableCell>
                        <TableCell><CircularProgress size={16} /></TableCell>
                        <TableCell><CircularProgress size={16} /></TableCell>
                        <TableCell><CircularProgress size={16} /></TableCell>
                      </TableRow>
                    ))
                  ) : cases.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <Assessment sx={{ fontSize: 48, color: '#9CA3AF', mb: 2 }} />
                          <Typography variant="h6" sx={{ color: '#6B7280', fontWeight: 500, mb: 1 }}>
                            No cases found
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#9CA3AF' }}>
                            {searchTerm || statusFilter ? 
                              'Try adjusting your search or filter criteria' : 
                              'No cases are currently assigned to you'
                            }
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    cases.map((caseItem: Case) => (
                      <TableRow 
                        key={caseItem.id}
                        sx={{ 
                          '&:hover': {
                            backgroundColor: '#F9FAFB'
                          },
                          borderBottom: '1px solid #F3F4F6'
                        }}
                      >
                        <TableCell sx={{ py: 2 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500, color: '#111827' }}>
                            {caseItem.case_number}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 2 }}>
                          <Typography variant="body2" sx={{ color: '#374151' }}>
                            {caseItem.worker?.first_name} {caseItem.worker?.last_name}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 2 }}>
                          <Typography variant="body2" sx={{ color: '#374151' }}>
                            {caseItem.incident?.incident_number || (caseItem.incident_id ? `INC-${caseItem.incident_id.slice(-8)}` : 'N/A')}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 2 }}>
                          <Chip
                            label={getStatusLabel(caseItem.status || 'Unknown')}
                            size="small"
                            sx={{
                              borderRadius: 1,
                              fontWeight: 500,
                              fontSize: '0.75rem',
                              height: 24,
                              backgroundColor: 
                                caseItem.status === 'new' ? '#EFF6FF' :
                                caseItem.status === 'triaged' ? '#FFFBEB' :
                                caseItem.status === 'assessed' ? '#F3E8FF' :
                                caseItem.status === 'in_rehab' ? '#FEE2E2' :
                                caseItem.status === 'return_to_work' ? '#FEF3C7' :
                                caseItem.status === 'closed' ? '#F3F4F6' : '#F3F4F6',
                              color: 
                                caseItem.status === 'new' ? '#1D4ED8' :
                                caseItem.status === 'triaged' ? '#D97706' :
                                caseItem.status === 'assessed' ? '#7C3AED' :
                                caseItem.status === 'in_rehab' ? '#DC2626' :
                                caseItem.status === 'return_to_work' ? '#D97706' :
                                caseItem.status === 'closed' ? '#6B7280' : '#6B7280',
                              border: 'none'
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ py: 2 }}>
                          <Chip
                            label={caseItem.incident?.severity || 'Unknown'}
                            size="small"
                            sx={{
                              borderRadius: 1,
                              fontWeight: 500,
                              fontSize: '0.75rem',
                              height: 24,
                              backgroundColor: 
                                caseItem.incident?.severity === 'low' ? '#ECFDF5' :
                                caseItem.incident?.severity === 'medium' ? '#FFFBEB' :
                                caseItem.incident?.severity === 'high' ? '#FEE2E2' : '#F3F4F6',
                              color: 
                                caseItem.incident?.severity === 'low' ? '#065F46' :
                                caseItem.incident?.severity === 'medium' ? '#D97706' :
                                caseItem.incident?.severity === 'high' ? '#DC2626' : '#6B7280',
                              border: 'none'
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ py: 2 }}>
                          {caseItem.clinician ? (
                            <Typography variant="body2" sx={{ color: '#374151' }}>
                              {caseItem.clinician.first_name} {caseItem.clinician.last_name}
                            </Typography>
                          ) : (
                            <Chip 
                              label="Unassigned" 
                              size="small"
                              sx={{
                                backgroundColor: '#FEF3C7',
                                color: '#D97706',
                                fontWeight: 500,
                                fontSize: '0.75rem',
                                height: 24,
                                borderRadius: 1
                              }}
                            />
                          )}
                        </TableCell>
                        <TableCell sx={{ py: 2 }}>
                          <Typography variant="body2" sx={{ color: '#6B7280' }}>
                            {new Date(caseItem.created_at).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 2 }}>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="View Details">
                              <IconButton
                                size="small"
                                onClick={() => handleViewCaseDetails(caseItem)}
                                sx={{
                                  color: '#6B7280',
                                  '&:hover': {
                                    backgroundColor: '#F3F4F6',
                                    color: '#374151'
                                  }
                                }}
                              >
                                <Visibility sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                            {!caseItem.clinician_id && (
                              <Tooltip title="Assign Clinician">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setAssignmentForm(prev => ({ ...prev, case: caseItem.id }));
                                    dispatch(openDialog('assignmentDialog'));
                                  }}
                                  sx={{
                                    color: '#3B82F6',
                                    '&:hover': {
                                      backgroundColor: '#EFF6FF',
                                      color: '#2563EB'
                                    }
                                  }}
                                >
                                  <Assignment sx={{ fontSize: 18 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                            {caseItem.clinician_id && (
                              <Chip
                                size="small"
                                label="Assigned"
                                sx={{
                                  backgroundColor: '#ECFDF5',
                                  color: '#065F46',
                                  fontWeight: 500,
                                  fontSize: '0.75rem',
                                  height: 24,
                                  borderRadius: 1
                                }}
                              />
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            
            {/* Pagination Controls */}
            <Box sx={{ 
              p: 2, 
              borderTop: '1px solid #E5E7EB',
              backgroundColor: '#F9FAFB',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <Typography variant="body2" sx={{ color: '#6B7280' }}>
                Showing {page * rowsPerPage + 1} to {Math.min((page + 1) * rowsPerPage, pagination.total || 0)} of {pagination.total || 0} cases
              </Typography>
              <TablePagination
                component="div"
                count={pagination.total || 0}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[5, 10, 25, 50]}
                sx={{
                  '& .MuiTablePagination-toolbar': {
                    paddingLeft: 0,
                    paddingRight: 0,
                  },
                  '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                    marginBottom: 0,
                  }
                }}
              />
            </Box>
          </CardContent>
        </Card>
          </>
        )}

        {activeTab === 1 && (
          <Card sx={{ 
            backgroundColor: '#FFFFFF',
            borderRadius: 2,
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ 
                p: 3, 
                borderBottom: '1px solid #E5E7EB',
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center' 
              }}>
                <Box>
                  <Typography variant="h6" sx={{ 
                    color: '#111827', 
                    fontWeight: 600,
                    fontSize: '1.125rem',
                    mb: 0.5
                  }}>
                    Recent Notifications
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#6B7280' }}>
                    Stay updated with the latest updates
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => window.location.href = '/notifications'}
                  sx={{
                    borderColor: '#D1D5DB',
                    color: '#374151',
                    fontWeight: 500,
                    borderRadius: 2,
                    px: 2,
                    py: 1,
                    textTransform: 'none',
                    fontSize: '0.875rem',
                    '&:hover': {
                      borderColor: '#9CA3AF',
                      backgroundColor: '#F9FAFB'
                    }
                  }}
                >
                  View All
                </Button>
              </Box>
              
              <Box sx={{ p: 3 }}>
                {notifications.length === 0 ? (
                  <Box sx={{ 
                    textAlign: 'center', 
                    py: 6,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                  }}>
                    <Box sx={{
                      p: 2,
                      borderRadius: '50%',
                      backgroundColor: '#F3F4F6',
                      display: 'inline-flex',
                      mb: 3
                    }}>
                      <CalendarToday sx={{ fontSize: 32, color: '#9CA3AF' }} />
                    </Box>
                    <Typography variant="h6" sx={{ color: '#6B7280', fontWeight: 500, mb: 1 }}>
                      No notifications yet
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#9CA3AF' }}>
                      You'll see important updates here when they arrive
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    {notifications.slice(0, 5).map((notification) => (
                      <Box
                        key={notification.id}
                        sx={{
                          p: 3,
                          mb: 2,
                          border: '1px solid',
                          borderColor: notification.is_read ? '#E5E7EB' : '#3B82F6',
                          borderRadius: 2,
                          backgroundColor: notification.is_read ? '#FFFFFF' : '#F8FAFF',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': {
                            backgroundColor: notification.is_read ? '#F9FAFB' : '#EFF6FF',
                            borderColor: notification.is_read ? '#D1D5DB' : '#2563EB',
                            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
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
                            <Typography variant="subtitle1" sx={{ 
                              color: '#111827', 
                              fontWeight: 600,
                              mb: 1
                            }}>
                              {notification.title}
                            </Typography>
                            <Typography variant="body2" sx={{ 
                              color: '#6B7280',
                              mb: 2,
                              lineHeight: 1.5
                            }}>
                              {notification.message}
                            </Typography>
                            <Typography variant="caption" sx={{ 
                              color: '#9CA3AF',
                              fontSize: '0.75rem'
                            }}>
                              {new Date(notification.created_at).toLocaleString()}
                            </Typography>
                          </Box>
                          {!notification.is_read && (
                            <Box sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              backgroundColor: '#3B82F6',
                              mt: 1
                            }} />
                          )}
                        </Box>
                      </Box>
                    ))}
                    {notifications.length > 5 && (
                      <Box sx={{ textAlign: 'center', mt: 3 }}>
                        <Button
                          variant="text"
                          onClick={() => window.location.href = '/notifications'}
                          sx={{
                            color: '#3B82F6',
                            fontWeight: 500,
                            textTransform: 'none',
                            fontSize: '0.875rem',
                            '&:hover': {
                              backgroundColor: '#EFF6FF'
                            }
                          }}
                        >
                          View {notifications.length - 5} more notifications
                        </Button>
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Modern Assignment Dialog */}
        <Dialog
          open={dialogs.assignmentDialog || false}
          onClose={() => dispatch(closeDialog('assignmentDialog'))}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
            }
          }}
        >
          <DialogTitle sx={{ 
            backgroundColor: '#F8FAFF',
            color: '#111827',
            fontWeight: 600,
            fontSize: '1.25rem',
            borderBottom: '1px solid #E5E7EB',
            py: 3
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{
                p: 1,
                borderRadius: 2,
                backgroundColor: '#EFF6FF'
              }}>
                <Assignment sx={{ color: '#3B82F6', fontSize: 24 }} />
              </Box>
              Assign Clinician
            </Box>
          </DialogTitle>
          <DialogContent sx={{ py: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: '#6B7280', fontWeight: 500 }}>Case</InputLabel>
                <Select
                  value={assignmentForm.case}
                  onChange={(e) => setAssignmentForm(prev => ({ ...prev, case: e.target.value }))}
                  label="Case"
                  sx={{
                    borderRadius: 2,
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#D1D5DB'
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#9CA3AF'
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#3B82F6'
                    }
                  }}
                >
                  {cases.filter(c => !c.clinician_id).length === 0 ? (
                    <MenuItem disabled>
                      <Typography variant="body2" sx={{ color: '#9CA3AF' }}>
                        No unassigned cases available
                      </Typography>
                    </MenuItem>
                  ) : (
                    cases.filter(c => !c.clinician_id).map((caseItem) => (
                      <MenuItem key={caseItem.id} value={caseItem.id}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {caseItem.case_number}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#6B7280' }}>
                            {caseItem.worker?.first_name} {caseItem.worker?.last_name} • {caseItem.status}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel sx={{ color: '#6B7280', fontWeight: 500 }}>Clinician</InputLabel>
                <Select
                  value={assignmentForm.clinician}
                  onChange={(e) => setAssignmentForm(prev => ({ ...prev, clinician: e.target.value }))}
                  label="Clinician"
                  sx={{
                    borderRadius: 2,
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#D1D5DB'
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#9CA3AF'
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#3B82F6'
                    }
                  }}
                >
                  {clinicians.map((clinician) => (
                    <MenuItem key={clinician.id} value={clinician.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {clinician.first_name} {clinician.last_name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#6B7280' }}>
                            {clinician.specialty || 'General Practice'}
                          </Typography>
                        </Box>
                        <Chip
                          label={clinician.is_available ? 'Available' : 'Busy'}
                          size="small"
                          sx={{
                            backgroundColor: clinician.is_available ? '#ECFDF5' : '#FEF3C7',
                            color: clinician.is_available ? '#065F46' : '#D97706',
                            fontWeight: 500,
                            fontSize: '0.75rem',
                            height: 20
                          }}
                        />
                      </Box>
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
                sx={{
                  borderRadius: 2,
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#D1D5DB'
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#9CA3AF'
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#3B82F6'
                  }
                }}
              />

              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={assignmentForm.notes}
                onChange={(e) => setAssignmentForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add any additional notes for the clinician..."
                sx={{
                  borderRadius: 2,
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#D1D5DB'
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#9CA3AF'
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#3B82F6'
                  }
                }}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ 
            p: 3, 
            backgroundColor: '#F9FAFB',
            borderTop: '1px solid #E5E7EB',
            gap: 2
          }}>
            <Button 
              onClick={() => dispatch(closeDialog('assignmentDialog'))}
              sx={{
                color: '#6B7280',
                fontWeight: 500,
                borderRadius: 2,
                px: 3,
                py: 1.5,
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: '#F3F4F6'
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
                backgroundColor: '#3B82F6',
                color: 'white',
                fontWeight: 600,
                borderRadius: 2,
                px: 4,
                py: 1.5,
                textTransform: 'none',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                '&:hover': {
                  backgroundColor: '#2563EB',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                },
                '&:disabled': {
                  backgroundColor: '#E5E7EB',
                  color: '#9CA3AF'
                }
              }}
            >
              {updatingCase ? <CircularProgress size={20} color="inherit" /> : 'Assign Clinician'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modern Assignment Confirmation Modal */}
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
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }
          }}
        >
          <DialogTitle sx={{ 
            textAlign: 'center', 
            pb: 2,
            backgroundColor: '#F8FAFF',
            borderBottom: '1px solid #E5E7EB'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
              <Box sx={{
                p: 2,
                borderRadius: 2,
                backgroundColor: '#EFF6FF'
              }}>
                <Assignment sx={{ fontSize: 32, color: '#3B82F6' }} />
              </Box>
              <Box>
                <Typography variant="h5" component="div" sx={{ 
                  fontWeight: 700, 
                  color: '#111827',
                  mb: 0.5
                }}>
                  Confirm Assignment
                </Typography>
                <Typography variant="body2" sx={{ color: '#6B7280' }}>
                  Review the details before assigning this case
                </Typography>
              </Box>
            </Box>
          </DialogTitle>
          
          <DialogContent sx={{ py: 4 }}>
            {assignmentToConfirm.case && assignmentToConfirm.clinician && (
              <Box sx={{ 
                backgroundColor: '#F9FAFB',
                borderRadius: 2, 
                p: 4,
                border: '1px solid #E5E7EB'
              }}>
                {/* Case Details */}
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    mb: 3,
                    color: '#111827',
                    fontWeight: 600
                  }}>
                    <LocalHospital sx={{ fontSize: 20, color: '#3B82F6' }} />
                    Case Details
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ color: '#6B7280', fontWeight: 500, mb: 1 }}>
                          Case Number
                        </Typography>
                        <Chip 
                          label={assignmentToConfirm.case.case_number} 
                          sx={{ 
                            backgroundColor: '#EFF6FF',
                            color: '#1D4ED8',
                            fontWeight: 600,
                            borderRadius: 1
                          }}
                        />
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ color: '#6B7280', fontWeight: 500, mb: 1 }}>
                          Status
                        </Typography>
                        <Chip 
                          label={assignmentToConfirm.case.status || 'New'} 
                          sx={{ 
                            backgroundColor: '#FFFBEB',
                            color: '#D97706',
                            fontWeight: 500,
                            borderRadius: 1
                          }}
                        />
                      </Box>
                    </Grid>
                    <Grid item xs={12}>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ color: '#6B7280', fontWeight: 500, mb: 1 }}>
                          Worker
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#111827', fontWeight: 500 }}>
                          {assignmentToConfirm.case.worker?.first_name} {assignmentToConfirm.case.worker?.last_name}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>

                <Divider sx={{ my: 3, borderColor: '#E5E7EB' }} />

                {/* Clinician Details */}
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    mb: 3,
                    color: '#111827',
                    fontWeight: 600
                  }}>
                    <People sx={{ fontSize: 20, color: '#3B82F6' }} />
                    Clinician Details
                  </Typography>
                  
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 3,
                    p: 3,
                    backgroundColor: '#FFFFFF',
                    borderRadius: 2,
                    border: '1px solid #E5E7EB'
                  }}>
                    <Avatar sx={{ 
                      width: 48, 
                      height: 48, 
                      backgroundColor: '#3B82F6',
                      fontSize: 18,
                      fontWeight: 600
                    }}>
                      {assignmentToConfirm.clinician.first_name[0]}{assignmentToConfirm.clinician.last_name[0]}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', mb: 0.5 }}>
                        Dr. {assignmentToConfirm.clinician.first_name} {assignmentToConfirm.clinician.last_name}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#6B7280', mb: 1 }}>
                        {assignmentToConfirm.clinician.specialty || 'General Practice'}
                      </Typography>
                      <Chip
                        label={assignmentToConfirm.clinician.is_available ? 'Available' : 'Busy'}
                        size="small"
                        sx={{
                          backgroundColor: assignmentToConfirm.clinician.is_available ? '#ECFDF5' : '#FEF3C7',
                          color: assignmentToConfirm.clinician.is_available ? '#065F46' : '#D97706',
                          fontWeight: 500,
                          fontSize: '0.75rem',
                          height: 24,
                          borderRadius: 1
                        }}
                      />
                    </Box>
                  </Box>
                </Box>

                {assignmentToConfirm.notes && (
                  <>
                    <Divider sx={{ my: 3, borderColor: '#E5E7EB' }} />
                    <Box sx={{ mb: 4 }}>
                      <Typography variant="h6" sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1,
                        mb: 2,
                        color: '#111827',
                        fontWeight: 600
                      }}>
                        <Edit sx={{ fontSize: 20, color: '#3B82F6' }} />
                        Assignment Notes
                      </Typography>
                      <Box sx={{ 
                        p: 3, 
                        backgroundColor: '#FFFFFF',
                        borderRadius: 2,
                        border: '1px solid #E5E7EB'
                      }}>
                        <Typography variant="body2" sx={{ color: '#374151', lineHeight: 1.6 }}>
                          {assignmentToConfirm.notes}
                        </Typography>
                      </Box>
                    </Box>
                  </>
                )}

                {/* What happens next */}
                <Box sx={{ 
                  p: 3, 
                  backgroundColor: '#ECFDF5',
                  borderRadius: 2,
                  border: '1px solid #D1FAE5'
                }}>
                  <Typography variant="subtitle1" sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    mb: 2,
                    color: '#065F46',
                    fontWeight: 600
                  }}>
                    <CheckCircle sx={{ fontSize: 20 }} />
                    What happens next?
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircle sx={{ fontSize: 16, color: '#10B981' }} />
                      <Typography variant="body2" sx={{ color: '#065F46' }}>
                        Case will be assigned to the selected clinician
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircle sx={{ fontSize: 16, color: '#10B981' }} />
                      <Typography variant="body2" sx={{ color: '#065F46' }}>
                        Notification will be sent to the clinician
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircle sx={{ fontSize: 16, color: '#10B981' }} />
                      <Typography variant="body2" sx={{ color: '#065F46' }}>
                        Clinician's dashboard will be automatically refreshed
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            )}
          </DialogContent>
          
          <DialogActions sx={{ 
            p: 4, 
            backgroundColor: '#F9FAFB',
            borderTop: '1px solid #E5E7EB',
            gap: 2
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
                color: '#6B7280',
                fontWeight: 500,
                borderRadius: 2,
                px: 4,
                py: 1.5,
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: '#F3F4F6'
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
                backgroundColor: '#3B82F6',
                color: 'white',
                fontWeight: 600,
                borderRadius: 2,
                px: 4,
                py: 1.5,
                textTransform: 'none',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                '&:hover': {
                  backgroundColor: '#2563EB',
                  boxShadow: '0 6px 8px -1px rgba(0, 0, 0, 0.1)'
                }
              }}
            >
              Confirm Assignment
            </Button>
          </DialogActions>
        </Dialog>

        {/* Case Details Modal */}
        <Dialog
          open={caseDetailsModal}
          onClose={() => setCaseDetailsModal(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }
          }}
        >
          <DialogTitle sx={{ 
            backgroundColor: '#F8FAFF',
            color: '#111827',
            fontWeight: 600,
            fontSize: '1.25rem',
            borderBottom: '1px solid #E5E7EB',
            py: 3
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{
                p: 1,
                borderRadius: 2,
                backgroundColor: '#EFF6FF'
              }}>
                <Visibility sx={{ color: '#3B82F6', fontSize: 24 }} />
              </Box>
              Case Details
            </Box>
          </DialogTitle>
          
          <DialogContent sx={{ py: 4 }}>
            {selectedCase && (
              <Box sx={{ 
                backgroundColor: '#F9FAFB',
                borderRadius: 2, 
                p: 4,
                border: '1px solid #E5E7EB'
              }}>
                {/* Case Information */}
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    mb: 3,
                    color: '#111827',
                    fontWeight: 600
                  }}>
                    <LocalHospital sx={{ fontSize: 20, color: '#3B82F6' }} />
                    Case Information
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ color: '#6B7280', fontWeight: 500, mb: 1 }}>
                          Case Number
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#111827', fontWeight: 600 }}>
                          {selectedCase.case_number}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ color: '#6B7280', fontWeight: 500, mb: 1 }}>
                          Status
                        </Typography>
                        <Chip 
                          label={getStatusLabel(selectedCase.status || 'Unknown')} 
                          sx={{ 
                            backgroundColor: 
                              selectedCase.status === 'new' ? '#EFF6FF' :
                              selectedCase.status === 'triaged' ? '#FFFBEB' :
                              selectedCase.status === 'assessed' ? '#F3E8FF' :
                              selectedCase.status === 'in_rehab' ? '#FEE2E2' :
                              selectedCase.status === 'return_to_work' ? '#FEF3C7' :
                              selectedCase.status === 'closed' ? '#F3F4F6' : '#F3F4F6',
                            color: 
                              selectedCase.status === 'new' ? '#1D4ED8' :
                              selectedCase.status === 'triaged' ? '#D97706' :
                              selectedCase.status === 'assessed' ? '#7C3AED' :
                              selectedCase.status === 'in_rehab' ? '#DC2626' :
                              selectedCase.status === 'return_to_work' ? '#D97706' :
                              selectedCase.status === 'closed' ? '#6B7280' : '#6B7280',
                            fontWeight: 500,
                            borderRadius: 1
                          }}
                        />
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ color: '#6B7280', fontWeight: 500, mb: 1 }}>
                          Created Date
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#111827' }}>
                          {new Date(selectedCase.created_at).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ color: '#6B7280', fontWeight: 500, mb: 1 }}>
                          Last Updated
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#111827' }}>
                          {new Date(selectedCase.updated_at).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>

                <Divider sx={{ my: 3, borderColor: '#E5E7EB' }} />

                {/* Worker Information */}
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    mb: 3,
                    color: '#111827',
                    fontWeight: 600
                  }}>
                    <People sx={{ fontSize: 20, color: '#3B82F6' }} />
                    Worker Information
                  </Typography>
                  
                  {selectedCase.worker ? (
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 3,
                      p: 3,
                      backgroundColor: '#FFFFFF',
                      borderRadius: 2,
                      border: '1px solid #E5E7EB'
                    }}>
                      <Avatar sx={{ 
                        width: 48, 
                        height: 48, 
                        backgroundColor: '#3B82F6',
                        fontSize: 18,
                        fontWeight: 600
                      }}>
                        {selectedCase.worker.first_name[0]}{selectedCase.worker.last_name[0]}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', mb: 0.5 }}>
                          {selectedCase.worker.first_name} {selectedCase.worker.last_name}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#6B7280' }}>
                          {selectedCase.worker.email}
                        </Typography>
                      </Box>
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#9CA3AF', fontStyle: 'italic' }}>
                      No worker information available
                    </Typography>
                  )}
                </Box>

                <Divider sx={{ my: 3, borderColor: '#E5E7EB' }} />

                {/* Incident Information */}
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    mb: 3,
                    color: '#111827',
                    fontWeight: 600
                  }}>
                    <Warning sx={{ fontSize: 20, color: '#3B82F6' }} />
                    Incident Information
                  </Typography>
                  
                  {selectedCase.incident ? (
                    <Box sx={{ 
                      p: 3,
                      backgroundColor: '#FFFFFF',
                      borderRadius: 2,
                      border: '1px solid #E5E7EB'
                    }}>
                      <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" sx={{ color: '#6B7280', fontWeight: 500, mb: 1 }}>
                              Incident Number
                            </Typography>
                            <Typography variant="body1" sx={{ color: '#111827', fontWeight: 500 }}>
                              {selectedCase.incident.incident_number || 
                               (selectedCase.incident_id ? `INC-${selectedCase.incident_id.slice(-8)}` : 'N/A')}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" sx={{ color: '#6B7280', fontWeight: 500, mb: 1 }}>
                              Severity
                            </Typography>
                            <Chip
                              label={selectedCase.incident.severity || 'Unknown'}
                              size="small"
                              sx={{
                                backgroundColor: 
                                  selectedCase.incident.severity === 'low' ? '#ECFDF5' :
                                  selectedCase.incident.severity === 'medium' ? '#FFFBEB' :
                                  selectedCase.incident.severity === 'high' ? '#FEE2E2' : '#F3F4F6',
                                color: 
                                  selectedCase.incident.severity === 'low' ? '#065F46' :
                                  selectedCase.incident.severity === 'medium' ? '#D97706' :
                                  selectedCase.incident.severity === 'high' ? '#DC2626' : '#6B7280',
                                fontWeight: 500,
                                borderRadius: 1
                              }}
                            />
                          </Box>
                        </Grid>
                        <Grid item xs={12}>
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" sx={{ color: '#6B7280', fontWeight: 500, mb: 1 }}>
                              Description
                            </Typography>
                            <Typography variant="body1" sx={{ color: '#111827', lineHeight: 1.6 }}>
                              {selectedCase.incident.description || 'No description available'}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" sx={{ color: '#6B7280', fontWeight: 500, mb: 1 }}>
                              Incident Date
                            </Typography>
                            <Typography variant="body1" sx={{ color: '#111827' }}>
                              {formatDate(selectedCase.incident.incident_date)}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" sx={{ color: '#6B7280', fontWeight: 500, mb: 1 }}>
                              Incident Type
                            </Typography>
                            <Typography variant="body1" sx={{ color: '#111827' }}>
                              {selectedCase.incident.incident_type || 'Unknown'}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#9CA3AF', fontStyle: 'italic' }}>
                      No incident information available
                    </Typography>
                  )}
                </Box>

                <Divider sx={{ my: 3, borderColor: '#E5E7EB' }} />

                {/* Clinician Information */}
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    mb: 3,
                    color: '#111827',
                    fontWeight: 600
                  }}>
                    <Assignment sx={{ fontSize: 20, color: '#3B82F6' }} />
                    Clinician Assignment
                  </Typography>
                  
                  {selectedCase.clinician ? (
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 3,
                      p: 3,
                      backgroundColor: '#FFFFFF',
                      borderRadius: 2,
                      border: '1px solid #E5E7EB'
                    }}>
                      <Avatar sx={{ 
                        width: 48, 
                        height: 48, 
                        backgroundColor: '#10B981',
                        fontSize: 18,
                        fontWeight: 600
                      }}>
                        {selectedCase.clinician.first_name[0]}{selectedCase.clinician.last_name[0]}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', mb: 0.5 }}>
                          Dr. {selectedCase.clinician.first_name} {selectedCase.clinician.last_name}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#6B7280' }}>
                          {selectedCase.clinician.email}
                        </Typography>
                      </Box>
                      <Chip
                        label="Assigned"
                        size="small"
                        sx={{
                          backgroundColor: '#ECFDF5',
                          color: '#065F46',
                          fontWeight: 500,
                          fontSize: '0.75rem',
                          height: 24,
                          borderRadius: 1
                        }}
                      />
                    </Box>
                  ) : (
                    <Box sx={{ 
                      p: 3,
                      backgroundColor: '#FFFBEB',
                      borderRadius: 2,
                      border: '1px solid #FDE68A',
                      textAlign: 'center'
                    }}>
                      <Typography variant="body1" sx={{ color: '#D97706', fontWeight: 500, mb: 1 }}>
                        No Clinician Assigned
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#92400E' }}>
                        This case is waiting for clinician assignment
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            )}
          </DialogContent>
          
          <DialogActions sx={{ 
            p: 3, 
            backgroundColor: '#F9FAFB',
            borderTop: '1px solid #E5E7EB',
            gap: 2
          }}>
            <Button 
              onClick={() => setCaseDetailsModal(false)}
              sx={{ 
                color: '#6B7280',
                fontWeight: 500,
                borderRadius: 2,
                px: 3,
                py: 1.5,
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: '#F3F4F6'
                }
              }}
              variant="outlined"
            >
              Close
            </Button>
            {selectedCase && !selectedCase.clinician_id && (
              <Button
                onClick={() => {
                  setCaseDetailsModal(false);
                  setAssignmentForm(prev => ({ ...prev, case: selectedCase.id }));
                  dispatch(openDialog('assignmentDialog'));
                }}
                variant="contained"
                startIcon={<Assignment />}
                sx={{
                  backgroundColor: '#3B82F6',
                  color: 'white',
                  fontWeight: 600,
                  borderRadius: 2,
                  px: 4,
                  py: 1.5,
                  textTransform: 'none',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                  '&:hover': {
                    backgroundColor: '#2563EB',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }
                }}
              >
                Assign Clinician
              </Button>
            )}
          </DialogActions>
        </Dialog>

      </Box>
    </LayoutWithSidebar>
  );
};

export default CaseManagerDashboardRedux;
