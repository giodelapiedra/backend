import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  SelectChangeEvent
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
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

interface Case {
  _id: string;
  caseNumber: string;
  status: string;
  priority: string;
  injuryDetails: {
    bodyPart: string;
    injuryType: string;
    severity: string;
    description: string;
  };
  workRestrictions: {
    lifting: {
      maxWeight: number;
    };
    standing: {
      maxDuration: number;
    };
    other: string;
  };
  createdAt: string;
  incident: {
    incidentNumber: string;
    incidentDate: string;
    description: string;
    severity: string;
    incidentType: string;
  };
  caseManager: {
    firstName: string;
    lastName: string;
  };
  clinician?: {
    firstName: string;
    lastName: string;
  };
  notes?: Array<{
    author: {
      _id: string;
      firstName: string;
      lastName: string;
    };
    content: string;
    timestamp: string;
    type?: string;
  }>;
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
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
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
      console.log('Auth token:', localStorage.getItem('token'));
      
      const response = await api.get('/cases');
      console.log('Cases API response:', response.data);
      console.log('Cases count:', response.data.cases?.length || 0);
      console.log('Response status:', response.status);
      
      setCases(response.data.cases || []);
    } catch (err: any) {
      console.error('Error fetching cases:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      setError(err.response?.data?.message || 'Failed to fetch cases');
    } finally {
      setLoading(false);
    }
  }, [user]);
  
  useEffect(() => {
    if (user) {
      fetchCases();
    }
  }, [user, fetchCases]);
  
  const handleRefresh = React.useCallback(async () => {
    await fetchCases();
  }, [fetchCases]);
  
  // Filter cases based on search and filters
  const filteredCases = cases.filter(caseItem => {
    const matchesSearch = searchTerm === '' || 
      caseItem.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      caseItem.injuryDetails?.bodyPart?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      caseItem.injuryDetails?.injuryType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      caseItem.incident?.incidentNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || caseItem.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || caseItem.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });
  
  // Pagination logic
  const totalItems = filteredCases.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCases = filteredCases.slice(startIndex, endIndex);
  
  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
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

  const getPriorityColor = (priority: string) => {
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
    navigate(`/cases/${caseItem._id}`);
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

  return (
    <LayoutWithSidebar>
      <Box sx={{ 
        p: { xs: 1, sm: 2, md: 3 },
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
      }}>
        {/* Mobile-First Header */}
        <Card sx={{ 
          mb: { xs: 2, sm: 3 },
          borderRadius: { xs: 2, sm: 3 },
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
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
              width: '200px',
              height: '200px',
              background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
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
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                }}>
                  <Assignment sx={{ fontSize: { xs: 24, sm: 28 } }} />
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ 
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                    fontSize: { xs: '1.25rem', sm: '1.5rem' }
          }}>
            My Cases
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
                  color={showFilters ? 'primary' : 'inherit'}
                  size={window.innerWidth < 600 ? 'small' : 'medium'}
                  sx={{
                    borderRadius: { xs: 2, sm: 2 },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    bgcolor: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    borderColor: 'rgba(255,255,255,0.3)',
                    minWidth: { xs: '80px', sm: '100px' },
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.2)',
                      borderColor: 'rgba(255,255,255,0.5)'
                    }
                  }}
                >
                  Filters
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Refresh sx={{ fontSize: { xs: 16, sm: 18 } }} />}
                  onClick={handleRefresh}
                  size={window.innerWidth < 600 ? 'small' : 'medium'}
                  sx={{
                    borderRadius: { xs: 2, sm: 2 },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    bgcolor: 'rgba(255,255,255,0.9)',
                    color: 'primary.main',
                    minWidth: { xs: '80px', sm: '100px' },
                    '&:hover': {
                      bgcolor: 'white',
                      transform: 'translateY(-1px)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
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
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
        }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Grid container spacing={{ xs: 2, sm: 2 }} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  placeholder="Search cases..."
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
                <FormControl fullWidth size={window.innerWidth < 600 ? 'small' : 'medium'}>
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
                    label={`${totalItems} results`}
                    color="primary"
                    variant="outlined"
                    size={window.innerWidth < 600 ? 'small' : 'medium'}
                    sx={{
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      borderRadius: { xs: 2, sm: 2 }
                    }}
                  />
                  {(searchTerm || statusFilter !== 'all' || priorityFilter !== 'all') && (
                    <Chip
                      label="Filtered"
                      color="secondary"
                      variant="outlined"
                      size={window.innerWidth < 600 ? 'small' : 'medium'}
                      onDelete={() => {
                        setSearchTerm('');
                        setStatusFilter('all');
                        setPriorityFilter('all');
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
              Cases ({totalItems})
            </Typography>
            
            {paginatedCases.length > 0 ? (
              <>
                {/* Mobile Card View for Small Screens */}
                {window.innerWidth < 768 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {paginatedCases.map((caseItem) => (
                      <Card 
                        key={caseItem._id} 
                        sx={{
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          bgcolor: 'white',
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
                                  {caseItem.caseNumber}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{
                                  fontSize: { xs: '0.7rem', sm: '0.75rem' }
                                }}>
                                  {caseItem.injuryDetails?.bodyPart || 'N/A'} - {caseItem.injuryDetails?.injuryType || 'N/A'}
                                </Typography>
                              </Box>
                            </Box>
                            <Button
                              variant="outlined"
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
                                bgcolor: 'rgba(0,0,0,0.04)',
                                '&:hover': {
                                  bgcolor: 'rgba(0,0,0,0.08)'
                                }
                              }}
                            >
                              View
                            </Button>
                          </Box>
                          
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <Chip
                                label={caseItem.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                                color={getStatusColor(caseItem.status)}
                                size="small"
                                sx={{
                                  fontSize: { xs: '0.65rem', sm: '0.75rem' },
                                  height: { xs: 20, sm: 24 }
                                }}
                              />
                              <Chip
                                label={caseItem.priority?.toUpperCase() || 'UNKNOWN'}
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
                              {caseItem.createdAt ? new Date(caseItem.createdAt).toLocaleDateString() : 'N/A'}
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
              <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ 
                    fontWeight: 600, 
                    color: '#374151',
                    borderBottom: '1px solid #e2e8f0',
                    whiteSpace: 'nowrap',
                    padding: { xs: '8px', sm: '16px' },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' }
                  }}>Case Number</TableCell>
                  <TableCell sx={{ 
                    fontWeight: 600, 
                    color: '#374151',
                    borderBottom: '1px solid #e2e8f0',
                    whiteSpace: 'nowrap',
                    padding: { xs: '8px', sm: '16px' },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' }
                  }}>Status</TableCell>
                  <TableCell sx={{ 
                    fontWeight: 600, 
                    color: '#374151',
                    borderBottom: '1px solid #e2e8f0',
                    whiteSpace: 'nowrap',
                    padding: { xs: '8px', sm: '16px' },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' }
                  }}>Priority</TableCell>
                  <TableCell sx={{ 
                    fontWeight: 600, 
                    color: '#374151',
                    borderBottom: '1px solid #e2e8f0',
                    whiteSpace: 'nowrap',
                    padding: { xs: '8px', sm: '16px' },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    display: { xs: 'none', md: 'table-cell' }
                  }}>Injury Details</TableCell>
                  <TableCell sx={{ 
                    fontWeight: 600, 
                    color: '#374151',
                    borderBottom: '1px solid #e2e8f0',
                    whiteSpace: 'nowrap',
                    padding: { xs: '8px', sm: '16px' },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    display: { xs: 'none', lg: 'table-cell' }
                  }}>Incident</TableCell>
                  <TableCell sx={{ 
                    fontWeight: 600, 
                    color: '#374151',
                    borderBottom: '1px solid #e2e8f0',
                    whiteSpace: 'nowrap',
                    padding: { xs: '8px', sm: '16px' },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    display: { xs: 'none', md: 'table-cell' }
                  }}>Case Manager</TableCell>
                  <TableCell sx={{ 
                    fontWeight: 600, 
                    color: '#374151',
                    borderBottom: '1px solid #e2e8f0',
                    whiteSpace: 'nowrap',
                    padding: { xs: '8px', sm: '16px' },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' }
                  }}>Created</TableCell>
                  <TableCell sx={{ 
                    fontWeight: 600, 
                    color: '#374151',
                    borderBottom: '1px solid #e2e8f0',
                    whiteSpace: 'nowrap',
                    padding: { xs: '8px', sm: '16px' },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    display: { xs: 'none', md: 'table-cell' }
                  }}>Last Check-in</TableCell>
                  <TableCell sx={{ 
                    fontWeight: 600, 
                    color: '#374151',
                    borderBottom: '1px solid #e2e8f0',
                    whiteSpace: 'nowrap',
                    padding: { xs: '8px', sm: '16px' },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' }
                  }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                        {paginatedCases.map((caseItem) => (
                  <TableRow key={caseItem._id} sx={{ 
                    '&:hover': { backgroundColor: '#f8fafc' },
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
                          {caseItem.caseNumber}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ 
                      padding: { xs: '8px', sm: '16px' },
                      fontSize: { xs: '0.75rem', sm: '0.875rem' }
                    }}>
                      <Chip
                        label={caseItem.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
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
                        label={caseItem.priority?.toUpperCase() || 'UNKNOWN'}
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
                          {caseItem.injuryDetails?.bodyPart || 'N/A'} - {caseItem.injuryDetails?.injuryType || 'N/A'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{
                          fontSize: { xs: '0.65rem', sm: '0.75rem' }
                        }}>
                          {caseItem.injuryDetails?.description || 'No description available'}
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
                          {caseItem.incident?.incidentNumber || 'N/A'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{
                          fontSize: { xs: '0.65rem', sm: '0.75rem' }
                        }}>
                          {caseItem.incident?.incidentDate ? new Date(caseItem.incident.incidentDate).toLocaleDateString() : 'N/A'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{
                          fontSize: { xs: '0.65rem', sm: '0.75rem' }
                        }}>
                          {caseItem.incident?.incidentType?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
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
                        {caseItem.caseManager?.firstName || 'N/A'} {caseItem.caseManager?.lastName || 'N/A'}
                      </Typography>
                      {caseItem.clinician && (
                        <Typography variant="caption" color="text.secondary" display="block" sx={{
                          fontSize: { xs: '0.65rem', sm: '0.75rem' }
                        }}>
                          Clinician: {caseItem.clinician.firstName} {caseItem.clinician.lastName}
                        </Typography>
                      )}
                      {caseItem.notes && caseItem.notes.length > 0 && (
                        <Typography variant="caption" color="primary" display="block" sx={{
                          fontSize: { xs: '0.65rem', sm: '0.75rem' }
                        }}>
                          {caseItem.notes.length} note{caseItem.notes.length !== 1 ? 's' : ''}</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ 
                      padding: { xs: '8px', sm: '16px' },
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      whiteSpace: 'nowrap'
                    }}>
                      <Typography variant="body2" sx={{
                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                      }}>
                        {caseItem.createdAt ? new Date(caseItem.createdAt).toLocaleDateString() : 'N/A'}
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
                        variant="outlined"
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
                          touchAction: 'manipulation'
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
                {totalItems > 0 && (
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    mt: 3,
                    pt: 2,
                    borderTop: '1px solid',
                    borderColor: 'divider',
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
                        Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} entries
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
                      size={window.innerWidth < 600 ? 'small' : 'medium'}
                      showFirstButton
                      showLastButton
                      siblingCount={window.innerWidth < 600 ? 0 : 1}
                      boundaryCount={window.innerWidth < 600 ? 1 : 1}
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
                    ? 'Cases will appear here when incidents are reported involving you.'
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
