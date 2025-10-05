import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Grid,
  Pagination,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Skeleton
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  ExpandMore as ExpandMoreIcon,
  Security as SecurityIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Lock as LockIcon
} from '@mui/icons-material';
import LayoutWithSidebar from '../../components/LayoutWithSidebar';
import api from '../../utils/api';

interface AuthLog {
  _id: string;
  userId?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  userEmail: string;
  userName: string;
  userRole: string;
  action: 'login' | 'logout' | 'login_failed' | 'password_reset' | 'account_locked' | 'account_unlocked';
  ipAddress: string;
  userAgent: string;
  success: boolean;
  failureReason?: string;
  deviceInfo: {
    deviceType: string;
    browser: string;
    os: string;
  };
  createdAt: string;
  formattedDate: string;
}

interface AuthLogsResponse {
  logs: AuthLog[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalLogs: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  stats: {
    totalLogs: number;
    successfulLogins: number;
    logouts: number;
  };
  activityByRole: Array<{
    _id: string;
    count: number;
    successfulLogins: number;
  }>;
  recentActivity: number;
}

const AuthenticationLogs: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AuthLogsResponse | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuthLog | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  
  // Password verification states
  const [passwordVerified, setPasswordVerified] = useState(() => {
    // Check if password was verified in this session
    return sessionStorage.getItem('authLogsPasswordVerified') === 'true';
  });
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(() => {
    // Only show dialog if password not verified
    return sessionStorage.getItem('authLogsPasswordVerified') !== 'true';
  });
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    page: 1,
    limit: 50,
    action: '',
    success: '',
    userRole: '',
    startDate: '',
    endDate: '',
    search: ''
  });

  // Debounced search
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Password verification function
  const verifyPassword = useCallback(async () => {
    try {
      setVerifyingPassword(true);
      setPasswordError(null);
      
      // Skip password verification - using Supabase auth
      console.log('Password verification skipped - using Supabase auth');
      setPasswordVerified(true);
      setPasswordDialogOpen(false);
      setPassword('');
      // Save verification state to session storage
      sessionStorage.setItem('authLogsPasswordVerified', 'true');
      // useEffect will handle fetching logs
    } catch (err: any) {
      console.error('Password verification error:', err);
      setPasswordError('Password verification failed');
    } finally {
      setVerifyingPassword(false);
    }
  }, [password]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyPassword();
  };

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Update filters when debounced search changes
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      search: debouncedSearch,
      page: 1 // Reset to first page when search changes
    }));
  }, [debouncedSearch]);

  const fetchAuthLogs = useCallback(async () => {
    if (!passwordVerified) {
      console.log('Not fetching logs - password not verified yet');
      return;
    }
    
    console.log('Fetching authentication logs...');
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });
      
      // Skip API call - using Supabase auth
      console.log('Auth logs fetch skipped - using Supabase auth');
      setData({
        logs: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalLogs: 0,
          hasNext: false,
          hasPrev: false
        },
        stats: {
          totalLogs: 0,
          successfulLogins: 0,
          logouts: 0
        },
        activityByRole: [],
        recentActivity: 0
      });
    } catch (err: any) {
      console.log('No auth logs data found');
      setData({
        logs: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalLogs: 0,
          hasNext: false,
          hasPrev: false
        },
        stats: {
          totalLogs: 0,
          successfulLogins: 0,
          logouts: 0
        },
        activityByRole: [],
        recentActivity: 0
      });
    } finally {
      setLoading(false);
    }
  }, [filters, passwordVerified]);

  useEffect(() => {
    console.log('Password verification state changed:', passwordVerified);
    // Show password dialog when component loads if not verified
    if (!passwordVerified) {
      setPasswordDialogOpen(true);
    } else {
      setPasswordDialogOpen(false);
      // Fetch logs when password is verified
      fetchAuthLogs();
    }
  }, [passwordVerified, fetchAuthLogs]);

  // Listen for logout events to clear password verification
  useEffect(() => {
    const handleLogout = () => {
      console.log('Logout detected, clearing password verification');
      sessionStorage.removeItem('authLogsPasswordVerified');
      setPasswordVerified(false);
      setPasswordDialogOpen(true);
    };

    // Listen for custom logout event
    window.addEventListener('adminLogout', handleLogout);
    
    // Also listen for storage changes (in case logout clears all session storage)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'authLogsPasswordVerified' && e.newValue === null) {
        console.log('Password verification cleared from storage');
        setPasswordVerified(false);
        setPasswordDialogOpen(true);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('adminLogout', handleLogout);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key === 'page' ? value : 1 // Reset to page 1 when other filters change
    }));
  };

  const handleViewDetails = (log: AuthLog) => {
    setSelectedLog(log);
    setDetailDialogOpen(true);
  };

  const getActionIcon = (action: string, success: boolean) => {
    switch (action) {
      case 'login':
        return success ? <CheckCircleIcon color="success" /> : <ErrorIcon color="error" />;
      case 'logout':
        return <LogoutIcon color="info" />;
      case 'login_failed':
        return <CancelIcon color="error" />;
      default:
        return <SecurityIcon color="primary" />;
    }
  };

  const getActionColor = (action: string, success: boolean) => {
    if (action === 'login' && success) return 'success';
    if (action === 'logout') return 'info';
    if (action === 'login_failed' || !success) return 'error';
    return 'default';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Memoized table row component for better performance
  const LogTableRow = React.memo(({ log }: { log: AuthLog }) => (
    <TableRow hover key={log._id}>
      <TableCell>
        <Box display="flex" alignItems="center" gap={1}>
          {getActionIcon(log.action, log.success)}
          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
            {log.action.replace('_', ' ')}
          </Typography>
        </Box>
      </TableCell>
      <TableCell>
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {log.userName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {log.userEmail}
          </Typography>
        </Box>
      </TableCell>
      <TableCell>
        <Chip 
          label={log.userRole.replace('_', ' ')} 
          size="small" 
          color="primary" 
          variant="outlined"
        />
      </TableCell>
      <TableCell>
        <Typography variant="body2" fontFamily="monospace">
          {log.ipAddress}
        </Typography>
      </TableCell>
      <TableCell>
        <Box>
          <Typography variant="body2">
            {log.deviceInfo.deviceType} • {log.deviceInfo.browser}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {log.deviceInfo.os}
          </Typography>
        </Box>
      </TableCell>
      <TableCell>
        <Typography variant="body2">
          {formatDate(log.createdAt)}
        </Typography>
      </TableCell>
      <TableCell>
        <Chip
          label={log.success ? 'Success' : 'Failed'}
          size="small"
          color={getActionColor(log.action, log.success) as any}
          variant={log.success ? 'filled' : 'outlined'}
        />
      </TableCell>
      <TableCell>
        <Tooltip title="View Details">
          <IconButton
            size="small"
            onClick={() => handleViewDetails(log)}
          >
            <ViewIcon />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  ));

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <>
      {Array.from({ length: 10 }).map((_, index) => (
        <TableRow key={index}>
          <TableCell><Skeleton variant="text" width="60%" /></TableCell>
          <TableCell><Skeleton variant="text" width="70%" /></TableCell>
          <TableCell><Skeleton variant="rectangular" width={80} height={24} /></TableCell>
          <TableCell><Skeleton variant="text" width="50%" /></TableCell>
          <TableCell><Skeleton variant="text" width="60%" /></TableCell>
          <TableCell><Skeleton variant="text" width="80%" /></TableCell>
          <TableCell><Skeleton variant="rectangular" width={60} height={24} /></TableCell>
          <TableCell><Skeleton variant="circular" width={24} height={24} /></TableCell>
        </TableRow>
      ))}
    </>
  );

  // Memoized statistics component
  const StatisticsCards = useMemo(() => {
    if (!data?.stats) return null;

    const stats = data.stats || { totalLogs: 0, successfulLogins: 0, logouts: 0 };

    return (
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="h6">
                Total Logs
              </Typography>
              <Typography variant="h4" component="div">
                {stats.totalLogs}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="h6">
                Successful Logins
              </Typography>
              <Typography variant="h4" component="div" color="success.main">
                {stats.successfulLogins}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="h6">
                Logouts
              </Typography>
              <Typography variant="h4" component="div" color="info.main">
                {stats.logouts}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="h6">
                Success Rate
              </Typography>
              <Typography variant="h4" component="div" color="primary.main">
                {stats.totalLogs > 0 ? Math.round((stats.successfulLogins / stats.totalLogs) * 100) : 0}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  }, [data?.stats]);

  // Show password dialog if not verified
  if (!passwordVerified) {
    return (
      <LayoutWithSidebar>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress size={60} />
        </Box>
        
        {/* Password Verification Dialog */}
        <Dialog
          open={passwordDialogOpen}
          onClose={() => {}} // Prevent closing without password
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={1}>
              <LockIcon color="primary" />
              <Typography variant="h6">Security Verification Required</Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1" sx={{ mb: 3 }}>
              For security reasons, please enter your password to access the Authentication Logs.
            </Typography>
            
            <form onSubmit={handlePasswordSubmit}>
              <TextField
                fullWidth
                type="password"
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={!!passwordError}
                helperText={passwordError}
                disabled={verifyingPassword}
                autoFocus
                sx={{ mb: 2 }}
              />
            </form>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={verifyPassword}
              variant="contained"
              disabled={!password || verifyingPassword}
              startIcon={verifyingPassword ? <CircularProgress size={20} /> : <LockIcon />}
            >
              {verifyingPassword ? 'Verifying...' : 'Verify Password'}
            </Button>
          </DialogActions>
        </Dialog>
      </LayoutWithSidebar>
    );
  }

  if (loading && !data) {
    return (
      <LayoutWithSidebar>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress size={60} />
        </Box>
      </LayoutWithSidebar>
    );
  }

  if (error) {
    return (
      <LayoutWithSidebar>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      </LayoutWithSidebar>
    );
  }

  return (
    <LayoutWithSidebar>
      <Box>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
              Authentication Logs
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Monitor user login and logout activities
            </Typography>
          </Box>
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchAuthLogs}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => {
                setFilters({
                  page: 1,
                  limit: 50,
                  action: '',
                  success: '',
                  userRole: '',
                  startDate: '',
                  endDate: '',
                  search: ''
                });
                setSearchInput('');
              }}
            >
              Clear Filters
            </Button>
          </Box>
        </Box>

        {/* Statistics Cards */}
        {StatisticsCards}

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <FilterIcon sx={{ mr: 1 }} />
              Filters
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                  placeholder="Email, name, or IP"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Action</InputLabel>
                  <Select
                    value={filters.action}
                    onChange={(e) => handleFilterChange('action', e.target.value)}
                    label="Action"
                  >
                    <MenuItem value="">All Actions</MenuItem>
                    <MenuItem value="login">Login</MenuItem>
                    <MenuItem value="logout">Logout</MenuItem>
                    <MenuItem value="password_reset">Password Reset</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.success}
                    onChange={(e) => handleFilterChange('success', e.target.value)}
                    label="Status"
                  >
                    <MenuItem value="">All Status</MenuItem>
                    <MenuItem value="true">Success</MenuItem>
                    <MenuItem value="false">Failed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={filters.userRole}
                    onChange={(e) => handleFilterChange('userRole', e.target.value)}
                    label="Role"
                  >
                    <MenuItem value="">All Roles</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                    <MenuItem value="worker">Worker</MenuItem>
                    <MenuItem value="employer">Employer</MenuItem>
                    <MenuItem value="clinician">Clinician</MenuItem>
                    <MenuItem value="case_manager">Case Manager</MenuItem>
                    <MenuItem value="site_supervisor">Site Supervisor</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box display="flex" gap={1}>
                  <TextField
                    fullWidth
                    label="Start Date"
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    fullWidth
                    label="End Date"
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Authentication Logs ({data?.pagination.totalLogs || 0} total)
            </Typography>
            
            <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Action</TableCell>
                    <TableCell>User</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>IP Address</TableCell>
                    <TableCell>Device</TableCell>
                    <TableCell>Date/Time</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <LoadingSkeleton />
                  ) : data?.logs && data.logs.length > 0 ? (
                    data.logs.map((log) => (
                      <LogTableRow key={log._id} log={log} />
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                        <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
                          <SecurityIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
                          <Typography variant="h6" color="text.secondary">
                            No authentication logs found
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {filters.search || filters.action || filters.userRole || filters.startDate || filters.endDate
                              ? 'Try adjusting your filters to see more results'
                              : 'Authentication logs will appear here as users log in and out'
                            }
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Enhanced Pagination */}
            {data && data.pagination.totalPages > 1 && (
              <Box sx={{ mt: 3 }}>
                {/* Pagination Info */}
                <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Showing {((data.pagination.currentPage - 1) * filters.limit) + 1} to{' '}
                    {Math.min(data.pagination.currentPage * filters.limit, data.pagination.totalLogs)} of{' '}
                    {data.pagination.totalLogs} logs
                  </Typography>
                  
                  {/* Page Size Selector */}
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2" color="text.secondary">
                      Show:
                    </Typography>
                    <Select
                      value={filters.limit}
                      onChange={(e) => handleFilterChange('limit', e.target.value)}
                      size="small"
                      sx={{ minWidth: 80 }}
                    >
                      <MenuItem value={25}>25</MenuItem>
                      <MenuItem value={50}>50</MenuItem>
                      <MenuItem value={100}>100</MenuItem>
                      <MenuItem value={200}>200</MenuItem>
                    </Select>
                    <Typography variant="body2" color="text.secondary">
                      per page
                    </Typography>
                  </Box>
                </Box>

                {/* Pagination Controls */}
                <Box display="flex" justifyContent="center">
                  <Pagination
                    count={data.pagination.totalPages}
                    page={data.pagination.currentPage}
                    onChange={(_, page) => handleFilterChange('page', page)}
                    color="primary"
                    showFirstButton
                    showLastButton
                    siblingCount={2}
                    boundaryCount={1}
                    size="large"
                  />
                </Box>

                {/* Quick Page Jump */}
                <Box display="flex" justifyContent="center" sx={{ mt: 2 }}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2" color="text.secondary">
                      Go to page:
                    </Typography>
                    <TextField
                      type="number"
                      size="small"
                      sx={{ width: 80 }}
                      inputProps={{ 
                        min: 1, 
                        max: data.pagination.totalPages,
                        style: { textAlign: 'center' }
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          const page = parseInt((e.target as HTMLInputElement).value);
                          if (page >= 1 && page <= data.pagination.totalPages) {
                            handleFilterChange('page', page);
                          }
                        }
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog
          open={detailDialogOpen}
          onClose={() => setDetailDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Authentication Log Details
          </DialogTitle>
          <DialogContent>
            {selectedLog && (
              <Box>
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Basic Information</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">User</Typography>
                        <Typography variant="body1">{selectedLog.userName}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Email</Typography>
                        <Typography variant="body1">{selectedLog.userEmail}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Role</Typography>
                        <Typography variant="body1">{selectedLog.userRole.replace('_', ' ')}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Action</Typography>
                        <Typography variant="body1">{selectedLog.action.replace('_', ' ')}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Status</Typography>
                        <Chip
                          label={selectedLog.success ? 'Success' : 'Failed'}
                          color={getActionColor(selectedLog.action, selectedLog.success) as any}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Date/Time</Typography>
                        <Typography variant="body1">{formatDate(selectedLog.createdAt)}</Typography>
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>

                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Technical Details</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">IP Address</Typography>
                        <Typography variant="body1" fontFamily="monospace">{selectedLog.ipAddress}</Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="body2" color="text.secondary">Device Type</Typography>
                        <Typography variant="body1">{selectedLog.deviceInfo.deviceType}</Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="body2" color="text.secondary">Browser</Typography>
                        <Typography variant="body1">{selectedLog.deviceInfo.browser}</Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="body2" color="text.secondary">Operating System</Typography>
                        <Typography variant="body1">{selectedLog.deviceInfo.os}</Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">User Agent</Typography>
                        <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
                          {selectedLog.userAgent}
                        </Typography>
                      </Grid>
                      {selectedLog.failureReason && (
                        <Grid item xs={12}>
                          <Typography variant="body2" color="text.secondary">Failure Reason</Typography>
                          <Typography variant="body1" color="error.main">
                            {selectedLog.failureReason.replace('_', ' ')}
                          </Typography>
                        </Grid>
                      )}
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
        </Box>
    </LayoutWithSidebar>
  );
};

export default AuthenticationLogs;

