import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Avatar,
  Tooltip,
  Button,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  IconButton,
} from '@mui/material';
import {
  Search,
  Visibility,
  Warning,
  CheckCircle,
  Cancel,
  Refresh,
  CalendarToday,
} from '@mui/icons-material';
import LayoutWithSidebar from '../components/LayoutWithSidebar';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext.supabase';
import { useNavigate } from 'react-router-dom';

interface CheckIn {
  _id: string;
  checkInDate: string;
  painLevel: {
    current: number;
    worst: number;
    average: number;
  };
  functionalStatus: {
    sleep: number;
    mood: number;
    energy: number;
    mobility: number;
    dailyActivities: number;
  };
  workStatus: {
    workedToday: boolean;
    hoursWorked: number;
    difficulties: string[];
    painAtWork: number;
  };
  symptoms: {
    swelling: boolean;
    stiffness: boolean;
    weakness: boolean;
    numbness: boolean;
    tingling: boolean;
    other: string;
  };
  notes: string;
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
}

const CheckInsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  const fetchCheckIns = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/check-ins');
      setCheckIns(response.data.checkIns || []);
    } catch (err: any) {
      console.error('Error fetching check-ins:', err);
      setError(err.response?.data?.message || 'Failed to fetch check-ins');
      setCheckIns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchCheckIns();
    }
  }, [user, user?.email, fetchCheckIns]); // Include fetchCheckIns dependency

  const handleRefresh = React.useCallback(async () => {
    await fetchCheckIns();
  }, [fetchCheckIns]);

  const handleViewDetails = React.useCallback((checkIn: CheckIn) => {
    // Navigate to case details page instead of opening dialog
    navigate(`/cases/${checkIn.case._id}`);
  }, [navigate]);

  const getPainLevelColor = (level: number) => {
    if (level >= 7) return '#dc2626'; // Red
    if (level >= 4) return '#f59e0b'; // Yellow
    return '#22c55e'; // Green
  };

  const getPainLevelLabel = (level: number) => {
    if (level >= 7) return 'High';
    if (level >= 4) return 'Medium';
    return 'Low';
  };

  const getWorkStatusColor = (workedToday: boolean) => {
    return workedToday ? 'success' : 'error';
  };

  const getWorkStatusLabel = (workedToday: boolean) => {
    return workedToday ? 'Working' : 'Not Working';
  };

  const filteredCheckIns = checkIns.filter(checkIn => {
    const matchesSearch = 
      checkIn.worker.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      checkIn.worker.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      checkIn.case.caseNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'high_pain' && checkIn.painLevel.current >= 7) ||
      (statusFilter === 'not_working' && !checkIn.workStatus.workedToday) ||
      (statusFilter === 'working' && checkIn.workStatus.workedToday);
    
    const matchesDate = dateFilter === 'all' || 
      (dateFilter === 'today' && new Date(checkIn.checkInDate).toDateString() === new Date().toDateString()) ||
      (dateFilter === 'week' && (new Date().getTime() - new Date(checkIn.checkInDate).getTime()) <= 7 * 24 * 60 * 60 * 1000);
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const stats = {
    total: checkIns.length,
    highPain: checkIns.filter(c => c.painLevel.current >= 7).length,
    notWorking: checkIns.filter(c => !c.workStatus.workedToday).length,
    today: checkIns.filter(c => new Date(c.checkInDate).toDateString() === new Date().toDateString()).length,
  };

  if (loading) {
    return (
      <LayoutWithSidebar>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </LayoutWithSidebar>
    );
  }

  return (
    <LayoutWithSidebar>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: '#1f2937' }}>
            Daily Check-ins
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Monitor your assigned workers' daily check-ins and progress
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ bgcolor: '#3b82f6', mr: 2 }}>
                    <CalendarToday />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{stats.total}</Typography>
                    <Typography variant="body2" color="text.secondary">Total Check-ins</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ bgcolor: '#dc2626', mr: 2 }}>
                    <Warning />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{stats.highPain}</Typography>
                    <Typography variant="body2" color="text.secondary">High Pain (≥7)</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ bgcolor: '#f59e0b', mr: 2 }}>
                    <Cancel />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{stats.notWorking}</Typography>
                    <Typography variant="body2" color="text.secondary">Not Working</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ bgcolor: '#22c55e', mr: 2 }}>
                    <CheckCircle />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{stats.today}</Typography>
                    <Typography variant="body2" color="text.secondary">Today's Check-ins</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  placeholder="Search by worker name or case number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Status Filter</InputLabel>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    label="Status Filter"
                  >
                    <MenuItem value="all">All Check-ins</MenuItem>
                    <MenuItem value="high_pain">High Pain (≥7)</MenuItem>
                    <MenuItem value="not_working">Not Working</MenuItem>
                    <MenuItem value="working">Working</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Date Filter</InputLabel>
                  <Select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    label="Date Filter"
                  >
                    <MenuItem value="all">All Time</MenuItem>
                    <MenuItem value="today">Today</MenuItem>
                    <MenuItem value="week">This Week</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={handleRefresh}
                  fullWidth
                >
                  Refresh
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Check-ins Table */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Check-in Records ({filteredCheckIns.length})
            </Typography>
            <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Worker</TableCell>
                    <TableCell>Case</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Pain Level</TableCell>
                    <TableCell>Work Status</TableCell>
                    <TableCell>Sleep Quality</TableCell>
                    <TableCell>Mood</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredCheckIns.map((checkIn) => (
                    <TableRow key={checkIn._id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ mr: 2, bgcolor: '#3b82f6' }}>
                            {checkIn.worker.firstName[0]}{checkIn.worker.lastName[0]}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {checkIn.worker.firstName} {checkIn.worker.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {checkIn.worker.email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {checkIn.case.caseNumber}
                        </Typography>
                        <Chip 
                          label={checkIn.case.status.replace('_', ' ').toUpperCase()} 
                          size="small" 
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(checkIn.checkInDate).toLocaleDateString()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(checkIn.checkInDate).toLocaleTimeString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${checkIn.painLevel.current}/10`}
                          sx={{
                            backgroundColor: getPainLevelColor(checkIn.painLevel.current),
                            color: 'white',
                            fontWeight: 600,
                          }}
                        />
                        <Typography variant="caption" display="block" color="text.secondary">
                          {getPainLevelLabel(checkIn.painLevel.current)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getWorkStatusLabel(checkIn.workStatus.workedToday)}
                          color={getWorkStatusColor(checkIn.workStatus.workedToday)}
                          size="small"
                        />
                        {checkIn.workStatus.workedToday && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            {checkIn.workStatus.hoursWorked}h worked
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {checkIn.functionalStatus.sleep >= 7 ? 'Good' : 
                           checkIn.functionalStatus.sleep >= 4 ? 'Fair' : 'Poor'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {checkIn.functionalStatus.sleep}/10
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {checkIn.functionalStatus.mood >= 7 ? 'Good' : 
                           checkIn.functionalStatus.mood >= 4 ? 'Fair' : 'Poor'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {checkIn.functionalStatus.mood}/10
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="View Case Details">
                          <IconButton
                            onClick={() => handleViewDetails(checkIn)}
                            color="primary"
                            size="small"
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
            
            {/* Empty State */}
            {filteredCheckIns.length === 0 && !loading && (
              <Box sx={{ 
                textAlign: 'center', 
                py: 6,
                borderTop: '1px solid #e1e5e9'
              }}>
                <Box sx={{ 
                  width: 80, 
                  height: 80, 
                  borderRadius: '50%', 
                  background: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e0 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2
                }}>
                  <CalendarToday sx={{ fontSize: 40, color: '#718096' }} />
                </Box>
                <Typography variant="h6" sx={{ color: '#4a5568', mb: 1 }}>
                  No check-ins found
                </Typography>
                <Typography variant="body2" sx={{ color: '#718096', mb: 2 }}>
                  {checkIns.length === 0 
                    ? 'No workers have submitted check-ins yet, or you may not have any assigned cases.'
                    : 'No check-ins match your current filters. Try adjusting your search criteria.'
                  }
                </Typography>
                <Button 
                  variant="outlined" 
                  onClick={handleRefresh}
                  startIcon={<Refresh />}
                >
                  Refresh
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </LayoutWithSidebar>
  );
};

export default CheckInsPage;

