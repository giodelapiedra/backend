import React, { useState, useEffect, useCallback } from 'react';
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
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

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
  _id: string;
  caseNumber: string;
  status: string;
  priority: string;
  worker: {
    _id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
  clinician?: {
    _id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
  injuryDetails?: {
    bodyPart: string;
    injuryType: string;
    severity: string;
    description: string;
  };
  incident?: {
    incidentNumber: string;
    incidentDate: string;
    incidentType: string;
    severity: string;
  };
  createdAt?: string;
}

interface CaseDetails extends CaseTask {
  clinician?: {
    _id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
  employer?: {
    firstName: string;
    lastName: string;
    email: string;
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
  notes?: Array<{
    content: string;
    author: {
      firstName: string;
      lastName: string;
    };
    timestamp: string;
  }>;
}

const TASKS_PER_PAGE = 8; // Number of tasks to show per column per page

const TaskManagementBoard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskProps[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTasks, setFilteredTasks] = useState<TaskProps[]>([]);
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

  // Sort tasks based on current sort settings
  const sortTasks = useCallback((tasksToSort: TaskProps[]) => {
    return [...tasksToSort].sort((a, b) => {
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
  }, [sortBy, sortOrder]);

  // Get paginated tasks for a specific status
  const getPaginatedTasks = (status: 'to_do' | 'in_progress' | 'revisions' | 'completed') => {
    const statusTasks = filteredTasks.filter(task => task.status === status);
    const startIndex = (currentPage - 1) * TASKS_PER_PAGE;
    const endIndex = startIndex + TASKS_PER_PAGE;
    return statusTasks.slice(startIndex, endIndex);
  };

  // Calculate total pages
  const getTotalPages = () => {
    const maxTasksInColumn = Math.max(
      filteredTasks.filter(task => task.status === 'to_do').length,
      filteredTasks.filter(task => task.status === 'in_progress').length,
      filteredTasks.filter(task => task.status === 'revisions').length,
      filteredTasks.filter(task => task.status === 'completed').length
    );
    return Math.ceil(maxTasksInColumn / TASKS_PER_PAGE);
  };

  // Apply filters and search
  const applyFilters = useCallback((tasksToFilter: TaskProps[]) => {
    return tasksToFilter.filter((task) => {
      // Search filter
      const matchesSearch = searchQuery === '' || (
        task.caseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase())
      );

      // Priority filter
      const matchesPriority = filters.priority.length === 0 || 
        filters.priority.includes(task.priority);

      // Status filter
      const matchesStatus = filters.status.length === 0 || 
        filters.status.includes(task.status);

      // Assignee filter
      const matchesAssignee = filters.assignee.length === 0 || 
        filters.assignee.some(assigneeId => 
          task.assignees.some(assignee => assignee._id === assigneeId)
        );

      return matchesSearch && matchesPriority && matchesStatus && matchesAssignee;
    });
  }, [searchQuery, filters]);

  const fetchAssignedCases = useCallback(async () => {
    try {
      setLoading(true);
      setError(null); // Clear any previous errors
      console.log('Fetching clinician cases...');
      
      const response = await api.get('/cases/clinician-cases');
      console.log('API response:', response.data);
      
      if (!response.data) {
        throw new Error('No data received from API');
      }
      
      if (!Array.isArray(response.data.cases)) {
        console.warn('Invalid cases data:', response.data);
        throw new Error('Invalid data format received from API');
      }
      
      if (response.data.cases.length === 0) {
        console.log('No cases assigned to clinician');
        setTasks([]);
        return;
      }
      
      // Transform cases into task format with error handling for each case
      const caseTasks = response.data.cases.reduce((validTasks: TaskProps[], caseItem: CaseTask) => {
        try {
          if (!caseItem._id || !caseItem.caseNumber) {
            console.warn('Skipping invalid case item:', caseItem);
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
        totalCases: response.data.cases.length,
        validTasks: caseTasks.length
      });
      
      setTasks(caseTasks);
      
      // Show warning if some cases couldn't be transformed
      if (caseTasks.length < response.data.cases.length) {
        console.warn(`${response.data.cases.length - caseTasks.length} cases were skipped due to invalid data`);
      }
      
    } catch (err: any) {
      console.error('Error fetching assigned cases:', err);
      
      // Construct detailed error message
      let errorMessage = 'Failed to fetch assigned cases';
      let errorDetails = '';
      
      if (err.response) {
        errorMessage = err.response.data?.message || errorMessage;
        errorDetails = ` (Status: ${err.response.status})`;
        
        // Log additional error context
        console.error('Error context:', {
          status: err.response.status,
          statusText: err.response.statusText,
          data: err.response.data,
          headers: err.response.headers
        });
      } else if (err.request) {
        errorDetails = ' (No response received from server)';
      } else {
        errorDetails = ` (${err.message})`;
      }
      
      setError(`${errorMessage}${errorDetails}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssignedCases();
  }, [fetchAssignedCases]);

  useEffect(() => {
    if (tasks.length > 0) {
      const filtered = applyFilters(tasks);
      const sorted = sortTasks(filtered);
      setFilteredTasks(sorted);
    }
  }, [searchQuery, tasks, sortBy, sortOrder, filters, applyFilters, sortTasks]);

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
    let title = `Case ${caseItem.caseNumber}`;
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
               caseItem.incident.incidentType) {
        title = `Incident - ${caseItem.incident.incidentType}`;
        description = caseItem.incident.severity ? 
          `Incident severity: ${caseItem.incident.severity}` : 
          'Incident details not available';
        if (caseItem.incident.incidentType) tags.push(caseItem.incident.incidentType);
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
      title = `Case ${caseItem.caseNumber}`;
      description = 'Error loading case details';
      tags = [];
    }
    
    // Calculate a due date (placeholder - 14 days from creation or today)
    let dueDate = new Date();
    if (caseItem.createdAt) {
      dueDate = new Date(caseItem.createdAt);
      dueDate.setDate(dueDate.getDate() + 14); // 14 days from creation
    } else {
      dueDate.setDate(dueDate.getDate() + 14); // 14 days from today
    }
    
    return {
      _id: caseItem._id,
      caseNumber: caseItem.caseNumber,
      title: title,
      description: description,
      priority: caseItem.priority as 'high' | 'medium' | 'low',
      status: taskStatus,
      progress: progress,
      dueDate: dueDate.toISOString().split('T')[0],
      assignees: [caseItem.worker],
      tags: tags
    };
  };

  const handleViewCase = async (caseId: string) => {
    try {
      setLoadingCaseDetails(true);
      const response = await api.get(`/cases/${caseId}`);
      setSelectedCase(response.data.case);
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
      <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Typography color="error">{error}</Typography>
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
            onClick={() => handleOpenFullCase(selectedCase._id)}
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
              count={getTotalPages()} 
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
          
          <Button 
            variant="contained" 
            startIcon={<Add />}
            sx={{ 
              borderRadius: '8px',
              backgroundColor: '#7B68EE',
              '&:hover': { backgroundColor: '#6A5ACD' }
            }}
          >
            New Project
          </Button>
        </Box>
      </Box>

      {/* Task Content */}
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
                <Card 
                  key={task._id} 
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
                  onClick={() => handleViewCase(task._id)}
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
                <Card 
                  key={task._id} 
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
                  onClick={() => handleViewCase(task._id)}
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
                <Card 
                  key={task._id} 
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
                  onClick={() => handleViewCase(task._id)}
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
                <Card 
                  key={task._id} 
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
                  onClick={() => handleViewCase(task._id)}
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

      {/* Filter Dialog */}
      {renderFilterDialog()}

      {/* Case Details Dialog */}
      {renderCaseDetailsDialog()}
    </Box>
  );
};

export default TaskManagementBoard;
