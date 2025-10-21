import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMediaQuery, useTheme } from '@mui/material';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Alert, 
  CircularProgress, 
  Button, 
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Tooltip,
  Badge,
  List,
  ListItem,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  TextField,
  InputAdornment,
  IconButton,
  SelectChangeEvent,
  Skeleton
} from '@mui/material';
import { 
  Warning, 
  Assignment, 
  LocalHospital, 
  Work, 
  CalendarToday,
  TrendingUp,
  CheckCircle,
  Pause,
  Stop,
  Search,
  Clear,
  FilterList,
  Refresh
} from '@mui/icons-material';
import LayoutWithSidebar from '../components/LayoutWithSidebar';
import { dataClient } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext.supabase';
import { CaseAssignmentService } from '../utils/caseAssignmentService';
import { getStatusLabel } from '../utils/themeUtils';

interface Case {
  id: string;
  case_number: string;
  status: string;
  priority?: string; // Optional since column doesn't exist yet
  created_at: string;
  worker?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  case_manager?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  clinician?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  incident?: {
    id: string;
    incident_type: string;
    severity: string;
    description: string;
  };
  lastCheckIn?: {
    _id: string;
    checkInDate: string;
    painLevel: {
      current: number;
    };
    workStatus: {
      workedToday: boolean;
    };
    functionalStatus: {
      sleep: number;
      mood: number;
    };
  };
}

