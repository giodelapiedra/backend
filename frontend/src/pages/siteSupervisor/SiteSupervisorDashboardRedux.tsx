import React, { useEffect, useCallback, useState, useRef, useMemo, memo } from 'react';
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
  LinearProgress,
  Grid,
  Pagination,
  Stack,
} from '@mui/material';
import {
  Add,
  Visibility,
  Edit,
  Warning,
  Assignment,
  Person,
  CheckCircle,
  Cancel,
  Refresh,
  Report,
} from '@mui/icons-material';
import { useAuth, User } from '../../contexts/AuthContext.supabase';
import { dataClient } from '../../lib/supabase';
import LayoutWithSidebar from '../../components/LayoutWithSidebar';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useGetIncidentsQuery, useCreateIncidentMutation, incidentsApi } from '../../store/api/incidentsApi';
import { useGetTeamsQuery, useGetTeamMembersQuery, useGetUnselectedWorkersQuery, teamsApi } from '../../store/api/teamsApi';
import { useGetCasesQuery, casesApi } from '../../store/api/casesApi';
import {
  setSelectedIncident,
  updateIncidentForm,
  resetIncidentForm,
  addPhoto,
  removePhoto,
  clearPhotos,
  setFilters,
  clearFilters,
} from '../../store/slices/incidentsSlice';
import {
  setSelectedTeam,
  setTeamMembers,
} from '../../store/slices/teamsSlice';
import {
  setLoading,
  setError,
  setSuccessMessage,
  openDialog,
  closeDialog,
  setActiveTab,
  clearMessages,
} from '../../store/slices/uiSlice';

// Utility functions for performance optimization
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Simple cache for API responses
const apiCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

const getCachedData = (key: string, ttl: number = 5 * 60 * 1000) => {
  const cached = apiCache.get(key);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }
  apiCache.delete(key);
  return null;
};

const setCachedData = (key: string, data: any, ttl: number = 5 * 60 * 1000) => {
  apiCache.set(key, { data, timestamp: Date.now(), ttl });
};

interface Incident {
  id: string;
  incident_number?: string;
  incident_date?: string;
  incident_type?: string;
  severity?: string;
  status?: string;
  description: string;
  worker?: User;
  reported_by?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  created_at: string;
  return_to_work?: boolean;
  case_id?: string;
}

interface Case {
  _id: string;
  caseNumber: string;
  status: string;
  priority: string;
  worker: User;
  caseManager: User;
  clinician?: User;
  incident: {
    incidentNumber: string;
    incidentDate: string;
    description: string;
  };
  injuryDetails: {
    bodyPart: string;
    injuryType: string;
    severity: string;
    description: string;
  };
  workRestrictions: {
    lifting: {
      maxWeight: number;
      frequency: string;
      duration: string;
    };
    standing: {
      maxDuration: number;
      breaks: number;
    };
    sitting: {
      maxDuration: number;
      breaks: number;
    };
    bending: boolean;
    twisting: boolean;
    climbing: boolean;
    driving: boolean;
    other: string;
  };
  expectedReturnDate?: string;
  createdAt: string;
}

interface DashboardStats {
  totalWorkers: number;
  activeCases: number;
  recentIncidents: number;
  complianceRate: number;
  restrictedWorkers: number;
  incidentsThisMonth: number;
  returnedToWork: number;
  onRestrictedDuty: number;
}

// Memoized incident row component for better performance
const IncidentRow = memo(({ incident, onViewDetails }: { incident: Incident; onViewDetails: (incident: Incident) => void }) => {
  const handleClick = useCallback(() => {
    onViewDetails(incident);
  }, [incident, onViewDetails]);

  return (
    <TableRow 
      key={incident.id}
      sx={{
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        '&:hover': {
          background: 'rgba(255, 107, 107, 0.06)',
          transform: 'scale(1.001)'
        }
      }}
    >
      <TableCell>{incident.incident_number || `INC-${incident.id.slice(-8)}`}</TableCell>
      <TableCell>
        {incident.incident_date ? new Date(incident.incident_date).toLocaleDateString() : 
         incident.created_at ? new Date(incident.created_at).toLocaleDateString() : 'N/A'}
      </TableCell>
      <TableCell>
        {(() => {
          if (!incident.worker) return 'N/A';
          const w: any = incident.worker as any;
          const first = w.first_name || w.firstName || '';
          const last = w.last_name || w.lastName || '';
          const name = `${first} ${last}`.trim();
          return name || 'N/A';
        })()}
      </TableCell>
      <TableCell>{incident.incident_type || 'N/A'}</TableCell>
      <TableCell>
        <Chip
          label={incident.severity || 'unknown'}
          color={
            incident.severity === 'high' || incident.severity === 'lost_time' || incident.severity === 'fatality' ? 'error' :
            incident.severity === 'medium' || incident.severity === 'medical_treatment' ? 'warning' : 'success'
          }
          size="small"
        />
      </TableCell>
      <TableCell>
        <Chip
          label={incident.status || 'reported'}
          color={incident.status === 'reported' ? 'info' : 'success'}
          size="small"
        />
      </TableCell>
      <TableCell>
        <Chip
          label={incident.return_to_work ? 'Returned' : 'Restricted'}
          color={incident.return_to_work ? 'success' : 'warning'}
          size="small"
          icon={incident.return_to_work ? <CheckCircle /> : <Warning />}
        />
      </TableCell>
      <TableCell>
        <IconButton 
          size="small"
          onClick={handleClick}
        >
          <Visibility />
        </IconButton>
      </TableCell>
    </TableRow>
  );
});

