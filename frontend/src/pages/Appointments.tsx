import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
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
  Grid,
  Avatar,
  Tooltip,
  Badge,
  Tabs,
  Tab,
  Fab,
} from '@mui/material';
import {
  Add,
  Edit,
  Visibility,
  CalendarToday,
  Schedule,
  Person,
  LocationOn,
  AccessTime,
  CheckCircle,
  Cancel,
  Warning,
  PlayArrow,
  Pause,
  Stop,
  Assessment,
  LocalHospital,
  VideoCall,
  Home,
  Work,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import api from '../utils/api';

interface Appointment {
  _id: string;
  case: {
    _id: string;
    caseNumber: string;
    worker: {
      _id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  clinician: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  worker: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  appointmentType: string;
  scheduledDate: string;
  duration: number;
  location: string;
  status: string;
  purpose: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`appointment-tabpanel-${index}`}
      aria-labelledby={`appointment-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ 
          p: 3,
          backgroundColor: 'white',
          minHeight: 400
        }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const Appointments: React.FC = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    case: '',
    worker: '',
    appointmentType: 'assessment',
    scheduledDate: '',
    duration: 60,
    location: 'clinic',
    purpose: '',
    notes: ''
  });

  // Check if user is a worker
  const isWorker = user?.role === 'worker';
  
  // Debug logging
  console.log('Appointments component render:', { 
    user: user?.email, 
    role: user?.role, 
    isWorker, 
    tabValue,
    appointmentsCount: appointments.length,
    scheduledCount: appointments.filter(apt => apt.status === 'scheduled').length,
    confirmedCount: appointments.filter(apt => apt.status === 'confirmed').length,
    completedCount: appointments.filter(apt => apt.status === 'completed').length
  });

  useEffect(() => {
    if (user) {
      fetchAppointments();
      // Only fetch cases and workers if user is not a worker
      if (!isWorker) {
        fetchCases();
        fetchWorkers();
      }
    }
  }, [user, isWorker]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/appointments');
      setAppointments(response.data.appointments || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch appointments');
    } finally {
      setLoading(false);
    }
  };

  const fetchCases = async () => {
    try {
      const response = await api.get('/cases');
      setCases(response.data.cases || []);
    } catch (err: any) {
      console.error('Failed to fetch cases:', err);
    }
  };

  const fetchWorkers = async () => {
    try {
      const response = await api.get('/users?role=worker');
      setWorkers(response.data.users || []);
    } catch (err: any) {
      console.error('Failed to fetch workers:', err);
    }
  };

  const handleCreateAppointment = async () => {
    try {
      setIsCreating(true);
      
      const appointmentData = {
        case: formData.case,
        worker: formData.worker,
        appointmentType: formData.appointmentType,
        scheduledDate: formData.scheduledDate,
        duration: formData.duration,
        location: formData.location,
        purpose: formData.purpose,
        notes: formData.notes
      };

      await api.post('/appointments', appointmentData);
      
      setDialogOpen(false);
      resetForm();
      fetchAppointments();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create appointment');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateAppointment = async () => {
    if (!selectedAppointment) return;
    
    try {
      setIsUpdating(true);
      
      const updateData = {
        appointmentType: formData.appointmentType,
        scheduledDate: formData.scheduledDate,
        duration: formData.duration,
        location: formData.location,
        purpose: formData.purpose,
        notes: formData.notes
      };

      await api.put(`/appointments/${selectedAppointment._id}`, updateData);
      
      setDialogOpen(false);
      setSelectedAppointment(null);
      resetForm();
      fetchAppointments();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update appointment');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusUpdate = async (appointmentId: string, newStatus: string) => {
    try {
      await api.put(`/appointments/${appointmentId}/status`, { status: newStatus });
      fetchAppointments();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update appointment status');
    }
  };

  const handleConfirmAppointment = async (appointmentId: string) => {
    try {
      await api.put(`/appointments/${appointmentId}/status`, { status: 'confirmed' });
      fetchAppointments();
      setError(''); // Clear any previous errors
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to confirm appointment');
    }
  };

  const handleDeclineAppointment = async (appointmentId: string) => {
    try {
      await api.put(`/appointments/${appointmentId}/status`, { 
        status: 'cancelled',
        cancellationReason: 'Declined by worker'
      });
      fetchAppointments();
      setError(''); // Clear any previous errors
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to decline appointment');
    }
  };

  const resetForm = () => {
    setFormData({
      case: '',
      worker: '',
      appointmentType: 'assessment',
      scheduledDate: '',
      duration: 60,
      location: 'clinic',
      purpose: '',
      notes: ''
    });
  };

  const openCreateDialog = () => {
    setSelectedAppointment(null);
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setFormData({
      case: appointment.case._id,
      worker: appointment.worker._id,
      appointmentType: appointment.appointmentType,
      scheduledDate: new Date(appointment.scheduledDate).toISOString().slice(0, 16),
      duration: appointment.duration,
      location: appointment.location,
      purpose: appointment.purpose,
      notes: appointment.notes || ''
    });
    setDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: any } = {
      'scheduled': 'info',
      'confirmed': 'primary',
      'in_progress': 'warning',
      'completed': 'success',
      'cancelled': 'error',
      'no_show': 'error',
    };
    return colors[status] || 'default';
  };

  const getStatusIcon = (status: string): React.ReactElement => {
    switch (status) {
      case 'scheduled': return <Schedule />;
      case 'confirmed': return <CheckCircle />;
      case 'in_progress': return <PlayArrow />;
      case 'completed': return <CheckCircle />;
      case 'cancelled': return <Cancel />;
      case 'no_show': return <Warning />;
      default: return <Schedule />;
    }
  };

  const getLocationIcon = (location: string) => {
    switch (location) {
      case 'clinic': return <LocalHospital />;
      case 'telehealth': return <VideoCall />;
      case 'workplace': return <Work />;
      case 'home': return <Home />;
      default: return <LocationOn />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getUpcomingAppointments = () => {
    const now = new Date();
    return appointments.filter(apt => 
      new Date(apt.scheduledDate) > now && 
      ['scheduled', 'confirmed'].includes(apt.status)
    ).sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
  };

  const getPastAppointments = () => {
    const now = new Date();
    return appointments.filter(apt => 
      new Date(apt.scheduledDate) <= now || 
      ['completed', 'cancelled', 'no_show'].includes(apt.status)
    ).sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());
  };

  const getTodayAppointments = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return appointments.filter(apt => {
      const aptDate = new Date(apt.scheduledDate);
      return aptDate >= today && aptDate < tomorrow;
    }).sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
  };

  // Don't render until user is loaded
  if (!user) {
    return (
      <Layout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
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
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom sx={{ 
              fontWeight: 600,
              color: '#1a1a1a',
              mb: 0.5
            }}>
              {isWorker ? 'My Appointments' : 'Appointments'}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 400 }}>
              {isWorker 
                ? 'View and confirm your scheduled appointments' 
                : 'Manage your appointments and schedule new ones'
              }
            </Typography>
          </Box>
          {!isWorker && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={openCreateDialog}
              sx={{ 
                borderRadius: 1,
                px: 3,
                py: 1,
                backgroundColor: '#0073e6',
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '14px',
                '&:hover': {
                  backgroundColor: '#005bb5',
                },
                transition: 'all 0.2s ease'
              }}
            >
              New Appointment
            </Button>
          )}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {/* Professional Stats Cards */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Card sx={{ 
            minWidth: 200, 
            flex: 1, 
            borderRadius: 1,
            border: '1px solid #e1e5e9',
            boxShadow: 'none',
            '&:hover': {
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            },
            transition: 'box-shadow 0.2s ease'
          }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: '13px', fontWeight: 500 }}>
                    {isWorker ? "PENDING" : "TODAY'S APPOINTMENTS"}
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
                    {isWorker 
                      ? appointments.filter(apt => apt.status === 'scheduled').length
                      : getTodayAppointments().length
                    }
                  </Typography>
                </Box>
                <Box sx={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 1,
                  backgroundColor: '#f0f7ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Schedule sx={{ fontSize: 20, color: '#0073e6' }} />
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ 
            minWidth: 200, 
            flex: 1, 
            borderRadius: 1,
            border: '1px solid #e1e5e9',
            boxShadow: 'none',
            '&:hover': {
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            },
            transition: 'box-shadow 0.2s ease'
          }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: '13px', fontWeight: 500 }}>
                    {isWorker ? "CONFIRMED" : "UPCOMING"}
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
                    {isWorker 
                      ? appointments.filter(apt => apt.status === 'confirmed').length
                      : getUpcomingAppointments().length
                    }
                  </Typography>
                </Box>
                <Box sx={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 1,
                  backgroundColor: '#f0f9ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <CheckCircle sx={{ fontSize: 20, color: '#059669' }} />
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ 
            minWidth: 200, 
            flex: 1, 
            borderRadius: 1,
            border: '1px solid #e1e5e9',
            boxShadow: 'none',
            '&:hover': {
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            },
            transition: 'box-shadow 0.2s ease'
          }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: '13px', fontWeight: 500 }}>
                    COMPLETED
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
                    {appointments.filter(apt => apt.status === 'completed').length}
                  </Typography>
                </Box>
                <Box sx={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 1,
                  backgroundColor: '#f0fdf4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <CheckCircle sx={{ fontSize: 20, color: '#16a34a' }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Professional Tabs */}
        <Card sx={{ 
          borderRadius: 1, 
          border: '1px solid #e1e5e9',
          boxShadow: 'none',
          overflow: 'hidden'
        }}>
          <Box sx={{ 
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid #e1e5e9'
          }}>
            <Box sx={{ display: 'flex' }}>
              {isWorker ? (
                <>
                  <Box
                    sx={{
                      flex: 1,
                      py: 2,
                      px: 3,
                      cursor: 'pointer',
                      backgroundColor: tabValue === 0 ? 'white' : 'transparent',
                      borderBottom: tabValue === 0 ? '2px solid #0073e6' : '2px solid transparent',
                      color: tabValue === 0 ? '#0073e6' : '#6b7280',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                      fontWeight: 500,
                      fontSize: '14px',
                      '&:hover': {
                        backgroundColor: tabValue === 0 ? 'white' : '#f1f5f9',
                        color: tabValue === 0 ? '#0073e6' : '#374151',
                      }
                    }}
                    onClick={() => {
                      console.log('Custom tab clicked: Pending');
                      setTabValue(0);
                    }}
                  >
                    <Schedule sx={{ fontSize: 16 }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Pending ({appointments.filter(apt => apt.status === 'scheduled').length})
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      flex: 1,
                      py: 2,
                      px: 3,
                      cursor: 'pointer',
                      backgroundColor: tabValue === 1 ? 'white' : 'transparent',
                      borderBottom: tabValue === 1 ? '2px solid #0073e6' : '2px solid transparent',
                      color: tabValue === 1 ? '#0073e6' : '#6b7280',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                      fontWeight: 500,
                      fontSize: '14px',
                      '&:hover': {
                        backgroundColor: tabValue === 1 ? 'white' : '#f1f5f9',
                        color: tabValue === 1 ? '#0073e6' : '#374151',
                      }
                    }}
                    onClick={() => {
                      console.log('Custom tab clicked: Confirmed');
                      setTabValue(1);
                    }}
                  >
                    <CheckCircle sx={{ fontSize: 16 }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Confirmed ({appointments.filter(apt => apt.status === 'confirmed').length})
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      flex: 1,
                      py: 2,
                      px: 3,
                      cursor: 'pointer',
                      backgroundColor: tabValue === 2 ? 'white' : 'transparent',
                      borderBottom: tabValue === 2 ? '2px solid #0073e6' : '2px solid transparent',
                      color: tabValue === 2 ? '#0073e6' : '#6b7280',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                      fontWeight: 500,
                      fontSize: '14px',
                      '&:hover': {
                        backgroundColor: tabValue === 2 ? 'white' : '#f1f5f9',
                        color: tabValue === 2 ? '#0073e6' : '#374151',
                      }
                    }}
                    onClick={() => {
                      console.log('Custom tab clicked: Completed');
                      setTabValue(2);
                    }}
                  >
                    <CheckCircle sx={{ fontSize: 16 }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Completed ({appointments.filter(apt => apt.status === 'completed').length})
                    </Typography>
                  </Box>
                </>
              ) : (
                <>
                  <Box
                    sx={{
                      flex: 1,
                      py: 2,
                      px: 3,
                      cursor: 'pointer',
                      backgroundColor: tabValue === 0 ? 'white' : 'transparent',
                      borderBottom: tabValue === 0 ? '2px solid #0073e6' : '2px solid transparent',
                      color: tabValue === 0 ? '#0073e6' : '#6b7280',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                      fontWeight: 500,
                      fontSize: '14px',
                      '&:hover': {
                        backgroundColor: tabValue === 0 ? 'white' : '#f1f5f9',
                        color: tabValue === 0 ? '#0073e6' : '#374151',
                      }
                    }}
                    onClick={() => setTabValue(0)}
                  >
                    <CalendarToday sx={{ fontSize: 16 }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Today ({getTodayAppointments().length})
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      flex: 1,
                      py: 2,
                      px: 3,
                      cursor: 'pointer',
                      backgroundColor: tabValue === 1 ? 'white' : 'transparent',
                      borderBottom: tabValue === 1 ? '2px solid #0073e6' : '2px solid transparent',
                      color: tabValue === 1 ? '#0073e6' : '#6b7280',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                      fontWeight: 500,
                      fontSize: '14px',
                      '&:hover': {
                        backgroundColor: tabValue === 1 ? 'white' : '#f1f5f9',
                        color: tabValue === 1 ? '#0073e6' : '#374151',
                      }
                    }}
                    onClick={() => setTabValue(1)}
                  >
                    <Schedule sx={{ fontSize: 16 }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Upcoming ({getUpcomingAppointments().length})
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      flex: 1,
                      py: 2,
                      px: 3,
                      cursor: 'pointer',
                      backgroundColor: tabValue === 2 ? 'white' : 'transparent',
                      borderBottom: tabValue === 2 ? '2px solid #0073e6' : '2px solid transparent',
                      color: tabValue === 2 ? '#0073e6' : '#6b7280',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                      fontWeight: 500,
                      fontSize: '14px',
                      '&:hover': {
                        backgroundColor: tabValue === 2 ? 'white' : '#f1f5f9',
                        color: tabValue === 2 ? '#0073e6' : '#374151',
                      }
                    }}
                    onClick={() => setTabValue(2)}
                  >
                    <AccessTime sx={{ fontSize: 16 }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Past ({getPastAppointments().length})
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      flex: 1,
                      py: 2,
                      px: 3,
                      cursor: 'pointer',
                      backgroundColor: tabValue === 3 ? 'white' : 'transparent',
                      borderBottom: tabValue === 3 ? '2px solid #0073e6' : '2px solid transparent',
                      color: tabValue === 3 ? '#0073e6' : '#6b7280',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                      fontWeight: 500,
                      fontSize: '14px',
                      '&:hover': {
                        backgroundColor: tabValue === 3 ? 'white' : '#f1f5f9',
                        color: tabValue === 3 ? '#0073e6' : '#374151',
                      }
                    }}
                    onClick={() => setTabValue(3)}
                  >
                    <Assessment sx={{ fontSize: 16 }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      All ({appointments.length})
                    </Typography>
                  </Box>
                </>
              )}
            </Box>
          </Box>

          {isWorker ? (
            <>
              <TabPanel value={tabValue} index={0}>
                <AppointmentTable 
                  appointments={appointments.filter(apt => apt.status === 'scheduled')} 
                  onEdit={openEditDialog}
                  onStatusUpdate={handleStatusUpdate}
                  onConfirm={handleConfirmAppointment}
                  onDecline={handleDeclineAppointment}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                  getLocationIcon={getLocationIcon}
                  formatDate={formatDate}
                  formatTime={formatTime}
                  isWorker={true}
                />
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <AppointmentTable 
                  appointments={appointments.filter(apt => apt.status === 'confirmed')} 
                  onEdit={openEditDialog}
                  onStatusUpdate={handleStatusUpdate}
                  onConfirm={handleConfirmAppointment}
                  onDecline={handleDeclineAppointment}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                  getLocationIcon={getLocationIcon}
                  formatDate={formatDate}
                  formatTime={formatTime}
                  isWorker={true}
                />
              </TabPanel>

              <TabPanel value={tabValue} index={2}>
                <AppointmentTable 
                  appointments={appointments.filter(apt => apt.status === 'completed')} 
                  onEdit={openEditDialog}
                  onStatusUpdate={handleStatusUpdate}
                  onConfirm={handleConfirmAppointment}
                  onDecline={handleDeclineAppointment}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                  getLocationIcon={getLocationIcon}
                  formatDate={formatDate}
                  formatTime={formatTime}
                  isWorker={true}
                />
              </TabPanel>
            </>
          ) : (
            <>
              <TabPanel value={tabValue} index={0}>
                <AppointmentTable 
                  appointments={getTodayAppointments()} 
                  onEdit={openEditDialog}
                  onStatusUpdate={handleStatusUpdate}
                  onConfirm={handleConfirmAppointment}
                  onDecline={handleDeclineAppointment}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                  getLocationIcon={getLocationIcon}
                  formatDate={formatDate}
                  formatTime={formatTime}
                  isWorker={false}
                />
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <AppointmentTable 
                  appointments={getUpcomingAppointments()} 
                  onEdit={openEditDialog}
                  onStatusUpdate={handleStatusUpdate}
                  onConfirm={handleConfirmAppointment}
                  onDecline={handleDeclineAppointment}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                  getLocationIcon={getLocationIcon}
                  formatDate={formatDate}
                  formatTime={formatTime}
                  isWorker={false}
                />
              </TabPanel>

              <TabPanel value={tabValue} index={2}>
                <AppointmentTable 
                  appointments={getPastAppointments()} 
                  onEdit={openEditDialog}
                  onStatusUpdate={handleStatusUpdate}
                  onConfirm={handleConfirmAppointment}
                  onDecline={handleDeclineAppointment}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                  getLocationIcon={getLocationIcon}
                  formatDate={formatDate}
                  formatTime={formatTime}
                  isWorker={false}
                />
              </TabPanel>

              <TabPanel value={tabValue} index={3}>
                <AppointmentTable 
                  appointments={appointments} 
                  onEdit={openEditDialog}
                  onStatusUpdate={handleStatusUpdate}
                  onConfirm={handleConfirmAppointment}
                  onDecline={handleDeclineAppointment}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                  getLocationIcon={getLocationIcon}
                  formatDate={formatDate}
                  formatTime={formatTime}
                  isWorker={false}
                />
              </TabPanel>
            </>
          )}
        </Card>

        {/* Create/Edit Dialog - Only for non-workers */}
        {!isWorker && (
          <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            {selectedAppointment ? 'Edit Appointment' : 'Create New Appointment'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                  <FormControl fullWidth>
                    <InputLabel>Case</InputLabel>
                    <Select
                      value={formData.case}
                      onChange={(e) => setFormData({ ...formData, case: e.target.value })}
                      disabled={!!selectedAppointment}
                    >
                      {cases.map((caseItem) => (
                        <MenuItem key={caseItem._id} value={caseItem._id}>
                          {caseItem.caseNumber} - {caseItem.worker?.firstName} {caseItem.worker?.lastName}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                  <FormControl fullWidth>
                    <InputLabel>Worker</InputLabel>
                    <Select
                      value={formData.worker}
                      onChange={(e) => setFormData({ ...formData, worker: e.target.value })}
                      disabled={!!selectedAppointment}
                    >
                      {workers.map((worker) => (
                        <MenuItem key={worker._id} value={worker._id}>
                          {worker.firstName} {worker.lastName}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                  <FormControl fullWidth>
                    <InputLabel>Appointment Type</InputLabel>
                    <Select
                      value={formData.appointmentType}
                      onChange={(e) => setFormData({ ...formData, appointmentType: e.target.value })}
                    >
                      <MenuItem value="assessment">Assessment</MenuItem>
                      <MenuItem value="treatment">Treatment</MenuItem>
                      <MenuItem value="follow_up">Follow-up</MenuItem>
                      <MenuItem value="consultation">Consultation</MenuItem>
                      <MenuItem value="telehealth">Telehealth</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                  <TextField
                    fullWidth
                    label="Scheduled Date & Time"
                    type="datetime-local"
                    value={formData.scheduledDate}
                    onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>

                <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                  <TextField
                    fullWidth
                    label="Duration (minutes)"
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 60 })}
                    inputProps={{ min: 15, max: 480 }}
                  />
                </Box>

                <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                  <FormControl fullWidth>
                    <InputLabel>Location</InputLabel>
                    <Select
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    >
                      <MenuItem value="clinic">Clinic</MenuItem>
                      <MenuItem value="telehealth">Telehealth</MenuItem>
                      <MenuItem value="workplace">Workplace</MenuItem>
                      <MenuItem value="home">Home</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                <Box sx={{ flex: '1 1 100%', minWidth: '100%' }}>
                  <TextField
                    fullWidth
                    label="Purpose"
                    multiline
                    rows={2}
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  />
                </Box>

                <Box sx={{ flex: '1 1 100%', minWidth: '100%' }}>
                  <TextField
                    fullWidth
                    label="Notes"
                    multiline
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </Box>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="contained" 
              onClick={selectedAppointment ? handleUpdateAppointment : handleCreateAppointment}
              disabled={isCreating || isUpdating || !formData.case || !formData.worker || !formData.scheduledDate}
            >
              {isCreating ? 'Creating...' : isUpdating ? 'Updating...' : selectedAppointment ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
        )}
      </Box>
    </Layout>
  );
};

// Appointment Table Component
interface AppointmentTableProps {
  appointments: Appointment[];
  onEdit: (appointment: Appointment) => void;
  onStatusUpdate: (id: string, status: string) => void;
  onConfirm: (id: string) => void;
  onDecline: (id: string) => void;
  getStatusColor: (status: string) => any;
  getStatusIcon: (status: string) => React.ReactElement;
  getLocationIcon: (location: string) => React.ReactNode;
  formatDate: (date: string) => string;
  formatTime: (date: string) => string;
  isWorker: boolean;
}

const AppointmentTable: React.FC<AppointmentTableProps> = ({
  appointments,
  onEdit,
  onStatusUpdate,
  onConfirm,
  onDecline,
  getStatusColor,
  getStatusIcon,
  getLocationIcon,
  formatDate,
  formatTime,
  isWorker
}) => {
  if (appointments.length === 0) {
    return (
      <Box textAlign="center" py={4}>
        <Typography color="text.secondary">
          No appointments found
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Date & Time</TableCell>
            {isWorker ? (
              <>
                <TableCell>Clinician</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </>
            ) : (
              <>
                <TableCell>Patient</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {appointments.map((appointment) => (
            <TableRow key={appointment._id}>
              <TableCell>
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {formatDate(appointment.scheduledDate)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatTime(appointment.scheduledDate)}
                  </Typography>
                </Box>
              </TableCell>
              {isWorker ? (
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
                      {appointment.clinician.firstName.charAt(0)}{appointment.clinician.lastName.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="body2">
                        {appointment.clinician.firstName} {appointment.clinician.lastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Case: {appointment.case.caseNumber}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
              ) : (
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
                      {appointment.worker.firstName.charAt(0)}{appointment.worker.lastName.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="body2">
                        {appointment.worker.firstName} {appointment.worker.lastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Case: {appointment.case.caseNumber}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
              )}
              <TableCell>
                <Chip
                  label={appointment.appointmentType.replace('_', ' ')}
                  size="small"
                  variant="outlined"
                />
              </TableCell>
              <TableCell>
                <Box display="flex" alignItems="center" gap={0.5}>
                  {getLocationIcon(appointment.location)}
                  <Typography variant="body2">
                    {appointment.location}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {appointment.duration} min
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  icon={getStatusIcon(appointment.status)}
                  label={appointment.status.replace('_', ' ')}
                  color={getStatusColor(appointment.status)}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Box display="flex" gap={0.5}>
                  {isWorker ? (
                    // Worker actions - simple confirm/decline
                    <>
                      {appointment.status === 'scheduled' && (
                        <>
                          <Tooltip title="Confirm Appointment">
                            <IconButton 
                              size="small" 
                              color="success"
                              onClick={() => onConfirm(appointment._id)}
                            >
                              <CheckCircle />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Decline Appointment">
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => onDecline(appointment._id)}
                            >
                              <Cancel />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      {appointment.status === 'confirmed' && (
                        <Typography variant="caption" color="success.main">
                          Confirmed ✓
                        </Typography>
                      )}
                      {appointment.status === 'completed' && (
                        <Typography variant="caption" color="info.main">
                          Completed ✓
                        </Typography>
                      )}
                    </>
                  ) : (
                    // Clinician actions - full management
                    <>
                      <Tooltip title="View Details">
                        <IconButton size="small">
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => onEdit(appointment)}>
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      {appointment.status === 'scheduled' && (
                        <Tooltip title="Confirm">
                          <IconButton 
                            size="small" 
                            onClick={() => onStatusUpdate(appointment._id, 'confirmed')}
                          >
                            <CheckCircle />
                          </IconButton>
                        </Tooltip>
                      )}
                      {appointment.status === 'confirmed' && (
                        <Tooltip title="Start">
                          <IconButton 
                            size="small" 
                            onClick={() => onStatusUpdate(appointment._id, 'in_progress')}
                          >
                            <PlayArrow />
                          </IconButton>
                        </Tooltip>
                      )}
                      {appointment.status === 'in_progress' && (
                        <Tooltip title="Complete">
                          <IconButton 
                            size="small" 
                            onClick={() => onStatusUpdate(appointment._id, 'completed')}
                          >
                            <CheckCircle />
                          </IconButton>
                        </Tooltip>
                      )}
                    </>
                  )}
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default Appointments;
