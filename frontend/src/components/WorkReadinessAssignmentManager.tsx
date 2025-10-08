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
  PersonOff as PersonOffIcon,
  Info as InfoIcon,
  Assignment as AssignmentIcon,
  Done as DoneIcon,
  KeyboardArrowLeft as KeyboardArrowLeftIcon,
  KeyboardArrowRight as KeyboardArrowRightIcon,
  Print as PrintIcon
} from '@mui/icons-material';
import { SupabaseAPI } from '../utils/supabaseApi';
import { BackendAssignmentAPI } from '../utils/backendAssignmentApi';

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
  const [assignedDate, setAssignedDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  
  // Confirmation and Success Dialog states
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Completed Worker Dialog states
  const [showCompletedWorkerDialog, setShowCompletedWorkerDialog] = useState(false);
  const [completedWorkerMessage, setCompletedWorkerMessage] = useState('');
  
  // Cancel confirmation dialog state
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [assignmentToCancel, setAssignmentToCancel] = useState<{
    id: string;
    workerName: string;
    assignedDate: string;
  } | null>(null);
  
  // Filter states
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Pagination states
  const [assignmentsPage, setAssignmentsPage] = useState(1);
  const [unselectedPage, setUnselectedPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    fetchTeamMembers();
    fetchAssignments();
    fetchUnselectedWorkers();
  }, [teamLeaderId]);

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

  const getAvailableTeamMembers = () => {
    // Filter out workers who already have assignments for the selected date (pending, completed, or overdue)
    const assignedWorkerIds = assignments
      .filter(assignment => 
        assignment.assigned_date === assignedDate && 
        ['pending', 'completed', 'overdue'].includes(assignment.status)
      )
      .map(assignment => assignment.worker_id);

    // Filter out workers who have unselected cases that are not closed for the selected date
    const unselectedWorkerIds = unselectedWorkers
      .filter(unselected => 
        unselected.assignment_date === assignedDate && 
        unselected.case_status !== 'closed'
      )
      .map(unselected => unselected.worker_id);

    // Filter out workers who are already selected in the current dialog
    const currentlySelectedIds = selectedWorkers;

    // Debug logging to identify the issue
    console.log('🔍 Debug Assignment Filtering:');
    console.log('Selected Date:', assignedDate);
    console.log('All Assignments:', assignments);
    console.log('Assignments for selected date:', assignments.filter(a => a.assigned_date === assignedDate));
    console.log('Assigned Worker IDs (including completed):', assignedWorkerIds);
    console.log('Unselected Worker IDs:', unselectedWorkerIds);
    console.log('Team Members:', teamMembers.map(m => ({ id: m.id, name: `${m.first_name} ${m.last_name}` })));

    const availableMembers = teamMembers.filter(member => 
      !assignedWorkerIds.includes(member.id) && 
      !unselectedWorkerIds.includes(member.id) &&
      !currentlySelectedIds.includes(member.id)
    );

    console.log('Available Members:', availableMembers.map(m => `${m.first_name} ${m.last_name}`));
    return availableMembers;
  };

  const getFilteredAssignments = () => {
    let filtered = assignments;
    
    if (filterDate) {
      filtered = filtered.filter(assignment => assignment.assigned_date === filterDate);
    }
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(assignment => assignment.status === filterStatus);
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
      // Fetch all assignments, not filtered by date/status for dialog logic
      const response = await BackendAssignmentAPI.getAssignments();
      
      setAssignments(response.assignments || []);
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

  const handleCreateAssignments = () => {
    if (selectedWorkers.length === 0) {
      setError('Please select at least one worker');
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
          <div class="date">${new Date(assignedDate).toLocaleDateString()} - Due: End of Day (11:59 PM)</div>
        </div>

        <div class="section">
          <div class="section-title">📋 Assignment Details</div>
          <div class="details">
            <strong>Date:</strong> ${new Date(assignedDate).toLocaleDateString()}<br>
            <strong>Due Time:</strong> End of Day (11:59 PM)<br>
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
      
      // Set due time to end of day (23:59) for the assigned date
      const endOfDay = new Date(assignedDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      const response = await BackendAssignmentAPI.createAssignments(
        selectedWorkers,
        new Date(assignedDate),
        team,
        notes,
        endOfDay.toISOString(),
        unselectedWorkersData
      );
      
      // Show success dialog
      const successMsg = response.message || `Successfully created assignments for ${selectedWorkers.length} worker(s) and recorded reasons for ${Object.keys(unselectedWorkerReasons).length} unselected worker(s)`;
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
    setShowCancelDialog(true);
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
    setAssignedDate(new Date().toISOString().split('T')[0]);
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
                { value: 'cancelled', label: 'Cancelled', icon: <CancelIcon />, color: '#6b7280' },
                { value: 'unselected', label: 'Unselected Workers', icon: <PersonOffIcon />, color: '#f59e0b' }
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
                    } else if (tab.value === 'unselected') {
                      // Only count unselected workers with open cases
                      count = getFilteredUnselectedWorkers().filter(w => w.case_status !== 'closed').length;
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
          ) : filterStatus === 'unselected' ? (
            // Unselected Workers Table - Only show workers with open cases
            (() => {
              const openCases = getFilteredUnselectedWorkers().filter(w => w.case_status !== 'closed');
              const paginatedOpenCases = getPaginatedUnselectedWorkers();
              const totalPages = getTotalPages(openCases);
              
              return openCases.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 4 }}>
                  <PersonOffIcon sx={{ fontSize: 48, color: '#9ca3af', mb: 2 }} />
                  <Typography color="text.secondary" variant="h6">
                    No open unselected cases
                  </Typography>
                  <Typography color="text.secondary">
                    All unselected worker cases have been closed. Workers are now available for assignment.
                  </Typography>
                </Box>
              ) : (
              <Box>
                {/* Unselected Workers Header */}
                <Box sx={{ mb: 3, p: 2, bgcolor: '#fffbeb', borderRadius: 2, border: '1px solid #f59e0b' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <PersonOffIcon sx={{ mr: 1, color: '#f59e0b' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#92400e' }}>
                      Unselected Workers Management
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Workers who were not selected for assignments with their reasons. Close cases to make them available for future assignments.
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Chip
                      label={`Open Cases: ${openCases.length}`}
                      color="error"
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={`Closed Cases: ${unselectedWorkers.filter(w => w.case_status === 'closed').length}`}
                      color="success"
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                </Box>

                <TableContainer component={Paper} elevation={0}>
                  <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Worker</strong></TableCell>
                      <TableCell><strong>Date</strong></TableCell>
                      <TableCell><strong>Reason</strong></TableCell>
                      <TableCell><strong>Case Status</strong></TableCell>
                      <TableCell><strong>Notes</strong></TableCell>
                      <TableCell align="center"><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedOpenCases.map((unselected) => (
                      <TableRow key={unselected.id}>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {unselected.worker?.first_name} {unselected.worker?.last_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {unselected.worker?.email}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {new Date(unselected.assignment_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getReasonLabel(unselected.reason)}
                            color="warning"
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getCaseStatusLabel(unselected.case_status || 'open')}
                            color={getCaseStatusColor(unselected.case_status || 'open') as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title={unselected.notes || 'No notes'}>
                            <Typography
                              variant="body2"
                              sx={{
                                maxWidth: 200,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {unselected.notes || '-'}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="center">
                          {unselected.case_status !== 'closed' ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Button
                                variant="contained"
                                size="small"
                                startIcon={<CheckCircleIcon />}
                                onClick={() => handleCloseCase(unselected.id)}
                                disabled={loading}
                                sx={{
                                  backgroundColor: '#10b981',
                                  color: 'white',
                                  textTransform: 'none',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  px: 2,
                                  py: 0.5,
                                  borderRadius: 2,
                                  '&:hover': {
                                    backgroundColor: '#059669',
                                    transform: 'translateY(-1px)',
                                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)'
                                  },
                                  '&:disabled': {
                                    backgroundColor: '#9ca3af',
                                    color: '#6b7280'
                                  },
                                  transition: 'all 0.2s ease-in-out'
                                }}
                              >
                                Close Case
                              </Button>
                              <Tooltip title="Close this case to make the worker available for assignment again">
                                <InfoIcon 
                                  sx={{ 
                                    fontSize: 16, 
                                    color: '#6b7280',
                                    cursor: 'help'
                                  }} 
                                />
                              </Tooltip>
                            </Box>
                          ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip
                                icon={<CheckCircleIcon />}
                                label="Case Closed"
                                color="success"
                                size="small"
                                variant="filled"
                                sx={{
                                  fontWeight: 600,
                                  '& .MuiChip-icon': {
                                    color: 'white'
                                  }
                                }}
                              />
                              <Typography variant="caption" color="text.secondary">
                                Available
                              </Typography>
                            </Box>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {/* Pagination for Unselected Workers */}
              <PaginationComponent
                currentPage={unselectedPage}
                totalPages={totalPages}
                onPageChange={handleUnselectedPageChange}
                totalItems={openCases.length}
                itemsPerPage={itemsPerPage}
              />
              </Box>
              );
            })()
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
                      <TableCell>{assignment.due_time}</TableCell>
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
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          Create Work Readiness Assignment
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ pt: 1 }}>
            {/* Info Alert */}
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Assign work readiness tasks</strong> to selected team members. They will be required to submit their work readiness assessment on the assigned date.
              </Typography>
            </Alert>

            {/* Date and Time Section */}
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2, color: '#1976d2' }}>
              📅 Schedule
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12}>
                <TextField
                  label="Assigned Date"
                  type="date"
                  value={assignedDate}
                  onChange={(e) => setAssignedDate(e.target.value)}
                  fullWidth
                  required
                  InputLabelProps={{ shrink: true }}
                  helperText="Date when workers should submit (due by end of day)"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': {
                        borderColor: '#1976d2',
                      },
                    },
                  }}
                />
              </Grid>
            </Grid>

            {/* Notes Section */}
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2, color: '#1976d2' }}>
              📝 Instructions (Optional)
            </Typography>
            <TextField
              label="Special Instructions"
              multiline
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              fullWidth
              sx={{ 
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: '#1976d2',
                  },
                },
              }}
              placeholder="Example: Please complete before start of shift, Focus on fatigue assessment, etc."
            />


            {/* Worker Selection Section */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ color: '#1976d2' }}>
              👥 Select Team Members
            </Typography>
              {(() => {
                const availableMembers = getAvailableTeamMembers();
                const allSelected = availableMembers.length > 0 && selectedWorkers.length === availableMembers.length;
                const someSelected = selectedWorkers.length > 0 && selectedWorkers.length < availableMembers.length;
                
                return availableMembers.length > 0 && (
                  <Button
                    variant="outlined"
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
                      borderColor: allSelected ? '#ef4444' : '#1976d2',
                      color: allSelected ? '#ef4444' : '#1976d2',
                      textTransform: 'none',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      px: 2,
                      py: 0.5,
                      '&:hover': {
                        borderColor: allSelected ? '#dc2626' : '#1565c0',
                        backgroundColor: allSelected ? '#fef2f2' : '#e3f2fd'
                      }
                    }}
                  >
                    {allSelected ? 'Deselect All' : someSelected ? 'Select All' : 'Select All'}
                  </Button>
                );
              })()}
            </Box>
            <Box sx={{ 
              mb: 2, 
              p: 1.5, 
              bgcolor: selectedWorkers.length > 0 ? '#e3f2fd' : '#f5f5f5', 
              borderRadius: 1,
              border: selectedWorkers.length > 0 ? '2px solid #1976d2' : '1px solid #e0e0e0',
              transition: 'all 0.3s ease'
            }}>
              <Typography variant="body2" fontWeight={600} color={selectedWorkers.length > 0 ? '#1976d2' : 'text.secondary'}>
                {selectedWorkers.length === 0 
                  ? '⚠️ No workers selected - Please select at least one team member'
                  : `✅ ${selectedWorkers.length} worker${selectedWorkers.length > 1 ? 's' : ''} selected`
                }
              </Typography>
            </Box>

            {(() => {
              const availableMembers = getAvailableTeamMembers();
              return availableMembers.length === 0 ? (
                <Alert severity="info">
                  {teamMembers.length === 0 
                    ? "No team members found. Please add workers to your team first."
                    : "All team members already have assignments for this date. They will appear again after completing their assignments."
                  }
              </Alert>
            ) : (
              <Box sx={{ 
                maxHeight: 300, 
                overflowY: 'auto',
                border: '1px solid #e0e0e0',
                borderRadius: 1,
                p: 1
              }}>
                <FormGroup>
                    {availableMembers.map((member) => (
                    <Box
                      key={member.id}
                      sx={{
                        p: 1.5,
                        mb: 1,
                        borderRadius: 1,
                        bgcolor: selectedWorkers.includes(member.id) ? '#e3f2fd' : 'transparent',
                        border: selectedWorkers.includes(member.id) ? '1px solid #1976d2' : '1px solid transparent',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: selectedWorkers.includes(member.id) ? '#e3f2fd' : '#f5f5f5',
                          border: '1px solid #1976d2',
                        }
                      }}
                    >
                      <FormControlLabel
                        control={
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
                        }
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                            <Box>
                              <Typography variant="body2" fontWeight={600}>
                                {member.first_name} {member.last_name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {member.email}
                              </Typography>
                            </Box>
                          </Box>
                        }
                        sx={{ width: '100%', m: 0 }}
                      />
                    </Box>
                  ))}
                </FormGroup>
              </Box>
              );
            })()}

            {/* Unselected Workers Section */}
            {(() => {
              const availableMembers = getAvailableTeamMembers();
              const unselectedMembers = availableMembers.filter(member => !selectedWorkers.includes(member.id));
              
              return unselectedMembers.length > 0 && (
                <>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1, mt: 3, color: '#f59e0b' }}>
                    🚫 Specify Reasons for Unselected Workers
                  </Typography>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <strong>Note:</strong> Please specify why each unselected worker is not included in this assignment. If not specified, "Not rostered" will be automatically assigned as the default reason.
                    </Typography>
                  </Alert>

                  <Box sx={{ 
                    maxHeight: 300, 
                    overflowY: 'auto',
                    border: '1px solid #f59e0b',
                    borderRadius: 1,
                    p: 1,
                    bgcolor: '#fffbeb'
                  }}>
                    {unselectedMembers.map((member) => (
                      <Box
                        key={`unselected-${member.id}`}
                        sx={{
                          p: 2,
                          mb: 2,
                          borderRadius: 1,
                          bgcolor: 'white',
                          border: '1px solid #f59e0b',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: '50%',
                              bgcolor: '#f59e0b',
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.875rem',
                              mr: 2
                            }}
                          >
                            {member.first_name?.[0]}{member.last_name?.[0]}
                          </Box>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {member.first_name} {member.last_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {member.email}
                            </Typography>
                          </Box>
                        </Box>

                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <TextField
                              label="Reason for not selecting"
                              select
                              value={unselectedWorkerReasons[member.id]?.reason || ''}
                              onChange={(e) => handleUnselectedWorkerReasonChange(member.id, e.target.value)}
                              fullWidth
                              required
                              size="small"
                              SelectProps={{ native: true }}
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  '&:hover fieldset': {
                                    borderColor: '#f59e0b',
                                  },
                                },
                              }}
                            >
                              <option value="">Select reason...</option>
                              <option value="sick">Sick</option>
                              <option value="on_leave_rdo">On leave / RDO</option>
                              <option value="transferred">Transferred to another site</option>
                              <option value="injured_medical">Injured / Medical</option>
                              <option value="not_rostered">Not rostered</option>
                            </TextField>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField
                              label="Additional notes (optional)"
                              value={unselectedWorkerReasons[member.id]?.notes || ''}
                              onChange={(e) => handleUnselectedWorkerNotesChange(member.id, e.target.value)}
                              fullWidth
                              size="small"
                              placeholder="e.g., Expected return date, medical certificate provided, etc."
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  '&:hover fieldset': {
                                    borderColor: '#f59e0b',
                                  },
                                },
                              }}
                            />
                          </Grid>
                        </Grid>
                      </Box>
                    ))}
                  </Box>
                </>
              );
            })()}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, bgcolor: '#f5f5f5' }}>
          <Button 
            onClick={() => {
              setOpenDialog(false);
              resetForm();
            }} 
            color="inherit"
            sx={{
              px: 3,
              py: 1,
              fontWeight: 600,
              '&:hover': {
                bgcolor: '#e0e0e0'
              }
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateAssignments}
            variant="contained"
            disabled={loading || selectedWorkers.length === 0}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CheckCircleIcon />}
            sx={{
              px: 3,
              py: 1,
              fontWeight: 600,
              backgroundColor: '#1976d2',
              '&:hover': { 
                backgroundColor: '#1565c0',
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 12px rgba(25, 118, 210, 0.4)'
              },
              '&:disabled': {
                backgroundColor: '#bdbdbd'
              },
              transition: 'all 0.3s ease'
            }}
          >
            {loading ? 'Creating...' : (() => {
              const availableMembers = getAvailableTeamMembers();
              const totalAvailable = availableMembers.length + selectedWorkers.length;
              const unselectedCount = totalAvailable - selectedWorkers.length;
              return `Create Assignment (${selectedWorkers.length} selected, ${unselectedCount} unselected)`;
            })()}
          </Button>
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
              <strong>Due Time:</strong> End of Day (11:59 PM)
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
              This cannot be undone.
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
    </Box>
  );
};

export default WorkReadinessAssignmentManager;
