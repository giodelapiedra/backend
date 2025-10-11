import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  InputAdornment,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Checkbox,
  Tabs,
  Tab,
  Paper,
  FormControlLabel
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Save as SaveIcon,
  PersonOff as PersonOffIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Info as InfoIcon,
  Assignment as AssignmentIcon,
  InfoOutlined as InfoOutlinedIcon,
  CheckCircleOutlined as CheckCircleOutlinedIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { SupabaseAPI } from '../utils/supabaseApi';
import { authClient } from '../lib/supabase';

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface ClosedCaseData {
  id: string;
  worker_id: string;
  worker?: {
    first_name: string;
    last_name: string;
    email?: string;
  };
  case_id: string;
  case_status: string;
  closed_at: string;
  created_at: string;
  updated_at: string;
  reason?: string;
  notes?: string;
}

interface UnselectedWorkerReason {
  reason: string;
  notes: string;
  hasExistingCase?: boolean;
  existingCaseId?: string;
  originalReason?: string;
  caseStatus?: 'open' | 'in_progress' | 'closed';
}

interface SaveResult {
  success: boolean;
  error?: string;
  data?: unknown;
  isUpdate?: boolean;
  workerId?: string;
}

interface UnselectedWorkersManagerProps {
  teamLeaderId: string;
  team: string;
}

// Constants for better maintainability
const REASON_OPTIONS = [
  { value: 'sick', label: 'Sick' },
  { value: 'on_leave_rdo', label: 'On leave / RDO' },
  { value: 'transferred', label: 'Transferred to another site' },
  { value: 'injured_medical', label: 'Injured / Medical' },
  { value: 'not_rostered', label: 'Not rostered' }
] as const;

const ITEMS_PER_PAGE = 10;
const BACKEND_TIMEOUT = 3000;

