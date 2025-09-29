import React, { useState, useEffect, useCallback } from 'react';
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
  Avatar,
  Tooltip,
  Pagination,
} from '@mui/material';
import {
  Add,
  Edit,
  Visibility,
  CalendarToday,
  Schedule,
  LocationOn,
  CheckCircle,
  Cancel,
  Warning,
  PlayArrow,
  Assessment,
  LocalHospital,
  VideoCall,
  Home,
  Work,
  ContentCopy,
  Delete,
  Download,
  Event,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import LayoutWithSidebar from '../components/LayoutWithSidebar';
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
  telehealthInfo?: {
    platform: string;
    meetingId: string;
    meetingUrl: string;
    password: string;
    instructions: string;
    zoomMeeting: {
      id: string;
      topic: string;
      startTime: string;
      duration: number;
      joinUrl: string;
      password: string;
      meetingId: string;
      hostId: string;
      createdAt: string;
      status: string;
    };
  };
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [pageSize, setPageSize] = useState(15);
  const [tabValue, setTabValue] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  
  // Tab state for organizing appointments by date
  const [activeTab, setActiveTab] = useState(0);
  
  // Function to organize appointments by date
  const organizeAppointmentsByDate = (appointments: any[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    return {
      today: appointments.filter(apt => {
        const aptDate = new Date(apt.scheduledDate);
        aptDate.setHours(0, 0, 0, 0);
        return aptDate.getTime() === today.getTime();
      }),
      tomorrow: appointments.filter(apt => {
        const aptDate = new Date(apt.scheduledDate);
        aptDate.setHours(0, 0, 0, 0);
        return aptDate.getTime() === tomorrow.getTime();
      }),
      thisWeek: appointments.filter(apt => {
        const aptDate = new Date(apt.scheduledDate);
        aptDate.setHours(0, 0, 0, 0);
        return aptDate >= tomorrow && aptDate < nextWeek;
      }),
      upcoming: appointments.filter(apt => {
        const aptDate = new Date(apt.scheduledDate);
        aptDate.setHours(0, 0, 0, 0);
        return aptDate >= nextWeek;
      })
    };
  };
  
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
  
  // Debug logging - only log when user changes to prevent spam
  React.useEffect(() => {
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
  }, [user?.email, user?.role, isWorker, tabValue, appointments]);

  const fetchAppointments = useCallback(async (page = currentPage, limit = pageSize) => {
    try {
      setLoading(true);
      const response = await api.get(`/appointments?page=${page}&limit=${limit}`);
      setAppointments(response.data.appointments || []);
      
      // Update pagination info
      if (response.data.pagination) {
        setTotalPages(response.data.pagination.pages || 1);
        setTotalAppointments(response.data.pagination.total || 0);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch appointments');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize]);

  useEffect(() => {
    if (user) {
      fetchAppointments(currentPage, pageSize);
      // Only fetch cases and workers if user is not a worker
      if (!isWorker) {
        fetchCases();
      }
    }
  }, [user, user?.email, user?.role, isWorker, currentPage, pageSize, fetchAppointments]); // Include all dependencies

  const fetchCases = async () => {
    try {
      const response = await api.get('/cases');
      setCases(response.data.cases || []);
    } catch (err: any) {
      console.error('Failed to fetch cases:', err);
    }
  };

  // Pagination handlers
  const handlePageChange = (event: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (event: any) => {
    setPageSize(Number(event.target.value));
    setCurrentPage(1); // Reset to first page when changing page size
  };


  const handleCreateAppointment = async () => {
    try {
      setIsCreating(true);
      
      // Get worker ID from selected case
      const selectedCase = cases.find(c => c._id === formData.case);
      console.log('Selected case:', selectedCase);
      
      if (!selectedCase) {
        setError('Please select a case');
        return;
      }
      
      // Check if case has a clinician assigned
      if (!selectedCase.clinician || !selectedCase.clinician._id) {
        setError('Selected case does not have a clinician assigned. Please assign a clinician to the case first.');
        console.log('No clinician found in case:', selectedCase);
        return;
      }

      console.log('Creating appointment with data:', {
        case: formData.case,
        worker: selectedCase.worker?._id,
        clinician: selectedCase.clinician?._id,
        appointmentType: formData.appointmentType,
        scheduledDate: formData.scheduledDate,
        duration: formData.duration,
        location: formData.location
      });

      // Prepare appointment data according to backend validation requirements
      const appointmentData = {
        case: formData.case, // Backend validator expects 'case', not 'caseId'
        worker: selectedCase.worker._id,
        clinician: selectedCase.clinician._id,
        appointmentType: formData.appointmentType,
        scheduledDate: formData.scheduledDate,
        duration: formData.duration || 60, // Default to 60 minutes if not specified
        location: formData.location || 'clinic', // Default to clinic if not specified
        purpose: formData.purpose || '',
        notes: formData.notes || '',
        isVirtual: formData.location === 'telehealth' // Set to true if location is telehealth
      };

      await api.post('/appointments', appointmentData);
      
      setDialogOpen(false);
      resetForm();
      fetchAppointments(currentPage, pageSize);
      
      // Clear any previous errors and show success message
      setError('');
      const workerName = `${selectedCase.worker.firstName} ${selectedCase.worker.lastName}`;
      const caseNumber = selectedCase.caseNumber;
      const appointmentType = formData.appointmentType.replace('_', ' ');
      const appointmentDate = new Date(formData.scheduledDate).toLocaleString();
      const appointmentLocation = formData.location === 'telehealth' ? 'via telehealth' : `at ${formData.location}`;
      
      setSuccessMessage(`✅ Appointment created successfully! ${appointmentType.charAt(0).toUpperCase() + appointmentType.slice(1)} appointment scheduled for ${workerName} (Case ${caseNumber}) on ${appointmentDate} ${appointmentLocation}. The worker will be notified about the appointment.`);
      setTimeout(() => setSuccessMessage(''), 8000); // Clear after 8 seconds
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
      fetchAppointments(currentPage, pageSize);
      
      // Show success message
      setError('');
      const workerName = `${selectedAppointment.worker.firstName} ${selectedAppointment.worker.lastName}`;
      const appointmentType = formData.appointmentType.replace('_', ' ');
      const appointmentDate = new Date(formData.scheduledDate).toLocaleString();
      
      setSuccessMessage(`✅ Appointment updated successfully! ${appointmentType.charAt(0).toUpperCase() + appointmentType.slice(1)} appointment for ${workerName} has been updated. New schedule: ${appointmentDate}.`);
      setTimeout(() => setSuccessMessage(''), 6000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update appointment');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusUpdate = async (appointmentId: string, newStatus: string) => {
    try {
      await api.put(`/appointments/${appointmentId}/status`, { status: newStatus });
      fetchAppointments(currentPage, pageSize);
      
      // Show success message
      setError('');
      const appointment = appointments.find(apt => apt._id === appointmentId);
      const workerName = appointment ? `${appointment.worker.firstName} ${appointment.worker.lastName}` : 'worker';
      const statusText = newStatus.replace('_', ' ');
      
      setSuccessMessage(`✅ Appointment status updated! ${workerName}'s appointment status has been changed to "${statusText}".`);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update appointment status');
    }
  };

  const handleConfirmAppointment = async (appointmentId: string) => {
    try {
      await api.put(`/appointments/${appointmentId}/status`, { status: 'confirmed' });
      fetchAppointments(currentPage, pageSize);
      
      // Show success message
      setError('');
      const appointment = appointments.find(apt => apt._id === appointmentId);
      const workerName = appointment ? `${appointment.worker.firstName} ${appointment.worker.lastName}` : 'worker';
      
      setSuccessMessage(`✅ Appointment confirmed! ${workerName}'s appointment has been confirmed and they will be notified.`);
      setTimeout(() => setSuccessMessage(''), 5000);
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
      fetchAppointments(currentPage, pageSize);
      
      // Show success message
      setError('');
      const appointment = appointments.find(apt => apt._id === appointmentId);
      const workerName = appointment ? `${appointment.worker.firstName} ${appointment.worker.lastName}` : 'worker';
      
      setSuccessMessage(`✅ Appointment cancelled! ${workerName}'s appointment has been cancelled and they will be notified.`);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to decline appointment');
    }
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!window.confirm('Are you sure you want to delete this appointment? This action cannot be undone and will also delete the associated Zoom meeting.')) {
      return;
    }

    try {
      await api.delete(`/appointments/${appointmentId}`);
      fetchAppointments(currentPage, pageSize);
      setError(''); // Clear any previous errors
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete appointment');
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

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const getUpcomingAppointments = () => {
    const now = new Date();
    return appointments.filter(apt => 
      new Date(apt.scheduledDate) > now && 
      ['scheduled', 'confirmed'].includes(apt.status)
    ).sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
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

  const downloadAppointmentsAsExcel = () => {
    // Create CSV content
    const headers = [
      'Date',
      'Time',
      'Patient Name',
      'Case Number',
      'Appointment Type',
      'Status',
      'Duration (min)',
      'Location',
      'Notes'
    ];

    const csvContent = [
      headers.join(','),
      ...appointments.map(appointment => {
        const date = new Date(appointment.scheduledDate);
        const dateStr = date.toLocaleDateString();
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        return [
          `"${dateStr}"`,
          `"${timeStr}"`,
          `"${appointment.worker.firstName} ${appointment.worker.lastName}"`,
          `"${appointment.case.caseNumber}"`,
          `"${appointment.appointmentType.replace('_', ' ')}"`,
          `"${appointment.status.replace('_', ' ')}"`,
          `"${appointment.duration}"`,
          `"${appointment.location || 'N/A'}"`,
          `"${appointment.notes || 'N/A'}"`
        ].join(',');
      })
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `appointments_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Don't render until user is loaded
  if (!user) {
    return (
      <LayoutWithSidebar>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </LayoutWithSidebar>
    );
  }

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
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 2,
            p: 2,
            borderRadius: 3,
            background: 'linear-gradient(135deg, #7B68EE 0%, #20B2AA 100%)',
            color: 'white',
            boxShadow: '0 4px 20px rgba(123, 104, 238, 0.25)',
            backdropFilter: 'blur(10px)'
          }}>
            <Box sx={{
              width: 40,
              height: 40,
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}>
              <Event sx={{ fontSize: 24 }} />
            </Box>
            <Typography variant="h6" sx={{ 
              fontWeight: 600,
              letterSpacing: '-0.01em',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              fontSize: '1.1rem'
            }}>
              {isWorker 
                ? 'View and confirm your scheduled appointments' 
                : 'Appointment Management Dashboard'
              }
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={downloadAppointmentsAsExcel}
              sx={{ 
                borderRadius: 1,
                px: 3,
                py: 1,
                borderColor: '#7B68EE',
                color: '#7B68EE',
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '14px',
                '&:hover': {
                  backgroundColor: 'rgba(123, 104, 238, 0.04)',
                  borderColor: '#7B68EE',
                },
                transition: 'all 0.2s ease'
              }}
            >
              Download Excel
            </Button>
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
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {successMessage && (
          <Alert 
            severity="success" 
            sx={{ 
              mb: 3, 
              borderRadius: 2,
              backgroundColor: '#f0f9ff',
              border: '1px solid #0ea5e9',
              '& .MuiAlert-icon': {
                color: '#0ea5e9'
              }
            }}
            onClose={() => setSuccessMessage('')}
          >
            {successMessage}
          </Alert>
        )}

        {/* Overview Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" component="h1" sx={{ 
            fontWeight: 600,
            color: '#1a1a1a',
            mb: 3,
            fontSize: '2rem'
          }}>
            Overview
          </Typography>
          
          {/* Dashboard Cards */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            {/* Today's Appointments Card */}
            <Card sx={{ 
              minWidth: 250, 
              flex: 1, 
              borderRadius: 2,
              border: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              overflow: 'hidden',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              },
              transition: 'box-shadow 0.2s ease'
            }}>
              <Box sx={{ 
                backgroundColor: '#0073e6', 
                color: 'white', 
                p: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '14px' }}>
                  {isWorker ? "PENDING" : "TODAY'S APPOINTMENTS"}
                </Typography>
              </Box>
              <CardContent sx={{ p: 2.5 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box sx={{ flex: 1 }}>
                    {/* Mini bar chart */}
                    <Box sx={{ mb: 1, display: 'flex', alignItems: 'end', gap: 0.5 }}>
                      <Box sx={{ width: 4, height: 12, backgroundColor: '#0073e6', borderRadius: 0.5 }} />
                      <Box sx={{ width: 4, height: 18, backgroundColor: '#0073e6', borderRadius: 0.5 }} />
                      <Box sx={{ width: 4, height: 8, backgroundColor: '#0073e6', borderRadius: 0.5 }} />
                      <Box sx={{ width: 4, height: 15, backgroundColor: '#0073e6', borderRadius: 0.5 }} />
                      <Box sx={{ width: 4, height: 10, backgroundColor: '#0073e6', borderRadius: 0.5 }} />
                    </Box>
                    <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a1a1a', mb: 0.5 }}>
                      {isWorker 
                        ? appointments.filter(apt => apt.status === 'scheduled').length
                        : getTodayAppointments().length
                      }
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '13px' }}>
                      Today's
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" sx={{ color: '#059669', fontWeight: 600, fontSize: '12px' }}>
                      +11%
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Upcoming Appointments Card */}
            <Card sx={{ 
              minWidth: 250, 
              flex: 1, 
              borderRadius: 2,
              border: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              overflow: 'hidden',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              },
              transition: 'box-shadow 0.2s ease'
            }}>
              <Box sx={{ 
                backgroundColor: '#7B68EE', 
                color: 'white', 
                p: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '14px' }}>
                  {isWorker ? "CONFIRMED" : "UPCOMING"}
                </Typography>
              </Box>
              <CardContent sx={{ p: 2.5 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box sx={{ flex: 1 }}>
                    {/* Circular progress indicator */}
                    <Box sx={{ 
                      width: 40, 
                      height: 40, 
                      borderRadius: '50%',
                      backgroundColor: '#f0f9ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 1,
                      position: 'relative',
                      border: '3px solid #e5e7eb'
                    }}>
                      <Box sx={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        background: `conic-gradient(#7B68EE 0deg ${(appointments.filter(apt => apt.status === 'confirmed').length / 30) * 360}deg, transparent ${(appointments.filter(apt => apt.status === 'confirmed').length / 30) * 360}deg)`,
                        zIndex: 1
                      }} />
                      <Typography variant="caption" sx={{ 
                        fontWeight: 600, 
                        color: '#7B68EE',
                        zIndex: 2,
                        fontSize: '10px'
                      }}>
                        {appointments.filter(apt => apt.status === 'confirmed').length}/30
                      </Typography>
                    </Box>
                    <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a1a1a', mb: 0.5 }}>
                      {isWorker 
                        ? appointments.filter(apt => apt.status === 'confirmed').length
                        : getUpcomingAppointments().length
                      }
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '13px' }}>
                      Today's
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" sx={{ color: '#E74C3C', fontWeight: 600, fontSize: '12px' }}>
                      -6.6%
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Completed Appointments Card */}
            <Card sx={{ 
              minWidth: 250, 
              flex: 1, 
              borderRadius: 2,
              border: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              overflow: 'hidden',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              },
              transition: 'box-shadow 0.2s ease'
            }}>
              <Box sx={{ 
                backgroundColor: '#16a34a', 
                color: 'white', 
                p: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '14px' }}>
                  COMPLETED
                </Typography>
              </Box>
              <CardContent sx={{ p: 2.5 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box sx={{ flex: 1 }}>
                    {/* Mini bar chart */}
                    <Box sx={{ mb: 1, display: 'flex', alignItems: 'end', gap: 0.5 }}>
                      <Box sx={{ width: 4, height: 8, backgroundColor: '#16a34a', borderRadius: 0.5 }} />
                      <Box sx={{ width: 4, height: 15, backgroundColor: '#16a34a', borderRadius: 0.5 }} />
                      <Box sx={{ width: 4, height: 12, backgroundColor: '#16a34a', borderRadius: 0.5 }} />
                      <Box sx={{ width: 4, height: 18, backgroundColor: '#16a34a', borderRadius: 0.5 }} />
                      <Box sx={{ width: 4, height: 10, backgroundColor: '#16a34a', borderRadius: 0.5 }} />
                    </Box>
                    <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a1a1a', mb: 0.5 }}>
                      {appointments.filter(apt => apt.status === 'completed').length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '13px' }}>
                      Today's
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" sx={{ color: '#059669', fontWeight: 600, fontSize: '12px' }}>
                      +09%
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Cancelled Appointments Card */}
            <Card sx={{ 
              minWidth: 250, 
              flex: 1, 
              borderRadius: 2,
              border: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              overflow: 'hidden',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              },
              transition: 'box-shadow 0.2s ease'
            }}>
              <Box sx={{ 
                backgroundColor: '#E74C3C', 
                color: 'white', 
                p: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '14px' }}>
                  CANCELLED
                </Typography>
              </Box>
              <CardContent sx={{ p: 2.5 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box sx={{ flex: 1 }}>
                    {/* Circular progress with alarm icon */}
                    <Box sx={{ 
                      width: 40, 
                      height: 40, 
                      borderRadius: '50%',
                      backgroundColor: '#fef2f2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 1,
                      position: 'relative',
                      border: '3px solid #fecaca'
                    }}>
                      <Box sx={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        background: `conic-gradient(#E74C3C 0deg ${(appointments.filter(apt => apt.status === 'cancelled').length / 10) * 360}deg, transparent ${(appointments.filter(apt => apt.status === 'cancelled').length / 10) * 360}deg)`,
                        zIndex: 1
                      }} />
                      <Warning sx={{ 
                        fontSize: 16, 
                        color: '#E74C3C',
                        zIndex: 2
                      }} />
                    </Box>
                    <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a1a1a', mb: 0.5 }}>
                      {appointments.filter(apt => apt.status === 'cancelled').length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '13px' }}>
                      Today's
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" sx={{ color: '#059669', fontWeight: 600, fontSize: '12px' }}>
                      +01%
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
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
            <Box sx={{ 
              display: 'flex', 
              flexWrap: { xs: 'wrap', sm: 'nowrap' },
              overflow: { xs: 'auto', sm: 'visible' }
            }}>
              {isWorker ? (
                <>
                  <Box
                    sx={{
                      flex: { xs: '1 1 50%', sm: 1 },
                      minWidth: { xs: '120px', sm: 'auto' },
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
                      flex: { xs: '1 1 50%', sm: 1 },
                      minWidth: { xs: '120px', sm: 'auto' },
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
                      flex: { xs: '1 1 50%', sm: 1 },
                      minWidth: { xs: '120px', sm: 'auto' },
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
                      flex: { xs: '1 1 50%', sm: 1 },
                      minWidth: { xs: '120px', sm: 'auto' },
                      py: 2,
                      px: 3,
                      cursor: 'pointer',
                      backgroundColor: activeTab === 0 ? 'white' : 'transparent',
                      borderBottom: activeTab === 0 ? '2px solid #0073e6' : '2px solid transparent',
                      color: activeTab === 0 ? '#0073e6' : '#6b7280',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                      fontWeight: 500,
                      fontSize: '14px',
                      '&:hover': {
                        backgroundColor: activeTab === 0 ? 'white' : '#f1f5f9',
                        color: activeTab === 0 ? '#0073e6' : '#374151',
                      }
                    }}
                    onClick={() => setActiveTab(0)}
                  >
                    <CalendarToday sx={{ fontSize: 16 }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Today's Scheduled ({organizeAppointmentsByDate(appointments).today.length})
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      flex: { xs: '1 1 50%', sm: 1 },
                      minWidth: { xs: '120px', sm: 'auto' },
                      py: 2,
                      px: 3,
                      cursor: 'pointer',
                      backgroundColor: activeTab === 1 ? 'white' : 'transparent',
                      borderBottom: activeTab === 1 ? '2px solid #0073e6' : '2px solid transparent',
                      color: activeTab === 1 ? '#0073e6' : '#6b7280',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                      fontWeight: 500,
                      fontSize: '14px',
                      '&:hover': {
                        backgroundColor: activeTab === 1 ? 'white' : '#f1f5f9',
                        color: activeTab === 1 ? '#0073e6' : '#374151',
                      }
                    }}
                    onClick={() => setActiveTab(1)}
                  >
                    <CheckCircle sx={{ fontSize: 16 }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      All Confirmed ({appointments.filter(apt => apt.status === 'confirmed').length})
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      flex: { xs: '1 1 50%', sm: 1 },
                      minWidth: { xs: '120px', sm: 'auto' },
                      py: 2,
                      px: 3,
                      cursor: 'pointer',
                      backgroundColor: activeTab === 2 ? 'white' : 'transparent',
                      borderBottom: activeTab === 2 ? '2px solid #0073e6' : '2px solid transparent',
                      color: activeTab === 2 ? '#0073e6' : '#6b7280',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                      fontWeight: 500,
                      fontSize: '14px',
                      '&:hover': {
                        backgroundColor: activeTab === 2 ? 'white' : '#f1f5f9',
                        color: activeTab === 2 ? '#0073e6' : '#374151',
                      }
                    }}
                    onClick={() => setActiveTab(2)}
                  >
                    <Schedule sx={{ fontSize: 16 }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      This Week ({organizeAppointmentsByDate(appointments).thisWeek.length})
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      flex: { xs: '1 1 50%', sm: 1 },
                      minWidth: { xs: '120px', sm: 'auto' },
                      py: 2,
                      px: 3,
                      cursor: 'pointer',
                      backgroundColor: activeTab === 3 ? 'white' : 'transparent',
                      borderBottom: activeTab === 3 ? '2px solid #0073e6' : '2px solid transparent',
                      color: activeTab === 3 ? '#0073e6' : '#6b7280',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                      fontWeight: 500,
                      fontSize: '14px',
                      '&:hover': {
                        backgroundColor: activeTab === 3 ? 'white' : '#f1f5f9',
                        color: activeTab === 3 ? '#0073e6' : '#374151',
                      }
                    }}
                    onClick={() => setActiveTab(3)}
                  >
                    <Assessment sx={{ fontSize: 16 }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Upcoming ({organizeAppointmentsByDate(appointments).upcoming.length})
                    </Typography>
                  </Box>
                </>
              )}
            </Box>
          </Box>

          {/* Summary Stats - Only for non-workers */}
          {!isWorker && (
            <Box sx={{ 
              mb: 2, 
              display: 'flex', 
              gap: 1, 
              alignItems: 'center', 
              flexWrap: 'wrap',
              justifyContent: { xs: 'center', sm: 'flex-start' }
            }}>
              <Chip 
                label={`Confirmed: ${appointments.filter(apt => apt.status === 'confirmed').length}`} 
                color="success" 
                size="small" 
                sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}
              />
              <Chip 
                label={`Pending: ${appointments.filter(apt => apt.status === 'scheduled').length}`} 
                color="warning" 
                size="small" 
                sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}
              />
              <Chip 
                label={`Declined: ${appointments.filter(apt => apt.status === 'cancelled').length}`} 
                color="error" 
                size="small" 
                sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}
              />
            </Box>
          )}

          {isWorker ? (
            <>
              <TabPanel value={activeTab} index={0}>
                <AppointmentTable 
                  appointments={organizeAppointmentsByDate(appointments).today} 
                  onEdit={openEditDialog}
                  onStatusUpdate={handleStatusUpdate}
                  onConfirm={handleConfirmAppointment}
                  onDecline={handleDeclineAppointment}
                  onDelete={handleDeleteAppointment}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                  getLocationIcon={getLocationIcon}
                  formatDate={formatDate}
                  formatTime={formatTime}
                  copyToClipboard={copyToClipboard}
                  isWorker={true}
                />
              </TabPanel>

              <TabPanel value={activeTab} index={1}>
                <AppointmentTable 
                  appointments={appointments.filter(apt => apt.status === 'confirmed')} 
                  onEdit={openEditDialog}
                  onStatusUpdate={handleStatusUpdate}
                  onConfirm={handleConfirmAppointment}
                  onDecline={handleDeclineAppointment}
                  onDelete={handleDeleteAppointment}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                  getLocationIcon={getLocationIcon}
                  formatDate={formatDate}
                  formatTime={formatTime}
                  copyToClipboard={copyToClipboard}
                  isWorker={true}
                />
              </TabPanel>

              <TabPanel value={activeTab} index={2}>
                <AppointmentTable 
                  appointments={organizeAppointmentsByDate(appointments).thisWeek} 
                  onEdit={openEditDialog}
                  onStatusUpdate={handleStatusUpdate}
                  onConfirm={handleConfirmAppointment}
                  onDecline={handleDeclineAppointment}
                  onDelete={handleDeleteAppointment}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                  getLocationIcon={getLocationIcon}
                  formatDate={formatDate}
                  formatTime={formatTime}
                  copyToClipboard={copyToClipboard}
                  isWorker={true}
                />
              </TabPanel>

              <TabPanel value={activeTab} index={3}>
                <AppointmentTable 
                  appointments={organizeAppointmentsByDate(appointments).upcoming} 
                  onEdit={openEditDialog}
                  onStatusUpdate={handleStatusUpdate}
                  onConfirm={handleConfirmAppointment}
                  onDecline={handleDeclineAppointment}
                  onDelete={handleDeleteAppointment}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                  getLocationIcon={getLocationIcon}
                  formatDate={formatDate}
                  formatTime={formatTime}
                  copyToClipboard={copyToClipboard}
                  isWorker={true}
                />
              </TabPanel>
            </>
          ) : (
            <>
              <TabPanel value={activeTab} index={0}>
                <AppointmentTable 
                  appointments={organizeAppointmentsByDate(appointments).today} 
                  onEdit={openEditDialog}
                  onStatusUpdate={handleStatusUpdate}
                  onConfirm={handleConfirmAppointment}
                  onDecline={handleDeclineAppointment}
                  onDelete={handleDeleteAppointment}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                  getLocationIcon={getLocationIcon}
                  formatDate={formatDate}
                  formatTime={formatTime}
                  copyToClipboard={copyToClipboard}
                  isWorker={false}
                />
              </TabPanel>

              <TabPanel value={activeTab} index={1}>
                <AppointmentTable 
                  appointments={appointments.filter(apt => apt.status === 'confirmed')} 
                  onEdit={openEditDialog}
                  onStatusUpdate={handleStatusUpdate}
                  onConfirm={handleConfirmAppointment}
                  onDecline={handleDeclineAppointment}
                  onDelete={handleDeleteAppointment}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                  getLocationIcon={getLocationIcon}
                  formatDate={formatDate}
                  formatTime={formatTime}
                  copyToClipboard={copyToClipboard}
                  isWorker={false}
                />
              </TabPanel>

              <TabPanel value={activeTab} index={2}>
                <AppointmentTable 
                  appointments={organizeAppointmentsByDate(appointments).thisWeek} 
                  onEdit={openEditDialog}
                  onStatusUpdate={handleStatusUpdate}
                  onConfirm={handleConfirmAppointment}
                  onDecline={handleDeclineAppointment}
                  onDelete={handleDeleteAppointment}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                  getLocationIcon={getLocationIcon}
                  formatDate={formatDate}
                  formatTime={formatTime}
                  copyToClipboard={copyToClipboard}
                  isWorker={false}
                />
              </TabPanel>

              <TabPanel value={activeTab} index={3}>
                <AppointmentTable 
                  appointments={organizeAppointmentsByDate(appointments).upcoming} 
                  onEdit={openEditDialog}
                  onStatusUpdate={handleStatusUpdate}
                  onConfirm={handleConfirmAppointment}
                  onDecline={handleDeclineAppointment}
                  onDelete={handleDeleteAppointment}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                  getLocationIcon={getLocationIcon}
                  formatDate={formatDate}
                  formatTime={formatTime}
                  copyToClipboard={copyToClipboard}
                  isWorker={false}
                />
              </TabPanel>

            </>
          )}
        </Card>

        {/* Automatic Pagination - Hidden UI */}
        {/* Pagination is handled automatically in the background */}

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
                      onChange={(e) => {
                        const selectedCase = cases.find(c => c._id === e.target.value);
                        setFormData({ 
                          ...formData, 
                          case: e.target.value,
                          worker: selectedCase?.worker?._id || ''
                        });
                      }}
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
                  <TextField
                    fullWidth
                    label="Worker"
                    value={formData.case ? (() => {
                      const selectedCase = cases.find(c => c._id === formData.case);
                      return selectedCase ? `${selectedCase.worker?.firstName} ${selectedCase.worker?.lastName}` : '';
                    })() : ''}
                    InputProps={{
                      readOnly: true,
                    }}
                  />
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
                    inputProps={{
                      min: new Date().toISOString().slice(0, 16)
                    }}
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
        
        {/* Pagination Controls */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mt: 3,
          px: 2
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalAppointments)} of {totalAppointments} appointments
            </Typography>
            <FormControl size="small" sx={{ minWidth: 80 }}>
              <Select
                value={pageSize}
                onChange={handlePageSizeChange}
                displayEmpty
              >
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={15}>15</MenuItem>
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
            showFirstButton
            showLastButton
            size="large"
          />
        </Box>
      </Box>
    </LayoutWithSidebar>
  );
};

