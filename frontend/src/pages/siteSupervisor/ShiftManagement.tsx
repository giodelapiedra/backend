import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Grid,
  Divider,
  Badge,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Pagination,
  TablePagination,
  InputAdornment,
} from '@mui/material';
import {
  Schedule,
  Assignment,
  Person,
  Add,
  Edit,
  Delete,
  Visibility,
  CheckCircle,
  Cancel,
  Refresh,
  AccessTime,
  CalendarToday,
  Search,
  FilterList,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext.supabase';
import { authClient } from '../../lib/supabase';
import LayoutWithSidebar from '../../components/LayoutWithSidebar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Custom SVG Icons for enhanced UI
const CustomSVGIcons = {
  ClockIcon: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
      <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  TeamIcon: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  CalendarIcon: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
      <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  ChartIcon: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="18" y1="20" x2="18" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="12" y1="20" x2="12" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="6" y1="20" x2="6" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  PlusIcon: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  RefreshIcon: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polyline points="23 4 23 10 17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="1 20 1 14 7 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  EyeIcon: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  EditIcon: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  TrashIcon: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polyline points="3,6 5,6 21,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  CheckIcon: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  XIcon: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
};

// Types
interface ShiftType {
  id: string;
  name: string;
  description: string;
  start_time: string;
  end_time: string;
  color: string;
  is_active: boolean;
}

interface TeamLeader {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  team: string;
  is_active: boolean;
  currentShift?: {
    shift_id: string;
    shift_name: string;
    start_time: string;
    end_time: string;
    color: string;
    effective_date: string;
    end_date?: string;
  } | null;
}

interface ShiftAssignment {
  id: string;
  team_leader_id: string;
  shift_type_id: string;
  assigned_by_id: string;
  effective_date: string;
  end_date?: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  shift_types: ShiftType;
  users: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

interface ShiftStatistics {
  totalTeamLeaders: number;
  assignedTeamLeaders: number;
  unassignedTeamLeaders: number;
  shiftDistribution: Record<string, number>;
  assignmentRate: number;
}

const ShiftManagement: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // API configuration
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
  
  // State management - OPTIMIZED
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  
  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Helper function to get auth token - OPTIMIZED
  const getAuthToken = useCallback(async () => {
    try {
      const { data: { session } } = await authClient.auth.getSession();
      return session?.access_token || null;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }, []);

  // OPTIMIZED: Use React Query for data fetching with proper caching
  const { data: shiftTypes = [], isLoading: shiftTypesLoading, error: shiftTypesError } = useQuery({
    queryKey: ['shiftTypes'],
    queryFn: async () => {
      const token = await getAuthToken();
      if (!token) {
        // Return mock data if no auth token
        return [
          { id: '1', name: 'Midnight Shift', description: '12:00 AM - 8:00 AM', start_time: '00:00:00', end_time: '08:00:00', color: '#1a237e', is_active: true },
          { id: '2', name: 'Morning Shift', description: '6:00 AM - 2:00 PM', start_time: '06:00:00', end_time: '14:00:00', color: '#2e7d32', is_active: true },
          { id: '3', name: 'Afternoon Shift', description: '2:00 PM - 10:00 PM', start_time: '14:00:00', end_time: '22:00:00', color: '#f57c00', is_active: true },
          { id: '4', name: 'Evening Shift', description: '10:00 PM - 6:00 AM', start_time: '22:00:00', end_time: '06:00:00', color: '#5d4037', is_active: true },
          { id: '5', name: 'Day Shift', description: '8:00 AM - 5:00 PM', start_time: '08:00:00', end_time: '17:00:00', color: '#1976d2', is_active: true },
          { id: '6', name: 'Night Shift', description: '8:00 PM - 5:00 AM', start_time: '20:00:00', end_time: '05:00:00', color: '#424242', is_active: true }
        ];
      }

      const response = await fetch(`${API_BASE_URL}/shifts/types`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      if (!response.ok) {
        if (response.status === 404 || response.status === 0) {
          // Return mock data if backend not available
          return [
            { id: '1', name: 'Midnight Shift', description: '12:00 AM - 8:00 AM', start_time: '00:00:00', end_time: '08:00:00', color: '#1a237e', is_active: true },
            { id: '2', name: 'Morning Shift', description: '6:00 AM - 2:00 PM', start_time: '06:00:00', end_time: '14:00:00', color: '#2e7d32', is_active: true },
            { id: '3', name: 'Afternoon Shift', description: '2:00 PM - 10:00 PM', start_time: '14:00:00', end_time: '22:00:00', color: '#f57c00', is_active: true },
            { id: '4', name: 'Evening Shift', description: '10:00 PM - 6:00 AM', start_time: '22:00:00', end_time: '06:00:00', color: '#5d4037', is_active: true },
            { id: '5', name: 'Day Shift', description: '8:00 AM - 5:00 PM', start_time: '08:00:00', end_time: '17:00:00', color: '#1976d2', is_active: true },
            { id: '6', name: 'Night Shift', description: '8:00 PM - 5:00 AM', start_time: '20:00:00', end_time: '05:00:00', color: '#424242', is_active: true }
          ];
        }
        throw new Error('Failed to fetch shift types');
      }
      
      const data = await response.json();
      return data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  const { data: teamLeadersData, isLoading: teamLeadersLoading, error: teamLeadersError } = useQuery({
    queryKey: ['teamLeaders', page, rowsPerPage, searchTerm, statusFilter],
    queryFn: async () => {
      const token = await getAuthToken();
      if (!token) {
        return { data: [], totalCount: 0 };
      }

      // Build query parameters for pagination and filtering
      const params = new URLSearchParams({
        page: (page + 1).toString(), // API uses 1-based pagination
        limit: rowsPerPage.toString(),
        search: searchTerm,
        status: statusFilter
      });

      const response = await fetch(`${API_BASE_URL}/shifts/team-leaders?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      });
      
      if (!response.ok) {
        if (response.status === 404 || response.status === 0) {
          return { data: [], totalCount: 0 };
        }
        throw new Error('Failed to fetch team leaders');
      }
      
      const data = await response.json();
      return {
        data: data.data || [],
        totalCount: data.totalCount || 0
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - more frequent updates for team leaders
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  // Extract team leaders and total count from the response
  const teamLeaders = teamLeadersData?.data || [];
  const totalCount = teamLeadersData?.totalCount || 0;

  // Memoized statistics calculation - OPTIMIZED for pagination
  const memoizedStatistics = useMemo(() => {
    // For statistics, we need to fetch all data or use cached totals
    // For now, we'll calculate from current page data as a fallback
    if (!teamLeaders || teamLeaders.length === 0) {
      return {
        totalTeamLeaders: totalCount || 0,
        assignedTeamLeaders: 0,
        unassignedTeamLeaders: totalCount || 0,
        shiftDistribution: {},
        assignmentRate: 0
      };
    }
    
    // Calculate from current page data (this is a limitation - ideally we'd have server-side stats)
    const assignedTeamLeaders = teamLeaders.filter(leader => leader.currentShift).length;
    const unassignedTeamLeaders = teamLeaders.filter(leader => !leader.currentShift).length;
    
    const shiftDistribution: { [key: string]: number } = {};
    teamLeaders.forEach(leader => {
      if (leader.currentShift) {
        const shiftName = leader.currentShift.shift_name;
        shiftDistribution[shiftName] = (shiftDistribution[shiftName] || 0) + 1;
      }
    });
    
    const assignmentRate = teamLeaders.length > 0 ? 
      Math.round((assignedTeamLeaders / teamLeaders.length) * 100) : 0;
    
    return {
      totalTeamLeaders: totalCount || teamLeaders.length,
      assignedTeamLeaders,
      unassignedTeamLeaders,
      shiftDistribution,
      assignmentRate
    };
  }, [teamLeaders, totalCount]);

  // Server-side filtering, no client-side filtering needed
  const filteredTeamLeaders = teamLeaders;

  // Combined loading state
  const isLoading = shiftTypesLoading || teamLeadersLoading;
  
  // Combined error state
  const combinedError = error || shiftTypesError?.message || teamLeadersError?.message;

  // Enhanced error display - OPTIMIZED
  const ErrorDisplay = useCallback(() => {
    if (!combinedError) return null;
    
    return (
      <Alert 
        severity="error" 
        sx={{ mb: 3 }}
        action={
            <Button 
              size="small" 
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['shiftTypes'] });
              queryClient.invalidateQueries({ queryKey: ['teamLeaders'] });
              setError(null);
            }}
            disabled={isLoading}
            >
              Retry
            </Button>
        }
      >
        <Typography variant="body2">
          {combinedError}
        </Typography>
      </Alert>
    );
  }, [combinedError, isLoading, queryClient]);

  // Enhanced loading display - OPTIMIZED
  const LoadingDisplay = useCallback(() => {
    if (!isLoading) return null;
    
    return (
      <Box 
        display="flex" 
        flexDirection="column" 
        alignItems="center" 
        justifyContent="center" 
        minHeight="200px"
        gap={2}
      >
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary">
          Loading shift management data...
        </Typography>
      </Box>
    );
  }, [isLoading]);
  
  // Dialog states
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedTeamLeader, setSelectedTeamLeader] = useState<TeamLeader | null>(null);
  
  // Form states
  const [assignmentForm, setAssignmentForm] = useState({
    teamLeaderId: '',
    shiftTypeId: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    endDate: '',
    notes: ''
  });

  // OPTIMIZED: Use React Query for shift history
  const { data: shiftHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ['shiftHistory', selectedTeamLeader?.id],
    queryFn: async () => {
      if (!selectedTeamLeader?.id) return [];
      
      const token = await getAuthToken();
      if (!token) return [];

      const response = await fetch(`${API_BASE_URL}/shifts/history/${selectedTeamLeader.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      });
      
      if (!response.ok) return [];
      
        const data = await response.json();
      return data.data || [];
    },
    enabled: !!selectedTeamLeader?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // OPTIMIZED: Use React Query mutations for better error handling
  const assignShiftMutation = useMutation({
    mutationFn: async (formData: typeof assignmentForm) => {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required');

      const response = await fetch(`${API_BASE_URL}/shifts/assign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData),
        signal: AbortSignal.timeout(15000)
      });
      
      if (!response.ok) throw new Error('Failed to assign shift');
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      const teamLeader = teamLeaderLookup.get(variables.teamLeaderId);
      const shift = shiftTypeLookup.get(variables.shiftTypeId);
      
      if (teamLeader && shift) {
        setSuccessMessage(`Shift "${shift.name}" assigned to ${teamLeader.first_name} ${teamLeader.last_name}`);
      } else {
        setSuccessMessage('Shift assigned successfully');
      }
      
      queryClient.invalidateQueries({ queryKey: ['teamLeaders'] });
      setAssignDialogOpen(false);
      setAssignmentForm({
        teamLeaderId: '',
        shiftTypeId: '',
        effectiveDate: new Date().toISOString().split('T')[0],
        endDate: '',
        notes: ''
      });
    },
    onError: (error: Error) => {
      setError(error.message);
    }
  });

  const deactivateShiftMutation = useMutation({
    mutationFn: async (shiftId: string) => {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required');

      const response = await fetch(`${API_BASE_URL}/shifts/${shiftId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(15000)
      });
      
      if (!response.ok) throw new Error('Failed to deactivate shift');
      
      return response.json();
    },
    onSuccess: () => {
      setSuccessMessage('Shift deactivated successfully');
      queryClient.invalidateQueries({ queryKey: ['teamLeaders'] });
    },
    onError: (error: Error) => {
      setError(error.message);
    }
  });

  // OPTIMIZED: Memoized lookups for better performance
  const teamLeaderLookup = useMemo(() => {
    const lookup = new Map();
    teamLeaders.forEach(tl => lookup.set(tl.id, tl));
    return lookup;
  }, [teamLeaders]);

  const shiftTypeLookup = useMemo(() => {
    const lookup = new Map();
    shiftTypes.forEach(st => lookup.set(st.id, st));
    return lookup;
  }, [shiftTypes]);

  // OPTIMIZED: Direct assignment without confirmation modal
  const handleAssignShift = useCallback(() => {
    assignShiftMutation.mutate(assignmentForm);
  }, [assignShiftMutation, assignmentForm]);

  const handleViewHistory = useCallback((teamLeader: TeamLeader) => {
    setSelectedTeamLeader(teamLeader);
    setHistoryDialogOpen(true);
  }, []);

  const handleDeactivateShift = useCallback((shiftId: string) => {
    deactivateShiftMutation.mutate(shiftId);
  }, [deactivateShiftMutation]);

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


  // OPTIMIZED: Removed test authentication function to reduce lag

  // Auto-clear success messages
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Auto-clear error messages
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  if (isLoading) {
    return (
      <LayoutWithSidebar>
        <LoadingDisplay />
      </LayoutWithSidebar>
    );
  }

  return (
    <LayoutWithSidebar>
      <Box>
        <ErrorDisplay />
        <Box 
          sx={{ 
            backgroundColor: 'white',
            borderRadius: 2,
            p: 4,
            mb: 4,
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="center" position="relative" zIndex={1}>
            <Box>
              <Box display="flex" alignItems="center" mb={1}>
                <CustomSVGIcons.ClockIcon />
                <Typography variant="h4" component="h1" sx={{ ml: 2, fontWeight: '600', color: '#111827' }}>
                  Shift Management
                </Typography>
              </Box>
              <Typography variant="subtitle1" sx={{ color: '#6b7280' }}>
                Manage team leader shifts and schedules efficiently
              </Typography>
            </Box>
              <Button
                variant="contained"
                startIcon={<CustomSVGIcons.PlusIcon />}
                onClick={() => setAssignDialogOpen(true)}
                sx={{ 
                  backgroundColor: '#111827',
                  color: 'white',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: '#374151',
                  }
                }}
              >
                Assign Shift
              </Button>
          </Box>
        </Box>

        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 3 }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}
        
        {successMessage && (
          <Alert 
            severity="success" 
            sx={{ mb: 3 }}
            onClose={() => setSuccessMessage('')}
          >
            {successMessage}
          </Alert>
        )}

        {/* Enhanced Statistics Cards */}
        {memoizedStatistics && (
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} sm={6} lg={3}>
              <Card 
                sx={{ 
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  }
                }}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h4" fontWeight="600" sx={{ mb: 0.5, color: '#111827' }}>
                        {memoizedStatistics?.totalTeamLeaders || 0}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#6b7280' }}>
                        Total Team Leaders
                      </Typography>
                    </Box>
                    <Box 
                      sx={{ 
                        p: 2, 
                        borderRadius: '8px', 
                        backgroundColor: '#f3f4f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <CustomSVGIcons.TeamIcon />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <Card 
                sx={{ 
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  }
                }}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h4" fontWeight="600" sx={{ mb: 0.5, color: '#111827' }}>
                        {memoizedStatistics?.assignedTeamLeaders || 0}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#6b7280' }}>
                        Assigned Shifts
                      </Typography>
                    </Box>
                    <Box 
                      sx={{ 
                        p: 2, 
                        borderRadius: '8px', 
                        backgroundColor: '#f3f4f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <CustomSVGIcons.CheckIcon />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <Card 
                sx={{ 
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  }
                }}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h4" fontWeight="600" sx={{ mb: 0.5, color: '#111827' }}>
                        {memoizedStatistics?.unassignedTeamLeaders || 0}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#6b7280' }}>
                        Unassigned
                      </Typography>
                    </Box>
                    <Box 
                      sx={{ 
                        p: 2, 
                        borderRadius: '8px', 
                        backgroundColor: '#f3f4f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <CustomSVGIcons.XIcon />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <Card 
                sx={{ 
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  }
                }}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h4" fontWeight="600" sx={{ mb: 0.5, color: '#111827' }}>
                        {memoizedStatistics?.assignmentRate || 0}%
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#6b7280' }}>
                        Assignment Rate
                      </Typography>
                    </Box>
                    <Box 
                      sx={{ 
                        p: 2, 
                        borderRadius: '8px', 
                        backgroundColor: '#f3f4f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <CustomSVGIcons.ChartIcon />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Clean Shift Distribution */}
        {memoizedStatistics && Object.keys(memoizedStatistics.shiftDistribution).length > 0 && (
          <Card 
            sx={{ 
              mb: 4,
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" mb={3}>
                <CustomSVGIcons.ChartIcon />
                <Typography variant="h6" sx={{ ml: 2, fontWeight: '600', color: '#111827' }}>
                  Shift Distribution
                </Typography>
              </Box>
              <Grid container spacing={2}>
                {Object.entries(memoizedStatistics.shiftDistribution).map(([shiftName, count]) => (
                  <Grid item xs={12} sm={6} md={3} key={shiftName}>
                    <Box 
                      sx={{
                        p: 3, 
                        borderRadius: 2,
                        backgroundColor: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          backgroundColor: '#f3f4f6',
                        }
                      }}
                    >
                      <Box display="flex" alignItems="center">
                        <Box
                          width={12}
                          height={12}
                          borderRadius="50%"
                          bgcolor={shiftTypes.find(st => st.name === shiftName)?.color || '#6b7280'}
                          mr={2}
                        />
                        <Box flex={1}>
                          <Typography variant="body1" fontWeight="500" sx={{ fontSize: '0.875rem', color: '#111827' }}>
                            {shiftName}
                          </Typography>
                          <Typography variant="body2" sx={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            {count} team leader{count !== 1 ? 's' : ''}
                          </Typography>
                        </Box>
                        <Typography variant="h6" fontWeight="600" sx={{ color: '#111827' }}>
                          {count}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Clean Team Leaders Table */}
        <Card 
          sx={{ 
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          }}
        >
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                <Box display="flex" alignItems="center">
                  <CustomSVGIcons.TeamIcon />
                  <Typography variant="h6" sx={{ ml: 2, fontWeight: '600', color: '#111827' }}>
                    Team Leaders & Current Shifts
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={2}>
                  <TextField
                    size="small"
                    placeholder="Search team leaders..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search sx={{ fontSize: 20, color: '#6b7280' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ 
                      minWidth: 250,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        backgroundColor: '#f9fafb',
                        '&:hover': {
                          backgroundColor: '#f3f4f6',
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
                      <MenuItem value="all">All Status</MenuItem>
                      <MenuItem value="assigned">Assigned</MenuItem>
                      <MenuItem value="unassigned">Unassigned</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ 
                    backgroundColor: '#f8fafc',
                    borderBottom: '2px solid #e2e8f0'
                  }}>
                    <TableCell sx={{ 
                      fontWeight: '600', 
                      fontSize: '0.875rem',
                      color: '#475569',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      py: 2
                    }}>
                      Team Leader
                    </TableCell>
                    <TableCell sx={{ 
                      fontWeight: '600', 
                      fontSize: '0.875rem',
                      color: '#475569',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      py: 2
                    }}>
                      Team
                    </TableCell>
                    <TableCell sx={{ 
                      fontWeight: '600', 
                      fontSize: '0.875rem',
                      color: '#475569',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      py: 2
                    }}>
                      Current Shift
                    </TableCell>
                    <TableCell sx={{ 
                      fontWeight: '600', 
                      fontSize: '0.875rem',
                      color: '#475569',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      py: 2
                    }}>
                      Effective Date
                    </TableCell>
                    <TableCell sx={{ 
                      fontWeight: '600', 
                      fontSize: '0.875rem',
                      color: '#475569',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      py: 2
                    }}>
                      Status
                    </TableCell>
                    <TableCell sx={{ 
                      fontWeight: '600', 
                      fontSize: '0.875rem',
                      color: '#475569',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      py: 2
                    }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {teamLeadersLoading ? (
                    // Loading skeleton rows
                    Array.from({ length: rowsPerPage }).map((_, index) => (
                      <TableRow key={`loading-${index}`}>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <CircularProgress size={20} sx={{ mr: 2 }} />
                            <Box>
                              <Typography variant="body2" sx={{ color: '#6b7280' }}>
                                Loading...
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell><CircularProgress size={16} /></TableCell>
                        <TableCell><CircularProgress size={16} /></TableCell>
                        <TableCell><CircularProgress size={16} /></TableCell>
                        <TableCell><CircularProgress size={16} /></TableCell>
                        <TableCell><CircularProgress size={16} /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredTeamLeaders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
                        <Box display="flex" flexDirection="column" alignItems="center">
                          <CustomSVGIcons.TeamIcon />
                          <Typography variant="h6" color="#6b7280" sx={{ mt: 2 }}>
                            No team leaders found
                          </Typography>
                          <Typography variant="body2" color="#9ca3af">
                            {searchTerm || statusFilter !== 'all' 
                              ? 'Try adjusting your search or filter criteria' 
                              : 'No team leaders are currently registered'
                            }
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTeamLeaders.map((leader, index) => (
                    <TableRow 
                      key={leader.id}
                      sx={{ 
                        transition: 'all 0.2s ease',
                        borderBottom: '1px solid #f1f5f9',
                        '&:hover': {
                          backgroundColor: '#f8fafc',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                        },
                        '&:nth-of-type(even)': {
                          backgroundColor: '#fafbfc',
                        },
                        '&:last-child': {
                          borderBottom: 'none'
                        }
                      }}
                    >
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <Avatar 
                            sx={{ 
                              mr: 2, 
                              bgcolor: '#6366f1',
                              width: 44,
                              height: 44,
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              boxShadow: '0 2px 4px rgba(99, 102, 241, 0.2)'
                            }}
                          >
                            {leader.first_name[0]}{leader.last_name[0]}
                          </Avatar>
                          <Box>
                            <Typography variant="body1" fontWeight="600" sx={{ fontSize: '0.875rem', color: '#1e293b' }}>
                              {leader.first_name} {leader.last_name}
                            </Typography>
                            <Typography variant="body2" sx={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {leader.email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={leader.team || 'Unassigned'} 
                          size="small" 
                          variant="outlined"
                          sx={{ 
                            fontWeight: '500',
                            fontSize: '0.75rem',
                            height: '24px',
                            '&.MuiChip-outlined': {
                              borderColor: leader.team ? '#6366f1' : '#f59e0b',
                              color: leader.team ? '#6366f1' : '#f59e0b',
                              backgroundColor: leader.team ? '#f0f4ff' : '#fffbeb'
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {leader.currentShift ? (
                          <Box display="flex" alignItems="center">
                            <Box
                              width={12}
                              height={12}
                              borderRadius="50%"
                              bgcolor={leader.currentShift.color}
                              mr={1.5}
                              sx={{ 
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
                                border: '2px solid white'
                              }}
                            />
                            <Box>
                              <Typography variant="body2" fontWeight="600" sx={{ color: '#1e293b' }}>
                                {leader.currentShift.shift_name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#64748b' }}>
                                {leader.currentShift.start_time} - {leader.currentShift.end_time}
                              </Typography>
                            </Box>
                          </Box>
                        ) : (
                          <Chip 
                            label="No Shift Assigned" 
                            size="small" 
                            sx={{ 
                              fontWeight: '500',
                              fontSize: '0.75rem',
                              height: '24px',
                              backgroundColor: '#fef2f2',
                              color: '#dc2626',
                              border: '1px solid #fecaca'
                            }}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {leader.currentShift ? (
                          <Typography variant="body2" fontWeight="600" sx={{ color: '#1e293b' }}>
                            {new Date(leader.currentShift.effective_date).toLocaleDateString()}
                          </Typography>
                        ) : (
                          <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                            -
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={leader.is_active ? 'Active' : 'Inactive'} 
                          size="small" 
                          sx={{ 
                            fontWeight: '500',
                            fontSize: '0.75rem',
                            height: '24px',
                            backgroundColor: leader.is_active ? '#f0fdf4' : '#f8fafc',
                            color: leader.is_active ? '#16a34a' : '#64748b',
                            border: leader.is_active ? '1px solid #bbf7d0' : '1px solid #e2e8f0'
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={0.5}>
                          <Tooltip title="View History">
                            <IconButton
                              size="small"
                              onClick={() => handleViewHistory(leader)}
                              sx={{ 
                                color: '#6366f1',
                                '&:hover': {
                                  backgroundColor: '#f0f4ff',
                                  color: '#4f46e5',
                                  transform: 'scale(1.05)'
                                }
                              }}
                            >
                              <CustomSVGIcons.EyeIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Assign Shift">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setAssignmentForm(prev => ({
                                  ...prev,
                                  teamLeaderId: leader.id
                                }));
                                setAssignDialogOpen(true);
                              }}
                              sx={{ 
                                color: '#16a34a',
                                '&:hover': {
                                  backgroundColor: '#f0fdf4',
                                  color: '#15803d',
                                  transform: 'scale(1.05)'
                                }
                              }}
                            >
                              <CustomSVGIcons.EditIcon />
                            </IconButton>
                          </Tooltip>
                          {leader.currentShift && (
                            <Tooltip title="Deactivate Shift">
                              <IconButton
                                size="small"
                                onClick={() => handleDeactivateShift(leader.currentShift!.shift_id)}
                                disabled={deactivateShiftMutation.isPending}
                                sx={{ 
                                  color: '#dc2626',
                                  '&:hover': {
                                    backgroundColor: '#fef2f2',
                                    color: '#b91c1c',
                                    transform: 'scale(1.05)'
                                  }
                                }}
                              >
                                <CustomSVGIcons.TrashIcon />
                              </IconButton>
                            </Tooltip>
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
              borderTop: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <Typography variant="body2" color="#6b7280">
                Showing {page * rowsPerPage + 1} to {Math.min((page + 1) * rowsPerPage, totalCount)} of {totalCount} team leaders
              </Typography>
              <TablePagination
                component="div"
                count={totalCount}
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

        {/* Clean Assign Shift Dialog */}
        <Dialog 
          open={assignDialogOpen} 
          onClose={() => setAssignDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 2,
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }
          }}
        >
          <DialogTitle 
            sx={{ 
              backgroundColor: 'white',
              color: '#111827',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              fontWeight: '600',
              borderBottom: '1px solid #e5e7eb'
            }}
          >
            <CustomSVGIcons.PlusIcon />
            Assign Shift to Team Leader
          </DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            <Box sx={{ pt: 2 }}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Team Leader</InputLabel>
                <Select
                  value={assignmentForm.teamLeaderId}
                  onChange={(e) => setAssignmentForm(prev => ({
                    ...prev,
                    teamLeaderId: e.target.value
                  }))}
                  sx={{ borderRadius: 2 }}
                >
                  {teamLeaders.map((leader) => (
                    <MenuItem key={leader.id} value={leader.id}>
                      <Box display="flex" alignItems="center" width="100%">
                        <Avatar sx={{ mr: 2, width: 32, height: 32, fontSize: '0.75rem' }}>
                          {leader.first_name[0]}{leader.last_name[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {leader.first_name} {leader.last_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {leader.team || 'Unassigned Team'}
                          </Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth margin="normal">
                <InputLabel>Shift Type</InputLabel>
                <Select
                  value={assignmentForm.shiftTypeId}
                  onChange={(e) => setAssignmentForm(prev => ({
                    ...prev,
                    shiftTypeId: e.target.value
                  }))}
                  sx={{ borderRadius: 2 }}
                >
                  {shiftTypes.map((shift) => (
                    <MenuItem key={shift.id} value={shift.id}>
                      <Box display="flex" alignItems="center" width="100%">
                        <Box
                          width={16}
                          height={16}
                          borderRadius="50%"
                          bgcolor={shift.color}
                          mr={2}
                          sx={{ boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)' }}
                        />
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {shift.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {shift.start_time} - {shift.end_time}
                          </Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                margin="normal"
                label="Effective Date"
                type="date"
                value={assignmentForm.effectiveDate}
                onChange={(e) => setAssignmentForm(prev => ({
                  ...prev,
                  effectiveDate: e.target.value
                }))}
                InputLabelProps={{ shrink: true }}
                sx={{ borderRadius: 2 }}
              />

              <TextField
                fullWidth
                margin="normal"
                label="End Date (Optional)"
                type="date"
                value={assignmentForm.endDate}
                onChange={(e) => setAssignmentForm(prev => ({
                  ...prev,
                  endDate: e.target.value
                }))}
                InputLabelProps={{ shrink: true }}
                sx={{ borderRadius: 2 }}
              />

              <TextField
                fullWidth
                margin="normal"
                label="Notes (Optional)"
                multiline
                rows={3}
                value={assignmentForm.notes}
                onChange={(e) => setAssignmentForm(prev => ({
                  ...prev,
                  notes: e.target.value
                }))}
                sx={{ borderRadius: 2 }}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 2 }}>
            <Button 
              onClick={() => setAssignDialogOpen(false)}
              variant="outlined"
              sx={{ borderRadius: 2 }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAssignShift}
              variant="contained"
              disabled={!assignmentForm.teamLeaderId || !assignmentForm.shiftTypeId || assignShiftMutation.isPending}
              sx={{ 
                borderRadius: 2,
                backgroundColor: '#111827',
                '&:hover': {
                  backgroundColor: '#374151',
                }
              }}
            >
              {assignShiftMutation.isPending ? 'Assigning...' : 'Assign Shift'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Clean Shift History Dialog */}
        <Dialog 
          open={historyDialogOpen} 
          onClose={() => setHistoryDialogOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 2,
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }
          }}
        >
          <DialogTitle 
            sx={{ 
              backgroundColor: 'white',
              color: '#111827',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              fontWeight: '600',
              borderBottom: '1px solid #e5e7eb'
            }}
          >
            <CustomSVGIcons.CalendarIcon />
            Shift History - {selectedTeamLeader?.first_name} {selectedTeamLeader?.last_name}
          </DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            <List sx={{ p: 0 }}>
              {shiftHistory.map((assignment, index) => (
                <ListItem 
                  key={assignment.id} 
                  divider={index < shiftHistory.length - 1}
                  sx={{
                    borderRadius: 2,
                    mb: 1,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: 'grey.50',
                      transform: 'translateX(4px)',
                    }
                  }}
                >
                  <ListItemIcon>
                    <Box 
                      sx={{ 
                        p: 1.5, 
                        borderRadius: '50%', 
                        backgroundColor: `${assignment.shift_types.color}20`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <CustomSVGIcons.ClockIcon />
                    </Box>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" mb={1}>
                        <Box
                          width={12}
                          height={12}
                          borderRadius="50%"
                          bgcolor={assignment.shift_types.color}
                          mr={1.5}
                          sx={{ boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)' }}
                        />
                        <Typography variant="h6" fontWeight="bold" color={assignment.shift_types.color}>
                          {assignment.shift_types.name}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Box display="flex" alignItems="center" mb={1}>
                          <CustomSVGIcons.CalendarIcon />
                          <Typography variant="body2" sx={{ ml: 1 }}>
                            Effective: {new Date(assignment.effective_date).toLocaleDateString()}
                            {assignment.end_date && ` - ${new Date(assignment.end_date).toLocaleDateString()}`}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Assigned by: {assignment.users.first_name} {assignment.users.last_name}
                        </Typography>
                        {assignment.notes && (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontStyle: 'italic' }}>
                            Notes: {assignment.notes}
                          </Typography>
                        )}
                        <Chip 
                          label={assignment.is_active ? 'Active' : 'Inactive'} 
                          size="small" 
                          color={assignment.is_active ? 'success' : 'default'}
                          variant="outlined"
                          sx={{ fontWeight: 'medium' }}
                        />
                      </Box>
                    }
                  />
                </ListItem>
              ))}
              {shiftHistory.length === 0 && (
                <Box textAlign="center" py={4}>
                  <CustomSVGIcons.CalendarIcon />
                  <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
                    No shift history found
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    This team leader hasn't been assigned any shifts yet.
                  </Typography>
                </Box>
              )}
            </List>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button 
              onClick={() => setHistoryDialogOpen(false)}
              variant="outlined"
              sx={{ borderRadius: 2 }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LayoutWithSidebar>
  );
};

export default ShiftManagement;
