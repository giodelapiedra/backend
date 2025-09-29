import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
} from '@mui/material';
import {
  Add,
  Visibility,
  Warning,
  Assignment,
  Person,
  TrendingUp,
  CheckCircle,
  Refresh,
} from '@mui/icons-material';
import LayoutWithSidebar from '../../components/LayoutWithSidebar';
import api from '../../utils/api';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
}

interface Incident {
  _id: string;
  incidentNumber: string;
  incidentDate: string;
  incidentType: string;
  severity: string;
  status: string;
  description: string;
  worker: User;
  reportedBy: User;
  createdAt: string;
}

interface Case {
  _id: string;
  caseNumber: string;
  status: string;
  priority: string;
  worker: User;
  caseManager: User;
  clinician?: User;
  incident: {
    incidentNumber: string;
    incidentDate: string;
    description: string;
  };
  injuryDetails: {
    bodyPart: string;
    injuryType: string;
    severity: string;
    description: string;
  };
  workRestrictions?: {
    lifting?: {
      maxWeight?: number;
      frequency?: string;
      duration?: string;
    };
    standing?: {
      maxDuration?: number;
      breaks?: number;
    };
    sitting?: {
      maxDuration?: number;
      breaks?: number;
    };
    bending?: boolean;
    twisting?: boolean;
    climbing?: boolean;
    driving?: boolean;
    other?: string;
  };
  createdAt: string;
}

interface DashboardStats {
  incidents: {
    total: number;
    recent: number;
    statusStats: Array<{ _id: string; count: number }>;
    severityStats: Array<{ _id: string; count: number }>;
  };
  cases: {
    total: number;
    statusStats: Array<{ _id: string; count: number }>;
    priorityStats: Array<{ _id: string; count: number }>;
  };
  compliance: {
    totalWorkers: number;
    compliantWorkers: number;
    nonCompliantWorkers: number;
    averageComplianceScore: number;
    restrictionViolations: number;
  };
}