// Appointment Table Component
interface AppointmentTableProps {
  appointments: Appointment[];
  onEdit: (appointment: Appointment) => void;
  onStatusUpdate: (id: string, status: string) => void;
  onConfirm: (id: string) => void;
  onDecline: (id: string) => void;
  onDelete: (id: string) => void;
  getStatusColor: (status: string) => any;
  getStatusIcon: (status: string) => React.ReactElement;
  getLocationIcon: (location: string) => React.ReactNode;
  formatDate: (date: string) => string;
  formatTime: (date: string) => string;
  copyToClipboard: (text: string) => Promise<void>;
  isWorker: boolean;
}

const AppointmentTable: React.FC<AppointmentTableProps> = ({
  appointments,
  onEdit,
  onStatusUpdate,
  onConfirm,
  onDecline,
  onDelete,
  getStatusColor,
  getStatusIcon,
  getLocationIcon,
  formatDate,
  formatTime,
  copyToClipboard,
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
    <Box>
      <TableContainer 
        component={Paper} 
        variant="outlined"
        sx={{ 
          overflowX: 'auto'
        }}
      >
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={{ minWidth: { xs: '120px', sm: 'auto' } }}>Date & Time</TableCell>
            {isWorker ? (
              <>
                <TableCell sx={{ minWidth: { xs: '100px', sm: 'auto' } }}>Clinician</TableCell>
                <TableCell sx={{ minWidth: { xs: '80px', sm: 'auto' } }}>Type</TableCell>
                <TableCell sx={{ minWidth: { xs: '80px', sm: 'auto' } }}>Location</TableCell>
                <TableCell sx={{ minWidth: { xs: '60px', sm: 'auto' } }}>Duration</TableCell>
                <TableCell sx={{ minWidth: { xs: '80px', sm: 'auto' } }}>Status</TableCell>
                <TableCell sx={{ minWidth: { xs: '100px', sm: 'auto' } }}>Actions</TableCell>
              </>
            ) : (
              <>
                <TableCell sx={{ minWidth: { xs: '100px', sm: 'auto' } }}>Patient</TableCell>
                <TableCell sx={{ minWidth: { xs: '80px', sm: 'auto' } }}>Type</TableCell>
                <TableCell sx={{ minWidth: { xs: '80px', sm: 'auto' } }}>Location</TableCell>
                <TableCell sx={{ minWidth: { xs: '60px', sm: 'auto' } }}>Duration</TableCell>
                <TableCell sx={{ minWidth: { xs: '100px', sm: 'auto' } }}>Confirmation Status</TableCell>
                <TableCell sx={{ minWidth: { xs: '80px', sm: 'auto' } }}>Status</TableCell>
                <TableCell sx={{ minWidth: { xs: '100px', sm: 'auto' } }}>Actions</TableCell>
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
                  {appointment.location === 'telehealth' && appointment.telehealthInfo?.zoomMeeting && (
                    <Tooltip title="Zoom Meeting Available">
                      <VideoCall sx={{ fontSize: 16, color: '#2D8CFF', ml: 1 }} />
                    </Tooltip>
                  )}
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {appointment.duration} min
                </Typography>
              </TableCell>
              {!isWorker && (
                <TableCell>
                  <Chip
                    icon={appointment.status === 'confirmed' ? <CheckCircle /> : appointment.status === 'cancelled' ? <Cancel /> : <Schedule />}
                    label={appointment.status === 'confirmed' ? 'Confirmed' : appointment.status === 'cancelled' ? 'Declined' : 'Pending'}
                    color={appointment.status === 'confirmed' ? 'success' : appointment.status === 'cancelled' ? 'error' : 'warning'}
                    size="small"
                  />
                </TableCell>
              )}
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
                    // Worker actions - simple confirm/decline + Zoom meeting
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
                        <>
                          <Typography variant="caption" color="success.main" sx={{ mr: 1 }}>
                            Confirmed ✓
                          </Typography>
                          {appointment.location === 'telehealth' && appointment.telehealthInfo?.zoomMeeting && (
                            <>
                              <Tooltip title="Join Zoom Meeting">
                                <IconButton 
                                  size="small" 
                                  color="primary"
                                  onClick={() => {
                                    console.log('Worker joining Zoom meeting:', appointment.telehealthInfo?.zoomMeeting?.joinUrl);
                                    window.open(appointment.telehealthInfo!.zoomMeeting!.joinUrl, '_blank');
                                  }}
                                >
                                  <VideoCall />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Copy Meeting Link">
                                <IconButton 
                                  size="small" 
                                  onClick={() => copyToClipboard(appointment.telehealthInfo!.zoomMeeting!.joinUrl)}
                                >
                                  <ContentCopy />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </>
                      )}
                      {appointment.status === 'completed' && (
                        <Typography variant="caption" color="info.main">
                          Completed ✓
                        </Typography>
                      )}
                    </>
                  ) : (
                    // Clinician actions - full management + Zoom
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
                      {appointment.location === 'telehealth' && appointment.telehealthInfo?.zoomMeeting && (
                        <Tooltip title="Start Zoom Meeting">
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => {
                              console.log('Starting Zoom meeting:', appointment.telehealthInfo?.zoomMeeting?.joinUrl);
                              window.open(appointment.telehealthInfo!.zoomMeeting!.joinUrl, '_blank');
                            }}
                          >
                            <VideoCall />
                          </IconButton>
                        </Tooltip>
                      )}
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
                      <Tooltip title="Delete Appointment">
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => onDelete(appointment._id)}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
    </Box>
  );
};

export default Appointments;
