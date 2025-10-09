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
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext.supabase';
import { authClient } from '../../lib/supabase';
import LayoutWithSidebar from '../../components/LayoutWithSidebar';

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
  
  // API configuration
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
  
  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  
  // Data states
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [teamLeaders, setTeamLeaders] = useState<TeamLeader[]>([]);
  const [statistics, setStatistics] = useState<ShiftStatistics | null>(null);
  
  // Memoized statistics calculation
  const memoizedStatistics = useMemo(() => {
    if (!statistics) return null;
    
    const totalTeamLeaders = teamLeaders.length;
    const assignedTeamLeaders = teamLeaders.filter(leader => leader.currentShift).length;
    const unassignedTeamLeaders = totalTeamLeaders - assignedTeamLeaders;
    
    const shiftDistribution: { [key: string]: number } = {};
    teamLeaders.forEach(leader => {
      if (leader.currentShift) {
        const shiftName = leader.currentShift.shift_name;
        shiftDistribution[shiftName] = (shiftDistribution[shiftName] || 0) + 1;
      }
    });
    
    const assignmentRate = totalTeamLeaders > 0 ? 
      Math.round((assignedTeamLeaders / totalTeamLeaders) * 100) : 0;
    
    return {
      totalTeamLeaders,
      assignedTeamLeaders,
      unassignedTeamLeaders,
      shiftDistribution,
      assignmentRate
    };
  }, [teamLeaders, statistics]);

  // Memoized filtered team leaders
  const filteredTeamLeaders = useMemo(() => {
    return teamLeaders.filter(leader => {
      const matchesSearch = !searchTerm || 
        `${leader.first_name} ${leader.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        leader.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (leader.team && leader.team.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'assigned' && leader.currentShift) ||
        (statusFilter === 'unassigned' && !leader.currentShift);
      
      return matchesSearch && matchesStatus;
    });
  }, [teamLeaders, searchTerm, statusFilter]);

  // Enhanced error display with retry functionality
  const ErrorDisplay = useCallback(() => {
    if (!error) return null;
    
    return (
      <Alert 
        severity="error" 
        sx={{ mb: 3 }}
        action={
          <Box display="flex" gap={1}>
            <Button 
              size="small" 
              onClick={() => loadData()}
              disabled={loading}
            >
              Retry
            </Button>
            {!isOnline && (
              <Chip 
                label="Offline" 
                size="small" 
                color="error" 
                variant="outlined"
              />
            )}
          </Box>
        }
      >
        <Typography variant="body2">
          {error}
          {retryCount > 0 && ` (Attempt ${retryCount}/3)`}
        </Typography>
      </Alert>
    );
  }, [error, loading, retryCount, isOnline]);

  // Enhanced loading display
  const LoadingDisplay = useCallback(() => {
    if (!loading) return null;
    
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
        {retryCount > 0 && (
          <Typography variant="caption" color="text.secondary">
            Retrying... (Attempt {retryCount}/3)
          </Typography>
        )}
      </Box>
    );
  }, [loading, retryCount]);
  
  // Dialog states
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedTeamLeader, setSelectedTeamLeader] = useState<TeamLeader | null>(null);
  const [shiftHistory, setShiftHistory] = useState<ShiftAssignment[]>([]);
  
  // Form states
  const [assignmentForm, setAssignmentForm] = useState({
    teamLeaderId: '',
    shiftTypeId: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    endDate: '',
    notes: ''
  });

  // Helper function to get auth token
  const getAuthToken = async () => {
    try {
      const { data: { session } } = await authClient.auth.getSession();
      console.log('🔍 Session data:', session);
      console.log('🔍 Access token:', session?.access_token ? 'Present' : 'Missing');
      return session?.access_token || null;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  };

  // Test authentication endpoint
  const testAuthentication = async (signal?: AbortSignal) => {
    try {
      const token = await getAuthToken();
      if (!token) {
        console.warn('No auth token available for testing');
        return;
      }

      console.log('🔍 Testing authentication with token:', token.substring(0, 20) + '...');
      
      const response = await fetch(`${API_BASE_URL}/shifts/test-auth`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal,
      });
      
      console.log('🔍 Auth test response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Authentication test successful:', data);
      } else {
        const errorText = await response.text();
        console.error('❌ Authentication test failed:', errorText);
      }
    } catch (error) {
      console.error('❌ Authentication test error:', error);
    }
  };

  // Fetch shift types with abort signal support
  const fetchShiftTypes = useCallback(async (signal?: AbortSignal) => {
    try {
      const token = await getAuthToken();
      if (!token) {
        console.warn('No auth token available, using mock shift types');
        setShiftTypes([
          { id: '1', name: 'Midnight Shift', description: '12:00 AM - 8:00 AM', start_time: '00:00:00', end_time: '08:00:00', color: '#1a237e', is_active: true },
          { id: '2', name: 'Morning Shift', description: '6:00 AM - 2:00 PM', start_time: '06:00:00', end_time: '14:00:00', color: '#2e7d32', is_active: true },
          { id: '3', name: 'Afternoon Shift', description: '2:00 PM - 10:00 PM', start_time: '14:00:00', end_time: '22:00:00', color: '#f57c00', is_active: true },
          { id: '4', name: 'Evening Shift', description: '10:00 PM - 6:00 AM', start_time: '22:00:00', end_time: '06:00:00', color: '#5d4037', is_active: true },
          { id: '5', name: 'Day Shift', description: '8:00 AM - 5:00 PM', start_time: '08:00:00', end_time: '17:00:00', color: '#1976d2', is_active: true },
          { id: '6', name: 'Night Shift', description: '8:00 PM - 5:00 AM', start_time: '20:00:00', end_time: '05:00:00', color: '#424242', is_active: true }
        ]);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/shifts/types`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal,
      });
      
      if (!response.ok) {
        // If backend is not available, use mock data
        if (response.status === 404 || response.status === 0) {
          console.warn('Backend not available, using mock shift types');
          setShiftTypes([
            { id: '1', name: 'Midnight Shift', description: '12:00 AM - 8:00 AM', start_time: '00:00:00', end_time: '08:00:00', color: '#1a237e', is_active: true },
            { id: '2', name: 'Morning Shift', description: '6:00 AM - 2:00 PM', start_time: '06:00:00', end_time: '14:00:00', color: '#2e7d32', is_active: true },
            { id: '3', name: 'Afternoon Shift', description: '2:00 PM - 10:00 PM', start_time: '14:00:00', end_time: '22:00:00', color: '#f57c00', is_active: true },
            { id: '4', name: 'Evening Shift', description: '10:00 PM - 6:00 AM', start_time: '22:00:00', end_time: '06:00:00', color: '#5d4037', is_active: true },
            { id: '5', name: 'Day Shift', description: '8:00 AM - 5:00 PM', start_time: '08:00:00', end_time: '17:00:00', color: '#1976d2', is_active: true },
            { id: '6', name: 'Night Shift', description: '8:00 PM - 5:00 AM', start_time: '20:00:00', end_time: '05:00:00', color: '#424242', is_active: true }
          ]);
          return;
        }
        throw new Error('Failed to fetch shift types');
      }
      
      const data = await response.json();
      setShiftTypes(data.data);
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      console.error('Error fetching shift types:', error);
      throw error;
    }
  }, []);

  const fetchTeamLeadersWithShifts = useCallback(async (signal?: AbortSignal) => {
    try {
      const token = await getAuthToken();
      if (!token) {
        console.warn('No auth token available, showing empty team leaders list');
        setTeamLeaders([]);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/shifts/team-leaders`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal,
      });
      
      if (!response.ok) {
        // If backend is not available, show empty state
        if (response.status === 404 || response.status === 0) {
          console.warn('Backend not available, showing empty team leaders list');
          setTeamLeaders([]);
          return;
        }
        throw new Error('Failed to fetch team leaders');
      }
      
      const data = await response.json();
      setTeamLeaders(data.data);
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      console.error('Error fetching team leaders:', error);
      throw error;
    }
  }, []);

  const fetchStatistics = useCallback(async (signal?: AbortSignal) => {
    try {
      const token = await getAuthToken();
      if (!token) {
        console.warn('No auth token available, showing empty statistics');
        setStatistics({
          totalTeamLeaders: 0,
          assignedTeamLeaders: 0,
          unassignedTeamLeaders: 0,
          shiftDistribution: {},
          assignmentRate: 0
        });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/shifts/statistics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal,
      });
      
      if (!response.ok) {
        // If backend is not available, show empty statistics
        if (response.status === 404 || response.status === 0) {
          console.warn('Backend not available, showing empty statistics');
          setStatistics({
            totalTeamLeaders: 0,
            assignedTeamLeaders: 0,
            unassignedTeamLeaders: 0,
            shiftDistribution: {},
            assignmentRate: 0
          });
          return;
        }
        throw new Error('Failed to fetch statistics');
      }
      
      const data = await response.json();
      setStatistics(data.data);
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      console.error('Error fetching statistics:', error);
      throw error;
    }
  }, []);

  const fetchShiftHistory = async (teamLeaderId: string) => {
    try {
      const token = await getAuthToken();
      if (!token) {
        console.warn('No auth token available, showing empty shift history');
        setShiftHistory([]);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/shifts/history/${teamLeaderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch shift history');
      
      const data = await response.json();
      setShiftHistory(data.data);
    } catch (error) {
      console.error('Error fetching shift history:', error);
      setError('Failed to fetch shift history');
    }
  };

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (retryCount > 0) {
        loadData();
      }
    };
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [retryCount]);

  // Optimized data loading with retry logic
  const loadData = useCallback(async (retryAttempt = 0) => {
    if (!isOnline) {
      setError('You are offline. Please check your internet connection.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      // Test authentication first
      await testAuthentication(signal);
      
      // Parallel data fetching with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );
      
      const dataPromise = Promise.all([
        fetchShiftTypes(signal),
        fetchTeamLeadersWithShifts(signal),
        fetchStatistics(signal)
      ]);
      
      await Promise.race([dataPromise, timeoutPromise]);
      
      setError(null);
      setRetryCount(0);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request was cancelled');
        return;
      }
      
      console.error('Error loading data:', error);
      
      if (retryAttempt < 3) {
        setRetryCount(retryAttempt + 1);
        setTimeout(() => loadData(retryAttempt + 1), 2000 * (retryAttempt + 1));
      } else {
        setError(`Failed to load data after ${retryAttempt + 1} attempts. ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [isOnline, retryCount]);

  // Load data on component mount
  useEffect(() => {
    loadData();
    
    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadData]);

  // Handle shift assignment
  const handleAssignShift = async () => {
    try {
      const token = await getAuthToken();
      if (!token) {
        setError('Authentication required to assign shifts');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/shifts/assign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(assignmentForm)
      });
      
      if (!response.ok) throw new Error('Failed to assign shift');
      
      const data = await response.json();
      setSuccessMessage(data.message);
      
      // Refresh data
      await Promise.all([
        fetchTeamLeadersWithShifts(),
        fetchStatistics()
      ]);
      
      // Close dialog and reset form
      setAssignDialogOpen(false);
      setAssignmentForm({
        teamLeaderId: '',
        shiftTypeId: '',
        effectiveDate: new Date().toISOString().split('T')[0],
        endDate: '',
        notes: ''
      });
      
    } catch (error) {
      console.error('Error assigning shift:', error);
      setError('Failed to assign shift');
    }
  };

  // Handle viewing shift history
  const handleViewHistory = async (teamLeader: TeamLeader) => {
    setSelectedTeamLeader(teamLeader);
    await fetchShiftHistory(teamLeader.id);
    setHistoryDialogOpen(true);
  };

  // Handle deactivating shift
  const handleDeactivateShift = async (shiftId: string) => {
    try {
      const token = await getAuthToken();
      if (!token) {
        setError('Authentication required to deactivate shifts');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/shifts/${shiftId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to deactivate shift');
      
      const data = await response.json();
      setSuccessMessage(data.message);
      
      // Refresh data
      await Promise.all([
        fetchTeamLeadersWithShifts(),
        fetchStatistics()
      ]);
      
    } catch (error) {
      console.error('Error deactivating shift:', error);
      setError('Failed to deactivate shift');
    }
  };

  // Refresh all data
  const handleRefresh = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchShiftTypes(),
        fetchTeamLeadersWithShifts(),
        fetchStatistics()
      ]);
      setSuccessMessage('Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      setError('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
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
            <Box 
              display="flex" 
              gap={2}
              sx={{
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'stretch', sm: 'center' },
                width: { xs: '100%', sm: 'auto' }
              }}
            >
              <Button
                variant="outlined"
                startIcon={<CustomSVGIcons.RefreshIcon />}
                onClick={handleRefresh}
                disabled={loading}
                sx={{ 
                  color: '#374151', 
                  borderColor: '#d1d5db',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: '#9ca3af',
                    backgroundColor: '#f9fafb',
                  }
                }}
              >
                Refresh
              </Button>
              <Button
                variant="outlined"
                onClick={() => testAuthentication()}
                sx={{ 
                  color: '#374151', 
                  borderColor: '#d1d5db',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: '#9ca3af',
                    backgroundColor: '#f9fafb',
                  }
                }}
              >
                Test Auth
              </Button>
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
        {statistics && (
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
              <Box display="flex" alignItems="center">
                <CustomSVGIcons.TeamIcon />
                <Typography variant="h6" sx={{ ml: 2, fontWeight: '600', color: '#111827' }}>
                  Team Leaders & Current Shifts
                </Typography>
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
                  {filteredTeamLeaders.map((leader, index) => (
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
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
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
              disabled={!assignmentForm.teamLeaderId || !assignmentForm.shiftTypeId}
              sx={{ 
                borderRadius: 2,
                backgroundColor: '#111827',
                '&:hover': {
                  backgroundColor: '#374151',
                }
              }}
            >
              Assign Shift
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
