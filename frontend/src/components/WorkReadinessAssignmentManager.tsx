import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Refresh as RefreshIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { SupabaseAPI } from '../utils/supabaseApi';
import { BackendAssignmentAPI } from '../utils/backendAssignmentApi';
import { authClient } from '../lib/supabase';

// Constants
const PHT_OFFSET_MINUTES = 8 * 60;
const ITEMS_PER_PAGE = 10;
const SUCCESS_MESSAGE_DURATION = 5000;

// Utility functions
const getTodayPHT = (): string => {
  const now = new Date();
  const phtTime = new Date(now.getTime() + (PHT_OFFSET_MINUTES * 60 * 1000));
  return phtTime.toISOString().split('T')[0];
};

const formatWorkerName = (worker?: { first_name?: string; last_name?: string }): string => {
  if (!worker?.first_name || !worker?.last_name) return 'Unknown Worker';
  return `${worker.first_name} ${worker.last_name}`;
};

const getInitials = (firstName?: string, lastName?: string): string => {
  const first = firstName?.[0] || '';
  const last = lastName?.[0] || '';
  return `${first}${last}`.toUpperCase();
};

// Types
type AssignmentStatus = 'pending' | 'completed' | 'overdue' | 'cancelled';
type UnselectedReason = 'sick' | 'on_leave_rdo' | 'transferred' | 'injured_medical' | 'not_rostered';
type CaseStatus = 'open' | 'in_progress' | 'closed';

interface Worker {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Assignment {
  id: string;
  worker_id: string;
  assigned_date: string;
  due_time: string;
  status: AssignmentStatus;
  notes?: string;
  worker?: Worker;
  work_readiness?: {
    readiness_level?: number;
    fatigue_level?: number;
  };
  completed_at?: string;
}

interface TeamMember extends Worker {
  team: string;
}

interface UnselectedWorker {
  id: string;
  worker_id: string;
  assignment_date: string;
  reason: UnselectedReason;
  notes?: string;
  case_status?: CaseStatus;
  worker?: Worker;
}

interface ShiftInfo {
  shift_name: string;
  start_time: string;
  end_time: string;
  color: string;
}

interface AssignmentToCancel {
  id: string;
  workerName: string;
  assignedDate: string;
}

interface UnselectedWorkerReason {
  reason: string;
  notes: string;
}

interface WorkReadinessAssignmentManagerProps {
  teamLeaderId: string;
  team: string;
}

const WorkReadinessAssignmentManager: React.FC<WorkReadinessAssignmentManagerProps> = ({
  teamLeaderId,
  team
}) => {
  // Core data state
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [unselectedWorkers, setUnselectedWorkers] = useState<UnselectedWorker[]>([]);
  const [currentShift, setCurrentShift] = useState<ShiftInfo | null>(null);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Assignment creation state
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [unselectedWorkerReasons, setUnselectedWorkerReasons] = useState<Record<string, UnselectedWorkerReason>>({});
  const [assignedDate, setAssignedDate] = useState(getTodayPHT);
  const [notes, setNotes] = useState('');
  
  // Dialog states
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showCompletedWorkerDialog, setShowCompletedWorkerDialog] = useState(false);
  const [completedWorkerMessage, setCompletedWorkerMessage] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [assignmentToCancel, setAssignmentToCancel] = useState<AssignmentToCancel | null>(null);
  const [showOverdueConfirmDialog, setShowOverdueConfirmDialog] = useState(false);
  const [showOverdueBlockingDialog, setShowOverdueBlockingDialog] = useState(false);
  const [overdueBlockingMessage, setOverdueBlockingMessage] = useState('');
  const [overdueBlockingDetails, setOverdueBlockingDetails] = useState<any>(null);
  
  // Password validation state
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [validatingPassword, setValidatingPassword] = useState(false);
  
  // Filter and pagination state
  const [filterDate, setFilterDate] = useState(getTodayPHT);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [assignmentsPage, setAssignmentsPage] = useState(1);
  const [unselectedPage, setUnselectedPage] = useState(1);

  // Constants
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

  // Memoized auth token getter with refresh handling
  const getAuthToken = useCallback(async (): Promise<string | null> => {
    try {
      const { data: { session }, error } = await authClient.auth.getSession();
      
      if (error || !session) {
        // Try to refresh the session
        const { data: refreshData, error: refreshError } = await authClient.auth.refreshSession();
        
        if (refreshError || !refreshData.session) {
          setError('Session expired. Please login again.');
          return null;
        }
        
        return refreshData.session.access_token;
      }
      
      return session.access_token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      setError('Failed to authenticate. Please refresh the page.');
      return null;
    }
  }, []);

  // Optimized API functions with useCallback
  const fetchCurrentShift = useCallback(async (): Promise<void> => {
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
  }, [teamLeaderId, API_BASE_URL, getAuthToken]);

  const fetchTeamMembers = useCallback(async (): Promise<void> => {
    try {
      const { teamMembers: members } = await SupabaseAPI.getTeamMembers(teamLeaderId, team);
      setTeamMembers(members || []);
    } catch (err) {
      console.error('Error fetching team members:', err);
      setError('Failed to load team members');
    }
  }, [teamLeaderId, team]);

  const fetchAssignments = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await BackendAssignmentAPI.getAssignments();
      
