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
import Layout from '../../components/Layout';
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
      <Layout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Worker Activity Monitor
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Track and monitor worker activities across all assigned cases
            </Typography>
          </Box>
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<FilterList />}
              onClick={() => setShowFilters(!showFilters)}
              color={showFilters ? 'primary' : 'inherit'}
            >
              Filters
            </Button>
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={fetchData}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        {/* Search and Filter Bar */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  placeholder="Search by worker name, case number, or activity..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                    endAdornment: searchTerm && (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setSearchTerm('')}
                        >
                          <Clear />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Sort By</InputLabel>
                  <Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    startAdornment={
                      <InputAdornment position="start">
                        <Sort />
                      </InputAdornment>
                    }
                  >
                    <MenuItem value="createdAt">Date Created</MenuItem>
                    <MenuItem value="worker">Worker Name</MenuItem>
                    <MenuItem value="activityType">Activity Type</MenuItem>
                    <MenuItem value="priority">Priority</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Order</InputLabel>
                  <Select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                  >
                    <MenuItem value="desc">Newest First</MenuItem>
                    <MenuItem value="asc">Oldest First</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Box display="flex" gap={1}>
                  <Chip
                    label={`${totalItems} results`}
                    color="primary"
                    variant="outlined"
                  />
                  {(searchTerm || Object.values(filters).some(f => f !== '')) && (
                    <Chip
                      label="Filtered"
                      color="secondary"
                      variant="outlined"
                      onDelete={() => {
                        setSearchTerm('');
                        setFilters({ worker: '', activityType: '', priority: '', isReviewed: '', dateRange: '' });
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

        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={2}>
            <Card sx={{ textAlign: 'center', bgcolor: 'primary.light', color: 'primary.contrastText' }}>
              <CardContent>
                <Timeline sx={{ fontSize: 32, mb: 1 }} />
                <Typography variant="h6">Total Activities</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>{stats.total}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card sx={{ textAlign: 'center', bgcolor: 'success.light', color: 'success.contrastText' }}>
              <CardContent>
                <CheckCircle sx={{ fontSize: 32, mb: 1 }} />
                <Typography variant="h6">Completed</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>{stats.completed}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card sx={{ textAlign: 'center', bgcolor: 'warning.light', color: 'warning.contrastText' }}>
              <CardContent>
                <Warning sx={{ fontSize: 32, mb: 1 }} />
                <Typography variant="h6">Skipped</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>{stats.skipped}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card sx={{ textAlign: 'center', bgcolor: 'info.light', color: 'info.contrastText' }}>
              <CardContent>
                <Assessment sx={{ fontSize: 32, mb: 1 }} />
                <Typography variant="h6">Check-ins</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>{stats.checkIns}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card sx={{ textAlign: 'center', bgcolor: 'success.main', color: 'success.contrastText' }}>
              <CardContent>
                <TrendingUp sx={{ fontSize: 32, mb: 1 }} />
                <Typography variant="h6">Reviewed</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>{stats.reviewed}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card sx={{ textAlign: 'center', bgcolor: 'warning.main', color: 'warning.contrastText' }}>
              <CardContent>
                <TrendingDown sx={{ fontSize: 32, mb: 1 }} />
                <Typography variant="h6">Pending</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>{stats.pending}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Activity Logs Table */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Activity Logs ({totalItems})
            </Typography>
            
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Worker</TableCell>
                    <TableCell>Activity</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Time</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedLogs.map((log) => (
                    <TableRow key={log._id} sx={{ 
                      bgcolor: log.isReviewed ? 'action.hover' : 'warning.light',
                      opacity: log.isReviewed ? 0.7 : 1
                    }}>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            {log.worker.firstName[0]}{log.worker.lastName[0]}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {log.worker.firstName} {log.worker.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Case #{log.case.caseNumber}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {log.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
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
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={log.priority}
                          size="small"
                          color={getPriorityColor(log.priority)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {new Date(log.createdAt).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={log.isReviewed ? 'Reviewed' : 'Pending'}
                          size="small"
                          color={log.isReviewed ? 'success' : 'warning'}
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
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
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

        {/* Activity Log Details Dialog */}
        <Dialog open={logDialog} onClose={() => setLogDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            Activity Log Details
          </DialogTitle>
          <DialogContent>
            {selectedLog && (
              <Box>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Worker Information</Typography>
                        <List dense>
                          <ListItem>
                            <ListItemIcon>
                              <Person />
                            </ListItemIcon>
                            <ListItemText 
                              primary={`${selectedLog.worker.firstName} ${selectedLog.worker.lastName}`}
                              secondary={selectedLog.worker.email}
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemIcon>
                              <Assignment />
                            </ListItemIcon>
                            <ListItemText 
                              primary={`Case #${selectedLog.case.caseNumber}`}
                              secondary={`Status: ${selectedLog.case.status}`}
                            />
                          </ListItem>
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Activity Details</Typography>
                        <List dense>
                          <ListItem>
                            <ListItemIcon>
                              {getActivityTypeIcon(selectedLog.activityType)}
                            </ListItemIcon>
                            <ListItemText 
                              primary={selectedLog.title}
                              secondary={selectedLog.description}
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemIcon>
                              <Schedule />
                            </ListItemIcon>
                            <ListItemText 
                              primary="Created"
                              secondary={new Date(selectedLog.createdAt).toLocaleString()}
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
                      rows={4}
                      label="Clinician Notes"
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Add your notes about this activity..."
                    />
                  </Grid>
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setLogDialog(false)}>Close</Button>
            <Button 
              variant="contained" 
              onClick={handleReviewLog}
              disabled={isReviewing || selectedLog?.isReviewed}
            >
              {selectedLog?.isReviewed ? 'Already Reviewed' : 'Mark as Reviewed'}
            </Button>
          </DialogActions>
        </Dialog>

      </Box>
    </Layout>
  );
};

export default WorkerActivityMonitor;
