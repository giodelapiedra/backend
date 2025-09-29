import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  CircularProgress,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  InputAdornment,
  Autocomplete,
  Stack,
  Badge,
  Pagination,
  SelectChangeEvent,
} from '@mui/material';
import {
  Timeline,
  CheckCircle,
  Warning,
  Assessment,
  Visibility,
  Refresh,
  FilterList,
  TrendingUp,
  TrendingDown,
  Assignment,
  FitnessCenter,
  LocalHospital,
  Schedule,
  Person,
  Search,
  Clear,
  Sort,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import LayoutWithSidebar from '../../components/LayoutWithSidebar';
import api from '../../utils/api';

interface ActivityLog {
  _id: string;
  worker: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  case: {
    _id: string;
    caseNumber: string;
    status: string;
  };
  rehabilitationPlan?: {
    _id: string;
    planName: string;
    status: string;
  };
  activityType: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'completed' | 'in_progress' | 'pending' | 'cancelled';
  isReviewed: boolean;
  reviewedAt?: string;
  clinicianNotes?: string;
  tags: string[];
  details: any;
  metadata: any;
  createdAt: string;
  updatedAt: string;
}

interface Case {
  _id: string;
  caseNumber: string;
  status: string;
  worker: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  injuryDetails: {
    bodyPart: string;
    injuryType: string;
  };
}

const WorkerActivityMonitor: React.FC = () => {
  const { user } = useAuth();
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [logDialog, setLogDialog] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Filter states
  const [filters, setFilters] = useState({
    worker: '',
    activityType: '',
    priority: '',
    isReviewed: '',
    dateRange: ''
  });
  
  // Priority tab state
  const [selectedPriority, setSelectedPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [activityLogsRes, casesRes] = await Promise.all([
        api.get('/activity-logs'),
        api.get('/cases')
      ]);
      
      setActivityLogs(activityLogsRes.data.logs || []);
      setCases(casesRes.data.cases || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleReviewLog = async () => {
    if (!selectedLog) return;
    
    try {
      setIsReviewing(true);
      await api.put(`/activity-logs/${selectedLog._id}/review`, {
        clinicianNotes: reviewNotes
      });
      
      // Update the log in state
      setActivityLogs(prev => prev.map(log => 
        log._id === selectedLog._id 
          ? { ...log, isReviewed: true, reviewedAt: new Date().toISOString(), clinicianNotes: reviewNotes }
          : log
      ));
      
      setLogDialog(false);
      setReviewNotes('');
      setSelectedLog(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to review log');
    } finally {
      setIsReviewing(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors: { [key: string]: any } = {
      'urgent': 'error',
      'high': 'warning',
      'medium': 'info',
      'low': 'success',
    };
    return colors[priority] || 'default';
  };

  const getActivityTypeIcon = (type: string) => {
    switch (type) {
      case 'exercise_completed':
        return <CheckCircle color="success" />;
      case 'exercise_skipped':
        return <Warning color="warning" />;
      case 'daily_check_in':
        return <Assessment color="info" />;
      default:
        return <Assignment />;
    }
  };

  const getActivityTypeColor = (type: string) => {
    switch (type) {
      case 'exercise_completed':
        return 'success';
      case 'exercise_skipped':
        return 'warning';
      case 'daily_check_in':
        return 'info';
      default:
        return 'default';
    }
  };

  const filteredLogs = activityLogs.filter(log => {
    // Priority tab filter
    if (selectedPriority !== 'all') {
      if (selectedPriority === 'high' && !(log.priority === 'high' || log.priority === 'urgent')) return false;
      if (selectedPriority === 'medium' && log.priority !== 'medium') return false;
      if (selectedPriority === 'low' && log.priority !== 'low') return false;
    }

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const workerName = `${log.worker.firstName} ${log.worker.lastName}`.toLowerCase();
      const caseNumber = log.case.caseNumber.toLowerCase();
      const title = log.title.toLowerCase();
      const description = log.description.toLowerCase();
      
      if (!workerName.includes(searchLower) && 
          !caseNumber.includes(searchLower) && 
          !title.includes(searchLower) && 
          !description.includes(searchLower)) {
        return false;
      }
    }
    
    // Other filters
    if (filters.worker && log.worker._id !== filters.worker) return false;
    if (filters.activityType && log.activityType !== filters.activityType) return false;
    if (filters.priority && log.priority !== filters.priority) return false;
    if (filters.isReviewed !== '' && log.isReviewed !== (filters.isReviewed === 'true')) return false;
    return true;
  }).sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'worker':
        aValue = `${a.worker.firstName} ${a.worker.lastName}`;
        bValue = `${b.worker.firstName} ${b.worker.lastName}`;
        break;
      case 'activityType':
        aValue = a.activityType;
        bValue = b.activityType;
        break;
      case 'priority':
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        aValue = priorityOrder[a.priority as keyof typeof priorityOrder];
        bValue = priorityOrder[b.priority as keyof typeof priorityOrder];
        break;
      case 'createdAt':
      default:
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
        break;
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Pagination logic
  const totalItems = filteredLogs.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters, sortBy, sortOrder]);

  const handlePageChange = (event: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (event: SelectChangeEvent<number>) => {
    setItemsPerPage(event.target.value as number);
    setCurrentPage(1);
  };

  const stats = {
    total: activityLogs.length,
    completed: activityLogs.filter(log => log.activityType === 'exercise_completed').length,
    skipped: activityLogs.filter(log => log.activityType === 'exercise_skipped').length,
    checkIns: activityLogs.filter(log => log.activityType === 'daily_check_in').length,
    reviewed: activityLogs.filter(log => log.isReviewed).length,
    pending: activityLogs.filter(log => !log.isReviewed).length,
  };

  if (loading) {
    return (
      <LayoutWithSidebar>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </LayoutWithSidebar>
    );
  }

  // Get counts for each priority
  const priorityCounts = {
    high: activityLogs.filter(log => log.priority === 'high' || log.priority === 'urgent').length,
    medium: activityLogs.filter(log => log.priority === 'medium').length,
    low: activityLogs.filter(log => log.priority === 'low').length
  };

  return (
    <LayoutWithSidebar>
      <Box sx={{
        p: { xs: 1, sm: 2, md: 3 },
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
      }}>
        {/* Mobile-First Priority Tabs */}
        <Card sx={{ 
          mb: { xs: 2, sm: 3 },
          borderRadius: { xs: 2, sm: 3 },
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          overflow: 'hidden'
        }}>
          <Box sx={{
            p: { xs: 2, sm: 3 },
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Background Pattern */}
            <Box sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '150px',
              height: '150px',
              background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
              borderRadius: '50%',
              transform: 'translate(50%, -50%)'
            }} />
            
            <Box sx={{ zIndex: 1 }}>
              <Box sx={{ 
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 1, sm: 2 },
                mb: { xs: 2, sm: 3 }
              }}>
                <Box sx={{
                  width: { xs: 40, sm: 48 },
                  height: { xs: 40, sm: 48 },
                  borderRadius: { xs: '10px', sm: '12px' },
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                }}>
                  <Timeline sx={{ fontSize: { xs: 24, sm: 28 } }} />
                </Box>
      <Box>
                  <Typography variant="h5" sx={{ 
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                    fontSize: { xs: '1.25rem', sm: '1.5rem' }
                  }}>
                    Activity Monitor
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    opacity: 0.9,
                    fontSize: { xs: '0.75rem', sm: '0.875rem' }
                  }}>
                    Track worker activities and progress
                  </Typography>
                </Box>
              </Box>
              
              {/* Mobile-Optimized Priority Tabs */}
              <Stack 
                direction={{ xs: 'column', sm: 'row' }} 
                spacing={{ xs: 1, sm: 2 }}
                sx={{ 
                  flexWrap: 'wrap',
                  gap: { xs: 1, sm: 2 }
                }}
              >
            <Button
              variant={selectedPriority === 'all' ? 'contained' : 'outlined'}
              onClick={() => setSelectedPriority('all')}
                  sx={{ 
                    borderRadius: { xs: 2, sm: 2 },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    py: { xs: 1, sm: 1.5 },
                    px: { xs: 2, sm: 3 },
                    minWidth: { xs: '120px', sm: '140px' },
                    bgcolor: selectedPriority === 'all' ? 'rgba(255,255,255,0.9)' : 'transparent',
                    color: selectedPriority === 'all' ? 'primary.main' : 'white',
                    borderColor: 'rgba(255,255,255,0.3)',
                    '&:hover': {
                      bgcolor: selectedPriority === 'all' ? 'white' : 'rgba(255,255,255,0.1)',
                      borderColor: 'rgba(255,255,255,0.5)'
                    }
                  }}
                >
                  All ({activityLogs.length})
            </Button>
            <Button
              variant={selectedPriority === 'high' ? 'contained' : 'outlined'}
              onClick={() => setSelectedPriority('high')}
                  sx={{ 
                    borderRadius: { xs: 2, sm: 2 },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    py: { xs: 1, sm: 1.5 },
                    px: { xs: 2, sm: 3 },
                    minWidth: { xs: '120px', sm: '140px' },
                    bgcolor: selectedPriority === 'high' ? 'rgba(255,255,255,0.9)' : 'transparent',
                    color: selectedPriority === 'high' ? 'error.main' : 'white',
                    borderColor: 'rgba(255,255,255,0.3)',
                    '&:hover': {
                      bgcolor: selectedPriority === 'high' ? 'white' : 'rgba(255,255,255,0.1)',
                      borderColor: 'rgba(255,255,255,0.5)'
                    }
                  }}
                  startIcon={<Warning sx={{ fontSize: { xs: 16, sm: 18 } }} />}
                >
                  High ({priorityCounts.high})
            </Button>
            <Button
              variant={selectedPriority === 'medium' ? 'contained' : 'outlined'}
              onClick={() => setSelectedPriority('medium')}
                  sx={{ 
                    borderRadius: { xs: 2, sm: 2 },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    py: { xs: 1, sm: 1.5 },
                    px: { xs: 2, sm: 3 },
                    minWidth: { xs: '120px', sm: '140px' },
                    bgcolor: selectedPriority === 'medium' ? 'rgba(255,255,255,0.9)' : 'transparent',
                    color: selectedPriority === 'medium' ? 'warning.main' : 'white',
                    borderColor: 'rgba(255,255,255,0.3)',
                    '&:hover': {
                      bgcolor: selectedPriority === 'medium' ? 'white' : 'rgba(255,255,255,0.1)',
                      borderColor: 'rgba(255,255,255,0.5)'
                    }
                  }}
                >
                  Medium ({priorityCounts.medium})
            </Button>
            <Button
              variant={selectedPriority === 'low' ? 'contained' : 'outlined'}
              onClick={() => setSelectedPriority('low')}
                  sx={{ 
                    borderRadius: { xs: 2, sm: 2 },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    py: { xs: 1, sm: 1.5 },
                    px: { xs: 2, sm: 3 },
                    minWidth: { xs: '120px', sm: '140px' },
                    bgcolor: selectedPriority === 'low' ? 'rgba(255,255,255,0.9)' : 'transparent',
                    color: selectedPriority === 'low' ? 'success.main' : 'white',
                    borderColor: 'rgba(255,255,255,0.3)',
                    '&:hover': {
                      bgcolor: selectedPriority === 'low' ? 'white' : 'rgba(255,255,255,0.1)',
                      borderColor: 'rgba(255,255,255,0.5)'
                    }
                  }}
                >
                  Low ({priorityCounts.low})
            </Button>
          </Stack>
        </Box>
          </Box>
        </Card>
        
        {/* Mobile-Optimized Action Bar */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: { xs: 'stretch', sm: 'center' },
          mb: { xs: 2, sm: 3 },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 2, sm: 0 }
        }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ 
              fontWeight: 600,
              color: '#1f2937',
              fontSize: { xs: '1.125rem', sm: '1.25rem' },
              mb: { xs: 0.5, sm: 1 }
            }}>
              Activity Overview
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{
              fontSize: { xs: '0.75rem', sm: '0.875rem' }
            }}>
              Monitor and review worker activities
            </Typography>
          </Box>
          <Box sx={{ 
            display: 'flex', 
            gap: { xs: 1, sm: 2 },
            flexDirection: { xs: 'row', sm: 'row' },
            width: { xs: '100%', sm: 'auto' }
          }}>
            <Button
              variant="outlined"
              startIcon={<FilterList sx={{ fontSize: { xs: 16, sm: 18 } }} />}
              onClick={() => setShowFilters(!showFilters)}
              color={showFilters ? 'primary' : 'inherit'}
              size={window.innerWidth < 600 ? 'small' : 'medium'}
              sx={{
                borderRadius: { xs: 2, sm: 2 },
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                flex: { xs: 1, sm: 'none' },
                minWidth: { xs: '80px', sm: '100px' }
              }}
            >
              Filters
            </Button>
            <Button
              variant="contained"
              startIcon={<Refresh sx={{ fontSize: { xs: 16, sm: 18 } }} />}
              onClick={fetchData}
              size={window.innerWidth < 600 ? 'small' : 'medium'}
              sx={{
                borderRadius: { xs: 2, sm: 2 },
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                flex: { xs: 1, sm: 'none' },
                minWidth: { xs: '80px', sm: '100px' },
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)'
                }
              }}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        {/* Mobile-Optimized Search and Filter Bar */}
        <Card sx={{ 
          mb: { xs: 2, sm: 3 },
          borderRadius: { xs: 2, sm: 3 },
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
        }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Grid container spacing={{ xs: 2, sm: 2 }} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  placeholder="Search activities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  size={window.innerWidth < 600 ? 'small' : 'medium'}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ fontSize: { xs: 18, sm: 20 } }} />
                      </InputAdornment>
                    ),
                    endAdornment: searchTerm && (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setSearchTerm('')}
                          sx={{ 
                            p: { xs: 0.5, sm: 1 },
                            '&:hover': {
                              bgcolor: 'rgba(0,0,0,0.04)'
                            }
                          }}
                        >
                          <Clear sx={{ fontSize: { xs: 16, sm: 18 } }} />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: { xs: 2, sm: 2 },
                      fontSize: { xs: '0.875rem', sm: '1rem' }
                    }
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size={window.innerWidth < 600 ? 'small' : 'medium'}>
                  <InputLabel sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Sort By</InputLabel>
                  <Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    startAdornment={
                      <InputAdornment position="start">
                        <Sort sx={{ fontSize: { xs: 16, sm: 18 } }} />
                      </InputAdornment>
                    }
                    sx={{
                      borderRadius: { xs: 2, sm: 2 },
                      fontSize: { xs: '0.875rem', sm: '1rem' }
                    }}
                  >
                    <MenuItem value="createdAt" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Date Created</MenuItem>
                    <MenuItem value="worker" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Worker Name</MenuItem>
                    <MenuItem value="activityType" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Activity Type</MenuItem>
                    <MenuItem value="priority" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Priority</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size={window.innerWidth < 600 ? 'small' : 'medium'}>
                  <InputLabel sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Order</InputLabel>
                  <Select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                    sx={{
                      borderRadius: { xs: 2, sm: 2 },
                      fontSize: { xs: '0.875rem', sm: '1rem' }
                    }}
                  >
                    <MenuItem value="desc" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Newest First</MenuItem>
                    <MenuItem value="asc" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Oldest First</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Box sx={{ 
                  display: 'flex', 
                  gap: { xs: 1, sm: 1 },
                  flexWrap: 'wrap',
                  justifyContent: { xs: 'center', md: 'flex-start' }
                }}>
                  <Chip
                    label={`${totalItems} results`}
                    color="primary"
                    variant="outlined"
                    size={window.innerWidth < 600 ? 'small' : 'medium'}
                    sx={{
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      borderRadius: { xs: 2, sm: 2 }
                    }}
                  />
                  {(searchTerm || Object.values(filters).some(f => f !== '')) && (
                    <Chip
                      label="Filtered"
                      color="secondary"
                      variant="outlined"
                      size={window.innerWidth < 600 ? 'small' : 'medium'}
                      onDelete={() => {
                        setSearchTerm('');
                        setFilters({ worker: '', activityType: '', priority: '', isReviewed: '', dateRange: '' });
                      }}
                      sx={{
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        borderRadius: { xs: 2, sm: 2 }
                      }}
                    />
                  )}
                </Box>
              </Grid>
            </Grid>
            
            {/* Advanced Filters */}
            {showFilters && (
              <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Advanced Filters</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>Worker</InputLabel>
                      <Select
                        value={filters.worker}
                        onChange={(e) => setFilters({ ...filters, worker: e.target.value })}
                      >
                        <MenuItem value="">All Workers</MenuItem>
                        {cases.map(caseItem => (
                          <MenuItem key={caseItem._id} value={caseItem.worker._id}>
                            {caseItem.worker.firstName} {caseItem.worker.lastName}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>Activity Type</InputLabel>
                      <Select
                        value={filters.activityType}
                        onChange={(e) => setFilters({ ...filters, activityType: e.target.value })}
                      >
                        <MenuItem value="">All Types</MenuItem>
                        <MenuItem value="exercise_completed">Exercise Completed</MenuItem>
                        <MenuItem value="exercise_skipped">Exercise Skipped</MenuItem>
                        <MenuItem value="daily_check_in">Daily Check-in</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>Priority</InputLabel>
                      <Select
                        value={filters.priority}
                        onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                      >
                        <MenuItem value="">All Priorities</MenuItem>
                        <MenuItem value="urgent">Urgent</MenuItem>
                        <MenuItem value="high">High</MenuItem>
                        <MenuItem value="medium">Medium</MenuItem>
                        <MenuItem value="low">Low</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>Review Status</InputLabel>
                      <Select
                        value={filters.isReviewed}
                        onChange={(e) => setFilters({ ...filters, isReviewed: e.target.value })}
                      >
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="true">Reviewed</MenuItem>
                        <MenuItem value="false">Pending</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Box>
            )}
          </CardContent>
        </Card>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Mobile-Optimized Statistics Cards */}
        <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: { xs: 3, sm: 4 } }}>
          <Grid item xs={6} sm={4} md={2}>
            <Card sx={{ 
              textAlign: 'center', 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              borderRadius: { xs: 2, sm: 3 },
              boxShadow: '0 4px 20px rgba(102, 126, 234, 0.25)',
              transition: 'transform 0.2s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 30px rgba(102, 126, 234, 0.35)'
              }
            }}>
              <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                <Timeline sx={{ fontSize: { xs: 24, sm: 32 }, mb: { xs: 0.5, sm: 1 } }} />
                <Typography variant="body2" sx={{ 
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  fontWeight: 500,
                  mb: { xs: 0.5, sm: 1 }
                }}>
                  Total Activities
                </Typography>
                <Typography variant="h5" sx={{ 
                  fontWeight: 700,
                  fontSize: { xs: '1.5rem', sm: '2rem' }
                }}>
                  {stats.total}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Card sx={{ 
              textAlign: 'center', 
              background: 'linear-gradient(135deg, #4CAF50 0%, #45B649 100%)',
              color: 'white',
              borderRadius: { xs: 2, sm: 3 },
              boxShadow: '0 4px 20px rgba(76, 175, 80, 0.25)',
              transition: 'transform 0.2s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 30px rgba(76, 175, 80, 0.35)'
              }
            }}>
              <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                <CheckCircle sx={{ fontSize: { xs: 24, sm: 32 }, mb: { xs: 0.5, sm: 1 } }} />
                <Typography variant="body2" sx={{ 
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  fontWeight: 500,
                  mb: { xs: 0.5, sm: 1 }
                }}>
                  Completed
                </Typography>
                <Typography variant="h5" sx={{ 
                  fontWeight: 700,
                  fontSize: { xs: '1.5rem', sm: '2rem' }
                }}>
                  {stats.completed}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Card sx={{ 
              textAlign: 'center', 
              background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
              color: 'white',
              borderRadius: { xs: 2, sm: 3 },
              boxShadow: '0 4px 20px rgba(255, 152, 0, 0.25)',
              transition: 'transform 0.2s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 30px rgba(255, 152, 0, 0.35)'
              }
            }}>
              <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                <Warning sx={{ fontSize: { xs: 24, sm: 32 }, mb: { xs: 0.5, sm: 1 } }} />
                <Typography variant="body2" sx={{ 
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  fontWeight: 500,
                  mb: { xs: 0.5, sm: 1 }
                }}>
                  Skipped
                </Typography>
                <Typography variant="h5" sx={{ 
                  fontWeight: 700,
                  fontSize: { xs: '1.5rem', sm: '2rem' }
                }}>
                  {stats.skipped}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Card sx={{ 
              textAlign: 'center', 
              background: 'linear-gradient(135deg, #2196F3 0%, #1E88E5 100%)',
              color: 'white',
              borderRadius: { xs: 2, sm: 3 },
              boxShadow: '0 4px 20px rgba(33, 150, 243, 0.25)',
              transition: 'transform 0.2s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 30px rgba(33, 150, 243, 0.35)'
              }
            }}>
              <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                <Assessment sx={{ fontSize: { xs: 24, sm: 32 }, mb: { xs: 0.5, sm: 1 } }} />
                <Typography variant="body2" sx={{ 
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  fontWeight: 500,
                  mb: { xs: 0.5, sm: 1 }
                }}>
                  Check-ins
                </Typography>
                <Typography variant="h5" sx={{ 
                  fontWeight: 700,
                  fontSize: { xs: '1.5rem', sm: '2rem' }
                }}>
                  {stats.checkIns}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Card sx={{ 
              textAlign: 'center', 
              background: 'linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)',
              color: 'white',
              borderRadius: { xs: 2, sm: 3 },
              boxShadow: '0 4px 20px rgba(156, 39, 176, 0.25)',
              transition: 'transform 0.2s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 30px rgba(156, 39, 176, 0.35)'
              }
            }}>
              <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                <TrendingUp sx={{ fontSize: { xs: 24, sm: 32 }, mb: { xs: 0.5, sm: 1 } }} />
                <Typography variant="body2" sx={{ 
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  fontWeight: 500,
                  mb: { xs: 0.5, sm: 1 }
                }}>
                  Reviewed
                </Typography>
                <Typography variant="h5" sx={{ 
                  fontWeight: 700,
                  fontSize: { xs: '1.5rem', sm: '2rem' }
                }}>
                  {stats.reviewed}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <Card sx={{ 
              textAlign: 'center', 
              background: 'linear-gradient(135deg, #F44336 0%, #D32F2F 100%)',
              color: 'white',
              borderRadius: { xs: 2, sm: 3 },
              boxShadow: '0 4px 20px rgba(244, 67, 54, 0.25)',
              transition: 'transform 0.2s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 30px rgba(244, 67, 54, 0.35)'
              }
            }}>
              <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                <TrendingDown sx={{ fontSize: { xs: 24, sm: 32 }, mb: { xs: 0.5, sm: 1 } }} />
                <Typography variant="body2" sx={{ 
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  fontWeight: 500,
                  mb: { xs: 0.5, sm: 1 }
                }}>
                  Pending
                </Typography>
                <Typography variant="h5" sx={{ 
                  fontWeight: 700,
                  fontSize: { xs: '1.5rem', sm: '2rem' }
                }}>
                  {stats.pending}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Mobile-Optimized Activity Logs */}
        <Card sx={{
          borderRadius: { xs: 2, sm: 3 },
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          overflow: 'hidden'
        }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant="h6" sx={{ 
              mb: { xs: 2, sm: 2 }, 
              fontWeight: 600,
              fontSize: { xs: '1.125rem', sm: '1.25rem' },
              color: '#1f2937'
            }}>
              Activity Logs ({totalItems})
            </Typography>
            
            {/* Mobile Card View for Small Screens */}
            {window.innerWidth < 768 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {paginatedLogs.map((log) => (
                  <Card 
                    key={log._id} 
                    sx={{
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: log.isReviewed ? 'divider' : 'warning.main',
                      bgcolor: log.isReviewed ? 'action.hover' : 'rgba(255, 152, 0, 0.05)',
                      opacity: log.isReviewed ? 0.7 : 1,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        transform: 'translateY(-1px)'
                      }
                    }}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                          <Avatar sx={{ 
                            bgcolor: 'primary.main',
                            width: { xs: 32, sm: 40 },
                            height: { xs: 32, sm: 40 },
                            fontSize: { xs: '0.75rem', sm: '1rem' }
                          }}>
                            {log.worker.firstName[0]}{log.worker.lastName[0]}
                          </Avatar>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography variant="body2" sx={{ 
                              fontWeight: 600,
                              fontSize: { xs: '0.875rem', sm: '1rem' },
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {log.worker.firstName} {log.worker.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{
                              fontSize: { xs: '0.7rem', sm: '0.75rem' }
                            }}>
                              Case #{log.case.caseNumber}
                            </Typography>
                          </Box>
                        </Box>
                        <Tooltip title="View Details">
                          <IconButton 
                            size="small" 
                            onClick={() => {
                              setSelectedLog(log);
                              setReviewNotes(log.clinicianNotes || '');
                              setLogDialog(true);
                            }}
                            sx={{
                              bgcolor: 'rgba(0,0,0,0.04)',
                              '&:hover': {
                                bgcolor: 'rgba(0,0,0,0.08)'
                              }
                            }}
                          >
                            <Visibility sx={{ fontSize: { xs: 16, sm: 18 } }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ 
                          fontWeight: 500,
                          fontSize: { xs: '0.875rem', sm: '1rem' },
                          mb: 0.5,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {log.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{
                          fontSize: { xs: '0.7rem', sm: '0.75rem' },
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {log.description}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getActivityTypeIcon(log.activityType)}
                          <Chip
                            label={log.activityType.replace('_', ' ')}
                            size="small"
                            color={getActivityTypeColor(log.activityType) as any}
                            sx={{
                              fontSize: { xs: '0.65rem', sm: '0.75rem' },
                              height: { xs: 20, sm: 24 }
                            }}
                          />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Chip
                            label={log.priority}
                            size="small"
                            color={getPriorityColor(log.priority)}
                            sx={{
                              fontSize: { xs: '0.65rem', sm: '0.75rem' },
                              height: { xs: 20, sm: 24 }
                            }}
                          />
                          <Chip
                            label={log.isReviewed ? 'Reviewed' : 'Pending'}
                            size="small"
                            color={log.isReviewed ? 'success' : 'warning'}
                            sx={{
                              fontSize: { xs: '0.65rem', sm: '0.75rem' },
                              height: { xs: 20, sm: 24 }
                            }}
                          />
                        </Box>
                      </Box>
                      
                      <Typography variant="caption" color="text.secondary" sx={{
                        fontSize: { xs: '0.65rem', sm: '0.7rem' },
                        mt: 1,
                        display: 'block'
                      }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            ) : (
              /* Desktop Table View */
              <TableContainer component={Paper} variant="outlined" sx={{
                borderRadius: { xs: 2, sm: 2 },
                overflow: 'auto'
              }}>
              <Table>
                <TableHead>
                  <TableRow>
                      <TableCell sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, fontWeight: 600 }}>Worker</TableCell>
                      <TableCell sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, fontWeight: 600 }}>Activity</TableCell>
                      <TableCell sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, fontWeight: 600 }}>Type</TableCell>
                      <TableCell sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, fontWeight: 600 }}>Priority</TableCell>
                      <TableCell sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, fontWeight: 600 }}>Time</TableCell>
                      <TableCell sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedLogs.map((log) => (
                    <TableRow key={log._id} sx={{ 
                        bgcolor: log.isReviewed ? 'action.hover' : 'rgba(255, 152, 0, 0.05)',
                        opacity: log.isReviewed ? 0.7 : 1,
                        '&:hover': {
                          bgcolor: log.isReviewed ? 'action.selected' : 'rgba(255, 152, 0, 0.1)'
                        }
                    }}>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={2}>
                            <Avatar sx={{ 
                              bgcolor: 'primary.main',
                              width: { xs: 32, sm: 40 },
                              height: { xs: 32, sm: 40 }
                            }}>
                            {log.worker.firstName[0]}{log.worker.lastName[0]}
                          </Avatar>
                          <Box>
                              <Typography variant="body2" sx={{ 
                                fontWeight: 600,
                                fontSize: { xs: '0.875rem', sm: '1rem' }
                              }}>
                              {log.worker.firstName} {log.worker.lastName}
                            </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{
                                fontSize: { xs: '0.7rem', sm: '0.75rem' }
                              }}>
                              Case #{log.case.caseNumber}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                            <Typography variant="body2" sx={{ 
                              fontWeight: 500,
                              fontSize: { xs: '0.875rem', sm: '1rem' }
                            }}>
                            {log.title}
                          </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{
                              fontSize: { xs: '0.7rem', sm: '0.75rem' },
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}>
                            {log.description}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          {getActivityTypeIcon(log.activityType)}
                          <Chip
                            label={log.activityType.replace('_', ' ')}
                            size="small"
                            color={getActivityTypeColor(log.activityType) as any}
                              sx={{
                                fontSize: { xs: '0.65rem', sm: '0.75rem' },
                                height: { xs: 20, sm: 24 }
                              }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={log.priority}
                          size="small"
                          color={getPriorityColor(log.priority)}
                            sx={{
                              fontSize: { xs: '0.65rem', sm: '0.75rem' },
                              height: { xs: 20, sm: 24 }
                            }}
                        />
                      </TableCell>
                      <TableCell>
                          <Typography variant="caption" sx={{
                            fontSize: { xs: '0.7rem', sm: '0.75rem' }
                          }}>
                          {new Date(log.createdAt).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={log.isReviewed ? 'Reviewed' : 'Pending'}
                          size="small"
                          color={log.isReviewed ? 'success' : 'warning'}
                            sx={{
                              fontSize: { xs: '0.65rem', sm: '0.75rem' },
                              height: { xs: 20, sm: 24 }
                            }}
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="View Details">
                          <IconButton 
                            size="small" 
                            onClick={() => {
                              setSelectedLog(log);
                              setReviewNotes(log.clinicianNotes || '');
                              setLogDialog(true);
                            }}
                              sx={{
                                bgcolor: 'rgba(0,0,0,0.04)',
                                '&:hover': {
                                  bgcolor: 'rgba(0,0,0,0.08)'
                                }
                              }}
                            >
                              <Visibility sx={{ fontSize: { xs: 16, sm: 18 } }} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            )}
            
            {paginatedLogs.length === 0 && (
              <Box textAlign="center" sx={{ py: 4 }}>
                <Timeline sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No activity logs found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Worker activities will appear here once they start using rehabilitation plans
                </Typography>
              </Box>
            )}

            {/* Pagination Controls */}
            {totalItems > 0 && (
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                mt: 3,
                pt: 2,
                borderTop: '1px solid',
                borderColor: 'divider'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} entries
                  </Typography>
                  <FormControl size="small" sx={{ minWidth: 80 }}>
                    <Select
                      value={itemsPerPage}
                      onChange={handleItemsPerPageChange}
                      variant="outlined"
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
                
                <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={handlePageChange}
                  color="primary"
                  size="large"
                  showFirstButton
                  showLastButton
                  siblingCount={1}
                  boundaryCount={1}
                />
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Mobile-Optimized Activity Log Details Dialog */}
        <Dialog 
          open={logDialog} 
          onClose={() => setLogDialog(false)} 
          maxWidth="md" 
          fullWidth
          fullScreen={window.innerWidth < 600}
          sx={{
            '& .MuiDialog-paper': {
              borderRadius: window.innerWidth < 600 ? 0 : '16px',
              margin: window.innerWidth < 600 ? 0 : '32px',
              maxHeight: window.innerWidth < 600 ? '100vh' : '90vh'
            }
          }}
        >
          <DialogTitle sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            p: { xs: 2, sm: 3 },
            borderRadius: window.innerWidth < 600 ? 0 : '16px 16px 0 0',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Background Pattern */}
            <Box sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '100px',
              height: '100px',
              background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
              borderRadius: '50%',
              transform: 'translate(50%, -50%)'
            }} />
            <Box sx={{ zIndex: 1 }}>
              <Typography variant="h6" sx={{
                fontWeight: 700,
                fontSize: { xs: '1.125rem', sm: '1.25rem' },
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
              }}>
            Activity Log Details
              </Typography>
              <Typography variant="body2" sx={{
                opacity: 0.9,
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                mt: 0.5
              }}>
                Review and manage activity details
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent sx={{
            p: { xs: 2, sm: 3 },
            maxHeight: window.innerWidth < 600 ? 'calc(100vh - 140px)' : '60vh',
            overflow: 'auto'
          }}>
            {selectedLog && (
              <Box>
                <Grid container spacing={{ xs: 2, sm: 3 }}>
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined" sx={{
                      borderRadius: { xs: 2, sm: 2 },
                      boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                    }}>
                      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                        <Typography variant="h6" gutterBottom sx={{
                          fontSize: { xs: '1rem', sm: '1.25rem' },
                          fontWeight: 600,
                          color: '#1f2937'
                        }}>
                          Worker Information
                        </Typography>
                        <List dense>
                          <ListItem sx={{ px: 0 }}>
                            <ListItemIcon sx={{ minWidth: { xs: 36, sm: 40 } }}>
                              <Person sx={{ fontSize: { xs: 20, sm: 24 } }} />
                            </ListItemIcon>
                            <ListItemText 
                              primary={`${selectedLog.worker.firstName} ${selectedLog.worker.lastName}`}
                              secondary={selectedLog.worker.email}
                              primaryTypographyProps={{
                                fontSize: { xs: '0.875rem', sm: '1rem' },
                                fontWeight: 600
                              }}
                              secondaryTypographyProps={{
                                fontSize: { xs: '0.75rem', sm: '0.875rem' }
                              }}
                            />
                          </ListItem>
                          <ListItem sx={{ px: 0 }}>
                            <ListItemIcon sx={{ minWidth: { xs: 36, sm: 40 } }}>
                              <Assignment sx={{ fontSize: { xs: 20, sm: 24 } }} />
                            </ListItemIcon>
                            <ListItemText 
                              primary={`Case #${selectedLog.case.caseNumber}`}
                              secondary={`Status: ${selectedLog.case.status}`}
                              primaryTypographyProps={{
                                fontSize: { xs: '0.875rem', sm: '1rem' },
                                fontWeight: 600
                              }}
                              secondaryTypographyProps={{
                                fontSize: { xs: '0.75rem', sm: '0.875rem' }
                              }}
                            />
                          </ListItem>
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined" sx={{
                      borderRadius: { xs: 2, sm: 2 },
                      boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                    }}>
                      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                        <Typography variant="h6" gutterBottom sx={{
                          fontSize: { xs: '1rem', sm: '1.25rem' },
                          fontWeight: 600,
                          color: '#1f2937'
                        }}>
                          Activity Details
                        </Typography>
                        <List dense>
                          <ListItem sx={{ px: 0 }}>
                            <ListItemIcon sx={{ minWidth: { xs: 36, sm: 40 } }}>
                              {getActivityTypeIcon(selectedLog.activityType)}
                            </ListItemIcon>
                            <ListItemText 
                              primary={selectedLog.title}
                              secondary={selectedLog.description}
                              primaryTypographyProps={{
                                fontSize: { xs: '0.875rem', sm: '1rem' },
                                fontWeight: 600
                              }}
                              secondaryTypographyProps={{
                                fontSize: { xs: '0.75rem', sm: '0.875rem' }
                              }}
                            />
                          </ListItem>
                          <ListItem sx={{ px: 0 }}>
                            <ListItemIcon sx={{ minWidth: { xs: 36, sm: 40 } }}>
                              <Schedule sx={{ fontSize: { xs: 20, sm: 24 } }} />
                            </ListItemIcon>
                            <ListItemText 
                              primary="Created"
                              secondary={new Date(selectedLog.createdAt).toLocaleString()}
                              primaryTypographyProps={{
                                fontSize: { xs: '0.875rem', sm: '1rem' },
                                fontWeight: 600
                              }}
                              secondaryTypographyProps={{
                                fontSize: { xs: '0.75rem', sm: '0.875rem' }
                              }}
                            />
                          </ListItem>
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Additional Information</Typography>
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" color="text.secondary">
                            Priority: <Chip label={selectedLog.priority} size="small" color={getPriorityColor(selectedLog.priority)} />
                          </Typography>
                        </Box>
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" color="text.secondary">
                            Tags: {selectedLog.tags.map(tag => (
                              <Chip key={tag} label={tag} size="small" sx={{ mr: 1 }} />
                            ))}
                          </Typography>
                        </Box>
                        {selectedLog.details && (
                          <Box>
                            <Typography variant="subtitle2" gutterBottom>
                              Activity Details:
                            </Typography>
                            
                            {/* Exercise Information */}
                            {selectedLog.details.exercise && (
                              <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                                <Typography variant="subtitle2" color="primary" gutterBottom>
                                  <FitnessCenter sx={{ mr: 1, verticalAlign: 'middle' }} />
                                  Exercise Information
                                </Typography>
                                <Grid container spacing={2}>
                                  <Grid item xs={12} sm={6}>
                                    <Typography variant="body2">
                                      <strong>Name:</strong> {selectedLog.details.exercise.name}
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={12} sm={6}>
                                    <Typography variant="body2">
                                      <strong>Duration:</strong> {selectedLog.details.exercise.duration} minutes
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={12} sm={6}>
                                    <Typography variant="body2">
                                      <strong>Difficulty:</strong> 
                                      <Chip 
                                        label={selectedLog.details.exercise.difficulty} 
                                        size="small" 
                                        color={
                                          selectedLog.details.exercise.difficulty === 'easy' ? 'success' :
                                          selectedLog.details.exercise.difficulty === 'medium' ? 'warning' :
                                          selectedLog.details.exercise.difficulty === 'hard' ? 'error' : 'default'
                                        }
                                        sx={{ ml: 1 }}
                                      />
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={12} sm={6}>
                                    <Typography variant="body2">
                                      <strong>Category:</strong> 
                                      <Chip 
                                        label={selectedLog.details.exercise.category} 
                                        size="small" 
                                        variant="outlined"
                                        sx={{ ml: 1 }}
                                      />
                                    </Typography>
                                  </Grid>
                                </Grid>
                              </Box>
                            )}

                            {/* Check-in Information */}
                            {selectedLog.details.checkIn && (
                              <Box sx={{ mb: 2, p: 2, bgcolor: 'blue.50', borderRadius: 1 }}>
                                <Typography variant="subtitle2" color="primary" gutterBottom>
                                  <Assessment sx={{ mr: 1, verticalAlign: 'middle' }} />
                                  Check-in Information
                                </Typography>
                                {selectedLog.details.checkIn.difficulties && selectedLog.details.checkIn.difficulties.length > 0 && (
                                  <Typography variant="body2">
                                    <strong>Difficulties:</strong> {selectedLog.details.checkIn.difficulties.join(', ')}
                                  </Typography>
                                )}
                                {(!selectedLog.details.checkIn.difficulties || selectedLog.details.checkIn.difficulties.length === 0) && (
                                  <Typography variant="body2" color="text.secondary">
                                    No difficulties reported
                                  </Typography>
                                )}
                              </Box>
                            )}

                            {/* Work Status Information */}
                            {selectedLog.details.workStatus && (
                              <Box sx={{ mb: 2, p: 2, bgcolor: 'green.50', borderRadius: 1 }}>
                                <Typography variant="subtitle2" color="primary" gutterBottom>
                                  <Assignment sx={{ mr: 1, verticalAlign: 'middle' }} />
                                  Work Status Information
                                </Typography>
                                {selectedLog.details.workStatus.restrictions && selectedLog.details.workStatus.restrictions.length > 0 && (
                                  <Typography variant="body2" sx={{ mb: 1 }}>
                                    <strong>Restrictions:</strong> {selectedLog.details.workStatus.restrictions.join(', ')}
                                  </Typography>
                                )}
                                {selectedLog.details.workStatus.difficulties && selectedLog.details.workStatus.difficulties.length > 0 && (
                                  <Typography variant="body2">
                                    <strong>Work Difficulties:</strong> {selectedLog.details.workStatus.difficulties.join(', ')}
                                  </Typography>
                                )}
                                {(!selectedLog.details.workStatus.restrictions || selectedLog.details.workStatus.restrictions.length === 0) && 
                                 (!selectedLog.details.workStatus.difficulties || selectedLog.details.workStatus.difficulties.length === 0) && (
                                  <Typography variant="body2" color="text.secondary">
                                    No work restrictions or difficulties reported
                                  </Typography>
                                )}
                              </Box>
                            )}

                            {/* Other Details */}
                            {Object.keys(selectedLog.details).some(key => 
                              !['exercise', 'checkIn', 'workStatus'].includes(key)
                            ) && (
                              <Box sx={{ mt: 2 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                  Additional Details:
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                                  {JSON.stringify(selectedLog.details, null, 2)}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={window.innerWidth < 600 ? 3 : 4}
                      label="Clinician Notes"
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Add your notes about this activity..."
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: { xs: 2, sm: 2 },
                          fontSize: { xs: '0.875rem', sm: '1rem' }
                        },
                        '& .MuiInputLabel-root': {
                          fontSize: { xs: '0.875rem', sm: '1rem' }
                        }
                      }}
                    />
                  </Grid>
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{
            p: { xs: 2, sm: 3 },
            borderTop: '1px solid',
            borderColor: 'divider',
            gap: { xs: 1, sm: 2 },
            justifyContent: 'center'
          }}>
            <Button 
              onClick={() => setLogDialog(false)}
              variant="outlined"
              size={window.innerWidth < 600 ? 'large' : 'medium'}
              sx={{
                borderRadius: { xs: 2, sm: 2 },
                px: { xs: 4, sm: 3 },
                py: { xs: 1.5, sm: 1 },
                fontSize: { xs: '0.875rem', sm: '1rem' },
                minWidth: { xs: '120px', sm: '100px' }
              }}
            >
              Close
            </Button>
            <Button 
              variant="contained" 
              onClick={handleReviewLog}
              disabled={isReviewing || selectedLog?.isReviewed}
              size={window.innerWidth < 600 ? 'large' : 'medium'}
              sx={{
                borderRadius: { xs: 2, sm: 2 },
                px: { xs: 4, sm: 3 },
                py: { xs: 1.5, sm: 1 },
                fontSize: { xs: '0.875rem', sm: '1rem' },
                minWidth: { xs: '140px', sm: '120px' },
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)'
                },
                '&:disabled': {
                  background: 'rgba(0,0,0,0.12)',
                  color: 'rgba(0,0,0,0.26)'
                }
              }}
            >
              {selectedLog?.isReviewed ? 'Already Reviewed' : 'Mark as Reviewed'}
            </Button>
          </DialogActions>
        </Dialog>

      </Box>
    </LayoutWithSidebar>
  );
};

export default WorkerActivityMonitor;

