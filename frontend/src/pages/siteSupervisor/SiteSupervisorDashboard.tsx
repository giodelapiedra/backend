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
  Avatar,
  Tooltip,
  Badge,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  LinearProgress,
} from '@mui/material';
import {
  Add,
  Visibility,
  Edit,
  Warning,
  Assignment,
  Person,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Cancel,
  Refresh,
  Report,
  Assessment,
  Schedule,
  Work,
  DirectionsRun,
  LocalHospital,
  Business,
  History,
  MoreVert,
  ExpandMore,
  Security,
  MonitorHeart,
  TaskAlt,
  ErrorOutline,
  Search,
  FilterList,
} from '@mui/icons-material';
import { useAuth, User } from '../../contexts/AuthContext';
import Layout from '../../components/Layout';
import api from '../../utils/api';

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
  workRestrictions: {
    lifting: {
      maxWeight: number;
      frequency: string;
      duration: string;
    };
    standing: {
      maxDuration: number;
      breaks: number;
    };
    sitting: {
      maxDuration: number;
      breaks: number;
    };
    bending: boolean;
    twisting: boolean;
    climbing: boolean;
    driving: boolean;
    other: string;
  };
  expectedReturnDate?: string;
  createdAt: string;
}

interface DashboardStats {
  totalWorkers: number;
  activeCases: number;
  recentIncidents: number;
  complianceRate: number;
  restrictedWorkers: number;
  incidentsThisMonth: number;
}

const SiteSupervisorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data states
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [workers, setWorkers] = useState<User[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');
  
  // Search and filter states
  const [workerSearchTerm, setWorkerSearchTerm] = useState('');
  const [selectedEmployer, setSelectedEmployer] = useState('');
  const [employers, setEmployers] = useState<User[]>([]);
  
  // Dialog states
  const [incidentDialog, setIncidentDialog] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  
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
  
  // Photo upload state
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Filter workers based on search term and selected employer
  const getFilteredWorkers = () => {
    let filtered = workers;
    
    // Filter by employer if selected
    if (selectedEmployer) {
      filtered = filtered.filter(worker => 
        worker.employer && typeof worker.employer === 'object' && (worker.employer as any).id === selectedEmployer
      );
    }
    
    // Filter by search term
    if (workerSearchTerm) {
      const searchLower = workerSearchTerm.toLowerCase();
      filtered = filtered.filter(worker => 
        worker.firstName.toLowerCase().includes(searchLower) ||
        worker.lastName.toLowerCase().includes(searchLower) ||
        worker.email.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [incidentsRes, casesRes, workersRes, employersRes] = await Promise.all([
        api.get('/incidents'),
        api.get('/cases'),
        api.get('/users?role=worker'),
        api.get('/users?role=employer')
      ]);

      setIncidents(incidentsRes.data.incidents || []);
      setCases(casesRes.data.cases || []);
      setWorkers(workersRes.data.users || []);
      setEmployers(employersRes.data.users || []);
      
      // Calculate stats
      const totalWorkers = workersRes.data.users?.length || 0;
      const activeCases = casesRes.data.cases?.length || 0;
      const recentIncidents = incidentsRes.data.incidents?.length || 0;
      const restrictedWorkers = casesRes.data.cases?.filter((c: Case) => 
        ['in_rehab', 'assessed'].includes(c.status)
      ).length || 0;
      
      setStats({
        totalWorkers,
        activeCases,
        recentIncidents,
        complianceRate: 85, // Mock data - would be calculated from actual compliance data
        restrictedWorkers,
        incidentsThisMonth: recentIncidents
      });
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // Photo handling functions
  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length > 0) {
      setSelectedPhotos(prev => [...prev, ...imageFiles]);
      
      // Create preview URLs
      const newPreviewUrls = imageFiles.map(file => URL.createObjectURL(file));
      setPhotoPreviewUrls(prev => [...prev, ...newPreviewUrls]);
    }
  };

  const removePhoto = (index: number) => {
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviewUrls(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
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
      
      // Always use FormData to handle both cases (with and without photos)
      const formData = new FormData();
      
      // Append all form fields
      Object.keys(formattedData).forEach(key => {
        if (key === 'location') {
          formData.append('location.site', formattedData.location.site || '');
          formData.append('location.department', formattedData.location.department || '');
          formData.append('location.specificLocation', formattedData.location.specificLocation || '');
        } else if (Array.isArray((formattedData as any)[key])) {
          ((formattedData as any)[key] as string[]).forEach((item: string, index: number) => {
            formData.append(`${key}[${index}]`, item);
          });
        } else {
          formData.append(key, (formattedData as any)[key]);
        }
      });
      
      // Append photos if any
      selectedPhotos.forEach((photo, index) => {
        formData.append(`photos`, photo);
      });
      
      console.log('Submitting incident with data:', {
        worker: formattedData.worker,
        incidentDate: formattedData.incidentDate,
        incidentType: formattedData.incidentType,
        severity: formattedData.severity,
        description: formattedData.description,
        photosCount: selectedPhotos.length
      });

      const response = await api.post('/incidents', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('Incident created successfully:', response.data);
      
      // Show success message
      setError(null);
      setIncidentDialog(false);
      setWorkerSearchTerm('');
      setSelectedEmployer('');
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
      
      // Clear photos
      photoPreviewUrls.forEach(url => URL.revokeObjectURL(url));
      setSelectedPhotos([]);
      setPhotoPreviewUrls([]);
      fetchData();
      
      // Display success message with case information
      const caseNumber = response.data.incident?.caseNumber || 'a new case';
      const severityText = incidentForm.severity.replace('_', ' ');
      const successMessage = `Incident reported successfully! The system has automatically created ${caseNumber} and assigned it to an available Case Manager and Clinician. Work restrictions have been set based on the ${severityText} severity level.`;
      
      // Use a more user-friendly notification than alert
      setError(null);
      setSuccessMessage(successMessage);
      setTimeout(() => setSuccessMessage(''), 8000); // Clear after 8 seconds
    } catch (err: any) {
      console.error('Error creating incident:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      setError(err.response?.data?.message || err.message || 'Failed to create incident');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'fatality': return 'error';
      case 'lost_time': return 'error';
      case 'medical_treatment': return 'warning';
      case 'first_aid': return 'info';
      case 'near_miss': return 'success';
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

  if (!user) {
    return (
      <Layout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <Typography variant="h6" color="text.secondary">
            Please log in to access the dashboard
          </Typography>
        </Box>
      </Layout>
    );
  }

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
        <Typography variant="h4" component="h1" gutterBottom>
          Site Supervisor Dashboard
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
          Welcome back, {user?.firstName}! Monitor worker restrictions, compliance, and safety incidents.
        </Typography>

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

        {/* Quick Stats */}
        <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
          <Card sx={{ minWidth: 200, flex: 1 }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Workers
                  </Typography>
                  <Typography variant="h4">
                    {stats?.totalWorkers || 0}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <Person />
                </Avatar>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ minWidth: 200, flex: 1 }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Active Cases
                  </Typography>
                  <Typography variant="h4">
                    {stats?.activeCases || 0}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.main' }}>
                  <Assignment />
                </Avatar>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ minWidth: 200, flex: 1 }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Compliance Rate
                  </Typography>
                  <Typography variant="h4">
                    {stats?.complianceRate || 0}%
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <CheckCircle />
                </Avatar>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ minWidth: 200, flex: 1 }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Recent Incidents
                  </Typography>
                  <Typography variant="h4">
                    {stats?.recentIncidents || 0}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'error.main' }}>
                  <Warning />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {/* Worker Restrictions & Compliance */}
          <Box sx={{ flex: 2, minWidth: 400 }}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Box>
                    <Typography variant="h6">
                      Worker Restrictions & Compliance
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Monitor restrictions from cases and track compliance
                    </Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={fetchData}
                    size="small"
                  >
                    Refresh
                  </Button>
                </Box>
                
                {cases.length > 0 ? (
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Worker</TableCell>
                          <TableCell>Injury</TableCell>
                          <TableCell>Restrictions</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Compliance</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {cases.slice(0, 5).map((caseItem) => (
                          <TableRow key={caseItem._id}>
                            <TableCell>
                              <Box display="flex" alignItems="center" gap={1}>
                                <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
                                  {caseItem.worker?.firstName?.charAt(0) || '?'}{caseItem.worker?.lastName?.charAt(0) || '?'}
                                </Avatar>
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {caseItem.worker?.firstName || 'Unknown'} {caseItem.worker?.lastName || 'Worker'}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {caseItem.worker?.email || 'No email'}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {caseItem.injuryDetails?.bodyPart || 'N/A'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {caseItem.injuryDetails?.injuryType || 'N/A'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box>
                                <Typography variant="caption" color="text.secondary">
                                  Lifting: {caseItem.workRestrictions?.lifting?.maxWeight || 'N/A'}kg
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Standing: {caseItem.workRestrictions?.standing?.maxDuration || 'N/A'}min
                                </Typography>
                                {caseItem.workRestrictions?.bending === false && (
                                  <Chip label="No Bending" size="small" color="warning" />
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={caseItem.status.replace('_', ' ')}
                                color={getStatusColor(caseItem.status)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                                <Box>
                                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                                    <Typography variant="caption" color="text.secondary">Compliance Rate</Typography>
                                    <Typography variant="caption">85%</Typography>
                                  </Box>
                                  <LinearProgress
                                    variant="determinate"
                                    value={85}
                                    sx={{ height: 8, borderRadius: 4 }}
                                  />
                                </Box>
                            </TableCell>
                            <TableCell>
                              <Box display="flex" gap={0.5}>
                                <Tooltip title="View Details">
                                  <IconButton size="small">
                                    <Visibility />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Submit Feedback">
                                  <IconButton size="small">
                                    <Edit />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Box textAlign="center" py={3}>
                    <Typography color="text.secondary">
                      No active cases with restrictions
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>

          {/* Quick Actions */}
          <Box sx={{ flex: 1, minWidth: 300 }}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6" gutterBottom>
                    Quick Actions
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Site Supervisor → Monitor Restrictions → Track Compliance
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<Add />}
                    onClick={() => {
                      setIncidentDialog(true);
                      setError(null);
                      setWorkerSearchTerm('');
                      setSelectedEmployer('');
                    }}
                    sx={{ mb: 1 }}
                  >
                    Report Incident
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Report />}
                    onClick={() => window.location.href = '/incidents'}
                  >
                    View All Incidents
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Assignment />}
                    onClick={() => window.location.href = '/cases'}
                  >
                    View All Cases
                  </Button>
                </Box>
              </CardContent>
            </Card>

            {/* Recent Incidents */}
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="h6">
                    Recent Incidents
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Report incidents of any severity
                  </Typography>
                </Box>
                <List dense>
                  {incidents.slice(0, 3).map((incident) => (
                    <ListItem key={incident._id} divider>
                      <ListItemIcon>
                        <Warning color={getSeverityColor(incident.severity) as any} />
                      </ListItemIcon>
                      <ListItemText
                        primary={incident.incidentNumber || 'No Number'}
                        secondary={
                          <Box>
                            <Typography variant="caption" display="block">
                              {incident.worker?.firstName || 'Unknown'} {incident.worker?.lastName || 'Worker'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {incident.incidentDate ? new Date(incident.incidentDate).toLocaleDateString() : 'No date'}
                            </Typography>
                          </Box>
                        }
                      />
                      <Chip
                        label={incident.severity.replace('_', ' ')}
                        color={getSeverityColor(incident.severity)}
                        size="small"
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Incident Report Dialog */}
        <Dialog 
          open={incidentDialog} 
          onClose={() => {
            setIncidentDialog(false);
            setWorkerSearchTerm('');
            setSelectedEmployer('');
          }} 
          maxWidth="md" 
          fullWidth
        >
          <DialogTitle>
            Report New Incident
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              {/* Search and Filter Controls */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
                  <TextField
                    fullWidth
                    label="Search Workers"
                    value={workerSearchTerm}
                    onChange={(e) => setWorkerSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                    placeholder="Search by name or email..."
                  />
                </Box>
                <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
                  <FormControl fullWidth>
                    <InputLabel>Filter by Employer</InputLabel>
                    <Select
                      value={selectedEmployer}
                      onChange={(e) => setSelectedEmployer(e.target.value)}
                    >
                      <MenuItem value="">
                        <em>All Employers</em>
                      </MenuItem>
                      {employers.map((employer) => (
                        <MenuItem key={employer.id} value={employer.id}>
                          {employer.firstName} {employer.lastName}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Box>
              
              {/* Worker Selection */}
              <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                <FormControl fullWidth required>
                  <InputLabel>Worker *</InputLabel>
                  <Select
                    value={incidentForm.worker}
                    onChange={(e) => setIncidentForm({ ...incidentForm, worker: e.target.value })}
                  >
                    {getFilteredWorkers().length > 0 ? (
                      getFilteredWorkers().map((worker) => (
                        <MenuItem key={worker.id} value={worker.id}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {worker.firstName} {worker.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {worker.email} • {typeof worker.employer === 'object' && worker.employer ? `${(worker.employer as any).firstName} ${(worker.employer as any).lastName}` : 'No Employer'}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem disabled>
                        {workerSearchTerm || selectedEmployer ? 'No workers match your search' : 'No workers available'}
                      </MenuItem>
                    )}
                  </Select>
                </FormControl>
                {getFilteredWorkers().length > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Showing {getFilteredWorkers().length} of {workers.length} workers
                  </Typography>
                )}
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                  <TextField
                    fullWidth
                    label="Incident Date *"
                    type="datetime-local"
                    value={incidentForm.incidentDate}
                    onChange={(e) => setIncidentForm({ ...incidentForm, incidentDate: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    required
                  />
                </Box>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                  <FormControl fullWidth required>
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
                <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                  <FormControl fullWidth required>
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
                />
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
                  <TextField
                    fullWidth
                    label="Site"
                    value={incidentForm.location.site}
                    onChange={(e) => setIncidentForm({ 
                      ...incidentForm, 
                      location: { ...incidentForm.location, site: e.target.value }
                    })}
                  />
                </Box>
                <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
                  <TextField
                    fullWidth
                    label="Department"
                    value={incidentForm.location.department}
                    onChange={(e) => setIncidentForm({ 
                      ...incidentForm, 
                      location: { ...incidentForm.location, department: e.target.value }
                    })}
                  />
                </Box>
                <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
                  <TextField
                    fullWidth
                    label="Specific Location"
                    value={incidentForm.location.specificLocation}
                    onChange={(e) => setIncidentForm({ 
                      ...incidentForm, 
                      location: { ...incidentForm.location, specificLocation: e.target.value }
                    })}
                  />
                </Box>
              </Box>
              
              {/* Photo Upload Section */}
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Incident Photos (Optional)
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="photo-upload"
                    multiple
                    type="file"
                    onChange={handlePhotoSelect}
                  />
                  <label htmlFor="photo-upload">
                    <Button variant="outlined" component="span" startIcon={<Add />}>
                      Add Photos
                    </Button>
                  </label>
                  
                  {/* Photo Previews */}
                  {photoPreviewUrls.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
                      {photoPreviewUrls.map((url, index) => (
                        <Box key={index} sx={{ position: 'relative' }}>
                          <img
                            src={url}
                            alt={`Preview ${index + 1}`}
                            style={{
                              width: 100,
                              height: 100,
                              objectFit: 'cover',
                              borderRadius: 8,
                              border: '1px solid #ddd'
                            }}
                          />
                          <IconButton
                            size="small"
                            sx={{
                              position: 'absolute',
                              top: -8,
                              right: -8,
                              backgroundColor: 'error.main',
                              color: 'white',
                              '&:hover': {
                                backgroundColor: 'error.dark',
                              },
                            }}
                            onClick={() => removePhoto(index)}
                          >
                            <Cancel />
                          </IconButton>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setIncidentDialog(false);
              setWorkerSearchTerm('');
              setSelectedEmployer('');
            }}>Cancel</Button>
            <Button 
              variant="contained" 
              onClick={handleCreateIncident}
              disabled={!incidentForm.worker || !incidentForm.incidentDate || !incidentForm.incidentType || !incidentForm.severity || !incidentForm.description.trim()}
            >
              Report Incident
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
};

export default SiteSupervisorDashboard;