import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Checkbox,
  FormControlLabel,
  FormGroup,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Tooltip,
  Grid
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  Info as InfoIcon,
  Assignment as AssignmentIcon,
  Done as DoneIcon,
  KeyboardArrowLeft as KeyboardArrowLeftIcon,
  KeyboardArrowRight as KeyboardArrowRightIcon,
  Print as PrintIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { SupabaseAPI } from '../utils/supabaseApi';
import { BackendAssignmentAPI } from '../utils/backendAssignmentApi';
import { authClient } from '../lib/supabase';

interface Assignment {
  id: string;
  worker_id: string;
  assigned_date: string;
  due_time: string;
  status: 'pending' | 'completed' | 'overdue' | 'cancelled';
  notes?: string;
  worker?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  work_readiness?: any;
  completed_at?: string;
}

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  team: string;
}

interface UnselectedWorker {
  id: string;
  worker_id: string;
  assignment_date: string;
  reason: 'sick' | 'on_leave_rdo' | 'transferred' | 'injured_medical' | 'not_rostered';
  notes?: string;
  case_status?: 'open' | 'in_progress' | 'closed';
  worker?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface WorkReadinessAssignmentManagerProps {
  teamLeaderId: string;
  team: string;
}

const WorkReadinessAssignmentManager: React.FC<WorkReadinessAssignmentManagerProps> = ({
  teamLeaderId,
  team
}) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [unselectedWorkers, setUnselectedWorkers] = useState<UnselectedWorker[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [unselectedWorkerReasons, setUnselectedWorkerReasons] = useState<{[key: string]: {reason: string, notes: string}}>({});
  const [assignedDate, setAssignedDate] = useState(() => {
    // Get today's date in PHT
    const now = new Date();
    const phtOffset = 8 * 60; // 8 hours in minutes
    const phtTime = new Date(now.getTime() + (phtOffset * 60 * 1000));
    return phtTime.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');
  
  // Confirmation and Success Dialog states
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Team leader shift information
  const [currentShift, setCurrentShift] = useState<{
    shift_name: string;
    start_time: string;
    end_time: string;
    color: string;
  } | null>(null);
  
  // Completed Worker Dialog states
  const [showCompletedWorkerDialog, setShowCompletedWorkerDialog] = useState(false);
  const [completedWorkerMessage, setCompletedWorkerMessage] = useState('');

  // API configuration
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

  // Helper function to get auth token
  const getAuthToken = async () => {
    try {
      const { data: { session } } = await authClient.auth.getSession();
      return session?.access_token || null;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  };


  // Fetch team leader's current shift
  const fetchCurrentShift = async () => {
    try {
      const token = await getAuthToken();
      if (!token) {
        console.warn('No auth token available for shift data');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/shifts/history/${teamLeaderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Find the current active shift
        const activeShift = data.data?.find((shift: any) => shift.is_active);
        if (activeShift) {
          setCurrentShift({
            shift_name: activeShift.shift_types.name,
            start_time: activeShift.shift_types.start_time,
            end_time: activeShift.shift_types.end_time,
            color: activeShift.shift_types.color
          });
        }
      }
    } catch (error) {
      console.error('Error fetching current shift:', error);
    }
  };
  
  // Cancel confirmation dialog state
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [assignmentToCancel, setAssignmentToCancel] = useState<{
    id: string;
    workerName: string;
    assignedDate: string;
  } | null>(null);
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [validatingPassword, setValidatingPassword] = useState(false);
  
  // Overdue confirmation dialog state
  const [showOverdueConfirmDialog, setShowOverdueConfirmDialog] = useState(false);
  
  // Overdue blocking dialog state
  const [showOverdueBlockingDialog, setShowOverdueBlockingDialog] = useState(false);
  const [overdueBlockingMessage, setOverdueBlockingMessage] = useState('');
  
  // Filter states
  const [filterDate, setFilterDate] = useState(() => {
    // Get today's date in PHT
    const now = new Date();
    const phtOffset = 8 * 60; // 8 hours in minutes
    const phtTime = new Date(now.getTime() + (phtOffset * 60 * 1000));
    return phtTime.toISOString().split('T')[0];
  });
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Pagination states
  const [assignmentsPage, setAssignmentsPage] = useState(1);
  const [unselectedPage, setUnselectedPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    fetchTeamMembers();
    fetchAssignments();
    fetchUnselectedWorkers();
    fetchCurrentShift();
  }, [teamLeaderId]);


  // Auto-refresh assignments every 30 seconds to catch status updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAssignments();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
    setAssignmentsPage(1);
    setUnselectedPage(1);
  }, [filterDate, filterStatus]);

  const fetchTeamMembers = async () => {
    try {
      const { teamMembers: members } = await SupabaseAPI.getTeamMembers(teamLeaderId, team);
      setTeamMembers(members || []);
    } catch (err) {
      console.error('Error fetching team members:', err);
      setError('Failed to load team members');
    }
  };

  // Helper function to check if a worker is unavailable
  const isWorkerUnavailable = (member: any) => {
    const now = new Date();
    
    // Check if worker has pending assignment that's not due (across ALL dates)
    const pendingNotDue = assignments.some(assignment => {
      if (assignment.worker_id !== member.id) return false;
      if (assignment.status !== 'pending') return false;
      
      if (assignment.due_time) {
        const dueDate = new Date(assignment.due_time);
        return now < dueDate; // Only block if not yet due
      }
      return true; // No due time set, consider as not due
    });

    // Check if worker has completed assignment for selected date - NO DUPLICATES ALLOWED
    const completed = assignments.some(assignment => {
      if (assignment.worker_id !== member.id) return false;
      if (assignment.assigned_date !== assignedDate) return false;
      return assignment.status === 'completed'; // Always block if completed on same date
    });

    // Check if worker has unselected case
    const unselected = unselectedWorkers.some(unselected => 
      unselected.worker_id === member.id &&
        unselected.assignment_date === assignedDate && 
        unselected.case_status !== 'closed'
    );

    // Check if worker has overdue assignment on the same date AND next shift hasn't started
    const overdue = assignments.some(assignment => {
      if (assignment.worker_id !== member.id) return false;
      if (assignment.assigned_date !== assignedDate) return false;
      if (assignment.status !== 'overdue') return false;
      
      // Check if next shift has started by comparing with current shift end time
      if (currentShift && assignment.due_time) {
        const dueTime = new Date(assignment.due_time);
        const now = new Date();
        
        // If current time is past the shift end time, worker should be available
        // This is a simplified check - the backend will do the precise calculation
        return now < dueTime;
      }
      
      return true; // Block if no shift info available
    });

    return pendingNotDue || completed || unselected || overdue;
  };

  const getAvailableTeamMembers = () => {
    // Filter out unavailable workers and currently selected workers
    const availableMembers = teamMembers.filter(member => 
      !isWorkerUnavailable(member) &&
      !selectedWorkers.includes(member.id)
    );

    console.log('🔍 Available Members:', availableMembers.map(m => `${m.first_name} ${m.last_name}`));
    return availableMembers;
  };

  const getFilteredAssignments = () => {
    let filtered = assignments;
    
    console.log('🔍 getFilteredAssignments - Debug Info:');
    console.log('Total assignments:', assignments.length);
    console.log('Filter status:', filterStatus);
    console.log('Filter date:', filterDate);
    console.log('All assignment statuses:', assignments.map(a => ({ id: a.id, status: a.status, worker: a.worker?.first_name })));
    
    if (filterDate) {
      filtered = filtered.filter(assignment => assignment.assigned_date === filterDate);
      console.log('After date filter:', filtered.length);
    }
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(assignment => assignment.status === filterStatus);
      console.log('After status filter:', filtered.length);
      console.log('Filtered assignments:', filtered.map(a => ({ id: a.id, status: a.status, worker: a.worker?.first_name })));
    }
    
    return filtered;
  };

  const getFilteredUnselectedWorkers = () => {
    let filtered = unselectedWorkers;
    
    if (filterDate) {
      filtered = filtered.filter(unselected => unselected.assignment_date === filterDate);
    }
    
    return filtered;
  };

  const getPaginatedAssignments = () => {
    const filtered = getFilteredAssignments();
    
    // Only sort by performance rank when viewing completed assignments
    let sortedAssignments = filtered;
    if (filterStatus === 'completed') {
      sortedAssignments = filtered.sort((a, b) => {
        const rankA = getWorkerRank(a.worker_id);
        const rankB = getWorkerRank(b.worker_id);
        return rankA - rankB; // Lower rank number = better performance = appears first
      });
    }
    
    const startIndex = (assignmentsPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedAssignments.slice(startIndex, endIndex);
  };

  const getPaginatedUnselectedWorkers = () => {
    const filtered = getFilteredUnselectedWorkers().filter(w => w.case_status !== 'closed');
    const startIndex = (unselectedPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  const getTotalPages = (items: any[]) => {
    return Math.ceil(items.length / itemsPerPage);
  };

  const handleAssignmentsPageChange = (newPage: number) => {
    setAssignmentsPage(newPage);
  };

  const handleUnselectedPageChange = (newPage: number) => {
    setUnselectedPage(newPage);
  };

  const PaginationComponent = ({ 
    currentPage, 
    totalPages, 
    onPageChange, 
    totalItems, 
    itemsPerPage 
  }: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalItems: number;
    itemsPerPage: number;
  }) => {
    if (totalPages <= 1) return null;

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mt: 2, 
        p: 2,
        bgcolor: '#f8fafc',
        borderRadius: 1,
        border: '1px solid #e2e8f0'
      }}>
        <Typography variant="body2" color="text.secondary">
          Showing {startItem}-{endItem} of {totalItems} items
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            startIcon={<KeyboardArrowLeftIcon />}
            sx={{ minWidth: 100 }}
          >
            Previous
          </Button>
          
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "contained" : "outlined"}
                  size="small"
                  onClick={() => onPageChange(pageNum)}
                  sx={{ 
                    minWidth: 40,
                    backgroundColor: currentPage === pageNum ? '#6366f1' : 'transparent',
                    color: currentPage === pageNum ? 'white' : '#6366f1',
                    '&:hover': {
                      backgroundColor: currentPage === pageNum ? '#4f46e5' : '#6366f110'
                    }
                  }}
                >
                  {pageNum}
                </Button>
              );
            })}
          </Box>
          
          <Button
            variant="outlined"
            size="small"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            endIcon={<KeyboardArrowRightIcon />}
            sx={{ minWidth: 100 }}
          >
            Next
          </Button>
        </Box>
      </Box>
    );
  };

  // Worker Performance Ranking Functions
  interface WorkerPerformanceData {
    id: string;
    name: string;
    email: string;
    assignments: number;
    completed: number;
    onTime: number;
    avgReadiness: number;
    avgFatigue: number;
    performanceRating: string;
  }

  const calculateWorkerPerformance = (): WorkerPerformanceData[] => {
    const workerMap = new Map<string, WorkerPerformanceData>();

    // Use filtered assignments based on current date filter for performance calculation
    const filteredAssignments = getFilteredAssignments();
    
    console.log('🔍 Worker Performance Debug:');
    console.log('All Assignments:', assignments);
    console.log('Filtered Assignments:', filteredAssignments);
    console.log('Team Members:', teamMembers);
    console.log('Filter Date:', filterDate);

    // Only initialize worker data for workers who have assignments for the selected date
    filteredAssignments.forEach(assignment => {
      if (!workerMap.has(assignment.worker_id)) {
        const worker = teamMembers.find(m => m.id === assignment.worker_id);
        console.log('Looking for worker:', assignment.worker_id, 'Found:', worker);
        
        // Use worker data from assignment if team member not found
        const workerName = worker ? `${worker.first_name} ${worker.last_name}` : 
                          (assignment.worker?.first_name && assignment.worker?.last_name) ? 
                          `${assignment.worker.first_name} ${assignment.worker.last_name}` : 
                          `Worker ${assignment.worker_id}`;
        const workerEmail = worker ? worker.email : 
                           assignment.worker?.email || 'No email';
        
        workerMap.set(assignment.worker_id, {
          id: assignment.worker_id,
          name: workerName,
          email: workerEmail,
          assignments: 0,
          completed: 0,
          onTime: 0,
          avgReadiness: 0,
          avgFatigue: 0,
          performanceRating: 'No Data'
        });
      }
    });

    // Calculate performance metrics from filtered assignments
    filteredAssignments.forEach(assignment => {
      const worker = workerMap.get(assignment.worker_id);
      if (worker) {
        worker.assignments++;
        
        if (assignment.status === 'completed') {
          worker.completed++;
          
          // Check if completed on time (within 24 hours of assignment)
          const assignedDate = new Date(assignment.assigned_date);
          const completedDate = new Date(assignment.completed_at || assignment.assigned_date);
          const isOnTime = completedDate <= new Date(assignedDate.getTime() + 24 * 60 * 60 * 1000);
          
          if (isOnTime) {
            worker.onTime++;
          }

          // Add readiness and fatigue data if available from work_readiness
          if (assignment.work_readiness?.readiness_level) {
            const readinessLevel = parseFloat(assignment.work_readiness.readiness_level);
            if (!isNaN(readinessLevel)) {
              worker.avgReadiness = (worker.avgReadiness * (worker.completed - 1) + readinessLevel) / worker.completed;
            }
          }
          if (assignment.work_readiness?.fatigue_level) {
            const fatigueLevel = parseFloat(assignment.work_readiness.fatigue_level);
            if (!isNaN(fatigueLevel)) {
              worker.avgFatigue = (worker.avgFatigue * (worker.completed - 1) + fatigueLevel) / worker.completed;
            }
          }
        }
      }
    });

    // Calculate performance ratings only for workers with completed assignments
    workerMap.forEach(worker => {
      if (worker.completed > 0) {
        const completionRate = (worker.completed / worker.assignments) * 100;
        const onTimeRate = (worker.onTime / worker.completed) * 100;
        const readinessScore = worker.avgReadiness || 0;
        
        const overallScore = (completionRate + onTimeRate + readinessScore) / 3;
        
        if (overallScore >= 85) {
          worker.performanceRating = 'Excellent';
        } else if (overallScore >= 70) {
          worker.performanceRating = 'Good';
        } else if (overallScore >= 50) {
          worker.performanceRating = 'Average';
        } else {
          worker.performanceRating = 'Needs Improvement';
        }
      }
    });

    // Return all workers who have assignments (even if not completed)
    const result = Array.from(workerMap.values());
    console.log('🔍 Worker Performance Result:', result);
    console.log('Worker Map Size:', workerMap.size);
    console.log('Result Length:', result.length);
    
    // If no workers found but we have assignments, there might be a data issue
    if (result.length === 0 && assignments.length > 0) {
      console.log('⚠️ No workers found but assignments exist - data structure issue');
      console.log('All Assignment worker_ids:', assignments.map(a => a.worker_id));
      console.log('Filtered Assignment worker_ids:', filteredAssignments.map(a => a.worker_id));
      console.log('Team member ids:', teamMembers.map(m => m.id));
    }
    
    return result;
  };

  const getPaginatedWorkerPerformance = () => {
    const workerPerformance = calculateWorkerPerformance();
    // Sort workers by performance score (best to worst)
    const sortedWorkers = workerPerformance.sort((a, b) => {
      // Only rank workers with completed assignments
      if (a.completed === 0 && b.completed === 0) {
        return 0; // Equal ranking for workers with no completions
      }
      if (a.completed === 0) return 1; // Workers with no completions go to bottom
      if (b.completed === 0) return -1; // Workers with no completions go to bottom
      
      const scoreA = (a.completed / Math.max(a.assignments, 1)) * 100 + 
                    (a.onTime / Math.max(a.completed, 1)) * 100 + 
                    (a.avgReadiness || 0);
      const scoreB = (b.completed / Math.max(b.assignments, 1)) * 100 + 
                    (b.onTime / Math.max(b.completed, 1)) * 100 + 
                    (b.avgReadiness || 0);
      return scoreB - scoreA; // Higher score = better rank (first)
    });
    
    const startIndex = (assignmentsPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedWorkers.slice(startIndex, endIndex);
  };

  const getWorkerRank = (workerId: string) => {
    const workerPerformance = calculateWorkerPerformance();
    const sortedWorkers = workerPerformance.sort((a, b) => {
      // Only rank workers with completed assignments
      if (a.completed === 0 && b.completed === 0) {
        return 0; // Equal ranking for workers with no completions
      }
      if (a.completed === 0) return 1; // Workers with no completions go to bottom
      if (b.completed === 0) return -1; // Workers with no completions go to bottom
      
      const scoreA = (a.completed / Math.max(a.assignments, 1)) * 100 + 
                    (a.onTime / Math.max(a.completed, 1)) * 100 + 
                    (a.avgReadiness || 0);
      const scoreB = (b.completed / Math.max(b.assignments, 1)) * 100 + 
                    (b.onTime / Math.max(b.completed, 1)) * 100 + 
                    (b.avgReadiness || 0);
      return scoreB - scoreA;
    });
    
    const globalRank = sortedWorkers.findIndex(w => w.id === workerId) + 1;
    return globalRank;
  };

  const getPerformanceColor = (rating: string) => {
    switch (rating) {
      case 'Excellent': return '#10b981';
      case 'Good': return '#3b82f6';
      case 'Average': return '#f59e0b';
      case 'Needs Improvement': return '#ef4444';
      case 'No Data': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      // Fetch all assignments including cancelled ones
      const response = await BackendAssignmentAPI.getAssignments();
      
      console.log('🔍 fetchAssignments - Raw API Response:', response);
      console.log('🔍 fetchAssignments - Assignments array:', response.assignments);
      console.log('🔍 fetchAssignments - Assignment statuses:', response.assignments?.map((a: any) => ({ id: a.id, status: a.status, worker: a.worker?.first_name })));
      
      // Debug stats calculation
      const assignments = response.assignments || [];
      const completedCount = assignments.filter(a => a.status === 'completed').length;
      const pendingCount = assignments.filter(a => a.status === 'pending').length;
      const overdueCount = assignments.filter(a => a.status === 'overdue').length;
      
      console.log('📊 Assignment Stats:', {
        total: assignments.length,
        completed: completedCount,
        pending: pendingCount,
        overdue: overdueCount
      });
      
      setAssignments(assignments);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching assignments:', err);
      setError(err.message || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnselectedWorkers = async () => {
    try {
      // Fetch all unselected workers, not filtered by date for dialog logic
      const response = await BackendAssignmentAPI.getUnselectedWorkers();
      setUnselectedWorkers(response.unselectedWorkers || []);
    } catch (err: any) {
      console.error('Error fetching unselected workers:', err);
      // Don't show error for unselected workers, just log it
    }
  };

  // Check if any assignments are past due time (only for today's assignments)
  const hasOverdueAssignments = () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
    
    return assignments.some(assignment => 
      assignment.status === 'pending' && 
      assignment.assigned_date === today && // Only check today's assignments
      new Date(assignment.due_time) < now
    );
  };

  // Check if team leader's shift has ended
  const isShiftEnded = () => {
    if (!currentShift) return false;
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute; // Current time in minutes
    
    // Parse shift end time
    const [endHour, endMinute] = currentShift.end_time.split(':').map(Number);
    const shiftEndTime = endHour * 60 + endMinute; // Shift end time in minutes
    
    // Handle night shift (22:00 - 06:00) - crosses midnight
    if (endHour < 12) { // Night shift (ends before noon, e.g., 06:00)
      // Shift ends the next day, so check if current time is past the end time
      // OR if current time is before the start time (meaning we're in the next day)
      const [startHour] = currentShift.start_time.split(':').map(Number);
      const shiftStartTime = startHour * 60; // Start time in minutes
      
      return currentTime >= shiftEndTime || currentTime < shiftStartTime;
    } else {
      // Day shift (ends after noon, e.g., 14:00, 22:00)
      return currentTime >= shiftEndTime;
    }
  };

  // Check if overdue button should be enabled
  const isOverdueButtonEnabled = () => {
    return hasOverdueAssignments() && isShiftEnded();
  };

  // Check if there are overdue assignments that block new assignment creation
  const checkOverdueBlocking = () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // Find overdue assignments for today
    const overdueAssignments = assignments.filter(assignment => 
      assignment.status === 'overdue' && 
      assignment.assigned_date === today
    );
    
    if (overdueAssignments.length === 0) {
      return { hasOverdue: false, message: '' };
    }
    
    // Calculate next shift start time
    let nextShiftStart = '';
    if (currentShift) {
      const [startHour, startMinute] = currentShift.start_time.split(':').map(Number);
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      nextShiftStart = tomorrow.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) + ` at ${currentShift.start_time}`;
    } else {
      nextShiftStart = 'the next shift';
    }
    
    const message = `Cannot assign new work readiness tasks. Some workers have overdue assignments for ${new Date(today).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}. They will be available when the next shift starts at ${nextShiftStart}.`;
    
    return { hasOverdue: true, message };
  };

  // Handle manual overdue marking confirmation
  const confirmMarkOverdue = async () => {
    try {
      setLoading(true);
      
      // Check if there are any overdue assignments first
      if (!hasOverdueAssignments()) {
        setSuccessMessage('No assignments are past due time yet');
        setShowSuccessDialog(true);
        return;
      }
      
      const response = await BackendAssignmentAPI.markOverdueAssignments();
      
      if (response.success) {
        console.log(`✅ Marked ${response.count} assignments as overdue`);
        await fetchAssignments(); // Refresh the list
        // Show success message
        setSuccessMessage(`Successfully marked ${response.count} assignments as overdue`);
        setShowSuccessDialog(true);
      } else {
        console.error('Failed to mark overdue assignments:', response.message);
        // Show error message
        setSuccessMessage(`Error: ${response.message || 'Unknown error'}`);
        setShowSuccessDialog(true);
      }
    } catch (error: any) {
      console.error('Error marking overdue assignments:', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Error marking overdue assignments';
      setSuccessMessage(`Error: ${errorMessage}`);
      setShowSuccessDialog(true);
    } finally {
      setLoading(false);
      setShowOverdueConfirmDialog(false);
    }
  };

  const handleCreateAssignments = () => {
    if (selectedWorkers.length === 0) {
      setError('Please select at least one worker');
      return;
    }

    // Check for overdue assignments that block new assignment creation
    const overdueCheck = checkOverdueBlocking();
    if (overdueCheck.hasOverdue) {
      setOverdueBlockingMessage(overdueCheck.message);
      setShowOverdueBlockingDialog(true);
      return;
    }

    // Validate that all unselected workers have reasons
    const availableMembers = getAvailableTeamMembers();
    const unselectedWorkerIds = teamMembers
      .filter(member => 
        !selectedWorkers.includes(member.id) && 
        !assignments.some(a => a.assigned_date === assignedDate && a.worker_id === member.id && a.status === 'pending') &&
        !unselectedWorkers.some(u => u.assignment_date === assignedDate && u.worker_id === member.id && u.case_status !== 'closed')
      )
      .map(member => member.id);

    // Auto-populate missing reasons with "not_rostered" as default reason
    let missingReasons = unselectedWorkerIds.filter(workerId => 
      !unselectedWorkerReasons[workerId]?.reason
    );

    if (missingReasons.length > 0) {
      // Auto-assign "not_rostered" reason to all missing workers
      const updatedReasons = { ...unselectedWorkerReasons };
      missingReasons.forEach(workerId => {
        updatedReasons[workerId] = {
          reason: 'not_rostered',
          notes: 'Auto-assigned: Not rostered'
        };
      });
      setUnselectedWorkerReasons(updatedReasons);
      console.log('Auto-assigned reasons for', missingReasons.length, 'workers');
      
      // Show success message about auto-assignment
      const workerNames = missingReasons.map(id => {
        const worker = teamMembers.find(m => m.id === id);
        return worker ? `${worker.first_name} ${worker.last_name}` : id;
      }).join(', ');
      
      setSuccess(`Auto-assigned "Not rostered" as reason for ${missingReasons.length} worker(s): ${workerNames}`);
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    }

    // Show confirmation dialog
    setShowConfirmationDialog(true);
  };

  const handlePrintAssignment = () => {
    const selectedWorkerNames = teamMembers
      .filter(member => selectedWorkers.includes(member.id))
      .map(member => `${member.first_name} ${member.last_name}`)
      .sort();

    const unselectedWorkerNames = teamMembers
      .filter(member => Object.keys(unselectedWorkerReasons).includes(member.id))
      .map(member => ({
        name: `${member.first_name} ${member.last_name}`,
        reason: unselectedWorkerReasons[member.id]?.reason || 'Not specified',
        notes: unselectedWorkerReasons[member.id]?.notes || ''
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Work Readiness Assignment - ${new Date(assignedDate).toLocaleDateString()}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1976d2; padding-bottom: 20px; }
          .title { color: #1976d2; font-size: 24px; font-weight: bold; margin-bottom: 10px; }
          .date { font-size: 18px; color: #666; }
          .section { margin: 20px 0; }
          .section-title { font-size: 18px; font-weight: bold; color: #1976d2; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
          .details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0; }
          .worker-list { margin: 10px 0; }
          .worker-item { padding: 8px 0; border-bottom: 1px solid #eee; }
          .worker-name { font-weight: bold; }
          .reason { color: #666; font-style: italic; }
          .notes { color: #888; font-size: 12px; }
          .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
          @media print { body { margin: 0; } .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Work Readiness Assignment</div>
          <div class="date">${new Date(assignedDate).toLocaleDateString()} - Due: ${currentShift ? `End of ${currentShift.shift_name} (${currentShift.end_time})` : 'Based on shift schedule'}</div>
        </div>

        <div class="section">
          <div class="section-title">📋 Assignment Details</div>
          <div class="details">
            <strong>Date:</strong> ${new Date(assignedDate).toLocaleDateString()}<br>
            <strong>Due Time:</strong> ${currentShift ? `End of ${currentShift.shift_name} (${currentShift.end_time})` : 'Based on shift schedule (calculated automatically)'}<br>
            <strong>Team:</strong> ${team}<br>
            <strong>Selected Workers:</strong> ${selectedWorkers.length} worker(s)<br>
            <strong>Unselected Workers:</strong> ${Object.keys(unselectedWorkerReasons).length} worker(s)
          </div>
        </div>

        ${notes ? `
        <div class="section">
          <div class="section-title">📝 Notes</div>
          <div class="details">${notes}</div>
        </div>
        ` : ''}

        <div class="section">
          <div class="section-title">✅ Assigned Workers (${selectedWorkers.length})</div>
          <div class="worker-list">
            ${selectedWorkerNames.map(name => `
              <div class="worker-item">
                <div class="worker-name">• ${name}</div>
              </div>
            `).join('')}
          </div>
        </div>

        ${unselectedWorkerNames.length > 0 ? `
        <div class="section">
          <div class="section-title">🚫 Unselected Workers (${unselectedWorkerNames.length})</div>
          <div class="worker-list">
            ${unselectedWorkerNames.map(worker => `
              <div class="worker-item">
                <div class="worker-name">• ${worker.name}</div>
                <div class="reason">Reason: ${worker.reason}</div>
                ${worker.notes ? `<div class="notes">Notes: ${worker.notes}</div>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        <div class="footer">
          <div>Generated on ${new Date().toLocaleString()}</div>
          <div>Work Readiness Assignment System</div>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  const confirmCreateAssignments = async () => {
    setShowConfirmationDialog(false);

    try {
      setLoading(true);
      setError(null);
      
      // Prepare unselected workers data
      const unselectedWorkersData = Object.entries(unselectedWorkerReasons)
        .filter(([workerId]) => !selectedWorkers.includes(workerId))
        .map(([workerId, data]) => ({
          workerId,
          reason: data.reason,
          notes: data.notes
        }));
      
      // Use shift-based deadline instead of hardcoded end of day
      // The backend will calculate the deadline based on team leader's shift
      const response = await BackendAssignmentAPI.createAssignments(
        selectedWorkers,
        new Date(assignedDate),
        team,
        notes,
        undefined, // Let backend calculate shift-based deadline
        unselectedWorkersData
      );
      
      // Show success dialog with deadline information
      const deadlineMessage = response.deadlineMessage || 'Deadline calculated based on your shift schedule';
      const successMsg = `${response.message || `Successfully created assignments for ${selectedWorkers.length} worker(s)`}\n\n${deadlineMessage}`;
      setSuccessMessage(successMsg);
      setShowSuccessDialog(true);
      
      setOpenDialog(false);
      resetForm();
      fetchAssignments();
      fetchUnselectedWorkers();
      
    } catch (err: any) {
      console.error('Error creating assignments:', err);
      
      // Check if the error is related to completed workers
      if (err.response?.data?.completedWorkers && err.response.data.completedWorkers.length > 0) {
        const completedWorkerNames = teamMembers
          .filter(member => err.response.data.completedWorkers.includes(member.id))
          .map(member => `${member.first_name} ${member.last_name}`)
          .join(', ');
        
        setCompletedWorkerMessage(
          `The following workers have already completed their work readiness assessment for ${new Date(assignedDate).toLocaleDateString()} and cannot be assigned again:\n\n${completedWorkerNames}\n\nPlease select different workers or choose a different date.`
        );
        setShowCompletedWorkerDialog(true);
      } else {
        setError(err.message || 'Failed to create assignments');
      }
    } finally {
      setLoading(false);
    }
  };

  // Password validation function
  const validatePassword = async (password: string): Promise<boolean> => {
    try {
      setValidatingPassword(true);
      setPasswordError('');
      
      const { data: { session } } = await authClient.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Use Supabase auth to verify password
      const { error } = await authClient.auth.signInWithPassword({
        email: session.user.email || '',
        password: password
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setPasswordError('Incorrect password. Please try again.');
          return false;
        }
        throw error;
      }

      return true;
    } catch (err: any) {
      console.error('Password validation error:', err);
      setPasswordError(err.message || 'Failed to validate password');
      return false;
    } finally {
      setValidatingPassword(false);
    }
  };

  const handleCancelAssignment = async (assignmentId: string) => {
    // Find the assignment details for the dialog
    const assignment = assignments.find(a => a.id === assignmentId);
    if (!assignment) return;
    
    const worker = teamMembers.find(m => m.id === assignment.worker_id);
    const workerName = worker ? `${worker.first_name} ${worker.last_name}` : 'Unknown Worker';
    
    setAssignmentToCancel({
      id: assignmentId,
      workerName,
      assignedDate: assignment.assigned_date
    });
    
    // Show password dialog first
    setPasswordDialog(true);
    setPasswordInput('');
    setPasswordError('');
  };

  const handlePasswordSubmit = async () => {
    if (!passwordInput.trim()) {
      setPasswordError('Please enter your password');
      return;
    }

    const isValid = await validatePassword(passwordInput);
    if (isValid) {
      // Password is correct, show cancel confirmation dialog
      setPasswordDialog(false);
      setShowCancelDialog(true);
      setPasswordInput('');
      setPasswordError('');
    }
  };

  const confirmCancelAssignment = async () => {
    if (!assignmentToCancel) return;
    
    try {
      setLoading(true);
      const response = await BackendAssignmentAPI.cancelAssignment(assignmentToCancel.id);
      setSuccess(response.message || 'Assignment cancelled successfully');
      fetchAssignments();
      setTimeout(() => setSuccess(null), 3000);
      
      // Close dialog
      setShowCancelDialog(false);
      setAssignmentToCancel(null);
    } catch (err: any) {
      console.error('Error cancelling assignment:', err);
      setError(err.message || 'Failed to cancel assignment');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedWorkers([]);
    setUnselectedWorkerReasons({});
    // Reset to today's date in PHT
    const now = new Date();
    const phtOffset = 8 * 60; // 8 hours in minutes
    const phtTime = new Date(now.getTime() + (phtOffset * 60 * 1000));
    setAssignedDate(phtTime.toISOString().split('T')[0]);
    setNotes('');
  };

  const handleWorkerToggle = (workerId: string) => {
    setSelectedWorkers(prev =>
      prev.includes(workerId)
        ? prev.filter(id => id !== workerId)
        : [...prev, workerId]
    );
  };

  const handleUnselectedWorkerReasonChange = (workerId: string, reason: string) => {
    setUnselectedWorkerReasons(prev => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        reason
      }
    }));
  };

  const handleUnselectedWorkerNotesChange = (workerId: string, notes: string) => {
    setUnselectedWorkerReasons(prev => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        notes
      }
    }));
  };

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'sick': return 'Sick';
      case 'on_leave_rdo': return 'On leave / RDO';
      case 'transferred': return 'Transferred to another site';
      case 'injured_medical': return 'Injured / Medical';
      case 'not_rostered': return 'Not rostered';
      default: return reason;
    }
  };

  const getCaseStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'error';
      case 'in_progress': return 'warning';
      case 'closed': return 'success';
      default: return 'default';
    }
  };

  const getCaseStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return 'Open';
      case 'in_progress': return 'In Progress';
      case 'closed': return 'Closed';
      default: return 'Open';
    }
  };

  const handleCloseCase = async (unselectedWorkerId: string) => {
    const worker = unselectedWorkers.find(w => w.id === unselectedWorkerId);
    const workerName = worker?.worker ? `${worker.worker.first_name} ${worker.worker.last_name}` : 'this worker';
    const reason = worker ? getReasonLabel(worker.reason) : 'the specified reason';
    
    const confirmMessage = `Close case for ${workerName}?\n\nReason: ${reason}\n\nThis will make the worker available for assignment again.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setLoading(true);
      
      // Call backend API to close the case
      const response = await BackendAssignmentAPI.closeUnselectedWorkerCase(unselectedWorkerId);
      
      if (response.success) {
        // Remove the worker from unselectedWorkers list when case is closed
        const updatedUnselectedWorkers = unselectedWorkers.filter(worker => 
          worker.id !== unselectedWorkerId
        );
        setUnselectedWorkers(updatedUnselectedWorkers);
        
        setSuccess(`✅ Case closed successfully! ${workerName} is now available for assignment.`);
        setTimeout(() => setSuccess(null), 5000);
      } else {
        throw new Error(response.message || 'Failed to close case');
      }
    } catch (err: any) {
      console.error('Error closing case:', err);
      setError(err.message || 'Failed to close case');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'overdue':
        return 'error';
      case 'cancelled':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon fontSize="small" />;
      case 'pending':
        return <ScheduleIcon fontSize="small" />;
      case 'overdue':
        return <WarningIcon fontSize="small" />;
      case 'cancelled':
        return <CancelIcon fontSize="small" />;
      default:
        return undefined;
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#171717' }}>
          Work Readiness Assignments
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
            onClick={fetchAssignments}
            disabled={loading}
            sx={{
              borderColor: '#6366f1',
              color: '#6366f1',
              '&:hover': { 
                borderColor: '#4f46e5',
                backgroundColor: '#f8fafc'
              },
              '&:disabled': {
                borderColor: '#d1d5db',
                color: '#9ca3af'
              }
            }}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button
            variant="contained"
            color="warning"
            startIcon={<ScheduleIcon />}
            onClick={() => setShowOverdueConfirmDialog(true)}
            disabled={loading || !isOverdueButtonEnabled()}
            sx={{ 
              bgcolor: '#f59e0b',
              '&:hover': { bgcolor: '#d97706' },
              '&:disabled': {
                bgcolor: '#d1d5db',
                color: '#9ca3af'
              }
            }}
            title={
              !isShiftEnded() ? "Cannot mark overdue during active shift" :
              !hasOverdueAssignments() ? "No assignments are past due time yet" :
              "Mark assignments as overdue if past due time"
            }
          >
            Mark Overdue
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
            sx={{
              backgroundColor: '#6366f1',
              '&:hover': { backgroundColor: '#4f46e5' }
            }}
          >
            Create Assignment
          </Button>
        </Box>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Quick Stats */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            {[
              { 
                label: 'Total Assignments', 
                value: getFilteredAssignments().length, 
                color: '#6366f1',
                icon: <AssignmentIcon />
              },
              { 
                label: 'Pending', 
                value: getFilteredAssignments().filter(a => a.status === 'pending').length, 
                color: '#f59e0b',
                icon: <ScheduleIcon />
              },
              { 
                label: 'Completed', 
                value: getFilteredAssignments().filter(a => a.status === 'completed').length, 
                color: '#10b981',
                icon: <DoneIcon />
              },
              { 
                label: 'Overdue', 
                value: getFilteredAssignments().filter(a => a.status === 'overdue').length, 
                color: '#ef4444',
                icon: <WarningIcon />
              }
            ].map((stat, index) => (
              <Grid item xs={6} md={3} key={index}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: `${stat.color}10`,
                    border: `1px solid ${stat.color}20`,
                    textAlign: 'center',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      backgroundColor: `${stat.color}15`,
                      transform: 'translateY(-2px)',
                      boxShadow: `0 4px 12px ${stat.color}30`
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: '50%',
                        backgroundColor: stat.color,
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mr: 1
                      }}
                    >
                      {stat.icon}
                    </Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: stat.color }}>
                      {stat.value}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: '#6b7280', fontWeight: 500 }}>
                    {stat.label}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Status Tabs */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              {[
                { value: 'all', label: 'All Assignments', icon: <AssignmentIcon />, color: '#6366f1' },
                { value: 'pending', label: 'Pending', icon: <ScheduleIcon />, color: '#f59e0b' },
                { value: 'completed', label: 'Completed', icon: <DoneIcon />, color: '#10b981' },
                { value: 'overdue', label: 'Overdue', icon: <WarningIcon />, color: '#ef4444' },
                { value: 'cancelled', label: 'Cancelled', icon: <CancelIcon />, color: '#6b7280' }
              ].map((tab) => (
                <Button
                  key={tab.value}
                  onClick={() => setFilterStatus(tab.value)}
                  startIcon={tab.icon}
                  sx={{
                    minWidth: 120,
                    py: 2,
                    px: 3,
                    borderRadius: 0,
                    borderBottom: filterStatus === tab.value ? `3px solid ${tab.color}` : '3px solid transparent',
                    color: filterStatus === tab.value ? tab.color : '#6b7280',
                    backgroundColor: filterStatus === tab.value ? `${tab.color}10` : 'transparent',
                    fontWeight: filterStatus === tab.value ? 700 : 500,
                    textTransform: 'none',
                    fontSize: '0.875rem',
                    '&:hover': {
                      backgroundColor: `${tab.color}15`,
                      color: tab.color,
                    },
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  {tab.label}
                  {(() => {
                    let count = 0;
                    if (tab.value === 'all') {
                      count = getFilteredAssignments().length;
                    } else {
                      count = getFilteredAssignments().filter(a => a.status === tab.value).length;
                    }
                    
                    return count > 0 ? (
                      <Box
                        sx={{
                          ml: 1,
                          minWidth: 20,
                          height: 20,
                          borderRadius: '50%',
                          backgroundColor: tab.color,
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}
                      >
                        {count}
                      </Box>
                    ) : null;
                  })()}
                </Button>
              ))}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                label="Filter by Date"
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': {
                      borderColor: '#6366f1',
                    },
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Button
                variant="outlined"
                onClick={fetchAssignments}
                fullWidth
                sx={{ 
                  height: '56px',
                  borderColor: '#6366f1',
                  color: '#6366f1',
                  '&:hover': {
                    borderColor: '#4f46e5',
                    backgroundColor: '#6366f110',
                  }
                }}
              >
                Refresh Data
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Assignments Table */}
      <Card>
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            // Regular Assignments Table
            (() => {
              const filteredAssignments = getFilteredAssignments();
              const paginatedAssignments = getPaginatedAssignments();
              const totalPages = getTotalPages(filteredAssignments);
              
              return filteredAssignments.length === 0 ? (
                <Box sx={{ textAlign: 'center', p: 4 }}>
                  <AssignmentIcon sx={{ fontSize: 48, color: '#9ca3af', mb: 2 }} />
                  <Typography color="text.secondary" variant="h6">
                    No assignments found
                  </Typography>
              <Typography color="text.secondary">
                No assignments found for the selected filters
              </Typography>
            </Box>
          ) : (
                <>
            <TableContainer component={Paper} elevation={0}>
              <Table>
                <TableHead>
                  <TableRow>
                    {filterStatus === 'completed' && <TableCell><strong>Rank</strong></TableCell>}
                    <TableCell><strong>Worker</strong></TableCell>
                    <TableCell><strong>Assigned Date</strong></TableCell>
                    <TableCell><strong>Due Time</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>Completed At</strong></TableCell>
                    <TableCell><strong>Notes</strong></TableCell>
                    <TableCell align="center"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                        {paginatedAssignments.map((assignment) => {
                          // Get worker performance rank
                          const workerPerformance = calculateWorkerPerformance();
                          const workerRank = getWorkerRank(assignment.worker_id);
                          
                          return (
                    <TableRow key={assignment.id}>
                      {filterStatus === 'completed' && (
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {workerRank <= 3 ? (
                              <Box sx={{ 
                                width: 24, 
                                height: 24, 
                                borderRadius: '50%', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                color: 'white',
                                fontWeight: 'bold',
                                fontSize: '0.75rem',
                                backgroundColor: workerRank === 1 ? '#ffd700' : workerRank === 2 ? '#c0c0c0' : '#cd7f32'
                              }}>
                                {workerRank}
                              </Box>
                            ) : (
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#6b7280' }}>
                                #{workerRank}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                      )}
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {assignment.worker?.first_name} {assignment.worker?.last_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {assignment.worker?.email}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {new Date(assignment.assigned_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {assignment.due_time ? (
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {new Date(assignment.due_time).toLocaleDateString()}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(assignment.due_time).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            -
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getStatusIcon(assignment.status)}
                          label={assignment.status.toUpperCase()}
                          color={getStatusColor(assignment.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {assignment.completed_at
                          ? new Date(assignment.completed_at).toLocaleString()
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Tooltip title={assignment.notes || 'No notes'}>
                          <Typography
                            variant="body2"
                            sx={{
                              maxWidth: 200,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {assignment.notes || '-'}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="center">
                        {assignment.status === 'pending' && (
                          <Tooltip title="Cancel Assignment">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleCancelAssignment(assignment.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                          );
                        })}
                </TableBody>
              </Table>
            </TableContainer>
                  
                  {/* Pagination for Assignments */}
                  <PaginationComponent
                    currentPage={assignmentsPage}
                    totalPages={totalPages}
                    onPageChange={handleAssignmentsPageChange}
                    totalItems={filteredAssignments.length}
                    itemsPerPage={itemsPerPage}
                  />
                </>
              );
            })()
          )}
        </CardContent>
      </Card>


      {/* Create Assignment Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ 
          pb: 2, 
          borderBottom: '1px solid #e0e0e0',
          background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
          color: 'white',
          position: 'relative'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ 
              width: 48, 
              height: 48, 
              borderRadius: '12px', 
              bgcolor: 'rgba(255,255,255,0.2)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <AssignmentIcon sx={{ fontSize: 24, color: 'white' }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={700}>
                Create Work Readiness Assignment
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                Assign work readiness tasks to your team members
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers sx={{ p: 0 }}>
          <Box sx={{ p: 3 }}>
            {/* Progress Steps */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  px: 2, 
                  py: 1, 
                  bgcolor: '#e3f2fd', 
                  borderRadius: '20px',
                  border: '2px solid #1976d2'
                }}>
                  <Typography variant="body2" fontWeight={600} color="#1976d2">
                    Step 1 of 3: Basic Information
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Basic Information Section */}
            <Card sx={{ mb: 3, border: '1px solid #e0e0e0', borderRadius: '12px' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 3, color: '#1976d2' }}>
                  📅 Assignment Details
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Assignment Date"
                      type="date"
                      value={assignedDate}
                      onChange={(e) => setAssignedDate(e.target.value)}
                      fullWidth
                      required
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '8px',
                          '&:hover fieldset': {
                            borderColor: '#1976d2',
                          },
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ 
                      p: 2, 
                      bgcolor: '#f8f9fa', 
                      borderRadius: '8px',
                      border: '1px solid #e9ecef'
                    }}>
                      <Typography variant="body2" fontWeight={600} color="#6c757d" sx={{ mb: 1 }}>
                        ⏰ Deadline Information
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Deadline will be automatically set based on your current shift schedule
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 3 }}>
                  <TextField
                    label="Special Instructions (Optional)"
                    multiline
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    fullWidth
                    sx={{ 
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '8px',
                        '&:hover fieldset': {
                          borderColor: '#1976d2',
                        },
                      },
                    }}
                    placeholder="Add any special instructions for this assignment..."
                  />
                </Box>
              </CardContent>
            </Card>


            {/* Worker Selection Section */}
            <Card sx={{ mb: 3, border: '1px solid #e0e0e0', borderRadius: '12px' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" fontWeight={600} sx={{ color: '#1976d2' }}>
                    👥 Select Team Members
                  </Typography>
                  {(() => {
                    const availableMembers = getAvailableTeamMembers();
                    const allSelected = availableMembers.length > 0 && selectedWorkers.length === availableMembers.length;
                    
                    return availableMembers.length > 0 && (
                      <Button
                        variant={allSelected ? "contained" : "outlined"}
                        size="small"
                        onClick={() => {
                          if (allSelected) {
                            setSelectedWorkers([]);
                            setUnselectedWorkerReasons({});
                          } else {
                            setSelectedWorkers(availableMembers.map(member => member.id));
                          }
                        }}
                        sx={{
                          borderRadius: '20px',
                          textTransform: 'none',
                          fontWeight: 600,
                          px: 3,
                          py: 1,
                          ...(allSelected ? {
                            bgcolor: '#ef4444',
                            '&:hover': { bgcolor: '#dc2626' }
                          } : {
                            borderColor: '#1976d2',
                            color: '#1976d2',
                            '&:hover': {
                              borderColor: '#1565c0',
                              backgroundColor: '#e3f2fd'
                            }
                          })
                        }}
                      >
                        {allSelected ? 'Deselect All' : 'Select All Available'}
                      </Button>
                    );
                  })()}
                </Box>

                {/* Selection Summary */}
                <Box sx={{ 
                  mb: 3, 
                  p: 2, 
                  bgcolor: selectedWorkers.length > 0 ? '#e8f5e8' : '#fff3cd', 
                  borderRadius: '8px',
                  border: selectedWorkers.length > 0 ? '1px solid #28a745' : '1px solid #ffc107',
                  transition: 'all 0.3s ease'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {selectedWorkers.length > 0 ? (
                      <>
                        <CheckCircleIcon sx={{ color: '#28a745', fontSize: 20 }} />
                        <Typography variant="body2" fontWeight={600} color="#28a745">
                          {selectedWorkers.length} worker{selectedWorkers.length > 1 ? 's' : ''} selected for assignment
                        </Typography>
                      </>
                    ) : (
                      <>
                        <WarningIcon sx={{ color: '#ffc107', fontSize: 20 }} />
                        <Typography variant="body2" fontWeight={600} color="#856404">
                          Please select at least one team member to continue
                        </Typography>
                      </>
                    )}
                  </Box>
                </Box>

                {/* Available Workers List */}
                {(() => {
                  const availableMembers = getAvailableTeamMembers();
                  return availableMembers.length === 0 ? (
                    <Box sx={{ 
                      p: 3, 
                      textAlign: 'center', 
                      bgcolor: '#f8f9fa', 
                      borderRadius: '8px',
                      border: '1px solid #e9ecef'
                    }}>
                      <InfoIcon sx={{ fontSize: 48, color: '#6c757d', mb: 2 }} />
                      <Typography variant="h6" fontWeight={600} color="#6c757d" sx={{ mb: 1 }}>
                        No Available Workers
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {teamMembers.length === 0 
                          ? "No team members found. Please add workers to your team first."
                          : "All team members already have assignments for this date. They will appear again after completing their assignments."
                        }
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ 
                      maxHeight: 400, 
                      overflowY: 'auto',
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      p: 2,
                      bgcolor: '#fafafa'
                    }}>
                      <Grid container spacing={2}>
                        {availableMembers.map((member) => (
                          <Grid item xs={12} sm={6} md={4} key={member.id}>
                            <Box
                              sx={{
                                p: 2,
                                borderRadius: '8px',
                                bgcolor: selectedWorkers.includes(member.id) ? '#e3f2fd' : 'white',
                                border: selectedWorkers.includes(member.id) ? '2px solid #1976d2' : '1px solid #e0e0e0',
                                transition: 'all 0.2s ease',
                                cursor: 'pointer',
                                '&:hover': {
                                  border: '2px solid #1976d2',
                                  boxShadow: '0 2px 8px rgba(25, 118, 210, 0.15)',
                                }
                              }}
                              onClick={() => handleWorkerToggle(member.id)}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Checkbox
                                  checked={selectedWorkers.includes(member.id)}
                                  onChange={() => handleWorkerToggle(member.id)}
                                  sx={{
                                    color: '#1976d2',
                                    '&.Mui-checked': {
                                      color: '#1976d2',
                                    },
                                  }}
                                />
                                <Box
                                  sx={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: '50%',
                                    bgcolor: '#1976d2',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 700,
                                    fontSize: '0.875rem'
                                  }}
                                >
                                  {member.first_name?.[0]}{member.last_name?.[0]}
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" fontWeight={600}>
                                    {member.first_name} {member.last_name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {member.email}
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Unavailable Workers Section */}
            {(() => {
              // Get unavailable members using helper function
              const unavailableMembers = teamMembers.filter(member => isWorkerUnavailable(member));
              const availableMembers = getAvailableTeamMembers();
              const unselectedMembers = availableMembers.filter(member => !selectedWorkers.includes(member.id));
              
              return (
                <>
                  {/* Show unavailable workers with reasons */}
                  {unavailableMembers.length > 0 && (
                    <>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1, mt: 3, color: '#ef4444' }}>
                        ⚠️ Unavailable Workers
                      </Typography>
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        <Typography variant="body2">
                          <strong>Note:</strong> These workers cannot be assigned because they have pending assignments that are not yet due, completed assignments (until shift deadline passes), or unclosed cases. Workers with overdue assignments can be reassigned (KPI penalties apply).
                        </Typography>
                      </Alert>

                      <Box sx={{ 
                        maxHeight: 200, 
                        overflowY: 'auto',
                        border: '1px solid #ef4444',
                        borderRadius: 1,
                        p: 1,
                        bgcolor: '#fef2f2'
                      }}>
                        {unavailableMembers.map((member) => {
                          const now = new Date();
                          const pendingNotDue = assignments.some(assignment => {
                            if (assignment.worker_id !== member.id) return false;
                            if (assignment.status !== 'pending') return false;
                            
                            if (assignment.due_time) {
                              const dueDate = new Date(assignment.due_time);
                              return now < dueDate;
                            }
                            return true;
                          });

                          const completed = assignments.some(assignment => {
                            if (assignment.worker_id !== member.id) return false;
                            if (assignment.assigned_date !== assignedDate) return false;
                            if (assignment.status !== 'completed') return false;
                            
                            // Check if shift deadline has passed
                            if (assignment.due_time) {
                              const dueDate = new Date(assignment.due_time);
                              return now < dueDate; // Block if deadline hasn't passed
                            }
                            return true; // Block if no due time
                          });

                          const unselected = unselectedWorkers.some(unselected => 
                            unselected.worker_id === member.id &&
                            unselected.assignment_date === assignedDate &&
                            unselected.case_status !== 'closed'
                          );

                          // Find the specific pending assignment for details
                          const pendingAssignment = assignments.find(assignment => 
                            assignment.worker_id === member.id &&
                            assignment.status === 'pending' &&
                            (assignment.due_time ? now < new Date(assignment.due_time) : true)
                          );

                          let reason = '';
                          if (pendingNotDue) {
                            reason = `Has pending assignment from ${pendingAssignment?.assigned_date} (not yet due)`;
                          } else if (completed) {
                            reason = 'Already completed assignment';
                          } else if (unselected) {
                            reason = 'Has unclosed unselected case';
                          }

                          return (
                            <Box
                              key={`unavailable-${member.id}`}
                              sx={{
                                p: 1.5,
                                mb: 1,
                                borderRadius: 1,
                                bgcolor: 'white',
                                border: '1px solid #ef4444',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2
                              }}
                            >
                              <Box
                                sx={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: '50%',
                                  bgcolor: '#ef4444',
                                  color: 'white',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 700,
                                  fontSize: '0.75rem'
                                }}
                              >
                                {member.first_name?.[0]}{member.last_name?.[0]}
                              </Box>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" fontWeight={600}>
                                  {member.first_name} {member.last_name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {reason}
                                </Typography>
                              </Box>
                            </Box>
                          );
                        })}
                      </Box>
                    </>
                  )}

                  {/* Completed Workers Section - Show workers who have already completed assignments */}
                  {(() => {
                    const completedMembers = teamMembers.filter(member => {
                      // Check if worker has completed assignment on the same date
                      return assignments.some(assignment => {
                        if (assignment.worker_id !== member.id) return false;
                        if (assignment.assigned_date !== assignedDate) return false;
                        return assignment.status === 'completed';
                      });
                    });

                    return completedMembers.length > 0 && (
                      <>
                        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1, mt: 3, color: '#10b981' }}>
                          ✅ Workers with Completed Assignments (Unavailable)
                        </Typography>
                        <Alert severity="success" sx={{ mb: 2 }}>
                          <Typography variant="body2">
                            <strong>Note:</strong> These workers have already completed their work readiness assignment for today. Duplicate assignments are not allowed on the same date.
                          </Typography>
                        </Alert>

                        <Box sx={{ 
                          maxHeight: 200, 
                          overflowY: 'auto',
                          border: '1px solid #10b981',
                          borderRadius: 1,
                          p: 1,
                          bgcolor: '#f0fdf4'
                        }}>
                          {completedMembers.map((member) => {
                            const completedAssignment = assignments.find(assignment => 
                              assignment.worker_id === member.id &&
                              assignment.assigned_date === assignedDate &&
                              assignment.status === 'completed'
                            );

                            return (
                              <Box
                                key={`completed-${member.id}`}
                                sx={{
                                  p: 1.5,
                                  mb: 1,
                                  borderRadius: 1,
                                  bgcolor: 'white',
                                  border: '1px solid #10b981',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 2
                                }}
                              >
                                <Box
                                  sx={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    bgcolor: '#10b981',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 700,
                                    fontSize: '0.75rem'
                                  }}
                                >
                                  {member.first_name?.[0]}{member.last_name?.[0]}
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" fontWeight={600}>
                                    {member.first_name} {member.last_name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Completed assignment on {completedAssignment?.assigned_date} - No duplicates allowed
                                  </Typography>
                                </Box>
                              </Box>
                            );
                          })}
                        </Box>
                      </>
                    );
                  })()}

                </>
              );
            })()}
          </Box>
        </DialogContent>
        <DialogActions sx={{ 
          px: 4, 
          py: 3, 
          bgcolor: '#f8f9fa',
          borderTop: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {selectedWorkers.length} worker{selectedWorkers.length !== 1 ? 's' : ''} selected
            </Typography>
            {selectedWorkers.length > 0 && (
              <Chip 
                label="Ready to create" 
                color="success" 
                size="small" 
                icon={<CheckCircleIcon />}
              />
            )}
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button 
              onClick={() => {
                setOpenDialog(false);
                resetForm();
              }} 
              variant="outlined"
              sx={{
                px: 3,
                py: 1.5,
                fontWeight: 600,
                borderRadius: '8px',
                borderColor: '#6c757d',
                color: '#6c757d',
                '&:hover': {
                  borderColor: '#495057',
                  backgroundColor: '#e9ecef'
                }
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateAssignments}
              variant="contained"
              disabled={loading || selectedWorkers.length === 0}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AssignmentIcon />}
              sx={{
                px: 4,
                py: 1.5,
                fontWeight: 600,
                borderRadius: '8px',
                bgcolor: '#28a745',
                '&:hover': {
                  bgcolor: '#218838'
                },
                '&:disabled': {
                  bgcolor: '#e0e0e0',
                  color: '#9e9e9e'
                }
              }}
            >
              {loading ? 'Creating...' : 'Create Assignment'}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        open={showConfirmationDialog}
        onClose={() => setShowConfirmationDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1, 
          bgcolor: '#f59e0b', 
          color: 'white',
          fontWeight: 600
        }}>
          <CheckCircleIcon />
          Confirm Assignment Creation
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Typography variant="body1" sx={{ mb: 2, fontWeight: 600 }}>
            Are you sure you want to create work readiness assignments?
          </Typography>
          
          <Box sx={{ 
            p: 2, 
            bgcolor: '#f8fafc', 
            borderRadius: 1, 
            border: '1px solid #e2e8f0',
            mb: 2
          }}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: '#1976d2' }}>
              📋 Assignment Details:
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>Date:</strong> {new Date(assignedDate).toLocaleDateString()}
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>Due Time:</strong> {currentShift 
                ? `End of ${currentShift.shift_name} (${currentShift.end_time})`
                : 'Based on your shift schedule (will be calculated automatically)'
              }
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>Selected Workers:</strong> {selectedWorkers.length} worker(s)
            </Typography>
            <Typography variant="body2">
              <strong>Unselected Workers:</strong> {Object.keys(unselectedWorkerReasons).length} worker(s) with reasons
            </Typography>
          </Box>

          {notes && (
            <Box sx={{ 
              p: 2, 
              bgcolor: '#f0f9ff', 
              borderRadius: 1, 
              border: '1px solid #bae6fd',
              mb: 2
            }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#0369a1', mb: 1 }}>
                📝 Notes:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {notes}
              </Typography>
            </Box>
          )}

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              This action will create assignments for selected workers and record reasons for unselected workers. 
              {currentShift 
                ? ` The deadline will be set to the end of your ${currentShift.shift_name} (${currentShift.end_time}).`
                : ' The deadline will be automatically calculated based on your current shift schedule.'
              } This cannot be undone.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1, display: 'flex', justifyContent: 'space-between' }}>
          <Button 
            onClick={handlePrintAssignment}
            variant="outlined"
            startIcon={<PrintIcon />}
            sx={{
              borderColor: '#1976d2',
              color: '#1976d2',
              fontWeight: 600,
              '&:hover': {
                borderColor: '#1565c0',
                backgroundColor: '#e3f2fd'
              }
            }}
          >
            Print
          </Button>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              onClick={() => setShowConfirmationDialog(false)} 
              color="inherit"
              sx={{ fontWeight: 600 }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmCreateAssignments}
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CheckCircleIcon />}
              sx={{
                bgcolor: '#10b981',
                '&:hover': { bgcolor: '#059669' },
                fontWeight: 600
              }}
            >
              {loading ? 'Creating...' : 'Confirm & Create'}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Success Dialog */}
      <Dialog
        open={showSuccessDialog}
        onClose={() => setShowSuccessDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1, 
          bgcolor: '#10b981', 
          color: 'white',
          fontWeight: 600
        }}>
          <CheckCircleIcon />
          Assignment Created Successfully!
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            mb: 3
          }}>
            <Box sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              bgcolor: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'pulse 2s infinite'
            }}>
              <CheckCircleIcon sx={{ fontSize: 40, color: 'white' }} />
            </Box>
          </Box>
          
          <Typography variant="h6" align="center" sx={{ mb: 2, fontWeight: 600, color: '#10b981' }}>
            🎉 Work Readiness Assignments Created!
          </Typography>
          
          <Box sx={{ 
            p: 2, 
            bgcolor: '#f0fdf4', 
            borderRadius: 1, 
            border: '1px solid #10b981',
            mb: 2
          }}>
            <Typography variant="body1" align="center" sx={{ fontWeight: 600, color: '#065f46' }}>
              {successMessage}
            </Typography>
          </Box>

          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Next Steps:</strong>
            </Typography>
            <Typography variant="body2" component="div">
              • Selected workers will receive their assignments<br/>
              • Unselected workers' reasons have been recorded<br/>
              • You can view all assignments in the main table
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1, justifyContent: 'center' }}>
          <Button
            onClick={() => setShowSuccessDialog(false)}
            variant="contained"
            size="large"
            sx={{
              bgcolor: '#10b981',
              '&:hover': { bgcolor: '#059669' },
              fontWeight: 600,
              px: 4
            }}
          >
            Got it!
          </Button>
        </DialogActions>
      </Dialog>

      {/* Completed Worker Dialog */}
      <Dialog
        open={showCompletedWorkerDialog}
        onClose={() => setShowCompletedWorkerDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1, 
          bgcolor: '#f59e0b', 
          color: 'white',
          fontWeight: 600
        }}>
          <WarningIcon />
          Cannot Assign Completed Workers
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            mb: 3
          }}>
            <Box sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              bgcolor: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'pulse 2s infinite'
            }}>
              <WarningIcon sx={{ fontSize: 40, color: 'white' }} />
            </Box>
          </Box>
          
          <Typography variant="h6" align="center" sx={{ mb: 2, fontWeight: 600, color: '#f59e0b' }}>
            ⚠️ Assignment Not Allowed
          </Typography>
          
          <Box sx={{ 
            p: 2, 
            bgcolor: '#fffbeb', 
            borderRadius: 1, 
            border: '1px solid #f59e0b',
            mb: 2
          }}>
            <Typography variant="body1" sx={{ fontWeight: 600, color: '#92400e', whiteSpace: 'pre-line' }}>
              {completedWorkerMessage}
            </Typography>
          </Box>

          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Why this happens:</strong>
            </Typography>
            <Typography variant="body2" component="div">
              • Workers who have already completed their work readiness assessment for the day cannot be assigned again<br/>
              • This prevents duplicate submissions and ensures data integrity<br/>
              • Try selecting different workers or choose a different date
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1, justifyContent: 'center' }}>
          <Button
            onClick={() => setShowCompletedWorkerDialog(false)}
            variant="contained"
            size="large"
            sx={{
              bgcolor: '#f59e0b',
              '&:hover': { bgcolor: '#d97706' },
              fontWeight: 600,
              px: 4
            }}
          >
            Understood
          </Button>
        </DialogActions>
      </Dialog>

      {/* Password Validation Dialog */}
      <Dialog
        open={passwordDialog}
        onClose={() => {
          setPasswordDialog(false);
          setPasswordInput('');
          setPasswordError('');
          setAssignmentToCancel(null);
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 2, 
          bgcolor: '#3b82f6', 
          color: 'white',
          fontWeight: 600,
          p: 3
        }}>
          <Box sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <InfoIcon sx={{ fontSize: 24 }} />
          </Box>
          Password Verification Required
        </DialogTitle>
        
        <DialogContent sx={{ p: 4 }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            mb: 3
          }}>
            <Box sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              bgcolor: '#dbeafe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '3px solid #3b82f6'
            }}>
              <InfoIcon sx={{ fontSize: 40, color: '#3b82f6' }} />
            </Box>
          </Box>
          
          <Typography variant="h5" align="center" sx={{ mb: 2, fontWeight: 700, color: '#1e40af' }}>
            Verify Your Identity
          </Typography>
          
          <Typography variant="body1" align="center" sx={{ mb: 3, color: '#64748b' }}>
            To cancel this assignment, please enter your password to confirm your identity.
          </Typography>

          {assignmentToCancel && (
            <Box sx={{ 
              p: 3, 
              bgcolor: '#f8fafc', 
              borderRadius: 2, 
              border: '1px solid #e2e8f0',
              mb: 3
            }}>
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#374151', mb: 1 }}>
                Assignment Details:
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                  <strong>Worker:</strong> {assignmentToCancel.workerName}
                </Typography>
                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                  <strong>Assigned Date:</strong> {new Date(assignmentToCancel.assignedDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Typography>
              </Box>
            </Box>
          )}

          <TextField
            fullWidth
            type="password"
            label="Enter your password"
            value={passwordInput}
            onChange={(e) => {
              setPasswordInput(e.target.value);
              setPasswordError('');
            }}
            error={!!passwordError}
            helperText={passwordError}
            disabled={validatingPassword}
            sx={{
              '& .MuiOutlinedInput-root': {
                '&:hover fieldset': {
                  borderColor: '#3b82f6',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#3b82f6',
                }
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: '#3b82f6'
              }
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handlePasswordSubmit();
              }
            }}
          />

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              🔒 Your password is required for security purposes to prevent unauthorized assignment cancellations.
            </Typography>
          </Alert>
        </DialogContent>
        
        <DialogActions sx={{ 
          p: 3, 
          pt: 1, 
          justifyContent: 'space-between',
          bgcolor: '#fafafa'
        }}>
          <Button
            onClick={() => {
              setPasswordDialog(false);
              setPasswordInput('');
              setPasswordError('');
              setAssignmentToCancel(null);
            }}
            variant="outlined"
            size="large"
            sx={{
              borderColor: '#6b7280',
              color: '#6b7280',
              '&:hover': {
                borderColor: '#4b5563',
                bgcolor: '#f9fafb'
              },
              fontWeight: 600,
              px: 4,
              py: 1.5
            }}
          >
            Cancel
          </Button>
          
          <Button
            onClick={handlePasswordSubmit}
            variant="contained"
            size="large"
            disabled={validatingPassword || !passwordInput.trim()}
            startIcon={validatingPassword ? <CircularProgress size={20} color="inherit" /> : <InfoIcon />}
            sx={{
              bgcolor: '#3b82f6',
              '&:hover': { 
                bgcolor: '#2563eb',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)'
              },
              fontWeight: 600,
              px: 4,
              py: 1.5,
              transition: 'all 0.2s ease-in-out'
            }}
          >
            {validatingPassword ? 'Verifying...' : 'Verify Password'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Assignment Confirmation Dialog */}
      <Dialog
        open={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 2, 
          bgcolor: '#ef4444', 
          color: 'white',
          fontWeight: 600,
          p: 3
        }}>
          <Box sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <WarningIcon sx={{ fontSize: 24 }} />
          </Box>
          Cancel Assignment
        </DialogTitle>
        
        <DialogContent sx={{ p: 4 }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            mb: 3
          }}>
            <Box sx={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              bgcolor: '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '3px solid #ef4444',
              animation: 'pulse 2s infinite'
            }}>
              <WarningIcon sx={{ fontSize: 50, color: '#ef4444' }} />
            </Box>
          </Box>
          
          <Typography variant="h5" align="center" sx={{ mb: 2, fontWeight: 700, color: '#ef4444' }}>
            Are you sure you want to cancel this assignment?
          </Typography>
          
          {assignmentToCancel && (
            <Box sx={{ 
              p: 3, 
              bgcolor: '#fef2f2', 
              borderRadius: 2, 
              border: '1px solid #fecaca',
              mb: 3
            }}>
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#991b1b', mb: 1 }}>
                Assignment Details:
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2" sx={{ color: '#7f1d1d' }}>
                  <strong>Worker:</strong> {assignmentToCancel.workerName}
                </Typography>
                <Typography variant="body2" sx={{ color: '#7f1d1d' }}>
                  <strong>Assigned Date:</strong> {new Date(assignmentToCancel.assignedDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Typography>
              </Box>
            </Box>
          )}

          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              ⚠️ This action cannot be undone!
            </Typography>
            <Typography variant="body2" component="div" sx={{ mt: 1 }}>
              • The assignment will be marked as cancelled<br/>
              • The worker will no longer be able to complete this assessment<br/>
              • This will affect the team's compliance rate<br/>
              • You can create a new assignment if needed
            </Typography>
          </Alert>

          <Box sx={{ 
            p: 2, 
            bgcolor: '#f0f9ff', 
            borderRadius: 1, 
            border: '1px solid #0ea5e9'
          }}>
            <Typography variant="body2" sx={{ color: '#0c4a6e', fontWeight: 500 }}>
              💡 <strong>Tip:</strong> Consider if the worker can still complete the assessment before cancelling.
            </Typography>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ 
          p: 3, 
          pt: 1, 
          justifyContent: 'space-between',
          bgcolor: '#fafafa'
        }}>
          <Button
            onClick={() => setShowCancelDialog(false)}
            variant="outlined"
            size="large"
            sx={{
              borderColor: '#6b7280',
              color: '#6b7280',
              '&:hover': {
                borderColor: '#4b5563',
                bgcolor: '#f9fafb'
              },
              fontWeight: 600,
              px: 4,
              py: 1.5
            }}
          >
            Keep Assignment
          </Button>
          
          <Button
            onClick={confirmCancelAssignment}
            variant="contained"
            size="large"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <WarningIcon />}
            sx={{
              bgcolor: '#ef4444',
              '&:hover': { 
                bgcolor: '#dc2626',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)'
              },
              fontWeight: 600,
              px: 4,
              py: 1.5,
              transition: 'all 0.2s ease-in-out'
            }}
          >
            {loading ? 'Cancelling...' : 'Yes, Cancel Assignment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Overdue Confirmation Dialog */}
      <Dialog
        open={showOverdueConfirmDialog}
        onClose={() => setShowOverdueConfirmDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ 
          bgcolor: '#fef3c7', 
          color: '#92400e',
          fontWeight: 600,
          borderBottom: '1px solid #fbbf24'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ScheduleIcon />
            Confirm Overdue Marking
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          <Typography variant="body1" sx={{ mb: 2, color: '#374151' }}>
            Are you sure you want to mark assignments as overdue?
          </Typography>
          
          <Box sx={{ 
            bgcolor: '#fef3c7', 
            p: 2, 
            borderRadius: 2, 
            border: '1px solid #fbbf24',
            mb: 2
          }}>
            <Typography variant="body2" sx={{ color: '#92400e', fontWeight: 500 }}>
              ⚠️ <strong>Important:</strong> This action will mark all assignments past their due time as overdue.
            </Typography>
          </Box>
          
          <Typography variant="body2" sx={{ color: '#6b7280' }}>
            💡 <strong>Note:</strong> Overdue assignments cannot be completed later and will affect worker performance records.
          </Typography>
        </DialogContent>
        
        <DialogActions sx={{ 
          p: 3, 
          pt: 1, 
          justifyContent: 'space-between',
          bgcolor: '#fafafa'
        }}>
          <Button
            onClick={() => setShowOverdueConfirmDialog(false)}
            variant="outlined"
            size="large"
            sx={{
              borderColor: '#6b7280',
              color: '#6b7280',
              '&:hover': {
                borderColor: '#4b5563',
                bgcolor: '#f9fafb'
              },
              fontWeight: 600,
              px: 4,
              py: 1.5
            }}
          >
            Cancel
          </Button>
          
          <Button
            onClick={confirmMarkOverdue}
            variant="contained"
            size="large"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <ScheduleIcon />}
            sx={{
              bgcolor: '#f59e0b',
              '&:hover': { 
                bgcolor: '#d97706',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)'
              },
              fontWeight: 600,
              px: 4,
              py: 1.5,
              transition: 'all 0.2s ease-in-out'
            }}
          >
            {loading ? 'Marking...' : 'Yes, Mark as Overdue'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Overdue Blocking Dialog */}
      <Dialog
        open={showOverdueBlockingDialog}
        onClose={() => setShowOverdueBlockingDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: '#fef2f2', 
          color: '#991b1b',
          fontWeight: 600,
          borderBottom: '1px solid #fecaca',
          p: 3
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              bgcolor: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <WarningIcon sx={{ fontSize: 24, color: 'white' }} />
            </Box>
            Cannot Create Assignment
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ p: 4 }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            mb: 3
          }}>
            <Box sx={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              bgcolor: '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '3px solid #ef4444',
              animation: 'pulse 2s infinite'
            }}>
              <WarningIcon sx={{ fontSize: 50, color: '#ef4444' }} />
            </Box>
          </Box>
          
          <Typography variant="h5" align="center" sx={{ mb: 3, fontWeight: 700, color: '#991b1b' }}>
            ⚠️ Assignment Blocked
          </Typography>
          
          <Box sx={{ 
            p: 3, 
            bgcolor: '#fef2f2', 
            borderRadius: 2, 
            border: '1px solid #fecaca',
            mb: 3
          }}>
            <Typography variant="body1" sx={{ fontWeight: 600, color: '#991b1b', whiteSpace: 'pre-line', textAlign: 'center' }}>
              {overdueBlockingMessage}
            </Typography>
          </Box>

          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Why this happens:
            </Typography>
            <Typography variant="body2" component="div" sx={{ mt: 1 }}>
              • Workers with overdue assignments cannot receive new assignments<br/>
              • This prevents assignment conflicts and ensures proper workflow<br/>
              • Workers become available again when the next shift starts<br/>
              • Consider marking overdue assignments first if needed
            </Typography>
          </Alert>

          <Box sx={{ 
            p: 2, 
            bgcolor: '#f0f9ff', 
            borderRadius: 1, 
            border: '1px solid #0ea5e9'
          }}>
            <Typography variant="body2" sx={{ color: '#0c4a6e', fontWeight: 500 }}>
              💡 <strong>Tip:</strong> Use the "Mark Overdue" button to mark pending assignments as overdue, then create new assignments for the next day.
            </Typography>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ 
          p: 3, 
          pt: 1, 
          justifyContent: 'center',
          bgcolor: '#fafafa'
        }}>
          <Button
            onClick={() => setShowOverdueBlockingDialog(false)}
            variant="contained"
            size="large"
            sx={{
              bgcolor: '#6b7280',
              '&:hover': { 
                bgcolor: '#4b5563',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 12px rgba(107, 114, 128, 0.4)'
              },
              fontWeight: 600,
              px: 4,
              py: 1.5,
              transition: 'all 0.2s ease-in-out'
            }}
          >
            Understood
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkReadinessAssignmentManager;