      const assignments = response.assignments || [];
      setAssignments(assignments);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching assignments:', err);
      setError(err.message || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUnselectedWorkers = useCallback(async (): Promise<void> => {
    try {
      // Load OPEN incidents/cases from Incident Management (unselected_workers with case_status = 'open')
      const supabaseApi = new SupabaseAPI();
      const result = await supabaseApi.getUnselectedWorkerReasons(teamLeaderId, {
        limit: 100,
        offset: 0,
        includeCount: false
      });

      if ((result as any)?.success && (result as any)?.data) {
        setUnselectedWorkers(((result as any).data || []) as UnselectedWorker[]);
      } else if ((result as any)?.unselectedWorkers) {
        // Fallback shape if backend returns old shape
        setUnselectedWorkers((result as any).unselectedWorkers || []);
      } else {
        setUnselectedWorkers([]);
      }
    } catch (err: any) {
      console.error('Error fetching open incidents/unselected workers:', err);
      setUnselectedWorkers([]);
    }
  }, [teamLeaderId]);

  // Effects
  useEffect(() => {
    fetchTeamMembers();
    fetchAssignments();
    fetchUnselectedWorkers();
    fetchCurrentShift();
  }, [fetchTeamMembers, fetchAssignments, fetchUnselectedWorkers, fetchCurrentShift]);

  useEffect(() => {
    setAssignmentsPage(1);
    setUnselectedPage(1);
  }, [filterDate, filterStatus]);

  // Memoized helper function to check if a worker is unavailable
  const isWorkerUnavailable = useCallback((member: TeamMember): boolean => {
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

    // Check if worker has ANY unclosed unselected case (regardless of date)
    // Worker must close their case before they can be assigned again
    const unselected = unselectedWorkers.some(unselected => 
      unselected.worker_id === member.id &&
        unselected.case_status !== 'closed'  // ✅ Removed date check - blocks on ANY unclosed case
    );

    // Check if worker has overdue assignment on the same date
    // Overdue workers are blocked until next shift cycle starts
    const overdue = assignments.some(assignment => {
      if (assignment.worker_id !== member.id) return false;
      if (assignment.assigned_date !== assignedDate) return false;
      if (assignment.status !== 'overdue') return false;
      
      // If assignment is overdue, check if enough time has passed (next shift started)
      if (currentShift && assignment.due_time) {
        const dueTime = new Date(assignment.due_time);
        const now = new Date();
        
        // Calculate hours since the assignment became overdue
        const hoursPastDue = (now.getTime() - dueTime.getTime()) / (1000 * 60 * 60);
        
        // Block for 8 hours after overdue (assumes next shift after 8 hours)
        // This allows time for shift transition
        return hoursPastDue < 8;
      }
      
      return true; // Block if no shift info available
    });

    return pendingNotDue || completed || unselected || overdue;
  }, [assignments, assignedDate, unselectedWorkers, currentShift]);

  // Memoized available team members
  const availableTeamMembers = useMemo(() => {
    return teamMembers.filter(member => 
      !isWorkerUnavailable(member) &&
      !selectedWorkers.includes(member.id)
    );
  }, [teamMembers, isWorkerUnavailable, selectedWorkers]);

  // Memoized filtered assignments
  const filteredAssignments = useMemo(() => {
    let filtered = assignments;
    
    if (filterDate) {
      filtered = filtered.filter(assignment => assignment.assigned_date === filterDate);
    }
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(assignment => assignment.status === filterStatus);
    }
    
    return filtered;
  }, [assignments, filterDate, filterStatus]);

  // Memoized filtered unselected workers
  const filteredUnselectedWorkers = useMemo(() => {
    let filtered = unselectedWorkers;
    
    if (filterDate) {
      filtered = filtered.filter(unselected => unselected.assignment_date === filterDate);
    }
    
    return filtered;
  }, [unselectedWorkers, filterDate]);

