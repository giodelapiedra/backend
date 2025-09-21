import React, { useState, useEffect } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem
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
  Stop
} from '@mui/icons-material';
import Layout from '../components/Layout';
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
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [detailsDialog, setDetailsDialog] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCases();
    }
  }, [user]);

  const fetchCases = async () => {
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
  
  // Handle viewing case details
  const handleViewCaseDetails = (caseItem: Case) => {
    setSelectedCase(caseItem);
    setDetailsDialog(true);
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
      <Box sx={{ 
        minHeight: '100vh', 
        backgroundColor: '#f8fafc',
        padding: { xs: 0, sm: 0, md: 1 },
        overflowX: 'hidden',
        width: '100%',
        maxWidth: '100vw'
      }}>
        {/* Header Section */}
        <Box sx={{ 
          backgroundColor: 'white', 
          borderRadius: { xs: 0, sm: 2, md: 3 }, 
          padding: { xs: 1.5, sm: 2, md: 3 }, 
          mb: { xs: 1, sm: 2, md: 3 },
          boxShadow: { xs: 'none', sm: '0 1px 3px rgba(0,0,0,0.1)' },
          borderBottom: { xs: '1px solid #e2e8f0', sm: 'none' }
        }}>
          <Typography variant="h3" component="h1" sx={{ 
            fontWeight: 700, 
            color: '#1e293b',
            mb: 1,
            fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' }
          }}>
            My Cases
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ 
            fontSize: { xs: '0.875rem', sm: '1rem' }
          }}>
            View your case history and current case status
          </Typography>
        </Box>
        
        {/* Case Details Dialog */}
        <Dialog 
          open={detailsDialog} 
          onClose={() => setDetailsDialog(false)} 
          maxWidth="md" 
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: { xs: 0, sm: 3 },
              boxShadow: { xs: 'none', sm: '0 10px 25px rgba(0,0,0,0.1)' },
              m: { xs: 0, sm: 2 },
              maxHeight: { xs: '100vh', sm: '90vh' },
              width: { xs: '100%', sm: 'auto' }
            }
          }}
        >
          <DialogTitle sx={{ 
            backgroundColor: '#8b5cf6',
            color: 'white',
            fontWeight: 700,
            fontSize: { xs: '1.25rem', sm: '1.5rem' },
            py: { xs: 2, sm: 3 },
            px: { xs: 2, sm: 3 }
          }}>
            Case Details: {selectedCase?.caseNumber}
          </DialogTitle>
          <DialogContent sx={{ 
            p: { xs: 1.5, sm: 2, md: 3 }, 
            maxHeight: { xs: 'calc(100vh - 200px)', sm: 'auto' },
            overflowY: { xs: 'auto', sm: 'visible' }
          }}>
            {selectedCase && (
              <Box sx={{ mt: 2 }}>
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Case Information</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                      <Box sx={{ flex: '1 1 200px' }}>
                        <Typography variant="body2" color="text.secondary">Status</Typography>
                        <Chip 
                          label={selectedCase.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                          color={getStatusColor(selectedCase.status)}
                          size="small"
                          sx={{ mt: 0.5 }}
                        />
                      </Box>
                      <Box sx={{ flex: '1 1 200px' }}>
                        <Typography variant="body2" color="text.secondary">Priority</Typography>
                        <Chip 
                          label={selectedCase.priority?.toUpperCase() || 'UNKNOWN'}
                          color={getPriorityColor(selectedCase.priority)}
                          size="small"
                          sx={{ mt: 0.5 }}
                        />
                      </Box>
                      <Box sx={{ flex: '1 1 200px' }}>
                        <Typography variant="body2" color="text.secondary">Created</Typography>
                        <Typography variant="body1">
                          {selectedCase.createdAt ? new Date(selectedCase.createdAt).toLocaleDateString() : 'N/A'}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
                
                {/* Case Notes Section */}
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Case Notes</Typography>
                    {selectedCase.notes && selectedCase.notes.length > 0 ? (
                      <List>
                        {selectedCase.notes.map((note, index) => (
                          <ListItem key={index} divider={index < selectedCase.notes!.length - 1}>
                            <Box sx={{ width: '100%' }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="subtitle2">
                                  {note.author.firstName} {note.author.lastName}
                                  {note.type && (
                                    <Chip 
                                      size="small" 
                                      label={note.type === 'case_manager_note' ? 'Case Manager' : 
                                             note.type === 'assignment' ? 'Assignment' : 
                                             note.type}
                                      color={note.type === 'case_manager_note' ? 'primary' : 
                                             note.type === 'assignment' ? 'secondary' : 
                                             'default'}
                                      sx={{ ml: 1 }} 
                                    />
                                  )}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {new Date(note.timestamp).toLocaleString()}
                                </Typography>
                              </Box>
                              <Typography variant="body2">{note.content}</Typography>
                            </Box>
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Typography variant="body2" color="text.secondary">No notes available for this case.</Typography>
                    )}
                  </CardContent>
                </Card>

                {/* Last Check-in Section */}
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Latest Check-in</Typography>
                    {selectedCase.lastCheckIn ? (
                      <Box>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                          <Box sx={{ flex: '1 1 150px' }}>
                            <Typography variant="body2" color="text.secondary">Pain Level</Typography>
                            <Typography 
                              variant="h6" 
                              sx={{ 
                                color: selectedCase.lastCheckIn.painLevel.current >= 7 ? '#dc2626' : 
                                      selectedCase.lastCheckIn.painLevel.current >= 4 ? '#f59e0b' : '#22c55e',
                                fontWeight: 600
                              }}
                            >
                              {selectedCase.lastCheckIn.painLevel.current}/10
                            </Typography>
                          </Box>
                          <Box sx={{ flex: '1 1 150px' }}>
                            <Typography variant="body2" color="text.secondary">Work Status</Typography>
                            <Chip 
                              label={selectedCase.lastCheckIn.workStatus.workedToday ? 'Working' : 'Not Working'}
                              color={selectedCase.lastCheckIn.workStatus.workedToday ? 'success' : 'error'}
                              size="small"
                              sx={{ mt: 0.5 }}
                            />
                          </Box>
                          <Box sx={{ flex: '1 1 150px' }}>
                            <Typography variant="body2" color="text.secondary">Sleep Quality</Typography>
                            <Typography variant="body1">
                              {selectedCase.lastCheckIn.functionalStatus.sleep >= 7 ? 'Good' : 
                               selectedCase.lastCheckIn.functionalStatus.sleep >= 4 ? 'Fair' : 'Poor'}
                            </Typography>
                          </Box>
                          <Box sx={{ flex: '1 1 150px' }}>
                            <Typography variant="body2" color="text.secondary">Mood</Typography>
                            <Typography variant="body1">
                              {selectedCase.lastCheckIn.functionalStatus.mood >= 7 ? 'Good' : 
                               selectedCase.lastCheckIn.functionalStatus.mood >= 4 ? 'Fair' : 'Poor'}
                            </Typography>
                          </Box>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          Last updated: {new Date(selectedCase.lastCheckIn.checkInDate).toLocaleString()}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">No check-ins available for this case.</Typography>
                    )}
                  </CardContent>
                </Card>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ 
            p: { xs: 1.5, sm: 2, md: 3 }, 
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            position: { xs: 'sticky', sm: 'static' },
            bottom: { xs: 0, sm: 'auto' },
            zIndex: { xs: 1, sm: 'auto' }
          }}>
            <Button 
              onClick={() => setDetailsDialog(false)}
              variant="outlined"
              fullWidth={true}
              sx={{ 
                borderRadius: { xs: 3, sm: 2 },
                px: { xs: 3, sm: 3 },
                py: { xs: 1.5, sm: 1.5 },
                textTransform: 'none',
                fontSize: { xs: '1rem', sm: '1rem' },
                fontWeight: 600,
                color: '#8b5cf6',
                borderColor: '#8b5cf6',
                minHeight: { xs: '52px', sm: '40px' },
                touchAction: 'manipulation'
              }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {cases.length > 0 ? (
          <TableContainer component={Paper} sx={{ 
            borderRadius: { xs: 0, sm: 2, md: 3 },
            boxShadow: { xs: 'none', sm: '0 1px 3px rgba(0,0,0,0.1)' },
            border: { xs: 'none', sm: '1px solid #e2e8f0' },
            overflow: 'auto',
            WebkitOverflowScrolling: 'touch',
            '&::-webkit-scrollbar': {
              height: '6px',
              width: '6px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: '#f1f1f1',
              borderRadius: '3px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#c1c1c1',
              borderRadius: '3px',
              '&:hover': {
                backgroundColor: '#a8a8a8',
              },
            },
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
                {cases.map((caseItem) => (
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
        ) : (
          <Card sx={{ 
            borderRadius: { xs: 0, sm: 2, md: 3 }, 
            boxShadow: { xs: 'none', sm: '0 1px 3px rgba(0,0,0,0.1)' },
            border: { xs: 'none', sm: '1px solid #e2e8f0' }
          }}>
            <CardContent sx={{ 
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
                Cases will appear here when incidents are reported involving you.
              </Typography>
            </CardContent>
          </Card>
        )}
      </Box>
    </Layout>
  );
};

export default Cases;
