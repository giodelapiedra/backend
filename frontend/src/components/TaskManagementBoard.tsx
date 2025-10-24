import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Chip,
  LinearProgress,
  Avatar,
  Tooltip,
  Button,
  TextField,
  InputAdornment,
  CircularProgress,
  Grid,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  Select,
  MenuItem,
  Pagination,
  Skeleton,
  Alert,
} from '@mui/material';
import {
  Add,
  Search,
  MoreVert,
  Assignment,
  LocalHospital,
  CalendarToday,
  FilterList,
  Close,
  Visibility,
  ArrowUpward,
  ArrowDownward,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext.supabase';
import { dataClient } from '../lib/supabase';
import { CaseAssignmentService } from '../utils/caseAssignmentService';

interface TaskProps {
  _id: string;
  caseNumber: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'to_do' | 'in_progress' | 'revisions' | 'completed';
  progress: number;
  dueDate: string;
  assignees: Array<{
    _id: string;
    firstName: string;
    lastName: string;
  }>;
  tags?: string[];
}

interface CaseTask {
  id: string;
  _id?: string; // For backward compatibility
  case_number: string;
  caseNumber?: string; // For backward compatibility
  status: string;
  priority: string;
  worker: {
    id: string;
    _id?: string; // For backward compatibility
    first_name: string;
    firstName?: string; // For backward compatibility
    last_name: string;
    lastName?: string; // For backward compatibility
    email?: string;
  };
  clinician?: {
    id: string;
    _id?: string; // For backward compatibility
    first_name: string;
    firstName?: string; // For backward compatibility
    last_name: string;
    lastName?: string; // For backward compatibility
    email?: string;
  };
  injuryDetails?: {
    bodyPart: string;
    injuryType: string;
    severity: string;
    description: string;
  };
  incident?: {
    id: string;
    incidentNumber?: string; // For backward compatibility
    incidentDate?: string; // For backward compatibility
    incident_type: string;
    incidentType?: string; // For backward compatibility
    severity: string;
  };
  created_at?: string;
  createdAt?: string; // For backward compatibility
}

interface CaseDetails {
  id: string;
  _id?: string; // For backward compatibility
  case_number: string;
  caseNumber?: string; // For backward compatibility
  status: string;
  priority: string;
  worker: {
    id: string;
    _id?: string; // For backward compatibility
    first_name: string;
    firstName?: string; // For backward compatibility
    last_name: string;
    lastName?: string; // For backward compatibility
    email?: string;
  };
  clinician?: {
    id: string;
    _id?: string; // For backward compatibility
    first_name: string;
    firstName?: string; // For backward compatibility
    last_name: string;
    lastName?: string; // For backward compatibility
    email?: string;
  };
  employer?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  injuryDetails?: {
    bodyPart: string;
    injuryType: string;
    severity: string;
    description: string;
  };
  incident?: {
    id: string;
    incidentNumber?: string; // For backward compatibility
    incidentDate?: string; // For backward compatibility
    incident_type: string;
    incidentType?: string; // For backward compatibility
    severity: string;
  };
  workRestrictions?: {
    lifting?: {
      maxWeight: number;
    };
    standing?: {
      maxDuration: number;
    };
    other?: string;
  };
  expectedReturnDate?: string;
  created_at?: string;
  createdAt?: string; // For backward compatibility
  notes?: Array<{
    content: string;
    author: {
      firstName: string;
      lastName: string;
    };
    timestamp: string;
  }>;
}

// Memoized TaskCard component for better performance
const TaskCard = React.memo(({ 
  task, 
  onViewCase, 
  getPriorityColor, 
  user 
}: { 
  task: TaskProps; 
  onViewCase: (id: string) => void; 
  getPriorityColor: (priority: string) => string;
  user: any;
}) => (
  <Card 
    sx={{ 
      borderRadius: '10px', 
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      '&:hover': {
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        transform: 'translateY(-2px)',
        cursor: 'pointer',
      },
      transition: 'all 0.2s ease',
    }}
    onClick={() => onViewCase(task._id)}
  >
    <CardContent sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Chip 
          label={task.priority} 
          size="small" 
          sx={{ 
            backgroundColor: getPriorityColor(task.priority),
            color: 'white',
            fontWeight: 600,
            fontSize: '0.7rem',
            height: '24px',
          }} 
        />
        <IconButton size="small">
          <MoreVert fontSize="small" />
        </IconButton>
      </Box>
      
      <Box sx={{ mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
          {task.title}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          Case #{task.caseNumber}
        </Typography>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Box sx={{ mb: 1 }}>
          <Typography variant="body2" sx={{ 
            color: 'primary.main',
            fontWeight: 500,
            mb: 0.5,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5
          }}>
            <PersonIcon sx={{ fontSize: 16 }} />
            Worker: {task.assignees[0]?.firstName} {task.assignees[0]?.lastName}
          </Typography>
          {user && (
            <Typography variant="body2" sx={{ 
              color: '#7B68EE',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5
            }}>
              <LocalHospital sx={{ fontSize: 16 }} />
              Clinician: {user.firstName} {user.lastName}
            </Typography>
          )}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ 
          height: '40px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical'
        }}>
          {task.description}
        </Typography>
      </Box>
      
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary">Progress</Typography>
          <Typography variant="caption" color="text.secondary">{task.progress}%</Typography>
        </Box>
        <LinearProgress 
          variant="determinate" 
          value={task.progress} 
          sx={{ 
            height: 6, 
            borderRadius: 3,
            backgroundColor: 'rgba(123, 104, 238, 0.1)',
            '& .MuiLinearProgress-bar': {
              backgroundColor: '#7B68EE',
            }
          }} 
        />
      </Box>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {task.assignees.map((assignee, index) => (
            <Tooltip key={assignee._id} title={`${assignee.firstName} ${assignee.lastName}`}>
              <Avatar 
                sx={{ 
                  width: 28, 
                  height: 28,
                  fontSize: '0.75rem',
                  bgcolor: `hsl(${index * 60}, 70%, 60%)`,
                }}
              >
                {assignee.firstName[0]}{assignee.lastName[0]}
              </Avatar>
            </Tooltip>
          ))}
        </Box>
        
        <Typography variant="caption" color="text.secondary">
          {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </Typography>
      </Box>
    </CardContent>
  </Card>
));

TaskCard.displayName = 'TaskCard';

const TASKS_PER_PAGE = 6; // Reduced for better performance
const DEBOUNCE_DELAY = 300; // Search debounce delay
const MAX_TASKS_DISPLAY = 100; // Maximum tasks to display at once

const TaskManagementBoard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskProps[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedCase, setSelectedCase] = useState<CaseDetails | null>(null);
  const [caseDialogOpen, setCaseDialogOpen] = useState(false);
  const [loadingCaseDetails, setLoadingCaseDetails] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'priority' | 'dueDate' | 'status'>('priority');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // View and filter states
  const [currentView, setCurrentView] = useState<'board' | 'list' | 'calendar'>('board');
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    priority: [] as string[],
    status: [] as string[],
    assignee: [] as string[]
  });

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Memoized filtered and sorted tasks for better performance
  const filteredTasks = useMemo(() => {
    if (tasks.length === 0) return [];
    
    let filtered = tasks;
    
    // Apply search filter
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(task => 
        task.caseNumber.toLowerCase().includes(query) ||
        task.title.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query) ||
        task.assignees.some(assignee => 
          `${assignee.firstName} ${assignee.lastName}`.toLowerCase().includes(query)
        )
      );
    }

    // Apply priority filter
    if (filters.priority.length > 0) {
      filtered = filtered.filter(task => filters.priority.includes(task.priority));
    }

    // Apply status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter(task => filters.status.includes(task.status));
    }

    // Apply assignee filter
    if (filters.assignee.length > 0) {
      filtered = filtered.filter(task => 
        task.assignees.some(assignee => filters.assignee.includes(assignee._id))
      );
    }

    // Limit results for performance
    if (filtered.length > MAX_TASKS_DISPLAY) {
      filtered = filtered.slice(0, MAX_TASKS_DISPLAY);
    }

    // Sort tasks
    return filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          comparison = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
          break;
        case 'dueDate':
          comparison = new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
          break;
        case 'status':
          const statusOrder = { to_do: 1, in_progress: 2, revisions: 3, completed: 4 };
          comparison = (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
          break;
      }
      
      return sortOrder === 'asc' ? -comparison : comparison;
    });
  }, [tasks, debouncedSearchQuery, filters, sortBy, sortOrder]);

  // Memoized paginated tasks for better performance
  const getPaginatedTasks = useCallback((status: 'to_do' | 'in_progress' | 'revisions' | 'completed') => {
    const statusTasks = filteredTasks.filter(task => task.status === status);
    const startIndex = (currentPage - 1) * TASKS_PER_PAGE;
    const endIndex = startIndex + TASKS_PER_PAGE;
    return statusTasks.slice(startIndex, endIndex);
  }, [filteredTasks, currentPage]);

  // Memoized total pages calculation
  const totalPages = useMemo(() => {
    const maxTasksInColumn = Math.max(
      filteredTasks.filter(task => task.status === 'to_do').length,
      filteredTasks.filter(task => task.status === 'in_progress').length,
      filteredTasks.filter(task => task.status === 'revisions').length,
      filteredTasks.filter(task => task.status === 'completed').length
    );
    return Math.ceil(maxTasksInColumn / TASKS_PER_PAGE);
  }, [filteredTasks]);

  const fetchAssignedCases = useCallback(async () => {
    try {
      setLoading(true);
      setError(null); // Clear any previous errors
      console.log('Fetching clinician cases from Supabase...');
      
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      
      // Use CaseAssignmentService to get clinician cases from Supabase
      const assignedCases = await CaseAssignmentService.getClinicianCases(user.id);
      console.log('Supabase response:', assignedCases);
      
      if (!Array.isArray(assignedCases)) {
        console.warn('Invalid cases data:', assignedCases);
        throw new Error('Invalid data format received from Supabase');
      }
      
      if (assignedCases.length === 0) {
        console.log('No cases assigned to clinician');
        setTasks([]);
        return;
      }
      
      // Transform cases into task format with error handling for each case
      const caseTasks = assignedCases.reduce((validTasks: TaskProps[], caseItem: CaseTask) => {
        try {
          // Check for both old and new field names
          const caseId = caseItem.id || caseItem._id;
          const caseNumber = caseItem.case_number || caseItem.caseNumber;
          
          if (!caseId || !caseNumber) {
            console.warn('Skipping invalid case item - missing id or case_number:', {
              id: caseId,
              case_number: caseNumber,
              caseItem
            });
            return validTasks;
          }
          
          const transformedTask = transformCaseToTask(caseItem);
          return [...validTasks, transformedTask];
        } catch (error) {
          console.error('Error transforming case:', error, caseItem);
          return validTasks;
        }
      }, []);
      
      console.log('Tasks transformed successfully:', {
        totalCases: assignedCases.length,
        validTasks: caseTasks.length
      });
      
      setTasks(caseTasks);
      
      // Show warning if some cases couldn't be transformed
      if (caseTasks.length < assignedCases.length) {
        console.warn(`${assignedCases.length - caseTasks.length} cases were skipped due to invalid data`);
      }
      
    } catch (err: any) {
      console.error('Error fetching assigned cases:', err);
      
      // Construct detailed error message
      let errorMessage = 'Failed to fetch assigned cases';
      let errorDetails = '';
      
      if (err.message) {
        errorMessage = err.message;
        errorDetails = ' (Supabase error)';
      }
      
      setError(`${errorMessage}${errorDetails}`);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchAssignedCases();
  }, [fetchAssignedCases]);

  // Listen for real-time updates when case manager assigns cases
  useEffect(() => {
    const handleClinicianDataRefresh = (event: CustomEvent) => {
      const { clinicianId, timestamp, cacheCleared } = event.detail;
      console.log('Received clinician data refresh event for:', clinicianId);
      console.log('Cache cleared:', cacheCleared);
      console.log('Timestamp:', timestamp);
      
      // Check if this refresh is for the current user
      if (user?.id === clinicianId) {
        console.log('🔄 Refreshing clinician tasks data with cache cleared...');
        
        // Clear any local state that might be cached
        setTasks([]);
        setError(null);
        
        // Force fetch with fresh data
        fetchAssignedCases();
      }
    };

    // Add event listener
    window.addEventListener('clinicianDataRefresh', handleClinicianDataRefresh as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('clinicianDataRefresh', handleClinicianDataRefresh as EventListener);
    };
  }, [user?.id, fetchAssignedCases]);

  // Real-time subscription to cases table for this clinician
  useEffect(() => {
    if (!user?.id) return;

    console.log('Setting up real-time subscription for clinician:', user.id);

    const subscription = dataClient
      .channel('clinician-cases-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'cases',
          filter: `clinician_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Real-time case update received:', payload);
          console.log('New case data:', payload.new);
          console.log('Old case data:', payload.old);
          
          // Refresh the data when a case is assigned to this clinician
          if (payload.new && payload.new.clinician_id === user.id) {
            console.log('Case assigned to this clinician, refreshing data...');
            fetchAssignedCases();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cases',
          filter: `clinician_id=eq.${user.id}`
        },
        (payload) => {
          console.log('New case inserted for this clinician:', payload);
          fetchAssignedCases();
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up real-time subscription');
      subscription.unsubscribe();
    };
  }, [user?.id, fetchAssignedCases]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, filters, sortBy, sortOrder]);

  const transformCaseToTask = (caseItem: CaseTask): TaskProps => {
    // Map case status to task status
    let taskStatus: 'to_do' | 'in_progress' | 'revisions' | 'completed';
    let progress: number;
    
    switch (caseItem.status) {
      case 'new':
        taskStatus = 'to_do';
        progress = 0;
        break;
      case 'triaged':
        taskStatus = 'to_do';
        progress = 20;
        break;
      case 'assessed':
        taskStatus = 'in_progress';
        progress = 40;
        break;
      case 'in_rehab':
        taskStatus = 'in_progress';
        progress = 60;
        break;
      case 'return_to_work':
        taskStatus = 'revisions';
        progress = 80;
        break;
      case 'closed':
        taskStatus = 'completed';
        progress = 100;
        break;
      default:
        taskStatus = 'to_do';
        progress = 0;
    }

      // Create a title based on available data
    const caseNumber = caseItem.case_number || caseItem.caseNumber;
    let title = `Case ${caseNumber}`;
    let description = 'No details available';
    let tags: string[] = [];
    
    try {
      // Use injury details if available and valid
      if (caseItem.injuryDetails && 
          typeof caseItem.injuryDetails === 'object' && 
          caseItem.injuryDetails.injuryType && 
          caseItem.injuryDetails.bodyPart) {
        title = `${caseItem.injuryDetails.injuryType} - ${caseItem.injuryDetails.bodyPart}`;
        description = caseItem.injuryDetails.description || 'No description provided';
        if (caseItem.injuryDetails.bodyPart) tags.push(caseItem.injuryDetails.bodyPart);
        if (caseItem.injuryDetails.severity) tags.push(caseItem.injuryDetails.severity);
      }
      // Use incident details if available and no valid injury details
      else if (caseItem.incident && 
               typeof caseItem.incident === 'object' && 
               (caseItem.incident.incident_type || caseItem.incident.incidentType)) {
        const incidentType = caseItem.incident.incident_type || caseItem.incident.incidentType;
        title = `Incident - ${incidentType}`;
        description = caseItem.incident.severity ? 
          `Incident severity: ${caseItem.incident.severity}` : 
          'Incident details not available';
        if (incidentType) tags.push(incidentType);
        if (caseItem.incident.severity) tags.push(caseItem.incident.severity);
      }

      // Log the data transformation for debugging
      console.log('Case transformation:', {
        original: caseItem,
        transformed: {
          title,
          description,
          tags
        }
      });
    } catch (error) {
      console.error('Error transforming case data:', error, caseItem);
      // Use fallback values if transformation fails
      title = `Case ${caseNumber}`;
      description = 'Error loading case details';
      tags = [];
    }
    
    // Calculate a due date (placeholder - 14 days from creation or today)
    let dueDate = new Date();
    const createdAt = caseItem.created_at || caseItem.createdAt;
    if (createdAt) {
      dueDate = new Date(createdAt);
      dueDate.setDate(dueDate.getDate() + 14); // 14 days from creation
    } else {
      dueDate.setDate(dueDate.getDate() + 14); // 14 days from today
    }
    
    return {
      _id: caseItem.id || caseItem._id || '',
      caseNumber: caseItem.case_number || caseItem.caseNumber || '',
      title: title,
      description: description,
      priority: caseItem.priority as 'high' | 'medium' | 'low',
      status: taskStatus,
      progress: progress,
      dueDate: dueDate.toISOString().split('T')[0],
      assignees: [{
        _id: caseItem.worker.id || caseItem.worker._id || '',
        firstName: caseItem.worker.first_name || caseItem.worker.firstName || '',
        lastName: caseItem.worker.last_name || caseItem.worker.lastName || ''
      }],
      tags: tags
    };
  };

  const handleViewCase = async (caseId: string) => {
    try {
      setLoadingCaseDetails(true);
      
      // Fetch case details from Supabase
      const { data: caseData, error: caseError } = await dataClient
        .from('cases')
        .select(`
          *,
          worker:users!cases_worker_id_fkey(
            id,
            first_name,
            last_name,
            email
          ),
          clinician:users!cases_clinician_id_fkey(
            id,
            first_name,
            last_name,
            email
          ),
          incident:incidents!cases_incident_id_fkey(
            id,
            incident_type,
            severity,
            description
          )
        `)
        .eq('id', caseId)
        .single();
      
      if (caseError) {
        throw caseError;
      }
      
      if (!caseData) {
        throw new Error('Case not found');
      }
      
      // Transform the data to match the expected format
      const transformedCase: CaseDetails = {
        id: caseData.id,
        _id: caseData.id, // For backward compatibility
        case_number: caseData.case_number,
        caseNumber: caseData.case_number, // For backward compatibility
        status: caseData.status,
        priority: caseData.priority || 'medium',
        worker: {
          id: caseData.worker?.id || '',
          _id: caseData.worker?.id || '', // For backward compatibility
          first_name: caseData.worker?.first_name || '',
          firstName: caseData.worker?.first_name || '', // For backward compatibility
          last_name: caseData.worker?.last_name || '',
          lastName: caseData.worker?.last_name || '', // For backward compatibility
          email: caseData.worker?.email || ''
        },
        clinician: caseData.clinician ? {
          id: caseData.clinician.id,
          _id: caseData.clinician.id, // For backward compatibility
          first_name: caseData.clinician.first_name,
          firstName: caseData.clinician.first_name, // For backward compatibility
          last_name: caseData.clinician.last_name,
          lastName: caseData.clinician.last_name, // For backward compatibility
          email: caseData.clinician.email
        } : undefined,
        injuryDetails: caseData.injury_details ? {
          bodyPart: caseData.injury_details.body_part || '',
          injuryType: caseData.injury_details.injury_type || '',
          severity: caseData.injury_details.severity || '',
          description: caseData.injury_details.description || ''
        } : undefined,
        incident: caseData.incident ? {
          id: caseData.incident.id,
          incidentNumber: caseData.incident.id, // For backward compatibility
          incidentDate: caseData.incident.created_at, // For backward compatibility
          incident_type: caseData.incident.incident_type || '',
          incidentType: caseData.incident.incident_type || '', // For backward compatibility
          severity: caseData.incident.severity || ''
        } : undefined,
        workRestrictions: caseData.work_restrictions,
        expectedReturnDate: caseData.expected_return_date,
        created_at: caseData.created_at,
        createdAt: caseData.created_at // For backward compatibility
      };
      
      setSelectedCase(transformedCase);
      setCaseDialogOpen(true);
    } catch (error) {
      console.error('Error fetching case details:', error);
      setError('Failed to load case details');
    } finally {
      setLoadingCaseDetails(false);
    }
  };

  const handleOpenFullCase = (caseId: string) => {
    navigate(`/cases/${caseId}`);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#ef4444';
      case 'medium':
        return '#3b82f6';
      case 'low':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };


  if (loading) {
    return (
      <Box sx={{ p: 2, backgroundColor: '#f8fafc', minHeight: '100vh' }}>
        <Box sx={{ mb: 3 }}>
          <Skeleton variant="text" width={300} height={40} />
          <Skeleton variant="text" width={400} height={24} />
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Skeleton variant="rectangular" width={200} height={40} />
          <Skeleton variant="rectangular" width={200} height={40} />
          <Skeleton variant="rectangular" width={200} height={40} />
        </Box>
        
        <Grid container spacing={2}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Paper elevation={0} sx={{ p: 2, backgroundColor: '#f8fafc', borderRadius: '12px' }}>
                <Skeleton variant="text" width={100} height={32} sx={{ mb: 2 }} />
                {[1, 2, 3].map((j) => (
                  <Card key={j} sx={{ mb: 2, borderRadius: '10px' }}>
                    <CardContent sx={{ p: 2 }}>
                      <Skeleton variant="rectangular" width={60} height={24} sx={{ mb: 1 }} />
                      <Skeleton variant="text" width="80%" height={24} />
                      <Skeleton variant="text" width="60%" height={16} />
                      <Skeleton variant="rectangular" width="100%" height={6} sx={{ mt: 1 }} />
                    </CardContent>
                  </Card>
                ))}
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, backgroundColor: '#f8fafc', minHeight: '100vh' }}>
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={() => {
                setError(null);
                fetchAssignedCases();
              }}
            >
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
        
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            Unable to load tasks
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => {
              setError(null);
              fetchAssignedCases();
            }}
          >
            Retry
          </Button>
        </Box>
      </Box>
    );
  }

  const renderFilterDialog = () => {
    const uniqueAssignees = Array.from(
      new Set(tasks.map(task => task.assignees[0]).filter(Boolean))
    );

    const handleFilterChange = (filterType: 'priority' | 'status' | 'assignee', value: string) => {
      setFilters(prev => ({
        ...prev,
        [filterType]: prev[filterType].includes(value)
          ? prev[filterType].filter(item => item !== value)
          : [...prev[filterType], value]
      }));
    };

    const clearFilters = () => {
      setFilters({
        priority: [],
        status: [],
        assignee: []
      });
    };

    return (
      <Dialog 
        open={filterDialogOpen} 
        onClose={() => setFilterDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Filter Tasks</Typography>
            <IconButton onClick={() => setFilterDialogOpen(false)} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers>
          {/* Priority Filter */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
              Priority
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {['high', 'medium', 'low'].map(priority => (
                <Chip
                  key={priority}
                  label={priority.charAt(0).toUpperCase() + priority.slice(1)}
                  onClick={() => handleFilterChange('priority', priority)}
                  color={filters.priority.includes(priority) ? 'primary' : 'default'}
                  variant={filters.priority.includes(priority) ? 'filled' : 'outlined'}
                  sx={{ textTransform: 'capitalize' }}
                />
              ))}
            </Box>
          </Box>

          {/* Status Filter */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
              Status
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {['to_do', 'in_progress', 'revisions', 'completed'].map(status => (
                <Chip
                  key={status}
                  label={status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  onClick={() => handleFilterChange('status', status)}
                  color={filters.status.includes(status) ? 'primary' : 'default'}
                  variant={filters.status.includes(status) ? 'filled' : 'outlined'}
                />
              ))}
            </Box>
          </Box>

          {/* Assignee Filter */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
              Workers
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {uniqueAssignees.map(assignee => (
                <Chip
                  key={assignee._id}
                  label={`${assignee.firstName} ${assignee.lastName}`}
                  onClick={() => handleFilterChange('assignee', assignee._id)}
                  color={filters.assignee.includes(assignee._id) ? 'primary' : 'default'}
                  variant={filters.assignee.includes(assignee._id) ? 'filled' : 'outlined'}
                />
              ))}
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={clearFilters} color="inherit">
            Clear All
          </Button>
          <Button onClick={() => setFilterDialogOpen(false)} variant="contained">
            Apply Filters
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  const renderCaseDetailsDialog = () => {
    if (!selectedCase) return null;

    return (
      <Dialog 
        open={caseDialogOpen} 
        onClose={() => setCaseDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ 
          pb: 1,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Box>
            <Typography variant="h5" component="span" sx={{ fontWeight: 600 }}>
              Case {selectedCase.caseNumber}
            </Typography>
            <Chip 
              label={selectedCase.status} 
              size="small"
              color={selectedCase.status === 'closed' ? 'default' : 'primary'}
              sx={{ ml: 2 }}
            />
          </Box>
          <IconButton onClick={() => setCaseDialogOpen(false)} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        
        <DialogContent dividers>
          {loadingCaseDetails ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            <Box>
              {/* Worker Information */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 1, color: 'primary.main' }}>
                  Worker Information
                </Typography>
                <Card variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="body1">
                    <strong>Name:</strong> {selectedCase.worker.firstName} {selectedCase.worker.lastName}
                  </Typography>
                  {selectedCase.worker.email && (
                    <Typography variant="body1">
                      <strong>Email:</strong> {selectedCase.worker.email}
                    </Typography>
                  )}
                </Card>
              </Box>

              {/* Injury Details */}
              {selectedCase.injuryDetails && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ mb: 1, color: 'primary.main' }}>
                    Injury Details
                  </Typography>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="body1">
                      <strong>Body Part:</strong> {selectedCase.injuryDetails.bodyPart}
                    </Typography>
                    <Typography variant="body1">
                      <strong>Injury Type:</strong> {selectedCase.injuryDetails.injuryType}
                    </Typography>
                    <Typography variant="body1">
                      <strong>Severity:</strong> {selectedCase.injuryDetails.severity}
                    </Typography>
                    {selectedCase.injuryDetails.description && (
                      <Typography variant="body1">
                        <strong>Description:</strong> {selectedCase.injuryDetails.description}
                      </Typography>
                    )}
                  </Card>
                </Box>
              )}

              {/* Work Restrictions */}
              {selectedCase.workRestrictions && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ mb: 1, color: 'primary.main' }}>
                    Work Restrictions
                  </Typography>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    {selectedCase.workRestrictions.lifting && (
                      <Typography variant="body1">
                        <strong>Max Lifting Weight:</strong> {selectedCase.workRestrictions.lifting.maxWeight} kg
                      </Typography>
                    )}
                    {selectedCase.workRestrictions.standing && (
                      <Typography variant="body1">
                        <strong>Max Standing Duration:</strong> {selectedCase.workRestrictions.standing.maxDuration} hours
                      </Typography>
                    )}
                    {selectedCase.workRestrictions.other && (
                      <Typography variant="body1">
                        <strong>Other Restrictions:</strong> {selectedCase.workRestrictions.other}
                      </Typography>
                    )}
                  </Card>
                </Box>
              )}

              {/* Notes */}
              {selectedCase.notes && selectedCase.notes.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ mb: 1, color: 'primary.main' }}>
                    Recent Notes
                  </Typography>
                  <Card variant="outlined">
                    <List>
                      {selectedCase.notes.map((note, index) => (
                        <ListItem 
                          key={index}
                          divider={index < selectedCase.notes!.length - 1}
                        >
                          <Box sx={{ width: '100%' }}>
                            <Typography variant="body1" sx={{ mb: 0.5 }}>
                              {note.content}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              By {note.author.firstName} {note.author.lastName} on{' '}
                              {new Date(note.timestamp).toLocaleDateString()}
                            </Typography>
                          </Box>
                        </ListItem>
                      ))}
                    </List>
                  </Card>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button 
            onClick={() => setCaseDialogOpen(false)}
            color="inherit"
          >
            Close
          </Button>
          <Button 
            onClick={() => handleOpenFullCase(selectedCase.id || selectedCase._id || '')}
            variant="contained"
            startIcon={<Visibility />}
          >
            View Full Case
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <Box sx={{ p: 2, backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
          My Tasks
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage and track your tasks efficiently
        </Typography>
      </Box>

      {/* Search and Filters */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant={currentView === 'board' ? 'contained' : 'outlined'}
            startIcon={<Assignment />}
            onClick={() => setCurrentView('board')}
            sx={{ 
              borderRadius: '8px',
              backgroundColor: currentView === 'board' ? '#7B68EE' : 'transparent',
              color: currentView === 'board' ? 'white' : '#7B68EE',
              borderColor: '#7B68EE',
              '&:hover': { 
                backgroundColor: currentView === 'board' ? '#6A5ACD' : 'rgba(123, 104, 238, 0.04)',
                borderColor: '#6A5ACD'
              }
            }}
          >
            Board
          </Button>
          <Button 
            variant={currentView === 'list' ? 'contained' : 'outlined'}
            startIcon={<Assignment />}
            onClick={() => setCurrentView('list')}
            sx={{ 
              borderRadius: '8px',
              backgroundColor: currentView === 'list' ? '#7B68EE' : 'transparent',
              color: currentView === 'list' ? 'white' : '#7B68EE',
              borderColor: '#7B68EE',
              '&:hover': { 
                backgroundColor: currentView === 'list' ? '#6A5ACD' : 'rgba(123, 104, 238, 0.04)',
                borderColor: '#6A5ACD'
              }
            }}
          >
            List
          </Button>
          <Button 
            variant={currentView === 'calendar' ? 'contained' : 'outlined'}
            startIcon={<CalendarToday />}
            onClick={() => setCurrentView('calendar')}
            sx={{ 
              borderRadius: '8px',
              backgroundColor: currentView === 'calendar' ? '#7B68EE' : 'transparent',
              color: currentView === 'calendar' ? 'white' : '#7B68EE',
              borderColor: '#7B68EE',
              '&:hover': { 
                backgroundColor: currentView === 'calendar' ? '#6A5ACD' : 'rgba(123, 104, 238, 0.04)',
                borderColor: '#6A5ACD'
              }
            }}
          >
            Calendar
          </Button>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="Search..."
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: '#7B68EE' }} />
                </InputAdornment>
              ),
              sx: { 
                borderRadius: '8px',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(123, 104, 238, 0.3)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(123, 104, 238, 0.5)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#7B68EE',
                },
              }
            }}
          />
          
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">Sort by:</Typography>
            <Select
              size="small"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'priority' | 'dueDate' | 'status')}
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="priority">Priority</MenuItem>
              <MenuItem value="dueDate">Due Date</MenuItem>
              <MenuItem value="status">Status</MenuItem>
            </Select>
            
            <IconButton 
              size="small" 
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              sx={{ color: '#7B68EE' }}
            >
              {sortOrder === 'asc' ? <ArrowUpward /> : <ArrowDownward />}
            </IconButton>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', ml: 2 }}>
            <Typography variant="body2" color="text.secondary">Page:</Typography>
            <Pagination 
              count={totalPages} 
              page={currentPage}
              onChange={(e, page) => setCurrentPage(page)}
              size="small"
              sx={{
                '& .MuiPaginationItem-root': {
                  color: '#7B68EE',
                },
                '& .Mui-selected': {
                  backgroundColor: 'rgba(123, 104, 238, 0.1) !important',
                },
              }}
            />
          </Box>
          
          <Button 
            variant="outlined" 
            startIcon={<FilterList />}
            onClick={() => setFilterDialogOpen(true)}
            sx={{ 
              borderRadius: '8px',
              color: '#7B68EE',
              borderColor: '#7B68EE',
              '&:hover': { borderColor: '#6A5ACD', backgroundColor: 'rgba(123, 104, 238, 0.04)' }
            }}
          >
            Filters
          </Button>
          
        </Box>
      </Box>

      {/* Task Content */}
      {filteredTasks.length === 0 && !loading ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Assignment sx={{ fontSize: 64, color: '#7B68EE', mb: 2 }} />
          <Typography variant="h5" sx={{ mb: 1, color: '#7B68EE' }}>
            No Tasks Found
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {tasks.length === 0 
              ? "You don't have any assigned tasks yet." 
              : "No tasks match your current filters."}
          </Typography>
          {tasks.length > 0 && (
            <Button 
              variant="outlined" 
              onClick={() => {
                setSearchQuery('');
                setFilters({ priority: [], status: [], assignee: [] });
              }}
            >
              Clear Filters
            </Button>
          )}
        </Box>
      ) : (
        <>
          {currentView === 'board' && (
            <Grid container spacing={2}>
          {/* Board View */}
        {/* To Do Column */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 2, 
              backgroundColor: '#f8fafc', 
              borderRadius: '12px',
              height: '100%',
              border: '1px solid rgba(0,0,0,0.05)',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>To Do</Typography>
              <IconButton size="small" sx={{ backgroundColor: '#f1f5f9', borderRadius: '8px' }}>
                <Add fontSize="small" />
              </IconButton>
            </Box>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {getPaginatedTasks('to_do').map((task) => (
                <TaskCard 
                  key={task._id}
                  task={task}
                  onViewCase={handleViewCase}
                  getPriorityColor={getPriorityColor}
                  user={user}
                />
              ))}
            </Box>
          </Paper>
        </Grid>
        
        {/* In Progress Column */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 2, 
              backgroundColor: '#f8fafc', 
              borderRadius: '12px',
              height: '100%',
              border: '1px solid rgba(0,0,0,0.05)',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>In Progress</Typography>
              <IconButton size="small" sx={{ backgroundColor: '#f1f5f9', borderRadius: '8px' }}>
                <Add fontSize="small" />
              </IconButton>
            </Box>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {getPaginatedTasks('in_progress').map((task) => (
                <TaskCard 
                  key={task._id}
                  task={task}
                  onViewCase={handleViewCase}
                  getPriorityColor={getPriorityColor}
                  user={user}
                />
              ))}
            </Box>
          </Paper>
        </Grid>
        
        {/* Revisions Column */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 2, 
              backgroundColor: '#f8fafc', 
              borderRadius: '12px',
              height: '100%',
              border: '1px solid rgba(0,0,0,0.05)',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Revisions</Typography>
              <IconButton size="small" sx={{ backgroundColor: '#f1f5f9', borderRadius: '8px' }}>
                <Add fontSize="small" />
              </IconButton>
            </Box>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {getPaginatedTasks('revisions').map((task) => (
                <TaskCard 
                  key={task._id}
                  task={task}
                  onViewCase={handleViewCase}
                  getPriorityColor={getPriorityColor}
                  user={user}
                />
              ))}
            </Box>
          </Paper>
        </Grid>
        
        {/* Completed Column */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 2, 
              backgroundColor: '#f8fafc', 
              borderRadius: '12px',
              height: '100%',
              border: '1px solid rgba(0,0,0,0.05)',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Completed</Typography>
              <IconButton size="small" sx={{ backgroundColor: '#f1f5f9', borderRadius: '8px' }}>
                <Add fontSize="small" />
              </IconButton>
            </Box>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {getPaginatedTasks('completed').map((task) => (
                <TaskCard 
                  key={task._id}
                  task={task}
                  onViewCase={handleViewCase}
                  getPriorityColor={getPriorityColor}
                  user={user}
                />
              ))}
            </Box>
          </Paper>
        </Grid>
        </Grid>
      )}

      {currentView === 'list' && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>List View</Typography>
          <Paper elevation={1}>
            <List>
              {filteredTasks.map((task, index) => (
                <ListItem 
                  key={task._id}
                  divider={index < filteredTasks.length - 1}
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: 'rgba(123, 104, 238, 0.04)' }
                  }}
                  onClick={() => handleViewCase(task._id)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Chip 
                      label={task.priority} 
                      size="small"
                      sx={{ 
                        backgroundColor: getPriorityColor(task.priority),
                        color: 'white',
                        fontWeight: 600,
                        minWidth: '70px'
                      }}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {task.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Case #{task.caseNumber} - {task.assignees[0]?.firstName} {task.assignees[0]?.lastName}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="body2" color="text.secondary">
                        {task.progress}% complete
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={task.progress}
                        sx={{ width: 100, mt: 0.5 }}
                      />
                    </Box>
                  </Box>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Box>
      )}

      {currentView === 'calendar' && (
        <Box sx={{ mt: 2, textAlign: 'center', py: 8 }}>
          <CalendarToday sx={{ fontSize: 64, color: '#7B68EE', mb: 2 }} />
          <Typography variant="h5" sx={{ mb: 1, color: '#7B68EE' }}>
            Calendar View
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Calendar view will be available in a future update
          </Typography>
        </Box>
      )}
        </>
      )}

      {/* Filter Dialog */}
      {renderFilterDialog()}

      {/* Case Details Dialog */}
      {renderCaseDetailsDialog()}
    </Box>
  );
};

export default TaskManagementBoard;
