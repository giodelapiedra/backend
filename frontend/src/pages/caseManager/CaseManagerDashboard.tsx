import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  FormHelperText,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Avatar,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  LinearProgress,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add,
  Visibility,
  Edit,
  Assignment,
  CheckCircle,
  Warning,
  People,
  Assessment,
  LocalHospital,
  Work,
  Timeline,
  Refresh,
  CalendarToday,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext.supabase';
import LayoutWithSidebar from '../../components/LayoutWithSidebar';
import { SupabaseAPI } from '../../utils/supabaseApi';
import { createImageProps } from '../../utils/imageUtils';

interface User {
  _id: string;
  id?: string; // Some responses might use id instead of _id
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  specialty?: string;
  isActive: boolean;
  isAvailable?: boolean;
  availabilityReason?: string;
  lastAvailabilityUpdate?: string;
}

interface Clinician extends User {
  workload: {
    activeCases: number;
    appointmentsToday: number;
    appointmentsThisWeek: number;
    availabilityScore: number;
    availabilityStatus: 'available' | 'moderate' | 'busy';
  };
}

interface Incident {
  _id: string;
  id?: string; // Some responses might use id instead of _id
  incidentNumber: string;
  incidentDate: string;
  incidentType: string;
  severity: string;
  status: string;
  description: string;
  worker: User;
  employer: User;
  reportedBy: User;
  createdAt: string;
  injuryLocation?: string; // Optional field for body part/injury location
  injuryType?: string; // Optional field for specific injury type
  photos?: Array<{
    url: string;
    caption: string;
    uploadedAt: string;
  }>;
}

interface Case {
  _id: string;
  id?: string; // For Supabase compatibility
  caseNumber: string;
  case_number?: string; // For Supabase compatibility
  status: string;
  priority: string;
  worker: User;
  caseManager: User;
  case_manager_id?: string; // For Supabase compatibility
  clinician?: User;
  clinician_id?: string; // For Supabase compatibility
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
    };
    standing: {
      maxDuration: number;
    };
    other: string;
  };
  expectedReturnDate?: string;
  createdAt: string;
}

interface DashboardStats {
  totalCases: number;
  newCases: number;
  activeCases: number;
  completedCases: number;
  avgCaseDuration: number;
  complianceRate: number;
  upcomingAppointments: number;
  overdueTasks: number;
}

const CaseManagerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const hasFetchedData = useRef(false);

  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  
  // Data states
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [clinicians, setClinicians] = useState<User[]>([]);
  const [availableClinicians, setAvailableClinicians] = useState<Clinician[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  
  // Dialog states
  const [caseDialog, setCaseDialog] = useState(false);
  const [assignmentDialog, setAssignmentDialog] = useState(false);
  const [clinicianDialog, setClinicianDialog] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [selectedClinician, setSelectedClinician] = useState<Clinician | null>(null);
  
  // Form states
  const [caseForm, setCaseForm] = useState({
    incident: '',
    priority: 'medium',
    injuryDetails: {
      bodyPart: '',
      injuryType: '',
      severity: 'moderate', // Set default value to a valid enum value
      description: ''
    },
    workRestrictions: {
      lifting: { maxWeight: 0 },
      standing: { maxDuration: 0 },
      other: ''
    },
    expectedReturnDate: '',
    notes: ''
  });

  const [assignmentForm, setAssignmentForm] = useState({
    case: '',
    clinician: '',
    assignmentDate: '',
    notes: ''
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [incidentsRes, casesRes, cliniciansRes, notificationsRes] = await Promise.all([
        SupabaseAPI.getIncidents(),
        SupabaseAPI.getCases(),
        SupabaseAPI.getUsersByRole('clinician'),
        SupabaseAPI.getNotifications()
      ]);

      setIncidents(incidentsRes.incidents || []);
      setCases(casesRes.cases || []);
      setClinicians(cliniciansRes.users || []);
      setNotifications(notificationsRes.notifications || []);
      setUnreadNotificationCount(notificationsRes.notifications?.filter((n: any) => !n.read).length || 0);
      
      // Calculate stats
      const totalCases = casesRes.cases?.length || 0;
      const newCases = casesRes.cases?.filter((c: Case) => c.status === 'new').length || 0;
      const activeCases = casesRes.cases?.filter((c: Case) => 
        ['triaged', 'assessed', 'in_rehab'].includes(c.status)
      ).length || 0;
      const completedCases = casesRes.cases?.filter((c: Case) => 
        ['return_to_work', 'closed'].includes(c.status)
      ).length || 0;
      
      setStats({
        totalCases,
        newCases,
        activeCases,
        completedCases,
        avgCaseDuration: 45, // Mock data - would be calculated from actual data
        complianceRate: 92, // Mock data
        upcomingAppointments: 8, // Mock data
        overdueTasks: 2 // Mock data
      });
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAvailableClinicians = useCallback(async () => {
    try {
      console.log('Fetching available clinicians...');
      const response = await SupabaseAPI.getUsersByRole('clinician');
      console.log('Clinicians response:', response);
      
      if (!response.users || response.users.length === 0) {
        console.log('No clinicians found in response');
        setError('No clinicians available. Please add clinicians to the system.');
        return;
      }

      // Add workload data for each clinician
      const cliniciansWithWorkload = response.users.map((clinician: any) => ({
        ...clinician,
        workload: {
          activeCases: Math.floor(Math.random() * 10), // Mock data
          appointmentsToday: Math.floor(Math.random() * 5),
          appointmentsThisWeek: Math.floor(Math.random() * 20),
          availabilityScore: Math.floor(Math.random() * (100 - 30) + 30),
          availabilityStatus: 'available'
        }
      }));

      setAvailableClinicians(cliniciansWithWorkload);
      setClinicians(cliniciansWithWorkload);
      console.log('Updated clinicians state with:', cliniciansWithWorkload);
    } catch (err: any) {
      console.error('Error fetching available clinicians:', err);
      if (err.response) {
        console.log('Error response:', err.response.data);
        setError(err.response?.data?.message || `Server error: ${err.response.status}`);
      } else if (err.request) {
        console.log('Error request:', err.request);
        setError('No response received from server. Please check your network connection.');
      } else {
        console.log('Error message:', err.message);
        setError(`Error: ${err.message}`);
      }
    }
  }, []);

  useEffect(() => {
    if (user && !hasFetchedData.current) {
      console.log('Fetching initial data...');
      hasFetchedData.current = true;
      fetchData();
      fetchAvailableClinicians();
    }
  }, [user, fetchData, fetchAvailableClinicians]);

  const handleAssignClinician = useCallback(async (caseId?: string, clinicianId?: string, notes?: string) => {
    try {
      let caseNumber = '';
      let clinicianName = '';
      
      // If parameters are provided, use them directly
      if (caseId && clinicianId) {
        await SupabaseAPI.updateCase(caseId, { 
          clinician_id: clinicianId,
          notes: notes || 'Clinician assigned by case manager'
        });
        
        // Get case and clinician details for the success message
        const caseItem = cases.find(c => c._id === caseId);
        const clinician = clinicians.find(c => c._id === clinicianId);
        
        if (caseItem) caseNumber = caseItem.caseNumber || '';
        if (clinician) clinicianName = `Dr. ${clinician.firstName || ''} ${clinician.lastName || ''}`;
        
      } else {
        // Otherwise, use form data
        const assignmentData = {
          case: assignmentForm.case,
          clinician: assignmentForm.clinician,
          assignmentDate: assignmentForm.assignmentDate,
          notes: assignmentForm.notes
        };

        // TODO: Migrate to Supabase
        console.log('Case assignment feature is being migrated to Supabase');
        throw new Error('Case assignment feature is temporarily unavailable during migration to Supabase');
        
        // Get case and clinician details for the success message
        const caseItem = cases.find(c => c._id === assignmentForm.case);
        const clinician = clinicians.find(c => c._id === assignmentForm.clinician);
        
        if (caseItem) caseNumber = (caseItem as any).caseNumber || '';
        if (clinician) clinicianName = `Dr. ${(clinician as any).firstName || ''} ${(clinician as any).lastName || ''}`;
      }
      
      // Refresh data
      fetchData();
      fetchAvailableClinicians();
      
      // Close dialog if using form
      if (!caseId || !clinicianId) {
        setAssignmentDialog(false);
        setAssignmentForm({
          case: '',
          clinician: '',
          assignmentDate: '',
          notes: ''
        });
      }
      
      // Display success message
      setSuccessMessage(`Clinician ${clinicianName} assigned successfully to case ${caseNumber}! The clinician will now perform an initial assessment and create a rehabilitation plan.`);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      console.error('Error assigning clinician:', err);
      setError(err.response?.data?.message || 'Failed to assign clinician');
    }
  }, [cases, clinicians, assignmentForm, fetchData, fetchAvailableClinicians]);

  const handleUpdateClinicianAvailability = useCallback(async (clinicianId: string, isAvailable: boolean, reason?: string) => {
    try {
      // Get clinician details for the success message
      const clinician = clinicians.find(c => c._id === clinicianId);
      
      // TODO: Migrate to Supabase
      console.log('Clinician availability feature is being migrated to Supabase');
      throw new Error('Clinician availability feature is temporarily unavailable during migration to Supabase');
      
      // Refresh available clinicians
      fetchAvailableClinicians();
      
      const clinicianName = (clinician as any) ? `Dr. ${(clinician as any).firstName || ''} ${(clinician as any).lastName || ''}` : 'Clinician';
      
      setSuccessMessage(`${clinicianName}'s availability status updated to ${isAvailable ? 'available' : 'unavailable'} successfully!`);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      console.error('Error updating clinician availability:', err);
      setError(err.response?.data?.message || 'Failed to update clinician availability');
    }
  }, [clinicians, fetchAvailableClinicians]);

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case 'available': return 'success';
      case 'moderate': return 'warning';
      case 'busy': return 'error';
      default: return 'default';
    }
  };

  const getAvailabilityScoreColor = (score: number) => {
    if (score >= 70) return '#4caf50';
    if (score >= 40) return '#ff9800';
    return '#f44336';
  };

  // Map severity to case severity
  const mapSeverity = (incidentSeverity: string): 'minor' | 'moderate' | 'severe' => {
    // First clean up the input string
    const cleanSeverity = incidentSeverity.toLowerCase().trim()
      .replace(/_/g, ' ')  // Replace underscores with spaces
      .replace(/\s+/g, ' '); // Normalize spaces
    
    console.log('Mapping severity from:', incidentSeverity, 'cleaned:', cleanSeverity);

    // Define severity mappings with more variations
    const severityMap: { [key: string]: 'minor' | 'moderate' | 'severe' } = {
      // Minor severities
      'low': 'minor',
      'minor': 'minor',
      'minimal': 'minor',
      'slight': 'minor',
      'first aid': 'minor',
      'first aid only': 'minor',
      
      // Moderate severities
      'medium': 'moderate',
      'moderate': 'moderate',
      'lost time': 'moderate',  // Lost time incidents typically moderate
      'medical treatment': 'moderate',
      'restricted work': 'moderate',
      'limited duty': 'moderate',
      
      // Severe severities
      'high': 'severe',
      'severe': 'severe',
      'critical': 'severe',
      'major': 'severe',
      'extreme': 'severe',
      'fatality': 'severe',
      'fatal': 'severe',
      'death': 'severe',
      'permanent disability': 'severe',
      'permanent impairment': 'severe'
    };

    // Try to find an exact match first
    let mapped = severityMap[cleanSeverity];
    
    // If no exact match, try to find a partial match
    if (!mapped) {
      // Check if any key is contained within the cleaned severity string
      const matchingKey = Object.keys(severityMap).find(key => 
        cleanSeverity.includes(key)
      );
      if (matchingKey) {
        mapped = severityMap[matchingKey];
      }
    }

    console.log('Mapped severity:', cleanSeverity, 'to:', mapped || 'moderate (default)');
    
    // Default to moderate if no mapping found
    return mapped || 'moderate';
  };

  const validateCaseData = (incident: Incident | null, clinicianId: string) => {
    console.log('Validating case data:', { incident, clinicianId });
    
    // Check incident first
    if (!incident) {
      return { isValid: false, error: 'Please select an incident to create a case' };
    }

    // Build a list of missing fields
    const missingFields = [];

    // Check clinician
    if (!clinicianId) {
      missingFields.push('Clinician assignment');
    }

    // Check worker
    if (!incident.worker?._id) {
      missingFields.push('Worker information');
    } else {
      console.log('Worker info present:', incident.worker);
    }

    // Check employer
    if (!incident.employer?._id) {
      missingFields.push('Employer information');
    } else {
      console.log('Employer info present:', incident.employer);
    }

    // Check incident type
    if (!incident.incidentType) {
      missingFields.push('Incident type');
    } else {
      console.log('Incident type present:', incident.incidentType);
    }

    // Check incident severity
    if (!incident.severity) {
      missingFields.push('Incident severity');
    } else {
      console.log('Incident severity present:', incident.severity);
    }

    // If we have missing fields, return them all in one message
    if (missingFields.length > 0) {
      return { 
        isValid: false, 
        error: `Missing required information: ${missingFields.join(', ')}` 
      };
    }

    // All validations passed
    console.log('All validations passed');
    return { isValid: true, error: null };
  };

  const handleCreateCase = useCallback(async () => {
    try {
      // Get the current user from auth context
      const currentUser = user;
      console.log('Current user from context:', currentUser);
      
      if (!currentUser) {
        setError('User information not available. Please log in again.');
        return;
      }
      
      // Make sure to use the correct user ID format
      const userId = currentUser.id;
      console.log('Using case manager ID:', userId);
      
      if (!userId) {
        setError('User ID not available. Please log in again.');
        return;
      }

      console.log('Starting case creation process...');
      console.log('Selected incident:', selectedIncident);
      console.log('Assignment form:', assignmentForm);

      // Check if a case already exists for this incident
      if (selectedIncident) {
        const incidentId = (selectedIncident as any).id || selectedIncident._id;
        const existingCase = cases.find(c => c.incident && 
          ((c.incident as any)._id === incidentId || 
           (c.incident as any).id === incidentId ||
           c.incident.incidentNumber === selectedIncident.incidentNumber));
        
        if (existingCase) {
          setError(`Case ${existingCase.caseNumber} already exists for this incident. Please select a different incident.`);
          return;
        }
      }

      // Validate all required data
      const validation = validateCaseData(selectedIncident, assignmentForm.clinician);
      if (!validation.isValid || !selectedIncident) {
        const errorMsg = validation.error || 'Invalid case data';
        console.error('Validation failed:', errorMsg);
        setError(errorMsg);
        return;
      }

      // Extract and process injury information
      const incidentType = selectedIncident.incidentType || '';
      console.log('Processing incident type:', incidentType);
      
      // Split by underscore, space, or hyphen and filter out empty parts
      const parts = incidentType.split(/[_\s-]+/).filter(part => part.length > 0);
      console.log('Split incident type parts:', parts);

      // Extract body part and injury type with better handling
      let bodyPart = 'Not specified';
      let injuryType = incidentType;

      if (parts.length > 0) {
        bodyPart = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
        if (parts.length > 1) {
          injuryType = parts.slice(1)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        }
      }

      const extractedInfo = {
        bodyPart,
        injuryType
      };

      console.log('Extracted injury info:', extractedInfo);

      // Map severity and set priority
      const caseSeverity = mapSeverity(selectedIncident.severity);
      const priority = caseSeverity === 'severe' ? 'high' : 
                      caseSeverity === 'moderate' ? 'medium' : 'low';

      // Format dates
      const dateOfInjury = new Date(selectedIncident.incidentDate).toISOString();

      // Prepare case data with exact structure matching backend validation
      const caseData = {
        // Required IDs
        worker: (selectedIncident.worker as any).id || selectedIncident.worker._id,
        employer: (selectedIncident.employer as any).id || selectedIncident.employer._id,
        caseManager: userId,
        incident: (selectedIncident as any).id || selectedIncident._id,
        
        // Optional clinician assignment
        clinician: assignmentForm.clinician,
        
        // Required injury details with exact structure matching backend schema
        injuryDetails: {
          bodyPart: extractedInfo.bodyPart || 'Not specified',
          injuryType: extractedInfo.injuryType || selectedIncident.incidentType,
          severity: caseSeverity, // Must be 'minor', 'moderate', or 'severe'
          description: selectedIncident.description?.trim() || 'No description provided',
          dateOfInjury: dateOfInjury,
          mechanismOfInjury: selectedIncident.incidentType // Add mechanism of injury
        },
        
        // Optional fields with default values
        priority: priority, // 'low', 'medium', 'high', 'urgent'
        status: 'triaged',
        
        // Expected return date
        expectedReturnDate: caseForm.expectedReturnDate || null,
        
        // Add complete work restrictions structure matching backend schema
        workRestrictions: {
          lifting: { 
            maxWeight: 0,
            frequency: 'as needed',
            duration: 'short'
          },
          standing: { 
            maxDuration: 0,
            breaks: 0
          },
          sitting: {
            maxDuration: 0,
            breaks: 0
          },
          bending: false,
          twisting: false,
          climbing: false,
          driving: false,
          other: ''
        },
        
        // Include case manager notes
        initialNotes: caseForm.notes
      };
      
      console.log('Final case data being sent:', JSON.stringify(caseData, null, 2));

      // Validate the case data before sending
      console.log('Validating case data:', JSON.stringify(caseData, null, 2));
      
      // Validate required IDs are valid MongoDB ObjectIds
      const validateMongoId = (id: string): boolean => /^[0-9a-fA-F]{24}$/.test(id);
      
      if (!caseData.worker) {
        throw new Error('Missing worker ID');
      }
      
      if (!caseData.employer) {
        throw new Error('Missing employer information. The incident must have employer details to create a case. Please ensure the incident was properly reported with employer information.');
      }
      
      if (!caseData.incident) {
        throw new Error('Missing incident ID');
      }
      
      if (caseData.clinician && !validateMongoId(caseData.clinician)) {
        throw new Error('Invalid clinician ID');
      }
      
      // Validate injury details
      if (!caseData.injuryDetails) {
        throw new Error('Missing injury details');
      }
      
      if (!caseData.injuryDetails.bodyPart || typeof caseData.injuryDetails.bodyPart !== 'string') {
        throw new Error('Body part is required and must be text');
      }
      
      if (!caseData.injuryDetails.injuryType || typeof caseData.injuryDetails.injuryType !== 'string') {
        throw new Error('Injury type is required and must be text');
      }
      
      // Validate severity is one of the allowed values
      if (!['minor', 'moderate', 'severe'].includes(caseData.injuryDetails.severity)) {
        throw new Error('Invalid severity value. Must be minor, moderate, or severe');
      }
      
      // Validate priority is one of the allowed values
      if (caseData.priority && !['low', 'medium', 'high', 'urgent'].includes(caseData.priority)) {
        throw new Error('Invalid priority value. Must be low, medium, high, or urgent');
      }
      
      // Validate status is one of the allowed values
      if (caseData.status && !['new', 'triaged', 'assessed', 'in_rehab', 'return_to_work', 'closed'].includes(caseData.status)) {
        throw new Error('Invalid status value');
      }
      
      // We'll let the backend handle the notes
      // The simplified data structure doesn't include notes

      console.log('Submitting case data:', JSON.stringify(caseData, null, 2));
      
      // No need to check for token here - the api interceptor will handle it
      
      // We'll use the default API configuration with interceptors
      // The api.interceptors.request will automatically add the token
      // This is more reliable than creating a custom config
      
      console.log('API URL:', process.env.REACT_APP_API_URL || 'http://localhost:5001/api'); // TODO: Remove when fully migrated to Supabase
      
      // Log the complete request details
      console.log('Making API request to create case:', {
        url: '/cases',
        data: caseData,
        baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001/api' // TODO: Remove when fully migrated to Supabase
      });

      // Make the API call with default configuration
      // This will use the interceptors to add the auth token
      const response = await SupabaseAPI.createCase(caseData);
      console.log('Case creation response:', response);
      
      // Validate response data
      if (!response) {
        console.error('Empty response received');
        throw new Error('No response data received from server');
      }
      
      if (!response.case) {
        console.error('Invalid response format:', response);
        throw new Error('Server response missing case data');
      }
      
      // Verify the case was created with the correct data
      let createdCase = response.case;
      console.log('Created case:', createdCase);
      
      // Verify clinician assignment
      if (assignmentForm.clinician) {
        // Check if clinician was assigned
        if (!createdCase.clinician) {
          console.warn('Clinician assignment missing in created case - attempting to assign now');
          
          try {
            // Try to assign the clinician manually as a fallback
            // TODO: Migrate to Supabase
            console.log('Case assignment feature is being migrated to Supabase');
            throw new Error('Case assignment feature is temporarily unavailable during migration to Supabase');
            
          } catch (assignError) {
            console.error('Failed to manually assign clinician:', assignError);
            // Continue with case creation even if assignment fails
          }
        } else if (createdCase.clinician._id !== assignmentForm.clinician) {
          console.warn('Clinician assignment mismatch - attempting to fix:', {
            expected: assignmentForm.clinician,
            actual: createdCase.clinician._id
          });
          
          try {
            // TODO: Migrate to Supabase
            console.log('Case reassignment feature is being migrated to Supabase');
            throw new Error('Case reassignment feature is temporarily unavailable during migration to Supabase');
            
          } catch (reassignError) {
            console.error('Failed to reassign clinician:', reassignError);
            // Continue with case creation even if reassignment fails
          }
        }
      }
      
      // Reset form state
      setCaseDialog(false);
      setSelectedIncident(null);
      setCaseForm({
        incident: '',
        priority: 'medium',
        injuryDetails: { bodyPart: '', injuryType: '', severity: 'moderate', description: '' },
        workRestrictions: { lifting: { maxWeight: 0 }, standing: { maxDuration: 0 }, other: '' },
        expectedReturnDate: '',
        notes: ''
      });
      setAssignmentForm({
        case: '',
        clinician: '',
        assignmentDate: '',
        notes: ''
      });
      
      // Refresh data
      fetchData();
      
      // Get clinician name for success message
      const clinician = clinicians.find(c => c._id === assignmentForm.clinician);
      const clinicianName = clinician ? `Dr. ${clinician.firstName || ''} ${clinician.lastName || ''}` : 'selected clinician';
      
      // Display success message with case flow information
      const caseNumber = response?.case?.caseNumber || 'New case';
      const workerName = `${selectedIncident.worker.firstName} ${selectedIncident.worker.lastName}`;
      
      setSuccessMessage(`Case ${caseNumber} created successfully for ${workerName} and assigned to ${clinicianName}! The case status is now 'triaged'. Next step is for the clinician to perform an assessment.`);
      setTimeout(() => setSuccessMessage(''), 8000);
    } catch (err: any) {
      console.error('Error creating case:', err);
      // More detailed error handling
      console.error('Case creation error:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        url: '/cases'
      });
      
      let errorMessage = 'Failed to create case. ';
      
      if (err.response) {
        // Log full error details for debugging
        console.log('Server response error details:', {
          status: err.response.status,
          statusText: err.response.statusText,
          data: err.response.data,
          headers: err.response.headers
        });
        
        // Handle different types of validation errors
        if (err.response.data?.details) {
          const errorDetails = Object.values(err.response.data.details)
            .filter(detail => detail !== null)
            .join(', ');
          errorMessage += `Validation error: ${errorDetails}`;
        } else if (err.response.data?.errors && Array.isArray(err.response.data.errors)) {
          // Handle express-validator errors
          const errorMessages = err.response.data.errors.map((e: any) => {
            console.log('Validation error detail:', e);
            return `${e.param}: ${e.msg}`;
          }).join(', ');
          errorMessage += `Validation error: ${errorMessages}`;
        } else if (err.response.status === 401) {
          errorMessage += 'Your session has expired. Please log in again.';
          // Redirect to login
          window.location.href = '/login';
        } else if (err.response.status === 403) {
          errorMessage += 'You do not have permission to create cases.';
        } else if (err.response.data?.error === 'MISSING_EMPLOYER_INFO') {
          errorMessage += 'The incident is missing employer information. Please ensure the incident was properly reported with employer details before creating a case.';
        } else {
          // Show as much error detail as possible
          errorMessage += err.response.data?.message || 
            (typeof err.response.data === 'string' ? err.response.data : 
            `Server error (${err.response.status}: ${err.response.statusText})`);
        }
        
        // Log the error context
        console.log('Error occurred during case creation');
      } else if (err.request) {
        console.log('No response received:', err.request);
        errorMessage += 'No response received from server. Please check your network connection and try again.';
      } else {
        console.log('Request setup error:', err.message);
        errorMessage += err.message;
      }
      
      // Set error message and show it to user
      setError(errorMessage);
      
      // Keep the dialog open so user can see the error
      // setCaseDialog(false);
    }
  }, [user, assignmentForm, caseForm.expectedReturnDate, caseForm.notes, cases, clinicians, fetchData, selectedIncident]);

  const handleUpdateCaseStatus = useCallback(async (caseId: string, newStatus: string) => {
    try {
      console.log(`Updating case ${caseId} status to ${newStatus}`);
      
      // TODO: Migrate to Supabase
      console.log('Case status update feature is being migrated to Supabase');
      throw new Error('Case status update feature is temporarily unavailable during migration to Supabase');
      
      // Display success message with case flow information
      let statusMessage = '';
      let nextStep = '';
      
      switch(newStatus) {
        case 'triaged':
          statusMessage = 'Case has been triaged.';
          nextStep = 'The next step is for a clinician to perform an initial assessment.';
          break;
        case 'assessed':
          statusMessage = 'Case has been assessed.';
          nextStep = 'The next step is to create a rehabilitation plan.';
          break;
        case 'in_rehab':
          statusMessage = 'Case is now in rehabilitation.';
          nextStep = 'Worker will receive daily check-in reminders.';
          break;
        case 'return_to_work':
          statusMessage = 'Worker is ready to return to work with appropriate restrictions.';
          nextStep = 'Monitor progress and close the case when appropriate.';
          break;
        case 'closed':
          statusMessage = 'Case has been successfully closed.';
          nextStep = 'No further action is required.';
          break;
        default:
          statusMessage = `Case status updated to ${newStatus}.`;
      }
      
      setSuccessMessage(`Case status updated successfully! ${statusMessage} ${nextStep}`);
      setTimeout(() => setSuccessMessage(''), 8000);
    } catch (err: any) {
      console.error('Error updating case status:', err);
      
      if (err.response) {
        console.log('Error data:', err.response.data);
        console.log('Error status:', err.response.status);
        setError(err.response?.data?.message || `Failed to update case status: ${err.response.status}`);
      } else if (err.request) {
        console.log('Error request:', err.request);
        setError('No response received from server. Please check your network connection.');
      } else {
        console.log('Error message:', err.message);
        setError(`Error: ${err.message}`);
      }
    }
  }, [fetchData]);

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: any } = {
      'new': 'info',
      'triaged': 'warning',
      'assessed': 'primary',
      'in_rehab': 'secondary',
      'return_to_work': 'success',
      'closed': 'default',
    };
    return colors[status] || 'default';
  };

  const getPriorityColor = (priority: string) => {
    const colors: { [key: string]: any } = {
      'urgent': 'error',
      'high': 'warning',
      'medium': 'info',
      'low': 'success',
    };
    return colors[priority] || 'default';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (!user) {
    return (
      <LayoutWithSidebar>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <Typography variant="h6" color="text.secondary">
            Please log in to access the dashboard
          </Typography>
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
        <Typography variant="h4" component="h1" gutterBottom>
          Case Manager Dashboard
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
          Welcome back, {user?.firstName}! Manage cases, assign clinicians, and monitor compliance.
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

        {/* Notifications Section */}
        {unreadNotificationCount > 0 && (
          <Card sx={{ 
            borderRadius: 3,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            border: '2px solid',
            borderColor: 'warning.main',
            mb: 4
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Warning color="warning" sx={{ fontSize: 28 }} />
                  <Typography variant="h5" color="warning.main" sx={{ fontWeight: 700 }}>
                    Alerts ({unreadNotificationCount})
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Check-in alerts require your attention
                </Typography>
              </Box>
              
              {notifications.filter(n => !n.isRead).slice(0, 3).map((notification) => (
                <Box key={notification._id} sx={{ 
                  mb: 3, 
                  p: 3, 
                  bgcolor: notification.type === 'high_pain' ? '#fef2f2' : 
                           notification.type === 'rtw_review' ? '#fef3c7' : 
                           notification.type === 'case_closed' ? '#f0fdf4' :
                           notification.type === 'return_to_work' ? '#fef3c7' :
                           notification.type === 'incident_reported' ? '#fef2f2' : '#f0f9ff', 
                  borderRadius: 2,
                  border: notification.type === 'high_pain' ? '1px solid #fecaca' :
                          notification.type === 'rtw_review' ? '1px solid #fde68a' :
                          notification.type === 'case_closed' ? '1px solid #bbf7d0' :
                          notification.type === 'return_to_work' ? '1px solid #fde68a' :
                          notification.type === 'incident_reported' ? '1px solid #fecaca' : '1px solid #bae6fd'
                }}>
                  <Box display="flex" alignItems="center" gap={2} sx={{ mb: 2 }}>
                    <Box sx={{ 
                      backgroundColor: notification.type === 'high_pain' ? '#ef4444' : 
                                      notification.type === 'rtw_review' ? '#f59e0b' : 
                                      notification.type === 'case_closed' ? '#22c55e' :
                                      notification.type === 'return_to_work' ? '#f59e0b' :
                                      notification.type === 'incident_reported' ? '#ef4444' : '#3b82f6',
                      borderRadius: 2,
                      p: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {notification.type === 'high_pain' ? <LocalHospital sx={{ fontSize: 20, color: 'white' }} /> :
                       notification.type === 'rtw_review' ? <Work sx={{ fontSize: 20, color: 'white' }} /> :
                       notification.type === 'case_closed' ? <CheckCircle sx={{ fontSize: 20, color: 'white' }} /> :
                       notification.type === 'return_to_work' ? <Work sx={{ fontSize: 20, color: 'white' }} /> :
                       notification.type === 'incident_reported' ? <Warning sx={{ fontSize: 20, color: 'white' }} /> :
                       <Assessment sx={{ fontSize: 20, color: 'white' }} />}
                    </Box>
                    <Box flex={1}>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
                        {notification.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        From: {notification.sender.firstName} {notification.sender.lastName} • {new Date(notification.createdAt).toLocaleString()}
                      </Typography>
                    </Box>
                    <Chip
                      label={notification.priority.toUpperCase()}
                      color={notification.priority === 'urgent' ? 'error' : 
                             notification.priority === 'high' ? 'warning' : 'info'}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </Box>
                  
                  <Typography variant="body1" sx={{ mb: 2, color: '#374151' }}>
                    {notification.message}
                  </Typography>
                  
                  <Box display="flex" gap={1} sx={{ mt: 2 }}>
                    {notification.actionUrl && (
                      <Button
                        variant="contained"
                        color={notification.type === 'high_pain' ? 'error' : 
                               notification.type === 'rtw_review' ? 'warning' : 
                               notification.type === 'case_closed' ? 'success' :
                               notification.type === 'return_to_work' ? 'warning' : 'primary'}
                        size="small"
                        onClick={() => {
                          // Mark notification as read
                          // TODO: Migrate to Supabase
                          console.log('Notification read feature is being migrated to Supabase');
                          // Navigate to action URL
                          window.location.href = notification.actionUrl || '/cases';
                        }}
                        sx={{
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 600,
                          backgroundColor: notification.type === 'high_pain' ? '#ef4444' : 
                                          notification.type === 'rtw_review' ? '#f59e0b' : 
                                          notification.type === 'case_closed' ? '#22c55e' :
                                          notification.type === 'return_to_work' ? '#f59e0b' : '#3b82f6',
                          '&:hover': {
                            backgroundColor: notification.type === 'high_pain' ? '#dc2626' : 
                                            notification.type === 'rtw_review' ? '#d97706' : 
                                            notification.type === 'case_closed' ? '#16a34a' :
                                            notification.type === 'return_to_work' ? '#d97706' : '#2563eb'
                          }
                        }}
                      >
                        View Case Details
                      </Button>
                    )}
                    <Button
                      variant="outlined"
                      color="success"
                      size="small"
                      startIcon={<CheckCircle />}
                      onClick={async () => {
                        try {
                          // TODO: Migrate to Supabase
                          console.log('Notification read feature is being migrated to Supabase');
                          // TODO: Migrate to Supabase
                          console.log('Notification refresh feature is being migrated to Supabase');
                          // For now, just refresh the notifications from state
                          const unreadCount = notifications.filter((n: any) => !n.isRead).length;
                          setUnreadNotificationCount(unreadCount);
                        } catch (error) {
                          console.error('Failed to mark notification as read:', error);
                        }
                      }}
                      sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                        borderColor: '#22c55e',
                        color: '#22c55e',
                        '&:hover': {
                          borderColor: '#16a34a',
                          backgroundColor: '#f0fdf4'
                        }
                      }}
                    >
                      Mark as Read
                    </Button>
                  </Box>
                </Box>
              ))}
              
              {notifications.filter(n => !n.isRead).length > 3 && (
                <Button
                  variant="outlined"
                  color="warning"
                  fullWidth
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    borderColor: '#f59e0b',
                    color: '#92400e',
                    '&:hover': {
                      borderColor: '#d97706',
                      backgroundColor: '#fef3c7'
                    }
                  }}
                >
                  View All Alerts ({notifications.filter(n => !n.isRead).length})
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
          <Card sx={{ minWidth: 200, flex: 1 }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Cases
                  </Typography>
                  <Typography variant="h4">
                    {stats?.totalCases || 0}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
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
                    New Cases
                  </Typography>
                  <Typography variant="h4">
                    {stats?.newCases || 0}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.main' }}>
                  <Warning />
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
                <Avatar sx={{ bgcolor: 'info.main' }}>
                  <Timeline />
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
        </Box>

        {/* Main Content Tabs */}
        <Card>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
              <Tab label="Case Intake" />
              <Tab label="Case Management" />
              <Tab label="Clinician Assignment" />
              <Tab label="Compliance Monitoring" />
            </Tabs>
          </Box>

          <CardContent>
            {/* Case Intake Tab */}
            {activeTab === 0 && (
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                  <Typography variant="h6">
                    Incident Reports Management
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={fetchData}
                    size="small"
                  >
                    Refresh
                  </Button>
                </Box>

                {incidents.length > 0 ? (
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Incident #</TableCell>
                          <TableCell>Worker</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Severity</TableCell>
                          <TableCell>Date</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {incidents
                          .map((incident) => {
                            // Check if this incident already has a case
                            const hasCase = cases.some(c => {
                              // Check by incident number which is always available
                              if (c.incident && c.incident.incidentNumber === incident.incidentNumber) {
                                return true;
                              }
                              
                              // Check by ID if available
                              if (c.incident && (c.incident as any)._id && incident._id) {
                                return (c.incident as any)._id === incident._id;
                              }
                              
                              return false;
                            });
                            
                            return (
                              <TableRow 
                                key={incident._id} 
                                sx={{ 
                                  bgcolor: incident.status === 'closed' ? 'rgba(0, 0, 0, 0.04)' : 'inherit',
                                  opacity: incident.status === 'closed' ? 0.8 : 1
                                }}
                              >
                                <TableCell>{incident.incidentNumber}</TableCell>
                                <TableCell>
                                  <Box display="flex" alignItems="center" gap={1}>
                                    <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
                                      {incident.worker.firstName.charAt(0)}{incident.worker.lastName.charAt(0)}
                                    </Avatar>
                                    <Box>
                                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                        {incident.worker.firstName} {incident.worker.lastName}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {incident.worker.email}
                                      </Typography>
                                    </Box>
                                  </Box>
                                </TableCell>
                                <TableCell>{incident.incidentType.replace('_', ' ')}</TableCell>
                                <TableCell>
                                  <Chip
                                    label={incident.severity.replace('_', ' ')}
                                    color={getPriorityColor(incident.severity)}
                                    size="small"
                                  />
                                </TableCell>
                                <TableCell>{formatDate(incident.incidentDate)}</TableCell>
                                <TableCell>
                                  {incident.status === 'closed' || hasCase ? (
                                    <Chip
                                      label="Case Created"
                                      color="success"
                                      size="small"
                                      icon={<CheckCircle fontSize="small" />}
                                    />
                                  ) : (
                                    <Button
                                      variant="contained"
                                      size="small"
                                      startIcon={<Add />}
                                      onClick={() => {
                                        setSelectedIncident(incident);
                                        // Reset forms
                                        setCaseForm({
                                          incident: '',
                                          priority: 'medium',
                                          injuryDetails: { bodyPart: '', injuryType: '', severity: 'moderate', description: '' },
                                          workRestrictions: { lifting: { maxWeight: 0 }, standing: { maxDuration: 0 }, other: '' },
                                          expectedReturnDate: '',
                                          notes: ''
                                        });
                                        setAssignmentForm({
                                          case: '',
                                          clinician: '',
                                          assignmentDate: '',
                                          notes: ''
                                        });
                                        setCaseDialog(true);
                                      }}
                                    >
                                      Review & Assign
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Box textAlign="center" py={3}>
                    <Typography color="text.secondary">
                      No incidents awaiting case creation
                    </Typography>
                  </Box>
                )}
              </Box>
            )}

            {/* Case Management Tab */}
            {activeTab === 1 && (
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                  <Typography variant="h6">
                    All Cases
                  </Typography>
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
                          <TableCell>Case #</TableCell>
                          <TableCell>Worker</TableCell>
                          <TableCell>Injury</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Priority</TableCell>
                          <TableCell>Clinician</TableCell>
                          <TableCell>Expected Return</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {cases.map((caseItem) => (
                          <TableRow key={caseItem._id}>
                            <TableCell>{caseItem.caseNumber || ''}</TableCell>
                            <TableCell>
                              <Box display="flex" alignItems="center" gap={1}>
                                <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
                                  {caseItem.worker.firstName.charAt(0)}{caseItem.worker.lastName.charAt(0)}
                                </Avatar>
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {caseItem.worker.firstName} {caseItem.worker.lastName}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {caseItem.worker.email}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {caseItem.injuryDetails.bodyPart}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {caseItem.injuryDetails.injuryType}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={caseItem.status.replace('_', ' ')}
                                color={getStatusColor(caseItem.status)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={caseItem.priority}
                                color={getPriorityColor(caseItem.priority)}
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              {caseItem.clinician ? (
                                <Typography variant="body2">
                                  Dr. {caseItem.clinician.firstName || ''} {caseItem.clinician.lastName || ''}
                                </Typography>
                              ) : (
                                <Button
                                  variant="outlined"
                                  size="small"
                                  onClick={() => {
                                    setAssignmentForm({ ...assignmentForm, case: caseItem._id });
                                    setAssignmentDialog(true);
                                  }}
                                >
                                  Assign
                                </Button>
                              )}
                            </TableCell>
                            <TableCell>
                              {caseItem.expectedReturnDate ? formatDate(caseItem.expectedReturnDate) : 'TBD'}
                            </TableCell>
                            <TableCell>
                              <Box display="flex" gap={0.5}>
                                <Tooltip title="View Details">
                                  <IconButton size="small">
                                    <Visibility />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Edit Case">
                                  <IconButton size="small">
                                    <Edit />
                                  </IconButton>
                                </Tooltip>
                                {/* Status update buttons with improved flow */}
                                {caseItem.status === 'new' && (
                                  <Tooltip title="Mark as Triaged">
                                    <Button
                                      size="small"
                                      variant="contained"
                                      color="warning"
                                      onClick={() => handleUpdateCaseStatus(caseItem._id, 'triaged')}
                                    >
                                      Triage
                                    </Button>
                                  </Tooltip>
                                )}
                                {caseItem.status === 'triaged' && (
                                  <Tooltip title="Mark as Assessed">
                                    <Button
                                      size="small"
                                      variant="contained"
                                      color="primary"
                                      onClick={() => handleUpdateCaseStatus(caseItem._id, 'assessed')}
                                    >
                                      Assessed
                                    </Button>
                                  </Tooltip>
                                )}
                                {caseItem.status === 'assessed' && (
                                  <Tooltip title="Start Rehabilitation">
                                    <Button
                                      size="small"
                                      variant="contained"
                                      color="secondary"
                                      onClick={() => handleUpdateCaseStatus(caseItem._id, 'in_rehab')}
                                    >
                                      Start Rehab
                                    </Button>
                                  </Tooltip>
                                )}
                                {caseItem.status === 'in_rehab' && (
                                  <Tooltip title="Return to Work">
                                    <Button
                                      size="small"
                                      variant="contained"
                                      color="success"
                                      onClick={() => handleUpdateCaseStatus(caseItem._id, 'return_to_work')}
                                    >
                                      Return to Work
                                    </Button>
                                  </Tooltip>
                                )}
                                {caseItem.status === 'return_to_work' && (
                                  <Tooltip title="Close Case">
                                    <Button
                                      size="small"
                                      variant="contained"
                                      color="inherit"
                                      onClick={() => handleUpdateCaseStatus(caseItem._id, 'closed')}
                                    >
                                      Close Case
                                    </Button>
                                  </Tooltip>
                                )}
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
                      No cases found
                    </Typography>
                  </Box>
                )}
              </Box>
            )}

            {/* Clinician Assignment Tab */}
            {activeTab === 2 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Clinician Assignment Management
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Real-time clinician availability and workload management
                    </Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={() => {
                      fetchAvailableClinicians();
                      fetchData();
                    }}
                  >
                    Refresh Data
                  </Button>
                </Box>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  {/* Available Clinicians with Real-time Status */}
                  <Box sx={{ width: { xs: '100%', lg: '60%' }, p: 1 }}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Available Clinicians
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Real-time availability and workload status
                        </Typography>
                        
                        {availableClinicians.length === 0 ? (
                          <Box textAlign="center" py={3}>
                            <Typography color="text.secondary">
                              No clinicians available
                            </Typography>
                          </Box>
                        ) : (
                          <Box sx={{ maxHeight: 600, overflow: 'auto' }}>
                            {availableClinicians.map((clinician) => (
                              <Card key={clinician._id} sx={{ mb: 2, border: '1px solid', borderColor: 'divider' }}>
                                <CardContent sx={{ p: 2 }}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                      <Avatar sx={{ bgcolor: getAvailabilityScoreColor(clinician.workload.availabilityScore) }}>
                                        <LocalHospital />
                                      </Avatar>
                                      <Box>
                                        <Typography variant="subtitle1" fontWeight="bold">
                                          Dr. {clinician.firstName || ''} {clinician.lastName || ''}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                          {clinician.specialty || 'General Medicine'}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          {clinician.email}
                                        </Typography>
                                      </Box>
                                    </Box>
                                    <Chip
                                      label={clinician.workload.availabilityStatus.toUpperCase()}
                                      color={getAvailabilityColor(clinician.workload.availabilityStatus) as any}
                                      size="small"
                                    />
                                  </Box>

                                  {/* Availability Score */}
                                  <Box sx={{ mb: 2 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                      <Typography variant="body2">Availability Score</Typography>
                                      <Typography variant="body2" fontWeight="bold" color={getAvailabilityScoreColor(clinician.workload.availabilityScore)}>
                                        {clinician.workload.availabilityScore}%
                                      </Typography>
                                    </Box>
                                    <LinearProgress
                                      variant="determinate"
                                      value={clinician.workload.availabilityScore}
                                      sx={{
                                        height: 8,
                                        borderRadius: 4,
                                        backgroundColor: 'rgba(0,0,0,0.1)',
                                        '& .MuiLinearProgress-bar': {
                                          backgroundColor: getAvailabilityScoreColor(clinician.workload.availabilityScore)
                                        }
                                      }}
                                    />
                                  </Box>

                                  {/* Workload Details */}
                                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                                    <Box sx={{ textAlign: 'center', flex: 1 }}>
                                      <Typography variant="h6" color="primary">
                                        {clinician.workload.activeCases}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        Active Cases
                                      </Typography>
                                    </Box>
                                    <Box sx={{ textAlign: 'center', flex: 1 }}>
                                      <Typography variant="h6" color="secondary">
                                        {clinician.workload.appointmentsToday}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        Today's Appointments
                                      </Typography>
                                    </Box>
                                    <Box sx={{ textAlign: 'center', flex: 1 }}>
                                      <Typography variant="h6" color="info.main">
                                        {clinician.workload.appointmentsThisWeek}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        This Week
                                      </Typography>
                                    </Box>
                                  </Box>

                                  {/* Action Buttons */}
                                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                    <Button
                                      variant="outlined"
                                      size="small"
                                      onClick={() => {
                                        setSelectedClinician(clinician);
                                        setClinicianDialog(true);
                                      }}
                                    >
                                      View Details
                                    </Button>
                                    <Button
                                      variant="contained"
                                      size="small"
                                      disabled={clinician.workload.availabilityScore < 30}
                                      onClick={() => {
                                        // Auto-assign to highest priority case without clinician
                                        const unassignedCases = cases.filter(c => !c.clinician_id && (c.case_manager_id === user?.id || c.caseManager?._id === user?.id)).sort((a, b) => {
                                          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
                                          return priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder];
                                        });
                                        if (unassignedCases.length > 0) {
                                          handleAssignClinician(unassignedCases[0]._id, clinician._id, 'Auto-assigned by system');
                                        }
                                      }}
                                    >
                                      Auto Assign
                                    </Button>
                                  </Box>
                                </CardContent>
                              </Card>
                            ))}
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Box>

                  {/* Cases Needing Assignment */}
                  <Box sx={{ width: { xs: '100%', lg: '40%' }, p: 1 }}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Cases Needing Assignment
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Prioritized by urgency and injury severity
                        </Typography>
                        
                        {cases.filter(c => !c.clinician_id && (c.case_manager_id === user?.id || c.caseManager?._id === user?.id)).length === 0 ? (
                          <Box textAlign="center" py={3}>
                            <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                            <Typography color="text.secondary">
                              All cases have been assigned clinicians
                            </Typography>
                          </Box>
                        ) : (
                          <Box sx={{ maxHeight: 600, overflow: 'auto' }}>
                            {cases
                              .filter(c => !c.clinician)
                              .sort((a, b) => {
                                const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
                                return priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder];
                              })
                              .map((caseItem) => (
                                <Card key={caseItem._id} sx={{ mb: 2, border: '1px solid', borderColor: 'divider' }}>
                                  <CardContent sx={{ p: 2 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                      <Box>
                                        <Typography variant="subtitle1" fontWeight="bold">
                                          {caseItem.caseNumber || ''}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                          {caseItem.worker.firstName} {caseItem.worker.lastName}
                                        </Typography>
                                      </Box>
                                      <Chip
                                        label={caseItem.priority.toUpperCase()}
                                        color={caseItem.priority === 'urgent' ? 'error' : caseItem.priority === 'high' ? 'warning' : 'default'}
                                        size="small"
                                      />
                                    </Box>

                                    <Box sx={{ mb: 2 }}>
                                      <Typography variant="body2" color="text.secondary">
                                        <strong>Injury:</strong> {caseItem.injuryDetails.bodyPart} - {caseItem.injuryDetails.injuryType}
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary">
                                        <strong>Severity:</strong> {caseItem.injuryDetails.severity}
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary">
                                        <strong>Incident:</strong> {caseItem.incident.incidentNumber}
                                      </Typography>
                                    </Box>

                                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                      <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={() => {
                                          setAssignmentForm({ ...assignmentForm, case: caseItem._id });
                                          setAssignmentDialog(true);
                                        }}
                                      >
                                        Manual Assign
                                      </Button>
                                    </Box>
                                  </CardContent>
                                </Card>
                              ))}
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Box>
                </Box>
              </Box>
            )}

            {/* Compliance Monitoring Tab */}
            {activeTab === 3 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Compliance Monitoring
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Monitor case progress and compliance metrics
                </Typography>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  <Box sx={{ width: { xs: '100%', md: '50%' }, p: 1 }}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Case Progress Overview
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <Box>
                            <Box display="flex" justifyContent="space-between" sx={{ mb: 1 }}>
                              <Typography variant="body2">New Cases</Typography>
                              <Typography variant="caption">{stats?.newCases || 0}</Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={(stats?.newCases || 0) / (stats?.totalCases || 1) * 100}
                              color="info"
                            />
                          </Box>
                          <Box>
                            <Box display="flex" justifyContent="space-between" sx={{ mb: 1 }}>
                              <Typography variant="body2">Active Cases</Typography>
                              <Typography variant="caption">{stats?.activeCases || 0}</Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={(stats?.activeCases || 0) / (stats?.totalCases || 1) * 100}
                              color="primary"
                            />
                          </Box>
                          <Box>
                            <Box display="flex" justifyContent="space-between" sx={{ mb: 1 }}>
                              <Typography variant="body2">Completed Cases</Typography>
                              <Typography variant="caption">{stats?.completedCases || 0}</Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={(stats?.completedCases || 0) / (stats?.totalCases || 1) * 100}
                              color="success"
                            />
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Box>

                  <Box sx={{ width: { xs: '100%', md: '50%' }, p: 1 }}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Key Metrics
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2">Overall Compliance Rate</Typography>
                            <Typography variant="h6" color="success.main">
                              {stats?.complianceRate || 0}%
                            </Typography>
                          </Box>
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2">Average Case Duration</Typography>
                            <Typography variant="h6" color="info.main">
                              {stats?.avgCaseDuration || 0} days
                            </Typography>
                          </Box>
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2">Upcoming Appointments</Typography>
                            <Typography variant="h6" color="warning.main">
                              {stats?.upcomingAppointments || 0}
                            </Typography>
                          </Box>
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2">Overdue Tasks</Typography>
                            <Typography variant="h6" color="error.main">
                              {stats?.overdueTasks || 0}
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Box>
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Case Status Flow */}
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="h6" gutterBottom>
                  Case Status Flow
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Understanding the case progression workflow
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ maxWidth: '40%', textAlign: 'right' }}>
                Case Manager reviews case → Assigns Clinician → Updates Status through the workflow
              </Typography>
            </Box>
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip label="1. New" color="info" />
                <Typography variant="body2">Case created from incident</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">→</Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip label="2. Triaged" color="warning" />
                <Typography variant="body2">Case Manager reviews and prioritizes</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">→</Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip label="3. Assessed" color="primary" />
                <Typography variant="body2">Clinician performs initial assessment</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">→</Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip label="4. In Rehab" color="secondary" />
                <Typography variant="body2">Rehabilitation plan created</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">→</Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip label="5. Return to Work" color="success" />
                <Typography variant="body2">Worker ready to return</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">→</Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip label="6. Closed" color="default" />
                <Typography variant="body2">Case completed</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Review & Assign Dialog */}
        <Dialog open={caseDialog} onClose={() => setCaseDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            Review Incident & Assign Clinician
            {selectedIncident && (
              <>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
                  Incident: {selectedIncident.incidentNumber} - {selectedIncident.worker.firstName} {selectedIncident.worker.lastName}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Type: {selectedIncident.incidentType} | Severity: {selectedIncident.severity}
                </Typography>
              </>
            )}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              {/* Debug incident data */}
              {selectedIncident && (
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', display: 'block', mb: 2 }}>
                  Debug: Incident {selectedIncident.incidentNumber} has {selectedIncident.photos?.length || 0} photos
                </Typography>
              )}
              {/* Incident Details Summary */}
              <Card sx={{ mb: 3, bgcolor: 'background.default' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    Incident Details
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography variant="body2">
                      <strong>Date:</strong> {selectedIncident ? new Date(selectedIncident.incidentDate).toLocaleDateString() : ''}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Type:</strong> {selectedIncident?.incidentType}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Severity:</strong> {selectedIncident?.severity}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Description:</strong> {selectedIncident?.description}
                    </Typography>
                  </Box>
                  
                  {/* Incident Photos */}
                  {selectedIncident?.photos && selectedIncident.photos.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        Incident Photos:
                      </Typography>
                      {/* Debug info */}
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                        Debug: Found {selectedIncident.photos.length} photo(s)
                      </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
                          {selectedIncident.photos.map((photo, index) => (
                            <Box key={index} sx={{ position: 'relative' }}>
                              {/* Main image display - larger size */}
                              <img
                                {...createImageProps(photo.url)}
                                alt={photo.caption || `Incident photo ${index + 1}`}
                                style={{
                                  width: 200,
                                  height: 200,
                                  objectFit: 'cover',
                                  borderRadius: 8,
                                  border: '2px solid #8b5cf6',
                                  cursor: 'pointer',
                                  display: 'block'
                                }}
                                onClick={() => window.open(createImageProps(photo.url).src, '_blank')}
                              />
                              {photo.caption && (
                                <Typography variant="caption" sx={{ 
                                  display: 'block', 
                                  mt: 0.5, 
                                  textAlign: 'center',
                                  color: 'text.secondary',
                                  fontSize: '0.7rem'
                                }}>
                                  {photo.caption}
                                </Typography>
                              )}
                            </Box>
                          ))}
                        </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>

              <Box sx={{ mt: 3, mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocalHospital color="primary" />
                  Clinician Assignment
                </Typography>
                
                <FormControl fullWidth error={!assignmentForm.clinician && caseDialog}>
                  <InputLabel id="clinician-select-label" required>Select Clinician</InputLabel>
                  <Select
                    labelId="clinician-select-label"
                    value={assignmentForm.clinician}
                    onChange={(e) => {
                      console.log('Selected clinician:', e.target.value);
                      setAssignmentForm({ ...assignmentForm, clinician: e.target.value });
                    }}
                    required
                    label="Select Clinician"
                  >
                    {availableClinicians.map((clinician) => (
                      <MenuItem 
                        key={clinician._id} 
                        value={clinician._id}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            <LocalHospital />
                          </Avatar>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="subtitle1">
                              Dr. {clinician.firstName || ''} {clinician.lastName || ''}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {clinician.specialty || 'General Practice'}
                            </Typography>
                          </Box>
                          <Chip 
                            size="small"
                            label={`${clinician.workload?.activeCases || 0} cases`}
                            color={clinician.workload?.availabilityStatus === 'available' ? 'success' : 'warning'}
                          />
                        </Box>
                      </MenuItem>
                    ))}
                    {availableClinicians.length === 0 && (
                      <MenuItem disabled key="no-clinicians-available">
                        <Box sx={{ textAlign: 'center', width: '100%', py: 2 }}>
                          <Typography color="text.secondary">No clinicians available</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Please add clinicians to the system
                          </Typography>
                        </Box>
                      </MenuItem>
                    )}
                  </Select>
                  {!assignmentForm.clinician && caseDialog && (
                    <FormHelperText error>Please select a clinician</FormHelperText>
                  )}
                  <FormHelperText>
                    {availableClinicians.length} clinician{availableClinicians.length !== 1 ? 's' : ''} available
                  </FormHelperText>
                </FormControl>
                
                {/* Display available clinicians count */}
                <Typography 
                  variant="caption" 
                  color="text.secondary" 
                  sx={{ 
                    mt: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5
                  }}
                >
                  <People fontSize="small" />
                  {clinicians.length} clinician{clinicians.length !== 1 ? 's' : ''} available
                </Typography>
              </Box>

              {/* Expected Return Date */}
              <Box sx={{ mt: 3, mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarToday color="primary" />
                  Expected Return to Work
                </Typography>
                
                <TextField
                  fullWidth
                  label="Expected Return Date"
                  type="date"
                  value={caseForm.expectedReturnDate}
                  onChange={(e) => setCaseForm({ ...caseForm, expectedReturnDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  helperText="Estimated date when the worker is expected to return to work"
                />
              </Box>

              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={caseForm.notes}
                onChange={(e) => setCaseForm({ ...caseForm, notes: e.target.value })}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCaseDialog(false)}>Cancel</Button>
            <Button 
              variant="contained" 
              onClick={handleCreateCase}
              disabled={!assignmentForm.clinician}
              color={!assignmentForm.clinician ? "inherit" : "primary"}
            >
              Assign Clinician & Create Case
            </Button>
          </DialogActions>
        </Dialog>

        {/* Assign Clinician Dialog */}
        <Dialog open={assignmentDialog} onClose={() => setAssignmentDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>Assign Clinician to Case</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Select Case</InputLabel>
                <Select
                  value={assignmentForm.case}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, case: e.target.value })}
                >
                  {cases.filter(c => !c.clinician_id && (c.case_manager_id === user?.id || c.caseManager?._id === user?.id)).map((caseItem) => (
                    <MenuItem key={caseItem._id} value={caseItem._id}>
                      {caseItem.caseNumber || ''} - {caseItem.worker.firstName} {caseItem.worker.lastName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Select Clinician</InputLabel>
                <Select
                  value={assignmentForm.clinician}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, clinician: e.target.value })}
                >
                  {clinicians.map((clinician) => (
                    <MenuItem key={clinician._id} value={clinician._id}>
                      Dr. {clinician.firstName || ''} {clinician.lastName || ''} - {clinician.specialty || 'General'}
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
            <Button onClick={() => setAssignmentDialog(false)}>Cancel</Button>
            <Button 
              variant="contained" 
              onClick={() => handleAssignClinician()}
              disabled={!assignmentForm.case || !assignmentForm.clinician}
            >
              Assign Clinician
            </Button>
          </DialogActions>
        </Dialog>

        {/* Clinician Details Dialog */}
        <Dialog open={clinicianDialog} onClose={() => setClinicianDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            Clinician Details - {selectedClinician ? `Dr. ${selectedClinician.firstName} ${selectedClinician.lastName}` : ''}
          </DialogTitle>
          <DialogContent>
            {selectedClinician && (
              <Box sx={{ mt: 2 }}>
                {/* Clinician Info */}
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Clinician Information
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                      <Avatar sx={{ bgcolor: getAvailabilityScoreColor(selectedClinician.workload.availabilityScore), width: 60, height: 60 }}>
                        <LocalHospital sx={{ fontSize: 30 }} />
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6">
                          Dr. {selectedClinician.firstName} {selectedClinician.lastName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedClinician.specialty || 'General Medicine'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedClinician.email}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedClinician.phone}
                        </Typography>
                      </Box>
                      <Chip
                        label={selectedClinician.workload.availabilityStatus.toUpperCase()}
                        color={getAvailabilityColor(selectedClinician.workload.availabilityStatus) as any}
                        size="medium"
                      />
                    </Box>

                    {/* Availability Score */}
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="body1" fontWeight="bold">Availability Score</Typography>
                        <Typography variant="h6" fontWeight="bold" color={getAvailabilityScoreColor(selectedClinician.workload.availabilityScore)}>
                          {selectedClinician.workload.availabilityScore}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={selectedClinician.workload.availabilityScore}
                        sx={{
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: 'rgba(0,0,0,0.1)',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: getAvailabilityScoreColor(selectedClinician.workload.availabilityScore)
                          }
                        }}
                      />
                    </Box>

                    {/* Workload Summary */}
                    <Box sx={{ display: 'flex', gap: 3 }}>
                      <Box sx={{ textAlign: 'center', flex: 1 }}>
                        <Typography variant="h4" color="primary" fontWeight="bold">
                          {selectedClinician.workload.activeCases}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Active Cases
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center', flex: 1 }}>
                        <Typography variant="h4" color="secondary" fontWeight="bold">
                          {selectedClinician.workload.appointmentsToday}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Today's Appointments
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center', flex: 1 }}>
                        <Typography variant="h4" color="info.main" fontWeight="bold">
                          {selectedClinician.workload.appointmentsThisWeek}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          This Week
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>

                {/* Active Cases */}
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Active Cases
                    </Typography>
                    {cases.filter(c => c.clinician?._id === selectedClinician._id).length === 0 ? (
                      <Typography color="text.secondary" textAlign="center" py={2}>
                        No active cases assigned
                      </Typography>
                    ) : (
                      <List>
                        {cases.filter(c => c.clinician?._id === selectedClinician._id).map((caseItem) => (
                          <ListItem key={caseItem._id} divider>
                            <ListItemIcon>
                              <Assignment />
                            </ListItemIcon>
                            <ListItemText
                              primary={caseItem.caseNumber || ''}
                              secondary={
                                <Box>
                                  <Typography variant="caption" color="text.secondary">
                                    {caseItem.worker.firstName} {caseItem.worker.lastName}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    {caseItem.injuryDetails.bodyPart} - {caseItem.injuryDetails.injuryType}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Priority: {caseItem.priority} | Status: {caseItem.status}
                                  </Typography>
                                </Box>
                              }
                            />
                            <Chip
                              label={caseItem.priority.toUpperCase()}
                              color={caseItem.priority === 'urgent' ? 'error' : caseItem.priority === 'high' ? 'warning' : 'default'}
                              size="small"
                            />
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </CardContent>
                </Card>

                {/* Availability Management */}
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Availability Management
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <Typography variant="body2">
                        Current Status: {selectedClinician.isAvailable ? 'Available' : 'Unavailable'}
                      </Typography>
                      <Button
                        variant={selectedClinician.isAvailable ? 'outlined' : 'contained'}
                        color={selectedClinician.isAvailable ? 'error' : 'success'}
                        size="small"
                        onClick={() => {
                          handleUpdateClinicianAvailability(
                            selectedClinician._id, 
                            !selectedClinician.isAvailable,
                            selectedClinician.isAvailable ? 'Marked unavailable by case manager' : 'Marked available by case manager'
                          );
                        }}
                      >
                        {selectedClinician.isAvailable ? 'Mark Unavailable' : 'Mark Available'}
                      </Button>
                    </Box>
                    {selectedClinician.availabilityReason && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        Reason: {selectedClinician.availabilityReason}
                      </Typography>
                    )}
                    {selectedClinician.lastAvailabilityUpdate && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        Last Updated: {new Date(selectedClinician.lastAvailabilityUpdate).toLocaleString()}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setClinicianDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LayoutWithSidebar>
  );
};

export default CaseManagerDashboard;

