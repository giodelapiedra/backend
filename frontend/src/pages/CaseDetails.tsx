import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Button,
  Chip,
  Grid,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  IconButton,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext.supabase';
import {
  ArrowBack,
  Assignment,
  Person,
  CalendarToday,
  LocalHospital,
  Work,
  Warning,
  CheckCircle,
  Info,
  TrendingUp,
  TrendingDown,
  Edit,
  Close,
  Business,
  Assessment,
  Schedule,
  Timeline,
  Print,
} from '@mui/icons-material';
import LayoutWithSidebar from '../components/LayoutWithSidebar';
import { SupabaseAPI } from '../utils/supabaseApi';
import { createImageProps } from '../utils/imageUtils';

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
    dateOfInjury?: string;
  };
  workRestrictions?: {
    lifting?: {
      maxWeight?: number;
    };
    standing?: {
      maxDuration?: number;
    };
    other?: string;
  };
  createdAt: string;
  updatedAt?: string;
  expectedReturnDate?: string;
  actualReturnDate?: string;
  incident: {
    incidentNumber: string;
    incidentDate: string;
    description: string;
    severity: string;
    incidentType: string;
    photos?: Array<{
      url: string;
      caption: string;
      uploadedAt: string;
    }>;
  };
  caseManager: {
    firstName: string;
    lastName: string;
    email: string;
  };
  clinician?: {
    firstName: string;
    lastName: string;
    email: string;
    specialty?: string;
    phone?: string;
  };
  worker: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  employer?: {
    firstName: string;
    lastName: string;
    email: string;
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

const CaseDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Dialog states
  const [editDialog, setEditDialog] = useState(false);
  const [statusDialog, setStatusDialog] = useState(false);
  const [assignDialog, setAssignDialog] = useState(false);
  const [closeDialog, setCloseDialog] = useState(false);
  const [returnToWorkDialog, setReturnToWorkDialog] = useState(false);
  
  // Form states
  const [editForm, setEditForm] = useState({
    priority: '',
    injuryDetails: {
      bodyPart: '',
      injuryType: '',
      severity: '',
      description: ''
    },
    workRestrictions: {
      lifting: { maxWeight: 0 },
      standing: { maxDuration: 0 },
      other: ''
    },
    notes: ''
  });
  
  const [assignmentForm, setAssignmentForm] = useState({
    clinician: '',
    assignmentDate: '',
    notes: ''
  });
  
  const [clinicians, setClinicians] = useState<any[]>([]);
  const [loadingClinicians, setLoadingClinicians] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCaseDetails();
    }
  }, [id]);

  const fetchCaseDetails = async () => {
    try {
      setLoading(true);
      setError(null); // Clear any previous errors
      
      if (!id) {
        setError('Case ID is missing');
        return;
      }

      // Log the current user and request details
      console.log('Fetching case details:', {
        caseId: id,
        userRole: user?.role,
        userId: user?.id
      });

      const response = await SupabaseAPI.getCaseById(id);
      
      if (!response) {
        console.error('Empty response received');
        setError('No response received from server');
        return;
      }
      
      if (!response.case) {
        console.error('Invalid response format:', response);
        setError('Invalid response format from server');
        return;
      }
      
      // Log successful case fetch
      console.log('Case details fetched successfully:', {
        caseNumber: response.case.caseNumber,
        status: response.case.status,
        hasClinicianAssigned: !!response.case.clinician
      });
      
      setCaseData(response.case);
    } catch (err: any) {
      console.error('Error fetching case details:', {
        error: err,
        message: err.message,
        status: err.response?.status,
        data: err.response?.data
      });

      // Handle different error scenarios
      switch (err.response?.status) {
        case 401:
          setError('Your session has expired. Please log in again.');
          // Redirect will be handled by API interceptor
          break;
          
        case 403:
          setError('You do not have permission to view this case. Please contact your supervisor if you believe this is an error.');
          break;
          
        case 404:
          setError('Case not found. It may have been deleted or you may not have access to it.');
          break;
          
        case 500:
          // Try to extract more detailed error information
          const errorMessage = err.response?.data?.error || 
                              err.response?.data?.message || 
                              'A server error occurred. Our team has been notified and is working on it.';
          
          // Set a more descriptive error message
          setError(`Server error: ${errorMessage}. Please try again later or contact support.`);
          
          // Log additional debugging information
          console.error('Server error details:', {
            endpoint: `/cases/${id}`,
            user: user,
            timestamp: new Date().toISOString(),
            responseData: err.response?.data
          });
          break;
          
        default:
          if (!navigator.onLine) {
            setError('Unable to fetch case details. Please check your internet connection.');
          } else if (err.response?.data?.message) {
            setError(err.response.data.message);
          } else if (err.message) {
            setError(`Error: ${err.message}`);
          } else {
            setError('An unexpected error occurred. Please try again later.');
          }
      }
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

  const getPriorityColor = (priority: string) => {
    const colors: { [key: string]: any } = {
      'low': 'success',
      'medium': 'warning',
      'high': 'error',
      'urgent': 'error'
    };
    return colors[priority] || 'default';
  };

  const getPainLevelColor = (level: number) => {
    if (level >= 7) return '#dc2626'; // Red
    if (level >= 4) return '#f59e0b'; // Yellow
    return '#22c55e'; // Green
  };

  // Handler functions
  const handleEditCase = () => {
    if (caseData) {
      setEditForm({
        priority: caseData.priority,
        injuryDetails: { ...caseData.injuryDetails },
        workRestrictions: { 
          lifting: { maxWeight: caseData.workRestrictions?.lifting?.maxWeight || 0 },
          standing: { maxDuration: caseData.workRestrictions?.standing?.maxDuration || 0 },
          other: caseData.workRestrictions?.other || ''
        },
        notes: ''
      });
      setEditDialog(true);
    }
  };

  const handleUpdateCase = async () => {
    try {
      // TODO: Migrate to Supabase
      console.log('Case update feature is being migrated to Supabase');
      throw new Error('Case update feature is temporarily unavailable during migration to Supabase');
      setSuccessMessage('Case updated successfully');
      setEditDialog(false);
      fetchCaseDetails(); // Refresh data
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update case');
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      // TODO: Migrate to Supabase
      console.log('Case status update feature is being migrated to Supabase');
      throw new Error('Case status update feature is temporarily unavailable during migration to Supabase');
      setSuccessMessage(`Case status updated to ${newStatus}`);
      setStatusDialog(false);
      fetchCaseDetails(); // Refresh data
    } catch (err: any) {
      console.error('Error updating status:', err);
      setError(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleAssignClinician = async () => {
    try {
      // TODO: Migrate to Supabase
      console.log('Case assignment feature is being migrated to Supabase');
      throw new Error('Case assignment feature is temporarily unavailable during migration to Supabase');
      setSuccessMessage('Clinician assigned successfully');
      setAssignDialog(false);
      fetchCaseDetails(); // Refresh data
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to assign clinician');
    }
  };

  const handleCloseCase = async () => {
    try {
      // TODO: Migrate to Supabase
      console.log('Case close feature is being migrated to Supabase');
      throw new Error('Case close feature is temporarily unavailable during migration to Supabase');
      setSuccessMessage('Case closed successfully');
      setCloseDialog(false);
      fetchCaseDetails(); // Refresh data
    } catch (err: any) {
      console.error('Error closing case:', err);
      setError(err.response?.data?.message || 'Failed to close case');
    }
  };

  const handleReturnToWork = async () => {
    try {
      // TODO: Migrate to Supabase
      console.log('Return to work feature is being migrated to Supabase');
      throw new Error('Return to work feature is temporarily unavailable during migration to Supabase');
      setSuccessMessage('Worker returned to work successfully');
      setReturnToWorkDialog(false);
      fetchCaseDetails(); // Refresh data
    } catch (err: any) {
      console.error('Error updating return to work status:', err);
      setError(err.response?.data?.message || 'Failed to update status');
    }
  };

  // Handle print functionality
  const handlePrint = () => {
    // Create a new window for printing - updated with null checks
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    if (!printWindow) {
      alert('Please allow popups to print the case details');
      return;
    }

    // Create professional print layout
    const printContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Case Details - ${caseData?.caseNumber}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            line-height: 1.6;
            color: #333;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #1976d2;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .case-number {
            font-size: 24px;
            font-weight: bold;
            color: #1976d2;
            margin-bottom: 10px;
          }
          .section {
            margin-bottom: 25px;
            page-break-inside: avoid;
          }
          .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #1976d2;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
            margin-bottom: 15px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 15px;
          }
          .info-item {
            margin-bottom: 10px;
          }
          .label {
            font-weight: bold;
            color: #555;
            display: inline-block;
            min-width: 150px;
          }
          .value {
            color: #333;
          }
          .status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 16px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
          }
          .status.new { background-color: #e3f2fd; color: #1976d2; }
          .status.triaged { background-color: #f3e5f5; color: #7b1fa2; }
          .status.assessed { background-color: #e8f5e8; color: #388e3c; }
          .status.in_rehab { background-color: #fff3e0; color: #f57c00; }
          .status.return_to_work { background-color: #e0f2f1; color: #00796b; }
          .status.closed { background-color: #fafafa; color: #616161; }
          .priority {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 16px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
          }
          .priority.low { background-color: #e8f5e8; color: #388e3c; }
          .priority.medium { background-color: #fff3e0; color: #f57c00; }
          .priority.high { background-color: #ffebee; color: #d32f2f; }
          .priority.urgent { background-color: #f3e5f5; color: #7b1fa2; }
          .table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          .table th, .table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          .table th {
            background-color: #f5f5f5;
            font-weight: bold;
          }
          .notes-section {
            margin-top: 20px;
          }
          .note-item {
            background-color: #f9f9f9;
            padding: 10px;
            margin-bottom: 10px;
            border-left: 4px solid #1976d2;
          }
          .note-author {
            font-weight: bold;
            color: #1976d2;
          }
          .note-date {
            font-size: 12px;
            color: #666;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="case-number">Case: ${caseData?.caseNumber || 'N/A'}</div>
          <div>Occupational Rehabilitation Case Report</div>
          <div style="font-size: 14px; color: #666;">Generated on: ${new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</div>
        </div>

        <div class="section">
          <div class="section-title">Case Information</div>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Status:</span>
              <span class="status ${caseData?.status || ''}">${caseData?.status?.replace('_', ' ').toUpperCase() || 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="label">Priority:</span>
              <span class="priority ${caseData?.priority || ''}">${caseData?.priority?.toUpperCase() || 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="label">Created:</span>
              <span class="value">${caseData?.createdAt ? new Date(caseData.createdAt).toLocaleDateString() : 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="label">Last Updated:</span>
              <span class="value">${caseData?.updatedAt ? new Date(caseData.updatedAt).toLocaleDateString() : 'N/A'}</span>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Worker Information</div>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Name:</span>
              <span class="value">${caseData?.worker?.firstName || ''} ${caseData?.worker?.lastName || ''}</span>
            </div>
            <div class="info-item">
              <span class="label">Email:</span>
              <span class="value">${caseData?.worker?.email || 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="label">Phone:</span>
              <span class="value">${caseData?.worker?.phone || 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="label">Employer:</span>
              <span class="value">${caseData?.employer?.firstName || ''} ${caseData?.employer?.lastName || ''}</span>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Injury Details</div>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Body Part:</span>
              <span class="value">${caseData?.injuryDetails?.bodyPart || 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="label">Injury Type:</span>
              <span class="value">${caseData?.injuryDetails?.injuryType || 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="label">Severity:</span>
              <span class="value">${caseData?.injuryDetails?.severity || 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="label">Date of Injury:</span>
              <span class="value">${caseData?.injuryDetails?.dateOfInjury ? new Date(caseData.injuryDetails.dateOfInjury).toLocaleDateString() : 'N/A'}</span>
            </div>
          </div>
          ${caseData?.injuryDetails?.description ? `
            <div class="info-item">
              <span class="label">Description:</span>
              <div class="value">${caseData.injuryDetails.description}</div>
            </div>
          ` : ''}
        </div>

        ${caseData?.workRestrictions && (caseData.workRestrictions?.lifting?.maxWeight || caseData.workRestrictions?.standing?.maxDuration || caseData.workRestrictions?.other) ? `
        <div class="section">
          <div class="section-title">Work Restrictions</div>
          <table class="table">
            <thead>
              <tr>
                <th>Activity</th>
                <th>Restriction</th>
              </tr>
            </thead>
            <tbody>
              ${caseData.workRestrictions?.lifting?.maxWeight ? `
              <tr>
                <td>Lifting</td>
                <td>Max ${caseData.workRestrictions?.lifting?.maxWeight} lbs</td>
              </tr>
              ` : ''}
              ${caseData.workRestrictions?.standing?.maxDuration ? `
              <tr>
                <td>Standing</td>
                <td>Max ${caseData.workRestrictions?.standing?.maxDuration} minutes</td>
              </tr>
              ` : ''}
              ${caseData.workRestrictions?.other ? `
              <tr>
                <td>Other</td>
                <td>${caseData.workRestrictions?.other}</td>
              </tr>
              ` : ''}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${caseData?.clinician ? `
        <div class="section">
          <div class="section-title">Assigned Clinician</div>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Name:</span>
              <span class="value">${caseData.clinician.firstName} ${caseData.clinician.lastName}</span>
            </div>
            <div class="info-item">
              <span class="label">Specialty:</span>
              <span class="value">${caseData.clinician.specialty || 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="label">Email:</span>
              <span class="value">${caseData.clinician.email}</span>
            </div>
            <div class="info-item">
              <span class="label">Phone:</span>
              <span class="value">${caseData.clinician.phone || 'N/A'}</span>
            </div>
          </div>
        </div>
        ` : ''}

        ${caseData?.expectedReturnDate || caseData?.actualReturnDate ? `
        <div class="section">
          <div class="section-title">Return to Work</div>
          <div class="info-grid">
            ${caseData.expectedReturnDate ? `
            <div class="info-item">
              <span class="label">Expected Return Date:</span>
              <span class="value">${new Date(caseData.expectedReturnDate).toLocaleDateString()}</span>
            </div>
            ` : ''}
            ${caseData.actualReturnDate ? `
            <div class="info-item">
              <span class="label">Actual Return Date:</span>
              <span class="value">${new Date(caseData.actualReturnDate).toLocaleDateString()}</span>
            </div>
            ` : ''}
          </div>
        </div>
        ` : ''}

        ${caseData?.notes && caseData.notes.length > 0 ? `
        <div class="section">
          <div class="section-title">Case Notes</div>
          <div class="notes-section">
            ${caseData.notes.map(note => `
              <div class="note-item">
                <div class="note-author">${note.author?.firstName || 'Unknown'} ${note.author?.lastName || ''}</div>
                <div class="note-date">${note.timestamp ? new Date(note.timestamp).toLocaleDateString() : ''}</div>
                <div class="note-content">${note.content || ''}</div>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        <div class="footer">
          <div>This document was generated from the Occupational Rehabilitation Management System</div>
          <div>Case URL: ${window.location.origin}/cases/${caseData?._id}</div>
        </div>
      </body>
      </html>
    `;

    // Write content to print window
    printWindow.document.write(printContent);
    printWindow.document.close();

    // Wait for content to load, then print
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  };

  const fetchClinicians = async () => {
    try {
      setLoadingClinicians(true);
      // TODO: Migrate to Supabase
      console.log('Clinician fetch feature is being migrated to Supabase');
      throw new Error('Clinician fetch feature is temporarily unavailable during migration to Supabase');
      setClinicians([]);
    } catch (err: any) {
      console.error('Error fetching clinicians:', err);
    } finally {
      setLoadingClinicians(false);
    }
  };

  const canEditCase = () => {
    return user?.role === 'case_manager'; // Removed admin role
  };

  const canAssignClinician = () => {
    return user?.role === 'case_manager'; // Removed admin role
  };

  const canUpdateStatus = () => {
    return user?.role === 'case_manager' || user?.role === 'clinician'; // Removed admin role
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

  if (error) {
    return (
      <LayoutWithSidebar>
        <Box sx={{ p: 3 }}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 3, 
              mb: 3, 
              borderRadius: 2,
              backgroundColor: '#FEF2F2',
              border: '1px solid #FEE2E2',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <Warning sx={{ 
                color: '#DC2626',
                fontSize: '2rem',
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%': { opacity: 0.6 },
                  '50%': { opacity: 1 },
                  '100%': { opacity: 0.6 }
                }
              }} />
              <Box>
                <Typography 
                  variant="h6" 
                  color="#991B1B" 
                  gutterBottom
                  sx={{ 
                    fontWeight: 600,
                    fontSize: '1.25rem',
                    mb: 1
                  }}
                >
                  Unable to Load Case Details
                </Typography>
                <Typography 
                  color="#991B1B"
                  sx={{ 
                    mb: 2,
                    fontSize: '1rem',
                    lineHeight: 1.5
                  }}
                >
                  {error}
                </Typography>
                <Typography 
                  variant="body2" 
                  color="#991B1B" 
                  sx={{ 
                    opacity: 0.8,
                    fontSize: '0.875rem',
                    mt: 1
                  }}
                >
                  If this issue persists, please contact your system administrator or try refreshing the page.
                </Typography>
              </Box>
            </Box>
          </Paper>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<ArrowBack />}
              onClick={() => navigate('/cases')}
              sx={{ 
                backgroundColor: '#1E40AF',
                '&:hover': {
                  backgroundColor: '#1E3A8A',
                  transform: 'translateY(-1px)'
                },
                transition: 'all 0.2s',
                boxShadow: '0 2px 4px rgba(30, 64, 175, 0.2)',
                fontWeight: 600
              }}
            >
              Return to Cases List
            </Button>
            
            <Button
              variant="outlined"
              onClick={() => window.location.reload()}
              sx={{ 
                borderColor: '#1E40AF',
                color: '#1E40AF',
                '&:hover': {
                  borderColor: '#1E3A8A',
                  backgroundColor: 'rgba(30, 64, 175, 0.04)',
                  transform: 'translateY(-1px)'
                },
                transition: 'all 0.2s',
                fontWeight: 600
              }}
            >
              Refresh Page
            </Button>
          </Box>
        </Box>
      </LayoutWithSidebar>
    );
  }

  if (!caseData) {
    return (
      <LayoutWithSidebar>
        <Box sx={{ p: 3 }}>
          <Alert severity="warning" sx={{ mb: 3 }}>
            Case not found
          </Alert>
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => navigate('/cases')}
          >
            Back to Cases
          </Button>
        </Box>
      </LayoutWithSidebar>
    );
  }

  return (
    <LayoutWithSidebar>
      <Box sx={{ 
        p: { xs: 2, sm: 3 }, 
        maxWidth: '1600px', 
        mx: 'auto'
      }}>
        {/* Header Section */}
        <Paper 
          elevation={0} 
          sx={{ 
            mb: 4, 
            borderRadius: '12px', 
            overflow: 'hidden',
            border: '1px solid #e5e7eb',
            background: 'linear-gradient(135deg, #f9fafb, #f3f4f6)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
          }}
        >
          {/* Top Navigation Bar */}
          <Box sx={{ 
            p: { xs: 2, sm: 3 }, 
            borderBottom: '1px solid #e5e7eb', 
            display: 'flex', 
            alignItems: 'center' 
          }}>
              <Button
                variant="outlined"
                startIcon={<ArrowBack />}
                onClick={() => navigate('/cases')}
                sx={{ 
                  borderRadius: '8px',
                  borderColor: '#d1d5db',
                  color: '#4b5563',
                  fontWeight: 600,
                  px: 2,
                  py: 1,
                  '&:hover': {
                    borderColor: '#9ca3af',
                    backgroundColor: 'rgba(156, 163, 175, 0.08)',
                    transform: 'translateY(-1px)'
                  },
                  transition: 'all 0.2s'
                }}
            >
              Back to Cases
            </Button>
            
            <Divider orientation="vertical" flexItem sx={{ mx: 2, height: '24px', my: 'auto' }} />
            
            <Chip 
              label={caseData.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
              color={getStatusColor(caseData.status)}
              size="small"
              sx={{ 
                fontWeight: 600, 
                borderRadius: '6px', 
                fontSize: '0.75rem',
                px: 1,
                height: '24px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                '& .MuiChip-label': {
                  px: 1
                }
              }}
            />
            
            <Box sx={{ flexGrow: 1 }} />
            
            <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
              Created: {caseData.createdAt ? new Date(caseData.createdAt).toLocaleDateString() : 'N/A'}
            </Typography>
          </Box>
          
          {/* Title and Actions */}
          <Box sx={{ 
            p: { xs: 2, sm: 3 },
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between', 
            alignItems: { xs: 'flex-start', md: 'center' },
            gap: { xs: 2, md: 0 }
          }}>
            <Box>
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 700, 
                  color: '#111827',
                  fontSize: { xs: '1.5rem', sm: '1.875rem', md: '2rem' },
                  mb: 0.5
                }}
              >
                Case: {caseData.caseNumber}
              </Typography>
              <Typography 
                variant="body1" 
                color="text.secondary"
                sx={{ 
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <Person fontSize="small" /> {caseData.worker?.firstName || 'Unknown'} {caseData.worker?.lastName || 'Worker'}
                <Chip 
                  label={caseData.priority?.toUpperCase() || 'UNKNOWN'}
                  color={getPriorityColor(caseData.priority)}
                  size="small"
                  variant="outlined"
                  sx={{ 
                    fontWeight: 600, 
                    fontSize: '0.7rem',
                    height: '20px',
                    ml: 1
                  }}
                />
              </Typography>
            </Box>
            
            {/* Action Buttons */}
            <Box sx={{ 
              display: 'flex', 
              gap: 1, 
              flexWrap: 'wrap',
              justifyContent: { xs: 'flex-start', sm: 'flex-end' },
              width: { xs: '100%', md: 'auto' }
            }}>
              {/* Print Button */}
              <Button
                variant="outlined"
                startIcon={<Print />}
                onClick={handlePrint}
                size="small"
                sx={{ 
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontWeight: 600,
                  borderColor: '#10b981',
                  color: '#059669',
                  '&:hover': {
                    borderColor: '#047857',
                    backgroundColor: 'rgba(16, 185, 129, 0.04)'
                  }
                }}
              >
                Print
              </Button>

              {canEditCase() && (
                <Button
                  variant="outlined"
                  startIcon={<Edit />}
                  onClick={handleEditCase}
                  size="small"
                  sx={{ 
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontWeight: 600,
                    borderColor: '#d1d5db',
                    color: '#4b5563',
                    '&:hover': {
                      borderColor: '#9ca3af',
                      backgroundColor: 'rgba(156, 163, 175, 0.04)'
                    }
                  }}
                >
                  Edit Case
                </Button>
              )}
              
              {canAssignClinician() && !caseData.clinician && (
                <Button
                  variant="outlined"
                  startIcon={<LocalHospital />}
                  onClick={() => {
                    fetchClinicians();
                    setAssignDialog(true);
                  }}
                  size="small"
                  sx={{ 
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontWeight: 600,
                    borderColor: '#818cf8',
                    color: '#4f46e5',
                    '&:hover': {
                      borderColor: '#6366f1',
                      backgroundColor: 'rgba(99, 102, 241, 0.04)'
                    }
                  }}
                >
                  Assign Clinician
                </Button>
              )}
              
              {canUpdateStatus() && (
                <Button
                  variant="outlined"
                  startIcon={<Timeline />}
                  onClick={() => setStatusDialog(true)}
                  size="small"
                  sx={{ 
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontWeight: 600,
                    borderColor: '#60a5fa',
                    color: '#2563eb',
                    '&:hover': {
                      borderColor: '#3b82f6',
                      backgroundColor: 'rgba(59, 130, 246, 0.04)'
                    }
                  }}
                >
                  Update Status
                </Button>
              )}
              
              {canUpdateStatus() && caseData.status !== 'closed' && (
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<Close />}
                  onClick={() => setCloseDialog(true)}
                  size="small"
                  sx={{ 
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontWeight: 600,
                    boxShadow: 'none',
                    '&:hover': {
                      boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)'
                    }
                  }}
                >
                  Close Case
                </Button>
              )}
              
              {canUpdateStatus() && caseData.status === 'in_rehab' && (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<Business />}
                  onClick={() => setReturnToWorkDialog(true)}
                  size="small"
                  sx={{ 
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontWeight: 600,
                    boxShadow: 'none',
                    '&:hover': {
                      boxShadow: '0 2px 4px rgba(34, 197, 94, 0.2)'
                    }
                  }}
                >
                  Return to Work
                </Button>
              )}
            </Box>
          </Box>
        </Paper>
        
        {/* Success/Error Messages */}
        {successMessage && (
          <Alert 
            severity="success" 
            sx={{ 
              mb: 3, 
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }} 
            onClose={() => setSuccessMessage(null)}
          >
            {successMessage}
          </Alert>
        )}
        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3, 
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }} 
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {/* Case Progress Timeline */}
        <Paper 
          elevation={0}
          sx={{ 
            mb: 4, 
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            overflow: 'hidden'
          }}
        >
          <Box sx={{ 
            p: { xs: 2, sm: 3 }, 
            borderBottom: '1px solid #e5e7eb',
            bgcolor: '#f9fafb'
          }}>
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 600, 
                color: '#111827',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <Timeline fontSize="small" /> Case Progress
            </Typography>
          </Box>
          
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'relative',
              pb: 1,
              px: { xs: 1, sm: 3 }
            }}>
              {/* Progress Bar */}
              <Box sx={{ 
                position: 'absolute',
                height: '4px',
                bgcolor: '#e5e7eb',
                left: '12%',
                right: '12%',
                top: '22px',
                zIndex: 0
              }} />
              
              {/* Status Steps */}
              {['new', 'triaged', 'assessed', 'in_rehab', 'return_to_work', 'closed'].map((status, index) => {
                const isActive = ['new', 'triaged', 'assessed', 'in_rehab', 'return_to_work', 'closed']
                  .indexOf(caseData.status) >= index;
                const isCurrent = caseData.status === status;
                
                return (
                  <Box 
                    key={status}
                    sx={{ 
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      position: 'relative',
                      zIndex: 1,
                      width: { xs: '16.66%', sm: '16.66%' }
                    }}
                  >
                    <Avatar 
                      sx={{ 
                        width: 44,
                        height: 44,
                        bgcolor: isActive ? 
                          (isCurrent ? '#3b82f6' : '#10b981') : 
                          '#e5e7eb',
                        color: isActive ? 'white' : '#9ca3af',
                        border: isCurrent ? '2px solid #60a5fa' : 'none',
                        boxShadow: isCurrent ? '0 0 0 4px rgba(59, 130, 246, 0.2)' : 'none'
                      }}
                    >
                      {status === 'new' && <Assignment />}
                      {status === 'triaged' && <TrendingUp />}
                      {status === 'assessed' && <LocalHospital />}
                      {status === 'in_rehab' && <Work />}
                      {status === 'return_to_work' && <CheckCircle />}
                      {status === 'closed' && <Close />}
                    </Avatar>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        mt: 1,
                        fontWeight: isCurrent ? 700 : 500,
                        color: isCurrent ? '#111827' : (isActive ? '#374151' : '#9ca3af'),
                        textAlign: 'center',
                        fontSize: '0.7rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        display: { xs: 'none', sm: 'block' }
                      }}
                    >
                      {status.replace('_', ' ')}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Paper>
        
        {/* Case Info Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              elevation={0}
              sx={{ 
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                height: '100%',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <Avatar 
                    sx={{ 
                      bgcolor: 'rgba(59, 130, 246, 0.1)', 
                      color: '#3b82f6',
                      mr: 2,
                      width: 48,
                      height: 48
                    }}
                  >
                    <Assignment />
                  </Avatar>
                  <Box>
                    <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
                      CASE NUMBER
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827' }}>
                      {caseData.caseNumber}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              elevation={0}
              sx={{ 
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                height: '100%',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <Avatar 
                    sx={{ 
                      bgcolor: 'rgba(16, 185, 129, 0.1)', 
                      color: '#10b981',
                      mr: 2,
                      width: 48,
                      height: 48
                    }}
                  >
                    <CheckCircle />
                  </Avatar>
                  <Box>
                    <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
                      STATUS
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Chip 
                        label={caseData.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                        color={getStatusColor(caseData.status)}
                        size="small"
                        sx={{ 
                          fontWeight: 600,
                          borderRadius: '6px',
                          fontSize: '0.75rem'
                        }}
                      />
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              elevation={0}
              sx={{ 
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                height: '100%',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <Avatar 
                    sx={{ 
                      bgcolor: 'rgba(245, 158, 11, 0.1)', 
                      color: '#f59e0b',
                      mr: 2,
                      width: 48,
                      height: 48
                    }}
                  >
                    <Warning />
                  </Avatar>
                  <Box>
                    <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
                      PRIORITY
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Chip 
                        label={caseData.priority?.toUpperCase() || 'UNKNOWN'}
                        color={getPriorityColor(caseData.priority)}
                        size="small"
                        sx={{ 
                          fontWeight: 600,
                          borderRadius: '6px',
                          fontSize: '0.75rem'
                        }}
                      />
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              elevation={0}
              sx={{ 
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                height: '100%',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <Avatar 
                    sx={{ 
                      bgcolor: 'rgba(139, 92, 246, 0.1)', 
                      color: '#8b5cf6',
                      mr: 2,
                      width: 48,
                      height: 48
                    }}
                  >
                    <CalendarToday />
                  </Avatar>
                  <Box>
                    <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
                      CREATED ON
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827' }}>
                      {caseData.createdAt ? new Date(caseData.createdAt).toLocaleDateString() : 'N/A'}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          {/* Worker Information */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{ 
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                overflow: 'hidden',
                height: '100%'
              }}
            >
              <Box sx={{ 
                p: { xs: 2, sm: 3 }, 
                borderBottom: '1px solid #e5e7eb',
                bgcolor: '#f9fafb',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <Avatar sx={{ bgcolor: '#3b82f6', width: 32, height: 32 }}>
                  <Person fontSize="small" />
                </Avatar>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 600, 
                    color: '#111827',
                    fontSize: '1rem'
                  }}
                >
                  Worker Information
                </Typography>
              </Box>
              
              <Box sx={{ p: { xs: 2, sm: 3 } }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  mb: 3,
                  pb: 3,
                  borderBottom: '1px dashed #e5e7eb'
                }}>
                  <Avatar 
                    sx={{ 
                      width: 64, 
                      height: 64, 
                      mr: 2,
                      bgcolor: '#3b82f6',
                      fontSize: '1.5rem',
                      fontWeight: 700,
                      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                      border: '3px solid #fff'
                    }}
                  >
                    {caseData.worker?.firstName?.[0] || '?'}{caseData.worker?.lastName?.[0] || '?'}
                  </Avatar>
                  <Box>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        fontWeight: 700, 
                        color: '#111827',
                        mb: 0.5
                      }}
                    >
                      {caseData.worker?.firstName || 'Unknown'} {caseData.worker?.lastName || 'Worker'}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Chip 
                        label="WORKER" 
                        size="small" 
                        sx={{ 
                          bgcolor: 'rgba(59, 130, 246, 0.1)', 
                          color: '#3b82f6',
                          fontWeight: 600,
                          fontSize: '0.7rem',
                          height: '20px'
                        }} 
                      />
                    </Box>
                  </Box>
                </Box>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ mb: 2 }}>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: '#6b7280', 
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          fontSize: '0.7rem'
                        }}
                      >
                        Email Address
                      </Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: '#111827',
                          fontWeight: 500,
                          mt: 0.5
                        }}
                      >
                        {caseData.worker?.email || 'N/A'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ mb: 2 }}>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: '#6b7280', 
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          fontSize: '0.7rem'
                        }}
                      >
                        Phone Number
                      </Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: '#111827',
                          fontWeight: 500,
                          mt: 0.5
                        }}
                      >
                        {caseData.worker?.phone || 'N/A'}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </Paper>
          </Grid>

          {/* Case Team */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{ 
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                overflow: 'hidden',
                height: '100%'
              }}
            >
              <Box sx={{ 
                p: { xs: 2, sm: 3 }, 
                borderBottom: '1px solid #e5e7eb',
                bgcolor: '#f9fafb',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <Avatar sx={{ bgcolor: '#8b5cf6', width: 32, height: 32 }}>
                  <LocalHospital fontSize="small" />
                </Avatar>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 600, 
                    color: '#111827',
                    fontSize: '1rem'
                  }}
                >
                  Case Team
                </Typography>
              </Box>
              
              <Box sx={{ p: { xs: 2, sm: 3 } }}>
                {/* Case Manager */}
                <Box sx={{ 
                  mb: 3, 
                  pb: 3,
                  borderBottom: caseData.clinician ? '1px dashed #e5e7eb' : 'none'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar 
                      sx={{ 
                        bgcolor: 'rgba(139, 92, 246, 0.1)', 
                        color: '#8b5cf6',
                        width: 40,
                        height: 40,
                        mr: 2
                      }}
                    >
                      <Person />
                    </Avatar>
                    <Box>
                      <Typography 
                        variant="subtitle1" 
                        sx={{ 
                          fontWeight: 600, 
                          color: '#111827'
                        }}
                      >
                        {caseData.caseManager?.firstName || 'Unknown'} {caseData.caseManager?.lastName || 'Manager'}
                      </Typography>
                      <Chip 
                        label="CASE MANAGER" 
                        size="small" 
                        sx={{ 
                          bgcolor: 'rgba(139, 92, 246, 0.1)', 
                          color: '#8b5cf6',
                          fontWeight: 600,
                          fontSize: '0.7rem',
                          height: '20px'
                        }} 
                      />
                    </Box>
                  </Box>
                  
                  <Box sx={{ pl: 7 }}>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: '#6b7280', 
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        fontSize: '0.7rem'
                      }}
                    >
                      Contact Information
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: '#111827',
                        fontWeight: 500,
                        mt: 0.5
                      }}
                    >
                      {caseData.caseManager?.email || 'N/A'}
                    </Typography>
                  </Box>
                </Box>
                
                {/* Clinician (if assigned) */}
                {caseData.clinician && (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar 
                        sx={{ 
                          bgcolor: 'rgba(16, 185, 129, 0.1)', 
                          color: '#10b981',
                          width: 40,
                          height: 40,
                          mr: 2
                        }}
                      >
                        <LocalHospital />
                      </Avatar>
                      <Box>
                        <Typography 
                          variant="subtitle1" 
                          sx={{ 
                            fontWeight: 600, 
                            color: '#111827'
                          }}
                        >
                          {caseData.clinician?.firstName || 'Not'} {caseData.clinician?.lastName || 'Assigned'}
                        </Typography>
                        <Chip 
                          label="CLINICIAN" 
                          size="small" 
                          sx={{ 
                            bgcolor: 'rgba(16, 185, 129, 0.1)', 
                            color: '#10b981',
                            fontWeight: 600,
                            fontSize: '0.7rem',
                            height: '20px'
                          }} 
                        />
                      </Box>
                    </Box>
                    
                    <Box sx={{ pl: 7 }}>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: '#6b7280', 
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          fontSize: '0.7rem'
                        }}
                      >
                        Contact Information
                      </Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: '#111827',
                          fontWeight: 500,
                          mt: 0.5
                        }}
                      >
                        {caseData.clinician?.email || 'N/A'}
                      </Typography>
                    </Box>
                  </Box>
                )}
                
                {!caseData.clinician && (
                  <Box sx={{ 
                    p: 3, 
                    bgcolor: 'rgba(249, 250, 251, 0.5)', 
                    border: '1px dashed #e5e7eb',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <Typography variant="body2" color="text.secondary">
                      No clinician has been assigned to this case yet.
                    </Typography>
                    {canAssignClinician() && (
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<LocalHospital />}
                        onClick={() => {
                          fetchClinicians();
                          setAssignDialog(true);
                        }}
                        sx={{ 
                          mt: 2,
                          borderRadius: '8px',
                          textTransform: 'none',
                          fontWeight: 600,
                          borderColor: '#818cf8',
                          color: '#4f46e5',
                        }}
                      >
                        Assign Clinician
                      </Button>
                    )}
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* Incident Information */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <Assignment sx={{ mr: 1 }} />
                  Incident Information
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">Incident Number</Typography>
                      <Typography variant="body1">{caseData.incident?.incidentNumber || 'N/A'}</Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">Incident Date</Typography>
                      <Typography variant="body1">
                        {caseData.incident?.incidentDate ? new Date(caseData.incident.incidentDate).toLocaleDateString() : 'N/A'}
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">Incident Type</Typography>
                      <Typography variant="body1">{caseData.incident?.incidentType || 'N/A'}</Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">Severity</Typography>
                      <Chip 
                        label={caseData.incident?.severity?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                        color={getPriorityColor(caseData.incident?.severity)}
                        size="small"
                      />
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">Description</Typography>
                      <Typography variant="body1">{caseData.incident?.description || 'No description available'}</Typography>
                    </Box>
                  </Grid>
                  
                  {/* Incident Photos */}
                  {caseData.incident?.photos && caseData.incident.photos.length > 0 && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                        Incident Photos ({caseData.incident.photos.length})
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        {caseData.incident.photos.map((photo, index) => (
                          <Box key={index} sx={{ position: 'relative' }}>
                            <img
                              {...createImageProps(photo.url)}
                              alt={photo.caption || `Incident photo ${index + 1}`}
                              style={{
                                width: 150,
                                height: 150,
                                objectFit: 'cover',
                                borderRadius: 8,
                                border: '2px solid #e2e8f0',
                                cursor: 'pointer'
                              }}
                              onClick={() => window.open(createImageProps(photo.url).src, '_blank')}
                            />
                            {photo.caption && (
                              <Typography variant="caption" sx={{ 
                                display: 'block', 
                                mt: 0.5, 
                                textAlign: 'center',
                                color: 'text.secondary',
                                fontSize: '0.7rem',
                                maxWidth: 150
                              }}>
                                {photo.caption}
                              </Typography>
                            )}
                          </Box>
                        ))}
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Injury Details */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <Warning sx={{ mr: 1 }} />
                  Injury Details
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">Body Part</Typography>
                  <Typography variant="body1">{caseData.injuryDetails?.bodyPart || 'N/A'}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">Injury Type</Typography>
                  <Typography variant="body1">{caseData.injuryDetails?.injuryType || 'N/A'}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">Severity</Typography>
                  <Typography variant="body1">{caseData.injuryDetails?.severity || 'N/A'}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Description</Typography>
                  <Typography variant="body1">{caseData.injuryDetails?.description || 'No description available'}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Work Restrictions */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <Work sx={{ mr: 1 }} />
                  Work Restrictions
                </Typography>
                {caseData.workRestrictions ? (
                  <>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">Lifting Limit</Typography>
                      <Typography variant="body1">
                        {caseData.workRestrictions?.lifting?.maxWeight || 0} kg
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">Standing Duration</Typography>
                      <Typography variant="body1">
                        {caseData.workRestrictions?.standing?.maxDuration || 0} minutes
                      </Typography>
                    </Box>
                    {caseData.workRestrictions?.other && (
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">Other Restrictions</Typography>
                        <Typography variant="body1">{caseData.workRestrictions?.other}</Typography>
                      </Box>
                    )}
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No work restrictions have been set for this case yet.
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Latest Check-in */}
          {caseData.lastCheckIn && (
            <Grid item xs={12}>
              <Card sx={{ 
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                borderRadius: '10px',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  transform: 'translateY(-2px)'
                }
              }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <TrendingUp sx={{ mr: 1 }} />
                    Latest Check-in
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="subtitle2" color="text.secondary">Pain Level</Typography>
                      <Typography 
                        variant="h4" 
                        sx={{ 
                          color: getPainLevelColor(caseData.lastCheckIn.painLevel.current),
                          fontWeight: 600
                        }}
                      >
                        {caseData.lastCheckIn.painLevel.current}/10
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="subtitle2" color="text.secondary">Work Status</Typography>
                      <Chip 
                        label={caseData.lastCheckIn.workStatus.workedToday ? 'Working' : 'Not Working'}
                        color={caseData.lastCheckIn.workStatus.workedToday ? 'success' : 'error'}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="subtitle2" color="text.secondary">Sleep Quality</Typography>
                      <Typography variant="h6">
                        {caseData.lastCheckIn.functionalStatus.sleep >= 7 ? 'Good' : 
                         caseData.lastCheckIn.functionalStatus.sleep >= 4 ? 'Fair' : 'Poor'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="subtitle2" color="text.secondary">Last Updated</Typography>
                      <Typography variant="body1">
                        {new Date(caseData.lastCheckIn.checkInDate).toLocaleString()}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Case Notes */}
          {caseData.notes && caseData.notes.length > 0 && (
            <Grid item xs={12}>
              <Card sx={{ 
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                borderRadius: '10px',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  transform: 'translateY(-2px)'
                }
              }}>
                <CardContent>
                  <Typography 
                  variant="h6" 
                  gutterBottom
                  sx={{
                    fontWeight: 700,
                    color: '#111827',
                    position: 'relative',
                    pb: 1,
                    mb: 2,
                    '&:after': {
                      content: '""',
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      width: '40px',
                      height: '3px',
                      borderRadius: '2px',
                      backgroundColor: '#3b82f6'
                    }
                  }}
                >
                  Case Notes
                </Typography>
                  <List>
                    {caseData.notes?.map((note, index) => (
                      <ListItem key={index} divider={index < (caseData.notes?.length || 0) - 1}>
                        <Box sx={{ width: '100%' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="subtitle2">
                              {note.author?.firstName || 'Unknown'} {note.author?.lastName || 'User'}
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
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>

        {/* Edit Case Dialog */}
        <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>Edit Case</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={editForm.priority}
                  onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                  label="Priority"
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="urgent">Urgent</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                fullWidth
                label="Body Part"
                value={editForm.injuryDetails.bodyPart}
                onChange={(e) => setEditForm({
                  ...editForm,
                  injuryDetails: { ...editForm.injuryDetails, bodyPart: e.target.value }
                })}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="Injury Type"
                value={editForm.injuryDetails.injuryType}
                onChange={(e) => setEditForm({
                  ...editForm,
                  injuryDetails: { ...editForm.injuryDetails, injuryType: e.target.value }
                })}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="Injury Description"
                multiline
                rows={3}
                value={editForm.injuryDetails.description}
                onChange={(e) => setEditForm({
                  ...editForm,
                  injuryDetails: { ...editForm.injuryDetails, description: e.target.value }
                })}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="Lifting Limit (kg)"
                type="number"
                value={editForm.workRestrictions.lifting.maxWeight}
                onChange={(e) => setEditForm({
                  ...editForm,
                  workRestrictions: {
                    ...editForm.workRestrictions,
                    lifting: { maxWeight: parseInt(e.target.value) || 0 }
                  }
                })}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="Standing Duration (minutes)"
                type="number"
                value={editForm.workRestrictions.standing.maxDuration}
                onChange={(e) => setEditForm({
                  ...editForm,
                  workRestrictions: {
                    ...editForm.workRestrictions,
                    standing: { maxDuration: parseInt(e.target.value) || 0 }
                  }
                })}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="Other Restrictions"
                multiline
                rows={2}
                value={editForm.workRestrictions.other}
                onChange={(e) => setEditForm({
                  ...editForm,
                  workRestrictions: { ...editForm.workRestrictions, other: e.target.value }
                })}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleUpdateCase} 
              variant="contained"
              sx={{ 
                borderRadius: '8px',
                px: 2,
                py: 1,
                fontWeight: 600,
                boxShadow: '0 4px 6px rgba(59, 130, 246, 0.2)',
                background: 'linear-gradient(45deg, #3b82f6, #60a5fa)',
                '&:hover': {
                  boxShadow: '0 6px 10px rgba(59, 130, 246, 0.3)',
                  background: 'linear-gradient(45deg, #2563eb, #3b82f6)'
                },
                transition: 'all 0.3s ease'
              }}
            >
              Update Case
            </Button>
          </DialogActions>
        </Dialog>

        {/* Status Update Dialog */}
        <Dialog open={statusDialog} onClose={() => setStatusDialog(false)}>
          <DialogTitle>Update Case Status</DialogTitle>
          <DialogContent>
            <Typography sx={{ mb: 2 }}>Select new status for this case:</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {caseData?.status !== 'triaged' && (
                <Button
                  variant="outlined"
                  color="warning"
                  onClick={() => handleUpdateStatus('triaged')}
                >
                  Mark as Triaged
                </Button>
              )}
              {caseData?.status !== 'assessed' && (
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => handleUpdateStatus('assessed')}
                >
                  Mark as Assessed
                </Button>
              )}
              {caseData?.status !== 'in_rehab' && (
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={() => handleUpdateStatus('in_rehab')}
                >
                  Start Rehabilitation
                </Button>
              )}
              {caseData?.status !== 'return_to_work' && (
                <Button
                  variant="outlined"
                  color="success"
                  onClick={() => handleUpdateStatus('return_to_work')}
                >
                  Return to Work
                </Button>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setStatusDialog(false)}>Cancel</Button>
          </DialogActions>
        </Dialog>

        {/* Assign Clinician Dialog */}
        <Dialog open={assignDialog} onClose={() => setAssignDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Assign Clinician</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Select Clinician</InputLabel>
                <Select
                  value={assignmentForm.clinician}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, clinician: e.target.value })}
                  label="Select Clinician"
                  disabled={loadingClinicians}
                >
                  {clinicians.map((clinician) => (
                    <MenuItem key={clinician._id} value={clinician._id}>
                      {clinician?.firstName || ''} {clinician?.lastName || ''} {clinician?.specialty ? `- ${clinician.specialty}` : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <TextField
                fullWidth
                label="Assignment Date"
                type="date"
                value={assignmentForm.assignmentDate}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, assignmentDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="Assignment Notes"
                multiline
                rows={3}
                value={assignmentForm.notes}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, notes: e.target.value })}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAssignDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleAssignClinician} 
              variant="contained"
              disabled={!assignmentForm.clinician || !assignmentForm.assignmentDate}
              sx={{ 
                borderRadius: '8px',
                px: 2,
                py: 1,
                fontWeight: 600,
                boxShadow: '0 4px 6px rgba(59, 130, 246, 0.2)',
                background: 'linear-gradient(45deg, #3b82f6, #60a5fa)',
                '&:hover': {
                  boxShadow: '0 6px 10px rgba(59, 130, 246, 0.3)',
                  background: 'linear-gradient(45deg, #2563eb, #3b82f6)'
                },
                transition: 'all 0.3s ease',
                '&:disabled': {
                  background: '#e5e7eb',
                  boxShadow: 'none'
                }
              }}
            >
              Assign Clinician
            </Button>
          </DialogActions>
        </Dialog>

        {/* Close Case Dialog */}
        <Dialog open={closeDialog} onClose={() => setCloseDialog(false)}>
          <DialogTitle>Close Case</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to close this case? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCloseDialog(false)}>Cancel</Button>
            <Button onClick={handleCloseCase} variant="contained" color="error">
              Close Case
            </Button>
          </DialogActions>
        </Dialog>

        {/* Return to Work Dialog */}
        <Dialog open={returnToWorkDialog} onClose={() => setReturnToWorkDialog(false)}>
          <DialogTitle>Return to Work</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to mark this worker as returned to work? This will change the case status.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setReturnToWorkDialog(false)}>Cancel</Button>
            <Button onClick={handleReturnToWork} variant="contained" color="success">
              Return to Work
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LayoutWithSidebar>
  );
};

export default CaseDetails;
