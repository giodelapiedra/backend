import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Chip,
  Grid,
  IconButton,
  Tooltip,
  Avatar,
  AvatarGroup,
  Paper,
  Divider,
  Stepper,
  Step,
  StepLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Badge,
  LinearProgress,
  Fade,
  Slide,
  Zoom,
  Pagination,
  Skeleton
} from '@mui/material';
import {
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Add as AddIcon,
  Close as CloseIcon,
  History as HistoryIcon,
  Assignment as AssignmentIcon,
  PersonOff as PersonOffIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
  CalendarToday as CalendarIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  LocalHospital as MedicalIcon,
  SickOutlined as SickIcon,
  WorkOff as WorkOffIcon,
  TransferWithinAStation as TransferIcon,
  EventBusy as EventBusyIcon
} from '@mui/icons-material';
import { SupabaseAPI } from '../utils/supabaseApi';
import { authClient } from '../lib/supabase';

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

// Simple cache implementation
class SimpleCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  set(key: string, data: any, ttl: number = 5 * 60 * 1000) { // 5 minutes default TTL
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }
  
  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }
  
  clear() {
    this.cache.clear();
  }
  
  delete(key: string) {
    this.cache.delete(key);
  }
}

const cache = new SimpleCache();

// Types & Interfaces
interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Incident {
  id: string;
  worker_id: string;
  team_leader_id: string;
  reason: string;
  notes?: string;
  case_status: 'open' | 'in_progress' | 'closed';
  created_at: string;
  updated_at: string;
  closed_at?: string;
  worker?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface IncidentManagementProps {
  teamLeaderId: string;
  team: string;
}

// Incident type configuration
const INCIDENT_TYPES = [
  { 
    value: 'sick', 
    label: 'Sick Leave', 
    icon: <SickIcon />, 
    color: '#EF4444',
    bgColor: '#FEE2E2',
    description: 'Worker is sick and unable to work'
  },
  { 
    value: 'injured_medical', 
    label: 'Injury / Medical', 
    icon: <MedicalIcon />, 
    color: '#DC2626',
    bgColor: '#FEE2E2',
    description: 'Work-related injury or medical condition'
  },
  { 
    value: 'on_leave_rdo', 
    label: 'On Leave / RDO', 
    icon: <EventBusyIcon />, 
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    description: 'Scheduled leave or rostered day off'
  },
  { 
    value: 'transferred', 
    label: 'Transferred', 
    icon: <TransferIcon />, 
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    description: 'Transferred to another site or department'
  },
  { 
    value: 'not_rostered', 
    label: 'Not Rostered', 
    icon: <WorkOffIcon />, 
    color: '#6B7280',
    bgColor: '#F3F4F6',
    description: 'Not scheduled for this period'
  }
];

const IncidentManagement: React.FC<IncidentManagementProps> = ({ teamLeaderId, team }) => {
  // State Management
  const [activeTab, setActiveTab] = useState(0);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [activeIncidents, setActiveIncidents] = useState<Incident[]>([]);
  const [closedIncidents, setClosedIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [newIncidentData, setNewIncidentData] = useState<any>(null);
  
  // Statistics state for total counts by type
  const [incidentTypeStats, setIncidentTypeStats] = useState<{[key: string]: number}>({});
  
  // Pagination State
  const [activePage, setActivePage] = useState(1);
  const [closedPage, setClosedPage] = useState(1);
  const [itemsPerPage] = useState(20); // Increased for better performance
  const [totalActiveCount, setTotalActiveCount] = useState(0);
  const [totalClosedCount, setTotalClosedCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterReason, setFilterReason] = useState('all');
  
  // Loading states for better UX
  const [loadingActive, setLoadingActive] = useState(false);
  const [loadingClosed, setLoadingClosed] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  
  // Cache keys for API calls
  const cacheKeys = useMemo(() => ({
    teamMembers: `team-members-${teamLeaderId}-${team}`,
    activeIncidents: `active-incidents-${teamLeaderId}-${activePage}-${searchTerm}-${filterReason}`,
    closedIncidents: `closed-incidents-${teamLeaderId}-${closedPage}-${searchTerm}-${filterReason}`,
    stats: `incident-stats-${teamLeaderId}`
  }), [teamLeaderId, team, activePage, closedPage, searchTerm, filterReason]);
  
  // Report Incident Form State
  const [selectedWorker, setSelectedWorker] = useState<string>('');
  const [incidentType, setIncidentType] = useState<string>('');
  const [incidentNotes, setIncidentNotes] = useState<string>('');
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [viewIncidentDialog, setViewIncidentDialog] = useState<Incident | null>(null);
  const [confirmCloseDialog, setConfirmCloseDialog] = useState<Incident | null>(null);

  // Load total incident type statistics with caching
  const loadIncidentTypeStats = useCallback(async (forceRefresh = false) => {
    const cacheKey = cacheKeys.stats;
    
    // Check cache first
    if (!forceRefresh) {
      const cachedStats = cache.get(cacheKey);
      if (cachedStats) {
        setIncidentTypeStats(cachedStats);
        return;
      }
    }
    
    setLoadingStats(true);
    try {
      const supabaseAPI = new SupabaseAPI();
      
      // Get all incidents for this team leader (both active and closed)
      const [activeResponse, closedResponse] = await Promise.all([
        supabaseAPI.getUnselectedWorkerReasons(teamLeaderId, {
          limit: 1000, // Get a large number to capture all
          offset: 0,
          includeCount: false
        }),
        supabaseAPI.getAllClosedUnselectedWorkerCases(teamLeaderId, {
          limit: 1000, // Get a large number to capture all
          offset: 0,
          includeCount: false
        })
      ]);
      
      // Combine all incidents
      const allIncidents = [
        ...(activeResponse.success ? (activeResponse.data as Incident[]) : []),
        ...(closedResponse.success ? (closedResponse.data as Incident[]) : [])
      ];
      
      // Count by incident type
      const typeStats: {[key: string]: number} = {};
      INCIDENT_TYPES.forEach(type => {
        typeStats[type.value] = allIncidents.filter(incident => incident.reason === type.value).length;
      });
      
      setIncidentTypeStats(typeStats);
      cache.set(cacheKey, typeStats, 2 * 60 * 1000); // Cache for 2 minutes
    } catch (err) {
      console.error('Error loading incident type statistics:', err);
      // Fallback to empty stats
      const emptyStats: {[key: string]: number} = {};
      INCIDENT_TYPES.forEach(type => {
        emptyStats[type.value] = 0;
      });
      setIncidentTypeStats(emptyStats);
    } finally {
      setLoadingStats(false);
    }
  }, [teamLeaderId, cacheKeys.stats]);

  // Load team members with caching
  const loadTeamMembers = useCallback(async (forceRefresh = false) => {
    const cacheKey = cacheKeys.teamMembers;
    
    // Check cache first
    if (!forceRefresh) {
      const cachedMembers = cache.get(cacheKey);
      if (cachedMembers) {
        setTeamMembers(cachedMembers);
        return;
      }
    }
    
    try {
      // Try multiple approaches to get team members
      let members;
      
      // Approach 1: Use provided team
      if (team && team !== 'default') {
        members = await SupabaseAPI.getTeamMembers(teamLeaderId, team);
      }
      
      // Approach 2: If no team or no members found, try without team filter
      if (!members?.teamMembers || members.teamMembers.length === 0) {
        members = await SupabaseAPI.getTeamMembers(teamLeaderId, '');
      }
      
      // Approach 3: If still no members, try with 'default' team
      if (!members?.teamMembers || members.teamMembers.length === 0) {
        members = await SupabaseAPI.getTeamMembers(teamLeaderId, 'default');
      }
      
      if (members?.teamMembers) {
        setTeamMembers(members.teamMembers);
        cache.set(cacheKey, members.teamMembers, 10 * 60 * 1000); // Cache for 10 minutes
      } else {
        setTeamMembers([]);
        cache.set(cacheKey, [], 5 * 60 * 1000); // Cache empty result for 5 minutes
      }
    } catch (err) {
      console.error('Error loading team members:', err);
      setError('Failed to load team members. Please check your connection.');
    }
  }, [teamLeaderId, team, cacheKeys.teamMembers]);

  // Load incidents with pagination and caching
  const loadIncidents = useCallback(async (page: number = 1, type: 'active' | 'closed' = 'active', forceRefresh = false) => {
    const cacheKey = type === 'active' ? cacheKeys.activeIncidents : cacheKeys.closedIncidents;
    
    // Check cache first
    if (!forceRefresh) {
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        if (type === 'active') {
          setActiveIncidents(cachedData.incidents);
          setTotalActiveCount(cachedData.totalCount);
        } else {
          setClosedIncidents(cachedData.incidents);
          setTotalClosedCount(cachedData.totalCount);
        }
        return;
      }
    }
    
    // Set loading state
    if (type === 'active') {
      setLoadingActive(true);
    } else {
      setLoadingClosed(true);
    }
    
    try {
      const supabaseAPI = new SupabaseAPI();
      const offset = (page - 1) * itemsPerPage;
      
      if (type === 'active') {
        // Load active incidents with pagination
        const activeResponse = await supabaseAPI.getUnselectedWorkerReasons(teamLeaderId, {
          limit: itemsPerPage,
          offset: offset,
          includeCount: true
        });
        
        if (activeResponse.success && activeResponse.data) {
          // Batch worker data fetching for better performance
          const workerIds = Array.from(new Set((activeResponse.data as Incident[]).map(i => i.worker_id)));
          const workerPromises = workerIds.map(async (workerId) => {
            try {
              const workerResponse = await SupabaseAPI.getUserById(workerId);
              return { workerId, worker: workerResponse.user };
            } catch (err) {
              console.error('Error fetching worker details:', err);
              return { workerId, worker: null };
            }
          });
          
          const workerResults = await Promise.all(workerPromises);
          const workerMap = new Map(workerResults.map(r => [r.workerId, r.worker]));
          
          // Map incidents with worker data
          const incidentsWithWorkers = (activeResponse.data as Incident[]).map(incident => ({
            ...incident,
            worker: incident.worker || (workerMap.get(incident.worker_id) ? {
              first_name: workerMap.get(incident.worker_id)?.first_name || '',
              last_name: workerMap.get(incident.worker_id)?.last_name || '',
              email: workerMap.get(incident.worker_id)?.email || ''
            } : undefined)
          }));
          
          setActiveIncidents(incidentsWithWorkers);
          setTotalActiveCount((activeResponse as any).totalCount || incidentsWithWorkers.length);
          
          // Cache the result
          cache.set(cacheKey, {
            incidents: incidentsWithWorkers,
            totalCount: (activeResponse as any).totalCount || incidentsWithWorkers.length
          }, 2 * 60 * 1000); // Cache for 2 minutes
        }
      } else {
        // Load closed incidents with pagination
        const closedResponse = await supabaseAPI.getAllClosedUnselectedWorkerCases(teamLeaderId, {
          limit: itemsPerPage,
          offset: offset,
          includeCount: true
        });
        
        if (closedResponse.success && closedResponse.data) {
          // Batch worker data fetching for better performance
          const workerIds = Array.from(new Set((closedResponse.data as Incident[]).map(i => i.worker_id)));
          const workerPromises = workerIds.map(async (workerId) => {
            try {
              const workerResponse = await SupabaseAPI.getUserById(workerId);
              return { workerId, worker: workerResponse.user };
            } catch (err) {
              console.error('Error fetching worker details:', err);
              return { workerId, worker: null };
            }
          });
          
          const workerResults = await Promise.all(workerPromises);
          const workerMap = new Map(workerResults.map(r => [r.workerId, r.worker]));
          
          // Map incidents with worker data
          const closedIncidentsWithWorkers = (closedResponse.data as Incident[]).map(incident => ({
            ...incident,
            worker: incident.worker || (workerMap.get(incident.worker_id) ? {
              first_name: workerMap.get(incident.worker_id)?.first_name || '',
              last_name: workerMap.get(incident.worker_id)?.last_name || '',
              email: workerMap.get(incident.worker_id)?.email || ''
            } : undefined)
          }));
          
          setClosedIncidents(closedIncidentsWithWorkers);
          setTotalClosedCount((closedResponse as any).totalCount || closedIncidentsWithWorkers.length);
          
          // Cache the result
          cache.set(cacheKey, {
            incidents: closedIncidentsWithWorkers,
            totalCount: (closedResponse as any).totalCount || closedIncidentsWithWorkers.length
          }, 2 * 60 * 1000); // Cache for 2 minutes
        }
      }
    } catch (err) {
      console.error('Error loading incidents:', err);
      setError('Failed to load incidents. Please refresh the page.');
    } finally {
      if (type === 'active') {
        setLoadingActive(false);
      } else {
        setLoadingClosed(false);
      }
    }
  }, [teamLeaderId, itemsPerPage, cacheKeys.activeIncidents, cacheKeys.closedIncidents]);

  const initializeData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    try {
      await Promise.all([
        loadTeamMembers(forceRefresh), 
        loadIncidents(1, 'active', forceRefresh),
        loadIncidents(1, 'closed', forceRefresh),
        loadIncidentTypeStats(forceRefresh)
      ]);
    } catch (err) {
      setError('Failed to load data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, [loadTeamMembers, loadIncidents, loadIncidentTypeStats]);

  // Debounced search function
  const debouncedSearch = useMemo(
    () => debounce((searchValue: string) => {
      setSearchTerm(searchValue);
      // Clear cache for search results
      cache.delete(cacheKeys.activeIncidents);
      cache.delete(cacheKeys.closedIncidents);
      // Reload data with new search term
      loadIncidents(activePage, 'active', true);
      loadIncidents(closedPage, 'closed', true);
    }, 500),
    [cacheKeys.activeIncidents, cacheKeys.closedIncidents, loadIncidents, activePage, closedPage]
  );

  // Handle search input change
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    debouncedSearch(value);
  }, [debouncedSearch]);

  // Handle filter change
  const handleFilterChange = useCallback((event: any) => {
    const value = event.target.value;
    setFilterReason(value);
    // Clear cache for filter results
    cache.delete(cacheKeys.activeIncidents);
    cache.delete(cacheKeys.closedIncidents);
    // Reload data with new filter
    loadIncidents(activePage, 'active', true);
    loadIncidents(closedPage, 'closed', true);
  }, [cacheKeys.activeIncidents, cacheKeys.closedIncidents, loadIncidents, activePage, closedPage]);

  useEffect(() => {
    initializeData();
  }, [initializeData]);

  // Handle Report Incident
  const handleReportIncident = useCallback(async () => {
    if (!selectedWorker || !incidentType) {
      setError('Please select a worker and incident type');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const supabaseAPI = new SupabaseAPI();
      
      
      
      // Always create new incident - allows multiple incidents per worker
      const result = await supabaseAPI.saveUnselectedWorkerReason({
        team_leader_id: teamLeaderId,
        worker_id: selectedWorker,
        reason: incidentType,
        notes: incidentNotes.trim()
      });

      if (result.success) {
        // Get worker name for success dialog
        const selectedWorkerName = teamMembers.find(m => m.id === selectedWorker);
        const workerName = selectedWorkerName ? 
          `${selectedWorkerName.first_name} ${selectedWorkerName.last_name}` : 
          'Unknown Worker';
        
        // Show success dialog with incident details
        setNewIncidentData({
          workerName: workerName,
          incidentType: incidentType,
          incidentId: result.data?.[0]?.id || 'Unknown',
          timestamp: new Date().toLocaleString(),
          notes: incidentNotes.trim()
        });
        setShowSuccessDialog(true);
        
        // Clear form
        setReportDialogOpen(false);
        setSelectedWorker('');
        setIncidentType('');
        setIncidentNotes('');
        
        // Clear relevant cache entries
        cache.delete(cacheKeys.activeIncidents);
        cache.delete(cacheKeys.stats);
        
        await Promise.all([
          loadIncidents(activePage, 'active', true), // Force refresh
          loadIncidentTypeStats(true) // Force refresh incident type statistics
        ]);
      } else {
        setError(result.error || 'Failed to report incident');
      }
    } catch (err) {
      console.error('Error reporting incident:', err);
      setError('An error occurred while reporting the incident');
    } finally {
      setSubmitting(false);
    }
  }, [selectedWorker, incidentType, incidentNotes, teamLeaderId, loadIncidents]);

  // Handle Close Incident Confirmation
  const handleCloseIncidentConfirm = useCallback((incident: Incident) => {
    setConfirmCloseDialog(incident);
  }, []);

  // Handle Close Incident
  const handleCloseIncident = useCallback(async (incidentId: string) => {
    setSubmitting(true);
    try {
      const supabaseAPI = new SupabaseAPI();
      const result = await supabaseAPI.closeUnselectedWorkerCase(incidentId);
      
      if (result.success) {
        setSuccess('Incident closed successfully!');
        
        // Clear relevant cache entries
        cache.delete(cacheKeys.activeIncidents);
        cache.delete(cacheKeys.closedIncidents);
        cache.delete(cacheKeys.stats);
        
        await Promise.all([
          loadIncidents(activePage, 'active', true), // Force refresh
          loadIncidents(closedPage, 'closed', true), // Force refresh
          loadIncidentTypeStats(true) // Force refresh stats
        ]);
        
        // Close confirmation dialog
        setConfirmCloseDialog(null);
      } else {
        setError(result.error || 'Failed to close incident');
      }
    } catch (err) {
      setError('An error occurred while closing the incident');
    } finally {
      setSubmitting(false);
    }
  }, [loadIncidents, activePage, closedPage, cacheKeys]);

  // Pagination handlers with cache optimization
  const handleActivePageChange = useCallback((event: React.ChangeEvent<unknown>, page: number) => {
    setActivePage(page);
    loadIncidents(page, 'active', false); // Use cache if available
  }, [loadIncidents]);

  const handleClosedPageChange = useCallback((event: React.ChangeEvent<unknown>, page: number) => {
    setClosedPage(page);
    loadIncidents(page, 'closed', false); // Use cache if available
  }, [loadIncidents]);

  // Refresh function with cache clearing
  const handleRefresh = useCallback(() => {
    cache.clear(); // Clear all cache
    initializeData(true); // Force refresh
  }, [initializeData]);

  // Get incident type config
  const getIncidentConfig = (reason: string | undefined) => {
    if (!reason) return INCIDENT_TYPES[0];
    return INCIDENT_TYPES.find(t => t.value === reason) || INCIDENT_TYPES[0];
  };

  // Filter incidents (now handled server-side with pagination)
  const filteredActiveIncidents = useMemo(() => {
    // For now, return all active incidents since filtering is done server-side
    // In the future, we can add server-side filtering
    return activeIncidents;
  }, [activeIncidents]);

  const filteredClosedIncidents = useMemo(() => {
    // For now, return all closed incidents since filtering is done server-side
    // In the future, we can add server-side filtering
    return closedIncidents;
  }, [closedIncidents]);

  // Statistics - Use total counts from API, not just paginated results
  const statistics = useMemo(() => {
    const totalActive = totalActiveCount; // Use total count from API
    const totalClosed = totalClosedCount; // Use total count from API
    const totalAllIncidents = totalActive + totalClosed;
    
    // Use total incident type statistics from database
    const byType = INCIDENT_TYPES.map(type => ({
      type: type.label,
      count: incidentTypeStats[type.value] || 0, // Use total database count
      color: type.color
    }));
    
    const closedThisMonth = closedIncidents.filter(i => {
      const closedDate = new Date(i.closed_at || i.updated_at);
      const now = new Date();
      return closedDate.getMonth() === now.getMonth() && closedDate.getFullYear() === now.getFullYear();
    }).length;

    return { 
      total: totalActive, 
      byType, 
      closedThisMonth, 
      totalAllIncidents,
      totalActive,
      totalClosed
    };
  }, [totalActiveCount, totalClosedCount, incidentTypeStats, closedIncidents]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 500 }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Fade in timeout={800}>
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#0F172A', mb: 1 }}>
                🚨 Incident Management System
              </Typography>
              <Typography variant="body1" sx={{ color: '#64748B' }}>
                Report, track, and manage worker incidents efficiently
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleRefresh}
                disabled={loading}
                sx={{ borderRadius: 2 }}
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setReportDialogOpen(true)}
                sx={{
                  bgcolor: '#4F46E5',
                  fontWeight: 600,
                  px: 3,
                  borderRadius: 2,
                  boxShadow: '0 4px 14px 0 rgba(79, 70, 229, 0.4)',
                  '&:hover': {
                    bgcolor: '#4338CA',
                    boxShadow: '0 6px 20px 0 rgba(79, 70, 229, 0.5)',
                  }
                }}
              >
                Report New Incident
              </Button>
            </Box>
          </Box>

          {/* Alerts */}
          {error && (
            <Slide direction="down" in mountOnEnter unmountOnExit>
              <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
                {error}
              </Alert>
            </Slide>
          )}
          {success && (
            <Slide direction="down" in mountOnEnter unmountOnExit>
              <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
                {success}
              </Alert>
            </Slide>
          )}
        </Box>
      </Fade>

      {/* Statistics Cards */}
      <Fade in timeout={1000}>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Total Active Incidents */}
          <Grid item xs={12} md={4}>
            <Card sx={{ 
              borderRadius: 3, 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <Box sx={{ 
                position: 'absolute', 
                top: -20, 
                right: -20, 
                opacity: 0.1,
                transform: 'rotate(15deg)'
              }}>
                <AssignmentIcon sx={{ fontSize: 150 }} />
              </Box>
              <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
                {loadingStats ? (
                  <>
                    <Skeleton variant="text" width="60%" height={48} sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} />
                    <Skeleton variant="text" width="40%" height={32} sx={{ bgcolor: 'rgba(255,255,255,0.3)', mb: 2 }} />
                    <Skeleton variant="text" width="80%" height={20} sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} />
                  </>
                ) : (
                  <>
                    <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                      {statistics.totalAllIncidents}
                    </Typography>
                    <Typography variant="h6" sx={{ mb: 2, opacity: 0.9 }}>
                      Total Incidents
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TrendingUpIcon />
                      <Typography variant="body2">
                        {statistics.totalActive} active, {statistics.totalClosed} closed
                      </Typography>
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Closed This Month */}
          <Grid item xs={12} md={4}>
            <Card sx={{ 
              borderRadius: 3, 
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <Box sx={{ 
                position: 'absolute', 
                top: -20, 
                right: -20, 
                opacity: 0.1,
                transform: 'rotate(15deg)'
              }}>
                <CheckCircleIcon sx={{ fontSize: 150 }} />
              </Box>
              <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
                <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                  {statistics.closedThisMonth}
                </Typography>
                <Typography variant="h6" sx={{ mb: 2, opacity: 0.9 }}>
                  Closed This Month
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingDownIcon />
                  <Typography variant="body2">
                    Resolved cases
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Team Members */}
          <Grid item xs={12} md={4}>
            <Card sx={{ 
              borderRadius: 3, 
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <Box sx={{ 
                position: 'absolute', 
                top: -20, 
                right: -20, 
                opacity: 0.1,
                transform: 'rotate(15deg)'
              }}>
                <PersonOffIcon sx={{ fontSize: 150 }} />
              </Box>
              <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
                <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                  {teamMembers.length}
                </Typography>
                <Typography variant="h6" sx={{ mb: 2, opacity: 0.9 }}>
                  Team Members
                </Typography>
                <AvatarGroup max={5} sx={{ justifyContent: 'flex-start' }}>
                  {teamMembers.slice(0, 5).map(member => (
                    <Avatar key={member.id} sx={{ width: 32, height: 32, bgcolor: 'rgba(255,255,255,0.3)' }}>
                      {member.first_name[0]}{member.last_name[0]}
                    </Avatar>
                  ))}
                </AvatarGroup>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Fade>

      {/* Incident Type Breakdown */}
      <Fade in timeout={1200}>
        <Card sx={{ mb: 4, borderRadius: 3, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
              📊 Incidents by Type
            </Typography>
            <Grid container spacing={2}>
              {statistics.byType.map((stat, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Box sx={{ 
                    p: 2, 
                    borderRadius: 2, 
                    bgcolor: '#F8FAFC',
                    border: '1px solid #E2E8F0'
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" fontWeight={600} color="#64748B">
                        {stat.type}
                      </Typography>
                      <Chip 
                        label={stat.count} 
                        size="small" 
                        sx={{ 
                          bgcolor: stat.color,
                          color: 'white',
                          fontWeight: 700
                        }} 
                      />
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={statistics.totalAllIncidents > 0 ? (stat.count / statistics.totalAllIncidents) * 100 : 0}
                      sx={{ 
                        height: 8, 
                        borderRadius: 5,
                        bgcolor: '#E2E8F0',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: stat.color
                        }
                      }}
                    />
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Fade>

      {/* Main Content Tabs */}
      <Card sx={{ borderRadius: 3, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{
            borderBottom: '1px solid #E2E8F0',
            px: 2,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '1rem',
              minHeight: 64,
              '&.Mui-selected': {
                color: '#4F46E5'
              }
            },
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0',
              bgcolor: '#4F46E5'
            }
          }}
        >
          <Tab 
            icon={<AssignmentIcon />} 
            iconPosition="start"
            label={`Active Incidents (${filteredActiveIncidents.length})`}
          />
          <Tab 
            icon={<HistoryIcon />} 
            iconPosition="start"
            label={`Incident History (${closedIncidents.length})`}
          />
        </Tabs>

        <CardContent sx={{ p: 3 }}>
          {/* Active Incidents Tab */}
          {activeTab === 0 && (
            <Box>
              {/* Search and Filter */}
              <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  placeholder="Search by worker name or email..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: '#64748B' }} />
                      </InputAdornment>
                    )
                  }}
                  sx={{ flex: 1 }}
                />
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>Filter by Type</InputLabel>
                  <Select
                    value={filterReason}
                    label="Filter by Type"
                    onChange={handleFilterChange}
                  >
                    <MenuItem value="all">All Types</MenuItem>
                    {INCIDENT_TYPES.map(type => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Debug Panel removed for production optimization */}

              {/* Loading State */}
              {loadingActive ? (
                <Grid container spacing={2}>
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Grid item xs={12} md={6} key={index}>
                      <Card sx={{ borderRadius: 2 }}>
                        <CardContent sx={{ p: 2.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                            <Skeleton variant="circular" width={48} height={48} />
                            <Box sx={{ flex: 1 }}>
                              <Skeleton variant="text" width="60%" height={24} />
                              <Skeleton variant="text" width="40%" height={16} />
                            </Box>
                          </Box>
                          <Skeleton variant="rectangular" height={60} sx={{ mb: 2, borderRadius: 1 }} />
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Skeleton variant="rectangular" height={32} sx={{ flex: 1, borderRadius: 1 }} />
                            <Skeleton variant="rectangular" height={32} sx={{ flex: 1, borderRadius: 1 }} />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : filteredActiveIncidents.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <AssignmentIcon sx={{ fontSize: 80, color: '#E2E8F0', mb: 2 }} />
                  <Typography variant="h6" color="#64748B">
                    No active incidents found
                  </Typography>
                  <Typography variant="body2" color="#94A3B8" sx={{ mt: 1 }}>
                    {searchTerm || filterReason !== 'all' ? 'Try adjusting your filters' : 'All clear! No incidents to display.'}
                  </Typography>
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {filteredActiveIncidents.map((incident, index) => {
                    const config = getIncidentConfig(incident.reason);
                    return (
                      <Grid item xs={12} md={6} key={incident.id}>
                        <Zoom in timeout={300 + index * 50}>
                          <Card sx={{ 
                            borderRadius: 2,
                            border: '2px solid',
                            borderColor: config.bgColor,
                            transition: 'all 0.3s',
                            '&:hover': {
                              boxShadow: `0 8px 16px ${config.color}40`,
                              transform: 'translateY(-4px)'
                            }
                          }}>
                            <CardContent sx={{ p: 2.5 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                  <Avatar sx={{ bgcolor: config.color, width: 48, height: 48 }}>
                                    {incident.worker?.first_name?.[0] || 'W'}{incident.worker?.last_name?.[0] || '?'}
                                  </Avatar>
                                  <Box>
                                    <Typography variant="subtitle1" fontWeight={700}>
                                      {incident.worker?.first_name && incident.worker?.last_name 
                                        ? `${incident.worker.first_name} ${incident.worker.last_name}`
                                        : 'Worker Details Loading...'
                                      }
                                    </Typography>
                                    <Typography variant="caption" color="#64748B">
                                      {incident.worker?.email || `Worker ID: ${incident.worker_id?.slice(0, 8) || 'Unknown'}...`}
                                    </Typography>
                                  </Box>
                                </Box>
                                <Chip
                                  icon={config.icon}
                                  label={config.label}
                                  size="small"
                                  sx={{
                                    bgcolor: config.bgColor,
                                    color: config.color,
                                    fontWeight: 600,
                                    border: `1px solid ${config.color}40`
                                  }}
                                />
                              </Box>

                              {incident.notes && incident.notes.trim() ? (
                                <Paper sx={{ p: 1.5, mb: 2, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                                  <Typography variant="body2" color="#64748B">
                                    📝 {incident.notes}
                                  </Typography>
                                </Paper>
                              ) : (
                                <Paper sx={{ p: 1.5, mb: 2, bgcolor: '#FEF3C7', border: '1px solid #F59E0B' }}>
                                  <Typography variant="body2" color="#92400E">
                                    ⚠️ No additional notes provided
                                  </Typography>
                                </Paper>
                              )}

                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <CalendarIcon sx={{ fontSize: 16, color: '#94A3B8' }} />
                                  <Typography variant="caption" color="#64748B">
                                    {incident.created_at ? new Date(incident.created_at).toLocaleDateString() : 'Unknown'}
                                  </Typography>
                                </Box>
                                <Chip
                                  label={incident.case_status?.toUpperCase() || 'UNKNOWN'}
                                  size="small"
                                  color="warning"
                                  variant="outlined"
                                />
                                <Chip
                                  label={`ID: ${incident.id?.slice(0, 8) || 'Unknown'}`}
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontSize: '0.7rem' }}
                                />
                              </Box>

                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                  fullWidth
                                  variant="outlined"
                                  size="small"
                                  startIcon={<VisibilityIcon />}
                                  onClick={() => setViewIncidentDialog(incident)}
                                >
                                  View Details
                                </Button>
                                <Button
                                  fullWidth
                                  variant="contained"
                                  size="small"
                                  startIcon={<CheckCircleIcon />}
                                  onClick={() => handleCloseIncidentConfirm(incident)}
                                  disabled={submitting}
                                  sx={{
                                    bgcolor: '#10B981',
                                    '&:hover': { bgcolor: '#059669' }
                                  }}
                                >
                                  Close
                                </Button>
                              </Box>
                            </CardContent>
                          </Card>
                        </Zoom>
                      </Grid>
                    );
                  })}
                </Grid>
              )}
              
              {/* Pagination for Active Incidents */}
              {totalActiveCount > itemsPerPage && (
                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
                  <Pagination
                    count={Math.ceil(totalActiveCount / itemsPerPage)}
                    page={activePage}
                    onChange={handleActivePageChange}
                    color="primary"
                    size="large"
                    showFirstButton
                    showLastButton
                    sx={{
                      '& .MuiPaginationItem-root': {
                        borderRadius: 2,
                        fontWeight: 600,
                        '&.Mui-selected': {
                          bgcolor: '#3B82F6',
                          color: 'white',
                          '&:hover': {
                            bgcolor: '#2563EB'
                          }
                        }
                      }
                    }}
                  />
                </Box>
              )}
            </Box>
          )}

          {/* Incident History Tab */}
          {activeTab === 1 && (
            <Box>
              {loadingClosed ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                        <TableCell sx={{ fontWeight: 600 }}>Worker</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Closed</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Duration</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Skeleton variant="circular" width={32} height={32} />
                              <Box>
                                <Skeleton variant="text" width={120} height={20} />
                                <Skeleton variant="text" width={80} height={16} />
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell><Skeleton variant="rectangular" width={80} height={24} /></TableCell>
                          <TableCell><Skeleton variant="text" width={80} height={20} /></TableCell>
                          <TableCell><Skeleton variant="text" width={80} height={20} /></TableCell>
                          <TableCell><Skeleton variant="rectangular" width={60} height={24} /></TableCell>
                          <TableCell><Skeleton variant="circular" width={24} height={24} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : closedIncidents.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <HistoryIcon sx={{ fontSize: 80, color: '#E2E8F0', mb: 2 }} />
                  <Typography variant="h6" color="#64748B">
                    No incident history
                  </Typography>
                  <Typography variant="body2" color="#94A3B8" sx={{ mt: 1 }}>
                    Closed incidents will appear here
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                        <TableCell sx={{ fontWeight: 600 }}>Worker</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Closed</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Duration</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {closedIncidents.map((incident) => {
                        const config = getIncidentConfig(incident.reason);
                        const duration = incident.closed_at && incident.created_at
                          ? Math.ceil((new Date(incident.closed_at).getTime() - new Date(incident.created_at).getTime()) / (1000 * 60 * 60 * 24))
                          : 0;
                        
                        return (
                          <TableRow key={incident.id} sx={{ '&:hover': { bgcolor: '#F8FAFC' } }}>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Avatar sx={{ width: 32, height: 32, bgcolor: config.color, fontSize: '0.875rem' }}>
                                  {incident.worker?.first_name?.[0]}{incident.worker?.last_name?.[0]}
                                </Avatar>
                                <Box>
                                  <Typography variant="body2" fontWeight={600}>
                                    {incident.worker?.first_name} {incident.worker?.last_name}
                                  </Typography>
                                  <Typography variant="caption" color="#64748B">
                                    {incident.worker?.email}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip
                                icon={config.icon}
                                label={config.label}
                                size="small"
                                sx={{
                                  bgcolor: config.bgColor,
                                  color: config.color,
                                  fontWeight: 600
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {incident.created_at ? new Date(incident.created_at).toLocaleDateString() : 'Unknown'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {incident.closed_at ? new Date(incident.closed_at).toLocaleDateString() : 'N/A'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={`${duration} ${duration === 1 ? 'day' : 'days'}`}
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              <IconButton
                                size="small"
                                onClick={() => setViewIncidentDialog(incident)}
                                sx={{ color: '#4F46E5' }}
                              >
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              
              {/* Pagination for Closed Incidents */}
              {totalClosedCount > itemsPerPage && (
                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
                  <Pagination
                    count={Math.ceil(totalClosedCount / itemsPerPage)}
                    page={closedPage}
                    onChange={handleClosedPageChange}
                    color="primary"
                    size="large"
                    showFirstButton
                    showLastButton
                    sx={{
                      '& .MuiPaginationItem-root': {
                        borderRadius: 2,
                        fontWeight: 600,
                        '&.Mui-selected': {
                          bgcolor: '#3B82F6',
                          color: 'white',
                          '&:hover': {
                            bgcolor: '#2563EB'
                          }
                        }
                      }
                    }}
                  />
                </Box>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Report Incident Dialog */}
      <Dialog
        open={reportDialogOpen}
        onClose={() => !submitting && setReportDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <AddIcon />
          <Typography variant="h6" fontWeight={600}>
            Report New Incident
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ mt: 3 }}>
          <Typography variant="body2" color="#64748B" sx={{ mb: 3 }}>
            Fill in the details below to report a new incident. Each incident creates a separate case record, 
            allowing you to report multiple incidents for the same worker (e.g., sick, then accident).
          </Typography>

          {/* Debug Info removed for production optimization */}

          <Box sx={{ mb: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Select Worker *</InputLabel>
              <Select
                value={selectedWorker}
                label="Select Worker *"
                onChange={(e) => setSelectedWorker(e.target.value)}
                disabled={teamMembers.length === 0}
              >
                {teamMembers.length === 0 ? (
                  <MenuItem disabled>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#64748B' }}>
                      <PersonOffIcon />
                      No team members found. Please check your team configuration.
                    </Box>
                  </MenuItem>
                ) : (
                  teamMembers.map(member => (
                    <MenuItem key={member.id} value={member.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 28, height: 28, fontSize: '0.75rem' }}>
                          {member.first_name[0]}{member.last_name[0]}
                        </Avatar>
                        {member.first_name} {member.last_name} - {member.email}
                      </Box>
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
            {teamMembers.length === 0 && (
              <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                ⚠️ No team members found. Please ensure you have workers assigned to your team.
              </Typography>
            )}
            {teamMembers.length > 0 && (
              <Typography variant="caption" color="success.main" sx={{ mt: 1, display: 'block' }}>
                ✅ {teamMembers.length} team member{teamMembers.length > 1 ? 's' : ''} available
              </Typography>
            )}
          </Box>

          {/* Selected worker debug panel removed */}

          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
            Select Incident Type *
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {INCIDENT_TYPES.map((type) => (
              <Grid item xs={12} sm={6} key={type.value}>
                <Paper
                  onClick={() => setIncidentType(type.value)}
                  sx={{
                    p: 2,
                    cursor: 'pointer',
                    border: '2px solid',
                    borderColor: incidentType === type.value ? type.color : '#E2E8F0',
                    bgcolor: incidentType === type.value ? type.bgColor : 'white',
                    transition: 'all 0.3s',
                    '&:hover': {
                      borderColor: type.color,
                      transform: 'translateY(-2px)',
                      boxShadow: `0 4px 12px ${type.color}40`
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Box sx={{ color: type.color }}>
                      {type.icon}
                    </Box>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ color: type.color }}>
                      {type.label}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="#64748B">
                    {type.description}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Additional Notes (Optional)"
            value={incidentNotes}
            onChange={(e) => setIncidentNotes(e.target.value)}
            placeholder="Add any additional details about the incident..."
            sx={{ mb: 2 }}
          />

          {selectedWorker && incidentType && (
            <Paper sx={{ p: 2, bgcolor: '#F0F9FF', border: '1px solid #BFDBFE' }}>
              <Typography variant="caption" color="#1E40AF" fontWeight={600}>
                ✓ Ready to submit incident report
              </Typography>
            </Paper>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button
            onClick={() => setReportDialogOpen(false)}
            disabled={submitting}
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleReportIncident}
            disabled={!selectedWorker || !incidentType || submitting}
            variant="contained"
            sx={{
              bgcolor: '#4F46E5',
              fontWeight: 600,
              px: 4,
              borderRadius: 2,
              '&:hover': { bgcolor: '#4338CA' }
            }}
          >
            {submitting ? <CircularProgress size={24} /> : 'Submit Incident Report'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Incident Dialog */}
      <Dialog
        open={!!viewIncidentDialog}
        onClose={() => setViewIncidentDialog(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        {viewIncidentDialog && (
          <>
            <DialogTitle sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 2,
              borderBottom: '1px solid #E2E8F0'
            }}>
              <InfoIcon color="primary" />
              <Typography variant="h6" fontWeight={600}>
                Incident Details
              </Typography>
            </DialogTitle>
            <DialogContent sx={{ mt: 3 }}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="caption" color="#64748B" gutterBottom>
                  WORKER
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
                  <Avatar sx={{ width: 48, height: 48, bgcolor: getIncidentConfig(viewIncidentDialog.reason).color }}>
                    {viewIncidentDialog.worker?.first_name?.[0]}{viewIncidentDialog.worker?.last_name?.[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {viewIncidentDialog.worker?.first_name} {viewIncidentDialog.worker?.last_name}
                    </Typography>
                    <Typography variant="caption" color="#64748B">
                      {viewIncidentDialog.worker?.email}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ mb: 3 }}>
                <Typography variant="caption" color="#64748B" gutterBottom>
                  INCIDENT TYPE
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Chip
                    icon={getIncidentConfig(viewIncidentDialog.reason).icon}
                    label={getIncidentConfig(viewIncidentDialog.reason).label}
                    sx={{
                      bgcolor: getIncidentConfig(viewIncidentDialog.reason).bgColor,
                      color: getIncidentConfig(viewIncidentDialog.reason).color,
                      fontWeight: 600,
                      fontSize: '0.875rem'
                    }}
                  />
                </Box>
              </Box>

              {viewIncidentDialog.notes && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="caption" color="#64748B" gutterBottom>
                      NOTES
                    </Typography>
                    <Paper sx={{ p: 2, mt: 1, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                      <Typography variant="body2">
                        {viewIncidentDialog.notes}
                      </Typography>
                    </Paper>
                  </Box>
                </>
              )}

              <Divider sx={{ my: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="#64748B" gutterBottom>
                    CREATED DATE
                  </Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ mt: 1 }}>
                    {viewIncidentDialog.created_at ? new Date(viewIncidentDialog.created_at).toLocaleDateString() : 'Unknown'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="#64748B" gutterBottom>
                    STATUS
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Chip
                      label={viewIncidentDialog.case_status?.toUpperCase() || 'UNKNOWN'}
                      size="small"
                      color={viewIncidentDialog.case_status === 'closed' ? 'success' : 'warning'}
                    />
                  </Box>
                </Grid>
                {viewIncidentDialog.closed_at && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="#64748B" gutterBottom>
                      CLOSED DATE
                    </Typography>
                    <Typography variant="body2" fontWeight={600} sx={{ mt: 1 }}>
                      {viewIncidentDialog.closed_at ? new Date(viewIncidentDialog.closed_at).toLocaleDateString() : 'Unknown'}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
              <Button
                onClick={() => setViewIncidentDialog(null)}
                variant="contained"
                sx={{ borderRadius: 2 }}
              >
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
      
      {/* Success Dialog */}
      <Dialog
        open={showSuccessDialog}
        onClose={() => setShowSuccessDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            color: 'white',
            overflow: 'hidden'
          }
        }}
      >
        <Box sx={{ p: 0 }}>
          {/* Success Header */}
          <Box sx={{ 
            p: 4, 
            textAlign: 'center',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)'
          }}>
            <Zoom in={showSuccessDialog} timeout={500}>
              <Box>
                <CheckCircleIcon sx={{ fontSize: 80, color: 'white', mb: 2 }} />
                <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>
                  🎉 Incident Reported Successfully!
                </Typography>
                <Typography variant="h6" sx={{ opacity: 0.9 }}>
                  Your incident report has been submitted
                </Typography>
              </Box>
            </Zoom>
          </Box>
          
          {/* Incident Details */}
          <Box sx={{ p: 4, bgcolor: 'rgba(255, 255, 255, 0.95)', color: '#1F2937' }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 3, color: '#059669' }}>
              📋 Incident Details
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    Worker Name
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {newIncidentData?.workerName || 'Unknown'}
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    Incident Type
                  </Typography>
                  <Chip 
                    label={getIncidentConfig(newIncidentData?.incidentType || '').label}
                    color="primary"
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    Incident ID
                  </Typography>
                  <Typography variant="body2" fontFamily="monospace" sx={{ 
                    bgcolor: '#F3F4F6', 
                    p: 1, 
                    borderRadius: 1,
                    fontSize: '0.875rem'
                  }}>
                    {newIncidentData?.incidentId ? `${newIncidentData.incidentId.slice(0, 8)}...` : 'Unknown'}
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    Reported At
                  </Typography>
                  <Typography variant="body2">
                    {newIncidentData?.timestamp || 'Unknown'}
                  </Typography>
                </Box>
              </Grid>
              
              {newIncidentData?.notes && (
                <Grid item xs={12}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                      Notes
                    </Typography>
                    <Typography variant="body2" sx={{ 
                      bgcolor: '#F3F4F6', 
                      p: 2, 
                      borderRadius: 1,
                      fontStyle: 'italic'
                    }}>
                      "{newIncidentData.notes}"
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
            
            {/* Success Message */}
            <Box sx={{ 
              mt: 3, 
              p: 3, 
              bgcolor: '#ECFDF5', 
              borderRadius: 2,
              border: '1px solid #A7F3D0'
            }}>
              <Typography variant="body2" sx={{ color: '#065F46', fontWeight: 500 }}>
                ✅ <strong>Success!</strong> This incident has been recorded with a unique ID. 
                You can report additional incidents for the same worker if needed.
              </Typography>
            </Box>
          </Box>
          
          {/* Action Buttons */}
          <Box sx={{ p: 3, bgcolor: 'rgba(255, 255, 255, 0.1)', textAlign: 'center' }}>
            <Button
              variant="contained"
              onClick={() => setShowSuccessDialog(false)}
              sx={{
                bgcolor: 'white',
                color: '#059669',
                fontWeight: 600,
                px: 4,
                py: 1.5,
                borderRadius: 2,
                '&:hover': {
                  bgcolor: '#F9FAFB',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
                },
                transition: 'all 0.3s ease'
              }}
            >
              Continue
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/* Close Incident Confirmation Dialog */}
      <Dialog
        open={!!confirmCloseDialog}
        onClose={() => !submitting && setConfirmCloseDialog(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: '#FEF3C7',
          color: '#92400E',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          borderBottom: '1px solid #F59E0B'
        }}>
          <WarningIcon />
          <Typography variant="h6" fontWeight={600}>
            Confirm Close Incident
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ mt: 3 }}>
          {confirmCloseDialog && (
            <>
              <Typography variant="body1" sx={{ mb: 3, color: '#374151' }}>
                Are you sure you want to close this incident? This action will move the incident to the history tab and mark it as resolved.
              </Typography>
              
              {/* Incident Details */}
              <Paper sx={{ p: 2, bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <Avatar sx={{ width: 40, height: 40, bgcolor: getIncidentConfig(confirmCloseDialog.reason).color }}>
                    {confirmCloseDialog.worker?.first_name?.[0]}{confirmCloseDialog.worker?.last_name?.[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600}>
                      {confirmCloseDialog.worker?.first_name} {confirmCloseDialog.worker?.last_name}
                    </Typography>
                    <Typography variant="caption" color="#64748B">
                      {confirmCloseDialog.worker?.email}
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Chip
                    icon={getIncidentConfig(confirmCloseDialog.reason).icon}
                    label={getIncidentConfig(confirmCloseDialog.reason).label}
                    size="small"
                    sx={{
                      bgcolor: getIncidentConfig(confirmCloseDialog.reason).bgColor,
                      color: getIncidentConfig(confirmCloseDialog.reason).color,
                      fontWeight: 600
                    }}
                  />
                  <Typography variant="caption" color="#64748B">
                    Created: {confirmCloseDialog.created_at ? new Date(confirmCloseDialog.created_at).toLocaleDateString() : 'Unknown'}
                  </Typography>
                </Box>
                
                {confirmCloseDialog.notes && (
                  <Typography variant="body2" color="#64748B" sx={{ fontStyle: 'italic' }}>
                    "{confirmCloseDialog.notes}"
                  </Typography>
                )}
              </Paper>
              
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Warning:</strong> Once closed, this incident will be moved to the incident history and cannot be reopened.
                </Typography>
              </Alert>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button
            onClick={() => setConfirmCloseDialog(null)}
            disabled={submitting}
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => confirmCloseDialog?.id && handleCloseIncident(confirmCloseDialog.id)}
            disabled={submitting || !confirmCloseDialog?.id}
            variant="contained"
            sx={{
              bgcolor: '#DC2626',
              fontWeight: 600,
              px: 4,
              borderRadius: 2,
              '&:hover': { bgcolor: '#B91C1C' }
            }}
          >
            {submitting ? <CircularProgress size={24} /> : 'Yes, Close Incident'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Memoized component for better performance
const MemoizedIncidentManagement = memo(IncidentManagement);

export default MemoizedIncidentManagement;
export {};