const Cases: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const fetchCases = React.useCallback(async () => {
    try {
      console.log('Fetching cases for user:', user);
      console.log('User role:', user?.role);
      console.log('User ID:', user?.id);
      
      if (!user?.id) {
        setError('User not authenticated');
        return;
      }

      // OPTIMIZATION FOR 1K+ RECORDS: Server-side pagination + filtering
      // Calculate pagination range
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      // Build base query with joins (ONE query instead of N+1!)
      let casesQuery = dataClient
        .from('cases')
        .select(`
          *,
          worker:worker_id(id, first_name, last_name, email),
          case_manager:case_manager_id(id, first_name, last_name, email),
          clinician:clinician_id(id, first_name, last_name, email),
          incident:incident_id(id, incident_type, severity, description)
        `, { count: 'exact' }) // Get total count for pagination
        .order('created_at', { ascending: false });

      // Apply role-based filtering
      if (user.role === 'clinician') {
        casesQuery = casesQuery.eq('clinician_id', user.id);
      } else if (user.role === 'case_manager') {
        casesQuery = casesQuery.eq('case_manager_id', user.id);
      } else if (user.role === 'worker') {
        casesQuery = casesQuery.eq('worker_id', user.id);
      } else if (user.role === 'employer') {
        casesQuery = casesQuery.eq('employer_id', user.id);
      } else if (user.role !== 'admin' && user.role !== 'site_supervisor') {
        console.log('Unknown user role, showing no cases');
        setCases([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      // Apply search filter (server-side)
      if (searchTerm) {
        casesQuery = casesQuery.or(`case_number.ilike.%${searchTerm}%`);
      }

      // Apply status filter (server-side)
      if (statusFilter !== 'all') {
        casesQuery = casesQuery.eq('status', statusFilter);
      }

      // Apply priority filter (server-side)
      if (priorityFilter !== 'all') {
        casesQuery = casesQuery.eq('priority', priorityFilter);
      }

      // Apply pagination (server-side) - ONLY fetch what's needed!
      casesQuery = casesQuery.range(from, to);
      
      const { data: casesData, error: casesError, count } = await casesQuery;
      
      if (casesError) {
        console.error('Supabase error:', casesError);
        setError(casesError.message || 'Failed to fetch cases');
        return;
      }
      
      console.log('Cases fetched:', casesData?.length || 0, 'Total:', count || 0);
      setCases(casesData || []);
      setTotalCount(count || 0);
    } catch (err: any) {
      console.error('Error fetching cases:', err);
      setError(err.message || 'Failed to fetch cases');
    } finally {
      setLoading(false);
    }
  }, [user, currentPage, itemsPerPage, searchTerm, statusFilter, priorityFilter]);
  
  useEffect(() => {
    if (user) {
      fetchCases();
    }
  }, [user, fetchCases]);
  
  const handleRefresh = useCallback(async () => {
    setLoading(true);
    await fetchCases();
  }, [fetchCases]);
  
  // OPTIMIZATION: Server-side pagination means we display cases directly
  // No need for client-side filtering since it's done on the server!
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + cases.length;
  
  // Reset to first page when filters change and refetch
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      // If already on page 1, just refetch
      fetchCases();
    }
  }, [searchTerm, statusFilter, priorityFilter]);
  
  const handlePageChange = (event: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
  };
  
  const handleItemsPerPageChange = (event: SelectChangeEvent<number>) => {
    setItemsPerPage(event.target.value as number);
    setCurrentPage(1);
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: any } = {
      'new': 'info',
      'triaged': 'warning',
      'assessed': 'primary',
      'in_rehab': 'secondary',
      'return_to_work': 'success',
      'closed': 'default'
    };
    return colors[status] || 'default';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new': return <Assignment />;
      case 'triaged': return <TrendingUp />;
      case 'assessed': return <LocalHospital />;
      case 'in_rehab': return <Work />;
      case 'return_to_work': return <CheckCircle />;
      case 'closed': return <Stop />;
      default: return <Assignment />;
    }
  };

  const getPriorityColor = (priority?: string) => {
    if (!priority) return 'default';
    const colors: { [key: string]: any } = {
      'low': 'success',
      'medium': 'warning',
      'high': 'error',
      'urgent': 'error'
    };
    return colors[priority] || 'default';
  };
  
  // Handle viewing case details - navigate to full case details page
  const handleViewCaseDetails = (caseItem: Case) => {
    navigate(`/cases/${caseItem.id}`);
  };

  // OPTIMIZATION: Better loading state with skeletons
  if (loading) {
    return (
      <LayoutWithSidebar>
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, minHeight: '100vh', background: '#FFFFFF' }}>
          <Card sx={{ mb: { xs: 2, sm: 3 }, borderRadius: { xs: 2, sm: 3 } }}>
            <Skeleton variant="rectangular" height={120} />
          </Card>
          <Card sx={{ mb: { xs: 2, sm: 3 }, borderRadius: { xs: 2, sm: 3 } }}>
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Skeleton variant="rectangular" height={56} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Skeleton variant="rectangular" height={56} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Skeleton variant="rectangular" height={56} />
                </Grid>
                <Grid item xs={12} md={2}>
                  <Skeleton variant="rectangular" height={56} />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
          <Card sx={{ borderRadius: { xs: 2, sm: 3 } }}>
            <CardContent>
              {[...Array(5)].map((_, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 2 }} />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Box>
      </LayoutWithSidebar>
    );
  }

  return (
    <LayoutWithSidebar>
      <Box sx={{ 
        p: { xs: 1, sm: 2, md: 3 },
        minHeight: '100vh', 
        background: '#FFFFFF'
      }}>
        {/* Mobile-First Header */}
        <Card sx={{ 
          mb: { xs: 2, sm: 3 },
          borderRadius: { xs: 2, sm: 3 },
          boxShadow: '0 2px 8px rgba(27, 58, 87, 0.08)',
          overflow: 'hidden',
          border: '1px solid rgba(20, 184, 166, 0.1)'
        }}>
          <Box sx={{ 
            p: { xs: 2, sm: 3 },
            background: 'linear-gradient(135deg, #1B3A57 0%, #0F2942 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Background Pattern - Teal Accent */}
            <Box sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '200px',
              height: '200px',
              background: 'radial-gradient(circle, rgba(20, 184, 166, 0.15) 0%, transparent 70%)',
              borderRadius: '50%',
              transform: 'translate(50%, -50%)'
            }} />
            
            <Box sx={{ 
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', sm: 'center' },
              gap: { xs: 2, sm: 0 },
              zIndex: 1
            }}>
              <Box sx={{ 
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 1.5, sm: 2 }
              }}>
                <Box sx={{
                  width: { xs: 40, sm: 48 },
                  height: { xs: 40, sm: 48 },
                  borderRadius: { xs: '10px', sm: '12px' },
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#14B8A6',
                  boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)'
                }}>
                  <Assignment sx={{ fontSize: { xs: 24, sm: 28 }, color: 'white' }} />
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ 
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                    fontSize: { xs: '1.25rem', sm: '1.5rem' }
          }}>
            {(() => {
              switch (user?.role) {
                case 'clinician':
                  return 'My Assigned Cases';
                case 'case_manager':
                  return 'My Managed Cases';
                case 'worker':
                  return 'My Cases';
                case 'employer':
                  return 'My Workers\' Cases';
                case 'admin':
                case 'site_supervisor':
                  return 'All Cases';
                default:
                  return 'Cases';
              }
            })()}
          </Typography>
                  <Typography variant="body2" sx={{ 
                    opacity: 0.9,
                    fontSize: { xs: '0.75rem', sm: '0.875rem' }
          }}>
                    View your case history and current status
          </Typography>
        </Box>
              </Box>
              
              <Box sx={{ 
                display: 'flex',
                gap: { xs: 1, sm: 2 },
                flexDirection: { xs: 'row', sm: 'row' }
              }}>
                <Button
                  variant="outlined"
                  startIcon={<FilterList sx={{ fontSize: { xs: 16, sm: 18 } }} />}
                  onClick={() => setShowFilters(!showFilters)}
                  size={isMobile ? 'small' : 'medium'}
                  sx={{
                    borderRadius: { xs: 2, sm: 2 },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    bgcolor: showFilters ? 'rgba(20, 184, 166, 0.15)' : 'transparent',
                    color: 'white',
                    borderColor: showFilters ? '#14B8A6' : 'rgba(255,255,255,0.3)',
                    minWidth: { xs: '80px', sm: '100px' },
                    '&:hover': {
                      bgcolor: 'rgba(20, 184, 166, 0.2)',
                      borderColor: '#14B8A6'
                    }
                  }}
                >
                  Filters
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Refresh sx={{ fontSize: { xs: 16, sm: 18 } }} />}
                  onClick={handleRefresh}
                  size={isMobile ? 'small' : 'medium'}
                  sx={{
                    borderRadius: { xs: 2, sm: 2 },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    bgcolor: '#14B8A6',
                    color: 'white',
                    minWidth: { xs: '80px', sm: '100px' },
                    '&:hover': {
                      bgcolor: '#0D9488',
                      transform: 'translateY(-1px)',
                      boxShadow: '0 4px 12px rgba(20, 184, 166, 0.4)'
                    },
                    transition: 'all 0.2s ease'
                  }}
                >
                  Refresh
                </Button>
              </Box>
            </Box>
          </Box>
        </Card>
        
        {/* Mobile-Optimized Search and Filter Bar */}
        <Card sx={{ 
          mb: { xs: 2, sm: 3 },
          borderRadius: { xs: 2, sm: 3 },
          background: '#FFFFFF',
          border: '1px solid rgba(27, 58, 87, 0.1)',
          boxShadow: '0 2px 8px rgba(27, 58, 87, 0.08)',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease'
        }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Grid container spacing={{ xs: 2, sm: 2 }} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  placeholder="Search cases..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  size={isMobile ? 'small' : 'medium'}
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
                <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
                  <InputLabel sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    sx={{
                      borderRadius: { xs: 2, sm: 2 },
                      fontSize: { xs: '0.875rem', sm: '1rem' }
                    }}
                  >
                    <MenuItem value="all" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>All Status</MenuItem>
                    <MenuItem value="new" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>New</MenuItem>
                    <MenuItem value="triaged" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Triaged</MenuItem>
                    <MenuItem value="assessed" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Assessed</MenuItem>
                    <MenuItem value="in_rehab" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>In Rehab</MenuItem>
                    <MenuItem value="return_to_work" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Return to Work</MenuItem>
                    <MenuItem value="closed" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Closed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
                  <InputLabel sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Priority</InputLabel>
                  <Select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    sx={{
                      borderRadius: { xs: 2, sm: 2 },
                      fontSize: { xs: '0.875rem', sm: '1rem' }
                    }}
                  >
                    <MenuItem value="all" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>All Priorities</MenuItem>
                    <MenuItem value="low" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Low</MenuItem>
                    <MenuItem value="medium" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Medium</MenuItem>
                    <MenuItem value="high" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>High</MenuItem>
                    <MenuItem value="urgent" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>Urgent</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={2}>
                <Box sx={{ 
                  display: 'flex', 
                  gap: { xs: 1, sm: 1 },
                  flexWrap: 'wrap',
                  justifyContent: { xs: 'center', md: 'flex-start' }
                }}>
                  <Chip
                    label={`${totalCount} results`}
                    size={isMobile ? 'small' : 'medium'}
                    sx={{
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      borderRadius: { xs: 2, sm: 2 },
                      bgcolor: '#E0F2F1',
                      color: '#0D9488',
                      border: '1px solid #14B8A6',
                      fontWeight: 600
                    }}
                  />
                  {(searchTerm || statusFilter !== 'all' || priorityFilter !== 'all') && (
                    <Chip
                      label="Filtered"
                      size={isMobile ? 'small' : 'medium'}
                      onDelete={() => {
                        setSearchTerm('');
                        setStatusFilter('all');
                        setPriorityFilter('all');
                      }}
                      sx={{
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        borderRadius: { xs: 2, sm: 2 },
                        bgcolor: '#FFF4E6',
                        color: '#F59E0B',
                        border: '1px solid #FCD34D',
                        fontWeight: 600
                      }}
                    />
                  )}
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
        
        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: { xs: 2, sm: 3 },
              borderRadius: { xs: 2, sm: 2 }
            }}
          >
            {error}
          </Alert>
        )}

        {/* Mobile-Optimized Cases Display */}
        <Card sx={{
          borderRadius: { xs: 2, sm: 3 },
          background: '#FFFFFF',
          border: '1px solid rgba(27, 58, 87, 0.1)',
          boxShadow: '0 2px 8px rgba(27, 58, 87, 0.08)',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          overflow: 'hidden'
        }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant="h6" sx={{ 
              mb: { xs: 2, sm: 2 }, 
              fontWeight: 700,
              fontSize: { xs: '1.125rem', sm: '1.25rem' },
              color: '#1B3A57'
            }}>
              {(() => {
                switch (user?.role) {
                  case 'clinician':
                    return `Assigned Cases (${totalCount})`;
                  case 'case_manager':
                    return `Managed Cases (${totalCount})`;
                  case 'worker':
                    return `My Cases (${totalCount})`;
                  case 'employer':
                    return `Workers' Cases (${totalCount})`;
                  case 'admin':
                  case 'site_supervisor':
                    return `All Cases (${totalCount})`;
                  default:
                    return `Cases (${totalCount})`;
                }
              })()}
            </Typography>
            
            {cases.length > 0 ? (
              <>
                {/* Mobile Card View for Small Screens */}
                {isTablet ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {cases.map((caseItem) => (
                      <Card 
                        key={caseItem.id} 
                        sx={{
                          borderRadius: 2,
                          background: '#FFFFFF',
                          border: '1px solid rgba(27, 58, 87, 0.1)',
                          boxShadow: '0 1px 3px rgba(27, 58, 87, 0.08)',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            boxShadow: '0 4px 12px rgba(20, 184, 166, 0.15)',
                            transform: 'translateY(-3px)',
                            borderColor: '#14B8A6'
                          }
                        }}
                      >
                        <CardContent sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                              <Avatar sx={{ 
                                backgroundColor: getStatusColor(caseItem.status) === 'success' ? '#22c55e' : 
                                               getStatusColor(caseItem.status) === 'warning' ? '#f59e0b' : 
                                               getStatusColor(caseItem.status) === 'error' ? '#ef4444' : '#3b82f6',
                                width: { xs: 32, sm: 40 },
                                height: { xs: 32, sm: 40 },
                                fontSize: { xs: '0.75rem', sm: '1rem' }
                              }}>
                                {getStatusIcon(caseItem.status)}
                              </Avatar>
                              <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography variant="body2" sx={{ 
                                  fontWeight: 600,
                                  fontSize: { xs: '0.875rem', sm: '1rem' },
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {caseItem.case_number}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{
                                  fontSize: { xs: '0.7rem', sm: '0.75rem' }
                                }}>
                                  {caseItem.incident?.incident_type || 'N/A'} - {caseItem.incident?.severity || 'N/A'}
                                </Typography>
                              </Box>
                            </Box>
                            <Button
                              variant="contained"
                              size="small"
                              onClick={() => handleViewCaseDetails(caseItem)}
                              sx={{ 
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                px: { xs: 2, sm: 3 },
                                py: { xs: 1, sm: 1 },
                                minHeight: { xs: '32px', sm: '32px' },
                                bgcolor: '#14B8A6',
                                color: 'white',
                                boxShadow: '0 2px 8px rgba(20, 184, 166, 0.3)',
                                '&:hover': {
                                  bgcolor: '#0D9488',
                                  transform: 'translateY(-1px)',
                                  boxShadow: '0 4px 12px rgba(20, 184, 166, 0.4)'
                                },
                                transition: 'all 0.2s ease'
                              }}
                            >
                              View
                            </Button>
                          </Box>
                          
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <Chip
                                label={getStatusLabel(caseItem.status || 'Unknown')}
                                size="small"
                                sx={{
                                  borderRadius: '20px',
                                  fontWeight: 600,
                                  fontSize: { xs: '0.65rem', sm: '0.75rem' },
                                  height: { xs: 20, sm: 24 },
                                  backgroundColor: 
                                    caseItem.status === 'new' ? '#3b82f6' :
                                    caseItem.status === 'triaged' ? '#f59e0b' :
                                    caseItem.status === 'assessed' ? '#8b5cf6' :
                                    caseItem.status === 'in_rehab' ? '#ef4444' :
                                    caseItem.status === 'return_to_work' ? '#f97316' :
                                    caseItem.status === 'closed' ? '#6b7280' : '#6b7280',
                                  color: 'white',
                                  border: 'none',
                                  '&:hover': {
                                    opacity: 0.9
                                  }
                                }}
                              />
                              <Chip
                                label={(caseItem.priority || 'MEDIUM').toUpperCase()}
                                color={getPriorityColor(caseItem.priority)}
                                size="small"
                                variant="outlined"
                                sx={{
                                  fontSize: { xs: '0.65rem', sm: '0.75rem' },
                                  height: { xs: 20, sm: 24 }
                                }}
                              />
                            </Box>
                            <Typography variant="caption" color="text.secondary" sx={{
                              fontSize: { xs: '0.65rem', sm: '0.7rem' }
                            }}>
                              {caseItem.created_at ? new Date(caseItem.created_at).toLocaleDateString() : 'N/A'}
                            </Typography>
                          </Box>
                          
                          {caseItem.lastCheckIn && (
                            <Box sx={{ 
                              mt: 1, 
                              p: 1.5, 
                              borderRadius: 1.5,
                              bgcolor: 'rgba(0,0,0,0.02)',
                              border: '1px dashed',
                              borderColor: 'divider'
                            }}>
                              <Typography variant="caption" color="text.secondary" sx={{
                                fontSize: { xs: '0.65rem', sm: '0.7rem' },
                                fontWeight: 600
                              }}>
                                Last Check-in:
                              </Typography>
                              <Typography variant="caption" sx={{
                                fontSize: { xs: '0.65rem', sm: '0.7rem' },
                                fontWeight: 600,
                                color: caseItem.lastCheckIn.painLevel.current >= 7 ? '#dc2626' : 
                                       caseItem.lastCheckIn.painLevel.current >= 4 ? '#f59e0b' : '#22c55e',
                                ml: 1
                              }}>
                                Pain: {caseItem.lastCheckIn.painLevel.current}/10
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{
                                fontSize: { xs: '0.65rem', sm: '0.7rem' },
                                ml: 1
                              }}>
                                • {caseItem.lastCheckIn.workStatus.workedToday ? 'Working' : 'Not Working'}
                              </Typography>
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                ) : (
                  /* Desktop Table View */
                  <TableContainer component={Paper} variant="outlined" sx={{
                    borderRadius: { xs: 2, sm: 2 },
            overflow: 'auto',
            WebkitOverflowScrolling: 'touch'
          }}>
            <Table size="small">
              <TableHead sx={{ 
                background: '#F8FAFB',
                borderBottom: '2px solid #E5E7EB'
              }}>
                <TableRow>
                  <TableCell sx={{ 
                    fontWeight: 700, 
                    color: '#1B3A57',
                    borderBottom: '2px solid #14B8A6',
                    whiteSpace: 'nowrap',
                    padding: { xs: '8px', sm: '16px' },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' }
                  }}>Case Number</TableCell>
                  <TableCell sx={{ 
                    fontWeight: 700, 
                    color: '#1B3A57',
                    borderBottom: '2px solid #14B8A6',
                    whiteSpace: 'nowrap',
                    padding: { xs: '8px', sm: '16px' },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' }
                  }}>Status</TableCell>
                  <TableCell sx={{ 
                    fontWeight: 700, 
                    color: '#1B3A57',
                    borderBottom: '2px solid #14B8A6',
                    whiteSpace: 'nowrap',
                    padding: { xs: '8px', sm: '16px' },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' }
                  }}>Priority</TableCell>
                  <TableCell sx={{ 
                    fontWeight: 700, 
                    color: '#1B3A57',
                    borderBottom: '2px solid #14B8A6',
                    whiteSpace: 'nowrap',
                    padding: { xs: '8px', sm: '16px' },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    display: { xs: 'none', md: 'table-cell' }
                  }}>Injury Details</TableCell>
                  <TableCell sx={{ 
                    fontWeight: 700, 
                    color: '#1B3A57',
                    borderBottom: '2px solid #14B8A6',
                    whiteSpace: 'nowrap',
                    padding: { xs: '8px', sm: '16px' },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    display: { xs: 'none', lg: 'table-cell' }
                  }}>Incident</TableCell>
                  <TableCell sx={{ 
                    fontWeight: 700, 
                    color: '#1B3A57',
                    borderBottom: '2px solid #14B8A6',
                    whiteSpace: 'nowrap',
                    padding: { xs: '8px', sm: '16px' },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    display: { xs: 'none', md: 'table-cell' }
                  }}>Case Manager</TableCell>
                  <TableCell sx={{ 
                    fontWeight: 700, 
                    color: '#1B3A57',
                    borderBottom: '2px solid #14B8A6',
                    whiteSpace: 'nowrap',
                    padding: { xs: '8px', sm: '16px' },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' }
                  }}>Created</TableCell>
                  <TableCell sx={{ 
                    fontWeight: 700, 
                    color: '#1B3A57',
                    borderBottom: '2px solid #14B8A6',
                    whiteSpace: 'nowrap',
                    padding: { xs: '8px', sm: '16px' },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    display: { xs: 'none', md: 'table-cell' }
                  }}>Last Check-in</TableCell>
                  <TableCell sx={{ 
                    fontWeight: 700, 
                    color: '#1B3A57',
                    borderBottom: '2px solid #14B8A6',
                    whiteSpace: 'nowrap',
                    padding: { xs: '8px', sm: '16px' },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' }
                  }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                        {cases.map((caseItem) => (
                  <TableRow key={caseItem.id} sx={{ 
                    '&:hover': { backgroundColor: '#F0FDFA' },
                    '&:last-child td': { borderBottom: 0 }
                  }}>
                    <TableCell sx={{ 
                      padding: { xs: '8px', sm: '16px' },
                      fontSize: { xs: '0.75rem', sm: '0.875rem' }
                    }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar sx={{ 
                          backgroundColor: getStatusColor(caseItem.status) === 'success' ? '#22c55e' : 
                                         getStatusColor(caseItem.status) === 'warning' ? '#f59e0b' : 
                                         getStatusColor(caseItem.status) === 'error' ? '#ef4444' : '#3b82f6',
                          width: { xs: 24, sm: 32 }, 
                          height: { xs: 24, sm: 32 },
                          fontSize: { xs: '0.75rem', sm: '1rem' }
                        }}>
                          {getStatusIcon(caseItem.status)}
                        </Avatar>
                        <Typography variant="body2" sx={{ 
                          fontWeight: 500,
                          fontSize: { xs: '0.75rem', sm: '0.875rem' }
                        }}>
                          {caseItem.case_number}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ 
                      padding: { xs: '8px', sm: '16px' },
                      fontSize: { xs: '0.75rem', sm: '0.875rem' }
                    }}>
                      <Chip
                        label={getStatusLabel(caseItem.status || 'Unknown')}
                        color={getStatusColor(caseItem.status)}
                        size="small"
                        sx={{ 
                          fontWeight: 600,
                          height: { xs: '20px', sm: '24px' },
                          fontSize: { xs: '0.65rem', sm: '0.75rem' }
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ 
                      padding: { xs: '8px', sm: '16px' },
                      fontSize: { xs: '0.75rem', sm: '0.875rem' }
                    }}>
                      <Chip
                        label={(caseItem.priority || 'MEDIUM').toUpperCase()}
                        color={getPriorityColor(caseItem.priority)}
                        size="small"
                        variant="outlined"
                        sx={{ 
                          fontWeight: 600,
                          height: { xs: '20px', sm: '24px' },
                          fontSize: { xs: '0.65rem', sm: '0.75rem' }
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ 
                      padding: { xs: '8px', sm: '16px' },
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      display: { xs: 'none', md: 'table-cell' }
                    }}>
                      <Box>
                        <Typography variant="body2" sx={{ 
                          fontWeight: 500,
                          fontSize: { xs: '0.75rem', sm: '0.875rem' }
                        }}>
                          {caseItem.incident?.incident_type || 'N/A'} - {caseItem.incident?.severity || 'N/A'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{
                          fontSize: { xs: '0.65rem', sm: '0.75rem' }
                        }}>
                          {caseItem.incident?.description || 'No description available'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ 
                      padding: { xs: '8px', sm: '16px' },
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      display: { xs: 'none', lg: 'table-cell' }
                    }}>
                      <Box>
                        <Typography variant="body2" sx={{ 
                          fontWeight: 500,
                          fontSize: { xs: '0.75rem', sm: '0.875rem' }
                        }}>
                          {caseItem.incident?.id || 'N/A'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{
                          fontSize: { xs: '0.65rem', sm: '0.75rem' }
                        }}>
                          {caseItem.created_at ? new Date(caseItem.created_at).toLocaleDateString() : 'N/A'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{
                          fontSize: { xs: '0.65rem', sm: '0.75rem' }
                        }}>
                          {caseItem.incident?.incident_type?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ 
                      padding: { xs: '8px', sm: '16px' },
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      display: { xs: 'none', md: 'table-cell' }
                    }}>
                      <Typography variant="body2" sx={{
                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                      }}>
                        {caseItem.case_manager?.first_name || 'N/A'} {caseItem.case_manager?.last_name || 'N/A'}
                      </Typography>
                      {caseItem.clinician && (
                        <Typography variant="caption" color="text.secondary" display="block" sx={{
                          fontSize: { xs: '0.65rem', sm: '0.75rem' }
                        }}>
                          Clinician: {caseItem.clinician.first_name} {caseItem.clinician.last_name}
                        </Typography>
                      )}
                      {/* Notes feature removed - not available in current schema */}
                    </TableCell>
                    <TableCell sx={{ 
                      padding: { xs: '8px', sm: '16px' },
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      whiteSpace: 'nowrap'
                    }}>
                      <Typography variant="body2" sx={{
                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                      }}>
                        {caseItem.created_at ? new Date(caseItem.created_at).toLocaleDateString() : 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ 
                      padding: { xs: '8px', sm: '16px' },
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      display: { xs: 'none', md: 'table-cell' }
                    }}>
                      {caseItem.lastCheckIn ? (
                        <Box>
                          <Typography variant="body2" sx={{
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                            fontWeight: 600,
                            color: caseItem.lastCheckIn.painLevel.current >= 7 ? '#dc2626' : 
                                   caseItem.lastCheckIn.painLevel.current >= 4 ? '#f59e0b' : '#22c55e'
                          }}>
                            Pain: {caseItem.lastCheckIn.painLevel.current}/10
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{
                            fontSize: { xs: '0.65rem', sm: '0.75rem' }
                          }}>
                            {caseItem.lastCheckIn.workStatus.workedToday ? 'Working' : 'Not Working'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{
                            fontSize: { xs: '0.65rem', sm: '0.75rem' }
                          }}>
                            {new Date(caseItem.lastCheckIn.checkInDate).toLocaleDateString()}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{
                          fontSize: { xs: '0.75rem', sm: '0.875rem' }
                        }}>
                          No check-ins
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ 
                      padding: { xs: '8px', sm: '16px' },
                      fontSize: { xs: '0.75rem', sm: '0.875rem' }
                    }}>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => handleViewCaseDetails(caseItem)}
                        sx={{ 
                          borderRadius: { xs: 2, sm: 2 },
                          textTransform: 'none',
                          fontWeight: 600,
                          fontSize: { xs: '0.75rem', sm: '0.875rem' },
                          px: { xs: 2, sm: 3 },
                          py: { xs: 1, sm: 1 },
                          minHeight: { xs: '36px', sm: '32px' },
                          touchAction: 'manipulation',
                          bgcolor: '#14B8A6',
                          color: 'white',
                          boxShadow: '0 2px 8px rgba(20, 184, 166, 0.3)',
                          '&:hover': {
                            bgcolor: '#0D9488',
                            transform: 'translateY(-1px)',
                            boxShadow: '0 4px 12px rgba(20, 184, 166, 0.4)'
                          },
                          transition: 'all 0.2s ease'
                        }}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
                )}
                
                {/* Pagination Controls */}
                {totalCount > 0 && (
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    mt: 3,
                    pt: 2,
                    borderTop: '2px solid',
                    borderColor: '#E5E7EB',
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: { xs: 2, sm: 0 }
                  }}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 2,
                      justifyContent: { xs: 'center', sm: 'flex-start' }
                    }}>
                      <Typography variant="body2" color="text.secondary" sx={{
                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                      }}>
                        Showing {startIndex + 1} to {Math.min(endIndex, totalCount)} of {totalCount} entries
                      </Typography>
                      <FormControl size="small" sx={{ minWidth: 80 }}>
                        <Select
                          value={itemsPerPage}
                          onChange={handleItemsPerPageChange}
                          variant="outlined"
                          sx={{
                            fontSize: { xs: '0.75rem', sm: '0.875rem' }
                          }}
                        >
                          <MenuItem value={5} sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>5</MenuItem>
                          <MenuItem value={10} sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>10</MenuItem>
                          <MenuItem value={25} sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>25</MenuItem>
                          <MenuItem value={50} sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>50</MenuItem>
                        </Select>
                      </FormControl>
                      <Typography variant="body2" color="text.secondary" sx={{
                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                      }}>
                        per page
                      </Typography>
                    </Box>
                    
                    <Pagination
                      count={totalPages}
                      page={currentPage}
                      onChange={handlePageChange}
                      color="primary"
                      size={isMobile ? 'small' : 'medium'}
                      showFirstButton
                      showLastButton
                      siblingCount={isMobile ? 0 : 1}
                      boundaryCount={isMobile ? 1 : 1}
                      sx={{
                        '& .MuiPaginationItem-root': {
                          fontSize: { xs: '0.75rem', sm: '0.875rem' }
                        }
                      }}
                    />
                  </Box>
                )}
              </>
            ) : (
              <Box sx={{ 
              textAlign: 'center', 
              py: { xs: 4, sm: 6 },
              px: { xs: 2, sm: 3 }
            }}>
              <Assignment sx={{ 
                fontSize: { xs: 48, sm: 64 }, 
                color: '#9ca3af', 
                mb: 2 
              }} />
              <Typography variant="h6" color="text.secondary" sx={{ 
                mb: 1,
                fontSize: { xs: '1rem', sm: '1.25rem' }
              }}>
                No Cases Found
              </Typography>
              <Typography color="text.secondary" sx={{
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }}>
                  {cases.length === 0 
                    ? (() => {
                        switch (user?.role) {
                          case 'clinician':
                            return 'No cases have been assigned to you yet. Case managers will assign cases to you when needed.';
                          case 'case_manager':
                            return 'No cases have been assigned to you yet. You can create new cases or get assigned to existing ones.';
                          case 'worker':
                            return 'No cases have been created for you yet. Cases will appear here when incidents involving you are reported.';
                          case 'employer':
                            return 'No cases have been created for your workers yet. Cases will appear here when incidents involving your workers are reported.';
                          case 'admin':
                          case 'site_supervisor':
                            return 'No cases have been created yet. Cases will appear here when incidents are reported.';
                          default:
                            return 'No cases found.';
                        }
                      })()
                    : 'No cases match your current filters. Try adjusting your search criteria.'
                  }
              </Typography>
              </Box>
            )}
            </CardContent>
          </Card>
      </Box>
    </LayoutWithSidebar>
  );
};

export default Cases;