const SiteSupervisorDashboardRedux: React.FC = () => {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  
  // Real-time data fetching state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  
  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  // Team leader ID state
  const [selectedTeamLeaderId, setSelectedTeamLeaderId] = useState<string>('');
  
  // Pagination state for incidents - optimized for large datasets
  const [incidentsPagination, setIncidentsPagination] = useState({
    page: 1,
    limit: 20, // Increased for better performance
    total: 0,
    totalPages: 0
  });
  
  // Redux state
  const { 
    selectedIncident, 
    incidentForm, 
    selectedPhotos, 
    photoPreviewUrls 
  } = useAppSelector((state: any) => state.incidents);
  
  const { 
    loading, 
    error, 
    successMessage, 
    dialogs, 
    activeTab 
  } = useAppSelector((state: any) => state.ui);

  // RTK Query hooks - optimized for large datasets
  const { 
    data: incidentsData, 
    isLoading: incidentsLoading, 
    error: incidentsError,
    refetch: refetchIncidents 
  } = useGetIncidentsQuery({ 
    page: incidentsPagination.page, 
    limit: incidentsPagination.limit 
  }, {
    // Cache for 2 minutes
    pollingInterval: 0,
    refetchOnMountOrArgChange: 30,
    refetchOnFocus: false,
    refetchOnReconnect: true
  });
  
  const { 
    data: casesData, 
    isLoading: casesLoading, 
    error: casesError 
  } = useGetCasesQuery({ 
    // Optimized pagination for large datasets
    page: 1, 
    limit: 25 
  }, {
    pollingInterval: 0,
    refetchOnMountOrArgChange: 60,
    refetchOnFocus: false
  });
  
  const { 
    data: teamsData, 
    isLoading: teamsLoading, 
    error: teamsError,
    refetch: refetchTeams
  } = useGetTeamsQuery(user?.id || '', {
    skip: !user?.id,
    pollingInterval: 0,
    refetchOnMountOrArgChange: 300, // Cache for 5 minutes
    refetchOnFocus: false
  });
  
  const { 
    data: unselectedWorkersData, 
    isLoading: unselectedWorkersLoading, 
    error: unselectedWorkersError 
  } = useGetUnselectedWorkersQuery(
    { teamLeaderId: selectedTeamLeaderId || '', date: undefined },
    { 
      skip: !selectedTeamLeaderId,
      pollingInterval: 0,
      refetchOnMountOrArgChange: 30,
      refetchOnFocus: false
    }
  );

  // Combined loading state for better UX
  const isAnyLoading = incidentsLoading || casesLoading || teamsLoading || unselectedWorkersLoading;

  const [createIncident, { isLoading: creatingIncident }] = useCreateIncidentMutation();

  // Derived data
  const incidents = incidentsData?.incidents || [];
  const cases = casesData?.cases || [];
  const teams = teamsData?.teams || [];
  const currentTeam = teamsData?.currentTeam || null;
  
  // Update pagination state when incidents data changes
  useEffect(() => {
    if (incidentsData) {
      // Use pagination data from API if available, otherwise calculate from total
      const total = incidentsData.pagination?.total || incidentsData.total || 0;
      const totalPages = incidentsData.pagination?.totalPages || Math.ceil(total / incidentsPagination.limit);
      
      setIncidentsPagination(prev => ({
        ...prev,
        total,
        totalPages
      }));
    }
  }, [incidentsData, incidentsPagination.limit]);
  
  // Use ref to prevent infinite loop
  const casesRef = useRef(cases);
  
  // Update cases ref when cases change
  useEffect(() => {
    casesRef.current = cases;
  }, [cases]);
  // teamMembers comes from Redux state, not from API directly

  // Redux teamMembers state
  const { 
    selectedTeam, 
    teamMembers 
  } = useAppSelector((state: any) => state.teams);
  
  // Optimized team members loading with caching
  const loadTeamMembers = useCallback(async (teamLeaderId: string, teamName: string) => {
    const cacheKey = `team-members-${teamLeaderId}-${teamName}`;
    const cached = getCachedData(cacheKey, 2 * 60 * 1000); // 2 minutes cache
    
    if (cached) {
      dispatch(setTeamMembers(cached));
      return;
    }

    if (unselectedWorkersData?.unselectedWorkers && teamLeaderId) {
      
      // Optimized filtering with security validation
      // For incident reporting: Only show workers with OPEN incidents for the selected team leader
      const transformedTeamMembers = unselectedWorkersData.unselectedWorkers
        .filter((unselected: any) => unselected.case_status === 'open')
        .filter((unselected: any) => {
          // Security: Validate required fields
          if (!unselected?.worker?.id || !unselected?.worker?.first_name || !unselected?.worker?.last_name) {
            console.warn('⚠️ Skipping invalid worker data:', unselected);
            return false;
          }

          // Security: Validate UUID format for worker ID
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(unselected.worker.id)) {
            console.warn('⚠️ Invalid worker ID format:', unselected.worker.id);
            return false;
          }

          // All workers with open case status should be included
          return true;
        })
        .map((unselected: any) => {
          // Worker has OPEN case by filter above
          const hasOpenCase = true;
          
          // Security: Sanitize and validate data
          const sanitizedWorker = {
            id: unselected.worker.id,
            first_name: unselected.worker.first_name?.trim() || '',
            last_name: unselected.worker.last_name?.trim() || '',
            name: `${unselected.worker.first_name?.trim() || ''} ${unselected.worker.last_name?.trim() || ''}`.trim(),
            email: unselected.worker.email?.trim() || '',
            reason: unselected.reason || 'unknown',
            notes: unselected.notes?.trim() || 'No notes provided',
            caseStatus: unselected.case_status || 'open',
            hasOpenCase: hasOpenCase, // Always true here
            warningMessage: hasOpenCase ? 'This worker has an open case' : null
          };

          // Security: Validate reason against allowed values
          const allowedReasons = ['sick', 'on_leave_rdo', 'transferred', 'injured_medical', 'not_rostered'];
          if (!allowedReasons.includes(sanitizedWorker.reason)) {
            console.warn('⚠️ Invalid reason, defaulting to unknown:', sanitizedWorker.reason);
            sanitizedWorker.reason = 'unknown';
          }

          return sanitizedWorker;
        });
      
      // Update Redux state with the transformed data
      dispatch(setTeamMembers(transformedTeamMembers));
      setCachedData(cacheKey, transformedTeamMembers);
    } else if (!unselectedWorkersLoading && (teamLeaderId || teamName)) {
      // Fallbacks: try direct Supabase fetch
      (async () => {
        try {
          const { SupabaseAPI } = await import('../../utils/supabaseApi');
          const api = new SupabaseAPI();
          const res: any = selectedTeamLeaderId ? await api.getUnselectedWorkerReasons(selectedTeamLeaderId, {
            limit: 100,
            offset: 0,
            includeCount: false
          }) : { success: false };

          const data = (res && res.success && Array.isArray(res.data)) ? res.data : [];

          if (data.length > 0) {
            const transformed = data
              .filter((u: any) => u.case_status === 'open' && u.worker_id)
              .map((u: any) => ({
                id: u.worker_id,
                first_name: (u.worker?.first_name || '').trim(),
                last_name: (u.worker?.last_name || '').trim(),
                name: `${(u.worker?.first_name || '').trim()} ${(u.worker?.last_name || '').trim()}`.trim(),
                email: (u.worker?.email || '').trim(),
                reason: u.reason || 'unknown',
                notes: (u.notes || '').trim() || 'No notes provided',
                caseStatus: u.case_status || 'open',
                hasOpenCase: true,
                warningMessage: 'This worker has an open case'
              }));

            dispatch(setTeamMembers(transformed));
            return;
          }

          // Second fallback: fetch by TEAM (workers' team), regardless of team_leader_id
          // Load open incidents and join worker to filter by selected team name
          if (!selectedTeam) {
            dispatch(setTeamMembers([]));
            return;
          }
          const { data: openByTeam, error } = await dataClient
            .from('unselected_workers')
            .select(`
              *,
              worker:worker_id (id, first_name, last_name, email, team)
            `)
            .eq('case_status', 'open')
            .order('created_at', { ascending: false });

          if (!error && Array.isArray(openByTeam)) {
            const transformedTeam = openByTeam
              .filter((row: any) => (row.worker?.team || '').toLowerCase() === (selectedTeam || '').toLowerCase())
              .map((u: any) => ({
                id: u.worker_id,
                first_name: (u.worker?.first_name || '').trim(),
                last_name: (u.worker?.last_name || '').trim(),
                name: `${(u.worker?.first_name || '').trim()} ${(u.worker?.last_name || '').trim()}`.trim(),
                email: (u.worker?.email || '').trim(),
                reason: u.reason || 'unknown',
                notes: (u.notes || '').trim() || 'No notes provided',
                caseStatus: u.case_status || 'open',
                hasOpenCase: true,
                warningMessage: 'This worker has an open case'
              }));

            dispatch(setTeamMembers(transformedTeam));
            return;
          }
        } catch (_) {
          // ignore fallback errors
        }
        // Nothing found even after fallback; clear list
        dispatch(setTeamMembers([]));
        setCachedData(cacheKey, []);
      })();
    }
  }, [unselectedWorkersData, selectedTeamLeaderId, selectedTeam, unselectedWorkersLoading, dispatch]);

  // Debounced team selection handler
  const debouncedLoadTeamMembers = useMemo(
    () => debounce((teamLeaderId: string, teamName: string) => {
      loadTeamMembers(teamLeaderId, teamName);
    }, 300),
    [loadTeamMembers]
  );

  // Optimized effect for team members loading
  useEffect(() => {
    if (selectedTeamLeaderId && selectedTeam) {
      debouncedLoadTeamMembers(selectedTeamLeaderId, selectedTeam);
    }
  }, [selectedTeamLeaderId, selectedTeam, debouncedLoadTeamMembers]);

  // Fetch notifications (same logic as /notifications page)
  const fetchNotifications = useCallback(async () => {
    try {
      if (!user?.id) return;

      const { data: notificationsData, error: notificationsError } = await dataClient
        .from('notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false });

      if (notificationsError) {
        throw notificationsError;
      }

      setNotifications(notificationsData || []);
      setUnreadNotificationCount(notificationsData?.filter(n => !n.is_read).length || 0);
    } catch (err: any) {
      console.error('Error fetching notifications:', err);
    }
  }, [user?.id]);

  // Removed auto refresh functionality - manual refresh only

  // Optimized stats calculation with memoization
  const stats: DashboardStats = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return {
      totalWorkers: teamMembers.length,
      activeCases: cases.filter(c => ['triaged', 'assessed', 'in_rehab'].includes(c.status)).length,
      recentIncidents: incidents.filter(i => {
        const incidentDate = new Date(i.incident_date || i.created_at);
        return incidentDate >= thirtyDaysAgo;
      }).length,
      complianceRate: 85, // Mock data - could be calculated from actual data
      restrictedWorkers: cases.filter(c => c.status === 'in_rehab').length,
      incidentsThisMonth: incidents.filter(i => {
        const incidentDate = new Date(i.incident_date || i.created_at);
        return incidentDate.getMonth() === now.getMonth() && 
               incidentDate.getFullYear() === now.getFullYear();
      }).length,
      returnedToWork: incidents.filter(i => i.return_to_work === true).length,
      onRestrictedDuty: incidents.filter(i => i.return_to_work === false).length,
    };
  }, [teamMembers.length, cases, incidents]);

  // Initial data fetch (same as /notifications page)
  useEffect(() => {
    // Listen for global notification refresh events
    const handleNotificationRefresh = (event: CustomEvent) => {
      const { userId, allRead } = event.detail;
      console.log('Received notification refresh event:', { userId, allRead });
      
      if (userId === user?.id) {
        console.log('🔄 Refreshing notifications for current user...');
        fetchNotifications();
      }
    };

    // Add event listener
    window.addEventListener('notificationsMarkedAsRead', handleNotificationRefresh as EventListener);

    if (user?.id) {
      fetchNotifications();
    }

    // Cleanup
    return () => {
      window.removeEventListener('notificationsMarkedAsRead', handleNotificationRefresh as EventListener);
    };
  }, [user?.id, fetchNotifications]);

  // Real-time subscription for notifications - essential for receiving new notifications
  useEffect(() => {
    if (!user?.id) return;

    console.log('🚀 Initializing real-time notifications...');

    const subscription = dataClient
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${user.id}`
        },
        (payload) => {
          console.log('New notification received:', payload);
          // Only refresh notifications, not all data
          fetchNotifications();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Notification updated:', payload);
          // Only refresh notifications
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id, fetchNotifications]);

  // Lightweight real-time subscription for incidents - just to notify of changes
  useEffect(() => {
    if (!user?.id) return;

    console.log('🚀 Initializing lightweight real-time incidents...');

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
          console.log('🔄 New incident detected:', payload);
          // Just invalidate cache, don't aggressively refetch
          dispatch(incidentsApi.util.invalidateTags(['Incident']));
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
          console.log('🔄 Incident updated:', payload);
          // Just invalidate cache, don't aggressively refetch
          dispatch(incidentsApi.util.invalidateTags(['Incident']));
        }
      )
      .subscribe((status) => {
        console.log('📡 Lightweight real-time incidents subscription status:', status);
      });

    return () => {
      console.log('🧹 Cleaning up lightweight real-time incidents subscription...');
      incidentsSubscription.unsubscribe();
    };
  }, [user?.id, dispatch]);


  // This effect is now handled by the sync effect above
  // Keeping this for reference but the main logic is in the sync effect

  // Auto-select current team if available
  useEffect(() => {
    if (currentTeam && !selectedTeam) {
      console.log('Auto-selecting current team:', currentTeam);
      dispatch(setSelectedTeam(currentTeam));
    }
  }, [currentTeam, selectedTeam, dispatch]);

  // Debug logging
  useEffect(() => {
    console.log('Redux Dashboard Debug:', {
      user: {
        id: user?.id,
        role: user?.role,
        firstName: user?.firstName,
        lastName: user?.lastName
      },
      selectedTeam,
      teams,
      teamMembers,
      unselectedWorkersData,
      teamsData,
      teamsLoading,
      teamsError
    });
  }, [user, selectedTeam, teams, teamMembers, unselectedWorkersData, teamsData, teamsLoading, teamsError]);

  useEffect(() => {
    if (incidentsError || casesError || teamsError || unselectedWorkersError) {
      const errorMessage = incidentsError || casesError || teamsError || unselectedWorkersError;
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
  }, [incidentsError, casesError, teamsError, unselectedWorkersError, dispatch]);

  // Handlers
  const handleCreateIncidentClick = useCallback(() => {
    // Validate required fields first
    if (!incidentForm.worker) {
      dispatch(setError('Please select a worker'));
      return;
    }
    if (!incidentForm.incidentDate) {
      dispatch(setError('Please select an incident date'));
      return;
    }
    if (!incidentForm.incidentType) {
      dispatch(setError('Please select an incident type'));
      return;
    }
    if (!incidentForm.severity) {
      dispatch(setError('Please select a severity level'));
      return;
    }
    if (!incidentForm.description.trim()) {
      dispatch(setError('Please provide a description'));
      return;
    }

    // Show confirmation dialog
    setShowConfirmDialog(true);
  }, [incidentForm, dispatch]);

  const handleCreateIncident = useCallback(async () => {
    try {
      // Validate only the essential field
      if (!incidentForm.description.trim()) {
        dispatch(setError('Please provide a description'));
        return;
      }

      if (!user?.id) {
        dispatch(setError('User information not available'));
        return;
      }

      // Check if we need to refresh the auth token
      try {
        const { data: { session }, error: sessionError } = await dataClient.auth.getSession();
        if (sessionError || !session) {
          console.log('🔄 Session expired, refreshing...');
          // Try to refresh the session
          const { data: refreshData, error: refreshError } = await dataClient.auth.refreshSession();
          if (refreshError) {
            console.error('❌ Failed to refresh session:', refreshError);
            dispatch(setError('Session expired. Please log out and log back in.'));
            return;
          }
          console.log('✅ Session refreshed successfully');
        }
      } catch (authError) {
        console.error('❌ Auth check failed:', authError);
        dispatch(setError('Authentication error. Please refresh the page and try again.'));
        return;
      }

      // Prepare incident data with proper team filtering logic
      const incidentData: any = {
        description: incidentForm.description,
        reported_by_id: user.id, // Site supervisor who is reporting the incident
        worker_id: incidentForm.worker || user.id, // Selected unselected worker from filtered team
        severity: incidentForm.severity || 'low', // Include severity to prevent "unknown" values
        incident_type: incidentForm.incidentType || 'other' // Include incident type to prevent "N/A" values
      };
      
      console.log('🎯 Creating incident with team-filtered worker data');
      console.log('📊 Selected team:', selectedTeam);
      console.log('📊 Selected team leader ID:', selectedTeamLeaderId);
      console.log('📊 Selected worker ID:', incidentForm.worker);
      console.log('📊 Reporter ID:', user.id);
      
      // Debug: Find the selected worker details
      const selectedWorker = teamMembers.find((member: any) => member.id === incidentForm.worker);
      console.log('🔍 Selected worker details:', selectedWorker);
      console.log('🔍 Team members available:', teamMembers.length);

      console.log('Form submitting incident data:', JSON.stringify(incidentData, null, 2));
      console.log('Form severity:', incidentForm.severity);
      console.log('Form incident type:', incidentForm.incidentType);
      console.log('Form worker:', incidentForm.worker);
      console.log('Form incident date:', incidentForm.incidentDate);
      console.log('Form description:', incidentForm.description);
      console.log('User ID:', user.id);

      // Create incident
      const result = await createIncident(incidentData).unwrap();
      
      console.log('Incident creation result:', result);
      
      // Handle photo uploads if any
      if (selectedPhotos.length > 0) {
        // TODO: Implement photo upload to Supabase storage
        console.log('Photo uploads to be implemented:', selectedPhotos.length);
      }

      // Reset form and close dialog
      dispatch(resetIncidentForm());
      dispatch(clearPhotos());
      dispatch(closeDialog('incidentDialog'));
      dispatch(clearMessages());

      // Show success message based on case creation result
      let successMessage = 'Incident reported successfully!';
      
      if (result?.caseCreated && result?.caseManager) {
        successMessage = `Incident reported successfully! A case has been automatically created and assigned to ${result.caseManager.first_name} ${result.caseManager.last_name}. Both the case manager and worker have been notified.`;
      } else if (result?.caseCreated) {
        successMessage = 'Incident reported successfully! A case has been automatically created and assigned to an available case manager.';
      } else {
        successMessage = 'Incident reported successfully! A case manager will be assigned shortly.';
      }
      
      dispatch(setSuccessMessage(successMessage));
      
      // Success message will remain until user manually closes it

      // Comprehensive cache clearing and data refresh
      console.log('🧹 Clearing all storage after incident creation...');
      
      // Clear RTK Query cache for all APIs
      dispatch(incidentsApi.util.resetApiState());
      dispatch(teamsApi.util.resetApiState());
      dispatch(casesApi.util.resetApiState());
      
      // Invalidate all tags to force refetch
      dispatch(incidentsApi.util.invalidateTags(['Incident']));
      dispatch(teamsApi.util.invalidateTags(['Team']));
      dispatch(casesApi.util.invalidateTags(['Case']));
      
      // Clear browser cache
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
      
      // Clear localStorage and sessionStorage
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('rtk') || key.includes('cache') || key.includes('supabase'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Force refetch all data
      refetchIncidents();
      refetchTeams();
      
      console.log('✅ All storage cleared and data refreshed');

    } catch (err: any) {
      console.error('❌ Error creating incident:', err);
      console.error('❌ Error type:', typeof err);
      console.error('❌ Error stringified:', JSON.stringify(err, null, 2));
      
      // Extract error message from different possible locations
      let errorMessage = 'Failed to create incident';
      
      if (err?.message) {
        errorMessage = err.message;
      } else if (err?.data?.message) {
        errorMessage = err.data.message;
      } else if (err?.data?.error?.message) {
        errorMessage = err.data.error.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err?.status) {
        errorMessage = `Server error (${err.status}): ${err.data?.message || 'Unknown server error'}`;
      } else if (err?.code) {
        errorMessage = `Database error (${err.code}): ${err.message || 'Unknown database error'}`;
      }
      
      console.error('❌ Final error message:', errorMessage);
      dispatch(setError(errorMessage));
    } finally {
      // Close confirmation dialog
      setShowConfirmDialog(false);
    }
  }, [incidentForm, selectedPhotos, user, createIncident, dispatch, refetchIncidents, refetchTeams]);

  const handleTeamSelection = useCallback(async (teamName: string) => {
    dispatch(setSelectedTeam(teamName));
    
    // Clear worker selection when team changes
    dispatch(updateIncidentForm({ worker: '' }));
    
    // Find the team leader for this team
    try {
      // First try to find team leader
      const { data: teamLeader, error: teamLeaderError } = await dataClient
        .from('users')
        .select('id, first_name, last_name, email, role, team')
        .eq('role', 'team_leader')
        .ilike('team', teamName)
        .single();
      
      if (teamLeaderError) {
        // Fallback A: try to find any user with this team (case-insensitive)
        const { data: anyUser, error: anyUserError } = await dataClient
          .from('users')
          .select('id, first_name, last_name, email, role, team')
          .ilike('team', teamName)
          .limit(1)
          .single();
        
        if (anyUserError) {
          // Fallback B: find team leader by managed_teams containing the team (case-insensitive)
          const { data: managedLeader, error: managedErr } = await dataClient
            .from('users')
            .select('id, first_name, last_name, email, role, managed_teams')
            .eq('role', 'team_leader')
            .contains('managed_teams', [teamName]) as any;

          if (!managedErr && Array.isArray(managedLeader) && managedLeader.length > 0) {
            setSelectedTeamLeaderId(managedLeader[0].id);
            return;
          }

          setSelectedTeamLeaderId('');
          return;
        }
        
        setSelectedTeamLeaderId(anyUser.id);
        return;
      }
      
      if (teamLeader) {
        // Store the team leader ID for fetching unselected workers
        setSelectedTeamLeaderId(teamLeader.id);
      } else {
        // Last fallback: try managed_teams for team leaders
        const { data: managedLeader, error: managedErr } = await dataClient
          .from('users')
          .select('id, managed_teams')
          .eq('role', 'team_leader')
          .contains('managed_teams', [teamName]) as any;

        if (!managedErr && Array.isArray(managedLeader) && managedLeader.length > 0) {
          setSelectedTeamLeaderId(managedLeader[0].id);
        } else {
          setSelectedTeamLeaderId('');
        }
      }
    } catch (err) {
      setSelectedTeamLeaderId('');
    }
  }, [dispatch]);

  const handlePhotoSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        if (file.type.startsWith('image/')) {
          const previewUrl = URL.createObjectURL(file);
          dispatch(addPhoto({ file, previewUrl }));
        }
      });
    }
  }, [dispatch]);

  const handlePhotoRemove = useCallback((index: number) => {
    dispatch(removePhoto(index));
  }, [dispatch]);

  const handleFormChange = useCallback((field: string, value: any) => {
    dispatch(updateIncidentForm({ [field]: value }));
  }, [dispatch]);

  // View details handler for memoized component
  const handleViewDetails = useCallback((incident: Incident) => {
    dispatch(setSelectedIncident(incident));
    dispatch(openDialog('incidentDetailsDialog' as any));
  }, [dispatch]);

  // Optimized pagination handlers with caching
  const handlePageChange = useCallback((event: React.ChangeEvent<unknown>, page: number) => {
    setIncidentsPagination(prev => ({ ...prev, page }));
  }, []);

  const handleLimitChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newLimit = parseInt(event.target.value, 10);
    setIncidentsPagination(prev => ({ 
      ...prev, 
      limit: newLimit, 
      page: 1 // Reset to first page when changing limit
    }));
  }, []);

  // Enhanced loading state with loading skeletons
  if (isAnyLoading) {
    return (
      <LayoutWithSidebar>
        <Box sx={{ p: 3 }}>
          {/* Loading Header */}
          <Box sx={{ mb: 3 }}>
            <LinearProgress sx={{ mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              Site Supervisor Dashboard
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Loading data...
            </Typography>
          </Box>
          
          {/* Loading Stats Cards */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2, mb: 3 }}>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <LinearProgress sx={{ width: 100, mb: 1 }} />
                      <LinearProgress sx={{ width: 60 }} />
                    </Box>
                    <CircularProgress size={24} />
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
          
          {/* Loading Table */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Latest Incidents</Typography>
              {[1, 2, 3].map((i) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }} key={i}>
                  <CircularProgress size={16} />
                  <Box sx={{ flexGrow: 1 }}>
                    <LinearProgress sx={{ mb: 1 }} />
                    <LinearProgress sx={{ width: '60%' }} />
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Box>
      </LayoutWithSidebar>
    );
  }

  return (
    <LayoutWithSidebar>
      <Box sx={{ 
        p: { xs: 1, sm: 2, md: 3 }, 
        minHeight: '100vh',
        background: { xs: 'transparent', md: 'transparent' },
        fontFamily: { xs: '-apple-system BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', md: 'inherit' },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23000000" fill-opacity="0.02"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          zIndex: 0
        }
      }}>
        {/* Enhanced Professional Header */}
        <Box sx={{ 
          mb: 4, // Consistent spacing
          position: 'relative', 
          zIndex: 1,
          borderRadius: 3,
          overflow: 'hidden',
          pb: 2, // Padding for divider space
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '1px',
            background: 'linear-gradient(90deg, transparent 0%, rgba(123, 104, 238, 0.2) 20%, rgba(123, 104, 238, 0.3) 50%, rgba(123, 104, 238, 0.2) 80%, transparent 100%)',
            opacity: 0.8
          }
        }}>
          <Box sx={{ mb: 4 }}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start', 
              mb: 3
            }}>
              <Box sx={{ textAlign: { xs: 'center', md: 'left' }, flex: 1 }}>
                <Typography variant="h4" component="h1" gutterBottom sx={{ 
                  fontSize: { xs: '1.75rem', md: '2.25rem' },
                  fontWeight: 700,
                  lineHeight: 1.2,
                  letterSpacing: '-0.025em',
                  color: '#1a202c',
                  mb: 1
                }}>
                  Site Supervisor Dashboard
                </Typography>
                <Typography sx={{ 
                  fontSize: { xs: '0.875rem', md: '1rem' },
                  fontWeight: 400,
                  color: '#6b7280',
                  mb: 0,
                  maxWidth: { xs: '100%', md: '600px' }
                }}>
                  Welcome back, {user?.firstName} {user?.lastName} • Comprehensive site oversight and safety management
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 2, mt: { xs: 2, md: 0 } }}>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={() => {
                    // Clear cache before refetching
                    apiCache.clear();
                    refetchIncidents();
                    refetchTeams();
                    // Reset pagination to first page
                    setIncidentsPagination(prev => ({ ...prev, page: 1 }));
                  }}
                  sx={{ 
                    borderRadius: '12px',
                    padding: '12px 20px',
                    background: 'rgba(255, 255, 255, 0.9)',
                    border: '2px solid rgba(123, 104, 238, 0.2)',
                    color: '#5A4FCF',
                    fontWeight: 600,
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      border: '2px solid rgba(123, 104, 238, 0.4)',
                      background: 'rgba(123, 104, 238, 0.05)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 25px rgba(123, 104, 238, 0.2)'
                    }
                  }}
                >
                  Refresh Data
                </Button>
                
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => dispatch(openDialog('incidentDialog'))}
                  sx={{
                    borderRadius: '12px',
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #FF6B6B 0%, #E55555 100%)',
                    fontWeight: 600,
                    boxShadow: '0 4px 12px rgba(255, 107, 107, 0.3)',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': { 
                      background: 'linear-gradient(135deg, #E55555 0%, #dc2626 100%)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 25px rgba(255, 107, 107, 0.4)'
                    },
                    '&:active': {
                      transform: 'translateY(1px)',
                      boxShadow: '0 2px 8px rgba(255, 107, 107, 0.3)'
                    }
                  }}
                >
                  Report Incident
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Error Messages */}
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

        {/* Professional Success Dialog Modal */}
        <Dialog
          open={!!successMessage}
          onClose={() => dispatch(setSuccessMessage(null))}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: '16px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              overflow: 'hidden'
            }
          }}
        >
          <DialogContent sx={{ p: 0, position: 'relative' }}>
            {/* Success Header with Gradient */}
            <Box
              sx={{
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: 'white',
                p: 4,
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Background Pattern */}
              <Box
                sx={{
                  position: 'absolute',
                  top: -50,
                  right: -50,
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.1)',
                  opacity: 0.3
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  bottom: -30,
                  left: -30,
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.1)',
                  opacity: 0.2
                }}
              />
              
              {/* Success Icon */}
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2,
                  position: 'relative',
                  zIndex: 1
                }}
              >
                <CheckCircle sx={{ fontSize: 48, color: 'white' }} />
              </Box>
              
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, position: 'relative', zIndex: 1 }}>
                Incident Reported Successfully!
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, position: 'relative', zIndex: 1 }}>
                Your incident has been processed and assigned
              </Typography>
            </Box>

            {/* Content Area */}
            <Box sx={{ p: 4 }}>
              <Typography variant="body1" sx={{ mb: 3, color: 'text.primary', lineHeight: 1.6 }}>
                {successMessage}
              </Typography>

              {/* Action Items */}
              <Box sx={{ 
                bgcolor: 'grey.50', 
                borderRadius: '12px', 
                p: 3, 
                mb: 3,
                border: '1px solid',
                borderColor: 'grey.200'
              }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}>
                  What happens next:
                </Typography>
                <Box component="ul" sx={{ m: 0, pl: 2, '& li': { mb: 1, color: 'text.secondary' } }}>
                  <li>Case manager will review the incident</li>
                  <li>Worker will be notified of case assignment</li>
                  <li>Follow-up actions will be coordinated</li>
                  <li>You can track progress in the dashboard</li>
                </Box>
              </Box>

              {/* Quick Actions */}
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    dispatch(setSuccessMessage(null));
                    dispatch(openDialog('incidentDialog'));
                  }}
                  sx={{
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontWeight: 600,
                    px: 3
                  }}
                >
                  Report Another Incident
                </Button>
                <Button
                  variant="contained"
                  onClick={() => dispatch(setSuccessMessage(null))}
                  sx={{
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontWeight: 600,
                    px: 3,
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    }
                  }}
                >
                  Continue to Dashboard
                </Button>
              </Box>
            </Box>
          </DialogContent>
        </Dialog>

        {/* Enhanced Summary Cards with Professional Spacing */}
        <Box sx={{ 
          mb: 4, // Consistent spacing
          position: 'relative', 
          zIndex: 1,
          pb: 2, // Padding for divider space
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '1px',
            background: 'linear-gradient(90deg, transparent 0%, rgba(123, 104, 238, 0.1) 30%, rgba(123, 104, 238, 0.2) 50%, rgba(123, 104, 238, 0.1) 70%, transparent 100%)',
            opacity: 0.6
          }
        }}>
          <Grid container spacing={2} justifyContent="center">
            <Grid item xs={12} sm={6} md={2.4}>
              <Card sx={{ 
                borderRadius: '16px',
                border: '1px solid rgba(0, 0, 0, 0.06)',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15), 0 4px 10px rgba(0, 0, 0, 0.09)'
                }
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography sx={{ 
                        fontSize: '1.75rem',
                        fontWeight: 700,
                        color: '#111827',
                        lineHeight: 1.2,
                        mb: 0.5
                      }}>
                        {stats.totalWorkers}
                      </Typography>
                      <Typography sx={{ 
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        Total Workers
                      </Typography>
                    </Box>
                    <Box sx={{ 
                      width: 56, 
                      height: 56, 
                      borderRadius: '14px', 
                      background: 'linear-gradient(135deg, #7B68EE 0%, #5A4FCF 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(123, 104, 238, 0.25), 0 2px 6px rgba(123, 104, 238, 0.15)',
                      transition: 'all 0.2s ease'
                    }}>
                      <Avatar sx={{ width: 24, height: 24, bgcolor: 'transparent', fontSize: '16px' }}>
                        <Person />
                      </Avatar>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={2.4}>
              <Card sx={{ 
                borderRadius: '16px',
                border: '1px solid rgba(0, 0, 0, 0.06)',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15), 0 4px 10px rgba(0, 0, 0, 0.09)'
                }
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography sx={{ 
                        fontSize: '1.75rem',
                        fontWeight: 700,
                        color: '#111827',
                        lineHeight: 1.2,
                        mb: 0.5
                      }}>
                        {stats.activeCases}
                      </Typography>
                      <Typography sx={{ 
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        Active Cases
                      </Typography>
                    </Box>
                    <Box sx={{ 
                      width: 56, 
                      height: 56, 
                      borderRadius: '14px', 
                      background: 'linear-gradient(135deg, #20B2AA 0%, #008B8B 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(32, 178, 170, 0.25), 0 2px 6px rgba(32, 178, 170, 0.15)',
                      transition: 'all 0.2s ease'
                    }}>
                      <Assignment sx={{ fontSize: 24, color: 'white' }} />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={2.4}>
              <Card sx={{ 
                borderRadius: '16px',
                border: '1px solid rgba(0, 0, 0, 0.06)',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15), 0 4px 10px rgba(0, 0, 0, 0.09)'
                }
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography sx={{ 
                        fontSize: '1.75rem',
                        fontWeight: 700,
                        color: '#111827',
                        lineHeight: 1.2,
                        mb: 0.5
                      }}>
                        {stats.recentIncidents}
                      </Typography>
                      <Typography sx={{ 
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        Recent Incidents
                      </Typography>
                    </Box>
                    <Box sx={{ 
                      width: 56, 
                      height: 56, 
                      borderRadius: '14px', 
                      background: 'linear-gradient(135deg, #FF8C00 0%, #FF7F00 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(255, 140, 0, 0.25), 0 2px 6px rgba(255, 140, 0, 0.15)',
                      transition: 'all 0.2s ease'
                    }}>
                      <Warning sx={{ fontSize: 24, color: 'white' }} />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={2.4}>
              <Card sx={{ 
                borderRadius: '16px',
                border: '1px solid rgba(0, 0, 0, 0.06)',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15), 0 4px 10px rgba(0, 0, 0, 0.09)'
                }
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography sx={{ 
                        fontSize: '1.75rem',
                        fontWeight: 700,
                        color: '#111827',
                        lineHeight: 1.2,
                        mb: 0.5
                      }}>
                        {stats.returnedToWork}
                      </Typography>
                      <Typography sx={{ 
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        Returned to Work
                      </Typography>
                    </Box>
                    <Box sx={{ 
                      width: 56, 
                      height: 56, 
                      borderRadius: '14px', 
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25), 0 2px 6px rgba(16, 185, 129, 0.15)',
                      transition: 'all 0.2s ease'
                    }}>
                      <CheckCircle sx={{ fontSize: 24, color: 'white' }} />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={2.4}>
              <Card sx={{ 
                borderRadius: '16px',
                border: '1px solid rgba(0, 0, 0, 0.06)',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15), 0 4px 10px rgba(0, 0, 0, 0.09)'
                }
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography sx={{ 
                        fontSize: '1.75rem',
                        fontWeight: 700,
                        color: '#111827',
                        lineHeight: 1.2,
                        mb: 0.5
                      }}>
                        {stats.onRestrictedDuty}
                      </Typography>
                      <Typography sx={{ 
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        On Restricted Duty
                      </Typography>
                    </Box>
                    <Box sx={{ 
                      width: 56, 
                      height: 56, 
                      borderRadius: '14px', 
                      background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25), 0 2px 6px rgba(245, 158, 11, 0.15)',
                      transition: 'all 0.2s ease'
                    }}>
                      <Warning sx={{ fontSize: 24, color: 'white' }} />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>



        {/* Enhanced Incidents Table */}
        <Card sx={{ 
          borderRadius: '16px',
          border: '1px solid rgba(0, 0, 0, 0.06)',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
          position: 'relative',
          zIndex: 1,
          overflow: 'hidden',
          mx: 0,
          mt: 0
        }}>
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ p: 3, borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <Typography sx={{ 
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2
                }}>
                  <Warning sx={{ fontSize: '1.25rem', opacity: 0.7 }} />
                  Recent Incidents
                  <Typography component="span" sx={{ 
                    fontSize: '0.875rem',
                    fontWeight: 400,
                    color: '#6b7280',
                    opacity: 0.8
                  }}>
                    • {incidentsPagination.total} total incidents
                  </Typography>
                </Typography>
                
                {/* Page info for mobile */}
                <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                  <Typography variant="body2" color="text.secondary">
                    Page {incidentsPagination.page} of {incidentsPagination.totalPages}
                  </Typography>
                </Box>
              </Box>
            </Box>
            <TableContainer>
              <Table sx={{
                '& .MuiTableRow-root:nth-of-type(even)': {
                  background: 'rgba(248, 250, 252, 0.5)'
                },
                '& .MuiTableCell-root': {
                  padding: '16px 12px',
                  borderBottom: '1px solid rgba(0, 0, 0, 0.08)'
                },
                '& .MuiTableRow-root:hover': {
                  background: 'rgba(255, 107, 107, 0.04)',
                  transition: 'all 0.15s ease'
                }
              }}>
                <TableHead sx={{ 
                  background: 'rgba(248, 250, 252, 0.8)',
                  borderBottom: '2px solid rgba(0, 0, 0, 0.12)'
                }}>
                  <TableRow>
                    <TableCell sx={{ 
                      fontWeight: 600,
                      color: '#374151',
                      fontSize: '0.875rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>Incident #</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 600,
                      color: '#374151',
                      fontSize: '0.875rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>Date</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 600,
                      color: '#374151',
                      fontSize: '0.875rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>Worker</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 600,
                      color: '#374151',
                      fontSize: '0.875rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>Type</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 600,
                      color: '#374151',
                      fontSize: '0.875rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>Severity</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 600,
                      color: '#374151',
                      fontSize: '0.875rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>Status</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 600,
                      color: '#374151',
                      fontSize: '0.875rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>Return to Work</TableCell>
                    <TableCell sx={{ 
                      fontWeight: 600,
                      color: '#374151',
                      fontSize: '0.875rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {incidentsLoading ? (
                    // Loading skeleton rows
                    Array.from({ length: incidentsPagination.limit }).map((_, index) => (
                      <TableRow key={`loading-${index}`}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CircularProgress size={16} />
                            <LinearProgress sx={{ flexGrow: 1, height: 4, borderRadius: 2 }} />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <LinearProgress sx={{ height: 4, borderRadius: 2 }} />
                        </TableCell>
                        <TableCell>
                          <LinearProgress sx={{ height: 4, borderRadius: 2 }} />
                        </TableCell>
                        <TableCell>
                          <LinearProgress sx={{ height: 4, borderRadius: 2 }} />
                        </TableCell>
                        <TableCell>
                          <LinearProgress sx={{ height: 4, borderRadius: 2 }} />
                        </TableCell>
                        <TableCell>
                          <LinearProgress sx={{ height: 4, borderRadius: 2 }} />
                        </TableCell>
                        <TableCell>
                          <LinearProgress sx={{ height: 4, borderRadius: 2 }} />
                        </TableCell>
                        <TableCell>
                          <CircularProgress size={20} />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : incidents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                          <Warning sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.5 }} />
                          <Typography variant="h6" color="text.secondary">
                            No incidents found
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            No incidents have been reported yet.
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    incidents.map((incident: Incident) => (
                      <IncidentRow 
                        key={incident.id}
                        incident={incident}
                        onViewDetails={handleViewDetails}
                      />
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            
            {/* Pagination Controls */}
            {incidentsPagination.totalPages > 1 && (
              <Box sx={{ 
                p: 3, 
                borderTop: '1px solid rgba(0, 0, 0, 0.08)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 2
              }}>
                {/* Results Info */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Showing {((incidentsPagination.page - 1) * incidentsPagination.limit) + 1} to{' '}
                    {Math.min(incidentsPagination.page * incidentsPagination.limit, incidentsPagination.total)} of{' '}
                    {incidentsPagination.total} incidents
                  </Typography>
                  
                  {/* Items per page selector */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Show:
                    </Typography>
                    <FormControl size="small" sx={{ minWidth: 80 }}>
                      <Select
                        value={incidentsPagination.limit}
                        onChange={handleLimitChange}
                        displayEmpty
                        sx={{ 
                          '& .MuiSelect-select': { 
                            py: 0.5,
                            fontSize: '0.875rem'
                          }
                        }}
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
                </Box>

                {/* Pagination Component */}
                <Stack spacing={2}>
                  <Pagination
                    count={incidentsPagination.totalPages}
                    page={incidentsPagination.page}
                    onChange={handlePageChange}
                    color="primary"
                    size="medium"
                    showFirstButton
                    showLastButton
                    sx={{
                      '& .MuiPaginationItem-root': {
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        '&.Mui-selected': {
                          background: 'linear-gradient(135deg, #7B68EE 0%, #5A4FCF 100%)',
                          color: 'white',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #5A4FCF 0%, #4C46B8 100%)',
                          }
                        },
                        '&:hover': {
                          background: 'rgba(123, 104, 238, 0.08)',
                        }
                      }
                    }}
                  />
                </Stack>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Incident Dialog */}
        <Dialog
          open={dialogs.incidentDialog}
          onClose={() => dispatch(closeDialog('incidentDialog'))}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Report New Incident</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              {/* Team Selection */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Select Team
                </Typography>
                <FormControl fullWidth required>
                  <InputLabel>Team *</InputLabel>
                  <Select
                    value={selectedTeam}
                    onChange={(e) => handleTeamSelection(e.target.value)}
                    label="Team *"
                  >
                    <MenuItem disabled>
                      <em>Teams loaded: {teams.length}</em>
                    </MenuItem>
                    {teams.length > 0 ? (
                      teams.map((team: string, index: number) => {
                        return (
                          <MenuItem key={`team-${index}`} value={team}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {team}
                                </Typography>
                                <Chip 
                                  label="Team"
                                  size="small"
                                  color="primary"
                                  sx={{ fontSize: '0.688rem', height: 20 }}
                                />
                              </Box>
                              <Typography variant="caption" color="text.secondary">
                                Team Name: {team}
                              </Typography>
                            </Box>
                          </MenuItem>
                        );
                      })
                    ) : (
                      <MenuItem disabled>
                        No teams available
                      </MenuItem>
                    )}
                  </Select>
                </FormControl>
              </Box>
              
              {/* Unselected Worker Selection */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Select Unselected Worker
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  Only showing workers from unselected_workers table
                </Typography>
                <FormControl fullWidth required>
                  <InputLabel>Unselected Worker *</InputLabel>
                  <Select
                    value={incidentForm.worker}
                    onChange={(e) => handleFormChange('worker', e.target.value)}
                    label="Unselected Worker *"
                  >
                    {teamMembers.length > 0 ? (
                      teamMembers.map((member: any) => {
                        return (
                          <MenuItem key={member.id} value={member.id}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {member.first_name} {member.last_name}
                                  </Typography>
                                  {member.hasOpenCase && (
                                    <Chip
                                      label="Open Case"
                                      size="small"
                                      color="error"
                                      sx={{ 
                                        fontSize: '0.625rem', 
                                        height: 18, 
                                        fontWeight: 'bold',
                                        backgroundColor: '#ef4444'
                                      }}
                                    />
                                  )}
                                </Box>
                                <Chip
                                  label={member.reason === 'sick' ? 'Sick' : 
                                         member.reason === 'not_rostered' ? 'Not Rostered' :
                                         member.reason === 'on_leave_rdo' ? 'On Leave/RDO' :
                                         member.reason === 'injured_medical' ? 'Injured/Medical' :
                                         member.reason === 'transferred' ? 'Transferred' :
                                         member.reason || 'Not Rostered'}
                                  size="small"
                                  color="warning"
                                  sx={{ 
                                    fontSize: '0.688rem', 
                                    height: 20, 
                                    fontWeight: 'bold',
                                    backgroundColor: member.reason === 'sick' ? '#ef4444' : 
                                                   member.reason === 'injured_medical' ? '#f59e0b' : 
                                                   member.reason === 'on_leave_rdo' ? '#3b82f6' : '#6b7280'
                                  }}
                                />
                              </Box>
                              <Typography variant="caption" color="text.secondary">
                                {member.email}
                              </Typography>
                              {member.hasOpenCase && (
                                <Typography variant="caption" sx={{ color: '#ef4444', fontWeight: 'bold', display: 'block', mt: 0.5 }}>
                                  ⚠️ {member.warningMessage}
                                </Typography>
                              )}
                              {member.notes && member.notes !== 'No notes provided' && (
                                <Typography variant="caption" sx={{ color: '#6b7280', fontStyle: 'italic', display: 'block', mt: 0.5 }}>
                                  Note: {member.notes}
                                </Typography>
                              )}
                            </Box>
                          </MenuItem>
                        );
                      })
                    ) : (
                      <MenuItem disabled>
                        {selectedTeam ? 'No unselected workers found' : 'Please select a team first'}
                      </MenuItem>
                    )}
                  </Select>
                </FormControl>
                {teamMembers.length > 0 && (
                  <Alert severity="info" sx={{ mt: 1, py: 0.5 }}>
                    {teamMembers.length} unselected worker{teamMembers.length !== 1 ? 's' : ''} available for incident reporting
                    {teamMembers.filter((m: any) => m.hasOpenCase).length > 0 && (
                      <Typography variant="caption" sx={{ fontSize: '0.7rem', display: 'block', mt: 0.5 }}>
                        ⚠️ {teamMembers.filter((m: any) => m.hasOpenCase).length} worker{teamMembers.filter((m: any) => m.hasOpenCase).length !== 1 ? 's' : ''} have open cases
                      </Typography>
                    )}
                  </Alert>
                )}
                {selectedTeam && teamMembers.length === 0 && (
                  <Alert severity="warning" sx={{ mt: 1, py: 0.5 }}>
                    No unselected workers found for this team.
                  </Alert>
                )}
              </Box>

              {/* Incident Details */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Incident Details
                </Typography>
                <TextField
                  fullWidth
                  type="datetime-local"
                  label="Incident Date *"
                  value={incidentForm.incidentDate}
                  onChange={(e) => handleFormChange('incidentDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ mb: 2 }}
                />

                <FormControl fullWidth required sx={{ mb: 2 }}>
                  <InputLabel>Incident Type *</InputLabel>
                  <Select
                    value={incidentForm.incidentType}
                    onChange={(e) => handleFormChange('incidentType', e.target.value)}
                    label="Incident Type *"
                  >
                    <MenuItem value="slip_fall">Slip and Fall</MenuItem>
                    <MenuItem value="strain_injury">Strain Injury</MenuItem>
                    <MenuItem value="cut_laceration">Cut/Laceration</MenuItem>
                    <MenuItem value="burn">Burn</MenuItem>
                    <MenuItem value="struck_by">Struck By Object</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth required sx={{ mb: 2 }}>
                  <InputLabel>Severity *</InputLabel>
                  <Select
                    value={incidentForm.severity}
                    onChange={(e) => handleFormChange('severity', e.target.value)}
                    label="Severity *"
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Description *"
                  value={incidentForm.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  sx={{ mb: 2 }}
                />
              </Box>

              {/* Location Details */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Location Details
                </Typography>
                <TextField
                  fullWidth
                  label="Site"
                  value={incidentForm.location?.site || ''}
                  onChange={(e) => handleFormChange('location.site', e.target.value)}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="Department"
                  value={incidentForm.location?.department || ''}
                  onChange={(e) => handleFormChange('location.department', e.target.value)}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="Specific Location"
                  value={incidentForm.location?.specificLocation || ''}
                  onChange={(e) => handleFormChange('location.specificLocation', e.target.value)}
                  sx={{ mb: 2 }}
                />
              </Box>

              {/* Photo Upload */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Photos (Optional)
                </Typography>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoSelect}
                  style={{ marginBottom: '10px' }}
                />
                {photoPreviewUrls.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {photoPreviewUrls.map((url: string, index: number) => (
                      <Box key={index} sx={{ position: 'relative' }}>
                        <img
                          src={url}
                          alt={`Preview ${index + 1}`}
                          style={{ width: 100, height: 100, objectFit: 'cover' }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => handlePhotoRemove(index)}
                          sx={{ position: 'absolute', top: 0, right: 0 }}
                        >
                          <Cancel />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => dispatch(closeDialog('incidentDialog'))}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleCreateIncidentClick}
              disabled={creatingIncident || !incidentForm.worker || !incidentForm.incidentDate || !incidentForm.incidentType || !incidentForm.severity || !incidentForm.description.trim()}
            >
              {creatingIncident ? <CircularProgress size={20} /> : 'Report Incident'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Confirmation Dialog */}
        <Dialog
          open={showConfirmDialog}
          onClose={() => setShowConfirmDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={1}>
              <Warning color="warning" />
              Confirm Incident Report
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Are you sure you want to report this incident?
            </Typography>
            <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Worker:</strong> {(() => {
                  const selectedWorker = teamMembers.find((member: any) => member.id === incidentForm.worker);
                  return selectedWorker ? `${selectedWorker.first_name} ${selectedWorker.last_name}` : 'N/A';
                })()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Type:</strong> {incidentForm.incidentType || 'N/A'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Severity:</strong> {incidentForm.severity || 'N/A'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Date:</strong> {incidentForm.incidentDate || 'N/A'}
              </Typography>
            </Box>
            <Alert severity="info" sx={{ mt: 2 }}>
              This will automatically create a case and notify the assigned case manager.
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleCreateIncident}
              disabled={creatingIncident}
              color="primary"
            >
              {creatingIncident ? <CircularProgress size={20} /> : 'Yes, Report Incident'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Incident Details Dialog */}
        <Dialog
          open={dialogs.incidentDetailsDialog}
          onClose={() => dispatch(closeDialog('incidentDetailsDialog' as any))}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: '16px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
            }
          }}
        >
          <DialogTitle sx={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
            color: 'white',
            textAlign: 'center',
            py: 3
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
              <Report sx={{ fontSize: 28 }} />
              <Typography variant="h5" component="div">
                Incident Details
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ p: 4 }}>
            {selectedIncident && (
              <Box>
                {/* Incident Header */}
                <Box sx={{ 
                  bgcolor: 'grey.50', 
                  p: 3, 
                  borderRadius: 2, 
                  mb: 3,
                  border: '1px solid',
                  borderColor: 'grey.200'
                }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="h6" color="primary" gutterBottom>
                        {selectedIncident.incident_number || `INC-${selectedIncident.id.slice(-8)}`}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Date:</strong> {selectedIncident.incident_date ? 
                          new Date(selectedIncident.incident_date).toLocaleDateString() : 
                          selectedIncident.created_at ? 
                          new Date(selectedIncident.created_at).toLocaleDateString() : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                        <Chip
                          label={selectedIncident.severity || 'unknown'}
                          color={
                            selectedIncident.severity === 'high' || selectedIncident.severity === 'lost_time' || selectedIncident.severity === 'fatality' ? 'error' :
                            selectedIncident.severity === 'medium' || selectedIncident.severity === 'medical_treatment' ? 'warning' : 'success'
                          }
                          size="small"
                        />
                        <Chip
                          label={selectedIncident.status || 'reported'}
                          color={selectedIncident.status === 'reported' ? 'info' : 'success'}
                          size="small"
                        />
                        <Chip
                          label={selectedIncident.return_to_work ? 'Returned to Work' : 'On Restricted Duty'}
                          color={selectedIncident.return_to_work ? 'success' : 'warning'}
                          size="small"
                          icon={selectedIncident.return_to_work ? <CheckCircle /> : <Warning />}
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Type:</strong> {selectedIncident.incident_type || 'N/A'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>

                {/* Incident Information */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', mb: 2 }}>
                    Incident Information
                  </Typography>
                  <Box sx={{ pl: 2 }}>
                    <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.6 }}>
                      <strong>Description:</strong>
                    </Typography>
                    <Box sx={{ 
                      bgcolor: 'grey.50', 
                      p: 2, 
                      borderRadius: 1, 
                      border: '1px solid',
                      borderColor: 'grey.200',
                      mb: 2
                    }}>
                      <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                        {selectedIncident.description || 'No description provided'}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* People Involved */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', mb: 2 }}>
                    People Involved
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ 
                        bgcolor: 'blue.50', 
                        p: 2, 
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'blue.200'
                      }}>
                        <Typography variant="subtitle2" color="primary" gutterBottom>
                          Reported By
                        </Typography>
                        <Typography variant="body2">
                          {selectedIncident.reported_by ? 
                            `${selectedIncident.reported_by.first_name} ${selectedIncident.reported_by.last_name}` : 
                            'N/A'}
                        </Typography>
                        {selectedIncident.reported_by?.email && (
                          <Typography variant="caption" color="text.secondary">
                            {selectedIncident.reported_by.email}
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ 
                        bgcolor: 'green.50', 
                        p: 2, 
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'green.200'
                      }}>
                        <Typography variant="subtitle2" color="success.main" gutterBottom>
                          Worker Involved
                        </Typography>
                        <Typography variant="body2">
                          {selectedIncident.worker ? 
                            `${selectedIncident.worker.first_name} ${selectedIncident.worker.last_name}` : 
                            'N/A'}
                        </Typography>
                        {selectedIncident.worker?.email && (
                          <Typography variant="caption" color="text.secondary">
                            {selectedIncident.worker.email}
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                </Box>

                {/* Return to Work Status */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', mb: 2 }}>
                    Work Status
                  </Typography>
                  <Box sx={{ 
                    bgcolor: selectedIncident.return_to_work ? 'success.50' : 'warning.50', 
                    p: 3, 
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: selectedIncident.return_to_work ? 'success.200' : 'warning.200',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2
                  }}>
                    {selectedIncident.return_to_work ? (
                      <CheckCircle sx={{ fontSize: 32, color: 'success.main' }} />
                    ) : (
                      <Warning sx={{ fontSize: 32, color: 'warning.main' }} />
                    )}
                    <Box>
                      <Typography variant="h6" sx={{ 
                        color: selectedIncident.return_to_work ? 'success.main' : 'warning.main',
                        fontWeight: 600,
                        mb: 0.5
                      }}>
                        {selectedIncident.return_to_work ? 'Worker Has Returned to Work' : 'Worker on Restricted Duty'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedIncident.return_to_work 
                          ? 'The worker has been cleared to return to full work duties.'
                          : 'The worker is currently on restricted duty due to this incident.'}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Additional Information */}
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', mb: 2 }}>
                    Additional Information
                  </Typography>
                  <Box sx={{ 
                    bgcolor: 'grey.50', 
                    p: 2, 
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'grey.200'
                  }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Created:</strong> {selectedIncident.created_at ? 
                        new Date(selectedIncident.created_at).toLocaleString() : 'N/A'}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Incident ID:</strong> {selectedIncident.id}
                    </Typography>
                    {selectedIncident.case_id && (
                      <Typography variant="body2">
                        <strong>Related Case ID:</strong> {selectedIncident.case_id}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 0 }}>
            <Button 
              onClick={() => dispatch(closeDialog('incidentDetailsDialog' as any))}
              variant="outlined"
            >
              Close
            </Button>
            <Button 
              variant="contained"
              startIcon={<Edit />}
              onClick={() => {
                // TODO: Implement edit functionality
                dispatch(closeDialog('incidentDetailsDialog' as any));
              }}
            >
              Edit Incident
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LayoutWithSidebar>
  );
};

// Memoized component for better performance
const MemoizedSiteSupervisorDashboardRedux = memo(SiteSupervisorDashboardRedux);

export default MemoizedSiteSupervisorDashboardRedux;