  // Memoized paginated assignments
  const paginatedAssignments = useMemo(() => {
    let filtered = filteredAssignments;
    
    // Only sort by performance rank when viewing completed assignments
    if (filterStatus === 'completed') {
      filtered = [...filtered].sort((a, b) => {
        const rankA = getWorkerRank(a.worker_id);
        const rankB = getWorkerRank(b.worker_id);
        return rankA - rankB; // Lower rank number = better performance = appears first
      });
    }
    
    const startIndex = (assignmentsPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filtered.slice(startIndex, endIndex);
  }, [filteredAssignments, filterStatus, assignmentsPage]);

  // Memoized paginated unselected workers
  const paginatedUnselectedWorkers = useMemo(() => {
    const filtered = filteredUnselectedWorkers.filter(w => w.case_status !== 'closed');
    const startIndex = (unselectedPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filtered.slice(startIndex, endIndex);
  }, [filteredUnselectedWorkers, unselectedPage]);

  // Memoized total pages calculations
  const totalAssignmentPages = useMemo(() => 
    Math.ceil(filteredAssignments.length / ITEMS_PER_PAGE), 
    [filteredAssignments.length]
  );
  
  const totalUnselectedPages = useMemo(() => 
    Math.ceil(filteredUnselectedWorkers.filter(w => w.case_status !== 'closed').length / ITEMS_PER_PAGE), 
    [filteredUnselectedWorkers]
  );

  // Optimized event handlers
  const handleAssignmentsPageChange = useCallback((newPage: number) => {
    setAssignmentsPage(newPage);
  }, []);

  const handleUnselectedPageChange = useCallback((newPage: number) => {
    setUnselectedPage(newPage);
  }, []);

  const PaginationComponent = ({ 
    currentPage, 
    totalPages, 
    onPageChange, 
    totalItems, 
    ITEMS_PER_PAGE 
  }: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalItems: number;
    ITEMS_PER_PAGE: number;
  }) => {
    if (totalPages <= 1) return null;

    const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

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
    late: number; // Track late submissions (completed after due_time)
    pending: number; // Track pending assignments
    overdue: number; // Track overdue assignments
    avgReadiness: number;
    avgFatigue: number;
    performanceRating: string;
    score: number;
  }

  // Memoized worker performance calculation - FIXED for accurate KPI
  const calculateWorkerPerformance = useCallback((): WorkerPerformanceData[] => {
    const workerMap = new Map<string, WorkerPerformanceData>();

    // Use ALL assignments for consistent KPI (not filtered by date)
    assignments.forEach(assignment => {
      const workerId = assignment.worker_id;
      
      // Initialize worker if not exists
      if (!workerMap.has(workerId)) {
        const worker = teamMembers.find(m => m.id === workerId);
        
        // Use worker data from assignment if team member not found - null safety
        const workerName = worker 
          ? `${worker.first_name} ${worker.last_name}` 
          : (assignment.worker?.first_name && assignment.worker?.last_name) 
            ? `${assignment.worker.first_name} ${assignment.worker.last_name}` 
            : `Worker ${workerId}`;
        const workerEmail = worker?.email || assignment.worker?.email || 'No email';
        
        workerMap.set(workerId, {
          id: workerId,
          name: workerName,
          email: workerEmail,
          assignments: 0,
          completed: 0,
          onTime: 0,
          late: 0, // Track late submissions (completed after due_time)
          pending: 0, // Track pending assignments
          overdue: 0, // Track overdue assignments
          avgReadiness: 0,
          avgFatigue: 0,
          performanceRating: 'No Data',
          score: 0
        });
      }

      const workerData = workerMap.get(workerId)!;
      workerData.assignments++;
      
      // Process COMPLETED assignments
        if (assignment.status === 'completed') {
        workerData.completed++;
        
        // FIXED: Check against actual due_time (not 24 hours)
        // Track on-time vs late submissions
        if (assignment.due_time && assignment.completed_at) {
          const dueDate = new Date(assignment.due_time);
          const completedDate = new Date(assignment.completed_at);
          const isOnTime = completedDate <= dueDate;
          
          if (isOnTime) {
            workerData.onTime++;
          } else {
            // Late submission: completed after due_time
            workerData.late++;
          }
        }

        // Add readiness data - FIXED: Normalize to 0-100 scale
          if (assignment.work_readiness?.readiness_level) {
          let readinessLevel = typeof assignment.work_readiness.readiness_level === 'string' 
              ? parseFloat(assignment.work_readiness.readiness_level)
              : assignment.work_readiness.readiness_level;
          
            if (!isNaN(readinessLevel)) {
            // Normalize if 1-10 scale (convert to 0-100)
            if (readinessLevel <= 10) {
              readinessLevel = readinessLevel * 10;
            }
            workerData.avgReadiness = (workerData.avgReadiness * (workerData.completed - 1) + readinessLevel) / workerData.completed;
          }
        }
        
          if (assignment.work_readiness?.fatigue_level) {
            const fatigueLevel = typeof assignment.work_readiness.fatigue_level === 'string'
              ? parseFloat(assignment.work_readiness.fatigue_level)
              : assignment.work_readiness.fatigue_level;
            if (!isNaN(fatigueLevel)) {
            workerData.avgFatigue = (workerData.avgFatigue * (workerData.completed - 1) + fatigueLevel) / workerData.completed;
          }
        }
      }
      
      // Process PENDING assignments
      if (assignment.status === 'pending') {
        workerData.pending++;
      }
      
      // Process OVERDUE assignments
      if (assignment.status === 'overdue') {
        workerData.overdue++;
      }
    });

    // Calculate performance ratings and scores - FULLY ALIGNED WITH BACKEND INDIVIDUAL WORKER KPI
    workerMap.forEach(worker => {
      if (worker.assignments > 0) {
        // Completion rate: completed / total assignments
        const completionRate = (worker.completed / worker.assignments) * 100;
        
        // On-time rate: on time / total assignments
        let onTimeRate = (worker.onTime / worker.assignments) * 100;
        
        // Quality score: readiness level (already normalized to 0-100)
        let qualityScore = worker.avgReadiness || 0;
        
        // ⚠️ APPLY LATE SUBMISSION PENALTIES (matches backend behavior)
        // Late submissions reduce both on-time rate and quality score
        if (worker.late > 0) {
          // Late submissions reduce on-time rate by 50% per late assignment
          const latePenaltyRate = (worker.late / worker.assignments) * 50;
          onTimeRate = Math.max(0, onTimeRate - latePenaltyRate);
          
          // Late submissions also reduce quality score by 20% per late assignment
          const latePenaltyQuality = (worker.late / worker.assignments) * 20;
          qualityScore = Math.max(0, qualityScore - latePenaltyQuality);
        }
        
        // Backend-aligned weighted score formula (WITHOUT lateRate as positive contribution):
        // (completion * 0.5) + (onTime * 0.25) + (quality * 0.1) + bonuses - penalties
        let weightedScore = (completionRate * 0.5) +      // 50% weight for completion
                           (onTimeRate * 0.25) +          // 25% weight for on-time (already penalized if late)
                           (qualityScore * 0.1);          // 10% weight for quality (already penalized if late)
        
        // Calculate pending bonus (max 5%)
        const pendingBonus = worker.pending > 0 
          ? Math.min(5, (worker.pending / worker.assignments) * 5)
          : 0;
        
        // Apply overdue penalty: simplified version (no shift-based decay in frontend)
        // Backend uses up to 10% penalty with shift-based decay
        const overduePenalty = Math.min(10, (worker.overdue / worker.assignments) * 10);
        
        // Calculate recovery bonus (simplified - up to 3%)
        // Backend checks recent completions within 7 days; here we simplify
        // Give bonus if completion rate is high (80%+)
        const recoveryBonus = completionRate >= 80 ? 3 : 0;
        
        // Final score with all components
        weightedScore = weightedScore + pendingBonus - overduePenalty + recoveryBonus;
        
        // Ensure score stays within 0-100 range
        worker.score = Math.max(0, Math.min(100, weightedScore));
        
        // Rating thresholds aligned with backend
        if (worker.score >= 95) {
          worker.performanceRating = 'Excellent (A+)';
        } else if (worker.score >= 90) {
          worker.performanceRating = 'Excellent (A)';
        } else if (worker.score >= 85) {
          worker.performanceRating = 'Very Good (A-)';
        } else if (worker.score >= 80) {
          worker.performanceRating = 'Good (B+)';
        } else if (worker.score >= 75) {
          worker.performanceRating = 'Good (B)';
        } else if (worker.score >= 70) {
          worker.performanceRating = 'Above Average (B-)';
        } else if (worker.score >= 65) {
          worker.performanceRating = 'Average (C+)';
        } else if (worker.score >= 60) {
          worker.performanceRating = 'Average (C)';
        } else if (worker.score >= 55) {
          worker.performanceRating = 'Below Average (C-)';
        } else if (worker.score >= 50) {
          worker.performanceRating = 'Below Average (D)';
        } else {
          worker.performanceRating = 'Needs Improvement (F)';
        }
      }
    });

    return Array.from(workerMap.values());
  }, [assignments, teamMembers]); // Use assignments, not filteredAssignments

  // Memoized worker performance data
  const workerPerformanceData = useMemo(() => calculateWorkerPerformance(), [calculateWorkerPerformance]);

  // Memoized sorted worker performance - optimized to use pre-calculated scores
  const sortedWorkerPerformance = useMemo(() => {
    return [...workerPerformanceData].sort((a, b) => {
      // Only rank workers with completed assignments
      if (a.completed === 0 && b.completed === 0) return 0;
      if (a.completed === 0) return 1; // Workers with no completions go to bottom
      if (b.completed === 0) return -1;
      
      // Use pre-calculated score for efficiency
      return b.score - a.score; // Higher score = better rank (first)
    });
  }, [workerPerformanceData]);

  // Memoized worker rank map for O(1) lookup
  const workerRankMap = useMemo(() => {
    const rankMap = new Map<string, number>();
    sortedWorkerPerformance.forEach((worker, index) => {
      rankMap.set(worker.id, index + 1);
    });
    return rankMap;
  }, [sortedWorkerPerformance]);

  const getPaginatedWorkerPerformance = () => {
    const startIndex = (assignmentsPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return sortedWorkerPerformance.slice(startIndex, endIndex);
  };

  const getWorkerRank = (workerId: string) => {
    return workerRankMap.get(workerId) || 0;
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


  // Check if the FILTERED DATE has pending assignments that can be marked as overdue
  // Only checks the currently selected date in the filter
  const hasOverdueAssignments = () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
    const selectedDate = filterDate; // Use the filtered date
    
    // Only if the filtered date is BEFORE today
    if (selectedDate >= today) {
      return false; // Can't mark future or today as overdue yet
    }
    
    // Check if there are pending assignments for the selected date
    return assignments.some(assignment => {
      if (assignment.status !== 'pending') return false;
      if (assignment.assigned_date !== selectedDate) return false; // Must match filtered date
      
      return true;
    });
  };

  // Check if team leader's shift has started
  const isShiftStarted = () => {
    if (!currentShift) return true; // If no shift info, assume it's started
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute; // Current time in minutes
    
    // Parse shift start time
    const [startHour, startMinute] = currentShift.start_time.split(':').map(Number);
    const shiftStartTime = startHour * 60 + startMinute; // Shift start time in minutes
    
    // Parse shift end time
    const [endHour, endMinute] = currentShift.end_time.split(':').map(Number);
    const shiftEndTime = endHour * 60 + endMinute; // Shift end time in minutes
    
    // Handle night shift (22:00 - 06:00) - crosses midnight
    if (endHour < 12) { // Night shift (ends before noon, e.g., 06:00)
      // For night shift, we're in shift if:
      // 1. Current time is after start time (same day), OR
      // 2. Current time is before end time (next day)
      return currentTime >= shiftStartTime || currentTime < shiftEndTime;
    } else {
      // Day shift (ends after noon, e.g., 14:00, 22:00)
      return currentTime >= shiftStartTime;
    }
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
  // Enable whenever there are PAST DATE pending assignments
  // Team leader can manually mark them as overdue anytime
  const isOverdueButtonEnabled = () => {
    return hasOverdueAssignments();
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
      return { hasOverdue: false, message: '', overdueDetails: null };
    }
    
    // NEW: Check if next shift has started - if yes, workers should be available
    if (currentShift && isShiftStarted()) {
      // Current shift has started, so overdue assignments shouldn't block new ones
      return { hasOverdue: false, message: '', overdueDetails: null };
    }
    
    // Get worker names with overdue assignments
    const overdueWorkerNames = overdueAssignments
      .map(assignment => {
        const worker = teamMembers.find(m => m.id === assignment.worker_id) || assignment.worker;
        return worker ? `${worker.first_name} ${worker.last_name}` : 'Unknown Worker';
      })
      .filter((name, index, self) => self.indexOf(name) === index); // Remove duplicates
    
    // Calculate next shift start time
    let nextShiftDate = '';
    let nextShiftTime = '';
    if (currentShift) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      nextShiftDate = tomorrow.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      // Format time to 12-hour format with AM/PM
      const [hour, minute] = currentShift.start_time.split(':').map(Number);
      const period = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      nextShiftTime = `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
    }
    
    const todayFormatted = new Date(today).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const message = `Cannot assign new work readiness tasks.\n\nSome workers have overdue assignments from ${todayFormatted}.\n\nThey will be available when the next shift starts.`;
    
    return { 
      hasOverdue: true, 
      message,
      overdueDetails: {
        date: todayFormatted,
        workerCount: overdueWorkerNames.length,
        workers: overdueWorkerNames,
        nextShiftDate,
        nextShiftTime,
        shiftName: currentShift?.shift_name || 'Next Shift'
      }
    };
  };

  // Handle manual overdue marking confirmation
  const confirmMarkOverdue = async () => {
    try {
      setLoading(true);
      
      // Check if there are pending assignments for the filtered date
      if (!hasOverdueAssignments()) {
        const formattedDate = new Date(filterDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        setSuccessMessage(`No pending assignments found for ${formattedDate} to mark as overdue`);
        setShowSuccessDialog(true);
        return;
      }
      
      // Pass the specific date to mark as overdue
      const response = await BackendAssignmentAPI.markOverdueAssignments(filterDate);
      
      if (response.success) {
        const formattedDate = new Date(filterDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        console.log(`✅ Marked ${response.count} assignment(s) from ${formattedDate} as overdue`);
        await fetchAssignments(); // Refresh the list
        // Show success message
        setSuccessMessage(`Successfully marked ${response.count} assignment(s) from ${formattedDate} as overdue`);
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

  // Excel Export Function - Professional Formatting
  const handleExportExcel = () => {
    try {
      const now = new Date();
      const dateStr = filterDate || getTodayPHT();
      const formattedDate = new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Create workbook
      const workbook = XLSX.utils.book_new();

      // === SHEET 1: ASSIGNMENT DETAILS ===
      const assignmentData = [
        [`WORK READINESS ASSIGNMENTS - ${formattedDate}`],
        [''],
        ['Generated:', now.toLocaleString('en-US')],
        ['Team Leader:', team],
        ['Total Assignments:', filteredAssignments.length],
        [''],
        ['ASSIGNMENT DETAILS'],
        [''],
        ['Worker Name', 'Assigned Date', 'Due Time', 'Status', 'Completion Time', 'Readiness Level', 'Pain Level', 'Fatigue Level', 'Notes']
      ];

      filteredAssignments.forEach(assignment => {
        const workerName = assignment.worker 
          ? `${assignment.worker.first_name} ${assignment.worker.last_name}`
          : 'Unknown Worker';
        
        const assignedDate = new Date(assignment.assigned_date).toLocaleDateString('en-US');
        const dueTime = assignment.due_time 
          ? new Date(assignment.due_time).toLocaleString('en-US')
          : 'Not set';
        
        const completionTime = assignment.completed_at
          ? new Date(assignment.completed_at).toLocaleString('en-US')
          : '-';
        
        const readiness = assignment.work_readiness?.readiness_level || '-';
        const pain = (assignment.work_readiness as any)?.pain_level || '-';
        const fatigue = assignment.work_readiness?.fatigue_level || '-';
        const notes = (assignment.work_readiness as any)?.notes || '-';

        assignmentData.push([
          workerName,
          assignedDate,
          dueTime,
          assignment.status.toUpperCase(),
          completionTime,
          readiness,
          pain,
          fatigue,
          notes
        ]);
      });

      const assignmentSheet = XLSX.utils.aoa_to_sheet(assignmentData);
      assignmentSheet['!cols'] = [
        { wch: 20 }, // Worker Name
        { wch: 15 }, // Assigned Date
        { wch: 20 }, // Due Time
        { wch: 12 }, // Status
        { wch: 20 }, // Completion Time
        { wch: 15 }, // Readiness
        { wch: 12 }, // Pain
        { wch: 14 }, // Fatigue
        { wch: 30 }  // Notes
      ];

      // === SHEET 2: WORKER PERFORMANCE ===
      const performanceData = [
        ['WORKER PERFORMANCE RANKING'],
        [''],
        ['Generated:', now.toLocaleString('en-US')],
        ['Based on:', 'All assignments (not filtered by date)'],
        [''],
        ['PERFORMANCE METRICS'],
        [''],
        ['Rank', 'Worker Name', 'Total Assignments', 'Completed', 'On-Time', 'Late', 'Pending', 'Overdue', 'Completion %', 'On-Time %', 'KPI Score', 'Rating']
      ];

      sortedWorkerPerformance.forEach((worker, index) => {
        const rank = index + 1;
        const completionRate = worker.assignments > 0 
          ? ((worker.completed / worker.assignments) * 100).toFixed(1) 
          : '0.0';
        const onTimeRate = worker.completed > 0 
          ? ((worker.onTime / worker.completed) * 100).toFixed(1) 
          : '0.0';
        
        performanceData.push([
          rank.toString(),
          worker.name,
          worker.assignments.toString(),
          worker.completed.toString(),
          worker.onTime.toString(),
          worker.late.toString(),
          worker.pending.toString(),
          worker.overdue.toString(),
          completionRate + '%',
          onTimeRate + '%',
          worker.score.toFixed(1),
          worker.performanceRating
        ]);
      });

      const performanceSheet = XLSX.utils.aoa_to_sheet(performanceData);
      performanceSheet['!cols'] = [
        { wch: 6 },  // Rank
        { wch: 20 }, // Worker Name
        { wch: 16 }, // Total
        { wch: 12 }, // Completed
        { wch: 10 }, // On-Time
        { wch: 8 },  // Late
        { wch: 10 }, // Pending
        { wch: 10 }, // Overdue
        { wch: 14 }, // Completion %
        { wch: 12 }, // On-Time %
        { wch: 12 }, // KPI Score
        { wch: 15 }  // Rating
      ];

      // === SHEET 3: SUMMARY STATISTICS ===
      const totalAssignments = filteredAssignments.length;
      const completedCount = filteredAssignments.filter(a => a.status === 'completed').length;
      const pendingCount = filteredAssignments.filter(a => a.status === 'pending').length;
      const overdueCount = filteredAssignments.filter(a => a.status === 'overdue').length;
      const completionRate = totalAssignments > 0 
        ? ((completedCount / totalAssignments) * 100).toFixed(1) 
        : '0.0';

      const summaryData = [
        ['SUMMARY STATISTICS'],
        [''],
        ['Report Date:', formattedDate],
        ['Generated On:', now.toLocaleString('en-US')],
        [''],
        ['ASSIGNMENT OVERVIEW'],
        [''],
        ['Metric', 'Value', 'Percentage'],
        ['Total Assignments', totalAssignments, '100%'],
        ['Completed', completedCount, completionRate + '%'],
        ['Pending', pendingCount, (totalAssignments > 0 ? ((pendingCount / totalAssignments) * 100).toFixed(1) : '0.0') + '%'],
        ['Overdue', overdueCount, (totalAssignments > 0 ? ((overdueCount / totalAssignments) * 100).toFixed(1) : '0.0') + '%'],
        [''],
        ['TEAM PERFORMANCE'],
        [''],
        ['Total Workers', sortedWorkerPerformance.length, ''],
        ['Active Workers', sortedWorkerPerformance.filter(w => w.assignments > 0).length, ''],
        ['Top Performer', sortedWorkerPerformance[0]?.name || 'N/A', sortedWorkerPerformance[0]?.performanceRating || 'N/A'],
        [''],
        ['KPI FORMULA (Backend-Aligned)'],
        [''],
        ['Component', 'Weight', 'Description'],
        ['Completion Rate', '50%', 'Percentage of completed assignments'],
        ['On-Time Rate', '25%', 'Percentage of on-time submissions'],
        ['Quality Score', '10%', 'Based on readiness assessments'],
        ['Pending Bonus', 'Up to +5%', 'Bonus for pending assignments'],
        ['Overdue Penalty', 'Variable', 'Penalty for overdue assignments'],
        ['Recovery Bonus', 'Up to +3%', 'Bonus for high completion rates (≥80%)'],
        ['Late Penalty', '-50% on-time, -20% quality', 'Applied to late submissions'],
        [''],
        ['RATING SCALE'],
        [''],
        ['Grade', 'Score Range', 'Description'],
        ['A+ to A-', '85-100', 'Excellent Performance'],
        ['B+ to B-', '70-84', 'Good Performance'],
        ['C+ to C-', '55-69', 'Average Performance'],
        ['D to F', '0-54', 'Needs Improvement']
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      summarySheet['!cols'] = [
        { wch: 25 }, // Column A
        { wch: 18 }, // Column B
        { wch: 40 }  // Column C
      ];

      // Add sheets to workbook
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
      XLSX.utils.book_append_sheet(workbook, assignmentSheet, 'Assignment Details');
      XLSX.utils.book_append_sheet(workbook, performanceSheet, 'Worker Performance');

      // Generate filename
      const filename = `Work_Readiness_Report_${dateStr.replace(/-/g, '_')}.xlsx`;

      // Download file
      XLSX.writeFile(workbook, filename);

      setSuccessMessage(`Excel report downloaded successfully: ${filename}`);
      setShowSuccessDialog(true);
    } catch (error) {
      console.error('Error exporting Excel:', error);
      setError('Failed to export Excel report. Please try again.');
    }
  };

  const handleCreateAssignments = () => {
    if (selectedWorkers.length === 0) {
      setError('Please select at least one worker');
      return;
    }

    // Check if shift has started
    if (!isShiftStarted()) {
      setError(null); // Clear any error alerts
      const shiftStartTime = currentShift ? currentShift.start_time : 'shift start time';
      setOverdueBlockingMessage(`Assignment creation is not available yet. Please wait until your shift starts at ${shiftStartTime}.`);
      setShowOverdueBlockingDialog(true);
      return;
    }

    // Check if any selected workers have unclosed unselected cases
    const workersWithUnclosedCases = selectedWorkers
      .map(workerId => {
        const unclosedCase = unselectedWorkers.find(unselected => 
          unselected.worker_id === workerId && 
          unselected.case_status !== 'closed'
        );
        
        if (unclosedCase) {
          const worker = teamMembers.find(m => m.id === workerId);
          return {
            workerId,
            workerName: worker ? `${worker.first_name} ${worker.last_name}` : 'Unknown Worker',
            caseDate: unclosedCase.assignment_date,
            reason: unclosedCase.reason
          };
        }
        return null;
      })
      .filter(Boolean);

    if (workersWithUnclosedCases.length > 0) {
      setError(null); // Clear any error alerts
      const workersList = workersWithUnclosedCases
        .map(w => `• ${w!.workerName} - Unclosed case from ${new Date(w!.caseDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}`)
        .join('\n');
      
      setOverdueBlockingMessage(
        `Some workers have unclosed unselected cases. Please close their cases first before assigning new tasks.\n\n${workersList}\n\nYou can close these cases from the Unselected Workers section below.`
      );
      setShowOverdueBlockingDialog(true);
      return;
    }

    // Check for overdue assignments that block new assignment creation
    const overdueCheck = checkOverdueBlocking();
    if (overdueCheck.hasOverdue) {
      setError(null); // Clear any error alerts
      setOverdueBlockingMessage(overdueCheck.message);
      setOverdueBlockingDetails(overdueCheck.overdueDetails);
      setShowOverdueBlockingDialog(true);
      return;
    }

    // Validate that all unselected workers have reasons
    const availableMembers = availableTeamMembers;
    const unselectedWorkerIds = teamMembers
      .filter(member => 
        !selectedWorkers.includes(member.id) && 
        !assignments.some(a => a.assigned_date === assignedDate && a.worker_id === member.id && a.status === 'pending') &&
        !unselectedWorkers.some(u => u.worker_id === member.id && u.case_status !== 'closed')  // ✅ Check ANY unclosed case
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
      
      // RE-VALIDATE: Fetch latest assignments to check for race conditions
      await fetchAssignments();
      
      // Check if any selected worker now has an assignment (race condition protection)
      const nowUnavailable = selectedWorkers.filter(workerId => {
        return assignments.some(a => 
          a.worker_id === workerId && 
          a.assigned_date === assignedDate &&
          ['pending', 'completed'].includes(a.status)
        );
      });
      
      if (nowUnavailable.length > 0) {
        const workerNames = nowUnavailable.map(id => {
          const worker = teamMembers.find(m => m.id === id);
          return worker ? `${worker.first_name} ${worker.last_name}` : id;
        }).join(', ');
        
        setError(`These workers are no longer available: ${workerNames}. Please refresh and try again.`);
        setLoading(false);
        setOpenDialog(true); // Re-open dialog so user can adjust
        return;
      }
      
      // RE-CHECK for overdue blocking before API call (in case status changed)
      const overdueCheck = checkOverdueBlocking();
      if (overdueCheck.hasOverdue) {
        setError(null);
        setOverdueBlockingMessage(overdueCheck.message);
        setOverdueBlockingDetails(overdueCheck.overdueDetails);
        setShowOverdueBlockingDialog(true);
        setLoading(false);
        return;
      }
      
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
      
      // Check if backend returned overdue blocking error
      const errorMessage = err.response?.data?.error || err.message || '';
      if (errorMessage.includes('overdue assignments') || errorMessage.includes('Cannot assign new work readiness tasks')) {
        // Backend detected overdue - parse and show in dialog
        const overdueCheck = checkOverdueBlocking();
        if (overdueCheck.hasOverdue) {
          setError(null);
          setOverdueBlockingMessage(overdueCheck.message);
          setOverdueBlockingDetails(overdueCheck.overdueDetails);
          setShowOverdueBlockingDialog(true);
        } else {
          // Fallback if we can't get details
          setError(null);
          setOverdueBlockingMessage(errorMessage);
          setOverdueBlockingDetails(null);
          setShowOverdueBlockingDialog(true);
        }
      }
      // Check if the error is related to completed workers
      else if (err.response?.data?.completedWorkers && err.response.data.completedWorkers.length > 0) {
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

  // Optimized worker toggle handler
  const handleWorkerToggle = useCallback((workerId: string) => {
    setSelectedWorkers(prev =>
      prev.includes(workerId)
        ? prev.filter(id => id !== workerId)
        : [...prev, workerId]
    );
  }, []);

  // Optimized unselected worker reason handler
  const handleUnselectedWorkerReasonChange = useCallback((workerId: string, reason: string) => {
    setUnselectedWorkerReasons(prev => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        reason
      }
    }));
  }, []);

  // Optimized unselected worker notes handler
  const handleUnselectedWorkerNotesChange = useCallback((workerId: string, notes: string) => {
    setUnselectedWorkerReasons(prev => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        notes
      }
    }));
  }, []);

  // Memoized reason label getter
  const getReasonLabel = useCallback((reason: string): string => {
    const reasonLabels: Record<string, string> = {
      'sick': 'Sick',
      'on_leave_rdo': 'On leave / RDO',
      'transferred': 'Transferred to another site',
      'injured_medical': 'Injured / Medical',
      'not_rostered': 'Not rostered'
    };
    return reasonLabels[reason] || reason;
  }, []);

  // Memoized case status color getter
  const getCaseStatusColor = useCallback((status: string): 'error' | 'warning' | 'success' | 'default' => {
    const statusColors: Record<string, 'error' | 'warning' | 'success' | 'default'> = {
      'open': 'error',
      'in_progress': 'warning',
      'closed': 'success'
    };
    return statusColors[status] || 'default';
  }, []);

  // Memoized case status label getter
  const getCaseStatusLabel = useCallback((status: string): string => {
    const statusLabels: Record<string, string> = {
      'open': 'Open',
      'in_progress': 'In Progress',
      'closed': 'Closed'
    };
    return statusLabels[status] || 'Open';
  }, []);

  // Optimized close case handler
  const handleCloseCase = useCallback(async (unselectedWorkerId: string) => {
    const worker = unselectedWorkers.find(w => w.id === unselectedWorkerId);
    const workerName = worker?.worker ? formatWorkerName(worker.worker) : 'this worker';
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
        setUnselectedWorkers(prev => prev.filter(worker => worker.id !== unselectedWorkerId));
        
        setSuccess(`✅ Case closed successfully! ${workerName} is now available for assignment.`);
        setTimeout(() => setSuccess(null), SUCCESS_MESSAGE_DURATION);
      } else {
        throw new Error(response.message || 'Failed to close case');
      }
    } catch (err: any) {
      console.error('Error closing case:', err);
      setError(err.message || 'Failed to close case');
    } finally {
      setLoading(false);
    }
  }, [unselectedWorkers, getReasonLabel]);

  // Memoized status color getter
  const getStatusColor = useCallback((status: string): 'success' | 'warning' | 'error' | 'default' => {
    const statusColors: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
      'completed': 'success',
      'pending': 'warning',
      'overdue': 'error',
      'cancelled': 'default'
    };
    return statusColors[status] || 'default';
  }, []);

  // Memoized status icon getter
  const getStatusIcon = useCallback((status: string) => {
    const statusIcons: Record<string, React.ReactElement> = {
      'completed': <CheckCircleIcon fontSize="small" />,
      'pending': <ScheduleIcon fontSize="small" />,
      'overdue': <WarningIcon fontSize="small" />,
      'cancelled': <CancelIcon fontSize="small" />
    };
    return statusIcons[status] || undefined;
  }, []);

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
            startIcon={<DownloadIcon />}
            onClick={handleExportExcel}
            disabled={loading || filteredAssignments.length === 0}
            sx={{
              backgroundColor: '#10b981',
              color: 'white',
              '&:hover': { 
                backgroundColor: '#059669'
              },
              '&:disabled': {
                backgroundColor: '#d1d5db',
                color: '#9ca3af'
              }
            }}
          >
            Export Excel
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
              !hasOverdueAssignments() 
                ? `No pending assignments for ${new Date(filterDate).toLocaleDateString()} to mark as overdue` 
                : `Mark pending assignments from ${new Date(filterDate).toLocaleDateString()} as overdue`
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

      {/* Alerts - Hide overdue/blocking messages as they show in dialogs */}
      {error && 
       !error.includes('overdue assignments') && 
       !error.includes('unclosed unselected cases') && 
       !error.includes('Assignment creation is not available yet') && 
       !error.includes('Cannot assign new work readiness tasks') && (
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
                value: filteredAssignments.length, 
                color: '#6366f1',
                icon: <AssignmentIcon />
              },
              { 
                label: 'Pending', 
                value: filteredAssignments.filter(a => a.status === 'pending').length, 
                color: '#f59e0b',
                icon: <ScheduleIcon />
              },
              { 
                label: 'Completed', 
                value: filteredAssignments.filter(a => a.status === 'completed').length, 
                color: '#10b981',
                icon: <DoneIcon />
              },
              { 
                label: 'Overdue', 
                value: filteredAssignments.filter(a => a.status === 'overdue').length, 
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
                      count = filteredAssignments.length;
                    } else {
                      count = filteredAssignments.filter(a => a.status === tab.value).length;
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
              const totalPages = totalAssignmentPages;
              
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
                          // Get worker performance rank - optimized with memoized map
                          const workerRank = getWorkerRank(assignment.worker_id);
                          
                          // Null safety for worker data
                          const workerFirstName = assignment.worker?.first_name || 'Unknown';
                          const workerLastName = assignment.worker?.last_name || '';
                          const workerEmail = assignment.worker?.email || 'No email';
                          
                          return (
                    <TableRow key={assignment.id}>
                      {filterStatus === 'completed' && (
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {workerRank > 0 && workerRank <= 3 ? (
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
                            ) : workerRank > 0 ? (
                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#6b7280' }}>
                                #{workerRank}
                              </Typography>
                            ) : (
                              <Typography variant="body2" sx={{ fontWeight: 400, color: '#9ca3af' }}>
                                N/A
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                      )}
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {workerFirstName} {workerLastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {workerEmail}
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
                    ITEMS_PER_PAGE={ITEMS_PER_PAGE}
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
                      onChange={(e) => {
                        const selectedDate = new Date(e.target.value);
                        const today = new Date(getTodayPHT());
                        today.setHours(0, 0, 0, 0);
                        selectedDate.setHours(0, 0, 0, 0);
                        
                        if (selectedDate < today) {
                          setError('Cannot create assignments for past dates');
                          setTimeout(() => setError(null), 5000);
                          return;
                        }
                        setAssignedDate(e.target.value);
                      }}
                      fullWidth
                      required
                      InputLabelProps={{ shrink: true }}
                      inputProps={{
                        min: getTodayPHT() // Prevent selecting past dates in date picker
                      }}
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
                    const availableMembers = availableTeamMembers;
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
                  const availableMembers = availableTeamMembers;
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
              const availableMembers = availableTeamMembers;
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
                          <strong>Note:</strong> These workers cannot be assigned because they have pending assignments that are not yet due, completed assignments (until shift deadline passes), or unclosed unselected cases (from any date). Workers with overdue assignments can be reassigned (KPI penalties apply).
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

                          const unselectedCase = unselectedWorkers.find(unselected => 
                            unselected.worker_id === member.id &&
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
                          } else if (unselectedCase) {
                            const caseDate = new Date(unselectedCase.assignment_date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            });
                            reason = `Has unclosed unselected case from ${caseDate}`;
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
            Are you sure you want to mark pending assignments as overdue?
          </Typography>
          
          <Box sx={{ 
            bgcolor: '#fef3c7', 
            p: 2, 
            borderRadius: 2, 
            border: '1px solid #fbbf24',
            mb: 2
          }}>
            <Typography variant="body2" sx={{ color: '#92400e', fontWeight: 500, mb: 1 }}>
              ⚠️ <strong>Important:</strong> This will mark all pending assignments as overdue for:
            </Typography>
            <Typography variant="h6" sx={{ color: '#92400e', fontWeight: 700, textAlign: 'center' }}>
              {new Date(filterDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Typography>
          </Box>
          
          <Typography variant="body2" sx={{ color: '#6b7280' }}>
            💡 <strong>Note:</strong> Only assignments from the selected date will be marked. Workers may have submitted late, so marking as overdue will affect their performance records and KPI calculations.
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
        onClose={() => {
          setShowOverdueBlockingDialog(false);
          setOverdueBlockingDetails(null);
        }}
        maxWidth="md"
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
          bgcolor: overdueBlockingDetails ? '#fef2f2' : '#fefce8',
          color: overdueBlockingDetails ? '#991b1b' : '#78350f',
          fontWeight: 600,
          borderBottom: overdueBlockingDetails ? '2px solid #fecaca' : '2px solid #fde68a',
          p: 3
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              bgcolor: overdueBlockingDetails ? 'rgba(239, 68, 68, 0.1)' : 'rgba(251, 191, 36, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <WarningIcon sx={{ fontSize: 28, color: overdueBlockingDetails ? '#ef4444' : '#f59e0b' }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {overdueBlockingDetails ? 'Cannot Create Assignment' : 'Assignment Not Available'}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                {overdueBlockingDetails ? 'Workers have overdue assignments' : 'Please review the details below'}
            </Typography>
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ p: 4 }}>
          {overdueBlockingDetails ? (
            <>
              {/* Overdue Workers Information */}
              <Box sx={{ mb: 3 }}>
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
            bgcolor: '#fef2f2', 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '3px solid #ef4444'
                  }}>
                    <ScheduleIcon sx={{ fontSize: 40, color: '#ef4444' }} />
                  </Box>
                </Box>

                <Typography variant="h6" align="center" sx={{ mb: 2, fontWeight: 700, color: '#ef4444' }}>
                  ⏰ Overdue Assignments Detected
                </Typography>

                <Box sx={{ 
                  p: 3, 
                  bgcolor: '#fef2f2', 
                  borderRadius: 2, 
                  border: '2px solid #fecaca',
                  mb: 3
                }}>
                  <Typography variant="body1" sx={{ mb: 2, fontWeight: 600, color: '#991b1b' }}>
                    📅 Assignment Date:
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 3, pl: 2, color: '#7f1d1d' }}>
                    {overdueBlockingDetails.date}
                  </Typography>

                  <Typography variant="body1" sx={{ mb: 2, fontWeight: 600, color: '#991b1b' }}>
                    👥 Affected Workers ({overdueBlockingDetails.workerCount}):
                  </Typography>
                  <Box sx={{ 
                    pl: 2, 
                    maxHeight: 150, 
                    overflowY: 'auto',
                    bgcolor: 'white',
                    borderRadius: 1,
                    p: 2,
                    border: '1px solid #fecaca'
                  }}>
                    {overdueBlockingDetails.workers.map((workerName: string, index: number) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Box sx={{ 
                          width: 6, 
                          height: 6, 
                          borderRadius: '50%', 
                          bgcolor: '#ef4444' 
                        }} />
                        <Typography variant="body2" sx={{ color: '#7f1d1d', fontWeight: 500 }}>
                          {workerName}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>

                {/* Next Shift Information */}
                <Box sx={{ 
                  p: 3, 
                  bgcolor: '#f0fdf4', 
                  borderRadius: 2, 
                  border: '2px solid #86efac'
                }}>
                  <Typography variant="body1" sx={{ mb: 2, fontWeight: 700, color: '#166534', textAlign: 'center' }}>
                    ⏰ Workers Will Be Available
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ color: '#166534', fontWeight: 600, mb: 0.5 }}>
                        Next Shift:
                      </Typography>
                      <Typography variant="h6" sx={{ color: '#15803d', fontWeight: 700 }}>
                        {overdueBlockingDetails.shiftName}
                      </Typography>
                    </Box>

                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ color: '#166534', fontWeight: 600, mb: 0.5 }}>
                        Start Time:
                      </Typography>
                      <Typography variant="h5" sx={{ color: '#15803d', fontWeight: 700 }}>
                        {overdueBlockingDetails.nextShiftTime}
                      </Typography>
                    </Box>

                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ color: '#166534', fontWeight: 600, mb: 0.5 }}>
                        Date:
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#15803d', fontWeight: 600 }}>
                        {overdueBlockingDetails.nextShiftDate}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>

              <Alert severity="info" sx={{ mt: 3 }}>
                <Typography variant="body2">
                  💡 <strong>Note:</strong> These workers cannot be assigned until the next shift begins. This ensures proper shift-based tracking and KPI calculations.
                </Typography>
              </Alert>
            </>
          ) : (
            <>
              {/* Original simple message for other cases */}
              <Box sx={{ 
                p: 2.5, 
                bgcolor: overdueBlockingMessage.includes('Assignment creation is not available yet') ? '#fefce8' : '#fef2f2',
            borderRadius: 1.5, 
                border: overdueBlockingMessage.includes('Assignment creation is not available yet') ? '1px solid #fde68a' : '1px solid #fecaca',
            mb: 2
          }}>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    fontWeight: 600, 
                    color: overdueBlockingMessage.includes('Assignment creation is not available yet') ? '#78350f' : '#991b1b',
                    lineHeight: 1.8,
                    whiteSpace: 'pre-line',
                    textAlign: 'left'
                  }}
                >
              {overdueBlockingMessage}
            </Typography>
          </Box>

          {overdueBlockingMessage.includes('Assignment creation is not available yet') ? (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    ⏰ <strong>Shift Not Started:</strong> You must start your shift before creating work readiness assignments.
            </Typography>
                </Alert>
              ) : overdueBlockingMessage.includes('unclosed unselected cases') ? (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    💡 <strong>Tip:</strong> Go to the Unselected Workers section below and click "Close Case" for these workers to make them available for assignment again.
            </Typography>
                </Alert>
              ) : null}
            </>
          )}
        </DialogContent>
        
        <DialogActions sx={{ 
          p: 3, 
          justifyContent: 'center',
          bgcolor: '#fafafa',
          borderTop: '1px solid #e5e7eb'
        }}>
          <Button
            onClick={() => {
              setShowOverdueBlockingDialog(false);
              setOverdueBlockingDetails(null);
            }}
            variant="contained"
            size="large"
            sx={{
              bgcolor: '#6366f1',
              '&:hover': { 
                bgcolor: '#4f46e5',
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 16px rgba(99, 102, 241, 0.4)'
              },
              fontWeight: 600,
              px: 5,
              py: 1.5,
              borderRadius: 2,
              transition: 'all 0.2s ease-in-out',
              textTransform: 'none',
              fontSize: '1rem'
            }}
          >
            {overdueBlockingDetails ? 'Got it, I\'ll wait' : 'Understood'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkReadinessAssignmentManager;
export {};
