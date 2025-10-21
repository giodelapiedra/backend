import React, { useState, useEffect, useMemo, memo, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  Avatar,
} from '@mui/material';
import {
  Add,
  CalendarToday,
  Schedule,
  CheckCircle,
  Cancel,
  Assessment,
  Download,
  Event,
  VideoCall,
  ContentCopy,
  Edit,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext.supabase';
import LayoutWithSidebar from '../components/LayoutWithSidebar';
import { SupabaseAPI } from '../utils/supabaseApi';

// Custom hooks
import { useAppointments } from '../hooks/useAppointments';
import { useAppointmentForm } from '../hooks/useAppointmentForm';
import { useAppointmentActions } from '../hooks/useAppointmentActions';

// Components
import { AppointmentTable } from '../components/appointments/AppointmentTable';
import { getStatusIcon, getLocationIcon } from '../components/appointments/AppointmentIcons';

// Utils
import {
  downloadAppointmentsAsCSV,
  organizeAppointmentsByDate,
  calculateAppointmentStats,
  copyToClipboard,
  formatDate,
  formatTime
} from '../utils/appointmentUtils';

// Constants
import {
  APPOINTMENT_TYPES,
  APPOINTMENT_TYPE_LABELS,
  LOCATION_TYPES,
  LOCATION_LABELS,
  DURATION_LIMITS,
  STATUS_COLORS
} from '../constants/appointmentConstants';

// Types
import { Appointment } from '../types/appointment.types';

// TabPanel component for organizing content

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

const Appointments: React.FC = memo(() => {
  const { user } = useAuth();
  
  // Custom hooks for state management
  const {
    appointments,
    loading,
    error,
    authError,
    currentPage,
    totalPages,
    totalAppointments,
    pageSize,
    fetchAppointments,
    setCurrentPage,
    setPageSize,
    setAppointments,
    setError,
    setAuthError
  } = useAppointments();
  
  const { formData, setField, setCaseAndWorker, resetForm, loadAppointment } = useAppointmentForm();
  
  // Local state
  const [cases, setCases] = useState<any[]>([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  
  // Optimized calculations with useMemo
  const organizedAppointments = useMemo(() => organizeAppointmentsByDate(appointments), [appointments]);
  const appointmentStats = useMemo(() => calculateAppointmentStats(appointments), [appointments]);
  
  // Appointment actions hook
  const {
    isCreating,
    isUpdating,
    createAppointment,
    updateAppointment,
    updateStatus,
    confirmAppointment,
    declineAppointment,
    deleteAppointment
  } = useAppointmentActions({
    onSuccess: () => {
      setDialogOpen(false);
      setSelectedAppointment(null);
      resetForm();
      fetchAppointments(currentPage, pageSize);
    },
    setError,
    setAuthError,
    setSuccessMessage: (msg) => {
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(''), 6000);
    },
    setAppointments
  });

  // Check if user is a worker
  const isWorker = user?.role === 'worker';
  
  // Sync tabs
  useEffect(() => {
    setActiveTab(tabValue);
  }, [tabValue]);

  useEffect(() => {
    if (user) {
      fetchAppointments(currentPage, pageSize);
      // Only fetch cases and workers if user is not a worker
      if (!isWorker) {
        fetchCases();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Only fetch on user change, not on tab/page changes

  // Test backend connection on component mount
  useEffect(() => {
    const testConnection = async () => {
      try {
        const { testBackendConnection } = await import('../utils/backendApi');
        const result = await testBackendConnection();
        if (result.success) {
          console.log('Backend connection test successful:', result.data);
        } else {
          console.error('Backend connection test failed:', result.error);
        }
      } catch (error) {
        console.error('Backend connection test failed:', error);
      }
    };
    testConnection();
  }, []);

  const fetchCases = async () => {
    try {
      const response = await SupabaseAPI.getCases();
      // Transform data to match expected format
      const casesData = response.cases.map((c: any) => ({
        _id: c.id,
        id: c.id,
        caseNumber: c.case_number,
        status: c.status,
        worker: c.worker ? {
          _id: c.worker.id,
          id: c.worker.id,
          firstName: c.worker.first_name,
          lastName: c.worker.last_name,
          email: c.worker.email,
          phone: c.worker.phone
        } : null,
        clinician: c.clinician ? {
          _id: c.clinician.id,
          id: c.clinician.id,
          firstName: c.clinician.first_name,
          lastName: c.clinician.last_name,
          email: c.clinician.email,
          phone: c.clinician.phone
        } : null,
        case_manager: c.case_manager ? {
          _id: c.case_manager.id,
          id: c.case_manager.id,
          firstName: c.case_manager.first_name,
          lastName: c.case_manager.last_name,
          email: c.case_manager.email
        } : null,
        employer: c.employer ? {
          _id: c.employer.id,
          id: c.employer.id,
          firstName: c.employer.first_name,
          lastName: c.employer.last_name,
          email: c.employer.email
        } : null
      }));
      setCases(casesData);
    } catch (err: any) {
      console.error('Failed to fetch cases:', err);
    }
  };

  // Pagination handlers - memoized to prevent re-renders
  const handlePageChange = useCallback((event: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
    fetchAppointments(page, pageSize);
  }, [pageSize, fetchAppointments]);

  const handlePageSizeChange = useCallback((event: any) => {
    const newSize = Number(event.target.value);
    setPageSize(newSize);
    setCurrentPage(1);
    fetchAppointments(1, newSize);
  }, [fetchAppointments]);

  // Handler wrappers - memoized
  const handleCreateAppointment = useCallback(() => {
    createAppointment(formData, cases);
  }, [createAppointment, formData, cases]);

  const handleUpdateAppointment = useCallback(() => {
    if (!selectedAppointment) return;
    updateAppointment(selectedAppointment._id, formData, selectedAppointment);
  }, [updateAppointment, selectedAppointment, formData]);

  const handleStatusUpdate = useCallback((id: string, status: string) => {
    updateStatus(id, status, appointments);
  }, [updateStatus, appointments]);

  const handleConfirmAppointment = useCallback((id: string) => {
    confirmAppointment(id, appointments);
  }, [confirmAppointment, appointments]);

  const handleDeclineAppointment = useCallback((id: string) => {
    declineAppointment(id, appointments);
  }, [declineAppointment, appointments]);

  const handleDeleteAppointment = useCallback((id: string) => {
    deleteAppointment(id);
  }, [deleteAppointment]);

  const openCreateDialog = useCallback(() => {
    setSelectedAppointment(null);
    resetForm();
    setDialogOpen(true);
  }, [resetForm]);

  const openEditDialog = useCallback((appointment: Appointment) => {
    setSelectedAppointment(appointment);
    loadAppointment({
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
  }, [loadAppointment]);

  const openViewDetailsDialog = useCallback((appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setViewDetailsOpen(true);
  }, []);
  
  // Helper function - memoized
  const getStatusColor = useCallback((status: string) => STATUS_COLORS[status] || 'default', []);
  
  // Tab change handler - memoized
  const handleTabChange = useCallback((index: number) => {
    setTabValue(index);
    setActiveTab(index);
  }, []);


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
            borderRadius: 2,
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <Box sx={{
              width: 40,
              height: 40,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0'
            }}>
              <Event sx={{ fontSize: 20, color: '#64748b' }} />
            </Box>
            <Typography variant="h6" sx={{ 
              fontWeight: 500,
              color: '#1e293b',
              fontSize: '1.1rem'
            }}>
              {isWorker 
                ? 'My Appointments' 
                : 'Appointment Management'
              }
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={() => downloadAppointmentsAsCSV(appointments)}
              sx={{ 
                borderRadius: 2,
                px: 2,
                py: 1,
                borderColor: '#d1d5db',
                color: '#374151',
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '14px',
                backgroundColor: 'white',
                '&:hover': {
                  backgroundColor: '#f9fafb',
                  borderColor: '#9ca3af',
                }
              }}
            >
              Export
            </Button>
            {!isWorker && (
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={openCreateDialog}
                sx={{ 
                  borderRadius: 2,
                  px: 2,
                  py: 1,
                  backgroundColor: '#374151',
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '14px',
                  '&:hover': {
                    backgroundColor: '#1f2937',
                  }
                }}
              >
                New Appointment
              </Button>
            )}
          </Box>
        </Box>

        {authError && (
          <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
            ⚠️ {authError}
          </Alert>
        )}

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
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              '& .MuiAlert-icon': {
                color: '#16a34a'
              }
            }}
            onClose={() => setSuccessMessage('')}
          >
            {successMessage}
          </Alert>
        )}

        {/* Overview Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h1" sx={{ 
            fontWeight: 500,
            color: '#374151',
            mb: 3,
            fontSize: '1.5rem'
          }}>
            Overview
          </Typography>
          
          {/* Dashboard Cards */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            {/* Today's Appointments Card */}
            <Card sx={{ 
              minWidth: 200, 
              flex: 1, 
              borderRadius: 2,
              border: '1px solid #e5e7eb',
              backgroundColor: 'white',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              '&:hover': {
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              },
              transition: 'box-shadow 0.2s ease'
            }}>
              <CardContent sx={{ p: 2 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '12px', mb: 1 }}>
                      {isWorker ? "PENDING" : "TODAY'S"}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 600, color: '#374151', mb: 0.5 }}>
                      {isWorker 
                        ? appointmentStats.scheduled
                        : appointmentStats.today
                      }
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '12px' }}>
                      appointments
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    width: 40, 
                    height: 40, 
                    borderRadius: '8px',
                    backgroundColor: '#f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Schedule sx={{ fontSize: 20, color: '#6b7280' }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Upcoming Appointments Card */}
            <Card sx={{ 
              minWidth: 200, 
              flex: 1, 
              borderRadius: 2,
              border: '1px solid #e5e7eb',
              backgroundColor: 'white',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              '&:hover': {
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              },
              transition: 'box-shadow 0.2s ease'
            }}>
              <CardContent sx={{ p: 2 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '12px', mb: 1 }}>
                      {isWorker ? "CONFIRMED" : "UPCOMING"}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 600, color: '#374151', mb: 0.5 }}>
                      {isWorker 
                        ? appointmentStats.confirmed
                        : appointmentStats.upcoming
                      }
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '12px' }}>
                      {isWorker ? "confirmed" : "this week"}
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    width: 40, 
                    height: 40, 
                    borderRadius: '8px',
                    backgroundColor: '#f0fdf4',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Event sx={{ fontSize: 20, color: '#16a34a' }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Completed Appointments Card */}
            <Card sx={{ 
              minWidth: 200, 
              flex: 1, 
              borderRadius: 2,
              border: '1px solid #e5e7eb',
              backgroundColor: 'white',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              '&:hover': {
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              },
              transition: 'box-shadow 0.2s ease'
            }}>
              <CardContent sx={{ p: 2 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '12px', mb: 1 }}>
                      COMPLETED
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 600, color: '#374151', mb: 0.5 }}>
                      {appointmentStats.completed}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '12px' }}>
                      this month
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    width: 40, 
                    height: 40, 
                    borderRadius: '8px',
                    backgroundColor: '#fef3c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <CheckCircle sx={{ fontSize: 20, color: '#d97706' }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Cancelled Appointments Card */}
            <Card sx={{ 
              minWidth: 200, 
              flex: 1, 
              borderRadius: 2,
              border: '1px solid #e5e7eb',
              backgroundColor: 'white',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              '&:hover': {
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              },
              transition: 'box-shadow 0.2s ease'
            }}>
              <CardContent sx={{ p: 2 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '12px', mb: 1 }}>
                      CANCELLED
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 600, color: '#374151', mb: 0.5 }}>
                      {appointmentStats.cancelled}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '12px' }}>
                      this month
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    width: 40, 
                    height: 40, 
                    borderRadius: '8px',
                    backgroundColor: '#fef2f2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Cancel sx={{ fontSize: 20, color: '#dc2626' }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Professional Tabs */}
        <Card sx={{ 
          borderRadius: 2, 
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}>
          <Box sx={{ 
            backgroundColor: '#f9fafb',
            borderBottom: '1px solid #e5e7eb'
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
                      borderBottom: tabValue === 0 ? '2px solid #374151' : '2px solid transparent',
                      color: tabValue === 0 ? '#374151' : '#6b7280',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                      fontWeight: 500,
                      fontSize: '14px',
                      '&:hover': {
                        backgroundColor: tabValue === 0 ? 'white' : '#f3f4f6',
                        color: tabValue === 0 ? '#374151' : '#374151',
                      }
                    }}
                    onClick={() => handleTabChange(0)}
                  >
                    <Schedule sx={{ fontSize: 16 }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Pending ({appointmentStats.scheduled})
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
                    onClick={() => handleTabChange(1)}
                  >
                    <CheckCircle sx={{ fontSize: 16 }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Confirmed ({appointmentStats.confirmed})
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
                    onClick={() => handleTabChange(2)}
                  >
                    <CheckCircle sx={{ fontSize: 16 }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Completed ({appointmentStats.completed})
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      flex: { xs: '1 1 50%', sm: 1 },
                      minWidth: { xs: '120px', sm: 'auto' },
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
                    onClick={() => handleTabChange(3)}
                  >
                    <CalendarToday sx={{ fontSize: 16 }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      All Appointments ({appointments.length})
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
                    onClick={() => handleTabChange(0)}
                  >
                    <CalendarToday sx={{ fontSize: 16 }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Today's Scheduled ({organizedAppointments.today.length})
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
                    onClick={() => handleTabChange(1)}
                  >
                    <CheckCircle sx={{ fontSize: 16 }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      All Confirmed ({appointmentStats.confirmed})
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
                    onClick={() => handleTabChange(2)}
                  >
                    <Schedule sx={{ fontSize: 16 }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      This Week ({organizedAppointments.thisWeek.length})
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
                    onClick={() => handleTabChange(3)}
                  >
                    <Assessment sx={{ fontSize: 16 }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Upcoming ({organizedAppointments.upcoming.length})
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
                label={`Confirmed: ${appointmentStats.confirmed}`} 
                color="success" 
                size="small" 
                sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}
              />
              <Chip 
                label={`Pending: ${appointmentStats.scheduled}`} 
                color="warning" 
                size="small" 
                sx={{ fontSize: { xs: '0.75rem', sm: '0.8125rem' } }}
              />
              <Chip 
                label={`Declined: ${appointmentStats.cancelled}`} 
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
                  appointments={appointments.filter(apt => apt.status === 'scheduled')} 
                  onEdit={openEditDialog}
                  onViewDetails={openViewDetailsDialog}
                  onStatusUpdate={handleStatusUpdate}
                  onConfirm={handleConfirmAppointment}
                  onDecline={handleDeclineAppointment}
                  onDelete={handleDeleteAppointment}
                  copyToClipboard={copyToClipboard}
                  isWorker={true}
                />
              </TabPanel>

              <TabPanel value={activeTab} index={1}>
                <AppointmentTable 
                  appointments={appointments.filter(apt => apt.status === 'confirmed')} 
                  onEdit={openEditDialog}
                  onViewDetails={openViewDetailsDialog}
                  onStatusUpdate={handleStatusUpdate}
                  onConfirm={handleConfirmAppointment}
                  onDecline={handleDeclineAppointment}
                  onDelete={handleDeleteAppointment}
                  copyToClipboard={copyToClipboard}
                  isWorker={true}
                />
              </TabPanel>

              <TabPanel value={activeTab} index={2}>
                <AppointmentTable 
                  appointments={appointments.filter(apt => apt.status === 'completed')} 
                  onEdit={openEditDialog}
                  onViewDetails={openViewDetailsDialog}
                  onStatusUpdate={handleStatusUpdate}
                  onConfirm={handleConfirmAppointment}
                  onDecline={handleDeclineAppointment}
                  onDelete={handleDeleteAppointment}
                  copyToClipboard={copyToClipboard}
                  isWorker={true}
                />
              </TabPanel>

              <TabPanel value={activeTab} index={3}>
                <AppointmentTable 
                  appointments={appointments} 
                  onEdit={openEditDialog}
                  onViewDetails={openViewDetailsDialog}
                  onStatusUpdate={handleStatusUpdate}
                  onConfirm={handleConfirmAppointment}
                  onDecline={handleDeclineAppointment}
                  onDelete={handleDeleteAppointment}
                  copyToClipboard={copyToClipboard}
                  isWorker={true}
                />
              </TabPanel>
            </>
          ) : (
            <>
              <TabPanel value={activeTab} index={0}>
                <AppointmentTable 
                  appointments={organizedAppointments.today} 
                  onEdit={openEditDialog}
                  onViewDetails={openViewDetailsDialog}
                  onStatusUpdate={handleStatusUpdate}
                  onConfirm={handleConfirmAppointment}
                  onDecline={handleDeclineAppointment}
                  onDelete={handleDeleteAppointment}
                  copyToClipboard={copyToClipboard}
                  isWorker={false}
                />
              </TabPanel>

              <TabPanel value={activeTab} index={1}>
                <AppointmentTable 
                  appointments={appointments.filter(apt => apt.status === 'confirmed')} 
                  onEdit={openEditDialog}
                  onViewDetails={openViewDetailsDialog}
                  onStatusUpdate={handleStatusUpdate}
                  onConfirm={handleConfirmAppointment}
                  onDecline={handleDeclineAppointment}
                  onDelete={handleDeleteAppointment}
                  copyToClipboard={copyToClipboard}
                  isWorker={false}
                />
              </TabPanel>

              <TabPanel value={activeTab} index={2}>
                <AppointmentTable 
                  appointments={organizedAppointments.thisWeek} 
                  onEdit={openEditDialog}
                  onViewDetails={openViewDetailsDialog}
                  onStatusUpdate={handleStatusUpdate}
                  onConfirm={handleConfirmAppointment}
                  onDecline={handleDeclineAppointment}
                  onDelete={handleDeleteAppointment}
                  copyToClipboard={copyToClipboard}
                  isWorker={false}
                />
              </TabPanel>

              <TabPanel value={activeTab} index={3}>
                <AppointmentTable 
                  appointments={organizedAppointments.upcoming} 
                  onEdit={openEditDialog}
                  onViewDetails={openViewDetailsDialog}
                  onStatusUpdate={handleStatusUpdate}
                  onConfirm={handleConfirmAppointment}
                  onDecline={handleDeclineAppointment}
                  onDelete={handleDeleteAppointment}
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
                        if (selectedCase?.worker?._id) {
                          setCaseAndWorker(e.target.value, selectedCase.worker._id);
                        } else {
                          setField('case', e.target.value);
                        }
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
                      onChange={(e) => setField('appointmentType', e.target.value)}
                    >
                      {Object.entries(APPOINTMENT_TYPE_LABELS).map(([value, label]) => (
                        <MenuItem key={value} value={value}>{label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                  <TextField
                    fullWidth
                    label="Scheduled Date & Time"
                    type="datetime-local"
                    value={formData.scheduledDate}
                    onChange={(e) => setField('scheduledDate', e.target.value)}
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
                    onChange={(e) => setField('duration', parseInt(e.target.value) || DURATION_LIMITS.DEFAULT)}
                    inputProps={{ min: DURATION_LIMITS.MIN, max: DURATION_LIMITS.MAX }}
                  />
                </Box>

                <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
                  <FormControl fullWidth>
                    <InputLabel>Location</InputLabel>
                    <Select
                      value={formData.location}
                      onChange={(e) => setField('location', e.target.value)}
                    >
                      {Object.entries(LOCATION_LABELS).map(([value, label]) => (
                        <MenuItem key={value} value={value}>{label}</MenuItem>
                      ))}
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
                    onChange={(e) => setField('purpose', e.target.value)}
                  />
                </Box>

                <Box sx={{ flex: '1 1 100%', minWidth: '100%' }}>
                  <TextField
                    fullWidth
                    label="Notes"
                    multiline
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setField('notes', e.target.value)}
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

        {/* View Details Dialog */}
        <Dialog 
          open={viewDetailsOpen} 
          onClose={() => setViewDetailsOpen(false)} 
          maxWidth="md" 
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 2,
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
            }
          }}
        >
          <DialogTitle sx={{ 
            pb: 1,
            background: 'linear-gradient(135deg, #7B68EE 0%, #20B2AA 100%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}>
            <Box sx={{
              width: 40,
              height: 40,
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)'
            }}>
              <Event sx={{ fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                Appointment Details
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {selectedAppointment?.appointmentType?.replace('_', ' ').toUpperCase()} APPOINTMENT
              </Typography>
            </Box>
          </DialogTitle>
          
          <DialogContent sx={{ p: 3 }}>
            {selectedAppointment && (
              <Box>
                {/* Status and Basic Info */}
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Chip
                      icon={getStatusIcon(selectedAppointment.status)}
                      label={selectedAppointment.status.replace('_', ' ').toUpperCase()}
                      color={getStatusColor(selectedAppointment.status)}
                      sx={{ fontWeight: 600 }}
                    />
                    <Chip
                      label={selectedAppointment.appointmentType.replace('_', ' ').toUpperCase()}
                      variant="outlined"
                      sx={{ fontWeight: 500 }}
                    />
                  </Box>
                  
                  <Box sx={{ 
                    p: 2, 
                    backgroundColor: '#f8f9fa', 
                    borderRadius: 2,
                    border: '1px solid #e9ecef'
                  }}>
                    <Typography variant="h6" sx={{ mb: 2, color: '#1a1a1a', fontWeight: 600 }}>
                      📅 Schedule Information
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Date & Time
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {formatDate(selectedAppointment.scheduledDate)} at {formatTime(selectedAppointment.scheduledDate)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Duration
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {selectedAppointment.duration} minutes
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Location
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getLocationIcon(selectedAppointment.location)}
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {(selectedAppointment.location?.charAt?.(0) || '').toUpperCase() + (selectedAppointment.location?.slice?.(1) || selectedAppointment.location || '')}
                          </Typography>
                        </Box>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Created
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {formatDate(selectedAppointment.createdAt)}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>

                {/* Patient/Worker Information */}
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ 
                    p: 2, 
                    backgroundColor: '#f0f9ff', 
                    borderRadius: 2,
                    border: '1px solid #bae6fd'
                  }}>
                    <Typography variant="h6" sx={{ mb: 2, color: '#1a1a1a', fontWeight: 600 }}>
                      👤 Patient Information
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Avatar sx={{ width: 48, height: 48, fontSize: '1.2rem' }}>
                        {((selectedAppointment.worker?.firstName || selectedAppointment.case?.worker?.firstName || '?') as string).charAt(0)}
                        {((selectedAppointment.worker?.lastName || selectedAppointment.case?.worker?.lastName || '') as string).charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {selectedAppointment.worker?.firstName || selectedAppointment.case?.worker?.firstName || 'Unknown'} {selectedAppointment.worker?.lastName || selectedAppointment.case?.worker?.lastName || ''}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Case: {selectedAppointment.case?.caseNumber || 'N/A'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Email: {selectedAppointment.worker?.email || selectedAppointment.case?.worker?.email || 'N/A'}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>

                {/* Clinician Information */}
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ 
                    p: 2, 
                    backgroundColor: '#f0fdf4', 
                    borderRadius: 2,
                    border: '1px solid #bbf7d0'
                  }}>
                    <Typography variant="h6" sx={{ mb: 2, color: '#1a1a1a', fontWeight: 600 }}>
                      🩺 Clinician Information
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ width: 48, height: 48, fontSize: '1.2rem' }}>
                        {(selectedAppointment.clinician?.firstName || '?')?.charAt(0)}{(selectedAppointment.clinician?.lastName || '')?.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {selectedAppointment.clinician?.firstName} {selectedAppointment.clinician?.lastName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Email: {selectedAppointment.clinician?.email || 'N/A'}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>

                {/* Purpose and Notes */}
                {(selectedAppointment.purpose || selectedAppointment.notes) && (
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ 
                      p: 2, 
                      backgroundColor: '#fefce8', 
                      borderRadius: 2,
                      border: '1px solid #fde047'
                    }}>
                      <Typography variant="h6" sx={{ mb: 2, color: '#1a1a1a', fontWeight: 600 }}>
                        📝 Appointment Details
                      </Typography>
                      {selectedAppointment.purpose && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            Purpose
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {selectedAppointment.purpose}
                          </Typography>
                        </Box>
                      )}
                      {selectedAppointment.notes && (
                        <Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            Notes
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {selectedAppointment.notes}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                )}

                {/* Telehealth Information */}
                {selectedAppointment.location === 'telehealth' && selectedAppointment.telehealthInfo && (
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ 
                      p: 2, 
                      backgroundColor: '#f0f4ff', 
                      borderRadius: 2,
                      border: '1px solid #c7d2fe'
                    }}>
                      <Typography variant="h6" sx={{ mb: 2, color: '#1a1a1a', fontWeight: 600 }}>
                        💻 Telehealth Information
                      </Typography>
                      
                      {selectedAppointment.telehealthInfo.zoomMeeting && (
                        <Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Zoom Meeting Details
                          </Typography>
                          <Box sx={{ 
                            p: 2, 
                            backgroundColor: 'white', 
                            borderRadius: 1,
                            border: '1px solid #e5e7eb'
                          }}>
                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
                              <Box>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                  Meeting Topic
                                </Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                  {selectedAppointment.telehealthInfo.zoomMeeting.topic}
                                </Typography>
                              </Box>
                              <Box>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                  Meeting ID
                                </Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
                                  {selectedAppointment.telehealthInfo.zoomMeeting.meetingId}
                                </Typography>
                              </Box>
                              <Box>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                  Password
                                </Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
                                  {selectedAppointment.telehealthInfo.zoomMeeting.password}
                                </Typography>
                              </Box>
                              <Box>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                  Status
                                </Typography>
                                <Chip 
                                  label={selectedAppointment.telehealthInfo.zoomMeeting.status.toUpperCase()}
                                  color={selectedAppointment.telehealthInfo.zoomMeeting.status === 'active' ? 'success' : 'default'}
                                  size="small"
                                />
                              </Box>
                            </Box>
                            
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              <Button
                                variant="contained"
                                startIcon={<VideoCall />}
                                onClick={() => window.open(selectedAppointment.telehealthInfo!.zoomMeeting!.joinUrl, '_blank')}
                                sx={{ 
                                  backgroundColor: '#2D8CFF',
                                  '&:hover': { backgroundColor: '#1e6bb8' }
                                }}
                              >
                                Join Meeting
                              </Button>
                              <Button
                                variant="outlined"
                                startIcon={<ContentCopy />}
                                onClick={() => copyToClipboard(selectedAppointment.telehealthInfo!.zoomMeeting!.joinUrl)}
                              >
                                Copy Link
                              </Button>
                            </Box>
                          </Box>
                        </Box>
                      )}
                      
                      {selectedAppointment.telehealthInfo.instructions && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            Instructions
                          </Typography>
                          <Typography variant="body1">
                            {selectedAppointment.telehealthInfo.instructions}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                )}

                {/* Timestamps */}
                <Box sx={{ 
                  p: 2, 
                  backgroundColor: '#f9fafb', 
                  borderRadius: 2,
                  border: '1px solid #e5e7eb'
                }}>
                  <Typography variant="h6" sx={{ mb: 2, color: '#1a1a1a', fontWeight: 600 }}>
                    ⏰ Timestamps
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Created
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {new Date(selectedAppointment.createdAt).toLocaleString()}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Last Updated
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {new Date(selectedAppointment.updatedAt).toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            )}
          </DialogContent>
          
          <DialogActions sx={{ p: 3, pt: 1 }}>
            <Button 
              onClick={() => setViewDetailsOpen(false)}
              sx={{ 
                color: '#6b7280',
                '&:hover': { backgroundColor: '#f3f4f6' }
              }}
            >
              Close
            </Button>
            {selectedAppointment && !isWorker && (
              <>
                <Button 
                  variant="outlined"
                  startIcon={<Edit />}
                  onClick={() => {
                    setViewDetailsOpen(false);
                    openEditDialog(selectedAppointment);
                  }}
                  sx={{ 
                    borderColor: '#7B68EE',
                    color: '#7B68EE',
                    '&:hover': { 
                      borderColor: '#7B68EE',
                      backgroundColor: 'rgba(123, 104, 238, 0.04)'
                    }
                  }}
                >
                  Edit Appointment
                </Button>
                {selectedAppointment.location === 'telehealth' && selectedAppointment.telehealthInfo?.zoomMeeting && (
                  <Button 
                    variant="contained"
                    startIcon={<VideoCall />}
                    onClick={() => window.open(selectedAppointment!.telehealthInfo!.zoomMeeting!.joinUrl, '_blank')}
                    sx={{ 
                      backgroundColor: '#2D8CFF',
                      '&:hover': { backgroundColor: '#1e6bb8' }
                    }}
                  >
                    Start Meeting
                  </Button>
                )}
              </>
            )}
          </DialogActions>
        </Dialog>
        
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
            sx={{
              '& .MuiPaginationItem-root': {
                color: '#6b7280',
                border: '1px solid #e5e7eb',
                backgroundColor: 'white',
                '&:hover': {
                  backgroundColor: '#f3f4f6',
                  borderColor: '#d1d5db'
                },
                '&.Mui-selected': {
                  backgroundColor: '#374151',
                  color: 'white',
                  borderColor: '#374151',
                  '&:hover': {
                    backgroundColor: '#1f2937'
                  }
                }
              }
            }}
          />
        </Box>
      </Box>
    </LayoutWithSidebar>
  );
});

Appointments.displayName = 'Appointments';

export default Appointments;