const UnselectedWorkersManager: React.FC<UnselectedWorkersManagerProps> = memo(({
  teamLeaderId,
  team
}) => {
  // State management
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [unselectedWorkerReasons, setUnselectedWorkerReasons] = useState<Record<string, UnselectedWorkerReason>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmationDialog, setConfirmationDialog] = useState<{
    open: boolean;
    workerId: string;
    workerName: string;
    existingReason: string;
    newReason: string;
  }>({
    open: false,
    workerId: '',
    workerName: '',
    existingReason: '',
    newReason: ''
  });
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [validationModal, setValidationModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'success';
  }>({
    open: false,
    title: '',
    message: '',
    type: 'info'
  });
  const [closeCaseDialog, setCloseCaseDialog] = useState<{
    open: boolean;
    caseId: string;
    workerId: string;
    workerName: string;
  }>({
    open: false,
    caseId: '',
    workerId: '',
    workerName: ''
  });
  const [selectedWorkers, setSelectedWorkers] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState(0);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedWorkerHistory, setSelectedWorkerHistory] = useState<ClosedCaseData[]>([]);
  const [selectedWorkerName, setSelectedWorkerName] = useState('');
  const [closedCasesData, setClosedCasesData] = useState<ClosedCaseData[]>([]);

  // Refs for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);

  // Memoized utility functions
  const getReasonLabel = useCallback((reason: string): string => {
    const option = REASON_OPTIONS.find(opt => opt.value === reason);
    return option?.label || 'Not Specified';
  }, []);

  const getReasonColor = useCallback((reason: string) => {
    switch (reason) {
      case 'sick': return 'error';
      case 'on_leave_rdo': return 'warning';
      case 'transferred': return 'info';
      case 'injured_medical': return 'error';
      case 'not_rostered': return 'default';
      default: return 'default';
    }
  }, []);

  // Input validation and sanitization
  const sanitizeInput = useCallback((input: string): string => {
    return input.trim().replace(/[<>]/g, '');
  }, []);

  // Fetch team members with error handling
  const fetchTeamMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { session } } = await authClient.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const members = await SupabaseAPI.getTeamMembers(teamLeaderId, team);
      
      if (members.teamMembers) {
        setTeamMembers(members.teamMembers);
      } else {
        throw new Error('Failed to fetch team members');
      }
    } catch (err) {
      console.error('Error fetching team members:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch team members');
    } finally {
      setLoading(false);
    }
  }, [teamLeaderId, team]);

  // Load existing unselected worker reasons
  const loadUnselectedReasons = useCallback(async () => {
    try {
      const { data: { session } } = await authClient.auth.getSession();
      if (!session) return;

      const supabaseAPI = new SupabaseAPI();
      const response = await supabaseAPI.getUnselectedWorkerReasons(teamLeaderId);
      
      if (response.success && response.data) {
          const reasonsMap: Record<string, UnselectedWorkerReason> = {};
        response.data.forEach((item: unknown) => {
          const typedItem = item as { worker_id: string; id: string; reason: string; notes?: string };
          
          reasonsMap[typedItem.worker_id] = {
            reason: sanitizeInput(typedItem.reason),
            notes: sanitizeInput(typedItem.notes || ''),
            hasExistingCase: true,
            existingCaseId: typedItem.id,
            originalReason: sanitizeInput(typedItem.reason),
            caseStatus: 'open'
          };
          });
        setUnselectedWorkerReasons(reasonsMap);
      }
    } catch (err) {
      console.error('Error loading unselected reasons:', err);
    }
  }, [teamLeaderId, sanitizeInput]);

  // Memoized filtered members based on search term
  const filteredMembers = useMemo(() => {
    if (!searchTerm.trim()) {
      return teamMembers;
    }
    const sanitizedSearch = sanitizeInput(searchTerm).toLowerCase();
    return teamMembers.filter(member => 
      `${member.first_name} ${member.last_name}`.toLowerCase().includes(sanitizedSearch) ||
      member.email.toLowerCase().includes(sanitizedSearch)
    );
  }, [searchTerm, teamMembers, sanitizeInput]);

  // Memoized pagination calculations
  const paginationData = useMemo(() => {
    const totalPages = Math.ceil(filteredMembers.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentMembers = filteredMembers.slice(startIndex, endIndex);

    return { totalPages, startIndex, endIndex, currentMembers };
  }, [filteredMembers, currentPage]);

  const handlePageChange = useCallback((event: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
  }, []);

  // Memoized search handler to prevent unnecessary re-renders
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  }, []);

  // Memoized clear search handler
  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  // Check backend status with cleanup
  const checkBackendStatus = useCallback(async () => {
    try {
      const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
      
      // Cleanup previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      const controller = new AbortController();
      abortControllerRef.current = controller;
      
      const timeoutId = setTimeout(() => controller.abort(), BACKEND_TIMEOUT);
      
      const response = await fetch(`${backendUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        setBackendStatus('online');
      } else {
        setBackendStatus('offline');
      }
    } catch (error) {
      console.log('Backend is offline, will use direct database access');
      setBackendStatus('offline');
    }
  }, []);

  // Load closed cases
  const loadClosedCases = useCallback(async () => {
    try {
      const supabaseAPI = new SupabaseAPI();
      const response = await supabaseAPI.getAllClosedUnselectedWorkerCases(teamLeaderId);
      
      if (response.success && response.data) {
        setClosedCasesData(response.data);
      }
    } catch (err) {
      console.error('Error loading closed cases:', err);
    }
  }, [teamLeaderId]);

  // Initialize data on mount with optimized loading
  useEffect(() => {
    let isMounted = true;
    
    const initializeData = async () => {
      try {
        setLoading(true);
        
        // Parallel data fetching for better performance
        const [teamMembersResult, unselectedReasonsResult, closedCasesResult] = await Promise.allSettled([
          fetchTeamMembers(),
          loadUnselectedReasons(),
          loadClosedCases()
        ]);
        
        // Only check backend status if component is still mounted
        if (isMounted) {
          await checkBackendStatus();
        }
        
        // Handle any errors gracefully
        if (teamMembersResult.status === 'rejected') {
          console.error('Failed to fetch team members:', teamMembersResult.reason);
        }
        if (unselectedReasonsResult.status === 'rejected') {
          console.error('Failed to load unselected reasons:', unselectedReasonsResult.reason);
        }
        if (closedCasesResult.status === 'rejected') {
          console.error('Failed to load closed cases:', closedCasesResult.reason);
        }
      } catch (error) {
        console.error('Error during initialization:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    initializeData();
    
    // Cleanup on unmount
    return () => {
      isMounted = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [teamLeaderId]); // Only depend on teamLeaderId

  const handleReasonChange = useCallback((workerId: string, reason: string) => {
    const sanitizedReason = sanitizeInput(reason);
    const currentData = unselectedWorkerReasons[workerId];
    const worker = teamMembers.find(m => m.id === workerId);
    
    // If worker has existing case and reason is being changed, show confirmation
    if (currentData?.hasExistingCase && currentData.reason && sanitizedReason && sanitizedReason !== currentData.reason) {
      setConfirmationDialog({
        open: true,
        workerId,
        workerName: worker ? `${worker.first_name} ${worker.last_name}` : 'Unknown Worker',
        existingReason: getReasonLabel(currentData.reason),
        newReason: getReasonLabel(sanitizedReason)
      });
      return;
    }
    
    // Otherwise, update directly
    setUnselectedWorkerReasons(prev => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        reason: sanitizedReason,
        originalReason: prev[workerId]?.originalReason || prev[workerId]?.reason
      }
    }));
  }, [unselectedWorkerReasons, teamMembers, getReasonLabel, sanitizeInput]);

  const handleNotesChange = useCallback((workerId: string, notes: string) => {
    const sanitizedNotes = sanitizeInput(notes);
    setUnselectedWorkerReasons(prev => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        notes: sanitizedNotes
      }
    }));
  }, [sanitizeInput]);

  const handleConfirmUpdate = useCallback(() => {
    const { workerId, newReason } = confirmationDialog;
    const reasonValue = REASON_OPTIONS.find(opt => opt.label === newReason)?.value || '';
    
    setUnselectedWorkerReasons(prev => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        reason: reasonValue,
        originalReason: prev[workerId]?.originalReason || prev[workerId]?.reason
      }
    }));
    
    setConfirmationDialog(prev => ({ ...prev, open: false }));
  }, [confirmationDialog]);

  const handleCancelUpdate = useCallback(() => {
    setConfirmationDialog(prev => ({ ...prev, open: false }));
  }, []);

  const handleCloseValidationModal = useCallback(() => {
    setValidationModal(prev => ({ ...prev, open: false }));
  }, []);

  const handleCloseCase = useCallback((caseId: string, workerId: string) => {
    // Validate inputs
    if (!caseId || !workerId) {
      setError('Invalid case or worker ID');
      return;
    }
    
    const worker = teamMembers.find(m => m.id === workerId);
    const workerName = worker ? `${worker.first_name} ${worker.last_name}` : 'Unknown Worker';
    
    setCloseCaseDialog({
      open: true,
      caseId,
      workerId,
      workerName
    });
  }, [teamMembers]);

  const handleConfirmCloseCase = useCallback(async () => {
    try {
      setSaving(true);
      setError(null);
      
      const { caseId, workerId, workerName } = closeCaseDialog;
      
      if (!caseId || !workerId) {
        setError('Invalid case or worker ID');
        return;
      }
      
      const supabaseAPI = new SupabaseAPI();
      const result = await supabaseAPI.closeUnselectedWorkerCase(caseId);
      
      if (result.success) {
        setSuccess(`Successfully closed case for ${workerName}!`);
        
        // Update local state to reflect the closed case
        setUnselectedWorkerReasons(prev => ({
          ...prev,
          [workerId]: {
            ...prev[workerId],
            caseStatus: 'closed'
          }
        }));
        
        // Refresh data to ensure consistency
        await Promise.all([loadUnselectedReasons(), loadClosedCases()]);
      } else {
        setError(`Failed to close case for ${workerName}: ${result.error}`);
      }
    } catch (error) {
      console.error('Error closing case:', error);
      setError('Error closing case. Please try again.');
    } finally {
      setSaving(false);
      setCloseCaseDialog(prev => ({ ...prev, open: false }));
    }
  }, [closeCaseDialog, loadUnselectedReasons, loadClosedCases]);

  const handleCancelCloseCase = useCallback(() => {
    setCloseCaseDialog(prev => ({ ...prev, open: false }));
  }, []);

  const handleShowHistory = useCallback(async (workerId: string, workerName: string) => {
    if (!workerId) {
      setError('Invalid worker ID');
      return;
    }
    
    try {
      setLoading(true);
      const supabaseAPI = new SupabaseAPI();
      const response = await supabaseAPI.getClosedUnselectedWorkerCases(workerId);
      
      if (response.success && response.data) {
        setSelectedWorkerHistory(response.data);
        setSelectedWorkerName(sanitizeInput(workerName));
        setShowHistoryModal(true);
      } else {
        setError('Failed to load worker history');
      }
    } catch (err) {
      console.error('Error loading worker history:', err);
      setError('Failed to load worker history');
    } finally {
      setLoading(false);
    }
  }, [sanitizeInput]);

  const handleCloseHistoryModal = useCallback(() => {
    setShowHistoryModal(false);
    setSelectedWorkerHistory([]);
    setSelectedWorkerName('');
  }, []);

  const handleWorkerSelection = useCallback((workerId: string, checked: boolean) => {
    if (!workerId) return;
    
    setSelectedWorkers(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(workerId);
      } else {
        newSet.delete(workerId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      // Only select workers who don't have existing cases
      const selectableWorkerIds = new Set(
        paginationData.currentMembers
          .filter(member => {
            const reasonData = unselectedWorkerReasons[member.id];
            return !reasonData?.hasExistingCase;
          })
          .map(member => member.id)
      );
      setSelectedWorkers(selectableWorkerIds);
    } else {
      setSelectedWorkers(new Set());
    }
  }, [paginationData.currentMembers, unselectedWorkerReasons]);

  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    setSelectedWorkers(new Set()); // Clear selection when switching tabs
    setCurrentPage(1); // Reset to first page
  }, []);

  // Memoized clear selection handler
  const handleClearSelection = useCallback(() => {
    setSelectedWorkers(new Set());
  }, []);

  // Memoized filtered members based on active tab
  const tabFilteredMembers = useMemo((): TeamMember[] => {
    if (activeTab === 0) {
      // All workers - only show those WITHOUT any cases (no open cases, no closed cases)
      return filteredMembers.filter(member => {
        const reasonData = unselectedWorkerReasons[member.id];
        // Only show workers who have NO cases at all
        return !reasonData?.hasExistingCase;
      });
      } else if (activeTab === 1) {
      // Workers with existing open cases only
      return filteredMembers.filter(member => {
        const reasonData = unselectedWorkerReasons[member.id];
        return reasonData?.hasExistingCase && reasonData?.caseStatus !== 'closed';
      });
      } else if (activeTab === 2) {
        // Closed Cases tab - show workers from closed_unselected_workers table
        return closedCasesData.map(closedCase => ({
          id: closedCase.worker_id,
          first_name: closedCase.worker?.first_name || 'Unknown',
          last_name: closedCase.worker?.last_name || 'Worker',
          email: closedCase.worker?.email || ''
        }));
      }
    return filteredMembers;
  }, [activeTab, filteredMembers, unselectedWorkerReasons, closedCasesData]);

  // Memoized tab pagination calculations
  const tabPaginationData = useMemo(() => {
    const tabTotalPages = Math.ceil(tabFilteredMembers.length / ITEMS_PER_PAGE);
    const tabStartIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const tabEndIndex = tabStartIndex + ITEMS_PER_PAGE;
  const tabCurrentMembers = tabFilteredMembers.slice(tabStartIndex, tabEndIndex);

    return { tabTotalPages, tabStartIndex, tabEndIndex, tabCurrentMembers };
  }, [tabFilteredMembers, currentPage]);

  // Memoized statistics calculations for better performance
  const statisticsData = useMemo(() => {
    const openCasesCount = filteredMembers.filter(member => {
      const reasonData = unselectedWorkerReasons[member.id];
      return reasonData?.hasExistingCase && reasonData?.caseStatus !== 'closed';
    }).length;

    const availableWorkersCount = filteredMembers.filter(member => {
      const reasonData = unselectedWorkerReasons[member.id];
      return !reasonData?.hasExistingCase;
    }).length;

    const closedCasesCount = closedCasesData.length;

    return {
      openCasesCount,
      availableWorkersCount,
      closedCasesCount
    };
  }, [filteredMembers, unselectedWorkerReasons, closedCasesData]);

  const saveUnselectedReasons = useCallback(async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const { data: { session } } = await authClient.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Validation: Check if any workers are selected
      if (selectedWorkers.size === 0) {
        setError('Please select at least one worker to save reasons for.');
        return;
      }

      // Validation: Check if there are any workers with reasons that don't have existing cases
      const workersToSave = Object.entries(unselectedWorkerReasons).filter(([workerId, data]) => 
        data.reason && selectedWorkers.has(workerId)
      );
      const workersWithoutExistingCases = workersToSave.filter(([_, data]) => !data.hasExistingCase);

      // Validation: Check if selected workers have reasons
      if (workersToSave.length === 0) {
        setError('Please add reasons for the selected workers before saving.');
        return;
      }

      // Additional validation: Check database for existing records
      const supabaseAPI = new SupabaseAPI();
      const existingDataResponse = await supabaseAPI.getUnselectedWorkerReasons(teamLeaderId);
      
      if (existingDataResponse.success && existingDataResponse.data) {
        const existingWorkerIds = new Set(existingDataResponse.data.map((item: unknown) => 
          (item as { worker_id: string }).worker_id
        ));
        const workersWithReasonsInDB = workersToSave.filter(([workerId, _]) => existingWorkerIds.has(workerId));

        // If all workers with reasons already exist in database, check if reasons are the same
        if (workersToSave.length > 0 && workersWithReasonsInDB.length === workersToSave.length) {
          const allSameAsDB = workersToSave.every(([workerId, data]) => {
            const dbRecord = existingDataResponse.data.find((item: unknown) => 
              (item as { worker_id: string }).worker_id === workerId
            );
            return dbRecord && (dbRecord as { reason: string }).reason === data.reason;
          });
          
          if (allSameAsDB) {
            setValidationModal({
              open: true,
              title: 'Users Already Have Cases',
              message: 'All selected workers already have existing unselected cases in the database with the same reasons. Please close these cases if you want to create new ones.',
              type: 'warning'
            });
            return;
          }
        }
      }

      // If all workers with reasons already have existing cases, show warning
      if (workersToSave.length > 0 && workersWithoutExistingCases.length === 0) {
        const allSameAsOriginal = workersToSave.every(([_, data]) => 
          data.hasExistingCase && data.reason === data.originalReason
        );
        
        if (allSameAsOriginal) {
          setValidationModal({
            open: true,
            title: 'Users Already Have Cases',
            message: 'All selected workers already have existing unselected cases with the same reasons. Please close these cases if you want to create new ones.',
            type: 'warning'
          });
          return;
        }
      }

      // Save each selected worker's reason
      const savePromises = Object.entries(unselectedWorkerReasons)
        .filter(([workerId, _]) => selectedWorkers.has(workerId))
        .map(async ([workerId, reasonData]) => {
        if (reasonData.reason) {
          const saveData = {
            team_leader_id: teamLeaderId,
            worker_id: workerId,
              reason: sanitizeInput(reasonData.reason),
              notes: sanitizeInput(reasonData.notes || '')
          };
          
          const result = await supabaseAPI.saveUnselectedWorkerReason(saveData);
          
          // Determine if this is an update or new save
          const isUpdate = reasonData.hasExistingCase && 
                          reasonData.existingCaseId && 
                          reasonData.reason !== reasonData.originalReason;
          
          return {
            ...result,
            isUpdate,
            workerId: workerId
          };
        }
          return { success: true, isUpdate: false, workerId } as SaveResult & { isUpdate: boolean; workerId: string };
      });

      const results = await Promise.all(savePromises);
      
      // Check if any saves failed
      const failedSaves = results.filter(result => result && !result.success) as SaveResult[];
      if (failedSaves.length > 0) {
        // Check if it's a backend connection issue
        const isBackendError = failedSaves.some(failed => 
          failed.error?.includes('Failed to fetch') || 
          failed.error?.includes('NetworkError') ||
          failed.error?.includes('fetch')
        );
        
        if (isBackendError) {
          setError(`Backend server is not running. Please start the backend server on port 5001, or the system will use direct database access as fallback. ${failedSaves.length} saves failed.`);
        } else {
          const errorMessages = failedSaves.map(failed => failed.error || 'Unknown error').join(', ');
          setError(`${failedSaves.length} saves failed: ${errorMessages}`);
        }
        return;
      }
      
      // Count new saves vs updates
      const successfulResults = results.filter(result => result && result.success);
      const newSaves = successfulResults.filter(result => !result.isUpdate).length;
      const updates = successfulResults.filter(result => result.isUpdate).length;
      
      // Generate appropriate success message
      let successMessage = '';
      if (newSaves > 0 && updates > 0) {
        successMessage = `Successfully saved ${newSaves} new reasons and updated ${updates} existing cases!`;
      } else if (newSaves > 0) {
        successMessage = `Successfully saved ${newSaves} new unselected worker reasons!`;
      } else if (updates > 0) {
        successMessage = `Successfully updated ${updates} existing unselected worker cases!`;
      } else {
        successMessage = 'No changes to save.';
      }
      
      setSuccess(successMessage);
    } catch (err) {
      console.error('Error saving unselected reasons:', err);
      setError(err instanceof Error ? err.message : 'Failed to save reasons');
    } finally {
      setSaving(false);
    }
  }, [selectedWorkers, unselectedWorkerReasons, teamLeaderId, sanitizeInput]);

  // Memoized refresh handler with debouncing
  const handleRefresh = useCallback(async () => {
    try {
      setLoading(true);
      
      // Use Promise.allSettled to handle errors gracefully
      const results = await Promise.allSettled([
        fetchTeamMembers(),
        loadUnselectedReasons(),
        loadClosedCases(),
        checkBackendStatus()
      ]);
      
      // Log any failures but don't throw
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const operations = ['fetchTeamMembers', 'loadUnselectedReasons', 'loadClosedCases', 'checkBackendStatus'];
          console.warn(`Refresh failed for ${operations[index]}:`, result.reason);
        }
      });
      
    } catch (error) {
      console.error('Error during refresh:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchTeamMembers, loadUnselectedReasons, loadClosedCases, checkBackendStatus]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header with improved description */}
      <Box sx={{ mb: 4, borderLeft: '4px solid #4F46E5', pl: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#0F172A', mb: 1 }}>
          Unselected Workers Management
        </Typography>
        <Typography variant="body1" sx={{ color: '#64748B' }}>
          Select workers and specify reasons why they are not included in work readiness assignments
        </Typography>
        <Box sx={{ display: 'flex', mt: 2, gap: 2 }}>
          <Chip 
            icon={<InfoIcon fontSize="small" />} 
            label="Step 1: Select workers" 
            variant="outlined" 
            size="small"
            sx={{ bgcolor: '#F0F9FF', borderColor: '#93C5FD' }}
          />
          <Chip 
            icon={<InfoIcon fontSize="small" />} 
            label="Step 2: Assign reasons" 
            variant="outlined" 
            size="small"
            sx={{ bgcolor: '#F0F9FF', borderColor: '#93C5FD' }}
          />
          <Chip 
            icon={<InfoIcon fontSize="small" />} 
            label="Step 3: Save changes" 
            variant="outlined" 
            size="small"
            sx={{ bgcolor: '#F0F9FF', borderColor: '#93C5FD' }}
          />
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

      {/* Search Bar */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search team members by name or email..."
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#64748B' }} />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton
                  onClick={handleClearSearch}
                  edge="end"
                  size="small"
                >
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            )
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              '&:hover fieldset': {
                borderColor: '#4F46E5',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#4F46E5',
              }
            }
          }}
        />
      </Box>

      {/* Statistics Cards */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {/* Open Cases Card */}
          <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
            <Card sx={{ 
              borderRadius: 3, 
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
              border: '1px solid #F59E0B'
            }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#92400E', mb: 1 }}>
                      {statisticsData.openCasesCount}
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#B45309', mb: 1 }}>
                      Open Cases
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#A16207' }}>
                      Active unselected worker cases requiring attention
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    bgcolor: '#F59E0B', 
                    borderRadius: '50%', 
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <AssignmentIcon sx={{ fontSize: 32, color: 'white' }} />
                  </Box>
                </Box>
                <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    icon={<WarningIcon />}
                    label="Needs Review"
                    size="small"
                    sx={{ 
                      bgcolor: '#FEF3C7', 
                      color: '#92400E',
                      border: '1px solid #F59E0B',
                      fontWeight: 600
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* Closed Cases Card */}
          <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
            <Card sx={{ 
              borderRadius: 3, 
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              background: 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)',
              border: '1px solid #10B981'
            }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#065F46', mb: 1 }}>
                      {statisticsData.closedCasesCount}
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#047857', mb: 1 }}>
                      Closed Cases
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#064E3B' }}>
                      Completed cases - workers available for assignments
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    bgcolor: '#10B981', 
                    borderRadius: '50%', 
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <CheckCircleOutlinedIcon sx={{ fontSize: 32, color: 'white' }} />
                  </Box>
                </Box>
                <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    icon={<CheckCircleIcon />}
                    label="Completed"
                    size="small"
                    sx={{ 
                      bgcolor: '#D1FAE5', 
                      color: '#065F46',
                      border: '1px solid #10B981',
                      fontWeight: 600
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Box>
      <Box sx={{ mb: 3 }}>
        <Paper 
          elevation={0} 
          sx={{ 
            p: 2, 
            borderRadius: 2, 
            border: '1px solid #E2E8F0', 
            bgcolor: '#F8FAFC',
            mb: 2
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ 
                bgcolor: '#EFF6FF', 
                py: 0.5, 
                px: 1.5, 
                borderRadius: 2,
                border: '1px solid #BFDBFE',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <Typography variant="body2" fontWeight={600} color="#1E40AF">
                  {tabPaginationData.tabStartIndex + 1}-{Math.min(tabPaginationData.tabEndIndex, tabFilteredMembers.length)} of {tabFilteredMembers.length}
          </Typography>
                <Typography variant="body2" color="#3B82F6">
                  team members {searchTerm && <span>filtered by "<strong>{searchTerm}</strong>"</span>}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip
                  icon={<PersonOffIcon fontSize="small" />}
                  label={`${Object.keys(unselectedWorkerReasons).length} with reasons`}
            color="warning"
            size="small"
                  sx={{ 
                    fontWeight: 500,
                    '& .MuiChip-icon': { fontSize: '0.875rem' }
                  }}
          />
                <Tooltip title={backendStatus === 'online' 
                  ? "Backend server is connected and working properly" 
                  : "Backend server is offline, using direct database access"
                }>
          <Chip
                    icon={backendStatus === 'online' ? <CheckCircleIcon fontSize="small" /> : <WarningIcon fontSize="small" />}
            label={backendStatus === 'online' ? 'Backend Online' : 'Backend Offline'}
            color={backendStatus === 'online' ? 'success' : 'warning'}
            size="small"
            variant="outlined"
                    sx={{ 
                      fontWeight: 500,
                      '& .MuiChip-icon': { fontSize: '0.875rem' }
                    }}
          />
                </Tooltip>
        </Box>
            </Box>
          </Box>
        </Paper>
        
        {/* Action buttons in a separate card for emphasis */}
        <Paper 
          elevation={0} 
          sx={{ 
            p: 2, 
            borderRadius: 2, 
            border: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Typography variant="subtitle2" color="#4B5563">
            Actions
          </Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
              onClick={handleRefresh}
            disabled={loading}
              sx={{
                borderColor: '#D1D5DB',
                color: '#4B5563',
                '&:hover': {
                  borderColor: '#9CA3AF',
                  bgcolor: '#F9FAFB'
                }
              }}
            >
              Refresh Data
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={saveUnselectedReasons}
            disabled={saving || selectedWorkers.size === 0}
            sx={{
              bgcolor: '#4F46E5',
                fontWeight: 600,
                px: 3,
              '&:hover': { bgcolor: '#4338CA' },
              '&:disabled': {
                bgcolor: '#D1D5DB',
                color: '#9CA3AF'
              }
            }}
          >
              {saving ? 'Saving...' : `Save Changes (${selectedWorkers.size})`}
          </Button>
        </Box>
        </Paper>
      </Box>

      {/* Enhanced Tabs with better visual cues */}
      <Box sx={{ mb: 4 }}>
        <Paper 
          elevation={0} 
          sx={{ 
            borderRadius: 2, 
            overflow: 'hidden',
            border: '1px solid #E2E8F0',
            mb: 2
          }}
        >
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
            variant="fullWidth"
          sx={{
              bgcolor: '#F8FAFC',
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
                minHeight: 56,
                py: 1.5,
              '&.Mui-selected': {
                  color: '#4F46E5',
                  bgcolor: 'white'
              }
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#4F46E5',
              height: 3,
              borderRadius: '2px 2px 0 0'
            }
          }}
        >
          <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonOffIcon fontSize="small" />
                  <Box>
                    <Typography fontWeight={600}>All Workers</Typography>
                    <Typography variant="caption" sx={{ display: 'block', color: '#64748B' }}>
                      {statisticsData.availableWorkersCount} available workers
                    </Typography>
                  </Box>
                </Box>
              }
          />
          <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AssignmentIcon fontSize="small" />
                  <Box>
                    <Typography fontWeight={600}>Open Cases</Typography>
                    <Typography variant="caption" sx={{ display: 'block', color: '#64748B' }}>
                      {statisticsData.openCasesCount} active cases
                    </Typography>
                  </Box>
                </Box>
              }
          />
          <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleOutlinedIcon fontSize="small" />
                  <Box>
                    <Typography fontWeight={600}>Closed Cases</Typography>
                    <Typography variant="caption" sx={{ display: 'block', color: '#64748B' }}>
                      {statisticsData.closedCasesCount} completed
                    </Typography>
                  </Box>
                </Box>
              }
          />
        </Tabs>
        </Paper>
        
        {/* Tab description */}
        <Box sx={{ px: 2, py: 1.5, bgcolor: '#F0F9FF', borderRadius: 2, border: '1px solid #BFDBFE' }}>
          {activeTab === 0 && (
            <Typography variant="body2" color="#1E40AF">
              <strong>All Workers:</strong> View and select team members who don't have any unselected cases yet. You can assign reasons for workers not included in work readiness assignments.
            </Typography>
          )}
          {activeTab === 1 && (
            <Typography variant="body2" color="#1E40AF">
              <strong>Open Cases:</strong> View workers with active unselected cases. You can update reasons or close cases when workers become available again.
            </Typography>
          )}
          {activeTab === 2 && (
            <Typography variant="body2" color="#1E40AF">
              <strong>Closed Cases:</strong> View history of previously closed unselected worker cases. These workers are now available for assignments.
            </Typography>
          )}
        </Box>
      </Box>

      {/* Enhanced Selection Summary with visual progress */}
      {tabPaginationData.tabCurrentMembers.length > 0 && (
        <Box sx={{ mb: 3, p: 2, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E2E8F0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip 
                icon={<PersonOffIcon fontSize="small" />} 
                label={`${selectedWorkers.size} selected`} 
                color={selectedWorkers.size > 0 ? "primary" : "default"}
                variant={selectedWorkers.size > 0 ? "filled" : "outlined"}
                size="small"
              />
          <Typography variant="body2" color="text.secondary">
                of <strong>{tabPaginationData.tabCurrentMembers.length}</strong> workers on this page
            {selectedWorkers.size > 0 && (
                  <span> • {selectedWorkers.size === tabPaginationData.tabCurrentMembers.length ? 'All selected' : 'Partial selection'}</span>
            )}
          </Typography>
        </Box>
            
            {selectedWorkers.size > 0 && (
              <Button 
                variant="text" 
                size="small" 
                onClick={handleClearSelection}
                sx={{ color: '#6B7280', fontSize: '0.75rem' }}
              >
                Clear selection
              </Button>
            )}
          </Box>
          
          {/* Progress bar */}
          {tabPaginationData.tabCurrentMembers.length > 0 && (
            <Box sx={{ mt: 1.5, width: '100%', bgcolor: '#E5E7EB', borderRadius: 5, height: 8 }}>
              <Box 
                sx={{ 
                  width: `${(selectedWorkers.size / tabPaginationData.tabCurrentMembers.length) * 100}%`, 
                  bgcolor: selectedWorkers.size > 0 ? '#4F46E5' : '#E5E7EB',
                  height: '100%',
                  borderRadius: 5,
                  transition: 'width 0.3s ease'
                }} 
              />
            </Box>
          )}
        </Box>
      )}

      {/* Team Members Table with enhanced visual design */}
      <Card sx={{ borderRadius: 2, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
        <Box sx={{ p: 2, borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" fontWeight={600} color="#111827">
            {activeTab === 0 ? 'Team Members' : activeTab === 1 ? 'Open Cases' : 'Closed Cases'}
          </Typography>
          
          {activeTab !== 2 && (
            <Tooltip title="Select all eligible workers">
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={(() => {
                        const selectableMembers = tabPaginationData.tabCurrentMembers.filter(member => {
                            const reasonData = unselectedWorkerReasons[member.id];
                            return !reasonData?.hasExistingCase;
                          });
                          return selectedWorkers.size === selectableMembers.length && selectableMembers.length > 0;
                      })()}
                      indeterminate={(() => {
                        const selectableMembers = tabPaginationData.tabCurrentMembers.filter(member => {
                          const reasonData = unselectedWorkerReasons[member.id];
                          return !reasonData?.hasExistingCase;
                        });
                        return selectedWorkers.size > 0 && selectedWorkers.size < selectableMembers.length;
                      })()}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      sx={{ 
                        color: '#6B7280',
                        '&.Mui-checked': {
                          color: '#4F46E5',
                        },
                      }}
                    />
                  }
                  label={
                    <Typography variant="body2" color="#4B5563" fontWeight={500}>
                      Select All
                    </Typography>
                  }
                />
              </Box>
            </Tooltip>
          )}
        </Box>
        
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                  <TableCell sx={{ fontWeight: 600, color: '#374151', width: 50 }}>
                    {/* Empty header for checkbox column */}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#374151' }}>Team Member</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#374151' }}>
                    <Tooltip title="Specify why this worker is not included in assignments">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        Reason
                        <InfoOutlinedIcon fontSize="small" sx={{ color: '#6B7280', fontSize: '16px' }} />
                      </Box>
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#374151' }}>Additional Notes</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#374151' }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tabPaginationData.tabCurrentMembers.length > 0 ? (
                  tabPaginationData.tabCurrentMembers.map((member) => {
                    const reasonData = unselectedWorkerReasons[member.id];
                    const hasReason = reasonData?.reason;
                    
                    // For closed cases tab, get the closed case data
                    const closedCaseData = activeTab === 2 ? 
                      closedCasesData.find(case_ => case_.worker_id === member.id) : null;
                    
                    return (
                      <TableRow key={member.id} sx={{ '&:hover': { bgcolor: '#F8FAFC' } }}>
                        <TableCell sx={{ width: 50 }}>
                            <Checkbox
                              checked={selectedWorkers.has(member.id)}
                              onChange={(e) => handleWorkerSelection(member.id, e.target.checked)}
                              disabled={reasonData?.hasExistingCase || activeTab === 2}
                              sx={{ 
                                p: 0.5,
                                '&.Mui-disabled': {
                                  color: '#D1D5DB'
                                }
                              }}
                            />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box
                              sx={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                bgcolor: hasReason ? '#F59E0B' : '#E5E7EB',
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
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" fontWeight={600}>
                                  {member.first_name} {member.last_name}
                                </Typography>
                                {reasonData?.hasExistingCase && (
                                  <Box display="flex" alignItems="center" gap={1}>
                                    <Tooltip title="Worker has open unselected case">
                                      <Chip
                                        icon={<AssignmentIcon />}
                                        label="Open Case"
                                        size="small"
                                        color="info"
                                        variant="outlined"
                                        sx={{ fontSize: '0.7rem', height: 20 }}
                                      />
                                    </Tooltip>
                                    <Tooltip title="View Case History">
                                      <IconButton
                                        size="small"
                                        onClick={() => handleShowHistory(member.id, `${member.first_name} ${member.last_name}`)}
                                        sx={{ 
                                          p: 0.5,
                                          color: 'primary.main',
                                          '&:hover': { bgcolor: 'primary.50' }
                                        }}
                                      >
                                        <HistoryIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                )}
                              </Box>
                              <Typography variant="caption" color="text.secondary">
                                {member.email}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        
                        <TableCell>
                          {activeTab === 2 ? (
                            <Box>
                              <Typography variant="body2" fontWeight={600}>
                                {getReasonLabel(closedCaseData?.reason || '')}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Closed: {closedCaseData?.closed_at ? new Date(closedCaseData.closed_at).toLocaleDateString() : 'N/A'}
                              </Typography>
                            </Box>
                          ) : (
                            <TextField
                              select
                              value={reasonData?.reason || ''}
                              onChange={(e) => handleReasonChange(member.id, e.target.value)}
                              size="small"
                              SelectProps={{ 
                                native: true,
                              }}
                              label="Select reason"
                              InputLabelProps={{
                                shrink: true,
                                sx: { color: '#6B7280' }
                              }}
                              disabled={false}
                              sx={{ 
                                minWidth: 200,
                                '& .MuiInputBase-input.Mui-disabled': {
                                  WebkitTextFillColor: '#9CA3AF',
                                  opacity: 0.7
                                },
                                '& .MuiOutlinedInput-root': {
                                  '&:hover fieldset': {
                                    borderColor: '#4F46E5',
                                  },
                                  '&.Mui-focused fieldset': {
                                    borderColor: '#4F46E5',
                                  }
                                },
                                '& .MuiInputLabel-root.Mui-focused': {
                                  color: '#4F46E5'
                                }
                              }}
                              helperText={!reasonData?.reason ? "Required" : ""}
                            >
                              <option value="">Select a reason...</option>
                              {REASON_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </TextField>
                          )}
                        </TableCell>
                        
                        <TableCell>
                          {activeTab === 2 ? (
                            <Box>
                              <Typography variant="body2">
                                {closedCaseData?.notes || 'No notes'}
                              </Typography>
                            </Box>
                          ) : (
                            <TextField
                              value={reasonData?.notes || ''}
                              onChange={(e) => handleNotesChange(member.id, e.target.value)}
                              size="small"
                                  placeholder="Add notes here (optional)"
                              disabled={false}
                                  multiline
                                  maxRows={2}
                                  InputProps={{
                                    startAdornment: (
                                      <InputAdornment position="start">
                                        <InfoOutlinedIcon fontSize="small" sx={{ color: '#9CA3AF', fontSize: '16px' }} />
                                      </InputAdornment>
                                    ),
                                  }}
                              sx={{ 
                                minWidth: 250,
                                '& .MuiInputBase-input.Mui-disabled': {
                                  WebkitTextFillColor: '#9CA3AF',
                                  opacity: 0.7
                                    },
                                    '& .MuiOutlinedInput-root': {
                                      '&:hover fieldset': {
                                        borderColor: '#4F46E5',
                                      },
                                      '&.Mui-focused fieldset': {
                                        borderColor: '#4F46E5',
                                      }
                                }
                              }}
                            />
                          )}
                        </TableCell>
                        
                        <TableCell>
                          {activeTab === 2 ? (
                            <Box display="flex" alignItems="center" gap={1}>
                              <Chip
                                icon={<CheckCircleIcon />}
                                label="Closed Case"
                                color="success"
                                size="small"
                                sx={{ 
                                  fontSize: '0.8rem', 
                                  height: 36,
                                  fontWeight: 600,
                                  borderRadius: 2
                                }}
                              />
                              <Tooltip title="View Case History">
                                <IconButton
                                  size="small"
                                  onClick={() => handleShowHistory(member.id, `${member.first_name} ${member.last_name}`)}
                                  sx={{ 
                                    p: 0.5,
                                    color: 'primary.main',
                                    '&:hover': { bgcolor: 'primary.50' }
                                  }}
                                >
                                  <HistoryIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          ) : hasReason ? (
                            reasonData?.existingCaseId ? (
                              <Button
                                size="small"
                                variant="contained"
                                color="error"
                                onClick={() => handleCloseCase(reasonData.existingCaseId!, member.id)}
                                disabled={saving}
                                sx={{ 
                                  fontSize: '0.8rem', 
                                  height: 36, 
                                  minWidth: 110,
                                  textTransform: 'none',
                                  fontWeight: 600,
                                  borderRadius: 2,
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                  bgcolor: '#DC2626',
                                  color: 'white',
                                  '&:hover': {
                                    bgcolor: '#B91C1C',
                                    boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
                                    transform: 'translateY(-1px)'
                                  },
                                  '&:active': {
                                    transform: 'translateY(0)',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                  },
                                  '&:disabled': {
                                    bgcolor: '#D1D5DB',
                                    color: '#9CA3AF',
                                    boxShadow: 'none',
                                    transform: 'none'
                                  }
                                }}
                              >
                                {saving ? 'Closing...' : 'Close Case'}
                              </Button>
                            ) : (
                              <Chip
                                icon={<CheckCircleIcon />}
                                label={getReasonLabel(reasonData.reason)}
                                color={getReasonColor(reasonData.reason) as any}
                                size="small"
                                sx={{ 
                                  fontSize: '0.8rem', 
                                  height: 36,
                                  fontWeight: 600,
                                  borderRadius: 2
                                }}
                              />
                            )
                          ) : (
                            <Chip
                              icon={<WarningIcon />}
                              label="No reason specified"
                              color="default"
                              size="small"
                              sx={{ 
                                fontSize: '0.8rem', 
                                height: 36,
                                fontWeight: 600,
                                borderRadius: 2,
                                bgcolor: '#FEF3C7',
                                color: '#92400E',
                                border: '1px solid #F59E0B'
                              }}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ textAlign: 'center', py: 4 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <SearchIcon sx={{ fontSize: 48, color: '#E5E7EB' }} />
                        <Typography variant="body1" color="text.secondary">
                          {searchTerm ? `No team members found matching "${searchTerm}"` : 'No team members available'}
                        </Typography>
                        {searchTerm && (
                          <Button
                            variant="outlined"
                            onClick={handleClearSearch}
                            startIcon={<ClearIcon />}
                            size="small"
                          >
                            Clear search
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Enhanced Pagination with page size selector */}
      {tabPaginationData.tabTotalPages > 1 && (
        <Paper 
          elevation={0}
          sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            mt: 3,
            p: 2,
            borderRadius: 2,
            border: '1px solid #E2E8F0',
            bgcolor: '#F8FAFC'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" color="#6B7280">
              Page {currentPage} of {tabPaginationData.tabTotalPages}
            </Typography>
            
          <Pagination
              count={tabPaginationData.tabTotalPages}
            page={currentPage}
            onChange={handlePageChange}
            color="primary"
            size="large"
            showFirstButton
            showLastButton
            sx={{
              '& .MuiPaginationItem-root': {
                fontSize: '0.875rem',
                fontWeight: 600,
              },
              '& .Mui-selected': {
                backgroundColor: '#4F46E5',
                color: 'white',
                '&:hover': {
                  backgroundColor: '#4338CA',
                },
              },
            }}
          />
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="#6B7280">
                {tabFilteredMembers.length} items
              </Typography>
        </Box>
          </Box>
        </Paper>
      )}

      {/* Enhanced Help Section */}
      <Paper 
        elevation={0}
        sx={{ 
          mt: 4, 
          mb: 2,
          p: 2.5, 
          borderRadius: 2,
          border: '1px solid #BFDBFE',
          bgcolor: '#EFF6FF'
        }}
      >
        <Box sx={{ display: 'flex', gap: 2 }}>
          <InfoIcon sx={{ color: '#2563EB', fontSize: 24 }} />
          <Box>
            <Typography variant="subtitle1" fontWeight={600} color="#1E40AF" gutterBottom>
              How to use this page
        </Typography>
            <Box component="ul" sx={{ pl: 2, mb: 0, mt: 1 }}>
              <Typography component="li" variant="body2" color="#3B82F6" paragraph sx={{ mb: 1 }}>
                <strong>Step 1:</strong> Select workers who should not be included in work readiness assignments
              </Typography>
              <Typography component="li" variant="body2" color="#3B82F6" paragraph sx={{ mb: 1 }}>
                <strong>Step 2:</strong> Choose a reason why each worker is not selected (sick, on leave, etc.)
              </Typography>
              <Typography component="li" variant="body2" color="#3B82F6" paragraph sx={{ mb: 1 }}>
                <strong>Step 3:</strong> Add optional notes for additional context if needed
              </Typography>
              <Typography component="li" variant="body2" color="#3B82F6">
                <strong>Step 4:</strong> Click "Save Changes" to record your selections
              </Typography>
            </Box>
            <Typography variant="body2" color="#1E40AF" sx={{ mt: 2 }}>
              These records help maintain accurate documentation and will be used when creating new assignments.
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmationDialog.open}
        onClose={handleCancelUpdate}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          Update Existing Case
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            This worker already has an existing unselected case. Are you sure you want to update the reason?
          </DialogContentText>
          <Box sx={{ bgcolor: '#F8FAFC', p: 2, borderRadius: 1, mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
              Worker: {confirmationDialog.workerName}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Current reason:
                </Typography>
                <Chip
                  label={confirmationDialog.existingReason}
                  size="small"
                  color="warning"
                  variant="outlined"
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  New reason:
                </Typography>
                <Chip
                  label={confirmationDialog.newReason}
                  size="small"
                  color="success"
                  variant="outlined"
                />
              </Box>
            </Box>
          </Box>
          <DialogContentText variant="body2" color="text.secondary">
            This will update the existing case record in the database.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelUpdate} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleConfirmUpdate} color="primary" variant="contained">
            Update Case
          </Button>
        </DialogActions>
      </Dialog>

      {/* Validation Modal */}
      <Dialog
        open={validationModal.open}
        onClose={handleCloseValidationModal}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 2,
          pb: 1,
          bgcolor: validationModal.type === 'info' ? '#F0F9FF' : validationModal.type === 'warning' ? '#FFFBEB' : '#F0FDF4',
          color: validationModal.type === 'info' ? '#0369A1' : validationModal.type === 'warning' ? '#D97706' : '#059669'
        }}>
          {validationModal.type === 'info' && <InfoOutlinedIcon sx={{ fontSize: 28 }} />}
          {validationModal.type === 'warning' && <WarningIcon sx={{ fontSize: 28 }} />}
          {validationModal.type === 'success' && <CheckCircleOutlinedIcon sx={{ fontSize: 28 }} />}
          <Typography variant="h6" fontWeight={600}>
            {validationModal.title}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 2 }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'flex-start', 
            gap: 2,
            p: 3,
            bgcolor: '#F8FAFC',
            borderRadius: 2,
            border: '1px solid #E2E8F0'
          }}>
            <Box sx={{ 
              width: 40, 
              height: 40, 
              borderRadius: '50%', 
              bgcolor: validationModal.type === 'info' ? '#3B82F6' : validationModal.type === 'warning' ? '#F59E0B' : '#10B981',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {validationModal.type === 'info' && <InfoIcon sx={{ color: 'white', fontSize: 20 }} />}
              {validationModal.type === 'warning' && <WarningIcon sx={{ color: 'white', fontSize: 20 }} />}
              {validationModal.type === 'success' && <CheckCircleIcon sx={{ color: 'white', fontSize: 20 }} />}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.6 }}>
                {validationModal.message}
              </Typography>
              <Box sx={{ 
                p: 2, 
                bgcolor: 'white', 
                borderRadius: 1, 
                border: '1px solid #E2E8F0',
                mt: 2
              }}>
                <Typography variant="body2" color="text.secondary">
                  These workers already have active unselected cases. Close existing cases to proceed with new assignments.
                </Typography>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1, gap: 2 }}>
          <Button 
            onClick={handleCloseValidationModal} 
            variant="outlined"
            sx={{
              color: '#6B7280',
              borderColor: '#D1D5DB',
              px: 4,
              py: 1,
              borderRadius: 2,
              fontWeight: 600,
              '&:hover': {
                borderColor: '#9CA3AF',
                bgcolor: '#F9FAFB'
              }
            }}
          >
            Cancel
          </Button>
          {validationModal.title === 'Users Already Have Cases' && (
            <Button 
              onClick={async () => {
                try {
                  setSaving(true);
                  
                  // Close all existing cases for selected workers
                  const workersToClose = Object.entries(unselectedWorkerReasons)
                    .filter(([_, data]) => data.reason && data.hasExistingCase && data.existingCaseId)
                    .map(([workerId, data]) => ({ workerId, caseId: data.existingCaseId }));
                  
                  if (workersToClose.length === 0) {
                    setError('No existing cases found to close.');
                    setSaving(false);
                    return;
                  }
                  
                  // Close each case
                  const supabaseAPI = new SupabaseAPI();
                  const closePromises = workersToClose.map(async ({ caseId }) => {
                    const result = await supabaseAPI.closeUnselectedWorkerCase(caseId!);
                    return { caseId, success: result.success, error: result.error };
                  });
                  
                  const results = await Promise.all(closePromises);
                  const successfulCloses = results.filter(r => r.success);
                  const failedCloses = results.filter(r => !r.success);
                  
                  if (failedCloses.length > 0) {
                    setError(`Failed to close ${failedCloses.length} cases. Please try again.`);
                  } else {
                    setSuccess(`Successfully closed ${successfulCloses.length} existing cases! You can now create new unselected cases.`);
                    
                    // Refresh the data to reflect the changes
                    await Promise.all([loadUnselectedReasons(), fetchTeamMembers()]);
                  }
                  
                  handleCloseValidationModal();
                } catch (error) {
                  console.error('Error closing cases:', error);
                  setError('Error closing cases. Please try again.');
                } finally {
                  setSaving(false);
                }
              }}
              variant="contained"
              disabled={saving}
              sx={{
                bgcolor: '#F59E0B',
                color: 'white',
                px: 4,
                py: 1,
                borderRadius: 2,
                fontWeight: 600,
                '&:hover': {
                  bgcolor: '#D97706'
                },
                '&:disabled': {
                  bgcolor: '#D1D5DB',
                  color: '#9CA3AF'
                }
              }}
            >
              {saving ? 'Closing Cases...' : 'Close Existing Cases'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Close Case Confirmation Dialog */}
      <Dialog
        open={closeCaseDialog.open}
        onClose={handleCancelCloseCase}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          Close Unselected Case
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Are you sure you want to close this unselected case? This action will mark the case as closed and the worker will be available for future assignments.
          </DialogContentText>
          <Box sx={{ bgcolor: '#F8FAFC', p: 2, borderRadius: 1, mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
              Worker: {closeCaseDialog.workerName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This will close the unselected case and make the worker available for new assignments.
            </Typography>
          </Box>
          <DialogContentText variant="body2" color="text.secondary">
            Once closed, this case cannot be reopened. You can create a new unselected case if needed.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelCloseCase} color="inherit">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmCloseCase} 
            color="warning" 
            variant="contained"
            disabled={saving}
          >
            {saving ? 'Closing...' : 'Close Case'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* History Modal */}
      <Dialog
        open={showHistoryModal}
        onClose={handleCloseHistoryModal}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HistoryIcon color="primary" />
          <Typography variant="h6">
            Case History - {selectedWorkerName}
          </Typography>
        </DialogTitle>
        <DialogContent>
          {selectedWorkerHistory.length === 0 ? (
            <Box textAlign="center" py={4}>
              <Typography variant="body1" color="text.secondary">
                No case history found for this worker.
              </Typography>
            </Box>
          ) : (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" mb={2}>
                Total Cases: {selectedWorkerHistory.length}
              </Typography>
              {selectedWorkerHistory.map((caseItem, index) => (
                <Box
                  key={caseItem.id}
                  sx={{
                    p: 2,
                    mb: 2,
                    border: '1px solid #E5E7EB',
                    borderRadius: 2,
                    bgcolor: caseItem.case_status === 'closed' ? '#F9FAFB' : '#FFFFFF'
                  }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      Case #{index + 1}
                    </Typography>
                    <Chip
                      label={caseItem.case_status === 'closed' ? 'Closed' : 'Open'}
                      color={caseItem.case_status === 'closed' ? 'default' : 'primary'}
                      size="small"
                    />
                  </Box>
                  <Box display="flex" flexDirection="column" gap={1}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Reason:
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                          {getReasonLabel(caseItem.reason || '')}
                      </Typography>
                    </Box>
                    {caseItem.notes && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Notes:
                        </Typography>
                        <Typography variant="body1">
                          {caseItem.notes}
                        </Typography>
                      </Box>
                    )}
                    <Box display="flex" gap={3}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Created:
                        </Typography>
                        <Typography variant="body2">
                          {new Date(caseItem.created_at).toLocaleDateString()}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Updated:
                        </Typography>
                        <Typography variant="body2">
                          {new Date(caseItem.updated_at).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseHistoryModal} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
});

// Add display name for better debugging
UnselectedWorkersManager.displayName = 'UnselectedWorkersManager';

export default UnselectedWorkersManager;