const EmployerDashboard: React.FC = () => {
  // All hooks must be called before any conditional returns
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  
  // Data states
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [workers, setWorkers] = useState<User[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [complianceData, setComplianceData] = useState<any[]>([]);
  const [successMessage, setSuccessMessage] = useState<string>('');
  
  // Dialog states
  const [incidentDialog, setIncidentDialog] = useState(false);
  const [caseDialog, setCaseDialog] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  
  // Form states
  const [incidentForm, setIncidentForm] = useState({
    worker: '',
    incidentDate: '',
    incidentType: '',
    severity: '',
    description: '',
    location: {
      site: '',
      department: '',
      specificLocation: ''
    },
    immediateCause: '',
    rootCause: '',
    immediateActions: [] as string[],
    correctiveActions: [] as string[],
    preventiveActions: [] as string[]
  });

  // useEffect must also be called before conditional returns
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [incidentsRes, casesRes, workersRes, incidentStatsRes, caseStatsRes, checkInsRes] = await Promise.all([
        api.get('/incidents'),
        api.get('/cases'),
        api.get('/users/role/worker'),
        api.get('/incidents/dashboard/stats'),
        api.get('/cases/dashboard/stats'),
        api.get('/check-ins').catch(() => ({ data: { checkIns: [] } })) // Handle if endpoint doesn't exist
      ]);

      setIncidents(incidentsRes.data.incidents || []);
      setCases(casesRes.data.cases || []);
      setWorkers(workersRes.data.users || []);
      setComplianceData(checkInsRes.data.checkIns || []);
      
      // Calculate compliance stats
      const totalWorkers = workersRes.data.users?.length || 0;
      const recentCheckIns = checkInsRes.data.checkIns || [];
      const compliantWorkers = recentCheckIns.filter((checkIn: any) => 
        checkIn.exerciseCompliance?.completed && 
        checkIn.medicationCompliance?.taken
      ).length;
      const nonCompliantWorkers = totalWorkers - compliantWorkers;
      const averageComplianceScore = totalWorkers > 0 ? 
        Math.round((compliantWorkers / totalWorkers) * 100) : 0;
      
      setStats({
        incidents: {
          total: incidentsRes.data.pagination?.total || 0,
          recent: incidentStatsRes.data.recentIncidents || 0,
          statusStats: incidentStatsRes.data.statusStats || [],
          severityStats: incidentStatsRes.data.severityStats || []
        },
        cases: {
          total: casesRes.data.pagination?.total || 0,
          statusStats: caseStatsRes.data.statusStats || [],
          priorityStats: caseStatsRes.data.priorityStats || []
        },
        compliance: {
          totalWorkers,
          compliantWorkers,
          nonCompliantWorkers,
          averageComplianceScore,
          restrictionViolations: 0 // This would need to be calculated from work restrictions
        }
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIncident = async () => {
    try {
      // Validate required fields
      if (!incidentForm.worker) {
        setError('Please select a worker');
        return;
      }
      if (!incidentForm.incidentDate) {
        setError('Please select an incident date');
        return;
      }
      if (!incidentForm.incidentType) {
        setError('Please select an incident type');
        return;
      }
      if (!incidentForm.severity) {
        setError('Please select a severity level');
        return;
      }
      if (!incidentForm.description.trim()) {
        setError('Please provide a description');
        return;
      }

      // Convert datetime-local format to ISO8601 format
      const formattedData = {
        ...incidentForm,
        incidentDate: incidentForm.incidentDate ? new Date(incidentForm.incidentDate).toISOString() : ''
      };
      
      const response = await api.post('/incidents', formattedData);
      
      // Show success message
      setError(null);
      setIncidentDialog(false);
      setIncidentForm({
        worker: '',
        incidentDate: '',
        incidentType: '',
        severity: '',
        description: '',
        location: { site: '', department: '', specificLocation: '' },
        immediateCause: '',
        rootCause: '',
        immediateActions: [],
        correctiveActions: [],
        preventiveActions: []
      });
      fetchData();
      
      // Display success message with case information
      const caseNumber = response.data.incident?.caseNumber || 'a new case';
      const successMessage = `Incident reported successfully! The system has automatically created ${caseNumber} and assigned it to an available Case Manager and Clinician.`;
      
      // Use a more user-friendly notification than alert
      setError(null);
      // Display a success message that will be shown in the UI
      setSuccessMessage(successMessage);
      setTimeout(() => setSuccessMessage(''), 5000); // Clear after 5 seconds
   } catch (err: any) {
     setError(err.response?.data?.message || 'Failed to create incident');
   }
 };

   const handleUpdateIncidentStatus = async (incidentId: string, status: string) => {
     try {
       await api.put(`/incidents/${incidentId}`, { status });
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update incident');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'fatality': return 'error';
      case 'lost_time': return 'warning';
      case 'medical_treatment': return 'info';
      case 'first_aid': return 'success';
      case 'near_miss': return 'default';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'closed': return 'success';
      case 'investigated': return 'info';
      case 'investigating': return 'warning';
      case 'reported': return 'default';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <LayoutWithSidebar>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </LayoutWithSidebar>
    );
  }

  return (
    <LayoutWithSidebar>
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
        <Box 
          display="flex" 
          flexDirection={{ xs: 'column', md: 'row' }} 
          justifyContent="space-between" 
          alignItems={{ xs: 'flex-start', md: 'center' }}
          gap={{ xs: 2, md: 0 }}
        >
          <Box>
            <Typography variant="h3" component="h1" sx={{ 
              fontWeight: 700, 
              color: '#1e293b',
              mb: 1,
              fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' }
            }}>
              Employer Dashboard
            </Typography>
            <Box 
              display="flex" 
              flexDirection={{ xs: 'column', sm: 'row' }} 
              justifyContent="space-between" 
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              gap={{ xs: 1, sm: 2 }}
            >
              <Typography variant="body1" color="text.secondary">
                Manage incidents, cases, and workers efficiently
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', md: 'block' } }}>
                Employer → Monitor Cases → View Analytics → Ensure Compliance
              </Typography>
            </Box>
          </Box>
          <Box 
            display="flex" 
            gap={{ xs: 1, sm: 2 }}
            width={{ xs: '100%', md: 'auto' }}
            flexDirection={{ xs: 'column', sm: 'row' }}
          >
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                setIncidentDialog(true);
                setError(null);
              }}
              sx={{ 
                backgroundColor: '#8b5cf6',
                borderRadius: { xs: 3, sm: 2 },
                px: { xs: 3, sm: 3 },
                py: { xs: 1.5, sm: 1.5 },
                textTransform: 'none',
                fontSize: { xs: '1rem', sm: '1rem' },
                fontWeight: 600,
                width: { xs: '100%', sm: 'auto' },
                minHeight: { xs: '48px', sm: '40px' },
                touchAction: 'manipulation',
                '&:hover': {
                  backgroundColor: '#7c3aed'
                }
              }}
            >
              Report Incident
            </Button>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchData}
              sx={{ 
                borderRadius: { xs: 3, sm: 2 },
                px: { xs: 3, sm: 3 },
                py: { xs: 1.5, sm: 1.5 },
                textTransform: 'none',
                fontSize: { xs: '1rem', sm: '1rem' },
                fontWeight: 600,
                width: { xs: '100%', sm: 'auto' },
                minHeight: { xs: '48px', sm: '40px' },
                touchAction: 'manipulation',
                borderColor: '#e2e8f0',
                color: '#64748b',
                '&:hover': {
                  borderColor: '#8b5cf6',
                  color: '#8b5cf6'
                }
              }}
            >
              Refresh Data
            </Button>
          </Box>
        </Box>
      </Box>

      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 3, 
            borderRadius: 2,
            backgroundColor: '#fef2f2',
            borderColor: '#fecaca',
            color: '#dc2626'
          }} 
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}
      
      {successMessage && (
        <Alert 
          severity="success" 
          sx={{ 
            mb: 3, 
            borderRadius: 2,
            backgroundColor: '#f0fdf4',
            borderColor: '#bbf7d0',
            color: '#166534'
          }} 
          onClose={() => setSuccessMessage('')}
        >
          {successMessage}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: { xs: 1, sm: 1.5, md: 2 }, 
        mb: { xs: 2, sm: 3, md: 4 },
        px: { xs: 0, sm: 0 }
      }}>
        <Card sx={{ 
          borderRadius: { xs: 2, sm: 3 },
          boxShadow: { xs: '0 2px 8px rgba(0,0,0,0.1)', sm: '0 1px 3px rgba(0,0,0,0.1)' },
          border: 'none',
          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
          minHeight: { xs: '100px', sm: '120px' }
        }}>
          <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 }, height: '100%' }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" height="100%">
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ 
                    color: '#92400e', 
                    fontWeight: 600,
                    mb: 0.5,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontSize: { xs: '0.7rem', sm: '0.75rem' }
                  }}>
                    Total Incidents
                  </Typography>
                  <Typography variant="h3" sx={{ 
                    fontWeight: 800, 
                    color: '#92400e',
                    lineHeight: 1,
                    fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' }
                  }}>
                    {stats?.incidents.total || 0}
                  </Typography>
                  <Typography variant="caption" sx={{ 
                    color: '#92400e',
                    fontSize: { xs: '0.6rem', sm: '0.7rem' },
                    display: { xs: 'none', md: 'block' }
                  }}>
                    All incidents create cases
                  </Typography>
                </Box>
                <Box sx={{ 
                  backgroundColor: '#f59e0b',
                  borderRadius: { xs: 1.5, sm: 2 },
                  p: { xs: 1, sm: 1.5 },
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: { xs: '40px', sm: '48px' },
                  minHeight: { xs: '40px', sm: '48px' }
                }}>
                  <Warning sx={{ fontSize: { xs: 18, sm: 20, md: 24 }, color: 'white' }} />
                </Box>
              </Box>
          </CardContent>
        </Card>

        <Card sx={{ 
          borderRadius: { xs: 2, sm: 3 },
          boxShadow: { xs: '0 2px 8px rgba(0,0,0,0.1)', sm: '0 1px 3px rgba(0,0,0,0.1)' },
          border: 'none',
          background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
          minHeight: { xs: '100px', sm: '120px' }
        }}>
          <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 }, height: '100%' }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" height="100%">
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ 
                  color: '#1e40af', 
                  fontWeight: 600,
                  mb: 0.5,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontSize: { xs: '0.7rem', sm: '0.75rem' }
                }}>
                  Active Cases
                </Typography>
                <Typography variant="h3" sx={{ 
                  fontWeight: 800, 
                  color: '#1e40af',
                  lineHeight: 1,
                  fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' }
                }}>
                  {stats?.cases.total || 0}
                </Typography>
              </Box>
              <Box sx={{ 
                backgroundColor: '#3b82f6',
                borderRadius: { xs: 1.5, sm: 2 },
                p: { xs: 1, sm: 1.5 },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: { xs: '40px', sm: '48px' },
                minHeight: { xs: '40px', sm: '48px' }
              }}>
                <Assignment sx={{ fontSize: { xs: 18, sm: 20, md: 24 }, color: 'white' }} />
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ 
          borderRadius: { xs: 2, sm: 3 },
          boxShadow: { xs: '0 2px 8px rgba(0,0,0,0.1)', sm: '0 1px 3px rgba(0,0,0,0.1)' },
          border: 'none',
          background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
          minHeight: { xs: '100px', sm: '120px' }
        }}>
          <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 }, height: '100%' }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" height="100%">
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ 
                  color: '#166534', 
                  fontWeight: 600,
                  mb: 0.5,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontSize: { xs: '0.7rem', sm: '0.75rem' }
                }}>
                  Workers
                </Typography>
                <Typography variant="h3" sx={{ 
                  fontWeight: 800, 
                  color: '#166534',
                  lineHeight: 1,
                  fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' }
                }}>
                  {workers.length}
                </Typography>
              </Box>
              <Box sx={{ 
                backgroundColor: '#22c55e',
                borderRadius: { xs: 1.5, sm: 2 },
                p: { xs: 1, sm: 1.5 },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: { xs: '40px', sm: '48px' },
                minHeight: { xs: '40px', sm: '48px' }
              }}>
                <Person sx={{ fontSize: { xs: 18, sm: 20, md: 24 }, color: 'white' }} />
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ 
          borderRadius: { xs: 2, sm: 3 },
          boxShadow: { xs: '0 2px 8px rgba(0,0,0,0.1)', sm: '0 1px 3px rgba(0,0,0,0.1)' },
          border: 'none',
          background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)',
          minHeight: { xs: '100px', sm: '120px' }
        }}>
          <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 }, height: '100%' }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" height="100%">
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ 
                  color: '#7c2d12', 
                  fontWeight: 600,
                  mb: 0.5,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontSize: { xs: '0.7rem', sm: '0.75rem' }
                }}>
                  Recent Incidents
                </Typography>
                <Typography variant="h3" sx={{ 
                  fontWeight: 800, 
                  color: '#7c2d12',
                  lineHeight: 1,
                  fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' }
                }}>
                  {stats?.incidents.recent || 0}
                </Typography>
              </Box>
              <Box sx={{ 
                backgroundColor: '#8b5cf6',
                borderRadius: { xs: 1.5, sm: 2 },
                p: { xs: 1, sm: 1.5 },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: { xs: '40px', sm: '48px' },
                minHeight: { xs: '40px', sm: '48px' }
              }}>
                <TrendingUp sx={{ fontSize: { xs: 18, sm: 20, md: 24 }, color: 'white' }} />
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Main Content Tabs */}
      <Card sx={{ 
        borderRadius: { xs: 0, sm: 2, md: 3 },
        boxShadow: { xs: 'none', sm: '0 1px 3px rgba(0,0,0,0.1)' },
        border: 'none',
        overflow: 'hidden',
        borderTop: { xs: '1px solid #e2e8f0', sm: 'none' }
      }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: { xs: '0.8rem', sm: '0.875rem', md: '1rem' },
              color: '#64748b',
              minHeight: { xs: 56, sm: 60 },
              minWidth: { xs: 100, sm: 120 },
              padding: { xs: '12px 16px', sm: '12px 16px' },
              touchAction: 'manipulation',
              '&.Mui-selected': {
                color: '#8b5cf6',
                backgroundColor: 'white'
              }
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#8b5cf6',
              height: 3
            }
          }}
        >
          <Tab label="Incidents" />
          <Tab label="Cases" />
          <Tab label="Workers" />
          <Tab label="Compliance" />
        </Tabs>

        <Box sx={{ p: { xs: 1, sm: 2, md: 4 } }}>
          {/* Incidents Tab */}
          {activeTab === 0 && (
            <Box>
              <Box 
                display="flex" 
                flexDirection={{ xs: 'column', sm: 'row' }} 
                justifyContent="space-between" 
                alignItems={{ xs: 'flex-start', sm: 'center' }} 
                gap={{ xs: 1, sm: 0 }}
                mb={{ xs: 2, sm: 3 }}
              >
                <Typography variant="h5" sx={{ 
                  fontWeight: 700, 
                  color: '#1e293b',
                  fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' }
                }}>
                  Recent Incidents
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {incidents.length} total incidents
                </Typography>
              </Box>
              
              <Box sx={{ 
                backgroundColor: 'white',
                borderRadius: { xs: 0, sm: 1, md: 2 },
                overflow: 'auto',
                border: { xs: 'none', sm: '1px solid #e2e8f0' },
                maxWidth: '100%',
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
                      }}>
                        Incident #
                      </TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        color: '#374151',
                        borderBottom: '1px solid #e2e8f0',
                        whiteSpace: 'nowrap',
                        padding: { xs: '8px', sm: '16px' },
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        display: { xs: 'none', md: 'table-cell' }
                      }}>
                        Worker
                      </TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        color: '#374151',
                        borderBottom: '1px solid #e2e8f0',
                        whiteSpace: 'nowrap',
                        padding: { xs: '8px', sm: '16px' },
                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                      }}>
                        Date
                      </TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        color: '#374151',
                        borderBottom: '1px solid #e2e8f0',
                        whiteSpace: 'nowrap',
                        padding: { xs: '8px', sm: '16px' },
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        display: { xs: 'none', sm: 'table-cell' }
                      }}>
                        Type
                      </TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        color: '#374151',
                        borderBottom: '1px solid #e2e8f0',
                        whiteSpace: 'nowrap',
                        padding: { xs: '8px', sm: '16px' },
                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                      }}>
                        Severity
                      </TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        color: '#374151',
                        borderBottom: '1px solid #e2e8f0',
                        whiteSpace: 'nowrap',
                        padding: { xs: '8px', sm: '16px' },
                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                      }}>
                        Status
                      </TableCell>
                      <TableCell sx={{ 
                        fontWeight: 600, 
                        color: '#374151',
                        borderBottom: '1px solid #e2e8f0',
                        whiteSpace: 'nowrap',
                        padding: { xs: '8px', sm: '16px' },
                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                      }}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {incidents.slice(0, 5).map((incident) => (
                      <TableRow 
                        key={incident._id}
                        sx={{ 
                          '&:hover': { backgroundColor: '#f8fafc' },
                          '&:last-child td': { borderBottom: 0 }
                        }}
                      >
                        <TableCell sx={{ 
                          fontWeight: 600,
                          color: '#8b5cf6',
                          padding: { xs: '8px', sm: '16px' },
                          fontSize: { xs: '0.75rem', sm: '0.875rem' }
                        }}>
                          {incident.incidentNumber}
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
                              {incident.worker.firstName} {incident.worker.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{
                              fontSize: { xs: '0.65rem', sm: '0.75rem' }
                            }}>
                              {incident.worker.email}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ 
                          padding: { xs: '8px', sm: '16px' },
                          fontSize: { xs: '0.75rem', sm: '0.875rem' },
                          whiteSpace: 'nowrap'
                        }}>
                          {new Date(incident.incidentDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell sx={{ 
                          padding: { xs: '8px', sm: '16px' },
                          fontSize: { xs: '0.75rem', sm: '0.875rem' },
                          display: { xs: 'none', sm: 'table-cell' }
                        }}>
                          <Typography variant="body2" sx={{ 
                            textTransform: 'capitalize',
                            fontSize: { xs: '0.75rem', sm: '0.875rem' }
                          }}>
                            {incident.incidentType.replace('_', ' ')}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ 
                          padding: { xs: '8px', sm: '16px' },
                          fontSize: { xs: '0.75rem', sm: '0.875rem' }
                        }}>
                          <Chip
                            label={incident.severity.replace('_', ' ')}
                            color={getSeverityColor(incident.severity)}
                            size="small"
                            sx={{ 
                              fontWeight: 500,
                              textTransform: 'capitalize',
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
                            label={incident.status.replace('_', ' ')}
                            color={getStatusColor(incident.status)}
                            size="small"
                            sx={{ 
                              fontWeight: 500,
                              textTransform: 'capitalize',
                              height: { xs: '20px', sm: '24px' },
                              fontSize: { xs: '0.65rem', sm: '0.75rem' }
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ 
                          padding: { xs: '8px', sm: '16px' },
                          fontSize: { xs: '0.75rem', sm: '0.875rem' }
                        }}>
                          <Box display="flex" gap={1}>
                            <IconButton
                              size="small"
                              onClick={() => setSelectedIncident(incident)}
                              sx={{ 
                                color: '#8b5cf6',
                                '&:hover': { backgroundColor: '#f3e8ff' },
                                padding: { xs: '12px', sm: '8px' },
                                minWidth: { xs: '48px', sm: '40px' },
                                minHeight: { xs: '48px', sm: '40px' },
                                touchAction: 'manipulation',
                                borderRadius: { xs: 2, sm: 1 }
                              }}
                            >
                              <Visibility sx={{ fontSize: { xs: '1.5rem', sm: '1.25rem' } }} />
                            </IconButton>
                            {incident.status !== 'closed' && (
                              <IconButton
                                size="small"
                                onClick={() => handleUpdateIncidentStatus(incident._id, 'closed')}
                                sx={{ 
                                  color: '#22c55e',
                                  '&:hover': { backgroundColor: '#dcfce7' },
                                  padding: { xs: '12px', sm: '8px' },
                                  minWidth: { xs: '48px', sm: '40px' },
                                  minHeight: { xs: '48px', sm: '40px' },
                                  touchAction: 'manipulation',
                                  borderRadius: { xs: 2, sm: 1 }
                                }}
                              >
                                <CheckCircle sx={{ fontSize: { xs: '1.5rem', sm: '1.25rem' } }} />
                              </IconButton>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Box>
          )}

            {/* Cases Tab */}
            {activeTab === 1 && (
              <Box>
                <Box 
                  display="flex" 
                  flexDirection={{ xs: 'column', sm: 'row' }} 
                  justifyContent="space-between" 
                  alignItems={{ xs: 'flex-start', sm: 'center' }} 
                  gap={{ xs: 1, sm: 0 }}
                  mb={{ xs: 2, sm: 3 }}
                >
                  <Typography variant="h5" sx={{ 
                    fontWeight: 700, 
                    color: '#1e293b',
                    fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' }
                  }}>
                    Active Cases
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {cases.length} total cases
                  </Typography>
                </Box>
                
                <Box sx={{ 
                  backgroundColor: 'white',
                  borderRadius: { xs: 0, sm: 1, md: 2 },
                  overflow: 'auto',
                  border: { xs: 'none', sm: '1px solid #e2e8f0' },
                  maxWidth: '100%',
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
                        }}>Case #</TableCell>
                        <TableCell sx={{ 
                          fontWeight: 600, 
                          color: '#374151',
                          borderBottom: '1px solid #e2e8f0',
                          whiteSpace: 'nowrap',
                          padding: { xs: '8px', sm: '16px' },
                          fontSize: { xs: '0.75rem', sm: '0.875rem' },
                          display: { xs: 'none', md: 'table-cell' }
                        }}>Worker</TableCell>
                        <TableCell sx={{ 
                          fontWeight: 600, 
                          color: '#374151',
                          borderBottom: '1px solid #e2e8f0',
                          whiteSpace: 'nowrap',
                          padding: { xs: '8px', sm: '16px' },
                          fontSize: { xs: '0.75rem', sm: '0.875rem' },
                          display: { xs: 'none', sm: 'table-cell' }
                        }}>Injury</TableCell>
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
                          fontSize: { xs: '0.75rem', sm: '0.875rem' }
                        }}>Status</TableCell>
                        <TableCell sx={{ 
                          fontWeight: 600, 
                          color: '#374151',
                          borderBottom: '1px solid #e2e8f0',
                          whiteSpace: 'nowrap',
                          padding: { xs: '8px', sm: '16px' },
                          fontSize: { xs: '0.75rem', sm: '0.875rem' },
                          display: { xs: 'none', lg: 'table-cell' }
                        }}>Case Manager</TableCell>
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
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                            fontWeight: 600,
                            color: '#8b5cf6'
                          }}>{caseItem.caseNumber}</TableCell>
                          <TableCell sx={{ 
                            padding: { xs: '8px', sm: '16px' },
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                            display: { xs: 'none', md: 'table-cell' }
                          }}>
                            {caseItem.worker.firstName} {caseItem.worker.lastName}
                          </TableCell>
                          <TableCell sx={{ 
                            padding: { xs: '8px', sm: '16px' },
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                            display: { xs: 'none', sm: 'table-cell' }
                          }}>
                            {caseItem.injuryDetails.bodyPart} - {caseItem.injuryDetails.injuryType}
                          </TableCell>
                          <TableCell sx={{ 
                            padding: { xs: '8px', sm: '16px' },
                            fontSize: { xs: '0.75rem', sm: '0.875rem' }
                          }}>
                            <Chip 
                              label={caseItem.priority} 
                              color={getPriorityColor(caseItem.priority)}
                              size="small" 
                              sx={{ 
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
                              label={caseItem.status.replace('_', ' ')} 
                              color={getStatusColor(caseItem.status)}
                              size="small" 
                              sx={{ 
                                height: { xs: '20px', sm: '24px' },
                                fontSize: { xs: '0.65rem', sm: '0.75rem' }
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ 
                            padding: { xs: '8px', sm: '16px' },
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                            display: { xs: 'none', lg: 'table-cell' }
                          }}>
                            {caseItem.caseManager.firstName} {caseItem.caseManager.lastName}
                          </TableCell>
                          <TableCell sx={{ 
                            padding: { xs: '8px', sm: '16px' },
                            fontSize: { xs: '0.75rem', sm: '0.875rem' }
                          }}>
                            <IconButton
                              size="small"
                              onClick={() => setSelectedCase(caseItem)}
                              sx={{ 
                                color: '#8b5cf6',
                                '&:hover': { backgroundColor: '#f3e8ff' },
                                padding: { xs: '12px', sm: '8px' },
                                minWidth: { xs: '48px', sm: '40px' },
                                minHeight: { xs: '48px', sm: '40px' },
                                touchAction: 'manipulation',
                                borderRadius: { xs: 2, sm: 1 }
                              }}
                            >
                              <Visibility sx={{ fontSize: { xs: '1.5rem', sm: '1.25rem' } }} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </Box>
            )}

            {/* Workers Tab */}
            {activeTab === 2 && (
              <Box>
                <Box 
                  display="flex" 
                  flexDirection={{ xs: 'column', sm: 'row' }} 
                  justifyContent="space-between" 
                  alignItems={{ xs: 'flex-start', sm: 'center' }} 
                  gap={{ xs: 1, sm: 0 }}
                  mb={{ xs: 2, sm: 3 }}
                >
                  <Typography variant="h5" sx={{ 
                    fontWeight: 700, 
                    color: '#1e293b',
                    fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' }
                  }}>
                    Workers
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {workers.length} total workers
                  </Typography>
                </Box>
                
                <Box sx={{ 
                  backgroundColor: 'white',
                  borderRadius: { xs: 1, sm: 2 },
                  overflow: 'hidden',
                  border: '1px solid #e2e8f0',
                }}>
                  <List disablePadding>
                  {workers.map((worker) => (
                    <React.Fragment key={worker._id}>
                        <ListItem 
                          sx={{ 
                            py: { xs: 1, sm: 1.5 },
                            px: { xs: 1.5, sm: 2 },
                            flexDirection: { xs: 'column', sm: 'row' },
                            alignItems: { xs: 'flex-start', sm: 'center' },
                            gap: { xs: 1, sm: 0 }
                          }}
                        >
                        <ListItemText
                          primary={`${worker.firstName} ${worker.lastName}`}
                          secondary={`${worker.email} • ${worker.phone}`}
                            primaryTypographyProps={{
                              fontSize: { xs: '0.875rem', sm: '1rem' },
                              fontWeight: 500
                            }}
                            secondaryTypographyProps={{
                              fontSize: { xs: '0.75rem', sm: '0.875rem' },
                              sx: { 
                                display: { xs: 'block', md: 'block' },
                                mt: { xs: 0.5, sm: 0 }
                              }
                            }}
                          />
                          <Box sx={{ 
                            display: 'flex', 
                            justifyContent: { xs: 'flex-start', sm: 'flex-end' },
                            width: { xs: '100%', sm: 'auto' },
                            mt: { xs: 1, sm: 0 }
                          }}>
                          <Chip 
                            label={worker.isActive ? 'Active' : 'Inactive'} 
                            color={worker.isActive ? 'success' : 'default'}
                            size="small"
                              sx={{ 
                                height: { xs: '20px', sm: '24px' },
                                fontSize: { xs: '0.65rem', sm: '0.75rem' }
                              }}
                          />
                          </Box>
                      </ListItem>
                      <Divider />
                    </React.Fragment>
                  ))}
                </List>
                </Box>
              </Box>
            )}

            {/* Compliance Monitoring Tab */}
             {activeTab === 3 && (
              <Box>
                <Box 
                  display="flex" 
                  flexDirection={{ xs: 'column', sm: 'row' }} 
                  justifyContent="space-between" 
                  alignItems={{ xs: 'flex-start', sm: 'center' }} 
                  gap={{ xs: 1, sm: 0 }}
                  mb={{ xs: 2, sm: 3 }}
                >
                  <Typography variant="h5" sx={{ 
                    fontWeight: 700, 
                    color: '#1e293b',
                    fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' }
                  }}>
                    Compliance Monitoring
                  </Typography>
                </Box>

                {/* Compliance Stats Cards */}
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                  gap: { xs: 1, sm: 2, md: 3 }, 
                  mb: { xs: 2, sm: 3, md: 4 } 
                }}>
                  <Card sx={{ 
                    borderRadius: { xs: 2, sm: 3 },
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    border: 'none',
                    background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)'
                  }}>
                    <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                      <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Box>
                          <Typography variant="body2" sx={{ 
                            color: '#166534', 
                            fontWeight: 600,
                            mb: 0.5,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            fontSize: { xs: '0.7rem', sm: '0.75rem' }
                          }}>
                            Total Workers
                          </Typography>
                          <Typography variant="h3" sx={{ 
                            fontWeight: 800, 
                            color: '#166534',
                            lineHeight: 1,
                            fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2.5rem' }
                          }}>
                            {stats?.compliance.totalWorkers || 0}
                          </Typography>
                        </Box>
                        <Box sx={{ 
                          backgroundColor: '#22c55e',
                          borderRadius: { xs: 1, sm: 2 },
                          p: { xs: 1, sm: 1.5 },
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Person sx={{ fontSize: { xs: 20, sm: 24, md: 28 }, color: 'white' }} />
                        </Box>
                      </Box>
                     </CardContent>
                   </Card>

                  <Card sx={{ 
                    borderRadius: { xs: 2, sm: 3 },
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    border: 'none',
                    background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)'
                  }}>
                    <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                      <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Box>
                          <Typography variant="body2" sx={{ 
                            color: '#1e40af', 
                            fontWeight: 600,
                            mb: 0.5,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            fontSize: { xs: '0.7rem', sm: '0.75rem' }
                          }}>
                            Compliant Workers
                          </Typography>
                          <Typography variant="h3" sx={{ 
                            fontWeight: 800, 
                            color: '#1e40af',
                            lineHeight: 1,
                            fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2.5rem' }
                          }}>
                            {stats?.compliance.compliantWorkers || 0}
                          </Typography>
                        </Box>
                        <Box sx={{ 
                          backgroundColor: '#3b82f6',
                          borderRadius: { xs: 1, sm: 2 },
                          p: { xs: 1, sm: 1.5 },
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <CheckCircle sx={{ fontSize: { xs: 20, sm: 24, md: 28 }, color: 'white' }} />
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>

                  <Card sx={{ 
                    borderRadius: { xs: 2, sm: 3 },
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    border: 'none',
                    background: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)'
                  }}>
                    <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                      <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Box>
                          <Typography variant="body2" sx={{ 
                            color: '#dc2626', 
                            fontWeight: 600,
                            mb: 0.5,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            fontSize: { xs: '0.7rem', sm: '0.75rem' }
                          }}>
                            Non-Compliant
                          </Typography>
                          <Typography variant="h3" sx={{ 
                            fontWeight: 800, 
                            color: '#dc2626',
                            lineHeight: 1,
                            fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2.5rem' }
                          }}>
                            {stats?.compliance.nonCompliantWorkers || 0}
                          </Typography>
                        </Box>
                        <Box sx={{ 
                          backgroundColor: '#ef4444',
                          borderRadius: { xs: 1, sm: 2 },
                          p: { xs: 1, sm: 1.5 },
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Warning sx={{ fontSize: { xs: 20, sm: 24, md: 28 }, color: 'white' }} />
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>

                  <Card sx={{ 
                    borderRadius: { xs: 2, sm: 3 },
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    border: 'none',
                    background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)'
                  }}>
                    <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                      <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Box>
                          <Typography variant="body2" sx={{ 
                            color: '#7c2d12', 
                            fontWeight: 600,
                            mb: 0.5,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            fontSize: { xs: '0.7rem', sm: '0.75rem' }
                          }}>
                            Compliance Score
                          </Typography>
                          <Typography variant="h3" sx={{ 
                            fontWeight: 800, 
                            color: '#7c2d12',
                            lineHeight: 1,
                            fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2.5rem' }
                          }}>
                            {stats?.compliance.averageComplianceScore || 0}%
                          </Typography>
                        </Box>
                        <Box sx={{ 
                          backgroundColor: '#8b5cf6',
                          borderRadius: { xs: 1, sm: 2 },
                          p: { xs: 1, sm: 1.5 },
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <TrendingUp sx={{ fontSize: { xs: 20, sm: 24, md: 28 }, color: 'white' }} />
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Box>

                {/* Work Restrictions Table */}
                <Card sx={{ 
                  borderRadius: { xs: 2, sm: 3 },
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  border: 'none',
                  overflow: 'hidden'
                }}>
                  <Box sx={{ p: { xs: 2, sm: 3 }, borderBottom: '1px solid #e2e8f0' }}>
                    <Typography variant="h6" sx={{ 
                      fontWeight: 700, 
                      color: '#1e293b',
                      fontSize: { xs: '1rem', sm: '1.25rem' }
                    }}>
                      Current Work Restrictions
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    p: { xs: 1, sm: 2 }, 
                    overflowX: 'auto',
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
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                            display: { xs: 'none', md: 'table-cell' }
                          }}>
                            Worker
                          </TableCell>
                          <TableCell sx={{ 
                            fontWeight: 600, 
                            color: '#374151',
                            borderBottom: '1px solid #e2e8f0',
                            whiteSpace: 'nowrap',
                            padding: { xs: '8px', sm: '16px' },
                            fontSize: { xs: '0.75rem', sm: '0.875rem' }
                          }}>
                            Case #
                          </TableCell>
                          <TableCell sx={{ 
                            fontWeight: 600, 
                            color: '#374151',
                            borderBottom: '1px solid #e2e8f0',
                            whiteSpace: 'nowrap',
                            padding: { xs: '8px', sm: '16px' },
                            fontSize: { xs: '0.75rem', sm: '0.875rem' }
                          }}>
                            Restrictions
                          </TableCell>
                          <TableCell sx={{ 
                            fontWeight: 600, 
                            color: '#374151',
                            borderBottom: '1px solid #e2e8f0',
                            whiteSpace: 'nowrap',
                            padding: { xs: '8px', sm: '16px' },
                            fontSize: { xs: '0.75rem', sm: '0.875rem' }
                          }}>
                            Status
                          </TableCell>
                          <TableCell sx={{ 
                            fontWeight: 600, 
                            color: '#374151',
                            borderBottom: '1px solid #e2e8f0',
                            whiteSpace: 'nowrap',
                            padding: { xs: '8px', sm: '16px' },
                            fontSize: { xs: '0.75rem', sm: '0.875rem' }
                          }}>
                            Actions
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {cases.filter(caseItem => caseItem.status !== 'closed').map((caseItem) => (
                          <TableRow 
                            key={caseItem._id}
                            sx={{ 
                              '&:hover': { backgroundColor: '#f8fafc' },
                              '&:last-child td': { borderBottom: 0 }
                            }}
                          >
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
                                  {caseItem.worker.firstName} {caseItem.worker.lastName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{
                                  fontSize: { xs: '0.65rem', sm: '0.75rem' }
                                }}>
                                  {caseItem.worker.email}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell sx={{ 
                              fontWeight: 600,
                              color: '#8b5cf6',
                              padding: { xs: '8px', sm: '16px' },
                              fontSize: { xs: '0.75rem', sm: '0.875rem' }
                            }}>
                              {caseItem.caseNumber}
                            </TableCell>
                            <TableCell sx={{ 
                              padding: { xs: '8px', sm: '16px' },
                              fontSize: { xs: '0.75rem', sm: '0.875rem' }
                            }}>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {caseItem.workRestrictions?.lifting?.maxWeight && (
                                  <Chip 
                                    label={`Lift: ${caseItem.workRestrictions.lifting.maxWeight}kg`} 
                                    size="small" 
                                    color="warning"
                                    sx={{ 
                                      height: { xs: '20px', sm: '24px' },
                                      fontSize: { xs: '0.65rem', sm: '0.75rem' }
                                    }}
                                  />
                                )}
                                {caseItem.workRestrictions?.standing?.maxDuration && (
                                  <Chip 
                                    label={`Stand: ${caseItem.workRestrictions.standing.maxDuration}min`} 
                                    size="small" 
                                    color="info"
                                    sx={{ 
                                      height: { xs: '20px', sm: '24px' },
                                      fontSize: { xs: '0.65rem', sm: '0.75rem' }
                                    }}
                                  />
                                )}
                                {caseItem.workRestrictions?.bending && (
                                  <Chip 
                                    label="No Bending" 
                                    size="small" 
                                    color="error"
                                    sx={{ 
                                      height: { xs: '20px', sm: '24px' },
                                      fontSize: { xs: '0.65rem', sm: '0.75rem' }
                                    }}
                                  />
                                )}
                                {caseItem.workRestrictions?.climbing && (
                                  <Chip 
                                    label="No Climbing" 
                                    size="small" 
                                    color="error"
                                    sx={{ 
                                      height: { xs: '20px', sm: '24px' },
                                      fontSize: { xs: '0.65rem', sm: '0.75rem' }
                                    }}
                                  />
                                )}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ 
                              padding: { xs: '8px', sm: '16px' },
                              fontSize: { xs: '0.75rem', sm: '0.875rem' }
                            }}>
                              <Chip
                                label={caseItem.status.replace('_', ' ')}
                                color={getStatusColor(caseItem.status)}
                                size="small"
                                sx={{ 
                                  fontWeight: 500,
                                  textTransform: 'capitalize',
                                  height: { xs: '20px', sm: '24px' },
                                  fontSize: { xs: '0.65rem', sm: '0.75rem' }
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ 
                              padding: { xs: '8px', sm: '16px' },
                              fontSize: { xs: '0.75rem', sm: '0.875rem' }
                            }}>
                              <IconButton
                                size="small"
                                onClick={() => setSelectedCase(caseItem)}
                                sx={{ 
                                  color: '#8b5cf6',
                                  '&:hover': { backgroundColor: '#f3e8ff' },
                                  padding: { xs: '4px', sm: '8px' }
                                }}
                              >
                                <Visibility sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }} />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                </Card>
              </Box>
            )}

          </Box>
        </Card>

        {/* Incident Report Dialog */}
        <Dialog 
          open={incidentDialog} 
          onClose={() => setIncidentDialog(false)} 
          maxWidth="md" 
          fullWidth
          fullScreen={false}
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
            Report New Incident
          </DialogTitle>
          <DialogContent sx={{ 
            p: { xs: 1.5, sm: 2, md: 3 }, 
            maxHeight: { xs: 'calc(100vh - 200px)', sm: 'auto' },
            overflowY: { xs: 'auto', sm: 'visible' }
          }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, sm: 2 }, mt: 1 }}>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, flexWrap: 'wrap', gap: { xs: 1.5, sm: 2 } }}>
                <Box sx={{ flex: '1 1 300px', minWidth: { xs: '100%', sm: '300px' } }}>
                  <FormControl fullWidth required size="medium">
                    <InputLabel>Worker *</InputLabel>
                    <Select
                      value={incidentForm.worker}
                      onChange={(e) => setIncidentForm({ ...incidentForm, worker: e.target.value })}
                    >
                      {workers.length > 0 ? (
                        workers.map((worker) => (
                          <MenuItem key={worker._id} value={worker._id}>
                            {worker.firstName} {worker.lastName} - {worker.email}
                          </MenuItem>
                        ))
                      ) : (
                        <MenuItem disabled>No workers available</MenuItem>
                      )}
                    </Select>
                  </FormControl>
                  <Typography variant="caption" color="textSecondary">
                    Available workers: {workers.length}
                  </Typography>
                </Box>
                <Box sx={{ flex: '1 1 300px', minWidth: { xs: '100%', sm: '300px' } }}>
                  <TextField
                    fullWidth
                    label="Incident Date *"
                    type="datetime-local"
                    value={incidentForm.incidentDate}
                    onChange={(e) => setIncidentForm({ ...incidentForm, incidentDate: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    required
                    size="medium"
                  />
                </Box>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, flexWrap: 'wrap', gap: { xs: 1.5, sm: 2 } }}>
                <Box sx={{ flex: '1 1 300px', minWidth: { xs: '100%', sm: '300px' } }}>
                  <FormControl fullWidth required size="medium">
                    <InputLabel>Incident Type *</InputLabel>
                    <Select
                      value={incidentForm.incidentType}
                      onChange={(e) => setIncidentForm({ ...incidentForm, incidentType: e.target.value })}
                    >
                      <MenuItem value="slip_fall">Slip/Fall</MenuItem>
                      <MenuItem value="struck_by">Struck By</MenuItem>
                      <MenuItem value="struck_against">Struck Against</MenuItem>
                      <MenuItem value="overexertion">Overexertion</MenuItem>
                      <MenuItem value="cut_laceration">Cut/Laceration</MenuItem>
                      <MenuItem value="burn">Burn</MenuItem>
                      <MenuItem value="crush">Crush</MenuItem>
                      <MenuItem value="other">Other</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                <Box sx={{ flex: '1 1 300px', minWidth: { xs: '100%', sm: '300px' } }}>
                  <FormControl fullWidth required size="medium">
                    <InputLabel>Severity *</InputLabel>
                    <Select
                      value={incidentForm.severity}
                      onChange={(e) => setIncidentForm({ ...incidentForm, severity: e.target.value })}
                    >
                      <MenuItem value="near_miss">Near Miss</MenuItem>
                      <MenuItem value="first_aid">First Aid</MenuItem>
                      <MenuItem value="medical_treatment">Medical Treatment</MenuItem>
                      <MenuItem value="lost_time">Lost Time</MenuItem>
                      <MenuItem value="fatality">Fatality</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>
              <Box>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Description *"
                  value={incidentForm.description}
                  onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })}
                  required
                  size="medium"
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, flexWrap: 'wrap', gap: { xs: 1.5, sm: 2 } }}>
                <Box sx={{ flex: '1 1 200px', minWidth: { xs: '100%', sm: '200px' } }}>
                  <TextField
                    fullWidth
                    label="Site"
                    value={incidentForm.location.site}
                    onChange={(e) => setIncidentForm({ 
                      ...incidentForm, 
                      location: { ...incidentForm.location, site: e.target.value }
                    })}
                    size="medium"
                  />
                </Box>
                <Box sx={{ flex: '1 1 200px', minWidth: { xs: '100%', sm: '200px' } }}>
                  <TextField
                    fullWidth
                    label="Department"
                    value={incidentForm.location.department}
                    onChange={(e) => setIncidentForm({ 
                      ...incidentForm, 
                      location: { ...incidentForm.location, department: e.target.value }
                    })}
                    size="medium"
                  />
                </Box>
                <Box sx={{ flex: '1 1 200px', minWidth: { xs: '100%', sm: '200px' } }}>
                  <TextField
                    fullWidth
                    label="Specific Location"
                    value={incidentForm.location.specificLocation}
                    onChange={(e) => setIncidentForm({ 
                      ...incidentForm, 
                      location: { ...incidentForm.location, specificLocation: e.target.value }
                    })}
                    size="medium"
                  />
                </Box>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions sx={{ 
            p: { xs: 1.5, sm: 2, md: 3 }, 
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 1, sm: 0 },
            position: { xs: 'sticky', sm: 'static' },
            bottom: { xs: 0, sm: 'auto' },
            zIndex: { xs: 1, sm: 'auto' }
          }}>
            <Button 
              onClick={() => setIncidentDialog(false)}
              fullWidth={true}
              sx={{ 
                borderRadius: { xs: 3, sm: 2 },
                px: { xs: 3, sm: 3 },
                py: { xs: 1.5, sm: 1.5 },
                textTransform: 'none',
                fontSize: { xs: '1rem', sm: '1rem' },
                fontWeight: 600,
                color: '#64748b',
                borderColor: '#e2e8f0',
                order: { xs: 2, sm: 1 },
                minHeight: { xs: '52px', sm: '40px' },
                touchAction: 'manipulation',
                '&:hover': {
                  borderColor: '#cbd5e1',
                  backgroundColor: '#f1f5f9'
                }
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateIncident} 
              variant="contained"
              fullWidth={true}
              sx={{ 
                backgroundColor: '#8b5cf6',
                borderRadius: { xs: 3, sm: 2 },
                px: { xs: 3, sm: 3 },
                py: { xs: 1.5, sm: 1.5 },
                textTransform: 'none',
                fontSize: { xs: '1rem', sm: '1rem' },
                fontWeight: 600,
                order: { xs: 1, sm: 2 },
                minHeight: { xs: '52px', sm: '40px' },
                touchAction: 'manipulation',
                '&:hover': {
                  backgroundColor: '#7c3aed'
                }
              }}
            >
              Report Incident
            </Button>
          </DialogActions>
        </Dialog>

        {/* Incident Details Dialog */}
        <Dialog 
          open={!!selectedIncident} 
          onClose={() => setSelectedIncident(null)} 
          maxWidth="md" 
          fullWidth
          fullScreen={false}
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
          {selectedIncident && (
            <>
              <DialogTitle sx={{ 
                backgroundColor: '#8b5cf6',
                color: 'white',
                fontWeight: 700,
                fontSize: { xs: '1.25rem', sm: '1.5rem' },
                py: { xs: 2, sm: 3 },
                px: { xs: 2, sm: 3 }
              }}>
                Incident Details - {selectedIncident.incidentNumber}
              </DialogTitle>
              <DialogContent sx={{ 
                p: { xs: 1.5, sm: 2, md: 3 }, 
                maxHeight: { xs: 'calc(100vh - 200px)', sm: 'auto' },
                overflowY: { xs: 'auto', sm: 'visible' }
              }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, sm: 2 } }}>
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, flexWrap: 'wrap', gap: { xs: 1.5, sm: 2 } }}>
                    <Box sx={{ flex: '1 1 300px', minWidth: { xs: '100%', sm: '300px' } }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: { xs: '0.875rem', sm: '1rem' } }}>Date:</Typography>
                      <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>{new Date(selectedIncident.incidentDate).toLocaleString()}</Typography>
                    </Box>
                    <Box sx={{ flex: '1 1 300px', minWidth: { xs: '100%', sm: '300px' } }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: { xs: '0.875rem', sm: '1rem' } }}>Worker:</Typography>
                      <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                        {selectedIncident.worker.firstName} {selectedIncident.worker.lastName}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, flexWrap: 'wrap', gap: { xs: 1.5, sm: 2 } }}>
                    <Box sx={{ flex: '1 1 300px', minWidth: { xs: '100%', sm: '300px' } }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: { xs: '0.875rem', sm: '1rem' } }}>Type:</Typography>
                      <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, textTransform: 'capitalize' }}>
                        {selectedIncident.incidentType.replace('_', ' ')}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: '1 1 300px', minWidth: { xs: '100%', sm: '300px' } }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: { xs: '0.875rem', sm: '1rem' } }}>Severity:</Typography>
                      <Chip 
                        label={selectedIncident.severity.replace('_', ' ')} 
                        color={getSeverityColor(selectedIncident.severity)}
                        size="small"
                        sx={{ 
                          height: { xs: '24px', sm: '28px' },
                          fontSize: { xs: '0.7rem', sm: '0.75rem' },
                          textTransform: 'capitalize'
                        }}
                      />
                    </Box>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: { xs: '0.875rem', sm: '1rem' } }}>Description:</Typography>
                    <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>{selectedIncident.description}</Typography>
                  </Box>
                </Box>
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
                  onClick={() => setSelectedIncident(null)}
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
            </>
          )}
        </Dialog>

        {/* Case Details Dialog */}
        <Dialog 
          open={!!selectedCase} 
          onClose={() => setSelectedCase(null)} 
          maxWidth="md" 
          fullWidth
          fullScreen={false}
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
          {selectedCase && (
            <>
              <DialogTitle sx={{ 
                backgroundColor: '#8b5cf6',
                color: 'white',
                fontWeight: 700,
                fontSize: { xs: '1.25rem', sm: '1.5rem' },
                py: { xs: 2, sm: 3 },
                px: { xs: 2, sm: 3 }
              }}>
                Case Details - {selectedCase.caseNumber}
              </DialogTitle>
              <DialogContent sx={{ 
                p: { xs: 1.5, sm: 2, md: 3 }, 
                maxHeight: { xs: 'calc(100vh - 200px)', sm: 'auto' },
                overflowY: { xs: 'auto', sm: 'visible' }
              }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, sm: 2 } }}>
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, flexWrap: 'wrap', gap: { xs: 1.5, sm: 2 } }}>
                    <Box sx={{ flex: '1 1 300px', minWidth: { xs: '100%', sm: '300px' } }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: { xs: '0.875rem', sm: '1rem' } }}>Worker:</Typography>
                      <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                        {selectedCase.worker.firstName} {selectedCase.worker.lastName}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: '1 1 300px', minWidth: { xs: '100%', sm: '300px' } }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: { xs: '0.875rem', sm: '1rem' } }}>Status:</Typography>
                      <Chip 
                        label={selectedCase.status.replace('_', ' ')} 
                        color={getStatusColor(selectedCase.status)}
                        size="small"
                        sx={{ 
                          height: { xs: '24px', sm: '28px' },
                          fontSize: { xs: '0.7rem', sm: '0.75rem' },
                          textTransform: 'capitalize'
                        }}
                      />
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, flexWrap: 'wrap', gap: { xs: 1.5, sm: 2 } }}>
                    <Box sx={{ flex: '1 1 300px', minWidth: { xs: '100%', sm: '300px' } }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: { xs: '0.875rem', sm: '1rem' } }}>Priority:</Typography>
                      <Chip 
                        label={selectedCase.priority} 
                        color={getPriorityColor(selectedCase.priority)}
                        size="small"
                        sx={{ 
                          height: { xs: '24px', sm: '28px' },
                          fontSize: { xs: '0.7rem', sm: '0.75rem' }
                        }}
                      />
                    </Box>
                    <Box sx={{ flex: '1 1 300px', minWidth: { xs: '100%', sm: '300px' } }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: { xs: '0.875rem', sm: '1rem' } }}>Case Manager:</Typography>
                      <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                        {selectedCase.caseManager.firstName} {selectedCase.caseManager.lastName}
                      </Typography>
                    </Box>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: { xs: '0.875rem', sm: '1rem' } }}>Injury Details:</Typography>
                    <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                      {selectedCase.injuryDetails.bodyPart} - {selectedCase.injuryDetails.injuryType}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      {selectedCase.injuryDetails.description}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: { xs: '0.875rem', sm: '1rem' } }}>Related Incident:</Typography>
                    <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                      {selectedCase.incident.incidentNumber} - {selectedCase.incident.description}
                    </Typography>
                  </Box>
                </Box>
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
                  onClick={() => setSelectedCase(null)}
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
            </>
          )}
        </Dialog>
      </Box>
    </LayoutWithSidebar>
  );
};

export default EmployerDashboard;
